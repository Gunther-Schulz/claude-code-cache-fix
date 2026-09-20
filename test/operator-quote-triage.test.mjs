import { test } from "node:test";
import assert from "node:assert/strict";
import { triageLine, triageText } from "../tools/operator-quote-triage.mjs";

// The instrument's own discrimination pair, drawn from the class it was built
// for rather than constructed: the five real instances found on 2026-09-21 all
// share the shape "attribution word + a sentence-length quoted span", and the
// false-positive mass is short quoted identifiers and quoted spans with no
// attribution anywhere on the line.

test("fires on the shape every real instance had: attribution plus a sentence-length quote", () => {
  const real = [
    'the publication half by an explicit operator GO ("you can push, you are the only one here").',
    'Raised 2026-08-10 by the operator on both counts: *"i wonder what the rest are?"*',
    'the operator asked "isn\'t there a GOOD permanent solution?", and it was',
  ];
  for (const line of real) {
    assert.ok(triageLine(line).length >= 1, `must flag: ${line.slice(0, 50)}`);
  }
});

test("BITE — the two halves are each necessary, so the hit rate stays readable", () => {
  // A sentence-length quote with NO attribution on the line: the tree is full
  // of these (changelog prose, quoted doc sentences) and flagging them would
  // bury the class in noise.
  assert.deepEqual(
    triageLine('the hint reads "restart the proxy via your supervisor to recover from this"'),
    [],
    "a long quote with no attribution is not a candidate",
  );
  // Attribution WITH only a short quoted identifier: the other noise half.
  assert.deepEqual(
    triageLine('the operator set CACHE_FIX_OUTPUT_GUARD to "on" for this run'),
    [],
    "an attributed short identifier is not a candidate",
  );
  // And the conjunction still fires, so the two negatives above are not
  // passing because the predicate is simply dead.
  assert.equal(
    triageLine('the operator said "this is a sentence long enough to be a quote"').length,
    1,
    "the conjunction must still fire — else the negatives above prove nothing",
  );
});

test("reports the line number, because a file-level hit is not a thing anyone can classify", () => {
  const text = ["alpha", "beta", 'the operator asked "is there a permanent solution to this?"'].join("\n");
  const hits = triageText(text);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 3);
  assert.equal(hits[0].quote, "is there a permanent solution to this?");
});

// --- Reach, found by the instrument's own failure hours after it shipped ---
//
// The first version was LINE-BASED and required quotation marks. Both are
// routes-not-watched, and a route not watched returns exactly what a true
// absence returns: `docs/dev-loop.md:89` carries a quote introduced with the
// words "the operator's words for why" and the tool reported 0 for that file.
// The 124-candidate figure it produced was therefore an undercount shipped
// under an assurance wider than its predicate.

test("BITE — a quote that WRAPS across a line must still be found", () => {
  // This corpus hard-wraps at ~69 columns, and the global rule names exactly
  // this: any line-based phrase search is blind to a phrase spanning the wrap.
  const wrapped = [
    "forgotten, and the operator's words for why: *later we may forget and this",
    "never surfaces and we never fix it.*",
  ].join("\n");
  const hits = triageText(wrapped);
  assert.equal(hits.length, 1, "the wrapped span is one quote, not zero");
  assert.match(hits[0].quote, /later we may forget/);
  assert.match(hits[0].quote, /never fix it/, "and it must carry the WHOLE span, both halves");
});

test("BITE — an emphasis-only quote counts: the operator's words need no quote marks", () => {
  const hits = triageLine("and the operator's words for why: *later we may forget and this never surfaces*");
  assert.equal(hits.length, 1, "emphasis with no quotation marks is still a quote");
});

test("reach: attribution must be NEAR the span, not merely in the file", () => {
  // The widened predicate could have been widened wrongly — a whole-file scan
  // with a file-level attribution test would flag every emphasised phrase in a
  // document that mentions the operator once. The window is what keeps the
  // hit list readable, so it is pinned.
  const far = "the operator decided this.\n" + "filler. ".repeat(60) + "*an unrelated emphasised phrase here*";
  assert.deepEqual(triageText(far), [], "an emphasis far from any attribution is not a candidate");
});

test("the markdown-emphasised form counts — the 2026-08-10-era entries use it", () => {
  // Written because this form is what the hand sweep nearly missed: a plain
  // `"` predicate would have skipped two of the five real instances.
  const hits = triageLine('Raised by the operator: *"a lot of the tooling ones could be merged, no?"*');
  assert.equal(hits.length, 1);
  assert.equal(hits[0], "a lot of the tooling ones could be merged, no?");
});
