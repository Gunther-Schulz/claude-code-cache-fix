import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { claudeHome } from "./claude-home.mjs";

// The two roots every artifact this repo OWNS resolves under.
//
//   xdgData()   $XDG_DATA_HOME/cache-fix    (~/.local/share/cache-fix on Linux)
//   xdgState()  $XDG_STATE_HOME/cache-fix   (~/.local/state/cache-fix on Linux)
//
// WHY A SEPARATE ROOT FROM CLAUDE CODE'S CONFIG DIRECTORY, and why it is not
// `claudeHome()`. A config directory is for configuration; captures,
// snapshots, ledgers and logs are DATA and STATE, not config, and platform
// conventions exist for exactly this split. `~/.claude/` is Claude Code's
// CONFIG root — Claude Code itself has no config/data split, but we are not
// Claude Code — and a user who has set `XDG_DATA_HOME` / `XDG_STATE_HOME`
// expects it honoured, not overridden by this tool's own opinion of where
// things belong.
//
// FORK-LOCAL NOTE, true on this deployment and not upstream, kept for the
// history: the harness protects `~/.claude/` by PATH SHAPE, so every read and
// write of our own artifacts there, by the operator's session and by every
// dispatched agent, raised a sensitive-file prompt. On 2026-08-07 one such
// prompt was DENIED mid-task and the session lost the work in flight. Moving
// the data out removes the prompt for good without touching a security
// control — the repair the box demands: a guard firing on legitimate work
// gets the work moved, never a loosened predicate. `tools/alias-claim.mjs`
// moved first and this module generalises its shape.
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
// RESOLUTION ORDER, highest first, decided by the pure `resolveRoot` below:
//
//   1. `CACHE_FIX_DATA_DIR` / `CACHE_FIX_STATE_DIR` — explicit override,
//      absolute, used AS-IS: it names the root itself, so `cache-fix` is NOT
//      appended.
//   2. `XDG_DATA_HOME` / `XDG_STATE_HOME` — honoured on EVERY platform when
//      set, not only Linux: a macOS user who sets `XDG_DATA_HOME` has stated
//      an intent and means it.
//   3. Platform default + `cache-fix` — darwin gets
//      `~/Library/Application Support` / `~/Library/Logs`, win32 gets
//      `%LOCALAPPDATA%` (fallback `~/AppData/Local`) with state under a
//      `State` subdirectory (Windows has no separate state root, and
//      collapsing both into one directory would dissolve the split rule
//      above), everything else — Linux included — gets `~/.local/share` /
//      `~/.local/state`, unchanged from before this table existed. The
//      darwin mapping is `env-paths`' own choice for the XDG-state-shaped
//      role, which is what a reviewer will expect, and it is honest here too:
//      our state artifacts (event logs, snapshots, status files) are
//      log-shaped.
//
// On Linux with `XDG_*` unset — the running deployment, today — every
// resolved path is BYTE-IDENTICAL to before this table existed: this is a
// no-op for production, asserted in the test file, not merely believed.
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

const OVERRIDE_VAR = { data: "CACHE_FIX_DATA_DIR", state: "CACHE_FIX_STATE_DIR" };
const XDG_VAR = { data: "XDG_DATA_HOME", state: "XDG_STATE_HOME" };

// Platform default BASE (before `cache-fix` is appended), per the table in
// the header comment. Keyed by `process.platform` value; anything not listed
// here — "linux" included — falls through to the `~/.local/{share,state}`
// default below.
const PLATFORM_DEFAULT_BASE = {
  darwin: {
    data: (home) => join(home, "Library", "Application Support"),
    state: (home) => join(home, "Library", "Logs"),
  },
  win32: {
    data: (home, env) => env.LOCALAPPDATA || join(home, "AppData", "Local"),
    state: (home, env) => join(env.LOCALAPPDATA || join(home, "AppData", "Local"), "State"),
  },
};

function defaultBase(kind, platform, home, env) {
  const perPlatform = PLATFORM_DEFAULT_BASE[platform];
  if (perPlatform) return perPlatform[kind](home, env);
  return join(home, ".local", kind === "data" ? "share" : "state");
}

/**
 * Pure resolver — no `process.*` reads, no filesystem, no throw. `kind` is
 * `"data" | "state"`. Returns the absolute root INCLUDING the `cache-fix`
 * segment, except for the explicit-override level, which names the root
 * itself. See the header comment for the resolution order and the platform
 * table.
 */
export function resolveRoot(kind, { platform, env, home }) {
  const override = env[OVERRIDE_VAR[kind]];
  if (override) return override;

  const xdgHome = env[XDG_VAR[kind]];
  if (xdgHome) return join(xdgHome, "cache-fix");

  return join(defaultBase(kind, platform, home, env), "cache-fix");
}

export function xdgData() {
  assertIsolated("xdgData");
  return resolveRoot("data", { platform: process.platform, env: process.env, home: homedir() });
}

export function xdgState() {
  assertIsolated("xdgState");
  return resolveRoot("state", { platform: process.platform, env: process.env, home: homedir() });
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
// REMOVAL TRIGGER, measurable rather than a judgement call: remove this
// function and every `legacyReadPath(` call site once `CacheFixLegacyPathWarning`
// has not been observed for 30 consecutive days on this machine. The warning
// is already the instrument, so the trigger is mechanically enumerable —
// grep the function name; that is the whole deletion. Until that condition
// holds, it exists so a reader run against a machine whose data has not been
// moved yet still finds it, and it warns every time so the state cannot be
// mistaken for the new normal.
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
