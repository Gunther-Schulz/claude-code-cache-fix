// tools/backlog-lint.mjs — the header/body contradiction check, and its own
// red-first proof.
//
// The mechanism this pins: on 2026-08-01 a manual sweep found FIVE BACKLOG.md
// entries whose header still read OPEN/READY/HOT while the SAME entry's body
// already carried a dated resolution — two of them mis-graded a survey
// before being caught by hand. Of those five, FOUR share one shape (the
// resolution lives inside the very entry whose header contradicts it); the
// fifth (a duplicate "#272 blocker 4" entry) is a DIFFERENT defect shape —
// its resolution lives in a separate, earlier entry, and it was fixed by
// DROPPING the duplicate outright (commit 9ae9e9b), not by rewriting its own
// header. That is cross-entry duplication, not same-entry contradiction, and
// this tool's rule (scoped `- **` to next `- **`, per the backlog item that
// requested it) cannot see across entries by design — widening it to do so
// would be near-duplicate detection, a materially different and larger tool
// than "one file, no dependencies" scoped for. This suite documents that
// boundary with a real negative case instead of quietly forcing a fifth
// match.
//
// Section 1 pins the RULE against synthetic entries (written from the
// definition, not from the tool's own behaviour) — a slash-listed
// enumeration of the marker words themselves (this file's own backlog entry
// describes them that way: "RESOLVED/FIXED/BUILT + VERIFIED/CLASS CLOSED")
// must NOT fire, since a literal match on that would make the tool trip on
// its own spec the moment it lands in BACKLOG.md.
//
// Section 2 is the red-first mechanism proof: the historical BACKLOG.md at
// 40c11b2 (read via `git show` at test time — never pasted here, so this
// file stays clear of the historical entries' own prose for the public-repo
// absence scan) must flag the four same-entry instances, and the current
// BACKLOG.md must flag zero.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { lintText, splitEntries } from "../tools/backlog-lint.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools/backlog-lint.mjs");
const HISTORICAL_REF = "40c11b2";

function runTool(args, input) {
  try {
    const out = execFileSync(process.execPath, [TOOL, ...args], {
      encoding: "utf8",
      input,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? -1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

function gitShow(ref, path) {
  return execFileSync("git", ["show", `${ref}:${path}`], { cwd: REPO, encoding: "utf8" });
}

// --- Section 1: the rule, against synthetic content -----------------------

test("fires on a READY header whose own body carries a dated RESOLVED", () => {
  const doc = [
    "## Open",
    "",
    "- **READY — synthetic widget rework.** Some grounding text.",
    "  More body. RESOLVED 2026-01-05 (deadbeef) — done and shipped.",
    "",
    "- **OPEN — unrelated other entry.** Nothing resolved here.",
  ].join("\n");
  const findings = lintText(doc);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].grade, "READY");
  assert.equal(findings[0].marker, "RESOLVED");
});

test("fires on an OPEN/HOT header whose body carries VERIFIED (un-negated)", () => {
  const doc = [
    "- **OPEN/HOT — synthetic hot item.** Body text.",
    "  BUILT + VERIFIED + PUSHED same day (cafefeed: 3/3 green).",
  ].join("\n");
  const findings = lintText(doc);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].grade, "OPEN/HOT");
});

test("does not fire on NOT-VERIFIED (still-open, not resolved)", () => {
  const doc = [
    "- **OPEN — still genuinely open.** Residual gap.",
    "  NOT-VERIFIED slot remains; no resolution yet.",
  ].join("\n");
  assert.deepEqual(lintText(doc), []);
});

test("does not fire on a slash-joined enumeration of the marker words themselves", () => {
  // This is the tool's OWN backlog entry shape — it describes its markers
  // as "RESOLVED/FIXED/BUILT + VERIFIED/CLASS CLOSED" in prose, and must
  // not trip on its own spec text.
  const doc = [
    "- **READY — backlog header lint.** WARN-only: flag an entry whose",
    "  header grade is OPEN/READY/HOT while the SAME entry's body carries",
    "  a dated resolution marker (RESOLVED/FIXED/BUILT + VERIFIED/CLASS",
    "  CLOSED).",
  ].join("\n");
  assert.deepEqual(lintText(doc), []);
});

test("does not fire when the header grade is outside OPEN/READY/HOT", () => {
  const doc = [
    "- **RESOLVED 2026-01-05 — already correctly graded.** FIXED and",
    "  VERIFIED same day.",
    "- **PARKED — deferred, not a grade this rule watches.** RESOLVED",
    "  2026-01-05 mentioned only in passing about something else.",
  ].join("\n");
  assert.deepEqual(lintText(doc), []);
});

test("a resolution word far from any date does not count as dated", () => {
  const doc = [
    "- **READY — no date near the word.** RESOLVED, eventually, once",
    "  the following two paragraphs of unrelated grounding text run all",
    "  the way past the proximity window this rule uses so that no",
    "  four-digit year ever lands within it: filler filler filler filler",
    "  filler filler filler filler filler filler filler filler filler.",
  ].join("\n");
  assert.deepEqual(lintText(doc), []);
});

test("splitEntries scopes strictly `- **` to the next `- **`", () => {
  const doc = ["front matter, ignored", "- **A.** body a", "  more a", "- **B.** body b"].join("\n");
  const entries = splitEntries(doc);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].body, "- **A.** body a\n  more a");
  assert.equal(entries[1].body, "- **B.** body b");
});

// --- Section 2: red-first against real history, green against current -----

test("CLI: red on the four same-entry instances in the historical BACKLOG.md (40c11b2)", () => {
  const historical = gitShow(HISTORICAL_REF, "BACKLOG.md");
  const { code, out } = runTool(["-"], historical);
  assert.equal(code, 0, "WARN-only: exit is always 0");
  const warnLines = out.split("\n").filter((l) => l.startsWith("WARN backlog-header"));
  // The mechanism proof: paste-worthy WARN lines from the actual historical
  // run (no historical prose duplicated in this file, per the public-repo
  // absence-scan constraint — only line numbers and markers are asserted).
  console.log("historical WARN lines:\n" + warnLines.join("\n"));
  assert.equal(warnLines.length, 4, "expected exactly the four same-entry instances");
  const byLine = Object.fromEntries(
    warnLines.map((l) => [Number(l.match(/line=(\d+)/)[1]), l]),
  );
  // row-4, merged-standalone, final-message strip, duplicate-request — the
  // four named instances that are genuinely same-entry contradictions.
  assert.ok(11 in byLine, "row-4 instance (line 11) must fire");
  assert.ok(433 in byLine, "merged-standalone instance (line 433) must fire");
  assert.ok(518 in byLine, "final-message-strip instance (line 518) must fire");
  assert.ok(947 in byLine, "duplicate-request instance (line 947) must fire");
});

test("CLI: the historical blocker-4 duplicate (line 1318) is a documented non-match", () => {
  // Named gap, not silently absorbed: this entry's OWN body carries no
  // resolution marker at 40c11b2 — its resolution lives in a separate
  // entry above it (the "blockers 3+4" RESOLVED entry). Cross-entry
  // duplication is a different defect shape than this rule's same-entry
  // contradiction; asserting the non-match here keeps that boundary honest
  // instead of stretching the rule (and risking false fires elsewhere —
  // the current BACKLOG.md contains 19 unrelated uses of "green" alone)
  // to force a fifth match.
  const historical = gitShow(HISTORICAL_REF, "BACKLOG.md");
  const entries = splitEntries(historical);
  const dup = entries.find((e) => /^- \*\*READY — #272 blocker 4:/.test(e.header));
  assert.ok(dup, "the historical duplicate entry must exist at the expected commit");
  assert.deepEqual(lintText(dup.body), [], "same-entry rule correctly does not fire on it");
});

test("CLI: zero false fires on the current BACKLOG.md", () => {
  const { code, out } = runTool([join(REPO, "BACKLOG.md")]);
  assert.equal(code, 0);
  const warnLines = out.split("\n").filter((l) => l.startsWith("WARN backlog-header"));
  assert.deepEqual(warnLines, [], "current file must be clean");
  assert.match(out, /backlog-lint: clean/);
});

test("CLI: defaults to the repo's own BACKLOG.md with no argument", () => {
  const { code, out } = runTool([]);
  assert.equal(code, 0);
  assert.match(out, /backlog-lint: clean/);
});
