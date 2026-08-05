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

import { test } from "node:test";
import assert from "node:assert/strict";

import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
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
} from "../tools/replay.mjs";
import { buildDescriptionChangeMessage } from "../proxy/extensions/deferred-tool-rewrite.mjs";

const user = (t) => ({ role: "user", content: [{ type: "text", text: t }] });
const asst = (t) => ({ role: "assistant", content: [{ type: "text", text: t }] });

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

// --- fresh-session-sort's telemetry-keyed exemption (2026-07-30) ---
//
// The real case (s-58c979ce n=2024->2025): CC's own array first diverges at
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

// --- deferred-tool-rewrite's reset-wipes-additions exemption (2026-08-01) ---
//
// The real case (s-0d6f38ba, pairs n=709->710 outDiv=236 and n=701->718
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

test("stability: BITE — a reset for any OTHER reason stays a violation", () => {
  // Only the tool-schema-changed reset is the declared wipe. A different
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
// s-538c0aef request 109: CC replaced message 196 in place, so
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
  const dir = await mkdtemp(join(tmpdir(), "cache-fix-readcapture-"));
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
  const dir = await mkdtemp(join(tmpdir(), "cache-fix-readcapture-"));
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
// Measured on the real 2026-07-30 flap bytes (capture s-0d6f38ba, pair
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
      n: r.n, ts: r.ts, key: "s-0d6f38ba", inMsgs: r.messages, outMsgs: r.messages, inTools: [], outTools: [],
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
  // reported 645 `lost` rows on capture s-633915a8, all at message 0, and
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
// The live shape found on capture s-00b19d9b (short key: full session ids stay
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
