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
// AND an anchor resolving to a COMPLETED entry is the same class, found 2026-08-07
// by a dispatch that was cut from a ranked head whose own body read
// `(DONE — f2ab6d0, 2026-08-07)`. The anchor still matched its bullet, so neither
// this tool nor `backlog-lint` said anything: the zero/multi checks below ask
// WHETHER the anchor resolves, never WHAT it resolves to, and backlog-lint skips
// any entry whose header carries no live grade — which a correctly re-graded DONE
// header does not. Four of thirty-three anchors were in that state, and the list
// they sit in is what a dispatcher reads to pick the next piece of work.
//
// Usage:
//   node tools/backlog-order.mjs            # rewrite BACKLOG.md in ranked order
//   node tools/backlog-order.mjs --check    # exit 1 if not already in ranked order
//   node tools/backlog-order.mjs --file X   # operate on X (tests)

import { readFileSync, writeFileSync } from "node:fs";

const argv = process.argv.slice(2);

// Unknown flags are REJECTED rather than ignored, because the no-flag default
// is the destructive branch: anything not recognised used to fall straight
// through to "rewrite BACKLOG.md". Measured 2026-08-07 — `--help`, which this
// tool does not implement, silently reordered the whole file (and restored an
// already-SHIPPED entry to the ranked head, the exact defect the DONE-anchor
// guard exists to catch). A default that acts, reached by a typo, is the
// check-that-fires-on-a-non-defect shape with the sign flipped.
const KNOWN = new Set(["--check", "--file"]);
for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--file") { i++; continue; }   // its value is not a flag
    if (!KNOWN.has(argv[i])) {
        console.error(`backlog-order: unknown argument '${argv[i]}'`);
        console.error("usage: backlog-order.mjs [--check] [--file <path>]");
        console.error("  no flags = REWRITE the file in ranked order");
        process.exit(2);
    }
}

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

// DEFINITION, written before the assertion that uses it. A bullet's GRADE is the
// marker word that OPENS its header line, immediately after `- **` and an optional
// `(`. An entry is RESOLVED when that word is one of the four resolution markers
// `tools/backlog-lint.mjs` already defines (RES_WORD and DONE_LINE there) — the
// repo's own vocabulary, imported as a definition rather than re-derived from what
// today's file happens to contain. Resolved work is not build work, so it cannot
// hold a rank.
//
// HEADER ONLY, deliberately: backlog-lint matches its markers anywhere in a body,
// which is right for "this header contradicts its own body" and wrong here — the
// corpus writes qualified sub-steps ("ATTRIBUTE DONE <date>") inside entries that
// are correctly still open, and a body-wide match would fire on those. A guard
// that fires on legitimate work trains the override reflex that kills it.
const RESOLVED_GRADE = /^- \*\*\(?(DONE|RESOLVED|FIXED|BUILT)\b/;

/** The resolution marker opening this bullet's header, or null if it is live work. */
export function resolvedGrade(bullet) {
  const m = RESOLVED_GRADE.exec(bullet.split("\n", 1)[0]);
  return m ? m[1] : null;
}

/** Ranked bullets first (anchor order), then the rest in their existing order. */
export function reorder(bullets, anchors) {
  // Reported together rather than one throw per anchor: the list is read and
  // repaired as a whole, and a first-one-only error costs a run per stale anchor.
  const completed = [];
  for (const a of anchors) {
    const hits = bullets.filter((b) => b.includes(a));
    if (hits.length !== 1) continue; // zero/multi is the existing errors' business
    const grade = resolvedGrade(hits[0]);
    if (grade) completed.push(`${grade}: ${a}`);
  }
  if (completed.length) {
    throw new Error(
      `${completed.length} rank anchor(s) resolve to a COMPLETED entry — resolved work is not `
        + `build work and cannot hold a rank. Remove the anchor from the '## Build order' block; `
        + `removal only, re-derive to re-rank. Resolution grades checked: DONE, RESOLVED, FIXED, `
        + `BUILT.\n${completed.map((c) => `  ${c}`).join("\n")}`,
    );
  }

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

// A bullet's leading line, truncated to a readable width — same 72-char
// convention the rewrite path's "ranked head is now ..." summary already uses.
function leadingLine(bullet) {
  return bullet.split("\n", 1)[0].slice(0, 72);
}

// A mismatch report names WHAT is misplaced, not only that something is —
// the fired shape (2026-08-08): `--check` printed "does NOT match" and
// nothing else, so establishing why cost a stash-and-bisect on a copy other
// agents write to, even though `ordered` and `bullets` are both already in
// hand at the call site. Null means the two sequences match.
export function describeMismatch(bullets, ordered) {
  let index = -1;
  let misplacedCount = 0;
  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i] !== bullets[i]) {
      misplacedCount++;
      if (index < 0) index = i;
    }
  }
  if (index < 0) return null;
  return { index, found: leadingLine(bullets[index]), expected: leadingLine(ordered[index]), misplacedCount };
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

  const mismatch = describeMismatch(bullets, ordered);
  console.log(`${anchors.length} anchors, ${bullets.length} bullets in '## Open'`);
  if (CHECK) {
    if (!mismatch) {
      console.log("file order MATCHES the derived order");
      process.exit(0);
    }
    console.log("file order does NOT match the derived order");
    console.log(`  first divergent index: ${mismatch.index}`);
    console.log(`  found:    ${JSON.stringify(mismatch.found)}`);
    console.log(`  expected: ${JSON.stringify(mismatch.expected)}`);
    console.log(`  ${mismatch.misplacedCount} bullet(s) misplaced`);
    process.exit(1);
  }
  if (!mismatch) {
    console.log("already in ranked order — no write");
    return;
  }
  const out = [...lines.slice(0, head + 1), ...pre, ...ordered.join("\n").split("\n"), ...lines.slice(tail)];
  writeFileSync(FILE, out.join("\n"));
  console.log(`rewrote ${FILE}: ranked head is now ${ordered[0].split("\n")[0].slice(0, 72)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
