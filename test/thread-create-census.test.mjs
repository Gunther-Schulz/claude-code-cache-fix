import { test } from "node:test";
import assert from "node:assert/strict";

import { firstDivergence, matchDeltas, messageMarkers, normShape } from "../tools/thread-create-census.mjs";

const cc = { cache_control: { type: "ephemeral", ttl: "1h" } };

// The shape measured on 2026-09-25 under every consecutive create pair: the
// previous create's tail carried the marker as a one-block array, the next
// create renders the same text as a bare string with no marker.
const tailMarked = { role: "system", content: [{ type: "text", text: "<total_tokens>1</total_tokens>", ...cc }] };
const tailBare = { role: "system", content: "<total_tokens>1</total_tokens>" };
const u0 = { role: "user", content: "hi" };
const a1 = { role: "assistant", content: [{ type: "text", text: "ok" }] };

test("the tail flip diverges raw and noMarker, but not under norm", () => {
  const prev = [u0, a1, tailMarked];
  const cur = [u0, a1, tailBare, { role: "user", content: "next" }];
  assert.equal(firstDivergence(prev, cur, "raw"), 2);
  assert.equal(firstDivergence(prev, cur, "noMarker"), 2);
  assert.equal(firstDivergence(prev, cur, "norm"), -1);
});

test("a real text change is a divergence under every view", () => {
  const prev = [u0, a1, tailMarked];
  const cur = [u0, a1, { role: "system", content: "<total_tokens>2</total_tokens>" }];
  for (const v of ["raw", "noMarker", "norm"]) assert.equal(firstDivergence(prev, cur, v), 2, v);
});

test("normShape leaves a multi-block or non-text array alone", () => {
  const two = { role: "user", content: [{ type: "text", text: "a" }, { type: "text", text: "b" }] };
  assert.deepEqual(normShape(two), two);
  const tr = { role: "user", content: [{ type: "tool_result", tool_use_id: "x", content: "r" }] };
  assert.deepEqual(normShape(tr), tr);
});

test("matchDeltas skips server-generated assistant turns and finds a changed delta message", () => {
  const create = [u0, a1, tailBare, a1, { role: "user", content: "changed" }];
  const deltas = [
    { messages: [tailMarked] },
    { messages: [{ role: "user", content: "original" }] },
  ];
  const r = matchDeltas(deltas, create, 2);
  assert.equal(r.norm, 4);
  assert.equal(r.raw, 2);
  assert.equal(r.unmatched, 0);
  const same = matchDeltas([{ messages: [tailMarked] }], create, 2);
  assert.equal(same.norm, -1);
});

test("messageMarkers finds block-level markers per message", () => {
  assert.deepEqual(messageMarkers([u0, tailMarked, a1]), [1]);
});
