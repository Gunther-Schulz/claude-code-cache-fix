// tools/tmpdir.mjs — the temp-directory helper.
//
// The guarantee under test is stated in the module: a process that uses the
// helper leaves NOTHING under the OS temp root once it has exited. That is a
// claim about a process that has already died, so most of these bites spawn a
// real child and look at the disk afterwards. Asserting that a cleanup handler
// was REGISTERED would be a shape check standing in for a content check — the
// exact substitution docs/dev-loop.md warns about — because a registered
// handler that throws, or that runs before the directory exists, leaves the
// same residue as no handler at all.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, utimesSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpDir, tmpDirSync, currentRunRoot, staleRunRoots, RUN_ROOT_PREFIX } from "../tools/tmpdir.mjs";

const HELPER = join(dirname(fileURLToPath(import.meta.url)), "..", "tools", "tmpdir.mjs");
const HOUR = 60 * 60 * 1000;

// A pid that is definitely not running. Scanning DOWN from the top of the pid
// space rather than picking a constant: a constant would silently become a live
// process's pid on a busy machine and turn the "dead" arm into an "alive" one.
function deadPid() {
  for (let pid = 4194300; pid > 4190000; pid--) {
    try {
      process.kill(pid, 0);
    } catch (err) {
      if (err.code === "ESRCH") return pid;
    }
  }
  throw new Error("no dead pid found");
}

// Runs `body` in a child with TMPDIR pointed at `tmp`, and returns whatever the
// child printed. The child prints its run root so the parent can check the disk
// after it has exited — which is the only moment the guarantee is about.
function inChild(tmp, body, { expectFailure = false } = {}) {
  const src = `import { tmpDir, tmpDirSync, currentRunRoot } from ${JSON.stringify(HELPER)};\n${body}`;
  try {
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", src], {
      env: { ...process.env, TMPDIR: tmp },
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    assert.ok(!expectFailure, "child was expected to fail and did not");
    return out.trim();
  } catch (e) {
    assert.ok(expectFailure, `child failed unexpectedly: ${e.stderr || e.message}`);
    return (e.stdout || "").trim();
  }
}

test("a temp dir lives inside the run root, and the run root is under the temp root", () => {
  const a = tmpDirSync("bite-sync-");
  const b = tmpDirSync("bite-sync-");
  const root = currentRunRoot();
  assert.ok(root.includes(RUN_ROOT_PREFIX), `run root is prefixed: ${root}`);
  assert.ok(a.startsWith(root + "/"), `${a} is inside ${root}`);
  assert.ok(b.startsWith(root + "/"), `${b} is inside ${root}`);
  assert.notEqual(a, b, "each call gets its own directory");
  assert.ok(existsSync(a) && existsSync(b));
});

test("the async form behaves the same", async () => {
  const d = await tmpDir("bite-async-");
  assert.ok(d.startsWith(currentRunRoot() + "/"));
  assert.ok(existsSync(d));
});

test("BITE — a child that exits normally leaves NOTHING behind", () => {
  const tmp = tmpDirSync("bite-clean-exit-");
  const printed = inChild(tmp, `
    const d = tmpDirSync("work-");
    console.log(JSON.stringify({ root: currentRunRoot(), dir: d }));
  `);
  const { root, dir } = JSON.parse(printed);
  assert.ok(root.startsWith(tmp + "/"), "the child honoured TMPDIR");
  assert.equal(existsSync(dir), false, "the work dir is gone");
  assert.equal(existsSync(root), false, "the run root is gone");
  assert.deepEqual(readdirSync(tmp), [], "nothing at all is left under the temp root");
});

test("BITE — a child that THROWS still leaves nothing behind", () => {
  // The arm that matters most: per-call cleanup is what the leaking code
  // already had, and it is precisely the throw path where it was skipped.
  const tmp = tmpDirSync("bite-throw-");
  const printed = inChild(tmp, `
    const d = tmpDirSync("work-");
    console.log(JSON.stringify({ root: currentRunRoot(), dir: d }));
    throw new Error("boom");
  `, { expectFailure: true });
  const { root } = JSON.parse(printed);
  assert.equal(existsSync(root), false, "the run root is gone after an uncaught throw");
  assert.deepEqual(readdirSync(tmp), [], "nothing is left under the temp root");
});

test("BITE — a child killed by SIGTERM still cleans up", () => {
  // gate-live and harvest run under systemd timers, which stop units with
  // SIGTERM. `exit` handlers do not run for a signal, so this arm is the one
  // the explicit signal handlers exist for.
  const tmp = tmpDirSync("bite-sigterm-");
  const printed = inChild(tmp, `
    const d = tmpDirSync("work-");
    console.log(JSON.stringify({ root: currentRunRoot(), dir: d }));
    process.kill(process.pid, "SIGTERM");
    setTimeout(() => {}, 5000);
  `, { expectFailure: true });
  const { root } = JSON.parse(printed);
  assert.equal(existsSync(root), false, "the run root is gone after SIGTERM");
  assert.deepEqual(readdirSync(tmp), [], "nothing is left under the temp root");
});

// --- staleRunRoots: the four answers it has to separate ---

function plant(root, pid, ageMs) {
  const dir = join(root, `${RUN_ROOT_PREFIX}${pid}-PLANT`);
  mkdirSync(dir, { recursive: true });
  const when = (Date.now() - ageMs) / 1000;
  utimesSync(dir, when, when);
  return dir;
}

test("staleRunRoots FIRES on an old run root whose process is dead", () => {
  const root = tmpDirSync("stale-fires-");
  const dir = plant(root, deadPid(), 2 * HOUR);
  const r = staleRunRoots({ root });
  assert.equal(r.scanned, true);
  assert.deepEqual(r.dirs, [dir]);
  assert.equal(r.count, 1);
});

test("staleRunRoots is SILENT on a young run root", () => {
  // The age arm. Without it every concurrent run would be reported as residue.
  const root = tmpDirSync("stale-young-");
  plant(root, deadPid(), 5 * 60 * 1000);
  assert.equal(staleRunRoots({ root }).count, 0);
});

test("staleRunRoots is SILENT on an old run root whose process is still ALIVE", () => {
  // The liveness arm, and the reason the pid is in the directory name at all:
  // a sweep over a large corpus legitimately outlives the hour, and a check
  // that fires on legitimate work trains its reader to ignore red.
  const root = tmpDirSync("stale-alive-");
  plant(root, process.pid, 2 * HOUR);
  assert.equal(staleRunRoots({ root }).count, 0);
});

test("staleRunRoots answers COULD NOT VERIFY when the temp root cannot be read", () => {
  // The third answer. An unreadable temp root is neither clean nor dirty, and
  // reporting it as a count of 0 would be an absence wearing a verdict's
  // clothes — which is why gate-live's ok requires `scanned` as well.
  const gone = join(tmpDirSync("stale-unreadable-"), "does-not-exist");
  const r = staleRunRoots({ root: gone });
  assert.equal(r.scanned, false);
  assert.equal(r.count, 0);
  assert.match(r.reason, /cannot read/);
});

test("staleRunRoots ignores directories that are not run roots", () => {
  const root = tmpDirSync("stale-foreign-");
  const foreign = join(root, "someone-elses-dir");
  mkdirSync(foreign);
  utimesSync(foreign, 0, 0);
  assert.equal(staleRunRoots({ root }).count, 0, "only this repo's run roots are ours to report");
  rmSync(foreign, { recursive: true, force: true });
});
