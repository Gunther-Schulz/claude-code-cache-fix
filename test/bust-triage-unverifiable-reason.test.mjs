// An UNVERIFIABLE verdict must state a cause the tool actually TESTED.
//
// The incident, found 2026-08-06 by using the tool on a real event and again
// on 2026-08-07T01:00:55Z: it answered
//   UNVERIFIABLE — no capture pair (capture off, or rotated)
//   WARN transcript — no diagnostic found (older CC, or transcript rotated)
// and every one of those four disjuncts was false. The capture existed,
// covered the window (its last write is hours AFTER the busting timestamp),
// and a replay over it found same-conversation pairs; the transcript sat on
// disk at 55 lines. Two guessed reasons for a state the tool had no word for:
// capture PRESENT, window COVERED, and its own pairing step nonetheless
// returning nothing.
//
// This is dev-loop's "a checker has THREE answers, not two" one level in: the
// third answer is present but its EXPLANATION is a guess, and a guessed reason
// reads exactly like a measured one. The reason text is what a reader acts on.
//
// The expectations come from the DESIGN's definition of the three ordered
// checks (BACKLOG: capture absent / present-but-window-not-covered /
// present-and-covered-but-no-pair-found, the third naming the pairing input it
// had), never from the implementation's branch list.
//
// RED arrangement: these bites run against the CURRENT implementation with one
// named condition removed at a time (see the mutation notes on each), because
// the pre-change implementation had no reason machinery to run them against at
// all — a module-load red proves a check is new, not that it discriminates.
// The whole-file red that IS available is the live one, recorded in the
// dispatch report: before this change `--at 2026-08-07T01:00:55Z` printed both
// disjunctions above; after it, the measured third case.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { capturePairResult, capturePair, transcriptMiss } from "../tools/bust-triage.mjs";

const msg = (t) => ({ role: "user", content: [{ type: "text", text: t }] });
/** A capture whose first message differs per `conv`, so records group by it. */
const req = (ts, conv, n) => JSON.stringify({
  ts, id: ts,
  body: { messages: [msg("conv-" + conv), ...Array.from({ length: n - 1 }, (_, i) => msg("m" + i))] },
});

function capture(records, key = "s-unv0001") {
  const dir = mkdtempSync(join(tmpdir(), "bt-unv-"));
  writeFileSync(join(dir, `${key}-requests.jsonl`), records.join("\n") + "\n");
  return dir;
}
const at = (iso) => Date.parse(iso) / 1000;

// --- check 1 of 3: the capture file is not there ---

test("BITE — an absent capture reports ABSENT, and says only that", async () => {
  const dir = mkdtempSync(join(tmpdir(), "bt-unv-empty-"));
  const r = await capturePairResult("nosuchsession", at("2026-08-07T01:00:55Z"), dir);
  assert.equal(r.ok, false);
  assert.equal(r.code, "capture-absent");
  assert.match(r.detail, /no capture file/i);
  // It must NOT claim anything about coverage or pairing, which it never tested.
  assert.doesNotMatch(r.detail, /covers the stamp|conversation has/,
    `an absent capture cannot support a coverage claim: ${r.detail}`);
});

// THE CONTROL the entry names: "a genuinely absent capture must still report
// absent." The fix must not turn every failure into the third case.
test("CONTROL — a genuinely absent capture still reports absent, not 'no pair'", async () => {
  const dir = mkdtempSync(join(tmpdir(), "bt-unv-empty2-"));
  const r = await capturePairResult("gone", at("2026-08-07T01:00:55Z"), dir);
  assert.equal(r.code, "capture-absent");
  assert.notEqual(r.code, "no-pair-in-conversation");
});

// --- check 2 of 3: present, but the stamp is not covered ---

test("BITE — a capture that starts after the bust says the window is not covered", async () => {
  // Every record is LATER than the stamp: the busting request is not in this
  // file, and that is a different statement from "no pair".
  const dir = capture([
    req("2026-08-07T02:00:00.000Z", "A", 3),
    req("2026-08-07T02:00:10.000Z", "A", 4),
  ]);
  const r = await capturePairResult("unv0001", at("2026-08-07T01:00:55Z"), dir);
  assert.equal(r.code, "window-not-covered");
  assert.match(r.detail, /holds no request at or before/i);
  assert.match(r.detail, /2 requests/, "the reason names the input it had");
});

// The over-firing guard. A bust on a session's FINAL request has no record
// after it — entirely healthy — and a coverage rule demanding one would fire
// on it. A check that fires on a non-defect is broken (dev-loop, "Adding a
// check"), so this pins that the healthy case still pairs.
test("CONTROL — a bust on the session's LAST request is not 'window not covered'", async () => {
  const dir = capture([
    req("2026-08-07T00:59:00.000Z", "A", 3),
    req("2026-08-07T01:00:00.000Z", "A", 4),   // the busting request; nothing after it
  ]);
  const r = await capturePairResult("unv0001", at("2026-08-07T01:00:55Z"), dir);
  assert.equal(r.ok, true, `healthy last-request bust misreported: ${r.code} — ${r.detail}`);
  assert.equal(r.after.ts, "2026-08-07T01:00:00.000Z");
});

// --- check 3 of 3: present, covered, and STILL no pair. The state that had
// no word, and the one the live 2026-08-07 event landed on. ---

test("BITE — present + covered + no predecessor is its OWN reason, naming its input", async () => {
  // The selected request is the first of its own conversation: an interleaved
  // co-tenant sits in the file, but nothing earlier in the SAME conversation.
  const dir = capture([
    req("2026-08-07T00:59:00.000Z", "OTHER", 5),
    req("2026-08-07T01:00:00.000Z", "A", 3),   // first of conversation A
  ]);
  const r = await capturePairResult("unv0001", at("2026-08-07T01:00:55Z"), dir);
  assert.equal(r.ok, false);
  assert.equal(r.code, "no-pair-in-conversation");
  // The entry's requirement: "The third is its own reason string and names the
  // pairing input it had."
  assert.match(r.detail, /covers the stamp/i, "it must state that coverage was TESTED, not assumed");
  assert.match(r.detail, /selected the request at 2026-08-07T01:00:00\.000Z/,
    `the reason must name WHICH request it selected: ${r.detail}`);
  assert.match(r.detail, /none earlier/i);
  // …and it must not recite the disjunction it replaced.
  assert.doesNotMatch(r.detail, /capture off|rotated/i,
    `the replaced guess survived into the new reason: ${r.detail}`);
});

// The class property, and the entry's own done-criterion: "no UNVERIFIABLE row
// states a cause the tool did not test." Mechanized as — a reason may name a
// cause only when the branch that reports it actually established it. The two
// guessed causes are "capture off" and "rotated"; neither is ever tested, so
// neither may appear in ANY reason string.
test("BITE — no computed reason recites an untested cause", async () => {
  const cases = [
    ["absent", mkdtempSync(join(tmpdir(), "bt-unv-none-")), []],
    ["uncovered", null, [req("2026-08-07T02:00:00.000Z", "A", 3)]],
    ["no-pair", null, [req("2026-08-07T01:00:00.000Z", "A", 3)]],
  ];
  for (const [name, preDir, recs] of cases) {
    const dir = preDir ?? capture(recs);
    const r = await capturePairResult(preDir ? "nosuch" : "unv0001", at("2026-08-07T01:00:55Z"), dir);
    assert.equal(r.ok, false, name);
    // "rotated" is permitted ONLY on the absent branch, where the file really
    // is missing and rotation is a named possibility rather than a claim
    // about a file the tool just read.
    if (r.code !== "capture-absent") {
      assert.doesNotMatch(r.detail, /rotated|capture off/i,
        `${name}: reason claims a cause the branch never tested: ${r.detail}`);
    }
  }
});

// --- the back-compatible wrapper ---
//
// `tools/dossier.mjs` reads capturePair as truthy-pair-or-null and would
// dereference a failure object. The wrapper is what keeps that contract, so
// it gets its own bite rather than being assumed.
test("capturePair still returns null (never a failure object) so dossier's `if (!pair)` holds", async () => {
  const dir = capture([req("2026-08-07T01:00:00.000Z", "A", 3)]);
  assert.equal(await capturePair("unv0001", at("2026-08-07T01:00:55Z"), dir), null);
  const ok = capture([
    req("2026-08-07T00:59:00.000Z", "A", 3),
    req("2026-08-07T01:00:00.000Z", "A", 4),
  ], "s-unv0002");
  const pair = await capturePair("unv0002", at("2026-08-07T01:00:55Z"), ok);
  assert.ok(pair && pair.before && pair.after, "the success shape is unchanged");
  assert.equal(pair.ok, undefined, "and carries no result-form fields dossier would not expect");
});

// --- the transcript half of the same defect ---

function projects(files) {
  const dir = mkdtempSync(join(tmpdir(), "bt-proj-"));
  for (const [sid, records] of Object.entries(files)) {
    const p = join(dir, "some-project");
    mkdirSync(p, { recursive: true });
    writeFileSync(join(p, `${sid}.jsonl`), records.map((r) => JSON.stringify(r)).join("\n") + "\n");
  }
  return dir;
}
const diag = (cc, type) => ({
  message: { usage: { cache_creation_input_tokens: cc },
             diagnostics: { cache_miss_reason: { type, cache_missed_input_tokens: 1 } } },
});

test("BITE — a transcript on disk is never reported as 'rotated'", () => {
  // THE live shape, 2026-08-07: 327 records, 5 diagnostics, none matching the
  // bust's cache_creation. The old text blamed "older CC, or transcript
  // rotated"; both false.
  const dir = projects({ S1: [diag(339, "messages_changed"), diag(427535, "messages_changed")] });
  const r = transcriptMiss("S1", 335933, dir);
  assert.equal(r.code, "no-matching-diagnostic");
  assert.doesNotMatch(r.detail, /rotated|older CC/i,
    `a transcript the tool just read cannot be reported missing: ${r.detail}`);
  assert.match(r.detail, /335933/, "the reason names the value it looked for");
  assert.match(r.detail, /339/, "and what it found instead");
});

test("a transcript with no diagnostics at all is its own case, not a match failure", () => {
  const dir = projects({ S1: [{ message: { usage: { cache_creation_input_tokens: 5 } } }] });
  const r = transcriptMiss("S1", 335933, dir);
  assert.equal(r.code, "no-diagnostics");
  assert.match(r.detail, /no cache_miss_reason/i);
});

test("CONTROL — a genuinely absent transcript still reports absent", () => {
  const dir = projects({ OTHER: [diag(1, "x")] });
  const r = transcriptMiss("S1", 335933, dir);
  assert.equal(r.code, "transcript-absent");
  assert.match(r.detail, /no transcript for this session/i);
});
