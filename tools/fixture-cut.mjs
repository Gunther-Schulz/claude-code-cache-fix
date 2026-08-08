#!/usr/bin/env node
// fixture-cut — the minimization POST-STEP for a pinned fixture.
//
// docs/directives/insertion-normalization-identity-directive.md, "Fixture
// strategy" + the 2026-08-01 ruling (BACKLOG.md): a harvested fixture from
// `harvest.mjs --pin` always dumps the FULL prefix from capture ordinal 0
// (runPin's header comment: insertion-normalization's per-conversation
// canonical state is stateful, so the real-pair tests replay every request
// from index 0 in order). That makes the pin the harvester's range dump, not
// a measured minimum — row-4 evidence pinned at 46 MB is the concrete cost:
// unminimized, it cannot even be committed. Minimization stays a POST-STEP
// gated by tools/fixture-verdict-identity.mjs, swept per fixture — not a
// harvest parameter. This is that post-step.
//
//   node tools/fixture-cut.mjs <pinned-fixture.json> [--out <path>]
//
// STRATEGY (simple and deterministic, not clever): the pinned range's own
// records (capture ordinals header.range.n..m) are ALWAYS kept. Everything
// before the array position where ordinal n first appears is "the prefix";
// the search bisects that prefix's DROP COUNT — never removes a record from
// the middle, only truncates the front — because a cut fixture's replay
// numbers every request record it retains as consecutive starting at
// header.replayFrom (fixture-verdict-identity.mjs, replayVerdicts): a
// non-contiguous retained set would mislabel every ordinal after the gap.
// Binary search assumes the passing/failing frontier is monotonic in drop
// count (documented assumption, not a proof) — d=0 (no drop) is always
// checked explicitly rather than assumed, and every accepted candidate,
// including the FINAL one written to disk, is independently re-verified. A
// non-monotonic frontier could cost missed minimality, never a wrong
// accept — acceptance is always gated by an actual identity check.
//
// CHAINING fixture-verdict-identity.mjs, never reimplementing it: replays
// run out-of-process (spawning `fixture-verdict-identity.mjs --dump
// <path>`), because replayVerdicts's own header comment says two replays in
// one process compare a cold run against a warm one (module-scope canonical
// state). The ORIGINAL fixture is dumped once and reused across every
// bisection step; each candidate gets its own dump. The comparison itself —
// `firstDivergence` — is IMPORTED from the tool and called in-process: it is
// a pure function over two already-computed verdict sets, so calling it
// repeatedly carries none of the cold/warm replay risk, and importing it
// means the acceptance rule the identity tool defines is the one this tool
// enforces, not a second copy of it.
//
// FAIL CLOSED: if d=0 is the only passing candidate (every prefix record is
// load-bearing, or there is no prefix at all), nothing is written — a
// "cut" that silently reproduces the input would misreport a floor that was
// never measured.

import { tmpDirSync } from "./tmpdir.mjs";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname, basename, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IDENTITY_TOOL = join(__dirname, "fixture-verdict-identity.mjs");

function usage(code) {
  process.stderr.write("usage: fixture-cut.mjs <pinned-fixture.json> [--out <path>]\n");
  process.exit(code);
}

function parseArgs(argv) {
  const args = { input: null, out: null };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--out") args.out = rest[++i];
    else if (!args.input) args.input = a;
    else usage(2);
  }
  return args;
}

/**
 * Parallel to `records`: null for boot/outcome records, the ORIGINAL capture
 * ordinal for every request record — the same numbering rule
 * fixture-verdict-identity.mjs's replayVerdicts uses (consecutive from
 * `replayFrom`, boot/outcome records consuming no ordinal).
 */
function computeOrdinals(records, replayFrom) {
  const ords = [];
  let reqN = replayFrom - 1;
  for (const rec of records) {
    if (rec?.type === "outcome" || rec?.type === "boot") {
      ords.push(null);
      continue;
    }
    ords.push(++reqN);
  }
  return ords;
}

/** The dump helper fixture-verdict-identity.mjs's own CLI uses, reused here. */
function dump(path) {
  return JSON.parse(
    execFileSync(process.execPath, [IDENTITY_TOOL, "--dump", path], {
      encoding: "utf-8",
      maxBuffer: 64 * 1024 * 1024,
    }),
  );
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.input) usage(2);
  if (!existsSync(args.input)) {
    process.stderr.write(`fixture-cut: no such fixture: ${args.input}\n`);
    process.exit(2);
  }

  const rawInput = readFileSync(args.input, "utf-8");
  let doc;
  try {
    doc = JSON.parse(rawInput);
  } catch (err) {
    process.stderr.write(`fixture-cut: ${args.input} is not valid JSON: ${err.message}\n`);
    process.exit(2);
  }
  const replayFrom = doc.header?.replayFrom;
  const range = doc.header?.range;
  const records = doc.records;
  if (typeof replayFrom !== "number" || typeof range?.n !== "number" || typeof range?.m !== "number") {
    process.stderr.write(`fixture-cut: ${args.input} carries no header.replayFrom + header.range.{n,m}\n`);
    process.exit(2);
  }
  if (!Array.isArray(records)) {
    process.stderr.write(`fixture-cut: ${args.input} carries no records array\n`);
    process.exit(2);
  }

  const ords = computeOrdinals(records, replayFrom);
  const idxN = ords.indexOf(range.n);
  if (idxN === -1) {
    process.stderr.write(
      `fixture-cut: ${args.input}: pinned range start n=${range.n} does not appear among this fixture's ` +
        `retained ordinals (${replayFrom}..${ords[ords.length - 1]}) — malformed fixture\n`,
    );
    process.exit(2);
  }
  const prefixLen = idxN;

  if (prefixLen === 0) {
    process.stdout.write(
      `fixture-cut: already minimal — ${args.input} has no record before its pinned range start ` +
        `(n=${range.n}); nothing written\n`,
    );
    process.exit(1);
  }

  const scratch = tmpDirSync("fixture-cut-");
  try {
    const full = dump(args.input);

    // Header for a bisection scratch candidate: only the two fields
    // replayVerdicts actually reads (`replayFrom`, `range`) — metadata for
    // the final accepted file is assembled separately, after the search.
    const scratchHeaderFor = (d) => ({ replayFrom: ords.slice(d).find((o) => o !== null), range });
    const writeCandidate = (d) => {
      const p = join(scratch, `cand-${d}.json`);
      writeFileSync(p, JSON.stringify({ header: scratchHeaderFor(d), records: records.slice(d) }));
      return p;
    };
    const passes = (d) => firstDivergence(full, dump(writeCandidate(d))) === null;

    // d=0 must always pass — it is byte-identical in every field the
    // identity check reads. If it does not, the bug is in this tool's own
    // candidate construction, not a real minimization result.
    if (!passes(0)) {
      process.stderr.write(
        `fixture-cut: internal error — the unmodified fixture (d=0) failed its own identity check ` +
          `against itself; this is a bug in fixture-cut.mjs, not a minimization finding\n`,
      );
      process.exit(2);
    }

    let best = 0;
    if (passes(prefixLen)) {
      best = prefixLen;
    } else {
      let lo = 0;
      let hi = prefixLen;
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if (passes(mid)) lo = mid;
        else hi = mid;
      }
      best = lo;
    }

    if (best === 0) {
      process.stdout.write(
        `fixture-cut: refusal — every one of this fixture's ${prefixLen} prefix record(s) is load-bearing ` +
          `(dropping even the first changes a replayed verdict against ${args.input}); nothing written\n`,
      );
      process.exit(1);
    }

    // Final candidate: full header carried forward, replayFrom overridden,
    // and a `minimized` block in harvest.mjs runPin's own style (`minimized`
    // on the already-hand-cut corpus fixture) recording what this run did —
    // re-verified independently rather than trusted from the bisection's
    // last passing check, so the file on disk is exactly the one measured.
    const newReplayFrom = ords.slice(best).find((o) => o !== null);
    const finalHeader = {
      ...doc.header,
      replayFrom: newReplayFrom,
      minimized: {
        from: { records: records.length, bytes: Buffer.byteLength(rawInput), replayFrom },
        droppedRecords: best,
        measuredFloorReplayFrom: newReplayFrom,
        tool: "tools/fixture-cut.mjs",
        verifiedBy: "tools/fixture-verdict-identity.mjs",
      },
    };
    const finalDoc = { header: finalHeader, records: records.slice(best) };
    const finalScratch = join(scratch, "final.json");
    writeFileSync(finalScratch, JSON.stringify(finalDoc));
    const finalCut = dump(finalScratch);
    const d = firstDivergence(full, finalCut);
    if (d) {
      process.stderr.write(
        `fixture-cut: internal error — the final candidate (d=${best}) diverged on re-verification at ` +
          `${d.where}: ${d.detail}; nothing written\n`,
      );
      process.exit(2);
    }

    const outPath =
      args.out ?? join(dirname(args.input), `${basename(args.input, extname(args.input))}-cut.json`);
    if (resolve(outPath) === resolve(args.input)) {
      process.stderr.write(`fixture-cut: refusing to write over the input file: ${outPath}\n`);
      process.exit(2);
    }
    // Written COMPACT, not pretty-printed like runPin's raw dump: measured
    // against this fixture's own already-minimized committed sibling,
    // pretty-printing the identical content more than doubles it (33070 ->
    // 70396 bytes) — actively working against the one thing a cut exists to
    // do (make an oversized fixture committable). Compact matches the
    // existing minimized fixture's own on-disk form and
    // fixture-verdict-identity.test.mjs's own scratch-mutant convention.
    const outText = JSON.stringify(finalDoc) + "\n";
    writeFileSync(outPath, outText);
    const inBytes = Buffer.byteLength(rawInput);
    const outBytes = Buffer.byteLength(outText);
    process.stdout.write(
      `fixture-cut: dropped ${best}/${prefixLen} prefix record(s) (replayFrom ${replayFrom} -> ${newReplayFrom}), ` +
        `${records.length} -> ${finalDoc.records.length} record(s), ${inBytes} -> ${outBytes} byte(s), ` +
        `identity verified against ${args.input}, wrote ${outPath}\n`,
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

let firstDivergence;

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  import(pathToFileURL(IDENTITY_TOOL).href)
    .then((mod) => {
      firstDivergence = mod.firstDivergence;
      return main();
    })
    .catch((err) => {
      process.stderr.write(`fixture-cut: ${err?.stack ?? err}\n`);
      process.exit(2);
    });
}
