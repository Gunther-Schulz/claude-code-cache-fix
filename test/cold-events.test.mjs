// cold-events — the detector's contract, on synthetic rows.
//
// Every expected value below comes from the DEFINITION the tool reproduces —
// claude-worktime's cold-rewrite predicate, quoted in the tool's header —
// never from the implementation. Written definition-first on purpose
// (dev-loop.md, "Adding a check"): an expectation with the same parentage as
// the code pins the bug it should catch.
//
//     ctx      = cache_read + cache_creation + input_tokens
//     hit  <=>  a prior turn exists on THIS conversation
//               and cc >= floor(prev_ctx * 6/10)
//               and cr <= floor(prev_ctx / 5)
//
// Both comparisons are inclusive, and both integer divisions floor — so at
// prev_ctx = 100000 the exact boundary pair (cc = 60000, cr = 20000) is a
// hit, and one token either way on either side is not.

import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { rm, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  scanRows,
  normalizeRow,
  ledgerLines,
  main,
  DEFAULT_LEDGER_PATH,
  COLD_TTL_SEC,
} from "../tools/cold-events.mjs";
// Namespace import for the --rows-mode exports (`inWindow`, `toRowRecord`,
// `rowsForOutput`): a static named import of a binding that does not exist
// yet throws SyntaxError at MODULE LOAD, which would fail every pre-existing
// test in this file too — not the red-first split the brief asks for (the
// new bites fail, the old ones still pass). A namespace import degrades a
// missing export to `undefined` at the property access instead, so the
// import survives against the unmodified tool and each new bite goes red on
// its own assertion.
import * as coldEvents from "../tools/cold-events.mjs";

// A transcript-shaped usage row. `input` defaults to 0 so a test can state
// prev_ctx as cc+cr and read the threshold arithmetic straight off the call.
const row = (over = {}) => ({
  key: "a-conv",
  sid: "S",
  id: null,
  ts: "2026-07-30T10:00:00.000Z",
  model: "claude-fable-5",
  cc: 0,
  cr: 0,
  input: 0,
  src: "transcript",
  grain: "conversation",
  apiCause: null,
  mtok: null,
  ...over,
});

// prev_ctx = 100000 for every threshold case below.
const seed = row({ ts: "2026-07-30T10:00:00.000Z", cc: 40000, cr: 60000 });

test("threshold GREEN: the exact boundary pair is a hit (both comparisons inclusive)", () => {
  const { events } = scanRows([
    seed,
    row({ ts: "2026-07-30T10:00:10.000Z", cc: 60000, cr: 20000 }),
  ]);
  assert.equal(events.length, 1);
  assert.equal(events[0].cc, 60000);
  assert.equal(events[0].prevCtx, 100000);
});

test("threshold RED: one token under the cc floor is not a hit", () => {
  const { events } = scanRows([
    seed,
    row({ ts: "2026-07-30T10:00:10.000Z", cc: 59999, cr: 20000 }),
  ]);
  assert.equal(events.length, 0);
});

test("threshold RED: one token over the cr ceiling is not a hit", () => {
  const { events } = scanRows([
    seed,
    row({ ts: "2026-07-30T10:00:10.000Z", cc: 60000, cr: 20001 }),
  ]);
  assert.equal(events.length, 0);
});

test("a conversation's FIRST turn is never an event — no cache existed to lose", () => {
  // cr=0 with cc=the-whole-context is mechanically identical to a cold
  // rewrite; worktime's prev_t>0 clause is what tells them apart.
  const { events, totals } = scanRows([row({ cc: 500000, cr: 0 })]);
  assert.equal(events.length, 0);
  assert.equal(totals[0].calls, 1);
  assert.equal(totals[0].cc, 500000);
});

test("cause: an idle gap past 90% of the TTL reads idle, not the API's reason", () => {
  const { events } = scanRows([
    seed,
    row({
      ts: new Date(Date.parse(seed.ts) + Math.floor((COLD_TTL_SEC * 9) / 10) * 1000).toISOString(),
      cc: 60000,
      cr: 0,
      apiCause: "messages_changed",
    }),
  ]);
  assert.equal(events.length, 1);
  assert.equal(events[0].cause, "idle");
});

test("cause: a model switch inside the TTL is a cache-key change, not a bust", () => {
  const { events } = scanRows([
    seed,
    row({ ts: "2026-07-30T10:00:10.000Z", cc: 60000, cr: 0, model: "claude-opus-5" }),
  ]);
  assert.equal(events[0].cause, "model");
  assert.equal(events[0].prevModel, "claude-fable-5");
});

test("cause: same model, no idle — the API's own reason rides through, else other", () => {
  const withDiag = scanRows([
    seed,
    row({ ts: "2026-07-30T10:00:10.000Z", cc: 60000, cr: 0, apiCause: "tools_changed", mtok: 42 }),
  ]);
  assert.equal(withDiag.events[0].cause, "tools_changed");
  assert.equal(withDiag.events[0].mtok, 42);
  const bare = scanRows([seed, row({ ts: "2026-07-30T10:00:10.000Z", cc: 60000, cr: 0 })]);
  assert.equal(bare.events[0].cause, "other");
});

test("conversations are scored separately — a subagent never diffs against its parent", () => {
  // The co-tenant false-cause artifact prefix-diff's tenantId exists to remove:
  // one session id carries the main thread AND every dispatch, so a 38k
  // subagent turn following a 236k main turn is not a 236k-context rewrite.
  const { events, totals } = scanRows([
    row({ key: "s-S", ts: "2026-07-30T10:00:00.000Z", cc: 10000, cr: 226000, grain: "session" }),
    row({ key: "a-sub", ts: "2026-07-30T10:00:05.000Z", cc: 38000, cr: 0 }),
    row({ key: "a-sub", ts: "2026-07-30T10:00:09.000Z", cc: 5000, cr: 38000 }),
  ]);
  assert.equal(events.length, 0);
  assert.equal(totals.length, 2);
  assert.deepEqual(totals.map((t) => t.key).sort(), ["a-sub", "s-S"]);
});

test("duplicate transcript rows are one API call — summing them triples the cost", () => {
  // A CC transcript replays the same assistant entry once per tool-use leg;
  // requestId is the API call. Measured on the 2026-07-30 fable dispatch:
  // 38 rows, 12 calls, 3,088,171 raw processed vs 1,071,241 real.
  const dup = (i) => row({ id: "req_A", ts: `2026-07-30T10:00:0${i}.000Z`, cc: 100, cr: 900 });
  const { totals, dropped } = scanRows([dup(1), dup(2), dup(3)]);
  assert.equal(dropped, 2);
  assert.equal(totals[0].calls, 1);
  assert.equal(totals[0].processed, 1000);
});

test("normalizeRow reads the proxy's outcome record — the response usage already on disk", () => {
  // request-capture.mjs buildOutcomeRecord's shape. Capture-sourced rows are
  // session-grained: the proxy cannot see agent identity, and saying so is
  // the difference between a limit and a silent mis-grouping.
  const r = normalizeRow({
    ts: "2026-08-01T09:19:58.840Z",
    type: "outcome",
    id: "2edf0680-572",
    key: "s-synthkey01",
    model: "claude-haiku-4-5-20251001",
    usage: { cacheRead: 11, cacheCreation: 22, inputTokens: 534, outputTokens: 1 },
  });
  assert.equal(r.key, "s-synthkey01");
  assert.equal(r.cc, 22);
  assert.equal(r.cr, 11);
  assert.equal(r.input, 534);
  assert.equal(r.grain, "session");
  assert.equal(r.src, "capture");
});

test("normalizeRow keys a transcript row by CONVERSATION, not by session id", () => {
  const sub = normalizeRow({
    timestamp: "2026-07-30T16:51:17.379Z",
    requestId: "req_1",
    agentId: "afable-synthetic-agent-0001",
    sessionId: "11111111-2222-3333-4444-555555555555",
    message: { model: "claude-fable-5", usage: { cache_creation_input_tokens: 38589, cache_read_input_tokens: 0, input_tokens: 2 } },
  });
  assert.equal(sub.key, "a-afable-synthetic-agent-0001");
  assert.equal(sub.sid, "11111111-2222-3333-4444-555555555555");
  assert.equal(sub.grain, "conversation");
  const main0 = normalizeRow({
    timestamp: "2026-07-30T16:57:13.833Z",
    requestId: "req_2",
    sessionId: "11111111-2222-3333-4444-555555555555",
    message: { usage: { cache_creation_input_tokens: 1, cache_read_input_tokens: 1, input_tokens: 1 } },
  });
  assert.equal(main0.key, "s-11111111-2222-3333-4444-555555555555");
  assert.equal(main0.grain, "session");
});

test("normalizeRow ignores every line that is not a usage report", () => {
  assert.equal(normalizeRow(null), null);
  assert.equal(normalizeRow({ type: "boot", gates: {} }), null);
  assert.equal(normalizeRow({ type: "user", message: { content: "hi" } }), null);
});

test("totals carry the spend worktime structurally cannot see", () => {
  const { totals } = scanRows([
    row({ key: "a-sub", id: "1", ts: "2026-07-30T10:00:00.000Z", cc: 38589, cr: 0, input: 2 }),
    row({ key: "a-sub", id: "2", ts: "2026-07-30T10:00:06.000Z", cc: 29408, cr: 38589, input: 2 }),
  ]);
  assert.equal(totals[0].key, "a-sub");
  assert.equal(totals[0].processed, 38589 + 29408 + 38589);
  assert.equal(totals[0].events, 0);
  assert.deepEqual(totals[0].models, ["claude-fable-5"]);
});

test("a run that found no usage rows says so and exits 2 — never a clean 0", () => {
  // dev-loop.md, "A checker has THREE answers": absence of evidence must not
  // wear a verdict's clothes.
  return (async () => {
    const dir = await tmpDir("cold-events-");
    try {
      const empty = join(dir, "empty.jsonl");
      await writeFile(empty, '{"type":"boot","gates":{}}\n');
      assert.equal(await main(["node", "cold-events.mjs", empty]), 2);
      assert.equal(await main(["node", "cold-events.mjs"]), 2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  })();
});

test("--out writes the ledger it is given, and the live ledger path is never a default", async () => {
  const dir = await tmpDir("cold-events-");
  try {
    const src = join(dir, "t.jsonl");
    await writeFile(src, [
      JSON.stringify({ timestamp: "2026-07-30T10:00:00.000Z", requestId: "r1", agentId: "sub", sessionId: "S",
                       message: { model: "m", usage: { cache_creation_input_tokens: 40000, cache_read_input_tokens: 60000, input_tokens: 0 } } }),
      JSON.stringify({ timestamp: "2026-07-30T10:00:10.000Z", requestId: "r2", agentId: "sub", sessionId: "S",
                       message: { model: "m", usage: { cache_creation_input_tokens: 60000, cache_read_input_tokens: 20000, input_tokens: 0 } } }),
    ].join("\n") + "\n");
    const out = join(dir, "ledger.jsonl");
    assert.equal(await main(["node", "cold-events.mjs", "--out", out, src]), 0);
    const written = (await readFile(out, "utf8")).trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(written.filter((r) => r.type === "cold-event").length, 1);
    assert.equal(written.filter((r) => r.type === "cold-totals").length, 1);
    // The assignment exists so live wiring has one path; a test run must not
    // be able to reach it.
    // `cache-fix-cold-events.jsonl` -> `cache-fix/cold-events.jsonl` with the
    // XDG migration: the directory names the tool, so the file no longer does.
    assert.match(DEFAULT_LEDGER_PATH, /cache-fix\/cold-events\.jsonl$/);
    assert.notEqual(out, DEFAULT_LEDGER_PATH);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("ledgerLines emits events before totals, one JSON object per line", () => {
  const result = scanRows([seed, row({ ts: "2026-07-30T10:00:10.000Z", cc: 60000, cr: 0 })]);
  const lines = ledgerLines(result);
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[0]).type, "cold-event");
  assert.equal(JSON.parse(lines[1]).type, "cold-totals");
});

// --- --rows mode (BACKLOG: "a TRANSCRIPT query instrument") ---

async function captureStderr(fn) {
  const chunks = [];
  const orig = process.stderr.write;
  process.stderr.write = (chunk) => { chunks.push(chunk.toString()); return true; };
  try { return { result: await fn(), stderr: () => chunks.join("") }; }
  finally { process.stderr.write = orig; }
}

// A single real transcript line, so a `--rows`/`--since` usage-error test
// exercises the OLD code's real read path too (rather than tripping only the
// pre-existing "no inputs" exit, which both old and new code return 2 for —
// that would pass red-first for the wrong reason).
const transcriptLine = () => JSON.stringify({
  timestamp: "2026-07-30T10:00:00.000Z",
  requestId: "req_x",
  sessionId: "S",
  message: { model: "m", usage: { cache_creation_input_tokens: 1, cache_read_input_tokens: 1, input_tokens: 1 } },
});

test("--rows and --json are a usage error: exit 2, and the message names the conflict", async () => {
  const dir = await tmpDir("cold-events-");
  try {
    const f = join(dir, "t.jsonl");
    await writeFile(f, transcriptLine() + "\n");
    const { result, stderr } = await captureStderr(() =>
      main(["node", "cold-events.mjs", "--rows", "--json", f]));
    assert.equal(result, 2);
    assert.match(stderr(), /--rows/);
    assert.match(stderr(), /--json/);
    assert.match(stderr(), /exclusive/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("an unparseable --since is a usage error: exit 2, message names --since", async () => {
  const dir = await tmpDir("cold-events-");
  try {
    const f = join(dir, "t.jsonl");
    await writeFile(f, transcriptLine() + "\n");
    const { result, stderr } = await captureStderr(() =>
      main(["node", "cold-events.mjs", "--rows", "--since", "not-a-date", f]));
    assert.equal(result, 2);
    assert.match(stderr(), /--since/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("inWindow: both --since/--until bounds are inclusive at their exact edges", () => {
  const since = Date.parse("2026-08-07T01:00:00.000Z");
  const until = Date.parse("2026-08-07T02:00:00.000Z");
  assert.equal(coldEvents.inWindow("2026-08-07T01:00:00.000Z", since, until), true);
  assert.equal(coldEvents.inWindow("2026-08-07T02:00:00.000Z", since, until), true);
  assert.equal(coldEvents.inWindow("2026-08-07T00:59:59.999Z", since, until), false);
  assert.equal(coldEvents.inWindow("2026-08-07T02:00:00.001Z", since, until), false);
});

test("inWindow: a row with no ts is excluded once a bound is given, included when neither is", () => {
  const since = Date.parse("2026-08-07T01:00:00.000Z");
  assert.equal(coldEvents.inWindow(null, since, undefined), false);
  assert.equal(coldEvents.inWindow(null, undefined, Date.parse("2026-08-07T02:00:00.000Z")), false);
  assert.equal(coldEvents.inWindow(null, undefined, undefined), true);
});

test("duplicate requestId rows collapse to one row in scanRows(...).rows and raise dropped", () => {
  const dup = (i) => row({ id: "req_A", ts: `2026-07-30T10:00:0${i}.000Z`, cc: 100, cr: 900 });
  const result = scanRows([dup(1), dup(2), dup(3)]);
  assert.ok(Array.isArray(result.rows), "scanRows(...).rows must exist (the docstring divergence)");
  assert.equal(result.rows.length, 1);
  assert.equal(result.dropped, 2);
  assert.equal(result.rows[0].id, "req_A");
});

test("scanRows(...).rows is the deduped set, window-unfiltered, not just events/totals", () => {
  // Two distinct conversations, no duplicates: rows must carry every surviving
  // row, not just the ones that crossed the cold-rewrite threshold.
  const a = row({ key: "a-conv", id: "r1", ts: "2026-07-30T10:00:00.000Z", cc: 1, cr: 1 });
  const b = row({ key: "b-conv", id: "r2", ts: "2026-07-30T11:00:00.000Z", cc: 2, cr: 2 });
  const result = scanRows([a, b]);
  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows.map((r) => r.id).sort(), ["r1", "r2"]);
});

test("toRowRecord: ctx equals cc + cr + input on an emitted row", () => {
  const r = row({ cc: 111, cr: 222, input: 333 });
  const emitted = coldEvents.toRowRecord(r);
  assert.equal(emitted.ctx, 111 + 222 + 333);
});

test("normalizeRow: messageId and stopReason survive from a constructed transcript entry", () => {
  const r = normalizeRow({
    timestamp: "2026-07-30T10:00:00.000Z",
    requestId: "req_1",
    sessionId: "S",
    message: {
      id: "msg_abc123",
      model: "m",
      stop_reason: "end_turn",
      usage: { cache_creation_input_tokens: 1, cache_read_input_tokens: 1, input_tokens: 1 },
    },
  });
  assert.equal(r.messageId, "msg_abc123");
  assert.equal(r.stopReason, "end_turn");
});

test("normalizeRow: messageId and stopReason are null for a capture outcome record", () => {
  const r = normalizeRow({
    ts: "2026-08-01T09:19:58.840Z",
    type: "outcome",
    id: "2edf0680-572",
    key: "s-synthkey01",
    model: "claude-haiku-4-5-20251001",
    usage: { cacheRead: 11, cacheCreation: 22, inputTokens: 534, outputTokens: 1 },
  });
  assert.equal(r.messageId, null);
  assert.equal(r.stopReason, null);
});
