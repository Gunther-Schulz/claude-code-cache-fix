// prefix-diff — diagnostic extension for hunting cache-bust sources.
//
// On every request, snapshots a projection of everything the prompt cache
// keys on and diffs it against the previous request's snapshot. Writes
// three artifacts under `~/.claude/cache-fix-snapshots/`:
//
//   <key>-last.json    latest snapshot (overwritten; the diff baseline)
//   <key>-diff.json    latest diff, full detail (overwritten)
//   <key>-events.jsonl append-only ledger, one bounded record per diff
//
// No request mutation. Fail-open: any I/O error is swallowed. Set
// CACHE_FIX_DEBUG=1 to also log swallowed errors.
//
// ---------------------------------------------------------------------
// Design notes — the four blind spots this version closes (2026-07-27)
//
// A resume-after-quit bust was traced to `system=DIFFER` and went no
// further: the tooling could say the system prompt changed but not which
// block, let alone which bytes. Investigating that turned up four ways
// the diagnostic could report nothing, or report something misleading,
// on exactly the events it exists to catch.
//
// 1. SELF-DEFEATING KEY. The session key was
//    `sha256(JSON.stringify(system).slice(0, 2000))` — derived from one
//    of the very things being diffed. A system-prompt change inside that
//    2000-char window changed the key, so the lookup missed the prior
//    snapshot, so NO diff was written and NO line was logged. The most
//    important bust class could vanish without a trace, and whether it
//    did came down to whether the changed bytes happened to sit before
//    or after char 2000. The key now comes from the request's session-id
//    header (`resolveSessionId`) — an identifier that cannot drift with
//    the content it indexes. The content hash remains only as a fallback
//    for requests without the header.
//
// 2. SELF-ERASING EVIDENCE. `<key>-diff.json` was a single fixed path
//    rewritten on every diff, so a bust's detail survived only until the
//    next one — minutes, in an active session. Post-mortems ran against
//    a file that had already been overwritten. The full-detail file
//    stays (it is the convenient "what just happened" view), but every
//    diff now also appends a bounded record to `<key>-events.jsonl`,
//    which is never rewritten in place.
//
// 3. NAME-ONLY TOOL HASHING. `toolsHash` hashed `tools.map(t => t.name)`.
//    Schema and description changes — MCP servers reconnecting with
//    revised definitions, a tool gaining a parameter — were invisible,
//    and `tools=match` was routinely reported for a tools array whose
//    bytes had changed. Tools are now hashed over their full JSON, with
//    a per-tool hash so a diff names the specific tool.
//
// 4. OPAQUE SYSTEM HASH. One hash over the whole system array answered
//    "did it change" and nothing else. Snapshots now store each block's
//    full text (capped), so a diff reports the changed block's index,
//    label, first differing character offset, and a context window from
//    both sides — byte-level evidence rather than a boolean.
//
// Two further gaps closed at the same time:
//   - TOP-LEVEL PARAMS (model, temperature, max_tokens, thinking, …)
//     were not snapshotted at all, yet a change to any of them changes
//     the cache key. A model switch mid-session read as "0 differences".
//   - MESSAGE-ARRAY MIDDLE. Head (5) + markers (8) + tail (3) windows
//     leave a long session's middle unobserved. Every message is now
//     hashed — cheap, ~40 bytes each — so the diff reports the exact
//     first divergent index regardless of where it lands. The three
//     windows remain, now as detail providers for the region the hash
//     chain points at.
//
// The organising rule, learned the hard way: the snapshot must cover
// everything the cache keys on, and the key under which it is stored
// must not be one of those things.
// ---------------------------------------------------------------------

import {
  mkdir as _mkdir,
  readFile as _readFile,
  writeFile as _writeFile,
  rename as _rename,
  appendFile as _appendFile,
  stat as _stat,
} from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { claudeHome } from "../claude-home.mjs";
import { resolveSessionId } from "./cache-telemetry.mjs";

const ENABLED = process.env.CACHE_FIX_PREFIXDIFF === "1";
const DEBUG = process.env.CACHE_FIX_DEBUG === "1";

const DEFAULT_FS = {
  mkdir: _mkdir,
  readFile: _readFile,
  writeFile: _writeFile,
  rename: _rename,
  appendFile: _appendFile,
  stat: _stat,
};

// Per-block system text is stored in full so diffs can locate exact bytes.
// Capped so a pathological block can't bloat the snapshot; the cap is far
// above any real Claude Code system block.
const SYSTEM_TEXT_CAP = 20000;
// Context window shown either side of a byte-level divergence.
const DIVERGENCE_WINDOW = 120;
const MARKER_CAP = 8;
const MARKER_PREVIEW_CHARS = 200;
// Rotate the append-only ledger past this size so it cannot grow forever.
const EVENTS_MAX_BYTES = 5 * 1024 * 1024;

// Top-level request fields that participate in the cache key. Anything
// here changing invalidates the prefix, so all of it must be snapshotted.
const TRACKED_PARAMS = [
  "model",
  "max_tokens",
  "temperature",
  "top_p",
  "top_k",
  "stop_sequences",
  "thinking",
  "tool_choice",
  "service_tier",
  "anthropic_version",
];

function getSnapshotDir() {
  return join(claudeHome(), "cache-fix-snapshots");
}

function debug(msg) {
  if (DEBUG) process.stderr.write(`[prefix-diff] ${msg}\n`);
}

function sha(value, len = 16) {
  return createHash("sha256").update(value).digest("hex").slice(0, len);
}

// Fallback key only. Prefer resolveSessionKey(), which reads the session-id
// header — a key derived from the diffed content is the blind spot that
// made busts disappear (see design note 1).
function computeSessionKey(system) {
  return sha(JSON.stringify(system).slice(0, 2000), 12);
}

/**
 * Storage key for a request. The session-id header is stable across the
 * life of a conversation and independent of the payload, so a snapshot
 * stays findable no matter what changed inside it. Content hash is the
 * fallback when no header is present (direct API calls, tests).
 */
function resolveSessionKey(headers, system) {
  const sid = headers ? resolveSessionId(headers) : null;
  if (sid) return `s-${sha(sid, 12)}`;
  return computeSessionKey(system);
}

// Full-JSON tool hashing (design note 3) plus per-tool hashes so a diff
// can name the tool that changed rather than only that something did.
function buildToolsSnapshot(tools) {
  if (!Array.isArray(tools) || tools.length === 0) {
    return { hash: "none", count: 0, tools: [] };
  }
  const entries = tools.map((t, i) => ({
    index: i,
    name: t?.name ?? `<unnamed:${i}>`,
    hash: sha(JSON.stringify(t ?? null)),
    bytes: JSON.stringify(t ?? null).length,
  }));
  return {
    // Order-sensitive: reordering tools changes the request bytes, so it
    // is a real bust cause and must not hash equal.
    hash: sha(JSON.stringify(entries.map((e) => [e.name, e.hash]))),
    count: entries.length,
    tools: entries,
  };
}

// Backwards-compatible scalar hash (kept for the snapshot's flat field and
// for callers/tests that only need "did tools change at all").
function computeToolsHash(tools) {
  return buildToolsSnapshot(tools).hash;
}

function computeSystemHash(system) {
  if (!system) return "none";
  return sha(JSON.stringify(system));
}

// A short human label for a system block, so a diff line reads
// "block 2 (env)" instead of "block 2". Derived from content because
// the API gives blocks no identity of their own.
function labelSystemBlock(text) {
  if (typeof text !== "string" || text.length === 0) return "empty";
  const head = text.slice(0, 200).replace(/\s+/g, " ").trim();
  if (/^You are Claude Code/i.test(head)) return "cc-identity";
  if (/claudeMd|CLAUDE\.md/.test(head)) return "claude-md";
  if (/<env>|Working directory|Platform:/i.test(head)) return "env";
  if (/billing|x-anthropic-billing/i.test(head)) return "billing";
  if (/system-reminder/i.test(head)) return "system-reminder";
  if (/available skills|Skill tool/i.test(head)) return "skills";
  if (/agent types|subagent_type/i.test(head)) return "agents";
  return head.slice(0, 40) || "text";
}

// Store each system block's full text (capped) rather than one opaque
// hash, so computeDiff can point at the exact bytes that moved.
function buildSystemSnapshot(system) {
  if (typeof system === "string") {
    return [
      {
        index: 0,
        type: "string",
        label: labelSystemBlock(system),
        chars: system.length,
        hash: sha(system),
        text: system.slice(0, SYSTEM_TEXT_CAP),
        truncated: system.length > SYSTEM_TEXT_CAP,
      },
    ];
  }
  if (!Array.isArray(system)) return [];
  return system.map((block, i) => {
    const text = typeof block?.text === "string" ? block.text : "";
    // Hash the whole block, not just its text — cache_control placement
    // and any other field are part of the request bytes.
    const { cache_control, ...rest } = block ?? {};
    return {
      index: i,
      type: block?.type ?? "unknown",
      label: labelSystemBlock(text),
      chars: text.length,
      hash: sha(JSON.stringify(rest)),
      hasCacheControl: Boolean(cache_control),
      text: text.slice(0, SYSTEM_TEXT_CAP),
      truncated: text.length > SYSTEM_TEXT_CAP,
    };
  });
}

function buildParamsSnapshot(payload) {
  const params = {};
  for (const key of TRACKED_PARAMS) {
    if (payload && payload[key] !== undefined) params[key] = payload[key];
  }
  return params;
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

// Strip cache_control WITHOUT truncating. The hash chain must not be
// blind to a change past char 500 — truncation there would report
// "match" for genuinely different bytes.
function stripCacheControl(msg) {
  if (!msg || !Array.isArray(msg.content)) {
    return { role: msg?.role, content: msg?.content };
  }
  return {
    role: msg.role,
    content: msg.content.map((block) => {
      if (!block || typeof block !== "object") return block;
      const { cache_control, ...rest } = block;
      return rest;
    }),
  };
}

// Hash EVERY message (design note: message-array middle). ~40 bytes per
// entry, so even a 1000-turn session costs ~40KB — cheap enough to make
// the head/marker/tail windows detail providers rather than the only
// detection surface.
function buildMessageHashes(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map((msg, i) => ({
    i,
    role: msg?.role ?? "unknown",
    h: sha(JSON.stringify(stripCacheControl(msg)), 12),
  }));
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
  return sha(JSON.stringify(truncateOneMessage(msg)));
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
    // Coverage added 2026-07-27 — see design notes at the top.
    params: buildParamsSnapshot(payload),
    systemBlocks: buildSystemSnapshot(payload.system),
    toolsDetail: buildToolsSnapshot(payload.tools),
    messageHashes: buildMessageHashes(payload.messages),
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

// First index at which two strings differ, or -1 if neither diverges
// before the shorter one ends.
function firstDifferingChar(a = "", b = "") {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
}

// Byte-level system diff: for each changed block, report where it changed
// and show a window from both sides. This is the evidence that was missing
// when `system=DIFFER` was all the tooling could say.
function diffSystemBlocks(prevBlocks = [], nowBlocks = []) {
  const prevByIdx = new Map(prevBlocks.map((b) => [b.index, b]));
  const nowByIdx = new Map(nowBlocks.map((b) => [b.index, b]));
  const allIdx = [...new Set([...prevByIdx.keys(), ...nowByIdx.keys()])].sort(
    (a, b) => a - b,
  );
  const diffs = [];
  for (const idx of allIdx) {
    const p = prevByIdx.get(idx) ?? null;
    const n = nowByIdx.get(idx) ?? null;
    if ((p?.hash ?? null) === (n?.hash ?? null)) continue;
    const at = firstDifferingChar(p?.text ?? "", n?.text ?? "");
    const from = at < 0 ? 0 : Math.max(0, at - DIVERGENCE_WINDOW / 2);
    diffs.push({
      index: idx,
      label: n?.label ?? p?.label ?? null,
      prevChars: p?.chars ?? null,
      nowChars: n?.chars ?? null,
      added: !p,
      removed: !n,
      charAt: at,
      prevWindow: (p?.text ?? "").slice(from, from + DIVERGENCE_WINDOW),
      nowWindow: (n?.text ?? "").slice(from, from + DIVERGENCE_WINDOW),
    });
  }
  return diffs;
}

// Name the tools that changed. Keyed by name so a reordering reports as
// index movement on stable names rather than as N unrelated changes.
function diffTools(prevDetail, nowDetail) {
  const prev = new Map((prevDetail?.tools ?? []).map((t) => [t.name, t]));
  const now = new Map((nowDetail?.tools ?? []).map((t) => [t.name, t]));
  const names = [...new Set([...prev.keys(), ...now.keys()])];
  const diffs = [];
  for (const name of names) {
    const p = prev.get(name) ?? null;
    const n = now.get(name) ?? null;
    if (!p) diffs.push({ name, change: "added", index: n.index });
    else if (!n) diffs.push({ name, change: "removed", index: p.index });
    else if (p.hash !== n.hash)
      diffs.push({
        name,
        change: "schema",
        index: n.index,
        prevBytes: p.bytes,
        nowBytes: n.bytes,
      });
    else if (p.index !== n.index)
      diffs.push({ name, change: "reordered", prevIndex: p.index, index: n.index });
  }
  return diffs;
}

function diffParams(prevParams = {}, nowParams = {}) {
  const keys = [...new Set([...Object.keys(prevParams), ...Object.keys(nowParams)])];
  const diffs = [];
  for (const k of keys) {
    const p = JSON.stringify(prevParams[k] ?? null);
    const n = JSON.stringify(nowParams[k] ?? null);
    if (p !== n) diffs.push({ key: k, prev: prevParams[k] ?? null, now: nowParams[k] ?? null });
  }
  return diffs;
}

// The exact first message index whose content changed — the answer the
// three fixed windows could only approximate. Appends and truncations are
// reported separately from in-place mutation, because only the latter
// invalidates a prefix the API had already cached.
function diffMessageHashes(prevHashes = [], nowHashes = []) {
  const n = Math.min(prevHashes.length, nowHashes.length);
  let firstDivergent = -1;
  for (let i = 0; i < n; i++) {
    if (prevHashes[i]?.h !== nowHashes[i]?.h) {
      firstDivergent = i;
      break;
    }
  }
  return {
    firstDivergentIndex: firstDivergent,
    commonLength: n,
    prevLength: prevHashes.length,
    nowLength: nowHashes.length,
    // True when the shared prefix is intact and the new array only grew —
    // the normal, cache-friendly shape of a conversation advancing.
    appendOnly: firstDivergent === -1 && nowHashes.length >= prevHashes.length,
    divergentRole: firstDivergent >= 0 ? nowHashes[firstDivergent]?.role ?? null : null,
  };
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
    // Coverage added 2026-07-27. Older snapshots lack these fields; the
    // helpers default to empty so a diff across a version boundary
    // degrades to the old behaviour instead of throwing.
    systemBlockDiffs: diffSystemBlocks(prev.systemBlocks, current.systemBlocks),
    toolDiffs: diffTools(prev.toolsDetail, current.toolsDetail),
    paramDiffs: diffParams(prev.params, current.params),
    messageChain: diffMessageHashes(prev.messageHashes, current.messageHashes),
  };
}

function diffHasChanges(diff) {
  return (
    diff.prefixDiffs.length > 0 ||
    diff.tailDiffs.length > 0 ||
    diff.markerDiffs.length > 0 ||
    !diff.toolsMatch ||
    !diff.systemMatch ||
    diff.messageCountPrev !== diff.messageCountNow ||
    (diff.paramDiffs?.length ?? 0) > 0 ||
    (diff.messageChain && diff.messageChain.firstDivergentIndex >= 0)
  );
}

// Rank the causes so the log line leads with the one that invalidates the
// most of the prefix. Order matters diagnostically: a param or system
// change re-writes everything after it, while a tail-only change is the
// normal cost of the conversation advancing.
function summariseCauses(diff) {
  const causes = [];
  if ((diff.paramDiffs?.length ?? 0) > 0)
    causes.push(`params:${diff.paramDiffs.map((d) => d.key).join(",")}`);
  if (!diff.systemMatch) {
    const labels = (diff.systemBlockDiffs ?? [])
      .map((d) => `${d.index}:${d.label ?? "?"}@${d.charAt}`)
      .join(",");
    causes.push(`system[${labels || "unlocated"}]`);
  }
  if (!diff.toolsMatch) {
    const names = (diff.toolDiffs ?? []).map((d) => `${d.name}:${d.change}`).join(",");
    causes.push(`tools[${names || "unlocated"}]`);
  }
  const chain = diff.messageChain;
  if (chain && chain.firstDivergentIndex >= 0)
    causes.push(`messages@${chain.firstDivergentIndex}(${chain.divergentRole ?? "?"})`);
  else if (chain && !chain.appendOnly && chain.nowLength < chain.prevLength)
    causes.push(`messages:truncated(${chain.prevLength}→${chain.nowLength})`);
  return causes;
}

// Bounded record for the append-only ledger: enough to identify and
// classify a bust months later, without the full message bodies that
// make the detail file large.
function buildEventRecord(diff, sessionKey, sessionId) {
  return {
    ts: diff.timestamp,
    prevTs: diff.prevTimestamp,
    key: sessionKey,
    sid: sessionId ?? null,
    causes: summariseCauses(diff),
    systemMatch: diff.systemMatch,
    toolsMatch: diff.toolsMatch,
    msgs: `${diff.messageCountPrev}->${diff.messageCountNow}`,
    chain: diff.messageChain
      ? {
          first: diff.messageChain.firstDivergentIndex,
          role: diff.messageChain.divergentRole,
          appendOnly: diff.messageChain.appendOnly,
        }
      : null,
    params: (diff.paramDiffs ?? []).map((d) => ({
      k: d.key,
      prev: typeof d.prev === "object" ? "<obj>" : d.prev,
      now: typeof d.now === "object" ? "<obj>" : d.now,
    })),
    system: (diff.systemBlockDiffs ?? []).map((d) => ({
      i: d.index,
      label: d.label,
      at: d.charAt,
      prevChars: d.prevChars,
      nowChars: d.nowChars,
      prevWin: d.prevWindow,
      nowWin: d.nowWindow,
    })),
    tools: (diff.toolDiffs ?? []).map((d) => ({ n: d.name, c: d.change })),
    windows: {
      head: diff.prefixDiffs.length,
      markers: diff.markerDiffs.length,
      tail: diff.tailDiffs.length,
    },
  };
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

// Append one JSONL record, rotating past EVENTS_MAX_BYTES so the ledger
// is permanent but not unbounded. Rotation keeps exactly one generation:
// the point is surviving the next overwrite, not indefinite history.
async function appendEvent(eventsPath, record, fs) {
  try {
    const st = await fs.stat(eventsPath).catch(() => null);
    if (st && st.size > EVENTS_MAX_BYTES) {
      await fs.rename(eventsPath, `${eventsPath}.1`).catch(() => {});
    }
  } catch {
    // Rotation is best-effort; never block the append on it.
  }
  await fs.appendFile(eventsPath, JSON.stringify(record) + "\n");
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
 * @param {object} [options.headers] Request headers, used to derive a
 *                               drift-proof storage key from the session id.
 * @param {object} [options.fs]  fs/promises overrides for tests:
 *                               { mkdir, readFile, writeFile, rename, appendFile, stat }.
 *                               Any subset replaces the corresponding default.
 * @returns {Promise<{ key, wroteSnapshot, wroteDiff } | null>} Result for tests; null if no system.
 */
async function snapshotPrefix(payload, options = {}) {
  const current = buildSnapshot(payload);
  if (!current) return null;

  const dir = options.dir || getSnapshotDir();
  const fs = { ...DEFAULT_FS, ...(options.fs || {}) };

  const headers = options.headers || null;
  const sessionId = headers ? resolveSessionId(headers) : null;
  const sessionKey = resolveSessionKey(headers, payload.system);
  const lastPath = join(dir, `${sessionKey}-last.json`);
  const diffPath = join(dir, `${sessionKey}-diff.json`);
  const eventsPath = join(dir, `${sessionKey}-events.jsonl`);

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
      // Ledger first: the append is what must survive, and it must not be
      // lost to a failure in the (overwritable) detail file.
      try {
        await appendEvent(eventsPath, buildEventRecord(diff, sessionKey, sessionId), fs);
      } catch (err) {
        debug(`event append failed at ${eventsPath}: ${err?.message ?? err}`);
      }
      try {
        await atomicWriteJson(diffPath, diff, fs);
        wroteDiff = true;
        // Always log the summary line when a diff fires (not just under
        // CACHE_FIX_DEBUG) — this is the diagnostic's whole purpose. The
        // per-window counts (head/markers/tail) tell the reader which
        // window caught the bust; `cause=` names the specific block,
        // tool, param, or message index so the line alone is often the
        // whole answer.
        const totalDiffs =
          diff.prefixDiffs.length + diff.markerDiffs.length + diff.tailDiffs.length;
        const causes = summariseCauses(diff);
        process.stderr.write(
          `[prefix-diff] ${sessionKey}: ${totalDiffs} differences ` +
            `(head=${diff.prefixDiffs.length}, markers=${diff.markerDiffs.length}, ` +
            `tail=${diff.tailDiffs.length}), ` +
            `tools=${diff.toolsMatch ? "match" : "DIFFER"}, ` +
            `system=${diff.systemMatch ? "match" : "DIFFER"}, ` +
            `messages=${diff.messageCountPrev}→${diff.messageCountNow}, ` +
            `marker_count=${diff.markerCount}` +
            (causes.length ? `, cause=${causes.join(" | ")}` : "") +
            `\n`,
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
  resolveSessionKey,
  truncatePrefixMessages,
  truncateTailMessages,
  buildMarkerSnapshot,
  buildSystemSnapshot,
  buildToolsSnapshot,
  buildMessageHashes,
  diffSystemBlocks,
  diffTools,
  diffParams,
  diffMessageHashes,
  summariseCauses,
  buildEventRecord,
  diffHasChanges,
};

export default {
  name: "prefix-diff",
  description:
    "Snapshot everything the prompt cache keys on (system blocks, full tool " +
    "schemas, top-level params, per-message hash chain, head/marker/tail " +
    "windows) and diff against the previous request, naming the exact block, " +
    "tool, param, or message index that changed",
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
      await snapshotPrefix(ctx.body, { headers: ctx.headers });
    } catch (err) {
      debug(`onRequest unexpected: ${err?.message ?? err}`);
    }
  },
};
