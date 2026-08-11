// matrix-status — the invariants of `docs/directives/robustness-threat-matrix.
// status.json`, as an importable rule and a CLI.
//
// WHY THIS FILE EXISTS RATHER THAN THE TEST OWNING THE RULE. The checker was
// built inside `test/matrix-status.test.mjs` (records-restructure phase 1), and
// a rule that lives in a test file has exactly one consumer: the suite. Phase 3
// needs a second — the daily sweep — and the alternative to extracting was
// `gate-live` re-deriving the same predicate, which is this repo's
// hand-rolled-identity error one level up: a second implementation of one
// invariant drifts silently and reports a disagreement nobody can explain.
// So the rule moved here, both consumers import it, and the test's own bites
// are unchanged in substance.
//
// THE THIRD ANSWER IS PART OF THE CONTRACT (docs/dev-loop.md, "A checker has
// THREE answers"): `readRecords` returns `{ ok: false, reason }` when it cannot
// READ what it grades, and never an empty finding list. A zero over a file that
// does not exist is the shape that reads as clean while proving nothing — and
// the sweep is exactly where nobody is present to notice.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const STATUS_PATH = join(REPO_ROOT, "docs/directives/robustness-threat-matrix.status.json");
export const MATRIX_PATH = join(REPO_ROOT, "docs/directives/robustness-threat-matrix.md");

// The closed enum (records-restructure directive, phase 1). Four of these are
// the non-buildable family and the split is the point: "won't build"
// (ACCEPTED), "must not build" (DECLINED), "can't build" (IMPOSSIBLE), "not
// ours to build" (OUT-OF-SCOPE).
export const VALID_STATUSES = new Set([
  "SHIPPED", "RESIDUAL", "OPEN", "DECLINED",
  "ACCEPTED", "IMPOSSIBLE", "OUT-OF-SCOPE", "UNASSESSED",
]);

export const MATRIX_STATUS_LABELS = [
  "BAD-STATUS",
  "ROW-SET-MISMATCH",
  "RESIDUAL-NULL",
  "EVIDENCE-UNRESOLVED",
  "BAD-DATE",
  "UNKNOWN-UNDERSCORE-KEY",
  "BAD-TRIAGE",
];

// The status vocabulary's TRIAGE meaning — "what does this status mean for a
// live bust walk" — as data, beside the vocabulary rather than beside its
// reader (`tools/bust-triage.mjs` imports this instead of parsing a matrix
// cell's leading token). Four of the eight are the non-buildable family and
// each carries WHY, because collapsing "won't build" / "must not build" /
// "can't build" / "not ours to build" back into a bare KNOWN-OPEN throws away
// the reason the split exists (records-restructure directive, phase 1).
//
// Only SHIPPED yields MITIGATED. RESIDUAL must NOT: a row shipped WITH a
// named remainder can bust ON that remainder, and "our mitigation worked" is
// the dangerous direction to be wrong in — this tool once answered MITIGATED
// on a live bust where nothing absorbed, by mapping a class to a ROW's
// status rather than to what actually happened (bust-triage.mjs's own
// `statusKind` docstring records the incident this table exists to end).
export const TRIAGE_BY_STATUS = Object.freeze({
  SHIPPED: Object.freeze({ verdict: "MITIGATED", why: null }),
  RESIDUAL: Object.freeze({
    verdict: "KNOWN-OPEN",
    why: "shipped WITH a named remainder — this bust may BE the remainder",
  }),
  OPEN: Object.freeze({ verdict: "KNOWN-OPEN", why: null }),
  UNASSESSED: Object.freeze({ verdict: "KNOWN-OPEN", why: "mitigability not assessed" }),
  ACCEPTED: Object.freeze({
    verdict: "KNOWN-OPEN",
    why: "WON'T BUILD — deliberately unmitigated, cost accepted",
  }),
  DECLINED: Object.freeze({
    verdict: "KNOWN-OPEN",
    why: "MUST NOT BUILD — mitigating would suppress a legitimate bust",
  }),
  IMPOSSIBLE: Object.freeze({
    verdict: "KNOWN-OPEN",
    why: "CAN'T BUILD — physics (model-keyed cache, upstream eviction, TTL)",
  }),
  "OUT-OF-SCOPE": Object.freeze({
    verdict: "KNOWN-OPEN",
    why: "NOT OURS — the mitigation lives outside this repo",
  }),
});

// The verdict vocabulary a per-row `triage` override may name —
// `bust-triage.mjs`'s own vocabulary (its header comment), never a status-
// file invention. A row whose status underdetermines its triage (row 27,
// CONTROLLED-CAUSE) sets `triage` to one of these; `why` is NOT overridden —
// the status's own reason stays attached, only the verdict shown changes.
export const TRIAGE_VERDICTS = new Set([
  "MITIGATED", "KNOWN-OPEN", "CONTROLLED-CAUSE", "UNCLASSIFIED", "UNVERIFIABLE",
]);

// The prose CLAIM vocabulary a BACKLOG.md entry uses to assert a row's
// status (`tools/backlog-lint.mjs`'s row-status lane) mapped to the set of
// enum statuses that make the claim TRUE — one home for "what a status
// means", beside TRIAGE_BY_STATUS for the same reason that table lives here
// rather than beside its reader.
//
// MITIGATED/CLOSED is the STRICT claim: only SHIPPED satisfies it. RESIDUAL
// does NOT — a row shipped WITH a named remainder is not closed, and letting
// a "row N is MITIGATED" claim pass against RESIDUAL would be the same
// over-claim TRIAGE_BY_STATUS above already refuses (RESIDUAL maps to
// KNOWN-OPEN, never MITIGATED, for exactly this reason — see its own
// comment: "our mitigation worked" is the dangerous direction to be wrong
// in).
//
// OBSERVED is deliberately ABSENT from this table and is NOT a status claim
// under the new closed enum (VALID_STATUSES, above): the OLD matrix-prose
// vocabulary (`statusKind`, bust-triage.mjs, pre-restructure) carried an
// OBSERVED kind — this enum does not. A sentence whose only status word is
// OBSERVED is skipped by the reader (lintRowStatus), and the skip is
// documented here rather than left to be rediscovered as a silent no-op.
export const CLAIM_COMPATIBILITY = Object.freeze({
  MITIGATED: new Set(["SHIPPED"]),
  CLOSED: new Set(["SHIPPED"]),
  OPEN: new Set(["OPEN", "RESIDUAL", "UNASSESSED"]),
  "RE-OPENED": new Set(["OPEN", "RESIDUAL", "UNASSESSED"]),
  ACCEPTED: new Set(["ACCEPTED", "DECLINED", "IMPOSSIBLE", "OUT-OF-SCOPE"]),
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// The matrix's row-header shape. Rows 18-21 live in a SECOND three-column
// table and this catches them too, which is correct — a row is a row.
const MATRIX_ROW_RE = /^\| (\d+) \|/gm;

export function parseMatrixRowNumbers(matrixText) {
  const rows = [];
  let m;
  MATRIX_ROW_RE.lastIndex = 0;
  while ((m = MATRIX_ROW_RE.exec(matrixText))) rows.push(Number(m[1]));
  return rows;
}

function gitObjectExists(token) {
  try {
    // No `^{commit}` peel: this corpus records deployment pins as TREE hashes
    // and peeling rejects those — four live pins once read as dead that way.
    // The question is "does this resolve", never "as the type I expected".
    execFileSync("git", ["cat-file", "-e", token], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

export const REAL_ENV = {
  objectResolves: gitObjectExists,
  pathExists: (p) => existsSync(join(REPO_ROOT, p)),
};

/**
 * The rule. Pure: no I/O of its own, every resolver arrives via `env`, so one
 * named condition can be mutated at a time.
 * @returns {{row: string, label: string, detail: string}[]} empty means clean
 */
export function checkMatrixStatus(statusObj, matrixRowNumbers, env = REAL_ENV) {
  const findings = [];
  const allKeys = Object.keys(statusObj);
  const rowKeys = allKeys.filter((k) => !k.startsWith("_"));
  const rowKeySet = new Set(rowKeys);
  const matrixKeySet = new Set(matrixRowNumbers.map(String));

  // Scoped exemption: only "_" itself is documented, so a future "_2" or
  // "_note" is caught rather than swallowed by a wide starts-with skip.
  for (const k of allKeys) {
    if (k.startsWith("_") && k !== "_") {
      findings.push({
        row: k,
        label: "UNKNOWN-UNDERSCORE-KEY",
        detail: `unexpected underscore-prefixed key ${JSON.stringify(k)}`,
      });
    }
  }

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

    // The optional per-row override. Present only where the status
    // underdetermines the triage verdict (row 27, ACCEPTED but really
    // CONTROLLED-CAUSE) — a value outside bust-triage's own vocabulary would
    // silently reach a reader as an unrecognised verdict.
    if ("triage" in entry) {
      if (!TRIAGE_VERDICTS.has(entry.triage)) {
        findings.push({
          row: key,
          label: "BAD-TRIAGE",
          detail: `triage ${JSON.stringify(entry.triage)} is not in bust-triage's verdict vocabulary`,
        });
      }
    }

    if (status === "RESIDUAL") {
      const empty =
        residual === null ||
        residual === undefined ||
        (typeof residual === "string" && residual.trim() === "");
      if (empty) {
        findings.push({ row: key, label: "RESIDUAL-NULL", detail: `RESIDUAL row's residual is ${JSON.stringify(residual)}` });
      }
    }

    if (status === "SHIPPED" || status === "RESIDUAL") {
      // Tried as BOTH shapes: the file mixes commit hashes and repo paths
      // deliberately and neither shape discriminates on its own.
      const asObject = typeof evidence === "string" && env.objectResolves(evidence);
      const asPath = typeof evidence === "string" && env.pathExists(evidence);
      if (!asObject && !asPath) {
        findings.push({
          row: key,
          label: "EVIDENCE-UNRESOLVED",
          detail: `evidence ${JSON.stringify(evidence)} resolves as neither a git object nor a repo-relative path`,
        });
      }
    }

    if (typeof date !== "string" || !DATE_RE.test(date)) {
      findings.push({ row: key, label: "BAD-DATE", detail: `date ${JSON.stringify(date)} does not match YYYY-MM-DD` });
    }
  }

  return findings;
}

/**
 * Read both artifacts and grade them. THREE answers, never two: an unreadable
 * input is `ok:false` with its reason, which the sweep prints as
 * could-not-verify — a zero here would be an absence wearing a verdict's
 * clothes.
 */
export function readRecords({ statusPath = STATUS_PATH, matrixPath = MATRIX_PATH, env = REAL_ENV } = {}) {
  let statusObj;
  try {
    statusObj = JSON.parse(readFileSync(statusPath, "utf8"));
  } catch (e) {
    return { ok: false, reason: `status file unreadable: ${e?.message ?? e}` };
  }
  let matrixText;
  try {
    matrixText = readFileSync(matrixPath, "utf8");
  } catch (e) {
    return { ok: false, reason: `matrix unreadable: ${e?.message ?? e}` };
  }
  const rows = parseMatrixRowNumbers(matrixText);
  if (rows.length === 0) {
    // A matrix that parses to zero rows would make every status row an
    // "extra" and the count meaningless — an instrument reporting loudly
    // about the wrong thing. Say what actually happened instead.
    return { ok: false, reason: "matrix parsed to ZERO rows — the row-header shape changed or the file is not the matrix" };
  }
  const findings = checkMatrixStatus(statusObj, rows, env);
  const counts = {};
  for (const l of MATRIX_STATUS_LABELS) counts[l] = 0;
  for (const f of findings) counts[f.label] = (counts[f.label] ?? 0) + 1;
  return { ok: true, rows: rows.length, findings, counts };
}

export function formatMatrixStatusFinding(f) {
  return `WARN matrix-status row=${f.row} ${f.label} ${f.detail}`;
}

/**
 * Row N's raw status-file entry. THREE answers: a missing/unparseable file
 * or a row this status file does not carry is `ok:false` with its reason —
 * never a default entry a caller could mistake for a real one.
 */
export function readRowStatus(n, { statusPath = STATUS_PATH } = {}) {
  let statusObj;
  try {
    statusObj = JSON.parse(readFileSync(statusPath, "utf8"));
  } catch (e) {
    return { ok: false, reason: `status file unreadable: ${e?.message ?? e}` };
  }
  const entry = statusObj[String(n)];
  if (!entry) {
    return { ok: false, reason: `row ${n} is not present in the status file` };
  }
  return { ok: true, entry };
}

/**
 * Row N's TRIAGE verdict — the reader a live bust walk calls instead of
 * parsing the matrix's own prose (`bust-triage.mjs`'s row-based verdict
 * path). `triageTable` is injectable so a red-first mutation proof (RESIDUAL
 * wrongly mapped to MITIGATED) can mutate the exact table this function
 * reads without reaching into module internals (dev-loop, "Adding a check" —
 * a mutation must remove the exact condition the bite names).
 */
export function rowTriage(n, { statusPath = STATUS_PATH, triageTable = TRIAGE_BY_STATUS } = {}) {
  const read = readRowStatus(n, { statusPath });
  if (!read.ok) return read;
  const { status, triage } = read.entry;
  const base = triageTable[status];
  if (!base) {
    return { ok: false, reason: `row ${n}'s status ${JSON.stringify(status)} has no triage mapping` };
  }
  return { ok: true, status, verdict: triage ?? base.verdict, why: base.why };
}

// `node tools/matrix-status.mjs` — exit 0 clean, 2 findings, 1 could-not-verify.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const res = readRecords();
  if (!res.ok) {
    process.stdout.write(`matrix-status: COULD NOT VERIFY — ${res.reason}\n`);
    process.exit(1);
  }
  for (const f of res.findings) process.stdout.write(formatMatrixStatusFinding(f) + "\n");
  process.stdout.write(
    `matrix-status: ${res.findings.length} finding(s) over ${res.rows} matrix row(s)\n`,
  );
  process.exit(res.findings.length === 0 ? 0 : 2);
}
