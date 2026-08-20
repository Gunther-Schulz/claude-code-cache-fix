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
import { execFile, execFileSync } from "node:child_process";
import { readFile, writeFile, rm, stat, mkdir, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { captureKeyOf, nextAlias, claim, lookup } from "../tools/alias-claim.mjs";
// Namespace import for the not-yet-existing `--releasable` export, kept
// SEPARATE from the named import above on purpose (dev-loop.md, "Adding a
// check" — a static named import of a missing export fails the whole module
// at ESM link time and every bite goes red at once, proving nothing about
// which half broke). This form always links; a missing export reads as
// `undefined` and each new bite fails at its own call site instead.
import * as aliasClaim from "../tools/alias-claim.mjs";

const run = promisify(execFile);
const TOOL = join(dirname(fileURLToPath(import.meta.url)), "..", "tools", "alias-claim.mjs");
const REPO_ROOT = dirname(dirname(TOOL));

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

test("the protected dir is created 0700, not at the ambient umask", async () => {
  await withCaptures(async ({ capturesDir, protectedDir, env }) => {
    const cap = "s-zzzzmode00-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    await writeCapture(capturesDir, cap, 1024);
    await run("node", [TOOL, join(capturesDir, cap), "--protect"], { env });
    assert.equal((await stat(protectedDir)).mode & 0o777, 0o700, "the protected dir holds the same class of bytes as the registry");
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

// Cap behaviour, both directions — the positive and its negative control, so
// the mechanism is demonstrated rather than merely exercised (dev-loop.md,
// "a mutation arm that returns the baseline answer indicts the arm first").
//
// THIS TEST WAS INVERTED ON 2026-08-20, and the inversion is the point rather
// than a maintenance chore. It used to assert that the cap EVICTS the oldest
// protection, naming the dropped file in a stderr WARNING on a zero exit. That
// is the behaviour that destroyed s-captureBM: its live copy had already been
// swept, so the protected link was the last one and "dropping the protection"
// unlinked the bytes. The old assertions were true of the code and true of a
// deleting bug at the same time — this fixture's two captures both kept their
// live copies, so eviction here really was a downgrade, and the fixture could
// never have distinguished the two cases. Rewritten to pin the new contract:
// the cap refuses to ADD, and removes nothing, so the delete is unreachable
// rather than merely unlikely.
test("BITE — over cap, the protected-set cap REFUSES the new protection and drops nothing", async () => {
  await withCaptures(async ({ capturesDir, protectedDir, reg, env: baseEnv }) => {
    const cap1 = "s-zzzzcapA1-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    const cap2 = "s-zzzzcapA2-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    await writeCapture(capturesDir, cap1, 700 * 1024);
    await writeCapture(capturesDir, cap2, 700 * 1024);
    // 1 MB cap: one 700KB link fits, two (1.4MB) do not.
    const env = { ...baseEnv, CACHE_FIX_PROTECTED_MAX_MB: "1" };

    await run("node", [TOOL, join(capturesDir, cap1), "--protect"], { env });
    await assert.rejects(
      () => run("node", [TOOL, join(capturesDir, cap2), "--protect"], { env }),
      (e) =>
        e.code === 1 &&
        /refusing/.test(e.stderr) &&
        e.stderr.includes(cap2) &&
        // The refusal must name the way out. A gate that only says no trains
        // the override reflex that kills it.
        /--release|CACHE_FIX_PROTECTED_MAX_MB/.test(e.stderr),
      "non-zero, naming the capture it would not add and what to do about it",
    );

    assert.deepEqual(await readdir(protectedDir), [cap1], "the EARLIER protection is untouched, the new one was never linked");

    const doc = JSON.parse(await readFile(reg, "utf-8"));
    const aliasFor = (file) => Object.entries(doc.aliases).find(([, v]) => v.file === file)[0];
    assert.equal(doc.aliases[aliasFor(cap1)].protectionDroppedAt, undefined, "nothing was dropped, so nothing is marked dropped");
    assert.equal(doc.aliases[aliasFor(cap2)].protectedAt, undefined, "a refused protection never claims protectedAt");
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

// --releasable — the reader half of BACKLOG.md, "`alias-claim --protect`
// cannot be made the default until `--release` is wired". `--release`
// exists and works; nothing tells the tool a protection is no longer
// needed. This lane REPORTS ONLY (never releases) whether every citation of
// a currently-protected alias sits under the closure home ("## Done").
//
// THE DISCRIMINATING PAIR — the done-criterion itself: an alias cited only
// under "## Done" must report RELEASABLE, and the SAME alias with one
// additional citation in a live section must report HELD. A predicate that
// cannot separate those two separates nothing.
test("BITE — releasableReport: RELEASABLE only when EVERY citation sits under the Done section (discriminating pair)", () => {
  const doc = {
    aliases: {
      "s-captureZZ": {
        file: "s-zzzzrelsa-wxyz-wxyz-wxyz-synthetictest-requests.jsonl",
        protectedAt: "2026-08-13T00:00:00.000Z",
      },
    },
  };
  const doneOnly =
    "## Open\n" +
    "- an unrelated entry, no mention of the alias here\n" +
    "## Done — closures, one home\n" +
    "- closed entry citing s-captureZZ\n";
  const doneWithLiveCitation =
    "## Open\n" +
    "- a still-open entry citing s-captureZZ\n" +
    "## Done — closures, one home\n" +
    "- closed entry also citing s-captureZZ\n";

  const releasedOnce = aliasClaim.releasableReport(doneOnly, doc);
  assert.deepEqual(releasedOnce.RELEASABLE, ["s-captureZZ"]);
  assert.deepEqual(releasedOnce.HELD, []);

  const stillHeld = aliasClaim.releasableReport(doneWithLiveCitation, doc);
  assert.deepEqual(stillHeld.HELD, ["s-captureZZ"]);
  assert.deepEqual(stillHeld.RELEASABLE, []);
});

// THE THIRD ANSWER. An alias cited nowhere is not evidence the protection is
// spent — it is absence of evidence, and the two must not be collapsed
// (grounding module, "the three-answers discipline"). UNCITED is its own
// bucket, and it must never fall into RELEASABLE.
test("BITE — releasableReport: a protected alias cited nowhere is UNCITED, never RELEASABLE", () => {
  const doc = {
    aliases: {
      "s-captureYY": {
        file: "s-zzzzuncit-wxyz-wxyz-wxyz-synthetictest-requests.jsonl",
        protectedAt: "2026-08-13T00:00:00.000Z",
      },
    },
  };
  const text = "## Open\n- nothing about it here\n## Done — closures\n- nor here\n";
  const report = aliasClaim.releasableReport(text, doc);
  assert.deepEqual(report.UNCITED, ["s-captureYY"]);
  assert.deepEqual(report.RELEASABLE, []);
  assert.deepEqual(report.HELD, []);
});

// A citation is ANCHORED, not a rendered-text substring test — matching the
// grounding module's paraphrase-drift rule directly: `s-captureA` is a
// literal PREFIX of `s-captureAB`, so an unanchored `.includes()` would
// silently count a citation of a DIFFERENT alias as evidence for this one.
test("BITE — releasableReport: a citation is ANCHORED — s-captureA does not match inside s-captureAB", () => {
  const doc = {
    aliases: {
      "s-captureA": {
        file: "s-zzzzanchr-wxyz-wxyz-wxyz-synthetictest-requests.jsonl",
        protectedAt: "2026-08-13T00:00:00.000Z",
      },
    },
  };
  const text = "## Open\n- only s-captureAB is mentioned here\n## Done\n";
  const report = aliasClaim.releasableReport(text, doc);
  assert.deepEqual(report.UNCITED, ["s-captureA"], "a prefix match would have wrongly bucketed this as cited");
});

// Only the CURRENTLY protected set is graded — a claimed-but-never-protected
// alias, and one whose protection was already released or cap-dropped, are
// both out of scope for this lane (the operator's `--release` is the one
// act that changes that, never this report).
test("BITE — releasableReport: only currently-protected aliases are graded", () => {
  const doc = {
    aliases: {
      "s-captureQQ": { file: "s-zzzzq1-requests.jsonl" }, // claimed, never protected
      "s-captureQR": {
        file: "s-zzzzq2-requests.jsonl",
        protectedAt: "2026-08-01T00:00:00.000Z",
        releasedAt: "2026-08-12T00:00:00.000Z",
      }, // released
      "s-captureQS": {
        file: "s-zzzzq3-requests.jsonl",
        protectedAt: "2026-08-01T00:00:00.000Z",
        protectionDroppedAt: "2026-08-12T00:00:00.000Z",
      }, // cap-evicted
    },
  };
  const text = "## Open\n- s-captureQQ s-captureQR s-captureQS all cited\n## Done\n";
  const report = aliasClaim.releasableReport(text, doc);
  assert.deepEqual(report.RELEASABLE, []);
  assert.deepEqual(report.HELD, []);
  assert.deepEqual(report.UNCITED, []);
  assert.deepEqual(report["COULD-NOT-VERIFY"], []);
});

// An unreadable backlog is COULD-NOT-VERIFY for every protected alias — not
// a guess, and not silently empty (dev-loop.md, "a tool's could-not-verify
// REASON is a claim, and it is computed or it is a guess").
test("BITE — releasableReport: an unreadable backlog reports COULD-NOT-VERIFY for every protected alias", () => {
  const doc = {
    aliases: {
      "s-captureXX": {
        file: "s-zzzzunread-wxyz-wxyz-wxyz-synthetictest-requests.jsonl",
        protectedAt: "2026-08-13T00:00:00.000Z",
      },
    },
  };
  const report = aliasClaim.releasableReport(null, doc);
  assert.deepEqual(report["COULD-NOT-VERIFY"], ["s-captureXX"]);
  assert.deepEqual(report.RELEASABLE, []);
  assert.deepEqual(report.HELD, []);
  assert.deepEqual(report.UNCITED, []);
});

test("BITE — --releasable CLI: exit 0 always, all four buckets printed with zeros stated explicitly", async () => {
  await withRegistry(async (reg) => {
    const dir = dirname(reg);
    const backlogPath = join(dir, "fake-backlog.md");
    await writeFile(backlogPath, "## Open\n- nothing here\n## Done — closures\n- nothing here either\n");
    const env = { ...process.env, CACHE_FIX_ALIAS_REGISTRY: reg };
    const { stdout } = await run("node", [TOOL, "--releasable", backlogPath], { env });
    assert.match(stdout, /RELEASABLE \(0\)/);
    assert.match(stdout, /HELD \(0\)/);
    assert.match(stdout, /UNCITED \(0\)/);
    assert.match(stdout, /COULD-NOT-VERIFY \(0\)/);
  });
});

test("BITE — --releasable CLI: an actually-protected alias reports RELEASABLE when only Done cites it", async () => {
  await withCaptures(async ({ capturesDir, dir, env }) => {
    const cap = "s-zzzzclirel-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    await writeCapture(capturesDir, cap, 1024);
    const claimOut = (await run("node", [TOOL, join(capturesDir, cap), "--protect"], { env })).stdout.trim();
    assert.match(claimOut, /\(protected\)/);
    const alias = claimOut.split(/\s/)[0];
    const backlogPath = join(dir, "fake-backlog.md");
    await writeFile(backlogPath, `## Open\n- unrelated\n## Done — closures\n- closed entry citing ${alias}\n`);
    const { stdout } = await run("node", [TOOL, "--releasable", backlogPath], { env });
    assert.match(stdout, new RegExp(`RELEASABLE \\(1\\): ${alias}`));
    assert.match(stdout, /HELD \(0\)/);
  });
});

// --releasable under a `Closure-home:` declaration (tools/closure-home.mjs).
// Default behaviour is pinned above with no declaration present; these cover
// the `kind: "file"` branch — the closed entries live in a SEPARATE carrier,
// so a citation confirmed only by that file needs its content passed in.

test("BITE — releasableReport: kind:\"file\" home — a citation living ONLY in the closure-home file is RELEASABLE", () => {
  const doc = {
    aliases: {
      "s-captureFH": {
        file: "s-zzzzfilehm-wxyz-wxyz-wxyz-synthetictest-requests.jsonl",
        protectedAt: "2026-08-19T00:00:00.000Z",
      },
    },
  };
  const backlogText = "Closure-home: BACKLOG-DONE.md\n## Open\n- unrelated entry, no mention here\n";
  const closureHomeText = "- closed entry citing s-captureFH\n";
  const report = aliasClaim.releasableReport(backlogText, doc, { closureHomeText });
  assert.deepEqual(report.RELEASABLE, ["s-captureFH"]);
  assert.deepEqual(report.HELD, []);
  assert.deepEqual(report.UNCITED, []);
});

// NOT a citation under an ordinary `## Open`-named section — an earlier
// version of this test used one, and it does not DISCRIMINATE: a live-
// section citation is HELD under the OLD (pre-declaration) implementation
// too, for a reason unrelated to `kind: "file"` (it simply isn't under a
// literal `## Done`). Measured red-first (2026-08-19, per-file mutate-and-
// revert against 91a1197): the old test PASSED against the old
// `releasableReport(backlogText, doc)`, proving nothing about this lane's
// own change. This version cites the alias under a RESIDUAL `## Done`-named
// section instead — the old code's literal match reads that as the closure
// home and would report RELEASABLE; the new code, once `kind: "file"` is
// declared, treats no in-text section as the closure home and reports HELD.
// That is the actual discriminating claim the docstring above promises.
test("BITE — releasableReport: kind:\"file\" home — a citation under a residual `## Done` section is HELD even though the closure file also cites it", () => {
  const doc = {
    aliases: {
      "s-captureFI": {
        file: "s-zzzzfilehm2-wxyz-wxyz-wxyz-synthetictest-requests.jsonl",
        protectedAt: "2026-08-19T00:00:00.000Z",
      },
    },
  };
  const backlogText =
    "Closure-home: BACKLOG-DONE.md\n## Open\n- unrelated\n" +
    "## Done — stale, pre-migration\n- closed entry citing s-captureFI\n";
  const closureHomeText = "- closed entry also citing s-captureFI\n";
  const report = aliasClaim.releasableReport(backlogText, doc, { closureHomeText });
  assert.deepEqual(report.HELD, ["s-captureFI"]);
  assert.deepEqual(report.RELEASABLE, []);
});

// A residual `## Done`-named section left in the carrier after the split does
// NOT count as the closure home once `kind: "file"` is declared — the section
// is now just another LIVE section, so a citation sitting only there is HELD,
// not RELEASABLE. This is the same discrimination `splitSections`
// (backlog-lint.mjs) makes for `closuresInLiveEntries`.
test("BITE — releasableReport: kind:\"file\" home — a residual `## Done` section in the carrier is LIVE, not the closure home", () => {
  const doc = {
    aliases: {
      "s-captureFJ": {
        file: "s-zzzzfilehm3-wxyz-wxyz-wxyz-synthetictest-requests.jsonl",
        protectedAt: "2026-08-19T00:00:00.000Z",
      },
    },
  };
  const backlogText =
    "Closure-home: BACKLOG-DONE.md\n## Open\n- unrelated\n## Done — stale, pre-migration\n" +
    "- closed entry citing s-captureFJ\n";
  const report = aliasClaim.releasableReport(backlogText, doc, { closureHomeText: "" });
  assert.deepEqual(report.HELD, ["s-captureFJ"], "the ## Done section no longer excuses a live-text citation");
});

test("BITE — releasableReport: kind:\"file\" home — a closure-home file that FAILED to read is COULD-NOT-VERIFY, never a silent UNCITED", () => {
  const doc = {
    aliases: {
      "s-captureFK": {
        file: "s-zzzzfilehm4-wxyz-wxyz-wxyz-synthetictest-requests.jsonl",
        protectedAt: "2026-08-19T00:00:00.000Z",
      },
    },
  };
  const backlogText = "Closure-home: BACKLOG-DONE.md\n## Open\n- unrelated entry\n";
  const report = aliasClaim.releasableReport(backlogText, doc, { closureHomeText: null });
  assert.deepEqual(report["COULD-NOT-VERIFY"], ["s-captureFK"]);
  assert.deepEqual(report.RELEASABLE, []);
  assert.deepEqual(report.HELD, []);
  assert.deepEqual(report.UNCITED, []);
});

test("BITE — releasableReport: a `## `-prefixed Closure-home declaration renames the in-file section — a citation under the new name is RELEASABLE, under the old default name it is HELD", () => {
  const doc = {
    aliases: {
      "s-captureFL": {
        file: "s-zzzzfilehm5-wxyz-wxyz-wxyz-synthetictest-requests.jsonl",
        protectedAt: "2026-08-19T00:00:00.000Z",
      },
    },
  };
  const renamed =
    "Closure-home: ## Archive\n## Open\n- unrelated\n## Archive — closures\n- closed entry citing s-captureFL\n";
  const stillNamedDone =
    "Closure-home: ## Archive\n## Open\n- unrelated\n## Done — closures\n- closed entry citing s-captureFL\n";
  assert.deepEqual(aliasClaim.releasableReport(renamed, doc).RELEASABLE, ["s-captureFL"]);
  assert.deepEqual(
    aliasClaim.releasableReport(stillNamedDone, doc).HELD,
    ["s-captureFL"],
    "with the declaration pointing at ## Archive, a plain ## Done section is no longer the closure home",
  );
});

test("BITE — --releasable CLI: kind:\"file\" home — a citation living only in the declared closure-home file resolves RELEASABLE end to end", async () => {
  await withCaptures(async ({ capturesDir, dir, env }) => {
    const cap = "s-zzzzclifil-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    await writeCapture(capturesDir, cap, 1024);
    const claimOut = (await run("node", [TOOL, join(capturesDir, cap), "--protect"], { env })).stdout.trim();
    const alias = claimOut.split(/\s/)[0];
    const backlogPath = join(dir, "fake-backlog.md");
    const closurePath = join(dir, "BACKLOG-DONE.md");
    await writeFile(backlogPath, "Closure-home: BACKLOG-DONE.md\n## Open\n- unrelated entry\n");
    await writeFile(closurePath, `- closed entry citing ${alias}\n`);
    const { stdout } = await run("node", [TOOL, "--releasable", backlogPath], { env });
    assert.match(stdout, new RegExp(`RELEASABLE \\(1\\): ${alias}`));
    assert.match(stdout, /HELD \(0\)/);
  });
});

test("BITE — --releasable CLI: kind:\"file\" home — an unreadable closure-home file reports COULD-NOT-VERIFY, not UNCITED, and stderr names the path", async () => {
  await withCaptures(async ({ capturesDir, dir, env }) => {
    const cap = "s-zzzzclimis-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    await writeCapture(capturesDir, cap, 1024);
    const claimOut = (await run("node", [TOOL, join(capturesDir, cap), "--protect"], { env })).stdout.trim();
    const alias = claimOut.split(/\s/)[0];
    const backlogPath = join(dir, "fake-backlog.md");
    // BACKLOG-DONE.md deliberately never written.
    await writeFile(backlogPath, "Closure-home: BACKLOG-DONE.md\n## Open\n- unrelated entry\n");
    const { stdout, stderr } = await run("node", [TOOL, "--releasable", backlogPath], { env });
    assert.match(stdout, new RegExp(`COULD-NOT-VERIFY \\(1\\): ${alias}`));
    assert.match(stdout, /UNCITED \(0\)/);
    assert.match(stderr, /BACKLOG-DONE\.md/);
  });
});

// A REAL-DATA discriminating pair, pinned to a FROZEN ref rather than the
// live working tree — the live file moves under a running suite (the
// dispatcher's own desk check landed a 50-line section above s-captureBM's
// citation during this lane's earlier live run, which is the live
// demonstration that a ref must be frozen, same idiom as
// test/backlog-lint.test.mjs's CLOSURES_FROZEN_REF). At 375bf82,
// BACKLOG.md carries 49 distinct s-capture* aliases, 28 of which form
// prefix pairs — verified independently before writing this assertion
// (`grep -o 's-capture[A-Z]\+' | sort -u | wc -l`, and by hand for the
// prefix relation): `s-captureA` alone is a literal PREFIX of 20 co-present
// aliases (AB, AC, AD, AE, AG, AH, AL, AM, AN, AO, AP, AQ, AS, AT, AU, AV,
// AW, AX, AY, AZ), `s-captureB` of 8 more (BA, BB, BC, BD, BE, BF, BG, BM).
// An unanchored substring scan for `s-captureA` therefore over-counts by
// 12.6x (101 vs 8) — not a contrived fixture number, the real file's own
// shape. The failure direction this pins: an unanchored match makes nearly
// every alias read as cited-in-a-live-section forever, so `--releasable`
// would never report RELEASABLE, protections would never be released, the
// protected-set cap would fill, and its own oldest-first eviction would
// then drop protections SILENTLY — the exact loss this mechanism exists to
// prevent.
test("BITE — real-data pair at a frozen ref: anchored (8) vs unanchored (101) citations of s-captureA MUST differ", async () => {
  const { stdout: text } = await run("git", ["show", "375bf82:BACKLOG.md"], {
    cwd: REPO_ROOT,
    maxBuffer: 16 * 1024 * 1024,
  });
  const unanchoredHits = (text.match(/s-captureA/g) ?? []).length;
  const anchoredHits = (text.match(/(?<![A-Za-z])s-captureA(?![A-Za-z])/g) ?? []).length;
  assert.equal(unanchoredHits, 101, "the unanchored count at this frozen ref");
  assert.equal(anchoredHits, 8, "the anchored count at this frozen ref");
  assert.notEqual(anchoredHits, unanchoredHits, "a discriminating instrument must disagree somewhere");

  // And releasableReport itself, fed the real text, uses the anchored
  // count — a synthetic "protected" s-captureA lands in HELD (its real
  // citations span the Open/Record/Upstream-PR-round/Parked sections plus
  // one under Done, so not every citation is under Done), never RELEASABLE
  // via the unanchored 101 and never UNCITED via missing the real 8.
  const doc = {
    aliases: { "s-captureA": { file: "irrelevant-requests.jsonl", protectedAt: "2026-08-13T00:00:00.000Z" } },
  };
  const report = aliasClaim.releasableReport(text, doc);
  assert.deepEqual(report.HELD, ["s-captureA"]);
  assert.deepEqual(report.RELEASABLE, []);
  assert.deepEqual(report.UNCITED, []);
});

// --- The anchoring, red-proven on REAL data rather than a fixture ----------
//
// The lane that built `--releasable` justified its anchored matcher from a
// fixture it wrote. The corpus supplies a far stronger positive, and the rule
// is to use it where reality offers one rather than a planted case.
//
// Measured at the frozen ref below: 49 distinct aliases are cited in
// BACKLOG.md and 28 of them form PREFIX PAIRS, because the allocator runs
// s-captureA..Z then s-captureAA, s-captureAB, … So `s-captureA` is a literal
// prefix of ten-plus live alias names, and an unanchored substring test counts
// every one of their citations as its own: 101 hits against 8 real ones.
//
// Why that is load-bearing and not tidiness — the failure direction: under an
// unanchored match nearly every protected alias reads as cited-in-a-live-
// section, so everything reports HELD forever, protections are never
// released, the 4 GiB protected-set cap fills, and the cap's own
// oldest-protection-first eviction then DROPS protections silently. An
// unanchored substring test would have quietly disarmed the mechanism this
// whole loop exists to build.
//
// The assertion is on the HIT COUNT, not on the bucket, and that is deliberate.
// Measured at this same ref: NO alias in the corpus changes bucket under
// anchoring, because every alias carrying a prefix-extension also has at least
// one genuine citation in a live section. A bucket-level assertion would
// therefore pass under both matchers — could-not-verify wearing verified's
// clothes. The count is what discriminates.
//
// Anchored to a FROZEN REF, never the live file: BACKLOG.md moved by exactly
// 50 lines under the building lane's own feet during its run, which is the
// demonstration rather than the hypothetical.
const ANCHORING_FROZEN_REF = "375bf82";

function backlogAt(ref) {
  return execFileSync("git", ["show", `${ref}:BACKLOG.md`], {
    cwd: join(dirname(fileURLToPath(import.meta.url)), ".."),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024, // BACKLOG.md is ~1.1 MB; the 1 MB default ENOBUFSes
  });
}

// LINES, not MATCHES — and the distinction cost a red run here, in the bite
// written to demonstrate exactly this class. `citationLineIndices` returns one
// index per matching LINE; the desk measurement that motivated this bite
// counted regex MATCHES across the text. At this ref the two differ on both
// sides: 7 lines / 8 matches anchored, 90 lines / 101 matches unanchored. Both
// figures are true and they answer different questions, which is the whole
// point of the rule they violate — name the space each number is in, at the
// point where they meet. The function's own space is lines, so that is what
// this asserts.
test("BITE — anchored citation matching on the REAL corpus: s-captureA is 7 LINES, not the 90 a substring test sees", () => {
  const lines = backlogAt(ANCHORING_FROZEN_REF).split("\n");
  const anchored = aliasClaim.citationLineIndices("s-captureA", lines);
  const unanchored = lines.filter((l) => l.includes("s-captureA")).length;

  assert.equal(anchored.length, 7, "s-captureA is cited on 7 lines at this frozen ref");
  assert.equal(unanchored, 90, "an unanchored substring test sees 90 lines — the prefix-extensions' citations");
  assert.notEqual(
    anchored.length,
    unanchored,
    "the two MUST differ, or the anchoring is not doing anything and this bite proves nothing",
  );
});

// THREE quantities live here and they are easy to collapse into one number —
// which is exactly what happened while this bite was being written: "28 prefix
// pairs" was asserted as if it counted AFFECTED ALIASES, and it counts
// (prefix, extension) TUPLES. Two different spaces under one figure, the
// error dev-loop.md names as "say which space each number is in, at the point
// where they meet". Each is asserted separately below, named.
test("BITE — the prefix hazard, with each quantity named: 49 cited, 28 pair-tuples, 2 aliases actually at risk", () => {
  const text = backlogAt(ANCHORING_FROZEN_REF);
  const cited = [...new Set(text.match(/s-capture[A-Z]+/g) ?? [])];
  const tuples = cited.flatMap((a) => cited.filter((b) => b !== a && b.startsWith(a)).map((b) => [a, b]));
  const atRisk = [...new Set(tuples.map(([a]) => a))].sort();

  assert.equal(cited.length, 49, "distinct aliases cited at this ref");
  assert.equal(tuples.length, 28, "(prefix, extension) PAIRS — not the number of affected aliases");
  assert.deepEqual(atRisk, ["s-captureA", "s-captureB"], "only two aliases are a prefix of another; each is a prefix of many");

  // s-captureB is a prefix of s-captureBM — the alias that is protected RIGHT
  // NOW. So the hazard is not hypothetical-in-principle: the moment
  // s-captureB is protected, an unanchored matcher counts s-captureBM's
  // citation as evidence for s-captureB and holds it forever.
  assert.ok(cited.includes("s-captureBM"), "the currently-protected alias is cited at this ref");
  assert.ok("s-captureBM".startsWith("s-captureB"), "and it extends one of the two at-risk aliases");
});

// ---------------------------------------------------------------------------
// THE CAP IS A GATE ON ADDING, NEVER A LICENCE TO REMOVE (2026-08-20).
//
// The incident these bites exist for: over cap, `--protect` used to unlink
// protected entries oldest-first until the total fit. That is a downgrade only
// while the capture still has its live copy; once retention has swept that,
// the protected link is the LAST link and unlinking it DELETES the bytes. It
// did, to s-captureBM, unrecoverably — and four of the six members left behind
// had nlink === 1, so the destroying case was the set's normal condition.
//
// The discriminator these assert is NOT "protect failed". A tool that simply
// refused everything would satisfy that. It is the PAIR: the newcomer is
// refused AND the last-copy member still has its bytes — the old code passed
// the first half of that (it "succeeded") and failed the second.
const lastCopyFixture = async ({ capturesDir, protectedDir, env }) => {
  const victim = "s-zzzzcapV-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
  await writeCapture(capturesDir, victim, 700 * 1024);
  await run("node", [TOOL, join(capturesDir, victim), "--protect"], { env });
  // Retention sweeps the live copy: the protected link is now the only one.
  await rm(join(capturesDir, victim));
  assert.equal(
    (await stat(join(protectedDir, victim))).nlink,
    1,
    "fixture premise: the victim is a LAST COPY — pinned here, not assumed, " +
      "because a fixture with nlink 2 would make every assertion below vacuous",
  );
  return victim;
};

test("BITE — over cap, protect REFUSES the newcomer and the last-copy member keeps its bytes", async () => {
  await withCaptures(async ({ capturesDir, protectedDir, env }) => {
    const capEnv = { ...env, CACHE_FIX_PROTECTED_MAX_MB: "1" };
    const victim = await lastCopyFixture({ capturesDir, protectedDir, env: capEnv });

    const newcomer = "s-zzzzcapN-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    await writeCapture(capturesDir, newcomer, 500 * 1024); // 700K + 500K > 1 MiB
    await assert.rejects(
      () => run("node", [TOOL, join(capturesDir, newcomer), "--protect"], { env: capEnv }),
      /refusing/,
      "the cap refuses rather than making room",
    );

    assert.deepEqual(
      (await readdir(protectedDir)).sort(),
      [victim],
      "the victim's link survives AND the refused newcomer was never linked — " +
        "the second half is what the evicting implementation failed",
    );
    assert.equal((await readFile(join(protectedDir, victim))).length, 700 * 1024,
      "and its bytes are intact, not truncated");
  });
});

test("BITE — over cap, re-protecting an ALREADY-linked capture stays a no-op and destroys nothing", async () => {
  // The branch that would ship unexercised: the natural test writes the
  // fresh-protect case above and stays green through this one. Under the old
  // code the cap ran after the link attempt and OUTSIDE the already-linked
  // guard, so "did that go through? let me run it again" destroyed a capture
  // while adding zero bytes.
  await withCaptures(async ({ capturesDir, protectedDir, env }) => {
    const capEnv = { ...env, CACHE_FIX_PROTECTED_MAX_MB: "1" };
    const victim = await lastCopyFixture({ capturesDir, protectedDir, env: capEnv });

    const again = (await run("node", [TOOL, join(capturesDir, victim), "--protect"], { env: capEnv })).stdout.trim();
    assert.match(again, /already protected/, "a no-op retry succeeds even with the set over cap");
    assert.deepEqual(await readdir(protectedDir), [victim], "nothing was dropped to pay for it");
    assert.equal((await readFile(join(protectedDir, victim))).length, 700 * 1024);
  });
});

test("BITE — under cap, protect still works: the refusal is not the tool refusing everything", async () => {
  await withCaptures(async ({ capturesDir, protectedDir, env }) => {
    const capEnv = { ...env, CACHE_FIX_PROTECTED_MAX_MB: "64" };
    const victim = await lastCopyFixture({ capturesDir, protectedDir, env: capEnv });
    const newcomer = "s-zzzzcapU-wxyz-wxyz-wxyz-synthetictest-requests.jsonl";
    await writeCapture(capturesDir, newcomer, 500 * 1024);
    const out = (await run("node", [TOOL, join(capturesDir, newcomer), "--protect"], { env: capEnv })).stdout.trim();
    assert.match(out, /\(protected\)/, "room available -> protection proceeds");
    assert.deepEqual((await readdir(protectedDir)).sort(), [newcomer, victim].sort());
  });
});
