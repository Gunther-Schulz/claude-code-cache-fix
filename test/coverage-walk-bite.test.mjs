// coverage-walk's bite — one mutation per NAMED condition, each shown red on
// its own, plus the control that makes the reds mean something.
//
// WHAT THIS IS THE BITE FOR. `tools/coverage-walk.mjs` answers "is this
// content on the wire" by walking the forwarded array. The defect it
// replaces is a substring scan, which answers a narrower question: it finds
// content only where it survives as ONE contiguous piece in ONE block, and
// returns a definite REAL-LOSS with a true stated basis wherever it does not.
//
// THE KNOWN POSITIVE, and what these fixtures freeze. The 31
// `suppressed-without-copy` rows on capture s-captureAH (in[57],
// 2026-08-06). Measured over all 31 rows against the live capture and a
// complete forwarded dump:
//
//     (none)                 COVERED=31 UNCOVERED=0
//     --without reminder-unwrap        COVERED=0  UNCOVERED=31
//     --without multi-piece            COVERED=0  UNCOVERED=31
//     --without separator-skip         COVERED=0  UNCOVERED=31
//     --without list-content-descent   COVERED=31 UNCOVERED=0   <- no-op
//
// Reproduce with:
//   node tools/replay.mjs <capture> --env ... --json --census --pin-rows \
//        --dump-forwarded <n:i,...> --dump-out <dump>
//   node tools/coverage-walk.mjs <capture> --dump <dump> --rows <rows.json> \
//        [--without <condition>]
//
// WHY THE FIXTURES ARE SYNTHETIC, and what that costs. The live capture
// rotates, and the rows are only reachable while it lives — the corpus rule
// this repo already pays for. A harvested pin cannot stand in either: the
// covering pieces here are `<system-reminder>`-wrapped text, and the
// sanitizer replaces text with hash tokens, so the very condition
// `reminder-unwrap` names could not survive the scrub (dev-loop, "The scrub
// destroys CONTENT PREDICATES"). So the durable evidence is a synthetic
// fixture — which dev-loop already makes the DEFAULT for anything bound for
// a public tree, and this is the case where it is also the only option.
//
// What the synthetic freezes is the SHAPE, taken from the real bytes and not
// from the implementation: one raw message that is the "\n\n"-join of three
// pieces, two of them `<system-reminder>`-wrapped text blocks inside one
// forwarded message and the third the whole content of a LATER, NON-ADJACENT
// forwarded message. The real piece lengths (683 / 683 / 8495 code units)
// are not reproduced and are not load-bearing; the arrangement is. The real
// text is not reproduced either — it is operator-corpus content and this
// repo is public.
//
// WHY THE NON-ADJACENCY IS IN THE FIXTURE. It is the whole reason the gate
// missed these rows: `crossJoinUnitHash` reconstructs a cross-message join
// only for ADJACENT forwarded messages, and the two contributors sit at 55
// and 57 with an unrelated message between them. A fixture that put them
// side by side would be a shape the gate can already see.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { coverageWalk, optsFromWithout } from "../tools/coverage-walk.mjs";

const TS = "2026-08-06T16:56:34.442Z";

// The three pieces. Deliberately unequal and multi-line, because a walk that
// only ever matched whole single-line blocks would pass a fixture built from
// three identical short strings and prove nothing.
const PIECE_A = "PreToolUse:Edit hook additional context: this is the first\nre-served fragment.";
const PIECE_B = "A second standalone fragment, wrapped the same way,\nsitting in the same forwarded message.";
const PIECE_C = "The third piece: the entire content of a later, non-adjacent\nforwarded system message.\n\nIt carries a blank line of its own, so the walk cannot pass by\ntreating every separator as a piece boundary.";

const wrap = (t) => `<system-reminder>\n${t}\n</system-reminder>`;

/**
 * The measured arrangement, as the three inputs the tool takes.
 *
 * Raw: one `system` message whose content is the "\n\n"-join of all three
 * pieces — i.e. exactly the bytes CC sent, in one message.
 * Forwarded: pieces A and B as two wrapped text blocks of message 55, an
 * unrelated message at 56, piece C as the whole string content of 57.
 */
function writeJoinFixture(dir) {
  const raw = [PIECE_A, PIECE_B, PIECE_C].join("\n\n");
  const messages = [];
  for (let i = 0; i < 58; i++) messages.push({ role: "user", content: `filler ${i}` });
  messages[57] = { role: "system", content: raw };

  // The forwarded array, dumped IN FULL — every index, not just the three
  // that matter. This is not incidental: the tool refuses to call a row lost
  // when the dump names fewer messages than the body has, because an absence
  // claim over a partly-searched wire is could-not-verify. A first draft of
  // this fixture declared msgsLen 58 and dumped 3, and the two partial
  // mutations came back COULD-NOT-VERIFY — the instrument catching the
  // fixture, which is the arrangement working. A complete dump is also what
  // the real 31-row measurement used, so this keeps the fixture faithful to
  // the arrangement the numbers in the header came from.
  const forwarded = [];
  for (let i = 0; i < 58; i++) forwarded.push({ role: "user", content: `filler ${i}` });
  forwarded[55] = { role: "user", content: [
    { type: "tool_result", tool_use_id: "t1", content: "unrelated tool output" },
    { type: "text", text: wrap(PIECE_A) },
    { type: "text", text: wrap(PIECE_B) },
  ] };
  // 56 — the message that makes 55 and 57 NON-ADJACENT.
  forwarded[56] = { role: "assistant", content: [
    { type: "text", text: "an unrelated assistant turn between the two contributors" },
  ] };
  forwarded[57] = { role: "system", content: PIECE_C };

  const fwd = forwarded.map((msg, i) => ({ n: 0, i, outBodySha: "deadbeefdeadbeef", msgsLen: 58, msg }));

  return {
    ...writeInputs(dir, "join", messages, fwd, [{ n: 0, ts: TS, at: 57, side: "in", kind: "suppressed-without-copy" }]),
    raw, forwarded,
  };
}

/**
 * The list-content positive. The row's content exists on the wire ONLY inside
 * a `tool_result` block whose `content` is a LIST — the container a scan of
 * `block.text` and string `block.content` can never reach.
 *
 * Built synthetically, and the report says so plainly: NO row of the three
 * 2026-08-07 sweep captures exercises this descent. Measured — across all 31
 * rows, 93 covering pieces, ZERO sourced from a list-content sub-block. The
 * container itself is common in that traffic (186 list-content `tool_result`
 * blocks in one capture's forwarded arrays, carrying 186 `text` and 62
 * `tool_reference` sub-blocks), so the reach is real and reachable; it is the
 * conservation rows that happen not to land there.
 */
function writeListContentFixture(dir) {
  const raw = "Content that lives on the wire only inside a list-valued tool_result.";
  const messages = [{ role: "user", content: "filler" }, { role: "system", content: raw }];
  const fwd = [
    { n: 0, i: 0, outBodySha: "cafebabecafebabe", msgsLen: 2, msg: { role: "user", content: [
      { type: "tool_result", tool_use_id: "t9", content: [
        // A textless sub-block first, so the descent has to walk past a shape
        // it cannot read WITHOUT reporting the row unreadable — tool_reference
        // is declared textless, not unknown.
        { type: "tool_reference", tool_name: "Read" },
        { type: "text", text: raw },
      ] },
    ] } },
    { n: 0, i: 1, outBodySha: "cafebabecafebabe", msgsLen: 2, msg: { role: "assistant", content: [{ type: "text", text: "unrelated" }] } },
  ];
  return writeInputs(dir, "listcontent", messages, fwd, [{ n: 0, ts: TS, at: 1, side: "in", kind: "suppressed-without-copy" }]);
}

function writeInputs(dir, name, messages, fwd, rows) {
  const capture = join(dir, `${name}-capture.jsonl`);
  const dump = join(dir, `${name}-dump.jsonl`);
  const rowsPath = join(dir, `${name}-rows.json`);
  writeFileSync(capture, JSON.stringify({ ts: TS, body: { messages } }) + "\n");
  writeFileSync(dump, fwd.map((f) => JSON.stringify(f)).join("\n") + "\n");
  writeFileSync(rowsPath, JSON.stringify(rows));
  return { capture, dump, rowsPath };
}

const run = (f, without = []) => coverageWalk(f.capture, f.dump, f.rowsPath, optsFromWithout(without));

// --- the baseline the three reds are measured against ------------------------

test("BASELINE — the three-piece non-adjacent join is fully COVERED", async (t) => {
  const f = writeJoinFixture(mkdtempSync(join(tmpdir(), "cw-bite-")));
  const [r] = await run(f);
  // The DEFINITION: content is on the wire when every code unit of the raw
  // message can be exhibited among the forwarded array's text units. It says
  // nothing about how many pieces that takes or where they sit.
  assert.equal(r.verdict, "COVERED");
  assert.equal(r.coveragePct, 100);
  assert.equal(r.uncovered.length, 0);
  // Three pieces, from two DIFFERENT forwarded messages, non-adjacent.
  const pieces = r.units.flatMap((u) => u.pieces);
  assert.equal(pieces.length, 3);
  assert.deepEqual([...new Set(pieces.map((p) => p.fwdIdx))].sort((a, b) => a - b), [55, 57]);
  t.diagnostic(`pieces: ${JSON.stringify(pieces.map((p) => [p.fwdIdx, p.codeUnits]))}`);
});

test("a whole-string substring scan — the defect this replaces — finds NONE of it", async () => {
  // The control that makes the baseline mean something: the same fixture,
  // asked the narrower question. Every forwarded text unit is checked for the
  // raw message as a contiguous substring, which is what every hand-rolled
  // presence probe here has done. Not a mutation of the tool — a statement
  // about the input, so the fixture cannot silently stop being a positive.
  const f = writeJoinFixture(mkdtempSync(join(tmpdir(), "cw-bite-")));
  // Every text the wire carries, taken from the fixture itself rather than
  // re-listed here — a hand-written copy of the wire would be a second truth
  // about what the fixture contains, and would keep passing after the fixture
  // changed underneath it.
  const wire = [];
  for (const m of f.forwarded) {
    const c = m.content;
    if (typeof c === "string") wire.push(c);
    else for (const b of c) {
      if (typeof b.text === "string") wire.push(b.text);
      if (typeof b.content === "string") wire.push(b.content);
    }
  }
  assert.ok(wire.length > 0, "the wire must carry something for this control to mean anything");
  assert.equal(wire.some((u) => u.includes(f.raw)), false);
  // …and the positive control for the instrument OF this control: the same
  // scan DOES find each individual piece, so a false here is a statement
  // about the join and not about a scan that could never match anything.
  assert.equal(wire.some((u) => u.includes(PIECE_C)), true);
});

// --- one mutation per named condition, each red on its own -------------------

test("MUTATION reminder-unwrap — removing ONLY the envelope strip sends it back to loss", async () => {
  // DEFINITION: two of the three pieces are on the wire wrapped in
  // <system-reminder>. Without the unwrap they cannot match the raw bytes at
  // any offset, so the walk stalls at offset 0.
  const f = writeJoinFixture(mkdtempSync(join(tmpdir(), "cw-bite-")));
  const [r] = await run(f, ["reminder-unwrap"]);
  assert.notEqual(r.verdict, "COVERED");
  assert.equal(r.verdict, "UNCOVERED");
  assert.equal(r.coveragePct, 0);
  assert.equal(r.uncovered.length, 1);
});

test("MUTATION multi-piece — removing ONLY the accumulation sends it back to loss", async () => {
  // DEFINITION: the content survives as three pieces. A walk that stops after
  // the first match reports whatever fraction that first piece happens to be
  // — a number that is neither 0 nor 100 and means nothing.
  const f = writeJoinFixture(mkdtempSync(join(tmpdir(), "cw-bite-")));
  const [r] = await run(f, ["multi-piece"]);
  assert.notEqual(r.verdict, "COVERED");
  assert.equal(r.verdict, "UNCOVERED");
  assert.ok(r.coveragePct > 0 && r.coveragePct < 100, `expected a partial number, got ${r.coveragePct}`);
  assert.equal(r.units.flatMap((u) => u.pieces).length, 1);
});

test("MUTATION separator-skip — removing ONLY the join separator sends it back to loss", async () => {
  // DEFINITION: the pieces are "\n\n"-joined in the raw message, and no
  // forwarded unit carries the separator. Without the skip the walk matches
  // piece A and then stalls on the two bytes between A and B.
  const f = writeJoinFixture(mkdtempSync(join(tmpdir(), "cw-bite-")));
  const [r] = await run(f, ["separator-skip"]);
  assert.notEqual(r.verdict, "COVERED");
  assert.equal(r.verdict, "UNCOVERED");
  assert.ok(r.coveragePct > 0 && r.coveragePct < 100, `expected a partial number, got ${r.coveragePct}`);
  // Stalls at the separator immediately after the first piece.
  assert.equal(r.units[0].coveredTo, PIECE_A.length);
});

test("CONTROL — list-content-descent is a NO-OP on this fixture, and that is the recorded finding", async () => {
  // This is the discrimination check, and it is the reason the bite names
  // three conditions rather than four. The backlog entry attributed these
  // rows to a missing descent into list-content tool_result blocks; the
  // descent exists here and removing it changes nothing, because no piece of
  // this shape lives in one. A mutation that leaves a bite green is evidence
  // about the mutation, so this asserts the green rather than hiding it.
  const f = writeJoinFixture(mkdtempSync(join(tmpdir(), "cw-bite-")));
  const [r] = await run(f, ["list-content-descent"]);
  assert.equal(r.verdict, "COVERED");
  assert.equal(r.coveragePct, 100);
});

// --- list-content descent gets its OWN positive ------------------------------

test("BASELINE — content reachable ONLY inside a list-valued tool_result is COVERED", async () => {
  // DEFINITION: `tool_result.content` may be a LIST of sub-blocks, and text
  // inside one is on the wire exactly as much as text in a bare text block.
  const f = writeListContentFixture(mkdtempSync(join(tmpdir(), "cw-bite-")));
  const [r] = await run(f);
  assert.equal(r.verdict, "COVERED");
  assert.equal(r.coveragePct, 100);
  // Sourced from a SUB-block, which is what distinguishes this positive.
  const pieces = r.units.flatMap((u) => u.pieces);
  assert.equal(pieces.length, 1);
  assert.notEqual(pieces[0].subIdx, null);
  // The textless `tool_reference` sub-block must NOT make the row unreadable:
  // it is a declared shape, so it is skipped as textless, not as unknown.
  assert.deepEqual(r.fwdUnreadable, []);
});

test("MUTATION list-content-descent — removing ONLY the descent sends THIS row to loss", async () => {
  // The positive the condition was missing. Its own fixture, because no row
  // of the three sweep captures exercises the descent: 93 covering pieces
  // across the 31 rows, zero from a list-content sub-block.
  const f = writeListContentFixture(mkdtempSync(join(tmpdir(), "cw-bite-")));
  const [r] = await run(f, ["list-content-descent"]);
  assert.notEqual(r.verdict, "COVERED");
  assert.equal(r.coveragePct, 0);
});

test("CONTROL — the join fixture's three conditions are NO-OPS on the list-content row", async () => {
  // The mirror of the control above, and it is what stops the two fixtures
  // from being one fixture wearing two names: the list-content row carries no
  // wrapper, no separator and one piece, so none of the other three
  // conditions can be what covers it.
  const f = writeListContentFixture(mkdtempSync(join(tmpdir(), "cw-bite-")));
  for (const c of ["reminder-unwrap", "multi-piece", "separator-skip"]) {
    const [r] = await run(f, [c]);
    assert.equal(r.verdict, "COVERED", `${c} should not affect the list-content row`);
  }
});
