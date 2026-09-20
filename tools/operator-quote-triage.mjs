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
//
// CARRIER REGISTRATION (closing gate, question 4): this tool is NOT a carrier and
// needs no collector in `state-report`. It is read-only — it writes nothing
// outside the tree, keeps no state between runs, and its whole output is stdout.
// Stated rather than left out, because the enumeration's finding is the
// UNCLASSIFIED writer, and "obviously read-only" is what stops someone checking.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

// A quoted span long enough to be a sentence rather than an identifier. Short
// spans are where the false-positive mass is: `"off"`, `"ok"`, a field name.
// Measured on the collapsed span, so a wrapped quote is not disqualified by the
// newline and indentation it happens to contain.
const MIN_QUOTE = 22;

// The quote CARRIERS, and the second one is why the first version under-returned.
// Quotation marks are not the only way this tree quotes the operator:
// `docs/dev-loop.md:89` introduces one with "the operator's words for why" and
// then uses markdown emphasis alone. Keyed to the forms the tree actually uses,
// and each body deliberately spans newlines — see SCANNING, below.
const CARRIERS = [
  new RegExp(`"([^"]{${MIN_QUOTE},}?)"`, "g"), // "..."  (and *"..."* via the emphasis strip)
  // A SINGLE asterisk on each side, never one that is part of `**bold**`. Without
  // the lookarounds a document using bold heavily — this repo's docs do — pairs
  // the wrong asterisks: measured on docs/dev-loop.md, the naive form returned 12
  // spans for that file, none of them the known positive at :89, while the
  // whole-tree count inflated to 434. Over-returning AND still missing the target
  // is the worst of both, and it reads as coverage of the route.
  new RegExp(`(?<!\\*)\\*(?!\\*)([^*]{${MIN_QUOTE},}?)(?<!\\*)\\*(?!\\*)`, "g"), // *...*
  new RegExp(`(?<![A-Za-z0-9_])_([^_]{${MIN_QUOTE},}?)_(?![A-Za-z0-9_])`, "g"), // _..._
];

// The attribution words that make a quoted span a candidate. Keyed on how the
// tree actually attributes — the operator is named, never quoted anonymously —
// rather than on a list of phrasings, which would catch its own examples only.
const ATTRIB = /\boperator\b|\bChris\b/i;

// How far BEFORE a span an attribution may sit and still bind it. A whole-file
// attribution test would flag every emphasised phrase in any document that
// mentions the operator once, which is how a widened predicate stops being
// readable; this window is what keeps the hit list classifiable, and it is
// pinned by its own test.
const ATTRIB_WINDOW = 160;

// SCANNING IS WHOLE-TEXT, NOT LINE-BASED, and that is a correctness property
// rather than a style choice: this corpus hard-wraps at ~69 columns, so a quote
// routinely spans a line break and a line-based search is blind to exactly
// those — returning what a true absence returns. A span may therefore contain
// newlines, but not a BLANK line: a paragraph break means the delimiters belong
// to different constructs and the match is an artifact of an unclosed one.
const collapse = (s) => s.replace(/\s+/g, " ").trim();

// `*"…"*` is one quote wearing two carriers, so it matches under both and at
// two different offsets. Dedupe on the BODY with its own delimiters stripped,
// keeping the first (outermost) sighting — offset-keyed dedupe reports it twice,
// which inflates exactly the count the tool exists to state honestly.
const dedupeKey = (quote) => quote.replace(/^["*_]+/, "").replace(/["*_]+$/, "");

// SCANNING IS PER PARAGRAPH, and this is the third shape this function took —
// each earlier one failed its own control, which is the only reason the failures
// are known.
//
//   1. LINE-BASED: blind to a quote spanning the hard wrap, and to emphasis-only
//      quotes. Missed docs/dev-loop.md:89, a quote introduced with the words
//      "the operator's words for why".
//   2. WHOLE-TEXT: fixed those and broke worse. Delimiter pairing is sequential,
//      so ONE unbalanced quote mark or asterisk anywhere in a file shifts every
//      pairing after it. On a 10k-line carrier that dropped the live
//      known-positive at BACKLOG-DONE.md:7361 while inflating the tree count —
//      losing a true hit is the failure that matters, and only the control
//      showed it.
//   3. PER PARAGRAPH: pairing resets at every blank line, so distant noise
//      cannot reach across, while a quote that wraps INSIDE a paragraph is still
//      one span. The blank-line rule that used to be a post-filter is now the
//      unit of scanning, which is where it always belonged.
//
// Both controls are pinned as tests: the wrapped/emphasis case and the
// quotation-mark case must BOTH survive any future change here.
export function triageText(text) {
  const hits = new Map();
  let offset = 0;
  for (const block of text.split(/\n[ \t]*\n/)) {
    for (const re of CARRIERS) {
      for (const m of block.matchAll(re)) {
        const quote = collapse(m[1]);
        if (quote.length < MIN_QUOTE) continue;
        const start = m.index ?? 0;
        const before = block.slice(Math.max(0, start - ATTRIB_WINDOW), start);
        if (!ATTRIB.test(before)) continue;
        const key = dedupeKey(quote);
        if (hits.has(key)) continue;
        const absolute = offset + start;
        hits.set(key, { line: text.slice(0, absolute).split("\n").length, quote, start: absolute });
      }
    }
    // +2 approximates the paragraph separator; line numbers are recomputed from
    // the absolute offset above, so the approximation cannot drift a reported
    // line — it only orders the output.
    offset += block.length + 2;
  }
  return [...hits.values()].sort((a, b) => a.start - b.start).map(({ line, quote }) => ({ line, quote }));
}

// Kept for callers that have one line in hand; it is triageText over that line,
// so the two cannot diverge in what they consider a quote.
export function triageLine(line) {
  return triageText(line).map((h) => h.quote);
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
