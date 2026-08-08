// test/backlog-census.test.mjs — bites for `backlog-lint.mjs --census`, the
// `## Open` population census.
//
// EXPECTED VALUES, written from the brief's field definitions BEFORE any
// implementation output was consulted for their derivation (only the exact
// literal headline/row strings below were copied from a captured run, to
// avoid transcription error in text that is a pure mechanical transform —
// strip `- **`, collapse whitespace, truncate — of the fixture's own
// bytes; every STRUCTURAL claim — which grade, which line, anchor/verifier/
// pointer presence, which files, the summary counts — was derived by hand
// against `test/fixtures/backlog-census-sample.md`'s ten `## Open` bullets
// (file lines 8, 13, 16, 19, 21, 24, 27, 30, 32, 34) and confirmed to match
// before this file was written:
//
//   line  grade         anchor   verifier   pointer   files
//   8     READY         anchor   verifier   -         tools/backlog-lint.mjs
//   13    READY         -        -          -         (none)
//   16    READY         -        -          -         tools/backlog-lint.mjs
//   19    DONE          -        -          -         (none)
//   21    PARKED        -        -          -         (none)
//   24    OPEN          -        -          pointer   docs/dev-loop.md
//   27    UNCLASSIFIED  -        -          -         (none)
//   30    HOT           -        -          -         (none)
//   32    OPEN/HOT      -        -          -         (none)
//   34    RESOLVED      -        -          -         (none)
//
// Reasoning per bullet:
//   line 8:  header opens "READY", body carries `<!-- entry: "..." -->`
//            (anchor) and the word "red-first" (verifier). One backtick
//            file token: `tools/backlog-lint.mjs`.
//   line 13: header opens "READY", body has no anchor mark, no verifier
//            keyword, no backtick tokens.
//   line 16: header opens "READY", cites `tools/backlog-lint.mjs` again —
//            the file shared by two READY entries (count 2).
//   line 19: header is "(DONE — ...)"; the leading "(" is stripped before
//            the grade-token match, so this classifies as DONE, not
//            UNCLASSIFIED.
//   line 21: header opens "PARKED".
//   line 24: header's FIRST LINE contains the literal substring "POINTER"
//            (pointer=pointer); body cites `docs/dev-loop.md`.
//   line 27: header opens with a backtick immediately after `- **` — no
//            `[A-Z]+` grade token matches — UNCLASSIFIED.
//   line 30: header opens "HOT".
//   line 32: header opens "OPEN/HOT" (the two-part grade token).
//   line 34: header opens "RESOLVED".
//
// Section boundary: the sample's 11th bullet ("should be excluded, wrong
// section", file line 39) sits after `## Later section` and must not
// appear in the census at all — that is the section-boundary bite and the
// first mutation arm below.
//
// Summary (derived from the ten rows above):
//   grades: READY=3 OPEN=1 HOT=1 OPEN/HOT=1 PARKED=1 DONE=1 RESOLVED=1
//           FIXED=0 BUILT=0 PARTLY=0 CORRECTED=0 DOWNGRADED=0 UNCLASSIFIED=1
//   UNCLASSIFIED bullets: 27
//   READY without anchor: 2   (lines 13, 16)
//   READY without verifier: 2 (lines 13, 16)
//   files claimed by 2+ READY entries: tools/backlog-lint.mjs(2)

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { censusEntries, censusText } from "../tools/backlog-lint.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools/backlog-lint.mjs");
const FIXTURE = join(REPO, "test/fixtures/backlog-census-sample.md");
const FIXTURE_TEXT = readFileSync(FIXTURE, "utf8");

function runTool(args, input) {
  try {
    const out = execFileSync(process.execPath, [TOOL, ...args], {
      encoding: "utf8",
      input,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? -1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

// --- Structured entries: the full expected row set -------------------------

test("censusEntries: the fixture's ten `## Open` bullets, in file order, section-scoped", () => {
  const entries = censusEntries(FIXTURE_TEXT);
  assert.equal(entries.length, 10, "the 11th bullet (past `## Later section`) must be excluded");
  assert.deepEqual(
    entries.map((e) => e.line),
    [8, 13, 16, 19, 21, 24, 27, 30, 32, 34],
  );
  assert.deepEqual(
    entries.map((e) => e.grade),
    ["READY", "READY", "READY", "DONE", "PARKED", "OPEN", "UNCLASSIFIED", "HOT", "OPEN/HOT", "RESOLVED"],
  );
  assert.deepEqual(
    entries.map((e) => e.anchor),
    ["anchor", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
  );
  assert.deepEqual(
    entries.map((e) => e.verifier),
    ["verifier", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
  );
  assert.deepEqual(
    entries.map((e) => e.pointer),
    ["-", "-", "-", "-", "-", "pointer", "-", "-", "-", "-"],
  );
  assert.deepEqual(
    entries.map((e) => e.files),
    [
      ["tools/backlog-lint.mjs"],
      [],
      ["tools/backlog-lint.mjs"],
      [],
      [],
      ["docs/dev-loop.md"],
      [],
      [],
      [],
      [],
    ],
  );
});

// --- Full formatted text: rows + summary, byte-exact ------------------------

test("censusText: the fixture's exact rows and summary", () => {
  const expected = [
    "8\tREADY\tanchor\tverifier\t-\ttools/backlog-lint.mjs\tREADY — build the census.** See `tools/backlog-lint.mjs` for the shape",
    "13\tREADY\t-\t-\t-\t\tREADY — a bare item with nothing extra.** Nothing but a plain body",
    "16\tREADY\t-\t-\t-\ttools/backlog-lint.mjs\tREADY — second consumer of the shared file.** Also touches",
    "19\tDONE\t-\t-\t-\t\t(DONE — abc1234, 2026-08-01).** Finished census precursor, closed out.",
    "21\tPARKED\t-\t-\t-\t\tPARKED — waiting on an evidence gap.** Needs the missing measurement",
    "24\tOPEN\t-\t-\tpointer\tdocs/dev-loop.md\tOPEN — POINTER to the discipline doc.** POINTER: see",
    "27\tUNCLASSIFIED\t-\t-\t-\t\t`legacy-tag` — an old-style entry.** Header opens with a backtick, not",
    "30\tHOT\t-\t-\t-\t\tHOT — urgent thing.** Needs attention now; body stays plain.",
    "32\tOPEN/HOT\t-\t-\t-\t\tOPEN/HOT — double grade example.** Watch this closely; no files.",
    "34\tRESOLVED\t-\t-\t-\t\tRESOLVED — old work closed out.** Already resolved 2026-01-01, no",
    "",
    "# grades: READY=3 OPEN=1 HOT=1 OPEN/HOT=1 PARKED=1 DONE=1 RESOLVED=1 FIXED=0 BUILT=0 PARTLY=0 CORRECTED=0 DOWNGRADED=0 UNCLASSIFIED=1",
    "# UNCLASSIFIED bullets: 27",
    "# READY without anchor: 2",
    "# READY without verifier: 2",
    "# files claimed by 2+ READY entries: tools/backlog-lint.mjs(2)",
  ].join("\n") + "\n";
  assert.equal(censusText(FIXTURE_TEXT), expected);
});

test("CLI: --census on the fixture matches the direct censusText() call", () => {
  const { code, out } = runTool(["--census", FIXTURE]);
  assert.equal(code, 0, "WARN-only: exit is always 0");
  assert.equal(out, censusText(FIXTURE_TEXT));
});

test("censusEntries: a file with no `## Open` section returns an empty array (absence, not a crash)", () => {
  assert.deepEqual(censusEntries("# no open section here\n- **READY — orphaned.** Body.\n"), []);
});

// --- --since: set-membership diff, not text diff ----------------------------

test("censusText --since: added/removed are READY-only, by raw first-line set membership", () => {
  const oldText = [
    "## Open",
    "",
    "- **READY — will be removed.** Body.",
    "",
    "- **READY — stays the same.** Body.",
  ].join("\n");
  const newText = [
    "## Open",
    "",
    "- **READY — stays the same.** Body.",
    "",
    "- **READY — newly added.** Body.",
    "",
    "- **OPEN — not READY, never counted.** Body.",
  ].join("\n");
  const out = censusText(newText, { sinceRef: "fake-ref", oldText });
  assert.match(out, /# READY added since fake-ref: 1/);
  assert.match(out, /\+ READY — newly added\.\*\* Body\./);
  assert.match(out, /# READY removed since fake-ref: 1/);
  assert.match(out, /- READY — will be removed\.\*\* Body\./);
});

// --- Real-corpus bite, pinned to two IMMUTABLE refs -------------------------
//
// Both refs are immutable commits, never the live working tree (which the
// dispatcher is rewriting concurrently) — this bite reproduces forever.
// Known positives per the brief, independently re-derived by hand before
// this tool existed (a throwaway awk over `git show <ref>:BACKLOG.md`) and
// confirmed to match this implementation's output with no tuning:
//   `## Open` section at b7ae5aa: 167 bullets, 81 READY (86 whole-file).
//   Comparing b7ae5aa's `## Open` READY headers against 0cef42f's:
//   18 READY headers added, 3 removed.
test("CLI: real-corpus census against two immutable refs matches the brief's known positives", () => {
  const historical = execFileSync("git", ["show", "b7ae5aa:BACKLOG.md"], { cwd: REPO, encoding: "utf8" });
  const { code, out } = runTool(["--census", "--since", "0cef42f", "-"], historical);
  assert.equal(code, 0);
  const rows = out.split("\n\n")[0].split("\n");
  assert.equal(rows.length, 167, "167 bullets in the `## Open` section at b7ae5aa");
  const readyRows = rows.filter((r) => r.split("\t")[1] === "READY");
  assert.equal(readyRows.length, 81, "81 READY bullets in the `## Open` section at b7ae5aa");
  assert.match(out, /# READY added since 0cef42f: 18/);
  assert.match(out, /# READY removed since 0cef42f: 3/);
});
