// `bust-triage` emits an ATTRIBUTION line (OURS / CC's / COULD-NOT-ATTRIBUTE)
// beside its VERDICT, per docs/dev-loop.md's gate ("No mitigation is DESIGNED
// before the attribution verdict exists") and the matching BACKLOG entry
// ("bust-triage emits an ATTRIBUTION verdict (OURS / CC's /
// COULD-NOT-ATTRIBUTE), because today it emits none").
//
// RED, before this change: `grep -n 'ours\|attribut' tools/bust-triage.mjs`
// returned only prose comments — zero attribution logic — against the two
// live sites in `replay.mjs` (`ours: inDiv === null || inDiv > outDiv` and
// the `ccIdenticalAtOutDiv` stability-violation annotation). Every test below
// failed against that state: `computeAttribution` did not exist as an export
// at all, and no CLI run ever printed an `ATTRIBUTION:` line. Reproduced
// live (dispatcher-checked 2026-08-10) by running this file's assertions
// against `git show 633256b:tools/bust-triage.mjs` restored over the working
// copy — see the dispatch report for the pasted failure output; that
// arrangement is not re-encoded here because a module that does not export
// `computeAttribution` fails every test in this file at IMPORT time, which is
// not a discriminating red to keep around (the live pre-change grep, quoted
// above, is the durable evidence).
//
// The primitive itself (`attributionOf`) is IMPORTED from replay.mjs, never
// re-derived — the structural check at the bottom of this file is the
// mechanical proof of that, mirroring the BACKLOG entry's own instrument
// ("the grep is the evidence").
//
// Two design halves, tested separately (see bust-triage.mjs's own section
// comment above `computeAttribution` for the full reasoning):
//   PART ONE (free): captures are PRE-pipeline, so if CC's own raw messages
//   are a pure append between the pair, nothing upstream explains a
//   forwarded divergence and the answer is OURS without touching disk.
//   PART TWO (not free): a genuine raw-side divergence needs the REAL
//   forwarded array, which only a full corpus replay (`replay.mjs --census`,
//   run as a subprocess exactly like gate-live.mjs already runs it daily)
//   can supply. Verified live (this file, "END-TO-END" section below) against
//   the REAL extension pipeline — not mocked — on two synthetic captures.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { computeAttribution, attributionFromRow } from "../tools/bust-triage.mjs";
import { findStabilityViolations, attributionOf } from "../tools/replay.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "bust-triage.mjs");
const sec = (iso) => Math.floor(Date.parse(iso) / 1000);
const msg = (role, text) => ({ role, content: [{ type: "text", text }] });

// --- computeAttribution: the unit-level fast path and failure reasons ---

test("BITE — a pure append on the raw side is OURS, and never touches disk", () => {
  const before = [msg("user", "HEAD"), msg("assistant", "B")];
  const after = [msg("user", "HEAD"), msg("assistant", "B"), msg("user", "C")];
  // capturesDir points at a directory that does not exist — if this branch
  // ever needed to replay anything, this call would fail rather than answer.
  const bogusDir = join(tmpDirSync("bt-attr-"), "does-not-exist");
  return computeAttribution("SID", { before: { body: { messages: before } },
                                      after: { body: { messages: after } } }, bogusDir)
    .then((r) => {
      assert.equal(r.verdict, "OURS");
      assert.match(r.reason, /identical\/append-only/);
      assert.match(r.reason, /PRE-pipeline/);
    });
});

test("BITE — identical messages on both sides is also OURS (no divergence to attribute to CC)", () => {
  const same = [msg("user", "HEAD"), msg("assistant", "B")];
  const bogusDir = join(tmpDirSync("bt-attr-"), "does-not-exist");
  return computeAttribution("SID", { before: { body: { messages: same } },
                                      after: { body: { messages: same } } }, bogusDir)
    .then((r) => assert.equal(r.verdict, "OURS"));
});

test("BITE — a raw divergence with no ordinal on the pair is COULD-NOT-ATTRIBUTE, not a guess", () => {
  const before = [msg("user", "HEAD"), msg("assistant", "B")];
  const after = [msg("user", "HEAD"), msg("assistant", "B-EDITED")];
  return computeAttribution("SID", { before: { body: { messages: before }, ord: null },
                                      after: { body: { messages: after }, ord: 5 } })
    .then((r) => {
      assert.equal(r.verdict, "COULD-NOT-ATTRIBUTE");
      assert.match(r.reason, /no request ordinal/);
    });
});

test("BITE — a raw divergence whose capture cannot be replayed is COULD-NOT-ATTRIBUTE with a computed reason", () => {
  const before = [msg("user", "HEAD"), msg("assistant", "B")];
  const after = [msg("user", "HEAD"), msg("assistant", "B-EDITED")];
  const missingDir = join(tmpDirSync("bt-attr-"), "does-not-exist");
  return computeAttribution("NOSUCHSID",
    { before: { body: { messages: before }, ord: 0 }, after: { body: { messages: after }, ord: 1 } },
    missingDir)
    .then((r) => {
      assert.equal(r.verdict, "COULD-NOT-ATTRIBUTE");
      assert.match(r.reason, /does not exist — cannot replay it/);
    });
});

// --- attributionFromRow: the row-level verdict, and the invariant under it ---
//
// The costly path's row-found branch used to read `ours ? "OURS" : "CC's"`,
// which presents as a live discriminator and is a constant: a violation row is
// emitted only under `outDiv !== null && outDiv < (inDiv ?? Infinity)`
// (replay.mjs's scanGroup), i.e. exactly `attributionOf(inDiv, outDiv) ===
// true`. RED, before this change (2026-08-10, new expectations run against the
// OLD expression copied verbatim out of bust-triage.mjs at commit 28d5022):
// the baseline row (inDiv=3, outDiv=1) returned OURS — green, so the red below
// is specific rather than an always-red check — while the invariant-break row
// (inDiv=1, outDiv=3) returned "CC's" where COULD-NOT-ATTRIBUTE was wanted.
//
// The first bite below is the one that automates the MECHANISM rather than the
// symptom: it re-derives, from the real `findStabilityViolations`, that the
// "CC's" shape is unemittable — so if scanGroup's emission guard ever widens,
// this goes red at the guard rather than at some future misattributed bust.

test("BITE — the census cannot emit a row that attributionOf calls CC's (the invariant, re-derived)", () => {
  const m = (t) => ({ role: "user", content: t });
  const [A, B, B2, Bn, C, D, D2, E] =
    ["A", "B", "B2", "Bn", "C", "D", "D2", "E"].map(m);
  const mk = (n, inMsgs, outMsgs) => ({
    n, ts: `t${n}`, key: "s-probe", inMsgs, outMsgs,
    inTools: [], outTools: [], action: "pass", resetReason: null, stats: {},
  });

  // Instrument-positive FIRST, both OURS shapes — without these a zero on the
  // CC's shape below is indistinguishable from a probe that can never emit.
  const oursFirst = findStabilityViolations([
    mk(1, [A, B, C, D, E], [A, B, C, D, E]),
    mk(2, [A, B, C, D2, E], [A, B2, C, D, E]),   // outDiv=1 < inDiv=3
  ]);
  assert.equal(oursFirst.length, 1, "our-output-diverged-first must emit a row");
  assert.equal(attributionOf(oursFirst[0].inDiv, oursFirst[0].outDiv), true);

  const appendOnly = findStabilityViolations([
    mk(1, [A, B, C], [A, B, C]),
    mk(2, [A, B, C, D], [A, B2, C, D]),          // inDiv=null
  ]);
  assert.equal(appendOnly.length, 1, "append-only input with a forwarded divergence must emit a row");
  assert.equal(attributionOf(appendOnly[0].inDiv, appendOnly[0].outDiv), true);

  // The CC's shape: CC's own bytes move at index 1, ours only at index 3.
  const ccFirst = findStabilityViolations([
    mk(1, [A, B, C, D, E], [A, Bn, C, D, E]),
    mk(2, [A, B2, C, D, E], [A, Bn, C, D2, E]), // inDiv=1 < outDiv=3
  ]);
  assert.deepEqual(ccFirst, [],
    "a pair whose raw side diverged FIRST is not a stability violation, so no row " +
    "reaching attributionFromRow can ever carry a CC's verdict");
});

test("BITE — a real census row is OURS, with outDiv and inDiv in the reason", () => {
  const r = attributionFromRow({ inDiv: 3, outDiv: 1, ccIdenticalAtOutDiv: true });
  assert.equal(r.verdict, "OURS");
  assert.match(r.reason, /outDiv=1/);
  assert.match(r.reason, /inDiv=3/);
  assert.match(r.reason, /identical/);
});

test("BITE — an append-only row names append-only rather than printing null", () => {
  const r = attributionFromRow({ inDiv: null, outDiv: 2, ccIdenticalAtOutDiv: true });
  assert.equal(r.verdict, "OURS");
  assert.match(r.reason, /inDiv=append-only/);
  assert.doesNotMatch(r.reason, /inDiv=null/);
});

test("BITE — a row contradicting its own producer's guard is COULD-NOT-ATTRIBUTE, not a verdict", () => {
  const r = attributionFromRow({ inDiv: 1, outDiv: 3, ccIdenticalAtOutDiv: false });
  assert.equal(r.verdict, "COULD-NOT-ATTRIBUTE",
    "an invariant break must not be resolved into OURS or CC's");
  assert.match(r.reason, /contradicts its own/);
  assert.match(r.reason, /inDiv=1 is at or before outDiv=3/);
});

// --- END-TO-END: the CLI's own ATTRIBUTION line, over the real extension pipeline ---

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

// bust-triage.mjs spawns `node tools/replay.mjs <capture> --json --census`
// internally (no explicit `env` on that spawn, so it inherits whatever env
// THIS process was given) — so setting HOME here isolates both the direct
// CLI process and the nested replay.mjs subprocess it launches, the same way
// a single HOME override isolates every extension that resolves state
// through claudeHome()/xdg-dirs.mjs.
const run = (home, args) => execFileSync(process.execPath, [TOOL, ...args], {
  cwd: REPO,
  env: { ...process.env, HOME: home },
  encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
});

test("BITE — end-to-end: a pure append prints ATTRIBUTION: OURS, no replay evidence needed", () => {
  const { home, wt, caps } = fakeHome("bt-attr-ours-");
  const before = [msg("user", "HEAD"), msg("assistant", "B"), msg("user", "C")];
  const after = [...before, msg("assistant", "D")];
  writeBust({ wt, caps, sid: "SATTROURS1", atStamp: "2026-08-08T09:00:05Z",
              before, after, beforeTs: "2026-08-08T09:00:00.000Z", afterTs: "2026-08-08T09:00:05.000Z" });
  const out = run(home, ["--at", "2026-08-08T09:00:05Z"]);
  assert.match(out, /ATTRIBUTION: OURS/, `must print OURS: ${out}`);
  assert.match(out, /attribution\s+OURS —/, "the per-step listing must carry the same verdict");
  assert.match(out, /identical\/append-only/);
});

test("BITE — end-to-end: a mid-history edit with no stability violation prints ATTRIBUTION: CC's", () => {
  const { home, wt, caps } = fakeHome("bt-attr-ccs-");
  const before = [msg("user", "HEAD"), msg("assistant", "B"), msg("user", "C")];
  const after = [msg("user", "HEAD"), msg("assistant", "B-EDITED"), msg("user", "C")];
  writeBust({ wt, caps, sid: "SATTRCCS01", atStamp: "2026-08-08T09:00:05Z",
              before, after, beforeTs: "2026-08-08T09:00:00.000Z", afterTs: "2026-08-08T09:00:05.000Z" });
  const out = run(home, ["--at", "2026-08-08T09:00:05Z"]);
  assert.match(out, /ATTRIBUTION: CC's/, `must print CC's: ${out}`);
  assert.match(out, /attribution\s+CC's —/);
  assert.match(out, /no stability violation for this pair/);
  assert.doesNotMatch(out, /ATTRIBUTION: OURS/);
  assert.doesNotMatch(out, /ATTRIBUTION: COULD-NOT-ATTRIBUTE/);
});

test("BITE — end-to-end: no capture pair at all is ATTRIBUTION: COULD-NOT-ATTRIBUTE, never a default", () => {
  const { home, wt } = fakeHome("bt-attr-cna-");
  // No capture file written at all — capture-absent, same shape as
  // bust-triage-unverifiable-reason.test.mjs's own capture-absent case.
  writeFileSync(join(wt, "activity.jsonl"),
    JSON.stringify({ type: "cold", k: "hit", t: sec("2026-08-08T09:00:05Z"), s: "SATTRCNA01", cc: 20000, ctx: 10, gap: 5, cause: "other" }) + "\n");
  const out = run(home, ["--at", "2026-08-08T09:00:05Z"]);
  assert.match(out, /VERDICT: UNVERIFIABLE/, `must be UNVERIFIABLE: ${out}`);
  assert.match(out, /ATTRIBUTION: COULD-NOT-ATTRIBUTE/, `must never guess an attribution here: ${out}`);
  assert.match(out, /no capture pair to classify/);
});

test("BITE — --json carries the attribution object, not just the text line", () => {
  const { home, wt, caps } = fakeHome("bt-attr-json-");
  const before = [msg("user", "HEAD"), msg("assistant", "B"), msg("user", "C")];
  const after = [msg("user", "HEAD"), msg("assistant", "B-EDITED"), msg("user", "C")];
  writeBust({ wt, caps, sid: "SATTRJSON1", atStamp: "2026-08-08T09:00:05Z",
              before, after, beforeTs: "2026-08-08T09:00:00.000Z", afterTs: "2026-08-08T09:00:05.000Z" });
  const out = run(home, ["--at", "2026-08-08T09:00:05Z", "--json"]);
  const parsed = JSON.parse(out);
  assert.ok(parsed.attribution, "the JSON must carry an `attribution` object");
  assert.equal(parsed.attribution.verdict, "CC's");
  assert.match(parsed.attribution.reason, /no stability violation/);
});

// --- structural: the primitive is IMPORTED, never re-derived ---
//
// The exact instrument the BACKLOG entry itself used to establish the
// original red ("the grep is the evidence: zero attribution logic in that
// file, against two live sites in replay.mjs"). Proven positive on a known
// hit (the import line itself) before it is trusted on the absence question
// it exists to answer.

test("BITE — bust-triage.mjs imports attributionOf from replay.mjs rather than re-deriving the expression", () => {
  const src = readFileSync(join(REPO, "tools", "bust-triage.mjs"), "utf8");
  assert.match(src, /firstDivergence,\s*attributionOf\s*}\s*from\s*"\.\/replay\.mjs"/,
    "the primitive must be imported by name from replay.mjs");
  // Known positive for the search itself: the SAME pattern that would catch
  // a re-derivation (`inDiv === null || inDiv >`) must be absent from
  // bust-triage.mjs — it belongs only in replay.mjs, where attributionOf's
  // own body lives.
  assert.doesNotMatch(src, /inDiv\s*===\s*null\s*\|\|\s*inDiv\s*>/,
    "bust-triage.mjs must call attributionOf, never restate its expression");
});
