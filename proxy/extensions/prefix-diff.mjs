// prefix-diff — diagnostic extension for hunting cache-bust sources.
//
// On every request, snapshots a small projection of the prefix (system
// prompt + tools + first 5 messages) and writes it to
// `~/.claude/cache-fix-snapshots/<key>-last.json`. If a prior snapshot
// exists and differs, also writes a `<key>-diff.json` and emits a
// one-line stderr summary.
//
// No request mutation. The diagnostic is fail-open: any I/O error is
// swallowed silently in production. Set CACHE_FIX_DEBUG=1 to also log
// swallowed errors so silent failures stay observable.
//
// Adaptation from preload's `snapshotPrefix(payload)` (preload.mjs ~1656):
// preload fired the diff once per process restart. The proxy is long-lived
// and supports hot-reload, so we drop the "first call" gate and run the
// diff per call. Trade-off: more disk writes, but each is tiny and the
// diagnostic value is higher (drift visible across every turn, not just
// at startup).
//
// Three snapshot windows (2026-07-26): the original head-only window
// (first 5 messages) is blind to busts in the array's middle/tail once a
// session grows past a handful of turns — a 300+ turn session can log
// "0 differences" every request while full-context re-caches happen
// outside the window. Two more windows close that gap:
//   - marker window: every message carrying a cache_control block. These
//     ARE the API's cache-boundary anchors, so they're exactly where a
//     bust would show up regardless of session length. Bounded to
//     hash + 200-char preview per marker (not full bodies), capped at 8
//     stored markers, to keep snapshots small even in long sessions.
//   - tail window: last 3 messages, same truncation rules as the head
//     window (full projected content, cache_control stripped, text >500
//     chars truncated) — catches busts near the live edge of the
//     conversation that neither head nor markers would see.

import {
  mkdir as _mkdir,
  readFile as _readFile,
  writeFile as _writeFile,
  rename as _rename,
} from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { claudeHome } from "../claude-home.mjs";

const ENABLED = process.env.CACHE_FIX_PREFIXDIFF === "1";
const DEBUG = process.env.CACHE_FIX_DEBUG === "1";

const DEFAULT_FS = {
  mkdir: _mkdir,
  readFile: _readFile,
  writeFile: _writeFile,
  rename: _rename,
};

function getSnapshotDir() {
  return join(claudeHome(), "cache-fix-snapshots");
}

function debug(msg) {
  if (DEBUG) process.stderr.write(`[prefix-diff] ${msg}\n`);
}

function computeSessionKey(system) {
  return createHash("sha256")
    .update(JSON.stringify(system).slice(0, 2000))
    .digest("hex")
    .slice(0, 12);
}

function computeToolsHash(tools) {
  if (!Array.isArray(tools) || tools.length === 0) return "none";
  // Match preload behavior: hash unsorted tool names so order changes
  // surface as hash mismatches (a real cache-bust signal).
  return createHash("sha256")
    .update(JSON.stringify(tools.map((t) => t?.name ?? "")))
    .digest("hex")
    .slice(0, 16);
}

function computeSystemHash(system) {
  if (!system) return "none";
  return createHash("sha256")
    .update(JSON.stringify(system))
    .digest("hex")
    .slice(0, 16);
}

// Project a single message: strip cache_control, truncate text >500 chars
// with `...[N chars]` marker. Pure: returns a new object, never mutates
// input. Shared by the head and tail windows so both apply identical
// truncation rules.
function truncateOneMessage(msg) {
  if (!msg || !Array.isArray(msg.content)) {
    return { role: msg?.role, content: msg?.content };
  }
  const cleanedContent = msg.content.map((block) => {
    if (!block || typeof block !== "object") return block;
    const { cache_control, ...rest } = block;
    if (typeof rest.text === "string" && rest.text.length > 500) {
      return {
        ...rest,
        text: rest.text.slice(0, 500) + `...[${rest.text.length} chars]`,
      };
    }
    return rest;
  });
  return { role: msg.role, content: cleanedContent };
}

// Project the first 5 messages (the head window): strip cache_control,
// truncate text >500 chars with `...[N chars]` marker.
function truncatePrefixMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(0, 5).map(truncateOneMessage);
}

// Project the last 3 messages (the tail window), same truncation rules as
// the head window. Catches busts near the live edge of long sessions that
// the head window (fixed at the start of the array) can never see.
function truncateTailMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-3).map(truncateOneMessage);
}

// True if `msg` carries at least one content block with a cache_control
// marker. These are exactly the boundaries the API caches against.
function hasCacheControl(msg) {
  if (!msg || !Array.isArray(msg.content)) return false;
  return msg.content.some((b) => b && typeof b === "object" && b.cache_control);
}

const MARKER_CAP = 8;
const MARKER_PREVIEW_CHARS = 200;

// Concatenate the text blocks of a message and take the first N chars.
// Used only for the marker window's bounded preview (not the full
// truncated-content detail the head/tail windows carry).
function messageTextPreview(msg, maxChars = MARKER_PREVIEW_CHARS) {
  if (!msg || !Array.isArray(msg.content)) return null;
  const text = msg.content
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join(" ");
  return text.slice(0, maxChars);
}

// Hash a message's cache_control-stripped content. Used for the marker
// window so stored entries stay small (hash + preview, not full bodies).
function hashMessageContent(msg) {
  return createHash("sha256")
    .update(JSON.stringify(truncateOneMessage(msg)))
    .digest("hex")
    .slice(0, 16);
}

// Build the marker window: one entry per message carrying a cache_control
// block, in array order, capped at MARKER_CAP entries. Each entry stores
// only a hash + short preview, not the full message body — long sessions
// can accumulate many turns, and this window must stay cheap regardless
// of session length.
function buildMarkerSnapshot(messages) {
  if (!Array.isArray(messages)) return [];
  const markers = [];
  for (let i = 0; i < messages.length && markers.length < MARKER_CAP; i++) {
    const msg = messages[i];
    if (!hasCacheControl(msg)) continue;
    markers.push({
      index: i,
      hash: hashMessageContent(msg),
      textPreview: messageTextPreview(msg),
    });
  }
  return markers;
}

function buildSnapshot(payload) {
  if (!payload || !payload.system) return null;
  return {
    timestamp: new Date().toISOString(),
    messageCount: Array.isArray(payload.messages) ? payload.messages.length : 0,
    toolsHash: computeToolsHash(payload.tools),
    systemHash: computeSystemHash(payload.system),
    prefixMessages: truncatePrefixMessages(payload.messages),
    tailMessages: truncateTailMessages(payload.messages),
    markerMessages: buildMarkerSnapshot(payload.messages),
  };
}

// Positional diff over two arrays of truncated messages (used for both the
// head and tail windows — same shape, same comparison rule: serialize and
// compare by array position).
function diffMessageWindow(prevMsgs, nowMsgs) {
  const diffs = [];
  const maxIdx = Math.max(prevMsgs.length, nowMsgs.length);
  for (let i = 0; i < maxIdx; i++) {
    const prevSer = JSON.stringify(prevMsgs[i] ?? null);
    const nowSer = JSON.stringify(nowMsgs[i] ?? null);
    if (prevSer !== nowSer) {
      diffs.push({ index: i, prev: prevMsgs[i] ?? null, now: nowMsgs[i] ?? null });
    }
  }
  return diffs;
}

// Diff the marker window. Markers are keyed by their message index in the
// original array (not by position in the marker list) so a shift caused by
// markers entering/leaving the cap doesn't read as spurious churn — each
// entry reports the marker's message index directly, as the diff consumer
// needs to know which prefix boundary moved.
function diffMarkerWindow(prevMarkers, nowMarkers) {
  const prevByIdx = new Map((prevMarkers ?? []).map((m) => [m.index, m]));
  const nowByIdx = new Map((nowMarkers ?? []).map((m) => [m.index, m]));
  const allIdx = new Set([...prevByIdx.keys(), ...nowByIdx.keys()]);
  const diffs = [];
  for (const idx of [...allIdx].sort((a, b) => a - b)) {
    const prevM = prevByIdx.get(idx) ?? null;
    const nowM = nowByIdx.get(idx) ?? null;
    if ((prevM?.hash ?? null) !== (nowM?.hash ?? null)) {
      diffs.push({ index: idx, prev: prevM, now: nowM });
    }
  }
  return diffs;
}

function computeDiff(prev, current) {
  const prevMsgs = Array.isArray(prev.prefixMessages) ? prev.prefixMessages : [];
  const nowMsgs = Array.isArray(current.prefixMessages) ? current.prefixMessages : [];
  const prevTail = Array.isArray(prev.tailMessages) ? prev.tailMessages : [];
  const nowTail = Array.isArray(current.tailMessages) ? current.tailMessages : [];
  const prevMarkers = Array.isArray(prev.markerMessages) ? prev.markerMessages : [];
  const nowMarkers = Array.isArray(current.markerMessages) ? current.markerMessages : [];

  return {
    timestamp: current.timestamp,
    prevTimestamp: prev.timestamp,
    toolsMatch: prev.toolsHash === current.toolsHash,
    systemMatch: prev.systemHash === current.systemHash,
    messageCountPrev: prev.messageCount,
    messageCountNow: current.messageCount,
    prefixDiffs: diffMessageWindow(prevMsgs, nowMsgs),
    tailDiffs: diffMessageWindow(prevTail, nowTail),
    markerDiffs: diffMarkerWindow(prevMarkers, nowMarkers),
    markerCount: nowMarkers.length,
  };
}

function diffHasChanges(diff) {
  return (
    diff.prefixDiffs.length > 0 ||
    diff.tailDiffs.length > 0 ||
    diff.markerDiffs.length > 0 ||
    !diff.toolsMatch ||
    !diff.systemMatch ||
    diff.messageCountPrev !== diff.messageCountNow
  );
}

// Atomic write: stage to a unique-per-invocation .tmp, then rename to
// final path. The unique suffix is essential under concurrency — two
// parallel callers writing to the same finalPath would otherwise share
// a single .tmp and corrupt each other's content.
//
// On rename failure the prior final-path file (if any) remains intact.
// The orphan .tmp persists on disk — because each invocation uses a
// unique temp name, later calls do NOT implicitly overwrite it. This is
// a small leak (accepted: failures are rare, files are tiny) rather than
// a correctness issue. A follow-up could add best-effort cleanup.
async function atomicWriteJson(finalPath, obj, fs) {
  const tmpPath = `${finalPath}.${process.pid}.${Date.now()}.${Math.random()
    .toString(36)
    .slice(2, 10)}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(obj, null, 2));
  await fs.rename(tmpPath, finalPath);
}

/**
 * Snapshot the prefix of `payload` and diff against the prior snapshot.
 *
 * Pure-ish: never throws, never mutates `payload`. All I/O is gated by
 * try/catch; failures are debug-logged when CACHE_FIX_DEBUG=1.
 *
 * @param {object} payload  The request body (system, tools, messages).
 * @param {object} options
 * @param {string} [options.dir] Snapshot directory. Defaults to ~/.claude/cache-fix-snapshots.
 * @param {object} [options.fs]  fs/promises overrides for tests:
 *                               { mkdir, readFile, writeFile, rename }.
 *                               Any subset replaces the corresponding default.
 * @returns {Promise<{ key, wroteSnapshot, wroteDiff } | null>} Result for tests; null if no system.
 */
async function snapshotPrefix(payload, options = {}) {
  const current = buildSnapshot(payload);
  if (!current) return null;

  const dir = options.dir || getSnapshotDir();
  const fs = { ...DEFAULT_FS, ...(options.fs || {}) };

  const sessionKey = computeSessionKey(payload.system);
  const lastPath = join(dir, `${sessionKey}-last.json`);
  const diffPath = join(dir, `${sessionKey}-diff.json`);

  // Ensure directory exists. mkdir failure aborts — without dir, nothing
  // else can succeed.
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    debug(`mkdir failed for ${dir}: ${err?.message ?? err}`);
    return { key: sessionKey, wroteSnapshot: false, wroteDiff: false };
  }

  // Read prior snapshot if it exists. Missing file is normal; corrupt
  // file is treated as no prior (skip diff, proceed to overwrite).
  let prev = null;
  try {
    const txt = await fs.readFile(lastPath, "utf-8");
    prev = JSON.parse(txt);
  } catch (err) {
    if (err && err.code !== "ENOENT") {
      debug(`prior snapshot unreadable at ${lastPath}: ${err?.message ?? err}`);
    }
  }

  // Compute and write diff if anything changed.
  let wroteDiff = false;
  if (prev) {
    const diff = computeDiff(prev, current);
    if (diffHasChanges(diff)) {
      try {
        await atomicWriteJson(diffPath, diff, fs);
        wroteDiff = true;
        // Always log the summary line when a diff fires (not just under
        // CACHE_FIX_DEBUG) — this is the diagnostic's whole purpose. The
        // per-window counts (head/markers/tail) tell the reader which
        // window caught the bust without opening the diff file.
        const totalDiffs =
          diff.prefixDiffs.length + diff.markerDiffs.length + diff.tailDiffs.length;
        process.stderr.write(
          `[prefix-diff] ${sessionKey}: ${totalDiffs} differences ` +
            `(head=${diff.prefixDiffs.length}, markers=${diff.markerDiffs.length}, ` +
            `tail=${diff.tailDiffs.length}), ` +
            `tools=${diff.toolsMatch ? "match" : "DIFFER"}, ` +
            `system=${diff.systemMatch ? "match" : "DIFFER"}, ` +
            `messages=${diff.messageCountPrev}→${diff.messageCountNow}, ` +
            `marker_count=${diff.markerCount}\n`,
        );
      } catch (err) {
        debug(`diff write failed at ${diffPath}: ${err?.message ?? err}`);
      }
    }
  }

  // Always write the new snapshot atomically so the next call has a
  // fresh baseline. On failure, prior snapshot is intact.
  let wroteSnapshot = false;
  try {
    await atomicWriteJson(lastPath, current, fs);
    wroteSnapshot = true;
  } catch (err) {
    debug(`snapshot write failed at ${lastPath}: ${err?.message ?? err}`);
  }

  return { key: sessionKey, wroteSnapshot, wroteDiff };
}

// The named exports below are internal test seams, not part of the
// proxy extension contract. Pipeline loading consumes only `default`.
// They're exposed so tests can call the helpers directly with their own
// options (tmpdir, failing fs mocks) instead of mutating process env or
// monkey-patching node:fs/promises at module scope.
export {
  snapshotPrefix,
  buildSnapshot,
  computeDiff,
  computeSessionKey,
  truncatePrefixMessages,
  truncateTailMessages,
  buildMarkerSnapshot,
  diffHasChanges,
};

export default {
  name: "prefix-diff",
  description:
    "Snapshot prefix (head/marker/tail windows + system + tools) and diff " +
    "against previous run for cache-bust hunting, including long-session " +
    "busts outside the first 5 messages",
  // Always loaded; gated at runtime by CACHE_FIX_PREFIXDIFF=1 inside onRequest.
  // This matches the acceptance criteria (env var alone activates) — the
  // extension is cheap to load (one no-op check per request when disabled).
  enabled: true,
  order: 680,

  async onRequest(ctx) {
    if (!ENABLED) return;
    if (!ctx || !ctx.body) return;
    // snapshotPrefix never throws; double-belt try/catch is defense in depth.
    try {
      await snapshotPrefix(ctx.body);
    } catch (err) {
      debug(`onRequest unexpected: ${err?.message ?? err}`);
    }
  },
};
