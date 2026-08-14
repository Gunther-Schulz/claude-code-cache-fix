#!/usr/bin/env node
// Adjacent byte-identical request bodies, counted under TWO competing
// definitions, so the two numbers can be compared directly instead of
// re-derived by hand every time the question comes up (BACKLOG "Duplicate-
// request probe -> census check (Q1)"'s measured-contrast half).
//
// The threat-matrix coverage note for CC#78420 (replay.mjs:1263-1270) was
// first answered 2026-07-29 by a throwaway python scan over raw capture
// BYTES: "adjacent byte-identical bodies: one instance total ... across 3,446
// requests in seven captures". docs/dev-loop.md's "Never hand-roll identity
// in a probe" records the SAME shape of scan reaching a wrong conclusion
// twice more later, always because file adjacency and conversation adjacency
// disagree on live (multi-tenant, interleaved) traffic. This tool measures
// BOTH definitions over the same inputs so the disagreement — if any — is a
// number, not a memory.
//
//   Arm CONV  — same-conversation adjacency: the SHIPPED definition,
//               findDuplicateRequests (replay.mjs:1281), reached only via the
//               real CLI (`replay.mjs --census --json`) — never re-derived,
//               per dev-loop.md's identity rule.
//   Arm FILE  — global file adjacency: consecutive REQUEST records in FILE
//               ORDER, regardless of conversation. Commissioned here
//               deliberately as the likely shape of the 2026-07-29 scan, a
//               measured CONTRAST arm, not a replacement for arm CONV.
//
// Both arms share the one identity primitive that matters — `inHashOf`
// (replay.mjs:888), the raw per-message wire-byte hash — and both apply
// exactly the adjacency test findDuplicateRequests defines
// (replay.mjs:1272-1280): non-empty, equal-length, element-wise-equal inHash
// arrays. Arm CONV additionally groups by `conversationOf` (replay.mjs:1144)
// before walking pairs; arm FILE does not group at all.
//
// "Compared pairs" is reported beside every duplicate count, on purpose: a
// zero from an arm that never ran a comparison is indistinguishable from a
// zero that means something, and this tool's own bites are what discovered
// that the hard way (see the test file's DISCRIMINATION bite).
//
// Usage:
//   node tools/duplicate-adjacency-probe.mjs [--json] <path...>
// Each <path> is a capture `.jsonl` or a tracked pin `.json` (`{header,
// records}`, harvest.mjs's format). A `.json` fed straight to replay.mjs is a
// documented silent wrong way (docs/dev-loop.md, "The scrub destroys CONTENT
// PREDICATES") — it reports `census: 0 same-conversation pairs` and exits
// clean — so a pin's arm-CONV number is measured by re-emitting its
// `.records` as JSONL into this repo's own scratch mechanism
// (tools/tmpdir.mjs) first, never against the tracked `.json` directly and
// never into a tracked path.
//
// Output prints COUNTS, ordinals and file basenames only — never message
// content, never a raw session id or capture filename baked into anything
// that could reach a tracked file (docs/dev-loop.md, "The hygiene gate scans
// messages and every text type").

import { spawn } from "node:child_process";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readLines } from "./read-lines.mjs";
import { inHashOf } from "./replay.mjs";
import { isCaptureRequestRecord } from "./logs.mjs";
import { tmpDir } from "./tmpdir.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPLAY = path.join(__dirname, "replay.mjs");

// Same cap, same reason, as gate-live.mjs's own replay children
// (docs/dev-loop.md, "'Streams' is a claim about a mechanism"): a replay that
// truly streams needs a small fraction of this; one that regressed into
// retaining its input dies against the cap instead of paging the machine.
export const CHILD_HEAP_CAP_MB = 2048;

// --- Arm FILE: consecutive request records, file order, no grouping --------
// The adjacency test itself, factored out so both arms below can call the
// SAME comparison over their own hash-array stream — the only difference
// between the two arms is what stream they are handed (grouped-by-
// conversation vs. raw file order), never a second copy of the comparison.
export function adjacentDuplicateCount(hashArrays) {
  let compared = 0;
  let duplicates = 0;
  for (let i = 1; i < hashArrays.length; i++) {
    compared++;
    const prev = hashArrays[i - 1];
    const cur = hashArrays[i];
    if (prev.length === 0 || prev.length !== cur.length) continue;
    let identical = true;
    for (let j = 0; j < prev.length; j++) {
      if (prev[j] !== cur[j]) {
        identical = false;
        break;
      }
    }
    if (identical) duplicates++;
  }
  return { compared, duplicates };
}

// --- Arm CONV: shell out to the shipped instrument, never re-derived -------
function runChild(args) {
  return new Promise((resolve) => {
    const child = spawn("node", args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => resolve({ code: -1, out: "", err: String(e?.message ?? e) }));
    child.on("close", (code) => resolve({ code, out, err }));
  });
}

async function convAdjacencyDuplicates(jsonlPath) {
  const args = [`--max-old-space-size=${CHILD_HEAP_CAP_MB}`, REPLAY, jsonlPath, "--census", "--json"];
  const res = await runChild(args);
  let parsed = null;
  try {
    parsed = JSON.parse(res.out);
  } catch {
    // fall through — parsed stays null, handled below
  }
  if (!parsed || !parsed.census || typeof parsed.census.pairs !== "number" || !Array.isArray(parsed.duplicateRequests)) {
    const tail = res.err.trim().split("\n").slice(-4).join(" | ") || "(no stderr)";
    throw new Error(`replay.mjs --census --json did not produce a usable census (exit ${res.code}): ${tail}`);
  }
  return { compared: parsed.census.pairs, duplicates: parsed.duplicateRequests.length };
}

// --- Reading request records -------------------------------------------------

async function jsonlRequestHashArrays(file) {
  let totalRecords = 0;
  let requestRecords = 0;
  const hashArrays = [];
  for await (const line of readLines(file)) {
    if (!line.trim()) continue;
    totalRecords++;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue; // an unparsable line is not a request record either way
    }
    if (!isCaptureRequestRecord(rec)) continue;
    requestRecords++;
    hashArrays.push(inHashOf(rec.body?.messages));
  }
  return { totalRecords, requestRecords, hashArrays };
}

function pinRequestHashArrays(pin) {
  const records = Array.isArray(pin.records) ? pin.records : [];
  const totalRecords = records.length;
  const requestRecords = [];
  const hashArrays = [];
  for (const rec of records) {
    if (!isCaptureRequestRecord(rec)) continue;
    requestRecords.push(rec);
    hashArrays.push(inHashOf(rec.body?.messages));
  }
  return { totalRecords, requestRecords: requestRecords.length, hashArrays, records };
}

// --- Per-input measurement ---------------------------------------------------

async function measureJsonlFile(file) {
  const { totalRecords, requestRecords, hashArrays } = await jsonlRequestHashArrays(file);
  const fileArm = adjacentDuplicateCount(hashArrays);
  const convArm = await convAdjacencyDuplicates(file);
  return { kind: "jsonl", path: file, totalRecords, requestRecords, fileArm, convArm };
}

async function measurePinFile(file) {
  const raw = await readFile(file, "utf8");
  const pin = JSON.parse(raw);
  const { totalRecords, requestRecords, hashArrays, records } = pinRequestHashArrays(pin);
  const fileArm = adjacentDuplicateCount(hashArrays);

  // Arm CONV needs the shipped instrument, which reads JSONL only. The pin's
  // `.records` array is re-emitted as JSONL into this repo's OWN scratch
  // mechanism — never a tracked path, never the pin file itself.
  const scratch = await tmpDir("dup-adjacency-");
  const tmpFile = path.join(scratch, "pin-replay.jsonl");
  const lines = records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : "");
  await writeFile(tmpFile, lines, "utf8");
  const convArm = await convAdjacencyDuplicates(tmpFile);

  return { kind: "pin", path: file, totalRecords, requestRecords, fileArm, convArm };
}

export async function measureOne(file) {
  if (file.endsWith(".json")) return measurePinFile(file);
  if (file.endsWith(".jsonl")) return measureJsonlFile(file);
  throw new Error(`unrecognized extension (expected .json or .jsonl): ${path.basename(file)}`);
}

// --- CLI ---------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const paths = argv.filter((a) => a !== "--json");

  if (paths.length === 0) {
    process.stderr.write("usage: node tools/duplicate-adjacency-probe.mjs [--json] <path...>\n");
    process.exitCode = 2;
    return;
  }

  const results = [];
  const failures = [];
  for (const p of paths) {
    const base = path.basename(p);
    try {
      results.push(await measureOne(p));
    } catch (e) {
      failures.push({ path: p, base, error: String(e?.message ?? e) });
    }
  }

  const totals = results.reduce(
    (acc, r) => {
      acc.totalRecords += r.totalRecords;
      acc.requestRecords += r.requestRecords;
      acc.fileCompared += r.fileArm.compared;
      acc.fileDuplicates += r.fileArm.duplicates;
      acc.convCompared += r.convArm.compared;
      acc.convDuplicates += r.convArm.duplicates;
      return acc;
    },
    { totalRecords: 0, requestRecords: 0, fileCompared: 0, fileDuplicates: 0, convCompared: 0, convDuplicates: 0 },
  );

  if (asJson) {
    process.stdout.write(
      JSON.stringify(
        {
          results: results.map((r) => ({ ...r, path: path.basename(r.path) })),
          failures: failures.map((f) => ({ path: f.base, error: f.error })),
          totals,
          measured: results.length,
          couldNotVerify: failures.length,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  for (const r of results) {
    process.stdout.write(`${path.basename(r.path)} [${r.kind}]\n`);
    process.stdout.write(`  total records: ${r.totalRecords}, request records: ${r.requestRecords}\n`);
    process.stdout.write(
      `  arm FILE: ${r.fileArm.duplicates} duplicate(s) over ${r.fileArm.compared} compared pair(s)\n`,
    );
    process.stdout.write(
      `  arm CONV: ${r.convArm.duplicates} duplicate(s) over ${r.convArm.compared} compared pair(s)\n`,
    );
  }
  for (const f of failures) {
    process.stdout.write(`could-not-verify: ${f.base} — ${f.error}\n`);
  }
  process.stdout.write(
    `\ntotals (${results.length} input(s) measured, ${failures.length} could-not-verify):\n` +
      `  ${totals.requestRecords} request record(s) / ${totals.totalRecords} total record(s)\n` +
      `  arm FILE: ${totals.fileDuplicates} duplicate(s) / ${totals.fileCompared} compared pair(s)\n` +
      `  arm CONV: ${totals.convDuplicates} duplicate(s) / ${totals.convCompared} compared pair(s)\n`,
  );
}

// Run only when invoked as a script — importing this module must not spawn a
// replay (same convention as replay.mjs's own guard, replay.mjs:5057).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    process.stderr.write(`fatal: ${err?.stack ?? err}\n`);
    process.exitCode = 1;
  });
}
