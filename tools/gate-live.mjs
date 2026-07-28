#!/usr/bin/env node
// gate-live — run the replay gate over the LIVE captures, on a schedule.
//
// Why this exists, and it is not "extra coverage".
//
// Two defects surfaced in the gate itself on 2026-07-28, and both were
// invisible for the same structural reason: the gate had never been pointed at
// a production-shaped input.
//
//   1. it read the capture with readFile(..., "utf-8"), so a 955 MB capture
//      threw `RangeError: Invalid string length` before a single check ran;
//   2. it retained every request's full message history, peaking at 3.2 GB —
//      within sight of V8's default ceiling.
//
// Neither could ever be caught by `npm test`, and not by accident. The
// committed corpus is produced by harvest.mjs, which selects pairs by
// STRUCTURAL NOVELTY and sanitises them: small by construction, and
// deliberately so. A fixture corpus curated for structural novelty cannot
// contain a scale-shaped input — the blind spot is designed in. So scale,
// volume and ordering-at-scale are exactly the classes that stay green in CI
// forever while being broken in practice.
//
// The live captures are the only production-shaped inputs available, they
// exist on disk already, and something is already walking them twice a day
// (cache-fix-harvest). This runs the real gate against them and writes a
// verdict a checker can read, so "the gate cannot run" and "the gate found
// something in live traffic" both surface within a day instead of on the next
// occasion someone happens to try it by hand.
//
// One child process per capture, deliberately: memory stays bounded to the
// largest single capture rather than their sum, and a crash on one file is
// recorded rather than ending the sweep. Whatever kills one capture is
// precisely what this is here to report.

import { spawn } from "node:child_process";
import { readdir, stat, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPLAY = join(__dirname, "replay.mjs");
const DEFAULT_CAPTURES = join(homedir(), ".claude", "cache-fix-captures");
const DEFAULT_STATUS = join(homedir(), ".claude", "cache-fix-gate-status.json");

// A capture being written to right now is not a defect and not a skip: the
// gate reads a prefix of it, which is a valid corpus. Recorded so a reader can
// tell a short run from a truncated one.
function runReplay(file) {
  return new Promise((resolve) => {
    const child = spawn("node", [REPLAY, file, "--json"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => resolve({ code: -1, out: "", err: String(e?.message ?? e) }));
    child.on("close", (code) => resolve({ code, out, err }));
  });
}

function summarise(file, bytes, res) {
  const row = { file, bytes, exit: res.code };
  if (res.code === -1) {
    row.error = res.err;
    return row;
  }
  let parsed = null;
  try {
    parsed = JSON.parse(res.out);
  } catch {
    // The gate died before producing a verdict — a RangeError, an OOM, a
    // throw. This is the case the whole job exists for, so it is recorded
    // verbatim rather than smoothed into a count of zero.
    row.error = (res.err.trim().split("\n").slice(-4).join("\n") || "no JSON output");
    return row;
  }
  row.requests = parsed.report?.length ?? 0;
  row.stability = parsed.violations?.length ?? 0;
  row.safety = parsed.safety?.length ?? 0;
  row.sequence = parsed.sequence?.length ?? 0;
  row.order = parsed.orderViolations?.length ?? 0;
  row.unparseable = (parsed.report ?? []).filter((r) => r.error).length;
  return row;
}

const rowIsClean = (r) =>
  !r.error && r.exit === 0 && !r.stability && !r.safety && !r.sequence && !r.order;

function parseArgs(argv) {
  const args = { captures: DEFAULT_CAPTURES, status: DEFAULT_STATUS, quiet: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--captures") args.captures = argv[++i];
    else if (a === "--status") args.status = argv[++i];
    else if (a === "--quiet") args.quiet = true;
    else {
      process.stderr.write(`unexpected argument: ${a}\n`);
      process.exit(2);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const started = new Date().toISOString();

  let files = [];
  try {
    files = (await readdir(args.captures)).filter((f) => f.endsWith("-requests.jsonl"));
  } catch (e) {
    process.stderr.write(`no capture directory at ${args.captures}: ${e?.message ?? e}\n`);
    process.exit(2);
  }

  const rows = [];
  for (const f of files.sort()) {
    const full = join(args.captures, f);
    let bytes = 0;
    try {
      bytes = (await stat(full)).size;
    } catch {
      continue;
    }
    // An empty capture has no pairs to compare; running the gate on it proves
    // nothing and its "0 violations" would pad the verdict.
    if (bytes === 0) continue;
    const res = await runReplay(full);
    const row = summarise(f, bytes, res);
    rows.push(row);
    if (!args.quiet) {
      const verdict = row.error
        ? `ERROR ${row.error.split("\n")[0]}`
        : rowIsClean(row)
          ? "clean"
          : `stability=${row.stability} safety=${row.safety} sequence=${row.sequence} order=${row.order}`;
      process.stdout.write(`${f} (${(bytes / 1e6).toFixed(1)} MB, ${row.requests ?? "?"} req): ${verdict}\n`);
    }
  }

  const failed = rows.filter((r) => !rowIsClean(r));
  const status = {
    version: 1,
    started,
    finished: new Date().toISOString(),
    host: process.env.HOSTNAME || "unknown",
    captures: rows.length,
    bytes: rows.reduce((a, r) => a + r.bytes, 0),
    failing: failed.length,
    ok: failed.length === 0 && rows.length > 0,
    rows,
  };
  await mkdir(dirname(args.status), { recursive: true });
  await writeFile(args.status, JSON.stringify(status, null, 2) + "\n");

  if (!args.quiet) {
    process.stdout.write(
      `\n${rows.length} capture(s), ${(status.bytes / 1e6).toFixed(0)} MB, ${failed.length} failing -> ${args.status}\n`,
    );
  }
  // Non-zero on a failing sweep AND on an empty one: "no captures" means the
  // gate proved nothing, which must not read as a pass.
  process.exit(status.ok ? 0 : 1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    process.stderr.write(`gate-live failed: ${err?.stack ?? err}\n`);
    process.exit(2);
  });
}

export { summarise, rowIsClean };
