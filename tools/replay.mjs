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
// extensions are pointed at a scratch root so the live snapshot store is
// never touched — and since the XDG migration that means XDG_STATE_HOME and
// XDG_DATA_HOME, not CLAUDE_CONFIG_DIR alone. Setting only the latter left
// every replay run sharing ONE snapshot directory, which made a fixture
// diverge from itself; fixture-cut and fixture-verdict-identity both caught
// it. All three are set together so the isolation holds whichever root a
// given extension reads.
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

import { tmpDir } from "./tmpdir.mjs";
import { rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

import { readLines } from "./read-lines.mjs";
import { hashMessageContent } from "../proxy/extensions/message-hash.mjs";
import { isDescriptionNotice } from "../proxy/extensions/deferred-tool-rewrite.mjs";
import { isClearArtifact } from "../proxy/extensions/fresh-session-sort.mjs";
import { splitSmooshedReminders } from "../proxy/extensions/smoosh-split.mjs";
import { rewriteBlockText, getBlockType, isRelocatableBlock } from "../proxy/extensions/fresh-session-sort.mjs";
import { isContinueTrailerBlock, isBookkeepingReminder } from "../proxy/extensions/content-strip.mjs";
import { normalizeSessionStartText } from "../proxy/extensions/identity-normalization.mjs";
import { systemPromptSubKey } from "../proxy/extensions/insertion-normalization.mjs";

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
// output divergence strictly earlier than the input's — except a divergence
// with a matching telemetry-keyed exemption (freshSessionSortExemption and
// resetWipesAdditionsExemption below), which is reported separately by
// findStabilityExemptions rather than silently dropped.
function scanAllGroups(entries) {
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
  const exemptions = [];
  for (const group of groups.values()) {
    const scanned = scanGroup(group);
    violations.push(...scanned.violations);
    exemptions.push(...scanned.exemptions);
  }
  return {
    violations: violations.sort((a, b) => a.n - b.n),
    exemptions: exemptions.sort((a, b) => a.n - b.n),
  };
}

export function findStabilityViolations(entries) {
  return scanAllGroups(entries).violations;
}

// Exempted divergences, annotated with their basis — not silently dropped.
// Three exemptions are declared: freshSessionSortExemption,
// resetWipesAdditionsExemption and memoryStrandedByKeyRotationExemption,
// all below, all keyed on the responsible extension's own telemetry.
export function findStabilityExemptions(entries) {
  return scanAllGroups(entries).exemptions;
}

// Declared suppressions (insertion-normalization's pin-and-suppress,
// #76606 decision B) shrink the OUTPUT array by one entry, permanently,
// relative to CC's own raw array — every request from the first
// suppression on. `inHash`/`outHash` then no longer share a common index
// space: OUR array is one slot ahead of CC's from the suppressed index on,
// forever, so a plain positional compare reports a divergence exactly one
// index earlier than CC's own — every single turn — even though nothing
// extra was actually re-billed (the missing message is missing
// IDENTICALLY on both sides of the pair, so the shared prefix is exactly
// as long as it would be without the shift). Measured while adding this:
// UNADJUSTED, this pair's fix produced 67 new "violations" across a single
// conversation's remaining 60-odd turns, each showing the exact signature
// `outDiv === inDiv - 1` with CC identical at outDiv — a check firing on
// its own unadjusted index space, not a defect.
//
// Realign the reference: filter each entry's OWN suppressed indices out of
// its `inHash` before comparing, using the extension's own report
// (`stats.suppressions`) — never a re-derived guess — the same source
// safetyViolation's declared exemption already reads.
// Only the REMOVING suppressions shift the index space (see
// wireRemovedIndices): a join-move keeps its slot, filled with the re-served
// bytes, so filtering it here would over-correct by one and manufacture the
// very off-by-one signature this adjustment exists to remove.
function adjustedInHash(e) {
  const removed = wireRemovedIndices(e.stats);
  if (removed.size === 0) return e.inHash;
  return e.inHash.filter((_, i) => !removed.has(i));
}

// fresh-session-sort's relocate branch reports what it did
// (ctx.meta.freshSessionSortStats, compactEntry's freshSessionSortStats):
// a first-appearance relocation deliberately prepends content to the
// message at `targetIndex` that CC never had there before — exactly the
// shape this check flags, by design (module doc at the top of this file,
// the s-captureD n=2024->2025 case). Exempt ONLY when:
//   1. the CURRENT entry (the one whose output changed) carries the
//      telemetry at all, and
//   2. its targetIndex equals the violation's outDiv (the change landed
//      exactly where the extension says it relocated to), and
//   3. at least one relocated block is reported as a first appearance.
// Never re-derived from outDiv/shape alone — mirrors suppressedIndices'
// "never a re-derived guess" discipline. A relocation reported WITHOUT
// telemetry (a stale build) or reported as a RECURRING (non-first-
// appearance) relocation both stay violations — the second guards against
// exempting a genuine repeat/thrash at the same index.
function freshSessionSortExemption(cur, outDiv) {
  const stats = cur.freshSessionSortStats;
  if (!stats || stats.targetIndex !== outDiv) return null;
  const hit = (stats.relocated ?? []).find((r) => r.firstAppearance);
  if (!hit) return null;
  return { type: hit.type, targetIndex: stats.targetIndex };
}

// deferred-tool-rewrite's one designed "honest reset" branch reports itself
// too (ctx.meta.deferredToolRewriteStats, compactEntry's
// deferredToolRewriteStats): when a tool that was already known arrives with
// a DIFFERENT schema, the extension passes CC's tools[] through untouched and
// empties `additions` — which drops the previously-injected tool_addition
// announcement message(s) from OUR forwarded array while CC's own history is
// untouched (CC never echoes the injection back). The forwarded array
// therefore diverges one slot EARLIER than CC's: the stability check's
// violation shape, produced by a declared branch.
//
// Attributed on the real corpus (s-captureB, n=709->710 outDiv=236 and
// n=701->718 outDiv=82) by this file's own bisection, and classified
// zero-marginal-cost: the schema change that triggers the reset invalidates
// the tools-block prefix anyway, since tools[] renders before messages.
// Left unexempted it is a standing FAIL on a non-defect, which trains the
// reader to discount the gate.
//
// Exempt ONLY when all three hold — the same telemetry-not-shape discipline
// as freshSessionSortExemption above:
//   1. the CURRENT entry reports action=reset with reason=tool-schema-changed
//      (any other reset reason, or the same reason on a non-reset action, is
//      a cause nobody has classified),
//   2. CC's own bytes at the divergence index are identical across the pair
//      (an append-only input, where CC has no byte at that index at all,
//      reads as false here and stays a violation — deliberately strict), and
//   3. the divergence is FULLY explained by the removal: filter the declared
//      injections out of BOTH outputs and what is left must not diverge below
//      the bar. Without this, the exemption would be a blanket amnesty for
//      every schema-change reset.
function resetWipesAdditionsExemption(prev, cur, bar, ccSame) {
  const stats = cur.deferredToolRewriteStats;
  if (!stats || stats.action !== "reset" || stats.reason !== "tool-schema-changed") return null;
  if (!ccSame) return null;
  const prevInj = new Set(prev.outInjections ?? []);
  const curInj = new Set(cur.outInjections ?? []);
  // Something must actually have been REMOVED; "reset" alone is not the claim.
  if (prevInj.size <= curInj.size) return null;
  const residual = firstDivergence(
    prev.outHash.filter((_, i) => !prevInj.has(i)),
    cur.outHash.filter((_, i) => !curInj.has(i)),
  );
  if (residual !== null && residual < bar) return null;
  return { type: stats.reason, removedInjections: prevInj.size - curInj.size, residualOutDiv: residual };
}

// fresh-session-sort's relocation memory is keyed by
// resolveInsertionSessionKey, whose system-prompt sub-key rotates when CC
// changes its FIRST system block mid-conversation (systemPromptSubKey,
// imported below into compactEntry — the extension's own keying, never a
// re-derived variant). The memory cannot follow the rotation — by design:
// the sub-key exists to keep sidecars sharing the session-id header apart —
// so the first request under the rotated key finds no memory, takes the
// in-place path, and forwarded messages[targetIndex] loses the remembered
// block(s): the stability shape, produced by an identity boundary rather
// than a defect. Verified at the bytes on s-captureAB n=331->336
// (2026-08-05: system[0] "You are Claude Code…" 57 chars -> "You are a
// Claude agent…" 62 chars, sub-key 2719b7a4 -> 0d706285, forwarded
// messages[0] four blocks -> three).
//
// Exempt ONLY when ALL of these hold — telemetry and imported identity,
// never shape alone:
//   1. the PREVIOUS entry declared a relocation or re-serve
//      (freshSessionSortStats) at targetIndex === the violation's outDiv —
//      the conversation demonstrably held a relocated prefix at exactly the
//      slot that flipped;
//   2. the CURRENT entry declares NO relocation and NO re-serve — the
//      memory really was unreachable, not merely different;
//   3. CC's own bytes at outDiv are identical across the pair (ccSame) —
//      the flip is ours by construction, as the stranding shape requires;
//   4. CC's first system block changed across the pair (inSysSub, the
//      key input, rotated); and
//   5. prefixAboveMessages.ourSystemIdentical is FALSE — the rotation
//      reached the wire, so the prefix above messages re-bills anyway and
//      this flip costs nothing marginal. This condition is the exemption's
//      own retirement trigger: if anything upstream ever starts stabilizing
//      the forwarded system prompt, a stranding stops being free, condition
//      5 stops holding, and the violation comes back — the gate re-arms
//      exactly when the freeness coupling breaks, with no separate monitor.
function memoryStrandedByKeyRotationExemption(prev, cur, outDiv, ccSame, prefix) {
  const prevStats = prev.freshSessionSortStats;
  if (!prevStats || prevStats.targetIndex !== outDiv) return null;
  const held = [
    ...(prevStats.relocated ?? []).map((r) => r.type),
    ...(prevStats.reserved ?? []),
  ];
  if (!held.length) return null;
  const curStats = cur.freshSessionSortStats;
  if (curStats && ((curStats.relocated ?? []).length || (curStats.reserved ?? []).length)) return null;
  if (ccSame !== true) return null;
  if (!prev.inSysSub || !cur.inSysSub || prev.inSysSub === cur.inSysSub) return null;
  if (prefix.ourSystemIdentical !== false) return null;
  return {
    type: held[0],
    held,
    rotatedFrom: prev.inSysSub,
    rotatedTo: cur.inSysSub,
    targetIndex: outDiv,
  };
}

// Did anything above `messages` in the cache prefix move across this pair?
// `sig` is null when a side carries no tools[] at all — null === null is the
// honest "both requests had none", not an unknown, because the fingerprints
// are computed from the bodies this run actually forwarded.
function prefixAboveMessages(prev, cur) {
  const ourToolsIdentical = prev.outTools.sig === cur.outTools.sig;
  const ourSystemIdentical = prev.outSystem === cur.outSystem;
  return {
    ourToolsIdentical,
    ourSystemIdentical,
    ccToolsIdentical: prev.inTools.sig === cur.inTools.sig,
    ccSystemIdentical: prev.inSystem === cur.inSystem,
    intact: ourToolsIdentical && ourSystemIdentical,
  };
}

// The three answers of `prefixAboveMessages`, rendered once for every line
// that prints it (the stability violations above, the relocated-block
// departures below). ABSENT is its own answer and not a synonym for intact:
// a record with no tools/system hashes was never measured, and printing that
// as "INTACT -> the whole message array re-bills" reports the most expensive
// verdict on no evidence — dev-loop.md's "A checker has THREE answers",
// which this file has paid for three times.
export function prefixCostTag(p) {
  if (!p) return " [prefix above messages NOT MEASURED — record carries no tools/system hashes]";
  if (p.intact === false) {
    const what = [p.ourToolsIdentical ? null : "tools", p.ourSystemIdentical ? null : "system"]
      .filter(Boolean)
      .join("+");
    return ` [prefix ALREADY broken above messages: ${what} changed -> no marginal cost]`;
  }
  return " [prefix above messages INTACT -> the whole message array re-bills]";
}

function scanGroup(entries) {
  const violations = [];
  const exemptions = [];
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1];
    const cur = entries[i];

    // Per-message byte hashes, not the messages: firstDivergence compares
    // JSON.stringify of each element, and stringifying a hash of the bytes
    // yields the same first-difference index as stringifying the bytes.
    const prevInHash = adjustedInHash(prev);
    const curInHash = adjustedInHash(cur);
    const inDiv = firstDivergence(prevInHash, curInHash);
    const outDiv = firstDivergence(prev.outHash, cur.outHash);
    // Input append-only (inDiv === null) sets the bar at "output must be
    // append-only too": ANY output divergence is then self-inflicted.
    const bar = inDiv === null ? Infinity : inDiv;
    if (outDiv !== null && outDiv < bar) {
      // Was CC's OWN byte at the index we diverged on identical across the
      // pair? If yes the divergence is ours by construction — nothing
      // upstream changed there — and no probe is needed to establish it.
      //
      // Hand-derived three times on 2026-07-28 (rows 21 and 22, plus the
      // deferred-tool-rewrite pair), each time by writing a throwaway script
      // to print in[i] and out[i] for both requests. The throwaway probe is
      // the tell that a check is missing; both arrays are already in hand
      // here, so the answer costs one comparison.
      const ccSame = prevInHash[outDiv] === curInHash[outDiv];
      const record = {
        n: cur.n,
        prevN: prev.n,
        ts: cur.ts,
        key: cur.key,
        inDiv,
        outDiv,
        // true  => CC sent the same bytes there; the change is OURS.
        // false => CC also changed that message; ours may be amplification.
        ccIdenticalAtOutDiv: ccSame,
        // What the divergence COSTS, which `outDiv` alone cannot say. The API
        // bills the longest byte-identical prefix and the prefix is
        // [tools][system][messages]: a message-level flip re-bills only what
        // survived above it, so when OUR forwarded tools[] or system changed
        // across the same pair, the flip is free. `intact` is the OURS side
        // because ours is what goes on the wire; the cc* fields answer the
        // different question of whose change it was — the two came apart on
        // the row this field was built for (s-captureAB n=331->336: CC churned
        // tools 11->9 and its first system block 57->62 chars in the same
        // request, so an index-0 divergence on a ~413k-token session cost
        // nothing extra, after being carried into a handoff as the most
        // expensive item open).
        prefixAboveMessages: prefixAboveMessages(prev, cur),
      };
      const relocation = freshSessionSortExemption(cur, outDiv);
      const resetWipe = relocation ? null : resetWipesAdditionsExemption(prev, cur, bar, ccSame);
      const stranded = relocation || resetWipe
        ? null
        : memoryStrandedByKeyRotationExemption(prev, cur, outDiv, ccSame, record.prefixAboveMessages);
      if (relocation) {
        exemptions.push({
          ...record,
          exemptReason: "fresh-session-sort:first-appearance-relocation",
          exemptBasis: relocation,
        });
      } else if (resetWipe) {
        exemptions.push({
          ...record,
          exemptReason: "deferred-tool-rewrite:reset-wipes-additions",
          exemptBasis: resetWipe,
        });
      } else if (stranded) {
        exemptions.push({
          ...record,
          exemptReason: "fresh-session-sort:memory-stranded-by-key-rotation",
          exemptBasis: stranded,
        });
      } else {
        violations.push(record);
      }
    }
  }
  return { violations, exemptions };
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
// tool_addition blocks, or entirely the description-change notice the same
// extension announces a description absorb with (recognized by
// isDescriptionNotice, which lives beside the builder in
// deferred-tool-rewrite.mjs so template and recognizer cannot drift — the
// telemetry-keyed alternative fails both consumers: an input-side ECHO of an
// injection carries no telemetry, and the byte-stability exemption reads
// positions after the bodies are gone). Anything else appearing in
// messages[] is still a violation, free-text system messages included.
function isDeclaredInjection(msg) {
  if (!msg || msg.role !== "system" || !Array.isArray(msg.content) || !msg.content.length) return false;
  return msg.content.every((b) => b && b.type === "tool_addition") || isDescriptionNotice(msg);
}

// Per-entry, so it is evaluated as each request is replayed and nothing is
// retained. Exported on its own because the streaming caller wants one
// verdict at a time and findSafetyViolations wants the whole list — one
// implementation, two shapes, rather than a tested one and a shipped one.
// Declared SUPPRESSIONS (insertion-normalization's pin-and-suppress,
// #76606 decision B) are the mirror case of a declared injection: a
// message CC sent that the extension deliberately never forwards, because
// the pinned inline form at another position already carries its bytes.
// Filtered from the INPUT side only — there is nothing on the output side
// to filter, by definition, since the whole point is that it never
// appears there. The incoming index comes from the extension's OWN report
// (`stats.suppressions`, set by insertion-normalization's onRequest),
// never a re-derived "looks like a duplicate" guess — mirroring
// isDeclaredInjection's shape-based declaration with a telemetry-based one
// because a removed message, unlike an added one, carries no shape of its
// own to detect after the fact.
function suppressedIndices(stats) {
  return new Set((stats?.suppressions ?? []).map((s) => s.index));
}

// Not every declared suppression REMOVES a message from the wire. A join-move
// suppression is a SUBSTITUTION: insertion-normalization forwards the
// re-served first-seen bytes in the merged message's own slot, so the array
// keeps its length and the index spaces stay aligned. Only the removing kind
// may be filtered out to realign them.
//
// The distinction is load-bearing in both directions, and getting it wrong is
// how the first build of the move failed: treating a substitution as a removal
// shortens the input by one against an output that never shrank, which reads
// as a role mismatch on every subsequent message.
function wireRemovedIndices(stats) {
  return new Set((stats?.suppressions ?? []).filter((s) => s.kind !== "join-move").map((s) => s.index));
}

export function safetyViolation(e) {
  // Declared injections are removed from BOTH sides before comparing. The
  // filter was output-side only until 2026-07-29, which was correct while
  // injections could only ever originate in our pipeline — but an input can
  // carry an injection-shaped message too (a chained proxy feeding this
  // pipeline its own output; the fable acceptance-probe capture is the live
  // case). One-sided, the filter stripped the echoed injection from out and
  // not from in, and the first census-enabled sweep failed a capture over a
  // message nobody dropped — a check firing on a non-defect, found by
  // rule-out-the-instrument within the hour.
  const removed = wireRemovedIndices(e.stats);
  const inM = e.inMsgs.filter((m, i) => !isDeclaredInjection(m) && !removed.has(i));
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
    for (let i = 0; i < group.length; i++) {
      const e = group[i];
      const act = e.action;
      if (act === "normalized") normalizedAt = e.n;
      else if (act === "reset" && normalizedAt !== null && e.resetReason !== "no-prior-canonical") {
        // A reset is only OUR failure if CC's own history was append-only
        // across the pair. When CC genuinely rewrote history, resetting is
        // the correct response and flagging it is a check firing on a
        // non-defect — which trains its reader to ignore the ones that
        // matter.
        //
        // Same bar the stability gate already uses: `inDiv === null` means CC
        // changed nothing that was already sent. Measured 2026-07-28 on
        // capture s-captureL, request 109: CC replaced message 196 in place
        // ("yes lest do it all!" -> "lets do it all 13.x shuodl be ..."), so
        // reset(edit-shaped) was right and the sequence flag was noise. The
        // real cost of that event — our bytes moving at 177 while CC's were
        // identical — is the STABILITY gate's job, and it caught it.
        const prev = group[i - 1];
        const ccRewrote = prev ? firstDivergence(prev.inHash, e.inHash) !== null : false;
        if (!ccRewrote) {
          out.push({ n: e.n, ts: e.ts, normalizedAt, reason: e.resetReason });
        }
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

// Semantic identity WITH an occurrence ordinal, computed per array.
//
// Without the ordinal this collapsed repeats of the same message into one
// identity, and repeats are not rare: one measured history carried the
// recurring "The task tools haven't been used recently" reminder 44 times,
// byte-identical. Set- and index-based reasoning then treats 44 distinct
// entries as one, so a plain tail append can read as a mid-history splice.
//
// That is not a hypothetical either — it made findMitigationGaps report two
// `splice/insert-mid` misses on 2026-07-28 where the extension had correctly
// reported `append-only`. The extension was right and the census was wrong,
// because insertion-normalization's own `identityKey` is `hash|role|occurrence`
// and has carried the ordinal all along. This makes the two agree.
export function semanticIds(msgs) {
  const seen = new Map();
  return msgs.map((m) => {
    const base = `${m?.role ?? "?"}:${sha(JSON.stringify(semanticCore(m)))}`;
    const o = seen.get(base) ?? 0;
    seen.set(base, o + 1);
    return `${base}#${o}`;
  });
}

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
  if (!Array.isArray(tools)) return { sig: null, order: null, set: null, count: null, byName: null };
  const names = tools.map((t) => t?.name ?? "?");
  // Per-name hash, not the schema itself — same byte-conservation discipline
  // as compactEntry's inHash/outHash. This is what lets heldStable (below)
  // compare the SHARED-name subset of a pair without retaining either side's
  // full tool bodies.
  const byName = {};
  for (const t of tools) byName[t?.name ?? "?"] = sha(JSON.stringify(t));
  return {
    sig: sha(JSON.stringify(tools)), // full schemas — catches a description edit
    order: sha(JSON.stringify(names)), // names in wire order
    set: sha(JSON.stringify([...names].sort())), // membership, order-blind
    count: tools.length,
    byName,
  };
}

// Output-side identity for findMitigationGaps' outputForm/outputPreserved/
// rebilledOutBytes ONLY. `outHash` below (used by the STABILITY check,
// `scanGroup`) stays byte-raw and untouched — byte-stability is the wire
// truth, and weakening it would let a real re-billed byte hide behind this
// strip.
//
// DEFINITION: cache_control designates a cache breakpoint, not conversation
// content. A pair of forwarded messages that differ ONLY in whether/where a
// cache_control block is attached carries identical model-visible bytes;
// counting that as a splice prices a cost nothing actually incurred.
// Measured (flap-probe, capture s-captureA-...): CC itself sends an
// identical 32,140-char text as a cache_control-bearing block while it is
// the tail, then as a bare string once it is not, in its own pre-pipeline
// bytes (n=678->681 and four siblings: 564->565, 354->356, 267->268,
// 566->568 — deferredToolRewriteStats inert on all five,
// findStabilityViolations 0 on the whole capture — CC's own shape choice,
// not ours). `compactEntry`'s `outHash` (below) hashes raw
// `JSON.stringify(message)` with no strip, unlike the input-side identity
// path (`semanticCore`, above) — the same input-side blind-spot class,
// unfixed on the output side until now.
//
// Strips cache_control via the shared primitive (`hashMessageContent`,
// imported) — never a second hand-rolled variant, per dev-loop.md's "never
// hand-roll identity in a probe" — promoting bare-string content to the
// same single-block array form `semanticCore` already uses for the
// identical reason (a bare string and a one-block text array are the same
// message under any of this file's identity notions). Deliberately NOT
// `semanticCore`: that also drops volatile system-reminder blocks, a
// broader normalization this question does not ask for — only the
// cache_control removal mirrors "the input side" here.
function outputContentHash(m) {
  const c = m?.content;
  const content = typeof c === "string" ? [{ type: "text", text: c }] : Array.isArray(c) ? c : [];
  return sha(JSON.stringify([m?.role ?? null, hashMessageContent({ content })]));
}

// Every `cache_control` key dropped, at any depth, and NOTHING else changed —
// the container, the block order, the block types and every other field survive
// byte-for-byte. Exported because `absorption-classify` needs the identical
// notion one process boundary away, and two hand-rolled strips would drift
// (dev-loop.md, "never hand-roll identity in a probe").
//
// The narrowness is the point, and it is what separates this from
// `outputContentHash` above: that one ALSO folds bare-string content into a
// one-block text array, so a row-4 container flip hashes equal under it. A
// cache_control annotation computed from that hash would exempt the very
// defect `findAbsorptionMisses` was built for — the parentage error, one field
// over. Container-preserving, or the annotation is worse than none.
export function stripCacheControlDeep(x) {
  if (Array.isArray(x)) return x.map(stripCacheControlDeep);
  if (x && typeof x === "object") {
    const out = {};
    for (const [k, v] of Object.entries(x)) {
      if (k === "cache_control") continue;
      out[k] = stripCacheControlDeep(v);
    }
    return out;
  }
  return x;
}

// The relocation ORDER fresh-session-sort prepends in, reused here only to
// make `inReloc` deterministic across runs (a Map's insertion order would
// otherwise depend on where in the array each type happened to sit).
const RELOC_TYPES = ["deferred", "mcp", "skills", "hooks"];

// The LAST instance of each relocatable <system-reminder> type in a message
// array, as {type, msgIdx} — at most four entries, indices only, no bodies
// (the heap discipline that lets this gate run on a 1 GB capture).
//
// "Last" mirrors the extension, which scans BACKWARDS and keeps the newest
// instance of each type; `findRelocDepartures` reads only PRESENCE, so the
// index is context for the reader rather than part of the comparison.
// Membership and typing are IMPORTED (`isRelocatableBlock` / `getBlockType`),
// never restated — a checker that re-derives the predicate it checks drifts
// from the code silently, and both predicates already live one import away.
// POPULATION, decided rather than defaulted: the same one the extension scans
// — user-role messages from the first user message onward
// (fresh-session-sort.mjs `onRequest`). A relocatable block anywhere else is
// invisible to the extension, so counting its disappearance as a departure
// would report a class the mitigation was never in a position to hold. The two
// populations coincide on real traffic (all four predicates require a leading
// `<system-reminder>`, which CC injects only into user messages), which is
// exactly why the narrower one costs nothing and the wider one could drift
// without anyone noticing.
function lastRelocByType(msgs) {
  const last = new Map();
  const firstUserIdx = msgs.findIndex((m) => m?.role === "user");
  if (firstUserIdx === -1) return [];
  for (let i = firstUserIdx; i < msgs.length; i++) {
    const content = msgs[i]?.content;
    if (msgs[i]?.role !== "user" || !Array.isArray(content)) continue;
    for (const b of content) {
      const text = b?.text ?? "";
      if (!isRelocatableBlock(text)) continue;
      const type = getBlockType(text);
      if (type !== null) last.set(type, i);
    }
  }
  return RELOC_TYPES.filter((t) => last.has(t)).map((t) => ({ type: t, msgIdx: last.get(t) }));
}

export function compactEntry(e) {
  const inMsgs = e.inMsgs ?? [];
  const outMsgs = e.outMsgs ?? [];
  // One derivation of the input-side block units, two projections. `inBlocks`
  // below is the text-free one this entry retains; `inJoins` is the other, and
  // it has to be computed HERE rather than by the checker because a join is a
  // concatenation and hashes do not concatenate — reconstructing a join hash
  // from `inBlocks` is impossible, and retaining the text to do it later is
  // the O(file) retention class this file has paid for three times already.
  // Two extra hash strings per message, both null for the overwhelming
  // majority of them (a message with no reminder-wrapped block produces
  // neither), against one string per BLOCK that inBlocks already keeps.
  const inUnits = inMsgs.map(blockUnitsFull);
  return {
    n: e.n,
    ts: e.ts,
    // Retained for the same reason `full` carries it: the only join back to
    // the capture file that survives the line-vs-request namespace split.
    id: e.id ?? null,
    key: e.key,
    inHash: inMsgs.map((m) => sha(JSON.stringify(m))),
    // Byte length per message. Numbers, not content — this is what lets a
    // missed mitigation be priced (everything from the divergence index on is
    // re-billed) without retaining a single message body.
    inBytes: inMsgs.map((m) => JSON.stringify(m).length),
    // Index of the last HUMAN-TYPED message, computed here because compact
    // entries carry no content. This is what turned row 4 from "mystery
    // swaps" into "reminder re-stamping at the anchor" (2026-07-29: 20 of 22
    // human-anchored mid-history edits within +/-2 of this index) — the
    // census could name WHAT and WHERE, but WHY needed the edit position
    // related to conversation STRUCTURE, and that relation was derived by a
    // throwaway script before it lived here.
    inLastHuman: inMsgs.reduce((acc, m, i) => (isHumanTurn(m) ? i : acc), -1),
    outHash: outMsgs.map((m) => sha(JSON.stringify(m))),
    // cache_control-stripped twin of outHash, for findMitigationGaps'
    // outputForm ONLY (see outputContentHash above) — never read by the
    // stability check.
    outHashSem: outMsgs.map(outputContentHash),
    // The OTHER cache_control-stripped twin, and the two are not
    // interchangeable: this one preserves the container (stripCacheControlDeep
    // above), so a moved breakpoint hashes equal here while a row-4 container
    // flip does not. Read by findAbsorptionMisses' `cacheControlOnly` and by
    // nothing else. One hash string per message, the same order of retention
    // as the three arrays above it — no bodies, so the 2 GB child cap is
    // unaffected.
    outHashNoCC: outMsgs.map((m) => sha(JSON.stringify(stripCacheControlDeep(m)))),
    // Byte length per FORWARDED message, the output-side twin of inBytes —
    // what lets rebilledOutBytes be priced without retaining a message body.
    outBytes: outMsgs.map((m) => JSON.stringify(m).length),
    inSem: semanticIds(inMsgs),
    // Which relocatable block types CC sent in THIS (pre-pipeline) request,
    // and where the last instance of each sat. The PRESENCE axis threat-matrix
    // row 25 turns on — `findRelocDepartures` is the consumer, and it is the
    // only thing that survives here: hashes and indices, never a block body.
    inReloc: lastRelocByType(inMsgs),
    inBlocks: inUnits.map((us) => us.map(({ hash, wrapped, standalone }) => ({ hash, wrapped, standalone }))),
    // The two join hashes of message i, by the SAME "\n\n" rule the extension
    // and the conservation gate use (joinUnitHash / crossJoinUnitHash — one
    // definition of a join in this file, not three): `self` is the join of
    // this message's own reminder-wrapped blocks, `cross` the join of them
    // with the WHOLE of the next message. scanJoinMigrations is the consumer.
    inJoins: inUnits.map((us, i) => ({
      self: joinUnitHash(us),
      cross: i + 1 < inUnits.length ? crossJoinUnitHash(us, inUnits[i + 1]) : null,
    })),
    msgs: inMsgs.length,
    inTools: toolsFingerprints(e.inTools),
    outTools: toolsFingerprints(e.outTools),
    // The rest of the cache prefix. tools[] and system render BEFORE messages,
    // so whether either moved decides what a message-level divergence actually
    // COSTS (scanGroup's prefixAboveMessages). Hashes, not bodies — the system
    // prompt is up to tens of KB and this file's heap discipline is why the
    // gate can run on a 1 GB capture at all.
    inSystem: sha(JSON.stringify(e.inSystem ?? null)),
    outSystem: sha(JSON.stringify(e.outSystem ?? null)),
    // The FIRST system block's sub-key, by the extensions' own keying
    // (systemPromptSubKey, imported — never restated). This is the component
    // of resolveInsertionSessionKey that rotates when CC swaps its identity
    // line mid-conversation, stranding every per-conversation memory filed
    // under the old key; memoryStrandedByKeyRotationExemption reads it.
    // Distinct from inSystem above, which hashes the WHOLE system array — a
    // change in a later block moves inSystem without rotating any key.
    inSysSub: systemPromptSubKey(e.inSystem),
    action: e.action ?? null,
    resetReason: e.resetReason ?? null,
    stats: e.stats ?? null,
    // fresh-session-sort's own report of a relocation (telemetry-keyed
    // exemption for the stability check below) — never re-derived from
    // outHash shape, same discipline as `stats.suppressions`.
    freshSessionSortStats: e.freshSessionSortStats ?? null,
    contentStripStats: e.contentStripStats ?? null,
    // deferred-tool-rewrite's own report (action/reason), the key for
    // resetWipesAdditionsExemption. Retained for the same reason
    // freshSessionSortStats is: an exemption keyed on shape is an exemption
    // that drifts. Absent until 2026-08-01, which is why the reset-wipes-
    // additions attribution had to re-run the whole pipeline in a probe.
    deferredToolRewriteStats: e.deferredToolRewriteStats ?? null,
    // smoosh-split's own report (peeled count), the conservation gate's
    // declared-peel exemption key — same discipline as
    // freshSessionSortStats and deferredToolRewriteStats above: an
    // exemption keyed on shape drifts, one keyed on the extension's own
    // telemetry does not.
    smooshSplitStats: e.smooshSplitStats ?? null,
    // WHERE the declared tool_addition announcements sit in the forwarded
    // array. Positions, not messages — the exemption has to remove them from
    // the comparison, and a hash array cannot be filtered by a shape test
    // after the bodies are gone. `isDeclaredInjection` is the same predicate
    // the safety gate already declares an injection by; the extension's own
    // telemetry reports only how MANY additions were live, never their
    // indices, so this is the one place the position can be read.
    outInjections: outMsgs.reduce((acc, m, i) => (isDeclaredInjection(m) ? (acc.push(i), acc) : acc), []),
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
      // forwardedStable is a whole-array claim: a genuine new tool announced
      // between p and c always moves the signature, so it reads "unstable"
      // even when everything CC already knew about round-tripped untouched.
      // heldStable narrows to what deferred-tool-rewrite actually guarantees
      // — the SHARED-name subset (present on both sides) stays byte-stable —
      // so a real addition is excluded from the comparison, not counted
      // against it (BACKLOG "forwardedStable was a census framing gap").
      let heldStable;
      if (p.outTools.byName === null || c.outTools.byName === null) {
        heldStable = false; // no forwarded-tools data — same "not proven stable" stance as forwardedStable's null guard
      } else {
        const sharedNames = Object.keys(p.outTools.byName)
          .filter((n) => Object.prototype.hasOwnProperty.call(c.outTools.byName, n))
          .sort();
        heldStable = sharedSig(p.outTools.byName, sharedNames) === sharedSig(c.outTools.byName, sharedNames);
      }
      rows.push({
        n: c.n,
        prevN: p.n,
        ts: c.ts,
        kind,
        msgKind,
        // The isolating case row 6 asks for: tools moved, history did not.
        toolsOnly: msgKind === "identical" || msgKind === "append-only",
        forwardedStable: p.outTools.sig !== null && p.outTools.sig === c.outTools.sig,
        heldStable,
        count: `${p.inTools.count}->${c.inTools.count}`,
        outCount: `${p.outTools.count}->${c.outTools.count}`,
      });
    }
  }
  return rows.sort((a, b) => a.n - b.n);
}

// heldStable's comparison, factored out: the byte signature of one side's
// tool bodies restricted to `names` (already the shared-name subset,
// pre-sorted by the caller so both sides hash in the same order).
const sharedSig = (byName, names) => sha(JSON.stringify(names.map((n) => byName[n])));

const asCompact = (e) => (e.inHash ? e : compactEntry(e));

// Conversation identity from the compact form: the first message's byte hash
// is exactly what conversationId hashed before.
// Exported: any tool comparing two requests of one conversation MUST use
// this identity rather than capture adjacency or index alignment. Both
// alternatives are silently wrong on interleaved traffic (see the note
// above), and a second tool restating the rule is how the two drift.
export const conversationOf = (e) => (e.inHash.length ? e.inHash[0] : null);

// The threat-matrix coverage note ("hidden duplicate request", CC#78420,
// v2.1.209+) was answered 2026-07-29 by a throwaway python scan over raw
// capture bytes ("adjacent byte-identical bodies: one instance total ...
// across 3,446 requests in seven captures") — exactly the shape dev-loop.md
// calls the tell that a classification is missing from the tools.
// Mechanized here per BACKLOG's "Duplicate-request probe -> census check
// (Q1)" so the same falsifier re-answers on every sweep instead of being
// re-derived by hand.
//
// DEFINITION: a duplicate is an ADJACENT same-conversation pair whose
// incoming message arrays are byte-identical — same length, same
// per-message hash at every index (inHash, the raw wire-byte hash
// compactEntry already computes — unstripped, unlike the semantic ids
// censusIds uses elsewhere, because "byte-identical" is the wire claim
// #78420 makes). A genuine conversation turn always changes SOMETHING in
// the sent history (a new message, an edited tail); an unchanged array
// crossing the wire twice is a resend, not a turn. An empty array pair
// (no content sent) is excluded — it is not evidence of anything resent.
export function findDuplicateRequests(entries) {
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
      const prev = group[i - 1];
      const cur = group[i];
      if (prev.inHash.length === 0 || prev.inHash.length !== cur.inHash.length) continue;
      const identical = prev.inHash.every((h, idx) => h === cur.inHash[idx]);
      if (!identical) continue;
      rows.push({ n: cur.n, prevN: prev.n, ts: cur.ts, msgs: cur.inHash.length });
    }
  }
  return rows.sort((a, b) => a.n - b.n);
}

export function censusPair(a, b) {
  return censusIds(semanticIds(a), semanticIds(b));
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

// --- Mitigation gaps: did we actually HELP, not just "not make it worse"? ---
//
// The gates ask whether we made things WORSE — output diverging earlier than
// CC's input, a corrupted sequence, content lost off the wire. They are all
// silent on the opposite failure: CC did something this proxy exists to
// absorb, and the extension declined to act. A reset forwards CC's bytes
// faithfully, so it is invisible to every gate while costing the full rewrite.
//
// That blind spot cost a real answer on 2026-07-28. A 484k `messages_changed`
// bust (event 14) had all four gates green, and establishing that we had NOT
// mitigated it took hand-reading extension telemetry. Fifteen seconds before
// the bust, insertion-normalization had reset with `not-subsequence`.
//
// Both halves of the answer already existed and nothing joined them: the
// census classifies what CC did, and the extension records per request whether
// it normalized or reset. This is the join.
//
// MITIGABLE is deliberately narrow — only classes this proxy claims to absorb.
// A `replace/edit` is an honest history rewrite (threat-matrix row 4/22) and
// `drop-only` is a prune; counting either as a miss would inflate the number
// with events no mitigation should touch.
const MITIGABLE = new Set(["splice/insert-mid", "append-after-change", "reorder-only"]);

// `mitigated` above is an INPUT-side fact and nothing more: it trusts
// insertion-normalization's own self-report that it re-serialised CC's
// splice into an append, and prices the miss from CC's OWN divergence
// index (`prev.inHash` vs `cur.inHash`). It never looks at what we actually
// forwarded. That is a real, narrower claim than "the cache was preserved" —
// an extension can correctly stabilise the shared input prefix (earning
// `mitigated: true`, `rebilledBytes: 0`) and still choose to forward the
// new content by SPLICING it mid-array instead of appending it at the tail.
// The API keys its cache on the longest byte-identical PREFIX of the
// message array, so a mid-array splice moves that boundary earlier and
// re-bills everything after it — the exact cost `mitigated` claims was
// avoided. Measured: capture s-captureA, pair n=26->28 — input-side
// `mitigated: true`, `rebilledBytes: 0`, while the forwarded array kept a
// byte-stable prefix through index 30 and then spliced a standalone system
// message in at index 31, re-billing everything from there (outcome record:
// cacheRead 15424 / cacheCreation 124025 — a splice/insert-mid signature on
// the WIRE, invisible to the input-only check).
//
// `outputForm` names that OUTPUT-side relation directly, reusing the same
// census primitive already used for input (`censusIds`/`firstDivergence`)
// against `outHash`/`outBytes` instead of `inHash`/`inBytes` — never a new
// notion of identity, per "never hand-roll identity in a probe":
//   "append"     — cur's forwarded array is a strict positional prefix
//                  extension of prev's (censusIds "identical" /
//                  "append-only"): nothing already sent moved position, so
//                  the cache's longest-identical-prefix boundary is
//                  unaffected. `outputPreserved` is exactly this case.
//   "splice@N"   — censusIds "splice/insert-mid" on the output arrays: every
//                  message we already forwarded still exists, but new
//                  content lands BEFORE the last surviving one, at index N —
//                  content shifted, cache broken from N on even though
//                  nothing was dropped. This is the class `mitigated: true`
//                  can hide, because insertion-normalization's own
//                  self-report is about the INPUT reconstruction, not about
//                  where the result got serialised in the output.
//   "edit@N"     — any other non-append output relation (reorder, drop,
//                  replace) with the output arrays first diverging at N,
//                  before the tail.
// `mitigated` keeps its existing input-side meaning unchanged; a pair can
// be `mitigated: true` and `outputPreserved: false` at once, and that
// combination — not `mitigated` alone — is what determines whether the
// cache was actually preserved.
export function findMitigationGaps(entries) {
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
      const prev = group[i - 1];
      const cur = group[i];
      const kind = censusIds(prev.inSem, cur.inSem);
      if (!MITIGABLE.has(kind)) continue;
      // "normalized" is the only action that re-serialises the splice into an
      // append. append-only and reset both forward CC's array as it came.
      const mitigated = cur.action === "normalized";
      // What a passthrough costs: the cache keys on the longest identical
      // prefix, so every message from CC's own divergence index onward is
      // re-billed.
      const inDiv = firstDivergence(prev.inHash, cur.inHash);
      const from = inDiv === null ? cur.inBytes.length : inDiv;
      const rebilled = cur.inBytes.slice(from).reduce((a, b) => a + b, 0);

      // Output-side classification — see the block comment above. Uses
      // outHashSem (cache_control stripped, see outputContentHash), not the
      // stability check's raw outHash — a cache_control-only relocation is
      // not a content splice (outputContentHash's definitional comment).
      const outKind = censusIds(prev.outHashSem, cur.outHashSem);
      const outDiv = firstDivergence(prev.outHashSem, cur.outHashSem);
      let outputForm;
      if (outKind === "identical" || outKind === "append-only") {
        outputForm = "append";
      } else if (outKind === "splice/insert-mid") {
        outputForm = `splice@${outDiv}`;
      } else {
        outputForm = `edit@${outDiv}`;
      }
      const outputPreserved = outputForm === "append";
      const outFrom = outDiv === null ? cur.outBytes.length : outDiv;
      const rebilledOutBytes = outputPreserved
        ? 0
        : cur.outBytes.slice(outFrom).reduce((a, b) => a + b, 0);

      rows.push({
        n: cur.n,
        prevN: prev.n,
        ts: cur.ts,
        kind,
        mitigated,
        action: cur.action,
        resetReason: cur.resetReason,
        rebilledBytes: mitigated ? 0 : rebilled,
        // The same computed number, retained on the branch that used to
        // discard it: what this mitigation ABSORBED, priced identically to
        // what a miss would have leaked. Complement of rebilledBytes by
        // construction (their sum is always `rebilled`) — the fire ledger's
        // saved column reads it (gate-live summariseFireBytes).
        savedBytes: mitigated ? rebilled : 0,
        outputForm,
        outputPreserved,
        rebilledOutBytes,
      });
    }
  }
  return rows.sort((a, b) => b.rebilledBytes - a.rebilledBytes);
}

// Where does a `replace/edit` actually land — the TAIL, or mid-history?
//
// Threat-matrix row 4 was closed on 2026-07-28 as ACCEPTED-cheap because every
// measured instance mutated the LAST message: CC appends content blocks into
// the final user message on an interruption, and a cache keys on the longest
// identical prefix, so rewriting the final message re-bills that message
// alone. A MID-history edit is a different animal — everything after it is
// re-billed — and the row says in as many words to re-open if a non-tail
// instance is ever measured.
//
// That verdict rested on census numbers taken BEFORE semanticIds carried an
// occurrence ordinal, and the ordinal changed the replace/edit population
// (16 -> 20 on one session). So the question needs asking mechanically rather
// than re-derived by hand each time the corpus moves.
// Local-only content excerpt for a flagged edit position. The census is
// content-blind by design (hashes scale and are publishable) — which is why
// row 4 sat unexplained while the bytes that named the mechanism were one
// read away. When the far-from-anchor tripwire fires, the human output now
// DELIVERS the evidence instead of leaving its extraction to a throwaway
// script. Stdout of a local run only: this never enters the JSON output,
// the gate status file, or anything committed.
export function excerptMessage(msg, cap = 180) {
  if (!msg) return "(missing)";
  const c = msg.content;
  let text = "";
  if (typeof c === "string") text = c;
  else if (Array.isArray(c)) {
    text = c
      .map((b) =>
        b?.type === "text" ? b.text : b?.type ? `[${b.type}]` : "[?]",
      )
      .join(" ");
  }
  const flat = text.replace(/\s+/g, " ").trim();
  return `${msg.role ?? "?"}: ${flat.length > cap ? flat.slice(0, cap) + "…" : flat || "(no text)"}`;
}

// Fetch the excerpted messages a report asks for, joining each ask to its
// capture record by the record's OWN id.
//
// Why an id and not an ordinal (measured 2026-08-06, capture s-captureAM):
// this pass used to key its asks by the census ordinal `n` and match them
// against `readCapture`'s index, which numbers every non-blank LINE. The two
// namespaces differ by every outcome and boot record — main()'s read loop
// documents exactly that hazard 500 lines further down and this pass walked
// into it. Live: 5 of 6 asks printed "(missing)" (the ask hit an outcome
// record, which carries no body) and the sixth printed a request from eleven
// minutes earlier as though it were the bytes at the divergence.
//
// Three answers, not two (docs/dev-loop.md): a record that has no message at
// the asked index says "(missing)", and an ask whose record was never found
// says so in its own words — the two are different findings and collapsing
// them is how an absence wears a verdict's clothes.
//
// asks: [{ id, at, label }]. Returns them in the order given, each with an
// `excerpt` string. Streams the capture once; stops as soon as every ask is
// answered.
export async function excerptsForAsks(file, asks) {
  const want = new Map();
  for (const a of asks) {
    if (a.id === null || a.id === undefined) continue;
    if (!want.has(a.id)) want.set(a.id, []);
    want.get(a.id).push(a);
  }
  const found = new Map();
  if (want.size) {
    for await (const [, line] of readCapture(file)) {
      let rec;
      try {
        rec = JSON.parse(line);
      } catch {
        continue;
      }
      // Outcome records share the request's id and carry no body; a boot
      // record has neither. Skipping them by TYPE rather than by "no body"
      // keeps a malformed request record reporting as an unanswered ask
      // instead of silently reading as a body-less outcome.
      if (rec.type === "outcome" || rec.type === "boot") continue;
      const here = want.get(rec.id);
      if (!here) continue;
      for (const a of here) {
        found.set(a, excerptMessage(rec.body?.messages?.[a.at]));
      }
      want.delete(rec.id);
      if (want.size === 0) break;
    }
  }
  return asks.map((a) => ({
    ...a,
    excerpt:
      found.get(a) ??
      (a.id === null || a.id === undefined
        ? "(row carries no capture id — nothing to join on)"
        : `(no request record with id ${a.id} in this capture)`),
  }));
}

// A message the human actually typed: user role carrying at least one text
// block that is neither a tool_result nor a tagged injection (reminders,
// notifications, caveats all start with "<"). Computed at compaction time
// because the census itself sees only hashes.
export function isHumanTurn(m) {
  if (m?.role !== "user") return false;
  const c = m.content;
  if (typeof c === "string") return !c.trimStart().startsWith("<");
  if (!Array.isArray(c)) return false;
  return c.some((b) => {
    if (b?.type !== "text" || typeof b.text !== "string") return false;
    const t = b.text.trimStart();
    return t.length > 0 && !t.startsWith("<");
  });
}

// --- Absorption misses: did a mitigation that RAN actually ABSORB? ---
//
// WHY THIS EXISTS, and it is the most expensive gap this file has had. On
// 2026-08-05 a 349,004-token bust replayed EXIT 0 — stability 0, safety 0,
// conservation 0, sequence 0, canonical order 0 — and every one of those
// verdicts was correct. Stability asks whether OUR output diverged EARLIER
// than CC's input; CC diverged at the same logical slot, so we did not make
// it worse and green was the honest answer. Nothing asked the question that
// mattered.
//
// insertion-normalization reported `movedFresh: 2` on that request: it
// RECOGNIZED both container migrations and substituted at their indices. The
// forwarded prefix then diverged at the very slot it had just substituted,
// because the canonical held the message in the container CC used FIRST (a
// block array carrying a cache_control breakpoint) while the wire had been a
// bare string for 26 requests. Right text, right index, stale envelope — and
// a wrong container diverges a prefix exactly as much as wrong bytes.
//
// "The mitigation ran" and "the mitigation absorbed" came apart, one line
// from each other in the same telemetry, and only a human reading both
// noticed. That is the same split `movedFresh`/`movedRefires` was minted for,
// one level up: there it separated a fresh recognition from a re-fire, here it
// separates a recognition from an effect.
//
// A REPORT, NOT A GATE, deliberately. Its corpus-wide rate is unmeasured, and
// a check that blocks before anyone knows how often it fires on legitimate
// work is how a guard trains the reader to discount it — this file's own
// repeated lesson. Measure first, promote later if the rate justifies it.
//
// THE THREE NUMBERS are what turned this bust from a puzzle into a mechanism,
// so each row carries all three: where the absorption claimed to act, where
// the forwarded pair actually diverged, and whether CC's own input diverged
// there too. The third is what says whose defect it is — a miss with CC's
// input identical at that index is OURS by construction.
//
// Raw `outHash`, not `outHashSem`: the semantic hash strips cache_control,
// and the measured defect was a container flip that rides alongside exactly
// that field. A check that normalises away the shape it exists to catch is
// the same parentage error this file warns about elsewhere.
export function findAbsorptionMisses(entries) {
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
      const prev = group[i - 1];
      const cur = group[i];
      const st = cur.stats ?? {};
      // Every shape of "we claimed to absorb something on THIS request".
      // Re-fires are excluded on purpose: a re-fire re-serves an entry that
      // was already being substituted, so its slot diverging says nothing new.
      const joinMoves = (x) => new Set(
        (x.stats?.suppressions ?? [])
          .filter((s) => s && s.kind === "join-move" && Number.isInteger(s.index))
          .map((s) => s.index));
      // FRESH = substituted here and not on the predecessor. The suppressions
      // array does not distinguish a fresh recognition from a re-fire, and the
      // difference decides the whole check: on the measured bust the re-fires
      // sat at 180/221 and the fresh ones at 370/402, so taking the list at
      // face value compared the divergence against an index absorbed a request
      // earlier and skipped the very row this exists to print.
      const prevMoves = joinMoves(prev);
      const fresh = [...joinMoves(cur)].filter((i) => !prevMoves.has(i));
      const claims = (st.movedFresh ?? 0) > 0
        || (st.descriptionAbsorbed ?? 0) > 0
        || (st.oscillationAbsorptions ?? 0) > 0;
      if (!claims || !fresh.length) continue;

      const outDiv = firstDivergence(prev.outHash, cur.outHash);
      if (outDiv === null) continue;            // absorbed and the prefix held
      // The two indices live in DIFFERENT COORDINATE SPACES: `fresh` are raw
      // wire positions, `outDiv` is a position in the forwarded array, which
      // is shorter because suppression removed messages before it (measured:
      // raw 370 forwards as 360). The mapping is not a simple count — other
      // stages move entries too — so rather than reconstruct it and be subtly
      // wrong, compare against the HIGHEST fresh index. Raw >= forwarded
      // always, so this cannot miss a real miss; the cost is that a divergence
      // in the gap between the two spaces reads as a hit, which for a REPORT
      // is the right direction to be wrong in.
      if (outDiv > Math.max(...fresh)) continue;   // diverged past the absorption

      const inDiv = firstDivergence(prev.inHash, cur.inHash);
      // Did the divergence survive dropping every cache_control marker?
      //
      // A pair identical at outDiv once the markers are gone carries the same
      // model-visible bytes: the API keys its cache on content and reads a
      // cache_control marker as the designation of a write point, so the
      // marker moving down the array as the conversation grows re-bills
      // nothing. Measured 2026-08-05 across the corpus: our own
      // cache-control-normalize (order 400) re-places one canonical marker on
      // the last block of the last user message every request, so the message
      // at the OLD position loses it and this raw-byte check calls it a miss —
      // 26 of the 34 rows in the corpus, and 32 of 34 rows have no cold event
      // in the same session within +/-180 s over all 83 worktime-ledger
      // events — while that same query lands both 349k events on the one row
      // that was real, which is what makes the zeros mean anything.
      //
      // Annotated rather than dropped, and detection stays on raw `outHash`:
      // the raw bytes are what the row-4 container flip diverges in, and a
      // check that normalises away the shape it exists to catch is worthless.
      // The repair for a check that fires on a non-defect is a declared
      // exemption the guard itself verifies — this field is that declaration,
      // computed from telemetry the entry already carries.
      //
      // `null`, never `false`, when the entry predates the field: "the producer
      // never emitted this" is not "measured, and it is content".
      const noCCPrev = prev.outHashNoCC;
      const noCCCur = cur.outHashNoCC;
      let cacheControlOnly = null;
      if (Array.isArray(noCCPrev) && Array.isArray(noCCCur)) {
        const ccDiv = firstDivergence(noCCPrev, noCCCur);
        cacheControlOnly = ccDiv === null || ccDiv > outDiv;
      }
      rows.push({
        n: cur.n,
        prevN: prev.n,
        ts: cur.ts,
        absorbedFreshAt: fresh.slice().sort((a, b) => a - b),
        forwardedDivergence: outDiv,
        inputDivergence: inDiv,
        cacheControlOnly,
        // The attribution, stated rather than left to the reader: if CC's own
        // arrays are identical at the index where ours diverge, nothing
        // upstream changed there and the divergence is ours.
        ours: inDiv === null || inDiv > outDiv,
        movedFresh: st.movedFresh ?? 0,
        action: cur.action ?? null,
      });
    }
  }
  return rows;
}

// Threat-matrix row 25, asked of the whole corpus instead of of one hand-read
// pair. The mitigation (65d0455, fresh-session-sort's per-conversation
// relocation memory) shipped on a single measured occurrence; what nobody
// knows is the class's RATE, and that is what this counts.
//
// DEFINITION, written before the code: a relocated-block DEPARTURE is a
// consecutive SAME-CONVERSATION pair (prev, cur) in which a relocatable
// <system-reminder> type is PRESENT somewhere in prev's pre-pipeline message
// array and ABSENT everywhere in cur's. Presence is the entire axis. A type
// that MOVED to another index has not departed (the relocation is
// index-independent), and a type whose BYTES changed has not departed either
// (CC's newer bytes simply win) — only a type CC stops sending is the case
// the memory exists to cover, because before the fix the extension re-derived
// its relocated set from the CURRENT array and our forwarded messages[0] lost
// the block while CC's own messages[0] was byte-identical: CC's edit at index
// k became OUR edit at index 0. One row per departing TYPE, so a pair that
// drops two types yields two rows.
//
// `prefixAboveMessages` is what separates a costly departure from a free one,
// and it is why a bare total answers nothing: row 25's own occurrence
// (s-captureAB n=331->336) had CC churning tools[] 11->9 and its first system
// block in the SAME request, so the prefix was already broken two levels above
// messages and an index-0 divergence on a ~413k-token session cost nothing.
// `intact: true` is the sub-count that says whether the mitigation was worth
// shipping, and the summary prints it separately for that reason.
//
// A REPORT, never a gate: it touches no exit code and no verdict. Always on
// rather than behind --census, for `findAbsorptionMisses`' reason — the whole
// point of the class is that nobody knows to look for it.
export function findRelocDepartures(entries) {
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
      const prev = group[i - 1];
      const cur = group[i];
      const present = new Set((cur.inReloc ?? []).map((r) => r.type));
      for (const { type, msgIdx } of prev.inReloc ?? []) {
        if (present.has(type)) continue;
        rows.push({
          n: cur.n,
          prevN: prev.n,
          ts: cur.ts,
          key: cur.key,
          type,
          // Raw WIRE index, in CC's pre-pipeline array — not a forwarded one.
          // The two coordinate spaces differ by whatever the pipeline removed
          // (measured elsewhere in this file: raw 370 forwards as 360), so the
          // name says which space it is in.
          prevMsgIdx: msgIdx,
          prefixAboveMessages: prefixAboveMessages(prev, cur),
        });
      }
    }
  }
  return rows.sort((a, b) => a.n - b.n);
}

export function findEditPositions(entries) {
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
      const prev = group[i - 1];
      const cur = group[i];
      if (censusIds(prev.inSem, cur.inSem) !== "replace/edit") continue;
      // First position where the two histories stop agreeing semantically.
      let at = 0;
      const lim = Math.min(prev.inSem.length, cur.inSem.length);
      while (at < lim && prev.inSem[at] === cur.inSem[at]) at++;
      const lastIdx = cur.inSem.length - 1;
      // Everything from the edit onward is re-billed.
      const rebilled = cur.inBytes.slice(at).reduce((a, b) => a + b, 0);
      rows.push({
        n: cur.n,
        prevN: prev.n,
        ts: cur.ts,
        // Both sides' capture-record ids and the predecessor's timestamp. A
        // consumer that goes back to the file for bytes joins on these; `n`
        // and `prevN` are report ordinals and join to nothing on disk.
        id: cur.id ?? null,
        prevId: prev.id ?? null,
        prevTs: prev.ts,
        at,
        lastIdx,
        tail: at >= lastIdx,
        rebilledBytes: rebilled,
        // Structural context (see compactEntry's inLastHuman note): where the
        // edit sits relative to the last human-typed message. anchorDelta 0
        // means the anchor message itself was re-stamped; small negative
        // values are the injected-block zone just before it; null means no
        // human turn exists (subagent/sidecar conversation).
        lastHumanAt: cur.inLastHuman >= 0 ? cur.inLastHuman : null,
        anchorDelta: cur.inLastHuman >= 0 ? at - cur.inLastHuman : null,
      });
    }
  }
  return rows.sort((a, b) => b.rebilledBytes - a.rebilledBytes);
}

// --- Block migration ---
//
// semanticIds/semanticCore reduce a message to a hash and, for a
// system-reminder-wrapped text block, drop it outright as decoration
// (isVolatileTextBlock) — correct for the ordinary case where a hook
// reminder is pure noise, and exactly what leaves census blind to the case
// where the same bytes are NOT noise: they leave one message's content array
// and reappear as a message of their own. That is the reminder-swap shape —
// measured directly in capture s-4b6a435234bf (tokenized),
// n=26->28: message[30]'s 5th block, `<system-reminder>\nPreToolUse:Edit
// hook additional context...\n</system-reminder>`, is gone from message[30]
// on the n=28 side, and its inner text — wrapper stripped — is the entire
// content of the new message[31] (role system).
//
// DEFINITION: a block migration exists, for a same-conversation pair
// classified replace/edit or splice/insert-mid, when a content block present
// inside one message's content array on one side of the pair (PREV) is
// ABSENT from that message at the same position on the other side (CUR),
// while a message on CUR, within +/-3 indices of the block's index in PREV,
// carries that same block's bytes — either as the entirety of its content
// ("standalone") or as one block among several in its content array
// ("inline"). Identity of block bytes is the shared message-hash primitive's
// hashing (hashMessageContent, imported — never re-derived); a
// system-reminder wrapper is stripped before hashing on BOTH sides, because
// that is the one normalization already established in this file
// (semanticCore's VOLATILE_WRAP) for recognising the wrapper — undoing only
// the wrapper, not inventing a new comparison, is what keeps identity
// assumption-free. Direction is temporal, PREV(source) -> CUR(target):
// "inline->standalone" when the block sat among other blocks in PREV and
// stands alone in CUR; "standalone->inline" for the reverse. A block that is
// still present at the SAME position on the other side is not a migration —
// only its disappearance from that position is what makes the ±3 search
// meaningful.
//
// CANDIDACY (2026-07-30, measured on the real flap bytes — capture
// s-captureB pair n=102->104, fixture flap-s-0dc8ac87c43d-86.json (capture s-captureB)): the block
// must appear <system-reminder>-WRAPPED on whichever side it is INLINE.
// Without that condition the definition above over-reports, because both of
// its guards can be true of a block that never moved:
//
//   PREV[92] user [tool_result, text(<system-reminder> 720 chars)]
//   CUR [93] user [tool_result]        <- PREV[92] having SHED its reminder
//   CUR [94] system "…" (683 chars)    <- PREV[92]'s reminder, unwrapped
//
// Two messages were inserted above, so the host's own index moved and the
// same-position guard compares against an unrelated message; and `standalone`
// is `blocks.length === 1`, which a message that SHRANK to one block
// satisfies. So the tool_result was reported as migrating 92->93 when it had
// not left its message at all — the host had merely lost a neighbour and
// shifted. The census reported 6 migrations on this capture where 3 exist,
// and each phantom carried a `flap` tag, which is worse: a reader is being
// told two blocks oscillate when one does. The wrapper is what makes a block
// the decoration CC relocates, and it is the class this section names
// ("reminder-swap shape") — so requiring it narrows the check back to its
// own declared subject rather than adding a new rule.
const REMINDER_WRAP = /^<system-reminder>\n([\s\S]*)\n<\/system-reminder>\s*$/;

function unwrapReminder(block) {
  if (block && typeof block === "object" && block.type === "text" && typeof block.text === "string") {
    const m = REMINDER_WRAP.exec(block.text);
    if (m) return { type: "text", text: m[1] };
  }
  return block;
}

// One identity unit per content block in a message. String content promotes
// to a single text block first (the same shape fold semanticCore does for
// bare-string messages), then each block is hashed via hashMessageContent —
// the shared primitive, applied to a one-block wrapper so it still strips
// only cache_control, nothing more. `standalone` records whether this unit IS
// the message's entire content (length 1), which is the "consisting of" half
// of the definition above — note it says nothing about WHY the message has
// one block, which is exactly why `wrapped` is needed beside it: `wrapped`
// records whether this block carried the <system-reminder> wrapper before
// hashing, and it is the candidacy condition (see CANDIDACY above).
// `text` rides on the full form only, never on what compactEntry RETAINS:
// `inBlocks` keeps one of these per block of every request, and each request
// re-sends the whole history, so carrying the bytes there is the O(file)
// retention class this file has already paid for three times. The
// conservation gate below wants the text (a join is a concatenation, and
// hashes do not concatenate), and it runs per-request on live messages that
// become garbage at the end of the iteration — so it takes the full form and
// keeps nothing. One derivation, two projections, rather than a second notion
// of "the same block".
//
// EXPORTED for tools/coverage-walk.mjs, which needs exactly this unwrapping
// and exactly this text projection to ask "is this content on the wire".
// Exported rather than restated because a second copy of "what a unit is"
// would be a second truth about it — the rule dev-loop states as "never
// hand-roll identity in a probe: if a tool needs an identity that is not
// exported yet, export it rather than restate it".
export function blockUnitsFull(msg) {
  const c = msg?.content;
  let blocks;
  if (typeof c === "string") blocks = [{ type: "text", text: c }];
  else if (Array.isArray(c)) blocks = c;
  else return [];
  return blocks
    .map((b) => {
      const unwrapped = unwrapReminder(b);
      return {
        hash: hashMessageContent({ content: [unwrapped] }),
        wrapped: unwrapped !== b,
        standalone: blocks.length === 1,
        // The UNWRAPPED text, which is the unit a migration moves and a join
        // concatenates. null for any non-text block (tool_result, tool_use,
        // thinking, image) — those never participate in either shape.
        text: unwrapped && unwrapped.type === "text" && typeof unwrapped.text === "string" ? unwrapped.text : null,
      };
    })
    .filter((u) => u.hash !== null);
}

const BLOCK_MIGRATION_KINDS = new Set(["replace/edit", "splice/insert-mid"]);
const BLOCK_MIGRATION_WINDOW = 3;

function scanBlockMigrations(prev, cur) {
  const found = [];
  for (let i = 0; i < prev.inBlocks.length; i++) {
    const units = prev.inBlocks[i];
    if (units.length < 1) continue;
    const inline = units.length >= 2;
    const standalone = units.length === 1;
    const samePos = new Set((i < cur.inBlocks.length ? cur.inBlocks[i] : []).map((d) => d.hash));
    for (const u of units) {
      if (samePos.has(u.hash)) continue; // still there at the same position: not a migration
      const lo = Math.max(0, i - BLOCK_MIGRATION_WINDOW);
      const hi = Math.min(cur.inBlocks.length - 1, i + BLOCK_MIGRATION_WINDOW);
      for (let j = lo; j <= hi; j++) {
        const dstUnits = cur.inBlocks[j];
        if (!dstUnits || !dstUnits.length) continue;
        // `hash` rides on the row because it is the only thing that says
        // WHICH block moved — the flap scan below needs that identity and
        // must not recompute one of its own (dev-loop: never hand-roll
        // identity in a probe; the unit hash here IS hashMessageContent's).
        // Candidacy, both directions: the block must be reminder-WRAPPED on
        // its INLINE side — as the source unit when it is leaving a
        // multi-block message, as the destination unit when it is joining
        // one. Anything else alone in a message is a message that shed
        // siblings, not a block that emerged.
        if (inline && u.wrapped && dstUnits.some((d) => d.hash === u.hash && d.standalone)) {
          found.push({ n: cur.n, prevN: prev.n, ts: cur.ts, direction: "inline->standalone", sourceIdx: i, targetIdx: j, hash: u.hash });
          break;
        }
        if (standalone && dstUnits.length >= 2 && dstUnits.some((d) => d.hash === u.hash && d.wrapped)) {
          found.push({ n: cur.n, prevN: prev.n, ts: cur.ts, direction: "standalone->inline", sourceIdx: i, targetIdx: j, hash: u.hash });
          break;
        }
      }
    }
  }
  return found;
}

// --- Join migrations: the standalone side is a JOIN, not a block ---
//
// scanBlockMigrations matches a unit hash against a unit hash, so it can only
// see a standalone that is ONE block's bytes. CC frequently emits the other
// shape: several reminders leave their host and arrive as a SINGLE standalone
// message, "\n\n"-joined. No unit hash equals that message's hash, so the
// whole class produces no row at all — measured on both committed fixtures:
//
//   flap-s-0dc8ac87c43d-86.json (capture s-captureB, the 2026-07-30 221k
//   event): of the three standalone messages the standalone leg carries, only
//   msg94 is a lone block. msg86 is the join of msg85's four wrapped
//   reminders; msg91 is msg89's reminder joined with the WHOLE of the
//   standalone msg90 that followed it. Two thirds of the event was invisible.
//
//   oscillation-s-4b6a435234bf-863.json: the fixture's entire subject —
//   msg863's two wrapped reminders becoming the merged msg864 — is a join, so
//   the detector reported nothing on a capture harvested for oscillating.
//
// DEFINITION. A JOIN MIGRATION is the same reminder-swap event as a block
// migration, with the joined text in place of the single block. One side is
// the INLINE side (the constituents sit reminder-wrapped inside a message),
// the other the STANDALONE side (their "\n\n"-join is a whole message of its
// own); direction is temporal as before, PREV -> CUR. Two conditions, the
// direct analogues of the block scan's `samePos` and wrapper guards:
//
//   (A) THE JOIN MOVED. The joined text is a whole single-block message on
//       the standalone side, within +/-BLOCK_MIGRATION_WINDOW of the inline
//       host's index, and is a whole message NOWHERE on the inline side. A
//       joined standalone that is present on both sides did not move.
//   (B) THE CONSTITUENTS LEFT THEIR WRAPPER. No constituent block appears
//       <system-reminder>-WRAPPED anywhere on the standalone side. This is
//       the candidacy rule of the block scan, restated for a set: a wrapper
//       still present means the bytes were COPIED, not relocated. It is
//       deliberately index-free — the host's own index shifts when messages
//       are inserted above it, which is exactly the phantom the block scan's
//       positional guard produced before 47defba.
//
// KINDS, and they are not one finding. `in-entry` joins ALL of one message's
// wrapped blocks, wire order, no subsets — 78940a0's rule, which is
// findSuppressibleDuplicate's own hash set, so an in-entry join is a
// migration the shipped mitigation can already match. `cross-message` spans
// two ADJACENT messages (a message's wrapped blocks plus the whole of the
// next one) and no hash set in the extension covers it — that is the parked
// design item's subject, and the tag is what will count it. Which is why the
// kind rides on the row rather than being folded away: the census reader has
// to be able to tell "already matchable" from "nothing can match this yet".
//
// The join hashes themselves are NOT computed here — they ride on the compact
// entry (`inJoins`, compactEntry), because a join needs the block TEXT and
// the retained entry deliberately has none.

// Per-side index for one entry: where the whole-message (single-block) hashes
// are, and which block hashes appear reminder-wrapped. Both conditions above
// are lookups in these.
function joinSideIndex(e) {
  const standalone = new Map(); // whole-message hash -> [indices]
  const wrapped = new Set(); // every reminder-wrapped block hash on this side
  e.inBlocks.forEach((us, i) => {
    if (us.length === 1) {
      const at = standalone.get(us[0].hash);
      if (at) at.push(i);
      else standalone.set(us[0].hash, [i]);
    }
    for (const u of us) if (u.wrapped) wrapped.add(u.hash);
  });
  return { standalone, wrapped };
}

function scanJoinMigrations(prev, cur) {
  const found = [];
  const P = joinSideIndex(prev);
  const C = joinSideIndex(cur);

  // Condition (A), second half: the nearest whole-message occurrence of
  // `hash` on `side` within the window of `i`, or -1.
  const wholeMsgNear = (side, hash, i) => {
    const at = side.standalone.get(hash);
    if (!at) return -1;
    for (const j of at) if (Math.abs(j - i) <= BLOCK_MIGRATION_WINDOW) return j;
    return -1;
  };

  // The constituent block hashes of the join at index i of `e`: that
  // message's wrapped blocks, plus — for the cross-message kind — the whole
  // of the next message, which is a single block by construction
  // (crossJoinUnitHash returns null otherwise, so `cross` is null and this is
  // never reached for a multi-block neighbour).
  const constituents = (e, i, kind) => {
    const own = e.inBlocks[i].filter((u) => u.wrapped).map((u) => u.hash);
    return kind === "cross-message" ? own.concat(e.inBlocks[i + 1][0].hash) : own;
  };

  // Condition (B): none of the constituents is still wrapped on the
  // standalone side. The cross-message kind's right constituent is a whole
  // message rather than a wrapped block, so it is simply absent from the
  // wrapped set and the test passes on it — correct, its own movement is
  // condition (A)'s business, not this one's.
  const unwrappedOn = (side, hashes) => hashes.every((h) => !side.wrapped.has(h));

  for (const kind of ["in-entry", "cross-message"]) {
    const field = kind === "in-entry" ? "self" : "cross";
    // PREV inline, CUR standalone: the join appeared.
    for (let i = 0; i < prev.inJoins.length; i++) {
      const jh = prev.inJoins[i][field];
      if (jh === null) continue;
      if (P.standalone.has(jh)) continue; // (A): it was already a message of its own
      const j = wholeMsgNear(C, jh, i);
      if (j < 0) continue;
      if (!unwrappedOn(C, constituents(prev, i, kind))) continue; // (B)
      found.push({ n: cur.n, prevN: prev.n, ts: cur.ts, direction: "inline->standalone", sourceIdx: i, targetIdx: j, hash: jh, join: kind });
    }
    // PREV standalone, CUR inline: the join dissolved back into its host.
    for (let j = 0; j < cur.inJoins.length; j++) {
      const jh = cur.inJoins[j][field];
      if (jh === null) continue;
      if (C.standalone.has(jh)) continue; // (A)
      const i = wholeMsgNear(P, jh, j);
      if (i < 0) continue;
      if (!unwrappedOn(P, constituents(cur, j, kind))) continue; // (B)
      found.push({ n: cur.n, prevN: prev.n, ts: cur.ts, direction: "standalone->inline", sourceIdx: i, targetIdx: j, hash: jh, join: kind });
    }
  }
  return found;
}

// --- Flap: a block migration that REVERSES a recent one ---
//
// A single migration is a one-way move and the volatile pin can absorb it.
// An OSCILLATION cannot be absorbed by a pin that classifies only one of the
// two shapes: the block keeps leaving and returning, so it busts on every
// second flip at best. That is what the 2026-07-30 221k event was (threat
// matrix row 4, session 0d6f38ba, n=102->104->105->108 in 11 seconds), and
// it was visible only by reading three adjacent census lines and noticing the
// direction column alternate — a hand-derivation, which is what this makes
// mechanical.
//
// DEFINITION: a block migration row R is a FLAP when an earlier row E exists
// such that (a) E and R are in the SAME conversation group — cache prefixes
// are per-conversation, so requests of any other conversation are not part of
// this clock; (b) E and R carry the same block bytes, meaning an identical
// block `hash` — the unit hash scanBlockMigrations already computed, never a
// second notion of sameness; (c) E.direction is the OPPOSITE of R.direction;
// (d) E and R are at most FLAP_WINDOW requests of that conversation apart,
// counted between their later (cur) sides, and at least 1 apart — two rows of
// the SAME pair are not a reversal over time, they are one moment. Only R is
// marked: the first leg of an oscillation is a plain migration until
// something reverses it, and R names the row it reverses so the pair reads
// off one line.
const FLAP_WINDOW = 5;

function markFlaps(items) {
  // `items` are {row, pos} for one conversation, in ascending pos (pos is the
  // index of the row's cur entry within the conversation group), so the
  // backward scan can stop as soon as the window is exceeded.
  for (let i = 0; i < items.length; i++) {
    const { row, pos } = items[i];
    for (let j = i - 1; j >= 0; j--) {
      const span = pos - items[j].pos;
      if (span > FLAP_WINDOW) break;
      if (span < 1) continue; // same pair — one moment, not a reversal
      const e = items[j].row;
      if (e.hash !== row.hash || e.direction === row.direction) continue;
      row.flap = { reversesPrevN: e.prevN, reversesN: e.n, span };
      break;
    }
  }
}

const flapTag = (b) =>
  b.flap ? ` [flap reverses n=${b.flap.reversesPrevN}->${b.flap.reversesN}, ${b.flap.span} req]` : "";

// How a migration row renders its endpoints. A cross-message join has TWO
// messages on its inline side — index i and, by definition, i+1 — so a plain
// `a->b` would silently drop the message that was absorbed (or split off).
const migrationSpan = (b) =>
  b.join !== "cross-message"
    ? `${b.sourceIdx}->${b.targetIdx}`
    : b.direction === "inline->standalone"
      ? `${b.sourceIdx}+${b.sourceIdx + 1}->${b.targetIdx}`
      : `${b.sourceIdx}->${b.targetIdx}+${b.targetIdx + 1}`;
const joinTag = (b) => (b.join ? ` join:${b.join}` : "");
const migrationLine = (b) => `${joinTag(b)} ${b.direction} ${migrationSpan(b)}`.trimStart();

export function findBlockMigrations(entries) {
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
    const inGroup = [];
    for (let i = 1; i < group.length; i++) {
      const prev = group[i - 1];
      const cur = group[i];
      const kind = censusIds(prev.inSem, cur.inSem);
      if (!BLOCK_MIGRATION_KINDS.has(kind)) continue;
      for (const row of scanBlockMigrations(prev, cur)) inGroup.push({ row, pos: i });
      // Join rows join the SAME list before markFlaps runs: an oscillation
      // whose standalone side is a join reverses exactly like one whose
      // standalone side is a block, and the flap scan keys on `hash`, which a
      // join row carries the same way.
      for (const row of scanJoinMigrations(prev, cur)) inGroup.push({ row, pos: i });
    }
    markFlaps(inGroup);
    for (const { row } of inGroup) rows.push(row);
  }
  return rows.sort((a, b) => a.n - b.n);
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

// --- Row evidence pins (--pin-rows) ---
//
// WHY THIS EXISTS (BACKLOG, "evidence leaves the rolling window at FINDING
// time"). Every row the daily sweep persists names a pair and an index inside
// a CAPTURE, and captures rotate oldest-mtime-first on a quadratic clock —
// eviction takes the quiet session first, and a session goes quiet exactly
// when it stops being traffic and starts being evidence. Measured
// 2026-08-06: a stability EXEMPTION row measured at 09:59Z had its capture
// gone by ~19:25Z, which took with it the known positive a booked,
// decision-complete item had named as its red-first arrangement. The row
// survived. The bytes behind it did not, and the item became unbuildable.
//
// So the recurring producer writes out what proves its own findings at the
// moment it finds them (docs/dev-loop.md, closing gate question 2): per
// finding row, the message at the row's index on both sides of the pair, on
// both the forwarded and the raw side, with the array lengths and the
// byte-presence answer attribution actually asks ("is what we forwarded a
// message CC ever sent in this request, and at which index"). Kilobytes per
// row against a capture measured in hundreds of megabytes.
//
// WHY A SECOND PASS, and why that is not a retention regression in disguise.
// The forwarded bodies exist only inside the read loop — `compactEntry`
// discards them one line later, which is the discipline this file has paid
// for three times (3.27 GB peak, 2026-07-29). The index a pin needs is not
// known until every pair has been compared, i.e. after that loop has ended.
// Retaining bodies against a divergence index nobody knows yet is precisely
// the regression the child heap cap exists to catch. So the pin pass re-runs
// the pipeline over the same capture with a fresh state directory and freshly
// loaded extension modules — the arrangement `replayThrough` (attribution,
// below) already uses for the same reason — and keeps only the asked
// messages.
//
// AND BECAUSE IT IS A SECOND RUN, ITS BYTES ARE A CLAIM. `bytesMatchRow`
// re-hashes what the second pass produced and compares it against the FIRST
// pass's per-message hashes for the same request and index (compactEntry's
// `outHash`/`inHash`, computed while the row was being derived). A pin that
// fails that check does not belong to the row it names — a nondeterministic
// stage, a drifted second loop — and it is emitted with the flag false so the
// writer rejects it rather than committing evidence for a row it does not
// describe. Three answers, not two: `null` where the first pass kept no hash
// to compare against.
export const PIN_CAP = 20;

// Which index each row family names, and in WHICH COORDINATE SPACE it names
// it — the distinction this file has already paid for twice (raw 370 forwards
// as 360). `owner` says whose array the index is an index INTO: a relocated
// block's departure is recorded at its position in the PREDECESSOR's raw
// array, everything else at the successor's. A family whose rows carry no
// index at all yields no ask and says so, rather than pinning index 0.
export const PIN_FAMILIES = {
  stability: { pair: true, owner: "cur", space: "forwarded", index: (r) => r.outDiv },
  stabilityExempt: { pair: true, owner: "cur", space: "forwarded", index: (r) => r.outDiv },
  // `at`/`side` are the conservation gate's own structured index (its `detail`
  // string has always printed `in[i]`/`out[i]`; parsing prose back out of a
  // report is the hand-rolled-identity error one level down).
  conservation: { pair: false, owner: "cur", space: (r) => (r.side === "out" ? "forwarded" : "raw"), index: (r) => r.at },
  conservationExempt: { pair: false, owner: "cur", space: (r) => (r.side === "out" ? "forwarded" : "raw"), index: (r) => r.at },
  sequence: { pair: false, owner: "cur", space: "forwarded", index: (r) => r.normalizedAt },
  // insertion-normalization's own telemetry: `wireIdx` is a position in the
  // incoming (raw) array, `at` is an ordinal within the canonical list and is
  // NOT a message index — pinning `at` would pin an unrelated message.
  order: { pair: false, owner: "cur", space: "raw", index: (r) => r.wireIdx },
  absorptionMiss: { pair: true, owner: "cur", space: "forwarded", index: (r) => r.forwardedDivergence },
  relocDeparture: { pair: true, owner: "prev", space: "raw", index: (r) => r.prevMsgIdx },
};

/** The pin asks a run's rows generate, capped per family.
 *
 * The cap carries a PRESENCE marker rather than truncating silently, the same
 * convention gate-live's ROW_CAP uses: at or below the cap there is no entry
 * in `truncated` at all; above it, the pre-truncation total sits beside the
 * family name. A short list that reads as a complete one is this item's own
 * defect one level up.
 */
export function pinAsks(sources, cap = PIN_CAP) {
  const asks = [];
  const truncated = {};
  const skipped = [];
  for (const [family, spec] of Object.entries(PIN_FAMILIES)) {
    const rows = sources[family];
    // Three answers: a family the run never produced (an older schema, a
    // census-gated report that did not run) measured nothing and is not a
    // measured zero.
    if (!Array.isArray(rows) || rows.length === 0) continue;
    let taken = 0;
    for (const row of rows) {
      const index = spec.index(row);
      if (!Number.isInteger(index) || index < 0) {
        skipped.push({ family, n: row.n ?? null, reason: "row carries no message index" });
        continue;
      }
      if (taken >= cap) continue;
      taken++;
      asks.push({
        family,
        n: row.n,
        prevN: spec.pair ? (row.prevN ?? null) : null,
        index,
        indexSpace: typeof spec.space === "function" ? spec.space(row) : spec.space,
        indexOwner: spec.owner,
        row,
      });
    }
    if (taken >= cap && rows.length > cap) truncated[family] = rows.length;
  }
  return { asks, truncated, skipped };
}

/** Re-run the pipeline over `file` and keep only the asked messages.
 *
 * Fresh state directory AND freshly loaded extension modules, because pass 1
 * started from both: an extension carrying module-scope memory from the first
 * run would forward different bytes here, and the pin would then describe a
 * request nobody made. `loadExtensions` cache-busts its imports per call
 * (pipeline.mjs `_loadCounter`), so re-calling it gives genuinely fresh module
 * scope — the same thing a new process gets.
 */
async function collectPinEvidence(file, asks, loadExtensions, runOnRequest) {
  const wanted = new Map(); // request ordinal -> Set of indices
  for (const a of asks) {
    for (const n of [a.n, a.prevN]) {
      if (!Number.isInteger(n)) continue;
      if (!wanted.has(n)) wanted.set(n, new Set());
      wanted.get(n).add(a.index);
    }
  }
  const out = new Map();
  if (!wanted.size) return out;
  const scratch = await tmpDir("cache-fix-pin-");
  const saved = process.env.CLAUDE_CONFIG_DIR;
  const savedState = process.env.XDG_STATE_HOME;
  const savedData = process.env.XDG_DATA_HOME;
  process.env.CLAUDE_CONFIG_DIR = scratch;
  process.env.XDG_STATE_HOME = scratch;
  process.env.XDG_DATA_HOME = scratch;
  try {
    const exts = await loadExtensions(EXT_DIR, EXT_CONFIG);
    let reqN = -1;
    for await (const [, line] of readCapture(file)) {
      let rec;
      try {
        rec = JSON.parse(line);
      } catch {
        continue;
      }
      // The same numbering rule as the main loop and as replayThrough: a pin
      // that landed on a different ordinal would carry a neighbouring
      // request's bytes, which is the namespace split this file documents at
      // `excerptsForAsks`.
      if (rec.type === "outcome" || rec.type === "boot") continue;
      const n = ++reqN;
      const ctx = {
        body: structuredClone(rec.body),
        headers: {
          "anthropic-beta": rec.headers?.["anthropic-beta"] ?? undefined,
          "x-session-id": rec.headers?.["session-id"] ?? rec.sid ?? undefined,
        },
        meta: { route: "messages" },
      };
      // Every request must run — the stateful extensions' behaviour at n
      // depends on every request before it — but only the asked ones are kept.
      await runOnRequest(ctx, exts);
      const indices = wanted.get(n);
      if (!indices) continue;
      const rawMsgs = Array.isArray(rec.body?.messages) ? rec.body.messages : [];
      const fwdMsgs = Array.isArray(ctx.body?.messages) ? ctx.body.messages : [];
      const rawHashes = rawMsgs.map((m) => sha(JSON.stringify(m)));
      // The CONTENT PREDICATES, answered here and recorded as data.
      //
      // Measured 2026-08-06 and the reason a pin was said not to be able to
      // stand in for a capture at all: the sanitizer replaces text with hash
      // tokens, so every extension gated on a literal text prefix — all four
      // of fresh-session-sort's relocatable-block predicates — scores zero
      // hits on any scrubbed artifact. A pin that carried only bytes would
      // therefore lose exactly the class this whole item was motivated by (a
      // first-appearance-relocation exemption). So the predicates run on the
      // REAL bytes, before anything is scrubbed, through the extension's own
      // functions rather than a restatement of them, and their answers ride
      // in the pin. Structural facts survive the scrub; this is how a content
      // fact survives it too.
      const relocTypesOf = (msg) => {
        if (!msg || !Array.isArray(msg.content)) return [];
        const out = [];
        for (const b of msg.content) {
          const text = b?.text ?? "";
          if (!isRelocatableBlock(text)) continue;
          const t = getBlockType(text);
          if (t !== null) out.push(t);
        }
        return out;
      };
      const at = new Map();
      for (const i of indices) {
        // An index past the end is DATA (the array is shorter on this side),
        // never an error: `null` here means "this side had no message there".
        const forwarded = i < fwdMsgs.length ? fwdMsgs[i] : null;
        const raw = i < rawMsgs.length ? rawMsgs[i] : null;
        const forwardedSha = forwarded === null ? null : sha(JSON.stringify(forwarded));
        at.set(i, {
          forwarded,
          raw,
          forwardedSha,
          rawSha: raw === null ? null : sha(JSON.stringify(raw)),
          // The attribution question, answered here on the REAL bytes because
          // the scrub destroys content predicates downstream (docs/dev-loop.md,
          // "The scrub destroys CONTENT PREDICATES"): at which index of CC's
          // own array does what we forwarded appear, if anywhere. `null` is
          // "nowhere" — i.e. we built these bytes; a number is CC's own.
          forwardedPresentInRawAt:
            forwardedSha === null ? null : (rawHashes.indexOf(forwardedSha) === -1 ? null : rawHashes.indexOf(forwardedSha)),
          // `null` (not `[]`) where there was no message to ask about: an
          // absent message did not answer "no relocatable blocks".
          forwardedRelocTypes: forwarded === null ? null : relocTypesOf(forwarded),
          rawRelocTypes: raw === null ? null : relocTypesOf(raw),
        });
      }
      out.set(n, {
        outBodySha: createHash("sha256").update(JSON.stringify(ctx.body)).digest("hex").slice(0, 16),
        rawLen: rawMsgs.length,
        forwardedLen: fwdMsgs.length,
        ts: rec.ts ?? null,
        key: rec.key ?? null,
        id: rec.id ?? null,
        at,
      });
      wanted.delete(n);
      if (wanted.size === 0) break;
    }
  } finally {
    if (saved === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = saved;
    if (savedState === undefined) delete process.env.XDG_STATE_HOME;
    else process.env.XDG_STATE_HOME = savedState;
    if (savedData === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = savedData;
    await rm(scratch, { recursive: true, force: true });
  }
  return out;
}

/** One pin per ask, with the cross-pass check that makes it evidence.
 *
 * `byN` maps a request ordinal to the FIRST pass's compact entry, whose
 * per-message hashes were computed while the row itself was being derived.
 * Comparing the second pass's bytes against them is what separates "the bytes
 * behind this row" from "some bytes from a second run of the same file".
 */
export function buildRowPins(asks, evidence, byN) {
  const pins = [];
  for (const a of asks) {
    const sides = {};
    let matched = true;
    let compared = 0;
    for (const [label, n] of [["cur", a.n], ["prev", a.prevN]]) {
      if (!Number.isInteger(n)) continue;
      const ev = evidence.get(n);
      if (!ev) {
        sides[label] = { n, missing: "no request record with this ordinal in the pin pass" };
        matched = false;
        continue;
      }
      const cell = ev.at.get(a.index) ?? null;
      const entry = byN.get(n) ?? null;
      // The cross-pass check, per side and per array. `null` where pass 1 kept
      // no hash at that index (the array was shorter): not a match and not a
      // mismatch — nothing to compare.
      const expectFwd = entry && Array.isArray(entry.outHash) ? (entry.outHash[a.index] ?? null) : null;
      const expectRaw = entry && Array.isArray(entry.inHash) ? (entry.inHash[a.index] ?? null) : null;
      const fwdOk = expectFwd === null ? null : expectFwd === (cell?.forwardedSha ?? null);
      const rawOk = expectRaw === null ? null : expectRaw === (cell?.rawSha ?? null);
      for (const v of [fwdOk, rawOk]) {
        if (v === null) continue;
        compared++;
        if (v === false) matched = false;
      }
      sides[label] = {
        n,
        ts: ev.ts,
        key: ev.key,
        id: ev.id,
        rawLen: ev.rawLen,
        forwardedLen: ev.forwardedLen,
        outBodySha: ev.outBodySha,
        forwarded: cell?.forwarded ?? null,
        raw: cell?.raw ?? null,
        forwardedSha: cell?.forwardedSha ?? null,
        rawSha: cell?.rawSha ?? null,
        forwardedPresentInRawAt: cell?.forwardedPresentInRawAt ?? null,
        // The content predicates, computed pre-scrub (collectPinEvidence).
        forwardedRelocTypes: cell?.forwardedRelocTypes ?? null,
        rawRelocTypes: cell?.rawRelocTypes ?? null,
        firstPassForwardedSha: expectFwd,
        firstPassRawSha: expectRaw,
        forwardedMatchesFirstPass: fwdOk,
        rawMatchesFirstPass: rawOk,
      };
    }
    pins.push({
      family: a.family,
      n: a.n,
      prevN: a.prevN,
      index: a.index,
      indexSpace: a.indexSpace,
      indexOwner: a.indexOwner,
      row: a.row,
      sides,
      checks: {
        // COMPARED, then matched. A pin nothing could be compared against is
        // not a passing pin — it is an unverifiable one, and collapsing the
        // two is the absence-wearing-a-verdict's-clothes shape this repo has
        // paid for three times.
        comparisons: compared,
        bytesMatchRow: compared === 0 ? null : matched,
      },
    });
  }
  return pins;
}

// --dump-forwarded's spec: comma-separated N:I pairs naming a forwarded
// message position to dump for a given request index. Parsed into a
// Map<n, i[]> (preserving spec order and duplicates) so the read loop does a
// single lookup per request instead of re-parsing or scanning per line.
function parseDumpSpec(spec) {
  const map = new Map();
  for (const part of spec.split(",")) {
    const [nStr, iStr] = part.split(":");
    const n = parseInt(nStr, 10);
    const i = parseInt(iStr, 10);
    if (!Number.isFinite(n) || !Number.isFinite(i)) {
      process.stderr.write(`bad --dump-forwarded entry: ${part} (want N:I)\n`);
      process.exit(2);
    }
    if (!map.has(n)) map.set(n, []);
    map.get(n).push(i);
  }
  return map;
}

function parseArgs(argv) {
  const args = {
    file: null,
    env: {},
    json: false,
    census: false,
    restartAt: null,
    wipeStateAt: null,
    trace: false,
    gatesFromCapture: false,
    dumpForwarded: null,
    dumpOut: null,
    pinRows: false,
  };
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
    } else if (a === "--gates-from-capture") {
      args.gatesFromCapture = true;
    } else if (a === "--restart-at" || a === "--wipe-state-at") {
      const v = parseInt(argv[++i] ?? "", 10);
      if (!Number.isFinite(v) || v < 1) {
        process.stderr.write(`${a} wants a positive request index\n`);
        process.exit(2);
      }
      if (a === "--restart-at") args.restartAt = v;
      else args.wipeStateAt = v;
    } else if (a === "--pin-rows") {
      args.pinRows = true;
    } else if (a === "--dump-forwarded") {
      args.dumpForwarded = parseDumpSpec(argv[++i] ?? "");
    } else if (a === "--dump-out") {
      args.dumpOut = argv[++i] ?? null;
    } else if (!args.file) {
      args.file = a;
    } else {
      process.stderr.write(`unexpected argument: ${a}\n`);
      process.exit(2);
    }
  }
  if (!args.file) {
    process.stderr.write(
      "usage: node tools/replay.mjs <captures.jsonl> [--env FLAG=1 ...] [--gates-from-capture] [--census] [--trace] [--restart-at N] [--wipe-state-at N] [--dump-forwarded N:I,...] [--dump-out path] [--pin-rows] [--json]\n",
    );
    process.exit(2);
  }
  if (args.dumpForwarded && !args.dumpOut) {
    process.stderr.write("--dump-forwarded requires --dump-out (pass both --dump-forwarded and --dump-out)\n");
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
// Conversation SUCCESSION — the census's cross-conversation blind spot,
// closed. Every within-conversation classifier above compares pairs INSIDE
// one conversation identity, so a boundary (compaction, resume, fork)
// structurally never forms a pair: the compaction note documented the blind
// spot, and the resume-exposure question was first answered by a throwaway
// probe — the tell, again, that a classification was missing.
//
// A SUCCESSION is an identity change where the earlier conversation never
// returns later in the capture; conversations that reappear are ordinary
// sidecar INTERLEAVING (hundreds per busy capture, the co-tenant normal) and
// are deliberately not reported — a boundary class that fired on every
// sidecar switch would train its reader to ignore it. Kinds:
//   compaction/new-thread — opener <= 6 messages (summary or fresh start);
//   resume-shaped         — deep opener sharing >50% of message bodies with
//                           the predecessor (the CC#51764 family);
//   fork/other            — deep opener, low overlap: worth eyes.
// Each carries the opener's full byte size — a succession re-bills its
// whole prefix by construction.
export function findSuccessions(entries) {
  const compact = entries.map(asCompact);
  const lastSeen = new Map(); // conversation id -> last entry index
  const firstSeen = new Map(); // conversation id -> first entry index
  for (let i = 0; i < compact.length; i++) {
    const cid = conversationOf(compact[i]);
    if (cid === null) continue;
    lastSeen.set(cid, i);
    if (!firstSeen.has(cid)) firstSeen.set(cid, i);
  }
  const out = [];
  for (let i = 1; i < compact.length; i++) {
    const prev = compact[i - 1];
    const cur = compact[i];
    const prevCid = conversationOf(prev);
    const curCid = conversationOf(cur);
    if (prevCid === null || curCid === null || prevCid === curCid) continue;
    if (lastSeen.get(prevCid) > i - 1) continue; // interleave: it returns
    // The successor must be OPENING here: a one-shot sidecar handing back
    // to a continuing main thread ends a conversation but starts nothing —
    // without this condition every such handback minted a phantom
    // "fork/other" (caught while writing the interleave bite).
    if (firstSeen.get(curCid) !== i) continue;
    const openerBytes = cur.inBytes.reduce((a, b) => a + b, 0);
    let kind;
    let shared = 0;
    if (cur.msgs <= 6) {
      kind = "compaction/new-thread";
    } else {
      const prevHashes = new Set(prev.inHash);
      shared = cur.inHash.filter((h) => prevHashes.has(h)).length;
      kind = shared / cur.msgs > 0.5 ? "resume-shaped" : "fork/other";
    }
    out.push({
      n: cur.n,
      prevN: prev.n,
      ts: cur.ts,
      kind,
      openerMsgs: cur.msgs,
      shared,
      rebilledBytes: openerBytes,
    });
  }
  return out;
}

// --- Content conservation: the fifth gate ---
//
// NAME COLLISION, stated once so neither reader is misled: `classifyFidelity`
// below is REPLAY fidelity — "did this offline run reproduce the bytes the
// proxy really forwarded". This is CONTENT-conservation fidelity — "did the
// proxy forward every byte CC sent, or account for the ones it did not". The
// first is about the instrument, the second about the pipeline. The JSON key
// here is `conservation` for that reason; the four existing gates are
// untouched.
//
// WHY IT IS NEEDED. The four gates all ask a positional question: did our
// bytes move earlier than CC's, did we change the message sequence, did a
// normalize get followed by a reset, does canonical order track the wire.
// None of them can see a message CC sent that we simply never forwarded and
// whose content exists nowhere else — because a DELETION that leaves the
// surviving array positionally consistent is invisible to all four. The
// pin-and-suppress mechanism (#76606 decision B) deletes messages on purpose,
// and the mitigation this gate is a precondition for (a recognized reminder
// MOVE, served from its first-seen form) deletes one more. Safety outranks
// cache: a suppression whose copy is not actually on the wire is a silently
// truncated conversation, which is strictly worse than a cache miss.
//
// DEFINITION, written before any assertion (dev-loop "Adding a check"), for
// ONE request — CC's raw array R and the forwarded array F:
//
//   R-side. Every content unit of a non-assistant message of R is either
//     (a) present in F byte-identically (as the same unit, anywhere in F —
//         the question is whether the content is still on the wire, not
//         where), or
//     (b) part of a DECLARED suppression (stats.suppressions, the
//         extension's own report — never a re-derived "looks dropped"
//         guess) whose content is RECONSTRUCTIBLE from F: its unwrapped
//         bytes equal either a unit present in F, or the "\n\n" join of all
//         volatile blocks of one message present in F (the merged-standalone
//         shape, 78940a0), or
//     (c) a declared STRIP (isDeclaredStrip, imported from
//         fresh-session-sort's own isClearArtifact — never a re-derived
//         "looks like a clear artifact" guess): the harness's own
//         `/clear`-command echo, which really does leave the wire and is
//         meant to, or
//     (d) part of a DECLARED PEEL (smoosh-split's own report,
//         smooshSplitStats.peeled — never a re-derived "this looks
//         smooshed" guess): re-running the extension's OWN
//         splitSmooshedReminders on this one message reproduces a form
//         every unit of which is present in F byte-identically. Unlike a
//         suppression, a peel never leaves the message: it redistributes
//         one tool_result's trailing reminder(s) into standalone text
//         blocks of the SAME message, so the verified split form accounts
//         for both the R-side unit that disappears and the F-side unit(s)
//         that appear in its place (clause (d) below, F-side), or
//     (h) part of a DECLARED SESSION-START SUBSTITUTION by
//         identity-normalization: re-running the extension's OWN
//         `normalizeSessionStartText` over the RAW block that produced this
//         unit yields a CHANGED text whose unit is present in F
//         byte-identically. The mapping is per block, ONE pre-image to ONE
//         post-image — a second unit of the same message the substitution
//         does not reach is not covered by it. What "declared" means for an
//         extension that publishes no telemetry is stated at the clause
//         itself, below.
//   F-side. Every content unit of a non-assistant message of F is either
//     (a) present in R, or
//     (b) present in an EARLIER request of the same conversation — this is
//         what "the pin forwards the FIRST-SEEN bytes" means, stated as a
//         checkable property rather than trusted: a re-served byte must be a
//         byte CC itself once sent here, and one we invented is red, or
//     (c) a declared injection (isDeclaredInjection — deferred-tool-rewrite's
//         tool_addition announcement or its description-change notice, both
//         already exempt in the safety gate), or
//     (d) produced by the same DECLARED PEEL verified on the R-side (d) —
//         the post-peel tool_result and each peeled reminder's standalone
//         text block are new bytes on the wire by construction (a peel
//         REDISTRIBUTES within a message; it never equals any single
//         pre-peel unit), so without this clause they read as invented, or
//     (e) a DECLARED RE-SERVE (fresh-session-sort's own report,
//         freshSessionSortStats.reserved — never a re-derived "this looks
//         re-served" guess) of a unit THIS GATE verified earlier in the same
//         conversation as the result of the extension's own rewrite. The
//         extension holds its relocated prefix stable across a request in
//         which CC sends no instance of the type (the n=331->336 index-0
//         divergence, 2026-08-05); where the rewrite is the identity the
//         re-served bytes are CC's own and clause (b) already covers them,
//         and where it is not (skills and deferred are SORTED, hooks is
//         stripped) the bytes descend from CC's through a transform this gate
//         re-derived and saw on the wire. That descent is the evidence — a
//         declaration alone excuses nothing, per the controls in
//         test/conservation-exemptions.test.mjs, or
//     (h) the POST-IMAGE of a session-start substitution verified on the
//         R-side (h) in THIS request. The substituted block is new bytes on
//         the wire by construction, so without this clause the F side reads
//         as invented for every request the R side just excused.
//
// POPULATION — non-assistant messages, and the reason is definitional rather
// than convenient. Every mechanism that can delete or re-serve content in
// this pipeline is confined to that population by construction:
// classifyPinned skips `e.r === "assistant"` before suppressing, and
// pinnedForwardForm returns the incoming message unchanged unless
// `stored.r === "user"`. Assistant content is transformed by a different and
// separately-gated class of extension. That class is not hypothetical —
// measured over 936 requests of four live captures (s-captureAA, s-captureO,
// s-captureY, s-captureB) the ONLY blocks the pipeline does not conserve
// byte-identically are `assistant/tool_use` (rewritten in place by
// tool-input-normalize: 3,145 lost and 3,145 gained on s-captureB alone) and
// `assistant/thinking` (dropped by thinking sanitization); non-assistant
// blocks were conserved in every one of those requests. So the exclusion
// costs no coverage of THIS class and would otherwise fire on two declared
// behaviours with no telemetry to key an exemption on — a check firing on a
// non-defect, which trains its reader to ignore red.
//
// The residue is COUNTED and reported rather than silently dropped
// (`assistantResidue`): a reader can see how much this gate did not look at,
// which is the three-answer rule applied to a population boundary instead of
// to an empty corpus.
const CONSERVATION_JOIN = "\n\n";

function conservationUnits(msg) {
  return blockUnitsFull(msg);
}

// The "\n\n" join of ALL volatile (reminder-wrapped) blocks of one message,
// hashed the same way a single unit is. Mirrors the extension's own
// pinnedJoinHashes — same separator, same "all blocks of the entry, wire
// order, no subset merges" rule — but computed over the FORWARDED array,
// which is where a suppressed message's copy has to be for the suppression to
// have been honest.
//
// SHARED, not conservation-only: compactEntry calls this and crossJoinUnitHash
// below over the INPUT array too, so scanJoinMigrations can ask the same
// question of the census (a joined standalone is a migration target). One
// definition of "a join" in this file — a second would be a second truth
// about what the extension can match.
function joinUnitHash(units) {
  const texts = units.filter((u) => u.wrapped && u.text !== null).map((u) => u.text);
  if (texts.length < 2) return null;
  return hashMessageContent({ content: [{ type: "text", text: texts.join(CONSERVATION_JOIN) }] });
}

// The CROSS-MESSAGE join — the definition's "including as a join constituent"
// clause, and the shape the single-message join above cannot express. Measured
// (fixture flap-s-0dc8ac87c43d-86.json (capture s-captureB), request n=104, message 91): CC merged one
// message's reminder with the WHOLE of the standalone message that followed
// it, "\n\n"-joined, and sent the two as a single message. A copy of that
// message on the wire is therefore split across two forwarded messages, and is
// reconstructible only by reading them together.
//
// Restricted to ADJACENT forwarded messages, in wire order, reminder side
// first. That is the measured shape, and it is also what keeps this O(n) per
// request rather than O(n^2): pairing every forwarded message with every other
// would cost a million hashes on a thousand-message history to answer a
// question about one.
function crossJoinUnitHash(leftUnits, rightUnits) {
  const left = leftUnits.filter((u) => u.wrapped && u.text !== null).map((u) => u.text);
  if (!left.length) return null;
  if (rightUnits.length !== 1 || rightUnits[0].text === null) return null;
  const text = left.join(CONSERVATION_JOIN) + CONSERVATION_JOIN + rightUnits[0].text;
  return hashMessageContent({ content: [{ type: "text", text }] });
}

const isAssistant = (m) => m?.role === "assistant";

// DECLARED TRANSFORM — the definition's clause (c), and the registry it names.
// fresh-session-sort deletes the echo a slash command leaves in the first user
// message (`<local-command-caveat>`, `<command-name>`, `<local-command-stdout>`
// — fresh-session-sort.mjs, "Strip /clear artifacts from first user message").
// Those bytes really do leave the wire, and they are meant to: they are the
// harness quoting its own command back, never conversation content.
//
// Found by this gate rather than by reading: the first sweep reported 645
// violations on capture s-captureA, ALL of kind `lost`, ALL at message 0, and
// stage-by-stage replay of request 822 named the extension — RAW 6 units,
// after fresh-session-sort 3, the three removed being exactly a /compact
// caveat, its `<command-name>`, and its `<local-command-stdout>`. Left
// unexempted this would fail the daily sweep forever on a declared behaviour,
// which is the check-fires-on-a-non-defect failure that trains a reader to
// ignore red.
//
// The predicate is IMPORTED from the extension that performs the strip, never
// restated here: a second copy of "what counts as a clear artifact" is a
// second truth, and this file's own rule is to import an identity rather than
// re-derive it. Accepted residue, named because the exemption is slightly
// wider than the transform: the extension strips these blocks only from the
// first user message, while this exempts them wherever they appear. A
// harness-echo block elsewhere is not content either, so the widening cannot
// mask a conversation byte — but it is a widening, not an equality.
const isDeclaredStrip = (u) => u.text !== null && isClearArtifact(u.text);

// DECLARED PEEL — the definition's clause (d), and a check firing on
// legitimate mitigation work rather than a defect: smoosh-split peels a
// TRAILING <system-reminder> out of a tool_result's STRING content into a
// standalone text block appended to the SAME message (bytes redistributed
// within one message, never removed). Left unexempted this gate read the
// peel as a lost R-side unit (the whole pre-peel tool_result) plus an
// invented F-side unit per resulting block (the post-peel tool_result and
// each peeled reminder) — ten violations, five requests, all at [2], on
// capture s-captureP (short key: full session ids stay out of the public tree,
// absence-scan's source-UUID guard).
//
// Chains the extension's OWN export rather than re-deriving the regex or the
// peel logic — one definition of "a peel" in the codebase, same discipline
// as isDeclaredStrip importing isClearArtifact. Declared via
// e.smooshSplitStats.peeled > 0 on the entry (the caller's job, see
// conservationViolations below) — no declaration, no exemption. Applied
// per-message: re-run the peel on THIS raw message and require EVERY
// resulting unit present in F byte-identically. A mismatch (tampered
// forward, or bytes the peel didn't actually reach) returns null and the
// caller leaves the violation standing — the exemption verifies the
// declaration, it never trusts it.
// (f) A declared REWRITE by fresh-session-sort: it re-sorts the skills and
//     deferred-tool listings and normalizes a block's trailing whitespace, so
//     the unit CC sent is genuinely not on the wire and a byte-identical
//     replacement is. Verified, never trusted: the gate re-derives the rewrite
//     with the extension's OWN `rewriteBlockText` and requires the result
//     present in F.
//
//     `rewriteBlockText`, not `fixBlockText`: the latter ends in
//     `pinBlockContent`, which MUTATES the extension's module-level pin map. A
//     checker that re-runs it would edit the state of the thing it is
//     checking, mid-run. The pure half was extracted for exactly this call,
//     which is also why this is a chain of the extension's own logic rather
//     than a second implementation of the sort.
//
//     Restricted to blocks the extension actually touches
//     (`isRelocatableBlock`): a rewrite of anything else is not this
//     extension's and stays a violation.
//
//     PER BLOCK, pre-image hash -> post-image hash. It returned a bare SET of
//     post-images until 2026-08-07, and the caller's predicate then never
//     looked at the unit it was excusing: one verified rewrite anywhere in the
//     message exempted EVERY other lost unit of that message, bytes no
//     transform had touched included. An over-firing exemption is a gate that
//     under-fires, and this one sat on the safety side of "safety outranks
//     cache". The mapping is what makes the narrowing expressible at all —
//     the same shape clauses (d) and (h) already had.
function freshSessionSortRewritePairs(msg) {
  const c = msg?.content;
  const blocks = typeof c === "string" ? [{ type: "text", text: c }] : Array.isArray(c) ? c : [];
  const out = new Map();
  for (const b of blocks) {
    if (b?.type !== "text" || typeof b.text !== "string") continue;
    if (!isRelocatableBlock(b.text)) continue;
    const after = rewriteBlockText(getBlockType(b.text), b.text);
    if (after === b.text) continue;
    // Through the gate's OWN unit function on BOTH sides, so the hashes are
    // computed exactly as the R- and F-side loops compute them — units are
    // UNWRAPPED (blockUnitsFull strips the <system-reminder> envelope), and
    // hashing the wrapped text here would silently never match. Two hashing
    // definitions for one comparison is the shape that makes an exemption
    // quietly dead.
    const before = blockUnitsFull({ content: [b] });
    const afterUnits = blockUnitsFull({ content: [{ type: "text", text: after }] });
    if (before.length !== 1 || afterUnits.length !== 1) continue;
    out.set(before[0].hash, afterUnits[0].hash);
  }
  return out;
}

// (g) A declared STRIP by content-strip: it removes the continue-trailer and
//     bookkeeping reminders from user messages. Those bytes really do leave
//     the wire and are meant to. Verified by re-running content-strip's OWN
//     predicates against the unit — a unit neither predicate accepts is not
//     content-strip's doing and stays a violation.
//
//     The unit reaching it may be a smoosh-split PEEL PRODUCT rather than a
//     block CC sent, which is why this is checked against the peeled form too:
//     the two mitigations compose, and the composed case is the only one
//     measured (8 of 8 rows on the triaged capture).
// Takes the RAW block, not the gate's unit: content-strip's predicates are
// defined over the wrapped `<system-reminder>` form, while a unit's `text` has
// already been unwrapped. Feeding it the unwrapped text makes the predicate
// return false on every real case.
const isDeclaredContentStripBlock = (b) =>
  !!b && b.type === "text" && typeof b.text === "string" &&
  (isBookkeepingReminder(b.text) || isContinueTrailerBlock(b));

/** Unit hashes of the raw blocks content-strip's own predicates accept. */
function contentStripUnitHashes(msg) {
  const c = msg?.content;
  const blocks = typeof c === "string" ? [{ type: "text", text: c }] : Array.isArray(c) ? c : [];
  const out = new Set();
  for (const b of blocks) {
    if (!isDeclaredContentStripBlock(b)) continue;
    for (const u of blockUnitsFull({ content: [b] })) out.add(u.hash);
  }
  return out;
}

// (h) A declared SESSION-START SUBSTITUTION by identity-normalization: it
//     rewrites a SessionStart hook block IN PLACE — `resume` becomes
//     `startup`, the `<session-id>` tag and the `Last active:` line go — so
//     the unit CC sent is genuinely not on the wire and a transformed one is.
//     Unexempted that is one `lost` plus one `invented` on EVERY request
//     carrying a resume block, on a BLOCKING gate: the
//     fires-on-a-non-defect class, which trains its reader to discount
//     conservation red. Measured on capture s-captureAL, request n=91,
//     message 96 (role system), 2026-08-06T17:39:23.557Z — the raw block
//     opens `SessionStart:resume hook success:`, the forwarded one
//     `SessionStart:startup hook success:`, and the extension's own function
//     reproduces the forwarded bytes exactly.
//
//     WHAT "DECLARED" MEANS HERE, and it is a deliberate deviation from the
//     three clauses above. Those key on the extension's own `ctx.meta`
//     telemetry (`smooshSplitStats`, `freshSessionSortStats`,
//     `contentStripStats`). identity-normalization publishes NONE — it writes
//     nothing to `ctx.meta` at all — so there is no such key to read, and
//     minting one is a `proxy/**` change, which makes the fix
//     deployment-coupled (pin bump + restart) for a checker-side repair.
//     What stands in its place is the replay's OWN per-extension
//     measurement: the read loop runs the pipeline one extension at a time
//     and hashes the body either side of each, so `mutatedBy` is an observed
//     effect of this extension on THIS request rather than its self-report —
//     strictly harder evidence than a stat field, and it cannot miss a
//     substitution, because a substitution changes the body by definition.
//     Absent (an older caller, a hand-built entry) the clause is simply off
//     and the rows report — noisy, never silent, the same failure direction
//     `seenRewrites` already has.
//
//     Chains the extension's OWN export rather than restating the regexes —
//     one definition of "the SessionStart substitution" in the codebase, the
//     same discipline as isDeclaredStrip importing isClearArtifact. And it is
//     PURE: `normalizeSessionStartText` touches no module state, unlike
//     fresh-session-sort's `fixBlockText`, so re-running it here cannot edit
//     the state of the thing being checked.
//
//     PER-BLOCK, pre-image hash -> post-image hash, which is what keeps a
//     REAL loss in the same message firing: only the unit the substitution
//     actually consumed is excused, and only if the substitution's own output
//     is on the wire.
function identityNormalizationSubstitutionPairs(msg) {
  const c = msg?.content;
  const blocks = typeof c === "string" ? [{ type: "text", text: c }] : Array.isArray(c) ? c : [];
  const out = new Map();
  for (const b of blocks) {
    if (b?.type !== "text" || typeof b.text !== "string") continue;
    const [after, count] = normalizeSessionStartText(b.text);
    if (count === 0 || after === b.text) continue;
    // Through the gate's OWN unit function on BOTH sides, so pre-image and
    // post-image are hashed exactly as the R- and F-side loops hash them —
    // units are UNWRAPPED (blockUnitsFull strips the <system-reminder>
    // envelope) and hashing the wrapped text on one side would make the
    // exemption quietly dead. Same trap freshSessionSortRewritePairs
    // documents one function up.
    const before = blockUnitsFull({ content: [b] });
    const afterUnits = blockUnitsFull({ content: [{ ...b, text: after }] });
    if (before.length !== 1 || afterUnits.length !== 1) continue;
    out.set(before[0].hash, afterUnits[0].hash);
  }
  return out;
}

function smooshSplitPeelUnits(msg) {
  const { messages, stats } = splitSmooshedReminders([msg]);
  if (!stats || !(stats.peeled > 0)) return null;
  return conservationUnits(messages[0]);
}

/**
 * The peel's product BLOCKS, keyed by the unit hash each yields.
 *
 * A unit's `text` is UNWRAPPED — blockUnitsFull strips the
 * `<system-reminder>` envelope — while content-strip's predicates are defined
 * over the wrapped form. Handing a unit's text to those predicates returns
 * false on every real case, silently. That confusion has now cost three
 * separate bugs in this file, so the block is carried alongside the hash
 * rather than reconstructed from it.
 */
function smooshSplitPeelBlocks(msg) {
  const { messages, stats } = splitSmooshedReminders([msg]);
  if (!stats || !(stats.peeled > 0)) return new Map();
  const out = new Map();
  const c = messages[0]?.content;
  for (const b of Array.isArray(c) ? c : []) {
    for (const u of blockUnitsFull({ content: [b] })) out.set(u.hash, b);
  }
  return out;
}

// Per-request verdict, `seen` being the per-conversation set of unit hashes CC
// has sent in ANY earlier request of this conversation. Per-entry for the same
// reason safetyViolation is: it runs in the replay loop where the messages are
// live and retains nothing but the verdict. `seen` is bounded by the
// conversation's own history (each request re-sends all of it, so the union
// converges on the largest request's block set) rather than by request count —
// the distinction that keeps this off the O(file) retention path.
// `seenRewrites` is the conversation's registry of rewrite results this gate
// has VERIFIED on the wire — the evidence behind F-side clause (e), kept
// separate from `seen` because `seen` means "bytes CC itself sent here" and
// conflating the two would let the gate's own derivation pass as CC's input.
// A caller that omits it turns clause (e) off, which reports a legitimate
// re-serve as invented — noisy, never silent.
export function conservationViolations(e, seen, seenRewrites) {
  const out = [];
  const exemptions = [];
  const inMsgs = e.inMsgs ?? [];
  const outMsgs = e.outMsgs ?? [];
  const suppressed = suppressedIndices(e.stats);
  // No declaration on the entry, no exemption attempt at all — the peel
  // check below is skipped entirely rather than run and found null every
  // time, same short-circuit isDeclaredStrip's caller already relies on.
  const smooshDeclared = (e.smooshSplitStats?.peeled ?? 0) > 0;
  // Same short-circuit discipline as the peel: no declaration on the entry, no
  // exemption attempt. A gate that re-derives a rewrite nobody claimed would
  // be inventing the exemption rather than verifying one.
  const fssDeclared = (e.freshSessionSortStats?.rewrote?.length ?? 0) > 0
    || (e.freshSessionSortStats?.relocated?.length ?? 0) > 0;
  // Separate declaration, separate clause: a request can re-serve without
  // rewriting anything (CC sent no instance of the type at all), which is
  // exactly the shape clause (e) exists for.
  const fssReserved = (e.freshSessionSortStats?.reserved?.length ?? 0) > 0;
  const stripDeclared = ((e.contentStripStats?.trailerCount ?? 0)
    + (e.contentStripStats?.reminderCount ?? 0)) > 0;
  // Clause (h)'s declaration. Not a ctx.meta stat, because the extension
  // publishes none — see the clause comment for why `mutatedBy` stands in its
  // place and why that is the harder evidence, not the softer.
  const idnormDeclared = (e.mutatedBy ?? []).includes("identity-normalization");
  // THE THIRD ANSWER (dev-loop, "A checker has THREE answers, not two"), applied
  // to this gate's own inputs rather than to an empty corpus.
  //
  // Every clause above short-circuits on a missing declaration, which is right
  // — but it makes two different situations produce byte-identical rows: the
  // gate consulted its declarations and the content really is unaccounted for
  // (verified broken), versus the gate had nothing to consult (could not
  // verify). Before this flag the second wore the first's clothes, and a reader
  // could not tell them apart from the row or from its `detail` line.
  //
  // TRUE only when NONE of the four surfaces is present. Present-but-inert is a
  // CHECKED answer: the run loop writes `…Stats: … ?? null` and always builds
  // `mutatedBy`, so a request where every extension did nothing has all four
  // and reports an ordinary violation. That is what keeps this off the daily
  // sweep entirely — it can fire only on entries built by hand, which is
  // exactly the population that could not previously say which answer it meant.
  // A predicate of "any of the four missing" would fire on almost every
  // hand-built entry and train its reader to ignore the word.
  const declarationsUnavailable = e.smooshSplitStats === undefined
    && e.freshSessionSortStats === undefined
    && e.contentStripStats === undefined
    && e.mutatedBy === undefined;
  // The human-facing half. A flag in the JSON beside a `detail` line that still
  // reads as a plain violation leaves the sweep reader and the row pin exactly
  // where they were, so the line carries it too.
  const unavailableNote = declarationsUnavailable
    ? " [declarations unavailable — this entry carries none of the gate's four declaration surfaces, so no exemption clause could be checked: COULD NOT VERIFY, not verified broken]"
    : "";
  // F-side hashes a verified rewrite introduced, filled on the R-side and read
  // by the F-side loop — the post-rewrite block is new bytes on the wire by
  // construction and would otherwise read as invented.
  const fssExemptFHashes = new Set();
  // Hashes a verified peel introduced — filled during the R-side loop
  // below, read by the F-side loop after it, so a peeled unit's F-side
  // "invented" candidacy is judged only once the R-side has verified it.
  const smooshExemptFHashes = new Set();
  // Post-image hashes a verified session-start substitution introduced, filled
  // on the R-side and read by the F-side loop — same arrangement as the two
  // sets above, and for the same reason: the substituted block is new bytes on
  // the wire and would otherwise read as invented.
  const idnormExemptFHashes = new Set();

  const fUnitsByMsg = outMsgs.map(conservationUnits);
  const fHashes = new Set();
  for (const units of fUnitsByMsg) for (const u of units) fHashes.add(u.hash);
  const fJoinHashes = new Set();
  for (let i = 0; i < fUnitsByMsg.length; i++) {
    const j = joinUnitHash(fUnitsByMsg[i]);
    if (j !== null) fJoinHashes.add(j);
    if (i + 1 < fUnitsByMsg.length) {
      const x = crossJoinUnitHash(fUnitsByMsg[i], fUnitsByMsg[i + 1]);
      if (x !== null) fJoinHashes.add(x);
    }
  }

  const rHashes = new Set();
  let assistantResidue = 0;
  for (let i = 0; i < inMsgs.length; i++) {
    const msg = inMsgs[i];
    const units = conservationUnits(msg);
    if (isAssistant(msg)) {
      for (const u of units) if (!fHashes.has(u.hash)) assistantResidue++;
      continue;
    }
    for (const u of units) rHashes.add(u.hash);
    if (suppressed.has(i)) {
      // A declared suppression must leave its content behind. Both matchable
      // shapes are the extension's own: a per-block copy, or the merged join.
      const unaccounted = units.filter((u) => !fHashes.has(u.hash) && !fJoinHashes.has(u.hash));
      if (unaccounted.length) {
        out.push({
          n: e.n,
          ts: e.ts,
          kind: "suppressed-without-copy",
          // The index the `detail` string has always printed, as data. A
          // consumer that needs it (the row-evidence pin pass) parsing it back
          // out of prose is the hand-rolled-identity error one level down —
          // and `side` says which coordinate space it is in, the distinction
          // this file pays for whenever it is left implicit.
          at: i,
          side: "in",
          declarationsUnavailable,
          detail: `in[${i}] (${msg?.role}): ${unaccounted.length} of ${units.length} unit(s) reconstructible from neither a forwarded block nor a forwarded join${unavailableNote}`,
        });
      }
      continue;
    }
    const lost = units.filter((u) => !fHashes.has(u.hash) && !isDeclaredStrip(u));
    if (lost.length) {
      // Clause (d): a declared peel that re-derives, byte-identically, into
      // F exempts the whole message's lost list — never a subset. A
      // mismatch anywhere in the re-run split (an unrelated real drop
      // alongside a legitimate peel, or tampered forward bytes) fails
      // `.every` and the violation stands undiminished; smoosh-split never
      // touches non-tool_result blocks, so a clean peel result covering
      // every unit is exactly the byte-verification the definition requires.
      // Clause (g): content-strip's declared removals, checked against its own
      // predicates. Applied FIRST because it can account for units the other
      // clauses would otherwise have to explain — including a peel product.
      const strippable = stripDeclared ? contentStripUnitHashes(msg) : new Set();
      const stripExempt = strippable.size ? lost.filter((u) => strippable.has(u.hash)) : [];
      // Clause (f): fresh-session-sort's declared rewrites, re-derived here.
      // Per UNIT: a lost unit is excused only when ITS OWN pre-image maps to a
      // post-image that is on the wire — never because some other block of the
      // same message was rewritten successfully.
      const rewritten = fssDeclared ? freshSessionSortRewritePairs(msg) : new Map();
      const rewriteExempt = rewritten.size
        ? lost.filter((u) => !stripExempt.includes(u)
            && rewritten.has(u.hash) && fHashes.has(rewritten.get(u.hash)))
        : [];
      // The F-side registry and clause (e)'s cross-request one keep taking
      // EVERY verified rewrite, not just the exempted ones: a post-image that
      // descends from CC's own bytes through a transform this gate re-derived
      // and saw on the wire is not invented, whatever else happened to the
      // message it came from. Only the R-side selection narrows here.
      for (const h of rewritten.values()) {
        if (!fHashes.has(h)) continue;
        fssExemptFHashes.add(h);
        // Verified HERE, on this request: the transform re-derived from CC's
        // own block and found on the wire. That is what a later request's
        // declared re-serve of the same bytes gets to point at (clause (e)).
        if (seenRewrites) seenRewrites.add(h);
      }
      // Clause (h): identity-normalization's declared session-start
      // substitution, re-derived here. Per UNIT, not per message: a lost unit
      // is excused only when the substitution's own output for THAT block is
      // on the wire, which is what leaves a real loss beside it standing.
      const substituted = idnormDeclared ? identityNormalizationSubstitutionPairs(msg) : new Map();
      const idnormExempt = substituted.size
        ? lost.filter((u) => !stripExempt.includes(u) && !rewriteExempt.includes(u)
            && substituted.has(u.hash) && fHashes.has(substituted.get(u.hash)))
        : [];
      for (const u of idnormExempt) idnormExemptFHashes.add(substituted.get(u.hash));
      const declaredExempt = [...stripExempt, ...rewriteExempt, ...idnormExempt];
      if (declaredExempt.length === lost.length && lost.length > 0) {
        // Which mechanism accounted for what, in the order the clauses ran.
        // The F-side has always named its reasons as a list; the R-side's
        // two-way ternary could not express a third, and an exemption ledger
        // that mislabels WHY bytes were excused is the only thing standing
        // between a declared exemption and a silent one.
        const reasons = [];
        if (rewriteExempt.length) reasons.push("fresh-session-sort:rewrite");
        if (stripExempt.length) reasons.push("content-strip:declared-strip");
        if (idnormExempt.length) reasons.push("identity-normalization:session-start-substitution");
        exemptions.push({
          n: e.n,
          ts: e.ts,
          kind: "lost",
          at: i,
          side: "in",
          exemptReason: reasons.join(" + "),
          detail: `in[${i}] (${msg?.role}): ${lost.length} of ${units.length} unit(s) exempt — `
            + `${rewriteExempt.length} re-derived from fresh-session-sort's own rewrite and verified in F, `
            + `${stripExempt.length} accepted by content-strip's own predicates, `
            + `${idnormExempt.length} re-derived from identity-normalization's own SessionStart substitution and verified in F`,
        });
        continue;
      }
      // The COMPOSED case, and it is the only one measured: smoosh-split
      // peels a bookkeeping reminder out of a tool_result, and content-strip
      // then legitimately deletes that peeled block. The peel's own
      // verification requires every peeled unit present in F, so the strip
      // makes it fail — correctly, on its own terms, and wrongly overall,
      // because between them the two declared mitigations account for every
      // byte. A peeled unit content-strip's OWN predicates accept is therefore
      // accounted, not missing.
      const peeled = smooshDeclared ? smooshSplitPeelUnits(msg) : null;
      const peelBlocks = smooshDeclared ? smooshSplitPeelBlocks(msg) : new Map();
      const peelAccounted = (u) =>
        fHashes.has(u.hash)
        || (stripDeclared && isDeclaredContentStripBlock(peelBlocks.get(u.hash)));
      if (peeled && peeled.every(peelAccounted)) {
        for (const u of peeled) smooshExemptFHashes.add(u.hash);
        exemptions.push({
          n: e.n,
          ts: e.ts,
          kind: "lost",
          at: i,
          side: "in",
          exemptReason: "smoosh-split:declared-peel",
          detail: `in[${i}] (${msg?.role}): ${lost.length} of ${units.length} unit(s) exempt — smoosh-split's declared peel (${e.smooshSplitStats.peeled} peeled), each unit either verified byte-identical in the forwarded array or accepted by content-strip's own predicates`,
        });
      } else {
        // The count names the UNACCOUNTED units, not the whole lost list. The
        // row's sentence asserts that N units are unexplained, and where the
        // lost list was only PARTIALLY accounted for it used to count units
        // that had a declared, byte-verified explanation — naming them as
        // missing in the same row that correctly reported their neighbour.
        //
        // A no-op wherever nothing is exempt: `declaredExempt` is empty there
        // and the two counts coincide, which is why this needs a bite that
        // CONSTRUCTS the partial case rather than trusting the corpus to
        // contain one. The other two violation kinds already did it this way —
        // `suppressed-without-copy` counts its own `unaccounted` list, and the
        // F-side `invented` count is computed after the exemptions are
        // subtracted. This is the R-side `lost` branch catching up.
        const unaccounted = lost.filter((u) => !declaredExempt.includes(u));
        out.push({
          n: e.n,
          ts: e.ts,
          kind: "lost",
          at: i,
          side: "in",
          declarationsUnavailable,
          detail: `in[${i}] (${msg?.role}): ${unaccounted.length} of ${units.length} unit(s) present in CC's request and in no forwarded message${unavailableNote}`,
        });
      }
    }
  }

  for (let i = 0; i < outMsgs.length; i++) {
    const msg = outMsgs[i];
    if (isAssistant(msg) || isDeclaredInjection(msg)) continue;
    const candidates = fUnitsByMsg[i].filter((u) => !rHashes.has(u.hash) && !(seen && seen.has(u.hash)));
    // Clause (e): only when the extension DECLARES a re-serve, and only for
    // bytes this gate verified earlier in this conversation.
    const reserveExempt = (u) => fssReserved && seenRewrites && seenRewrites.has(u.hash);
    const invented = candidates.filter((u) => !smooshExemptFHashes.has(u.hash)
      && !fssExemptFHashes.has(u.hash) && !reserveExempt(u) && !idnormExemptFHashes.has(u.hash));
    // Which mechanism accounted for it, counted separately. Reporting a
    // fresh-session-sort rewrite as "smoosh-split:declared-peel" — which this
    // did when the second exemption was first wired — makes the exemption
    // ledger lie about WHY bytes were excused, and that ledger is the only
    // thing standing between a declared exemption and a silent one.
    const byPeel = candidates.filter((u) => smooshExemptFHashes.has(u.hash)).length;
    const byRewrite = candidates.filter((u) => !smooshExemptFHashes.has(u.hash)
      && fssExemptFHashes.has(u.hash)).length;
    const byReserve = candidates.filter((u) => !smooshExemptFHashes.has(u.hash)
      && !fssExemptFHashes.has(u.hash) && reserveExempt(u)).length;
    const bySubstitution = candidates.filter((u) => !smooshExemptFHashes.has(u.hash)
      && !fssExemptFHashes.has(u.hash) && !reserveExempt(u)
      && idnormExemptFHashes.has(u.hash)).length;
    if (byPeel + byRewrite + byReserve + bySubstitution > 0) {
      const reasons = [];
      if (byPeel) reasons.push("smoosh-split:declared-peel");
      if (byRewrite) reasons.push("fresh-session-sort:rewrite");
      if (byReserve) reasons.push("fresh-session-sort:reserved");
      if (bySubstitution) reasons.push("identity-normalization:session-start-substitution");
      exemptions.push({
        n: e.n,
        ts: e.ts,
        kind: "invented",
        at: i,
        side: "out",
        exemptReason: reasons.join(" + "),
        detail: `out[${i}] (${msg?.role}): ${byPeel + byRewrite + byReserve + bySubstitution} of ${fUnitsByMsg[i].length} unit(s) exempt — `
          + `${byPeel} produced by smoosh-split's declared peel, `
          + `${byRewrite} by fresh-session-sort's verified rewrite, `
          + `${byReserve} re-served by fresh-session-sort from an earlier verified rewrite in this conversation, `
          + `${bySubstitution} produced by identity-normalization's verified SessionStart substitution`,
      });
    }
    if (invented.length) {
      out.push({
        n: e.n,
        ts: e.ts,
        kind: "invented",
        at: i,
        side: "out",
        declarationsUnavailable,
        detail: `out[${i}] (${msg?.role}): ${invented.length} of ${fUnitsByMsg[i].length} unit(s) CC never sent in this conversation${unavailableNote}`,
      });
    }
  }

  if (seen) for (const h of rHashes) seen.add(h);
  return { violations: out, assistantResidue, exemptions };
}

// Whole-corpus shape, grouped by conversation so `seen` means what the
// definition says — bytes CC sent EARLIER IN THIS CONVERSATION, never a
// co-tenant's. One implementation, two shapes (the streaming caller wants one
// verdict at a time), rather than a tested one and a shipped one.
export function findConservationViolations(entries) {
  const seenByGroup = new Map();
  const rewritesByGroup = new Map();
  const out = [];
  for (const raw of entries) {
    const inMsgs = raw.inMsgs ?? [];
    const cid = inMsgs.length ? sha(JSON.stringify(inMsgs[0])) : null;
    if (cid === null) continue;
    const g = `${raw.key}|${cid}`;
    if (!seenByGroup.has(g)) seenByGroup.set(g, new Set());
    if (!rewritesByGroup.has(g)) rewritesByGroup.set(g, new Set());
    out.push(...conservationViolations(raw, seenByGroup.get(g), rewritesByGroup.get(g)).violations);
  }
  return out.sort((a, b) => a.n - b.n);
}

// Fidelity classification, pure so the population boundaries are testable.
// FIVE populations, never collapsed into one ratio:
//   comparable/matched      — unmutated with a recorded outSha; a mismatch
//                             here fails the gate (the replay is not
//                             reproducing the real request).
//   mutatedComparable/-Matched — mutated with a recorded outSha;
//                             INFORMATIONAL ONLY, because state divergence
//                             makes a mismatch legitimate. On busy sessions
//                             every request is mutated, so this is the only
//                             fidelity signal there is.
//   noOutcome               — no outcome record at all (predates the feature,
//                             or no usage ever arrived).
//   outcomeWithoutSha       — outcome present but written by the pre-outSha
//                             recorder (14 such in one capture, all between
//                             the two 2026-07-28 restarts). Distinct from
//                             noOutcome because this population never shrinks
//                             by itself and must not read as "records
//                             missing, will fill in".
export function classifyFidelity(report, outcomes) {
  const fidelity = {
    comparable: 0,
    matched: 0,
    mutatedComparable: 0,
    mutatedMatched: 0,
    notComparableMutated: 0, // kept: gate-live and its consumers read this name
    noOutcome: 0,
    outcomeWithoutSha: 0,
    mismatches: [],
  };
  for (const e of report) {
    if (e.error) continue;
    const oc = outcomes.get(e.captureId);
    if (!oc || !e.outBodySha) {
      fidelity.noOutcome++;
      continue;
    }
    if (!oc.outSha) {
      fidelity.outcomeWithoutSha++;
      continue;
    }
    if ((e.mutatedBy ?? []).length > 0) {
      fidelity.notComparableMutated++;
      fidelity.mutatedComparable++;
      if (oc.outSha === e.outBodySha) fidelity.mutatedMatched++;
      continue;
    }
    fidelity.comparable++;
    if (oc.outSha === e.outBodySha) fidelity.matched++;
    else fidelity.mismatches.push({ n: e.n, recorded: oc.outSha, replayed: e.outBodySha });
  }
  return fidelity;
}

// Blank lines are skipped WITHOUT consuming an index, matching the previous
// `.filter()` — `n` must keep the meaning that `--restart-at`,
// `--wipe-state-at` and every violation report already use.
//
// readLines, not readline.createInterface: the consumer awaits per request,
// and readline's push-based iterator buffers the entire remaining file during
// those awaits — measured 3.27 GB peak on a 1.5 GB capture while this
// function was called "streaming". tools/read-lines.mjs carries the measured
// failure and the bite test pinning the pull-based mechanism.
export async function* readCapture(path) {
  let n = 0;
  for await (const line of readLines(path)) {
    if (!line.trim()) continue;
    yield [n++, line];
  }
}

// --gates-from-capture needs every boot record BEFORE loadExtensions runs
// (several extensions read their gate env at load or first-call time), but
// main()'s own `boots` array is only complete once the whole capture has
// been read — a chicken-and-egg the flag resolves with a lightweight
// PRE-pass: same pull-based reader as `readCapture` (never slurped, so this
// costs one extra streamed parse of the file, not a second copy of it in
// memory), keeping only the rare `type:"boot"` lines rather than every
// request body.
export async function readBootRecords(path) {
  const boots = [];
  for await (const line of readLines(path)) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (rec.type === "boot") boots.push(rec);
  }
  return boots;
}

// --- Gate provenance (BACKLOG.md: "replay warns on gateless runs of gated
// captures") ---
//
// A capture's boot record(s) name the CACHE_FIX_* gates the traffic was
// served under (buildBootRecord, proxy/extensions/request-capture.mjs).
// Replaying that capture under a DIFFERENT gate set compares two worlds and
// reports the difference as a finding — the same class of error
// gate-live.mjs's own comment documents for the daily sweep (extension
// defaults replayed against production's 11 gates, 0 violations vs 2 on the
// same corpus). Grounding for mechanizing rather than trusting prose here:
// the SAME operator-side instrument error happened three times in one day
// (2026-07-29 default-gates census), each time with the dev-loop warning
// already loaded.
//
// declaredGateEnv: union across every boot record in the capture, not just
// the first — a capture can span a restart under a different unit file, and
// any boot's declared gates are relevant to what the traffic after it saw.
// `CACHE_FIX_CAPTURE_MAX_MB` is capture retention, not a mitigation gate
// (excluded the same way the existing provenance printout already
// excludes it). Later boots win on VALUE (object insertion order tracks
// file order, since boots is built by streaming the capture forward) — the
// same rule `--gates-from-capture` (below) needs and `declaredGateNames`
// (names only, no values) did not.
export function declaredGateEnv(boots) {
  const env = {};
  for (const b of boots ?? []) {
    for (const [k, v] of Object.entries(b?.gates ?? {})) {
      if (k !== "CACHE_FIX_CAPTURE_MAX_MB") env[k] = v;
    }
  }
  return env;
}

export function declaredGateNames(boots) {
  return new Set(Object.keys(declaredGateEnv(boots)));
}

// --gates-from-capture (BACKLOG.md: "and READY, the mechanized form: a
// --gates-from-capture replay flag applying the union"). The union's
// VALUES, not just its names, with explicit --env overrides winning
// per-key — the same combination `main()` used to hand-extract from a
// boot record and pass back in as `--env` flags, now mechanized so no
// operator does that by hand (the standing cause of the 2026-07-29
// default-gates incidents, dev-loop.md "Replay the configuration that is
// SERVING"). Exported so a test asserts the SAME merge the CLI performs,
// never a re-derived one (dev-loop.md, "never hand-roll identity in a
// probe").
export function resolveGatesFromCapture(boots, envOverrides) {
  return { ...declaredGateEnv(boots), ...(envOverrides ?? {}) };
}

// Which of the declared gates are set in the effective replay env. "Set"
// mirrors buildBootRecord's own inclusion rule exactly — presence as an own
// key of the env object, any value — never a re-derived truthiness guess,
// so a --env override and an inherited process.env variable count
// identically, the same way they did when the boot record was written.
export function gateSourceSummary(boots, env) {
  const declared = declaredGateNames(boots);
  const set = [...declared].filter((k) => Object.prototype.hasOwnProperty.call(env ?? {}, k));
  return {
    declaredCount: declared.size,
    setCount: set.length,
    // Only the NONE-set case warns; partial visibility (some but not all
    // declared gates set) is a legitimate configuration (a --env override
    // naming a subset) and is surfaced by the header stamp, not the
    // warning.
    warn: declared.size > 0 && set.length === 0,
  };
}

export function formatGateSource({ declaredCount, setCount }) {
  if (declaredCount === 0) return "no gates declared in capture";
  if (setCount === 0) return `none (capture declares ${declaredCount})`;
  return `${setCount} of ${declaredCount} declared set`;
}

async function main() {
  const args = parseArgs(process.argv);

  // Scratch state dir BEFORE loading extensions: several read env at
  // module scope is not the idiom here (all gates are read per-call),
  // but claude-home is read per-call too — set it first anyway so no
  // load-order surprise can leak a write to the live ~/.claude.
  const scratch = await tmpDir("cache-fix-replay-");
  process.env.CLAUDE_CONFIG_DIR = scratch;
  process.env.XDG_STATE_HOME = scratch;
  process.env.XDG_DATA_HOME = scratch;
  // --gates-from-capture: resolve the capture's own ALL-BOOTS gate union
  // (values, later boots winning) via a pre-pass BEFORE extensions load —
  // the same merge point --env alone used, now with the capture as the
  // base and --env as the override. Without the flag, behaviour is
  // unchanged (args.env applied directly). See resolveGatesFromCapture.
  const gateEnv = args.gatesFromCapture
    ? resolveGatesFromCapture(await readBootRecords(args.file), args.env)
    : args.env;
  for (const [k, v] of Object.entries(gateEnv)) process.env[k] = v;

  const { loadExtensions, runOnRequest } = await import(
    new URL("../proxy/pipeline.mjs", import.meta.url).href
  );

  let extensions = await loadExtensions(EXT_DIR, EXT_CONFIG);

  const report = [];
  const stability = [];
  const safety = [];
  const conservation = [];
  const conservationExemptions = [];
  // Per-conversation first-seen registry for the conservation gate (see its
  // DEFINITION). Hashes only, keyed by (capture key, conversation), so it is
  // bounded by history size rather than by request count.
  const conservationSeen = new Map();
  // Same keying, different meaning: rewrite results this gate has verified on
  // the wire, which is what a declared re-serve points at (F-side clause (e)).
  const conservationRewrites = new Map();
  let conservationResidue = 0;
  const outcomes = new Map();
  const boots = [];

  // --dump-forwarded: opened once, "w" truncates at start — never accumulated
  // in memory across the run. Absent the flag this is null and the dump write
  // below is skipped entirely, so behaviour is unchanged without it.
  const dumpStream = args.dumpForwarded ? createWriteStream(args.dumpOut, { flags: "w" }) : null;

  // `n` counts REQUEST records only. Outcome records (what the API charged)
  // share the file but carry no body, and letting them consume an index would
  // shift every request number — so --restart-at N and every violation report
  // would silently point at the wrong request.
  let reqN = -1;
  for await (const [, line] of readCapture(args.file)) {
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      report.push({ n: reqN + 1, error: "unparseable capture line" });
      continue;
    }
    if (rec.type === "outcome") {
      outcomes.set(rec.id, rec);
      continue;
    }
    // Boot records mark a restart boundary and the gate set in force. They
    // carry no body and must not consume a request index.
    if (rec.type === "boot") {
      boots.push({ afterRequest: reqN, ...rec });
      continue;
    }
    const n = ++reqN;
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

    // Hash of the body THIS replay produced, in the same form the proxy
    // hashes what it forwards (JSON.stringify of the mutated body). Shared
    // with the --dump-forwarded write below so both name the same body.
    const outBodySha = createHash("sha256").update(JSON.stringify(ctx.body)).digest("hex").slice(0, 16);
    report.push({
      n,
      ts: rec.ts,
      key: rec.key,
      captureId: rec.id ?? null,
      outBodySha,
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
      // The capture record's OWN identifier, carried so anything that has to
      // go back to the file for bytes can join on it. `n` cannot do that job:
      // it counts request records while the file is read by LINE, and the two
      // diverge by every outcome and boot record in between (the read loop's
      // comment above says so; the excerpt pass below walked into it anyway —
      // test/replay-excerpt-record-identity.test.mjs).
      id: rec.id ?? null,
      key: rec.key,
      inMsgs: Array.isArray(rec.body?.messages) ? rec.body.messages : [],
      outMsgs: Array.isArray(ctx.body?.messages) ? ctx.body.messages : [],
      // What CC sent vs what we forwarded — deferred-tool-rewrite's whole job
      // is to make the second stable while the first moves (row 6).
      inTools: rec.body?.tools,
      outTools: ctx.body?.tools,
      // Same pair of questions for the system block — it renders between
      // tools[] and messages, so it is the other half of "was the prefix above
      // messages intact" (compactEntry hashes both; the bodies stop here).
      inSystem: rec.body?.system,
      outSystem: ctx.body?.system,
      // Which extensions actually changed the body, measured by the staged
      // hashing above rather than self-reported. The conservation gate's
      // clause (h) uses it as identity-normalization's declaration, because
      // that extension publishes no ctx.meta telemetry to key on.
      mutatedBy,
      action: ctx.meta.insertionNormalizeStats?.action ?? null,
      resetReason: ctx.meta.insertionNormalizeStats?.resetReason ?? null,
      stats: ctx.meta.insertionNormalizeStats ?? null,
      freshSessionSortStats: ctx.meta.freshSessionSortStats ?? null,
      contentStripStats: ctx.meta.contentStripStats ?? null,
      deferredToolRewriteStats: ctx.meta.deferredToolRewriteStats ?? null,
      smooshSplitStats: ctx.meta.smooshSplitStats ?? null,
    };
    // Safety is a per-request question, so answer it now and keep only the
    // verdict; the messages become garbage as soon as this iteration ends.
    const sv = safetyViolation(full);
    if (sv) safety.push(sv);
    // Content conservation is per-request too, but carries one piece of
    // cross-request state: what CC has already sent in THIS conversation (the
    // first-seen registry the pin re-serves from). Grouped on the same
    // conversation identity every other checker uses — msgs[0]'s byte hash.
    {
      const cid = full.inMsgs.length ? sha(JSON.stringify(full.inMsgs[0])) : null;
      if (cid !== null) {
        const g = `${full.key}|${cid}`;
        if (!conservationSeen.has(g)) conservationSeen.set(g, new Set());
        if (!conservationRewrites.has(g)) conservationRewrites.set(g, new Set());
        const cv = conservationViolations(full, conservationSeen.get(g), conservationRewrites.get(g));
        conservation.push(...cv.violations);
        conservationResidue += cv.assistantResidue;
        conservationExemptions.push(...cv.exemptions);
      }
    }
    // --dump-forwarded: the forwarded bodies still exist at this point in the
    // loop, one line above where compactEntry throws them away for good (heap
    // discipline — see the file header). An `i` beyond the array yields
    // `msg: null`, which is data (the message was suppressed/absent), not an
    // error.
    if (dumpStream && args.dumpForwarded.has(n)) {
      for (const i of args.dumpForwarded.get(n)) {
        dumpStream.write(
          JSON.stringify({ n, i, outBodySha, msgsLen: full.outMsgs.length, msg: full.outMsgs[i] ?? null }) + "\n",
        );
      }
    }
    // Everything else keeps hashes, not bodies — see compactEntry.
    stability.push(compactEntry(full));
  }

  // Gate provenance check — see the block comment above `declaredGateEnv`.
  // `process.env` here already carries the `--env`/`--gates-from-capture`
  // merge applied above (before extensions loaded), so it IS the effective
  // replay env.
  // Computed once, after the read loop (boots is only complete once the
  // whole capture has been read), and printed once — not per request.
  const gateSource = gateSourceSummary(boots, process.env);
  if (gateSource.warn) {
    process.stderr.write(
      `WARNING: replaying under DEFAULT gates — this traffic was served with ${gateSource.declaredCount} gate(s). Pass --gates-from-capture, --env, or use gate-live.\n`,
    );
  }

  // FIDELITY: did the replay actually reproduce what went on the wire?
  //
  // This gate rests on an assumption nothing has ever checked — that
  // re-running the pipeline offline reproduces the bytes the proxy really
  // forwarded. Captures are pre-pipeline by design, so the output was never
  // recorded and the assumption was unfalsifiable. Outcome records now carry
  // `outSha`, the hash of the actual outbound body, so the reconstruction can
  // be compared against it.
  //
  // A mismatch does not mean the proxy misbehaved; it means the REPLAY is not
  // modelling the proxy, and therefore that every verdict in this run is about
  // a system that never ran. That is worth knowing loudly and is reported
  // separately from the four invariant gates for exactly that reason.
  //
  // Scoped to requests NO EXTENSION MUTATED, and that scoping is the whole
  // difference between a check and a permanently-red light. A replay starts
  // from an empty state directory while the live proxy carried accumulated
  // canonicals and tools baselines, so a MUTATED request legitimately differs
  // from what went on the wire — measured 0/8 on a mid-session corpus even
  // under the exact production gate set. Reporting that as failure would be a
  // check firing on a non-defect, which trains its reader to ignore it.
  //
  // An UNMUTATED request has no such excuse: the proxy forwarded
  // JSON.stringify(body) with nothing changed, and so did the replay. A
  // mismatch there means the replay is not reproducing the real request, and
  // every verdict in the run is about a different system.
  // Three populations, reported separately and never collapsed into one
  // ratio. "0/0" is indistinguishable from "checked and clean", which is the
  // same absence-of-evidence-as-evidence-of-absence that let a broken --cold
  // reader print "No cold rewrites recorded" over 26 real records.
  // The mutated pair is INFORMATIONAL, never a gate: state divergence makes a
  // mismatch there legitimate, so it cannot fail anything. It exists because
  // on a busy session every request is mutated (insertion-normalization and
  // tool-rewrite touch essentially all of them), so `comparable` can stay 0
  // forever on exactly the traffic that matters — measured across all nine
  // captures of 2026-07-29's scheduled sweep. A high mutatedMatched says the
  // replay's reconstruction converges on the real wire bytes anyway; a
  // permanent 0/large would be the only available hint that it models a
  // different system, downgraded to a hint precisely because it cannot be
  // distinguished from honest state divergence.
  const fidelity = classifyFidelity(report, outcomes);

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
  // Self-describing: a census output should name what produced it without
  // requiring the reader to cross-reference the boot record by hand.
  if (census) census.gateSource = formatGateSource(gateSource);
  const toolsDeltas = args.census ? findToolsDeltas(stability) : null;
  const mitigation = args.census ? findMitigationGaps(stability) : null;
  const edits = args.census ? findEditPositions(stability) : null;
  // Always computed, not census-gated: this is the check whose absence let a
  // 349k bust replay green, so it must be in every run's output rather than
  // behind a flag someone has to remember.
  const absorptionMisses = findAbsorptionMisses(stability);
  // Also always on, and for the same reason: row 25's class was found by
  // reading one pair by hand, so a flag someone has to remember would leave
  // the rate unmeasured exactly as it is now. A REPORT — no exit code moves.
  const relocDepartures = findRelocDepartures(stability);
  const blockMigrations = args.census ? findBlockMigrations(stability) : null;
  const successions = args.census ? findSuccessions(stability) : null;
  const duplicateRequests = args.census ? findDuplicateRequests(stability) : null;
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
  // Telemetry-keyed exemptions (fresh-session-sort's first-appearance
  // relocations; deferred-tool-rewrite's schema-change reset wiping its own
  // injections) — kept out of `violations` but reported alongside it,
  // annotated with their basis, so an exempted divergence stays visible
  // rather than silently dropped.
  const exemptions = findStabilityExemptions(stability);
  if (violations.length) {
    const mutators = extensions.filter((e) => e.onRequest);

    // Replay the corpus through mutators[0..cut) and report, per violation,
    // whether its output divergence has already dropped below the bar.
    const replayThrough = async (cut) => {
      const prefix = mutators.slice(0, cut);
      const scratch2 = await tmpDir("cache-fix-attr-");
      const savedHome = process.env.CLAUDE_CONFIG_DIR;
      const savedState2 = process.env.XDG_STATE_HOME;
      const savedData2 = process.env.XDG_DATA_HOME;
      process.env.CLAUDE_CONFIG_DIR = scratch2;
      process.env.XDG_STATE_HOME = scratch2;
      process.env.XDG_DATA_HOME = scratch2;
      const outs = new Map();
      const needed = new Set(violations.flatMap((v) => [v.prevN, v.n]));
      let bReqN = -1;
      for await (const [, line] of readCapture(args.file)) {
        let rec;
        try {
          rec = JSON.parse(line);
        } catch {
          continue;
        }
        // Same numbering rule as the main loop — attribution replays must
        // land on the same request indices the violations were reported in.
        if (rec.type === "outcome" || rec.type === "boot") continue;
        const n = ++bReqN;
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
      process.env.XDG_STATE_HOME = savedState2;
      process.env.XDG_DATA_HOME = savedData2;
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

  // --- Row evidence pins ---
  //
  // Off unless asked for, because it costs a second pipeline pass over the
  // capture; `gate-live` asks for it on every sweep, which is the only caller
  // that has to survive the rotation window. `null` (not `[]`) when the flag
  // is absent: a run that never pinned did not measure zero pins.
  let pins = null;
  let pinSummary = null;
  if (args.pinRows) {
    const { asks, truncated, skipped } = pinAsks({
      stability: violations,
      stabilityExempt: exemptions,
      conservation,
      conservationExempt: conservationExemptions,
      sequence,
      order: orderViolations,
      absorptionMiss: absorptionMisses,
      relocDeparture: relocDepartures,
    });
    // A restart or state-wipe simulation makes the pin pass a different run
    // from the one that produced the rows, and the bytes-match check would
    // then reject every pin for the wrong reason. Named rather than silently
    // producing rejections.
    const blocked = args.restartAt !== null || args.wipeStateAt !== null
      ? "--restart-at/--wipe-state-at: the pin pass cannot reproduce a simulated restart"
      : null;
    const byN = new Map(stability.map((e) => [e.n, e]));
    const evidence = blocked || !asks.length
      ? new Map()
      : await collectPinEvidence(args.file, asks, loadExtensions, runOnRequest);
    pins = blocked ? [] : buildRowPins(asks, evidence, byN);
    pinSummary = {
      asked: asks.length,
      built: pins.length,
      rejected: pins.filter((p) => p.checks.bytesMatchRow === false).length,
      unverifiable: pins.filter((p) => p.checks.bytesMatchRow === null).length,
      truncated,
      skipped,
      blocked,
    };
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({ report, violations, exemptions, safety, conservation, conservationExemptions, conservationResidue, sequence, orderViolations, absorptionMisses, relocDepartures, census, toolsDeltas, mitigation, edits, blockMigrations, successions, duplicateRequests, fidelity, boots, trace, pins, pinSummary }, null, 2) + "\n");
  } else {
    const counts = new Map();
    for (const r of report) {
      for (const name of r.mutatedBy ?? []) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
      process.stdout.write(`replayed ${report.length} requests from ${args.file}\n`);
    if (boots.length) {
      // Provenance the corpus now carries about itself: where the proxy
      // restarted, and under which gates the traffic was recorded. Replaying
      // under a DIFFERENT gate set is comparing two worlds — the mistake the
      // gate runner made against production for a whole day.
      process.stdout.write(`capture provenance: ${boots.length} proxy boot(s) in this corpus\n`);
      for (const b of boots.slice(0, 4)) {
        const on = Object.keys(b.gates ?? {}).filter((k) => k !== "CACHE_FIX_CAPTURE_MAX_MB").length;
        process.stdout.write(
          `  after request ${b.afterRequest} — pid ${b.pid}, tree ${b.proxyTree ?? "?"}, ${on} gate(s) — replay with --restart-at ${b.afterRequest + 1}\n`,
        );
      }
    }
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
        `  n=${v.prevN}->${v.n} ts=${v.ts} inDiv=${v.inDiv ?? "append-only"} outDiv=${v.outDiv}` +
          `${v.ccIdenticalAtOutDiv ? " [CC bytes at outDiv IDENTICAL -> ours]" : " [CC also changed outDiv]"}` +
          // What it cost, on the same line as what it was: a divergence inside
          // messages re-bills nothing extra when our own tools[] or system
          // moved across the same pair, and reading outDiv without this is how
          // a free row gets ranked as an expensive one. Three-valued via
          // prefixCostTag — an ABSENT measurement used to fall through to the
          // INTACT branch, i.e. a missing measurement printed as the most
          // expensive verdict.
          prefixCostTag(v.prefixAboveMessages) +
          ` <- ${who}\n`,
      );
    }

    // Exempted, not silently dropped: same divergence shape as a violation
    // above, but the extension's own telemetry accounts for it —
    // fresh-session-sort's first-appearance relocations, and
    // deferred-tool-rewrite's tool-schema-changed reset wiping the
    // announcements it had injected.
    process.stdout.write(`\nstability exemptions (telemetry-backed, not counted as violations): ${exemptions.length}\n`);
    for (const x of exemptions.slice(0, 20)) {
      process.stdout.write(
        `  n=${x.prevN}->${x.n} ts=${x.ts} inDiv=${x.inDiv ?? "append-only"} outDiv=${x.outDiv}` +
          ` <- ${x.exemptReason} (${x.exemptBasis.type})\n`,
      );
    }

    // Threat-matrix row 25, sized rather than asserted. The two numbers are
    // stated SEPARATELY on purpose: the total says how often CC stops sending
    // a relocated block, and the intact sub-count says how many of those cost
    // anything at all — folding the second into the first is exactly how this
    // row's single occurrence was carried into a handoff as the most expensive
    // item in the repo when it had cost nothing.
    {
      const costly = relocDepartures.filter((r) => r.prefixAboveMessages?.intact === true).length;
      process.stdout.write(
        `\nrelocated-block departures (row 25 — REPORT, not a gate): ${relocDepartures.length} total,` +
          ` ${costly} with the forwarded prefix above messages INTACT (those are the ones that cost)\n`,
      );
      for (const r of relocDepartures.slice(0, 20)) {
        process.stdout.write(
          `  n=${r.prevN}->${r.n} ts=${r.ts} type=${r.type} departed from raw msg[${r.prevMsgIdx}]` +
            prefixCostTag(r.prefixAboveMessages) + "\n",
        );
      }
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

    process.stdout.write(
      `\ncontent-conservation violations (CC bytes neither forwarded nor accounted for): ${conservation.length}\n`,
    );
    for (const c of conservation.slice(0, 20)) {
      process.stdout.write(`  n=${c.n} ts=${c.ts} ${c.kind}: ${c.detail}\n`);
    }
    // The population boundary, said out loud rather than left implicit: this
    // gate looks at non-assistant messages only (see its DEFINITION), and
    // this is how much it therefore did not look at.
    process.stdout.write(
      `  not examined: ${conservationResidue} assistant-role block(s) the pipeline rewrote or dropped (tool_use normalization, thinking sanitization — a separately-gated class)\n`,
    );
    // Exempted, not silently absorbed: same shape as a conservation violation
    // above, but smoosh-split's own declared-peel telemetry verifies it —
    // same reporting discipline as the stability exemptions line.
    process.stdout.write(
      `\ncontent-conservation exemptions (telemetry-backed, not counted as violations): ${conservationExemptions.length}\n`,
    );
    for (const x of conservationExemptions.slice(0, 20)) {
      process.stdout.write(`  n=${x.n} ts=${x.ts} ${x.kind}: ${x.detail} <- ${x.exemptReason}\n`);
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
      process.stdout.write(`  gates: ${census.gateSource}\n`);
      const total = census.pairs || 1;
      for (const [kind, c] of [...census.tally.entries()].sort((a, b) => b[1] - a[1])) {
        const ex = census.examples.get(kind);
        const pct = ((100 * c) / total).toFixed(1).padStart(5);
        const where = kind === "append-only" || kind === "identical" ? "" : `   e.g. n=${ex.prevN}->${ex.n}`;
        process.stdout.write(`  ${String(c).padStart(5)}  ${pct}%  ${kind}${where}\n`);
      }
    }
    {
      const bad = fidelity.mismatches.length;
      process.stdout.write(
        `\nreplay fidelity: ${fidelity.matched}/${fidelity.comparable} comparable` +
          `  |  ${fidelity.notComparableMutated} mutated (replay starts from empty state)` +
          `  |  ${fidelity.noOutcome} without an outcome record` +
          (fidelity.outcomeWithoutSha
            ? `  |  ${fidelity.outcomeWithoutSha} outcome predates outSha`
            : "") +
          "\n",
      );
      if (fidelity.mutatedComparable > 0) {
        // Informational: a mutated mismatch is legitimate (state divergence),
        // so this can never fail anything — but on busy sessions it is the
        // only fidelity signal there is, since every request is mutated.
        process.stdout.write(
          `  mutated, informational: ${fidelity.mutatedMatched}/${fidelity.mutatedComparable} reconstruction matched the wire\n`,
        );
      }
      if (fidelity.comparable === 0) {
        process.stdout.write(
          `  NOTHING COMPARABLE — this run proves nothing about replay fidelity.` +
            `${fidelity.noOutcome ? " Outcome records are missing; they are written from proxy tree 8a0d995 onward." : ""}\n`,
        );
      }
      if (bad) {
        process.stdout.write(
          `  ${bad} MISMATCH on requests no extension touched — the replay is not reproducing the real request,\n` +
            `  so every other verdict in this run describes a different system\n`,
        );
        for (const m of fidelity.mismatches.slice(0, 5)) {
          process.stdout.write(`    n=${m.n} recorded=${m.recorded} replayed=${m.replayed}\n`);
        }
      }
    }
    if (edits && edits.length) {
      // Threat-matrix row 4: tail edits are cheap, mid-history edits are not.
      const mid = edits.filter((e) => !e.tail);
      process.stdout.write(
        `\nreplace/edit positions: ${edits.length} total, ${edits.length - mid.length} TAIL, ${mid.length} MID-HISTORY\n`,
      );
      const midBytes = mid.reduce((a, e) => a + e.rebilledBytes, 0);
      if (mid.length) {
        process.stdout.write(`  mid-history re-bills ~${(midBytes / 1e6).toFixed(1)} MB — row 4 says RE-OPEN on any of these\n`);
        for (const e of mid.slice(0, 6)) {
          const anchor =
            e.anchorDelta === null ? "no-human-anchor" : `anchor${e.anchorDelta >= 0 ? "+" : ""}${e.anchorDelta}`;
          // blockMigration rides beside anchorDelta: same n/prevN pair, source
          // index within the edit's neighbourhood — the reminder-swap shape
          // the anchor alone cannot name.
          const bm = (blockMigrations ?? []).filter((b) => b.n === e.n && b.prevN === e.prevN);
          const bmTag = bm.length
            ? " " + bm.map((b) => `[blockMigration ${migrationLine(b)}]${flapTag(b)}`).join(" ")
            : "";
          process.stdout.write(
            `    n=${e.prevN}->${e.n} edit@${e.at} of ${e.lastIdx} [${anchor}]${bmTag} ~${(e.rebilledBytes / 1e3).toFixed(0)} kB ${e.ts}\n`,
          );
        }
        // The measured norm (2026-07-29): edits cluster at the anchor. An
        // edit FAR from any anchor would be a NEW mechanism, worth a look —
        // so deliver the bytes with the flag (LOCAL stdout only; the class
        // was only ever named by reading content, and extraction friction is
        // what let row 4 sit unexplained for a day).
        const far = mid.filter((e) => e.anchorDelta !== null && Math.abs(e.anchorDelta) > 30);
        if (far.length) {
          process.stdout.write(
            `  ${far.length} edit(s) >30 from the human anchor — NOT the known reminder-anchoring class:\n`,
          );
          // Asks join to the capture by the record's own id, never by an
          // ordinal — see excerptsForAsks for the namespace this used to mix.
          const asks = [];
          for (const e of far.slice(0, 3)) {
            asks.push({ id: e.prevId, at: e.at, label: `n=${e.prevN} (before)` });
            asks.push({ id: e.id, at: e.at, label: `n=${e.n} (after)` });
          }
          for (const a of await excerptsForAsks(args.file, asks)) {
            process.stdout.write(`    @${a.at} ${a.label}  ${a.excerpt}\n`);
          }
        }
      }
    }
    if (blockMigrations && blockMigrations.length) {
      const flaps = blockMigrations.filter((b) => b.flap);
      const joins = blockMigrations.filter((b) => b.join);
      const crossJoins = joins.filter((b) => b.join === "cross-message");
      process.stdout.write(
        `\nblock migrations (reminder-swap shape): ${blockMigrations.length}, ${flaps.length} FLAP,` +
          ` ${joins.length} JOIN (${crossJoins.length} cross-message)\n`,
      );
      if (crossJoins.length) {
        process.stdout.write(
          `  a cross-message join spans two messages, so no hash set in the extension matches it —\n` +
            `  in-entry joins are already findSuppressibleDuplicate's shape (78940a0), these are not\n`,
        );
      }
      if (flaps.length) {
        process.stdout.write(
          `  a FLAP reverses a migration of the SAME block within ${FLAP_WINDOW} requests of one conversation —\n` +
            `  a pin that classifies only one of the two shapes absorbs one leg, so an oscillation busts on\n` +
            `  every second flip at best (threat matrix row 4, 2026-07-30)\n`,
        );
        // Flaps first, so the truncation below can never drop them: the whole
        // point is that they were previously findable only by reading adjacent
        // lines and noticing the direction column alternate.
        for (const b of flaps.slice(0, 10)) {
          process.stdout.write(`    n=${b.prevN}->${b.n} ${migrationLine(b)}${flapTag(b)} ${b.ts}\n`);
        }
      }
      for (const b of blockMigrations.filter((r) => !r.flap).slice(0, 10)) {
        process.stdout.write(`    n=${b.prevN}->${b.n} ${migrationLine(b)}${flapTag(b)} ${b.ts}\n`);
      }
    }
    if (mitigation) {
      // The question the four gates cannot ask: of the events this proxy
      // exists to absorb, how many did it actually absorb?
      const total = mitigation.length;
      const hit = mitigation.filter((m) => m.mitigated).length;
      const pct = total ? ((100 * hit) / total).toFixed(0) : "--";
      process.stdout.write(`\nmitigation: ${hit}/${total} mitigable events absorbed (${pct}%)\n`);
      // `mitigated` is input-side only (see the definitional comment on
      // findMitigationGaps) — a pair can pass it and still splice on the
      // OUTPUT, moving the cache's prefix boundary earlier than the input
      // check ever sees. Flagged separately from the "missed" list below
      // because these pairs are NOT misses by the input-side count.
      const inputMitigatedOutputSpliced = mitigation.filter(
        (m) => m.mitigated && !m.outputPreserved,
      );
      if (inputMitigatedOutputSpliced.length) {
        process.stdout.write(
          `  ${inputMitigatedOutputSpliced.length} pair(s) input-mitigated but NOT output-preserved:\n`,
        );
        for (const m of inputMitigatedOutputSpliced) {
          process.stdout.write(
            `    n=${m.prevN}->${m.n} ${m.kind} ${m.outputForm} [INPUT-MITIGATED, OUTPUT-SPLICED] ~${(m.rebilledOutBytes / 1e3).toFixed(0)} kB ${m.ts}\n`,
          );
        }
      }
      if (total > hit) {
        const missedBytes = mitigation.reduce((a, m) => a + m.rebilledBytes, 0);
        process.stdout.write(`  passed through: ~${(missedBytes / 1e6).toFixed(1)} MB re-billed\n`);
        const byReason = new Map();
        for (const m of mitigation) {
          if (m.mitigated) continue;
          const k = m.resetReason ? `reset(${m.resetReason})` : m.action;
          const cur = byReason.get(k) ?? { n: 0, bytes: 0 };
          cur.n++;
          cur.bytes += m.rebilledBytes;
          byReason.set(k, cur);
        }
        for (const [k, v] of [...byReason.entries()].sort((a, b) => b[1].bytes - a[1].bytes)) {
          process.stdout.write(`  ${String(v.n).padStart(5)}  ${k} — ~${(v.bytes / 1e6).toFixed(1)} MB\n`);
        }
        for (const m of mitigation.filter((x) => !x.mitigated).slice(0, 5)) {
          // blockMigration beside the mitigation row for the same reason it
          // rides beside anchorDelta on edit rows: splice/insert-mid is where
          // the reminder-swap shape actually lands (n=26->28 is a splice, not
          // a replace/edit, so it never reaches the edits-array printout).
          const bm = (blockMigrations ?? []).filter((b) => b.n === m.n && b.prevN === m.prevN);
          const bmTag = bm.length
            ? " " + bm.map((b) => `[blockMigration ${migrationLine(b)}]`).join(" ")
            : "";
          process.stdout.write(
            `    n=${m.prevN}->${m.n} ${m.kind} ${m.resetReason ? `reset(${m.resetReason})` : m.action}${bmTag} ~${(m.rebilledBytes / 1e3).toFixed(0)} kB ${m.ts}\n`,
          );
        }
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
      const heldUnstable = toolsDeltas.filter((d) => !d.heldStable);
      process.stdout.write(
        `  forwarded tools[] held stable across: ${toolsDeltas.length - leaked.length}/${toolsDeltas.length} (whole array)\n`,
      );
      process.stdout.write(
        `  shared-name subset held stable across: ${toolsDeltas.length - heldUnstable.length}/${toolsDeltas.length} (the guarantee actually made)\n`,
      );
      for (const d of only.slice(0, 8)) {
        process.stdout.write(
          `    n=${d.prevN}->${d.n} ${d.kind} in=${d.count} out=${d.outCount} msgs=${d.msgKind} forwardedStable=${d.forwardedStable} heldStable=${d.heldStable}\n`,
        );
      }
    }
    if (duplicateRequests) {
      // BACKLOG "Duplicate-request probe -> census check (Q1)" — the
      // CC#78420 falsifier (adjacent byte-identical bodies), re-answered
      // per sweep instead of a throwaway scan.
      process.stdout.write(`\nduplicate-request pairs (adjacent, byte-identical): ${duplicateRequests.length}\n`);
      for (const d of duplicateRequests.slice(0, 8)) {
        process.stdout.write(`    n=${d.prevN}->${d.n} msgs=${d.msgs} ${d.ts}\n`);
      }
    }
    if (pinSummary) {
      // Every number stated, including the ones that are not "written": a pin
      // pass that asked for 12 and built 12 of which 3 could be compared
      // against nothing has proved 9 things, not 12.
      process.stdout.write(
        `\nrow evidence pins: asked ${pinSummary.asked}, built ${pinSummary.built}, ` +
          `rejected (bytes do not match the row) ${pinSummary.rejected}, ` +
          `unverifiable (nothing to compare) ${pinSummary.unverifiable}\n`,
      );
      if (pinSummary.blocked) process.stdout.write(`  NOT RUN — ${pinSummary.blocked}\n`);
      for (const [fam, total] of Object.entries(pinSummary.truncated)) {
        process.stdout.write(`  ${fam}: capped at ${PIN_CAP} of ${total} row(s)\n`);
      }
      for (const s of pinSummary.skipped.slice(0, 8)) {
        process.stdout.write(`  skipped ${s.family} n=${s.n}: ${s.reason}\n`);
      }
    }
  }

  // Flush and close before exit — process.exitCode (not process.exit) is used
  // below, but closing explicitly rather than relying on process teardown
  // keeps the file's completeness independent of that choice.
  if (dumpStream) {
    await new Promise((resolve, reject) => dumpStream.end((err) => (err ? reject(err) : resolve())));
  }
  await rm(scratch, { recursive: true, force: true });
  // Exit non-zero on any violation so this is a gate, not just a report.
  // Safety first in the message ordering because a corrupted conversation is
  // a worse outcome than an expensive one: cache costs money, a mangled
  // history costs correctness.
  if (safety.length) {
    process.stderr.write(`\nFAIL: ${safety.length} safety violation(s) — the pipeline altered the conversation\n`);
  }
  // Same rank as safety, and for the same reason: losing content CC sent is a
  // corrupted conversation, not an expensive one.
  if (conservation.length) {
    process.stderr.write(
      `\nFAIL: ${conservation.length} content-conservation violation(s) — bytes CC sent are neither on the wire nor accounted for\n`,
    );
  }
  // A replay-fidelity mismatch is not a further invariant — it is a statement
  // that the five above were measured on a system that never ran. It fails the
  // gate for that reason. "Nothing comparable" does NOT fail: it is an honest
  // absence of evidence, reported as such rather than dressed up as a pass.
  if (
    violations.length ||
    safety.length ||
    conservation.length ||
    sequence.length ||
    orderViolations.length ||
    fidelity.mismatches.length
  ) {
    process.exitCode = 1;
  }
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
