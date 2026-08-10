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
// `--match` is TEXT — a substring or pattern in the tail bytes — and an
// extension-behaviour change's affected class is usually STRUCTURAL: "a
// conversation where a suppression is firing with nothing restoring the
// block" is a predicate over canonical state and forwarded bytes, not over
// text, and no text pattern can state it (BACKLOG.md, "`restart-exposure
// --match` takes a TEXT predicate"). `--match-class <name>` answers that
// case: it runs the real pipeline (`replay.mjs --gates-from-capture`, so it
// always replays the gates the capture's OWN boot records declare rather
// than the caller's ambient defaults — dev-loop, "Replay the configuration
// that is SERVING, not the defaults") over each live session's own capture
// and asks whether it CURRENTLY carries a conservation violation of the
// named kind. The vocabulary is `replay.mjs`'s own conservation kinds
// (`suppressed-without-copy` / `invented` / `lost`), not a new one — a
// session either passes both filters when both are given, or the one that
// was given.
//
// A session counts as LIVE when its capture has been appended to within the
// window (default 30 min). Reading the tail of each capture rather than the
// whole file keeps `--match` fast on a 900 MB corpus; `--match-class`
// necessarily replays the WHOLE capture (conservation state accumulates
// per-conversation across the file), so it only ever runs on sessions that
// already passed the cheap live-window filter.
//
// Usage:
//   node tools/restart-exposure.mjs [--window-min N] [--match <regex>]
//     [--match-class suppressed-without-copy|invented|lost] [--json]

import { readdirSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { dataPath, legacyReadPath } from "../proxy/xdg-dirs.mjs";
import { localSuffix } from "./local-stamp.mjs";

// Overridable for tests only, same idiom as `CACHE_FIX_CAPTURE_DIR` etc.:
// exercising `--match-class`'s WIRING (subprocess call, exit-code-as-signal
// handling, JSON class matching) does not need the real multi-minute
// pipeline replay — that logic carries its own red-first-proven suite
// (test/conservation-exemptions.test.mjs, test/replay-gate-selfcheck.test.mjs).
// Production never sets this.
const REPLAY_TOOL = process.env.CACHE_FIX_REPLAY_TOOL_PATH
  || join(dirname(fileURLToPath(import.meta.url)), "replay.mjs");

// The gate's own vocabulary (tools/replay.mjs, `conservationViolations`) —
// restated here as a closed set so an unrecognised `--match-class` fails
// loudly instead of silently matching nothing.
export const CONSERVATION_CLASSES = ["suppressed-without-copy", "invented", "lost"];

/**
 * Does this capture CURRENTLY carry a conservation violation of the named
 * kind? Spawns the real CLI rather than importing `replay.mjs`'s internals:
 * `main()` there is unexported and reads `process.argv` directly, and the
 * conservation checker needs the full per-conversation replay state
 * `main()` builds while walking the file — there is no smaller reusable
 * piece. `--gates-from-capture` resolves the gates from the capture's own
 * boot records, so this needs no separate query of the serving config.
 */
export function matchesConservationClass(capturePath, kind) {
  let out;
  try {
    out = execFileSync(
      process.execPath,
      [REPLAY_TOOL, capturePath, "--gates-from-capture", "--json"],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (err) {
    // replay.mjs sets process.exitCode = 1 whenever it finds ANY violation —
    // conservation included — so a non-zero exit is the EXPECTED shape for a
    // session that does carry the class, not a real failure. stdout still
    // carries the report; only a JSON parse failure below is a real error.
    if (typeof err.stdout !== "string") throw err;
    out = err.stdout;
  }
  const report = JSON.parse(out);
  return Array.isArray(report.conservation) && report.conservation.some((v) => v.kind === kind);
}

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

export function scanLive(dir, {
  windowMin = 30, match = null, matchClass = null, now = Date.now(), tail = 4 << 20,
} = {}) {
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
    // `matchClass` is a STRUCTURAL predicate and cannot be answered from the
    // tail — it replays the whole capture. Applied last, and only to rows
    // that already passed the cheap filters above, since it is the
    // expensive one.
    if (matchClass && !matchesConservationClass(path, matchClass)) continue;
    rows.push({
      capture: f,
      lastActivity: new Date(st.mtimeMs).toISOString(),
      messages: Array.isArray(rec.body?.messages) ? rec.body.messages.length : null,
      chars: contextChars(rec),
      matched: !!match,
      matchedClass: matchClass || null,
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
  const matchClassArg = args.indexOf("--match-class") >= 0 ? args[args.indexOf("--match-class") + 1] : null;
  const windowMin = num("--window-min", 30);
  const match = matchArg ? new RegExp(matchArg) : null;

  if (matchClassArg && !CONSERVATION_CLASSES.includes(matchClassArg)) {
    process.stderr.write(
      `restart-exposure: unknown --match-class "${matchClassArg}" — one of `
        + `${CONSERVATION_CLASSES.join(", ")}\n`,
    );
    return 2;
  }

  const { rows, dir, unreadable } = scanLive(CAPTURES, { windowMin, match, matchClass: matchClassArg });
  if (unreadable) {
    process.stderr.write(`restart-exposure: cannot read ${dir}\n`);
    return 2;
  }
  if (args.includes("--json")) {
    process.stdout.write(JSON.stringify({ windowMin, match: matchArg, matchClass: matchClassArg, rows }, null, 2) + "\n");
    return 0;
  }
  const total = rows.reduce((a, r) => a + r.chars, 0);
  const predicateNote = [
    matchArg ? `matching /${matchArg}/` : null,
    matchClassArg ? `carrying a "${matchClassArg}" conservation violation` : null,
  ].filter(Boolean).join(" and ");
  process.stdout.write(
    `live sessions in the last ${windowMin} min` +
    (predicateNote ? ` ${predicateNote}` : "") + `: ${rows.length}\n`);
  for (const r of rows) {
    process.stdout.write(
      `  ${r.capture.slice(0, 14)}…  ${String(r.messages ?? "?").padStart(5)} msgs  ` +
      `~${(r.chars / 4 / 1000).toFixed(0)}k tok (est)  last ${r.lastActivity} ` +
      `${localSuffix(Date.parse(r.lastActivity))}\n`);
  }
  process.stdout.write(
    `\nworst case if a restart changes forwarded bytes for these: ~${(total / 4 / 1000).toFixed(0)}k tokens\n`);
  if (!matchArg && !matchClassArg) {
    process.stdout.write(
      "no --match or --match-class given, so this is EVERY live session — pass\n" +
      "a predicate for your change to narrow it. A restart that changes nothing\n" +
      "on the wire costs none of this.\n");
  }
  return 0;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\//, ""))) {
  process.exit(main(process.argv));
}
