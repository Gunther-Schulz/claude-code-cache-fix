#!/usr/bin/env node
// lane-sweep — make the lane enumeration REPEATABLE.
//
// WHY. Done by hand 2026-08-06 (BACKLOG.md, "`tools/lane-sweep.mjs`: make the
// lane enumeration repeatable, because the hand pass found three gaps and
// will not survive this session"): walk every event class and check it has a
// trigger, a line, a terminal state, and a durable disposition. It found the
// sweep runbook's missing doorbell, two upstream triggers, and a whole
// unrouted event class (the proxy's own runtime detector logs). The
// reasoning that produced it does not survive into the next session
// (docs/dev-loop.md: "the manual pass finds the defect once, the mechanism
// finds it forever") — this is that mechanism.
//
// THREE CROSS-CHECKS, each a set difference over things that exist on disk.
// Every one is read-only; this tool never edits BACKLOG.md, dev-loop.md, or
// any runbook.
//
//   (1) PRODUCERS vs LANES. Every path this repo writes under claudeHome()
//       (reused from tools/xdg-migrate.mjs's own TABLE — this repo's own
//       already-hardened enumeration, three correction rounds, 16 -> 24) plus
//       every shipped `.timer.template`. Each must have EITHER a named
//       reader (some OTHER tools/*.mjs mentions it) OR a lane (a runbook or
//       dev-loop.md names it). Neither -> UNROUTED.
//   (2) INDEX vs FILES, both directions. Every row in dev-loop.md's
//       "Which line are you on" table must resolve to a real file under
//       docs/runbooks/; every file under docs/runbooks/ must appear in that
//       table. Catches the orphan and the dead pointer.
//   (3) MARKERS. Every `[GRADUATE -> ...]` either names a BACKLOG.md item
//       whose text is (fuzzily) present and not yet DONE, or says "not yet
//       booked" in its surrounding prose. A marker whose best BACKLOG match
//       is a DONE entry is STALE — the runbook step graduated and nobody
//       removed the marker (docs/dev-loop.md: "the marker is removed by the
//       commit that mechanizes it, never by deciding the step is fine as it
//       is").
//
// NOT IN SCOPE, and it is the judgment half: whether the EVENT-CLASS list
// itself is complete. No check knows what events the world produces — that
// stays a prose ritual under dev-loop's existing stock-sweep cadence.
//
// The one open decision this entry surfaced rather than filled: STATE-ONLY
// writers (canon files, watermarks) are not finding producers and would
// otherwise all report UNROUTED. This build does NOT invent a `writesState`
// exemption — the entry's own recommendation calls for a declaration the
// checker reads as DATA, which is a change to each extension's own export,
// outside this member's write boundary (tools/lane-sweep.mjs and its test
// only). Any producer this run reports UNROUTED that is genuinely
// state-only rather than findings-bearing is exactly that open question,
// surfacing here rather than being silently filled.
//
// Usage: node tools/lane-sweep.mjs [--json]
// Exit 0 when all three checks are clean, 1 when any finding exists.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { TABLE, OWNERS } from "./xdg-migrate.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_DIR = join(REPO, "docs");
const RUNBOOKS_DIR = join(DOCS_DIR, "runbooks");
const TOOLS_DIR = join(REPO, "tools");
const TEMPLATES_DIR = join(REPO, "templates");
const DEV_LOOP = join(DOCS_DIR, "dev-loop.md");
const BACKLOG = join(REPO, "BACKLOG.md");
const SELF = basename(fileURLToPath(import.meta.url));

/**
 * A whole-word-ish mention test. A plain substring test over-fires on this
 * repo's own short producer names ("ca", "state" are real TABLE rows) —
 * almost every file mentions "state" in prose. Word-boundary regex still
 * over-fires on those two specifically (real English words), so callers
 * additionally gate on length/specificity; this function only keeps a
 * mention from being credited when the term is embedded inside a longer
 * identifier (`"cache-fix-state"` matching inside some other token).
 */
export function mentions(text, term) {
  if (!term) return false;
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w-])${esc}(?![\\w-])`).test(text);
}

/** Specific enough to credit as a mention on its own (not "ca" / "state"). */
export function specific(name) {
  return typeof name === "string" && (name.length >= 6 || name.includes("."));
}

function readTexts(paths) {
  return paths.map((p) => ({ path: p, text: readFileSync(p, "utf8") }));
}

// --- (1) PRODUCERS vs LANES ------------------------------------------------

function listReaderFiles() {
  return readdirSync(TOOLS_DIR)
    .filter((f) => f.endsWith(".mjs"))
    // xdg-migrate.mjs names EVERY producer by construction (it is the
    // mover); crediting it as a "reader" would make every producer appear
    // routed regardless of whether anything actually consumes it. This
    // file names itself trivially in its own header comment.
    .filter((f) => f !== SELF && f !== "xdg-migrate.mjs")
    .map((f) => join(TOOLS_DIR, f));
}

function listLaneFiles() {
  return [
    ...readdirSync(RUNBOOKS_DIR).filter((f) => f.endsWith(".md")).map((f) => join(RUNBOOKS_DIR, f)),
    DEV_LOOP,
  ];
}

function checkProducers() {
  const readerTexts = readTexts(listReaderFiles());
  const laneTexts = readTexts(listLaneFiles());

  const ownerModuleBase = new Map(); // producer id -> owning module's basename
  for (const [name, spec] of OWNERS) {
    if (spec) ownerModuleBase.set(name, basename(spec));
  }

  const producers = [];
  for (const [, legacyName, newName] of TABLE) {
    producers.push({ id: newName, legacyName, kind: "writer" });
  }
  const timerFiles = readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".timer.template"));
  for (const f of timerFiles) {
    producers.push({ id: f.replace(/\.template$/, ""), legacyName: null, kind: "timer" });
  }

  const rows = producers.map((p) => {
    const moduleBase = ownerModuleBase.get(p.id);
    const terms = [
      p.legacyName,
      specific(p.id) ? p.id : null,
      moduleBase,
    ].filter(Boolean);
    const hasReader = readerTexts.some(({ text }) => terms.some((t) => mentions(text, t)));
    const hasLane = laneTexts.some(({ text }) => terms.some((t) => mentions(text, t)));
    return { ...p, hasReader, hasLane, unrouted: !hasReader && !hasLane };
  });

  return { rows, examined: rows.length };
}

// --- (2) INDEX vs FILES -----------------------------------------------------

export function parseIndexTable(devLoopText) {
  const marker = "## Which line are you on";
  const start = devLoopText.indexOf(marker);
  if (start < 0) return null;
  const nextHeading = devLoopText.indexOf("\n## ", start + marker.length);
  const section = devLoopText.slice(start, nextHeading < 0 ? undefined : nextHeading);
  const rows = [];
  for (const line of section.split("\n")) {
    if (!line.startsWith("|")) continue;
    if (/^\|\s*-+\s*\|/.test(line)) continue; // the header separator row
    const cells = line.split("|").map((c) => c.trim()).filter((c) => c.length);
    if (cells.length < 2 || cells[0] === "the event") continue;
    const m = cells[1].match(/`([\w./-]+\.md)`/);
    if (m) rows.push({ raw: cells[0], path: m[1] });
  }
  return rows;
}

function checkIndex() {
  const devLoopText = readFileSync(DEV_LOOP, "utf8");
  const indexRows = parseIndexTable(devLoopText);
  if (indexRows === null) {
    return {
      structural: "docs/dev-loop.md's \"Which line are you on\" section could not be found",
      examined: 0, fileCount: 0, deadPointers: [], orphans: [],
    };
  }
  const files = readdirSync(RUNBOOKS_DIR).filter((f) => f.endsWith(".md"));
  const basenames = (p) => p.replace(/^runbooks\//, "");
  const indexBasenames = new Set(indexRows.map((r) => basenames(r.path)));
  const deadPointers = indexRows.filter((r) => !files.includes(basenames(r.path)));
  const orphans = files.filter((f) => !indexBasenames.has(f));
  return { examined: indexRows.length, fileCount: files.length, deadPointers, orphans };
}

// --- (3) MARKERS -------------------------------------------------------------

function extractMarkers() {
  const markers = [];
  for (const f of listLaneFiles()) {
    const text = readFileSync(f, "utf8");
    const re = /\[GRADUATE\s*->\s*([\s\S]*?)\]/g;
    let m;
    while ((m = re.exec(text))) {
      const body = m[1].replace(/\s+/g, " ").trim();
      if (body.startsWith("<")) continue; // dev-loop.md's own spec placeholder, e.g. "<where it belongs>"
      const windowEnd = Math.min(text.length, m.index + m[0].length + 400);
      markers.push({ file: f, body, window: text.slice(m.index, windowEnd) });
    }
  }
  return markers;
}

/** Top-level BACKLOG bullets — same shape this repo's own backlog-*.mjs tools parse against. */
export function splitBacklogBullets(backlogText) {
  const lines = backlogText.split("\n");
  const bullets = [];
  let cur = null;
  for (const line of lines) {
    if (/^- \*\*/.test(line)) {
      if (cur) bullets.push(cur);
      const gradeMatch = line.match(/^- \*\*([A-Z][A-Z -]*[A-Z])/);
      cur = { grade: gradeMatch ? gradeMatch[1].trim() : null, text: line };
    } else if (cur) {
      cur.text += `\n${line}`;
    }
  }
  if (cur) bullets.push(cur);
  return bullets;
}

export function tokenize(s) {
  return s.toLowerCase().match(/[a-z0-9]{4,}/g) || [];
}

/** Token-overlap fuzzy match — prose citing prose, not a literal comparison. */
export function bestBacklogMatch(body, bullets) {
  const bodyTokens = new Set(tokenize(body));
  if (bodyTokens.size === 0) return null;
  let best = null;
  for (const bullet of bullets) {
    const bulletTokens = new Set(tokenize(bullet.text));
    if (bulletTokens.size === 0) continue;
    let hit = 0;
    for (const t of bodyTokens) if (bulletTokens.has(t)) hit++;
    const overlap = hit / bodyTokens.size;
    if (!best || overlap > best.overlap) best = { overlap, bullet };
  }
  return best;
}

// HIGH, deliberately. Measured against this repo's own real markers
// (2026-08-10): a plain token-overlap score picks the WRONG bullet at 0.75 —
// "harvest --pin verifies its own pin; BACKLOG ready" scores 0.71 against an
// unrelated READY entry ("harvest --pin cannot freeze a LATE event...", which
// merely shares common words: harvest, pin, own, its, ready) while the
// entry that is ACTUALLY about pin verification (`DONE 2026-08-06 (c003759)
// — harvest --pin now verifies the pin reproduces...`) scores only 0.43,
// because its prose is more specific and shares fewer incidental words.
// A checker that asserts a specific match at that confidence is CONFIDENTLY
// WRONG, which is worse than an honest "unresolved" — so the threshold sits
// high enough that only a near-exact match (this repo's own markers that DO
// match score 0.89-1.0) is credited as "found"; anything below is reported
// unresolved rather than guessed.
const MATCH_THRESHOLD = 0.85;

function checkMarkers() {
  const backlogBullets = splitBacklogBullets(readFileSync(BACKLOG, "utf8"));
  const rows = extractMarkers().map((mk) => {
    if (/not yet booked/i.test(mk.window)) {
      return { ...mk, classification: "not-yet-booked", stale: false };
    }
    const match = bestBacklogMatch(mk.body, backlogBullets);
    if (!match || match.overlap < MATCH_THRESHOLD) {
      return { ...mk, classification: "unresolved", stale: true, overlap: match?.overlap ?? 0 };
    }
    if (match.bullet.grade === "DONE") {
      return { ...mk, classification: "stale-shipped", stale: true, matchedGrade: match.bullet.grade, overlap: match.overlap };
    }
    return { ...mk, classification: "found", stale: false, matchedGrade: match.bullet.grade, overlap: match.overlap };
  });
  return { rows, examined: rows.length };
}

// --- main --------------------------------------------------------------------

function rel(p) {
  return p.startsWith(REPO) ? p.slice(REPO.length + 1) : p;
}

function main() {
  const producers = checkProducers();
  const index = checkIndex();
  const markers = checkMarkers();

  const unrouted = producers.rows.filter((r) => r.unrouted);
  const staleMarkers = markers.rows.filter((r) => r.stale);
  const findingCount = unrouted.length + index.deadPointers.length + index.orphans.length + staleMarkers.length;

  if (process.argv.includes("--json")) {
    process.stdout.write(JSON.stringify({ producers, index, markers, findingCount }, null, 2) + "\n");
    process.exitCode = findingCount > 0 ? 1 : 0;
    return;
  }

  process.stdout.write(
    `lane-sweep — examined ${producers.examined} producer(s), `
      + `${index.examined} index row(s) against ${index.fileCount} runbook file(s), `
      + `${markers.examined} GRADUATE marker(s)\n\n`,
  );

  process.stdout.write(`PRODUCERS vs LANES: ${unrouted.length} UNROUTED\n`);
  for (const r of unrouted) process.stdout.write(`  UNROUTED       ${r.id} (${r.kind})\n`);

  process.stdout.write(`\nINDEX vs FILES: ${index.deadPointers.length} dead pointer(s), ${index.orphans.length} orphan(s)\n`);
  for (const r of index.deadPointers) process.stdout.write(`  DEAD-POINTER   ${r.raw} -> runbooks/${r.path.replace(/^runbooks\//, "")}\n`);
  for (const f of index.orphans) process.stdout.write(`  ORPHAN         docs/runbooks/${f}\n`);

  process.stdout.write(`\nMARKERS: ${staleMarkers.length} stale (of ${markers.examined})\n`);
  for (const r of staleMarkers) {
    process.stdout.write(
      `  ${r.classification.toUpperCase().padEnd(14)} ${rel(r.file)}: "${r.body.slice(0, 70)}${r.body.length > 70 ? "…" : ""}"\n`,
    );
  }

  process.stdout.write(`\n${findingCount} finding(s) total.\n`);
  process.exitCode = findingCount > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\//, ""))) {
  main();
}
