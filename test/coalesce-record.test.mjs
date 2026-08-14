// The COALESCE RECORD — row 31's mitigation writing down what it did, so its
// own success stops reading as the defect it removes.
//
// THE DEFECT THIS FILE EXISTS FOR, stated so a later reader does not have to
// reconstruct it: a coalesced follower gets a capture REQUEST record and never
// an OUTCOME record, because it never reached upstream and no usage frame was
// ever addressed to it. In the census's duplicate-streak rollup that is
// byte-for-byte the shape of a retry streak's unanswered send. Switching the
// mitigation on without this record would have suppressed real double billing
// while writing evidence that reads like a failure — and row 31's own
// done-criterion is stated in exactly that number. The gate stayed parked
// until this existed.
//
// THE ARMS MUST DIFFER, and that is the whole design of this file: every bite
// that asserts what a coalesced member looks like is paired with the SAME
// input minus the coalesced record, asserting the old reading. A file that
// only showed "coalesced members are labelled" would pass equally against a
// build that labelled every member, which is the over-reach the pairing rules
// out.
//
// RED-FIRST, by mutation, with the baseline stated (dev-loop.md's rule that a
// mutate-and-revert proof over an unknown baseline proves nothing):
//   baseline — all bites below green on the shipped build;
//   mutation 1 — `noteCoalesced` in tools/reminder-migration-census.mjs made a
//     no-op: the census arms fail, reporting coalescedRequests 0 and a member
//     with `coalesced: null`, i.e. exactly the pre-record reading;
//   mutation 2 — the COALESCED branch removed from `classifyMember` in
//     tools/duplicate-billing.mjs: the join arm fails with NO-REQUEST-ID, the
//     unanswered-send label this record exists to prevent;
//   mutation 3 — `isCaptureRequestRecord` (tools/logs.mjs) made to return true
//     for any object: the replay arm fails, and it fails the way the real
//     defect did — a TypeError out of the request path, not a wrong number.
// Each was run, seen red, and reverted; the transcript is in the shipping
// commit's report.
//
// Synthetic, deterministic bytes only — this repo is public.

import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

import { census } from "../tools/reminder-migration-census.mjs";
import { classifyMember, computeDuplicateCharge } from "../tools/duplicate-billing.mjs";
import { buildCoalescedRecord } from "../proxy/extensions/request-capture.mjs";
import { isCaptureRequestRecord, readCaptureCoalesced } from "../tools/logs.mjs";
import { pinRange } from "../tools/harvest.mjs";

const pExecFile = promisify(execFile);
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPLAY = join(REPO, "tools", "replay.mjs");

let seq = 0;
const request = ({ turn = "one", id = `r${++seq}`, ts = `2026-08-01T00:00:0${seq % 10}.000Z` } = {}) => ({
  ts, id, sid: "testsession", key: "s-testsession",
  headers: { "anthropic-beta": null, "session-id": "testsession" },
  body: {
    model: "claude-test",
    max_tokens: 32,
    messages: [
      { role: "user", content: "hello" },
      { role: "assistant", content: [{ type: "text", text: turn }] },
    ],
  },
});

// `outSha: null` deliberately. A real outcome record carries the digest of
// what went on the wire, and replay's byte gate compares its own reproduction
// against it — so a made-up digest here would fail the gate and make these
// bites red for a reason that has nothing to do with the record under test.
// Writing the reproduction's actual digest into the fixture would be worse: an
// expectation derived from the very pipeline it grades. Null is what a real
// record carries when the forwarded bytes were not stamped, so the gate has
// nothing to compare and these arms stay about the coalesced record.
const outcome = (id, ts) => ({
  ts, type: "outcome", id, key: "s-testsession", model: "claude-test",
  requestId: `req-${id}`,
  usage: { cacheRead: 100, cacheCreation: 0, inputTokens: 200, outputTokens: 5 },
  outSha: null, outBytes: null, ms: 42,
});

const coalesced = (id, leaderId, ts, deltaMs = 12) => ({
  ts, type: "coalesced", id, key: "s-testsession",
  leaderId, sha: "deadbeefdeadbeef", deltaMs,
});

async function captureOf(t, lines, name = "s-testsession-requests.jsonl") {
  const dir = await tmpDir("coalesce-record-");
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, name);
  await writeFile(path, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  return path;
}

// The pair every census bite below is built from: two byte-identical sends,
// the first answered, the second either coalesced (`withRecord`) or not
// (`without`) — one line apart, so any difference in the readings is that
// line and nothing else.
const PAIR = () => [
  request({ turn: "same", id: "c-1", ts: "2026-08-01T00:00:00.000Z" }),
  request({ turn: "same", id: "c-2", ts: "2026-08-01T00:00:00.015Z" }),
  outcome("c-1", "2026-08-01T00:00:00.400Z"),
];

// ---------------------------------------------------------------------------
// The record itself
// ---------------------------------------------------------------------------

test("buildCoalescedRecord names both ids, the digest and the interval", () => {
  const rec = buildCoalescedRecord({
    meta: {
      _captureId: "follower-id",
      _captureKey: "s-testsession",
      _coalescedInto: { leaderId: "leader-id", sha: "deadbeefdeadbeef", deltaMs: 7 },
    },
  }, new Date("2026-08-01T00:00:00.020Z"));

  assert.deepEqual(rec, {
    ts: "2026-08-01T00:00:00.020Z",
    type: "coalesced",
    id: "follower-id",
    key: "s-testsession",
    leaderId: "leader-id",
    sha: "deadbeefdeadbeef",
    deltaMs: 7,
  });
});

test("buildCoalescedRecord writes NOTHING when the coalescing facts are absent", () => {
  // A record naming no leader would be worse than no record: it would mark the
  // send as suppressed while pointing at nothing that answers it.
  assert.equal(buildCoalescedRecord({ meta: { _captureId: "a", _captureKey: "k" } }), null);
  assert.equal(buildCoalescedRecord({ meta: { _coalescedInto: { leaderId: "l" } } }), null);
  assert.equal(buildCoalescedRecord({}), null);
});

test("the strict reader accepts the record and rejects a field from another schema", () => {
  const view = readCaptureCoalesced(coalesced("c-2", "c-1", "2026-08-01T00:00:00.020Z"));
  assert.equal(view.leaderId, "c-1");
  assert.equal(view.deltaMs, 12);
  // `outSha` is the OUTCOME record's spelling of the same digest. Asking for it
  // here is the wrong-schema read tools/logs.mjs exists to catch.
  assert.throws(() => view.outSha, /unknown field "outSha"/);
});

test("a coalesced record is not a request record, and a real request record is", () => {
  assert.equal(isCaptureRequestRecord(coalesced("c-2", "c-1", "t")), false);
  assert.equal(isCaptureRequestRecord(outcome("c-1", "t")), false);
  assert.equal(isCaptureRequestRecord({ ts: "t", type: "boot" }), false);
  assert.equal(isCaptureRequestRecord(request({ id: "c-1" })), true,
    "the producer writes request records with no `type` field at all");
});

// ---------------------------------------------------------------------------
// The census: the reading that inverts without this record
// ---------------------------------------------------------------------------

test("PAIRED — WITH the coalesced record the duplicate is COALESCED, not unanswered", async (t) => {
  const capture = await captureOf(t, [
    ...PAIR(),
    coalesced("c-2", "c-1", "2026-08-01T00:00:00.020Z"),
  ]);
  const res = await census([capture]);

  assert.equal(res.duplicates.coalescedRequests, 1, "one send was suppressed");
  assert.equal(res.duplicates.coalescedStreaks, 1);
  assert.equal(res.duplicates.billedRequests, 1, "and exactly one was charged");
  assert.equal(res.duplicates.doubleBilledStreaks, 0, "which is the mitigation working");

  const row = res.duplicateRows[0];
  assert.equal(row.coalesced, 1);
  assert.ok(row.members[0].outcome, "the leader was answered");
  assert.equal(row.members[0].coalesced, null, "and the leader was not coalesced");
  assert.equal(row.members[1].outcome, null, "the follower never reached upstream");
  assert.deepEqual(row.members[1].coalesced,
    { leaderId: "c-1", sha: "deadbeefdeadbeef", deltaMs: 12 },
    "so it must say WHY it has no outcome, and name the request that answered it");
});

test("PAIRED — WITHOUT it the same bytes read as a send that went unanswered", async (t) => {
  // The discriminating half. This is the reading the mitigation would have
  // produced daily had the record not shipped with it: a member with no
  // outcome and nothing to say about why.
  const capture = await captureOf(t, PAIR());
  const res = await census([capture]);

  assert.equal(res.duplicates.coalescedRequests, 0);
  assert.equal(res.duplicates.coalescedStreaks, 0);
  assert.equal(res.duplicates.billedRequests, 1);

  const row = res.duplicateRows[0];
  assert.equal(row.coalesced, 0);
  assert.equal(row.members[1].outcome, null);
  assert.equal(row.members[1].coalesced, null,
    "identical to the coalesced case on every field except the one this record adds");
});

test("the coalesced record does not inflate the billing count it rides beside", async (t) => {
  // `doubleBilledStreaks` is derived from `billed` alone. Marking a suppressed
  // send by incrementing that count would have corrupted the one number the
  // alarm is computed from — recorded here because it was the tempting shape.
  const capture = await captureOf(t, [
    ...PAIR(),
    coalesced("c-2", "c-1", "2026-08-01T00:00:00.020Z"),
  ]);
  const res = await census([capture]);
  assert.equal(res.duplicates.billedRequests, 1);
  assert.equal(res.duplicates.billedStreaks, 1);
  assert.equal(res.duplicates.doubleBilledStreaks, 0);
});

test("a coalesced record arriving BEFORE its member still lands on it", async (t) => {
  // Appends from concurrent requests interleave in one capture file, so wire
  // order is not a guarantee this reader may rest on — the same reason
  // `noteOutcome` handles both directions.
  const capture = await captureOf(t, [
    request({ turn: "same", id: "c-1", ts: "2026-08-01T00:00:00.000Z" }),
    coalesced("c-2", "c-1", "2026-08-01T00:00:00.020Z"),
    request({ turn: "same", id: "c-2", ts: "2026-08-01T00:00:00.015Z" }),
    outcome("c-1", "2026-08-01T00:00:00.400Z"),
  ]);
  const res = await census([capture]);
  assert.equal(res.duplicates.coalescedRequests, 1);
  assert.deepEqual(res.duplicateRows[0].members[1].coalesced,
    { leaderId: "c-1", sha: "deadbeefdeadbeef", deltaMs: 12 });
});

// ---------------------------------------------------------------------------
// duplicate-billing: the join a human reads
// ---------------------------------------------------------------------------

test("PAIRED — classifyMember reports COALESCED, and the same member without the record reports NO-REQUEST-ID", () => {
  const withRecord = classifyMember(
    { id: "c-2", ts: "2026-08-01T00:00:00.015Z", line: 2, outcome: null,
      coalesced: { leaderId: "c-1", sha: "deadbeefdeadbeef", deltaMs: 12 } },
    new Map(),
  );
  assert.equal(withRecord.join, "COALESCED");
  assert.equal(withRecord.leaderId, "c-1");
  assert.equal(withRecord.deltaMs, 12);
  assert.match(withRecord.reason, /never sent upstream/);

  const without = classifyMember(
    { id: "c-2", ts: "2026-08-01T00:00:00.015Z", line: 2, outcome: null, coalesced: null },
    new Map(),
  );
  assert.equal(without.join, "NO-REQUEST-ID",
    "money saved and a request that went unanswered must not carry the same label");
});

test("a coalesced duplicate contributes ZERO to the streak's duplicate charge", () => {
  const members = [
    { captureUsage: { cacheReadTokens: 100, cacheCreationTokens: 0, inputTokens: 200 } },
    classifyMember(
      { id: "c-2", ts: "t", line: 2, outcome: null,
        coalesced: { leaderId: "c-1", sha: "deadbeefdeadbeef", deltaMs: 12 } },
      new Map(),
    ),
  ];
  assert.equal(computeDuplicateCharge(members), 0,
    "the suppressed send was never charged, so there is nothing to attribute to it");
});

test("a census export written BEFORE this record reads null, never undefined", () => {
  // The strict view's own trap, one level down: a known-but-absent field that
  // is also a nested reader used to return `undefined` from the nested branch
  // before `optionalDefaults` was consulted.
  const old = classifyMember({ id: "c-2", ts: "t", line: 2, outcome: null }, new Map());
  assert.equal(old.join, "NO-REQUEST-ID", "an old export has no coalescing to report");
});

// ---------------------------------------------------------------------------
// The consumers that must not choke on it
// ---------------------------------------------------------------------------

test("replay skips the record and does not spend a request ordinal on it", async (t) => {
  // The real defect, at the altitude it occurred: before the predicate landed,
  // one coalesced line killed `replay.mjs --census` with `TypeError: The
  // "data" argument must be of type string … Received undefined`, because a
  // record with no body reached the request path.
  const capture = await captureOf(t, [
    { ts: "2026-08-01T00:00:00.000Z", type: "boot", pid: 1, proxyTree: "abc123", gates: {} },
    ...PAIR(),
    coalesced("c-2", "c-1", "2026-08-01T00:00:00.020Z"),
  ]);
  const { stdout } = await pExecFile("node", [REPLAY, capture, "--census", "--json"],
    { maxBuffer: 64 * 1024 * 1024 });
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.report.length, 2, "two requests, not three — the record is not one");
  assert.deepEqual(parsed.report.map((r) => r.n), [0, 1],
    "and the ordinals are unbroken: a non-request must not consume an index");
  assert.deepEqual(parsed.report.map((r) => r.captureId), ["c-1", "c-2"]);
});

// `pinRange` stops at the m-th REQUEST, so a record written after it is not in
// the pin at all — which is why these two arms pin through a third request
// rather than through the pair. Learned by the first version of this bite
// failing: it pinned m=1 and the record it was asserting about sat one line
// past the cut.
const PINNABLE = () => [
  { ts: "2026-08-01T00:00:00.000Z", type: "boot", pid: 1, proxyTree: "abc123", gates: {} },
  request({ turn: "same", id: "c-1", ts: "2026-08-01T00:00:00.000Z" }),
  request({ turn: "same", id: "c-2", ts: "2026-08-01T00:00:00.015Z" }),
  coalesced("c-2", "c-1", "2026-08-01T00:00:00.020Z"),
  outcome("c-1", "2026-08-01T00:00:00.400Z"),
  request({ turn: "later", id: "c-3", ts: "2026-08-01T00:00:01.000Z" }),
];

test("harvest --pin keeps the record and the follower->leader join survives scrubbing", async (t) => {
  const capture = await captureOf(t, PINNABLE());
  const records = await pinRange(capture, 2);

  const pinned = records.find((r) => r.type === "coalesced");
  assert.ok(pinned, "a pin that dropped the record would freeze the evidence and lose the fact");
  assert.notEqual(pinned.id, "c-2", "ids are tokenized on the way into a fixture");
  assert.notEqual(pinned.leaderId, "c-1");
  assert.equal(pinned.sha, "deadbeefdeadbeef", "the digest is not identifying and rides through");

  // The join is the point: inside the fixture the follower's own request
  // record and the coalesced record must still carry the SAME token, and the
  // leader token must be the leader's. Deterministic hashing is what buys
  // this; a random re-id would freeze evidence that no longer proves anything.
  const requests = records.filter((r) => !r.type);
  assert.equal(requests.length, 3);
  const leaderTok = records.find((r) => r.type === "outcome").id;
  assert.equal(pinned.leaderId, leaderTok,
    "the pinned record must point at the pinned leader, not at a dangling id");
});

test("the whole pinned fixture is still replayable — the pin is evidence, not a wall", async (t) => {
  const capture = await captureOf(t, PINNABLE());
  const records = await pinRange(capture, 2);
  const dir = await tmpDir("coalesce-pin-replay-");
  t.after(() => rm(dir, { recursive: true, force: true }));
  const jsonl = join(dir, "pin-requests.jsonl");
  await writeFile(jsonl, records.map((r) => JSON.stringify(r)).join("\n") + "\n");

  const { stdout } = await pExecFile("node", [REPLAY, jsonl, "--census", "--json"],
    { maxBuffer: 64 * 1024 * 1024 });
  assert.equal(JSON.parse(stdout).report.length, 3, "three requests in, three replayed");
  assert.ok((await readFile(jsonl, "utf-8")).includes('"type":"coalesced"'));
});
