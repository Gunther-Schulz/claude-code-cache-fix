// harvest — the RELATIONS the scrub must carry, not just the bytes it must
// destroy.
//
// harvest.test.mjs pins what sanitization REMOVES (content) and that it does
// so deterministically. That is necessary and, as measured, not sufficient:
// every structural class this repo chases is defined by a relation BETWEEN
// texts, and a scrub that tokenizes whole texts destroys the two relations
// the reminder-migration domain is built on —
//
//     scrub(a + "\n\n" + b) !== scrub(a) + "\n\n" + scrub(b)
//
// executed against the shipped sanitizer in
// docs/code-reviews/extended-absorb-report.md §c5:
//
//     scrubbed inner reminder : t_557f9b1ec47a_50
//     scrubbed merged         : t_9c41a9f9b0c1_100
//     scrubbed standalone     : t_d258c4d5a7e5_48
//     prefix relation survives: false
//     join relation survives  : false
//
// A fixture harvested for MERGED-STANDALONE therefore could not reproduce
// the class it was pinned for, and the extended-absorb test had to hand-build
// synthetic tokens instead. This file states the relations as PROPERTIES —
// their expectations come from the domain's join contract (census
// canonical()/classify() join reminder blocks with "\n\n";
// insertion-normalization's findSuppressibleDuplicate compares the same
// join), never from what scrubText happens to do.
//
// The properties, in the order asserted:
//   1. Equality      — equal inputs give equal outputs (and no content leaks).
//   2. Join          — scrub is a homomorphism over "\n\n".
//   3. Prefix        — paragraph-granular startsWith survives scrubbing.
//   4. Degradation   — inputs outside the contract lose the relation without
//                      crashing and without leaking; the residual is accepted.
//
// The scrub is exercised through its exported surface (scrubMessage), the
// same channel §c5 refuted it on, so what is tested is what fixtures get.
// All text here is synthetic — this repo is public.

import { test } from "node:test";
import assert from "node:assert/strict";

import { scrubMessage } from "../tools/harvest.mjs";

const scrub = (text) => scrubMessage({ role: "user", content: text }).content;

// A scrubbed text is well-formed when every "\n\n"-separated segment is
// either empty or a token of the documented shape. Stated from the token
// contract in harvest.mjs's sanitization header (t_<sha256-prefix-12>_<len>),
// not from the current code path.
const TOKEN = /^t_[0-9a-f]{12}_[0-9]+$/;
const wellFormed = (scrubbed) =>
  scrubbed.split("\n\n").every((seg) => seg === "" || TOKEN.test(seg));

const PARA_A = "first paragraph of a synthetic reminder body";
const PARA_B = "second paragraph, arriving later as its own block";
const PARA_C = "a third block that the next request merges in";

// --- 1. Equality ------------------------------------------------------------
//
// Definition: the scrub is a function of the bytes alone. Two texts with equal
// bytes scrub equal; two with different bytes scrub different. This is what
// makes identity matching across requests survive sanitization at all, and it
// is unchanged by anything below.

test("equality: equal bytes scrub equal, different bytes scrub different, no content survives", () => {
  const text = `${PARA_A}\n\n${PARA_B}`;
  assert.equal(scrub(text), scrub(text), "same bytes must give the same token string");
  assert.notEqual(scrub(text), scrub(`${PARA_A}\n\n${PARA_C}`), "different bytes must differ");
  for (const word of ["paragraph", "synthetic", "reminder", "arriving"]) {
    assert.ok(!scrub(text).includes(word), `no source bytes may survive (${word})`);
  }
  assert.ok(wellFormed(scrub(text)), "output is tokens joined by the separator");
});

// The fixed-constant lesson (harvest.mjs lines 105-125), restated at
// paragraph granularity: CC migrates a reminder OUT of its wrapper into a
// standalone duplicate, and insertion-normalization suppresses the duplicate
// by comparing the wrapped original's STRIPPED bytes against the standalone's
// bytes. So a wrapped multi-paragraph body and a standalone copy of the same
// bytes must still scrub equal — the property a fixed "REDACTED" placeholder
// broke, and the one a per-segment scrub must not break either.

test("equality: a wrapped multi-paragraph reminder and its unwrapped duplicate still match", () => {
  const inner = `${PARA_A}\n\n${PARA_B}`;
  const wrapped = scrub(`<system-reminder>\n${inner}\n</system-reminder>`);
  const standalone = scrub(inner);
  assert.equal(wrapped, `<system-reminder>\n${standalone}\n</system-reminder>`,
    "the wrapper survives verbatim and the inner text scrubs to the standalone's token string");
  assert.ok(!wrapped.includes("paragraph"), "no source bytes survive inside the wrapper");
});

// --- 2. Join ----------------------------------------------------------------
//
// Definition (census canonical(): reminder blocks are joined with "\n\n"):
// for texts a and b that do not themselves end/begin with a newline at the
// boundary, scrubbing the join equals joining the scrubs. Without this, a
// harvested fixture of a merge cannot show the merge.

test("join: scrub(a + \"\\n\\n\" + b) === scrub(a) + \"\\n\\n\" + scrub(b)", () => {
  const a = PARA_A;
  const b = PARA_B;
  assert.equal(scrub(`${a}\n\n${b}`), `${scrub(a)}\n\n${scrub(b)}`);
});

test("join: holds for three segments and for an empty middle segment", () => {
  assert.equal(
    scrub(`${PARA_A}\n\n${PARA_B}\n\n${PARA_C}`),
    `${scrub(PARA_A)}\n\n${scrub(PARA_B)}\n\n${scrub(PARA_C)}`,
    "associativity — a merge of three blocks is still readable post-scrub",
  );
  // An empty segment carries no bytes, so it has nothing to tokenize and
  // stays empty; the join contract is unaffected by it.
  assert.equal(scrub(`${PARA_A}\n\n\n\n${PARA_B}`), `${scrub(PARA_A)}\n\n\n\n${scrub(PARA_B)}`);
});

// --- 3. Prefix at paragraph granularity -------------------------------------
//
// Definition (census classify(): EXTENDED means actual === recon + extra, i.e.
// actual.startsWith(recon), with the extra separated by the "\n\n" join):
// when the successor is the predecessor plus one more block, the scrubbed
// successor must still start with the scrubbed predecessor. This is the §c5
// refutation reversed.

test("prefix: an EXTENDED pair keeps startsWith after scrubbing", () => {
  const recon = `${PARA_A}\n\n${PARA_B}`;
  const actual = `${recon}\n\n${PARA_C}`;
  assert.ok(scrub(actual).startsWith(scrub(recon)),
    "the scrubbed successor must still be an extension of the scrubbed predecessor");
});

test("prefix: the extra block is recoverable at the same join the census strips", () => {
  // census extendedRemainder() takes actual.slice(recon.length) and removes a
  // leading "\n\n". Post-scrub that must yield exactly the scrubbed extra —
  // otherwise MERGED-STANDALONE cannot be told from NEW-TEXT in a fixture.
  const recon = PARA_A;
  const actual = `${recon}\n\n${PARA_C}`;
  const remainder = scrub(actual).slice(scrub(recon).length);
  assert.equal(remainder.startsWith("\n\n") ? remainder.slice(2) : remainder, scrub(PARA_C));
});

test("prefix: a NON-extension does not falsely satisfy startsWith", () => {
  // The property must discriminate: a successor whose first block differs is
  // not an extension, and the scrub must not manufacture one.
  const recon = PARA_A;
  const actual = `${PARA_B}\n\n${PARA_C}`;
  assert.ok(!scrub(actual).startsWith(scrub(recon)));
});

// --- 4. Degradation, never breakage -----------------------------------------
//
// Definition: the domain's join contract is "\n\n" and nothing narrower, so
// relations that live at a different granularity are NOT promised. What IS
// promised for those inputs: the scrub still runs, still destroys content, and
// still returns a deterministic well-formed token string — it degrades to the
// whole-text behaviour it had before, it does not break.
//
// Measured residuals (recorded, deliberately NOT asserted as equalities — a
// future scrub that preserved them would be a strengthening, and a test that
// went red on it would be firing on a non-defect):
//   - a boundary that creates a "\n\n\n" run (a ends with "\n") re-splits as
//     ["a", "\nb"], so join does not hold;
//   - a sub-paragraph extension (extra appended with no blank line) is one
//     segment, so prefix does not hold.

test("degradation: a \"\\n\\n\\n\" boundary loses the relation but stays safe and deterministic", () => {
  const a = `${PARA_A}\n`; // trailing newline: joining makes a three-newline run
  const b = PARA_B;
  const joined = `${a}\n\n${b}`;
  const out = scrub(joined);
  assert.equal(out, scrub(joined), "deterministic");
  assert.ok(wellFormed(out), "well-formed token string — today's behaviour, no breakage");
  for (const word of ["paragraph", "synthetic", "arriving"]) {
    assert.ok(!out.includes(word), `no content leak on the degraded path (${word})`);
  }
});

test("degradation: a sub-paragraph extension stays safe, and its relation is not promised", () => {
  const recon = PARA_A;
  const actual = `${recon} and some more text on the same line`;
  const out = scrub(actual);
  assert.ok(wellFormed(out));
  assert.ok(!out.includes("more text"), "no content leak");
  assert.ok(!out.includes(String(recon.length)) || out !== scrub(recon),
    "a sub-paragraph extension is a different text and gets a different token");
});

test("degradation: non-strings and the empty string pass through unchanged", () => {
  assert.equal(scrub(""), "", "an empty text has nothing to tokenize");
  const m = scrubMessage({ role: "user", content: [{ type: "text", text: "" }] });
  assert.equal(m.content[0].text, "");
});
