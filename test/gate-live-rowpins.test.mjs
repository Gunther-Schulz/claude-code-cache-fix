// The daily sweep pins row evidence but freezes NOTHING when a replay
// ERRORS — BACKLOG.md "READY 2026-08-11 — the sweep pins row evidence but
// freezes NOTHING when a replay ERRORS, which is the one case where the
// input is most needed and least likely to survive."
//
// `--pin-rows` builds pins from the replay child's own JSON rows
// (tools/gate-live.mjs replayArgs), so an errored child — the case the
// whole daily sweep exists to catch — produces no JSON and the pin pass has
// nothing to ask for. Measured (BACKLOG): a replay-error row's own capture
// rotated off disk within one session's window, leaving the finding
// unwalkable from its own evidence.
//
// This file pins the fix: on an errored replay, a BOUNDED range gets pinned
// around wherever the failure can be placed (`harvest --pin --bounded`,
// spawned the same way replay.mjs and the census already are), and the row
// states whether that placement was LOCATED (an `n=<num>` marker in the
// child's own stderr) or GUESSED (no marker — centered on the capture's
// last known request ordinal). The done-criterion demands BOTH arms: a
// deliberately errored replay leaves a pin that reproduces the error on
// replay, and a clean run pins nothing extra.

import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { summarise } from "../tools/gate-live.mjs";
// Namespace import — deliberate, not a style choice (matches
// test/gate-live.test.mjs's own precedent). The red-first arm of this
// file's own bites runs against the UNMODIFIED tools/gate-live.mjs, where
// `planErrorPin`, `boundedRangeAround` and `pinErrorRow` do not exist yet.
// A named import of a missing export fails the whole module at ESM link
// time, reddening every OTHER bite in this file too; a namespace import
// only fails where the missing member is actually READ, so the real
// pass/fail split stays discriminating.
import * as gateLive from "../tools/gate-live.mjs";

const pExecFile = promisify(execFile);
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPLAY = join(REPO, "tools", "replay.mjs");
const GATE_LIVE = join(REPO, "tools", "gate-live.mjs");

// --- planErrorPin / boundedRangeAround: pure, no subprocess -----------------

test("BITE — an explicit n= marker in stderr is LOCATED, never GUESSED", () => {
  const plan = gateLive.planErrorPin("garbage\nreplay failed: Error at n=42 during onRequest\n", 999, 999);
  assert.equal(plan.located, true);
  assert.equal(plan.guessed, false);
  assert.equal(plan.ordinal, 42);
  assert.deepEqual(plan.range, { n: 22, m: 62 });
});

test("BITE — no marker in stderr is GUESSED, centered on the known last ordinal", () => {
  const plan = gateLive.planErrorPin("FATAL ERROR: Reached heap limit\n", 50, 50);
  assert.equal(plan.located, false);
  assert.equal(plan.guessed, true);
  assert.equal(plan.ordinal, 50);
  assert.match(plan.basis, /last request ordinal/);
});

test("BITE — no marker AND no known ordinal guesses from 0, and says so", () => {
  const plan = gateLive.planErrorPin("FATAL ERROR: Reached heap limit\n", null, null);
  assert.equal(plan.located, false);
  assert.equal(plan.guessed, true);
  assert.equal(plan.ordinal, 0);
  assert.match(plan.basis, /no known ordinal/);
});

test("BITE — a guessed range still reads as guessed, never dressed as located", () => {
  // The done-criterion's own wording: "a pin whose range was guessed must
  // not read like one that was located." Both fields must disagree with
  // "located" — a reader checking either one alone must get the true answer.
  const plan = gateLive.planErrorPin("no marker here", 10, 10);
  assert.equal(plan.located, false);
  assert.equal(plan.guessed, true);
});

test("BITE — the range clamps to the capture's real extent, never past it", () => {
  // A window of 20 each side around ordinal 1 with only 2 requests (max
  // ordinal 1) must not ask harvest.mjs to pin through m=21 — it has
  // nothing past m=1 to give, and asking would fail loudly instead of
  // freezing anything.
  assert.deepEqual(gateLive.boundedRangeAround(1, 1), { n: 0, m: 1 });
  // ordinal=45, window reaches to 65, but the capture only has 50 — m must
  // clamp to 50 without moving n (n stays a real, in-range lower bound).
  assert.deepEqual(gateLive.boundedRangeAround(45, 50), { n: 25, m: 50 });
});

test("BITE — an unclamped range (no known max) still centers correctly", () => {
  assert.deepEqual(gateLive.boundedRangeAround(50, null), { n: 30, m: 70 });
});

// --- summarise(): row.stderrFull carries the whole thing, row.error does not

test("BITE — row.stderrFull is verbatim even when row.error truncates to the last 4 lines", () => {
  // Reproduces the motivating incident (BACKLOG): the s-captureBE row's
  // last-4-lines were all auto-1m-guard noise, burying the real crash
  // reason. row.error's shape must not change (other readers depend on
  // it) — this only adds a second key that keeps everything.
  const noisyErr =
    "replay failed: TypeError: real cause here\n" +
    "[auto-1m-guard] context-1m-2025-08-07 detected in outbound betas\n".repeat(6);
  const row = summarise("c.jsonl", 10, { code: 1, out: "", err: noisyErr });
  assert.ok(row.error, "the truncated form must still be present — unchanged shape");
  assert.equal(row.error.split("\n").length, 4, "row.error keeps its existing last-4-lines shape");
  assert.equal(row.error.includes("real cause here"), false, "this is exactly the burial the incident measured");
  assert.equal(row.stderrFull, noisyErr, "the verbatim key must carry what the truncated one lost");
});

test("BITE — a spawn error (-1) also carries stderrFull", () => {
  const row = summarise("c.jsonl", 10, { code: -1, out: "", err: "spawn node ENOENT" });
  assert.equal(row.stderrFull, "spawn node ENOENT");
});

test("BITE — a clean run carries no stderrFull", () => {
  const row = summarise("c.jsonl", 10, {
    code: 0,
    out: JSON.stringify({ report: [{ n: 0 }], violations: [], safety: [], sequence: [], orderViolations: [] }),
    err: "",
  });
  assert.equal(row.stderrFull, undefined);
});

// --- Real end-to-end: a deliberately errored replay leaves a pin that -----
// --- reproduces the error, and a clean run pins nothing extra -------------

function requestLine(n) {
  return JSON.stringify({
    ts: `2026-01-01T00:00:0${n}Z`,
    sid: "s-tiny0000000",
    key: "s-tiny0000000",
    headers: { "anthropic-beta": "x" },
    body: {
      model: "claude-sonnet-5",
      system: "sys0",
      messages: Array.from({ length: n + 1 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: [{ type: "text", text: `msg ${i}` }],
      })),
    },
  });
}

async function writeTinyCapture(dir, name) {
  const path = join(dir, `${name}-requests.jsonl`);
  const lines = [
    JSON.stringify({ ts: "2026-01-01T00:00:00Z", type: "boot", pid: 1, proxyTree: "abc123", gates: {} }),
    requestLine(0),
    requestLine(1),
  ];
  await writeFile(path, lines.join("\n") + "\n");
  return path;
}

test("real: an errored replay leaves a GUESSED pin that reproduces the error on replay", async (t) => {
  const dir = await tmpDir("gate-live-errorpin-");
  t.after(() => {});
  const captureDir = dir;
  await writeTinyCapture(captureDir, "tiny");
  const outDir = join(dir, "errorpins");
  await mkdir(outDir, { recursive: true });

  // Force a real crash — an 8 MB heap cap kills node's own module load for
  // this pipeline in well under a second (measured), deterministically,
  // with no dependence on capture size. This is the SAME class of failure
  // the daily sweep's own heap cap exists to convert into a status row
  // (tools/gate-live.mjs CHILD_HEAP_CAP_MB header) — just tuned lower so
  // the test forces it on demand instead of waiting for a real regression.
  const res = await pExecFile(
    "node",
    ["--max-old-space-size=8", REPLAY, join(captureDir, "tiny-requests.jsonl"), "--json", "--census", "--pin-rows"],
    { maxBuffer: 64 * 1024 * 1024 },
  ).catch((e) => ({ code: e.code, out: e.stdout ?? "", err: e.stderr ?? "" }));
  const code = res.code ?? res.signal ?? -1;
  assert.notEqual(code, 0, "the forcing arm must actually be off — a heap cap this low must not run clean");

  const row = summarise("tiny-requests.jsonl", 10, { code, out: res.out ?? res.stdout ?? "", err: res.err ?? res.stderr ?? "" });
  assert.ok(row.error, "the forced crash must be recorded as an error, never smoothed into zero");
  assert.ok(row.stderrFull, "the verbatim stderr must be present for the pin to locate from");
  assert.equal(row.stderrFull.includes("n="), false, "ground truth: a real OOM crash carries no ordinal marker");

  const pin = await gateLive.pinErrorRow("tiny-requests.jsonl", captureDir, row.stderrFull, outDir);
  assert.equal(pin.located, false, "no marker present — this must be the GUESSED path, not a false LOCATED");
  assert.equal(pin.guessed, true);
  assert.equal(pin.exit, 0, `harvest --pin --bounded must succeed: ${pin.stdout}`);
  assert.deepEqual(pin.range, { n: 0, m: 1 }, "clamped to the capture's only 2 requests");

  const files = (await readdir(outDir)).filter((f) => f.startsWith("pinned-"));
  assert.equal(files.length, 1, "exactly one pin fixture must land in the output directory");
  const fixture = JSON.parse(await readFile(join(outDir, files[0]), "utf-8"));
  assert.equal(fixture.header.bounded, true);

  // THE DONE-CRITERION'S OWN WORDS: the pin must reproduce the error on
  // replay. Convert the fixture's records back to JSONL (the same
  // conversion harvest.mjs's own verifyPin uses) and replay them under the
  // SAME forcing condition.
  const pinJsonl = join(dir, "pin-replay.jsonl");
  await writeFile(pinJsonl, fixture.records.map((r) => JSON.stringify(r)).join("\n") + "\n");
  const replayRes = await pExecFile(
    "node",
    ["--max-old-space-size=8", REPLAY, pinJsonl, "--json", "--census", "--pin-rows"],
    { maxBuffer: 64 * 1024 * 1024 },
  ).catch((e) => ({ code: e.code, out: e.stdout ?? "", err: e.stderr ?? "" }));
  const replayCode = replayRes.code ?? replayRes.signal ?? -1;
  assert.notEqual(replayCode, 0, "the pinned fixture must reproduce the same crash under the same forcing condition");
  assert.equal((replayRes.out ?? "").trim(), "", "a reproduced crash writes no JSON, same as the original");
});

test("real: a clean sweep over the same capture pins no error evidence at all", async (t) => {
  const dir = await tmpDir("gate-live-errorpin-clean-");
  t.after(() => {});
  const captures = join(dir, "captures");
  await mkdir(captures, { recursive: true });
  await writeTinyCapture(captures, "tiny");
  const status = join(dir, "status.json");
  const errorPins = join(dir, "errorpins");

  // The REAL sweep CLI, at its own (generous, 2048 MB) heap cap — this
  // capture is a few hundred bytes, so it runs clean.
  await pExecFile("node", [
    GATE_LIVE,
    "--captures", captures,
    "--status", status,
    "--fire-ledger", join(dir, "fire.jsonl"),
    "--snapshots", join(dir, "snapshots"),
    "--transcripts", join(dir, "projects"),
    "--rowpins", join(dir, "rowpins"),
    "--error-pins", errorPins,
    "--quiet",
  ], { cwd: REPO, maxBuffer: 64 * 1024 * 1024 });

  const parsed = JSON.parse(await readFile(status, "utf-8"));
  const row = parsed.rows.find((r) => r.file === "tiny-requests.jsonl");
  assert.ok(row, "the clean capture must still produce a row");
  assert.equal(row.error, undefined, "a clean run has no error to pin from");
  assert.equal(row.errorPin, undefined, "the negative control: a clean run pins nothing extra");
  // And nothing was written to the error-pins directory at all.
  await assert.rejects(readdir(errorPins), "a clean sweep must never create the error-pins directory");
});
