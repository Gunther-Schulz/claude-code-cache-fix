// insertion-moved-fresh — the split `moved` argues for (BACKLOG "split
// `moved` into fresh recognitions vs re-fires", 2026-08-02).
//
// `moved` alone cannot answer the question the 660k bust (threat matrix row
// 4) needed answered: was a JOIN-MOVE freshly recognized this request, or is
// the substitution just continuing to re-fire an entry recognized earlier?
// Both increment `moved` by the same amount (1), so the field cannot tell
// them apart without reading the code. This file proves `movedFresh` /
// `movedRefires` can.
//
// The scenario is lifted from the proven building blocks in
// insertion-join-move.test.mjs (inlineLeg/standaloneLeg/afterMove/thirdLeg,
// and its "BITE — RE-FIRE" case) rather than invented fresh, since that is
// the shortest honest way to reach a real re-fire-only pair: reconstructed
// here, self-contained, because those helpers are local consts there, not
// exports.

import { test } from "node:test";
import assert from "node:assert/strict";

import { classifyPinned } from "../proxy/extensions/insertion-normalization.mjs";

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

// The STANDALONE leg: the reminder and the nudge merge into one message.
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

const thirdLeg = (msgs) => [...msgs, { role: "assistant", content: [txt("a2")] }];

// Request 1 (inline) -> request 2 (standalone): the join-move is freshly
// recognized. Request 3: the same merged form is still on the wire, and the
// substitution continues WITHOUT findJoinMoves seeing a new drop — a re-fire.
function threeRequestSequence() {
  const primed = classifyPinned(inlineLeg(), null);
  const moved = classifyPinned(standaloneLeg(), primed.canonicalEntries); // fresh
  const refired = classifyPinned(thirdLeg(standaloneLeg()), moved.canonicalEntries); // re-fire
  return { moved, refired };
}

test("BITE — a fresh join-move recognition reports movedFresh:1, movedRefires:0", () => {
  const { moved } = threeRequestSequence();
  assert.equal(moved.moved, 1, "control: this request really did recognize a move");
  assert.equal(moved.movedFresh, 1, "the recognition happened THIS request");
  assert.equal(moved.movedRefires, 0, "nothing was re-fired — there was nothing reserved yet");
});

test("BITE — RE-FIRE: a re-served entry with NO fresh recognition reports movedFresh:0, movedRefires:1 " +
     "(the exact shape `moved` alone could not express — the 660k bust's blind spot)", () => {
  const { refired } = threeRequestSequence();
  // The control this whole file exists to sharpen: today's `moved` field
  // reports the same "1" whether the request recognized a fresh move or
  // merely continued a re-fire. Both must hold for the split to mean
  // anything.
  assert.equal(refired.moved, 1, "control: `moved` alone reports the same 1 either way");
  assert.equal(refired.movedFresh, 0, "findJoinMoves recognized NOTHING new this request");
  assert.equal(refired.movedRefires, 1, "the substitution continued as a re-fire of the already-reserved entry");
});
