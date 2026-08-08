// bust-triage maps `replace/edit` -> row 4 flatly, so the census
// annotations that distinguish row 4's sub-mechanisms never reach the
// operator at the runbook's designated entry point (BACKLOG READY item,
// `tools/bust-triage.mjs`, `classToRow`).
//
// THE MOTIVATING EVIDENCE, live on this machine (2026-08-08, before any
// code here changed) — reproduced here as SYNTHETIC fixtures so the tests
// survive capture rotation, per the closing gate's "snapshot what proves a
// finding before closing":
//
//   * capture s-captureAM, 2026-08-06T18:08:32Z, cc
//     300,597: `bust-triage --at` prints `census replace/edit` and
//     `no reminder container migration` and stops there — no way to tell
//     an anchored re-stamp from a deep oscillation from those two lines.
//     Off the raw capture (replay.mjs's own `--census`, matrix row 4's
//     own datapoint), the actual busting transition (ord 265->266,
//     `harvest --pin s-captureAM 265..266`) is edit@235 of 290,
//     anchorDelta -48 (i.e. 48 raw indices from the last human turn — the
//     far-from-anchor tripwire's own >30 threshold), inside a 20-leg FLAP:
//     five block migrations on that one transition, every one reversing a
//     migration on the immediately preceding transition (ord 264->265,
//     span 1) — verified directly against the live bytes while writing
//     this fix (`pairEditContext("<sid>", {before: ord 265, after:
//     ord 266}, CAPTURES)` reproduces anchorDelta -48 and five
//     flap-tagged blockMigration rows, matching the matrix's own
//     hand-derived indices 237/256/276 and the two cross-message joins at
//     234/249, byte for byte).
//   * capture s-captureAS, 2026-08-08T09:48:53Z, cc 638k:
//     `census replace/edit` + `migration EXTENDED/MERGED-STANDALONE` with
//     no anchor evidence either — the live run (after this fix) reports
//     `edit@274 of 310 [anchor-36]` with four blockMigration rows and the
//     far-from-anchor callout, none of it visible before.
//   * capture s-captureAU, 2026-08-08T12:18:15Z, cc 276k: the
//     CONTROL — `census replace/edit`, no migration, and (after this fix)
//     `edit@206 of 225 [anchor-19]` — inside the known reminder-anchoring
//     radius, no far callout. A guard that fires on this one too is worse
//     than none.
//
// WHAT THIS DOES NOT CHANGE: `classToRow` itself. `replace/edit` still maps
// to row 4 — that mapping was never the defect. The defect was that the
// evidence distinguishing WHICH replace/edit this is never reached the
// reader; `test/bust-triage-*.test.mjs`'s existing `--selftest` assertions
// on `classToRow` are untouched by this file.
//
// GAP SURFACED (not fixed here — out of this item's write boundary and
// design): the discriminating case named alongside this item, matrix row
// 29 (an idle-boundary rebuild, capture s-captureAT, 2026-08-08T11:46:36Z),
// currently returns UNVERIFIABLE — `capturePairResult` cannot find a
// same-conversation predecessor, because row 29's own mechanism (CC
// rebuilding `messages[0]` at the idle boundary) changes the very value
// `capturePairResult` uses as conversation identity. That pairing failure
// is pre-existing (unrelated to `classToRow`/this file's edit) and is
// reported to the dispatcher rather than fixed here.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { pairEditContext } from "../tools/bust-triage.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "bust-triage.mjs");
const sec = (iso) => Math.floor(Date.parse(iso) / 1000);
const txt = (t) => ({ type: "text", text: t });
const user = (t) => ({ role: "user", content: [txt(t)] });
const asst = (t) => ({ role: "assistant", content: [txt(t)] });

// --- pairEditContext, direct: the new function this item adds ---

/** A single-conversation capture file of N requests, one per line. */
function writeCapture(dir, sid, states) {
  const lines = states.map(({ ts, msgs }) =>
    JSON.stringify({ ts, type: "request", body: { messages: msgs } }));
  writeFileSync(join(dir, `s-${sid}-requests.jsonl`), lines.join("\n") + "\n");
}

test("pairEditContext: BITE — a mid-history edit far from the human anchor gets the far callout's own number", async () => {
  const dir = tmpDirSync("bt-edit-far-");
  const pad = "x".repeat(200);
  const head = user(`HEAD ${pad}`); // the only human turn: index 0
  const filler = [];
  for (let i = 0; i < 34; i++) {
    filler.push(asst(`step ${i}`));
    filler.push({ role: "user", content: [{ type: "tool_result", tool_use_id: `T${i}` }] }); // not a human turn
  }
  // NOT a human turn (role:"assistant") — a trailing role:"user" turn would
  // become the LAST human turn by construction (inLastHuman takes the last
  // matching index) and silently move the anchor to the tail instead of
  // index 0, defeating the fixture's own point.
  const tail = asst("trailing turn"); // keeps the edit mid-history, not tail
  const before = [head, ...filler, asst("ORIGINAL"), tail];
  const after = [head, ...filler, asst("EDITED"), tail];
  const sid = "SFAR0001";
  writeCapture(dir, sid, [
    { ts: "2026-08-08T00:00:00.000Z", msgs: before },
    { ts: "2026-08-08T00:00:01.000Z", msgs: after },
  ]);
  const pair = {
    before: { ord: 0, ts: "2026-08-08T00:00:00.000Z", body: { messages: before } },
    after: { ord: 1, ts: "2026-08-08T00:00:01.000Z", body: { messages: after } },
  };
  const ctx = await pairEditContext(sid, pair, dir);
  assert.ok(ctx?.edit, "the transition must resolve to an edit row");
  assert.equal(ctx.edit.at, 1 + filler.length, "divergence sits right after the filler run");
  assert.equal(ctx.edit.anchorDelta, ctx.edit.at - 0, "anchor is the sole human turn at index 0");
  assert.ok(Math.abs(ctx.edit.anchorDelta) > 30,
    "this fixture exists to be FAR from the anchor — the far-from-anchor tripwire's own threshold");
  assert.equal(ctx.edit.tail, false, "the trailing turn keeps this mid-history, not a tail edit");
});

test("pairEditContext: CONTROL — an edit AT the human anchor is not flagged far", async () => {
  const dir = tmpDirSync("bt-edit-near-");
  const pad = "x".repeat(200);
  const head = user(`HEAD ${pad}`);
  const before = [head, asst("a1"), user("ORIGINAL turn"), asst("a2")];
  const after = [head, asst("a1"), user("EDITED turn"), asst("a2")];
  const sid = "SNEAR001";
  writeCapture(dir, sid, [
    { ts: "2026-08-08T00:00:00.000Z", msgs: before },
    { ts: "2026-08-08T00:00:01.000Z", msgs: after },
  ]);
  const pair = {
    before: { ord: 0, ts: "2026-08-08T00:00:00.000Z", body: { messages: before } },
    after: { ord: 1, ts: "2026-08-08T00:00:01.000Z", body: { messages: after } },
  };
  const ctx = await pairEditContext(sid, pair, dir);
  assert.ok(ctx?.edit);
  assert.ok(Math.abs(ctx.edit.anchorDelta) <= 30,
    "message 2, the edited one, is itself the last human turn — anchorDelta must read small");
});

// --- FLAP: a bare pair cannot show one; a window of its own history can ---
//
// Same two shapes replay-gate-selfcheck.test.mjs already proves
// findBlockMigrations flags as a FLAP (inline -> standalone -> inline);
// this test is NOT re-proving that algorithm — it proves pairEditContext's
// OWN job: reading a real conversation window off a capture FILE and
// handing it to that algorithm, so the flap this pair's own transition
// carries is not lost for lack of history.
const REMINDER_WRAPPED = "<system-reminder>\nPreToolUse:Edit hook additional context: do the thing\n</system-reminder>";
const REMINDER_INNER = "PreToolUse:Edit hook additional context: do the thing";
const flapState = (pad, standalone) => [
  user(`HEAD ${pad}`),
  asst("a1"),
  { role: "user", content: [txt("tool output"),
      txt(standalone ? "sibling block that never moves" : REMINDER_WRAPPED)] },
  { role: "system", content: standalone ? REMINDER_INNER : "unrelated standing system note" },
  asst("a2"),
];

test("pairEditContext: BITE — a migration that reverses the PRIOR transition's migration is a FLAP", async () => {
  const dir = tmpDirSync("bt-edit-flap-");
  const pad = "x".repeat(200);
  const r0 = flapState(pad, false); // inline
  const r1 = flapState(pad, true); // standalone — migration leg 1
  const r2 = flapState(pad, false); // inline again — migration leg 2, reverses leg 1
  const sid = "SFLAP001";
  writeCapture(dir, sid, [
    { ts: "2026-08-08T00:00:00.000Z", msgs: r0 },
    { ts: "2026-08-08T00:00:01.000Z", msgs: r1 },
    { ts: "2026-08-08T00:00:02.000Z", msgs: r2 },
  ]);
  const pair = {
    before: { ord: 1, ts: "2026-08-08T00:00:01.000Z", body: { messages: r1 } },
    after: { ord: 2, ts: "2026-08-08T00:00:02.000Z", body: { messages: r2 } },
  };
  const ctx = await pairEditContext(sid, pair, dir);
  assert.ok(ctx?.blockMigrations?.length, "leg 2 must register as a block migration on THIS pair");
  const flapped = ctx.blockMigrations.filter((b) => b.flap);
  assert.ok(flapped.length, "leg 2 reverses leg 1 one request earlier — it must carry a flap tag");
  for (const b of flapped) {
    assert.equal(b.flap.reversesPrevN, 0, "leg 1's own transition is ord 0->1");
    assert.equal(b.flap.reversesN, 1, "leg 1's cur side is ord 1");
    assert.equal(b.flap.span, 1, "one conversation-request apart");
  }
});

test("pairEditContext: CONTROL — the FIRST leg of a migration reverses nothing", async () => {
  const dir = tmpDirSync("bt-edit-noflap-");
  const pad = "x".repeat(200);
  const r0 = flapState(pad, false);
  const r1 = flapState(pad, true);
  const sid = "SNOFLAP1";
  writeCapture(dir, sid, [
    { ts: "2026-08-08T00:00:00.000Z", msgs: r0 },
    { ts: "2026-08-08T00:00:01.000Z", msgs: r1 },
  ]);
  const pair = {
    before: { ord: 0, ts: "2026-08-08T00:00:00.000Z", body: { messages: r0 } },
    after: { ord: 1, ts: "2026-08-08T00:00:01.000Z", body: { messages: r1 } },
  };
  const ctx = await pairEditContext(sid, pair, dir);
  assert.ok(ctx?.blockMigrations?.length, "the first leg is still a migration");
  assert.ok(ctx.blockMigrations.every((b) => !b.flap),
    "nothing precedes the first leg — a guard that flags it anyway is worse than none");
});

// --- Defensive floor: gaps surface, never bridge (dev-loop) ---

test("pairEditContext: no ordinal on the pair -> null, never a guess", async () => {
  const dir = tmpDirSync("bt-edit-noord-");
  const r = await pairEditContext("SID", { before: { ts: "x", body: { messages: [] } },
                                            after: { ts: "y", body: { messages: [] } } }, dir);
  assert.equal(r, null);
});

test("pairEditContext: no capture file -> null", async () => {
  const dir = tmpDirSync("bt-edit-nocap-");
  const r = await pairEditContext("NOSUCHSID",
    { before: { ord: 0, body: { messages: [{}] } }, after: { ord: 1, body: { messages: [{}] } } }, dir);
  assert.equal(r, null);
});

// --- Full CLI wiring: the `edit-anchor` step actually reaches the reader ---

function fakeHome({ at, sid, states, cc, cause = "messages_changed" }) {
  const home = tmpDirSync("bt-anchor-home-");
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

test("CLI BITE — a far-from-anchor replace/edit prints the edit-anchor step and the callout, verdict unchanged", () => {
  const pad = "x".repeat(1200);
  const head = user(`HEAD ${pad}`);
  const filler = [];
  for (let i = 0; i < 34; i++) {
    filler.push(asst(`step ${i}`));
    filler.push({ role: "user", content: [{ type: "tool_result", tool_use_id: `T${i}` }] });
  }
  const tail = asst("trailing turn"); // see the unit test above: must not be a human turn
  const before = [head, ...filler, asst("ORIGINAL"), tail];
  const after = [head, ...filler, asst("EDITED"), tail];
  const home = fakeHome({
    at: "2026-08-08T00:00:05Z", sid: "SCLIFAR1", cc: 5000,
    states: [
      { ts: "2026-08-08T00:00:00.000Z", msgs: before },
      { ts: "2026-08-08T00:00:01.000Z", msgs: after },
    ],
  });
  const out = run(home, ["--at", "2026-08-08T00:00:05Z"]);
  assert.match(out, /matrix row 4\b/, `verdict must stay row 4 — this item only enriches evidence:\n${out}`);
  assert.match(out, /edit-anchor\s+edit@\d+ of \d+ \[anchor[+-]\d+\]/, `the new step must print:\n${out}`);
  assert.match(out, /NOT the known reminder-anchoring class/,
    `the far-from-anchor callout must fire verbatim:\n${out}`);
});

test("CLI CONTROL — an anchored replace/edit prints edit-anchor WITHOUT the far callout", () => {
  const pad = "x".repeat(1200);
  const head = user(`HEAD ${pad}`);
  const before = [head, asst("a1"), user("ORIGINAL turn"), asst("a2")];
  const after = [head, asst("a1"), user("EDITED turn"), asst("a2")];
  const home = fakeHome({
    at: "2026-08-08T00:00:05Z", sid: "SCLINEAR1", cc: 5000,
    states: [
      { ts: "2026-08-08T00:00:00.000Z", msgs: before },
      { ts: "2026-08-08T00:00:01.000Z", msgs: after },
    ],
  });
  const out = run(home, ["--at", "2026-08-08T00:00:05Z"]);
  assert.match(out, /matrix row 4\b/, out);
  assert.match(out, /edit-anchor\s+edit@\d+ of \d+ \[anchor[+-]?\d+\]/, out);
  assert.doesNotMatch(out, /NOT the known reminder-anchoring class/,
    `an anchored edit must not read as the far-from-anchor class:\n${out}`);
});
