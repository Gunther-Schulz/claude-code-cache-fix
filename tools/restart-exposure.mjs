#!/usr/bin/env node
// restart-exposure — what a proxy restart is about to cost, in tokens of
// conversations that are RUNNING RIGHT NOW.
//
// WHY THIS EXISTS. The threat matrix's row-3 rule reads "restarts are
// cache-transparent UNLESS the change touches state KEYS or freeze logic",
// and that formulation asks about the DIFF. On 2026-08-05 a restart cost
// 655,021 tokens while satisfying it: no state key changed, no freeze logic
// changed, and the shipped change nonetheless altered the forwarded bytes for
// a narrow class of messages. The row-3 statement written before that restart
// named the class correctly and then sized it as "one measured instance
// corpus-wide, so cheap" — which is the wrong denominator. The corpus is
// historical captures. The bill is paid by live conversations.
//
// It is also not a coincidence that the affected conversation was the one the
// change was being written in: a change made while using the thing it changes
// concentrates its blast radius exactly where the work is happening. That is
// the normal case, not the unlucky one.
//
// WHAT IT ANSWERS, and what it does not. It reports how much context each
// live session is holding, so "restart now" has a number attached instead of
// a shrug. It CANNOT tell you whether your change affects a given session —
// that needs a predicate only the change's author has. Pass one with
// `--match <regex>` and the report is filtered to sessions whose recent
// requests contain it; without one, every live session is listed and the
// total is the worst case.
//
// A session counts as LIVE when its capture has been appended to within the
// window (default 30 min). Reading the tail of each capture rather than the
// whole file keeps this fast on a 900 MB corpus.
//
// Usage:
//   node tools/restart-exposure.mjs [--window-min N] [--match <regex>] [--json]

import { readdirSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { join } from "node:path";
import { dataPath, legacyReadPath } from "../proxy/xdg-dirs.mjs";

const CAPTURES = process.env.CACHE_FIX_CAPTURE_DIR
  || legacyReadPath(dataPath("captures"), "cache-fix-captures");

// Read the last `bytes` of a file. A capture's newest request carries the
// largest message array, which is what a restart re-bills — so the tail is
// the right sample, and reading the head would understate every session.
function tailBytes(path, bytes) {
  const size = statSync(path).size;
  const len = Math.min(bytes, size);
  const buf = Buffer.alloc(len);
  const fd = openSync(path, "r");
  try {
    readSync(fd, buf, 0, len, size - len);
  } finally {
    closeSync(fd);
  }
  return buf.toString("utf-8");
}

/**
 * The last complete REQUEST record in a tail chunk, or null.
 *
 * Request records specifically: a capture interleaves `boot` and `outcome`
 * records, neither of which carries a body. Taking the last record of ANY kind
 * — which this did first — reported `? msgs, ~0k` for the session whose tail
 * happened to end on an outcome, and on the first live run that was precisely
 * the 800k session this tool exists to warn about. An instrument that
 * understates the case it was built for is worse than none.
 */
export function lastRecord(chunk) {
  const lines = chunk.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (!l.startsWith("{")) continue;
    let rec;
    try {
      rec = JSON.parse(l);
    } catch {
      continue; // a truncated first line is expected — the chunk starts mid-record
    }
    if (rec.type === "boot" || rec.type === "outcome") continue;
    if (!rec.body) continue;
    return rec;
  }
  return null;
}

/**
 * Approximate context size of a request record. Characters, not tokens: this
 * is a RELATIVE measure for ranking and for order-of-magnitude, and calling it
 * tokens would be a precision this cannot deliver. ~4 chars/token is the usual
 * rule of thumb and is applied only in the human summary, labelled as an
 * estimate.
 */
export function contextChars(rec) {
  const b = rec?.body;
  if (!b) return 0;
  let n = 0;
  if (Array.isArray(b.system)) n += JSON.stringify(b.system).length;
  if (Array.isArray(b.tools)) n += JSON.stringify(b.tools).length;
  if (Array.isArray(b.messages)) n += JSON.stringify(b.messages).length;
  return n;
}

export function scanLive(dir, { windowMin = 30, match = null, now = Date.now(), tail = 4 << 20 } = {}) {
  const cutoff = now - windowMin * 60_000;
  const rows = [];
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith("-requests.jsonl"));
  } catch {
    return { rows, dir, unreadable: true };
  }
  for (const f of files) {
    const path = join(dir, f);
    let st;
    try {
      st = statSync(path);
    } catch {
      continue;
    }
    if (st.mtimeMs < cutoff) continue;
    let chunk;
    try {
      chunk = tailBytes(path, tail);
    } catch {
      continue;
    }
    const rec = lastRecord(chunk);
    if (!rec) continue;
    // `match` is tested against the TAIL, not the whole capture: a class the
    // change affects has to be present in the recent prefix to be re-billed,
    // and reading 900 MB to be sure is not worth the wait before a restart.
    if (match && !match.test(chunk)) continue;
    rows.push({
      capture: f,
      lastActivity: new Date(st.mtimeMs).toISOString(),
      messages: Array.isArray(rec.body?.messages) ? rec.body.messages.length : null,
      chars: contextChars(rec),
      matched: !!match,
    });
  }
  rows.sort((a, b) => b.chars - a.chars);
  return { rows, dir, unreadable: false };
}

function main(argv) {
  const args = argv.slice(2);
  const num = (flag, dflt) => {
    const i = args.indexOf(flag);
    return i >= 0 ? Number(args[i + 1]) : dflt;
  };
  const matchArg = args.indexOf("--match") >= 0 ? args[args.indexOf("--match") + 1] : null;
  const windowMin = num("--window-min", 30);
  const match = matchArg ? new RegExp(matchArg) : null;

  const { rows, dir, unreadable } = scanLive(CAPTURES, { windowMin, match });
  if (unreadable) {
    process.stderr.write(`restart-exposure: cannot read ${dir}\n`);
    return 2;
  }
  if (args.includes("--json")) {
    process.stdout.write(JSON.stringify({ windowMin, match: matchArg, rows }, null, 2) + "\n");
    return 0;
  }
  const total = rows.reduce((a, r) => a + r.chars, 0);
  process.stdout.write(
    `live sessions in the last ${windowMin} min` +
    (matchArg ? ` matching /${matchArg}/` : "") + `: ${rows.length}\n`);
  for (const r of rows) {
    process.stdout.write(
      `  ${r.capture.slice(0, 14)}…  ${String(r.messages ?? "?").padStart(5)} msgs  ` +
      `~${(r.chars / 4 / 1000).toFixed(0)}k tok (est)  last ${r.lastActivity}\n`);
  }
  process.stdout.write(
    `\nworst case if a restart changes forwarded bytes for these: ~${(total / 4 / 1000).toFixed(0)}k tokens\n`);
  if (!matchArg) {
    process.stdout.write(
      "no --match given, so this is EVERY live session — pass the predicate for\n" +
      "your change to narrow it. A restart that changes nothing on the wire\n" +
      "costs none of this.\n");
  }
  return 0;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\//, ""))) {
  process.exit(main(process.argv));
}
