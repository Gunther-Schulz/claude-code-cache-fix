import { test } from "node:test";
import assert from "node:assert/strict";

import { queuedAppend } from "../proxy/extensions/append-queue.mjs";

// Bare fs.appendFile does not reliably tear on this machine at ~1MB sizes
// (node's own buffering can happen to land atomically depending on platform
// and size), so the interleave is driven deterministically: a mock
// fs.appendFile that splits its data into chunks and yields the event loop
// between each chunk write, mirroring the real defect mechanism (node
// splitting a large buffer across multiple write() syscalls, letting two
// concurrent async callers interleave mid-line). Two concurrent calls
// against this mock, without serialization, are proven below to tear.
function makeChunkedFs() {
  const store = new Map(); // path -> accumulated string
  return {
    fs: {
      async appendFile(path, data) {
        const str = String(data);
        const chunks = 8;
        const size = Math.ceil(str.length / chunks);
        for (let i = 0; i < str.length; i += size) {
          await new Promise((resolve) => setImmediate(resolve)); // yield mid-buffer
          const chunk = str.slice(i, i + size);
          store.set(path, (store.get(path) || "") + chunk);
        }
      },
    },
    read: (path) => store.get(path) || "",
  };
}

function makeRecord(marker) {
  // ~1MB payload with a distinct marker, matching the bite's fixture shape
  // (flap probe fact 4: torn ~1MB lines).
  return JSON.stringify({ marker, pad: marker.repeat(1_000_000) }) + "\n";
}

function parsedLines(content) {
  return content.split("\n").filter(Boolean);
}

test("RED — bare appendFile interleaves two concurrent large appends into an unparseable file", async () => {
  const { fs, read } = makeChunkedFs();
  const path = "/virtual/capture-red.jsonl";
  const dataA = makeRecord("A");
  const dataB = makeRecord("B");

  await Promise.all([fs.appendFile(path, dataA), fs.appendFile(path, dataB)]);

  const lines = parsedLines(read(path));
  let tornOrWrongCount = lines.length !== 2;
  if (!tornOrWrongCount) {
    for (const line of lines) {
      try {
        JSON.parse(line);
      } catch {
        tornOrWrongCount = true;
      }
    }
  }
  assert.ok(
    tornOrWrongCount,
    "RED baseline: unserialized concurrent appends to the same path must tear " +
      "(observed via the chunked-yield mock) — if this assertion fails, the mock " +
      "stopped exercising the interleave and the bite below proves nothing",
  );
});

test("BITE — queuedAppend serializes two concurrent large appends into exactly two intact lines", async () => {
  const { fs, read } = makeChunkedFs();
  const path = "/virtual/capture-green.jsonl";
  const dataA = makeRecord("A");
  const dataB = makeRecord("B");

  await Promise.all([queuedAppend(path, dataA, fs), queuedAppend(path, dataB, fs)]);

  const lines = parsedLines(read(path));
  assert.equal(lines.length, 2, "no torn line, no merged line — exactly two records");
  const parsed = lines.map((l) => JSON.parse(l));
  const markers = parsed.map((r) => r.marker).sort();
  assert.deepEqual(markers, ["A", "B"], "both records present and intact");
  assert.equal(parsed.find((r) => r.marker === "A").pad.length, 1_000_000);
  assert.equal(parsed.find((r) => r.marker === "B").pad.length, 1_000_000);
});

test("queuedAppend: different paths are not serialized against each other", async () => {
  const { fs, read } = makeChunkedFs();
  const pathA = "/virtual/session-a.jsonl";
  const pathB = "/virtual/session-b.jsonl";

  await Promise.all([
    queuedAppend(pathA, makeRecord("A"), fs),
    queuedAppend(pathB, makeRecord("B"), fs),
  ]);

  assert.equal(parsedLines(read(pathA)).length, 1);
  assert.equal(parsedLines(read(pathB)).length, 1);
});

test("queuedAppend: a rejected append does not poison later appends to the same path", async () => {
  let calls = 0;
  const store = new Map();
  const fs = {
    async appendFile(path, data) {
      calls++;
      if (calls === 1) throw new Error("disk full");
      store.set(path, (store.get(path) || "") + data);
    },
  };
  const path = "/virtual/fail-then-succeed.jsonl";

  await assert.rejects(queuedAppend(path, "first\n", fs), /disk full/);
  await queuedAppend(path, "second\n", fs);

  assert.equal(store.get(path), "second\n", "the second append still lands");
});

test("queuedAppend: sequential appends to the same path preserve order", async () => {
  const { fs, read } = makeChunkedFs();
  const path = "/virtual/order.jsonl";
  await Promise.all([
    queuedAppend(path, "1\n", fs),
    queuedAppend(path, "2\n", fs),
    queuedAppend(path, "3\n", fs),
  ]);
  assert.equal(read(path), "1\n2\n3\n");
});
