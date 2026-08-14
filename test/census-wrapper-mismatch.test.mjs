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
