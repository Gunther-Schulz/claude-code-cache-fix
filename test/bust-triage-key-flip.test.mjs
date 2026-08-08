// `bust-triage` reads the pair's extension event logs and reports a
// state-key CHANGE across them as its own line — a measured false verdict,
// not a hypothetical one.
//
// The incident (BACKLOG, 2026-08-08): on s-captureAT the tool answered
// `VERDICT: MITIGATED / matrix row 1 (MITIGATED)` for a pair whose two
// requests ran under DIFFERENT extension state keys, both sides
// `no-prior-canonical` — i.e. it reported the ROW's status as though it
// were a per-instance absorption claim, on an instance where nothing
// absorbed. `bust-triage --at` chains a CENSUS of the message BODIES to a
// matrix row; the state key lives in the extension event logs and is
// invisible to any body diff (docs/runbooks/bust-appears.md, step 8: "This
// is the step that found row 26 and it is invisible to every body diff").
//
// RED-FIRST ARRANGEMENT, and it is available live rather than synthetic
// (dev-loop: "a red-first arrangement anchored to an IMMUTABLE reference").
// Run against the tool as it stood before this entry:
//     node tools/bust-triage.mjs --at 2026-08-08T09:59:54Z
//       ...
//       VERDICT: MITIGATED
//       matrix row 1 (MITIGATED): MITIGATED-half (ladder, this branch)
//         -> NEAR-ZERO (insertion-normalization, this branch)
// That is the red the entry names, reproduced verbatim before this change
// (dispatcher-checked 2026-08-08). The companion capture
// (2026-08-08T09:48:53Z, s-captureAS) verdicted KNOWN-OPEN both before and
// after — the negative control the entry names, so a guard that
// reclassifies every pair would be worse than none.
//
// LIVE GROUNDING for the fixtures below (dispatcher-checked 2026-08-08,
// against `~/.local/state/cache-fix/snapshots/s-<sid>-*-insertion-events
// .jsonl` and `*-deferred-tool-events.jsonl`):
//   s-captureAT (session 6130449c…): before-request 09:58:46.362Z paired
//   with an insertion-events record at 09:58:46.364Z, key ending
//   `496b188f5f435920`, action=reset/no-prior-canonical; after-request
//   09:58:50.626Z paired with a record at 09:58:50.628Z, key ending
//   `a20843f8616f3866`, action=reset/no-prior-canonical — DIFFERENT keys,
//   both no-prior-canonical, exactly as the entry describes.
//   s-captureAS (session a7799d21…): before-request 09:47:49.317Z paired
//   with a record at 09:47:49.333Z, key ending `b8db1b8bf88dc257`,
//   action=normalized; after-request 09:47:52.398Z paired with a record at
//   09:47:52.412Z, key ending `b8db1b8bf88dc257` — the SAME key, key-stable.
// The printed snapshot command was run for real against the live captureAT
// logs and its output verified to carry both timestamps and 3 distinct
// keys (dispatcher-checked 2026-08-08) — not re-asserted here since it
// depends on live filesystem state; the fixture tests below cover the
// command's own construction instead.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  stateKeyAt, stateKeyFlip, snapshotCommand, TELEMETRY_WINDOW_MS,
} from "../tools/bust-triage.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "bust-triage.mjs");
const sec = (iso) => Math.floor(Date.parse(iso) / 1000);
const msg = (role, text) => ({ role, content: [{ type: "text", text }] });

// --- stateKeyAt: the low-level per-request lookup ---

function snapDir(records, filenames) {
  const dir = tmpDirSync("bt-sk-");
  filenames.forEach((name, i) => {
    writeFileSync(join(dir, name), records[i].map((r) => JSON.stringify(r)).join("\n") + "\n");
  });
  return dir;
}

test("BITE — stateKeyAt finds the nearest same-sid record within the window", () => {
  const dir = snapDir(
    [[{ ts: "2026-08-08T09:58:46.364Z", sid: "SID", key: "KEY-A", action: "reset", resetReason: "no-prior-canonical" }]],
    ["s-SID-sub1-insertion-events.jsonl"]);
  const found = stateKeyAt("SID", "2026-08-08T09:58:46.362Z", dir);
  assert.equal(found.key, "KEY-A");
  assert.equal(found.action, "reset");
  assert.equal(found.resetReason, "no-prior-canonical");
});

test("CONTROL — a record OUTSIDE the window is not returned", () => {
  const dir = snapDir(
    [[{ ts: "2026-08-08T09:58:46.364Z", sid: "SID", key: "KEY-A", action: "reset" }]],
    ["s-SID-sub1-insertion-events.jsonl"]);
  const target = new Date(Date.parse("2026-08-08T09:58:46.364Z") + TELEMETRY_WINDOW_MS + 1).toISOString();
  assert.equal(stateKeyAt("SID", target, dir), null);
});

test("BITE — the NEAREST record wins among several same-sid sub-keys", () => {
  const dir = snapDir(
    [[
      { ts: "2026-08-08T09:58:46.436Z", sid: "SID", key: "FAR", action: "append-only" },  // 74ms away
      { ts: "2026-08-08T09:58:46.364Z", sid: "SID", key: "NEAR", action: "reset" },        // 2ms away
    ]],
    ["s-SID-multi-insertion-events.jsonl"]);
  const found = stateKeyAt("SID", "2026-08-08T09:58:46.362Z", dir);
  assert.equal(found.key, "NEAR");
});

test("BITE — either log kind (insertion or deferred-tool) is read", () => {
  const dir = snapDir(
    [[{ ts: "2026-08-08T09:58:46.364Z", sid: "SID", key: "DT-KEY", action: "no-baseline" }]],
    ["s-SID-sub1-deferred-tool-events.jsonl"]);
  const found = stateKeyAt("SID", "2026-08-08T09:58:46.362Z", dir);
  assert.equal(found.key, "DT-KEY");
});

test("CONTROL — a detail-only line (no `action`) is not mistaken for the request's own record", () => {
  const dir = snapDir(
    [[{ ts: "2026-08-08T09:58:46.364Z", sid: "SID", key: "K", event: "suppressed-duplicate", index: 7 }]],
    ["s-SID-sub1-insertion-events.jsonl"]);
  assert.equal(stateKeyAt("SID", "2026-08-08T09:58:46.362Z", dir), null,
    "a line with no `action` is a detail line, never the primary record");
});

test("CONTROL — a different sid's file is never matched", () => {
  const dir = snapDir(
    [[{ ts: "2026-08-08T09:58:46.364Z", sid: "OTHER", key: "K", action: "reset" }]],
    ["s-OTHER-sub1-insertion-events.jsonl"]);
  assert.equal(stateKeyAt("SID", "2026-08-08T09:58:46.362Z", dir), null);
});

test("a missing snapshots directory reads as null, not a throw", () => {
  assert.equal(stateKeyAt("SID", "2026-08-08T09:58:46.362Z", join(tmpDirSync("bt-sk-"), "does-not-exist")), null);
});

// --- stateKeyFlip: the pair-level decision, shaped exactly on the two live sides ---

function pairAt(beforeTs, afterTs) {
  return { before: { ts: beforeTs }, after: { ts: afterTs } };
}

test("BITE — the s-captureAT shape: different keys, both no-prior-canonical, is a FLIP", () => {
  const dir = snapDir(
    [[
      { ts: "2026-08-08T09:58:46.364Z", sid: "SID", key: "KEY-BEFORE", action: "reset", resetReason: "no-prior-canonical" },
      { ts: "2026-08-08T09:58:50.628Z", sid: "SID", key: "KEY-AFTER", action: "reset", resetReason: "no-prior-canonical" },
    ]],
    ["s-SID-both-insertion-events.jsonl"]);
  const r = stateKeyFlip("SID", pairAt("2026-08-08T09:58:46.362Z", "2026-08-08T09:58:50.626Z"), dir);
  assert.equal(r.code, "flip");
  assert.equal(r.noPriorCanonical, true, "both sides no-prior-canonical must still be reported");
});

test("CONTROL — the s-captureAS shape: same key both sides, is STABLE, never a flip", () => {
  const dir = snapDir(
    [[
      { ts: "2026-08-08T09:47:49.333Z", sid: "SID", key: "SAME-KEY", action: "normalized" },
      { ts: "2026-08-08T09:47:52.412Z", sid: "SID", key: "SAME-KEY", action: "reset", resetReason: "edit-shaped" },
    ]],
    ["s-SID-stable-insertion-events.jsonl"]);
  const r = stateKeyFlip("SID", pairAt("2026-08-08T09:47:49.317Z", "2026-08-08T09:47:52.398Z"), dir);
  assert.equal(r.code, "stable");
  assert.equal(r.noPriorCanonical, false, "no reset with no-prior-canonical on either side here");
});

test("a stable key with no-prior-canonical on one side is still reported — armed but baseline-less", () => {
  const dir = snapDir(
    [[
      { ts: "2026-08-08T09:00:00.000Z", sid: "SID", key: "K", action: "reset", resetReason: "no-prior-canonical" },
      { ts: "2026-08-08T09:00:05.000Z", sid: "SID", key: "K", action: "append-only" },
    ]],
    ["s-SID-npc-insertion-events.jsonl"]);
  const r = stateKeyFlip("SID", pairAt("2026-08-08T09:00:00.000Z", "2026-08-08T09:00:05.000Z"), dir);
  assert.equal(r.code, "stable");
  assert.equal(r.noPriorCanonical, true,
    "a stable key must not be read as \"carried a real baseline across\" when it started with none");
});

test("BITE — no evidence of either side is UNRESOLVED, never read as stable", () => {
  const dir = tmpDirSync("bt-sk-empty-");
  const r = stateKeyFlip("SID", pairAt("2026-08-08T09:00:00.000Z", "2026-08-08T09:00:05.000Z"), dir);
  assert.equal(r.code, "unresolved", "\"no evidence of a flip\" must never print as \"stable\"");
});

test("one side resolved, the other not, is still UNRESOLVED — never a guessed flip or stable", () => {
  const dir = snapDir(
    [[{ ts: "2026-08-08T09:00:00.000Z", sid: "SID", key: "K", action: "reset" }]],
    ["s-SID-onesided-insertion-events.jsonl"]);
  const r = stateKeyFlip("SID", pairAt("2026-08-08T09:00:00.000Z", "2026-08-08T09:00:05.000Z"), dir);
  assert.equal(r.code, "unresolved");
  assert.ok(r.before && !r.after, "the resolved side is still visible for a reader to check");
});

// --- snapshotCommand: the copy-pasteable evidence-freeze command ---

test("BITE — snapshotCommand names the bust's own date/sid/timestamps", () => {
  // Synthetic session id, deliberately from the repo's own allowlisted set
  // (test/absence-scan.test.mjs's SOURCE_UUID_ALLOWLIST) rather than the
  // real s-captureAT session — this repo is public and a capture UUID in
  // source is unscrubbable history once pushed.
  const bust = { t: sec("2026-08-08T09:59:54Z"), s: "11111111-2222-3333-4444-555555555555" };
  const pair = { before: { ts: "2026-08-08T09:58:46.362Z" }, after: { ts: "2026-08-08T09:58:50.626Z" } };
  const cmd = snapshotCommand(bust, pair);
  assert.match(cmd, /mkdir -p ~\/\.local\/share\/cache-fix\/bust-evidence\/2026-08-08/);
  assert.match(cmd, /s-11111111-2222-3333-4444-555555555555-\*-insertion-events\.jsonl/);
  assert.match(cmd, /s-11111111-2222-3333-4444-555555555555-\*-deferred-tool-events\.jsonl/);
  assert.match(cmd, /"ts":"\(2026-08-08T09:58:46\|2026-08-08T09:58:50\)/,
    `must match by second, not millisecond, to survive the request/event-log jitter: ${cmd}`);
  assert.match(cmd, /chmod 600/, "the evidence file must be locked down, matching the runbook convention");
  assert.doesNotMatch(cmd, /\.\d{3}Z/, "no millisecond fraction should leak into the grep pattern");
});

// --- end to end: the CLI's own VERDICT, reproducing both live sides ---

function captureLines({ beforeTs, afterTs, tools }) {
  const head = msg("user", "HEAD");
  const before = [head, msg("assistant", "B"), msg("user", "C")];
  const after = [head, msg("assistant", "B"), msg("user", "C"), msg("assistant", "D2")]; // splice-shaped
  return [
    JSON.stringify({ ts: beforeTs, type: "request", body: { messages: before, tools } }),
    JSON.stringify({ ts: afterTs, type: "request", body: { messages: after, tools } }),
  ].join("\n") + "\n";
}

function fakeHome({ sid, atStamp, beforeTs, afterTs, beforeKey, afterKey, resetReason = "no-prior-canonical" }) {
  const home = tmpDirSync("bt-keyflip-");
  const wt = join(home, ".local/share/claude-worktime");
  const caps = join(home, ".claude/cache-fix-captures");
  const snaps = tmpDirSync("bt-keyflip-snaps-");
  mkdirSync(wt, { recursive: true });
  mkdirSync(caps, { recursive: true });
  const atSec = sec(atStamp);
  writeFileSync(join(wt, "activity.jsonl"),
    JSON.stringify({ type: "cold", k: "hit", t: atSec, s: sid, cc: 20000, ctx: 100, gap: 25, cause: "other" }) + "\n");
  writeFileSync(join(caps, `s-${sid}-requests.jsonl`), captureLines({ beforeTs, afterTs }));
  writeFileSync(join(snaps, `s-${sid}-sub1-insertion-events.jsonl`), [
    JSON.stringify({ ts: beforeTs, sid, key: beforeKey, action: "reset", resetReason }),
    JSON.stringify({ ts: afterTs, sid, key: afterKey, action: "reset", resetReason }),
  ].join("\n") + "\n");
  return { home, snaps };
}

const run = (home, snaps, args) => execFileSync(process.execPath, [TOOL, ...args], {
  cwd: REPO,
  env: { ...process.env, HOME: home, CACHE_FIX_SNAPSHOT_DIR: snaps },
  encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
});

test("BITE — the captureAT shape: a key-flip pair verdicts KEY-FLIP, never MITIGATED", () => {
  const { home, snaps } = fakeHome({
    sid: "SFLIP0001", atStamp: "2026-08-08T09:59:54Z",
    beforeTs: "2026-08-08T09:58:46.362Z", afterTs: "2026-08-08T09:58:50.626Z",
    beforeKey: "s-SFLIP0001-sub1-KEYBEFORE", afterKey: "s-SFLIP0001-sub1-KEYAFTER",
  });
  const out = run(home, snaps, ["--at", "2026-08-08T09:59:54Z"]);
  assert.match(out, /VERDICT: KEY-FLIP/, `must stop as KEY-FLIP: ${out}`);
  assert.doesNotMatch(out, /VERDICT: MITIGATED/, "the measured false verdict must not recur");
  assert.match(out, /KEY-FLIP/, "the state-key step line must name the flip");
  assert.match(out, /no-prior-canonical/i, "both-sides no-prior-canonical must be visible, not just the flip");
  assert.match(out, /freeze-hint.*snapshot:/, `the event-log snapshot command must print: ${out}`);
  assert.doesNotMatch(out, /freeze-hint.*snapshot:.*\n.*freeze-hint/, "only one snapshot hint, not one per line");
});

test("CONTROL — the captureAS shape: a stable key never triggers KEY-FLIP or changes the verdict", () => {
  const { home, snaps } = fakeHome({
    sid: "SSTABLE01", atStamp: "2026-08-08T09:48:53Z",
    beforeTs: "2026-08-08T09:47:49.317Z", afterTs: "2026-08-08T09:47:52.398Z",
    beforeKey: "s-SSTABLE01-sub1-SAMEKEY", afterKey: "s-SSTABLE01-sub1-SAMEKEY",
    resetReason: "edit-shaped",
  });
  const out = run(home, snaps, ["--at", "2026-08-08T09:48:53Z"]);
  assert.doesNotMatch(out, /VERDICT: KEY-FLIP/, `a guard that fires on every pair is worse than none: ${out}`);
  assert.doesNotMatch(out, /KEY-FLIP/, "no KEY-FLIP text anywhere when the key never flips");
  assert.doesNotMatch(out, /freeze-hint/, "the snapshot hint is for the flip case only — a stable pair keeps only the pin line");
});

test("a pair with no matching event-log record at all is UNRESOLVED, never silently treated as stable", () => {
  const home = tmpDirSync("bt-keyflip-nosnap-");
  const wt = join(home, ".local/share/claude-worktime");
  const caps = join(home, ".claude/cache-fix-captures");
  mkdirSync(wt, { recursive: true });
  mkdirSync(caps, { recursive: true });
  const sid = "SNOEVT001";
  writeFileSync(join(wt, "activity.jsonl"),
    JSON.stringify({ type: "cold", k: "hit", t: sec("2026-08-08T09:59:54Z"), s: sid, cc: 20000, ctx: 100, gap: 25, cause: "other" }) + "\n");
  writeFileSync(join(caps, `s-${sid}-requests.jsonl`),
    captureLines({ beforeTs: "2026-08-08T09:58:46.362Z", afterTs: "2026-08-08T09:58:50.626Z" }));
  const emptySnaps = tmpDirSync("bt-keyflip-empty-snaps-");
  const out = run(home, emptySnaps, ["--at", "2026-08-08T09:59:54Z"]);
  assert.doesNotMatch(out, /VERDICT: KEY-FLIP/, "no evidence of a flip must never itself read as a flip");
  assert.match(out, /state-key\s+no insertion\/deferred-tool event-log record/,
    `the missing evidence must be stated, not silently skipped: ${out}`);
});
