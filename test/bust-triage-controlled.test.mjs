// bust-triage must see every event the statusline shows.
//
// Definition, taken from the statusline rather than from this tool: the ❄
// token advances on TWO paths in `claude-worktime` — `cold_hit`, written as
// k:"hit", and `cold_cost`, written as k:"cost" (plus legacy k:"resume"
// records, which its own `--cold --all` filter still lists). So the
// ❄-visible population is {hit, cost, resume}, and anything in it that
// `--list` cannot show is a blind spot by construction.
//
// The incident, 2026-07-31 ~13:53Z: the statusline showed `❄ 55k compact (8m)`
// (ledger k:"cost", t=1785505434) while `--list` showed nothing newer than
// 12:25 and the default run triaged an older, unrelated event without saying
// so. A controlled cost is not triageable — that is an ANSWER, and the
// three-answer rule is that it must be stated, never expressed as silence.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { coldEvents, busts, listRows, listHeader, causeToRow, fallbackNote } from "../tools/bust-triage.mjs";

function ledger(records) {
  const d = tmpDirSync("bt-controlled-");
  const p = join(d, "activity.jsonl");
  writeFileSync(p, records.map((r) => JSON.stringify(r)).join("\n") + "\n");
  return p;
}

const HIT = { type: "cold", k: "hit", t: 1000, s: "S1", cc: 40000, cause: "messages_changed" };
const COST = { type: "cold", k: "cost", t: 2000, s: "S2", cc: 55000, cause: "compact" };
const RESUME = { type: "cold", k: "resume", t: 1500, s: "S3", cc: 51000,
                 cause: "previous_message_not_found" };

test("a controlled cost event is in the ledger read, classified apart from busts", () => {
  const events = coldEvents(ledger([HIT, RESUME, COST]));
  assert.deepEqual(events.map((e) => e.t), [2000, 1500, 1000], "newest first");
  assert.deepEqual(events.map((e) => e.cls), ["controlled", "controlled", "bust"]);
});

test("busts() still means busts — the triageable population is unchanged", () => {
  const b = busts(ledger([HIT, RESUME, COST]));
  assert.equal(b.length, 1);
  assert.equal(b[0].t, 1000);
});

test("BITE — a ❄-visible controlled event can never be absent from --list", () => {
  const rows = listRows(coldEvents(ledger([HIT, COST])));
  assert.equal(rows.length, 2, "both events listed");
  assert.ok(rows[0].includes("CONTROLLED(compact)"), `controlled label missing: ${rows[0]}`);
  assert.ok(rows[1].includes("messages_changed"), "the bust keeps its bare cause");
  assert.ok(!rows[1].includes("CONTROLLED"), "a bust must not be labelled controlled");
});

test("legacy k:\"resume\" records are listed too — the statusline counts them", () => {
  const rows = listRows(coldEvents(ledger([RESUME])));
  assert.equal(rows.length, 1);
  assert.ok(rows[0].includes("CONTROLLED(previous_message_not_found)"));
});

test("BITE — when the newest event is controlled, the default run says so", () => {
  const note = fallbackNote(coldEvents(ledger([HIT, COST])));
  assert.ok(note.length, "silence is not an answer");
  const text = note.join("\n");
  assert.match(text, /Cannot triage/i, "the non-verdict must be stated as one");
  assert.match(text, /CONTROLLED\(compact\)/);
  assert.match(text, /Falling back/i, "and it must name what it triaged instead");
});

test("no note when the newest event IS a bust — the tool is not chatty", () => {
  // A note on every run is a note nobody reads; it fires only on substitution.
  const newerHit = { ...HIT, t: 3000 };
  assert.deepEqual(fallbackNote(coldEvents(ledger([newerHit, COST]))), []);
});

test("a controlled ledger with no busts at all still reports the event", () => {
  const events = coldEvents(ledger([COST]));
  assert.equal(events.length, 1);
  const text = fallbackNote(events).join("\n");
  assert.match(text, /No bust in the ledger to fall back to/i);
});

test("retraction and cause-upgrade markers are not themselves events", () => {
  // hit-retract / hit-cause are bookkeeping, never ❄ tokens of their own.
  const events = coldEvents(ledger([
    HIT,
    { type: "cold", k: "hit-cause", hit_t: 1000, s: "S1", cause: "tools_changed" },
    { type: "cold", k: "hit", t: 1200, s: "S1", cc: 9000, cause: "idle" },
    { type: "cold", k: "hit-retract", hit_t: 1200, s: "S1" },
    { type: "cold", k: "gauge", t: 1300, s: "S1", met: 0 },
    { type: "cold", k: "warn", t: 1400, s: "S1", gap: 90 },
  ]));
  assert.equal(events.length, 1, "one surviving event");
  assert.equal(events[0].cause, "tools_changed", "the late-bound cause wins");
});

// --- the list states its own form ---
//
// `--list` is NEWEST FIRST and truncated. An output that does not say so is
// misread by slicing: a `tail` of it returns the OLDEST rows of the slice
// while reading as "the latest events", which is how a whole-period absence
// claim ("none today") got built from a list whose today-rows sat at the top
// and delivered to the operator (2026-08-02). A reader cannot check an
// ordering the instrument never states, so the instrument states it.
test("BITE — --list names its ordering and its truncation", () => {
  const events = coldEvents(ledger([HIT, COST, RESUME]));
  const full = listHeader(events, events.length);
  assert.match(full, /NEWEST FIRST/, `ordering unstated: ${full}`);
  assert.match(full, /showing 3 of 3/, `counts unstated: ${full}`);
  // Truncation is the half a reader cannot see from the rows themselves.
  const cut = listHeader(events, 1);
  assert.match(cut, /showing 1 of 3/, `truncation hidden: ${cut}`);
});

// --- the pair carries the ordinals `harvest --pin` actually takes ---
//
// bust-triage reports `n=591->595`, which is a MESSAGE COUNT. `harvest --pin
// <key> n..m` takes file-wide REQUEST ORDINALS (harvest.mjs pinRange). Pinning
// the reported numbers froze an unrelated range 90 minutes away and produced a
// fixture of the wrong thing, caught only because a second reader cross-checked
// it (2026-08-02). Two different numbers with no way to tell them apart is the
// instrument's problem, not the reader's, so the pair carries the ordinals and
// the run prints a copy-pasteable pin command.
//
// The counting rule is HARVEST'S, not a re-derivation: non-boot/non-outcome
// records only, zero-based (harvest.mjs pinRange `const idx = count++`). A
// second definition here would be a second truth about what an ordinal is.
test("BITE — capturePair reports harvest's own request ordinals", async () => {
  const { writeFileSync } = await import("node:fs");
  const dir = tmpDirSync("bt-ord-");
  const key = "s-ord0001";
  const f = join(dir, `${key}-requests.jsonl`);
  const msg = (t) => ({ role: "user", content: [{ type: "text", text: t }] });
  const req = (ts, n) => JSON.stringify({ ts, id: ts, body: { messages: Array.from({ length: n }, (_, i) => msg("m" + i)) } });
  writeFileSync(f, [
    JSON.stringify({ type: "boot", ts: "2026-08-02T00:00:00.000Z" }),   // not an ordinal
    req("2026-08-02T00:00:01.000Z", 2),                                  // ordinal 0
    JSON.stringify({ type: "outcome", ts: "2026-08-02T00:00:02.000Z", id: "x" }), // not an ordinal
    req("2026-08-02T00:00:03.000Z", 3),                                  // ordinal 1
  ].join("\n") + "\n");

  const { capturePair } = await import("../tools/bust-triage.mjs");
  const pair = await capturePair("ord0001", Date.parse("2026-08-02T00:00:04.000Z") / 1000, dir);
  assert.ok(pair, "pair found");
  assert.equal(pair.before.ord, 0, "boot and outcome records do not consume ordinals");
  assert.equal(pair.after.ord, 1, "the second request is ordinal 1, not 3");
});

// --- the verdict must use the transcript cause the tool already read ---
//
// A tools-driven bust leaves the MESSAGE array legitimately append-only, so
// the census — which classifies messages — maps it to no row BY CONSTRUCTION.
// Live 2026-08-02: the run printed `transcript tools_changed / 484972` and
// then `UNCLASSIFIED: census class "append-only" maps to no row`. Both true;
// the verdict still wrong, with the answer one line above it. UNCLASSIFIED is
// this tool's payload and must stay reachable — but only when NEITHER axis
// maps, otherwise a real class hides behind the word for a new one.
//
// The tools delta is discriminated rather than lumped: a description-only
// edit (name + input_schema byte-identical) is row 23 and absorbable; any
// schema/set/order change is row 6. That distinction took three hand probes
// on the live capture, which is exactly what belongs in the tool.
const toolsBody = (desc, schema = { type: "object", properties: {} }) => ({
  messages: [{ role: "user", content: [{ type: "text", text: "u" }] }],
  tools: [{ name: "Bash", description: desc, input_schema: schema }],
});

test("BITE — a description-only tools delta names row 23, not UNCLASSIFIED", () => {
  const pair = {
    before: { ts: "2026-08-02T15:53:08.789Z", body: toolsBody("old text") },
    after: { ts: "2026-08-02T15:53:26.105Z", body: toolsBody("old text plus a line") },
  };
  assert.equal(causeToRow("tools_changed", pair), 23, "same schema, changed prose -> the description-only row");
});

test("BITE — a schema change on the same tool is row 6, not row 23", () => {
  const pair = {
    before: { ts: "a", body: toolsBody("d", { type: "object", properties: {} }) },
    after: { ts: "b", body: toolsBody("d", { type: "object", properties: { x: { type: "string" } } }) },
  };
  assert.equal(causeToRow("tools_changed", pair), 6, "a real schema change is not absorbable as prose");
});

test("a cause with no row mapping still yields no row — UNCLASSIFIED stays reachable", () => {
  assert.equal(causeToRow("other", null), null);
  assert.equal(causeToRow(null, null), null);
});
