// ttl-keepalive — idle TTL keepalive (robustness-threat-matrix class 2).
//
// Goal: no cache expiry during operator think-time. With the subscription's
// 1h TTL, ONE ping near the 50-minute idle mark re-reads the prefix at ~0.1x
// (~60k-equiv at 600k context) vs ~2x write to re-establish (~1.2M-equiv) —
// a ping is ~5% of the bust it prevents.
//
// Design: docs/directives/proxy-ttl-keepalive.md. Per-session-key idle timer:
// records the last main-thread request; if no new one arrives within
// CACHE_FIX_KEEPALIVE_AT seconds (default 3000s = 50min), replays that
// request VERBATIM (same messages/system/tools/thinking) except max_tokens
// forced to the minimum viable and stream disabled, and discards the
// response. Caps at CACHE_FIX_KEEPALIVE_MAX_PINGS (default 4) consecutive
// pings without a real request; any real request resets the counter.
//
// Activation: `enabled: true` in extensions.json (always loaded), runtime
// gate CACHE_FIX_KEEPALIVE=1 opt-in (env read per-call, same idiom as
// insertion-normalization / the ladder). Order 505 — after ttl-management
// (500, the last body-mutating extension in the normal request path), so
// the captured snapshot is the exact final body that was forwarded
// upstream; before cache-telemetry (600), though ordering there doesn't
// matter for correctness (cache-telemetry never mutates ctx.body) — kept
// before it so this extension's own onRequest hook completes before the
// per-session quota-status writer runs, for stderr/log ordering only.
//
// Scope, per directive: main-thread sessions only (subagent requests run a
// 5m TTL — out of scope; detected via ttl-management's detectRequestType,
// reused rather than reimplemented). Disabled automatically when the
// captured request's tier is 5m (ttl-tier-detect, order 75, already
// classifies this into ctx.meta._ttlTier) — pinging a 5m cache at 50min is
// dead weight, and pinging every <5m is out of the question.
//
// Timer/clock injection: all scheduling goes through the module-scope
// `_setTimer` / `_clearTimer` / `_now` indirection so tests can supply a
// fake clock and fire pings synchronously instead of waiting real minutes.
// The network call itself goes through `_forwardRequestImpl`, overridable
// for tests so no unit test performs a real HTTP call.

import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { claudeHome } from "../claude-home.mjs";
import { resolveSessionId } from "./cache-telemetry.mjs";
import { hashMessageContent } from "./mid-history-breakpoint-ladder.mjs";
import { detectRequestType } from "./ttl-management.mjs";
import { modelFamily } from "../model-families.mjs";
import { forwardRequest } from "../upstream.mjs";

const DEFAULT_AT_SECONDS = 3000; // 50 min
const DEFAULT_MAX_PINGS = 4;

// --- Env gates (read per-call, mirrors insertion-normalization/ladder idiom) ---

function isEnabled(env = process.env) {
  return env.CACHE_FIX_KEEPALIVE === "1";
}

function getIdleAtMs(env = process.env) {
  const raw = env.CACHE_FIX_KEEPALIVE_AT;
  const n = raw === undefined ? DEFAULT_AT_SECONDS : parseInt(raw, 10);
  const seconds = Number.isFinite(n) && n > 0 ? n : DEFAULT_AT_SECONDS;
  return seconds * 1000;
}

function getMaxPings(env = process.env) {
  const raw = env.CACHE_FIX_KEEPALIVE_MAX_PINGS;
  const n = raw === undefined ? DEFAULT_MAX_PINGS : parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MAX_PINGS;
}

function isDebug(env = process.env) {
  return env.CACHE_FIX_DEBUG === "1";
}

function debug(msg) {
  if (isDebug()) process.stderr.write(`[ttl-keepalive] DEBUG: ${msg}\n`);
}

// --- Clock / scheduler injection (test seam — no real 50-min waits) ---

function defaultSetTimer(fn, ms) {
  const t = setTimeout(fn, ms);
  if (t && typeof t.unref === "function") t.unref();
  return t;
}

let _now = () => Date.now();
let _setTimer = defaultSetTimer;
let _clearTimer = (id) => clearTimeout(id);

export function __setClockForTests({ now, setTimer, clearTimer } = {}) {
  if (now) _now = now;
  if (setTimer) _setTimer = setTimer;
  if (clearTimer) _clearTimer = clearTimer;
}

export function __resetClockForTests() {
  _now = () => Date.now();
  _setTimer = defaultSetTimer;
  _clearTimer = (id) => clearTimeout(id);
}

// --- Network call injection (test seam — no real upstream calls) ---

let _forwardRequestImpl = forwardRequest;

export function __setForwardRequestForTests(fn) {
  _forwardRequestImpl = fn;
}

export function __resetForwardRequestForTests() {
  _forwardRequestImpl = forwardRequest;
}

// --- Session key resolution ---
//
// Same idiom as insertion-normalization/resolveInsertionSessionKey and the
// ladder's resolveLadderSessionKey: prefer the session-id header; fall back
// to a hash of the first message for requests without it (direct API calls,
// tests).
export function resolveKeepaliveSessionKey(headers, messages) {
  const sid = headers ? resolveSessionId(headers) : null;
  if (sid) return `s-${sid.replace(/[^A-Za-z0-9_-]/g, "_")}`;
  const first = Array.isArray(messages) ? messages[0] : null;
  const h = first ? hashMessageContent(first) : null;
  return `c-${h || "empty"}`;
}

// --- Model classification (mirrors model-families.mjs; do not reimplement) ---
//
// The directive's worked example is model-KEYED, not per-request
// thinking-config-keyed: "on models where thinking cannot be disabled
// (fable-5: thinking always-on -> max_tokens:0 rejected), use max_tokens:1."
// Fable and Mythos are the same underlying model (per operator context) —
// treating both as always-thinking is a considered extension beyond the
// directive's literal "fable-5" example; surfaced as a decision in the
// closing report, not silently assumed.
const ALWAYS_THINKING_FAMILIES = new Set(["fable", "mythos"]);

export function requiresMinimalMaxTokensFallback(modelId) {
  return ALWAYS_THINKING_FAMILIES.has(modelFamily(modelId));
}

// max_tokens:0 is the minimum-viable ping on ordinary models; models that
// cannot disable thinking reject max_tokens:0 (thinking requires some
// output budget), so they fall back to max_tokens:1 (bills one output
// token).
export function selectPingMaxTokens(modelId) {
  return requiresMinimalMaxTokensFallback(modelId) ? 1 : 0;
}

// --- Ping body construction (pure) ---
//
// Verbatim replay: every field of the captured request is forwarded
// unchanged except `stream` (forced false — we never want an SSE reply for
// a discarded ping) and `max_tokens` (forced to the minimum viable per
// selectPingMaxTokens). This is a shallow overlay, not a deep rewrite —
// messages/system/tools/thinking are the exact object references captured
// at snapshot time.
export function buildPingBody(lastBody, modelId) {
  if (!lastBody || typeof lastBody !== "object") return lastBody;
  return {
    ...lastBody,
    stream: false,
    max_tokens: selectPingMaxTokens(modelId),
  };
}

// --- Telemetry ---

function getSnapshotDir() {
  return join(claudeHome(), "cache-fix-snapshots");
}

async function appendTelemetry(sessionKey, record) {
  try {
    const dir = getSnapshotDir();
    await mkdir(dir, { recursive: true });
    const path = join(dir, `${sessionKey.replace(/[^A-Za-z0-9_-]/g, "_")}-keepalive-events.jsonl`);
    await appendFile(path, JSON.stringify(record) + "\n");
  } catch (err) {
    debug(`telemetry append failed: ${err?.message ?? err}`);
  }
}

// --- Per-session state ---
//
// Module-scope Map, same idiom as the ladder's sessionRungs: state never
// touches disk; a proxy restart drops all armed timers and requires a fresh
// real request per session to re-prime keepalive. Acceptable per directive
// (memory-only idle-detection state, not a correctness surface).
const sessionState = new Map(); // key -> { lastRequestAt, snapshot: {body, headers}, model, pingCount, timerId, tier }

export function __resetStateForTests() {
  for (const state of sessionState.values()) {
    if (state.timerId != null) _clearTimer(state.timerId);
  }
  sessionState.clear();
}

// Test-only introspection — shallow copy so callers can't mutate internal
// state. Mirrors the "exported for tests" idiom used by the ladder's
// resetLadderState.
export function __getSessionStateForTests(sessionKey) {
  const s = sessionState.get(sessionKey);
  if (!s) return null;
  return { lastRequestAt: s.lastRequestAt, model: s.model, pingCount: s.pingCount, tier: s.tier };
}

function armTimer(sessionKey) {
  const state = sessionState.get(sessionKey);
  if (!state) return;
  const delay = getIdleAtMs();
  // The callback returns the firePing() promise (real setTimeout ignores a
  // callback's return value, so this changes nothing in production) so an
  // injected test scheduler CAN await it — the fake-timer idiom this
  // directive requires (no real 50-min waits).
  state.timerId = _setTimer(() => {
    return firePing(sessionKey).catch((err) => debug(`firePing unexpected: ${err?.message ?? err}`));
  }, delay);
}

// Send the ping via the (possibly test-injected) forward path. Constructs a
// minimal clientReq-shaped object because forwardRequest only reads
// url/method/headers off it. Fully discards the response body after
// extracting usage for telemetry (never reaches any real client).
async function sendPing(headers, pingBody) {
  const bodyBuf = Buffer.from(JSON.stringify(pingBody));
  const fakeClientReq = {
    url: "/v1/messages",
    method: "POST",
    headers: { ...(headers || {}), "content-type": "application/json" },
  };
  try {
    const { upstreamRes, statusCode } = await _forwardRequestImpl(fakeClientReq, bodyBuf, undefined);
    let usage = null;
    try {
      const chunks = [];
      for await (const chunk of upstreamRes) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString("utf-8");
      const parsed = JSON.parse(raw);
      usage = parsed?.usage || null;
    } catch {
      // Non-JSON or drain failure — ping still counts as sent; ctx tokens unknown.
    }
    const ctxTokens = usage
      ? (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0)
      : null;
    return { ok: statusCode >= 200 && statusCode < 300, status: statusCode, ctxTokens };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

async function firePing(sessionKey) {
  const state = sessionState.get(sessionKey);
  if (!state) return;

  const maxPings = getMaxPings();
  if (state.pingCount >= maxPings) {
    debug(`session ${sessionKey} already at ping cap (${maxPings}); not firing`);
    return;
  }

  const pingBody = buildPingBody(state.snapshot.body, state.model);
  const result = await sendPing(state.snapshot.headers, pingBody);
  state.pingCount += 1;

  await appendTelemetry(sessionKey, {
    ts: new Date().toISOString(),
    key: sessionKey,
    sid: resolveSessionId(state.snapshot.headers),
    ctx: result.ctxTokens ?? null,
    result: result.ok ? "ok" : (result.error || `status_${result.status}`),
  });

  debug(`session ${sessionKey} ping ${state.pingCount}/${maxPings} result=${result.ok ? "ok" : "fail"}`);

  if (state.pingCount < maxPings) {
    armTimer(sessionKey);
  }
}

// --- Extension contract ---

export default {
  name: "ttl-keepalive",
  description:
    "Idle-timer keepalive: replay the last main-thread request verbatim (minimal max_tokens) near the " +
    "50-minute idle mark so the 1h prompt cache never expires during operator think-time",
  enabled: false, // overridden by extensions.json
  order: 505,

  async onRequest(ctx) {
    if (!isEnabled()) return;
    if (!ctx || !ctx.body) return;

    const body = ctx.body;
    if (detectRequestType(body.system) !== "main") return; // subagents run 5m TTL — out of scope

    const headers = ctx.headers || null;
    const sessionKey = resolveKeepaliveSessionKey(headers, body.messages);
    const tier = ctx.meta?._ttlTier || "1h";

    const prior = sessionState.get(sessionKey);
    if (prior && prior.timerId != null) _clearTimer(prior.timerId);

    if (tier === "5m") {
      // Overage/5m-TTL signal disables keepalive for this session entirely —
      // pinging a 5m cache at the 50min mark is dead weight, and pinging
      // every <5m is out of the question (directive).
      sessionState.delete(sessionKey);
      return;
    }

    sessionState.set(sessionKey, {
      lastRequestAt: _now(),
      snapshot: {
        body: JSON.parse(JSON.stringify(body)),
        headers: headers ? { ...headers } : null,
      },
      model: body.model || null,
      pingCount: 0,
      timerId: null,
      tier,
    });

    armTimer(sessionKey);
  },
};
