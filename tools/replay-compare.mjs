#!/usr/bin/env node
// replay-compare — diff two `replay.mjs --json` reports of the SAME capture.
//
// Why this exists as a tool and not as a pasted one-liner. Every pipeline
// change owes the directive's acceptance gate: "replay the same corpus with
// the flag OFF and ON; the reports must differ only in the intended
// mutations" (replay.mjs header). Running both halves is easy; SAYING what
// differed is where a hand comparison goes wrong — the reports are ~1.2 MB of
// JSON each, so the eye reaches for the summary arrays (`violations`,
// `safety`) and stops, and a per-request telemetry flip that introduces no
// violation is invisible there. That flip is precisely what a matcher change
// produces: the ordinal re-attribution of 2026-08-02 was expected to change
// `moved`, `dropped` and `canonOrderViolation` on a handful of requests and
// nothing else, and "nothing else" is a claim over ~2000 requests.
//
// The comparison is keyed on the request ordinal `n`, never on array position:
// a run that skipped or added a request must show up as a MISSING/EXTRA row,
// not silently shift every later comparison by one.
//
// `--summary` answers the question a matcher change actually raises: not
// "which requests changed" but "in what WAYS did they change, and is every way
// one I intended". 56 changed requests print as ~130 kB of index arrays and
// read as noise; the same 56 print as a dozen lines once tallied by field and
// by action transition, and an unintended transition is then visible rather
// than buried. Read the summary first, the rows only for the classes it names.
//
// Usage: node tools/replay-compare.mjs <old.json> <new.json> [--full|--summary]
// Exit code is 0 whatever it finds — this reports, the reader judges. A file
// it cannot read exits 2, so an unreadable side is never read as "no delta".

import { readFileSync } from "node:fs";

// The insertion telemetry fields worth diffing per request. `suppressions` and
// `reserves` are arrays of objects, compared by their JSON — they carry
// indices, and an index shift is exactly the class this compares.
const FIELDS = [
  "action", "resetReason", "inserted", "canonSize", "canonLive", "msgs",
  "canonOrderViolation", "pinned", "dropped", "suppressed", "moved",
  "movedFresh", "movedRefires", "suppressions", "reserves",
];

// Top-level arrays whose LENGTH is the headline. Each is a finding list: a
// change in any of them is a gate result change, never cosmetic.
const ARRAYS = [
  "violations", "exemptions", "safety", "conservation", "conservationExemptions",
  "sequence", "orderViolations",
];

const val = (v) => (v && typeof v === "object" ? JSON.stringify(v) : String(v));

function load(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    process.stderr.write(`replay-compare: cannot read ${path}: ${e.message}\n`);
    process.exit(2);
  }
}

function byOrdinal(report) {
  const rows = report.report ?? report.requests ?? [];
  const m = new Map();
  for (const r of rows) m.set(r.n, r);
  return m;
}

export function compare(oldReport, newReport) {
  const o = byOrdinal(oldReport);
  const n = byOrdinal(newReport);
  const arrays = ARRAYS.map((k) => ({
    key: k,
    old: (oldReport[k] ?? []).length,
    new: (newReport[k] ?? []).length,
  }));
  const missing = [...o.keys()].filter((k) => !n.has(k));
  const extra = [...n.keys()].filter((k) => !o.has(k));
  const changed = [];
  for (const [ord, ro] of o) {
    const rn = n.get(ord);
    if (!rn) continue;
    const deltas = [];
    if (ro.outHash !== rn.outHash) deltas.push(["outHash", ro.outHash, rn.outHash]);
    const io = ro.insertion ?? {};
    const inn = rn.insertion ?? {};
    for (const f of FIELDS) {
      if (io[f] === undefined && inn[f] === undefined) continue;
      if (val(io[f]) !== val(inn[f])) deltas.push([f, val(io[f]), val(inn[f])]);
    }
    if (deltas.length) changed.push({ n: ord, ts: rn.ts, key: rn.key, deltas });
  }
  return { compared: o.size, arrays, missing, extra, changed };
}

function main(argv) {
  const files = argv.filter((a) => !a.startsWith("--"));
  const full = argv.includes("--full");
  if (files.length !== 2) {
    process.stderr.write("usage: node tools/replay-compare.mjs <old.json> <new.json> [--full]\n");
    process.exit(2);
  }
  const r = compare(load(files[0]), load(files[1]));
  process.stdout.write(`compared ${r.compared} requests (old side)\n`);
  if (argv.includes("--summary")) {
    const byField = new Map();
    const transitions = new Map();
    for (const c of r.changed) {
      for (const [f, a, b] of c.deltas) {
        byField.set(f, (byField.get(f) ?? 0) + 1);
        if (f === "action" || f === "resetReason") {
          const k = `${f}: ${a} -> ${b}`;
          if (!transitions.has(k)) transitions.set(k, []);
          transitions.get(k).push(c.n);
        }
      }
    }
    for (const a of r.arrays) {
      const mark = a.old === a.new ? "  " : "->";
      process.stdout.write(`${mark} ${a.key}: ${a.old} -> ${a.new}\n`);
    }
    process.stdout.write(`requests with telemetry deltas: ${r.changed.length}\n`);
    process.stdout.write("fields that changed, by request count:\n");
    for (const [f, n] of [...byField].sort((x, y) => y[1] - x[1])) {
      process.stdout.write(`    ${f}: ${n}\n`);
    }
    // DIRECTION, per numeric field. A count that moved is half an answer: a
    // mitigation that absorbs MORE and one that absorbs LESS both print as
    // "moved: 56 requests". The split is what distinguishes the intended
    // effect from its mirror image, and it costs one pass.
    const dir = new Map();
    for (const c of r.changed) {
      for (const [f, a, b] of c.deltas) {
        if (!Number.isFinite(+a) || !Number.isFinite(+b)) continue;
        if (!dir.has(f)) dir.set(f, { up: 0, down: 0, first: c.n });
        dir.get(f)[+b > +a ? "up" : "down"]++;
      }
    }
    if (dir.size) process.stdout.write("numeric direction (up/down, first ordinal):\n");
    for (const [f, d] of dir) {
      process.stdout.write(`    ${f}: +${d.up} / -${d.down}  from n=${d.first}\n`);
    }
    if (transitions.size) process.stdout.write("action/reason transitions:\n");
    for (const [k, ns] of transitions) {
      const head = ns.slice(0, 12).join(",");
      process.stdout.write(`    ${k}  (${ns.length}: ${head}${ns.length > 12 ? ",…" : ""})\n`);
    }
    return;
  }
  for (const a of r.arrays) {
    const mark = a.old === a.new ? "  " : "->";
    process.stdout.write(`${mark} ${a.key}: ${a.old} -> ${a.new}\n`);
  }
  if (r.missing.length) process.stdout.write(`MISSING from new: ${r.missing.join(",")}\n`);
  if (r.extra.length) process.stdout.write(`EXTRA in new: ${r.extra.join(",")}\n`);
  process.stdout.write(`requests with telemetry deltas: ${r.changed.length}\n`);
  const show = full ? r.changed : r.changed.slice(0, 40);
  for (const c of show) {
    process.stdout.write(`  n=${c.n} ${c.ts ?? ""} ${c.key ?? ""}\n`);
    for (const [f, a, b] of c.deltas) process.stdout.write(`      ${f}: ${a} -> ${b}\n`);
  }
  if (!full && r.changed.length > show.length) {
    process.stdout.write(`  ... ${r.changed.length - show.length} more (--full)\n`);
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  main(process.argv.slice(2));
}
