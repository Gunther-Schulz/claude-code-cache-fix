#!/usr/bin/env node
// tools/backlog-neighbours.mjs — a closing commit lists the open entries it
// may have invalidated.
//
// WHY THIS EXISTS. Closing an entry can invalidate a DIFFERENT open entry,
// and nothing re-read the neighbours when work shipped. Measured 2026-08-10
// by the retirement pass, twice, from real history: the state-key entry
// shipped KEY-FLIP, which made a second entry's cited verdict count ("six")
// wrong — the real number is seven, and the second entry was never touched;
// and `/health` gaining an `extensions[]` field from unrelated work dissolved
// half of the gates-blindness entry's premise. Both survived as plausible,
// decision-complete text until a lane probed them directly — the entry reads
// perfectly and is quietly about a world that moved.
//
// WHAT THIS IS: a REPORT, never a gate. Most file overlap between entries is
// ordinary co-tenancy, not invalidation (`docs/dev-loop.md` alone is named by
// sixteen entries) — a guard that fires on non-defects trains the override
// reflex that kills it. Given a commit, this prints every still-OPEN entry
// (grade READY, PARKED, or OPEN) that names a file the commit touched, with a
// blank disposition slot for a human to fill: still-valid / premise-corrected
// / now-unnecessary.
//
// The join reuses `censusEntries` from `tools/backlog-lint.mjs` — the same
// `## Open` bullet parser and the same backtick file-token extraction the
// population census already emits per entry (its `.files` field), rather
// than a third parser for the same file.
//
// THREE ANSWERS, NOT TWO (per docs/dev-loop.md). This never fails on a
// well-formed run — findings or their absence are both reported and the exit
// code stays 0. Only a genuinely unresolvable input (a commit-ish git cannot
// resolve, or a BACKLOG.md with no '## Open' section at all) is
// COULD-NOT-VERIFY, printed with which check failed, exit 2. A run whose
// commit touches no tracked file, or touches files no open entry cites, still
// prints "0 candidates" with its reason — an empty result and a broken run
// must not look alike.
//
// CLI:
//   node tools/backlog-neighbours.mjs             # against HEAD, BACKLOG.md
//   node tools/backlog-neighbours.mjs <commit-ish> [<backlog-path>]

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { censusEntries } from "./backlog-lint.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
export const DEFAULT_BACKLOG = join(REPO_ROOT, "BACKLOG.md");

// The grade set this lane treats as "still open" — deliberately narrower
// than backlog-lint's full census vocabulary: READY, PARKED, OPEN only, per
// the settled design. OPEN/HOT and bare HOT are excluded on purpose (not
// this lane's scope); RETIRED/DONE/RESOLVED/etc. are already excluded by
// `censusGrade` not recognising them as one of these three tokens.
export const OPEN_GRADES = new Set(["READY", "PARKED", "OPEN"]);

// ---------------------------------------------------------------------------
// I/O boundary: git and the filesystem. Both return a uniform
// { ok, ...payload } / { ok: false, proof } shape so the pure core below
// never has to know how a failure was produced.
// ---------------------------------------------------------------------------

// Files a commit-ish touched, in this repo. `ok: false` carries git's own
// stderr/stdout as proof — an unresolvable commit-ish (typo, wrong repo,
// never fetched) is the COULD-NOT-VERIFY case this returns.
export function resolveTouchedFiles(commitish, cwd = REPO_ROOT) {
  try {
    const out = execFileSync(
      "git",
      ["diff-tree", "--no-commit-id", "--name-only", "-r", commitish, "--"],
      { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return { ok: true, files: out.split("\n").filter(Boolean) };
  } catch (e) {
    const text = `${e.stderr ?? ""}${e.stdout ?? ""}`.trim();
    return { ok: false, proof: text || `exit ${e.status ?? "?"}, no output` };
  }
}

// The still-open entries of a BACKLOG.md's '## Open' section, via
// `censusEntries` (already the shared parser: `tools/backlog-order.mjs`'s
// `splitOpen` and `backlog-lint.mjs`'s census agree on this boundary).
// `censusEntries` returns [] both when the section is genuinely empty and
// when the section is ABSENT — those are different failure classes for this
// lane (an absent section cannot be verified at all; an empty one is a
// legitimate zero-entry report), so the absence is detected separately here
// rather than folding both into a bare [].
export function resolveOpenEntries(backlogPath) {
  let text;
  try {
    text = readFileSync(backlogPath, "utf8");
  } catch (e) {
    return { ok: false, proof: `cannot read ${backlogPath}: ${e.message}` };
  }
  if (!/^## Open\b/m.test(text)) {
    return { ok: false, proof: `no '## Open' section in ${backlogPath}` };
  }
  return { ok: true, entries: censusEntries(text) };
}

// ---------------------------------------------------------------------------
// Pure core: no I/O, so bites exercise it directly without git or a fixture
// file on disk.
// ---------------------------------------------------------------------------

// Every still-open (READY/PARKED/OPEN) entry naming at least one file the
// commit touched. `entries` is `censusEntries`'s row shape (line, grade,
// files, headline, ...); `touched` is a plain array of repo-relative paths.
export function findCandidates(touched, entries) {
  const touchedSet = new Set(touched);
  const candidates = [];
  for (const e of entries) {
    if (!OPEN_GRADES.has(e.grade)) continue;
    const shared = e.files.filter((f) => touchedSet.has(f));
    if (shared.length) candidates.push({ line: e.line, headline: e.headline, files: shared });
  }
  return candidates;
}

function formatCandidate(c) {
  return (
    `CANDIDATE line=${c.line} shared=${c.files.join(",")} ` +
    `disposition=<still-valid|premise-corrected|now-unnecessary> "${c.headline}"`
  );
}

// The full report for one commit-ish, given the already-resolved touched
// files and open entries (both in the { ok, ... } / { ok: false, proof }
// shape above). Pure — takes no commit-ish or path itself, so a bite can
// pass a canned failure for either half without git or the filesystem.
export function buildReport(commitish, touchedResult, entriesResult) {
  if (!touchedResult.ok) {
    return {
      code: 2,
      lines: [`COULD-NOT-VERIFY commit-resolve commit=${commitish} -- ${touchedResult.proof}`],
    };
  }
  if (!entriesResult.ok) {
    return { code: 2, lines: [`COULD-NOT-VERIFY open-section-parse -- ${entriesResult.proof}`] };
  }

  const { files } = touchedResult;
  if (!files.length) {
    return {
      code: 0,
      lines: [`0 candidates -- commit ${commitish} touched no tracked file`],
    };
  }

  const candidates = findCandidates(files, entriesResult.entries);
  if (!candidates.length) {
    return {
      code: 0,
      lines: [
        `0 candidates -- no open entry (READY/PARKED/OPEN) names a file commit ${commitish} touched`,
      ],
    };
  }

  return {
    code: 0,
    lines: [
      ...candidates.map(formatCandidate),
      `${candidates.length} candidate(s) for commit ${commitish}`,
    ],
  };
}

// ---------------------------------------------------------------------------
// CLI glue
// ---------------------------------------------------------------------------

function main(argv) {
  const args = argv.slice(2);
  const commitish = args[0] ?? "HEAD";
  const backlogPath = args[1] ?? DEFAULT_BACKLOG;

  const touchedResult = resolveTouchedFiles(commitish);
  const entriesResult = resolveOpenEntries(backlogPath);
  const { code, lines } = buildReport(commitish, touchedResult, entriesResult);
  for (const l of lines) process.stdout.write(`${l}\n`);
  return code;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(main(process.argv));
}
