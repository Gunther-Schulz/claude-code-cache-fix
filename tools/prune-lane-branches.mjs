#!/usr/bin/env node
// prune-lane-branches — orphaned `worktree-agent-*` branches survive their
// worktrees, and nothing prunes them (BACKLOG.md, "22 orphaned
// `worktree-agent-*` branches survive their worktrees").
//
// WHY. `git worktree remove` deletes the checkout and leaves the BRANCH, so
// every dispatch that ever got a worktree has left a ref behind. It grows
// monotonically with dispatch volume, it makes `git branch` unreadable
// exactly when someone is looking for a real branch under pressure, and —
// the load-bearing reason — a stale lane branch can carry content that was
// deliberately removed from `main`. That is not hypothetical: this repo
// rewrote a commit message carrying a real session UUID, and the two
// rewrite-safety branches held the pre-scrub commit until they were
// explicitly deleted. A leak retracted from `main` and left alive on an
// orphan branch is retracted from nothing.
//
// THE RULE, and it is the whole design: delete a `worktree-agent-*` branch
// ONLY when its worktree is gone AND its tip is an ancestor of the main
// branch (i.e. fully integrated). REPORT, never delete, any branch whose
// tip is NOT an ancestor — an unintegrated lane branch is unfinished work,
// not litter, and the two must never be confused. A branch that still has a
// live worktree is never touched either way, regardless of integration
// status — `git branch -d` would refuse it anyway, but this never even
// attempts it.
//
// THE BOX (dispatch brief, member 6): this tool is built and tested against
// a THROWAWAY fixture repo (see test/prune-lane-branches.test.mjs) — never
// run with --apply against the real claude-code-cache-fix checkout from
// here. Several lane worktrees are live in it right now and their branches
// are exactly the objects this tool reasons about; the live run, when it
// happens, is the dispatcher's, after this wave integrates. --dry-run
// against the real repo is fine and already exercised (see the closing
// report).
//
// Usage:
//   node tools/prune-lane-branches.mjs [--repo <path>] [--main <branch>]
//     [--pattern <glob-ish prefix>] [--apply] [--json]
//   default: DRY RUN, repo = this tool's own containing repo, main = "main",
//   pattern = "worktree-agent-*".

import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SELF_REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(repo, args) {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" }).trim();
}

/** `git worktree list --porcelain`, parsed to the set of branches that currently have a live worktree. */
export function liveWorktreeBranches(repo, gitFn = git) {
  const out = gitFn(repo, ["worktree", "list", "--porcelain"]);
  const branches = new Set();
  for (const line of out.split("\n")) {
    const m = line.match(/^branch refs\/heads\/(.+)$/);
    if (m) branches.add(m[1]);
  }
  return branches;
}

/** Every local branch matching the glob-ish prefix pattern (`<prefix>*`). */
export function matchingBranches(repo, pattern, gitFn = git) {
  const prefix = pattern.replace(/\*$/, "");
  const out = gitFn(repo, ["for-each-ref", "--format=%(refname:short)", "refs/heads/"]);
  return out.split("\n").filter((b) => b && b.startsWith(prefix));
}

function isAncestorOfMain(repo, branch, mainBranch, gitFn = git) {
  try {
    gitFn(repo, ["merge-base", "--is-ancestor", branch, mainBranch]);
    return true;
  } catch (err) {
    // exit code 1 means "not an ancestor" — a real answer, not a failure.
    // Any OTHER failure (branch or main missing, detached HEAD weirdness) is
    // a structural problem this tool refuses to guess through.
    if (err.status === 1) return false;
    throw new Error(`could not compare ${branch} against ${mainBranch}: ${err.message}`);
  }
}

/**
 * The plan, computed against the git surfaces `gitFn` provides — pure aside
 * from those calls, so the CLI and the test drive the exact same logic
 * against a real repo (throwaway fixture, or the real one in dry-run only).
 */
export function planPrune({ repo, mainBranch, pattern }, gitFn = git) {
  const live = liveWorktreeBranches(repo, gitFn);
  const candidates = matchingBranches(repo, pattern, gitFn);

  const toDelete = [];
  const survives = [];
  const skippedLiveWorktree = [];

  for (const branch of candidates) {
    if (live.has(branch)) {
      skippedLiveWorktree.push({ branch, reason: "has a live worktree" });
      continue;
    }
    if (isAncestorOfMain(repo, branch, mainBranch, gitFn)) {
      toDelete.push(branch);
    } else {
      survives.push({ branch, reason: `tip is not an ancestor of ${mainBranch} — unintegrated, not litter` });
    }
  }

  return { candidateCount: candidates.length, toDelete, survives, skippedLiveWorktree };
}

/** Applies the plan: `git branch -d` per row in `toDelete` (never `-D` — the safe form re-checks the merge fact this tool already computed). */
function apply(repo, toDelete, gitFn = git) {
  const results = [];
  for (const branch of toDelete) {
    try {
      gitFn(repo, ["branch", "-d", branch]);
      results.push({ branch, deleted: true });
    } catch (err) {
      results.push({ branch, deleted: false, error: err.message });
    }
  }
  return results;
}

function main(argv) {
  const args = argv.slice(2);
  const flag = (name, dflt) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : dflt;
  };
  const repo = flag("--repo", SELF_REPO);
  const mainBranch = flag("--main", "main");
  const pattern = flag("--pattern", "worktree-agent-*");
  const doApply = args.includes("--apply");
  const json = args.includes("--json");

  const plan = planPrune({ repo, mainBranch, pattern });
  const applied = doApply ? apply(repo, plan.toDelete) : null;

  if (json) {
    process.stdout.write(JSON.stringify({ ...plan, applied }, null, 2) + "\n");
  } else {
    process.stdout.write(
      `prune-lane-branches (${pattern}) — examined ${plan.candidateCount} candidate(s) against "${mainBranch}"\n\n`,
    );
    const label = doApply ? "DELETED" : "WOULD-DELETE";
    if (doApply) {
      for (const row of applied) {
        process.stdout.write(row.deleted
          ? `  DELETED         ${row.branch}\n`
          : `  DELETE-FAILED   ${row.branch}  (${row.error})\n`);
      }
    } else {
      for (const b of plan.toDelete) process.stdout.write(`  ${label.padEnd(15)} ${b}\n`);
    }
    for (const s of plan.survives) process.stdout.write(`  SURVIVES        ${s.branch}  (${s.reason})\n`);
    for (const s of plan.skippedLiveWorktree) process.stdout.write(`  SKIPPED         ${s.branch}  (${s.reason})\n`);
    process.stdout.write(
      `\n${plan.toDelete.length} ${doApply ? "deleted" : "would delete"}, `
        + `${plan.survives.length} survive (unintegrated), `
        + `${plan.skippedLiveWorktree.length} skipped (live worktree)\n`,
    );
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\//, ""))) {
  main(process.argv);
}
