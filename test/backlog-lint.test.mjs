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
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  lintText, lintPointers, splitEntries,
  lintCitations, lintRowStatus, lintPremiseTrue, lintCorrectionPlacement,
} from "../tools/backlog-lint.mjs";
// Namespace import for the two lanes new to this dispatch (lintReadyBar,
// READY_BAR_LABELS). Per dev-loop.md's ESM-namespace-import rule: a STATIC
// NAMED import of a not-yet-existing export fails the whole module at ESM
// link time and reddens every bite vacuously, proving nothing about which
// half broke. `lint.*` always links; a missing export reads as `undefined`
// and fails only at its own call site, which is what makes the red-first
// split (pre-existing bites pass, new ones fail) demonstrable at all.
import * as lint from "../tools/backlog-lint.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools/backlog-lint.mjs");
const HISTORICAL_REF = "40c11b2";
// The pointer lane's red-first fixture: the state BEFORE the 2026-08-05 fix,
// where the TOP-PRIORITY item still pointed at `stash@{0}` while
// `git stash list` was empty. Read via `git show` at test time, per this
// file's standing idiom — historical prose never gets pasted here.
const PRE_STASH_FIX_REF = "6f415e8~1";
// The citation lane's red-first fixture: the state BEFORE `fe78c94`
// corrected the `capturePairResult` entry's stale `:749`/`:760` citations to
// `:754`/`:765`. Read via `git show` at test time.
const PRE_CITATION_FIX_REF = "fe78c94~1";
// The premise-true and correction-placement lanes' shared red-first fixture:
// the backlog state one retirement pass produced on 2026-08-10, frozen
// before any further edits. Carries both a STILL-TRUE-BUT-DONE entry (the
// coverage-walk graduation, citing `7827c4e`/`b94d118` and its own
// split-out third part) and a LATE-CORRECTION entry (the runbook-caveat
// entry, correction ~80% in) plus a real EARLY-correction control (the
// bust-appears DONE entry, correction inside its own header).
const RETIREMENT_PASS_REF = "633256b";
const MATRIX_PATH = join(REPO, "docs/directives/robustness-threat-matrix.md");
// The frozen base ref this dispatch was scoped against — the READY-bar and
// UNREACHABLE-OBJECT lanes' immutable accounting target (dispatch brief,
// "ACCOUNTING over the immutable ref, not the live file").
const FROZEN_READY_BAR_REF = "2bf1f21";

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

// --- Section 2b: the widened marker exemption ------------------------------
//
// Widens the exemption from slash-adjacency to two structural shapes (see
// BACKLOG.md, "backlog-lint's enumeration exemption is SLASH-ONLY"):
//   ENUMERATION CONTEXT — a marker word inside a run of 2+ ALL-CAPS terms
//   describes the terms themselves, not the entry's status.
//   SUB-CLAIM SCOPE — a dated resolution inside a sentence-initial bold run
//   or a "Superseded" section resolves a NAMED SUB-CLAIM, not the entry.
//
// The real historical instance that pins the boundary of the enumeration
// widening: "BUILT + VERIFIED + PUSHED same day (78940a0: 7/7 …)" at
// commit 40c11b2 (the MERGED-reminder-standalone entry, one of Section 2's
// four required true positives) is a genuine "+"-joined ALL-CAPS run and
// MUST still fire — Section 1's existing "fires on an OPEN/HOT header
// whose body carries VERIFIED (un-negated)" test above pins this same
// shape from the definition, and doubles as the regression pin for "a run
// joined ONLY by + never counts as an enumeration" once this section's
// widened exemption lands.

test("does not fire on a comma-joined enumeration of an unrelated status vocabulary sharing a marker word", () => {
  // DECLARED/RUNNING/VERIFIED is this repo's real doctor three-answer-gate
  // vocabulary (docs/runbooks/sweep-finding.md) — VERIFIED collides with
  // this tool's marker set by coincidence, not by claiming resolution.
  const doc = [
    "- **READY — the sweep's own three-answer gate.** The three answers —",
    "  DECLARED, RUNNING, VERIFIED — must all agree before the verdict means",
    "  anything; this entry is about wiring that check, not about being done.",
  ].join("\n");
  assert.deepEqual(lintText(doc), []);
});

test("does not fire on a vs-joined enumeration of an unrelated status vocabulary sharing a marker word", () => {
  const doc = [
    "- **OPEN — comparing two verdict schemes.** The gate compares DECLARED",
    "  vs RUNNING vs VERIFIED before a verdict counts, which is the",
    "  three-answer discipline this entry is scoping, not claiming done.",
  ].join("\n");
  assert.deepEqual(lintText(doc), []);
});

test("does not fire on an and-joined enumeration of an unrelated status vocabulary sharing a marker word", () => {
  const doc = [
    "- **READY — the gate's agreement rule.** The gate needs DECLARED and",
    "  RUNNING and VERIFIED to agree before anything downstream trusts the",
    "  verdict; nothing here is a claim that this entry itself is done.",
  ].join("\n");
  assert.deepEqual(lintText(doc), []);
});

test("does not fire on a SPACE-PADDED slash-joined enumeration — the adjacency-only guard's exact gap", () => {
  // The historically-measured false fire: a padded separator puts a SPACE
  // next to the marker, escaping a guard that inspects only the adjacent
  // character (the THIRD FIRE in the BACKLOG.md entry this widens).
  const doc = [
    "- **HOT — the sweep's own verdict discipline.** DECLARED / RUNNING /",
    "  VERIFIED must agree before the sweep's verdict means anything; this",
    "  entry documents that rule, it does not claim to be resolved by it.",
  ].join("\n");
  assert.deepEqual(lintText(doc), []);
});

test("still does not fire on the same vocabulary tight-slash-joined (regression against the old exemption)", () => {
  const doc = [
    "- **OPEN/HOT — doctor's three-answer check, referenced here.** A",
    "  DECLARED/RUNNING/VERIFIED mismatch is what the sweep's COULD-NOT-VERIFY",
    "  bucket exists for — this entry only cites the concept.",
  ].join("\n");
  assert.deepEqual(lintText(doc), []);
});

test("does not fire on the tool's own marker-word enumeration mixing '+' across two slash groups", () => {
  // The original motivating false fire, restated (never pasted literally
  // into BACKLOG.md itself — see that entry's own warning about self-firing
  // on its own example text).
  const doc = [
    "- **READY — backlog header lint.** WARN-only: flag an entry whose",
    "  header grade is OPEN/READY/HOT while the SAME entry's body carries a",
    "  dated resolution marker (RESOLVED/FIXED/BUILT + VERIFIED/CLASS",
    "  CLOSED).",
  ].join("\n");
  assert.deepEqual(lintText(doc), []);
});

test("sub-claim scope: a sentence-initial bold run naming a sub-claim clears a dated RESOLVED inside it", () => {
  const doc = [
    "- **READY — the fork-only accounting still needs a recheck.** Grounding",
    "  text about the discrepancy spans this whole first sentence, closing",
    "  the header's own bold run right here.",
    "  **Three-way README contradiction — RESOLVED 2026-08-08 by `bbc1213`,",
    "  and the paragraph below is kept only as the input that produced the",
    "  decision.** The operator's call was made and is recorded elsewhere.",
  ].join("\n");
  assert.deepEqual(lintText(doc), []);
});

test("sub-claim scope: text after a literal Superseded label clears a dated marker inside that section", () => {
  const doc = [
    "- **READY — the fork-only accounting still needs a recheck.** Grounding",
    "  text about the discrepancy.",
    "  Superseded text: the original count was RESOLVED 2026-07-01 by an",
    "  earlier probe that the current numbers have since overtaken.",
    "",
    "  The live question is unchanged and still open.",
  ].join("\n");
  assert.deepEqual(lintText(doc), []);
});

test("sub-claim scope does NOT clear a mid-sentence (non-sentence-initial) bold RESOLVED — inline emphasis is not a sub-claim", () => {
  const doc = [
    "- **OPEN/HOT — a live item.** Body opens plainly, no bold here yet.",
    "  The fix landed and the count reads **RESOLVED 2026-08-01** inline,",
    "  emphasized for the reader but not naming any separate sub-claim —",
    "  this is the entry's own status, just typeset with emphasis.",
  ].join("\n");
  const findings = lintText(doc);
  assert.equal(findings.length, 1, "mid-sentence bold emphasis must not be read as sub-claim scope");
  assert.equal(findings[0].marker, "RESOLVED");
});

test("sub-claim scope does NOT exempt the entry's own header bold run — only a LATER bold span can scope a sub-claim", () => {
  const doc = [
    "- **READY — the VERIFIED count needs a recheck.** Body prose is",
    "  unrelated to any resolution; it only discusses methodology and open",
    "  questions.",
  ].join("\n");
  const findings = lintText(doc);
  assert.equal(findings.length, 1, "the header's own bold run is the entry's status claim, never a sub-claim");
  assert.equal(findings[0].marker, "VERIFIED");
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

// Three resolving hex tokens, each a different UNREACHABLE-OBJECT case:
//   abc1234  resolves, NOT a commit (models a deployment-pin TREE hash) —
//            the pre-existing "non-commit object does not flag" control.
//   cafe123  resolves, IS a commit, reachable from a ref — the
//            UNREACHABLE-OBJECT negative control.
//   dead456  resolves, IS a commit, reachable from NO ref — the
//            UNREACHABLE-OBJECT positive.
// Added 2026-08-11 at integration, from probing the lane's BOUNDARY rather
// than its class:
//   FULL_SHA  40 chars, resolves, IS a commit, reachable from NO ref — the
//             boundary positive. Under the original 7-12 bound this token was
//             outside the lane's reach entirely, so a full-length citation of
//             an unreachable commit could not fire however dead it was.
//   CONV_KEY  16 chars, resolves to NOTHING — the widening's false-fire
//             control, and it is the real shape the corpus carries at that
//             length (conversation sub-keys and state keys, seven of them in
//             BACKLOG.md today). The widening must not reach these.
// Mixed digits AND letters on purpose: the lane requires both, and the first
// draft of this fixture used `deadbeef…`, which is all letters — so the bite
// went red BEFORE any mutation. That red was a finding about the FIXTURE, not
// about the widening, and repairing it here rather than loosening the rule is
// the whole point (a mutation that leaves a bite green, or a bite that is red
// for a reason nobody planted, indicts the arrangement first).
const FULL_SHA = "dead456dead456dead456dead456dead456dead4";
const CONV_KEY = "0a3d686e8066b1e2";
const STUB = {
  pathExists: (p) => p === "tools/alive.mjs",
  objectProbe: (t) => ({ ok: ["abc1234", "cafe123", "dead456", FULL_SHA].includes(t), proof: "" }),
  commitProbe: (t) => ({
    ok: ["cafe123", "dead456", FULL_SHA].includes(t),
    proof: "fatal: Not a valid object name",
  }),
  reachProbe: (t) => ({ ok: true, proof: t === "cafe123" ? "refs/heads/main" : "" }),
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

// --- Section 3d: UNREACHABLE-OBJECT — the resolution-gated reachability
// class, compatible with the 0-for-8 no-commit-dead-lane lesson because it
// only classifies a token AFTER git itself has resolved it as an object.
// Motivating instance: `dc8c475` sat reachable from no ref at all until a
// rescue tag was minted for it by hand. A tag counts as reachable — this
// lane checks "reachable from SOME ref", never "on main".

test("UNREACHABLE-OBJECT fires when a resolving commit is reachable from no ref", () => {
  const doc = ["- **READY — a thing.** Landed at `dead456` (pre-integration hash)."].join("\n");
  const findings = lintPointers(doc, STUB);
  assert.deepEqual(labelsOf(findings), ["UNREACHABLE-OBJECT"]);
  assert.equal(findings[0].token, "dead456");
});

test("NEGATIVE: UNREACHABLE-OBJECT does not fire when the resolving commit IS reachable", () => {
  const doc = ["- **READY — a thing.** Landed at `cafe123`, on main."].join("\n");
  assert.deepEqual(lintPointers(doc, STUB), []);
});

test("NEGATIVE: UNREACHABLE-OBJECT does not fire on a resolving non-commit object", () => {
  // Same token, same reasoning as the pre-existing "non-commit object"
  // control above, restated for this class specifically: a tree never gets
  // reachability-checked at all.
  const doc = ["- **READY — a thing.** Deployed tree `abc1234`."].join("\n");
  assert.deepEqual(lintPointers(doc, STUB), []);
});

test("BOUNDARY: UNREACHABLE-OBJECT reaches a FULL 40-char sha, not only the short form", () => {
  // The reach hole this bite closes was real and silent: `OBJECT_TOKEN` was
  // `HEX_TOKEN` (7-12) until 2026-08-11, so a full-length citation of a
  // reachable-from-nothing commit sailed past a lane built to catch exactly
  // that. A guard that holds one route and not the other is not a guard.
  const doc = [`- **READY — a thing.** Landed at \`${FULL_SHA}\` before integration.`].join("\n");
  const findings = lintPointers(doc, STUB);
  assert.deepEqual(labelsOf(findings), ["UNREACHABLE-OBJECT"]);
  assert.equal(findings[0].token, FULL_SHA);
});

test("BOUNDARY CONTROL: the widening does not reach a 16-char conversation sub-key", () => {
  // The widening's whole safety argument is that it is RESOLUTION-gated, and
  // this is that argument executed rather than asserted: a token of exactly
  // the shape the corpus carries at 13-16 chars resolves to no object, so it
  // takes the same `continue` the 0-for-8 lesson installed. If this bite ever
  // fires, the widening reached a namespace it must not.
  const doc = [`- **READY — a thing.** State key \`${CONV_KEY}\` held across the pair.`].join("\n");
  assert.deepEqual(lintPointers(doc, STUB), []);
});

test("NEGATIVE: UNREACHABLE-OBJECT does not fire on a token that resolves to nothing", () => {
  // Same token, same reasoning as the pre-existing "unresolvable short hex
  // token" control above — the 0-for-8 lesson must survive unmodified.
  const doc = ["- **READY — a thing.** Shipped at `9fe4d21`."].join("\n");
  assert.deepEqual(lintPointers(doc, STUB), []);
});

test("UNREACHABLE-OBJECT: red-first against the real frozen ref (2bf1f21) — real unreachable commits, no fixture needed", () => {
  const historical = gitShow(FROZEN_READY_BAR_REF, "BACKLOG.md");
  const unreach = lintPointers(historical).filter((f) => f.label === "UNREACHABLE-OBJECT");
  console.log(
    "2bf1f21 UNREACHABLE-OBJECT findings:\n" +
      unreach.map((f) => `line=${f.line} token=${f.token} entry="${f.title}"`).join("\n"),
  );
  // Real positives found by hand before this bite was written: 3c4ecfa
  // (cited twice), e4bd379, 41ed30c — each independently confirmed a real
  // commit (`git cat-file -t`) reachable from no ref (`git for-each-ref
  // --contains` empty) at the time this ref was frozen.
  const tokens = new Set(unreach.map((f) => f.token));
  assert.ok(tokens.has("3c4ecfa"), "3c4ecfa must fire — confirmed unreachable by hand");
  assert.ok(tokens.has("e4bd379"), "e4bd379 must fire — confirmed unreachable by hand");
  assert.ok(tokens.has("41ed30c"), "41ed30c must fire — confirmed unreachable by hand");
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

// --- Section 4: the citation-drift lane ------------------------------------
//
// Definitions from BACKLOG.md, "a backlog entry that cites `file:line` has
// no check that": a citation is FULL (`` `path:NNN` ``) or BARE
// (`` `:NNN` ``, resolved against the nearest preceding full citation in the
// same entry). Its ANCHOR is the quoted expression tightly beside it. FOUR
// answers, never two: MATCH, DRIFTED, BROKEN-PATH, COULD-NOT-CHECK.

const CIT_FILES = {
  "tools/sample.mjs": ["line0", "const cid = 1;", "line2", "line3", "if (x) continue;"],
};
const CIT_STUB = {
  pathExists: (p) => p in CIT_FILES,
  readLines: (p) => CIT_FILES[p],
};

test("citation lane: MATCH when the cited line contains the anchor", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** See `tools/sample.mjs:2`",
    "  (`const cid = 1;`) directly.",
  ].join("\n");
  const findings = lintCitations(doc, CIT_STUB);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].verdict, "MATCH");
});

test("citation lane: DRIFTED when the anchor moved, and the new line is named", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** See `tools/sample.mjs:1`",
    "  (`const cid = 1;`) directly.",
  ].join("\n");
  const findings = lintCitations(doc, CIT_STUB);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].verdict, "DRIFTED");
  assert.equal(findings[0].newLine, 2);
});

test("citation lane: DRIFTED with no elsewhere-match names that too", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** See `tools/sample.mjs:1`",
    "  (`this text is nowhere in the file`) directly.",
  ].join("\n");
  const findings = lintCitations(doc, CIT_STUB);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].verdict, "DRIFTED");
  assert.equal(findings[0].newLine, null);
});

test("citation lane: BROKEN-PATH when the cited file does not exist", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** See `tools/missing.mjs:3`",
    "  (`whatever`) directly.",
  ].join("\n");
  const findings = lintCitations(doc, CIT_STUB);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].verdict, "BROKEN-PATH");
});

test("citation lane: COULD-NOT-CHECK when there is no anchor to check against", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** See `tools/sample.mjs:2` in passing, no quote follows.",
  ].join("\n");
  const findings = lintCitations(doc, CIT_STUB);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].verdict, "COULD-NOT-CHECK");
});

test("citation lane: COULD-NOT-CHECK when the cited line is past EOF", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** See `tools/sample.mjs:99`",
    "  (`whatever`) directly.",
  ].join("\n");
  const findings = lintCitations(doc, CIT_STUB);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].verdict, "COULD-NOT-CHECK");
  assert.match(findings[0].detail, /past EOF/);
});

test("citation lane: BARE form resolves against the nearest preceding full citation", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** First `tools/sample.mjs:2`",
    "  (`const cid = 1;`) fixes it, and `:5`",
    "  (`if (x) continue;`) tests it.",
  ].join("\n");
  const findings = lintCitations(doc, CIT_STUB);
  assert.equal(findings.length, 2);
  assert.equal(findings[1].file, "tools/sample.mjs");
  assert.equal(findings[1].citedLine, 5);
  assert.equal(findings[1].verdict, "MATCH");
});

test("citation lane: a BARE form with no preceding path citation is COULD-NOT-CHECK", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** Only a bare `:5`",
    "  (`whatever`) here, nothing full before it.",
  ].join("\n");
  const findings = lintCitations(doc, CIT_STUB);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].verdict, "COULD-NOT-CHECK");
});

test("citation lane: scoped to `## Open` — a `## Done` citation is invisible", () => {
  const doc = [
    "## Open", "",
    "- **READY — unrelated.** Nothing here.",
    "",
    "## Done", "",
    "- **RESOLVED — a thing.** See `tools/sample.mjs:1`",
    "  (`this drifted but must not be seen`) directly.",
  ].join("\n");
  assert.deepEqual(lintCitations(doc, CIT_STUB), []);
});

test("citation lane: a nearby but non-adjacent backtick span is not mistaken for the anchor", () => {
  // The false-fire this lane's anchor rule was tightened against on the
  // first dry run against the real corpus: a second citation's own label a
  // few words later must not be read as the first citation's quoted line.
  const doc = [
    "## Open", "",
    "- **READY — a thing.** `helperName()` (`tools/sample.mjs:1`) and",
    "  `otherName()` (`tools/sample.mjs:3`) both matter.",
  ].join("\n");
  const findings = lintCitations(doc, CIT_STUB);
  assert.equal(findings.length, 2);
  for (const f of findings) assert.equal(f.verdict, "COULD-NOT-CHECK");
});

test("citation lane: red-first against the pre-correction BACKLOG.md, green against the corrected text", () => {
  const historical = gitShow(PRE_CITATION_FIX_REF, "BACKLOG.md");
  const red = lintCitations(historical).filter(
    (f) => f.file === "tools/bust-triage.mjs" && (f.citedLine === 749 || f.citedLine === 760),
  );
  console.log(
    "citation red-first findings:\n" +
      red.map((f) => `cited=${f.citedLine} verdict=${f.verdict} newLine=${f.newLine}`).join("\n"),
  );
  assert.equal(red.length, 2, "both stale citations must be checked");
  for (const f of red) assert.equal(f.verdict, "DRIFTED");
  const byCited = Object.fromEntries(red.map((f) => [f.citedLine, f.newLine]));
  assert.equal(byCited[749], 754, "the cid-assignment site now lives at :754");
  assert.equal(byCited[760], 765, "the cid-comparison site now lives at :765");

  // Filtered to the `capturePairResult` entry itself: the citation-lint
  // entry (below it) ALSO mentions `:754`/`:765` in prose narrating this
  // very correction, with no adjacent anchor — correctly COULD-NOT-CHECK,
  // not a second MATCH, and not what this control is pinning.
  const current = readFileSync(join(REPO, "BACKLOG.md"), "utf8");
  const green = lintCitations(current).filter(
    (f) =>
      f.file === "tools/bust-triage.mjs" &&
      (f.citedLine === 754 || f.citedLine === 765) &&
      /capturePairResult.*conversation identity/.test(f.entry),
  );
  assert.equal(green.length, 2, "the corrected citations must still be checked");
  for (const f of green) assert.equal(f.verdict, "MATCH");
});

test("citation lane: a citation at a line that never moved is MATCH, not a false DRIFTED", () => {
  const doc = [
    "## Open", "",
    "- **READY — control.** `tools/sample.mjs:2`",
    "  (`const cid = 1;`) never moved.",
  ].join("\n");
  const findings = lintCitations(doc, CIT_STUB);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].verdict, "MATCH");
});

// --- Section 5: the row-status lane -----------------------------------------
//
// Definitions from BACKLOG.md, "the succession rule's computable slice: an
// entry that": a sentence citing `row N` alongside one of
// OPEN/RE-OPENED/CLOSED/MITIGATED/OBSERVED/ACCEPTED (outside a NOT-negation)
// is checked against `matrixRow(n).kind`, read live via `statusKind` —
// never a second hardcoded vocabulary. `docs/directives/robustness-threat-
// matrix.md` at HEAD is real, committed data (row 4 currently reads
// "OPEN — RE-OPENED 2026-07-31"); an exhaustive search of BACKLOG.md's full
// history (`git log -p --all -- BACKLOG.md`, every "row 4" occurrence
// checked for a nearby status word) found no historical entry literally
// asserting "row 4 CLOSED" before the 2026-07-31 re-open, so the RED case
// below pairs a constructed sentence (mirroring this corpus's real phrasing)
// against the real, current matrix file rather than a historical BACKLOG.md
// snapshot — named here rather than silently substituted.

test("row-status lane: fires when the asserted status disagrees with the live matrix (row 4, real matrix data)", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** Row 4 is CLOSED, so this can proceed.",
  ].join("\n");
  const findings = lintRowStatus(doc, MATRIX_PATH);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].row, 4);
  assert.equal(findings[0].asserted, "CLOSED");
  assert.equal(findings[0].actualKind, "OPEN");
});

test("row-status lane: control — an assertion matching the live matrix stays silent", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** Row 4 is OPEN, matching the matrix.",
  ].join("\n");
  assert.deepEqual(lintRowStatus(doc, MATRIX_PATH), []);
});

test("row-status lane: control — a row citation with no status word stays silent", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** See row 4 for the mechanism.",
  ].join("\n");
  assert.deepEqual(lintRowStatus(doc, MATRIX_PATH), []);
});

test("row-status lane: a NOT-negated status word does not count as the claim", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** ROW 4 IS NOT CLOSED, on this instance.",
  ].join("\n");
  assert.deepEqual(lintRowStatus(doc, MATRIX_PATH), []);
});

test("row-status lane: bust-triage's own KNOWN-OPEN verdict word is not read as a row OPEN claim", () => {
  // Regression pin for the false fire the first dry run against the real
  // corpus produced: "the entry becomes KNOWN-OPEN" is bust-triage's own
  // VERDICT_BY_KIND vocabulary (a compound term), never a claim that the
  // cited row is OPEN.
  const doc = [
    "## Open", "",
    "- **READY — a thing.** If this holds, this event is row 1 economics and",
    "  the entry becomes KNOWN-OPEN, not a new class.",
  ].join("\n");
  assert.deepEqual(lintRowStatus(doc, MATRIX_PATH), []);
});

test("row-status lane: scoped to `## Open`", () => {
  const doc = [
    "## Open", "",
    "- **READY — unrelated.** Nothing here.",
    "",
    "## Done", "",
    "- **RESOLVED — a thing.** Row 4 is CLOSED here too.",
  ].join("\n");
  assert.deepEqual(lintRowStatus(doc, MATRIX_PATH), []);
});

// --- Quoted-mention exemption: the real motivating instance, frozen -------
//
// Definitions from BACKLOG.md, "`lintRowStatus` fires on prose that
// DESCRIBES a status assertion": a `row N` citation or a status word sitting
// inside a quoted span (backtick OR double-quote — this corpus uses both)
// is a CITATION, not a claim, mirroring `lintCorrectionPlacement`'s existing
// backtick-only exemption but widened to the quoting form the real instance
// actually used.
//
// Real instance, found live 2026-08-10 at `90576cf` (the dispatcher's push
// gate): an entry titled `MERGED into "kill the relocation-induced
// conversation-key rotation (threat matrix row 26)"` sits in the same
// SENTENCE (by this file's own sentence splitter — no `[.!?]\s+` boundary
// falls between them) as unrelated prose reading "a CLOSED grade
// vocabulary" a few lines later. The row-26 citation is inside the
// DOUBLE-QUOTED title, not asserting anything about row 26's live status.
const ROW26_MERGE_REF = "90576cf";

test("row-status lane: RED-FIRST — row 26's quoted title citation, real instance at 90576cf, against the OLD (pre-exemption) rule", () => {
  const historical = gitShow(ROW26_MERGE_REF, "BACKLOG.md");
  // Reproduce the OLD rule directly (no quoted-span exemption at all) to
  // prove the red is not vacuous: same ROW_CITATION/ROW_STATUS_WORD/
  // sentence-split shape as the fixed lane, minus the exemption this entry
  // adds. If this stays green, the exemption is not what silences the fire.
  const ROW_CITATION_OLD = /\brow\s+(\d+)\b/gi;
  const ROW_STATUS_WORD_OLD = /(?<!NOT\s)(?<!KNOWN-)\b(RE-OPENED|OPEN|CLOSED|MITIGATED|OBSERVED|ACCEPTED)\b/g;
  const SENTENCE_SPLIT_OLD = /(?<=[.!?])\s+(?=[A-Z0-9*`(])/;
  const openStart = historical.match(/^## Open\b.*$/m);
  assert.ok(openStart, "the frozen fixture must carry a '## Open' heading");
  const afterOpen = historical.slice(openStart.index + openStart[0].length);
  const section = afterOpen.split(/\n## /)[0];
  const entries = splitEntries(section);
  const target = entries.find((e) => /MERGED into .kill the relocation-induced/.test(e.header));
  assert.ok(target, "the row-26 merge entry must exist in the frozen fixture");
  let oldFired = false;
  for (const sentence of target.body.split(SENTENCE_SPLIT_OLD)) {
    ROW_CITATION_OLD.lastIndex = 0;
    const rowHit = ROW_CITATION_OLD.exec(sentence);
    if (!rowHit) continue;
    ROW_STATUS_WORD_OLD.lastIndex = 0;
    const wordHit = ROW_STATUS_WORD_OLD.exec(sentence);
    if (wordHit) oldFired = true;
  }
  assert.equal(oldFired, true, "RED baseline: the old rule (no quoted-span exemption) must fire on this real entry");
});

test("row-status lane: GREEN — the fixed lane is silent on the same real entry at 90576cf", () => {
  const historical = gitShow(ROW26_MERGE_REF, "BACKLOG.md");
  const findings = lintRowStatus(historical, MATRIX_PATH);
  const hit = findings.find((f) => f.row === 26 && /MERGED into/.test(f.entry));
  assert.equal(hit, undefined, "the quoted row-26 title citation must not read as a live claim");
});

test("row-status lane: zero false fires on the real current BACKLOG.md", () => {
  const current = readFileSync(join(REPO, "BACKLOG.md"), "utf8");
  const findings = lintRowStatus(current, MATRIX_PATH);
  console.log(
    "row-status findings on current BACKLOG.md:\n" +
      findings.map((f) => `line=${f.line} row=${f.row} asserted=${f.asserted} actualKind=${f.actualKind}`).join("\n"),
  );
  assert.deepEqual(findings, []);
});

// --- Section 6: the premise-true-but-work-remaining lane --------------------
//
// Definitions from BACKLOG.md, "a derivation asks whether an entry's
// PREMISE is true and never": a READY entry whose body carries a
// backtick-quoted commit-shaped hex token near a SHIPPED/CLOSED/DONE word,
// INSIDE a sentence-initial bold run (a claim about the entry itself, this
// repo's own convention — the same structural tell the header lane's
// SUB-CLAIM SCOPE already uses), is flagged for a human read — never
// auto-re-graded.
//
// The lane originally shipped a second signal ("split into/out" phrase),
// REMOVED (operator decision) after the first dry run against the real
// corpus found it false-fired 5/5: the phrase reads as entry LINEAGE in
// this backlog ("split out FROM the entry above") far more often than "my
// own remainder is done", and no threshold separates the two. Only the
// shipped-commit signal ships.
//
// The real motivating case is the `tools/coverage-walk.mjs` graduation
// entry, frozen at `633256b`: STILL-TRUE (every fact holds) and entirely
// done, its own body stating "**PARTLY SHIPPED 2026-08-08 — `7827c4e`...**"
// as a sentence-initial bold claim, yet still graded READY.
//
// This repo's OWN entry proposing the check (the one these tests exercise)
// narrates that same positive in PLAIN PROSE — "parts (1) and (2) shipped
// (`7827c4e`, `b94d118`)", no bold — which is what the sentence-initial-bold
// requirement excludes; the exclusion is exercised directly below rather
// than trusted by inspection.

test("premise-true lane: fires on the real coverage-walk entry (frozen at 633256b)", () => {
  const historical = gitShow(RETIREMENT_PASS_REF, "BACKLOG.md");
  const findings = lintPremiseTrue(historical);
  const hit = findings.find((f) => /graduate the coverage walk/.test(f.header));
  console.log("premise-true finding on the frozen positive: " + (hit ? JSON.stringify(hit) : "NONE"));
  assert.ok(hit, "the coverage-walk entry must be flagged");
  assert.deepEqual(hit.signals, ["shipped-commit:7827c4e"]);
});

test("premise-true lane: control — an entry with no shipped-commit signal stays silent", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing still fully open.** Depends on work that landed",
    "  elsewhere; nothing here claims this entry's own remainder is done.",
  ].join("\n");
  assert.deepEqual(lintPremiseTrue(doc), []);
});

test("premise-true lane: fires on a shipped-commit citation in a sentence-initial bold claim, from the definition", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** Grounding text opens the entry, closing the",
    "  header's own bold run right here.",
    "  **PARTLY SHIPPED 2026-08-08 — `7827c4e`, the rest remains.**",
  ].join("\n");
  const findings = lintPremiseTrue(doc);
  assert.equal(findings.length, 1);
  assert.deepEqual(findings[0].signals, ["shipped-commit:7827c4e"]);
});

test("premise-true lane: a shipped-commit citation in plain (non-bold) prose describing what the body says does NOT fire — the real self-match this exclusion was built for", () => {
  // The shape of this repo's own proposing entry: narrating, in plain
  // prose, what ANOTHER entry's body states — not a bold claim about THIS
  // entry. Same two facts (word "shipped", a commit hash) as the true
  // positive above, deliberately, to pin the discriminator rather than the
  // topic.
  const doc = [
    "## Open", "",
    "- **READY — a thing about a DIFFERENT entry.** Its own body says parts",
    "  (1) and (2) shipped (`7827c4e`, `b94d118`) and the rest was handled",
    "  elsewhere — quoted here only as the record of what happened there.",
  ].join("\n");
  assert.deepEqual(lintPremiseTrue(doc), []);
});

test("premise-true lane: the exclusion is verified against this repo's own current entry, not assumed", () => {
  // Direct proof that the self-match the operator flagged (BACKLOG.md line
  // ~5653 as of this writing — a line number that rots, so this test never
  // asserts one) is gone: the whole current file produces zero findings for
  // an entry whose header matches this check's own proposing text.
  const current = readFileSync(join(REPO, "BACKLOG.md"), "utf8");
  const findings = lintPremiseTrue(current);
  const selfHit = findings.find((f) => /PREMISE is true and never/.test(f.header));
  assert.equal(selfHit, undefined, "the check's own proposing entry must not flag itself");
});

test("premise-true lane: a shipped-commit citation inside the entry's OWN header bold run does not count as a later sub-claim", () => {
  // isSentenceInitialBoldContext excludes the header's own bold span by
  // design (the header lane's existing rule, reused here) — named so a
  // future reader does not mistake the absence for an oversight.
  const doc = [
    "## Open", "",
    "- **READY — a thing already SHIPPED in `7827c4e`, one part remains.**",
  ].join("\n");
  assert.deepEqual(lintPremiseTrue(doc), []);
});

test("premise-true lane: scoped to READY headers only", () => {
  const doc = [
    "## Open", "",
    "- **PARKED — a thing.** **SHIPPED 2026-01-01 — `7827c4e`, done.** Not READY.",
  ].join("\n");
  assert.deepEqual(lintPremiseTrue(doc), []);
});

// --- Section 7: the late-correction-placement lane --------------------------
//
// Definitions from BACKLOG.md, "a correction APPENDED to the end of an
// entry is invisible to": the FIRST correction marker (PREMISE CORRECTED /
// RE-GRADED / CORRECTED / WITHDRAWN) in an entry, outside inline backticks,
// is flagged if it sits past the first third of the entry's own length. The
// real motivating case (frozen at `633256b`) is the "both event runbooks
// open on a tool measured unreliable" entry, whose correction sits at line
// 29 of 36 (~80% in); the same snapshot also carries a genuine EARLY
// correction (a DONE entry whose "CORRECTED ON EXECUTION" sits inside its
// own header, ~line 2 of 13) that must NOT flag.

test("correction-placement lane: fires on the real runbook-caveat entry (frozen at 633256b, correction well past the first third)", () => {
  const historical = gitShow(RETIREMENT_PASS_REF, "BACKLOG.md");
  const findings = lintCorrectionPlacement(historical);
  const hit = findings.find((f) => /event runbooks open on a tool/.test(f.header));
  console.log("correction-placement finding on the frozen positive: " + (hit ? JSON.stringify(hit) : "NONE"));
  assert.ok(hit, "the runbook-caveat entry must be flagged");
  assert.ok(hit.position > 33, "the correction must be past the first third");
});

test("correction-placement lane: control — a real EARLY correction in the same snapshot stays silent", () => {
  const historical = gitShow(RETIREMENT_PASS_REF, "BACKLOG.md");
  const findings = lintCorrectionPlacement(historical);
  const falsePositive = findings.find((f) => /bust-appears\.md.*checks the tool's conversation/.test(f.header));
  assert.equal(falsePositive, undefined, "an early correction must not flag");
});

test("correction-placement lane: control — a marker inside inline backticks is a citation, not a claim (this repo's own proposing entry)", () => {
  // This repo's own entry proposing this check quotes `PREMISE CORRECTED`
  // as a literal string, twice, and must not flag on itself.
  const current = readFileSync(join(REPO, "BACKLOG.md"), "utf8");
  const findings = lintCorrectionPlacement(current);
  const selfHit = findings.find((f) => /correction APPENDED to the end/.test(f.header));
  assert.equal(selfHit, undefined, "a backtick-quoted marker must not self-fire");
});

test("correction-placement lane: fires on a synthetic late correction from the definition", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** " + "filler ".repeat(30),
    "  **CORRECTED 2026-01-01, late in the entry.**",
  ].join("\n");
  const findings = lintCorrectionPlacement(doc);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].marker, "CORRECTED");
});

test("correction-placement lane: an early correction (right after the header) stays silent", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing. CORRECTED 2026-01-01 right away.**",
    "  " + "filler ".repeat(30),
  ].join("\n");
  assert.deepEqual(lintCorrectionPlacement(doc), []);
});

test("correction-placement lane: scoped to `## Open`", () => {
  const doc = [
    "## Open", "",
    "- **READY — unrelated.** Nothing here.",
    "",
    "## Done", "",
    "- **RESOLVED — a thing.** " + "filler ".repeat(30),
    "  **CORRECTED 2026-01-01, late, but out of scope.**",
  ].join("\n");
  assert.deepEqual(lintCorrectionPlacement(doc), []);
});

// --- Section 8: the READY-bar lane (--ready-bar) ----------------------------
//
// Definitions this section is written FROM: the repo is declaring a THIRD
// backlog grade. After the dispatcher's Phase 2 edit, `- **READY` means "the
// scheduled head" and every entry that keeps the grade must carry three
// markers, each starting a line (leading whitespace tolerated): `Anchor:`,
// `Write-set:`, `Verifier:`. A marker's ABSENCE (MISSING-*) and a marker
// PRESENT but unusable (ANCHOR-UNRESOLVED / WRITE-SET-DEAD / VERIFIER-EMPTY)
// are different findings — a reader fixing "no anchor at all" needs a
// different action than one fixing "anchor present but wrong". Only READY
// headers are in scope; any other grade is invisible to this lane.
//
// Resolvers are stubbed (never hit this machine's filesystem) so these pin
// the RULE, not this repo's current directory layout, and so one named
// condition can be mutated at a time.

const READY_BAR_STUB = {
  pathExists: (p) => p === "tools/alive.mjs",
  // Models "tools/" as an existing directory and nothing else — a token
  // under it may itself be a not-yet-existing file (the legitimate case)
  // without WRITE-SET-DEAD firing, since only the PARENT is checked.
  dirExists: (p) => dirname(p) === "tools",
};

// The single well-formed baseline entry — the shared NEGATIVE control for
// all six READY-bar labels at once: if any of the six conditions fired here,
// this assertion (zero findings) would catch it. Each label also gets its
// own isolated POSITIVE fixture below, with the other two markers left
// well-formed so exactly one condition can be wrong at a time (the
// `.some()`-needs-exactly-one-candidate discipline, aimed at Write-set's
// per-token loop but applied here to the whole three-marker check).
function readyBarBaselineDoc(bodyExtra = "") {
  return [
    "## Open", "",
    "- **READY — a thing.** Body text." + bodyExtra,
    "  Anchor: row 4",
    "  Write-set: tools/alive.mjs",
    "  Verifier: npm test",
  ].join("\n");
}

test("READY-bar: the well-formed baseline entry has zero findings (shared negative control)", () => {
  assert.deepEqual(lint.lintReadyBar(readyBarBaselineDoc(), READY_BAR_STUB), []);
});

test("READY-bar: MISSING-ANCHOR fires when the Anchor: line is absent", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** Body text.",
    "  Write-set: tools/alive.mjs",
    "  Verifier: npm test",
  ].join("\n");
  const findings = lint.lintReadyBar(doc, READY_BAR_STUB);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].label, "MISSING-ANCHOR");
});

test("READY-bar: MISSING-WRITE-SET fires when the Write-set: line is absent", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** Body text.",
    "  Anchor: row 4",
    "  Verifier: npm test",
  ].join("\n");
  const findings = lint.lintReadyBar(doc, READY_BAR_STUB);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].label, "MISSING-WRITE-SET");
});

test("READY-bar: MISSING-VERIFIER fires when the Verifier: line is absent", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** Body text.",
    "  Anchor: row 4",
    "  Write-set: tools/alive.mjs",
  ].join("\n");
  const findings = lint.lintReadyBar(doc, READY_BAR_STUB);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].label, "MISSING-VERIFIER");
});

test("READY-bar: ANCHOR-UNRESOLVED fires on a row number outside 1..29", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** Body text.",
    "  Anchor: row 99",
    "  Write-set: tools/alive.mjs",
    "  Verifier: npm test",
  ].join("\n");
  const findings = lint.lintReadyBar(doc, READY_BAR_STUB);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].label, "ANCHOR-UNRESOLVED");
  assert.equal(findings[0].token, "row 99");
});

test("READY-bar: ANCHOR-UNRESOLVED fires on a repo-relative path that does not exist", () => {
  // The path resolution branch — a distinct code path from the row-range
  // branch above, so this bite must go red independently of that one.
  const doc = [
    "## Open", "",
    "- **READY — a thing.** Body text.",
    "  Anchor: tools/ghost.mjs",
    "  Write-set: tools/alive.mjs",
    "  Verifier: npm test",
  ].join("\n");
  const findings = lint.lintReadyBar(doc, READY_BAR_STUB);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].label, "ANCHOR-UNRESOLVED");
  assert.equal(findings[0].token, "tools/ghost.mjs");
});

test("READY-bar: WRITE-SET-DEAD fires when a listed path's PARENT directory does not exist", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** Body text.",
    "  Anchor: row 4",
    "  Write-set: ghost/newfile.mjs",
    "  Verifier: npm test",
  ].join("\n");
  const findings = lint.lintReadyBar(doc, READY_BAR_STUB);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].label, "WRITE-SET-DEAD");
  assert.equal(findings[0].token, "ghost/newfile.mjs");
});

test("READY-bar: NEGATIVE — a not-yet-existing file under an EXISTING directory does not fire WRITE-SET-DEAD", () => {
  // The legitimate case named in the brief: new files are the normal case
  // for a piece of work not yet started.
  const doc = [
    "## Open", "",
    "- **READY — a thing.** Body text.",
    "  Anchor: row 4",
    "  Write-set: tools/brand-new-file-that-does-not-exist-yet.mjs",
    "  Verifier: npm test",
  ].join("\n");
  assert.deepEqual(lint.lintReadyBar(doc, READY_BAR_STUB), []);
});

test("READY-bar: VERIFIER-EMPTY fires when the Verifier: line carries no command text", () => {
  const doc = [
    "## Open", "",
    "- **READY — a thing.** Body text.",
    "  Anchor: row 4",
    "  Write-set: tools/alive.mjs",
    "  Verifier:",
  ].join("\n");
  const findings = lint.lintReadyBar(doc, READY_BAR_STUB);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].label, "VERIFIER-EMPTY");
});

test("READY-bar: scoped to READY headers only — an OPEN entry with no markers stays silent", () => {
  const doc = [
    "## Open", "",
    "- **OPEN — a thing with no markers at all.** Body text.",
  ].join("\n");
  assert.deepEqual(lint.lintReadyBar(doc, READY_BAR_STUB), []);
});

test("READY-bar: scoped to `## Open` — a READY entry under `## Done` is invisible", () => {
  const doc = [
    "## Open", "",
    "- **OPEN — unrelated.** Nothing here.",
    "",
    "## Done", "",
    "- **READY — a thing with no markers, but out of scope.** Body text.",
  ].join("\n");
  assert.deepEqual(lint.lintReadyBar(doc, READY_BAR_STUB), []);
});

test("READY-bar: CLI --ready-bar leaves the existing lanes and exit code untouched", () => {
  const plain = runTool([join(REPO, "BACKLOG.md")]);
  const withFlag = runTool(["--ready-bar", join(REPO, "BACKLOG.md")]);
  assert.equal(plain.code, 0);
  assert.equal(withFlag.code, 0);
  assert.ok(!plain.out.includes("backlog-ready-bar"), "no READY-bar output without the flag");
  assert.match(withFlag.out, /backlog-ready-bar:/);
});

test("READY-bar: per-class counts are printed with zeros stated", () => {
  const { out } = runTool(
    ["--ready-bar", "-"],
    ["## Open", "", "- **OPEN — nothing to see.** Plain body, no READY entries."].join("\n"),
  );
  const line = out.split("\n").find((l) => l.startsWith("backlog-ready-bar:"));
  for (const label of lint.READY_BAR_LABELS) {
    assert.match(line, new RegExp(`${label}=0`), `${label} must be stated even at zero`);
  }
});

test("READY-bar: RED-FIRST against the real frozen ref (2bf1f21) — real READY entries with no markers yet", () => {
  const historical = gitShow(FROZEN_READY_BAR_REF, "BACKLOG.md");
  const findings = lint.lintReadyBar(historical);
  console.log(
    "2bf1f21 READY-bar sample finding: " +
      JSON.stringify(findings.find((f) => f.label === "MISSING-ANCHOR")),
  );
  // Every marker is a brand-new convention as of this dispatch, so every
  // READY entry in the frozen file is missing all three — the instrument-
  // positive this dispatch's accounting step rests on.
  assert.ok(findings.length > 0, "the frozen ref predates the marker convention entirely");
  const byLabel = { "MISSING-ANCHOR": 0, "MISSING-WRITE-SET": 0, "MISSING-VERIFIER": 0 };
  for (const f of findings) if (f.label in byLabel) byLabel[f.label]++;
  assert.ok(byLabel["MISSING-ANCHOR"] > 0);
  assert.ok(byLabel["MISSING-WRITE-SET"] > 0);
  assert.ok(byLabel["MISSING-VERIFIER"] > 0);
});
