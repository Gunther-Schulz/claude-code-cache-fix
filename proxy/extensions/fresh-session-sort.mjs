import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, unlink } from "node:fs/promises";
import { join } from "node:path";

// Aliased: this module already has its own local `statePath()` (a per-session
// filename builder). The XDG root resolver is a different thing entirely.
import { statePath as xdgStatePath } from "../xdg-dirs.mjs";
import { resolveInsertionSessionKey } from "./insertion-normalization.mjs";
import { conversationSubKey, PRE_PIPELINE_CONV } from "./message-hash.mjs";
import { writeFileOwnerOnly } from "./write-owner-only.mjs";

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

// --- Sticky relocation memory, per conversation -----------------------------
//
// WHY, measured (capture s-captureAB, 2026-08-05, pair n=331 -> n=336, the
// session carrying ~413k tokens): the relocated set used to be re-derived from
// the CURRENT array on every request, so what we forwarded at messages[0]
// tracked the PRESENCE of the source block. CC sent the mcp block at msg[3]
// from n=325 through n=331 and stopped at n=336; the extension then had
// nothing to relocate and our messages[0] silently lost its first block. CC's
// own divergence was at index 3, ours at index 0 — and the cache prefix is
// [tools][system][messages], so an index-0 change re-bills everything. The
// gate flagged it outDiv 0 / inDiv 3 / ccIdenticalAtOutDiv true and attributed
// it here by bisection.
//
// `pinBlockContent` cannot cover this and never could: it holds a block's
// BYTES stable while the block is present, and between those two requests the
// block was absent, so nothing consulted it. Presence is the axis that was
// unheld.
//
// So: once a conversation has had a type relocated, that type is served from
// memory whenever CC sends no instance of it. CC's own newer bytes always win
// (dev-loop, "Volatile content vs. real change" — a genuine change still
// resets); the memory only covers ABSENCE.
//
// Keyed by the repo's conversation identity, imported rather than re-derived
// (dev-loop, "Never hand-roll identity"): one session-id header carries the
// main thread, every subagent and CC's sidecar calls, and a memory keyed by
// session — or by block type alone, as `_pinnedBlocks` above is — would serve
// one tenant's block into another's messages[0], inventing bytes CC never sent
// there.
// The memory is PERSISTED, because an in-process one re-inflicts at every
// restart exactly the divergence it exists to prevent: a conversation whose
// block CC has already stopped sending would re-derive an empty relocated set
// from the array and flip messages[0]. Same shape as insertion-normalization's
// canonical (tmp+rename, owner-only, fail-open reload) — that file holds
// first-seen message bytes for the same reason this one does: replaying the
// bytes IS the mechanism, so a hash cannot stand in for them, and bytes of a
// live conversation under ~/.claude are owner-only (test/write-owner-only).
const DEFAULT_MAX_CONVERSATIONS = 256;
const STATE_VERSION = 1;
const STATE_SUFFIX = "-fresh-sort-relocated.json";
// Prepend order, and the only block types this extension will ever hold. Used
// twice: to lay out messages[firstUserIdx], and to bound what a state file may
// deserialize into.
const ORDER = ["deferred", "mcp", "skills", "hooks"];

function isDebug(env = process.env) {
  return env.CACHE_FIX_DEBUG === "1";
}

function debug(msg) {
  if (isDebug()) process.stderr.write(`[fresh-session-sort] DEBUG: ${msg}\n`);
}

function maxConversations() {
  const raw = parseInt(process.env.CACHE_FIX_FRESH_SORT_MAX_CONVERSATIONS, 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_CONVERSATIONS;
}

// XDG STATE: regenerable snapshot/telemetry state, not Claude Code config.
// Writer path — no legacy fallback (proxy/xdg-dirs.mjs states why).
function stateDir() {
  return process.env.CACHE_FIX_SNAPSHOT_DIR || xdgStatePath("snapshots");
}

function statePath(key) {
  return join(stateDir(), `${key}${STATE_SUFFIX}`);
}

// conversationKey -> { blocks: Map<blockType, block>, saved: string|null }.
// Insertion order is LRU (same idiom as jsonl-session-mirror's session cap):
// re-inserted on access, oldest evicted past the cap. `saved` is the last
// payload written to disk, so the write happens on CHANGE rather than on every
// request of every relocating conversation.
const _relocatedByConversation = new Map();

// Test seam. Live traffic never needs it; the module-state tests do.
export function _resetRelocationMemory() {
  _relocatedByConversation.clear();
}

// Deterministic by construction — ORDER, not Map insertion order — so that
// comparing two payloads answers "did the memory change", never "did the
// blocks arrive in a different sequence".
function serializeMemory(blocks) {
  const out = {};
  for (const t of ORDER) if (blocks.has(t)) out[t] = blocks.get(t);
  return JSON.stringify({ version: STATE_VERSION, blocks: out });
}

// Fail-open in every branch: a state file that is missing, truncated, from a
// future version, or hand-edited yields NO memory, never a broken request.
// What that costs is the divergence the memory would have absorbed — a cache
// cost. What the alternative costs is the conversation.
//
// Each block is re-classified through `getBlockType` rather than trusted from
// the key it was filed under: the type is a property of the TEXT (the
// definition), and a file whose "skills" slot holds something else is a file
// this extension never wrote.
async function readMemory(key) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(statePath(key), "utf-8"));
  } catch (err) {
    if (err && err.code !== "ENOENT") debug(`state read failed: ${err?.message ?? err}`);
    return null;
  }
  if (parsed?.version !== STATE_VERSION || !parsed.blocks || typeof parsed.blocks !== "object") return null;
  const blocks = new Map();
  for (const t of ORDER) {
    const block = parsed.blocks[t];
    if (!block || typeof block.text !== "string") continue;
    if (getBlockType(block.text) !== t) continue;
    blocks.set(t, block);
  }
  return blocks.size ? blocks : null;
}

async function writeMemory(key, blocks) {
  try {
    await mkdir(stateDir(), { recursive: true });
    const finalPath = statePath(key);
    const tmpPath = `${finalPath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
    // tmp+rename: the tmp file is created fresh every time, so it is born 0600
    // and the rename carries that mode onto the final path — which is also how
    // a pre-existing loose mode gets repaired without a chmod call.
    await writeFileOwnerOnly(tmpPath, serializeMemory(blocks));
    await rename(tmpPath, finalPath);
  } catch (err) {
    debug(`state write failed: ${err?.message ?? err}`);
  }
}

// Disk is bounded the same way memory is, and by the same number — otherwise a
// long-lived proxy accumulates one file per conversation forever (the shared
// snapshots dir already holds ~9,800 files from five other writers, with
// nothing pruning it; that is a separate, pre-existing item).
//
// ONLY files carrying this extension's own suffix are ever removed. Another
// writer's state in the same directory is not this extension's to delete —
// insertion-normalization's canonical is load-bearing for ITS correctness.
let _writesSincePrune = 0;
const PRUNE_EVERY = 64;

async function pruneState() {
  try {
    const dir = stateDir();
    const names = (await readdir(dir)).filter((n) => n.endsWith(STATE_SUFFIX));
    const cap = maxConversations();
    if (names.length <= cap) return;
    const timed = await Promise.all(
      names.map(async (n) => {
        try {
          return { n, mtimeMs: (await stat(join(dir, n))).mtimeMs };
        } catch {
          return null;
        }
      }),
    );
    const live = timed.filter(Boolean).sort((a, b) => b.mtimeMs - a.mtimeMs);
    for (const { n } of live.slice(cap)) {
      try {
        await unlink(join(dir, n));
      } catch (err) {
        debug(`state prune failed for ${n}: ${err?.message ?? err}`);
      }
    }
  } catch (err) {
    debug(`state prune failed: ${err?.message ?? err}`);
  }
}

// The memory for one conversation, from RAM or — once a process, per key —
// from disk. Returns null when this conversation has nothing remembered, and
// deliberately allocates nothing in that case: an LRU slot spent on a
// conversation that never relocates is a slot taken from one that did.
async function recallMemory(key) {
  const hit = _relocatedByConversation.get(key);
  if (hit) {
    _relocatedByConversation.delete(key);
    _relocatedByConversation.set(key, hit);
    return hit;
  }
  const blocks = await readMemory(key);
  if (!blocks) return null;
  return trackMemory(key, { blocks, saved: serializeMemory(blocks) });
}

function trackMemory(key, entry) {
  _relocatedByConversation.set(key, entry);
  while (_relocatedByConversation.size > maxConversations()) {
    const oldest = _relocatedByConversation.keys().next().value;
    if (oldest === undefined) break;
    _relocatedByConversation.delete(oldest);
  }
  return entry;
}

// Called after the memory has been folded with this request's findings. Writes
// only when the payload actually changed, so a conversation that keeps sending
// the same block costs no I/O at all.
async function persistMemory(key, entry) {
  const payload = serializeMemory(entry.blocks);
  if (payload === entry.saved) return;
  entry.saved = payload;
  await writeMemory(key, entry.blocks);
  if (++_writesSincePrune >= PRUNE_EVERY) {
    _writesSincePrune = 0;
    await pruneState();
  }
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

    // The memory is READ before the branch and only CREATED on the relocate
    // path: a conversation that has never had anything relocated must keep
    // taking the in-place path, or its first request under this mechanism
    // would hoist an in-place block to the front of messages[0] and flip
    // index 0 for no reason.
    const convKey = resolveInsertionSessionKey(ctx.headers, body.messages, body.system);

    // D1 CARRIER (threat-matrix row 26). Published HERE, on the line that
    // already computes this identity, because this extension is the only reason
    // the identity ever rotates: it files its own memory under the PRE-relocation
    // identity (that asymmetry is row 26's signature), while every downstream
    // stateful extension recomputes the same function over the array this
    // extension is about to mutate. Publishing the pre-mutation value lets them
    // key on the same bucket this extension already uses.
    //
    // Placed immediately after the computation and BEFORE every branch below on
    // purpose: the relocate path is not the only exit, and a carrier set on some
    // paths only would give consumers a key that appears and disappears within
    // one conversation — worse than no carrier at all.
    //
    // Coupling to this extension being ENABLED is correct rather than a
    // limitation: with no relocation there is no rotation, so a consumer that
    // finds no carrier and computes locally gets the identical value.
    ctx.meta = ctx.meta || {};
    ctx.meta[PRE_PIPELINE_CONV] = conversationSubKey(body.messages);

    const remembered = await recallMemory(convKey);

    if (!hasScatteredBlocks && !remembered) {
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
          // Stated, not omitted: every record this extension emits carries the
          // same three lists, so a consumer reads `reserved.length` rather than
          // discovering that one branch leaves the field undefined.
          reserved: [],
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

    if (found.size === 0 && !remembered) return;

    // Fold this request's findings into the conversation's memory. CC's bytes
    // always win where CC sent any — the memory covers ABSENCE, never
    // staleness. Stored as a COPY, and emitted as a copy below: the block
    // objects go onto the wire, where later extensions (cache-control-normalize
    // among them) mutate them in place, and a shared reference would let that
    // rewrite the memory.
    const entry = remembered ?? trackMemory(convKey, { blocks: new Map(), saved: null });
    const memory = entry.blocks;
    for (const [blockType, block] of found) memory.set(blockType, { ...block });

    // Remove all relocatable blocks from all user messages
    for (let i = 0; i < body.messages.length; i++) {
      const msg = body.messages[i];
      if (msg.role !== "user" || !Array.isArray(msg.content)) continue;
      const filtered = msg.content.filter((b) => !isRelocatableBlock(b.text || ""));
      if (filtered.length !== msg.content.length) {
        body.messages[i] = { ...msg, content: filtered };
      }
    }

    // Prepend in deterministic order: deferred → mcp → skills → hooks.
    // The emitted set is the MEMORY, not this request's findings: that is the
    // whole fix — the forwarded prefix is a function of the conversation, not
    // of which blocks CC happened to include this time.
    const relocatedTypes = ORDER.filter((t) => found.has(t));
    const emittedTypes = ORDER.filter((t) => memory.has(t));
    const toRelocate = emittedTypes.map((t) => ({ ...memory.get(t) }));

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
    //
    // `reserved` is its own field, never folded into `relocated`: a re-serve
    // relocates nothing, and `relocated[].firstAppearance` is what buys a
    // stability exemption — reporting one here would excuse a divergence
    // nobody relocated. The conservation gate reads `reserved` for the
    // opposite reason: a re-served block CC did not send in THIS request is a
    // byte on the wire with no R-side counterpart, and the gate must be able
    // to tell a declared re-serve from an invented one.
    ctx.meta = ctx.meta || {};
    ctx.meta.freshSessionSortStats = {
      relocated: relocatedTypes.map((t) => ({ type: t, firstAppearance: occurrences.get(t) === 1 })),
      reserved: emittedTypes.filter((t) => !found.has(t)),
      rewrote: relocatedTypes,
      targetIndex: firstUserIdx,
      // The BLOCKS, not just their types, because a downstream consumer that
      // must not destroy them cannot identify them from a type list.
      // insertion-normalization's volatile pin is that consumer: it serves
      // `messages[targetIndex]`'s stored FIRST-SEEN form, which predates
      // whatever was prepended here, and before 2026-08-11 that silently
      // deleted these bytes off the wire entirely (threat-matrix row 30).
      // Published as a DECLARATION so the pin carries them over by our own
      // report rather than by re-deriving "this looks relocated" — the same
      // discipline the conservation gate's clauses already use, and the
      // reason this is a stats field instead of an exported predicate: this
      // module already imports from insertion-normalization, so an import the
      // other way would close a cycle.
      //
      // Copies, for the reason the memory above is copied: these objects go
      // onto the wire and later extensions mutate them in place.
      relocatedBlocks: toRelocate.map((b) => ({ ...b })),
    };

    // Last, and after the body is already correct: the persist is what makes
    // the next PROCESS behave like this one, and it must never be able to
    // change what this request forwards.
    await persistMemory(convKey, entry);
  },
};
