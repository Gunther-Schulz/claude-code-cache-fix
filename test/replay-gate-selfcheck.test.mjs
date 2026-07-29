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
  findSafetyViolations,
  findSequenceViolations,
  firstDivergence,
  censusPair,
  semanticCore,
  readCapture,
  findMitigationGaps,
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
