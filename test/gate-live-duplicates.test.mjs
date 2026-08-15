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
//
// THE SAME DEFECT RECURRED ONE LEVEL DOWN, 2026-08-15, and this file's own
// `dupFixture` above carried it too. Both rollups ENUMERATED the duplicate
// field names by hand beside the summariser they mirror. `summariseDuplicates`
// then gained `coalescedRequests`/`coalescedStreaks` — its own comment calls
// them "the MITIGATION's own number, and they are why row 31's record exists"
// — and both reducers dropped them, byte-identically to health: the per-capture
// rows of the 2026-08-15 sweep carry 3 coalesced requests over 3 streaks, and
// the `byteGate.duplicates` rollup a human reads carries neither key. That is
// the restated-basis shape the corpus names: an assertion whose comparison
// basis is copied from the source it grades cannot age loudly. So the field set
// is DERIVED from the source now — `summariseDuplicates(newDuplicateScan())`
// asks the running summariser what it emits — and the bites below assert the
// derivation rather than a second copy of the list.
//
// Namespace import deliberately (docs/dev-loop.md, "the commonest way to
// collapse the split is the import line"): a static named import of a
// not-yet-written export fails the whole module at ESM link time and every
// bite goes red at once, which proves nothing about which half broke.

import { test } from "node:test";
import assert from "node:assert/strict";

import * as gate from "../tools/gate-live.mjs";
import {
  summariseDuplicates, newDuplicateScan,
} from "../tools/reminder-migration-census.mjs";

const { summariseCensus, reduceByteGate, reduceCensusRowEvidence, describeDuplicates } = gate;

const json = (o) => ({ code: 0, out: JSON.stringify(o), err: "" });

const censusJson = (o) => json({
  tally: { EXACT: 0, EXTENDED: 0, DROPPED: 0, MISMATCH: 0 },
  extendedSub: { "MERGED-STANDALONE": 0, "NEW-TEXT": 0 },
  prunes: { pure: 0, interior: 0, unanchored: 0 },
  pairs: 10, considered: 1, unreadable: [], ...o,
});

// The fixture's BASE is the summariser's own zero shape, not a hand-copied
// list — the same derivation the code under test now uses. A field the census
// gains appears here as 0 automatically, so a fixture can never be narrower
// than the source it stands in for.
const dupFixture = (over = {}) => ({
  ...summariseDuplicates(newDuplicateScan()),
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

// --- the derived-basis bites (2026-08-15) ---

// The REAL positive, not a planted one: the census emits these two fields
// today and the hand-listed reducer dropped both. Numbers taken from the
// 2026-08-15 sweep's own per-capture rows (3 coalesced requests over 3
// streaks, corpus-wide), so this bite is anchored to a measured live shape
// rather than to an invented one.
test("BITE — the MITIGATION's own columns reach the sweep rollup (row 31's done-criterion is unreadable without them)", () => {
  const rows = [
    { byteGate: summariseCensus(censusJson({ duplicates: dupFixture({ coalescedRequests: 1, coalescedStreaks: 1 }) })) },
    { byteGate: summariseCensus(censusJson({ duplicates: dupFixture({ coalescedRequests: 2, coalescedStreaks: 2 }) })) },
  ];
  const totals = reduceByteGate(rows);
  assert.equal(totals.duplicates.coalescedRequests, 3, "sends the proxy served from another request's in-flight answer");
  assert.equal(totals.duplicates.coalescedStreaks, 3, "streaks in which the mitigation fired");
});

test("BITE — reduceCensusRowEvidence carries them too; the second reducer had the same hand-listed drop", () => {
  const reduced = reduceCensusRowEvidence([
    { duplicates: dupFixture({ coalescedRequests: 1, coalescedStreaks: 1 }), mismatchRows: [], duplicateStreaks: [], volatileEntries: [] },
    { duplicates: dupFixture({ coalescedRequests: 2, coalescedStreaks: 2 }), mismatchRows: [], duplicateStreaks: [], volatileEntries: [] },
  ]);
  assert.equal(reduced.duplicates.coalescedRequests, 3);
  assert.equal(reduced.duplicates.coalescedStreaks, 3);
});

// The derivation itself, which is what keeps the class closed rather than
// closing this instance: the reducer's key set is asked of the running
// summariser. A field the census gains tomorrow fails HERE, at the moment it
// is added, instead of being dropped silently for four days.
test("BITE — every field the census's own summariser emits survives the rollup (derived, not restated)", () => {
  const source = summariseDuplicates(newDuplicateScan());
  const sourceKeys = Object.keys(source).sort();
  assert.ok(sourceKeys.length > 0, "instrument positive: the summariser emits fields at all");
  const rollup = reduceByteGate([
    { byteGate: summariseCensus(censusJson({ duplicates: dupFixture() })) },
  ]).duplicates;
  const missing = sourceKeys.filter((k) => !(k in rollup));
  assert.deepEqual(missing, [], `the rollup drops census duplicate field(s): ${missing.join(", ")}`);
  const evidence = reduceCensusRowEvidence([
    { duplicates: dupFixture(), mismatchRows: [], duplicateStreaks: [], volatileEntries: [] },
  ]).duplicates;
  const missingEvidence = sourceKeys.filter((k) => !(k in evidence));
  assert.deepEqual(missingEvidence, [], `census-rows drops census duplicate field(s): ${missingEvidence.join(", ")}`);
});

// The planted arm, and it answers a different question from the one above: the
// derived arm proves the reducer covers what the census emits TODAY, this one
// proves the mechanism is a derivation rather than a longer list — a field no
// module has ever heard of still arrives.
test("BITE — a duplicate field neither module knows is carried through, not dropped", () => {
  const totals = reduceByteGate([
    { byteGate: summariseCensus(censusJson({ duplicates: dupFixture({ futureCounter: 5 }) })) },
    { byteGate: summariseCensus(censusJson({ duplicates: dupFixture({ futureCounter: 2 }) })) },
  ]);
  assert.equal(totals.duplicates.futureCounter, 7, "an unknown numeric duplicate field sums like every other");
});

// Negative control for the generic reducer: summing everything would be the
// obvious wrong way to derive the field set, and it is invisible in every
// bite above because maxStreak happens to be the only MAX field.
test("the generic reducer does not sum the one MAX field, and ignores non-numeric values", () => {
  const totals = reduceByteGate([
    { byteGate: summariseCensus(censusJson({ duplicates: dupFixture({ maxStreak: 4, note: "not a count" }) })) },
    { byteGate: summariseCensus(censusJson({ duplicates: dupFixture({ maxStreak: 7, note: "not a count" }) })) },
  ]);
  assert.equal(totals.duplicates.maxStreak, 7, "MAX, never a sum");
  assert.equal(totals.duplicates.note, undefined, "a non-numeric field is not accumulated into a number");
});

// The 2026-08-11 correction this repo already paid for once, applied here
// before it costs the same again: "the computation runs unconditionally" and
// "a human reading the report sees it" are different claims. The sweep's
// stdout summary printed tally and prunes and never a duplicate number, so
// row 31's two-sided criterion was unreadable from the run a human is told to
// read. The line prints unconditionally, zeros included.
test("BITE — the sweep's human-readable summary carries the duplicate line, zeros included", () => {
  assert.equal(typeof describeDuplicates, "function", "the summary line is an extracted, testable seam");
  const zero = describeDuplicates(summariseDuplicates(newDuplicateScan()));
  assert.match(zero, /0 double-billed/, "a zero is printed, not omitted");
  assert.match(zero, /coalesced/, "the mitigation's own number is in the line a human reads");
  const live = describeDuplicates({
    ...summariseDuplicates(newDuplicateScan()),
    streaks: 108, requests: 243, billedStreaks: 76, doubleBilledStreaks: 52,
    coalescedRequests: 3, coalescedStreaks: 3, maxStreak: 11,
  });
  assert.match(live, /52 double-billed/);
  assert.match(live, /3 coalesced request/);
});

test("describeDuplicates says COULD NOT VERIFY rather than printing zeros it never measured", () => {
  assert.match(describeDuplicates(null), /COULD NOT VERIFY|not run/i,
    "an absent rollup is the third answer, never a row of zeros");
});

// --- the class split reaching the sweep (2026-08-15) ---

// The payoff of the derivation, demonstrated rather than argued: the census
// gained six class-split fields AFTER the reducers were rewritten, and no edit
// to a reducer was needed for them to arrive. This bite is what would have
// failed had the fields been hand-listed again.
test("BITE — the census's class split reaches the rollup with no reducer edit", () => {
  const rows = [
    { byteGate: summariseCensus(censusJson({ duplicates: dupFixture({ singleMessageStreaks: 2, singleMessageDoubleBilled: 1, multiMessageStreaks: 3, multiMessageDoubleBilled: 2 }) })) },
    { byteGate: summariseCensus(censusJson({ duplicates: dupFixture({ singleMessageStreaks: 1, singleMessageDoubleBilled: 0, multiMessageStreaks: 1, multiMessageDoubleBilled: 1 }) })) },
  ];
  const totals = reduceByteGate(rows).duplicates;
  assert.equal(totals.singleMessageStreaks, 3);
  assert.equal(totals.singleMessageDoubleBilled, 1, "the half row 31 must drive to zero");
  assert.equal(totals.multiMessageStreaks, 4);
  assert.equal(totals.multiMessageDoubleBilled, 3, "the half that must NOT move");
});

test("BITE — the sweep line prints row 31's two-sided read, and says so when the rollup predates it", () => {
  const withSplit = describeDuplicates({
    ...summariseDuplicates(newDuplicateScan()),
    singleMessageStreaks: 2, singleMessageDoubleBilled: 0, singleMessageCoalesced: 2,
    multiMessageStreaks: 5, multiMessageDoubleBilled: 4,
  });
  assert.match(withSplit, /by class \(row 31\)/);
  assert.match(withSplit, /1msg 2 streak\(s\) \/ 0 double-billed \/ 2 coalesced/);
  assert.match(withSplit, /n-msg 5 \/ 4 double-billed/);
  // The two arms must DIFFER: a rollup written before the split carries no
  // class keys, and printing 0/0 there would be an unmeasured zero wearing a
  // measurement's clothes.
  const preSplit = describeDuplicates({
    pairs: 1, streaks: 1, maxStreak: 2, requests: 2,
    billedRequests: 0, billedStreaks: 0, doubleBilledStreaks: 0,
    coalescedRequests: 0, coalescedStreaks: 0, membersWithoutId: 0,
  });
  assert.match(preSplit, /by class \(row 31\): COULD NOT VERIFY/);
  assert.doesNotMatch(preSplit, /1msg 0/, "no zeros invented for a split that had not shipped");
});
