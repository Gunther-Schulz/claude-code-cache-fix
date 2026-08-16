#!/usr/bin/env node
// row31-effect — what the duplicate-sidecar coalescer actually changed, over
// ONE fixed corpus, with ONE variable.
//
// WHY THIS IS NOT AN A/B REPLAY, and the measurement that answers it instead.
// The obvious instrument — replay the same captures twice, coalescer off then
// on — CANNOT work, and the reason is structural rather than a missing flag:
// the coalescing decision lives in the LIVE request path
// (`proxy/server.mjs`, the only site reading `CACHE_FIX_COALESCE_SIDECAR`
// outside the gate allowlist), which sits upstream of the capture file. By
// the time a capture exists the decision has already been taken and recorded.
// Measured 2026-08-16 before this tool was written: the census run over one
// capture carrying a real `type:"coalesced"` record returns a BYTE-IDENTICAL
// duplicate rollup under `CACHE_FIX_COALESCE_SIDECAR=0` and `=1`. Two arms
// that agree have not measured the thing they were pointed at.
//
// What IS available is better than a synthetic A/B: every capture's own boot
// record declares the gate set the proxy started with, so the corpus labels
// its own arms. Captures written by a coalescing proxy and captures written
// by a non-coalescing one sit side by side in one directory, and the label is
// data rather than a re-run. This tool reads that label, joins it to the
// retained per-streak evidence, and reports the double-billing rate per arm.
//
// WHAT IT DELIBERATELY DOES NOT CLAIM. This is OBSERVATIONAL, not randomized:
// the OFF arm is older captures, so anything that changed with time is
// confounded with the gate. Rates are therefore per capture, never raw totals
// — a raw before/after over shifting denominators is the comparison row 31's
// entry was already warned off. And two coordinates are kept apart on purpose:
// `family` here is the streak's START LINE (<=5 = session-start, gate-live's
// own `streakFamily`), while the census's `singleMessage`/`multiMessage`
// classes split on `nMsg`. They are near-siblings and they are not the same
// field; a row's family never stands in for its class.
//
// THREE ANSWERS, never two: a capture whose boot record is missing or carries
// no coalesce gate is UNKNOWN and is reported as its own arm. Folding it into
// OFF would turn an absence of evidence into a measurement.
//
// CLI:
//   node tools/row31-effect.mjs [--rows <census-rows doc>] [--captures <dir>]
//                              [--json]
// Default rows document: the newest `census-rows-*.json` under
// test/fixtures/harvested/census-rows/ — the retained per-streak evidence the
// daily sweep writes. Missing or unreadable input is a stated could-not-verify
// with a non-zero exit, never an empty report.

import { readFileSync, readdirSync, openSync, readSync, closeSync } from "node:fs";
// (no other reader here — the rows document and the captures are the only two
// inputs, and both are read through this file's own two functions.)
import { join, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { dataPath, legacyReadPath } from "../proxy/xdg-dirs.mjs";
// The capture token is the sweep's own, imported rather than re-derived: a
// second implementation of an identity has produced a confident wrong answer
// in this repo three times (dev-loop, "Never hand-roll identity in a probe").
import { sidToken } from "./harvest.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DEFAULT_ROWS_DIR = join(__dirname, "..", "test", "fixtures", "harvested", "census-rows");
const DEFAULT_CAPTURES = process.env.CACHE_FIX_CAPTURE_DIR
  || legacyReadPath(dataPath("captures"), "cache-fix-captures");

/** Newest `census-rows-*.json` in `dir`, by filename (they are date-stamped,
 *  fixed-width, so lexical order IS date order here — stated because a sort
 *  whose ordering assumption is unstated is where a "newest" claim goes
 *  wrong). Throws when the directory holds none. */
export function newestRowsDoc(dir) {
  const names = readdirSync(dir).filter((n) => /^census-rows-\d{4}-\d{2}-\d{2}\.json$/.test(n));
  if (names.length === 0) throw new Error(`no census-rows-*.json under ${dir}`);
  names.sort();
  return join(dir, names[names.length - 1]);
}

/** Read a capture's BOOT record — line 1 — without reading the file, which
 *  can be gigabytes. Returns the declared gates object, or null when the
 *  first line is absent, unparsable, or not a boot record. */
export function readBootGates(path, { bytes = 65536 } = {}) {
  let fd;
  try {
    fd = openSync(path, "r");
    const buf = Buffer.alloc(bytes);
    const n = readSync(fd, buf, 0, bytes, 0);
    const head = buf.subarray(0, n).toString("utf-8");
    const nl = head.indexOf("\n");
    const line = nl >= 0 ? head.slice(0, nl) : head;
    const rec = JSON.parse(line);
    if (rec?.type !== "boot") return null;
    return rec.gates && typeof rec.gates === "object" ? rec.gates : null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/**
 * One capture's arm, from its boot-declared gate set. FOUR answers, and the
 * split inside the old three is the load-bearing part:
 *
 *   ON       — the gate is declared and set. The mitigation could act.
 *   OFF      — the gate is declared and unset. A proxy that KNEW the gate and
 *              ran without it.
 *   PRE-GATE — a boot record with no coalesce gate at all: a proxy build from
 *              before the mechanism existed. This is a usable control arm, and
 *              collapsing it into UNKNOWN threw the only control the corpus
 *              actually has (measured 2026-08-16: OFF was empty, PRE-GATE was
 *              not, so the run reported "no comparison exists" while holding
 *              one).
 *   NO-BOOT  — no readable boot record. Genuinely unmeasured; never folded
 *              into any other arm.
 */
export function armOf(gates, { hasBootRecord = true } = {}) {
  if (!hasBootRecord) return "NO-BOOT";
  if (!gates || !Object.prototype.hasOwnProperty.call(gates, "CACHE_FIX_COALESCE_SIDECAR")) {
    return "PRE-GATE";
  }
  return String(gates.CACHE_FIX_COALESCE_SIDECAR) === "1" ? "ON" : "OFF";
}

export const ARMS = ["ON", "OFF", "PRE-GATE", "NO-BOOT"];

/** Every capture file in `dir` with its token and arm. */
export function captureArms(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".jsonl")) continue;
    const token = sidToken(name.replace(/-requests\.jsonl$/, "").replace(/\.jsonl$/, ""));
    const boot = readBootGates(join(dir, name));
    out.push({ token, arm: armOf(boot, { hasBootRecord: boot !== null }) });
  }
  return out;
}

const ZERO = () => ({
  captures: 0,
  capturesWithStreaks: 0,
  streaks: 0,
  sessionStartStreaks: 0,
  sessionStartDoubleBilled: 0,
  midSessionStreaks: 0,
  midSessionDoubleBilled: 0,
});

/**
 * Join the retained streak rows to the per-capture arms and total per arm.
 *
 * A streak row whose capture token matches no capture on disk is counted in
 * `orphanStreaks` rather than dropped: the rows document outlives the captures
 * behind it (eviction is oldest-first), and silently omitting those rows would
 * shrink the denominator of whichever arm they belonged to.
 */
export function summarise(streaks, arms) {
  const armByToken = new Map(arms.map((a) => [a.token, a.arm]));
  const totals = Object.fromEntries(ARMS.map((a) => [a, ZERO()]));
  for (const a of arms) totals[a.arm].captures++;

  const seen = Object.fromEntries(ARMS.map((a) => [a, new Set()]));
  let orphanStreaks = 0;
  for (const s of streaks) {
    const arm = armByToken.get(s.capture);
    if (!arm) { orphanStreaks++; continue; }
    const t = totals[arm];
    t.streaks++;
    seen[arm].add(s.capture);
    const doubleBilled = (s.billed ?? 0) > 1;
    if (s.family === "session-start") {
      t.sessionStartStreaks++;
      if (doubleBilled) t.sessionStartDoubleBilled++;
    } else {
      t.midSessionStreaks++;
      if (doubleBilled) t.midSessionDoubleBilled++;
    }
  }
  for (const arm of Object.keys(totals)) totals[arm].capturesWithStreaks = seen[arm].size;
  return { totals, orphanStreaks };
}

/** Per-capture rate, or null when the arm has no captures — a rate over a
 *  zero denominator is not zero, it is unmeasured. */
const rate = (n, d) => (d > 0 ? n / d : null);
const fmt = (r) => (r === null ? "n/a (no captures in this arm)" : r.toFixed(3));

export function report(doc, summary) {
  const { totals, orphanStreaks } = summary;
  const lines = [];
  lines.push(`rows document: ${basename(doc.__file)}  produced ${doc.producedAt ?? "?"}`);
  lines.push(`streak rows: ${doc.duplicateStreaks?.length ?? 0}   orphaned (capture evicted): ${orphanStreaks}`);
  lines.push("");
  lines.push("arm       captures  streaks  session-start str/dbl  rate/capture  mid-session str/dbl");
  for (const arm of ARMS) {
    const t = totals[arm];
    lines.push(
      `${arm.padEnd(9)} ${String(t.captures).padStart(8)}  ${String(t.streaks).padStart(7)}  ` +
      `${String(t.sessionStartStreaks).padStart(11)}/${String(t.sessionStartDoubleBilled).padEnd(4)}  ` +
      `${fmt(rate(t.sessionStartDoubleBilled, t.captures)).padEnd(12)}  ` +
      `${t.midSessionStreaks}/${t.midSessionDoubleBilled}`,
    );
  }
  lines.push("");
  // The control is whichever pre-mitigation arm the corpus actually holds. OFF
  // (a proxy that knew the gate and ran without it) is the cleaner control and
  // is usually empty here, because the gate was enabled the day after it
  // shipped; PRE-GATE (a build from before the mechanism) is the one that
  // exists. Named rather than merged, so the reader knows which they got.
  const on = totals.ON;
  const controlArm = totals.OFF.captures > 0 ? "OFF" : (totals["PRE-GATE"].captures > 0 ? "PRE-GATE" : null);
  if (on.captures === 0 || controlArm === null) {
    lines.push("COULD NOT VERIFY — no control arm in this corpus: every capture was written");
    lines.push("by a proxy on the same side of the gate. Nothing to compare, which is a");
    lines.push("statement about the corpus, not a measurement of the mitigation.");
  } else {
    const ctl = totals[controlArm];
    lines.push(`control arm used: ${controlArm} (${ctl.captures} capture(s))`);
    lines.push(
      `session-start double-billing per capture: ON ${fmt(rate(on.sessionStartDoubleBilled, on.captures))} ` +
      `vs ${controlArm} ${fmt(rate(ctl.sessionStartDoubleBilled, ctl.captures))}`,
    );
    lines.push(
      `mid-session (must NOT fall — a fall there is over-reach): ON ${fmt(rate(on.midSessionDoubleBilled, on.captures))} ` +
      `vs ${controlArm} ${fmt(rate(ctl.midSessionDoubleBilled, ctl.captures))}`,
    );
  }
  lines.push("");
  lines.push("Observational, not randomized: the OFF arm is older captures, so time is");
  lines.push("confounded with the gate. `family` is the streak's start line, never the");
  lines.push("census's nMsg class. Row 31 closes on the census's own singleMessage");
  lines.push("counters, not on this table alone.");
  return lines.join("\n");
}

function main(argv) {
  const args = { rows: null, captures: DEFAULT_CAPTURES, json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--rows") args.rows = argv[++i];
    else if (argv[i] === "--captures") args.captures = argv[++i];
    else if (argv[i] === "--json") args.json = true;
  }
  let doc, docPath;
  try {
    docPath = args.rows || newestRowsDoc(DEFAULT_ROWS_DIR);
    doc = JSON.parse(readFileSync(docPath, "utf-8"));
    doc.__file = docPath;
  } catch (e) {
    process.stderr.write(`COULD NOT VERIFY — no readable census-rows document: ${e?.message ?? e}\n`);
    return 2;
  }
  if (!Array.isArray(doc.duplicateStreaks)) {
    process.stderr.write(`COULD NOT VERIFY — ${docPath} carries no duplicateStreaks array\n`);
    return 2;
  }
  let arms;
  try {
    arms = captureArms(args.captures);
  } catch (e) {
    process.stderr.write(`COULD NOT VERIFY — cannot read captures at ${args.captures}: ${e?.message ?? e}\n`);
    return 2;
  }
  if (arms.length === 0) {
    process.stderr.write(`COULD NOT VERIFY — no captures under ${args.captures}\n`);
    return 2;
  }
  const summary = summarise(doc.duplicateStreaks, arms);
  if (args.json) {
    process.stdout.write(JSON.stringify({
      rowsDocument: basename(docPath),
      producedAt: doc.producedAt ?? null,
      streakRows: doc.duplicateStreaks.length,
      duplicates: doc.duplicates ?? null,
      ...summary,
    }, null, 2) + "\n");
  } else {
    process.stdout.write(report(doc, summary) + "\n");
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(main(process.argv.slice(2)));
}
