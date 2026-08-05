// insertion-join-move — the CROSS-MESSAGE join, and the first-seen re-serve
// that absorbs it. Sibling to insertion-suppression.test.mjs (one block moves
// out alone) and insertion-merge-suppression.test.mjs (all of ONE message's
// blocks move out together). This file covers the leg neither of those can
// match: a reminder and the WHOLE standalone message beside it leaving as one
// merged message, so the join spans TWO source messages and one of them stops
// being sent at all.
//
// Measured, threat-matrix row 4's 2026-07-30 datapoint (221k bust, session
// 0d6f38ba). Fixture flap-s-0dc8ac87c43d-86.json carries the real four requests,
// so the proof outlives the capture's rotation.
//
// The expected values below come from the DEFINITION (findJoinMoves' comment
// in the extension), not from what the code currently returns — an expectation
// with the same parentage as the implementation pins the bug it should catch.
// The definition is: an entry disappears while a new standalone appears whose
// text is exactly [the predecessor's wrapped blocks, "\n\n"-joined] + "\n\n" +
// [the disappeared entry's whole first-seen text], landing strictly inside the
// gap the disappeared entry left. That is a MOVE, not an edit: nothing was
// rewritten, so the honest response is to keep serving the first-seen bytes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { classifyPinned, findJoinMoves } from "../proxy/extensions/insertion-normalization.mjs";
import {
  findStabilityViolations,
  findSafetyViolations,
  findConservationViolations,
  findSequenceViolations,
} from "../tools/replay.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FLAP = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "harvested", "flap-s-0dc8ac87c43d-86.json"), "utf-8"),
);
// The reset leg (unit 2b). Section (d) below is the only reader.
const RESET_MOVE = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "harvested", "reset-move-s-97097e027ac0-196-197.json"), "utf-8"),
);

const REM = "PreToolUse:Edit hook additional context: check the date";
const WRAPPED = `<system-reminder>\n${REM}\n</system-reminder>`;
const NUDGE = "The task tools haven't been used recently.";

const toolUse = (id) => ({ role: "assistant", content: [{ type: "tool_use", id, name: "Edit", input: {} }] });
const toolResult = (id, extra = []) => ({
  role: "user",
  content: [{ type: "tool_result", tool_use_id: id, content: "out" }, ...extra],
});
const txt = (t) => ({ type: "text", text: t });

// The INLINE leg CC sent first: message 2 carries the reminder, message 3 is
// the standalone nudge sitting right after it.
const inlineLeg = () => [
  { role: "user", content: [txt("q1")] },
  toolUse("tu1"),
  toolResult("tu1", [txt(WRAPPED)]),
  { role: "system", content: NUDGE },
  toolUse("tu2"),
  toolResult("tu2"),
  { role: "assistant", content: [txt("a")] },
];

// The STANDALONE leg: message 2 has shed its reminder, the nudge is gone as a
// message of its own, and one merged message carries both. The trailing turn
// makes the pair ordinary growth rather than a drop-only shrink.
const standaloneLeg = (mergedText = `${REM}\n\n${NUDGE}`) => [
  { role: "user", content: [txt("q1")] },
  toolUse("tu1"),
  toolResult("tu1"),
  { role: "system", content: mergedText },
  toolUse("tu2"),
  toolResult("tu2"),
  { role: "assistant", content: [txt("a")] },
  { role: "user", content: [txt("q2")] },
];

// Prime the canonical on the inline leg, then classify the standalone leg —
// the two-request shape every one of these cases needs.
function afterInline(cur, first = inlineLeg()) {
  const primed = classifyPinned(first, null);
  return classifyPinned(cur, primed.canonicalEntries);
}

// =====================================================================
// (a) The real bytes
// =====================================================================

test("BITE — the real 2026-07-30 flap: the standalone leg is a MOVE, not an edit-shaped reset", () => {
  // Before this change the shipped extension answered reset("edit-shaped") on
  // n=104 and n=108, which un-suppressed everything and re-billed from the
  // flap index. The fixture's own _measured note records that verdict.
  const seen = [];
  let canon = null;
  for (const r of FLAP.requests) {
    const res = classifyPinned(r.messages, canon);
    seen.push({ n: r.n, action: res.action, reason: res.resetReason ?? null, moved: res.moved ?? 0, out: (res.messages ?? r.messages).length });
    canon = res.canonicalEntries;
  }
  assert.deepEqual(
    seen.map((s) => `n=${s.n} ${s.action}${s.reason ? `/${s.reason}` : ""} moved=${s.moved}`),
    [
      "n=102 reset/no-prior-canonical moved=0",
      "n=104 normalized moved=1",
      "n=105 append-only moved=0",
      "n=108 normalized moved=1",
    ],
    "no leg of the flap may answer with an edit-shaped reset",
  );
  assert.equal(seen[1].out, 97, "99 incoming, 3 suppressed, 1 re-served");
  assert.equal(seen[3].out, 99);
});

test("BITE — the real flap's forwarded bytes hold the migrating region byte-stable", () => {
  // The claim that matters to a cache: CC's own arrays diverge at the flap
  // index on every leg, and ours must not. Indices 85..94 are the migrating
  // region (fixture _legs); the forwarded region must be the INLINE form
  // throughout, which is the form this conversation already cached.
  let canon = null;
  const outs = [];
  for (const r of FLAP.requests) {
    const res = classifyPinned(r.messages, canon);
    outs.push(res.messages ?? r.messages);
    canon = res.canonicalEntries;
  }
  const region = (a) => JSON.stringify(a.slice(85, 95));
  const inline = region(FLAP.requests[0].messages);
  for (let i = 0; i < outs.length; i++) {
    assert.equal(region(outs[i]), inline, `request ${FLAP.requests[i].n} forwards the inline form of 85..94`);
  }
  // And CC's raw bytes really did move there — otherwise this asserts nothing.
  assert.notEqual(
    region(FLAP.requests[1].messages),
    inline,
    "the fixture must actually contain the migration, or the assertion above is vacuous",
  );
});

test("the real flap passes all five gates", () => {
  let canon = null;
  const entries = [];
  for (const r of FLAP.requests) {
    const res = classifyPinned(r.messages, canon);
    entries.push({
      n: r.n, ts: r.ts, key: "s-captureB",
      inMsgs: r.messages, outMsgs: res.messages ?? r.messages,
      inTools: [], outTools: [],
      action: res.action, resetReason: res.resetReason ?? null, stats: res,
    });
    canon = res.canonicalEntries;
  }
  assert.deepEqual(findStabilityViolations(entries), []);
  assert.deepEqual(findSafetyViolations(entries), []);
  assert.deepEqual(findConservationViolations(entries), []);
  assert.deepEqual(findSequenceViolations(entries), []);
  assert.deepEqual(entries.filter((e) => e.stats.canonOrderViolation).map((e) => e.n), []);
});

// =====================================================================
// (b) The definition, one condition at a time
// =====================================================================

test("the synthetic move: merged message suppressed, absorbed entry re-served in its old place", () => {
  const res = afterInline(standaloneLeg());
  assert.equal(res.action, "normalized");
  assert.equal(res.resetReason, undefined);
  assert.equal(res.moved, 1);
  assert.deepEqual(res.suppressions.map((s) => ({ index: s.index, kind: s.kind })), [{ index: 3, kind: "join-move" }]);
  assert.deepEqual(res.reserves.map((r) => r.index), [3], "re-served into the merged message's own slot");
  assert.equal(res.dropped, 0, "an entry we are still serving was not dropped");
  // The forwarded array is the inline leg again, plus the new turn.
  assert.deepEqual(res.messages, [...inlineLeg(), { role: "user", content: [txt("q2")] }]);
  // One message in, one message out: a move is a SUBSTITUTION, which is what
  // lets every downstream check stay index-free (see wireRemovedIndices).
  assert.equal(res.messages.length, standaloneLeg().length);
});

test("BITE — condition (b): only reminder-WRAPPED blocks may form the join's reminder side", () => {
  // Candidacy (47defba): the <system-reminder> wrapper is what makes a block
  // the decoration CC relocates. An ordinary sibling text block is content, and
  // a join built out of it is not this class.
  //
  // The host below carries BOTH a plain sibling and a wrapped reminder, which
  // is what isolates the condition: the entry stores a first-seen form either
  // way, so the move can only be refused because the plain block fails
  // candidacy. An earlier draft used a host with no wrapped block at all and
  // passed for the wrong reason — no stored form — leaving the predicate
  // untested; it survived the mutation that deletes candidacy.
  const first = inlineLeg();
  first[2] = toolResult("tu1", [txt("a plain sibling block"), txt(WRAPPED)]);
  const cur = standaloneLeg(`a plain sibling block\n\n${REM}\n\n${NUDGE}`);
  cur[2] = toolResult("tu1", [txt("a plain sibling block")]);
  const res = afterInline(cur, first);
  assert.equal(res.moved ?? 0, 0, "the plain sibling is not decoration, so this join is not the measured shape");

  // Control: the SAME host, joined from its wrapped block alone, IS a move —
  // otherwise the assertion above could be passing for any reason at all.
  const ok = standaloneLeg();
  ok[2] = toolResult("tu1", [txt("a plain sibling block")]);
  assert.equal(afterInline(ok, first).moved, 1);
});

test("BITE — condition (c): the constituents must join in the measured ORDER", () => {
  const res = afterInline(standaloneLeg(`${NUDGE}\n\n${REM}`));
  assert.equal(res.moved ?? 0, 0, "reminder first, absorbed standalone second — the one measured order");
});

test("BITE — condition (c): only the measured separator counts", () => {
  const res = afterInline(standaloneLeg(`${REM}\n${NUDGE}`));
  assert.equal(res.moved ?? 0, 0, "a single newline is a different, unobserved grammar");
});

test("BITE — condition (c): a SUBSET join is not a move", () => {
  // Suppressing on a partial match would drop whatever the merged message
  // carries beyond the part we recognised.
  const res = afterInline(standaloneLeg(`${REM}\n\n${NUDGE} plus content nobody has seen before`));
  assert.equal(res.moved ?? 0, 0);
});

test("BITE — condition (d): a merged message OUTSIDE the vacated gap is not a move", () => {
  // Co-location is the same discriminator the edit-shaped test uses: only a
  // message landing where the absorbed entry sat can be that entry's
  // repackaging. Here the merged text arrives after the tool pair instead.
  const cur = [
    { role: "user", content: [txt("q1")] },
    toolUse("tu1"),
    toolResult("tu1"),
    toolUse("tu2"),
    toolResult("tu2"),
    { role: "system", content: `${REM}\n\n${NUDGE}` },
    { role: "assistant", content: [txt("a")] },
    { role: "user", content: [txt("q2")] },
  ];
  const res = afterInline(cur);
  assert.equal(res.moved ?? 0, 0);
});

test("BITE — condition (e): a merged message with no surviving successor is not a move", () => {
  // The gap a move lands in must be BOUNDED. With nothing surviving after the
  // absorbed entry the gap runs to the end of the array, so any later message
  // could be matched to it — and the merged message is then at or beyond the
  // tail, where suppressing it would leave the request not ending on the
  // message CC sent last (three real 400s).
  //
  // The conversation here is the inline leg TRUNCATED to end on the standalone,
  // so exactly ONE entry disappears. An earlier draft reused the full inline
  // leg, which dropped four of seven entries and therefore reset with
  // `dropped-majority` long before this condition was consulted — it passed
  // while testing nothing, and survived the mutation that deletes the bound.
  const first = [
    { role: "user", content: [txt("q1")] },
    toolUse("tu1"),
    toolResult("tu1", [txt(WRAPPED)]),
    { role: "system", content: NUDGE },
  ];
  const cur = [
    { role: "user", content: [txt("q1")] },
    toolUse("tu1"),
    toolResult("tu1"),
    { role: "system", content: `${REM}\n\n${NUDGE}` },
  ];
  const res = afterInline(cur, first);
  assert.equal(res.moved ?? 0, 0, "an unbounded gap is not a gap");
  const forwarded = res.messages ?? cur;
  assert.deepEqual(
    forwarded[forwarded.length - 1],
    cur[cur.length - 1],
    "the request's final message reaches the model — stripping it is the 400",
  );
});

test("BITE — condition (a): an absorbed entry with no stored first-seen form is not a move", () => {
  // We can only re-serve what we kept. findJoinMoves is called directly here
  // because the condition is about canonical CONTENT, and the shortest honest
  // way to state it is to hand it an entry whose `m` was never stored.
  const messages = standaloneLeg();
  const primed = classifyPinned(inlineLeg(), null);
  const stripped = primed.canonicalEntries.map((e) => (e.r === "system" ? { h: e.h, r: e.r, o: e.o } : e));
  const withM = findJoinMoves({
    messages,
    priorCanonical: primed.canonicalEntries,
    matched: [{ ci: 2, idx: 2 }, { ci: 4, idx: 4 }],
    droppedNow: new Set([3]),
    newEntries: [{ index: 3, r: "system" }],
  });
  const withoutM = findJoinMoves({
    messages,
    priorCanonical: stripped,
    matched: [{ ci: 2, idx: 2 }, { ci: 4, idx: 4 }],
    droppedNow: new Set([3]),
    newEntries: [{ index: 3, r: "system" }],
  });
  assert.equal(withM.length, 1, "the control: with the stored form it IS a move");
  assert.equal(withoutM.length, 0);
});

// =====================================================================
// (c) Fires-on-a-non-defect
// =====================================================================

test("a genuine mid-history EDIT still takes the edit-shaped reset", () => {
  // The discriminator this change moves in front of must not swallow the class
  // it was guarding. CC really replaced the standalone's content here; there is
  // no join, so nothing is recognised and the reset stands.
  const cur = standaloneLeg("a completely different instruction CC substituted");
  const res = afterInline(cur);
  assert.equal(res.action, "reset");
  assert.equal(res.resetReason, "edit-shaped");
});

test("traffic with no migration at all is byte-for-byte today's behaviour", () => {
  // Plain tail growth over the inline leg: no drop, no join, no move, and the
  // forwarded array is the incoming one.
  const cur = [...inlineLeg(), { role: "user", content: [txt("q2")] }];
  const res = afterInline(cur);
  assert.equal(res.action, "append-only");
  assert.equal(res.moved ?? 0, 0);
  assert.deepEqual(res.reserves, []);
  assert.deepEqual(res.messages, cur);
});

test("BITE — a move stays safe when a LATER extension injects into the forwarded array", () => {
  // The regression guard for the tap-point failure this design was rebuilt to
  // avoid. deferred-tool-rewrite (order 425) inserts its tool_addition
  // announcement after insertion-normalization (order 395) has finished, so
  // any outgoing index this extension reports is stale by the time a gate
  // reads the final array. Measured on capture s-captureB n=104: a recorded
  // outIndex of 89 addressed the re-served system message here and a
  // `user [tool_result, tool_result, text]` in the final array — 98 safety
  // violations, every one of them the instrument.
  //
  // A substitution needs no index to travel, so the gate must stay clean with
  // an injection sitting anywhere ahead of the move.
  const first = inlineLeg();
  const cur = standaloneLeg();
  const primed = classifyPinned(first, null);
  const res = classifyPinned(cur, primed.canonicalEntries);
  const injection = { role: "system", content: [{ type: "tool_addition", tool: { type: "tool_reference", name: "WebFetch" } }] };
  const forwarded = [...res.messages];
  forwarded.splice(1, 0, injection); // a later extension, inserting BEFORE the move

  const entries = [
    { n: 0, ts: "t0", key: "k", inMsgs: first, outMsgs: first, inTools: [], outTools: [], stats: primed },
    { n: 1, ts: "t1", key: "k", inMsgs: cur, outMsgs: forwarded, inTools: [], outTools: [], stats: res },
  ];
  assert.equal(res.moved, 1, "the control: this pair really is a move");
  assert.deepEqual(findSafetyViolations(entries), []);
  assert.deepEqual(findConservationViolations(entries), []);
});

// =====================================================================
// (d) Moves survive resets — unit 2b
// =====================================================================
//
// DEFINITION, written before the assertions below (dev-loop "Adding a check").
// A reset abandons this extension's ORDER model: it stops claiming to know
// where the canonical entries sit relative to the incoming wire. It does NOT
// abandon the CONTENT substitutions the extension is already making — the
// bytes forwarded for a message must not change merely because the order
// model reset, because a cache keys on the longest identical PREFIX and a
// substitution that stops being applied moves the divergence earlier than
// anything CC did.
//
// Threat-matrix row 22 established exactly this for pins (a reset that
// dropped them cost 19 messages; test/insertion-normalization.test.mjs,
// "a reset still forwards PINNED bytes for surviving identities"). A
// recognized MOVE is the same kind of substitution seen one mechanism over:
// the merged message's slot carries the absorbed entry's first-seen bytes,
// one message in and one message out. So the same rule binds it.
//
// Measured cost of getting it wrong, capture s-captureC (commit 0ebbd8a's
// KNOWN DEFECT note): three otherwise-clean captures reported byte-stability
// violations, all attributed to insertion-normalization and all carrying
// `[CC bytes at outDiv IDENTICAL -> ours]`. Fixture
// reset-move-s-97097e027ac0-196-197.json freezes the pair before the capture
// rotates.

// Replay a fixture's requests in order through classifyPinned, returning the
// gate-entry shape the five gates read. Same loop the fixture tests above use.
function replayFixture(fixture, key) {
  let canon = null;
  const entries = [];
  for (const r of fixture.requests) {
    const res = classifyPinned(r.messages, canon);
    entries.push({
      n: r.n, ts: r.ts, key,
      inMsgs: r.messages, outMsgs: res.messages ?? r.messages,
      inTools: [], outTools: [],
      action: res.action, resetReason: res.resetReason ?? null, stats: res,
    });
    canon = res.canonicalEntries;
  }
  return entries;
}

// The three tests below were TODO from unit 2b until the reserved-entry
// identity build (docs/directives/reserved-entry-identity-directive.md):
// the absorbed entry's identity was (content-hash, role, occurrence-ordinal),
// and by n=197 CC has sent one MORE copy of that entry's text, which took the
// ordinal and re-bound the entry to a message 13 slots away — no move to
// recognize, and a not-subsequence reset as the SYMPTOM (history in the
// fixture's `_mechanism` note). A reserved entry now claims no ordinal in
// CC's array, so the tests assert the criterion directly. The first one's
// original control asserted the reset itself — the symptom's signature — and
// expired with the defect; its control now asserts what the directive
// defines: n=197 must not reset.
test("the n=197 leg: one MORE copy of the reserved text neither re-binds nor resets, and the re-served bytes hold", () => {
  // The fixture's own _measured note records the pre-2b verdict: n=197 came
  // back moved=0 and the forwarded bytes at wire index 223 flipped from the
  // re-served first-seen form back to CC's raw merge, one violation at
  // inDiv=233 / outDiv=223 — an output divergence ten messages earlier than
  // CC's own.
  const entries = replayFixture(RESET_MOVE, "s-captureC");
  const at = (n) => entries.find((e) => e.n === n);

  // The control: the requests before recognize the move, or the assertions
  // below are about nothing.
  assert.equal(at(195).stats.moved, 1, "control: 195 recognizes the move");
  assert.equal(at(196).stats.moved, 1, "control: 196 recognizes the move");

  assert.equal(at(197).action, "normalized", "197 no longer resets: a reserved entry claims no ordinal in CC's array");
  assert.equal(at(197).resetReason ?? null, null, "no reset reason — the inversion that tripped not-subsequence cannot form");
  assert.equal(at(197).stats.moved, 1, "the substitution continues as a re-fire");

  // The property that costs cache, stated positionally: the bytes at the
  // merged message's slot are the ones we forwarded on the previous request.
  assert.deepEqual(
    at(197).outMsgs[223],
    at(196).outMsgs[223],
    "the re-served first-seen bytes must not flip back to CC's raw merge",
  );
  assert.equal(at(197).outMsgs.length, at(197).inMsgs.length, "substitution: one in, one out");

  assert.deepEqual(findStabilityViolations(entries), []);
});

test("the canonical describes the wire we forwarded, so n=198 still sees the move", () => {
  // Separate condition, separate assertion. Both rebuild sites state the
  // invariant themselves: the canonical they write must describe the array
  // just sent. n=197 sent the absorbed entry's bytes at the merged message's
  // slot, so the canonical must carry THAT entry there — not a fresh identity
  // built from the merge. Get this half wrong and the substitution survives
  // exactly one request: the merge becomes canonical, the absorbed entry is
  // gone for good, and the flip lands one request later.
  const entries = replayFixture(RESET_MOVE, "s-captureC");
  const at = (n) => entries.find((e) => e.n === n);
  assert.equal(at(198).stats.moved, 1, "the move is still live on the request after");
  assert.deepEqual(
    at(198).outMsgs[223],
    at(197).outMsgs[223],
    "and the same first-seen bytes are still what we forward",
  );
});

test("the n=197 leg passes all five gates", () => {
  const entries = replayFixture(RESET_MOVE, "s-captureC");
  assert.deepEqual(findStabilityViolations(entries), []);
  assert.deepEqual(findSafetyViolations(entries), []);
  assert.deepEqual(findConservationViolations(entries), []);
  assert.deepEqual(findSequenceViolations(entries), []);
  assert.deepEqual(entries.filter((e) => e.stats.canonOrderViolation).map((e) => e.n), []);
});

test("the n=197 leg corrupts nothing — safety, conservation, sequence and canonical order are clean", () => {
  // The four gates that held even while the stability defect was open,
  // asserted independently of it: whatever stability costs in cache, the
  // conversation itself must stay intact and every byte CC sent must stay
  // accounted for. This half of the fixture's verdict must never regress.
  const entries = replayFixture(RESET_MOVE, "s-captureC");
  assert.deepEqual(findSafetyViolations(entries), []);
  assert.deepEqual(findConservationViolations(entries), []);
  assert.deepEqual(findSequenceViolations(entries), []);
  assert.deepEqual(entries.filter((e) => e.stats.canonOrderViolation).map((e) => e.n), []);
  // And the move really is recognized on the legs before, which is what makes
  // the tests above statements about n=197 and not about the fixture.
  assert.equal(entries.find((e) => e.n === 196).stats.moved, 1);
});

// The synthetic reset: the inline leg's order scrambled so `matched` is no
// longer a subsequence, with the move's own neighbourhood left intact. The
// trailing assistant turn moves up to index 1, which inverts one matched pair
// far from the join and forces not-subsequence without disturbing indices
// 3..5. messages[0] deliberately stays put: the gates group by conversation,
// and a conversation's identity is its first message's hash — changing it
// puts the pair in two groups and every re-served byte then reads as
// "invented". (Observed while writing this: the first draft hoisted the
// assistant turn to index 0 and the conservation gate reported two inventions
// that were the harness, not the code.)
const scrambledMoveLeg = (mergedText = `${REM}\n\n${NUDGE}`) => [
  { role: "user", content: [txt("q1")] },
  { role: "assistant", content: [txt("a")] },
  toolUse("tu1"),
  toolResult("tu1"),
  { role: "system", content: mergedText },
  toolUse("tu2"),
  toolResult("tu2"),
  { role: "user", content: [txt("q2")] },
];

test("BITE — a not-subsequence reset with a move in it re-serves the first-seen form", () => {
  const cur = scrambledMoveLeg();
  const res = afterInline(cur);
  assert.equal(res.action, "reset", "control: the scramble really does reset");
  assert.equal(res.resetReason, "not-subsequence");
  assert.equal(res.moved, 1);
  assert.ok(res.messages, "a reset carrying a substitution must return an array");
  assert.deepEqual(
    res.messages[4],
    { role: "system", content: NUDGE },
    "the merged message's slot carries the absorbed entry's first-seen bytes",
  );
  // Slot-preserving, the pin argument verbatim: never adds, drops or reorders.
  assert.equal(res.messages.length, cur.length);
  assert.deepEqual(res.messages.map((m) => m.role), cur.map((m) => m.role));
});

test("BITE — the reset's canonical files the ABSORBED entry at the moved slot, so the move survives into the next request", () => {
  // The second half of the change — one the real-bytes fixture no longer
  // reaches, since n=197 stopped resetting once reserved entries left wire
  // identity; the synthetic scramble keeps it covered. resetKeepingPins states the
  // invariant itself: the canonical it writes must describe the array it just
  // sent. It sent the absorbed entry's bytes at the merged message's slot, so
  // that is what belongs there. File a fresh identity built from the MERGE
  // instead and the substitution lasts exactly one request — the merge becomes
  // canonical, the absorbed entry is gone, and the next request forwards the
  // merge raw.
  const primed = classifyPinned(inlineLeg(), null);
  const scrambled = scrambledMoveLeg();
  const reset = classifyPinned(scrambled, primed.canonicalEntries);
  assert.equal(reset.moved, 1, "control: the reset leg recognized the move");

  // The conversation carries on in the order the reset just saw, plus a turn.
  const next = [...scrambled, { role: "user", content: [txt("q3")] }];
  const res = classifyPinned(next, reset.canonicalEntries);
  assert.equal(res.moved, 1, "the absorbed entry is still in the canonical to be re-served");
  assert.deepEqual(
    res.messages[4],
    { role: "system", content: NUDGE },
    "and the same first-seen bytes go out again — no flip on the request after a reset",
  );
});

test("BITE — a reset's move is DECLARED, not merely performed: the gates read it off the stats", () => {
  // A substitution the instruments cannot see reads as our bug. The
  // conservation gate accounts a merged message's bytes only when the
  // suppression is declared (`stats.suppressions`, kind "join-move") — it
  // then looks for the join across the forwarded neighbours; undeclared, the
  // merged bytes are simply "present in CC's request and in no forwarded
  // message". The safety gate reads the same list to know this suppression
  // KEEPS its slot rather than shifting the index space. Both were built for
  // the success path; a reset that substitutes without declaring is the
  // instrument going blind on a path it already covers.
  const first = inlineLeg();
  const cur = scrambledMoveLeg();
  const primed = classifyPinned(first, null);
  const res = classifyPinned(cur, primed.canonicalEntries);
  assert.equal(res.moved, 1, "control: the reset leg really did substitute");
  assert.deepEqual(
    res.suppressions.map((s) => ({ index: s.index, kind: s.kind })),
    [{ index: 4, kind: "join-move" }],
    "the merged message's slot is declared, with the kind that keeps it in the index space",
  );
  assert.deepEqual(res.reserves.map((r) => r.index), [4]);

  const entries = [
    { n: 0, ts: "t0", key: "k", inMsgs: first, outMsgs: first, inTools: [], outTools: [], stats: primed },
    { n: 1, ts: "t1", key: "k", inMsgs: cur, outMsgs: res.messages, inTools: [], outTools: [], stats: res },
  ];
  assert.deepEqual(findConservationViolations(entries), []);
  assert.deepEqual(findSafetyViolations(entries), []);
});

test("BITE — a reset carrying ONLY a move still returns its array", () => {
  // Every reset returns `messages` conditionally, and before this change the
  // condition was "a pin was applied". A move is the second reason the array
  // can differ from what CC sent, and a caller that gets no array forwards the
  // raw one — the substitution is performed and then thrown away.
  //
  // Isolating it needs a reset where the move fires and no pin does: here CC
  // keeps the reminder inline on its host AND sends the merged standalone, so
  // the host's first-seen form is byte-identical to what arrived and nothing
  // is pinned.
  const first = inlineLeg();
  const cur = [
    { role: "user", content: [txt("q1")] },
    { role: "assistant", content: [txt("a")] },
    toolUse("tu1"),
    toolResult("tu1", [txt(WRAPPED)]),
    { role: "system", content: `${REM}\n\n${NUDGE}` },
    toolUse("tu2"),
    toolResult("tu2"),
    { role: "user", content: [txt("q2")] },
  ];
  const res = classifyPinned(cur, classifyPinned(first, null).canonicalEntries);
  assert.equal(res.action, "reset");
  assert.equal(res.pinned, 0, "the isolating condition: no pin applies here");
  assert.equal(res.moved, 1);
  assert.ok(res.messages, "a reset whose only change is a move must still carry its array");
  assert.deepEqual(res.messages[4], { role: "system", content: NUDGE });
});

test("BITE — fail-closed: when the scramble collapses the gap bounds, no move is recognized", () => {
  // The safety argument for running recognition on the reset path at all.
  // Condition (d) bounds the merged message by its matched NEIGHBOURS' wire
  // indices; in a request where those neighbours have themselves inverted,
  // the bounds cross and nothing can sit inside them. Recognition must then
  // decline and the raw bytes must go out — today's behaviour, unchanged.
  // Here the tu2 pair is hoisted ahead of the tu1 pair, so the successor's
  // wire index falls BELOW the predecessor's.
  const cur = [
    { role: "user", content: [txt("q1")] },
    toolUse("tu2"),
    toolResult("tu2"),
    toolUse("tu1"),
    toolResult("tu1"),
    { role: "system", content: `${REM}\n\n${NUDGE}` },
    { role: "assistant", content: [txt("a")] },
    { role: "user", content: [txt("q2")] },
  ];
  const res = afterInline(cur);
  assert.equal(res.action, "reset");
  assert.equal(res.moved ?? 0, 0, "crossed bounds are not a gap");
  assert.deepEqual(
    (res.messages ?? cur)[5],
    cur[5],
    "the merged message is forwarded raw — the reset path's existing behaviour",
  );
});

test("a reset with no move in it forwards exactly what it forwarded before (fires-on-a-non-defect)", () => {
  // Same scramble, but the merged text uses an unobserved separator, so
  // recognition declines on condition (c) rather than on the reset. Nothing
  // about the reset path may change for traffic that has no move in it.
  const cur = scrambledMoveLeg(`${REM}\n${NUDGE}`);
  const res = afterInline(cur);
  assert.equal(res.action, "reset");
  assert.equal(res.resetReason, "not-subsequence");
  assert.equal(res.moved ?? 0, 0);
  assert.deepEqual((res.messages ?? cur)[4], cur[4]);
});

// =====================================================================
// (e) Reserved-entry identity — a re-served entry leaves the wire-identity
//     space (docs/directives/reserved-entry-identity-directive.md)
// =====================================================================
//
// DEFINITION, written from the directive before any of it was implemented.
//
// A recognized move keeps an entry ALIVE in our canonical that CC has stopped
// sending. Its stored key is (content-hash, role, occurrence-ordinal-within-
// the-request) — an ordinal is a claim about CC's array, and the entry is not
// in CC's array. So the claim is false the moment CC sends one MORE copy of
// that recurring text: the copy takes the ordinal, the entry binds to it at an
// unrelated position, the move recognition dies (the entry is no longer
// dropped) and the inversion trips not-subsequence. Measured on
// reset-move-s-97097e027ac0-196-197.json at n=197 and again at n=400.
//
// THE RULE: a re-served entry's identity is its stored first-seen bytes plus
// the canonical slot where we last forwarded them. It does not participate in
// (hash, role, ordinal) wire matching AT ALL. Marked `rs: true` at the mint.
//
//   MINT            a recognized move files the absorbed entry at the merged
//                   message's slot with `rs: true`. The reminder-carrying
//                   predecessor P is matched normally and is never flagged.
//   MATCH EXCLUSION an `rs` entry is neither looked up in the incoming
//                   identity map nor counted as dropped. A fresh copy of the
//                   same text therefore matches nothing and classifies as a
//                   new entry — no re-bind, no inversion, no reset.
//   DISPOSITION     per request, one of three, checked in this order, over the
//                   neighbourhood (lo, hi) = the wire indices of the nearest
//                   preceding and following live MATCHED canonical entries:
//                     1 RE-FIRE  a wire message strictly inside carries the
//                                merged form -> substitute the stored bytes
//                                into that slot, declare `join-move`, keep rs.
//                     2 RECLAIM  a wire message strictly inside carries D's
//                                whole first-seen text -> clear rs, bind D to
//                                that index as an ordinary matched entry, and
//                                REWRITE its stored key from that message's
//                                incoming identity.
//                     3 LAPSE    neighbourhood resolvable, neither form
//                                present -> the entry is not carried into the
//                                rebuilt canonical. Never re-serve into a
//                                context that no longer carries the region.
//                   Bounds unresolvable or crossed -> the pass does NOTHING
//                   for this entry this request: no substitution, no state
//                   change, raw forward. Fail-closed.
//   ROLE (f)        the merged wire message's role and the absorbed entry's
//                   stored role must both be "system" — the only measured
//                   shape. Applies at the mint and to both probes.

// The canonical after ONE recognized move: the absorbed NUDGE entry is filed
// at the merged message's slot, marked reserved.
const afterMove = () => {
  const primed = classifyPinned(inlineLeg(), null);
  return classifyPinned(standaloneLeg(), primed.canonicalEntries);
};
const reservedIn = (entries) => (entries ?? []).filter((e) => e.rs);
// "First-seen bytes" means exactly what CC sent the first time — the message
// object at index 3 of the inline leg, shape and all. Naming it from the leg
// rather than re-typing a literal keeps the expectation parented on the
// definition instead of on whatever the pin happens to store.
const FIRST_SEEN = inlineLeg()[3];
// Request 3 shapes. Each keeps a growth tail so the pair is never a drop-only
// shrink, and none disturbs indices 0..3 unless the case says so.
const thirdLeg = (msgs) => [...msgs, { role: "assistant", content: [txt("a2")] }];

test("BITE — MINT: a recognized move files the absorbed entry with rs:true, and P is never flagged", () => {
  const moved = afterMove();
  assert.equal(moved.moved, 1, "control: this really is a recognized move");
  const reserved = reservedIn(moved.canonicalEntries);
  assert.equal(reserved.length, 1, "exactly one entry is reserved — the absorbed one");
  assert.deepEqual(reserved[0].m, FIRST_SEEN,
    "and it carries the absorbed entry's first-seen bytes, not the merge's");
  assert.equal(moved.canonicalEntries[3].rs, true, "filed at the merged message's SLOT");
  assert.ok(!moved.canonicalEntries[2].rs, "P — the reminder-carrying predecessor — is matched normally");
});

test("BITE — MATCH EXCLUSION: one MORE copy of the reserved text does not re-bind it", () => {
  // THE MEASURED DEFECT, in miniature. n=197's eighth copy of a recurring
  // nudge took the ordinal the reserved entry's key claimed, bound it 13 slots
  // away, and tripped not-subsequence. The copy here sits at the TAIL, well
  // outside the reserved entry's neighbourhood, so nothing about it is a
  // reclaim — it is an unrelated recurrence and must classify as a new entry.
  const moved = afterMove();
  const cur = thirdLeg([...standaloneLeg(), { role: "system", content: NUDGE }]);
  const res = classifyPinned(cur, moved.canonicalEntries);

  assert.notEqual(res.action, "reset", "the re-bind is what caused the reset; excluded, there is none");
  assert.equal(res.moved, 1, "and the re-serve survives the extra copy");
  assert.deepEqual(res.messages[3], FIRST_SEEN,
    "the merged slot still carries the first-seen bytes");
  assert.equal(reservedIn(res.canonicalEntries).length, 1, "still exactly one reserved entry");
});

test("BITE — RE-FIRE: the merged form still on the wire re-serves the stored bytes, declared", () => {
  const moved = afterMove();
  const cur = thirdLeg(standaloneLeg());
  const res = classifyPinned(cur, moved.canonicalEntries);

  assert.equal(res.moved, 1, "the disposition pass re-fires without findJoinMoves seeing a drop");
  assert.deepEqual(res.messages[3], FIRST_SEEN);
  assert.equal(res.messages.length, cur.length, "substitution: one message in, one out");
  const decl = (res.suppressions ?? []).filter((s) => s.kind === "join-move");
  assert.deepEqual(decl.map((s) => s.index), [3], "DECLARED — the gates read the join off this array");
  assert.deepEqual((res.reserves ?? []).map((r) => r.index), [3]);
  assert.equal(res.canonicalEntries[3].rs, true, "and stays reserved, so the next request can re-fire too");
});

test("BITE — RECLAIM: CC flips back to the original form, so the entry rejoins wire identity", () => {
  // The oscillation leg. The standalone nudge is on the wire again, strictly
  // inside the neighbourhood, carrying exactly the reserved entry's first-seen
  // text. That is not new content and not a move — it is the entry itself,
  // back. It must stop being reserved and its stored key must be rewritten
  // from THIS message's incoming identity, or the next request's absolute
  // lookup misses it and the whole cycle restarts.
  const moved = afterMove();
  const cur = thirdLeg(inlineLeg());
  const res = classifyPinned(cur, moved.canonicalEntries);

  assert.equal(reservedIn(res.canonicalEntries).length, 0, "rs cleared");
  assert.deepEqual(res.messages ?? cur, cur, "CC's own bytes go out — nothing to substitute");
  const at3 = res.canonicalEntries[3];
  assert.deepEqual(at3.m, FIRST_SEEN, "same entry, same stored bytes");

  // What separates a RECLAIM from a LAPSE that happens to be followed by a
  // fresh entry with the same bytes — and the two are otherwise
  // indistinguishable in this shape, which is how the first draft of this bite
  // survived the mutation that deleted the reclaim. The entry BINDS: it is an
  // ordinary matched entry, so the message at that index is not an insertion
  // and the request is a plain tail append. Under a lapse it would be a new
  // spliced entry mid-history and the request would classify as normalized.
  assert.equal(res.inserted, 1, "only the tail turn is new — the reclaimed message is MATCHED");
  assert.equal(res.action, "append-only", "nothing was spliced, nothing substituted");

  // The key really is the incoming one: a FOURTH request with the same shape
  // matches it absolutely, with no disposition pass involved.
  const res2 = classifyPinned(thirdLeg(inlineLeg()), res.canonicalEntries);
  assert.notEqual(res2.action, "reset");
  assert.equal(res2.moved ?? 0, 0, "no re-serve — the entry is an ordinary matched entry now");
  assert.equal(res2.dropped ?? 0, 0, "and it is not dropped either: it matched");
});

test("BITE — LAPSE: the region is gone, so the entry is dropped rather than re-served", () => {
  // Fails CLOSED in the direction that matters for the threat model: never
  // re-serve stored bytes into a context CC has pruned or edited away.
  const moved = afterMove();
  const cur = thirdLeg(standaloneLeg("something else entirely"));
  const res = classifyPinned(cur, moved.canonicalEntries);

  assert.equal(res.moved ?? 0, 0, "no re-serve");
  assert.deepEqual((res.messages ?? cur)[3], cur[3], "CC's own bytes at the slot, untouched");
  assert.equal(reservedIn(res.canonicalEntries).length, 0, "the entry is not carried forward");
});

test("BITE — FAIL-CLOSED: an unresolvable neighbourhood changes nothing at all", () => {
  // The successor bound cannot be resolved: everything after the merged
  // message is gone, so there is no following matched canonical entry. The
  // directive's rule is NOTHING — no substitution AND no state change, so the
  // entry survives, still reserved, for a request that can resolve it.
  const moved = afterMove();
  const cur = [
    { role: "user", content: [txt("q1")] },
    toolUse("tu1"),
    toolResult("tu1"),
    { role: "system", content: `${REM}\n\n${NUDGE}` },
  ];
  const res = classifyPinned(cur, moved.canonicalEntries);

  assert.equal(res.moved ?? 0, 0, "no substitution");
  assert.deepEqual((res.messages ?? cur)[3], cur[3], "the merged message is forwarded RAW");
  assert.equal(reservedIn(res.canonicalEntries).length, 1, "and no state change: still reserved");
});

test("BITE — role (f): a merged message in a non-system role is not a move", () => {
  const primed = classifyPinned(inlineLeg(), null);
  const cur = standaloneLeg().map((m, i) =>
    i === 3 ? { role: "developer", content: `${REM}\n\n${NUDGE}` } : m);
  const res = classifyPinned(cur, primed.canonicalEntries);
  assert.equal(res.moved ?? 0, 0, "the only measured shape is system -> system");
  assert.equal(reservedIn(res.canonicalEntries).length, 0);
});

test("BITE — role (f): an absorbed entry whose stored role is not system is not a move", () => {
  const first = inlineLeg().map((m, i) =>
    i === 3 ? { role: "developer", content: NUDGE } : m);
  const primed = classifyPinned(first, null);
  const res = classifyPinned(standaloneLeg(), primed.canonicalEntries);
  assert.equal(res.moved ?? 0, 0);
  assert.equal(reservedIn(res.canonicalEntries).length, 0);
});

test("BITE — role (f): a non-system candidate inside the gap is neither a re-fire nor a reclaim", () => {
  const moved = afterMove();
  const cur = thirdLeg(standaloneLeg()).map((m, i) =>
    i === 3 ? { role: "developer", content: `${REM}\n\n${NUDGE}` } : m);
  const res = classifyPinned(cur, moved.canonicalEntries);
  assert.equal(res.moved ?? 0, 0, "the probes carry the same role constraint as the mint");
  assert.deepEqual((res.messages ?? cur)[3], cur[3], "raw bytes out");
});

test("a reserved entry never reports as dropped, and never as a canonical-order violation", () => {
  // Two counters that read the canonical. `dropped` is a claim about CC's
  // array and a reserved entry is not in it — reporting one would show a prune
  // that did not happen. `canonOrderViolation` maps canonical entries to wire
  // indices BY KEY, and a reserved entry's key is explicitly no longer
  // load-bearing, so a stale key that happens to collide must not be read as
  // our state model drifting.
  const moved = afterMove();
  const cur = thirdLeg([...standaloneLeg(), { role: "system", content: NUDGE }]);
  const res = classifyPinned(cur, moved.canonicalEntries);
  assert.equal(res.dropped ?? 0, 0);
  assert.equal(res.canonOrderViolation, null);
});

test("traffic that never recognized a move is byte-for-byte today's behaviour (fires-on-a-non-defect)", () => {
  // The disposition pass must be invisible where there is nothing reserved.
  const primed = classifyPinned(inlineLeg(), null);
  assert.equal(reservedIn(primed.canonicalEntries).length, 0);
  const grown = thirdLeg(inlineLeg());
  const res = classifyPinned(grown, primed.canonicalEntries);
  assert.equal(res.action, "append-only");
  assert.equal(res.moved ?? 0, 0);
  assert.deepEqual(res.messages, grown);
});
