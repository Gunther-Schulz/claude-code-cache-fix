import { join } from "node:path";
import { homedir } from "node:os";

// The Claude Code config root. Honors CLAUDE_CONFIG_DIR, which Claude Code reads
// to relocate its config root away from the default ~/.claude. Without this,
// every proxy's state (quota-status, usage.jsonl, session-mirrors, snapshots,
// oauth) is hardcoded to ~/.claude, so running one proxy per config dir makes
// them clobber each other's account.json. Falls back to ~/.claude when unset.
// Read live (not cached) for test isolation, mirroring config.mjs.
//
// The tripwire: under the node test runner (NODE_TEST_CONTEXT — set by node in
// every --test child process, absent everywhere else) an un-isolated call
// throws instead of resolving to the operator's live ~/.claude. The isolation
// harness (tools/suite-config-root.mjs) rides `npm test` via --import, and
// test/config-root-isolation.test.mjs guards whole-suite bypasses — but a bare
// single-file `node --test test/<file>.mjs`, the natural diagnostic
// invocation, bypassed both silently and is exactly how state files leaked
// into the live ~/.claude on 2026-08-05 (reproduced under the pre-tripwire
// code while building this: 7 files from one bare run of the
// fresh-session-sort tests). This is the choke point every stateful extension
// already passes through, so the leak dies here for every caller. Loudness is
// caller-dependent, stated honestly: a direct caller gets the throw; the
// stateful extensions wrap all state I/O in fail-open catches (deliberately —
// production must never lose a request to a state error), so under them the
// throw degrades to no-op persistence, visible under CACHE_FIX_DEBUG. The
// guarded PROPERTY is that no test invocation can reach the operator's live
// ~/.claude through this function, and that holds for both caller shapes.
// Production is untouched: NODE_TEST_CONTEXT is never set there.
export function claudeHome() {
  if (process.env.NODE_TEST_CONTEXT && !process.env.CLAUDE_CONFIG_DIR && !process.env.CACHE_FIX_TEST_HOME) {
    throw new Error(
      "claudeHome() under the test runner without an isolated config root — this call would "
        + "write into the operator's live ~/.claude. Run `npm test`, or for a single file: "
        + "`node --test --import ./tools/suite-config-root.mjs <file>`.",
    );
  }
  return process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
}
