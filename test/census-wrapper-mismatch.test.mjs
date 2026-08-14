// census-wrapper-mismatch — sub-classifies the row-4 MISMATCH population by
// its measured mechanism (2026-08-14, 46-capture corpus, 16/16 MISMATCH):
// CC re-emits the migrated blocks with the <system-reminder> WRAPPERS
// RETAINED, joined the same "\n\n" way `canonical` joins the stripped form.
// The header's own definition (`canonical`) assumes stripping; this pins
// that a second reconstruction — `canonicalWrapped` — is now evaluated
// alongside it, and that a MISMATCH finding carries which one (if either)
// actually accounts for it, WITHOUT changing the stripped verdict itself.
//
// Five labels, in the precedence `analysePair` uses: HOST-PRUNED,
// HOST-IDLESS (the host could not be located, so no wrapped candidate was
// even considered), WRAPPER-RETAINED-EXACT, WRAPPER-RETAINED-EXTENDED
// (`wrappedSub` reported as DATA — where the remainder came from — never a
// verdict about absorbability), UNRELATED (the residual: located host,
// nothing — stripped or wrapped — accounts for it).
//
// Red-first, demonstrated rather than asserted (dev-loop.md, "Adding a
// check"): against the pre-change census (base 3a368c9) `canonicalWrapped`
// does not exist and `analysePair` findings carry no `mismatchSub`/`wrapped`/
// `wrappedSub` fields at all, so every assertion on those fields fails while
// the corresponding `f.verdict`/`f.mismatchSub === undefined` shape in the
// control bites — which describe the OLD behaviour — already held. Synthetic,
// deterministic bytes only — this repo is public.

import { test } from "node:test";
import assert from "node:assert/strict";
import { analysePair } from "../tools/reminder-migration-census.mjs";

const HOST_ID = "t_host_wrapper_mismatch_001";
const wrap = (t) => `<system-reminder>\n${t}\n</system-reminder>`;
const head = { role: "user", content: [{ type: "text", text: "conversation head, synthetic" }] };
const INNER = "synthetic wrapper-retained reminder text, deterministic, not capture bytes";
const WRAPPED = wrap(INNER);

const hostMsg = {
  role: "user",
  content: [
    { type: "tool_result", tool_use_id: HOST_ID },
    { type: "text", text: WRAPPED },
  ],
};
const hostEcho = { role: "user", content: [{ type: "tool_result", tool_use_id: HOST_ID }] };

/** One (host, after) pair: a single-block host whose reminder migrates out,
 *  with `afterExtra` supplying whatever the after-request's standalone(s)
 *  actually look like. */
function pairFindings(afterExtra) {
  const before = { body: { messages: [head, hostMsg] } };
  const after = { body: { messages: [head, hostEcho, ...afterExtra] } };
  return analysePair(before, after);
}

test("RED-FIRST — wrapper-retained EXACT: MISMATCH sub-classified WRAPPER-RETAINED-EXACT", () => {
  const retained = { role: "system", content: WRAPPED };
  const findings = pairFindings([retained]);
  assert.equal(findings.length, 1, "one host, one finding");
  const f = findings[0];

  // The stripped rule still rejects wrapper-retained bytes — that half is
  // untouched, and is the whole reason a sub-classification is needed.
  assert.equal(f.verdict, "MISMATCH");
  assert.equal(f.mismatchSub, "WRAPPER-RETAINED-EXACT");
  assert.ok(f.wrapped, "a wrapped hit must be recorded");
  assert.equal(f.wrapped.verdict, "EXACT");
  assert.equal(f.wrapped.j, 2, "the candidate's position in `after`");
  assert.equal(f.wrappedSub, undefined, "an EXACT wrapped hit carries no sub-classification");
});

test("RED-FIRST — wrapper-retained EXTENDED: WRAPPER-RETAINED-EXTENDED, wrappedSub present", () => {
  const extraBlock = wrap("second synthetic block, appended verbatim, not capture bytes");
  const retainedExtended = { role: "system", content: WRAPPED + "\n\n" + extraBlock };
  const findings = pairFindings([retainedExtended]);
  assert.equal(findings.length, 1);
  const f = findings[0];

  assert.equal(f.verdict, "MISMATCH");
  assert.equal(f.mismatchSub, "WRAPPER-RETAINED-EXTENDED");
  assert.ok(f.wrapped, "a wrapped hit must be recorded");
  assert.equal(f.wrapped.verdict, "EXTENDED");
  // Reported as DATA (where the remainder came from), never a verdict about
  // absorbability — this fixture's BEFORE request carries no standalone, so
  // the remainder cannot be a merged predecessor and must read NEW-TEXT.
  assert.equal(f.wrappedSub, "NEW-TEXT");
});

test("control — an unrelated standalone classifies UNRELATED (the classifier discriminates)", () => {
  // Must still satisfy `anyCreated` (contain the unwrapped inner text as a
  // substring) so the finding stays MISMATCH rather than DROPPED — a text
  // with NO overlap at all answers a different question (DROPPED), not this
  // one. Neither the stripped nor the wrapped reconstruction accounts for it.
  const unrelated = { role: "system",
                       content: `noise-before ${INNER} noise-after (not the reminder form at all)` };
  const findings = pairFindings([unrelated]);
  assert.equal(findings.length, 1);
  const f = findings[0];

  assert.equal(f.verdict, "MISMATCH", "precondition: anyCreated must still be true here");
  assert.equal(f.mismatchSub, "UNRELATED");
  assert.equal(f.wrapped, null, "no wrapped hit exists for this candidate");
  assert.equal(f.wrappedSub, undefined);
});

test("control — the existing stripped-form EXACT pair is untouched: no mismatchSub/wrapped fields", () => {
  const stripped = { role: "system", content: INNER };
  const findings = pairFindings([stripped]);
  assert.equal(findings.length, 1);
  const f = findings[0];

  assert.equal(f.verdict, "EXACT");
  assert.equal(f.mismatchSub, undefined,
    "the stripped EXACT path must never attach a sub-classification field");
  assert.equal(f.wrapped, undefined);
  assert.equal(f.wrappedSub, undefined);
});

// --- the TRAILING-NEWLINE join, added 2026-08-14 at the desk -----------------
//
// WHY THIS FILE NEEDED A SIXTH BITE, stated because the gap is the lesson. The
// five bites above all build their blocks with `wrap()`, which emits the
// canonical form with nothing after the closing tag — so every one of them is
// blind to what a block looks like INLINE in real traffic, where it carries a
// trailing newline. Against the live corpus the first `canonicalWrapped`
// (a verbatim join) matched all 8 single-block occurrences and NONE of the 8
// multi-block ones, because a single block has no join to get wrong: the
// fixtures were green and the corpus said UNRELATED, which is the
// curation-axis blindness dev-loop.md names, arriving inside the very check
// built to classify the population.
//
// The two bites below are that population, synthesized: a host whose blocks
// carry the trailing newline, and a standalone that joins from the closing tag.
// Red before the `trimEnd` (both read UNRELATED), green after — and the live
// pair is the stronger control: 8/0/8 EXACT/EXTENDED/UNRELATED before,
// 8/8/0 after, over the same corpus minutes apart.

const HOST_ID_NL = "t_host_wrapper_trailing_nl_001";
const wrapNl = (t) => `<system-reminder>\n${t}\n</system-reminder>\n`;
const INNER_A = "first synthetic block, deterministic, not capture bytes";
const INNER_B = "second synthetic block, deterministic, not capture bytes";

const hostMsgNl = {
  role: "user",
  content: [
    { type: "tool_result", tool_use_id: HOST_ID_NL },
    { type: "text", text: wrapNl(INNER_A) },
    { type: "text", text: wrapNl(INNER_B) },
  ],
};
const hostEchoNl = { role: "user", content: [{ type: "tool_result", tool_use_id: HOST_ID_NL }] };

function pairFindingsNl(afterExtra) {
  const before = { body: { messages: [head, hostMsgNl] } };
  const after = { body: { messages: [head, hostEchoNl, ...afterExtra] } };
  return analysePair(before, after);
}

test("RED-FIRST — a multi-block host whose blocks carry a trailing newline: WRAPPER-RETAINED-EXACT", () => {
  // CC's standalone joins from the CLOSING TAG: each block's trailing
  // whitespace is gone and exactly one blank line separates them. This is the
  // string `canonicalWrapped` must reproduce from the host's blocks alone.
  const retained = { role: "system", content: `${wrap(INNER_A)}\n\n${wrap(INNER_B)}` };
  const findings = pairFindingsNl([retained]);
  assert.equal(findings.length, 1, "one host, one finding");
  const f = findings[0];

  assert.equal(f.verdict, "MISMATCH", "the stripped rule still rejects wrapper-retained bytes");
  assert.equal(f.mismatchSub, "WRAPPER-RETAINED-EXACT",
    "a verbatim join leaves the inline block's trailing newline in and reads UNRELATED here");
  assert.equal(f.wrapped.verdict, "EXACT");
  assert.equal(f.unrelatedDiag, undefined, "an accounted-for row carries no residual diagnostic");
});

test("the UNRELATED diagnostic reports the wrapper ARITHMETIC, not just the label", () => {
  // The residual label says least exactly where a design decision would rest on
  // it, so an UNRELATED row carries the numbers that separate "the wrapper
  // bytes differ" from "the content is genuinely new". Asserted against the
  // DEFINITION — overhead is the block's bytes minus its unwrapped inner text,
  // and the canonical wrapper is 37 (18 opening + 19 closing) — never against
  // whatever the corpus happens to hold today.
  const unrelated = { role: "system",
                       content: `noise-before ${INNER_A} noise-after (not the reminder form at all)` };
  const findings = pairFindingsNl([unrelated]);
  const f = findings[0];

  assert.equal(f.mismatchSub, "UNRELATED");
  assert.ok(f.unrelatedDiag, "an UNRELATED row carries the arithmetic");
  assert.equal(f.unrelatedDiag.blockShapes.length, 2, "one shape per host block");
  for (const s of f.unrelatedDiag.blockShapes) {
    assert.equal(s.wrapCanonical, true, "WRAP tolerates the trailing newline");
    assert.equal(s.overhead, 38, "18 + 19 + the trailing newline this fixture plants");
    assert.equal(s.chars - s.innerChars, s.overhead, "overhead is defined as that difference");
  }
  assert.equal(typeof f.unrelatedDiag.wrappedDivOffset, "number",
    "where the wrapped reconstruction and the candidate part company");
});

// NEGATIVE CONTROL for the `trimEnd` tolerance (operator, 2026-08-14).
//
// `canonicalWrapped` now normalizes each block's TRAILING WHITESPACE away
// before joining, which is what closed this class — and a tolerance inside a
// comparison is exactly the thing that can quietly absorb the NEXT, different
// one-byte class. So the tolerance owes a control in the other direction: a
// divergence of one byte INSIDE a block must still fail, or the sub-classifier
// has stopped discriminating and would report every future mechanism as
// "wrapper-retained, accounted for".
//
// The fixture carries two blocks so the finding stays MISMATCH: the first
// migrates verbatim (which is what satisfies `anyCreated` — with no surviving
// block the pair classifies DROPPED and answers a different question), while
// the second differs by a single character inside the wrapper. Nothing about
// the trailing whitespace is changed, so the tolerance is live and cannot be
// credited with the result either way.
//
// PROVEN TO DISCRIMINATE, and the two arms that FAILED to redden it are worth
// more than the one that did. Widening `canonicalWrapped` — truncating each
// block to 40 chars, then stripping every lowercase letter — left this control
// GREEN both times, because `classify` normalizes only the RECONSTRUCTION and
// compares it against CC's bytes verbatim: a one-sided reconstruction can only
// fail to match, never absorb. It reddens under exactly one mutation shape,
// letter-stripping applied INSIDE `classify` to BOTH sides, with the other six
// bites still green. So `trimEnd` is not a tolerance in the two-sided sense at
// all — it is a prediction of the bytes CC emits, checked exactly — and the way
// this class could actually start hiding the next one is a normalization that
// touches the candidate side. That is what this control watches.
test("NEGATIVE CONTROL — one byte changed INSIDE a block still fails under the trimEnd tolerance", () => {
  const INNER_C = "third synthetic block, deterministic, not capture bytes";
  const INNER_C_MUTATED = INNER_C.replace("third", "thind"); // one character, same length
  assert.equal(INNER_C_MUTATED.length, INNER_C.length, "the mutation is one byte, not a length change");
  assert.notEqual(INNER_C_MUTATED, INNER_C);

  const hostId = "t_host_inner_byte_001";
  const cHead = { role: "user", content: [{ type: "text", text: "conversation head, inner-byte control" }] };
  const cHost = {
    role: "user",
    content: [
      { type: "tool_result", tool_use_id: hostId },
      { type: "text", text: wrapNl(INNER_A) },   // trailing newline present: the tolerance is live
      { type: "text", text: wrapNl(INNER_C) },
    ],
  };
  const cEcho = { role: "user", content: [{ type: "tool_result", tool_use_id: hostId }] };
  // CC's standalone: block A verbatim (so `anyCreated` holds), block C with the
  // single mutated byte. Joined the way the corpus says CC joins.
  const candidate = { role: "system", content: `${wrap(INNER_A)}\n\n${wrap(INNER_C_MUTATED)}` };

  const findings = analysePair(
    { body: { messages: [cHead, cHost] } },
    { body: { messages: [cHead, cEcho, candidate] } });
  assert.equal(findings.length, 1);
  const f = findings[0];

  assert.equal(f.verdict, "MISMATCH", "precondition: anyCreated holds, so this is a rule failure not a DROP");
  assert.equal(f.mismatchSub, "UNRELATED",
    "a one-byte difference inside a block must NOT be absorbed by the trailing-whitespace tolerance");
  assert.equal(f.wrapped, null, "no wrapped hit may be recorded for it");
  assert.ok(f.unrelatedDiag, "and it carries the arithmetic that says why");
});
