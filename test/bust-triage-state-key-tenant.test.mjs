// `stateKeyAt` joined a request to its extension event-log record by TIME
// PROXIMITY ALONE, across every log file the session owns. Its own docstring
// carried the justification:
//
//   "a genuine join between a captured request and its own extension log
//    line is millisecond-scale (measured live: 2ms both sides of the
//    motivating pair), so nearest-within-window cannot be confused with a
//    different sub-key's own nearby record."
//
// That is true of the join and false of the CONFUSION it rules out. One
// session id carries the main thread AND CC's sidecars (FORK-NOTES.md, "One
// session id carries several conversations"), and a sidecar fires within the
// same millisecond band — so "nearest" picks whichever tenant happened to
// log first, and the margin is noise.
//
// MEASURED LIVE, 2026-08-15 (the 919k event on capture s-captureBR).
// Both sides of the pair resolved to a one-message haiku sidecar rather than
// to the opus main thread:
//
//   request 15:04:43.064  ->  .089 haiku  (25ms)  BEAT  .091 opus (27ms)
//   request 15:07:10.081  ->  .070 haiku  (11ms)  BEAT  .095 opus (14ms)
//
// so the walk reported a key flip 9bf185f127a1827d -> 06731212dceb5c23
// between two DIFFERENT sidecars, while the real reading was
// 2719b7a4-8067f43a66beb9f3 (append-only — the mitigation working) ->
// 2719b7a4-aa5eb6d0c37ed62e (reset/no-baseline — the mitigation losing its
// baseline). Same verdict word, entirely different finding.
//
// THE FIX: the join is scoped to the request's OWN conversation. The state
// key's last segment is the conversation sub-key
// (`resolveInsertionSessionKey`: `s-<sid>-<systemPromptSubKey>-<conv>`), and
// the capture is pre-pipeline, so `conversationSubKey` over the captured
// messages reproduces that segment exactly. Verified on the live pair: the
// captured arrays hash to 8067f43a66beb9f3 and aa5eb6d0c37ed62e, which are
// precisely the two segments the event log carries.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { stateKeyAt } from "../tools/bust-triage.mjs";

// Synthetic session id: this file is committed to a public repo, so it
// must never carry a real one (the hygiene scan's `capture-uuid` class).
const SID = "SKT00001-0000-0000-0000-000000000001";
const MAIN = `s-${SID}-2719b7a4-8067f43a66beb9f3`;
const SIDECAR = `s-${SID}-3865dedc-9bf185f127a1827d`;

function logDir(records) {
  const dir = tmpDirSync("bt-tenant-");
  writeFileSync(
    join(dir, `s-${SID}-insertion-events.jsonl`),
    records.map((r) => JSON.stringify(r)).join("\n") + "\n",
  );
  return dir;
}

// The live shape: the sidecar's record is NEARER in time than the main
// thread's own record.
const LIVE_SHAPE = [
  { ts: "2026-08-15T15:04:43.089Z", key: SIDECAR, action: "reset", resetReason: "no-prior-canonical" },
  { ts: "2026-08-15T15:04:43.091Z", key: MAIN, action: "append-only" },
];

test("BITE — the conversation's own record wins over a nearer sidecar record", () => {
  const dir = logDir(LIVE_SHAPE);
  const r = stateKeyAt(SID, "2026-08-15T15:04:43.064Z", dir, "8067f43a66beb9f3");
  assert.ok(r, "a record for this conversation exists and must be found");
  assert.equal(r.key, MAIN, "the main thread's key, not the temporally nearer sidecar's");
  assert.equal(r.action, "append-only");
  assert.equal(r.convMatched, true, "the join must declare that it matched on conversation");
});

test("INSTRUMENT — without the conversation scope the sidecar really does win", () => {
  // Proves the fixture bites for the stated reason rather than by accident:
  // unscoped, the same input returns the wrong tenant. If this ever stops
  // being true the BITE above has become vacuous and must be re-derived.
  const dir = logDir(LIVE_SHAPE);
  const r = stateKeyAt(SID, "2026-08-15T15:04:43.064Z", dir, null);
  assert.equal(r.key, SIDECAR, "unscoped, nearest-in-time selects the sidecar — the defect");
  assert.equal(r.convMatched, null,
    "no conversation supplied is NOT the same answer as one supplied and missed — null, never false");
});

test("CONTROL — a conversation with no record in the window is NOT silently substituted", () => {
  // The failure this replaces must not come back as a quieter substitution:
  // asking for a conversation the log has nothing for falls back, but says
  // so, so a caller can never read it as an answer about that conversation.
  const dir = logDir(LIVE_SHAPE);
  const r = stateKeyAt(SID, "2026-08-15T15:04:43.064Z", dir, "ffffffffffffffff");
  assert.ok(r, "the fallback still returns the nearest record rather than nothing");
  assert.equal(r.convMatched, false, "and it must declare that it is NOT this conversation's record");
});

test("CONTROL — records outside the telemetry window are still excluded", () => {
  const dir = logDir([
    { ts: "2026-08-15T15:00:00.000Z", key: MAIN, action: "append-only" },
  ]);
  const r = stateKeyAt(SID, "2026-08-15T15:04:43.064Z", dir, "8067f43a66beb9f3");
  assert.equal(r, null, "a record minutes away is not this request's own record");
});
