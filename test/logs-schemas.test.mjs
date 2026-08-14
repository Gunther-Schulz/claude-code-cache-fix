// logs-schemas — tests for tools/logs.mjs, the reader that owns the schemas
// of every format this repo writes (BACKLOG.md, "READY — one reader owns
// the schemas of everything this repo writes, and it THROWS on an unknown
// field instead of returning `null`").
//
// The two required red-first bites replay the two REAL wrong reads that
// reached the operator as fact on 2026-08-10, in one bust walk, before
// being caught: a capture OUTCOME record asked for `cache_read_input_tokens`
// (usage.jsonl's spelling), and a prefix-diff EVENT row asked for
// `messageCountPrev` (`-diff.json`'s spelling).
//
// RED-FIRST PROOF (see the shipping commit's report for the pasted
// transcript): the module did not exist before this file, so an import-time
// "no export" failure would have been a VACUOUS red per dev-loop.md's
// module-load-red rule. Instead each of the two required THROW bites was
// proven red by disabling its accessor one at a time (the `throw
// unknownFieldError(...)` line in tools/logs.mjs temporarily replaced with
// `return undefined`), the bite shown to fail, then the accessor restored.
// BASELINE, run before this file existed: `npm test` — 2588 tests, 2584
// pass, 0 fail, 4 skipped.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { tmpDirSync } from "../tools/tmpdir.mjs";

import {
  readCaptureRequest,
  readCaptureOutcome,
  readUsageLogRecord,
  readPrefixDiffEvent,
  readPrefixDiffDiff,
  readPrefixDiffLast,
  prefixDiffTenant,
  readCensusDuplicateRow,
  readCensusDuplicateMember,
  readCensusDuplicateMemberOutcome,
  readCensusMismatchRow,
  readCensusPlacementRow,
  readCensusVolatileRow,
  cacheReadOf,
  cacheCreationOf,
  messageCountsOf,
} from "../tools/logs.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const fixtures = JSON.parse(readFileSync(join(__dirname, "fixtures/logs-schemas.json"), "utf-8"));

// ---------------------------------------------------------------------------
// Required red-first bite 1: OUTCOME record asked for usage.jsonl's spelling.
// ---------------------------------------------------------------------------

test("THROW: a capture OUTCOME record asked for cache_read_input_tokens (usage.jsonl's spelling)", () => {
  const view = readCaptureOutcome(fixtures.captureOutcome);
  assert.throws(
    () => view.cache_read_input_tokens,
    /unknown field "cache_read_input_tokens" for format "captureOutcome"/,
  );
});

test("THROW: the same OUTCOME record's usage object asked for cache_read_input_tokens too", () => {
  const view = readCaptureOutcome(fixtures.captureOutcome);
  assert.throws(
    () => view.usage.cache_read_input_tokens,
    /unknown field "cache_read_input_tokens" for format "captureOutcome\.usage"/,
  );
});

test("CORRECT: the same OUTCOME record's own spelling (usage.cacheRead/cacheCreation) returns the right numbers", () => {
  const view = readCaptureOutcome(fixtures.captureOutcome);
  assert.equal(view.usage.cacheRead, 15603);
  assert.equal(view.usage.cacheCreation, 213429);
});

// ---------------------------------------------------------------------------
// Required red-first bite 2: prefix-diff EVENT row asked for -diff.json's
// spelling.
// ---------------------------------------------------------------------------

test("THROW: a prefix-diff EVENT row asked for messageCountPrev (-diff.json's spelling)", () => {
  const view = readPrefixDiffEvent(fixtures.prefixDiffEvent);
  assert.throws(
    () => view.messageCountPrev,
    /unknown field "messageCountPrev" for format "prefixDiffEvent"/,
  );
});

test("THROW: the same EVENT row asked for messageCountNow too", () => {
  const view = readPrefixDiffEvent(fixtures.prefixDiffEvent);
  assert.throws(
    () => view.messageCountNow,
    /unknown field "messageCountNow" for format "prefixDiffEvent"/,
  );
});

test("CORRECT: the same EVENT row's own spelling (msgs, parsed via messageCountsOf) returns the right numbers", () => {
  const view = readPrefixDiffEvent(fixtures.prefixDiffEvent);
  assert.equal(view.msgs, "3->4");
  assert.deepEqual(messageCountsOf(view), { prev: 3, now: 4 });
});

test("CORRECT: a -diff.json record's own spelling returns the same numbers directly", () => {
  const view = readPrefixDiffDiff(fixtures.prefixDiffDiff);
  assert.equal(view.messageCountPrev, 3);
  assert.equal(view.messageCountNow, 4);
  assert.deepEqual(messageCountsOf(view), { prev: 3, now: 4 });
});

// ---------------------------------------------------------------------------
// Required red-first bite 3 (this dispatch's own): a census duplicateRow
// member's capture-outcome usage asked for the misspelled "cacheReads"
// (dispatch brief D-logs-view's red-first arrangement) — the same
// wrong-field-name mistake bites 1/2 above replay, on the new censusExport
// view family. RED-FIRST PROOF (report carries the pasted transcript): run
// against the UNCHANGED base (before this view existed), this bite fails —
// there is no `readCensusDuplicateMemberOutcome` export to call at all.
// ---------------------------------------------------------------------------

const censusOutcomeFixture = {
  requestId: "req_EXAMPLE22222222222222222",
  model: "claude-opus-5",
  ms: 1234,
  usage: { cacheRead: 15603, cacheCreation: 213429, inputTokens: 500, outputTokens: 2 },
};

test("THROW: a census duplicateRow member outcome's usage asked for cacheReads (misspelled, not the schema's cacheRead)", () => {
  const view = readCensusDuplicateMemberOutcome(censusOutcomeFixture);
  assert.throws(
    () => view.usage.cacheReads,
    /unknown field "cacheReads" for format "censusExport\.duplicateRow\.member\.outcome\.usage"/,
  );
});

test("CORRECT: the same usage object's real spelling (cacheRead/cacheCreation) parses clean, and cacheReadOf/cacheCreationOf normalize it", () => {
  const view = readCensusDuplicateMemberOutcome(censusOutcomeFixture);
  assert.equal(view.usage.cacheRead, 15603);
  assert.equal(view.usage.cacheCreation, 213429);
  assert.equal(cacheReadOf(view), 15603);
  assert.equal(cacheCreationOf(view), 213429);
});

test("CORRECT: a full duplicateRow (members[].outcome.usage nested) parses clean end to end", () => {
  const raw = {
    path: "/x/s-example-requests.jsonl", cid: "cid-1", sid: "sid-1", length: 2,
    billed: 2, noId: 0, startTs: "2026-08-14T00:00:00.000Z", startLine: 100,
    lastTs: "2026-08-14T00:00:03.000Z", lastLine: 101, model: "claude-opus-5",
    nMsg: 6, maxTokens: 64000, intervalMs: 3000,
    members: [
      { id: "id-100", ts: "2026-08-14T00:00:00.000Z", line: 100, outcome: censusOutcomeFixture },
      { id: "id-101", ts: "2026-08-14T00:00:03.000Z", line: 101, outcome: null },
    ],
  };
  const view = readCensusDuplicateRow(raw);
  assert.equal(view.billed, 2);
  assert.equal(view.members.length, 2);
  assert.equal(cacheReadOf(view.members[0].outcome), 15603);
  assert.equal(view.members[1].outcome, null);
  assert.throws(() => view.notAField, /unknown field "notAField" for format "censusExport\.duplicateRow"/);
});

test("THROW: a raw duplicateRow member wrapped directly (readCensusDuplicateMember) rejects an unknown top-level field", () => {
  const view = readCensusDuplicateMember({ id: "id-1", ts: "t", line: 1, outcome: null });
  assert.throws(() => view.requestId, /unknown field "requestId" for format "censusExport\.duplicateRow\.member"/);
});

// ---------------------------------------------------------------------------
// censusExport.mismatchRow / placementRow / volatileRow — basic strictness,
// no adopting consumer yet (booked ahead of one, same posture logs.mjs's own
// header takes) — one throw + one correct-spelling bite each.
// ---------------------------------------------------------------------------

test("censusExport.mismatchRow: known fields read correctly, unknown field throws, optional wrappedSub/unrelatedDiag default to null when omitted", () => {
  const raw = {
    path: "/x/s-example-requests.jsonl", ts: "2026-08-14T00:00:00.000Z", host: 3, blocks: 1,
    verdict: "MISMATCH", j: null, text: "", recon: "recon-text", sub: null,
    rejectedCandidate: { j: 5, chars: 40, text: "candidate text" },
    hostPruned: false, hostIdless: false, mismatchSub: "UNRELATED",
    wrapped: null,
  };
  const view = readCensusMismatchRow(raw);
  assert.equal(view.mismatchSub, "UNRELATED");
  assert.equal(view.rejectedCandidate.chars, 40);
  assert.equal(view.wrapped, null);
  assert.equal(view.wrappedSub, null, "omitted optional field reads back its declared default");
  assert.equal(view.unrelatedDiag, null, "omitted optional field reads back its declared default");
  assert.throws(() => view.notAField, /unknown field "notAField" for format "censusExport\.mismatchRow"/);
});

test("censusExport.placementRow: known fields read correctly, unknown field throws", () => {
  const raw = {
    path: "/x/s-example-requests.jsonl", ts: "2026-08-14T00:00:00.000Z", verdict: "EXACT",
    blocks: 1, hostIndexBefore: 3, nBefore: 10, hostIndexAfter: 4, standaloneIndex: 6,
    nAfter: 11, offset: 2, placementClass: "MODE-SAMPLE",
    between: [{ role: "user", kind: ["tool_result"] }], betweenTruncated: 3,
  };
  const view = readCensusPlacementRow(raw);
  assert.equal(view.offset, 2);
  // The row-4 placement fields, joined 2026-08-14 once their writer was on
  // main. This bite previously asserted `.between` THREW — correct on the
  // base this view was written against, and the marker that made the join
  // visible instead of silent. Both arms were re-proven against a real
  // corpus-wide export before the names were added (46 placement rows, 21
  // with a non-empty vector): removing the two names makes this read throw
  // again, which is what keeps the assertion below from being vacuous.
  assert.deepEqual(view.between, [{ role: "user", kind: ["tool_result"] }]);
  assert.equal(view.betweenTruncated, 3, "the cap-reports-what-it-dropped counter rides beside it");
  assert.throws(() => view.betweenTypo, /unknown field "betweenTypo" for format "censusExport\.placementRow"/,
    "a near-miss spelling is still rejected — the join widened the view by exactly two names");
});

test("censusExport.volatileRow: known fields read correctly, unknown field throws", () => {
  const raw = {
    path: "/x/s-example-requests.jsonl", sid: "sid-1", ts: "2026-08-14T00:00:00.000Z", cid: "cid-1",
    line: 5, req: 2, occurrences: 1, lastTs: "2026-08-14T00:00:00.000Z", lastLine: 5, lastReq: 2,
    kind: "IN-PLACE-TEXT", index: 3, h: "hash", key: "h|r|o", firstBytes: 100, nowBytes: 120,
    divOffset: 10, cacheControlExempt: false,
  };
  const view = readCensusVolatileRow(raw);
  assert.equal(view.kind, "IN-PLACE-TEXT");
  assert.throws(() => view.entryId, /unknown field "entryId" for format "censusExport\.volatileRow"/);
});

// ---------------------------------------------------------------------------
// Known positive, real data (not planted): the frozen 04:40:39.598Z outcome.
// ---------------------------------------------------------------------------

test("KNOWN POSITIVE: the frozen 04:40:39.598Z outcome reads cacheRead=15603, cacheCreation=213429", () => {
  assert.equal(fixtures.captureOutcome.ts, "2026-08-10T04:40:39.598Z");
  const view = readCaptureOutcome(fixtures.captureOutcome);
  assert.equal(view.usage.cacheRead, 15603);
  assert.equal(view.usage.cacheCreation, 213429);
  assert.equal(cacheReadOf(view), 15603);
  assert.equal(cacheCreationOf(view), 213429);
});

// ---------------------------------------------------------------------------
// Over-firing control: a record legitimately missing an OPTIONAL field
// returns its declared default and does NOT throw.
// ---------------------------------------------------------------------------

const USAGE_LOG_OPTIONAL_FIELDS = [
  "requested_model", "model_mismatch", "qoverage_util", "qrepresentative_claim",
  "org_id", "overage_disabled_reason", "request_id", "agent_id", "agent_id_source",
];

test("over-firing control: usageLogMinimal genuinely omits every optional field (declared as data, not asserted by feel)", () => {
  for (const f of USAGE_LOG_OPTIONAL_FIELDS) {
    assert.ok(!(f in fixtures.usageLogMinimal), `fixture must genuinely omit "${f}" for this control to mean anything`);
  }
});

test("over-firing control: reading a missing optional field returns its declared default, no throw", () => {
  const view = readUsageLogRecord(fixtures.usageLogMinimal);
  assert.equal(view.requested_model, null);
  assert.equal(view.model_mismatch, false);
  assert.equal(view.qoverage_util, null);
  assert.equal(view.qrepresentative_claim, null);
  assert.equal(view.org_id, null);
  assert.equal(view.overage_disabled_reason, null);
  assert.equal(view.request_id, null);
  assert.equal(view.agent_id, null);
  assert.equal(view.agent_id_source, null);
});

test("over-firing control, positive half: the SAME optional fields, when genuinely present, return the real value", () => {
  const view = readUsageLogRecord(fixtures.usageLogFull);
  assert.equal(view.org_id, "EXAMPLE-ORG-HASH");
  assert.equal(view.request_id, "req_EXAMPLE11111111111111111");
  assert.equal(view.model_mismatch, false);
  assert.equal(view.qoverage_util, 0.1);
});

test("required fields on usageLogMinimal still read correctly (the control does not mask required fields)", () => {
  const view = readUsageLogRecord(fixtures.usageLogMinimal);
  assert.equal(view.cache_read_input_tokens, 500);
  assert.equal(view.cache_creation_input_tokens, 1000);
  assert.equal(cacheReadOf(view), 500);
  assert.equal(cacheCreationOf(view), 1000);
});

// ---------------------------------------------------------------------------
// Cross-format normalization — the incident's positive half: one accessor
// name, correct on either on-disk spelling.
// ---------------------------------------------------------------------------

test("cacheReadOf/cacheCreationOf normalize the SAME concept across captureOutcome and usageLog", () => {
  const outcome = readCaptureOutcome(fixtures.captureOutcome);
  const usage = readUsageLogRecord(fixtures.usageLogFull); // mirrors the same real values
  assert.equal(cacheReadOf(outcome), 15603);
  assert.equal(cacheReadOf(usage), 15603);
  assert.equal(cacheCreationOf(outcome), 213429);
  assert.equal(cacheCreationOf(usage), 213429);
});

test("cacheReadOf throws on a format it does not normalize", () => {
  const event = readPrefixDiffEvent(fixtures.prefixDiffEvent);
  assert.throws(() => cacheReadOf(event), /has no mapping for format "prefixDiffEvent"/);
});

test("messageCountsOf throws on a format it does not normalize (prefixDiffLast has no \"prev\" of its own)", () => {
  const last = readPrefixDiffLast(fixtures.prefixDiffLast);
  assert.throws(() => messageCountsOf(last), /has no mapping for format "prefixDiffLast"/);
});

// ---------------------------------------------------------------------------
// captureRequest and prefixDiffLast/tenant — basic strictness, both readers.
// ---------------------------------------------------------------------------

test("captureRequest: known fields read correctly, unknown fields throw at both levels", () => {
  const view = readCaptureRequest(fixtures.captureRequest);
  assert.equal(view.body.model, "claude-example-5");
  assert.equal(view.body.max_tokens, 1);
  assert.throws(() => view.usage, /unknown field "usage" for format "captureRequest"/);
  assert.throws(() => view.body.cacheRead, /unknown field "cacheRead" for format "captureRequest\.body"/);
});

test("prefixDiffLast/prefixDiffTenant: known fields read correctly, unknown fields throw, an unknown tenant id is undefined (data, not a schema violation)", () => {
  const last = readPrefixDiffLast(fixtures.prefixDiffLast);
  assert.equal(last.lastTenant, "EXAMPLE-TENANT-0001");
  const tenant = prefixDiffTenant(last, last.lastTenant);
  assert.equal(tenant.messageCount, 4);
  assert.throws(
    () => tenant.messageCountPrev,
    /unknown field "messageCountPrev" for format "prefixDiffLast\.tenant"/,
  );
  assert.equal(prefixDiffTenant(last, "NO-SUCH-TENANT"), undefined);
});

// ---------------------------------------------------------------------------
// Companion scope lint (mirrors test/xdg-writer-guard.test.mjs's form): a
// known schema's raw field names must not appear outside tools/logs.mjs and
// the writer files named in its header comment.
// ---------------------------------------------------------------------------

const LOGS_SCHEMA_OWNERS = new Set([
  "tools/logs.mjs",
  "proxy/stream.mjs",
  "proxy/extensions/usage-log.mjs",
  "proxy/extensions/prefix-diff.mjs",
  "proxy/extensions/request-capture.mjs",
]);

// Distinctive enough to grep safely — generic names like "model" or "ts"
// would false-positive across the whole repo. Restricted to the camelCase
// capture/prefix-diff spellings, which are NOT also part of Anthropic's own
// wire vocabulary. usage.jsonl's snake_case field names
// (cache_read_input_tokens etc.) are deliberately EXCLUDED: they are also
// the literal field names of Anthropic's own `usage` object as it appears
// in a raw API response or a CC transcript, so a text pattern alone cannot
// tell "reads our usage.jsonl" from "reads a live API response" — scoping
// that precisely needs parse-site provenance, out of scope here.
const SCHEMA_FIELD_PATTERN = /\b(cacheRead|cacheCreation|ephemeral1h|ephemeral5m|messageCountPrev|messageCountNow)\b/;

// A second, independent signal: the file must also name one of the on-disk
// paths these formats actually live at. Two signals, not one — a lone
// field-name hit already produces a documented false positive below (the
// KNOWN LIMITATION test).
const DISK_PATH_PATTERN = /-requests\.jsonl|usage\.jsonl/;

function isLogsSchemaOwner(relPath) {
  return LOGS_SCHEMA_OWNERS.has(relPath);
}

function checkLogsSchemaScope(relPath, content) {
  if (isLogsSchemaOwner(relPath)) return { inScope: false, violations: [] };
  if (!DISK_PATH_PATTERN.test(content)) return { inScope: false, violations: [] };
  const lines = content.split("\n");
  const violations = [];
  lines.forEach((line, i) => {
    if (SCHEMA_FIELD_PATTERN.test(line)) violations.push({ line: i + 1, text: line.trim() });
  });
  return { inScope: true, violations };
}

test("scope: an owner file is out of scope regardless of citations", () => {
  const content = [
    'import { statePath } from "../xdg-dirs.mjs";',
    "// writes usage.jsonl records",
    "export function f() { return { cacheRead: 1 }; }",
  ].join("\n");
  assert.equal(checkLogsSchemaScope("tools/logs.mjs", content).inScope, false);
});

test("scope: a non-owner file with the path AND a schema field name is in scope and flagged", () => {
  const content = [
    "// reads ~/.local/state/cache-fix/usage.jsonl by hand",
    "const cr = row.cacheRead ?? 0;",
  ].join("\n");
  const result = checkLogsSchemaScope("tools/fake-consumer.mjs", content);
  assert.equal(result.inScope, true);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].line, 2);
});

test("scope: a field-name hit with NO disk-path mention is out of scope (the field name alone proves nothing)", () => {
  const content = "const cacheRead = 12; // just a local variable, no file read in sight";
  assert.equal(checkLogsSchemaScope("tools/unrelated.mjs", content).inScope, false);
});

test("scope: a disk-path mention with NO schema field name is in scope but silent", () => {
  const content = "// this tool reads usage.jsonl but never touches its cache fields";
  const result = checkLogsSchemaScope("tools/unrelated2.mjs", content);
  assert.equal(result.inScope, true);
  assert.deepEqual(result.violations, []);
});

// INSTRUMENT-POSITIVE: the pattern must be shown catching a REAL file before
// any zero from it is trusted — a pattern that could never match returns
// exactly what a true absence returns.
test("INSTRUMENT-POSITIVE: tools/cold-events.mjs — a real, live, unambiguous hand-parse of the captureOutcome schema", () => {
  const content = readFileSync(join(REPO_ROOT, "tools/cold-events.mjs"), "utf-8");
  const result = checkLogsSchemaScope("tools/cold-events.mjs", content);
  assert.equal(result.inScope, true, "cold-events.mjs names -requests.jsonl in its own header comment — must be in scope");
  const lines = content.split("\n");
  assert.ok(
    result.violations.some((v) => /u\.cacheCreation|u\.cacheRead/.test(lines[v.line - 1])),
    "must catch the real rec.usage.cacheRead/cacheCreation hand-parse in normalizeRow's captureOutcome branch",
  );
});

// KNOWN LIMITATION, surfaced rather than silently avoided: the two-signal
// predicate still false-positives when a file legitimately mentions
// "usage.jsonl" (in a doc comment or default-path constant) AND separately
// uses one of the schema's field-name identifiers for something entirely
// unrelated. Measured real instance: tools/cost-report.mjs names
// "usage.jsonl" as its own default input source, and ~140 lines away uses a
// LOCAL VARIABLE named `cacheRead` to hold a dollar rate parsed out of
// Anthropic's pricing-page HTML — no JSONL parsing anywhere near it. Fixing
// this precisely needs parse-site provenance (which JSON.parse call
// produced the variable), which a text pattern cannot see; that is a real
// gap in THIS LINT, not a defect in cost-report.mjs, and it is named here
// rather than hidden behind an untested "should be clean" claim.
test("KNOWN LIMITATION: tools/cost-report.mjs false-positives — a coincidental cacheRead variable near an unrelated usage.jsonl mention", () => {
  const content = readFileSync(join(REPO_ROOT, "tools/cost-report.mjs"), "utf-8");
  const result = checkLogsSchemaScope("tools/cost-report.mjs", content);
  assert.equal(result.inScope, true);
  assert.ok(result.violations.length > 0, "documents the false positive rather than asserting an unverified clean bill");
});

// ---------------------------------------------------------------------------
// THE SWEEP — the half the entry actually asked for: "a new call site that
// hand-parses fails the bite".
//
// A predicate exercised only on synthetic strings answers nothing about THIS
// repo. That is a checker wired to no consumer, and it is a shape this repo
// keeps re-learning: `tools/xdg-writer-guard.mjs` sits red at 34 violations
// while `npm test` is green, because its test exercises the predicate and
// never runs it over the tree (measured 2026-08-10).
//
// The inventory is PATHS, never a COUNT — a blocking assert on a hardcoded
// number stops validating anything the day the number legitimately moves.
// Two declared categories, each VERIFIED by the check rather than trusted:
//
//   EXEMPT     — a measured false positive. The repair for a guard that fires
//                on legitimate work is a declared exemption the guard itself
//                verifies (the legitimate case named in data it checks), never
//                a softened predicate and never an override habit. `mustMatch`
//                is what makes it self-verifying: if the exempted line stops
//                being the thing the exemption describes, this fails loudly
//                instead of blanketing whatever moved in underneath it.
//   KNOWN-OPEN — a REAL hand-parse the lint correctly catches, left standing
//                because adopting the reader is a SEPARATE booked entry.
//                Inventoried so a known backlog can never read as a clean
//                tree, and so a NEW hand-parse still fails.
// ---------------------------------------------------------------------------

const SWEEP_EXEMPT = [{
  path: "tools/cost-report.mjs",
  // Measured false positive: the file names "usage.jsonl" as its own default
  // input (signal 1) and, ~140 lines away, binds a LOCAL variable `cacheRead`
  // to a dollar rate parsed out of Anthropic's pricing-page HTML (signal 2).
  // No JSONL parsing is anywhere near it. Separating this precisely needs
  // parse-site provenance an AST would give and a text pattern cannot.
  mustMatch: /parseFloat\(match\[\d+\]\)|cache_read:\s*cacheRead/,
  reason: "pricing-page dollar rate coincidentally named cacheRead",
}];

const SWEEP_KNOWN_OPEN = [{
  path: "tools/cold-events.mjs",
  reason: "genuine captureOutcome hand-parse (u.cacheRead/u.cacheCreation); " +
          "adopting tools/logs.mjs here is a separate booked entry",
}];
// tools/duplicate-billing.mjs LEFT this inventory 2026-08-14: it now adopts
// tools/logs.mjs's censusExport view family (`readCensusDuplicateRow`,
// `readCensusDuplicateMember`, `readCensusDuplicateMemberOutcome`) for its
// duplicateRows side, and calls `cacheReadOf`/`cacheCreationOf` rather than
// naming the census export's own capture-outcome field spellings — this
// SWEEP test is what verifies that (it would fail again the moment a hand
// parse crept back in, exactly like any other unexpected file).

// Pure so a planted file can be fed straight in — the instrument-positive
// below depends on not needing the real filesystem to prove the sweep fires.
export function classifySweep(files) {
  const exemptByPath = new Map(SWEEP_EXEMPT.map((e) => [e.path, e]));
  const knownOpen = new Set(SWEEP_KNOWN_OPEN.map((e) => e.path));
  const unexpected = [];
  const staleExemptions = [];
  for (const { path, content } of files) {
    const { inScope, violations } = checkLogsSchemaScope(path, content);
    if (!inScope || violations.length === 0) continue;
    const exempt = exemptByPath.get(path);
    if (exempt) {
      // Self-verification: the exemption must still describe a line that is
      // actually there. An exemption that no longer matches is not a pass.
      if (!violations.some((v) => exempt.mustMatch.test(v.text))) {
        staleExemptions.push({ path, reason: exempt.reason });
      }
      continue;
    }
    if (knownOpen.has(path)) continue;
    unexpected.push({ path, violations });
  }
  return { unexpected, staleExemptions };
}

// BACKLOG (moved-in entry) — "git stash/pop across a git mv desyncs the
// index, and this sweep reports it as an unrelated ENOENT". `git ls-files`
// reads the INDEX, not the working tree: a stash `pop` that splits a rename
// into a staged ADD (new path) plus an UNSTAGED DELETE (old path still
// indexed, physically gone from disk) leaves `git ls-files` still naming the
// old path, so a plain `readFileSync` throws a bare ENOENT that names a file
// nobody touched, in a test about something else. Reproduced directly
// (no real stash needed — the same index state, minimally): `git mv a b`
// then `git reset -- a` re-stages a's DELETE half away while a stays gone
// from disk; `git ls-files` then lists both `a` and `b`, and `git status
// --porcelain -- a` prints ` D a` (unstaged delete: indexed, absent from
// the working tree) — the signature this classifier keys on.
//
// Three-answer verdict, not two: readable / INDEX-DESYNC (the git-status
// signature above — recoverable by re-staging the one path, never `-A`) /
// MISSING (unreadable with no desync signature — a real, unexplained
// absence, investigated rather than assumed).
function classifyUnreadableTrackedPath(path, repoRoot = REPO_ROOT) {
  const out = execFileSync("git", ["status", "--porcelain", "--", path], {
    cwd: repoRoot, encoding: "utf8",
  });
  const line = out.split("\n").find((l) => l.length > 0) || "";
  // Porcelain short format is "XY <path>": X = index vs HEAD, Y = worktree
  // vs index. Y === "D" with the path still in the index (it is, or
  // `git ls-files` would not have named it) is exactly the split-rename
  // shape: indexed, deleted on disk, not yet staged.
  if (line[1] === "D") return { status: "index-desync", gitStatusLine: line };
  return { status: "missing", gitStatusLine: line || "(no git status output for this path)" };
}

// `repoRoot`/`dirs` are parameterized (default: this repo's tools+proxy) so
// the RED test below can run the exact same function against an isolated
// scratch repo rather than a second, drifting reimplementation.
function trackedSourceFiles(repoRoot = REPO_ROOT, dirs = ["tools", "proxy"]) {
  const out = execFileSync("git", ["ls-files", ...dirs], {
    cwd: repoRoot, encoding: "utf8",
  });
  const paths = out.split("\n").filter((p) => p.endsWith(".mjs"));
  const files = [];
  const problems = [];
  for (const path of paths) {
    let content;
    try {
      content = readFileSync(join(repoRoot, path), "utf-8");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      problems.push({ path, ...classifyUnreadableTrackedPath(path, repoRoot) });
      continue;
    }
    files.push({ path, content });
  }
  return { files, problems };
}

test("SWEEP: no hand-parse of our schemas outside the owners, beyond the declared inventory", () => {
  const { files, problems } = trackedSourceFiles();
  const desynced = problems.filter((p) => p.status === "index-desync");
  assert.deepEqual(desynced, [],
    "git ls-files names a path this sweep cannot read, and git status shows it deleted-but-still-indexed " +
    "(a split git mv/stash pop, most likely) — re-stage the deletion on the named path(s), never `-A`, then " +
    "re-run: " + JSON.stringify(desynced, null, 2));
  const stillMissing = problems.filter((p) => p.status !== "index-desync");
  assert.deepEqual(stillMissing, [],
    "a tracked path is unreadable with no index-desync signature — a real, unexplained absence: " +
    JSON.stringify(stillMissing, null, 2));
  assert.ok(files.length > 50, `the sweep must actually enumerate the tree, got ${files.length} files`);
  const { unexpected, staleExemptions } = classifySweep(files);
  assert.deepEqual(staleExemptions, [],
    "a declared exemption no longer matches the line it describes — re-verify it, never widen it");
  assert.deepEqual(
    unexpected.map((u) => u.path), [],
    "a file outside the declared inventory hand-parses one of our schemas: " +
    JSON.stringify(unexpected, null, 2),
  );
});

// ---------------------------------------------------------------------------
// RED-FIRST: the split-index shape itself (BACKLOG "git stash/pop across a
// git mv desyncs the index"). Built in an isolated scratch git repo — the
// smallest reproduction of a stash-pop split rename, per the entry's own
// finding, is `git mv a b` followed by `git reset -- a`: the delete half of
// the rename is unstaged while `a` stays physically gone, which is the exact
// index state a split stash pop leaves behind. No real `git stash` needed to
// prove the classifier; the classifier keys on the index/worktree state, not
// on how it was produced.
// ---------------------------------------------------------------------------

function makeScratchGitRepo() {
  const dir = tmpDirSync("logs-schemas-index-desync-");
  const run = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  run("init", "-q");
  run("config", "user.email", "t@t.test");
  run("config", "user.name", "t");
  writeFileSync(join(dir, "a.mjs"), "// a\n");
  run("add", "a.mjs");
  run("commit", "-q", "-m", "init");
  return { dir, run };
}

test("RED: a split rename (git mv + reset, the stash-pop shape) makes a.mjs unreadable via git ls-files, and git status shows it deleted-but-indexed", () => {
  const { dir, run } = makeScratchGitRepo();
  run("mv", "a.mjs", "b.mjs");
  run("reset", "-q", "--", "a.mjs");
  const lsFiles = run("ls-files").split("\n").filter(Boolean);
  assert.ok(lsFiles.includes("a.mjs"), "git ls-files must still name the old path — that is the defect's precondition");
  assert.throws(
    () => readFileSync(join(dir, "a.mjs"), "utf-8"),
    /ENOENT/,
    "a.mjs must be genuinely unreadable — physically moved to b.mjs by the mv",
  );
  const status = execFileSync("git", ["status", "--porcelain", "--", "a.mjs"], { cwd: dir, encoding: "utf8" });
  assert.match(status, /^ D a\.mjs/, "git status must show the unstaged-delete signature this classifier keys on");
});

test("RED->GREEN, the actual fix function: trackedSourceFiles() classifies the split rename as index-desync, names b.mjs as readable, and throws nothing", () => {
  const { dir, run } = makeScratchGitRepo();
  run("mv", "a.mjs", "b.mjs");
  run("reset", "-q", "--", "a.mjs");
  const { files, problems } = trackedSourceFiles(dir, ["."]);
  assert.deepEqual(
    problems,
    [{ path: "a.mjs", status: "index-desync", gitStatusLine: " D a.mjs" }],
    "the real pipeline function must classify this by name, not throw the bare ENOENT the pre-fix version did",
  );
  assert.deepEqual(files.map((f) => f.path), ["b.mjs"], "the readable file must still come through untouched");
});

test("GREEN: classifyUnreadableTrackedPath(...) never runs on a clean index — a clean tracked file is simply readable", () => {
  const { dir } = makeScratchGitRepo();
  assert.doesNotThrow(() => readFileSync(join(dir, "a.mjs"), "utf-8"));
  const status = execFileSync("git", ["status", "--porcelain", "--", "a.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(status, "", "a clean index has nothing to report for a.mjs");
});

test("INSTRUMENT-POSITIVE: the sweep fires on a planted new hand-parse", () => {
  const planted = {
    path: "tools/planted-consumer.mjs",
    content: [
      "// reads the capture's -requests.jsonl by hand",
      "const cr = rec.usage.cacheRead ?? 0;",
    ].join("\n"),
  };
  const { unexpected } = classifySweep([planted]);
  assert.equal(unexpected.length, 1, "a brand-new hand-parse must fail the sweep");
  assert.equal(unexpected[0].path, "tools/planted-consumer.mjs");
});

test("INSTRUMENT-POSITIVE: a stale declared exemption is itself a failure", () => {
  const drifted = {
    path: "tools/cost-report.mjs",
    // Still trips both signals, but the exempted SHAPE is gone — this must
    // not ride out under the exemption.
    content: [
      "// default input: usage.jsonl",
      "const cacheRead = row.usage.cacheRead;",
    ].join("\n"),
  };
  const { staleExemptions, unexpected } = classifySweep([drifted]);
  assert.equal(staleExemptions.length, 1, "the exemption must stop covering a line it no longer describes");
  assert.deepEqual(unexpected, [], "and it is reported as a stale exemption, not as an unexpected file");
});
