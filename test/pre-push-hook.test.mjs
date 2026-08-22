// pre-push-hook — the guard must verify the COMMITS BEING PUSHED, never the
// working tree.
//
// DEFINITION, written before the assertions (the parentage rule: an expectation
// derived from the implementation pins the bug it should catch). A pre-push
// hook exists to stop a broken state from reaching a remote. The state that
// reaches a remote is the COMMIT. Therefore:
//
//   - a red that exists ONLY in the working tree (uncommitted or untracked)
//     is not being published and must NOT block the push;
//   - a red that exists IN THE COMMIT must block, even when the working tree
//     has been fixed and looks green.
//
// The second is the direction that matters and the one nobody had seen fire:
// edit a file, do not commit it, push — the old hook ran `npm test` in the
// working tree, verified the edit, and recorded a green for a broken commit.
//
// Red-first arrangement, run at the desk before this file was committed, with
// the OLD hook (`git show HEAD:tools/git-hooks/pre-push`, bare `npm test` in
// the working tree) against these same two fixtures: it ALLOWED the
// broken-commit case and REFUSED the untracked-scratch case — i.e. exactly
// inverted on both. The output is in the commit message for this file.
//
// The fixture repo carries its OWN trivial `npm test` (a green/red switch on
// the presence of a file named BROKEN), so this test never re-enters this
// repo's suite — a hook that runs `npm test` being exercised BY `npm test`
// would otherwise recurse.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync, copyFileSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpDirSync } from "../tools/tmpdir.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = join(REPO, "tools/git-hooks/pre-push");

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/**
 * A throwaway origin+work pair whose `npm test` is red iff a file BROKEN exists.
 *
 * `sessionKillFixed` writes the marker the hook's session-kill quarantine reads
 * — the killOurs() choke point under test/. It defaults to TRUE because every
 * case below is about some other property of the hook, and on a tree without
 * the marker the hook correctly skips the suite, which would make those cases
 * pass for the wrong reason. The one case that wants the quarantine passes
 * false.
 */
function makeFixture(label, { sessionKillFixed = true } = {}) {
  const root = join(tmpDirSync("prepush"), label);
  const origin = join(root, "origin.git");
  const work = join(root, "work");
  mkdirSync(origin, { recursive: true });
  mkdirSync(work, { recursive: true });
  git(origin, "init", "--bare", "--quiet", "--initial-branch=main");
  git(work, "init", "--quiet", "--initial-branch=main");
  git(work, "config", "user.email", "t@example.invalid");
  git(work, "config", "user.name", "t");
  git(work, "remote", "add", "origin", origin);
  writeFileSync(
    join(work, "package.json"),
    JSON.stringify(
      {
        name: "prepush-fixture",
        private: true,
        scripts: {
          // red exactly when BROKEN is present in the tree being tested
          test: 'node -e "process.exit(require(\'fs\').existsSync(\'BROKEN\')?1:0)"',
        },
      },
      null,
      2,
    ) + "\n",
  );
  mkdirSync(join(work, ".git/hooks"), { recursive: true });
  const installed = join(work, ".git/hooks/pre-push");
  copyFileSync(HOOK, installed);
  chmodSync(installed, 0o755);
  if (sessionKillFixed) {
    mkdirSync(join(work, "test"), { recursive: true });
    writeFileSync(
      join(work, "test/proc-helpers.mjs"),
      "export function killOurs() {}\n",
    );
    git(work, "add", "test/proc-helpers.mjs");
  }
  git(work, "add", "package.json");
  git(work, "commit", "--quiet", "-m", "base");
  return { root, work };
}

/**
 * Returns {ok, out} — ok=true when the push was allowed, `out` carrying BOTH
 * streams. spawnSync rather than execFileSync deliberately: the hook reports on
 * STDERR, and execFileSync's return value is stdout alone, so a success-path
 * assertion against it reads an empty string and can only ever be vacuous. That
 * is not hypothetical — the first version of this file asserted against stdout,
 * and the assertion failed for that reason while the hook was behaving
 * correctly. The probe is the newest instrument in the room.
 */
function tryPush(work) {
  const r = spawnSync("git", ["push", "origin", "main"], {
    cwd: work,
    encoding: "utf8",
  });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

test("a red that exists ONLY as untracked scratch does not block the push", () => {
  const { root, work } = makeFixture("untracked");
  try {
    // The commit is green. A co-writer's untracked file makes the WORKING TREE red.
    writeFileSync(join(work, "BROKEN"), "a co-writer's scratch\n");
    const r = tryPush(work);
    assert.equal(
      r.ok,
      true,
      `push must be allowed — nothing red is being published.\n${r.out}`,
    );
    // and it must have said what it tested, so the reader can tell which tree
    assert.match(r.out, /at pushed commit/, `hook must name the pushed commit\n${r.out}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a red that is IN THE COMMIT blocks, even when the working tree is green", () => {
  const { root, work } = makeFixture("committed");
  try {
    // Commit the breakage, then "fix" it only in the working tree.
    writeFileSync(join(work, "BROKEN"), "shipped broken\n");
    git(work, "add", "BROKEN");
    git(work, "commit", "--quiet", "-m", "breaks the suite");
    rmSync(join(work, "BROKEN")); // uncommitted repair — the false-green setup
    const r = tryPush(work);
    assert.equal(
      r.ok,
      false,
      `push must be REFUSED — the pushed commit is red however green the tree looks.\n${r.out}`,
    );
    assert.match(
      r.out,
      /AT THE PUSHED COMMIT/,
      `refusal must say it judged the commit, not the tree\n${r.out}`,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- the session-kill quarantine ---
//
// DEFINITION, written before the assertions. On a host running a systemd USER
// manager, two of this suite's cleanup sites walk to a listener's PARENT and
// signal it; that parent is the manager, so the suite logs the developer out.
// The fix is the killOurs() choke point under test/. Until a tree carries it,
// the hook must not run the suite on that tree — and must say so rather than
// reporting a green it never earned.
//
// The two arms differ ONLY in whether the marker is present, and the pushed
// commit is red in both. Without the second arm the first proves only that
// something allowed a push.
test("a tree predating the session-kill fix SKIPS the suite and says so", () => {
  const { root, work } = makeFixture("sessionkill-absent", { sessionKillFixed: false });
  try {
    writeFileSync(join(work, "BROKEN"), "red, and deliberately so\n");
    git(work, "add", "BROKEN");
    git(work, "commit", "--quiet", "-m", "a commit the suite would refuse");
    const r = tryPush(work);
    assert.equal(
      r.ok,
      true,
      `push must be ALLOWED — refusing here would make --no-verify routine\n${r.out}`,
    );
    assert.match(r.out, /SUITE SKIPPED/, `the skip must be stated, never silent\n${r.out}`);
    // The load-bearing half: it must not have RUN the suite. A hook that ran
    // it and passed anyway would satisfy the assertion above while still
    // taking the desktop down, which is the whole defect.
    assert.doesNotMatch(
      r.out,
      /npm test \(full suite\)/,
      `the quarantine must short-circuit BEFORE the suite starts\n${r.out}`,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the discriminating control: the same red commit on a FIXED tree is refused", () => {
  const { root, work } = makeFixture("sessionkill-present");
  try {
    writeFileSync(join(work, "BROKEN"), "red, and deliberately so\n");
    git(work, "add", "BROKEN");
    git(work, "commit", "--quiet", "-m", "a commit the suite would refuse");
    const r = tryPush(work);
    assert.equal(
      r.ok,
      false,
      `with the fix present the suite must run and refuse the red commit\n${r.out}`,
    );
    assert.match(r.out, /npm test \(full suite\)/, `the suite must have run\n${r.out}`);
    assert.doesNotMatch(r.out, /SUITE SKIPPED/, `nothing may be quarantined here\n${r.out}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- the oversize-blob step, wired ahead of the suite ---
//
// The guard's own logic is proven in test/oversize-blob-guard.test.mjs. What
// only THIS file can prove is the WIRING: that the hook actually invokes it,
// refuses on its red, and does so BEFORE paying for the suite. The fixture
// repo carries just the hook, so the hook's `[ -f ]` check skips the guard
// there — which is correct behaviour for a standalone copy and also means a
// wiring test must install the guard file itself, or it asserts nothing.
//
// The blob is a SPARSE 101 MiB of zeros: over GitHub's hard limit, costing
// no real disk and packing to almost nothing. Sizes come from the remote's
// documented limit, not from the guard's constants — an expectation read off
// the artifact it grades moves with the mutant.
function installGuard(work) {
  mkdirSync(join(work, "tools"), { recursive: true });
  copyFileSync(join(REPO, "tools/oversize-blob-guard.mjs"), join(work, "tools/oversize-blob-guard.mjs"));
  git(work, "add", "tools/oversize-blob-guard.mjs");
  git(work, "commit", "--quiet", "-m", "install guard");
}

test("a blob over the remote's hard limit is REFUSED, and refused before the suite runs", () => {
  const { root, work } = makeFixture("oversize");
  try {
    installGuard(work);
    // Negative control FIRST, in the same fixture: with the guard installed
    // and nothing oversized, the push still goes through. Without this arm a
    // refusal below proves only that something said no.
    const clean = tryPush(work);
    assert.equal(clean.ok, true, `guard present + ordinary tree must still push\n${clean.out}`);

    execFileSync("truncate", ["-s", "101M", join(work, "huge.bin")]);
    git(work, "add", "huge.bin");
    git(work, "commit", "--quiet", "-m", "a pin far too large to publish");
    const r = tryPush(work);
    assert.equal(r.ok, false, `push must be REFUSED — the remote cannot accept this blob\n${r.out}`);
    assert.match(r.out, /oversize-blob-guard: REFUSED/, `the guard must name itself\n${r.out}`);
    assert.match(r.out, /huge\.bin/, `the refusal must name the offending file\n${r.out}`);
    // The ordering claim, and it is the reason this step sits where it does:
    // the suite is the expensive half, so a tree that cannot be published
    // must be rejected without paying for it.
    assert.doesNotMatch(
      r.out,
      /npm test \(full suite\)/,
      `the oversize check must short-circuit BEFORE the suite\n${r.out}`,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("negative control: an ordinary green push is still allowed", () => {
  const { root, work } = makeFixture("clean");
  try {
    writeFileSync(join(work, "ok.txt"), "fine\n");
    git(work, "add", "ok.txt");
    git(work, "commit", "--quiet", "-m", "green change");
    const r = tryPush(work);
    assert.equal(r.ok, true, `a clean push must pass unchanged.\n${r.out}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the hook leaves no worktree registered behind it", () => {
  const { root, work } = makeFixture("cleanup");
  try {
    writeFileSync(join(work, "ok.txt"), "fine\n");
    git(work, "add", "ok.txt");
    git(work, "commit", "--quiet", "-m", "green change");
    tryPush(work);
    const list = git(work, "worktree", "list");
    const lines = list.trim().split("\n").filter(Boolean);
    assert.equal(
      lines.length,
      1,
      `only the main worktree may remain; got:\n${list}`,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
