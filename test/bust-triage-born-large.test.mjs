// `bust-triage` cannot reach threat-matrix row 24 by ANY of its three
// routes, so the whole resume / born-large class triages as UNVERIFIABLE or
// UNCLASSIFIED forever.
//
// Measured 2026-08-06 (capture s-captureAL, the 204,513-token
// `system_changed` event, walked to CONTROLLED-CAUSE in row 24). Three
// independent misses: (i) pair selection — `capturePairResult` pairs on
// byte-identical `messages[0]`, so a bust whose defining feature IS a
// `messages[0]` change (a same-machine /resume rebuilding the whole prefix)
// can never be represented; (ii) census class — the counterfactual pair
// classifies append-only, which maps to no row; (iii) cause map —
// `causeToRow` mapped `messages_changed`->4 and `tools_changed`->6/23 and
// nothing else, so `system_changed` (one of only three causes CC emits, and
// the one this whole class books under) mapped to no row at all.
//
// The fix, in two separable halves: `causeToRow` now maps `system_changed`
// to row 24; and `capturePairResult` gained a THIRD fallback stage — when
// neither the cid search nor the lineage relation finds a predecessor, the
// nearest earlier request in the SAME capture file (any conversation, >=2
// messages) stands in, labelled `crossConversation` so nothing downstream
// mistakes it for a same-conversation pair.
//
// The live capture behind the entry's own measurement (s-captureAL) has
// since rotated with no fixture frozen for it (`bust-triage --at
// 1786038016` now reports `capture-absent`, confirmed at the desk before
// building this), so the verifier reproduces the shape synthetically, per
// this repo's own "snapshot what proves a finding" convention.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { capturePairResult, pairEditContext, causeToRow } from "../tools/bust-triage.mjs";

const at = (iso) => Date.parse(iso) / 1000;

function req(ts, cid, n) {
  const head = { role: "user", content: [{ type: "text", text: "cid-" + cid }] };
  const rest = Array.from({ length: n - 1 }, (_, i) => ({
    role: "user", content: [{ type: "text", text: cid + "-filler-" + i }],
  }));
  return JSON.stringify({ ts, id: ts, body: { messages: [head, ...rest] } });
}

function capture(records, key = "s-bl0001") {
  const dir = tmpDirSync("bt-bl-");
  writeFileSync(join(dir, `${key}-requests.jsonl`), records.join("\n") + "\n");
  return dir;
}

test("BITE — a born-large resume pairs against the nearest earlier request in the same capture", async () => {
  const dir = capture([
    req("2026-08-06T17:34:43.963Z", "PRE-EXIT", 89),
    req("2026-08-06T17:39:23.557Z", "POST-RESUME", 91), // born large, new identity, no content overlap
  ]);
  // no ctx floor (null) — this fallback exists for exactly the case where
  // the size test finds a candidate too small OR, as here, where the cid
  // AND lineage stages both find nothing at all.
  const r = await capturePairResult("bl0001", at("2026-08-06T17:39:24Z"), dir, null);
  assert.equal(r.ok, true, `walk failed: ${r.code} — ${r.detail}`);
  assert.equal(r.crossConversation, true, "the pair must be labelled cross-conversation");
  assert.equal(r.before.ts, "2026-08-06T17:34:43.963Z");
  assert.equal(r.after.ts, "2026-08-06T17:39:23.557Z");
});

// A 1-message sidecar sitting closer in time than the real nearest candidate
// must not be selected — the fallback's own ">=2 messages" floor, mirroring
// the ctx-size selection rule elsewhere in this file.
test("BITE — a 1-message sidecar nearer in time is skipped for the nearest >=2-message request", async () => {
  const dir = capture([
    req("2026-08-06T17:30:00.000Z", "REAL-PRED", 40),
    req("2026-08-06T17:38:00.000Z", "SIDECAR", 1),
    req("2026-08-06T17:39:23.557Z", "POST-RESUME", 91),
  ], "s-bl0002");
  const r = await capturePairResult("bl0002", at("2026-08-06T17:39:24Z"), dir, null);
  assert.equal(r.ok, true);
  assert.equal(r.crossConversation, true);
  assert.equal(r.before.ts, "2026-08-06T17:30:00.000Z",
    "the 1-message sidecar must not stand in for the real nearest candidate");
});

// CONTROL, the entry's own requirement: an ordinary same-conversation pair
// must reach the cid search and never fall through to this fallback.
test("CONTROL — an ordinary same-cid pair never reaches the born-large fallback", async () => {
  const dir = capture([
    req("2026-08-06T12:54:00.000Z", "SAME", 5),
    req("2026-08-06T12:54:49.000Z", "SAME", 6),
  ], "s-bl0003");
  const r = await capturePairResult("bl0003", at("2026-08-06T12:54:50Z"), dir, null);
  assert.equal(r.ok, true);
  assert.equal(r.crossConversation, undefined, "an ordinary pair carries no cross-conversation label");
  assert.equal(r.crossesRotation, undefined);
});

// pairEditContext: the same explicit-no-evidence treatment crossesRotation
// already gets, extended to crossConversation.
test("pairEditContext returns explicit no-evidence for a crossConversation pair", async () => {
  const dir = capture([
    req("2026-08-06T17:34:43.963Z", "PRE-EXIT", 89),
    req("2026-08-06T17:39:23.557Z", "POST-RESUME", 91),
  ], "s-bl0004");
  const pair = await capturePairResult("bl0004", at("2026-08-06T17:39:24Z"), dir, null);
  assert.equal(pair.ok, true);
  assert.equal(pair.crossConversation, true);
  const ec = await pairEditContext("bl0004", pair, dir);
  assert.deepEqual(ec, { edit: null, blockMigrations: [], strongerNeighbour: null });
});

// --- causeToRow: the cause-map half ---

test("BITE — causeToRow maps system_changed to row 24", () => {
  assert.equal(causeToRow("system_changed", null), 24);
});

// CONTROL — the existing mappings must be untouched.
test("CONTROL — causeToRow's existing mappings are unchanged", () => {
  assert.equal(causeToRow("messages_changed", null), 4);
  assert.equal(causeToRow("tools_changed", null), 6, "no pair info -> cannot tell -> the general row");
  assert.equal(causeToRow("some_other_cause", null), null);
});
