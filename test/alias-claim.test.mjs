// Capture-alias claiming — the convention's write side.
//
// WHAT THIS GUARDS. This repo is public, so tracked prose names a capture by
// alias and never by filename or session id. The registry that resolves those
// aliases is machine-local, and until 2026-08-07 claiming was a human
// read-modify-write ("take the next unused one"). That is sound for one writer
// and unsound the moment two run at once: on 2026-08-07 three agent lanes were
// live, two briefs handed out the SAME next-unused alias, and one lane
// registered it. An alias resolving to two captures is not stale — it is wrong
// in a way no reader can detect, which is the exact failure the convention
// exists to prevent, one level up.
//
// So the property under test is EXCLUSIVITY under concurrency, plus
// idempotence per capture (a retry must not burn an alias) and the identity
// rule (a session id and its capture filename are one capture, not two).

import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, writeFile, rm, stat, mkdir, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { captureKeyOf, nextAlias, claim, lookup } from "../tools/alias-claim.mjs";

const run = promisify(execFile);
const TOOL = join(dirname(fileURLToPath(import.meta.url)), "..", "tools", "alias-claim.mjs");

const withRegistry = async (fn) => {
  const dir = await tmpDir("alias-claim-");
  const reg = join(dir, "aliases.json");
  try {
    return await fn(reg, dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

// Same shape as withRegistry, extended with the two directories --protect
// needs: a captures root and its sibling protected dir, both inside the same
// scratch root so a real hard link is possible (one cannot cross filesystems,
// which is exactly the failure class --protect must be loud about instead of
// papering over with a copy).
const writeCapture = (dir, name, bytes) => writeFile(join(dir, name), "x".repeat(bytes));

const withCaptures = async (fn) => {
  const dir = await tmpDir("alias-protect-");
  const capturesDir = join(dir, "captures");
  const protectedDir = join(dir, "captures-protected");
  const reg = join(dir, "aliases.json");
  await mkdir(capturesDir, { recursive: true });
  const env = {
    ...process.env,
    CACHE_FIX_CAPTURE_DIR: capturesDir,
    CACHE_FIX_PROTECTED_DIR: protectedDir,
    CACHE_FIX_ALIAS_REGISTRY: reg,
  };
  try {
    return await fn({ dir, capturesDir, protectedDir, reg, env });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

// THIS TEST USED TO RATIFY THE DEFECT. Its first line asserted that an empty
// registry yields `s-captureA` — which is true of the KEYS and false of the
// world: A..AA were assigned before the registry existed, are cited ~185 times
// in tracked prose, and their sessions are gone. The allocator re-issued
// `s-captureA` on its first live run, and every one of those citations began
// resolving to a capture it is not about. A test written from the
// implementation's own model pins the bug it should catch; this one is now
// written from the definition — a retired name is not a free name.
test("nextAlias skips BURNED aliases, not merely taken ones", () => {
  const burned = new Set(["s-captureA", "s-captureB"]);
  assert.equal(nextAlias(new Set(), burned), "s-captureC");
  assert.equal(nextAlias(new Set(), new Set()), "s-captureA", "with nothing burned, A is free");
  const throughZ = new Set([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((c) => `s-capture${c}`));
  assert.equal(nextAlias(throughZ), "s-captureAA");
  throughZ.add("s-captureAA");
  throughZ.add("s-captureAB");
  assert.equal(nextAlias(throughZ), "s-captureAC");
  // A hole is filled rather than skipped — the convention is "next unused",
  // not "highest plus one", and a retired entry's letter is reusable.
  const holed = new Set(["s-captureA", "s-captureC"]);
  assert.equal(nextAlias(holed), "s-captureB");
});

// The live registry's own burned list is the one that matters, so it is read
// here rather than assumed: a burned list that stopped being loaded would let
// the same 185 citations rot again, silently.
test("BITE — the shipped registry burns A..AA, and a claim against it skips them", async () => {
  await withRegistry(async (reg) => {
    await writeFile(
      reg,
      JSON.stringify({ _burned: { aliases: ["s-captureA", "s-captureB", "s-captureC"] }, aliases: {} }, null, 2),
      { mode: 0o600 },
    );
    process.env.CACHE_FIX_ALIAS_REGISTRY = reg;
    const { alias } = await claim("s-zzzzburn-wxyz-wxyz-wxyz-synthetictest-requests.jsonl");
    assert.equal(alias, "s-captureD", "a burned alias is never re-issued");
    delete process.env.CACHE_FIX_ALIAS_REGISTRY;
  });
});

// A FLAG IS NOT A CAPTURE. `--help` claimed a real alias for a capture named
// "--help" on this tool's first day, and there is no unclaim path.
test("BITE — a flag is refused, never claimed", async () => {
  await withRegistry(async (reg) => {
    process.env.CACHE_FIX_ALIAS_REGISTRY = reg;
    await assert.rejects(() => claim("--help"), /not a capture/);
    await assert.rejects(() => claim("--note"), /not a capture/);
    const doc = JSON.parse(await readFile(reg, "utf-8").catch(() => "{}"));
    assert.equal(Object.keys(doc.aliases ?? {}).length, 0, "a refused claim writes nothing");
    delete process.env.CACHE_FIX_ALIAS_REGISTRY;
  });
});

// Synthetic ids here are deliberately NON-HEX: the repo's hygiene class matches
// a real capture id's shape, and it is right to, so a test fixture that borrows
// that shape trips a guard that is working correctly. The trigger goes, the
// predicate stays — the box's rule about guards firing on legitimate work.
test("a session id and its capture filename are ONE capture", () => {
  const fromFile = captureKeyOf("s-zzzzuuid-wxyz-wxyz-wxyz-synthetictest-requests.jsonl");
  const fromSid = captureKeyOf("zzzzuuid-wxyz-wxyz-wxyz-synthetictest");
  const fromPath = captureKeyOf("/home/x/.claude/cache-fix-captures/s-zzzzuuid-wxyz-wxyz-wxyz-synthetictest-requests.jsonl");
  assert.equal(fromFile, fromSid);
  assert.equal(fromFile, fromPath);
});

// THE BITE THIS TOOL EXISTS FOR. Eight claims for eight distinct captures, all
// in flight at once. Under the read-modify-write this replaces, several read
// the same registry state and compute the same "next unused" alias; the
// property that must hold is that every claim gets a DISTINCT one.
//
// Red arrangement, run by hand and recorded rather than left as a claim
// (2026-08-07): with the `withLock` body replaced by a bare `fn()` call — the
// one named condition removed — this bite reports 3 distinct aliases for 8
// claims. With the lock, 8 of 8, repeatedly.
test("BITE — eight concurrent claims yield eight distinct aliases", async () => {
  await withRegistry(async (reg) => {
    const captures = Array.from({ length: 8 }, (_, i) => `s-zzzzpar${i}-wxyz-wxyz-wxyz-synthetictest-requests.jsonl`);
    const results = await Promise.all(
      captures.map((c) => run("node", [TOOL, c], { env: { ...process.env, CACHE_FIX_ALIAS_REGISTRY: reg } })),
    );
    const aliases = results.map((r) => r.stdout.trim());
    assert.equal(new Set(aliases).size, 8, `expected 8 distinct aliases, got ${JSON.stringify(aliases)}`);
    const doc = JSON.parse(await readFile(reg, "utf-8"));
    assert.equal(Object.keys(doc.aliases).length, 8, "every claim is recorded, not just the last writer's");
    // Each alias resolves back to the capture that claimed it — a distinct
    // NAME over a collided entry would still pass the count check above.
    for (const c of captures) assert.ok(lookup(doc, captureKeyOf(c)), `${c} resolves`);
  });
});

test("BITE — a re-claim for the same capture returns the same alias and burns none", async () => {
  await withRegistry(async (reg) => {
    process.env.CACHE_FIX_ALIAS_REGISTRY = reg;
    const cap = "s-zzzzsame-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    const first = await claim(cap, "first");
    const again = await claim(cap, "second");
    const bySid = await claim("zzzzsame-wxyz-wxyz-wxyz-synthetictest");
    assert.equal(first.claimed, true);
    assert.equal(again.claimed, false, "a retry is not a new claim");
    assert.equal(again.alias, first.alias);
    assert.equal(bySid.alias, first.alias, "the sid form must not claim a second alias");
    const doc = JSON.parse(await readFile(reg, "utf-8"));
    assert.equal(Object.keys(doc.aliases).length, 1);
    delete process.env.CACHE_FIX_ALIAS_REGISTRY;
  });
});

test("BITE — an existing registry's entries and its non-alias keys survive a claim", async () => {
  await withRegistry(async (reg) => {
    // The live registry carries `_assigning` / `_where` / `_why` notes beside
    // `aliases`. A claim that rewrote the document without them would silently
    // delete the instructions that make the file usable.
    await writeFile(
      reg,
      JSON.stringify({ _why: "keep me", aliases: { "s-captureA": { file: "s-old-requests.jsonl" } } }, null, 2),
      { mode: 0o600 },
    );
    process.env.CACHE_FIX_ALIAS_REGISTRY = reg;
    const { alias } = await claim("s-zzzznew0-wxyz-wxyz-wxyz-synthetictest-requests.jsonl");
    assert.equal(alias, "s-captureB", "the taken alias is not reissued");
    const doc = JSON.parse(await readFile(reg, "utf-8"));
    assert.equal(doc._why, "keep me");
    assert.equal(doc.aliases["s-captureA"].file, "s-old-requests.jsonl");
    assert.equal((await stat(reg)).mode & 0o777, 0o600, "the registry stays 0600 — it holds the bytes git must not");
    delete process.env.CACHE_FIX_ALIAS_REGISTRY;
  });
});

test("BITE — --show has THREE answers: an alias, UNCLAIMED, or an error", async () => {
  await withRegistry(async (reg) => {
    const env = { ...process.env, CACHE_FIX_ALIAS_REGISTRY: reg };
    const cap = "s-zzzzshow-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    // Unclaimed is its own answer and exits non-zero, so a caller cannot read
    // an empty string as a name — absence of evidence must not wear a
    // verdict's clothes.
    await assert.rejects(
      () => run("node", [TOOL, "--show", cap], { env }),
      (e) => e.code === 1 && /UNCLAIMED/.test(e.stdout),
    );
    const claimed = (await run("node", [TOOL, cap], { env })).stdout.trim();
    const shown = (await run("node", [TOOL, "--show", cap], { env })).stdout.trim();
    assert.equal(shown, claimed);
  });
});

// --protect — a claim alone does not survive retention (proxy/extensions/
// request-capture.mjs's sweepCaptureDir is oldest-mtime-first and knows
// nothing about the alias registry). BACKLOG.md, "a claimed alias does not
// protect its capture from eviction": hard-link the capture into a sibling
// captures-protected dir on claim, so unlink() on the original merely
// decrements the link count and the bytes survive the rotation that deletes
// the name.
//
// THE DISCRIMINATING PAIR — the done-criterion itself: a protected capture
// and an unprotected one put through the SAME retention sweep must diverge.
// An arrangement where both survive, or both die, proves nothing about the
// mechanism (dev-loop.md, "Grading a dispatched lane", move 4).
test("BITE — --protect survives a retention sweep that deletes an unprotected claim (the discriminating pair)", async () => {
  await withCaptures(async ({ capturesDir, protectedDir, env }) => {
    const capProtected = "s-zzzzprotA-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    const capPlain = "s-zzzzprotB-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    await writeCapture(capturesDir, capProtected, 200 * 1024);
    await writeCapture(capturesDir, capPlain, 200 * 1024);

    const protectOut = (await run("node", [TOOL, join(capturesDir, capProtected), "--protect"], { env })).stdout.trim();
    assert.match(protectOut, /\(protected\)/);
    const plainOut = (await run("node", [TOOL, join(capturesDir, capPlain)], { env })).stdout.trim();
    assert.doesNotMatch(plainOut, /protected/);

    const { sweepCaptureDir } = await import("../proxy/extensions/request-capture.mjs");
    const deleted = await sweepCaptureDir(capturesDir, 100); // cap far below both files' size
    assert.equal(deleted, 2, "retention deletes both NAMES from the captures dir");

    assert.deepEqual(await readdir(capturesDir), [], "both names are gone from the captures dir");
    assert.deepEqual(
      await readdir(protectedDir),
      [capProtected],
      "only the protected capture's bytes survive, via the hard link",
    );
    const survivingBytes = await readFile(join(protectedDir, capProtected));
    assert.equal(survivingBytes.length, 200 * 1024, "the surviving copy is fully readable, not truncated");
  });
});

test("BITE — re-protecting an already-linked capture is idempotent: same inode, no error, nothing new printed", async () => {
  await withCaptures(async ({ capturesDir, protectedDir, env }) => {
    const cap = "s-zzzzidemp-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    await writeCapture(capturesDir, cap, 10 * 1024);
    const first = (await run("node", [TOOL, join(capturesDir, cap), "--protect"], { env })).stdout.trim();
    assert.match(first, /\(protected\)/);
    const again = (await run("node", [TOOL, join(capturesDir, cap), "--protect"], { env })).stdout.trim();
    assert.match(again, /\(already protected\)/);
    assert.deepEqual(await readdir(protectedDir), [cap], "still exactly one link, not a duplicate");
  });
});

test("BITE — protect refuses to overwrite a DIFFERENT file already at the protected destination", async () => {
  await withCaptures(async ({ capturesDir, protectedDir, reg, env }) => {
    const cap = "s-zzzzdiffr-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    await writeCapture(capturesDir, cap, 10 * 1024);
    // Claim first, then plant an UNRELATED file at the exact path --protect
    // would link to — never a link to the real capture.
    await run("node", [TOOL, join(capturesDir, cap)], { env });
    await mkdir(protectedDir, { recursive: true });
    await writeFile(join(protectedDir, cap), "unrelated bytes, not a link to the real capture");
    await assert.rejects(
      () => run("node", [TOOL, join(capturesDir, cap), "--protect"], { env }),
      (e) => e.code === 1 && /DIFFERENT file/.test(e.stderr) && !e.stderr.includes("ENOENT"),
    );
    const doc = JSON.parse(await readFile(reg, "utf-8"));
    const alias = Object.keys(doc.aliases)[0];
    assert.equal(doc.aliases[alias].protectedAt, undefined, "a refused overwrite never claims protectedAt");
    const planted = await readFile(join(protectedDir, cap), "utf-8");
    assert.equal(planted, "unrelated bytes, not a link to the real capture", "the planted file was not overwritten");
  });
});

// EXDEV and any other link() failure is LOUD, never silently degraded — no
// copy fallback, ever (captures here run to ~2GB). ENOENT stands in for
// "any other" failure: the arrangement removes the capture's bytes after
// claiming it, so the link source is gone by the time --protect runs.
test("BITE — a link failure is loud: non-zero exit, both paths named, and the registry records the claim WITHOUT protectedAt", async () => {
  await withCaptures(async ({ capturesDir, protectedDir, reg, env }) => {
    const cap = "s-zzzzenoent-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    await writeCapture(capturesDir, cap, 1024);
    await run("node", [TOOL, join(capturesDir, cap)], { env }); // claim while the bytes still exist
    await rm(join(capturesDir, cap));
    await assert.rejects(
      () => run("node", [TOOL, join(capturesDir, cap), "--protect"], { env }),
      (e) =>
        e.code === 1 &&
        /link failed \(ENOENT\)/.test(e.stderr) &&
        e.stderr.includes(capturesDir) &&
        e.stderr.includes(protectedDir),
    );
    const doc = JSON.parse(await readFile(reg, "utf-8"));
    const alias = Object.keys(doc.aliases)[0];
    assert.equal(doc.aliases[alias].protectedAt, undefined, "the claim survives; the failed protection leaves no protectedAt");
  });
});

// Cap eviction, both directions — the positive and its negative control, so
// the mechanism is demonstrated rather than merely exercised (dev-loop.md,
// "a mutation arm that returns the baseline answer indicts the arm first").
test("BITE — the protected-set cap evicts the OLDEST protection first, with a stderr WARNING and protectionDroppedAt recorded", async () => {
  await withCaptures(async ({ capturesDir, protectedDir, reg, env: baseEnv }) => {
    const cap1 = "s-zzzzcapA1-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    const cap2 = "s-zzzzcapA2-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    await writeCapture(capturesDir, cap1, 700 * 1024);
    await writeCapture(capturesDir, cap2, 700 * 1024);
    // 1 MB cap: one 700KB link fits, two (1.4MB) do not.
    const env = { ...baseEnv, CACHE_FIX_PROTECTED_MAX_MB: "1" };

    await run("node", [TOOL, join(capturesDir, cap1), "--protect"], { env });
    await new Promise((r) => setTimeout(r, 1100)); // distinct protectedAt ordering
    const { stderr } = await run("node", [TOOL, join(capturesDir, cap2), "--protect"], { env });
    assert.match(stderr, /WARNING/);
    assert.match(stderr, /cap exceeded/i);
    assert.ok(stderr.includes(cap1), "the WARNING names the dropped file");

    assert.deepEqual(await readdir(protectedDir), [cap2], "the OLDEST protection was dropped, the newest survives");

    const doc = JSON.parse(await readFile(reg, "utf-8"));
    const aliasFor = (file) => Object.entries(doc.aliases).find(([, v]) => v.file === file)[0];
    assert.ok(doc.aliases[aliasFor(cap1)].protectionDroppedAt, "the dropped entry is marked");
    assert.equal(doc.aliases[aliasFor(cap2)].protectionDroppedAt, undefined, "the survivor carries no drop marker");
  });
});

test("negative control — with the cap comfortably high, nothing is dropped and no warning prints", async () => {
  await withCaptures(async ({ capturesDir, protectedDir, env: baseEnv }) => {
    const cap1 = "s-zzzznocp1-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    const cap2 = "s-zzzznocp2-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    await writeCapture(capturesDir, cap1, 700 * 1024);
    await writeCapture(capturesDir, cap2, 700 * 1024);
    const env = { ...baseEnv, CACHE_FIX_PROTECTED_MAX_MB: "4096" };
    await run("node", [TOOL, join(capturesDir, cap1), "--protect"], { env });
    const { stderr } = await run("node", [TOOL, join(capturesDir, cap2), "--protect"], { env });
    assert.equal(stderr, "", "no warning when comfortably under the cap");
    assert.deepEqual((await readdir(protectedDir)).sort(), [cap1, cap2].sort(), "both survive");
  });
});

test("BITE — --release removes the protected link, and a following retention sweep takes the bytes", async () => {
  await withCaptures(async ({ capturesDir, protectedDir, env }) => {
    const cap = "s-zzzzrelsw-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    await writeCapture(capturesDir, cap, 10 * 1024);
    await run("node", [TOOL, join(capturesDir, cap), "--protect"], { env });
    assert.deepEqual(await readdir(protectedDir), [cap]);

    const releaseOut = (await run("node", [TOOL, "--release", join(capturesDir, cap)], { env })).stdout.trim();
    assert.match(releaseOut, /^released /);
    assert.deepEqual(await readdir(protectedDir), [], "the link is gone immediately");

    const { sweepCaptureDir } = await import("../proxy/extensions/request-capture.mjs");
    const deleted = await sweepCaptureDir(capturesDir, 1);
    assert.equal(deleted, 1, "with the protection released, the next sweep takes the bytes");
    assert.deepEqual(await readdir(capturesDir), []);
  });
});

test("BITE — --release on something never protected answers NOT PROTECTED and exits non-zero, not an error", async () => {
  await withCaptures(async ({ capturesDir, env }) => {
    const cap = "s-zzzznvrprt-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    await writeCapture(capturesDir, cap, 1024);
    await run("node", [TOOL, join(capturesDir, cap)], { env }); // claim only, no --protect
    await assert.rejects(
      () => run("node", [TOOL, "--release", join(capturesDir, cap)], { env }),
      (e) => e.code === 1 && /NOT PROTECTED/.test(e.stdout),
    );
  });
});

test("BITE — --protect-status reports dir/count/bytes/capBytes/entries for the protected set", async () => {
  await withCaptures(async ({ capturesDir, protectedDir, env }) => {
    const cap = "s-zzzzstatus-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    await writeCapture(capturesDir, cap, 50 * 1024);
    await run("node", [TOOL, join(capturesDir, cap), "--protect"], { env });
    const out = (await run("node", [TOOL, "--protect-status"], { env })).stdout.trim();
    const status = JSON.parse(out);
    assert.equal(status.dir, protectedDir);
    assert.equal(status.count, 1);
    assert.equal(status.bytes, 50 * 1024);
    assert.equal(status.entries.length, 1);
    assert.equal(status.entries[0].file, cap);
    assert.ok(status.entries[0].alias);
    assert.ok(status.entries[0].protectedAt);
    assert.ok(status.capBytes > 0);
  });
});

// The design's own load-bearing claim: the protected dir is a SIBLING of the
// resolved captures root, not built from dataHome() independently — so a
// test pointing only CACHE_FIX_CAPTURE_DIR at a scratch root gets the
// protected dir inside that same scratch root for free.
test("the protected dir defaults to a SIBLING of the resolved captures root when CACHE_FIX_PROTECTED_DIR is unset", async () => {
  const dir = await tmpDir("alias-protect-default-");
  try {
    const capturesDir = join(dir, "captures");
    await mkdir(capturesDir, { recursive: true });
    const reg = join(dir, "aliases.json");
    const cap = "s-zzzzdeflt-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    await writeCapture(capturesDir, cap, 1024);
    const env = { ...process.env, CACHE_FIX_CAPTURE_DIR: capturesDir, CACHE_FIX_ALIAS_REGISTRY: reg };
    delete env.CACHE_FIX_PROTECTED_DIR;
    await run("node", [TOOL, join(capturesDir, cap), "--protect"], { env });
    const expectedProtectedDir = join(dir, "captures-protected");
    assert.deepEqual(
      await readdir(expectedProtectedDir),
      [cap],
      "default protected dir is a sibling of the captures dir, inside the same scratch root",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
