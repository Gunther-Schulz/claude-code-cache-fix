// insertion-normalization — re-serialize a mid-history splice back into
// arrival order so the prefix cache sees an append instead of a rewrite.
//
// Design: docs/directives/proxy-insertion-normalization.md (phase 2 of the
// mid-history-breakpoint-ladder work). Implements the directive's Design
// sketch rules 1-4 only; the "Alternative considered" (full marker
// ownership) section is explicitly NOT built here.
//
// Activation: `enabled: true` in extensions.json (always loaded), runtime
// gate CACHE_FIX_INSERTION_NORMALIZE=1 (opt-in, read per-call so tests can
// flip it without re-importing). CACHE_FIX_DEBUG honored for swallowed
// I/O errors, same idiom as prefix-diff / the ladder.
//
// Order 395 — after read-dedupe (380), before cache-control-normalize
// (400) and messages-cache-breakpoint (410)/mid-history-breakpoint-ladder
// (420), so those marker-placing extensions see the normalized order.
// Verified-safe adjacent slot: read-dedupe only rewrites LATER duplicate
// occurrences of a Read tool_result (the first/keeper occurrence is never
// rewritten, and "keeper" is monotonic — a message that was already the
// earliest occurrence of its dedupe key stays the earliest occurrence as
// new messages arrive), so a message already recorded in canonical never
// has its content-hash change out from under it by running after
// read-dedupe. content-strip (330) and microcompact-stability (350) run
// even earlier, so their output is what canonical hashes see from the
// start — no special handling needed for those either.
//
// --- Canonical history model ---
//
// Per session (keyed off the session-id header, same derivation as
// prefix-diff/the ladder post-fc432bf — SUB-KEYED additionally by a hash
// of the request's system prompt, see systemPromptSubKey/threat-matrix
// row 14: sidecar requests such as title-generation share the session-id
// header with the main thread but carry a different system prompt, so
// without the sub-key every sidecar turn thrashed the main thread's
// canonical back to reset), the proxy holds an append-only list of entry
// identity records: { h: contentHash, r: role, o: occurrence }.
// The hash is computed AFTER stripping cache_control (mid-history-
// breakpoint-ladder's hashMessageContent, imported rather than
// reimplemented) so a marker placed by a downstream extension never
// changes an entry's identity. `o` is a 0-based occurrence counter over
// (hash, role) pairs in array order, which disambiguates duplicate
// identical messages (directive's "Known risks to resolve").
//
// --- Classification ---
//
// On each request, canonical entries are matched into the incoming
// messages array by identity. Two things can go wrong with that match,
// and either one sends the request to rule 3 (passthrough + reset):
//   - some canonical entry has no matching identity in incoming (covers
//     true edits, removals, assistant-content changes, and a shrunk
//     history — a shorter incoming array can never contain every
//     canonical entry);
//   - the matched incoming indices are not strictly increasing (the
//     canonical order isn't preserved as a subsequence).
//
// If the match holds, incoming entries not matched into canonical are
// "new". New entries positioned AFTER every matched canonical index are
// ordinary tail growth (the ordinary shape of a conversation advancing —
// including a new assistant turn, which is expected and never restricted).
// New entries positioned AT OR BEFORE the last matched canonical index are
// the actual splice: content Claude Code inserted earlier than where it
// arrived. Rule 2 (INSERTION-ONLY) applies only to those:
//   - every such entry's role must not be "assistant" (the directive says
//     "user-role or system-role — never assistant"; this transport's
//     messages[] array only ever carries role "user" or "assistant" — the
//     system prompt is a separate top-level field, never a messages[]
//     entry — so this reduces to "must be role user". Surfaced as a GAP
//     rather than silently assumed away: see the closing report.);
//   - re-serializing (canonical order first, then ALL new entries —
//     spliced and tail alike — appended in their incoming relative order)
//     must not separate any tool_result-bearing user message from an
//     immediately-preceding assistant message carrying the matching
//     tool_use id(s).
//
// When both hold, the request is re-serialized and forwarded; canonical
// grows by appending the new entries' identities (in the same order they
// were appended to the message array). When either fails, or when the
// match itself failed, the request passes through UNCHANGED and canonical
// resets to a fresh identity list computed from incoming — one honest
// bust, per the directive's conservative bias.
//
// Note the re-serialization formula subsumes plain append: when every new
// entry is already tail growth, "canonical order + new entries appended
// in arrival order" reproduces incoming byte-for-byte. The two cases are
// told apart only for telemetry (action: "append-only" when nothing
// moved, "normalized" when a splice was detected and corrected).

import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { claudeHome } from "../claude-home.mjs";
import { resolveSessionId } from "./cache-telemetry.mjs";
import { hashMessageContent } from "./mid-history-breakpoint-ladder.mjs";

const DEFAULT_FS = { readFile, writeFile, rename, appendFile, mkdir };

// --- Env gates (read per-call, mirrors ladder/prefix-diff idiom) ---

function isEnabled(env = process.env) {
  return env.CACHE_FIX_INSERTION_NORMALIZE === "1";
}

function isDebug(env = process.env) {
  return env.CACHE_FIX_DEBUG === "1";
}

function debug(msg) {
  if (isDebug()) process.stderr.write(`[insertion-normalize] DEBUG: ${msg}\n`);
}

// --- Storage ---

function getSnapshotDir() {
  return join(claudeHome(), "cache-fix-snapshots");
}

// Sub-key on the system prompt (threat-matrix row 14): sidecar requests
// (title-generation etc.) share the session-id header with the main thread
// but carry a DIFFERENT system prompt. Keying persisted canonical state on
// the session-id header alone made every sidecar turn look like a splice
// against the main thread's canonical (or vice versa), thrashing it back
// to a reset — never corrupting, but degrading the extension to a no-op
// for that session. A short hash of system[0]'s text (mirrors prefix-
// diff's computeSessionKey idiom — same "cheap discriminator over the
// diffed content" shape, but used here as a SUB-key alongside the stable
// session-id, never as the sole key, so prefix-diff's own "self-defeating
// key" lesson doesn't apply: a change inside the hashed text can only ever
// route to a *different* bucket, never lose the lookup entirely) buckets
// the main thread and each distinct sidecar system prompt independently
// under the same session-id.
function systemPromptSubKey(system) {
  let text;
  if (typeof system === "string") {
    text = system;
  } else if (Array.isArray(system) && system.length > 0) {
    const first = system[0];
    text = typeof first?.text === "string" ? first.text : JSON.stringify(first ?? null);
  } else {
    return "nosys";
  }
  if (!text) return "nosys";
  return createHash("sha256").update(text).digest("hex").slice(0, 8);
}

// Session-id header derivation, same idiom as prefix-diff/the ladder
// (post-fc432bf: session-id header preferred, content-hash fallback for
// requests without it — direct API calls, tests). Sub-keyed on the system
// prompt (see systemPromptSubKey) so sidecar requests sharing the header
// bucket separately from the main thread. Old single-key state files
// (pre-sub-key) are simply abandoned under the new path — loadCanonical's
// existing ENOENT handling already treats an absent file as "no prior
// canonical" (ordinary session start), so no explicit migration is needed.
export function resolveInsertionSessionKey(headers, messages, system) {
  const sid = headers ? resolveSessionId(headers) : null;
  if (sid) return `s-${sid.replace(/[^A-Za-z0-9_-]/g, "_")}-${systemPromptSubKey(system)}`;
  const first = Array.isArray(messages) ? messages[0] : null;
  const h = first ? hashMessageContent(first) : null;
  return `c-${h || "empty"}`;
}

function canonPath(dir, sessionKey) {
  return join(dir, `${sessionKey}-insertion-canon.json`);
}

function eventsPath(dir, sessionKey) {
  return join(dir, `${sessionKey}-insertion-events.jsonl`);
}

async function loadCanonical(dir, sessionKey, fs) {
  try {
    const txt = await fs.readFile(canonPath(dir, sessionKey), "utf-8");
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed?.entries)) return parsed.entries;
    return null;
  } catch (err) {
    if (err && err.code !== "ENOENT") debug(`canonical read failed: ${err?.message ?? err}`);
    return null;
  }
}

async function saveCanonical(dir, sessionKey, entries, fs) {
  await fs.mkdir(dir, { recursive: true });
  const finalPath = canonPath(dir, sessionKey);
  const tmpPath = `${finalPath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify({ entries }, null, 2));
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

// --- Identity ---

// One identity record per message, in array order. `o` is the 0-based
// occurrence count of (hash, role) seen so far — disambiguates duplicate
// identical messages (directive's "Known risks to resolve at
// implementation time").
export function computeIdentities(messages) {
  const seen = new Map(); // "hash|role" -> next occurrence index
  const out = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const h = hashMessageContent(msg) ?? hashNonBlockContent(msg, i);
    const r = msg?.role ?? "unknown";
    const key = `${h}|${r}`;
    const o = seen.get(key) ?? 0;
    seen.set(key, o + 1);
    out.push({ index: i, h, r, o });
  }
  return out;
}

// Identity for a message `hashMessageContent` cannot hash — it returns null
// unless `content` is a block ARRAY, and CC sends plenty of messages whose
// content is a plain string (system notes, mid-conversation system blocks).
//
// This fallback used to be `noContent:${i}` — the array INDEX, which made a
// message's identity its position. That is self-defeating for an extension
// whose entire job is absorbing mid-history insertions: the first insertion
// ahead of such a message shifted its index, the canonical lookup missed, and
// classifyInsertion reset with "not-subsequence". Measured 2026-07-27 in one
// live session: 83 index-keyed entries in a single sub-key and 125 resets
// across 350 requests — roughly one request in three, i.e. the extension was
// rebuilding from scratch instead of normalizing.
//
// Hash the content instead, so identity travels with the message. Only a
// genuinely contentless message (null/undefined) still falls back to the
// index, where no better identity exists; `noContent:` is kept as that
// marker's prefix so old canonical files degrade to one reset rather than
// mismatching silently.
function hashNonBlockContent(msg, i) {
  const c = msg?.content;
  if (c === null || c === undefined) return `noContent:${i}`;
  const text = typeof c === "string" ? c : JSON.stringify(c);
  return "s:" + createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function identityKey(entry) {
  return `${entry.h}|${entry.r}|${entry.o}`;
}

// --- Tool_result / tool_use adjacency invariant ---
//
// For every user message carrying >=1 tool_result block, the immediately
// preceding message must be an assistant message whose tool_use blocks
// cover every tool_use_id referenced by this message's tool_result
// blocks. Violating this is a hard API-shape break, not just a cache
// concern — the directive requires falling back to rule 3 rather than
// producing an invalid re-serialization.
export function validateToolAdjacency(messages) {
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || msg.role !== "user" || !Array.isArray(msg.content)) continue;
    const toolUseIds = msg.content
      .filter((b) => b && b.type === "tool_result" && typeof b.tool_use_id === "string")
      .map((b) => b.tool_use_id);
    if (toolUseIds.length === 0) continue;

    const prev = messages[i - 1];
    if (!prev || prev.role !== "assistant" || !Array.isArray(prev.content)) return false;
    const prevToolUseIds = new Set(
      prev.content.filter((b) => b && b.type === "tool_use" && typeof b.id === "string").map((b) => b.id),
    );
    for (const id of toolUseIds) {
      if (!prevToolUseIds.has(id)) return false;
    }
  }
  return true;
}

// --- Core classifier (pure) ---
//
// Returns:
//   { action: "reset", resetReason, canonicalEntries }              — passthrough, canonical := fresh(incoming)
//   { action: "append-only", messages, canonicalEntries, inserted }  — passthrough (formula reproduces incoming)
//   { action: "normalized", messages, canonicalEntries, inserted }   — re-serialized, forward `messages`
export function classifyInsertion(messages, priorCanonical) {
  const incomingIdentities = computeIdentities(messages);

  if (!Array.isArray(priorCanonical) || priorCanonical.length === 0) {
    return {
      action: "reset",
      resetReason: "no-prior-canonical",
      canonicalEntries: incomingIdentities.map((e) => ({ h: e.h, r: e.r, o: e.o })),
    };
  }

  const incomingByKey = new Map(incomingIdentities.map((e) => [identityKey(e), e.index]));

  const matchedIndices = [];
  for (const stored of priorCanonical) {
    const idx = incomingByKey.get(identityKey(stored));
    if (idx === undefined) {
      return {
        action: "reset",
        resetReason: "not-subsequence",
        canonicalEntries: incomingIdentities.map((e) => ({ h: e.h, r: e.r, o: e.o })),
      };
    }
    matchedIndices.push(idx);
  }
  for (let i = 1; i < matchedIndices.length; i++) {
    if (matchedIndices[i] <= matchedIndices[i - 1]) {
      return {
        action: "reset",
        resetReason: "not-subsequence",
        canonicalEntries: incomingIdentities.map((e) => ({ h: e.h, r: e.r, o: e.o })),
      };
    }
  }

  const matchedSet = new Set(matchedIndices);
  const lastMatched = matchedIndices.length > 0 ? matchedIndices[matchedIndices.length - 1] : -1;
  const newEntries = incomingIdentities.filter((e) => !matchedSet.has(e.index));
  const splicedEntries = newEntries.filter((e) => e.index <= lastMatched);

  if (splicedEntries.length === 0) {
    // Pure tail growth — the re-serialization formula reproduces `messages`
    // unchanged, so skip building it and just report append-only.
    const canonicalEntries = priorCanonical.concat(newEntries.map((e) => ({ h: e.h, r: e.r, o: e.o })));
    return { action: "append-only", messages, canonicalEntries, inserted: newEntries.length };
  }

  if (splicedEntries.some((e) => e.r === "assistant")) {
    return {
      action: "reset",
      resetReason: "assistant-interleaved",
      canonicalEntries: incomingIdentities.map((e) => ({ h: e.h, r: e.r, o: e.o })),
    };
  }

  // Re-serialize: canonical order first, then ALL new entries (spliced and
  // tail alike) appended in their incoming relative order.
  const finalMessages = matchedIndices.map((idx) => messages[idx]).concat(newEntries.map((e) => messages[e.index]));

  if (!validateToolAdjacency(finalMessages)) {
    return {
      action: "reset",
      resetReason: "adjacency-violation",
      canonicalEntries: incomingIdentities.map((e) => ({ h: e.h, r: e.r, o: e.o })),
    };
  }

  const canonicalEntries = priorCanonical.concat(newEntries.map((e) => ({ h: e.h, r: e.r, o: e.o })));
  return { action: "normalized", messages: finalMessages, canonicalEntries, inserted: newEntries.length };
}

// --- Extension contract ---

export default {
  name: "insertion-normalization",
  description:
    "Re-serialize a mid-history splice (queued message / hook attachment / " +
    "notification inserted earlier than its arrival) back into arrival " +
    "order so the prefix cache sees an append instead of a rewrite",
  enabled: false, // overridden by extensions.json
  order: 395,

  async onRequest(ctx) {
    if (!isEnabled()) return;
    if (!ctx || !ctx.body) return;

    const body = ctx.body;
    const messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) return;

    const dir = getSnapshotDir();
    const fs = DEFAULT_FS;
    const headers = ctx.headers || null;
    const sessionId = headers ? resolveSessionId(headers) : null;
    const sessionKey = resolveInsertionSessionKey(headers, messages, body.system);

    try {
      const prior = await loadCanonical(dir, sessionKey, fs);
      const result = classifyInsertion(messages, prior);

      if (result.action === "normalized") {
        body.messages = result.messages;
      }
      // append-only and reset both forward the incoming array unchanged.

      await saveCanonical(dir, sessionKey, result.canonicalEntries, fs);

      ctx.meta = ctx.meta || {};
      ctx.meta.insertionNormalizeStats = {
        action: result.action,
        inserted: result.inserted ?? 0,
        resetReason: result.resetReason,
      };

      await appendTelemetry(
        dir,
        sessionKey,
        {
          ts: new Date().toISOString(),
          key: sessionKey,
          sid: sessionId,
          action: result.action,
          inserted: result.inserted ?? 0,
          ...(result.resetReason ? { resetReason: result.resetReason } : {}),
        },
        fs,
      );

      if (isDebug()) {
        process.stderr.write(
          `[insertion-normalize] action=${result.action} inserted=${result.inserted ?? 0}` +
            (result.resetReason ? ` reason=${result.resetReason}` : "") +
            "\n",
        );
      }
    } catch (err) {
      debug(`onRequest unexpected: ${err?.message ?? err}`);
    }
  },
};
