// The suite's own isolation, checked by the suite.
//
// DEFINITION, written before the assertion: no test process may resolve
// `claudeHome()` to the operator's live config root. Every stateful extension
// here derives its on-disk paths from that function, so a test run without an
// isolated root writes real files into the real `~/.claude` — silently, and
// only visible to someone who thinks to count files afterwards.
//
// WHY A GUARD AND NOT JUST THE HARNESS. The isolation lives in
// `tools/test-config-root.mjs`, wired through the `npm test` script. That
// covers the pre-push hook and anyone typing `npm test` — and NOT a bare
// `node --test`, which is what a developer reaches for to run one file, and
// which is exactly how this leaked on 2026-08-05: eight relocation-memory
// state files landed in the live `~/.claude/cache-fix-snapshots` from a
// diagnostic run, AFTER the isolation had been added and verified. Node 26
// can read `node.config.json`, but only behind
// `--experimental-default-config-file`, so it cannot carry the flag for an
// invocation that does not already pass one (measured: `node
// --experimental-default-config-file` is accepted, plain `node` ignores the
// file). An unknown that fails loudly catches what a silent bypass hides.
//
// The predicate is the HARNESS's presence, not a path value: under isolation
// `os.homedir()` already IS the temp root, so comparing it against "the real
// home" would compare the fake to itself. The marker is set by the module and
// inherited by every child process in the tree, and an explicitly chosen
// CLAUDE_CONFIG_DIR (what several test files set per case) counts too.
import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";

import { claudeHome } from "../proxy/claude-home.mjs";

test("BITE — the suite runs with an isolated config root, or it says so", () => {
  const marker = process.env.CACHE_FIX_TEST_HOME;
  const explicit = process.env.CLAUDE_CONFIG_DIR;
  assert.ok(
    marker || explicit,
    "no isolated config root — this run would write into the operator's live ~/.claude. "
      + "Run the suite as `npm test` (which loads tools/test-config-root.mjs), or for a single "
      + "file: `node --test --import ./tools/test-config-root.mjs <file>`.",
  );
  if (!explicit) {
    assert.ok(
      claudeHome().startsWith(tmpdir()),
      `the isolated root must live under the OS temp dir, got ${claudeHome()}`,
    );
  }
});
