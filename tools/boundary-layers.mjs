#!/usr/bin/env node
// boundary-layers — price a cold event LAYER BY LAYER over the raw capture,
// and answer the one question every resume/idle-boundary walk has had to
// answer by hand: "if we pinned layer X, where would the prefix diverge next?"
//
// Why this exists. Threat-matrix rows 24 (same-machine /resume) and 29
// (idle-boundary rebuild) both stop at the same missing evidence, in almost
// the same words: row 24 names "where the SECOND divergence lands once
// messages[0] is pinned" as the named missing piece before any build, and
// row 29 says "mitigability, honest open question". That question is a
// CASCADE — pin the earliest diverging layer, ask where the next divergence
// lands, repeat — and nothing in this repo computed it. Every prior answer
// came from a hand-run `jq` over capture request records, which is the class
// dev-loop.md's "second ad-hoc probe" rule stops an investigation on.
//
// What it is NOT. It does not attribute (that is replay.mjs's
// `attributionOf`, and captures being pre-pipeline is what makes attribution
// possible at all), it does not classify against the threat matrix (that is
// bust-triage), and it is not a gate — it exits 0 on any readable pair. It
// prices, and pricing is advisory by dev-loop's own standing rule ("a green
// gate is required; token numbers are advisory").
//
// The wire order it prices along is tools -> system -> messages, which is
// replay.mjs's own stated order ("tools[] renders BEFORE system and
// messages, so a change to it invalidates the whole prefix and no breakpoint
// can survive one"). A layer that diverges makes every later layer's
// agreement worthless, which is precisely why the cascade — and not a flat
// per-layer diff — is the useful output.
//
// Usage:
//   node tools/boundary-layers.mjs --session <sid8|sid> --at <ISO|epoch>
//   node tools/boundary-layers.mjs --capture <file.jsonl> --at <ISO|epoch>
//   node tools/boundary-layers.mjs --capture <file> --request <req_…|id>
//   node tools/boundary-layers.mjs --capture <file> --pair <beforeId>:<afterId>
//     --timeline <n>   also print the n requests before the busting one
//     --json
//
// PREDECESSOR CHOICE IS AN OUTPUT, NOT AN ASSUMPTION. The tool reports every
// candidate relation side by side — exact first-message identity (what
// bust-triage's stage 1 uses), nearest-earlier same model, nearest-earlier
// any — and says when they DISAGREE. That disagreement is a finding about
// the instruments, not a detail: measured 2026-08-15 on the 919k event on
// capture s-captureBR, where the lineage stage selected a predecessor 2h13m earlier while the conversation's
// real immediate predecessor sat 2m27s before the bust, and every downstream
// verdict computed on that pair described a pair that never busted.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { dataPath } from "../proxy/xdg-dirs.mjs";
import { readLines } from "./read-lines.mjs";
import { firstDivergence, compactEntry } from "./replay.mjs";
import { conversationSubKey } from "../proxy/extensions/message-hash.mjs";
import { localSuffix } from "./local-stamp.mjs";

const CAPTURES = dataPath("captures");

const sha12 = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);
const j = (line) => { try { return JSON.parse(line); } catch { return null; } };

// A capture request record: has a body with messages, and a timestamp. The
// capture also holds `boot`, `outcome` and `coalesced` records, none of which
// carry a request body.
const isRequest = (r) => !!(r && r.body && Array.isArray(r.body.messages) && r.ts);

// ---------------------------------------------------------------------------
// Layer extraction
//
// Each layer is reduced to a STRING so that "identical" is a byte question and
// the first divergence has a character offset. The messages layer keeps its
// array shape instead, because `firstDivergence` works per-element and an
// element index is the coordinate the rest of this repo speaks in.
// ---------------------------------------------------------------------------

function systemBlocks(body) {
  const s = body?.system;
  if (typeof s === "string") return [{ type: "text", text: s }];
  return Array.isArray(s) ? s : [];
}

function toolsString(body) {
  return JSON.stringify(body?.tools ?? null);
}

// First index at which two strings differ, or null when identical.
function firstCharDiff(a, b) {
  if (a === b) return null;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return n; // one is a strict prefix of the other
}

// Name the REGION of a Claude Code system block a character offset falls in.
// The regions are CC's own literal section markers; an offset that matches
// none is reported as such rather than guessed at, because a wrong region
// name reads exactly like a right one.
const SYSTEM_REGIONS = [
  ["<env>", "<env> block"],
  ["gitStatus:", "gitStatus (git status + recent commits)"],
  ["Recent commits:", "gitStatus / recent commits"],
  ["# Harness", "harness section"],
  ["# Environment", "environment section"],
];

function regionOf(text, offset) {
  if (offset == null) return null;
  let best = null;
  for (const [marker, label] of SYSTEM_REGIONS) {
    const at = text.lastIndexOf(marker, offset);
    if (at >= 0 && (!best || at > best.at)) best = { at, label, marker };
  }
  return best ? `${best.label} (marker "${best.marker}" at ${best.at})` : null;
}

// A short excerpt around an offset, with newlines made visible so a diff that
// is pure whitespace is still readable.
function excerpt(text, offset, span = 90) {
  if (offset == null) return null;
  const from = Math.max(0, offset - span);
  const to = Math.min(text.length, offset + span);
  return text.slice(from, to).replace(/\n/g, "\\n");
}

// ---------------------------------------------------------------------------
// The cascade
//
// Walk the layers in wire order. For each: identical, or diverging with its
// own coordinate. `recoveredBytes` accumulates the bytes of every layer that
// matched BEFORE the first divergence — that is what is cached today. Each
// subsequent entry answers "and if this layer were pinned to the predecessor's
// bytes, what would the next divergence be" — which is the mitigation
// question, priced.
// ---------------------------------------------------------------------------

function cascade(before, after) {
  const layers = [];

  // --- tools ---
  const tBefore = toolsString(before.body);
  const tAfter = toolsString(after.body);
  const tDiff = firstCharDiff(tBefore, tAfter);
  layers.push({
    layer: "tools",
    bytes: tAfter.length,
    identical: tDiff === null,
    charOffset: tDiff,
    detail: tDiff === null
      ? `${(after.body?.tools ?? []).length} tools, byte-identical`
      : `first differs at char ${tDiff}: ${excerpt(tAfter, tDiff, 60)}`,
  });

  // --- system, block by block ---
  const sBefore = systemBlocks(before.body);
  const sAfter = systemBlocks(after.body);
  const nBlocks = Math.max(sBefore.length, sAfter.length);
  for (let i = 0; i < nBlocks; i++) {
    const a = typeof sBefore[i]?.text === "string" ? sBefore[i].text : JSON.stringify(sBefore[i] ?? null);
    const b = typeof sAfter[i]?.text === "string" ? sAfter[i].text : JSON.stringify(sAfter[i] ?? null);
    const d = firstCharDiff(a, b);
    layers.push({
      layer: `system[${i}]`,
      bytes: (b ?? "").length,
      identical: d === null,
      charOffset: d,
      region: d === null ? null : regionOf(b ?? "", d),
      detail: d === null
        ? `${(b ?? "").length} chars, byte-identical`
        : `${a?.length ?? 0} -> ${b?.length ?? 0} chars, first differs at char ${d}`,
      beforeExcerpt: d === null ? null : excerpt(a ?? "", d),
      afterExcerpt: d === null ? null : excerpt(b ?? "", d),
    });
  }

  // --- messages ---
  // messages[0] is called out on its own because it is the layer rows 24 and
  // 29 both name: CC rebuilds it from disk at a resume or idle boundary, so
  // it is the one whose pinnability decides whether the layers above it are
  // worth pinning at all.
  const m0a = JSON.stringify(before.body.messages[0] ?? null);
  const m0b = JSON.stringify(after.body.messages[0] ?? null);
  const m0d = firstCharDiff(m0a, m0b);
  layers.push({
    layer: "messages[0]",
    bytes: m0b.length,
    identical: m0d === null,
    charOffset: m0d,
    detail: m0d === null
      ? `${m0b.length} chars, byte-identical`
      : `${m0a.length} -> ${m0b.length} chars, first differs at char ${m0d}`,
    beforeExcerpt: m0d === null ? null : excerpt(m0a, m0d),
    afterExcerpt: m0d === null ? null : excerpt(m0b, m0d),
  });

  // messages[1..] via the repo's own primitive, so the index means what it
  // means everywhere else in this repo.
  const divAll = firstDivergence(before.body.messages, after.body.messages);
  const tailDiv = divAll === null || divAll === 0
    ? firstDivergence(before.body.messages.slice(1), after.body.messages.slice(1))
    : divAll - 1;
  const tailIdx = tailDiv === null ? null : tailDiv + 1;
  const tailBytes = JSON.stringify(after.body.messages.slice(1)).length;
  layers.push({
    layer: "messages[1..]",
    bytes: tailBytes,
    identical: tailIdx === null,
    messageIndex: tailIdx,
    detail: tailIdx === null
      ? `${after.body.messages.length - 1} messages, all byte-identical to the predecessor's (pure append or no change)`
      : `first diverging message index ${tailIdx} of ${after.body.messages.length}`,
  });

  // ALIGNMENT — the question the divergence index alone cannot answer.
  //
  // A first-diverging index of k means one of two very different things, and
  // they route to different mitigation classes:
  //   CONTENT   messages[k] was EDITED; everything else may still line up.
  //   SHIFT     a message was inserted or removed at k, so every later
  //             message is byte-identical but at a different index. That is
  //             the class insertion-normalization / smoosh-split /
  //             fresh-session-sort already exist for.
  // Told apart by re-aligning: if a small offset makes the tails match again,
  // it is a shift of that size. Hashes come from the repo's own
  // `compactEntry` rather than a second per-message hash, because a
  // hand-rolled identity has produced a confident wrong answer here before.
  const hBefore = compactEntry({ inMsgs: before.body.messages }).inHash;
  const hAfter = compactEntry({ inMsgs: after.body.messages }).inHash;
  const alignment = alignMessages(hBefore, hAfter, tailIdx);

  // The cascade proper: cumulative recovery if each diverging layer in turn
  // were pinned. `cumulativeBytes` is what is byte-identical up to and
  // including that point.
  let cumulative = 0;
  let firstDivergingLayer = null;
  for (const l of layers) {
    if (l.identical) {
      cumulative += l.bytes;
      l.cumulativeIdenticalBytes = cumulative;
    } else {
      if (firstDivergingLayer === null) firstDivergingLayer = l.layer;
      l.cumulativeIdenticalBytes = cumulative;
      cumulative += l.bytes; // pinned, hypothetically
      l.ifPinnedCumulativeBytes = cumulative;
    }
  }

  const totalBytes = layers.reduce((s, l) => s + l.bytes, 0);
  return { layers, firstDivergingLayer, totalBytes, alignment };
}

/**
 * Classify a message-array divergence as CONTENT or SHIFT.
 *
 * Search a bounded window of offsets around the divergence for one that makes
 * the remaining tails agree. The window is deliberately small: a large offset
 * that happens to re-align is far more likely to be coincidence than a real
 * insertion, and reporting it would be the hand-rolled-identity error in
 * another costume. `commonTail` is the length of the agreeing run at the best
 * offset, which is what says whether the re-alignment is real or accidental.
 */
function alignMessages(hBefore, hAfter, divIdx, window = 40) {
  if (divIdx === null) {
    return { kind: "IDENTICAL", detail: "no divergence in the message array" };
  }

  // Positional index of each hash in the predecessor, first occurrence.
  const beforeIdx = new Map();
  hBefore.forEach((h, i) => { if (!beforeIdx.has(h)) beforeIdx.set(h, i); });

  // TOTAL overlap, independent of position: how many of `after`'s messages
  // exist ANYWHERE in `before`. This is what says whether re-serving is even
  // conceivable, and it is deliberately position-blind.
  const beforeSet = new Set(hBefore);
  const shared = hAfter.filter((h) => beforeSet.has(h)).length;
  const totalOverlap = hAfter.length ? shared / hAfter.length : 0;

  // Where does the array RESUME agreeing, and at what offset? Scanning from
  // the divergence forward for the first index whose message matches the
  // predecessor at some offset within the window.
  //
  // NOTE, and it is the reason this function was rewritten: an earlier
  // version measured the agreeing run STARTING AT `divIdx`, which is by
  // definition a mismatch, so it reported run 0 at every offset and
  // concluded "the history below is rebuilt". That was FALSE on the very
  // pair it was written for — messages 115-116 had changed in place and
  // 117+ were byte-identical at offset 0. A scan anchored to a known
  // mismatch cannot measure agreement; anchor it to the resume point.
  let resumeAt = null;
  let resumeOffset = null;
  for (let i = divIdx; i < hAfter.length; i++) {
    const at = beforeIdx.has(hAfter[i]) ? beforeIdx.get(hAfter[i]) : null;
    if (at === null) continue;
    const off = at - i;
    if (Math.abs(off) > window) continue;
    // Require the agreement to HOLD, not merely to occur once: a single
    // coincidental hash match is not a re-alignment.
    let run = 0;
    for (let k = i; k < hAfter.length && k + off < hBefore.length && k + off >= 0; k++) {
      if (hBefore[k + off] !== hAfter[k]) break;
      run++;
    }
    if (run >= 5 || (run > 0 && i + run >= hAfter.length)) {
      resumeAt = i;
      resumeOffset = off;
      break;
    }
  }

  const changed = resumeAt === null ? null : resumeAt - divIdx;
  const tailLen = resumeAt === null ? 0 : hAfter.length - resumeAt;
  const displaced = [];
  for (let i = divIdx; i < Math.min(divIdx + 5, hAfter.length); i++) {
    const at = beforeIdx.has(hAfter[i]) ? beforeIdx.get(hAfter[i]) : null;
    displaced.push({ afterIndex: i, predecessorIndex: at, offset: at === null ? null : at - i });
  }
  const base = { totalOverlap, sharedMessages: shared, displaced, divergenceIndex: divIdx };

  if (resumeAt === null) {
    return {
      ...base,
      kind: "REBUILD",
      detail: `the array never resumes agreeing within +/-${window} after index ${divIdx} — ` +
              `the history below the divergence is genuinely rebuilt. Total overlap regardless of ` +
              `position: ${shared}/${hAfter.length} (${(totalOverlap * 100).toFixed(1)}%)`,
    };
  }
  if (resumeOffset !== 0) {
    const verb = resumeOffset < 0 ? "INSERTED" : "REMOVED";
    return {
      ...base,
      kind: "SHIFT",
      resumeAt, resumeOffset, changedMessages: changed, commonTail: tailLen,
      detail: `${Math.abs(resumeOffset)} message(s) ${verb} at index ${divIdx}; the array resumes ` +
              `agreeing at after[${resumeAt}] <- before[${resumeAt + resumeOffset}] and the remaining ` +
              `${tailLen} messages line up — a SHIFT, the class insertion-normalization exists for`,
    };
  }
  return {
    ...base,
    kind: "LOCAL-EDIT",
    resumeAt, resumeOffset, changedMessages: changed, commonTail: tailLen,
    detail: `${changed} message(s) changed IN PLACE at index ${divIdx}..${resumeAt - 1}; ` +
            `after[${resumeAt}] onward is byte-identical to the predecessor at the SAME indices ` +
            `(${tailLen} messages, ${((tailLen / hAfter.length) * 100).toFixed(1)}% of the array). ` +
            `Total overlap: ${shared}/${hAfter.length} (${(totalOverlap * 100).toFixed(1)}%). ` +
            `Pinning those ${changed} message(s) would restore the whole array below them.`,
  };
}

// ---------------------------------------------------------------------------
// Predecessor candidates — reported side by side, never collapsed to one
// ---------------------------------------------------------------------------

async function scanCapture(file, afterTs) {
  const out = [];
  for await (const line of readLines(file)) {
    const r = j(line);
    if (!isRequest(r)) continue;
    if (afterTs && Date.parse(r.ts) >= afterTs) continue;
    out.push({
      ts: r.ts,
      id: r.id,
      model: r.body.model,
      msgs: r.body.messages.length,
      cid: conversationSubKey(r.body.messages),
      record: r,
    });
  }
  return out;
}

async function findRequest(file, { at, requestId, id }) {
  let best = null;
  const wantMs = at ? Date.parse(at) : null;
  for await (const line of readLines(file)) {
    const r = j(line);
    if (!isRequest(r)) continue;
    if (id && r.id === id) return r;
    if (requestId && r.requestId === requestId) return r;
    if (wantMs != null) {
      // The busting REQUEST precedes the ledger's event stamp (the event is
      // written when the response's usage is read), so only earlier-or-equal
      // requests are candidates, nearest first.
      const d = wantMs - Date.parse(r.ts);
      if (d >= 0 && (!best || d < best.d)) best = { d, r };
    }
  }
  return best ? best.r : null;
}

function resolveCapture({ capture, session }) {
  if (capture) return capture;
  if (!session) return null;
  const files = readdirSync(CAPTURES).filter((f) => f.endsWith("-requests.jsonl"));
  const hit = files.filter((f) => f.includes(session));
  if (hit.length === 1) return join(CAPTURES, hit[0]);
  if (hit.length > 1) {
    throw new Error(`--session ${session} matches ${hit.length} captures; pass --capture explicitly`);
  }
  return null;
}

// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const a = { timeline: 0 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--json") a.json = true;
    else if (k === "--capture") a.capture = argv[++i];
    else if (k === "--session") a.session = argv[++i];
    else if (k === "--at") a.at = argv[++i];
    else if (k === "--request") a.request = argv[++i];
    else if (k === "--pair") a.pair = argv[++i];
    else if (k === "--timeline") a.timeline = Number(argv[++i]) || 0;
    else if (k === "--inspect") a.inspect = argv[++i];
  }
  if (a.at && /^\d+$/.test(a.at)) {
    const n = Number(a.at);
    a.at = new Date(n < 1e12 ? n * 1000 : n).toISOString();
  }
  return a;
}

function fmtBytes(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} kB`;
  return `${n} B`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = resolveCapture(args);
  if (!file || !existsSync(file)) {
    console.error("boundary-layers: need --capture <file> or --session <sid> (capture not found)");
    process.exit(2);
  }

  let before = null;
  let after = null;
  let candidates = [];
  let chosenBy = null;

  if (args.pair) {
    const [bId, aId] = args.pair.split(":");
    before = await findRequest(file, { id: bId });
    after = await findRequest(file, { id: aId });
    chosenBy = "explicit --pair";
    if (!before || !after) {
      console.error(`boundary-layers: --pair ${args.pair} did not resolve both records`);
      process.exit(2);
    }
  } else {
    after = await findRequest(file, { at: args.at, requestId: args.request, id: args.request });
    if (!after) {
      console.error("boundary-layers: could not resolve the busting request (need --at, --request or --pair)");
      process.exit(2);
    }
    const afterMs = Date.parse(after.ts);
    const earlier = await scanCapture(file, afterMs);
    const afterCid = conversationSubKey(after.body.messages);

    const sameCid = earlier.filter((e) => e.cid === afterCid).at(-1) ?? null;
    const sameModel = earlier.filter((e) => e.model === after.body.model).at(-1) ?? null;
    const anyReq = earlier.at(-1) ?? null;

    candidates = [
      { relation: "exact first-message identity (bust-triage stage 1)", pick: sameCid },
      { relation: "nearest earlier, same model", pick: sameModel },
      { relation: "nearest earlier, any conversation", pick: anyReq },
    ].map((c) => ({
      relation: c.relation,
      ts: c.pick?.ts ?? null,
      id: c.pick?.id ?? null,
      model: c.pick?.model ?? null,
      msgs: c.pick?.msgs ?? null,
      gapSeconds: c.pick ? Math.round((afterMs - Date.parse(c.pick.ts)) / 1000) : null,
    }));

    // The DEFAULT pair is the nearest earlier request of the same model. That
    // is the relation the cache actually cares about: the cached prefix a
    // request can read is whatever the previous request of that same
    // conversation-and-model wrote, and at a boundary that REBUILDS the
    // identity (rows 24, 29) the first-message identity is exactly the thing
    // that just changed — so keying the predecessor on it selects a stale
    // request and prices the wrong pair.
    before = sameModel?.record ?? anyReq?.record ?? null;
    chosenBy = sameModel ? "nearest earlier, same model" : "nearest earlier, any conversation";
    if (!before) {
      console.error("boundary-layers: no earlier request in this capture to compare against");
      process.exit(2);
    }
    if (args.timeline > 0) {
      const tail = earlier.slice(-args.timeline);
      candidates.timeline = tail.map((e) => ({
        ts: e.ts, id: e.id, model: e.model, msgs: e.msgs, cid: e.cid,
      }));
    }
  }

  const result = cascade(before, after);
  const gapSeconds = Math.round((Date.parse(after.ts) - Date.parse(before.ts)) / 1000);

  const payload = {
    capture: file,
    before: { ts: before.ts, id: before.id, model: before.body.model, msgs: before.body.messages.length,
              cid: conversationSubKey(before.body.messages) },
    after: { ts: after.ts, id: after.id, model: after.body.model, msgs: after.body.messages.length,
             cid: conversationSubKey(after.body.messages) },
    gapSeconds,
    chosenBy,
    candidates,
    firstDivergingLayer: result.firstDivergingLayer,
    totalBytes: result.totalBytes,
    layers: result.layers,
    messageAlignment: result.alignment,
  };

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`boundary-layers — ${after.ts}${localSuffix ? localSuffix(after.ts) : ""}  ${after.body.model}`);
  console.log(`  capture   ${file}`);
  console.log(`  pair      ${before.ts} (${before.body.messages.length} msgs) -> ${after.ts} (${after.body.messages.length} msgs)`);
  console.log(`  gap       ${gapSeconds}s   [predecessor chosen by: ${chosenBy}]`);
  console.log(`  conv id   before ${payload.before.cid}  ->  after ${payload.after.cid}${payload.before.cid === payload.after.cid ? "  (stable)" : "  (ROTATED — every per-conversation pin keyed on this is stranded)"}`);

  if (candidates.length) {
    console.log("\n  PREDECESSOR CANDIDATES — a disagreement here is a finding about the instruments:");
    for (const c of candidates) {
      const mark = c.ts === before.ts ? "*" : " ";
      console.log(`   ${mark} ${(c.ts ?? "—").padEnd(26)} gap ${String(c.gapSeconds ?? "—").padStart(7)}s  ${String(c.msgs ?? "—").padStart(5)} msgs  ${c.relation}`);
    }
    const distinct = new Set(candidates.map((c) => c.ts).filter(Boolean));
    if (distinct.size > 1) {
      console.log("   ^ RELATIONS DISAGREE — any verdict computed on one of these describes a different pair than the others.");
    }
  }

  if (candidates.timeline) {
    console.log("\n  TIMELINE (earlier requests, oldest first):");
    for (const t of candidates.timeline) {
      console.log(`     ${t.ts}  ${String(t.msgs).padStart(5)} msgs  cid ${t.cid}  ${t.model}`);
    }
  }

  console.log("\n  CASCADE — wire order tools -> system -> messages; the first divergence kills everything after it:");
  let reachedDivergence = false;
  for (const l of result.layers) {
    const status = l.identical ? "IDENTICAL" : "DIFFERS   ";
    const flag = !l.identical && !reachedDivergence ? "  <== FIRST DIVERGENCE" : "";
    if (!l.identical) reachedDivergence = true;
    console.log(`    ${status} ${l.layer.padEnd(14)} ${fmtBytes(l.bytes).padStart(9)}   ${l.detail}${flag}`);
    if (l.region) console.log(`                                        region: ${l.region}`);
    if (l.beforeExcerpt) {
      console.log(`                                        before: …${l.beforeExcerpt}…`);
      console.log(`                                        after : …${l.afterExcerpt}…`);
    }
  }

  console.log(`\n  MESSAGE-ARRAY ALIGNMENT: ${result.alignment.kind}`);
  console.log(`    ${result.alignment.detail}`);

  console.log("\n  WHAT A PIN WOULD BUY (the row 24 / row 29 question, priced):");
  const diverging = result.layers.filter((l) => !l.identical);
  if (!diverging.length) {
    console.log("    nothing to pin — every layer is byte-identical across this pair.");
  } else {
    for (let i = 0; i < diverging.length; i++) {
      const l = diverging[i];
      const next = diverging[i + 1];
      const recovered = l.ifPinnedCumulativeBytes ?? 0;
      const pct = ((recovered / result.totalBytes) * 100).toFixed(1);
      console.log(`    pin ${l.layer.padEnd(14)} -> next divergence at ${next ? next.layer : "NONE (whole prefix recovered)"}`);
      console.log(`        cumulative byte-identical prefix if pinned: ${fmtBytes(recovered)} of ${fmtBytes(result.totalBytes)} (${pct}%)`);
      if (!next) break;
    }
  }
  if (args.inspect) {
    // Structural view of one message pair. STRUCTURE first, excerpt second
    // and bounded: this repo is public and the captures behind it are other
    // projects' conversations (CLAUDE.local.md, the publication bar), so the
    // default output must be enough to CLASSIFY a divergence without
    // reproducing its content.
    for (const idx of args.inspect.split(",").map(Number)) {
      const a = before.body.messages[idx];
      const b = after.body.messages[idx];
      const blocks = (m) => (Array.isArray(m?.content)
        ? m.content.map((c) => `${c.type}:${JSON.stringify(c).length}B`).join(" ")
        : `string:${JSON.stringify(m?.content ?? null).length}B`);
      console.log(`\n  INSPECT messages[${idx}]`);
      console.log(`    before  role=${a?.role ?? "—"}  ${blocks(a)}`);
      console.log(`    after   role=${b?.role ?? "—"}  ${blocks(b)}`);
      const sa = JSON.stringify(a ?? null);
      const sb = JSON.stringify(b ?? null);
      const d = firstCharDiff(sa, sb);
      if (d === null) { console.log("    byte-identical"); continue; }
      console.log(`    first differs at char ${d} of ${sa.length} -> ${sb.length}`);
      console.log(`    before: …${excerpt(sa, d, 120)}…`);
      console.log(`    after : …${excerpt(sb, d, 120)}…`);
    }
  }

  console.log("\n  Bytes are advisory, not billed tokens: a recovered prefix is only READ if a cache_control");
  console.log("  breakpoint covers it (dev-loop.md, \"token numbers are advisory\").");
}

main().catch((e) => {
  console.error(`boundary-layers: ${e.message}`);
  process.exit(2);
});
