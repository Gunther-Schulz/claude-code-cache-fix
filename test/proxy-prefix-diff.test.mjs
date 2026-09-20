import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, rm, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import ext, {
  snapshotPrefix,
  buildSnapshot,
  computeDiff,
  computeSessionKey,
  resolveSessionKey,
  tenantId,
  truncatePrefixMessages,
  truncateTailMessages,
  buildMarkerSnapshot,
  buildSystemSnapshot,
  buildToolsSnapshot,
  buildMessageHashes,
  messageTextPreview,
  diffSystemBlocks,
  diffTools,
  diffParams,
  diffMessageHashes,
  summariseCauses,
  buildEventRecord,
  diffHasChanges,
  buildBetaHeaderSnapshot,
  diffBetaHeader,
  buildKeymapRecord,
  TAP_ORDER,
  TAP_VIEW,
  sweepSnapshotDir,
  groupSnapshotFiles,
  SNAPSHOT_FILE_RE,
  SNAPSHOT_MAX_AGE_MS,
  SNAPSHOT_MAX_KEYS,
} from "../proxy/extensions/prefix-diff.mjs";

// `import.meta.dirname` requires Node 20.11+; CI matrix includes Node 18,
// so derive the directory from import.meta.url for portability.
const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Helpers ---

async function newTmp() {
  return tmpDir("prefix-diff-test-");
}

function makePayload({
  system = [{ type: "text", text: "you are claude" }],
  tools = [{ name: "Read" }, { name: "Bash" }],
  messages = [
    { role: "user", content: [{ type: "text", text: "hello" }] },
    { role: "assistant", content: [{ type: "text", text: "hi" }] },
  ],
} = {}) {
  return { system, tools, messages };
}

async function listFiles(dir) {
  try {
    return (await readdir(dir)).sort();
  } catch {
    return [];
  }
}

// Capture stderr from a function. Restores before returning.
async function captureStderr(fn) {
  const chunks = [];
  const orig = process.stderr.write;
  process.stderr.write = (chunk) => {
    chunks.push(chunk.toString());
    return true;
  };
  try {
    await fn();
  } finally {
    process.stderr.write = orig;
  }
  return chunks.join("");
}

// --- Pure helper tests ---

test("computeSessionKey is deterministic and 12 chars", () => {
  const sys = [{ type: "text", text: "you are claude" }];
  const k1 = computeSessionKey(sys);
  const k2 = computeSessionKey(sys);
  assert.equal(k1, k2);
  assert.equal(k1.length, 12);
});

test("computeSessionKey differs for different system content", () => {
  const a = computeSessionKey([{ type: "text", text: "system A" }]);
  const b = computeSessionKey([{ type: "text", text: "system B" }]);
  assert.notEqual(a, b);
});

test("truncatePrefixMessages strips cache_control from blocks", () => {
  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: "hello", cache_control: { type: "ephemeral" } },
        { type: "text", text: "world" },
      ],
    },
  ];
  const out = truncatePrefixMessages(messages);
  assert.equal(out[0].content[0].text, "hello");
  assert.equal(out[0].content[0].cache_control, undefined);
  assert.equal(out[0].content[1].cache_control, undefined);
});

test("truncatePrefixMessages truncates text >500 chars with N marker", () => {
  const longText = "x".repeat(600);
  const messages = [
    { role: "user", content: [{ type: "text", text: longText }] },
  ];
  const out = truncatePrefixMessages(messages);
  const t = out[0].content[0].text;
  assert.equal(t.length, 500 + `...[600 chars]`.length);
  assert.ok(t.endsWith("...[600 chars]"));
  assert.ok(t.startsWith("xxxxxxxxxx"));
});

test("truncatePrefixMessages keeps short text untouched", () => {
  const messages = [
    { role: "user", content: [{ type: "text", text: "short" }] },
  ];
  const out = truncatePrefixMessages(messages);
  assert.equal(out[0].content[0].text, "short");
});

test("truncatePrefixMessages slices to first 5 messages", () => {
  const messages = Array.from({ length: 10 }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: [{ type: "text", text: `msg ${i}` }],
  }));
  const out = truncatePrefixMessages(messages);
  assert.equal(out.length, 5);
  assert.equal(out[4].content[0].text, "msg 4");
});

// --- Tail window tests ---

test("truncateTailMessages slices to last 3 messages", () => {
  const messages = Array.from({ length: 10 }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: [{ type: "text", text: `msg ${i}` }],
  }));
  const out = truncateTailMessages(messages);
  assert.equal(out.length, 3);
  assert.equal(out[0].content[0].text, "msg 7");
  assert.equal(out[2].content[0].text, "msg 9");
});

test("truncateTailMessages applies the same truncation rules as the head window", () => {
  const longText = "y".repeat(600);
  const messages = [
    { role: "user", content: [{ type: "text", text: "short" }] },
    {
      role: "assistant",
      content: [
        { type: "text", text: longText, cache_control: { type: "ephemeral" } },
      ],
    },
  ];
  const out = truncateTailMessages(messages);
  assert.equal(out[1].content[0].cache_control, undefined);
  assert.ok(out[1].content[0].text.endsWith("...[600 chars]"));
});

test("truncateTailMessages handles fewer than 3 messages", () => {
  const messages = [{ role: "user", content: [{ type: "text", text: "only" }] }];
  const out = truncateTailMessages(messages);
  assert.equal(out.length, 1);
});

// --- Marker window tests ---

test("buildMarkerSnapshot returns empty array when no messages carry cache_control", () => {
  const messages = [
    { role: "user", content: [{ type: "text", text: "hello" }] },
    { role: "assistant", content: [{ type: "text", text: "hi" }] },
  ];
  assert.deepEqual(buildMarkerSnapshot(messages), []);
});

test("buildMarkerSnapshot picks up messages carrying a cache_control block, in order", () => {
  const messages = [
    { role: "user", content: [{ type: "text", text: "no marker" }] },
    {
      role: "user",
      content: [
        { type: "text", text: "marked one", cache_control: { type: "ephemeral" } },
      ],
    },
    { role: "assistant", content: [{ type: "text", text: "no marker either" }] },
    {
      role: "user",
      content: [
        { type: "text", text: "marked two", cache_control: { type: "ephemeral" } },
      ],
    },
  ];
  const markers = buildMarkerSnapshot(messages);
  assert.equal(markers.length, 2);
  assert.equal(markers[0].index, 1);
  assert.equal(markers[1].index, 3);
  assert.equal(typeof markers[0].hash, "string");
  assert.ok(markers[0].textPreview.includes("marked one"));
});

test("buildMarkerSnapshot caps at 8 stored markers even with more in the array", () => {
  const messages = Array.from({ length: 12 }, (_, i) => ({
    role: "user",
    content: [
      { type: "text", text: `m${i}`, cache_control: { type: "ephemeral" } },
    ],
  }));
  const markers = buildMarkerSnapshot(messages);
  assert.equal(markers.length, 8);
  assert.equal(markers[0].index, 0);
  assert.equal(markers[7].index, 7);
});

test("buildMarkerSnapshot hash changes when marked message content changes", () => {
  const markedMsg = (text) => ({
    role: "user",
    content: [{ type: "text", text, cache_control: { type: "ephemeral" } }],
  });
  const a = buildMarkerSnapshot([markedMsg("v1")]);
  const b = buildMarkerSnapshot([markedMsg("v2")]);
  assert.notEqual(a[0].hash, b[0].hash);
});

test("buildMarkerSnapshot hash strips cache_control before hashing (marker presence alone isn't a diff)", () => {
  const a = buildMarkerSnapshot([
    {
      role: "user",
      content: [{ type: "text", text: "same", cache_control: { type: "ephemeral" } }],
    },
  ]);
  const b = buildMarkerSnapshot([
    {
      role: "user",
      content: [
        { type: "text", text: "same", cache_control: { type: "ephemeral", ttl: "1h" } },
      ],
    },
  ]);
  assert.equal(a[0].hash, b[0].hash);
});

test("buildSnapshot returns null when payload has no system", () => {
  assert.equal(buildSnapshot({ messages: [] }), null);
  assert.equal(buildSnapshot({ system: null }), null);
  assert.equal(buildSnapshot({}), null);
});

test("buildSnapshot includes systemHash, toolsHash, messageCount, prefixMessages", () => {
  const snap = buildSnapshot(makePayload());
  assert.equal(typeof snap.timestamp, "string");
  assert.equal(snap.messageCount, 2);
  assert.equal(snap.toolsHash.length, 16);
  assert.equal(snap.systemHash.length, 16);
  assert.equal(snap.prefixMessages.length, 2);
});

test("buildSnapshot includes tailMessages and markerMessages windows", () => {
  const messages = Array.from({ length: 10 }, (_, i) => ({
    role: "user",
    content: [{ type: "text", text: `msg ${i}` }],
  }));
  messages[6].content[0].cache_control = { type: "ephemeral" };
  const snap = buildSnapshot(makePayload({ messages }));
  assert.equal(snap.tailMessages.length, 3);
  assert.equal(snap.tailMessages[2].content[0].text, "msg 9");
  assert.equal(snap.markerMessages.length, 1);
  assert.equal(snap.markerMessages[0].index, 6);
});

test("computeDiff: identical snapshots → no differences", () => {
  const snap = buildSnapshot(makePayload());
  const diff = computeDiff(snap, snap);
  assert.equal(diff.prefixDiffs.length, 0);
  assert.equal(diff.toolsMatch, true);
  assert.equal(diff.systemMatch, true);
  assert.equal(diffHasChanges(diff), false);
});

test("computeDiff: tools/system hash mismatch flips the corresponding flag", () => {
  const a = buildSnapshot(makePayload());
  const b = buildSnapshot(
    makePayload({ tools: [{ name: "Read" }, { name: "Edit" }] }),
  );
  const diff = computeDiff(a, b);
  assert.equal(diff.toolsMatch, false);
  assert.equal(diff.systemMatch, true);
  assert.equal(diffHasChanges(diff), true);
});

test("computeDiff: differing prefixMessages produce indexed diff entries", () => {
  const a = buildSnapshot(makePayload());
  const b = buildSnapshot(
    makePayload({
      messages: [
        { role: "user", content: [{ type: "text", text: "DIFFERENT" }] },
        { role: "assistant", content: [{ type: "text", text: "hi" }] },
      ],
    }),
  );
  const diff = computeDiff(a, b);
  assert.equal(diff.prefixDiffs.length, 1);
  assert.equal(diff.prefixDiffs[0].index, 0);
});

test("computeDiff: tail window catches a change outside the head window's first 5 messages", () => {
  // The blind-spot regression: a long session where the change lands past
  // index 5 must NOT report 0 differences just because the head window
  // (first 5 messages) is unaffected.
  const longSession = (tailText) =>
    makePayload({
      messages: [
        ...Array.from({ length: 7 }, (_, i) => ({
          role: "user",
          content: [{ type: "text", text: `head-stable ${i}` }],
        })),
        { role: "user", content: [{ type: "text", text: tailText }] },
      ],
    });
  const a = buildSnapshot(longSession("original tail"));
  const b = buildSnapshot(longSession("BUSTED tail"));
  const diff = computeDiff(a, b);
  assert.equal(diff.prefixDiffs.length, 0, "head window is unaffected by design");
  assert.ok(diff.tailDiffs.length > 0, "tail window must catch the change");
  assert.equal(diffHasChanges(diff), true);
});

test("computeDiff: marker window catches a change at a cache_control boundary outside head/tail", () => {
  const messages = (markerText) => [
    ...Array.from({ length: 5 }, (_, i) => ({
      role: "user",
      content: [{ type: "text", text: `head ${i}` }],
    })),
    {
      role: "user",
      content: [
        { type: "text", text: markerText, cache_control: { type: "ephemeral" } },
      ],
    },
    ...Array.from({ length: 20 }, (_, i) => ({
      role: "user",
      content: [{ type: "text", text: `filler ${i}` }],
    })),
  ];
  const a = buildSnapshot(makePayload({ messages: messages("marker v1") }));
  const b = buildSnapshot(makePayload({ messages: messages("marker v2") }));
  const diff = computeDiff(a, b);
  assert.equal(diff.prefixDiffs.length, 0, "head window doesn't reach the marker");
  assert.equal(diff.tailDiffs.length, 0, "tail window doesn't reach the marker either");
  assert.equal(diff.markerDiffs.length, 1);
  assert.equal(diff.markerDiffs[0].index, 5);
  assert.equal(diffHasChanges(diff), true);
});

test("computeDiff: identical marker/tail windows produce no marker/tail diffs", () => {
  const snap = buildSnapshot(makePayload());
  const diff = computeDiff(snap, snap);
  assert.equal(diff.tailDiffs.length, 0);
  assert.equal(diff.markerDiffs.length, 0);
  assert.equal(diff.markerCount, 0);
});

test("computeDiff: messageCount change is reflected", () => {
  const a = buildSnapshot(makePayload());
  const b = buildSnapshot(
    makePayload({
      messages: [...makePayload().messages, { role: "user", content: [{ type: "text", text: "third" }] }],
    }),
  );
  const diff = computeDiff(a, b);
  assert.equal(diff.messageCountPrev, 2);
  assert.equal(diff.messageCountNow, 3);
  assert.equal(diffHasChanges(diff), true);
});

// --- Integration tests on snapshotPrefix ---

test("snapshotPrefix: returns null when no system", async () => {
  const dir = await newTmp();
  try {
    const result = await snapshotPrefix({ messages: [] }, { dir });
    assert.equal(result, null);
    assert.deepEqual(await listFiles(dir), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("snapshotPrefix: writes <key>-last.json on first invocation", async () => {
  const dir = await newTmp();
  try {
    const payload = makePayload();
    const result = await snapshotPrefix(payload, { dir });
    assert.ok(result?.wroteSnapshot);
    assert.equal(result.wroteDiff, false);
    const expected = `${result.key}-last.json`;
    const files = await listFiles(dir);
    // The listing stays EXACT — its point is that nothing unexpected is
    // written. The key->conversation map joins it because a first invocation
    // is by definition a first sighting of the key.
    assert.deepEqual(files, [expected, "cache-fix-keymap.jsonl"].sort());
    // The file holds one baseline per tenant (co-tenants share a session id).
    const json = JSON.parse(await readFile(join(dir, expected), "utf-8"));
    assert.equal(json.tenants[json.lastTenant].messageCount, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("snapshotPrefix: identical second call rewrites last.json, no diff file", async () => {
  const dir = await newTmp();
  try {
    const payload = makePayload();
    const r1 = await snapshotPrefix(payload, { dir });
    const r2 = await snapshotPrefix(payload, { dir });
    assert.ok(r2.wroteSnapshot);
    assert.equal(r2.wroteDiff, false);
    const files = await listFiles(dir);
    // One keymap line was written by the FIRST call; the identical second
    // call adds no file and no line.
    assert.deepEqual(files, [`${r1.key}-last.json`, "cache-fix-keymap.jsonl"].sort());
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("snapshotPrefix: differing second call writes <key>-diff.json with prefixDiffs", async () => {
  const dir = await newTmp();
  try {
    const r1 = await snapshotPrefix(makePayload(), { dir });
    // Suppress the success-summary stderr write during the diff call.
    let r2;
    await captureStderr(async () => {
      r2 = await snapshotPrefix(
        makePayload({
          messages: [
            { role: "user", content: [{ type: "text", text: "CHANGED" }] },
            { role: "assistant", content: [{ type: "text", text: "hi" }] },
          ],
        }),
        { dir },
      );
    });
    assert.ok(r2.wroteSnapshot);
    assert.ok(r2.wroteDiff);
    const files = await listFiles(dir);
    // The events ledger is written alongside the detail file (see design
    // note 2 — the detail file alone was self-erasing).
    assert.deepEqual(files, [
      `${r1.key}-diff.json`,
      `${r1.key}-events.jsonl`,
      `${r1.key}-last.json`,
      "cache-fix-keymap.jsonl",
    ].sort());
    const diff = JSON.parse(await readFile(join(dir, `${r1.key}-diff.json`), "utf-8"));
    assert.ok(diff.prefixDiffs.length > 0);
    assert.equal(diff.prefixDiffs[0].index, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("snapshotPrefix: rename failure leaves prior last.json intact", async () => {
  const dir = await newTmp();
  try {
    // Seed a known prior snapshot
    const payload = makePayload();
    await snapshotPrefix(payload, { dir });
    const key = computeSessionKey(payload.system);
    const lastPath = join(dir, `${key}-last.json`);
    const priorContent = await readFile(lastPath, "utf-8");

    // Now monkey-patch rename to throw; both diff and snapshot writes hit it
    const failingFs = {
      rename: async () => {
        throw new Error("simulated rename failure");
      },
    };

    let result;
    await captureStderr(async () => {
      result = await snapshotPrefix(
        makePayload({
          messages: [
            { role: "user", content: [{ type: "text", text: "CHANGED" }] },
          ],
        }),
        { dir, fs: failingFs },
      );
    });
    assert.equal(result.wroteSnapshot, false);
    assert.equal(result.wroteDiff, false);
    // Prior snapshot must still match what we seeded
    const after = await readFile(lastPath, "utf-8");
    assert.equal(after, priorContent);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("snapshotPrefix: corrupt prior snapshot is treated as no-prior", async () => {
  const dir = await newTmp();
  try {
    const payload = makePayload();
    const key = computeSessionKey(payload.system);
    const lastPath = join(dir, `${key}-last.json`);
    // Write garbage that is not valid JSON
    await writeFile(lastPath, "{not json", "utf-8");

    let result;
    await captureStderr(async () => {
      result = await snapshotPrefix(payload, { dir });
    });
    assert.ok(result.wroteSnapshot);
    assert.equal(result.wroteDiff, false);
    // Last.json should now be valid JSON
    const json = JSON.parse(await readFile(lastPath, "utf-8"));
    assert.equal(json.tenants[json.lastTenant].messageCount, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("snapshotPrefix: concurrent invocations both succeed; final snapshot matches one of the two payloads", async () => {
  const dir = await newTmp();
  try {
    const payloadA = makePayload();
    const payloadB = makePayload({
      messages: [
        { role: "user", content: [{ type: "text", text: "OTHER" }] },
      ],
    });
    let results;
    await captureStderr(async () => {
      results = await Promise.all([
        // contentEnabled:true so the written snapshot's shape matches the
        // buildSnapshot(payloadA/B) comparison calls below, which also
        // default to content-enabled — otherwise the two shapes diverge
        // (default mode omits prefixMessages' text) for reasons unrelated
        // to the concurrency behaviour this test actually checks.
        snapshotPrefix(payloadA, { dir, contentEnabled: true }),
        snapshotPrefix(payloadB, { dir, contentEnabled: true }),
      ]);
    });
    // Both same key (same system), so both write to same last.json
    assert.equal(results[0].key, results[1].key);
    // At least one succeeded (the other may have lost the rename race)
    assert.ok(results.some((r) => r.wroteSnapshot));
    // Final last.json must be valid JSON (no torn write)
    const lastPath = join(dir, `${results[0].key}-last.json`);
    const json = JSON.parse(await readFile(lastPath, "utf-8"));
    // Stronger: the final file must equal one of the two candidate snapshots
    // — not a mix of A and B, not a corrupt partial.
    const snapshotA = buildSnapshot(payloadA);
    const snapshotB = buildSnapshot(payloadB);
    // Timestamps are generated at build time and will differ; compare the
    // deterministic content fields (prefixMessages + counts/hashes).
    const deterministic = ({ prefixMessages, messageCount, toolsHash, systemHash }) => ({
      prefixMessages,
      messageCount,
      toolsHash,
      systemHash,
    });
    const actual = JSON.stringify(deterministic(json.tenants[json.lastTenant]));
    assert.ok(
      actual === JSON.stringify(deterministic(snapshotA)) ||
        actual === JSON.stringify(deterministic(snapshotB)),
      "final snapshot content must match exactly one of the two candidate payloads",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("snapshotPrefix: hot-reload — re-importing module preserves disk-based diff behavior", async () => {
  const dir = await newTmp();
  try {
    // Use the already-imported snapshotPrefix for the seed
    const payloadV1 = makePayload();
    await snapshotPrefix(payloadV1, { dir });

    // Re-import the module with cache-busting query string
    const url =
      pathToFileURL(
        join(__dirname, "..", "proxy", "extensions", "prefix-diff.mjs"),
      ).href + "?reload=" + Date.now();
    const reloaded = await import(url);

    // Use the freshly-imported snapshotPrefix with a mutated payload
    let result;
    await captureStderr(async () => {
      result = await reloaded.snapshotPrefix(
        makePayload({
          messages: [
            { role: "user", content: [{ type: "text", text: "POST_RELOAD_CHANGE" }] },
          ],
        }),
        { dir },
      );
    });
    assert.ok(result.wroteDiff, "diff should fire across module re-imports");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("snapshotPrefix: mkdir failure with debug=1 logs but does not throw", async () => {
  const dir = await newTmp();
  const prevDebug = process.env.CACHE_FIX_DEBUG;
  try {
    // DEBUG is read at module-import time, so to test the logging path
    // deterministically we set the env var then re-import the module with
    // a cache-busting query string. This mirrors the hot-reload test.
    process.env.CACHE_FIX_DEBUG = "1";
    const url =
      pathToFileURL(
        join(__dirname, "..", "proxy", "extensions", "prefix-diff.mjs"),
      ).href + "?debugReload=" + Date.now();
    const reloaded = await import(url);

    const failingFs = {
      mkdir: async () => {
        throw new Error("simulated mkdir failure");
      },
    };
    const stderr = await captureStderr(async () => {
      const result = await reloaded.snapshotPrefix(makePayload(), {
        dir: join(dir, "subdir"),
        fs: failingFs,
      });
      assert.equal(result.wroteSnapshot, false);
      assert.equal(result.wroteDiff, false);
    });
    // With DEBUG=1 at import time, the mkdir failure MUST be logged.
    assert.ok(
      stderr.includes("mkdir failed") && stderr.includes("simulated mkdir failure"),
      `expected mkdir failure in stderr, got: ${JSON.stringify(stderr)}`,
    );
  } finally {
    if (prevDebug === undefined) delete process.env.CACHE_FIX_DEBUG;
    else process.env.CACHE_FIX_DEBUG = prevDebug;
    await rm(dir, { recursive: true, force: true });
  }
});

// --- default.onRequest tests ---

test("default.onRequest: no-op when CACHE_FIX_PREFIXDIFF unset (module-time check)", async () => {
  // The extension reads ENABLED at module import time. If the env var was
  // unset when the test process started, ext.onRequest is a no-op regardless
  // of what we do at test time. We assert that calling onRequest does not
  // throw and does not mutate ctx.body.
  const ctx = { body: makePayload() };
  const before = JSON.stringify(ctx.body);
  await ext.onRequest(ctx);
  const after = JSON.stringify(ctx.body);
  assert.equal(after, before);
});

test("default.onRequest: never mutates ctx.body", async () => {
  const ctx = { body: makePayload() };
  const before = JSON.stringify(ctx.body);
  await ext.onRequest(ctx);
  const after = JSON.stringify(ctx.body);
  assert.equal(after, before);
});

test("default.onRequest: tolerates missing ctx and missing body", async () => {
  await ext.onRequest({});
  await ext.onRequest({ body: null });
  // No throw = pass
  assert.ok(true);
});

test("default has correct extension contract metadata", () => {
  assert.equal(ext.name, "prefix-diff");
  assert.equal(ext.order, 680);
  assert.equal(typeof ext.onRequest, "function");
  assert.equal(typeof ext.description, "string");
});

// --- Blind-spot regressions (2026-07-27) ---
//
// Each test below pins one way the diagnostic used to report nothing, or
// something misleading, on a real cache bust. They are regressions in the
// strict sense: the old implementation fails every one of them.

// Blind spot 1: the storage key was derived from `system`, so a change
// inside the first 2000 chars moved the key, missed the prior snapshot,
// and produced NO diff and NO log line at all.
test("resolveSessionKey: stays stable when the system prompt changes", () => {
  const headers = { "x-claude-code-session-id": "abc-123" };
  const k1 = resolveSessionKey(headers, [{ type: "text", text: "system v1" }]);
  const k2 = resolveSessionKey(headers, [{ type: "text", text: "system v2 TOTALLY DIFFERENT" }]);
  assert.equal(k1, k2, "session-keyed storage must not move when content changes");
});

test("resolveSessionKey: differs per session id", () => {
  const sys = [{ type: "text", text: "same" }];
  const a = resolveSessionKey({ "x-claude-code-session-id": "aaa" }, sys);
  const b = resolveSessionKey({ "x-claude-code-session-id": "bbb" }, sys);
  assert.notEqual(a, b);
});

test("resolveSessionKey: falls back to the content hash without headers", () => {
  const sys = [{ type: "text", text: "no headers here" }];
  assert.equal(resolveSessionKey(null, sys), computeSessionKey(sys));
});

// Blind spot 6 (2026-07-27): co-tenants on ONE session id. A main session,
// its subagents, and Claude Code's background calls share the session-id
// header. With a single baseline per session they diffed against each
// other, so conversations advancing normally rendered as prefix churn —
// misread that day as the cause of a 93k bust it had no part in.
test("snapshotPrefix: co-tenants on one session id do not diff against each other", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "shared-session" };
  const main = (text) =>
    makePayload({
      system: [{ type: "text", text: "You are an interactive agent" }],
      messages: [{ role: "user", content: [{ type: "text", text }] }],
    });
  const sub = (text) =>
    makePayload({
      system: [{ type: "text", text: "You are a subagent with a task brief" }],
      messages: [{ role: "user", content: [{ type: "text", text }] }],
    });
  try {
    await snapshotPrefix(main("turn 1"), { dir, headers });
    // The subagent's FIRST request has no baseline of its own. The diff
    // against the main session's snapshot is kept (a system-prompt change
    // in ONE conversation looks identical, and dropping it would hide a
    // real bust) but must be MARKED, so it is never read as a cause.
    let rSub, subErr;
    subErr = await captureStderr(async () => {
      rSub = await snapshotPrefix(sub("sub turn 1"), { dir, headers });
    });
    assert.ok(rSub.wroteDiff, "evidence is kept, not dropped");
    assert.match(String(subErr), /CROSS-TENANT/, "and it is labelled on stderr");
    const events = (await readFile(join(dir, `${rSub.key}-events.jsonl`), "utf-8"))
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    assert.equal(events.at(-1).crossTenant, true, "and in the ledger");

    // Main advancing must still diff against MAIN's baseline, not the
    // subagent's — and must still be reported.
    let rMain;
    await captureStderr(async () => {
      rMain = await snapshotPrefix(main("turn 2"), { dir, headers });
    });
    assert.ok(rMain.wroteDiff, "the main session's own advance still diffs");

    // One file per session id: separation is inside the file, so the
    // path never moves (design note 1's blind spot stays closed).
    assert.equal(rSub.key, rMain.key);
    const json = JSON.parse(await readFile(join(dir, `${rMain.key}-last.json`), "utf-8"));
    assert.equal(Object.keys(json.tenants).length, 2, "both tenants keep a baseline");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("tenantId: prefers the agent-id header over the system prompt", () => {
  const sysA = [{ type: "text", text: "prompt A" }];
  const sysB = [{ type: "text", text: "prompt B TOTALLY DIFFERENT" }];
  const hdr = { "x-claude-code-agent-id": "agent-7" };
  // Authoritative when present: an edited system prompt must not split a
  // conversation's baseline in two.
  assert.equal(tenantId(hdr, sysA), tenantId(hdr, sysB));
  // Distinct agents stay distinct even on an identical prompt.
  assert.notEqual(
    tenantId({ "x-claude-code-agent-id": "agent-8" }, sysA),
    tenantId(hdr, sysA),
  );
  // Absent (the common case — CC omits it for Workflow legs): fall back
  // to the system prompt.
  assert.notEqual(tenantId({}, sysA), tenantId({}, sysB));
  assert.equal(tenantId({}, sysA), tenantId(null, sysA));
});

test("snapshotPrefix: a system-prompt change still finds its prior snapshot (key stability)", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "resume-test" };
  try {
    await snapshotPrefix(makePayload({ system: [{ type: "text", text: "v1 prompt" }] }), {
      dir,
      headers,
    });
    let result;
    await captureStderr(async () => {
      result = await snapshotPrefix(
        makePayload({ system: [{ type: "text", text: "v2 prompt" }] }),
        { dir, headers },
      );
    });
    // The whole point: the diff MUST fire. Under the old key derivation
    // this wrote a fresh baseline under a new name and reported nothing.
    assert.ok(result.wroteDiff, "system change must still produce a diff");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// Blind spot 2: `<key>-diff.json` was overwritten on every diff, so a
// bust's detail survived only until the next one.
test("snapshotPrefix: appends every diff to an events ledger that is never overwritten", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "ledger-test" };
  try {
    await snapshotPrefix(makePayload(), { dir, headers });
    await captureStderr(async () => {
      for (const text of ["change one", "change two", "change three"]) {
        await snapshotPrefix(
          makePayload({ messages: [{ role: "user", content: [{ type: "text", text }] }] }),
          { dir, headers },
        );
      }
    });
    const key = resolveSessionKey(headers, makePayload().system);
    const lines = (await readFile(join(dir, `${key}-events.jsonl`), "utf-8"))
      .trim()
      .split("\n");
    assert.equal(lines.length, 3, "each diff appends one record");
    for (const line of lines) {
      const rec = JSON.parse(line);
      assert.ok(rec.ts && Array.isArray(rec.causes));
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// Blind spot 3: toolsHash covered only names, so schema/description
// changes reported `tools=match` for a genuinely different payload.
test("buildToolsSnapshot: hashes full schemas, not just names", () => {
  const a = buildToolsSnapshot([{ name: "Read", input_schema: { a: 1 } }]);
  const b = buildToolsSnapshot([{ name: "Read", input_schema: { a: 2 } }]);
  assert.notEqual(a.hash, b.hash, "same name, different schema must not hash equal");
});

test("diffTools: names the tool and classifies the change", () => {
  const prev = buildToolsSnapshot([{ name: "Read", description: "old" }, { name: "Bash" }]);
  const now = buildToolsSnapshot([{ name: "Read", description: "new" }, { name: "Edit" }]);
  const diffs = diffTools(prev, now);
  const byName = Object.fromEntries(diffs.map((d) => [d.name, d.change]));
  assert.equal(byName.Read, "schema");
  assert.equal(byName.Bash, "removed");
  assert.equal(byName.Edit, "added");
});

test("diffTools: pure reordering is reported as reordered, not as churn", () => {
  const prev = buildToolsSnapshot([{ name: "A" }, { name: "B" }]);
  const now = buildToolsSnapshot([{ name: "B" }, { name: "A" }]);
  const diffs = diffTools(prev, now);
  assert.equal(diffs.length, 2);
  assert.ok(diffs.every((d) => d.change === "reordered"));
});

// Blind spot 4: one opaque systemHash answered "did it change" and
// nothing else — the exact wall a real investigation hit.
test("diffSystemBlocks: locates the changed block, its label, and the differing offset", () => {
  const mk = (envText) => [
    { type: "text", text: "You are Claude Code, an agent." },
    { type: "text", text: envText },
  ];
  const prev = buildSystemSnapshot(mk("<env>Working directory: /tmp\nToday: 2026-07-26</env>"));
  const now = buildSystemSnapshot(mk("<env>Working directory: /tmp\nToday: 2026-07-27</env>"));
  const diffs = diffSystemBlocks(prev, now);
  assert.equal(diffs.length, 1, "only the env block changed");
  assert.equal(diffs[0].index, 1);
  assert.equal(diffs[0].label, "env");
  assert.ok(diffs[0].charAt > 0, "reports where the divergence starts");
  assert.ok(
    diffs[0].prevWindow.includes("2026-07-26") && diffs[0].nowWindow.includes("2026-07-27"),
    "shows the bytes from both sides",
  );
});

test("buildSystemSnapshot: labels known Claude Code block shapes", () => {
  const blocks = buildSystemSnapshot([
    { type: "text", text: "You are Claude Code, an agent" },
    { type: "text", text: "<env>Platform: linux</env>" },
  ]);
  assert.equal(blocks[0].label, "cc-identity");
  assert.equal(blocks[1].label, "env");
});

test("buildSystemSnapshot: accepts a plain string system prompt", () => {
  const blocks = buildSystemSnapshot("plain string prompt");
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "string");
});

// Coverage gap: top-level params were not snapshotted at all, so a model
// switch — a guaranteed cache-key change — read as "0 differences".
test("diffParams: a model switch is detected", () => {
  const a = buildSnapshot({ ...makePayload(), model: "claude-opus-5" });
  const b = buildSnapshot({ ...makePayload(), model: "claude-sonnet-5" });
  const diff = computeDiff(a, b);
  assert.equal(diff.paramDiffs.length, 1);
  assert.equal(diff.paramDiffs[0].key, "model");
  assert.equal(diffHasChanges(diff), true, "param-only change must count as a change");
});

test("diffParams: temperature and thinking config are tracked", () => {
  const a = buildSnapshot({ ...makePayload(), temperature: 1, thinking: { type: "enabled" } });
  const b = buildSnapshot({ ...makePayload(), temperature: 0, thinking: { type: "disabled" } });
  const keys = computeDiff(a, b).paramDiffs.map((d) => d.key).sort();
  assert.deepEqual(keys, ["temperature", "thinking"]);
});

// Coverage gap: head(5) + markers(8) + tail(3) left a long session's
// middle unobserved — a mutation there reported zero differences.
test("messageChain: catches a mutation in the middle, outside every window", () => {
  const build = (midText) =>
    makePayload({
      messages: Array.from({ length: 60 }, (_, i) => ({
        role: "user",
        content: [{ type: "text", text: i === 30 ? midText : `msg ${i}` }],
      })),
    });
  const a = buildSnapshot(build("original middle"));
  const b = buildSnapshot(build("MUTATED middle"));
  const diff = computeDiff(a, b);
  assert.equal(diff.prefixDiffs.length, 0, "head window cannot see index 30");
  assert.equal(diff.tailDiffs.length, 0, "tail window cannot see index 30");
  assert.equal(diff.markerDiffs.length, 0, "no cache_control markers present");
  assert.equal(diff.messageChain.firstDivergentIndex, 30);
  assert.equal(diffHasChanges(diff), true);
});

test("messageChain: a normal append is flagged appendOnly with no divergence", () => {
  const base = makePayload();
  const a = buildSnapshot(base);
  const b = buildSnapshot(
    makePayload({
      messages: [...base.messages, { role: "user", content: [{ type: "text", text: "next" }] }],
    }),
  );
  const chain = computeDiff(a, b).messageChain;
  assert.equal(chain.firstDivergentIndex, -1);
  assert.equal(chain.appendOnly, true);
});

// Every content shape a request can carry must yield a non-null preview —
// null previews are exactly what made the 2026-07-28 37k bust
// unattributable (all divergent messages were tool-shaped).
test("messageTextPreview: string content is previewed, not nulled", () => {
  const p = messageTextPreview({ role: "user", content: "plain string body" });
  assert.equal(p, "plain string body");
});

test("messageTextPreview: tool_use-only content names the tool and input", () => {
  const p = messageTextPreview({
    role: "assistant",
    content: [{ type: "tool_use", id: "t1", name: "Bash", input: { command: "ls" } }],
  });
  assert.match(p, /tool_use:Bash/);
  assert.match(p, /"command":"ls"/);
});

test("messageTextPreview: tool_result-only content carries the result body", () => {
  const p = messageTextPreview({
    role: "user",
    content: [{ type: "tool_result", tool_use_id: "t1", content: "exit 0" }],
  });
  assert.match(p, /tool_result/);
  assert.match(p, /exit 0/);
});

test("messageTextPreview: tool_result error flag and block-array content survive", () => {
  const p = messageTextPreview({
    role: "user",
    content: [
      {
        type: "tool_result",
        tool_use_id: "t1",
        is_error: true,
        content: [{ type: "text", text: "boom" }],
      },
    ],
  });
  assert.match(p, /tool_result:error/);
  assert.match(p, /boom/);
});

test("messageTextPreview: thinking blocks are marked present but redacted", () => {
  const p = messageTextPreview({
    role: "assistant",
    content: [
      { type: "thinking", thinking: "secret reasoning bytes" },
      { type: "text", text: "visible" },
    ],
  });
  assert.match(p, /\[thinking\]/);
  assert.match(p, /visible/);
  assert.doesNotMatch(p, /secret reasoning/);
});

test("messageTextPreview: unknown block types name their type", () => {
  const p = messageTextPreview({
    role: "user",
    content: [{ type: "image", source: { type: "base64", data: "AAAA" } }],
  });
  assert.match(p, /\[image\]/);
});

test("messageTextPreview: still bounded and null only for shapeless input", () => {
  const p = messageTextPreview(
    { role: "user", content: "y".repeat(5000) },
    120,
  );
  assert.equal(p.length, 120);
  assert.equal(messageTextPreview(null), null);
  assert.equal(messageTextPreview({ role: "user" }), null);
});

test("buildMessageHashes: sees a change past 500 chars (no truncation blindness)", () => {
  const mk = (tail) => [
    { role: "user", content: [{ type: "text", text: "x".repeat(600) + tail }] },
  ];
  const a = buildMessageHashes(mk("A"));
  const b = buildMessageHashes(mk("B"));
  assert.notEqual(a[0].h, b[0].h, "hash chain must not truncate before hashing");
});

test("diffMessageHashes: truncation is distinguished from in-place mutation", () => {
  const long = buildMessageHashes(
    Array.from({ length: 5 }, (_, i) => ({ role: "user", content: [{ type: "text", text: `m${i}` }] })),
  );
  const short = long.slice(0, 3);
  const chain = diffMessageHashes(long, short);
  assert.equal(chain.firstDivergentIndex, -1, "shared prefix is intact");
  assert.equal(chain.appendOnly, false, "shrinking is not an append");
  assert.equal(chain.prevLength, 5);
  assert.equal(chain.nowLength, 3);
});

// The summary line is the artifact most reads stop at, so the cause must
// be legible there without opening any file.
test("summariseCauses: names the specific block, tool, param, and index", () => {
  const a = buildSnapshot({
    ...makePayload({ system: [{ type: "text", text: "<env>Today: A</env>" }] }),
    model: "claude-opus-5",
  });
  const b = buildSnapshot({
    ...makePayload({
      system: [{ type: "text", text: "<env>Today: B</env>" }],
      tools: [{ name: "Read", input_schema: { changed: true } }, { name: "Bash" }],
      messages: [{ role: "user", content: [{ type: "text", text: "different" }] }],
    }),
    model: "claude-sonnet-5",
  });
  const causes = summariseCauses(computeDiff(a, b)).join(" | ");
  assert.ok(causes.includes("params:model"), `expected model in: ${causes}`);
  assert.ok(causes.includes("system["), `expected system block in: ${causes}`);
  assert.ok(causes.includes("tools["), `expected tools in: ${causes}`);
  assert.ok(causes.includes("messages@0"), `expected message index in: ${causes}`);
});

// Tap points (dev-loop.md): a bare index was equated across tap points
// during the 587k attribution. Every record this module emits must name
// its own tap point, derived from the SAME order the extension itself
// registers under — never a second literal that could drift from it.
test("buildEventRecord: carries its tap-point view marker, single-sourced from the module's own order", () => {
  assert.equal(ext.order, TAP_ORDER, "the default export's order must be the single source TAP_VIEW derives from");
  assert.equal(TAP_VIEW, `forwarded@${TAP_ORDER}`);

  const a = buildSnapshot(makePayload({ system: [{ type: "text", text: "<env>A</env>" }] }));
  const b = buildSnapshot(makePayload({ system: [{ type: "text", text: "<env>B</env>" }] }));
  const rec = buildEventRecord(computeDiff(a, b), "key123", "sid-1");
  assert.equal(rec.view, TAP_VIEW, `expected tap-point view marker on the record, got ${JSON.stringify(rec.view)}`);
});

test("buildEventRecord: bounded — carries evidence without full message bodies", () => {
  const a = buildSnapshot(makePayload({ system: [{ type: "text", text: "<env>A</env>" }] }));
  const b = buildSnapshot(
    makePayload({
      system: [{ type: "text", text: "<env>B</env>" }],
      messages: [{ role: "user", content: [{ type: "text", text: "y".repeat(5000) }] }],
    }),
  );
  const rec = buildEventRecord(computeDiff(a, b), "key123", "sid-1");
  const serialized = JSON.stringify(rec);
  assert.ok(serialized.length < 8000, `record should stay small, got ${serialized.length}`);
  assert.ok(!serialized.includes("y".repeat(200)), "must not embed full message bodies");
  assert.equal(rec.sid, "sid-1");
  assert.ok(rec.system.length > 0, "but must carry the system-block evidence");
});

// Version-boundary safety: a snapshot written by the previous release has
// none of the new fields. Diffing across that boundary must degrade, not
// throw.
test("computeDiff: tolerates an old-format snapshot with no new fields", () => {
  const old = {
    timestamp: "2026-07-26T00:00:00.000Z",
    messageCount: 2,
    toolsHash: "abc",
    systemHash: "def",
    prefixMessages: [],
    tailMessages: [],
    markerMessages: [],
  };
  const current = buildSnapshot(makePayload());
  const diff = computeDiff(old, current);
  assert.ok(Array.isArray(diff.systemBlockDiffs));
  assert.ok(Array.isArray(diff.toolDiffs));
  assert.ok(Array.isArray(diff.paramDiffs));
  assert.equal(typeof diff.messageChain.firstDivergentIndex, "number");
});

test("snapshotPrefix: ledger append failure does not prevent the diff file", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "append-fail" };
  try {
    await snapshotPrefix(makePayload(), { dir, headers });
    const failingFs = {
      appendFile: async () => {
        throw new Error("simulated append failure");
      },
    };
    let result;
    await captureStderr(async () => {
      result = await snapshotPrefix(
        makePayload({ messages: [{ role: "user", content: [{ type: "text", text: "X" }] }] }),
        { dir, headers, fs: failingFs },
      );
    });
    assert.ok(result.wroteDiff, "detail file must still be written");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// --- Prefix-diff's own blind spots (2026-07-27): output_config/speed/betas,
// and the anthropic-beta HEADER, are part of the cache key but were
// untracked — a bust from an effort change, fast-mode toggle, or beta-header
// drift was previously unattributable (bare messages@N or empty causes).

test("diffParams: an effort change inside output_config is detected", () => {
  const a = buildSnapshot({ ...makePayload(), output_config: { effort: "low" } });
  const b = buildSnapshot({ ...makePayload(), output_config: { effort: "high" } });
  const diff = computeDiff(a, b);
  assert.equal(diff.paramDiffs.length, 1);
  assert.equal(diff.paramDiffs[0].key, "output_config");
  assert.equal(diffHasChanges(diff), true);
  const causes = summariseCauses(diff).join(" | ");
  assert.ok(causes.includes("params:output_config"), `expected output_config in: ${causes}`);
});

test("diffParams: a speed (fast mode) change is detected", () => {
  const a = buildSnapshot({ ...makePayload(), speed: "standard" });
  const b = buildSnapshot({ ...makePayload(), speed: "fast" });
  const diff = computeDiff(a, b);
  assert.equal(diff.paramDiffs.length, 1);
  assert.equal(diff.paramDiffs[0].key, "speed");
  assert.equal(diffHasChanges(diff), true);
});

test("diffParams: a betas (body param) change is detected", () => {
  const a = buildSnapshot({ ...makePayload(), betas: ["fast-mode-2026-02-01"] });
  const b = buildSnapshot({ ...makePayload(), betas: ["fast-mode-2026-02-01", "context-1m-2025-08-07"] });
  const diff = computeDiff(a, b);
  assert.equal(diff.paramDiffs.length, 1);
  assert.equal(diff.paramDiffs[0].key, "betas");
});

test("buildBetaHeaderSnapshot: absent header normalizes to present:false, tokens:[]", () => {
  assert.deepEqual(buildBetaHeaderSnapshot(null), { present: false, tokens: [] });
  assert.deepEqual(buildBetaHeaderSnapshot({}), { present: false, tokens: [] });
});

test("buildBetaHeaderSnapshot: parses and sorts comma-separated tokens, case-insensitive header name", () => {
  const snap = buildBetaHeaderSnapshot({ "Anthropic-Beta": "b-token, a-token" });
  assert.equal(snap.present, true);
  assert.deepEqual(snap.tokens, ["a-token", "b-token"]);
});

test("diffBetaHeader: no change when the token set is identical (order-insensitive)", () => {
  const a = buildBetaHeaderSnapshot({ "anthropic-beta": "x, y" });
  const b = buildBetaHeaderSnapshot({ "anthropic-beta": "y, x" });
  const diff = diffBetaHeader(a, b);
  assert.deepEqual(diff, { added: [], removed: [] });
});

test("diffBetaHeader: detects an added and a removed token in the same change", () => {
  const a = buildBetaHeaderSnapshot({ "anthropic-beta": "context-1m-2025-08-07, fast-mode-2026-02-01" });
  const b = buildBetaHeaderSnapshot({ "anthropic-beta": "fast-mode-2026-02-01, task-budgets-2026-03-13" });
  const diff = diffBetaHeader(a, b);
  assert.deepEqual(diff.added, ["task-budgets-2026-03-13"]);
  assert.deepEqual(diff.removed, ["context-1m-2025-08-07"]);
});

test("computeDiff + summariseCauses: a beta-header-only change produces a header cause", () => {
  const a = buildSnapshot(makePayload(), { "anthropic-beta": "fast-mode-2026-02-01" });
  const b = buildSnapshot(makePayload(), { "anthropic-beta": "context-1m-2025-08-07" });
  const diff = computeDiff(a, b);
  assert.equal(diffHasChanges(diff), true, "a header-only change must count as a change");
  const causes = summariseCauses(diff).join(" | ");
  assert.ok(causes.includes("header:anthropic-beta"), `expected header cause in: ${causes}`);
  assert.ok(causes.includes("+context-1m-2025-08-07"), `expected added token in: ${causes}`);
  assert.ok(causes.includes("-fast-mode-2026-02-01"), `expected removed token in: ${causes}`);
});

test("computeDiff: identical beta headers produce no header cause and no spurious change", () => {
  const a = buildSnapshot(makePayload(), { "anthropic-beta": "context-1m-2025-08-07" });
  const b = buildSnapshot(makePayload(), { "anthropic-beta": "context-1m-2025-08-07" });
  const diff = computeDiff(a, b);
  assert.equal(diffHasChanges(diff), false);
  assert.deepEqual(diff.betaHeaderDiff, { added: [], removed: [] });
});

// Version-boundary safety, mirroring the existing "tolerates an old-format
// snapshot" test above: a snapshot written before this change has no
// `betaHeader` field at all. Diffing across that boundary must not throw,
// and — critically — must not report a spurious header cause just because
// the old side has no data to compare against.
test("computeDiff: old-format snapshot (no betaHeader field) migrates silently when neither side actually carries a header", () => {
  const old = {
    timestamp: "2026-07-26T00:00:00.000Z",
    messageCount: 2,
    toolsHash: "abc",
    systemHash: "def",
    prefixMessages: [],
    tailMessages: [],
    markerMessages: [],
    // no params, systemBlocks, toolsDetail, messageHashes, betaHeader — simulates
    // a snapshot from before ANY of the coverage additions, old and new alike.
  };
  // No anthropic-beta header on this request either — the pre-upgrade snapshot
  // and the first post-upgrade request agree there is nothing to report.
  const current = buildSnapshot(makePayload(), {});
  const diff = computeDiff(old, current);
  assert.deepEqual(diff.betaHeaderDiff, { added: [], removed: [] });
  assert.ok(!summariseCauses(diff).some((c) => c.startsWith("header:")));
});

// Distinguishes "no data on the old side" from "no header on either side":
// when the old snapshot predates beta-header tracking but the CURRENT
// request genuinely carries one, that's real new information the old
// snapshot has no way to rule out — it must surface, exactly as the
// pre-existing paramDiffs/toolDiffs/systemBlockDiffs helpers already do
// when their "old" side lacks the corresponding field (see the sibling
// "tolerates an old-format snapshot" test above, which asserts the arrays
// exist and doesn't claim they stay empty on a real underlying change).
test("computeDiff: old-format snapshot + a real header on the current request still surfaces as added", () => {
  const old = {
    timestamp: "2026-07-26T00:00:00.000Z",
    messageCount: 2,
    toolsHash: "abc",
    systemHash: "def",
    prefixMessages: [],
    tailMessages: [],
    markerMessages: [],
  };
  const current = buildSnapshot(makePayload(), { "anthropic-beta": "context-1m-2025-08-07" });
  const diff = computeDiff(old, current);
  assert.deepEqual(diff.betaHeaderDiff, { added: ["context-1m-2025-08-07"], removed: [] });
});

test("snapshotPrefix: a beta-header-only change on real requests fires a diff with a header cause", async () => {
  const dir = await newTmp();
  try {
    await snapshotPrefix(makePayload(), {
      dir,
      headers: { "x-claude-code-session-id": "beta-test", "anthropic-beta": "fast-mode-2026-02-01" },
    });
    let result;
    await captureStderr(async () => {
      result = await snapshotPrefix(makePayload(), {
        dir,
        headers: { "x-claude-code-session-id": "beta-test", "anthropic-beta": "context-1m-2025-08-07" },
      });
    });
    assert.ok(result.wroteDiff, "beta-header-only change must produce a diff");
    const key = resolveSessionKey({ "x-claude-code-session-id": "beta-test" }, makePayload().system);
    const diffJson = JSON.parse(await readFile(join(dir, `${key}-diff.json`), "utf-8"));
    assert.deepEqual(diffJson.betaHeaderDiff.added, ["context-1m-2025-08-07"]);
    assert.deepEqual(diffJson.betaHeaderDiff.removed, ["fast-mode-2026-02-01"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("default.onRequest: passes ctx.headers through to the key derivation", async () => {
  // Contract check: onRequest must forward headers, else every request
  // silently falls back to the content-derived key this work removed.
  const src = await readFile(
    join(__dirname, "..", "proxy", "extensions", "prefix-diff.mjs"),
    "utf-8",
  );
  const call = /snapshotPrefix\(\s*ctx\.body\s*,\s*\{([\s\S]*?)\}\s*\)/.exec(src);
  assert.ok(call, "onRequest must call snapshotPrefix with an options object");
  assert.match(call[1], /headers:\s*ctx\.headers/, "onRequest must pass ctx.headers to snapshotPrefix");
  // Same contract, second field (2026-09-20): without the pre-pipeline
  // conversation the baseline key silently falls back to tenant-only, which is
  // the sidecar collision this work removes. Re-deriving it here instead of
  // forwarding it would key on post-pipeline bytes.
  assert.match(
    call[1],
    /conv:\s*ctx\.meta\?\.\[PRE_PIPELINE_CONV\]/,
    "onRequest must forward the pre-pipeline conversation, not re-derive one",
  );
});

// Blind spot 7 (2026-07-27): a mid-history mutation was reported by index and
// nothing more. `messages@83(user)` on a ~93k bust could not be attributed
// afterwards — index 83 falls outside the head-5 and tail-3 content windows,
// so no stored artifact held what changed, and the live request was long gone.
test("a mid-history mutation records HOW it changed, not just where", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "midhistory" };
  const mk = (midText) => {
    const msgs = [];
    for (let i = 0; i < 12; i++) {
      msgs.push({
        role: i % 2 === 0 ? "user" : "assistant",
        content: [{ type: "text", text: i === 7 ? midText : `turn ${i}` }],
      });
    }
    return makePayload({ messages: msgs });
  };
  try {
    // contentEnabled:true — this test is specifically about the
    // CACHE_FIX_PREFIXDIFF_CONTENT=1 opt-in surface (prevContent/
    // nowContent are omitted by default under content minimization,
    // 2026-08-05).
    await snapshotPrefix(mk("ORIGINAL mid-history content"), { dir, headers, contentEnabled: true });
    let r;
    await captureStderr(async () => {
      r = await snapshotPrefix(mk("MUTATED mid-history content"), { dir, headers, contentEnabled: true });
    });
    assert.ok(r.wroteDiff);

    const events = (await readFile(join(dir, `${r.key}-events.jsonl`), "utf-8"))
      .trim().split("\n").map((l) => JSON.parse(l));
    const rec = events.at(-1);
    assert.equal(rec.chain.first, 7, "index 7 diverged");
    // The point of the fix: both sides are recoverable from the ledger alone.
    assert.match(rec.chain.prevContent, /ORIGINAL/);
    assert.match(rec.chain.nowContent, /MUTATED/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// Defects found by an isolated verifier against 6aa85f8 (2026-07-27). Both are
// in the per-tenant baseline machinery introduced by that commit.

test("concurrent co-tenants each keep a baseline (no lost update)", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "shared" };
  try {
    // The exact shape the per-tenant work targets: one session id, many
    // agents in flight at once. The read-modify-write of the tenants map is
    // separated by awaits, so unserialized writers clobber each other —
    // measured 1 of 10 surviving before the per-key lock.
    const reqs = [];
    for (let i = 0; i < 10; i++) {
      reqs.push(
        snapshotPrefix(
          makePayload({
            system: [{ type: "text", text: `agent ${i} system prompt` }],
            messages: [{ role: "user", content: [{ type: "text", text: `t${i}` }] }],
          }),
          { dir, headers },
        ),
      );
    }
    let results;
    await captureStderr(async () => {
      results = await Promise.all(reqs);
    });
    const json = JSON.parse(await readFile(join(dir, `${results[0].key}-last.json`), "utf-8"));
    assert.equal(Object.keys(json.tenants).length, 10, "every concurrent tenant keeps its baseline");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// --- key -> conversation map ---
//
// The definition, from the cachebust runbook's step 2: the storage key is
// `s-` + a hash of the session id, "the mapping is recorded nowhere", so a
// reader is told to select by TIME and confirm with the model. The map's
// contract is therefore: one line per key, the FIRST time that key is seen,
// carrying the session id the key hashes and the model that would otherwise
// have been the confirmation heuristic.

const keymapLines = async (dir) => {
  const txt = await readFile(join(dir, "cache-fix-keymap.jsonl"), "utf-8");
  return txt.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
};

test("keymap: a new key is recorded once, with the session id its hash hides", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "b16c607d-d484-4935-840e-e3f7ee78eb08" };
  try {
    const payload = { ...makePayload(), model: "claude-fable-5" };
    const r = await captureStderr(async () => {
      await snapshotPrefix(payload, { dir, headers });
    });
    void r;
    const rows = await keymapLines(dir);
    assert.equal(rows.length, 1, "one line for the first sighting");
    assert.equal(rows[0].key, resolveSessionKey(headers, payload.system));
    assert.equal(rows[0].sid, "b16c607d-d484-4935-840e-e3f7ee78eb08");
    assert.equal(rows[0].model, "claude-fable-5");
    assert.match(rows[0].ts, /^\d{4}-\d{2}-\d{2}T/);
    // The lookup the runbook could not do: hash -> id, in one direction the
    // hash itself does not allow.
    assert.notEqual(rows[0].key, rows[0].sid);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("keymap: later requests on a known key add nothing — it is a map, not a log", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "S1" };
  try {
    await captureStderr(async () => {
      for (let i = 0; i < 4; i++) {
        await snapshotPrefix(
          { ...makePayload({ messages: [{ role: "user", content: [{ type: "text", text: `t${i}` }] }] }),
            model: "claude-opus-5" },
          { dir, headers },
        );
      }
    });
    assert.equal((await keymapLines(dir)).length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("keymap: each key gets its own line — this is what separates main from its verifier", async () => {
  // The 2026-07-30 confusion: two conversations, two keys, and time as the
  // only discriminator. Distinct session ids must produce distinct rows.
  const dir = await newTmp();
  try {
    await captureStderr(async () => {
      await snapshotPrefix({ ...makePayload(), model: "claude-fable-5" },
                           { dir, headers: { "x-claude-code-session-id": "main-sid" } });
      await snapshotPrefix({ ...makePayload(), model: "claude-opus-5" },
                           { dir, headers: { "x-claude-code-session-id": "verifier-sid" } });
    });
    const rows = await keymapLines(dir);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map((r) => r.sid).sort(), ["main-sid", "verifier-sid"]);
    assert.equal(new Set(rows.map((r) => r.key)).size, 2, "distinct sessions, distinct keys");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("keymap: a headerless request records sid:null, not a missing field", async () => {
  // `sid: null` is a real state — the content-hash fallback key. A reader who
  // cannot tell it from an omission goes hunting for an id that never existed.
  const dir = await newTmp();
  try {
    await captureStderr(async () => {
      await snapshotPrefix({ ...makePayload(), model: "m" }, { dir });
    });
    const rows = await keymapLines(dir);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].sid, null);
    assert.ok("sid" in rows[0], "the field is present and null, never absent");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("keymap: an append failure never fails the snapshot (fail-open)", async () => {
  const dir = await newTmp();
  try {
    let wrote = null;
    await captureStderr(async () => {
      wrote = await snapshotPrefix({ ...makePayload(), model: "m" }, {
        dir,
        headers: { "x-claude-code-session-id": "S" },
        fs: { appendFile: async () => { throw new Error("disk full"); } },
      });
    });
    assert.equal(wrote.wroteSnapshot, true, "the snapshot still lands");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("keymap: an unreadable snapshot is a SEEN key — first-seen must stay first", async () => {
  // "New" is defined by the snapshot file's ABSENCE, not by the read failing.
  // A corrupt or permission-denied read means the key has been seen; appending
  // again would stamp a later ts on a line whose whole content is the FIRST
  // sighting, and would keep doing so on every request.
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "S" };
  try {
    await captureStderr(async () => {
      await snapshotPrefix({ ...makePayload(), model: "m" }, { dir, headers });
    });
    assert.equal((await keymapLines(dir)).length, 1);
    const key = resolveSessionKey(headers, makePayload().system);
    await writeFile(join(dir, `${key}-last.json`), "{not json");
    await captureStderr(async () => {
      await snapshotPrefix({ ...makePayload(), model: "m" }, { dir, headers });
    });
    assert.equal((await keymapLines(dir)).length, 1, "corrupt baseline must not re-append");
    // And a hard read failure is the same statement.
    await captureStderr(async () => {
      await snapshotPrefix({ ...makePayload(), model: "m" }, {
        dir, headers,
        fs: { readFile: async () => { const e = new Error("EACCES"); e.code = "EACCES"; throw e; } },
      });
    });
    assert.equal((await keymapLines(dir)).length, 1, "unreadable baseline must not re-append");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("buildKeymapRecord: the record is flat, bounded, and carries no payload", () => {
  const rec = buildKeymapRecord("s-abc", "sid-1", "claude-opus-5", new Date(0));
  assert.deepEqual(rec, { ts: "1970-01-01T00:00:00.000Z", key: "s-abc", sid: "sid-1", model: "claude-opus-5" });
  assert.deepEqual(buildKeymapRecord("hex", null, undefined, new Date(0)),
                   { ts: "1970-01-01T00:00:00.000Z", key: "hex", sid: null, model: null });
});

test("tenant eviction drops the oldest by timestamp, not by key order", () => {
  // Object.keys enumerates integer-like keys FIRST in ascending numeric order,
  // regardless of insertion order — and an 8-hex tenant id is all-digits about
  // one time in 16. Slicing Object.keys therefore evicted such a tenant ahead
  // of genuinely older ones. This pins the ordering rule the fix relies on.
  const obj = {};
  obj["deadbeef"] = 1;
  obj["12345678"] = 2;
  obj["cafe0000"] = 3;
  assert.equal(
    Object.keys(obj)[0],
    "12345678",
    "numeric-string keys sort to the front — key order is NOT insertion order",
  );
});

// --- Cross-key retention sweep (upstream #280 review; merged 2026-08-16) ---
//
// Upstream shipped this sweep with no tests. It is added here because the
// sweep DELETES FILES and its scope boundary is load-bearing on this fork in a
// way it is not upstream: our snapshot directory is shared with three of our
// own mitigation extensions, whose `-canon.json` / `-relocated.json` /
// `-rungs.json` files are LIVE STATE. Deleting one rotates the key its owner
// reads and busts the prefix those extensions exist to hold. Measured at merge
// time: 28,157 files in the real directory, 13,774 of them fork-owned.

async function seedSnapshots(dir, entries) {
  const { writeFile: wf, utimes } = await import("node:fs/promises");
  for (const [name, mtimeMs] of entries) {
    await wf(join(dir, name), "{}");
    await utimes(join(dir, name), new Date(mtimeMs), new Date(mtimeMs));
  }
}

// Session keys in these fixtures are the shape production actually writes —
// `s-` + 12 hex (resolveSessionKey) — not readable labels like `s-dead`. The
// scope regex anchors on that shape, so a fixture keyed `s-dead` would be
// testing a state the real system cannot produce; `skey("dead")` keeps the
// bites readable without inventing a key shape nothing generates.
const skey = (label) => {
  const hex = Buffer.from(label).toString("hex").padEnd(12, "0").slice(0, 12);
  return `s-${hex}`;
};

test("sweepSnapshotDir: stale artifacts of a dead key go, a live key's stay", async () => {
  const dir = await tmpDir("sweep-age-");
  const now = Date.now();
  const old = now - (SNAPSHOT_MAX_AGE_MS + 60_000);
  const dead = skey("dead");
  const live = skey("live");
  await seedSnapshots(dir, [
    [`${dead}-last.json`, old], [`${dead}-diff.json`, old],
    [`${dead}-events.jsonl`, old], [`${dead}-events.jsonl.1`, old],
    [`${live}-last.json`, now], [`${live}-events.jsonl`, now],
  ]);
  const res = await sweepSnapshotDir(dir, undefined, { now });
  const left = (await readdir(dir)).sort();
  assert.equal(res.deleted, 4, "all four of the dead key's artifacts go, rotated .1 included");
  assert.deepEqual(left, [`${live}-events.jsonl`, `${live}-last.json`].sort());
  assert.equal(res.keysRemaining, 1);
  await rm(dir, { recursive: true, force: true });
});

test("sweepSnapshotDir: NEVER touches the fork's own live state, however old", async () => {
  // The boundary bite. These three names are written by
  // insertion-normalization, fresh-session-sort and deferred-tool-rewrite into
  // the SAME directory. They are aged well past the TTL on purpose: age is the
  // sweep's own delete trigger, so if the scope regex ever widened, this is the
  // case that goes red instead of a cache bust showing up in production.
  const dir = await tmpDir("sweep-boundary-");
  const now = Date.now();
  const old = now - (SNAPSHOT_MAX_AGE_MS * 10);
  const survivors = [
    `${skey("aaa")}-canon.json`,
    `${skey("bbb")}-relocated.json`,
    `${skey("ccc")}-rungs.json`,
  ];
  await seedSnapshots(dir, [
    ...survivors.map((n) => [n, old]),
    // A real sweep target beside them, so a run that deletes NOTHING at all
    // cannot pass this bite by being inert.
    [`${skey("ddd")}-last.json`, old],
  ]);
  const res = await sweepSnapshotDir(dir, undefined, { now });
  const left = (await readdir(dir)).sort();
  assert.equal(res.deleted, 1, "the sweep must still be doing its job here");
  assert.deepEqual(
    left,
    [...survivors].sort(),
    "fork-owned live state survives; only prefix-diff's own artifact was swept",
  );
  await rm(dir, { recursive: true, force: true });
});

// The bite the boundary test above MISSED, and the reason it missed it is the
// point: that test seeds `-canon.json` / `-relocated.json` / `-rungs.json`,
// which the scope regex never matched, so it was green on the day the sweep
// was deleting 13,699 co-tenant files in production. A check whose name claims
// "the fork's own live state" while its body covers only the families that
// were never at risk is the degrading-check shape — it passes while exercising
// less than it claims.
//
// The families below are the ones actually at risk: insertion-normalization,
// deferred-tool-rewrite and output-guard all name their per-session event logs
// `<key>-<family>-events.jsonl` into THIS directory. An unanchored `(.+)` in
// SNAPSHOT_FILE_RE swallows the family infix, so each read as one of this
// module's own artifacts under a synthetic key. Measured against the live
// directory 2026-08-16: of the 14,545 files the regex reached, 846 were
// prefix-diff's own and 13,699 belonged to other extensions.
test("sweepSnapshotDir: a co-tenant's event log is NOT this sweep's to delete", async () => {
  const dir = await tmpDir("sweep-cotenant-");
  const now = Date.now();
  const old = now - (SNAPSHOT_MAX_AGE_MS * 10);
  // A real key shape: `s-` + sha256(session-id).slice(0,12) (resolveSessionKey).
  const key = "s-3ce1c5cda120";
  const foreign = [
    `${key}-insertion-events.jsonl`,
    `${key}-insertion-events.jsonl.1`,
    `${key}-deferred-tool-events.jsonl`,
    `${key}-guard-events.jsonl`,
  ];
  await seedSnapshots(dir, [
    ...foreign.map((n) => [n, old]),
    // prefix-diff's own artifact beside them, aged the same, so a run that
    // deletes NOTHING cannot pass this bite by being inert.
    [`${key}-last.json`, old],
  ]);
  const res = await sweepSnapshotDir(dir, undefined, { now });
  const left = (await readdir(dir)).sort();
  assert.equal(res.deleted, 1,
    "exactly one file here is prefix-diff's own; the rest are other extensions'");
  assert.deepEqual(left, [...foreign].sort(),
    "every co-tenant event log survives, however far past the TTL");
});

// The bite above pins the three families that exist TODAY. This one is the
// reach check: it asks the extension SOURCES which per-session artifact names
// they write, rather than restating a list beside them — a hardcoded roster
// cannot age loudly, and the next extension to add a `-events.jsonl` family
// would land inside the sweep's blast radius with every existing test green.
test("SNAPSHOT_FILE_RE reaches no artifact name another extension writes", async () => {
  const { readdir: rd, readFile: rf } = await import("node:fs/promises");
  const extDir = new URL("../proxy/extensions/", import.meta.url);
  const files = (await rd(extDir)).filter((f) => f.endsWith(".mjs"));

  // `join(dir, `${sessionKey}-<literal>`)` is how every writer in this
  // directory names its per-session artifact. Capture the literal tail.
  const NAME_RE = /\$\{[A-Za-z_$][\w$]*\}(-[A-Za-z0-9._-]+)/g;
  const byOwner = new Map();
  for (const f of files) {
    const src = await rf(new URL(f, extDir), "utf-8");
    for (const m of src.matchAll(NAME_RE)) {
      if (!/\.(json|jsonl)$/.test(m[1])) continue;
      if (!byOwner.has(f)) byOwner.set(f, new Set());
      byOwner.get(f).add(m[1]);
    }
  }

  // Instrument-positive: a scan that matched nothing would satisfy the
  // assertion below vacuously, so prove it found the writers we already know.
  const owned = byOwner.get("prefix-diff.mjs") ?? new Set();
  assert.ok(owned.has("-last.json") && owned.has("-events.jsonl"),
    `the scan must see prefix-diff's own names; got ${JSON.stringify([...owned])}`);
  assert.ok((byOwner.get("insertion-normalization.mjs") ?? new Set()).has("-insertion-events.jsonl"),
    "the scan must see insertion-normalization's event log");

  const trespass = [];
  for (const [owner, tails] of byOwner) {
    if (owner === "prefix-diff.mjs") continue;
    for (const tail of tails) {
      // Probe with a real key shape, which is what production produces.
      if (SNAPSHOT_FILE_RE.test(`s-3ce1c5cda120${tail}`)) trespass.push(`${owner}: ${tail}`);
    }
  }
  assert.deepEqual(trespass, [],
    `the sweep's scope regex claims files these extensions own:\n${trespass.join("\n")}`);
});

test("the shipped key cap is the declared bridge value, and it is still declared", async () => {
  // Two assertions because the doctrine has two halves. This repo's rule on
  // retention knobs (docs/dev-loop.md, closing-gate question 2) is that a
  // stopgap may be TAKEN but ships named as a bridge, with the durable fix
  // stated and a revert trigger written where the knob lives. A value pin alone
  // would let the next raise land as a silent permanent default, which is the
  // failure the rule exists to stop — so the DECLARATION is pinned too, read
  // out of the source rather than restated here.
  assert.equal(SNAPSHOT_MAX_KEYS, 2000, "the 2026-09-21 bridge value");
  const src = await readFile(
    new URL("../proxy/extensions/prefix-diff.mjs", import.meta.url),
    "utf8",
  );
  assert.match(src, /REVERT TRIGGER:/,
    "the knob must carry its revert trigger — a bridge with no way back is a default");
  assert.match(src, /DECLARED BRIDGE/,
    "and it must say it is a bridge, where the knob lives");
});

test("sweepSnapshotDir: key cap evicts the oldest keys, newest activity wins", async () => {
  const dir = await tmpDir("sweep-cap-");
  const now = Date.now();
  const entries = [];
  // An EXPLICIT cap, not the production constant: this test is about the cap
  // pass's BEHAVIOUR, and keying it to the shipped value made the fixture size
  // track that value — at the 2026-09-21 bridge (200 -> 2000) it would have
  // seeded ~6,000 files to assert an eviction of three. The shipped value gets
  // its own pin instead (see "the shipped key cap is the declared bridge
  // value"), so neither check rides on the other.
  const maxKeys = 8;
  const capKey = (i) => `s-${String(i).padStart(12, "0")}`;
  for (let i = 0; i < maxKeys + 3; i++) {
    entries.push([`${capKey(i)}-last.json`, now - i * 1000]);
  }
  await seedSnapshots(dir, entries);
  const res = await sweepSnapshotDir(dir, undefined, { now, maxKeys });
  assert.equal(res.deleted, 3, "exactly the overflow beyond the cap");
  assert.equal(res.keysRemaining, maxKeys);
  const left = await readdir(dir);
  assert.ok(left.includes(`${capKey(0)}-last.json`), "the most recently touched key survives");
  assert.ok(!left.includes(`${capKey(maxKeys + 2)}-last.json`),
            "the oldest key is the one evicted");
  await rm(dir, { recursive: true, force: true });
});

test("sweepSnapshotDir: a missing directory is not an error", async () => {
  const res = await sweepSnapshotDir(join(await tmpDir("sweep-enoent-"), "nope"));
  assert.deepEqual(res, { deleted: 0, keysRemaining: 0 });
});

test("groupSnapshotFiles: groups by key and ignores every foreign name", () => {
  const a = skey("a");
  const b = skey("b");
  const byKey = groupSnapshotFiles([
    `${a}-last.json`, `${a}-diff.json`, `${a}-events.jsonl`, `${a}-events.jsonl.1`,
    `${b}-last.json`,
    `${a}-canon.json`, `${a}-relocated.json`, `${a}-rungs.json`,
    "README", "gate-status.json", `${a}-events.jsonl.2`,
    // Co-tenant event logs. Before the key anchor these grouped under the
    // synthetic keys `<a>-insertion` and `<a>-deferred-tool`, which is how
    // 13,699 files became this sweep's to delete.
    `${a}-insertion-events.jsonl`, `${a}-deferred-tool-events.jsonl`,
    `${a}-guard-events.jsonl`,
    // A key of the wrong shape entirely: neither `s-`+12hex nor bare 12hex.
    "s-notakey-last.json",
  ]);
  assert.deepEqual([...byKey.keys()].sort(), [a, b].sort());
  assert.equal(byKey.get(a).length, 4, "only the four owned artifact names");
  assert.ok(!byKey.get(a).some((n) => /canon|relocated|rungs|insertion|deferred|guard/.test(n)));
});

test("groupSnapshotFiles: the headerless-request fallback key still groups", () => {
  // computeSessionKey (no session-id header) returns a BARE 12-hex key with no
  // `s-` prefix. The anchor covers both shapes because both are produced.
  const byKey = groupSnapshotFiles(["a1b2c3d4e5f6-last.json", "a1b2c3d4e5f6-events.jsonl"]);
  assert.deepEqual([...byKey.keys()], ["a1b2c3d4e5f6"]);
  assert.equal(byKey.get("a1b2c3d4e5f6").length, 2);
});

// Upstream's bite, taken in the same merge: this fork's tenantId already hashes
// the full text, but nothing pinned it, and the defect it guards against
// (truncating before hashing) merges two agents that differ only past the cut.
test("tenantId: two prompts sharing a long preamble must not collide — hash the FULL text", () => {
  const preamble = "You are a Claude agent. ".repeat(40); // ~960 chars, shared
  const longA = tenantId({}, [{ type: "text", text: preamble + "TASK A" }]);
  const longB = tenantId({}, [{ type: "text", text: preamble + "TASK B" }]);
  assert.notEqual(longA, longB, "a truncated hash merges tenants that differ only past the cut");
});

// ---------------------------------------------------------------------------
// Conversation-keyed baselines (2026-09-20). Measured on capture s-captureBY:
// one session id carried 441 requests under ONE tenant — the desk's 10 deep
// requests and 431 of CC's own sidecars, because tenantId hashes the first
// system block and CC gives its sidecars the desk's. The desk's baseline was
// overwritten between every pair of its own requests, which blocked attributing
// 2,105,642 cache-write tokens.
//
// Each test below names the behaviour it pins. The earlier version of this work
// shipped 5 behaviours pinned by 1 test, and four wrong implementations passed
// the whole file; these exist so that cannot recur.

const SYS_CC = [{ type: "text", text: "You are Claude Code, Anthropic's official CLI for Claude." }];
function convPayload(n, tag = "desk") {
  return makePayload({
    system: SYS_CC,
    tools: [{ name: "Read" }, { name: "Bash" }],
    messages: Array.from({ length: n }, (_, i) => ({
      role: i % 2 ? "assistant" : "user",
      content: [{ type: "text", text: `${tag} turn ${i}` }],
    })),
  });
}
async function eventsOf(dir, key) {
  const raw = await readFile(join(dir, `${key}-events.jsonl`), "utf-8").catch(() => "");
  return raw.trim() ? raw.trim().split("\n").map((l) => JSON.parse(l)) : [];
}

// BEHAVIOUR 1: the conversation half of the key.
test("conv-key: same tenant, different conversations keep separate baselines", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "desk-session" };
  try {
    await snapshotPrefix(convPayload(6), { dir, headers, conv: "deskconv" });
    await captureStderr(async () => {
      await snapshotPrefix(makePayload({ system: SYS_CC, tools: [], messages: [{ role: "user", content: [{ type: "text", text: "name this session" }] }] }), { dir, headers, conv: "sidecar-1" });
    });
    let r;
    const err = await captureStderr(async () => {
      r = await snapshotPrefix(convPayload(8), { dir, headers, conv: "deskconv" });
    });
    const last = (await eventsOf(dir, r.key)).at(-1);
    assert.equal(last.msgs, "6->8", "the desk diffs against its own previous request, not the sidecar's");
    assert.equal(last.toolsMatch, true, "the sidecar's empty tools are not ours");
    assert.ok(!last.crossTenant, "a co-conversation is not a cross-tenant fallback");
    assert.doesNotMatch(String(err), /CROSS-TENANT/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// BEHAVIOUR 2: the TENANT half of the key — dropped in the rejected design and
// pinned by nothing, so `bkey = conv` alone passed the whole suite.
test("conv-key: same conversation id under DIFFERENT tenants does not silently share a baseline", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "two-agents" };
  const withSys = (text, n) => makePayload({
    system: [{ type: "text", text }],
    messages: Array.from({ length: n }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: [{ type: "text", text: `t${i}` }] })),
  });
  try {
    await snapshotPrefix(withSys("You are agent A", 30), { dir, headers, conv: "shared-first-message" });
    let r;
    const err = await captureStderr(async () => {
      r = await snapshotPrefix(withSys("You are agent B", 4), { dir, headers, conv: "shared-first-message" });
    });
    const last = (await eventsOf(dir, r.key)).at(-1);
    // Pinned SPECIFICALLY, not as "labelled somehow": the disjunction
    // `systemTenantChanged || crossTenant` is satisfied by the fallback path
    // too, so it cannot tell the conversation-match branch from a blind
    // last-writer fallback — measured, by a mutant that neutered the match and
    // still passed. An assertion both the correct and the defective behaviour
    // satisfy pins nothing.
    assert.equal(
      last.systemTenantChanged,
      true,
      "the same-conversation match must fire and be labelled as such",
    );
    assert.match(String(err), /SYSTEM-TENANT-CHANGED/, "and labelled on stderr too");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// BEHAVIOUR 3: no silent drop. This is the defect that was silent by
// construction in the rejected design — a messages[0] rotation cost the whole
// event: no diff, no ledger line, no stderr line.
test("conv-key: a rotated conversation id still produces a LABELLED diff, never silence", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "rotating" };
  try {
    await snapshotPrefix(convPayload(10), { dir, headers, conv: "before-rotation" });
    let r;
    const err = await captureStderr(async () => {
      r = await snapshotPrefix(convPayload(12), { dir, headers, conv: "after-rotation" });
    });
    const events = await eventsOf(dir, r.key);
    assert.equal(events.length, 1, "the event must exist — a dropped diff is the defect");
    assert.equal(events[0].crossTenant, true, "and be marked, so it is not read as a cause");
    assert.match(String(err), /CROSS-TENANT/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// BEHAVIOUR 4: the persisted conv field — the read path matches on it, and
// nothing pinned it before.
test("conv-key: the conversation is persisted on the stored baseline", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "persist" };
  try {
    const r = await snapshotPrefix(convPayload(4), { dir, headers, conv: "deskconv" });
    const json = JSON.parse(await readFile(join(dir, `${r.key}-last.json`), "utf-8"));
    assert.equal(json.tenants[json.lastTenant].conv, "deskconv", "without this the cross-system match cannot find it");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// BEHAVIOUR 5a — the comparator's own defect class (judgment desk's condition):
// one-shot shallow conversations must not evict a live deep baseline.
test("eviction: a flood of one-shot conversations does not evict a live deep baseline", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "flood" };
  try {
    await snapshotPrefix(convPayload(40), { dir, headers, conv: "deepconv" });
    await captureStderr(async () => {
      for (let i = 0; i < 24; i++) {
        await snapshotPrefix(makePayload({ system: SYS_CC, messages: [{ role: "user", content: [{ type: "text", text: `one-shot ${i}` }] }] }), { dir, headers, conv: `oneshot-${i}` });
      }
    });
    let r;
    await captureStderr(async () => { r = await snapshotPrefix(convPayload(42), { dir, headers, conv: "deepconv" }); });
    const last = (await eventsOf(dir, r.key)).at(-1);
    assert.equal(last.msgs, "40->42", "the deep baseline survived the flood");
    assert.ok(!last.crossTenant, "and it was its OWN baseline, not a labelled fallback");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// BEHAVIOUR 5b — the other half of the comparator's defect class: depth must
// not make a DEAD entry immortal. Without the staleness horizon, deep entries
// outrank every live shallow one forever and a young conversation can never
// establish a baseline.
test("eviction: a dead deep entry does not outrank live entries forever", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "stale" };
  try {
    // The horizon is driven through the test seam rather than by performing
    // 512 real writes: proving a boundary by bulk is slow enough to get
    // skipped later, and it proves it less exactly than construction does.
    const staleAfterWrites = 4;
    // One very deep conversation, then abandoned.
    await snapshotPrefix(convPayload(300, "dead"), { dir, headers, conv: "dead-deep", staleAfterWrites });
    // Sustained traffic well past the horizon.
    await captureStderr(async () => {
      for (let i = 0; i < 20; i++) {
        await snapshotPrefix(makePayload({ system: SYS_CC, messages: [{ role: "user", content: [{ type: "text", text: `live ${i}` }] }] }), { dir, headers, conv: `live-${i}`, staleAfterWrites });
      }
    });
    const r = await snapshotPrefix(makePayload({ system: SYS_CC, messages: [{ role: "user", content: [{ type: "text", text: "final" }] }] }), { dir, headers, conv: "final", staleAfterWrites });
    const json = JSON.parse(await readFile(join(dir, `${r.key}-last.json`), "utf-8"));
    const survivors = Object.values(json.tenants);
    assert.ok(
      !survivors.some((b) => b.conv === "dead-deep"),
      "a deep entry abandoned past the staleness horizon must be evictable despite its depth",
    );
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// BEHAVIOUR 6 — the fallback is UNCONDITIONAL, pinned on a DOWNWARD rotation.
//
// This arrangement exists because its absence let a refuted design pass the
// whole suite. A "plausible predecessor" gate (candidate no deeper than the
// incoming body) was built here and measured on a real capture: it suppressed
// 28 of 520 labels — 5.4% of labels, 2.7% of events — and silently dropped 28
// events, every one from the one class it could ever affect —
// a predecessor DEEPER than the incoming request, i.e. compaction and array
// shrinkage. The existing rotation test rotates UPWARD (10 -> 12 messages), so
// candidate <= incoming passes and it stayed green under that gate. Only a
// downward rotation fires on it.
test("fallback: a DOWNWARD rotation still produces a labelled diff, never silence", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "downward" };
  try {
    await snapshotPrefix(convPayload(300, "deep"), { dir, headers, conv: "before-compaction" });
    let r;
    const err = await captureStderr(async () => {
      // The continuation after a compaction: new conversation key, and a body
      // far SHALLOWER than the baseline it left behind.
      r = await snapshotPrefix(convPayload(4, "after"), { dir, headers, conv: "after-compaction" });
    });
    const events = await eventsOf(dir, r.key);
    assert.equal(events.length, 1, "the event must exist — a silent drop here is the defect");
    assert.equal(events[0].crossTenant, true, "and be labelled, so it is not read as a cause");
    assert.match(String(err), /CROSS-TENANT/, "and say so on stderr");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// BEHAVIOUR 7 — the PER-ENTRY seq write, and why it needs its own test.
//
// Found by a review mutant that ran fully GREEN: deleting
// `tenants[bkey] = { ...tenants[bkey], seq }` leaves every stored entry reading
// seqOf() === 0, so `seq - 0 > STALE_AFTER_WRITES` flips true for EVERY entry at
// once as soon as the file's counter passes the horizon. The comparator then
// degenerates to its stale tier, where depth is never consulted ��� silently
// removing the deep-baseline protection this whole change exists to provide.
//
// Behaviour 5b cannot catch it: with a small horizon and a short run,
// "everything is stale" and "the dead deep one is stale" give the same answer.
// The discriminator is a LIVE deep entry — one that keeps writing — which must
// survive past the horizon precisely because its own seq keeps advancing.
test("eviction: a LIVE deep entry that keeps writing survives past the staleness horizon", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "live-past-horizon" };
  const staleAfterWrites = 4;
  try {
    let depth = 300;
    await snapshotPrefix(convPayload(depth, "live"), { dir, headers, conv: "live-deep", staleAfterWrites });
    // Sustained one-shot traffic far past the horizon, with the deep
    // conversation continuing to write throughout — as a real desk does.
    await captureStderr(async () => {
      for (let i = 0; i < 24; i++) {
        await snapshotPrefix(
          makePayload({ system: SYS_CC, messages: [{ role: "user", content: [{ type: "text", text: `one-shot ${i}` }] }] }),
          { dir, headers, conv: `oneshot-${i}`, staleAfterWrites },
        );
        if (i % 6 === 5) {
          depth += 2;
          await snapshotPrefix(convPayload(depth, "live"), { dir, headers, conv: "live-deep", staleAfterWrites });
        }
      }
    });
    let r;
    await captureStderr(async () => {
      depth += 2;
      r = await snapshotPrefix(convPayload(depth, "live"), { dir, headers, conv: "live-deep", staleAfterWrites });
    });
    const last = (await eventsOf(dir, r.key)).at(-1);
    assert.equal(last.msgs, `${depth - 2}->${depth}`, "the live deep conversation diffed against its OWN previous request");
    assert.ok(!last.crossTenant, "so it was never evicted and never needed the labelled fallback");
    // Pin the WRITE directly, not only its consequence. The interleaving above
    // does not discriminate on its own: under the seq-write mutant every entry
    // reads stale, ties on seqOf, and eviction falls back to insertion order —
    // which a re-written entry keeps escaping, so the mutant survived this test
    // while breaking the mechanism. The stored entry's own counter is the
    // unambiguous evidence that the write happened.
    const json = JSON.parse(await readFile(join(dir, `${r.key}-last.json`), "utf-8"));
    assert.equal(
      json.tenants[json.lastTenant].seq,
      json.seq,
      "the entry just written carries the file's current seq — without the per-entry write it carries none, every entry reads stale at once, and depth is never consulted",
    );
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// BEHAVIOUR 8 — "newest match wins" in the same-conversation scan. The code
// states it as a decision ("insertion order is not recency"); a review mutant
// reversing the comparison ran green, because every existing test presents only
// one candidate with a matching conv. An unpinned documented claim.
test("conv-key: the same-conversation scan takes the NEWEST matching baseline", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "newest-wins" };
  const withSys = (text, n) => makePayload({
    system: [{ type: "text", text }],
    messages: Array.from({ length: n }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: [{ type: "text", text: `t${i}` }] })),
  });
  try {
    // Same conv, three different tenants. The middle one is written LAST before
    // the probe, so it is the newest match; its depth is what the diff must show.
    await snapshotPrefix(withSys("agent A", 6), { dir, headers, conv: "shared" });
    await captureStderr(async () => { await snapshotPrefix(withSys("agent B", 14), { dir, headers, conv: "shared" }); });
    let r;
    await captureStderr(async () => { r = await snapshotPrefix(withSys("agent C", 20), { dir, headers, conv: "shared" }); });
    const last = (await eventsOf(dir, r.key)).at(-1);
    assert.equal(last.msgs, "14->20", "the newest matching baseline (14) is the predecessor, not the oldest (6)");
    assert.equal(last.systemTenantChanged, true, "and the match is labelled as a system-prompt change");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// BEHAVIOUR 9 — the LEGACY and MIXED seq populations in the recency scan.
//
// Recency is keyed on `seq`, which only exists on entries written since
// 2026-09-20. Every entry the tests above write carries one, so those tests are
// same-parentage with the change and cannot exercise a file that predates it.
// These two do, by writing the baseline file by hand.
test("conv-key: a seq-bearing baseline outranks a legacy one without seq", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "mixed-seq" };
  const mk = (n, extra) => ({
    timestamp: "2026-09-20T23:59:59.000Z", messageCount: n, toolsHash: "h", systemHash: "h",
    params: [], systemBlocks: [], toolsDetail: [], messageHashes: [], prefixMessages: [],
    tailMessages: [], markerMessages: [], betaHeader: null, conv: "shared", ...extra,
  });
  const withSys = (text, n) => makePayload({
    system: [{ type: "text", text }],
    messages: Array.from({ length: n }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: [{ type: "text", text: `t${i}` }] })),
  });
  try {
    const probe = await snapshotPrefix(withSys("agent probe", 3), { dir, headers, conv: "unrelated" });
    // Hand-built file: the LEGACY entry carries the NEWER timestamp, so a
    // timestamp-keyed scan would wrongly prefer it. seq must win.
    await writeFile(join(dir, `${probe.key}-last.json`), JSON.stringify({
      tenants: {
        "aaaaaaaa:shared": mk(11, { timestamp: "2026-09-21T00:00:05.000Z" }),   // legacy: no seq
        "bbbbbbbb:shared": mk(17, { seq: 4 }),                                   // modern
      },
      lastTenant: "bbbbbbbb:shared",
      seq: 4,
    }), "utf-8");
    let r;
    await captureStderr(async () => { r = await snapshotPrefix(withSys("agent C", 25), { dir, headers, conv: "shared" }); });
    const last = (await eventsOf(dir, r.key)).at(-1);
    assert.equal(last.msgs, "17->25", "the seq-bearing entry wins over a legacy one with a newer timestamp");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("conv-key: an all-legacy file falls back to timestamp order without throwing", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "all-legacy" };
  const mk = (n, ts) => ({
    timestamp: ts, messageCount: n, toolsHash: "h", systemHash: "h", params: [], systemBlocks: [],
    toolsDetail: [], messageHashes: [], prefixMessages: [], tailMessages: [], markerMessages: [],
    betaHeader: null, conv: "shared",
  });
  const withSys = (text, n) => makePayload({
    system: [{ type: "text", text }],
    messages: Array.from({ length: n }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: [{ type: "text", text: `t${i}` }] })),
  });
  try {
    const probe = await snapshotPrefix(withSys("agent probe", 3), { dir, headers, conv: "unrelated" });
    // No `seq` anywhere — neither per entry nor at the top level, exactly as a
    // file written before this change looks.
    await writeFile(join(dir, `${probe.key}-last.json`), JSON.stringify({
      tenants: {
        "aaaaaaaa:shared": mk(11, "2026-09-20T10:00:00.000Z"),
        "bbbbbbbb:shared": mk(19, "2026-09-20T12:00:00.000Z"),
      },
      lastTenant: "bbbbbbbb:shared",
    }), "utf-8");
    let r;
    await captureStderr(async () => { r = await snapshotPrefix(withSys("agent C", 25), { dir, headers, conv: "shared" }); });
    const last = (await eventsOf(dir, r.key)).at(-1);
    assert.equal(last.msgs, "19->25", "all recencies tie at -1, so the newer TIMESTAMP decides — the pre-change behaviour");
  } finally { await rm(dir, { recursive: true, force: true }); }
});
