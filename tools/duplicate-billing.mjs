#!/usr/bin/env node
// duplicate-billing — joins the reminder-migration census's double-billed
// duplicate-request STREAKS against usage.jsonl by request_id, so a reader
// can see what each duplicate SEND actually produced instead of the
// capture's message_start placeholder.
//
// The fact this tool exists to route around (proxy/extensions/
// request-capture.mjs `buildOutcomeRecord`): the capture outcome record's
// `usage.outputTokens` is written on `message_start`, before the completion
// exists — it is a placeholder, never a completion length. usage.jsonl's
// `output_tokens` (proxy/extensions/usage-log.mjs `assembleRecord`) comes off
// `message_delta` instead and IS final. The join key is the upstream
// `request-id` response header, captured on both sides
// (`extractRequestId`/`buildOutcomeRecord`'s `requestId`).
//
// SEMANTICS CLAUSE, load-bearing: a non-zero `finalOutputTokens` does NOT
// prove a complete answer, and this tool must not claim it does — it reports
// the number, and reading it is the human's job. Measured 2026-08-14: 48,255
// of 48,256 usage.jsonl records carry a non-zero output_tokens, so treating
// "> 0" as "completed" would be a predicate almost no input could falsify.
// What the number DOES separate is a substantive answer from a truncated
// one, by size, and that comparison across a streak's members is the
// evidence a reader wants — never a verdict this tool hands them pre-formed.
//
// Reader discipline: this file never hand-parses usage.jsonl or the capture
// outcome shape — both go through tools/logs.mjs's strict views
// (`readUsageLogRecord`), which throws on a wrong-schema field name instead
// of returning a confidently wrong value.
//
// CLI: node tools/duplicate-billing.mjs --census <census --json --verbose
// export> [--usage <usage.jsonl path>] [--json]
//   Missing/unreadable input is a stated could-not-verify with a non-zero
//   exit, never an empty report.

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";

import { readUsageLogRecord } from "./logs.mjs";
import { statePath } from "../proxy/xdg-dirs.mjs";

const DEFAULT_USAGE_PATH = statePath("usage.jsonl");

/**
 * Read a `reminder-migration-census --json --verbose` export off disk.
 * Throws on a missing file, unparsable JSON, or a payload that carries no
 * `duplicateRows` array (wrong export, or run without `--verbose`) — the
 * caller turns that into a could-not-verify, never an empty report.
 */
export function readCensusExport(path) {
  const raw = readFileSync(path, "utf-8");
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.duplicateRows)) {
    throw new Error(
      `census export at ${path} carries no duplicateRows array — wrong export, or run without --verbose`,
    );
  }
  return parsed;
}

/**
 * Read usage.jsonl into a Map keyed by `request_id` -> strict usageLog view
 * (`readUsageLogRecord`). A line with no `request_id` field, or a line that
 * fails to parse, is SKIPPED rather than thrown on — a single torn write
 * must not turn the whole join could-not-verify. Later lines win on a
 * colliding request_id (should not occur — each upstream request_id is
 * unique by construction — but the index never silently drops the earlier
 * write in favor of an error; it just keeps the most recent).
 */
export function readUsageIndex(path) {
  const raw = readFileSync(path, "utf-8");
  const index = new Map();
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = readUsageLogRecord(JSON.parse(line));
    } catch {
      continue;
    }
    const rid = rec.request_id;
    if (typeof rid === "string" && rid) index.set(rid, rec);
  }
  return index;
}

/**
 * Classify one duplicate-streak member's join to usage.jsonl. `member` is a
 * census `duplicateRows[].members[]` entry: `{ id, ts, line, outcome }`
 * where `outcome` is `{ requestId, model, ms, usage:{cacheRead,
 * cacheCreation, inputTokens, outputTokens} }` or null.
 *
 * `captureUsage` carries the outcome's cacheRead/cacheCreation/inputTokens
 * VERBATIM — outputTokens is deliberately never copied across (it is the
 * message_start placeholder this whole tool exists to route around; a later
 * reader must not find it sitting in the output looking like an answer).
 */
export function classifyMember(member, usageIndex) {
  const outcome = member?.outcome ?? null;
  const captureUsage = outcome?.usage
    ? {
        cacheRead: outcome.usage.cacheRead ?? null,
        cacheCreation: outcome.usage.cacheCreation ?? null,
        inputTokens: outcome.usage.inputTokens ?? null,
      }
    : null;
  const base = {
    line: member?.line ?? null,
    ts: member?.ts ?? null,
    requestId: outcome?.requestId ?? null,
    captureUsage,
  };

  if (!outcome) {
    return { ...base, join: "NO-REQUEST-ID", reason: "no outcome record for this member" };
  }
  if (typeof outcome.requestId !== "string" || !outcome.requestId) {
    return { ...base, join: "NO-REQUEST-ID", reason: "outcome record present but carries no requestId" };
  }

  const usageRec = usageIndex.get(outcome.requestId);
  if (!usageRec) {
    return { ...base, join: "NOT-IN-USAGE-LOG" };
  }

  const result = {
    ...base,
    join: "JOINED",
    finalOutputTokens: usageRec.output_tokens,
    input_tokens: usageRec.input_tokens,
    cache_creation_input_tokens: usageRec.cache_creation_input_tokens,
    cache_read_input_tokens: usageRec.cache_read_input_tokens,
  };
  if (captureUsage && typeof captureUsage.cacheRead === "number") {
    result.crossCheck =
      captureUsage.cacheRead === usageRec.cache_read_input_tokens
        ? { status: "AGREE" }
        : {
            status: "DIFFER",
            captureCacheRead: captureUsage.cacheRead,
            usageLogCacheRead: usageRec.cache_read_input_tokens,
          };
  }
  return result;
}

/**
 * The input-side tokens attributable to the DUPLICATE sends only: sum of
 * cacheRead + cacheCreation + inputTokens (from each member's captureUsage —
 * the only usage source guaranteed present on every member that has an
 * outcome, since JOINED usage-log data exists only for members that actually
 * joined) over every member EXCEPT the first of the streak. The first send
 * is the legitimate one; only the sends after it are the double-billed
 * charge this tool exists to surface. `members` here are already-classified
 * rows (`classifyMember` output), so a member with no captureUsage
 * (NO-REQUEST-ID with a null outcome) contributes 0, not a thrown error.
 */
export function computeDuplicateCharge(members) {
  let total = 0;
  for (let i = 1; i < members.length; i++) {
    const cu = members[i].captureUsage;
    if (!cu) continue;
    total += (cu.cacheRead ?? 0) + (cu.cacheCreation ?? 0) + (cu.inputTokens ?? 0);
  }
  return total;
}

/**
 * Build one double-billed streak's output row from a census `duplicateRows[]`
 * entry (`{ path, cid, sid, length, billed, noId, startTs, lastTs,
 * startLine, lastLine, model, nMsg, maxTokens, intervalMs, members[] }`).
 * `class` names the population the streak's own startLine says it belongs
 * to: haiku sidecars land in the first few capture lines of a session,
 * main-thread streaks land mid-session.
 */
export function buildStreakRow(row, usageIndex) {
  const members = (row.members ?? []).map((m) => classifyMember(m, usageIndex));
  return {
    capture: basename(row.path ?? ""),
    class: (row.startLine ?? Infinity) <= 5 ? "session-start" : "mid-session",
    model: row.model ?? null,
    nMsg: row.nMsg ?? null,
    maxTokens: row.maxTokens ?? null,
    intervalMs: row.intervalMs ?? null,
    length: row.length ?? null,
    billed: row.billed ?? null,
    duplicateCharge: computeDuplicateCharge(members),
    members,
  };
}

/**
 * The rollup over every double-billed streak row: (a) counts by class,
 * (b) `duplicateCharge` — the corpus-wide sum of each streak's own
 * duplicateCharge, (c) join coverage — how many members reached each of the
 * three join states, (d) `bothAnswered` — streaks in which every member is
 * JOINED, split by whether every member's finalOutputTokens is non-zero.
 */
export function computeRollup(streakRows) {
  const byClass = {};
  let duplicateCharge = 0;
  const joinCoverage = { JOINED: 0, "NOT-IN-USAGE-LOG": 0, "NO-REQUEST-ID": 0 };
  let allJoinedCount = 0;
  let allNonZeroCount = 0;
  let someZeroCount = 0;

  for (const streak of streakRows) {
    byClass[streak.class] = (byClass[streak.class] ?? 0) + 1;
    duplicateCharge += streak.duplicateCharge;

    let allJoined = true;
    let allNonZero = true;
    for (const m of streak.members) {
      joinCoverage[m.join] = (joinCoverage[m.join] ?? 0) + 1;
      if (m.join !== "JOINED") {
        allJoined = false;
      } else if (!(m.finalOutputTokens > 0)) {
        allNonZero = false;
      }
    }
    if (allJoined) {
      allJoinedCount++;
      if (allNonZero) allNonZeroCount++;
      else someZeroCount++;
    }
  }

  return {
    byClass,
    duplicateCharge,
    joinCoverage,
    bothAnswered: {
      allJoined: allJoinedCount,
      allNonZeroOutput: allNonZeroCount,
      someZeroOutput: someZeroCount,
    },
  };
}

/**
 * Full report over a census export: every double-billed streak (`billed >
 * 1` — a streak billed exactly once, or not at all, never double-charged
 * anything and is out of scope for this tool) joined against `usageIndex`,
 * plus the rollup.
 */
export function buildReport(censusExport, usageIndex) {
  const doubleBilled = (censusExport.duplicateRows ?? []).filter((r) => (r.billed ?? 0) > 1);
  const streaks = doubleBilled.map((r) => buildStreakRow(r, usageIndex));
  const rollup = computeRollup(streaks);
  return { streaks, rollup };
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const censusI = args.indexOf("--census");
  const usageI = args.indexOf("--usage");
  return {
    census: censusI >= 0 ? args[censusI + 1] : null,
    usage: usageI >= 0 ? args[usageI + 1] : DEFAULT_USAGE_PATH,
    json: args.includes("--json"),
  };
}

function reportCouldNotVerify(message, json) {
  if (json) {
    process.stdout.write(JSON.stringify({ "could-not-verify": message }, null, 2) + "\n");
  } else {
    process.stderr.write(`duplicate-billing: ${message}\n`);
  }
  return 1;
}

export function main(argv) {
  const { census, usage, json } = parseArgs(argv);

  if (!census) {
    return reportCouldNotVerify(
      "--census <path> is required (a reminder-migration-census --json --verbose export)",
      json,
    );
  }

  let censusExport;
  try {
    censusExport = readCensusExport(census);
  } catch (e) {
    return reportCouldNotVerify(`could not read census export at ${census}: ${e?.message ?? e}`, json);
  }

  let usageIndex;
  try {
    usageIndex = readUsageIndex(usage);
  } catch (e) {
    return reportCouldNotVerify(`could not read usage log at ${usage}: ${e?.message ?? e}`, json);
  }

  const report = buildReport(censusExport, usageIndex);

  if (json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return 0;
  }

  const lines = [];
  lines.push(`duplicate-billing — ${report.streaks.length} double-billed streak(s)`);
  lines.push(`  by class: ${JSON.stringify(report.rollup.byClass)}`);
  lines.push(`  join coverage: ${JSON.stringify(report.rollup.joinCoverage)}`);
  lines.push(`  duplicateCharge (input-side tokens on duplicate sends only, capture-side): ${report.rollup.duplicateCharge}`);
  lines.push(`  bothAnswered: ${JSON.stringify(report.rollup.bothAnswered)}`);
  process.stdout.write(lines.join("\n") + "\n");
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv));
}
