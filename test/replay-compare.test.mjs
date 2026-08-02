// replay-compare — the acceptance-gate differ for a pipeline change.
//
// DEFINITION first, taken from what the gate requires rather than from the
// tool: replaying a corpus with a change OFF and ON must show that the reports
// "differ only in the intended mutations" (replay.mjs header, the directive's
// acceptance gate). A differ serving that gate has to report, for the same
// capture replayed twice: which finding arrays changed size, which requests
// changed telemetry and how, and — the part a naive differ gets wrong — that a
// request PRESENT on one side and ABSENT on the other is a missing request,
// not a reason to compare every later request against its neighbour.
//
// That last one is the defect this file was written to catch: an
// index-aligned comparison of two runs where one side dropped a request
// reports a delta on every request after the drop, which reads as "the change
// broke everything" and hides what actually changed. The bite below is red
// against an index-aligned differ and green against the ordinal-keyed one.
//
// That red was DEMONSTRATED, not reasoned (2026-08-02): the shipped tool was
// ordinal-keyed from its first line, so the arrangement was a copy of it with
// `m.set(r.n, r)` replaced by `rows.forEach((r, i) => m.set(i, r))` — the
// index-aligned variant — run against THIS file unchanged. 3 of 7 red there,
// including the BITE; 7 of 7 green against the shipped tool. Expectations from
// the gate's definition above, implementation swapped underneath them.

import { test } from "node:test";
import assert from "node:assert/strict";

import { compare } from "../tools/replay-compare.mjs";

const req = (n, insertion = {}, outHash = `h${n}`) => ({
  n, ts: `2026-08-02T00:00:0${n}Z`, key: "s-test", outHash,
  insertion: { action: "normalized", resetReason: undefined, moved: 0, suppressed: 0, ...insertion },
});

const report = (rows, extra = {}) => ({
  report: rows,
  violations: [], exemptions: [], safety: [], conservation: [],
  conservationExemptions: [], sequence: [], orderViolations: [],
  ...extra,
});

test("identical reports: nothing changed", () => {
  const rows = [req(1), req(2), req(3)];
  const r = compare(report(rows), report(rows));
  assert.equal(r.compared, 3);
  assert.deepEqual(r.changed, []);
  assert.deepEqual(r.missing, []);
  assert.deepEqual(r.extra, []);
  for (const a of r.arrays) assert.equal(a.old, a.new, `${a.key} must not report a change`);
});

test("a telemetry flip is reported on the request that flipped, with both values", () => {
  const oldSide = [req(1), req(2, { action: "reset", resetReason: "not-subsequence" }), req(3)];
  const newSide = [req(1), req(2, { action: "normalized", moved: 1 }), req(3)];
  const r = compare(report(oldSide), report(newSide));
  assert.equal(r.changed.length, 1, "exactly the one request that changed");
  assert.equal(r.changed[0].n, 2);
  const fields = Object.fromEntries(r.changed[0].deltas.map(([f, a, b]) => [f, [a, b]]));
  assert.deepEqual(fields.action, ["reset", "normalized"]);
  assert.deepEqual(fields.resetReason, ["not-subsequence", "undefined"]);
  assert.deepEqual(fields.moved, ["0", "1"]);
});

test("BITE — a request missing from the new side is reported as MISSING, and does not desync the rest", () => {
  // The whole point: ordinals 1,2,4 vs 1,4 — an index-aligned differ compares
  // old[1] (n=2) against new[1] (n=4) and invents a delta on a request that
  // never changed. Keyed on the ordinal, n=4 compares against n=4.
  const oldSide = [req(1), req(2, { moved: 7 }), req(4)];
  const newSide = [req(1), req(4)];
  const r = compare(report(oldSide), report(newSide));
  assert.deepEqual(r.missing, [2], "the dropped request is named");
  assert.deepEqual(r.extra, []);
  assert.deepEqual(r.changed, [], "no invented deltas on the requests that survived unchanged");
});

test("a request only the new side has is EXTRA, never silently compared", () => {
  const r = compare(report([req(1)]), report([req(1), req(2)]));
  assert.deepEqual(r.extra, [2]);
  assert.deepEqual(r.missing, []);
  assert.deepEqual(r.changed, []);
});

test("finding-array sizes are reported per array, both sides", () => {
  const r = compare(
    report([req(1)], { violations: [{ x: 1 }], orderViolations: [{ y: 1 }, { y: 2 }] }),
    report([req(1)], { violations: [] }),
  );
  const a = Object.fromEntries(r.arrays.map((x) => [x.key, [x.old, x.new]]));
  assert.deepEqual(a.violations, [1, 0]);
  assert.deepEqual(a.orderViolations, [2, 0]);
  assert.deepEqual(a.safety, [0, 0]);
});

test("object-valued telemetry is compared by content, not by reference", () => {
  const oldSide = [req(1, { suppressions: [{ index: 5, hash: "a" }] })];
  const same = [req(1, { suppressions: [{ index: 5, hash: "a" }] })];
  const moved = [req(1, { suppressions: [{ index: 6, hash: "a" }] })];
  assert.deepEqual(compare(report(oldSide), report(same)).changed, [],
    "equal content is not a delta even though the objects are distinct");
  assert.equal(compare(report(oldSide), report(moved)).changed.length, 1,
    "a shifted suppression index IS a delta — that is the class this gate exists for");
});

test("outHash is compared: our forwarded bytes changing is never invisible", () => {
  const r = compare(report([req(1, {}, "aaa")]), report([req(1, {}, "bbb")]));
  assert.equal(r.changed.length, 1);
  assert.deepEqual(r.changed[0].deltas[0], ["outHash", "aaa", "bbb"]);
});
