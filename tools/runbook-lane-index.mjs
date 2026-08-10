#!/usr/bin/env node
// runbook-lane-index — the index check for the runbook lane system
// (BACKLOG.md, "an index check for the runbook lane system, and it must be
// built BEFORE the two reds above").
//
// This is the DOMAIN-FREE half of that entry's design: two cross-checks
// over the event -> runbook index that do not depend on any fact private to
// this fork (no extension list, no XDG paths, no proxy internals) —
//
//   CHECK 2, INDEX vs FILES, both directions: every row of docs/dev-loop.md's
//   "Which line are you on" table resolves to a runbook file that exists on
//   disk, AND every docs/runbooks/*.md file appears as a row in that table.
//   Catches the orphan and the dead pointer.
//
//   CHECK 2b, the same cross-check applied to CLAUDE.local.md's OWN inline
//   runbook list (the "Today: `bust-appears.md` (...), ..." sentence under
//   "Where things live" -> "Runbooks"), which is a SECOND index of the same
//   files and has gone stale before (3 of 5 listed) without anything
//   noticing. Read-only: this tool never writes CLAUDE.local.md.
//
//   CHECK 3, MARKERS: every `[GRADUATE -> ...]` marker in docs/dev-loop.md
//   and docs/runbooks/*.md either (a) claims "BACKLOG ready" and a
//   distinctive phrase from its own text is findable in BACKLOG.md's raw
//   text (imported matcher, not re-derived — see
//   tools/named-unbooked-scan.mjs), or (b) says "not yet booked" and names a
//   trigger. A marker matching neither shape, or claiming "BACKLOG ready"
//   with nothing in BACKLOG.md to show for it, is STALE.
//
// NOT built here, and deliberately: a fourth condition ("every index row
// names a detection channel") is named in the same backlog entry but its
// red-first instance ties to a DIFFERENT, unassigned backlog entry (the
// required-reading injection gap, over `.claude/required-reading.json`,
// outside this tool's write boundary) and no schema for "detection channel"
// exists yet in the table. Building a predicate for it here would be
// designing at the executing tier rather than the brief's — see the
// dispatch report for this member. Also not built here: CHECK 1 (PRODUCERS
// vs LANES, matching extensions to their event class), which is this fork's
// own private tooling and belongs with `tools/lane-sweep.mjs` (a separate,
// unbuilt backlog entry) rather than with the domain-free checks in this
// file.
//
// This is a GATE, not a report (unlike tools/named-unbooked-scan.mjs):
// findings are failures, because an orphaned index row or a stale marker is
// exactly the kind of silent drift dev-loop.md's own closing gate exists to
// catch. Exit 0 = clean. Exit 1 = at least one finding. Exit 2 = the tool's
// own operational failure (unreadable file, bad args).
//
// CLI:
//   node tools/runbook-lane-index.mjs [--repo <path>] [--json]

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { distinctiveBigrams, findMatchingPhrase } from "./named-unbooked-scan.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = resolve(HERE, "..");

// ==========================================================================
// Parsing
// ==========================================================================

// Parse the "Which line are you on" table out of docs/dev-loop.md. Returns
// an array of { event, runbook } where `runbook` is the bare filename
// (e.g. "bust-appears.md") a row's "the line" cell points at.
export function parseDevLoopIndex(text) {
  const headingIdx = text.indexOf("## Which line are you on");
  if (headingIdx === -1) {
    throw new Error('docs/dev-loop.md: "## Which line are you on" heading not found');
  }
  const afterHeading = text.slice(headingIdx);
  const rows = [];
  const lineRe = /^\|(.+)\|\s*$/gm;
  let m;
  let sawHeaderSeparator = false;
  while ((m = lineRe.exec(afterHeading))) {
    const cells = m[1].split("|").map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) {
      sawHeaderSeparator = true;
      continue;
    }
    if (!sawHeaderSeparator) continue; // still the header row
    if (cells.length < 2) continue;
    const [eventCell, lineCell] = cells;
    const runbookMatch = lineCell.match(/runbooks\/([\w-]+\.md)/);
    if (!runbookMatch) continue; // a row whose "line" cell is not a runbook pointer
    rows.push({ event: eventCell, runbook: runbookMatch[1] });
    // The table ends at the first blank-line-terminated block; stop once we
    // hit a line that is not a table row after we've started collecting.
  }
  if (rows.length === 0) {
    throw new Error('docs/dev-loop.md: no runbook rows parsed out of the index table');
  }
  return rows;
}

// List the runbook files actually on disk.
export function listRunbookFiles(runbooksDir) {
  return readdirSync(runbooksDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name)
    .sort();
}

// Parse CLAUDE.local.md's inline "Today: `a.md` (...), `b.md` (...)"
// runbook list, if the file exists and carries that sentence. Returns null
// if the file is absent (never present in a fresh clone by design) or the
// sentence isn't found — both are COULD-NOT-VERIFY, not a finding.
export function parseClaudeLocalRunbookList(text) {
  const idx = text.indexOf("Today:");
  if (idx === -1) return null;
  // The sentence is a comma-joined list of `file.md` (description) items,
  // each item's own close-paren followed by a comma except the LAST, which
  // is followed by a period — that period is the sentence boundary. Cut
  // there rather than at a fixed character window, or the match bleeds into
  // the next bulleted item (measured: an unbounded window picked up
  // unrelated `.md` citations from the following "Fork-only files" bullet).
  const rest = text.slice(idx + "Today:".length);
  const boundary = rest.match(/\)\./);
  const sentence = boundary ? rest.slice(0, boundary.index + 2) : rest.slice(0, 600);
  const names = [...sentence.matchAll(/`([\w-]+\.md)`/g)].map((m) => m[1]);
  return names.length ? names : null;
}

// Extract every `[GRADUATE -> ...]` marker from a text, as raw strings
// (without the surrounding brackets), plus its 1-based line number.
export function extractGraduateMarkers(text, sourceLabel) {
  const markers = [];
  const lines = text.split("\n");
  // Markers can wrap across lines (the backtick-fenced form used in the
  // runbooks); join the whole text and match on bracket balance instead of
  // per-line, then locate each match's starting line by offset.
  const re = /\[GRADUATE\s*->\s*([^\]]*)\]/g;
  let m;
  while ((m = re.exec(text))) {
    const before = text.slice(0, m.index);
    const line = before.split("\n").length;
    markers.push({ source: sourceLabel, line, body: m[1].trim() });
  }
  void lines;
  return markers;
}

// ==========================================================================
// Checks
// ==========================================================================

// CHECK 2 — INDEX vs FILES, both directions.
export function checkIndexVsFiles(indexRows, runbookFiles) {
  const indexed = new Set(indexRows.map((r) => r.runbook));
  const onDisk = new Set(runbookFiles);
  const deadPointers = indexRows.filter((r) => !onDisk.has(r.runbook));
  const orphans = runbookFiles.filter((f) => !indexed.has(f));
  return { deadPointers, orphans };
}

// CHECK 2b — CLAUDE.local.md's inline list vs files on disk. `listed` may be
// null (file absent or sentence not found); the caller treats that as
// could-not-verify, not a finding.
export function checkClaudeLocalList(listed, runbookFiles) {
  if (listed === null) return { verifiable: false, missing: [], stale: [] };
  const listedSet = new Set(listed);
  const onDisk = new Set(runbookFiles);
  const missing = runbookFiles.filter((f) => !listedSet.has(f)); // on disk, not in the sentence
  const stale = listed.filter((f) => !onDisk.has(f)); // in the sentence, not on disk
  return { verifiable: true, missing, stale };
}

// CHECK 3 — MARKERS. `backlogText` is BACKLOG.md's raw content.
export function checkMarkers(markers, backlogText) {
  const results = [];
  for (const marker of markers) {
    const body = marker.body;
    const claimsReady = /BACKLOG ready/i.test(body);
    const claimsNotYetBooked = /not yet booked/i.test(body);
    if (claimsReady) {
      const phrase = findMatchingPhrase(body, backlogText);
      results.push({
        ...marker,
        classification: phrase ? "ready-confirmed" : "STALE-ready-unmatched",
        matchedPhrase: phrase,
      });
    } else if (claimsNotYetBooked) {
      const namesTrigger = /trigger/i.test(body) || /:/.test(body);
      results.push({
        ...marker,
        classification: namesTrigger ? "not-yet-booked-with-trigger" : "STALE-not-yet-booked-no-trigger",
      });
    } else {
      results.push({ ...marker, classification: "UNCLASSIFIED-no-disposition" });
    }
  }
  return results;
}

// ==========================================================================
// run()
// ==========================================================================

export function run(argv, { out = (s) => process.stdout.write(s), err = (s) => process.stderr.write(s) } = {}) {
  let repo = DEFAULT_REPO;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo") repo = resolve(argv[++i]);
    else if (a === "--json") json = true;
    else {
      err(`runbook-lane-index: unrecognized argument '${a}'\n`);
      return 2;
    }
  }

  const devLoopPath = join(repo, "docs/dev-loop.md");
  const runbooksDir = join(repo, "docs/runbooks");
  const claudeLocalPath = join(repo, "CLAUDE.local.md");
  const backlogPath = join(repo, "BACKLOG.md");

  let devLoopText, backlogText;
  try {
    devLoopText = readFileSync(devLoopPath, "utf8");
    backlogText = readFileSync(backlogPath, "utf8");
  } catch (e) {
    err(`runbook-lane-index: cannot read required file — ${e.message}\n`);
    return 2;
  }

  let indexRows, runbookFiles;
  try {
    indexRows = parseDevLoopIndex(devLoopText);
    runbookFiles = listRunbookFiles(runbooksDir);
  } catch (e) {
    err(`runbook-lane-index: ${e.message}\n`);
    return 2;
  }

  const idxCheck = checkIndexVsFiles(indexRows, runbookFiles);

  let claudeLocalCheck = { verifiable: false, missing: [], stale: [] };
  if (existsSync(claudeLocalPath)) {
    const claudeLocalText = readFileSync(claudeLocalPath, "utf8");
    const listed = parseClaudeLocalRunbookList(claudeLocalText);
    claudeLocalCheck = checkClaudeLocalList(listed, runbookFiles);
  }

  const markers = [
    ...extractGraduateMarkers(devLoopText, "docs/dev-loop.md"),
    ...runbookFiles.flatMap((f) => {
      const p = join(runbooksDir, f);
      const t = readFileSync(p, "utf8");
      return extractGraduateMarkers(t, `docs/runbooks/${f}`);
    }),
  ].filter((m) => !/<where it belongs>/i.test(m.body)); // the explanatory placeholder, not a real marker
  const markerResults = checkMarkers(markers, backlogText);
  const staleMarkers = markerResults.filter((r) => r.classification.startsWith("STALE") || r.classification === "UNCLASSIFIED-no-disposition");

  const findings = [];
  for (const r of idxCheck.deadPointers) {
    findings.push(`DEAD POINTER: index row "${r.event.slice(0, 60)}..." points at runbooks/${r.runbook}, which does not exist on disk`);
  }
  for (const f of idxCheck.orphans) {
    findings.push(`ORPHAN FILE: docs/runbooks/${f} exists but no index row in docs/dev-loop.md points at it`);
  }
  if (claudeLocalCheck.verifiable) {
    for (const f of claudeLocalCheck.missing) {
      findings.push(`CLAUDE.local.md STALE LIST: docs/runbooks/${f} exists but is not named in CLAUDE.local.md's inline runbook list`);
    }
    for (const f of claudeLocalCheck.stale) {
      findings.push(`CLAUDE.local.md STALE LIST: '${f}' is named in CLAUDE.local.md's inline runbook list but does not exist on disk`);
    }
  }
  for (const m of staleMarkers) {
    findings.push(`${m.classification} at ${m.source}:${m.line} — [GRADUATE -> ${m.body}]`);
  }

  const summary =
    `runbook-lane-index: examined ${indexRows.length} index row(s), ${runbookFiles.length} runbook file(s) on disk, ` +
    `CLAUDE.local.md list ${claudeLocalCheck.verifiable ? "verifiable" : "COULD-NOT-VERIFY (absent or no inline list)"}, ` +
    `${markers.length} GRADUATE marker(s) — ${findings.length} finding(s)\n`;

  if (json) {
    out(
      JSON.stringify(
        { indexRows: indexRows.length, runbookFiles, idxCheck, claudeLocalCheck, markerResults, findings },
        null,
        2,
      ) + "\n",
    );
  } else {
    out(summary);
    for (const f of findings) out(`  - ${f}\n`);
  }

  return findings.length === 0 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  let code;
  try {
    code = run(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`runbook-lane-index: internal error — ${e?.message ?? e}\n`);
    code = 2;
  }
  process.exit(code);
}
