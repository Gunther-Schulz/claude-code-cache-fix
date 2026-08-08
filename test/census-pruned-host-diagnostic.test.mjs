// census-pruned-host-diagnostic — when the HOST itself was pruned (its
// tool_use_id is absent from `after` entirely), the no-counterpart branch must
// not claim a "position-eligible" candidate, because no position exists.
//
// Grounding, measured 2026-08-07 (BACKLOG "READY — the byte-gate's
// `anyPresent` probe can never return false…", second defect in that row):
// `rejectedCandidate` was added to cure the misleading `actual=0ch` tell, and
// its position filter reads `if (hj !== null && hj >= 0 && s.j <= hj) continue;`.
// With `hj = -1` — the host absent, which is exactly the pruned-host case —
// that guard short-circuits, no filter applies, and the FIRST system message
// in the array is recorded as "the nearest position-eligible standalone that
// classify() rejected". On the measured pair it printed 37,831 chars of an
// unrelated summarization notice as though it were the counterpart considered.
// The earlier misleading-tell fix grew its own misleading tell one case over.
//
// The pair below is SYNTHETIC, and must stay so: this class is detected by
// literal TEXT and `harvest.mjs` replaces text with hash tokens, so a
// harvested pin of the real pair reproduces nothing (dev-loop.md, "The scrub
// destroys CONTENT PREDICATES"). It is also public-tree bound, where
// synthesized is the default anyway.

import { test } from "node:test";
import assert from "node:assert/strict";
import { analysePair } from "../tools/reminder-migration-census.mjs";

const HOST_ID = "t_host_pruned_002";
// Two distinct reminder bodies. B0 RECURS as standalones on both sides (the
// real pair's blocks sat at indices 40 and 87, byte-identical either side);
// B1 exists only inside the host and vanishes with it.
const B0 = "synthetic recurring reminder body zero, deterministic, not capture bytes";
const B1 = "synthetic vanishing reminder body one, deterministic, not capture bytes";
const wrap = (t) => `<system-reminder>\n${t}\n</system-reminder>`;

const standalone = (t) => ({ role: "system", content: wrap(t) });
const filler = (n) => ({ role: "user", content: [{ type: "text", text: `filler ${n}` }] });
// The message the defect reports: a long system message at index 0, nowhere
// near the host and never considered against it. Stands in for the 37,831-char
// summarization notice of the measured pair.
const unrelated = { role: "system", content: "UNRELATED SUMMARIZATION NOTICE ".repeat(40) };

/** before: B0 standalones at two LOW indices, then the 2-block host mid-array. */
const before = () => ({ body: { messages: [
  unrelated,
  standalone(B0),
  filler(1),
  standalone(B0),
  filler(2),
  { role: "user", content: [
    { type: "tool_result", tool_use_id: HOST_ID },
    { type: "text", text: wrap(B0) },
    { type: "text", text: wrap(B1) },
  ] },
  filler(3),
] } });

/** after: the host is PRUNED — its tool_use_id is absent from the body
 *  entirely — while both B0 standalones survive byte-identical and B1 is gone
 *  from the body completely. Nothing migrated. */
const after = () => ({ body: { messages: [
  unrelated,
  standalone(B0),
  filler(1),
  standalone(B0),
  filler(2),
  filler(3),
] } });

test("the pair is the pruned-host shape it claims to be", () => {
  // The preconditions the defect needs, asserted rather than assumed — a
  // fixture that quietly stopped reproducing the shape would leave the bite
  // below passing for the wrong reason.
  const wa = JSON.stringify(after().body.messages);
  assert.ok(!wa.includes(HOST_ID), "the host's tool_use_id must be absent from `after` (pruned)");
  assert.ok(!wa.includes(B1), "B1 must be absent from `after` entirely");
  const sysB0After = after().body.messages
    .filter((m) => m.role === "system" && String(m.content).includes(B0)).length;
  const sysB0Before = before().body.messages
    .filter((m) => m.role === "system" && String(m.content).includes(B0)).length;
  assert.equal(sysB0Before, 2, "B0 recurs as two standalones in `before`");
  assert.equal(sysB0After, 2, "…and the same two survive in `after`, byte-identical");
});

test("RED-FIRST — a pruned host reports NO rejected candidate, never the first system message in the array", () => {
  const findings = analysePair(before(), after());
  assert.equal(findings.length, 1, "one host, one finding");
  const f = findings[0];

  // Precondition: this row really is the no-counterpart branch (that is the
  // only branch carrying `rejectedCandidate`), reached with the host absent.
  assert.equal(f.host, 5, "the finding is about the mid-array host");
  assert.equal(f.blocks, 2);
  assert.equal(f.text.length, 0, "no counterpart matched — the branch under test");

  // The bite. Against the pre-fix code this reads
  // `{ j: 0, chars: 1240 }` — the unrelated notice at index 0, which no
  // position filter ever excluded because there was no position to filter by.
  assert.equal(f.rejectedCandidate, null,
    "with the host absent there is no position-eligible standalone, so the field must be null");
});
