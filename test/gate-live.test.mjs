// gate-live — the sweep that runs the real gate over live captures.
//
// It exists because two gate defects (a RangeError on a 955 MB capture, a
// 3.2 GB retention peak) were invisible to `npm test` by construction: the
// committed corpus is harvested for STRUCTURAL NOVELTY and sanitised, so it is
// small on purpose and can never contain a scale-shaped input.
//
// Which means this file cannot test the thing that matters either — only the
// scheduled run against real captures can. What it CAN pin is the reporting:
// that a gate which died is recorded as an error rather than smoothed into a
// clean row, and that a clean sweep needs actual captures behind it. Those are
// the two ways a green verdict could lie.

import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, writeFile, readFile, utimes, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  summarise, rowIsClean, replayArgs, CHILD_HEAP_CAP_MB,
  summariseFireRaw, reduceFireRaw, absorbedMeasurable, tallyEventLines,
  collectAbsorbed, collectCcVersions, transcriptVersions, lastFireLedgerTs,
  sidOfCapture, FIRE_CLASSES,
  summariseFireBytes, reduceFireBytes,
  parseUnitEnvironment,
} from "../tools/gate-live.mjs";
// Namespace import for collectD1Retirement — deliberate, not a style choice.
// The red-first arm of this file's own new bites runs against the
// UNMODIFIED tools/gate-live.mjs, where this export does not exist yet. A
// named import of a missing export throws a SyntaxError at ESM link time,
// which would redden every OTHER bite in this file too; a namespace import
// only fails where the missing member is actually READ, so the split stays
// discriminating (dispatch brief, "a missing export does not fail the
// module at ESM link time").
import * as gateLive from "../tools/gate-live.mjs";

const json = (o) => ({ code: 0, out: JSON.stringify(o), err: "" });

test("summarise: a clean gate run reads clean", () => {
  const row = summarise("c.jsonl", 100, json({
    report: [{ n: 0 }, { n: 1 }],
    violations: [], safety: [], sequence: [], orderViolations: [],
  }));
  assert.equal(row.requests, 2);
  assert.equal(rowIsClean(row), true);
});

// The case the job was built for. A gate that CRASHED produces no JSON; if
// that were treated as "no violations found", the sweep would report success
// precisely when the gate ran no checks at all — the exact false green that
// let the RangeError live.
test("BITE — a gate that died is an error, never a clean row", () => {
  const row = summarise("big.jsonl", 955_000_000, {
    code: 1,
    out: "",
    err: "replay failed: RangeError: Invalid string length\n    at readFileHandle",
  });
  assert.ok(row.error, "a crash must be recorded as an error");
  assert.match(row.error, /RangeError/, "the reason must survive into the status file");
  assert.equal(rowIsClean(row), false);
  assert.equal(row.stability, undefined, "no violation counts may be invented for a run that produced none");
});

test("BITE — a nonzero exit is not clean even if JSON parsed", () => {
  // replay exits non-zero on violations; the counts and the exit code must
  // agree, and if they ever disagree the stricter one wins.
  const res = json({ report: [{ n: 0 }], violations: [], safety: [], sequence: [], orderViolations: [] });
  res.code = 1;
  assert.equal(rowIsClean(summarise("c.jsonl", 10, res)), false);
});

test("BITE — each violation class alone is enough to fail the row", () => {
  for (const key of ["violations", "safety", "conservation", "sequence", "orderViolations"]) {
    const payload = {
      report: [{ n: 0 }], violations: [], safety: [], conservation: [], sequence: [], orderViolations: [],
    };
    payload[key] = [{ n: 0 }];
    const row = summarise("c.jsonl", 10, json(payload));
    assert.equal(rowIsClean(row), false, `${key} must fail the row on its own`);
  }
});

test("summarise: unparseable capture lines are counted, not hidden", () => {
  const row = summarise("c.jsonl", 10, json({
    report: [{ n: 0 }, { n: 1, error: "unparseable capture line" }],
    violations: [], safety: [], sequence: [], orderViolations: [],
  }));
  assert.equal(row.unparseable, 1);
});

test("spawn failure (no node, bad path) is an error row", () => {
  const row = summarise("c.jsonl", 10, { code: -1, out: "", err: "spawn ENOENT" });
  assert.equal(rowIsClean(row), false);
  assert.match(row.error, /ENOENT/);
});

// --- Replay fidelity in the sweep ---

test("BITE — a fidelity mismatch fails the row, whatever the four gates say", () => {
  // The four invariants can all be clean and still describe a system that
  // never ran, if the replay did not reproduce the real request.
  const row = summarise("c.jsonl", 10, json({
    report: [{ n: 0 }],
    violations: [], safety: [], sequence: [], orderViolations: [],
    fidelity: { comparable: 3, matched: 2, mismatches: [{ n: 1 }] },
  }));
  assert.equal(row.fidelityMismatch, 1);
  assert.equal(rowIsClean(row), false, "a mismatch invalidates the other numbers");
});

// The cap is the memory-regression check: a replay that retains its input
// dies against it (proven — the pre-8b7ed9e replay OOMs under it in 5 s on a
// 1.5 GB capture) and becomes an error row. Dropping the flag would disarm
// that check silently; the sweep would go back to passing on a replay whose
// memory grows with the corpus, until the machine's own ceiling ends it.
test("replay children run under the heap cap, before the script path", () => {
  const args = replayArgs("c.jsonl", ["CACHE_FIX_PREFIXDIFF=1"]);
  const capIdx = args.indexOf(`--max-old-space-size=${CHILD_HEAP_CAP_MB}`);
  assert.ok(capIdx >= 0, "heap cap flag missing from child argv");
  assert.ok(
    capIdx < args.findIndex((a) => a.endsWith("replay.mjs")),
    "cap must precede the script path or node passes it to the script instead",
  );
  assert.ok(args.includes("CACHE_FIX_PREFIXDIFF=1"), "gate env must survive");
  // Census rides every sweep: dropping it silently reverts the row-4
  // annotations to on-demand and the daily verdict stops carrying them.
  assert.ok(args.includes("--census"), "sweep must run the census annotations");
});

test("BITE — a row that compared zero pairs is marked proves-nothing, never padded into clean", () => {
  // c-empty (71 requests, all empty bodies) and single-request captures ran
  // ZERO cross-request checks; before this flag they counted toward
  // "9 captures clean". Absence of comparison must be visible.
  const row = summarise("c-empty.jsonl", 10, json({
    report: Array.from({ length: 71 }, (_, n) => ({ n })),
    violations: [], safety: [], sequence: [], orderViolations: [],
    census: { pairs: 0 },
  }));
  assert.equal(row.provesNothing, true);
  assert.equal(rowIsClean(row), true, "proves-nothing is not FAILING — it is not PROVING");
  const real = summarise("s.jsonl", 10, json({
    report: [{ n: 0 }, { n: 1 }],
    violations: [], safety: [], sequence: [], orderViolations: [],
    census: { pairs: 1 },
  }));
  assert.equal(real.provesNothing, false);
  assert.equal(real.pairs, 1);
});

test("nothing comparable is NOT a failure — it is an honest absence of evidence", () => {
  // 0 comparable must not fail the sweep; it also must not be mistaken for a
  // pass, which is why the counts are recorded rather than a bare ratio.
  const row = summarise("c.jsonl", 10, json({
    report: [{ n: 0 }],
    violations: [], safety: [], sequence: [], orderViolations: [],
    fidelity: { comparable: 0, matched: 0, mismatches: [] },
  }));
  assert.equal(row.fidelityComparable, 0);
  assert.equal(row.fidelityMismatch, 0);
  assert.equal(rowIsClean(row), true);
});

test("mutated fidelity is recorded but INFORMATIONAL — it can never fail a row", () => {
  // A mutated mismatch is legitimate (replay starts from empty state), so a
  // low mutatedMatched must not fail the sweep — but on busy sessions it is
  // the only fidelity signal there is, so losing the numbers would blind the
  // one instrument that could notice the replay modelling a different system.
  const row = summarise("c.jsonl", 10, json({
    report: [{ n: 0 }],
    violations: [], safety: [], sequence: [], orderViolations: [],
    fidelity: { comparable: 0, matched: 0, mutatedComparable: 40, mutatedMatched: 3, mismatches: [] },
  }));
  assert.equal(row.fidelityMutatedComparable, 40);
  assert.equal(row.fidelityMutatedMatched, 3);
  assert.equal(rowIsClean(row), true, "a poor mutated ratio is a hint, not a verdict");
});

// --- Mitigation fire ledger ---
//
// The ledger's whole value is a distinction that costs nothing to break:
// `null` (nobody measured this) vs `0` (measured, nothing fired). A
// retirement rests on the RAW column reading 0 across sweeps, so a null
// silently rendered as 0 would retire a mitigation on evidence that was
// never collected. Every case below is that distinction under a different
// disguise.

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const pExecFile = promisify(execFile);

test("fire-raw: an absent census source is null, never 0", () => {
  const none = summariseFireRaw({});
  for (const cls of ["suppressions", "relocations", "oscillationAbsorptions", "blockMigrations"]) {
    assert.equal(none[cls], null, `${cls} has no source in this payload — null, not 0`);
  }
  // guardRestores has no census measure AT ALL (an output-guard restore
  // answers our own pipeline's invalid output, not CC behaviour), so it is
  // null even on a fully populated payload. The declared gap, asserted so a
  // later "helpful" proxy measure has to argue with a test.
  const full = summariseFireRaw({ blockMigrations: [], toolsDeltas: [], mitigation: [] });
  assert.equal(full.guardRestores, null, "guardRestores has no raw source — null");
  assert.equal(full.suppressions, 0, "an EMPTY measured array is a real zero");
  assert.equal(full.blockMigrations, 0);
});

test("fire-raw: each class counts the CC behaviour it names", () => {
  const raw = summariseFireRaw({
    blockMigrations: [
      { direction: "inline->standalone" },
      { direction: "inline->standalone", flap: { span: 2 } },
      { direction: "standalone->inline" },
    ],
    toolsDeltas: [{ count: "12->14" }, { count: "14->14" }, { count: "14->13" }],
    mitigation: [{ n: 1 }, { n: 2 }],
  });
  assert.equal(raw.suppressions, 2, "the reminder-swap shape is the inline->standalone direction");
  assert.equal(raw.oscillationAbsorptions, 1, "only flap-tagged rows are oscillations");
  assert.equal(raw.blockMigrations, 3, "both directions");
  assert.equal(raw.relocations, 2, "one per MITIGABLE pair");
  assert.equal(raw.toolAdditionAnnouncements, 1, "a REMOVAL and a no-op are not additions");
});

test("BITE — a column no capture measured stays null through the sweep rollup", () => {
  const rows = [{ fireRaw: summariseFireRaw({}) }, { fireRaw: summariseFireRaw({}) }];
  const { raw } = reduceFireRaw(rows);
  for (const cls of FIRE_CLASSES) assert.equal(raw[cls], null, `${cls} must not sum nulls into 0`);
  // A column SOME captures measured is summed over those, and the partial
  // coverage is named — a sum over 1 of 2 captures is not a corpus total.
  const mixed = reduceFireRaw([
    { fireRaw: summariseFireRaw({ blockMigrations: [{ direction: "inline->standalone" }] }) },
    { fireRaw: summariseFireRaw({}) },
  ]);
  assert.equal(mixed.raw.suppressions, 1);
  assert.equal(mixed.partial.suppressions, 1, "1 of 2 captures contributed — say so");
});

test("BITE — duplicates come from the census rollup, and absence stays null", () => {
  const withDup = reduceFireRaw([
    { fireRaw: summariseFireRaw({}), byteGate: { duplicates: { streaks: 3 } } },
    { fireRaw: summariseFireRaw({}), byteGate: { duplicates: { streaks: 4 } } },
  ]);
  assert.equal(withDup.raw.duplicates, 7);
  const noDup = reduceFireRaw([{ fireRaw: summariseFireRaw({}), byteGate: { error: "boom" } }]);
  assert.equal(noDup.raw.duplicates, null, "a census that could not run measured nothing");
});

// --- SAVED vs LEAKED bytes ---
//
// Same null-vs-0 distinction as the counts, one step nastier: a byte column
// is a COST claim, so a 0 that should have been null reads as "this class is
// free" and a retirement gets argued on it.

test("fire-bytes: LEAKED comes off the mitigation rows, everything else is null", () => {
  const b = summariseFireBytes({
    mitigation: [
      { mitigated: false, rebilledBytes: 9913, rebilledOutBytes: 0 },
      { mitigated: false, rebilledBytes: 7290, rebilledOutBytes: 0 },
    ],
    // Populated but byte-less sources: these must NOT produce a 0.
    blockMigrations: [{ direction: "inline->standalone" }, { direction: "inline->standalone", flap: {} }],
    toolsDeltas: [{ count: "12->14" }],
  });
  assert.equal(b.leaked.relocations, 17203, "the input-side re-bill of the passthroughs");
  for (const cls of FIRE_CLASSES) {
    if (cls === "relocations") continue;
    assert.equal(b.leaked[cls], null, `${cls} source rows carry no byte field — null, not 0`);
  }
});

test("fire-bytes: a mitigated row leaks nothing, so LEAKED is 'passed through'", () => {
  // replay.mjs:1044 writes rebilledBytes 0 on a mitigated row, so a corpus
  // where every relocation was mitigated is a real, measured zero — the one
  // case in this block where 0 is the right answer.
  const b = summariseFireBytes({
    mitigation: [
      { mitigated: true, rebilledBytes: 0, rebilledOutBytes: 4096 },
      { mitigated: false, rebilledBytes: 500, rebilledOutBytes: 0 },
    ],
  });
  assert.equal(b.leaked.relocations, 500, "only the passthrough is a leak");
  // rebilledOutBytes is NOT folded in: output tokens price differently, so a
  // sum of the two prices nothing (summariseFireBytes' closing note).
  assert.notEqual(b.leaked.relocations, 4596);
});

test("fire-bytes: SAVED reads replay's retained field — old-schema rows stay unmeasured, never 0", () => {
  // Was "SAVED has no source anywhere": replay now retains the
  // pre-mitigation re-bill as the mitigation row's `savedBytes` (complement
  // of rebilledBytes — the mitigation-output-form suite pins the
  // retained-not-recomputed contract). Three states, each pinned:
  // OLD-SCHEMA rows (field absent) are unmeasured — null, never 0.
  const old = summariseFireBytes({
    mitigation: [{ mitigated: true, rebilledBytes: 0, rebilledOutBytes: 4096 }],
    blockMigrations: [{ direction: "inline->standalone" }],
    toolsDeltas: [{ count: "12->14" }],
  });
  assert.equal(old.saved.relocations, null, "old-schema census is unmeasured, and unmeasured is not 0 saved");
  // NEW-SCHEMA rows sum the retained field; a passthrough row contributes 0.
  const live = summariseFireBytes({
    mitigation: [
      { mitigated: true, rebilledBytes: 0, savedBytes: 9913 },
      { mitigated: false, rebilledBytes: 7290, savedBytes: 0 },
    ],
  });
  assert.equal(live.saved.relocations, 9913, "the retained pre-mitigation re-bill flows through");
  assert.equal(live.leaked.relocations, 7290, "leaked is untouched by the saved read");
  // The other six classes still have no saved source — null, never 0.
  for (const cls of FIRE_CLASSES) {
    if (cls === "relocations") continue;
    assert.equal(live.saved[cls], null, `saved.${cls} is unmeasured, and unmeasured is not 0 saved`);
  }
});

test("BITE — a byte column no capture measured stays null through the sweep rollup", () => {
  const empty = reduceFireBytes([
    { fireBytes: summariseFireBytes({}) },
    { fireBytes: summariseFireBytes({}) },
  ]);
  for (const cls of FIRE_CLASSES) {
    assert.equal(empty.savedBytes[cls], null, `savedBytes.${cls} must not sum nulls into 0`);
    assert.equal(empty.leakedBytes[cls], null, `leakedBytes.${cls} must not sum nulls into 0`);
  }
  // A capture that MEASURED the class contributes; one that could not stays
  // out of the sum rather than dragging it to 0.
  const mixed = reduceFireBytes([
    { fireBytes: summariseFireBytes({ mitigation: [{ rebilledBytes: 100 }] }) },
    { fireBytes: summariseFireBytes({}) },
    { fireBytes: summariseFireBytes({ mitigation: [{ rebilledBytes: 250 }] }) },
  ]);
  assert.equal(mixed.leakedBytes.relocations, 350);
  assert.equal(mixed.leakedBytes.suppressions, null, "an unmeasurable class survives the rollup as null");
  assert.equal(mixed.savedBytes.relocations, null);
  // A row with no fireBytes at all (a capture the gate could not run) must
  // not throw and must not count as a zero.
  const missing = reduceFireBytes([{}, { fireBytes: summariseFireBytes({ mitigation: [] }) }]);
  assert.equal(missing.leakedBytes.relocations, 0, "an EMPTY measured array is a real zero");
  assert.equal(missing.savedBytes.relocations, 0, "saved mirrors leaked's empty-array convention");
});

test("BITE — a gate that is OFF makes its absorbed column unmeasurable, not zero", () => {
  const on = absorbedMeasurable(
    ["CACHE_FIX_INSERTION_NORMALIZE=1", "CACHE_FIX_TOOL_REWRITE=1", "CACHE_FIX_OUTPUT_GUARD=1"],
    "cache-fix-proxy.service",
  );
  assert.deepEqual(
    { s: on.suppressions, t: on.toolAdditionAnnouncements, g: on.guardRestores },
    { s: true, t: true, g: true },
  );
  const off = absorbedMeasurable(["CACHE_FIX_INSERTION_NORMALIZE=1"], "cache-fix-proxy.service");
  assert.equal(off.toolAdditionAnnouncements, false, "gate off — its log is not being written");
  // The serving set itself unknown: nothing is measurable, because a sweep
  // that cannot say what was running cannot say what it absorbed.
  const blind = absorbedMeasurable(["CACHE_FIX_INSERTION_NORMALIZE=1"], "unavailable");
  for (const cls of Object.keys(blind)) assert.equal(blind[cls], false, `${cls} unmeasurable without a gate source`);
});

test("absorbed: only lines inside the window count", () => {
  const lines = [
    JSON.stringify({ ts: "2026-08-01T00:00:00.000Z", suppressed: 5, moved: 1 }),
    JSON.stringify({ ts: "2026-08-02T00:00:00.000Z", suppressed: 2, moved: 3 }),
    JSON.stringify({ ts: "2026-08-03T00:00:00.000Z", suppressed: 9, moved: 9 }),
    "{ torn",
  ].join("\n");
  const t = tallyEventLines(lines, Date.parse("2026-08-01T12:00:00Z"), Date.parse("2026-08-03T00:00:00Z"), {
    suppressions: (r) => r.suppressed ?? 0,
    relocations: (r) => r.moved ?? 0,
  });
  assert.deepEqual(t, { suppressions: 2, relocations: 3 }, "the window is half-open [since, until)");
});

async function snapshotDirWith(files) {
  const dir = await tmpDir("fire-snapshots-");
  for (const [name, body] of Object.entries(files)) {
    await writeFile(join(dir, name), body);
    // Recent mtime: the append-only prefilter must not skip these.
    await utimes(join(dir, name), new Date(), new Date());
  }
  return dir;
}

test("absorbed: real event-log shapes tally into their own classes", async (t) => {
  // Line shapes copied from the live logs: insertion-normalization writes one
  // per-request record carrying `suppressed`/`moved` AND per-suppression
  // detail lines carrying neither — counting the detail lines too would
  // double-count every fire.
  const dir = await snapshotDirWith({
    "s-a-insertion-events.jsonl": [
      JSON.stringify({ ts: "2026-08-02T10:00:00.000Z", action: "normalized", inserted: 2, pinned: 4, dropped: 0, suppressed: 2, moved: 1 }),
      JSON.stringify({ ts: "2026-08-02T10:00:01.000Z", event: "suppressed-duplicate", hash: "abc", index: 30 }),
      JSON.stringify({ ts: "2026-08-02T10:00:02.000Z", action: "append-only", inserted: 1, pinned: 0, dropped: 0, suppressed: 0 }),
    ].join("\n") + "\n",
    "s-b-deferred-tool-events.jsonl": [
      JSON.stringify({ ts: "2026-08-02T10:00:00.000Z", action: "rewrite", newNames: ["Read", "Edit"], heldNames: [], injected: 1 }),
      JSON.stringify({ ts: "2026-08-02T10:00:05.000Z", action: "unchanged", newNames: [], heldNames: [], injected: 0 }),
    ].join("\n") + "\n",
  });
  t.after(() => rm(dir, { recursive: true, force: true }));

  const all = { suppressions: true, relocations: true, toolAdditionAnnouncements: true, guardRestores: true };
  const a = await collectAbsorbed(dir, Date.parse("2026-08-02T00:00:00Z"), Date.parse("2026-08-03T00:00:00Z"), all);
  assert.equal(a.suppressions, 2, "the detail line must not be counted a second time");
  assert.equal(a.relocations, 1);
  assert.equal(a.toolAdditionAnnouncements, 2, "two tool names announced");
  assert.equal(a.guardRestores, 0, "gate on and no guard log at all IS a measured zero");
  for (const cls of ["oscillationAbsorptions", "blockMigrations", "duplicates"]) {
    assert.equal(a[cls], null, `${cls} has no absorbed source — the declared gap stays null`);
  }

  const off = await collectAbsorbed(dir, Date.parse("2026-08-02T00:00:00Z"), Date.parse("2026-08-03T00:00:00Z"), {
    suppressions: false, relocations: false, toolAdditionAnnouncements: false, guardRestores: false,
  });
  for (const cls of FIRE_CLASSES) assert.equal(off[cls], null, `${cls} unmeasurable with every gate off`);

  // A snapshots directory that is not THERE is the dangerous shape: a fresh
  // machine and a sweep pointed at the wrong path look identical from here,
  // and reading it as 0 feeds a false quiet straight into a retirement.
  const gone = await collectAbsorbed(join(dir, "not-here"), Date.parse("2026-08-02T00:00:00Z"), Date.parse("2026-08-03T00:00:00Z"), all);
  for (const cls of FIRE_CLASSES) assert.equal(gone[cls], null, `${cls} must not read 0 from a directory nobody found`);
});

test("BITE — relocations counts FRESH recognitions, not the moved sum, with `moved` as the legacy-line fallback " +
     "(BACKLOG \"split `moved`\", 2026-08-02)", async (t) => {
  const dir = await snapshotDirWith({
    "s-a-insertion-events.jsonl": [
      // A NEW-shape line: moved=1 is entirely a re-fire (movedFresh:0). The
      // sum would have counted it as one relocation; the split must not.
      JSON.stringify({ ts: "2026-08-02T10:00:00.000Z", action: "normalized", moved: 1, movedFresh: 0, movedRefires: 1 }),
      // A NEW-shape line with a genuine fresh recognition: this one counts.
      JSON.stringify({ ts: "2026-08-02T10:00:01.000Z", action: "normalized", moved: 1, movedFresh: 1, movedRefires: 0 }),
      // A LEGACY line written before this change — no movedFresh field at
      // all. It must fall back to `moved`, not read as zero.
      JSON.stringify({ ts: "2026-08-02T10:00:02.000Z", action: "normalized", moved: 1 }),
    ].join("\n") + "\n",
  });
  t.after(() => rm(dir, { recursive: true, force: true }));

  const a = await collectAbsorbed(dir, Date.parse("2026-08-02T00:00:00Z"), Date.parse("2026-08-03T00:00:00Z"),
    { suppressions: false, relocations: true, toolAdditionAnnouncements: false, guardRestores: false });
  assert.equal(a.relocations, 2, "the re-fire-only line contributes 0, the fresh line contributes 1, the legacy line falls back to its `moved`=1");
});

test("cc versions: read from the transcript that owns the swept session", async (t) => {
  const root = await tmpDir("fire-projects-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "-home-g-dev-x"), { recursive: true });
  const sid = "00000000-0000-4000-8000-c4f1efb22222";
  await writeFile(join(root, "-home-g-dev-x", `${sid}.jsonl`), [
    JSON.stringify({ type: "user", version: "2.1.219", sessionId: sid }),
    JSON.stringify({ type: "assistant", version: "2.1.220", sessionId: sid }),
    // A `version` nested in content is NOT the client's version.
    JSON.stringify({ type: "user", message: { content: "the version: 9.9.9" } }),
  ].join("\n") + "\n");
  // A transcript for a session this sweep did NOT touch must not contribute.
  await writeFile(join(root, "-home-g-dev-x", "00000000-0000-4000-8000-c4f1efb22223.jsonl"),
    JSON.stringify({ version: "1.0.0" }) + "\n");

  assert.equal(sidOfCapture(`s-${sid}-requests.jsonl`), sid);
  assert.equal(sidOfCapture("c-empty-requests.jsonl"), null, "a keyless capture names no session");
  assert.deepEqual(
    await collectCcVersions([`s-${sid}-requests.jsonl`, "c-empty-requests.jsonl"], root),
    ["2.1.219", "2.1.220"],
  );
  assert.deepEqual(await collectCcVersions([], root), []);
  assert.deepEqual([...await transcriptVersions(join(root, "nope.jsonl"))], [],
    "an unreadable transcript contributes nothing, never a wrong version");
});

test("the absorbed window starts at the previous line, so the series is additive", async (t) => {
  const dir = await tmpDir("fire-ledger-");
  t.after(() => rm(dir, { recursive: true, force: true }));
  const p = join(dir, "l.jsonl");
  assert.equal(await lastFireLedgerTs(p), null, "no ledger yet — no window to inherit");
  await writeFile(p, [
    JSON.stringify({ ts: "2026-08-01T06:00:00.000Z" }),
    "{ torn line",
    JSON.stringify({ ts: "2026-08-02T06:00:00.000Z" }),
  ].join("\n") + "\n");
  assert.equal(await lastFireLedgerTs(p), "2026-08-02T06:00:00.000Z");
});

// --- The sweep itself ---
//
// The unit cases above pin the columns; this one pins that a REAL run
// appends a real line. Everything is temp: captures, status, ledger,
// snapshots and transcripts — the production files under ~/.claude are
// never touched by the suite.
test("BITE — a real sweep appends exactly one well-formed ledger line", async (t) => {
  const dir = await tmpDir("fire-sweep-");
  t.after(() => rm(dir, { recursive: true, force: true }));
  const captures = join(dir, "captures");
  const snapshots = join(dir, "snapshots");
  const transcripts = join(dir, "projects");
  await mkdir(captures, { recursive: true });
  await mkdir(snapshots, { recursive: true });
  await mkdir(transcripts, { recursive: true });
  const ledger = join(dir, "fire.jsonl");
  const status = join(dir, "status.json");

  const msg = (role, text) => ({ role, content: [{ type: "text", text }] });
  const line = (ts, id, messages) =>
    JSON.stringify({ ts, id, sid: "sweep-0001", key: "s-sweep-0001", headers: {}, body: { model: "claude-x", messages } });
  await writeFile(join(captures, "s-sweep-0001-requests.jsonl"), [
    line("2026-08-02T10:00:00.000Z", "r1", [msg("user", "hello"), msg("assistant", "hi")]),
    line("2026-08-02T10:00:05.000Z", "r2", [msg("user", "hello"), msg("assistant", "hi"), msg("user", "again")]),
  ].join("\n") + "\n");

  const run = () =>
    pExecFile("node", [
      join(REPO, "tools", "gate-live.mjs"),
      "--captures", captures, "--status", status, "--fire-ledger", ledger,
      "--snapshots", snapshots, "--transcripts", transcripts, "--quiet",
    ], { cwd: REPO }).catch((e) => e); // a failing sweep still owes its ledger line

  await run();
  let lines = (await readFile(ledger, "utf-8")).split("\n").filter(Boolean);
  assert.equal(lines.length, 1, "one sweep, one line");
  const rec = JSON.parse(lines[0]);
  assert.ok(!Number.isNaN(Date.parse(rec.ts)), "the line must be dated");
  assert.ok(!Number.isNaN(Date.parse(rec.windowFrom)), "the absorbed window must be dated");
  assert.equal(rec.windowSeeded, true, "the first line's window has no predecessor — say so");
  assert.ok(Array.isArray(rec.ccVersions));
  assert.equal(rec.captures, 1);
  for (const cls of FIRE_CLASSES) {
    // The bytes objects carry the SAME key set as the counts — a reader
    // indexes all four the same way, and a missing key is indistinguishable
    // from an unmeasured one at read time.
    for (const col of ["raw", "absorbed", "savedBytes", "leakedBytes"]) {
      assert.ok(cls in rec[col], `${col}.${cls} missing — a class with no column cannot be retired or re-opened`);
      const v = rec[col][cls];
      assert.ok(v === null || typeof v === "number", `${col}.${cls} must be a number or null, got ${JSON.stringify(v)}`);
    }
  }
  assert.equal(rec.raw.guardRestores, null, "the declared raw gap survives a real run");
  // The saved/leaked columns re-baselined on 2026-08-20 (pricing moved from
  // `mitigated` to `absorbed`), so the series is discontinuous across that
  // date. Every line written after it must SAY which rule priced it, or a
  // later reader compares two incomparable halves and cannot tell — the
  // discontinuity is invisible in the numbers themselves, which is exactly
  // why it needs a field rather than a memory.
  assert.equal(rec.bytesPricing, "absorbed",
    "a line must name its own pricing rule; absence means the pre-2026-08-20 rule, so a NEW line without it is silently mis-readable");
  // relocations' saved source is live (replay's retained savedBytes field):
  // this sweep's only pair is append-only, so the measured mitigation array
  // is EMPTY — a real zero, mirroring leaked's empty-array convention. The
  // other six classes still have no saved source and survive as null.
  for (const cls of FIRE_CLASSES) {
    const expected = cls === "relocations" ? 0 : null;
    assert.equal(rec.savedBytes[cls], expected, `saved.${cls}: declared gaps survive a real run, measured-empty is 0`);
  }

  // Append-only, and the second run inherits the first's ts as its window.
  await run();
  lines = (await readFile(ledger, "utf-8")).split("\n").filter(Boolean);
  assert.equal(lines.length, 2, "the ledger appends, never rewrites");
  assert.equal(JSON.parse(lines[1]).windowFrom, rec.ts, "windows abut — absorbed counts never double-count");
  assert.equal(JSON.parse(lines[1]).windowSeeded, false);
  assert.deepEqual(JSON.parse(lines[0]), rec, "an earlier line is never edited by a later run");
});

// --- absorption misses in the sweep -----------------------------------------
//
// findAbsorptionMisses answers the question no gate asked when a 349k bust
// replayed exit 0 — did a mitigation that RAN also ABSORB. It only helps if
// the DAILY sweep carries it: a check that runs when someone thinks to invoke
// replay by hand is not in front of the boundary, which is the same complaint
// absence-scan's own header makes about its predecessor.

test("the sweep rolls up absorption misses, and keeps the OURS count separate", async () => {
  const { summariseAbsorption } = await import("../tools/gate-live.mjs");
  const rows = [
    { absorptionMisses: 2, absorptionMissesOurs: 1 },
    { absorptionMisses: 0, absorptionMissesOurs: 0 },
    { absorptionMisses: 3, absorptionMissesOurs: 3 },
    {}, // a row from an older status file, or a capture that never ran
  ];
  assert.deepEqual(summariseAbsorption(rows),
    { total: 5, ours: 4, captures: 2, cacheControlOnly: 0, cacheControlUnknown: 0 },
    "total, the attributable subset, and how many captures produced any");
});

test("the rollup separates moved BREAKPOINTS from stale content", async () => {
  // DEFINITION (replay.mjs's `cacheControlOnly`): a miss whose forwarded pair
  // is identical once every cache_control key is dropped is a breakpoint that
  // moved, not a message that went stale — the API keys its cache on content.
  // First corpus-wide classification, 2026-08-05: 26 of 34 rows. A summary
  // that reports only total/ours describes that population as if all of it
  // re-billed, which is the "a check that fires on a non-defect is failing
  // too" shape at the reporting layer.
  const { summariseAbsorption } = await import("../tools/gate-live.mjs");
  const rows = [
    { absorptionMisses: 3, absorptionMissesOurs: 2, absorptionMissRows: [
      { cacheControlOnly: true }, { cacheControlOnly: true }, { cacheControlOnly: false },
    ] },
    { absorptionMisses: 1, absorptionMissesOurs: 1, absorptionMissRows: [{ cacheControlOnly: true }] },
  ];
  const s = summariseAbsorption(rows);
  assert.equal(s.cacheControlOnly, 3);
  assert.equal(s.cacheControlUnknown, 0);
  assert.equal(s.total, 4, "the total is untouched — the rows are annotated, never dropped");
});

test("a row from a replay that predates the field counts as UNKNOWN, never as content", async () => {
  // The three-answer rule at the rollup: a sweep run against an older replay
  // must not read as "none of these were breakpoint moves". Same failure the
  // `?? []` on absorptionMissRows was fixed for one layer down.
  const { summariseAbsorption } = await import("../tools/gate-live.mjs");
  const s = summariseAbsorption([
    { absorptionMisses: 2, absorptionMissesOurs: 1, absorptionMissRows: [{ ours: true }, { ours: false }] },
  ]);
  assert.equal(s.cacheControlOnly, 0);
  assert.equal(s.cacheControlUnknown, 2);
});

test("BITE — summarise carries the absorption-miss ROWS, not just their count", () => {
  // Before this field the sweep computed the rows and threw them away — a
  // corpus-wide classification meant re-reading every live capture (~8 GB)
  // a second time. Pinned so a future refactor cannot silently drop it back
  // to counts-only.
  const misses = [{ n: 5, prevN: 4, forwardedDivergence: 3, ours: true }];
  const row = summarise("c.jsonl", 10, json({
    report: [{ n: 0 }], violations: [], safety: [], sequence: [], orderViolations: [],
    absorptionMisses: misses,
  }));
  assert.deepEqual(row.absorptionMissRows, misses);
});

test("a run with no absorption misses carries an empty row array, not undefined", () => {
  const row = summarise("c.jsonl", 10, json({
    report: [{ n: 0 }], violations: [], safety: [], sequence: [], orderViolations: [],
    absorptionMisses: [],
  }));
  assert.deepEqual(row.absorptionMissRows, []);
});

// --- per-gate finding ROWS in the sweep --------------------------------------
//
// DEFINITION (BACKLOG "the daily sweep persists ROWS, not just counts, for
// every gate that produces them"), written before the assertions so the
// expectations come from the invariant rather than from the code:
//
//   For every gate that computes per-row findings, the sweep row carries
//   those rows VERBATIM as the child reported them, bounded at 200 per gate
//   per capture, and says so when the bound truncated.
//
// Why verbatim and why at find-time: the capture behind a row is evicted
// within hours (oldest-mtime-first, and a session goes quiet exactly when it
// stops being traffic and starts being evidence), so a row not written when
// it is found is unanswerable afterwards, not merely inconvenient. Counts
// survive eviction and answer nothing — `stability: 1` in the status file is
// what forced one violation's real cost to be hand-derived from a 281 MB
// capture, and the absorption rows' absence cost an ~8 GB re-read before
// `absorptionMissRows` shipped.

test("BITE — summarise carries the stability and conservation ROWS, not just their counts", () => {
  const violations = [{ n: 47, prevN: 44, outDiv: 4, prefixAboveMessages: { messages: 12, bytes: 3400 } }];
  const exemptions = [{ n: 51, prevN: 47, reason: "reset-wipes" }];
  const conservation = [{ n: 12, index: 3, kind: "unforwarded" }, { n: 14, index: 9, kind: "unforwarded" }];
  const conservationExemptions = [{ n: 13, index: 4, reason: "assistant-role" }];
  const sequence = [{ n: 20, prevN: 18 }];
  const orderViolations = [{ n: 30, ci: 5, wire: 2 }];
  const row = summarise("c.jsonl", 10, json({
    report: [{ n: 0 }], safety: [],
    violations, exemptions, conservation, conservationExemptions, sequence, orderViolations,
  }));
  assert.deepEqual(row.stabilityRows, violations, "a violation's prefixAboveMessages is the answer to what it COST");
  assert.deepEqual(row.stabilityExemptRows, exemptions);
  assert.deepEqual(row.conservationRows, conservation);
  assert.deepEqual(row.conservationExemptRows, conservationExemptions);
  assert.deepEqual(row.sequenceRows, sequence);
  assert.deepEqual(row.orderRows, orderViolations);
  // Persistence only: the counts and the clean verdict are untouched.
  assert.equal(row.stability, 1);
  assert.equal(row.conservation, 2);
  assert.equal(rowIsClean(row), false, "rows are recorded; what fails a row does not change");
});

test("BITE — a persisted row array is capped at 200 and states its pre-truncation total", () => {
  const many = Array.from({ length: 250 }, (_, n) => ({ n, index: n }));
  const row = summarise("c.jsonl", 10, json({
    report: [{ n: 0 }], violations: [], safety: [], sequence: [], orderViolations: [],
    conservation: many,
  }));
  assert.equal(row.conservationRows.length, 200, "the bound holds");
  assert.deepEqual(row.conservationRows, many.slice(0, 200), "the kept rows are the first 200, verbatim");
  assert.equal(row.conservationRowsTruncated, 250,
    "a silently short list is the failure this exists to prevent, one level up");
  assert.equal(row.conservation, 250, "the count is the full population, not the persisted slice");
});

test("BITE — at the cap there is no truncation marker: the marker's presence MEANS rows were dropped", () => {
  const exactly = Array.from({ length: 200 }, (_, n) => ({ n }));
  const row = summarise("c.jsonl", 10, json({
    report: [{ n: 0 }], violations: [], safety: [], sequence: [], orderViolations: [],
    conservation: exactly,
  }));
  assert.equal(row.conservationRows.length, 200);
  assert.ok(!("conservationRowsTruncated" in row),
    "a marker on a complete list would train its reader to ignore the marker");
});

// `absorptionMissRows` is in the list because it shipped BEFORE the rule the
// other six were built with, and it shipped with `?? []` — the exact
// absent-reads-as-measured-zero defect. It is the oldest row field and the one
// a reader consults first, so it gets the same three answers as the rest.
const ROW_FIELDS = ["stabilityRows", "stabilityExemptRows", "conservationRows",
                    "conservationExemptRows", "sequenceRows", "orderRows",
                    "absorptionMissRows", "relocDepartureRows", "identityRotationRows"];

test("BITE — a child that produced no verdict carries an error, never empty row arrays", () => {
  // The three-answer rule at the row level: empty arrays on a run that
  // checked NOTHING read exactly like "checked and clean". This is the same
  // false green the RangeError lived behind.
  const died = summarise("big.jsonl", 955_000_000, {
    code: 1, out: "", err: "replay failed: RangeError: Invalid string length",
  });
  assert.match(died.error, /RangeError/);
  for (const f of ROW_FIELDS) {
    assert.ok(!(f in died), `${f} must be absent on a run that produced no verdict, not []`);
  }
  const spawnFailed = summarise("c.jsonl", 10, { code: -1, out: "", err: "spawn ENOENT" });
  for (const f of ROW_FIELDS) {
    assert.ok(!(f in spawnFailed), `${f} must be absent when the child never ran, not []`);
  }
});

test("BITE — a field the child never emitted is null, an EMPTY array is a measured zero", () => {
  // Same null-vs-0 distinction the fire ledger keeps, one level up: an older
  // replay schema (or a gate that did not run) measured nothing, and `[]`
  // there is a claim of cleanliness nobody made.
  const old = summarise("c.jsonl", 10, json({ report: [{ n: 0 }] }));
  for (const f of ROW_FIELDS) assert.equal(old[f], null, `${f}: unmeasured is not "none found"`);
  const measured = summarise("c.jsonl", 10, json({
    report: [{ n: 0 }], violations: [], exemptions: [], safety: [], conservation: [],
    conservationExemptions: [], sequence: [], orderViolations: [], absorptionMisses: [],
    relocDepartures: [], identityRotations: [],
  }));
  for (const f of ROW_FIELDS) assert.deepEqual(measured[f], [], `${f}: a real zero is []`);
  // The labelled-pair summary follows the same three-answer discipline: a
  // measured empty array is BOTH numbers at zero, never an absent summary
  // field standing in for "nothing to report".
  assert.deepEqual(measured.identityRotations, { requests: 0, transitions: 0 },
    "an empty measured array is a real zero pair, not an absent summary");
  assert.ok(!("identityRotations" in old), "identityRotations summary is absent when the child never emitted the field");
});

// --- Row 26: identityRotations carried out of the daily sweep ---
//
// --census already computes this on every sweep (replayArgs); before this,
// the sweep discarded it — the same defect the relocDepartureRows comment
// documents for its own class. Two things must be persisted: the rows
// themselves (identityRotationRows, the three-answer field) and the labelled
// pair (row.identityRotations: requests vs transitions) so a reader never
// has to re-derive one from the other.

test("BITE — identityRotations: a mix of transitions and repeats persists both rows and the labelled pair", () => {
  const identityRotations = [
    { n: 5, ts: "t1", key: "k", rawId: "r1", fwdId: "f1", transition: true },
    { n: 9, ts: "t2", key: "k", rawId: "r1", fwdId: "f1", transition: false },
    { n: 31, ts: "t3", key: "k2", rawId: "r2", fwdId: "f2", transition: true },
  ];
  const row = summarise("c.jsonl", 10, json({
    report: [{ n: 0 }], safety: [], identityRotations,
  }));
  assert.deepEqual(row.identityRotationRows, identityRotations,
    "verbatim from the child, like relocDepartureRows — the sweep records, it does not reshape");
  assert.deepEqual(row.identityRotations, { requests: 3, transitions: 2 },
    "requests = every row served under a rotated identity; transitions = only the first occurrence per (key, rawId)");
});

test("BITE — identityRotations: a truncated row list still reports the FULL summary pair", () => {
  // ROW_CAP truncation bounds the persisted evidence, never the count the
  // labelled pair reports — the same split conservationRows already proves
  // (truncated rows, untruncated `row.conservation` count).
  const many = Array.from({ length: 250 }, (_, n) => ({
    n, ts: `t${n}`, key: "k", rawId: `r${n}`, fwdId: `f${n}`, transition: true,
  }));
  const row = summarise("c.jsonl", 10, json({
    report: [{ n: 0 }], safety: [], identityRotations: many,
  }));
  assert.equal(row.identityRotationRows.length, 200, "the bound holds");
  assert.equal(row.identityRotationRowsTruncated, 250, "pre-truncation total is stated beside the array");
  assert.deepEqual(row.identityRotations, { requests: 250, transitions: 250 },
    "the labelled pair is computed from the full population, not the capped slice");
});

test("a sweep with absorption misses is still CLEAN — the check reports, it does not gate", async () => {
  // Deliberate, and the reason is this repo's own recurring defect: the
  // check's corpus-wide rate is unmeasured, and failing a sweep before anyone
  // knows how often it fires on legitimate work trains the reader to discount
  // red. Promote it once the rate is known.
  const { summariseAbsorption } = await import("../tools/gate-live.mjs");
  const s = summariseAbsorption([{ absorptionMisses: 9, absorptionMissesOurs: 9 }]);
  assert.equal(s.total, 9, "carried in the status file");
  // The clean predicate is not exported; assert the intent at the rollup level
  // by pinning that the summary is a REPORT shape — counts, no verdict field.
  assert.deepEqual(Object.keys(s).sort(),
    ["cacheControlOnly", "cacheControlUnknown", "captures", "ours", "total"],
    "no pass/fail field: a reader decides, the sweep does not");
});

// --- D1 retirement instrumentation (BACKLOG "D1's retirement trigger is a
// HAND-GREP", widened 2026-08-11 with the absorption counter) -------------
//
// Two questions, both answered from `<key>-{insertion,deferred-tool}-events.jsonl`
// in the snapshots dir, never from the capture corpus:
//   d1OldKeyFallback            has the dual-read bridge's fallback fired —
//                               the seven-day-zero retirement trigger.
//   d1PostRelocationNoBaseline  did a session whose key just rotated land on
//                               `no-baseline` anyway — row 26's original
//                               216,060-token defect re-opening.
// Both carry the three-answer convention: `filesScanned: 0` means
// could-not-verify (null), never a clean zero.
//
// d1PostRelocationNoBaseline is correlated ACROSS the two logs (see the big
// comment on collectD1Retirement for why the first, single-log `sid`-history
// design was measurably wrong): a `no-baseline` in deferred-tool-events only
// counts when insertion-events proves the SAME `sid` genuinely relocated —
// its own `oldKeyFallback:true` — within a tight timestamp tolerance. The
// bites below cover both directions: the correlated case counts, and the
// bare co-tenancy case (key churn under one `sid`, no relocation proof at
// all) — the exact shape that produced 169 false hits against this
// machine's real corpus — does NOT.

test("BITE — d1OldKeyFallback: a planted oldKeyFallback:true record reports hits:1, its own timestamp, and a scanned scope", async (t) => {
  const dir = await snapshotDirWith({
    "s-key-a-deferred-tool-events.jsonl": [
      JSON.stringify({ ts: "2026-08-02T10:00:00.000Z", key: "key-a", sid: "sid-1", action: "unchanged", newNames: [], heldNames: [], injected: 0 }),
      JSON.stringify({ ts: "2026-08-02T10:00:05.000Z", key: "key-a", sid: "sid-1", action: "reset", reason: "tool-schema-changed", oldKeyFallback: true, oldKey: "key-old" }),
    ].join("\n") + "\n",
  });
  t.after(() => rm(dir, { recursive: true, force: true }));

  const r = await gateLive.collectD1Retirement(dir, Date.parse("2026-08-02T00:00:00Z"), Date.parse("2026-08-03T00:00:00Z"));
  assert.deepEqual(
    { hits: r.d1OldKeyFallback.hits, newestUtc: r.d1OldKeyFallback.newestUtc },
    { hits: 1, newestUtc: "2026-08-02T10:00:05.000Z" },
  );
  assert.ok(r.d1OldKeyFallback.filesScanned > 0, "the planted file itself must count toward scope");
});

test("BITE — d1OldKeyFallback: no fallback record is a measured hits:0, not could-not-verify, once files are in scope", async (t) => {
  const dir = await snapshotDirWith({
    "s-key-a-deferred-tool-events.jsonl": [
      JSON.stringify({ ts: "2026-08-02T10:00:00.000Z", key: "key-a", sid: "sid-1", action: "unchanged", newNames: [], heldNames: [], injected: 0 }),
    ].join("\n") + "\n",
  });
  t.after(() => rm(dir, { recursive: true, force: true }));

  const r = await gateLive.collectD1Retirement(dir, Date.parse("2026-08-02T00:00:00Z"), Date.parse("2026-08-03T00:00:00Z"));
  assert.equal(r.d1OldKeyFallback.hits, 0);
  assert.equal(r.d1OldKeyFallback.newestUtc, null);
  assert.ok(r.d1OldKeyFallback.filesScanned > 0, "the file was actually read, not skipped");
});

test("BITE — d1OldKeyFallback and d1PostRelocationNoBaseline: an absent or empty snapshots dir is COULD-NOT-VERIFY, never a clean zero", async (t) => {
  const emptyDir = await tmpDir("d1-empty-");
  t.after(() => rm(emptyDir, { recursive: true, force: true }));
  const absentDir = join(emptyDir, "not-here");

  for (const dir of [emptyDir, absentDir]) {
    const r = await gateLive.collectD1Retirement(dir, Date.parse("2026-08-02T00:00:00Z"), Date.parse("2026-08-03T00:00:00Z"));
    assert.equal(r.d1OldKeyFallback.hits, null, `${dir} must not read as a measured zero`);
    assert.equal(r.d1OldKeyFallback.filesScanned, 0);
    assert.equal(r.d1PostRelocationNoBaseline.count, null, `${dir} must not read as a measured zero`);
    assert.equal(r.d1PostRelocationNoBaseline.filesScanned, 0);
  }
});

test("BITE — d1PostRelocationNoBaseline: a no-baseline CORRELATED with insertion-normalization's own relocation proof (same sid, close ts) reports count:1", async (t) => {
  const dir = await snapshotDirWith({
    // insertion-normalization's dual-read succeeded for this session — proof
    // that this request's conversation genuinely relocated.
    "s-conv-a-insertion-events.jsonl": [
      JSON.stringify({ ts: "2026-08-02T10:00:00.500Z", key: "conv-a-new", sid: "sid-1", action: "normalized", oldKeyFallback: true, oldKey: "conv-a-old" }),
    ].join("\n") + "\n",
    // deferred-tool-rewrite's dual-read did NOT: no-baseline, same request
    // (same sid, timestamp a few hundred ms apart — the same pipeline pass).
    "s-key-new-deferred-tool-events.jsonl": [
      JSON.stringify({ ts: "2026-08-02T10:00:00.750Z", key: "key-new", sid: "sid-1", action: "no-baseline", newNames: [], heldNames: [] }),
    ].join("\n") + "\n",
  });
  t.after(() => rm(dir, { recursive: true, force: true }));

  const r = await gateLive.collectD1Retirement(dir, Date.parse("2026-08-02T00:00:00Z"), Date.parse("2026-08-03T00:00:00Z"));
  assert.deepEqual(
    { count: r.d1PostRelocationNoBaseline.count, newestUtc: r.d1PostRelocationNoBaseline.newestUtc },
    { count: 1, newestUtc: "2026-08-02T10:00:00.750Z" },
  );
});

test("BITE — d1PostRelocationNoBaseline: deferred-tool-rewrite's OWN successful fallback does not count — the failure is the OTHER consumer's, and no-baseline never co-occurs with it on one record", async (t) => {
  const dir = await snapshotDirWith({
    "s-key-new-deferred-tool-events.jsonl": [
      // D1 working as designed on THIS consumer: the fallback found the old
      // state, so the action is "unchanged"/"rewrite", never "no-baseline" —
      // classifyToolChange returns no-baseline iff prior is null, and a
      // successful fallback means prior was found.
      JSON.stringify({ ts: "2026-08-02T10:00:00.000Z", key: "key-new", sid: "sid-1", action: "unchanged", newNames: [], heldNames: [], oldKeyFallback: true, oldKey: "key-old" }),
    ].join("\n") + "\n",
    // A companion insertion-events file, otherwise irrelevant, so this test
    // measures a real "no candidate at all" zero rather than the
    // could-not-verify state the empty-corpus tests already cover.
    "s-key-new-insertion-events.jsonl": [
      JSON.stringify({ ts: "2026-08-02T10:00:00.000Z", key: "key-new", sid: "sid-1", action: "append-only", inserted: 0 }),
    ].join("\n") + "\n",
  });
  t.after(() => rm(dir, { recursive: true, force: true }));

  const r = await gateLive.collectD1Retirement(dir, Date.parse("2026-08-02T00:00:00Z"), Date.parse("2026-08-03T00:00:00Z"));
  assert.equal(r.d1PostRelocationNoBaseline.count, 0, "no no-baseline candidate exists at all in this corpus, and both logs were scanned");
});

test("BITE — d1PostRelocationNoBaseline: ORDINARY CO-TENANCY (one sid, many keys from concurrent subagents, no relocation proof) does NOT count — the negative control for the false-positive this counter's first design produced", async (t) => {
  // Reproduces the shape measured against this machine's real snapshots dir
  // (2026-08-11): one busy `sid` cycling through many distinct subagent
  // `key`s, none of them a relocation. No insertion-events file exists at
  // all here — there is no relocation proof anywhere in the corpus — so
  // every no-baseline below must go uncounted however many keys the sid
  // touches.
  const dir = await snapshotDirWith({
    "s-sub-1-deferred-tool-events.jsonl": [
      JSON.stringify({ ts: "2026-08-02T10:00:00.000Z", key: "sub-1", sid: "sid-1", action: "no-baseline", newNames: [], heldNames: [] }),
    ].join("\n") + "\n",
    "s-sub-2-deferred-tool-events.jsonl": [
      JSON.stringify({ ts: "2026-08-02T10:00:04.000Z", key: "sub-2", sid: "sid-1", action: "no-baseline", newNames: [], heldNames: [] }),
    ].join("\n") + "\n",
    "s-sub-3-deferred-tool-events.jsonl": [
      JSON.stringify({ ts: "2026-08-02T10:00:08.000Z", key: "sub-3", sid: "sid-1", action: "no-baseline", newNames: [], heldNames: [] }),
    ].join("\n") + "\n",
  });
  t.after(() => rm(dir, { recursive: true, force: true }));

  const r = await gateLive.collectD1Retirement(dir, Date.parse("2026-08-02T00:00:00Z"), Date.parse("2026-08-03T00:00:00Z"));
  // No insertion-events file was scanned, so the correlation input is
  // structurally absent — could-not-verify, not a clean zero (the same
  // three-answer rule as everywhere else in this pass).
  assert.equal(r.d1PostRelocationNoBaseline.count, null,
    "three key-changing no-baseline records under one sid, zero relocation proof — must read could-not-verify, never a measured zero that happens to be right");
});

test("BITE — d1PostRelocationNoBaseline: co-tenancy stays uncounted even WHEN a real relocation proof exists elsewhere in the same window, for a DIFFERENT sid", async (t) => {
  const dir = await snapshotDirWith({
    // A genuine relocation, sid-2 — must not leak into sid-1's count.
    "s-conv-b-insertion-events.jsonl": [
      JSON.stringify({ ts: "2026-08-02T11:00:00.000Z", key: "conv-b-new", sid: "sid-2", action: "normalized", oldKeyFallback: true, oldKey: "conv-b-old" }),
    ].join("\n") + "\n",
    // sid-1's ordinary subagent churn — same shape as the co-tenancy test
    // above, now WITH insertion-events files present in the corpus (so
    // filesScanned/insertionScanned are non-zero and the answer is a real
    // measured zero, not could-not-verify).
    "s-sub-1-deferred-tool-events.jsonl": [
      JSON.stringify({ ts: "2026-08-02T10:00:00.000Z", key: "sub-1", sid: "sid-1", action: "no-baseline", newNames: [], heldNames: [] }),
    ].join("\n") + "\n",
    "s-sub-2-deferred-tool-events.jsonl": [
      JSON.stringify({ ts: "2026-08-02T10:00:04.000Z", key: "sub-2", sid: "sid-1", action: "no-baseline", newNames: [], heldNames: [] }),
    ].join("\n") + "\n",
  });
  t.after(() => rm(dir, { recursive: true, force: true }));

  const r = await gateLive.collectD1Retirement(dir, Date.parse("2026-08-02T00:00:00Z"), Date.parse("2026-08-03T00:00:00Z"));
  assert.equal(r.d1PostRelocationNoBaseline.count, 0,
    "sid-2's proof must not correlate against sid-1's unrelated no-baseline records");
});

test("BITE — both D1 counters only count records inside [sinceMs, untilMs), even though the files that carry them are in scope", async (t) => {
  const dir = await snapshotDirWith({
    "s-conv-a-insertion-events.jsonl": [
      JSON.stringify({ ts: "2026-08-01T10:00:00.000Z", key: "conv-a-new", sid: "sid-1", action: "normalized", oldKeyFallback: true, oldKey: "conv-a-old" }),
    ].join("\n") + "\n",
    "s-key-new-deferred-tool-events.jsonl": [
      // Both records are dated BEFORE the requested window, even though the
      // files themselves have a recent mtime and are scanned.
      JSON.stringify({ ts: "2026-08-01T10:00:00.500Z", key: "key-new", sid: "sid-1", action: "no-baseline" }),
      JSON.stringify({ ts: "2026-08-01T10:00:01.000Z", key: "key-new", sid: "sid-1", action: "unchanged", oldKeyFallback: true, oldKey: "key-old" }),
    ].join("\n") + "\n",
  });
  t.after(() => rm(dir, { recursive: true, force: true }));

  const r = await gateLive.collectD1Retirement(dir, Date.parse("2026-08-02T00:00:00Z"), Date.parse("2026-08-03T00:00:00Z"));
  assert.equal(r.d1OldKeyFallback.hits, 0, "the fallback records exist but are dated outside the window");
  assert.equal(r.d1PostRelocationNoBaseline.count, 0, "the correlated pair exists but the no-baseline record is dated outside the window");
  assert.ok(r.d1OldKeyFallback.filesScanned > 0, "the files were still scanned — mtime is recent even though the recorded ts is old");
});

test("BITE — the emitted window names the requested scope, on both fields, even over an empty corpus", async (t) => {
  const dir = await tmpDir("d1-window-");
  t.after(() => rm(dir, { recursive: true, force: true }));
  const r = await gateLive.collectD1Retirement(dir, Date.parse("2026-08-02T00:00:00Z"), Date.parse("2026-08-03T00:00:00Z"));
  const expected = { sinceUtc: "2026-08-02T00:00:00.000Z", untilUtc: "2026-08-03T00:00:00.000Z" };
  assert.deepEqual(r.d1OldKeyFallback.window, expected);
  assert.deepEqual(r.d1PostRelocationNoBaseline.window, expected);
});

test("BITE — a real sweep wires both D1 fields into the status file, not only the fire ledger", async (t) => {
  const dir = await tmpDir("d1-sweep-");
  t.after(() => rm(dir, { recursive: true, force: true }));
  const captures = join(dir, "captures");
  const snapshots = join(dir, "snapshots");
  const transcripts = join(dir, "projects");
  await mkdir(captures, { recursive: true });
  await mkdir(snapshots, { recursive: true });
  await mkdir(transcripts, { recursive: true });
  const ledger = join(dir, "fire.jsonl");
  const status = join(dir, "status.json");

  // One planted fallback record, recent mtime, dated now-ish so it lands
  // inside the sweep's own first (seeded) window regardless of when this
  // test runs. A second, unrelated insertion-events file keeps
  // insertionScanned non-zero so d1PostRelocationNoBaseline reads a real
  // measured zero rather than could-not-verify.
  await writeFile(
    join(snapshots, "s-key-a-deferred-tool-events.jsonl"),
    JSON.stringify({ ts: new Date().toISOString(), key: "key-a", sid: "sid-1", action: "reset", oldKeyFallback: true, oldKey: "key-old" }) + "\n",
  );
  await writeFile(
    join(snapshots, "s-key-a-insertion-events.jsonl"),
    JSON.stringify({ ts: new Date().toISOString(), key: "key-a", sid: "sid-1", action: "append-only", inserted: 0 }) + "\n",
  );

  await pExecFile("node", [
    join(REPO, "tools", "gate-live.mjs"),
    "--captures", captures, "--status", status, "--fire-ledger", ledger,
    "--snapshots", snapshots, "--transcripts", transcripts, "--quiet",
  ], { cwd: REPO }).catch((e) => e); // an empty-capture sweep still owes a status file

  const parsed = JSON.parse(await readFile(status, "utf-8"));
  assert.ok("d1OldKeyFallback" in parsed, "the status file is doctor's read surface — the field belongs there, not only the fire ledger");
  assert.ok("d1PostRelocationNoBaseline" in parsed);
  assert.equal(parsed.d1OldKeyFallback.hits, 1, "the planted record was inside the seeded window");
  assert.equal(parsed.d1OldKeyFallback.filesScanned, 2);
  assert.equal(parsed.d1PostRelocationNoBaseline.count, 0, "no no-baseline candidate exists in this corpus");
});

// The two bites below exist because ship-proxy-change.md step 7 could not be
// executed as written on a SCHEDULED run. Step 7 compares three answers —
// the unit's Environment=, /health's gates, and this file's `gates` — and
// forbids softening the compare. The unit and /health carry eleven gates,
// the status file nine, and the line that explains the gap
// ("excluded as artifact-only: …") sits behind `!args.quiet` while the
// systemd unit runs `--quiet`. So the artifact a reader is told to compare
// never carried its own exclusion. Measured on the 2026-08-11 12:24Z sweep.
test("BITE — the artifact-only exclusion is exact: the kept gates and the excluded ones partition the unit's set, with no overlap", () => {
  const unit =
    "Environment=CACHE_FIX_FORWARD_PROXY=on CACHE_FIX_REQUEST_CAPTURE=1 " +
    "CACHE_FIX_INSERTION_NORMALIZE=1 CACHE_FIX_SESSION_MIRROR=on " +
    "CACHE_FIX_TOOL_REWRITE=1 SOME_OTHER_VAR=9";
  const kept = parseUnitEnvironment(unit);
  const excluded = [...gateLive.ARTIFACT_ONLY];

  const keptKeys = kept.map((t) => t.slice(0, t.indexOf("=")));
  // Disjointness AND union, because either alone passes on a defect the
  // other catches: a filter that drops the two but reports an excluded list
  // of [] is disjoint and loses them; one that reports them while also
  // keeping them unions correctly and tests an untested gate.
  for (const k of excluded) {
    assert.ok(!keptKeys.includes(k), `${k} must not be in the replayed set`);
  }
  assert.deepEqual(
    [...keptKeys, ...excluded].sort(),
    ["CACHE_FIX_FORWARD_PROXY", "CACHE_FIX_INSERTION_NORMALIZE",
     "CACHE_FIX_REQUEST_CAPTURE", "CACHE_FIX_SESSION_MIRROR",
     "CACHE_FIX_TOOL_REWRITE"].sort(),
    "kept + excluded must reconstruct exactly the unit's CACHE_FIX_ set — that union IS step 7's compare",
  );
  // The non-CACHE_FIX_ var is neither kept nor claimed as excluded; it is
  // not a gate at all, and a step-7 reader must not see it in either list.
  assert.ok(!keptKeys.includes("SOME_OTHER_VAR") && !excluded.includes("SOME_OTHER_VAR"));
});

test("BITE — a --quiet sweep writes the exclusion INTO the status file, which is the only artifact a scheduled run leaves", async (t) => {
  const dir = await tmpDir("gate-exclusion-");
  t.after(() => rm(dir, { recursive: true, force: true }));
  const captures = join(dir, "captures");
  const snapshots = join(dir, "snapshots");
  const transcripts = join(dir, "projects");
  await mkdir(captures, { recursive: true });
  await mkdir(snapshots, { recursive: true });
  await mkdir(transcripts, { recursive: true });
  const status = join(dir, "status.json");

  await pExecFile("node", [
    join(REPO, "tools", "gate-live.mjs"),
    "--captures", captures, "--status", status, "--fire-ledger", join(dir, "fire.jsonl"),
    "--snapshots", snapshots, "--transcripts", transcripts, "--quiet",
  ], { cwd: REPO }).catch((e) => e); // an empty-capture sweep still owes a status file

  const parsed = JSON.parse(await readFile(status, "utf-8"));
  assert.ok(
    Array.isArray(parsed.gatesExcludedArtifactOnly),
    "a --quiet run suppresses the stdout line; without this field the exclusion exists nowhere a step-7 reader looks",
  );
  assert.deepEqual(
    parsed.gatesExcludedArtifactOnly.slice().sort(),
    [...gateLive.ARTIFACT_ONLY].sort(),
    "the field must report the SAME set the filter applies, not a hand-kept copy that can drift from it",
  );
  const keptKeys = (parsed.gates || []).map((t) => t.slice(0, t.indexOf("=")));
  for (const k of parsed.gatesExcludedArtifactOnly) {
    assert.ok(!keptKeys.includes(k), `${k} is claimed excluded and also reported as replayed`);
  }
});

// --- the row-31 carrier: what the sweep retains about duplicate sends -------
//
// Both bites below are closing-gate question 2's recurring-producer clause,
// applied to a producer that had been running for days: the daily sweep
// computes the duplicate-send rollup every morning and, until 2026-08-16,
// wrote it only into the status file it OVERWRITES on the next run. Two runs
// of one day reported 24 and then 10 double-billed streaks with no artifact
// left that could compare them.

test("BITE — the projected streak row keeps `coalesced`, the field that proves the mitigation acted", () => {
  // A 2-member streak where the follower was COALESCED and one where the
  // follower was simply never answered are byte-identical on `billed` alone
  // (both read 1). Row 31's whole done-criterion is that difference, so a
  // projection that drops `coalesced` retains rows nobody can classify.
  const res = {
    code: 0,
    out: JSON.stringify({
      duplicateRows: [
        { startTs: "2026-08-16T00:00:00.000Z", lastTs: "2026-08-16T00:00:00.014Z",
          startLine: 3, lastLine: 4, length: 2, billed: 1, coalesced: 1, noId: 0, intervalMs: 14 },
        { startTs: "2026-08-16T01:00:00.000Z", lastTs: "2026-08-16T01:00:04.000Z",
          startLine: 40, lastLine: 41, length: 2, billed: 1, coalesced: 0, noId: 0, intervalMs: 4000 },
      ],
    }),
  };
  const ev = gateLive.extractCensusRowEvidence(res, "s-token123456");
  assert.equal(ev.duplicateStreaks.length, 2);
  assert.equal(ev.duplicateStreaks[0].coalesced, 1, "the suppressed send must stay visible in the retained row");
  assert.equal(ev.duplicateStreaks[1].coalesced, 0, "an unanswered retry is a real zero, not a missing field");
  // The pair is the point: the two rows must be TELLABLE APART after
  // projection. Equal `billed` on both is what makes that non-trivial.
  assert.equal(ev.duplicateStreaks[0].billed, ev.duplicateStreaks[1].billed);
  assert.notDeepEqual(ev.duplicateStreaks[0], ev.duplicateStreaks[1]);
});

test("BITE — a real sweep writes the duplicate rollup into the FIRE LEDGER, which survives the next run", async (t) => {
  const dir = await tmpDir("dup-ledger-");
  t.after(() => rm(dir, { recursive: true, force: true }));
  const captures = join(dir, "captures");
  const snapshots = join(dir, "snapshots");
  const transcripts = join(dir, "projects");
  await mkdir(captures, { recursive: true });
  await mkdir(snapshots, { recursive: true });
  await mkdir(transcripts, { recursive: true });
  const ledger = join(dir, "fire.jsonl");
  const status = join(dir, "status.json");

  await pExecFile("node", [
    join(REPO, "tools", "gate-live.mjs"),
    "--captures", captures, "--status", status, "--fire-ledger", ledger,
    "--snapshots", snapshots, "--transcripts", transcripts, "--quiet",
  ], { cwd: REPO }).catch((e) => e); // an empty-capture sweep still owes both artifacts

  const line = JSON.parse((await readFile(ledger, "utf-8")).trim().split("\n").at(-1));
  assert.ok("duplicates" in line,
    "the status file is overwritten every run; without this field the duplicate counters exist for one morning only");
  const parsed = JSON.parse(await readFile(status, "utf-8"));
  assert.deepEqual(line.duplicates, parsed.byteGate.duplicates,
    "the ledger must carry the SAME rollup the status file reports, not a second derivation of it");
});

// =============================================================================
// toolPreload — threat-matrix row 6 step (b), the preload's own counters.
//
// Red-first: against the unmodified module `r.toolPreload` is `undefined` and
// these bites fail at their own call sites while every other bite in this file
// passes (the collector is reached through the `gateLive` namespace, so no
// import line can collapse the split).
// =============================================================================

test("BITE — toolPreload: seeded / announced / fallback are counted from deferred-tool-events, and the ANNOUNCED count is the absorption side", async (t) => {
  const dir = await snapshotDirWith({
    "s-key-p1-deferred-tool-events.jsonl": [
      // A fresh conversation got the preload.
      JSON.stringify({ ts: "2026-08-18T10:00:00.000Z", key: "key-p1", sid: "sid-1", action: "no-baseline", newNames: [], heldNames: [], preloadSeeded: ["SendMessage"] }),
      // ... and CC later sent the tool for real. THIS is the event the entry's
      // done-criterion reads: the tool became callable and tools[] did not
      // move. Counting only `seeded` would say the mitigation RAN and never
      // that it ABSORBED.
      JSON.stringify({ ts: "2026-08-18T10:05:00.000Z", key: "key-p1", sid: "sid-1", action: "unchanged", newNames: [], heldNames: [], preloadAnnounced: ["SendMessage"] }),
    ].join("\n") + "\n",
    "s-key-p2-deferred-tool-events.jsonl": [
      JSON.stringify({ ts: "2026-08-18T11:00:00.000Z", key: "key-p2", sid: "sid-2", action: "reset", reason: "preload-unannounceable", preloadFallback: ["SendMessage"], model: "claude-sonnet-5" }),
    ].join("\n") + "\n",
  });
  t.after(() => rm(dir, { recursive: true, force: true }));

  const r = await gateLive.collectD1Retirement(dir, Date.parse("2026-08-18T00:00:00Z"), Date.parse("2026-08-19T00:00:00Z"));
  assert.deepEqual(
    { seeded: r.toolPreload.seeded, announced: r.toolPreload.announced, fallback: r.toolPreload.fallback },
    { seeded: 1, announced: 1, fallback: 1 },
  );
  assert.equal(r.toolPreload.newestUtc, "2026-08-18T11:00:00.000Z", "newest is the newest PRELOAD act, not the newest record");
});

test("BITE — toolPreload: ordinary traffic with no preload act reports a MEASURED zero, and an empty corpus reports could-not-verify", async (t) => {
  // The pair matters: a zero from a scanned population and a zero from an
  // unscanned one are the same bytes, and only the second is could-not-verify.
  const dir = await snapshotDirWith({
    "s-key-q-deferred-tool-events.jsonl": [
      JSON.stringify({ ts: "2026-08-18T10:00:00.000Z", key: "key-q", sid: "sid-9", action: "unchanged", newNames: [], heldNames: [] }),
    ].join("\n") + "\n",
  });
  t.after(() => rm(dir, { recursive: true, force: true }));

  const scanned = await gateLive.collectD1Retirement(dir, Date.parse("2026-08-18T00:00:00Z"), Date.parse("2026-08-19T00:00:00Z"));
  assert.deepEqual(
    { seeded: scanned.toolPreload.seeded, announced: scanned.toolPreload.announced, fallback: scanned.toolPreload.fallback },
    { seeded: 0, announced: 0, fallback: 0 },
    "files were scanned, so the zero is a measurement",
  );
  assert.ok(scanned.toolPreload.filesScanned > 0);

  const empty = await snapshotDirWith({});
  t.after(() => rm(empty, { recursive: true, force: true }));
  const unscanned = await gateLive.collectD1Retirement(empty, Date.parse("2026-08-18T00:00:00Z"), Date.parse("2026-08-19T00:00:00Z"));
  assert.equal(unscanned.toolPreload.seeded, null, "nothing scanned -> could-not-verify, never a clean zero");
  assert.equal(unscanned.toolPreload.announced, null);
  assert.equal(unscanned.toolPreload.fallback, null);
});

test("BITE — toolPreload: a preload act OUTSIDE the sweep window is not counted", async (t) => {
  // The gap the repair lane returned as outside its write boundary, with the
  // repair it named: the two bites above plant records only INSIDE
  // [since, until), so deleting the window test at gate-live.mjs's preload
  // branch leaves both of them green — a filter no bite could miss losing.
  // One out-of-window record is what makes the window assertion falsifiable.
  const dir = await snapshotDirWith({
    "s-key-w-deferred-tool-events.jsonl": [
      // INSIDE the window.
      JSON.stringify({ ts: "2026-08-18T10:00:00.000Z", key: "key-w", sid: "sid-1", action: "no-baseline", preloadSeeded: ["SendMessage"] }),
      // BEFORE it — same file, same shape, so only the timestamp separates them.
      JSON.stringify({ ts: "2026-08-17T10:00:00.000Z", key: "key-w", sid: "sid-1", action: "no-baseline", preloadSeeded: ["SendMessage"] }),
      // AFTER it.
      JSON.stringify({ ts: "2026-08-19T10:00:00.000Z", key: "key-w", sid: "sid-1", action: "unchanged", preloadAnnounced: ["SendMessage"] }),
    ].join("\n") + "\n",
  });
  t.after(() => rm(dir, { recursive: true, force: true }));

  const r = await gateLive.collectD1Retirement(dir, Date.parse("2026-08-18T00:00:00Z"), Date.parse("2026-08-19T00:00:00Z"));
  assert.equal(r.toolPreload.seeded, 1, "only the in-window seed counts — the earlier one is outside the sweep");
  assert.equal(r.toolPreload.announced, 0, "the announce is after the window and must not be counted");
  assert.equal(r.toolPreload.newestUtc, "2026-08-18T10:00:00.000Z", "newest is the newest IN-WINDOW act");
});
