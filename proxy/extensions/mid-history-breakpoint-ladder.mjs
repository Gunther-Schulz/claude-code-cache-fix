// mid-history-breakpoint-ladder — pin one or two cache_control markers at
// stable mid-history depths so a mid-flight insertion/reorder (see the
// directive) still cache-READS up to the highest surviving rung instead of
// forcing a full-prefix rewrite from the divergence point.
//
// Activation: `enabled: true` in extensions.json (always loaded), runtime
// gate `CACHE_FIX_LADDER=1` (opt-in — same idiom as messages-cache-breakpoint's
// CACHE_FIX_INJECT_MESSAGES_BREAKPOINT). Env is read per-call so tests can
// flip it without re-importing.
//
// Order 420 — after cache-control-normalize (400) and messages-cache-
// breakpoint (410), so marker-count budget is checked against their output;
// before ttl-management (500), which upgrades any bare `{type:"ephemeral"}`
// marker to the configured TTL, so this extension does not set ttl itself.
//
// Sticky-rung state is persisted to disk under cache-fix-snapshots/
// (same idiom as insertion-normalization.mjs: atomic tmp+rename write,
// fail-open reload) so a proxy restart between requests reloads the prior
// placement instead of resetting to fresh — closing the gap the
// restart-transparent audit surfaced (docs/audits/restart-state-audit.md):
// this extension IS stateful, and prior to this fix the state never
// survived a restart, busting the exact prefix cache the ladder exists to
// protect.
//
// See docs/directives/proxy-mid-history-breakpoint-ladder.md for the full
// design (failure modes, budget rationale, rollout notes).

import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { claudeHome } from "../claude-home.mjs";
import { countAllCacheControlMarkers } from "./messages-cache-breakpoint.mjs";
import { resolveSessionId } from "./cache-telemetry.mjs";

const DEFAULT_FS = { readFile, writeFile, rename, appendFile, mkdir };

const MAX_MARKERS = 4;
const DEFAULT_RUNGS = 1;
const DEFAULT_ADVANCE = 40;
// Depth proportions in priority order — rung 1 at 50%, rung 2 (only reached
// if CACHE_FIX_LADDER_RUNGS=2 AND budget allows) at 75%. Per the directive,
// shipping the 75% rung is a separate decision; the config knob exists so
// operators can opt in once telemetry justifies it, but the default stays 1.
const RUNG_PROPORTIONS = [0.5, 0.75];

// --- Env gates (read per-call, mirrors messages-cache-breakpoint idiom) ---

function isLadderEnabled() {
  return process.env.CACHE_FIX_LADDER === "1";
}

function getRungCount() {
  const raw = process.env.CACHE_FIX_LADDER_RUNGS;
  const n = raw === undefined ? DEFAULT_RUNGS : parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_RUNGS;
  return Math.min(n, RUNG_PROPORTIONS.length);
}

function getAdvanceThreshold() {
  const raw = process.env.CACHE_FIX_LADDER_ADVANCE;
  const n = raw === undefined ? DEFAULT_ADVANCE : parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_ADVANCE;
}

function isDebug() {
  return process.env.CACHE_FIX_DEBUG === "1";
}

function debug(msg) {
  if (isDebug()) process.stderr.write(`[ladder] DEBUG: ${msg}\n`);
}

// --- Content hash (sticky check) ---
//
// Same idiom as prefix-diff's per-block hashing: hash everything except
// cache_control, since cache_control is what WE mutate — hashing it would
// make every rung look "changed" the instant we mark it.
export function hashMessageContent(msg) {
  if (!msg || !Array.isArray(msg.content)) return null;
  const stripped = msg.content.map((block) => {
    if (!block || typeof block !== "object") return block;
    const { cache_control, ...rest } = block;
    return rest;
  });
  return createHash("sha256").update(JSON.stringify(stripped)).digest("hex").slice(0, 16);
}

// --- Placement math ---

// Target message-array depth for a given rung proportion, rounded down.
export function computeRungDepth(messageCount, proportion) {
  return Math.floor(messageCount * proportion);
}

// Nearest user-role message at or before `targetIdx` (searching backward).
// Assistant blocks may carry thinking signatures that must not be touched
// (directive: "user-role messages only"), so a rung never lands on one.
// Returns -1 if no user message exists in [0, targetIdx].
export function findUserMessageAtOrBefore(messages, targetIdx) {
  if (!Array.isArray(messages)) return -1;
  const start = Math.min(targetIdx, messages.length - 1);
  for (let i = start; i >= 0; i--) {
    if (messages[i] && messages[i].role === "user" && Array.isArray(messages[i].content)) {
      return i;
    }
  }
  return -1;
}

// Place (or refresh) the ephemeral marker on the LAST content block of the
// user message at `idx` — mirrors cache-control-normalize's canonical
// per-message placement. No ttl here; ttl-management (order 500) upgrades
// any bare ephemeral marker afterward.
function placeMarker(messages, idx) {
  const msg = messages[idx];
  if (!msg || !Array.isArray(msg.content) || msg.content.length === 0) return false;
  const lastIdx = msg.content.length - 1;
  const lastBlock = msg.content[lastIdx];
  if (!lastBlock || typeof lastBlock !== "object") return false;
  msg.content[lastIdx] = { ...lastBlock, cache_control: { type: "ephemeral" } };
  return true;
}

// --- Per-session sticky state ---
//
// Persisted to disk under cache-fix-snapshots/<sessionKey>-ladder-rungs.json
// — same idiom as insertion-normalization's canonical-identity file: atomic
// tmp+rename write, fail-open reload (an unreadable/corrupt/missing state
// file is treated as "no prior rungs", i.e. fresh placement — never a
// crash). Reloaded on the first request for a session after a proxy
// restart, closing the gap the restart-transparent audit surfaced
// (docs/audits/restart-state-audit.md): this extension IS stateful, and
// before this change the state never survived a restart, busting the exact
// prefix cache the ladder exists to protect.
export function resolveLadderSessionKey(headers, messages) {
  const sid = headers ? resolveSessionId(headers) : null;
  if (sid) return `s-${sid}`;
  const first = Array.isArray(messages) ? messages[0] : null;
  const text = first && Array.isArray(first.content) ? JSON.stringify(first.content).slice(0, 500) : "";
  return `c-${createHash("sha256").update(text).digest("hex").slice(0, 16)}`;
}

function rungsPath(dir, sessionKey) {
  return join(dir, `${sessionKey}-ladder-rungs.json`);
}

async function loadRungs(dir, sessionKey, fs) {
  try {
    const txt = await fs.readFile(rungsPath(dir, sessionKey), "utf-8");
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed?.rungs)) return parsed.rungs;
    return null;
  } catch (err) {
    if (err && err.code !== "ENOENT") debug(`rung state read failed: ${err?.message ?? err}`);
    return null;
  }
}

async function saveRungs(dir, sessionKey, rungs, fs) {
  await fs.mkdir(dir, { recursive: true });
  const finalPath = rungsPath(dir, sessionKey);
  const tmpPath = `${finalPath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify({ rungs }, null, 2));
  await fs.rename(tmpPath, finalPath);
}

// Test-only: drop persisted rung state so a test can assert fresh-placement
// behavior without cross-test file collisions. No in-memory state exists to
// clear — disk IS the state, so "reset" only ever means "delete the
// file(s)". Called with a sessionKey, deletes just that session's file
// (fail-open on ENOENT). Called with no args, deletes every
// `*-ladder-rungs.json` file under the (optionally overridden) snapshot dir
// — mirrors the old bare `resetLadderState()` "clear everything" call
// shape tests already use.
export async function resetLadderState(sessionKey, dir) {
  const { readdir, unlink } = await import("node:fs/promises");
  const targetDir = dir || getSnapshotDir();
  if (sessionKey !== undefined) {
    try {
      await unlink(rungsPath(targetDir, sessionKey));
    } catch (err) {
      if (err && err.code !== "ENOENT") throw err;
    }
    return;
  }
  let files;
  try {
    files = await readdir(targetDir);
  } catch (err) {
    if (err && err.code === "ENOENT") return;
    throw err;
  }
  await Promise.all(
    files
      .filter((f) => f.endsWith("-ladder-rungs.json"))
      .map((f) => unlink(join(targetDir, f)).catch((err) => {
        if (err && err.code !== "ENOENT") throw err;
      })),
  );
}

// --- Core placement decision (pure given messages + prior state) ---
//
// Returns { rungs: [{idx, hash, status}], statuses } where status is one of
// "placed" | "sticky" | "advanced" | "reset" | "unplaceable".
export function computeLadderPlacement(messages, priorRungs, rungCount, advanceThreshold) {
  const results = [];
  const prior = Array.isArray(priorRungs) ? priorRungs : [];

  for (let r = 0; r < rungCount; r++) {
    const proportion = RUNG_PROPORTIONS[r];
    const stored = prior[r];

    if (!stored) {
      const targetIdx = computeRungDepth(messages.length, proportion);
      const idx = findUserMessageAtOrBefore(messages, targetIdx);
      if (idx === -1) {
        results.push({ idx: -1, hash: null, status: "unplaceable" });
        continue;
      }
      results.push({
        idx,
        hash: hashMessageContent(messages[idx]),
        status: "placed",
        placedAtLength: messages.length,
      });
      continue;
    }

    // Growth SINCE the rung was placed — not the rung's own depth (a 50%
    // rung is, by construction, already `length/2` messages behind the
    // tail the instant it's placed, so measuring against the rung's index
    // would trigger "advance" on the very next request).
    const placedAtLength = stored.placedAtLength ?? stored.idx;
    const grew = messages.length - placedAtLength;
    if (grew >= advanceThreshold) {
      const targetIdx = computeRungDepth(messages.length, proportion);
      const idx = findUserMessageAtOrBefore(messages, targetIdx);
      if (idx === -1) {
        results.push({ idx: -1, hash: null, status: "unplaceable" });
        continue;
      }
      results.push({
        idx,
        hash: hashMessageContent(messages[idx]),
        status: "advanced",
        placedAtLength: messages.length,
      });
      continue;
    }

    const msg = messages[stored.idx];
    const stillUser = msg && msg.role === "user" && Array.isArray(msg.content);
    const currentHash = stillUser ? hashMessageContent(msg) : null;
    if (stillUser && currentHash === stored.hash) {
      results.push({ idx: stored.idx, hash: currentHash, status: "sticky", placedAtLength });
      continue;
    }

    // Underlying history at the rung diverged outside the normal advance
    // path (e.g. compaction rewrote earlier messages) — re-place fresh
    // rather than keep a marker on content that no longer matches.
    const targetIdx = computeRungDepth(messages.length, proportion);
    const idx = findUserMessageAtOrBefore(messages, targetIdx);
    if (idx === -1) {
      results.push({ idx: -1, hash: null, status: "unplaceable" });
      continue;
    }
    results.push({
      idx,
      hash: hashMessageContent(messages[idx]),
      status: "reset",
      placedAtLength: messages.length,
    });
  }

  return results;
}

// --- Telemetry ---

function getSnapshotDir() {
  return join(claudeHome(), "cache-fix-snapshots");
}

async function writeTelemetry(sessionKey, record) {
  const dir = getSnapshotDir();
  const path = join(dir, `${sessionKey.replace(/[^A-Za-z0-9_-]/g, "_")}-ladder-events.jsonl`);
  try {
    await mkdir(dir, { recursive: true });
    await appendFile(path, JSON.stringify(record) + "\n");
  } catch (err) {
    debug(`telemetry write failed: ${err?.message ?? err}`);
  }
}

function emitStderrSummary(rungs, budgetSkipped) {
  if (budgetSkipped) {
    process.stderr.write(`[ladder] skipped reason=budget\n`);
    return;
  }
  const parts = rungs.map((r) => `idx=${r.idx} status=${r.status}`).join(" ");
  process.stderr.write(`[ladder] ${parts}\n`);
}

// --- Extension contract ---

export default {
  name: "mid-history-breakpoint-ladder",
  description:
    "Pin one or two cache_control markers at stable mid-history depths so a " +
    "mid-flight insertion converts a full-prefix rewrite into a partial one",
  enabled: false, // overridden by extensions.json
  order: 420,

  async onRequest(ctx) {
    if (!isLadderEnabled()) return;
    if (!ctx || !ctx.body) return;

    const body = ctx.body;
    const messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) return;

    try {
      const existingMarkers = countAllCacheControlMarkers(body);
      const budgetSlots = MAX_MARKERS - existingMarkers;
      const sessionKey = resolveLadderSessionKey(ctx.headers, messages);

      if (budgetSlots <= 0) {
        emitStderrSummary(null, true);
        ctx.meta = ctx.meta || {};
        ctx.meta.ladderStats = { skipped: true, reason: "budget", existing_marker_count: existingMarkers };
        await writeTelemetry(sessionKey, {
          ts: new Date().toISOString(),
          existing_marker_count: existingMarkers,
          rungs: [],
          skipped: "budget",
        });
        return;
      }

      const configuredRungs = getRungCount();
      const rungCount = Math.min(configuredRungs, budgetSlots);
      const advanceThreshold = getAdvanceThreshold();
      const dir = getSnapshotDir();
      const prior = await loadRungs(dir, sessionKey, DEFAULT_FS);

      const placement = computeLadderPlacement(messages, prior, rungCount, advanceThreshold);

      const applied = [];
      for (const rung of placement) {
        if (rung.idx === -1) continue;
        const ok = placeMarker(messages, rung.idx);
        if (ok) applied.push(rung);
      }

      if (applied.length > 0) {
        await saveRungs(
          dir,
          sessionKey,
          applied.map((r) => ({ idx: r.idx, hash: r.hash, placedAtLength: r.placedAtLength })),
          DEFAULT_FS,
        );
      }

      ctx.meta = ctx.meta || {};
      ctx.meta.ladderStats = {
        skipped: false,
        existing_marker_count: existingMarkers,
        rungs: applied.map((r) => ({ idx: r.idx, status: r.status })),
      };

      emitStderrSummary(applied, false);
      await writeTelemetry(sessionKey, {
        ts: new Date().toISOString(),
        existing_marker_count: existingMarkers,
        rungs: applied.map((r) => ({ idx: r.idx, status: r.status })),
        skipped: null,
      });
    } catch (err) {
      debug(`onRequest unexpected: ${err?.message ?? err}`);
    }
  },
};
