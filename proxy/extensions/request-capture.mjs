// request-capture — record full request bodies for offline replay.
//
// Directive: docs/directives/proxy-request-capture-replay.md (stage 1).
// The proxy is the only component that sees every request byte-for-byte;
// until this extension, it threw the bodies away, so every pipeline
// change could only be validated against synthetic fixtures or live
// traffic. Captures feed tools/replay.mjs and tools/cache-sim.mjs.
//
// Order 60 — after bootstrap-defense (45) and ttl-tier-detect (75 is
// AFTER, fine: it only reads), before cc-version-normalize (90), the
// first extension that MUTATES the body. Capture must record what CC
// sent, not what the pipeline made of it.
//
// Activation: `enabled: true` in extensions.json (always loaded), runtime
// gate CACHE_FIX_REQUEST_CAPTURE=1 (read per-call so tests can flip it).
// Fail-open: capture failure never fails the request. CACHE_FIX_DEBUG=1
// logs swallowed errors, same idiom as prefix-diff.
//
// Sensitivity: captures contain the FULL conversation content — the same
// sensitivity as the transcripts in ~/.claude/projects/, on the same
// machine. No new exposure class; documented in the directive.
//
// Retention: CACHE_FIX_CAPTURE_MAX_MB (default 2048). Checked every
// SWEEP_EVERY appends per process; oldest capture files deleted first
// until under the cap. The sweep is best-effort and fail-open.

import { appendFile, mkdir, readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { claudeHome } from "../claude-home.mjs";
import { resolveSessionId } from "./cache-telemetry.mjs";
import { createHash } from "node:crypto";

const DEFAULT_FS = { appendFile, mkdir, readdir, stat, unlink };
const SWEEP_EVERY = 50;

let _appendsSinceSweep = 0;

function isEnabled(env = process.env) {
  return env.CACHE_FIX_REQUEST_CAPTURE === "1";
}

function isDebug(env = process.env) {
  return env.CACHE_FIX_DEBUG === "1";
}

function debug(msg) {
  if (isDebug()) process.stderr.write(`[request-capture] DEBUG: ${msg}\n`);
}

function getCaptureDir() {
  return join(claudeHome(), "cache-fix-captures");
}

function getMaxBytes(env = process.env) {
  const raw = parseInt(env.CACHE_FIX_CAPTURE_MAX_MB ?? "2048", 10);
  const mb = Number.isFinite(raw) && raw > 0 ? raw : 2048;
  return mb * 1024 * 1024;
}

// Same key derivation family as prefix-diff/insertion-normalization:
// session-id header preferred, content-hash fallback — captures must join
// against the existing events ledgers by key + ts.
export function resolveCaptureKey(headers, body) {
  const sid = headers ? resolveSessionId(headers) : null;
  if (sid) return `s-${sid.replace(/[^A-Za-z0-9_-]/g, "_")}`;
  const first = Array.isArray(body?.messages) ? body.messages[0] : null;
  const h = first
    ? createHash("sha256").update(JSON.stringify(first)).digest("hex").slice(0, 12)
    : "empty";
  return `c-${h}`;
}

// One NDJSON record per request. Headers are reduced to the two that
// matter for replay fidelity (beta set: cache semantics; session-id:
// key derivation) — full header capture would add auth material to a
// file that must never contain it.
export function buildCaptureRecord(ctx, now = new Date()) {
  const headers = ctx.headers || {};
  return {
    ts: now.toISOString(),
    sid: resolveSessionId(headers) ?? null,
    key: resolveCaptureKey(headers, ctx.body),
    headers: {
      "anthropic-beta": headers["anthropic-beta"] ?? null,
      "session-id": headers["session-id"] ?? headers["x-session-id"] ?? null,
    },
    body: ctx.body,
  };
}

// Delete oldest capture files until the directory is under maxBytes.
// Returns the number of files deleted (for tests/telemetry).
export async function sweepCaptureDir(dir, maxBytes, fs = DEFAULT_FS) {
  let files;
  try {
    files = await fs.readdir(dir);
  } catch {
    return 0;
  }
  const entries = [];
  for (const f of files) {
    if (!f.endsWith("-requests.jsonl")) continue;
    try {
      const st = await fs.stat(join(dir, f));
      entries.push({ f, size: st.size, mtimeMs: st.mtimeMs });
    } catch {}
  }
  let total = entries.reduce((a, e) => a + e.size, 0);
  if (total <= maxBytes) return 0;
  entries.sort((a, b) => a.mtimeMs - b.mtimeMs);
  let deleted = 0;
  for (const e of entries) {
    if (total <= maxBytes) break;
    try {
      await fs.unlink(join(dir, e.f));
      total -= e.size;
      deleted++;
    } catch {}
  }
  return deleted;
}

export default {
  name: "request-capture",
  description:
    "Append full request bodies (pre-mutation) to " +
    "~/.claude/cache-fix-captures/<key>-requests.jsonl for offline " +
    "replay and cache simulation",
  enabled: false, // overridden by extensions.json
  order: 60,

  async onRequest(ctx) {
    if (!isEnabled()) return;
    if (!ctx || !ctx.body || !Array.isArray(ctx.body.messages)) return;

    try {
      const dir = getCaptureDir();
      const record = buildCaptureRecord(ctx);
      await DEFAULT_FS.mkdir(dir, { recursive: true });
      await DEFAULT_FS.appendFile(
        join(dir, `${record.key}-requests.jsonl`),
        JSON.stringify(record) + "\n",
      );
      if (++_appendsSinceSweep >= SWEEP_EVERY) {
        _appendsSinceSweep = 0;
        await sweepCaptureDir(dir, getMaxBytes(), DEFAULT_FS);
      }
    } catch (err) {
      debug(`capture failed: ${err?.message ?? err}`);
    }
  },
};
