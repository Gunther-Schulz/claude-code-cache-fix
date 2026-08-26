# Wave 2 · L2C — `workflow bind`, and the registry it binds to

Dispatch brief. Decision-complete: every design and placement decision
below is made. The executor implements, surfaces gaps, and decides
nothing.

**Serialized behind L2B.** L2C and L2B both write `cli.py`. Do not
dispatch this until L2B's commits are integrated onto `main`, and set
the base commit below to that integrated HEAD at dispatch time.

## Why this lane exists

`workflow bind` was commissioned by design §3.11 with nothing under it.
The design named a registry that "records bindings" (§3.3 controls) and
a homes-table row saying templates live in a "plugin registry (global)",
but no artifact anywhere: the plugin repo carries `cli/`, `hooks/` and
an empty `skills/`. The registry was given a home first, in the same
design document, so this lane builds rather than designs — cache-fix
`fe9a483`, §3.8b's amended row plus the paragraph under the table.

## Grounding — read before building

- `docs/directives/carrier-rework-design-2026-08-26.md` at cache-fix
  `fe9a483` or later: §3.8b (the amended templates row AND the paragraph
  "Why the registry is a directory and a parser, not an index file" —
  that paragraph is the spec for this lane's core invariant), §3.3's
  six controls on shared workflows, §3.11's authoring sentence.
- `plugin/cli/lifecycle_core/lanes.py`: `LANE_PARTS` (:59),
  `_TRIGGER_LINE` (:56), `read_lane` (:139). **The template parser
  copies this idiom** — an anchored `^Header:\s*(.+?)\s*$` regex over a
  `.md` body, a missing file reported as a NAMED problem rather than an
  omission. Do not invent a second parsing style.
- `plugin/cli/lifecycle_core/declaration.py`: `REQUIRED_KEYS` (:114),
  `SCHEMA_FLOOR` (:55). `template-bindings` already exists as a
  declaration key and is `{}` in this repo's own declaration — the
  binder side needs no new home.
- `plugin/cli/lifecycle_core/refusals.py` and `roster.py`: the refusal
  row idiom and the emit-site coverage check.
- `plugin/cli/lifecycle_core/items.py`: how an `UNKNOWN` slot is written
  and how `item check` reports it. This lane reuses that convention
  exactly; read it rather than reproducing it from this brief.

Provenance: every line above naming current repo state was opened at
brief-write time against `3d07079` + the L1 re-sync (lifecycle `82a6a72`).
The `cli.py` and `lanes.py` line numbers are from BEFORE L2B lands —
treat them as content anchors, not positions, and report the offset.

## What to build

### 1. The registry: a directory and a parser, no index

- `plugin/workflows/` holds one `.md` file per template. The template id
  is the filename stem and matches `[a-z0-9][a-z0-9-]*`.
- A template declares its own required slots in an anchored header line:
  `Slots:` followed by comma-separated slot names, each matching
  `[a-z0-9][a-z0-9_-]*`. The rest of the file is the procedure text and
  is not parsed by this lane.
- **Every declared slot is REQUIRED.** Optional slots are not a wave-2
  concept. Do not add them; if the work seems to need them, that is a
  gap to report.
- A `Slots:` line that is absent means zero required slots (a valid
  template). A `Slots:` line present but empty, or carrying a
  malformed name, is a PARSE FAILURE reported by name — never silently
  read as zero.
- There is NO index file listing templates or their slots. The slot set
  is derived from the template file on every read. This is the lane's
  central invariant and the reason the design paragraph exists: a
  restated index goes stale silently and validates bindings green while
  they are wrong.

### 2. `lifecycle workflow bind <template-id>`

New module `plugin/cli/lifecycle_core/workflows.py`.

**There is no `workflow` subparser yet — you create it.** Opened at
brief-write time: `cli.py` carries `workflow bind` only as a
`NOT_YET_BUILT` entry (`cli.py:35`, "wave 2 (§3.8c) — a template
binding with its slots"), and `grep -n workflow cli.py` returns that
line and one comment, nothing else. So this lane adds the `workflow`
group and its `bind` subcommand, and REMOVES the `NOT_YET_BUILT` entry
in the same commit — a "not yet built" label over a built verb is the
stale-label class the schema's own `RETIRED_KEYS` exists to catch, and
the L2A lane was explicitly credited for doing this for its two verbs.
Update `STAGES_BUILT`'s string to name the verb, as that lane did.

- Reads `plugin/workflows/<template-id>.md`, parses its `Slots:` line,
  and writes an entry into the repo declaration's `template-bindings`:
  `{"<template-id>": {"<slot>": "<value>", ...}}` with EVERY required
  slot present as a key.
- `--set <slot>=<value>`, repeatable, fills slots at bind time. Any slot
  not filled is written with the value `UNKNOWN` — the same transitional
  marker items use, so `kind check` can report it. `UNKNOWN` is not a
  default answer; it is an explicit unanswered slot that a checker
  flags, which is exactly why it satisfies "an unbound required slot is
  a finding, never a default".
- `--set` naming a slot the template does not declare: exit 3, naming
  the slot and listing the declared set. Never silently accepted.
- Binding over an existing entry for the same template: refused unless
  `--force`.
- A template id with no file: **exit 3**, not 2. Unreadable input is not
  a finding — the verb contract's own rule, and the reason `lifecycle`
  maps an argparse usage error to 3.
- Print which slots were filled and which were left `UNKNOWN`, and the
  declaration path written.

### 3. `kind check` gains two findings

Both as NEW refusal rows with their own emit sites — not branches folded
into an existing verdict, and not added to `dangling_reference`, which
the refusal table already records as claiming wider than it watches
(`route_set_unwatched`).

- `binding_slot_unbound` — a `template-bindings` entry with any slot
  whose value is `UNKNOWN`. FINDING.
- `binding_template_missing` — a `template-bindings` entry naming a
  template with no file under `plugin/workflows/`. FINDING. Nothing
  dangles, in either direction: a lane naming a missing workflow already
  fails, and now so does a binding naming a missing template.

Register both in the refusal roster with emit sites, so `--test`'s
coverage check sees them.

### 4. Tests

`test/test_workflow_bind.py` (new). Fixture templates go under the
suite's own fixture area, never in `plugin/workflows/`. Cover: slot
parsing including the two parse-failure shapes; bind writing every
required slot; `--set` filling; unknown-slot rejection at exit 3;
missing template at exit 3; refusal-without-`--force`; `--force`
overwrite; and both new `kind check` findings going red on a
constructed binding and green after repair.

**Red-first, per the repo's own discipline:** demonstrate each new
finding red against the pre-change code before implementing it, with
the run's real output in your report.

## PROHIBITIONS

- **Extract NO real template.** `plugin/workflows/` ships empty save a
  `.gitkeep`. Template extraction from a private repo is a reviewed PR
  carrying hygiene output (design §3.3) — a desk and operator act, not a
  lane's, and it stays so even though the leak-scan precondition is now
  met (the plugin repo's scanner was re-synced byte-identical to
  cache-fix's tonight, its declaration reads ON with no exceptions, and
  its own tree scans clean with the class proven live on a planted
  path).
- **No optional slots**, per §1 above.
- No changes to the item/ledger/lane carriers, and no rule-text edits
  beyond byte-exact replacements this brief specifies.
- No fallback, default or `except` paths beyond this spec.

## STOP signals

Halt the item, finish the independent remainder, return the question
with its evidence: a spec gap or contradiction; no red demonstrable for
a claimed finding; the change would alter behaviour this brief did not
name; `template-bindings` turns out to be consumed somewhere this brief
does not list.

## Write boundary

You own, in the worktree assigned at dispatch:

- `plugin/cli/lifecycle_core/workflows.py` (new)
- `plugin/cli/lifecycle_core/cli.py`
- `plugin/cli/lifecycle_core/declaration.py`
- `plugin/cli/lifecycle_core/refusals.py`
- `plugin/cli/lifecycle_core/roster.py`
- `plugin/workflows/.gitkeep` (new)
- `test/test_workflow_bind.py` (new)
- `plugin/.claude-plugin/plugin.json` — **the `version` value ONLY**

Nothing else. `git add -N <file>` — a FILE, never a directory — before a
new path can be committed by pathspec.

## Commit convention

Every payload commit bumps `plugin/.claude-plugin/plugin.json`'s patch
version, in the SAME commit as the payload. This is not discretionary:
the machine's global pre-commit gate refuses a staged payload change
with an unchanged version, and its batch exemption compares against
`origin/HEAD`'s manifest, which cannot resolve in this repo because it
has no remote — so the exemption is structurally dead here and every
commit needs its own bump. The repo's record is 9 payload commits, 9
bumps. If a commit bounces after its bump, STOP and report the refusal
verbatim; never `--no-verify`.

Commit by pathspec, every flag before the `--`. Never `git add` then
commit, never `-A`, never amend. Commits stay UNPUSHED; the repo has no
remote and none is to be created.

## Verification

`python3 -m unittest discover -s test` and `plugin/cli/lifecycle --test`
both green, with real counts including skips, run by you AND re-run by
the dispatcher in the main checkout.

---

Closing report (mandatory; the project's own report form if it
defines one, else the §2 form here — never both; "none" is a
valid slot answer, silence is not): (a) items completed w/
evidence, (b) checks RUN w/ real output — FULL counts incl.
skips (`N passed, M failed, K skipped`), each skip dispositioned
(which check, why, whether the reason touches the item); a skip
in a check YOU built is a finding, not a pass — the built branch
did not execute, (c) gaps surfaced —
incl. anything needing a tier above yours, returned as a question
with its evidence, never settled at your tier,
(d) deviations w/ reason, (e) candidate lessons, (f) files
touched + commit hashes (unpushed) — only commits whose
Co-Authored-By trailer is YOURS; one you cannot claim by
trailer is "present in the tree, not mine"; a `.git/config`
write counts as a repo write, (g) what was NOT verified,
(h) sources actually read, of those the brief named.
Drain your inbox before sending, and between parts of a
multi-part report: every dispatcher message received up to send
time is dispositioned or named as unhandled.
Message ≤3000 chars each: a report longer than one message is
SPLIT into labeled parts (1/N) — do NOT write a report FILE
(harness-blocked for subagents); supporting data goes to the
brief's assigned DATA files, the message carries key findings
+ any such paths. A missing decision, file,
or value is surfaced as a gap, never bridged with a guess.
A check that got backgrounded is AWAITED before the closing
report (TaskOutput block=true on its task id) — ending your
turn orphans it; a report sent with a check still running is
an INTERIM report, says so, and names what remains.
Commits unpushed, by pathspec — `git commit -m "…" -- <paths>`
with every flag BEFORE the `--` (after it git reads `-m` as a
pathspec and the commit fails; `-F` for a multi-line message),
never
`git add` then `git commit` and never `-A`: the index is shared,
so a co-writer staging between your `git status` and your commit
rides out under your message whatever you added. A NEW file is
invisible to a pathspec commit until `git add -N <path>`
registers it (intent-to-add: zero content staged, full body
still committed). Trailer:
`Co-Authored-By: Claude <model> <noreply@anthropic.com>`.
Never amend — always a new commit: the amend-gate denies
subagent amends regardless of ownership (source: §1 amend
rule).
After sending the report your write grant is over: a defect you
find later is REPORTED, never edited or amended (source: §4
ownership rule).
