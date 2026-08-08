// dossier's own reconcile step must not repeat the vocabulary-collision
// bust-triage already shed.
//
// BACKLOG, "dossier.mjs carries the reconcile vocabulary-collision that
// bust-triage just shed" (found 2026-08-07 while fixing the bust-triage half,
// fb20f3d): `dossier.mjs`'s render step compared the ledger's cause and the
// transcript's diagnostic with a bare `!==`, which are two DIFFERENT
// vocabularies for some of the same underlying events — "idle" (worktime's
// gap-derived cause) and "previous_message_not_found" (the API's own
// diagnostic) both name one TTL expiry. The naive inequality test warned on
// that AGREEMENT: "RECONCILE: ledger says `idle`, transcript says
// `previous_message_not_found` — instrument disagreement", about a case
// where both instruments were right.
//
// `bust-triage.mjs` already fixed this for its own reconcile step
// (`sameEvent` / `CAUSE_EQUIVALENCE`, see test/bust-triage-reconcile.test.mjs)
// and exports both for exactly this reuse (dev-loop.md, "chain existing
// tools rather than reimplementing them"). This file exercises the same
// fix through `renderDossier`, dossier's own surface.
//
// Red-first evidence: run directly against the PRE-CHANGE `tools/dossier.mjs`
// (before `sameEvent` was imported and substituted for the bare `!==` at the
// reconcile check) —
//   node — a probe script constructing a `d` with step1.data.cause="idle" and
//   transcriptCause={type:"previous_message_not_found"}, calling
//   renderDossier(d):
//     RECONCILE line present: true
//     - **RECONCILE: ledger says `idle`, transcript says
//       `previous_message_not_found` — instrument disagreement**
// After the change (import sameEvent from ./bust-triage.mjs; the reconcile
// condition reads `!sameEvent(r.cause, d.transcriptCause.type)` instead of
// `r.cause !== d.transcriptCause.type`), the same probe:
//     RECONCILE line present: false

import { test } from "node:test";
import assert from "node:assert/strict";

import { renderDossier, step1Worktime } from "../tools/dossier.mjs";

const TS = Math.floor(Date.parse("2026-07-30T16:57:14Z") / 1000);
const SID = "b16c607d-d484-4935-840e-e3f7ee78eb08";
const ABSENT = { status: "ABSENT", detail: "x", data: null };

/** A minimal dossier `d` carrying only what the reconcile check reads:
 * step1's ledger cause and the standalone transcriptCause field. */
function dossierFor(ledgerCause, transcriptType) {
  const bust = { type: "cold", k: "hit", cls: "bust", t: TS, s: SID, cc: 1, cause: ledgerCause };
  return {
    bust, tsEpoch: TS, sid: SID, key: "k",
    step1: step1Worktime([bust], TS),
    step2: ABSENT, step3: ABSENT, step4: ABSENT, gh: ABSENT,
    transcriptCause: { type: transcriptType, missed: null },
  };
}

// THE motivating pair (BACKLOG entry, dossier.mjs:286 as it stood before this
// change). Verified RED against the pre-change implementation above.
test("BITE — idle and previous_message_not_found name one eviction, not a RECONCILE warning", () => {
  const md = renderDossier(dossierFor("idle", "previous_message_not_found"));
  assert.doesNotMatch(md, /RECONCILE:/,
    "the ledger's gap-derived cause and the API's diagnostic describe the same expiry");
});

// Symmetric, matching sameEvent's own contract (bust-triage.mjs) — the
// caller has no guarantee which side holds which vocabulary.
test("BITE — the equivalence is symmetric", () => {
  const md = renderDossier(dossierFor("previous_message_not_found", "idle"));
  assert.doesNotMatch(md, /RECONCILE:/);
});

// THE CONTROL the BACKLOG entry names, and the one this fix must not cost:
// the raced ledger read that never upgraded off `other`. Matrix row 4's
// 2026-08-05 datapoint names the instance (s-captureQ, 2026-08-05T09:09:41Z,
// ledger `cause=other` against transcript `messages_changed`). `other` means
// the ledger never learned the cause — it is not another word for anything
// — so it must never be treated as agreeing with a real diagnostic.
test("CONTROL (s-captureQ) — a raced 'other' read still warns", () => {
  const md = renderDossier(dossierFor("other", "messages_changed"));
  assert.match(md, /RECONCILE: ledger says `other`, transcript says `messages_changed`/);
});

// A genuine disagreement between two REAL causes must still be reported —
// the fix narrows the vocabulary-collision false positive, it must not widen
// into silencing a real instrument disagreement.
test("BITE — a real instrument disagreement still warns", () => {
  const disagreements = [
    ["messages_changed", "tools_changed"],
    ["tools_changed", "messages_changed"],
    ["idle", "messages_changed"],
    ["messages_changed", "previous_message_not_found"],
  ];
  for (const [ledger, transcript] of disagreements) {
    const md = renderDossier(dossierFor(ledger, transcript));
    assert.match(md, /RECONCILE:/,
      `silenced a genuine disagreement: ledger "${ledger}" vs transcript "${transcript}"`);
  }
});

// Identical causes agree, the ordinary case, unchanged by this fix.
test("identical causes agree, and print no RECONCILE line", () => {
  for (const c of ["messages_changed", "tools_changed", "idle", "other"]) {
    const md = renderDossier(dossierFor(c, c));
    assert.doesNotMatch(md, /RECONCILE:/, c);
  }
});
