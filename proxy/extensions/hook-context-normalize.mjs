// hook-context-normalize — emit hook additional-context in ONE canonical
// container, so CC's own migration between two containers stops re-writing
// history mid-conversation.
//
// The class (threat matrix row 4). Claude Code first appends hook
// additional-context as text blocks INSIDE the preceding message, each wrapped
//
//     <system-reminder>\n...\n</system-reminder>
//
// and on a later request emits the same text as ONE standalone role:"system"
// message immediately after that host, wrappers STRIPPED and blocks JOINED
// with "\n\n". Because the second form edits a message mid-history, the cache
// re-bills everything from the host index onward. Measured live 2026-07-31:
// `edit@98 of 123`, transcript `cache_miss_reason messages_changed /
// cache_missed_input_tokens 105006`, ~75 kB at the host.
//
// The fix is to always forward the LATER form, so the transition changes no
// bytes. Forward-only: the "\n\n" join is never re-split, so no ambiguity is
// introduced when a reminder body itself contains a blank line.
//
// Grounding (tools/reminder-migration-census.mjs over 22 captures, 75
// conversations, 3512 same-conversation pairs — re-runnable, and the numbers
// below are its output, not an estimate):
//   18  EXACT     reconstruction byte-identical to CC's own later message
//   10  EXTENDED  CC's later form carries text that did not yet exist
//    1  DROPPED   blocks vanished with no counterpart
//    0  MISMATCH  no case where the rule produces the wrong bytes
//   placement +1 on 18 of 18 — the standalone message always sits immediately
//   after its host, so there is one index to emit at, not a distribution.
//
// The EXTENDED and DROPPED populations are NOT absorbed and are not claimed:
// they carry new information (usually a freshly-injected task-tools reminder)
// or lose it, and no serialization rule can produce bytes for content that did
// not exist yet. In both, forwarding the canonical form moves the divergence
// from the host to host+1 rather than creating one — never worse than the
// unmitigated path, which is what makes shipping at 62% absorption safe rather
// than a gamble.
//
// Order 355: after microcompact-stability (350), before read-dedupe (380) and
// insertion-normalization (395), so every downstream identity — including
// insertion-normalization's canonical history — hashes the normalized form
// from the first request rather than seeing it change under them later.
//
// Runtime gates, BOTH required:
//   CACHE_FIX_HOOK_CONTEXT_NORMALIZE=1   opt-in, read per call.
//   the request's own anthropic-beta header must carry
//   `mid-conversation-system-2026-04-07` — the beta that makes a role:"system"
//   entry in messages[] legal. Emitting one without it would hand the API a
//   shape it does not accept, turning a cache optimization into a failed
//   request. CC sends this beta today; the gate is what keeps the extension
//   correct on a client that does not.

const WRAP = /^<system-reminder>\n([\s\S]*)\n<\/system-reminder>\s*$/;
const REQUIRED_BETA = "mid-conversation-system-2026-04-07";

function debug(msg) {
  if (process.env.CACHE_FIX_DEBUG) process.stderr.write(`[hook-context-normalize] ${msg}\n`);
}

export function isEnabled() {
  return process.env.CACHE_FIX_HOOK_CONTEXT_NORMALIZE === "1";
}

/**
 * True when the outbound request declares the beta that legalizes a
 * role:"system" entry in messages[]. Header value is a comma-separated list;
 * matching is on exact members so a longer beta name cannot substring-match.
 */
export function betaAllowsSystemMessages(headers) {
  if (!headers) return false;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === "anthropic-beta");
  if (!key) return false;
  const raw = headers[key];
  const list = Array.isArray(raw) ? raw.join(",") : String(raw ?? "");
  return list.split(",").map((s) => s.trim()).includes(REQUIRED_BETA);
}

/** The <system-reminder>-wrapped trailing text blocks of a message. */
export function reminderBlocks(msg) {
  const c = msg?.content;
  if (!Array.isArray(c) || c.length < 2) return [];
  return c.slice(1)
    .filter((x) => x && x.type === "text" && typeof x.text === "string" && WRAP.test(x.text))
    .map((x) => x.text);
}

/**
 * The canonical standalone body: strip each wrapper, join with a blank line.
 * Deliberately the same rule the census verifies, stated once here and once
 * there; if they ever diverge the census stops proving this extension.
 */
export function canonicalBody(blocks) {
  return blocks.map((t) => {
    const m = WRAP.exec(t);
    return m ? m[1] : t;
  }).join("\n\n");
}

/**
 * Rewrite messages so hook-context blocks live in the standalone container.
 * Returns { messages, moved } — `moved` counts hosts rewritten, 0 meaning the
 * body is already canonical and must be passed through byte-untouched.
 */
export function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return { messages, moved: 0 };
  const out = [];
  let moved = 0;
  for (const msg of messages) {
    const blocks = reminderBlocks(msg);
    if (blocks.length === 0) { out.push(msg); continue; }
    const kept = msg.content.filter(
      (x) => !(x && x.type === "text" && typeof x.text === "string" && WRAP.test(x.text)));
    // A host is only a host if something survives beside the reminders.
    // Emptying a message would delete a turn, which is a fidelity change and
    // categorically not what a cache mitigation may do.
    if (kept.length === 0) { out.push(msg); continue; }
    out.push({ ...msg, content: kept });
    out.push({ role: "system", content: canonicalBody(blocks) });
    moved++;
  }
  return { messages: out, moved };
}

export async function runHookContextNormalize(reqCtx) {
  const stats = { enabled: false, beta_ok: false, hosts_moved: 0 };
  if (!isEnabled()) return stats;
  stats.enabled = true;
  if (!reqCtx?.body || !Array.isArray(reqCtx.body.messages)) return stats;
  if (!betaAllowsSystemMessages(reqCtx.headers)) {
    debug(`skipped: request does not declare ${REQUIRED_BETA}`);
    return stats;
  }
  stats.beta_ok = true;
  const { messages, moved } = normalizeMessages(reqCtx.body.messages);
  if (moved > 0) {
    reqCtx.body.messages = messages;
    stats.hosts_moved = moved;
    debug(`normalized ${moved} host(s) to the standalone container`);
  }
  return stats;
}

export default {
  name: "hook-context-normalize",
  description:
    "Forward hook additional-context in CC's own standalone role:\"system\" " +
    "container so its later migration out of the inline form stops re-writing " +
    "history mid-conversation (threat matrix row 4).",
  enabled: false, // overridden by extensions.json
  async onRequest(ctx) {
    try {
      const stats = await runHookContextNormalize(ctx);
      if (stats.enabled) {
        ctx.meta = ctx.meta || {};
        ctx.meta.hookContextNormalizeStats = stats;
      }
    } catch (err) {
      // A mutation extension that throws must not take the request with it.
      debug(`onRequest unexpected: ${err?.message ?? err}`);
    }
  },
};
