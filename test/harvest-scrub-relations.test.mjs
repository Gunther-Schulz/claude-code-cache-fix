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
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

// --- 5. Nesting: the payload one level below where the scrubber looks --------
//
// DEFINITION (Anthropic Messages wire format): a content block carries its
// binary payload at `block.source.data`, with `block.source.type` and
// `block.source.media_type` as shape fields beside it. The sanitizer's
// contract is "no raw content bytes leave the capture" — a contract about the
// PAYLOAD, not about a field name at a particular depth. So the expectation
// here is: whatever string a block's `source` carries as content must come out
// tokenized, exactly like a top-level `data`.
//
// This is not a hypothetical depth. Measured 2026-07-31
// (docs/audits/pr-prep-2026-07-31/pr-prep-report.md gap 1): the committed
// reset-move fixture carried five image/png blocks with 13,060 raw base64
// chars each at `source.data`, decoding to a screenshot with `tEXt` chunks
// naming the desktop environment, locale and wall-clock — while the fixture's
// own `_sanitization` header claimed it "keeps no raw text at all".
//
// Fail closed, not open: the wire format is not ours to freeze, so any OTHER
// string under `source` longer than 64 chars is tokenized too. Short shape
// fields (`type`, `media_type`) pass, because a reader that branches on them
// is testing the block's KIND, which is structure, not content.

const IMAGE_B64 =
  // synthetic, not a real image: 300 base64-alphabet chars, long enough to be
  // a payload by any measure and to trip the corpus scan in section 6.
  "QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0" .repeat(4);
const DATA_TOKEN = /^data_[0-9a-f]{10}$/;

test("nesting: a wire image block's source.data is tokenized, its shape fields survive", () => {
  const block = {
    type: "image",
    source: { type: "base64", media_type: "image/png", data: IMAGE_B64 },
  };
  const out = scrubMessage({ role: "user", content: [block] }).content[0];
  assert.match(out.source.data, DATA_TOKEN, "the payload must become a data_ token");
  assert.ok(!out.source.data.includes(IMAGE_B64.slice(0, 32)), "no payload bytes may survive");
  assert.equal(out.source.type, "base64", "shape fields are structure and survive");
  assert.equal(out.source.media_type, "image/png");
  assert.equal(out.type, "image");
});

test("nesting: equal payloads tokenize equal, different payloads differ", () => {
  // The same determinism the top-level `data` field has: five copies of one
  // image in one fixture must stay five copies of one token, or a fixture
  // built for a re-send class stops showing the re-send.
  const mk = (d) => scrubMessage({
    role: "user",
    content: [{ type: "image", source: { type: "base64", media_type: "image/png", data: d } }],
  }).content[0].source.data;
  // Both legs must be TOKENS, or the property passes for the wrong reason:
  // raw payloads are trivially equal to themselves and unequal to others, so
  // without this the assertion is satisfied by the unfixed scrubber.
  assert.match(mk(IMAGE_B64), DATA_TOKEN);
  assert.equal(mk(IMAGE_B64), mk(IMAGE_B64));
  assert.notEqual(mk(IMAGE_B64), mk(`${IMAGE_B64}A`));
});

test("nesting: an unknown long string under source is tokenized too (fail closed)", () => {
  const out = scrubMessage({
    role: "user",
    content: [{ type: "document", source: { type: "text", media_type: "text/plain", url: `https://example.invalid/${"p".repeat(80)}` } }],
  }).content[0];
  assert.match(out.source.url, DATA_TOKEN, "a >64-char string under source is a payload until proven otherwise");
  assert.equal(out.source.media_type, "text/plain", "a short shape field still passes");
});

// --- 6. The absence classes, over the committed corpus ----------------------
//
// Sections 1-5 test the sanitizer. This one tests its OUTPUT — the artifacts
// actually in the repo — because that is the altitude where the exposure
// lives. A fixture's `_sanitization` header is a CLAIM; two of them were
// measurably false on 2026-07-31 (pr-prep-report.md gaps 1 and 2) while
// reading confidently. These assertions are the verification of the claim.
//
// DEFINITION of a sanitized fixture (docs/directives/fixture-sanitization-
// directive.md, "Threat model" + settled design 2 and 5). It carries:
//   a. no raw content bytes — operationally, no base64-alphabet run longer
//      than 200 characters anywhere, which is what an image payload, a
//      thinking signature or an encoded blob looks like;
//   b. no untokenized nested payload — every string `source.data` is a
//      `data_<sha10>` token;
//   c. no live wall-clock — every string that IS a full ISO-8601 instant lies
//      in the fixed-epoch family, 2000-01-01T00:00:00.000Z + the original
//      delta. Deliberately scoped to whole-string instants: authored prose in
//      the `_`-prefixed provenance headers cites the DATE a class was measured
//      on, which is documentation the fixture exists to carry, and the harvest
//      DATE is part of a growth artifact's own filename;
//   d. no capture identifier — no 8-4-4-4-12 UUID in any string. Session keys
//      and sids appear only as `s-<sha12>` tokens, which carry no dashes and
//      so cannot satisfy the UUID shape.
//
// Scope: every committed fixture under test/fixtures/harvested except
// `LEDGER-*.json`, which is the per-machine harvest watermark ledger — a
// fork-only file, never part of an upstream slice, and keyed by raw capture
// key by design. That exclusion is a real residual and is named here rather
// than left implicit.

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "harvested");
const B64_RUN = /[A-Za-z0-9+/]{201,}/;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
// Stated from the directive, not read back from tools/harvest.mjs: an
// expectation with the same parentage as the code pins the bug it should
// catch (docs/dev-loop.md, "Adding a check").
const EPOCH_START = Date.parse("2000-01-01T00:00:00.000Z");
const EPOCH_END = Date.parse("2001-01-01T00:00:00.000Z");

function committedFixtures() {
  return readdirSync(FIXTURE_DIR)
    .filter((f) => !f.startsWith("LEDGER-"))
    .filter((f) => f.endsWith(".json") || f.endsWith(".jsonl"))
    .sort()
    .map((f) => {
      const text = readFileSync(join(FIXTURE_DIR, f), "utf-8");
      const docs = f.endsWith(".jsonl")
        ? text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l))
        : [JSON.parse(text)];
      return { name: f, docs };
    });
}

// Every string VALUE in a fixture, with the path that reaches it, plus the
// object that owns it — the scan has to see structure (`source.data`) as well
// as bytes.
function* strings(node, path = "$") {
  if (typeof node === "string") return yield { path, value: node, owner: null };
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) yield* strings(node[i], `${path}[${i}]`);
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string") yield { path: `${path}.${k}`, value: v, owner: node, key: k };
      else yield* strings(v, `${path}.${k}`);
    }
  }
}

test("absence: the committed corpus is non-empty and every fixture parses (the scan cannot pass vacuously)", () => {
  const fixtures = committedFixtures();
  assert.ok(fixtures.length >= 8, `expected the harvested corpus, found ${fixtures.length} fixture(s)`);
  let scanned = 0;
  for (const { docs } of fixtures) for (const doc of docs) for (const _ of strings(doc)) scanned++;
  assert.ok(scanned > 1000, `expected thousands of strings to scan, saw ${scanned}`);
});

test("absence (a): no committed fixture carries a base64 run longer than 200 characters", () => {
  const hits = [];
  for (const { name, docs } of committedFixtures()) {
    for (const doc of docs) {
      for (const { path, value } of strings(doc)) {
        const m = B64_RUN.exec(value);
        if (m) hits.push(`${name} ${path} (${m[0].length} chars)`);
      }
    }
  }
  assert.deepEqual(hits, [], "a long base64 run is an unsanitized payload");
});

test("absence (b): every source.data in the corpus is a data_ token", () => {
  const hits = [];
  let seen = 0;
  for (const { name, docs } of committedFixtures()) {
    for (const doc of docs) {
      for (const { path, value, key, owner } of strings(doc)) {
        if (key !== "data" || !owner || !path.endsWith(".source.data")) continue;
        seen++;
        if (!DATA_TOKEN.test(value)) hits.push(`${name} ${path} (${value.length} chars)`);
      }
    }
  }
  assert.deepEqual(hits, [], "a raw source.data is the measured 2026-07-31 image gap");
  assert.ok(seen > 0, "the corpus must still contain nested-payload blocks, or this asserts nothing");
});

test("absence (c): every whole-string ISO instant lies in the fixed-epoch family", () => {
  const hits = [];
  let seen = 0;
  for (const { name, docs } of committedFixtures()) {
    for (const doc of docs) {
      for (const { path, value } of strings(doc)) {
        if (!ISO_INSTANT.test(value)) continue;
        seen++;
        const t = Date.parse(value);
        if (!(t >= EPOCH_START && t < EPOCH_END)) hits.push(`${name} ${path} = ${value}`);
      }
    }
  }
  assert.deepEqual(hits, [], "a live wall-clock timestamp survived the rebase");
  assert.ok(seen > 0, "fixtures carry timestamps; seeing none means the scan is broken");
});

test("absence (d): no 8-4-4-4-12 UUID appears anywhere in the corpus", () => {
  const hits = [];
  for (const { name, docs } of committedFixtures()) {
    for (const doc of docs) {
      for (const { path, value } of strings(doc)) {
        const m = UUID.exec(value);
        if (m) hits.push(`${name} ${path} = …${m[0]}…`);
      }
    }
  }
  assert.deepEqual(hits, [], "a session UUID is a live capture identifier");
});

// A FIFTH absence class, beyond the directive's four. The directive names
// the classes that make the two IMAGE/identifier findings mechanical; the
// third finding it lists (pr-prep-report.md gap 2 — flap kept operator hook
// prose raw, and the same sweep found oscillation raw end to end) belongs to
// no class above, so it would still be found only by hand. The mechanism is
// the deliverable, not the hand-derivation (docs/dev-loop.md).
//
// DEFINITION (tools/harvest.mjs's sanitization header): every text a capture
// carries is replaced by a deterministic token of its hash,
// `t_<sha256-prefix-12>_<length>`, per "\n\n" segment, and a
// <system-reminder> wrapper survives verbatim around a tokenized inner text.
// So a content-bearing string in a committed fixture is well-formed iff, once
// unwrapped, every segment is empty or a token.
//
// Two accepted non-token literals, both content-free by construction:
// "REDACTED" (tool-input key shapes, and the pre-2026-07-30 fixed-constant
// reminder scrub still present in the three legacy `harvested-*.jsonl`
// fixtures) and the empty string.

const CONTENT_KEYS = new Set(["text", "thinking", "content"]);
const WRAP = /^<system-reminder>\n([\s\S]*)\n<\/system-reminder>\s*$/;

test("absence (e): every content string in the corpus is a token, not capture prose", () => {
  const hits = [];
  let seen = 0;
  for (const { name, docs } of committedFixtures()) {
    for (const doc of docs) {
      for (const { path, value, key } of strings(doc)) {
        if (!CONTENT_KEYS.has(key)) continue;
        if (value === "" || value === "REDACTED") continue;
        seen++;
        const inner = WRAP.exec(value)?.[1] ?? value;
        if (inner === "REDACTED") continue;
        if (!wellFormed(inner)) hits.push(`${name} ${path} (${value.length} chars): ${JSON.stringify(value.slice(0, 60))}`);
      }
    }
  }
  assert.deepEqual(hits, [], "raw capture prose in a public-repo fixture");
  assert.ok(seen > 500, `expected the corpus's content strings, saw ${seen}`);
});

test("absence (d): no fixture FILENAME carries a UUID or a UUID prefix segment", () => {
  // The filename is as public as the content. DEFINITION (settled design 2):
  // the capture-derived name carries the key's `s-<sha12>` token in place of
  // the session UUID segment — 12 hex after `s-`, never 8 and never a dashed
  // UUID, so a name can never be matched back to a session by prefix.
  const bad = readdirSync(FIXTURE_DIR)
    .filter((f) => !f.startsWith("LEDGER-"))
    .filter((f) => UUID.test(f) || /(^|[^0-9a-f])s-[0-9a-f]{8}(?![0-9a-f])/.test(f));
  assert.deepEqual(bad, [], "fixture names must carry the s-<sha12> token, not a session UUID or its prefix");
});
