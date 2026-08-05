// insertion-container-reserve — the re-serve follows the WIRE's container,
// not the container that was stored.
//
// Measured: threat-matrix "Row 4 datapoint — 2026-08-05", the 349k bust. CC
// first sent a `role:"system"` harness message as `content:[{type:"text",…}]`
// carrying a `cache_control` breakpoint (n=194), then as a bare STRING for 26
// consecutive requests (n=195..220). At n=221 a join-move fired and the
// canonical re-served its FIRST-SEEN bytes — the array — into a slot the wire
// had been sending as a string since n=195. Right text, right index, stale
// envelope: forwarded[360] differed by 25 bytes of block-array JSON and nothing else,
// and a wrong container diverges a cache prefix exactly as much as wrong bytes.
//
// The expectations here come from the DEFINITION, not from what the code
// returns: the re-serve exists to keep bytes the model has already cached
// stable, so it must emit the form the conversation is currently carrying.
// Identity is already container-blind (canonicalMessageShape treats a bare
// string and a single text block as the same message, which is why the entry
// matched across the flip at all) — only the forwarded bytes were not.
//
// Scope, deliberately narrow: the standalone-carrier shape (role not
// user/assistant, one text block) flipping between string and single-block
// array. Anything else — a multi-block message, a role change, a container
// change that also changes text — is NOT this class and must fail closed to
// the stored form.

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

// The standalone carrier, in each of the two containers CC uses for it.
const carrierArrayWithMarker = () => ({
  role: "system",
  content: [{ type: "text", text: NUDGE, cache_control: { type: "ephemeral", ttl: "1h" } }],
});
const carrierString = () => ({ role: "system", content: NUDGE });
const carrierArrayPlain = () => ({ role: "system", content: [txt(NUDGE)] });

// Leg 1: the reminder sits inline in the tool_result and the carrier is its
// own message — the form the canonical stores.
const inlineLeg = (carrier) => [
  { role: "user", content: [txt("q1")] },
  toolUse("tu1"),
  toolResult("tu1", [txt(WRAPPED)]),
  carrier,
  toolUse("tu2"),
  toolResult("tu2"),
  { role: "assistant", content: [txt("a")] },
];

// Leg 2: the join — the reminder has left the tool_result and the carrier is
// gone as a message of its own; one merged message carries both texts. This is
// where the re-serve fires.
const joinedLeg = () => [
  { role: "user", content: [txt("q1")] },
  toolUse("tu1"),
  toolResult("tu1"),
  { role: "system", content: `${REM}\n\n${NUDGE}` },
  toolUse("tu2"),
  toolResult("tu2"),
  { role: "assistant", content: [txt("a")] },
  { role: "user", content: [txt("q2")] },
];

// Drive the measured three-request sequence: store one container, flip the
// wire to the other, then join.
function driveFlip({ stored, flipped }) {
  let canon = classifyPinned(inlineLeg(stored), null).canonicalEntries;
  const mid = classifyPinned(inlineLeg(flipped), canon);
  canon = mid.canonicalEntries;
  const joined = classifyPinned(joinedLeg(), canon);
  return { mid, joined, out: joined.messages ?? null };
}

test("BITE — stored as an ARRAY, wire flipped to a STRING: the re-serve forwards a STRING", () => {
  // The 349k shape exactly. Today the extension forwards the stored array.
  const { joined, out } = driveFlip({ stored: carrierArrayWithMarker(), flipped: carrierString() });
  assert.ok(out, `the join must be absorbed, got action=${joined.action}/${joined.resetReason ?? ""}`);
  assert.ok((joined.moved ?? 0) > 0, "the join-move must fire, or this test asserts nothing");

  const reserved = out.find((m) => m?.role === "system" && !String(JSON.stringify(m)).includes(REM));
  assert.ok(reserved, "the re-served carrier must be present in the forwarded array");
  assert.equal(
    typeof reserved.content,
    "string",
    "the wire has been sending this message as a bare string; the re-serve must not resurrect the array container",
  );
  assert.equal(reserved.content, NUDGE, "the TEXT is the canonical's, unchanged — only the envelope follows the wire");
});

test("CONTROL — stored as an ARRAY, wire still an ARRAY: the array is still forwarded", () => {
  // The container only follows the wire; when the wire never flipped there is
  // nothing to follow, and the stored form must survive untouched.
  const { joined, out } = driveFlip({ stored: carrierArrayWithMarker(), flipped: carrierArrayPlain() });
  assert.ok(out, `the join must be absorbed, got action=${joined.action}/${joined.resetReason ?? ""}`);
  const reserved = out.find((m) => m?.role === "system" && !String(JSON.stringify(m)).includes(REM));
  assert.ok(reserved, "the re-served carrier must be present in the forwarded array");
  assert.ok(Array.isArray(reserved.content), "an unflipped wire keeps the stored array container");
  assert.equal(reserved.content[0].text, NUDGE);
});

test("CONTROL — stored as a STRING, wire flipped to an ARRAY: the array is forwarded", () => {
  // The mirror direction. CC wraps a string in a block array to attach a
  // breakpoint; if it does that while we are re-serving, following the wire
  // means emitting the array.
  const { joined, out } = driveFlip({ stored: carrierString(), flipped: carrierArrayPlain() });
  assert.ok(out, `the join must be absorbed, got action=${joined.action}/${joined.resetReason ?? ""}`);
  const reserved = out.find((m) => m?.role === "system" && !String(JSON.stringify(m)).includes(REM));
  assert.ok(reserved, "the re-served carrier must be present in the forwarded array");
  assert.ok(Array.isArray(reserved.content), "the wire is sending an array now; the re-serve follows it");
  assert.equal(reserved.content[0].text, NUDGE, "text unchanged");
  assert.equal(reserved.content[0].cache_control, undefined, "following the container never invents a marker");
});

test("the re-serve never changes the TEXT, in either direction", () => {
  // The safety argument in one assertion: same bytes, same slot, same count,
  // same roles — only the envelope moves. If this ever fails, the change has
  // stopped being a container normalisation.
  for (const [stored, flipped] of [
    [carrierArrayWithMarker(), carrierString()],
    [carrierString(), carrierArrayPlain()],
  ]) {
    const { out } = driveFlip({ stored, flipped });
    assert.ok(out, "absorbed");
    const reserved = out.find((m) => m?.role === "system" && !String(JSON.stringify(m)).includes(REM));
    const text = typeof reserved.content === "string"
      ? reserved.content
      : reserved.content.map((b) => b.text).join("");
    assert.equal(text, NUDGE);
    assert.equal(reserved.role, "system", "the role is never rewritten");
  }
});
