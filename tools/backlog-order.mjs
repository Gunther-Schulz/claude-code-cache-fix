#!/usr/bin/env node
// Make BACKLOG.md's file order BE the derived build order.
//
// WHY THIS EXISTS. The SessionStart hook (dotfiles claude/hooks/session-scan.py)
// injects the first N READY bullets of the '## Open' section in FILE order. It is
// generic across repos, so it cannot know about this repo's '## Build order' block
// — which means a ranking derived with care was invisible to exactly the reader it
// was derived for. Rather than teach the shared hook one repo's heading, the file's
// own order becomes the carrier: re-derive, run this, and the injected head IS the
// ranked head. One derivation, one carrier, no second place for the order to live.
//
// THE RANK IS NOT STORED HERE. Each numbered item in the '## Build order' block
// carries its own anchor as an HTML comment:
//
//     <!-- entry: "the push-side leak scan re-flags already-public history" -->
//
// invisible in rendered markdown, adjacent to the item it belongs to, and the only
// copy. This tool reads those in order of appearance and moves the matching bullets
// to the top of '## Open'. Unranked bullets keep their relative order below.
//
// FAILS LOUDLY BY CONSTRUCTION. An anchor matching zero bullets, or more than one,
// is an error and nothing is written — a partially-applied order is worse than none,
// and a silently-skipped anchor is a ranked item that quietly stopped being ranked.
//
// Usage:
//   node tools/backlog-order.mjs            # rewrite BACKLOG.md in ranked order
//   node tools/backlog-order.mjs --check    # exit 1 if not already in ranked order
//   node tools/backlog-order.mjs --file X   # operate on X (tests)

import { readFileSync, writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const CHECK = argv.includes("--check");
const fileIdx = argv.indexOf("--file");
const FILE = fileIdx >= 0 ? argv[fileIdx + 1] : "BACKLOG.md";

const ANCHOR = /<!--\s*entry:\s*"([^"]+)"\s*-->/g;
const BULLET = /^- \*\*/;

/** Anchors, in the order the '## Build order' block lists them. */
export function readAnchors(text) {
  const start = text.indexOf("\n## Build order");
  if (start < 0) throw new Error("no '## Build order' block");
  const rest = text.slice(start + 1);
  const end = rest.indexOf("\n## ", 1);
  const block = end < 0 ? rest : rest.slice(0, end);
  return [...block.matchAll(ANCHOR)].map((m) => m[1]);
}

/** The '## Open' section split into {pre, bullets}; bullets keep their trailing blank lines. */
export function splitOpen(text) {
  const lines = text.split("\n");
  const head = lines.findIndex((l) => l.startsWith("## Open"));
  if (head < 0) throw new Error("no '## Open' section");
  let tail = lines.length;
  for (let i = head + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      tail = i;
      break;
    }
  }
  const body = lines.slice(head + 1, tail);
  const firstBullet = body.findIndex((l) => BULLET.test(l));
  const pre = firstBullet < 0 ? body : body.slice(0, firstBullet);
  const rest = firstBullet < 0 ? [] : body.slice(firstBullet);

  const bullets = [];
  for (const line of rest) {
    if (BULLET.test(line)) bullets.push([line]);
    else if (bullets.length) bullets[bullets.length - 1].push(line);
    else pre.push(line);
  }
  return { lines, head, tail, pre, bullets: bullets.map((b) => b.join("\n")) };
}

/** Ranked bullets first (anchor order), then the rest in their existing order. */
export function reorder(bullets, anchors) {
  const taken = new Set();
  const ranked = anchors.map((a) => {
    const hits = bullets
      .map((b, i) => [b, i])
      .filter(([b]) => b.includes(a))
      .map(([, i]) => i);
    if (hits.length === 0) throw new Error(`anchor matches no bullet: ${a}`);
    if (hits.length > 1) throw new Error(`anchor matches ${hits.length} bullets: ${a}`);
    if (taken.has(hits[0])) throw new Error(`two anchors match one bullet: ${a}`);
    taken.add(hits[0]);
    return bullets[hits[0]];
  });
  return [...ranked, ...bullets.filter((_, i) => !taken.has(i))];
}

function main() {
  const text = readFileSync(FILE, "utf8");
  const anchors = readAnchors(text);
  if (!anchors.length) {
    console.error("no rank anchors in the '## Build order' block — nothing to apply");
    process.exit(2);
  }
  const { lines, head, tail, pre, bullets } = splitOpen(text);
  const ordered = reorder(bullets, anchors);

  const same = ordered.every((b, i) => b === bullets[i]);
  console.log(`${anchors.length} anchors, ${bullets.length} bullets in '## Open'`);
  if (CHECK) {
    console.log(same ? "file order MATCHES the derived order" : "file order does NOT match the derived order");
    process.exit(same ? 0 : 1);
  }
  if (same) {
    console.log("already in ranked order — no write");
    return;
  }
  const out = [...lines.slice(0, head + 1), ...pre, ...ordered.join("\n").split("\n"), ...lines.slice(tail)];
  writeFileSync(FILE, out.join("\n"));
  console.log(`rewrote ${FILE}: ranked head is now ${ordered[0].split("\n")[0].slice(0, 72)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
