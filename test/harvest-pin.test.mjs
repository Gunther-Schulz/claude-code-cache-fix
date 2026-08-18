// harvest --pin — BACKLOG.md "READY — harvest --pin freezes evidence
// ranges as fixtures".
//
// Motivating instances: test/insertion-suppression.test.mjs and
// test/mitigation-output-form.test.mjs both replay a specific real capture
// (s-captureA, pair n=26->28) and SKIP once that capture rotates out of the
// per-machine retention window (~3 days, docs/dev-loop.md "Corpus
// hygiene"). `harvest --pin <key> <n..m>` freezes the sanitized range as a
// committed, rotation-immune fixture; both real-pair tests fall back to it
// when the live capture is gone.
//
// Two things have to hold or the mechanism is worse than useless:
//   - the pin mechanism itself: it writes a sanitized, well-formed fixture
//     (unit-level, tiny synthetic capture);
//   - the FALLBACK actually works on the real files: capture-absent +
//     fixture-absent skips (never a false pass), capture-absent +
//     fixture-present runs and PASSES using the real committed fixture
//     (never a false fail) — checked by literally invoking the two
//     real-pair test files as subprocesses with env overrides, never by
//     re-deriving their assertions here.

import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

import { parsePinRange, pinRange, pinRangeBounded, readPinnedFixture } from "../tools/harvest.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");
const HARVEST_CLI = join(REPO, "tools", "harvest.mjs");

// --- parsePinRange ---

test("parsePinRange: n..m parses to {n, m}", () => {
  assert.deepEqual(parsePinRange("26..28"), { n: 26, m: 28 });
  assert.deepEqual(parsePinRange("0..0"), { n: 0, m: 0 });
});

test("parsePinRange: malformed range throws", () => {
  assert.throws(() => parsePinRange("28"), /--pin range must look like/);
  assert.throws(() => parsePinRange("a..b"), /--pin range must look like/);
  assert.throws(() => parsePinRange(undefined), /--pin range must look like/);
});

test("parsePinRange: end before start throws", () => {
  assert.throws(() => parsePinRange("3..1"), /end must be >= start/);
});

// --- pinRange: sanitized, well-formed, over a tiny synthetic capture ---

const SECRET = "the operator's actual private project detail";

async function writeTinyCapture(dir) {
  const path = join(dir, "s-tiny0000-requests.jsonl");
  const lines = [
    JSON.stringify({ ts: "2026-01-01T00:00:00Z", type: "boot", pid: 1, proxyTree: "abc123", gates: { X: "1" } }),
    JSON.stringify({
      ts: "2026-01-01T00:00:01Z",
      sid: "s-tiny0000",
      key: "s-tiny0000",
      headers: { "anthropic-beta": "x" },
      body: { model: "claude-sonnet-5", system: "sys0", messages: [{ role: "user", content: [{ type: "text", text: SECRET }] }] },
    }),
    JSON.stringify({
      ts: "2026-01-01T00:00:02Z",
      type: "outcome",
      id: "out-1",
      key: "s-tiny0000",
      requestId: "req-1",
      model: "claude-sonnet-5",
      usage: { cacheRead: 0, cacheCreation: 0, inputTokens: 10, outputTokens: 1 },
      outSha: "deadbeef",
      outBytes: 100,
      ms: 5,
    }),
    JSON.stringify({
      ts: "2026-01-01T00:00:03Z",
      sid: "s-tiny0000",
      key: "s-tiny0000",
      headers: { "anthropic-beta": "x" },
      body: {
        model: "claude-sonnet-5",
        system: "sys0",
        messages: [
          { role: "user", content: [{ type: "text", text: SECRET }] },
          { role: "assistant", content: [{ type: "text", text: "a reply" }] },
          { role: "user", content: [{ type: "text", text: "a second message" }] },
        ],
      },
    }),
  ];
  await writeFile(path, lines.join("\n") + "\n");
  return path;
}

test("pinRange: sanitized (no raw secret text), shape preserved, range covers boot/outcome/request through m", async () => {
  const dir = await tmpDir("harvest-pin-");
  const path = await writeTinyCapture(dir);

  const records = await pinRange(path, 1);
  const raw = JSON.stringify(records);

  assert.ok(!raw.includes(SECRET), "no raw content leaks into the pinned fixture");
  assert.equal(records.filter((r) => r.type === "boot").length, 1, "boot record kept for gate provenance");
  assert.equal(records.filter((r) => r.type === "outcome").length, 1, "outcome record kept (the one before m)");
  const requests = records.filter((r) => r.type !== "boot" && r.type !== "outcome");
  assert.equal(requests.length, 2, "both request 0 and request 1 (the pinned range's full prefix) are present");
  assert.ok(requests[0].body.messages[0].content[0].text.startsWith("t_"), "request text is tokenized");
  assert.equal(requests[0].sid, requests[1].sid, "identity hashing is deterministic across records");
});

test("pinRange: m beyond available requests throws rather than writing a truncated fixture", async () => {
  const dir = await tmpDir("harvest-pin-");
  const path = await writeTinyCapture(dir);
  await assert.rejects(() => pinRange(path, 5), /has only 2 request record\(s\), cannot pin through m=5/);
});

// --- CLI end-to-end: the actual entry point, not a re-derivation of it ---

// The sanitized token that names the fixture, stated from its DEFINITION
// (docs/directives/fixture-sanitization-directive.md, settled design 2: a
// conversation key becomes "s-" + the first 12 hex of its sha256) rather than
// imported from tools/harvest.mjs — an expectation with the same parentage as
// the code pins the bug it should catch.
const KEY_TOKEN = `s-${createHash("sha256").update("s-tiny0000").digest("hex").slice(0, 12)}`;

test("harvest --pin CLI: writes pinned-<s-sha12>-<n>-<m>.json, no session key in the name, header or records", async () => {
  const dir = await tmpDir("harvest-pin-cli-");
  const capturesDir = join(dir, "captures");
  const outDir = join(dir, "out");
  await mkdir(capturesDir, { recursive: true });
  await writeTinyCapture(capturesDir);

  const stdout = execFileSync(
    process.execPath,
    [HARVEST_CLI, "--captures", capturesDir, "--out", outDir, "--pin", "s-tiny0000", "0..1"],
    { encoding: "utf-8" },
  );
  assert.match(stdout, /pinned 4 record\(s\), range 0\.\.1/);

  const outPath = join(outDir, `pinned-${KEY_TOKEN}-0-1.json`);
  assert.ok(existsSync(outPath), "fixture written at the expected name (the key's s-<sha12> token, never the session key)");

  const fixture = JSON.parse(await readFile(outPath, "utf-8"));
  assert.equal(fixture.header.key, KEY_TOKEN);
  assert.deepEqual(fixture.header.range, { n: 0, m: 1 });
  assert.equal(fixture.header.replayFrom, 0);
  assert.ok(fixture.header.sanitizer, "sanitizer note present");
  assert.ok(fixture.header.harvestedAt, "harvest date present");
  const serialized = JSON.stringify(fixture);
  assert.ok(!serialized.includes(SECRET), "no raw content leaks through the CLI path either");
  assert.ok(!serialized.includes("s-tiny0000"), "the raw conversation key leaks nowhere — header, records or metadata");
  // Rebased, not stamped: the capture's own 2026-01-01 wall-clock is gone and
  // the deltas between records survive (boot at +0s, the two requests at +1s
  // and +3s, matching writeTinyCapture's spacing).
  assert.equal(fixture.records[0].ts, "2000-01-01T00:00:00.000Z");
  assert.deepEqual(
    fixture.records.map((r) => Date.parse(r.ts) - Date.parse(fixture.records[0].ts)),
    [0, 1000, 2000, 3000],
  );
  assert.ok(!serialized.includes("2026-01-01"), "no live wall-clock survives");
});

test("harvest --pin CLI: unknown key exits non-zero with a stated reason, writes nothing", async () => {
  const dir = await tmpDir("harvest-pin-cli-");
  const capturesDir = join(dir, "captures");
  const outDir = join(dir, "out");
  await mkdir(capturesDir, { recursive: true });
  await writeTinyCapture(capturesDir);

  assert.throws(() =>
    execFileSync(
      process.execPath,
      [HARVEST_CLI, "--captures", capturesDir, "--out", outDir, "--pin", "s-nope", "0..1"],
      { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] },
    ),
  );
  assert.ok(!existsSync(join(outDir, "pinned-s-nope-0-1.json")));
});

// --- readPinnedFixture: round-trips through the same [n, line] tuple shape readCapture yields ---

test("readPinnedFixture: yields [n, line] tuples whose parsed records match what was pinned", async () => {
  const dir = await tmpDir("harvest-pin-");
  const capturePath = await writeTinyCapture(dir);
  const records = await pinRange(capturePath, 1);
  const fixturePath = join(dir, "pinned-s-tiny0000-0-1.json");
  await writeFile(
    fixturePath,
    JSON.stringify({ header: { key: "s-tiny0000", range: { n: 0, m: 1 } }, records }) + "\n",
  );

  const seen = [];
  for await (const [n, line] of readPinnedFixture(fixturePath)) {
    seen.push([n, JSON.parse(line)]);
  }
  assert.equal(seen.length, records.length);
  assert.deepEqual(
    seen.map(([, r]) => r),
    // Compared through the same JSON round-trip the fixture file itself
    // applies (JSON.stringify drops `undefined`-valued keys such as a
    // tools-less body's `tools: undefined` from scrubRecord) — the fixture
    // on disk never carries those keys either, so this is the fidelity
    // contract that actually matters, not raw in-memory equality.
    JSON.parse(JSON.stringify(records)),
    "round-trips exactly — same records the pin wrote",
  );
  assert.deepEqual(
    seen.map(([n]) => n),
    records.map((_, i) => i),
    "indices are 0-based and contiguous, same shape readCapture's own [n, line] yields",
  );
});

// =====================================================================
// pinRange's own outcome records — BACKLOG.md "harvest --pin excludes
// the pinned pair's own outcome records"
// =====================================================================
//
// The proxy writes a request's OUTCOME only once the response completes,
// which can land in the capture file after later requests' own lines — so
// breaking out of the read loop the instant ordinal m is pushed excluded
// exactly the evidence a pin is usually taken FOR (a billing or coalescing
// claim, which lives only in the outcome/coalesced records). These bites
// pin THROUGH the request that used to be the truncation point and check
// what shows up after it, never through a LATER request standing in for
// the fix (the old workaround this entry retires).

const KEY2_TOKEN = `s-${createHash("sha256").update("s-late0000").digest("hex").slice(0, 12)}`;

// A capture whose pinned range's own outcome for the LAST pinned request
// (m=1) arrives after an unrelated filler line — proving the lookahead
// resolves it without absorbing the filler as an extra request record.
async function writeCaptureWithLateOutcome(dir) {
  const path = join(dir, "s-late0000-requests.jsonl");
  const lines = [
    JSON.stringify({ ts: "2026-01-01T00:00:00Z", type: "boot", pid: 1, proxyTree: "abc123", gates: { X: "1" } }),
    JSON.stringify({
      ts: "2026-01-01T00:00:01Z",
      id: "req-0",
      sid: "s-late0000",
      key: "s-late0000",
      headers: { "anthropic-beta": "x" },
      body: { model: "claude-sonnet-5", system: "sys0", messages: [{ role: "user", content: [{ type: "text", text: SECRET }] }] },
    }),
    JSON.stringify({
      ts: "2026-01-01T00:00:02Z",
      type: "outcome",
      id: "req-0",
      key: "s-late0000",
      requestId: "up-0",
      model: "claude-sonnet-5",
      usage: { cacheRead: 0, cacheCreation: 0, inputTokens: 10, outputTokens: 1 },
      outSha: null,
      outBytes: null,
      ms: 5,
    }),
    JSON.stringify({
      ts: "2026-01-01T00:00:03Z",
      id: "req-1",
      sid: "s-late0000",
      key: "s-late0000",
      headers: { "anthropic-beta": "x" },
      body: {
        model: "claude-sonnet-5",
        system: "sys0",
        messages: [
          { role: "user", content: [{ type: "text", text: SECRET }] },
          { role: "assistant", content: [{ type: "text", text: "a reply" }] },
          { role: "user", content: [{ type: "text", text: "a second message" }] },
        ],
      },
    }),
    // Filler: a request belonging to a DIFFERENT key, one line past the
    // pinned request. It must never be absorbed into the pin's own request
    // set — only outcome/coalesced records are chased past m.
    JSON.stringify({
      ts: "2026-01-01T00:00:04Z",
      id: "req-filler",
      sid: "s-unrelated00",
      key: "s-unrelated00",
      headers: { "anthropic-beta": "x" },
      body: { model: "claude-sonnet-5", system: "sysX", messages: [{ role: "user", content: [{ type: "text", text: "unrelated" }] }] },
    }),
    // req-1's own outcome, arriving after the filler — this is the record
    // the old code excluded by construction.
    JSON.stringify({
      ts: "2026-01-01T00:00:05Z",
      type: "outcome",
      id: "req-1",
      key: "s-late0000",
      requestId: "up-1",
      model: "claude-sonnet-5",
      usage: { cacheRead: 0, cacheCreation: 0, inputTokens: 12, outputTokens: 3 },
      outSha: null,
      outBytes: null,
      ms: 7,
    }),
  ];
  await writeFile(path, lines.join("\n") + "\n");
  return path;
}

test("pinRange: chases the last pinned request's own outcome past m, without absorbing an intervening request", async () => {
  const dir = await tmpDir("harvest-pin-late-");
  const path = await writeCaptureWithLateOutcome(dir);

  const records = await pinRange(path, 1);

  assert.equal(records.filter((r) => r.type === "outcome").length, 2, "both req-0's and req-1's outcome records are present");
  const requests = records.filter((r) => r.type !== "boot" && r.type !== "outcome");
  assert.equal(requests.length, 2, "the filler request one line past m is NOT absorbed into the pin");
  assert.deepEqual(records.outcomes, { resolved: [0, 1], unresolved: [] }, "both pinned ordinals resolved");
});

// n..m scoping — coordinator follow-up (2026-08-18): the chase must cover
// only the ANNOUNCED pair n..m, never the whole 0..m prefix. Measured on
// the real row-31 range: chasing 0..m swept up 90 unrelated outcome records
// (5 -> 95) because ordinal 0 has no outcome anywhere in that capture, so
// the lookahead ran to its bound trying to resolve an ordinal nobody
// pinned. Reusing writeCaptureWithLateOutcome here (where ordinal 0's own
// outcome DOES exist, arriving inline before m) proves the exclusion is by
// SCOPE, not by coincidence of absence: pinning n=1 must drop ordinal 0
// from both outcomes lists even though its outcome is sitting right there
// in the fixture's own records.
test("pinRange: outcomes scope is n..m, not 0..m — an in-scope-content ordinal below n is excluded from both lists", async () => {
  const dir = await tmpDir("harvest-pin-scope-");
  const path = await writeCaptureWithLateOutcome(dir);

  const records = await pinRange(path, 1, 1); // n=1, m=1 — only ordinal 1 is pinned
  assert.deepEqual(
    records.outcomes,
    { resolved: [1], unresolved: [] },
    "ordinal 0 is prefix context, not a pinned ordinal — it must not appear in either list, even though req-0's own outcome record is present in records[]",
  );
  assert.deepEqual(records.outcomeScope, { n: 1, m: 1 });
  // The header-facing scope contract, not just the internal one: records
  // themselves are unaffected by n — the full 0..m prefix is still written.
  const requests = records.filter((r) => r.type !== "boot" && r.type !== "outcome");
  assert.equal(requests.length, 2, "n narrows the CHASE only — the written request set is still the full 0..m prefix");
});

// A capture truncated right after the pinned request: its own outcome
// never arrives at all. The lookahead exhausts by running off the end of
// the file, never by hitting the record/byte bound — and the ordinal must
// report unresolved rather than the loop silently accepting EOF as success.
async function writeCaptureTruncatedAfterPin(dir) {
  const path = join(dir, "s-trunc0000-requests.jsonl");
  const lines = [
    JSON.stringify({ ts: "2026-01-01T00:00:00Z", type: "boot", pid: 1, proxyTree: "abc123", gates: { X: "1" } }),
    JSON.stringify({
      ts: "2026-01-01T00:00:01Z",
      id: "t-0",
      sid: "s-trunc0000",
      key: "s-trunc0000",
      headers: { "anthropic-beta": "x" },
      body: { model: "claude-sonnet-5", system: "sys0", messages: [{ role: "user", content: [{ type: "text", text: SECRET }] }] },
    }),
    JSON.stringify({
      ts: "2026-01-01T00:00:02Z",
      type: "outcome",
      id: "t-0",
      key: "s-trunc0000",
      requestId: "up-t0",
      model: "claude-sonnet-5",
      usage: { cacheRead: 0, cacheCreation: 0, inputTokens: 10, outputTokens: 1 },
      outSha: null,
      outBytes: null,
      ms: 5,
    }),
    JSON.stringify({
      ts: "2026-01-01T00:00:03Z",
      id: "t-1",
      sid: "s-trunc0000",
      key: "s-trunc0000",
      headers: { "anthropic-beta": "x" },
      body: {
        model: "claude-sonnet-5",
        system: "sys0",
        messages: [
          { role: "user", content: [{ type: "text", text: SECRET }] },
          { role: "assistant", content: [{ type: "text", text: "a reply" }] },
          { role: "user", content: [{ type: "text", text: "a second message" }] },
        ],
      },
    }),
    // Nothing after t-1: the capture ends here, exactly like a fresh
    // capture that has not yet seen t-1 answered.
  ];
  await writeFile(path, lines.join("\n") + "\n");
  return path;
}

test("pinRange: lookahead exhausted by EOF (not the bound) reports the last ordinal unresolved", async () => {
  const dir = await tmpDir("harvest-pin-trunc-");
  const path = await writeCaptureTruncatedAfterPin(dir);

  const records = await pinRange(path, 1);

  assert.equal(records.filter((r) => r.type === "outcome").length, 1, "only t-0's own outcome ever existed in this capture");
  assert.deepEqual(records.outcomes, { resolved: [0], unresolved: [1] }, "t-1's own outcome never arrived");
});

test("pinRange: the 200-record lookahead bound stops the chase before an outcome past it", async () => {
  const dir = await tmpDir("harvest-pin-bound-");
  const path = join(dir, "s-bound0000-requests.jsonl");
  const lines = [
    JSON.stringify({ ts: "2026-01-01T00:00:00Z", type: "boot", pid: 1, proxyTree: "abc123", gates: { X: "1" } }),
    JSON.stringify({
      ts: "2026-01-01T00:00:01Z",
      id: "b-0",
      sid: "s-bound0000",
      key: "s-bound0000",
      headers: { "anthropic-beta": "x" },
      body: { model: "claude-sonnet-5", system: "sys0", messages: [{ role: "user", content: [{ type: "text", text: SECRET }] }] },
    }),
    JSON.stringify({
      ts: "2026-01-01T00:00:01.500Z",
      type: "outcome",
      id: "b-0",
      key: "s-bound0000",
      requestId: "up-b0",
      model: "claude-sonnet-5",
      usage: { cacheRead: 0, cacheCreation: 0, inputTokens: 10, outputTokens: 1 },
      outSha: null,
      outBytes: null,
      ms: 5,
    }),
    JSON.stringify({
      ts: "2026-01-01T00:00:02Z",
      id: "b-1",
      sid: "s-bound0000",
      key: "s-bound0000",
      headers: { "anthropic-beta": "x" },
      body: {
        model: "claude-sonnet-5",
        system: "sys0",
        messages: [
          { role: "user", content: [{ type: "text", text: SECRET }] },
          { role: "assistant", content: [{ type: "text", text: "a reply" }] },
          { role: "user", content: [{ type: "text", text: "a second message" }] },
        ],
      },
    }),
  ];
  // 205 filler lines (neither outcome nor coalesced) between m and the
  // real outcome — past OUTCOME_LOOKAHEAD_MAX_RECORDS (200).
  for (let i = 0; i < 205; i++) {
    lines.push(JSON.stringify({ filler: i }));
  }
  lines.push(
    JSON.stringify({
      ts: "2026-01-01T00:00:03Z",
      type: "outcome",
      id: "b-1",
      key: "s-bound0000",
      requestId: "up-b1",
      model: "claude-sonnet-5",
      usage: { cacheRead: 0, cacheCreation: 0, inputTokens: 10, outputTokens: 1 },
      outSha: null,
      outBytes: null,
      ms: 5,
    }),
  );
  await writeFile(path, lines.join("\n") + "\n");

  const records = await pinRange(path, 1);
  assert.equal(records.filter((r) => r.type === "outcome").length, 1, "only b-0's inline outcome — b-1's sits past the bound and is never reached");
  assert.deepEqual(records.outcomes, { resolved: [0], unresolved: [1] }, "b-1 reports unresolved, not a false resolve");
});

// --- pinRangeBounded shares the same chase — coordinator follow-up
// (2026-08-18): the two functions share the exact break-at-m loop shape,
// but tracing that by hand is not the same as exercising it — pinRangeBounded
// computes its own requestIds set (KEPT ordinals only) independently of
// pinRange's, so a defect specific to that computation would not show up in
// any pinRange bite. RED-FIRST, run by hand against this same capture before
// this test was written (tools/harvest.mjs as of the base commit the
// outcome-chase fix branched from, invoked in place so its relative imports
// resolved): OLD pinRangeBounded(capture, 0) returned {records: [boot,
// request], kept: 1, placeholders: 0} — 2 records, 0 outcomes, no
// `.outcomes` key on the return value at all. This test pins the NEW code
// and asserts the fixed shape.
async function writeBoundedChaseCapture(dir) {
  const path = join(dir, "s-bndchase00-requests.jsonl");
  const lines = [
    JSON.stringify({ ts: "2026-01-01T00:00:00Z", type: "boot", pid: 1, proxyTree: "abc123", gates: {} }),
    JSON.stringify({
      ts: "2026-01-01T00:00:01Z",
      id: "bt-0",
      sid: "s-bndchase00",
      key: "s-bndchase00",
      headers: { "anthropic-beta": "x" },
      body: { model: "claude-sonnet-5", system: "sys0", messages: [{ role: "user", content: [{ type: "text", text: "chase-msg" }] }] },
    }),
    // Unrelated filler, one line past the target (ordinal m=0) — must not
    // be absorbed as a request record, in bounded mode exactly as in
    // unbounded (the lookahead only ever pushes outcome/coalesced types).
    JSON.stringify({
      ts: "2026-01-01T00:00:02Z",
      id: "bt-filler",
      sid: "s-unrelated0",
      key: "s-unrelated0",
      headers: { "anthropic-beta": "x" },
      body: { model: "claude-sonnet-5", system: "sysX", messages: [{ role: "user", content: [{ type: "text", text: "unrelated filler" }] }] },
    }),
    JSON.stringify({
      ts: "2026-01-01T00:00:03Z",
      type: "outcome",
      id: "bt-0",
      key: "s-bndchase00",
      requestId: "up-bt0",
      model: "claude-sonnet-5",
      usage: { cacheRead: 0, cacheCreation: 0, inputTokens: 10, outputTokens: 1 },
      outSha: null,
      outBytes: null,
      ms: 5,
    }),
  ];
  await writeFile(path, lines.join("\n") + "\n");
  return path;
}

test("pinRangeBounded: chases the target's own outcome past m too, without absorbing the intervening filler", async () => {
  const dir = await tmpDir("harvest-pin-bounded-chase-");
  const path = await writeBoundedChaseCapture(dir);

  const res = await pinRangeBounded(path, 0, 0);
  assert.equal(res.kept, 1, "the target itself is always kept — it trivially matches its own conversation");
  assert.equal(res.placeholders, 0, "the filler sits past m and is never evaluated for retention at all");
  assert.equal(res.records.filter((r) => r.type === "outcome").length, 1, "the target's own outcome, chased past m");
  const requests = res.records.filter((r) => r.type !== "boot" && r.type !== "outcome");
  assert.equal(requests.length, 1, "the filler is not absorbed as a request record");
  assert.deepEqual(res.outcomes, { resolved: [0], unresolved: [] });
  assert.deepEqual(res.outcomeScope, { n: 0, m: 0 });
});

// =====================================================================
// coalesce-miss — a THIRD non-request record type (desk change, threat
// matrix row 31's negative evidence: a duplicate sidecar send that was NOT
// coalesced, and why). Before this record type existed, pinRange and
// pinRangeBounded special-cased exactly two non-request types (boot,
// outcome, coalesced) and treated everything else as a request — so a
// coalesce-miss record would take a REQUEST ORDINAL it does not own,
// shifting every later ordinal and scrubbing a bodyless record as if it
// had one.
//
// RED-FIRST, run by hand (not asserted here — the prior code no longer
// exists in this tree to assert against) against git commit e268d69's
// tools/harvest.mjs, invoked in place inside tools/ so its relative
// imports resolved, deleted immediately after: pinRange(capture, 1, 0)
// over the capture writeCoalesceMissCapture below produced 3 records —
// boot, the real first request, and the coalesce-miss record MISREAD as a
// second request with 0 messages (scrubRecord on a record with no `body`
// field) — and the REAL second request never appeared at all, silently
// dropped because the ordinal it should have owned was already spent.
async function writeCoalesceMissCapture(dir) {
  const path = join(dir, "s-cmiss0000-requests.jsonl");
  const lines = [
    JSON.stringify({ ts: "2026-01-01T00:00:00Z", type: "boot", pid: 1, proxyTree: "abc123", gates: {} }),
    JSON.stringify({
      ts: "2026-01-01T00:00:01Z",
      id: "cm-0",
      sid: "s-cmiss0000",
      key: "s-cmiss0000",
      headers: { "anthropic-beta": "x" },
      body: { model: "claude-sonnet-5", system: "sys0", messages: [{ role: "user", content: [{ type: "text", text: "first request" }] }] },
    }),
    JSON.stringify({
      ts: "2026-01-01T00:00:01.010Z",
      type: "coalesce-miss",
      id: "cm-follower",
      key: "s-cmiss0000",
      leaderId: "cm-0",
      sha: "abc123abc123abc1",
      reason: "tombstone",
      ageMs: 120,
      arrivalDeltaMs: 45,
    }),
    JSON.stringify({
      ts: "2026-01-01T00:00:02Z",
      id: "cm-1",
      sid: "s-cmiss0000",
      key: "s-cmiss0000",
      headers: { "anthropic-beta": "x" },
      body: { model: "claude-sonnet-5", system: "sys0", messages: [{ role: "user", content: [{ type: "text", text: "second real request" }] }] },
    }),
  ];
  await writeFile(path, lines.join("\n") + "\n");
  return path;
}

test("pinRange: a coalesce-miss record between two requests does not shift request ordinals, and survives scrubbed", async () => {
  const dir = await tmpDir("harvest-pin-cmiss-");
  const path = await writeCoalesceMissCapture(dir);

  const records = await pinRange(path, 1, 0);
  assert.equal(records.length, 4, "boot + request 0 + the coalesce-miss record + request 1 — none absorbed, none dropped");

  const requests = records.filter((r) => !r.type);
  assert.equal(requests.length, 2, "exactly two request records — the coalesce-miss record took neither ordinal");
  assert.equal(requests[0].body.messages[0].content[0].text.startsWith("t_"), true, "request 0's real content, tokenized");
  assert.equal(requests[1].body.messages[0].content[0].text.startsWith("t_"), true, "request 1 is the REAL second request, not the miss record misread as one");

  const cmiss = records.find((r) => r.type === "coalesce-miss");
  assert.ok(cmiss, "the coalesce-miss record is preserved, not dropped and not merged into a request slot");
  assert.notEqual(cmiss.id, "cm-follower", "id is hashed through the same id_<sha8> scheme as outcome/coalesced");
  assert.notEqual(cmiss.leaderId, "cm-0", "leaderId is hashed too — the follower->leader join survives, just tokenized");
  assert.equal(cmiss.sha, "abc123abc123abc1", "sha is a scalar digest, not conversation content — rides through unchanged");
  assert.equal(cmiss.reason, "tombstone");
  assert.equal(cmiss.ageMs, 120);
  assert.equal(cmiss.arrivalDeltaMs, 45);
  assert.equal(JSON.stringify(records).includes("cm-follower"), false, "the raw id leaks nowhere in the pinned fixture");
});

test("pinRange: a coalesce-miss record does NOT resolve a pinned ordinal, even when its own id matches one", async () => {
  const dir = await tmpDir("harvest-pin-cmiss-noresolve-");
  const path = join(dir, "s-cmissnr0000-requests.jsonl");
  const lines = [
    JSON.stringify({ ts: "2026-01-01T00:00:00Z", type: "boot", pid: 1, proxyTree: "abc123", gates: {} }),
    JSON.stringify({
      ts: "2026-01-01T00:00:01Z",
      id: "nr-0",
      sid: "s-cmissnr0000",
      key: "s-cmissnr0000",
      headers: { "anthropic-beta": "x" },
      body: { model: "claude-sonnet-5", system: "sys0", messages: [{ role: "user", content: [{ type: "text", text: "only request" }] }] },
    }),
    // Past m: a coalesce-miss record whose own `id` matches the pinned
    // request's raw id — a completion record with this id WOULD resolve
    // it (see the outcome/coalesced tests above); this must not.
    JSON.stringify({
      ts: "2026-01-01T00:00:02Z",
      type: "coalesce-miss",
      id: "nr-0",
      key: "s-cmissnr0000",
      leaderId: "nr-somebody-else",
      sha: "deadbeefdeadbeef",
      reason: "arrival-race",
      ageMs: 30,
      arrivalDeltaMs: 12,
    }),
  ];
  await writeFile(path, lines.join("\n") + "\n");

  const records = await pinRange(path, 0, 0);
  assert.equal(records.filter((r) => r.type === "coalesce-miss").length, 1, "the record is still preserved");
  assert.deepEqual(records.outcomes, { resolved: [], unresolved: [0] }, "coalesce-miss is not a completion record — only outcome/coalesced resolve an ordinal");
});

test("harvest --pin CLI: fully resolved outcomes — header field and the unqualified-billing verification line", async () => {
  const dir = await tmpDir("harvest-pin-late-cli-");
  const capturesDir = join(dir, "captures");
  const outDir = join(dir, "out");
  await mkdir(capturesDir, { recursive: true });
  await writeCaptureWithLateOutcome(capturesDir);

  const stdout = execFileSync(
    process.execPath,
    [HARVEST_CLI, "--captures", capturesDir, "--out", outDir, "--pin", "s-late0000", "0..1"],
    { encoding: "utf-8" },
  );
  assert.match(stdout, /pin verified: reproduces the live stability\/census verdicts over records 0\.\.1/);
  assert.match(stdout, /outcomes resolved for all 2 pinned ordinal\(s\)/);
  assert.doesNotMatch(stdout, /does NOT carry billing/);

  const outPath = join(outDir, `pinned-${KEY2_TOKEN}-0-1.json`);
  const fixture = JSON.parse(await readFile(outPath, "utf-8"));
  assert.deepEqual(fixture.header.outcomes, { resolved: [0, 1], unresolved: [] });
});

test("harvest --pin CLI: unresolved outcome — header field and the narrowed no-billing-evidence line", async () => {
  const dir = await tmpDir("harvest-pin-trunc-cli-");
  const capturesDir = join(dir, "captures");
  const outDir = join(dir, "out");
  await mkdir(capturesDir, { recursive: true });
  await writeCaptureTruncatedAfterPin(capturesDir);

  const stdout = execFileSync(
    process.execPath,
    [HARVEST_CLI, "--captures", capturesDir, "--out", outDir, "--pin", "s-trunc0000", "0..1"],
    { encoding: "utf-8" },
  );
  // Still a reproduces-the-replayed-verdicts success (arm b's whole point:
  // a lookahead that always succeeds would pass arm (a) alone) — but
  // narrowed, and the billing claim explicitly withheld.
  assert.match(stdout, /pin verified: reproduces the live stability\/census verdicts over records 0\.\.1/);
  assert.match(stdout, /1 pinned ordinal\(s\) unresolved \(1\): this pin does NOT carry billing or coalescing evidence/);

  const truncToken = `s-${createHash("sha256").update("s-trunc0000").digest("hex").slice(0, 12)}`;
  const outPath = join(outDir, `pinned-${truncToken}-0-1.json`);
  const fixture = JSON.parse(await readFile(outPath, "utf-8"));
  assert.deepEqual(fixture.header.outcomes, { resolved: [0], unresolved: [1] });
});

// =====================================================================
// Fallback red-green — the actual real-pair tests, run as subprocesses
// =====================================================================
//
// Not a re-derivation of what insertion-suppression.test.mjs and
// mitigation-output-form.test.mjs assert: this literally invokes them with
// env overrides (CACHE_FIX_TEST_CAPTURE_OVERRIDE /
// CACHE_FIX_TEST_FIXTURE_OVERRIDE, both files) pointed at nonexistent paths
// or at the real committed fixture, and reads their own TAP output — the
// only way to know the fallback genuinely works end to end rather than
// merely compiling. Never touches the real capture file
// (~/.claude/cache-fix-captures/s-captureA-...), which is read-only
// evidence.

const REAL_PAIR_TESTS = [
  { file: "mitigation-output-form.test.mjs", namePattern: "mitigation output-form: real capture n=26" },
  { file: "insertion-suppression.test.mjs", namePattern: "real capture n=26->28: pin-and-suppress" },
];
const COMMITTED_FIXTURE = join(__dirname, "fixtures", "harvested", "pinned-s-4b6a435234bf-26-28.json");

// --test-reporter=tap: a stable, greppable "# pass N" / "# skipped N" / "#
// fail N" summary — the default reporter's exact wording ("ℹ pass N", no
// leading "#") is not a documented contract to grep against.
//
// NODE_TEST_CONTEXT / NODE_TEST_WORKER_ID must NOT reach the child: this
// file itself runs under `node --test`, which sets both; inherited by a
// NESTED `node --test` invocation, the child silently emits nothing to
// stdout (observed directly — reporter output present unset, empty string
// captured when inherited) rather than erroring, which would have looked
// like a false "fallback broken" red instead of a harness artifact.
function runRealPairTest({ file, namePattern }, env) {
  const childEnv = { ...process.env, ...env };
  delete childEnv.NODE_TEST_CONTEXT;
  delete childEnv.NODE_TEST_WORKER_ID;
  const result = execFileSync(
    process.execPath,
    ["--test", "--test-reporter=tap", `--test-name-pattern=${namePattern}`, join(__dirname, file)],
    { encoding: "utf-8", cwd: REPO, env: childEnv, stdio: ["ignore", "pipe", "pipe"] },
  );
  return result;
}

for (const spec of REAL_PAIR_TESTS) {
  test(`fallback RED: ${spec.file} skips (not fails) when capture and fixture are both absent`, () => {
    const out = runRealPairTest(spec, {
      CACHE_FIX_TEST_CAPTURE_OVERRIDE: "/nonexistent/no-such-capture.jsonl",
      CACHE_FIX_TEST_FIXTURE_OVERRIDE: "/nonexistent/no-such-fixture.json",
    });
    assert.match(out, /# pass 0/);
    assert.match(out, /# skipped 1/);
    assert.match(out, /COULD NOT VERIFY/);
  });

  test(`fallback GREEN: ${spec.file} runs and passes from the committed pinned fixture when the capture is absent`, () => {
    assert.ok(existsSync(COMMITTED_FIXTURE), "the committed n=26->28 fixture must exist for this check to mean anything");
    const out = runRealPairTest(spec, {
      CACHE_FIX_TEST_CAPTURE_OVERRIDE: "/nonexistent/no-such-capture.jsonl",
    });
    assert.match(out, /# pass 1/);
    assert.match(out, /# fail 0/);
  });
}
