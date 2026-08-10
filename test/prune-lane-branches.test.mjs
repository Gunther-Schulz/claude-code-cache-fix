// prune-lane-branches — BACKLOG.md, "22 orphaned `worktree-agent-*` branches
// survive their worktrees, and nothing prunes them."
//
// EVERY bite in this file runs against a THROWAWAY FIXTURE REPO built fresh
// per test under `tools/tmpdir.mjs`'s run root — never against this repo.
// The dispatch brief for this member is explicit: build the tool and its
// two-direction verifier, test it against a throwaway repo, and never run
// `--apply` here. (A `--dry-run` against the real repo IS safe and was run
// by hand for the closing report — 32 real candidates today, 2 eligible for
// deletion, 21 correctly protected as unintegrated, 9 correctly skipped as
// having a live worktree, including this very session's own.)
//
// THE TWO-DIRECTION VERIFIER the entry itself names: (1) every branch this
// tool deletes has a tip still reachable from `main` afterwards (deleting a
// REF never deletes the commits an ancestor branch already carries); (2) a
// synthetic lane branch with an unmerged commit SURVIVES the prune and is
// named in its report.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { tmpDirSync } from "../tools/tmpdir.mjs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { planPrune } from "../tools/prune-lane-branches.mjs";

const REPO_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO_DIR, "tools", "prune-lane-branches.mjs");

function git(repo, args) {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" }).trim();
}

/**
 * A throwaway repo shaped like the real one's orphan problem:
 *   main                                — two commits
 *   worktree-agent-integrated-1/-2      — branched from main, no extra commits, NO worktree -> orphaned + integrated
 *   worktree-agent-unmerged             — branched from main, ONE extra commit, NO worktree -> orphaned + unintegrated
 *   worktree-agent-live                 — branched from main, no extra commits, HAS a worktree -> integrated but must never be touched
 *   not-a-lane-branch                   — integrated, no worktree, but does NOT match the prefix -> must never be touched
 */
function buildFixtureRepo() {
  const repo = tmpDirSync("prune-fixture-");
  git(repo, ["init", "--initial-branch=main", "-q"]);
  git(repo, ["config", "user.email", "test@example.com"]);
  git(repo, ["config", "user.name", "Test"]);
  execFileSync("sh", ["-c", `cd ${JSON.stringify(repo)} && echo one > f.txt && git add f.txt && git commit -q -m one`]);
  execFileSync("sh", ["-c", `cd ${JSON.stringify(repo)} && echo two >> f.txt && git add f.txt && git commit -q -m two`]);

  for (const name of ["worktree-agent-integrated-1", "worktree-agent-integrated-2", "not-a-lane-branch"]) {
    git(repo, ["branch", name, "main"]);
  }

  git(repo, ["branch", "worktree-agent-unmerged", "main"]);
  execFileSync("sh", ["-c",
    `cd ${JSON.stringify(repo)} && git checkout -q worktree-agent-unmerged && echo three >> f.txt && git commit -q -am three && git checkout -q main`]);

  git(repo, ["branch", "worktree-agent-live", "main"]);
  const liveWorktreeDir = tmpDirSync("prune-fixture-live-wt-");
  git(repo, ["worktree", "add", "-q", liveWorktreeDir, "worktree-agent-live"]);

  return { repo, liveWorktreeDir };
}

// --- planPrune(), the pure logic, unit-tested directly ----------------------

test("BITE — an orphaned branch with no live worktree, fully merged into main, is planned for deletion", () => {
  const { repo } = buildFixtureRepo();
  const plan = planPrune({ repo, mainBranch: "main", pattern: "worktree-agent-*" });
  assert.ok(plan.toDelete.includes("worktree-agent-integrated-1"));
  assert.ok(plan.toDelete.includes("worktree-agent-integrated-2"));
});

test("RED-FIRST (verifier direction 2) — an unmerged lane branch SURVIVES and is NAMED in the report", () => {
  const { repo } = buildFixtureRepo();
  const plan = planPrune({ repo, mainBranch: "main", pattern: "worktree-agent-*" });
  assert.ok(!plan.toDelete.includes("worktree-agent-unmerged"), "must never be planned for deletion");
  const named = plan.survives.find((s) => s.branch === "worktree-agent-unmerged");
  assert.ok(named, "the survivor must be NAMED in the report, not merely absent from toDelete");
  assert.match(named.reason, /not an ancestor/);
});

test("BITE — a branch with a LIVE worktree is skipped even though it is fully integrated", () => {
  const { repo } = buildFixtureRepo();
  const plan = planPrune({ repo, mainBranch: "main", pattern: "worktree-agent-*" });
  assert.ok(!plan.toDelete.includes("worktree-agent-live"));
  assert.ok(!plan.survives.some((s) => s.branch === "worktree-agent-live"));
  assert.ok(plan.skippedLiveWorktree.some((s) => s.branch === "worktree-agent-live"));
});

test("BITE — a branch outside the pattern is never even examined", () => {
  const { repo } = buildFixtureRepo();
  const plan = planPrune({ repo, mainBranch: "main", pattern: "worktree-agent-*" });
  const all = [...plan.toDelete, ...plan.survives.map((s) => s.branch), ...plan.skippedLiveWorktree.map((s) => s.branch)];
  assert.ok(!all.includes("not-a-lane-branch"));
});

// --- The real CLI, --apply, against the throwaway repo ----------------------
// (verifier direction 1 lives here: the deleted branch's tip stays reachable)

test("BITE — --apply against the throwaway repo deletes exactly the integrated orphans, nothing else", () => {
  const { repo } = buildFixtureRepo();
  const beforeSha = git(repo, ["rev-parse", "worktree-agent-integrated-1"]);

  const out = execFileSync(process.execPath, [TOOL, "--repo", repo, "--apply", "--json"], { encoding: "utf8" });
  const result = JSON.parse(out);

  assert.deepEqual(
    result.applied.filter((r) => r.deleted).map((r) => r.branch).sort(),
    ["worktree-agent-integrated-1", "worktree-agent-integrated-2"],
  );

  // Direction 1 of the two-direction verifier: the deleted branch's ref is
  // GONE, but its tip commit is still reachable from main.
  const branches = git(repo, ["branch", "--list", "worktree-agent-integrated-1"]);
  assert.equal(branches, "", "the branch ref itself must be gone");
  const reachable = git(repo, ["branch", "--contains", beforeSha, "main"]);
  assert.match(reachable, /main/, "the commit the branch pointed at must still be reachable from main");

  // Never touched: the unmerged one, the live-worktree one, and the
  // out-of-pattern one all still exist exactly as before.
  for (const survivor of ["worktree-agent-unmerged", "worktree-agent-live", "not-a-lane-branch"]) {
    assert.doesNotThrow(() => git(repo, ["rev-parse", "--verify", survivor]), `${survivor} must still exist`);
  }
});

test("BITE — a dry run (no --apply) deletes nothing at all", () => {
  const { repo } = buildFixtureRepo();
  execFileSync(process.execPath, [TOOL, "--repo", repo], { encoding: "utf8" });
  for (const b of ["worktree-agent-integrated-1", "worktree-agent-integrated-2", "worktree-agent-unmerged", "worktree-agent-live"]) {
    assert.doesNotThrow(() => git(repo, ["rev-parse", "--verify", b]), `${b} must still exist after a dry run`);
  }
});

test("BITE — human-readable output names EVERY disposition (deleted, survives, skipped) and the examined count", () => {
  const { repo } = buildFixtureRepo();
  const out = execFileSync(process.execPath, [TOOL, "--repo", repo], { encoding: "utf8" });
  assert.match(out, /examined \d+ candidate\(s\)/);
  assert.match(out, /WOULD-DELETE\s+worktree-agent-integrated-1/);
  assert.match(out, /SURVIVES\s+worktree-agent-unmerged/);
  assert.match(out, /SKIPPED\s+worktree-agent-live/);
});
