// findAbsorptionMisses — the check that would have caught the 2026-08-05
// 349k bust, which replayed EXIT 0 on all five gates with every verdict
// correct.
//
// The bite targets the two ways this check was wrong when first written,
// because both produced a SILENT miss — the function ran, returned rows, and
// simply did not include the one that mattered. A test asserting only "it
// finds something" would have passed against both bugs.

import { test } from "node:test";
import assert from "node:assert/strict";

import { findAbsorptionMisses } from "../tools/replay.mjs";

// Entries in the compact shape findAbsorptionMisses consumes. `inHash[0]` is
// the conversation identity, so both entries must share it to be paired.
const CONV = "conv0";
const entry = ({ n, inHash, outHash, joinMoves, movedFresh = 0, action = "normalized" }) => ({
  n, ts: `2026-08-05T00:00:0${n}.000Z`, key: "k",
  inHash, outHash,
  action,
  stats: {
    movedFresh,
    suppressions: joinMoves.map((index) => ({ index, kind: "join-move", hash: "h" })),
  },
});

// prev already had a join-move at 2; cur re-fires it AND freshly absorbs at 7.
// The forwarded pair diverges at 6 — inside the fresh absorption, before it.
const REFIRE_SHAPE = () => {
  const inPrev  = [CONV, "a", "b", "c", "d", "e", "f", "g", "h"];
  const inCur   = [CONV, "a", "b", "c", "d", "e", "f", "G", "h"]; // CC diverges at 7
  const outPrev = [CONV, "a", "b", "c", "d", "e", "f", "g", "h"];
  const outCur  = [CONV, "a", "b", "c", "d", "e", "X", "g", "h"]; // ours at 6
  return [
    entry({ n: 1, inHash: inPrev, outHash: outPrev, joinMoves: [2] }),
    entry({ n: 2, inHash: inCur, outHash: outCur, joinMoves: [2, 7], movedFresh: 1, action: "reset" }),
  ];
};

test("a re-fired absorption does not mask a fresh one — the measured bust shape", () => {
  // THE FIRST BUG. `suppressions` does not distinguish a fresh recognition
  // from a re-fire. Taking the list at face value and comparing the divergence
  // against its LOWEST index compares against something absorbed a request
  // earlier — on the real capture the re-fires sat at 180/221 and the fresh
  // ones at 370/402, so the row for the busting request was silently dropped.
  const rows = findAbsorptionMisses(REFIRE_SHAPE());
  assert.equal(rows.length, 1, "the fresh absorption at 7 must be reported");
  assert.deepEqual(rows[0].absorbedFreshAt, [7],
    "only the FRESH index — 2 was already being substituted before this request");
  assert.equal(rows[0].forwardedDivergence, 6);
});

test("the row says whose defect it is, from the two divergence indices", () => {
  const [row] = findAbsorptionMisses(REFIRE_SHAPE());
  assert.equal(row.inputDivergence, 7, "CC's own arrays first differ at 7");
  assert.equal(row.ours, true,
    "we diverged at 6 while CC's input was identical there — ours by construction");
});

test("an ordinary tail append after an absorption is NOT a miss", () => {
  // The control that keeps this from firing on every request: a divergence
  // PAST the absorbed region is the conversation growing, not a failed
  // absorption. Without it the check would report constantly and train its
  // reader to ignore it — this repo's own recurring defect.
  const inPrev  = [CONV, "a", "b", "c"];
  const inCur   = [CONV, "a", "b", "c", "new"];
  const outPrev = [CONV, "a", "b", "c"];
  const outCur  = [CONV, "a", "b", "c", "new"];
  const rows = findAbsorptionMisses([
    entry({ n: 1, inHash: inPrev, outHash: outPrev, joinMoves: [] }),
    entry({ n: 2, inHash: inCur, outHash: outCur, joinMoves: [1], movedFresh: 1 }),
  ]);
  assert.deepEqual(rows, [], "the absorbed slot held; the array merely grew");
});

test("an absorption whose prefix survives byte-identically reports nothing", () => {
  const same = [CONV, "a", "b", "c"];
  const rows = findAbsorptionMisses([
    entry({ n: 1, inHash: same, outHash: same, joinMoves: [] }),
    entry({ n: 2, inHash: same, outHash: same, joinMoves: [2], movedFresh: 1 }),
  ]);
  assert.deepEqual(rows, [], "identical forwarded arrays are the success case");
});

test("the row carries prevN — which predecessor the divergence was measured against", () => {
  // The row already names WHERE the divergence was measured (n) but not
  // against WHICH predecessor, and every consumer has to re-derive it.
  // findEditPositions already carries prevN for the same reason.
  const [row] = findAbsorptionMisses(REFIRE_SHAPE());
  assert.equal(row.prevN, 1, "cur is n:2, its predecessor in the group is n:1");
});

test("no fresh absorption means no row, however badly the prefix diverged", () => {
  // Scope discipline: this check answers "did an absorption that RAN also
  // ABSORB". A divergence with no absorption claimed is some other check's
  // question, and answering it here would blur what a row means.
  const inPrev  = [CONV, "a", "b", "c"];
  const inCur   = [CONV, "Z", "b", "c"];
  const rows = findAbsorptionMisses([
    entry({ n: 1, inHash: inPrev, outHash: inPrev, joinMoves: [2] }),
    entry({ n: 2, inHash: inCur, outHash: inCur, joinMoves: [2], movedFresh: 0 }),
  ]);
  assert.deepEqual(rows, [], "re-fire only, no fresh recognition — not this check's row");
});
