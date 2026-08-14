// `--at <stamp>` must never answer about a different event than the one the
// stamp names, without saying so.
//
// The incident, 2026-08-05, found by using it: the DEFAULT path printed the
// note it should — "the newest cold event is 2026-08-05 17:22:36Z
// CONTROLLED(resume), 408k re-written … Falling back to the newest BUST" —
// while `--at 2026-08-05T17:22:36Z`, the stamp copied straight out of
// `--list` as `docs/runbooks/bust-appears.md` step 2 instructs, printed
// NOTHING and returned a verdict about the 12:20:13Z messages_changed bust.
// `--at` resolved against BUSTS ONLY, so the controlled event it names was
// invisible to it and the guard `fallbackNote` exists for was routed around.
// That is worse than having no guard: the reader believes the verdict
// describes the event they asked about.
//
// These drive the real CLI rather than the resolver, with HOME pointed at a
// synthetic ledger — the defect lived in main()'s wiring, so a unit test of
// the resolver would have passed over it. Verified RED against the
// pre-change binary by direct invocation on this exact ledger: the first
// assertion below (a NOTE is printed at all) failed, and the run named the
// 12:20:13Z bust with no marking whatsoever.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSyntheticHome } from "../tools/synthetic-home.mjs";
import { tmpDirSync } from "../tools/tmpdir.mjs";
import {
  joinOutcomeToRequest, capturePairForRequestId, capturePairResult,
} from "../tools/bust-triage.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "bust-triage.mjs");

const CONTROLLED_AT = "2026-08-05T17:22:36Z";       // the ❄ the reader saw
const BUST_AT = "2026-08-05T12:20:13Z";             // the older, unrelated bust
const sec = (iso) => Math.floor(Date.parse(iso) / 1000);

// RE-POINTED at the shared synthetic-HOME builder (BACKLOG.md, "the
// synthetic-HOME pattern is the only way to drive this repo's CLIs, and it
// is currently re-invented per test") — this file's own hand-rolled
// fakeHome() used to build exactly this ledger by hand; the shared builder
// produces the byte-identical file at the byte-identical path, verified by
// this file's own suite staying green (see the closing report for the
// before/after transcript).
/** A HOME whose worktime ledger holds exactly the motivating two events. */
function fakeHome() {
  return buildSyntheticHome({
    ledger: [
      { type: "cold", k: "hit", t: sec(BUST_AT), s: "SBUST001", cc: 76000, cause: "messages_changed" },
      { type: "cold", k: "resume", t: sec(CONTROLLED_AT), s: "SCTRL001", cc: 408000, cause: "resume" },
    ],
  });
}

const run = (home, args) => execFileSync(process.execPath, [TOOL, ...args],
  { cwd: REPO, env: { ...process.env, HOME: home }, encoding: "utf8" });

test("BITE — --at on a CONTROLLED stamp says so, and names the stamp asked for", () => {
  const out = run(fakeHome(), ["--at", CONTROLLED_AT]);
  assert.match(out, /NOTE/, "silent substitution: the run said nothing about the event asked for");
  assert.match(out, /2026-08-05 17:22:36Z/,
    "the note must name the REQUESTED stamp, not only 'the newest'");
  assert.match(out, /CONTROLLED\(resume\)/, "and what that event actually is");
  assert.match(out, /Cannot triage/i, "the non-verdict must be stated as one");
  assert.match(out, /Falling back to the newest BUST at or before .*2026-08-05 12:20:13Z/,
    "and it must name what it triaged instead");
});

test("BITE — no bust at or before the stamp is an answer, not the newest bust", () => {
  const out = run(fakeHome(), ["--at", "2026-08-05T09:00:00Z"]);
  assert.match(out, /No bust at or before 2026-08-05 09:00:00Z/,
    "a bust LATER than the stamp is not the event the reader was looking at");
  assert.doesNotMatch(out, /VERDICT/, "and nothing may be triaged in its place");
});

test("--at on a bust's own stamp triages it and stays quiet — the tool is not chatty", () => {
  const out = run(fakeHome(), ["--at", BUST_AT]);
  assert.doesNotMatch(out, /NOTE/, "a note on every run is a note nobody reads");
  assert.match(out, /bust-triage — 2026-08-05 12:20:13Z/);
});

test("--at with an unreadable stamp refuses rather than triaging the newest", () => {
  // Date.parse -> NaN made every nearest-match comparison false, so the old
  // reduce returned its seed: the newest bust, silently.
  assert.throws(() => run(fakeHome(), ["--at", "not-a-stamp"]), (err) => {
    assert.equal(err.status, 2);
    assert.match(err.stdout, /neither an epoch nor a parseable stamp/);
    assert.doesNotMatch(err.stdout, /VERDICT/);
    return true;
  });
});

test("CONTROL — the default path's note is unchanged", () => {
  // The stamp itself and everything after it are pinned exactly; a local
  // rendering (BACKLOG, "every human-facing stamp emits BOTH zones") is
  // allowed to appear between the UTC stamp and what follows, so this
  // tolerates it without pinning the machine's own offset.
  const out = run(fakeHome(), []);
  assert.match(out, /the newest cold event is 2026-08-05 17:22:36Z( \(\d{2}:\d{2} local\))? CONTROLLED\(resume\), 408k re-written/);
  assert.match(out, /Falling back to the newest BUST: 2026-08-05 12:20:13Z( \(\d{2}:\d{2} local\))? \(messages_changed\)/);
});

test("--json carries the substitution too", () => {
  const out = run(fakeHome(), ["--at", CONTROLLED_AT, "--json"]);
  const r = JSON.parse(out);
  assert.equal(r.fellBack, true, "the explicit path used to report fellBack:false while substituting");
  assert.equal(r.requested.t, sec(CONTROLLED_AT), "the event asked for rides the JSON");
  assert.equal(r.bust.t, sec(BUST_AT), "and the one actually triaged");
});

// ─────────────────────────────────────────────────────────────────────────
// The capture JOIN (outcome -> request) — BACKLOG "the capture join is not
// mechanized anywhere". `bust-triage` used to select the busting request by
// TIME PROXIMITY alone, which the entry names as measurably wrong (a sonnet
// pair returned for a fable bust; a pair 51s off the real event on the
// 2026-08-13 11:33:46Z motivating walk). The real motivating pair (real
// session id, real capture, real `requestId`) is DELIBERATELY not
// reproduced here — CLAUDE.local.md's publication bar forbids any real
// session/project identity in a tracked file — so this fixture reproduces
// the SAME SHAPE synthetically: a decoy request closer to the ledger's cutoff
// (what time-proximity picks) and the true target further from it but
// reachable only via its outcome's `requestId` (what the join picks). The
// live disagreement was verified by hand against the real 2026-08-13 event
// before this fixture was written (closing report carries the redacted
// numbers); this is the permanent, re-runnable proof.
//
// RED-FIRST: run against `capturePairForRequestId`/`joinOutcomeToRequest`,
// which did not exist before this entry — the module fails to import at all
// on the pre-change tree, which is the strongest red available for a brand
// new export (dev-loop.md: "a module-load red proves a check is new").
// ─────────────────────────────────────────────────────────────────────────

const JOIN_SID = "JOINSID001";
const jmsg = (t) => ({ role: "user", content: [{ type: "text", text: t }] });
const A_HEAD = jmsg("conv-A-head");
const B_HEAD = jmsg("conv-B-head");

// Conversation A: the TRUE busting request, reachable only by requestId.
const REQ_A1 = JSON.stringify({ id: "cap-a1", ts: "2026-08-13T11:33:20.000Z",
  body: { messages: [A_HEAD, jmsg("a-m0")] } });
const REQ_A2 = JSON.stringify({ id: "cap-a2", ts: "2026-08-13T11:33:41.000Z",
  body: { messages: [A_HEAD, jmsg("a-m0"), jmsg("a-m1"), jmsg("a-m2")] } });
const OUT_A2 = JSON.stringify({ type: "outcome", id: "cap-a2", requestId: "req_TARGET",
  ts: "2026-08-13T11:33:43.000Z", usage: { cacheCreation: 246636 } });

// Conversation B: closer to the ledger's cutoff — what naive time-proximity
// picks, and the WRONG request (mirrors the real 51s-off pick).
const REQ_B1 = JSON.stringify({ id: "cap-b1", ts: "2026-08-13T11:33:10.000Z",
  body: { messages: [B_HEAD, jmsg("b-m0")] } });
const REQ_B2 = JSON.stringify({ id: "cap-b2", ts: "2026-08-13T11:33:45.000Z",
  body: { messages: [B_HEAD, jmsg("b-m0"), jmsg("b-m1")] } });

const JOIN_CUTOFF = sec("2026-08-13T11:33:46Z");

function joinCapture(records) {
  const dir = tmpDirSync("bt-join-");
  writeFileSync(join(dir, `s-${JOIN_SID}-requests.jsonl`), records.join("\n") + "\n");
  return dir;
}

test("BITE — the joined pair and the time-proximity pair DIFFER on the same cutoff", async () => {
  const dir = joinCapture([REQ_B1, REQ_A1, REQ_A2, REQ_B2, OUT_A2]);

  const joined = await capturePairForRequestId(JOIN_SID, "req_TARGET", dir);
  const proximate = await capturePairResult(JOIN_SID, JOIN_CUTOFF, dir, null);

  assert.equal(joined.ok, true, `join failed: ${joined.code} — ${joined.detail}`);
  assert.equal(proximate.ok, true, `proximity failed: ${proximate.code} — ${proximate.detail}`);

  // The two must DIFFER, or the join is inert (the entry's own requirement).
  assert.notEqual(joined.after.id, proximate.after.id,
    "the join and time-proximity selected the SAME request — the fixture proves nothing");
  assert.equal(joined.after.id, "cap-a2", "the join must land on the requestId-carrying request");
  assert.equal(proximate.after.id, "cap-b2", "time proximity must land on the request closer to cutoff (the wrong one)");
  assert.equal(joined.after.body.messages.length, 4);
  assert.equal(proximate.after.body.messages.length, 3);

  // The predecessor comes along correctly for each, via the shared
  // findPredecessor route — same-conversation, never cross-conversation.
  assert.equal(joined.before.id, "cap-a1");
  assert.equal(proximate.before.id, "cap-b1");
});

test("BITE — a requestId absent from the capture is could-not-verify, never the nearest record", async () => {
  const dir = joinCapture([REQ_B1, REQ_A1, REQ_A2, REQ_B2, OUT_A2]);
  const r = await joinOutcomeToRequest(JOIN_SID, "req_NOWHERE", dir);
  assert.equal(r.ok, false);
  assert.equal(r.code, "no-such-request-id");
  assert.equal(r.record, undefined, "a failed join must carry no record at all — not the nearest one");
});

test("BITE — no requestId given is its own could-not-verify, not a silent fallback", async () => {
  const dir = joinCapture([REQ_A1, REQ_A2]);
  const r = await joinOutcomeToRequest(JOIN_SID, null, dir);
  assert.equal(r.ok, false);
  assert.equal(r.code, "no-request-id");
});

test("CONTROL — capturePairForRequestId propagates the join's own failure code, not a guess", async () => {
  const dir = joinCapture([REQ_A1, REQ_A2]); // no outcome record in this capture at all
  const r = await capturePairForRequestId(JOIN_SID, "req_TARGET", dir);
  assert.equal(r.ok, false);
  assert.equal(r.code, "no-such-request-id");
});

// ─────────────────────────────────────────────────────────────────────────
// End-to-end: `bust-triage` itself must consume the join for pair selection
// and say which path it used (design item 1's own requirement, "--at keeps
// working for events with no transcript request id, but says which path it
// used"). Two full synthetic HOMEs, ledger+capture identical, one carrying a
// CC transcript with the busting record's `requestId`, one without — the
// only variable is transcript presence, and the selected pair must differ.
// ─────────────────────────────────────────────────────────────────────────

function joinHome(withTranscript) {
  const home = buildSyntheticHome({
    ledger: [{ type: "cold", k: "hit", t: JOIN_CUTOFF, s: JOIN_SID, cc: 246636, cause: "other" }],
    captures: [{ sid: JOIN_SID, lines: [REQ_B1, REQ_A1, REQ_A2, REQ_B2, OUT_A2] }],
  });
  if (withTranscript) {
    const dir = join(home, ".claude", "projects", "synthetic-project");
    mkdirSync(dir, { recursive: true });
    // Mirrors the real motivating record exactly: `diagnostics: null` (no
    // cache_miss_reason) while still carrying its own top-level `requestId`
    // — the case `transcriptCause` alone cannot resolve a requestId from.
    writeFileSync(join(dir, `${JOIN_SID}.jsonl`), JSON.stringify({
      type: "assistant", requestId: "req_TARGET", timestamp: "2026-08-13T11:33:44.000Z",
      message: { usage: { cache_creation_input_tokens: 246636 }, diagnostics: null },
    }) + "\n");
  }
  return home;
}

test("BITE — bust-triage picks the JOINED pair when the transcript carries a requestId", () => {
  const out = run(joinHome(true), ["--at", "2026-08-13T11:33:46Z", "--json"]);
  const r = JSON.parse(out);
  const join = r.steps.find((s) => s.step === "join");
  const capture = r.steps.find((s) => s.step === "capture");
  assert.ok(join?.ok, `join step did not succeed: ${JSON.stringify(join)}`);
  assert.match(capture.detail, /\[joined\]/, `capture step did not report the joined path: ${capture.detail}`);
  assert.match(capture.detail, /2026-08-13T11:33:41\.000Z/, "the joined AFTER must be cap-a2, not the proximate cap-b2");
});

test("CONTROL — bust-triage falls back to the PROXIMATE pair with no transcript, and says so", () => {
  const out = run(joinHome(false), ["--at", "2026-08-13T11:33:46Z", "--json"]);
  const r = JSON.parse(out);
  const join = r.steps.find((s) => s.step === "join");
  const capture = r.steps.find((s) => s.step === "capture");
  assert.equal(join?.ok, false, "no transcript exists, so the join step must report it could not run");
  assert.match(capture.detail, /\[proximate\]/, `capture step did not report the proximate fallback: ${capture.detail}`);
  assert.match(capture.detail, /2026-08-13T11:33:45\.000Z/, "the proximate AFTER must be cap-b2, the request nearest cutoff");
});
