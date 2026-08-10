// harvest --pin --bounded — BACKLOG.md "READY (small) — `harvest --pin`
// cannot freeze a LATE event in a LARGE capture, which is exactly when the
// expensive busts happen."
//
// pinRange's default (unbounded) mode writes every record from 0 through m,
// which is correct (insertion-normalization's per-conversation canonical
// state needs the full prefix replayed in order) and does not scale: a late
// event in a big capture would freeze hundreds of MB into public git
// history. `--bounded` keeps only the busting request's own conversation
// (`conversationOf`) and everything `sameLineage` relates to it — the union
// is what the busting conversation's own replay needs, per pinRange's own
// header comment — and drops the rest, replacing each dropped request with
// a placeholder that occupies its ordinal so the pin's self-verification
// still compares violation lines (`prevN->n`) against the right indices.
//
// This file constructs tiny synthetic captures rather than using real ones:
// the primary verifier (capture alias s-captureAW, busting pair 1048..1049)
// and the discriminating content-level check (s-captureAT, ordinal 715) were
// both run by hand against the real captures and reported in the closing
// message — they cannot be committed here (real session ids, hundreds of MB,
// and machine-local paths under ~/.local/share/cache-fix).

import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

import { pinRange, pinRangeBounded, parseReplayVerdicts, sidToken } from "../tools/harvest.mjs";
// Namespace import for the bounded-pin CONTENT check (BACKLOG.md "applies
// the retention filter to its own reference side") — its exports do not
// exist on the unmodified tool yet. A static named import of a not-yet-
// existing export fails the whole module at LINK time (ESM), which would
// collapse every other test in this file into the same false failure; a
// namespace import defers the missing-export failure to the individual call
// site that uses it, so the real pass/fail split stays readable.
import * as harvestMod from "../tools/harvest.mjs";
// The publication-boundary bites below IMPORT the real hygiene classes rather
// than re-deriving a token regex here. A second implementation of the corpus
// invariant is exactly the hand-rolled-identity error dev-loop.md warns
// about, and it would drift from the scanner that actually gates the push.
import { CLASSES, scanDocument } from "../tools/absence-scan.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");
const REPLAY = join(REPO, "tools", "replay.mjs");
const HARVEST_CLI = join(REPO, "tools", "harvest.mjs");

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const keyToken = (k) => `s-${sha256(k).slice(0, 12)}`;

// --- shared message fixtures -------------------------------------------

const msgT1 = { role: "user", content: [{ type: "text", text: "T-msg-1" }] };
const msgT2 = { role: "assistant", content: [{ type: "text", text: "T-msg-2" }] };
const msgT3 = { role: "user", content: [{ type: "text", text: "T-msg-3" }] };
const msgO1 = { role: "user", content: [{ type: "text", text: "O-msg-1" }] };
const msgO2 = { role: "assistant", content: [{ type: "text", text: "O-msg-2" }] };
const msgX1 = { role: "user", content: [{ type: "text", text: "X-msg-1" }] };

function requestLine({ ts, key, messages }) {
  return JSON.stringify({
    ts,
    sid: key,
    key,
    headers: { "anthropic-beta": "x" },
    body: { model: "claude-sonnet-5", system: "sys0", messages },
  });
}

// --- capture BIG: covers retention, ordinal preservation, boot/outcome ---
//
// ordinal 0 (T_early)   conv T, messages=[msgT1]                 — kept: same conversation as the target
// ordinal 1 (O_first)   conv O, messages=[msgO1]                 — dropped: unrelated co-tenant
// ordinal 2 (O_second)  conv O, messages=[msgO1, msgO2]           — dropped: unrelated co-tenant (would pair with O_first if bounding did nothing)
// ordinal 3 (L_rebuilt) conv L, messages=[msgX1, msgT2, msgT3]    — kept: conversationOf differs from the target's, but 2 of its 3 messages (msgT2, msgT3) are also in the target's own request, so lineageOverlap = 2/min(3,3) = 0.667 >= 0.5
// ordinal 4 (T_final)   conv T, messages=[msgT1, msgT2, msgT3]    — the target (m=4), same conversation as ordinal 0
async function writeBigCapture(dir) {
  const path = join(dir, "bounded-big-requests.jsonl");
  const lines = [
    JSON.stringify({ ts: "2026-01-01T00:00:00Z", type: "boot", pid: 1, proxyTree: "abc123", gates: {} }),
    requestLine({ ts: "2026-01-01T00:00:01Z", key: "s-target0000", messages: [msgT1] }),
    JSON.stringify({
      ts: "2026-01-01T00:00:02Z",
      type: "outcome",
      id: "out-1",
      key: "s-target0000",
      requestId: "req-1",
      model: "claude-sonnet-5",
      usage: { cacheRead: 0, cacheCreation: 0, inputTokens: 10, outputTokens: 1 },
      outSha: "deadbeef",
      outBytes: 100,
      ms: 5,
    }),
    requestLine({ ts: "2026-01-01T00:00:03Z", key: "s-other00000", messages: [msgO1] }),
    requestLine({ ts: "2026-01-01T00:00:04Z", key: "s-other00000", messages: [msgO1, msgO2] }),
    requestLine({ ts: "2026-01-01T00:00:05Z", key: "s-lineage0000", messages: [msgX1, msgT2, msgT3] }),
    requestLine({ ts: "2026-01-01T00:00:06Z", key: "s-target0000", messages: [msgT1, msgT2, msgT3] }),
  ];
  await writeFile(path, lines.join("\n") + "\n");
  return path;
}

const BIG_TARGET_M = 4;

// --- capture SMALL: isolates placeholder behaviour, nothing else ---------
//
// ordinal 0 (O_first)  conv O, messages=[msgP1]            — dropped
// ordinal 1 (O_second) conv O, messages=[msgP1, msgP2]      — dropped (would form a real pair with O_first if not bounded)
// ordinal 2 (Target)   conv Q, messages=[msgQ1]             — the target (m=2), single occurrence, no predecessor of its own either
const msgP1 = { role: "user", content: [{ type: "text", text: "P-msg-1" }] };
const msgP2 = { role: "assistant", content: [{ type: "text", text: "P-msg-2" }] };
const msgQ1 = { role: "user", content: [{ type: "text", text: "Q-msg-1" }] };

async function writeSmallCapture(dir) {
  const path = join(dir, "bounded-small-requests.jsonl");
  const lines = [
    JSON.stringify({ ts: "2026-01-01T00:00:00Z", type: "boot", pid: 1, proxyTree: "abc123", gates: {} }),
    requestLine({ ts: "2026-01-01T00:00:01Z", key: "s-otherA0000", messages: [msgP1] }),
    requestLine({ ts: "2026-01-01T00:00:02Z", key: "s-otherA0000", messages: [msgP1, msgP2] }),
    requestLine({ ts: "2026-01-01T00:00:03Z", key: "s-targetA000", messages: [msgQ1] }),
  ];
  await writeFile(path, lines.join("\n") + "\n");
  return path;
}

const SMALL_TARGET_M = 2;

// --- replay helper: run the real pipeline, parse the real verdict lines ---

async function replayRecords(records) {
  const dir = await tmpDir("harvest-pin-bounded-");
  const jsonl = join(dir, "r.jsonl");
  await writeFile(jsonl, records.map((r) => JSON.stringify(r)).join("\n") + "\n");
  let stdout, status;
  try {
    stdout = execFileSync(process.execPath, [REPLAY, jsonl, "--census"], {
      encoding: "utf-8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    status = 0;
  } catch (e) {
    stdout = `${e.stdout ?? ""}`;
    status = e.status ?? -1;
  }
  return parseReplayVerdicts(stdout, status);
}

// A dropped-request stand-in is never boot/outcome, so this is how request
// records (real or placeholder) are told apart from the two provenance
// record types in the flat `records` array pinRangeBounded returns.
const requestOnly = (records) => records.filter((r) => r.type !== "boot" && r.type !== "outcome");

// --- bite: a placeholder contributes zero pairs/violations/classes -------

test("bounded pin: placeholders contribute zero pairs, zero violations, zero census classes when replayed", async () => {
  const dir = await tmpDir("harvest-pin-bounded-");
  const capture = await writeSmallCapture(dir);
  const { records, kept, placeholders } = await pinRangeBounded(capture, SMALL_TARGET_M);

  assert.equal(kept, 1, "only the target itself is kept — it has no real predecessor or lineage in this capture");
  assert.equal(placeholders, 2, "both O_first and O_second are unrelated to the target and become placeholders");

  const parsed = await replayRecords(records);
  assert.equal(parsed.ok, true, `replay produced no verdict block: missing ${parsed.missing.join(",")}`);
  assert.equal(parsed.pairs, 0, "the two placeholders never pair with each other or with anything else");
  assert.equal(parsed.violations, 0);
  assert.deepEqual(parsed.classes, {}, "no census class fires over zero pairs");
});

// --- bite: retention keeps a lineage-only record, drops an unrelated co-tenant ---

test("bounded pin: keeps a record conversationOf alone would drop (lineage), drops an unrelated co-tenant", async () => {
  const dir = await tmpDir("harvest-pin-bounded-");
  const capture = await writeBigCapture(dir);
  const { records } = await pinRangeBounded(capture, BIG_TARGET_M);
  const requests = requestOnly(records);

  const lineageRecord = requests[3]; // ordinal 3: L_rebuilt
  const coTenantRecord = requests[1]; // ordinal 1: O_first

  assert.equal(
    lineageRecord.key,
    keyToken("s-lineage0000"),
    "L_rebuilt is retained as real content: conversationOf differs from the target's, but sameLineage relates it",
  );
  assert.ok(
    coTenantRecord.key.startsWith("bounded-placeholder-"),
    "O_first shares no conversation or lineage with the target and is replaced by a placeholder",
  );
  assert.ok(
    requests[2].key.startsWith("bounded-placeholder-"),
    "O_second (same unrelated conversation as O_first) is dropped too",
  );
});

// --- bite: ordinals are preserved ------------------------------------------

test("bounded pin: the target sits at the same ordinal in the bounded pin as in the source", async () => {
  const dir = await tmpDir("harvest-pin-bounded-");
  const capture = await writeBigCapture(dir);
  const { records } = await pinRangeBounded(capture, BIG_TARGET_M);
  const requests = requestOnly(records);

  assert.equal(requests.length, BIG_TARGET_M + 1, "one request record per ordinal 0..m, real or placeholder");
  assert.equal(
    requests[BIG_TARGET_M].key,
    keyToken("s-target0000"),
    "the target itself sits at index m, exactly where pinRange (unbounded) would also put it",
  );
  // T_early, the target's own predecessor, is at ordinal 0 unchanged.
  assert.equal(requests[0].key, keyToken("s-target0000"));
});

// --- bite: boot and outcome records survive the bound -----------------------

test("bounded pin: boot and outcome records survive the bound", async () => {
  const dir = await tmpDir("harvest-pin-bounded-");
  const capture = await writeBigCapture(dir);
  const { records } = await pinRangeBounded(capture, BIG_TARGET_M);

  assert.equal(records.filter((r) => r.type === "boot").length, 1, "the boot record travels regardless of any conversation filter");
  assert.equal(records.filter((r) => r.type === "outcome").length, 1, "the outcome record travels too — it carries no message bodies");
});

// --- bite: --bounded absent leaves pinRange's output byte-identical to today's ---

test("bounded pin: --bounded absent leaves pinRange's output untouched (no placeholders, everything real)", async () => {
  const dir = await tmpDir("harvest-pin-bounded-");
  const capture = await writeBigCapture(dir);
  const records = await pinRange(capture, BIG_TARGET_M);
  const requests = requestOnly(records);

  assert.equal(requests.length, BIG_TARGET_M + 1);
  for (const r of requests) {
    assert.ok(!r.key.startsWith("bounded-placeholder-"), "the unbounded path never writes a placeholder");
  }
  // Every real key, unfiltered — O's two records included, unlike the bounded case.
  assert.deepEqual(
    requests.map((r) => r.key),
    [keyToken("s-target0000"), keyToken("s-other00000"), keyToken("s-other00000"), keyToken("s-lineage0000"), keyToken("s-target0000")],
  );
});

// --- CLI: the pin header records the bound ----------------------------------

test("harvest --pin --bounded CLI: header records bounded:true, the target ordinal, kept/placeholder counts", async () => {
  const dir = await tmpDir("harvest-pin-bounded-cli-");
  const capturesDir = join(dir, "captures");
  const outDir = join(dir, "out");
  await import("node:fs/promises").then((fs) => fs.mkdir(capturesDir, { recursive: true }));
  const capturePath = await writeBigCapture(capturesDir);
  // pinRangeBounded/pinRange take the capture path directly; the CLI wants a
  // <key>-requests.jsonl name under --captures, so give it the key it expects.
  const keyedPath = join(capturesDir, "s-boundedcli0-requests.jsonl");
  await import("node:fs/promises").then((fs) => fs.copyFile(capturePath, keyedPath));

  const stdout = execFileSync(
    process.execPath,
    [HARVEST_CLI, "--captures", capturesDir, "--out", outDir, "--pin", "s-boundedcli0", `0..${BIG_TARGET_M}`, "--bounded"],
    { encoding: "utf-8" },
  );
  assert.match(stdout, /bounded: 3 kept, 2 placeholder/);

  const outPath = join(outDir, `pinned-${keyToken("s-boundedcli0")}-0-${BIG_TARGET_M}.json`);
  const fixture = JSON.parse(await (await import("node:fs/promises")).readFile(outPath, "utf-8"));
  assert.equal(fixture.header.bounded, true);
  assert.equal(fixture.header.boundedTarget, BIG_TARGET_M);
  assert.equal(fixture.header.boundedKept, 3);
  assert.equal(fixture.header.boundedPlaceholders, 2);
  assert.ok(
    /placeholder/i.test(fixture.header.boundedNote) && /not.*real|synthetic/i.test(fixture.header.boundedNote),
    "the header names the placeholder convention so a reader cannot mistake one for real traffic",
  );
});

// --- bounded pin CONTENT check: is the busting conversation COMPLETE? ------
//
// BACKLOG.md "READY (BLOCKING the bounded pin's fidelity claim) — verifyPin
// on a BOUNDED pin applies the retention filter to its own reference side,
// so it cannot fail for the defect it exists to catch. PROVEN by sabotage,
// not argued." compareReplayVerdicts builds its live side with
// writeCapturePrefixBounded, which applies boundedKeep — the SAME retention
// function the pin itself was built with — so both sides drop the same
// records and a filter defect is invisible by construction (measured at the
// desk: boundedKeep sabotaged to drop every third kept record still
// returned `diffs: []`, 188 pairs -> 125 on both sides). The fix is a
// CONTENT check computed independently of boundedKeep: S = the ordinals
// whose own conversationOf matches the busting request's, straight from the
// raw capture, and the pin must hold a real record at every one of them.
//
// These bites test the mechanism directly (bustingConversationOrdinals,
// missingBustingOrdinals) with constructed inputs — no real captures.

test("bounded pin content check: S is the busting conversation's own ordinals, excluding the sameLineage-only union", async () => {
  const dir = await tmpDir("harvest-pin-bounded-");
  const capture = await writeBigCapture(dir);
  const ordinals = await harvestMod.bustingConversationOrdinals(capture, BIG_TARGET_M);
  assert.deepEqual(
    [...ordinals].sort((a, b) => a - b),
    [0, 4],
    "T_early (0) and the target itself (4) share conversationOf with the target; L_rebuilt (3) is lineage-only " +
      "(sameLineage relates it, but its OWN conversationOf differs) and must not be in S — the scope statement",
  );
});

test("bounded pin content check: a complete pin (unsabotaged retention) passes — no missing ordinals", async () => {
  const dir = await tmpDir("harvest-pin-bounded-");
  const capture = await writeBigCapture(dir);
  const { records } = await pinRangeBounded(capture, BIG_TARGET_M);
  const ordinals = await harvestMod.bustingConversationOrdinals(capture, BIG_TARGET_M);
  const missing = harvestMod.missingBustingOrdinals(records, ordinals);
  assert.deepEqual(missing, [], "pinRangeBounded keeps every busting-conversation member for real, unsabotaged");
});

test("bounded pin content check: a pin literally missing a busting-conversation ordinal (record absent) fails, named", () => {
  const ordinals = new Set([0, 4]);
  // records array covers ordinals 0..3 only — ordinal 4 has no entry at all,
  // simulating a pin whose array is short (a defect elsewhere in the chain).
  const requests = [
    { sid: "s-real00000000" },
    { sid: "bounded-placeholder-1" },
    { sid: "bounded-placeholder-2" },
    { sid: "s-lineage000000" },
  ];
  const missing = harvestMod.missingBustingOrdinals(requests, ordinals);
  assert.deepEqual(missing, [4], "ordinal 4 has no record at all in the pin and must be named as missing");
});

test("bounded pin content check: a pin holding a PLACEHOLDER at a busting-conversation ordinal fails, named", () => {
  const ordinals = new Set([0, 4]);
  const requests = [
    { sid: "bounded-placeholder-0" }, // defect: ordinal 0 is a real busting member but was replaced
    { sid: "bounded-placeholder-1" },
    { sid: "bounded-placeholder-2" },
    { sid: "s-lineage000000" },
    { sid: "s-target0000aa" },
  ];
  const missing = harvestMod.missingBustingOrdinals(requests, ordinals);
  assert.deepEqual(missing, [0], "ordinal 0 holds a placeholder despite being in S and must be named");
});

test("bounded pin content check: a lineage-only record dropped from the pin does NOT fail — the scope statement, asserted not assumed", async () => {
  const dir = await tmpDir("harvest-pin-bounded-");
  const capture = await writeBigCapture(dir);
  const { records } = await pinRangeBounded(capture, BIG_TARGET_M);
  const ordinals = await harvestMod.bustingConversationOrdinals(capture, BIG_TARGET_M);
  // Simulate a hypothetical NARROWER retention (busting conversation only,
  // no sameLineage union) by placeholdering ordinal 3 (L_rebuilt,
  // lineage-only) — this is explicitly NOT the defect the check exists to
  // catch; lineage-related records sit outside the bar by design.
  const requests = requestOnly(records);
  const narrowed = records.map((r) =>
    r === requests[3]
      ? { ts: r.ts, sid: "bounded-placeholder-3", key: "bounded-placeholder-3", headers: r.headers, body: { model: null, system: null, messages: [] } }
      : r,
  );
  const missing = harvestMod.missingBustingOrdinals(narrowed, ordinals);
  assert.deepEqual(missing, [], "L_rebuilt (lineage-only, ordinal 3) is outside S by design; its absence must not fail the check");
});

// --- wiring: verifyPin surfaces the clause in its established voice --------

test("verifyPin: a bounded pin missing a busting-conversation member reports it, naming the ordinal", async () => {
  const dir = await tmpDir("harvest-pin-bounded-verify-");
  const capture = await writeBigCapture(dir);
  const { records } = await pinRangeBounded(capture, BIG_TARGET_M);
  const requests = requestOnly(records);
  // Sabotage exactly as a broken boundedKeep would: drop the real
  // predecessor (ordinal 0, T_early — a genuine busting-conversation member)
  // in favor of a placeholder, leaving everything else correct.
  const sabotagedRecords = records.map((r) =>
    r === requests[0]
      ? { ts: r.ts, sid: "bounded-placeholder-0", key: "bounded-placeholder-0", headers: r.headers, body: { model: null, system: null, messages: [] } }
      : r,
  );
  const pinPath = join(dir, "sabotaged-pin.json");
  await writeFile(
    pinPath,
    JSON.stringify({ header: { bounded: true }, records: sabotagedRecords }, null, 2) + "\n",
  );
  const { diffs } = await harvestMod.verifyPin(capture, pinPath, BIG_TARGET_M);
  const joined = diffs.join("; ");
  assert.match(joined, /busting conversation incomplete/, `verifyPin must report the content-check clause: ${joined}`);
  assert.match(joined, /\b0\b/, `the clause must name ordinal 0: ${joined}`);
});

test("verifyPin: a complete bounded pin never reports the busting-completeness clause", async () => {
  const dir = await tmpDir("harvest-pin-bounded-verify-");
  const capture = await writeBigCapture(dir);
  const { records } = await pinRangeBounded(capture, BIG_TARGET_M);
  const pinPath = join(dir, "complete-pin.json");
  await writeFile(pinPath, JSON.stringify({ header: { bounded: true }, records }, null, 2) + "\n");
  const { diffs } = await harvestMod.verifyPin(capture, pinPath, BIG_TARGET_M);
  const joined = diffs.join("; ");
  assert.doesNotMatch(joined, /busting conversation incomplete/, `an unsabotaged bounded pin must not trip the content check: ${joined}`);
});

// --- the PUBLICATION boundary: a bounded pin must be committable -------------
//
// WHY THESE EXIST. `--bounded` shipped proven at its own bench and was never
// carried to the boundary it exists to serve: the first bounded pin ever
// committed (`e18c299`) was blocked by the pre-push hygiene scan with 212
// `raw-content` findings, every one of them this tool's own placeholder body,
// which was raw prose in a `content` field. The writer was fixed in `9464ac0`
// (the sentence now goes through `scrubText`, and the repair was deliberately
// made at the writer rather than as a scanner exemption) — and nothing was
// left behind that would catch the same regression on the NEXT bounded pin.
// The whole mechanism's purpose is to produce a fixture that can be committed,
// so "is its output committable" is the one property its tests must assert.
//
// Both bites read the corpus invariant off the SCANNER (`raw-content`), and
// both assert the class's DOMAIN before its verdict: a zero from a class that
// never applied is indistinguishable from a zero that means something, which
// is the failure shape absence-scan's own per-class `seen` counter exists for.
//
// Red-first, against an immutable reference rather than live tree state:
//   git checkout 813debe -- tools/harvest.mjs   # 9464ac0^, raw placeholder
// Both bites go red there while every other bite in this file stays green;
// `813debe` already carries `bustingConversationOrdinals` and
// `missingBustingOrdinals`, so the placeholder body is the only variable.

const RAW_CONTENT = CLASSES.filter((c) => c.name === "raw-content");

test("bounded pin: the PLACEHOLDER body is tokenized — the class that blocked e18c299 finds nothing", async () => {
  const dir = await tmpDir("harvest-pin-bounded-hygiene-");
  const capture = await writeBigCapture(dir);
  const { records, placeholders } = await pinRangeBounded(capture, BIG_TARGET_M);

  const placeholderRecords = records.filter((r) => String(r.sid ?? "").startsWith("bounded-placeholder-"));
  assert.equal(placeholders, 2, "arrangement: this capture must really produce placeholders");
  assert.equal(placeholderRecords.length, placeholders, "every placeholder must be findable by its sid");

  const { findings, seen } = scanDocument({ records: placeholderRecords }, { classes: RAW_CONTENT });
  // DOMAIN before verdict — one applied string per placeholder body, minimum.
  assert.ok(
    seen["raw-content"] >= placeholders,
    `raw-content must APPLY to every placeholder body or the zero below is vacuous; it applied ${seen["raw-content"]} time(s) for ${placeholders} placeholder(s)`,
  );
  assert.deepEqual(
    findings.map((f) => f.path),
    [],
    "a placeholder body is a token like every other content string; raw prose here is what blocked the first bounded pin at the push boundary",
  );
});

test("bounded pin: EVERY content string in the fixture is a token, placeholders and kept records alike", async () => {
  const dir = await tmpDir("harvest-pin-bounded-hygiene-");
  const capture = await writeBigCapture(dir);
  const { records } = await pinRangeBounded(capture, BIG_TARGET_M);

  const { findings, seen } = scanDocument({ records }, { classes: RAW_CONTENT });
  // The kept records carry real (here synthetic) message text, so the domain
  // is strictly larger than the placeholder count — if it is not, the pin is
  // not carrying the conversation it claims to and the verdict means nothing.
  assert.ok(
    seen["raw-content"] > 2,
    `the whole-pin scan must cover kept-record content too, not just the 2 placeholders; it applied ${seen["raw-content"]} time(s)`,
  );
  assert.deepEqual(
    findings.map((f) => f.path),
    [],
    "the corpus invariant is that every content string is a token — this is the property that makes a pin publishable",
  );
});
