// Every row family in replay.mjs must carry id/prevId, the capture record's
// OWN identifiers — BACKLOG "every OTHER row family in `replay.mjs` still
// carries only report ordinals, so the next consumer that goes back to the
// capture repeats the bug just fixed". `n`/`prevN` are report ordinals: the
// capture file is read by LINE, and outcome/boot records shift every line
// index away from the request-only `n` space (test/replay-excerpt-record-
// identity.test.mjs is the historical instance this repeats without id).
// `findEditPositions` already carries id/prevId (fixed first, precedent);
// this file is the same fix for the remaining nine families:
// violations, exemptions, toolsDeltas, duplicateRequests, mitigation,
// absorptionMisses, relocDepartures, blockMigrations, successions.
//
// Each bite passes raw (uncompacted) entries carrying an explicit `id` — the
// same shape compactEntry itself reads (`id: e.id ?? null`) — through the
// real checker function, and asserts the emitted row's id/prevId match.
// Minimal fixtures, reusing the exact building blocks already proven
// elsewhere in this repo's own test suite (the mcp reminder block from
// replay-gate-selfcheck.test.mjs's strandedPair, the block-migration shape
// from census-block-migration.test.mjs) rather than inventing new ones.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  findStabilityViolations,
  findStabilityExemptions,
  findToolsDeltas,
  findDuplicateRequests,
  findMitigationGaps,
  findAbsorptionMisses,
  findRelocDepartures,
  findBlockMigrations,
  findSuccessions,
} from "../tools/replay.mjs";

const text = (t) => ({ type: "text", text: t });
const user = (t) => ({ role: "user", content: [text(t)] });
const asst = (t) => ({ role: "assistant", content: [text(t)] });

// Raw (uncompacted) entry, the shape asCompact()/compactEntry() consume —
// same convention census-block-migration.test.mjs's `conv()` uses, with an
// explicit id added (every existing such helper defaults id to absent,
// which is exactly why this class of bug shipped unnoticed on nine
// families).
const raw = (n, id, inMsgs, outMsgs, extra = {}) => ({
  n, ts: `t${n}`, key: "k", id, inMsgs, outMsgs, inTools: [], outTools: [], ...extra,
});

test("violations and exemptions carry id/prevId", () => {
  const a = [user("u0"), asst("a1")];
  const b = [user("u0"), asst("a1"), user("u2")];
  const bOut = [user("u0"), asst("MANGLED"), user("u2")];
  const pair = [raw(0, "req-A", a, a), raw(1, "req-B", b, bOut)];
  const v = findStabilityViolations(pair);
  assert.equal(v.length, 1);
  assert.equal(v[0].id, "req-B");
  assert.equal(v[0].prevId, "req-A");

  const bIn = [user("u0"), asst("CC-ADDED-SCATTERED-SKILLS-BLOCK")];
  const bExempt = [user("RELOCATED-SKILLS-PREPENDED-u0"), asst("CC-ADDED-SCATTERED-SKILLS-BLOCK")];
  const exPair = [
    raw(0, "req-A", a, a),
    raw(1, "req-B", bIn, bExempt, {
      freshSessionSortStats: { relocated: [{ type: "skills", firstAppearance: true }], targetIndex: 0 },
    }),
  ];
  const x = findStabilityExemptions(exPair);
  assert.equal(x.length, 1);
  assert.equal(x[0].id, "req-B");
  assert.equal(x[0].prevId, "req-A");
});

test("toolsDeltas carries id/prevId", () => {
  const msgs = [user("u0")];
  const pair = [
    raw(0, "req-A", msgs, msgs, { inTools: [{ name: "x" }] }),
    raw(1, "req-B", msgs, msgs, { inTools: [{ name: "x" }, { name: "y" }] }),
  ];
  const rows = findToolsDeltas(pair);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "req-B");
  assert.equal(rows[0].prevId, "req-A");
});

test("duplicateRequests carries id/prevId", () => {
  const msgs = [user("u0"), asst("a1")];
  const pair = [raw(0, "req-A", msgs, msgs), raw(1, "req-B", msgs, msgs)];
  const rows = findDuplicateRequests(pair);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "req-B");
  assert.equal(rows[0].prevId, "req-A");
});

test("mitigation carries id/prevId", () => {
  // reorder-only: same message set, different order — a MITIGABLE kind.
  const prev = [user("u0"), user("A"), user("B")];
  const cur = [user("u0"), user("B"), user("A")];
  const pair = [raw(0, "req-A", prev, prev), raw(1, "req-B", cur, cur, { action: "normalized" })];
  const rows = findMitigationGaps(pair);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "req-B");
  assert.equal(rows[0].prevId, "req-A");
});

test("absorptionMisses carries id/prevId", () => {
  const CONV = "u0";
  const prevMsgs = [user(CONV), user("a"), user("b"), user("c"), user("d"), user("e"), user("f"), user("g"), user("h")];
  const curMsgs = [user(CONV), user("a"), user("b"), user("c"), user("d"), user("e"), user("f"), user("G"), user("h")];
  const prevOut = prevMsgs;
  const curOut = [user(CONV), user("a"), user("b"), user("c"), user("d"), user("e"), user("X"), user("g"), user("h")];
  const pair = [
    raw(1, "req-A", prevMsgs, prevOut, { stats: { movedFresh: 0, suppressions: [{ index: 2, kind: "join-move", hash: "h" }] } }),
    raw(2, "req-B", curMsgs, curOut, { stats: { movedFresh: 1, suppressions: [{ index: 2, kind: "join-move", hash: "h" }, { index: 7, kind: "join-move", hash: "h" }] } }),
  ];
  const rows = findAbsorptionMisses(pair);
  assert.equal(rows.length, 1, "control: this is the same REFIRE_SHAPE class absorption-miss.test.mjs proves red on");
  assert.equal(rows[0].id, "req-B");
  assert.equal(rows[0].prevId, "req-A");
});

test("relocDepartures carries id/prevId", () => {
  // msgs[0] must stay byte-identical across the pair — conversationOf groups
  // on inHash[0], and a changed msg[0] would put prev/cur in different
  // conversations, never compared at all (the class of error dev-loop.md's
  // "never hand-roll identity" section warns about). The mcp block lives at
  // index 1 instead, present in prev and absent everywhere in cur.
  const mcp = text("<system-reminder>\n# MCP Server Instructions\n\nstuff\n</system-reminder>");
  const prev = [user("hello"), { role: "user", content: [mcp, text("turn")] }];
  const cur = [user("hello"), { role: "user", content: [text("turn")] }, asst("a1")];
  const pair = [raw(0, "req-A", prev, prev), raw(1, "req-B", cur, cur)];
  const rows = findRelocDepartures(pair);
  assert.equal(rows.length, 1, "the mcp block present in prev departed in cur");
  assert.equal(rows[0].id, "req-B");
  assert.equal(rows[0].prevId, "req-A");
});

test("blockMigrations carries id/prevId", () => {
  const REMINDER = "<system-reminder>\nPreToolUse:Edit hook additional context: do the thing\n</system-reminder>";
  const INNER = "PreToolUse:Edit hook additional context: do the thing";
  const prev = [user("q1"), asst("a1"), { role: "user", content: [text("tool output"), text(REMINDER)] }, asst("a2")];
  const cur = [
    user("q1"), asst("a1"), { role: "user", content: [text("tool output")] },
    { role: "system", content: INNER }, asst("a2"),
  ];
  const rows = findBlockMigrations([raw(0, "req-A", prev, prev), raw(1, "req-B", cur, cur)]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "req-B");
  assert.equal(rows[0].prevId, "req-A");
});

test("successions carries id/prevId", () => {
  // A short (<=6 msg) opener under a DIFFERENT conversation identity than
  // the predecessor classifies as compaction/new-thread — the cheapest
  // MITIGABLE-free path into findSuccessions' row.
  const prev = [user("conv-A"), asst("a1")];
  const cur = [user("conv-B"), asst("a1"), user("a2")];
  const rows = findSuccessions([raw(0, "req-A", prev, prev), raw(1, "req-B", cur, cur)]);
  assert.equal(rows.length, 1, "control: a genuinely new, short conversation opener");
  assert.equal(rows[0].id, "req-B");
  assert.equal(rows[0].prevId, "req-A");
});
