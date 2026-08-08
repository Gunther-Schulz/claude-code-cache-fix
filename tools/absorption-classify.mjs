#!/usr/bin/env node
// absorption-classify — turn a capture's absorption misses (replay.mjs's
// findAbsorptionMisses) into WHAT the stale message actually is, not just
// where it diverged.
//
// findAbsorptionMisses answers "did a mitigation that RAN also ABSORB" with
// three numbers per row (docs/dev-loop.md, "What no gate asks"). It never
// looks at content — by design, the same design that makes the census
// scalable and causally mute (dev-loop.md, "The census names the class;
// only content names the cause"). This tool closes that gap for absorption
// misses specifically: it dumps the two forwarded messages a row's
// divergence names and classifies WHAT differs between them, on an ordered
// ladder (role / text / container / cache_control / block structure / other)
// so the same shape is recognized every time instead of re-derived by hand.
// The 2026-08-05 349k bust (robustness-threat-matrix.md, "Row 4 datapoint")
// is the known positive this tool must reproduce: a CONTAINER miss, 403 vs
// 428 bytes, delta 25 — the JSON of the block-array wrapper and nothing else.
//
// Two passes through replay.mjs as a child process, never re-implementing
// the pipeline (dev-loop.md: never hand-roll identity in a probe):
//
//   PASS 1  plain replay --json --gates-from-capture: the absorption-miss
//           rows and, from `.report`, each request's outBodySha.
//   PASS 2  the same invocation plus --dump-forwarded/--dump-out, asking
//           replay to also dump the two forwarded messages each row needs
//           (prevN and n, at forwardedDivergence) before compactEntry
//           discards the bodies.
//
// The two passes are two separate process runs of the same deterministic
// pipeline over the same capture, so they SHOULD model the same system —
// but "should" is not "did", and the whole point of this file's parent
// directory is that an unverified assumption like that is how a check
// becomes fiction (dev-loop.md, "Rule out the instrument"). The mandatory
// cross-check below is what earns the right to trust pass 2's dump: every
// dumped message's outBodySha must equal pass 1's report entry for that same
// request. A mismatch means the two passes modelled different systems, and
// this refuses to classify rather than classify garbage silently.
//
// Usage: node tools/absorption-classify.mjs <capture.jsonl> [--json]

import { tmpDir } from "./tmpdir.mjs";
import { spawn } from "node:child_process";
import { rm, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { pathToFileURL } from "node:url";

import { CHILD_HEAP_CAP_MB } from "./gate-live.mjs";

const REPLAY = new URL("./replay.mjs", import.meta.url).pathname;

// The eight classes, in ladder order — also the fixed key set every tally
// carries, zeros stated explicitly (dev-loop.md's three-answer rule: a class
// absent from the printed tally reads as "never checked", not "never seen").
const CLASSES = ["ABSENT", "IDENTICAL", "ROLE", "TEXT", "CONTAINER", "CACHE-CONTROL", "BLOCKS", "OTHER"];

function zeroTally() {
  const t = {};
  for (const c of CLASSES) t[c] = 0;
  return t;
}

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

// Content is a string -> that string; content is an array -> the
// concatenation of `.text` for text blocks and, for every non-text block,
// its whole JSON.stringify — cache_control included, because the block's JSON
// carries it.
//
// That last part used to decide the ladder: a marker on a tool_result read as
// a TEXT difference, and this comment declared it deliberate. It was wrong,
// and the corpus said so — 5 of the 7 rows hand-classified on 2026-08-05 were
// "TEXT" pairs carrying no text difference at all. The ladder answers to
// CACHE-CONTROL's DEFINITION (identical once every cache_control key is
// dropped), which says nothing about where the marker sits, so the fix is in
// classifyDelta's order, not here: the strip test now runs before this
// function's output is consulted.
export function extractText(msg) {
  const c = msg?.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c.map((b) => (b?.type === "text" ? (b.text ?? "") : JSON.stringify(b))).join("");
  }
  return JSON.stringify(c ?? null);
}

function containerKind(msg) {
  const c = msg?.content;
  if (typeof c === "string") return "string";
  if (Array.isArray(c)) return "array";
  return "other";
}

// Recursively drops every "cache_control" key, at any depth (message-level
// or per-block) — used only to test whether cache_control is the SOLE
// difference between two already-role-equal, already-text-equal messages.
function stripCacheControl(x) {
  if (Array.isArray(x)) return x.map(stripCacheControl);
  if (x && typeof x === "object") {
    const out = {};
    for (const [k, v] of Object.entries(x)) {
      if (k === "cache_control") continue;
      out[k] = stripCacheControl(v);
    }
    return out;
  }
  return x;
}

function blockTypeSeq(msg) {
  return Array.isArray(msg?.content) ? msg.content.map((b) => b?.type ?? null) : [];
}

function byteLen(x) {
  return Buffer.byteLength(JSON.stringify(x ?? null), "utf8");
}

// The ladder itself. a = prevN side (predecessor), b = n side (current).
// First match wins — ordered so a control case (text differs alongside a
// container flip) reports TEXT, never CONTAINER, because the text check
// runs first.
export function classifyDelta(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) {
    return { class: "ABSENT", detail: null };
  }
  if (JSON.stringify(a) === JSON.stringify(b)) {
    // The row's divergence index said these two bytes differ. Finding them
    // identical here means the INSTRUMENT is wrong — the coordinate space,
    // the dump, or the cross-check upstream — not that the pair is clean.
    // Reported as a class, loudly, never swallowed into a false "no finding".
    return { class: "IDENTICAL", detail: null };
  }
  if (a.role !== b.role) {
    return { class: "ROLE", detail: null };
  }
  // Before TEXT, not after CONTAINER: a pair that is equal once cache_control
  // is dropped differs in nothing else BY CONSTRUCTION — not text, not
  // container, not block structure — so promoting this test steals no row from
  // a real class, and leaving it below TEXT hid every marker that sat inside a
  // non-text block (see extractText's note). The classes below still see every
  // pair that carries a real difference alongside a moved marker.
  if (JSON.stringify(stripCacheControl(a)) === JSON.stringify(stripCacheControl(b))) {
    return { class: "CACHE-CONTROL", detail: null };
  }
  if (extractText(a) !== extractText(b)) {
    return { class: "TEXT", detail: null };
  }
  const kindA = containerKind(a);
  const kindB = containerKind(b);
  if (kindA !== kindB) {
    return { class: "CONTAINER", detail: null };
  }
  if (kindA === "array") {
    const seqA = blockTypeSeq(a);
    const seqB = blockTypeSeq(b);
    if (seqA.length !== seqB.length || seqA.some((t, i) => t !== seqB[i])) {
      return { class: "BLOCKS", detail: null };
    }
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const diffKeys = [...keys].filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).sort();
  return { class: "OTHER", detail: diffKeys };
}

async function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const file = argv.find((a) => !a.startsWith("--"));
  if (!file) {
    process.stderr.write("usage: node tools/absorption-classify.mjs <capture.jsonl> [--json]\n");
    process.exit(2);
  }

  const heapFlag = `--max-old-space-size=${CHILD_HEAP_CAP_MB}`;
  const capture = basename(file);

  // PASS 1 — the rows themselves, and the per-n outBodySha the cross-check
  // below verifies pass 2 against.
  const pass1 = await runChild([heapFlag, REPLAY, file, "--json", "--gates-from-capture"]);
  let pass1Json;
  try {
    pass1Json = JSON.parse(pass1.out);
  } catch {
    process.stderr.write(
      `pass 1 (replay) produced no parseable JSON — exit ${pass1.code}:\n` +
        `${pass1.err.trim().split("\n").slice(-8).join("\n")}\n`,
    );
    process.exit(1);
  }

  const rows1 = pass1Json.absorptionMisses ?? [];
  if (rows1.length === 0) {
    if (asJson) {
      process.stdout.write(JSON.stringify({ capture, rows: [], tally: zeroTally() }, null, 2) + "\n");
    } else {
      process.stdout.write("0 absorption misses\n");
    }
    process.exit(0);
  }
  const reportByN = new Map((pass1Json.report ?? []).map((r) => [r.n, r.outBodySha]));

  // PASS 2 — dump the two forwarded messages every row needs: prevN and n,
  // both at forwardedDivergence (the index the row's own miss was measured
  // at, in the forwarded coordinate space — see findAbsorptionMisses).
  const specParts = [];
  for (const row of rows1) {
    specParts.push(`${row.prevN}:${row.forwardedDivergence}`);
    specParts.push(`${row.n}:${row.forwardedDivergence}`);
  }
  const spec = specParts.join(",");

  const scratch = await tmpDir("cache-fix-absorption-classify-");
  const dumpOut = join(scratch, "dump.ndjson");
  const pass2 = await runChild([
    heapFlag, REPLAY, file, "--json", "--gates-from-capture",
    "--dump-forwarded", spec, "--dump-out", dumpOut,
  ]);

  let dumpText;
  try {
    dumpText = await readFile(dumpOut, "utf-8");
  } catch (e) {
    process.stderr.write(
      `pass 2 (dump) did not produce a readable file at ${dumpOut} — exit ${pass2.code}: ${e.message}\n` +
        `${pass2.err.trim().split("\n").slice(-8).join("\n")}\n`,
    );
    await rm(scratch, { recursive: true, force: true });
    process.exit(1);
  }

  // The mandatory, blocking cross-check: pass 1 and pass 2 are two separate
  // process runs, and nothing but this comparison proves they modelled the
  // same system. Collected across every line before deciding, so a failure
  // report shows every mismatch, not just the first.
  const dumpByKey = new Map(); // `${n}:${i}` -> msg
  const mismatches = [];
  for (const line of dumpText.split("\n")) {
    if (!line.trim()) continue;
    const rec = JSON.parse(line);
    const expected = reportByN.get(rec.n);
    if (expected === undefined || rec.outBodySha !== expected) {
      mismatches.push({ n: rec.n, i: rec.i, expected: expected ?? null, got: rec.outBodySha });
      continue;
    }
    dumpByKey.set(`${rec.n}:${rec.i}`, rec.msg);
  }

  if (mismatches.length) {
    process.stderr.write(
      `CROSS-CHECK FAILED: pass 1 and pass 2 modelled different systems for ${mismatches.length} dump line(s) — refusing to classify:\n`,
    );
    for (const m of mismatches.slice(0, 10)) {
      process.stderr.write(`  n=${m.n} i=${m.i} pass1 outBodySha=${m.expected} pass2 outBodySha=${m.got}\n`);
    }
    await rm(scratch, { recursive: true, force: true });
    process.exit(3);
  }

  const tally = zeroTally();
  const rows = [];
  for (const row of rows1) {
    const a = dumpByKey.get(`${row.prevN}:${row.forwardedDivergence}`) ?? null;
    const b = dumpByKey.get(`${row.n}:${row.forwardedDivergence}`) ?? null;
    const { class: cls, detail } = classifyDelta(a, b);
    tally[cls] = (tally[cls] ?? 0) + 1;
    const bytesA = byteLen(a);
    const bytesB = byteLen(b);
    rows.push({
      capture,
      n: row.n,
      prevN: row.prevN,
      ts: row.ts,
      absorbedFreshAt: row.absorbedFreshAt,
      forwardedDivergence: row.forwardedDivergence,
      inputDivergence: row.inputDivergence,
      ours: row.ours,
      movedFresh: row.movedFresh,
      action: row.action,
      class: cls,
      detail,
      bytesA,
      bytesB,
      byteDelta: bytesB - bytesA,
    });
  }

  await rm(scratch, { recursive: true, force: true });

  if (asJson) {
    process.stdout.write(JSON.stringify({ capture, rows, tally }, null, 2) + "\n");
  } else {
    for (const r of rows) {
      const loud = r.class === "IDENTICAL"
        ? " *** INSTRUMENT DEFECT SIGNAL — no byte difference at the reported divergence ***"
        : "";
      const detailTag = r.detail && r.detail.length ? ` [${r.detail.join(",")}]` : "";
      process.stdout.write(
        `n=${r.prevN}->${r.n} ts=${r.ts} fwdDiv=${r.forwardedDivergence} ` +
          `inDiv=${r.inputDivergence ?? "append-only"} ours=${r.ours} movedFresh=${r.movedFresh} ` +
          `action=${r.action ?? "-"} class=${r.class}${detailTag} ` +
          `bytesA=${r.bytesA} bytesB=${r.bytesB} delta=${r.byteDelta}${loud}\n`,
      );
    }
    process.stdout.write(`\nper-class tally (${rows.length} row(s), capture ${capture}):\n`);
    for (const cls of CLASSES) {
      process.stdout.write(`  ${cls}: ${tally[cls]}\n`);
    }
  }
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    process.stderr.write(`absorption-classify failed: ${err?.stack ?? err}\n`);
    process.exit(1);
  });
}
