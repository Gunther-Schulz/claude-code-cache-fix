// findIdentityRotations — threat-matrix row 26's census class: OUR OWN
// pipeline changing the conversation identity between the raw captured
// request and the body we forward. BACKLOG.md "the census cannot see OUR OWN
// pipeline rotating the conversation identity" is the normative source; this
// file pins its predicate and its two named traps.
//
// The predicate is the cache_control-STRIPPED twins (inHashNoCC[0] vs
// outHashNoCC[0]), never the raw twins (inHash[0] vs outHash[0]) — the raw
// pair moves on every relocated cache_control breakpoint, which is constant
// traffic, not a rotation. BACKLOG's own title for the commit this repo
// carries at HEAD ("the rotation class would have fired on every moved
// breakpoint") is the retracted first attempt at exactly this class.
//
// Two BACKLOG entries, bundled because they land in this one file:
//   - "measures the right EVENT" (the digest defect) — the row must print
//     conversationSubKey identities, not a local 12-char sha over the whole
//     message object, so it joins the event log that records the same
//     rotation.
//   - "counts a persistent STATE" (the rate defect) — a rotation, once it
//     fires for a conversation, re-fires on every subsequent request in
//     that conversation (fresh-session-sort's relocation is a persistent
//     mutation). The per-request rows stay (the honest per-request fact),
//     and a TRANSITION count is added beside them: NEW only the first time
//     a given (key, raw identity) pair is seen rotating in this capture.

import { test } from "node:test";
import assert from "node:assert/strict";

import { findIdentityRotations, compactEntry } from "../tools/replay.mjs";
import { conversationSubKey } from "../proxy/extensions/message-hash.mjs";

// Entries in the compact shape findIdentityRotations consumes. Fixture-level:
// most bites below supply inHashNoCC/outHashNoCC directly rather than routing
// real message bodies through compactEntry, because the classification
// predicate only ever reads index [0] of those two arrays — this is the same
// fixture discipline absorption-miss.test.mjs uses for findAbsorptionMisses.
//
// `inHash`/`outHash` are set to a dummy non-empty array on purpose: they are
// unrelated to the predicate under test, but asCompact's own gate
// (`e.inHash ? e : compactEntry(e)`) reads them to decide whether an object
// is ALREADY compact — omitting them would silently route every fixture
// through compactEntry({inMsgs: undefined, outMsgs: undefined}) instead,
// discarding the inHashNoCC/outHashNoCC this test constructs.
//
// `inConvKey`/`outConvKey` default to the hashNoCC[0] values when the caller
// does not care about the reported identity's exact shape (the structural
// bites below) — only the dedicated digest bite constructs them for real.
const entry = ({ n, ts, key = "k", inHashNoCC, outHashNoCC, inConvKey, outConvKey }) => ({
  n,
  ts,
  key,
  inHash: ["dummy"],
  outHash: ["dummy"],
  inHashNoCC,
  outHashNoCC,
  inConvKey: inConvKey ?? inHashNoCC?.[0] ?? null,
  outConvKey: outConvKey ?? outHashNoCC?.[0] ?? null,
});

test("a prepended block 0 in the forwarded messages[0] DOES classify", () => {
  const rows = findIdentityRotations([
    entry({ n: 1, ts: "t1", inHashNoCC: ["raw0"], outHashNoCC: ["fwd0"] }),
  ]);
  assert.equal(rows.length, 1, "raw and forwarded identities differ — a rotation");
  assert.equal(rows[0].n, 1);
  assert.equal(rows[0].ts, "t1");
  assert.equal(rows[0].key, "k");
  assert.equal(rows[0].rawId, "raw0");
  assert.equal(rows[0].fwdId, "fwd0");
});

test("the emitted digests equal conversationSubKey of the respective messages[0] on a constructed entry", () => {
  // Entry A (BACKLOG "measures the right EVENT"): the row must print the
  // proxy's own conversation identity, not a local sha() over the whole
  // message object. Routed through the real producer (compactEntry) so the
  // claim under test is what the shipped pipeline actually reports, not a
  // fixture encoding the test author's belief about it.
  const raw0 = {
    role: "user",
    content: [{ type: "text", text: "raw content" }],
  };
  const fwd0 = {
    role: "user",
    content: [
      { type: "text", text: "injected reminder block" },
      { type: "text", text: "raw content" },
    ],
  };
  const e = compactEntry({ n: 40, ts: "t40", key: "k", inMsgs: [raw0], outMsgs: [fwd0] });
  const rows = findIdentityRotations([e]);
  assert.equal(rows.length, 1, "raw and forwarded messages[0] differ — a rotation");
  assert.equal(rows[0].rawId, conversationSubKey([raw0]), "reported raw identity must equal conversationSubKey(raw)");
  assert.equal(
    rows[0].fwdId,
    conversationSubKey([fwd0]),
    "reported forwarded identity must equal conversationSubKey(forwarded)",
  );
  // The two digests are also 16 hex chars — conversationSubKey's own slice —
  // never the local sha()'s 12, which is what made a row unjoinable against
  // the event log in the first place.
  assert.match(rows[0].rawId, /^[0-9a-f]{16}$/);
  assert.match(rows[0].fwdId, /^[0-9a-f]{16}$/);
});

test("a cache_control-only difference between raw and forwarded messages[0] does NOT classify", () => {
  // This is the bite that would expose a divergence between the two strip
  // implementations named in BACKLOG (stripCacheControlDeep, which
  // inHashNoCC/outHashNoCC are built from, vs hashMessageContent's per-block
  // strip, which the real conversationSubKey uses). Routed through the real
  // producer (compactEntry), not a fixture, because the claim under test is
  // what stripCacheControlDeep actually does to a cache_control-bearing
  // message — a fixture would only assert the test author's belief about it.
  const raw0 = {
    role: "user",
    content: [{ type: "text", text: "same content" }],
  };
  const fwd0 = {
    role: "user",
    content: [{ type: "text", text: "same content", cache_control: { type: "ephemeral", ttl: "1h" } }],
  };
  const e = compactEntry({ n: 2, ts: "t2", key: "k", inMsgs: [raw0], outMsgs: [fwd0] });
  // Sanity on the producer itself before trusting the scanner's silence:
  // the raw byte hashes must actually differ (a marker was added), or this
  // bite would pass vacuously by testing nothing.
  assert.notEqual(e.inHash[0], e.outHash[0], "raw byte hashes must differ — a marker WAS added");
  const rows = findIdentityRotations([e]);
  assert.deepEqual(rows, [], "a moved/added cache_control breakpoint is not a rotation");
});

test("an empty raw array produces no row, not a rotation against nothing", () => {
  const rows = findIdentityRotations([
    entry({ n: 3, ts: "t3", inHashNoCC: [], outHashNoCC: ["fwd0"] }),
  ]);
  assert.deepEqual(rows, [], "an absent raw identity is not a rotation");
});

test("an empty forwarded array produces no row, not a rotation against nothing", () => {
  const rows = findIdentityRotations([
    entry({ n: 4, ts: "t4", inHashNoCC: ["raw0"], outHashNoCC: [] }),
  ]);
  assert.deepEqual(rows, [], "an absent forwarded identity is not a rotation");
});

test("an identical raw/forwarded pair produces no row", () => {
  const rows = findIdentityRotations([
    entry({ n: 5, ts: "t5", inHashNoCC: ["same"], outHashNoCC: ["same"] }),
  ]);
  assert.deepEqual(rows, [], "identity held — nothing rotated");
});

test("rows are sorted by n and carry both identities, regardless of input order", () => {
  const rows = findIdentityRotations([
    entry({ n: 30, ts: "t30", inHashNoCC: ["r30"], outHashNoCC: ["f30"] }),
    entry({ n: 10, ts: "t10", inHashNoCC: ["r10"], outHashNoCC: ["f10"] }),
    entry({ n: 20, ts: "t20", inHashNoCC: ["r20"], outHashNoCC: ["f20"] }),
  ]);
  assert.deepEqual(
    rows.map((r) => r.n),
    [10, 20, 30],
    "sorted by n, not by input order",
  );
  for (const r of rows) {
    assert.equal(r.rawId, `r${r.n}`);
    assert.equal(r.fwdId, `f${r.n}`);
  }
});

test("a conversation rotating once then staying rotated yields ONE transition and several per-request rows", () => {
  // BACKLOG "counts a persistent STATE": fresh-session-sort's relocation is
  // a persistent per-session mutation, so every request AFTER the first
  // rotation for a conversation re-fires the per-request predicate. The row
  // count stays honest (several rows); a TRANSITION count answers "how many
  // times did a rotation actually OCCUR" instead of "how many requests were
  // served under one".
  const rows = findIdentityRotations([
    entry({ n: 1, ts: "t1", key: "k", inHashNoCC: ["conv-A"], outHashNoCC: ["conv-A-rotated"] }),
    entry({ n: 2, ts: "t2", key: "k", inHashNoCC: ["conv-A"], outHashNoCC: ["conv-A-rotated"] }),
    entry({ n: 3, ts: "t3", key: "k", inHashNoCC: ["conv-A"], outHashNoCC: ["conv-A-rotated"] }),
  ]);
  assert.equal(rows.length, 3, "every rotated request still gets its own honest per-request row");
  const transitions = rows.filter((r) => r.transition);
  assert.equal(transitions.length, 1, "the conversation's raw identity only starts rotating once");
  assert.equal(transitions[0].n, 1, "the transition is the FIRST request that rotated, not a later one");
  assert.deepEqual(
    rows.slice(1).map((r) => r.transition),
    [false, false],
    "subsequent requests in the same rotated conversation are not new transitions",
  );
});

test("two distinct conversations rotating yield two transitions", () => {
  const rows = findIdentityRotations([
    entry({ n: 1, ts: "t1", key: "k", inHashNoCC: ["conv-A"], outHashNoCC: ["conv-A-rotated"] }),
    entry({ n: 2, ts: "t2", key: "k", inHashNoCC: ["conv-B"], outHashNoCC: ["conv-B-rotated"] }),
    entry({ n: 3, ts: "t3", key: "k", inHashNoCC: ["conv-A"], outHashNoCC: ["conv-A-rotated"] }),
    entry({ n: 4, ts: "t4", key: "k", inHashNoCC: ["conv-B"], outHashNoCC: ["conv-B-rotated"] }),
  ]);
  assert.equal(rows.length, 4, "every rotated request keeps its own row across both conversations");
  const transitions = rows.filter((r) => r.transition);
  assert.equal(transitions.length, 2, "two distinct conversations, two transitions");
  assert.deepEqual(
    transitions.map((r) => r.n),
    [1, 2],
    "each conversation's transition is its own FIRST rotated request",
  );
});
