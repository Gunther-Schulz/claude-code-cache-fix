# Directive — tool data leaves the config directory, and a guard keeps it out

**Status:** READY to dispatch. Written 2026-08-07 in the cache-fix fork, for a
session working in **dotfiles**. Operator asked for this brief explicitly and
will hand it to another session.

**Why this exists, measured rather than argued.** The Claude Code harness
protects `~/.claude/` with a sensitive-path prompt that keys on the directory's
SHAPE — not on what a file is. Anything a tool keeps there therefore raises a
permission dialog on every read and write, for the operator and, far more often,
for every dispatched agent. On 2026-08-07 one such prompt was DENIED mid-task
(the operator could not tell a data write from a config write, which is exactly
the information the shape hides), and the session lost the work in flight.

The registry that triggered it was moved out the same day
(`~/.local/share/cache-fix/capture-aliases.json`, fork commit `0745351`), and
the prompt for that file stopped. This directive is the general form: the class,
not the instance.

---

## Part 1 — the guard (dotfiles, this is the dispatchable half)

**Goal.** A machine-state check that fails when `~/.claude/` contains anything
that is not Claude Code's own configuration.

**Where it belongs and why not elsewhere.** `bootstrap/doctor.py` in dotfiles —
that is where machine-state verdicts already live, and it enumerates its own
`*_verdict` functions and fails its self-check if one lacks a test, so a new
verdict cannot land untested. **It does not belong in `dispatch-guards`**: that
plugin governs delegation, and a rule about where machine-local data lives
minted there would be minted at the wrong layer — the truth-level failure the
corpus maintenance doctrine names. It is not a dispatch concern; it is a machine
convention.

**Design, decided.**

- The check reads an ALLOW-SET declared as data, not as a regex: Claude Code's
  own entries (`settings.json`, `settings.local.json`, `CLAUDE.md`,
  `CLAUDE.local.md`, `plugins/`, `projects/`, `todos/`, `statsig/`, `shell-
  snapshots/`, `ide/`, `keybindings.json`, `.credentials.json`, and whatever
  else the machine legitimately has — ENUMERATE IT FROM THE LIVE DIRECTORY at
  build time, do not invent the list).
- Anything else is a finding, reported with the XDG destination it should have
  (`$XDG_DATA_HOME`/`~/.local/share/<tool>/` for data, `$XDG_STATE_HOME` for
  logs and state).
- Three answers, not two, per this repo's standing rule: a directory that cannot
  be read is COULD-NOT-VERIFY and says so; it is neither a pass nor a fail.
- **The allow-set is the exemption mechanism.** A legitimate new Claude Code
  entry is added to it by name, with a one-line reason. Never soften the
  predicate, never add a catch-all pattern — a guard that fires on legitimate
  work trains the override reflex that kills it.

**Verifier, red-first and mandatory.** The check must go RED on the live machine
TODAY (as of this directive's 2026-08-07 date — the fork-side migration this
directive motivated (Part 3, BACKLOG's XDG accounting) has since moved most of
those entries under XDG paths; re-measure the current count rather than
inheriting "at least nine" — this "TODAY:" is a snapshot, not a standing
claim): `~/.claude/` held at least nine `cache-fix-*` entries plus
whatever else had accumulated at write time, and the red must list them. Then: adding one of
them to the allow-set must turn exactly that one green (proving the allow-set is
consulted per entry, not as a switch), and a synthetic `~/.claude/junk-data.json`
in a temp HOME must be flagged (proving the check is not merely matching the
string `cache-fix`).

**Do NOT make the check fix anything.** It reports. Moving data is Part 2, is
per-tool, and some of it is deployment-coupled.

## Part 2 — the corpus line (operator's global CLAUDE.md)

One convention, minted under `~/.claude/CLAUDE-maintenance.md` discipline
(build-first on operator GO, JOURNAL line in the same commit, neighbour-collision
check first — search the governed set for an existing statement about XDG or
config directories before adding):

> Tool data lives in XDG data/state directories, never in a config directory. A
> config directory is protected by path SHAPE, so anything kept there taxes every
> session and every agent with a permission prompt — and a prompt on a data write
> is one the operator cannot triage, because the shape hides what the file is.

Register it as a **binding** (environment-bound: it is true while the harness
protects by shape), staleness-stamped, not as a capability patch.

## Part 3 — the fork's own migration (NOT this dispatch)

Booked separately in the fork's `BACKLOG.md` as the ranked first item. Nine
paths remain under `~/.claude/`; five tools read them and six proxy extensions
write them, so the proxy half is deployment-coupled (pin bump + restart) and is
batched with a restart the operator is already taking. Named here only so this
directive's reader knows the instance work is owned elsewhere and does not do it
twice.

## What the executing session must NOT do

- Do not weaken or bypass the harness's sensitive-path protection, in
  `dispatch-guards` or anywhere else. The prompt is doing its job; the data is
  in the wrong place. Moving the work is the repair, an allow-listed exemption
  the guard itself verifies is the fallback, and a loosened predicate is neither.
- Do not move any `cache-fix-*` path as part of this dispatch. Part 1 reports;
  Part 3 moves, elsewhere, with its own restart accounting.
- Do not edit the fork's files.
