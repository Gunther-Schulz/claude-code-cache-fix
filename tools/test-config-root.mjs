// Suite-wide isolation of the home directory every on-disk path derives from.
//
// DEFINITION: a unit test must never write into the operator's live `~`. Every
// stateful extension in this proxy resolves its paths through `claudeHome()`
// (proxy/claude-home.mjs) — `CLAUDE_CONFIG_DIR` when set, otherwise
// `os.homedir()/.claude` — so a test that drives such an extension without
// isolating either one writes real files into the real config root, silently,
// on every `npm test`.
//
// Found 2026-08-05 by counting rather than by reading: fresh-session-sort's
// new relocation memory left 8 state files in `~/.claude/cache-fix-snapshots`
// (a directory already holding ~9,800 files from five writers) after one suite
// run. The extension was correct; what was missing is that the SUITE had no
// default root, so each test file had to remember one, and the files that do
// remember mostly set it only inside the cases that assert on file contents.
//
// WHY `HOME` AND NOT `CLAUDE_CONFIG_DIR`: the repo's established isolation
// idiom is overriding HOME (proxy-quota-status-pipeline, proxy-rate-limit-log,
// proxy-cache-telemetry and five more do exactly that, per test). A global
// CLAUDE_CONFIG_DIR would take PRECEDENCE over those overrides and break them
// — measured: 75 failures, all of the form "the fake home was ignored". Setting
// HOME instead composes with both idioms: a file that overrides HOME shadows
// this one the same way it shadows the real home, and a file that sets
// CLAUDE_CONFIG_DIR still wins outright.
//
// Wired as `node --test --import ./tools/test-config-root.mjs` (package.json),
// so it runs once per test-file process before any test module loads. Neither
// variable is touched when it is already set — this supplies the DEFAULT and
// never overrides a deliberate choice.
//
// It lives in `tools/` rather than `test/` because node's runner treats every
// file under `test/` as a test file: from there it was ALSO executed as a
// (zero-assertion) test, inflating the suite count by one and reading in the
// output as if the harness bootstrap were a test that passed.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ONE home per test-file process TREE, not per process. `child_process.fork`
// propagates the parent's execArgv, so a forked child re-runs this very module
// — and a second `mkdtemp` there would hand the child a DIFFERENT home from the
// test that spawned it. Measured, not reasoned: proxy-wrapper.test.mjs forks
// `proxy/server.mjs`, which generated its MITM CA under
// `/tmp/cache-fix-test-home-hgkYoY/...` while the wrapper looked for it under
// `/tmp/cache-fix-test-home-FVKwyd/...` — five failures whose message named two
// temp homes on adjacent lines. (A plain `execFile` of node does NOT re-run
// this module: no NODE_OPTIONS is involved, which is why the first hypothesis
// — env-propagated node options — was wrong and the probe said so.)
//
// The marker is what makes the tree agree: a descendant that re-runs this
// module finds the root in the environment and adopts it instead of minting
// one, and only the process that CREATED the root removes it.
const MARKER = "CACHE_FIX_TEST_HOME";

if (!process.env.CLAUDE_CONFIG_DIR) {
  const inherited = process.env[MARKER];
  const root = inherited || mkdtempSync(join(tmpdir(), "cache-fix-test-home-"));
  process.env[MARKER] = root;
  process.env.HOME = root;
  // Windows' equivalent, for the same reason — `os.homedir()` reads it there.
  process.env.USERPROFILE = root;
  // The XDG roots (proxy/xdg-dirs.mjs) default to `$HOME/.local/...`, so the
  // redirected HOME above already isolates them — but ONLY while the ambient
  // XDG_DATA_HOME / XDG_STATE_HOME are absent, because those take precedence
  // over HOME and would point straight back at the operator's live data. They
  // are DELETED rather than pointed into the temp root on purpose: setting
  // them would take precedence over the per-case `env.HOME` overrides that
  // eight test files use, which is the same shape that made a global
  // CLAUDE_CONFIG_DIR here produce 75 failures. Deleting them composes — a
  // file that overrides HOME moves the XDG roots with it, exactly as it moves
  // claudeHome(). A test that wants explicit XDG roots sets them itself and
  // announces it with CACHE_FIX_TEST_XDG.
  delete process.env.XDG_DATA_HOME;
  delete process.env.XDG_STATE_HOME;
  if (!inherited) {
    // Best-effort cleanup, by the creator only. `exit` is synchronous-only,
    // hence the sync remover; a leftover directory under the OS temp root is a
    // nuisance, while a leftover file under the real `~/.claude` is the defect
    // this exists to prevent.
    process.on("exit", () => {
      try {
        rmSync(root, { recursive: true, force: true });
      } catch {
        // Nothing to do at exit time, and throwing here would mask the real
        // test result — the third answer belongs to the tests, not to teardown.
      }
    });
  }
}
