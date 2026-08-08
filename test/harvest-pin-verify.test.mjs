// harvest --pin self-verification — BACKLOG.md "READY — `harvest --pin` must
// verify the pin reproduces what it was taken for; today it reports success on
// a fixture that proves nothing."
//
// The hand-derivation happened on 2026-08-06 and is recorded in
// docs/dev-loop.md ("The scrub destroys CONTENT PREDICATES — a pin is evidence
// only once replayed"): a pin taken to freeze the row-26 evidence printed
// `pinned 327 record(s), range 166..167` and replayed with 0 stability
// exemptions, where the same range of the live capture yields
// `first-appearance-relocation (skills)`. This file is the mechanism, so the
// next pin is checked at the moment it is taken rather than re-reasoned.
//
// THE DEFINITIONS THE ASSERTIONS COME FROM — written from what a pin IS,
// not from what tools/harvest.mjs does, so the expectations do not inherit the
// implementation's parentage:
//
//   (1) A pin is evidence for a class only if replaying it produces the same
//       verdict-bearing rows the live capture produces over the same range.
//       A row the live side has and the pin does not is the pin failing to
//       reproduce, and it must be NAMED — "does not reproduce" without saying
//       what is missing sends the reader back to the hand-derivation.
//   (2) A comparison over zero compared units is not agreement. Two replays
//       that each compared nothing agree perfectly and mean nothing, so the
//       pair count is asserted FIRST and must be non-zero on BOTH sides.
//       This is not hypothetical: a pin is `{header, records}` JSON, and
//       `replay.mjs <pin>.json` reads no capture out of it — it reports
//       `census: 0 same-conversation pairs` and exits clean, which is the
//       silent wrong way to check a pin.
//   (3) An unreadable verdict is not a clean verdict. If the replay output
//       carries no verdict block at all, every count parses as absent — and
//       absent must never compare equal to absent.
//
// The scrub is what makes (1) bite: it replaces text with hash tokens, so an
// extension gated on a literal text prefix cannot fire on a pinned fixture
// even though it fires on the live capture. Nothing here re-implements that;
// the numbers below are the ones measured on the real pair.

import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFile, readFile } from "node:fs/promises";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { parseReplayVerdicts, compareReplayVerdicts, writeCapturePrefix } from "../tools/harvest.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");
const CORPUS = join(REPO, "test", "fixtures", "harvested");
const REPLAY = join(REPO, "tools", "replay.mjs");

// --- the measured pair, as verdict rows -------------------------------------
//
// Left side: the live capture s-…733b1463 replayed over records 0..167.
// Right side: the pin taken from exactly that range. Both numbers are from the
// 2026-08-06 run recorded in dev-loop; the exemption lines are verbatim, minus
// the `ts=` field the scrub rebases by design.

const LIVE_ROW26 = {
  ok: true, missing: [], exitCode: 1, pairs: 136, conversations: 32,
  classes: { "append-only": 127, "replace/edit": 7, identical: 1, "splice/insert-mid": 1 },
  violations: 0, violationLines: [],
  exemptions: 2,
  exemptionLines: [
    "n=86->88 inDiv=1 outDiv=0 <- fresh-session-sort:first-appearance-relocation (mcp)",
    "n=166->167 inDiv=13 outDiv=0 <- fresh-session-sort:first-appearance-relocation (skills)",
  ],
};
const PIN_ROW26 = { ...LIVE_ROW26, exemptions: 0, exemptionLines: [] };

// The row-4 pair, same morning, same check: a structural class, which the
// sanitizer preserves by design. This one reproduces exactly.
const LIVE_ROW4 = {
  ok: true, missing: [], exitCode: 0, pairs: 60, conversations: 12,
  classes: { "append-only": 46, identical: 7, "replace/edit": 7 },
  violations: 0, violationLines: [], exemptions: 0, exemptionLines: [],
};

test("(1) a pin that loses a live stability exemption does NOT reproduce, and the finding names the missing row", () => {
  const { diffs, unreadable } = compareReplayVerdicts(LIVE_ROW26, PIN_ROW26);
  assert.equal(unreadable, false);
  assert.ok(diffs.length > 0, "the measured row-26 pin must not compare equal to its own live range");
  const joined = diffs.join("; ");
  assert.match(joined, /stability exemptions live=2 pin=0/);
  // The done-criterion from the backlog entry: the warning names the missing
  // rows, not merely that something differs.
  assert.match(joined, /first-appearance-relocation \(skills\)/);
  assert.match(joined, /first-appearance-relocation \(mcp\)/);
});

test("(1b) equal counts with different rows is still a divergence — a count is not a verdict", () => {
  const swapped = { ...LIVE_ROW26, exemptionLines: [LIVE_ROW26.exemptionLines[0], "n=166->167 inDiv=13 outDiv=0 <- deferred-tool-rewrite:tool-schema-changed"] };
  const { diffs } = compareReplayVerdicts(LIVE_ROW26, swapped);
  assert.ok(diffs.length > 0, "two exemptions of different kinds are not the same two exemptions");
  assert.match(diffs.join("; "), /differ in detail/);
});

test("(2) a pin that reproduces the live verdicts over a non-zero pair count is clean", () => {
  const { diffs, unreadable } = compareReplayVerdicts(LIVE_ROW4, { ...LIVE_ROW4 });
  assert.equal(unreadable, false);
  assert.deepEqual(diffs, [], `the row-4 pin reproduces exactly and must not warn: ${diffs.join("; ")}`);
});

test("(2b) PAIR COUNT FIRST — two replays that compared nothing must never read as agreement", () => {
  const nothing = { ok: true, missing: [], exitCode: 0, pairs: 0, conversations: 0, classes: {}, violations: 0, violationLines: [], exemptions: 0, exemptionLines: [] };
  const { diffs } = compareReplayVerdicts(nothing, { ...nothing });
  assert.ok(diffs.length > 0, "0 pairs on both sides is the failure this check exists for, not a pass");
  assert.match(diffs.join("; "), /compared nothing/);
  // And a live side that DID compare against a pin that did not: same verdict.
  const { diffs: d2 } = compareReplayVerdicts(LIVE_ROW4, { ...nothing });
  assert.match(d2.join("; "), /compared nothing/);
});

test("(3) an unreadable replay output is reported as unreadable, never as identical", () => {
  const parsed = parseReplayVerdicts("replay failed: some stack trace\n", 1);
  assert.equal(parsed.ok, false, "output with no verdict block is not a verdict");
  const { diffs, unreadable } = compareReplayVerdicts(parsed, parsed);
  assert.equal(unreadable, true);
  assert.ok(diffs.length > 0, "absent must not compare equal to absent");
  assert.match(diffs.join("; "), /unreadable/);
});

// --- the parser against the LIVE instrument ---------------------------------
//
// Everything above runs on rows typed out from a measured run, which proves the
// comparison and nothing about the reading. This case runs the real
// tools/replay.mjs over a real committed fixture and parses its real output: if
// replay's verdict lines ever change shape, the parser stops finding them and
// this goes red — rather than every future pin silently reporting "compared
// nothing" from an instrument that no longer reads.
//
// The fixture is DISCOVERED by the property that makes it replayable, never
// named: a hardcoded name goes red the day a fixture is renamed, which is a
// check firing on a non-defect.

function replayablePins() {
  const cands = [];
  for (const name of readdirSync(CORPUS).sort()) {
    if (!name.endsWith(".json")) continue;
    const path = join(CORPUS, name);
    let doc;
    try {
      doc = JSON.parse(readFileSync(path, "utf-8"));
    } catch {
      continue;
    }
    if (typeof doc?.header?.replayFrom !== "number") continue;
    if (!Array.isArray(doc?.records)) continue;
    if (!doc.records.some((r) => Array.isArray(r?.body?.messages))) continue;
    cands.push({ name, path, doc, size: statSync(path).size });
  }
  cands.sort((a, b) => a.size - b.size);
  return cands;
}
const smallestReplayablePin = () => replayablePins()[0] ?? null;

test("(4) the parser reads a REAL tools/replay.mjs run — anchors present, pair count non-zero", async () => {
  const pin = smallestReplayablePin();
  assert.ok(pin, "no replayable pinned fixture in the corpus — discovery or corpus is broken");

  const dir = await tmpDir("harvest-pin-verify-");
  const jsonl = join(dir, "pin.jsonl");
  await writeFile(jsonl, pin.doc.records.map((r) => JSON.stringify(r)).join("\n") + "\n");

  let stdout, status;
  try {
    stdout = execFileSync(process.execPath, [REPLAY, jsonl, "--census", "--gates-from-capture"], {
      encoding: "utf-8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"],
    });
    status = 0;
  } catch (e) {
    stdout = `${e.stdout ?? ""}`;
    status = e.status ?? -1;
  }

  const parsed = parseReplayVerdicts(stdout, status);
  assert.equal(parsed.ok, true, `every verdict anchor must be found in replay's own output (missing: ${parsed.missing.join(",")})`);
  assert.ok(parsed.pairs > 0, `${pin.name} must yield same-conversation pairs, or this case proves nothing about reading a verdict`);
  assert.ok(Object.keys(parsed.classes).length > 0, "the census class tally must parse to at least one class");
  assert.equal(typeof parsed.violations, "number");
  assert.equal(typeof parsed.exemptions, "number");
});

// (4b) THE SILENT WRONG WAY, over every pin cheap enough to replay.
//
// A pin is `{header, records}` JSON, not JSONL, so `replay.mjs <pin>.json`
// does not read it as a capture. Two shapes were observed doing exactly that,
// both on 2026-08-06 with and without --gates-from-capture:
//
//   * `pinned-s-86a4…-69-71.json`: `census: 0 same-conversation pairs`,
//     0 violations, 0 exemptions, exit 0 — CLEAN. This is the dangerous one:
//     the same zeros a real finding produces, from an instrument that never
//     ran.
//   * `pinned-s-4b6a…-26-28.json`: replay throws
//     `TypeError … Hash.update` and exits 1 with no verdict block at all.
//
// The invariant covers both without caring which happens, because it is a
// statement about the CHECK and not about replay's failure mode: feeding the
// .json can never produce a verified comparison. One shape is caught by the
// pair-count assertion, the other by the unreadable clause — and the test
// names which fired, so a future run that catches it for a new reason is
// still legible.
const REPLAY_SIZE_CAP = 5 * 1024 * 1024;

test("(4b) the silent wrong way: replay pointed at a .json pin can never read as verified", async () => {
  const pins = replayablePins().filter((p) => p.size <= REPLAY_SIZE_CAP);
  assert.ok(pins.length > 0, "no replayable pinned fixture under the size cap — this case would prove nothing");

  const seen = [];
  for (const pin of pins) {
    let stdout, status;
    try {
      stdout = execFileSync(process.execPath, [REPLAY, pin.path, "--census", "--gates-from-capture"], {
        encoding: "utf-8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"],
      });
      status = 0;
    } catch (e) {
      stdout = `${e.stdout ?? ""}`;
      status = e.status ?? -1;
    }
    const parsed = parseReplayVerdicts(stdout, status);
    const { diffs, unreadable } = compareReplayVerdicts(parsed, parsed);
    assert.ok(diffs.length > 0, `${pin.name}: feeding the .json to replay must never compare as identical`);
    const why = unreadable ? "unreadable" : "compared nothing";
    assert.match(diffs.join("; "), unreadable ? /unreadable/ : /compared nothing/);
    seen.push(`${pin.name}: ${why} (pairs=${parsed.pairs}, exit=${parsed.exitCode})`);
  }
  // A run over one pin and a run over four must not look alike.
  console.log(`  .json-fed pins caught: ${seen.length}\n    ${seen.join("\n    ")}`);
});

// (4c) THE DETAIL LINES, against replay's real output text.
//
// Test (4) proves the three anchor lines are found in a live run, but the
// committed corpus contains no fixture that replays to a NON-ZERO violation or
// exemption count, so a live run cannot exercise the line collection at all —
// found by mutation: deleting the line-collecting statement left every case in
// this file green. The fragment below is verbatim stdout from the 2026-08-06
// replay of capture s-…733b1463 over records 0..167 (only the surrounding
// blocks are trimmed), so the collection logic is checked against bytes
// tools/replay.mjs actually emitted. Residual, named rather than implied: a
// future change to the DETAIL line format would not break this the way it
// breaks (4)'s anchors — it would need a fixture that produces a row.
const REAL_REPLAY_FRAGMENT = `
cross-request byte-stability violations (self-inflicted busts): 0

stability exemptions (telemetry-backed, not counted as violations): 2
  n=86->88 ts=2026-08-06T09:48:49.689Z inDiv=1 outDiv=0 <- fresh-session-sort:first-appearance-relocation (mcp)
  n=166->167 ts=2026-08-06T09:59:02.225Z inDiv=13 outDiv=0 <- fresh-session-sort:first-appearance-relocation (skills)

census: 136 same-conversation pairs across 32 conversations
  gates: 10 of 10 declared set
    127   93.4%  append-only
      7    5.1%  replace/edit   e.g. n=60->62
      1    0.7%  identical
      1    0.7%  splice/insert-mid   e.g. n=145->147
`;

test("(4c) the parser collects the detail lines, and drops only the rebased timestamps", () => {
  const p = parseReplayVerdicts(REAL_REPLAY_FRAGMENT, 1);
  assert.equal(p.ok, true, `missing: ${p.missing.join(",")}`);
  assert.equal(p.pairs, 136);
  assert.equal(p.conversations, 32);
  assert.equal(p.violations, 0);
  assert.deepEqual(p.violationLines, []);
  assert.equal(p.exemptions, 2);
  assert.deepEqual(p.exemptionLines, [
    "n=86->88 inDiv=1 outDiv=0 <- fresh-session-sort:first-appearance-relocation (mcp)",
    "n=166->167 inDiv=13 outDiv=0 <- fresh-session-sort:first-appearance-relocation (skills)",
  ], "the ordinals and the reason survive; only ts= is dropped, because the scrub rebases it by design");
  assert.deepEqual(p.classes, { "append-only": 127, "replace/edit": 7, identical: 1, "splice/insert-mid": 1 });
  // The `gates:` line sits inside the census block and is provenance, not a
  // class — parsing it as one would invent a census class that never existed.
  assert.ok(!("gates" in p.classes) && !Object.keys(p.classes).some((k) => k.startsWith("gates")));
});

// --- writeCapturePrefix: the live side must hold the SAME records -----------

test("(5) writeCapturePrefix counts request ordinals the way pinRange does — boot and outcome consume no index", async () => {
  const dir = await tmpDir("harvest-pin-verify-");
  const src = join(dir, "cap.jsonl");
  const req = (i) => JSON.stringify({ ts: `2026-01-01T00:00:0${i}Z`, key: "k", body: { messages: [{ role: "user", content: `m${i}` }] } });
  await writeFile(
    src,
    [
      JSON.stringify({ ts: "2026-01-01T00:00:00Z", type: "boot", gates: { X: "1" } }),
      req(0),
      JSON.stringify({ ts: "2026-01-01T00:00:01Z", type: "outcome", id: "o1" }),
      req(1),
      req(2),
      req(3),
    ].join("\n") + "\n",
  );

  const out = join(dir, "prefix.jsonl");
  const { requests, reached } = await writeCapturePrefix(src, 1, out);
  assert.equal(reached, true);
  assert.equal(requests, 2, "requests 0 and 1 — the boot and outcome records do not consume an ordinal");

  const lines = (await readFile(out, "utf-8")).trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(lines.length, 4, "boot + request 0 + outcome + request 1, in file order");
  assert.equal(lines[0].type, "boot", "the boot record travels, or the two sides replay under different gates");
  assert.deepEqual(lines.map((r) => r.type ?? "request"), ["boot", "request", "outcome", "request"]);

  // Not reached: the caller must be able to tell a short capture from a
  // fulfilled range, same as pinRange's own loud failure.
  const short = await writeCapturePrefix(src, 99, join(dir, "short.jsonl"));
  assert.equal(short.reached, false);
  assert.equal(short.requests, 4);
});
