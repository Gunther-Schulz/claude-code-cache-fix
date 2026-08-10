// census-mismatch-rows-export — the byte-gate's MISMATCH rows have no way OUT
// of the census (BACKLOG "READY — the byte-gate's MISMATCH rows have no way
// OUT of the census"). The six other per-gate row arrays ride the daily
// status file already; the byte gate's `--json` emit never included the
// per-row `details` it builds internally at all, so nothing downstream —
// gate-live's status file, a human running the tool by hand and piping to
// `jq` — could ever see a MISMATCH row's content, only its aggregate count.
//
// Design, from the entry: expose a MISMATCH-FILTERED slice (never raw
// `details`, which is unbounded and includes EXACT rows), capped
// CENSUS-side — the producer owns its own bound — with an explicit
// `mismatchRowsTruncated: <total>` beside it when the cap trims anything.
// Verbatim from `details`, no reshaping: the census is the recorder here,
// same convention gate-live's own `persistRows` already uses for its row
// arrays ("Verbatim from the child's parsed JSON, no reshaping").
//
// SCOPE NOTE, read together with the closing report: this file proves the
// CENSUS side only — that the `--json` output now has a way out for MISMATCH
// rows. Wiring that field into gate-live's own `summariseCensus` and
// `persistRows` (so it lands on the daily status file as
// `byteGateMismatchRows`) touches `tools/gate-live.mjs`, which is outside
// this lane's write boundary; see the closing report for that gap.
//
// Gated behind --verbose in --json mode, same convention `volatileRows` and
// `duplicateRows` already use ("the unbounded detail rows appear only under
// --verbose so the sweep's status file does not grow a row per reminder
// flip") — a plain `--json` run must not carry the unbounded rows either.
// Synthetic, deterministic bytes only — this repo is public.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const TOOL = new URL("../tools/reminder-migration-census.mjs", import.meta.url).pathname;

const wrap = (t) => `<system-reminder>\n${t}\n</system-reminder>`;

// One MISMATCH pair: a host whose reminder block leaves the inline form, and
// a position-eligible standalone in `after` whose wrapper survives — the same
// shape `census-counterpart-diagnostic.test.mjs` and
// `census-mismatch-body.test.mjs` already pin at the `analysePair` and CLI
// levels. `n` keeps every conversation (and every tool_use_id) distinct, so
// each pair is its own finding rather than merging into one conversation.
function mismatchPair(n) {
  const inner = `synthetic mismatch-export reminder body #${n}, not capture bytes`;
  const wrapped = wrap(inner);
  const hostId = `t_host_mismatch_export_${n}`;
  const head = { role: "user", content: [{ type: "text", text: `conversation head #${n}, synthetic` }] };
  const hostMsg = {
    role: "user",
    content: [
      { type: "tool_result", tool_use_id: hostId },
      { type: "text", text: wrapped },
    ],
  };
  const hostEcho = { role: "user", content: [{ type: "tool_result", tool_use_id: hostId }] };
  const rejected = { role: "system", content: wrapped };
  return {
    before: { ts: `2026-08-10T09:00:00.${String(n).padStart(3, "0")}Z`,
              body: { messages: [head, hostMsg] } },
    after: { ts: `2026-08-10T09:00:01.${String(n).padStart(3, "0")}Z`,
             body: { messages: [head, hostEcho, rejected] } },
  };
}

function runCensus(pairCount, extraArgs) {
  const dir = tmpDirSync("census-mismatch-export-");
  const p = join(dir, "s-synthetic-requests.jsonl");
  const lines = [];
  for (let i = 0; i < pairCount; i++) {
    const { before, after } = mismatchPair(i);
    lines.push(JSON.stringify(before), JSON.stringify(after));
  }
  writeFileSync(p, lines.join("\n") + "\n");
  const out = execFileSync(process.execPath, [TOOL, p, ...extraArgs],
    { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  return JSON.parse(out);
}

test("RED-FIRST — --json --verbose carries a mismatchRows slice, verbatim from details", () => {
  const parsed = runCensus(1, ["--json", "--verbose"]);
  assert.equal(parsed.tally.MISMATCH, 1, "the fixture must actually produce a MISMATCH");
  assert.ok(Array.isArray(parsed.mismatchRows),
    `mismatchRows must be an array; got: ${JSON.stringify(parsed.mismatchRows)}`);
  assert.equal(parsed.mismatchRows.length, 1);
  const row = parsed.mismatchRows[0];
  assert.equal(row.verdict, "MISMATCH");
  // Verbatim from `details`: the same fields the human-readable row and
  // census-mismatch-body.test.mjs already pin, not a reshaped summary.
  assert.ok(row.recon, "the reconstruction rides on the exported row");
  assert.ok(row.rejectedCandidate?.text, "the rejected candidate's full text rides on the exported row");
  assert.equal(parsed.mismatchRowsTruncated, undefined,
    "at or under the cap, no truncation marker — its presence alone must mean rows were dropped");
});

test("plain --json (no --verbose) does not carry the unbounded mismatchRows array", () => {
  const parsed = runCensus(1, ["--json"]);
  assert.equal(parsed.tally.MISMATCH, 1);
  assert.equal(parsed.mismatchRows, undefined,
    "same convention as volatileRows/duplicateRows: unbounded rows are verbose-only");
});

test("over the cap: mismatchRows truncates and mismatchRowsTruncated names the real total", () => {
  const PAIR_COUNT = 201; // one past the census's own 200-row cap
  const parsed = runCensus(PAIR_COUNT, ["--json", "--verbose"]);
  assert.equal(parsed.tally.MISMATCH, PAIR_COUNT, "every synthetic pair must land as MISMATCH");
  assert.equal(parsed.mismatchRows.length, 200, "capped at 200, the producer's own bound");
  assert.equal(parsed.mismatchRowsTruncated, PAIR_COUNT,
    "the marker carries the TRUE total, not just what fit under the cap");
});
