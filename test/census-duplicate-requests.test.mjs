// census duplicate-requests — CC#78420's falsifier as a standing counter.
//
// What it guards. #78420 alleges the same request body is sent twice and
// CHARGED twice. The falsifier — adjacent byte-identical request bodies — was
// run by hand twice and answered differently each time, and the difference was
// the definition of "adjacent": a 2026-07-29 scan over capture LINES reported
// the class ABSENT, a 2026-07-30 scan per CONVERSATION reported ~100 pairs in
// ~23 streaks (BACKLOG.md, the resolved duplicate-request entry). Live traffic
// interleaves tenants, so two requests of one conversation are usually several
// lines apart and file adjacency simply loses them. This file pins the
// definition that survived — per conversation — so the counter cannot drift
// back into the question that answered "absent".
//
// The counter must work in BOTH directions:
//   it must FIRE on the defect      — a streak carrying TWO OR MORE outcome
//                                     records is the #78420 shape: one body,
//                                     answered and charged more than once;
//   it must NOT FIRE on the
//   NON-defect                      — a retry that finally succeeds bills
//                                     exactly one of its sends (the failed
//                                     ones produce no outcome record), and one
//                                     charge for one answer is correct. On the
//                                     live corpus 32 of 67 streaks carry a
//                                     billed request, so alarming on "billed"
//                                     would alarm on normality and train its
//                                     reader to ignore the number.
//
// Red-first, demonstrated rather than asserted (dev-loop.md, "It must go RED
// on the real defect before it counts"):
//   - against the PRE-change census (git f36ef8e) this whole file fails at
//     import — `sameBody`, `trackDuplicate`, `newDuplicateScan`,
//     `noteOutcome` and `summariseDuplicates` do not exist there, so no
//     duplicate could have been counted at all.
//   - it already went red on a REAL defect during its own construction: the
//     first implementation matched outcome records forwards only, so a
//     streak's opener — answered before the duplicate send existed — was
//     never billed. "a streak with outcome records is reported BILLED" read
//     1 of 2. Fixed by remembering outcomes that arrive before membership
//     (`newDuplicateScan`'s `billed` set).
//   - with `trackDuplicate`'s run-extension collapsed to pair logic (open a
//     NEW run for every duplicate pair instead of extending the open one),
//     "a 3-run is ONE streak of length 3" goes red — 2 streaks, maxStreak 2 —
//     while the pair count stays 2, which is precisely the confusion the
//     streak metric exists to prevent.

import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

import {
  census,
  sameBody,
  newDuplicateScan,
  trackDuplicate,
  noteOutcome,
  noteCoalesced,
  summariseDuplicates,
} from "../tools/reminder-migration-census.mjs";

// --- fixtures -------------------------------------------------------------

let seq = 0;

/**
 * One captured request. `opener` decides the CONVERSATION (conversationOf
 * hashes messages[0]), `turn` is what the conversation has said since, and
 * `id` is what an outcome record keys back to. Ids are unique by default
 * because the retry shape the corpus actually carries has distinct ids —
 * identical bodies, different request ids.
 */
const request = ({ opener = "hello", turn = "one", id = `r${++seq}`, ts = `2026-08-01T00:00:0${seq % 10}.000Z`, sid = "s-testsession" } = {}) => ({
  ts,
  id,
  sid,
  key: `s-${sid}`,
  body: {
    model: "claude-test",
    max_tokens: 32,
    messages: [
      { role: "user", content: opener },
      { role: "assistant", content: [{ type: "text", text: turn }] },
    ],
  },
});

/** The outcome record the proxy writes when a request was answered: same id. */
const outcome = (id, ts = "2026-08-01T00:00:09.000Z") => ({
  ts, type: "outcome", id, key: "s-testsession",
  model: "claude-test", usage: { inputTokens: 10, outputTokens: 1 },
  outSha: "deadbeefdeadbeef", outBytes: 100, ms: 40,
});

async function captureOf(t, lines, name = "s-testsession-requests.jsonl") {
  const dir = await tmpDir("census-dup-");
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, name);
  await writeFile(path, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  return path;
}

// --- the counts, through the real read path -------------------------------

test("a corpus with no repeated body reports zeros, not silence", async (t) => {
  const capture = await captureOf(t, [
    request({ turn: "one" }),
    request({ turn: "two" }),
    request({ turn: "three" }),
  ]);
  const res = await census([capture]);

  assert.deepEqual(res.unreadable, [], "the capture must be readable");
  assert.equal(res.pairs, 2, "two same-conversation pairs were examined");
  // The expected shape is ASKED OF the summariser over an empty scan, not
  // restated here. A literal is a copy, and a copy of a field list beside the
  // source it mirrors is what silently dropped `coalescedRequests` from
  // gate-live's rollup for four days. The claim being made is "an unrepeated
  // corpus reports the summariser's own zero shape", which is what this now
  // says; a field the summariser gains arrives here as 0 without an edit.
  assert.deepEqual(res.duplicates, summariseDuplicates(newDuplicateScan()));
  assert.equal(res.duplicates.streaks, 0, "instrument positive: a zero shape really is all zeros");
  assert.deepEqual(res.duplicatesByCapture, [], "no rollup for a capture with nothing to roll up");
  assert.deepEqual(res.duplicateRows, []);
});

test("one adjacent byte-identical pair is 1 pair in 1 streak", async (t) => {
  const capture = await captureOf(t, [
    request({ turn: "same" }),
    request({ turn: "same" }),
  ]);
  const res = await census([capture]);

  assert.equal(res.duplicates.pairs, 1);
  assert.equal(res.duplicates.streaks, 1);
  assert.equal(res.duplicates.maxStreak, 2, "a streak covers both requests, not just the repeat");
  assert.equal(res.duplicates.requests, 2);
  assert.equal(res.duplicates.membersWithoutId, 0);
});

test("a 3-run is ONE streak of length 3, carrying two pairs", async (t) => {
  // The metric that separates "the same request went out twice" from "it went
  // out fourteen times in three minutes" — the shape the 07-30 probe found and
  // could not explain. Collapsing run extension into pair logic reports 2
  // streaks of 2 here while leaving `pairs` untouched.
  const capture = await captureOf(t, [
    request({ turn: "same" }),
    request({ turn: "same" }),
    request({ turn: "same" }),
  ]);
  const res = await census([capture]);

  assert.equal(res.duplicates.streaks, 1, "maximal run, not one streak per pair");
  assert.equal(res.duplicates.maxStreak, 3);
  assert.equal(res.duplicates.pairs, 2);
  assert.equal(res.duplicates.requests, 3);
});

test("identical bodies that are NOT adjacent are not duplicates", async (t) => {
  // The conversation moved and came back to the same body. Nothing was sent
  // twice in a row, so nothing was retried and nothing could be double-charged.
  const capture = await captureOf(t, [
    request({ turn: "A" }),
    request({ turn: "B" }),
    request({ turn: "A" }),
  ]);
  const res = await census([capture]);

  assert.equal(res.duplicates.pairs, 0);
  assert.equal(res.duplicates.streaks, 0);
});

test("a differing body CLOSES a run — streaks are maximal", async (t) => {
  const capture = await captureOf(t, [
    request({ turn: "A" }), request({ turn: "A" }),
    request({ turn: "B" }),
    request({ turn: "A" }), request({ turn: "A" }),
  ]);
  const res = await census([capture]);

  assert.equal(res.duplicates.streaks, 2, "two runs, not one spanning the gap");
  assert.equal(res.duplicates.maxStreak, 2);
  assert.equal(res.duplicates.pairs, 2);
});

// --- the definition boundary: conversation adjacency, never file adjacency --

test("an interleaved tenant does not break a duplicate — the 07-29/07-30 split", async (t) => {
  // The definition-mismatch case, pinned. A subagent request lands between the
  // two sends of the main conversation: file adjacency sees no repeat at all
  // (asserted below, so this test states the OTHER definition's answer rather
  // than assuming it), conversation adjacency sees the duplicate that is there.
  const dup = () => request({ opener: "main", turn: "same" });
  const lines = [dup(), request({ opener: "subagent", turn: "sub" }), dup()];
  const capture = await captureOf(t, lines);

  let fileAdjacent = 0;
  for (let i = 1; i < lines.length; i++) {
    if (JSON.stringify(lines[i - 1].body) === JSON.stringify(lines[i].body)) fileAdjacent++;
  }
  assert.equal(fileAdjacent, 0, "a file-adjacent scan reports this corpus CLEAN — that is the 07-29 answer");

  const res = await census([capture]);
  assert.equal(res.duplicates.pairs, 1, "per conversation, the duplicate is right there");
  assert.equal(res.duplicates.streaks, 1);
});

test("file-adjacent requests of DIFFERENT conversations are never a pair", async (t) => {
  // Two conversations advancing in lockstep put different-conversation requests
  // side by side on every line. None of those lines is a duplicate of its
  // neighbour, and the counter must not manufacture one out of adjacency.
  //
  // The converse case — byte-identical bodies belonging to two DIFFERENT
  // conversations — is not constructible: `conversationOf` hashes messages[0],
  // so bodies that are byte-identical are by construction the same
  // conversation. That is a property of the grouping, not an untested corner.
  const capture = await captureOf(t, [
    request({ opener: "A", turn: "1" }),
    request({ opener: "B", turn: "1" }),
    request({ opener: "A", turn: "2" }),
    request({ opener: "B", turn: "2" }),
  ]);
  const res = await census([capture]);

  assert.equal(res.duplicates.pairs, 0);
  assert.equal(res.pairs, 2, "one pair per conversation was examined — they were compared, not skipped");
});

// --- the billing discriminator --------------------------------------------

test("a streak with outcome records is reported BILLED — the #78420 shape", async (t) => {
  // Note the ORDER, which is the wire's and not a convenience: the first
  // send is answered — outcome record written — BEFORE the duplicate send
  // exists. This bite went red on the first implementation, which matched
  // outcomes forwards only and so scored every streak OPENER unbilled: it
  // reported 1 of 2 charged, understating the one thing the counter is for.
  const first = request({ turn: "same", id: "req-1" });
  const second = request({ turn: "same", id: "req-2" });
  const capture = await captureOf(t, [first, outcome("req-1"), second, outcome("req-2")]);
  const res = await census([capture]);

  assert.equal(res.duplicates.pairs, 1);
  assert.equal(res.duplicates.billedRequests, 2, "both sends were answered and charged");
  assert.equal(res.duplicates.billedStreaks, 1);
  assert.equal(res.duplicates.doubleBilledStreaks, 1, "one body, two charges — the alarm fires");
  assert.equal(res.duplicates.membersWithoutId, 0);
});

test("a retry that finally succeeds is charged ONCE — the alarm must not fire", async (t) => {
  // The non-defect, and the reason the alarm is `doubleBilledStreaks` rather
  // than `billedStreaks`: distinct ids, no outcome record for the sends that
  // failed, one outcome for the send that answered. One charge for one answer
  // is correct behaviour — and on the live corpus 32 of 67 streaks carry a
  // billed request, so alarming on that number would alarm on normality.
  const capture = await captureOf(t, [
    request({ turn: "same", id: "try-1" }),
    request({ turn: "same", id: "try-2" }),
    request({ turn: "same", id: "try-3" }),
    outcome("try-3"),
  ]);
  const res = await census([capture]);

  assert.equal(res.duplicates.streaks, 1);
  assert.equal(res.duplicates.maxStreak, 3);
  assert.equal(res.duplicates.billedRequests, 1, "two sends never came back");
  assert.equal(res.duplicates.billedStreaks, 1, "the streak did carry a charge, and says so");
  assert.equal(res.duplicates.doubleBilledStreaks, 0, "but the body was charged once — not #78420");
});

test("outcome records for non-members bill nothing", async (t) => {
  const capture = await captureOf(t, [
    request({ turn: "A", id: "solo" }),
    outcome("solo"),
    request({ turn: "B", id: "other" }),
    outcome("other"),
  ]);
  const res = await census([capture]);
  assert.equal(res.duplicates.pairs, 0);
  assert.equal(res.duplicates.billedRequests, 0, "billing is only ever counted for duplicate members");
});

// --- rollups and rows -----------------------------------------------------

test("per-capture rollups add up to the corpus totals", async (t) => {
  const a = await captureOf(t, [request({ opener: "A", turn: "x" }), request({ opener: "A", turn: "x" })],
    "s-a-requests.jsonl");
  const b = await captureOf(t, [
    request({ opener: "B", turn: "y" }), request({ opener: "B", turn: "y" }), request({ opener: "B", turn: "y" }),
  ], "s-b-requests.jsonl");
  const res = await census([a, b]);

  assert.equal(res.duplicatesByCapture.length, 2);
  const sum = res.duplicatesByCapture.reduce((n, [, r]) => n + r.pairs, 0);
  assert.equal(sum, res.duplicates.pairs, "the rollups are the total, decomposed");
  assert.equal(res.duplicates.streaks, 2);
  assert.equal(res.duplicates.maxStreak, 3, "the corpus maximum is the longest run anywhere, not a sum");
});

test("streak rows locate the streak and carry no request content", async (t) => {
  const capture = await captureOf(t, [
    request({ opener: "hello", turn: "secret payload", id: "req-1" }),
    request({ opener: "hello", turn: "secret payload", id: "req-2" }),
  ]);
  const res = await census([capture]);

  assert.equal(res.duplicateRows.length, 1);
  const row = res.duplicateRows[0];
  assert.equal(row.path, capture);
  assert.equal(row.length, 2);
  assert.equal(row.startLine, 1, "1-based line ordinal of the run's FIRST request");
  assert.equal(row.lastLine, 2);
  assert.equal(row.sid, "s-testsession");
  assert.equal(JSON.stringify(res.duplicateRows).includes("secret payload"), false,
    "rows carry pointers and counts, never request bodies (corpus hygiene)");
});

// --- the definition itself, directly --------------------------------------

test("sameBody compares the WHOLE request, not just the messages", () => {
  const msgs = [{ role: "user", content: "a" }];
  assert.equal(sameBody({ model: "m", messages: msgs }, { model: "m", messages: msgs }), true);
  assert.equal(sameBody({ model: "m", messages: msgs, max_tokens: 1 },
                        { model: "m", messages: msgs, max_tokens: 2 }), false,
    "same conversation, different request parameters — not the same request");
  assert.equal(sameBody({ model: "m", messages: msgs }, { model: "OTHER", messages: msgs }), false);
  assert.equal(sameBody({ messages: msgs }, { messages: [...msgs, { role: "user", content: "b" }] }), false);
  assert.equal(sameBody({ messages: "not an array" }, { messages: "not an array" }), false,
    "a body without a message array is outside the population, not a match");
});

test("an id-less member is reported as unmatchable, never as unbilled", () => {
  // The third answer: "no outcome record" and "no id to match an outcome
  // against" are different states, and folding them would let a recorder
  // change read as a clean bill of health.
  const scan = newDuplicateScan();
  const body = { model: "m", messages: [{ role: "user", content: "a" }] };
  trackDuplicate(scan, "conv", { ts: "t1", body }, { ts: "t2", body });
  const s = summariseDuplicates(scan);

  assert.equal(s.pairs, 1);
  assert.equal(s.membersWithoutId, 2);
  assert.equal(s.billedRequests, 0);
  assert.equal(noteOutcome(scan, "anything"), false, "there is nothing to match it to");
});

test("one outcome record bills exactly one request", () => {
  const scan = newDuplicateScan();
  const body = { model: "m", messages: [{ role: "user", content: "a" }] };
  trackDuplicate(scan, "conv", { ts: "t1", id: "a", body }, { ts: "t2", id: "b", body });

  assert.equal(noteOutcome(scan, "a"), true);
  assert.equal(noteOutcome(scan, "a"), false, "a repeated outcome record cannot bill twice");
  assert.equal(summariseDuplicates(scan).billedRequests, 1);
});

// --- The class split (2026-08-15): row 31's done-criterion is TWO-SIDED ---
//
// The criterion reads: the session-start duplicate class falls to zero WHILE
// the mid-session class stays UNCHANGED — a fall in the second is over-reach,
// not success. Until this split existed both halves were one corpus-wide
// number, so the criterion could only be settled by hand, which is exactly the
// hand-derivation closing-gate question 3 says the census should emit.
//
// RED-FIRST, discriminating split stated: run against the unmodified census
// these four bites fail at their own call sites (every `singleMessage*` /
// `multiMessage*` field reads `undefined`) while all 22
// pre-existing bites in this file pass — the summariser gained fields, it did
// not change any it had. Namespace-free named imports are safe here because
// `duplicateClassOf` is the only new export and the bites below reach the
// split through `summariseDuplicates`, which already existed.

const dupBody = (n) => ({ model: "m", messages: Array.from({ length: n }, (_, i) => ({ role: "user", content: `m${i}` })) });

/** One streak of exactly two members with a body of `n` messages. */
const streakOf = (scan, cid, n, { ids = null } = {}) => {
  const body = dupBody(n);
  const a = ids ? { ts: "t1", id: ids[0], body } : { ts: "t1", body };
  const b = ids ? { ts: "t2", id: ids[1], body } : { ts: "t2", body };
  trackDuplicate(scan, cid, a, b);
};

test("the split counts a one-message streak apart from a many-message one — row 31's own discriminator", () => {
  const scan = newDuplicateScan();
  streakOf(scan, "start", 1, { ids: ["a1", "a2"] });
  streakOf(scan, "mid", 7, { ids: ["b1", "b2"] });
  const s = summariseDuplicates(scan);

  assert.equal(s.streaks, 2);
  assert.equal(s.singleMessageStreaks, 1, "nMsg === 1 — the class the mitigation can act in");
  assert.equal(s.multiMessageStreaks, 1, "nMsg !== 1 — the retry class, which must stay UNCHANGED");
});

test("the alarm column splits by class, so a fall on one side cannot hide a rise on the other", () => {
  const scan = newDuplicateScan();
  streakOf(scan, "start", 1, { ids: ["a1", "a2"] });
  streakOf(scan, "mid", 7, { ids: ["b1", "b2"] });
  // Both members of each streak billed — the #78420 shape, on both sides.
  for (const id of ["a1", "a2", "b1", "b2"]) assert.equal(noteOutcome(scan, id), true);
  const s = summariseDuplicates(scan);

  assert.equal(s.doubleBilledStreaks, 2, "the corpus-wide alarm, unchanged by the split");
  assert.equal(s.singleMessageDoubleBilled, 1, "the half row 31 must drive to zero");
  assert.equal(s.multiMessageDoubleBilled, 1, "the half that must NOT move");
});

test("a non-object body forms no streak at all — which is why TWO buckets are total, not three", () => {
  // This bite exists because the split's first design had a third bucket for
  // `nMsg: null`, on the three-answer rule. Its own bite failed on first run
  // for a reason nobody planted: `sameBody` requires `messages` to be an ARRAY
  // on both sides before a run is opened, so a streak with a null nMsg cannot
  // exist and the bucket was unprovable rather than merely unproven. The
  // bucket went; this pins the premise that replaced it, so the day `sameBody`
  // loosens, the two-bucket claim fails HERE instead of quietly mis-filing a
  // streak as mid-session.
  const scan = newDuplicateScan();
  const body = "not an object";
  trackDuplicate(scan, "weird", { ts: "t1", id: "c1", body }, { ts: "t2", id: "c2", body });
  const s = summariseDuplicates(scan);

  assert.equal(s.streaks, 0, "no run is opened for a body sameBody cannot compare");
  // Instrument positive, so the zero above is a measurement and not a dead
  // arrangement: the identical call with a real body DOES open a streak.
  const ok = newDuplicateScan();
  streakOf(ok, "fine", 1, { ids: ["e1", "e2"] });
  assert.equal(summariseDuplicates(ok).streaks, 1, "the same arrangement with a readable body forms one");
  // And every streak that does exist carries a numeric nMsg — the claim the
  // two-bucket partition rests on, read off the runs rather than argued.
  for (const run of ok.streaks) assert.equal(typeof run.nMsg, "number");
});

test("the two buckets PARTITION the streaks — every per-class counter sums to its corpus-wide sibling", () => {
  // The property that makes the split checkable rather than merely present. A
  // miscount on any side shows up here even when each individual bite passes.
  const scan = newDuplicateScan();
  streakOf(scan, "s1", 1, { ids: ["a1", "a2"] });
  streakOf(scan, "s2", 1, { ids: ["d1", "d2"] });
  streakOf(scan, "m1", 4, { ids: ["b1", "b2"] });
  for (const id of ["a1", "a2", "b1", "b2"]) noteOutcome(scan, id);
  noteCoalesced(scan, "d2", { leaderId: "d1", sha: "x", deltaMs: 9 });
  const s = summariseDuplicates(scan);

  assert.equal(s.singleMessageStreaks + s.multiMessageStreaks, s.streaks,
    "the buckets partition the streaks");
  assert.equal(s.singleMessageDoubleBilled + s.multiMessageDoubleBilled,
    s.doubleBilledStreaks, "and the alarm column");
  assert.equal(s.singleMessageCoalesced + s.multiMessageCoalesced,
    s.coalescedStreaks, "and the mitigation's own column");
  // Negative control against a split that just mirrors the whole: the two
  // sides must actually DIFFER on this input, or the assertions above would
  // pass equally against a build that put every streak in one bucket.
  assert.equal(s.singleMessageStreaks, 2);
  assert.equal(s.multiMessageStreaks, 1);
  assert.equal(s.singleMessageCoalesced, 1, "the coalesce landed on the single-message side");
  assert.equal(s.multiMessageCoalesced, 0);
});
