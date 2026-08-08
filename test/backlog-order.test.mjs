// tools/backlog-order.mjs — the completed-entry rank guard, and its red-first
// proof. (The tool's first suite: it shipped with none.)
//
// The mechanism this pins, measured 2026-08-07. A dispatch was cut from the
// Tier B head of the '## Build order' block, whose numbered item read "the
// conservation gate has no declared-exemption clause for
// `identity-normalization`" — while the bullet that item anchors to had read
// `(DONE — f2ab6d0, 2026-08-07)` since that morning. The executing agent read
// the head, not the body, and the work had already shipped. Four of the
// block's thirty-three anchors were in that state.
//
// Neither existing guard could see it, and the reasons are structural rather
// than accidental. `backlog-order.mjs` asked WHETHER an anchor resolves (zero
// hits, two hits) and never WHAT it resolves to, so a DONE bullet still
// matched and stayed ranked. `backlog-lint.mjs` skips any entry whose header
// carries no live grade (its HEADER_GRADE: OPEN/READY/HOT) — which is exactly
// what a CORRECTLY re-graded DONE header does not carry, so the entry fell out
// of its population. Both printed clean over the defective file.
//
// Section 1 pins the RULE against synthetic entries, written from the
// definition rather than from the tool's behaviour: the grade is the marker
// word OPENING a bullet's header, and the marker vocabulary is the one
// `backlog-lint.mjs` already defines (DONE/RESOLVED/FIXED/BUILT). The negative
// cases carry the over-fire this scoping exists to avoid — a live entry whose
// BODY holds a line-initial DONE sub-step, which is a shape this corpus
// genuinely writes.
//
// Section 2 is the red-first mechanism proof, in the idiom of the sibling
// suite: the historical BACKLOG.md at a6e51ed — the commit BEFORE the anchors
// were removed — is read via `git show` at test time and must report four
// completed anchors; the current BACKLOG.md must report none. The historical
// prose is never pasted here, so this file stays clear of it for the
// public-repo absence scan, and the assertions are over COUNTS and GRADES
// rather than over entry text.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { readAnchors, splitOpen, reorder, resolvedGrade, describeMismatch } from "../tools/backlog-order.mjs";
import { tmpDirSync } from "../tools/tmpdir.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools/backlog-order.mjs");
// The state before the removals this guard forced. Immutable by construction —
// a ref, not a live file — so the arrangement stays re-runnable.
const PRE_REMOVAL_REF = "a6e51ed";

function gitShow(ref, path) {
  return execFileSync("git", ["show", `${ref}:${path}`], { cwd: REPO, encoding: "utf8" });
}

// Same idiom as the sibling backlog-lint suite: run the real CLI as a
// subprocess (main() calls process.exit, so it cannot be invoked in-process)
// and normalise the thrown-vs-clean exit into one shape.
function runTool(args) {
  try {
    const out = execFileSync(process.execPath, [TOOL, ...args], { encoding: "utf8" });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? -1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

// A fixture file under this process's own tmpdir.mjs run root — never the
// real BACKLOG.md, which the dispatcher owns and writes to concurrently.
function fixtureFile(text) {
  const dir = tmpDirSync("backlog-order-check-");
  const path = join(dir, "BACKLOG.md");
  writeFileSync(path, text);
  return path;
}

/** Count the completed-entry anchors the guard reports, or 0 when it stays green. */
function completedAnchors(text) {
  const anchors = readAnchors(text);
  const { bullets } = splitOpen(text);
  try {
    reorder(bullets, anchors);
    return { count: 0, message: "" };
  } catch (e) {
    const m = /^(\d+) rank anchor\(s\) resolve to a COMPLETED entry/.exec(e.message);
    if (!m) throw e; // a different error is not this guard's red — never fold it in
    return { count: Number(m[1]), message: e.message };
  }
}

const bullet = (header, ...body) => [header, ...body].join("\n");
const doc = (blockItems, openBullets) =>
  ["# t", "", "## Build order", "", ...blockItems, "", "## Open", "", ...openBullets, ""].join("\n");

// --- Section 1: the rule, against synthetic content -----------------------

test("resolvedGrade reads the marker that OPENS the header, in both bracket forms", () => {
  assert.equal(resolvedGrade("- **(DONE — abc1234, 2026-08-07)\n  body"), "DONE");
  assert.equal(resolvedGrade("- **DONE 2026-08-07 — the thing shipped.**"), "DONE");
  assert.equal(resolvedGrade("- **READY — the thing has not shipped.**"), null);
});

test("each of the four resolution markers on a ranked bullet is reported, by name", () => {
  for (const grade of ["DONE", "RESOLVED", "FIXED", "BUILT"]) {
    const d = doc(
      ['1. **item.**', '   <!-- entry: "the marker case" -->'],
      [bullet(`- **${grade} 2026-08-07 — the marker case shipped.**`, "  body line")],
    );
    const r = completedAnchors(d);
    assert.equal(r.count, 1, `${grade} must be reported`);
    assert.match(r.message, new RegExp(`${grade}: the marker case`),
      `the message must name the grade that fired, not just that something did`);
  }
});

test("the message names every completed anchor, not only the first", () => {
  const d = doc(
    ['1. **a.**', '   <!-- entry: "first shipped thing" -->',
     '2. **b.**', '   <!-- entry: "second shipped thing" -->'],
    [bullet("- **(DONE — abc1234, 2026-08-07)", "  first shipped thing.**"),
     bullet("- **(DONE — def5678, 2026-08-07)", "  second shipped thing.**")],
  );
  const r = completedAnchors(d);
  assert.equal(r.count, 2);
  assert.match(r.message, /first shipped thing/);
  assert.match(r.message, /second shipped thing/);
});

test("NEGATIVE: a live READY entry whose BODY holds a line-initial DONE sub-step does not fire", () => {
  // The over-fire the header-only scoping exists to avoid. `backlog-lint.mjs`
  // documents this exact shape ("ATTRIBUTE DONE <date>") as legitimate inside
  // an entry that is correctly still open, and a guard that fires on it trains
  // the override reflex that kills it.
  const d = doc(
    ['1. **item.**', '   <!-- entry: "the half-walked thing" -->'],
    [bullet("- **READY — the half-walked thing needs its second half.**",
            "  ATTRIBUTE DONE 2026-08-07 — the first half landed.",
            "  DONE 2026-08-07 — and so did this sub-step.")],
  );
  assert.equal(completedAnchors(d).count, 0);
});

test("NEGATIVE: a live entry whose body merely discusses resolution markers does not fire", () => {
  const d = doc(
    ['1. **item.**', '   <!-- entry: "the vocabulary thing" -->'],
    [bullet("- **READY (small) — the vocabulary thing.**",
            "  The markers are RESOLVED/FIXED/BUILT; this entry is none of them.")],
  );
  assert.equal(completedAnchors(d).count, 0);
});

test("NEGATIVE: an UNRANKED completed bullet is none of this guard's business", () => {
  // Completed entries live in the file forever; only a RANK on one is the defect.
  const d = doc(
    ['1. **item.**', '   <!-- entry: "the live thing" -->'],
    [bullet("- **READY — the live thing.**"),
     bullet("- **(DONE — abc1234, 2026-08-07)", "  some finished thing.**")],
  );
  assert.equal(completedAnchors(d).count, 0);
});

test("BITE — the guard is what fires: with it removed, the defective doc reorders clean", () => {
  // The mutation that creates the pre-fix behaviour, since the tool cannot be
  // reverted from inside its own suite: reorder's remaining checks (zero-hit,
  // multi-hit, two-anchors-one-bullet) all pass on this input, so a DONE-ranked
  // bullet sorts to the head exactly as it did before the clause existed.
  const d = doc(
    ['1. **item.**', '   <!-- entry: "the shipped thing" -->'],
    [bullet("- **READY — a live thing.**"),
     bullet("- **(DONE — abc1234, 2026-08-07)", "  the shipped thing.**")],
  );
  const anchors = readAnchors(d);
  const { bullets } = splitOpen(d);
  const unguarded = anchors.map((a) => bullets.find((b) => b.includes(a)));
  assert.equal(unguarded.length, 1);
  assert.equal(resolvedGrade(unguarded[0]), "DONE",
    "without the grade check, a completed bullet is a perfectly valid rank");
  assert.equal(completedAnchors(d).count, 1, "and with it, the same input is red");
});

// --- Section 2: red-first against real history, green against current -----

test("the pre-removal BACKLOG.md carries the four completed ranks this guard exists for", () => {
  const r = completedAnchors(gitShow(PRE_REMOVAL_REF, "BACKLOG.md"));
  assert.equal(r.count, 4, `${PRE_REMOVAL_REF} must report exactly the four measured anchors`);
  const grades = r.message.split("\n").slice(1).map((l) => l.trim().split(":")[0]);
  assert.deepEqual([...new Set(grades)], ["DONE"], "all four were DONE-graded");
});

test("the current BACKLOG.md reports none", () => {
  assert.equal(completedAnchors(readFileSync(join(REPO, "BACKLOG.md"), "utf8")).count, 0);
});

// --- Section 3: `--check`'s mismatch diagnostic ----------------------------
//
// Fired 2026-08-08 (BACKLOG.md entry "READY (small) — `backlog-order.mjs
// --check` reports a verdict with no diagnostic"): `--check` printed "file
// order does NOT match the derived order" and nothing else, so establishing
// WHICH bullet was misplaced and why cost a `git stash` / re-run / `git stash
// pop` against a copy other agents write to — even though `ordered` and
// `bullets` were both already in hand at the call site. `describeMismatch`
// is the unit-level rule; the CLI tests below exercise the actual `--check`
// output a reader sees, over fixtures in this process's own tmpdir.mjs run
// root (never the real BACKLOG.md, which the dispatcher owns).

test("describeMismatch: identical sequences report no mismatch", () => {
  const bullets = ["- **alpha.**", "- **beta.**", "- **gamma.**"];
  assert.equal(describeMismatch(bullets, bullets), null);
  assert.equal(describeMismatch(bullets, [...bullets]), null);
});

test("describeMismatch: names the first divergent index, what is found there, what is expected, and the total misplaced", () => {
  const bullets = ["- **alpha.**", "- **gamma.**", "- **beta.**", "- **unranked.**"];
  const ordered = ["- **alpha.**", "- **beta.**", "- **gamma.**", "- **unranked.**"];
  const r = describeMismatch(bullets, ordered);
  assert.deepEqual(r, { index: 1, found: "- **gamma.**", expected: "- **beta.**", misplacedCount: 2 });
});

test("describeMismatch: leading lines are truncated to a readable width", () => {
  const longFound = `- **${"x".repeat(120)}.**`;
  const longExpected = `- **${"y".repeat(120)}.**`;
  const bullets = [longFound, "- **unranked.**"];
  const ordered = [longExpected, "- **unranked.**"];
  const r = describeMismatch(bullets, ordered);
  assert.equal(r.found.length, 72);
  assert.equal(r.expected.length, 72);
  assert.equal(r.found, longFound.slice(0, 72));
  assert.equal(r.expected, longExpected.slice(0, 72));
});

test("BITE — CLI: a fixture with one bullet moved out of rank order names the misplaced bullets", () => {
  const d = doc(
    ['1. **first.**', '   <!-- entry: "the alpha entry" -->',
     '2. **second.**', '   <!-- entry: "the beta entry" -->',
     '3. **third.**', '   <!-- entry: "the gamma entry" -->'],
    // File order is alpha, GAMMA, BETA, unranked — beta and gamma swapped
    // relative to their anchor rank.
    [bullet("- **READY — the alpha entry, ranked first.**"),
     bullet("- **READY — the gamma entry, ranked third.**"),
     bullet("- **READY — the beta entry, ranked second.**"),
     bullet("- **READY — an unranked entry that trails behind.**")],
  );
  const { code, out } = runTool(["--check", "--file", fixtureFile(d)]);
  assert.equal(code, 1);
  assert.match(out, /file order does NOT match the derived order/);
  assert.match(out, /first divergent index: 1/);
  // What is FOUND at the divergent index is the gamma bullet (it sits where
  // beta belongs); what is EXPECTED there is the beta bullet.
  assert.match(out, /found:\s+"- \*\*READY — the gamma entry, ranked third\.\*\*"/);
  assert.match(out, /expected:\s+"- \*\*READY — the beta entry, ranked second\.\*\*"/);
  assert.match(out, /2 bullet\(s\) misplaced/);
});

test("OVER-FIRING CONTROL — CLI: a fixture already in derived order stays silent and exits 0", () => {
  const d = doc(
    ['1. **first.**', '   <!-- entry: "the alpha entry" -->',
     '2. **second.**', '   <!-- entry: "the beta entry" -->',
     '3. **third.**', '   <!-- entry: "the gamma entry" -->'],
    [bullet("- **READY — the alpha entry, ranked first.**"),
     bullet("- **READY — the beta entry, ranked second.**"),
     bullet("- **READY — the gamma entry, ranked third.**"),
     bullet("- **READY — an unranked entry that trails behind.**")],
  );
  const { code, out } = runTool(["--check", "--file", fixtureFile(d)]);
  assert.equal(code, 0);
  assert.match(out, /file order MATCHES the derived order/);
  // Without this, printing a diagnostic block unconditionally would be
  // indistinguishable from "always print something" — the over-firing shape
  // this control exists to catch.
  assert.doesNotMatch(out, /first divergent index/);
  assert.doesNotMatch(out, /misplaced/);
});
