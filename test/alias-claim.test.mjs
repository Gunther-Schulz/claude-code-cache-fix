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

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { captureKeyOf, nextAlias, claim, lookup } from "../tools/alias-claim.mjs";

const run = promisify(execFile);
const TOOL = join(dirname(fileURLToPath(import.meta.url)), "..", "tools", "alias-claim.mjs");

const withRegistry = async (fn) => {
  const dir = await mkdtemp(join(tmpdir(), "alias-claim-"));
  const reg = join(dir, "aliases.json");
  try {
    return await fn(reg, dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

test("nextAlias walks A..Z then AA.., skipping what is taken", () => {
  assert.equal(nextAlias(new Set()), "s-captureA");
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
