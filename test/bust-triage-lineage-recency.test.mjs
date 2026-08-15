// `findPredecessor`'s LINEAGE stage picked the wrong request, and the shape
// of the error is worth keeping because the code's own comment records the
// measurement that hid it.
//
// The stage admits candidates by content overlap and then takes the ARGMAX.
// `lineageOverlap` (replay.mjs:1250) normalizes by the SMALLER set:
//
//     return shared / Math.min(setA.size, setB.size);
//
// so a SHORT, OLD request that happens to be fully contained in the busting
// array scores 1.0, while the true immediate predecessor — which carries a
// few messages the rebuild dropped — scores below it. Argmax therefore
// prefers old and short over near and real, and does so more strongly the
// longer the conversation runs.
//
// The existing comment at the `>=` tie-break reads: "the measured cluster
// rises monotonically with recency (97.1/97.3/97.7/98.1/98.5%), so ties are
// not expected". Those numbers are real, and they were measured over the
// five requests immediately before the boundary — a window with no short old
// candidate in it. The monotonicity was a property of that window, not of
// the score, and the claim's reach fell short of the conclusion drawn from
// it.
//
// MEASURED LIVE, 2026-08-15 (the 919k event on capture s-captureBR,
// 15:07:49Z): the busting request at 15:07:10.081Z has a brand-new
// `messages[0]`, so the cid search finds nothing and this stage decides. It
// selected a predecessor at **12:53:54Z — 2h13m earlier** — while the
// conversation's real immediate predecessor sat at 15:04:43.064Z, **2m27s**
// before the bust. Every downstream line in that walk (attribution, census,
// state-key flip, migration) was then computed over a pair that never
// busted, and the state-key line compared the opus main thread against a
// one-message haiku sidecar.
//
// THE FIX: overlap is the ADMISSION test, recency is the SELECTION. Among
// candidates that pass `sameLineage`, take the most recent — which is the
// same "nearest earlier request" relation stages 1 and 3 already use, so all
// three stages now share one notion of predecessor and differ only in how
// they admit candidates.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { capturePairResult } from "../tools/bust-triage.mjs";
import { lineageOverlap, compactEntry } from "../tools/replay.mjs";

const at = (iso) => Date.parse(iso) / 1000;
const msg = (tag) => ({ role: "user", content: [{ type: "text", text: `m-${tag}` }] });

function rec(ts, messages) {
  return JSON.stringify({ ts, id: ts, body: { messages } });
}

function capture(records, key) {
  const dir = tmpDirSync("bt-linrec-");
  writeFileSync(join(dir, `${key}-requests.jsonl`), records.join("\n") + "\n");
  return dir;
}

// Shared body the whole conversation carries.
const BODY = Array.from({ length: 10 }, (_, i) => msg(`e${i}`));

// The busting request: a NEW messages[0] (so the cid search is blind) over
// the same body.
const AFTER = [msg("headB"), ...BODY];

// The TRUE immediate predecessor: the old identity, the same body, plus two
// messages the rebuild dropped — which is exactly what costs it the argmax.
const TRUE_PRED = [msg("headA"), ...BODY, msg("dropped1"), msg("dropped2")];

// The DECOY: an old, short request whose every message is present in the
// busting array, so containment-normalized overlap scores it 1.0.
const DECOY = [msg("e0"), msg("e1"), msg("e2")];

test("INSTRUMENT — the decoy really does out-score the true predecessor", () => {
  // The defect is a property of the SCORE, so it is asserted directly rather
  // than inferred from the selection. Without this, a passing selection test
  // could mean the scores changed rather than the choice rule.
  const a = compactEntry({ inMsgs: AFTER });
  const decoyScore = lineageOverlap(compactEntry({ inMsgs: DECOY }), a);
  const trueScore = lineageOverlap(compactEntry({ inMsgs: TRUE_PRED }), a);
  assert.equal(decoyScore, 1, "the decoy is fully contained, so it scores 1.0");
  assert.ok(trueScore >= 0.5, `the true predecessor must clear the admission threshold (got ${trueScore})`);
  assert.ok(decoyScore > trueScore,
    `the decoy must out-score the true predecessor for this test to bite (${decoyScore} vs ${trueScore})`);
});

test("BITE — among lineage matches the MOST RECENT wins, not the highest overlap", async () => {
  const dir = capture([
    rec("2026-08-15T12:53:54.000Z", DECOY),      // old, short, overlap 1.0
    rec("2026-08-15T15:04:43.064Z", TRUE_PRED),  // the real immediate predecessor
    rec("2026-08-15T15:07:10.081Z", AFTER),      // the busting request
  ], "s-linrec01");

  const r = await capturePairResult("linrec01", at("2026-08-15T15:07:49Z"), dir, null);
  assert.equal(r.ok, true, `walk failed: ${r.code} — ${r.detail}`);
  assert.equal(r.crossesRotation, true, "the pair must still be labelled as crossing a rotation");
  assert.equal(r.before.ts, "2026-08-15T15:04:43.064Z",
    "the NEAREST lineage match is the predecessor — the older, fully-contained decoy must lose");
  assert.equal(r.after.ts, "2026-08-15T15:07:10.081Z");
});

test("CONTROL — a candidate BELOW the overlap threshold is still rejected", async () => {
  // Recency must not become the only rule: an unrelated co-tenant sidecar
  // that is nearer in time than the real predecessor must still lose, because
  // it never clears admission. Without this the fix would replace one wrong
  // answer with another.
  const dir = capture([
    rec("2026-08-15T15:04:43.064Z", TRUE_PRED),
    rec("2026-08-15T15:07:00.000Z", [msg("sidecar1"), msg("sidecar2")]), // 0% overlap, NEARER
    rec("2026-08-15T15:07:10.081Z", AFTER),
  ], "s-linrec02");

  const r = await capturePairResult("linrec02", at("2026-08-15T15:07:49Z"), dir, null);
  assert.equal(r.ok, true, `walk failed: ${r.code} — ${r.detail}`);
  assert.equal(r.before.ts, "2026-08-15T15:04:43.064Z",
    "a nearer request that shares no lineage must never be selected");
});

test("CONTROL — the cid search still wins when it finds anything", async () => {
  // The lineage stage runs ONLY when the cid search is blind. A same-identity
  // pair must come back byte-identical to the pre-fix behaviour.
  const dir = capture([
    rec("2026-08-15T15:04:43.064Z", [msg("headB"), ...BODY, msg("older")]),
    rec("2026-08-15T15:07:10.081Z", AFTER),
  ], "s-linrec03");

  const r = await capturePairResult("linrec03", at("2026-08-15T15:07:49Z"), dir, null);
  assert.equal(r.ok, true, `walk failed: ${r.code} — ${r.detail}`);
  assert.equal(r.crossesRotation, undefined, "a same-cid pair must not be labelled as crossing a rotation");
  assert.equal(r.before.ts, "2026-08-15T15:04:43.064Z");
});
