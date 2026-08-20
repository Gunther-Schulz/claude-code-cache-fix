// The mid-history insert SET and its DEPTH — `midHistoryInserts`,
// `insertDepth`, and the two fields `findMitigationGaps` now puts on every
// MITIGABLE row.
//
// WHY THE DEPTH EXISTS AT ALL. `fireRaw.relocations` counts one row per
// MITIGABLE pair and reads as a harm signal. Measured 2026-08-20 over the full
// 49-capture live window with the very functions under test here (numbers from
// the executed run, not from the brief that ordered the work):
//
//     depth tally over splice/insert-mid pairs:
//       deep 1 · shallow 103 · tail 2455 · unanchored 76
//     min-anchorDelta histogram (head):
//       [-23,1] [-2,103] [1,100] [3,1] [4,95] [6,2] [7,84] …
//     insert-count histogram:  [1,1] [2,1] [3,2633]
//     role-sequence histogram: system/assistant/user 2633 · system 1 ·
//                              user/assistant 1
//     contiguous insert runs:  2635 of 2635
//
// So 96% of the population CC's `relocations` column counts is the trailing
// system-reminder push-down — the standing `<total_tokens>` block is the last
// array element of every request, each new turn lands before it, and the pair
// censuses as a splice while being ordinary tail growth. One pair in that whole
// window was deep, and it is the 110k bust of 2026-08-20T09:11:57Z.
//
// THE BOUND. The histogram has a hole exactly where `DEEP_INSERT_ANCHOR_DELTA`
// sits: per-pair minima run -23, then -2, then +1 and upward — nothing at -1
// and nothing between -3 and -22. The constant is placed inside that measured
// gap, which is the whole reason it is a bound and not a guess.
//
// BOTH ARMS ARE REAL CORPUS PAIRS, neither constructed. An instrument shown
// only on its positive has been shown to fire, never to discriminate — the
// defect that cost the originating investigation two cycles. The arms are
// frozen as pins (`harvest --pin`) because the captures behind them rotate on a
// quadratic clock, and each pin was replayed and seen to reproduce the event it
// was pinned for before it was trusted (docs/dev-loop.md, "a pin is a claim
// until you replay it"):
//
//   DEEP  pinned-s-238bd4d20b65-39-41   ord 39->41, splice/insert-mid,
//         one insert at index 82, role system, anchorDelta -23 — the bust.
//   TAIL  pinned-s-6c1903382a3e-23-24   ord 23->24, splice/insert-mid,
//         three inserts at 4,5,6, roles system/assistant/user, anchorDelta
//         +1/+2/+3 — the benign push-down, the shape 96% of the class has.
//   NONE  the same DEEP pin's own append-only pairs — new content, all of it
//         after the last surviving entry, no mid-history insert at all.
//
// WHAT THE SCRUB COSTS, stated because a reader will otherwise trust the wrong
// field: the sanitizer replaces text with hash tokens, so per-entry BYTE sizes
// shrink (the deep insert measures 372 B live and 48 B in the pin). Indices,
// roles, anchor deltas and the census class survive it exactly — those are what
// the assertions read. The live-capture byte figure belongs in a report, not in
// a fixture-backed assertion.
//
// RED-FIRST. These expectations cannot run against the old implementation —
// the exports did not exist, and a module-load red is satisfied by any body
// whatsoever, including one returning a constant. So the discrimination was
// established by mutation, one named condition at a time, each run recorded:
//
//   (a) the `j >= lastKeptIn` filter disabled  -> DEEP red, NONE red, TAIL
//       GREEN. The predicted result was "NONE red, DEEP green" and that was
//       wrong, which is why the observed one is what stands here: without the
//       filter an append-only pair reports its appended entries as inserts,
//       AND the bust pair reports its own appended tail beside index 82. TAIL
//       stays green because every one of its inserts already sits before the
//       last surviving entry — the filter is a no-op on the push-down shape,
//       and that is a fact about the shape, not a weakness of the arm.
//   (b) `anchorDelta: j - anchor` -> `anchorDelta: j`  -> DEEP red (-23 reads
//       82), TAIL red (+1 reads 4), the row-wiring bite red, NONE green (it
//       has no insert to mis-measure). The anchor subtraction is load-bearing
//       in both directions.
//   (c) `DEEP_INSERT_ANCHOR_DELTA` -10 -> -100  -> DEEP red (deep reads
//       shallow) and the bound bite red, while TAIL and NONE stay green: the
//       bound separates, and it separates on DEPTH rather than on presence.
//
// Each mutation was reverted immediately; the arrangement is recorded here
// because the mutation itself cannot be committed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  compactEntry, censusIds, midHistoryInserts, insertDepth, minInsertAnchorDelta,
  findMitigationGaps, DEEP_INSERT_ANCHOR_DELTA, INSERT_DEPTHS,
} from "../tools/replay.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "fixtures", "harvested");
const DEEP_PIN = join(FIXTURES, "pinned-s-238bd4d20b65-39-41.json");
const TAIL_PIN = join(FIXTURES, "pinned-s-6c1903382a3e-23-24.json");

/** Compact entries out of a pin, grouped the way `findMitigationGaps` groups —
 * by the conversation's own first-message identity, never by capture adjacency
 * (docs/dev-loop.md, "Never hand-roll identity in a probe": live traffic
 * interleaves main, subagent and sidecar requests, so two requests of one
 * conversation sit several lines apart). Ordinals are numbered from the pin's
 * own `replayFrom`, so `n` means the same thing it means on the live capture.
 * Roles come off the raw message array at the same indices the compact entry's
 * own arrays are built from. */
function pinPairs(path) {
  const pin = JSON.parse(readFileSync(path, "utf-8"));
  const byCid = new Map();
  const roles = new Map();
  let ord = (pin.header?.replayFrom ?? 0) - 1;
  for (const rec of pin.records) {
    const r = typeof rec === "string" ? JSON.parse(rec) : rec;
    if (!r?.body?.messages || !r?.ts) continue;
    ord++;
    const e = compactEntry({ n: ord, ts: r.ts, id: r.id ?? null, key: "w", inMsgs: r.body.messages });
    roles.set(ord, r.body.messages.map((m) => m.role ?? "?"));
    const cid = e.inHash[0] ?? "none";
    if (!byCid.has(cid)) byCid.set(cid, []);
    byCid.get(cid).push(e);
  }
  const pairs = [];
  for (const group of byCid.values()) {
    for (let i = 1; i < group.length; i++) pairs.push({ prev: group[i - 1], cur: group[i] });
  }
  return { pairs, roles };
}

const findPair = (pairs, prevN, n) => pairs.find((p) => p.prev.n === prevN && p.cur.n === n);

// --- ARM 1, the positive: the real 110k bust ---

test("midHistoryInserts: BITE — the 2026-08-20 110k bust yields exactly the index-82 insert, 23 before the human anchor", () => {
  const { pairs, roles } = pinPairs(DEEP_PIN);
  const p = findPair(pairs, 39, 41);
  assert.ok(p, "the pinned transition ord 39->41 must be in the fixture");
  assert.equal(censusIds(p.prev.inSem, p.cur.inSem), "splice/insert-mid",
    "the pin must still reproduce the census class it was frozen for");

  const inserts = midHistoryInserts(p.prev, p.cur);
  assert.deepEqual(inserts.map((i) => i.at), [82], "one entry, spliced at index 82");
  assert.equal(roles.get(41)[82], "system", "CC's own Stop-hook notification, role system");
  assert.equal(inserts[0].anchorDelta, -23,
    "index 82 against the last human turn at 105 — the depth that made this a 110k bust");
  assert.ok(inserts[0].bytes > 0, "a byte size is carried (its VALUE is scrub-dependent, see the header)");
  assert.equal(insertDepth(inserts), "deep");
  assert.equal(minInsertAnchorDelta(inserts), -23);
});

// --- ARM 2, the discriminating negative from the SAME capture ---

test("midHistoryInserts: CONTROL — append-only pairs in the busting capture yield NO mid-history insert", () => {
  const { pairs } = pinPairs(DEEP_PIN);
  const appendOnly = pairs.filter((p) => censusIds(p.prev.inSem, p.cur.inSem) === "append-only");
  assert.ok(appendOnly.length >= 5,
    `the pin must carry real append-only pairs to control against, got ${appendOnly.length}`);
  for (const p of appendOnly) {
    const inserts = midHistoryInserts(p.prev, p.cur);
    assert.deepEqual(inserts, [],
      `ord ${p.prev.n}->${p.cur.n} appends after the last surviving entry — nothing is spliced BEFORE it`);
    assert.equal(insertDepth(inserts), "none");
    assert.equal(minInsertAnchorDelta(inserts), null, "no insert, so no depth — never a 0");
  }
});

// --- ARM 3, the shape 96% of the class actually has ---

test("midHistoryInserts: CONTROL — the trailing-reminder push-down is a splice that lands AFTER the anchor", () => {
  const { pairs, roles } = pinPairs(TAIL_PIN);
  const p = findPair(pairs, 23, 24);
  assert.ok(p, "the pinned transition ord 23->24 must be in the fixture");
  assert.equal(censusIds(p.prev.inSem, p.cur.inSem), "splice/insert-mid",
    "this IS a splice by the census — which is exactly why the bare count is not a harm signal");

  const inserts = midHistoryInserts(p.prev, p.cur);
  assert.deepEqual(inserts.map((i) => i.at), [4, 5, 6], "a contiguous three-entry run");
  assert.deepEqual(inserts.map((i) => roles.get(24)[i.at]), ["system", "assistant", "user"],
    "the push-down's own role sequence — 2,633 of 2,635 corpus pairs have exactly this");
  assert.deepEqual(inserts.map((i) => i.anchorDelta), [1, 2, 3], "all at or after the human anchor");
  assert.equal(insertDepth(inserts), "tail",
    "a splice by class, benign by depth — the separation the fire ledger was missing");
  assert.ok(minInsertAnchorDelta(inserts) > DEEP_INSERT_ANCHOR_DELTA,
    "and it sits on the far side of the measured bound from the bust");
});

// --- The bound and the vocabulary ---

test("insertDepth: the bound sits inside the measured gap, and the vocabulary is closed", () => {
  assert.equal(DEEP_INSERT_ANCHOR_DELTA, -10);
  const at = (d) => insertDepth([{ at: 0, bytes: 1, anchorDelta: d }]);
  assert.equal(at(-23), "deep", "the one measured deep pair");
  assert.equal(at(-10), "deep", "the bound itself is deep — inclusive");
  assert.equal(at(-9), "shallow");
  assert.equal(at(-2), "shallow", "the 103-pair cluster the corpus actually has");
  assert.equal(at(0), "tail");
  assert.equal(at(1), "tail");
  assert.equal(insertDepth([{ at: 0, bytes: 1, anchorDelta: null }]), "unanchored",
    "no human turn to measure against is COULD NOT VERIFY, never folded into tail");
  assert.equal(insertDepth([]), "none");
  // The deepest insert decides the pair, not the first or the last one.
  assert.equal(insertDepth([{ anchorDelta: 3 }, { anchorDelta: -40 }, { anchorDelta: 1 }]), "deep");
  for (const d of ["deep", "shallow", "tail", "unanchored", "none"]) {
    assert.ok(INSERT_DEPTHS.includes(d), `${d} must be declared in the exported vocabulary`);
  }
  assert.equal(INSERT_DEPTHS.length, 5, "closed: a sixth bucket is a deliberate change, not a drift");
});

// --- The fields on the census row the fire ledger reads ---
//
// Synthetic here on purpose: the assertion is about FIELD WIRING through
// findMitigationGaps (which needs a forwarded array and an action the pins do
// not carry without a full pipeline replay), and the depth values themselves
// are proven on the real pairs above.

const user = (t) => ({ role: "user", content: [{ type: "text", text: t }] });
const asst = (t) => ({ role: "assistant", content: [{ type: "text", text: t }] });
const sys = (t) => ({ role: "system", content: t });
const entry = (n, inMsgs, outMsgs, extra = {}) => ({
  n, ts: `2026-08-20T00:00:${String(n).padStart(2, "0")}Z`, key: "k",
  inMsgs, outMsgs, action: null, resetReason: null, ...extra,
});

test("findMitigationGaps: every MITIGABLE row carries its depth, and the deep one is separable from the benign one", () => {
  // A deep splice: new content lands well before the last human turn.
  const filler = [];
  for (let i = 0; i < 20; i++) filler.push(asst(`a${i}`));
  const sysSpliced = sys("SPLICED");
  const prevDeep = [user("HEAD"), ...filler, user("the human turn"), sys("trailing reminder")];
  const curDeep = [user("HEAD"), ...filler.slice(0, 5), sysSpliced, ...filler.slice(5),
                   user("the human turn"), sys("trailing reminder")];
  // The push-down: the same class, landing after the anchor.
  const prevTail = [user("HEAD"), asst("a0"), user("the human turn"), sys("trailing reminder")];
  const curTail = [user("HEAD"), asst("a0"), user("the human turn"), sys("new"), asst("reply"),
                   sys("trailing reminder")];

  const deepRows = findMitigationGaps([
    entry(0, prevDeep, prevDeep, { action: "append-only" }),
    entry(1, curDeep, curDeep, { action: "normalized" }),
  ]);
  assert.equal(deepRows.length, 1);
  assert.equal(deepRows[0].kind, "splice/insert-mid");
  assert.equal(deepRows[0].insertDepth, "deep");
  // cur is [HEAD, filler0..4, SPLICED, filler5..19, human, trailing] — the
  // spliced entry at index 6, the human turn at 22.
  assert.equal(curDeep.indexOf(sysSpliced), 6);
  assert.equal(deepRows[0].minInsertAnchorDelta, 6 - 22);

  const tailRows = findMitigationGaps([
    entry(0, prevTail, prevTail, { action: "append-only" }),
    entry(1, curTail, curTail, { action: "normalized" }),
  ]);
  assert.equal(tailRows.length, 1);
  assert.equal(tailRows[0].kind, "splice/insert-mid",
    "same census class as the deep pair — which is the point");
  assert.equal(tailRows[0].insertDepth, "tail");
  assert.ok(tailRows[0].minInsertAnchorDelta >= 0);

  // An append-after-change pair is MITIGABLE and is NOT a member of this
  // class: "none" says so on the row, rather than leaving a reader to read an
  // absent field as a zero.
  const prevApp = [user("HEAD"), asst("a0")];
  const curApp = [user("HEAD"), asst("EDITED"), asst("a1")];
  const appRows = findMitigationGaps([
    entry(0, prevApp, prevApp, { action: "append-only" }),
    entry(1, curApp, curApp, { action: "append-only" }),
  ]);
  if (appRows.length) {
    assert.equal(appRows[0].insertDepth, "none");
    assert.equal(appRows[0].minInsertAnchorDelta, null);
  }
});
