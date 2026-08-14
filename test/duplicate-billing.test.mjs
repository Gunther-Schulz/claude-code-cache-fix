// duplicate-billing — tests for tools/duplicate-billing.mjs, the tool that
// joins the reminder-migration census's double-billed duplicate-request
// streaks against usage.jsonl by request_id.
//
// Namespace import (not a destructured one) so a missing export fails each
// bite at its own call site rather than failing the whole module at link
// time (per the dispatch brief's RED-FIRST instruction).

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { tmpDirSync } from "../tools/tmpdir.mjs";
import * as mod from "../tools/duplicate-billing.mjs";

const {
  readCensusExport,
  readUsageIndex,
  classifyMember,
  computeDuplicateCharge,
  buildStreakRow,
  computeRollup,
  buildReport,
  main,
} = mod;

// A minimal usage.jsonl record, only the fields readUsageLogRecord requires
// plus request_id — enough to satisfy the strict reader.
function usageRecord({ requestId, outputTokens, inputTokens = 10, cacheCreation = 0, cacheRead = 0 }) {
  return {
    v: 1,
    ts: "2026-08-14T00:00:00.000Z",
    sid: "sid-1",
    model: "claude-opus-5",
    speed: "normal",
    service_tier: "standard",
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_creation_input_tokens: cacheCreation,
    cache_read_input_tokens: cacheRead,
    ephemeral_1h_input_tokens: 0,
    ephemeral_5m_input_tokens: 0,
    web_search_requests: 0,
    q5h: 0,
    q7d: 0,
    q5h_reset: 0,
    q7d_reset: 0,
    qstatus: "",
    qoverage: "",
    qclaim: "",
    qfallback_pct: 0,
    cache_hit_rate: 0,
    q5h_delta: 0,
    q7d_delta: 0,
    request_id: requestId,
  };
}

function captureMember({ line, ts, requestId, outputTokens = 2, cacheRead = 0, cacheCreation = 0, inputTokens = 10 }) {
  return {
    id: `id-${line}`,
    ts,
    line,
    outcome: requestId
      ? {
          requestId,
          model: "claude-opus-5",
          ms: 1234,
          usage: { cacheRead, cacheCreation, inputTokens, outputTokens },
        }
      : null,
  };
}

test("classifyMember: JOINED reads finalOutputTokens from the usage log, NOT from the capture placeholder", () => {
  const usageIndex = new Map([["req-abc", usageRecord({ requestId: "req-abc", outputTokens: 900 })]]);
  const member = captureMember({ line: 10, ts: "2026-08-14T00:00:01.000Z", requestId: "req-abc", outputTokens: 2 });
  const result = classifyMember(member, usageIndex);
  assert.equal(result.join, "JOINED");
  assert.equal(result.finalOutputTokens, 900, "must read the usage-log value, not the capture's placeholder (2)");
  assert.notEqual(result.finalOutputTokens, 2);
  assert.equal(result.captureUsage.outputTokens, undefined, "captureUsage must never carry outputTokens across");
});

test("classifyMember: a two-member double-billed streak both JOIN", () => {
  const usageIndex = new Map([
    ["req-1", usageRecord({ requestId: "req-1", outputTokens: 900 })],
    ["req-2", usageRecord({ requestId: "req-2", outputTokens: 5 })],
  ]);
  const m1 = captureMember({ line: 100, ts: "2026-08-14T00:00:00.000Z", requestId: "req-1", outputTokens: 2 });
  const m2 = captureMember({ line: 101, ts: "2026-08-14T00:00:03.000Z", requestId: "req-2", outputTokens: 2 });
  const r1 = classifyMember(m1, usageIndex);
  const r2 = classifyMember(m2, usageIndex);
  assert.equal(r1.join, "JOINED");
  assert.equal(r1.finalOutputTokens, 900);
  assert.equal(r2.join, "JOINED");
  assert.equal(r2.finalOutputTokens, 5);
});

test("classifyMember: requestId absent from the usage log -> NOT-IN-USAGE-LOG, finalOutputTokens absent (not 0)", () => {
  const usageIndex = new Map(); // empty log
  const member = captureMember({ line: 20, ts: "2026-08-14T00:00:02.000Z", requestId: "req-missing" });
  const result = classifyMember(member, usageIndex);
  assert.equal(result.join, "NOT-IN-USAGE-LOG");
  assert.equal("finalOutputTokens" in result, false, "an unjoined member must not carry a 0 masquerading as a measurement");
});

test("classifyMember: a null outcome -> NO-REQUEST-ID with a reason", () => {
  const usageIndex = new Map();
  const member = { id: "id-30", ts: "2026-08-14T00:00:03.000Z", line: 30, outcome: null };
  const result = classifyMember(member, usageIndex);
  assert.equal(result.join, "NO-REQUEST-ID");
  assert.equal(typeof result.reason, "string");
  assert.ok(result.reason.length > 0);
});

test("classifyMember: an outcome with no requestId -> NO-REQUEST-ID with a distinct reason", () => {
  const usageIndex = new Map();
  const member = {
    id: "id-31",
    ts: "2026-08-14T00:00:03.000Z",
    line: 31,
    outcome: { requestId: null, model: "claude-opus-5", ms: 1, usage: { cacheRead: 0, cacheCreation: 0, inputTokens: 1, outputTokens: 1 } },
  };
  const result = classifyMember(member, usageIndex);
  assert.equal(result.join, "NO-REQUEST-ID");
  assert.equal(typeof result.reason, "string");
  assert.ok(result.reason.length > 0);
});

test("classifyMember: crossCheck AGREE when capture and usage-log cacheRead match", () => {
  const usageIndex = new Map([["req-agree", usageRecord({ requestId: "req-agree", outputTokens: 50, cacheRead: 1000 })]]);
  const member = captureMember({ line: 40, ts: "2026-08-14T00:00:04.000Z", requestId: "req-agree", cacheRead: 1000 });
  const result = classifyMember(member, usageIndex);
  assert.equal(result.join, "JOINED");
  assert.deepEqual(result.crossCheck, { status: "AGREE" });
});

test("classifyMember: crossCheck DIFFER when capture and usage-log cacheRead disagree", () => {
  const usageIndex = new Map([["req-differ", usageRecord({ requestId: "req-differ", outputTokens: 50, cacheRead: 500 })]]);
  const member = captureMember({ line: 41, ts: "2026-08-14T00:00:04.000Z", requestId: "req-differ", cacheRead: 999 });
  const result = classifyMember(member, usageIndex);
  assert.equal(result.join, "JOINED");
  assert.equal(result.crossCheck.status, "DIFFER");
  assert.equal(result.crossCheck.captureCacheRead, 999);
  assert.equal(result.crossCheck.usageLogCacheRead, 500);
});

test("computeDuplicateCharge: a 3-member streak counts members 2 and 3 only", () => {
  const usageIndex = new Map(); // join state irrelevant to this bite
  const members = [
    captureMember({ line: 1, ts: "t1", requestId: "r1", cacheRead: 1000, cacheCreation: 0, inputTokens: 5 }),
    captureMember({ line: 2, ts: "t2", requestId: "r2", cacheRead: 100, cacheCreation: 20, inputTokens: 3 }),
    captureMember({ line: 3, ts: "t3", requestId: "r3", cacheRead: 50, cacheCreation: 10, inputTokens: 2 }),
  ].map((m) => classifyMember(m, usageIndex));
  const charge = computeDuplicateCharge(members);
  // Hand-computed: member 1 (index 0) excluded entirely.
  // member 2: 100 + 20 + 3 = 123
  // member 3: 50 + 10 + 2 = 62
  // total = 185
  assert.equal(charge, 185);
});

test("computeDuplicateCharge: a member with no captureUsage contributes 0, not a thrown error", () => {
  const usageIndex = new Map();
  const members = [
    captureMember({ line: 1, ts: "t1", requestId: "r1", cacheRead: 10, cacheCreation: 0, inputTokens: 1 }),
    { id: "id-2", ts: "t2", line: 2, outcome: null }, // classifyMember output directly (NO-REQUEST-ID, no captureUsage)
  ];
  const classified = [classifyMember(members[0], usageIndex), classifyMember(members[1], usageIndex)];
  assert.equal(classified[1].captureUsage, null);
  assert.equal(computeDuplicateCharge(classified), 0);
});

test("buildStreakRow: class is session-start at startLine<=5, mid-session otherwise", () => {
  const usageIndex = new Map();
  const early = buildStreakRow(
    { path: "/x/y/s-abc-requests.jsonl", startLine: 3, model: "claude-haiku-5", nMsg: 1, maxTokens: 32000,
      intervalMs: 10, length: 2, billed: 2, members: [captureMember({ line: 3, ts: "t", requestId: "r1" }), captureMember({ line: 4, ts: "t2", requestId: "r2" })] },
    usageIndex,
  );
  assert.equal(early.class, "session-start");
  assert.equal(early.capture, "s-abc-requests.jsonl", "capture is the basename only, never the full path");

  const mid = buildStreakRow(
    { path: "/x/y/s-abc-requests.jsonl", startLine: 338, model: "claude-opus-5", nMsg: 6, maxTokens: 64000,
      intervalMs: 5000, length: 2, billed: 2, members: [captureMember({ line: 338, ts: "t", requestId: "r3" }), captureMember({ line: 339, ts: "t2", requestId: "r4" })] },
    usageIndex,
  );
  assert.equal(mid.class, "mid-session");
});

test("computeRollup: join coverage, byClass, bothAnswered split by non-zero finalOutputTokens", () => {
  const usageIndex = new Map([
    ["r-joined-nonzero", usageRecord({ requestId: "r-joined-nonzero", outputTokens: 500 })],
    ["r-joined-nonzero-2", usageRecord({ requestId: "r-joined-nonzero-2", outputTokens: 300 })],
    ["r-joined-zero", usageRecord({ requestId: "r-joined-zero", outputTokens: 0 })],
    ["r-joined-zero-2", usageRecord({ requestId: "r-joined-zero-2", outputTokens: 40 })],
  ]);

  // Streak A: both members JOINED, both non-zero.
  const streakA = buildStreakRow(
    { path: "/x/a-requests.jsonl", startLine: 3, model: "claude-haiku-5", nMsg: 1, maxTokens: 32000,
      intervalMs: 10, length: 2, billed: 2,
      members: [captureMember({ line: 3, ts: "t", requestId: "r-joined-nonzero" }),
                captureMember({ line: 4, ts: "t2", requestId: "r-joined-nonzero-2" })] },
    usageIndex,
  );
  // Streak B: both members JOINED, one zero -> someZeroOutput.
  const streakB = buildStreakRow(
    { path: "/x/b-requests.jsonl", startLine: 400, model: "claude-opus-5", nMsg: 4, maxTokens: 64000,
      intervalMs: 4000, length: 2, billed: 2,
      members: [captureMember({ line: 400, ts: "t", requestId: "r-joined-zero" }),
                captureMember({ line: 401, ts: "t2", requestId: "r-joined-zero-2" })] },
    usageIndex,
  );
  // Streak C: one member NOT-IN-USAGE-LOG -> not counted in bothAnswered at all.
  const streakC = buildStreakRow(
    { path: "/x/c-requests.jsonl", startLine: 500, model: "claude-opus-5", nMsg: 4, maxTokens: 64000,
      intervalMs: 4000, length: 2, billed: 2,
      members: [captureMember({ line: 500, ts: "t", requestId: "r-nowhere" }),
                { id: "id-c2", ts: "t2", line: 501, outcome: null }] },
    usageIndex,
  );

  const rollup = computeRollup([streakA, streakB, streakC]);
  assert.equal(rollup.byClass["session-start"], 1);
  assert.equal(rollup.byClass["mid-session"], 2);
  assert.equal(rollup.joinCoverage.JOINED, 4);
  assert.equal(rollup.joinCoverage["NOT-IN-USAGE-LOG"], 1);
  assert.equal(rollup.joinCoverage["NO-REQUEST-ID"], 1);
  assert.equal(rollup.bothAnswered.allJoined, 2, "streaks A and B have every member JOINED; C does not");
  assert.equal(rollup.bothAnswered.allNonZeroOutput, 1, "only streak A has every member's finalOutputTokens > 0");
  assert.equal(rollup.bothAnswered.someZeroOutput, 1, "streak B has a joined member whose finalOutputTokens is 0");
});

test("buildReport: filters to billed > 1 streaks only", () => {
  const usageIndex = new Map([["r1", usageRecord({ requestId: "r1", outputTokens: 10 })]]);
  const censusExport = {
    duplicateRows: [
      { path: "/x/once.jsonl", startLine: 3, billed: 1, model: "m", nMsg: 1, maxTokens: 1, intervalMs: 1, length: 1,
        members: [captureMember({ line: 3, ts: "t", requestId: "r1" })] },
      { path: "/x/twice.jsonl", startLine: 10, billed: 2, model: "m", nMsg: 1, maxTokens: 1, intervalMs: 1, length: 2,
        members: [captureMember({ line: 10, ts: "t", requestId: "r1" }), captureMember({ line: 11, ts: "t2", requestId: "r1" })] },
    ],
  };
  const report = buildReport(censusExport, usageIndex);
  assert.equal(report.streaks.length, 1, "billed:1 streak must be excluded");
  assert.equal(report.streaks[0].capture, "twice.jsonl");
});

test("readCensusExport: throws on a payload with no duplicateRows array", () => {
  const dir = tmpDirSync("dupbill-census-");
  const p = join(dir, "bad.json");
  writeFileSync(p, JSON.stringify({ tally: {} }));
  assert.throws(() => readCensusExport(p), /duplicateRows/);
});

test("readUsageIndex: reads a real usage.jsonl file, skips torn lines, indexes by request_id", () => {
  const dir = tmpDirSync("dupbill-usage-");
  const p = join(dir, "usage.jsonl");
  const good = usageRecord({ requestId: "req-file-1", outputTokens: 77 });
  writeFileSync(
    p,
    [JSON.stringify(good), "{not json", JSON.stringify(usageRecord({ requestId: "", outputTokens: 1 }))].join("\n") + "\n",
  );
  const index = readUsageIndex(p);
  assert.equal(index.size, 1, "torn line and empty-request_id line both skipped");
  assert.equal(index.get("req-file-1").output_tokens, 77);
});

test("main: --census pointing at a missing file is a could-not-verify with non-zero exit", () => {
  const code = main(["node", "duplicate-billing.mjs", "--census", "/no/such/file.json", "--json"]);
  assert.equal(code, 1);
});

test("main: no --census at all is a could-not-verify with non-zero exit", () => {
  const code = main(["node", "duplicate-billing.mjs"]);
  assert.equal(code, 1);
});
