// tools/verdict-ab.mjs — the three answers, and the reader that feeds them.
//
// Why this file exists: verdict-ab shipped with its COULD-NOT-VERIFY path
// demonstrated only by hand, and its fixture reader was CORRECTED after a real
// miss — the first version saw 2 of the 6 message-array corpora and printed a
// confident IDENTICAL over the rest. Both facts lived in a report; nothing in
// test/ pinned either, so nothing would notice them regressing.
//
// The definitions the assertions below come from — written first, per
// dev-loop "Adding a check", so the expectations do not inherit the tool's
// own parentage:
//
//   (a) A verdict of "identical" over ZERO compared lines is an absence of
//       evidence wearing a verdict's clothes. Nothing replayable found =>
//       exit 2 and the words COULD NOT VERIFY. Never exit 0.
//   (b) A fixture is skippable IFF it carries no message array — that is the
//       property, not "is a .json" and not "is one of these three names". So
//       the expected skip list is DERIVED here, at test time, by an oracle
//       that walks the parsed fixture for a non-empty `messages` array at any
//       depth. That derivation is deliberately shape-agnostic: it shares no
//       code and no shape assumptions with the tool's three-shape reader, so
//       a reader that narrows again (the real 2-of-6 miss) diverges from it.
//       A hardcoded roster would instead go red the day a fixture is ADDED —
//       a check that fires on a non-defect, which trains the override reflex.
//   (c) Two trees that take a DIFFERENT decision on the same request must
//       exit 1 and print the line that changed. A differing pair reported as
//       identical is the failure this tool exists to prevent.
//   (d) A comparison whose two trees are BYTE-IDENTICAL over the compared
//       file (EXT) exercises no change at all, in ANY corpus — 0 of N pairs
//       matched, exit 2, COULD NOT VERIFY, never counted as a pass. This is
//       the 2026-08-18 measured miss (BACKLOG.md, "verdict-ab IDENTICAL over
//       a corpus lacking the case under test"): `node tools/verdict-ab.mjs
//       cdc2b9a^ aa85900` returned a clean IDENTICAL pass across 3,223
//       verdict lines while the change it was pricing (deferred-tool-rewrite.mjs)
//       never touches insertion-normalization.mjs at all — the compared file
//       is byte-identical across that whole range. A reader taking IDENTICAL
//       as "the change is inert" got the opposite of the truth. The
//       dedicated regression test below pins that exact real invocation
//       (immutable git history, per the corpus's anchor rule) rather than
//       only a stub.
//
// Trees are supplied as DIRECTORIES throughout (the tool accepts either a
// directory holding the extension or a git ref): no scratch worktree is
// created, so the suite cannot leave one behind. (a), (b) and the regression
// test run against the repo's own real extension/history; (c) and (d) use
// minimal stub trees, because the question there is whether a DIFFERENCE (or
// its absence) is reported, and manufacturing one out of the real extension
// would pin its current behaviour instead.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Overridable so a MUTANT copy of the tool can be run through these same
// assertions — that is how (a), (b) and (c) were shown red before being
// trusted. Nothing in production reads this.
const TOOL = process.env.VERDICT_AB_TOOL ?? join(REPO, "tools/verdict-ab.mjs");
const FIXTURES = join(REPO, "test/fixtures/harvested");
const EXT = "proxy/extensions/insertion-normalization.mjs";

function run(args) {
  try {
    const out = execFileSync(process.execPath, [TOOL, ...args], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? -1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

const scratch = (tag) => tmpDirSync(`verdict-ab-test-${tag}-`);

/** A minimal tree the tool will accept: just the extension module it imports. */
function stubTree(tag, source) {
  const dir = scratch(tag);
  mkdirSync(join(dir, dirname(EXT)), { recursive: true });
  writeFileSync(join(dir, EXT), source);
  return dir;
}

/**
 * The oracle for (b). "Carries a message array" at ANY depth, from the parsed
 * document — no knowledge of requests/records/jsonl layering, which is exactly
 * what makes it an independent check on the tool's layered reader.
 * LEDGER-* files are corpus bookkeeping, not fixtures; the tool skips them by
 * prefix without reporting, so they are outside the population either way.
 */
function carriesMessages(v) {
  if (Array.isArray(v)) return v.some(carriesMessages);
  if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      if (k === "messages" && Array.isArray(x) && x.length > 0) return true;
      if (carriesMessages(x)) return true;
    }
  }
  return false;
}

function expectedFixturePartition(dir) {
  const readable = [];
  const skippable = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith("LEDGER-")) continue;
    const path = join(dir, name);
    let has = false;
    if (name.endsWith(".jsonl")) {
      has = readFileSync(path, "utf8").split("\n").filter((l) => l.trim())
        .some((l) => carriesMessages(JSON.parse(l)));
    } else if (name.endsWith(".json")) {
      has = carriesMessages(JSON.parse(readFileSync(path, "utf8")));
    } else {
      continue;
    }
    (has ? readable : skippable).push(name);
  }
  return { readable, skippable };
}

const skippedNames = (out) =>
  [...out.matchAll(/^ +skipped (\S+?):/gm)].map((m) => m[1]).sort();
const corpusNames = (out) =>
  [...out.matchAll(/^ {2}(\S+): \d+ request\(s\)/gm)].map((m) => m[1]).sort();

test("BITE (a) — an empty corpus is COULD-NOT-VERIFY, exit 2, never a pass", () => {
  const empty = scratch("empty");
  const r = run([REPO, REPO, "--fixtures", empty]);
  assert.equal(r.code, 2, `exit 2 required, got ${r.code}:\n${r.out}`);
  assert.match(r.out, /COULD NOT VERIFY/, "the third answer must be said out loud");
  assert.doesNotMatch(r.out, /IDENTICAL/, "zero lines compared is not identity");
});

test("BITE (b) — every committed fixture shape is read; only the non-message-array ones are skipped", () => {
  const want = expectedFixturePartition(FIXTURES);
  // Guard the guard: a partition that is empty on either side would make the
  // comparison below pass while checking nothing.
  assert.ok(want.readable.length > 0, "corpus has no readable fixture — oracle or corpus is broken");
  assert.ok(want.skippable.length > 0, "corpus has no skippable fixture — (b) would be vacuous");

  // REPO vs REPO is the same directory on both sides, so EXT is trivially
  // byte-identical between A and B — (d)'s condition — and the run correctly
  // reports COULD NOT VERIFY rather than IDENTICAL now that 0-matched is its
  // own status. The reader-completeness assertions below are unaffected: the
  // per-corpus read/skip lines print during the loop, before the final
  // verdict is decided.
  const r = run([REPO, REPO, "--fixtures", FIXTURES]);
  assert.equal(r.code, 2, `identical trees exercise no change and must not report a pass:\n${r.out}`);
  assert.match(r.out, /COULD NOT VERIFY/, r.out);
  assert.deepEqual(skippedNames(r.out), want.skippable,
    "the skipped list must name exactly the fixtures carrying no message array");
  // ...and the other side of the same partition: every remaining fixture was
  // actually READ. Checking only the skip list would let the reader drop a
  // corpus silently, which is the 2-of-6 miss itself.
  const stripExt = (n) => n.replace(/\.(json|jsonl)$/, "");
  assert.deepEqual(corpusNames(r.out), want.readable.map(stripExt).sort(),
    "every message-array fixture must appear as a read corpus");
});

test("BITE (c) — a differing pair reports DIFFERS and prints the line that changed", () => {
  // Both stubs answer the same for a 2-message request and diverge on a
  // 3-message one, so the run has a stable line AND a changed line: a tool
  // that reported "everything differs" would be as wrong as one reporting
  // identity, and only a mixed corpus separates them.
  const common = `
export function resolveInsertionSessionKey() { return "conv"; }
`;
  const treeA = stubTree("a", `${common}
export function classifyPinned(messages) {
  return { action: "none", dropped: 0, canonicalEntries: null, messages };
}
`);
  const treeB = stubTree("b", `${common}
export function classifyPinned(messages) {
  const dropped = messages.length >= 3 ? 1 : 0;
  return { action: "none", dropped, canonicalEntries: null, messages };
}
`);
  const fixtures = scratch("pair");
  const msg = (t) => ({ role: "user", content: t });
  writeFileSync(join(fixtures, "synthetic.json"), JSON.stringify({
    requests: [
      { n: 0, messages: [msg("one"), msg("two")] },
      { n: 1, messages: [msg("one"), msg("two"), msg("three")] },
    ],
  }));

  const r = run([treeA, treeB, "--fixtures", fixtures]);
  assert.equal(r.code, 1, `a difference must exit 1, got ${r.code}:\n${r.out}`);
  // treeA and treeB's classifyPinned bodies genuinely differ (that is what
  // makes this pair diverge at all), so every pair in the run — not only the
  // one that diverged — ran through code the change touched: 2 of 2 matched.
  assert.match(r.out, /DIFFERS on 1 of 2 verdict lines \(2 of 2 pairs exercised the changed code\)/, r.out);
  assert.match(r.out, /^ +- A synthetic n=1 .*dropped=0/m, `A's line missing:\n${r.out}`);
  assert.match(r.out, /^ +\+ B synthetic n=1 .*dropped=1/m, `B's line missing:\n${r.out}`);
  assert.doesNotMatch(r.out, /n=0/, "the identical line must not be reported as a diff");
});

test("BITE (d) — byte-identical trees report 0 matched pairs, exit 2, never a pass", () => {
  const source = `
export function resolveInsertionSessionKey() { return "conv"; }
export function classifyPinned(messages) {
  return { action: "none", dropped: 0, canonicalEntries: null, messages };
}
`;
  const treeA = stubTree("d-a", source);
  const treeB = stubTree("d-b", source); // byte-identical source, distinct directories
  const fixtures = scratch("d-fixtures");
  const msg = (t) => ({ role: "user", content: t });
  writeFileSync(join(fixtures, "synthetic.json"), JSON.stringify({
    requests: [{ n: 0, messages: [msg("one"), msg("two")] }],
  }));

  const r = run([treeA, treeB, "--fixtures", fixtures]);
  assert.equal(r.code, 2, `a comparison that can exercise no change must not report a pass:\n${r.out}`);
  assert.match(r.out, /COULD NOT VERIFY/, r.out);
  assert.match(r.out, /0 of 1 verdict lines?/, r.out);
  assert.doesNotMatch(r.out, /^IDENTICAL/m, "0 matched pairs must never print a plain IDENTICAL pass");
});

test("REGRESSION 2026-08-18 — cdc2b9a^ vs aa85900 must not read as a plain pass", () => {
  // The real invocation that priced the combined-absorb build (BACKLOG.md,
  // "verdict-ab IDENTICAL over a corpus lacking the case under test"):
  // `node tools/verdict-ab.mjs cdc2b9a^ aa85900` returned IDENTICAL across
  // 3,223 verdict lines / 19 corpora, exit 0. True, and read backwards: the
  // change it was pricing lives entirely in
  // proxy/extensions/deferred-tool-rewrite.mjs and tools/replay.mjs — EXT
  // (insertion-normalization.mjs, the only file this tool loads) is
  // byte-identical across the whole range (`git diff cdc2b9a^ aa85900 --
  // proxy/extensions/insertion-normalization.mjs` is empty). Pinned to these
  // SHAs deliberately: they are this repo's own immutable history, so this
  // is the exact arrangement, not a stand-in for it.
  const r = run(["cdc2b9a^", "aa85900"]);
  assert.equal(r.code, 2, `must not report a pass over a comparison that changed nothing this tool inspects:\n${r.out}`);
  assert.match(r.out, /COULD NOT VERIFY/, r.out);
  assert.doesNotMatch(r.out, /^IDENTICAL/m, r.out);
});
