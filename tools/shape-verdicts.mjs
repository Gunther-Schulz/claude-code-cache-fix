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

import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { detectGrowthSteps, DEFAULT_LEDGER } from "./harvest.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const pExecFile = promisify(execFile);

// Minimum pair sample for a drop-RATE to be signal rather than noise
// (measured normal: 2 of ~1,900 pairs, context-pruning-shaped).
export const DROP_RATE_THRESHOLD = 0.05;
export const DROP_RATE_MIN_PAIRS = 50;

export function shapeWatchVerdict(ledger) {
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
  return [shapeWatchVerdict(current), baselineStepVerdict(committed, current)];
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
