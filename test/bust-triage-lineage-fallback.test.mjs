// `capturePairResult`'s conversation identity is the busting request's own
// `messages[0]` — so when a matrix row 29 event REBUILDS that field at an
// idle boundary, the cid search that pairs every other bust goes blind
// exactly when the class it exists to observe fires. Measured live,
// 2026-08-08T11:46:36Z (capture s-captureAT, ord 715): the target's
// `messages[0]` matches NONE of its predecessors (conversationOf pairs none
// of them), while those same predecessors share 97.1/97.3/97.7/98.1/98.5% of
// the target's messages BY CONTENT (ords 709-713, rising with recency), and
// an unrelated 1-message co-tenant sidecar at ord 714 shares 0%.
//
// The fix: a SECOND relation (`lineageOverlap`/`sameLineage`, imported from
// replay.mjs — never re-derived) runs only when the cid search finds
// nothing, and takes the highest-overlap earlier request above the 0.5
// threshold. `conversationOf` (the cid search) is untouched — every
// stable-identity pair must come back byte-identical.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { capturePairResult, pairEditContext } from "../tools/bust-triage.mjs";

const at = (iso) => Date.parse(iso) / 1000;

/** A request record with an explicit messages[0] label and a shared "body"
 * message so lineage overlap has something real to measure. `cid` sets the
 * FIRST message (what `conversationOf` keys on); `body` is repeated on
 * every record that should overlap. */
function req(ts, cid, body, extra = []) {
  const head = { role: "user", content: [{ type: "text", text: "cid-" + cid }] };
  const shared = { role: "assistant", content: [{ type: "text", text: "shared-" + body }] };
  const rec = { ts, id: ts, body: { messages: [head, shared, ...extra] } };
  return JSON.stringify(rec);
}

function capture(records, key = "s-lin0001") {
  const dir = tmpDirSync("bt-lin-");
  writeFileSync(join(dir, `${key}-requests.jsonl`), records.join("\n") + "\n");
  return dir;
}

// THE motivating shape: a rotation at ts=T3 invents a new messages[0]
// ("cid-B") while every message AFTER the head is byte-identical to its
// immediate predecessor under the old identity ("cid-A") — the rebuild the
// entry measured. A co-tenant sidecar (its own cid, its own content) sits
// between them and must never be selected.
test("BITE — a rebuilt messages[0] is paired by content lineage, not cid", async () => {
  const dir = capture([
    req("2026-08-08T11:00:00.000Z", "A", "conv"),                    // predecessor, OLD identity
    req("2026-08-08T11:00:05.000Z", "SIDECAR", "unrelated-sidecar"), // co-tenant, 0% overlap
    req("2026-08-08T11:00:10.000Z", "B", "conv"),                    // the busting request, NEW identity
  ]);
  const r = await capturePairResult("lin0001", at("2026-08-08T11:00:11Z"), dir, null);
  assert.equal(r.ok, true, `walk failed: ${r.code} — ${r.detail}`);
  assert.equal(r.crossesRotation, true, "the pair must be labelled as crossing a rotation");
  assert.equal(r.before.ts, "2026-08-08T11:00:00.000Z",
    "the OLD-identity predecessor is found by content, not by messages[0]");
  assert.equal(r.after.ts, "2026-08-08T11:00:10.000Z");
});

// The cid search stays authoritative when it finds something — the fallback
// must be UNREACHED, not merely "agreeing", so a same-identity pair comes
// back byte-identical to the pre-fix behaviour.
test("CONTROL — an ordinary same-cid pair never reaches the lineage fallback", async () => {
  const dir = capture([
    req("2026-08-08T11:00:00.000Z", "A", "conv"),
    req("2026-08-08T11:00:10.000Z", "A", "conv2"),
  ], "s-lin0002");
  const r = await capturePairResult("lin0002", at("2026-08-08T11:00:11Z"), dir, null);
  assert.equal(r.ok, true);
  assert.equal(r.crossesRotation, undefined, "an ordinary pair carries no rotation label");
  assert.equal(r.before.ts, "2026-08-08T11:00:00.000Z");
});

// NEGATIVE CONTROL, from the entry's own measurement: a 1-message sidecar
// sharing 0% of the target's content must be rejected BY LINEAGE on its own
// evidence — never by a special case naming it. It may still resolve via
// the SEPARATE born-large fallback (BACKLOG "bust-triage cannot reach
// threat-matrix row 24 by ANY of its three routes", a later entry than this
// one) — that fallback deliberately does not require content overlap at
// all — but it must never be mistaken for a lineage/rotation match.
test("BITE — a 0%-overlap sidecar is never selected as the rotated (lineage) predecessor", async () => {
  const dir = capture([
    req("2026-08-08T11:00:05.000Z", "SIDECAR", "totally-unrelated"),
    req("2026-08-08T11:00:10.000Z", "B", "conv"),
  ], "s-lin0003");
  const r = await capturePairResult("lin0003", at("2026-08-08T11:00:11Z"), dir, null);
  assert.equal(r.crossesRotation, undefined,
    "0% overlap must not clear the lineage threshold — it must not be labelled crossesRotation");
  if (r.ok) {
    assert.equal(r.crossConversation, true,
      "if it resolves at all, it must be via the born-large fallback, labelled as such");
  } else {
    assert.equal(r.code, "no-pair-in-conversation");
  }
});

// The dependency the fix must carry: pairEditContext deliberately reuses
// capturePairResult's own notion of "same conversation". For a
// crossesRotation pair the cid-grouped edit-position machinery structurally
// cannot produce a row spanning the rotation (before and after are two
// different conversationOf groups by construction) — pairEditContext must
// say so explicitly rather than silently disagreeing about the pair.
test("pairEditContext returns explicit no-evidence for a crossesRotation pair, never silent disagreement", async () => {
  const dir = capture([
    req("2026-08-08T11:00:00.000Z", "A", "conv"),
    req("2026-08-08T11:00:10.000Z", "B", "conv"),
  ], "s-lin0004");
  const pair = await capturePairResult("lin0004", at("2026-08-08T11:00:11Z"), dir, null);
  assert.equal(pair.ok, true);
  assert.equal(pair.crossesRotation, true);
  const ec = await pairEditContext("lin0004", pair, dir);
  assert.deepEqual(ec, { edit: null, blockMigrations: [], strongerNeighbour: null },
    "a rotation-crossing pair must return explicit no-evidence, not attempt a cid window");
});
