import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { claudeHome } from "./claude-home.mjs";

// The two roots every artifact this repo OWNS resolves under.
//
//   xdgData()   $XDG_DATA_HOME/cache-fix    (~/.local/share/cache-fix)
//   xdgState()  $XDG_STATE_HOME/cache-fix   (~/.local/state/cache-fix)
//
// WHY THIS EXISTS, and why it is not `claudeHome()`. `~/.claude/` is Claude
// Code's CONFIG root. This proxy's captures, snapshots, ledgers and logs are
// our DATA, and they only lived there by habit — Claude Code itself has no
// config/data split, but we are not Claude Code. The harness protects that
// directory by PATH SHAPE, so every read and write of our own artifacts, by
// the operator's session and by every dispatched agent, raised a
// sensitive-file prompt. On 2026-08-07 one such prompt was DENIED mid-task and
// the session lost the work in flight. Moving the data out removes the prompt
// for good without touching a security control — the repair the box demands: a
// guard firing on legitimate work gets the work moved, never a loosened
// predicate. `tools/alias-claim.mjs` moved first and this module generalises
// its shape.
//
// THE SPLIT RULE, stated so it is reviewable: unrecoverable if lost -> DATA;
// regenerable, or merely expensive to lose -> STATE. So the capture corpus and
// the MITM CA keys are data; every snapshot, ledger, event log and status file
// is state.
//
// It lives in `proxy/` rather than `tools/` because seven files under `tools/`
// already import from `../proxy/`, and a second copy under `tools/` would be a
// path resolver able to silently diverge from the one production uses.
//
// Resolved per call, never cached at module load, for the same reason
// claude-home.mjs and alias-claim.mjs are: a caller that repoints a root AFTER
// importing this module must be obeyed, and a constant captured at import
// silently ignores it — which is a test that certifies nothing while writing
// to the real root.
//
// THE TRIPWIRE, carried over from claudeHome() unchanged in intent: under the
// node test runner (NODE_TEST_CONTEXT — set by node in every --test child
// process, absent everywhere else) an un-isolated call throws instead of
// resolving to the operator's live ~/.local/share or ~/.local/state. Two
// signals count as isolated, and they are named here because the brief left
// the naming to this module:
//
//   CACHE_FIX_TEST_HOME  set by the suite harness (tools/test-config-root.mjs)
//                        when it mints the temp HOME. Because the roots below
//                        default to $HOME/.local/..., a redirected HOME
//                        already isolates them — but only once the ambient
//                        XDG_DATA_HOME / XDG_STATE_HOME are out of the way,
//                        which is why that harness now clears them. The two
//                        facts are load-bearing together; neither alone.
//   CACHE_FIX_TEST_XDG   the explicit acknowledgment, for a caller that
//                        isolated the XDG roots itself (it sets
//                        XDG_DATA_HOME / XDG_STATE_HOME at temp paths and
//                        says so here). This is the counterpart of
//                        CLAUDE_CONFIG_DIR's role for claudeHome().
//
// Loudness is caller-dependent and stated honestly, exactly as it is there: a
// direct caller gets the throw; the stateful extensions wrap all state I/O in
// fail-open catches (deliberately — production must never lose a request to a
// state error), so under them the throw degrades to no-op persistence, visible
// under CACHE_FIX_DEBUG. The guarded PROPERTY is that no test invocation can
// reach the operator's live XDG roots through this module. Production is
// untouched: NODE_TEST_CONTEXT is never set there.
function assertIsolated(what) {
  if (
    process.env.NODE_TEST_CONTEXT
    && !process.env.CACHE_FIX_TEST_HOME
    && !process.env.CACHE_FIX_TEST_XDG
  ) {
    throw new Error(
      `${what}() under the test runner without an isolated XDG root — this call would `
        + "write into the operator's live ~/.local. Run `npm test`, or for a single file: "
        + "`node --test --import ./tools/test-config-root.mjs <file>`.",
    );
  }
}

export function xdgData() {
  assertIsolated("xdgData");
  return join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "cache-fix");
}

export function xdgState() {
  assertIsolated("xdgState");
  return join(process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"), "cache-fix");
}

/** `xdgData()` with path segments appended. */
export function dataPath(...segments) {
  return join(xdgData(), ...segments);
}

/** `xdgState()` with path segments appended. */
export function statePath(...segments) {
  return join(xdgState(), ...segments);
}

// LEGACY FALLBACK — LOUD, AND FOR ONE TRANSITION ONLY.
//
// REMOVE THIS AND EVERY `legacyReadPath(` CALL after the transition. Grep for
// the function name; that is the whole deletion. It exists so a reader run
// against a machine whose data has not been moved yet still finds it, and it
// warns every time so the state cannot be mistaken for the new normal.
//
// WRITERS NEVER CALL THIS. A writer that fell back would append to the legacy
// file while readers preferred the new one — two stores diverging, silently,
// which is precisely the failure this is shaped to avoid. Writers resolve the
// new path unconditionally; only readers consult the legacy location.
//
// The three answers, deliberately (dev-loop, "A checker has THREE answers"):
// the new path when it exists; the legacy path WITH a warning when only that
// exists; and the new path when NEITHER exists — an absent artifact is the
// caller's business to report, and inventing a third location here would hide
// it.
const warned = new Set();

export function legacyReadPath(newPath, legacyName) {
  if (existsSync(newPath)) return newPath;
  const legacy = join(claudeHome(), legacyName);
  if (!existsSync(legacy)) return newPath;
  if (!warned.has(legacy)) {
    warned.add(legacy);
    process.emitWarning(
      `cache-fix: reading the LEGACY location ${legacy} because ${newPath} does not exist. `
        + "Run `node tools/xdg-migrate.mjs --apply` to move it. This fallback is removed "
        + "after one transition.",
      "CacheFixLegacyPathWarning",
    );
  }
  return legacy;
}
