#!/usr/bin/env node
// tools/backlog-lanes.mjs — lane derivation becomes a mechanical join.
//
// WHY THIS EXISTS. See BACKLOG.md, "`backlog-lanes.mjs`: lane derivation
// becomes a mechanical join, and a READY entry missing its realizing
// boundary becomes a finding." The 2026-08-10 lane plan was hand-derived
// (`docs/directives/backlog-lane-plan-2026-08-10.md`): 63 of 100 READY
// entries cited no file (they name functions or nothing in prose), so
// grouping them into lanes was a judgment pass over ~6600 lines that one
// session failed at and another did by hand. Three subsequent lanes
// returned members not on design grounds but because the hand plan's
// guessed write boundary was wrong for that entry — the single largest
// source of wasted lane work in the drain this tool was booked from.
//
// WHAT THIS IS: a REPORT, never a gate. It resolves each READY entry's
// realizing write-boundary (backlog-lint.mjs's `realizingBoundary` —
// backtick file citations minus the dispatcher-owned noise carriers),
// classifies each entry into HOLD / DESK / a connected-components graph
// over shared boundary files / UNRESOLVED, and emits merge lanes (>=2
// entries sharing a file — they must serialize anyway, so one lane costs
// one integration) and batch candidates (exactly 1 entry — nothing forces
// it together with anything, so any number of batch candidates can share
// one lane). Divergence between this tool's output and a hand-derived plan
// is a finding about ONE of them, adjudicated in the entry bodies that
// disagree — never silently resolved in this tool's favour.
//
// CLI:
//   node tools/backlog-lanes.mjs             # lanes over the repo's own BACKLOG.md
//   node tools/backlog-lanes.mjs <path>      # lanes over a specific file
//   node tools/backlog-lanes.mjs -           # lanes over stdin (piping
//                                            # `git show <ref>:BACKLOG.md`)

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { censusEntries, realizingBoundary, isDeploymentCoupled, isHold } from "./backlog-lint.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
export const DEFAULT_BACKLOG = join(REPO_ROOT, "BACKLOG.md");

// Plain union-find over entry INDEX (position in the `resolvable` array
// built below) — small (never more than a few hundred READY entries), so
// path compression alone is plenty.
function unionFind(n) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  return { find, union };
}

// Classifies every READY '## Open' entry into exactly one bucket, in this
// precedence: HOLD (operator-side / cross-repo POINTER — its work happens
// elsewhere, so no boundary file in THIS repo bounds it) > DESK (cites a
// `proxy/**` file — deployment-coupled, needs the pin-bump/restart round,
// never a plain lane) > UNRESOLVED (no boundary file survives noise
// removal) > the connected-components graph (merge lanes / batch
// candidates), joined on shared boundary files.
export function deriveLanes(text, opts = {}) {
  const all = censusEntries(text).filter((e) => e.grade === "READY");
  const holds = [];
  const desk = [];
  const unresolved = [];
  const resolvable = []; // { entry, boundary }

  for (const entry of all) {
    if (isHold(entry)) {
      holds.push(entry);
      continue;
    }
    const boundary = realizingBoundary(entry.files, opts);
    if (isDeploymentCoupled(boundary)) {
      desk.push(entry);
      continue;
    }
    if (!boundary.length) {
      unresolved.push(entry);
      continue;
    }
    resolvable.push({ entry, boundary });
  }

  const { find, union } = unionFind(resolvable.length);
  const fileOwner = new Map(); // boundary file -> first index citing it
  resolvable.forEach(({ boundary }, i) => {
    for (const f of boundary) {
      if (fileOwner.has(f)) union(i, fileOwner.get(f));
      else fileOwner.set(f, i);
    }
  });

  const groups = new Map(); // root index -> [member index...]
  resolvable.forEach((_, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  });

  const mergeLanes = [];
  const batchCandidates = [];
  for (const idxs of groups.values()) {
    const members = idxs.map((i) => resolvable[i].entry);
    const files = [...new Set(idxs.flatMap((i) => resolvable[i].boundary))].sort();
    if (members.length >= 2) mergeLanes.push({ files, members });
    else batchCandidates.push({ files, members });
  }
  // Largest first: the two the requesting entry names by name ("the
  // backlog-tooling family; replay + fixture-verdict") are the two biggest,
  // and a size-ordered report makes that check reproducible without relying
  // on Map insertion order for meaning.
  mergeLanes.sort((a, b) => b.members.length - a.members.length);
  batchCandidates.sort((a, b) => a.members[0].line - b.members[0].line);

  return { holds, desk, unresolved, mergeLanes, batchCandidates };
}

function fmtEntry(e) {
  return `line=${e.line} "${e.headline}"`;
}

export function formatLanesReport(lanes) {
  const out = [];
  out.push(`# merge lanes: ${lanes.mergeLanes.length}`);
  lanes.mergeLanes.forEach((lane, i) => {
    out.push(`## MERGE ${i + 1} — files: ${lane.files.join(", ")} (${lane.members.length} entries)`);
    for (const e of lane.members) out.push(`  ${fmtEntry(e)}`);
  });
  out.push(`# batch candidates: ${lanes.batchCandidates.length}`);
  for (const b of lanes.batchCandidates) {
    out.push(`  BATCH files=${b.files.join(",")} ${fmtEntry(b.members[0])}`);
  }
  out.push(`# desk (deployment-coupled): ${lanes.desk.length}`);
  for (const e of lanes.desk) out.push(`  DESK ${fmtEntry(e)}`);
  out.push(`# holds (operator/cross-repo): ${lanes.holds.length}`);
  for (const e of lanes.holds) out.push(`  HOLD ${fmtEntry(e)}`);
  out.push(`# UNRESOLVED (no derivable boundary): ${lanes.unresolved.length}`);
  for (const e of lanes.unresolved) out.push(`  UNRESOLVED ${fmtEntry(e)}`);
  return out.join("\n") + "\n";
}

function readInput(pathArg) {
  if (pathArg === "-") return readFileSync(0, "utf8");
  return readFileSync(pathArg ?? DEFAULT_BACKLOG, "utf8");
}

function main(argv) {
  const args = argv.slice(2);
  const text = readInput(args[0]);
  const lanes = deriveLanes(text);
  process.stdout.write(formatLanesReport(lanes));
  return 0; // REPORT-only: never fails the build.
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(main(process.argv));
}
