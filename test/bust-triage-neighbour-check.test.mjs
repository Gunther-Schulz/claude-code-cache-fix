// `capturePairResult` may select a DIFFERENT pair than the one a hand walk
// of the raw census calls "the bust", and nothing said the two disagreed.
//
// Measured live (s-captureAM, session c7e7cb71): the tool's pairing selected
// ord 260->261 — a real `replace/edit` pair in the same conversation,
// `anchorDelta +0`, benign — while the threat matrix's own hand walk names
// ord 265->266 (`anchorDelta -48`, inside a 20-leg FLAP) as the actual
// busting transition. The raw capture behind that live measurement has since
// rotated out (no fixture exists for it, per the closing gate's "snapshot
// what proves a finding" — none was frozen before this rotated), so this
// reproduces the SHAPE synthetically: a same-conversation window with an
// early, FAR-from-anchor edit and a later, at-anchor edit — the selection
// rule (nearest-in-time) picks the later, weaker one every time.
//
// The fix: `pairEditContext` now scores every replace/edit transition in the
// same window `findEditPositions`/`findBlockMigrations` already build, and
// flags when a same-conversation NEIGHBOUR outscores the selected pair on
// either of the entry's two named signals — a larger |anchorDelta|, or a
// FLAP where the selected pair has none. `capturePairResult`'s selection
// rule itself is unchanged — this is a flag beside its output, never a
// second selection heuristic.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { pairEditContext } from "../tools/bust-triage.mjs";

const txt = (t) => ({ type: "text", text: t });
const user = (t) => ({ role: "user", content: [txt(t)] });
const asst = (t) => ({ role: "assistant", content: [txt(t)] });

function writeCapture(dir, sid, states) {
  const lines = states.map(({ ts, msgs }) =>
    JSON.stringify({ ts, body: { messages: msgs } }));
  writeFileSync(join(dir, `s-${sid}-requests.jsonl`), lines.join("\n") + "\n");
}

// Shared shape: one early human turn (the anchor for every state until a
// SECOND human turn appears near the tail), 34 filler legs (assistant +
// tool_result, never a human turn — a trailing role:"user" would move the
// anchor by construction, per the edit-anchor fixture's own note), and a
// trailing assistant turn so an edit there sits mid-history, far from index 0.
function buildStates() {
  const pad = "x".repeat(200);
  const head = user(`HEAD ${pad}`);
  const filler = [];
  for (let i = 0; i < 34; i++) {
    filler.push(asst(`step ${i}`));
    filler.push({ role: "user", content: [{ type: "tool_result", tool_use_id: `T${i}` }] });
  }
  const s0 = [head, ...filler, asst("ORIGINAL-far"), asst("trailing turn")];
  // ord0->1: an edit at index (1+filler.length), anchor is still index 0
  // (the only human turn so far) — FAR by construction.
  const s1 = [head, ...filler, asst("EDITED-far"), asst("trailing turn")];
  // ord1->2: append a SECOND human turn near the tail — not a replace/edit
  // census (the array grows), so this transition contributes no row.
  const s2 = [...s1, user("NEW-tail"), asst("resp")];
  // ord2->3: edit that second, tail-adjacent human turn — anchorDelta ~ 0,
  // the SELECTED (weak) candidate, chronologically LAST.
  const s3 = [...s1, user("NEW-tail-EDITED"), asst("resp")];
  return { s0, s1, s2, s3 };
}

test("pairEditContext: BITE — an earlier, far-from-anchor neighbour outscores the selected at-anchor pair", async () => {
  const dir = tmpDirSync("bt-nbr-far-");
  const { s0, s1, s2, s3 } = buildStates();
  const sid = "SNBR0001";
  writeCapture(dir, sid, [
    { ts: "2026-08-08T00:00:00.000Z", msgs: s0 },
    { ts: "2026-08-08T00:00:01.000Z", msgs: s1 },
    { ts: "2026-08-08T00:00:02.000Z", msgs: s2 },
    { ts: "2026-08-08T00:00:03.000Z", msgs: s3 },
  ]);
  // Selected: ord2->3, the weak, at-anchor edit — capturePairResult's own
  // recency rule would pick exactly this one; wired directly here per the
  // existing edit-anchor tests' own convention (pairEditContext takes the
  // pair, never re-derives selection).
  const pair = {
    before: { ord: 2, ts: "2026-08-08T00:00:02.000Z", body: { messages: s2 } },
    after: { ord: 3, ts: "2026-08-08T00:00:03.000Z", body: { messages: s3 } },
  };
  const ctx = await pairEditContext(sid, pair, dir);
  assert.ok(ctx?.edit, "the selected transition must resolve to an edit row");
  assert.ok(Math.abs(ctx.edit.anchorDelta) <= 30,
    `the selected pair must be the WEAK, at-anchor one: anchorDelta=${ctx.edit.anchorDelta}`);
  assert.ok(ctx.strongerNeighbour, "an earlier, far-from-anchor neighbour must be flagged");
  assert.equal(ctx.strongerNeighbour.prevN, 0, "the stronger candidate is ord 0->1");
  assert.equal(ctx.strongerNeighbour.n, 1);
  assert.ok(Math.abs(ctx.strongerNeighbour.anchorDelta) > 30,
    `the flagged neighbour must itself be far from anchor: anchorDelta=${ctx.strongerNeighbour.anchorDelta}`);
});

// CONTROL, the entry's own requirement: "a walk whose selected pair IS the
// strongest candidate must gain no warning." Same window, but this time the
// SELECTED pair is the far one — nothing later in the window can outscore it.
test("pairEditContext: CONTROL — a walk whose selected pair already is the strongest candidate gets no warning", async () => {
  const dir = tmpDirSync("bt-nbr-ctrl-");
  const { s0, s1 } = buildStates();
  const sid = "SNBR0002";
  writeCapture(dir, sid, [
    { ts: "2026-08-08T00:00:00.000Z", msgs: s0 },
    { ts: "2026-08-08T00:00:01.000Z", msgs: s1 },
  ]);
  const pair = {
    before: { ord: 0, ts: "2026-08-08T00:00:00.000Z", body: { messages: s0 } },
    after: { ord: 1, ts: "2026-08-08T00:00:01.000Z", body: { messages: s1 } },
  };
  const ctx = await pairEditContext(sid, pair, dir);
  assert.ok(ctx?.edit);
  assert.ok(Math.abs(ctx.edit.anchorDelta) > 30, "sanity: the selected pair IS the far one here");
  assert.equal(ctx.strongerNeighbour, null,
    "with no earlier transition in the window, nothing can outscore the selected pair");
});
