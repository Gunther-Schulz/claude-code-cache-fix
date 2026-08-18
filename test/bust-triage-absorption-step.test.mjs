// BACKLOG "bust-triage names the row but never says whether the mitigation
// absorbed" — `bust-triage` walks a bust to a matrix row (KNOWN-OPEN row 6,
// in the entry's own motivating 2026-08-14 11:20:33Z instance) and stops
// there. The next question — did OUR mitigation for that row actually HOLD
// on this instance — took three hand steps every time: (i) grepping
// snapshots/*.jsonl with jq for `collectD1Retirement`'s own numbers, which
// on that walk read a stale `no-baseline` as evidence of re-opening when the
// instrument itself (run over the right window) said the opposite;
// (ii) `gate-status.json`'s own `window` ending at the last scheduled sweep,
// which does not cover a same-day bust past it; (iii) hand-converting a
// `{header, records}` pin to JSONL to get the tools[] verdict, where a `.json`
// pin fed to replay.mjs instead returns a CLEAN-LOOKING `census: 0
// same-conversation pairs` rather than an error.
//
// RED, before this change (`git show 8869124:tools/bust-triage.mjs`, the
// commit immediately before this one — the state entry 1 landed in, before
// any absorption step existed): `toolsStabilityFromReplay`,
// `d1RetirementForBust` and `formatAbsorption` are not exports at all —
// import fails, and no `ABSORPTION:` line, `r.absorption` field, or
// `collectD1Retirement` reference existed in the file (`grep -c absorption
// tools/bust-triage.mjs` at that commit returns 0 outside comments). The
// real failure output from running this exact file against that commit is
// pasted in the dispatch report; not re-encoded here for the same reason
// bust-triage-attribution.test.mjs's own header gives — a module missing an
// export fails every test in this file at IMPORT time, which is not a
// discriminating red to keep around.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { toolsStabilityFromReplay, d1RetirementForBust } from "../tools/bust-triage.mjs";
import { conversationSubKey } from "../proxy/extensions/message-hash.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "bust-triage.mjs");
const sec = (iso) => Math.floor(Date.parse(iso) / 1000);
const msg = (role, text) => ({ role, content: [{ type: "text", text }] });

// --- toolsStabilityFromReplay: pure, against a SYNTHETIC census fixture ---
// (same discipline as bust-triage-attribution-exemptions.test.mjs: no
// machine-local path or subprocess, a fixture shaped like replay.mjs's own
// `--json --census` output.)

test("BITE — replay===null (a fast-path attribution) is SKIPPED, not a silent zero", () => {
  const r = toolsStabilityFromReplay(null);
  assert.equal(r.verdict, "SKIPPED");
  assert.match(r.reason, /no raw divergence|no ordinal/);
});

test("BITE — a failed replay carries its own COULD-NOT-VERIFY reason through, not a generic one", () => {
  const r = toolsStabilityFromReplay({ ok: false, reason: "capture file X does not exist — cannot replay it" });
  assert.equal(r.verdict, "COULD-NOT-VERIFY");
  assert.equal(r.reason, "capture file X does not exist — cannot replay it");
});

test("BITE — census.pairs===0 is COULD-NOT-VERIFY, never a clean pass (the `.json` pin shape, design's own named finding)", () => {
  const r = toolsStabilityFromReplay({ ok: true, census: { pairs: 0, conversations: 0 }, toolsDeltas: [], absorptionMisses: [] });
  assert.equal(r.verdict, "COULD-NOT-VERIFY");
  assert.match(r.reason, /0 same-conversation pairs/);
  assert.match(r.reason, /not be read as a clean pass|\.json pin/i);
});

test("BITE — real pairs but zero tools[] deltas is NO-FINDING, distinct from the 0/0-reads-as-a-hold shape", () => {
  const r = toolsStabilityFromReplay({ ok: true, census: { pairs: 5, conversations: 1 }, toolsDeltas: [], absorptionMisses: [] });
  assert.equal(r.verdict, "NO-FINDING");
  assert.notEqual(r.verdict, "MEASURED", "a genuine absence must not render as a measured 0/0 hold");
});

// The discriminating instance: on this bust's own shape, the whole-array
// claim must MISS (forwardedStable false — a real addition moved the
// signature) while the shared-name-subset guarantee actually made must HOLD
// (heldStable true) — the two numbers the entry's own worked example reports
// as "0/3 whole array" / "3/3 shared-name subset", and they must DIFFER or
// the check cannot tell a real absorption from a coincidental one.
const toolsDelta = (n, prevN, { forwardedStable, heldStable, toolsOnly = true }) => ({
  n, prevN, kind: "membership+", msgKind: "append-only", toolsOnly,
  forwardedStable, heldStable, count: "9->10", outCount: "9->10", deferredToolRewriteStats: null, addition: null,
});

test("BITE — MEASURED: forwarded-whole-array and shared-name-subset counts DIFFER when the guarantee held but the whole array did not", () => {
  const replay = {
    ok: true, census: { pairs: 3, conversations: 1 },
    toolsDeltas: [
      toolsDelta(181, 180, { forwardedStable: false, heldStable: true }),
      toolsDelta(223, 222, { forwardedStable: false, heldStable: true }),
      toolsDelta(505, 504, { forwardedStable: false, heldStable: false }),
    ],
    absorptionMisses: [],
  };
  const r = toolsStabilityFromReplay(replay);
  assert.equal(r.verdict, "MEASURED");
  assert.equal(r.deltas, 3);
  assert.equal(r.forwardedWholeArrayHeld, "0/3", "no delta held the whole array stable");
  assert.equal(r.sharedNameSubsetHeld, "2/3", "two of three held the guarantee deferred-tool-rewrite actually makes");
  assert.notEqual(r.forwardedWholeArrayHeld, r.sharedNameSubsetHeld,
    "the two ratios answer different questions and must be free to disagree");
  assert.equal(r.absorptionMisses, 0);
});

test("BITE — MEASURED: absorptionMisses rides the same replay and is not silently dropped", () => {
  const replay = {
    ok: true, census: { pairs: 2, conversations: 1 },
    toolsDeltas: [toolsDelta(9, 8, { forwardedStable: true, heldStable: true })],
    absorptionMisses: [{ n: 9, prevN: 8, outDiv: 3 }],
  };
  const r = toolsStabilityFromReplay(replay);
  assert.equal(r.absorptionMisses, 1);
});

// --- d1RetirementForBust: window computed FROM THE EVENT ---

test("BITE — the window is centered on the bust's OWN timestamp, not the caller's clock or a sweep's window", async () => {
  const missing = join(tmpDirSync("bt-absorb-d1-"), "does-not-exist");
  const bustTs = sec("2026-08-14T11:20:33Z");
  const r = await d1RetirementForBust(bustTs, missing);
  // A missing directory reads could-not-verify (null), same three-answer
  // convention collectD1Retirement itself documents — but the WINDOW must
  // still be reported and still centered on the bust, because a reader
  // diagnosing "why did this read null" needs to see what window was tried.
  assert.equal(r.d1OldKeyFallback.hits, null);
  assert.equal(r.d1OldKeyFallback.window.sinceUtc, new Date(bustTs * 1000 - 600_000).toISOString());
  assert.equal(r.d1OldKeyFallback.window.untilUtc, new Date(bustTs * 1000 + 600_000).toISOString());
});

test("BITE — a real snapshots dir with an in-window record is read, not skipped", async () => {
  const dir = tmpDirSync("bt-absorb-d1-real-");
  const bustTs = sec("2026-08-14T11:20:33Z");
  writeFileSync(join(dir, "s-PROBE-insertion-events.jsonl"),
    JSON.stringify({ ts: "2026-08-14T11:20:35.000Z", sid: "PROBE", oldKeyFallback: true }) + "\n");
  const r = await d1RetirementForBust(bustTs, dir);
  assert.equal(r.d1OldKeyFallback.hits, 1);
});

// --- END-TO-END: the CLI's own ABSORPTION block, over the real extension pipeline ---

function fakeHome(prefix) {
  const home = tmpDirSync(prefix);
  const wt = join(home, ".local/share/claude-worktime");
  const caps = join(home, ".claude/cache-fix-captures");
  mkdirSync(wt, { recursive: true });
  mkdirSync(caps, { recursive: true });
  return { home, wt, caps };
}

function writeBust({ wt, caps, sid, atStamp, before, after, beforeTs, afterTs }) {
  writeFileSync(join(wt, "activity.jsonl"),
    JSON.stringify({ type: "cold", k: "hit", t: sec(atStamp), s: sid, cc: 20000, ctx: 10, gap: 5, cause: "other" }) + "\n");
  writeFileSync(join(caps, `s-${sid}-requests.jsonl`), [
    JSON.stringify({ ts: beforeTs, body: { messages: before, tools: [] } }),
    JSON.stringify({ ts: afterTs, body: { messages: after, tools: [] } }),
  ].join("\n") + "\n");
}

const run = (home, args) => execFileSync(process.execPath, [TOOL, ...args], {
  cwd: REPO,
  env: { ...process.env, HOME: home },
  encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
});

test("BITE — end-to-end: a mid-history edit (an attributable pair) prints an ABSORPTION block after ATTRIBUTION", () => {
  const { home, wt, caps } = fakeHome("bt-absorb-e2e-");
  const before = [msg("user", "HEAD"), msg("assistant", "B"), msg("user", "C")];
  const after = [msg("user", "HEAD"), msg("assistant", "B-EDITED"), msg("user", "C")];
  writeBust({ wt, caps, sid: "SABSORBE2E1", atStamp: "2026-08-08T09:00:05Z",
              before, after, beforeTs: "2026-08-08T09:00:00.000Z", afterTs: "2026-08-08T09:00:05.000Z" });
  const out = run(home, ["--at", "2026-08-08T09:00:05Z"]);
  assert.match(out, /ATTRIBUTION: CC's/, `sanity: still attributes: ${out}`);
  assert.match(out, /ABSORPTION:/, `must print an ABSORPTION block: ${out}`);
  assert.match(out, /D1 retirement \(/);
  assert.match(out, /tools\[\] stability:/);
});

test("BITE — --json carries the absorption object with its two halves", () => {
  const { home, wt, caps } = fakeHome("bt-absorb-json-");
  const before = [msg("user", "HEAD"), msg("assistant", "B"), msg("user", "C")];
  const after = [msg("user", "HEAD"), msg("assistant", "B-EDITED"), msg("user", "C")];
  writeBust({ wt, caps, sid: "SABSORBJSON1", atStamp: "2026-08-08T09:00:05Z",
              before, after, beforeTs: "2026-08-08T09:00:00.000Z", afterTs: "2026-08-08T09:00:05.000Z" });
  const out = run(home, ["--at", "2026-08-08T09:00:05Z", "--json"]);
  const parsed = JSON.parse(out);
  assert.ok(parsed.absorption, "the JSON must carry an `absorption` object");
  assert.ok(parsed.absorption.d1, "must carry the D1-retirement half");
  assert.ok(parsed.absorption.toolsStability, "must carry the tools[]-stability half");
});

// Faithful KEY-FLIP fixture, mirroring bust-triage-key-flip.test.mjs's own
// captureAT shape exactly (real state keys are `s-<sid>-<systemSubKey>-<conv>`
// where `<conv>` is `conversationSubKey` of that request's own messages, and
// the event-log directory is a SEPARATE `CACHE_FIX_SNAPSHOT_DIR`, not under
// HOME) — an arbitrary literal key string does not describe anything
// `stateKeyAt`/`stateKeyFlip` can see, which is why a naive fixture here
// read "stable" rather than "FLIP" on the first attempt at this test.
test("BITE — a KEY-FLIP verdict prints NO absorption block — no continuous instance for a mitigation to have absorbed across", () => {
  const { home, wt, caps } = fakeHome("bt-absorb-keyflip-");
  const snaps = tmpDirSync("bt-absorb-keyflip-snaps-");
  const before = [msg("user", "HEAD"), msg("assistant", "B"), msg("user", "C")];
  const after = [msg("user", "HEAD"), msg("assistant", "B"), msg("user", "C"), msg("assistant", "D2")];
  writeBust({ wt, caps, sid: "SABSORBKF01", atStamp: "2026-08-08T09:59:54Z",
              before, after, beforeTs: "2026-08-08T09:58:46.362Z", afterTs: "2026-08-08T09:58:50.626Z" });
  const beforeKey = `s-SABSORBKF01-subA-${conversationSubKey(before)}`;
  const afterKey = `s-SABSORBKF01-subB-${conversationSubKey(after)}`;
  writeFileSync(join(snaps, "s-SABSORBKF01-sub1-insertion-events.jsonl"), [
    JSON.stringify({ ts: "2026-08-08T09:58:46.362Z", sid: "SABSORBKF01", key: beforeKey, action: "reset", resetReason: "no-prior-canonical" }),
    JSON.stringify({ ts: "2026-08-08T09:58:50.626Z", sid: "SABSORBKF01", key: afterKey, action: "reset", resetReason: "no-prior-canonical" }),
  ].join("\n") + "\n");
  const out = execFileSync(process.execPath, [TOOL, "--at", "2026-08-08T09:59:54Z"], {
    cwd: REPO, env: { ...process.env, HOME: home, CACHE_FIX_SNAPSHOT_DIR: snaps },
    encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
  });
  assert.match(out, /VERDICT: KEY-FLIP/, `sanity: still a key-flip: ${out}`);
  assert.doesNotMatch(out, /ABSORPTION:/, "a KEY-FLIP pair has no continuous instance to ask absorption about");
});

// --- structural: the D1 half is IMPORTED, never re-derived ---

test("BITE — bust-triage.mjs imports collectD1Retirement from gate-live.mjs rather than re-deriving the D1 walk", () => {
  const src = readFileSync(join(REPO, "tools", "bust-triage.mjs"), "utf8");
  assert.match(src, /import\s*\{\s*collectD1Retirement\s*\}\s*from\s*"\.\/gate-live\.mjs"/,
    "the D1-retirement primitive must be imported by name from gate-live.mjs");
});
