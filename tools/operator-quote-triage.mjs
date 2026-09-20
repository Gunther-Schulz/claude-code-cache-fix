#!/usr/bin/env node
// Triage tracked prose for VERBATIM OPERATOR QUOTES — a publication-bar class
// with no mechanism until now.
//
// WHY THIS EXISTS. CLAUDE.local.md's publication bar forbids verbatim operator
// quotes in tracked prose and commit messages, and says the class is "not
// mechanizable — no predicate separates a quote from a restatement", leaving
// the operator as backstop. That is true of the DECIDER and was read as true of
// the whole job, so nothing was built and nothing looked. The bar's own extent
// measurement (2026-08-10) recorded one quote in the tracked tree after
// scrubbing; a hand sweep on 2026-09-21 found FOUR more that had accumulated
// since, plus a fifth written that same day in LEDGER.md and pushed public.
// Five instances, zero detections, because the only instrument was memory.
//
// What IS mechanizable is the slice below the judgment: narrowing ~22k lines of
// tracked prose to the few dozen a reader can classify in one pass. That is the
// closing gate's question 1 applied to its own answer — "it needs judgment" is
// never the end of the question, because delivering the inputs to the judgment
// is always mechanizable.
//
// SO THIS IS A TRIAGE, NOT A GATE, and it is deliberately not wired into the
// pre-push hook. The heuristic returns mostly benign hits (technical quotes,
// entry titles, quoted field names): on the sweep that motivated it, 4 of 57
// hits were real. A blocking lane at that rate trains the override reflex that
// kills a guard, which this repo has recorded twice. The output is a list to
// READ; the verdict stays human, exactly as the bar says.
//
//   node tools/operator-quote-triage.mjs [--json] [<path>...]
//
// Exit codes: 0 = ran, nothing to read; 2 = ran, hits to classify by hand;
// 1 = the run itself failed. A hit is NOT a violation and 2 is NOT a red.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

// A quoted span long enough to be a sentence rather than an identifier. Short
// spans are where the false-positive mass is: `"off"`, `"ok"`, a field name.
const MIN_QUOTE = 22;

// The quote forms that actually occur in this tree: plain double quotes, and
// markdown-emphasised quotes (*"..."*), which the 2026-08-10-era entries use.
const QUOTED = new RegExp(`[*]?"([^"\\n]{${MIN_QUOTE},})"[*]?`, "g");

// The attribution words that make a quoted span a candidate. Keyed on how the
// tree actually attributes — the operator is named, never quoted anonymously —
// rather than on a list of phrasings, which would catch its own examples only.
const ATTRIB = /\boperator\b|\bChris\b/i;

export function triageLine(line) {
  if (!ATTRIB.test(line)) return [];
  const out = [];
  for (const m of line.matchAll(QUOTED)) out.push(m[1]);
  return out;
}

export function triageText(text) {
  const hits = [];
  text.split("\n").forEach((line, i) => {
    for (const quote of triageLine(line)) hits.push({ line: i + 1, quote });
  });
  return hits;
}

function trackedProse() {
  const out = execFileSync("git", ["ls-files", "*.md"], { encoding: "utf8" });
  return out.split("\n").filter(Boolean);
}

function main(argv) {
  const json = argv.includes("--json");
  const paths = argv.filter((a) => a !== "--json");
  const files = paths.length ? paths : trackedProse();
  const found = [];
  let scanned = 0;
  for (const f of files) {
    let text;
    try {
      text = readFileSync(f, "utf8");
    } catch {
      continue; // a listed-but-absent path is not this tool's finding
    }
    scanned++;
    for (const h of triageText(text)) found.push({ file: f, ...h });
  }
  if (json) {
    process.stdout.write(JSON.stringify({ scanned, hits: found }, null, 2) + "\n");
  } else {
    // The header states the population, so a zero is a measurement over
    // something that was read rather than an absence of checking.
    process.stdout.write(`operator-quote triage: ${found.length} span(s) to classify across ${scanned} tracked file(s)\n`);
    process.stdout.write(`(a hit is a CANDIDATE — the bar's verdict stays human; restate, never blunt-delete: the causal record is what made the line worth having)\n`);
    for (const h of found) {
      const q = h.quote.length > 90 ? h.quote.slice(0, 90) + "…" : h.quote;
      process.stdout.write(`  ${h.file}:${h.line}  "${q}"\n`);
    }
  }
  return found.length ? 2 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main(process.argv.slice(2));
}
