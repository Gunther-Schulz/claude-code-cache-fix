// cost-report — dedicated coverage for design point (c) of the BACKLOG entry
// "`cost-report.mjs` had ZERO test coverage before `82372db` and still has
// none." Re-scoped 2026-08-10 by the retirement pass: the entry's other two
// design points, (a) the text-report Timestamp column renders both zones and
// (b) `--json` carries no "local" text, are already pinned by
// test/tool-output-stamps.test.mjs ("cost-report ARM 1" / "ARM 2"). This
// file covers only what those leave open — (c), the column-width/wrap
// concern: the Timestamp column must stay wide enough that a real
// both-zones stamp does not shove the Model column (and everything after
// it) out of its declared header position.
//
// RED-FIRST, established by hand rather than by a self-mutating test — this
// repo's own convention (test/tool-output-stamps.test.mjs's quota-analysis
// section: "the write boundary forbids leaving tools/ touched even
// transiently inside a test run"). Writing this test found a REAL, live
// defect rather than the anticipated one: the Timestamp column itself
// (`padEnd(43)`, wide enough for any both-zones stamp) was never the
// problem — the row-number `#` column's header was `padEnd(5)` while every
// data row's own prefix (`` `  ${i+1 padStart(2)}  ` ``) is 6 characters,
// unconditionally shoving every column, on every row, one character right
// of its header. Fixed at the source (`'  #'.padEnd(6)`, tools/cost-report.mjs)
// rather than leaving it as a TODO — the write boundary for this fix and
// this test are the same lane. Verified before commit: reverting the header
// back to `padEnd(5)` makes this test's alignment assertion go red
// (49 !== 48); restoring `padEnd(6)` makes it pass again.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { localSuffix } from "../tools/local-stamp.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const NODE = process.execPath;
const COST_REPORT = join(REPO, "tools", "cost-report.mjs");

function run(args) {
  return execFileSync(NODE, [COST_REPORT, ...args], {
    cwd: REPO, encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
  });
}

function fixture() {
  const dir = tmpDirSync("cost-report-col-");
  const file = join(dir, "usage.jsonl");
  const ts = "2026-08-05T09:00:00.000Z";
  writeFileSync(file, JSON.stringify({
    timestamp: ts, model: "claude-sonnet-4-5-20250929",
    input_tokens: 1000, output_tokens: 200,
    cache_read_input_tokens: 500, cache_creation_input_tokens: 0,
  }) + "\n");
  return { file, ts };
}

test("cost-report text report: the Timestamp column is wide enough that a both-zones stamp does not wrap the Model column out of place", () => {
  const { file, ts } = fixture();
  const out = run(["--file", file]);
  const lines = out.split("\n");

  const headerLine = lines.find((l) => l.includes("Timestamp") && l.includes("Model"));
  assert.ok(headerLine, `header row not found in output: ${JSON.stringify(out)}`);
  const modelHeaderCol = headerLine.indexOf("Model");
  assert.ok(modelHeaderCol > 0, `could not locate the Model header column: ${JSON.stringify(headerLine)}`);

  // modelShort for "claude-sonnet-4-5-20250929": strip "claude-", strip the
  // trailing 8-digit date, slice(0, 8) — computed the same way
  // printTextReport does, at tools/cost-report.mjs's modelShort line, so
  // this test breaks (loudly) if that transform ever changes shape.
  const modelShort = "claude-sonnet-4-5-20250929".replace("claude-", "").replace(/-\d{8}$/, "").slice(0, 8);
  assert.equal(modelShort, "sonnet-4", "fixture's own modelShort computation drifted from the tool's — fix the fixture, not the assertion");

  const rowLine = lines.find((l) => l.includes(modelShort));
  assert.ok(rowLine, `per-call row not found in output: ${JSON.stringify(out)}`);

  // The rendered timestamp field: bare UTC (19 chars, seconds precision)
  // plus the local pairing test/tool-output-stamps.test.mjs's ARM 1 already
  // requires on this same line.
  const expectedTsField = `${ts.slice(0, 19)} ${localSuffix(Date.parse(ts))}`;
  assert.ok(rowLine.includes(expectedTsField),
    `row did not carry the expected both-zones stamp ${JSON.stringify(expectedTsField)}: ${JSON.stringify(rowLine)}`);

  // The defect this pins: a too-narrow Timestamp column pushes modelShort to
  // start later than the header's "Model" column. Column and header must
  // align exactly.
  const modelRowCol = rowLine.indexOf(modelShort);
  assert.equal(modelRowCol, modelHeaderCol,
    `Model column drifted from its header position (Timestamp column wrap): header at ${modelHeaderCol}, row data at ${modelRowCol}`);
});
