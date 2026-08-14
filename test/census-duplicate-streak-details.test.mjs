// census-duplicate-streak-details — the row-level discriminators a
// duplicate-streak row did not carry before this change: `model`/`nMsg`/
// `maxTokens` (the streak-level request shape, read once from the FIRST
// member's body — all members are byte-identical bodies by `sameBody`'s own
// definition, so one read answers for the whole streak), `members`
// (`{ id, ts, line }` per member in wire order), `intervalMs` (last member's
// ts minus first member's ts), and — where an outcome record billed a
// member — that member's own `outcome` facts (`requestId`, `model`, `ms`,
// `usage`).
//
// Every characterization of the double-billed population previously had to
// re-derive the request shape and the billing by hand from the raw capture;
// this pins that those facts now ride the streak ROW itself
// (`duplicateRows`), never the `duplicates` rollup, whose keys are untouched.
//
// The billing half is pinned in BOTH wire orders, because they take
// different code paths (`census-duplicate-requests.test.mjs` already proves
// this split matters for the COUNT; this file proves it for the FACTS
// riding along): an outcome record can arrive after its member already
// exists (`noteOutcome` finds it in `scan.pending` and attaches directly),
// or before — the streak's first send is answered before the duplicate send
// that makes it a member even exists — in which case the facts are stashed
// in `scan.billed` and `addMember` reads them back out once that member is
// finally seen.
//
// Red-first, demonstrated rather than asserted (dev-loop.md, "Adding a
// check"): against the pre-change census (base 3a368c9) a streak row has no
// `model`, `nMsg`, `maxTokens`, `members`, or `intervalMs` field at all —
// every assertion here on those fields fails outright, not just on value.
// Synthetic, deterministic bytes only — this repo is public.

import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { census } from "../tools/reminder-migration-census.mjs";

let seq = 0;

const request = ({ opener = "hello", turn = "one", id = `r${++seq}`,
                    ts = `2026-08-01T00:00:0${seq % 10}.000Z`, sid = "s-testsession",
                    model = "claude-test", maxTokens = 32 } = {}) => ({
  ts, id, sid, key: `s-${sid}`,
  body: {
    model,
    max_tokens: maxTokens,
    messages: [
      { role: "user", content: opener },
      { role: "assistant", content: [{ type: "text", text: turn }] },
    ],
  },
});

const outcome = (id, ts, usage = {}) => ({
  ts, type: "outcome", id, key: "s-testsession", model: "claude-test",
  requestId: `req-${id}`,
  usage: { cacheRead: 100, cacheCreation: 0, inputTokens: 200, outputTokens: 5, ...usage },
  outSha: "deadbeefdeadbeef", outBytes: 100, ms: 42,
});

async function captureOf(t, lines, name = "s-testsession-requests.jsonl") {
  const dir = await tmpDir("census-dup-details-");
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, name);
  await writeFile(path, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  return path;
}

test("RED-FIRST — a streak row carries model/nMsg/maxTokens from its FIRST member's body", async (t) => {
  const capture = await captureOf(t, [
    request({ turn: "same", id: "d-1", model: "claude-fixture", maxTokens: 64 }),
    request({ turn: "same", id: "d-2", model: "claude-fixture", maxTokens: 64 }),
  ]);
  const res = await census([capture]);
  assert.equal(res.duplicateRows.length, 1);
  const row = res.duplicateRows[0];
  assert.equal(row.model, "claude-fixture");
  assert.equal(row.nMsg, 2, "the fixture's messages array has two entries");
  assert.equal(row.maxTokens, 64);
});

test("RED-FIRST — the row carries per-member id/ts/line and intervalMs", async (t) => {
  const capture = await captureOf(t, [
    request({ turn: "same", id: "d-1", ts: "2026-08-01T00:00:00.000Z" }),
    request({ turn: "same", id: "d-2", ts: "2026-08-01T00:00:05.000Z" }),
  ]);
  const res = await census([capture]);
  const row = res.duplicateRows[0];
  assert.equal(row.members.length, 2);
  assert.equal(row.members[0].id, "d-1");
  assert.equal(row.members[1].id, "d-2");
  assert.equal(row.members[0].line, 1, "1-based line ordinal of the run's first request");
  assert.equal(row.members[1].line, 2);
  assert.equal(row.intervalMs, 5000, "last member's ts minus first member's ts, in ms");
});

test("RED-FIRST — outcome-AFTER-member ordering attaches usage to the billed member", async (t) => {
  const capture = await captureOf(t, [
    request({ turn: "same", id: "d-1", ts: "2026-08-01T00:00:00.000Z" }),
    request({ turn: "same", id: "d-2", ts: "2026-08-01T00:00:01.000Z" }),
    outcome("d-2", "2026-08-01T00:00:02.000Z"),
  ]);
  const res = await census([capture]);
  const row = res.duplicateRows[0];
  assert.equal(row.members[0].outcome, null, "the first member was never billed");
  assert.ok(row.members[1].outcome, "the second member was billed");
  assert.equal(row.members[1].outcome.requestId, "req-d-2");
  assert.equal(row.members[1].outcome.usage.cacheRead, 100);
  assert.equal(row.members[1].outcome.usage.inputTokens, 200);
});

test("RED-FIRST — outcome-BEFORE-member ordering (the path scan.billed exists for) still attaches usage", async (t) => {
  // The wire's actual order: a streak's FIRST send is answered — its outcome
  // record written — before the duplicate send that makes it a streak member
  // even exists (census-duplicate-requests.test.mjs pins this for the COUNT;
  // this pins it for the FACTS riding along).
  const capture = await captureOf(t, [
    request({ turn: "same", id: "d-1", ts: "2026-08-01T00:00:00.000Z" }),
    outcome("d-1", "2026-08-01T00:00:00.500Z"),
    request({ turn: "same", id: "d-2", ts: "2026-08-01T00:00:01.000Z" }),
  ]);
  const res = await census([capture]);
  const row = res.duplicateRows[0];
  assert.ok(row.members[0].outcome, "the opener's earlier outcome must still be attached to it");
  assert.equal(row.members[0].id, "d-1");
  assert.equal(row.members[0].outcome.requestId, "req-d-1");
  assert.equal(row.members[1].outcome, null, "the duplicate send was never billed");
});

test("two byte-identical requests with two outcome records: full discriminator set together", async (t) => {
  const capture = await captureOf(t, [
    request({ turn: "same", id: "d-1", ts: "2026-08-01T00:00:00.000Z", model: "claude-fixture", maxTokens: 16 }),
    request({ turn: "same", id: "d-2", ts: "2026-08-01T00:00:03.000Z", model: "claude-fixture", maxTokens: 16 }),
    outcome("d-1", "2026-08-01T00:00:00.400Z"),
    outcome("d-2", "2026-08-01T00:00:03.400Z"),
  ]);
  const res = await census([capture]);
  const row = res.duplicateRows[0];
  assert.equal(row.model, "claude-fixture");
  assert.equal(row.nMsg, 2);
  assert.equal(row.maxTokens, 16);
  assert.equal(row.members.length, 2);
  assert.ok(row.members[0].outcome && row.members[1].outcome, "both members billed");
  assert.equal(row.intervalMs, 3000);
  // summariseDuplicates's rollup keys are unchanged by any of this.
  assert.deepEqual(Object.keys(res.duplicates).sort(), [
    "billedRequests", "billedStreaks", "doubleBilledStreaks", "maxStreak",
    "membersWithoutId", "pairs", "requests", "streaks",
  ].sort());
});

test("a body missing max_tokens reports maxTokens null, never 0 or omitted", async (t) => {
  const noMaxTokens = ({ id, ts }) => ({
    ts, id, sid: "s-testsession", key: "s-s-testsession",
    body: { model: "m", messages: [{ role: "user", content: "same" }] },
  });
  const capture = await captureOf(t, [
    noMaxTokens({ id: "n-1", ts: "2026-08-01T00:00:00.000Z" }),
    noMaxTokens({ id: "n-2", ts: "2026-08-01T00:00:01.000Z" }),
  ]);
  const res = await census([capture]);
  const row = res.duplicateRows[0];
  assert.equal(row.maxTokens, null);
  assert.ok("maxTokens" in row, "the key must be present, not omitted");
});
