// duplicate-adjacency-probe — adjacent byte-identical requests measured under
// TWO competing definitions (arm CONV: same-conversation adjacency, the
// shipped findDuplicateRequests; arm FILE: global file adjacency, the likely
// shape of the throwaway 2026-07-29 scan), so the two numbers can be compared
// directly instead of re-derived by hand.
//
// Red-first, in the order the brief commissioned it: POSITIVE first, because
// a NEGATIVE zero is unreadable on its own — it is indistinguishable from an
// arm that never fired at all. Only once the positive is shown lighting up
// both arms does the negative's zero mean anything.
//
// Namespace import (docs/dev-loop.md, "AND THE COMMONEST WAY TO COLLAPSE THE
// SPLIT IS THE IMPORT LINE"): a missing export fails its own call site
// instead of failing the whole module at ESM link time, so a partially wired
// tool shows exactly which bite it broke.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { tmpDir } from "../tools/tmpdir.mjs";
import * as probe from "../tools/duplicate-adjacency-probe.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOL = join(__dirname, "..", "tools", "duplicate-adjacency-probe.mjs");

const user = (t) => ({ role: "user", content: [{ type: "text", text: t }] });
const asst = (t) => ({ role: "assistant", content: [{ type: "text", text: t }] });

let seq = 0;
const reqLine = (sid, msgs) => {
  const n = ++seq;
  return JSON.stringify({
    ts: `2026-08-01T00:00:${String(n % 60).padStart(2, "0")}.000Z`,
    id: `r${n}`,
    sid,
    key: sid,
    headers: {},
    body: { model: "claude-test", messages: msgs },
  });
};

async function captureOf(lines, name = "capture.jsonl") {
  const dir = await tmpDir("dup-adj-test-");
  const p = join(dir, name);
  await writeFile(p, lines.length ? lines.join("\n") + "\n" : "");
  return p;
}

// --- red-first: the three commissioned bites, in order ---------------------

test("POSITIVE: one adjacent byte-identical pair — both arms report 1 duplicate over 2 compared pairs", async () => {
  const dupBody = [user("hello"), asst("hi"), user("same")];
  const capture = await captureOf([
    reqLine("s-a", [user("hello")]),
    reqLine("s-a", dupBody),
    reqLine("s-a", dupBody),
  ]);
  const r = await probe.measureOne(capture);

  assert.equal(r.fileArm.duplicates, 1, "arm FILE must fire on the real defect");
  assert.equal(r.fileArm.compared, 2, "arm FILE compared both adjacent pairs");
  assert.equal(r.convArm.duplicates, 1, "arm CONV must fire on the real defect");
  assert.equal(r.convArm.compared, 2, "arm CONV compared both adjacent pairs");
});

test("NEGATIVE: strictly appending — both arms report 0 over 2 compared (readable only because POSITIVE above just fired both arms)", async () => {
  const capture = await captureOf([
    reqLine("s-a", [user("hello")]),
    reqLine("s-a", [user("hello"), asst("hi")]),
    reqLine("s-a", [user("hello"), asst("hi"), user("more")]),
  ]);
  const r = await probe.measureOne(capture);

  assert.equal(r.fileArm.duplicates, 0);
  assert.equal(r.fileArm.compared, 2, "the zero is over real comparisons, not an arm that never ran");
  assert.equal(r.convArm.duplicates, 0);
  assert.equal(r.convArm.compared, 2);
});

test("DISCRIMINATION: an interleaved different-conversation request splits the two definitions", async () => {
  // Same shape as docs/dev-loop.md's "Never hand-roll identity in a probe"
  // 07-29/07-30 split: a subagent request lands between the two sends of the
  // main conversation. Conversation adjacency still sees the duplicate; file
  // adjacency loses it because the interleaved request sits between the pair.
  const dupBody = [user("hello"), asst("hi"), user("same")];
  const capture = await captureOf([
    reqLine("s-a", dupBody),
    reqLine("s-b", [user("other")]),
    reqLine("s-a", dupBody),
  ]);
  const r = await probe.measureOne(capture);

  assert.equal(r.convArm.duplicates, 1, "same-conversation adjacency sees the duplicate across the interleaved request");
  assert.equal(r.convArm.compared, 1, "only s-a's own pair was compared under grouping");
  assert.equal(r.fileArm.duplicates, 0, "file adjacency loses it: the interleaved request breaks the pair apart");
  assert.equal(r.fileArm.compared, 2, "both file-adjacent pairs were still compared — the miss is a definition, not a skip");
});

// --- adjacentDuplicateCount, directly ---------------------------------------

test("adjacentDuplicateCount: empty inHash arrays are excluded, per findDuplicateRequests' own definition", () => {
  const r = probe.adjacentDuplicateCount([[], [], ["h1"]]);
  assert.equal(r.compared, 2, "both pairs were still walked");
  assert.equal(r.duplicates, 0, "an empty-array pair proves nothing was sent, so it is not a match");
});

test("adjacentDuplicateCount: unequal-length arrays are not a match", () => {
  const r = probe.adjacentDuplicateCount([["a"], ["a", "b"]]);
  assert.equal(r.compared, 1);
  assert.equal(r.duplicates, 0);
});

test("adjacentDuplicateCount: a single hash array has nothing to compare against", () => {
  const r = probe.adjacentDuplicateCount([["a", "b"]]);
  assert.equal(r.compared, 0);
  assert.equal(r.duplicates, 0);
});

// --- pin (.json) plumbing ----------------------------------------------------

test("a .json pin is measured by re-emitting .records as JSONL, never by feeding the .json straight to replay.mjs", async () => {
  const dupBody = [user("hello"), asst("hi"), user("same")];
  const dir = await tmpDir("dup-adj-pin-");
  const pinPath = join(dir, "pinned-s-test-1-2.json");
  const boot = { ts: "2000-01-01T00:00:00.000Z", type: "boot", pid: 1, proxyTree: "deadbeef", gates: {} };
  const req = (n, msgs) => ({
    ts: "2000-01-01T00:00:00.000Z", id: `r${n}`, sid: "s-test", key: "s-test", headers: {},
    body: { model: "claude-test", messages: msgs },
  });
  const pin = {
    header: { key: "s-test", range: { n: 1, m: 2 } },
    records: [boot, req(1, dupBody), req(2, dupBody)],
  };
  await writeFile(pinPath, JSON.stringify(pin));

  const r = await probe.measureOne(pinPath);
  assert.equal(r.kind, "pin");
  assert.equal(r.totalRecords, 3, "the boot record is counted in totalRecords");
  assert.equal(r.requestRecords, 2, "the boot record is excluded from requestRecords (isCaptureRequestRecord)");
  assert.equal(r.fileArm.duplicates, 1);
  assert.equal(r.fileArm.compared, 1);
  assert.equal(r.convArm.duplicates, 1, "arm CONV over a pin is only reachable via the re-emitted JSONL");
  assert.equal(r.convArm.compared, 1);
});

test("an unrecognized extension is a could-not-verify, not a silent skip", async () => {
  const dir = await tmpDir("dup-adj-ext-");
  const p = join(dir, "not-a-capture.txt");
  await writeFile(p, "irrelevant");
  await assert.rejects(() => probe.measureOne(p), /unrecognized extension/);
});

test("a missing file is a could-not-verify, not a folded zero", async () => {
  await assert.rejects(() => probe.measureOne("/nonexistent/path/does-not-exist.jsonl"), /ENOENT/);
});

// --- CLI wiring, end to end --------------------------------------------------

test("CLI --json: one readable input and one missing input — the missing one is named and excluded from totals", async () => {
  const dupBody = [user("hello"), asst("hi"), user("same")];
  const capture = await captureOf([
    reqLine("s-a", [user("hello")]),
    reqLine("s-a", dupBody),
    reqLine("s-a", dupBody),
  ]);
  const res = spawnSync("node", [TOOL, "--json", capture, "/nonexistent/missing.jsonl"], { encoding: "utf8" });
  assert.equal(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout);

  assert.equal(out.measured, 1);
  assert.equal(out.couldNotVerify, 1);
  assert.equal(out.failures.length, 1);
  assert.equal(out.failures[0].path, "missing.jsonl");
  // The failed input must not silently fold into the totals as a zero — it
  // is absent from them entirely, and the totals reflect only what measured.
  assert.equal(out.totals.fileDuplicates, 1);
  assert.equal(out.totals.fileCompared, 2);
  assert.equal(out.totals.convDuplicates, 1);
  assert.equal(out.totals.convCompared, 2);
});

test("CLI human-readable output: no message content, only counts/ordinals/basenames", async () => {
  const capture = await captureOf(
    [
      reqLine("s-a", [user("SECRET-PAYLOAD-marker")]),
      reqLine("s-a", [user("SECRET-PAYLOAD-marker"), asst("reply")]),
    ],
    "s-secretsid-requests.jsonl",
  );
  const res = spawnSync("node", [TOOL, capture], { encoding: "utf8" });
  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.stdout.includes("SECRET-PAYLOAD-marker"), false, "message content must never reach the report");
  assert.equal(res.stdout.includes("s-secretsid-requests.jsonl"), true, "the basename is fine to print");
});

test("CLI with no paths: usage message, exit 2", () => {
  const res = spawnSync("node", [TOOL], { encoding: "utf8" });
  assert.equal(res.status, 2);
  assert.match(res.stderr, /usage:/);
});

test("totals sum across multiple readable inputs", async () => {
  const a = await captureOf(
    [reqLine("s-a", [user("x")]), reqLine("s-a", [user("x"), asst("y")])],
    "a-requests.jsonl",
  );
  const dupBody = [user("z")];
  const b = await captureOf(
    [reqLine("s-b", dupBody), reqLine("s-b", dupBody)],
    "b-requests.jsonl",
  );
  const res = spawnSync("node", [TOOL, "--json", a, b], { encoding: "utf8" });
  assert.equal(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout);

  assert.equal(out.measured, 2);
  assert.equal(out.couldNotVerify, 0);
  assert.equal(out.totals.fileCompared, 2, "1 pair from a + 1 pair from b");
  assert.equal(out.totals.fileDuplicates, 1, "only b's pair was identical");
  assert.equal(out.totals.convCompared, 2);
  assert.equal(out.totals.convDuplicates, 1);
});
