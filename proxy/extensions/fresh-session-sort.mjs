import { createHash } from "node:crypto";

const SR = "<system-reminder>\n";

function isSystemReminder(text) {
  return typeof text === "string" && text.startsWith("<system-reminder>");
}

function isHooksBlock(text) {
  return isSystemReminder(text) && text.substring(0, 200).includes("hook success");
}

function isSkillsBlock(text) {
  return typeof text === "string" && text.startsWith(SR + "The following skills are available");
}

function isDeferredToolsBlock(text) {
  return typeof text === "string" && text.startsWith(SR + "The following deferred tools are now available");
}

function isMcpBlock(text) {
  return typeof text === "string" && text.startsWith(SR + "# MCP Server Instructions");
}

function isRelocatableBlock(text) {
  return isHooksBlock(text) || isSkillsBlock(text) || isDeferredToolsBlock(text) || isMcpBlock(text);
}

function isClearArtifact(text) {
  if (typeof text !== "string") return false;
  return (
    text.startsWith("<local-command-caveat>") ||
    text.startsWith("<command-name>") ||
    text.startsWith("<local-command-stdout>")
  );
}

function sortSkillsBlock(text) {
  const match = text.match(/^([\s\S]*?\n\n)(- [\s\S]+?)(\n<\/system-reminder>\s*)$/);
  if (!match) return text;
  const [, header, entriesText, footer] = match;
  const entries = entriesText.split(/\n(?=- )/);
  entries.sort();
  return header + entries.join("\n") + footer;
}

function sortDeferredToolsBlock(text) {
  const match = text.match(
    /^(<system-reminder>\nThe following deferred tools are now available[^\n]*\n)([\s\S]+?)(\n<\/system-reminder>\s*)$/
  );
  if (!match) return text;
  const [, header, toolsList, footer] = match;
  const tools = toolsList.split("\n").map((t) => t.trim()).filter(Boolean);
  tools.sort();
  return header + tools.join("\n") + footer;
}

function stripSessionKnowledge(text) {
  return text.replace(/\n<session_knowledge[^>]*>[\s\S]*?<\/session_knowledge>/g, "");
}

const _pinnedBlocks = new Map();

// The pure half of pinBlockContent, extracted so a CHECKER can re-derive what
// this extension does to a block without touching `_pinnedBlocks`. The
// conservation gate needs exactly that: it must chain this extension's own
// logic rather than re-implement it (an expectation with the same parentage as
// the code pins the bug it should catch), and it must not mutate live
// extension state while doing so.
export function normalizeBlockText(text) {
  return text.replace(/\s+(<\/system-reminder>)\s*$/, "\n$1");
}

function pinBlockContent(blockType, text) {
  const normalized = normalizeBlockText(text);
  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 16);
  const pinned = _pinnedBlocks.get(blockType);
  if (pinned && pinned.hash === hash) return pinned.text;
  _pinnedBlocks.set(blockType, { hash, text: normalized });
  return normalized;
}

function getBlockType(text) {
  if (isSkillsBlock(text)) return "skills";
  if (isDeferredToolsBlock(text)) return "deferred";
  if (isMcpBlock(text)) return "mcp";
  if (isHooksBlock(text)) return "hooks";
  return null;
}

function fixBlockText(blockType, text) {
  return pinBlockContent(blockType, rewriteBlockText(blockType, text));
}

/**
 * What this extension turns a block's text into, as a PURE function — the
 * transform without the pin. `fixBlockText` is this plus the stateful pin, and
 * on a first sighting the two agree by construction. Exported for the
 * conservation gate, which verifies a declared rewrite by re-deriving it.
 */
export function rewriteBlockText(blockType, text) {
  let fixed = text;
  if (blockType === "skills") fixed = sortSkillsBlock(fixed);
  else if (blockType === "deferred") fixed = sortDeferredToolsBlock(fixed);
  else if (blockType === "hooks") fixed = stripSessionKnowledge(fixed);
  return normalizeBlockText(fixed);
}

export { isSystemReminder, isHooksBlock, isSkillsBlock, isDeferredToolsBlock, isMcpBlock, isRelocatableBlock, isClearArtifact, sortSkillsBlock, sortDeferredToolsBlock, stripSessionKnowledge, pinBlockContent, getBlockType, fixBlockText };

export default {
  name: "fresh-session-sort",
  description: "Relocate scattered blocks to messages[0] in deterministic fresh-session order",
  order: 250,

  async onRequest(ctx) {
    const { body } = ctx;
    if (!Array.isArray(body.messages)) return;

    let firstUserIdx = -1;
    for (let i = 0; i < body.messages.length; i++) {
      if (body.messages[i].role === "user") {
        firstUserIdx = i;
        break;
      }
    }
    if (firstUserIdx === -1) return;

    const firstMsg = body.messages[firstUserIdx];
    if (!Array.isArray(firstMsg?.content)) return;

    // Strip /clear artifacts from first user message
    const beforeLen = firstMsg.content.length;
    firstMsg.content = firstMsg.content.filter((b) => !isClearArtifact(b.text || ""));

    // Check for scattered relocatable blocks outside first user message
    let hasScatteredBlocks = false;
    for (let i = firstUserIdx + 1; i < body.messages.length && !hasScatteredBlocks; i++) {
      const msg = body.messages[i];
      if (msg.role !== "user" || !Array.isArray(msg.content)) continue;
      for (const block of msg.content) {
        if (isRelocatableBlock(block.text || "")) {
          hasScatteredBlocks = true;
          break;
        }
      }
    }

    if (!hasScatteredBlocks) {
      // Still sort and pin blocks in-place for deterministic first-call baseline
      let modified = false;
      const rewroteTypes = [];
      const newContent = firstMsg.content.map((block) => {
        const text = block.text || "";
        const blockType = getBlockType(text);
        if (!blockType) return block;

        const fixedText = fixBlockText(blockType, text);
        if (fixedText !== text) {
          modified = true;
          rewroteTypes.push(blockType);
          const { cache_control, ...rest } = block;
          return { ...rest, text: fixedText };
        }
        return block;
      });

      if (modified || firstMsg.content.length !== beforeLen) {
        body.messages[firstUserIdx] = { ...firstMsg, content: newContent };
      }
      // DECLARE the rewrite, on this path too. It went undeclared until
      // 2026-08-05, which is not a cosmetic gap: the conservation gate exempts
      // a rewritten block only when the extension SAYS it rewrote one, so an
      // undeclared rewrite reads as a byte CC sent and we dropped. Measured —
      // 18 of 38 rows on one capture were this path, where nothing is
      // scattered and the extension only sorts in place.
      if (rewroteTypes.length) {
        ctx.meta = ctx.meta || {};
        ctx.meta.freshSessionSortStats = {
          ...(ctx.meta.freshSessionSortStats ?? {}),
          relocated: ctx.meta.freshSessionSortStats?.relocated ?? [],
          rewrote: rewroteTypes,
          targetIndex: firstUserIdx,
        };
      }
      return;
    }

    // Scan backwards to find latest instance of each relocatable block type.
    // `occurrences` counts EVERY instance seen in the same pass (not just the
    // kept one) — the extension's own record of whether the type it is about
    // to relocate has ever appeared anywhere else in this array (including
    // already at messages[firstUserIdx], before mutation). One occurrence
    // means this relocation is the type's first appearance in the whole
    // array — the deliberate one-time bust this extension exists for
    // (see the module doc). More than one means it recurred — reported as
    // such rather than folded into the same "first appearance" telemetry,
    // so a consumer (replay's stability exemption) can tell the two apart
    // instead of re-deriving it from shape.
    const found = new Map();
    const occurrences = new Map();
    for (let i = body.messages.length - 1; i >= firstUserIdx; i--) {
      const msg = body.messages[i];
      if (msg.role !== "user" || !Array.isArray(msg.content)) continue;
      for (let j = msg.content.length - 1; j >= 0; j--) {
        const block = msg.content[j];
        const text = block.text || "";
        const blockType = getBlockType(text);
        if (!blockType) continue;
        occurrences.set(blockType, (occurrences.get(blockType) ?? 0) + 1);
        if (found.has(blockType)) continue;

        const fixedText = fixBlockText(blockType, text);
        const { cache_control, ...rest } = block;
        found.set(blockType, { ...rest, text: fixedText });
      }
    }

    if (found.size === 0) return;

    // Remove all relocatable blocks from all user messages
    for (let i = 0; i < body.messages.length; i++) {
      const msg = body.messages[i];
      if (msg.role !== "user" || !Array.isArray(msg.content)) continue;
      const filtered = msg.content.filter((b) => !isRelocatableBlock(b.text || ""));
      if (filtered.length !== msg.content.length) {
        body.messages[i] = { ...msg, content: filtered };
      }
    }

    // Prepend in deterministic order: deferred → mcp → skills → hooks
    const ORDER = ["deferred", "mcp", "skills", "hooks"];
    const relocatedTypes = ORDER.filter((t) => found.has(t));
    const toRelocate = relocatedTypes.map((t) => found.get(t));

    body.messages[firstUserIdx] = {
      ...body.messages[firstUserIdx],
      content: [...toRelocate, ...body.messages[firstUserIdx].content],
    };

    // Report what happened — nothing downstream re-derives this. A
    // first-appearance relocation prepends content CC never had at
    // messages[firstUserIdx] before, which is exactly the shape replay's
    // cross-request stability check flags as a self-inflicted byte flip
    // (module doc, top). Telemetry lets that check tell the deliberate
    // one-time bust apart from a genuine repeat/thrash at the same index.
    ctx.meta = ctx.meta || {};
    ctx.meta.freshSessionSortStats = {
      relocated: relocatedTypes.map((t) => ({ type: t, firstAppearance: occurrences.get(t) === 1 })),
      rewrote: relocatedTypes,
      targetIndex: firstUserIdx,
    };
  },
};
