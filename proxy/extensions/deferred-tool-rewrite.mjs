// deferred-tool-rewrite — Phase A only (robustness-threat-matrix class 6).
//
// Design: docs/directives/proxy-deferred-tool-rewrite.md. Spec contradiction
// on record: CC docs say deferred-tool loads append without disturbing
// cache; measured 2026-07-27 12:47:56 (175k, ledger row
// tools[SendMessage:added], toolsMatch:false) says otherwise on this
// surface. Until upstream fixes it, the proxy holds tools[] byte-stable
// across a pure tool addition and delivers the newly-available schema as an
// appended tool_addition system-message block instead (mid-conversation
// tool changes, beta mid-conversation-tool-changes-2026-07-01; requires the
// tool declared with defer_loading up front).
//
// Detect: incoming tools[] is a pure superset of the persisted known set
// (every previously-known tool present, byte-unchanged) with >=1 new name
// → rewrite: forward the known tools unchanged + new tools each additively
// marked defer_loading:true, and append one tool_addition system block per
// new tool at the tail of body.system. Any non-additive change (a known
// tool removed, or changed) → passthrough + reset (the honest path — per
// the directive, we never try to paper over a real edit).
//
// Phase A explicitly stops at: build the rewrite + persist the mapping +
// unit-test it against a synthetic fixture. Phase B (does the live API
// actually accept the beta + honor defer_loading the way this rewrite
// assumes) is NOT built here — see the directive's Risk note. The exact
// wire SHAPE of the tool_addition block and of the defer_loading-marked
// tool entry are NOT specified by the directive (no JSON example given);
// this file's shapes (see buildToolAdditionBlock / buildDeferredToolEntry)
// are a considered, clearly-labeled Phase-A placeholder pending Phase B's
// live validation against the actual API contract — surfaced as a gap in
// the closing report, not silently assumed settled.
//
// KNOWN PLUMBING GAP (found during this build, affects auto-1m-guard too,
// NOT fixed here — proxy/server.mjs is outside this unit's write boundary):
// `preForward` (proxy/server.mjs) builds `reqCtx.headers = { ...clientReq
// .headers }` for extensions to read/mutate, but only `reqCtx.body` is
// serialized back into `forwardBody` — `reqCtx.headers` mutations are never
// propagated to the real outbound request (`forwardRequest(clientReq, ...)`
// in handleMessages still reads the ORIGINAL `clientReq.headers`). This
// extension sets the beta header via `ctx.headers` anyway (mirrors auto-1m
// -guard.mjs's existing, equally-affected idiom) so the extension-level
// contract is correct and ready once that plumbing gap is fixed — but until
// then, the header never reaches the wire. Phase B's "does the API accept
// the beta" validation is blocked on this being fixed first.
//
// Activation: `enabled: true` in extensions.json (always loaded), runtime
// gate CACHE_FIX_TOOL_REWRITE=1, default OFF per directive ("Phase A (build
// now, env-gated CACHE_FIX_TOOL_REWRITE=1, default off)"). Order 425 — after
// sort-stabilization (200, so tools[] arrives name-sorted — comparisons and
// output order are keyed on name, not incoming array order) and after
// mid-history-breakpoint-ladder (420, a messages[]-only mutator with no
// interaction here); before ttl-management (500), consistent with the rest
// of the body-shaping extensions running ahead of the TTL pass.

import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { claudeHome } from "../claude-home.mjs";
import { resolveSessionId } from "./cache-telemetry.mjs";

const BETA_TOKEN = "mid-conversation-tool-changes-2026-07-01";
const BETA_HEADER_NAME = "anthropic-beta";

const DEFAULT_FS = { readFile, writeFile, rename, appendFile, mkdir };

// --- Env gates (read per-call, mirrors insertion-normalization/ladder idiom) ---

function isEnabled(env = process.env) {
  return env.CACHE_FIX_TOOL_REWRITE === "1";
}

function isDebug(env = process.env) {
  return env.CACHE_FIX_DEBUG === "1";
}

function debug(msg) {
  if (isDebug()) process.stderr.write(`[deferred-tool-rewrite] DEBUG: ${msg}\n`);
}

// --- Storage (snapshots-dir idiom, mirrors insertion-normalization) ---

function getSnapshotDir() {
  return join(claudeHome(), "cache-fix-snapshots");
}

function statePath(dir, sessionKey) {
  return join(dir, `${sessionKey}-deferred-tool-canon.json`);
}

function eventsPath(dir, sessionKey) {
  return join(dir, `${sessionKey}-deferred-tool-events.jsonl`);
}

async function loadKnownTools(dir, sessionKey, fs) {
  try {
    const txt = await fs.readFile(statePath(dir, sessionKey), "utf-8");
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed?.tools)) return parsed.tools;
    return null;
  } catch (err) {
    if (err && err.code !== "ENOENT") debug(`state read failed: ${err?.message ?? err}`);
    return null;
  }
}

async function saveKnownTools(dir, sessionKey, tools, fs) {
  await fs.mkdir(dir, { recursive: true });
  const finalPath = statePath(dir, sessionKey);
  const tmpPath = `${finalPath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify({ tools }, null, 2));
  await fs.rename(tmpPath, finalPath);
}

async function appendTelemetry(dir, sessionKey, record, fs) {
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(eventsPath(dir, sessionKey), JSON.stringify(record) + "\n");
  } catch (err) {
    debug(`telemetry append failed: ${err?.message ?? err}`);
  }
}

// --- Session key (same idiom as insertion-normalization/the ladder) ---

export function resolveToolRewriteSessionKey(headers, body) {
  const sid = headers ? resolveSessionId(headers) : null;
  if (sid) return `s-${sid.replace(/[^A-Za-z0-9_-]/g, "_")}`;
  const model = typeof body?.model === "string" ? body.model : "unknown";
  return `c-${model}`;
}

// --- Canonical tool comparison ---
//
// Only name/description/input_schema participate in the equality check —
// any OTHER field (e.g. a defer_loading marker WE ourselves might have
// added on a prior rewrite) is deliberately excluded, so re-classifying a
// tool object that happens to carry that marker can never misfire as "the
// existing tool's schema changed."
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

export function toolFingerprint(tool) {
  if (!tool || typeof tool !== "object" || typeof tool.name !== "string") return null;
  return JSON.stringify(
    canonicalize({ name: tool.name, description: tool.description ?? null, input_schema: tool.input_schema ?? null }),
  );
}

// --- Core classifier (pure) ---
//
// Returns:
//   { action: "no-baseline", knownTools }                         — first-seen session; persist baseline, forward unchanged
//   { action: "unchanged", knownTools }                           — incoming === known set; forward unchanged
//   { action: "reset", knownTools, reason }                       — non-additive change; forward unchanged, re-baseline
//   { action: "rewrite", tools, systemAdditions, newNames, knownTools } — pure addition; forward the rewritten tools[]/system additions
export function classifyToolChange(incomingTools, priorKnownTools) {
  if (!Array.isArray(priorKnownTools)) {
    return { action: "no-baseline", knownTools: incomingTools };
  }

  const priorByName = new Map(priorKnownTools.map((t) => [t.name, t]));
  const incomingByName = new Map(incomingTools.map((t) => [t.name, t]));

  for (const [name, priorTool] of priorByName) {
    const incomingTool = incomingByName.get(name);
    if (!incomingTool) {
      return { action: "reset", knownTools: incomingTools, reason: "tool-removed" };
    }
    if (toolFingerprint(incomingTool) !== toolFingerprint(priorTool)) {
      return { action: "reset", knownTools: incomingTools, reason: "tool-schema-changed" };
    }
  }

  const newNames = [...incomingByName.keys()].filter((name) => !priorByName.has(name));
  if (newNames.length === 0) {
    return { action: "unchanged", knownTools: priorKnownTools };
  }

  const knownOrderedTools = priorKnownTools.map((t) => incomingByName.get(t.name));
  const newTools = newNames.map((name) => incomingByName.get(name));
  const deferredNewTools = newTools.map((t) => ({ ...t, defer_loading: true }));

  return {
    action: "rewrite",
    tools: knownOrderedTools.concat(deferredNewTools),
    systemAdditions: newTools.map(buildToolAdditionBlock),
    newNames,
    knownTools: incomingTools,
  };
}

// --- Wire shapes (Phase-A placeholder — see file-header gap note) ---

// One system-role announcement block per newly-added tool. Text-block shape
// chosen for the same reason insertion-normalization/the ladder never
// invent a new content-block type: `type: "text"` is guaranteed valid on
// every current API surface, so a beta that reinterprets it (or is
// rejected outright) degrades to "the model sees an inert system note"
// rather than a malformed-request 400. Phase B validates the ACTUAL
// mid-conversation-tool-changes contract; this is deliberately the
// lowest-risk placeholder that satisfies "append a tool_addition block per
// new tool as a system-role message at the tail."
export function buildToolAdditionBlock(tool) {
  return {
    type: "text",
    text:
      `<tool_addition name=${JSON.stringify(tool.name)}>\n` +
      JSON.stringify({ name: tool.name, description: tool.description ?? null, input_schema: tool.input_schema ?? null }) +
      `\n</tool_addition>`,
  };
}

// --- Beta header (additive token; reuses no state from auto-1m-guard, but
// mirrors its header-token parse/join idiom rather than reimplementing ad
// hoc string splitting) ---

function findBetaHeader(headers) {
  if (!headers) return null;
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === BETA_HEADER_NAME) return { key: k, raw: headers[k] };
  }
  return null;
}

function parseBetaTokens(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

export function addBetaToken(headers) {
  const found = findBetaHeader(headers);
  const tokens = found ? parseBetaTokens(found.raw) : [];
  if (tokens.includes(BETA_TOKEN)) return; // already present — idempotent
  tokens.push(BETA_TOKEN);
  const key = found ? found.key : BETA_HEADER_NAME;
  headers[key] = tokens.join(", ");
}

// --- Extension contract ---

export default {
  name: "deferred-tool-rewrite",
  description:
    "Phase A: hold tools[] byte-stable across a pure tool addition, announcing the new tool via an appended " +
    "tool_addition system block instead (works around CC's mid-conversation deferred-tool-load cache bust)",
  enabled: false, // overridden by extensions.json
  order: 425,

  async onRequest(ctx) {
    if (!isEnabled()) return;
    if (!ctx || !ctx.body) return;

    const body = ctx.body;
    if (!Array.isArray(body.tools) || body.tools.length === 0) return;

    const dir = getSnapshotDir();
    const fs = DEFAULT_FS;
    const headers = ctx.headers || null;
    const sessionId = headers ? resolveSessionId(headers) : null;
    const sessionKey = resolveToolRewriteSessionKey(headers, body);

    try {
      const prior = await loadKnownTools(dir, sessionKey, fs);
      const result = classifyToolChange(body.tools, prior);

      if (result.action === "rewrite") {
        body.tools = result.tools;
        body.system = Array.isArray(body.system) ? body.system.concat(result.systemAdditions) : result.systemAdditions;
        if (headers) addBetaToken(headers);
      }
      // no-baseline, unchanged, and reset all forward body.tools untouched.

      await saveKnownTools(dir, sessionKey, result.knownTools, fs);

      ctx.meta = ctx.meta || {};
      ctx.meta.deferredToolRewriteStats = {
        action: result.action,
        newNames: result.newNames ?? [],
        reason: result.reason ?? null,
      };

      await appendTelemetry(
        dir,
        sessionKey,
        {
          ts: new Date().toISOString(),
          key: sessionKey,
          sid: sessionId,
          action: result.action,
          newNames: result.newNames ?? [],
          ...(result.reason ? { reason: result.reason } : {}),
        },
        fs,
      );

      if (isDebug()) {
        process.stderr.write(
          `[deferred-tool-rewrite] action=${result.action}` +
            (result.newNames ? ` new=${result.newNames.join(",")}` : "") +
            (result.reason ? ` reason=${result.reason}` : "") +
            "\n",
        );
      }
    } catch (err) {
      debug(`onRequest unexpected: ${err?.message ?? err}`);
    }
  },
};
