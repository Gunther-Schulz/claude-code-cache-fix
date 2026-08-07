// A markdown table row is split on UNESCAPED pipes OUTSIDE inline code, and
// `String.split("|")` knows neither exception.
//
// The incident, surfaced 2026-08-06 by the dispatched status-enum work and
// correctly returned as a gap rather than fixed inside a boundary that did not
// cover it: row 3's status cell contains an inline code span carrying a pipe
// (`… | header:anthropic-beta[-mid-conversation-tool-changes]`) in running
// text. `matrixRow`'s `line.split("|")` therefore yielded one field too many,
// and `cells[length - 2]` handed the reader a fragment starting mid-sentence.
// The `DOCUMENTED` the row LEADS with was never seen by anything. The shipped
// status enum made that land on STATUS-UNREADABLE — the safe direction, and
// not a fix: the tool still could not read a row it is supposed to read.
//
// The expectations below come from the TABLE GRAMMAR's definition of a cell
// boundary (GFM: an unescaped pipe outside inline code), never from the
// parser under test — an expectation with the same parentage as the code
// pins the bug it should catch. Verified RED against the pre-change
// implementation by direct invocation on the real matrix: `matrixRow(3).kind`
// was `null` and its `.status` began "header:anthropic-beta[...]` while CC's
// own tools count was a st…", i.e. mid-sentence.
//
// Why it is worth more than one row: the same split is how every matrix
// reader reaches its cells. A parser that silently truncates at the first
// pipe is the "partial view read as its whole body" shape aimed at a table.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { splitRowCells, matrixRow, statusKind, statusVerdict } from "../tools/bust-triage.mjs";

const MATRIX_PATH = join(dirname(fileURLToPath(import.meta.url)), "..",
  "docs/directives/robustness-threat-matrix.md");

// --- THE motivating case, read off the LIVE matrix ---
//
// Row 3's status leads with DOCUMENTED. That is a fact about the matrix, not
// about this parser, so it is asserted against the real file: if the row is
// ever re-worded the assertion should be re-read, which is the point.
test("BITE — row 3's status is read whole, and it leads with the state it states", () => {
  const row = matrixRow(3);
  assert.ok(row, "row 3 must be readable at all");
  assert.equal(row.kind, "DOCUMENTED",
    `row 3 parsed to ${JSON.stringify(row.kind)} on status ${JSON.stringify(row.status.slice(0, 80))}`);
  assert.match(row.status, /^DOCUMENTED\b/,
    "the cell must START at the cell boundary, not mid-sentence inside an inline code span");
  assert.notEqual(statusVerdict(row.status), "STATUS-UNREADABLE",
    "a row the tool is supposed to read must not read as unreadable for the parser's own reason");
});

// The class, not the row: no live matrix row's status cell may be cut inside
// an inline code span. The parser's own fingerprint is an UNBALANCED backtick
// run in the extracted cell.
//
// Measured while building this: the first draft of this check counted
// backticks in `matrixRow(n).status`, which is TRUNCATED to 260 chars — and
// truncation cuts code spans too, so it flagged row 6, whose parse was never
// wrong. A check that fires on a non-defect is broken in the same way as one
// that misses a defect (dev-loop, "Adding a check"), so the count is taken on
// the UNTRUNCATED cell. The cell still comes from the tool's own
// `splitRowCells` — a second splitter here would be a second truth about
// where a cell ends.
test("BITE — no live matrix row's status cell is cut inside an inline code span", () => {
  const raw = readFileSync(MATRIX_PATH, "utf8").split("\n");
  const offenders = [];
  let rows = 0;
  for (const line of raw) {
    const m = /^\|\s*(\d+)\s*\|/.exec(line);
    if (!m) continue;
    rows++;
    const cells = splitRowCells(line);
    const cell = (cells[cells.length - 2] ?? "").trim();
    const ticks = (cell.match(/`/g) ?? []).length;
    if (ticks % 2 === 1) offenders.push(`row ${m[1]}: ${cell.slice(0, 70)}`);
  }
  assert.ok(rows >= 25, `only ${rows} matrix rows found — the reader, not the matrix, is the suspect`);
  assert.deepEqual(offenders, [], `cells split inside an inline code span:\n${offenders.join("\n")}`);
});

// --- the grammar, stated directly ---

test("BITE — a pipe inside inline code is content, not a cell boundary", () => {
  const line = "| 3 | desc | DOCUMENTED (rule). `tools=DIFFER | header:beta[-x]` and more |";
  const cells = splitRowCells(line);
  assert.equal(cells.length, 5, `expected 5 fields, got ${cells.length}: ${JSON.stringify(cells)}`);
  assert.equal(cells[cells.length - 2].trim(),
    "DOCUMENTED (rule). `tools=DIFFER | header:beta[-x]` and more");
  assert.equal(statusKind(cells[cells.length - 2].trim()), "DOCUMENTED");
  // …and the naive split is what it must not be.
  assert.notDeepEqual(cells, line.split("|"),
    "if this equals split('|') the parser did not change");
});

test("a backslash-escaped pipe is content, and renders as a bare pipe", () => {
  const cells = splitRowCells("| 9 | d | OPEN a \\| b |");
  assert.equal(cells.length, 5);
  assert.equal(cells[3].trim(), "OPEN a | b", "GFM renders \\| as |");
});

test("multi-backtick code spans close on a run of the SAME length", () => {
  const cells = splitRowCells("| 1 | d | OPEN ``a | b`` tail |");
  assert.equal(cells.length, 5);
  assert.equal(cells[3].trim(), "OPEN ``a | b`` tail");
  // A single backtick inside a double-backtick span does not close it.
  const nested = splitRowCells("| 1 | d | OPEN ``x ` y | z`` end |");
  assert.equal(nested.length, 5);
  assert.equal(nested[3].trim(), "OPEN ``x ` y | z`` end");
});

test("an UNMATCHED backtick is literal text and must not swallow later cells", () => {
  // CommonMark: a backtick run with no matching closer is ordinary text. If
  // the scanner treated it as an open span it would consume the rest of the
  // row and every later cell would vanish — a silent truncation of exactly
  // the kind this parser exists to end.
  const cells = splitRowCells("| 1 | d ` stray | OPEN real status |");
  assert.equal(cells.length, 5, `stray backtick ate the row: ${JSON.stringify(cells)}`);
  assert.equal(cells[3].trim(), "OPEN real status");
});

// --- THE CONTROL the entry names ---
//
// "A row with no pipe in its prose is unaffected." Shape-identical to
// split("|") — leading/trailing empties included — because callers index
// with `cells[length - 2]`, and a parser that quietly re-based that index
// would break every row while fixing one.
test("CONTROL — a row whose prose holds no pipe parses exactly as split('|') did", () => {
  for (const line of [
    "| 4 | Mutable tail entries | **OPEN — RE-OPENED 2026-07-31** (a non-tail instance) |",
    "| 17 | note | N/A note only |",
    "|1|a|b|",
    "| 25 | x | **MITIGATED 2026-08-05 (per-conversation relocation memory)** |",
  ]) {
    assert.deepEqual(splitRowCells(line), line.split("|"), `changed a pipe-free row: ${line}`);
  }
});

test("CONTROL — the live rows that parsed correctly still parse identically", () => {
  // Every row whose raw line has no inline-code pipe must be byte-identical
  // under both parsers. This is the regression half: the fix may only change
  // rows the naive split got wrong.
  const before = { 1: "MITIGATED", 4: "OPEN", 6: "OBSERVED", 17: "NOT-APPLICABLE", 25: "MITIGATED" };
  for (const [n, kind] of Object.entries(before)) {
    const row = matrixRow(Number(n));
    assert.ok(row, `row ${n} readable`);
    assert.equal(row.kind, kind, `row ${n} changed kind under the new parser`);
  }
});
