// replay.mjs --json --census carries the census, not two empty objects —
// BACKLOG.md "replay.mjs --json drops the census entirely, so every consumer
// has to parse its TEXT output".
//
// runCensus returns `tally`/`examples` as Maps (the text report reads them
// via .entries()). JSON.stringify renders a bare Map as `{}` with nothing
// erroring: `--census --json` shipped with the two fields carrying the
// actual classification silently empty — verified against this repo's own
// pre-fix implementation (RED, quoted in this file's header comment below;
// reproduced at the desk: `{"pairs":1,...,"tally":{},"examples":{}}`).
// verifyPin (tools/harvest.mjs) is the paid-for consequence: it parses
// replay's human-readable TEXT output and guards itself with an anchor
// check, work that should not have been necessary — but tools/harvest.mjs
// is outside this lane's write boundary, so dropping that parser is a
// returned proposal, not built here.
//
// Spawns the real CLI, not runCensus in isolation: the defect is at the
// JSON-serialization BOUNDARY (a Map surviving into JSON.stringify), which
// a unit test on runCensus's return value cannot see — runCensus itself is
// already correct and already tested.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFile, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { tmpDir } from "../tools/tmpdir.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPLAY = join(__dirname, "..", "tools", "replay.mjs");

function reqLine(ts, id, sid, messages) {
  return JSON.stringify({
    ts, id, sid, key: `s-${sid}`,
    headers: { "anthropic-beta": null, "session-id": sid },
    body: { model: "claude-opus-5", system: [{ type: "text", text: "sys" }], messages },
  });
}
const outcomeLine = (ts, id, sid) =>
  JSON.stringify({ ts, type: "outcome", id, key: `s-${sid}`, requestId: `req_${id}`, usage: {} });

const user = (t) => ({ role: "user", content: [{ type: "text", text: t }] });
const asst = (t) => ({ role: "assistant", content: [{ type: "text", text: t }] });

// One conversation, two requests, a plain append-only pair — enough for
// runCensus to classify one "append-only" pair, which is all this needs:
// the defect is in the JSON boundary, not in which class fires.
async function writeFixture(dir) {
  const path = join(dir, "capture.jsonl");
  const lines = [
    reqLine("2026-08-10T00:00:00.000Z", "r1", "sidX", [user("hello")]),
    outcomeLine("2026-08-10T00:00:01.000Z", "r1", "sidX"),
    reqLine("2026-08-10T00:00:02.000Z", "r2", "sidX", [user("hello"), asst("hi"), user("more")]),
    outcomeLine("2026-08-10T00:00:03.000Z", "r2", "sidX"),
  ];
  await writeFile(path, lines.join("\n") + "\n");
  return path;
}

function runReplay(args) {
  const r = spawnSync(process.execPath, [REPLAY, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  assert.equal(r.status, 0, `replay.mjs exited ${r.status}: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

test("BITE — --census --json carries populated tally/examples, not empty objects", async () => {
  const dir = await tmpDir("replay-json-census-");
  try {
    const capture = await writeFixture(dir);
    const out = runReplay([capture, "--census", "--json"]);
    assert.equal(out.census.pairs, 1, "control: runCensus found the one pair");
    assert.deepEqual(Object.keys(out.census.tally), ["append-only"],
      "the classification must survive into --json, not render as {}");
    assert.equal(out.census.tally["append-only"], 1);
    assert.ok(out.census.examples["append-only"], "the example for the fired class must be present");
    assert.equal(out.census.examples["append-only"].n, 1);
    assert.equal(out.census.examples["append-only"].prevN, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("control — a run with no --census stays byte-identical (census: null, no Map serialization touched)", async () => {
  const dir = await tmpDir("replay-json-census-control-");
  try {
    const capture = await writeFixture(dir);
    const out = runReplay([capture, "--json"]);
    assert.equal(out.census, null, "no --census requested, no census computed — unchanged by this fix");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
