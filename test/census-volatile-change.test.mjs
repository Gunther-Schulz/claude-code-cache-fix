// census volatile-change — the instrument for #272 blocker 2.
//
// What it guards. insertion-normalization pins a matched user message to its
// FIRST-SEEN bytes, and pin-mode identity EXCLUDES volatile blocks — so the
// extension cannot tell CC re-serializing a reminder (pin: correct) from CC
// changing its bytes (stale forward: the model is shown text CC replaced).
// The upstream reviewer reproduced the second. The census sweep exists to
// count how often it happens, and the design of the fix rests on that count,
// so the counter itself has to be shown to work in BOTH directions:
//
//   it must FIRE on the defect     — an in-place OLD->NEW reminder change
//                                    lands as CHANGED / IN-PLACE-TEXT;
//   it must NOT FIRE on the
//   NON-defect                     — a wrapper-only re-serialization of the
//                                    same text lands as RESERIALIZED with
//                                    CHANGED = 0.
//
// The second half is not decoration: a check that fires on a non-defect is
// broken too (dev-loop.md, "a check that fires on a non-defect is also
// broken"), and a counter that scored every reminder flip as a fidelity
// change would have reported a corpus-wide number that argued for the wrong
// design.
//
// Red-first, demonstrated rather than asserted (dev-loop.md, "It must go RED
// on the real defect before it counts"):
//   - against the PRE-change census (git 604748f) this whole file fails at
//     import — `scanVolatileRegions` does not exist there, so the OLD->NEW
//     change could not have been counted at all. Command and output are in
//     docs/code-reviews/blocker2-volatile-change-measurement.md §"red-first".
//   - with `classifyVolatileChange`'s IN-PLACE-TEXT branch collapsed into
//     RESERIALIZED, "in-place OLD->NEW is CHANGED" goes red while the
//     re-serialization cases stay green — the mutation removes the exact
//     condition the bite names, rather than adjacent machinery.

import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

import {
  census,
  classifyVolatileChange,
  scanVolatileRegions,
  volatileRegionOf,
} from "../tools/reminder-migration-census.mjs";

// --- fixtures -------------------------------------------------------------

const SR = (t) => ({ type: "text", text: `<system-reminder>\n${t}\n</system-reminder>` });
const TR = (id) => ({ type: "tool_result", tool_use_id: id, content: "ok" });

/**
 * A conversation whose messages[0] never moves (conversationOf hashes it, so
 * a request that changed it would be a DIFFERENT conversation and never be
 * compared) and whose message 2 carries the volatile blocks under test.
 * The tool_result block is what the pinned identity actually hashes, so it is
 * held fixed: that is what makes the entry MATCH across requests.
 */
const request = (volatileBlocks, { toolId = "t1", ts = "2026-08-01T00:00:00.000Z" } = {}) => ({
  ts,
  sid: "s-testsession",
  body: {
    messages: [
      { role: "user", content: "hello" },
      { role: "assistant", content: [{ type: "text", text: "hi" }] },
      { role: "user", content: [TR(toolId), ...volatileBlocks] },
    ],
  },
});

/** Walk a conversation's requests in order through one shared first-seen map. */
function walk(requests) {
  const seen = new Map();
  return requests.map((r) => scanVolatileRegions(r.body.messages, seen));
}

// --- (a) it FIRES on the defect ------------------------------------------

test("in-place OLD->NEW reminder text is CHANGED / IN-PLACE-TEXT", () => {
  const [first, second] = walk([
    request([SR("OLD reminder text")]),
    request([SR("NEW reminder text")]),
  ]);

  assert.equal(first.counts.matched, 0, "the first request establishes first-seen, it compares nothing");
  assert.equal(second.counts.matched, 1);
  assert.equal(second.counts.changed, 1, "the reviewer's reproduction must be counted");
  assert.equal(second.counts.identical, 0);
  assert.equal(second.counts.reserialized, 0);
  assert.deepEqual(second.rows.map((r) => r.kind), ["IN-PLACE-TEXT"]);

  // the detail row has to locate the instance without carrying its text
  const row = second.rows[0];
  assert.equal(row.index, 2, "message ordinal within the request");
  assert.ok(row.h.startsWith("v:"), "identity is the PIN's, not a re-derived hash");
  assert.ok(row.divOffset > 0, "first divergence offset is reported");
  assert.equal(row.cacheControlExempt, false);
  assert.equal(JSON.stringify(row).includes("reminder text"), false,
    "no reminder text may reach a detail row (corpus hygiene)");
});

// --- (b) it does NOT fire on the non-defect -------------------------------

test("wrapper-only re-serialization is RESERIALIZED, never CHANGED", () => {
  // The wrapper regex tolerates trailing whitespace after the closing tag, so
  // CC re-emitting the same reminder with a trailing newline is a pure
  // re-serialization: different bytes, identical text.
  const trailing = { type: "text", text: `<system-reminder>\nsame text\n</system-reminder>\n` };
  const [, second] = walk([request([SR("same text")]), request([trailing])]);

  assert.equal(second.counts.matched, 1);
  assert.equal(second.counts.reserialized, 1);
  assert.equal(second.counts.changed, 0, "the instrument must not fire on a re-wrap");
  assert.deepEqual(second.rows, []);
});

test("blocks rejoined on the \"\\n\\n\" separator are RESERIALIZED", () => {
  // The join grammar the extension's own move recognition uses: two pinned
  // blocks re-emitted as one block carrying both texts, and the reverse split.
  const merged = walk([request([SR("A"), SR("B")]), request([SR("A\n\nB")])])[1];
  assert.equal(merged.counts.reserialized, 1);
  assert.equal(merged.counts.changed, 0);

  const split = walk([request([SR("A\n\nB")]), request([SR("A"), SR("B")])])[1];
  assert.equal(split.counts.reserialized, 1);
  assert.equal(split.counts.changed, 0);
});

test("an empty volatile block appearing beside a reminder is RESERIALIZED", () => {
  // isVolatileBlock counts "" as volatile (the measured flip alternates a
  // reminder with an empty block), so the bytes differ — but an empty block
  // carries no text, so the information does not.
  const [, second] = walk([
    request([SR("A")]),
    request([SR("A"), { type: "text", text: "" }]),
  ]);
  assert.equal(second.counts.reserialized, 1);
  assert.equal(second.counts.changed, 0);
});

// --- the CHANGED sub-kinds, each by its definition ------------------------

test("CHANGED sub-kinds separate suppressed-addition from replaced-text", () => {
  const kind = (a, b) => walk([request(a), request(b)])[1].rows[0]?.kind ?? null;

  assert.equal(kind([SR("A")], [{ type: "text", text: "" }]), "VANISHED",
    "every reminder gone — the flip the pin exists to absorb");
  assert.equal(kind([{ type: "text", text: "" }], [SR("A")]), "APPEARED",
    "first-seen had none; the pin strips the new one");
  assert.equal(kind([SR("A")], [SR("A"), SR("B")]), "AUGMENTED",
    "first-seen's text survives in order, more added");
  assert.equal(kind([SR("A"), SR("B")], [SR("A")]), "REDUCED",
    "a subset of first-seen survives");
  assert.equal(kind([SR("A")], [SR("Z")]), "IN-PLACE-TEXT",
    "neither superset nor subset — the text was replaced");
});

// --- first-seen, not adjacent --------------------------------------------

test("comparison is against FIRST-SEEN, not the previous occurrence", () => {
  // The pin restores first-seen bytes, so first-seen is the comparison the
  // mechanism performs. An adjacent-only sweep — the known checker-failure
  // shape — would score this OLD -> NEW -> OLD sequence as TWO changes and
  // then report the third request as a change back; against first-seen the
  // third request is IDENTICAL, because that is exactly what the pin serves.
  const [, r2, r3] = walk([
    request([SR("OLD")]),
    request([SR("NEW")]),
    request([SR("OLD")]),
  ]);

  assert.equal(r2.counts.changed, 1, "request 2 differs from first-seen");
  assert.equal(r3.counts.changed, 0, "request 3 is back to first-seen");
  assert.equal(r3.counts.identical, 1);
});

test("a reminder that changes once and then HOLDS is counted every request", () => {
  // The converse of the case above, and the reason first-seen is the right
  // baseline for a stale-forward measurement: the pin keeps serving OLD for
  // as long as the entry matches, so every later request is another request
  // served stale — an adjacent sweep would see one event and then silence.
  const results = walk([
    request([SR("OLD")]),
    request([SR("NEW")]),
    request([SR("NEW")]),
    request([SR("NEW")]),
  ]);
  assert.deepEqual(results.map((r) => r.counts.changed), [0, 1, 1, 1]);
});

// --- identity is the mechanism's -----------------------------------------

test("a non-volatile change breaks the pinned identity, so nothing is compared", () => {
  // Volatile exclusion is what makes the entry match at all. Change the
  // NON-volatile part and the identity moves: the extension resets rather
  // than pinning, so there is no stale forward to count.
  const [, second] = walk([
    request([SR("A")], { toolId: "t1" }),
    request([SR("B")], { toolId: "CHANGED" }),
  ]);
  assert.equal(second.counts.matchedAll, 0, "different identity — not the same entry");
  assert.equal(second.counts.changed, 0);
});

test("a cache_control marker on the incoming message is flagged pin-exempt", () => {
  // pinnedForwardForm never rewrites a message currently carrying a marker,
  // so such a row is a change the LIVE pin would not have overridden. It is
  // still counted — the sweep is deliberately a superset — but flagged.
  const withMarker = request([{ ...SR("NEW"), cache_control: { type: "ephemeral" } }]);
  const [, second] = walk([request([SR("OLD")]), withMarker]);
  assert.equal(second.counts.changed, 1);
  assert.equal(second.rows[0].cacheControlExempt, true);
});

test("the marker itself is never a change — the proxy places it", () => {
  const marked = request([{ ...SR("A"), cache_control: { type: "ephemeral" } }]);
  const [, second] = walk([request([SR("A")]), marked]);
  assert.equal(second.counts.identical, 1, "cache_control is stripped before comparing");
  assert.equal(second.counts.changed, 0);
});

// --- population boundary --------------------------------------------------

test("messages the pin cannot rewrite are outside the population", () => {
  assert.equal(volatileRegionOf({ role: "assistant", content: [SR("A")] }), null);
  assert.equal(volatileRegionOf({ role: "user", content: "a string" }), null);

  // and a user message with no volatile blocks on EITHER side is a
  // re-occurrence the pin passes through: counted in matchedAll, never in
  // the denominator that the change rate is reported against.
  const plain = { ts: "t", sid: "s", body: { messages: [
    { role: "user", content: "hello" },
    { role: "user", content: [TR("t1")] },
  ] } };
  const [, second] = walk([plain, plain]);
  assert.equal(second.counts.matchedAll, 1);
  assert.equal(second.counts.matched, 0);
});

// --- end to end, through the real read path -------------------------------

test("census() reports volatileChange over a capture file", async (t) => {
  const dir = await tmpDir("census-volatile-");
  t.after(() => rm(dir, { recursive: true, force: true }));
  const capture = join(dir, "s-testsession-requests.jsonl");

  await writeFile(capture, [
    JSON.stringify({ ts: "2026-08-01T00:00:00.000Z", type: "meta" }), // no body: skipped
    JSON.stringify(request([SR("OLD reminder")], { ts: "2026-08-01T00:00:01.000Z" })),
    JSON.stringify(request([SR("OLD reminder")], { ts: "2026-08-01T00:00:02.000Z" })),
    JSON.stringify(request([SR("NEW reminder")], { ts: "2026-08-01T00:00:03.000Z" })),
  ].join("\n") + "\n");

  const res = await census([capture]);

  assert.deepEqual(res.unreadable, [], "the capture must be readable — silence is not an answer");
  assert.equal(res.volatileChange.matched, 2);
  assert.equal(res.volatileChange.identical, 1);
  assert.equal(res.volatileChange.reserialized, 0);
  assert.equal(res.volatileChange.changed, 1);
  assert.equal(res.volatileKinds["IN-PLACE-TEXT"], 1);
  assert.deepEqual(res.volatileTruncated, {}, "nothing truncated at this size");

  assert.equal(res.volatileRows.length, 1);
  const row = res.volatileRows[0];
  assert.equal(row.path, capture);
  assert.equal(row.line, 4, "1-based line ordinal, counting the skipped meta line");
  assert.equal(row.req, 3, "third request of this conversation");
  assert.equal(row.sid, "s-testsession");
  assert.equal(row.kind, "IN-PLACE-TEXT");
  assert.equal(JSON.stringify(res.volatileRows).includes("reminder"), false,
    "detail rows carry pointers and lengths, never reminder text");
});

test("census() retains ONE row per distinct entry, carrying its repeat count", async (t) => {
  // An entry that changes once and then holds diverges on every later request.
  // Counts must show all of them (each is another request served stale) while
  // the detail rows must show the ENTRY once — a flat occurrence cap would
  // enumerate the first few entries exhaustively and the rest not at all.
  const dir = await tmpDir("census-volatile-entry-");
  t.after(() => rm(dir, { recursive: true, force: true }));
  const capture = join(dir, "s-hold-requests.jsonl");

  await writeFile(capture, [
    JSON.stringify(request([SR("OLD")], { ts: "2026-08-01T00:00:01.000Z" })),
    JSON.stringify(request([SR("NEW")], { ts: "2026-08-01T00:00:02.000Z" })),
    JSON.stringify(request([SR("NEW")], { ts: "2026-08-01T00:00:03.000Z" })),
    JSON.stringify(request([SR("NEW")], { ts: "2026-08-01T00:00:04.000Z" })),
  ].join("\n") + "\n");

  const res = await census([capture]);
  assert.equal(res.volatileChange.changed, 3, "three requests were served stale");
  assert.equal(res.volatileEntries, 1, "but only one reminder ever changed");
  assert.deepEqual(res.volatileEntriesByKind, { "IN-PLACE-TEXT": 1 });
  assert.equal(res.volatileRows.length, 1);
  assert.equal(res.volatileRows[0].occurrences, 3);
  assert.equal(res.volatileRows[0].line, 2, "row is pinned to the FIRST diverging request");
  assert.equal(res.volatileRows[0].lastLine, 4, "and carries the last one it was seen at");
});

test("classifyVolatileChange is total — every pair lands in exactly one class", () => {
  const region = (blocks) => volatileRegionOf({ role: "user", content: blocks });
  const cases = [
    [[SR("A")], [SR("A")]],
    [[SR("A")], [SR("B")]],
    [[SR("A")], [{ type: "text", text: "" }]],
    [[], [SR("A")]],
    [[SR("A")], []],
    [[SR("A"), SR("B")], [SR("A\n\nB")]],
  ];
  for (const [a, b] of cases) {
    const { verdict, kind } = classifyVolatileChange(region(a), region(b));
    assert.ok(["IDENTICAL", "RESERIALIZED", "CHANGED"].includes(verdict), `verdict for ${JSON.stringify([a, b])}`);
    assert.equal(kind === null, verdict !== "CHANGED", "a kind accompanies CHANGED and only CHANGED");
  }
});
