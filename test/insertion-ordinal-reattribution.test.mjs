// RED-FIRST BITE (candidate). The host-568 shape, minimized: a recurring
// standalone nudge whose MIDDLE copy is the one CC swallows.
//
// DEFINITION first (never taken from the code under test): findJoinMoves'
// own definition (insertion-normalization.mjs:759-792) says a MOVE is a
// canonical standalone entry D that leaves the wire while a new message N
// appears carrying P's pinned reminder blocks + "\n\n" + D's whole first-seen
// text, N inside D's gap. Nothing in that definition mentions how many OTHER
// messages happen to carry D's text. The claim under test is that the deployed
// matcher recognizes the move whenever the definition holds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyPinned } from "../proxy/extensions/insertion-normalization.mjs";

const HOOK_A = "t_hookA_0001_331";
const HOOK_B = "t_hookB_0002_364";
const wrap = (t) => `<system-reminder>\n${t}\n</system-reminder>`;
const NUDGE = "t_nudge_0003_421";           // the recurring harness nudge
const MERGED = `${HOOK_A}\n\n${HOOK_B}\n\n${NUDGE}`;

const user = (t) => ({ role: "user", content: [{ type: "text", text: t }] });
const asst = (t) => ({ role: "assistant", content: [{ type: "text", text: t }] });
const standalone = (t) => ({ role: "system", content: [{ type: "text", text: t }] });
const host = () => ({
  role: "user",
  content: [{ type: "text", text: "t_host_0004_120" }, { type: "text", text: wrap(HOOK_A) }, { type: "text", text: wrap(HOOK_B) }],
});
const pinCanon = (messages) => classifyPinned(messages, null).canonicalEntries;

// The wire CC sent one request earlier: TWO copies of the same nudge text.
// Copy #1 sits directly after the host; copy #2 lives later in history.
const beforeWire = [
  user("t_u0_0005_40"),
  asst("t_a0_0006_60"),
  host(),                 // 2
  standalone(NUDGE),      // 3  <- the copy CC will swallow  (family ordinal 0)
  asst("t_a1_0007_60"),   // 4
  user("t_u1_0008_40"),   // 5
  standalone(NUDGE),      // 6  <- unrelated later copy       (family ordinal 1)
  asst("t_a2_0009_60"),   // 7
];

// This request: copy #1 is gone, merged into one standalone at its own index.
const afterWire = [
  user("t_u0_0005_40"),
  asst("t_a0_0006_60"),
  { role: "user", content: [{ type: "text", text: "t_host_0004_120" }] }, // host shed both blocks
  standalone(MERGED),     // 3  <- hookA + "\n\n" + hookB + "\n\n" + nudge
  asst("t_a1_0007_60"),
  user("t_u1_0008_40"),
  standalone(NUDGE),      // 6  <- still there
  asst("t_a2_0009_60"),
  user("t_tail_0010_20"),
];

test("a swallowed MIDDLE copy of a recurring standalone is recognized as a join-move", () => {
  const canon = pinCanon(beforeWire);
  const r = classifyPinned(afterWire, canon);
  console.log("action:", r.action, "resetReason:", r.resetReason,
    "pinned:", r.pinned, "moved:", r.moved, "suppressed:", r.suppressed);
  console.log("suppressions:", JSON.stringify(r.suppressions));
  const out = r.messages ?? afterWire;
  console.log("forwarded[3] text:", JSON.stringify(out[3]?.content?.[0]?.text ?? out[3]?.content));

  assert.equal(r.moved, 1, "the move is recognized");
  assert.equal(out[3].content[0].text, NUDGE,
    "the absorbed entry's first-seen bytes are re-served into the merged slot");
  assert.notEqual(r.resetReason, "not-subsequence",
    "the ordinal shift must not invert the matched sequence");
});

test("CONTROL: with only ONE copy of the nudge, today's matcher absorbs it", () => {
  const before1 = [
    user("t_u0_0005_40"), asst("t_a0_0006_60"), host(), standalone(NUDGE),
    asst("t_a1_0007_60"), user("t_u1_0008_40"), asst("t_a2_0009_60"),
  ];
  const after1 = [
    user("t_u0_0005_40"), asst("t_a0_0006_60"),
    { role: "user", content: [{ type: "text", text: "t_host_0004_120" }] },
    standalone(MERGED),
    asst("t_a1_0007_60"), user("t_u1_0008_40"), asst("t_a2_0009_60"), user("t_tail_0010_20"),
  ];
  const r = classifyPinned(after1, pinCanon(before1));
  console.log("CONTROL action:", r.action, r.resetReason, "moved:", r.moved,
    "suppressions:", JSON.stringify(r.suppressions));
  assert.equal(r.moved, 1, "single-copy case: the deployed matcher already absorbs this");
  assert.equal((r.messages ?? after1)[3].content[0].text, NUDGE);
});
