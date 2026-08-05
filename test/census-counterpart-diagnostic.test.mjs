// census-counterpart-diagnostic — a MISMATCH/DROPPED row's diagnostic must
// not read "absent" about a counterpart that was PRESENT but REJECTED.
//
// Grounding, measured 2026-08-02 (BACKLOG "READY — census must distinguish
// 'no counterpart' from 'counterpart present but unmatched'"): on capture
// s-captureG (host=30 and host=74) the census printed
// `MISMATCH ... recon=327ch actual=0ch`, and its own comment at the time
// documented `actual=0ch` as "the tell that no counterpart was found at
// all". That reading was WRONG for these rows: a standalone counterpart DID
// exist at host+1 — role:"system", STRING content, `<system-reminder>`
// wrapper RETAINED (364ch), whose inner text (327ch, wrapper stripped) is
// byte-equal to the census's own reconstruction. It failed the
// EXACT/EXTENDED test inside `analysePair`'s sysAfter scan (classify()
// returns MISMATCH: the wrapped bytes are neither equal to nor prefixed by
// the unwrapped reconstruction) and fell through to the no-counterpart
// branch, where the finding's own `text` field is always "" — the diagnostic
// conflated "rejected" with "absent".
//
// The fix distinguishes a third state in that branch only: `rejectedCandidate`
// on the finding, carrying the rejected candidate's raw length. This file
// pins both sides of the split with synthetic, deterministic messages — never
// capture bytes (this repo is public).

import { test } from "node:test";
import assert from "node:assert/strict";
import { analysePair } from "../tools/reminder-migration-census.mjs";

const HOST_ID = "t_host_reminder_migration_001";
const INNER = "synthetic reminder body, deterministic, not capture bytes";
const WRAPPED = `<system-reminder>\n${INNER}\n</system-reminder>`;

// The host: a user message carrying a tool_result (for hostId) plus a
// trailing <system-reminder>-wrapped text block — the shape `reminderBlocks`
// picks up (reminder-migration-census.mjs:170).
const hostMsg = () => ({
  role: "user",
  content: [
    { type: "tool_result", tool_use_id: HOST_ID },
    { type: "text", text: WRAPPED },
  ],
});

// The host's counterpart in `after`: same tool_use_id, blocks departed (the
// reminder block is gone from this message) — this is what makes the host
// a HOST at all (its blocks left the inline form entirely).
const hostEcho = () => ({
  role: "user",
  content: [{ type: "tool_result", tool_use_id: HOST_ID }],
});

test("RED-FIRST — a rejected (wrapper-retaining) candidate standalone is reported by length, not folded into a bare 0", () => {
  // The s-captureG shape: a standalone role:"system" message sits right
  // after the host, STRING content, wrapper RETAINED. classify() rejects it
  // (MISMATCH) inside the sysAfter scan, so `best` never gets set and the
  // no-counterpart branch runs.
  const rejected = { role: "system", content: WRAPPED };
  const before = { body: { messages: [hostMsg()] } };
  const after = { body: { messages: [hostEcho(), rejected] } };

  const findings = analysePair(before, after);
  assert.equal(findings.length, 1, "one host, one finding");
  const f = findings[0];

  // Precondition: this is exactly the shape that used to print actual=0ch —
  // a candidate existed and was classified, not silently skipped.
  assert.equal(f.text.length, 0, "the finding's own text field stays empty, as before");

  assert.ok(f.rejectedCandidate, "a rejected candidate must be surfaced, not dropped");
  assert.equal(f.rejectedCandidate.chars, WRAPPED.length,
    "reports the rejected candidate's raw length (364ch-shape), never a bare 0");
});

test("true absence — nothing anywhere still reports DROPPED with no rejected candidate", () => {
  // Companion case pinning the OTHER state: no standalone at all, at any
  // position. Must stay DROPPED (verdict unchanged) and must NOT manufacture
  // a rejected candidate where none exists.
  const before = { body: { messages: [hostMsg()] } };
  const after = { body: { messages: [hostEcho()] } };

  const findings = analysePair(before, after);
  assert.equal(findings.length, 1);
  const f = findings[0];
  assert.equal(f.verdict, "DROPPED", "nothing migrated at all — verdict stays DROPPED");
  assert.equal(f.rejectedCandidate, null, "nothing to report when nothing was there");
});
