// bust-triage's `insert-context` step — WHAT was inserted and WHERE, for the
// class the 110k busts live in.
//
// THE GAP IT CLOSES. `edit-anchor` runs behind `if (cls === "replace/edit")`,
// so for `splice/insert-mid` the tool printed a row number, an attribution and
// an absorption line and stopped. On the 2026-08-20T09:11:57Z bust the
// baseline output — captured before this step existed — carried
// `census splice/insert-mid` and `migration no reminder container migration in
// this pair`, and nothing about the insertion itself. The hand probe's output
// WAS the finding, which is the dev-loop's own tell that the instrument is
// missing.
//
// THE AMENDMENT, and it is why an unfiltered enumeration would have shipped
// noise. Measured 2026-08-20 across the 49-capture live window (the run is
// recorded in test/replay-insert-depth.test.mjs's header): 2,455 of 2,635
// splice pairs are CC's trailing-reminder push-down, and 2,633 of them insert a
// contiguous three-entry system/assistant/user run. Printed flat, the typical
// pair emits three benign entries and buries the one that matters. So the step
// enumerates the DEEP entries and summarizes the rest in one clause — and it
// NAMES the benign shape only where the structure is actually present (a
// contiguous run ending immediately before the last surviving entry), never
// from the depth bucket alone.
//
// ARMS. The two unit arms are real corpus pairs, replayed out of pins as JSONL
// (docs/dev-loop.md's own method for reading a pin back), so the deep case is
// the actual bust and the benign case is the actual push-down. The CLI arms are
// synthetic, and deliberately: they assert that the step REACHES the reader
// through the whole tool, which does not need real bytes — while the real
// tool-level proof is the live run of the done-criterion command itself, whose
// output is quoted in the lane report.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { pairInsertContext } from "../tools/bust-triage.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "bust-triage.mjs");
const FIXTURES = join(REPO, "test", "fixtures", "harvested");
const DEEP_PIN = join(FIXTURES, "pinned-s-238bd4d20b65-39-41.json");
const TAIL_PIN = join(FIXTURES, "pinned-s-6c1903382a3e-23-24.json");

const sec = (iso) => Math.floor(Date.parse(iso) / 1000);
const txt = (t) => ({ type: "text", text: t });
const user = (t) => ({ role: "user", content: [txt(t)] });
const asst = (t) => ({ role: "assistant", content: [txt(t)] });

/** Write a pin's records back out as the JSONL capture they came from, under a
 * synthetic sid. This is the pin-reading method docs/dev-loop.md prescribes
 * ("replay a pin by feeding `.records` out as JSONL") — the alternative,
 * pointing a capture reader at the `{header, records}` JSON, is the shape that
 * reports `0 same-conversation pairs` and exits clean. Returns the ordinals
 * (request records only, the namespace `pair.*.ord` lives in) and each one's
 * body, so the caller builds its pair from the same coordinate space the tool
 * does. */
function pinAsCapture(pinPath, sid) {
  const dir = tmpDirSync("bt-insert-pin-");
  const pin = JSON.parse(readFileSync(pinPath, "utf-8"));
  const lines = pin.records.map((r) => (typeof r === "string" ? r : JSON.stringify(r)));
  writeFileSync(join(dir, `s-${sid}-requests.jsonl`), lines.join("\n") + "\n");
  const byOrd = new Map();
  let ord = -1;
  for (const raw of pin.records) {
    const r = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!r?.body?.messages || !r?.ts) continue;
    ord++;
    byOrd.set(ord, r);
  }
  return { dir, byOrd };
}

const pairOf = (byOrd, beforeOrd, afterOrd) => ({
  before: { ord: beforeOrd, ts: byOrd.get(beforeOrd).ts, body: byOrd.get(beforeOrd).body },
  after: { ord: afterOrd, ts: byOrd.get(afterOrd).ts, body: byOrd.get(afterOrd).body },
});

// --- ARM 1, the positive: the real 110k bust, ord 39->41 ---

test("pairInsertContext: BITE — the real bust resolves to one system entry at index 82, 23 before the anchor", async () => {
  const { dir, byOrd } = pinAsCapture(DEEP_PIN, "PINDEEP1");
  const ctx = await pairInsertContext("PINDEEP1", pairOf(byOrd, 39, 41), dir);
  assert.ok(ctx, "the window must build off the pinned capture");
  assert.equal(ctx.inserts.length, 1, "exactly one entry was spliced before the last surviving one");
  assert.equal(ctx.inserts[0].at, 82);
  assert.equal(ctx.inserts[0].role, "system", "CC's own Stop-hook notification");
  assert.equal(ctx.inserts[0].anchorDelta, -23);
  assert.ok(ctx.inserts[0].bytes > 0, "a size is reported (the VALUE is scrub-dependent — see replay-insert-depth)");
  assert.equal(ctx.depth, "deep");
  assert.equal(ctx.minAnchorDelta, -23);
});

// --- ARM 2, the discriminating negative from the SAME capture ---

test("pairInsertContext: CONTROL — an append-only pair in the same capture reports NO insert", async () => {
  const { dir, byOrd } = pinAsCapture(DEEP_PIN, "PINDEEP1");
  // ord 38->39 is the transition immediately preceding the bust: same
  // conversation, new content, all of it after the last surviving entry.
  const ctx = await pairInsertContext("PINDEEP1", pairOf(byOrd, 38, 39), dir);
  assert.ok(ctx);
  assert.deepEqual(ctx.inserts, [], "nothing was spliced before the last surviving entry");
  assert.equal(ctx.depth, "none");
  assert.equal(ctx.minAnchorDelta, null, "no insert means no depth — never a 0");
});

// --- ARM 3, the shape 96% of the class has ---

test("pairInsertContext: CONTROL — the trailing-reminder push-down reports its run, at or after the anchor", async () => {
  const { dir, byOrd } = pinAsCapture(TAIL_PIN, "PINTAIL1");
  const ctx = await pairInsertContext("PINTAIL1", pairOf(byOrd, 23, 24), dir);
  assert.ok(ctx);
  assert.deepEqual(ctx.inserts.map((i) => i.at), [4, 5, 6]);
  assert.deepEqual(ctx.inserts.map((i) => i.role), ["system", "assistant", "user"]);
  assert.deepEqual(ctx.inserts.map((i) => i.anchorDelta), [1, 2, 3]);
  assert.equal(ctx.depth, "tail");
  assert.equal(ctx.lastKept, 7,
    "the run ends immediately before the last surviving entry — the push-down's own structure");
});

// --- Defensive floor: gaps surface, never bridge ---

test("pairInsertContext: no capture file -> null, never an empty set that reads as 'nothing inserted'", async () => {
  const dir = tmpDirSync("bt-insert-nocap-");
  const r = await pairInsertContext("NOSUCHSID",
    { before: { ord: 0, body: { messages: [{}] } }, after: { ord: 1, body: { messages: [{}] } } }, dir);
  assert.equal(r, null);
});

// --- Full CLI wiring: the step actually reaches the reader ---

function writeCapture(dir, sid, states) {
  writeFileSync(join(dir, `s-${sid}-requests.jsonl`),
    states.map(({ ts, msgs }) => JSON.stringify({ ts, body: { messages: msgs } })).join("\n") + "\n");
}

function fakeHome({ at, sid, states, cc, cause = "messages_changed" }) {
  const home = tmpDirSync("bt-insert-home-");
  const wt = join(home, ".local/share/claude-worktime");
  const caps = join(home, ".claude/cache-fix-captures");
  mkdirSync(wt, { recursive: true });
  mkdirSync(caps, { recursive: true });
  writeFileSync(join(wt, "activity.jsonl"),
    JSON.stringify({ type: "cold", k: "hit", t: sec(at), s: sid, gap: 5, ctx: 1000, cc, cause }) + "\n");
  writeCapture(caps, sid, states);
  return home;
}

const run = (home, args) => execFileSync(process.execPath, [TOOL, ...args],
  { cwd: REPO, env: { ...process.env, HOME: home }, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });

test("CLI BITE — a DEEP splice prints the entry, its role, its size and its depth, and warns", () => {
  const pad = "x".repeat(1200);
  const filler = [];
  for (let i = 0; i < 30; i++) filler.push(asst(`step ${i}`));
  // The human turn sits at the tail; the splice lands far before it.
  const before = [user(`HEAD ${pad}`), ...filler, user("the human turn"),
                  { role: "system", content: "trailing reminder" }];
  const after = [user(`HEAD ${pad}`), ...filler.slice(0, 4),
                 { role: "system", content: `hook notification ${pad}` }, ...filler.slice(4),
                 user("the human turn"), { role: "system", content: "trailing reminder" }];
  const home = fakeHome({
    at: "2026-08-20T00:00:05Z", sid: "SCLIDEEP", cc: 110000,
    states: [
      { ts: "2026-08-20T00:00:00.000Z", msgs: before },
      { ts: "2026-08-20T00:00:01.000Z", msgs: after },
    ],
  });
  const out = run(home, ["--at", "2026-08-20T00:00:05Z"]);
  assert.match(out, /census\s+splice\/insert-mid/, `the class must still be named:\n${out}`);
  assert.match(out, /insert-context .*depth deep/, `the new step must print with its bucket:\n${out}`);
  assert.match(out, /DEEP 1: @5 system \d+ B \[anchor-\d+\]/,
    `the deep entry must be enumerated with index, role, size and anchor:\n${out}`);
  assert.match(out, /WARN\s+insert-context/, `a deep splice is not an OK line:\n${out}`);
});

test("CLI CONTROL — the benign push-down prints the step, summarizes, and does NOT read as deep", () => {
  const pad = "x".repeat(1200);
  const before = [user(`HEAD ${pad}`), asst("a0"), user("the human turn"),
                  { role: "system", content: "trailing reminder" }];
  const after = [user(`HEAD ${pad}`), asst("a0"), user("the human turn"),
                 { role: "system", content: "new hook notice" }, asst("reply"),
                 { role: "system", content: "trailing reminder" }];
  const home = fakeHome({
    at: "2026-08-20T00:00:05Z", sid: "SCLITAIL", cc: 5000,
    states: [
      { ts: "2026-08-20T00:00:00.000Z", msgs: before },
      { ts: "2026-08-20T00:00:01.000Z", msgs: after },
    ],
  });
  const out = run(home, ["--at", "2026-08-20T00:00:05Z"]);
  assert.match(out, /insert-context .*depth tail/, `the step must print for the benign case too:\n${out}`);
  assert.doesNotMatch(out, /DEEP \d+:/,
    `nothing here is deep — a step that enumerates a DEEP entry on the benign shape is worse than none:\n${out}`);
  assert.match(out, /further @3\.\.4/, `the benign run must be summarized, not enumerated:\n${out}`);
  assert.match(out, /trailing-reminder push-down/,
    `and the shape must be NAMED where its structure is present:\n${out}`);
  assert.match(out, /OK\s+insert-context/, `a benign push-down is not a warning:\n${out}`);
});
