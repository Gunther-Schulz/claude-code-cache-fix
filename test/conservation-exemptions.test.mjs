// The conservation gate's declared exemptions for fresh-session-sort and
// content-strip, and the anchoring fix for identity-normalization.
//
// All three come from one triage (2026-08-05): 40 conservation rows across
// three captures, every one of them a DECLARED, intentional behaviour and none
// a corruption. A gate that fires on legitimate work trains its reader to
// discount red, which this repo treats as its own defect — so the repair is a
// declared exemption the gate VERIFIES, never a softened predicate.

import { test } from "node:test";
import assert from "node:assert/strict";

import { conservationViolations } from "../tools/replay.mjs";
import { rewriteBlockText, normalizeBlockText } from "../proxy/extensions/fresh-session-sort.mjs";
import { normalizeSessionStartText, isSessionStartBlock } from "../proxy/extensions/identity-normalization.mjs";

const SKILLS = (order) =>
  `<system-reminder>\nThe following skills are available for use with the Skill tool:\n\n${
    order.map((n) => `- ${n}: does ${n}`).join("\n")}\n</system-reminder>\n`;

const NUDGE = "<system-reminder>\nThe task tools haven't been used recently. Only a gentle reminder.\n</system-reminder>";

const entry = ({ inMsgs, outMsgs, ...rest }) => ({
  n: 1, ts: "2026-08-05T00:00:00.000Z", inMsgs, outMsgs, stats: null, ...rest,
});

// --- fresh-session-sort's rewrite -------------------------------------------

test("a declared block rewrite is exempt once its result is verified in F", () => {
  const before = SKILLS(["zeta", "alpha"]);
  const after = rewriteBlockText("skills", before);
  assert.notEqual(after, before, "arrange: the extension really does rewrite this block");

  const r = conservationViolations(entry({
    inMsgs: [{ role: "user", content: [{ type: "text", text: before }] }],
    outMsgs: [{ role: "user", content: [{ type: "text", text: after }] }],
    freshSessionSortStats: { relocated: [{ type: "skills" }], targetIndex: 0 },
  }), new Set());

  assert.deepEqual(r.violations, [], "the rewritten block is on the wire, byte-identical");
  // Two exemptions, one per side: the pre-rewrite unit is gone from F (lost)
  // and the post-rewrite unit is new to it (invented). Both must name the
  // mechanism that accounted for them — an exemption ledger that mislabels
  // WHY bytes were excused is barely better than a silent exemption.
  assert.deepEqual(r.exemptions.map((x) => x.kind).sort(), ["invented", "lost"]);
  for (const x of r.exemptions) {
    assert.match(x.exemptReason, /fresh-session-sort:rewrite/,
      `the ${x.kind} side must credit the rewrite, not another mechanism`);
  }
});

test("CONTROL — a declared rewrite whose result is NOT in F stays a violation", () => {
  // The whole point of verifying rather than trusting: a declaration cannot
  // excuse bytes that never reached the wire.
  const before = SKILLS(["zeta", "alpha"]);
  const r = conservationViolations(entry({
    inMsgs: [{ role: "user", content: [{ type: "text", text: before }] }],
    outMsgs: [{ role: "user", content: [{ type: "text", text: "something else entirely" }] }],
    freshSessionSortStats: { relocated: [{ type: "skills" }], targetIndex: 0 },
  }), new Set());
  assert.ok(r.violations.some((v) => v.kind === "lost"),
    "declared, but the rewritten block is nowhere in the forwarded array");
});

test("CONTROL — no declaration means no exemption attempt at all", () => {
  const before = SKILLS(["zeta", "alpha"]);
  const after = rewriteBlockText("skills", before);
  const r = conservationViolations(entry({
    inMsgs: [{ role: "user", content: [{ type: "text", text: before }] }],
    outMsgs: [{ role: "user", content: [{ type: "text", text: after }] }],
  }), new Set());
  assert.ok(r.violations.some((v) => v.kind === "lost"),
    "a gate that re-derives a rewrite nobody claimed is inventing the exemption");
});

test("the gate re-derives with the PURE transform, leaving the extension's pin untouched", () => {
  // rewriteBlockText is the half of fixBlockText without pinBlockContent. A
  // checker that ran the stateful half would edit the state of the thing it
  // is checking, mid-run.
  const t = SKILLS(["zeta", "alpha"]);
  assert.equal(rewriteBlockText("skills", t), rewriteBlockText("skills", t), "pure");
  assert.equal(normalizeBlockText("x  \n</system-reminder>  "), "x\n</system-reminder>");
});

// --- fresh-session-sort's RE-SERVE after CC stops sending the block ---------
//
// DEFINITION (F-side clause (e)), written before the assertions: a forwarded
// unit CC did not send in THIS request is accounted for when the extension
// declares a re-serve AND the unit is one this gate itself verified earlier in
// the same conversation as the result of the extension's own rewrite. The
// verification is what makes it a re-serve rather than an invention — the
// bytes descend from bytes CC sent here, through a transform the gate
// re-derived and saw on the wire.
//
// Why the clause is needed at all: the relocated prefix is now held stable
// across a request in which CC sends no instance of the type (the n=331->336
// index-0 divergence). Where the block's rewrite is the identity — the mcp
// block, and the measured live case — the re-served bytes are CC's own and
// `seen` already covers them. Where it is not (skills and deferred are
// SORTED, hooks is stripped), the re-served bytes are the extension's, and
// without this clause a correct re-serve reports as invented.

test("a declared re-serve of a block verified EARLIER in the conversation is exempt", () => {
  const before = SKILLS(["zeta", "alpha"]);
  const after = rewriteBlockText("skills", before);
  const seen = new Set();
  const seenRewrites = new Set();

  // Request 1 — CC sends the block, the extension rewrites and relocates it.
  const first = conservationViolations(entry({
    inMsgs: [{ role: "user", content: [{ type: "text", text: before }] }],
    outMsgs: [{ role: "user", content: [{ type: "text", text: after }] }],
    freshSessionSortStats: { relocated: [{ type: "skills" }], reserved: [], targetIndex: 0 },
  }), seen, seenRewrites);
  assert.deepEqual(first.violations, [], "arrange: request 1 is the already-covered rewrite case");

  // Request 2 — CC sends no skills block at all; the extension serves the
  // block it relocated, so the forwarded prefix does not move.
  const second = conservationViolations(entry({
    n: 2,
    inMsgs: [{ role: "user", content: [{ type: "text", text: "just a prompt" }] }],
    outMsgs: [{ role: "user", content: [{ type: "text", text: after }, { type: "text", text: "just a prompt" }] }],
    freshSessionSortStats: { relocated: [], reserved: ["skills"], targetIndex: 0 },
  }), seen, seenRewrites);

  assert.deepEqual(second.violations, [], "the re-served block descends from bytes CC sent in this conversation");
  assert.ok(second.exemptions.some((x) => /fresh-session-sort:reserved/.test(x.exemptReason)),
    "and the ledger must name the re-serve, not the rewrite that happened in another request");
});

test("CONTROL — a re-serve with no earlier verified rewrite in this conversation is invented", () => {
  const after = rewriteBlockText("skills", SKILLS(["zeta", "alpha"]));
  const r = conservationViolations(entry({
    inMsgs: [{ role: "user", content: [{ type: "text", text: "just a prompt" }] }],
    outMsgs: [{ role: "user", content: [{ type: "text", text: after }, { type: "text", text: "just a prompt" }] }],
    freshSessionSortStats: { relocated: [], reserved: ["skills"], targetIndex: 0 },
  }), new Set(), new Set());
  assert.ok(r.violations.some((v) => v.kind === "invented"),
    "a declaration cannot excuse bytes this conversation never carried");
});

test("CONTROL — bytes verified in another conversation do not travel", () => {
  // The registry is per conversation for the same reason the extension's
  // memory is: one session-id header carries the main thread, its subagents
  // and CC's sidecars.
  const after = rewriteBlockText("skills", SKILLS(["zeta", "alpha"]));
  const otherConversation = new Set();
  conservationViolations(entry({
    inMsgs: [{ role: "user", content: [{ type: "text", text: SKILLS(["zeta", "alpha"]) }] }],
    outMsgs: [{ role: "user", content: [{ type: "text", text: after }] }],
    freshSessionSortStats: { relocated: [{ type: "skills" }], reserved: [], targetIndex: 0 },
  }), new Set(), otherConversation);

  const r = conservationViolations(entry({
    inMsgs: [{ role: "user", content: [{ type: "text", text: "just a prompt" }] }],
    outMsgs: [{ role: "user", content: [{ type: "text", text: after }, { type: "text", text: "just a prompt" }] }],
    freshSessionSortStats: { relocated: [], reserved: ["skills"], targetIndex: 0 },
  }), new Set(), new Set());
  assert.ok(r.violations.some((v) => v.kind === "invented"),
    "this conversation's registry is empty; the other one's verification is not its evidence");
});

test("CONTROL — an undeclared re-serve is invented, however plausible the bytes", () => {
  const before = SKILLS(["zeta", "alpha"]);
  const after = rewriteBlockText("skills", before);
  const seen = new Set();
  const seenRewrites = new Set();
  conservationViolations(entry({
    inMsgs: [{ role: "user", content: [{ type: "text", text: before }] }],
    outMsgs: [{ role: "user", content: [{ type: "text", text: after }] }],
    freshSessionSortStats: { relocated: [{ type: "skills" }], reserved: [], targetIndex: 0 },
  }), seen, seenRewrites);

  const r = conservationViolations(entry({
    inMsgs: [{ role: "user", content: [{ type: "text", text: "just a prompt" }] }],
    outMsgs: [{ role: "user", content: [{ type: "text", text: after }, { type: "text", text: "just a prompt" }] }],
    freshSessionSortStats: { relocated: [], reserved: [], targetIndex: 0 },
  }), seen, seenRewrites);
  assert.ok(r.violations.some((v) => v.kind === "invented"),
    "no declaration, no exemption attempt — the same discipline the rewrite clause already keeps");
});

// --- content-strip's declared removal ---------------------------------------

test("a bookkeeping reminder content-strip declares removing is exempt", () => {
  const r = conservationViolations(entry({
    inMsgs: [{ role: "user", content: [{ type: "text", text: NUDGE }] }],
    outMsgs: [{ role: "user", content: [] }],
    contentStripStats: { trailerCount: 0, reminderCount: 1 },
  }), new Set());
  assert.deepEqual(r.violations, [], "these bytes leave the wire deliberately");
  assert.match(r.exemptions[0].exemptReason, /content-strip:declared-strip/);
});

test("CONTROL — a removed block neither predicate accepts still reports lost", () => {
  const r = conservationViolations(entry({
    inMsgs: [{ role: "user", content: [{ type: "text", text: "<system-reminder>\nreal content CC sent\n</system-reminder>" }] }],
    outMsgs: [{ role: "user", content: [] }],
    contentStripStats: { trailerCount: 0, reminderCount: 1 },
  }), new Set());
  assert.ok(r.violations.some((v) => v.kind === "lost"),
    "a declaration does not cover a block content-strip would never have stripped");
});

// --- identity-normalization's anchoring -------------------------------------

test("the SessionStart rewrite fires on the hook's own block, wrapped or bare", () => {
  for (const t of ["SessionStart:resume hook success: x",
                   "<system-reminder>\nSessionStart:resume hook success: x\n</system-reminder>"]) {
    assert.ok(isSessionStartBlock(t));
    const [out, n] = normalizeSessionStartText(t);
    assert.equal(n, 1);
    assert.ok(out.includes("SessionStart:startup hook success:"));
  }
});

test("PROSE that merely quotes the marker is left alone", () => {
  // Measured on a live capture: a teammate message quoting the marker as an
  // example had its quotation silently rewritten mid-sentence. That is CC's
  // conversation content, and this extension has no business editing it.
  const prose = "Index 41 is role:\"system\", plain string `SessionStart:resume hook success: …`.";
  assert.equal(isSessionStartBlock(prose), false);
  const [out, n] = normalizeSessionStartText(prose);
  assert.equal(n, 0);
  assert.equal(out, prose, "byte-identical");
});

test("the COMPOSED case: a peeled reminder that content-strip then removes is accounted", () => {
  // smoosh-split lifts a bookkeeping reminder out of a tool_result; content-strip
  // deletes the peeled block. Each mitigation is declared and correct, and the
  // peel's own check fails on its own terms because its product is gone. Between
  // them every byte is accounted for — this is 8 of the 8 rows measured at
  // msg[6] of the triaged capture, and the only shape of the composition seen.
  const inner = "The task tools haven't been used recently. Only a gentle reminder.";
  const smooshed = { type: "tool_result", tool_use_id: "t1",
                     content: `done\n\n<system-reminder>\n${inner}\n</system-reminder>` };
  const peeledResult = { type: "tool_result", tool_use_id: "t1", content: "done" };

  const r = conservationViolations({
    n: 1, ts: "t", stats: null,
    inMsgs: [{ role: "user", content: [smooshed] }],
    // content-strip removed the peeled reminder block; only the tool_result remains.
    outMsgs: [{ role: "user", content: [peeledResult] }],
    smooshSplitStats: { peeled: 1 },
    contentStripStats: { trailerCount: 0, reminderCount: 1 },
  }, new Set());

  assert.deepEqual(r.violations, [],
    "two declared mitigations composing must not read as a dropped byte");
  assert.ok(r.exemptions.some((x) => /smoosh-split/.test(x.exemptReason)));
});

test("CONTROL — a peel product that simply vanishes, with no strip declared, still violates", () => {
  const inner = "The task tools haven't been used recently. Only a gentle reminder.";
  const smooshed = { type: "tool_result", tool_use_id: "t1",
                     content: `done\n\n<system-reminder>\n${inner}\n</system-reminder>` };
  const r = conservationViolations({
    n: 1, ts: "t", stats: null,
    inMsgs: [{ role: "user", content: [smooshed] }],
    outMsgs: [{ role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "done" }] }],
    smooshSplitStats: { peeled: 1 },
  }, new Set());
  assert.ok(r.violations.some((v) => v.kind === "lost"),
    "without content-strip's declaration the missing peel product is a real loss");
});
