// insertion-normalization — re-serialize a mid-history splice back into
// arrival order so the prefix cache sees an append instead of a rewrite.
//
// Design: docs/directives/proxy-insertion-normalization.md (phase 2 of the
// the removed mid-history-breakpoint-ladder work). Implements the Design
// sketch rules 1-4 only; the "Alternative considered" (full marker
// ownership) section is explicitly NOT built here.
//
// Activation: `enabled: true` in extensions.json (always loaded), runtime
// gate CACHE_FIX_INSERTION_NORMALIZE=1 (opt-in, read per-call so tests can
// flip it without re-importing). CACHE_FIX_DEBUG honored for swallowed
// I/O errors, same idiom as prefix-diff.
//
// Order 395 — after read-dedupe (380), before cache-control-normalize
// (400), so the marker-placing pass sees the normalized order. (Two other
// marker placers once sat at 410 and 420; both were removed 2026-07-28 —
// see message-hash.mjs.)
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
// prefix-diff post-fc432bf — SUB-KEYED additionally by a hash
// of the request's system prompt, see systemPromptSubKey/threat-matrix
// row 14: sidecar requests such as title-generation share the session-id
// header with the main thread but carry a different system prompt, so
// without the sub-key every sidecar turn thrashed the main thread's
// canonical back to reset), the proxy holds an append-only list of entry
// identity records: { h: contentHash, r: role, o: occurrence }.
// The hash is computed AFTER stripping cache_control (message-hash.mjs's
// hashMessageContent, imported rather than reimplemented) so a marker placed by a downstream extension never
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
//
// --- Phase 3: volatile-block pinning + removal tolerance (opt-in) ---
//
// Directive: docs/directives/proxy-volatile-block-pinning.md. Gated
// separately by CACHE_FIX_VOLATILE_PIN=1 so the phase-2 behavior above is
// byte-identical when the flag is off — the two modes even keep separate
// canonical identity math, and a canon file written under one mode is
// ignored by the other (one honest reset at the flag flip, never a
// mismatch).
//
// WHAT THE FLIP COSTS, measured when it was actually thrown (2026-07-28
// 17:08, live): the reset is per-conversation and lands on the FIRST request
// after the flip, so a session already deep in context re-caches all of it —
// here cache_read 605,220 -> 15,132 with 678,522 creation tokens, the first
// post-flip request reporting `cause=messages@4(assistant)`. The canon ledger
// shows it plainly: `reset/no-prior-canonical` under a NEW canon key,
// `append-only` immediately after. That is the documented behaviour working,
// not a defect — but it is a real one-time bill, so throw this flag at a
// session boundary or on a young session, never mid-way through a long one.
// It cannot recur for a session once flipped.
//
// (A canon migration — read the phase-2 file, re-derive pin identities — would
// remove the cost. Deliberately NOT built: it is one-time per session, and a
// migration path is a second identity code path to keep correct forever.)
//
// Pin mode changes two things, both measured on live traffic 2026-07-28:
//
// 1. FLIP ABSORPTION. CC serializes hook-injected additionalContext
//    <system-reminder> blocks nondeterministically for deep-history
//    messages — present in one request, absent from the next (two
//    attributed whole-context busts: 135k + 182k, both named by the
//    prevContent/nowContent capture). In pin mode a user message's
//    identity hash EXCLUDES volatile blocks (a text block that is
//    entirely a <system-reminder> wrap, or empty text — the observed
//    flip counterpart), so both serializations match the same canonical
//    entry, and the proxy forwards the FIRST-SEEN bytes: byte-stable
//    history, the flip never reaches the cache. Hard limits: user-role
//    only; text blocks only (tool_results are never volatile); a message
//    carrying a cache_control marker is never rewritten; a non-volatile
//    difference changes the identity hash and takes the reset path.
//
// 2. REMOVAL TOLERANCE. Same-tenant message-count shrinks are routine
//    (91 measured; context-management-2025-06-27 confirmed in the wire
//    beta set), and each one killed the phase-2 subsequence match —
//    reset-per-prune, degrading the extension to a no-op for the rest of
//    the session. In pin mode a canonical entry missing from incoming is
//    marked dropped (kept in the file, flagged, never forwarded) and the
//    match continues past the gap; order violations among SURVIVORS
//    remain a hard reset, and dropping more than half the live entries
//    resets too (that is a compaction, not a prune).

import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { claudeHome } from "../claude-home.mjs";
import { resolveSessionId } from "./cache-telemetry.mjs";
import { hashMessageContent, conversationSubKey } from "./message-hash.mjs";

const DEFAULT_FS = { readFile, writeFile, rename, appendFile, mkdir };

// --- Env gates (read per-call, mirrors the prefix-diff idiom) ---

function isEnabled(env = process.env) {
  return env.CACHE_FIX_INSERTION_NORMALIZE === "1";
}

// Phase-3 gate (volatile-block pinning + removal tolerance). Requires the
// phase-2 gate too: pin mode is a refinement of the canonical model, not
// an independent extension.
function isPinEnabled(env = process.env) {
  return env.CACHE_FIX_VOLATILE_PIN === "1";
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
//
// Exported so sibling extensions that persist per-session state key it the
// same way — the collision is a property of the session-id header, not of
// this extension, so every consumer of that header needs the same sub-key.
export function systemPromptSubKey(system) {
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

// Session-id header derivation, same idiom as prefix-diff
// (post-fc432bf: session-id header preferred, content-hash fallback for
// requests without it — direct API calls, tests). Sub-keyed on the system
// prompt (see systemPromptSubKey) so sidecar requests sharing the header
// bucket separately from the main thread. Old single-key state files
// (pre-sub-key) are simply abandoned under the new path — loadCanonical's
// existing ENOENT handling already treats an absent file as "no prior
// canonical" (ordinary session start), so no explicit migration is needed.
// CONVERSATION sub-key (2026-07-28) — row 14, one level deeper. The
// system-prompt hash separates a sidecar CLASS from the main thread, but not
// the individual conversations WITHIN a class: every subagent this session
// dispatches runs the same agent system prompt, so they all landed in one
// bucket and overwrote each other's canonical. Measured on real traffic
// (capture s-35d72503, 602 requests): one system-prompt bucket held 39
// distinct conversations, another 12 — and the correlation with resets was
// total.
//
//     conversation SWITCH within a bucket: 60 requests, 60 resets (100%)
//     same conversation continuing       : 538 requests,  4 resets (1%)
//
// 72 of 83 resets across both corpora were this artifact, not real history
// churn: each switch made the incoming history look like a wholesale rewrite
// of whatever tenant spoke last, which classifies as dropped-majority. The
// extension was spending almost all of its reset budget on a keying bug.
//
// msgs[0] identifies a conversation because it is the one entry nothing
// appends past. When compaction or context-management replaces it the key
// moves and the canonical is abandoned — one honest reset, exactly what the
// old key produced anyway on the same event, since a replaced msgs[0] fails
// the subsequence match regardless.
// Conversation identity from msgs[0]. hashMessageContent covers block-array
// content only (it strips cache_control per block) and returns null for
// STRING content — correct for its own callers, but as a bucket key that
// null collapsed every string-content conversation into one shared "empty"
// bucket: 56 of 602 requests in the measured capture, which is where the
// residual dropped-majority resets lived after the first sub-key attempt.
// Falling back to a hash of the raw content covers both shapes; a message
// carrying no content at all is the only remaining "empty".
// conversationSubKey now lives in message-hash.mjs — deferred-tool-rewrite
// needs the identical function, and a second copy is a second truth.

export function resolveInsertionSessionKey(headers, messages, system) {
  const sid = headers ? resolveSessionId(headers) : null;
  const conv = conversationSubKey(messages);
  if (sid) {
    return `s-${sid.replace(/[^A-Za-z0-9_-]/g, "_")}-${systemPromptSubKey(system)}-${conv}`;
  }
  return `c-${conv}`;
}

function canonPath(dir, sessionKey) {
  return join(dir, `${sessionKey}-insertion-canon.json`);
}

function eventsPath(dir, sessionKey) {
  return join(dir, `${sessionKey}-insertion-events.jsonl`);
}

// `mode` discriminates phase-2 ("plain") from phase-3 ("pin") canon
// files: their identity hashes are incompatible ("v:"-prefixed user
// hashes in pin mode), and without the marker a flag flip could
// PARTIALLY match the other mode's file (assistant hashes are shared),
// producing wrong dropped flags instead of the intended single honest
// reset. Old files without the field read as "plain".
async function loadCanonical(dir, sessionKey, fs, mode = "plain") {
  try {
    const txt = await fs.readFile(canonPath(dir, sessionKey), "utf-8");
    const parsed = JSON.parse(txt);
    if (!Array.isArray(parsed?.entries)) return null;
    if ((parsed.mode ?? "plain") !== mode) return null;
    return parsed.entries;
  } catch (err) {
    if (err && err.code !== "ENOENT") debug(`canonical read failed: ${err?.message ?? err}`);
    return null;
  }
}

async function saveCanonical(dir, sessionKey, entries, fs, mode = "plain") {
  await fs.mkdir(dir, { recursive: true });
  const finalPath = canonPath(dir, sessionKey);
  const tmpPath = `${finalPath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify({ mode, entries }, null, 2));
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
    const msg = canonicalMessageShape(messages[i]);
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

// SHAPE FLIP (measured 2026-07-28, census over 771 captured requests). CC
// re-serializes the SAME message between two equivalent shapes:
//
//     [{ "type": "text", "text": "X" }]     <->     "X"
//
// The model sees identical content either way, but the two shapes hash
// through different functions (hashMessageContent for block arrays,
// hashNonBlockContent for strings), so their identities could never match:
// the message read as "one entry dropped, a different one added" and took a
// reset. Applied here — at the one point every identity path passes through
// — rather than in the pin, because the flip is NOT user-role-specific: the
// census found it predominantly on SYSTEM messages (harness reminders), and
// a user-only fold left every one of those still resetting.
//
// Deliberately narrow: only the exact single-text-block <-> string pair, and
// only when the block carries nothing beyond type/text/cache_control. A
// multi-block array is a genuinely different message and keeps its own
// identity.
function canonicalMessageShape(msg) {
  const c = msg?.content;
  if (typeof c === "string") return { ...msg, content: [{ type: "text", text: c }] };
  if (!Array.isArray(c) || c.length !== 1) return msg;
  const b = c[0];
  if (!b || typeof b !== "object" || b.type !== "text" || typeof b.text !== "string") return msg;
  const extra = Object.keys(b).filter((k) => k !== "type" && k !== "text" && k !== "cache_control");
  if (extra.length) return msg;
  return { ...msg, content: [{ type: "text", text: b.text }] };
}

function identityKey(entry) {
  return `${entry.h}|${entry.r}|${entry.o}`;
}

// --- Phase 3: volatile blocks and pin-mode identity ---

// The wrap regex identity-normalization already uses — the harness marks
// its own injections with it. No allowlist of reminder texts: the flip
// evidence already covers four reminder kinds, and a pattern list would
// be the next mole (directive, part A).
//
// Captures the inner text (group 1) so the SAME regex serves both
// isVolatileBlock's boolean test (unaffected by adding a group) and
// suppression's unwrapVolatileText below — one pattern, not a second
// derivation of it (dev-loop.md, "never hand-roll identity in a probe").
const VOLATILE_WRAP_REGEX = /^<system-reminder>\n([\s\S]*)\n<\/system-reminder>\s*$/;

// A text block is volatile iff it is entirely a system-reminder wrap OR
// empty — the observed flip alternates a reminder block with an
// empty-text block (capture 2026-07-27T22:13Z: prev = the reminder,
// now = ""), so both sides must classify volatile for the identities to
// meet. tool_result / tool_use / thinking blocks are NEVER volatile.
export function isVolatileBlock(block) {
  if (!block || typeof block !== "object" || block.type !== "text") return false;
  if (typeof block.text !== "string") return false;
  if (block.text === "") return true;
  return VOLATILE_WRAP_REGEX.test(block.text);
}

// Identity hash for pin mode: user-role messages hash over their
// non-volatile blocks only (cache_control stripped, same as
// hashMessageContent). Assistant and string-content messages fall through to
// the phase-2 identity, which applies canonicalMessageShape itself — so the
// shape flip documented there is absorbed on every role, not just this path.
function hashPinnedIdentity(msg) {
  if (!msg || msg.role !== "user" || !Array.isArray(msg.content)) return null;
  const kept = [];
  for (const block of msg.content) {
    if (isVolatileBlock(block)) continue;
    if (block && typeof block === "object") {
      const { cache_control, ...rest } = block;
      kept.push(rest);
    } else {
      kept.push(block);
    }
  }
  return "v:" + createHash("sha256").update(JSON.stringify(kept)).digest("hex").slice(0, 16);
}

// Pin-mode identities: same record shape as computeIdentities, with the
// volatile-excluded hash for user block-array messages. The "v:" prefix
// keeps pin-mode canon files disjoint from phase-2 ones — a canon written
// under the other mode fails the identity match wholesale and takes one
// honest reset, never a silent partial mismatch.
export function computePinnedIdentities(messages) {
  const seen = new Map();
  const out = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = canonicalMessageShape(messages[i]);
    const h =
      hashPinnedIdentity(msg) ?? hashMessageContent(msg) ?? hashNonBlockContent(msg, i);
    const r = msg?.role ?? "unknown";
    const key = `${h}|${r}`;
    const o = seen.get(key) ?? 0;
    seen.set(key, o + 1);
    out.push({ index: i, h, r, o });
  }
  return out;
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

// --- Phase 3 classifier (pure) ---

function hasCacheControl(msg) {
  if (!msg || !Array.isArray(msg.content)) return false;
  return msg.content.some((b) => b && typeof b === "object" && b.cache_control);
}

function stripAllCacheControl(msg) {
  if (!msg || !Array.isArray(msg.content)) return msg;
  return {
    ...msg,
    content: msg.content.map((b) => {
      if (b && typeof b === "object" && b.cache_control) {
        const { cache_control, ...rest } = b;
        return rest;
      }
      return b;
    }),
  };
}

// Remove volatile blocks from a user message. When a canonical entry has
// no stored first-seen form (`m`), this IS the first-seen form: `m` is
// stored precisely when first-seen contained a volatile block, so its
// absence means first-seen had none — and stripping the incoming
// message's later-gained volatile blocks reproduces those bytes.
export function stripVolatileBlocks(msg) {
  if (!msg || msg.role !== "user" || !Array.isArray(msg.content)) return msg;
  const kept = msg.content.filter((b) => !isVolatileBlock(b));
  if (kept.length === msg.content.length) return msg;
  return { ...msg, content: kept };
}

// A STANDALONE CARRIER: a message that is neither user nor assistant (in this
// transport, the mid-conversation `system` shape) whose whole content is one
// text block. That is the form CC parks a migrated reminder in, and the form
// of the task-tools nudge — the two message kinds the measured move shuffles
// between inline and standalone positions.
//
// Its first-seen bytes are stored for one reason only: when CC merges such a
// message INTO a neighbour's reminder and stops sending it (the cross-message
// join, findJoinMoves below), re-serving it is the only way the merge can be
// absorbed without dropping its bytes off the wire. Nothing else reads this
// `m` — pinnedForwardForm returns the incoming message untouched for any
// entry whose role is not "user", so storing it changes no forwarded byte on
// any existing path.
function isStandaloneCarrier(msg) {
  if (!msg || msg.role === "user" || msg.role === "assistant") return false;
  const shaped = canonicalMessageShape(msg);
  return Array.isArray(shaped.content) && shaped.content.length === 1 && shaped.content[0]?.type === "text";
}

function buildPinEntry(identity, msg) {
  const entry = { h: identity.h, r: identity.r, o: identity.o };
  if (
    msg?.role === "user" &&
    Array.isArray(msg.content) &&
    msg.content.some(isVolatileBlock)
  ) {
    // First-seen form, cache_control stripped: a marker the tail rotation
    // happened to leave on this message at creation must not be replayed
    // forever from the pin.
    entry.m = stripAllCacheControl(msg);
  } else if (isStandaloneCarrier(msg)) {
    entry.m = stripAllCacheControl(msg);
  }
  return entry;
}

// The bytes forwarded for a matched canonical entry. The pin applies only
// from the second appearance on: a NEW message (not yet canonical) always
// forwards as-is, so a fresh hook reminder reaches the model at the live
// edge; by the time the pin kicks in, the model has already consumed it.
// A message currently carrying a cache_control marker is never rewritten
// — markers sit at the tail, flips live deep, and losing a marker would
// cost more than one flip absorbs.
function pinnedForwardForm(stored, incomingMsg) {
  if (stored.r !== "user") return incomingMsg;
  if (hasCacheControl(incomingMsg)) return incomingMsg;
  return stored.m ?? stripVolatileBlocks(incomingMsg);
}

// --- Reminder-swap suppression (#76606, decision B) ---
//
// CC sometimes migrates a hook reminder OUT of the user message that
// carries it and INTO a standalone message of its own — measured directly
// (capture s-633915a8, n=26->28): message[30]'s <system-reminder>-wrapped
// block is gone from message[30] and its inner text, wrapper stripped,
// is the entire content of a new message[31] (role system). Pinning above
// restores message[30]'s first-seen bytes, reminder included; treating the
// new standalone as ordinary tail growth then forwards the SAME text a
// second time, and because it lands mid-array the cache's
// longest-identical-prefix boundary moves to right before it — everything
// after is re-billed (measured: cacheRead 15424 / cacheCreation 124025).
//
// Strip the wrapper for comparison ONLY — never for what gets forwarded;
// the pin already owns that. Reuses VOLATILE_WRAP_REGEX's capture group
// rather than a second regex, per the same rule cited above it.
function unwrapVolatileText(block) {
  if (!block || typeof block !== "object" || block.type !== "text" || typeof block.text !== "string") {
    return block;
  }
  const m = VOLATILE_WRAP_REGEX.exec(block.text);
  return m ? { type: "text", text: m[1] } : block;
}

// The set of block identities this extension is CURRENTLY restoring —
// i.e. present in a LIVE (not dropped) canonical entry's stored first-seen
// form. Dropped entries are excluded on purpose: their content is not being
// served anywhere, so a new standalone message matching a dropped block
// must flow through normally rather than being silently discarded with no
// copy left at all. Scoped to VOLATILE blocks only (isVolatileBlock), since
// those are what buildPinEntry ever stores `m` for and what the measured
// migration shape moves — a plain text block coincidentally matching a
// pinned message's ordinary content is not this class.
function pinnedBlockHashes(priorCanonical) {
  const hashes = new Set();
  if (!Array.isArray(priorCanonical)) return hashes;
  for (const entry of priorCanonical) {
    if (entry.d || !entry.m || !Array.isArray(entry.m.content)) continue;
    for (const block of entry.m.content) {
      if (!isVolatileBlock(block)) continue;
      const h = hashMessageContent({ content: [unwrapVolatileText(block)] });
      if (h !== null) hashes.add(h);
    }
  }
  return hashes;
}

// The merged-standalone shape (measured 2026-07-30, capture s-633915a8,
// msg864, the 587k window): CC sometimes migrates ALL of a message's
// volatile blocks out TOGETHER, joined into one standalone message,
// rather than one standalone per block. pinnedBlockHashes above can never
// match that — it hashes one block at a time, and a merged message is one
// block whose text spans two reminders. A second set covers exactly the
// observed join: for each pinned entry with >=2 volatile blocks, hash the
// concatenation of ALL its volatile blocks' wrapper-stripped texts, in
// WIRE order, joined with "\n\n" — the exact separator measured on the
// real merged standalone (both hook reminders, 627 chars). No
// subset-merges: partial joins were never observed and would only invite
// false suppression on coincidental partial matches. "\n\n" is hardcoded
// to the one observed instance, not a general N-ary merge grammar — other
// separators are unobserved, and the census keeps watching for them.
// The one observed separator, named once. pinnedJoinHashes and the
// cross-message move recognition below are the same grammar seen from two
// sides, so they must not carry two copies of it.
const JOIN_SEPARATOR = "\n\n";

function pinnedJoinHashes(priorCanonical) {
  const hashes = new Set();
  if (!Array.isArray(priorCanonical)) return hashes;
  for (const entry of priorCanonical) {
    if (entry.d || !entry.m || !Array.isArray(entry.m.content)) continue;
    const volatileTexts = entry.m.content.filter(isVolatileBlock).map((b) => unwrapVolatileText(b).text);
    if (volatileTexts.length < 2) continue;
    const h = hashMessageContent({ content: [{ type: "text", text: volatileTexts.join(JOIN_SEPARATOR) }] });
    if (h !== null) hashes.add(h);
  }
  return hashes;
}

// Is `msg` a suppressible duplicate of a currently-pinned block (or, since
// 2026-07-30, a currently-pinned entry's FULL joined volatile-block set)?
// Narrow by definition (BACKLOG #76606 part (c)): STANDALONE only (single
// block after the same string->one-block fold canonicalMessageShape
// already applies elsewhere in this file), and its wrapper-stripped bytes
// must exactly equal a hash in `pinnedHashes` or `joinHashes` — never a
// positional or role heuristic. `joinHashes` is optional (existing callers
// checking single-block duplicates only are unaffected). Returns the
// matched hash (for telemetry) or null (genuine content: no suppression,
// existing rules apply unchanged).
export function findSuppressibleDuplicate(msg, pinnedHashes, joinHashes) {
  const shaped = canonicalMessageShape(msg);
  if (!Array.isArray(shaped.content) || shaped.content.length !== 1) return null;
  const h = hashMessageContent({ content: [unwrapVolatileText(shaped.content[0])] });
  if (h === null) return null;
  if (pinnedHashes.has(h)) return h;
  if (joinHashes && joinHashes.has(h)) return h;
  return null;
}

export { pinnedBlockHashes, pinnedJoinHashes };

// --- Cross-message join MOVE (threat-matrix row 4, the 2026-07-30 flap) ---
//
// The leg no hash set could match, measured on the real bytes (fixture
// flap-s-0dc8ac87c43d-86.json, request n=104):
//
//   INLINE      msg89 user [tool_result, tool_result, <system-reminder>683]
//               msg90 system "The task tools haven't been used…"  (421 chars)
//   STANDALONE  msg90 user [tool_result, tool_result]     <- msg89, reminder shed
//               msg91 system  683 + "\n\n" + 421 = 1106   <- BOTH, merged
//
// So one message's reminder and the WHOLE of the standalone next to it left
// together as a single new message, and msg90 stopped being sent at all.
// pinnedBlockHashes matches one block; pinnedJoinHashes matches all blocks of
// ONE entry. Neither can span two source messages, so msg91 read as genuine
// new content landing in dropped msg90's gap — which is exactly the
// co-location test isEdit uses, so classifyPinned returned reset("edit-shaped")
// before the suppression pass could run, and the whole 221k prefix was
// re-billed on every second flip.
//
// DEFINITION of a MOVE, narrowed to the measured shape and no further:
// within one request, a canonical entry D disappears from the wire while a
// NEW message N appears such that
//   (a) D has stored first-seen bytes and is a standalone carrier — CC can
//       only re-send what it once sent, and we can only re-serve what we
//       kept;
//   (b) P, the nearest LIVE canonical entry BEFORE D, is present on this
//       request's wire and pins at least one reminder-WRAPPED block — the
//       candidacy predicate (47defba): the wrapper is what makes a block the
//       decoration CC relocates, and without it a message that merely shed a
//       sibling reads as a migration source;
//   (c) N's unwrapped text is exactly P's wrapped blocks joined with "\n\n",
//       then "\n\n", then D's whole first-seen text — the two-constituent
//       join in the measured order, never a subset, never another separator,
//       never a third constituent;
//   (d) N sits strictly inside D's gap — after P's wire index and before the
//       next surviving canonical entry's — the same co-location discriminator
//       isEdit uses, so a coincidental match elsewhere is not a move;
//   (e) a surviving successor EXISTS. This bounds the search, and it also
//       means N can never be the request's final message, so the tail guard
//       below (a suppressed final message leaves the request ending on an
//       assistant turn — three real 400s) cannot be reached from here.
//
// Everything else is out of scope by construction and stays on today's path
// byte-for-byte: subset merges, three-plus-block joins, other separators,
// moves of non-reminder content.
const isReminderWrapped = (b) =>
  b && typeof b === "object" && b.type === "text" && typeof b.text === "string" && b.text !== "" &&
  VOLATILE_WRAP_REGEX.test(b.text);

// The whole text of a message that consists of exactly one text block, wrapper
// stripped. null for anything else — a multi-block message is not a standalone
// and cannot be a join constituent under the definition above.
function standaloneText(msg) {
  if (!msg) return null; // an entry with no stored first-seen form
  const shaped = canonicalMessageShape(msg);
  if (!Array.isArray(shaped.content) || shaped.content.length !== 1) return null;
  const b = unwrapVolatileText(shaped.content[0]);
  return b && b.type === "text" && typeof b.text === "string" ? b.text : null;
}

// The reminder side of the join: a pinned entry's wrapped blocks, unwrapped
// and joined in WIRE order — the same rule and separator pinnedJoinHashes
// uses, so a one-block entry yields just its text and a two-block entry
// yields the join the merged-standalone shape already matches.
function pinnedReminderText(entry) {
  if (!entry?.m || !Array.isArray(entry.m.content)) return null;
  const texts = entry.m.content.filter(isReminderWrapped).map((b) => unwrapVolatileText(b).text);
  return texts.length ? texts.join(JOIN_SEPARATOR) : null;
}

export function findJoinMoves({ messages, priorCanonical, matched, droppedNow, newEntries }) {
  const moves = [];
  if (!droppedNow || droppedNow.size === 0) return moves;
  const ciToIdx = new Map(matched.map((m) => [m.ci, m.idx]));
  for (const ci of droppedNow) {
    const dText = standaloneText(priorCanonical[ci]?.m);
    if (dText === null) continue; // (a)

    let pci = -1;
    for (let j = ci - 1; j >= 0; j--) {
      if (priorCanonical[j].d) continue;
      pci = j;
      break;
    }
    if (pci < 0 || !ciToIdx.has(pci)) continue; // (b) predecessor not on the wire
    const pText = pinnedReminderText(priorCanonical[pci]);
    if (pText === null) continue; // (b) predecessor pins no reminder

    const loIdx = ciToIdx.get(pci);
    let hiIdx = -1;
    for (let j = ci + 1; j < priorCanonical.length; j++) {
      if (priorCanonical[j].d) continue;
      if (ciToIdx.has(j)) {
        hiIdx = ciToIdx.get(j);
        break;
      }
    }
    if (hiIdx < 0) continue; // (e) no surviving successor: unbounded gap, and the tail

    const wanted = pText + JOIN_SEPARATOR + dText;
    for (const e of newEntries) {
      if (e.index <= loIdx || e.index >= hiIdx) continue; // (d)
      const t = standaloneText(messages[e.index]);
      if (t === null || t !== wanted) continue; // (c)
      const hash = hashMessageContent({ content: [{ type: "text", text: t }] });
      if (hash === null) continue;
      moves.push({ mergedIndex: e.index, ci, afterIdx: loIdx, hash });
      break;
    }
  }
  return moves;
}

// Pin-mode classification. Differences from classifyInsertion:
//   - identities exclude volatile blocks (flip absorption);
//   - canonical entries missing from incoming are marked dropped
//     (`d: true`, kept in the file, skipped in later matches) instead of
//     resetting — unless the dropped total passes half the canon, which
//     reads as a compaction, not a prune;
//   - matched user messages forward their first-seen form.
export function classifyPinned(messages, priorCanonical) {
  const incoming = computePinnedIdentities(messages);
  const freshEntries = () => incoming.map((e) => buildPinEntry(e, messages[e.index]));

  // A reset abandons the ORDER model. It must NOT abandon the PINS, and
  // conflating the two cost real cache — threat-matrix row 22, measured
  // 2026-07-28 on capture s-538c0aef:
  //
  //   CC honestly replaced message 196, so reset(edit-shaped) was the right
  //   verdict and the cost belonged to 196+. But every reset returns without
  //   a `messages` field, so the caller forwards the incoming array raw — and
  //   that silently un-pinned message 177, whose first-seen <system-reminder>
  //   this extension had been restoring. Our bytes changed at 177 while CC's
  //   were byte-identical there, so the bust began 19 messages early.
  //
  // Identity deliberately EXCLUDES volatile blocks, so an identity still
  // present in priorCanonical names the same message and its stored
  // first-seen bytes are still the right bytes to send. Pinning substitutes
  // the CONTENT of a single user message and never adds, drops or reorders
  // one, so applying it on a reset cannot affect count, roles or adjacency.
  //
  // Deliberately NOT used by the adjacency-violation reset: that path exists
  // precisely because the pinned form broke tool adjacency, so it must send
  // the raw array.
  //
  // The SAME argument, one mechanism over: a reset must not abandon a
  // recognized MOVE either. Measured 2026-07-30 on capture s-dc3f8071
  // (n=196->197): the move was recognized on 196 and the absorbed entry's
  // first-seen bytes served at wire index 223; on 197 the subsequence match
  // failed, this path ran without move recognition, and the merged message
  // went out raw again. Our bytes at 223 flipped where CC's were identical,
  // moving the divergence 10 messages earlier than CC required — the row-22
  // shape exactly. Three captures that are otherwise clean reported it.
  //
  // Condition by condition, the pin argument transfers:
  //   - recognition needs no order model. findJoinMoves is a pure function of
  //     `matched`, `droppedNow`, `priorCanonical` and the wire, all of which
  //     this path already has, and the absorbed entry's first-seen bytes live
  //     in the canonical whatever the order did;
  //   - it FAILS CLOSED under disorder. Condition (d) bounds the merged
  //     message by its matched neighbours' wire indices, so in a scrambled
  //     request those bounds cross and nothing matches — raw forward, today's
  //     behaviour. The substitution can only fire where the local
  //     neighbourhood is still ordered;
  //   - it is slot-preserving: 1 -> 1, in place, so count, roles and
  //     adjacency are untouched, which is the pin argument verbatim.
  const priorByKey = new Map(
    (Array.isArray(priorCanonical) ? priorCanonical : []).map((e) => [identityKey(e), e]),
  );
  const resetKeepingPins = (resetReason) => {
    const out = messages.slice();
    let applied = 0;
    for (const e of incoming) {
      const stored = priorByKey.get(identityKey(e));
      if (!stored) continue;
      const fwd = pinnedForwardForm(stored, messages[e.index]);
      if (fwd !== messages[e.index] && JSON.stringify(fwd) !== JSON.stringify(messages[e.index])) {
        out[e.index] = fwd;
        applied++;
      }
    }
    // Move substitutions, after the pins and on the same array. The two never
    // collide: a pin applies to a MATCHED entry, a move replaces a NEW one.
    const moves = findJoinMoves({ messages, priorCanonical, matched, droppedNow, newEntries });
    const movedByMergedIdx = new Map(moves.map((m) => [m.mergedIndex, m]));
    for (const mv of moves) out[mv.mergedIndex] = priorCanonical[mv.ci].m;

    // The canonical must describe the wire we JUST FORWARDED — the same
    // invariant the success path states. Building it from `messages` while
    // sending `out` makes the two disagree, and the next request then
    // diverges against a baseline that was never on the wire. Measured: that
    // mistake turned 0 violations into 3 on capture s-0edbd11c before the
    // canonical was switched to the pinned array.
    //
    // A moved slot therefore files the ABSORBED entry, not a fresh identity
    // built from the merge: the merge is not what we sent there. Filing the
    // merge would end the substitution after exactly one request — the
    // absorbed entry would be gone from the canonical, nothing would be left
    // to re-serve, and the flip would simply land on the next request.
    //
    // Suppression runs HERE too, not only on the success path.
    //
    // The defect this closes (measured 2026-07-31, session 77fe2779, the
    // 11:41:05 request): CC pruned six ephemeral turns, the survivors stopped
    // being a subsequence, and this reset fired. It kept the pins — the event
    // recorded `pinned: 2` — but returned BEFORE the migrated-duplicate pass,
    // so the event also recorded `suppressed: 0` and the standalone copy of an
    // already-pinned reminder went out on the wire. The prefix broke at the
    // host and everything after it re-billed: `edit@98 of 123`, transcript
    // `cache_miss_reason messages_changed / 105006`, ~104 kB.
    //
    // The suppression built for exactly that shape was therefore disarmed by
    // any reset — and resets are not rare (this file's own measurement: 125
    // across 350 requests, roughly one in three). A mitigation that switches
    // off on a third of requests, silently, is the shape that reads as shipped
    // and behaves as absent.
    //
    // The pins are already in hand here, which is what makes this correct
    // rather than a second mechanism: a standalone duplicate is suppressible
    // precisely when the inline form it duplicates is being restored, and
    // `applied` above is that restoration.
    const pinnedHashesR = pinnedBlockHashes(priorCanonical);
    const pinnedJoinR = pinnedJoinHashes(priorCanonical);
    const lastIdxR = messages.length - 1;
    const suppressedR = new Set();
    // DECLARED, not merely counted. `suppressions` (the incoming indices) is
    // what tools/replay.mjs keys its exemptions on — safetyViolation() filters
    // them out of the input side before comparing lengths, and
    // conservationViolations() accepts a missing unit only when it is part of a
    // declared suppression. Reporting the COUNT alone left both gates blind on
    // this path: replaying capture s-77fe2779 (conversation e7394e05, request
    // 11:41:05.778Z) with the serving gates reported one safety violation
    // (`length: 124 -> 123`) and one conservation violation (`lost: in[98]`)
    // for a suppression that was working exactly as designed — a check firing
    // on a non-defect, which is how a reader learns to ignore red. It also cost
    // the per-suppression event lines in the telemetry log (onRequest emits one
    // per entry of THIS array), i.e. the record dev-loop's "rule out ourselves"
    // sweep reads — absent on the reset path, which is ~1 request in 3.
    //
    // ONE declaration array for BOTH suppression kinds, mirroring the success
    // path: `kind: "join-move"` entries KEEP their slot (the absorbed entry is
    // substituted into it above), plain duplicate entries are REMOVED from the
    // forwarded array. tools/replay.mjs reads the kind to tell the two apart
    // (`wireRemovedIndices` filters `kind !== "join-move"`), so a single array
    // is what both gates already expect — two arrays would leave one of them
    // blind on whichever kind it did not read.
    const suppressionsR = [];
    for (const e of incoming) {
      const mv = movedByMergedIdx.get(e.index);
      if (mv) {
        // The merged message carries the bytes of TWO sources, so no single
        // hash set can match it; findJoinMoves has already established that
        // both constituents are on the wire (one pinned, one re-served into
        // this very slot), which is the "a copy is present" condition the hash
        // sets check. Declared here, never added to `suppressedR` — the slot
        // stays, it just carries the first-seen bytes.
        suppressionsR.push({ index: mv.mergedIndex, hash: mv.hash, kind: "join-move" });
        continue;
      }
      if (priorByKey.has(identityKey(e))) continue; // only entries CC newly sent
      if (e.r === "assistant") continue;
      if (e.index === lastIdxR) continue;           // tail growth is never a stray migration
      const h = findSuppressibleDuplicate(messages[e.index], pinnedHashesR, pinnedJoinR);
      if (h !== null) {
        suppressedR.add(e.index);
        suppressionsR.push({ index: e.index, hash: h });
      }
    }
    const forwarded = suppressedR.size > 0
      ? out.filter((_, i) => !suppressedR.has(i))
      : out;
    // A suppressed entry was never forwarded, so it must not enter the
    // canonical either — same invariant the success path states: the canonical
    // describes the wire we JUST FORWARDED. A MOVED slot is the opposite case:
    // it IS on the forwarded wire, carrying the absorbed entry's bytes, so it
    // files that entry.
    const keptEntries = incoming.filter((e) => !suppressedR.has(e.index));
    return {
      action: "reset",
      resetReason,
      canonicalEntries: keptEntries.map((e) => {
        const mv = movedByMergedIdx.get(e.index);
        return mv ? priorCanonical[mv.ci] : buildPinEntry(e, out[e.index]);
      }),
      ...(applied > 0 || moves.length > 0 || suppressedR.size > 0 ? { messages: forwarded } : {}),
      pinned: applied,
      moved: moves.length,
      suppressed: suppressionsR.length,
      suppressions: suppressionsR,
      reserves: moves.map((m) => ({ index: m.mergedIndex, hash: m.hash })),
    };
  };

  if (!Array.isArray(priorCanonical) || priorCanonical.length === 0) {
    return { action: "reset", resetReason: "no-prior-canonical", canonicalEntries: freshEntries() };
  }

  const incomingByKey = new Map(incoming.map((e) => [identityKey(e), e.index]));

  const matched = []; // { ci: index into priorCanonical, idx: incoming index }
  const droppedNow = new Set();
  let droppedBefore = 0;
  for (let ci = 0; ci < priorCanonical.length; ci++) {
    const stored = priorCanonical[ci];
    if (stored.d) {
      droppedBefore++;
      continue;
    }
    const idx = incomingByKey.get(identityKey(stored));
    if (idx === undefined) droppedNow.add(ci);
    else matched.push({ ci, idx });
  }
  // Computed here rather than after the order checks below because
  // resetKeepingPins needs `newEntries` to recognize a move, and both of the
  // resets below are call sites. Nothing here depends on the order model —
  // only on which identities matched — so hoisting it changes no value.
  const matchedIdxSet = new Set(matched.map((m) => m.idx));
  const lastMatched = matched.length > 0 ? matched[matched.length - 1].idx : -1;
  const newEntries = incoming.filter((e) => !matchedIdxSet.has(e.index));

  for (let i = 1; i < matched.length; i++) {
    if (matched[i].idx <= matched[i - 1].idx) {
      return resetKeepingPins("not-subsequence");
    }
  }
  if (droppedBefore + droppedNow.size > priorCanonical.length / 2) {
    return resetKeepingPins("dropped-majority");
  }

  const splicedEntries = newEntries.filter((e) => e.index <= lastMatched);

  // A true EDIT decomposes under drop-tolerance into drop + splice: the old
  // content's identity disappears and a new one appears IN ITS PLACE. That
  // must still reset — never paper over a real content change.
  //
  // But "a drop and a splice occurred in the same request" is too coarse a
  // test for it, because the two can be unrelated: measured 2026-07-28
  // (capture s-35d72503, request 09:47:31) a tail message was pruned by an
  // operator interrupt while a hook reminder migrated mid-history 24 indices
  // away — one prune plus one insertion, neither an edit, reset anyway. That
  // single false positive was the last real reset in the corpus.
  //
  // Co-location is the discriminator: a dropped canonical entry sits in a
  // definite gap — between its nearest surviving predecessor and successor —
  // and only a spliced entry landing INSIDE that gap is a plausible
  // replacement for it. A splice elsewhere is an independent insertion.
  // A recognized MOVE is classified BEFORE the edit-shaped test, and only for
  // candidacy-class content (findJoinMoves' definition). CC did not edit
  // history here — it re-packaged a reminder and its neighbouring standalone
  // into one message — so the honest response is to serve the first-seen form,
  // not to abandon the order model. Everything the recognition does not match
  // falls through to exactly today's path.
  const joinMoves = findJoinMoves({ messages, priorCanonical, matched, droppedNow, newEntries });
  const movedMergedIdx = new Set(joinMoves.map((m) => m.mergedIndex));
  const movedCi = new Set(joinMoves.map((m) => m.ci));

  const matchedCi = new Set(matched.map((m) => m.ci));
  const isEdit = (() => {
    if (droppedNow.size === 0 || splicedEntries.length === 0) return false;
    // The merged message is not a replacement for the entry it absorbed, and
    // that entry did not vanish — it is about to be re-served. Both sides of
    // the co-location test therefore drop out of it.
    const splicedIdx = splicedEntries.map((e) => e.index).filter((idx) => !movedMergedIdx.has(idx));
    if (splicedIdx.length === 0) return false;
    for (const ci of droppedNow) {
      if (movedCi.has(ci)) continue;
      // Nearest surviving neighbours of the dropped entry, in incoming space.
      let lo = -1;
      for (let j = ci - 1; j >= 0; j--) {
        if (!matchedCi.has(j)) continue;
        lo = matched.find((m) => m.ci === j).idx;
        break;
      }
      let hi = Infinity;
      for (let j = ci + 1; j < priorCanonical.length; j++) {
        if (!matchedCi.has(j)) continue;
        hi = matched.find((m) => m.ci === j).idx;
        break;
      }
      if (splicedIdx.some((idx) => idx > lo && idx < hi)) return true;
    }
    return false;
  })();
  if (isEdit) {
    return resetKeepingPins("edit-shaped");
  }

  if (splicedEntries.some((e) => e.r === "assistant")) {
    return resetKeepingPins("assistant-interleaved");
  }

  // Suppress a NEW entry that duplicates a block this extension is already
  // restoring elsewhere (see the block comment above findSuppressibleDuplicate).
  // Assistant entries are excluded on principle even though the measured
  // shape never produces one — silently dropping the model's own prior
  // output is a correctness question this extension has no business
  // deciding, unlike a hook reminder it already owns via the pin.
  // Genuine change (normalized bytes differ from every pinned block):
  // findSuppressibleDuplicate returns null, the entry is untouched here,
  // and whatever the existing rules above already decided (append/splice/
  // edit-shaped reset) stands — no new reset path is introduced.
  // TAIL GUARD (BACKLOG.md, "suppression can strip a request's FINAL
  // message", 2026-07-30). Three real 400s ("must end with a user
  // message"): report-enforcer injects identical instruction bytes at
  // every SubagentStop; the first occurrence gets pinned, and when the
  // SAME bytes arrive again as the resume request's ONLY/new final
  // message, suppressing it left the forwarded array ending on the prior
  // assistant turn. A tail-position duplicate is never a stray migration
  // copy of already-pinned content — CC just sent it as the live,
  // load-bearing final entry of THIS request, and the model needs to see
  // it. Applies uniformly to both single-block and join-hash matches: the
  // guard is positional, not about which hash set matched.
  const lastIdx = messages.length - 1;
  const pinnedHashes = pinnedBlockHashes(priorCanonical);
  const pinnedJoin = pinnedJoinHashes(priorCanonical);
  const suppressions = [];
  for (const e of newEntries) {
    if (e.r === "assistant") continue;
    if (e.index === lastIdx) continue;
    // A recognized move's merged message carries the bytes of TWO sources, so
    // no single-hash set can match it; findJoinMoves has already established
    // that both constituents are on the wire (one pinned, one re-served below),
    // which is the same "a copy is present" condition the hash sets check.
    if (movedMergedIdx.has(e.index)) {
      suppressions.push({ index: e.index, hash: joinMoves.find((m) => m.mergedIndex === e.index).hash, kind: "join-move" });
      continue;
    }
    const h = findSuppressibleDuplicate(messages[e.index], pinnedHashes, pinnedJoin);
    if (h !== null) suppressions.push({ index: e.index, hash: h });
  }
  const suppressedIdx = new Set(suppressions.map((s) => s.index));
  // A move is served IN PLACE OF the merged message — the re-served entry
  // takes exactly the slot the merge occupied, which is the slot it held when
  // it was first seen (it landed in that gap, immediately after its
  // predecessor). One message in, one message out.
  //
  // The alternative — appending the re-serve after the predecessor and
  // dropping the merge — was built first and was WRONG for a reason worth
  // keeping: it made the move a deletion plus an insertion, so every check
  // downstream needed to be told the OUTGOING index of a message we added,
  // and that index is measured at THIS extension's tap point (order 395).
  // deferred-tool-rewrite inserts its tool_addition announcement at order
  // 425, so by the time the safety gate reads the forwarded array the number
  // points at a different message: measured on capture s-0d6f38ba n=104, the
  // recorded outIndex 89 held the re-served system message here and a
  // `user [tool_result, tool_result, text]` in the final array, where the
  // re-serve had shifted to 90 — 98 safety violations across the capture,
  // all of them the instrument, none of them the conversation. Substituting
  // in place needs no index to travel anywhere (dev-loop.md, "Tap points —
  // every number names where it was measured").
  const movedByMergedIdx = new Map(joinMoves.map((m) => [m.mergedIndex, m]));
  const reserves = [];

  // Forwarded order is the INCOMING order, not "survivors then new". The two
  // agree for a plain append; they diverge when CC splices an entry
  // mid-history, and concatenating new entries at the end would then reorder
  // real content — the very thing this extension exists to prevent.
  let pinApplied = 0;
  const matchedByIdx = new Map(matched.map(({ ci, idx }) => [idx, ci]));
  const finalMessages = [];
  for (const e of incoming) {
    if (suppressedIdx.has(e.index)) {
      const mv = movedByMergedIdx.get(e.index);
      if (!mv) continue; // an ordinary duplicate: the pinned inline form already carries these bytes
      reserves.push({ index: mv.mergedIndex, hash: mv.hash });
      finalMessages.push(priorCanonical[mv.ci].m);
      continue;
    }
    const ci = matchedByIdx.get(e.index);
    if (ci === undefined) {
      finalMessages.push(messages[e.index]);
      continue;
    }
    const fwd = pinnedForwardForm(priorCanonical[ci], messages[e.index]);
    if (fwd !== messages[e.index] && JSON.stringify(fwd) !== JSON.stringify(messages[e.index])) {
      pinApplied++;
      finalMessages.push(fwd);
    } else {
      finalMessages.push(messages[e.index]);
    }
  }

  if (!validateToolAdjacency(finalMessages)) {
    return { action: "reset", resetReason: "adjacency-violation", canonicalEntries: freshEntries() };
  }

  // POSITIONAL canonical rebuild (2026-07-28). Appending new entries to the
  // tail records ARRIVAL order, not the order they occupy on the wire. When
  // CC splits a message — hook reminders migrating out of a user message into
  // their own system message is the measured case — the new entry is created
  // mid-history but was filed at the end. Canonical order and wire order then
  // disagreed permanently, and the next request touching that region failed
  // the strictly-increasing check with `not-subsequence`.
  //
  // Measured before this fix (capture s-35d72503): an inversion at canonical
  // position 81 for an entry that sits at wire index 79, and every remaining
  // real reset in both corpora traced to exactly this.
  //
  // Rebuilding in incoming order fixes it. Dropped entries have no position
  // in the new array, so they are re-inserted after the last surviving entry
  // that preceded them — keeping them adjacent to their original neighbours
  // so a later un-prune still matches in order.
  const canonByIdx = new Map();
  for (const { ci, idx } of matched) canonByIdx.set(idx, priorCanonical[ci]);
  const newByIdx = new Map(newEntries.map((e) => [e.index, buildPinEntry(e, messages[e.index])]));
  const droppedAfter = new Map(); // incoming index -> canonical entries to trail it
  {
    let lastSeenIdx = -1;
    for (let ci = 0; ci < priorCanonical.length; ci++) {
      const entry = priorCanonical[ci];
      const hit = matched.find((m) => m.ci === ci);
      if (hit) {
        lastSeenIdx = hit.idx;
        continue;
      }
      // A MOVED entry is absent from CC's array and PRESENT on ours — it was
      // re-served into the merged message's slot — so it is neither dropped
      // nor trailing: it is placed at that slot in the loop below, exactly
      // where it sits on the wire we just forwarded. Marking it dropped, or
      // trailing it here, would make the canonical describe an array we did
      // not send, which is the invariant stated further down.
      if (movedCi.has(ci)) continue;
      const marked = entry.d ? entry : { ...entry, d: true };
      if (!droppedAfter.has(lastSeenIdx)) droppedAfter.set(lastSeenIdx, []);
      droppedAfter.get(lastSeenIdx).push(marked);
    }
  }
  const canonicalEntries = [];
  for (const trailing of droppedAfter.get(-1) ?? []) canonicalEntries.push(trailing);
  for (const e of incoming) {
    // A suppressed entry was never forwarded, so it gets no canonical
    // identity — the invariant just below states the canonical must
    // describe the wire we just forwarded, and this entry isn't on it.
    // Recomputed fresh on every request (findSuppressibleDuplicate against
    // the currently-live pins), so leaving no trace here is not a gap: CC
    // keeps re-sending the duplicate as long as it believes it's part of
    // history, and it is re-detected and re-suppressed every time — no
    // persisted "suppressed" marker is needed for the suppression to stay
    // stable across subsequent requests.
    if (suppressedIdx.has(e.index)) {
      // A moved entry occupies this slot on the forwarded wire, so it occupies
      // it in the canonical too — the two must describe the same array.
      const mv = movedByMergedIdx.get(e.index);
      if (mv) canonicalEntries.push(priorCanonical[mv.ci]);
      continue;
    }
    canonicalEntries.push(canonByIdx.get(e.index) ?? newByIdx.get(e.index));
    for (const trailing of droppedAfter.get(e.index) ?? []) canonicalEntries.push(trailing);
  }

  const changed = splicedEntries.length > 0 || pinApplied > 0 || suppressions.length > 0 || reserves.length > 0;
  return {
    action: changed ? "normalized" : "append-only",
    messages: finalMessages,
    canonicalEntries,
    // ORDER INVARIANT (2026-07-28). The canonical we just wrote must describe
    // the wire we just forwarded: reading live entries in canonical order, the
    // wire index each occupies must be STRICTLY INCREASING.
    //
    // This is the mechanism behind every reset class this extension has had.
    // The arrival-order defect violated exactly this — canonical position 81
    // holding an entry that sits at wire index 79 — and was visible only
    // downstream, as a not-subsequence reset on a LATER request whose cause
    // had to be traced backwards. A size statistic cannot see it: a split adds
    // one canonical entry AND one wire message, so the counts stay equal while
    // the order diverges. Bite-tested both ways — a size-drift signal flagged
    // nothing; this check names the exact inversion.
    //
    // Reported, not asserted: a violation is a defect in OUR state model, so
    // it belongs in front of a developer with a location rather than being
    // swallowed by a silent reset.
    canonOrderViolation: (() => {
      const wireOf = new Map(incoming.map((e) => [identityKey(e), e.index]));
      let prev = -1;
      let seen = 0;
      for (const entry of canonicalEntries) {
        if (entry.d) continue;
        const idx = wireOf.get(identityKey(entry));
        if (idx === undefined) continue;
        seen++;
        if (idx <= prev) return { at: seen - 1, wireIdx: idx, prevWireIdx: prev };
        prev = idx;
      }
      return null;
    })(),
    // `inserted` counts what actually landed on the wire — a suppressed
    // entry was a new entry CC sent but never one we forwarded, so it must
    // not inflate this the way it would inflate a real insertion count.
    inserted: newEntries.length - suppressions.length,
    pinned: pinApplied,
    // A moved entry is not dropped — it is still being served, from its
    // first-seen bytes. Counting it here would report a prune that did not
    // happen and would make the drop rate unreadable.
    dropped: droppedNow.size - movedCi.size,
    suppressed: suppressions.length,
    suppressions,
    moved: joinMoves.length,
    reserves,
  };
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
      const pin = isPinEnabled();
      const mode = pin ? "pin" : "plain";
      const prior = await loadCanonical(dir, sessionKey, fs, mode);
      const result = pin ? classifyPinned(messages, prior) : classifyInsertion(messages, prior);

      // Apply whatever the classifier produced, rather than keying on the
      // action name. A reset now returns a pinned array too (row 22): the
      // order model is abandoned, the pins are not. `append-only` returns the
      // incoming array unchanged, so this stays a no-op there.
      if (result.messages) {
        body.messages = result.messages;
      }

      await saveCanonical(dir, sessionKey, result.canonicalEntries, fs, mode);

      ctx.meta = ctx.meta || {};
      // canonSize / canonLive / msgs expose the STATE, not just the verdict.
      // The append-vs-position defect (canonical entries filed in arrival
      // order while sitting mid-history on the wire) was invisible in
      // action + resetReason alone — it surfaced only as a canonical grown to
      // 92 entries for an 84-message history. A state model drifting from the
      // wire is the failure mode behind every reset class this extension has
      // had, so the sizes belong in the telemetry tools/replay.mjs --trace
      // reads.
      ctx.meta.insertionNormalizeStats = {
        action: result.action,
        inserted: result.inserted ?? 0,
        resetReason: result.resetReason,
        canonSize: result.canonicalEntries?.length ?? 0,
        canonLive: result.canonicalEntries?.filter((e) => !e.d).length ?? 0,
        msgs: messages.length,
        canonOrderViolation: result.canonOrderViolation ?? null,
        // `suppressions` (not just the count) rides on the stats object —
        // tools/replay.mjs's safety-gate exemption reads the incoming
        // indices from here to declare them, the same way it already reads
        // deferred-tool-rewrite's tool_addition shape.
        ...(pin
          ? {
              pinned: result.pinned ?? 0,
              dropped: result.dropped ?? 0,
              suppressed: result.suppressed ?? 0,
              suppressions: result.suppressions ?? [],
              // `reserves` is the mirror of `suppressions` and rides for the
              // same reason: a message we ADD is invisible to a check that
              // only knows what CC sent, so the gates read the outgoing
              // indices from the extension's own report rather than
              // re-deriving "this one looks synthetic".
              moved: result.moved ?? 0,
              reserves: result.reserves ?? [],
            }
          : {}),
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
          ...(pin ? { pinned: result.pinned ?? 0, dropped: result.dropped ?? 0, suppressed: result.suppressed ?? 0, moved: result.moved ?? 0 } : {}),
        },
        fs,
      );

      // One event line PER SUPPRESSION (not aggregated into the summary
      // line above), to the same file/format — the pattern every other
      // record in this log already uses, just one call per occurrence
      // instead of once per request.
      if (pin && Array.isArray(result.suppressions) && result.suppressions.length) {
        for (const s of result.suppressions) {
          await appendTelemetry(
            dir,
            sessionKey,
            {
              ts: new Date().toISOString(),
              key: sessionKey,
              sid: sessionId,
              event: s.kind === "join-move" ? "join-move" : "suppressed-duplicate",
              index: s.index,
              hash: s.hash,
            },
            fs,
          );
        }
      }

      if (isDebug()) {
        process.stderr.write(
          `[insertion-normalize] action=${result.action} inserted=${result.inserted ?? 0}` +
            (result.resetReason ? ` reason=${result.resetReason}` : "") +
            (pin ? ` pinned=${result.pinned ?? 0} dropped=${result.dropped ?? 0} suppressed=${result.suppressed ?? 0}` : "") +
            "\n",
        );
      }
    } catch (err) {
      debug(`onRequest unexpected: ${err?.message ?? err}`);
    }
  },
};
