// The verdict vocabulary must have a value for CONTROLLED-CAUSE, so a row
// whose honest status IS a controlled cause can say so.
//
// The incident, 2026-08-06, minting matrix row 27 (IDLE-GAP TTL EXPIRY):
// `statusKind("CONTROLLED-CAUSE …")` returned null, so the row read
// STATUS-UNREADABLE — a documented stop-here — on a row that needs no
// stopping. It was worked around by leading the cell with `ACCEPT` (row 21's
// precedent), which makes a controlled cause read as an open one on every
// future walk. Operator decision 2026-08-06: add the fifth verdict value.
//
// WHERE THE EXPECTATIONS COME FROM — not from this tool's table, which is the
// artifact under test. `docs/runbooks/bust-appears.md` ("Terminal states")
// defines CONTROLLED-CAUSE as its own terminal disposition, alongside
// MITIGATED; and it defines MITIGATED as "a shipped extension absorbs the
// class, demonstrated on this instance". A controlled cause has no shipped
// extension by construction and is not open work either, so neither existing
// value is true of it: the enum, not the row's wording, was the short thing.
//
// NAME COLLISION, carried deliberately rather than resolved by renaming:
// `bust-triage` already has `CONTROLLED = new Set(["cost","resume"])`, which
// classifies LEDGER EVENTS by their `k` — "a cost the operator caused". A row
// STATUS of CONTROLLED-CAUSE is the other axis: the CLASS has no mitigation.
// Row 27 fires on an event the ledger classified `bust`, so the two axes are
// independent and both words stay.
//
// RED-FIRST ARRANGEMENT (the strong form): these expectations were run
// against the OLD implementation — the tool with no CONTROLLED entry in
// STATUS_RULES/VERDICT_BY_KIND and matrix row 27 still leading with
// `ACCEPT` — and the three BITEs below failed there. Recorded output:
//   statusKind("CONTROLLED-CAUSE — no mitigation exists.") === null
//   statusVerdict(...) === "STATUS-UNREADABLE"
//   matrixRow(27).kind === "ACCEPTED"

import { test } from "node:test";
import assert from "node:assert/strict";

import { statusKind, statusVerdict, matrixRow, VERDICT_BY_KIND }
  from "../tools/bust-triage.mjs";

// The real cell's leading text, 2026-08-07, after the flip.
const ROW27 = "**CONTROLLED-CAUSE — no mitigation exists.**";

test("BITE — a CONTROLLED-CAUSE status is a state this tool knows", () => {
  assert.equal(statusKind(ROW27), "CONTROLLED",
    "the fifth state must be in the vocabulary, not fall through to null");
  assert.equal(statusVerdict(ROW27), "CONTROLLED-CAUSE",
    "and it must reach the reader as its own verdict");
  assert.notEqual(statusVerdict(ROW27), "STATUS-UNREADABLE",
    "a row that needs no stopping must not stop the reader");
  assert.notEqual(statusVerdict(ROW27), "KNOWN-OPEN",
    "a controlled cause is a terminal disposition, not open work");
});

// The bare token, without the -CAUSE suffix, is accepted too: the regex the
// entry specifies is `^CONTROLLED(?:-CAUSE)?\b`, so a future cell writing
// only CONTROLLED reads the same rather than stopping the reader.
test("BITE — the bare CONTROLLED token reads the same as CONTROLLED-CAUSE", () => {
  assert.equal(statusKind("CONTROLLED (operator was away)"), "CONTROLLED");
  assert.equal(statusVerdict("CONTROLLED (operator was away)"), "CONTROLLED-CAUSE");
});

// THE motivating row, read off the LIVE matrix — the half that makes the enum
// change more than a table edit. Row 27's cell was written as ACCEPT solely to
// stay readable; the entry's hard ordering constraint is that the cell flips in
// the same commit as the enum.
test("BITE — live matrix row 27 states its real disposition and reads as one", () => {
  const row = matrixRow(27);
  assert.ok(row, "row 27 must be readable at all");
  assert.match(row.status.replace(/^[\s*_]+/, ""), /^CONTROLLED(-CAUSE)?\b/,
    `row 27 must lead with its real state, not with the ACCEPT workaround: ${row.status.slice(0, 80)}`);
  assert.equal(row.kind, "CONTROLLED");
  assert.equal(statusVerdict(row.status), "CONTROLLED-CAUSE");
  assert.equal(row.open, false, "a controlled cause is not the OPEN state");
});

// CONTROL — the widening may not perturb any existing mapping. The nine kinds
// and their verdicts are quoted from the pre-change table; a change to any of
// them is a different change than this one.
test("CONTROL — the nine existing kinds map exactly as they did", () => {
  const before = {
    OPEN: "KNOWN-OPEN",
    MITIGATED: "MITIGATED",
    ACCEPTED: "KNOWN-OPEN",
    PARTIAL: "KNOWN-OPEN",
    OBSERVED: "KNOWN-OPEN",
    BUILT: "KNOWN-OPEN",
    DOCUMENTED: "KNOWN-OPEN",
    COVERED: "KNOWN-OPEN",
    "NOT-APPLICABLE": "KNOWN-OPEN",
  };
  for (const [kind, verdict] of Object.entries(before)) {
    assert.equal(VERDICT_BY_KIND[kind], verdict, `mapping for ${kind} changed`);
  }
  assert.equal(Object.keys(VERDICT_BY_KIND).length, 10,
    "exactly one value was added; anything else is a different change");
});

// CONTROL — the status tokens the nine kinds are recognised by, still read
// through `statusKind` rather than through the table above, because a rule
// added at the head of STATUS_RULES could shadow one of them.
test("CONTROL — every existing status token still resolves to its own kind", () => {
  const cells = {
    "**OPEN — RE-OPENED 2026-07-31**": "OPEN",
    "**MITIGATED 2026-08-05 (per-conversation relocation mem": "MITIGATED",
    "CLOSED (sort-stabilization, tool-input-normalize) — kee": "MITIGATED",
    "ACCEPT, DO NOT ATTRIBUTE: no local attribution is poss": "ACCEPTED",
    "ACCEPTED-honest-bust (operator practice: /rc from se": "ACCEPTED",
    "PARTIAL: fingerprint-strip + identity-normalization + c": "PARTIAL",
    "**OBSERVED, CAUSE NOT ISOLATED** (2026-07-27 12:47:56, ": "OBSERVED",
    "**BUILT — `deferred-tool-rewrite.mjs`, gate `CACHE_FIX_": "BUILT",
    "DOCUMENTED (rule). tools=DIFFER": "DOCUMENTED",
    "COVERED operator-side (correction 2026-07-27: an operat": "COVERED",
    "N/A note only": "NOT-APPLICABLE",
  };
  for (const [cell, kind] of Object.entries(cells)) {
    assert.equal(statusKind(cell), kind, `status token re-mapped: ${cell.slice(0, 50)}`);
  }
});

// CONTROL — the mandatory unmatched case is the property the whole enum was
// rebuilt for on 2026-08-06, and a widening is exactly what could dissolve it.
test("CONTROL — a status in no known state is still STATUS-UNREADABLE", () => {
  for (const junk of ["", "   ", "TBD", "somebody's prose", "**FROBNICATED 2027-01-01**",
                      "UNCONTROLLED", "CONTROLLING the flow"]) {
    assert.equal(statusKind(junk), null, `unexpectedly matched: ${JSON.stringify(junk)}`);
    assert.equal(statusVerdict(junk), "STATUS-UNREADABLE");
  }
});
