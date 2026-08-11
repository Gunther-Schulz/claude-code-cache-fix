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
import { join } from "node:path";

import * as replay from "../tools/replay.mjs";
import { tmpDirSync } from "../tools/tmpdir.mjs";

const { conservationViolations, attributeConservationRows } = replay;

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
