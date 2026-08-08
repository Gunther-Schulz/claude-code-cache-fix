# Directive: portable state roots that survive an upstream PR

Status: DESIGN SETTLED, implementation dispatchable. Operator GO 2026-08-08.

## Goal

Make this fork's data/state root resolution correct on every platform and
defensible as an upstream contribution, without moving a single byte on the
machine it currently runs on.

## Background (established; verify at the cited lines)

- `proxy/xdg-dirs.mjs:80-98` resolves exactly two roots:
  `xdgData()` = `$XDG_DATA_HOME || ~/.local/share` + `/cache-fix`, and
  `xdgState()` = `$XDG_STATE_HOME || ~/.local/state` + `/cache-fix`.
  **There is no platform branching in the module** — `grep -c
  "darwin\|win32\|platform" proxy/xdg-dirs.mjs` returns 0.
- The relocation is FORK-LOCAL: `git cat-file -e upstream/main:proxy/xdg-dirs.mjs`
  fails. Upstream has no such module and writes under `~/.claude` via
  `claudeHome()`, which upstream DOES have (`proxy/claude-home.mjs`) and uses
  across at least `config.mjs`, `downloads-bucket.mjs`, `bootstrap-defense.mjs`,
  `cache-telemetry.mjs`. So this is a MODIFICATION of an upstream pattern that
  reaches many upstream files, not the addition of a leaf module.
- `legacyReadPath()` (`:119`) is reader-only, warns once per path
  (`CacheFixLegacyPathWarning`), and points at `tools/xdg-migrate.mjs`, which
  exists. Its own comment says to delete it "after the transition" and names the
  deletion exactly: `git grep "legacyReadPath("` → **26 hits across 12 files**.
- Divergence from upstream: 625 ahead, 27 behind.

## Non-Functional Requirements

- **Size/complexity budget.** ~60–100 LOC net in `proxy/xdg-dirs.mjs` plus its
  test file. NO new runtime dependency. NO changes to the 26 `legacyReadPath`
  call sites and none to the ~200 `statePath`/`dataPath` callers — if the
  implementation touches call sites, it has exceeded this directive and stops.
- **Threat model.** This module resolves paths from environment variables and
  `homedir()`. It handles no request bodies and no credentials, but the DATA
  root holds the MITM CA private keys, so directory creation modes must not
  widen: anything this change creates stays `0700`, and the implementation adds
  no `mkdir` it did not already have. Env vars are read, never written. An
  attacker-controlled `XDG_*` value can redirect our own writes — that is
  already true today and is unchanged; it is not a new surface, and it is out of
  scope to defend against a hostile local environment.
- **Maintainability.** One pure resolver function and one platform table. No new
  abstraction beyond that; explicitly NOT taking a dependency on `env-paths`
  despite it being the de-facto standard, because a process handling API keys
  and full request bodies should not grow supply-chain surface for ~30 lines of
  `join()`. The platform mapping follows `env-paths`' conventions so a reviewer
  recognises it.
- **Performance/reliability.** Resolution stays per-call and uncached, for the
  reason the module header already gives. Negligible.
- **Load-bearing?** **YES.** It is a shared abstraction (~200 callers), it is an
  on-disk contract, and the CA keys live under one of the roots.

## The settled design — implement exactly this

### 1. One pure resolver, testable without touching globals

Extract the decision into a pure exported function so the tests need no global
mutation and no `process.platform` stubbing:

    export function resolveRoot(kind, { platform, env, home })

`kind` is `"data" | "state"`. It returns the absolute root INCLUDING the
`cache-fix` segment. `xdgData()`/`xdgState()` become thin wrappers passing
`process.platform`, `process.env`, `homedir()`. The tripwire (`assertIsolated`)
stays in the wrappers, NOT in the pure function — a pure function that throws on
the test runner is untestable.

### 2. Resolution order, per root, highest first

1. `CACHE_FIX_DATA_DIR` / `CACHE_FIX_STATE_DIR` — explicit override, absolute,
   used as-is WITHOUT appending `cache-fix` (it names the root itself).
2. `XDG_DATA_HOME` / `XDG_STATE_HOME` — honoured on **every** platform when set,
   not only Linux. A user who sets them has stated an intent; a macOS user who
   sets `XDG_DATA_HOME` means it.
3. Platform default + `cache-fix`:

   | platform | data | state |
   |---|---|---|
   | `darwin` | `~/Library/Application Support` | `~/Library/Logs` |
   | `win32` | `%LOCALAPPDATA%` (fallback `~/AppData/Local`) | `%LOCALAPPDATA%` + `\State` |
   | everything else | `~/.local/share` | `~/.local/state` |

   The darwin state→`Library/Logs` mapping is `env-paths`' own choice for the
   XDG-state-shaped role and is what a reviewer will expect; our state artifacts
   (event logs, snapshots, status files) are log-shaped, so it is also honest.
   `win32` gets a `State` subdirectory because Windows has no separate
   state root and collapsing both into one directory would dissolve the split
   rule the module header states.

### 3. The invariant that makes this safe to ship here

**On Linux with `XDG_*` unset, every resolved path is byte-identical to
today's.** This change is a no-op for the running deployment: no migration, no
state move, and therefore NOT a state-KEY or freeze-logic change — restart stays
cache-transparent under threat-matrix row 3. State that declaration in the
commit message, and assert the invariant in a test (below); do not merely
believe it.

### 4. The legacy fallback gets a removal TRIGGER, not a vague "after"

Leave `legacyReadPath` in place and its call sites untouched. Replace the
"REMOVE THIS ... after the transition" comment with a measurable condition:
remove it, and all 26 call sites, once `CacheFixLegacyPathWarning` has not been
observed for 30 consecutive days on this machine. The warning is already the
instrument, so the trigger is measurable rather than a judgement call, and the
deletion is mechanically enumerable by its own grep. Booked as its own READY
entry; do NOT perform the removal in this change.

### 5. The upstream-facing rationale is rewritten; the fork-local one is demoted

The module header currently leads with the harness permission-prompt incident.
That is TRUE here and does not reach upstream's users, who run no such harness.
For a PR, lead with the general claim — a config directory is for configuration;
captures, logs and ledgers are data; platform conventions exist for exactly this
split; a user who sets `XDG_*` expects it honoured — and keep the harness story
as a clearly-labelled fork-local note. A rationale a reviewer cannot verify from
their own machine reads as special pleading.

### 6. What this change does NOT do

- Does not touch `README.md` or `README.ko.md`. Their divergence is a separate
  operator decision, already surfaced, still open.
- Does not migrate anything, does not delete the legacy path, does not touch any
  caller.

## Verifier (in order; real output pasted in the report)

1. **Red-first, platform mapping.** New expectations for `darwin` and `win32`
   run against the CURRENT implementation and must FAIL (today's code has no
   platform branch, so it returns `~/.local/...` for every platform). Run the
   unmutated baseline FIRST and state its result, so a red is distinguishable
   from a check that is always red. Then the same expectations against the new
   implementation pass.
2. **The no-op control — this one is load-bearing and must not be skipped.**
   Assert that with `platform: "linux"` and `XDG_DATA_HOME`/`XDG_STATE_HOME`
   unset, `resolveRoot` returns EXACTLY `<home>/.local/share/cache-fix` and
   `<home>/.local/state/cache-fix`. If this test does not exist, the change can
   silently relocate the live deployment's entire state and every other test
   still passes.
3. **Override precedence**, all three levels, each asserted: explicit
   `CACHE_FIX_*_DIR` beats `XDG_*` beats platform default; and the explicit
   override does NOT get `cache-fix` appended while the other two do.
4. `npm test` — full suite green.
5. `node tools/shape-verdicts.mjs` — unchanged verdicts.

## Write boundaries

- Owns: `proxy/xdg-dirs.mjs`, `test/xdg-dirs.test.mjs`.
- Touches nothing else. Not `BACKLOG.md` (dispatcher's), not the READMEs, not
  any caller.
- `proxy/**` is deployment-coupled: after merge the dispatcher bumps
  `CACHE_FIX_PROXY_TREE_PIN` in dotfiles and restarts. The restart is
  cache-transparent per §3, and that declaration is stated before it.
