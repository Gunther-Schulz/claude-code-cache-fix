// prefix-diff — permissions, content minimization, and cross-key retention
// (2026-08-05, PR #280 review round). Three independent invariants, each
// with its own BITE:
//
//   1. Every artifact this module writes lands 0600, not at the ambient
//      umask.
//   2. In DEFAULT mode (CACHE_FIX_PREFIXDIFF_CONTENT unset), no byte of
//      prompt-derived text reaches any written file — proven by grepping
//      every file written for a sentinel string placed in the request,
//      not by asserting which fields are set (a field-shape assertion
//      would pass even if some OTHER field the assertion didn't think to
//      check leaked the same bytes).
//   3. A boot-time sweep bounds the snapshot directory across sessions:
//      artifacts older than 14 days are deleted regardless of key count,
//      and once fewer than 200 keys remain, the oldest keys beyond that
//      cap are deleted regardless of age.
//
// All I/O in this file is confined to a fresh mkdtemp() per test, passed
// explicitly as `dir`/`options.dir` — never the real
// `~/.claude/cache-fix-snapshots/`, which is production state for a
// running proxy.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, rm, stat, utimes, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpDir } from "../tools/tmpdir.mjs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  snapshotPrefix,
  sweepSnapshotDir,
  SNAPSHOT_MAX_AGE_MS,
  SNAPSHOT_MAX_KEYS,
} from "../proxy/extensions/prefix-diff.mjs";

const OWNER_ONLY = 0o600;

async function newTmp() {
  return tmpDir("prefix-diff-security-test-");
}

async function modeOf(path) {
  return (await stat(path)).mode & 0o777;
}

function makePayload({
  system = [{ type: "text", text: "you are claude" }],
  tools = [{ name: "Read" }, { name: "Bash" }],
  messages = [
    { role: "user", content: [{ type: "text", text: "hello" }] },
    { role: "assistant", content: [{ type: "text", text: "hi" }] },
  ],
} = {}) {
  return { system, tools, messages };
}

async function captureStderr(fn) {
  const orig = process.stderr.write;
  process.stderr.write = () => true;
  try {
    await fn();
  } finally {
    process.stderr.write = orig;
  }
}

// Grep every file under `dir` for `needle`. Returns the list of file names
// that contain it — empty means clean.
async function grepDirFor(dir, needle) {
  const names = await readdir(dir).catch(() => []);
  const hits = [];
  for (const name of names) {
    const content = await readFile(join(dir, name), "utf-8").catch(() => "");
    if (content.includes(needle)) hits.push(name);
  }
  return hits;
}

// =====================================================================
// 1. Mode-bit BITEs
// =====================================================================

test("BITE — a freshly written -last.json snapshot lands 0600", async () => {
  const dir = await newTmp();
  try {
    const headers = { "x-claude-code-session-id": "mode-last" };
    const r = await snapshotPrefix(makePayload(), { dir, headers });
    assert.equal(await modeOf(join(dir, `${r.key}-last.json`)), OWNER_ONLY);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("BITE — a freshly written -diff.json lands 0600", async () => {
  const dir = await newTmp();
  try {
    const headers = { "x-claude-code-session-id": "mode-diff" };
    await snapshotPrefix(makePayload(), { dir, headers });
    let r;
    await captureStderr(async () => {
      r = await snapshotPrefix(
        makePayload({ messages: [{ role: "user", content: [{ type: "text", text: "CHANGED" }] }] }),
        { dir, headers },
      );
    });
    assert.ok(r.wroteDiff, "precondition: a diff must actually have been written");
    assert.equal(await modeOf(join(dir, `${r.key}-diff.json`)), OWNER_ONLY);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("BITE — a freshly written -events.jsonl ledger lands 0600", async () => {
  const dir = await newTmp();
  try {
    const headers = { "x-claude-code-session-id": "mode-events" };
    await snapshotPrefix(makePayload(), { dir, headers });
    let r;
    await captureStderr(async () => {
      r = await snapshotPrefix(
        makePayload({ messages: [{ role: "user", content: [{ type: "text", text: "CHANGED" }] }] }),
        { dir, headers },
      );
    });
    assert.ok(r.wroteDiff);
    assert.equal(await modeOf(join(dir, `${r.key}-events.jsonl`)), OWNER_ONLY);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("BITE — a rotated -events.jsonl.1 stays 0600 after the boot sweep repairs it", async () => {
  const dir = await newTmp();
  try {
    // `s-` + 12 hex: the shape resolveSessionKey writes, which the sweep's
    // scope regex anchors on. A readable label here would simply fall outside
    // the sweep's scope and the bite would pass without repairing anything.
    const key = "s-0d0e5700de01";
    const eventsPath = join(dir, `${key}-events.jsonl`);
    // Seed a pre-existing events file at a loose mode, as if written by
    // code that predates this fix — this is exactly the case rotation's
    // rename-preserves-mode behaviour cannot repair on its own (rotation
    // never calls the owner-only writer on the `.1` name).
    await writeFile(eventsPath, "old\n", { mode: 0o644 });
    assert.equal(await modeOf(eventsPath), 0o644, "precondition: starts world-readable");

    await sweepSnapshotDir(dir);

    assert.equal(await modeOf(eventsPath), OWNER_ONLY, "sweep must repair a stale mode on a surviving file");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// =====================================================================
// 2. Content minimization — sentinel grep
// =====================================================================

const SENTINEL = "SENTINEL-9f3c2b7e-do-not-persist";

// FIXTURE DEFECT, FOUND AND FIXED 2026-08-16 while porting the gate — the
// overrides parameter did not exist. Both arms below call
// `payloadWithSentinel({ messages: [...] })` to make the SECOND request differ
// from the first, and the no-argument version inherited from upstream silently
// ignored that object: the two requests were byte-identical, so no diff and no
// event record were ever written, and the absence assertion only ever covered
// `-last.json`. The arms passed either way, which is what stopped anyone
// looking. The `wroteDiff` precondition asserted in both arms below is what
// keeps it fixed: it fails loudly if the two requests ever stop differing.
function payloadWithSentinel(overrides = {}) {
  return makePayload({
    system: [{ type: "text", text: `you are claude. ${SENTINEL} extra context that pads past any short cap` }],
    messages: [
      { role: "user", content: SENTINEL },
      { role: "assistant", content: [{ type: "text", text: "ack" }] },
      { role: "user", content: [{ type: "tool_result", content: `result containing ${SENTINEL}` }] },
      { role: "assistant", content: [{ type: "tool_use", name: "Bash", input: { command: SENTINEL } }] },
    ],
    ...overrides,
  });
}

// CONTRACT CHANGED 2026-08-16 — the pair below replaced a single
// "FORK CONTRACT — default mode DOES persist prompt text" bite, and this note
// is the record of why, so the change reads as a decision rather than as a
// repair.
//
// Until today this fork had no content gate at all (`grep -c
// 'CONTENT_ENABLED\|PREFIXDIFF_CONTENT' proxy/extensions/prefix-diff.mjs`
// returned 0): it always stored system-block text to SYSTEM_TEXT_CAP, message
// previews and event-record previews. The old bite asserted that — the fork's
// real contract — precisely so it would go RED on the day the gate landed
// rather than letting the change pass unnoticed. It DID go red today
// (1 failing of 10, the other nine green), and this is the deliberate update
// of the expectation, not a reflexive greening.
//
// What changed underneath: upstream's `CACHE_FIX_PREFIXDIFF_CONTENT` gate is
// now ported verbatim, default OFF (operator decision, BACKLOG "port upstream
// CACHE_FIX_PREFIXDIFF_CONTENT gate default-OFF, opt deployment in"). The code
// matches upstream exactly and the divergence lives in the DEPLOYMENT: the
// serving unit sets the variable to 1, so this machine keeps byte-level
// attribution, with the reason recorded in the dotfiles gate-acceptance entry.
// So the two arms below now test the CODE's contract; they say nothing about
// what this deployment has opted into, which is the point of moving the choice
// out of the code.
//
// The pair also discriminates again, which it could not while the fork had no
// gate: with one code path for both arms, default and contentEnabled:true
// exercised the same bytes and two arms agreeing was the finding.
test("BITE — default mode: the sentinel never lands in any written file", async () => {
  const dir = await newTmp();
  try {
    const headers = { "x-claude-code-session-id": "content-default" };
    // First request establishes the baseline; second mutates it so a diff
    // and an event record are actually written — the artifacts most
    // likely to carry a leaked preview. `wroteDiff` is asserted rather
    // than assumed: without it this absence claim silently shrinks to
    // `-last.json` alone (see the fixture note above).
    await snapshotPrefix(payloadWithSentinel(), { dir, headers });
    let r;
    await captureStderr(async () => {
      r = await snapshotPrefix(
        payloadWithSentinel({
          messages: [{ role: "user", content: `${SENTINEL} mutated` }],
        }),
        { dir, headers },
      );
    });
    assert.ok(r.wroteDiff, "precondition: a diff and an event record must actually have been written");

    const hits = await grepDirFor(dir, SENTINEL);
    assert.deepEqual(hits, [], `sentinel must not appear in any written file, found in: ${hits.join(", ")}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("CONTROL — CACHE_FIX_PREFIXDIFF_CONTENT mode: the sentinel DOES land on disk (proves the grep can detect it)", async () => {
  const dir = await newTmp();
  try {
    const headers = { "x-claude-code-session-id": "content-enabled" };
    await snapshotPrefix(payloadWithSentinel(), { dir, headers, contentEnabled: true });
    let r;
    await captureStderr(async () => {
      r = await snapshotPrefix(
        payloadWithSentinel({
          messages: [{ role: "user", content: `${SENTINEL} mutated` }],
        }),
        { dir, headers, contentEnabled: true },
      );
    });
    assert.ok(r.wroteDiff, "precondition: a diff and an event record must actually have been written");

    const hits = await grepDirFor(dir, SENTINEL);
    assert.ok(hits.length > 0, "control must find the sentinel when content mode is on, or the grep instrument is broken");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// =====================================================================
// 2b. The ENV route — the entry path production actually takes
// =====================================================================
//
// The two arms above drive the gate through `options.contentEnabled`, which is
// a TEST seam. Production drives it through `CACHE_FIX_PREFIXDIFF_CONTENT`,
// read once at module load into `CONTENT_ENABLED` — a different entry path to
// the same protected property, and "a mechanism that guards one route is not a
// guard" (dev-loop). An in-process test cannot flip a module-load constant, so
// each arm runs in its own child process with its own environment.
//
// This is the verifier the backlog entry names for this change: plant a
// sentinel, run the real path with the gate OFF and grep what was written, then
// re-run with the gate ON to prove the grep can see the sentinel at all. A zero
// from an instrument that never fires is indistinguishable from a zero that
// means something.

// Run one arm: two snapshots into `dir` in a child process whose environment
// carries (or does not carry) the gate. Returns the child's own `wroteDiff`, so
// the absence assertion cannot silently shrink to `-last.json` here either.
function runEnvArm(dir, gateValue) {
  const modUrl = new URL("../proxy/extensions/prefix-diff.mjs", import.meta.url).href;
  const src = `
    const { snapshotPrefix } = await import(process.env.MOD_URL);
    const headers = { "x-claude-code-session-id": "content-env-route" };
    await snapshotPrefix(JSON.parse(process.env.P1), { dir: process.env.DIR, headers });
    const r = await snapshotPrefix(JSON.parse(process.env.P2), { dir: process.env.DIR, headers });
    process.stdout.write(JSON.stringify({ wroteDiff: Boolean(r && r.wroteDiff) }));
  `;
  const env = {
    ...process.env,
    MOD_URL: modUrl,
    DIR: dir,
    P1: JSON.stringify(payloadWithSentinel()),
    P2: JSON.stringify(
      payloadWithSentinel({ messages: [{ role: "user", content: `${SENTINEL} mutated` }] }),
    ),
  };
  // Absent, not empty-string: an unset variable is the real default state, and
  // `CACHE_FIX_PREFIXDIFF_CONTENT=""` is a different input.
  delete env.CACHE_FIX_PREFIXDIFF_CONTENT;
  if (gateValue !== undefined) env.CACHE_FIX_PREFIXDIFF_CONTENT = gateValue;
  const out = execFileSync(process.execPath, ["--input-type=module", "-e", src], {
    env,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return JSON.parse(out);
}

test("BITE — env route, gate UNSET: the sentinel never lands in any written file", async () => {
  const dir = await newTmp();
  try {
    const { wroteDiff } = runEnvArm(dir, undefined);
    assert.ok(wroteDiff, "precondition: a diff and an event record must actually have been written");
    const hits = await grepDirFor(dir, SENTINEL);
    assert.deepEqual(hits, [], `sentinel must not appear in any written file, found in: ${hits.join(", ")}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("CONTROL — env route, CACHE_FIX_PREFIXDIFF_CONTENT=1: the sentinel DOES land on disk", async () => {
  const dir = await newTmp();
  try {
    const { wroteDiff } = runEnvArm(dir, "1");
    assert.ok(wroteDiff, "precondition: a diff and an event record must actually have been written");
    const hits = await grepDirFor(dir, SENTINEL);
    assert.ok(
      hits.length > 0,
      "the deployment's own configuration must still persist content — if this is empty, the gate " +
      "does not read the env var and the serving unit's opt-in is dead text",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// =====================================================================
// 3. Cross-key retention sweep
// =====================================================================

// Session keys here are `s-` + 12 HEX — the shape `resolveSessionKey`
// actually produces (sha256(session-id).slice(0,12)). The sweep's scope regex
// anchors on that shape, so a readable label like `s-oldkey0001` is 12
// characters of a key production never writes: a fixture encoding a state the
// real system cannot produce, which tests the harness rather than the code.
const hexKey = (n) => `s-${String(n).padStart(12, "0")}`;

async function seedKey(dir, key, { mtimeMs } = {}) {
  const files = [`${key}-last.json`, `${key}-diff.json`, `${key}-events.jsonl`];
  for (const name of files) {
    const p = join(dir, name);
    await writeFile(p, "{}");
    if (mtimeMs !== undefined) {
      const t = mtimeMs / 1000;
      await utimes(p, t, t);
    }
  }
  return files;
}

test("BITE — sweep deletes artifacts older than the age cap regardless of key count", async () => {
  const dir = await newTmp();
  try {
    const now = Date.now();
    const old = now - (SNAPSHOT_MAX_AGE_MS + 24 * 60 * 60 * 1000); // 15 days old
    const fresh = now - 60 * 1000; // 1 minute old

    const oldKey = hexKey(1);
    const freshKey = hexKey(2);
    await seedKey(dir, oldKey, { mtimeMs: old });
    await seedKey(dir, freshKey, { mtimeMs: fresh });

    const result = await sweepSnapshotDir(dir, undefined, { now });
    const remaining = (await readdir(dir)).sort();

    assert.equal(result.deleted, 3, "all 3 artifacts of the old key must be deleted");
    assert.deepEqual(
      remaining,
      [`${freshKey}-diff.json`, `${freshKey}-events.jsonl`, `${freshKey}-last.json`].sort(),
      "only the fresh key's artifacts survive",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("BITE — sweep prunes the oldest keys beyond the 200-key cap", async () => {
  const dir = await newTmp();
  try {
    const now = Date.now();
    // 205 keys, all well within the age cap, spread across distinct
    // mtimes so oldest-first pruning is well-defined.
    const totalKeys = 205;
    for (let i = 0; i < totalKeys; i++) {
      // Oldest key first (i=0 is oldest), 1 minute apart.
      await seedKey(dir, hexKey(i), { mtimeMs: now - (totalKeys - i) * 60 * 1000 });
    }

    const result = await sweepSnapshotDir(dir, undefined, { now });
    const remainingNames = await readdir(dir);
    const remainingKeys = new Set(
      remainingNames.map((n) => n.replace(/-(last\.json|diff\.json|events\.jsonl)$/, "")),
    );

    assert.equal(remainingKeys.size, SNAPSHOT_MAX_KEYS, "exactly maxKeys survive");
    assert.equal(result.deleted, (totalKeys - SNAPSHOT_MAX_KEYS) * 3, "3 artifacts per evicted key");
    // The 5 oldest keys (i=0..4) must be gone; the 200 newest must remain.
    for (let i = 0; i < totalKeys - SNAPSHOT_MAX_KEYS; i++) {
      assert.ok(!remainingKeys.has(hexKey(i)), `oldest key ${hexKey(i)} must have been evicted`);
    }
    assert.ok(remainingKeys.has(hexKey(totalKeys - 1)), "the newest key must survive");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("sweep is a safe no-op on a directory that does not exist yet", async () => {
  const dir = join(await newTmp(), "does-not-exist");
  const result = await sweepSnapshotDir(dir, undefined, {});
  assert.deepEqual(result, { deleted: 0, keysRemaining: 0 });
});

test("sweep ignores files that are not this module's own artifacts", async () => {
  const dir = await newTmp();
  try {
    await writeFile(join(dir, "cache-fix-keymap.jsonl"), "unrelated\n");
    await writeFile(join(dir, "s-somekey-last.json"), "{}");
    const result = await sweepSnapshotDir(dir, undefined, {});
    assert.equal(result.deleted, 0);
    const remaining = (await readdir(dir)).sort();
    assert.deepEqual(remaining, ["cache-fix-keymap.jsonl", "s-somekey-last.json"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
