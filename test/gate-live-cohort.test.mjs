// gate-live capture COHORT stamp — which side of a gate flip a capture's
// traffic was written on.
//
// WHY IT EXISTS, and it is a graduated probe rather than a feature: row 31's
// done-criterion is a before/after comparison across the
// CACHE_FIX_COALESCE_SIDECAR flip (2026-08-14 18:17 local), and the sweep's
// rows carried no time at all — so answering it meant hand-joining every row
// against its capture's own first line. That join was written twice in one
// session, which is this repo's stated stop-signal for ad-hoc probes against
// formats it already writes.
//
// It is not row-31-specific. "Was this capture's traffic written before or
// after gate X flipped" is the question EVERY future mitigation flip asks,
// and the answer has to be recorded at sweep time because captures rotate
// out from under it.
//
// The hand-join it replaces had a live defect worth pinning here: a sweep
// row's `.file` is a BASENAME, not a path. The first version resolved it as
// a path, every capture failed to open, and — had `head` not printed to
// stderr — all 56 would have landed silently in an "unknown" bucket and the
// cohort table would have printed all zeros. A zero from an instrument that
// never read anything is indistinguishable from a measured zero, which is
// exactly why this belongs in the sweep, next to the file it already opened.
//
// Namespace import per dev-loop.md's import-line rule.

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import * as gate from "../tools/gate-live.mjs";
import { tmpDirSync } from "../tools/tmpdir.mjs";

const cap = (dir, name, lines) => {
  const p = join(dir, name);
  writeFileSync(p, lines.map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join("\n") + "\n");
  return p;
};

test("firstRecordTs reads the capture's FIRST record timestamp", async () => {
  const dir = tmpDirSync("gate-live-firstts-");
  const p = cap(dir, "s-a-requests.jsonl", [
    { ts: "2026-08-14T16:55:01.940Z", id: "r1", body: { messages: [] } },
    { ts: "2026-08-14T17:10:00.000Z", id: "r2", body: { messages: [] } },
  ]);
  assert.equal(await gate.firstRecordTs(p), "2026-08-14T16:55:01.940Z");
});

test("firstRecordTs skips leading blank and unparseable lines rather than reporting null", async () => {
  const dir = tmpDirSync("gate-live-firstts-torn-");
  const p = cap(dir, "s-b-requests.jsonl", [
    "",
    "{not json",
    { ts: "2026-08-15T10:04:24.391Z", id: "r1", body: { messages: [] } },
  ]);
  assert.equal(await gate.firstRecordTs(p), "2026-08-15T10:04:24.391Z");
});

test("third answer: a capture with no readable timestamp is null, never a fabricated one", async () => {
  const dir = tmpDirSync("gate-live-firstts-none-");
  const p = cap(dir, "s-c-requests.jsonl", ["{not json", "{\"id\":\"r1\"}"]);
  assert.equal(await gate.firstRecordTs(p), null, "no ts field anywhere -> null");
  // The two arms must DIFFER: the same reader on a capture that HAS one
  // returns it, so the null above is a measurement and not a dead path.
  const ok = cap(dir, "s-d-requests.jsonl", [{ ts: "2026-08-15T11:04:29.760Z", id: "r1" }]);
  assert.equal(await gate.firstRecordTs(ok), "2026-08-15T11:04:29.760Z");
});

test("firstRecordTs on a nonexistent file is null, not a throw that aborts the sweep", async () => {
  const dir = tmpDirSync("gate-live-firstts-missing-");
  assert.equal(await gate.firstRecordTs(join(dir, "nope.jsonl")), null);
});

test("cohortSplit partitions rows by a flip stamp and folds UNSTAMPED rows into neither side", () => {
  // The bucket the hand-join needed and the reason the stamp is worth
  // recording: a row whose capture could not be timed is its own answer.
  const rows = [
    { file: "pre.jsonl", firstTs: "2026-08-13T09:00:00.000Z", byteGate: { duplicates: { singleMessageDoubleBilled: 5, multiMessageDoubleBilled: 1, singleMessageCoalesced: 0 } } },
    { file: "post.jsonl", firstTs: "2026-08-15T09:00:00.000Z", byteGate: { duplicates: { singleMessageDoubleBilled: 0, multiMessageDoubleBilled: 1, singleMessageCoalesced: 3 } } },
    { file: "untimed.jsonl", firstTs: null, byteGate: { duplicates: { singleMessageDoubleBilled: 9, multiMessageDoubleBilled: 9, singleMessageCoalesced: 9 } } },
  ];
  const s = gate.cohortSplit(rows, "2026-08-14T16:17:00Z");
  assert.equal(s.before.captures, 1);
  assert.equal(s.after.captures, 1);
  assert.equal(s.unstamped.captures, 1);
  assert.equal(s.before.duplicates.singleMessageDoubleBilled, 5);
  assert.equal(s.after.duplicates.singleMessageDoubleBilled, 0);
  assert.equal(s.after.duplicates.singleMessageCoalesced, 3);
  // The untimed row's numbers must appear in the unstamped bucket and NOWHERE
  // else — folding it into either side is the silent-miscount this replaces.
  assert.equal(s.unstamped.duplicates.singleMessageDoubleBilled, 9);
  assert.equal(s.before.duplicates.singleMessageCoalesced, 0);
});

test("cohortSplit reuses the DERIVED duplicate fold, so a new census field needs no edit here either", () => {
  const rows = [
    { file: "a.jsonl", firstTs: "2026-08-15T09:00:00.000Z", byteGate: { duplicates: { futureCounter: 4, maxStreak: 3 } } },
    { file: "b.jsonl", firstTs: "2026-08-15T09:30:00.000Z", byteGate: { duplicates: { futureCounter: 6, maxStreak: 9 } } },
  ];
  const s = gate.cohortSplit(rows, "2026-08-14T16:17:00Z");
  assert.equal(s.after.duplicates.futureCounter, 10, "summed like every other numeric field");
  assert.equal(s.after.duplicates.maxStreak, 9, "and the MAX field is still a max");
});
