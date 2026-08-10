#!/usr/bin/env node
// cold-events — cold-rewrite detection over ANY stream of usage rows,
// including the ones `claude-worktime` structurally cannot see.
//
// Why this exists (BACKLOG, "proxy-side cold detection"): worktime keys its
// cold state by MAIN-session id (`.cold_<sid>`), and subagents produce no
// main transcript, so every token a dispatch spends is invisible to the ❄
// ledger. One 2026-07-30 fable verify dispatch cost 1,071,241 processed
// tokens (dedup-corrected) with no ledger row of any kind. The proxy — and
// the records it already writes — see all of it.
//
// THE PREDICATE IS NOT INVENTED HERE. It is claude-worktime's own, read off
// `claude-worktime.sh` (the cold-rewrite detection block, "Cold-rewrite
// detection for the ❄ token"), so this tool and the statusline can never
// disagree about what a cold rewrite IS:
//
//     ctx      = cache_read + cache_creation + input_tokens        (this turn)
//     prev_ctx = the previous turn's ctx, on the SAME conversation
//     hit  <=>  prev_t > 0                       (a prior turn was recorded)
//               and prev_ctx >= COLD_MIN_CTX     (cosmetic floor, default 0)
//               and cc >= floor(prev_ctx * 6/10) (wrote most of prior ctx)
//               and cr <= floor(prev_ctx / 5)    (read almost none of it back)
//
//     cause: gap >= floor(ttl * 9/10)      -> "idle"   (cache expired)
//            else prev_model != model      -> "model"  (cache-key switch)
//            else                          -> "other"  (the interesting one)
//
// The `prev_t > 0` clause is worktime's deliberate skip of a conversation's
// FIRST write: cr=0 with cc=the-whole-initial-context is mechanically
// identical to a cold rewrite, and a fresh conversation cannot have lost a
// cache it never had. It is reproduced rather than "improved" — the integer
// divisions too — because a detector that disagrees with the statusline on
// the same rows is a second opinion nobody asked for.
//
// WHAT IS NEW here is not the predicate but the POPULATION: rows are read
// per CONVERSATION (a subagent's `agentId`, not the session id it shares
// with its parent), so a dispatch gets its own running totals and its own
// prev_ctx chain. Diffing a subagent's 38k turn against its parent's 236k
// one is the same co-tenant false-cause artifact prefix-diff's `tenantId`
// exists to remove.
//
// Sources, both already written by this machine — no new tap needed:
//   - CC transcripts  ~/.claude/projects/**/<sid>.jsonl and
//                     **/subagents/agent-*.jsonl   (message.usage per call)
//   - proxy captures  dataPath("captures")/<key>-requests.jsonl (XDG data dir)
//                     (`type:"outcome"` records: request-capture.mjs writes
//                     cacheRead/cacheCreation/inputTokens per response)
//
// Usage:
//   node tools/cold-events.mjs <file...>              # scan, print to stdout
//   node tools/cold-events.mjs --out <path> <file...> # append to a ledger
//   node tools/cold-events.mjs --json <file...>       # machine-readable
//   node tools/cold-events.mjs --rows <file...>       # one deduped API call
//     per line, JSONL, sorted by ts. `--rows` and `--json` are mutually
//     exclusive output modes (exit 2 if both are given). Optional
//     `--since <ISO>` / `--until <ISO>` window the rows (inclusive both
//     ends, by the row's own `ts`); an unparseable bound is a usage error.
//     THE TRANSCRIPT QUERY INSTRUMENT (BACKLOG): this is the mode that
//     replaces the recurring hand-rolled `jq` walk over
//     `~/.claude/projects/**/<sid>.jsonl`.
//
// `--out` is REQUIRED to write anything. The live ledger path is exported as
// DEFAULT_LEDGER_PATH for the eventual proxy-side wiring and is never the
// default here, so a test (or a careless run) cannot touch it.
//
// THREE answers, never two (dev-loop.md): a run that found no usage rows
// says so and exits 2 — "nothing to check" must not read like "clean".

import { appendFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { readLines } from "./read-lines.mjs";
import { statePath, legacyReadPath } from "../proxy/xdg-dirs.mjs";

// Live ledger for the proxy-side wiring (BACKLOG assignment). Exported, never
// defaulted to: see the `--out` note above.
// XDG STATE, and found the same way as the oauth events log: by grepping the
// writers rather than listing the directory.
export const DEFAULT_LEDGER_PATH = process.env.CACHE_FIX_COLD_EVENTS
  || legacyReadPath(statePath("cold-events.jsonl"), "cache-fix-cold-events.jsonl");

// worktime's own constants. COLD_MIN_CTX is its cosmetic floor (default 0 —
// "shows everything"); CACHE_GUARD_TTL defaults to 3600s there too.
export const COLD_MIN_CTX = 0;
export const COLD_TTL_SEC = 3600;

const j = (line) => { try { return JSON.parse(line); } catch { return null; } };

/**
 * One usage row, normalized out of whichever record shape carried it.
 * Returns null for every line that is not an API call's usage report.
 *
 * `key` is the CONVERSATION, not the file and not the session id:
 *   - transcript: `agentId` when the row is a subagent's, else the sessionId
 *   - capture:    the capture `key` (session-derived) — the proxy cannot see
 *                 agent identity (workflow-agent-derivation.mjs: CC keeps it
 *                 in-process), so capture-sourced rows are session-grained and
 *                 say so via `grain`.
 */
export function normalizeRow(rec, fallbackKey = null) {
  if (!rec || typeof rec !== "object") return null;

  // Proxy capture outcome record (request-capture.mjs buildOutcomeRecord).
  if (rec.type === "outcome" && rec.usage) {
    const u = rec.usage;
    return {
      key: rec.key ?? fallbackKey ?? "<unknown>",
      sid: rec.key ?? null,
      id: rec.id ?? rec.requestId ?? null,
      ts: rec.ts ?? null,
      model: rec.model ?? null,
      cc: u.cacheCreation ?? 0,
      cr: u.cacheRead ?? 0,
      input: u.inputTokens ?? 0,
      src: "capture",
      grain: "session",
      // A capture outcome record carries no assistant-message envelope, so
      // neither field exists at this tap — null, not omitted, so a --rows
      // consumer sees the same key set from either source branch.
      messageId: null,
      stopReason: null,
    };
  }

  // CC transcript assistant entry.
  const u = rec.message?.usage;
  if (!u) return null;
  const agent = rec.agentId ?? null;
  return {
    key: agent ? `a-${agent}` : rec.sessionId ? `s-${rec.sessionId}` : fallbackKey ?? "<unknown>",
    sid: rec.sessionId ?? null,
    // Dedup handle. A transcript replays the SAME assistant entry once per
    // tool-use leg — the 2026-07-30 fable dispatch has 38 rows for 12 API
    // calls, and summing them triples the cost. requestId is the API call.
    id: rec.requestId ?? rec.message?.id ?? null,
    // The message's OWN id — distinct from `id` above, which prefers
    // requestId (the API-call handle) and falls back to this only when no
    // requestId exists. Kept separately because a --rows consumer joining
    // against the transcript by message id needs the field requestId hid.
    messageId: rec.message?.id ?? null,
    ts: rec.timestamp ?? null,
    model: rec.message?.model ?? null,
    cc: u.cache_creation_input_tokens ?? 0,
    cr: u.cache_read_input_tokens ?? 0,
    input: u.input_tokens ?? 0,
    src: "transcript",
    grain: agent ? "conversation" : "session",
    // The API's own verdict when it gave one — the same field worktime's
    // cause classifier reads. Carried through so an event row does not have
    // to be re-joined against the transcript to learn what the API said.
    apiCause: rec.message?.diagnostics?.cache_miss_reason?.type ?? null,
    mtok: rec.message?.diagnostics?.cache_miss_reason?.cache_missed_input_tokens ?? null,
    stopReason: rec.message?.stop_reason ?? null,
  };
}

/** Read one JSONL file, yielding normalized rows. Streamed (dev-loop: a
 * whole-file read dies at >512 MB, and captures routinely exceed it). */
export async function* readUsageRows(path) {
  for await (const line of readLines(path)) {
    if (!line) continue;
    const row = normalizeRow(j(line));
    if (row) yield row;
  }
}

/**
 * The detector. Rows may arrive in any order and from any mix of sources;
 * they are grouped by conversation key and replayed in timestamp order,
 * because prev_ctx is only meaningful along one conversation's own chain.
 *
 * Returns { events, totals, rows, dropped } where `dropped` counts duplicate
 * API calls removed — a number worth printing, since summing the raw rows is
 * the specific error this dedup exists to prevent.
 */
export function scanRows(rows, options = {}) {
  const minCtx = options.minCtx ?? COLD_MIN_CTX;
  const ttl = options.ttlSec ?? COLD_TTL_SEC;

  const byKey = new Map();
  let dropped = 0;
  const seen = new Set();
  const dedupedRows = [];
  for (const r of rows) {
    if (!r) continue;
    const handle = `${r.key}#${r.id ?? ""}`;
    if (r.id && seen.has(handle)) { dropped++; continue; }
    if (r.id) seen.add(handle);
    dedupedRows.push(r);
    if (!byKey.has(r.key)) byKey.set(r.key, []);
    byKey.get(r.key).push(r);
  }

  const events = [];
  const totals = [];
  for (const [key, group] of byKey) {
    group.sort((a, b) => String(a.ts ?? "").localeCompare(String(b.ts ?? "")));
    let prevCtx = 0;
    let prevT = null;
    let prevModel = null;
    let cc = 0, cr = 0, input = 0, hits = 0;
    for (const r of group) {
      const t = r.ts ? Date.parse(r.ts) / 1000 : null;
      if (
        prevT !== null &&
        prevCtx >= minCtx &&
        r.cc >= Math.floor((prevCtx * 6) / 10) &&
        r.cr <= Math.floor(prevCtx / 5)
      ) {
        const gap = t !== null && prevT !== null ? Math.round(t - prevT) : 0;
        let cause;
        if (gap >= Math.floor((ttl * 9) / 10)) cause = "idle";
        else if (prevModel && r.model && prevModel !== r.model) cause = "model";
        else cause = r.apiCause ?? "other";
        events.push({
          type: "cold-event",
          ts: r.ts,
          key,
          sid: r.sid ?? null,
          grain: r.grain,
          src: r.src,
          model: r.model ?? null,
          prevModel,
          cc: r.cc,
          cr: r.cr,
          ctx: r.cc + r.cr + r.input,
          prevCtx,
          gap,
          cause,
          mtok: r.mtok ?? null,
        });
        hits++;
      }
      cc += r.cc; cr += r.cr; input += r.input;
      prevCtx = r.cc + r.cr + r.input;
      prevT = t;
      prevModel = r.model ?? prevModel;
    }
    totals.push({
      type: "cold-totals",
      key,
      sid: group[0]?.sid ?? null,
      grain: group[0]?.grain ?? null,
      src: group[0]?.src ?? null,
      models: [...new Set(group.map((r) => r.model).filter(Boolean))],
      calls: group.length,
      cc, cr, input,
      processed: cc + cr,
      events: hits,
      first: group[0]?.ts ?? null,
      last: group[group.length - 1]?.ts ?? null,
    });
  }
  totals.sort((a, b) => b.processed - a.processed);
  events.sort((a, b) => String(a.ts ?? "").localeCompare(String(b.ts ?? "")));
  return { events, totals, rows: dedupedRows, dropped };
}

/** Ledger form: one JSON object per line, events then totals. */
export function ledgerLines(result) {
  return [...result.events, ...result.totals].map((r) => JSON.stringify(r));
}

const k = (n) => `${Math.round(n / 1000)}k`;

export function renderReport(result, inputs) {
  const out = [];
  out.push(`cold-events — ${inputs.length} file(s), ${result.totals.length} conversation(s)` +
           (result.dropped ? `, ${result.dropped} duplicate transcript row(s) dropped` : ""));
  out.push("");
  out.push("  SPEND (per conversation, newest sources first)");
  for (const t of result.totals.slice(0, 20)) {
    out.push(`    ${String(t.key).padEnd(42)} calls=${String(t.calls).padStart(4)} ` +
             `cc=${k(t.cc).padStart(6)} cr=${k(t.cr).padStart(7)} ` +
             `processed=${k(t.processed).padStart(7)} events=${t.events}`);
  }
  out.push("");
  if (!result.events.length) {
    out.push("  EVENTS  none — no turn crossed the magnitude threshold in these rows.");
  } else {
    out.push(`  EVENTS (${result.events.length})`);
    for (const e of result.events) {
      out.push(`    ${e.ts}  ${k(e.cc).padStart(6)} re-written  cause=${e.cause.padEnd(18)} ` +
               `prevCtx=${k(e.prevCtx)}  ${e.key}`);
    }
  }
  return out.join("\n") + "\n";
}

/**
 * --rows window predicate. `since`/`until` are epoch-ms (or undefined for an
 * unbounded side); both bounds are INCLUSIVE. A row with no `ts` is excluded
 * the moment either bound is given — an unstamped row cannot prove it falls
 * inside a window, and silently keeping it would read like a match — and
 * included when neither bound narrows the query at all.
 */
export function inWindow(ts, since, until) {
  if (since === undefined && until === undefined) return true;
  if (!ts) return false;
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return false;
  if (since !== undefined && t < since) return false;
  if (until !== undefined && t > until) return false;
  return true;
}

// Vocabulary mapping for --rows: the tool's own row spelling (left, what
// normalizeRow already emits and what `totals`/`events` above already use)
// against the transcript's spelling (right, what a reader coming from
// `~/.claude/projects/**/<sid>.jsonl` or the BACKLOG entry would search for).
// Emitted field names are the LEFT column on purpose — this repo has paid
// twice this week for one quantity carrying two spellings, and events/totals
// already committed to the left column first.
//   ts        <- message.timestamp
//   key       (conversation grouping key; no transcript equivalent)
//   sid       <- sessionId
//   id        <- requestId (falls back to message.id when absent)
//   messageId <- message.id
//   model     <- message.model
//   cc        <- message.usage.cache_creation_input_tokens
//   cr        <- message.usage.cache_read_input_tokens
//   input     <- message.usage.input_tokens
//   ctx       <- cc + cr + input (not a transcript field; scanRows' own sum)
//   apiCause  <- message.diagnostics.cache_miss_reason.type
//   mtok      <- message.diagnostics.cache_miss_reason.cache_missed_input_tokens
//   stopReason <- message.stop_reason
//   src, grain (this tool's own provenance/grouping labels; no transcript equivalent)
export function toRowRecord(r) {
  return {
    ts: r.ts ?? null,
    key: r.key,
    sid: r.sid ?? null,
    id: r.id ?? null,
    messageId: r.messageId ?? null,
    model: r.model ?? null,
    cc: r.cc,
    cr: r.cr,
    input: r.input,
    ctx: r.cc + r.cr + r.input,
    apiCause: r.apiCause ?? null,
    mtok: r.mtok ?? null,
    stopReason: r.stopReason ?? null,
    src: r.src,
    grain: r.grain,
  };
}

/**
 * Deduped rows -> the --rows CLI's emission list: windowed (both bounds
 * inclusive, see `inWindow`), mapped through the tool's own vocabulary, and
 * sorted by `ts` ascending with `key` as tie-break.
 */
export function rowsForOutput(rows, { since, until } = {}) {
  return rows
    .filter((r) => inWindow(r.ts, since, until))
    .map(toRowRecord)
    .sort((a, b) => {
      const byTs = String(a.ts ?? "").localeCompare(String(b.ts ?? ""));
      return byTs !== 0 ? byTs : String(a.key).localeCompare(String(b.key));
    });
}

export async function main(argv) {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const rowsMode = args.includes("--rows");
  const outI = args.indexOf("--out");
  const out = outI >= 0 ? args[outI + 1] : null;
  const sinceI = args.indexOf("--since");
  const sinceRaw = sinceI >= 0 ? args[sinceI + 1] : null;
  const untilI = args.indexOf("--until");
  const untilRaw = untilI >= 0 ? args[untilI + 1] : null;
  const valueSlots = new Set(
    [outI, sinceI, untilI].filter((i) => i >= 0).map((i) => i + 1));
  const inputs = args.filter((a, i) => !a.startsWith("--") && !valueSlots.has(i));

  if (rowsMode && json) {
    process.stderr.write(
      "cold-events: --rows and --json are mutually exclusive output modes — pick one\n");
    return 2;
  }

  let since, until;
  if (sinceRaw != null) {
    const t = Date.parse(sinceRaw);
    if (Number.isNaN(t)) {
      process.stderr.write(`cold-events: --since is not a parseable date: ${sinceRaw}\n`);
      return 2;
    }
    since = t;
  }
  if (untilRaw != null) {
    const t = Date.parse(untilRaw);
    if (Number.isNaN(t)) {
      process.stderr.write(`cold-events: --until is not a parseable date: ${untilRaw}\n`);
      return 2;
    }
    until = t;
  }

  if (!inputs.length) {
    process.stderr.write(
      "usage: node tools/cold-events.mjs [--out <ledger>] [--json | --rows] " +
      "[--since <ISO>] [--until <ISO>] <usage-jsonl...>\n" +
      "  inputs: CC transcripts (~/.claude/projects/**) or proxy captures\n" +
      `  live ledger path (wiring only, never written here): ${DEFAULT_LEDGER_PATH}\n`);
    return 2;
  }

  const rows = [];
  const missing = [];
  for (const f of inputs) {
    if (!existsSync(f)) { missing.push(f); continue; }
    for await (const r of readUsageRows(f)) rows.push(r);
  }
  if (!rows.length) {
    // COULD NOT VERIFY — its own answer, folded into neither (dev-loop.md).
    process.stderr.write(
      `cold-events: no usage rows in ${inputs.length} input(s)` +
      (missing.length ? ` (${missing.length} missing: ${missing.join(", ")})` : "") +
      " — nothing was checked; this is NOT a clean result.\n");
    return 2;
  }
  const result = scanRows(rows);
  if (missing.length) {
    process.stderr.write(`cold-events: WARN ${missing.length} input(s) missing: ${missing.join(", ")}\n`);
  }

  if (out) {
    const body = ledgerLines(result).join("\n") + "\n";
    if (existsSync(out)) await appendFile(out, body);
    else await writeFile(out, body);
  }

  if (rowsMode) {
    // Dropped duplicates go to STDERR, never into the JSONL — stdout stays
    // machine-clean for a consumer piping this into `jq` or a file.
    if (result.dropped) {
      process.stderr.write(`cold-events: ${result.dropped} duplicate transcript row(s) dropped\n`);
    }
    for (const r of rowsForOutput(result.rows, { since, until })) {
      process.stdout.write(JSON.stringify(r) + "\n");
    }
    return 0;
  }

  process.stdout.write(json ? JSON.stringify(result, null, 2) + "\n" : renderReport(result, inputs));
  return 0;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  process.exit(await main(process.argv));
}
