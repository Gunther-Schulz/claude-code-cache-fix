// The fire ledger's depth breakdown of `relocations`.
//
// WHY. `raw.relocations` counts one row per MITIGABLE pair and is read as a
// harm signal — the column a retirement argument and a keep-it-running
// argument are both drawn from. Measured 2026-08-20 over the 49-capture live
// window (run recorded in test/replay-insert-depth.test.mjs's header): 2,455 of
// 2,635 splice pairs are CC's benign trailing-reminder push-down and exactly
// one was deep. A counter dominated by a shape that costs almost nothing
// carries almost no signal, and a per-CLASS breakdown — the obvious fix — would
// have produced a second dominated counter, because the separating quantity is
// `anchorDelta`, not the census class.
//
// WHAT THIS IS NOT. Not new FIRE_CLASSES members: `relocations` keeps its name,
// its meaning and its value, and the buckets CONSERVE against it. Buckets as
// classes would have double-counted inside every sum over FIRE_CLASSES and
// forced an absorbed and a bytes column for each with no source to fill them.
//
// RED-FIRST. These expectations cannot run against the old implementation —
// `tallyInsertDepth` and `reduceFireDepth` did not exist, and a module-load red
// is satisfied by any body at all. Discrimination was established by mutation,
// each run recorded:
//
//   (d) the old-schema guard removed (`return null` -> fall through to the
//       tally)  -> the old-schema bite goes red, reporting five zeros for a
//       measure that never ran. Every other bite stays green — which is the
//       point: an unmeasured column that reads "0 deep splices" is
//       indistinguishable from a healthy one.
//   (e) the unknown branch folded into a known bucket (`t.unknown++` ->
//       `t.none++`)  -> the unknown-vocabulary bite goes red and the
//       conservation bite stays green, because folding conserves the total
//       while destroying the distinction. Conservation alone would not have
//       caught it.
//
// Both mutations were reverted immediately.

import { test } from "node:test";
import assert from "node:assert/strict";

import { tallyInsertDepth, summariseFireRaw, reduceFireDepth, FIRE_CLASSES } from "../tools/gate-live.mjs";
import { INSERT_DEPTHS } from "../tools/replay.mjs";

const row = (insertDepth) => ({ insertDepth, rebilledBytes: 0, savedBytes: 0 });

test("tallyInsertDepth: the buckets conserve against the count they break down", () => {
  const mit = [row("deep"), row("tail"), row("tail"), row("shallow"), row("unanchored"), row("none")];
  const t = tallyInsertDepth(mit);
  assert.equal(t.deep, 1);
  assert.equal(t.shallow, 1);
  assert.equal(t.tail, 2);
  assert.equal(t.unanchored, 1);
  assert.equal(t.none, 1);
  assert.equal(t.unknown, 0);
  const summed = Object.values(t).reduce((a, b) => a + b, 0);
  assert.equal(summed, mit.length,
    "the breakdown must sum to `relocations` itself — a bucket set that does not conserve is measuring a different population");
});

test("tallyInsertDepth: the key set is DERIVED from the census vocabulary, never restated here", () => {
  const t = tallyInsertDepth([]);
  assert.deepEqual(Object.keys(t).sort(), [...INSERT_DEPTHS, "unknown"].sort(),
    "every declared depth gets a key, plus the counter's third answer — a hand-copied list would stay green the day a bucket is added");
});

test("tallyInsertDepth: THREE answers — old-schema is null, an empty measured array is a real zero", () => {
  const oldSchema = [{ rebilledBytes: 17203 }, { rebilledBytes: 0 }];
  assert.equal(tallyInsertDepth(oldSchema), null,
    "rows predating the field are UNMEASURED; five zeros would report 'no deep splices' for a measure that never ran");
  const empty = tallyInsertDepth([]);
  assert.ok(empty, "an empty measured array is measured");
  assert.equal(empty.deep, 0, "and its zero is a real zero");
});

test("tallyInsertDepth: a bucket outside the declared vocabulary is COUNTED, never folded into a known one", () => {
  const t = tallyInsertDepth([row("deep"), row("catastrophic"), row("tail")]);
  assert.equal(t.unknown, 1, "an unrecognised grade is its own answer, listed with its count");
  assert.equal(t.none, 0, "and it is not quietly absorbed by a neighbour");
  assert.equal(t.deep, 1);
  assert.equal(Object.values(t).reduce((a, b) => a + b, 0), 3);
});

test("summariseFireRaw: relocationDepth rides beside relocations and conserves against it", () => {
  const parsed = { mitigation: [row("deep"), row("tail"), row("tail")] };
  const s = summariseFireRaw(parsed);
  assert.equal(s.relocations, 3, "the existing column is untouched");
  assert.equal(Object.values(s.relocationDepth).reduce((a, b) => a + b, 0), s.relocations);
  assert.equal(s.relocationDepth.deep, 1);
  assert.ok(!FIRE_CLASSES.includes("relocationDepth"),
    "it is a BREAKDOWN, not an eighth class — a class would double-count inside every sum over FIRE_CLASSES");
  assert.equal(summariseFireRaw({}).relocationDepth, null,
    "no census at all is unmeasured, exactly as `relocations` is");
});

test("reduceFireDepth: sweep-wide sum is null-preserving, and sums only the captures that measured", () => {
  assert.equal(reduceFireDepth([{ fireRaw: summariseFireRaw({}) }, { fireRaw: summariseFireRaw({}) }]), null,
    "a sweep where nothing measured depth reports null, never a set of zeros");
  const rows = [
    { fireRaw: summariseFireRaw({ mitigation: [row("deep"), row("tail")] }) },
    { fireRaw: summariseFireRaw({ mitigation: [row("tail"), row("tail"), row("shallow")] }) },
    { fireRaw: summariseFireRaw({}) }, // an old-schema capture in the same sweep
  ];
  const d = reduceFireDepth(rows);
  assert.equal(d.deep, 1);
  assert.equal(d.tail, 3);
  assert.equal(d.shallow, 1);
  assert.equal(Object.values(d).reduce((a, b) => a + b, 0), 5,
    "five measured pairs across two measuring captures — the unmeasured one contributes nothing, not zeros");
});
