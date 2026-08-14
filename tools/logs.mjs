#!/usr/bin/env node
// logs — one reader that owns the schemas of every format this repo writes.
//
// BACKLOG.md ("READY — one reader owns the schemas of everything this repo
// writes, and it THROWS on an unknown field instead of returning `null`"):
// measured 2026-08-10, one bust walk ran ~8 ad-hoc `jq` probes over four
// formats this repo writes, and two returned CONFIDENTLY WRONG answers by
// querying one schema with another's field names — `usage.cacheRead`
// (capture `outcome`) asked as `cache_read_input_tokens` (`usage.jsonl`'s
// spelling); `msgs` (prefix-diff events) asked as `messageCountPrev`
// (prefix-diff `-diff.json`'s spelling). Both reached the operator as fact
// before being caught. A missing check is silent; a hand-rolled read
// returns a NUMBER indistinguishable from a correct one — that silence is
// the whole defect (docs/dev-loop.md, "Why a missing READER outranks a
// missing check").
//
// This module does not repair any existing consumer — a separate backlog
// entry owns `bust-triage`'s (and others') adoption of this reader. It ships
// the reader and its companion scope lint (test/logs-schemas.test.mjs) only.
//
// ON-DISK NAMES DO NOT CHANGE. `proxy/stream.mjs:21-22`,
// `proxy/extensions/usage-log.mjs:187-188`, `proxy/extensions/prefix-diff.mjs`
// (`messageCountPrev`/`messageCountNow` at :761-762, `msgs` at :850) and
// `proxy/extensions/request-capture.mjs` (`buildCaptureRecord`,
// `buildOutcomeRecord`) are wire/schema writers with the whole archived
// capture corpus behind them — renaming a field here to "fix" a spelling
// would make every already-written capture unreadable by the new reader, a
// bigger version of the bug this file exists to end.
//
// FOUR FORMATS, each with its own reader below. Schema truth is read off
// LIVE files and the writers named above (verified 2026-08-10), not
// re-derived from prose:
//
//   (1) capture REQUEST record — `<key>-requests.jsonl`, records whose
//       `type` is neither "outcome" nor "boot".
//       top-level: ts, id, sid, key, headers, body
//       body:      model, max_tokens, messages, metadata
//       headers:   "anthropic-beta", "session-id"
//         -> readCaptureRequest(raw)
//
//   (2) capture OUTCOME record — same file, `type:"outcome"`.
//       top-level: ts, type, id, key, requestId, model, usage, outSha,
//                  outBytes, ms
//       usage:     cacheRead, cacheCreation, inputTokens, outputTokens,
//                  ephemeral1h, ephemeral5m
//         -> readCaptureOutcome(raw)
//
//   (3) `usage.jsonl` (`~/.local/state/cache-fix/usage.jsonl`), one JSON
//       object per line (proxy/extensions/usage-log.mjs `assembleRecord`).
//       Required: v, ts, sid, model, speed, service_tier, input_tokens,
//                 output_tokens, cache_creation_input_tokens,
//                 cache_read_input_tokens, ephemeral_1h_input_tokens,
//                 ephemeral_5m_input_tokens, web_search_requests, q5h, q7d,
//                 q5h_reset, q7d_reset, qstatus, qoverage, qclaim,
//                 qfallback_pct, cache_hit_rate, q5h_delta, q7d_delta.
//       Optional (omitted, not null, when the source is absent — the writer's
//       own comment: "Optional fields are OMITTED (not present as undefined)
//       when source absent"): requested_model, model_mismatch, qoverage_util,
//       qrepresentative_claim, org_id, overage_disabled_reason, request_id,
//       agent_id, agent_id_source.
//         -> readUsageLogRecord(raw)
//
//   (4) prefix-diff — THREE sibling files under
//       `~/.local/state/cache-fix/snapshots/` (proxy/extensions/prefix-diff.mjs
//       :1013-1015), each a DIFFERENT on-disk spelling of overlapping
//       information:
//       `<key>-events.jsonl`: append-only ledger, one bounded record per
//         diff (`buildEventRecord`). ts, prevTs, key, sid, view, causes,
//         systemMatch, toolsMatch, msgs, chain, params, system, tools,
//         betaHeader, windows.
//         `msgs` is a STRING "prev->now" (e.g. "1->1"), NOT a number — this
//         is the second motivating wrong-read: asking an event row for
//         `messageCountPrev` (a `-diff.json` field name) must throw.
//         -> readPrefixDiffEvent(raw)
//       `<key>-diff.json`: latest diff, full detail, overwritten
//         (`computeDiff`). timestamp, prevTimestamp, toolsMatch,
//         systemMatch, messageCountPrev, messageCountNow, prefixDiffs,
//         tailDiffs, markerDiffs, markerCount, systemBlockDiffs, toolDiffs,
//         paramDiffs, messageChain, divergentPrev, divergentNow,
//         betaHeaderDiff. `messageCountPrev`/`messageCountNow` are NUMBERS.
//         -> readPrefixDiffDiff(raw)
//       `<key>-last.json`: latest snapshot, the diff baseline, overwritten.
//         One baseline PER TENANT: `{ tenants: { <tenant>: <snapshot> },
//         lastTenant }` — top-level KNOWN fields are just `tenants` and
//         `lastTenant`; there is NO `messageCountPrev` here at all. A
//         per-tenant snapshot (`buildSnapshot`) has its own known fields:
//         timestamp, messageCount, toolsHash, systemHash, params,
//         systemBlocks, toolsDetail, messageHashes, prefixMessages,
//         tailMessages, markerMessages, betaHeader — `messageCount` is a
//         single NUMBER (no "prev" half; the previous tenant snapshot IS
//         the prev half, read from a separate `-last.json` write).
//         -> readPrefixDiffLast(raw), prefixDiffTenant(lastView, tenantId)
//
// STRICT BY CONSTRUCTION: every reader returns a Proxy whose `get` trap
// throws on any property name outside that format's known-field set, naming
// both the field and the format in the error. It never returns `undefined`
// for an unknown name — that silent fallback is the whole defect (a
// wrong-namespace read returning a number indistinguishable from a right
// one). A field the schema itself marks OPTIONAL (usage.jsonl's attestation
// fields above) returns its declared default instead of throwing when the
// underlying record legitimately omits it — that is not the same failure
// mode as a name that does not belong to the schema at all.
//
// NORMALIZED ACCESSORS OVER BOTH ON-DISK SPELLINGS: two concepts — cache
// read/creation tokens, and before/after message counts — are spelled
// differently across formats that both encode them. `cacheReadOf` /
// `cacheCreationOf` accept either a captureOutcome or a usageLog view and
// read the field that format actually carries (`usage.cacheRead` vs
// `cache_read_input_tokens`) rather than making the caller remember which
// spelling belongs to which file. `messageCountsOf` does the same for
// prefix-diff's `-diff.json` (native numbers) and `-events.jsonl` (parses
// the `"prev->now"` string) — `-last.json` has no "prev" half of its own so
// it is not covered here; use `prefixDiffTenant` directly.

// --- Proxy machinery -------------------------------------------------------

const FORMAT = Symbol("logs.mjs:format");

function unknownFieldError(format, prop) {
  return new Error(
    `logs.mjs: unknown field "${String(prop)}" for format "${format}". `
      + "This is the wrong-schema read this reader exists to catch — check "
      + "the schema table at the top of tools/logs.mjs before hand-parsing.",
  );
}

/**
 * Wrap `raw` (an already-JSON.parsed object) in a strict, read-only view.
 *   knownFields    — Set<string> of legal property names for this format.
 *   optionalDefaults — Map<string, any>: a subset of knownFields that may be
 *                    legitimately ABSENT on a real record; missing ones read
 *                    back their declared default instead of throwing.
 *   nestedReaders  — Map<string, (raw) => wrapped>: a subset of knownFields
 *                    whose value should itself be wrapped strictly (e.g.
 *                    `usage`, `body`, `headers`) instead of returned raw.
 */
function makeStrictView(raw, format, knownFields, { optionalDefaults = new Map(), nestedReaders = new Map() } = {}) {
  return new Proxy(raw, {
    get(target, prop, receiver) {
      if (prop === FORMAT) return format;
      if (typeof prop !== "string") return Reflect.get(target, prop, receiver);
      if (!knownFields.has(prop)) throw unknownFieldError(format, prop);
      // A genuinely ABSENT optional field returns its declared default before
      // any nested-reader wrapping is attempted — checked first regardless of
      // whether `prop` is also a nested-reader key. A field registered in
      // BOTH maps (censusExport.mismatchRow's `unrelatedDiag`, wrapped when
      // present, defaulted when the writer omits it) previously fell through
      // the nested-reader branch first: `target[prop]` on a missing key is
      // `undefined`, which that branch's own null/undefined short-circuit
      // returned AS the value, never reaching `optionalDefaults` at all — so
      // the declared default (`null`) was silently replaced by `undefined`,
      // the exact confidently-wrong-value failure this module exists to
      // prevent, one level down. A field PRESENT with an explicit `null`
      // (e.g. `wrapped: null`) is unaffected: `prop in target` is true there,
      // so this check does not fire and the nested-reader branch's own
      // null-passthrough still applies.
      if (!(prop in target) && optionalDefaults.has(prop)) return optionalDefaults.get(prop);
      if (nestedReaders.has(prop)) {
        const nestedRaw = target[prop];
        if (nestedRaw === null || nestedRaw === undefined) return nestedRaw;
        return nestedReaders.get(prop)(nestedRaw);
      }
      return target[prop];
    },
    has(target, prop) {
      if (typeof prop !== "string") return Reflect.has(target, prop);
      return knownFields.has(prop);
    },
    ownKeys(target) {
      return [...knownFields];
    },
    getOwnPropertyDescriptor(target, prop) {
      if (typeof prop === "string" && knownFields.has(prop)) {
        return { enumerable: true, configurable: true, value: target[prop] };
      }
      return undefined;
    },
  });
}

// --- (1) capture REQUEST record ---------------------------------------------

const CAPTURE_REQUEST_HEADERS_FIELDS = new Set(["anthropic-beta", "session-id"]);
function readCaptureRequestHeaders(raw) {
  return makeStrictView(raw, "captureRequest.headers", CAPTURE_REQUEST_HEADERS_FIELDS);
}

const CAPTURE_REQUEST_BODY_FIELDS = new Set(["model", "max_tokens", "messages", "metadata"]);
function readCaptureRequestBody(raw) {
  return makeStrictView(raw, "captureRequest.body", CAPTURE_REQUEST_BODY_FIELDS);
}

const CAPTURE_REQUEST_FIELDS = new Set(["ts", "id", "sid", "key", "headers", "body"]);
/** Strict view of a capture `<key>-requests.jsonl` REQUEST record (any line
 * whose `type` is neither "outcome" nor "boot"). */
export function readCaptureRequest(raw) {
  return makeStrictView(raw, "captureRequest", CAPTURE_REQUEST_FIELDS, {
    nestedReaders: new Map([
      ["headers", readCaptureRequestHeaders],
      ["body", readCaptureRequestBody],
    ]),
  });
}

// --- (2) capture OUTCOME record ---------------------------------------------

const CAPTURE_OUTCOME_USAGE_FIELDS = new Set([
  "cacheRead", "cacheCreation", "inputTokens", "outputTokens", "ephemeral1h", "ephemeral5m",
]);
function readCaptureOutcomeUsage(raw) {
  return makeStrictView(raw, "captureOutcome.usage", CAPTURE_OUTCOME_USAGE_FIELDS);
}

const CAPTURE_OUTCOME_FIELDS = new Set([
  "ts", "type", "id", "key", "requestId", "model", "usage", "outSha", "outBytes", "ms",
]);
/** Strict view of a capture `<key>-requests.jsonl` OUTCOME record
 * (`type:"outcome"`). */
export function readCaptureOutcome(raw) {
  return makeStrictView(raw, "captureOutcome", CAPTURE_OUTCOME_FIELDS, {
    nestedReaders: new Map([["usage", readCaptureOutcomeUsage]]),
  });
}

// --- (3) usage.jsonl ---------------------------------------------------------

const USAGE_LOG_REQUIRED_FIELDS = [
  "v", "ts", "sid", "model", "speed", "service_tier",
  "input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens",
  "ephemeral_1h_input_tokens", "ephemeral_5m_input_tokens", "web_search_requests",
  "q5h", "q7d", "q5h_reset", "q7d_reset", "qstatus", "qoverage", "qclaim", "qfallback_pct",
  "cache_hit_rate", "q5h_delta", "q7d_delta",
];
const USAGE_LOG_OPTIONAL_DEFAULTS = new Map([
  ["requested_model", null],
  ["model_mismatch", false],
  ["qoverage_util", null],
  ["qrepresentative_claim", null],
  ["org_id", null],
  ["overage_disabled_reason", null],
  ["request_id", null],
  ["agent_id", null],
  ["agent_id_source", null],
]);
const USAGE_LOG_FIELDS = new Set([...USAGE_LOG_REQUIRED_FIELDS, ...USAGE_LOG_OPTIONAL_DEFAULTS.keys()]);
/** Strict view of one `usage.jsonl` record. */
export function readUsageLogRecord(raw) {
  return makeStrictView(raw, "usageLog", USAGE_LOG_FIELDS, { optionalDefaults: USAGE_LOG_OPTIONAL_DEFAULTS });
}

// --- (4) prefix-diff: three sibling files -----------------------------------

const PREFIX_DIFF_EVENT_FIELDS = new Set([
  "ts", "prevTs", "key", "sid", "view", "causes", "systemMatch", "toolsMatch",
  "msgs", "chain", "params", "system", "tools", "betaHeader", "windows",
]);
/** Strict view of one `<key>-events.jsonl` row (the append-only ledger). */
export function readPrefixDiffEvent(raw) {
  return makeStrictView(raw, "prefixDiffEvent", PREFIX_DIFF_EVENT_FIELDS);
}

const PREFIX_DIFF_DIFF_FIELDS = new Set([
  "timestamp", "prevTimestamp", "toolsMatch", "systemMatch",
  "messageCountPrev", "messageCountNow", "prefixDiffs", "tailDiffs", "markerDiffs",
  "markerCount", "systemBlockDiffs", "toolDiffs", "paramDiffs", "messageChain",
  "divergentPrev", "divergentNow", "betaHeaderDiff",
]);
/** Strict view of `<key>-diff.json` (the latest diff, overwritten). */
export function readPrefixDiffDiff(raw) {
  return makeStrictView(raw, "prefixDiffDiff", PREFIX_DIFF_DIFF_FIELDS);
}

const PREFIX_DIFF_LAST_FIELDS = new Set(["tenants", "lastTenant"]);
/** Strict view of `<key>-last.json` (top level only — `tenants` is a
 * dynamically-keyed map of tenant id -> snapshot, not a fixed schema field,
 * so it is returned raw; use `prefixDiffTenant` for a strict per-tenant
 * view). */
export function readPrefixDiffLast(raw) {
  return makeStrictView(raw, "prefixDiffLast", PREFIX_DIFF_LAST_FIELDS);
}

const PREFIX_DIFF_TENANT_SNAPSHOT_FIELDS = new Set([
  "timestamp", "messageCount", "toolsHash", "systemHash", "params", "systemBlocks",
  "toolsDetail", "messageHashes", "prefixMessages", "tailMessages", "markerMessages", "betaHeader",
]);
/** Strict view of one tenant's snapshot inside a `readPrefixDiffLast` view.
 * `tenantId` is DATA (a dynamic key), not a schema field name: an unknown
 * tenant id returns `undefined` (a legitimate "no such tenant" — the same
 * as any map lookup miss), never a schema-violation throw. A field name
 * inside a real tenant snapshot that does not belong to the schema still
 * throws, same as every other reader here. */
export function prefixDiffTenant(lastView, tenantId) {
  const rawTenant = lastView.tenants ? lastView.tenants[tenantId] : undefined;
  if (rawTenant === null || rawTenant === undefined) return undefined;
  return makeStrictView(rawTenant, "prefixDiffLast.tenant", PREFIX_DIFF_TENANT_SNAPSHOT_FIELDS);
}

// --- (5) reminder-migration-census EXPORT: censusExport view family --------
//
// tools/reminder-migration-census.mjs is the WRITER (verified 2026-08-14 at
// the line numbers below, against this module's own base commit); this
// reader owns the schema of its `--json --verbose` export's four row
// arrays, same strictness as (1)-(4) above. `tools/duplicate-billing.mjs` is
// the first adopting consumer (its duplicateRows side only);
// mismatchRows/placementRows/volatileRows have no consumer yet and ship
// ahead of one, the same posture this module's top-of-file comment already
// states it takes.
//
//   duplicateRows[] (census.mjs `trackDuplicate`/`addMember`/`outcomeFacts`,
//     :749-775, :719-733, :698-711): path, cid, sid, length, billed, noId,
//     startTs, startLine, lastTs, lastLine, model, nMsg, maxTokens,
//     intervalMs, members[].
//       members[]: id, ts, line, outcome.
//         outcome (null, or): requestId, model, ms, usage.
//           usage (null, or): cacheRead, cacheCreation, inputTokens,
//             outputTokens — outputTokens here is the SAME message_start
//             placeholder captureOutcome's own usage carries (see (2)
//             above); a consumer must not treat it as a completion length.
//     -> readCensusDuplicateRow(raw)
//
//   mismatchRows[] (census.mjs `analysePair`'s no-counterpart branch,
//     :526-541 — the MISMATCH-filtered slice of `details`, `--verbose`
//     only): path, ts, host, blocks, verdict (always "MISMATCH" in this
//     array), j (always null), text (always ""), recon, sub (always null),
//     rejectedCandidate, hostPruned, hostIdless, mismatchSub, wrapped,
//     wrappedSub (OPTIONAL — present only when mismatchSub is
//     WRAPPER-RETAINED-EXTENDED), unrelatedDiag (OPTIONAL — present only
//     when mismatchSub is UNRELATED).
//       rejectedCandidate (null, or): j, chars, text.
//       wrapped (null, or): verdict, j, offset.
//       unrelatedDiag: reconWrappedChars, candidateChars, wrappedDivOffset,
//         blockShapes[].
//         blockShapes[]: chars, innerChars, overhead, wrapCanonical.
//     -> readCensusMismatchRow(raw)
//
//   placementRows[] (census.mjs `main`'s `placementRow`, :1283-1292): path,
//     ts, verdict, blocks, hostIndexBefore, nBefore, hostIndexAfter,
//     standaloneIndex, nAfter, offset, placementClass.
//     -> readCensusPlacementRow(raw)
//
//   volatileRows[] (census.mjs `scanVolatileRegions` + the `rowByEntry.set`
//     wrapper, :991-1000, :1149-1151): path, sid, ts, cid, line, req,
//     occurrences, lastTs, lastLine, lastReq, kind, index, h, key,
//     firstBytes, nowBytes, divOffset, cacheControlExempt.
//     -> readCensusVolatileRow(raw)

const CENSUS_DUP_MEMBER_OUTCOME_USAGE_FIELDS = new Set([
  "cacheRead", "cacheCreation", "inputTokens", "outputTokens",
]);
function readCensusDuplicateMemberOutcomeUsage(raw) {
  return makeStrictView(raw, "censusExport.duplicateRow.member.outcome.usage", CENSUS_DUP_MEMBER_OUTCOME_USAGE_FIELDS);
}

const CENSUS_DUP_MEMBER_OUTCOME_FIELDS = new Set(["requestId", "model", "ms", "usage"]);
/** Strict view of one `duplicateRows[].members[].outcome` entry (null, or
 * `{requestId, model, ms, usage}` — `census.mjs`'s `outcomeFacts`). */
export function readCensusDuplicateMemberOutcome(raw) {
  return makeStrictView(raw, "censusExport.duplicateRow.member.outcome", CENSUS_DUP_MEMBER_OUTCOME_FIELDS, {
    nestedReaders: new Map([["usage", readCensusDuplicateMemberOutcomeUsage]]),
  });
}

const CENSUS_DUP_MEMBER_FIELDS = new Set(["id", "ts", "line", "outcome"]);
/** Strict view of one `duplicateRows[].members[]` entry. */
export function readCensusDuplicateMember(raw) {
  return makeStrictView(raw, "censusExport.duplicateRow.member", CENSUS_DUP_MEMBER_FIELDS, {
    nestedReaders: new Map([["outcome", readCensusDuplicateMemberOutcome]]),
  });
}

function readCensusDuplicateMembers(raw) {
  return raw.map(readCensusDuplicateMember);
}

const CENSUS_DUPLICATE_ROW_FIELDS = new Set([
  "path", "cid", "sid", "length", "billed", "noId", "startTs", "startLine",
  "lastTs", "lastLine", "model", "nMsg", "maxTokens", "intervalMs", "members",
]);
/** Strict view of one `duplicateRows[]` entry from a
 * `reminder-migration-census --json --verbose` export. */
export function readCensusDuplicateRow(raw) {
  return makeStrictView(raw, "censusExport.duplicateRow", CENSUS_DUPLICATE_ROW_FIELDS, {
    nestedReaders: new Map([["members", readCensusDuplicateMembers]]),
  });
}

const CENSUS_MISMATCH_REJECTED_CANDIDATE_FIELDS = new Set(["j", "chars", "text"]);
function readCensusMismatchRejectedCandidate(raw) {
  return makeStrictView(raw, "censusExport.mismatchRow.rejectedCandidate", CENSUS_MISMATCH_REJECTED_CANDIDATE_FIELDS);
}

const CENSUS_MISMATCH_WRAPPED_FIELDS = new Set(["verdict", "j", "offset"]);
function readCensusMismatchWrapped(raw) {
  return makeStrictView(raw, "censusExport.mismatchRow.wrapped", CENSUS_MISMATCH_WRAPPED_FIELDS);
}

const CENSUS_MISMATCH_BLOCK_SHAPE_FIELDS = new Set(["chars", "innerChars", "overhead", "wrapCanonical"]);
function readCensusMismatchBlockShape(raw) {
  return makeStrictView(raw, "censusExport.mismatchRow.unrelatedDiag.blockShape", CENSUS_MISMATCH_BLOCK_SHAPE_FIELDS);
}

function readCensusMismatchBlockShapes(raw) {
  return raw.map(readCensusMismatchBlockShape);
}

const CENSUS_MISMATCH_UNRELATED_DIAG_FIELDS = new Set([
  "reconWrappedChars", "candidateChars", "wrappedDivOffset", "blockShapes",
]);
function readCensusMismatchUnrelatedDiag(raw) {
  return makeStrictView(raw, "censusExport.mismatchRow.unrelatedDiag", CENSUS_MISMATCH_UNRELATED_DIAG_FIELDS, {
    nestedReaders: new Map([["blockShapes", readCensusMismatchBlockShapes]]),
  });
}

const CENSUS_MISMATCH_ROW_FIELDS = new Set([
  "path", "ts", "host", "blocks", "verdict", "j", "text", "recon", "sub",
  "rejectedCandidate", "hostPruned", "hostIdless", "mismatchSub", "wrapped",
  "wrappedSub", "unrelatedDiag",
]);
const CENSUS_MISMATCH_ROW_OPTIONAL_DEFAULTS = new Map([
  ["wrappedSub", null],
  ["unrelatedDiag", null],
]);
/** Strict view of one `mismatchRows[]` entry (the MISMATCH-filtered slice of
 * `analysePair`'s findings, `--verbose` only). `wrappedSub` and
 * `unrelatedDiag` are OPTIONAL — the writer sets them only under
 * mismatchSub WRAPPER-RETAINED-EXTENDED and UNRELATED respectively — and
 * read back `null` on a row where the writer legitimately omitted them. */
export function readCensusMismatchRow(raw) {
  return makeStrictView(raw, "censusExport.mismatchRow", CENSUS_MISMATCH_ROW_FIELDS, {
    optionalDefaults: CENSUS_MISMATCH_ROW_OPTIONAL_DEFAULTS,
    nestedReaders: new Map([
      ["rejectedCandidate", readCensusMismatchRejectedCandidate],
      ["wrapped", readCensusMismatchWrapped],
      ["unrelatedDiag", readCensusMismatchUnrelatedDiag],
    ]),
  });
}

const PLACEMENT_ROW_FIELDS = new Set([
  "path", "ts", "verdict", "blocks", "hostIndexBefore", "nBefore",
  "hostIndexAfter", "standaloneIndex", "nAfter", "offset", "placementClass",
  // The row-4 placement fields, added 2026-08-14 at integration once their
  // WRITER was on main (`between`, the [{role, kind}] vector of the messages
  // strictly between host and standalone, and `betweenTruncated`, the
  // cap-reports-what-it-dropped counter beside it — reminder-migration-census
  // .mjs). The lane that built this view deliberately left them out and named
  // this seam, because a view asserting a field the writer does not yet emit
  // throws on every real export; the two lanes were concurrent and this is
  // the join. Proven against a real corpus-wide `--json --verbose` export (46
  // placement rows, every one carrying `between`): the view throws without
  // these two names and parses clean with them.
  "between", "betweenTruncated",
]);
/** Strict view of one `placementRows[]` entry. */
export function readCensusPlacementRow(raw) {
  return makeStrictView(raw, "censusExport.placementRow", PLACEMENT_ROW_FIELDS);
}

const CENSUS_VOLATILE_ROW_FIELDS = new Set([
  "path", "sid", "ts", "cid", "line", "req", "occurrences", "lastTs",
  "lastLine", "lastReq", "kind", "index", "h", "key", "firstBytes",
  "nowBytes", "divOffset", "cacheControlExempt",
]);
/** Strict view of one `volatileRows[]` entry. */
export function readCensusVolatileRow(raw) {
  return makeStrictView(raw, "censusExport.volatileRow", CENSUS_VOLATILE_ROW_FIELDS);
}

// --- Normalized accessors over both on-disk spellings -----------------------

/** Cache-read tokens, reading whichever on-disk spelling `view`'s format
 * actually carries (`usage.cacheRead` for a captureOutcome view,
 * `cache_read_input_tokens` for a usageLog view, `usage.cacheRead` again
 * for a censusExport.duplicateRow.member.outcome view — the census's
 * `outcomeFacts` copies captureOutcome's own usage spelling verbatim).
 * Throws on any other format — this does not guess at an unmapped shape. */
export function cacheReadOf(view) {
  const format = view[FORMAT];
  if (format === "captureOutcome") return view.usage.cacheRead;
  if (format === "usageLog") return view.cache_read_input_tokens;
  if (format === "censusExport.duplicateRow.member.outcome") return view.usage.cacheRead;
  throw new Error(
    `logs.mjs: cacheReadOf has no mapping for format "${String(format)}" — `
      + "it normalizes captureOutcome, usageLog, and "
      + "censusExport.duplicateRow.member.outcome only.",
  );
}

/** Cache-creation tokens, same normalization as cacheReadOf. */
export function cacheCreationOf(view) {
  const format = view[FORMAT];
  if (format === "captureOutcome") return view.usage.cacheCreation;
  if (format === "usageLog") return view.cache_creation_input_tokens;
  if (format === "censusExport.duplicateRow.member.outcome") return view.usage.cacheCreation;
  throw new Error(
    `logs.mjs: cacheCreationOf has no mapping for format "${String(format)}" — `
      + "it normalizes captureOutcome, usageLog, and "
      + "censusExport.duplicateRow.member.outcome only.",
  );
}

/** `{ prev, now }` message counts, reading whichever on-disk spelling
 * `view`'s format actually carries: `-diff.json`'s native numbers, or
 * `-events.jsonl`'s `"prev->now"` string, parsed. `-last.json` carries no
 * "prev" of its own (see prefixDiffTenant) and is not covered here. */
export function messageCountsOf(view) {
  const format = view[FORMAT];
  if (format === "prefixDiffDiff") return { prev: view.messageCountPrev, now: view.messageCountNow };
  if (format === "prefixDiffEvent") {
    const m = /^(\d+)->(\d+)$/.exec(view.msgs);
    if (!m) {
      throw new Error(`logs.mjs: prefixDiffEvent.msgs is not the expected "N->M" shape: ${JSON.stringify(view.msgs)}`);
    }
    return { prev: Number(m[1]), now: Number(m[2]) };
  }
  throw new Error(
    `logs.mjs: messageCountsOf has no mapping for format "${String(format)}" — `
      + "it normalizes prefixDiffDiff and prefixDiffEvent only; prefixDiffLast "
      + "has no \"prev\" half (see prefixDiffTenant).",
  );
}
