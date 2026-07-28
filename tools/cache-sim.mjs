#!/usr/bin/env node
// cache-sim — model the API's prefix cache over a captured request
// corpus. Directive: docs/directives/proxy-request-capture-replay.md
// (stage 3).
//
// Usage:
//   node tools/cache-sim.mjs <captures.jsonl> [--json]
//
// For each consecutive same-key pair of requests, computes the longest
// byte-identical prefix (params/system/tools gate the whole prefix, then
// messages element-wise) and prices the request against the cache_control
// markers present in the PREVIOUS request: the hit is the highest marker
// whose covered prefix survived; everything past it is re-written at the
// write premium.
//
// Token counts are chars/4 approximations. The tool's job is RELATIVE
// comparison — same corpus, pipeline-variant A vs B — and flagging the
// same events the worktime cold ledger flags (its calibration check),
// not exact token accounting.
//
// --- Price what we SEND, not what CC wrote (--pipeline) ---
//
// Run against raw captures this tool answers a question nobody asked: what
// CC's own bytes would have cost with no proxy in front of them. The API sees
// the POST-pipeline body, so that is what has to be priced — and the gap is
// not cosmetic. Measured 2026-07-28 on raw captures: `bestMarker=-1` on every
// pair, because marker placement is a pipeline concern, so every pair scored
// as a full-context bust and the totals were meaningless. Two of today's
// findings (the ladder manufacturing busts, the pin removing them) are
// invisible without pricing the forwarded bytes.
//
// STATUS 2026-07-28 — the absolute totals are NOT yet trustworthy. Streaming,
// --pipeline and conversation grouping are fixed and verified; the remaining
// defect is that short sidecar calls (1-2 messages) still collide under the
// coarse conversation key here, so their pairs report `div=messages@1` and
// price as full busts. Symptom: ~190 "predicted busts" on a corpus with about
// four real ones. Use this tool for A/B DELTAS on the same corpus, which is
// what it was built for; do not quote its bust count or its totals as fact.
// The correctness verdict lives in replay.mjs's gates — cache-sim only ever
// prices what those gates let through.
//
// --pipeline loads the real extension pipeline exactly as replay.mjs does,
// against a scratch state dir, and prices the forwarded bodies. Combined with
// --env it answers "what did this flag change, in tokens" — the number the
// stability gate deliberately does NOT provide, because a green gate is a
// correctness verdict and tokens are the cost of whatever it lets through.
//
// Streamed, never readFile: a capture re-sends the whole conversation per
// request, so it grows quadratically and a single live session reached 555 MB
// here — past Node's ~512 MB max string length, which threw outright on the
// very traffic this tool exists to price.

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CHARS_PER_TOKEN = 4;

// A conversation is identified by its first message: co-tenant traffic shares
// the session-id header (and therefore the capture key) but never msgs[0].
function conversationId(msgs) {
  if (!Array.isArray(msgs) || !msgs.length) return "empty";
  return JSON.stringify(msgs[0]).slice(0, 200);
}

function tokens(s) {
  return Math.round(s.length / CHARS_PER_TOKEN);
}

function stableStringify(v) {
  return JSON.stringify(v);
}

// The cache key prefix, in API order: params gate everything, then
// system, then tools, then messages one by one.
function frontMatter(body) {
  return stableStringify({
    model: body.model ?? null,
    max_tokens: body.max_tokens ?? null,
    temperature: body.temperature ?? null,
    thinking: body.thinking ?? null,
    output_config: body.output_config ?? null,
    system: body.system ?? null,
    tools: body.tools ?? null,
  });
}

function stripCacheControl(msg) {
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

// Marker positions in a request: message indices carrying cache_control,
// ascending. The system/tools blocks may carry markers too; those are
// covered by the frontMatter gate (a front change busts everything).
function markerIndices(messages) {
  const out = [];
  for (let i = 0; i < (messages?.length ?? 0); i++) {
    const m = messages[i];
    if (m && Array.isArray(m.content) && m.content.some((b) => b?.cache_control)) out.push(i);
  }
  return out;
}

// Cumulative token size of messages[0..i] (cache_control stripped so a
// marker moving doesn't read as a content change).
function cumSizes(messages) {
  const sizes = [];
  let acc = 0;
  for (const m of messages ?? []) {
    acc += tokens(stableStringify(stripCacheControl(m)));
    sizes.push(acc);
  }
  return sizes;
}

export function simulatePair(prevBody, nowBody) {
  const prevMsgs = prevBody.messages ?? [];
  const nowMsgs = nowBody.messages ?? [];
  const frontTok = tokens(frontMatter(nowBody));
  const sizes = cumSizes(nowMsgs);
  const totalTok = frontTok + (sizes[sizes.length - 1] ?? 0);

  // Front gate: params/system/tools differ -> nothing survives.
  if (frontMatter(prevBody) !== frontMatter(nowBody)) {
    return { hitTok: 0, writeTok: totalTok, divergence: "front", totalTok };
  }

  // First divergent message index (cache_control-stripped comparison).
  let div = -1;
  const n = Math.min(prevMsgs.length, nowMsgs.length);
  for (let i = 0; i < n; i++) {
    if (
      stableStringify(stripCacheControl(prevMsgs[i])) !==
      stableStringify(stripCacheControl(nowMsgs[i]))
    ) {
      div = i;
      break;
    }
  }
  if (div === -1) div = prevMsgs.length; // pure append (or identical)

  // Highest PREVIOUS-request marker at an index < div whose prefix
  // survived — that's the breakpoint the API can resume from.
  const prevMarkers = markerIndices(prevMsgs).filter((i) => i < div);
  const best = prevMarkers.length ? prevMarkers[prevMarkers.length - 1] : -1;

  const hitTok = best >= 0 ? frontTok + (sizes[best] ?? 0) : 0;
  return {
    hitTok,
    writeTok: totalTok - hitTok,
    divergence: div >= prevMsgs.length ? "append" : `messages@${div}`,
    bestMarker: best,
    totalTok,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const usePipeline = argv.includes("--pipeline");
  const env = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--env") {
      const kv = argv[++i] ?? "";
      const eq = kv.indexOf("=");
      if (eq > 0) env[kv.slice(0, eq)] = kv.slice(eq + 1);
    }
  }
  const file = argv.find((a) => !a.startsWith("--") && !argv[argv.indexOf(a) - 1]?.startsWith("--env"));
  if (!file) {
    process.stderr.write(
      "usage: node tools/cache-sim.mjs <captures.jsonl> [--pipeline] [--env FLAG=1 ...] [--json]\n",
    );
    process.exit(2);
  }

  // Pipeline mode: same loader and scratch-state discipline as replay.mjs, so
  // the bodies priced below are the bytes that would actually go on the wire.
  let runOnRequest = null;
  let extensions = null;
  let scratch = null;
  if (usePipeline) {
    scratch = await mkdtemp(join(tmpdir(), "cache-sim-"));
    process.env.CLAUDE_CONFIG_DIR = scratch;
    for (const [k, v] of Object.entries(env)) process.env[k] = v;
    const here = dirname(fileURLToPath(import.meta.url));
    const pipeline = await import(new URL("../proxy/pipeline.mjs", import.meta.url).href);
    runOnRequest = pipeline.runOnRequest;
    extensions = await pipeline.loadExtensions(
      join(here, "..", "proxy", "extensions"),
      join(here, "..", "proxy", "extensions.json"),
    );
  }

  const byKey = new Map();
  const rows = [];
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    let body = rec.body;
    if (usePipeline) {
      const ctx = {
        body: structuredClone(rec.body),
        headers: {
          "anthropic-beta": rec.headers?.["anthropic-beta"] ?? undefined,
          "x-session-id": rec.headers?.["session-id"] ?? rec.sid ?? undefined,
        },
        meta: { route: "messages" },
      };
      await runOnRequest(ctx, extensions);
      body = ctx.body;
    }
    // Group by (capture key, CONVERSATION), never by key alone. One session-id
    // header carries the main thread, every subagent, and CC's sidecar calls;
    // pricing a subagent's request against the main thread's predecessor
    // reports the tenant switch as a full-context bust. Measured on a
    // 602-request capture: key-only grouping called 227 of 601 pairs busts,
    // when the same corpus has a handful of real ones. Identical artifact to
    // the one that made replay's first stability gate report false green.
    const cid = conversationId(body?.messages);
    const group = `${rec.key}|${cid}`;
    const prev = byKey.get(group);
    if (prev) {
      const sim = simulatePair(prev, body);
      rows.push({ ts: rec.ts, key: rec.key, ...sim });
    }
    // Retain only the previous body per group — a capture does not fit in
    // memory, and only the immediate predecessor is ever needed.
    byKey.set(group, body);
  }
  if (scratch) await rm(scratch, { recursive: true, force: true });

  if (json) {
    process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
    return;
  }
  let write = 0;
  let hit = 0;
  const busts = rows.filter((r) => r.writeTok > 20000);
  for (const r of rows) {
    write += r.writeTok;
    hit += r.hitTok;
  }
  process.stdout.write(`pairs simulated: ${rows.length}\n`);
  process.stdout.write(`total predicted write-tokens: ${write}  hit-tokens: ${hit}\n`);
  process.stdout.write(`predicted busts (>20k write): ${busts.length}\n`);
  for (const b of busts.slice(0, 30)) {
    process.stdout.write(
      `  ${b.ts} key=${b.key} write=${b.writeTok} div=${b.divergence} bestMarker=${b.bestMarker ?? "-"}\n`,
    );
  }
}

// Only run main when invoked directly, so tests can import simulatePair.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    process.stderr.write(`cache-sim failed: ${err?.stack ?? err}\n`);
    process.exit(1);
  });
}
