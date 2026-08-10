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
      if (nestedReaders.has(prop)) {
        const nestedRaw = target[prop];
        if (nestedRaw === null || nestedRaw === undefined) return nestedRaw;
        return nestedReaders.get(prop)(nestedRaw);
      }
      if (!(prop in target) && optionalDefaults.has(prop)) return optionalDefaults.get(prop);
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

// --- Normalized accessors over both on-disk spellings -----------------------

/** Cache-read tokens, reading whichever on-disk spelling `view`'s format
 * actually carries (`usage.cacheRead` for a captureOutcome view,
 * `cache_read_input_tokens` for a usageLog view). Throws on any other
 * format — this does not guess at an unmapped shape. */
export function cacheReadOf(view) {
  const format = view[FORMAT];
  if (format === "captureOutcome") return view.usage.cacheRead;
  if (format === "usageLog") return view.cache_read_input_tokens;
  throw new Error(
    `logs.mjs: cacheReadOf has no mapping for format "${String(format)}" — `
      + "it normalizes captureOutcome and usageLog only.",
  );
}

/** Cache-creation tokens, same normalization as cacheReadOf. */
export function cacheCreationOf(view) {
  const format = view[FORMAT];
  if (format === "captureOutcome") return view.usage.cacheCreation;
  if (format === "usageLog") return view.cache_creation_input_tokens;
  throw new Error(
    `logs.mjs: cacheCreationOf has no mapping for format "${String(format)}" — `
      + "it normalizes captureOutcome and usageLog only.",
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
