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
//   node tools/backlog-lint.mjs --pointers [<path>|-]
//                                           # ADDITIONALLY runs the
//                                           # pointer-liveness lane (below)

import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
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

// ==========================================================================
// Pointer-liveness lane (--pointers) — REPORT ONLY
// ==========================================================================
//
// Why this exists: on 2026-08-05 the TOP-PRIORITY backlog item pointed at
// `stash@{0}` for its implementation while `git stash list` was empty and
// `.git/logs/refs/stash` did not exist — its own recipe (`git stash pop`)
// would have popped nothing, or worse, a later unrelated stash. The work
// survived only as an unreachable object. That was found BY HAND; a
// hand-derivation finds it once, a check finds every one of them forever.
// The historical file at 6f415e8~1 carries two live `stash@{0}` references
// and is this lane's red-first fixture (see test/backlog-lint.test.mjs).
//
// THE CLOSED TAXONOMY — every finding carries exactly one label:
//
//   STASH-REF   any `stash@{N}`. Flagged UNCONDITIONALLY — deliberately NOT
//               by consulting the stash index. A stash index is not a
//               durable pointer: entries renumber when anything else is
//               stashed, and a pop deletes the ref outright. So a LIVE
//               stash@{0} is no more trustworthy than a dead one, and
//               checking the index would make this lane report "fine" for a
//               pointer that is one `git stash push` away from meaning
//               something else entirely.
//   PATH-DEAD   a repo-relative path that does not exist in the working tree.
//   REF-DEAD    a named branch/tag pattern with no matching ref.
//   ABS-PATH    an absolute machine path. Report-only and counted
//               SEPARATELY: these are machine-local by nature, and the
//               public-repo hygiene rule discourages them in tracked files
//               regardless of whether they resolve on this machine.
//
// THE FALSE-FIRE DISCIPLINE (the hard part — a check that fires on a
// NON-defect is broken too, and trains its reader to ignore red):
//
//   * Tokens are read from INLINE BACKTICK spans only. A path or ref inside
//     backticks is being CITED as a pointer; the same string in prose is
//     usually being discussed. STASH-REF is the one exception — it is
//     matched anywhere in the entry body, because it is unconditional.
//   * A backtick span is split on whitespace and each token judged alone,
//     so `node tools/replay.mjs --census` yields the one real path token.
//   * A token is DISQUALIFIED outright if it contains `*`, `<` or `>`, or
//     ends with punctuation. That is what keeps `proxy/**` (a glob),
//     `harvest --pin <key>` (a placeholder) and a sentence-final
//     `docs/foo.md.` (ambiguous real name) from being flagged.
//
// WHAT THIS DELIBERATELY DOES NOT COVER:
//   - fenced code blocks (``` … ```), and pointers written without backticks
//     other than stash refs;
//   - `bin/`, `hooks/`, `templates/` — real top-level dirs in this repo, but
//     outside the directory set this lane was scoped to; and `bootstrap/`,
//     which belongs to the dotfiles repo, not this one;
//   - an all-digit or all-letter short SHA (excluded by the mixed-token rule
//     above — a deliberate trade against the word/date false fires);
//   - whether a LIVE pointer points at what the entry claims. This lane
//     answers "does this still resolve", never "does it still mean that".
//
// It is a REPORT, not a gate: exit code is unchanged (always 0) and the
// existing invocation is untouched. Many entries are superseded handoffs
// that legitimately reference things long gone, so the rate on legitimate
// work must be MEASURED before any of this could block anything.

// This repo's real top-level directories, as scoped for this lane.
const PATH_ROOTS = ["tools/", "test/", "proxy/", "docs/"];
const REF_PATTERNS = [/^worktree-agent-/, /^pr\//, /^wip\//, /^feature\//, /^fix\//];
const STASH_REF = /stash@\{\d+\}/g;
const INLINE_CODE = /`([^`\n]+)`/g;
const HEX_TOKEN = /^[0-9a-f]{7,12}$/;
const ABS_PATH = /^\/(home|tmp)\//;
const TRAILING_PUNCT = /[,.;:!?)\]}'"]$/;
// This corpus cites source locations as `path:line`, `path:a-b` and
// `path:a,b`. The citation suffix is not part of the filename, and leaving
// it on made three live files read as dead on the first run of this lane.
const LINE_CITATION = /:\d+(?:[-,]\d+)*$/;

function gitProbe(args) {
  try {
    const out = execFileSync("git", args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, proof: out.trim() };
  } catch (e) {
    const text = `${e.stderr ?? ""}${e.stdout ?? ""}`.trim();
    return { ok: false, proof: text || `exit ${e.status ?? "?"}, no output` };
  }
}

// Default resolvers hit the real filesystem and the real git. They are
// injectable so synthetic bites can pin the RULE without a fixture repo,
// and so one named condition can be mutated at a time.
const REAL_ENV = {
  pathExists: (p) => existsSync(join(REPO_ROOT, p)),
  commitProbe: (t) => gitProbe(["cat-file", "-e", `${t}^{commit}`]),
  // A token that resolves to ANY object is not DEAD, whatever its type.
  // This corpus records deployment pins as TREE hashes (`proxy_tree
  // 9ef42be576bd`, `dotfiles pin 8c747aa`), and `^{commit}` rejects a tree
  // — so the commit probe alone reported four live pins as dead on the
  // first run. The label claims deadness; resolution is what refutes it.
  objectProbe: (t) => gitProbe(["cat-file", "-e", t]),
  refProbe: (r) => gitProbe(["rev-parse", "--verify", "--quiet", r]),
};

// A token is unambiguous enough to judge. See the discipline comment above.
function disqualified(token) {
  return (
    token.length === 0 ||
    token.includes("*") ||
    token.includes("<") ||
    token.includes(">") ||
    TRAILING_PUNCT.test(token)
  );
}

// Findings carry the line of the OCCURRENCE, not of the entry: one entry
// can cite the same dead pointer in two places (the 2026-08-02 handoff cites
// `stash@{0}` twice — once in its state list, once in its priority list),
// and reporting the entry once would hide the second citation from the
// person fixing it.
function lineOf(body, index, startLine) {
  let line = startLine;
  for (let i = 0; i < index; i++) if (body[i] === "\n") line++;
  return line;
}

function inlineTokens(body) {
  const tokens = [];
  INLINE_CODE.lastIndex = 0;
  let m;
  while ((m = INLINE_CODE.exec(body))) {
    const spanStart = m.index + 1;
    let offset = 0;
    for (const t of m[1].split(/\s+/)) {
      const at = m[1].indexOf(t, offset);
      offset = at + t.length;
      if (!disqualified(t)) tokens.push({ token: t, index: spanStart + at });
    }
  }
  return tokens;
}

// Lints pointer liveness; returns an array of finding objects. `env`
// overrides the resolvers (see REAL_ENV).
export function lintPointers(text, env = {}) {
  const { pathExists, commitProbe, objectProbe, refProbe } = { ...REAL_ENV, ...env };
  const findings = [];

  for (const entry of splitEntries(text)) {
    const title = entry.header.replace(/^- \*\*/, "").trim().slice(0, 80);
    const seen = new Set();
    const add = (label, token, proof, index) => {
      const line = lineOf(entry.body, index, entry.startLine);
      const key = `${label}|${token}|${line}`;
      if (seen.has(key)) return; // collapse only same-token-same-line repeats
      seen.add(key);
      findings.push({ line, title, label, token, proof });
    };

    // STASH-REF: unconditional, and matched anywhere in the body.
    STASH_REF.lastIndex = 0;
    let s;
    while ((s = STASH_REF.exec(entry.body))) {
      add(
        "STASH-REF",
        s[0],
        "a stash index is not a durable pointer (entries renumber, a pop " +
          "deletes the ref) — anchor it as a tag or branch instead",
        s.index,
      );
    }

    for (const { token, index } of inlineTokens(entry.body)) {
      if (ABS_PATH.test(token)) {
        add("ABS-PATH", token, "absolute machine path — machine-local by nature", index);
        continue;
      }
      if (PATH_ROOTS.some((r) => token.startsWith(r) && token.length > r.length)) {
        const file = token.replace(LINE_CITATION, "");
        if (!pathExists(file)) add("PATH-DEAD", file, `test -e ${file} -> absent`, index);
        continue;
      }
      // NO COMMIT-DEAD LANE, and this comment is the reason so nobody adds
      // one back. It existed for one run and scored 0 for 8: every hex token
      // it flagged belonged to a DIFFERENT namespace — a capture id, a
      // proxy-source fingerprint, a session id — none of which is a git
      // object and all of which fail resolution exactly the way a genuinely
      // dead commit ref does. Nothing in a token's SHAPE separates them; only
      // the surrounding prose does, and a context heuristic drifts. Residual
      // risk, named rather than checked: a commit cited BEFORE integration
      // (an agent's pre-cherry-pick hash) becomes unreachable and can be
      // collected, so entries cite the INTEGRATED hash. That convention is
      // the mitigation; this lane is not.
      if (HEX_TOKEN.test(token) && /[0-9]/.test(token) && /[a-f]/.test(token)) continue;
      if (REF_PATTERNS.some((re) => re.test(token))) {
        const probe = refProbe(token);
        if (!probe.ok) {
          add("REF-DEAD", token, `git rev-parse --verify ${token} -> ${probe.proof}`, index);
        }
      }
    }
  }
  return findings;
}

export const POINTER_LABELS = [
  "STASH-REF",
  "PATH-DEAD",
  "REF-DEAD",
  "ABS-PATH",
];

function formatPointerFinding(f) {
  return `WARN backlog-pointer line=${f.line} ${f.label} token="${f.token}" entry="${f.title}" proof=${f.proof}`;
}

function readInput(pathArg) {
  if (pathArg === "-") return readFileSync(0, "utf8");
  return readFileSync(pathArg ?? DEFAULT_BACKLOG, "utf8");
}

function main(argv) {
  const args = argv.slice(2);
  const wantPointers = args.includes("--pointers");
  const pathArg = args.find((a) => a !== "--pointers");
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

  if (wantPointers) {
    const pointers = lintPointers(text);
    for (const f of pointers) {
      process.stdout.write(`${formatPointerFinding(f)}\n`);
    }
    // Per-class counts, zeros stated: a class printed as 0 is a measured
    // zero, and its absence from the list would be indistinguishable from
    // a class this lane forgot to look for.
    const counts = POINTER_LABELS.map(
      (l) => `${l}=${pointers.filter((f) => f.label === l).length}`,
    ).join(" ");
    process.stdout.write(
      `backlog-pointers: ${pointers.length} finding(s) — REPORT only — ${counts}\n`,
    );
  }
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
