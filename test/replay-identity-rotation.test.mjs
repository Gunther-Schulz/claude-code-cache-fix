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

import { test } from "node:test";
import assert from "node:assert/strict";

import { findIdentityRotations, compactEntry } from "../tools/replay.mjs";

// Entries in the compact shape findIdentityRotations consumes. Fixture-level:
// most bites below supply inHashNoCC/outHashNoCC directly rather than routing
// real message bodies through compactEntry, because the function under test
// only ever reads index [0] of those two arrays — this is the same fixture
// discipline absorption-miss.test.mjs uses for findAbsorptionMisses.
//
// `inHash`/`outHash` are set to a dummy non-empty array on purpose: they are
// unrelated to the predicate under test, but asCompact's own gate
// (`e.inHash ? e : compactEntry(e)`) reads them to decide whether an object
// is ALREADY compact — omitting them would silently route every fixture
// through compactEntry({inMsgs: undefined, outMsgs: undefined}) instead,
// discarding the inHashNoCC/outHashNoCC this test constructs.
const entry = ({ n, ts, key = "k", inHashNoCC, outHashNoCC }) => ({
  n,
  ts,
  key,
  inHash: ["dummy"],
  outHash: ["dummy"],
  inHashNoCC,
  outHashNoCC,
});

test("a prepended block 0 in the forwarded messages[0] DOES classify", () => {
  const rows = findIdentityRotations([
    entry({ n: 1, ts: "t1", inHashNoCC: ["raw0"], outHashNoCC: ["fwd0"] }),
  ]);
  assert.equal(rows.length, 1, "raw and forwarded identities differ — a rotation");
  assert.deepEqual(rows[0], { n: 1, ts: "t1", key: "k", rawId: "raw0", fwdId: "fwd0" });
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
