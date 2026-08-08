#!/usr/bin/env node
// md-splice — anchored find/replace edits that fail LOUDLY, not silently.
//
// WHY THIS EXISTS. Measured 2026-08-08 (`claude-worktime`): a hand-rolled
// python splice targeted a heading `## Open`; the target repo actually used
// `## Ready`. The script's replace() call only ASSERTED the first
// replacement — the second dropped with no error, and the only tell was an
// insertion count that still looked plausible. This exact splice shape gets
// re-pasted by hand constantly in this repo (BACKLOG.md edits above all),
// which is precisely where a re-pasted one-liner hides a variant of the same
// bug (project convention: a probe used twice graduates to `tools/`).
//
// THE GUARANTEE. Every operation states the occurrence COUNT it expects.
// Before anything is written, EVERY operation in the list is checked against
// that count — a mismatch throws, naming which operation and both the
// expected and actual counts, and touches the file not at all. Only once
// every operation has matched is the file written, exactly once. A later
// operation failing therefore leaves the file byte-identical to how it
// started: there is no partial-apply state to leave behind, because nothing
// is written until the whole list has verified clean.
//
// Matching is literal-substring (split/join), not regex — an anchor with
// regex metacharacters (`.`, `(`, `)`, `*`, ...) behaves the same as one
// without; there is no meta-character escaping to get wrong.

import { readFileSync, writeFileSync } from "node:fs";

function truncate(s, max = 60) {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function describeOp(op, index) {
  const find = typeof op?.find === "string" ? op.find : String(op?.find);
  return `operation ${index + 1} (find: "${truncate(find)}")`;
}

/**
 * Apply a list of anchored find/replace operations to a markdown (or any
 * text) file, all-or-nothing.
 *
 * @param {string} filePath path to the file to edit, read and written as utf8
 * @param {Array<{find: string, replace: string, count: number}>} operations
 *   applied in order, each against the result of the previous ones. `count`
 *   is the number of literal occurrences of `find` this operation REQUIRES
 *   to be present at the moment it runs; every occurrence found is replaced.
 * @throws {Error} if any operation's `find` does not occur exactly `count`
 *   times in the working text at the point it runs — naming the operation
 *   and both the expected and actual counts. Nothing is written in that
 *   case: the file on disk is left byte-identical to its prior content.
 */
export function spliceMarkdown(filePath, operations) {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new Error("md-splice: operations must be a non-empty array");
  }

  const original = readFileSync(filePath, "utf8");
  let working = original;

  operations.forEach((op, index) => {
    const label = describeOp(op, index);
    const { find, replace, count } = op ?? {};

    if (typeof find !== "string" || find.length === 0) {
      throw new Error(`md-splice: ${label} has an empty or non-string "find" — refusing (an empty find cannot be counted meaningfully)`);
    }
    if (typeof replace !== "string") {
      throw new Error(`md-splice: ${label} has a non-string "replace"`);
    }
    if (!Number.isInteger(count) || count < 0) {
      throw new Error(`md-splice: ${label} has a non-integer "count" (${JSON.stringify(count)})`);
    }

    const actual = working.split(find).length - 1;
    if (actual !== count) {
      throw new Error(`md-splice: ${label} expected ${count} occurrence(s), found ${actual} in ${filePath}`);
    }

    working = working.split(find).join(replace);
  });

  writeFileSync(filePath, working);
}

// --- CLI -----------------------------------------------------------------
//
// House idiom here (`grep -l import.meta.url tools/*.mjs`) is a runnable CLI
// on top of the exported function, gated by the same
// `import.meta.url === file://process.argv[1]` check every other tools/*.mjs
// uses (e.g. backlog-order.mjs) — so this stays import-only when required as
// a module and runnable standalone otherwise. Since operations are
// structured data (multi-line find/replace text plus a count) rather than
// something that fits shell args, the CLI takes a JSON ops file rather than
// trying to flatten operations onto the command line.
function main() {
  const [, , targetPath, opsPath] = process.argv;
  if (!targetPath || !opsPath) {
    console.error('usage: node tools/md-splice.mjs <target-file> <ops.json>');
    console.error('  ops.json: a JSON array of {"find": "...", "replace": "...", "count": N}');
    process.exit(2);
  }
  const operations = JSON.parse(readFileSync(opsPath, "utf8"));
  spliceMarkdown(targetPath, operations);
  console.log(`md-splice: applied ${operations.length} operation(s) to ${targetPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
