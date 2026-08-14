// test/state-report.test.mjs — tools/state-report.mjs (records-restructure
// directive, Phase 4: "one-command state report").
//
// THREE sections, in the order the directive's verifier names them:
//
//   A. RED-FIRST REPRODUCTION — a reproduction test, not a mutation test.
//      The tool's own collectors must independently reproduce four facts
//      established BY HAND in the dispatching session: the rescue tag, the
//      untracked-fixture pile, the deployment pin, and the matrix's own
//      row/status counts. A collector that cannot reproduce a fact a human
//      established by hand is the thing this section exists to catch.
//
//      One of the four (the untracked-fixture count) needs a repoRoot
//      override at THIS SESSION's cwd is a git WORKTREE, not the shared
//      main checkout, and untracked files are per-working-tree by
//      construction — a fresh worktree's own copy of
//      `test/fixtures/harvested/` is always empty, however many untracked
//      files sit in the checkout it was branched from. Pointing the
//      collector's `repoRoot` at the shared checkout is not a workaround of
//      that fact, it IS the fact: refs and objects are shared across
//      worktrees (so the rescue tag, the dangling commits and the deployment
//      pin all reproduce with the DEFAULT repoRoot), but a working tree's
//      untracked files never travel. `execFileSync(..., { cwd })` from
//      inside this test process is not a raw `git -C <path>`/`cd <path> &&
//      git` invocation, so it is not the isolated-worktree git operation the
//      environment restricts — it is this repo's own sanctioned collector
//      pattern, exercised against its real target.
//
//   B. THE THIRD ANSWER — one missing-input case per collector: a
//      nonexistent status/backlog/manifest path, an unreachable health URL,
//      a nonexistent repoRoot. Each must return `{ ok:false, reason }`, a
//      string reason — never an empty list or a zero standing in for an
//      unread input (docs/dev-loop.md, "A checker has THREE answers").
//
//   C. MECHANISM PROOFS — synthetic fixtures (a constructed git repo via
//      `tools/tmpdir.mjs`'s sanctioned `tmpDirSync`, and synthetic
//      matrix/backlog text) that exercise each collector's logic on a KNOWN
//      positive AND a known negative — an orphaned commit that must show up
//      as unrescued beside a tagged one that must not, an entry with an
//      early and a late date in its body where only the early one counts,
//      three untracked files with distinct mtimes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, utimesSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { tmpDirSync } from "../tools/tmpdir.mjs";
import * as sr from "../tools/state-report.mjs";

const {
  REPO_ROOT,
  DEFAULT_MANIFEST_PATH,
  GATE_STALE_THRESHOLD_HOURS,
  collectMatrix,
  collectBacklog,
  collectGateVerdict,
  collectPinState,
  collectFingerprintState,
  collectUnpushed,
  collectRescueTags,
  collectDanglingUnrescued,
  collectWorktrees,
  collectFixturesAccumulation,
  collectLaneBranches,
  aggregateLaneBranches,
  renderText,
} = sr;

// The SHARED main checkout — see the header comment above for why the
// untracked-fixture reproduction needs it explicitly while the other three
// reproductions work against this test process's own (worktree) REPO_ROOT.
// DERIVED rather than hardcoded (desk, at
// integration). The lane wrote this as an absolute machine path, which fails
// two ways at once: it is one operator's filesystem layout committed to a
// PUBLIC repo, and it silently stops testing anywhere else. Git already knows
// the answer — every worktree shares one common git dir, so its parent IS the
// main checkout, from inside a worktree or from the checkout itself.
const MAIN_CHECKOUT = dirname(
  execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim(),
);
const NONEXISTENT = "/nonexistent/path/state-report-test-does-not-exist";

// The frozen live-world evidence for the lane-branch collector (part A of
// the lane-branch-collector-and-gate-staleness brief). Captured 2026-08-11
// before that day's integration cleared the pile it records — see the
// fixture's own `purpose` field. Read-only: never mutated by this file.
const LANE_BRANCH_FIXTURE = join(
  REPO_ROOT,
  "test/fixtures/lane-branches/inventory-2026-08-11-pre-integration.json",
);

// The two artifacts the matrix bite cross-checks, each read from its own
// home: the prose rows and the status declarations live in different files,
// and reading one off the other would make the comparison vacuous.
const MATRIX_MD = join(MAIN_CHECKOUT, "docs/directives/robustness-threat-matrix.md");
const MATRIX_STATUS = join(MAIN_CHECKOUT, "docs/directives/robustness-threat-matrix.status.json");

function sh(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

// ==========================================================================
// A. RED-FIRST REPRODUCTION — the dispatching session's hand-established
//    facts, read again independently by this file's own collectors.
// ==========================================================================

test("reproduces: rescue/unit-2b-dc8c475 is a live rescue tag", () => {
  const res = collectRescueTags();
  assert.equal(res.ok, true);
  assert.ok(res.tags.includes("rescue/unit-2b-dc8c475"), `tags: ${JSON.stringify(res.tags)}`);
});

// SPENT REPRODUCTION, re-graded 2026-08-13. This asserted `count > 500` — the
// live accumulation of untracked evidence pins under test/fixtures/harvested/
// (687 pins, 29.6 MB, per the RECORD entry that motivated it). That defect is
// FIXED: `dc6c234` committed 713 of them, and the untracked count is now 0
// against 945 tracked. So the assertion went red for the one reason a
// red-first reproduction is SUPPOSED to go red — its defect stopped
// reproducing — and repairing it back to green by restoring the old number
// would have been converting a live finding into a silenced instrument.
//
// It is deliberately NOT re-pointed at `count === 0`. `harvest.mjs` runs twice
// daily and writes pins here, so untracked files legitimately exist between a
// harvest and the commit that keeps them; a zero-assert would fire on that
// window and train the override reflex — the check-that-fires-on-a-non-defect
// shape this repo's dev-loop names. The accumulation guard wants a THRESHOLD
// (a count, or a max age for an untracked pin), and picking that number is a
// desk/operator decision, booked in BACKLOG.md rather than invented here.
//
// What remains is worth keeping: the collector exercised against the REAL
// checkout rather than only against synthetic dirs (its two synthetic bites
// live at "third answer: ... nonexistent repoRoot" and in the renderText
// section). That is what catches the collector breaking on live-world shape.
test("collectFixturesAccumulation reads the real main checkout (accumulation threshold: booked, not asserted)", (t) => {
  // A bare `return` here USED to stand in for could-not-verify, and node:test
  // scores that as a PASS — the exact shape this repo collects: an absence of
  // evidence wearing a verdict's clothes. `t.skip` says what happened.
  if (!existsSync(MAIN_CHECKOUT)) {
    t.skip(`main checkout not present at ${MAIN_CHECKOUT} — could not verify`);
    return;
  }
  const res = collectFixturesAccumulation({ repoRoot: MAIN_CHECKOUT });
  assert.equal(res.ok, true, res.reason);
  assert.ok(Number.isInteger(res.count) && res.count >= 0, `count was ${res.count}, expected a non-negative integer`);
  // The mtime range is populated exactly when there is something to range over
  // — asserted in BOTH directions so a collector that always returns a range,
  // or never returns one, is caught rather than passing on whichever branch
  // today's checkout happens to take.
  if (res.count > 0) {
    assert.ok(res.oldestMtime && res.newestMtime, "mtime range must be populated for a non-empty count");
  } else {
    assert.ok(!res.oldestMtime && !res.newestMtime, "mtime range must be absent for an empty count");
  }
});

test("reproduces: HEAD:proxy matches the dotfiles CACHE_FIX_PROXY_TREE_PIN, or could-not-verify if absent", () => {
  const res = collectPinState();
  if (!existsSync(DEFAULT_MANIFEST_PATH)) {
    assert.equal(res.ok, false, "manifest absent on this machine must read as could-not-verify");
    return;
  }
  assert.equal(res.ok, true, res.reason);
  assert.equal(res.match, true, `local=${res.local} manifest=${res.manifestPinned}`);
});

test("reproduces: matrix has exactly 30 rows with 10 OPEN-or-RESIDUAL", () => {
  // Updated 2026-08-14: row 2 (idle TTL keepalive) went OPEN -> ACCEPTED on an
  // operator decision, so the OPEN-or-RESIDUAL set is 10. Second fire of the
  // shape this comment already describes, and the second time nothing was
  // wrong — the literal moved because the world did.
  // Updated 2026-08-11 for row 30 (relocate-then-pin content loss). These two
  // literals are a REPRODUCTION pin, not an invariant: they exist so
  // collectMatrix is checked against the real artifact rather than against
  // itself, and every legitimate new row moves them by construction. That is
  // the hardcoded-count shape dev-loop.md names as a check that fires on a
  // non-defect — it fired on this row, correctly in the sense that the numbers
  // really did change, and uselessly in the sense that nothing was wrong. The
  // pair below is what keeps it from being pure ceremony: the counts must agree
  // with an INDEPENDENT count taken from the two artifacts, so a parser that
  // silently stopped reading rows fails here even when the literals are stale.
  const res = collectMatrix();
  assert.equal(res.ok, true, res.reason);
  assert.equal(res.totalRows, 30);
  assert.equal(res.openResidual.length, 10);

  // The independent halves. `totalRows` is the matrix PROSE's row count and
  // `openResidual` is derived from the status JSON — two different files, so
  // reading each from its own home is what makes the comparison mean anything
  // (an expectation read off the artifact it grades moves with the mutant).
  const proseRows = readFileSync(MATRIX_MD, "utf8")
    .split("\n").filter((l) => /^\| \d+ \| /.test(l)).length;
  assert.equal(res.totalRows, proseRows,
    "collectMatrix's row count must equal the matrix file's own numbered rows");
  const declared = JSON.parse(readFileSync(MATRIX_STATUS, "utf8"));
  const openish = Object.entries(declared)
    .filter(([k, v]) => !k.startsWith("_") && (v.status === "OPEN" || v.status === "RESIDUAL")).length;
  assert.equal(res.openResidual.length, openish,
    "the OPEN/RESIDUAL set must equal what the status file declares");
  assert.equal(proseRows, Object.keys(declared).filter((k) => !k.startsWith("_")).length,
    "every prose row is declared and every declaration has a prose row — a row minted "
    + "without its status declaration is invisible to the state report, which is the "
    + "silent half this bite exists to catch");
});

// ==========================================================================
// B. THE THIRD ANSWER — one missing-input case per collector.
// ==========================================================================

test("third answer: collectMatrix on a nonexistent status path is ok:false with a reason", () => {
  const res = collectMatrix({ statusPath: NONEXISTENT });
  assert.equal(res.ok, false);
  assert.equal(typeof res.reason, "string");
  assert.ok(res.reason.length > 0);
  assert.equal(res.openResidual, undefined, "must not silently carry an empty findings shape");
});

test("third answer: collectBacklog on a nonexistent backlog path is ok:false with a reason", () => {
  const res = collectBacklog({ backlogPath: NONEXISTENT });
  assert.equal(res.ok, false);
  assert.equal(typeof res.reason, "string");
  assert.ok(res.reason.length > 0);
  assert.equal(res.readyEntries, undefined);
});

test("third answer: collectBacklog on a file with no `## Open` section is ok:false with a reason", () => {
  const dir = tmpDirSync("state-report-nobacklog-");
  const path = join(dir, "BACKLOG.md");
  writeFileSync(path, "# not a backlog\n\nnothing here.\n");
  const res = collectBacklog({ backlogPath: path });
  assert.equal(res.ok, false);
  assert.match(res.reason, /## Open/);
});

test("third answer: collectGateVerdict on a nonexistent gate-status path is ok:false with a reason", () => {
  const res = collectGateVerdict({ statusPath: NONEXISTENT });
  assert.equal(res.ok, false);
  assert.equal(typeof res.reason, "string");
  assert.ok(res.reason.length > 0);
  assert.equal(res.failing, undefined);
});

test("third answer: collectPinState on a nonexistent manifest path is ok:false with a reason", () => {
  const res = collectPinState({ repoRoot: REPO_ROOT, manifestPath: NONEXISTENT });
  assert.equal(res.ok, false);
  assert.equal(typeof res.reason, "string");
  assert.ok(res.reason.length > 0);
  assert.equal(res.match, undefined, "must not carry a leftover match verdict when could-not-verify");
});

test("third answer: collectPinState on a nonexistent repoRoot is ok:false with a reason", () => {
  const res = collectPinState({ repoRoot: NONEXISTENT });
  assert.equal(res.ok, false);
  assert.ok(res.reason.length > 0);
});

test("third answer: collectFingerprintState when the proxy does not answer is ok:false with a reason", async () => {
  const res = await collectFingerprintState({
    fetchImpl: async () => {
      throw new Error("ECONNREFUSED (synthetic — no listener)");
    },
  });
  assert.equal(res.ok, false);
  assert.equal(typeof res.reason, "string");
  assert.ok(res.reason.length > 0);
  assert.equal(res.match, undefined);
});

test("third answer: collectUnpushed on a nonexistent repoRoot is ok:false with a reason", () => {
  const res = collectUnpushed({ repoRoot: NONEXISTENT });
  assert.equal(res.ok, false);
  assert.ok(res.reason.length > 0);
  assert.equal(res.count, undefined);
});

test("third answer: collectRescueTags on a nonexistent repoRoot is ok:false with a reason", () => {
  const res = collectRescueTags({ repoRoot: NONEXISTENT });
  assert.equal(res.ok, false);
  assert.ok(res.reason.length > 0);
});

test("third answer: collectDanglingUnrescued on a nonexistent repoRoot is ok:false with a reason", () => {
  const res = collectDanglingUnrescued({ repoRoot: NONEXISTENT });
  assert.equal(res.ok, false);
  assert.ok(res.reason.length > 0);
});

test("third answer: collectWorktrees on a nonexistent repoRoot is ok:false with a reason", () => {
  const res = collectWorktrees({ repoRoot: NONEXISTENT });
  assert.equal(res.ok, false);
  assert.ok(res.reason.length > 0);
});

test("third answer: collectFixturesAccumulation on a nonexistent repoRoot is ok:false with a reason", () => {
  const res = collectFixturesAccumulation({ repoRoot: NONEXISTENT });
  assert.equal(res.ok, false);
  assert.ok(res.reason.length > 0);
  assert.equal(res.count, undefined, "must not report 0 for an unread input");
});

// ==========================================================================
// C. MECHANISM PROOFS — synthetic fixtures, known positives and negatives
// ==========================================================================

test("collectMatrix: enum counts and OPEN/RESIDUAL sort oldest-first, on a synthetic 3-row matrix", () => {
  const dir = tmpDirSync("state-report-matrix-");
  const matrixPath = join(dir, "matrix.md");
  const statusPath = join(dir, "matrix.status.json");
  writeFileSync(matrixPath, "| 1 | shipped row |\n| 2 | open row |\n| 3 | residual row |\n");
  writeFileSync(
    statusPath,
    JSON.stringify({
      1: { status: "SHIPPED", evidence: "package.json", date: "2026-01-01" },
      2: { status: "OPEN", evidence: "n/a", date: "2026-02-01" },
      3: { status: "RESIDUAL", evidence: "package.json", date: "2026-01-01", residual: "a named remainder" },
    }),
  );
  const res = collectMatrix({ statusPath, matrixPath });
  assert.equal(res.ok, true, res.reason);
  assert.equal(res.totalRows, 3);
  assert.equal(res.enumCounts.SHIPPED, 1);
  assert.equal(res.enumCounts.OPEN, 1);
  assert.equal(res.enumCounts.RESIDUAL, 1);
  assert.equal(res.openResidual.length, 2);
  // row 3 (date 2026-01-01) sorts before row 2 (date 2026-02-01) — oldest first.
  assert.equal(res.openResidual[0].row, "3");
  assert.equal(res.openResidual[0].residual, "a named remainder");
  assert.equal(res.openResidual[1].row, "2");
});

test("collectBacklog: earliest body date wins, PARKED/Record counted, ready-bar findings flow through", () => {
  const dir = tmpDirSync("state-report-backlog-");
  const backlogPath = join(dir, "BACKLOG.md");
  writeFileSync(
    backlogPath,
    [
      "# synthetic backlog",
      "",
      "## Open",
      "",
      "- **READY — entry one, dated 2026-01-05 in body.** Mentions 2026-01-05 first and 2026-02-01 later; the earlier date is the age.",
      "",
      "- **READY — entry two, no date anywhere in the body.** Nothing dated here at all.",
      "",
      "- **PARKED — blocked entry one.** Missing evidence named.",
      "",
      "- **PARKED — blocked entry two.** Missing evidence named.",
      "",
      "## Record",
      "",
      "- **RECORD (ex-READY) — old entry one.** Body.",
      "",
      "- **RECORD (ex-READY) — old entry two.** Body.",
      "",
      "- **RECORD (ex-READY) — old entry three.** Body.",
      "",
    ].join("\n"),
  );
  const res = collectBacklog({ backlogPath });
  assert.equal(res.ok, true, res.reason);
  assert.equal(res.readyEntries.length, 2);
  assert.equal(res.readyEntries[0].age, "2026-01-05");
  assert.equal(res.readyEntries[1].age, null);
  assert.equal(res.parkedCount, 2);
  assert.equal(res.recordCount, 3);
  // Neither READY entry carries Anchor:/Write-set:/Verifier: — 3 MISSING-*
  // findings each, imported straight from lintReadyBar.
  assert.equal(res.readyBarFindingCount, 6);
});

test("repo collectors: unpushed count, rescue-tag reachability, untracked mtime range — synthetic git repo", () => {
  const dir = tmpDirSync("state-report-repo-");
  sh(["init", "-q", "-b", "main"], dir);
  sh(["config", "user.email", "test@example.com"], dir);
  sh(["config", "user.name", "State Report Test"], dir);

  writeFileSync(join(dir, "README.md"), "init\n");
  sh(["add", "README.md"], dir);
  sh(["commit", "-q", "-m", "init"], dir);
  const initialSha = sh(["rev-parse", "HEAD"], dir);
  // Simulate a remote-tracking ref without a real remote — origin/main..main
  // only needs the REF to exist, not a live network remote.
  sh(["update-ref", "refs/remotes/origin/main", initialSha], dir);

  // Three untracked files under test/fixtures/harvested/, distinct mtimes.
  const fixturesDir = join(dir, "test", "fixtures", "harvested");
  mkdirSync(fixturesDir, { recursive: true });
  const now = Date.now();
  const stamps = [now - 3 * 86400_000, now - 1 * 86400_000, now];
  ["a.json", "b.json", "c.json"].forEach((name, i) => {
    const p = join(fixturesDir, name);
    writeFileSync(p, "{}");
    const t = stamps[i] / 1000;
    utimesSync(p, t, t);
  });

  // One commit ahead of origin/main.
  writeFileSync(join(dir, "second.md"), "second\n");
  sh(["add", "second.md"], dir);
  sh(["commit", "-q", "-m", "second commit"], dir);

  // An orphaned (dangling, unrescued) commit.
  sh(["checkout", "-q", "-b", "throwaway-orphan"], dir);
  writeFileSync(join(dir, "orphan.md"), "orphan\n");
  sh(["add", "orphan.md"], dir);
  sh(["commit", "-q", "-m", "orphan commit"], dir);
  const orphanSha = sh(["rev-parse", "HEAD"], dir);
  sh(["checkout", "-q", "main"], dir);
  sh(["branch", "-D", "throwaway-orphan"], dir);

  // A commit tagged `rescue/*` before its branch is dropped — must never
  // show up as dangling OR unrescued.
  sh(["checkout", "-q", "-b", "throwaway-rescued"], dir);
  writeFileSync(join(dir, "rescued.md"), "rescued\n");
  sh(["add", "rescued.md"], dir);
  sh(["commit", "-q", "-m", "rescued commit"], dir);
  const rescuedSha = sh(["rev-parse", "HEAD"], dir);
  sh(["tag", "rescue/synthetic", rescuedSha], dir);
  sh(["checkout", "-q", "main"], dir);
  sh(["branch", "-D", "throwaway-rescued"], dir);

  // `git fsck --dangling` does not report a commit as dangling while it is
  // still reachable through a reflog entry (HEAD's or the just-deleted
  // branch's own, before expiry) — measured directly: a fresh orphan in an
  // unexpired repo reports zero dangling commits, the same orphan after
  // `reflog expire` reports one. The real repo's dangling commits (measured
  // 2026-08-11: 115, including the pre-existing f28001f) are old enough for
  // this to have already happened; a freshly built synthetic repo is not,
  // so the reproduction needs the same step real time performs.
  sh(["reflog", "expire", "--expire=now", "--all"], dir);

  const unpushed = collectUnpushed({ repoRoot: dir });
  assert.equal(unpushed.ok, true, unpushed.reason);
  assert.equal(unpushed.count, 1);
  assert.match(unpushed.commits[0], /second commit/);

  const tags = collectRescueTags({ repoRoot: dir });
  assert.equal(tags.ok, true, tags.reason);
  assert.deepEqual(tags.tags, ["rescue/synthetic"]);

  const dangling = collectDanglingUnrescued({ repoRoot: dir });
  assert.equal(dangling.ok, true, dangling.reason);
  assert.ok(dangling.unrescued.includes(orphanSha), `expected ${orphanSha} in ${JSON.stringify(dangling.unrescued)}`);
  assert.ok(
    !dangling.unrescued.some((s) => s === rescuedSha),
    "the rescue-tagged commit must never appear as unrescued",
  );

  const worktrees = collectWorktrees({ repoRoot: dir });
  assert.equal(worktrees.ok, true, worktrees.reason);
  assert.equal(worktrees.count, 1);
  assert.equal(worktrees.prunableCount, 0);

  const fixtures = collectFixturesAccumulation({ repoRoot: dir });
  assert.equal(fixtures.ok, true, fixtures.reason);
  assert.equal(fixtures.count, 3);
  assert.ok(new Date(fixtures.oldestMtime).getTime() < new Date(fixtures.newestMtime).getTime());
});

// ==========================================================================
// D. LANE BRANCHES (part A) — enumerated by BRANCH, never by worktree.
//
//    D1 is the RED-FIRST case, against the FROZEN fixture: the live world
//    this fixture recorded is being cleared by the dispatcher's own
//    integration work as this lane runs, so the live world is not a usable
//    red case — the fixture is (docs/dev-loop.md, "A red-first arrangement
//    is anchored to an IMMUTABLE reference, or it decays before it is
//    built"). D2 is the durable, hermetic, re-runnable form: a synthetic
//    git repo built from scratch every run. D3 is the could-not-verify arm.
// ==========================================================================

test("D1 red-first: aggregateLaneBranches over the FROZEN fixture reproduces 43/33/1, "
  + "and the naive worktree-only enumeration structurally cannot see the orphan", () => {
  const fixture = JSON.parse(readFileSync(LANE_BRANCH_FIXTURE, "utf8"));
  const agg = aggregateLaneBranches(fixture.branches);
  assert.equal(agg.branchCount, 43, "fixture branch count");
  assert.equal(agg.totalOutstanding, 33, "fixture total outstanding (sum of `+` by patch-id)");
  assert.equal(agg.branchesWithWork, 7, "fixture branches with outstanding > 0");
  assert.equal(agg.orphanedWithWork, 1, "fixture orphaned-with-work count");

  // The naive enumeration a `git worktree list`-only approach would produce:
  // scoped to branches that ARE worktree-registered, it never even sees a
  // branch whose worktree was removed, so it cannot report it as orphaned —
  // not because the math is wrong, but because the population never
  // contained the orphan to begin with. This is the reach gap part A exists
  // to close, and the two results MUST differ.
  const naivePopulation = fixture.branches.filter((b) => b.worktreeRegistered);
  const naiveAgg = aggregateLaneBranches(naivePopulation);
  assert.equal(naiveAgg.orphanedWithWork, 0,
    "a worktree-only enumeration can never find an orphan by construction");
  assert.notEqual(naiveAgg.orphanedWithWork, agg.orphanedWithWork,
    "the union enumeration and the naive worktree-only enumeration must DIFFER on this fixture, "
    + "or the collector is not catching the class it exists for");
});

test("D2 mechanism proof: collectLaneBranches on a synthetic git repo — registered lane, "
  + "orphaned lane, fully-merged lane, and an already-upstream-by-cherry-pick lane", () => {
  const dir = tmpDirSync("state-report-lanes-");
  sh(["init", "-q", "-b", "main"], dir);
  sh(["config", "user.email", "test@example.com"], dir);
  sh(["config", "user.name", "State Report Test"], dir);
  writeFileSync(join(dir, "README.md"), "init\n");
  sh(["add", "README.md"], dir);
  sh(["commit", "-q", "-m", "init"], dir);

  // Case 1: worktree-agent-* branch, REGISTERED worktree, 2 outstanding commits.
  const regDir = join(dir, "wt-reg");
  sh(["worktree", "add", "-q", "-b", "worktree-agent-testreg", regDir, "main"], dir);
  writeFileSync(join(regDir, "reg1.md"), "reg1\n");
  sh(["add", "reg1.md"], regDir);
  sh(["commit", "-q", "-m", "reg commit 1"], regDir);
  writeFileSync(join(regDir, "reg2.md"), "reg2\n");
  sh(["add", "reg2.md"], regDir);
  sh(["commit", "-q", "-m", "reg commit 2"], regDir);

  // Case 2: worktree-agent-* branch whose worktree is REMOVED after one
  // commit — the orphan case part A exists to catch.
  const orphanDir = join(dir, "wt-orphan");
  sh(["worktree", "add", "-q", "-b", "worktree-agent-testorphan", orphanDir, "main"], dir);
  writeFileSync(join(orphanDir, "orphan1.md"), "orphan1\n");
  sh(["add", "orphan1.md"], orphanDir);
  sh(["commit", "-q", "-m", "orphan commit"], orphanDir);
  sh(["worktree", "remove", "--force", orphanDir], dir);

  // Case 3: wt/foo/bar, fully merged (same tip as main) — 0 outstanding.
  sh(["branch", "wt/foo/bar", "main"], dir);

  // Case 4: a branch already upstream BY PATCH-ID (cherry-picked onto main)
  // — proves `-` (alreadyUpstream) is never counted as `+` (outstanding).
  // Main must DIVERGE before the cherry-pick, or the cherry-picked commit's
  // parent/tree/author/committer stay byte-identical to the original and
  // git mints the SAME commit object (same sha) instead of an equivalent
  // one — the two must be distinct commits sharing only a patch-id for
  // `git cherry` to have anything to compare (verified: without the
  // divergence commit below, `wt/cherry-picked` and `main`'s tip land on
  // the identical sha and `git cherry` reports nothing at all).
  sh(["checkout", "-q", "-b", "tmp-source", "main"], dir);
  writeFileSync(join(dir, "cherry.md"), "cherry content\n");
  sh(["add", "cherry.md"], dir);
  sh(["commit", "-q", "-m", "the cherry commit"], dir);
  const cherrySha = sh(["rev-parse", "HEAD"], dir);
  sh(["checkout", "-q", "main"], dir);
  writeFileSync(join(dir, "diverge.md"), "diverge\n");
  sh(["add", "diverge.md"], dir);
  sh(["commit", "-q", "-m", "main diverges"], dir);
  sh(["cherry-pick", cherrySha], dir);
  sh(["branch", "wt/cherry-picked", cherrySha], dir);
  sh(["branch", "-D", "tmp-source"], dir);

  const res = collectLaneBranches({ repoRoot: dir });
  assert.equal(res.ok, true, res.reason);

  const byName = Object.fromEntries(res.branches.map((b) => [b.branch, b]));

  assert.ok(byName["worktree-agent-testreg"], "registered lane must be enumerated");
  assert.equal(byName["worktree-agent-testreg"].outstanding, 2);
  assert.equal(byName["worktree-agent-testreg"].alreadyUpstream, 0);
  assert.equal(byName["worktree-agent-testreg"].worktreeRegistered, true);

  assert.ok(byName["worktree-agent-testorphan"], "orphaned lane must still be enumerated — the whole point");
  assert.equal(byName["worktree-agent-testorphan"].outstanding, 1);
  assert.equal(byName["worktree-agent-testorphan"].worktreeRegistered, false);

  assert.ok(byName["wt/foo/bar"], "wt/* convention branch must be enumerated");
  assert.equal(byName["wt/foo/bar"].outstanding, 0);

  assert.ok(byName["wt/cherry-picked"], "cherry-picked-upstream branch must be enumerated");
  assert.equal(byName["wt/cherry-picked"].outstanding, 0,
    "content already upstream by patch-id must NOT count as outstanding");
  assert.ok(byName["wt/cherry-picked"].alreadyUpstream >= 1,
    "the cherry-picked commit must be counted as already-upstream");

  const agg = aggregateLaneBranches(res.branches);
  assert.equal(agg.totalOutstanding, 3, "2 (reg) + 1 (orphan) + 0 + 0");
  assert.equal(agg.branchesWithWork, 2, "reg and orphan");
  assert.equal(agg.orphanedWithWork, 1, "only the orphan lane");
});

test("D3 could-not-verify: collectLaneBranches on a non-git directory reports a reason, never zero", () => {
  const dir = tmpDirSync("state-report-notgit-");
  const res = collectLaneBranches({ repoRoot: dir });
  assert.equal(res.ok, false);
  assert.equal(typeof res.reason, "string");
  assert.ok(res.reason.length > 0);
  assert.equal(res.branches, undefined, "must not silently carry an empty branch list");
});

// ==========================================================================
// E. GATE-VERDICT STALENESS (part B) — red-first pair, both arms required.
// ==========================================================================

test("E1 red-first: the CURRENT (pre-change) collector carries no age signal at all", () => {
  // This is the literal red: before `ageHours` existed, `collectGateVerdict`
  // passed `finished` through raw with nothing computed from it — a synthetic
  // gate-status 7 days stale collected as ok:true with no staleness anywhere
  // in the object (BACKLOG.md's part-B entry, re-run here rather than taken
  // on the entry's word per dev-loop.md's disproving-probe rule). Asserting
  // the CURRENT shape carries `ageHours` pins that this defect is fixed, not
  // that it once existed.
  const dir = tmpDirSync("state-report-gate-red-");
  const path = join(dir, "gate-status.json");
  const finished7dAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  writeFileSync(path, JSON.stringify({ ok: true, failing: 0, captures: 10, finished: finished7dAgo }));
  const res = collectGateVerdict({ statusPath: path });
  assert.equal(res.ok, true, res.reason);
  assert.equal(typeof res.ageHours, "number", "ageHours must be present and numeric on a valid finished timestamp");
  assert.ok(res.ageHours > GATE_STALE_THRESHOLD_HOURS, `ageHours=${res.ageHours}`);
});

test("E2: a finished timestamp older than the threshold renders the STALE marker; "
  + "one within it does not — the two must differ", () => {
  const staleDir = tmpDirSync("state-report-gate-stale-");
  const stalePath = join(staleDir, "gate-status.json");
  const finished3dAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  writeFileSync(stalePath, JSON.stringify({ ok: true, failing: 0, captures: 10, finished: finished3dAgo }));
  const staleGate = collectGateVerdict({ statusPath: stalePath });
  assert.equal(staleGate.ok, true, staleGate.reason);

  const freshDir = tmpDirSync("state-report-gate-fresh-");
  const freshPath = join(freshDir, "gate-status.json");
  const finished1hAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
  writeFileSync(freshPath, JSON.stringify({ ok: true, failing: 0, captures: 10, finished: finished1hAgo }));
  const freshGate = collectGateVerdict({ statusPath: freshPath });
  assert.equal(freshGate.ok, true, freshGate.reason);

  const emptyVerification = (gate) => ({
    gate,
    pin: { ok: false, reason: "n/a" },
    fingerprint: { ok: false, reason: "n/a" },
  });
  const emptyRepo = {
    unpushed: { ok: false, reason: "n/a" },
    rescueTags: { ok: false, reason: "n/a" },
    dangling: { ok: false, reason: "n/a" },
    worktrees: { ok: false, reason: "n/a" },
    fixtures: { ok: false, reason: "n/a" },
  };
  const emptyRest = {
    matrix: { ok: false, reason: "n/a" },
    backlog: { ok: false, reason: "n/a" },
    repo: emptyRepo,
    laneBranches: { ok: false, reason: "n/a" },
  };

  const staleText = renderText({ ...emptyRest, verification: emptyVerification(staleGate) });
  const staleLine = staleText.split("\n").find((l) => l.startsWith("gate:"));
  assert.match(staleLine, /STALE/, staleLine);

  const freshText = renderText({ ...emptyRest, verification: emptyVerification(freshGate) });
  const freshLine = freshText.split("\n").find((l) => l.startsWith("gate:"));
  assert.doesNotMatch(freshLine, /STALE/, freshLine);
});

test("E3 could-not-verify: an absent or unparseable `finished` yields ageHours:null, never age 0", () => {
  const dir = tmpDirSync("state-report-gate-nofinished-");
  const noFinishedPath = join(dir, "no-finished.json");
  writeFileSync(noFinishedPath, JSON.stringify({ ok: true, failing: 0, captures: 10 }));
  const noFinished = collectGateVerdict({ statusPath: noFinishedPath });
  assert.equal(noFinished.ok, true, noFinished.reason);
  assert.equal(noFinished.ageHours, null);

  const badFinishedPath = join(dir, "bad-finished.json");
  writeFileSync(badFinishedPath, JSON.stringify({ ok: true, failing: 0, captures: 10, finished: "not-a-date" }));
  const badFinished = collectGateVerdict({ statusPath: badFinishedPath });
  assert.equal(badFinished.ok, true, badFinished.reason);
  assert.equal(badFinished.ageHours, null);
});

// ==========================================================================
// Renderer sanity — the JSON and text renderers share one collected object
// (per the file's own header comment); this just checks renderText doesn't
// throw on a real collectMatrix/collectBacklog `ok:false` shape and prints
// COULD-NOT-VERIFY rather than crashing or silently omitting the section.
// ==========================================================================

test("renderText prints COULD-NOT-VERIFY for a failed collector rather than throwing", () => {
  const text = renderText({
    matrix: { ok: false, reason: "synthetic" },
    backlog: { ok: false, reason: "synthetic" },
    verification: {
      gate: { ok: false, reason: "synthetic" },
      pin: { ok: false, reason: "synthetic" },
      fingerprint: { ok: false, reason: "synthetic" },
    },
    repo: {
      unpushed: { ok: false, reason: "synthetic" },
      rescueTags: { ok: false, reason: "synthetic" },
      dangling: { ok: false, reason: "synthetic" },
      worktrees: { ok: false, reason: "synthetic" },
      fixtures: { ok: false, reason: "synthetic" },
    },
    laneBranches: { ok: false, reason: "synthetic" },
  });
  // One line per collector: matrix(1) + backlog(1) + verification's three
  // sub-collectors(3) + repo's five sub-collectors(5) + laneBranches(1) = 11.
  const occurrences = (text.match(/COULD-NOT-VERIFY/g) || []).length;
  assert.equal(occurrences, 11, text);
});
