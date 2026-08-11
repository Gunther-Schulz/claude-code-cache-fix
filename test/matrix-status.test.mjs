// test/matrix-status.test.mjs — the checker for
// docs/directives/robustness-threat-matrix.status.json (Phase 1 of
// docs/directives/records-restructure.md).
//
// WHY THIS EXISTS. The status file replaces a judgment PASS (read each
// matrix row's body to its deciding sentence) with DATA plus a checker,
// because the judgment pass is exactly what drifted on 2026-08-10/11: four
// rows misread by their leading token, one row's headline contradicting its
// own body's measured result. This file is the mechanism half — it does not
// re-derive whether a row's VERDICT is correct (that stays a human read
// against the matrix body), only whether the STATUS FILE'S OWN SHAPE is
// internally consistent and matches the matrix's row set.
//
// `checkMatrixStatus` is a pure function of (statusObj, matrixRowNumbers,
// env); the env's two resolvers are injectable (mirroring
// tools/backlog-lint.mjs's REAL_ENV pattern) so a synthetic bite can pin
// one condition without touching the real files. Per dev-loop's "does this
// resolve, never as-the-type-I-expected" (the `^{commit}` vs tree-hash
// lesson), `objectResolves` accepts ANY git object type — no `^{commit}`
// peel.
//
// This checker has THREE possible answers per row-field, not two: a
// finding is a violation, absence-of-finding is a pass, and a condition
// this checker cannot evaluate (an evidence token disqualified by shape,
// were one ever added) would be its own outcome — none of the five finding
// classes here fold "could not evaluate" into "pass".

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpDirSync } from "../tools/tmpdir.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STATUS_PATH = join(REPO, "docs/directives/robustness-threat-matrix.status.json");
const MATRIX_PATH = join(REPO, "docs/directives/robustness-threat-matrix.md");

// THE RULE LIVES IN `tools/matrix-status.mjs` SINCE PHASE 3, and this file
// imports it rather than carrying a copy. It was defined here first, when the
// suite was its only consumer; the daily sweep became a second one, and a
// second implementation of one invariant is this repo's hand-rolled-identity
// error at the rule level — two checkers that disagree and nobody able to say
// which is right. Namespace import on purpose: a missing export then fails at
// its own call site instead of collapsing the whole module at ESM link time.
import * as ms from "../tools/matrix-status.mjs";

const { VALID_STATUSES, REAL_ENV, parseMatrixRowNumbers, checkMatrixStatus } = ms;

function readRealStatus() {
  return JSON.parse(readFileSync(STATUS_PATH, "utf8"));
}

function readRealMatrixRowNumbers() {
  return parseMatrixRowNumbers(readFileSync(MATRIX_PATH, "utf8"));
}

function formatFindings(findings) {
  return findings.map((f) => `  row ${f.row} ${f.label}: ${f.detail}`).join("\n");
}

// A minimal, otherwise-clean row used as filler in synthetic fixtures so
// each bite below carries exactly one candidate for the class it tests —
// OPEN status skips both the RESIDUAL-NULL and EVIDENCE-UNRESOLVED checks,
// so filler rows never accidentally satisfy or contaminate an unrelated
// finding class.
function fillerRow(overrides = {}) {
  return { status: "OPEN", evidence: "n/a", date: "2026-01-01", residual: null, ...overrides };
}

// A stub env whose resolvers are named-token allowlists, for synthetic
// bites that need EVIDENCE-UNRESOLVED to fire or not fire deterministically
// without touching real git objects or files.
function stubEnv({ objects = [], paths = [] } = {}) {
  const objectSet = new Set(objects);
  const pathSet = new Set(paths);
  return {
    objectResolves: (t) => objectSet.has(t),
    pathExists: (t) => pathSet.has(t),
  };
}

// --- Bite 1: the live bite — real file, real matrix, real resolvers ------

test("live bite: the real status file returns zero findings against the real matrix", () => {
  const statusObj = readRealStatus();
  const matrixRowNumbers = readRealMatrixRowNumbers();
  const findings = checkMatrixStatus(statusObj, matrixRowNumbers, REAL_ENV);
  assert.equal(
    findings.length, 0,
    `expected zero findings, got ${findings.length}:\n${formatFindings(findings)}`,
  );
});

// --- Bite 2: the live file has exactly 29 row keys, exactly 1..29 --------

test("live bite: the real status file has exactly rows 1..29, no gaps, no duplicates", () => {
  const statusObj = readRealStatus();
  const rowKeys = Object.keys(statusObj).filter((k) => !k.startsWith("_"));
  assert.equal(rowKeys.length, 29, `expected 29 row keys, got ${rowKeys.length}: ${rowKeys.sort().join(",")}`);
  const numbers = rowKeys.map(Number).sort((a, b) => a - b);
  const expected = Array.from({ length: 29 }, (_, i) => i + 1);
  assert.deepEqual(numbers, expected);
});

// --- Bite 3: one synthetic bite per finding class -------------------------

test("BAD-STATUS: fires on a status value outside the closed enum", () => {
  const statusObj = {
    _: "doc",
    1: fillerRow({ status: "BOGUS" }),
    2: fillerRow(),
    3: fillerRow(),
  };
  const findings = checkMatrixStatus(statusObj, [1, 2, 3], REAL_ENV);
  assert.equal(findings.length, 1, formatFindings(findings));
  assert.equal(findings[0].label, "BAD-STATUS");
  assert.equal(findings[0].row, "1");
});

test("BAD-STATUS negative control: every enum value passes clean", () => {
  const statusObj = { _: "doc" };
  const enumValues = [...VALID_STATUSES];
  // Evidence must resolve for SHIPPED/RESIDUAL rows too, or this fixture
  // would trip EVIDENCE-UNRESOLVED for the wrong reason — a real
  // repo-relative path keeps this bite isolated to BAD-STATUS.
  enumValues.forEach((status, i) => {
    statusObj[i + 1] = fillerRow({
      status,
      evidence: "docs/directives/robustness-threat-matrix.md",
      residual: status === "RESIDUAL" ? "some remainder" : null,
    });
  });
  const rowNumbers = enumValues.map((_, i) => i + 1);
  const findings = checkMatrixStatus(statusObj, rowNumbers, REAL_ENV);
  assert.deepEqual(findings, [], formatFindings(findings));
});

test("ROW-SET-MISMATCH: fires when the matrix has a row the status file lacks", () => {
  const statusObj = { _: "doc", 1: fillerRow(), 2: fillerRow() };
  const findings = checkMatrixStatus(statusObj, [1, 2, 3], REAL_ENV);
  assert.equal(findings.length, 1, formatFindings(findings));
  assert.equal(findings[0].label, "ROW-SET-MISMATCH");
  assert.equal(findings[0].row, "3");
});

test("ROW-SET-MISMATCH: fires when the status file has a row the matrix lacks", () => {
  const statusObj = { _: "doc", 1: fillerRow(), 2: fillerRow(), 3: fillerRow() };
  const findings = checkMatrixStatus(statusObj, [1, 2], REAL_ENV);
  assert.equal(findings.length, 1, formatFindings(findings));
  assert.equal(findings[0].label, "ROW-SET-MISMATCH");
  assert.equal(findings[0].row, "3");
});

test("ROW-SET-MISMATCH negative control: matching sets pass clean", () => {
  const statusObj = { _: "doc", 1: fillerRow(), 2: fillerRow(), 3: fillerRow() };
  const findings = checkMatrixStatus(statusObj, [1, 2, 3], REAL_ENV);
  assert.deepEqual(findings, [], formatFindings(findings));
});

test("RESIDUAL-NULL: fires on a RESIDUAL row whose residual is null", () => {
  const env = stubEnv({ paths: ["some/real/path.mjs"] });
  const statusObj = {
    _: "doc",
    1: fillerRow({ status: "RESIDUAL", evidence: "some/real/path.mjs", residual: null }),
    2: fillerRow(),
    3: fillerRow(),
  };
  const findings = checkMatrixStatus(statusObj, [1, 2, 3], env);
  assert.equal(findings.length, 1, formatFindings(findings));
  assert.equal(findings[0].label, "RESIDUAL-NULL");
  assert.equal(findings[0].row, "1");
});

test("RESIDUAL-NULL: fires on a RESIDUAL row whose residual is whitespace-only", () => {
  const env = stubEnv({ paths: ["some/real/path.mjs"] });
  const statusObj = {
    _: "doc",
    1: fillerRow({ status: "RESIDUAL", evidence: "some/real/path.mjs", residual: "   " }),
    2: fillerRow(),
    3: fillerRow(),
  };
  const findings = checkMatrixStatus(statusObj, [1, 2, 3], env);
  assert.equal(findings.length, 1, formatFindings(findings));
  assert.equal(findings[0].label, "RESIDUAL-NULL");
});

test("RESIDUAL-NULL negative control: a RESIDUAL row with real text passes clean", () => {
  const env = stubEnv({ paths: ["some/real/path.mjs"] });
  const statusObj = {
    _: "doc",
    1: fillerRow({ status: "RESIDUAL", evidence: "some/real/path.mjs", residual: "a real remainder" }),
    2: fillerRow(),
    3: fillerRow(),
  };
  const findings = checkMatrixStatus(statusObj, [1, 2, 3], env);
  assert.deepEqual(findings, [], formatFindings(findings));
});

test("EVIDENCE-UNRESOLVED: fires on a SHIPPED row whose evidence resolves as neither shape", () => {
  const env = stubEnv({}); // nothing resolves
  const statusObj = {
    _: "doc",
    1: fillerRow({ status: "SHIPPED", evidence: "dangling-token-abc123", residual: null }),
    2: fillerRow(),
    3: fillerRow(),
  };
  const findings = checkMatrixStatus(statusObj, [1, 2, 3], env);
  assert.equal(findings.length, 1, formatFindings(findings));
  assert.equal(findings[0].label, "EVIDENCE-UNRESOLVED");
  assert.equal(findings[0].row, "1");
});

test("EVIDENCE-UNRESOLVED negative control: a SHIPPED row whose evidence resolves as a path passes clean", () => {
  const env = stubEnv({ paths: ["proxy/extensions/real-thing.mjs"] });
  const statusObj = {
    _: "doc",
    1: fillerRow({ status: "SHIPPED", evidence: "proxy/extensions/real-thing.mjs", residual: null }),
    2: fillerRow(),
    3: fillerRow(),
  };
  const findings = checkMatrixStatus(statusObj, [1, 2, 3], env);
  assert.deepEqual(findings, [], formatFindings(findings));
});

test("EVIDENCE-UNRESOLVED negative control: a RESIDUAL row whose evidence resolves as a git object passes clean", () => {
  const env = stubEnv({ objects: ["abc1234"] });
  const statusObj = {
    _: "doc",
    1: fillerRow({ status: "RESIDUAL", evidence: "abc1234", residual: "a real remainder" }),
    2: fillerRow(),
    3: fillerRow(),
  };
  const findings = checkMatrixStatus(statusObj, [1, 2, 3], env);
  assert.deepEqual(findings, [], formatFindings(findings));
});

test("BAD-DATE: fires on a date that does not match YYYY-MM-DD", () => {
  const statusObj = {
    _: "doc",
    1: fillerRow({ date: "08-11-2026" }),
    2: fillerRow(),
    3: fillerRow(),
  };
  const findings = checkMatrixStatus(statusObj, [1, 2, 3], REAL_ENV);
  assert.equal(findings.length, 1, formatFindings(findings));
  assert.equal(findings[0].label, "BAD-DATE");
  assert.equal(findings[0].row, "1");
});

test("BAD-DATE negative control: a well-formed date passes clean", () => {
  const statusObj = { _: "doc", 1: fillerRow(), 2: fillerRow(), 3: fillerRow() };
  const findings = checkMatrixStatus(statusObj, [1, 2, 3], REAL_ENV);
  assert.deepEqual(findings, [], formatFindings(findings));
});

test("UNKNOWN-UNDERSCORE-KEY: fires on an underscore-prefixed key other than \"_\"", () => {
  const statusObj = {
    _: "doc",
    _2: "a stray second documentation key",
    1: fillerRow(),
    2: fillerRow(),
    3: fillerRow(),
  };
  const findings = checkMatrixStatus(statusObj, [1, 2, 3], REAL_ENV);
  assert.equal(findings.length, 1, formatFindings(findings));
  assert.equal(findings[0].label, "UNKNOWN-UNDERSCORE-KEY");
  assert.equal(findings[0].row, "_2");
});

test("UNKNOWN-UNDERSCORE-KEY negative control: only the documented \"_\" key passes clean", () => {
  const statusObj = { _: "doc", 1: fillerRow(), 2: fillerRow(), 3: fillerRow() };
  const findings = checkMatrixStatus(statusObj, [1, 2, 3], REAL_ENV);
  assert.deepEqual(findings, [], formatFindings(findings));
});

// BAD-TRIAGE: the per-row `triage` override (settled design, row 27) must
// name a verdict from bust-triage's own vocabulary, or it silently reaches a
// reader as an unrecognised word — the same class of failure the closed
// status enum exists to prevent, one field over.
test("BAD-TRIAGE: fires on a triage value outside bust-triage's verdict vocabulary", () => {
  const statusObj = {
    _: "doc",
    1: fillerRow({ triage: "SORT-OF-OPEN" }),
    2: fillerRow(),
    3: fillerRow(),
  };
  const findings = checkMatrixStatus(statusObj, [1, 2, 3], REAL_ENV);
  assert.equal(findings.length, 1, formatFindings(findings));
  assert.equal(findings[0].label, "BAD-TRIAGE");
  assert.equal(findings[0].row, "1");
});

test("BAD-TRIAGE negative control: a row with no triage field passes clean", () => {
  const statusObj = { _: "doc", 1: fillerRow(), 2: fillerRow(), 3: fillerRow() };
  const findings = checkMatrixStatus(statusObj, [1, 2, 3], REAL_ENV);
  assert.deepEqual(findings, [], formatFindings(findings));
});

test("BAD-TRIAGE negative control: a triage value in the vocabulary passes clean", () => {
  const statusObj = {
    _: "doc",
    1: fillerRow({ triage: "CONTROLLED-CAUSE" }),
    2: fillerRow(),
    3: fillerRow(),
  };
  const findings = checkMatrixStatus(statusObj, [1, 2, 3], REAL_ENV);
  assert.deepEqual(findings, [], formatFindings(findings));
});

// --- rowTriage / readRowStatus: the reader `bust-triage.mjs` now calls -----
//
// A throwaway status file per bite, rather than reaching into the live one,
// so these pin the MAPPING and not today's row content — and so the two
// red-first arms below can mutate exactly what they name without touching
// the real status.json.

function tmpStatusFile(rows) {
  const dir = tmpDirSync("matrix-status-row-");
  const p = join(dir, "status.json");
  writeFileSync(p, JSON.stringify({ _: "doc", ...rows }));
  return p;
}

test("rowTriage: SHIPPED yields MITIGATED with no why", () => {
  const statusPath = tmpStatusFile({
    1: { status: "SHIPPED", evidence: "x", date: "2026-01-01", residual: null },
  });
  const r = ms.rowTriage(1, { statusPath });
  assert.equal(r.ok, true);
  assert.equal(r.verdict, "MITIGATED");
  assert.equal(r.why, null);
});

test("rowTriage: a per-row triage override wins over the status's own base verdict, keeping the base why", () => {
  const statusPath = tmpStatusFile({
    27: { status: "ACCEPTED", triage: "CONTROLLED-CAUSE", evidence: "x", date: "2026-01-01", residual: "r" },
  });
  const r = ms.rowTriage(27, { statusPath });
  assert.equal(r.ok, true);
  assert.equal(r.verdict, "CONTROLLED-CAUSE", "the override wins");
  assert.equal(r.why, "WON'T BUILD — deliberately unmitigated, cost accepted",
    "the override does not touch `why` — ACCEPTED's own reason stays attached");
});

test("rowTriage: a row absent from the status file is ok:false, never a default verdict", () => {
  const statusPath = tmpStatusFile({ 1: { status: "OPEN", evidence: "x", date: "2026-01-01", residual: null } });
  const r = ms.rowTriage(97, { statusPath });
  assert.equal(r.ok, false);
  assert.match(r.reason, /row 97 is not present/);
});

test("rowTriage: an unreadable status file is ok:false, never a default verdict", () => {
  const r = ms.rowTriage(1, { statusPath: join(REPO, "docs/directives/no-such-status.json") });
  assert.equal(r.ok, false);
  assert.match(r.reason, /status file unreadable/);
});

// --- RED-FIRST, arm 1: RESIDUAL must NOT map to MITIGATED --------------
//
// This is the exact defect the entry names: "our mitigation worked" is the
// dangerous direction, and a row shipped WITH a named remainder can bust ON
// that remainder. BASELINE printed first — a mutate-and-revert proof over an
// already-red baseline proves nothing (dev-loop, red-first discipline).

test("RED-FIRST arm 1 — baseline: RESIDUAL correctly reads KNOWN-OPEN today", () => {
  const statusPath = tmpStatusFile({
    1: { status: "RESIDUAL", evidence: "x", date: "2026-01-01", residual: "a real remainder" },
  });
  const baseline = ms.rowTriage(1, { statusPath });
  assert.equal(baseline.ok, true);
  assert.equal(baseline.verdict, "KNOWN-OPEN", `baseline must be KNOWN-OPEN before the mutation proof: ${JSON.stringify(baseline)}`);
});

test("RED-FIRST arm 1 — mutated: RESIDUAL forced to MITIGATED in the table goes red on the same input", () => {
  const statusPath = tmpStatusFile({
    1: { status: "RESIDUAL", evidence: "x", date: "2026-01-01", residual: "a real remainder" },
  });
  // Mutate the EXACT condition the bite names — RESIDUAL's own table entry —
  // via the injectable `triageTable` parameter, never module internals.
  const mutatedTable = { ...ms.TRIAGE_BY_STATUS, RESIDUAL: { verdict: "MITIGATED", why: null } };
  const mutated = ms.rowTriage(1, { statusPath, triageTable: mutatedTable });
  assert.equal(mutated.verdict, "MITIGATED",
    "the mutation is confirmed live: RESIDUAL now DOES map to MITIGATED under the mutated table");
  // The real assertion this proof exists for: production code (the default
  // TRIAGE_BY_STATUS, no override) must never produce this.
  const real = ms.rowTriage(1, { statusPath });
  assert.notEqual(real.verdict, "MITIGATED",
    "the shipped table must not exhibit the mutated table's behaviour");
  assert.equal(real.verdict, "KNOWN-OPEN");
});

// --- RED-FIRST, arm 2: a row absent from the status file must refuse, ------
// never fall through to a verdict ------------------------------------------

test("RED-FIRST arm 2 — baseline: a present row yields a real verdict, not a refusal", () => {
  const statusPath = tmpStatusFile({ 4: { status: "OPEN", evidence: "x", date: "2026-01-01", residual: null } });
  const baseline = ms.rowTriage(4, { statusPath });
  assert.equal(baseline.ok, true, `baseline must succeed before the mutation proof: ${JSON.stringify(baseline)}`);
  assert.equal(baseline.verdict, "KNOWN-OPEN");
});

test("RED-FIRST arm 2 — mutated: disabling the presence check on a missing row turns a refusal into a fabricated verdict", () => {
  const statusPath = tmpStatusFile({ 4: { status: "OPEN", evidence: "x", date: "2026-01-01", residual: null } });
  // The real reader refuses row 97 (not present) — this is the guard we are
  // proving matters, by simulating what its ABSENCE would do: a row-lookup
  // that falls back to a NEIGHBOUR entry instead of failing closed.
  const real = ms.rowTriage(97, { statusPath });
  assert.equal(real.ok, false, "the shipped reader refuses a missing row");
  // Disabled arm: read the JSON directly and fall back to row 4's entry
  // instead of refusing — the exact shape a missing presence-check would
  // produce, reproduced here without touching module internals.
  const raw = JSON.parse(readFileSync(statusPath, "utf8"));
  const fallbackEntry = raw["97"] ?? raw["4"]; // <- the disabled guard
  const fabricated = ms.TRIAGE_BY_STATUS[fallbackEntry.status];
  assert.ok(fabricated, "the disabled arm DOES produce a verdict for a row that does not exist");
  assert.equal(fabricated.verdict, "KNOWN-OPEN",
    "a missing-row guard's absence would silently hand a reader row 4's verdict for row 97 — never observed from the shipped reader, which is exactly the point");
});

// --- readRecords: the THIRD answer, which is the whole reason phase 3 wires
// this into the sweep rather than leaving it in the suite -------------------
//
// The suite runs with a human present and a repo in place. `gate-live` runs at
// 07:55 with nobody watching, on trees that may not have these files at all
// (upstream checkouts have no BACKLOG.md and no status file). There, a zero is
// the dangerous value: it reads exactly like "checked and clean" while meaning
// "never looked". These three bites pin the distinction the sweep depends on.

test("readRecords: over the real repo it is ok, 29 rows, zero findings", () => {
  const res = ms.readRecords();
  assert.equal(res.ok, true, `expected ok, got ${JSON.stringify(res)}`);
  assert.equal(res.rows, 29);
  assert.deepEqual(res.findings, [], formatFindings(res.findings ?? []));
});

test("readRecords: an ABSENT status file is could-not-verify, never zero findings", () => {
  const res = ms.readRecords({ statusPath: join(REPO, "docs/directives/no-such-status.json") });
  assert.equal(res.ok, false, "an unreadable input must not report a clean run");
  assert.match(res.reason, /status file unreadable/);
  assert.equal(res.findings, undefined, "there must be no finding list at all — an empty one would read as clean");
});

test("readRecords: a matrix that parses to ZERO rows is could-not-verify, not 29 extra rows", () => {
  // The failure this pins is not hypothetical: if the row-header shape ever
  // changes, a naive reader reports every status row as an EXTRA row — a loud
  // instrument shouting about the wrong thing, which is how a real defect gets
  // buried under noise nobody believes.
  const res = ms.readRecords({ matrixPath: join(REPO, "package.json") });
  assert.equal(res.ok, false);
  assert.match(res.reason, /ZERO rows/);
});
