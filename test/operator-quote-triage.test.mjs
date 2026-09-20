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

test("the markdown-emphasised form counts — the 2026-08-10-era entries use it", () => {
  // Written because this form is what the hand sweep nearly missed: a plain
  // `"` predicate would have skipped two of the five real instances.
  const hits = triageLine('Raised by the operator: *"a lot of the tooling ones could be merged, no?"*');
  assert.equal(hits.length, 1);
  assert.equal(hits[0], "a lot of the tooling ones could be merged, no?");
});
