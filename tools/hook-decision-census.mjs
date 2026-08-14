#!/usr/bin/env node
// hook-decision-census — one pass over ~/.claude/projects/**/*.jsonl reporting
// three counts and nothing derived, for anthropics/claude-code#82642
// (PreToolUse denials discard `decisionReason`).
//
// BACKLOG.md, "add our linux numbers to CC 82642": a macOS user posted a
// corroborating measurement on the issue — 48,404 PreToolUse:Bash attachments
// across 601 transcripts, allow 47,081 / ask 1,279 / deny 0, against 132
// denials visible only as tool_result error text, and on one hook's 92
// denials the allow rows on those same calls belonged to a DIFFERENT hook in
// the chain. This tool reproduces that shape of measurement on this
// (linux) machine, so the desk can add a third platform's numbers.
//
// The three counts, and nothing else:
//   1. PreToolUse:* attachments — total, broken down by hookName as it
//      appears on the attachment record (e.g. "PreToolUse:Bash").
//   2. Decisions parsed out of each attachment's stdout (hook_success only —
//      that is the only attachment.type observed to carry stdout), grouped
//      by kind (allow/ask/deny/empty/unparseable) and by hookName.
//   3. Denials visible ONLY as tool_result error text: a tool call whose
//      result is an error naming a hook, with no `deny` decision recorded on
//      any PreToolUse attachment for that same toolUseID (tool_use_id).
//
// Two independent, non-overlapping text signatures were found (by planting
// and reading structure, never by guessing) to identify "this error names a
// hook denial" without keying on any one hook's own vocabulary:
//   - `PreToolUse:<Tool> hook error: ` — Claude Code's own generated wrapper
//     when the hook process itself errored.
//   - `[<namespace/hook-name>] ` — the hook's own bracketed self-identifier,
//     used when a hook surfaces a structured deny/block reason directly.
// Both are counted, under separate labels so the reader can tell which shape
// produced which row — this tool derives no rate, percentage, or verdict;
// that reading is the desk's, per BACKLOG's design and docs/dev-loop.md
// ("A checker has THREE answers, not two" / "Print every match, not the
// first").
//
// Output rules (docs/dev-loop.md, "The hygiene gate scans messages and every
// text type" — this repo is public): counts, hook names, event names and
// file COUNTS only. Never a transcript path, session id, project directory
// name, cwd, or branch. A file this tool cannot read or parse is named on a
// could-not-verify line BY COUNT, never by path, and excluded from the
// totals — the third answer, not a silent zero (dev-loop.md, "A checker has
// THREE answers, not two").
//
// Usage:
//   node tools/hook-decision-census.mjs                # human-readable
//   node tools/hook-decision-census.mjs --json          # machine-readable
//   node tools/hook-decision-census.mjs --root <dir>    # override scan root
//   CACHE_FIX_HOOK_CENSUS_ROOT=<dir> node tools/hook-decision-census.mjs

import { readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Default scan root: this machine's Claude Code transcript tree. Overridable
// so the synthetic-fixture control (test/hook-decision-census.test.mjs, and
// the verifier's scratchpad probe) never has to shape a fake ~/.claude tree —
// which the harness's path-shape permission protection would flag.
export const PROJECTS = join(homedir(), ".claude/projects");

// --- structural signatures --------------------------------------------------

// Claude Code's own generated wrapper text when a PreToolUse hook process
// itself errored (crash, non-JSON exit). Anchored at the start of the
// tool_result text so it cannot match a hook's OWN prose that merely
// mentions "PreToolUse" mid-sentence.
const HOOK_ERROR_WRAPPER_RE = /^PreToolUse:(\S+) hook error: /;

// A hook's own bracketed self-identifier ("[namespace/hook-name] reason…"),
// used when a hook surfaces a structured deny/block reason directly as the
// tool_result. Measured on this machine (2026-08-14, scratch probe, not
// committed): every bracket-prefixed is_error tool_result text across the
// whole corpus resolved to one of seven such namespace/hook-name strings —
// no false positives from markdown checklists or command output were
// observed carrying this exact "[word/word] " shape at the START of an
// error result.
const HOOK_REASON_BRACKET_RE = /^\[([\w][\w./-]*)\] /;

const DECISION_KINDS = ["allow", "ask", "deny", "empty", "unparseable"];

function emptyDecisionCounts() {
  return { allow: 0, ask: 0, deny: 0, empty: 0, unparseable: 0 };
}

/**
 * Classify a hook_success attachment's stdout into one of the four kinds the
 * brief names (empty and unparseable kept distinct here for transparency;
 * callers that want the brief's literal "empty-or-unparseable" bucket sum
 * the two).
 * @param {string} stdout
 * @returns {{kind: "allow"|"ask"|"deny"|"empty"|"unparseable"}}
 */
export function classifyDecision(stdout) {
  if (typeof stdout !== "string" || stdout.length === 0) return { kind: "empty" };
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return { kind: "unparseable" };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { kind: "unparseable" };
  }
  const hso = parsed.hookSpecificOutput;
  const pd = hso && typeof hso === "object" ? hso.permissionDecision : undefined;
  if (pd === "allow" || pd === "ask" || pd === "deny") return { kind: pd };
  return { kind: "empty" };
}

/**
 * Does this tool_result error text name a hook denial, and under which
 * label? Returns null for ordinary tool failures (file-not-found, exit-code
 * tracebacks, …) that carry neither signature.
 * @param {string} text
 * @returns {{kind: "hook-crash-wrapper"|"hook-reason-bracket", label: string} | null}
 */
export function extractDenialLabel(text) {
  if (typeof text !== "string") return null;
  let m = HOOK_ERROR_WRAPPER_RE.exec(text);
  if (m) return { kind: "hook-crash-wrapper", label: `PreToolUse:${m[1]}` };
  m = HOOK_REASON_BRACKET_RE.exec(text);
  if (m) return { kind: "hook-reason-bracket", label: m[1] };
  return null;
}

function toolResultText(item) {
  const c = item.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    let out = "";
    for (const sub of c) {
      if (sub && typeof sub === "object" && sub.type === "text" && typeof sub.text === "string") {
        out += sub.text;
      }
    }
    return out;
  }
  return "";
}

/**
 * Census over an array of raw JSONL lines (one transcript's worth, or a
 * synthetic fixture). Pure and side-effect-free, which is what makes it
 * testable against planted fixtures rather than only against the real tree.
 *
 * @param {string[]} lines
 * @returns {object} per-file partial result; see censusTree for the merged
 *   shape callers actually read.
 */
export function censusLines(lines) {
  // toolUseID -> { decisionKinds: Set<string> } — used only to answer "was a
  // deny EVER recorded on this call", which is what item 3's definition
  // turns on. Correlated by tool_use_id / toolUseID, the same id space the
  // transcript itself uses to pair a tool_use with its tool_result — never
  // by matching text, which is the paraphrase-drift shape this repo's own
  // rules warn against.
  const perToolUse = new Map();

  const preToolUseTotal = { total: 0, byHookName: new Map() };
  const decisionTotals = new Map(); // hookName -> counts
  const errorCandidates = []; // { toolUseID, kind, label }
  let malformedLines = 0;

  const bumpDecision = (hookName, kind) => {
    if (!decisionTotals.has(hookName)) decisionTotals.set(hookName, emptyDecisionCounts());
    decisionTotals.get(hookName)[kind]++;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      malformedLines++;
      continue;
    }
    if (!d || typeof d !== "object") continue;

    const att = d.attachment;
    if (att && typeof att === "object" && att.hookEvent === "PreToolUse") {
      const toolUseID = typeof att.toolUseID === "string" ? att.toolUseID : null;
      const hookName = typeof att.hookName === "string" ? att.hookName : "(unnamed)";
      preToolUseTotal.total++;
      preToolUseTotal.byHookName.set(hookName, (preToolUseTotal.byHookName.get(hookName) || 0) + 1);

      if (toolUseID) {
        if (!perToolUse.has(toolUseID)) perToolUse.set(toolUseID, { decisionKinds: new Set() });
      }

      // Only hook_success attachments were observed to carry `stdout` at
      // all (structural fact, not assumed): hook_additional_context,
      // hook_system_message, hook_blocking_error, hook_cancelled and
      // hook_non_blocking_error carry no stdout field in the corpus this
      // was designed against. A stdout-bearing attachment of a different
      // `attachment.type` is still classified here — the gate is "has
      // stdout", not "is hook_success" — so a future shape this wasn't
      // built against still gets counted rather than silently skipped.
      if (typeof att.stdout === "string" && att.stdout.length > 0) {
        const { kind } = classifyDecision(att.stdout);
        bumpDecision(hookName, kind);
        if (toolUseID) perToolUse.get(toolUseID).decisionKinds.add(kind);
      }
    }

    const msg = d.message;
    if (msg && typeof msg === "object" && Array.isArray(msg.content)) {
      for (const item of msg.content) {
        if (!item || typeof item !== "object" || item.type !== "tool_result") continue;
        if (!item.is_error) continue;
        const text = toolResultText(item);
        if (!text) continue;
        const label = extractDenialLabel(text);
        if (!label) continue;
        const toolUseID = typeof item.tool_use_id === "string" ? item.tool_use_id : null;
        errorCandidates.push({ toolUseID, ...label });
      }
    }
  }

  let errorOnlyTotal = 0;
  const errorOnlyByLabel = new Map();
  let withRecordedDenyElsewhere = 0;
  let unattributedNoAttachment = 0;

  for (const cand of errorCandidates) {
    const info = cand.toolUseID ? perToolUse.get(cand.toolUseID) : undefined;
    const hadDeny = info ? info.decisionKinds.has("deny") : false;
    if (hadDeny) {
      withRecordedDenyElsewhere++;
      continue;
    }
    errorOnlyTotal++;
    if (!info) unattributedNoAttachment++;
    errorOnlyByLabel.set(cand.label, (errorOnlyByLabel.get(cand.label) || 0) + 1);
  }

  return {
    malformedLines,
    preToolUseTotal,
    decisionTotals,
    errorOnly: {
      total: errorOnlyTotal,
      byLabel: errorOnlyByLabel,
      withRecordedDenyElsewhere,
      unattributedNoAttachment,
    },
  };
}

/**
 * Census over one transcript file. Read/parse failure is reported as a
 * could-not-verify result, never folded into a zero.
 * @param {string} filePath
 */
export function censusFile(filePath) {
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch (err) {
    return { ok: false, reason: err.code || String(err.message || err) };
  }
  const lines = content.split("\n");
  return { ok: true, ...censusLines(lines) };
}

/** Recursive .jsonl finder — no glob dependency, just a manual walk so the
 * tree's actual depth (project-dir/session.jsonl, one level, but never
 * assumed) never needs to be hardcoded. Unreadable directories are skipped
 * silently at the DIRECTORY level (permission-denied subtrees), which is a
 * narrower and much rarer failure than a file read failing; file-level
 * failures are the ones the could-not-verify count exists for. */
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

function mergeDecisionMaps(target, source) {
  for (const [hookName, counts] of source) {
    if (!target.has(hookName)) target.set(hookName, emptyDecisionCounts());
    const acc = target.get(hookName);
    for (const kind of DECISION_KINDS) acc[kind] += counts[kind];
  }
}

function mergeCountMaps(target, source) {
  for (const [k, v] of source) target.set(k, (target.get(k) || 0) + v);
}

function sumDecisionCounts(counts) {
  return DECISION_KINDS.reduce((acc, k) => acc + counts[k], 0);
}

/**
 * The full census: every .jsonl file under `root`, merged into the three
 * counts the brief asks for plus the stated diagnostics (malformed lines,
 * could-not-verify files). Nothing here computes a rate or a percentage —
 * that reading is the desk's, per BACKLOG's design.
 * @param {string} [root]
 */
export function censusTree(root = PROJECTS) {
  const files = walkJsonl(root);
  let filesCouldNotVerify = 0;
  let malformedLines = 0;
  const preToolUseTotal = { total: 0, byHookName: new Map() };
  const decisionTotals = new Map();
  let errorOnlyTotal = 0;
  const errorOnlyByLabel = new Map();
  let withRecordedDenyElsewhere = 0;
  let unattributedNoAttachment = 0;

  for (const fp of files) {
    const r = censusFile(fp);
    if (!r.ok) {
      filesCouldNotVerify++;
      continue;
    }
    malformedLines += r.malformedLines;
    preToolUseTotal.total += r.preToolUseTotal.total;
    mergeCountMaps(preToolUseTotal.byHookName, r.preToolUseTotal.byHookName);
    mergeDecisionMaps(decisionTotals, r.decisionTotals);
    errorOnlyTotal += r.errorOnly.total;
    mergeCountMaps(errorOnlyByLabel, r.errorOnly.byLabel);
    withRecordedDenyElsewhere += r.errorOnly.withRecordedDenyElsewhere;
    unattributedNoAttachment += r.errorOnly.unattributedNoAttachment;
  }

  const decisionTotal = emptyDecisionCounts();
  for (const counts of decisionTotals.values()) {
    for (const kind of DECISION_KINDS) decisionTotal[kind] += counts[kind];
  }

  return {
    filesWalked: files.length,
    filesCouldNotVerify,
    malformedLines,
    preToolUse: {
      total: preToolUseTotal.total,
      byHookName: Object.fromEntries(
        [...preToolUseTotal.byHookName].sort((a, b) => b[1] - a[1])),
    },
    decisions: {
      total: decisionTotal,
      byHookName: Object.fromEntries(
        [...decisionTotals]
          .sort((a, b) => sumDecisionCounts(b[1]) - sumDecisionCounts(a[1]))),
    },
    errorOnlyDenials: {
      total: errorOnlyTotal,
      byLabel: Object.fromEntries(
        [...errorOnlyByLabel].sort((a, b) => b[1] - a[1])),
      withRecordedDenyElsewhere,
      unattributedNoAttachment,
    },
  };
}

// --- rendering ---------------------------------------------------------

function fmtDecisionCounts(c) {
  return `allow=${c.allow} ask=${c.ask} deny=${c.deny} empty=${c.empty} ` +
    `unparseable=${c.unparseable} (empty-or-unparseable=${c.empty + c.unparseable})`;
}

export function formatHuman(report) {
  const lines = [];
  lines.push(`files walked: ${report.filesWalked}`);
  lines.push(`could-not-verify: ${report.filesCouldNotVerify} file(s) unreadable — excluded from all totals below`);
  lines.push(`malformed JSON lines skipped (files otherwise readable): ${report.malformedLines}`);
  lines.push("");
  lines.push("=== 1. PreToolUse:* attachments ===");
  lines.push(`total: ${report.preToolUse.total}`);
  lines.push("by hook name:");
  const p1 = Object.entries(report.preToolUse.byHookName);
  if (p1.length === 0) lines.push("  (none)");
  for (const [name, count] of p1) lines.push(`  ${name}: ${count}`);
  lines.push("");
  lines.push("=== 2. Decisions parsed from attachment stdout (PreToolUse only) ===");
  lines.push(`total: ${fmtDecisionCounts(report.decisions.total)}`);
  lines.push("by hook name:");
  const p2 = Object.entries(report.decisions.byHookName);
  if (p2.length === 0) lines.push("  (none)");
  for (const [name, counts] of p2) lines.push(`  ${name}: ${fmtDecisionCounts(counts)}`);
  lines.push("");
  lines.push("=== 3. Denials visible ONLY as tool_result error text ===");
  lines.push("(a tool call whose result is an error naming a hook, with no deny");
  lines.push(" decision recorded on any PreToolUse attachment for that call)");
  lines.push(`total: ${report.errorOnlyDenials.total}`);
  lines.push("by label:");
  const p3 = Object.entries(report.errorOnlyDenials.byLabel);
  if (p3.length === 0) lines.push("  (none)");
  for (const [label, count] of p3) lines.push(`  ${label}: ${count}`);
  lines.push("");
  lines.push("diagnostics (not part of the three counts above):");
  lines.push(`  matched a hook-denial text signature but a deny WAS recorded elsewhere ` +
    `on that call (excluded from total 3): ${report.errorOnlyDenials.withRecordedDenyElsewhere}`);
  lines.push(`  of total 3, calls with NO PreToolUse attachment at all on record: ` +
    `${report.errorOnlyDenials.unattributedNoAttachment}`);
  return lines.join("\n");
}

// --- CLI -----------------------------------------------------------------

export async function main(argv) {
  const args = argv.slice(2);
  const asJson = args.includes("--json");
  const rootIdx = args.indexOf("--root");
  const root = rootIdx !== -1 && args[rootIdx + 1]
    ? args[rootIdx + 1]
    : (process.env.CACHE_FIX_HOOK_CENSUS_ROOT || PROJECTS);

  const report = censusTree(root);
  if (asJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(formatHuman(report) + "\n");
  }
  return 0;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  process.exit(await main(process.argv));
}
