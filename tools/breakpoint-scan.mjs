#!/usr/bin/env node
// breakpoint-scan — report cache_control breakpoint layout per request.
//
// Usage:
//   node tools/breakpoint-scan.mjs <capture-or-mirror.jsonl> [--since <ISO>] [--until <ISO>] [--json]
//
// READ-ONLY reporter, no mutation of any input. For every record in the
// input file that carries a request body (`body` is present and an
// object), emits the location of every `cache_control` key found under
// `body.system`, `body.tools`, and `body.messages`, in document order,
// plus request-shape context (nMessages, lastUserIndex).
//
// Location grammar (fixed — do not invent another):
//   system[<i>]                       a block in body.system, when system is an array
//   system                            body.system is an object carrying cache_control directly
//   tools[<i>]                        body.tools[i]
//   messages[<i>].content[<j>]:<role> a content block inside a message
//   messages[<i>]                     a message-level marker (not inside content)
// Paths are never reported deeper than the block level (no descent into
// nested content, e.g. a tool_result's own content array).
//
// Schema tolerance: an input file mixes more than one record kind (request
// records, outcome records, boot records — see proxy/extensions/
// request-capture.mjs — and, in a session-mirror file, per-message CC-
// transcript-shaped records with no `body` at all). Any record with no
// object `body` is SKIPPED, and the skip count (by reason) is printed to
// stderr at the end. A record that could not be interpreted is reported as
// skipped, never silently scored as zero markers — the same discipline
// docs/dev-loop.md's "why a missing reader outranks a missing check"
// describes for this repo's own formats.
//
// Streamed with tools/read-lines.mjs — never readline.createInterface,
// never readFileSync. Capture files reach hundreds of MB with individual
// lines several MB long; read-lines.mjs's header documents the measured
// 3.27 GB blowup a push-based reader produces here. Each line's parsed
// body is discarded before the next line is read: nothing here retains
// more than one record at a time.

import { readLines } from "./read-lines.mjs";

/**
 * Find every `cache_control` key in a request record's body, in document
 * order, as location strings per the fixed grammar above.
 * @param {{body: object}} record — a record already known to carry a body.
 * @returns {string[]}
 */
export function findMarkers(record) {
  const body = record.body;
  const markers = [];

  if (Array.isArray(body.system)) {
    for (let i = 0; i < body.system.length; i++) {
      const block = body.system[i];
      if (block && typeof block === "object" && block.cache_control) markers.push(`system[${i}]`);
    }
  } else if (body.system && typeof body.system === "object" && body.system.cache_control) {
    markers.push("system");
  }

  if (Array.isArray(body.tools)) {
    for (let i = 0; i < body.tools.length; i++) {
      const tool = body.tools[i];
      if (tool && typeof tool === "object" && tool.cache_control) markers.push(`tools[${i}]`);
    }
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== "object") continue;
    const role = msg.role ?? "?";
    if (Array.isArray(msg.content)) {
      for (let j = 0; j < msg.content.length; j++) {
        const block = msg.content[j];
        if (block && typeof block === "object" && block.cache_control) {
          markers.push(`messages[${i}].content[${j}]:${role}`);
        }
      }
    } else if (msg.cache_control) {
      markers.push(`messages[${i}]`);
    }
  }

  return markers;
}

/**
 * True iff a parsed JSONL line is a record this tool can scan — an object
 * carrying an object `body`. Anything else (outcome/boot capture records,
 * a session-mirror's per-message envelopes, or an unrecognized shape) is
 * not scannable and the caller must count it as skipped rather than
 * report zero markers for it.
 */
export function hasScannableBody(rec) {
  return !!(rec && typeof rec === "object" && rec.body && typeof rec.body === "object");
}

/** The skip-reason label for a record with no scannable body. */
export function skipReason(rec) {
  if (rec && typeof rec === "object" && typeof rec.type === "string" && rec.type) return rec.type;
  return "no-body";
}

/**
 * Build the reported row for one scannable record.
 * @param {object} rec — a record for which hasScannableBody(rec) is true.
 * @param {number} line — 1-based line number in the source file.
 */
export function buildRow(rec, line) {
  const body = rec.body;
  const markers = findMarkers(rec);
  const messages = Array.isArray(body.messages) ? body.messages : [];
  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      lastUserIndex = i;
      break;
    }
  }
  return {
    ts: typeof rec.ts === "string" ? rec.ts : null,
    line,
    sid: rec.sid ?? rec.key ?? null,
    markers,
    markerCount: markers.length,
    nMessages: messages.length,
    lastUserIndex,
  };
}

function parseArgs(argv) {
  const args = { since: null, until: null, json: false, file: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--since") args.since = argv[++i] ?? null;
    else if (a === "--until") args.until = argv[++i] ?? null;
    else if (a === "--json") args.json = true;
    else if (!args.file && !a.startsWith("--")) args.file = a;
  }
  return args;
}

function formatRowTable(row) {
  return (
    `${row.ts ?? "-"}  line=${row.line}  sid=${row.sid ?? "-"}  ` +
    `markerCount=${row.markerCount}  nMessages=${row.nMessages}  ` +
    `lastUserIndex=${row.lastUserIndex}  markers=[${row.markers.join(", ")}]\n`
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    process.stderr.write(
      "usage: node tools/breakpoint-scan.mjs <capture-or-mirror.jsonl> [--since <ISO>] [--until <ISO>] [--json]\n",
    );
    process.exitCode = 2;
    return;
  }

  const sinceMs = args.since ? Date.parse(args.since) : null;
  const untilMs = args.until ? Date.parse(args.until) : null;
  if (args.since && Number.isNaN(sinceMs)) {
    process.stderr.write(`[breakpoint-scan] --since is not a parseable ISO timestamp: ${args.since}\n`);
    process.exitCode = 2;
    return;
  }
  if (args.until && Number.isNaN(untilMs)) {
    process.stderr.write(`[breakpoint-scan] --until is not a parseable ISO timestamp: ${args.until}\n`);
    process.exitCode = 2;
    return;
  }

  let lineNo = 0;
  let scanned = 0;
  let skipped = 0;
  let filteredOut = 0;
  const skipReasons = Object.create(null);

  if (!args.json) {
    process.stdout.write(
      "ts                        line  sid  markerCount  nMessages  lastUserIndex  markers\n",
    );
  }

  for await (const raw of readLines(args.file)) {
    lineNo++;
    const line = raw.trim();
    if (!line) continue; // blank line: not a record, not counted either way

    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      skipped++;
      skipReasons["parse-error"] = (skipReasons["parse-error"] ?? 0) + 1;
      continue;
    }

    if (!hasScannableBody(rec)) {
      skipped++;
      const reason = skipReason(rec);
      skipReasons[reason] = (skipReasons[reason] ?? 0) + 1;
      continue;
    }

    if (sinceMs !== null || untilMs !== null) {
      const tMs = typeof rec.ts === "string" ? Date.parse(rec.ts) : NaN;
      if (Number.isNaN(tMs)) {
        // Has a body but no usable timestamp to filter on: not scannable
        // under a time window, but it IS a real request record — count it
        // as skipped rather than silently drop it from both tallies.
        skipped++;
        skipReasons["unparseable-ts"] = (skipReasons["unparseable-ts"] ?? 0) + 1;
        continue;
      }
      if ((sinceMs !== null && tMs < sinceMs) || (untilMs !== null && tMs > untilMs)) {
        filteredOut++;
        continue;
      }
    }

    const row = buildRow(rec, lineNo);
    scanned++;
    process.stdout.write(args.json ? JSON.stringify(row) + "\n" : formatRowTable(row));
  }

  const reasonsStr =
    Object.entries(skipReasons)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ") || "none";
  process.stderr.write(
    `[breakpoint-scan] ${lineNo} line(s) read, ${scanned} scanned, ${filteredOut} outside window, ` +
      `${skipped} skipped (no scannable body) [${reasonsStr}]\n`,
  );
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    process.stderr.write(`[breakpoint-scan] fatal: ${err?.stack || err}\n`);
    process.exitCode = 1;
  });
}
