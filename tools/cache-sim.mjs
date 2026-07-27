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

import { readFile } from "node:fs/promises";

const CHARS_PER_TOKEN = 4;

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
  const file = process.argv[2];
  const json = process.argv.includes("--json");
  if (!file) {
    process.stderr.write("usage: node tools/cache-sim.mjs <captures.jsonl> [--json]\n");
    process.exit(2);
  }
  const lines = (await readFile(file, "utf-8")).split("\n").filter((l) => l.trim());
  const byKey = new Map();
  const rows = [];
  for (const line of lines) {
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    const prev = byKey.get(rec.key);
    if (prev) {
      const sim = simulatePair(prev.body, rec.body);
      rows.push({ ts: rec.ts, key: rec.key, ...sim });
    }
    byKey.set(rec.key, rec);
  }

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
