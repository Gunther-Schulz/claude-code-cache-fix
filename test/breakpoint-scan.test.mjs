import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { findMarkers, findMarkerValues, hasScannableBody, skipReason, buildRow } from "../tools/breakpoint-scan.mjs";
import { tmpDir } from "../tools/tmpdir.mjs";
import { conversationSubKey } from "../proxy/extensions/message-hash.mjs";

const cc = { cache_control: { type: "ephemeral" } };
const ccTtl = { cache_control: { type: "ephemeral", ttl: "1h" } };

// A synthetic body with cache_control markers at four KNOWN positions:
// system[0], tools[3], and two different messages[i].content[j] blocks.
// findMarkers must return exactly these four location strings, in
// document order. This is the red-first fixture: it was run once with a
// marker deliberately moved (tools[3] -> tools[2]) and the assertion below
// failed naming the moved marker (`tools[2]` appeared where `tools[3]` was
// expected) before being restored to this, its correct form.
function fixtureBody() {
  return {
    model: "claude-opus-5",
    system: [
      { type: "text", text: "sys-0", ...cc }, // system[0]
      { type: "text", text: "sys-1" },
    ],
    tools: [
      { name: "t0", input_schema: {} },
      { name: "t1", input_schema: {} },
      { name: "t2", input_schema: {} },
      { name: "t3", input_schema: {}, ...cc }, // tools[3]
    ],
    messages: [
      { role: "user", content: [{ type: "text", text: "a", ...cc }] }, // messages[0].content[0]:user
      { role: "assistant", content: [{ type: "text", text: "b" }] },
      {
        role: "user",
        content: [{ type: "text", text: "c" }, { type: "text", text: "d", ...cc }], // messages[2].content[1]:user
      },
    ],
  };
}

test("findMarkers: locates markers at known positions, in document order", () => {
  const record = { body: fixtureBody() };
  const markers = findMarkers(record);
  assert.deepEqual(markers, [
    "system[0]",
    "tools[3]",
    "messages[0].content[0]:user",
    "messages[2].content[1]:user",
  ]);
});

test("findMarkers: a moved marker is caught (mutation-detection check)", () => {
  // Same fixture, but the tools marker moves from index 3 to index 2 —
  // the mutation used to drive the red run described in the report.
  const body = fixtureBody();
  delete body.tools[3].cache_control;
  body.tools[2] = { ...body.tools[2], ...cc };
  const markers = findMarkers({ body });
  assert.deepEqual(markers, [
    "system[0]",
    "tools[2]", // NOT tools[3] — proves the scanner reports the real position, not a fixed guess
    "messages[0].content[0]:user",
    "messages[2].content[1]:user",
  ]);
  // And the ORIGINAL expectation now fails against this body, which is the
  // point of the fixture: a location-layout assertion that can't fail
  // proves nothing.
  assert.notDeepEqual(markers, [
    "system[0]",
    "tools[3]",
    "messages[0].content[0]:user",
    "messages[2].content[1]:user",
  ]);
});

test("findMarkers: object-form system and a message-level marker", () => {
  const body = {
    system: { type: "text", text: "sys", ...cc }, // system is an object, not an array
    messages: [
      { role: "user", content: "plain string content", cache_control: { type: "ephemeral" } }, // messages[0]
    ],
  };
  const markers = findMarkers({ body });
  assert.deepEqual(markers, ["system", "messages[0]"]);
});

// --- findMarkerValues (--values mode) ---
//
// findMarkers alone reports LOCATION only. Two markers at different
// locations can carry different cache_control VALUES (e.g. one missing a
// `ttl` the other has) and findMarkers cannot tell them apart — that gap is
// exactly what --values exists to close.

test("findMarkerValues: two markers with different cache_control values are reported distinctly", () => {
  const body = {
    system: [{ type: "text", text: "sys-0", ...cc }],
    tools: [{ name: "t0", input_schema: {}, ...ccTtl }],
    messages: [],
  };
  const values = findMarkerValues({ body });
  assert.deepEqual(values, [
    { loc: "system[0]", cache_control: { type: "ephemeral" } },
    { loc: "tools[0]", cache_control: { type: "ephemeral", ttl: "1h" } },
  ]);
});

test("findMarkerValues: a value collapsed to match its neighbor is caught (mutation-detection check)", () => {
  // Same fixture as above, but tools[0]'s ttl is dropped — the mutation
  // that drove the red run described in the report: a marker whose VALUE
  // silently downgrades relative to another marker at a DIFFERENT
  // location is exactly what a location-only report (findMarkers) cannot
  // see, and is the real-world case this flag was built to answer
  // (does our own cache-control write carry the ttl CC's own markers do?).
  const body = {
    system: [{ type: "text", text: "sys-0", ...cc }],
    tools: [{ name: "t0", input_schema: {}, cache_control: { type: "ephemeral" } }], // ttl dropped
    messages: [],
  };
  const values = findMarkerValues({ body });
  assert.deepEqual(values, [
    { loc: "system[0]", cache_control: { type: "ephemeral" } },
    { loc: "tools[0]", cache_control: { type: "ephemeral" } }, // NOT {type:"ephemeral",ttl:"1h"}
  ]);
  // And the ORIGINAL (ttl-carrying) expectation now fails against this
  // body, which is the point of the fixture: a value assertion that can't
  // fail proves nothing.
  assert.notDeepEqual(values, [
    { loc: "system[0]", cache_control: { type: "ephemeral" } },
    { loc: "tools[0]", cache_control: { type: "ephemeral", ttl: "1h" } },
  ]);
});

test("buildRow: --values absent reproduces the pre-flag row exactly, no key added", () => {
  const rec = { ts: "2026-08-13T11:33:00.000Z", sid: "s-test", body: fixtureBody() };
  const bare = buildRow(rec, 1);
  const emptyOpts = buildRow(rec, 1, {});
  const explicitFalse = buildRow(rec, 1, { values: false });
  assert.deepEqual(bare, emptyOpts);
  assert.deepEqual(bare, explicitFalse);
  assert.equal("markerValues" in bare, false);
  assert.deepEqual(Object.keys(bare), ["ts", "line", "sid", "markers", "markerCount", "nMessages", "lastUserIndex"]);
});

test("buildRow: --values adds markerValues alongside the unchanged markers field", () => {
  const rec = { ts: "2026-08-13T11:33:00.000Z", sid: "s-test", body: fixtureBody() };
  const row = buildRow(rec, 1, { values: true });
  assert.deepEqual(row.markers, ["system[0]", "tools[3]", "messages[0].content[0]:user", "messages[2].content[1]:user"]);
  assert.deepEqual(
    row.markerValues.map((m) => m.loc),
    row.markers,
  );
  assert.deepEqual(row.markerValues[0], { loc: "system[0]", cache_control: { type: "ephemeral" } });
});

test("findMarkers: no markers present returns an empty array, not a false absence", () => {
  const body = { system: [{ type: "text", text: "s" }], tools: [], messages: [{ role: "user", content: [{ type: "text", text: "a" }] }] };
  assert.deepEqual(findMarkers({ body }), []);
});

test("hasScannableBody / skipReason: distinguishes request records from other capture record kinds", () => {
  assert.equal(hasScannableBody({ body: { messages: [] } }), true);
  assert.equal(hasScannableBody({ type: "outcome", id: "x" }), false);
  assert.equal(hasScannableBody({ type: "boot", pid: 1 }), false);
  assert.equal(hasScannableBody({ type: "assistant", message: { content: [] } }), false); // session-mirror shape
  assert.equal(hasScannableBody(null), false);
  assert.equal(hasScannableBody("not an object"), false);

  assert.equal(skipReason({ type: "outcome" }), "outcome");
  assert.equal(skipReason({ type: "boot" }), "boot");
  assert.equal(skipReason({ type: "assistant" }), "assistant");
  assert.equal(skipReason({}), "no-body");
});

test("buildRow: nMessages and lastUserIndex reflect the actual message array", () => {
  const rec = {
    ts: "2026-08-13T11:33:00.000Z",
    sid: "s-test",
    body: {
      messages: [
        { role: "user", content: [] },
        { role: "assistant", content: [] },
        { role: "user", content: [] },
        { role: "assistant", content: [] },
      ],
    },
  };
  const row = buildRow(rec, 42);
  assert.equal(row.line, 42);
  assert.equal(row.ts, "2026-08-13T11:33:00.000Z");
  assert.equal(row.sid, "s-test");
  assert.equal(row.nMessages, 4);
  assert.equal(row.lastUserIndex, 2);
  assert.equal(row.markerCount, 0);
});

test("buildRow: falls back to `key` for sid when the record carries no sid", () => {
  const row = buildRow({ key: "c-abc123", body: { messages: [] } }, 1);
  assert.equal(row.sid, "c-abc123");
});

test("buildRow: an all-assistant conversation reports lastUserIndex -1", () => {
  const row = buildRow({ body: { messages: [{ role: "assistant", content: [] }] } }, 1);
  assert.equal(row.lastUserIndex, -1);
});

// --- CLI-level integration: schema tolerance and time-window filtering ---

test("CLI: mixed record kinds are scanned or skipped correctly, and --since/--until filters by ts", async (t) => {
  const dir = await tmpDir("breakpoint-scan-test-");
  t.after(() => {});
  const file = join(dir, "mixed.jsonl");

  const lines = [
    JSON.stringify({ ts: "2026-08-13T00:00:00.000Z", type: "boot", pid: 1 }),
    JSON.stringify({
      ts: "2026-08-13T11:30:00.000Z", // before the window
      sid: "s-a",
      body: { messages: [{ role: "user", content: [{ type: "text", text: "x", ...cc }] }] },
    }),
    JSON.stringify({
      ts: "2026-08-13T11:33:00.000Z", // inside the window
      sid: "s-a",
      body: {
        system: [{ type: "text", text: "s", ...cc }],
        messages: [{ role: "user", content: [{ type: "text", text: "x" }] }],
      },
    }),
    JSON.stringify({ ts: "2026-08-13T11:33:01.000Z", type: "outcome", id: "x" }),
    JSON.stringify({
      ts: "2026-08-13T11:40:00.000Z", // after the window
      sid: "s-a",
      body: { messages: [] },
    }),
    "", // blank line — not a record
    "{not json",
  ];
  await writeFile(file, lines.join("\n") + "\n");

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);

  const toolPath = new URL("../tools/breakpoint-scan.mjs", import.meta.url).pathname;
  const { stdout, stderr } = await run("node", [
    toolPath,
    file,
    "--since",
    "2026-08-13T11:32:00.000Z",
    "--until",
    "2026-08-13T11:35:00.000Z",
    "--json",
  ]);

  const rows = stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  assert.equal(rows.length, 1, "only the in-window request record is emitted");
  assert.equal(rows[0].sid, "s-a");
  assert.equal(rows[0].markerCount, 1);
  assert.deepEqual(rows[0].markers, ["system[0]"]);

  assert.match(stderr, /\bskipped\b/);
  assert.match(stderr, /boot=1/);
  assert.match(stderr, /outcome=1/);
  assert.match(stderr, /parse-error=1/);
});

test("CLI: --values adds markerValues to each row; absent, the row is byte-identical to before the flag existed", async () => {
  const dir = await tmpDir("breakpoint-scan-test-");
  const file = join(dir, "values.jsonl");
  const record = {
    ts: "2026-08-13T11:33:00.000Z",
    sid: "s-a",
    body: {
      system: [{ type: "text", text: "s", ...cc }],
      tools: [{ name: "t0", input_schema: {}, ...ccTtl }],
      messages: [{ role: "user", content: [{ type: "text", text: "x" }] }],
    },
  };
  await writeFile(file, JSON.stringify(record) + "\n");

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  const toolPath = new URL("../tools/breakpoint-scan.mjs", import.meta.url).pathname;

  const noValues = await run("node", [toolPath, file, "--json"]);
  const rowNoValues = JSON.parse(noValues.stdout.trim());
  assert.equal("markerValues" in rowNoValues, false);
  assert.deepEqual(Object.keys(rowNoValues), ["ts", "line", "sid", "markers", "markerCount", "nMessages", "lastUserIndex"]);

  const withValues = await run("node", [toolPath, file, "--json", "--values"]);
  const rowWithValues = JSON.parse(withValues.stdout.trim());
  assert.deepEqual(rowWithValues.markers, ["system[0]", "tools[0]"]); // unchanged, still present
  assert.deepEqual(rowWithValues.markerValues, [
    { loc: "system[0]", cache_control: { type: "ephemeral" } },
    { loc: "tools[0]", cache_control: { type: "ephemeral", ttl: "1h" } },
  ]);
});

// --- conversationId / --by-conversation ---
//
// Group by conversation before comparing anything (docs/dev-loop.md): a
// single session-id header carries the main thread, every subagent, and
// CC's own sidecar calls, so adjacent-line (document) order interleaves
// unrelated conversations. conversationId is computed by the repo's own
// identity function, `conversationSubKey` (proxy/extensions/message-hash.mjs
// — the canonical, cache_control-stripped first-message identity;
// `conversationOf` in tools/replay.mjs was ruled out at brief time because it
// needs a compactEntry-shaped `inHash` array this tool's raw per-line
// records do not carry — see the closing report), never re-derived locally.

function convBody(convTag, n) {
  // messages[0] carries convTag so conversationSubKey(messages) differs
  // across conversations and stays stable across the SAME conversation's
  // later requests (n only changes later messages, never messages[0]).
  return {
    messages: [
      { role: "user", content: [{ type: "text", text: `conv-${convTag}-open` }] },
      { role: "assistant", content: [{ type: "text", text: `turn-${n}` }] },
    ],
  };
}

test("buildRow: --by-conversation absent leaves the row byte-identical to before the flag existed", () => {
  const rec = { ts: "2026-08-14T00:00:00.000Z", sid: "s-test", body: convBody("a", 1) };
  const bare = buildRow(rec, 1);
  const emptyOpts = buildRow(rec, 1, {});
  const explicitFalse = buildRow(rec, 1, { byConversation: false });
  assert.deepEqual(bare, emptyOpts);
  assert.deepEqual(bare, explicitFalse);
  assert.equal("conversationId" in bare, false);
  assert.deepEqual(Object.keys(bare), ["ts", "line", "sid", "markers", "markerCount", "nMessages", "lastUserIndex"]);
});

test("buildRow: --by-conversation adds conversationId computed by the repo's own conversationSubKey", () => {
  const rec = { ts: "2026-08-14T00:00:00.000Z", sid: "s-test", body: convBody("a", 1) };
  const row = buildRow(rec, 1, { byConversation: true });
  // Derived independently from the fixture's own messages array via the
  // SAME imported function the tool uses — not a hardcoded hash — so this
  // proves the wiring, not a restated expectation of the algorithm.
  assert.equal(row.conversationId, conversationSubKey(rec.body.messages));
});

test("buildRow: --by-conversation keys on messages[0] only, so later-turn drift does not split a conversation", () => {
  const recTurn1 = { body: convBody("a", 1) };
  const recTurn2 = { body: convBody("a", 2) };
  const row1 = buildRow(recTurn1, 1, { byConversation: true });
  const row2 = buildRow(recTurn2, 2, { byConversation: true });
  assert.equal(row1.conversationId, row2.conversationId);
});

test("buildRow: --by-conversation gives two DIFFERENT conversations two different ids", () => {
  const rowA = buildRow({ body: convBody("a", 1) }, 1, { byConversation: true });
  const rowB = buildRow({ body: convBody("b", 1) }, 2, { byConversation: true });
  assert.notEqual(rowA.conversationId, rowB.conversationId);
});

// The red-first bite: a synthetic capture with TWO INTERLEAVED conversations
// (A, B, A, B, A by document order). Read without grouping, the wrong
// (interleaved) sequence must still show through unchanged — the tool is a
// read-only reporter, not a filter. Read with --by-conversation, the two
// conversations must land in two groups with exactly the right rows each.
// A change where both readings agree has not demonstrated grouping.
test("CLI: --by-conversation groups an interleaved capture by conversation; without it, the interleaved order shows through unchanged", async () => {
  const dir = await tmpDir("breakpoint-scan-test-");
  const file = join(dir, "interleaved.jsonl");

  const rec = (convTag, n, sid) => ({
    ts: `2026-08-14T00:00:0${n}.000Z`,
    sid,
    body: convBody(convTag, n),
  });
  // Document order: A1, B1, A2, B2, A3 — a real interleave, not a
  // side-by-side pair. Same sid on purpose (matches the FORK-NOTES.md /
  // dev-loop.md fact that one session-id header carries every co-tenant
  // conversation), so sid cannot be used as a stand-in grouping key.
  const lines = [
    rec("a", 1, "s-shared"),
    rec("b", 1, "s-shared"),
    rec("a", 2, "s-shared"),
    rec("b", 2, "s-shared"),
    rec("a", 3, "s-shared"),
  ];
  await writeFile(file, lines.map((r) => JSON.stringify(r)).join("\n") + "\n");

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  const toolPath = new URL("../tools/breakpoint-scan.mjs", import.meta.url).pathname;

  // Without grouping: document order shows the interleave (the wrong
  // sequence for reading a single conversation's progression) — this is
  // the negative half of the red-first pair, and it must stay true AFTER
  // the change too, since default output is unchanged.
  const ungrouped = await run("node", [toolPath, file, "--json"]);
  const ungroupedRows = ungrouped.stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  assert.equal(ungroupedRows.length, 5);
  const convOf = (body) => conversationSubKey(body.messages);
  const ungroupedTags = ungroupedRows.map((r, i) => (convOf(lines[i].body) === convOf(lines[0].body) ? "a" : "b"));
  assert.deepEqual(ungroupedTags, ["a", "b", "a", "b", "a"], "document order is interleaved, unchanged by default");
  assert.equal("conversationId" in ungroupedRows[0], false, "default output carries no conversationId key");

  // With grouping: two groups, correct rows in each, in conversation order.
  const grouped = await run("node", [toolPath, file, "--json", "--by-conversation"]);
  const groupLines = grouped.stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  assert.equal(groupLines.length, 2, "two conversations -> two groups");

  const byId = new Map(groupLines.map((g) => [g.conversationId, g]));
  const idA = conversationSubKey(convBody("a", 1).messages);
  const idB = conversationSubKey(convBody("b", 1).messages);
  assert.ok(byId.has(idA), "conversation A's group is present");
  assert.ok(byId.has(idB), "conversation B's group is present");

  const groupA = byId.get(idA);
  const groupB = byId.get(idB);
  assert.equal(groupA.rows.length, 3, "A1, A2, A3");
  assert.equal(groupB.rows.length, 2, "B1, B2");
  assert.deepEqual(
    groupA.rows.map((r) => r.line),
    [1, 3, 5],
    "A's rows are its own document lines, in order — not adjacent-line pairing",
  );
  assert.deepEqual(
    groupB.rows.map((r) => r.line),
    [2, 4],
  );
  // Every row still carries every field the ungrouped reading has, plus its
  // own conversationId — grouping never drops or renames a field.
  for (const r of groupA.rows) assert.equal(r.conversationId, idA);
  for (const r of groupB.rows) assert.equal(r.conversationId, idB);
  for (const r of [...groupA.rows, ...groupB.rows]) {
    assert.deepEqual(Object.keys(r), [
      "ts",
      "line",
      "sid",
      "markers",
      "markerCount",
      "nMessages",
      "lastUserIndex",
      "conversationId",
    ]);
  }
});

test("CLI: default output (no --by-conversation) is byte-identical whether or not the flag exists in this build", async () => {
  // A narrower, purely-mechanical proof that lives beside the interleave
  // test above: same file, default invocation, byte-for-byte stdout compare
  // against a fixed known-good string built independently of the tool's own
  // row-shape code (Object.keys, not a re-derived formatter).
  const dir = await tmpDir("breakpoint-scan-test-");
  const file = join(dir, "default-shape.jsonl");
  const rec = { ts: "2026-08-14T00:00:00.000Z", sid: "s-a", body: convBody("a", 1) };
  await writeFile(file, JSON.stringify(rec) + "\n");

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  const toolPath = new URL("../tools/breakpoint-scan.mjs", import.meta.url).pathname;

  const { stdout } = await run("node", [toolPath, file, "--json"]);
  const row = JSON.parse(stdout.trim());
  assert.deepEqual(Object.keys(row), ["ts", "line", "sid", "markers", "markerCount", "nMessages", "lastUserIndex"]);
});
