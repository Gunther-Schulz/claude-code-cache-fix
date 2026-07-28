#!/usr/bin/env node
// replay — run captured request bodies through the extension pipeline
// offline. Directive: docs/directives/proxy-request-capture-replay.md
// (stage 2).
//
// Usage:
//   node tools/replay.mjs <captures.jsonl> [--env FLAG=1 ...] [--json]
//
// Loads the extension pipeline exactly as server.mjs does (same loader,
// same extensions.json ordering), sets the given env flags, and feeds
// each captured body through runOnRequest in file order. State-writing
// extensions are pointed at a scratch CLAUDE_CONFIG_DIR so the live
// ~/.claude/cache-fix-snapshots is never touched.
//
// Per request it reports which extensions changed the body (measured by
// hashing the body between every pipeline stage — not by trusting
// telemetry) and the summary telemetry the pipeline itself emitted
// (insertion-normalization action and reset reason).
//
// Acceptance gate for a pipeline change (directive): replay the same
// corpus with the flag OFF and ON; the reports must differ only in the
// intended mutations.
//
// --- Cross-request byte stability (the self-inflicted-bust check) ---
//
// The per-request mutation report above answers "which extension changed
// THIS body". It cannot answer "did we forward the SAME bytes for the
// same message we already forwarded once" — and that second question is
// the one a cache bills. Three validators existed before this one and
// all three miss it: replay (post-pipeline, within ONE request),
// cache-sim (across requests, but PRE-pipeline — it never loads the
// pipeline at all), and output-guard (single-request invariants only).
// The empty cell is cross-request x post-pipeline.
//
// A bug that lived in exactly that cell shipped and billed real tokens:
// thinking-block-sanitize drops CC's omitted-thinking blocks from PRIOR
// assistant turns but preserves them on the LATEST turn when it is an
// active tool-continuation. So one byte-identical message is forwarded
// one way while it is the tail, another way once a turn lands after it
// — a mid-history mutation WE cause, every time such a turn ages out.
// Measured 2026-07-28 (session 58c979ce, 119k cc): CC's raw bytes at
// index 171 were identical across the pair; our output diverged there.
//
// The invariant, assumption-free (it needs no semantic identity of our
// own devising, which is what made the earlier probes unreliable):
//
//     if CC's own bytes for the message sequence first diverge at index
//     R, our forwarded bytes must not diverge before R.
//
// An output divergence EARLIER than the input divergence is ours by
// construction, and it is exactly what costs cache: the API keys on the
// longest byte-identical prefix, so moving the divergence point earlier
// re-writes everything from there. Attribution re-runs the pair one
// extension at a time and names the first stage that pulls the output
// divergence below R.
//
// Pairs are compared only within one key AND one conversation (same
// first message); co-tenant sidecar traffic sharing a session-id header
// is skipped rather than reported as churn (runbook's known artifact).

import { mkdtemp, rm } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_DIR = join(__dirname, "..", "proxy", "extensions");
const EXT_CONFIG = join(__dirname, "..", "proxy", "extensions.json");

function sha(s) {
  return createHash("sha256").update(s).digest("hex").slice(0, 12);
}

// First index at which two message arrays differ byte-wise, or null when
// one is a pure prefix of the other (the append-only case: nothing that
// was already sent changed).
export function firstDivergence(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return i;
  }
  return null;
}

// Conversation identity. Co-tenant traffic (subagents, title-generation)
// shares the session-id header and therefore the capture key, but starts
// from a different first message. Comparing across those is the
// prefix-diff "sidecar churn" artifact, not a finding.
//
// Grouping on this — rather than only comparing ADJACENT capture lines —
// is load-bearing: live traffic interleaves tenants (main, subagent,
// sidecar), so two consecutive requests of the SAME conversation are
// usually several lines apart. An adjacent-only scan silently skips those
// pairs, which is exactly where the cache is won or lost. Measured while
// building this: adjacent-only found 0 violations on a full 602-request
// capture while a 40-request main-thread-only slice of the same session
// found 2 — the difference was entirely the interleaving, not the bytes.
// The identity itself is `conversationOf` below — the first message's byte
// hash, read off the compact entry rather than recomputed from the message.

// The check itself. Entries are grouped by (capture key, conversation) and
// compared pairwise in arrival order WITHIN each group. A violation is an
// output divergence strictly earlier than the input's.
export function findStabilityViolations(entries) {
  const groups = new Map();
  for (const raw of entries) {
    const e = asCompact(raw);
    const cid = conversationOf(e);
    if (cid === null) continue;
    const g = `${e.key}|${cid}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(e);
  }
  const violations = [];
  for (const group of groups.values()) {
    violations.push(...scanGroup(group));
  }
  return violations.sort((a, b) => a.n - b.n);
}

function scanGroup(entries) {
  const violations = [];
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1];
    const cur = entries[i];

    // Per-message byte hashes, not the messages: firstDivergence compares
    // JSON.stringify of each element, and stringifying a hash of the bytes
    // yields the same first-difference index as stringifying the bytes.
    const inDiv = firstDivergence(prev.inHash, cur.inHash);
    const outDiv = firstDivergence(prev.outHash, cur.outHash);
    // Input append-only (inDiv === null) sets the bar at "output must be
    // append-only too": ANY output divergence is then self-inflicted.
    const bar = inDiv === null ? Infinity : inDiv;
    if (outDiv !== null && outDiv < bar) {
      violations.push({ n: cur.n, prevN: prev.n, ts: cur.ts, key: cur.key, inDiv, outDiv });
    }
  }
  return violations;
}

// --- Safety invariants (always on) ---
//
// The stability check answers "did we cost cache". These answer "did we
// corrupt the conversation" — a different and strictly worse failure. The
// proxy's licence is to change BYTES, never the message sequence the model
// sees: same count, same roles, same order, tool_results still answering the
// tool_use immediately before them.
//
// This existed only as a throwaway probe during the 2026-07-28 session: every
// fix that day was verified by an ad-hoc script checking roles and length
// across 771 requests, and nothing in the tool itself would have caught a
// silent corruption. output-guard enforces comparable invariants on the LIVE
// path; replay — where the experimenting actually happens — enforced none.
// A message the proxy DECLARES it injected. deferred-tool-rewrite announces a
// newly-loaded tool with a {"role":"system"} message carrying a tool_addition
// block — the documented mid-conversation-tool-changes contract, and the whole
// point of holding tools[] stable. Counting that as corruption made the gate
// report 243 violations on a corpus where nothing was corrupted; a check that
// forbids a designed behaviour trains its reader to ignore it.
//
// Narrow on purpose: ONLY a system message whose content is entirely
// tool_addition blocks. Anything else appearing in messages[] is still a
// violation.
function isDeclaredInjection(msg) {
  if (!msg || msg.role !== "system" || !Array.isArray(msg.content) || !msg.content.length) return false;
  return msg.content.every((b) => b && b.type === "tool_addition");
}

// Per-entry, so it is evaluated as each request is replayed and nothing is
// retained. Exported on its own because the streaming caller wants one
// verdict at a time and findSafetyViolations wants the whole list — one
// implementation, two shapes, rather than a tested one and a shipped one.
export function safetyViolation(e) {
  const inM = e.inMsgs;
  // Declared injections are removed before comparing, so the check still
  // sees a strict count/role/order correspondence with what CC sent.
  const outM = e.outMsgs.filter((m) => !isDeclaredInjection(m));
  if (outM.length !== inM.length) {
    return { n: e.n, ts: e.ts, kind: "length", detail: `${inM.length} -> ${outM.length}` };
  }
  for (let i = 0; i < inM.length; i++) {
    if (inM[i]?.role !== outM[i]?.role) {
      return {
        n: e.n,
        ts: e.ts,
        kind: "role",
        detail: `idx ${i}: ${inM[i]?.role} -> ${outM[i]?.role}`,
      };
    }
  }
  const adj = firstAdjacencyBreak(outM);
  if (adj >= 0) return { n: e.n, ts: e.ts, kind: "tool-adjacency", detail: `idx ${adj}` };
  return null;
}

export function findSafetyViolations(entries) {
  const out = [];
  for (const e of entries) {
    const v = safetyViolation(e);
    if (v) out.push(v);
  }
  return out;
}

// A user message carrying tool_result blocks must be immediately preceded by
// the assistant message whose tool_use ids it answers. Mirrors the live
// extension's own invariant so replay fails the same way the proxy would.
function firstAdjacencyBreak(messages) {
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || msg.role !== "user" || !Array.isArray(msg.content)) continue;
    const ids = msg.content
      .filter((b) => b && b.type === "tool_result" && typeof b.tool_use_id === "string")
      .map((b) => b.tool_use_id);
    if (!ids.length) continue;
    const prev = messages[i - 1];
    if (!prev || prev.role !== "assistant" || !Array.isArray(prev.content)) return i;
    const have = new Set(
      prev.content.filter((b) => b && b.type === "tool_use" && typeof b.id === "string").map((b) => b.id),
    );
    for (const id of ids) if (!have.has(id)) return i;
  }
  return -1;
}

// --- Sequence invariants (always on) ---
//
// Pairwise checks miss the class that costs the most: a mitigation that
// "works" on the request where it fires and then bleeds on every request
// after. Measured 2026-07-28 — phase-2 insertion-normalization converts a
// mid-history splice into a tail append, which saves the prefix on THAT
// request and then resets forever after, because CC keeps sending the entry
// in its original position. Two requests looked like a win; three showed the
// truth.
//
// The invariant: once a conversation has been normalized, later requests must
// settle into append-only. A normalization followed by a RESET in the same
// conversation means our reconstruction and CC's serialization disagree, and
// that disagreement recurs for the life of the session.
export function findSequenceViolations(entries) {
  const groups = new Map();
  for (const raw of entries) {
    const e = asCompact(raw);
    const cid = conversationOf(e);
    if (cid === null) continue;
    const g = `${e.key}|${cid}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(e);
  }
  const out = [];
  for (const group of groups.values()) {
    let normalizedAt = null;
    for (const e of group) {
      const act = e.action;
      if (act === "normalized") normalizedAt = e.n;
      else if (act === "reset" && normalizedAt !== null && e.resetReason !== "no-prior-canonical") {
        out.push({ n: e.n, ts: e.ts, normalizedAt, reason: e.resetReason });
        normalizedAt = null; // report once per normalize/reset cycle
      }
    }
  }
  return out;
}

// --- Census ---
//
// Classify what CC actually does to the message array between consecutive
// requests of one conversation, under SEMANTIC identity (decoration removed:
// volatile system-reminder blocks, cache_control, and the single-text-block
// <-> string shape flip). Everything that is not `append-only` is either a
// known threat-matrix row or an undiscovered class.
//
// This is the discovery instrument, and it earned its place: run over two
// real captures on 2026-07-28 it showed 94.5% of traffic is append-only once
// decoration is ignored — which shrank a planned "total reconciliation"
// rewrite down to one ordering fix — and it revealed that the shape-flip
// class lands predominantly on SYSTEM messages, catching a fix that had been
// written user-role-only and therefore fixed none of the real cases.
const VOLATILE_WRAP = /^<system-reminder>\n[\s\S]*\n<\/system-reminder>\s*$/;

function isVolatileTextBlock(b) {
  return (
    b &&
    typeof b === "object" &&
    b.type === "text" &&
    typeof b.text === "string" &&
    (b.text === "" || VOLATILE_WRAP.test(b.text))
  );
}

// Model-visible content, decoration stripped. Single-text-block arrays and
// bare strings collapse to one form so a re-serialization is not mistaken for
// a different message.
export function semanticCore(msg) {
  const c = msg?.content;
  if (typeof c === "string") return [{ type: "text", text: c }];
  if (!Array.isArray(c)) return [];
  const kept = [];
  for (const b of c) {
    if (isVolatileTextBlock(b)) continue;
    if (b && typeof b === "object") {
      const { cache_control, ...rest } = b;
      kept.push(rest);
    } else kept.push(b);
  }
  if (kept.length === 1 && kept[0]?.type === "text") return [{ type: "text", text: kept[0].text }];
  return kept;
}

const semanticId = (m) => `${m?.role ?? "?"}:${sha(JSON.stringify(semanticCore(m)))}`;

// --- Compact retention ---
//
// Streaming the READ was only half the problem. Every entry used to retain
// its full inMsgs and outMsgs, and since each request re-sends the whole
// history, that is the entire capture resident as objects: measured 3.2 GB
// peak on a 955 MB capture, which is within sight of V8's default old-space
// ceiling. The read no longer throws, but the wall had only moved.
//
// harvest.mjs already learned this and says so in its own comment ("retaining
// every parsed record turned a 555 MB capture into a 2.1 GB memory peak").
// The lesson did not travel to its sibling — the tools were fixed one at a
// time, by whichever one happened to fall over.
//
// Nothing downstream actually wants the messages. Stability compares BYTES
// (a per-message hash decides every divergence index identically), census
// compares SEMANTIC IDS, trace reads only telemetry, and safety is per-entry
// so it never needed retention at all. So each entry keeps three string
// arrays instead of two message arrays.
//
// The checkers still accept full-message entries: the gate self-check builds
// them that way, and those tests are the safety net this refactor rests on.
// `asCompact` converts on the fly when it sees one, so both callers share one
// code path rather than one being tested and the other shipped.
// tools[] renders BEFORE system and messages, so a change to it invalidates
// the whole prefix and no breakpoint can survive one. Three fingerprints,
// because the distinction between them IS threat-matrix row 6's question: a
// pure ADDITION (membership grows, existing order preserved) is what
// Anthropic's docs say should not disturb the cache, while a REORDER of
// entries already present is a different event the docs do not cover.
export function toolsFingerprints(tools) {
  if (!Array.isArray(tools)) return { sig: null, order: null, set: null, count: null };
  const names = tools.map((t) => t?.name ?? "?");
  return {
    sig: sha(JSON.stringify(tools)), // full schemas — catches a description edit
    order: sha(JSON.stringify(names)), // names in wire order
    set: sha(JSON.stringify([...names].sort())), // membership, order-blind
    count: tools.length,
  };
}

export function compactEntry(e) {
  const inMsgs = e.inMsgs ?? [];
  const outMsgs = e.outMsgs ?? [];
  return {
    n: e.n,
    ts: e.ts,
    key: e.key,
    inHash: inMsgs.map((m) => sha(JSON.stringify(m))),
    outHash: outMsgs.map((m) => sha(JSON.stringify(m))),
    inSem: inMsgs.map(semanticId),
    msgs: inMsgs.length,
    inTools: toolsFingerprints(e.inTools),
    outTools: toolsFingerprints(e.outTools),
    action: e.action ?? null,
    resetReason: e.resetReason ?? null,
    stats: e.stats ?? null,
  };
}

// Threat-matrix row 6, asked of the corpus directly.
//
// The 175k event that opened the row carried TWO independent causes in one
// request — a tools reorder AND messages@165(user) — so it never established
// which invalidated the prefix. The row states what would settle it: a
// tools-only delta, i.e. tools changed while the message history did not.
//
// For every consecutive same-conversation pair this classifies the tools delta
// (none / addition-only / reorder / schema-edit / removal) against the message
// delta, and reports the pairs where tools moved and messages did not. It also
// records what WE forwarded, which is the other half — deferred-tool-rewrite
// exists to hold tools[] byte-stable across exactly these events, so an
// incoming change with an unchanged outgoing signature is the mitigation
// working, not a miss.
export function findToolsDeltas(entries) {
  const groups = new Map();
  for (const raw of entries) {
    const e = asCompact(raw);
    const cid = conversationOf(e);
    if (cid === null) continue;
    const g = `${e.key}|${cid}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(e);
  }
  const rows = [];
  for (const group of groups.values()) {
    for (let i = 1; i < group.length; i++) {
      const p = group[i - 1];
      const c = group[i];
      if (p.inTools.sig === null || c.inTools.sig === null) continue;
      if (p.inTools.sig === c.inTools.sig) continue;
      // What KIND of tools change: membership vs order vs schema text.
      let kind;
      if (p.inTools.set !== c.inTools.set) {
        kind = c.inTools.count > p.inTools.count ? "membership+" : "membership-";
      } else if (p.inTools.order !== c.inTools.order) {
        kind = "reorder";
      } else {
        kind = "schema-edit";
      }
      const msgKind = censusIds(p.inSem, c.inSem);
      rows.push({
        n: c.n,
        prevN: p.n,
        ts: c.ts,
        kind,
        msgKind,
        // The isolating case row 6 asks for: tools moved, history did not.
        toolsOnly: msgKind === "identical" || msgKind === "append-only",
        forwardedStable: p.outTools.sig !== null && p.outTools.sig === c.outTools.sig,
        count: `${p.inTools.count}->${c.inTools.count}`,
        outCount: `${p.outTools.count}->${c.outTools.count}`,
      });
    }
  }
  return rows.sort((a, b) => a.n - b.n);
}

const asCompact = (e) => (e.inHash ? e : compactEntry(e));

// Conversation identity from the compact form: the first message's byte hash
// is exactly what conversationId hashed before.
const conversationOf = (e) => (e.inHash.length ? e.inHash[0] : null);

export function censusPair(a, b) {
  return censusIds(a.map(semanticId), b.map(semanticId));
}

// The classification itself, on semantic ids — what the compact entries carry.
export function censusIds(ia, ib) {
  let p = 0;
  while (p < Math.min(ia.length, ib.length) && ia[p] === ib[p]) p++;
  if (p === ia.length) return p === ib.length ? "identical" : "append-only";
  const setA = new Set(ia);
  const setB = new Set(ib);
  const missing = ia.filter((h) => !setB.has(h)).length;
  const added = ib.filter((h) => !setA.has(h)).length;
  if (missing === 0 && added === 0) return "reorder-only";
  if (missing === 0 && added > 0) {
    // Every prior entry survives and new ones appeared. Whether that is a
    // mid-history SPLICE or a plain append hinges on where the new entries
    // sit relative to the last surviving one — not on the divergence point
    // `p`, which only says where the arrays stop agreeing positionally.
    // (Comparing `p` against ia.length - 1 misfiled a splice one slot before
    // the tail as an append; caught by the gate self-check.)
    const lastKeptIn = ib.reduce((acc, h, j) => (setA.has(h) ? j : acc), -1);
    const splicedAfterKept = ib.some((h, j) => !setA.has(h) && j < lastKeptIn);
    return splicedAfterKept ? "splice/insert-mid" : "append-after-change";
  }
  if (missing > 0 && added === 0) return "drop-only";
  return "replace/edit";
}

// --- State trace ---
//
// The verdict-level report (action, resetReason) says WHAT happened; this says
// what the extension BELIEVED at the time. That distinction found the
// append-vs-position defect: every downstream signal looked explicable, and
// the giveaway was a canonical grown to 92 entries for an 84-message history —
// state drifting from the wire, one entry per mid-history splice.
//
// Rendered per conversation in arrival order, because a state model is only
// legible as a sequence. Pairwise views cannot show accumulation, and the
// bug that motivated this was invisible in every pairwise view we had.
export function buildTrace(entries) {
  const groups = new Map();
  for (const raw of entries) {
    const e = asCompact(raw);
    const cid = conversationOf(e);
    if (cid === null) continue;
    const g = `${e.key}|${cid}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(e);
  }
  const out = [];
  for (const [g, group] of groups) {
    // One-request conversations have no state history worth showing.
    if (group.length < 2) continue;
    const rows = group.map((e) => {
      const st = e.stats ?? {};
      // Canonical live-entry count should track the message count. A widening
      // gap is the drift signal — flagged rather than left for the reader to
      // notice.
      const drift = st.canonLive != null && st.msgs != null ? st.canonLive - st.msgs : null;
      return {
        n: e.n,
        ts: e.ts,
        msgs: st.msgs ?? e.msgs,
        action: st.action ?? null,
        resetReason: st.resetReason ?? null,
        canonSize: st.canonSize ?? null,
        canonLive: st.canonLive ?? null,
        drift,
        inserted: st.inserted ?? 0,
        pinned: st.pinned ?? 0,
        dropped: st.dropped ?? 0,
      };
    });
    out.push({ group: g, rows });
  }
  return out;
}

export function runCensus(entries) {
  const groups = new Map();
  for (const raw of entries) {
    const e = asCompact(raw);
    const cid = conversationOf(e);
    if (cid === null) continue;
    const g = `${e.key}|${cid}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(e);
  }
  const tally = new Map();
  const examples = new Map();
  let pairs = 0;
  for (const group of groups.values()) {
    for (let i = 1; i < group.length; i++) {
      const kind = censusIds(group[i - 1].inSem, group[i].inSem);
      pairs++;
      tally.set(kind, (tally.get(kind) ?? 0) + 1);
      if (!examples.has(kind)) examples.set(kind, { n: group[i].n, prevN: group[i - 1].n, ts: group[i].ts });
    }
  }
  return { pairs, conversations: groups.size, tally, examples };
}

function parseArgs(argv) {
  const args = { file: null, env: {}, json: false, census: false, restartAt: null, wipeStateAt: null, trace: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--env") {
      const kv = argv[++i] ?? "";
      const eq = kv.indexOf("=");
      if (eq < 1) {
        process.stderr.write(`bad --env value: ${kv} (want FLAG=value)\n`);
        process.exit(2);
      }
      args.env[kv.slice(0, eq)] = kv.slice(eq + 1);
    } else if (a === "--json") {
      args.json = true;
    } else if (a === "--census") {
      args.census = true;
    } else if (a === "--trace") {
      args.trace = true;
    } else if (a === "--restart-at" || a === "--wipe-state-at") {
      const v = parseInt(argv[++i] ?? "", 10);
      if (!Number.isFinite(v) || v < 1) {
        process.stderr.write(`${a} wants a positive request index\n`);
        process.exit(2);
      }
      if (a === "--restart-at") args.restartAt = v;
      else args.wipeStateAt = v;
    } else if (!args.file) {
      args.file = a;
    } else {
      process.stderr.write(`unexpected argument: ${a}\n`);
      process.exit(2);
    }
  }
  if (!args.file) {
    process.stderr.write(
      "usage: node tools/replay.mjs <captures.jsonl> [--env FLAG=1 ...] [--census] [--trace] [--restart-at N] [--wipe-state-at N] [--json]\n",
    );
    process.exit(2);
  }
  return args;
}

// Captures are read line-by-line, never slurped. One session's capture
// reaches ~1 GB — each request re-sends the whole history, so the file grows
// quadratically — and `readFile(f, "utf-8")` throws `RangeError: Invalid
// string length` once the file passes V8's max string size. That made the
// GATE unrunnable on exactly the largest and most interesting corpus, while
// staying green on every small one. Found 2026-07-28 by pointing it at a
// live 955 MB session capture.
//
// Blank lines are skipped WITHOUT consuming an index, matching the previous
// `.filter()` — `n` must keep the meaning that `--restart-at`,
// `--wipe-state-at` and every violation report already use.
export async function* readCapture(path) {
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  let n = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    yield [n++, line];
  }
}

async function main() {
  const args = parseArgs(process.argv);

  // Scratch state dir BEFORE loading extensions: several read env at
  // module scope is not the idiom here (all gates are read per-call),
  // but claude-home is read per-call too — set it first anyway so no
  // load-order surprise can leak a write to the live ~/.claude.
  const scratch = await mkdtemp(join(tmpdir(), "cache-fix-replay-"));
  process.env.CLAUDE_CONFIG_DIR = scratch;
  for (const [k, v] of Object.entries(args.env)) process.env[k] = v;

  const { loadExtensions, runOnRequest } = await import(
    new URL("../proxy/pipeline.mjs", import.meta.url).href
  );

  let extensions = await loadExtensions(EXT_DIR, EXT_CONFIG);

  const report = [];
  const stability = [];
  const safety = [];

  for await (const [n, line] of readCapture(args.file)) {
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      report.push({ n, error: "unparseable capture line" });
      continue;
    }
    const body = structuredClone(rec.body);
    // The capture record stores the session id under "session-id", but
    // resolveSessionId (cache-telemetry) reads x-session-id /
    // x-claude-code-session-id — reconstruct under a key it actually
    // reads, or every extension keys by content-hash fallback and the
    // replay silently loses session identity.
    const headers = {
      "anthropic-beta": rec.headers?.["anthropic-beta"] ?? undefined,
      "x-session-id": rec.headers?.["session-id"] ?? rec.sid ?? undefined,
    };
    const ctx = { body, headers, meta: { route: "messages" } };

    // Restart transparency probe (threat-matrix row 3). Row 3 asserts a
    // mid-session restart is OUR artifact rather than physics; this makes the
    // claim testable offline instead of by restarting a live proxy and
    // watching the bill.
    //
    // What a restart actually loses matters, and it is NOT the persisted
    // state: insertion-normalization (saveCanonical) and
    // deferred-tool-rewrite write their state to
    // ~/.claude/cache-fix-snapshots and re-read it per request, so a fresh
    // process finds it intact. Only MODULE-SCOPE memory dies — and re-loading
    // the extension modules is exactly what this simulates: fresh module
    // registry, same state directory, same corpus position.
    //
    // `--wipe-state-at` is the pessimistic sibling: state directory gone too,
    // which models losing the snapshots rather than restarting the process.
    // Keeping the two separate matters — conflating them measures a disaster
    // and calls it a restart.
    if (args.restartAt === n || args.wipeStateAt === n) {
      if (args.wipeStateAt === n) await rm(scratch, { recursive: true, force: true });
      // loadExtensions cache-busts its imports per call (pipeline.mjs
      // `_loadCounter`), so re-calling it gives genuinely fresh module scope
      // — the same thing a new process gets.
      extensions = await loadExtensions(EXT_DIR, EXT_CONFIG);
      process.stderr.write(
        `[replay] simulated ${args.wipeStateAt === n ? "state loss" : "proxy restart"} before request ${n}\n`,
      );
    }

    // Measure per-extension mutation by hashing between stages: run the
    // pipeline one extension at a time (same order — loadExtensions
    // already sorted) instead of trusting each extension's telemetry.
    const mutatedBy = [];
    let prevHash = sha(JSON.stringify(ctx.body));
    for (const ext of extensions) {
      if (!ext.onRequest) continue;
      await runOnRequest(ctx, [ext]);
      const h = sha(JSON.stringify(ctx.body));
      if (h !== prevHash) mutatedBy.push(ext.name);
      prevHash = h;
    }

    report.push({
      n,
      ts: rec.ts,
      key: rec.key,
      msgs: Array.isArray(rec.body?.messages) ? rec.body.messages.length : 0,
      mutatedBy,
      insertion: ctx.meta.insertionNormalizeStats ?? null,
      outHash: prevHash,
    });
    // Both sides of the stability check: what CC sent, and what we
    // forwarded. `rec.body` was cloned before the pipeline ran, so it
    // still holds the captured bytes.
    const full = {
      n,
      ts: rec.ts,
      key: rec.key,
      inMsgs: Array.isArray(rec.body?.messages) ? rec.body.messages : [],
      outMsgs: Array.isArray(ctx.body?.messages) ? ctx.body.messages : [],
      // What CC sent vs what we forwarded — deferred-tool-rewrite's whole job
      // is to make the second stable while the first moves (row 6).
      inTools: rec.body?.tools,
      outTools: ctx.body?.tools,
      action: ctx.meta.insertionNormalizeStats?.action ?? null,
      resetReason: ctx.meta.insertionNormalizeStats?.resetReason ?? null,
      stats: ctx.meta.insertionNormalizeStats ?? null,
    };
    // Safety is a per-request question, so answer it now and keep only the
    // verdict; the messages become garbage as soon as this iteration ends.
    const sv = safetyViolation(full);
    if (sv) safety.push(sv);
    // Everything else keeps hashes, not bodies — see compactEntry.
    stability.push(compactEntry(full));
  }

  // Canonical order invariant, reported by the extension itself: reading live
  // canonical entries in canonical order, their wire indices must be strictly
  // increasing. This is the MECHANISM behind the reset classes, checked at the
  // state model rather than inferred from a downstream reset three requests
  // later. A size/drift statistic cannot substitute — a split adds one entry
  // and one message, so counts stay equal while order diverges (bite-tested).
  const orderViolations = stability
    .filter((e) => e.stats?.canonOrderViolation)
    .map((e) => ({ n: e.n, ts: e.ts, ...e.stats.canonOrderViolation }));

  const sequence = findSequenceViolations(stability);
  const census = args.census ? runCensus(stability) : null;
  const toolsDeltas = args.census ? findToolsDeltas(stability) : null;
  const trace = args.trace ? buildTrace(stability) : null;

  // Attribute each violation by replaying the corpus once per extension
  // and asking which stage FIRST pulls the divergence below the bar.
  //
  // Naive attribution (re-run just the offending pair) does not work for
  // stateful extensions: insertion-normalization, deferred-tool-rewrite and
  // both carry per-session canonical state built by every request
  // before this one, so a two-request replay puts them in a different state
  // than the run that produced the violation, and they legitimately behave
  // differently. That yields UNATTRIBUTED on exactly the stateful
  // extensions most worth attributing — measured while building this.
  //
  // Instead: replay the whole corpus with the pipeline truncated after a
  // given stage (cumulative prefix), and compare the same pair's outputs.
  // "Does the violation appear by stage k" is MONOTONE in k — a prefix that
  // produces it keeps producing it as later stages are added — so the first
  // offending stage is found by BISECTION, not a linear scan: ~log2(35) ≈ 6
  // corpus replays instead of up to 35. Measured on the 602-request capture:
  // 58s linear -> ~11s bisected, and the linear form was slow enough to blow
  // a 2-minute command timeout mid-run.
  //
  // Only the replay COUNT is optimised; each replay is still a full-corpus,
  // stateful run, which is what makes the attribution trustworthy.
  const violations = findStabilityViolations(stability);
  if (violations.length) {
    const mutators = extensions.filter((e) => e.onRequest);

    // Replay the corpus through mutators[0..cut) and report, per violation,
    // whether its output divergence has already dropped below the bar.
    const replayThrough = async (cut) => {
      const prefix = mutators.slice(0, cut);
      const scratch2 = await mkdtemp(join(tmpdir(), "cache-fix-attr-"));
      const savedHome = process.env.CLAUDE_CONFIG_DIR;
      process.env.CLAUDE_CONFIG_DIR = scratch2;
      const outs = new Map();
      const needed = new Set(violations.flatMap((v) => [v.prevN, v.n]));
      for await (const [n, line] of readCapture(args.file)) {
        let rec;
        try {
          rec = JSON.parse(line);
        } catch {
          continue;
        }
        const ctx = {
          body: structuredClone(rec.body),
          headers: {
            "anthropic-beta": rec.headers?.["anthropic-beta"] ?? undefined,
            "x-session-id": rec.headers?.["session-id"] ?? rec.sid ?? undefined,
          },
          meta: { route: "messages" },
        };
        await runOnRequest(ctx, prefix);
        // Every request must run (state), but only the pairs under
        // investigation need their bodies retained.
        if (needed.has(n)) outs.set(n, ctx.body.messages ?? []);
      }
      process.env.CLAUDE_CONFIG_DIR = savedHome;
      await rm(scratch2, { recursive: true, force: true });
      const hit = new Map();
      for (const v of violations) {
        const d = firstDivergence(outs.get(v.prevN) ?? [], outs.get(v.n) ?? []);
        const bar = v.inDiv === null ? Infinity : v.inDiv;
        hit.set(v.n, d !== null && d < bar ? d : null);
      }
      return hit;
    };

    // One bisection per violation would re-replay the corpus per violation;
    // instead bisect once over the union and let each violation record the
    // first cut at which it appears. Cache results by cut so repeated
    // probes of the same depth are free.
    const cache = new Map();
    const probe = async (cut) => {
      if (!cache.has(cut)) cache.set(cut, await replayThrough(cut));
      return cache.get(cut);
    };
    for (const v of violations) {
      let lo = 1;
      let hi = mutators.length;
      if ((await probe(hi)).get(v.n) === null) {
        v.attribution = null; // not reproducible through the full pipeline
        continue;
      }
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if ((await probe(mid)).get(v.n) !== null) hi = mid;
        else lo = mid + 1;
      }
      v.attribution = { ext: mutators[lo - 1].name, outDiv: (await probe(lo)).get(v.n) };
    }
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({ report, violations, safety, sequence, orderViolations, census, toolsDeltas, trace }, null, 2) + "\n");
  } else {
    const counts = new Map();
    for (const r of report) {
      for (const name of r.mutatedBy ?? []) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    process.stdout.write(`replayed ${report.length} requests from ${args.file}\n`);
    process.stdout.write(`mutating extensions (requests touched):\n`);
    for (const [name, c] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
      process.stdout.write(`  ${name}: ${c}\n`);
    }
    const resets = report.filter((r) => r.insertion?.action === "reset");
    process.stdout.write(`insertion-normalization resets: ${resets.length}\n`);
    for (const r of resets.slice(0, 20)) {
      process.stdout.write(`  n=${r.n} ts=${r.ts} reason=${r.insertion.resetReason}\n`);
    }
    process.stdout.write(
      `\ncross-request byte-stability violations (self-inflicted busts): ${violations.length}\n`,
    );
    for (const v of violations.slice(0, 20)) {
      const who = v.attribution ? `${v.attribution.ext} (outDiv=${v.attribution.outDiv})` : "UNATTRIBUTED";
      process.stdout.write(
        // prevN is NOT optional detail. Pairs are compared within a
        // CONVERSATION, so the predecessor is usually not the previous capture
        // line — printing only `n` invites the reader to diff n-1 against n,
        // a different pair and often unrelated traffic. Cost exactly that
        // mistake once (2026-07-28): the violating pair was 44->47, the probe
        // compared 46->47, and the two requests it diffed were different
        // subagent conversations that looked like wholesale corruption. The
        // JSON carried prevN the whole time; the human line did not.
        `  n=${v.prevN}->${v.n} ts=${v.ts} inDiv=${v.inDiv ?? "append-only"} outDiv=${v.outDiv} <- ${who}\n`,
      );
    }

    process.stdout.write(`\ncanonical order violations (state model vs wire): ${orderViolations.length}\n`);
    for (const o of orderViolations.slice(0, 20)) {
      process.stdout.write(
        `  n=${o.n} ts=${o.ts} canon#${o.at} sits at wire ${o.wireIdx} after wire ${o.prevWireIdx}\n`,
      );
    }

    process.stdout.write(`\nsafety violations (conversation corrupted): ${safety.length}\n`);
    for (const s of safety.slice(0, 20)) {
      process.stdout.write(`  n=${s.n} ts=${s.ts} ${s.kind}: ${s.detail}\n`);
    }

    process.stdout.write(`\nsequence violations (normalize then reset): ${sequence.length}\n`);
    for (const s of sequence.slice(0, 20)) {
      process.stdout.write(`  n=${s.n} ts=${s.ts} reset(${s.reason}) after normalize at n=${s.normalizedAt}\n`);
    }

    if (trace) {
      for (const { group, rows } of trace) {
        process.stdout.write(`\nstate trace — ${group}  (${rows.length} requests)\n`);
        process.stdout.write(`  ${"n".padStart(5)} ${"msgs".padStart(5)} ${"canon".padStart(6)} ${"live".padStart(5)} ${"drift".padStart(6)}  action\n`);
        for (const r of rows) {
          const flag = r.drift !== null && r.drift !== 0 ? " <<<" : "";
          const act = r.action === "reset" ? `reset/${r.resetReason}` : (r.action ?? "-");
          const extra = r.pinned || r.dropped || r.inserted
            ? `  (ins=${r.inserted} pin=${r.pinned} drop=${r.dropped})`
            : "";
          process.stdout.write(
            `  ${String(r.n).padStart(5)} ${String(r.msgs).padStart(5)} ` +
              `${String(r.canonSize ?? "-").padStart(6)} ${String(r.canonLive ?? "-").padStart(5)} ` +
              `${String(r.drift ?? "-").padStart(6)}  ${act}${extra}${flag}\n`,
          );
        }
      }
    }

    if (census) {
      process.stdout.write(
        `\ncensus: ${census.pairs} same-conversation pairs across ${census.conversations} conversations\n`,
      );
      const total = census.pairs || 1;
      for (const [kind, c] of [...census.tally.entries()].sort((a, b) => b[1] - a[1])) {
        const ex = census.examples.get(kind);
        const pct = ((100 * c) / total).toFixed(1).padStart(5);
        const where = kind === "append-only" || kind === "identical" ? "" : `   e.g. n=${ex.prevN}->${ex.n}`;
        process.stdout.write(`  ${String(c).padStart(5)}  ${pct}%  ${kind}${where}\n`);
      }
    }
    if (toolsDeltas) {
      // Threat-matrix row 6. `tools-only` is the isolating case the row asks
      // for: tools[] moved while the message history did not, so nothing else
      // could have invalidated the prefix.
      const only = toolsDeltas.filter((d) => d.toolsOnly);
      process.stdout.write(`\ntools[] deltas: ${toolsDeltas.length} (${only.length} tools-ONLY)\n`);
      const byKind = new Map();
      for (const d of toolsDeltas) {
        const k = `${d.kind}${d.toolsOnly ? " [tools-only]" : ` +${d.msgKind}`}`;
        byKind.set(k, (byKind.get(k) ?? 0) + 1);
      }
      for (const [k, c] of [...byKind.entries()].sort((a, b) => b[1] - a[1])) {
        process.stdout.write(`  ${String(c).padStart(5)}  ${k}\n`);
      }
      const leaked = toolsDeltas.filter((d) => !d.forwardedStable);
      process.stdout.write(
        `  forwarded tools[] held stable across: ${toolsDeltas.length - leaked.length}/${toolsDeltas.length}\n`,
      );
      for (const d of only.slice(0, 8)) {
        process.stdout.write(
          `    n=${d.prevN}->${d.n} ${d.kind} in=${d.count} out=${d.outCount} msgs=${d.msgKind} forwardedStable=${d.forwardedStable}\n`,
        );
      }
    }
  }

  await rm(scratch, { recursive: true, force: true });
  // Exit non-zero on any violation so this is a gate, not just a report.
  // Safety first in the message ordering because a corrupted conversation is
  // a worse outcome than an expensive one: cache costs money, a mangled
  // history costs correctness.
  if (safety.length) {
    process.stderr.write(`\nFAIL: ${safety.length} safety violation(s) — the pipeline altered the conversation\n`);
  }
  if (violations.length || safety.length || sequence.length || orderViolations.length) process.exitCode = 1;
}

// Run only when invoked as a script. The checkers above are exported and
// unit-tested (test/replay-gate-selfcheck.test.mjs); importing this module
// must not execute a replay.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    process.stderr.write(`replay failed: ${err?.stack ?? err}\n`);
    process.exit(1);
  });
}
