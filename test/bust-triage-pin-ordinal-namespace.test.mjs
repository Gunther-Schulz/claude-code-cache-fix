// The pin ordinals `bust-triage` prints are consumed BY `harvest --pin`, and
// the two were counting different things — the exact hazard
// `docs/runbooks/bust-appears.md` opens with ("Ordinals from different tools
// are different namespaces ... never by trusting that two counters agree"),
// reintroduced by the freeze-hint that exists to save the reader that join.
//
// bust-triage counted every record that is not `boot` and not `outcome`
// (six sites), and its own comment asserted this was "counted by HARVEST's
// rule ... (harvest.mjs pinRange)". Harvest does NOT count that way: both
// `pinRange` and `locateBoundedTarget` skip `coalesced` records without
// incrementing (`harvest.mjs`, `if (rec.type === "coalesced") { ...;
// continue; }` before `const idx = count++`). So every `coalesced` record
// earlier in a capture shifted the printed range by one, and a pasted
// `harvest --pin <key> n..m` froze a range starting one record late.
//
// The defect is NEW rather than long-standing, which is why the comment was
// true when it was written: `coalesced` records are row 31's own mitigation
// (a duplicate send served from another request's in-flight answer) and only
// started appearing in captures recently. A rule stated as "the same as
// theirs" does not track the other side changing.
//
// MEASURED 2026-08-15 on capture s-captureBR: one `coalesced` record sits at
// ordinal 4, so bust-triage's ordinal N is harvest's N-1 for every record
// after it, and the freeze hint printed for the 919k pair named a range whose
// endpoints were a co-tenant sidecar rather than the pair.
//
// This test pins the CONTRACT, not the current arithmetic: the ordinal a
// pair carries must be the index harvest would assign, computed here by
// harvest's own predicate (`isCaptureRequestRecord`) rather than by a second
// copy of the counting rule.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { capturePairResult } from "../tools/bust-triage.mjs";
import { isCaptureRequestRecord } from "../tools/logs.mjs";

const at = (iso) => Date.parse(iso) / 1000;
const msg = (t) => ({ role: "user", content: [{ type: "text", text: `m-${t}` }] });
const BODY = Array.from({ length: 6 }, (_, i) => msg(`e${i}`));

// A capture that carries every record KIND, with the non-request kinds sitting
// BEFORE the pair — which is the only arrangement in which a miscount is
// visible at the pair.
function buildCapture() {
  const recs = [
    { ts: "2026-08-15T12:00:00.000Z", type: "boot", proxyTree: "deadbeef", gates: {} },
    { ts: "2026-08-15T12:00:01.000Z", id: "r0", body: { messages: [msg("head"), ...BODY] } },
    { ts: "2026-08-15T12:00:02.000Z", type: "outcome", id: "r0", requestId: "req_0", usage: {} },
    // The record that caused the drift: harvest skips it WITHOUT counting.
    { ts: "2026-08-15T12:00:03.000Z", type: "coalesced", id: "c0", key: "k" },
    { ts: "2026-08-15T15:04:43.064Z", id: "rPred", body: { messages: [msg("head"), ...BODY, msg("x")] } },
    { ts: "2026-08-15T15:07:10.081Z", id: "rBust", body: { messages: [msg("head"), ...BODY, msg("x"), msg("y")] } },
  ];
  const dir = tmpDirSync("bt-ord-");
  writeFileSync(join(dir, "s-ORD00001-requests.jsonl"),
    recs.map((r) => JSON.stringify(r)).join("\n") + "\n");
  return { dir, recs };
}

// Harvest's own rule, applied here to DERIVE the expectation instead of
// restating a number — a hardcoded index would go stale the moment the
// fixture gains a record, which is the "comparison basis restated from the
// source" failure this repo already books.
function harvestOrdinalOf(recs, id) {
  let count = 0;
  for (const r of recs) {
    if (!isCaptureRequestRecord(r)) continue;
    if (r.id === id) return count;
    count++;
  }
  return null;
}

test("BITE — printed pin ordinals are in HARVEST's namespace, not a coalesced-inclusive one", async () => {
  const { dir, recs } = buildCapture();
  const r = await capturePairResult("ORD00001", at("2026-08-15T15:07:49Z"), dir, null);
  assert.equal(r.ok, true, `walk failed: ${r.code} — ${r.detail}`);

  const expectBefore = harvestOrdinalOf(recs, "rPred");
  const expectAfter = harvestOrdinalOf(recs, "rBust");
  assert.equal(expectBefore, 1, "fixture sanity: the predecessor is harvest's request #1");
  assert.equal(expectAfter, 2, "fixture sanity: the busting request is harvest's request #2");

  assert.equal(r.before.ord, expectBefore,
    "the pin hint's start must name the record harvest would pin, not one shifted by the coalesced record");
  assert.equal(r.after.ord, expectAfter,
    "the pin hint's end must name the busting request in harvest's own numbering");
});

test("CONTROL — a capture with NO coalesced record is unaffected", async () => {
  // The two namespaces coincide when nothing is skipped, so this arm must be
  // byte-identical before and after the fix. Without it, a change that simply
  // shifted everything by one in the other direction would pass the bite.
  const recs = [
    { ts: "2026-08-15T12:00:00.000Z", type: "boot", proxyTree: "d", gates: {} },
    { ts: "2026-08-15T12:00:01.000Z", id: "r0", body: { messages: [msg("head"), ...BODY] } },
    { ts: "2026-08-15T12:00:02.000Z", type: "outcome", id: "r0", requestId: "req_0", usage: {} },
    { ts: "2026-08-15T15:04:43.064Z", id: "rPred", body: { messages: [msg("head"), ...BODY, msg("x")] } },
    { ts: "2026-08-15T15:07:10.081Z", id: "rBust", body: { messages: [msg("head"), ...BODY, msg("x"), msg("y")] } },
  ];
  const dir = tmpDirSync("bt-ord2-");
  writeFileSync(join(dir, "s-ORD00002-requests.jsonl"),
    recs.map((r) => JSON.stringify(r)).join("\n") + "\n");

  const r = await capturePairResult("ORD00002", at("2026-08-15T15:07:49Z"), dir, null);
  assert.equal(r.ok, true, `walk failed: ${r.code} — ${r.detail}`);
  assert.equal(r.before.ord, harvestOrdinalOf(recs, "rPred"));
  assert.equal(r.after.ord, harvestOrdinalOf(recs, "rBust"));
});
