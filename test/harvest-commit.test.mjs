// harvest-commit — the harvest run commits its own output (cf-333).
//
// The harvester used to leave every file it wrote untracked: nobody owned
// the `git add`/`git commit` step, so the untracked backlog grew until a
// session happened to notice it by hand (302 files, one week). commitHarvest
// is the named actor: it stages exactly the tool's own output directory by
// pathspec and commits it, or reports why it did not — never silently.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { commitHarvest } from "../tools/harvest.mjs";
import { tmpDir } from "../tools/tmpdir.mjs";

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

async function initRepo() {
  const dir = await tmpDir("harvest-commit-");
  git(["init", "-q"], dir);
  git(["config", "user.email", "t@t"], dir);
  git(["config", "user.name", "t"], dir);
  return dir;
}

test("commitHarvest: stages and commits the out dir, message carries the count", async () => {
  const repoRoot = await initRepo();
  await mkdir(join(repoRoot, "out"), { recursive: true });
  await writeFile(join(repoRoot, "out", "f.json"), "{}\n");

  const result = commitHarvest({ repoRoot, outDirRel: "out", count: 1, dryRun: false });
  assert.equal(result.committed, true, "committed must be true on success");
  assert.ok(result.sha, "a sha is returned on success");

  const subject = git(["log", "-1", "--format=%s"], repoRoot).trim();
  assert.ok(
    subject.startsWith("harvest: 1 file(s) written, "),
    `commit subject did not match the required prefix: ${JSON.stringify(subject)}`,
  );

  const status = git(["status", "--porcelain"], repoRoot).trim();
  assert.equal(status, "", "working tree must be clean after the commit");
});

test("commitHarvest: dry run never commits and says why", async () => {
  const repoRoot = await initRepo();
  await mkdir(join(repoRoot, "out"), { recursive: true });
  await writeFile(join(repoRoot, "out", "f.json"), "{}\n");

  const result = commitHarvest({ repoRoot, outDirRel: "out", count: 1, dryRun: true });
  assert.equal(result.committed, false);
  assert.equal(result.reason, "dry run");

  // No commit exists yet in this fresh repo — HEAD must still be unresolvable.
  assert.throws(() => git(["rev-parse", "HEAD"], repoRoot), /HEAD/);
});

test("commitHarvest: nothing staged reports 'nothing to commit', no commit made", async () => {
  const repoRoot = await initRepo();
  await mkdir(join(repoRoot, "out"), { recursive: true });
  await writeFile(join(repoRoot, "out", "f.json"), "{}\n");
  git(["add", "--", "out"], repoRoot);
  git(["commit", "-q", "-m", "seed"], repoRoot);
  const before = git(["rev-parse", "HEAD"], repoRoot).trim();

  // Second run over an unchanged out dir: staged tree matches HEAD exactly.
  const result = commitHarvest({ repoRoot, outDirRel: "out", count: 0, dryRun: false });
  assert.equal(result.committed, false);
  assert.equal(result.reason, "nothing to commit");

  const after = git(["rev-parse", "HEAD"], repoRoot).trim();
  assert.equal(after, before, "HEAD must not move when there is nothing to commit");
});

test("commitHarvest: a repoRoot that is not a git repo returns committed:false with a non-empty reason", async () => {
  const dir = await tmpDir("harvest-commit-nogit-");
  await mkdir(join(dir, "out"), { recursive: true });
  await writeFile(join(dir, "out", "f.json"), "{}\n");

  const result = commitHarvest({ repoRoot: dir, outDirRel: "out", count: 1, dryRun: false });
  assert.equal(result.committed, false);
  assert.ok(result.reason && result.reason.length > 0, "reason must be a non-empty string");
});
