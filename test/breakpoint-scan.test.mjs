import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { findMarkers, hasScannableBody, skipReason, buildRow } from "../tools/breakpoint-scan.mjs";
import { tmpDir } from "../tools/tmpdir.mjs";

const cc = { cache_control: { type: "ephemeral" } };

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
