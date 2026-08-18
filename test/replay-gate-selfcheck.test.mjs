// replay gate self-check — mutation tests for the CHECKER, not the proxy.
//
// Why this file exists. During the 2026-07-28 session the cross-request
// stability gate shipped with TWO defects, both producing FALSE GREEN:
//
//   1. it compared only ADJACENT capture lines, so under interleaved
//      multi-tenant traffic (main thread + subagents + sidecars sharing one
//      session-id) most same-conversation pairs were never compared at all.
//      A full 602-request capture reported 0 violations while a 40-request
//      single-conversation slice of the SAME session reported 2.
//   2. attribution re-ran only the offending pair, which puts stateful
//      extensions in a different state than the run that produced the
//      violation — so it returned UNATTRIBUTED on precisely the extensions
//      most worth attributing.
//
// Both were found by accident. A gate that is confidently wrong is worse
// than no gate: it converts "unverified" into "verified" without anyone
// noticing. The repo already had an instance of the same rot — output-guard's
// `gate 1` asserts a hardcoded corpus count and has therefore been failing,
// and validating nothing, since a 9th corpus was added.
//
// So: feed each checker a deliberately broken pipeline output and assert it
// goes RED. These tests fail if a checker stops catching what it exists to
// catch — the bite-test discipline, made permanent.

import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";

import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

import {
  findStabilityViolations,
  findStabilityExemptions,
  findSafetyViolations,
  findSequenceViolations,
  firstDivergence,
  censusPair,
  semanticCore,
  readCapture,
  findMitigationGaps,
  findEditPositions,
  lastBreakpointAtOrBefore,
} from "../tools/replay.mjs";
// Namespace import for findBornLargeStarts: at the moment these bites were
// written the export did not exist, and a static named import of a missing
// export fails the WHOLE module at ESM link time — every other bite in this
// 100+-test file would go red too, proving only that the export was new
// (dev-loop.md, "Adding a check"). A namespace import always links.
import * as replayMod from "../tools/replay.mjs";
import { buildDescriptionChangeMessage } from "../proxy/extensions/deferred-tool-rewrite.mjs";

const user = (t) => ({ role: "user", content: [{ type: "text", text: t }] });
const asst = (t) => ({ role: "assistant", content: [{ type: "text", text: t }] });
// A user message carrying a written cache_control breakpoint — the shape
// lastBreakpointAtOrBefore/rebilledBreakpointBytes detect via inHash vs
// inHashNoCC (compactEntry).
const bpUser = (t) => ({
  role: "user",
  content: [{ type: "text", text: t, cache_control: { type: "ephemeral" } }],
});

// One capture entry as the replay loop builds it.
const entry = (n, inMsgs, outMsgs, extra = {}) => ({
  n,
  ts: `2026-07-28T00:00:${String(n).padStart(2, "0")}Z`,
  key: "k",
  inMsgs,
  outMsgs,
  action: null,
  resetReason: null,
  ...extra,
});

// --- Stability gate ---

test("stability: clean append-only traffic is GREEN", () => {
  const a = [user("u0"), asst("a1")];
  const b = [user("u0"), asst("a1"), user("u2")];
  const v = findStabilityViolations([entry(0, a, a), entry(1, b, b)]);
  assert.equal(v.length, 0);
});

test("stability: BITE — output diverging earlier than input is caught", () => {
  const a = [user("u0"), asst("a1"), user("u2")];
  const b = [user("u0"), asst("a1"), user("u2"), asst("a3")];
  // We mangle a message the input left untouched: output diverges at 1,
  // input only at 3.
  const bOut = [user("u0"), asst("MANGLED"), user("u2"), asst("a3")];
  const v = findStabilityViolations([entry(0, a, a), entry(1, b, bOut)]);
  assert.equal(v.length, 1);
  assert.equal(v[0].outDiv, 1);
});

test("stability: BITE — interleaved co-tenant traffic must not hide a violation", () => {
  // The exact defect that shipped: conversation A's two requests are
  // separated by an unrelated conversation B. An adjacent-only scan compares
  // A->B and B->A (both skipped as different conversations) and never
  // compares A->A, reporting a clean run.
  const a1 = [user("convA"), asst("a1")];
  const a2 = [user("convA"), asst("a1"), user("more")];
  const a2Out = [user("convA"), asst("CORRUPTED"), user("more")];
  const b1 = [user("convB-different-first-message"), asst("b1")];

  const v = findStabilityViolations([
    entry(0, a1, a1),
    entry(1, b1, b1), // co-tenant request in between
    entry(2, a2, a2Out),
  ]);
  assert.equal(v.length, 1, "the violation is in a non-adjacent pair");
  assert.equal(v[0].n, 2);
  assert.equal(v[0].prevN, 0, "compared against the previous SAME-conversation request");
});

test("stability: input churn we merely pass through is NOT ours", () => {
  // CC itself rewrote history at index 1; forwarding that untouched must not
  // be reported. Only an output divergence EARLIER than the input's counts.
  const a = [user("u0"), asst("a1"), user("u2")];
  const b = [user("u0"), asst("CC-CHANGED-THIS"), user("u2")];
  const v = findStabilityViolations([entry(0, a, a), entry(1, b, b)]);
  assert.equal(v.length, 0);
});

// The attribution the violation line now carries, so nobody hand-derives it
// again. Three separate throwaway probes were written on 2026-07-28 to answer
// exactly this question — the probe is the tell that the check was missing.
test("stability: reports whether CC's own bytes at outDiv were identical", () => {
  // CC's message 1 unchanged; ours mangled -> the divergence is OURS.
  const a = [user("u0"), asst("a1"), user("u2")];
  const b = [user("u0"), asst("a1"), user("EDITED-BY-CC")];
  const bOut = [user("u0"), asst("MANGLED-BY-US"), user("EDITED-BY-CC")];
  const v = findStabilityViolations([entry(0, a, a), entry(1, b, bOut)]);
  assert.equal(v.length, 1);
  assert.equal(v[0].outDiv, 1);
  assert.equal(v[0].ccIdenticalAtOutDiv, true, "CC sent identical bytes at index 1 — ours by construction");
});

test("stability: BITE — when CC ALSO changed the diverging index, say so", () => {
  // Both sides changed index 1: ours is amplification at worst, and claiming
  // "ours by construction" there would be a false attribution.
  const a = [user("u0"), asst("a1"), user("u2")];
  const b = [user("u0"), asst("CC-CHANGED"), user("u2")];
  const bOut = [user("u0"), asst("WE-CHANGED-DIFFERENTLY"), user("u2")];
  const v = findStabilityViolations([entry(0, a, a), entry(1, b, bOut)]);
  // input diverges at 1 too, so the bar is 1 and outDiv 1 is not < 1 —
  // no violation. Construct the amplifying case instead: CC changes at 2.
  assert.equal(v.length, 0);
  const c = [user("u0"), asst("a1"), user("CC-CHANGED-HERE")];
  const cOut = [user("u0"), asst("WE-CHANGED"), user("CC-CHANGED-HERE")];
  const v2 = findStabilityViolations([entry(0, a, a), entry(1, c, cOut)]);
  assert.equal(v2.length, 1);
  assert.equal(v2[0].ccIdenticalAtOutDiv, true, "CC's bytes at index 1 were identical");
});

// --- Was the flip actually billable? (2026-08-05) ---
//
// DEFINITION, written before the assertions: the API bills on the longest
// byte-identical PREFIX, and the prefix is [tools][system][messages]. A
// stability violation says our forwarded messages diverged EARLIER than CC's
// own input did — which costs marginal tokens only when everything ABOVE
// messages was byte-identical across the pair. If our forwarded tools[] or
// system changed too, everything after them re-bills regardless and the
// message-level flip is free.
//
// Why it is a field and not a paragraph: capture s-captureAB's n=331->336 was
// carried into a handoff as the most expensive open item in the repo — an
// index-0 divergence on a ~413k-token session — and answering "what did it
// actually cost" took a hand-written probe over an 83 MB capture. CC had
// changed its tools[] from 11 entries to 9 and its first system block from 57
// to 62 chars in the same request, so the prefix was already broken two levels
// above messages. The gate had both hashes in hand and printed neither.
// The throwaway probe is the tell that a check is missing.

test("stability: BITE — a violation reports whether the forwarded prefix above messages was intact", () => {
  const a = [user("u0"), asst("a1"), user("u2")];
  const bIn = [user("u0"), asst("a1"), user("CC-EDITED-u2")];
  const bOut = [user("u0"), asst("MANGLED-BY-US"), user("CC-EDITED-u2")];
  const tools = [{ name: "Read" }, { name: "Write" }];

  // Case 1 — our forwarded tools[] changed across the pair. The prefix broke
  // above messages; the message-level divergence adds nothing to the bill.
  const churned = findStabilityViolations([
    entry(0, a, a, { inTools: tools, outTools: tools, inSystem: "S", outSystem: "S" }),
    entry(1, bIn, bOut, { inTools: [{ name: "Read" }], outTools: [{ name: "Read" }], inSystem: "S", outSystem: "S" }),
  ]);
  assert.equal(churned.length, 1);
  assert.equal(churned[0].prefixAboveMessages.intact, false,
    "forwarded tools[] differ across the pair — everything after tools re-bills anyway");
  assert.equal(churned[0].prefixAboveMessages.ourToolsIdentical, false);
  assert.equal(churned[0].prefixAboveMessages.ourSystemIdentical, true);

  // Case 2 — tools and system byte-identical: the flip IS the bill.
  const clean = findStabilityViolations([
    entry(0, a, a, { inTools: tools, outTools: tools, inSystem: "S", outSystem: "S" }),
    entry(1, bIn, bOut, { inTools: tools, outTools: tools, inSystem: "S", outSystem: "S" }),
  ]);
  assert.equal(clean.length, 1);
  assert.equal(clean[0].prefixAboveMessages.intact, true,
    "nothing above messages moved — this divergence re-bills the whole message array");
});

test("stability: BITE — a forwarded SYSTEM change breaks the prefix too, and is reported separately", () => {
  // system renders after tools and before messages: a change there re-bills
  // the messages array on its own, whatever tools did.
  const a = [user("u0"), asst("a1"), user("u2")];
  const bIn = [user("u0"), asst("a1"), user("CC-EDITED-u2")];
  const bOut = [user("u0"), asst("MANGLED-BY-US"), user("CC-EDITED-u2")];
  const tools = [{ name: "Read" }];
  const v = findStabilityViolations([
    entry(0, a, a, { inTools: tools, outTools: tools, inSystem: "S", outSystem: "S" }),
    entry(1, bIn, bOut, { inTools: tools, outTools: tools, inSystem: "S", outSystem: "S-CHANGED" }),
  ]);
  assert.equal(v.length, 1);
  assert.equal(v[0].prefixAboveMessages.ourToolsIdentical, true);
  assert.equal(v[0].prefixAboveMessages.ourSystemIdentical, false);
  assert.equal(v[0].prefixAboveMessages.intact, false);
});

test("stability: the CC-side prefix is reported too — attribution, not cost", () => {
  // OURS is what bills; CC's is what says whose change it was. The pair that
  // motivated the field had both broken, and conflating the two questions is
  // how a free row gets ranked as the most expensive item open.
  const a = [user("u0"), asst("a1"), user("u2")];
  const bIn = [user("u0"), asst("a1"), user("CC-EDITED-u2")];
  const bOut = [user("u0"), asst("MANGLED-BY-US"), user("CC-EDITED-u2")];
  const v = findStabilityViolations([
    entry(0, a, a, { inTools: [{ name: "Read" }, { name: "Write" }], outTools: [{ name: "Read" }], inSystem: "S", outSystem: "F" }),
    entry(1, bIn, bOut, { inTools: [{ name: "Read" }], outTools: [{ name: "Read" }], inSystem: "S", outSystem: "F" }),
  ]);
  assert.equal(v.length, 1);
  assert.equal(v[0].prefixAboveMessages.ccToolsIdentical, false, "CC dropped a tool across the pair");
  assert.equal(v[0].prefixAboveMessages.ccSystemIdentical, true);
  assert.equal(v[0].prefixAboveMessages.intact, true,
    "OUR forwarded prefix held — the deferred-tool mitigation absorbing CC's churn is exactly the case where the flip still costs");
});

// --- fresh-session-sort's telemetry-keyed exemption (2026-07-30) ---
//
// The real case (s-captureD n=2024->2025): CC's own array first diverges at
// index 1 (a new scattered block appears), our output diverges EARLIER, at
// index 0 (the relocate branch prepends it to messages[0]) — exactly the
// stability check's violation shape, but a DELIBERATE one-time relocation
// bust, not a self-inflicted regression. The exemption must come from the
// extension's own report (ctx.meta.freshSessionSortStats), never a
// re-derived guess from the divergence shape alone — mirroring
// suppressedIndices' discipline.

test("stability: a first-appearance relocation WITH telemetry is exempt, not a violation", () => {
  const a = [user("u0"), asst("a1")];
  const bIn = [user("u0"), asst("CC-ADDED-SCATTERED-SKILLS-BLOCK")];
  const bOut = [user("RELOCATED-SKILLS-PREPENDED-u0"), asst("CC-ADDED-SCATTERED-SKILLS-BLOCK")];
  const v = findStabilityViolations([
    entry(0, a, a),
    entry(1, bIn, bOut, {
      freshSessionSortStats: { relocated: [{ type: "skills", firstAppearance: true }], targetIndex: 0 },
    }),
  ]);
  assert.equal(v.length, 0, "a telemetry-backed first-appearance relocation must not count as a violation");

  const x = findStabilityExemptions([
    entry(0, a, a),
    entry(1, bIn, bOut, {
      freshSessionSortStats: { relocated: [{ type: "skills", firstAppearance: true }], targetIndex: 0 },
    }),
  ]);
  assert.equal(x.length, 1, "the exemption must be annotated in the output, not silently dropped");
  assert.equal(x[0].outDiv, 0);
  assert.equal(x[0].exemptBasis.type, "skills");
});

// The guard against shape-keyed drift: the SAME byte pattern (output
// diverges earlier than input, at the exact index fresh-session-sort would
// target) must stay a violation when the extension does not report it —
// simulating a pre-telemetry build, or any other extension producing the
// identical shape by coincidence. No telemetry, no exemption.
test("stability: BITE — the identical divergence WITHOUT telemetry stays a violation", () => {
  const a = [user("u0"), asst("a1")];
  const bIn = [user("u0"), asst("CC-ADDED-SCATTERED-SKILLS-BLOCK")];
  const bOut = [user("RELOCATED-SKILLS-PREPENDED-u0"), asst("CC-ADDED-SCATTERED-SKILLS-BLOCK")];
  const v = findStabilityViolations([entry(0, a, a), entry(1, bIn, bOut)]);
  assert.equal(v.length, 1, "the exemption must not fire on shape alone");
  assert.equal(v[0].outDiv, 0);

  const x = findStabilityExemptions([entry(0, a, a), entry(1, bIn, bOut)]);
  assert.equal(x.length, 0);
});

// A third shape guard, BACKLOG "the stability exemption for a
// first-appearance relocation must assert what it does NOT currently
// cover": the SAME telemetry-backed first-appearance relocation, but the
// forwarded tools[] also changed across the pair — the 216,060-token real
// event this condition exists for, where the relocation itself was free
// twelve times and cost everything the thirteenth, because that one also
// flipped tools[]. Condition 3 (firstAppearance) is satisfied; the added
// condition 4 (prefixAboveMessages.ourToolsIdentical) is not, so this must
// stay a violation and the violation record must carry the tools flip.
test("stability: BITE — a first-appearance relocation whose tools[] ALSO flipped stays a violation", () => {
  const a = [user("u0"), asst("a1")];
  const bIn = [user("u0"), asst("CC-ADDED-SCATTERED-SKILLS-BLOCK")];
  const bOut = [user("RELOCATED-SKILLS-PREPENDED-u0"), asst("CC-ADDED-SCATTERED-SKILLS-BLOCK")];
  const pair = [
    entry(0, a, a, { outTools: [{ name: "x" }] }),
    entry(1, bIn, bOut, {
      freshSessionSortStats: { relocated: [{ type: "skills", firstAppearance: true }], targetIndex: 0 },
      outTools: [{ name: "y" }],
    }),
  ];
  const v = findStabilityViolations(pair);
  assert.equal(v.length, 1, "a first-appearance relocation must not be exempted when tools[] also flipped");
  assert.equal(v[0].prefixAboveMessages.ourToolsIdentical, false,
    "the violation record names the tools flip, per prefixAboveMessages");
  assert.equal(findStabilityExemptions(pair).length, 0);
});

// The control for the bite above: the identical telemetry with tools[]
// held identical across the pair must still exempt — condition 4 denies
// only the tools-flip case, never a genuinely free relocation.
test("stability: control — the same relocation with tools[] IDENTICAL still exempts", () => {
  const a = [user("u0"), asst("a1")];
  const bIn = [user("u0"), asst("CC-ADDED-SCATTERED-SKILLS-BLOCK")];
  const bOut = [user("RELOCATED-SKILLS-PREPENDED-u0"), asst("CC-ADDED-SCATTERED-SKILLS-BLOCK")];
  const pair = [
    entry(0, a, a, { outTools: [{ name: "x" }] }),
    entry(1, bIn, bOut, {
      freshSessionSortStats: { relocated: [{ type: "skills", firstAppearance: true }], targetIndex: 0 },
      outTools: [{ name: "x" }],
    }),
  ];
  assert.equal(findStabilityViolations(pair).length, 0);
  assert.equal(findStabilityExemptions(pair).length, 1);
});

// A second shape guard: telemetry present but reporting a RECURRING type
// (firstAppearance: false) — the extension itself distinguishes this from
// the deliberate one-time bust, and the checker must respect that.
test("stability: BITE — telemetry reporting a recurring (non-first-appearance) relocation stays a violation", () => {
  const a = [user("u0"), asst("a1")];
  const bIn = [user("u0"), asst("CC-ADDED-SCATTERED-SKILLS-BLOCK")];
  const bOut = [user("RELOCATED-SKILLS-PREPENDED-u0"), asst("CC-ADDED-SCATTERED-SKILLS-BLOCK")];
  const v = findStabilityViolations([
    entry(0, a, a),
    entry(1, bIn, bOut, {
      freshSessionSortStats: { relocated: [{ type: "skills", firstAppearance: false }], targetIndex: 0 },
    }),
  ]);
  assert.equal(v.length, 1, "a recurring relocation is not the deliberate one-time bust and must not be exempted");
});

// --- fresh-session-sort's memory-stranded-by-key-rotation exemption (2026-08-05) ---
//
// DEFINITION, written before the assertions: the relocation memory is keyed
// by resolveInsertionSessionKey, whose system-prompt sub-key rotates when CC
// changes its FIRST system block mid-conversation. The memory cannot follow
// (the sub-key exists to keep sidecars apart), so the first request under
// the rotated key loses the remembered block at the relocation target — a
// real, ours-by-construction flip that costs nothing marginal, because the
// system change that caused the rotation already re-bills everything after
// system. Exempt exactly that shape; every neighbouring shape stays red.
//
// The real case (s-captureAB n=331->336, 2026-08-05): system[0] 57 -> 62
// chars, sub-key rotated, forwarded messages[0] four blocks -> three,
// outDiv 0 / inDiv 3 / ccIdenticalAtOutDiv true.

// The full stranding shape, one knob per mutation below. prev relocated mcp
// to messages[0]; cur arrives under a rotated first system block, the
// extension declares nothing, and the forwarded messages[0] lost the block.
function strandedPair(mutate = {}) {
  const mcp = { type: "text", text: "<system-reminder>\n# MCP Server Instructions\n\nstuff\n</system-reminder>" };
  const m0 = { role: "user", content: [{ type: "text", text: "hello" }] };
  const m0WithMcp = { role: "user", content: [mcp, { type: "text", text: "hello" }] };
  const scattered = { role: "user", content: [mcp, { type: "text", text: "turn text" }] };
  const plainTurn = { role: "user", content: [{ type: "text", text: "turn text" }] };

  const prevIn = [m0, asst("a1"), user("u2"), scattered];
  const prevOut = [m0WithMcp, asst("a1"), user("u2"), plainTurn];
  // CC's msgs[0..2] identical; its own edit is at index 3 (mcp gone there).
  const curIn = [m0, asst("a1"), user("u2"), plainTurn, asst("a4"), user("u5")];
  const curOut = [m0, asst("a1"), user("u2"), plainTurn, asst("a4"), user("u5")];

  const prevExtra = {
    freshSessionSortStats: { relocated: [{ type: "mcp", firstAppearance: false }], reserved: [], targetIndex: 0 },
    inSystem: [{ text: "You are Claude Code." }],
    outSystem: [{ text: "You are Claude Code." }],
    ...(mutate.prevExtra ?? {}),
  };
  const curExtra = {
    freshSessionSortStats: null,
    inSystem: [{ text: "You are a Claude agent." }],
    outSystem: [{ text: "You are a Claude agent." }],
    ...(mutate.curExtra ?? {}),
  };
  return [entry(0, prevIn, prevOut, prevExtra), entry(1, curIn, curOut, curExtra)];
}

test("stability: a memory stranding under a rotated key is exempt, with its rotation as basis", () => {
  const pair = strandedPair();
  assert.equal(findStabilityViolations(pair).length, 0,
    "the stranding flip is free by construction and must not count as a violation");
  const x = findStabilityExemptions(pair);
  assert.equal(x.length, 1, "the exemption must be annotated, not silently dropped");
  assert.equal(x[0].exemptReason, "fresh-session-sort:memory-stranded-by-key-rotation");
  assert.equal(x[0].exemptBasis.type, "mcp");
  assert.notEqual(x[0].exemptBasis.rotatedFrom, x[0].exemptBasis.rotatedTo);
});

test("stability: BITE — the same flip WITHOUT a key rotation stays a violation", () => {
  // Remove exactly condition 4: CC's first system block held, so the memory
  // was reachable and losing the block is a real defect (the pre-fix bug).
  const pair = strandedPair({
    curExtra: { inSystem: [{ text: "You are Claude Code." }], outSystem: [{ text: "You are Claude Code." }] },
  });
  assert.equal(findStabilityViolations(pair).length, 1);
  assert.equal(findStabilityExemptions(pair).length, 0);
});

test("stability: BITE — a rotation our forwarded system absorbed stays a violation (the retirement trigger)", () => {
  // Remove exactly condition 5: CC rotated its first system block but OUR
  // forwarded system is byte-identical across the pair — some upstream
  // stabilization absorbed it, the prefix above messages is intact, and the
  // stranding flip re-bills the whole message array. The freeness coupling
  // is broken and the gate must re-arm.
  const pair = strandedPair({
    curExtra: { outSystem: [{ text: "You are Claude Code." }] },
  });
  assert.equal(findStabilityViolations(pair).length, 1,
    "ourSystemIdentical=true means the flip is billable — no exemption");
  assert.equal(findStabilityExemptions(pair).length, 0);
});

test("stability: BITE — a stranding claim with no prior relocation telemetry stays a violation", () => {
  // Remove exactly condition 1: prev never declared holding a relocated
  // prefix at the flipped slot, so there was no memory to strand.
  const pair = strandedPair({ prevExtra: { freshSessionSortStats: null } });
  assert.equal(findStabilityViolations(pair).length, 1);
  assert.equal(findStabilityExemptions(pair).length, 0);
});

test("stability: BITE — a rotation where the extension still relocated stays a violation", () => {
  // Remove exactly condition 2: cur DOES declare a relocation — the memory
  // was not stranded, so whatever diverged at the target is unexplained.
  const pair = strandedPair({
    curExtra: {
      freshSessionSortStats: { relocated: [{ type: "mcp", firstAppearance: false }], reserved: [], targetIndex: 0 },
    },
  });
  assert.equal(findStabilityViolations(pair).length, 1);
  assert.equal(findStabilityExemptions(pair).length, 0);
});

// --- deferred-tool-rewrite's reset-wipes-additions exemption (2026-08-01) ---
//
// The real case (s-captureB, pairs n=709->710 outDiv=236 and n=701->718
// outDiv=82, both attributed to deferred-tool-rewrite by replay's own
// bisection): a known tool's schema changed, so the extension takes its one
// designed "honest reset" branch — CC's tools[] pass through untouched and
// `additions` is emptied. Emptying it drops the previously-injected
// tool_addition announcement message from OUR forwarded array while CC's
// own history is untouched (CC never echoes the injection back), so the
// output diverges one index EARLIER than the input: the stability check's
// violation shape, produced by a declared branch rather than a regression.
//
// The exemption is keyed on the extension's own report
// (ctx.meta.deferredToolRewriteStats) AND on the divergence being fully
// accounted for by the removed injection(s) — never on the shape alone,
// mirroring fresh-session-sort's discipline above.

// A declared tool_addition announcement, in the form the extension injects.
const inj = (name) => ({ role: "system", content: [{ type: "tool_addition", name }] });

test("stability: a reset that wipes its own injected additions is exempt, not a violation", () => {
  // prev forwarded the announcement at index 2; cur (the reset) does not,
  // and CC edited a LATER message on its own, so inDiv=3 / outDiv=2.
  const aIn = [user("u0"), asst("a1"), user("u2"), asst("a3")];
  const aOut = [user("u0"), asst("a1"), inj("SendMessage"), user("u2"), asst("a3")];
  const bIn = [user("u0"), asst("a1"), user("u2"), asst("CC-EDITED-a3")];
  const bOut = [user("u0"), asst("a1"), user("u2"), asst("CC-EDITED-a3")];
  const reset = {
    deferredToolRewriteStats: { action: "reset", reason: "tool-schema-changed", injected: 0, reanchored: 0 },
  };

  const v = findStabilityViolations([entry(0, aIn, aOut), entry(1, bIn, bOut, reset)]);
  assert.equal(v.length, 0, "the reset branch removing its own injection is declared, not self-inflicted");

  const x = findStabilityExemptions([entry(0, aIn, aOut), entry(1, bIn, bOut, reset)]);
  assert.equal(x.length, 1, "the exemption must be annotated in the output, not silently dropped");
  assert.equal(x[0].outDiv, 2);
  assert.equal(x[0].inDiv, 3);
  assert.equal(x[0].ccIdenticalAtOutDiv, true);
  assert.equal(x[0].exemptReason, "deferred-tool-rewrite:reset-wipes-additions");
  assert.equal(x[0].exemptBasis.type, "tool-schema-changed");
  assert.equal(x[0].exemptBasis.removedInjections, 1);
});

test("stability: BITE — the identical divergence WITHOUT deferred-tool-rewrite telemetry stays a violation", () => {
  // Same bytes, no report from the extension: a pre-telemetry build, or any
  // other cause producing the same shape. No telemetry, no exemption.
  const aIn = [user("u0"), asst("a1"), user("u2"), asst("a3")];
  const aOut = [user("u0"), asst("a1"), inj("SendMessage"), user("u2"), asst("a3")];
  const bIn = [user("u0"), asst("a1"), user("u2"), asst("CC-EDITED-a3")];
  const bOut = [user("u0"), asst("a1"), user("u2"), asst("CC-EDITED-a3")];
  const v = findStabilityViolations([entry(0, aIn, aOut), entry(1, bIn, bOut)]);
  assert.equal(v.length, 1, "the exemption must not fire on shape alone");
  assert.equal(v[0].outDiv, 2);
  assert.equal(findStabilityExemptions([entry(0, aIn, aOut), entry(1, bIn, bOut)]).length, 0);
});

// The SECOND declared reset reason (2026-08-18, row 6 step (b)). A conversation
// seeded with a preloaded tool whose model has since left the tool_addition
// allowlist can never announce it, so the extension abandons the seed, forwards
// CC's raw array and empties `additions` — the same declared branch and the
// same zero-marginal-cost argument (dropping the seeded entry moves tools[],
// which renders before messages, so the reset invalidates the prefix by itself).
// Unexempted, every abandon would fire a red the gate cannot explain: the
// standing-FAIL-on-a-non-defect shape this file's own comment warns about.
test("stability: a preload-unannounceable reset that wipes its own injections is exempt too", () => {
  const aIn = [user("u0"), asst("a1"), user("u2"), asst("a3")];
  const aOut = [user("u0"), asst("a1"), inj("SendMessage"), user("u2"), asst("a3")];
  const bIn = [user("u0"), asst("a1"), user("u2"), asst("CC-EDITED-a3")];
  const bOut = [user("u0"), asst("a1"), user("u2"), asst("CC-EDITED-a3")];
  const reset = {
    deferredToolRewriteStats: {
      action: "reset",
      reason: "preload-unannounceable",
      injected: 0,
      reanchored: 0,
    },
  };

  const v = findStabilityViolations([entry(0, aIn, aOut), entry(1, bIn, bOut, reset)]);
  assert.equal(v.length, 0, "the preload abandon is a declared branch, not a self-inflicted divergence");

  const x = findStabilityExemptions([entry(0, aIn, aOut), entry(1, bIn, bOut, reset)]);
  assert.equal(x.length, 1, "and it is annotated rather than silently dropped");
  assert.equal(x[0].exemptReason, "deferred-tool-rewrite:reset-wipes-additions");
  assert.equal(x[0].exemptBasis.type, "preload-unannounceable", "the basis names WHICH declared branch fired");
});

test("stability: BITE — a reset for any OTHER reason stays a violation", () => {
  // Only a reason on the DECLARED list is an exempt wipe. A different
  // reset reason dropping an injection is a cause nobody has classified.
  const aIn = [user("u0"), asst("a1"), user("u2"), asst("a3")];
  const aOut = [user("u0"), asst("a1"), inj("SendMessage"), user("u2"), asst("a3")];
  const bIn = [user("u0"), asst("a1"), user("u2"), asst("CC-EDITED-a3")];
  const bOut = [user("u0"), asst("a1"), user("u2"), asst("CC-EDITED-a3")];
  const v = findStabilityViolations([
    entry(0, aIn, aOut),
    entry(1, bIn, bOut, {
      deferredToolRewriteStats: { action: "reset", reason: "some-other-reason", injected: 0, reanchored: 0 },
    }),
  ]);
  assert.equal(v.length, 1);

  // ... and so does a non-reset action reporting the same reason field.
  const v2 = findStabilityViolations([
    entry(0, aIn, aOut),
    entry(1, bIn, bOut, {
      deferredToolRewriteStats: { action: "rewrite", reason: "tool-schema-changed", injected: 0, reanchored: 0 },
    }),
  ]);
  assert.equal(v2.length, 1);
});

test("stability: BITE — a reset that ALSO mangles a message is not fully explained, and stays a violation", () => {
  // The guard that keeps this exemption from becoming a blanket amnesty for
  // every reset: remove the injection from the comparison and the output
  // STILL diverges below the bar, so something else moved too.
  const aIn = [user("u0"), asst("a1"), user("u2"), asst("a3")];
  const aOut = [user("u0"), asst("a1"), inj("SendMessage"), user("u2"), asst("a3")];
  const bIn = [user("u0"), asst("a1"), user("u2"), asst("CC-EDITED-a3")];
  const bOut = [user("u0"), asst("MANGLED-BY-US"), user("u2"), asst("CC-EDITED-a3")];
  const v = findStabilityViolations([
    entry(0, aIn, aOut),
    entry(1, bIn, bOut, {
      deferredToolRewriteStats: { action: "reset", reason: "tool-schema-changed", injected: 0, reanchored: 0 },
    }),
  ]);
  assert.equal(v.length, 1, "a divergence the removal does not account for is still ours");
  assert.equal(v[0].outDiv, 1);
});

test("stability: BITE — a reset with no injection to remove is not exempt", () => {
  // Telemetry says reset, but the pair carries no removed announcement —
  // whatever moved the output earlier than the input, this exemption does
  // not describe it.
  const aIn = [user("u0"), asst("a1"), user("u2"), asst("a3")];
  const aOut = [user("u0"), asst("a1"), user("u2"), asst("a3")];
  const bIn = [user("u0"), asst("a1"), user("u2"), asst("CC-EDITED-a3")];
  const bOut = [user("u0"), asst("MANGLED-BY-US"), user("u2"), asst("CC-EDITED-a3")];
  const v = findStabilityViolations([
    entry(0, aIn, aOut),
    entry(1, bIn, bOut, {
      deferredToolRewriteStats: { action: "reset", reason: "tool-schema-changed", injected: 0, reanchored: 0 },
    }),
  ]);
  assert.equal(v.length, 1);
});

// --- modelChangedAcrossPair exemption (2026-08-11) ---
//
// A model switch re-bills the whole cache prefix by the API's OWN billing —
// the request pays for a cold rewrite regardless of anything we do — so a
// divergence WE introduce on that same request costs nothing marginal.
//
// The real case (BACKLOG "stability check lacks the modelChangedAcrossPair
// exemption", threat-matrix row 6's 2026-08-10 instance, s-captureBC
// n=461->462): outDiv=36, CC byte-identical there, model claude-fable-5 ->
// claude-opus-4-8, `supportsToolAddition` true -> false so
// deferred-tool-rewrite's model gate (`if (!announceOk) additions = []`)
// empties established additions; cacheRead 0 / cacheCreation 633,639 on that
// request. The committed pin for this pair (pinned-s-d8f209e4b75e-461-462
// .json) freezes the capture through request 462 itself and therefore
// cannot carry ITS OWN outcome record — an outcome record trails its request
// in the file, and the pin's range ends exactly at the request that needs
// it — so the shape below is CONSTRUCTED from the documented real numbers,
// the same convention every other exemption's "real case" test in this file
// already follows (compare strandedPair() and the reset-wipe pairs above,
// neither of which replays a committed fixture either).
//
// Deliberately carries NO deferredToolRewriteStats: the model gate that
// produces this shape (deferred-tool-rewrite.mjs's `if (!announceOk)
// additions = []`) runs on every action, not only `reset`, and reports no
// reason string at all — this exemption is not keyed to that extension's
// telemetry, unlike resetWipesAdditionsExemption above.
function modelSwitchPair(mutate = {}) {
  const aIn = [user("u0"), asst("a1"), user("u2"), asst("a3")];
  const aOut = [user("u0"), asst("a1"), inj("SendMessage"), user("u2"), asst("a3")];
  const bIn = [user("u0"), asst("a1"), user("u2"), asst("CC-EDITED-a3")];
  const bOut = [user("u0"), asst("a1"), user("u2"), asst("CC-EDITED-a3")];
  const prevExtra = { model: "claude-fable-5", ...(mutate.prevExtra ?? {}) };
  const curExtra = { model: "claude-opus-4-8", cacheRead: 0, ...(mutate.curExtra ?? {}) };
  return [entry(0, aIn, aOut, prevExtra), entry(1, bIn, bOut, curExtra)];
}

test("stability: a model switch across the pair is exempt when the request read cold (cacheRead === 0)", () => {
  const pair = modelSwitchPair();
  assert.equal(findStabilityViolations(pair).length, 0,
    "a model switch re-bills the whole prefix by itself — the flip is free");
  const x = findStabilityExemptions(pair);
  assert.equal(x.length, 1, "the exemption must be annotated in the output, not silently dropped");
  assert.equal(x[0].outDiv, 2);
  assert.equal(x[0].ccIdenticalAtOutDiv, true);
  assert.equal(x[0].exemptReason, "model-changed-across-pair");
  assert.equal(x[0].exemptBasis.prevModel, "claude-fable-5");
  assert.equal(x[0].exemptBasis.curModel, "claude-opus-4-8");
});

// The done-criterion's required PAIR, other half: the identical shape with
// cacheRead > 0 (the request read WARM) must still fire — the two must
// DIFFER, or the exemption is not discriminating (BACKLOG's own words).
test("stability: BITE — the same model switch with cacheRead > 0 stays a violation", () => {
  const pair = modelSwitchPair({ curExtra: { cacheRead: 100 } });
  assert.equal(findStabilityViolations(pair).length, 1,
    "a warm read means the switch did not re-bill the prefix — no marginal-cost argument survives");
  assert.equal(findStabilityExemptions(pair).length, 0);
});

// The entry's own named guard: a null cacheRead (no outcome record at all —
// predates the feature, or the outcome never arrived) must not read as the
// MEASURED zero condition 3 requires.
test("stability: BITE — a null cacheRead (no outcome measured) must not read as zero", () => {
  const pair = modelSwitchPair({ curExtra: { cacheRead: null } });
  assert.equal(findStabilityViolations(pair).length, 1,
    "an unmeasured request must not be treated as a measured cold one");
  assert.equal(findStabilityExemptions(pair).length, 0);
});

test("stability: BITE — the same divergence WITHOUT a model change stays a violation", () => {
  const pair = modelSwitchPair({ curExtra: { model: "claude-fable-5", cacheRead: 0 } });
  assert.equal(findStabilityViolations(pair).length, 1);
  assert.equal(findStabilityExemptions(pair).length, 0);
});

test("stability: BITE — a model change with either side's model absent stays a violation", () => {
  const missingPrev = modelSwitchPair({ prevExtra: { model: null } });
  assert.equal(findStabilityViolations(missingPrev).length, 1);
  assert.equal(findStabilityExemptions(missingPrev).length, 0);

  const missingCur = modelSwitchPair({ curExtra: { model: null, cacheRead: 0 } });
  assert.equal(findStabilityViolations(missingCur).length, 1);
  assert.equal(findStabilityExemptions(missingCur).length, 0);
});

// --- Safety gate ---

test("safety: faithful passthrough is GREEN", () => {
  const m = [user("u0"), asst("a1")];
  assert.equal(findSafetyViolations([entry(0, m, m)]).length, 0);
});

// deferred-tool-rewrite announces a newly-loaded tool with a system message
// carrying a tool_addition block — the documented contract, and the reason
// tools[] can stay byte-stable. The gate flagged 243 "corruptions" on a corpus
// where nothing was corrupted until this exemption existed. A check that
// forbids a designed behaviour trains its reader to ignore it.
test("safety: a declared tool_addition injection is NOT a violation", () => {
  const inM = [user("u0"), asst("a1")];
  const outM = [
    user("u0"),
    asst("a1"),
    { role: "system", content: [{ type: "tool_addition", tool: { type: "tool_reference", name: "SendMessage" } }] },
  ];
  assert.equal(findSafetyViolations([entry(0, inM, outM)]).length, 0);
});

// The exemption must stay narrow: only a system message that is ENTIRELY
// tool_addition blocks. Anything else appearing in messages[] is still a
// violation, or the exemption becomes a hole.
test("safety: BITE — an undeclared injected message is still caught", () => {
  const inM = [user("u0"), asst("a1")];
  const smuggled = [
    user("u0"),
    asst("a1"),
    { role: "system", content: [{ type: "text", text: "not a declared injection" }] },
  ];
  assert.equal(findSafetyViolations([entry(0, inM, smuggled)]).length, 1);
  // ...and a system message mixing tool_addition with anything else.
  const mixed = [
    user("u0"),
    asst("a1"),
    {
      role: "system",
      content: [
        { type: "tool_addition", tool: { type: "tool_reference", name: "X" } },
        { type: "text", text: "smuggled" },
      ],
    },
  ];
  assert.equal(findSafetyViolations([entry(0, inM, mixed)]).length, 1);
});

// The SECOND declared-injection kind (2026-08-05): a description absorb
// announces the new prose with a system message of TEXT blocks — the same
// carrier, recognized by isDescriptionNotice, which shares the builder's own
// template constants. Built here with the REAL builder, not a hand-copied
// message: if the template ever drifts from the recognizer, this test is
// where the drift goes red.
test("safety: a declared description-change notice is NOT a violation", () => {
  const inM = [user("u0"), asst("a1")];
  const outM = [
    user("u0"),
    asst("a1"),
    buildDescriptionChangeMessage([{ name: "Bash", description: "new prose for Bash" }]),
  ];
  assert.equal(findSafetyViolations([entry(0, inM, outM)]).length, 0);
});

test("safety: BITE — a system text message mixing the notice with free text is still caught", () => {
  const inM = [user("u0"), asst("a1")];
  const notice = buildDescriptionChangeMessage([{ name: "Bash", description: "new prose" }]);
  const mixed = [
    user("u0"),
    asst("a1"),
    { role: "system", content: [...notice.content, { type: "text", text: "smuggled free text" }] },
  ];
  assert.equal(findSafetyViolations([entry(0, inM, mixed)]).length, 1);
});

test("safety: BITE — a dropped message is caught", () => {
  const inM = [user("u0"), asst("a1"), user("u2")];
  const outM = [user("u0"), asst("a1")];
  const v = findSafetyViolations([entry(0, inM, outM)]);
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, "length");
});

test("safety: BITE — a reordered message is caught by role drift", () => {
  // The live defect this check found: phase-2 insertion-normalization moved a
  // system message to the tail, shifting three real turns. Length is
  // preserved, so only a positional role comparison catches it.
  const inM = [user("u0"), { role: "system", content: "note" }, asst("a1"), user("u2")];
  const outM = [user("u0"), asst("a1"), user("u2"), { role: "system", content: "note" }];
  const v = findSafetyViolations([entry(0, inM, outM)]);
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, "role");
});

test("safety: BITE — a broken tool_result/tool_use pairing is caught", () => {
  const inM = [
    { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "X", input: {} }] },
    { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "ok" }] },
  ];
  // Same length, same roles, but the tool_result no longer answers the
  // preceding assistant turn — an API-shape break, not just a cache concern.
  const outM = [
    { role: "assistant", content: [{ type: "tool_use", id: "DIFFERENT", name: "X", input: {} }] },
    { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "ok" }] },
  ];
  const v = findSafetyViolations([entry(0, inM, outM)]);
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, "tool-adjacency");
});

// --- Sequence gate ---

test("sequence: normalize followed by settled append-only is GREEN", () => {
  const m = [user("u0")];
  const v = findSequenceViolations([
    entry(0, m, m, { action: "normalized" }),
    entry(1, m, m, { action: "append-only" }),
  ]);
  assert.equal(v.length, 0);
});

test("sequence: BITE — normalize then reset is caught", () => {
  // The phase-2 splice->append pattern: request 2 looks like a win, request 3
  // resets because canonical order and wire order now disagree. Pairwise
  // checks cannot see this; only the sequence can.
  const m = [user("u0")];
  const v = findSequenceViolations([
    entry(0, m, m, { action: "normalized" }),
    entry(1, m, m, { action: "reset", resetReason: "not-subsequence" }),
  ]);
  assert.equal(v.length, 1);
  assert.equal(v[0].normalizedAt, 0);
});

// A reset is OUR failure only when CC left the history alone. If CC rewrote
// it, resetting is correct and flagging it is a check firing on a non-defect —
// the fault that trains a reader to ignore red. Measured 2026-07-28 on capture
// s-captureL request 109: CC replaced message 196 in place, so
// reset(edit-shaped) was right; the real cost of that event was our bytes
// moving at 177, which is the STABILITY gate's job and it caught it.
test("sequence: a reset AFTER CC rewrote history is honest, not a violation", () => {
  const a = [user("u0"), asst("a1"), user("u2")];
  // CC edits message 1 in place — the history genuinely changed.
  const b = [user("u0"), asst("CC-REWROTE-THIS"), user("u2")];
  const v = findSequenceViolations([
    entry(0, a, a, { action: "normalized" }),
    entry(1, b, b, { action: "reset", resetReason: "edit-shaped" }),
  ]);
  assert.equal(v.length, 0, "resetting on a genuine history rewrite is correct behaviour");
});

test("sequence: BITE — the exemption must not swallow an append-only reset", () => {
  // Same shape, but CC only APPENDED. Nothing it sent changed, so a reset
  // means our reconstruction broke on its own — still a violation.
  const a = [user("u0"), asst("a1")];
  const b = [user("u0"), asst("a1"), user("u2")];
  const v = findSequenceViolations([
    entry(0, a, a, { action: "normalized" }),
    entry(1, b, b, { action: "reset", resetReason: "edit-shaped" }),
  ]);
  assert.equal(v.length, 1, "an append-only pair gives the reset no excuse");
  assert.equal(v[0].normalizedAt, 0);
});

test("sequence: a first-request reset is bookkeeping, not a violation", () => {
  // no-prior-canonical means "nothing cached yet" — every conversation's
  // first request does this and it costs nothing.
  const m = [user("u0")];
  const v = findSequenceViolations([
    entry(0, m, m, { action: "normalized" }),
    entry(1, m, m, { action: "reset", resetReason: "no-prior-canonical" }),
  ]);
  assert.equal(v.length, 0);
});

// --- Census ---

test("census: decoration does not register as a structural change", () => {
  // Shape flip (single text block <-> bare string) plus a system-reminder
  // block appearing: both are re-serializations, neither is a history edit.
  // Measured at ~27% of real request pairs — if the census counted these as
  // changes, its signal would be swamped by noise.
  const a = [{ role: "user", content: [{ type: "text", text: "hi" }] }];
  const b = [{ role: "user", content: "hi" }];
  assert.equal(censusPair(a, b), "identical");

  const withReminder = [
    {
      role: "user",
      content: [
        { type: "text", text: "hi" },
        { type: "text", text: "<system-reminder>\nnote\n</system-reminder>" },
      ],
    },
  ];
  assert.equal(censusPair(a, withReminder), "identical");
});

test("census: real structural changes are classified, not smoothed away", () => {
  const base = [user("u0"), asst("a1"), user("u2")];
  assert.equal(censusPair(base, [...base, asst("a3")]), "append-only");
  assert.equal(censusPair(base, [user("u0"), asst("a1"), user("SPLICED"), user("u2")]), "splice/insert-mid");
  assert.equal(censusPair(base, [user("u0"), asst("a1")]), "drop-only");
  assert.equal(censusPair(base, [user("u0"), asst("a1"), user("EDITED")]), "replace/edit");
});

test("census: semanticCore keeps genuinely different content distinct", () => {
  // The fold must be narrow. A multi-block message is not the same as its
  // first block, and different text is never the same message.
  assert.notDeepEqual(semanticCore(user("a")), semanticCore(user("b")));
  const multi = {
    role: "user",
    content: [
      { type: "text", text: "one" },
      { type: "text", text: "two" },
    ],
  };
  assert.equal(semanticCore(multi).length, 2);
});

// --- Corpus reader ---
//
// The gate slurped its capture with readFile(..., "utf-8") until 2026-07-28,
// when pointing it at a live 955 MB session capture threw
// `RangeError: Invalid string length` — V8's max string size. So the gate
// could not run at all on the largest, most interesting corpus, while every
// small corpus stayed green. It is now a line-by-line stream.
//
// The crash was loud and self-announcing. What is NOT loud is the INDEXING:
// the old form filtered blank lines away before indexing, so `n` counted
// only non-blank lines. `--restart-at N` / `--wipe-state-at N` and every
// violation report are stated in that same `n`. If a future rewrite counts
// blank lines, those indices all shift by a silent off-by-k and point at the
// wrong request — a wrong answer rather than a crash. Pin the semantics.

test("readCapture: blank lines are skipped WITHOUT consuming an index", async () => {
  const dir = await tmpDir("cache-fix-readcapture-");
  try {
    const file = join(dir, "c.jsonl");
    // Blank and whitespace-only lines interleaved, plus a trailing newline.
    await writeFile(file, ['{"i":0}', "", '{"i":1}', "   ", '{"i":2}', ""].join("\n") + "\n");

    const seen = [];
    for await (const [n, line] of readCapture(file)) seen.push([n, JSON.parse(line).i]);

    assert.deepEqual(
      seen,
      [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      "index n must equal the position among NON-BLANK lines",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("readCapture: an empty corpus yields nothing rather than one blank entry", async () => {
  const dir = await tmpDir("cache-fix-readcapture-");
  try {
    const file = join(dir, "empty.jsonl");
    await writeFile(file, "\n\n");
    const seen = [];
    for await (const e of readCapture(file)) seen.push(e);
    assert.equal(seen.length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// --- Primitive ---

test("firstDivergence: prefix growth reports null, in-place change reports the index", () => {
  assert.equal(firstDivergence([1, 2], [1, 2, 3]), null);
  assert.equal(firstDivergence([1, 2, 3], [1, 9, 3]), 1);
  assert.equal(firstDivergence([], []), null);
});

// --- Mitigation gaps ---
//
// The four gates ask "did we make it worse". None asks "did we fail to help",
// and a reset forwards CC's bytes faithfully — invisible to all of them while
// costing the whole rewrite. On 2026-07-28 a 484k bust had every gate green
// and it took hand-reading extension telemetry to establish we had not
// mitigated it.

test("mitigation: a normalized splice counts as absorbed and costs nothing", () => {
  const a = [user("u0"), asst("a1"), user("u2")];
  const b = [user("u0"), asst("a1"), user("SPLICED"), user("u2")];
  const rows = findMitigationGaps([
    entry(0, a, a, { action: "append-only" }),
    entry(1, b, b, { action: "normalized" }),
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, "splice/insert-mid");
  assert.equal(rows[0].mitigated, true);
  assert.equal(rows[0].rebilledBytes, 0);
});

test("mitigation: BITE — a RESET on a mitigable event is a miss, and is priced", () => {
  const a = [user("u0"), asst("a1"), user("u2")];
  const b = [user("u0"), asst("a1"), user("SPLICED"), user("u2")];
  const rows = findMitigationGaps([
    entry(0, a, a, { action: "append-only" }),
    entry(1, b, b, { action: "reset", resetReason: "not-subsequence" }),
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].mitigated, false, "a reset forwards CC's array — it absorbs nothing");
  assert.equal(rows[0].resetReason, "not-subsequence");
  assert.ok(rows[0].rebilledBytes > 0, "everything from the divergence index on is re-billed");
});

test("mitigation: BITE — append-only on a mitigable event is ALSO a miss", () => {
  // The subtle one. The extension reporting "append-only" while the census
  // sees a mid-history splice means it did not DETECT the splice — the bytes
  // go out unchanged either way. Measured twice in one session.
  const a = [user("u0"), asst("a1"), user("u2")];
  const b = [user("u0"), asst("a1"), user("SPLICED"), user("u2")];
  const rows = findMitigationGaps([
    entry(0, a, a, { action: "append-only" }),
    entry(1, b, b, { action: "append-only" }),
  ]);
  assert.equal(rows[0].mitigated, false);
  assert.ok(rows[0].rebilledBytes > 0);
});

test("mitigation: honest history rewrites are NOT counted as missed mitigations", () => {
  // replace/edit is CC rewriting its own history (rows 4/22) and drop-only is
  // a prune. Neither is something this proxy claims to absorb, and counting
  // them would inflate the miss rate with events no mitigation should touch.
  const a = [user("u0"), asst("a1"), user("u2")];
  const edited = [user("u0"), asst("a1"), user("EDITED")];
  const dropped = [user("u0"), asst("a1")];
  assert.equal(
    findMitigationGaps([entry(0, a, a, { action: "append-only" }), entry(1, edited, edited, { action: "reset" })]).length,
    0,
  );
  assert.equal(
    findMitigationGaps([entry(0, a, a, { action: "append-only" }), entry(1, dropped, dropped, { action: "reset" })]).length,
    0,
  );
});

// --- Breakpoint-aware pricing (BACKLOG, "the model is breakpoint-blind") ---
//
// rebilledBytes/savedBytes price from the divergence index alone, which
// understates a mid-history miss whenever the one written breakpoint sits
// AFTER the divergence (near the array's own tail, per the corpus finding
// that every request carries exactly one, normally on the last message) —
// that breakpoint cannot survive a divergence that happens before it, and
// nothing earlier exists to fall back to. rebilledBreakpointBytes is the
// corrected number, under its own name.

test("lastBreakpointAtOrBefore: BITE — a breakpoint AFTER the limit does not count", () => {
  // Bare hash/noCC arrays: only index 2 differs (the breakpoint), and the
  // search is capped at limit=1 — the breakpoint at 2 must not be found.
  assert.equal(lastBreakpointAtOrBefore(["h0", "h1", "hBP"], ["h0", "h1", "hPlain"], 1), null);
  assert.equal(lastBreakpointAtOrBefore(["h0", "h1", "hBP"], ["h0", "h1", "hPlain"], 2), 2);
});

test("lastBreakpointAtOrBefore: the HIGHEST in-range breakpoint wins, not the first", () => {
  assert.equal(
    lastBreakpointAtOrBefore(["hBP0", "h1", "hBP2", "h3"], ["hPlain0", "h1", "hPlain2", "h3"], 3),
    2,
  );
});

test("lastBreakpointAtOrBefore: no breakpoint anywhere returns null", () => {
  assert.equal(lastBreakpointAtOrBefore(["h0", "h1", "h2"], ["h0", "h1", "h2"], 2), null);
});

test("mitigation/edits: BITE — a mid-history edit BEFORE the tail breakpoint prices the WHOLE array, not the suffix", () => {
  // Mirrors the real reproduction (capture s-captureAM, pair n=265->266): the
  // one written breakpoint sits on the tail message, the edit lands well
  // before it, so
  // nothing in messages[] survives — rebilledBreakpointBytes must equal the
  // FULL cur array, strictly more than rebilledBytes (which only counts
  // from the edit onward).
  const prev = [user("u0"), asst("a1"), user("u2"), user("u3"), bpUser("u4")];
  const cur = [user("u0"), asst("a1"), user("EDITED"), user("u3"), bpUser("u4")];
  const rows = findEditPositions([entry(0, prev, prev), entry(1, cur, cur)]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].at, 2, "divergence at the edited message");
  assert.equal(rows[0].tail, false, "the edit is not the last message");
  const wholeArray = cur.reduce((a, m) => a + JSON.stringify(m).length, 0);
  assert.equal(rows[0].rebilledBreakpointBytes, wholeArray);
  assert.ok(
    rows[0].rebilledBreakpointBytes > rows[0].rebilledBytes,
    "the breakpoint-aware price must exceed the divergence-only price — old code priced only the suffix",
  );
});

test("mitigation/edits: a TAIL edit AT the breakpoint's own index leaves both numbers equal", () => {
  // The case the OLD model already gets right: the breakpoint sits exactly
  // at the divergence (the tail message itself was edited), so
  // lastBreakpointAtOrBefore returns the same index firstDivergence/at
  // already used — the fix must not move this number.
  const prev = [user("u0"), asst("a1"), bpUser("u2")];
  const cur = [user("u0"), asst("a1"), bpUser("EDITED")];
  const rows = findEditPositions([entry(0, prev, prev), entry(1, cur, cur)]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].tail, true);
  assert.equal(
    rows[0].rebilledBreakpointBytes,
    rows[0].rebilledBytes,
    "a breakpoint at the divergence itself must price identically to the old (correct) suffix number",
  );
});

test("mitigation: findMitigationGaps' rebilledBreakpointBytes/savedBreakpointBytes follow the same mitigated split", () => {
  const a = [user("u0"), asst("a1"), user("u2"), user("u3"), bpUser("u4")];
  // A genuine INSERT (prev stays a subsequence of cur), same shape as the
  // existing "a normalized splice counts as absorbed" test above — a
  // REPLACE at index 2 would census as replace/edit and MITIGABLE excludes
  // that kind, which is exactly the mistake the first draft of this test
  // made (0 rows, silently proving nothing).
  const b = [user("u0"), asst("a1"), user("SPLICED"), user("u2"), user("u3"), bpUser("u4")];
  // Miss (reset): the whole array should now price, same reasoning as the
  // findEditPositions BITE test above (mid-history, breakpoint at the tail).
  const missRows = findMitigationGaps([
    entry(0, a, a, { action: "append-only" }),
    entry(1, b, b, { action: "reset", resetReason: "not-subsequence" }),
  ]);
  assert.equal(missRows.length, 1);
  assert.equal(missRows[0].mitigated, false);
  const wholeArray = b.reduce((acc, m) => acc + JSON.stringify(m).length, 0);
  assert.equal(missRows[0].rebilledBreakpointBytes, wholeArray);
  assert.equal(missRows[0].savedBreakpointBytes, 0);
  assert.ok(missRows[0].rebilledBreakpointBytes > missRows[0].rebilledBytes);

  // Mitigated (normalized): both breakpoint-aware fields stay 0/full-saved,
  // same as the existing rebilledBytes/savedBytes pair — a successful
  // re-serialization needs no breakpoint reasoning.
  const hitRows = findMitigationGaps([
    entry(0, a, a, { action: "append-only" }),
    entry(1, b, b, { action: "normalized" }),
  ]);
  assert.equal(hitRows.length, 1);
  assert.equal(hitRows[0].mitigated, true);
  assert.equal(hitRows[0].rebilledBreakpointBytes, 0);
  assert.equal(hitRows[0].savedBreakpointBytes > 0, true);
});

// Occurrence ordinals in the census identity. Repeats are common — one
// measured history carried the same hook reminder 44 times, byte-identical —
// and without an ordinal a Set treats all 44 as one entry, so a plain tail
// append can read as a mid-history splice. insertion-normalization's own
// identityKey has been `hash|role|occurrence` all along; this is the census
// catching up to it.
test("census: repeated identical messages do not collapse into one identity", () => {
  const dup = { role: "system", content: [{ type: "text", text: "recurring reminder" }] };
  const base = [user("u0"), dup, asst("a1"), dup, user("u2")];
  // A pure tail append over a history containing duplicates.
  const grown = [...base, asst("a3")];
  assert.equal(
    censusPair(base, grown),
    "append-only",
    "duplicates must not make a tail append look like a splice",
  );
});

test("census: BITE — a genuine splice is still caught when duplicates are present", () => {
  const dup = { role: "system", content: [{ type: "text", text: "recurring reminder" }] };
  const base = [user("u0"), dup, asst("a1"), dup, user("u2")];
  const spliced = [user("u0"), dup, asst("a1"), dup, user("INSERTED"), user("u2")];
  assert.equal(censusPair(base, spliced), "splice/insert-mid");
});

// --- Safety exemption symmetry (2026-07-29) ---
import { safetyViolation } from "../tools/replay.mjs";

test("BITE — an injection-shaped message in the INPUT must not read as a drop", () => {
  // The live case: a chained proxy fed this pipeline its own output (the
  // fable acceptance probe), so the INPUT carried a tool_addition system
  // message. The output kept it and added the pipeline's own — nothing was
  // dropped. The one-sided filter stripped both from out, none from in, and
  // the first census-enabled sweep failed the capture over it (5 -> 4).
  const injection = (name) => ({
    role: "system",
    content: [{ type: "tool_addition", tool: { type: "tool_reference", name } }],
  });
  const user = { role: "user", content: [{ type: "text", text: "q" }] };
  const asst = { role: "assistant", content: [{ type: "text", text: "a" }] };
  const e = {
    n: 1, ts: "t",
    inMsgs: [user, asst, user, injection("Monitor"), user],
    outMsgs: [user, asst, user, injection("Monitor"), user, injection("Monitor")],
  };
  assert.equal(safetyViolation(e), null, "echoed + re-injected announcements are exempt on both sides");
  // A GENUINE drop must still fire: remove a real user message from out.
  const dropped = { ...e, outMsgs: [user, asst, injection("Monitor"), user] };
  const v = safetyViolation(dropped);
  assert.ok(v && v.kind === "length", "a real message drop must still be caught");
});

// --- Row 6: heldStable (shared-name subset) vs forwardedStable (whole array) ---
//
// forwardedStable compares the WHOLE forwarded tools[] signature across a
// pair, so a genuine new-tool announcement always reads as "unstable" even
// when every tool CC already knew about round-tripped byte-identical
// (BACKLOG "forwardedStable was a census framing gap" — bytes probe
// 2026-07-30: 100% of "unstable" pairs carried a genuine new-tool
// announcement, held/shared tools byte-identical on every checked repeat
// pair). heldStable narrows the claim to what deferred-tool-rewrite actually
// guarantees: the SHARED-name subset (tools present on BOTH sides of the
// pair) stays byte-stable. A tool that is new on one side is excluded from
// the comparison, not counted against it.
import { findToolsDeltas } from "../tools/replay.mjs";

const conv = [user("shared-first-message")];
const tool = (name, extra = {}) => ({ name, description: `${name} tool`, input_schema: { type: "object" }, ...extra });

test("toolsDeltas: heldStable true / forwardedStable false when a tool is ADDED and the shared subset is untouched", () => {
  const toolA = tool("A");
  const toolB = tool("B");
  const toolC = tool("C");
  const prevTools = [toolA, toolB];
  const curTools = [toolA, toolB, toolC];
  const p = entry(1, conv, conv, { inTools: prevTools, outTools: prevTools });
  const c = entry(2, conv, conv, { inTools: curTools, outTools: curTools });
  const [d] = findToolsDeltas([p, c]);
  assert.ok(d, "an added tool must register as a tools[] delta");
  assert.equal(d.forwardedStable, false, "the whole-array signature moved when C was added");
  assert.equal(d.heldStable, true, "A and B — the shared-name subset — round-tripped byte-identical");
});

test("toolsDeltas: BITE — a mutated SHARED tool sinks both forwardedStable and heldStable", () => {
  const toolA = tool("A");
  const toolB = tool("B");
  const toolBMutated = tool("B", { description: "changed" });
  const prevTools = [toolA, toolB];
  const curTools = [toolA, toolBMutated];
  const p = entry(1, conv, conv, { inTools: prevTools, outTools: prevTools });
  const c = entry(2, conv, conv, { inTools: curTools, outTools: curTools });
  const [d] = findToolsDeltas([p, c]);
  assert.ok(d, "a schema edit to a held tool must still register as a delta");
  assert.equal(d.forwardedStable, false);
  assert.equal(
    d.heldStable,
    false,
    "B changed inside the shared-name subset — heldStable must catch it, not just the whole array",
  );
});

test("toolsDeltas: forwarded tools[] fully steady across an incoming reorder reads true on both", () => {
  const toolA = tool("A");
  const toolB = tool("B");
  const p = entry(1, conv, conv, { inTools: [toolA, toolB], outTools: [toolA, toolB] });
  const c = entry(2, conv, conv, { inTools: [toolB, toolA], outTools: [toolA, toolB] });
  const [d] = findToolsDeltas([p, c]);
  assert.ok(d, "CC reordering its incoming tools[] must still register as a delta");
  assert.equal(d.kind, "reorder");
  assert.equal(d.forwardedStable, true, "what we forwarded never moved");
  assert.equal(d.heldStable, true, "the shared-name subset IS the whole forwarded array here, and it is untouched");
});

// --- deferred-tool-rewrite's own decision, surfaced beside heldStable/outCount ---
//
// Threat-matrix row 6's NAMED MISSING EVIDENCE: `mutatedBy` proves the
// extension ran, never what it decided. These pin the row's
// `deferredToolRewriteStats` field to the NEWER request (`c`) of the pair —
// where an incoming delta actually gets classified — and to the
// empty-vs-absent distinction the extension's own stats object now
// guarantees (proxy/extensions/deferred-tool-rewrite.mjs).

test("toolsDeltas: the row carries deferred-tool-rewrite's own decision, keyed off the NEWER request", () => {
  const toolA = tool("A");
  const toolB = tool("B");
  const decision = {
    action: "rewrite",
    newNames: ["B"],
    heldNames: [],
    reason: null,
    injected: 1,
    reanchored: 0,
    announcedNames: ["B"],
    passthrough: [],
  };
  const p = entry(1, conv, conv, { inTools: [toolA], outTools: [toolA], deferredToolRewriteStats: null });
  const c = entry(2, conv, conv, { inTools: [toolA, toolB], outTools: [toolA, toolB], deferredToolRewriteStats: decision });
  const [d] = findToolsDeltas([p, c]);
  assert.ok(d, "an added tool must register as a tools[] delta");
  assert.deepEqual(d.deferredToolRewriteStats, decision, "the row reads the NEWER (c) entry's decision, not the older one");
});

test("toolsDeltas: BITE — a PASSTHROUGH (new name, no announcement) is visible on the row, not silently absorbed into a green heldStable", () => {
  const toolA = tool("A");
  const toolB = tool("B");
  const decision = {
    action: "rewrite",
    newNames: ["B"],
    heldNames: [],
    reason: null,
    injected: 0,
    reanchored: 0,
    announcedNames: [],
    passthrough: [{ name: "B", reason: "model-not-allowlisted" }],
  };
  const p = entry(1, conv, conv, { inTools: [toolA], outTools: [toolA] });
  const c = entry(2, conv, conv, { inTools: [toolA, toolB], outTools: [toolA, toolB], deferredToolRewriteStats: decision });
  const [d] = findToolsDeltas([p, c]);
  assert.ok(d);
  // heldStable is TRUE here (A, the shared name, round-tripped untouched) —
  // exactly the shape that made the n=372->373 residue easy to misread as
  // "the mitigation worked". The decision field is what tells the two apart.
  assert.equal(d.heldStable, true);
  assert.deepEqual(d.deferredToolRewriteStats.passthrough, [{ name: "B", reason: "model-not-allowlisted" }]);
  assert.deepEqual(d.deferredToolRewriteStats.announcedNames, []);
});

// --- Row 6: was the added tool's NAMESPACE already in tools[]? ---
//
// Row 6's trigger names three limbs and treats them as one class: "ToolSearch
// loading deferred tools, MCP reconnect, schema bump". They need DIFFERENT
// mitigations, so the census owes an instance its limb — and the row's
// 2026-08-10 instance was assigned to "MCP reconnect" by reading seven added
// names by hand.
//
// `shape` is NOT that limb answer and is deliberately named for the narrower
// thing it measures: whether the added tool's namespace (`mcp__<server>`, or
// `builtin`) was already represented on the previous side. Deferred MCP
// tools sit outside tools[] until something loads them, so a first-time
// ToolSearch load and a server connecting both read `new-namespace`. What
// this DOES separate — and what the hand-read could not — is a selective
// load into an already-present namespace from a namespace's first
// appearance. Both occur on real traffic (2026-08-10 pin, five membership+
// deltas: four first-appearances, one selective load into
// `mcp__thunderbird-mail`).

test("toolsDeltas: an addition INSIDE a namespace already present reads within-known-namespace", () => {
  const nav = tool("mcp__chrome__navigate");
  const read = tool("mcp__chrome__read_page");
  const p = entry(1, conv, conv, { inTools: [nav], outTools: [nav] });
  const c = entry(2, conv, conv, { inTools: [nav, read], outTools: [nav, read] });
  const [d] = findToolsDeltas([p, c]);
  assert.equal(d.kind, "membership+");
  assert.equal(d.addition.shape, "within-known-namespace");
  assert.deepEqual(d.addition.names, ["mcp__chrome__read_page"]);
  assert.deepEqual(d.addition.newNamespaces, [], "chrome was already in tools[] — nothing arrived");
  assert.deepEqual(d.addition.knownNamespaces, ["mcp__chrome"]);
});

test("toolsDeltas: a namespace tools[] has never carried reads new-namespace", () => {
  const bash = tool("Bash");
  const nav = tool("mcp__chrome__navigate");
  const p = entry(1, conv, conv, { inTools: [bash], outTools: [bash] });
  const c = entry(2, conv, conv, { inTools: [bash, nav], outTools: [bash, nav] });
  const [d] = findToolsDeltas([p, c]);
  assert.equal(d.addition.shape, "new-namespace");
  assert.deepEqual(d.addition.newNamespaces, ["mcp__chrome"]);
  assert.deepEqual(d.addition.knownNamespaces, []);
});

// The pair that gives the field its discriminating power: both arms add
// exactly ONE tool to a one-tool array, so every other field on the row —
// kind, count, outCount, heldStable — is identical between them. If the two
// arms did not differ HERE, the annotation would be measuring nothing.
test("toolsDeltas: BITE — the two shapes DIFFER on pairs identical in every other field", () => {
  const nav = tool("mcp__chrome__navigate");
  const known = findToolsDeltas([
    entry(1, conv, conv, { inTools: [nav], outTools: [nav] }),
    entry(2, conv, conv, { inTools: [nav, tool("mcp__chrome__read_page")], outTools: [nav, tool("mcp__chrome__read_page")] }),
  ])[0];
  const fresh = findToolsDeltas([
    entry(1, conv, conv, { inTools: [nav], outTools: [nav] }),
    entry(2, conv, conv, { inTools: [nav, tool("mcp__other__thing")], outTools: [nav, tool("mcp__other__thing")] }),
  ])[0];
  assert.equal(known.kind, fresh.kind, "precondition: the two arms are the same kind of delta");
  assert.equal(known.count, fresh.count, "precondition: the two arms move the same counts");
  assert.notEqual(known.addition.shape, fresh.addition.shape, "the annotation must separate the two shapes");
});

test("toolsDeltas: builtins are their own namespace — a deferred BUILTIN load is within-known-namespace", () => {
  const bash = tool("Bash");
  const p = entry(1, conv, conv, { inTools: [bash], outTools: [bash] });
  const c = entry(2, conv, conv, { inTools: [bash, tool("WebFetch")], outTools: [bash, tool("WebFetch")] });
  const [d] = findToolsDeltas([p, c]);
  assert.equal(d.addition.shape, "within-known-namespace");
  assert.deepEqual(d.addition.knownNamespaces, ["builtin"]);
});

test("toolsDeltas: an addition touching both a known and a fresh namespace reads mixed", () => {
  const bash = tool("Bash");
  const nav = tool("mcp__chrome__navigate");
  const p = entry(1, conv, conv, { inTools: [bash, nav], outTools: [bash, nav] });
  const cur = [bash, nav, tool("mcp__chrome__read_page"), tool("mcp__other__thing")];
  const c = entry(2, conv, conv, { inTools: cur, outTools: cur });
  const [d] = findToolsDeltas([p, c]);
  assert.equal(d.addition.shape, "mixed");
  assert.deepEqual(d.addition.knownNamespaces, ["mcp__chrome"]);
  assert.deepEqual(d.addition.newNamespaces, ["mcp__other"]);
});

// The server segment is everything between the first and second `__`, so a
// server whose own name carries hyphens and underscores — and a tool name
// carrying a further `__` — must still resolve to one namespace.
test("toolsDeltas: the namespace is the SERVER segment, not a fixed-width prefix", () => {
  const a = tool("mcp__plugin_pbs-gis_pbs-gis__catalog");
  const b = tool("mcp__plugin_pbs-gis_pbs-gis__list_recipes");
  const p = entry(1, conv, conv, { inTools: [a], outTools: [a] });
  const c = entry(2, conv, conv, { inTools: [a, b], outTools: [a, b] });
  const [d] = findToolsDeltas([p, c]);
  assert.equal(d.addition.shape, "within-known-namespace");
  assert.deepEqual(d.addition.knownNamespaces, ["mcp__plugin_pbs-gis_pbs-gis"]);
});

test("toolsDeltas: BITE — a delta that adds NOTHING carries no addition annotation", () => {
  const toolA = tool("A");
  const toolB = tool("B");
  const p = entry(1, conv, conv, { inTools: [toolA, toolB], outTools: [toolA, toolB] });
  const c = entry(2, conv, conv, { inTools: [toolB, toolA], outTools: [toolB, toolA] });
  const [d] = findToolsDeltas([p, c]);
  assert.equal(d.kind, "reorder");
  assert.equal(d.addition, null, "a reorder must not be labelled with an addition shape");
});

test("toolsDeltas: the extension never running this request reads as null, distinct from an empty decision", () => {
  const toolA = tool("A");
  const toolB = tool("B");
  const p = entry(1, conv, conv, { inTools: [toolA], outTools: [toolA] });
  // No deferredToolRewriteStats key at all on `c` — the gate-off /
  // extension-absent case (compactEntry defaults it to null).
  const c = entry(2, conv, conv, { inTools: [toolA, toolB], outTools: [toolA, toolB] });
  const [d] = findToolsDeltas([p, c]);
  assert.ok(d);
  assert.equal(d.deferredToolRewriteStats, null, "absent stats must read as null, never as an empty-but-present object");
});

// --- Row 6's actual limb discriminator: addition.trigger ---
// (BACKLOG "row 6's limb is read by hand; namespace shape cannot separate
// ToolSearch load from server arrival", 2026-08-17)
//
// `addition.shape` above cannot separate a first-time ToolSearch load from an
// MCP server connecting mid-session — both read `new-namespace`. `trigger`
// reads the pair's own APPENDED messages instead: the busting pairs are
// `msgKind:append-only`, so a ToolSearch `tool_use` would already be present
// in the pair if CC issued one just before the tools[] delta.

const toolUseMsg = (name) => ({
  role: "assistant",
  content: [{ type: "tool_use", id: `tu_${name}`, name, input: {} }],
});

test("toolsDeltas: addition.trigger reads toolsearch-adjacent when an appended message carries a ToolSearch tool_use", () => {
  const nav = tool("mcp__chrome__navigate");
  const read = tool("mcp__chrome__read_page");
  const prevMsgs = [user("u0"), asst("a1")];
  const curMsgs = [...prevMsgs, toolUseMsg("ToolSearch"), user("result")];
  const p = entry(1, prevMsgs, prevMsgs, { inTools: [nav], outTools: [nav] });
  const c = entry(2, curMsgs, curMsgs, { inTools: [nav, read], outTools: [nav, read] });
  const [d] = findToolsDeltas([p, c]);
  assert.equal(d.kind, "membership+");
  assert.equal(d.msgKind, "append-only", "precondition: the appended tail is well-defined");
  assert.equal(d.addition.trigger, "toolsearch-adjacent");
});

test("toolsDeltas: BITE — addition.trigger reads no-toolsearch when the appended messages carry no ToolSearch call", () => {
  const nav = tool("mcp__chrome__navigate");
  const read = tool("mcp__chrome__read_page");
  const prevMsgs = [user("u0"), asst("a1")];
  const curMsgs = [...prevMsgs, user("u2"), asst("a3")];
  const p = entry(1, prevMsgs, prevMsgs, { inTools: [nav], outTools: [nav] });
  const c = entry(2, curMsgs, curMsgs, { inTools: [nav, read], outTools: [nav, read] });
  const [d] = findToolsDeltas([p, c]);
  assert.equal(d.msgKind, "append-only");
  assert.equal(d.addition.trigger, "no-toolsearch");
});

test("toolsDeltas: BITE — addition.trigger reads unknown, never no-toolsearch, on an identical-history delta", () => {
  // The three-value split is the point: a two-value predicate would report
  // this could-not-read case as a server arrival, the exact direction the
  // row's own 2026-08-10 prose already erred in.
  const nav = tool("mcp__chrome__navigate");
  const read = tool("mcp__chrome__read_page");
  const p = entry(1, conv, conv, { inTools: [nav], outTools: [nav] });
  const c = entry(2, conv, conv, { inTools: [nav, read], outTools: [nav, read] });
  const [d] = findToolsDeltas([p, c]);
  assert.equal(d.msgKind, "identical");
  assert.equal(d.addition.trigger, "unknown",
    "an identical-history delta has no appended messages to read");
});

test("toolsDeltas: BITE — addition.trigger reads unknown for a non-append-only message delta", () => {
  const nav = tool("mcp__chrome__navigate");
  const read = tool("mcp__chrome__read_page");
  const prevMsgs = [user("u0"), asst("a1"), user("u2")];
  const curMsgs = [user("u0"), asst("CC-EDITED-a1"), user("u2"), asst("a3")];
  const p = entry(1, prevMsgs, prevMsgs, { inTools: [nav], outTools: [nav] });
  const c = entry(2, curMsgs, curMsgs, { inTools: [nav, read], outTools: [nav, read] });
  const [d] = findToolsDeltas([p, c]);
  assert.notEqual(d.msgKind, "append-only", "precondition: this is not a well-defined appended tail");
  assert.equal(d.addition.trigger, "unknown", "an edited prefix is not a clean appended-messages read");
});

// --- Block-migration FLAP ---
//
// A one-way block migration is absorbable by the volatile pin. An
// OSCILLATION is not, when the pin classifies only one of the two shapes:
// the block keeps leaving and returning, so it busts on every second flip at
// best. The 2026-07-30 221k event (threat matrix row 4, session 0d6f38ba,
// n=102->104->105->108 in 11 seconds) was exactly that, and the only way to
// see it was to read three adjacent census lines and notice the direction
// column alternate. These tests are the definition of that reading, made
// mechanical — see the DEFINITION comment above markFlaps in replay.mjs.
import { findBlockMigrations } from "../tools/replay.mjs";

const txt = (t) => ({ type: "text", text: t });
const REMINDER_WRAPPED = "<system-reminder>\nPreToolUse:Edit hook additional context: do the thing\n</system-reminder>";
const REMINDER_INNER = "PreToolUse:Edit hook additional context: do the thing";

// The two shapes the measured flap alternated between. Message COUNT is equal
// in both, which is what makes each pair a replace/edit — the kind the
// measured triple carried (edit@86 of 98).
const inlineState = (tail = []) => [
  user("q1"),
  asst("a1"),
  { role: "user", content: [txt("tool output"), txt(REMINDER_WRAPPED)] },
  { role: "system", content: "unrelated standing system note" },
  asst("a2"),
  ...tail,
];
const standaloneState = (tail = []) => [
  user("q1"),
  asst("a1"),
  { role: "user", content: [txt("tool output"), txt("sibling block that never moves")] },
  { role: "system", content: REMINDER_INNER },
  asst("a2"),
  ...tail,
];
const asEntries = (states) => states.map((msgs, i) => entry(i, msgs, msgs));

test("BITE — the same block reversing direction in the next request is annotated as a FLAP", () => {
  // The measured triple's shape: inline -> standalone -> inline -> standalone.
  const rows = findBlockMigrations(asEntries([inlineState(), standaloneState(), inlineState(), standaloneState()]));
  assert.equal(rows.length, 3, "one migration row per flip");
  assert.deepEqual(
    rows.map((r) => r.direction),
    ["inline->standalone", "standalone->inline", "inline->standalone"],
  );
  assert.equal(rows[0].flap, undefined, "the FIRST leg reverses nothing — it is a plain migration");
  assert.deepEqual(
    rows[1].flap,
    { reversesPrevN: 0, reversesN: 1, span: 1 },
    "leg 2 reverses leg 1 one request later, and names the row it reverses",
  );
  assert.deepEqual(rows[2].flap, { reversesPrevN: 1, reversesN: 2, span: 1 }, "leg 3 reverses leg 2");
});

test("flap: BITE — the window counts requests of the CONVERSATION, not of the wire", () => {
  // Cache prefixes are per-conversation, so a co-tenant's traffic between the
  // two legs is not part of this clock. Here the legs are 7 and 7 WIRE
  // requests apart and 1 conversation request apart: a detector counting wire
  // distance reports nothing on a flap that busts on every flip.
  const other = (i) => [user("a different conversation entirely"), ...Array.from({ length: i }, (_, k) => asst(`o${k}`))];
  const wire = [];
  let n = 0;
  for (const state of [inlineState(), standaloneState(), inlineState()]) {
    wire.push(entry(n++, state, state));
    for (let i = 0; i < 6; i++) wire.push(entry(n++, other(i), other(i)));
  }
  const rows = findBlockMigrations(wire);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].flap, undefined);
  assert.deepEqual(rows[1].flap, { reversesPrevN: 0, reversesN: 7, span: 1 }, "7 wire requests apart, 1 conversation request apart");
});

// gap = conversation requests between the two migration rows. The requests in
// between are plain appends, which are not a migration kind and so produce no
// rows of their own — only distance.
const flapAtGap = (gap) => {
  const filler = (k) => Array.from({ length: k }, (_, i) => asst(`filler-${i + 1}`));
  const states = [inlineState(), standaloneState()];
  for (let k = 1; k < gap; k++) states.push(standaloneState(filler(k)));
  states.push(inlineState(filler(gap - 1)));
  const rows = findBlockMigrations(asEntries(states));
  assert.equal(rows.length, 2, `gap=${gap}: exactly the two legs, appends contribute nothing`);
  return rows[1];
};

test("flap: a reversal exactly 5 conversation requests later is still a FLAP", () => {
  assert.deepEqual(flapAtGap(5).flap, { reversesPrevN: 0, reversesN: 1, span: 5 }, "5 is within 5");
});

test("flap: fires-on-non-defect guard — a reversal 6 conversation requests later is NOT a flap", () => {
  // The window is what separates an oscillation from a block that migrated
  // once and, much later, migrated back. A detector without an upper bound
  // would mark the second as the first and train its reader to ignore the tag.
  assert.equal(flapAtGap(6).flap, undefined);
});

test("flap: fires-on-non-defect guard — opposite directions by DIFFERENT blocks are not a flap", () => {
  // Two distinct hook blocks, one leaving its host message and one returning
  // to another, in consecutive requests. Every condition of the definition
  // holds except identity of the block — which is the whole claim.
  const X_WRAPPED = "<system-reminder>\nhook X context\n</system-reminder>";
  const X_INNER = "hook X context";
  const Y_WRAPPED = "<system-reminder>\nhook Y context\n</system-reminder>";
  const Y_INNER = "hook Y context";
  const s0 = [
    user("q1"),
    asst("a1"),
    { role: "user", content: [txt("tool output"), txt(X_WRAPPED)] },
    { role: "system", content: "unrelated standing system note" },
    { role: "system", content: Y_INNER },
    asst("a2"),
  ];
  const s1 = [
    user("q1"),
    asst("a1"),
    { role: "user", content: [txt("tool output"), txt("sibling block")] },
    { role: "system", content: X_INNER },
    { role: "system", content: Y_INNER },
    asst("a2"),
  ];
  const s2 = [
    user("q1"),
    asst("a1"),
    { role: "user", content: [txt("tool output"), txt("sibling block")] },
    // Y goes back INLINE, and a block only counts as inline when it wears the
    // reminder wrapper there — same candidacy condition as X's leg.
    { role: "user", content: [txt("other output"), txt(Y_WRAPPED)] },
    { role: "system", content: "a tail note" },
    asst("a2"),
  ];
  const rows = findBlockMigrations(asEntries([s0, s1, s2]));
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => r.direction),
    ["inline->standalone", "standalone->inline"],
    "opposite directions, one conversation request apart",
  );
  assert.notEqual(rows[0].hash, rows[1].hash, "different blocks — the premise of this guard");
  assert.equal(rows[0].flap, undefined);
  assert.equal(rows[1].flap, undefined, "a reversal is of the SAME block; two blocks passing each other is not one");
});

// --- blockMigration candidacy: a message that SHED siblings is not a
//     standalone emergence ---
//
// Measured on the real 2026-07-30 flap bytes (capture s-captureB, pair
// n=102->104; fixture flap-s-0dc8ac87c43d-86.json, harvested by the sibling
// build). The alignment there is:
//
//   PREV[92] user [tool_result, text(<system-reminder> 720 chars)]
//   CUR [92] assistant (unrelated — two messages were inserted above)
//   CUR [93] user [tool_result]          <- PREV[92] having SHED its reminder
//   CUR [94] system "…" (683 chars)      <- PREV[92]'s reminder, unwrapped
//
// The census reported TWO migrations out of PREV[92]: the reminder to 94
// (real) and the tool_result to 93 (phantom). The phantom exists because
// `standalone` is `blocks.length === 1`, which is true of any message that
// shrank to one block, and because the host's own index moved, so the
// same-position guard never sees that the tool_result never left its message.
//
// DEFINITION the fix restores: the class the census names is the
// REMINDER swap. A block is a migration candidate only where it appears
// <system-reminder>-WRAPPED on its inline side — that wrapper is what makes
// the block decoration that CC relocates. A tool_result (or any ordinary
// block) left alone because its message shed siblings has not emerged as
// anything; it is where it always was, in a message that lost a neighbour.

const toolResult = (id) => ({ type: "tool_result", tool_use_id: id, content: "out" });

test("BITE — a host that SHED a reminder does not also report its surviving block as migrated", () => {
  const prev = [
    user("q1"),
    asst("a1"),
    { role: "user", content: [toolResult("tu1"), txt(REMINDER_WRAPPED)] },
    asst("a2"),
  ];
  const cur = [
    user("q1"),
    asst("a1"),
    asst("inserted above the host — this is what shifts the host's index"),
    { role: "user", content: [toolResult("tu1")] },
    { role: "system", content: REMINDER_INNER },
    asst("a2"),
  ];
  const rows = findBlockMigrations([entry(0, prev, prev), entry(1, cur, cur)]);
  assert.equal(rows.length, 1, "exactly ONE block left that message: the reminder");
  assert.equal(rows[0].direction, "inline->standalone");
  assert.equal(rows[0].sourceIdx, 2);
  assert.equal(rows[0].targetIdx, 4, "the unwrapped reminder's new standalone message, not the shrunken host at 3");
});

test("BITE — the same phantom in reverse: a host REGAINING a reminder is not its block migrating inline", () => {
  // Mirror of the measured pair n=104->105: the shrunken host takes its
  // reminder back and the standalone system message disappears. Only the
  // reminder moved; the tool_result sat still while its message grew.
  //
  // The trailing turn on the CUR side is load-bearing, not decoration: with
  // the two messages only DISAPPEARING, censusIds classifies the pair
  // `drop-only`, which is not a migration kind, and the scan never runs at
  // all — the measured pair carried 99 messages on both sides for the same
  // reason. Without it this test passes while checking nothing.
  const prev = [
    user("q1"),
    asst("a1"),
    asst("inserted above the host — this is what shifts the host's index"),
    { role: "user", content: [toolResult("tu1")] },
    { role: "system", content: REMINDER_INNER },
    asst("a2"),
  ];
  const cur = [
    user("q1"),
    asst("a1"),
    { role: "user", content: [toolResult("tu1"), txt(REMINDER_WRAPPED)] },
    asst("a2"),
    asst("a new turn, so the pair is a replace/edit rather than a drop-only"),
  ];
  const rows = findBlockMigrations([entry(0, prev, prev), entry(1, cur, cur)]);
  assert.equal(rows.length, 1, "only the reminder changed host");
  assert.equal(rows[0].direction, "standalone->inline");
  assert.equal(rows[0].sourceIdx, 4, "the standalone system message that disappeared");
  assert.equal(rows[0].targetIdx, 2, "the message that took the reminder back inline");
});

// --- The real 2026-07-30 flap, from the harvested bytes ---
//
// The two bites above reproduce the measured SHAPE synthetically. This one
// runs the actual capture bytes, so the check is anchored to a fixed
// reference that outlives the capture (which rotates): fixture
// flap-s-0dc8ac87c43d-86.json holds the full message arrays for all four
// requests of the three flap pairs.
//
// Expected values come from the fixture's own `_legs` header — which
// describes the BYTES, was written by the harvest before either detector
// existed, and is therefore the one statement of what is in this file that
// does not share parentage with the code under test. It says the standalone
// leg carries THREE relocated hosts, not one:
//
//   msg86 = the JOIN of msg85's four unwrapped reminders
//   msg91 = a CROSS-MESSAGE join: msg89's unwrapped reminder + the whole of
//           the standalone msg90 that followed it
//   msg94 = msg92's unwrapped reminder, alone
//
// So the event is three hosts × three legs = nine rows, three distinct
// hashes, and the two later legs of each host reverse a predecessor: six
// flaps. Two thirds of that was invisible before the join scan — msg86 and
// msg91 match no single block's hash, so the census reported only the msg94
// column and a reader would have priced this event at one third its size.
// Before the 47defba candidacy fix the msg94 column alone produced six rows
// and four flaps: the tool_result of msg92 was reported as migrating to
// msg93, which is msg92 itself, having shed the reminder and shifted index.
import { readFileSync } from "node:fs";
import { dirname } from "node:path"; // `join` is already imported at the top of this file
import { fileURLToPath } from "node:url";

const fixture = (name) =>
  JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", "harvested", name), "utf-8"));

const FLAP_FIXTURE = fixture("flap-s-0dc8ac87c43d-86.json");

const rowLine = (r) => `n=${r.prevN}->${r.n} ${r.join ?? "block"} ${r.direction} ${r.sourceIdx}->${r.targetIdx}`;

test("BITE — the real 2026-07-30 flap: three relocated hosts, three legs, six flaps", () => {
  const rows = findBlockMigrations(
    FLAP_FIXTURE.requests.map((r) => ({
      n: r.n, ts: r.ts, key: "s-captureB", inMsgs: r.messages, outMsgs: r.messages, inTools: [], outTools: [],
    })),
  );

  assert.equal(rows.length, 9, "three hosts changing shape in each of the three pairs");
  assert.equal(
    new Set(rows.map((r) => r.hash)).size,
    3,
    "one hash per relocated host — each keeps its identity across the legs, which is what makes each a flap",
  );
  assert.deepEqual(
    rows.map(rowLine),
    [
      "n=102->104 block inline->standalone 92->94",
      "n=102->104 in-entry inline->standalone 85->86",
      "n=102->104 cross-message inline->standalone 89->91",
      "n=104->105 block standalone->inline 94->92",
      "n=104->105 in-entry standalone->inline 86->85",
      "n=104->105 cross-message standalone->inline 91->89",
      "n=105->108 block inline->standalone 92->94",
      "n=105->108 in-entry inline->standalone 85->86",
      "n=105->108 cross-message inline->standalone 89->91",
    ],
  );
  assert.equal(
    rows.filter((r) => r.targetIdx === 93 || r.sourceIdx === 93).length,
    0,
    "msg93 is msg92 after shedding its reminder — nothing migrated to or from it",
  );

  // Exactly one of the nine is the shape no hash set in the extension can
  // match, per leg. That count is the whole point of the tag.
  assert.equal(rows.filter((r) => r.join === "cross-message").length, 3);

  assert.deepEqual(
    rows.filter((r) => !r.flap).map(rowLine),
    [
      "n=102->104 block inline->standalone 92->94",
      "n=102->104 in-entry inline->standalone 85->86",
      "n=102->104 cross-message inline->standalone 89->91",
    ],
    "only the OPENING leg of each host reverses nothing",
  );
  assert.deepEqual(
    rows.filter((r) => r.flap).map((r) => r.flap),
    [
      { reversesPrevN: 102, reversesN: 104, span: 1 },
      { reversesPrevN: 102, reversesN: 104, span: 1 },
      { reversesPrevN: 102, reversesN: 104, span: 1 },
      { reversesPrevN: 104, reversesN: 105, span: 1 },
      { reversesPrevN: 104, reversesN: 105, span: 1 },
      { reversesPrevN: 104, reversesN: 105, span: 1 },
    ],
    "each host's second and third legs reverse its own predecessor",
  );
});

// --- addition.trigger against the real capture (row 6, BACKLOG's own named
// evidence: pinned-s-dda5c6419d49-372-373.json, the 2026-08-10 tools-only
// isolation) ---
//
// Read directly off the raw capture bytes — no pipeline replay needed, since
// `addition.trigger` reads only INPUT-side facts (compactEntry's `inSem` /
// `inToolUseNames`, both computed from `rec.body` before any extension runs):
// the same "captures are PRE-pipeline" fact dev-loop.md states for
// attribution. `inTools`/`outTools` are set identically to the raw capture's
// own `body.tools` — the extension's OUTPUT decision plays no part in this
// field, so there is nothing to reconstruct by running it.
test("toolsDeltas: real capture n=369->370 and n=372->373 (row 6, s-dda5c6419d49) report a non-unknown trigger", () => {
  const doc = fixture("pinned-s-dda5c6419d49-372-373.json");
  const replayFrom = doc.header?.replayFrom ?? 0;
  const entries = [];
  let reqN = replayFrom - 1;
  for (const rec of doc.records) {
    if (rec.type === "boot" || rec.type === "outcome") continue;
    const n = ++reqN;
    const msgs = Array.isArray(rec.body?.messages) ? rec.body.messages : [];
    entries.push(
      entry(n, msgs, msgs, { key: rec.key, ts: rec.ts, inTools: rec.body?.tools, outTools: rec.body?.tools }),
    );
  }
  const rows = findToolsDeltas(entries);
  for (const [prevN, curN] of [[369, 370], [372, 373]]) {
    const row = rows.find((r) => r.n === curN && r.prevN === prevN);
    assert.ok(row, `expected a tools-delta row for n=${prevN}->${curN}`);
    assert.equal(row.kind, "membership+");
    assert.equal(row.msgKind, "append-only", `n=${prevN}->${curN} precondition: a well-defined appended tail`);
    // Both real pairs carry a ToolSearch tool_use in their appended
    // messages — measured directly, not assumed: this CONTRADICTS the row's
    // 2026-08-10 prose ("a server connecting mid-session, NOT a ToolSearch
    // deferred load"), which the matrix itself already labels UNVERIFIED as
    // of the 2026-08-17 correction. Whichever way the pins land is an
    // equally valid measurement per the entry's own words; this asserts the
    // value actually measured here rather than the weaker `notEqual`, so a
    // future change to either the pin or the classifier is caught either way.
    assert.equal(row.addition.trigger, "toolsearch-adjacent",
      `n=${prevN}->${curN} appended messages carry a ToolSearch tool_use`);
  }
});

// --- Join migrations: the standalone side is a JOIN, not a block ---
//
// DEFINITION lives beside the implementation (tools/replay.mjs, above
// scanJoinMigrations). Restated as the assertions below need it: several
// reminders leave one host and arrive as a SINGLE "\n\n"-joined standalone
// message. No unit hash equals that message's hash, so before this scan the
// class produced no row at all — the detector reported nothing on a fixture
// harvested for oscillating.
//
// Two conditions, and the two fires-on-non-defect guards below remove exactly
// one each: (A) the joined standalone is a whole message on one side and on
// neither the other, within the same +/-3 window the block scan uses; (B) no
// constituent is still <system-reminder>-wrapped on the standalone side — a
// surviving wrapper means the bytes were COPIED, and a copy is not a move.

const OSC_FIXTURE = fixture("oscillation-s-4b6a435234bf-863.json");

// The oscillation fixture carries only the two messages the event is about
// (msg863 and, where it exists, msg864) — not the 913-message array they sat
// in. Reconstruct a minimal history around the REAL bytes: two pads before,
// one changing turn after, which is what makes each pair splice/insert-mid
// rather than a kind the scan skips. Request numbers are synthetic for the
// same reason — the fixture records timestamps, not `n`.
const oscEntries = () => {
  const msg864At = new Map(OSC_FIXTURE.requests_864.map((r) => [r.ts, r.msg864]));
  return OSC_FIXTURE.requests.map((r, i) => {
    const msgs = [asst("pad0"), asst("pad1"), r.msg863];
    const m864 = msg864At.get(r.ts);
    if (m864) msgs.push(m864);
    msgs.push(asst(`turn${i}`));
    return { n: i, ts: r.ts, key: "s-4b6a435234bf", inMsgs: msgs, outMsgs: msgs, inTools: [], outTools: [] };
  });
};

test("BITE — the real s-4b6a435234bf oscillation: a MERGED standalone is a migration, and it flaps", () => {
  // The fixture's `_merge_standalone` header states the relation these bytes
  // exist to carry: msg864 is msg863's two hook reminders, wrapper-stripped
  // and "\n\n"-joined. Three of the eight requests carry it, so msg863 sheds
  // the pair, takes it back, and sheds it again — one migration per flip,
  // the later two reversing their predecessor.
  const rows = findBlockMigrations(oscEntries());

  assert.equal(rows.length, 3, "one row per flip of the merged pair");
  assert.equal(new Set(rows.map((r) => r.hash)).size, 1, "the same joined bytes throughout");
  assert.deepEqual(
    rows.map(rowLine),
    [
      "n=3->4 in-entry inline->standalone 2->3",
      "n=4->5 in-entry standalone->inline 3->2",
      "n=5->6 in-entry inline->standalone 2->3",
    ],
    "in-entry: both constituents are blocks of the SAME host, so this is the join the extension can already match",
  );
  assert.equal(rows[0].flap, undefined, "the opening leg reverses nothing");
  assert.deepEqual(rows[1].flap, { reversesPrevN: 3, reversesN: 4, span: 1 });
  assert.deepEqual(rows[2].flap, { reversesPrevN: 4, reversesN: 5, span: 1 });
});

// Synthetic shapes for the guards. `hostOf` is the inline side (a tool result
// plus N wrapped reminders); `merged` is the standalone side.
const wrap = (t) => txt(`<system-reminder>\n${t}\n</system-reminder>`);
const R1 = "PreToolUse:Edit hook additional context: first";
const R2 = "PostToolUse:Edit hook additional context: second";
const hostOf = (...inner) => ({ role: "user", content: [toolResult("tu9"), ...inner.map(wrap)] });
const merged = (...inner) => ({ role: "system", content: inner.join("\n\n") });

test("BITE — a cross-message join carries its own kind: the extension has no hash set for it", () => {
  // The measured shape (flap fixture msg91): a host's reminder merges with
  // the WHOLE of the standalone message that follows it. in-entry joins are
  // findSuppressibleDuplicate's own rule; this one spans two messages and
  // nothing in the extension matches it, so the tag is what counts the class.
  const tail = "the standalone nudge that follows the host";
  const prev = [user("q1"), asst("a1"), hostOf(R1), { role: "system", content: tail }, asst("a2")];
  const cur = [
    user("q1"),
    asst("a1"),
    asst("inserted above, so the host's own index shifts"),
    { role: "user", content: [toolResult("tu9")] },
    merged(R1, tail),
    asst("a2"),
  ];
  const rows = findBlockMigrations([entry(0, prev, prev), entry(1, cur, cur)]);
  assert.equal(rows.length, 1, "one join moved; the tool_result never left its message");
  assert.equal(rows[0].join, "cross-message");
  assert.equal(rows[0].direction, "inline->standalone");
  assert.equal(rows[0].sourceIdx, 2, "the reminder-side host; the absorbed neighbour is its successor by definition");
  assert.equal(rows[0].targetIdx, 4);
});

test("join: fires-on-non-defect guard — a joined standalone present on BOTH sides did not ARRIVE", () => {
  // Condition (A), and it has to be isolated from (B) to be tested at all:
  // the first draft of this bite kept the reminders wrapped on both sides,
  // which (B) rejects first — deleting (A) left it green, so it was checking
  // the other guard. (dev-loop "Adding a check": a mutation that leaves the
  // bite green is evidence about the mutation before it is evidence about
  // the bite.)
  //
  // The shape that reaches (A): the joined bytes are ALREADY a standalone
  // message in the predecessor, sitting beside a host that also carries them
  // wrapped, and the host then sheds its copy. The constituents do leave
  // their wrapper, so (B) passes — but nothing arrived anywhere. That is a
  // de-duplication, and pricing it as a relocation would misattribute a
  // whole class of harmless request.
  const shrunk = { role: "user", content: [toolResult("tu9")] };
  const novel = asst("a novel turn mid-history, so the pair is splice/insert-mid");

  const beforeInline = [user("q1"), asst("a1"), hostOf(R1, R2), merged(R1, R2), asst("a2")];
  const afterShed = [user("q1"), asst("a1"), novel, shrunk, merged(R1, R2), asst("a2")];
  assert.deepEqual(
    findBlockMigrations([entry(0, beforeInline, beforeInline), entry(1, afterShed, afterShed)]),
    [],
    "the standalone was already there — the host merely stopped duplicating it",
  );

  // The mirror: the host GAINS a wrapped copy of a standalone that was
  // already present and stays present. Nothing left the standalone either.
  const beforeShed = [user("q1"), asst("a1"), shrunk, merged(R1, R2), asst("a2")];
  const afterInline = [user("q1"), asst("a1"), novel, hostOf(R1, R2), merged(R1, R2), asst("a2")];
  assert.deepEqual(
    findBlockMigrations([entry(0, beforeShed, beforeShed), entry(1, afterInline, afterInline)]),
    [],
    "the standalone survived into the successor — it did not dissolve into the host",
  );
});

test("join: fires-on-non-defect guard — constituents still WRAPPED on the standalone side are a copy, not a move", () => {
  // Condition (B). The merged message appears, but the host still carries
  // both reminders in wrapped form: the bytes were duplicated, and the cache
  // consequence of a duplication is not the consequence of a relocation.
  const prev = [user("q1"), asst("a1"), hostOf(R1, R2), asst("a2")];
  const cur = [user("q1"), asst("a1"), hostOf(R1, R2), merged(R1, R2), asst("a2")];
  const rows = findBlockMigrations([entry(0, prev, prev), entry(1, cur, cur)]);
  assert.deepEqual(rows, []);
});

test("join: the merged standalone must land within the same +/-3 window a block migration uses", () => {
  // Condition (A), the window half. Same relocation, but the merged message
  // arrives four messages away from its host — beyond the neighbourhood the
  // census claims to be searching. Reported as a migration it would be an
  // unproven pairing of two messages that merely share bytes.
  const build = (gap) => {
    const filler = Array.from({ length: gap }, (_, k) => asst(`filler${k}`));
    const prev = [user("q1"), asst("a1"), hostOf(R1, R2), ...filler, asst("a2")];
    const cur = [
      user("q1"),
      asst("a1"),
      { role: "user", content: [toolResult("tu9")] },
      ...filler,
      merged(R1, R2),
      asst("a2"),
    ];
    return findBlockMigrations([entry(0, prev, prev), entry(1, cur, cur)]);
  };
  assert.equal(build(2).length, 1, "three messages apart: inside the window");
  assert.equal(build(2)[0].join, "in-entry");
  assert.deepEqual(build(3), [], "four apart: outside it");
});

// =====================================================================
// Content conservation — the fifth gate
// =====================================================================
//
// The DEFINITION lives beside the implementation (tools/replay.mjs, "Content
// conservation: the fifth gate"). These assertions are derived from THAT
// definition and not from what the implementation currently prints — the
// same-parentage trap the dev-loop names: an expectation taken from the code
// pins the bug it should catch.
//
// The four older gates are all positional: they compare our array against
// CC's, or ours against our own predecessor. None of them can see a message
// CC sent that we never forwarded and whose content exists nowhere else,
// because a deletion that leaves the survivors positionally consistent is
// invisible to every one of them. That is exactly what pin-and-suppress does
// on purpose, so "the copy really is on the wire" needs its own check.

import { findConservationViolations, conservationViolations } from "../tools/replay.mjs";

const sysStr = (t) => ({ role: "system", content: t });

// A pinned host: an ordinary block plus one reminder-wrapped block, the shape
// every suppression in this pipeline reconstructs from.
const host = (body, ...reminders) => ({
  role: "user",
  content: [txt(body), ...reminders.map((r) => txt(`<system-reminder>\n${r}\n</system-reminder>`))],
});

test("conservation: clean pass-through traffic is GREEN", () => {
  const msgs = [user("u0"), asst("a1"), host("tool output", "hook says hi")];
  assert.deepEqual(findConservationViolations([entry(0, msgs, msgs)]), []);
});

test("conservation: BITE — a message CC sent that we silently dropped is caught", () => {
  // No declaration of any kind: the forwarded array is simply one message
  // shorter. The safety gate catches this one too (length), but only because
  // the count changed — the point of the next bite is that conservation
  // catches it when the count does NOT.
  const inM = [user("u0"), asst("a1"), user("the message we lost")];
  const outM = [user("u0"), asst("a1")];
  const v = findConservationViolations([entry(0, inM, outM)]);
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, "lost");
});

test("conservation: BITE — content lost while the message COUNT stays equal", () => {
  // The class no positional gate can see: same length, same roles, same
  // order, tool adjacency intact — and one block of real content gone.
  const inM = [user("u0"), asst("a1"), host("tool output", "hook context worth keeping")];
  const outM = [user("u0"), asst("a1"), { role: "user", content: [txt("tool output")] }];
  const v = findConservationViolations([entry(0, inM, outM)]);
  assert.equal(v.length, 1, "the reminder block vanished with nothing accounting for it");
  assert.equal(v[0].kind, "lost");
  assert.match(v[0].detail, /in\[2\]/);
});

test("conservation: BITE — a DECLARED suppression with no copy on the wire is caught", () => {
  // This is the shape the unit-2 mitigation could get wrong: declaring a
  // suppression makes the safety gate exempt the message (it reads
  // stats.suppressions), so a suppression whose content is NOT reconstructible
  // would otherwise pass every existing check.
  const inM = [user("u0"), asst("a1"), sysStr("bytes that exist nowhere else")];
  const outM = [user("u0"), asst("a1")];
  const v = findConservationViolations([
    entry(0, inM, outM, { stats: { suppressions: [{ index: 2, hash: "h" }] } }),
  ]);
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, "suppressed-without-copy");
});

test("conservation: a declared suppression whose per-block copy IS forwarded is GREEN", () => {
  // The original #76606 shape: the standalone carries the reminder's UNWRAPPED
  // text, and the pinned host still forwards it wrapped. Same unit either way.
  const inM = [user("u0"), asst("a1"), host("tool output", "hook context"), sysStr("hook context")];
  const outM = [user("u0"), asst("a1"), host("tool output", "hook context")];
  const v = findConservationViolations([
    entry(0, inM, outM, { stats: { suppressions: [{ index: 3, hash: "h" }] } }),
  ]);
  assert.deepEqual(v, []);
});

test("conservation: a declared suppression matching a forwarded JOIN is GREEN", () => {
  // The merged-standalone shape (78940a0): CC migrates ALL of a message's
  // reminders out together as one standalone, joined with "\n\n". The copy on
  // the wire is the host's blocks, and only their JOIN equals the suppressed
  // bytes — a per-block check alone would call this a lost message.
  const merged = "first hook\n\nsecond hook";
  const inM = [user("u0"), asst("a1"), host("tool output", "first hook", "second hook"), sysStr(merged)];
  const outM = [user("u0"), asst("a1"), host("tool output", "first hook", "second hook")];
  const v = findConservationViolations([
    entry(0, inM, outM, { stats: { suppressions: [{ index: 3, hash: "h" }] } }),
  ]);
  assert.deepEqual(v, [], "the join of the host's two reminder blocks IS the suppressed message");
});

test("conservation: BITE — a join that is missing a constituent is NOT reconstructible", () => {
  // Fires-on-a-non-defect's mirror: the check must not accept any string that
  // merely CONTAINS a forwarded block. Here the suppressed standalone joins a
  // forwarded reminder with text that was never on the wire, which is exactly
  // the cross-message shape the mitigation must not paper over.
  const merged = "first hook\n\ncontent that exists nowhere in the forwarded array";
  const inM = [user("u0"), asst("a1"), host("tool output", "first hook"), sysStr(merged)];
  const outM = [user("u0"), asst("a1"), host("tool output", "first hook")];
  const v = findConservationViolations([
    entry(0, inM, outM, { stats: { suppressions: [{ index: 3, hash: "h" }] } }),
  ]);
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, "suppressed-without-copy");
});

test("conservation: BITE — a block we INVENTED is caught", () => {
  const inM = [user("u0"), asst("a1")];
  const outM = [user("u0"), asst("a1"), sysStr("text CC never sent anywhere")];
  const v = findConservationViolations([entry(0, inM, outM)]);
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, "invented");
});

test("conservation: re-serving bytes CC sent EARLIER in this conversation is GREEN", () => {
  // What the volatile pin does on every request: the host arrives with its
  // reminder stripped and we forward the first-seen form. The bytes are not in
  // THIS request, so the F-side clause only holds because they were in an
  // earlier one of the same conversation.
  const r0 = [user("u0"), asst("a1"), host("tool output", "hook context")];
  const r1 = [user("u0"), asst("a1"), { role: "user", content: [txt("tool output")] }, asst("a2")];
  const f1 = [user("u0"), asst("a1"), host("tool output", "hook context"), asst("a2")];
  const v = findConservationViolations([entry(0, r0, r0), entry(1, r1, f1)]);
  assert.deepEqual(v, []);
});

test("conservation: BITE — first-seen bytes from a DIFFERENT conversation do not count", () => {
  // The registry is per conversation because a cache prefix is: serving one
  // tenant's bytes into another tenant's history is invention, not a re-serve.
  // Identical to the test above except that the earlier request opens with a
  // different first message, which is the conversation identity every other
  // checker in this file uses.
  const other = [user("DIFFERENT conversation opener"), asst("a1"), host("tool output", "hook context")];
  const r1 = [user("u0"), asst("a1"), { role: "user", content: [txt("tool output")] }, asst("a2")];
  const f1 = [user("u0"), asst("a1"), host("tool output", "hook context"), asst("a2")];
  const v = findConservationViolations([entry(0, other, other), entry(1, r1, f1)]);
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, "invented");
});

test("conservation: deferred-tool-rewrite's declared tool_addition is GREEN", () => {
  // The same declared injection the safety gate already exempts. Counting it
  // here would re-create the 243-false-positive incident one gate over.
  const inM = [user("u0"), asst("a1")];
  const outM = [
    user("u0"),
    { role: "system", content: [{ type: "tool_addition", tool: { type: "tool_reference", name: "WebFetch" } }] },
    asst("a1"),
  ];
  assert.deepEqual(findConservationViolations([entry(0, inM, outM)]), []);
});

test("conservation: assistant-side rewrites are OUT of the population, and counted as residue", () => {
  // tool-input-normalize rewrites assistant tool_use inputs in place and
  // thinking sanitization drops thinking blocks — measured as the only
  // non-conserved blocks across 936 live requests. They are a separately-gated
  // class, so this gate must stay silent on them AND say how much it skipped.
  const inM = [
    user("u0"),
    { role: "assistant", content: [{ type: "thinking", thinking: "dropped later" }, { type: "tool_use", id: "t1", name: "Edit", input: { b: 2, a: 1 } }] },
  ];
  const outM = [
    user("u0"),
    { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "Edit", input: { a: 1, b: 2 } }] },
  ];
  const res = conservationViolations(entry(0, inM, outM), new Set());
  assert.deepEqual(res.violations, [], "assistant content is not this gate's population");
  assert.equal(res.assistantResidue, 2, "and the two blocks it did not examine are reported, not hidden");
});

// The cross-message join needs a PRIOR request in every case below, and that
// is not test scaffolding — it is the definition. A re-served constituent is
// legitimate only because CC itself sent those bytes earlier in this
// conversation; without that request the F-side clause correctly calls the
// re-serve an invention, which is what the first draft of these three tests
// discovered by going red.
const NUDGE = "The task tools haven't been used recently.";
const MERGED = `hook context\n\n${NUDGE}`;
// The inline leg CC sent first: the host carries its reminder, the nudge
// stands alone after it.
const crossPrev = () => [user("u0"), asst("a1"), host("tool output", "hook context"), sysStr(NUDGE), asst("a2")];
// The standalone leg: the host has shed its reminder and the two are merged
// into one message, which the extension declares suppressed.
const crossCur = () => [user("u0"), asst("a1"), { role: "user", content: [txt("tool output")] }, sysStr(MERGED), asst("a2")];
const crossSuppressed = { stats: { suppressions: [{ index: 3, hash: "h" }] } };

test("conservation: a suppression matching a CROSS-MESSAGE join of two forwarded messages is GREEN", () => {
  // The 2026-07-30 flap's novel leg (fixture flap-s-0dc8ac87c43d-86.json, msg91):
  // CC merged one message's reminder with the WHOLE standalone that followed
  // it. The copy on the wire is split across two ADJACENT forwarded messages —
  // the pinned host, and the re-served standalone right after it.
  const f = crossPrev();
  const v = findConservationViolations([
    entry(0, crossPrev(), crossPrev()),
    entry(1, crossCur(), f, crossSuppressed),
  ]);
  assert.deepEqual(v, [], "reminder host + the standalone after it reconstruct the merged message");
});

test("conservation: BITE — a cross-join whose SECOND constituent is not on the wire is caught", () => {
  // Naive suppression, which is the failure this gate exists to name: suppress
  // the merged message, re-serve nothing, and the standalone's bytes leave the
  // conversation entirely. Identical to the GREEN case except that the
  // re-served standalone is absent from the forwarded array.
  const f = crossPrev().filter((m) => m.content !== NUDGE);
  const v = findConservationViolations([
    entry(0, crossPrev(), crossPrev()),
    entry(1, crossCur(), f, crossSuppressed),
  ]);
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, "suppressed-without-copy");
});

test("conservation: BITE — cross-join constituents must be ADJACENT and in wire order", () => {
  // Without the adjacency and ordering restriction, any two forwarded messages
  // anywhere in a thousand-message history could be paired up to "explain" a
  // suppression, which explains nothing. Same two constituents as the GREEN
  // case, one unrelated turn between them.
  const f = [user("u0"), asst("a1"), host("tool output", "hook context"), asst("a-between"), sysStr(NUDGE), asst("a2")];
  const v = findConservationViolations([
    entry(0, crossPrev(), crossPrev()),
    entry(1, crossCur(), f, crossSuppressed),
  ]);
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, "suppressed-without-copy");
});

test("conservation: fresh-session-sort's declared /clear-artifact strip is exempt", () => {
  // Clause (c) of the definition, and the case that found it: the first sweep
  // reported 645 `lost` rows on capture s-captureA, all at message 0, and
  // stage-by-stage replay named fresh-session-sort, which deletes the echo a
  // slash command leaves behind. Declared behaviour, not lost conversation.
  const inM = [
    {
      role: "user",
      content: [
        txt("the actual question"),
        txt("<local-command-caveat>Caveat: the messages below were generated…</local-command-caveat>"),
        txt("<command-name>/compact</command-name>"),
        txt("<local-command-stdout>Compacted…</local-command-stdout>"),
      ],
    },
  ];
  const outM = [{ role: "user", content: [txt("the actual question")] }];
  assert.deepEqual(findConservationViolations([entry(0, inM, outM)]), []);
});

test("conservation: BITE — the strip exemption does NOT cover ordinary content", () => {
  // The exemption must be the three declared tags and nothing adjacent to
  // them; a check that swallows a real deletion because it sits next to a
  // declared one is worse than no check.
  const inM = [
    {
      role: "user",
      content: [txt("the actual question"), txt("<command-name>/compact</command-name>"), txt("real content CC sent")],
    },
  ];
  const outM = [{ role: "user", content: [txt("the actual question")] }];
  const v = findConservationViolations([entry(0, inM, outM)]);
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, "lost");
  assert.match(v[0].detail, /1 of 3/, "the declared artifact is exempt; the real block is not");
});

// --- Clause (d): smoosh-split's declared peel ---
//
// The live shape found on capture s-captureP (short key: full session ids stay
// out of the public tree, absence-scan's source-UUID guard): a
// tool_result's STRING content ends with a trailing <system-reminder>, and
// smoosh-split peels it into a standalone text block appended to the SAME
// message — content redistributed within the message, never removed.
const smooshedIn = () => [
  user("u0"),
  asst("a1"),
  {
    role: "user",
    content: [
      {
        type: "tool_result",
        tool_use_id: "t1",
        content: "tool output\n\n<system-reminder>\nhook says hi\n</system-reminder>",
      },
    ],
  },
];
// The exact split smoosh-split's own splitSmooshedReminders produces.
const smooshedOutPeeled = () => [
  user("u0"),
  asst("a1"),
  {
    role: "user",
    content: [
      { type: "tool_result", tool_use_id: "t1", content: "tool output" },
      { type: "text", text: "<system-reminder>\nhook says hi\n</system-reminder>" },
    ],
  },
];

test("conservation: BITE — the smoosh-split shape WITHOUT declared stats is a violation", () => {
  // No declaration at all: the same shape a re-derived "this looks peeled"
  // guess would be tempted to wave through, and exactly why the exemption
  // must be telemetry-gated rather than shape-gated.
  const v = findConservationViolations([entry(0, smooshedIn(), smooshedOutPeeled())]);
  assert.equal(v.length, 2, "one lost R-side unit at in[2], one invented F-side record at out[2]");
  assert.equal(v.filter((x) => x.kind === "lost").length, 1);
  assert.equal(v.filter((x) => x.kind === "invented").length, 1);
  assert.match(v.find((x) => x.kind === "invented").detail, /2 of 2/, "both post-peel blocks read as invented");
});

test("conservation: smoosh-split's declared peel is exempt on both sides", () => {
  const cv = conservationViolations(entry(0, smooshedIn(), smooshedOutPeeled(), { smooshSplitStats: { peeled: 1 } }), new Set());
  assert.deepEqual(cv.violations, [], "declared, byte-verified peel clears both the lost and the invented side");
  assert.equal(cv.exemptions.length, 2, "one exemption record per side — lost at in[2], invented at out[2]");
  assert.equal(cv.exemptions.filter((x) => x.kind === "lost").length, 1);
  assert.equal(cv.exemptions.filter((x) => x.kind === "invented").length, 1);
  for (const x of cv.exemptions) assert.equal(x.exemptReason, "smoosh-split:declared-peel");
});

test("conservation: BITE — declared smoosh-split stats do not survive a tampered forward", () => {
  // Same declaration as the GREEN case above, but the forwarded reminder text
  // has one byte changed ("hi" -> "HI"). The exemption re-derives the peel
  // from R and requires it byte-identical in F — it must not just trust the
  // declaration — so the mismatch leaves the violation standing exactly as
  // if nothing had been declared.
  const tamperedOut = () => [
    user("u0"),
    asst("a1"),
    {
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: "t1", content: "tool output" },
        { type: "text", text: "<system-reminder>\nhook says HI\n</system-reminder>" },
      ],
    },
  ];
  const v = findConservationViolations([
    entry(0, smooshedIn(), tamperedOut(), { smooshSplitStats: { peeled: 1 } }),
  ]);
  assert.equal(v.length, 2, "a declared but unverifiable peel is not exempt");
});

// --- Threat-matrix row 25: relocated-block DEPARTURES (2026-08-05) ---
//
// DEFINITION, written before the assertions: a DEPARTURE is a consecutive
// SAME-CONVERSATION pair (prev, cur) in which a relocatable
// <system-reminder> type is PRESENT somewhere in prev's pre-pipeline message
// array and ABSENT everywhere in cur's. Presence is the whole axis — the
// type's index may move and its bytes may change without being a departure
// (the relocation is index-independent, and CC's newer bytes simply win),
// while a type CC stops sending is the case `fresh-session-sort`'s
// per-conversation memory exists for: before 65d0455 the extension re-derived
// its relocated set from the CURRENT array, so our forwarded messages[0] lost
// the block and CC's edit at index k became OUR edit at index 0.
//
// What a row must carry beyond "it happened": `prefixAboveMessages`, the
// pair's COST reading. The occurrence that opened row 25 (s-captureAB
// n=331->336) cost nothing — CC churned tools 11->9 and its first system
// block in the same request, so the prefix was already broken two levels
// above messages. `intact: true` is therefore the sub-count that says whether
// the mitigation was worth shipping, and it is the reason a bare total is not
// an answer.
import { findRelocDepartures } from "../tools/replay.mjs";

const MCP_BLOCK = "<system-reminder>\n# MCP Server Instructions\n\nqgis: use the tools.\n</system-reminder>";
const SKILLS_BLOCK = "<system-reminder>\nThe following skills are available for use:\n\n- one: a skill\n</system-reminder>";
const reloc = (t) => ({ role: "user", content: [{ type: "text", text: t }] });
const RELOC_TOOLS = [{ name: "Read" }, { name: "Write" }];
// Every entry in these bites carries tools/system on BOTH sides, so `intact`
// is a measured true/false rather than the degenerate null===null case.
const withPrefix = (extra = {}) => ({
  inTools: RELOC_TOOLS, outTools: RELOC_TOOLS, inSystem: "S", outSystem: "S", ...extra,
});

test("relocDepartures: a successor that drops a relocated block is one row, typed and priced", () => {
  const prevIn = [user("u0"), asst("a1"), user("u2"), reloc(MCP_BLOCK)];
  const curIn = [user("u0"), asst("a1"), user("u2"), user("u3-no-mcp")];
  const rows = findRelocDepartures([
    entry(0, prevIn, prevIn, withPrefix()),
    entry(1, curIn, curIn, withPrefix()),
  ]);
  assert.equal(rows.length, 1, "exactly one departure — one type left the array");
  assert.equal(rows[0].type, "mcp");
  assert.equal(rows[0].prevMsgIdx, 3, "the raw index the departing instance sat at");
  assert.equal(rows[0].n, 1);
  assert.equal(rows[0].prevN, 0, "the pair is named by both ends, never by n-1");
  assert.equal(rows[0].prefixAboveMessages.intact, true,
    "tools[] and system held across the pair — this departure re-bills the whole message array");
});

test("relocDepartures: control — the block still present is NOT a departure", () => {
  // Present at a DIFFERENT index, with DIFFERENT bytes: neither is the class.
  // Only absence is.
  const prevIn = [user("u0"), asst("a1"), reloc(MCP_BLOCK), user("u3")];
  const curIn = [user("u0"), asst("a1"), user("u2-edited"), reloc(MCP_BLOCK + "\n")];
  const rows = findRelocDepartures([
    entry(0, prevIn, prevIn, withPrefix()),
    entry(1, curIn, curIn, withPrefix()),
  ]);
  assert.deepEqual(rows, [], "a moved or re-written block is not a departure");
});

test("relocDepartures: control — two DIFFERENT conversations are never paired", () => {
  // The hand-rolled-identity trap this repo has paid for repeatedly: these two
  // requests sit adjacent on the wire and the second lacks the block, but they
  // are different conversations (different messages[0]) and must not be
  // compared at all.
  const convA = [user("convA-root"), reloc(MCP_BLOCK)];
  const convB = [user("convB-root-different"), user("no-mcp-here")];
  const rows = findRelocDepartures([
    entry(0, convA, convA, withPrefix()),
    entry(1, convB, convB, withPrefix()),
  ]);
  assert.deepEqual(rows, [], "no cross-conversation pairing");
});

test("relocDepartures: a departure whose forwarded tools also moved is priced as FREE", () => {
  // The row-25 occurrence's own shape: the prefix broke above messages in the
  // same request, so the message-level flip adds nothing to the bill. Folding
  // this into the total is how a free row gets carried as the most expensive
  // item open.
  const prevIn = [user("u0"), reloc(SKILLS_BLOCK)];
  const curIn = [user("u0"), user("u1-no-skills")];
  const rows = findRelocDepartures([
    entry(0, prevIn, prevIn, withPrefix()),
    entry(1, curIn, curIn, withPrefix({ inTools: [{ name: "Read" }], outTools: [{ name: "Read" }] })),
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].type, "skills");
  assert.equal(rows[0].prefixAboveMessages.intact, false,
    "our forwarded tools[] changed across the pair — no marginal cost");
});

// The three-answer rule (dev-loop.md, "A checker has THREE answers") applied
// to the stability line's cost tag. DEFINITION: `prefixAboveMessages` absent
// from a record means the measurement was never taken — which is neither
// "intact" nor "already broken", and printing it as INTACT reports the most
// expensive verdict on no evidence. Absent is its own answer.
import { prefixCostTag } from "../tools/replay.mjs";

test("prefixCostTag: BITE — an ABSENT measurement is NOT reported as intact", () => {
  assert.match(prefixCostTag(undefined), /NOT MEASURED/);
  assert.match(prefixCostTag(null), /NOT MEASURED/);
  assert.doesNotMatch(prefixCostTag(undefined), /INTACT/);
  assert.match(prefixCostTag({ intact: true }), /INTACT/);
  assert.match(
    prefixCostTag({ intact: false, ourToolsIdentical: false, ourSystemIdentical: true }),
    /ALREADY broken above messages: tools changed/,
  );
});

// =====================================================================
// Clause (h): identity-normalization's declared SessionStart substitution
// =====================================================================
//
// DEFINITION, written before the assertions and taken from the EXTENSION, not
// from what the gate currently prints (the same-parentage trap: an expectation
// derived from the checker pins the bug it should catch).
//
// `identity-normalization` rewrites a SessionStart hook block IN PLACE —
// `SessionStart:resume hook success:` becomes
// `SessionStart:startup hook success:`, the `<session-id>` tag and the
// `Last active:` line are removed (identity-normalization.mjs,
// `normalizeSessionStartText`). So the unit CC sent is genuinely not on the
// wire and a transformed one is, which is the same shape as
// fresh-session-sort's clause (f) and reads, unexempted, as `lost` on the raw
// side plus `invented` on the forwarded side — one pair per request carrying a
// resume block. A BLOCKING gate firing on a declared, intended behaviour is
// the fires-on-a-non-defect class this repo treats as its own defect.
//
// A lost R-side unit is ACCOUNTED when the extension is DECLARED to have
// mutated this request AND re-running its own `normalizeSessionStartText` over
// the raw block that produced the unit yields a changed text whose unit is
// present in F byte-identically. The F-side unit that appeared in its place is
// accounted by that same verified pair and by nothing else. The mapping is per
// BLOCK, pre-image to post-image: a second unit of the same message that the
// substitution does not reach is not covered by it.
//
// Live instance this was built from: capture s-captureAL, request n=91,
// message 96 (role system), 2026-08-06T17:39:23.557Z — `SessionStart:resume
// hook success:` in CC's raw array, `SessionStart:startup hook success:` on
// the wire, byte-identical to the extension's own output.
import { normalizeSessionStartText } from "../proxy/extensions/identity-normalization.mjs";

const SESSION_START_RESUME =
  "SessionStart:resume hook success: ledger tail\n<session-id>abc</session-id>\nLast active: yesterday\ntail line";

// The substitution's own output — never restated here, so the fixture cannot
// drift from the extension it is about.
const sessionStartForwarded = () => {
  const [after, count] = normalizeSessionStartText(SESSION_START_RESUME);
  assert.ok(count > 0 && after !== SESSION_START_RESUME,
    "arrange: the extension really does substitute in this block");
  return after;
};

// The replay loop's own per-extension measurement (it hashes the body either
// side of each extension), which is what "declared" means for this clause:
// identity-normalization emits no ctx.meta telemetry at all.
const idnorm = (extra = {}) => ({ mutatedBy: ["identity-normalization"], ...extra });

test("conservation: identity-normalization's declared SessionStart substitution is exempt on both sides", () => {
  const inM = [{ role: "system", content: [txt(SESSION_START_RESUME)] }];
  const outM = [{ role: "system", content: [txt(sessionStartForwarded())] }];
  const cv = conservationViolations(entry(0, inM, outM, idnorm()), new Set(), new Set());

  assert.deepEqual(cv.violations, [],
    "the substituted block is on the wire, byte-identical to the extension's own output");
  assert.deepEqual(cv.exemptions.map((x) => x.kind).sort(), ["invented", "lost"],
    "one exemption record per side — the pre-image is gone from F, the post-image is new to it");
  for (const x of cv.exemptions) {
    assert.match(x.exemptReason, /identity-normalization:session-start-substitution/,
      `the ${x.kind} side must credit the substitution, not another mechanism`);
  }
});

test("conservation: BITE — the same substitution WITHOUT a declaration stays a violation", () => {
  // No declaration, no exemption attempt: a gate that re-derives a transform
  // nobody claimed is inventing the exemption rather than verifying one.
  const inM = [{ role: "system", content: [txt(SESSION_START_RESUME)] }];
  const outM = [{ role: "system", content: [txt(sessionStartForwarded())] }];
  const v = findConservationViolations([entry(0, inM, outM)]);
  assert.equal(v.length, 2, "one lost at in[0], one invented at out[0]");
  assert.deepEqual(v.map((x) => x.kind).sort(), ["invented", "lost"]);
});

test("conservation: BITE — a substitution that changed EXTRA bytes goes red THROUGH the exemption", () => {
  // The backlog entry's named verifier, and the reason the exemption
  // re-derives instead of trusting the declaration. These forwarded bytes are
  // what a MUTATED substitution would emit: the shipped rewrite plus one extra
  // byte the extension never touches. The gate re-derives with the real
  // `normalizeSessionStartText`, the post-image hash it computes is not on the
  // wire, and the violation stands on both sides exactly as if nothing had
  // been declared.
  const mutated = sessionStartForwarded().replace("tail line", "taiL line");
  assert.notEqual(mutated, sessionStartForwarded(), "arrange: the mutation really changed a byte");
  const inM = [{ role: "system", content: [txt(SESSION_START_RESUME)] }];
  const outM = [{ role: "system", content: [txt(mutated)] }];
  const cv = conservationViolations(entry(0, inM, outM, idnorm()), new Set(), new Set());

  assert.deepEqual(cv.violations.map((x) => x.kind).sort(), ["invented", "lost"],
    "a declared but unverifiable substitution is not exempt");
  assert.deepEqual(cv.exemptions, [], "and nothing is written into the exemption ledger");
});

test("conservation: BITE — a REAL loss in the same message as a legitimate substitution still fires", () => {
  // Narrowness, stated as a test rather than as a claim: the exemption maps
  // ONE pre-image to ONE post-image. A second block of the same message that
  // the substitution never reaches, and that is missing from the wire, is a
  // real conservation violation and must survive the exemption beside it.
  const inM = [{
    role: "system",
    content: [txt(SESSION_START_RESUME), txt("<system-reminder>\nreal content CC sent\n</system-reminder>")],
  }];
  const outM = [{ role: "system", content: [txt(sessionStartForwarded())] }];
  const cv = conservationViolations(entry(0, inM, outM, idnorm()), new Set(), new Set());

  assert.equal(cv.violations.length, 1, "the message stays red");
  assert.equal(cv.violations[0].kind, "lost");
  assert.equal(cv.violations[0].at, 0);
  // And nothing is excused on the R side while an unexplained unit remains:
  // the message-level exemption fires only when every lost unit is accounted
  // for, so a real drop beside a legitimate substitution keeps the whole row.
  assert.deepEqual(cv.exemptions.filter((x) => x.kind === "lost"), [],
    "a partially-explained message is not a partially-excused one");

  // The count names ONLY the genuinely missing unit. This bite carried the
  // opposite as a NAMED RESIDUE when the clause first shipped — the row read
  // `2 of 2`, naming a unit that had a declared, byte-verified explanation as
  // missing — and the count narrowing is what closes it, which is why this is
  // an assertion now rather than a comment saying it cannot be one.
  assert.match(cv.violations[0].detail, /1 of 2 unit/,
    "one unit is unaccounted for; the substituted one is not");
});

test("conservation: BITE — prose that merely QUOTES the marker is not covered", () => {
  // The extension's own ANCHOR is what separates the hook's own output from a
  // message that mentions the marker mid-sentence, and that separation cost a
  // live incident: an unanchored substitution silently edited a teammate's
  // quotation (identity-normalization.mjs, SESSION_START_ANCHOR).
  //
  // So the forwarded side here carries what an UNANCHORED substitution would
  // emit — CC's prose with the marker rewritten inside it. Nothing in the
  // shipped pipeline produces that, which is the point: if some component ever
  // did, it would be a silent edit of conversation content, and the gate must
  // report it rather than excuse it through this clause. The clause chains the
  // extension's own anchored function, gets `count === 0`, builds no pre-image
  // -> post-image pair, and the violation stands on both sides.
  const prose = 'Index 41 is role:"system", plain `SessionStart:resume hook success: …`.';
  const [out, count] = normalizeSessionStartText(prose);
  assert.equal(count, 0, "arrange: the extension leaves prose alone");
  assert.equal(out, prose);
  const edited = prose.replace("SessionStart:resume", "SessionStart:startup");
  assert.notEqual(edited, prose, "arrange: an unanchored rewrite really would change these bytes");

  const inM = [{ role: "user", content: [txt(prose)] }];
  const outM = [{ role: "user", content: [txt(edited)] }];
  const cv = conservationViolations(entry(0, inM, outM, idnorm()), new Set(), new Set());
  assert.deepEqual(cv.violations.map((v) => v.kind).sort(), ["invented", "lost"],
    "an edit the extension's own anchor refuses is a corrupted message, not a declared behaviour");
  assert.deepEqual(cv.exemptions, []);
});

// =====================================================================
// The third answer: `declarationsUnavailable`
// =====================================================================
//
// DEFINITION, written before the assertions. This gate reads FOUR declaration
// surfaces off the entry — `smooshSplitStats`, `freshSessionSortStats`,
// `contentStripStats` and `mutatedBy`. A row is `declarationsUnavailable` when
// the entry carries NONE of them, i.e. every one is `undefined`. It separates
// the two answers that were byte-identical before it existed:
//
//   verified broken  — the gate consulted its declarations and this content
//                      really is unaccounted for.
//   COULD NOT VERIFY — the gate had nothing to consult, so "unaccounted for"
//                      is an absence of evidence wearing a verdict's clothes.
//
// PRESENCE WITH AN INERT VALUE IS A CHECKED ANSWER, not an unavailable one:
// the run loop writes `smooshSplitStats: … ?? null` and always builds
// `mutatedBy`, so a request where every extension simply did nothing has all
// four surfaces present and reports an ordinary violation. That is what keeps
// this off the daily sweep — the flag can only fire on a caller that builds
// entries by hand (`findConservationViolations`, the tests here), which is
// precisely the population that could not previously say which answer it meant.
//
// The FLAG ALONE is not the repair. The human-facing `detail` line is what a
// sweep reader and a row pin actually carry, so it says so too — a flag in
// JSON beside a line that still reads as a plain violation leaves the reader
// exactly where they were.

const noDecl = (inM, outM) => conservationViolations(entry(0, inM, outM), new Set(), new Set());

test("conservation: a violation on an entry with NO declaration surfaces says COULD NOT VERIFY", () => {
  const inM = [{ role: "user", content: [txt("real content CC sent")] }];
  const outM = [{ role: "user", content: [] }];
  const cv = noDecl(inM, outM);

  assert.equal(cv.violations.length, 1);
  assert.equal(cv.violations[0].kind, "lost");
  assert.equal(cv.violations[0].declarationsUnavailable, true,
    "no surface was present, so the gate cannot claim it checked one");
  assert.match(cv.violations[0].detail, /declarations unavailable/,
    "and the human-facing line says so — the flag alone leaves the reader where they were");
});

test("conservation: BITE — a violation on an entry that DOES carry surfaces is a plain fail", () => {
  // The discriminator. Same missing bytes, but the entry carries the surfaces
  // the run loop always writes: the gate consulted them, they declared
  // nothing, and the content really is unaccounted for. Reporting this one as
  // could-not-verify would make the third answer fire on a real defect, which
  // is the fires-on-a-non-defect failure pointed the other way.
  const inM = [{ role: "user", content: [txt("real content CC sent")] }];
  const outM = [{ role: "user", content: [] }];
  const cv = conservationViolations(
    entry(0, inM, outM, { smooshSplitStats: null, freshSessionSortStats: null, contentStripStats: null, mutatedBy: [] }),
    new Set(), new Set(),
  );

  assert.equal(cv.violations.length, 1);
  assert.equal(cv.violations[0].declarationsUnavailable, false,
    "present-but-inert is a checked answer, not a missing one");
  assert.doesNotMatch(cv.violations[0].detail, /declarations unavailable/);
});

test("conservation: BITE — ONE surface present is enough to make the verdict a real one", () => {
  // "None of the four" is the condition, deliberately: a caller that carries
  // even one surface has given the gate something to consult, and the clauses
  // it could not consult are off for a stated reason rather than an unknown
  // one. A predicate of "any of the four missing" would fire on every
  // hand-built entry in this file and train its reader to ignore the word.
  const inM = [{ role: "user", content: [txt("real content CC sent")] }];
  const outM = [{ role: "user", content: [] }];
  const cv = conservationViolations(entry(0, inM, outM, { mutatedBy: [] }), new Set(), new Set());
  assert.equal(cv.violations[0].declarationsUnavailable, false);
});

test("conservation: the flag rides EVERY violation kind, not just `lost`", () => {
  // suppressed-without-copy, lost and invented are all violation rows and all
  // three are equally unable to say which answer they mean without it.
  const inM = [{ role: "user", content: [txt("real content CC sent")] }];
  const outM = [{ role: "user", content: [txt("bytes CC never sent")] }];
  const cv = noDecl(inM, outM);
  assert.deepEqual(cv.violations.map((v) => v.kind).sort(), ["invented", "lost"]);
  for (const v of cv.violations) {
    assert.equal(v.declarationsUnavailable, true, `${v.kind} must carry it too`);
    assert.match(v.detail, /declarations unavailable/);
  }

  // `suppressions[].index` is the field `suppressedIndices` reads. Getting
  // this wrong once in this very test is the hand-rolled-fixture trap: a
  // `wireIdx` key produced a `lost` row instead, i.e. a fixture that silently
  // exercised a different branch than the one the bite names.
  //
  // `stats` is insertion-normalization's telemetry and is NOT one of the four
  // declaration surfaces, so this entry is still declaration-less.
  const sup = conservationViolations({
    n: 0, ts: "t",
    inMsgs: [{ role: "user", content: [txt("<system-reminder>\nsuppressed body\n</system-reminder>")] }],
    outMsgs: [],
    stats: { suppressions: [{ index: 0, hash: "h" }] },
  }, new Set(), new Set());
  assert.equal(sup.violations.length, 1);
  assert.equal(sup.violations[0].kind, "suppressed-without-copy");
  assert.equal(sup.violations[0].declarationsUnavailable, true);
  assert.match(sup.violations[0].detail, /declarations unavailable/);
});

// =====================================================================
// Clause (f) narrowed to PER UNIT
// =====================================================================
//
// DEFINITION, from the gate's own clause (f) text, which already claimed this
// and did not do it: a lost unit is accounted for by a declared
// fresh-session-sort rewrite when THAT unit's own pre-image maps, through the
// extension's `rewriteBlockText`, to a post-image present in F. One pre-image
// to one post-image, exactly as clauses (d) and (h) work.
//
// What it did instead: `[...rewritten].some((h) => fHashes.has(h))` — a
// predicate that never looks at `u`. One verified rewrite anywhere in the
// message therefore exempted EVERY other lost unit of that message, including
// bytes no transform ever touched. An over-firing exemption is a gate that
// under-fires, and this one sits on the safety side of "safety outranks
// cache": a genuinely dropped message block rode out next to a legitimate
// relocation and reported clean.
//
// Found by mutation M3 while building clause (h): installing exactly this
// any-of shape in the new clause turned its own narrowness bite red, which is
// what pointed at the old one.
import { rewriteBlockText } from "../proxy/extensions/fresh-session-sort.mjs";

// `SKILLS_BLOCK` above is a fixed string for the relocation tests; this clause
// needs blocks whose SORT ORDER differs, so the rewrite is a real one.
const skillsInOrder = (order) =>
  `<system-reminder>\nThe following skills are available for use with the Skill tool:\n\n${
    order.map((n) => `- ${n}: does ${n}`).join("\n")}\n</system-reminder>\n`;

const fss = (extra = {}) => ({
  freshSessionSortStats: { relocated: [{ type: "skills" }], reserved: [], targetIndex: 0 },
  ...extra,
});

test("conservation: BITE — a real loss beside a declared fresh-session-sort rewrite still fires", () => {
  const before = skillsInOrder(["zeta", "alpha"]);
  const after = rewriteBlockText("skills", before);
  assert.notEqual(after, before, "arrange: the extension really does rewrite this block");

  // Two lost units: the rewritten block's pre-image (accounted) and an
  // ordinary reminder CC sent that simply never reached the wire (not).
  const inM = [{
    role: "user",
    content: [txt(before), txt("<system-reminder>\nreal content CC sent\n</system-reminder>")],
  }];
  const outM = [{ role: "user", content: [txt(after)] }];
  const cv = conservationViolations(entry(0, inM, outM, fss()), new Set(), new Set());

  assert.equal(cv.violations.length, 1, "the rewrite is accounted; the dropped block is not");
  assert.equal(cv.violations[0].kind, "lost");
  assert.deepEqual(cv.exemptions.filter((x) => x.kind === "lost"), [],
    "a partially-explained message is not a partially-excused one");
});

test("conservation: a declared rewrite with NOTHING else lost is still exempt on both sides", () => {
  // The narrowing must not break the case clause (f) exists for. Same fixture,
  // minus the real loss.
  const before = skillsInOrder(["zeta", "alpha"]);
  const after = rewriteBlockText("skills", before);
  const cv = conservationViolations(entry(0,
    [{ role: "user", content: [txt(before)] }],
    [{ role: "user", content: [txt(after)] }],
    fss()), new Set(), new Set());

  assert.deepEqual(cv.violations, []);
  assert.deepEqual(cv.exemptions.map((x) => x.kind).sort(), ["invented", "lost"]);
  for (const x of cv.exemptions) assert.match(x.exemptReason, /fresh-session-sort:rewrite/);
});

test("conservation: BITE — the exempt unit is the one that was REWRITTEN, not merely a neighbour", () => {
  // The sharpest form: the message carries TWO relocatable blocks, and only one
  // of them reaches the wire. Under the any-of shape both were excused because
  // one post-image was present. Per-unit, the one whose own post-image is
  // missing stays a violation — which is what makes the exemption a
  // verification rather than a message-wide amnesty.
  const skillsBefore = skillsInOrder(["zeta", "alpha"]);
  const skillsAfter = rewriteBlockText("skills", skillsBefore);
  const otherBefore = skillsInOrder(["yankee", "bravo"]);
  const otherAfter = rewriteBlockText("skills", otherBefore);
  assert.notEqual(otherAfter, otherBefore, "arrange: the second block is rewritten too");
  assert.notEqual(skillsAfter, otherAfter, "arrange: the two post-images are distinct");

  const inM = [{ role: "user", content: [txt(skillsBefore), txt(otherBefore)] }];
  const outM = [{ role: "user", content: [txt(skillsAfter)] }]; // otherAfter never forwarded
  const cv = conservationViolations(entry(0, inM, outM, fss()), new Set(), new Set());

  assert.equal(cv.violations.length, 1);
  assert.equal(cv.violations[0].kind, "lost");
  assert.match(cv.violations[0].detail, /1 of 2 unit/,
    "one of the message's two units is unaccounted for");
});

// =====================================================================
// The violation row's COUNT names the UNACCOUNTED units
// =====================================================================
//
// DEFINITION, from what the row's own sentence claims: `N of M unit(s) present
// in CC's request and in no forwarded message` asserts that N units are
// unexplained. When a message's lost list is only PARTIALLY accounted for, N
// was the WHOLE lost list — so a unit with a declared, byte-verified
// explanation was counted and named as missing, in the same row that correctly
// reported its neighbour.
//
// Strictly a no-op wherever nothing is exempt (the exempt set is empty, so the
// two counts coincide), which is why it needs a bite that CONSTRUCTS the
// partial case rather than trusting the corpus to contain one. The other two
// violation kinds already did this: `suppressed-without-copy` counts its
// `unaccounted` list, and the F-side `invented` count is computed after the
// exemptions are subtracted. This is the R-side `lost` branch catching up.

test("conservation: the lost row counts UNACCOUNTED units, not the whole lost list", () => {
  const before = skillsInOrder(["zeta", "alpha"]);
  const after = rewriteBlockText("skills", before);
  const inM = [{
    role: "user",
    content: [txt(before), txt("<system-reminder>\nreal content CC sent\n</system-reminder>")],
  }];
  const outM = [{ role: "user", content: [txt(after)] }];
  const cv = conservationViolations(entry(0, inM, outM, fss()), new Set(), new Set());

  assert.equal(cv.violations.length, 1);
  assert.match(cv.violations[0].detail, /1 of 2 unit\(s\) present in CC's request/,
    "the declared rewrite is explained; only the dropped block is counted");
});

test("conservation: BITE — with NOTHING exempt the count is unchanged, so the narrowing cannot hide a loss", () => {
  // The other half, and the one that makes the narrowing safe: where no clause
  // accounts for anything, unaccounted === lost and the row reads exactly as
  // it always did. A narrowing that quietly shrank an unexplained count would
  // be the softened predicate this repo's box forbids.
  const inM = [{
    role: "user",
    content: [txt("<system-reminder>\nfirst block\n</system-reminder>"),
              txt("<system-reminder>\nsecond block\n</system-reminder>")],
  }];
  const outM = [{ role: "user", content: [] }];
  const cv = conservationViolations(entry(0, inM, outM, fss()), new Set(), new Set());

  assert.equal(cv.violations.length, 1);
  assert.match(cv.violations[0].detail, /2 of 2 unit\(s\) present in CC's request/,
    "nothing was accounted for, so nothing is subtracted");
});

test("conservation: BITE — an EXEMPTION never carries the flag, because it had a declaration by construction", () => {
  const inM = [{ role: "system", content: [txt(SESSION_START_RESUME)] }];
  const outM = [{ role: "system", content: [txt(sessionStartForwarded())] }];
  const cv = conservationViolations(entry(0, inM, outM, idnorm()), new Set(), new Set());
  assert.equal(cv.violations.length, 0);
  for (const x of cv.exemptions) {
    assert.equal(x.declarationsUnavailable, undefined,
      "an exemption is granted BY a declaration; flagging it would be incoherent");
  }
});

// --- findBornLargeStarts (BACKLOG "born-large conversation starts become a
// census class") ---
//
// A conversation whose FIRST-EVER request already carries a deep message
// array, rather than growing there through ordinary turns. Report-only —
// not itself a defect — so these bites check the CLASSIFICATION, never an
// exit code.

const bigMsgs = (n, seed) => Array.from({ length: n }, (_, i) => user(`${seed}${i}`));

test("bornLargeStarts: BITE — a conversation whose first request is deep classifies, a small one does not", () => {
  const small = entry(0, [user("hello")], [user("hello")], { id: "req-small", inSystem: [{ text: "sys" }] });
  const big = entry(1, bigMsgs(60, "big-"), bigMsgs(60, "big-"), { id: "req-big", inSystem: [{ text: "sys" }] });
  const rows = replayMod.findBornLargeStarts([small, big]);
  assert.equal(rows.length, 1, "only the >=50-message opener classifies");
  assert.equal(rows[0].n, 1);
  assert.equal(rows[0].id, "req-big");
  assert.equal(rows[0].msgs, 60);
  assert.equal(rows[0].comparandN, null, "no earlier born-large start in this capture");
});

test("bornLargeStarts: a SECOND born-large start is compared against the first, not against its immediate predecessor", () => {
  const first = entry(0, bigMsgs(60, "a-"), bigMsgs(60, "a-"), { id: "req-A", inSystem: [{ text: "sys v1" }] });
  // An unrelated small conversation sits BETWEEN the two born-large starts —
  // the comparand must skip it, not read it as "the previous request".
  const between = entry(1, [user("between")], [user("between")], { id: "req-mid", inSystem: [{ text: "sys v1" }] });
  const second = entry(2, bigMsgs(80, "b-"), bigMsgs(80, "b-"), {
    id: "req-B", inSystem: [{ text: "sys v2, a longer prompt than the first" }],
  });
  const rows = replayMod.findBornLargeStarts([first, between, second]);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].comparandN, 0, "compared against the first born-large start, skipping the small conversation");
  assert.equal(rows[1].systemHashHeld, false, "the system prompt text differs across the pair");
  assert.equal(rows[1].sysSubRotated, true, "the first system block's own sub-key rotated");
  assert.ok(rows[1].systemCharDelta > 0, "the second prompt is longer");
});

test("bornLargeStarts: BITE — with the grouping key forced constant, distinct conversations look like one and nothing classifies twice", () => {
  const a = entry(0, bigMsgs(60, "a-"), bigMsgs(60, "a-"), { id: "req-A", inSystem: [{ text: "sys" }] });
  const b = entry(1, bigMsgs(70, "b-"), bigMsgs(70, "b-"), { id: "req-B", inSystem: [{ text: "sys" }] });
  // Mutation: force both entries' msgs[0] identical, so conversationOf (the
  // grouping key) reads them as ONE conversation — the second is then a
  // continuation, not a first appearance, and must not classify.
  a.inMsgs[0] = user("shared-first-message");
  b.inMsgs = [user("shared-first-message"), ...b.inMsgs.slice(1)];
  b.outMsgs = b.inMsgs;
  const rows = replayMod.findBornLargeStarts([a, b]);
  assert.equal(rows.length, 1, "forcing one shared identity must suppress the second row — an over-firing guard");
});

test("bornLargeStarts: control — a conversation born SMALL that later grows deep never classifies", () => {
  const start = entry(0, [user("hi")], [user("hi")], { id: "req-start", inSystem: [{ text: "sys" }] });
  const grown = entry(1, [user("hi"), ...bigMsgs(59, "g-")], [user("hi"), ...bigMsgs(59, "g-")], {
    id: "req-grown", inSystem: [{ text: "sys" }],
  });
  const rows = replayMod.findBornLargeStarts([start, grown]);
  assert.equal(rows.length, 0, "ordinary growth through turns is not a born-large start");
});
