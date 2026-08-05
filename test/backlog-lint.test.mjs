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

import { lintText, lintPointers, splitEntries } from "../tools/backlog-lint.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools/backlog-lint.mjs");
const HISTORICAL_REF = "40c11b2";
// The pointer lane's red-first fixture: the state BEFORE the 2026-08-05 fix,
// where the TOP-PRIORITY item still pointed at `stash@{0}` while
// `git stash list` was empty. Read via `git show` at test time, per this
// file's standing idiom — historical prose never gets pasted here.
const PRE_STASH_FIX_REF = "6f415e8~1";

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

// --- DONE is a grade word here, and the marker set could not see it ---
//
// This corpus grades with DONE as freely as with RESOLVED, so an entry could
// record its own completion and keep an OPEN header without the guard
// noticing — a checker that passes review and catches nothing, in the class
// it was built for (found live 2026-08-02: an OPEN entry whose body carried
// "DONE <date>" and whose remedy had shipped).
//
// The discriminator is LINE-INITIAL, because this corpus also writes
// qualified sub-steps — "ATTRIBUTE DONE <date>" — inside entries that are
// correctly still open. Matching a bare DONE anywhere would fire on those,
// and a guard that fires on legitimate work trains the override reflex.
test("fires on an OPEN header whose body carries a line-initial dated DONE", () => {
  const doc = [
    "- **OPEN — a thing that quietly finished**",
    "  Some context about the thing.",
    "  DONE 2026-08-01 (abc1234, the remedy shipped).",
  ].join("\n");
  const findings = lintText(doc);
  assert.equal(findings.length, 1, "a self-recorded DONE under OPEN must be seen");
  assert.equal(findings[0].marker, "DONE");
});

test("does NOT fire on a qualified sub-step DONE under a correctly-open header", () => {
  const doc = [
    "- **OPEN — a live question with one finished sub-step**",
    "  ATTRIBUTE DONE 2026-08-01 (the attribution, not the entry).",
    "  The live question is unchanged and time-gated.",
  ].join("\n");
  assert.deepEqual(lintText(doc), [], "a sub-step qualifier is not a grade claim");
});

test("does NOT fire on an undated DONE — the date is what makes it a grade claim", () => {
  const doc = [
    "- **OPEN — a thing**",
    "  DONE is the word we use when something finishes.",
  ].join("\n");
  assert.deepEqual(lintText(doc), [], "prose use of the word is not a resolution");
});

// --- Section 3: the pointer-liveness lane ---------------------------------
//
// Definitions these bites are written FROM (not from the implementation):
//
//   A pointer in a backlog entry is a promise that something can still be
//   reached. It is DEAD when following it lands nowhere. STASH-REF is the
//   one label that does not ask: a stash index is not a durable pointer at
//   all — entries renumber when anything else is stashed and a pop deletes
//   the ref — so a live `stash@{0}` is no more trustworthy than a dead one
//   and the label fires unconditionally.
//
// The resolvers are injected so these pin the RULE rather than this
// machine's filesystem and object store, and so a single named condition
// can be mutated at a time (see the mutation record in the closing report).

const STUB = {
  pathExists: (p) => p === "tools/alive.mjs",
  objectProbe: (t) => ({ ok: t === "abc1234", proof: "" }),
  commitProbe: (t) => ({ ok: t === "abc1234", proof: "fatal: Not a valid object name" }),
  refProbe: (r) => ({ ok: r === "pr/alive", proof: "exit 1, no output" }),
};

const labelsOf = (findings) => findings.map((f) => f.label);

test("STASH-REF fires unconditionally, and once per occurrence", () => {
  const doc = [
    "- **READY — a thing whose work is off-git.**",
    "  The implementation lives in `stash@{0}`; pop it before starting.",
    "  Priority list: (1) finish the thing from `stash@{0}`.",
  ].join("\n");
  const findings = lintPointers(doc, STUB);
  assert.deepEqual(labelsOf(findings), ["STASH-REF", "STASH-REF"]);
  // Distinct lines: an entry citing the same dead pointer twice must not
  // collapse to one finding, or the second citation is invisible to whoever
  // fixes it.
  assert.deepEqual(
    findings.map((f) => f.line),
    [2, 3],
  );
});

test("PATH-DEAD fires on a backticked repo path that does not exist", () => {
  const doc = ["- **READY — a thing.** See `tools/gone.mjs` for the detail."].join("\n");
  const findings = lintPointers(doc, STUB);
  assert.deepEqual(labelsOf(findings), ["PATH-DEAD"]);
  assert.equal(findings[0].token, "tools/gone.mjs");
});

test("PATH-DEAD does not fire on a path that exists", () => {
  const doc = ["- **READY — a thing.** See `tools/alive.mjs`."].join("\n");
  assert.deepEqual(lintPointers(doc, STUB), []);
});

// The COMMIT-DEAD lane was REMOVED after one real run (0 true positives, 8
// false ones — capture ids, source fingerprints and session ids, all short
// hex, none of them git objects). This bite pins the removal so it is not
// quietly re-added: an unresolvable hex token is NOT a finding, because the
// token's shape cannot say which namespace it belongs to.
test("an unresolvable short hex token is NOT flagged — namespace is not decidable from shape", () => {
  const doc = ["- **READY — a thing.** Shipped at `9fe4d21`, tree `3c14d4fd3446`, session `03d45c17`."].join("\n");
  assert.deepEqual(lintPointers(doc, STUB), []);
});

test("REF-DEAD fires on a branch pattern with no matching ref", () => {
  const doc = ["- **READY — a thing.** The slice sits on `pr/gone-branch`."].join("\n");
  const findings = lintPointers(doc, STUB);
  assert.deepEqual(labelsOf(findings), ["REF-DEAD"]);
  assert.equal(findings[0].token, "pr/gone-branch");
});

test("ABS-PATH fires on an absolute machine path and is its own label", () => {
  const doc = ["- **READY — a thing.** Config at `/home/someone/proj/.git/config`."].join("\n");
  const findings = lintPointers(doc, STUB);
  assert.deepEqual(labelsOf(findings), ["ABS-PATH"]);
});

// --- Section 3b: the false-fire discipline, stated as negatives -----------
//
// Required by the design: a check that fires on a NON-defect is broken too.
// Each of these is a shape the corpus really contains.

test("NEGATIVE: a placeholder inside a command does not flag", () => {
  // `<key>` is a placeholder, not a pointer; the surrounding command is a
  // real invocation and must not drag it in.
  const doc = ["- **READY — a thing.** Run `harvest --pin <key>` first."].join("\n");
  assert.deepEqual(lintPointers(doc, STUB), []);
});

test("NEGATIVE: a path mentioned in prose, not backticks, does not flag", () => {
  // Prose discusses; backticks cite. Only the citation is a pointer claim.
  const doc = [
    "- **READY — a thing.** The old tools/gone.mjs approach was abandoned",
    "  and docs/vanished.md was never written.",
  ].join("\n");
  assert.deepEqual(lintPointers(doc, STUB), []);
});

test("NEGATIVE: a glob does not flag as a dead path", () => {
  // `proxy/**` is a scope marker this corpus writes constantly.
  const doc = ["- **READY — a thing (`proxy/**`, deployment-coupled).** Body."].join("\n");
  assert.deepEqual(lintPointers(doc, STUB), []);
});

test("NEGATIVE: a path:line citation of a live file does not flag", () => {
  // Found on this lane's first real run: three live files read as dead
  // because the `:60-62` citation suffix was treated as part of the name.
  const doc = ["- **READY — a thing.** See `tools/alive.mjs:60-62` and `tools/alive.mjs:7,267`."].join("\n");
  assert.deepEqual(lintPointers(doc, STUB), []);
});

test("NEGATIVE: a hex token that resolves to a non-commit object does not flag", () => {
  // Also from the first real run: this corpus records deployment pins as
  // TREE hashes, and `^{commit}` rejects a tree. A resolving object is not
  // a dead pointer, whatever its type.
  const doc = ["- **READY — a thing.** Deployed tree `abc1234`."].join("\n");
  assert.deepEqual(lintPointers(doc, STUB), []);
});

test("NEGATIVE: an all-letter or all-digit hex-shaped word does not flag", () => {
  // "defaced" is seven hex characters; "20260805" is eight. Requiring both
  // a digit and an a-f letter is what separates a short SHA from an
  // English word and from a bare date.
  const doc = ["- **READY — a thing.** The record was `defaced` on `20260805`."].join("\n");
  assert.deepEqual(lintPointers(doc, STUB), []);
});

// --- Section 3c: red-first against the real pre-fix history ---------------

test("the pre-fix BACKLOG.md carries the dead stash pointer this lane exists for", () => {
  const historical = gitShow(PRE_STASH_FIX_REF, "BACKLOG.md");
  const stash = lintPointers(historical).filter((f) => f.label === "STASH-REF");
  console.log("pre-fix STASH-REF findings:\n" + stash.map((f) => `line=${f.line} ${f.token}`).join("\n"));
  assert.equal(stash.length, 2, "both citations in the 2026-08-02 handoff must fire");
  // The stash index was empty when this was found by hand — the pointer was
  // load-bearing, dead, and invisible to every existing check.
  const { code, out } = runTool(["--pointers", "-"], historical);
  assert.equal(code, 0, "REPORT-only: exit is always 0");
  assert.match(out, /backlog-pointers: \d+ finding\(s\) — REPORT only/);
  assert.match(out, /STASH-REF=2/);
});

test("--pointers leaves the existing header lane and exit code untouched", () => {
  const plain = runTool([join(REPO, "BACKLOG.md")]);
  const withFlag = runTool(["--pointers", join(REPO, "BACKLOG.md")]);
  assert.equal(plain.code, 0);
  assert.equal(withFlag.code, 0);
  // The header lane's own output is byte-identical with and without the flag.
  const headerPart = (s) => s.split("backlog-pointers:")[0].split("WARN backlog-pointer")[0];
  assert.equal(headerPart(withFlag.out), headerPart(plain.out));
  // And the pointer lane only appears when asked for.
  assert.ok(!plain.out.includes("backlog-pointer"), "no pointer output without the flag");
  assert.match(withFlag.out, /backlog-pointers:/);
});

test("per-class counts are printed with zeros stated", () => {
  // A class printed as 0 is a measured zero; a class missing from the line
  // is indistinguishable from one the lane forgot to look for.
  const { out } = runTool(["--pointers", "-"], "- **READY — nothing to see.** Plain body.\n");
  const line = out.split("\n").find((l) => l.startsWith("backlog-pointers:"));
  for (const label of ["STASH-REF", "PATH-DEAD", "REF-DEAD", "ABS-PATH"]) {
    assert.match(line, new RegExp(`${label}=0`), `${label} must be stated even at zero`);
  }
});
