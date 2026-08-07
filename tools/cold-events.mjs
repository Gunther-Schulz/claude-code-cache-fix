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
//   - proxy captures  ~/.claude/cache-fix-captures/<key>-requests.jsonl
//                     (`type:"outcome"` records: request-capture.mjs writes
//                     cacheRead/cacheCreation/inputTokens per response)
//
// Usage:
//   node tools/cold-events.mjs <file...>              # scan, print to stdout
//   node tools/cold-events.mjs --out <path> <file...> # append to a ledger
//   node tools/cold-events.mjs --json <file...>       # machine-readable
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
  for (const r of rows) {
    if (!r) continue;
    const handle = `${r.key}#${r.id ?? ""}`;
    if (r.id && seen.has(handle)) { dropped++; continue; }
    if (r.id) seen.add(handle);
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
  return { events, totals, dropped };
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

export async function main(argv) {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const outI = args.indexOf("--out");
  const out = outI >= 0 ? args[outI + 1] : null;
  const inputs = args.filter((a, i) =>
    !a.startsWith("--") && !(outI >= 0 && i === outI + 1));

  if (!inputs.length) {
    process.stderr.write(
      "usage: node tools/cold-events.mjs [--out <ledger>] [--json] <usage-jsonl...>\n" +
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
  process.stdout.write(json ? JSON.stringify(result, null, 2) + "\n" : renderReport(result, inputs));
  return 0;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  process.exit(await main(process.argv));
}
