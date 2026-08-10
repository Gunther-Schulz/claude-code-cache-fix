#!/usr/bin/env node
// The suite's own run-persistence: naming, retention, and the `npm test`
// wrapper, all in one file (write-boundary: one new tools/ module).
//
// WHY THIS EXISTS. BACKLOG.md, "the suite has at least one INTERMITTENT
// test": four consecutive full runs of ONE commit returned 2642/1-fail, then
// three clean runs, and the failing test was never identified — the run
// streamed to a terminal, the summary counters were read, and by the time the
// failure mattered the output was gone. Two further runs were then spent
// grepping output that no longer existed. This persists every run's full
// output to a file and prints its path in the summary line, unconditionally
// — a path printed only on failure is unavailable exactly when someone wants
// to compare a green run against a red one.
//
// NOT NAMED `test-*` OR `*-test.mjs` ON PURPOSE. Node's `--test` runner
// auto-discovers files matching `test-*`, `*-test`, `*_test`, `*.test`
// anywhere under the scanned tree (not only `test/`) and runs each in its
// own subprocess with `argv[1]` set to that file — which is `isMain` for
// this module's own dispatch. A first version named `tools/test-runner.mjs`
// / `tools/test-run-log.mjs` was swept into exactly that: node's discovery
// spawned `tools/test-runner.mjs` as a "test", its unguarded top level ran,
// and it recursively spawned ANOTHER full suite as a side effect of merely
// being discovered (measured: reported as a passing "test" in 108ms while a
// real nested suite run was still in flight, writing to its own persisted
// log). Renaming out of the glob is the fix that cannot be forgotten later;
// an `isMain` guard alone would only have hidden the collision for the
// commands it happened to think to check.
//
// TWO PRODUCERS share this module's naming/retention:
//   `npm test` (via `run`, below)      — every invocation, pass or fail.
//   `tools/git-hooks/pre-push`         — failures only, via the CLI (a
//                                        `/bin/sh` script has no ESM import).
//
// WHERE THE FILES GO, and why not `~/.claude` or the repo tree: this fork's
// XDG state root (`proxy/xdg-dirs.mjs`, `statePath`) — never a hardcoded
// `~/.local/state`, and never `~/.claude`, which costs a permission dialog on
// every read/write (environment bindings, operator corpus).
//
// RETENTION. A log directory that grows without bound is a booked defect in
// this repo already (docs/dev-loop.md, the /tmp mkdtemp leak) — do not create
// another. Each LABEL prunes independently to its own last 10: otherwise a
// burst of ordinary `npm test` runs could evict the one pre-push failure log
// nobody was watching for, which is the exact evidence this exists to keep.
//
// NAMING. One file per run, PID-included, so two concurrent runs (this repo
// has a measured collision class from shared default output filenames
// between parallel agents) cannot collide.
import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { statePath } from "../proxy/xdg-dirs.mjs";

export const DEFAULT_KEEP = 10;

/** The shared directory every producer writes into. Created on first use. */
export function testRunDir() {
  const dir = statePath("test-runs");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

const SAFE_LABEL = /^[a-z0-9-]+$/;

/**
 * A fresh, collision-proof path for one run's persisted output.
 * @param {string} label e.g. "npm-test" or "pre-push" — identifies the
 *   producer, and is also the pruning key (see pruneRuns).
 * @param {number} [pid] override for the PID embedded in the name — the
 *   pre-push hook passes its own shell PID ($$) so the file is traceable to
 *   that invocation, since the CLI below runs as a throwaway process.
 * @returns {string} absolute path, not yet created.
 */
export function nextLogPath(label, pid = process.pid) {
  if (!SAFE_LABEL.test(label)) {
    throw new Error(`suite-run-log: label must match ${SAFE_LABEL}, got ${JSON.stringify(label)}`);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return join(testRunDir(), `run-${stamp}-${pid}-${label}.log`);
}

/**
 * Keep only the newest `keep` files for one label; delete the rest. Scoped
 * per-label on purpose (see header) — this never touches another producer's
 * files. Read-then-delete, never a directory sweep: a file that vanishes
 * between listing and deletion (another process racing the same prune) is
 * not an error here.
 * @param {string} label same key passed to nextLogPath.
 * @param {number} [keep] default 10.
 * @returns {string[]} paths removed, for callers/tests that want to assert.
 */
export function pruneRuns(label, keep = DEFAULT_KEEP) {
  const dir = testRunDir();
  const suffix = `-${label}.log`;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const matches = entries
    .filter((e) => e.isFile() && e.name.startsWith("run-") && e.name.endsWith(suffix))
    .map((e) => join(dir, e.name));
  if (matches.length <= keep) return [];
  const withTimes = matches.map((p) => {
    try {
      return { path: p, mtime: statSync(p).mtimeMs };
    } catch {
      return { path: p, mtime: -Infinity }; // vanished — sorts to the prune end
    }
  });
  withTimes.sort((a, b) => b.mtime - a.mtime); // newest first
  const toRemove = withTimes.slice(keep);
  const removed = [];
  for (const { path } of toRemove) {
    try {
      unlinkSync(path);
      removed.push(path);
    } catch {
      // Vanished between listing and removal — another prune got there first.
    }
  }
  return removed;
}

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * The `npm test` entry point: spawn the real suite, tee its output live to
 * the console AND to a persisted file, prune old runs for this label, print
 * the path unconditionally, and exit with the child's own exit code — never
 * swallowed, since the pre-push hook and every dispatched lane in this repo
 * depend on it.
 * @param {string[]} passthroughArgs forwarded verbatim after the isolation
 *   import, so `npm test -- test/foo.test.mjs` keeps working exactly as it
 *   did before this wrapper existed (a real, used pattern — see the
 *   comment in tools/suite-config-root.mjs and this repo's own PR reviews).
 * @returns {Promise<never>} never resolves; always process.exit()s.
 */
export function run(passthroughArgs = []) {
  const label = "npm-test";
  const logPath = nextLogPath(label);
  const logStream = createWriteStream(logPath, { flags: "a" });

  const child = spawn(
    process.execPath,
    [
      "--test",
      "--import",
      join(REPO_ROOT, "tools", "suite-config-root.mjs"),
      ...passthroughArgs,
    ],
    { cwd: REPO_ROOT, stdio: ["inherit", "pipe", "pipe"] },
  );

  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    logStream.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
    logStream.write(chunk);
  });

  child.on("error", (err) => {
    logStream.end();
    process.stderr.write(`suite-run-log: failed to spawn the suite: ${err.message}\n`);
    process.exit(1);
  });

  child.on("close", (code, signal) => {
    logStream.end(() => {
      pruneRuns(label);
      const status = code === 0 ? "PASS" : "FAIL";
      // Printed unconditionally — green or red — so a green run's output is
      // available to diff against a later red one.
      process.stdout.write(`suite-run-log: full output persisted (${status}): ${logPath}\n`);
      process.exit(code !== null ? code : signal ? 1 : 1);
    });
  });
}

// CLI dispatch. `run [...passthrough]` is what `npm test` invokes.
// `next-path <label> [pid]` and `prune <label>` are what the pre-push hook
// (a `/bin/sh` script, no ESM import) calls to share this exact naming and
// retention logic instead of re-implementing it.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "run") {
    run(rest);
  } else if (cmd === "next-path" && rest[0]) {
    const [label, pidArg] = rest;
    process.stdout.write(`${pidArg ? nextLogPath(label, Number(pidArg)) : nextLogPath(label)}\n`);
  } else if (cmd === "prune" && rest[0]) {
    pruneRuns(rest[0]);
  } else {
    process.stderr.write(
      "usage: node tools/suite-run-log.mjs run [...passthrough] "
        + "| next-path <label> [pid] | prune <label>\n",
    );
    process.exit(1);
  }
}
