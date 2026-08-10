#!/usr/bin/env node
// named-unbooked-scan — the NAMED-AND-UNBOOKED check (BACKLOG.md lines
// 4239-4295, "The NAMED-AND-UNBOOKED check" + "SCOPE EXTENSION 2026-08-07").
//
// It answers: which gap-language statements in a session's own assistant
// output did NOT resolve to a durable carrier (a commit, a BACKLOG.md entry,
// or any other tracked file change) in that same session?
//
// This is a REPORTING tool, same house style as tools/backlog-lint.mjs: it
// never blocks and never exits non-zero on findings — findings are its
// output. Exit code is non-zero only on the tool's own operational failure
// (unreadable transcript, bad args, a --repo git failure).
//
// -----------------------------------------------------------------------
// PATTERN CLASSES — declared as data (below), not scattered regex literals,
// so a booked third class (REACH-FAILURE language — not built here; it has
// no red-first case named yet, per this tool's brief) is addable as one more
// entry in PATTERN_CLASSES rather than a code change.
//
// Class 1, GAP-LANGUAGE: phrases that name a gap in ordinary prose. The six
// phrases below are the brief's literal list, cited from the backlog entry.
// ONE deviation was added, cited to a real transcript instance (see the
// comment beside it): the brief's "I'd carry forward" did not fire on the
// actual 2026-08-06 sentence, which reads "worth carrying forward" —
// different inflection of the same idiom. Rather than special-case that one
// string, the phrase list gets a second, slightly wider entry that also
// still requires "forward" so it stays anchored to the same idiom.
//
// Class 2, SELF-CORRECTION-LIST: fires once per assistant MESSAGE that
// enumerates two or more of the session's own errors — a bulleted list where
// at least two bullets carry first-person possessive/pronoun language
// ("I", "my", "our", ...) together with an error/fault word. This is a
// per-message COUNT, never a phrase match (a single bullet naming one error
// does not fire). Where a flagged bullet itself contains a "misfired N
// times ...: A, B, and C" style internal enumeration, each of the N items is
// reported and resolved separately — the real transcript case this class was
// built against ("My own instruments misfired three times tonight: a
// process-per-line scan ..., a jq ..., and `$?` ...") is exactly this shape,
// and treating the whole bullet as one atom would hide which of the three
// sub-failures got picked up and which did not.
//
// -----------------------------------------------------------------------
// RESOLUTION. A hit resolves if, at or before `--until`, the SAME SESSION
// produced a carrier referencing it. This tool has no direct session-to-
// commit mapping (a transcript file carries no commit SHA), so "same
// session" is approximated by wall-clock containment: a commit counts as a
// candidate carrier if its author date falls inside the transcript's own
// session window (first record timestamp .. last record timestamp, plus a
// short trailing grace period — commits routinely land a few minutes after
// the last transcript record that describes them). A candidate carrier must
// also postdate the hit itself (a gap is resolved by what comes after it,
// never by an earlier unrelated commit that happens to share vocabulary).
//
// Content match, not verbatim match: a hit resolves against a candidate
// commit if any ADJACENT WORD PAIR from the hit's sentence — where at least
// one of the two words is non-trivial (see CONTENT_MIN_LEN) — appears
// verbatim (whitespace-normalized, case-insensitive) in that commit's own
// text (its message body plus the ADDED lines of its diff, across every
// changed file — this covers "a BACKLOG.md entry" and "any other tracked
// file change" from the brief in one pass, since both are visible in the
// commit's diff). This is deliberately a literal SUBSTRING match on a real
// bigram from the hit's own sentence, not a bag-of-words overlap score:
// this tool's brief explicitly warns against a matcher tuned to fit one
// expected split ("tuning an instrument to ratify its own premise",
// docs/dev-loop.md's "Adding a check"), so the matcher here is the same
// rule whichever hit or commit it is run against. See this tool's own test
// suite and the dispatch report for what this design finds when actually
// run against the two named red-first cases — the SECOND one (the
// three-misfire paragraph) does NOT reproduce a 2-of-3 split under this
// discriminating matcher; that divergence is reported, not papered over.
//
// -----------------------------------------------------------------------
// CLI:
//   node tools/named-unbooked-scan.mjs --transcript <path> [--repo <path>]
//     [--until <commit-or-ISO>] [--json]

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// ==========================================================================
// Pattern classes (data)
// ==========================================================================

export const PATTERN_CLASSES = [
  {
    id: "gap-language",
    label: "GAP-LANGUAGE",
    kind: "phrase",
    phrases: [
      "we should",
      "worth booking",
      "the gap is",
      "i'd carry forward",
      // DEVIATION (cited): the brief's literal "I'd carry forward" did not
      // match the real 2026-08-06 instance ("worth carrying forward" —
      // 6c6fdced…, assistant message at 2026-08-06T13:45:21.166Z). Widened
      // to the shared idiom rather than adding a second literal string.
      /\bcarry(?:ing)? forward\b/i,
      "worth watching",
      "not yet booked",
    ],
  },
  {
    id: "self-correction-list",
    label: "SELF-CORRECTION-LIST",
    kind: "self-error-count",
    minCount: 2,
  },
  // A third class (REACH-FAILURE language) is booked but NOT implemented —
  // it has no red-first case named yet, per this tool's brief, and a check
  // that never went red on a real defect does not ship. Add it here as one
  // more { id, label, kind, ... } entry when that case exists.
];

const SELF_PRONOUN_RE = /\b(i|i'd|i'll|i've|my|mine|our|ours|we'd|we've)\b/i;
const ERROR_WORD_RE =
  /\b(fail(?:ed|s|ing)?|fault|wrong|mistake|misfire[ds]?|bug|crash(?:ed|ing)?|broke|broken|error)\b/i;
const BULLET_START_RE = /^[-*]\s+\*\*/;
const ENUM_COUNT_WORDS = "one|two|three|four|five|six|seven|eight|nine|ten|\\d+";
const ENUM_RE = new RegExp(`\\b(?:${ENUM_COUNT_WORDS})\\s+times\\b[^:]*:\\s*(.+?)\\.(?:\\s|$)`, "i");

// ==========================================================================
// Transcript reading
// ==========================================================================

// Parses a CC transcript .jsonl. Malformed individual lines are skipped
// (one damaged line should not sink the whole scan); an unreadable FILE is
// an operational failure and propagates to the caller.
export function scanTranscript(path) {
  const raw = readFileSync(path, "utf8");
  const records = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      // skip — one damaged JSONL line is not a reason to fail the whole scan
    }
  }
  return records;
}

// One entry per assistant message that carries at least one text block —
// concatenated across text blocks (a message can carry more than one).
export function assistantMessages(records) {
  const msgs = [];
  for (const r of records) {
    if (r?.type !== "assistant") continue;
    const content = r.message?.content;
    if (!Array.isArray(content)) continue;
    const text = content
      .filter((b) => b && b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("\n\n");
    if (!text) continue;
    msgs.push({ uuid: r.uuid, timestamp: r.timestamp, text });
  }
  return msgs;
}

// The transcript's own session window: first and last timestamped record,
// of ANY record type (not only assistant messages) — matches the brief's
// "from the transcript's first record timestamp to its last".
export function sessionWindow(records) {
  let start = null;
  let end = null;
  for (const r of records) {
    if (!r?.timestamp) continue;
    const d = new Date(r.timestamp);
    if (Number.isNaN(d.getTime())) continue;
    if (!start || d < start) start = d;
    if (!end || d > end) end = d;
  }
  return { start, end };
}

// ==========================================================================
// Sentence / bigram extraction (shared by both classes' resolution step)
// ==========================================================================

// The prose window around a match: scan back to the previous sentence
// boundary (". ", "! ", "? ", or a blank line) and forward to the next one.
// Deliberately simple — this corpus's markdown prose is what it runs on,
// not general text.
export function extractSentence(text, matchIndex) {
  const before = text.slice(0, matchIndex);
  const after = text.slice(matchIndex);
  const boundary = Math.max(
    before.lastIndexOf(". "),
    before.lastIndexOf(".\n"),
    before.lastIndexOf("! "),
    before.lastIndexOf("? "),
    before.lastIndexOf("\n\n"),
  );
  const start = boundary === -1 ? 0 : boundary + 2;
  const m = after.match(/[.!?](\s|$)/);
  const relEnd = m ? m.index + 1 : after.length;
  return text.slice(start, matchIndex + relEnd).trim();
}

const CONTENT_MIN_LEN = 5;
const STOPWORD_LIST = [
  "a", "an", "the", "this", "that", "these", "those", "and", "or", "but",
  "nor", "so", "yet", "if", "because", "while", "although", "though",
  "since", "until", "unless", "whether", "either", "neither", "both",
  "each", "all", "any", "none", "one", "two", "three", "four", "first",
  "second", "third", "before", "after", "again", "here", "there", "when",
  "where", "why", "how", "what", "which", "who", "whom", "whose", "does",
  "did", "doing", "done", "get", "got", "going", "make", "made", "take",
  "took", "taken", "come", "came", "into", "onto", "over", "under",
  "above", "below", "between", "among", "through", "during", "without",
  "within", "along", "across", "behind", "beyond", "plus", "minus", "per",
  "via", "for", "not", "out", "off", "upon", "been", "being", "only",
  "also", "more", "most", "some", "such", "other", "than", "they", "them",
  "their", "was", "were", "had", "has", "have", "will", "would", "could",
  "should", "from", "with", "as", "at", "by", "in", "of", "on", "to",
  "up", "it", "its", "is", "are", "be", "am", "you", "he", "she", "we",
  "your", "our", "his", "her", "our", "my", "me", "him", "us", "them",
  "already", "instead", "about", "still", "just", "very", "much", "same",
  "own", "then", "than", "even", "back", "into", "onto",
  // Common connectors/adverbs — long enough to pass CONTENT_MIN_LEN but too
  // generic to count as "distinctive". Added after this tool's own
  // red-first run against 95f9c89 resolved an UNRELATED bullet purely on
  // the bigram "rather than" (present in both the hit and the commit by
  // coincidence, not because either references the other) — a resolved
  // finding is a SILENCED gap, so a weak match here is the more dangerous
  // failure direction and earns a deliberately wider stopword list.
  "rather", "actually", "really", "simply", "clearly", "however",
  "therefore", "toward", "towards", "regarding", "various", "certain",
  "particular", "generally", "specifically", "primarily", "essentially",
  "basically", "obviously", "presumably", "apparently", "arguably",
  "typically", "usually", "often", "rarely", "sometimes", "always",
  "never", "quite", "fairly", "somewhat", "largely", "mostly", "mainly",
  "roughly", "approximately", "exactly", "precisely", "directly",
  "indirectly", "immediately", "eventually", "finally", "initially",
  "originally", "previously", "currently", "recently", "shortly",
  "briefly", "significantly", "substantially", "considerably",
  "relatively", "comparatively", "deliberately", "definitely",
];
const STOPWORDS = new Set(STOPWORD_LIST);

function isContentWord(w) {
  return w.length >= CONTENT_MIN_LEN && !STOPWORDS.has(w.toLowerCase());
}

// Every adjacent word pair in `text` where at least one word qualifies as
// "content" (length >= CONTENT_MIN_LEN, not a stopword) — these are the
// candidate "distinctive noun phrases" tested against a carrier.
export function distinctiveBigrams(text) {
  const words = text.match(/[A-Za-z][A-Za-z'-]*/g) || [];
  const bigrams = [];
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i];
    const b = words[i + 1];
    if (isContentWord(a) || isContentWord(b)) {
      bigrams.push(`${a} ${b}`);
    }
  }
  return bigrams;
}

function normalizeWhitespace(s) {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Returns the first bigram from `hitText` found verbatim (whitespace-
// normalized, case-insensitive, WORD-BOUNDED) inside `carrierText`, or
// null. Word boundaries matter: a plain substring check would let "demanded
// a" match inside "demanded as" (a real false match caught while building
// this tool, on the fc4b7aa red-first case itself) — \b on both ends is
// what a "distinctive noun phrase" match requires.
export function findMatchingPhrase(hitText, carrierText) {
  const carrierNorm = normalizeWhitespace(carrierText);
  for (const bg of distinctiveBigrams(hitText)) {
    const re = new RegExp(`\\b${escapeRegex(normalizeWhitespace(bg))}\\b`, "i");
    if (re.test(carrierNorm)) return bg;
  }
  return null;
}

// ==========================================================================
// Class 1 — GAP-LANGUAGE
// ==========================================================================

export function detectGapLanguage(messages, patternClass) {
  const hits = [];
  for (const msg of messages) {
    for (const p of patternClass.phrases) {
      const re =
        p instanceof RegExp
          ? new RegExp(p.source, p.flags.includes("g") ? p.flags : `${p.flags}g`)
          : new RegExp(escapeRegex(p), "gi");
      let m;
      while ((m = re.exec(msg.text))) {
        hits.push({
          classId: patternClass.id,
          classLabel: patternClass.label,
          matched: m[0],
          sentence: extractSentence(msg.text, m.index),
          timestamp: msg.timestamp,
          uuid: msg.uuid,
        });
        if (m.index === re.lastIndex) re.lastIndex++; // guard zero-width matches
      }
    }
  }
  return hits;
}

// ==========================================================================
// Class 2 — SELF-CORRECTION-LIST
// ==========================================================================

function extractBulletText(lines, startIdx) {
  const parts = [lines[startIdx]];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") break;
    if (BULLET_START_RE.test(line.trim())) break;
    if (/^#/.test(line.trim())) break;
    parts.push(line);
  }
  return parts.join(" ").trim();
}

// Splits the tail of a "misfired N times ...: A, B, and C" enumeration into
// its N items. The final ", and " (or " and ", if the list has only two
// items) is normalized to a plain comma before splitting on top-level
// commas — deliberately narrow: it is the exact shape of the real defect
// this class was built against, not a general list parser.
export function splitEnumeratedSubitems(bulletText) {
  const m = ENUM_RE.exec(bulletText);
  if (!m) return [bulletText];
  const tail = m[1];
  const normalized = tail.replace(/,?\s+and\s+(?=[^,]+$)/, ", ");
  const items = normalized
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length >= 2 ? items : [bulletText];
}

export function detectSelfCorrection(messages, patternClass) {
  const hits = [];
  for (const msg of messages) {
    const lines = msg.text.split("\n");
    const bulletIdx = [];
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (BULLET_START_RE.test(trimmed) && SELF_PRONOUN_RE.test(trimmed) && ERROR_WORD_RE.test(trimmed)) {
        bulletIdx.push(i);
      }
    }
    if (bulletIdx.length < patternClass.minCount) continue;
    for (const idx of bulletIdx) {
      const bulletText = extractBulletText(lines, idx);
      for (const item of splitEnumeratedSubitems(bulletText)) {
        hits.push({
          classId: patternClass.id,
          classLabel: patternClass.label,
          matched: "self-correction-item",
          sentence: item,
          timestamp: msg.timestamp,
          uuid: msg.uuid,
        });
      }
    }
  }
  return hits;
}

// ==========================================================================
// Git carrier lookup
// ==========================================================================

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

// null (no --until given) -> null, meaning "no extra cap beyond the session
// window". An ISO-looking string is parsed directly; anything else is
// resolved as a git commit-ish via its author date.
export function resolveUntilDate(untilArg, repoPath) {
  if (!untilArg) return null;
  if (ISO_DATE_RE.test(untilArg)) {
    const d = new Date(untilArg);
    if (Number.isNaN(d.getTime())) throw new Error(`--until is not a valid ISO date: ${untilArg}`);
    return d;
  }
  let iso;
  try {
    iso = git(["log", "-1", "--format=%aI", untilArg], repoPath);
  } catch (e) {
    throw new Error(`--until does not resolve as a commit: ${untilArg} (${e.message})`);
  }
  if (!iso) throw new Error(`--until does not resolve as a commit: ${untilArg}`);
  return new Date(iso);
}

// Commits reachable from HEAD with author date in [sinceDate, untilDate],
// oldest first.
export function listCandidateCommits(repoPath, sinceDate, untilDate) {
  const args = ["log", "--format=%H%x1f%aI"];
  if (sinceDate) args.push(`--since=${sinceDate.toISOString()}`);
  if (untilDate) args.push(`--until=${untilDate.toISOString()}`);
  let out;
  try {
    out = git(args, repoPath);
  } catch (e) {
    throw new Error(`git log failed in ${repoPath}: ${e.message}`);
  }
  if (!out) return [];
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, iso] = line.split("\x1f");
      return { sha, date: new Date(iso) };
    })
    .reverse();
}

// A commit's own text: its full message plus the ADDED lines of its diff
// across every changed file, "-"/"+++"/"---" diff plumbing stripped. This is
// what "a commit (message body), a BACKLOG.md entry, or any other tracked
// file change" collapses to in one probe.
export function commitBlob(repoPath, sha) {
  const raw = execFileSync("git", ["show", "--no-color", sha], { cwd: repoPath, encoding: "utf8" });
  const kept = [];
  let inDiff = false;
  for (const line of raw.split("\n")) {
    if (line.startsWith("diff --git")) {
      inDiff = true;
      continue;
    }
    if (!inDiff) {
      kept.push(line);
      continue;
    }
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) kept.push(line.slice(1));
  }
  return kept.join("\n");
}

// ==========================================================================
// Resolution
// ==========================================================================

// Mutates each hit in place, adding .resolved / .resolvedBy / .matchedPhrase.
export function resolveHits(hits, repoPath, candidateCommits) {
  for (const hit of hits) {
    const hitDate = new Date(hit.timestamp);
    let resolved = false;
    let resolvedBy = null;
    let matchedPhrase = null;
    for (const c of candidateCommits) {
      if (!(c.date > hitDate)) continue; // carrier must postdate the hit
      const blob = commitBlob(repoPath, c.sha);
      const phrase = findMatchingPhrase(hit.sentence, blob);
      if (phrase) {
        resolved = true;
        resolvedBy = c.sha;
        matchedPhrase = phrase;
        break;
      }
    }
    hit.resolved = resolved;
    hit.resolvedBy = resolvedBy;
    hit.matchedPhrase = matchedPhrase;
  }
  return hits;
}

// ==========================================================================
// CLI
// ==========================================================================

function parseArgs(argv) {
  const args = { transcript: null, repo: process.cwd(), until: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--transcript") args.transcript = argv[++i];
    else if (a === "--repo") args.repo = argv[++i];
    else if (a === "--until") args.until = argv[++i];
    else if (a === "--json") args.json = true;
    else throw new Error(`unrecognized argument: ${a}`);
  }
  if (!args.transcript) throw new Error("--transcript <path> is required");
  return args;
}

const TRAILING_GRACE_MS = 5 * 60 * 1000;

export function run(argv, { out = (s) => process.stdout.write(s), err = (s) => process.stderr.write(s) } = {}) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    err(`named-unbooked-scan: ${e.message}\n`);
    return 2;
  }

  let records;
  try {
    records = scanTranscript(args.transcript);
  } catch (e) {
    err(`named-unbooked-scan: cannot read transcript ${args.transcript}: ${e.message}\n`);
    return 2;
  }

  const messages = assistantMessages(records);
  const { start, end } = sessionWindow(records);
  if (!start || !end) {
    err("named-unbooked-scan: transcript has no timestamped records\n");
    return 2;
  }

  let untilDate;
  try {
    untilDate = resolveUntilDate(args.until, args.repo);
  } catch (e) {
    err(`named-unbooked-scan: ${e.message}\n`);
    return 2;
  }

  const horizon = untilDate && untilDate < end ? untilDate : end;
  const fetchEnd = new Date(Math.max(end.getTime(), untilDate ? untilDate.getTime() : 0) + TRAILING_GRACE_MS);

  let candidateCommits;
  try {
    candidateCommits = listCandidateCommits(args.repo, start, fetchEnd);
  } catch (e) {
    err(`named-unbooked-scan: ${e.message}\n`);
    return 2;
  }
  // Resolution only ever looks at carriers at or before the horizon, whether
  // that horizon came from --until or defaulted to the session's own end.
  const withinHorizon = candidateCommits.filter((c) => c.date <= horizon);

  const hits = [];
  for (const cls of PATTERN_CLASSES) {
    if (cls.kind === "phrase") hits.push(...detectGapLanguage(messages, cls));
    else if (cls.kind === "self-error-count") hits.push(...detectSelfCorrection(messages, cls));
  }
  resolveHits(hits, args.repo, withinHorizon);

  const unresolved = hits.filter((h) => !h.resolved);
  const perClass = {};
  for (const cls of PATTERN_CLASSES) {
    const classHits = hits.filter((h) => h.classId === cls.id);
    perClass[cls.label] = { total: classHits.length, unresolved: classHits.filter((h) => !h.resolved).length };
  }

  if (args.json) {
    out(
      JSON.stringify(
        {
          examined: {
            messagesScanned: messages.length,
            sessionWindow: { start: start.toISOString(), end: end.toISOString() },
            until: untilDate ? untilDate.toISOString() : null,
            horizon: horizon.toISOString(),
            candidateCommitsConsidered: withinHorizon.length,
          },
          hits: hits.map((h) => ({
            class: h.classLabel,
            matched: h.matched,
            sentence: h.sentence,
            timestamp: h.timestamp,
            resolved: h.resolved,
            resolvedBy: h.resolvedBy,
            matchedPhrase: h.matchedPhrase,
          })),
          summary: { total: hits.length, unresolved: unresolved.length, perClass },
        },
        null,
        2,
      ) + "\n",
    );
    return 0;
  }

  out(
    `named-unbooked-scan: examined ${messages.length} assistant message(s), ` +
      `session window ${start.toISOString()}..${end.toISOString()}, ` +
      `horizon ${horizon.toISOString()}${untilDate ? " (--until)" : " (session end)"}, ` +
      `${withinHorizon.length} candidate carrier commit(s) considered\n`,
  );
  for (const h of unresolved) {
    const snippet = h.sentence.replace(/"/g, '\\"').replace(/\s+/g, " ").slice(0, 200);
    out(`WARN named-unbooked ts=${h.timestamp} class=${h.classLabel} matched="${h.matched}" sentence="${snippet}"\n`);
  }
  const countsLine = PATTERN_CLASSES.map((c) => `${c.label}=${perClass[c.label].unresolved}/${perClass[c.label].total}`).join(
    " ",
  );
  out(
    `named-unbooked-scan: ${unresolved.length} unresolved of ${hits.length} hit(s) — REPORT only, a list to walk, ` +
      `never a gate — ${countsLine}\n`,
  );
  return 0; // WARN-only: never fails on findings, only on operational errors above.
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  let code;
  try {
    code = run(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`named-unbooked-scan: internal error — ${err?.message ?? err}\n`);
    code = 2;
  }
  process.exit(code);
}
