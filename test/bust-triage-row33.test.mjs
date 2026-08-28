// BACKLOG "mint the matrix row this walk's terminal state requires" — the
// 2026-08-10T04:40:39Z 213k append-only event reached UNCLASSIFIED, which is
// the matrix's own stop-and-mint signal: an event mapping to no row is an
// alarm, not something to explain away. Row 33 (APPEND-ONLY CACHE COLLAPSE)
// is the mint; this pins that it reads correctly.
//
// GAP, surfaced rather than bridged: the entry's verifier also asks that
// `bust-triage --at 2026-08-10T04:40:50Z` NAME the new row instead of
// UNCLASSIFIED. Run live at the desk (session 9110a7b6, ~2 GB capture):
// `census append-only`, but the pair selected is n=97->99 (a SONNET subagent
// transition four minutes later) — the same model-blind pairing-selection
// defect the parked walk entry names as finding (a) ("bust-triage selected
// the pair n=97->99 — SONNET subagent traffic — while the busting request
// was FABLE... blind to model"). The transcript carries no cache_miss_reason
// for 213429 either, so neither axis `causeToRow` reads has anything to key
// on for the REAL pair even once selected. Reaching row 33 from the CLI
// needs that pairing fix, which is a separate, still-open BACKLOG item and
// outside this entry's doc-only write boundary — this file therefore proves
// only what a doc-only change can prove: the row exists and reads correctly.

import { test } from "node:test";
import assert from "node:assert/strict";

import { matrixRow, statusVerdict } from "../tools/bust-triage.mjs";

test("BITE — matrix row 33 (APPEND-ONLY CACHE COLLAPSE) is readable", () => {
  const row = matrixRow(33);
  assert.ok(row, "row 33 must be readable at all");
  assert.equal(row.n, 33);
  assert.match(row.status, /^\*\*OBSERVED, CAUSE NOT ISOLATED\*\*/);
});

test("BITE — row 33's status reaches a real verdict, never STATUS-UNREADABLE", () => {
  const row = matrixRow(33);
  assert.equal(row.kind, "OBSERVED");
  assert.equal(statusVerdict(row.status), "KNOWN-OPEN");
  assert.notEqual(statusVerdict(row.status), "STATUS-UNREADABLE");
});

// CONTROL — minting row 33 must not disturb the neighbouring rows.
test("CONTROL — row 29 is unchanged by the new row 33", () => {
  const row = matrixRow(29);
  assert.ok(row);
  assert.equal(row.n, 29);
  assert.match(row.status, /^\*\*OPEN — MEASURED 2026-08-08/);
});
