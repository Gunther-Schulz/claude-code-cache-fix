// BACKLOG "bust-triage attribution blind to stability exemptions" —
// `bust-triage` prints `ATTRIBUTION: CC's` on a pair our OWN extension
// exempted. Its attribution basis was "the replayed census recorded no
// stability violation for this pair"; stability EXEMPTIONS are excluded from
// `violations` by construction (replay.mjs's `scanGroup` routes an exempted
// divergence into a SEPARATE `exemptions` array, never into `violations`),
// so every exempted pair satisfied that test — including the 2026-08-18
// 448k bust, exempted as `deferred-tool-rewrite:reset-wipes-additions`
// because OUR OWN extension moved the bytes, and misattributed to CC's
// while reading clean doing it.
//
// The frozen shape this test is built from (machine-local, not committed —
// docs/runbooks/bust-appears.md step 5's own worked example is the same
// exemption class):
//   n=505->508 inDiv=644 outDiv=379 <- deferred-tool-rewrite:reset-wipes-additions (tool-schema-changed)
// This file pins a SYNTHETIC census fixture carrying that shape rather than
// any machine-local path or session id.
//
// RED, before this change: `attributionFromCensus` does not exist as an
// export (bust-triage.mjs's costly path was a single inline lookup against
// `rv.violations` alone, with no exemptions read at all — `grep -n
// exemptions tools/bust-triage.mjs` returns zero hits against the two
// `exemptions:` sites in replay.mjs's own `--json` output). Every test below
// fails at import time against that state, which is the discriminating red:
// the two-arm pair further down is what proves the fix actually reads the
// exemptions array rather than just always answering OURS.

import { test } from "node:test";
import assert from "node:assert/strict";

import { attributionFromCensus, attributionFromExemption, attributionFromRow } from "../tools/bust-triage.mjs";
import { attributionOf } from "../tools/replay.mjs";

const pair = (afterOrd, beforeOrd) => ({ after: { ord: afterOrd }, before: { ord: beforeOrd } });

// --- attributionFromExemption: the row-level verdict for one exemption ---

test("BITE — an exemption naming one of our extensions is OURS, with the exemption named in the reason", () => {
  const r = attributionFromExemption({
    n: 508, prevN: 505, inDiv: 644, outDiv: 379, ccIdenticalAtOutDiv: true,
    exemptReason: "deferred-tool-rewrite:reset-wipes-additions",
    exemptBasis: { type: "tool-schema-changed", removedInjections: 1, residualOutDiv: null },
  });
  assert.equal(r.verdict, "OURS");
  assert.match(r.reason, /deferred-tool-rewrite:reset-wipes-additions/,
    "the reason must name WHICH exemption fired, not just assert OURS");
  assert.match(r.reason, /EXEMPTION/);
});

test("BITE — the other two declared exemption reasons are OURS too, same as the row-level check", () => {
  for (const exemptReason of [
    "fresh-session-sort:first-appearance-relocation",
    "fresh-session-sort:memory-stranded-by-key-rotation",
  ]) {
    const r = attributionFromExemption({
      n: 12, prevN: 11, inDiv: 5, outDiv: 2, ccIdenticalAtOutDiv: true,
      exemptReason, exemptBasis: { type: "probe" },
    });
    assert.equal(r.verdict, "OURS", exemptReason);
    assert.match(r.reason, new RegExp(exemptReason.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("BITE — an exemption row that contradicts attributionOf's own emission guard is COULD-NOT-ATTRIBUTE, never OURS by default", () => {
  // Same invariant `attributionFromRow` already enforces for violation rows
  // (bust-triage-attribution.test.mjs) — an exemption row is built from the
  // identical `record` shape in replay.mjs's scanGroup, so the guard must
  // hold here too, and a broken premise must not resolve into a verdict.
  const r = attributionFromExemption({
    n: 12, prevN: 11, inDiv: 1, outDiv: 3, ccIdenticalAtOutDiv: false,
    exemptReason: "deferred-tool-rewrite:reset-wipes-additions", exemptBasis: { type: "tool-schema-changed" },
  });
  assert.equal(r.verdict, "COULD-NOT-ATTRIBUTE");
  assert.match(r.reason, /contradicts its own/);
});

// --- attributionFromCensus: the two-arm discriminating pair ---
//
// Both arms are required, or the change is unproven (dispatcher brief): a
// census carrying an exemption naming one of our extensions must NOT yield a
// bare CC's, and a census with no exemption at all must still yield exactly
// what it yielded before this change.

test("BITE — a census whose ONLY record for this pair is an exemption must not yield a bare CC's (the 2026-08-18 448k shape)", () => {
  const rv = {
    violations: [],
    exemptions: [{
      n: 508, prevN: 505, inDiv: 644, outDiv: 379, ccIdenticalAtOutDiv: true,
      exemptReason: "deferred-tool-rewrite:reset-wipes-additions",
      exemptBasis: { type: "tool-schema-changed", removedInjections: 1, residualOutDiv: null },
    }],
  };
  const r = attributionFromCensus(rv, pair(508, 505), 644);
  assert.equal(r.verdict, "OURS", `must not misattribute the exempted pair to CC's: ${r.reason}`);
  assert.doesNotMatch(r.verdict, /CC's/);
  assert.match(r.reason, /deferred-tool-rewrite:reset-wipes-additions/);
});

test("BITE — REGRESSION PIN: a census with no violation AND no exemption for this pair still yields CC's, unchanged", () => {
  const rv = { violations: [], exemptions: [] };
  const r = attributionFromCensus(rv, pair(9, 8), 3);
  assert.equal(r.verdict, "CC's");
  assert.match(r.reason, /no stability violation for this pair/,
    "the pre-existing CC's reason text is a contract other tests already assert on — must not change");
});

test("BITE — an exemption present in the census but for a DIFFERENT pair does not leak into this one's CC's verdict", () => {
  const rv = {
    violations: [],
    exemptions: [{
      n: 999, prevN: 998, inDiv: 1, outDiv: 0, ccIdenticalAtOutDiv: true,
      exemptReason: "deferred-tool-rewrite:reset-wipes-additions", exemptBasis: { type: "tool-schema-changed" },
    }],
  };
  const r = attributionFromCensus(rv, pair(9, 8), 3);
  assert.equal(r.verdict, "CC's", "an exemption on an unrelated pair must not change this pair's verdict");
});

test("BITE — a real violation row still wins OURS exactly as before, unaffected by the exemptions read", () => {
  const rv = {
    violations: [{ n: 9, prevN: 8, inDiv: 3, outDiv: 1, ccIdenticalAtOutDiv: true }],
    exemptions: [],
  };
  const r = attributionFromCensus(rv, pair(9, 8), 3);
  assert.equal(r.verdict, "OURS");
  assert.match(r.reason, /outDiv=1/);
});

// --- structural: attributionFromExemption re-checks the same invariant attributionFromRow does ---

test("BITE — attributionFromExemption's OURS-vs-guard-break split matches attributionOf directly (the invariant, re-derived)", () => {
  const oursRow = { inDiv: 3, outDiv: 1 };
  const breakRow = { inDiv: 1, outDiv: 3 };
  assert.equal(attributionOf(oursRow.inDiv, oursRow.outDiv), true);
  assert.equal(attributionOf(breakRow.inDiv, breakRow.outDiv), false);
  assert.equal(
    attributionFromExemption({ ...oursRow, ccIdenticalAtOutDiv: true, exemptReason: "deferred-tool-rewrite:reset-wipes-additions", exemptBasis: {} }).verdict,
    "OURS");
  assert.equal(
    attributionFromExemption({ ...breakRow, ccIdenticalAtOutDiv: true, exemptReason: "deferred-tool-rewrite:reset-wipes-additions", exemptBasis: {} }).verdict,
    "COULD-NOT-ATTRIBUTE");
  // And attributionFromRow/attributionFromExemption agree on the guard-break
  // shape — same invariant, same producer, same failure text root.
  assert.equal(
    attributionFromRow(breakRow).verdict,
    attributionFromExemption({ ...breakRow, ccIdenticalAtOutDiv: true, exemptReason: "x:y", exemptBasis: {} }).verdict);
});
