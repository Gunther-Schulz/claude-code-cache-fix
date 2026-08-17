#!/usr/bin/env node
// oversize-blob-guard — refuse to publish a blob the remote cannot accept.
//
// WHY THIS EXISTS (2026-08-17, found while freezing a bust's evidence).
// `harvest --pin` writes a pin containing the pair's FULL conversation
// prefix, so a pin's size tracks the busting conversation's depth, not the
// pair's. The 686k row-6 walk pinned a pair 733 records deep and got a
// 188 MB fixture — 4x the largest pin this repo has ever tracked (45.8 MB).
// Nothing on any route said a word: no `.gitignore` rule, no check in
// `harvest`, no check at push. The commit would have succeeded locally and
// GitHub would have rejected the PUSH (hard limit: 100 MiB per file), with
// the bytes already in `main`'s history — and `main` here is published
// deployment state that FORK-NOTES.md forbids rewriting. The repair for a
// blob that reaches history is a history rewrite; the repair for one caught
// here is choosing a different freeze. That asymmetry is the whole argument
// for putting this at the push boundary.
//
// TWO TIERS, and the split is deliberate. The BLOCK threshold is a fact
// about the remote (GitHub refuses >100 MiB), so the guard's red is never a
// matter of taste and never negotiable. The WARN threshold is GitHub's own
// advisory line (50 MB) and only prints. A single block at 50 MB would fire
// on this repo's own legitimate history — `pinned-s-9f12950909ed-892-894.
// json` is 45.8 MB and correctly tracked — and a guard that fires on
// legitimate work trains the override reflex that kills it.
//
// It reads the PUSHED TREE, never the working tree: the same object the
// pre-push suite runs against, for the same reason (a working-tree read is
// green on an uncommitted fix and red on a co-writer's scratch).

import { execFileSync } from "node:child_process";

// GitHub's hard per-file limit. A blob at or over this is not pushable at
// all, so the guard's red is the remote's answer arriving early.
export const BLOCK_BYTES = 100 * 1024 * 1024;
// GitHub's advisory line. Printed, never blocking.
export const WARN_BYTES = 50 * 1024 * 1024;

// `git ls-tree -r --long <sha>` emits "<mode> <type> <oid> <size>\t<path>",
// size right-aligned with spaces. Parsed rather than regex-sliced so a path
// containing whitespace survives: the TAB is the only reliable separator,
// and everything after the first one is the path.
export function parseLsTree(text) {
  const rows = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    const tab = line.indexOf("\t");
    if (tab === -1) continue;
    const meta = line.slice(0, tab).trim().split(/\s+/);
    if (meta.length < 4) continue;
    const [, type, , size] = meta;
    if (type !== "blob") continue; // a submodule commit entry has no size
    const bytes = Number(size);
    if (!Number.isFinite(bytes)) continue; // "-" for a not-locally-present blob
    rows.push({ path: line.slice(tab + 1), bytes });
  }
  return rows;
}

// The verdict, as data. Kept pure and separate from the git call so both
// tiers are testable without building a repo — and so the CALLER cannot
// accidentally collapse the two tiers into one boolean.
export function classifyBlobs(rows, { blockBytes = BLOCK_BYTES, warnBytes = WARN_BYTES } = {}) {
  const blocking = [];
  const warning = [];
  for (const r of rows) {
    if (r.bytes >= blockBytes) blocking.push(r);
    else if (r.bytes >= warnBytes) warning.push(r);
  }
  const bySize = (a, b) => b.bytes - a.bytes;
  return { blocking: blocking.sort(bySize), warning: warning.sort(bySize) };
}

const mib = (n) => `${(n / 1048576).toFixed(1)} MiB`;

export function render({ blocking, warning }, sha) {
  const lines = [];
  for (const r of warning) {
    lines.push(`oversize-blob-guard: WARN — ${r.path} is ${mib(r.bytes)} at ${sha} (GitHub advises under ${mib(WARN_BYTES)}).`);
  }
  for (const r of blocking) {
    lines.push(`oversize-blob-guard: REFUSED — ${r.path} is ${mib(r.bytes)} at ${sha}.`);
  }
  if (blocking.length > 0) {
    lines.push(
      "  GitHub rejects any file at or over 100 MiB, so this push cannot succeed —",
      "  and the bytes would already be in local history when it fails.",
      "  For a bust pin: keep it machine-local under",
      "  ~/.local/share/cache-fix/bust-evidence/<date>/ and cite it by alias, or",
      "  pin a pair whose conversation prefix is shorter. A pin's size tracks the",
      "  CONVERSATION's depth, not the pair's.",
    );
  }
  return lines;
}

function main(argv) {
  const shas = argv.length > 0 ? argv : ["HEAD"];
  let blocked = false;
  for (const sha of shas) {
    const text = execFileSync("git", ["ls-tree", "-r", "--long", sha], { encoding: "utf8", maxBuffer: 1 << 28 });
    const verdict = classifyBlobs(parseLsTree(text));
    for (const line of render(verdict, sha)) console.error(line);
    if (verdict.blocking.length > 0) blocked = true;
  }
  return blocked ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
