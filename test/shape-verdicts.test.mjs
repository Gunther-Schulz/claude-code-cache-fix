// shape-verdicts — the fork's own judgment over its shape/baseline telemetry.
//
// These cases are ported from the dotfiles doctor's selftests, where this
// judgment briefly lived: the port is the proof that moving the logic across
// repos changed nothing about what fires and what stays quiet. The deployment
// side now only invokes the CLI and books the verdicts.

import { tmpDir } from "../tools/tmpdir.mjs";
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { writeFile, mkdir, rm, utimes } from "node:fs/promises";
import { dirname, join } from "node:path";

import { shapeWatchVerdict, baselineStepVerdict, computeVerdicts } from "../tools/shape-verdicts.mjs";

const shape = (over = {}) => ({ pairs: 300, thinkingDropPairs: 2, thinkingTextCompleted: 0, ...over });
const ledger = (s) => ({ keys: { "s-a": { shape: s } } });

// Every test below runs against a scratch CLAUDE_CONFIG_DIR: the telemetry
// verdicts read real paths under claudeHome() (cache-fix-snapshots/,
// upstream-changes.jsonl, session-mirrors/), and without this the earlier,
// ledger-only tests would silently read whatever happens to be in the real
// ~/.claude on the machine running the suite.
let configDir;
let savedConfigDir;
let savedStateHome;
const TELEMETRY_GATE_VARS = [
  "CACHE_FIX_OUTPUT_GUARD",
  "CACHE_FIX_UPSTREAM_DETECTION",
  "CACHE_FIX_UPSTREAM_DIR",
  "CACHE_FIX_INSERTION_NORMALIZE",
  "CACHE_FIX_TOOL_REWRITE",
  "CACHE_FIX_SESSION_MIRROR",
  "CACHE_FIX_SESSION_MIRROR_EVENT_LOG",
];

beforeEach(async () => {
  configDir = await tmpDir("shape-verdicts-config-");
  savedConfigDir = process.env.CLAUDE_CONFIG_DIR;
  savedStateHome = process.env.XDG_STATE_HOME;
  process.env.CLAUDE_CONFIG_DIR = configDir;
  process.env.XDG_STATE_HOME = configDir;
  for (const v of TELEMETRY_GATE_VARS) delete process.env[v];
});

afterEach(async () => {
  if (savedConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = savedConfigDir;
  if (savedStateHome === undefined) delete process.env.XDG_STATE_HOME;
  else process.env.XDG_STATE_HOME = savedStateHome;
  for (const v of TELEMETRY_GATE_VARS) delete process.env[v];
  await rm(configDir, { recursive: true, force: true });
});

test("shape-watch: could-not-verify is warn with the inability named, never green", () => {
  assert.equal(shapeWatchVerdict(null).level, "warn");
  assert.match(shapeWatchVerdict(null).message, /NOT currently watched/);
  assert.equal(shapeWatchVerdict({ keys: {} }).level, "warn");
  assert.match(shapeWatchVerdict({ keys: { "s-a": { requests: 5 } } }).message, /run harvest/);
});

test("shape-watch: dormant classes read ok with the counts on display", () => {
  const v = shapeWatchVerdict(ledger(shape()));
  assert.equal(v.level, "ok");
  assert.match(v.message, /2\/300/);
});

test("BITE — reappeared completed-turn thinking warns with count and CC#69568", () => {
  const v = shapeWatchVerdict(ledger(shape({ pairs: 10, thinkingTextCompleted: 7 })));
  assert.equal(v.level, "warn");
  assert.match(v.message, /69568/);
  assert.match(v.message, /7 blocks/);
});

test("BITE — drop rate over 5% warns on a real sample; the same rate on a tiny sample is noise", () => {
  assert.equal(shapeWatchVerdict(ledger(shape({ pairs: 100, thinkingDropPairs: 9 }))).level, "warn");
  assert.equal(shapeWatchVerdict(ledger(shape({ pairs: 10, thinkingDropPairs: 1 }))).level, "ok");
});

test("baseline: three answers — missing working ledger warns, missing committed state is a named ok", () => {
  assert.equal(baselineStepVerdict(null, null).level, "warn");
  const base = ledger(shape({ systemBytes: 20000, toolsBytes: 40000 }));
  assert.equal(baselineStepVerdict(null, base).level, "ok");
  assert.match(baselineStepVerdict(null, base).message, /no committed comparison/);
  assert.equal(baselineStepVerdict(base, base).level, "ok");
});

test("BITE — the +94% class fires with numbers; shrinkage and floor stay quiet", () => {
  const base = ledger(shape({ systemBytes: 20000, toolsBytes: 40000 }));
  const grown = ledger(shape({ systemBytes: 38800, toolsBytes: 40000 }));
  const v = baselineStepVerdict(base, grown);
  assert.equal(v.level, "warn");
  assert.match(v.message, /20000->38800/);
  assert.match(v.message, /committing the ledger acknowledges/);
  assert.equal(baselineStepVerdict(base, ledger(shape({ systemBytes: 9000, toolsBytes: 40000 }))).level, "ok");
  assert.equal(
    baselineStepVerdict(ledger(shape({ systemBytes: 100 })), ledger(shape({ systemBytes: 400 }))).level,
    "ok",
  );
});

test("computeVerdicts: a missing ledger file yields both verdicts as honest warns, exit path intact", async () => {
  const dir = await tmpDir("shape-verdicts-");
  try {
    const verdicts = await computeVerdicts(join(dir, "no-such-ledger.json"));
    // 6 standing verdicts (3 ledger-shape + duplicate-billing + fire-ledger
    // + moved-fresh) + the telemetry-consumer table (Q4). The table length
    // is asserted against the TABLE, not a literal — a row legitimately
    // added must not redden this test (the hardcoded-count anti-pattern bit
    // 2026-07-30, again at this line's own former "3" on 2026-08-01, a
    // third time at its "4" when the fire ledger landed, and a fourth at
    // "5" when moved-fresh landed).
    const { TELEMETRY_CONSUMERS } = await import("../tools/shape-verdicts.mjs");
    // THE LITERAL IS GONE, and it is the FIFTH time this line's count has
    // rotted (3 -> 4 -> 5 -> 6 -> the row-31 watcher, 2026-08-15). The comment
    // above correctly de-literalised the TABLE half in 2026-07-30 and left the
    // standing half as `STANDING = 6`, so the anti-pattern it names kept
    // firing at half strength — a bare count mismatch that reads as breakage
    // every time a verdict is legitimately added.
    //
    // The count was never the invariant. What this test is about is that a
    // missing ledger produces HONEST verdicts rather than silence: every
    // telemetry consumer is represented, the ledger-shape verdicts warn, and
    // nothing is emitted twice. All three are derived.
    const names = verdicts.map((v) => v.name);
    assert.equal(new Set(names).size, names.length, `no verdict is emitted twice: ${names.join(", ")}`);
    for (const c of TELEMETRY_CONSUMERS) {
      assert.ok(verdicts.some((v) => v.name === c.name || v.name.includes(c.name) || c.name.includes(v.name)),
        `telemetry consumer ${c.name} has no verdict (names: ${names.join(", ")})`);
    }
    for (const required of ["shape-watch", "baseline", "retention"]) {
      assert.ok(names.includes(required), `${required} must always be emitted`);
    }
    assert.ok(verdicts.length >= TELEMETRY_CONSUMERS.length + 3,
      "instrument positive: the standing verdicts are present alongside the table");
    // duplicate-billing and moved-fresh both read MACHINE state (the gate
    // status file / the snapshots dir), so their level legitimately varies
    // here; the ledger-shape claim is about the ledger verdicts only.
    assert.ok(
      verdicts.every(
        (v) => v.level === "warn" || v.name === "baseline" || v.name === "duplicate-billing" || v.name === "moved-fresh",
      ),
    );
    assert.equal(verdicts[0].level, "warn", "shape-watch cannot read as green without a ledger");
    // Positional slice replaced for the same reason as the count above: it
    // silently re-anchored every time a standing verdict was added. The claim
    // is that the telemetry table appears in TABLE ORDER at the tail, which is
    // checkable without knowing how many verdicts precede it.
    const wanted = TELEMETRY_CONSUMERS.map((e) => e.name);
    assert.deepEqual(names.slice(-wanted.length), wanted,
      `the telemetry table must be the tail, in table order: ${names.join(", ")}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("BITE — a stalled harvest timer cannot print dormant forever: frozen numbers warn", async () => {
  const { HARVEST_MAX_AGE_H } = await import("../tools/shape-verdicts.mjs");
  const old = { keys: { "s-a": { lastHarvest: "2026-07-01T00:00:00Z", shape: shape() } } };
  const now = Date.parse("2026-07-29T00:00:00Z");
  const v = shapeWatchVerdict(old, now);
  assert.equal(v.level, "warn");
  assert.match(v.message, /frozen/);
  const fresh = { keys: { "s-a": { lastHarvest: new Date(now - 3600_000).toISOString(), shape: shape() } } };
  assert.equal(shapeWatchVerdict(fresh, now).level, "ok", `within ${HARVEST_MAX_AGE_H}h stays ok`);
});

test("retention: a NEW expired capture warns until the ledger commit acknowledges it", async () => {
  const { retentionVerdict } = await import("../tools/shape-verdicts.mjs");
  assert.equal(retentionVerdict(null, null).level, "warn");
  const committed = { keys: { "s-old": { gone: true }, "s-b": {} } };
  const sameGone = { keys: { "s-old": { gone: true }, "s-b": {} } };
  assert.equal(retentionVerdict(committed, sameGone).level, "ok", "already-acknowledged gone stays quiet");
  const newGone = { keys: { "s-old": { gone: true }, "s-b": { gone: true } } };
  const v = retentionVerdict(committed, newGone);
  assert.equal(v.level, "warn");
  assert.match(v.message, /s-b/);
  assert.match(v.message, /CAPTURE_MAX_MB/);
});

// --- Telemetry-consumer table (Q4: alarm-without-reader gap) ---
//
// Every case below writes fixtures at the EXACT relative paths the real
// writers use (output-guard.mjs, upstream-change-detection.mjs,
// insertion-normalization.mjs, deferred-tool-rewrite.mjs,
// session-mirror-writer.mjs), under the scratch CLAUDE_CONFIG_DIR set in
// beforeEach — so a path drift in either the writer or this table's
// resolution would be caught, not just a drift in shape-verdicts alone.

const oldMs = () => Date.now() - 48 * 3600_000; // outside HARVEST_MAX_AGE_H (26h)
const recentMs = () => Date.now() - 3600_000; // 1h ago, inside the window

async function writeFixture(path, mtimeMs) {
  await mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  await writeFile(path, JSON.stringify({ ts: new Date(mtimeMs).toISOString() }) + "\n");
  const t = mtimeMs / 1000;
  await utimes(path, t, t);
}

test("BITE — telemetry alarm kind: a recent guard-events entry fires; an old one stays quiet", async () => {
  const { telemetryConsumerVerdict } = await import("../tools/shape-verdicts.mjs");
  process.env.CACHE_FIX_OUTPUT_GUARD = "1";
  const entry = {
    name: "telemetry-guard-events",
    kind: "alarm",
    maxAgeH: 26,
    gate: () => process.env.CACHE_FIX_OUTPUT_GUARD === "1",
    dir: () => join(configDir, "cache-fix", "snapshots"),
    suffix: "-guard-events.jsonl",
  };
  const path = join(configDir, "cache-fix", "snapshots", "s-abc123-guard-events.jsonl");
  await writeFixture(path, recentMs());
  const recent = await telemetryConsumerVerdict(entry);
  assert.equal(recent.level, "warn", "a recent alarm entry IS the finding");
  assert.match(recent.message, /needs a look/);

  await writeFixture(path, oldMs());
  const old = await telemetryConsumerVerdict(entry);
  assert.equal(old.level, "ok", "an alarm entry outside the window is dormant, not live");
});

test("BITE — telemetry log kind: an old-mtime insertion-events file warns; a fresh one stays quiet", async () => {
  const { telemetryConsumerVerdict } = await import("../tools/shape-verdicts.mjs");
  process.env.CACHE_FIX_INSERTION_NORMALIZE = "1";
  const entry = {
    name: "telemetry-insertion-events",
    kind: "log",
    maxAgeH: 26,
    gate: () => process.env.CACHE_FIX_INSERTION_NORMALIZE === "1",
    dir: () => join(configDir, "cache-fix", "snapshots"),
    suffix: "-insertion-events.jsonl",
  };
  const path = join(configDir, "cache-fix", "snapshots", "s-xyz789-insertion-events.jsonl");
  await writeFixture(path, oldMs());
  const stale = await telemetryConsumerVerdict(entry);
  assert.equal(stale.level, "warn", "gate on, no writes within maxAgeH — silence is the defect");
  assert.match(stale.message, /last write/);

  await writeFixture(path, recentMs());
  const fresh = await telemetryConsumerVerdict(entry);
  assert.equal(fresh.level, "ok");
});

test("BITE — telemetry could-not-verify: absent file never reads as a bare warn without the gate named", async () => {
  const { telemetryConsumerVerdict } = await import("../tools/shape-verdicts.mjs");
  // Gate off, file absent (both entries): could-not-verify, message names the inability.
  const alarmOff = {
    name: "telemetry-upstream-changes",
    kind: "alarm",
    maxAgeH: 26,
    gate: () => false,
    file: () => join(configDir, "upstream-changes.jsonl"),
  };
  const vAlarmOff = await telemetryConsumerVerdict(alarmOff);
  assert.equal(vAlarmOff.level, "warn");
  assert.match(vAlarmOff.message, /gate is off/);

  const logOff = {
    name: "telemetry-session-mirror",
    kind: "log",
    maxAgeH: 26,
    gate: () => false,
    file: () => join(configDir, "session-mirrors", "session-mirror-events.jsonl"),
  };
  const vLogOff = await telemetryConsumerVerdict(logOff);
  assert.equal(vLogOff.level, "warn");
  assert.match(vLogOff.message, /gate is off/);

  // Gate ON, file absent: alarm reads ok (no alarm ever fired); log warns
  // (writes were expected and never happened) — never silently "ok" either.
  const alarmOn = { ...alarmOff, gate: () => true };
  assert.equal((await telemetryConsumerVerdict(alarmOn)).level, "ok");
  const logOn = { ...logOff, gate: () => true };
  const vLogOn = await telemetryConsumerVerdict(logOn);
  assert.equal(vLogOn.level, "warn");
  assert.match(vLogOn.message, /never been written/);
});

test("computeTelemetryVerdicts: names and order match the declared table, real writer paths", async () => {
  const { computeTelemetryVerdicts } = await import("../tools/shape-verdicts.mjs");
  const verdicts = await computeTelemetryVerdicts();
  assert.deepEqual(
    verdicts.map((v) => v.name),
    [
      "telemetry-guard-events",
      "telemetry-upstream-changes",
      "telemetry-insertion-events",
      "telemetry-deferred-tool-events",
      "telemetry-session-mirror",
      "telemetry-upstream-errors",
    ],
  );
  // Nothing gated on, nothing written: every entry is could-not-verify (warn).
  assert.ok(verdicts.every((v) => v.level === "warn"));
});

// --- Fire-ledger verdict (BACKLOG "mitigation fire-rate ledger") ---
//
// The series gate-live appends is the only evidence a retirement can rest
// on, so the failures worth pinning are the ones that would make a
// mitigation look retirable when nothing established it: a ledger that does
// not exist, a series that stopped accumulating, and a RAW column nobody
// measured being read as "the behaviour stopped".

const fireLine = (over = {}) => ({
  ts: "2026-08-02T06:00:00.000Z",
  windowFrom: "2026-08-01T06:00:00.000Z",
  ccVersions: ["2.1.220"],
  captures: 12,
  raw: { suppressions: 4, guardRestores: null, duplicates: 3 },
  absorbed: { suppressions: 2, guardRestores: 0, duplicates: null },
  ...over,
});
const AT = Date.parse("2026-08-02T09:00:00.000Z");

test("fire-ledger: no ledger is a NAMED could-not-verify, never a quiet green", async () => {
  const { fireLedgerVerdict, readFireLedger } = await import("../tools/shape-verdicts.mjs");
  for (const empty of [null, [], undefined]) {
    const v = fireLedgerVerdict(empty);
    assert.equal(v.level, "warn", "absence of the ledger must not read as absence of fires");
    assert.match(v.message, /NOT currently tracked/);
    assert.match(v.message, /no retirement has evidence/);
  }
  // The reader itself: a path that does not exist yields null, not [].
  assert.equal(await readFireLedger(join(configDir, "nope.jsonl")), null);
});

test("fire-ledger: last-fire ages are reported per class, with RAW beside them", async () => {
  const { fireLedgerVerdict } = await import("../tools/shape-verdicts.mjs");
  const v = fireLedgerVerdict([
    fireLine({ ts: "2026-07-31T06:00:00.000Z", absorbed: { suppressions: 5, guardRestores: 0, duplicates: null } }),
    fireLine({ ts: "2026-08-01T06:00:00.000Z", absorbed: { suppressions: 0, guardRestores: 0, duplicates: null } }),
    fireLine({ ts: "2026-08-02T06:00:00.000Z", absorbed: { suppressions: 0, guardRestores: 0, duplicates: null } }),
  ], AT);
  assert.equal(v.level, "ok", "a quiet mitigation is not a defect — retirement is an operator ruling");
  assert.equal(v.name, "fire-ledger");
  assert.match(v.message, /3 sweep\(s\)/);
  assert.match(v.message, /cc 2\.1\.220/);
  // Two days back, not "never": the newest line with a nonzero absorbed count
  // is what dates a mitigation's last fire.
  assert.match(v.message, /suppressions 2d \(raw 12\)/);
  // Measured-but-never-fired is the retirement CANDIDATE shape, and its raw
  // column has to travel with it: raw still nonzero means not retirable.
  assert.match(v.message, /QUIET: guardRestores never in 3 sweep\(s\)/);
  // A class with no absorbed source is neither firing nor quiet — it is
  // unmeasured, and saying so is the whole three-answer convention.
  assert.match(v.message, /no absorbed source: duplicates/);
});

test("BITE — an unmeasured RAW column reads as unmeasured, never as 'the behaviour stopped'", async () => {
  const { fireLedgerVerdict } = await import("../tools/shape-verdicts.mjs");
  const v = fireLedgerVerdict([
    fireLine({ raw: { suppressions: null, guardRestores: null, duplicates: null },
               absorbed: { suppressions: 0, guardRestores: 0, duplicates: null } }),
  ], AT);
  assert.match(v.message, /suppressions never in 1 sweep\(s\) \(raw unmeasured\)/,
    "null raw must not render as 0 — that reading retires a mitigation on evidence nobody collected");
  assert.doesNotMatch(v.message, /raw 0/);
});

test("BITE — a frozen series warns: the sweep stopped, the evidence is not accruing", async () => {
  const { fireLedgerVerdict, FIRE_LEDGER_MAX_AGE_H } = await import("../tools/shape-verdicts.mjs");
  const stale = Date.parse("2026-08-02T06:00:00.000Z") + (FIRE_LEDGER_MAX_AGE_H + 4) * 3600_000;
  const v = fireLedgerVerdict([fireLine()], stale);
  assert.equal(v.level, "warn");
  assert.match(v.message, /frozen/);
  assert.match(v.message, /NOT accumulating/);
  // Undated lines cannot be aged, and an unaged series is not a green one.
  assert.equal(fireLedgerVerdict([fireLine({ ts: "not-a-date" })]).level, "warn");
});

test("BITE — a MIXED-schema ledger parses and still answers (old lines carry no bytes)", async () => {
  const { fireLedgerVerdict, readFireLedger } = await import("../tools/shape-verdicts.mjs");
  // The bytes columns shipped after the counts, so every real ledger on disk
  // is mixed for the rest of its life. An old line is not a corrupt line: the
  // verdict reads by key and must neither throw on the missing objects nor
  // let them change what it says about the counts.
  const old = fireLine({ ts: "2026-08-01T06:00:00.000Z",
                         absorbed: { suppressions: 3, guardRestores: 0, duplicates: null } });
  const fresh = fireLine({
    ts: "2026-08-02T06:00:00.000Z",
    absorbed: { suppressions: 0, guardRestores: 0, duplicates: null },
    savedBytes: { suppressions: null, guardRestores: null, duplicates: null },
    leakedBytes: { suppressions: null, guardRestores: null, duplicates: 17203 },
  });
  const v = fireLedgerVerdict([old, fresh], AT);
  assert.equal(v.level, "ok");
  assert.match(v.message, /2 sweep\(s\)/);
  // The counts answer is byte-blind: identical to the same series without the
  // bytes fields. Bytes joining the line must not move a retirement reading.
  const bare = fireLedgerVerdict([old, fireLine({
    ts: "2026-08-02T06:00:00.000Z",
    absorbed: { suppressions: 0, guardRestores: 0, duplicates: null },
  })], AT);
  assert.equal(v.message, bare.message, "the bytes columns are not part of the counts verdict");
  // And the reader itself hands both line shapes back intact.
  const p = join(configDir, "mixed-fire.jsonl");
  await writeFile(p, JSON.stringify(old) + "\n" + JSON.stringify(fresh) + "\n");
  const lines = await readFireLedger(p);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].leakedBytes, undefined, "an old line gains nothing on read");
  assert.equal(lines[1].leakedBytes.duplicates, 17203);
});

test("fire-ledger rides computeVerdicts, reading the real ledger path", async () => {
  const { computeVerdicts, fireLedgerPath } = await import("../tools/shape-verdicts.mjs");
  // configDir is this test's XDG_STATE_HOME, so the path resolves inside it —
  // under a `cache-fix/` subdirectory now, which nothing has created yet.
  assert.equal(fireLedgerPath(), join(configDir, "cache-fix", "fire-ledger.jsonl"));
  await mkdir(dirname(fireLedgerPath()), { recursive: true });
  const before = await computeVerdicts(join(configDir, "ledger.json"));
  const fire = before.find((v) => v.name === "fire-ledger");
  assert.ok(fire, "the verdict must be in the CLI's output set");
  assert.equal(fire.level, "warn", "no ledger written yet");

  await writeFile(fireLedgerPath(),
    JSON.stringify(fireLine({ ts: new Date().toISOString() })) + "\n" + "{ torn\n");
  const after = (await computeVerdicts(join(configDir, "ledger.json"))).find((v) => v.name === "fire-ledger");
  assert.equal(after.level, "ok", "a fresh line answers — and a torn line is skipped, not fatal");
  assert.match(after.message, /1 sweep\(s\)/);
});

// --- moved-fresh (BACKLOG "split `moved`", 2026-08-02) ---

const fullPop = ({ freshAt = [] } = {}) =>
  // 200 records, all movedRefires:1 (re-firing), except the indices in
  // `freshAt` which carry a fresh recognition instead — the exact knob the
  // house rule about a check needing to go GREEN on legitimate traffic
  // (never alarming without ever clearing) requires.
  Array.from({ length: 200 }, (_, i) => ({
    ts: i,
    movedFresh: freshAt.includes(i) ? 1 : 0,
    movedRefires: freshAt.includes(i) ? 0 : 1,
  }));

test("BITE — moved-fresh: re-fires with zero fresh recognition over a full window warns", async () => {
  const { movedFreshVerdict } = await import("../tools/shape-verdicts.mjs");
  const v = movedFreshVerdict(fullPop());
  assert.equal(v.level, "warn");
  assert.match(v.message, /RE-FIRING/);
  assert.match(v.message, /200/);
});

test("BITE — moved-fresh: does NOT alarm once a single fresh recognition appears — the check must clear on legitimate traffic", async () => {
  const { movedFreshVerdict } = await import("../tools/shape-verdicts.mjs");
  const v = movedFreshVerdict(fullPop({ freshAt: [199] }));
  assert.equal(v.level, "ok", "one fresh recognition in the window is the mitigation still catching new drops");
});

test("moved-fresh: three answers — null (unreadable dir) warns named, a short window is an honest ok, never a bare alarm", async () => {
  const { movedFreshVerdict, MOVED_FRESH_MIN_SAMPLE } = await import("../tools/shape-verdicts.mjs");
  assert.equal(MOVED_FRESH_MIN_SAMPLE, 200);
  const v0 = movedFreshVerdict(null);
  assert.equal(v0.level, "warn");
  assert.match(v0.message, /unreadable/);

  const short = fullPop().slice(0, 50); // below MIN_SAMPLE, and it's all re-fires
  const v1 = movedFreshVerdict(short);
  assert.equal(v1.level, "ok", "a short window proves nothing either way — never an alarm");
  assert.match(v1.message, /50 of 200/);
});

test("readMovedFreshRecords: reads every *-insertion-events.jsonl file, skips torn lines and non-pin records, sorts oldest-first", async () => {
  const { readMovedFreshRecords } = await import("../tools/shape-verdicts.mjs");
  const dir = join(configDir, "cache-fix", "snapshots");
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "s-a-insertion-events.jsonl"),
    [
      JSON.stringify({ ts: "2026-08-02T10:00:02.000Z", action: "normalized", moved: 1, movedFresh: 0, movedRefires: 1 }),
      JSON.stringify({ ts: "2026-08-02T10:00:00.000Z", action: "normalized", moved: 1, movedFresh: 1, movedRefires: 0 }),
      JSON.stringify({ ts: "2026-08-02T10:00:01.000Z", event: "suppressed-duplicate", hash: "abc" }), // no movedFresh — a detail line
      JSON.stringify({ ts: "2026-08-02T10:00:03.000Z", action: "append-only", inserted: 1 }), // plain mode — no movedFresh
      "{ torn",
    ].join("\n") + "\n",
  );
  await writeFile(
    join(dir, "s-b-insertion-events.jsonl"),
    JSON.stringify({ ts: "2026-08-02T10:00:04.000Z", action: "normalized", moved: 0, movedFresh: 0, movedRefires: 0 }) + "\n",
  );
  const records = await readMovedFreshRecords(dir);
  assert.equal(records.length, 3, "only the three lines carrying movedFresh count — across BOTH files");
  assert.deepEqual(records.map((r) => r.movedFresh), [1, 0, 0], "sorted oldest-to-newest by ts");
  assert.deepEqual(records.map((r) => r.movedRefires), [0, 1, 0]);
});

test("readMovedFreshRecords: a missing snapshots directory is null, not an empty array", async () => {
  const { readMovedFreshRecords } = await import("../tools/shape-verdicts.mjs");
  const records = await readMovedFreshRecords(join(configDir, "does-not-exist"));
  assert.equal(records, null);
});

test("moved-fresh rides computeVerdicts, reading the real snapshots dir", async () => {
  const { computeVerdicts } = await import("../tools/shape-verdicts.mjs");
  const before = (await computeVerdicts(join(configDir, "ledger.json"))).find((v) => v.name === "moved-fresh");
  assert.ok(before, "the verdict must be in the CLI's output set");
  assert.equal(before.level, "warn", "no snapshots directory yet in this scratch config dir");

  const dir = join(configDir, "cache-fix", "snapshots");
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "s-c-insertion-events.jsonl"),
    JSON.stringify({ ts: new Date().toISOString(), action: "normalized", moved: 1, movedFresh: 1, movedRefires: 0 }) + "\n",
  );
  const after = (await computeVerdicts(join(configDir, "ledger.json"))).find((v) => v.name === "moved-fresh");
  assert.equal(after.level, "ok", "1 of 200 needed — an honest ok, not an alarm on a thin window");
  assert.match(after.message, /1 of 200/);
});

// --- Row 31's standing watcher (2026-08-15) ---
//
// Row 31 closed on a measured before/after: single-message duplicate streaks
// went 34-of-48 double-billed pre-flip to 0-of-14 post-flip (Fisher exact,
// one-sided, p = 1.4e-6), with the mitigation observed firing 8 times and
// never once on the retry class. A closure with no watcher rots silently, and
// dev-loop's own rule is that a manual investigation is unfinished while the
// check that would have produced its finding does not exist.
//
// THE SCOPE IS THE WHOLE DESIGN, and getting it wrong makes a guard that
// fires on legitimate work. The corpus is MIXED: pre-flip captures still
// carry 34 double-billed single-message streaks and will until they rotate
// out, so a watcher on the corpus-wide `singleMessageDoubleBilled` would go
// red today on traffic the mitigation could not have touched, and train its
// reader to ignore it inside a week. It reads the POST-FLIP cohort only —
// which is why the per-row `firstTs` stamp had to exist first.
//
// Red-first arrangement, and the known positive is real rather than planted:
// the SAME verdict pointed at the flip's own start-of-corpus (so every
// capture counts as post-flip) sees the 34 pre-flip double-bills and fires.
// The two arms must differ, and they do.

// Namespace import, NOT `import { rowThirtyOneVerdict }` — dev-loop.md, "the
// commonest way to collapse the split is the import line". A static named
// import of a not-yet-written export fails this whole file at ESM LINK time,
// so every pre-existing bite goes red at once and the run proves nothing about
// which half broke. Written first as a named import in this very change, which
// is how the note earned its place here rather than being quoted from the doc.
import * as sv from "../tools/shape-verdicts.mjs";
const { rowThirtyOneVerdict, COALESCE_FLIP_ISO } = sv;

const dupRow = (firstTs, over = {}) => ({
  file: `s-${firstTs}.jsonl`,
  firstTs,
  byteGate: { duplicates: {
    singleMessageStreaks: 0, singleMessageDoubleBilled: 0, singleMessageCoalesced: 0,
    multiMessageStreaks: 0, multiMessageDoubleBilled: 0, multiMessageCoalesced: 0,
    ...over,
  } },
});

test("row-31 watcher: clean when no post-flip single-message streak is double-billed", () => {
  const status = { rows: [
    dupRow("2026-08-13T09:00:00.000Z", { singleMessageStreaks: 48, singleMessageDoubleBilled: 34 }),
    dupRow("2026-08-15T09:00:00.000Z", { singleMessageStreaks: 14, singleMessageDoubleBilled: 0, singleMessageCoalesced: 8 }),
  ] };
  const v = rowThirtyOneVerdict(status);
  assert.equal(v.level, "ok", v.message);
  assert.match(v.message, /0 double-billed/i);
  // The pre-flip 34 must NOT reach the verdict — that is the whole scoping
  // argument, and a watcher that counted them would be red on day one.
  assert.doesNotMatch(v.message, /34/);
});

test("row-31 watcher FIRES on a post-flip double-bill — the regression it exists for", () => {
  const status = { rows: [
    dupRow("2026-08-15T09:00:00.000Z", { singleMessageStreaks: 3, singleMessageDoubleBilled: 2 }),
  ] };
  const v = rowThirtyOneVerdict(status);
  assert.equal(v.level, "warn", v.message);
  assert.match(v.message, /2 .*double-billed/i);
});

test("row-31 watcher FIRES on the OVER-REACH direction too — a coalesce on the retry class", () => {
  // The other way to be wrong, and the one that costs correctness rather than
  // money: suppressing a mid-session retry leaves a real request unanswered.
  // Measured 0 across all 94 streaks at closure; anything else is a breached
  // fence, not a better result.
  const status = { rows: [
    dupRow("2026-08-15T09:00:00.000Z", { multiMessageStreaks: 4, multiMessageCoalesced: 1 }),
  ] };
  const v = rowThirtyOneVerdict(status);
  assert.equal(v.level, "warn", v.message);
  assert.match(v.message, /retry class|multi-message|over-reach/i);
});

test("row-31 watcher: KNOWN POSITIVE — the same predicate over the pre-flip corpus fires", () => {
  // Not a planted defect: these are the real pre-flip numbers, and pointing
  // the verdict at a flip stamp before them makes them post-flip by
  // definition. If this stayed green the watcher would be measuring nothing.
  const status = { rows: [
    dupRow("2026-08-13T09:00:00.000Z", { singleMessageStreaks: 48, singleMessageDoubleBilled: 34 }),
  ] };
  // CORRECTED while writing it: the first version of this bite expected `ok`
  // for the pre-flip-only status. That was wrong, and the code was right —
  // with nothing post-flip on disk there is no evidence, and `ok` there would
  // be a green computed from zero observations, the exact absence-wearing-a-
  // verdict's-clothes shape. Both arms are warns; what must DIFFER, and what
  // this bite actually pins, is the REASON.
  const outOfScope = rowThirtyOneVerdict(status);
  assert.equal(outOfScope.level, "warn");
  assert.match(outOfScope.message, /nothing to verify against yet/,
    "no post-flip capture means could-not-verify, never a pass");
  assert.doesNotMatch(outOfScope.message, /34/, "pre-flip traffic must not be counted against the row");
  const red = rowThirtyOneVerdict(status, { flipIso: "2026-08-01T00:00:00Z" });
  assert.equal(red.level, "warn", "the same rows, in scope, must fire");
  assert.match(red.message, /34/);
  assert.match(red.message, /not holding/i);
});

test("row-31 watcher: three answers — an unstamped status file is could-not-verify, not clean", () => {
  const noStamp = { rows: [{ file: "old.jsonl", byteGate: { duplicates: { singleMessageDoubleBilled: 9 } } }] };
  const v = rowThirtyOneVerdict(noStamp);
  assert.equal(v.level, "warn", v.message);
  assert.match(v.message, /predates|could not verify|unstamped/i);
  assert.equal(rowThirtyOneVerdict(null).level, "warn");
  assert.equal(rowThirtyOneVerdict({ rows: [] }).level, "warn", "a sweep with no rows proves nothing");
});

test("the flip stamp is declared once and is the real one", () => {
  assert.equal(COALESCE_FLIP_ISO, "2026-08-14T16:17:00Z",
    "CACHE_FIX_COALESCE_SIDECAR went live 2026-08-14 18:17 local");
});
