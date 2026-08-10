// message-hash — content identity for a message, shared by every extension
// that needs to recognise "the same message" across requests.
//
// Hash everything EXCEPT cache_control, because cache_control is what the
// proxy itself mutates: including it would make a message look changed the
// instant we mark it, which is the opposite of an identity.
//
// Not an extension — a primitive. It lived in mid-history-breakpoint-ladder
// until that extension was removed (it manufactured the mid-history
// divergences it was meant to bound); insertion-normalization and
// deferred-tool-rewrite both depend on this function and never depended on
// rung placement, so it moved here rather than dying with its old host.

import { createHash } from "node:crypto";

export function hashMessageContent(msg) {
  if (!msg || !Array.isArray(msg.content)) return null;
  const stripped = msg.content.map((block) => {
    if (!block || typeof block !== "object") return block;
    const { cache_control, ...rest } = block;
    return rest;
  });
  return createHash("sha256").update(JSON.stringify(stripped)).digest("hex").slice(0, 16);
}

// Conversation identity: the hash of msgs[0], the one entry nothing appends
// past. Lives here, not in one extension, because BOTH stateful extensions
// need it and the second one learning it late is what this file exists to
// prevent.
//
// History (2026-07-28, one day, twice). insertion-normalization keyed its
// canonical on (session-id, system-prompt) and thrashed: every subagent of a
// session runs the same agent prompt, so one bucket held 39 distinct
// conversations and 100% of conversation switches within a bucket reset
// (60/60) against 1% of same-conversation continuations. Adding this sub-key
// took it to 0 resets across 940 requests.
//
// deferred-tool-rewrite had the IDENTICAL key and did not get the fix, and it
// cost real cache: its tool_addition announcement is anchored to a message
// identity, so under a shared key the anchor belongs to somebody else's
// history, fails to match, and re-anchors to "after the last user message" —
// a different index every request. Measured: output diverging at index 4
// while CC's own history was identical through index 23, twice in one corpus.
//
// The general rule this keeps re-teaching: an identity computed more cheaply
// than the thing it identifies will collide, and the collision presents as
// churn rather than as a bug.
// --- D1 / threat-matrix row 26: the pre-pipeline conversation identity -------
//
// `conversationSubKey` is a function of `messages[0]`, and every stateful
// extension calls it on the body as it reaches THEM — which is AFTER
// `fresh-session-sort` (order 250) may have prepended a relocated block into
// `messages[0]`. The identity is then computed over bytes WE invented, so our
// own mitigation rotates the key its downstream consumers key on and destroys
// their state (matrix row 26, measured twice: 216,060 and ~124,331 cache_creation
// tokens).
//
// The fix is to compute the identity ONCE, before the first mutating extension,
// and hand it down. These two names are exported from here — beside the function
// whose result they carry — for the reason stated below `resolveInsertionSessionKey`:
// a second copy of a shared idea is a second truth, and the second consumer
// learning the lesson late is exactly how row 26's sibling defect happened.
//
// PRE_PIPELINE_CONV: `ctx.meta` field carrying the identity as of order 250.
// OLD_KEY_HIT: set by any consumer whose dual-read fell back to the rotated key.
export const PRE_PIPELINE_CONV = "prePipelineConv";
export const OLD_KEY_HIT = "d1OldKeyFallbackHit";

export function conversationSubKey(messages) {
  const first = Array.isArray(messages) ? messages[0] : null;
  if (!first) return "empty";
  const h = hashMessageContent(first);
  if (h) return h;
  // hashMessageContent covers block-array content only and returns null for
  // STRING content — correct for its own callers, but as a bucket key that
  // null collapsed every string-content conversation into one shared "empty"
  // bucket (56 of 602 requests in the measured capture). A message carrying
  // no content at all is the only remaining "empty".
  if (first.content === undefined || first.content === null) return "empty";
  return createHash("sha256")
    .update(JSON.stringify({ role: first.role ?? null, content: first.content }))
    .digest("hex")
    .slice(0, 16);
}
