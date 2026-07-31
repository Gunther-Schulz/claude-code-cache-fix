// insertion-suppression-on-reset — the migrated-duplicate suppression must
// also run when the canonical model RESETS.
//
// The defect this closes, measured live 2026-07-31 (session 77fe2779, request
// 11:41:05.778Z): `classifyPinned` took the
// `resetKeepingPins("not-subsequence")` path — the telemetry names that reason
// verbatim. WHAT made the survivors non-subsequence on that request is NOT
// established here and is deliberately not claimed: `not-subsequence` requires
// matched entries to invert in order, which a plain pruning does not produce
// (that yields `dropped`). The fix does not depend on the trigger — suppression
// must run on the reset path whatever caused the reset — so the tests below
// force the path with an explicit reorder rather than resting on an
// unverified story about the live one. That path restored the pins — the telemetry recorded `pinned: 2` — and
// then returned BEFORE the migrated-duplicate pass, so the same event recorded
// `suppressed: 0`. CC's standalone copy of an already-pinned reminder went out
// on the wire beside the restored inline form, the prefix broke at the host,
// and everything after it re-billed: `edit@98 of 123`, transcript
// `cache_miss_reason messages_changed / cache_missed_input_tokens 105006`,
// ~104 kB.
//
// Why it mattered more than one event: the suppression was built for exactly
// this shape (#76606, decision B) and was silently disabled by ANY reset —
// and this extension's own measurement puts resets at 125 across 350 requests,
// roughly one request in three. It read as shipped and behaved as absent.

import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyPinned } from "../proxy/extensions/insertion-normalization.mjs";

const REMINDER_INNER = "PreToolUse:Agent hook additional context: Dispatch starting";
const REMINDER = `<system-reminder>\n${REMINDER_INNER}\n</system-reminder>`;

const userMsg = (text) => ({ role: "user", content: [{ type: "text", text }] });
const assistantMsg = (text) => ({ role: "assistant", content: [{ type: "text", text }] });
const withReminderMsg = (text) => ({
  role: "user",
  content: [{ type: "text", text }, { type: "text", text: REMINDER }],
});
// CC's migrated form: the reminder alone, wrapper stripped, as its own message.
const migratedStandalone = () => ({ role: "system", content: [{ type: "text", text: REMINDER_INNER }] });

const pinCanon = (messages) => classifyPinned(messages, null).canonicalEntries;

// canonical order: host, a1, u2, a2 — incoming puts u2 BEFORE a1, so the
// matched indices invert and classifyPinned resets with "not-subsequence".
const resetPair = () => {
  const canon = pinCanon([withReminderMsg("host"), assistantMsg("a1"), userMsg("u2"), assistantMsg("a2")]);
  const incoming = [
    { role: "user", content: [{ type: "text", text: "host" }] }, // reminder migrated out
    migratedStandalone(),
    userMsg("u2"),        // <- reordered ahead of a1
    assistantMsg("a1"),
    assistantMsg("a2"),
    userMsg("tail"),
  ];
  return { canon, incoming };
};

test("REGRESSION: a reset still suppresses the migrated duplicate", () => {
  const { canon, incoming } = resetPair();
  const r = classifyPinned(incoming, canon);

  assert.equal(r.action, "reset", "precondition: this pair must take the reset path");
  assert.equal(r.resetReason, "not-subsequence", "precondition: the live reason");
  assert.ok(r.pinned >= 1, "precondition: the reset must still restore the pin");
  assert.equal(r.suppressed, 1, "the migrated duplicate must be suppressed ON THE RESET PATH");

  // Counted is not enough — it must be off the wire.
  assert.ok(Array.isArray(r.messages), "a suppressing reset must rewrite the forwarded array");
  const standaloneOnWire = r.messages.filter(
    (m) => m.role === "system" && JSON.stringify(m.content ?? "").includes(REMINDER_INNER));
  assert.equal(standaloneOnWire.length, 0, "the standalone copy must not be forwarded");

  // And the reminder must still reach the model once, via the restored pin —
  // suppression may never mean the text is lost.
  const carried = JSON.stringify(r.messages).split(REMINDER_INNER).length - 1;
  assert.equal(carried, 1, "the reminder must be carried exactly once, by the pinned inline form");
});

test("the canonical after a suppressing reset never stores the suppressed entry", () => {
  // The success path states "the canonical describes the wire we JUST
  // FORWARDED"; the reset path must hold it too, or the next request diverges
  // against a baseline that was never sent. Asserted on CONTENT, not length —
  // canonicalEntries legitimately retains dropped entries (marked `.d`), and an
  // earlier draft of this test compared lengths and failed against correct
  // behaviour.
  const { canon, incoming } = resetPair();
  const r = classifyPinned(incoming, canon);
  assert.equal(r.action, "reset");
  assert.equal(r.suppressed, 1);
  const asStandalone = JSON.stringify(r.canonicalEntries)
    .split(`"${REMINDER_INNER}"`).length - 1;
  assert.equal(asStandalone, 0,
    "the suppressed standalone must not be stored as its own canonical entry");
});

test("a reset with NO migrated duplicate is unchanged (no false suppression)", () => {
  // The guard against the opposite failure: a reset that has nothing to
  // suppress must behave exactly as before, or this fix becomes a new source
  // of dropped messages.
  const canon = pinCanon([
    userMsg("m1"), assistantMsg("a1"),
    userMsg("ephemeral"), assistantMsg("e2"),
    userMsg("u2"), assistantMsg("a2"),
  ]);
  const incoming = [
    userMsg("m1"), assistantMsg("a1"),
    userMsg("u2"), assistantMsg("a2"), userMsg("tail"),
  ];
  const r = classifyPinned(incoming, canon);
  assert.equal(r.suppressed ?? 0, 0, "nothing to suppress must suppress nothing");
});

test("a standalone matching NOTHING pinned is forwarded untouched on a reset", () => {
  const canon = pinCanon([
    withReminderMsg("host"), assistantMsg("a1"),
    userMsg("ephemeral"), assistantMsg("e2"),
    userMsg("u2"), assistantMsg("a2"),
  ]);
  const unrelated = { role: "system", content: [{ type: "text", text: "something else entirely" }] };
  const incoming = [
    withReminderMsg("host"), unrelated,
    assistantMsg("a1"), userMsg("u2"), assistantMsg("a2"), userMsg("tail"),
  ];
  const r = classifyPinned(incoming, canon);
  assert.equal(r.suppressed ?? 0, 0, "an unrelated standalone must not be suppressed");
  const wire = JSON.stringify(r.messages ?? incoming);
  assert.ok(wire.includes("something else entirely"), "and must still be forwarded");
});

test("the TAIL standalone is never suppressed, even on a reset", () => {
  // Tail growth is ordinary appending, not a stray migration — the success
  // path guards this positionally and the reset path must guard it the same
  // way, or genuine new turns get eaten.
  const canon = pinCanon([
    withReminderMsg("host"), assistantMsg("a1"),
    userMsg("ephemeral"), assistantMsg("e2"),
    userMsg("u2"), assistantMsg("a2"),
  ]);
  const incoming = [
    withReminderMsg("host"), assistantMsg("a1"),
    userMsg("u2"), assistantMsg("a2"),
    migratedStandalone(), // LAST index
  ];
  const r = classifyPinned(incoming, canon);
  assert.equal(r.suppressed ?? 0, 0, "a tail-position duplicate must be left alone");
});
