#!/usr/bin/env node
// entrypoint-census — graduates the hand audit's session-entrypoint
// measurement (docs/audits/carrier-rework-entrypoints-2026-08-26.md) into a
// re-runnable instrument.
//
// WHY THIS EXISTS (carrier-rework design doc §7, item W0.4; decision G4).
// The audit's own script did not survive its session — the peer desk that
// produced 78 top-level sessions / 264 subagent transcripts, the 27/2/0/10
// entry-point split and the 37-call median toll was cleared, and only the
// audit's PROSE survived. This file rebuilds the measurement FROM the
// audit's stated method (its "Method" section and headline table), not by
// recovering a script — there is no script to recover. G4's acceptance
// splits by parentage: the mechanical half (top-level vs subagent count,
// tool-calls-before-first-write) is graded exact; the entry-point split is
// graded by RUNNING ITS OWN STATED RULE and printing every disagreement
// with the audit's hand classification, never by tuning the rule until the
// numbers match.
//
// WHAT IT MEASURES, over ~/.claude/projects/<this repo's own project dir>:
//   1. top-level sessions vs subagent transcripts (STRUCTURAL rule below,
//      not a directory-name or filename guess);
//   2. each top-level session's entry-point class, from its FIRST GENUINE
//      operator message (harness injections, hook output, tool results
//      excluded — the same exclusion the audit names);
//   3. tool calls before that session's first WRITE-tool call.
//
// SCOPE: this project's OWN store only, not every project under
// ~/.claude/projects — matching the audit's own scope ("Sessions were
// counted from top-level session files only in this project's store").
// The path is derived, never hardcoded: CLAUDE_CONFIG_DIR (or ~/.claude,
// via proxy/claude-home.mjs's own resolution) joined with "projects" and
// this process's OWN cwd, encoded the same way Claude Code itself names
// the directory (every path separator becomes "-"). A session store that
// does not exist here (fresh clone, different machine) is COULD NOT
// VERIFY, never a clean zero.
//
// STRUCTURAL TOP-LEVEL/SUBAGENT RULE. Every .jsonl file under the project
// directory is found by a manual recursive walk (no glob dependency,
// mirroring tools/hook-decision-census.mjs's walkJsonl — same store, same
// file shape). Each file is classified from its OWN FIRST PARSEABLE
// RECORD, not from its path: a record carrying a non-empty "agentId"
// field is a subagent transcript (every dispatched lane's harness-written
// record carries this field on its very first line); a record with no
// such field is a top-level session. Verified as a discriminating pair on
// this machine 2026-08-26: every file living directly under the project
// directory carries no "agentId" anywhere in it, and every file living
// under any "subagents/" subtree carries it on its first line — the
// path-based and content-based counts agreed exactly (79/79 and 269/269),
// so the content rule is not merely plausible, it reproduces the path
// convention it was deliberately built not to depend on.
//
// FIRST-GENUINE-MESSAGE RULE. Read a top-level file's own records in
// order (never its subagents/ children — those are separate files, walked
// and classified separately). The first genuine operator message is the
// first record where: type is "user"; isSidechain is not true;
// message.content is a STRING (a tool result is always an array, so this
// alone drops every tool_result); and, once a leading "<tag>" wrapper is
// stripped, that tag is not one of the harness's own injection wrappers
// (EXCLUDED_WRAPPER_TAGS below — measured on this store:
// local-command-caveat, command-name, command-message,
// local-command-stdout, task-notification are the five that occur).
// `isMeta === true` is NOT a blanket exclusion — first tried that way and
// caught a real defect: 171 records on this store are peer-session
// handoffs ("Another Claude session sent a message: <cross-session-
// message …>"), which the audit counts as genuine entries (its "other,
// peer handoffs" bucket) and which also carry `isMeta: true`. The
// discriminator that separates them from actual harness self-notices
// (Stop-hook feedback, empty-response nudges, skill re-invocation
// notices) is a structural field, `origin.kind` — `"peer"` for a real
// cross-session message, absent or something else for the rest — so an
// `isMeta: true` record is excluded UNLESS `origin.kind === "peer"`.
// `origin.kind === "human"` was considered and rejected as the positive
// signal instead: measured on this store, 591 of 1,552 plain (untagged,
// non-isMeta) messages carry no `origin` field at all (it is a newer
// field, absent on older records), so requiring it would exclude a large
// share of genuinely typed messages — the fix stays narrow, rescuing only
// the one class it was built for. A file with no qualifying record — a
// session that opened and closed without a typed message ever landing —
// is UNCLASSIFIED, never folded into any class or into a silent zero. A
// file whose first line will not parse as JSON at all is COULD-NOT-READ,
// kept separate from UNCLASSIFIED because one is an empty population and
// the other is a broken read.
//
// ENTRY-POINT RULE, applied to the first OPENING_WINDOW characters of that
// message (the opening ask; audit precedent for this scope: EP4's own
// headline finding is stated over openings — "7 of 10 open with a pasted
// bust line" — and a full-text scan over long pasted directives was
// measured on this store to inflate every class by picking up incidental
// later mentions, e.g. "backlog" appearing deep inside an unrelated
// brief). Checked in order, first match wins:
//   1. bust_walk     — the glyph "❄", or the statusline's own printed
//                       shape (a size figure, a class word, a
//                       parenthesised duration — e.g. "216k tools_changed
//                       (0m)") appears in the opening.
//   2. pr_cut        — "pr"/"pull request" mentioned, with a cut/open/
//                       create/submit verb directly ahead of it.
//   3. pr_tend       — "pr"/"pull request" mentioned, with a check/state/
//                       status/review/reply/idle/stale/sweep verb anywhere
//                       in the opening.
//   4. backlog_drain — the word "backlog".
//   5. bare_continue — the opening, stripped of everything but letters
//                       and lower-cased, is exactly one of a short closed
//                       set ("continue", "letscontinue", "contiue",
//                       "goon", "keepgoing") — a continuation with nothing
//                       else stated, never a longer message that merely
//                       starts that way.
//   6. other         — everything else (peer handoffs, directive
//                       pointers, consults — the audit's own residual
//                       bucket).
// This is a RULE, not the audit's judgment: it disagrees with the hand
// classification wherever intent cannot be told from opening text alone —
// the audit itself names 3 of its 10 bust sessions that do NOT open with a
// pasted line, which this rule cannot recover and does not pretend to.
// The disagreement is reported in AGGREGATE (see AUDIT_REFERENCE below):
// the audit publishes no per-session machine-readable classification to
// diff against, only its headline counts, so a per-session diff would
// have to invent a mapping the source does not carry — which this tool
// refuses to do.
//
// TOOL-CALLS-BEFORE-FIRST-WRITE. Walk the file's non-sidechain assistant
// records in order; count each tool_use block until one names a write
// tool (WRITE_TOOLS below — Edit, Write, NotebookEdit, MultiEdit). A
// session that never calls a write tool is counted and named in its own
// bucket (its n is reported explicitly, and it is excluded from the
// median's denominator rather than silently zeroed). REACH LIMIT, stated
// because it bounds the number: a Bash call that incidentally writes a
// file is not a "write tool" here — the audit's own stated proxy on this
// point ("some pre-write calls are real investigation") is inherited, not
// improved on.
//
// PUBLICATION BAR (CLAUDE.local.md, "The publication bar" — this repo is
// public, and the store read here holds this machine's own operator
// messages across every project it has ever worked). This tool's OUTPUT
// never carries message text, thinking text, tool inputs/outputs, or a
// raw session id. A session is identified, where it is identified at all,
// by the first 8 hex characters of the SHA-256 of its own session id
// (hashSessionId below) — never the id itself. The tool writes NOTHING
// outside the tree: stdout only, no state file, no snapshot — so it needs
// no state-report collector, which is the declaration the closing-gate's
// enumerable-completeness question asks every tools/ mechanism for.
//
// THE WINDOW CUTOFF (`--before`), added 2026-08-26 on a dispatcher
// correction: a before/after instrument whose two runs cover different
// populations measures nothing, and this store keeps growing (partly from
// this very carrier-rework dispatch's own subagent traffic) — an unpinned
// "today's store" is exactly the anchored-to-live-mutating-state defect
// this repo's own dev-loop.md warns about. `--before <ISO instant>`
// restricts the population to files whose OWN FIRST RECORD's `timestamp`
// field is earlier than the given instant — never the file's mtime, which
// moves whenever a session is resumed and would silently re-date old
// sessions as new. Applies to BOTH top-level and subagent files, so a
// windowed run compares like-for-like on both halves of the mechanical
// count. A file with NO timestamped record anywhere (measured on this
// store: four top-level sessions, each a single "bridge-session" record
// with no "timestamp" field at all — an aborted or never-started
// connection) cannot be placed on either side of any cutoff; excluding it
// by default would be just as arbitrary as including it, so the stated
// policy is to always COUNT it, under every cutoff, and report the count
// separately (`undatedIncluded`) so the choice is visible rather than
// silent. With no `--before`, the window is unrestricted (today's store,
// as it was before this addition).
//
// Usage:
//   node tools/entrypoint-census.mjs                    # human-readable
//   node tools/entrypoint-census.mjs --json              # machine-readable
//   node tools/entrypoint-census.mjs --before <ISO>       # windowed population
//
// exit 0 = ran and printed a census (agreement or not); 2 = COULD NOT
// VERIFY (no session store found at the resolved path, or --before is not
// a parseable instant).

import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { claudeHome } from "../proxy/claude-home.mjs";

const OPENING_WINDOW = 300;

// The five injection-wrapper tags actually observed opening a "type":"user"
// record on this store that is not a genuine typed message (measured
// 2026-08-26, over every top-level session file in this project's store).
const EXCLUDED_WRAPPER_TAGS = new Set([
  "local-command-caveat",
  "command-name",
  "command-message",
  "local-command-stdout",
  "task-notification",
]);
const WRAPPER_TAG_RE = /^\s*<([a-zA-Z][a-zA-Z0-9-]*)[\s>]/;

const WRITE_TOOLS = new Set(["Edit", "Write", "NotebookEdit", "MultiEdit"]);

const BUST_TOKEN_RE = /\d+k\s+\S+\s*\(\d+[ms]/;
const PR_MENTION_RE = /\bpull request\b|\bprs?\b/i;
const PR_CUT_VERB_RE = /\b(cut|open|create|submit)\b\s+(a\s+)?(new\s+)?(pr|pull request)\b/i;
const PR_TEND_VERB_RE = /\b(check|state|status|review|repl(y|ies)?|idle|stale|sweep)\b/i;
const BACKLOG_RE = /backlog/i;
const BARE_CONTINUE_SET = new Set(["continue", "letscontinue", "contiue", "goon", "keepgoing"]);

export const ENTRY_CLASSES = [
  "backlog_drain",
  "pr_tend",
  "pr_cut",
  "bust_walk",
  "bare_continue",
  "other",
  "unclassified",
];

// The audit's own published numbers (docs/audits/carrier-rework-entrypoints
// -2026-08-26.md), restated here as the comparison basis this tool's report
// is graded against (design doc decision G4). Not tunable toward — a
// disagreement is reported, never absorbed by adjusting the rule above.
//
// ADJUDICATED 2026-08-26 (G4), and the correction is to the COMPARISON, not
// to either count. The audit classifies a SESSION; this tool classifies its
// OPENING. Those are different predicates, and comparing them produced a
// three-session "delta" that was never a disagreement about any session:
// the audit's own text says "Bust walk: 7 of 10 open with a pasted bust
// line", and 7 is exactly what an opening-based rule finds. So the
// comparable bust number is 7, and the remaining 3 are a definitional
// difference that gets NAMED rather than counted as an error. Where those 3
// sit in this tool's classes is DERIVED, not observed: the audit publishes
// no per-session mapping, so the arithmetic (bust −3 against pr +1 and
// other +2, before the mention-is-not-entry fix) is the evidence, and it is
// marked as derived here so nobody later reads it as a measurement.
export const AUDIT_REFERENCE = {
  source: "docs/audits/carrier-rework-entrypoints-2026-08-26.md",
  window: "2026-07-29 -> 2026-08-26",
  topLevelSessions: 78,
  subagentFiles: 264,
  // The audit reported 37 at n=27. Both are wrong for this quantity, and the
  // basis is this tool's own measurement rather than the audit's prose: of
  // the 27 backlog sessions, 26 ever called a write tool and one did not, so
  // the measured population is 26 and 27 is the class count. Corroboration:
  // the audit's stated range for that row, 9–72, is exactly the min and max
  // of those 26 values. Their median is (33+37)/2 = 35; the audit's 37 is
  // their 14th value, an odd-count median taken over an even list. The audit
  // has been corrected in place.
  medianToolCallsBeforeWrite_backlogDrain: 35,
  measuredPopulation_backlogDrain: 26,
  classes: {
    backlog_drain: 27,
    pr_tend: 2,
    pr_cut: 0,
    // opening-level, from the audit's own "7 of 10" sentence
    bust_walk: 7,
    bare_continue: 4,
    unclassified: 5,
    // the audit's 30 session-level, plus the 3 bust walks whose openings do
    // not carry a bust line and which therefore land here
    other: 33,
  },
  // Session-level counts the audit published, kept so the difference stays
  // visible instead of being quietly absorbed into the line above.
  sessionLevel: {
    bust_walk: 10,
    other: 30,
    note:
      "the audit classifies a session by what it was; this tool classifies " +
      "the opening. 3 bust walks do not open with a bust line (audit's own " +
      "count) and are `other` here.",
  },
};

/** Claude Code's own project-directory name for a cwd: every path separator
 * becomes "-" (observed convention on this machine, not documented anywhere
 * this tool could cite — stated as an assumption a reader can check with
 * one `ls ~/.claude/projects`). */
export function encodeProjectDir(cwd) {
  return cwd.replace(/[\\/]/g, "-");
}

export function resolveStoreDir(cwd = process.cwd()) {
  return join(claudeHome(), "projects", encodeProjectDir(cwd));
}

/** Recursive .jsonl finder — no glob dependency, manual walk (mirrors
 * tools/hook-decision-census.mjs's walkJsonl over the same store shape).
 * Unreadable directories are skipped at the DIRECTORY level (permission
 * denied, mid-walk deletion); file-level read failures are what the
 * COULD-NOT-READ bucket below exists for. */
function walkJsonl(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile() && e.name.endsWith(".jsonl")) out.push(full);
    }
  }
  return out;
}

function parseLines(text) {
  const out = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      // Skip: a single malformed line does not fail the whole file — the
      // file-level COULD-NOT-READ bucket is for files with NO parseable
      // record at all, not for one bad line among thousands.
    }
  }
  return out;
}

/** Structural rule: does ANY record in this file carry a non-empty
 * "agentId"? If the file has no parseable record at all, kind is
 * "unreadable" (the third answer — never silently top-level). */
export function classifyFileKind(records) {
  if (records.length === 0) return "unreadable";
  for (const rec of records) {
    if (rec && typeof rec === "object" && rec.agentId) return "subagent";
  }
  return "top-level";
}

function isGenuineUserRecord(rec) {
  if (!rec || typeof rec !== "object") return false;
  if (rec.type !== "user") return false;
  if (rec.isSidechain === true) return false;
  if (rec.isMeta === true) {
    // Rescue real peer-session handoffs from the harness-notice exclusion
    // (see the FIRST-GENUINE-MESSAGE RULE comment above for the measured
    // reason this is narrower than a blanket isMeta check).
    const isPeerMessage = rec.origin && typeof rec.origin === "object" && rec.origin.kind === "peer";
    if (!isPeerMessage) return false;
  }
  const content = rec.message && rec.message.content;
  if (typeof content !== "string") return false;
  if (content.trim() === "") return false;
  const m = WRAPPER_TAG_RE.exec(content);
  if (m && EXCLUDED_WRAPPER_TAGS.has(m[1])) return false;
  return true;
}

/** The first genuine operator message's text, or null if none exists in
 * this file (UNCLASSIFIED — file was readable, no qualifying record). */
export function firstGenuineMessage(records) {
  for (const rec of records) {
    if (isGenuineUserRecord(rec)) return rec.message.content;
  }
  return null;
}

/** The file's own first timestamped record — never the file's mtime (see
 * the WINDOW CUTOFF header rule). Returns null if no record in the file
 * carries a "timestamp" field at all. */
export function firstTimestamp(records) {
  for (const rec of records) {
    if (rec && typeof rec === "object" && typeof rec.timestamp === "string") return rec.timestamp;
  }
  return null;
}

/** Entry-point classification, applied to a bounded OPENING window of the
 * message text (see header rule). `text === null` means UNCLASSIFIED. */
/** How many DISTINCT doors an opening names. A session that enumerates the
 * doors is talking ABOUT them, not entering one — the adjudicated case
 * (2026-08-26) is this arc's own kickoff, whose first message lists draining
 * the backlog, checking the PRs, cutting new PRs and handling a posted bust,
 * and enters none of them. The keyword rule classified it by whichever door
 * matched first, which is how a meta session becomes a false `pr_tend`. */
export function doorsMentioned(opening) {
  let n = 0;
  // MENTION regexes, deliberately NOT the entry regexes. Entering the bust
  // door means a pasted bust line; MENTIONING it is the word. Reusing the
  // entry detector here was the first version of this guard and it did not
  // fire on the very case it was written for — that opening says "if i post
  // a new bust", which is the door named in plain words and no line pasted.
  if (opening.includes("❄") || BUST_TOKEN_RE.test(opening) || /\bbusts?\b/i.test(opening)) n += 1;
  if (PR_MENTION_RE.test(opening)) n += 1;
  if (BACKLOG_RE.test(opening)) n += 1;
  return n;
}

export function classifyEntryPoint(text, { window = OPENING_WINDOW } = {}) {
  if (text == null) return "unclassified";
  const opening = text.slice(0, window);
  // MENTION IS NOT ENTRY. Three of the three detectable doors named in one
  // opening is an enumeration, and an enumeration is a design conversation.
  // The threshold is stated rather than tuned: two doors is an ordinary
  // "drain the backlog, then look at the PRs" instruction, which DOES enter
  // one; three is a survey of the doors themselves.
  if (doorsMentioned(opening) >= 3) return "other";
  if (opening.includes("❄") || BUST_TOKEN_RE.test(opening)) return "bust_walk";
  if (PR_MENTION_RE.test(opening)) {
    if (PR_CUT_VERB_RE.test(opening)) return "pr_cut";
    if (PR_TEND_VERB_RE.test(opening)) return "pr_tend";
  }
  if (BACKLOG_RE.test(opening)) return "backlog_drain";
  const stripped = opening.toLowerCase().replace(/[^a-z]/g, "");
  if (BARE_CONTINUE_SET.has(stripped)) return "bare_continue";
  return "other";
}

/** Tool calls before the first write-tool call, walking non-sidechain
 * assistant records in file order. Returns {count, wrote}: `wrote` false
 * means the session never called a write tool at all — `count` is then the
 * TOTAL non-write tool calls seen, and the caller must not fold it into a
 * "before write" median (there was no write to be before). */
export function toolCallsBeforeFirstWrite(records) {
  let count = 0;
  for (const rec of records) {
    if (!rec || rec.type !== "assistant" || rec.isSidechain === true) continue;
    const content = rec.message && rec.message.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (!block || block.type !== "tool_use") continue;
      if (WRITE_TOOLS.has(block.name)) return { count, wrote: true };
      count += 1;
    }
  }
  return { count, wrote: false };
}

export function hashSessionId(sessionId) {
  return createHash("sha256").update(String(sessionId)).digest("hex").slice(0, 8);
}

function median(nums) {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function sessionIdFromPath(file) {
  const base = file.split("/").pop() || file;
  return base.replace(/\.jsonl$/, "");
}

export function census({ storeDir = resolveStoreDir(), before = null } = {}) {
  let files;
  try {
    files = walkJsonl(storeDir);
  } catch (e) {
    return { ok: false, reason: `cannot read ${storeDir}: ${e?.message ?? e}` };
  }
  if (files.length === 0) {
    return { ok: false, reason: `no .jsonl files under ${storeDir} — no session store found here` };
  }

  let subagentFiles = 0;
  let unreadableFiles = 0;
  let excludedByWindow = { topLevel: 0, subagent: 0 };
  let undatedIncluded = { topLevel: 0, subagent: 0 };
  const sessions = [];

  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      unreadableFiles += 1;
      continue;
    }
    const records = parseLines(text);
    const kind = classifyFileKind(records);
    if (kind === "unreadable") {
      unreadableFiles += 1;
      continue;
    }

    // WINDOW CUTOFF (see header rule): applies identically to top-level and
    // subagent files, keyed on the file's OWN first timestamped record. An
    // undated file is always counted (policy stated in the header) but the
    // count is broken out so the choice stays visible.
    if (before !== null) {
      const ts = firstTimestamp(records);
      if (ts === null) {
        if (kind === "subagent") undatedIncluded.subagent += 1;
        else undatedIncluded.topLevel += 1;
      } else if (ts >= before) {
        if (kind === "subagent") excludedByWindow.subagent += 1;
        else excludedByWindow.topLevel += 1;
        continue;
      }
    }

    if (kind === "subagent") {
      subagentFiles += 1;
      continue;
    }
    const message = firstGenuineMessage(records);
    const entryClass = classifyEntryPoint(message);
    const { count, wrote } = toolCallsBeforeFirstWrite(records);
    sessions.push({
      token: hashSessionId(sessionIdFromPath(file)),
      entryClass,
      toolCallsBeforeWrite: wrote ? count : null,
      toolCallsTotalIfNoWrite: wrote ? null : count,
      wrote,
    });
  }

  const classCounts = Object.fromEntries(ENTRY_CLASSES.map((c) => [c, 0]));
  for (const s of sessions) classCounts[s.entryClass] += 1;

  const wroteCounts = sessions.filter((s) => s.wrote).map((s) => s.toolCallsBeforeWrite);
  const noWriteSessions = sessions.filter((s) => !s.wrote);

  const backlogWroteCounts = sessions
    .filter((s) => s.entryClass === "backlog_drain" && s.wrote)
    .map((s) => s.toolCallsBeforeWrite);

  const disagreement = ENTRY_CLASSES.map((c) => ({
    class: c,
    tool: classCounts[c],
    audit: AUDIT_REFERENCE.classes[c],
    delta: classCounts[c] - AUDIT_REFERENCE.classes[c],
  }));

  return {
    ok: true,
    storeDir,
    windowCutoff: before,
    excludedByWindow: before !== null ? excludedByWindow : null,
    undatedIncluded: before !== null ? undatedIncluded : null,
    topLevelSessions: sessions.length,
    subagentFiles,
    unreadableFiles,
    classCounts,
    toolCallsBeforeWrite: {
      overall: { n: wroteCounts.length, median: median(wroteCounts) },
      backlogDrain: { n: backlogWroteCounts.length, median: median(backlogWroteCounts) },
      noWriteSessions: noWriteSessions.length,
    },
    disagreementVsAudit: {
      note:
        "The audit publishes no per-session machine-readable classification " +
        "(publication bar: session identifiers are not reproduced there) — " +
        "comparison is AGGREGATE, per class, never a per-session mapping.",
      classes: disagreement,
      topLevelSessions: {
        tool: sessions.length,
        audit: AUDIT_REFERENCE.topLevelSessions,
        delta: sessions.length - AUDIT_REFERENCE.topLevelSessions,
      },
      subagentFiles: {
        tool: subagentFiles,
        audit: AUDIT_REFERENCE.subagentFiles,
        delta: subagentFiles - AUDIT_REFERENCE.subagentFiles,
      },
      medianToolCallsBeforeWrite_backlogDrain: {
        tool: median(backlogWroteCounts),
        audit: AUDIT_REFERENCE.medianToolCallsBeforeWrite_backlogDrain,
      },
    },
    sessions,
  };
}

function printHuman(res) {
  const out = (s) => process.stdout.write(`${s}\n`);
  out(`session store: ${res.storeDir}`);
  out(`window cutoff: ${res.windowCutoff === null ? "none (unrestricted — today's live store)" : `< ${res.windowCutoff}`}`);
  if (res.windowCutoff !== null) {
    out(
      `  excluded by window: top-level=${res.excludedByWindow.topLevel}, ` +
        `subagent=${res.excludedByWindow.subagent}`,
    );
    out(
      `  undated, always included: top-level=${res.undatedIncluded.topLevel}, ` +
        `subagent=${res.undatedIncluded.subagent}`,
    );
  }
  out(`top-level sessions: ${res.topLevelSessions}  (audit: ${AUDIT_REFERENCE.topLevelSessions})`);
  out(`subagent files:     ${res.subagentFiles}  (audit: ${AUDIT_REFERENCE.subagentFiles})`);
  out(`unreadable files:   ${res.unreadableFiles}`);
  out("");
  out("entry-point classes (tool vs audit):");
  for (const row of res.disagreementVsAudit.classes) {
    const flag = row.delta === 0 ? "" : `  <-- delta ${row.delta > 0 ? "+" : ""}${row.delta}`;
    out(`  ${row.class.padEnd(14)} tool=${String(row.tool).padEnd(4)} audit=${String(row.audit).padEnd(4)}${flag}`);
  }
  out("");
  out(
    `tool calls before first write — overall: n=${res.toolCallsBeforeWrite.overall.n}, ` +
      `median=${res.toolCallsBeforeWrite.overall.median}`,
  );
  out(
    `tool calls before first write — backlog_drain: n=${res.toolCallsBeforeWrite.backlogDrain.n}, ` +
      `median=${res.toolCallsBeforeWrite.backlogDrain.median}  (audit median: ` +
      `${AUDIT_REFERENCE.medianToolCallsBeforeWrite_backlogDrain}, ` +
      `n=${AUDIT_REFERENCE.measuredPopulation_backlogDrain} measured of ` +
      `${AUDIT_REFERENCE.classes.backlog_drain} in the class)`,
  );
  out(`sessions with NO write tool call at all: ${res.toolCallsBeforeWrite.noWriteSessions}`);
  out("");
  out(res.disagreementVsAudit.note);
}

export async function main(argv) {
  const args = argv.slice(2);
  const json = args.includes("--json");
  let before = null;
  const bi = args.indexOf("--before");
  if (bi >= 0) {
    const raw = args[bi + 1];
    if (!raw || Number.isNaN(Date.parse(raw))) {
      process.stderr.write(`COULD NOT VERIFY — --before needs a parseable ISO instant, got ${JSON.stringify(raw)}\n`);
      return 2;
    }
    // Comparison is a plain string compare against each record's own
    // "timestamp" field (see firstTimestamp) — both sides must be the same
    // ISO-8601 UTC shape (YYYY-MM-DDTHH:mm:ss.sssZ) for that to be
    // chronological, which is what every timestamp on this store already is.
    before = raw;
  }
  const res = census({ before });
  if (!res.ok) {
    process.stderr.write(`COULD NOT VERIFY — ${res.reason}\n`);
    return 2;
  }
  if (json) {
    process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
  } else {
    printHuman(res);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  process.exit(await main(process.argv));
}
