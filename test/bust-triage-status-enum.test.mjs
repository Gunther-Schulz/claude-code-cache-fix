// bust-triage's verdict must not collapse a seven-state status vocabulary
// onto two values, with the reassuring one as the default.
//
// The incident, measured 2026-08-06: `--at 2026-08-06T09:59:58Z` returned
// **MITIGATED** for a bust citing row 6, whose status reads literally
// "OBSERVED, CAUSE NOT ISOLATED" — a class nobody has mitigated. Cause: the
// status was tested by `/\bOPEN\b|RE-OPENED/` and the verdict was
// `open ? "KNOWN-OPEN" : "MITIGATED"`, so every status that is neither word
// landed on MITIGATED — 17 of 26 rows did, and 8 of them wrongly. `dossier`
// on the same stamp said "no row matches — UNCLASSIFIED" and was right; the
// tool a reader acts on was the one that was wrong.
//
// The expectations below come from the MATRIX's definition of its own states
// (docs/directives/robustness-threat-matrix.md), not from the parser: a row
// that says BUILT, PARTIAL, OBSERVED, DOCUMENTED, COVERED or N/A has not
// said MITIGATED, and a status in no state at all is the THIRD answer
// (dev-loop.md, "A checker has THREE answers, not two") — which must surface
// as its own verdict rather than as a pass.

import { test } from "node:test";
import assert from "node:assert/strict";

import { statusKind, statusVerdict, matrixRow } from "../tools/bust-triage.mjs";

// Verbatim leading text of the real status cells, 2026-08-06. Pinned rather
// than read live so the expectations anchor to something immutable: a matrix
// edit must not silently retune the bite that the matrix edit is exactly what
// could break. The live-matrix property test at the bottom covers drift.
const CELL = {
  3: "header:anthropic-beta[-mid-conversation-tool-changes]` ",   // cell split by a `|` inside the prose
  5: "PARTIAL: fingerprint-strip + identity-normalization + c",
  6: "**OBSERVED, CAUSE NOT ISOLATED** (2026-07-27 12:47:56, ",
  13: "**BUILT — `deferred-tool-rewrite.mjs`, gate `CACHE_FIX_",
  14: "**BUILT, and the row's own remedy proved insufficient**",
  16: "COVERED operator-side (correction 2026-07-27: an operat",
  17: "N/A note only",
  19: "COVERED as serialization by row 13's hold (definition s",
  25: "**MITIGATED 2026-08-05 (per-conversation relocation mem",
  7: "CLOSED (sort-stabilization, tool-input-normalize) — kee",
};

// THE motivating case. Against the pre-change implementation this returns
// MITIGATED (demonstrated by direct invocation on the real matrix before the
// fix: `row.open` is false for row 6, and false meant MITIGATED).
test("BITE — row 6's real status is not a mitigation, and must not read as one", () => {
  assert.equal(statusKind(CELL[6]), "OBSERVED", "the state the row states");
  assert.notEqual(statusVerdict(CELL[6]), "MITIGATED",
    "a class whose cause was never isolated cannot reach a reader as MITIGATED");
  assert.equal(statusVerdict(CELL[6]), "KNOWN-OPEN");
});

// One case per mis-mapping row from the sweep (BACKLOG named 3/5/6/13/14/16/17;
// 19 leads with the same COVERED token as 16 and the hand sweep missed it —
// which is the mechanism finding what the manual pass found once).
test("BITE — every non-mitigation status stops reading as MITIGATED", () => {
  const expected = {
    3: "STATUS-UNREADABLE",   // not a status at all: the cell split on an inline `|`
    5: "KNOWN-OPEN",          // PARTIAL
    6: "KNOWN-OPEN",          // OBSERVED
    13: "KNOWN-OPEN",         // BUILT
    14: "KNOWN-OPEN",         // BUILT, remedy proved insufficient
    16: "KNOWN-OPEN",         // COVERED operator-side
    17: "KNOWN-OPEN",         // N/A note only
    19: "KNOWN-OPEN",         // COVERED as serialization
  };
  for (const [n, want] of Object.entries(expected)) {
    assert.equal(statusVerdict(CELL[n]), want, `row ${n}: ${CELL[n]}`);
    assert.notEqual(statusVerdict(CELL[n]), "MITIGATED", `row ${n} must not be MITIGATED`);
  }
});

// The control the entry names: the fix must not simply stop saying MITIGATED.
test("CONTROL — a row whose status genuinely reads MITIGATED still does", () => {
  assert.equal(statusKind(CELL[25]), "MITIGATED");
  assert.equal(statusVerdict(CELL[25]), "MITIGATED");
  assert.equal(statusVerdict(CELL[7]), "MITIGATED", "CLOSED is a shipped mitigation too");
});

// The mandatory unmatched case, stated as its own answer.
test("BITE — a status in no known state is STATUS-UNREADABLE, never a pass", () => {
  for (const junk of ["", "   ", "TBD", "somebody's prose", "**FROBNICATED 2027-01-01**"]) {
    assert.equal(statusKind(junk), null, `unexpectedly matched: ${JSON.stringify(junk)}`);
    assert.equal(statusVerdict(junk), "STATUS-UNREADABLE");
  }
});

// Anchoring is what keeps prose out of the verdict: row 4 leads OPEN and
// quotes its own superseded "**CLOSED" later in the same cell.
test("the state token is read at the START of the cell, not anywhere in it", () => {
  const row4 = "**OPEN — RE-OPENED 2026-07-31** … Prior status, kept for the record: **CLOSED";
  assert.equal(statusKind(row4), "OPEN");
  assert.equal(statusVerdict(row4), "KNOWN-OPEN");
  // …and the mirror: a CLOSED row that merely mentions an open question.
  assert.equal(statusKind("CLOSED (fc432bf) — the OPEN question is forensics only"), "MITIGATED");
});

// Drift guard over the LIVE matrix, so a status added tomorrow cannot land on
// the reassuring value by default. This is the property, not a row list: it
// cannot go stale when the matrix grows.
test("BITE — no live matrix row reaches MITIGATED without saying so", () => {
  let rows = 0;
  for (let n = 1; n <= 60; n++) {
    const row = matrixRow(n);
    if (!row) continue;
    rows++;
    if (statusVerdict(row.status) !== "MITIGATED") continue;
    assert.match(row.status.replace(/^[\s*_]+/, ""), /^(MITIGATED|CLOSED|ACCEPT)/,
      `row ${n} reads as MITIGATED on a status that does not say so: ${row.status}`);
  }
  assert.ok(rows >= 25, `only ${rows} matrix rows read — the parser, not the matrix, is the suspect`);
});
