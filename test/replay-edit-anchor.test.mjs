// Edit positions carry their STRUCTURAL context — where the edit sits
// relative to the last human-typed message.
//
// Why this is load-bearing and not decoration: row 4 sat "re-opened" with 15
// unexplained mid-history edits while the census could say WHAT changed and
// WHERE, but not WHY — the WHY required relating the position to conversation
// structure, and that relation lived in a throwaway matcher script until it
// produced the verdict (2026-07-29: 20 of 22 human-anchored mid-history edits
// within ±2 of the anchor — the CC#78660 reminder-anchoring mechanism). The
// throwaway probe is the tell that a check is missing; this is the check.

import { test } from "node:test";
import assert from "node:assert/strict";

import { isHumanTurn, findEditPositions } from "../tools/replay.mjs";

const text = (t) => ({ type: "text", text: t });
const human = (t = "typed by a person") => ({ role: "user", content: [text(t)] });
const reminderMsg = (t = "<system-reminder>injected</system-reminder>") => ({
  role: "user",
  content: [text(t)],
});
const toolResultMsg = () => ({
  role: "user",
  content: [{ type: "tool_result", tool_use_id: "t1", content: "r" }],
});
const asst = (t = "answer") => ({ role: "assistant", content: [text(t)] });

test("isHumanTurn: typed text yes; injections, tool_results, assistants no", () => {
  assert.equal(isHumanTurn(human()), true);
  assert.equal(isHumanTurn({ role: "user", content: "plain string" }), true);
  assert.equal(isHumanTurn({ role: "user", content: "<local-command-stdout>x</local-command-stdout>" }), false);
  assert.equal(isHumanTurn(reminderMsg()), false);
  assert.equal(isHumanTurn(toolResultMsg()), false);
  assert.equal(isHumanTurn(asst()), false);
  // tool_result carrying an injected reminder block is still not a human turn
  assert.equal(
    isHumanTurn({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "t1", content: "r" }, text("<system-reminder>note</system-reminder>")],
    }),
    false,
  );
});

test("BITE — a mid-history edit is annotated with its distance from the human anchor", () => {
  // History: [human, asst, human, asst, reminder-carrier, asst] — last human
  // turn at index 2. The reminder-carrier at index 4 gets re-stamped between
  // requests: anchorDelta must read +2 (the injected-block zone).
  const base = [human("q1"), asst("a1"), human("q2"), asst("a2"), reminderMsg("<system-reminder>v1</system-reminder>"), asst("a3")];
  const edited = base.slice();
  edited[4] = reminderMsg("<system-reminder>v2 — re-stamped</system-reminder>");
  const entry = (msgs, n) => ({ n, ts: "t", key: "k", inMsgs: msgs, outMsgs: msgs, inTools: [], outTools: [] });
  const rows = findEditPositions([entry(base, 0), entry(edited, 1)]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].at, 4);
  assert.equal(rows[0].lastHumanAt, 2);
  assert.equal(rows[0].anchorDelta, 2, "edit position relative to the anchor is the causal signal");
});

test("a conversation with no human turn reports anchorDelta null, never a guess", () => {
  // Subagent shape: briefing arrives as an injected block, so no human turn
  // exists under the filter — 11 of 33 mid-history edits in the verifying
  // corpus were this shape, and they must be reported as unanchored rather
  // than matched against an invented index.
  const base = [reminderMsg("<briefing>do the thing</briefing>"), asst("a1"), reminderMsg(), asst("a2")];
  const edited = base.slice();
  edited[2] = reminderMsg("<system-reminder>changed</system-reminder>");
  const entry = (msgs, n) => ({ n, ts: "t", key: "k", inMsgs: msgs, outMsgs: msgs, inTools: [], outTools: [] });
  const rows = findEditPositions([entry(base, 0), entry(edited, 1)]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].lastHumanAt, null);
  assert.equal(rows[0].anchorDelta, null);
});
