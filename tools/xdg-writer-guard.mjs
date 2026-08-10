#!/usr/bin/env node
// xdg-writer-guard — the WRITER-side check that ends the XDG stale-path
// class, rather than sweeping it again.
//
// BACKLOG.md ("READY — the WRITER-side guard that ends the XDG class"):
// every prior lane on this class was an AMPLIFIER — it found stale
// `~/.claude` citations and fixed them. This is the GENERATOR: it fires at
// WRITE time (via the test suite, on every run), so the class cannot
// regenerate once this file exists. It does not repair anything it finds —
// a separate ranked backlog entry owns that.
//
// PREDICATE, exactly as the entry states it: a module importing
// `statePath`/`dataPath` from `xdg-dirs.mjs` must not carry a `~/.claude`
// citation outside a labelled legacy context. Two halves:
//
//   SCOPE   — only files with a static `import { ... statePath|dataPath
//             ... } from ".../xdg-dirs.mjs"` are checked at all. A file
//             that does not import either helper (a README, a doc, an
//             unrelated module) falls outside the guard BY CONSTRUCTION —
//             never by an exemption list. This is deliberate: an
//             exemption list for non-source files would need maintaining
//             and could drift; a scope gate keyed on the same import the
//             predicate is about cannot. (The three READMEs are
//             upstream-owned and deliberately describe upstream's
//             `~/.claude` paths — FORK-NOTES.md, "Where this fork's own
//             state lives" — but that never needs stating here: they
//             import nothing from xdg-dirs.mjs.)
//
//   EXEMPT  — a `~/.claude` citation is exempt when it sits inside a
//             LABELLED legacy/migration context, checked three ways, all
//             mechanical (never a human override):
//               1. the citation's own line contains "legacy"
//                  (case-insensitive) — e.g. a CLI help string reading
//                  "...legacy ~/.claude/usage.jsonl still read" (real
//                  instance: tools/usage-to-dashboard-ndjson.mjs:136).
//               2. a NEARBY line — within `LEGACY_WINDOW` lines above or
//                  below, in the same direction only until a blank line
//                  or blank comment ("//") breaks the paragraph — contains
//                  "legacy". Real instance: tools/gate-live.mjs:53-54,
//                  where a sentence wraps across two `//` lines ("...so
//                  they consult the legacy" / "`~/.claude/` location and
//                  warn loudly..."). A same-line-only rule was tried first
//                  and rejected: it flagged this real, currently-correct
//                  comment as a violation the moment the check was wired
//                  up, which is the exact "fires on legitimate work"
//                  failure the brief warns against.
//               3. the nearest enclosing named function's name contains
//                  "legacy" (case-insensitive) — e.g. a hypothetical
//                  `legacyReadFoo()` whose body cites `~/.claude` to
//                  compute the old path it reads as a fallback.
//             None is a free-text override: all key on the literal word
//             "legacy" landing within a bounded, paragraph-respecting
//             window of the citation, or on the function containing it.
//             An UNBOUNDED version of rule 2 — "legacy" anywhere in the
//             whole surrounding comment block, however long — was tried
//             and rejected first: a bite test showed it lets one "legacy"
//             word blanket an unrelated citation several lines later in
//             the same block, which is exactly the override-habit shape
//             this predicate must not have (this codebase's header
//             comments commonly run 60+ lines). `LEGACY_WINDOW = 2` is
//             wide enough for the real wrapped-sentence case above and
//             narrow enough that a label cannot reach across a paragraph.
//
//             KNOWN LIMITATION, surfaced rather than solved here: a
//             citation describing a THIRD PARTY's fixed path (e.g.
//             tools/usage-to-dashboard-ndjson.mjs's note that fgrosswig's
//             dashboard auto-discovers `~/.claude/anthropic-proxy-logs/`
//             regardless of our own migration) still fires, because the
//             predicate has no notion of "whose artifact" — only "does
//             this module cite `~/.claude` outside a legacy label". That
//             citation is true and permanent, not stale, but rewording it
//             to say so belongs to the repair lane, not to this guard.
//
// RED-FIRST NOTE (see the backlog entry and the closing report that shipped
// this file): the entry claimed a second reference tree — "the tree after
// the bucket-(d) lane lands" — where the check must be silent. That tree
// does not exist in committed history; the repair lane it names has not
// shipped. The RED end (the tree before `bdd964d`, which the accounting's
// bucket (d) hits predate) is real and is what this file's test proves
// against. The "must not fire on legitimate work" half is proved instead
// against the REAL `legacyReadPath()` instance already in the tree — a
// stronger witness than a synthetic fixture, because nobody built it to
// pass this check.
//
// CLI:
//   node tools/xdg-writer-guard.mjs               # default file set (below)
//   node tools/xdg-writer-guard.mjs <path> ...     # explicit files
// Exit 0 (silent) when clean, 1 with one line per violation otherwise.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const CITATION = "~/.claude";
const LEGACY_MARK = /legacy/i;
const IMPORT_RE = /import\s*\{([^}]*)\}\s*from\s*["']([^"']*xdg-dirs\.mjs)["']/;
const HELPER_RE = /\b(statePath|dataPath)\b/;

// How many lines above/below a citation count as "nearby" for the
// wrapped-sentence exemption (rule 2 below) — see the header comment for
// why this is bounded rather than the whole comment block.
const LEGACY_WINDOW = 2;

const FUNCTION_DECL_RE =
  /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/;
const ARROW_CONST_RE =
  /^\s*(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(/;

/** Does `content` statically import statePath or dataPath from xdg-dirs.mjs? */
export function importsXdgHelpers(content) {
  const m = content.match(IMPORT_RE);
  if (!m) return false;
  return HELPER_RE.test(m[1]);
}

// Nearest enclosing function name for 0-based line index `i`, or null.
// Heuristic (this is a repo-internal lint over our own trusted source, not
// a parser): scan backward for a function/arrow-const declaration line,
// and accept the nearest one whose brace count from itself through `i`
// stays net-open (more "{" than "}"), i.e. it has not already closed
// before reaching `i`.
function enclosingFunctionName(lines, i) {
  for (let j = i - 1; j >= 0; j--) {
    const m = lines[j].match(FUNCTION_DECL_RE) || lines[j].match(ARROW_CONST_RE);
    if (!m) continue;
    let net = 0;
    for (let k = j; k <= i; k++) {
      for (const ch of lines[k]) {
        if (ch === "{") net++;
        else if (ch === "}") net--;
      }
    }
    if (net > 0) return m[1];
    // This candidate already closed before `i` — keep scanning further back
    // in case `i` sits inside an outer function past this one.
  }
  return null;
}

// A paragraph-boundary line — a blank line, or a comment line carrying no
// text of its own (just a bare "//", "/*", "*/", or "*" continuation
// marker). Scanning for a nearby "legacy" label stops at one of these so a
// label in one paragraph cannot reach into the next.
function isParagraphBoundary(line) {
  const t = line.trim();
  return t === "" || t === "//" || t === "/*" || t === "/**" || t === "*/" || t === "*";
}

// Is "legacy" on line `i` itself, or within LEGACY_WINDOW lines above/below
// without crossing a paragraph boundary first?
function nearbyLegacyLabel(lines, i) {
  if (LEGACY_MARK.test(lines[i])) return true;
  for (const step of [-1, 1]) {
    for (let d = 1; d <= LEGACY_WINDOW; d++) {
      const j = i + step * d;
      if (j < 0 || j >= lines.length) break;
      if (isParagraphBoundary(lines[j])) break;
      if (LEGACY_MARK.test(lines[j])) return true;
    }
  }
  return false;
}

function isLegacyExempt(lines, i) {
  if (nearbyLegacyLabel(lines, i)) return true;
  const fnName = enclosingFunctionName(lines, i);
  return Boolean(fnName && LEGACY_MARK.test(fnName));
}

/**
 * Find non-exempt `~/.claude` citations in `content`, given it already
 * passed `importsXdgHelpers`. Returns `[{ line, text }]`, 1-based `line`.
 */
export function findViolations(content) {
  const lines = content.split("\n");
  const violations = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(CITATION)) continue;
    if (isLegacyExempt(lines, i)) continue;
    violations.push({ line: i + 1, text: lines[i].trim() });
  }
  return violations;
}

/** Full check for one file. `path` is used only for reporting. */
export function checkFile(path, content) {
  if (!importsXdgHelpers(content)) return { path, inScope: false, violations: [] };
  return { path, inScope: true, violations: findViolations(content) };
}

// --- CLI ---------------------------------------------------------------

/** The default file set: every `.mjs` under `proxy/` and `tools/`, from `git
 * ls-files` rather than a directory walk so an untracked scratch file never
 * enters the sweep. Exported so a caller (the CLI below, or another
 * consumer's own bite) can extend it rather than re-deriving it. */
export function defaultFiles() {
  const out = execFileSync(
    "git",
    ["ls-files", "proxy/*.mjs", "proxy/**/*.mjs", "tools/*.mjs"],
    { encoding: "utf-8", cwd: new URL("..", import.meta.url).pathname },
  );
  return out.split("\n").filter(Boolean);
}

/** Run the full sweep over `files` (default: `defaultFiles()`) and return
 * `{ violations, readErrors }` rather than printing — the single place the
 * check logic runs, so the CLI below and any other consumer (the gate-live
 * sweep, BACKLOG "xdg-writer-guard main() is wired to no consumer") read the
 * same result instead of a second reimplementation drifting from this one.
 * `violations` entries carry `path` alongside the `{ line, text }` `findViolations`
 * already returns, since a multi-file sweep needs to say WHICH file. */
export function sweep(files = defaultFiles()) {
  const repoRoot = new URL("..", import.meta.url).pathname;
  const violations = [];
  const readErrors = [];
  for (const rel of files) {
    const full = rel.startsWith("/") ? rel : repoRoot + rel;
    let content;
    try {
      content = readFileSync(full, "utf-8");
    } catch (e) {
      readErrors.push({ path: rel, message: e.message });
      continue;
    }
    const result = checkFile(rel, content);
    for (const v of result.violations) {
      violations.push({ path: rel, line: v.line, text: v.text });
    }
  }
  return { violations, readErrors };
}

function main() {
  const args = process.argv.slice(2);
  const { violations, readErrors } = sweep(args.length ? args : undefined);
  for (const e of readErrors) {
    console.error(`xdg-writer-guard: cannot read ${e.path}: ${e.message}`);
  }
  for (const v of violations) {
    console.error(`${v.path}:${v.line}: ~/.claude citation outside a labelled legacy context: ${v.text}`);
  }
  if (violations.length > 0) {
    console.error(
      `xdg-writer-guard: ${violations.length} violation(s). A module using statePath()/dataPath() must not `
        + "also claim its artifact lives under ~/.claude, outside a function or comment block naming "
        + "\"legacy\".",
    );
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
