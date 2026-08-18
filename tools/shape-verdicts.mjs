#!/usr/bin/env node
// shape-verdicts — the fork's own judgment over its shape/baseline telemetry.
//
// Exists because this judgment briefly lived in the operator's dotfiles
// doctor, which meant the thresholds were declared in one repo and applied
// in another — "mirrored by convention", i.e. drift waiting to happen. The
// division of responsibility this restores: the FORK owns domain judgment
// (what a dormant-class reactivation or a baseline step means), the
// deployment repo owns aggregation (doctor invokes this CLI and books the
// verdicts, adding only "could not verify" when the CLI itself is absent).
// Single source: the growth thresholds are imported from harvest.mjs, the
// module that also applies them when freezing evidence.
//
// Baseline verdicts are computed at READ time, not harvest time, because the
// acknowledge-by-commit semantics demand it: a step warns exactly as long as
// the ledger change is uncommitted, and only the moment of asking knows that.
//
// Every verdict has THREE answers: ok / warn / could-not-verify (rendered as
// warn with the inability NAMED — absence must never read as green).
//
// CLI: node tools/shape-verdicts.mjs [--ledger FILE] → JSON array of
// { name, level: "ok"|"warn", message } on stdout, exit 0 (verdicts are the
// payload; a non-zero exit means the CLI itself failed).

import { readFile, readdir, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { detectGrowthSteps, DEFAULT_LEDGER } from "./harvest.mjs";
import { statePath, legacyReadPath } from "../proxy/xdg-dirs.mjs";
// The cohort split is IMPORTED, never re-derived: which side of a gate flip a
// capture's traffic falls on is gate-live's definition (it owns the per-row
// `firstTs` stamp), and a second implementation of that boundary is the
// hand-rolled-identity error this repo keeps paying for.
import { cohortSplit } from "./gate-live.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const pExecFile = promisify(execFile);

// Minimum pair sample for a drop-RATE to be signal rather than noise
// (measured normal: 2 of ~1,900 pairs, context-pruning-shaped).
export const DROP_RATE_THRESHOLD = 0.05;
export const DROP_RATE_MIN_PAIRS = 50;
// The harvest timer fires twice daily; numbers older than this are frozen,
// and a verdict computed from frozen numbers must say so instead of
// printing "dormant" forever off a stalled timer.
export const HARVEST_MAX_AGE_H = 26;

export function shapeWatchVerdict(ledger, nowMs = Date.now()) {
  if (!ledger || typeof ledger !== "object" || typeof ledger.keys !== "object" || ledger.keys === null) {
    return {
      name: "shape-watch",
      level: "warn",
      message: "shape-watch: ledger missing or unreadable — class reactivation is NOT currently watched",
    };
  }
  const shapes = Object.entries(ledger.keys)
    .filter(([, e]) => e && typeof e.shape === "object" && e.shape !== null)
    .map(([k, e]) => [k, e.shape]);
  if (!shapes.length) {
    return {
      name: "shape-watch",
      level: "warn",
      message: "shape-watch: ledger carries no shape fields yet — run harvest once",
    };
  }
  const newest = Object.values(ledger.keys)
    .map((e) => Date.parse(e?.lastHarvest ?? ""))
    .filter((t) => !Number.isNaN(t))
    .reduce((a, b) => Math.max(a, b), 0);
  if (newest && nowMs - newest > HARVEST_MAX_AGE_H * 3600_000) {
    const ageH = Math.round((nowMs - newest) / 3600_000);
    return {
      name: "shape-watch",
      level: "warn",
      message:
        `shape-watch: newest harvest is ${ageH}h old (expected twice daily) — ` +
        `numbers are frozen, the timer is not watching`,
    };
  }
  const fat = shapes
    .map(([k, s]) => [k, s.thinkingTextCompleted ?? 0])
    .filter(([, n]) => n > 0);
  if (fat.length) {
    const [key, n] = fat.reduce((a, b) => (b[1] > a[1] ? b : a));
    return {
      name: "shape-watch",
      level: "warn",
      message:
        `shape-watch: completed-turn thinking text is BACK (${n} blocks, e.g. ${key.slice(0, 20)}) — ` +
        `CC#69568 population active; re-evaluate v2StripSigned with fresh numbers`,
    };
  }
  const pairs = shapes.reduce((a, [, s]) => a + (s.pairs ?? 0), 0);
  const drops = shapes.reduce((a, [, s]) => a + (s.thinkingDropPairs ?? 0), 0);
  if (pairs >= DROP_RATE_MIN_PAIRS && drops / pairs > DROP_RATE_THRESHOLD) {
    return {
      name: "shape-watch",
      level: "warn",
      message:
        `shape-watch: ${drops} of ${pairs} pairs lose thinking from shared history (>5%) — ` +
        `CC#76253 class active; run a census`,
    };
  }
  return {
    name: "shape-watch",
    level: "ok",
    message: `shape-watch: population 0, ${drops}/${pairs} drop pairs — both classes dormant`,
  };
}

export function baselineStepVerdict(committed, current) {
  if (!current || typeof current !== "object" || typeof current.keys !== "object" || current.keys === null) {
    return {
      name: "baseline",
      level: "warn",
      message: "baseline: working ledger missing or unreadable — growth is NOT currently watched",
    };
  }
  if (!committed || typeof committed !== "object" || typeof committed.keys !== "object" || committed.keys === null) {
    // The first recording has nothing to compare against — named, not silent.
    return { name: "baseline", level: "ok", message: "baseline: no committed comparison state yet" };
  }
  const steps = [];
  for (const [key, curE] of Object.entries(current.keys)) {
    const curS = curE && typeof curE.shape === "object" ? curE.shape : null;
    const oldE = committed.keys[key];
    const oldS = oldE && typeof oldE.shape === "object" ? oldE.shape : null;
    if (!curS || !oldS) continue;
    for (const step of detectGrowthSteps(oldS, curS)) {
      steps.push(
        `${key.slice(0, 20)} ${step.field} ${step.oldBytes}->${step.newBytes} ` +
          `(+${Math.round((100 * (step.newBytes - step.oldBytes)) / step.oldBytes)}%)`,
      );
    }
  }
  if (steps.length) {
    return {
      name: "baseline",
      level: "warn",
      message:
        `baseline: prefix baseline grew — ${steps.slice(0, 3).join("; ")} — ` +
        `intended? committing the ledger acknowledges`,
    };
  }
  return { name: "baseline", level: "ok", message: "baseline: no unreviewed step against HEAD" };
}

// Retention: a ledger key marked gone was DELETED by the capture cap before
// harvest finished with it — the designated cap-adequacy signal, which lived
// only on harvest's stdout until the closing-gate sweep flagged it as
// consumer-less. Acknowledge-by-commit, like baseline: a NEW gone entry
// warns until the ledger commit that any deliberate cap decision gets.
export function retentionVerdict(committed, current) {
  if (!current || typeof current !== "object" || typeof current.keys !== "object" || current.keys === null) {
    return {
      name: "retention",
      level: "warn",
      message: "retention: working ledger missing or unreadable — expiry is NOT currently watched",
    };
  }
  const goneNow = Object.keys(current.keys).filter((k) => current.keys[k]?.gone);
  const goneBefore = new Set(
    committed && typeof committed.keys === "object" && committed.keys !== null
      ? Object.keys(committed.keys).filter((k) => committed.keys[k]?.gone)
      : [],
  );
  const fresh = goneNow.filter((k) => !goneBefore.has(k));
  if (fresh.length) {
    return {
      name: "retention",
      level: "warn",
      message:
        `retention: ${fresh.length} capture(s) expired before harvest finished ` +
        `(${fresh.map((k) => k.slice(0, 16)).join(", ")}) — raise CACHE_FIX_CAPTURE_MAX_MB? ` +
        `committing the ledger acknowledges`,
    };
  }
  return { name: "retention", level: "ok", message: "retention: no capture lost to the cap unacknowledged" };
}

// --- Telemetry-consumer table (Q4: alarm-without-reader gap) ---
//
// Every telemetry file a gated extension writes gets exactly one reader
// here, closing the gap the closing-gate sweep found: alarm files nothing
// reads (guard-events, upstream-changes) and log files nothing watches
// for silence (insertion/deferred event logs, session mirrors).
// Status-file fields and boot proxyTree are already the dotfiles doctor's
// own consumption and stay out of this table.
//
// "alarm" files exist to be noticed when non-empty — a recent entry IS
// the finding (output-guard restored a body, upstream shipped a
// structural change). "log" files are expected to accumulate under
// normal use; their only failure mode is silence while the writer's gate
// is on. Gate state: the env var each extension itself reads wins when
// SET — but shape-verdicts runs out-of-band (operator shell, doctor),
// where the serving gates are NOT in the env, so an unset var falls
// back to the last gate sweep's recorded serving set
// (cache-fix-gate-status.json `gates`, gateSource the proxy unit) —
// the same serving-truth source replay's --gates-from-capture trusts.
// No status file and no env -> off (absence of any gate evidence).
// "State unknowable" is reserved for the filesystem read itself
// failing for a reason other than absence (permissions,
// not-a-directory) — the one case gate state can't resolve.
//
// maxAgeH reuses HARVEST_MAX_AGE_H rather than inventing a second,
// evidence-free cadence per file — it is the one existing precedent in
// this module for "how long before telemetry is stale enough to say so".

function snapshotsDir() {
  return process.env.CACHE_FIX_SNAPSHOT_DIR
    || legacyReadPath(statePath("snapshots"), "cache-fix-snapshots");
}

// Serving-gate fallback: the last sweep's recorded gate set. Cached per
// process (the CLI is one-shot); a missing/unreadable status file yields
// an empty map, so env-unset gates resolve off, never unknowable.
let _servingGates;
export function servingGate(name) {
  if (_servingGates === undefined) {
    _servingGates = {};
    try {
      const status = JSON.parse(
        readFileSync(gateStatusPath(), "utf-8"),
      );
      for (const g of status.gates ?? []) {
        const eq = g.indexOf("=");
        if (eq > 0) _servingGates[g.slice(0, eq)] = g.slice(eq + 1);
      }
    } catch {
      /* no sweep recorded yet — env remains the only source */
    }
  }
  return _servingGates[name];
}

function gateResolves(name, onValue) {
  const env = process.env[name];
  if (env !== undefined) return env === onValue;
  return servingGate(name) === onValue;
}

export const TELEMETRY_CONSUMERS = [
  {
    name: "telemetry-guard-events",
    kind: "alarm",
    maxAgeH: HARVEST_MAX_AGE_H,
    gate: () => gateResolves("CACHE_FIX_OUTPUT_GUARD", "1"),
    dir: snapshotsDir,
    suffix: "-guard-events.jsonl",
  },
  {
    name: "telemetry-upstream-changes",
    kind: "alarm",
    maxAgeH: HARVEST_MAX_AGE_H,
    gate: () => gateResolves("CACHE_FIX_UPSTREAM_DETECTION", "1"),
    file: () => process.env.CACHE_FIX_UPSTREAM_DIR
      ? join(process.env.CACHE_FIX_UPSTREAM_DIR, "upstream-changes.jsonl")
      : legacyReadPath(statePath("upstream-changes.jsonl"), "upstream-changes.jsonl"),
  },
  {
    name: "telemetry-insertion-events",
    kind: "log",
    maxAgeH: HARVEST_MAX_AGE_H,
    gate: () => gateResolves("CACHE_FIX_INSERTION_NORMALIZE", "1"),
    dir: snapshotsDir,
    suffix: "-insertion-events.jsonl",
  },
  {
    name: "telemetry-deferred-tool-events",
    kind: "log",
    maxAgeH: HARVEST_MAX_AGE_H,
    gate: () => gateResolves("CACHE_FIX_TOOL_REWRITE", "1"),
    dir: snapshotsDir,
    suffix: "-deferred-tool-events.jsonl",
  },
  {
    name: "telemetry-session-mirror",
    kind: "log",
    maxAgeH: HARVEST_MAX_AGE_H,
    gate: () => gateResolves("CACHE_FIX_SESSION_MIRROR", "on"),
    file: () =>
      process.env.CACHE_FIX_SESSION_MIRROR_EVENT_LOG ||
      join(
        process.env.CACHE_FIX_SESSION_MIRROR_DIR
          || legacyReadPath(statePath("session-mirrors"), "session-mirrors"),
        "session-mirror-events.jsonl",
      ),
  },
  {
    // Born WITH its reader: this row landed before the gate's first flip
    // (the CC#79989 first-hypothesis alarm), so the file never exists
    // unread. Gate value is "on" — the extension checks !== "on", not "1".
    name: "telemetry-upstream-errors",
    kind: "alarm",
    maxAgeH: HARVEST_MAX_AGE_H,
    gate: () => gateResolves("CACHE_FIX_UPSTREAM_ERROR_LOG", "on"),
    file: () =>
      process.env.CACHE_FIX_UPSTREAM_ERROR_LOG_PATH ||
      join(
        process.env.CACHE_FIX_USAGE_LOG_DIR
          || legacyReadPath(statePath("usage-log"), "usage-log"),
        "upstream-errors.jsonl",
      ),
  },
];

// Resolve an entry to its newest matching file's mtime. `file` entries are
// a fixed path; `dir`+`suffix` entries glob one directory by suffix (the
// per-session `<key>-<suffix>` files output-guard, insertion-normalization,
// and deferred-tool-rewrite each write). ENOENT is a clean "nothing here
// yet"; any other fs error means the filesystem can't answer — unknowable.
async function newestMatch(entry) {
  if (entry.file) {
    try {
      const st = await stat(entry.file());
      return { exists: true, mtimeMs: st.mtimeMs, unknowable: false };
    } catch (err) {
      return { exists: false, mtimeMs: 0, unknowable: err?.code !== "ENOENT" };
    }
  }
  let names;
  try {
    names = await readdir(entry.dir());
  } catch (err) {
    return { exists: false, mtimeMs: 0, unknowable: err?.code !== "ENOENT" };
  }
  const matches = names.filter((n) => n.endsWith(entry.suffix));
  if (!matches.length) return { exists: false, mtimeMs: 0, unknowable: false };
  let newest = 0;
  let unknowable = false;
  for (const n of matches) {
    try {
      const st = await stat(join(entry.dir(), n));
      if (st.mtimeMs > newest) newest = st.mtimeMs;
    } catch {
      unknowable = true;
    }
  }
  return { exists: true, mtimeMs: newest, unknowable };
}

export async function telemetryConsumerVerdict(entry, nowMs = Date.now()) {
  const { name, kind, maxAgeH } = entry;
  const { exists, mtimeMs, unknowable } = await newestMatch(entry);

  if (unknowable) {
    return { name, level: "warn", message: `${name}: cannot read its telemetry path — state unknowable` };
  }

  const gateOn = entry.gate();

  if (kind === "alarm") {
    if (!exists) {
      return gateOn
        ? { name, level: "ok", message: `${name}: gate on, no alarm ever recorded` }
        : { name, level: "warn", message: `${name}: no file yet and its gate is off — nothing to verify` };
    }
    const ageH = (nowMs - mtimeMs) / 3600_000;
    return ageH <= maxAgeH
      ? {
          name,
          level: "warn",
          message: `${name}: entry ${Math.round(ageH)}h ago (within ${maxAgeH}h) — needs a look`,
        }
      : { name, level: "ok", message: `${name}: no entry within ${maxAgeH}h` };
  }

  // kind === "log": staleness only means something while the gate is on.
  if (!gateOn) {
    return { name, level: "warn", message: `${name}: gate is off — staleness not assessed` };
  }
  if (!exists) {
    return { name, level: "warn", message: `${name}: gate on but the file has never been written` };
  }
  const ageH = (nowMs - mtimeMs) / 3600_000;
  return ageH > maxAgeH
    ? {
        name,
        level: "warn",
        message: `${name}: last write ${Math.round(ageH)}h ago (expected within ${maxAgeH}h while its gate is on)`,
      }
    : { name, level: "ok", message: `${name}: last write ${Math.round(ageH)}h ago` };
}

export async function computeTelemetryVerdicts(nowMs = Date.now()) {
  return Promise.all(TELEMETRY_CONSUMERS.map((e) => telemetryConsumerVerdict(e, nowMs)));
}

// --- moved-fresh alarm (BACKLOG "split `moved`", 2026-08-02) ---
//
// The 660k bust (threat matrix row 4) reported `moved: 5` from a request
// where findJoinMoves recognized ZERO fresh moves — the summed field alone
// could not distinguish "the mitigation is still absorbing new drops" from
// "the mitigation is only replaying a move it already recognized earlier".
// This verdict watches for exactly that shape over a real window: join-move
// RE-FIRES (the substitution still holding a prior move) while FRESH
// recognition has gone to zero, which means the class the mitigation exists
// for may have stopped being caught even though the ledger keeps showing
// activity.
//
// Population is per-request PIN-MODE records only — `movedFresh` is present
// exactly there (proxy/extensions/insertion-normalization.mjs only emits it
// under `pin`); plain-mode records and per-suppression detail lines carry
// neither field and are excluded by the same presence check. Fewer than
// MOVED_FRESH_MIN_SAMPLE such records is an `ok`-with-caveat, never an
// alarm — a short window proves nothing either way.
export const MOVED_FRESH_MIN_SAMPLE = 200;

export function movedFreshVerdict(records) {
  const name = "moved-fresh";
  if (records === null) {
    return {
      name,
      level: "warn",
      message: "moved-fresh: snapshots directory missing or unreadable — not currently watched",
    };
  }
  const sample = records.slice(-MOVED_FRESH_MIN_SAMPLE);
  if (sample.length < MOVED_FRESH_MIN_SAMPLE) {
    return {
      name,
      level: "ok",
      message:
        `moved-fresh: only ${sample.length} of ${MOVED_FRESH_MIN_SAMPLE} needed pin-mode ` +
        `requests seen — not enough to judge`,
    };
  }
  const anyRefire = sample.some((r) => (r.movedRefires ?? 0) > 0);
  const allFreshZero = sample.every((r) => (r.movedFresh ?? 0) === 0);
  if (anyRefire && allFreshZero) {
    return {
      name,
      level: "warn",
      message:
        `moved-fresh: join-moves are RE-FIRING while fresh recognition stayed 0 across the ` +
        `last ${sample.length} pin-mode requests — the mitigation may have stopped catching ` +
        `new drops`,
    };
  }
  return {
    name,
    level: "ok",
    message: `moved-fresh: fresh recognitions present in the last ${sample.length} pin-mode requests`,
  };
}

// Reads every `*-insertion-events.jsonl` file under the snapshots dir (one
// per session/sub-key, same fan-out bust-triage.mjs's resetEvents globs for
// a single sid) and returns the pin-mode per-request records — identified
// by `movedFresh` being present, since that field exists only on the
// records classifyPinned's two `moved` emission sites produce — sorted
// oldest-to-newest so `.slice(-N)` reads as "the N most recent". Returns
// null (never []) for a missing/unreadable directory, distinct from "the
// directory exists and has produced nothing yet".
export async function readMovedFreshRecords(dir = snapshotsDir()) {
  let names;
  try {
    names = await readdir(dir);
  } catch {
    return null;
  }
  const files = names.filter((n) => n.endsWith("-insertion-events.jsonl"));
  const records = [];
  for (const name of files) {
    let text;
    try {
      text = await readFile(join(dir, name), "utf-8");
    } catch {
      continue; // a file that vanished/became unreadable mid-scan is skipped, not fatal
    }
    for (const line of text.split("\n")) {
      if (!line) continue;
      let rec;
      try {
        rec = JSON.parse(line);
      } catch {
        continue; // a torn tail line is not a request record
      }
      if (typeof rec.movedFresh !== "number") continue;
      const t = Date.parse(rec.ts ?? "");
      if (Number.isNaN(t)) continue;
      records.push({ ts: t, movedFresh: rec.movedFresh, movedRefires: rec.movedRefires ?? 0 });
    }
  }
  records.sort((a, b) => a.ts - b.ts);
  return records;
}

// --- Duplicate-billing alarm (dup-census gap 2, BACKLOG "wire `duplicates`
// into the daily gate") ---
//
// gate-live's daily sweep now carries byteGate.duplicates (reduceByteGate,
// tools/gate-live.mjs): the corpus-wide rollup of reminder-migration-census's
// duplicate-request scan. `doubleBilledStreaks` is the alarm column, not
// `billedStreaks` — a retry that finally succeeds bills exactly one of its
// sends, which is correct behaviour; TWO OR MORE outcome records inside one
// streak is the shape CC#78420 alleges (reminder-migration-census.mjs
// summariseDuplicates). Same three-answer pattern as the verdicts above: a
// status file that predates this field (byteGate.duplicates absent —
// the field lands with the next daily run) reads as a named could-not-verify,
// never as a silent pass.
export function duplicateBillingVerdict(status) {
  if (!status || typeof status !== "object") {
    return {
      name: "duplicate-billing",
      level: "warn",
      message: "duplicate-billing: gate status missing or unreadable — double-billed streaks NOT currently watched",
    };
  }
  const d = status.byteGate?.duplicates;
  if (!d || typeof d !== "object") {
    return {
      name: "duplicate-billing",
      level: "warn",
      message: "duplicate-billing: gate status predates the duplicates field — lands with the next daily run",
    };
  }
  const n = d.doubleBilledStreaks ?? 0;
  if (n > 0) {
    return {
      name: "duplicate-billing",
      level: "warn",
      message:
        `duplicate-billing: ${n} streak(s) carry TWO OR MORE billed outcomes ` +
        `(of ${d.streaks ?? 0} duplicate streak(s), ${d.billedStreaks ?? 0} billed once) — CC#78420 shape, needs a look`,
    };
  }
  return {
    name: "duplicate-billing",
    level: "ok",
    message: `duplicate-billing: 0 double-billed streaks (${d.streaks ?? 0} duplicate streak(s), ${d.billedStreaks ?? 0} billed once)`,
  };
}

// --- Row 31's standing watcher (threat matrix row 31, closed 2026-08-15) ---
//
// Row 31 closed on a measured before/after across the coalesce flip: single-
// message duplicate streaks went 34-of-48 double-billed before to 0-of-14
// after (Fisher exact, one-sided, p = 1.4e-6), the mitigation firing 8 times
// and never once on the retry class. This is the check that keeps that closure
// honest — dev-loop's rule that a manual investigation is unfinished while the
// check that would have produced its finding does not exist.
//
// WHY IT IS SCOPED TO THE POST-FLIP COHORT, which is the whole design. The
// corpus is MIXED and stays mixed until the pre-flip captures rotate out: they
// carry 34 double-billed single-message streaks that the mitigation could not
// have touched. A watcher on the corpus-wide count would be red on the day it
// shipped, on legitimate history — the check-that-fires-on-a-non-defect shape,
// which trains its reader to ignore red inside a week. Reading the cohort is
// only possible because every sweep row now carries its capture's own first
// stamp; the scoping is why that stamp was built.
//
// It watches BOTH directions, because the two failures cost different things.
// A post-flip double-bill is the mitigation having stopped working (money). A
// coalesce landing on the retry class is the fence breached (correctness: a
// real retry left unanswered) — measured 0 across all 94 streaks at closure,
// and anything else there is a defect, never a better result.
export const COALESCE_FLIP_ISO = "2026-08-14T16:17:00Z";

export function rowThirtyOneVerdict(status, { flipIso = COALESCE_FLIP_ISO } = {}) {
  const name = "row-31-coalesce";
  const rows = Array.isArray(status?.rows) ? status.rows : null;
  if (!rows || rows.length === 0) {
    return { name, level: "warn", message: `${name}: gate status missing, unreadable, or has no rows — the coalesce mitigation is NOT currently watched` };
  }
  const split = cohortSplit(rows, flipIso);
  if (split.error) return { name, level: "warn", message: `${name}: ${split.error}` };
  if (split.unstamped.captures > 0 && split.after.captures === 0) {
    return {
      name, level: "warn",
      message: `${name}: ${split.unstamped.captures} capture(s) carry no firstTs and none is stamped after the flip — the status file predates the per-row stamp; re-run the sweep. COULD NOT VERIFY, never clean.`,
    };
  }
  if (split.after.captures === 0) {
    return { name, level: "warn", message: `${name}: no capture on disk was written after ${flipIso} — nothing to verify against yet` };
  }
  const a = split.after.duplicates;
  const dbl = a.singleMessageDoubleBilled ?? 0;
  const fence = a.multiMessageCoalesced ?? 0;
  const problems = [];
  if (dbl > 0) {
    // The reason tally, when the sweep's captures carry coalesce-miss records
    // (proxy change 2026-08-18). Added because the count ALONE sent a session
    // on a hand walk over a 435 MB capture to answer "which condition failed",
    // and even that walk could not separate the two ways condition 4 fails.
    // Absent — an older capture, or a miss the proxy did not record — this
    // says NOT RECORDED rather than nothing: a silent omission here would read
    // as "no misses", which is the same count with the opposite meaning.
    const reasons = a.coalesceMissReasons && Object.keys(a.coalesceMissReasons).length
      ? Object.entries(a.coalesceMissReasons).sort().map(([k, v]) => `${k}=${v}`).join(" ")
      : "reasons NOT RECORDED (pre-2026-08-18 captures, or the miss record did not fire)";
    problems.push(
      `${dbl} post-flip single-message streak(s) DOUBLE-BILLED of ${a.singleMessageStreaks ?? 0} ` +
      `— row 31's mitigation is not holding [${reasons}]`,
    );
  }
  if (fence > 0) {
    problems.push(`${fence} coalesce(s) landed on the multi-message RETRY class — the fence is breached and a real retry may have gone unanswered (over-reach, not success)`);
  }
  if (problems.length) {
    return { name, level: "warn", message: `${name}: ${problems.join("; ")} [${split.after.captures} post-flip capture(s)]` };
  }
  return {
    name, level: "ok",
    message:
      `${name}: 0 double-billed of ${a.singleMessageStreaks ?? 0} post-flip single-message streak(s), ` +
      `${a.singleMessageCoalesced ?? 0} coalesced, 0 on the retry class ` +
      `[${split.after.captures} capture(s) after ${flipIso}]`,
  };
}

// --- Fire-ledger consumer (BACKLOG "mitigation fire-rate ledger") ---
//
// gate-live appends one line per sweep with two columns per class: RAW (what
// CC did, census-measured off the captured bytes — keeps counting with the
// gate off) and ABSORBED (what the mitigation did about it). This is the
// reader that turns that series into the one question a retirement asks:
// which mitigations have gone quiet, and is the behavior they absorb still
// happening?
//
// Deliberately INFORMATIONAL. A quiet mitigation is not a defect and must
// not fire a warn: retirement takes an upstream ref and an operator ruling
// (robustness-threat-matrix.md, Retirement policy), so a mechanical alarm
// here would fire on legitimate work every day until someone learned to
// ignore it. What DOES warn is the same thing that warns everywhere else in
// this file: an inability to answer — no ledger, an empty one, or a series
// that has stopped accumulating.
export const FIRE_LEDGER_MAX_AGE_H = HARVEST_MAX_AGE_H;
// How far back "is the raw behavior still happening?" looks. Two weeks of
// daily sweeps: long enough that a quiet stretch means something, short
// enough that a class fixed upstream stops reading as active.
export const FIRE_RECENT_SWEEPS = 14;

export function fireLedgerPath() {
  return process.env.CACHE_FIX_FIRE_LEDGER
    || legacyReadPath(statePath("fire-ledger.jsonl"), "cache-fix-fire-ledger.jsonl");
}

// The sweep's status file. Read-only from here — tools/gate-live.mjs writes it.
function gateStatusPath() {
  return process.env.CACHE_FIX_GATE_STATUS
    || legacyReadPath(statePath("gate-status.json"), "cache-fix-gate-status.json");
}

const days = (ms) => Math.round(ms / 86_400_000);

export function fireLedgerVerdict(lines, nowMs = Date.now()) {
  const name = "fire-ledger";
  if (!Array.isArray(lines) || !lines.length) {
    return {
      name,
      level: "warn",
      message:
        "fire-ledger: no ledger lines yet — mitigation fire rates are NOT currently tracked, " +
        "so no retirement has evidence (gate-live --fire-ledger writes it)",
    };
  }
  const newest = lines[lines.length - 1];
  const newestMs = Date.parse(newest.ts ?? "");
  if (Number.isNaN(newestMs)) {
    return { name, level: "warn", message: "fire-ledger: newest line carries no readable ts — the series cannot be dated" };
  }
  const ageH = (nowMs - newestMs) / 3600_000;
  if (ageH > FIRE_LEDGER_MAX_AGE_H) {
    return {
      name,
      level: "warn",
      message:
        `fire-ledger: newest line is ${Math.round(ageH)}h old (sweep is daily) — ` +
        `the series is frozen, retirement evidence is NOT accumulating`,
    };
  }
  const recent = lines.slice(-FIRE_RECENT_SWEEPS);
  const classes = Object.keys(newest.raw ?? newest.absorbed ?? {});
  const firing = [];
  const quiet = [];
  const unmeasured = [];
  for (const cls of classes) {
    if (typeof newest.absorbed?.[cls] !== "number") {
      unmeasured.push(cls);
      continue;
    }
    // RAW across the recent window: null everywhere means the behavior is
    // unmeasured, which is NOT "the behavior stopped" — the distinction the
    // whole two-column shape exists to keep.
    let rawSum = null;
    for (const l of recent) {
      const v = l.raw?.[cls];
      if (typeof v === "number") rawSum = (rawSum ?? 0) + v;
    }
    const rawText = rawSum === null ? "raw unmeasured" : `raw ${rawSum}`;
    let lastFire = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      if ((lines[i].absorbed?.[cls] ?? 0) > 0) { lastFire = lines[i]; break; }
    }
    if (lastFire) {
      firing.push(`${cls} ${days(nowMs - Date.parse(lastFire.ts))}d (${rawText})`);
    } else {
      quiet.push(`${cls} never in ${lines.length} sweep(s) (${rawText})`);
    }
  }
  const parts = [
    `${lines.length} sweep(s), newest ${Math.round(ageH)}h old`,
    `cc ${(newest.ccVersions ?? []).join(",") || "unknown"}`,
  ];
  if (firing.length) parts.push(`last absorbed: ${firing.join("; ")}`);
  if (quiet.length) parts.push(`QUIET: ${quiet.join("; ")}`);
  if (unmeasured.length) parts.push(`no absorbed source: ${unmeasured.join(", ")}`);
  return { name, level: "ok", message: `fire-ledger: ${parts.join("; ")}` };
}

export async function readFireLedger(path = fireLedgerPath()) {
  let text;
  try {
    text = await readFile(path, "utf-8");
  } catch {
    return null;
  }
  const out = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    try {
      out.push(JSON.parse(line));
    } catch { /* a torn line is skipped, never treated as a sweep */ }
  }
  return out;
}

// Read the same status file servingGate reads (cache-fix-gate-status.json),
// async and uncached — computeVerdicts runs once per CLI invocation, so a
// per-process cache buys nothing here and would only risk staleness if this
// function is ever called more than once in a process (servingGate's cache
// is justified by gateResolves being called per telemetry-consumer row;
// this is called once).
async function readGateStatus() {
  try {
    return JSON.parse(await readFile(gateStatusPath(), "utf-8"));
  } catch {
    return null;
  }
}

export async function computeVerdicts(ledgerPath = DEFAULT_LEDGER) {
  let current = null;
  try {
    current = JSON.parse(await readFile(ledgerPath, "utf-8"));
  } catch {
    current = null;
  }
  let committed = null;
  try {
    const rel = relative(REPO_ROOT, ledgerPath).split("\\").join("/");
    const { stdout } = await pExecFile("git", ["-C", REPO_ROOT, "show", `HEAD:${rel}`], {
      timeout: 10_000,
    });
    committed = JSON.parse(stdout);
  } catch {
    committed = null;
  }
  return [
    shapeWatchVerdict(current),
    baselineStepVerdict(committed, current),
    retentionVerdict(committed, current),
    duplicateBillingVerdict(await readGateStatus()),
    rowThirtyOneVerdict(await readGateStatus()),
    fireLedgerVerdict(await readFireLedger()),
    movedFreshVerdict(await readMovedFreshRecords()),
    ...(await computeTelemetryVerdicts()),
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const li = args.indexOf("--ledger");
  const path = li >= 0 ? args[li + 1] : DEFAULT_LEDGER;
  computeVerdicts(path).then(
    (v) => process.stdout.write(JSON.stringify(v) + "\n"),
    (err) => {
      process.stderr.write(`shape-verdicts failed: ${err?.message ?? err}\n`);
      process.exit(1);
    },
  );
}
