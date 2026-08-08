// The one place this repo creates temporary directories.
//
// DEFINITION (what "correct" means here, so the checks below are not written
// from the implementation): a process that uses this helper leaves NOTHING
// under the OS temp root once it has exited. Not "usually", and not "when the
// happy path is taken" — the guarantee holds for a run that throws, a run that
// calls process.exit(), and a run that is terminated by SIGINT/SIGTERM/SIGHUP.
// The one case it cannot hold for is SIGKILL, which runs no code at all; that
// residue is what gate-live's leftover signal exists to report.
//
// WHY THIS EXISTS. Measured 2026-08-08: /tmp here is a 31 GB tmpfs and it
// reached 100% with 31,108 top-level directories — 7,024 `fixture-verd*`,
// ~8,000 `bt-*`, plus `census-*`, `harvest-*`, `verdict-*`, `ledger-*`,
// `mitigation-output-*` and more. Every one was an `mkdtemp` whose creator
// never removed it. The ENOSPC then broke unrelated tooling machine-wide while
// the test suite stayed GREEN — the silent-failure class — and it produced five
// consecutive runs of ONE commit returning 0, 3, 95, 525 and 528 failures,
// which read as a broken build and was first misdiagnosed as concurrency
// (docs/dev-loop.md, "A failure count that swings by hundreds").
//
// WHY A PER-RUN PARENT rather than per-call cleanup. Per-call cleanup is what
// the leaking sites already tried: several tools do `rm(scratch)` on the happy
// path and skip it on every throw, and `fixture-verdict-identity.mjs` had a
// `finally` that restored env vars and forgot the directory. One parent per
// process, removed once at exit, makes the guarantee independent of how many
// call sites there are and of which of them remembered — a call site can only
// opt IN to the leak now, by not using this module. `test/no-raw-mkdtemp.test.mjs`
// is the writer-side guard that keeps that from happening quietly.
//
// NOT A REAPER, deliberately. This module never deletes anything it did not
// create in this process. A stale directory from someone else's run may belong
// to a run that is still going (a long replay legitimately outlives an hour),
// and a helper that swept the temp root on startup would be a destructive
// sweep racing every concurrent lane on this machine. Reporting is gate-live's
// job (`staleRunRoots` below); deleting stays a human decision.
import { mkdtempSync, rmSync, readdirSync, statSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Every directory this repo creates under the temp root is a child of a parent
// carrying this prefix, which is what makes the leftover scan below a closed
// question rather than a list of prefixes someone has to remember to extend.
export const RUN_ROOT_PREFIX = "cache-fix-run-";

let runRoot = null;
let removed = false;

// Cleanup must not throw: it runs from an `exit` handler, where the only thing
// a throw can accomplish is masking the real result the process was about to
// report. The third answer belongs to the caller, not to teardown.
function removeRunRoot() {
  if (!runRoot || removed) return;
  removed = true;
  try {
    rmSync(runRoot, { recursive: true, force: true });
  } catch {
    // Nothing useful to do at exit time.
  }
}

function ensureRunRoot() {
  if (runRoot) return runRoot;
  runRoot = mkdtempSync(join(tmpdir(), RUN_ROOT_PREFIX));
  removed = false;

  // `exit` covers the ordinary paths AND the crash paths: node runs exit
  // handlers after an uncaught exception and after an unhandled rejection, so
  // "the run threw" needs no separate arm. It must be synchronous — hence
  // rmSync — because async work at exit time never runs.
  process.on("exit", removeRunRoot);

  // Signals are the arm `exit` does NOT cover, and they are not hypothetical:
  // gate-live and harvest run under systemd timers, and systemd stops a unit
  // with SIGTERM. `once` removes the listener before invoking it, so the
  // explicit exit below is the only termination path — we re-exit with the
  // conventional 128+signal code rather than re-raising, because that is
  // predictable regardless of what else has attached a listener.
  const SIGNAL_EXIT = { SIGINT: 130, SIGTERM: 143, SIGHUP: 129 };
  for (const [sig, code] of Object.entries(SIGNAL_EXIT)) {
    process.once(sig, () => {
      removeRunRoot();
      process.exit(code);
    });
  }
  return runRoot;
}

/**
 * Async temp directory, inside this process's run root.
 * Replaces `await mkdtemp(join(tmpdir(), prefix))`.
 * @param {string} prefix e.g. "cache-fix-replay-"
 * @returns {Promise<string>} absolute path to a fresh directory
 */
export async function tmpDir(prefix) {
  return mkdtemp(join(ensureRunRoot(), prefix));
}

/**
 * Sync temp directory, inside this process's run root.
 * Replaces `mkdtempSync(join(tmpdir(), prefix))`.
 * @param {string} prefix e.g. "bt-"
 * @returns {string} absolute path to a fresh directory
 */
export function tmpDirSync(prefix) {
  return mkdtempSync(join(ensureRunRoot(), prefix));
}

/**
 * This process's run root, or null if nothing has been created yet. Exported
 * for the tests that assert containment; callers have no reason to want it.
 */
export function currentRunRoot() {
  return runRoot;
}

/**
 * Remove this process's run root now, rather than at exit. For a long-lived
 * process that wants its scratch back mid-run; idempotent, and the exit
 * handler stays registered so a later tmpDir() call is still covered.
 */
export function cleanupRunRoot() {
  removeRunRoot();
  runRoot = null;
}

/**
 * Run roots left behind by OTHER runs — the SIGKILL residue, and the tell that
 * a call site has stopped using this module. Reads only; deletes nothing.
 *
 * @param {object} [opts]
 * @param {number} [opts.olderThanMs] age threshold, default 1 hour. A run root
 *   younger than this may well belong to a run that is still going, so it is
 *   not evidence of anything.
 * @param {string} [opts.root] temp root to scan, default os.tmpdir().
 * @param {number} [opts.now] clock injection point, so the test does not have
 *   to sleep an hour to exercise the threshold.
 * @returns {{count: number, dirs: string[], scanned: boolean, reason: string|null}}
 *   `scanned: false` with a reason is the third answer — the temp root could
 *   not be read, which is neither clean nor dirty and must not be reported as
 *   a count of zero.
 */
export function staleRunRoots({ olderThanMs = 60 * 60 * 1000, root = tmpdir(), now = Date.now() } = {}) {
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch (err) {
    return { count: 0, dirs: [], scanned: false, reason: `cannot read ${root}: ${err.message}` };
  }
  const dirs = [];
  for (const e of entries) {
    if (!e.isDirectory() || !e.name.startsWith(RUN_ROOT_PREFIX)) continue;
    const full = join(root, e.name);
    if (full === runRoot) continue; // our own, still in use
    try {
      if (now - statSync(full).mtimeMs >= olderThanMs) dirs.push(full);
    } catch {
      // Vanished between readdir and stat — a concurrent run cleaning up after
      // itself, which is the healthy case and not a finding.
    }
  }
  dirs.sort();
  return { count: dirs.length, dirs, scanned: true, reason: null };
}
