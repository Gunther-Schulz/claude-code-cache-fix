// findAbsorptionMisses — the check that would have caught the 2026-08-05
// 349k bust, which replayed EXIT 0 on all five gates with every verdict
// correct.
//
// The bite targets the two ways this check was wrong when first written,
// because both produced a SILENT miss — the function ran, returned rows, and
// simply did not include the one that mattered. A test asserting only "it
// finds something" would have passed against both bugs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFile, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpDir } from "../tools/tmpdir.mjs";

// Namespace import: the CLI-level bites below spawn tools/replay.mjs as a
// subprocess and never touch these bindings, but a broken export on this
// module must not fail the WHOLE file at ESM link time and take the
// pre-existing bites down with it (a named import of a missing binding is a
// SyntaxError before a single test runs).
import * as replayModule from "../tools/replay.mjs";
const { findAbsorptionMisses, compactEntry } = replayModule;

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPLAY = join(__dirname, "..", "tools", "replay.mjs");

// Entries in the compact shape findAbsorptionMisses consumes. `inHash[0]` is
// the conversation identity, so both entries must share it to be paired.
const CONV = "conv0";
const entry = ({ n, inHash, outHash, outHashNoCC, joinMoves, movedFresh = 0, action = "normalized" }) => ({
  n, ts: `2026-08-05T00:00:0${n}.000Z`, key: "k",
  inHash, outHash,
  // Omitted by default on purpose: an entry that never carried the field is
  // the "could not verify" case, and the bite below pins that it reads as
  // null rather than as a measured false.
  ...(outHashNoCC === undefined ? {} : { outHashNoCC }),
  action,
  stats: {
    movedFresh,
    suppressions: joinMoves.map((index) => ({ index, kind: "join-move", hash: "h" })),
  },
});

// prev already had a join-move at 2; cur re-fires it AND freshly absorbs at 7.
// The forwarded pair diverges at 6 — inside the fresh absorption, before it.
const REFIRE_SHAPE = () => {
  const inPrev  = [CONV, "a", "b", "c", "d", "e", "f", "g", "h"];
  const inCur   = [CONV, "a", "b", "c", "d", "e", "f", "G", "h"]; // CC diverges at 7
  const outPrev = [CONV, "a", "b", "c", "d", "e", "f", "g", "h"];
  const outCur  = [CONV, "a", "b", "c", "d", "e", "X", "g", "h"]; // ours at 6
  return [
    entry({ n: 1, inHash: inPrev, outHash: outPrev, joinMoves: [2] }),
    entry({ n: 2, inHash: inCur, outHash: outCur, joinMoves: [2, 7], movedFresh: 1, action: "reset" }),
  ];
};

test("a re-fired absorption does not mask a fresh one — the measured bust shape", () => {
  // THE FIRST BUG. `suppressions` does not distinguish a fresh recognition
  // from a re-fire. Taking the list at face value and comparing the divergence
  // against its LOWEST index compares against something absorbed a request
  // earlier — on the real capture the re-fires sat at 180/221 and the fresh
  // ones at 370/402, so the row for the busting request was silently dropped.
  const rows = findAbsorptionMisses(REFIRE_SHAPE());
  assert.equal(rows.length, 1, "the fresh absorption at 7 must be reported");
  assert.deepEqual(rows[0].absorbedFreshAt, [7],
    "only the FRESH index — 2 was already being substituted before this request");
  assert.equal(rows[0].forwardedDivergence, 6);
});

test("the row says whose defect it is, from the two divergence indices", () => {
  const [row] = findAbsorptionMisses(REFIRE_SHAPE());
  assert.equal(row.inputDivergence, 7, "CC's own arrays first differ at 7");
  assert.equal(row.ours, true,
    "we diverged at 6 while CC's input was identical there — ours by construction");
});

test("an ordinary tail append after an absorption is NOT a miss", () => {
  // The control that keeps this from firing on every request: a divergence
  // PAST the absorbed region is the conversation growing, not a failed
  // absorption. Without it the check would report constantly and train its
  // reader to ignore it — this repo's own recurring defect.
  const inPrev  = [CONV, "a", "b", "c"];
  const inCur   = [CONV, "a", "b", "c", "new"];
  const outPrev = [CONV, "a", "b", "c"];
  const outCur  = [CONV, "a", "b", "c", "new"];
  const rows = findAbsorptionMisses([
    entry({ n: 1, inHash: inPrev, outHash: outPrev, joinMoves: [] }),
    entry({ n: 2, inHash: inCur, outHash: outCur, joinMoves: [1], movedFresh: 1 }),
  ]);
  assert.deepEqual(rows, [], "the absorbed slot held; the array merely grew");
});

test("an absorption whose prefix survives byte-identically reports nothing", () => {
  const same = [CONV, "a", "b", "c"];
  const rows = findAbsorptionMisses([
    entry({ n: 1, inHash: same, outHash: same, joinMoves: [] }),
    entry({ n: 2, inHash: same, outHash: same, joinMoves: [2], movedFresh: 1 }),
  ]);
  assert.deepEqual(rows, [], "identical forwarded arrays are the success case");
});

test("the row carries prevN — which predecessor the divergence was measured against", () => {
  // The row already names WHERE the divergence was measured (n) but not
  // against WHICH predecessor, and every consumer has to re-derive it.
  // findEditPositions already carries prevN for the same reason.
  const [row] = findAbsorptionMisses(REFIRE_SHAPE());
  assert.equal(row.prevN, 1, "cur is n:2, its predecessor in the group is n:1");
});

// --- cacheControlOnly: is the divergence a moved BREAKPOINT or real content?
//
// DEFINITION, written before the assertions: a forwarded pair that is
// identical once every cache_control key is dropped carries the same
// model-visible bytes; the API keys its cache on content and treats a
// cache_control marker as the designation of a write point, so a pair
// differing only there re-bills nothing. Measured 2026-08-05: 12 of the first
// 13 rows classified by hand were exactly that shape — our own
// cache-control-normalize (order 400) moving its one canonical marker to the
// new last user message — and the worktime ledger records no cold event
// within +/-180 s of any of them, over all 83 events, while the same query
// lands both 349k events on the one row that was real.
//
// The hash this reads is deliberately NOT outHashSem: that one also folds a
// bare string into a one-block array, so it would report the row-4 CONTAINER
// flip as "cache_control only" — exempting the very defect the check exists
// for. Container-preserving strip, or nothing.
const CC_SHAPE = () => {
  const inPrev = [CONV, "a", "b", "c", "d", "e", "f", "g", "h"];
  const inCur  = [CONV, "a", "b", "c", "d", "e", "f", "G", "h"];
  const outPrev = [CONV, "a", "b", "c", "d", "e", "f", "g", "h"];
  const outCur  = [CONV, "a", "b", "c", "d", "e", "X", "g", "h"]; // marker left index 6
  // Same two messages with cache_control stripped: index 6 is the SAME message.
  const noCC = [CONV, "a", "b", "c", "d", "e", "f", "g", "h"];
  return [
    entry({ n: 1, inHash: inPrev, outHash: outPrev, outHashNoCC: noCC, joinMoves: [2] }),
    entry({ n: 2, inHash: inCur, outHash: outCur, outHashNoCC: noCC, joinMoves: [2, 7], movedFresh: 1 }),
  ];
};

test("a divergence that vanishes once cache_control is stripped -> cacheControlOnly", () => {
  const [row] = findAbsorptionMisses(CC_SHAPE());
  assert.equal(row.forwardedDivergence, 6, "the raw-byte divergence is still reported");
  assert.equal(row.cacheControlOnly, true,
    "the pair is identical at 6 once the marker is dropped — a moved breakpoint, not a stale message");
});

test("CONTROL: a real content divergence is NOT cacheControlOnly — the row-4 shape", () => {
  // The discriminator that keeps this annotation from swallowing the defect
  // the check was built for: a container flip survives the strip, so its
  // stripped hashes still differ at the divergence index.
  const inPrev = [CONV, "a", "b", "c", "d", "e", "f", "g", "h"];
  const inCur  = [CONV, "a", "b", "c", "d", "e", "f", "G", "h"];
  const outPrev = [CONV, "a", "b", "c", "d", "e", "f", "g", "h"];
  const outCur  = [CONV, "a", "b", "c", "d", "e", "X", "g", "h"];
  const noCCPrev = [CONV, "a", "b", "c", "d", "e", "f", "g", "h"];
  const noCCCur  = [CONV, "a", "b", "c", "d", "e", "X", "g", "h"]; // still differs at 6
  const [row] = findAbsorptionMisses([
    entry({ n: 1, inHash: inPrev, outHash: outPrev, outHashNoCC: noCCPrev, joinMoves: [2] }),
    entry({ n: 2, inHash: inCur, outHash: outCur, outHashNoCC: noCCCur, joinMoves: [2, 7], movedFresh: 1 }),
  ]);
  assert.equal(row.cacheControlOnly, false, "content changed, not just the marker");
});

test("an entry with no outHashNoCC reports cacheControlOnly null, never false", () => {
  // The three-answer rule at field level: "the producer never emitted this"
  // and "measured, and it is not cache_control only" are different statements,
  // and collapsing them is how absence of evidence wears a verdict's clothes.
  const [row] = findAbsorptionMisses(REFIRE_SHAPE());
  assert.equal(row.cacheControlOnly, null);
});

test("compactEntry's outHashNoCC actually strips — and does NOT fold the container", () => {
  // The PRODUCER side. The three bites above feed outHashNoCC as a fixture, so
  // they say nothing about whether compactEntry computes it; disabling the
  // strip leaves all three green. This one is red under that mutation.
  //
  // Both halves are load-bearing and they pull opposite ways: the marker case
  // must hash EQUAL (else the annotation never fires) and the row-4 container
  // flip must hash DIFFERENT (else the annotation exempts the defect).
  const withMarker = { role: "user", content: [{ type: "text", text: "same", cache_control: { type: "ephemeral", ttl: "1h" } }] };
  const without = { role: "user", content: [{ type: "text", text: "same" }] };
  const asString = { role: "user", content: "same" };

  const e = compactEntry({ n: 1, ts: "t", key: "k", inMsgs: [], outMsgs: [withMarker, without, asString] });
  assert.equal(e.outHashNoCC[0], e.outHashNoCC[1],
    "a marker on an otherwise identical message must vanish from the hash");
  assert.notEqual(e.outHash[0], e.outHash[1],
    "raw outHash still sees it — detection stays byte-exact");
  assert.notEqual(e.outHashNoCC[1], e.outHashNoCC[2],
    "string content vs a one-block text array is a CONTAINER difference and must survive the strip");
});

test("no fresh absorption means no row, however badly the prefix diverged", () => {
  // Scope discipline: this check answers "did an absorption that RAN also
  // ABSORB". A divergence with no absorption claimed is some other check's
  // question, and answering it here would blur what a row means.
  const inPrev  = [CONV, "a", "b", "c"];
  const inCur   = [CONV, "Z", "b", "c"];
  const rows = findAbsorptionMisses([
    entry({ n: 1, inHash: inPrev, outHash: inPrev, joinMoves: [2] }),
    entry({ n: 2, inHash: inCur, outHash: inCur, joinMoves: [2], movedFresh: 0 }),
  ]);
  assert.deepEqual(rows, [], "re-fire only, no fresh recognition — not this check's row");
});

// --- The TEXT report — BACKLOG "READY — `findAbsorptionMisses` runs on
// every replay and prints on none" ---
//
// The rows above prove the FUNCTION finds misses. None of them prove a human
// running `node tools/replay.mjs <capture>` (no --json) ever sees one — and
// until this fix, none did: the computation ran unconditionally, the text
// report carried no absorption section at all. So this spawns the REAL CLI
// against a REAL pipeline run (insertion-normalization's actual join-move
// recognition, gated on live via --env, not a fabricated `stats` object) —
// the only way to exercise what the text report actually prints, the same
// reasoning replay-excerpt-record-identity.test.mjs gives for spawning
// rather than importing.
//
// Both fixtures are SYNTHESIZED (never a live capture, per this repo's
// publication bar) from the inline/standalone reminder-merge shape
// insertion-moved-fresh.test.mjs already proved produces a real, freshly
// recognized join-move — reconstructed here rather than imported, same
// reason that file gives: those builders are local consts there, not
// exports.

const REM = "PreToolUse:Edit hook additional context: check the date";
const WRAPPED = `<system-reminder>\n${REM}\n</system-reminder>`;
const NUDGE = "The task tools haven't been used recently.";

const toolUse = (id, input = {}) => ({ role: "assistant", content: [{ type: "tool_use", id, name: "Edit", input }] });
const toolResult = (id, extra = []) => ({
  role: "user",
  content: [{ type: "tool_result", tool_use_id: id, content: "out" }, ...extra],
});
const txt = (t) => ({ type: "text", text: t });

// The INLINE leg CC sends first: the reminder rides inside the tool_result,
// the nudge arrives as its own system message right after.
const inlineLeg = (tu1Input = {}) => [
  { role: "user", content: [txt("q1")] },
  toolUse("tu1", tu1Input),
  toolResult("tu1", [txt(WRAPPED)]),
  { role: "system", content: NUDGE },
  toolUse("tu2"),
  toolResult("tu2"),
  { role: "assistant", content: [txt("a")] },
];

// The STANDALONE leg: CC merges the reminder and the nudge into one message —
// the shape insertion-normalization's join-move recognizes and substitutes
// for, at index 3.
const standaloneLeg = (tu1Input = {}) => [
  { role: "user", content: [txt("q1")] },
  toolUse("tu1", tu1Input),
  toolResult("tu1"),
  { role: "system", content: `${REM}\n\n${NUDGE}` },
  toolUse("tu2"),
  toolResult("tu2"),
  { role: "assistant", content: [txt("a")] },
  { role: "user", content: [txt("q2")] },
];

const reqLine = (ts, id, sid, messages) => JSON.stringify({
  ts, id, sid, key: `s-${sid}`,
  headers: { "anthropic-beta": null, "session-id": sid },
  body: { model: "claude-opus-5", system: [{ type: "text", text: "sys" }], messages, tools: [{ name: "Edit", input_schema: { type: "object" } }] },
});

async function runReplay(dir, messagesB, { tu1InputA = {}, tu1InputB = {} } = {}) {
  const file = join(dir, "capture.jsonl");
  const lines = [
    reqLine("2026-08-06T10:00:00.000Z", "req-A", "sid-main", inlineLeg(tu1InputA)),
    reqLine("2026-08-06T10:00:02.000Z", "req-B", "sid-main", messagesB(tu1InputB)),
  ];
  await writeFile(file, lines.join("\n") + "\n");
  const run = spawnSync(process.execPath, [
    REPLAY, file,
    "--env", "CACHE_FIX_INSERTION_NORMALIZE=1",
    "--env", "CACHE_FIX_VOLATILE_PIN=1",
  ], { encoding: "utf-8", env: { PATH: process.env.PATH } });
  return run.stdout ?? "";
}

test("BITE — a fixture with a KNOWN absorption miss shows the row, all three numbers, in plain text", async () => {
  const dir = await tmpDir("absorption-text-");
  try {
    // request B's tu1 carries an EARLIER edit (`{ edited: true }`) that the
    // join-move machinery does not cover — a real, mechanically produced
    // miss: the fresh recognition fires at index 3, and the forwarded pair
    // still diverges at index 1, inside the region the absorption claimed.
    // Empirically confirmed (this dispatch, against this exact fixture)
    // via --json before this fix: absorbedFreshAt=[3], forwardedDivergence=1,
    // inputDivergence=1, ours=false, action="reset"/edit-shaped.
    const out = await runReplay(dir, standaloneLeg, { tu1InputB: { edited: true } });
    assert.match(out, /\nabsorption misses \([^)]*\): 1\n/,
      `expected exactly one absorption miss reported, got:\n${out}`);
    assert.match(out, /n=0->1 ts=\S+ absorbedAt=\[3\] forwardedDivergence=1 ours=false/,
      `expected the row to carry absorbedAt, forwardedDivergence and ours, got:\n${out}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("BITE — a fixture with NO absorption miss prints an explicit 0 line", async () => {
  const dir = await tmpDir("absorption-text-zero-");
  try {
    // Same reminder-merge shape, no earlier edit: the absorption holds the
    // whole forwarded prefix byte-stable — the success case, confirmed via
    // --json before this fix (absorptionMisses: [], violations: []).
    const out = await runReplay(dir, standaloneLeg);
    assert.match(out, /\nabsorption misses \([^)]*\): 0\n/,
      `expected the zero-included line even though nothing missed, got:\n${out}`);
    assert.doesNotMatch(out, /\n  n=\S+ absorbedAt=/,
      `expected no row lines under a zero count, got:\n${out}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
