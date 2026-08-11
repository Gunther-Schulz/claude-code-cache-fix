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
//   (2) the entry's body contains, as a claim about the ENTRY (not as an
//       enumeration of the marker words themselves, and not scoped to a
//       named sub-claim inside a still-open entry — see below), either
//         - a dated resolution word (RESOLVED, FIXED, or BUILT) with a
//           YYYY-MM-DD date within ~40 characters of it, or
//         - a verification word (VERIFIED or CLASS CLOSED), the un-negated
//           form only (NOT-VERIFIED reads as still-open, not resolved).
//
// Two exemptions keep a marker word's PRESENCE from being read as the
// entry's STATUS (both from the same root cause — a marker's presence is
// not always what it means):
//
//   ENUMERATION CONTEXT — this file's own backlog entry describes its
//   marker words as a slash-joined list ("RESOLVED/FIXED/BUILT +
//   VERIFIED/CLASS CLOSED"), and other entries name unrelated status
//   vocabularies that happen to share a word ("DECLARED/RUNNING/
//   VERIFIED", the doctor's three-answer gate triple) — a literal match
//   without a guard self-fires on prose describing terms of art, not
//   claiming resolution. Keyed on the RUN's structure (isEnumerationContext,
//   below), never on the single adjacent character — a padded separator
//   ("DECLARED / RUNNING / VERIFIED") escapes an adjacency-only guard by
//   putting a space next to the marker. "+" alone does not qualify a run:
//   this corpus's real completion idiom chains bare actions with "+"
//   ("BUILT + VERIFIED + PUSHED same day (78940a0: 7/7 …)", a real
//   historical true positive) and that must keep firing, so a run counts as
//   an enumeration only when it ALSO contains one of the other four
//   separators (/, `,`, vs, and) — "+" is how this corpus joins two
//   already-listed GROUPS, never a standalone joiner between bare words.
//
//   SUB-CLAIM SCOPE — a dated resolution can record that one NAMED
//   SUB-CLAIM inside a still-open entry was resolved, without the entry
//   itself being resolved. Two structural tells, both about WHERE the
//   marker sits, never about its own wording: a SENTENCE-INITIAL bold run
//   (`**…**` opening a new sentence or paragraph, never the entry's own
//   header bold run — that one IS the entry's status claim), or text after
//   a literal "Superseded" label, up to the next paragraph break.
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
//   node tools/backlog-lint.mjs --ready-bar [<path>|-]
//                                           # ADDITIONALLY runs the
//                                           # READY-bar lane (below)
//   node tools/backlog-lint.mjs --census [--since <ref>] [<path>|-]
//                                           # emits the population census
//                                           # (below) INSTEAD of the header
//                                           # lint; suppresses the normal
//                                           # output

import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir } from "node:os";
// `sidToken` is the SAME identity harvest.mjs uses to name a pinned fixture
// (`pinned-${sidToken(key)}-…`, harvest.mjs:1345) — imported rather than
// re-derived, per dev-loop's rule against a second implementation of one
// identity. See the capture-alias lane below for why this matters: a naive
// re-derivation (first 12 hex chars of the raw UUID) LOOKS right and is not.
import { sidToken } from "./harvest.mjs";
// Reused rather than re-derived: `readRowStatus`/`CLAIM_COMPATIBILITY` are
// the status FILE's own reader and claim vocabulary (dev-loop's rule against
// a second implementation of one identity — three confident wrong answers in
// this repo already came from hand-rolled versions of exactly this kind of
// primitive). Status became DATA in the records-restructure directive
// (phase 1); this file used to read the matrix's own PROSE via `statusKind`/
// `matrixRow` (bust-triage.mjs) and was moved onto the status file when the
// matrix cells lost their leading tokens — the old pairing is gone from this
// file's imports because nothing else here still calls it (grepped: only
// the row-status lane below ever did). Read-only import; this file does not
// own matrix-status.mjs.
import { readRowStatus, CLAIM_COMPATIBILITY, STATUS_PATH } from "./matrix-status.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
export const DEFAULT_BACKLOG = join(REPO_ROOT, "BACKLOG.md");

const ENTRY_START = /^- \*\*/;
const HEADER_GRADE = /^- \*\*(OPEN\/HOT|OPEN|READY|HOT)\b/;

// Marker words themselves (the exemptions below decide whether a match
// counts — see the header comment).  The verification word must not be
// negated ("NOT-VERIFIED" reads as still-open, not resolved).
const RES_WORD = /\b(RESOLVED|FIXED|BUILT)\b/g;
// DONE grades entries here as freely as RESOLVED does, but it needs the
// LINE-INITIAL constraint the others do not: this corpus writes qualified
// sub-steps ("ATTRIBUTE DONE <date>") inside entries that are correctly
// still open, and a bare match would fire on those — a guard firing on
// legitimate work is the failure that trains the override reflex. Only a
// DONE that opens its own line is claiming the ENTRY is done. It shares
// `findDatedResolution`'s loop below, so the same two exemptions apply to
// it too — consistent with the same root cause, though DONE never had the
// slash-adjacency exemption these two replace and no known real instance
// has needed either one.
const DONE_LINE = /^[ \t]*(DONE)\b/gm;
const VERIF_WORD = /(?<!NOT[- ])\b(VERIFIED|CLASS CLOSED)\b/g;
const DATE = /\d{4}-\d{2}-\d{2}/;
const DATE_PROXIMITY = 40;

// ==========================================================================
// Marker exemptions — see the header comment for what each one is for.
// ==========================================================================

// ENUMERATION CONTEXT. A term is one or two ALL-CAPS words ("VERIFIED",
// "CLASS CLOSED"); a run is two or more terms joined by any of the five
// separators. A run only counts as an enumeration if it contains at least
// one of the four STRONG separators — "+" alone (bare word chained to bare
// word, no /, `,`, vs, or and anywhere in the run) never qualifies, which is
// what keeps "BUILT + VERIFIED + PUSHED same day (…)" firing while clearing
// "RESOLVED/FIXED/BUILT + VERIFIED/CLASS CLOSED" (two slash groups joined
// by "+", each already qualifying on its own).
// Whitespace tolerance is `\s`, not `[ \t]`: this corpus line-wraps bold
// and plain prose alike, so a padded separator or a two-word term can fall
// across a line break ("DECLARED / RUNNING /\n  VERIFIED must agree").
const CAPS_TERM = "[A-Z]{2,}(?:\\s+[A-Z]{2,})?";
const ANY_SEP = "(?:\\/|,|\\+|\\bvs\\b|\\band\\b)";
const STRONG_SEP = /\/|,|\bvs\b|\band\b/;
const ENUM_RUN = new RegExp(`${CAPS_TERM}(?:\\s*${ANY_SEP}\\s*${CAPS_TERM})+`, "g");

function isEnumerationContext(body, start, end) {
  ENUM_RUN.lastIndex = 0;
  let m;
  while ((m = ENUM_RUN.exec(body))) {
    const runEnd = m.index + m[0].length;
    if (start >= m.index && end <= runEnd && STRONG_SEP.test(m[0])) return true;
  }
  return false;
}

// SUB-CLAIM SCOPE. A bold span is `**…**`, spanning newlines (this corpus
// wraps bold prose across lines). The entry's OWN header bold run — the
// first bold span in the body, since the body includes the header line —
// is never sub-claim scope; only a LATER bold span counts, and only when
// it is SENTENCE-INITIAL (opens the body, or is immediately preceded, past
// trailing spaces/tabs, by a newline or sentence-ending punctuation) — an
// inline bold emphasis mid-sentence is not naming a sub-claim.
const BOLD_SPAN = /\*\*([\s\S]*?)\*\*/g;
// A literal "Superseded" label scopes everything from itself to the next
// paragraph break (or entry end) as retired input, never a live claim.
const SUPERSEDED = /\bsuperseded\b/gi;
const PARAGRAPH_BREAK = /\n[ \t]*\n/g;

function isSentenceInitialBoldContext(body, index) {
  BOLD_SPAN.lastIndex = 0;
  let m;
  let isHeaderSpan = true;
  while ((m = BOLD_SPAN.exec(body))) {
    const start = m.index;
    const end = m.index + m[0].length;
    const header = isHeaderSpan;
    isHeaderSpan = false;
    if (header) continue;
    if (index < start || index >= end) continue;
    const before = body.slice(0, start).replace(/[ \t]+$/, "");
    if (before.length === 0 || /[\n.!?]$/.test(before)) return true;
  }
  return false;
}

function isSupersededContext(body, index) {
  SUPERSEDED.lastIndex = 0;
  let m;
  while ((m = SUPERSEDED.exec(body))) {
    if (m.index >= index) continue; // the label must precede the marker
    PARAGRAPH_BREAK.lastIndex = m.index;
    const brk = PARAGRAPH_BREAK.exec(body);
    const sectionEnd = brk ? brk.index : body.length;
    if (index >= m.index && index < sectionEnd) return true;
  }
  return false;
}

function isExemptMarker(body, start, end) {
  return (
    isEnumerationContext(body, start, end) ||
    isSentenceInitialBoldContext(body, start) ||
    isSupersededContext(body, start)
  );
}

function findDatedResolution(body) {
  for (const re of [RES_WORD, DONE_LINE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(body))) {
      const start = Math.max(0, m.index - DATE_PROXIMITY);
      const end = Math.min(body.length, m.index + m[0].length + DATE_PROXIMITY);
      if (DATE.test(body.slice(start, end)) && !isExemptMarker(body, m.index, m.index + m[0].length)) {
        return m[1];
      }
    }
  }
  return null;
}

function findVerification(body) {
  VERIF_WORD.lastIndex = 0;
  let m;
  while ((m = VERIF_WORD.exec(body))) {
    if (!isExemptMarker(body, m.index, m.index + m[0].length)) return m[1];
  }
  return null;
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
// UNREACHABLE-OBJECT's own bound, deliberately WIDER than HEX_TOKEN's, and
// separate from it so the skip semantics of every other lane stay exactly as
// they were. Found 2026-08-11 by probing the new lane's BOUNDARY rather than
// its class (docs/dev-loop.md, "Grading a dispatched lane", move 1): at 7-12
// a citation of a FULL 40-char sha was outside the lane's reach entirely, so
// the guard held one route and not the other — this repo's entry-path rule,
// landing on a guard three hours old. Widening is safe precisely because this
// lane is RESOLUTION-gated: the corpus's 13-16-char hex tokens are
// conversation sub-keys and state keys, none of which resolves as a git
// object, and its one real 40-char token is a PNG content hash that resolves
// as a BLOB and is dropped by the type gate below. Both were checked, not
// assumed.
const OBJECT_TOKEN = /^[0-9a-f]{7,40}$/;
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
  // UNREACHABLE-OBJECT's probe: empty stdout (exit 0) means no ref contains
  // the object. See the UNREACHABLE-OBJECT comment below for why this is
  // safe to gate on resolution rather than on shape.
  reachProbe: (t) => gitProbe(["for-each-ref", "--contains", t, "--count=1"]),
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
  const { pathExists, commitProbe, objectProbe, refProbe, reachProbe } = { ...REAL_ENV, ...env };
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
      //
      // UNREACHABLE-OBJECT is compatible with the lesson above for one
      // specific reason: it never classifies by SHAPE. A hex token that does
      // not resolve to any git object is skipped exactly as before — the
      // 0-for-8 lesson stands unmodified, verbatim. Only a token that DOES
      // resolve gets probed further, and its FURTHER classification (commit
      // vs. tree/blob) is also read from git, never guessed from the token's
      // look. The namespace question the 0-for-8 lane could not answer is
      // answered here by RESOLUTION itself: a capture id, session id or
      // fingerprint essentially never collides with a real object hash, so
      // it fails `objectProbe` and is skipped, same as an unresolvable dead
      // ref. A token that resolves is unambiguously a git object, whatever
      // else it might have looked like. Only COMMITS are reachability-
      // checked (`commitProbe`, peeling through a tag); trees and blobs —
      // this corpus records deployment pins as TREE hashes (`proxy_tree
      // 9ef42be576bd`) — are not durable-pointer claims the way a commit
      // citation is, and are skipped silently once resolution confirms they
      // are not commits.
      //
      // Named residual, not mitigated: a short (7-hex) CAPTURE ID can still
      // collide with the PREFIX of a real object. When it does, it resolves
      // to an unrelated object it was never meant to name — and that object
      // is almost always reachable from some ref (most objects in a live
      // repo are), so the collision fails SILENT rather than loud: no
      // finding fires, and nothing distinguishes "this really is commit
      // abc1234" from "some capture id happens to collide with abc1234".
      // That is the same shape as the 0-for-8 lesson's own residual,
      // one layer in: resolution narrows the false-positive rate to near
      // zero, it does not remove it.
      if (OBJECT_TOKEN.test(token) && /[0-9]/.test(token) && /[a-f]/.test(token)) {
        const obj = objectProbe(token);
        if (!obj.ok) continue; // does not resolve — the 0-for-8 lesson, unchanged
        const commit = commitProbe(token);
        if (!commit.ok) continue; // resolves, but not a commit (tree/blob) — skip silently
        const reach = reachProbe(token);
        if (reach.ok && reach.proof.length === 0) {
          add(
            "UNREACHABLE-OBJECT",
            token,
            `git for-each-ref --contains ${token} --count=1 -> empty (reachable from no ref)`,
            index,
          );
        }
        continue;
      }
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
  "UNREACHABLE-OBJECT",
];

function formatPointerFinding(f) {
  return `WARN backlog-pointer line=${f.line} ${f.label} token="${f.token}" entry="${f.title}" proof=${f.proof}`;
}

// ==========================================================================
// Population census (--census) — a `## Open` entry-by-entry inventory
// ==========================================================================
//
// Why this exists: the five numbers that gate the mechanism proof below
// (167 bullets, 81 READY, 86 whole-file READY, 18 READY added / 3 removed
// between two historical commits) were first produced by a throwaway awk
// one-liner re-typed at every derivation. This is that awk graduated into a
// tool this file owns — one entry parser (`splitEntries`, already above),
// one boundary definition (matching `tools/backlog-order.mjs`'s `## Open`
// delimitation exactly, so the two tools never silently disagree about
// where the section starts and ends), one census.
//
// Scope: the `## Open` section only, from the line matching `^## Open` to
// the line before the next `^## `. A bullet AFTER that boundary — even one
// that looks identical to a bullet inside it — is invisible to this lane by
// construction; `test/fixtures/backlog-census-sample.md` carries exactly
// that case as a mutation-proof fixture (a bullet placed under
// `## Later section`).
//
// Absence rule (one rule for the whole instrument, stated once rather than
// per-field): anything this census cannot read gets its own bucket and is
// LISTED — UNCLASSIFIED for a grade word outside the closed vocabulary,
// "none" for an empty list, "0" for a zero count. Nothing is folded into a
// neighbouring answer and nothing is summarized away.

// The closed grade vocabulary. Order here is the order the summary line
// prints buckets in — UNCLASSIFIED last, since it is the "recognized
// nothing" bucket rather than a grade word this corpus actually writes.
const CENSUS_GRADES = [
  "READY", "OPEN", "HOT", "OPEN/HOT", "PARKED", "DONE", "RESOLVED",
  "FIXED", "BUILT", "PARTLY", "CORRECTED", "DOWNGRADED",
];
const CENSUS_GRADE_SET = new Set(CENSUS_GRADES);
const CENSUS_GRADE_TOKEN = /^([A-Z]+(?:\/[A-Z]+)?)/;
const CENSUS_VERIFIER_WORD = /done-criterion|verifier|red-first/i;
const CENSUS_ANCHOR_MARK = "<!-- entry:";
const CENSUS_POINTER_MARK = "POINTER";
const CENSUS_FILE_EXT = /\.(mjs|py|md|json|jsonl|sh)$/;
const CENSUS_INLINE_CODE = /`([^`\n]+)`/g;

// The bullet header's grade token, classified into the closed vocabulary
// above. A header that does not open with a recognized grade word — a
// lowercase opener, a backtick-fenced tag, anything outside the list — is
// UNCLASSIFIED rather than folded into a neighbouring bucket.
function censusGrade(headerLine) {
  let rest = headerLine.replace(/^- \*\*/, "");
  if (rest.startsWith("(")) rest = rest.slice(1);
  const m = CENSUS_GRADE_TOKEN.exec(rest);
  const token = m ? m[1] : null;
  return token && CENSUS_GRADE_SET.has(token) ? token : "UNCLASSIFIED";
}

// Every backtick-quoted token in the entry body that reads as a file
// reference: contains both a `/` and a `.`, or ends in one of this corpus's
// tracked extensions. Deduped, first-appearance order — a command span like
// `node tools/replay.mjs --census` yields the one real path token, exactly
// as the pointer lane above already establishes for the same shape.
function censusFiles(body) {
  const files = [];
  const seen = new Set();
  CENSUS_INLINE_CODE.lastIndex = 0;
  let m;
  while ((m = CENSUS_INLINE_CODE.exec(body))) {
    for (const tok of m[1].split(/\s+/)) {
      if (!tok || seen.has(tok)) continue;
      const looksLikeFile = (tok.includes("/") && tok.includes(".")) || CENSUS_FILE_EXT.test(tok);
      if (looksLikeFile) {
        seen.add(tok);
        files.push(tok);
      }
    }
  }
  return files;
}

// First line, whitespace-collapsed and truncated — the same idiom
// `formatFinding`/`formatPointerFinding` already use for entry titles above.
function censusHeadline(firstLine) {
  return firstLine.replace(/^- \*\*/, "").replace(/\s+/g, " ").trim().slice(0, 100);
}

// The `## Open` section's body text and the line-number offset needed to
// turn `splitEntries`'s slice-relative line numbers back into file-absolute
// ones. Boundary matches `tools/backlog-order.mjs`'s `splitOpen` exactly
// (head = first `## Open` line, tail = next `## ` line or EOF) — the two
// tools must never silently disagree about where this section is.
//
// EXPORTED 2026-08-11, and the reason is the sentence directly above it. A
// third consumer arrived (`tools/state-report.mjs`, records-restructure phase
// 4) and found this un-exported, which leaves a builder exactly two options:
// re-derive the boundary — the drift this comment forbids — or stop. The lane
// stopped and returned the question, which is the right conduct and also the
// evidence that a shared boundary definition kept private is a defect rather
// than an encapsulation choice: privacy here does not prevent the second copy,
// it only makes the second copy the path of least resistance.
export function censusOpenSection(text) {
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

// One row per `## Open` bullet, in file order. Returns [] if the file has
// no `## Open` section at all (an absence this function's caller surfaces,
// never silently treats as zero entries).
export function censusEntries(text) {
  const section = censusOpenSection(text);
  if (!section) return [];
  return splitEntries(section.body).map((e) => {
    const firstLine = e.header;
    return {
      line: section.lineOffset + e.startLine,
      grade: censusGrade(firstLine),
      anchor: e.body.includes(CENSUS_ANCHOR_MARK) ? "anchor" : "-",
      verifier: CENSUS_VERIFIER_WORD.test(e.body) ? "verifier" : "-",
      pointer: firstLine.includes(CENSUS_POINTER_MARK) ? "pointer" : "-",
      files: censusFiles(e.body),
      headline: censusHeadline(firstLine),
      rawFirstLine: firstLine,
    };
  });
}

function formatCensusRow(e) {
  return [e.line, e.grade, e.anchor, e.verifier, e.pointer, e.files.join(","), e.headline].join("\t");
}

function censusSummaryLines(entries) {
  const counts = Object.fromEntries(CENSUS_GRADES.map((g) => [g, 0]));
  counts.UNCLASSIFIED = 0;
  for (const e of entries) counts[e.grade]++;
  const gradeLine =
    "# grades: " + [...CENSUS_GRADES, "UNCLASSIFIED"].map((g) => `${g}=${counts[g]}`).join(" ");

  const unclassified = entries.filter((e) => e.grade === "UNCLASSIFIED").map((e) => e.line);
  const unclassifiedLine =
    `# UNCLASSIFIED bullets: ${unclassified.length ? unclassified.join(",") : "none"}`;

  const ready = entries.filter((e) => e.grade === "READY");
  const readyNoAnchorLine = `# READY without anchor: ${ready.filter((e) => e.anchor === "-").length}`;
  const readyNoVerifierLine = `# READY without verifier: ${ready.filter((e) => e.verifier === "-").length}`;

  // Files claimed by 2+ READY entries. Each entry's own file list is
  // already deduped, so counting once per entry (not once per occurrence)
  // is what makes this "claimed by N DIFFERENT entries" rather than "cited
  // N times by any entry".
  const fileCounts = new Map();
  for (const e of ready) {
    for (const f of e.files) fileCounts.set(f, (fileCounts.get(f) ?? 0) + 1);
  }
  const shared = [...fileCounts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const sharedLine =
    "# files claimed by 2+ READY entries: " +
    (shared.length ? shared.map(([f, n]) => `${f}(${n})`).join(", ") : "none");

  return [gradeLine, unclassifiedLine, readyNoAnchorLine, readyNoVerifierLine, sharedLine];
}

// "Added"/"removed" compare the SET of READY bullet FIRST LINES (raw,
// untruncated) between the two sides — a header that was only re-graded
// shows up on both lists, which is correct and intended (this is a
// set-membership diff, not a text diff).
function censusSinceLines(newEntries, oldText, ref) {
  const oldReady = censusEntries(oldText).filter((e) => e.grade === "READY");
  const oldSet = new Set(oldReady.map((e) => e.rawFirstLine));
  const newReady = newEntries.filter((e) => e.grade === "READY");
  const newSet = new Set(newReady.map((e) => e.rawFirstLine));

  const added = newReady.filter((e) => !oldSet.has(e.rawFirstLine));
  const removed = oldReady.filter((e) => !newSet.has(e.rawFirstLine));

  return [
    `# READY added since ${ref}: ${added.length}`,
    ...added.map((e) => `+ ${e.headline}`),
    `# READY removed since ${ref}: ${removed.length}`,
    ...removed.map((e) => `- ${e.headline}`),
  ];
}

// The full census text: rows, a blank line, the summary, and (with a
// `since` ref) the added/removed tail. Exported so the bites pin this
// directly rather than only through the CLI's stdout.
export function censusText(text, { sinceRef, oldText } = {}) {
  const entries = censusEntries(text);
  const rows = entries.map(formatCensusRow);
  const summary = censusSummaryLines(entries);
  const since = sinceRef ? censusSinceLines(entries, oldText, sinceRef) : [];
  return [...rows, "", ...summary, ...since].join("\n") + "\n";
}

// ==========================================================================
// Citation drift lane (default pass) — a backlog entry that cites `file:line`
// ==========================================================================
//
// Why this exists: on 2026-08-10 the `capturePairResult` entry cited
// `tools/bust-triage.mjs:749` and `:760`; a later commit inserted an
// attribution section above both sites and they silently became `:754` and
// `:765`. The entry survived only because it QUOTED the expression beside
// each number — a bare `:749` still reads as a plausible site even though it
// now points somewhere else. See BACKLOG.md, "a backlog entry that cites
// `file:line` has no check that".
//
// SCOPE: `## Open` only (censusOpenSection, above) — `## Done` citations are
// a historical record of the state AT CLOSING TIME and must not be
// rewritten, per the entry that requested this check.
//
// A citation is either FULL (`` `path:NNN` ``, path rooted at one of
// PATH_ROOTS — ranges/lists like `path:a-b` are out of scope, a named limit
// rather than a silent one: this check answers "is line NNN still what it
// says", which a range does not state precisely enough to check) or BARE
// (`` `:NNN` ``, resolved against the nearest preceding FULL citation in the
// same entry — this corpus's own continuation idiom). Its ANCHOR is the next
// backtick span within the following two lines that is not itself
// citation-shaped — the quoted expression the entry puts beside the number
// specifically so a reader (and this check) can tell whether the number
// still means what it says.
//
// FOUR answers, never two (dev-loop's three-answer rule, plus the
// correction the requesting entry itself records: an ABSENT FILE is its own
// finding, never folded into "could not check" — that would silently
// swallow a real positive):
//   MATCH            the cited line contains the anchor text.
//   DRIFTED          it does not; the anchor was found elsewhere in the file
//                     (new line named) or nowhere in it (named as such).
//   BROKEN-PATH      the cited file does not exist.
//   COULD-NOT-CHECK  the cited line is past EOF, there is no anchor to check
//                     against, or (bare form) no preceding path citation
//                     exists in this entry to resolve it against.
//
// Every citation checked is returned, MATCH included — the whole-population
// accounting the absence rule requires (a report that only lists problems
// cannot be told apart from one that silently skipped most of the corpus).

const CITATION_TOKEN = /`(?:([\w./-]+):(\d+)|:(\d+))`/g;
const CITATION_EXPR = /`([^`\n]+)`/g;

function isCitationShapedToken(s) {
  return /^[\w./-]+:\d+$/.test(s) || /^:\d+$/.test(s);
}

// The anchor is TIGHTLY adjacent — only whitespace/newlines and at most one
// opening paren may sit between the citation's closing backtick and the
// anchor's opening one ("within the following two lines" turned out too
// loose on real content: measured on the first dry run against the current
// BACKLOG.md, a citation followed a few words later by an UNRELATED
// backtick span — a second symbol's name, cited for a DIFFERENT nearby
// citation — paired as if it were this citation's own quoted line and
// produced a false DRIFTED. The corpus's real anchoring idiom (the
// `capturePairResult` entry this lane exists for) is
// `` `path:NNN`\n  (`quoted expression`) `` — citation, optional
// prose-free "(", then the anchor, with nothing else between. Requiring
// that adjacency is what tells "the next thing quoted is THIS citation's
// own line" apart from "the next thing quoted is some other citation's
// label mentioned nearby". A citation with prose before its nearest
// backtick span (a name, a clause, another citation) has no anchor by this
// rule and is COULD-NOT-CHECK, which is the honest answer: this lane
// verifies the specific idiom, not every citation in the file.
function findCitationAnchor(body, afterIndex) {
  let i = afterIndex;
  while (i < body.length && /\s/.test(body[i])) i++;
  if (body[i] === "(") i++;
  if (body[i] !== "`") return null;
  CITATION_EXPR.lastIndex = 0;
  const m = CITATION_EXPR.exec(body.slice(i));
  if (!m || m.index !== 0) return null;
  const t = m[1].trim();
  return t && !isCitationShapedToken(t) ? t : null;
}

// Default resolvers hit the real filesystem, exactly like the pointer lane's
// REAL_ENV. Injectable so bites can pin the RULE against synthetic content
// without a fixture repo, and mutate one named condition at a time.
const CITATION_REAL_ENV = {
  pathExists: (p) => existsSync(join(REPO_ROOT, p)),
  readLines: (p) => readFileSync(join(REPO_ROOT, p), "utf8").split("\n"),
};

// Lints `path:line` citations inside `## Open`. `env` overrides the
// resolvers (see CITATION_REAL_ENV) — the same injection idiom lintPointers
// already uses above.
export function lintCitations(text, env = {}) {
  const { pathExists, readLines } = { ...CITATION_REAL_ENV, ...env };
  const section = censusOpenSection(text);
  if (!section) return [];
  const findings = [];

  for (const entry of splitEntries(section.body)) {
    const title = entry.header.replace(/^- \*\*/, "").trim().slice(0, 80);
    let lastPath = null;
    CITATION_TOKEN.lastIndex = 0;
    let m;
    while ((m = CITATION_TOKEN.exec(entry.body))) {
      const full = m[0];
      const fullPath = m[1];
      const fullLine = m[2];
      const bareLine = m[3];
      const line = section.lineOffset + lineOf(entry.body, m.index, entry.startLine);
      let path;
      let citedLine;

      if (fullPath !== undefined) {
        if (!PATH_ROOTS.some((r) => fullPath.startsWith(r))) continue; // out of scope for this lane
        path = fullPath;
        citedLine = Number(fullLine);
        lastPath = path;
      } else {
        citedLine = Number(bareLine);
        if (!lastPath) {
          findings.push({
            line, file: null, citedLine, verdict: "COULD-NOT-CHECK", entry: title,
            detail: "bare form with no preceding path citation in this entry",
          });
          continue;
        }
        path = lastPath;
      }

      const anchor = findCitationAnchor(entry.body, m.index + full.length);
      if (anchor === null) {
        findings.push({
          line, file: path, citedLine, verdict: "COULD-NOT-CHECK", entry: title,
          detail: "no quoted expression to anchor on",
        });
        continue;
      }
      if (!pathExists(path)) {
        findings.push({
          line, file: path, citedLine, verdict: "BROKEN-PATH", entry: title, anchor,
          detail: "cited file does not exist",
        });
        continue;
      }
      const fileLines = readLines(path);
      if (citedLine < 1 || citedLine > fileLines.length) {
        findings.push({
          line, file: path, citedLine, verdict: "COULD-NOT-CHECK", entry: title, anchor,
          detail: `line past EOF (file has ${fileLines.length} lines)`,
        });
        continue;
      }
      const actual = fileLines[citedLine - 1].trim();
      if (actual.includes(anchor)) {
        findings.push({ line, file: path, citedLine, verdict: "MATCH", entry: title, anchor });
        continue;
      }
      const newIdx = fileLines.findIndex((l) => l.trim().includes(anchor));
      findings.push({
        line, file: path, citedLine, verdict: "DRIFTED", entry: title, anchor,
        newLine: newIdx >= 0 ? newIdx + 1 : null,
        detail: newIdx >= 0 ? `now at line ${newIdx + 1}` : "not found elsewhere in file",
      });
    }
  }
  return findings;
}

export const CITATION_VERDICTS = ["MATCH", "DRIFTED", "BROKEN-PATH", "COULD-NOT-CHECK"];

function formatCitationFinding(f) {
  const bits = [`line=${f.line}`, `verdict=${f.verdict}`, `file=${f.file ?? "-"}`, `cited=${f.citedLine}`];
  if (f.newLine) bits.push(`found=${f.newLine}`);
  if (f.detail) bits.push(`reason="${f.detail}"`);
  bits.push(`entry="${f.entry}"`);
  return `WARN backlog-citation ${bits.join(" ")}`;
}

// ==========================================================================
// Row-status drift lane (default pass) — an entry asserts a matrix row's
// status, and nothing re-reads the row
// ==========================================================================
//
// Why this exists: entries routinely say "row N is OPEN" / "row N is
// CLOSED" in their own words, and the row's actual status in
// docs/directives/robustness-threat-matrix.md moves without them — the
// dev-loop's "a row NAMED is not a row READ" trap, hit from the writing
// side this time. See BACKLOG.md, "the succession rule's computable slice:
// an entry that".
//
// SCOPE: `## Open` only, same boundary as the citation lane above.
//
// The literal words this repo's entries actually use to assert a row's
// status (named by the backlog entry that requested this check) are OPEN,
// RE-OPENED, CLOSED, MITIGATED, OBSERVED, ACCEPTED — matched only OUTSIDE a
// "NOT " negation, the same guard the header lane's VERIF_WORD already uses
// for "NOT-VERIFIED" (a bold "ROW 4 IS NOT CLOSED" agrees with an OPEN row;
// without the guard it would misread as a claim of MITIGATED).
//
// RECORDS-RESTRUCTURE UPDATE (phase 1 moved row status to DATA): a matched
// word is now looked up in `CLAIM_COMPATIBILITY` (matrix-status.mjs) — the
// set of enum statuses that make the claim TRUE — rather than classified
// via the matrix's own leading-token prose (the old `statusKind`/
// `matrixRow` pairing, retired here). A claim word absent from that table
// (OBSERVED, under the new closed enum) is not a status claim and is
// skipped, same as before. The row's ACTUAL status comes from
// `readRowStatus(n)`, which reads `docs/directives/robustness-threat-
// matrix.status.json` — never the matrix cell's prose.
//
// A finding fires when a SENTENCE containing a `row N` citation also
// contains one of those words (outside the negation), and the row's actual
// status (from the status file) is not in the claim's compatible set —
// label ROW-STATUS-DRIFT. A row absent from the status file, or a status
// file that cannot be read, is its OWN finding — label
// ROW-STATUS-UNCHECKABLE — rather than a silent skip: the old lane silently
// `continue`d when the matrix row could not be parsed, and that silence is
// exactly what the matrix cells losing their leading tokens would turn into
// a permanent, meaningless green.
// Multiple `row N` citations inside one status-bearing sentence are each
// checked against the same claimed status — a simplification the entries
// observed to date do not violate, named rather than hidden.

// QUOTED-MENTION exemption. Same declared-exemption shape
// `lintCorrectionPlacement` already carries (a backtick-quoted marker is a
// citation of the term, not a claim), widened to double-quoted spans too:
// this corpus also quotes another entry's TITLE with `"…"` (a MERGED-into
// reference, an operator quote), and a `row N` citation sitting inside that
// quoted title is being CITED — what the title SAYS — never asserted as a
// live claim about the row. Real motivating instance, found live at
// `90576cf` (BACKLOG.md line 481-482 there): an entry titled `MERGED into
// "kill the relocation-induced conversation-key rotation (threat matrix row
// 26)"` sits in the same SENTENCE (by this file's own sentence splitter) as
// an unrelated "a CLOSED grade vocabulary" a few lines later, and the row
// citation — inside the quoted title — read as a claim that row 26 is
// CLOSED. A backtick-only exemption would not have silenced it: the quoting
// there is double-quote, not backtick, so both forms are checked. Spans a
// newline (`[\s\S]`, non-greedy) — this corpus wraps quoted titles across
// lines exactly as it wraps bold prose (BOLD_SPAN, above).
const QUOTE_SPAN = /"([\s\S]*?)"|`([\s\S]*?)`/g;

function isQuotedSpanContext(body, index) {
  QUOTE_SPAN.lastIndex = 0;
  let m;
  while ((m = QUOTE_SPAN.exec(body))) {
    const start = m.index;
    const end = m.index + m[0].length;
    if (index >= start && index < end) return true;
  }
  return false;
}

const ROW_CITATION = /\brow\s+(\d+)\b/gi;
// KNOWN- excluded too: `bust-triage.mjs`'s own VERDICT_BY_KIND emits
// "KNOWN-OPEN" as a compound term, and a bare `\bOPEN\b` matches the OPEN
// inside it (a word boundary sits right after the hyphen) — found on the
// first dry run against the current file, where an entry quoting
// `bust-triage`'s own verdict ("the entry becomes KNOWN-OPEN") read as an
// assertion that the row is OPEN.
const ROW_STATUS_WORD = /(?<!NOT\s)(?<!KNOWN-)\b(RE-OPENED|OPEN|CLOSED|MITIGATED|OBSERVED|ACCEPTED)\b/g;
// A workable sentence boundary for this corpus's prose: `.`/`!`/`?` followed
// by whitespace and then a capital, digit, `*` (bold) or backtick. Both
// sides of the split are zero-width, so `parts.join("")` reconstructs `body`
// exactly and each part's offset is just the running length total.
const SENTENCE_SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9*`(])/;

function sentencesOf(body) {
  const out = [];
  let start = 0;
  for (const part of body.split(SENTENCE_SPLIT)) {
    out.push({ text: part, start });
    start += part.length;
  }
  return out;
}

// The two findings this lane can now raise. ROW-STATUS-UNCHECKABLE is the
// THIRD ANSWER (dev-loop.md, "A checker has THREE answers"): a row this
// status file cannot resolve is never silently skipped, because the old
// silent-`continue` shape is exactly what the matrix cells losing their
// leading tokens would turn into a permanent, meaningless green.
export const ROW_STATUS_LABELS = ["ROW-STATUS-DRIFT", "ROW-STATUS-UNCHECKABLE"];

// Lints `row N` status assertions inside `## Open` against the status FILE
// (`readRowStatus`, matrix-status.mjs) — never the matrix's own prose.
export function lintRowStatus(text, statusPath = STATUS_PATH) {
  const section = censusOpenSection(text);
  if (!section) return [];
  const findings = [];
  const rowCache = new Map();
  const rowOf = (n) => {
    if (!rowCache.has(n)) rowCache.set(n, readRowStatus(n, { statusPath }));
    return rowCache.get(n);
  };

  for (const entry of splitEntries(section.body)) {
    const title = entry.header.replace(/^- \*\*/, "").trim().slice(0, 80);
    for (const { text: sentence, start } of sentencesOf(entry.body)) {
      const rowMatches = [...sentence.matchAll(ROW_CITATION)];
      if (!rowMatches.length) continue;
      ROW_STATUS_WORD.lastIndex = 0;
      const wordMatch = ROW_STATUS_WORD.exec(sentence);
      if (!wordMatch) continue;
      if (isQuotedSpanContext(entry.body, start + wordMatch.index)) continue;
      const compatible = CLAIM_COMPATIBILITY[wordMatch[1]];
      if (!compatible) continue; // not a status claim under the new enum (OBSERVED)
      for (const rm of rowMatches) {
        if (isQuotedSpanContext(entry.body, start + rm.index)) continue; // cited, not asserted
        const n = Number(rm[1]);
        const line = section.lineOffset + lineOf(entry.body, start + rm.index, entry.startLine);
        const read = rowOf(n);
        if (!read.ok) {
          // THE THIRD ANSWER: the row is not present, or the status file
          // could not be read — a finding, never a silent skip.
          findings.push({
            line, entry: title, row: n,
            label: "ROW-STATUS-UNCHECKABLE",
            asserted: wordMatch[1], reason: read.reason,
          });
          continue;
        }
        const { status } = read.entry;
        if (!compatible.has(status)) {
          findings.push({
            line, entry: title, row: n,
            label: "ROW-STATUS-DRIFT",
            asserted: wordMatch[1], actual: status,
          });
        }
      }
    }
  }
  return findings;
}

function formatRowStatusFinding(f) {
  if (f.label === "ROW-STATUS-UNCHECKABLE") {
    return `WARN backlog-rowstatus line=${f.line} row=${f.row} ${f.label} asserted=${f.asserted} reason="${f.reason}" entry="${f.entry}"`;
  }
  return `WARN backlog-rowstatus line=${f.line} row=${f.row} ${f.label} asserted=${f.asserted} actual=${f.actual} entry="${f.entry}"`;
}

// ==========================================================================
// Premise-true-but-work-remaining lane (default pass)
// ==========================================================================
//
// Why this exists: a retirement pass can verify every FACT in a READY entry
// and still overstate the queue, because premise-truth and work-remaining
// are independent — a `tools/coverage-walk.mjs` graduation entry (frozen at
// `633256b`) was STILL-TRUE and entirely done, its own body citing the
// shipped commits (`7827c4e`, `b94d118`), yet the retirement pass still
// counted it as queued work. See BACKLOG.md, "a derivation asks whether an
// entry's PREMISE is true and never".
//
// REPORT only, by design: an entry legitimately cites a commit that shipped
// ADJACENT work, so this is a flag for a human read, never an auto-re-grade
// — a guard firing on legitimate work trains the override reflex that kills
// it.
//
// SCOPE: `## Open`, READY-graded bullets only — a PARKED/OPEN/HOT entry does
// not carry a "ready to build" claim to overstate.
//
// ONE computable signal, not two: a backtick-quoted commit-shaped hex token
// within ~60 characters of a SHIPPED/CLOSED/DONE word — "cites its own
// commit refs as shipped". The second signal this lane shipped with
// ("split into/out") was REMOVED (operator decision, first dry run against
// the real corpus): it matched entry-LINEAGE prose (a big entry
// deliberately split into sub-entries, tracked both directions — "split
// out FROM the entry above", "SPLIT OUT INTO its own entry below") far more
// often than "my own remainder is done and handed elsewhere", the one case
// the phrase was meant to catch, and the phrase alone cannot tell the two
// apart. 5 real occurrences, 5 false fires — a threshold could have hidden
// today's five without fixing the class, so the signal is gone rather than
// narrowed.
//
// The surviving signal still self-matches on THIS repo's own entry
// proposing this check ("a derivation asks whether an entry's PREMISE is
// true and never"), which narrates the coverage-walk positive in PLAIN
// PROSE ("parts (1) and (2) shipped (`7827c4e`, `b94d118`)") — the same two
// commit hashes, the same word "shipped". The real positive states its
// claim differently: `633256b`'s coverage-walk entry carries it inside a
// SENTENCE-INITIAL BOLD RUN ("**PARTLY SHIPPED 2026-08-08 —
// `7827c4e`...**"), this repo's own convention for a claim about the entry
// itself (the same structural tell `isSentenceInitialBoldContext`, above,
// already uses for the header lane's SUB-CLAIM SCOPE — reused here rather
// than re-derived, and verified by the check itself: a citation NOT in such
// a span does not count, so a hardcoded line number is never needed to
// exclude this entry from flagging itself).

const READY_HEADER = /^- \*\*READY\b/;
const SHIP_WORD = /\b(SHIPPED|CLOSED|DONE)\b/;
const COMMIT_CITATION = /`([0-9a-f]{7,12})`/g;
const SHIP_PROXIMITY = 60;

// Same discipline as the pointer lane's HEX_TOKEN: require both a digit and
// an a-f letter, which is what tells a short SHA apart from an all-letter or
// all-digit word without resolving it against git (this lane never shells
// out — a REPORT over a whole file must not pay a git-probe cost per hit).
// The commit token itself must sit inside a sentence-initial bold run (see
// the header comment above) — a claim ABOUT the entry, never prose
// describing what some OTHER entry's body says.
function findShippedCommitCitation(body) {
  COMMIT_CITATION.lastIndex = 0;
  let m;
  while ((m = COMMIT_CITATION.exec(body))) {
    if (!/[0-9]/.test(m[1]) || !/[a-f]/.test(m[1])) continue;
    if (!isSentenceInitialBoldContext(body, m.index)) continue;
    const start = Math.max(0, m.index - SHIP_PROXIMITY);
    const end = Math.min(body.length, m.index + m[0].length + SHIP_PROXIMITY);
    if (SHIP_WORD.test(body.slice(start, end))) return m[1];
  }
  return null;
}

export function lintPremiseTrue(text) {
  const section = censusOpenSection(text);
  if (!section) return [];
  const findings = [];
  for (const entry of splitEntries(section.body)) {
    if (!READY_HEADER.test(entry.header)) continue;
    const commit = findShippedCommitCitation(entry.body);
    if (!commit) continue;
    findings.push({
      line: section.lineOffset + entry.startLine,
      header: entry.header.replace(/^- \*\*/, "").trim().slice(0, 80),
      signals: [`shipped-commit:${commit}`],
    });
  }
  return findings;
}

function formatPremiseTrueFinding(f) {
  return `WARN backlog-premise line=${f.line} signals=${f.signals.join(",")} header="${f.header}"`;
}

// ==========================================================================
// Late-correction lane (default pass)
// ==========================================================================
//
// Why this exists: a correction appended to the END of an entry is invisible
// to a reader who stops at the head, which is how a bulk correction pass
// cost a wasted dispatch — the dispatcher read the head, asserted the
// pre-correction premise, briefed a lane from it, and the lane caught the
// contradiction only because it read the WHOLE entry. See BACKLOG.md, "a
// correction APPENDED to the end of an entry is invisible to".
//
// SCOPE: `## Open`. Fires on the FIRST correction marker in an entry body
// being past the first THIRD of the entry's own length (by character
// offset) — a long entry may legitimately narrate several corrections in
// sequence, so only the first one's lateness is judged; that is also what
// keeps this a REPORT rather than a gate (a narrated correction referring
// back to an earlier one is legitimate work, not a defect).
//
// A marker inside inline backticks is a CITATION of the term, not a claim —
// this repo's own entry proposing this check quotes `PREMISE CORRECTED`
// (twice) as a literal string and must not flag on itself, the same
// backtick-is-a-citation convention the citation and pointer lanes above
// already use.

const CORRECTION_MARKER = /\b(PREMISE CORRECTED|RE-GRADED|CORRECTED|WITHDRAWN)\b/g;

function isBacktickQuoted(body, index, length) {
  return body[index - 1] === "`" && body[index + length] === "`";
}

export function lintCorrectionPlacement(text) {
  const section = censusOpenSection(text);
  if (!section) return [];
  const findings = [];
  for (const entry of splitEntries(section.body)) {
    CORRECTION_MARKER.lastIndex = 0;
    let m;
    let first = null;
    while ((m = CORRECTION_MARKER.exec(entry.body))) {
      if (isBacktickQuoted(entry.body, m.index, m[0].length)) continue;
      first = m;
      break;
    }
    if (!first) continue;
    const position = first.index / entry.body.length;
    if (position <= 1 / 3) continue;
    findings.push({
      line: section.lineOffset + lineOf(entry.body, first.index, entry.startLine),
      header: entry.header.replace(/^- \*\*/, "").trim().slice(0, 80),
      marker: first[1],
      position: Math.round(position * 100),
    });
  }
  return findings;
}

function formatCorrectionFinding(f) {
  return `WARN backlog-correction line=${f.line} marker="${f.marker}" position=${f.position}% header="${f.header}"`;
}

// ==========================================================================
// Capture-alias resolution lane (default pass) — a verifier cites a capture
// ALIAS and nothing checks whether it still resolves to anything
// ==========================================================================
//
// Why this exists: BACKLOG.md, "a booked verifier names a live capture as
// its calibration evidence and NOTHING pins it at booking time" — measured
// 2026-08-10, two entries' calibration evidence had already rotated off
// disk before anyone noticed, one of them never pinned at all. This lane is
// that entry's MECHANISM half: an alias cited anywhere in an entry's body
// (its `Verifier:` line, or the prose around it — this repo's own real
// instance, BACKLOG.md's `s-captureAT` ROTATED OUT paragraph, cites the
// alias beside the verifier rather than only inside it) is resolved against
// BOTH the alias registry (capture still on disk) and the committed
// fixtures (harvested before it rotated); a WARN fires only when it
// resolves to NEITHER.
//
// SCOPE: `## Open` only — the same boundary every other default-pass report
// lane in this file uses (censusOpenSection). A `## Done` citation is a
// historical record of evidence AT CLOSING TIME, not a live claim that the
// evidence must still exist.
//
// THE TWO COORDINATE SPACES — found the hard way, by the grounding rule
// that a join must fire on a KNOWN positive before a zero is trusted. The
// registry (`~/.local/share/cache-fix/capture-aliases.json`, machine-local,
// never tracked) names a capture by a raw session id (`sid`) or a capture
// FILENAME (`file`, `s-<uuid>-requests.jsonl`) — both name the conversation
// KEY `s-<uuid>` used at capture time. A committed fixture under
// test/fixtures/harvested/ carries a DIFFERENT, scrubbed rendering of that
// same key: `sidToken` (harvest.mjs:252) is `s-${sha256(key).hex.slice(0,
// 12)}` — a HASH of the key, never a truncation of the raw UUID. A naive
// "first 12 hex characters of the UUID, dashes stripped" join LOOKS right
// (same shape: `s-` plus 12 hex characters) and is wrong — checked against
// two aliases whose own registry NOTE already states their pinned fixture's
// filename (`s-captureAD` -> `pinned-s-6052bdc81b48-…`, `s-captureAE` ->
// `pinned-s-468303a4d2d0-…`), the raw-truncation join produces neither
// token; `sidToken("s-" + sid)` — the same function harvest.mjs calls to
// NAME the file — produces both, exactly. That is the join below.
//
// THREE ANSWERS, not two (dev-loop.md, "A checker has THREE answers"): a
// missing or unreadable alias registry is COULD-NOT-VERIFY for the WHOLE
// lane — never rendered as "every alias resolves" (a false green over a
// registry that was never read) and never as a WARN on every citation (the
// non-defect-firing shape this repo already collects). `registryPresent`,
// `scanned`, `resolved`, `unresolved` and `exempt` are always reported, so a
// zero over zero citations reads as clean and a zero over a missing
// registry does not.
//
// EXEMPTION, not a defect: `s-captureA` through `s-captureAA` were assigned
// before this registry existed and are permanently unresolvable by the
// registry's own `_burned.aliases` list (~185 citations in tracked prose,
// per `tools/alias-claim.mjs`'s own comment) — a documented, accepted state
// this lane must not warn on, or it is exactly the "non-defect firing this
// repo already collects" shape. `_burned.aliases` is DATA the registry
// already carries for this purpose (`tools/alias-claim.mjs` reads the same
// list to refuse re-issuing a burned name); read here rather than
// re-enumerated, so the two never drift apart.
//
// A citation is any `s-capture[A-Z]+` token, word-bounded — this corpus's
// one alias shape, closed vocabulary, near-zero false-fire risk (the
// `_burned` exemption is what keeps the 185 historical citations from
// flooding this lane's output).

const CAPTURE_ALIAS_TOKEN = /\bs-capture([A-Z]+)\b/g;

// Resolved per call, not at module load, same reasoning as
// `tools/alias-claim.mjs`'s own `registryPath()`: a caller pointing
// `CACHE_FIX_ALIAS_REGISTRY` at a scratch file after this module is
// imported must be obeyed, and a value captured once at import time would
// silently keep reading the real registry regardless.
const dataHome = () => process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
const defaultAliasRegistryPath = () =>
  process.env.CACHE_FIX_ALIAS_REGISTRY ?? join(dataHome(), "cache-fix", "capture-aliases.json");
const defaultCapturesDir = () => join(dataHome(), "cache-fix", "captures");

// Every tracked path under test/fixtures/harvested/ — `git ls-files` rather
// than a directory walk, so a fixture staged-but-uncommitted (which the
// pre-push absence scan has not yet cleared) is not read as already safe.
function defaultFixtureTokens() {
  try {
    const out = execFileSync("git", ["ls-files", "test/fixtures/harvested"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    return out.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

// One alias's verdict against the registry doc already read. Never touches
// the filesystem itself — `captureExists`/`fixtureTokens` are the injected
// resolvers, same idiom as REAL_ENV/CITATION_REAL_ENV above.
function resolveCaptureAlias(alias, doc, { captureExists, fixtureTokens }) {
  const burned = new Set(doc._burned?.aliases ?? []);
  if (burned.has(alias)) return { status: "exempt" };
  const entry = doc.aliases?.[alias];
  if (!entry) return { status: "unresolved", reason: "alias not present in the registry" };
  const key = entry.sid
    ? `s-${entry.sid}`
    : entry.file
      ? entry.file.replace(/-requests\.jsonl$/, "")
      : null;
  if (!key) return { status: "unresolved", reason: "registry entry carries neither sid nor file" };
  const diskName = `${key}-requests.jsonl`;
  const fixtureToken = sidToken(key); // "s-<sha12>" — the fixture-filename rendering
  if (captureExists(diskName)) return { status: "resolved" };
  if (fixtureTokens().some((f) => f.includes(fixtureToken))) return { status: "resolved" };
  return {
    status: "unresolved",
    reason: `not on disk (${diskName}) and no committed fixture matches ${fixtureToken}`,
  };
}

// Lints capture-alias resolution inside `## Open`. `env` overrides the
// resolvers (`registryPath`, `captureExists`, `fixtureTokens`) — the same
// injection idiom lintPointers/lintCitations/lintReadyBar already use above,
// so red-first arms can pin the RULE against synthetic registry/fixture
// content without touching the live machine.
export function lintCaptureAliases(text, env = {}) {
  const {
    registryPath = defaultAliasRegistryPath(),
    captureExists = (name) => existsSync(join(defaultCapturesDir(), name)),
    fixtureTokens = defaultFixtureTokens,
  } = env;

  const citations = [];
  const section = censusOpenSection(text);
  if (section) {
    for (const entry of splitEntries(section.body)) {
      const title = entry.header.replace(/^- \*\*/, "").trim().slice(0, 80);
      CAPTURE_ALIAS_TOKEN.lastIndex = 0;
      let m;
      while ((m = CAPTURE_ALIAS_TOKEN.exec(entry.body))) {
        citations.push({
          alias: `s-capture${m[1]}`,
          line: section.lineOffset + lineOf(entry.body, m.index, entry.startLine),
          entry: title,
        });
      }
    }
  }

  let doc;
  try {
    doc = JSON.parse(readFileSync(registryPath, "utf8"));
  } catch (e) {
    // THE THIRD ANSWER: could-not-verify, never a silent "everything
    // resolves" and never a WARN-storm over citations nothing could check.
    return {
      ok: false,
      reason: `alias registry unreadable at ${registryPath}: ${e?.message ?? e}`,
      registryPresent: false,
      scanned: citations.length,
      resolved: 0,
      unresolved: 0,
      exempt: 0,
      findings: [],
    };
  }

  let fixtureCache = null;
  const fixtureTokensOnce = () => (fixtureCache ??= fixtureTokens());

  const findings = [];
  let resolved = 0;
  let exempt = 0;
  for (const c of citations) {
    const r = resolveCaptureAlias(c.alias, doc, { captureExists, fixtureTokens: fixtureTokensOnce });
    if (r.status === "resolved") {
      resolved++;
    } else if (r.status === "exempt") {
      exempt++;
    } else {
      findings.push({ line: c.line, entry: c.entry, alias: c.alias, reason: r.reason });
    }
  }

  return {
    ok: true,
    reason: null,
    registryPresent: true,
    scanned: citations.length,
    resolved,
    unresolved: findings.length,
    exempt,
    findings,
  };
}

function formatCaptureAliasFinding(f) {
  return `WARN backlog-capture-alias line=${f.line} alias=${f.alias} entry="${f.entry}" reason="${f.reason}"`;
}

// ==========================================================================
// READY-bar lane (--ready-bar) — REPORT ONLY
// ==========================================================================
//
// Why this exists: the repo is declaring a THIRD backlog grade — after the
// dispatcher's Phase 2 edit to BACKLOG.md, `- **READY` means "the scheduled
// head" and every entry that keeps the grade must carry a checkable anchor,
// write-set and verifier (everything that used to be READY becomes
// `- **RECORD`). This lane is the mechanized form of that bar. It does not
// decide which entries keep the READY grade — that edit is BACKLOG.md's,
// outside this file's write boundary — it only checks that whatever DOES
// carry the grade satisfies the three markers.
//
// SCOPE: `## Open`, READY-graded bullets only (`READY_HEADER`, already
// defined above for the premise-true lane — reused, not re-derived). Any
// other grade is ignored entirely.
//
// Each in-scope entry must carry three markers, each starting a line
// (leading whitespace tolerated): `Anchor:`, `Write-set:`, `Verifier:`. A
// marker's ABSENCE is its own finding (MISSING-*); a marker PRESENT but
// unusable is a separate finding (ANCHOR-UNRESOLVED / WRITE-SET-DEAD /
// VERIFIER-EMPTY) — the two are never folded together, since "no anchor at
// all" and "anchor present but wrong" need different fixes from the reader.
//
//   Anchor:      either `row <N>` with N in 1..29 (the matrix's row range),
//                or a repo-relative path that exists. Neither -> resolved is
//                false and the finding is ANCHOR-UNRESOLVED.
//   Write-set:   comma- or whitespace-separated paths (backtick-wrapping
//                tolerated, the corpus's own citation idiom). A NOT-YET
//                -EXISTING file under an existing directory is the normal
//                case for new work and must not fire — only a token whose
//                PARENT directory is itself absent is WRITE-SET-DEAD.
//   Verifier:    any non-empty text after the marker counts; empty is
//                VERIFIER-EMPTY.

const READY_BAR_ANCHOR = /^[ \t]*Anchor:(.*)$/m;
const READY_BAR_WRITE_SET = /^[ \t]*Write-set:(.*)$/m;
const READY_BAR_VERIFIER = /^[ \t]*Verifier:(.*)$/m;
const READY_BAR_ANCHOR_ROW = /^row\s+(\d+)$/i;
const READY_BAR_MAX_ROW = 29;
const READY_BAR_BACKTICK_TRIM = /^`+|`+$/g;

// Default resolvers hit the real filesystem, same injection idiom as
// REAL_ENV/CITATION_REAL_ENV above. `dirExists` — not `pathExists` — is what
// WRITE-SET-DEAD needs: the FILE need not exist yet, only its parent
// directory.
const READY_BAR_REAL_ENV = {
  pathExists: (p) => existsSync(join(REPO_ROOT, p)),
  dirExists: (p) => existsSync(join(REPO_ROOT, dirname(p))),
};

function readyBarWriteSetTokens(value) {
  return value
    .split(/[,\s]+/)
    .map((t) => t.replace(READY_BAR_BACKTICK_TRIM, "").trim())
    .filter(Boolean);
}

// Lints the READY entry-quality bar. `env` overrides the resolvers (see
// READY_BAR_REAL_ENV) — same injection idiom as lintPointers/lintCitations,
// so each condition can be mutated one at a time.
export function lintReadyBar(text, env = {}) {
  const { pathExists, dirExists } = { ...READY_BAR_REAL_ENV, ...env };
  const section = censusOpenSection(text);
  if (!section) return [];
  const findings = [];

  for (const entry of splitEntries(section.body)) {
    if (!READY_HEADER.test(entry.header)) continue;
    const title = entry.header.replace(/^- \*\*/, "").trim().slice(0, 80);
    const headerLine = section.lineOffset + entry.startLine;
    const add = (label, token, proof, line) => findings.push({ line, title, label, token, proof });

    const anchorMatch = READY_BAR_ANCHOR.exec(entry.body);
    if (!anchorMatch) {
      add("MISSING-ANCHOR", "Anchor", "no `Anchor:` line in the entry body", headerLine);
    } else {
      const value = anchorMatch[1].trim().replace(READY_BAR_BACKTICK_TRIM, "").trim();
      const line = section.lineOffset + lineOf(entry.body, anchorMatch.index, entry.startLine);
      const rowMatch = READY_BAR_ANCHOR_ROW.exec(value);
      const resolved = rowMatch
        ? Number(rowMatch[1]) >= 1 && Number(rowMatch[1]) <= READY_BAR_MAX_ROW
        : pathExists(value);
      if (!resolved) {
        add(
          "ANCHOR-UNRESOLVED",
          value,
          rowMatch ? `row ${rowMatch[1]} outside 1..${READY_BAR_MAX_ROW}` : `test -e ${value} -> absent`,
          line,
        );
      }
    }

    const writeSetMatch = READY_BAR_WRITE_SET.exec(entry.body);
    if (!writeSetMatch) {
      add("MISSING-WRITE-SET", "Write-set", "no `Write-set:` line in the entry body", headerLine);
    } else {
      const value = writeSetMatch[1].trim();
      const line = section.lineOffset + lineOf(entry.body, writeSetMatch.index, entry.startLine);
      for (const token of readyBarWriteSetTokens(value)) {
        if (!dirExists(token)) {
          add("WRITE-SET-DEAD", token, `test -d ${dirname(token)} -> absent`, line);
        }
      }
    }

    const verifierMatch = READY_BAR_VERIFIER.exec(entry.body);
    if (!verifierMatch) {
      add("MISSING-VERIFIER", "Verifier", "no `Verifier:` line in the entry body", headerLine);
    } else {
      const value = verifierMatch[1].trim();
      const line = section.lineOffset + lineOf(entry.body, verifierMatch.index, entry.startLine);
      if (!value) add("VERIFIER-EMPTY", "Verifier", "`Verifier:` line carries no command text", line);
    }
  }
  return findings;
}

export const READY_BAR_LABELS = [
  "MISSING-ANCHOR",
  "MISSING-WRITE-SET",
  "MISSING-VERIFIER",
  "ANCHOR-UNRESOLVED",
  "WRITE-SET-DEAD",
  "VERIFIER-EMPTY",
];

function formatReadyBarFinding(f) {
  return `WARN backlog-ready-bar line=${f.line} ${f.label} token="${f.token}" entry="${f.title}" proof=${f.proof}`;
}

function readInput(pathArg) {
  if (pathArg === "-") return readFileSync(0, "utf8");
  return readFileSync(pathArg ?? DEFAULT_BACKLOG, "utf8");
}

// --census suppresses the normal header-lint output and emits the census
// instead (per the CLI usage comment at the top of this file). It never
// throws past this function: an internal error here still exits 0, per the
// WARN-only convention the whole tool keeps (see the try/catch at the
// bottom).
function runCensus(args) {
  const sinceIdx = args.indexOf("--since");
  const sinceRef = sinceIdx >= 0 ? args[sinceIdx + 1] : null;
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--census") continue;
    if (args[i] === "--since") {
      i++; // also skip its value
      continue;
    }
    rest.push(args[i]);
  }
  const text = readInput(rest[0]);
  const oldText = sinceRef
    ? execFileSync("git", ["show", `${sinceRef}:BACKLOG.md`], { cwd: REPO_ROOT, encoding: "utf8" })
    : undefined;
  process.stdout.write(censusText(text, sinceRef ? { sinceRef, oldText } : {}));
  return 0;
}

function main(argv) {
  const args = argv.slice(2);
  if (args.includes("--census")) return runCensus(args);
  const wantPointers = args.includes("--pointers");
  const wantReadyBar = args.includes("--ready-bar");
  const pathArg = args.find((a) => a !== "--pointers" && a !== "--ready-bar");
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

  // The four `## Open`-scoped report lanes below run in every default
  // invocation (no flag), per the citation lane's own done-criterion: "the
  // check runs inside backlog-lint's existing pass (no new entry point)".
  // All four are REPORT-only — WARN lines plus a summary with every bucket
  // named, even at zero, so "clean" and "could not check" stay distinguishable.

  const citations = lintCitations(text);
  for (const f of citations) {
    if (f.verdict !== "MATCH") process.stdout.write(`${formatCitationFinding(f)}\n`);
  }
  const citationCounts = CITATION_VERDICTS.map(
    (v) => `${v}=${citations.filter((f) => f.verdict === v).length}`,
  ).join(" ");
  process.stdout.write(`backlog-citations: ${citations.length} checked — REPORT only — ${citationCounts}\n`);

  const rowStatus = lintRowStatus(text);
  for (const f of rowStatus) process.stdout.write(`${formatRowStatusFinding(f)}\n`);
  process.stdout.write(
    rowStatus.length
      ? `backlog-rowstatus: ${rowStatus.length} finding(s) — REPORT only\n`
      : "backlog-rowstatus: clean\n",
  );

  const premiseTrue = lintPremiseTrue(text);
  for (const f of premiseTrue) process.stdout.write(`${formatPremiseTrueFinding(f)}\n`);
  process.stdout.write(
    premiseTrue.length
      ? `backlog-premise: ${premiseTrue.length} finding(s) — REPORT only\n`
      : "backlog-premise: clean\n",
  );

  const corrections = lintCorrectionPlacement(text);
  for (const f of corrections) process.stdout.write(`${formatCorrectionFinding(f)}\n`);
  process.stdout.write(
    corrections.length
      ? `backlog-correction: ${corrections.length} finding(s) — REPORT only\n`
      : "backlog-correction: clean\n",
  );

  const captureAliases = lintCaptureAliases(text);
  if (!captureAliases.ok) {
    process.stdout.write(
      `backlog-capture-alias: COULD NOT VERIFY — ${captureAliases.reason} — ` +
        `scanned=${captureAliases.scanned} registry-present=no\n`,
    );
  } else {
    for (const f of captureAliases.findings) process.stdout.write(`${formatCaptureAliasFinding(f)}\n`);
    process.stdout.write(
      `backlog-capture-alias: scanned=${captureAliases.scanned} resolved=${captureAliases.resolved} ` +
        `unresolved=${captureAliases.unresolved} exempt=${captureAliases.exempt} registry-present=yes` +
        ` — REPORT only\n`,
    );
  }

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

  if (wantReadyBar) {
    const readyBar = lintReadyBar(text);
    for (const f of readyBar) {
      process.stdout.write(`${formatReadyBarFinding(f)}\n`);
    }
    const readyBarCounts = READY_BAR_LABELS.map(
      (l) => `${l}=${readyBar.filter((f) => f.label === l).length}`,
    ).join(" ");
    process.stdout.write(
      `backlog-ready-bar: ${readyBar.length} finding(s) — REPORT only — ${readyBarCounts}\n`,
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
