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

import {
  findStabilityViolations,
  findSafetyViolations,
  findSequenceViolations,
  firstDivergence,
  censusPair,
  semanticCore,
} from "../tools/replay.mjs";

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

// --- Safety gate ---

test("safety: faithful passthrough is GREEN", () => {
  const m = [user("u0"), asst("a1")];
  assert.equal(findSafetyViolations([entry(0, m, m)]).length, 0);
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

// --- Primitive ---

test("firstDivergence: prefix growth reports null, in-place change reports the index", () => {
  assert.equal(firstDivergence([1, 2], [1, 2, 3]), null);
  assert.equal(firstDivergence([1, 2, 3], [1, 9, 3]), 1);
  assert.equal(firstDivergence([], []), null);
});
