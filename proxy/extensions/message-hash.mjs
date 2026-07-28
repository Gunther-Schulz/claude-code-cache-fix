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
