// insertion-suppression-copy-present — a migrated duplicate may be suppressed
// only while a copy of its bytes is on the wire WE ARE SENDING.
//
// The defect, measured 2026-08-07 on capture s-captureAE n=62 (the one real
// content loss in that day's 67-row conservation residue, attributed by the
// read-only attribution lane before this was written):
//
//   prior canonical ci=7  user [tool_result, skill body 21476, <system-reminder>
//                              "Note: /home/g/.claude/CLAUDE.md was modified…" 1510]
//   incoming    wire 7    user [tool_result, skill body 21475, —]   <- CC EDITED it
//               wire 8    system "Note: …CLAUDE.md was modified…" 1473  <- migrated out
//
// The carrier's non-volatile bytes changed by one character, so its identity
// changed, so the pin could not apply — and `pinnedBlockHashes(priorCanonical)`
// still carried the reminder's hash from the now-unmatched entry. The
// standalone matched that stale hash and was deleted from the forwarded array.
// 1473 bytes of the operator's own CLAUDE.md diff left the conversation
// entirely: absent as a unit under the gate's own hashing, absent as a
// substring, and absent line-by-line (0 of 18 substantial lines). The SAME
// request's other suppression (wire 13, carrier still matched and pinned) was
// correct, which is what makes it a per-instance failure rather than a
// wholesale one. Instrumented replay of the preserved capture named the branch:
//
//   [DBG reset-suppress] idx=8  hash=b6e8e363… ci=7  onWire=false pinApplied=false
//   [DBG reset-suppress] idx=13 hash=45e20a0c… ci=11 onWire=true  pinApplied=true
//
// The premise `pinnedBlockHashes` answers is "is this block in a live canonical
// entry". The premise the suppression's safety argument needs is "is a copy of
// this block on the wire we are about to send". The two part company whenever
// the carrier is not being restored this request, and there are two such
// shapes, one per code path — both are bites below:
//
//   (A) reset path — CC edits the carrier, so its identity no longer matches.
//   (B) success path — the carrier still matches (identity is volatile-blind)
//       but arrives carrying a cache_control breakpoint, and pinnedForwardForm
//       (:637-641) then forwards CC's message untouched rather than the stored
//       first-seen form. The reminder is on neither.
//
// Bite (C) is the positive control: with the carrier matched and pinned, the
// suppression must still fire exactly as before. The repair narrows the
// precondition; it must not disarm the mitigation.

import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyPinned } from "../proxy/extensions/insertion-normalization.mjs";

const REMINDER_INNER = "Note: /home/g/.claude/CLAUDE.md was modified, either by the user or by a linter.";
const REMINDER = `<system-reminder>\n${REMINDER_INNER}\n</system-reminder>`;

const userMsg = (text) => ({ role: "user", content: [{ type: "text", text }] });
const assistantMsg = (text) => ({ role: "assistant", content: [{ type: "text", text }] });
const carrier = (text, extra = {}) => ({
  role: "user",
  content: [{ type: "text", text, ...extra }, { type: "text", text: REMINDER }],
});
// CC's migrated form: the reminder alone, wrapper stripped, as its own message.
const migratedStandalone = () => ({ role: "system", content: [{ type: "text", text: REMINDER_INNER }] });

const pinCanon = (messages) => classifyPinned(messages, null).canonicalEntries;
const wire = (r, msgs) => (Array.isArray(r.messages) ? r.messages : msgs);
const wireText = (r, msgs) => JSON.stringify(wire(r, msgs));
// Counted on the JSON, so the needle must be JSON-escaped the same way — a raw
// "\n" in the needle can never match `\\n` in the dump, which is a green that
// means nothing. Escaped once, here.
const occurrences = (hay, needle) => hay.split(JSON.stringify(needle).slice(1, -1)).length - 1;
// Is the WRAPPED first-seen form present as a block, structurally?
const hasWrappedBlock = (msgs) => msgs.some(
  (m) => Array.isArray(m?.content) && m.content.some((b) => b?.type === "text" && b.text === REMINDER),
);

test("(A) reset path: an EDITED carrier is not a restored copy — the standalone must survive", () => {
  // The measured shape: the carrier's ordinary text changes by one character
  // while its reminder migrates out into a standalone of its own.
  const canon = pinCanon([carrier("skill body v1"), assistantMsg("a1"), userMsg("u2"), assistantMsg("a2")]);
  const incoming = [
    userMsg("skill body v2"), // CC edited it: new identity, reminder shed
    migratedStandalone(),
    userMsg("u2"), // reordered ahead of a1 to force the reset path deterministically
    assistantMsg("a1"),
    assistantMsg("a2"),
    userMsg("tail"),
  ];
  const r = classifyPinned(incoming, canon);

  assert.equal(r.action, "reset", "precondition: this pair must take the reset path");
  const text = wireText(r, incoming);
  assert.equal(
    occurrences(text, REMINDER_INNER), 1,
    "the reminder must still reach the model exactly once — nothing restores the edited carrier's copy, "
    + "so suppressing the standalone would delete the bytes outright",
  );
  assert.equal(r.suppressed, 0, "no suppression may be DECLARED when no copy is being restored");
});

test("(B) success path: a cache_control carrier is forwarded raw, so its reminder is not a restored copy", () => {
  // Identity is volatile-blind (canonicalMessageShape), so the carrier still
  // MATCHES after shedding its reminder. pinnedForwardForm bails on
  // cache_control and forwards CC's message, which no longer carries it.
  const canon = pinCanon([carrier("host"), assistantMsg("a1")]);
  const incoming = [
    { role: "user", content: [{ type: "text", text: "host", cache_control: { type: "ephemeral" } }] },
    migratedStandalone(),
    assistantMsg("a1"),
    userMsg("tail"),
  ];
  const r = classifyPinned(incoming, canon);

  assert.notEqual(r.action, "reset", "precondition: this pair must take the success path");
  const text = wireText(r, incoming);
  assert.equal(
    occurrences(text, REMINDER_INNER), 1,
    "the reminder must still reach the model exactly once — the pin was skipped, so the standalone is the only copy",
  );
  assert.equal(r.suppressed, 0, "no suppression may be DECLARED when no copy is being restored");
});

// The sibling enumeration the dev-loop mandates at ship time: the same event
// with one attribute varied. (D) varies HOW the carrier stops being restored —
// pruned outright rather than edited. (E) varies WHICH hash set matches — the
// merged-standalone join rather than a single block; the narrowing has to reach
// both or it half-ships.
test("(D) SIBLING: a carrier PRUNED from history is not a restored copy either", () => {
  const canon = pinCanon([
    carrier("host"), assistantMsg("a1"), userMsg("u2"), assistantMsg("a2"), userMsg("u3"),
  ]);
  const incoming = [
    // `host` is gone entirely — CC pruned it — and its reminder now stands alone.
    migratedStandalone(),
    userMsg("u3"), // reordered ahead of u2 to force the reset path deterministically
    assistantMsg("a1"),
    userMsg("u2"),
    assistantMsg("a2"),
    userMsg("tail"),
  ];
  const r = classifyPinned(incoming, canon);

  assert.equal(
    occurrences(wireText(r, incoming), REMINDER_INNER), 1,
    "the pruned carrier serves nothing, so the standalone is the only copy and must be forwarded",
  );
  assert.equal(r.suppressed, 0, "no suppression may be DECLARED when no copy is being restored");
});

test("(E) SIBLING: the JOIN hash set narrows too — a merged standalone off an edited carrier survives", () => {
  const SECOND_INNER = "The task tools haven't been used recently.";
  const twoReminderCarrier = (text) => ({
    role: "user",
    content: [
      { type: "text", text },
      { type: "text", text: REMINDER },
      { type: "text", text: `<system-reminder>\n${SECOND_INNER}\n</system-reminder>` },
    ],
  });
  // CC's merged form: BOTH reminders, wrappers stripped, joined with "\n\n".
  const mergedStandalone = () => ({
    role: "system",
    content: [{ type: "text", text: `${REMINDER_INNER}\n\n${SECOND_INNER}` }],
  });

  const canon = pinCanon([twoReminderCarrier("body v1"), assistantMsg("a1"), userMsg("u2"), assistantMsg("a2")]);
  const incoming = [
    userMsg("body v2"), // edited: identity changed, both reminders shed
    mergedStandalone(),
    userMsg("u2"), // reordered ahead of a1: reset path
    assistantMsg("a1"),
    assistantMsg("a2"),
    userMsg("tail"),
  ];
  const r = classifyPinned(incoming, canon);

  const text = wireText(r, incoming);
  assert.equal(occurrences(text, REMINDER_INNER), 1, "the first reminder must survive the merge");
  assert.equal(occurrences(text, SECOND_INNER), 1, "and so must the second");
  assert.equal(r.suppressed, 0, "no suppression may be DECLARED when no copy is being restored");
});

test("(C) CONTROL: with the carrier matched and pinned, the migrated duplicate is still suppressed", () => {
  const canon = pinCanon([carrier("host"), assistantMsg("a1")]);
  const incoming = [
    userMsg("host"), // same identity, reminder shed — the pin restores it
    migratedStandalone(),
    assistantMsg("a1"),
    userMsg("tail"),
  ];
  const r = classifyPinned(incoming, canon);

  assert.equal(r.suppressed, 1, "the mitigation must still fire on the shape it was built for");
  assert.equal(occurrences(wireText(r, incoming), REMINDER_INNER), 1, "carried exactly once, by the restored inline form");
  assert.ok(
    hasWrappedBlock(wire(r, incoming)),
    "and it is the WRAPPED first-seen form that carries it, not the standalone",
  );
});

test("(C2) CONTROL, reset path: a matched-and-pinned carrier still suppresses on a reset", () => {
  const canon = pinCanon([carrier("host"), assistantMsg("a1"), userMsg("u2"), assistantMsg("a2")]);
  const incoming = [
    userMsg("host"), // same identity — the pin applies on the reset path too
    migratedStandalone(),
    userMsg("u2"), // reordered ahead of a1: reset
    assistantMsg("a1"),
    assistantMsg("a2"),
    userMsg("tail"),
  ];
  const r = classifyPinned(incoming, canon);

  assert.equal(r.action, "reset", "precondition: the reset path");
  assert.equal(r.suppressed, 1, "the reset-path suppression must still fire");
  const text = wireText(r, incoming);
  assert.equal(occurrences(text, REMINDER_INNER), 1, "carried exactly once, by the restored inline form");
});
