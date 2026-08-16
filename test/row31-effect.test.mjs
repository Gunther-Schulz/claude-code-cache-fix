// row31-effect — bites for the row-31 effect instrument.
//
// What this instrument claims, and therefore what has to be falsifiable: that
// a per-arm, per-capture double-billing rate over ONE fixed corpus separates a
// mitigation that acted from one that did not. A zero from an instrument that
// could only ever print zero is indistinguishable from a measurement, so the
// load-bearing bite here is the NEGATIVE one — an ON arm that still
// double-bills must come back non-zero.
//
// Namespace import on purpose (dev-loop, "the commonest way to collapse the
// split is the import line"): a static named import of a not-yet-written
// export fails the whole module at ESM link time, so every bite goes red at
// once and the run proves nothing about which half broke.

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpDir } from "../tools/tmpdir.mjs";

import * as mod from "../tools/row31-effect.mjs";
const { armOf, captureArms, summarise, report, readBootGates } = mod;

const bootLine = (gates) => JSON.stringify({ ts: "2026-08-16T00:00:00.000Z", type: "boot", pid: 1, gates });

// A capture file: line 1 is the boot record, then a request line long enough
// that a reader which slurped the file would be reading megabytes it does not
// need — the boot read is supposed to stop at the first newline.
async function writeCapture(dir, name, gates, { boot = true } = {}) {
  const first = boot ? bootLine(gates) : JSON.stringify({ type: "request", id: "x" });
  const filler = JSON.stringify({ type: "request", pad: "x".repeat(200000) });
  await writeFile(join(dir, name), `${first}\n${filler}\n`);
}

test("armOf answers FOUR ways, and PRE-GATE is not OFF", () => {
  assert.equal(armOf({ CACHE_FIX_COALESCE_SIDECAR: "1" }), "ON");
  assert.equal(armOf({ CACHE_FIX_COALESCE_SIDECAR: "0" }), "OFF");
  // A boot record from a build that predates the mechanism: the gate name is
  // absent, which is a DIFFERENT fact from a proxy that ran it off.
  assert.equal(armOf({ CACHE_FIX_PREFIXDIFF: "1" }), "PRE-GATE");
  // No boot record at all is unmeasured, and must not borrow another arm.
  assert.equal(armOf(null, { hasBootRecord: false }), "NO-BOOT");
});

test("readBootGates reads line 1 only, and reports a non-boot first line as null", async () => {
  const dir = await tmpDir("row31-effect-boot-");
  try {
    await writeCapture(dir, "a.jsonl", { CACHE_FIX_COALESCE_SIDECAR: "1" });
    await writeCapture(dir, "b.jsonl", null, { boot: false });
    const gates = readBootGates(join(dir, "a.jsonl"));
    assert.equal(gates?.CACHE_FIX_COALESCE_SIDECAR, "1");
    assert.equal(readBootGates(join(dir, "b.jsonl")), null);
    // A file that does not exist is a null, never a throw — the corpus loses
    // captures under the reader's feet by design (eviction is oldest-first).
    assert.equal(readBootGates(join(dir, "gone.jsonl")), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("captureArms labels every capture in the directory", async () => {
  const dir = await tmpDir("row31-effect-arms-");
  try {
    await writeCapture(dir, "on.jsonl", { CACHE_FIX_COALESCE_SIDECAR: "1" });
    await writeCapture(dir, "off.jsonl", { CACHE_FIX_COALESCE_SIDECAR: "0" });
    await writeCapture(dir, "pre.jsonl", { CACHE_FIX_PREFIXDIFF: "1" });
    await writeCapture(dir, "noboot.jsonl", null, { boot: false });
    await writeFile(join(dir, "notacapture.txt"), "ignored");
    const arms = captureArms(dir);
    assert.equal(arms.length, 4, "the .txt must not be labelled as a capture");
    const counts = arms.reduce((a, x) => ((a[x.arm] = (a[x.arm] ?? 0) + 1), a), {});
    assert.deepEqual(counts, { ON: 1, OFF: 1, "PRE-GATE": 1, "NO-BOOT": 1 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// --- the load-bearing pair: the instrument must be able to report FAILURE ---

const streak = (capture, family, billed) => ({ capture, family, billed, length: 2, intervalMs: 13 });

test("BITE — an ON arm that still double-bills comes back NON-ZERO", () => {
  const arms = [{ token: "t1", arm: "ON" }, { token: "t2", arm: "OFF" }];
  const streaks = [
    streak("t1", "session-start", 2),   // the mitigation did NOT act here
    streak("t1", "session-start", 1),
    streak("t2", "session-start", 2),
  ];
  const { totals } = summarise(streaks, arms);
  assert.equal(totals.ON.sessionStartDoubleBilled, 1);
  assert.equal(totals.ON.sessionStartStreaks, 2);
  const text = report({ __file: "x.json", producedAt: "t", duplicateStreaks: streaks }, summarise(streaks, arms));
  assert.match(text, /ON 1\.000/, "a failing mitigation must render as a non-zero ON rate");
});

test("BITE — a working mitigation and a failing one do NOT render the same", () => {
  const arms = [{ token: "t1", arm: "ON" }, { token: "t2", arm: "OFF" }];
  const working = [streak("t1", "session-start", 1), streak("t2", "session-start", 2)];
  const failing = [streak("t1", "session-start", 2), streak("t2", "session-start", 2)];
  const a = report({ __file: "x", producedAt: "t", duplicateStreaks: working }, summarise(working, arms));
  const b = report({ __file: "x", producedAt: "t", duplicateStreaks: failing }, summarise(failing, arms));
  assert.notEqual(a, b, "two outcomes the instrument cannot tell apart is the instrument failing, not a finding");
});

test("BITE — a streak whose capture is gone is counted as orphaned, never dropped", () => {
  const arms = [{ token: "t1", arm: "ON" }];
  const streaks = [streak("t1", "session-start", 1), streak("evicted", "session-start", 2)];
  const { totals, orphanStreaks } = summarise(streaks, arms);
  assert.equal(orphanStreaks, 1);
  assert.equal(totals.ON.streaks, 1, "the orphan must not be attributed to an arm it may not belong to");
});

test("BITE — no control arm is COULD NOT VERIFY, not a comparison", () => {
  const arms = [{ token: "t1", arm: "ON" }, { token: "t2", arm: "ON" }];
  const streaks = [streak("t1", "session-start", 1)];
  const text = report({ __file: "x", producedAt: "t", duplicateStreaks: streaks }, summarise(streaks, arms));
  assert.match(text, /COULD NOT VERIFY/);
  assert.doesNotMatch(text, /control arm used/);
});

test("the control arm falls back to PRE-GATE only when OFF is empty, and says which it used", () => {
  const streaks = [streak("t1", "session-start", 1), streak("t2", "session-start", 2), streak("t3", "session-start", 2)];
  const withOff = [{ token: "t1", arm: "ON" }, { token: "t2", arm: "OFF" }, { token: "t3", arm: "PRE-GATE" }];
  assert.match(report({ __file: "x", producedAt: "t", duplicateStreaks: streaks }, summarise(streaks, withOff)),
    /control arm used: OFF/);
  const noOff = [{ token: "t1", arm: "ON" }, { token: "t3", arm: "PRE-GATE" }];
  assert.match(report({ __file: "x", producedAt: "t", duplicateStreaks: streaks }, summarise(streaks, noOff)),
    /control arm used: PRE-GATE/);
});

test("mid-session and session-start are counted apart — over-reach has to be visible", () => {
  const arms = [{ token: "t1", arm: "ON" }];
  const streaks = [streak("t1", "session-start", 2), streak("t1", "mid-session", 2), streak("t1", "mid-session", 1)];
  const { totals } = summarise(streaks, arms);
  assert.equal(totals.ON.sessionStartDoubleBilled, 1);
  assert.equal(totals.ON.midSessionDoubleBilled, 1);
  assert.equal(totals.ON.midSessionStreaks, 2);
});
