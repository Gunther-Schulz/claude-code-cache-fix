#!/usr/bin/env node
// thread-create-census — what changed between consecutive full-body
// (`thread:{type:"create"}`) requests of one conversation, and did the cache
// survive it.
//
// Usage:
//   node tools/thread-create-census.mjs <capture.jsonl> [--json] [--model <substr>]
//
// Why this exists: row 4's 2026-09-21 mechanism record (BACKLOG.md, "row 4
// instance data") found that under the message-threads beta
// (`message-threads-2026-08-12`) only CREATE requests collapse, and that the
// first raw divergence between consecutive creates sits on the previous
// create's TAIL message — the one carrying CC's single message-level
// `cache_control`. It measured that by hand. The parked mitigation needs the
// discriminating half the hand pass did not split: is the collapse caused by
// the marker leaving that message, by its content SHAPE flipping (block array
// -> bare string), or by a real content change? Each has a different fix, and
// one of them (the marker) would make any proxy-added marker a permanent
// obligation — the ladder's losing trade (FORK-NOTES.md, standing stances).
//
// So for every create after the first in a conversation it reports the first
// divergence index against the previous create under three comparisons:
//   raw      byte-identical JSON of each message
//   noMarker the same with every `cache_control` key removed
//   norm     noMarker, plus a bare-string content and a single-text-block
//            array compared as equal
// joined to the request's own outcome (cacheRead / cacheCreation), and the
// message-level marker layout of both creates. A divergence at -1 means
// "none within the previous create's length" (a pure append under that
// comparison).
//
// Conversation grouping is `conversationSubKey` over the create's full
// messages — the repo's one identity (dev-loop, "Never hand-roll identity in
// a probe"). Continue requests carry a delta, not the conversation, so they
// are counted per model and never grouped.
//
// THREE answers per row, never two: a create whose outcome record is missing
// is printed `outcome=MISSING`, never scored as a hit or a miss.
//
// READ-ONLY. Streams with tools/read-lines.mjs; retains only the previous
// create's messages per conversation.

import { readLines } from "./read-lines.mjs";
import { conversationSubKey } from "../proxy/extensions/message-hash.mjs";

export function stripMarkers(v) {
  if (Array.isArray(v)) return v.map(stripMarkers);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v)) if (k !== "cache_control") o[k] = stripMarkers(v[k]);
    return o;
  }
  return v;
}

export function normShape(msg) {
  const m = stripMarkers(msg);
  if (Array.isArray(m.content) && m.content.length === 1 && m.content[0]?.type === "text" &&
      Object.keys(m.content[0]).length === 2) {
    return { ...m, content: m.content[0].text };
  }
  return m;
}

// Top-level request keys compared between creates: everything except the
// conversation itself and the per-request bookkeeping that differs on every
// request by construction.
const TOP_SKIP = new Set(["messages", "thread", "diagnostics", "metadata", "stream"]);

const VIEWS = {
  raw: (m) => JSON.stringify(m),
  noMarker: (m) => JSON.stringify(stripMarkers(m)),
  norm: (m) => JSON.stringify(normShape(m)),
};

/** First index < prev.length where the two message lists differ under view; -1 if none. */
export function firstDivergence(prev, cur, view) {
  const f = VIEWS[view];
  const n = Math.min(prev.length, cur.length);
  for (let i = 0; i < n; i++) if (f(prev[i]) !== f(cur[i])) return i;
  return cur.length < prev.length ? n : -1;
}

export function messageMarkers(messages) {
  const out = [];
  messages.forEach((m, i) => {
    if (Array.isArray(m?.content)) {
      if (m.content.some((b) => b && typeof b === "object" && b.cache_control)) out.push(i);
    } else if (m?.cache_control) out.push(i);
  });
  return out;
}

/**
 * Where does a create's re-rendering of the thread depart from what the
 * continue deltas actually sent? Walks the create from `fromIndex`, matching
 * each delta message in order against the next create message of the same
 * role (assistant turns are server-generated and never in a delta, so they
 * are skipped). Returns the first create index whose message is not equal to
 * its delta counterpart under each view, or -1 when every delta message was
 * found equal. Deltas are attributed by ORDER only — with more than one
 * threaded conversation per model in a capture, pass --model narrowly.
 */
export function matchDeltas(deltas, createMsgs, fromIndex) {
  const res = { raw: -1, noMarker: -1, norm: -1, unmatched: 0 };
  let p = fromIndex;
  for (const d of deltas) {
    for (const dm of d.messages) {
      while (p < createMsgs.length && createMsgs[p]?.role !== dm.role) p++;
      if (p >= createMsgs.length) { res.unmatched++; continue; }
      for (const v of Object.keys(VIEWS)) {
        if (res[v] === -1 && VIEWS[v](createMsgs[p]) !== VIEWS[v](dm)) res[v] = p;
      }
      p++;
    }
  }
  return res;
}

function shapeOf(msg) {
  if (!msg) return "-";
  return typeof msg.content === "string" ? "str" : `arr${msg.content?.length ?? "?"}`;
}

async function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const mi = argv.indexOf("--model");
  const modelFilter = mi >= 0 ? argv[mi + 1] : null;
  const file = argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--model");
  if (!file) {
    process.stderr.write("usage: node tools/thread-create-census.mjs <capture.jsonl> [--json] [--model <substr>]\n");
    process.exitCode = 2;
    return;
  }

  // --pipeline: compare what the proxy FORWARDED, not what CC sent. The
  // server-side thread holds forwarded bytes, and output-guard forwards CC's
  // RAW body whenever the pipeline's output fails its adjacency check —
  // which every tool_result-first delta does — while a create goes out
  // pipeline-transformed. Same loader, gates-from-capture and scratch-state
  // discipline as replay.mjs.
  let pipe = null;
  if (argv.includes("--pipeline")) {
    const { readBootRecords, resolveGatesFromCapture } = await import("./replay.mjs");
    const { tmpDir } = await import("./tmpdir.mjs");
    const scratch = await tmpDir("thread-create-census-");
    process.env.CLAUDE_CONFIG_DIR = scratch;
    process.env.XDG_STATE_HOME = scratch;
    process.env.XDG_DATA_HOME = scratch;
    delete process.env.CACHE_FIX_STATE_DIR;
    delete process.env.CACHE_FIX_DATA_DIR;
    const gates = resolveGatesFromCapture(await readBootRecords(file), {});
    for (const [k, v] of Object.entries(gates)) process.env[k] = v;
    process.stderr.write(`[thread-create-census] pipeline gates: ${Object.keys(gates).sort().join(",") || "(none — capture has no boot record)"}\n`);
    const pipeline = await import(new URL("../proxy/pipeline.mjs", import.meta.url).href);
    const extDir = new URL("../proxy/extensions", import.meta.url).pathname;
    const extensions = await pipeline.loadExtensions(extDir, new URL("../proxy/extensions.json", import.meta.url).pathname);
    pipe = { runOnRequest: pipeline.runOnRequest, extensions };
  }

  const outcomes = new Map();
  const creates = [];
  const counts = Object.create(null);
  const prevByConv = new Map();
  let pendingDeltas = [];

  for await (const raw of readLines(file)) {
    const line = raw.trim();
    if (!line) continue;
    let rec;
    try { rec = JSON.parse(line); } catch { counts.unparseable = (counts.unparseable ?? 0) + 1; continue; }
    if (rec.type === "outcome") { outcomes.set(rec.id, rec.usage ?? null); continue; }
    let body = rec.body;
    if (!body || typeof body !== "object") continue;
    if (pipe) {
      // Every body, in file order, before any filter: extension state is
      // per-session and a skipped request would leave it in a state
      // production never had.
      const ctx = {
        body: structuredClone(body),
        headers: {
          "anthropic-beta": rec.headers?.["anthropic-beta"] ?? undefined,
          "x-session-id": rec.headers?.["session-id"] ?? rec.sid ?? undefined,
        },
        meta: { route: "messages" },
      };
      await pipe.runOnRequest(ctx, pipe.extensions);
      body = ctx.body;
    }
    if (modelFilter && !String(body.model).includes(modelFilter)) continue;
    const t = body.thread?.type ?? "none";
    const ck = `${body.model}|${t}`;
    counts[ck] = (counts[ck] ?? 0) + 1;
    if (t === "continue" && Array.isArray(body.messages)) {
      pendingDeltas.push({ id: rec.id, ts: rec.ts, messages: body.messages });
      continue;
    }
    if (t !== "create" || !Array.isArray(body.messages)) continue;

    const msgs = body.messages;
    const conv = conversationSubKey(msgs);
    const prev = prevByConv.get(conv);
    const row = {
      ts: rec.ts, id: rec.id, model: body.model, conv, n: msgs.length,
      markers: messageMarkers(msgs),
      prevN: prev ? prev.msgs.length : null,
      prevMarkers: prev ? messageMarkers(prev.msgs) : null,
    };
    const top = {};
    for (const k of Object.keys(body)) if (!TOP_SKIP.has(k)) top[k] = JSON.stringify(body[k]);
    if (prev) {
      row.topChanged = [...new Set([...Object.keys(top), ...Object.keys(prev.top)])]
        .filter((k) => top[k] !== prev.top[k]);
      for (const v of Object.keys(VIEWS)) row[v] = firstDivergence(prev.msgs, msgs, v);
      const k = row.raw;
      row.atRaw = k >= 0 ? { prevShape: shapeOf(prev.msgs[k]), curShape: shapeOf(msgs[k]),
        prevMarked: messageMarkers([prev.msgs[k]]).length > 0, curMarked: messageMarkers([msgs[k]]).length > 0 } : null;
    }
    if (prev) {
      row.deltas = pendingDeltas.length;
      row.deltaCheck = matchDeltas(pendingDeltas, msgs, prev.msgs.length);
      row.deltaIds = pendingDeltas.map((d) => d.id);
    }
    pendingDeltas = [];
    creates.push(row);
    prevByConv.set(conv, { msgs, top });
  }

  for (const r of creates) r.usage = outcomes.has(r.id) ? outcomes.get(r.id) : "MISSING";

  if (json) {
    process.stdout.write(JSON.stringify({ counts, creates }) + "\n");
    return;
  }
  process.stdout.write(`request counts (model|thread): ${JSON.stringify(counts)}\n`);
  for (const r of creates) {
    const u = r.usage === "MISSING" ? "outcome=MISSING" : `read=${r.usage?.cacheRead} create=${r.usage?.cacheCreation}`;
    const head = `${r.ts} ${r.model} conv=${r.conv} n=${r.prevN ?? "-"}->${r.n} markers=[${r.markers}]`;
    if (r.prevN == null) { process.stdout.write(`${head} FIRST ${u}\n`); continue; }
    const at = r.atRaw ? ` at-raw{${r.atRaw.prevShape}${r.atRaw.prevMarked ? "+cc" : ""}->${r.atRaw.curShape}${r.atRaw.curMarked ? "+cc" : ""}}` : "";
    process.stdout.write(`${head} top=[${r.topChanged}] prevMarkers=[${r.prevMarkers}] div raw=${r.raw} noMarker=${r.noMarker} norm=${r.norm}${at} deltas=${r.deltas} vsDelta{raw=${r.deltaCheck.raw} noMarker=${r.deltaCheck.noMarker} norm=${r.deltaCheck.norm} unmatched=${r.deltaCheck.unmatched}} ${u}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
