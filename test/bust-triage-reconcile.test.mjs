// The reconcile step must not fire when the two instruments AGREE.
//
// The incident, 2026-08-06T23:59:10Z: bust-triage warned
//   LEDGER says "idle", TRANSCRIPT says "previous_message_not_found"
//   — instrument disagreement
// about ONE eviction that both instruments described correctly. `idle` is
// claude-worktime's gap-derived cause; `previous_message_not_found` is the
// API's own diagnostic for the same expiry. The check compared two fields
// from different vocabularies as though they were one, so agreement in
// substance read as disagreement in words.
//
// A check that fires on a non-defect is broken in the same way as one that
// misses a defect (dev-loop, "Adding a check"): both train their reader to
// discount a red result — and this particular red is the one that catches a
// genuinely raced ledger read.
//
// The expectations come from what the two terms DENOTE, not from the code:
// a pair is equivalent when both name the same underlying event. That is why
// the raced-`other` case below stays a warning — `other` denotes "the ledger
// never learned the cause", which is a real instrument failure, not another
// word for `messages_changed`.

import { test } from "node:test";
import assert from "node:assert/strict";

import { sameEvent, CAUSE_EQUIVALENCE } from "../tools/bust-triage.mjs";

// THE motivating pair. Verified RED against the pre-change implementation by
// direct invocation on the live ledger: `--at 2026-08-06T23:59:10Z` printed
// `WARN reconcile … instrument disagreement`; after the change it prints
// `OK reconcile  ledger "idle" and transcript "previous_message_not_found"
// name the same event`.
test("BITE — idle and previous_message_not_found name one eviction, not two verdicts", () => {
  assert.equal(sameEvent("idle", "previous_message_not_found"), true,
    "the ledger's gap-derived cause and the API's diagnostic describe the same expiry");
  // Symmetric: the table is a set of pairs, not a directed mapping, and the
  // caller has no guarantee which side holds which vocabulary.
  assert.equal(sameEvent("previous_message_not_found", "idle"), true);
});

// THE CONTROL the entry names, and the one this fix must not cost: the raced
// ledger read that never upgraded off `other`. Matrix row 4's 2026-08-05
// datapoint names the instance (s-captureQ, 2026-08-05T09:09:41Z, ledger
// `cause=other` against transcript `messages_changed`, still in the ledger).
// `other` is not another word for anything — it means the ledger never
// learned the cause — so it must never be equivalent to a real diagnostic.
test("CONTROL — a raced 'other' read is never equivalent to a real diagnostic", () => {
  for (const t of ["messages_changed", "tools_changed", "previous_message_not_found", "idle"]) {
    assert.equal(sameEvent("other", t), false,
      `"other" means the ledger never learned the cause; it cannot agree with "${t}"`);
  }
});

// The genuine disagreements the check exists for must all still be reported.
test("BITE — a real instrument disagreement still is one", () => {
  const disagreements = [
    ["messages_changed", "tools_changed"],
    ["tools_changed", "messages_changed"],
    ["idle", "messages_changed"],
    ["messages_changed", "previous_message_not_found"],
    ["tools_changed", "previous_message_not_found"],
  ];
  for (const [ledger, transcript] of disagreements) {
    assert.equal(sameEvent(ledger, transcript), false,
      `silenced a genuine disagreement: ledger "${ledger}" vs transcript "${transcript}"`);
  }
});

test("identical causes agree, which is the ordinary case", () => {
  for (const c of ["messages_changed", "tools_changed", "idle", "other"]) {
    assert.equal(sameEvent(c, c), true, c);
  }
});

// The table is deliberately narrow. A pair earns an entry only when the two
// terms denote the same event — never when one is the usual CONSEQUENCE of
// the other — so its growth is a reviewed act rather than a place to silence
// whatever fired last.
test("the equivalence table is a closed, reviewed list", () => {
  assert.deepEqual(CAUSE_EQUIVALENCE, [["idle", "previous_message_not_found"]],
    "a new entry is a claim that two terms denote ONE event — state it in the table's docstring");
  for (const pair of CAUSE_EQUIVALENCE) {
    assert.equal(pair.length, 2, "entries are pairs");
    assert.notEqual(pair[0], pair[1], "an entry pairing a term with itself says nothing");
    assert.ok(!pair.includes("other"),
      "'other' is the absence of a cause and can never be equivalent to one");
  }
});
