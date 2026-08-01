// dup-census gap 2 (BACKLOG "wire `duplicates` into the daily gate"): the
// census's `duplicates` key (reminder-migration-census.mjs summariseDuplicates,
// commit 4185fb4) rides on every sweep already, but summariseCensus whitelisted
// pairs/unreadable/tally/extendedSub/prunes and silently dropped it — so the
// daily status file never carried pairs/streaks/billed/doubleBilled, and
// doubleBilledStreaks (the CC#78420 alarm column) had no sweep-level home.
//
// Two BITEs, both on the same defect: the per-capture drop (summariseCensus)
// and the sweep-level rollup that never existed to drop anything (no
// reduceByteGate export at all pre-change — importing it threw).

import { test } from "node:test";
import assert from "node:assert/strict";

import { summariseCensus, reduceByteGate } from "../tools/gate-live.mjs";

const json = (o) => ({ code: 0, out: JSON.stringify(o), err: "" });

const censusJson = (o) => json({
  tally: { EXACT: 0, EXTENDED: 0, DROPPED: 0, MISMATCH: 0 },
  extendedSub: { "MERGED-STANDALONE": 0, "NEW-TEXT": 0 },
  prunes: { pure: 0, interior: 0, unanchored: 0 },
  pairs: 10, considered: 1, unreadable: [], ...o,
});

const dupFixture = (over = {}) => ({
  pairs: 71, streaks: 67, maxStreak: 4, requests: 138,
  billedRequests: 61, billedStreaks: 32, doubleBilledStreaks: 29,
  membersWithoutId: 0, ...over,
});

test("BITE — summariseCensus carries the duplicates key through, not dropped", () => {
  const g = summariseCensus(censusJson({ duplicates: dupFixture() }));
  assert.ok(g.duplicates, "duplicates must survive summariseCensus");
  assert.equal(g.duplicates.doubleBilledStreaks, 29, "the alarm column");
  assert.equal(g.duplicates.streaks, 67);
  assert.equal(g.duplicates.billedStreaks, 32);
  assert.equal(g.duplicates.pairs, 71);
});

test("BITE — reduceByteGate sums duplicates across the sweep, maxStreak takes the max", () => {
  const rowA = { byteGate: summariseCensus(censusJson({ duplicates: dupFixture({ streaks: 10, maxStreak: 4, doubleBilledStreaks: 3 }) })) };
  const rowB = { byteGate: summariseCensus(censusJson({ duplicates: dupFixture({ streaks: 5, maxStreak: 7, doubleBilledStreaks: 2 }) })) };
  const totals = reduceByteGate([rowA, rowB]);
  assert.equal(totals.duplicates.streaks, 15, "additive across captures");
  assert.equal(totals.duplicates.maxStreak, 7, "the longest run SEEN, not a sum of per-capture maxima");
  assert.equal(totals.duplicates.doubleBilledStreaks, 5, "the alarm column, summed");
});

test("a row with no duplicates key at all is unchanged — backward compatible with older byte-gate output", () => {
  const g = summariseCensus(censusJson({}));
  const totals = reduceByteGate([{ byteGate: g }]);
  assert.equal(totals.duplicates.streaks, 0);
  assert.equal(totals.duplicates.doubleBilledStreaks, 0);
});

test("a row with no byte-gate at all does not crash reduceByteGate", () => {
  const totals = reduceByteGate([{}, { byteGate: null }]);
  assert.equal(totals.duplicates.doubleBilledStreaks, 0);
  assert.equal(totals.errors, 0);
});
