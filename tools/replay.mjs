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
// (insertion-normalization action, breakpoint injections, ladder
// placements).
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

import { readFile, mkdtemp, rm } from "node:fs/promises";
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
function conversationId(msgs) {
  if (!msgs.length) return null;
  return sha(JSON.stringify(msgs[0]));
}

// The check itself. Entries are grouped by (capture key, conversation) and
// compared pairwise in arrival order WITHIN each group. A violation is an
// output divergence strictly earlier than the input's.
export function findStabilityViolations(entries) {
  const groups = new Map();
  for (const e of entries) {
    const cid = conversationId(e.inMsgs);
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

    const inDiv = firstDivergence(prev.inMsgs, cur.inMsgs);
    const outDiv = firstDivergence(prev.outMsgs, cur.outMsgs);
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
export function findSafetyViolations(entries) {
  const out = [];
  for (const e of entries) {
    const inM = e.inMsgs;
    const outM = e.outMsgs;
    if (outM.length !== inM.length) {
      out.push({ n: e.n, ts: e.ts, kind: "length", detail: `${inM.length} -> ${outM.length}` });
      continue;
    }
    let roleBad = -1;
    for (let i = 0; i < inM.length; i++) {
      if (inM[i]?.role !== outM[i]?.role) {
        roleBad = i;
        break;
      }
    }
    if (roleBad >= 0) {
      out.push({
        n: e.n,
        ts: e.ts,
        kind: "role",
        detail: `idx ${roleBad}: ${inM[roleBad]?.role} -> ${outM[roleBad]?.role}`,
      });
      continue;
    }
    const adj = firstAdjacencyBreak(outM);
    if (adj >= 0) {
      out.push({ n: e.n, ts: e.ts, kind: "tool-adjacency", detail: `idx ${adj}` });
    }
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
  for (const e of entries) {
    const cid = conversationId(e.inMsgs);
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

export function censusPair(a, b) {
  const ia = a.map(semanticId);
  const ib = b.map(semanticId);
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

export function runCensus(entries) {
  const groups = new Map();
  for (const e of entries) {
    const cid = conversationId(e.inMsgs);
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
      const kind = censusPair(group[i - 1].inMsgs, group[i].inMsgs);
      pairs++;
      tally.set(kind, (tally.get(kind) ?? 0) + 1);
      if (!examples.has(kind)) examples.set(kind, { n: group[i].n, prevN: group[i - 1].n, ts: group[i].ts });
    }
  }
  return { pairs, conversations: groups.size, tally, examples };
}

function parseArgs(argv) {
  const args = { file: null, env: {}, json: false, census: false, restartAt: null, wipeStateAt: null };
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
      "usage: node tools/replay.mjs <captures.jsonl> [--env FLAG=1 ...] [--census] [--restart-at N] [--wipe-state-at N] [--json]\n",
    );
    process.exit(2);
  }
  return args;
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

  const lines = (await readFile(args.file, "utf-8")).split("\n").filter((l) => l.trim());
  const report = [];
  const stability = [];

  for (let n = 0; n < lines.length; n++) {
    let rec;
    try {
      rec = JSON.parse(lines[n]);
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
    // state: insertion-normalization (saveCanonical), the ladder, and
    // deferred-tool-rewrite all write their state to
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
      breakpoint: ctx.meta.messagesBreakpointStats ?? null,
      ladder: ctx.meta.ladderStats ?? null,
      outHash: prevHash,
    });
    // Both sides of the stability check: what CC sent, and what we
    // forwarded. `rec.body` was cloned before the pipeline ran, so it
    // still holds the captured bytes.
    stability.push({
      n,
      ts: rec.ts,
      key: rec.key,
      inMsgs: Array.isArray(rec.body?.messages) ? rec.body.messages : [],
      outMsgs: Array.isArray(ctx.body?.messages) ? ctx.body.messages : [],
      action: ctx.meta.insertionNormalizeStats?.action ?? null,
      resetReason: ctx.meta.insertionNormalizeStats?.resetReason ?? null,
    });
  }

  const safety = findSafetyViolations(stability);
  const sequence = findSequenceViolations(stability);
  const census = args.census ? runCensus(stability) : null;

  // Attribute each violation by replaying the corpus once per extension
  // and asking which stage FIRST pulls the divergence below the bar.
  //
  // Naive attribution (re-run just the offending pair) does not work for
  // stateful extensions: insertion-normalization, deferred-tool-rewrite and
  // the ladder all carry per-session canonical state built by every request
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
      for (let n = 0; n < lines.length; n++) {
        let rec;
        try {
          rec = JSON.parse(lines[n]);
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
    process.stdout.write(JSON.stringify({ report, violations }, null, 2) + "\n");
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
        `  n=${v.n} ts=${v.ts} inDiv=${v.inDiv ?? "append-only"} outDiv=${v.outDiv} <- ${who}\n`,
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
  }

  await rm(scratch, { recursive: true, force: true });
  // Exit non-zero on any violation so this is a gate, not just a report.
  // Safety first in the message ordering because a corrupted conversation is
  // a worse outcome than an expensive one: cache costs money, a mangled
  // history costs correctness.
  if (safety.length) {
    process.stderr.write(`\nFAIL: ${safety.length} safety violation(s) — the pipeline altered the conversation\n`);
  }
  if (violations.length || safety.length || sequence.length) process.exitCode = 1;
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
