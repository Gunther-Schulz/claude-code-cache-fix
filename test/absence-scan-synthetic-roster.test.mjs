// The leak scan reported `capture-uuid` on UUIDs this repo has EXPLICITLY
// declared synthetic, because the declaration and the guard were not
// connected.
//
// The repo already had the right design: `SOURCE_UUID_ALLOWLIST` is a roster
// of every UUID this repo's own source is allowed to carry, and a roster test
// ("source: every UUID in a tracked SOURCE_SCANNABLE file is on the synthetic
// allowlist") independently re-verifies it on every `npm test`. What was
// missing is that `absence-scan` itself never READ the roster. Instead a
// single ALLOWLIST entry exempted one filename — `test/absence-scan.test.mjs`
// — with a comment making exactly the right argument for why exempting it
// "trades nothing": the roster test still catches a genuinely new UUID.
//
// That argument is not file-specific, and the guard behaved as though it
// were. MEASURED 2026-08-15: `test/bust-triage-key-flip.test.mjs` carries
// `11111111-2222-3333-4444-555555555555` — a roster member, added
// deliberately in a 2026-08-05 scrub precisely so a synthetic would be
// "unmistakable" — and absence-scan reports three `capture-uuid` findings on
// it. Those got past the push hook only because the identical bytes already
// sit at the same path in published history; a NEW file adopting the same
// declared convention would be BLOCKED.
//
// A guard that fires on legitimate work trains the override reflex that kills
// it (dev-loop.md), and the repair the rules prescribe is a declared
// exemption the guard itself verifies — never a softened predicate. The
// roster IS that declaration; this connects it to the guard, and the scope is
// deliberately narrow: SOURCE text only, which is exactly the scope the
// roster test covers. Fixtures, ledgers and captures are untouched.

import { test } from "node:test";
import assert from "node:assert/strict";

import { scanSourceText, SYNTHETIC_UUID_ALLOWLIST } from "../tools/absence-scan.mjs";

// ASSEMBLED AT RUNTIME, and that is not a stylistic choice. This control must
// be a UUID the roster does NOT carry, while the roster test asserts that
// every literal UUID in tracked source IS on the roster — so a literal here
// could not satisfy both. Building it from parts keeps the file free of any
// UUID-shaped literal, which is also what stops this test from becoming the
// leak it exists to prevent. (Caught by this very change on its own first
// run: the draft used a real session id from the capture under investigation.)
const REAL_LOOKING = ["0a1b2c3d", "4e5f", "4a6b", "8c7d", "9e8f00112233"].join("-");

test("INSTRUMENT — the roster is non-empty and does not contain the real-looking control", () => {
  // Without this, both arms below could pass because the roster is empty or
  // because it swallows everything.
  assert.ok(SYNTHETIC_UUID_ALLOWLIST.size >= 5, "the roster must actually carry the declared synthetics");
  assert.equal(SYNTHETIC_UUID_ALLOWLIST.has(REAL_LOOKING), false,
    "the control must NOT be on the roster, or the negative arm proves nothing");
});

test("BITE — a DECLARED synthetic UUID in source is not reported", () => {
  const declared = [...SYNTHETIC_UUID_ALLOWLIST][0];
  const r = scanSourceText(`const SID = "${declared}";\n`, "test/some-new-file.test.mjs", true);
  assert.deepEqual(r.findings, [],
    "a UUID the repo has declared synthetic must not fire — the declaration is the exemption");
});

test("CONTROL — an UNDECLARED UUID in source is still reported", () => {
  // The half that must never soften. This is the whole reason the class
  // exists, and it is the arm that would silently disappear if the exemption
  // were written as a broadened predicate instead of a roster lookup.
  const r = scanSourceText(`const SID = "${REAL_LOOKING}";\n`, "test/some-new-file.test.mjs", true);
  assert.deepEqual(r.findings.map((f) => f.class), ["capture-uuid"],
    "a UUID that is not on the roster must still be caught");
});

test("CONTROL — a line mixing a declared and an undeclared UUID is still reported", () => {
  // The exemption is per-LINE because the scanner reports per-line, so a
  // roster member sitting beside a real identifier must not launder it.
  const declared = [...SYNTHETIC_UUID_ALLOWLIST][0];
  const r = scanSourceText(`const pair = ["${declared}", "${REAL_LOOKING}"];\n`, "test/some-new-file.test.mjs", true);
  assert.deepEqual(r.findings.map((f) => f.class), ["capture-uuid"],
    "one declared UUID on the line must not excuse an undeclared one beside it");
});

test("CONTROL — the capture-key-prefix class is untouched by the roster", () => {
  // Class-scoped, like the filename exemption it generalises: only
  // capture-uuid consults the roster.
  const shortKey = "s-" + "0a1b2c3d"; // split for the same reason as above
  const r = scanSourceText(`const key = "${shortKey}";\n`, "test/some-new-file.test.mjs", true);
  assert.deepEqual(r.findings.map((f) => f.class), ["capture-key-prefix"]);
});

test("CONTROL — the real key-flip test file stops firing, and that is the motivating case", () => {
  // The measured instance, asserted against the roster rather than against a
  // remembered line number.
  const line = '  const bust = { t: sec("2026-08-08T09:59:54Z"), s: "11111111-2222-3333-4444-555555555555" };\n';
  const r = scanSourceText(line, "test/bust-triage-key-flip.test.mjs", true);
  assert.deepEqual(r.findings, [], "the declared synthetic in the key-flip suite must be silent");
});
