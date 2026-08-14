// Per-stage attribution for the conservation gate's R-side rows.
//
// WHY THIS EXISTS. The gate's extension bisection is pointed at STABILITY
// rows only (`if (violations.length)` in replay.mjs's attribution block), so a
// conservation row has always arrived with no answer to "which stage took the
// bytes". The 2026-08-11 sweep produced 1,899 of them across eleven captures
// and the walk had to answer that question by hand — running each candidate
// extension's exported transform over the real blocks, one candidate per
// round. That is the hand method `docs/runbooks/sweep-finding.md` step 4
// already carries a [GRADUATE] marker for.
//
// The DEFINITION the assertions below are written from, before any of them:
// for a row naming units of CC's raw request that reached no forwarded
// message, the attribution is the FIRST pipeline stage after which that unit's
// hash is no longer present anywhere in the body. Three answers, not two —
// `removed` (a stage took it), `survived-pipeline` (it is still on the wire at
// the end of this replay, so the row is not reproducible here: COULD NOT
// VERIFY, never "clean"), and `absent-in-raw` (it was not in the body this
// replay started from, which indicts the probe rather than the pipeline).
//
// Namespace import, deliberately: a static named import of a not-yet-written
// export fails the whole module at ESM link time and every bite in the file
// goes red at once, which proves the export is new and nothing else
// (docs/dev-loop.md, "the commonest way to collapse the split is the import
// line"). With `import * as` the pre-existing expectations still run.

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { writeFile, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import * as replay from "../tools/replay.mjs";
import { tmpDirSync, tmpDir } from "../tools/tmpdir.mjs";
import { resolveInsertionSessionKey } from "../proxy/extensions/insertion-normalization.mjs";

const { conservationViolations, attributeConservationRows } = replay;

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPLAY = join(__dirname, "..", "tools", "replay.mjs");

// A one-conversation corpus: two requests, each carrying the same user message
// whose second block is the one under test.
const MARK = "<system-reminder>\nthe block under test\n</system-reminder>";

function corpus(dir) {
  const msg = (i) => ([
    { role: "user", content: [{ type: "text", text: "first message" }] },
    { role: "assistant", content: [{ type: "text", text: `turn ${i}` }] },
    { role: "user", content: [
      { type: "text", text: "carrier" },
      { type: "text", text: MARK },
    ] },
  ]);
  const file = join(dir, "corpus.jsonl");
  writeFileSync(file, [0, 1].map((i) =>
    JSON.stringify({ type: "request", ts: `2026-08-11T00:00:0${i}.000Z`, key: "k", body: { messages: msg(i) } }),
  ).join("\n") + "\n");
  return file;
}

// Three fake stages. Only the middle one touches the block, which is what
// makes the attribution falsifiable: a result of "early" or "late" is wrong in
// a way the assertion can see.
const stage = (name, onRequest) => ({ name, onRequest });
const dropMark = (ctx) => {
  for (const m of ctx.body.messages ?? []) {
    if (!Array.isArray(m.content)) continue;
    m.content = m.content.filter((b) => b.text !== MARK);
  }
};
const noop = () => {};

function deps(mutators) {
  return {
    loadExtensions: async () => mutators,
    runOnRequest: async (ctx, exts) => {
      for (const e of exts) if (e.onRequest) await e.onRequest(ctx);
    },
  };
}

const rowsFor = (ns, hashes) => ns.map((n) => ({
  n, ts: "2026-08-11T00:00:00.000Z", kind: "lost", at: 2, side: "in",
  unaccountedHashes: hashes,
}));

// The hash the gate itself would put on the row, taken from the gate rather
// than recomputed here — a second definition of "the unit" is a second truth
// (docs/dev-loop.md, "never hand-roll identity in a probe").
function markHash() {
  const r = conservationViolations({
    n: 0, ts: "t",
    inMsgs: [{ role: "user", content: [{ type: "text", text: "carrier" }, { type: "text", text: MARK }] }],
    outMsgs: [{ role: "user", content: [{ type: "text", text: "carrier" }] }],
    stats: null, smooshSplitStats: null, freshSessionSortStats: null,
    contentStripStats: null, mutatedBy: [],
  }, new Set());
  assert.equal(r.violations.length, 1, "arrange: the gate reports the dropped block as one lost row");
  assert.equal(r.violations[0].unaccountedHashes?.length, 1,
    "the row carries the hash of the unit it says went missing — without it nothing downstream can ask about that unit");
  return r.violations[0].unaccountedHashes[0];
}

test("the row names the units it says are unaccounted for", () => {
  markHash();
});

test("attribution names the stage that removed the unit", async () => {
  const dir = tmpDirSync("cons-attr-");
  const file = corpus(dir);
  const h = markHash();
  const rows = rowsFor([0, 1], [h]);

  await attributeConservationRows(file, rows, deps([
    stage("early", noop), stage("remover", dropMark), stage("late", noop),
  ]));

  for (const row of rows) {
    assert.equal(row.attribution?.ext, "remover",
      `row n=${row.n}: the middle stage is the only one that touches the block`);
    assert.deepEqual(row.attribution.perUnit.map((u) => u.reason), ["removed"]);
  }
});

test("DISCRIMINATION — with the removing stage made inert, the answer must DIFFER", async () => {
  // The pair the instrument rules demand: the probed result equals the outcome
  // the probe names, AND differs from the unprobed one. An attribution that
  // returned "remover" here too would be reporting the pipeline's shape rather
  // than measuring it.
  const dir = tmpDirSync("cons-attr-inert-");
  const file = corpus(dir);
  const h = markHash();
  const rows = rowsFor([0], [h]);

  await attributeConservationRows(file, rows, deps([
    stage("early", noop), stage("remover", noop), stage("late", noop),
  ]));

  assert.equal(rows[0].attribution?.ext, null,
    "no stage removed it, so no stage may be named");
  assert.deepEqual(rows[0].attribution.perUnit.map((u) => u.reason), ["survived-pipeline"],
    "still on the wire at the end: COULD NOT VERIFY, which is its own answer and not a pass");
});

test("a unit absent from the raw body indicts the probe, not a stage", async () => {
  // The third answer's other half. A hash that was never in what this replay
  // started from cannot have been removed by anything in it, and reporting the
  // first stage anyway is how an instrument aimed at the wrong bytes returns a
  // confident name.
  const dir = tmpDirSync("cons-attr-raw-");
  const file = corpus(dir);
  const rows = rowsFor([0], ["0000000000000000"]);

  await attributeConservationRows(file, rows, deps([
    stage("early", noop), stage("remover", dropMark), stage("late", noop),
  ]));

  assert.equal(rows[0].attribution?.ext, null);
  assert.deepEqual(rows[0].attribution.perUnit.map((u) => u.reason), ["absent-in-raw"]);
});

test("a request with no row is still replayed, so stateful stages see the whole corpus", async () => {
  // The reason this is not a two-request slice: insertion-normalization and
  // deferred-tool-rewrite build per-conversation state from every preceding
  // request, and a pass that skipped the unrowed ones would put them in a
  // state the violating run never had — the exact failure the stability
  // attribution documents as its reason for replaying the whole corpus.
  const dir = tmpDirSync("cons-attr-state-");
  const file = corpus(dir);
  const h = markHash();
  const rows = rowsFor([1], [h]);
  const seen = [];

  await attributeConservationRows(file, rows, deps([
    stage("counter", (ctx) => { seen.push(ctx.body.messages.length); }),
    stage("remover", dropMark),
  ]));

  assert.equal(seen.length, 2, "both requests ran through the pipeline, not just the rowed one");
  assert.equal(rows[0].attribution?.ext, "remover");
});

// --- insertionKey: the joinable coordinate a replay row shares with the ---
// --- live `<key>-insertion-events.jsonl` log ---
//
// BACKLOG "replay request ordinals and the live insertion event log share no
// joinable coordinate, and the walk compared them by timestamp": the 2026-08-11
// walk refuted insertion-normalization by reading a live event log record 3 ms
// from the row's own timestamp — `report[].key` is the plain SESSION key,
// never the conversation one, so a co-tenant's record can sit just as close
// in time and get matched instead.
//
// LIVE CASE ATTEMPTED FIRST, per the dispatcher's instruction. The exact
// 2026-08-11 n=46 case (alias s-captureBA — capture-aliases.json) is STILL
// ON DISK (protected) and its live event log DOES carry a matching record —
// but an offline full-corpus replay of that single capture file (both with
// and without --gates-from-capture) recomputes a DIFFERENT conv sub-key at
// n=46, because insertion-normalization's and fresh-session-sort's conv
// identity is state-built from every preceding request this extension ever
// saw for that session (attributeConservationRows' own comment, above,
// states the same fact for the conservation gate) — state this single
// capture file does not itself fully carry (a resumed session, or
// per-conversation memory files a fresh scratch replay cannot reconstruct
// from one file alone). That is a pre-existing replay-fidelity limit, not a
// defect in `insertionKey`'s computation: `resolveInsertionSessionKey` is
// called with the identical headers/messages/system/preConv shape
// insertion-normalization itself reads (verified by code inspection, tools/
// replay.mjs, the comment above the per-extension loop). Reported as a gap
// (closing report (c)) rather than papered over with a substitute live case.
//
// SYNTHETIC PAIR below, per the dispatcher's explicit fallback authorization
// for exactly this situation. Two distinct real conversations (distinct
// session ids, distinct msgs[0]) in ONE capture, replayed with no prior
// state (both start "no-prior-canonical", so no cross-request memory is in
// play and the computed key is exactly reproducible) — the arms still DIFFER
// (instrument-pair rule): conversation A's row must join ONLY to A's event
// record, never to B's, even when B's record sits CLOSER in time. Session
// ids below are synthetic test fixtures, never real captures.

const SID_A = "insertion-key-test-sid-A";
const SID_B = "insertion-key-test-sid-B";

function reqLine(sid, ts, messages) {
  return JSON.stringify({
    ts,
    id: `id-${sid}-${ts}`,
    sid,
    key: `s-${sid}`,
    headers: { "anthropic-beta": null, "session-id": sid },
    body: { model: "claude-opus-5", system: [{ type: "text", text: "sys" }], messages },
  });
}

const iu = (t) => ({ role: "user", content: [{ type: "text", text: t }] });

async function insertionKeyFixture(dir) {
  const path = join(dir, "insertion-key-corpus.jsonl");
  const lines = [
    reqLine(SID_A, "2026-08-11T00:00:00.100Z", [iu("conversation A, first message")]),
    reqLine(SID_B, "2026-08-11T00:00:00.200Z", [iu("conversation B, first message")]),
  ];
  await writeFile(path, lines.join("\n") + "\n");
  return path;
}

function runReplayJson(file) {
  const res = spawnSync(process.execPath, [REPLAY, file, "--json"], {
    encoding: "utf-8",
    env: { PATH: process.env.PATH, CACHE_FIX_INSERTION_NORMALIZE: "1" },
  });
  assert.equal(res.status, 0, `replay exited nonzero: ${res.stderr}`);
  return JSON.parse(res.stdout);
}

test("a replay row carries insertionKey, matching resolveInsertionSessionKey computed independently over the same raw inputs", async () => {
  const dir = await tmpDir("replay-insertion-key-");
  try {
    const file = await insertionKeyFixture(dir);
    const out = runReplayJson(file);
    const rowA = out.report.find((r) => r.key === `s-${SID_A}`);
    const rowB = out.report.find((r) => r.key === `s-${SID_B}`);
    assert.ok(rowA && rowB, "both requests must produce a report row");

    // Independently derived (never read off the row under test) — the same
    // no-prior-canonical shape the real n=46 case carries, so preConv is null
    // and the expected key is a pure function of this request's own bytes.
    // `x-session-id`, not `session-id`: resolveSessionId (cache-telemetry)
    // reads the former — the same reconstruction main()'s own capture-replay
    // loop does on `rec.headers["session-id"]` before calling anything that
    // resolves a session id (tools/replay.mjs, main(), "resolveSessionId
    // ... reads x-session-id / x-claude-code-session-id").
    const expectedA = resolveInsertionSessionKey(
      { "x-session-id": SID_A }, [iu("conversation A, first message")],
      [{ type: "text", text: "sys" }], null,
    );
    const expectedB = resolveInsertionSessionKey(
      { "x-session-id": SID_B }, [iu("conversation B, first message")],
      [{ type: "text", text: "sys" }], null,
    );
    assert.equal(rowA.insertionKey, expectedA);
    assert.equal(rowB.insertionKey, expectedB);
    assert.notEqual(rowA.insertionKey, rowB.insertionKey, "two different conversations must not collide");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("DISCRIMINATION — a row joins to its own event-log record by insertionKey, never to a different conversation's record that sits CLOSER in time", async () => {
  const dir = await tmpDir("replay-insertion-key-join-");
  try {
    const file = await insertionKeyFixture(dir);
    const out = runReplayJson(file);
    const rowA = out.report.find((r) => r.key === `s-${SID_A}`);
    const rowB = out.report.find((r) => r.key === `s-${SID_B}`);

    // The live shape: `<key>-insertion-events.jsonl` records carry `key` and
    // `ts`. A's own record sits 5 ms from the row; B's (a DIFFERENT
    // conversation) sits only 3 ms away — closer in time, wrong conversation,
    // exactly the "record 3 ms from the row's own timestamp" shape the
    // 2026-08-11 walk was fooled by.
    const eventLog = [
      { ts: "2026-08-11T00:00:00.103Z", key: rowB.insertionKey, action: "reset" }, // wrong conversation, CLOSER (3 ms from rowA.ts)
      { ts: "2026-08-11T00:00:00.105Z", key: rowA.insertionKey, action: "reset" }, // A's own, farther (5 ms from rowA.ts)
    ];

    // A naive timestamp-nearest join (what the refuted walk did) picks the
    // WRONG record: B's, because it is closer in time to A's row.
    const byTime = (row) => eventLog.slice().sort(
      (x, y) => Math.abs(new Date(x.ts) - new Date(row.ts)) - Math.abs(new Date(y.ts) - new Date(row.ts)),
    )[0];
    assert.equal(byTime(rowA).key, rowB.insertionKey,
      "control: proves the failure mode is real — nearest-timestamp alone picks the wrong conversation's record");

    // The key-join — what insertionKey now makes possible — picks correctly
    // regardless of time distance, and finds exactly one match.
    const byKey = (row) => eventLog.filter((e) => e.key === row.insertionKey);
    assert.equal(byKey(rowA).length, 1, "exactly one match by key");
    assert.equal(byKey(rowA)[0].key, rowA.insertionKey);
    assert.notEqual(byKey(rowA)[0].ts, eventLog.find((e) => e.key === rowB.insertionKey).ts,
      "the matched record is A's own, not B's closer-in-time neighbour");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
