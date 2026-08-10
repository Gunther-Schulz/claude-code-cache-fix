// The LINEAGE relation (`lineageOverlap` / `sameLineage`), BACKLOG's
// "READY (small) — the LINEAGE relation, as a shared primitive in
// `replay.mjs`, ahead of BOTH its consumers" entry (search BACKLOG.md for
// `lineageOverlap`).
//
// TWO relations, not a replacement. `conversationOf` (replay.mjs:1077,
// `e.inHash[0]`) answers cache identity: will these two requests hit the
// same prefix. It is exactly right for that question and is untouched here.
// It cannot answer a different question the rotation measurement raised: is
// this the same conversation as before Claude Code rebuilt its history. On
// `s-captureAT` ord 715 the target's `messages[0]` matched NONE of its
// predecessors (`conversationOf` returns a different value for every pair),
// while those same predecessors shared 97.1 / 97.3 / 97.7 / 98.1 / 98.5% of
// the target's messages by content, and an unrelated 1-message co-tenant
// sidecar shared 0%. `lineageOverlap`/`sameLineage` is that second relation.
//
// RED-FIRST: this file is written and run BEFORE `lineageOverlap` and
// `sameLineage` exist in replay.mjs. Against that unmodified module, bites 1,
// 4 and the `conversationOf` half of 5 pass (they exercise only the existing
// export); every bite calling `lineageOverlap`/`sameLineage` fails because
// the property is undefined. That split IS the red-first arrangement — see
// the dispatch report for the pasted pre-implementation run.
//
// Namespace import, deliberately, not `import { conversationOf,
// lineageOverlap, sameLineage } from …` — a static named import of a
// nonexistent export fails the whole module at LINK time (before any test
// runs), which collapses every bite into one undiscriminating red exactly
// the way the sibling bust-triage-attribution.test.mjs file's own header
// comment warns about. `import * as replay` always resolves; a missing
// export just reads as `undefined` and fails at its own call site.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as replay from "../tools/replay.mjs";
const { conversationOf, lineageOverlap, sameLineage } = replay;

// Build n hash-shaped strings sharing a prefix, so overlap counts are
// readable from the construction rather than needing to be recomputed by
// the reader.
const hashesN = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

// Fisher-Yates, deterministic seed not needed — bite 8 only needs SOME
// reordering, and assert.notDeepEqual on the raw arrays proves it actually
// shuffled rather than accidentally reproducing the input order.
const shuffled = (arr) => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = (i * 2654435761) % (i + 1); // deterministic, not random — no flaky CI
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// --- Bite 1: rotation shape, the defect expressed against conversationOf ---
// Mirrors the measured 564 -> 555 shape at a scaled-down size: index 0
// differs, length differs, ~97% of hashes survive.
const SHARED = hashesN("s", 39); // 39 hashes common to both sides
const prev = { inHash: ["OLD_HEAD", ...SHARED] }; // length 40
const now = { inHash: ["NEW_HEAD", ...SHARED.slice(0, 38)] }; // length 39, 38 shared

test("BITE 1 — conversationOf cannot pair a rotated predecessor with its target (the defect)", () => {
  assert.notEqual(conversationOf(prev), conversationOf(now));
});

test("BITE 2 — sameLineage IS true for that same rotated pair", () => {
  assert.equal(sameLineage(prev, now), true);
});

test("BITE 3 — a 1-message sidecar sharing no hashes is rejected on its own evidence", () => {
  const sidecar = { inHash: ["sidecar-only"] };
  assert.equal(lineageOverlap(sidecar, now), 0);
  assert.equal(sameLineage(sidecar, now), false);
});

test("BITE 4 — baseline/green control: conversationOf still pairs requests sharing inHash[0]", () => {
  const a = { inHash: ["X", "a1", "a2"] };
  const b = { inHash: ["X", "b1"] };
  assert.equal(conversationOf(a), conversationOf(b));
});

// Split into two tests, deliberately, rather than one test asserting both
// halves in sequence: a single test would let the lineageOverlap assertion's
// throw hide whether the conversationOf assertion below it ever ran,
// collapsing the "half passes" split the pre-implementation run is supposed
// to demonstrate into one opaque failure.
test("BITE 5 — edge, conversationOf half: empty inHash still returns null (existing behaviour, unchanged)", () => {
  const empty = { inHash: [] };
  assert.equal(conversationOf(empty), null);
});

test("BITE 5 — edge, lineage half: empty inHash on either side", () => {
  const empty = { inHash: [] };
  const nonEmpty = { inHash: ["z1", "z2"] };
  assert.equal(lineageOverlap(empty, nonEmpty), 0);
  assert.equal(lineageOverlap(nonEmpty, empty), 0);
  assert.equal(sameLineage(empty, nonEmpty), false);
});

test("BITE 6 — identical arrays overlap exactly 1", () => {
  const a = { inHash: ["i1", "i2", "i3"] };
  const b = { inHash: ["i1", "i2", "i3"] };
  assert.equal(lineageOverlap(a, b), 1);
  assert.equal(sameLineage(a, b), true);
});

// --- Bite 7: threshold boundary, exactly at and just below 0.5 ---
// Both sides length 100 so the ratio's denominator is exact and readable:
// 50/100 = 0.5 sits ON the threshold (>=, per spec); 49/100 = 0.49 sits
// just below it.
const base100 = hashesN("h", 100);
const atThreshold = { inHash: base100 };
const atHalf = { inHash: [...base100.slice(0, 50), ...hashesN("x", 50)] };
const justBelow = { inHash: [...base100.slice(0, 49), ...hashesN("y", 51)] };

test("BITE 7 — threshold boundary: exactly 0.5 is sameLineage true (>=, not >)", () => {
  assert.equal(lineageOverlap(atThreshold, atHalf), 0.5);
  assert.equal(sameLineage(atThreshold, atHalf), true);
});

test("BITE 7 — threshold boundary: just below 0.5 is sameLineage false", () => {
  assert.equal(lineageOverlap(atThreshold, justBelow), 0.49);
  assert.equal(sameLineage(atThreshold, justBelow), false);
});

// --- Bite 8: order insensitivity ---
test("BITE 8 — shuffling one side's inHash does not change lineageOverlap", () => {
  const reordered = { inHash: shuffled(now.inHash) };
  assert.notDeepEqual(reordered.inHash, now.inHash); // prove the shuffle actually moved something
  assert.equal(lineageOverlap(prev, now), lineageOverlap(prev, reordered));
});
