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
// SECOND JOIN, one grain finer (booked 2026-08-10: "backlog-neighbours joins
// on FILES, so a premise refuted inside ANOTHER ENTRY is invisible to it").
// `cf0592d` recorded a rotation measurement inside the `capturePairResult`
// entry that refuted the retention rule of a DIFFERENT open entry (the
// bounded-`--pin` one) — both entries live only in `BACKLOG.md`, so the file
// join returns a populated but wrong-population report (every entry that
// happens to CITE `BACKLOG.md` by name) and the one that actually shares the
// moved premise is absent. When a commit changes `BACKLOG.md` itself, this
// second join diffs which ENTRIES its body changed, collects their
// backtick-quoted camelCase IDENTIFIER tokens (`conversationOf`, not
// `tools/replay.mjs` or `BACKLOG.md`), and lists every other still-open entry
// sharing one — same report shape, same blank disposition slot, still a
// REPORT, never a gate. The file join is untouched except for a `via=file`
// marker added to its CANDIDATE lines so a reader can tell the two joins'
// rows apart; `via=identifier` marks the new join's own rows.
//
// NOT built on `tools/backlog-order.mjs`'s `splitOpen`, despite it already
// doing exactly the section-slicing this join needs: that file runs
// unguarded `process.argv` parsing at IMPORT time and calls `process.exit(2)`
// on any argument it does not recognise (verified at the desk, reading the
// file — `backlog-order.mjs:41-58`, `KNOWN = new Set(["--check", "--file"])`
// with no `import.meta.url` guard around it). Importing it here would kill
// this tool's own CLI the moment it ran with a commit-ish argv, since that
// argv is `process.argv` too. `openSectionSlice` below duplicates the small
// (~10-line) `## Open` boundary lookup instead — the same boundary
// `backlog-lint.mjs`'s private `censusOpenSection` already computes and that
// its own comment says must never disagree with `backlog-order.mjs`'s
// version; a third copy of just the boundary, not a third bullet/grade/file
// parser, since `censusEntries` still supplies all of that.
//
// CLI:
//   node tools/backlog-neighbours.mjs             # against HEAD, BACKLOG.md
//   node tools/backlog-neighbours.mjs <commit-ish> [<backlog-path>]

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { censusEntries, splitEntries } from "./backlog-lint.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
export const DEFAULT_BACKLOG = join(REPO_ROOT, "BACKLOG.md");

// The grade set this lane treats as "still open" — deliberately narrower
// than backlog-lint's full census vocabulary: READY, PARKED, OPEN only, per
// the settled design. OPEN/HOT and bare HOT are excluded on purpose (not
// this lane's scope); RETIRED/DONE/RESOLVED/etc. are already excluded by
// `censusGrade` not recognising them as one of these three tokens.
export const OPEN_GRADES = new Set(["READY", "PARKED", "OPEN"]);

// A citation is a PATH plus, very often, where in it to look — `foo.mjs:12`,
// `foo.mjs:577-581`. git names paths and nothing else, so a whole-token
// comparison silently answers "no such file" for every entry that cited a
// line, which is the direction that under-reports: the tool goes quiet
// exactly where the entry was most specific about what it depends on.
// Measured 2026-08-10 at the desk, on the class's own second instance: commit
// 2e088df touches `proxy/server.mjs`, the gates-blindness entry cites
// `proxy/server.mjs:577-581`, and the join returned 0 candidates. This is the
// `path:line` shape docs/dev-loop.md already records under "A liveness or
// resolution check asks 'does this resolve', never 'does this resolve AS THE
// TYPE I expected'", where a trailing citation made three live files read as
// dead. Only a trailing line or line-range suffix is stripped, so a real path
// containing a colon is left alone.
export const citedPath = (tok) => tok.replace(/:\d+(?:-\d+)?$/, "");

// ---------------------------------------------------------------------------
// I/O boundary: git and the filesystem. Both return a uniform
// { ok, ...payload } / { ok: false, proof } shape so the pure core below
// never has to know how a failure was produced.
// ---------------------------------------------------------------------------

// Files a commit-ish touched, in this repo. `ok: false` carries git's own
// stderr/stdout as proof — an unresolvable commit-ish (typo, wrong repo,
// never fetched) is the COULD-NOT-VERIFY case this returns.
// Node's execFileSync defaults maxBuffer to 1 MB and throws ENOBUFS past it,
// with the TRUNCATED PAYLOAD sitting in `e.stdout`. Both halves bit here on
// 2026-08-11: `BACKLOG.md` crossed 1,048,576 bytes (1,036,750 -> 1,051,748 in
// one ordinary commit), every `git show <ref>:BACKLOG.md` started throwing,
// and the catch below rendered the first megabyte of the file as the
// COULD-NOT-VERIFY *reason* — a checker reporting "could not verify -- # claude
// -code-cache-fix (fork) ...". The tool was correct on every commit before
// that one and wrong on every commit after, with nothing in between to notice.
// So: a cap large enough that the corpus, not the default, decides; and a
// proof that names the failure MODE rather than echoing what it could not read.
const GIT_MAX_BUFFER = 256 * 1024 * 1024;

export function gitProofOf(e) {
  if (e?.code === "ENOBUFS") {
    return `git output exceeded maxBuffer (${GIT_MAX_BUFFER} bytes) — raise it; the payload is not the reason`;
  }
  const text = `${e?.stderr ?? ""}${e?.stdout ?? ""}`.trim();
  return text || `exit ${e?.status ?? "?"}, no output`;
}

export function resolveTouchedFiles(commitish, cwd = REPO_ROOT) {
  try {
    const out = execFileSync(
      "git",
      ["diff-tree", "--no-commit-id", "--name-only", "-r", commitish, "--"],
      { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: GIT_MAX_BUFFER },
    );
    return { ok: true, files: out.split("\n").filter(Boolean) };
  } catch (e) {
    return { ok: false, proof: gitProofOf(e) };
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
    const shared = e.files.filter((f) => touchedSet.has(citedPath(f)));
    if (shared.length) candidates.push({ line: e.line, headline: e.headline, files: shared });
  }
  return candidates;
}

function formatCandidate(c) {
  return (
    `CANDIDATE line=${c.line} via=file shared=${c.files.join(",")} ` +
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
// Identifier join — I/O boundary
// ---------------------------------------------------------------------------

// Locates the '## Open' section's own text and the line offset needed to
// turn a 1-based line number relative to that text back into a file-absolute
// one. Deliberately duplicated rather than imported (see the file header):
// `backlog-lint.mjs`'s equivalent (`censusOpenSection`) is private, and
// `backlog-order.mjs`'s exported `splitOpen` is unsafe to import from a CLI
// context. Boundary matches both exactly (head = first '## Open' line,
// tail = next '## ' line or EOF) — the same invariant `censusEntries`
// already depends on internally, so `censusEntries(text)` and
// `splitEntries(openSectionSlice(text).body)` walk the identical entries in
// the identical order by construction, not by coincidence.
function openSectionSlice(text) {
  const lines = text.split("\n");
  const head = lines.findIndex((l) => l.startsWith("## Open"));
  if (head < 0) return null;
  let tail = lines.length;
  for (let i = head + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      tail = i;
      break;
    }
  }
  return { body: lines.slice(head + 1, tail).join("\n"), lineOffset: head + 1 };
}

// `censusEntries`'s rows, one grain richer: each row also carries its own
// raw body text, needed for identifier extraction (`censusEntries` itself
// discards the body once it has pulled grade/headline/files out of it).
export function resolveOpenEntriesWithBodies(text) {
  const section = openSectionSlice(text);
  if (!section) return { ok: false, proof: "no '## Open' section" };
  const meta = censusEntries(text);
  const rows = splitEntries(section.body);
  return { ok: true, entries: meta.map((m, i) => ({ ...m, body: rows[i].body })) };
}

export function resolveOpenEntriesWithBodiesFromPath(backlogPath) {
  let text;
  try {
    text = readFileSync(backlogPath, "utf8");
  } catch (e) {
    return { ok: false, proof: `cannot read ${backlogPath}: ${e.message}` };
  }
  const r = resolveOpenEntriesWithBodies(text);
  return r.ok ? r : { ok: false, proof: `${r.proof} in ${backlogPath}` };
}

// The commit's own AFTER image of BACKLOG.md, plus the raw unified diff
// against its parent (git's own line-diff, not a hand-rolled one) — one
// failure at either step collapses to a single COULD-NOT-VERIFY, matching
// the settled design's "either git show fails" wording: a root commit (no
// `<commit>^`) fails the same way as an unresolvable commit-ish.
export function resolveIdentifierImages(commitish, cwd = REPO_ROOT) {
  const run = (args) =>
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: GIT_MAX_BUFFER });
  try {
    const after = run(["show", `${commitish}:BACKLOG.md`]);
    // Before image: existence/resolution check only. The actual line-change
    // detection below is git's own diff, not a hand-rolled comparison of
    // this text against `after`.
    run(["show", `${commitish}^:BACKLOG.md`]);
    const diff = run(["diff", "--unified=0", `${commitish}^`, commitish, "--", "BACKLOG.md"]);
    return { ok: true, after, diff };
  } catch (e) {
    return { ok: false, proof: gitProofOf(e) };
  }
}

// ---------------------------------------------------------------------------
// Identifier join — pure core
// ---------------------------------------------------------------------------

// A backtick-quoted token counts as a camelCase IDENTIFIER only if the WHOLE
// token (after stripping a trailing `()`) is letters/digits, starts
// lowercase, and carries at least one internal uppercase letter. Deliberately
// EXCLUDES: file paths and `path:line` citations (contain `/`, `.`, or `:`),
// ALL-CAPS tokens (`BACKLOG.md`'s own name, acronyms), snake_case, and plain
// lowercase prose words — the shapes that would otherwise turn this into a
// second, noisier file join.
export const CAMEL_CASE_IDENTIFIER = /^[a-z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*$/;

const BACKTICK_SPAN = /`([^`\n]+)`/g;

// Every backtick-quoted camelCase identifier in an entry body, deduped,
// first-appearance order. Same idiom as `backlog-lint.mjs`'s `censusFiles`: a
// backtick span is split on whitespace and each token judged alone, so a
// command span like `` `node tools/x.mjs conversationOf` `` yields the one
// real identifier token.
export function extractIdentifiers(body) {
  const ids = [];
  const seen = new Set();
  BACKTICK_SPAN.lastIndex = 0;
  let m;
  while ((m = BACKTICK_SPAN.exec(body))) {
    for (const tok of m[1].split(/\s+/)) {
      const stripped = tok.replace(/\(\)$/, "");
      if (CAMEL_CASE_IDENTIFIER.test(stripped) && !seen.has(stripped)) {
        seen.add(stripped);
        ids.push(stripped);
      }
    }
  }
  return ids;
}

const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm;

// Post-image line numbers a `--unified=0` diff touched. A hunk whose new
// count is 0 is a pure deletion — no post-image line to attribute, so it
// contributes nothing.
export function parseChangedLines(diffText) {
  const lines = new Set();
  HUNK_HEADER.lastIndex = 0;
  let m;
  while ((m = HUNK_HEADER.exec(diffText))) {
    const start = Number(m[1]);
    const count = m[2] === undefined ? 1 : Number(m[2]);
    for (let i = 0; i < count; i++) lines.add(start + i);
  }
  return lines;
}

// Every Open-section entry (any grade — grade filtering happens on the
// CANDIDATE side, not here) whose own body span contains at least one
// changed line. An entry's span is [entry.line, entry.line + lineCount - 1];
// `lineCount` comes from its own body text, so no separate "next entry"
// bookkeeping is needed — each entry's body already stops at the next bullet
// or the '## Open' section's own end, by `resolveOpenEntriesWithBodies`'s
// construction.
export function changedEntriesOf(changedLines, entriesWithBodies) {
  const changed = [];
  for (const e of entriesWithBodies) {
    const end = e.line + e.body.split("\n").length - 1;
    for (const ln of changedLines) {
      if (ln >= e.line && ln <= end) {
        changed.push(e);
        break;
      }
    }
  }
  return changed;
}

function formatIdentifierCandidate(c) {
  return (
    `CANDIDATE line=${c.line} via=identifier shared=${c.ids.join(",")} ` +
    `disposition=<still-valid|premise-corrected|now-unnecessary> "${c.headline}"`
  );
}

// The identifier join's report, built the same { code, lines } shape as
// `buildReport`, from already-resolved pieces so bites can inject canned
// failures for any I/O step without git or a fixture file. `touchedResult`
// is the SAME resolved value the file join uses — reused, not re-fetched.
// `imagesResult`/`poolResult` may be `null` when `touchedResult` makes them
// unreachable (commit unresolved, or resolved but not touching BACKLOG.md);
// they are never read in those branches.
export function buildIdentifierReport(commitish, touchedResult, imagesResult, poolResult) {
  if (!touchedResult.ok) {
    // The file join already reports COULD-NOT-VERIFY commit-resolve for
    // this same failure; nothing more to say about it here.
    return { code: 2, lines: [] };
  }
  if (!touchedResult.files.includes("BACKLOG.md")) {
    return {
      code: 0,
      lines: [`0 identifier candidates -- commit ${commitish} did not change BACKLOG.md`],
    };
  }
  if (!imagesResult.ok) {
    return { code: 2, lines: [`COULD-NOT-VERIFY identifier-join-images -- ${imagesResult.proof}`] };
  }

  const afterEntries = resolveOpenEntriesWithBodies(imagesResult.after);
  if (!afterEntries.ok) {
    return { code: 2, lines: [`COULD-NOT-VERIFY identifier-join-images -- ${afterEntries.proof}`] };
  }
  if (!poolResult.ok) {
    return { code: 2, lines: [`COULD-NOT-VERIFY identifier-join-pool -- ${poolResult.proof}`] };
  }

  const changedLines = parseChangedLines(imagesResult.diff);
  const changedEntries = changedEntriesOf(changedLines, afterEntries.entries);
  if (!changedEntries.length) {
    return {
      code: 0,
      lines: [
        `0 identifier candidates -- commit ${commitish} changed BACKLOG.md but no '## Open' entry body`,
      ],
    };
  }

  const changedIds = new Set();
  for (const e of changedEntries) for (const id of extractIdentifiers(e.body)) changedIds.add(id);
  if (!changedIds.size) {
    return {
      code: 0,
      lines: [
        `0 identifier candidates -- changed entries in commit ${commitish} cite no camelCase identifier`,
      ],
    };
  }

  // Excludes the changed entries themselves by HEADLINE, not by line number:
  // `poolResult` reads a possibly different file (a frozen image, a live
  // tree since reordered) than `imagesResult.after`, so line numbers are not
  // a stable cross-image key while the headline text usually still is.
  const changedHeadlines = new Set(changedEntries.map((e) => e.headline));
  const candidates = [];
  for (const e of poolResult.entries) {
    if (!OPEN_GRADES.has(e.grade)) continue;
    if (changedHeadlines.has(e.headline)) continue;
    const shared = extractIdentifiers(e.body).filter((id) => changedIds.has(id));
    if (shared.length) candidates.push({ line: e.line, headline: e.headline, ids: shared });
  }

  if (!candidates.length) {
    return {
      code: 0,
      lines: [
        `0 identifier candidates -- no open entry shares an identifier with commit ${commitish}'s changed entries`,
      ],
    };
  }
  return {
    code: 0,
    lines: [
      ...candidates.map(formatIdentifierCandidate),
      `${candidates.length} identifier candidate(s) for commit ${commitish}`,
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
  const fileReport = buildReport(commitish, touchedResult, entriesResult);

  // Only reach for git/the pool file when the commit resolved AND actually
  // touched BACKLOG.md — the two cases `buildIdentifierReport` short-circuits
  // on without ever reading `imagesResult`/`poolResult`.
  const touchesBacklog = touchedResult.ok && touchedResult.files.includes("BACKLOG.md");
  const imagesResult = touchesBacklog ? resolveIdentifierImages(commitish) : null;
  const poolResult = touchesBacklog ? resolveOpenEntriesWithBodiesFromPath(backlogPath) : null;
  const idReport = buildIdentifierReport(commitish, touchedResult, imagesResult, poolResult);

  const lines = [...fileReport.lines, ...idReport.lines];
  const code = fileReport.code === 2 || idReport.code === 2 ? 2 : 0;
  for (const l of lines) process.stdout.write(`${l}\n`);
  return code;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(main(process.argv));
}
