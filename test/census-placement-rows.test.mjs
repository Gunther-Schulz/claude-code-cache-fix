// census-placement-rows — the per-row facts behind the "placement" text
// block's own tally (analysePair's `offset = best.j - hj`), exported so the
// derivability question — is the standalone's index PREDICTABLE per case,
// not just measured as a distribution across the corpus — can be asked
// without re-running the whole corpus by hand. Before this, `details` (and
// therefore every finding's `offset`) never left `main`.
//
// Two index spaces meet in one row: the BEFORE request's (`hostIndexBefore`,
// `nBefore`) and the AFTER request's (`hostIndexAfter`, `standaloneIndex`,
// `nAfter`). This repo has produced a confident wrong answer from exactly
// that conflation before (index alignment across a shifted array,
// `analysePair`'s own header comment on `inlineAfter`), so this bite checks
// each field against its OWN space by hand-computing it from the fixture
// directly, never by trusting the row to be internally consistent with
// itself.
//
// No new analysis, no classification, no verdict change: `placementRows`
// rides only under `--json --verbose`, and the plain-text and `--json`
// (verbose absent) outputs must be unaffected — pinned below rather than
// assumed.
//
// Red-first, demonstrated rather than asserted (dev-loop.md, "Adding a
// check"): against the pre-change census (base 3a368c9) `census()`'s return
// value carries no `placementRows` key at all — every field assertion below
// fails outright (`undefined` has no `.length`, no indexable rows), not just
// on value. Synthetic, deterministic bytes only — this repo is public.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const TOOL = new URL("../tools/reminder-migration-census.mjs", import.meta.url).pathname;

const HOST_ID = "t_host_placement_row_001";
const wrap = (t) => `<system-reminder>\n${t}\n</system-reminder>`;
const INNER = "synthetic placement-row reminder text, deterministic, not capture bytes";

// BEFORE: [head, hostMsg] — the host (carrying the reminder block) sits at
// index 1 in the BEFORE-request index space. hostIndexBefore = 1, nBefore = 2.
const head = { role: "user", content: [{ type: "text", text: "conversation head, synthetic" }] };
const hostMsg = {
  role: "user",
  content: [
    { type: "tool_result", tool_use_id: HOST_ID },
    { type: "text", text: wrap(INNER) },
  ],
};
const before = { body: { messages: [head, hostMsg] } };

// AFTER: [head, filler, hostEcho, standalone] — the host echo (same
// tool_use_id, identity for `hostId`) is at index 2, and the migrated
// standalone at index 3, in the AFTER-request index space. hostIndexAfter =
// 2, standaloneIndex = 3, offset = 3 - 2 = 1, nAfter = 4.
const filler = { role: "user", content: [{ type: "text", text: "filler, synthetic" }] };
const hostEcho = { role: "user", content: [{ type: "tool_result", tool_use_id: HOST_ID }] };
const standalone = { role: "system", content: INNER };
const after = { body: { messages: [head, filler, hostEcho, standalone] } };

function writeCapture(dir) {
  const p = join(dir, "s-synthetic-requests.jsonl");
  writeFileSync(p, [
    JSON.stringify({ ts: "2026-08-14T09:00:00.000Z", body: before.body }),
    JSON.stringify({ ts: "2026-08-14T09:00:01.000Z", body: after.body }),
  ].join("\n") + "\n");
  return p;
}

test("RED-FIRST — a placement row carries the six hand-computed facts, each in its own index space", () => {
  const dir = tmpDirSync("census-placement-rows-");
  const p = writeCapture(dir);
  const out = execFileSync(process.execPath, [TOOL, p, "--json", "--verbose"],
    { encoding: "utf-8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  const res = JSON.parse(out);

  assert.equal(res.pairs, 1, "precondition: the pair must have been compared");
  assert.ok(Array.isArray(res.placementRows), "placementRows must be an array");
  assert.equal(res.placementRows.length, 1, "one EXACT finding, one placement row");

  const row = res.placementRows[0];
  assert.equal(row.verdict, "EXACT");
  assert.equal(row.blocks, 1);
  // BEFORE-request index space.
  assert.equal(row.hostIndexBefore, 1, "the host's own index within [head, hostMsg]");
  assert.equal(row.nBefore, 2, "before.body.messages.length");
  // AFTER-request index space.
  assert.equal(row.hostIndexAfter, 2, "the host echo's index within [head, filler, hostEcho, standalone]");
  assert.equal(row.standaloneIndex, 3, "the standalone's own index in the same array");
  assert.equal(row.nAfter, 4, "after.body.messages.length");
  // The pre-existing computation, unchanged: standaloneIndex - hostIndexAfter.
  assert.equal(row.offset, 1);
  assert.equal(row.offset, row.standaloneIndex - row.hostIndexAfter,
    "offset must equal the two AFTER-space indices' own difference — never trusted independently of them");
});

test("no verdict change — plain text output does not mention placement-row internals", () => {
  const dir = tmpDirSync("census-placement-rows-text-");
  const p = writeCapture(dir);
  const out = execFileSync(process.execPath, [TOOL, p],
    { encoding: "utf-8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  assert.doesNotMatch(out, /placementRows|hostIndexBefore|hostIndexAfter|standaloneIndex/,
    "the plain-text report is unaffected by this export");
});

test("no verdict change — --json without --verbose carries no placementRows key", () => {
  const dir = tmpDirSync("census-placement-rows-json-");
  const p = writeCapture(dir);
  const out = execFileSync(process.execPath, [TOOL, p, "--json"],
    { encoding: "utf-8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  const parsed = JSON.parse(out);
  assert.equal("placementRows" in parsed, false,
    "placementRows is verbose-gated, matching mismatchRows/duplicateRows/volatileRows");
});

// --- the cap keeps the MINORITY whole, added 2026-08-14 at the desk ----------
//
// WHY, and it is a measured defect rather than a refinement. The first version
// of this export took a flat `slice(0, 200)` over the placement findings. Run
// over the live corpus it kept 200 rows of which 190 carried the dominant
// offset and dropped 548 — so the unusual placements, the only rows that can
// answer whether the index is DERIVABLE rather than merely variable, survived
// or died by luck of capture order. A sample of a skewed population is not a
// small version of it, and the export existed for the tail.
//
// So the export splits: every OFF-MODE row is kept, the MODE is sampled, the
// two truncation counters are reported apart, and `placementOffsets` carries
// the COMPLETE distribution so no reader ever derives it from the sample.
// This bite is the cap's own positive — a cap that has never been exercised
// is unproven code, which is how the first one shipped.

const MODE_PAIRS = 30;
const OFF_MODE_PAIRS = 2;

/** One conversation's (before, after) pair. `gap` extra fillers between the
 *  host echo and the standalone make the offset `1 + gap`. Each conversation
 *  gets its own head text, since conversation identity is derived from
 *  `messages[0]` — one shared head would collapse them into a single group. */
function conversationPair(id, gap) {
  const hostId = `t_host_cap_${id}`;
  const cHead = { role: "user", content: [{ type: "text", text: `conversation head ${id}, synthetic` }] };
  const cHost = {
    role: "user",
    content: [
      { type: "tool_result", tool_use_id: hostId },
      { type: "text", text: wrap(INNER) },
    ],
  };
  const cEcho = { role: "user", content: [{ type: "tool_result", tool_use_id: hostId }] };
  const gaps = Array.from({ length: gap }, (_, i) => (
    { role: "user", content: [{ type: "text", text: `gap ${i} in ${id}, synthetic` }] }));
  return {
    before: { messages: [cHead, cHost] },
    after: { messages: [cHead, cEcho, ...gaps, { role: "system", content: INNER }] },
  };
}

test("the placement cap keeps every OFF-MODE row and samples the mode", () => {
  const dir = tmpDirSync("census-placement-cap-");
  const p = join(dir, "s-synthetic-cap-requests.jsonl");
  const lines = [];
  let t = 0;
  const emit = (id, gap) => {
    const { before: b, after: a } = conversationPair(id, gap);
    lines.push(JSON.stringify({ ts: new Date(Date.UTC(2026, 7, 14, 9, 0, t++)).toISOString(), body: b }));
    lines.push(JSON.stringify({ ts: new Date(Date.UTC(2026, 7, 14, 9, 0, t++)).toISOString(), body: a }));
  };
  for (let i = 0; i < MODE_PAIRS; i++) emit(`mode-${i}`, 0);       // offset 1
  for (let i = 0; i < OFF_MODE_PAIRS; i++) emit(`off-${i}`, 2);    // offset 3
  writeFileSync(p, lines.join("\n") + "\n");

  const out = execFileSync(process.execPath, [TOOL, p, "--json", "--verbose"],
    { encoding: "utf-8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  const res = JSON.parse(out);

  // The COMPLETE distribution is exact and uncapped — this is the number a
  // reader must never take from the rows.
  assert.deepEqual(res.placementOffsets, { 1: MODE_PAIRS, 3: OFF_MODE_PAIRS },
    "the offset tally covers every finding, not the exported sample");

  const off = res.placementRows.filter((r) => r.placementClass === "OFF-MODE");
  const mode = res.placementRows.filter((r) => r.placementClass === "MODE-SAMPLE");
  assert.equal(off.length, OFF_MODE_PAIRS, "every off-mode row survives the cap");
  assert.equal(mode.length, 25, "the mode is sampled to PLACEMENT_MODE_SAMPLE");
  assert.deepEqual(res.placementModeSampled, { kept: 25, total: MODE_PAIRS },
    "the sampling says what it kept and out of how many");
  assert.equal(res.placementOffModeTruncated, undefined,
    "nothing off-mode was dropped, so no off-mode truncation is reported");
  for (const r of off) assert.equal(r.offset, 3, "the off-mode rows are the ones with the gap");
});
