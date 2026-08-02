#!/usr/bin/env node
// backlog-lint — WARN when a BACKLOG.md entry's own header contradicts its
// own body.
//
// Why this exists: on 2026-08-01 a header lint found FIVE entries whose
// header still read OPEN/READY/HOT while the SAME entry's body already
// carried a dated resolution (row-4, duplicate-request, merged-standalone,
// final-message strip, plus a duplicate blocker-4 entry dropped separately
// as a cross-entry case this same-entry rule cannot see — see the README
// note at the bottom of this file). Two of the four same-entry instances
// had already mis-graded a manual survey before being caught by hand. The
// mechanism this file is is the mechanized form of that manual catch: it
// finds the SAME shape at the moment it recurs, without redoing the hand
// read.
//
// Scope, exactly as the backlog entry that requested this states it: one
// entry runs from a `- **` bullet to the next `- **` bullet (or EOF). The
// header is that bullet's first line. The body is the whole entry
// (including its header line, since a one-line entry can carry both).
//
// A finding fires when BOTH hold:
//   (1) the header opens with a grade of OPEN, READY, HOT, or OPEN/HOT.
//   (2) the entry's body contains, as PROSE (not as an enumeration of the
//       marker words themselves — see below), either
//         - a dated resolution word (RESOLVED, FIXED, or BUILT) with a
//           YYYY-MM-DD date within ~40 characters of it, or
//         - a verification word (VERIFIED or CLASS CLOSED), the un-negated
//           form only (NOT-VERIFIED reads as still-open, not resolved).
//
// The "as prose, not as an enumeration" guard exists because this file's
// own backlog entry describes its marker words as a slash-joined list
// ("RESOLVED/FIXED/BUILT + VERIFIED/CLASS CLOSED") — a literal match
// without the guard self-fires on that entry the moment it lands in
// BACKLOG.md. Excluding marker words immediately adjacent to a "/" clears
// that false fire without narrowing the real prose instances, all of which
// use "+", "same day", or plain adjacency instead of slashes.
//
// This is WARN-only: it never fails a build. Exit code is always 0; the
// findings are the payload, one line each on stdout, prefixed
// `WARN backlog-header` for grep/CI parsing.
//
// KNOWN GAP (surfaced, not silently absorbed): a duplicate entry whose
// resolution lives in a DIFFERENT entry — the historical #272 blocker-4
// duplicate at 40c11b2, resolved by the separate "blockers 3+4" entry
// above it and later handled by dropping the duplicate outright (commit
// 9ae9e9b) rather than rewriting its own header — is NOT this rule's
// shape and this tool does not claim to catch it. Same-entry contradiction
// and cross-entry duplication are different defects; widening this rule to
// catch the second would mean near-duplicate detection across entries,
// which is a different (and materially larger) tool than the one the
// backlog entry scoped ("keep it small — one file, no dependencies").
//
// CLI:
//   node tools/backlog-lint.mjs             # lints the repo's BACKLOG.md
//   node tools/backlog-lint.mjs <path>      # lints a specific file
//   node tools/backlog-lint.mjs -           # lints stdin (for piping
//                                           # `git show <ref>:BACKLOG.md`)

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
export const DEFAULT_BACKLOG = join(REPO_ROOT, "BACKLOG.md");

const ENTRY_START = /^- \*\*/;
const HEADER_GRADE = /^- \*\*(OPEN\/HOT|OPEN|READY|HOT)\b/;

// Marker word must not be part of a slash-joined enumeration (the guard
// described above), and the verification word must not be negated.
const RES_WORD = /(?<!\/)\b(RESOLVED|FIXED|BUILT)\b(?!\/)/g;
// DONE grades entries here as freely as RESOLVED does, but it needs the
// LINE-INITIAL constraint the others do not: this corpus writes qualified
// sub-steps ("ATTRIBUTE DONE <date>") inside entries that are correctly
// still open, and a bare match would fire on those — a guard firing on
// legitimate work is the failure that trains the override reflex. Only a
// DONE that opens its own line is claiming the ENTRY is done.
const DONE_LINE = /^[ \t]*(DONE)\b/gm;
const VERIF_WORD = /(?<!\/)(?<!NOT[- ])\b(VERIFIED|CLASS CLOSED)\b(?!\/)/g;
const DATE = /\d{4}-\d{2}-\d{2}/;
const DATE_PROXIMITY = 40;

function findDatedResolution(body) {
  for (const re of [RES_WORD, DONE_LINE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(body))) {
      const start = Math.max(0, m.index - DATE_PROXIMITY);
      const end = Math.min(body.length, m.index + m[0].length + DATE_PROXIMITY);
      if (DATE.test(body.slice(start, end))) return m[1];
    }
  }
  return null;
}

function findVerification(body) {
  VERIF_WORD.lastIndex = 0;
  const m = VERIF_WORD.exec(body);
  return m ? m[1] : null;
}

// Splits text into [{ startLine (1-based), header, body }] per top-level
// `- **` entry. Text before the first entry is ignored (front matter).
export function splitEntries(text) {
  const lines = text.split("\n");
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    if (ENTRY_START.test(lines[i])) starts.push(i);
  }
  return starts.map((start, idx) => {
    const end = idx + 1 < starts.length ? starts[idx + 1] : lines.length;
    return {
      startLine: start + 1,
      header: lines[start],
      body: lines.slice(start, end).join("\n"),
    };
  });
}

// Lints backlog text; returns an array of finding objects.
export function lintText(text) {
  const findings = [];
  for (const entry of splitEntries(text)) {
    const gradeMatch = entry.header.match(HEADER_GRADE);
    if (!gradeMatch) continue;
    const resWord = findDatedResolution(entry.body);
    const verifWord = findVerification(entry.body);
    if (!resWord && !verifWord) continue;
    findings.push({
      line: entry.startLine,
      grade: gradeMatch[1],
      marker: resWord ?? verifWord,
      header: entry.header.replace(/^- \*\*/, "").trim().slice(0, 80),
    });
  }
  return findings;
}

function formatFinding(f) {
  return `WARN backlog-header line=${f.line} grade=${f.grade} marker=${f.marker.replace(/\s+/g, "_")} header="${f.header}"`;
}

function readInput(pathArg) {
  if (pathArg === "-") return readFileSync(0, "utf8");
  return readFileSync(pathArg ?? DEFAULT_BACKLOG, "utf8");
}

function main(argv) {
  const pathArg = argv[2];
  const text = readInput(pathArg);
  const findings = lintText(text);
  for (const f of findings) {
    process.stdout.write(`${formatFinding(f)}\n`);
  }
  process.stdout.write(
    findings.length
      ? `backlog-lint: ${findings.length} stale header(s) — WARN only, review BACKLOG.md\n`
      : "backlog-lint: clean\n",
  );
  return 0; // WARN-only: never fails the build.
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  let code;
  try {
    code = main(process.argv);
  } catch (err) {
    process.stderr.write(`backlog-lint: internal error — ${err?.message ?? err}\n`);
    code = 0; // still WARN-only; a broken lint should not block anything.
  }
  process.exit(code);
}
