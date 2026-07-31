// extended-absorb — what the EXTENDED sub-class of the row-4 container
// migration actually IS, and the declaration the absorption rides on.
//
// Grounding, measured 2026-07-31 on capture s-77fe2779 (request index 101,
// ts 11:41:05.778Z, and its same-conversation predecessor at index 100 —
// paired by `conversationOf`, never by capture adjacency):
//
//   before[99]  user      tool_result + ONE <system-reminder> block (330ch)
//   before[100] system    a standalone harness reminder (421ch)
//   after[101]  system    ONE message, 716ch = 293 + "\n\n" + 421
//
// 293 is the wrapper-stripped reminder from before[99]; 421 is before[100]
// VERBATIM. So the census's EXTENDED verdict (`actual.startsWith(recon)`,
// reminder-migration-census.mjs:96) is a true statement about a MERGE, not
// about new text: CC swallowed an existing standalone message into the
// migrated reminder. The "extra" bytes are a message the proxy already
// forwarded once, at its own index, one request earlier.
//
// That distinction decides the mitigation and was measured, not reasoned:
// re-emitting those bytes as a fresh message at a frozen TAIL index leaves the
// first forwarded divergence at 100 (unchanged); putting them back at the
// index the swallowed message occupied moves it to 123 of 124. The class is
// therefore an UN-MERGE, not a relocation.
//
// The text below is synthetic and deterministic (harvest.mjs's token shape),
// never capture bytes — this repo is public. A straight harvest scrub could
// not carry this class anyway: scrubText tokenizes each text independently, so
// `scrub(a + "\n\n" + b) !== scrub(a) + "\n\n" + scrub(b)` and the prefix
// relation that DEFINES EXTENDED does not survive sanitization.

import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyPinned } from "../proxy/extensions/insertion-normalization.mjs";
import { canonical, classify } from "../tools/reminder-migration-census.mjs";

// Structure of the measured pair, text tokenized. Lengths are the real ones so
// the arithmetic that identifies the class stays legible.
const HOOK_INNER = "t_a1b2c3d4e5f6_293";
const HOOK_BLOCK = `<system-reminder>\n${HOOK_INNER}\n</system-reminder>`;
const SWALLOWED = "t_9f8e7d6c5b4a_421"; // the standalone that existed already
const MERGED = `${HOOK_INNER}\n\n${SWALLOWED}`;

const userMsg = (text) => ({ role: "user", content: [{ type: "text", text }] });
const assistantMsg = (text) => ({ role: "assistant", content: [{ type: "text", text }] });
const hostMsg = () => ({
  role: "user",
  content: [{ type: "text", text: "t_host_0001_120" }, { type: "text", text: HOOK_BLOCK }],
});
const standalone = (text) => ({ role: "system", content: [{ type: "text", text }] });

const pinCanon = (messages) => classifyPinned(messages, null).canonicalEntries;

test("the EXTENDED delta is a message the PREDECESSOR already carried, not new text", () => {
  // Definition first (dev-loop, "Adding a check"): EXTENDED means CC's later
  // standalone has the canonical reconstruction as a byte prefix. The claim
  // under test is about what the REMAINDER is — the grounding this dispatch
  // was given said "new harness text", and the bytes say otherwise.
  const recon = canonical([HOOK_BLOCK]);
  assert.equal(classify(recon, MERGED), "EXTENDED", "precondition: the census calls this EXTENDED");

  const extra = MERGED.slice(recon.length);
  assert.equal(extra.slice(0, 2), "\n\n", "the join separator is the canonical one");

  const predecessor = [userMsg("t_u0_0002_40"), hostMsg(), standalone(SWALLOWED), assistantMsg("t_a0_0003_60")];
  const carriedBefore = predecessor.some(
    (m) => m.role === "system" && m.content.some((b) => b.text === extra.slice(2)),
  );
  assert.ok(
    carriedBefore,
    "the EXTENDED remainder is byte-identical to a standalone message of the earlier request",
  );
});

test("a suppression on the RESET path is DECLARED, not only counted", () => {
  // DEFINITION (written before the assertion, and taken from the consumer, not
  // from the code under test): `stats.suppressions` is the extension's own
  // report of which INCOMING indices it deliberately did not forward.
  // tools/replay.mjs reads it in two gates — safetyViolation() filters those
  // indices out of the input side before comparing lengths, and
  // conservationViolations() accepts a missing unit only when it is "part of a
  // DECLARED suppression (stats.suppressions ... never a re-derived 'looks
  // dropped' guess)". A suppression that is counted but not declared is
  // therefore invisible to both, and the gate reports a designed behaviour as
  // corruption — the check-fires-on-a-non-defect failure that trains a reader
  // to ignore red.
  //
  // Measured red before the fix, replaying capture s-77fe2779 requests 0..101
  // of conversation e7394e05 with the SERVING gate set:
  //   safety violations: 1  — n=73 length: 124 -> 123
  //   conservation:      1  — n=73 lost: in[98] (system)
  //   insertion stats:   suppressed: 1, suppressions: []
  // The reset path (059aae3) added the suppression without its declaration;
  // test/insertion-suppression-on-reset.test.mjs asserts the COUNT, which has
  // the same parentage as the code and so pinned the gap in place.
  const canon = pinCanon([hostMsg(), assistantMsg("a1"), userMsg("u2"), assistantMsg("a2")]);
  const incoming = [
    userMsg("t_host_0001_120"),   // the reminder migrated out of the host
    standalone(HOOK_INNER),       // ... into this standalone: suppressible
    userMsg("u2"),                // reordered ahead of a1 -> not-subsequence
    assistantMsg("a1"),
    assistantMsg("a2"),
    userMsg("tail"),
  ];
  const r = classifyPinned(incoming, canon);

  assert.equal(r.action, "reset", "precondition: the reset path");
  assert.equal(r.suppressed, 1, "precondition: one suppression happened");
  assert.deepEqual(
    r.suppressions,
    [{ index: 1, hash: r.suppressions?.[0]?.hash }],
    "the suppressed INCOMING index must be declared, not just counted",
  );
  assert.equal(typeof r.suppressions[0].hash, "string", "the declaration carries the matched hash");
});

test("count and declaration can never disagree, on either path", () => {
  // The invariant behind the gap: two reports of one fact. Asserted on both
  // paths so a future edit to either cannot re-open it on one of them.
  const canon = pinCanon([hostMsg(), assistantMsg("a1"), userMsg("u2"), assistantMsg("a2")]);

  const resetIncoming = [
    userMsg("t_host_0001_120"), standalone(HOOK_INNER),
    userMsg("u2"), assistantMsg("a1"), assistantMsg("a2"), userMsg("tail"),
  ];
  const reset = classifyPinned(resetIncoming, canon);
  assert.equal(reset.action, "reset");
  assert.equal(reset.suppressed, reset.suppressions.length, "reset path: count === declared");

  const successIncoming = [
    userMsg("t_host_0001_120"), standalone(HOOK_INNER),
    assistantMsg("a1"), userMsg("u2"), assistantMsg("a2"), userMsg("tail"),
  ];
  const success = classifyPinned(successIncoming, canon);
  assert.notEqual(success.action, "reset", "precondition: the non-reset path");
  assert.equal(success.suppressed, success.suppressions.length, "success path: count === declared");
});

test("the merged standalone is NOT suppressed today — the class is still open", () => {
  // The EXTENDED merge is outside the current suppression predicate
  // (findSuppressibleDuplicate matches wrapper-stripped bytes EXACTLY), so the
  // 716ch message goes out on the wire beside the restored inline form and the
  // prefix breaks at the host. Pinned here as the class's OPEN state: when an
  // absorption ships, this test is the one that must be rewritten, and the
  // rewrite is the signal that the wire shape changed.
  const canon = pinCanon([hostMsg(), assistantMsg("a1"), standalone(SWALLOWED), userMsg("u2")]);
  const incoming = [
    userMsg("t_host_0001_120"),
    standalone(MERGED),           // reminder + the swallowed standalone, joined
    assistantMsg("a1"),
    userMsg("u2"),
    userMsg("tail"),
  ];
  const r = classifyPinned(incoming, canon);
  assert.equal(r.suppressed ?? 0, 0, "an EXTENDED merge matches nothing pinned");
  const texts = (r.messages ?? incoming).flatMap((m) =>
    (Array.isArray(m.content) ? m.content : []).map((b) => b.text));
  assert.ok(texts.includes(MERGED), "so CC's merged form is forwarded as-is");
  assert.ok(texts.includes(HOOK_BLOCK), "beside the pinned inline copy of its prefix");
});
