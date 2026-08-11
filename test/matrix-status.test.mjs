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
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STATUS_PATH = join(REPO, "docs/directives/robustness-threat-matrix.status.json");
const MATRIX_PATH = join(REPO, "docs/directives/robustness-threat-matrix.md");

const VALID_STATUSES = new Set([
  "SHIPPED", "RESIDUAL", "OPEN", "DECLINED",
  "ACCEPTED", "IMPOSSIBLE", "OUT-OF-SCOPE", "UNASSESSED",
]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// The matrix's row-header line shape (directive Phase 1, and confirmed at
// 84babbf: exactly 29 such lines, 1..29, no gaps, no duplicates — rows
// 18-21 live in a second three-column table and this regex catches them
// too, which is correct).
const MATRIX_ROW_RE = /^\| (\d+) \|/gm;

function parseMatrixRowNumbers(matrixText) {
  const rows = [];
  let m;
  MATRIX_ROW_RE.lastIndex = 0;
  while ((m = MATRIX_ROW_RE.exec(matrixText))) rows.push(Number(m[1]));
  return rows;
}

function gitObjectExists(token) {
  try {
    // No `^{commit}` peel — this corpus records deployment pins as TREE
    // hashes, and peeling to commit rejects those (tools/backlog-lint.mjs's
    // REAL_ENV comment, and dev-loop's "does this resolve" rule).
    execFileSync("git", ["cat-file", "-e", token], {
      cwd: REPO,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

function realPathExists(p) {
  return existsSync(join(REPO, p));
}

// Injectable resolvers, defaulted to the real ones — mirrors
// tools/backlog-lint.mjs's REAL_ENV: one named condition mutable at a time.
const REAL_ENV = {
  objectResolves: gitObjectExists,
  pathExists: realPathExists,
};

// The rule. Pure function: no I/O of its own, everything comes in via
// `env`. Returns an array of { row, label, detail } findings — empty means
// clean.
function checkMatrixStatus(statusObj, matrixRowNumbers, env = REAL_ENV) {
  const findings = [];
  const allKeys = Object.keys(statusObj);
  const rowKeys = allKeys.filter((k) => !k.startsWith("_"));
  const rowKeySet = new Set(rowKeys);
  const matrixKeySet = new Set(matrixRowNumbers.map(String));

  // UNKNOWN-UNDERSCORE-KEY — scoped: only "_" itself is the documented
  // exemption, so a future "_2" or "_note" is caught rather than silently
  // swallowed by a wide "starts with _" skip.
  for (const k of allKeys) {
    if (k.startsWith("_") && k !== "_") {
      findings.push({ row: k, label: "UNKNOWN-UNDERSCORE-KEY", detail: `unexpected underscore-prefixed key ${JSON.stringify(k)}` });
    }
  }

  // ROW-SET-MISMATCH — one finding per missing row, one per extra row.
  for (const n of matrixKeySet) {
    if (!rowKeySet.has(n)) {
      findings.push({ row: n, label: "ROW-SET-MISMATCH", detail: `matrix has row ${n}; status file does not` });
    }
  }
  for (const n of rowKeySet) {
    if (!matrixKeySet.has(n)) {
      findings.push({ row: n, label: "ROW-SET-MISMATCH", detail: `status file has row ${n}; matrix does not` });
    }
  }

  for (const key of rowKeys) {
    const entry = statusObj[key] ?? {};
    const { status, evidence, date, residual } = entry;

    if (!VALID_STATUSES.has(status)) {
      findings.push({ row: key, label: "BAD-STATUS", detail: `status ${JSON.stringify(status)} is not in the closed enum` });
    }

    if (status === "RESIDUAL") {
      const empty = residual === null || residual === undefined
        || (typeof residual === "string" && residual.trim() === "");
      if (empty) {
        findings.push({ row: key, label: "RESIDUAL-NULL", detail: `RESIDUAL row's residual is ${JSON.stringify(residual)}` });
      }
    }

    if (status === "SHIPPED" || status === "RESIDUAL") {
      // Tried as BOTH shapes — the file mixes commit hashes and repo paths
      // deliberately, and neither shape is a reliable discriminator on its
      // own (directive Phase 1).
      const asObject = typeof evidence === "string" && env.objectResolves(evidence);
      const asPath = typeof evidence === "string" && env.pathExists(evidence);
      if (!asObject && !asPath) {
        findings.push({ row: key, label: "EVIDENCE-UNRESOLVED", detail: `evidence ${JSON.stringify(evidence)} resolves as neither a git object nor a repo-relative path` });
      }
    }

    if (typeof date !== "string" || !DATE_RE.test(date)) {
      findings.push({ row: key, label: "BAD-DATE", detail: `date ${JSON.stringify(date)} does not match YYYY-MM-DD` });
    }
  }

  return findings;
}

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
