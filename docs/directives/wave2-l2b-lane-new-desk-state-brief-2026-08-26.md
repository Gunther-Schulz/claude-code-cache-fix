# Wave 2 — L2b: `lane new`, `desk state` and its declaration field, and the plugin's own broken pointers

Title: sonnet: build the lane-authoring verb and the delegation-state verb,
and repair the laws/journal pointers the plugin's own rule requires
Working copy: a WORKTREE of the `lifecycle` plugin repo, provisioned by the
dispatcher; its path and base arrive in your dispatch message. That repo has
NO remote by design and none is to be created.
Base check, before anything: `git merge-base --is-ancestor <base> HEAD` AND
`git log --oneline <base>..HEAD`. Base contained + nothing on top → start.
Base not contained → fast-forward to it if the tree is clean, else HALT.
Base contained WITH commits on top → HALT and report those commits as a gap.
Scratch: your OWN scratchpad.

Tier: sonnet. Every design decision is made below. A decision you find
unmade is a STOP, not a choice.

## Grounding basis — read before building; the report cites what was read

- the executor skill (`dispatch-guards:executor`) — load FIRST.
- `plugin/cli/lifecycle_core/lanes.py` — `read_lane` (:139), `LANE_PARTS`
  (:59), `LANES_DIR` (:49), `_TRIGGER_LINE` (:56), `cmd_lane_register`.
- `plugin/cli/lifecycle_core/cli.py` — `NOT_YET_BUILT` (:32) and the parser
  registrations, for the idiom.
- `plugin/cli/lifecycle_core/declaration.py` — `REQUIRED_KEYS` (:114),
  `RETIRED_KEYS` (:123), `REF_TYPES` (:103).
- `plugin/cli/lifecycle_core/firelog.py` — `state_dir()` (:36), which is the
  XDG-state resolver `desk state` reuses.
- `plugin/CLAUDE.md` — laws 1–25, and law 24 in particular.
- `JOURNAL.md` — the J-numbered entries, and J19's position.
- `~/.claude/runbook-format.md` — §"The `Trigger:` line" for the grammar.
- cache-fix `docs/directives/carrier-rework-design-2026-08-26.md`: the
  precedence paragraph at the head of §5 FIRST, then §3.3 (a lane's parts,
  the trigger's reserved exit codes) and §3.8b (the homes table).
- cache-fix `BACKLOG.md`, the PARKED stall-detector entry (search
  `ended on an announcement`) — the source of `desk state`'s vocabulary. Read
  the entry, not this brief's summary of it.

## Established, and how each line was established

Opened by the dispatching desk at brief-writing time.

1. **`NOT_YET_BUILT` (`cli.py:32-37`) names four verbs.** `lane new` is
   yours. `init` and `lane list --json` are a sibling lane's and land BEFORE
   you. `workflow bind` is a third lane's and lands AFTER you. Build only
   `lane new`.
2. **A lane body lives at `lanes/<name>.md`** (`LANES_DIR`, :49) and its
   trigger is matched by `^Trigger:\s*(.+?)\s*$` (:56).
3. **`LANE_PARTS` is `("Decides:", "Trigger:", "Ends:")`** (:59) — THREE,
   while §3.3 calls a lane four parsed parts. The fourth, the decision table,
   has no label a `startswith` scan can find. **This is dispositioned and
   booked as `lc-12`. Your stubs emit all FOUR parts; you do NOT extend
   `LANE_PARTS` and you do NOT add a decision-table check.**
4. **`desk state`'s vocabulary is CLOSED and comes from the stall-detector
   booking**: `REPORTED <msg-id>` · `WAITING-ON <lane|peer> --horizon <t>` ·
   `BLOCKED <named>` · `DONE`. Four values, no others, no free text.
5. **Its state file lives under the XDG state dir, NEVER `.claude/`** — one
   file per desk. `firelog.py:36-39` already resolves
   `$XDG_STATE_HOME/lifecycle`; reuse it rather than writing a second
   resolver. The `.claude/` prohibition is not stylistic: that path shape
   costs a permission dialog on every read and write, and one such prompt
   already lost a session's work.
6. **The Stop hook is WAVE 3, not yours.** Wave 2 delivers the verb and the
   declaration field; the detector that consumes them is a later wave.
7. **Laws 13, 15 and 16 carry no journal pointer, and J19 is cited by no
   law.** Both directions of the plugin's own stated rule ("a law without a
   journal pointer has no basis; a journal entry nothing cites is stale").
   J19 also sits out of numeric order in the file, after J21.

## THE ONE THING YOU MUST NOT BUILD, and why it is not an oversight

**Do not add a refusal-registry row for the stall detector.** Law 24: "A verb
named is a verb placed in a stage; a refusal named has its firing input;
neither exists in prose alone." The stall row's firing input is the Stop
hook, which is wave 3 and does not exist. This repo has already paid for that
exact mistake once — `LEDGER.md` records it as the strongest single finding
of an earlier dispatch: a replacement refusal row named `lifecycle retire` as
its firing input while that verb existed in no stage, and **a row whose
firing input does not exist cannot be red-proven.** A row you add here would
be unprovable by construction and would inflate a roster that is supposed to
assert only what it can fire. Build the verb and the field; leave the row to
the wave that brings its trigger.

## The settled design — implement exactly this, do not redesign

**A. `lifecycle lane new <door>`.** Writes `lanes/<door>.md` from the format,
as a STUB a human then fills.

    lifecycle lane new <door> [--kind event|intent] [--force]

- **Refuses if the file exists**; `--force` overwrites. No silent overwrite.
- The stub carries **all four parts of §3.3**: `Decides:`, a `Trigger:` line,
  a decision table, `Ends:`.
- **The `Trigger:` line must PARSE under the real grammar** — pipe-delimited,
  fixed field count per kind, ONE physical line, no continuation:
  `Trigger: event | <channel>[,<channel>…] | <condition>` or
  `Trigger: intent | <condition>`. `--kind` picks which; default `event`.
  A stub whose own trigger does not parse is the defect this verb would
  otherwise ship at scale.
- The stub's placeholder text says what the author must replace, and the
  `Ends:` stub names that dispositions are a CLOSED set, each an item
  transition.
- **`lane new` does NOT register the lane in the declaration.** Writing the
  file and declaring it are two acts; `lane register` exists already. Say so
  in the verb's output — a lane file the declaration does not list is
  UNREGISTERED, which the router reports as a finding, and the author should
  learn that from the tool rather than from the router later.
- **Verify the stub against the real parser**: after writing, `read_lane`
  must return the lane with its trigger parsed and all three of `LANE_PARTS`
  present. A stub the repo's own reader cannot read is not a stub.

**B. `lifecycle desk state <VALUE> [args]` and its declaration field.**

- Values exactly: `REPORTED <msg-id>`, `WAITING-ON <lane|peer> --horizon <t>`,
  `BLOCKED <named>`, `DONE`. **A value outside the four is a refusal**, not a
  coercion — the vocabulary is closed and an open one decays.
- Writes one file per desk under `state_dir()` (reuse `firelog.py:36`), never
  under `.claude/`.
- The record carries at minimum: the value, its argument, the timestamp, and
  the desk identity. Recording twice in one turn overwrites rather than
  appending — the predicate a later wave reads is "was a state recorded for
  THIS turn", not a history.
- **The declaration field**: one new key carrying delegation state, so a
  later detector can answer "is a delegation active here" without inference.
  Add it to `REQUIRED_KEYS`'s sibling handling the same way the existing
  optional keys are handled — and if adding it to `REQUIRED_KEYS` would make
  every existing declaration in the world invalid, it is OPTIONAL with a
  declared default, and you say which you did and why. **This is the one
  place the brief gives you a fork; take it on that stated criterion, not on
  taste, and report the reading.**
- `desk state` with no active delegation is not an error: it records, and
  says the delegation field is absent.

**C. The pointer repairs.** Laws 13, 15 and 16 gain journal pointers, or the
law is amended to state why it has none. J19 gains a citing law, or is
recorded as uncited with its reason. **You do not invent an incident to cite.**
If no existing journal entry supports a law, say so and stop on that law —
fabricating a basis is worse than the missing pointer, and the rule exists to
make bases real. J19's out-of-order position: leave it. Renumbering or moving
a journal entry rewrites history that other files cite by number.

## Verifier (in order; real output pasted in the report)

1. **Baseline first**: `python3 -m unittest discover` and `lifecycle --test`,
   full counts including skips, before any change.
2. **A round-trip**: `lane new` a door, then `read_lane` it — trigger parsed,
   all `LANE_PARTS` present. Then `lane list` shows it as UNREGISTERED, which
   is the correct state for a lane not yet declared.
3. **A, both kinds**: an `event` stub and an `intent` stub, each pasted, each
   parsing under the grammar's own field-count rule.
4. **A, the refusal arm**: `lane new` over an existing file refuses; `--force`
   overwrites. Both pasted.
5. **B, the closed vocabulary**: each of the four values accepted; at least
   two invalid values refused with the vocabulary named. The refusal arm is
   the one that proves the set is closed rather than merely documented.
6. **B, the home**: the state file's resolved path is under the XDG state
   dir. Assert it is NOT under `.claude/` — a negative assertion, because
   that is the property the booking cares about and a positive path check
   would pass on any path.
7. **B, overwrite not append**: two records in one turn leave one record.
8. **C**: the pointer repairs shown, and any law you could not source named
   as unsourced rather than invented.
9. **The must-NOT-move row**: `lifecycle --test`'s roster count and pass
   count are unchanged except by rows you deliberately added. **You should
   add none** — see "the one thing you must not build". A changed roster
   count is a finding to report.
10. Full suites green; skips dispositioned individually. A skip in a check
    YOU built is a finding, not a pass.

## Write boundaries

- **Owned, in your worktree only:** `plugin/cli/lifecycle_core/cli.py`,
  `lanes.py`, `declaration.py`, any NEW module under
  `plugin/cli/lifecycle_core/`, the tests under `test/`, `plugin/CLAUDE.md`
  and `JOURNAL.md` (for item C only), and
  **`plugin/.claude-plugin/plugin.json` — its `version` field only** (see
  the commit plan; this is not optional).
- **READ ONLY:** everything else, including `LEDGER.md`, `ITEMS.md`, and
  `tools/`. **Do not touch `tools/absence-scan.mjs`** — byte-identical to
  another repo's copy by mandate, another lane's change in flight.
- **Do not touch cache-fix or dotfiles at all.** You read the design, the
  backlog entry and the format doc; you write in neither repo.
- **`cli.py` is a serialized collision point.** A sibling lane's `init` and
  `lane list --json` land BEFORE you; a third lane's `workflow bind` lands
  AFTER. Keep your parser additions self-contained and adjacent.
- Commit by pathspec — `git commit -F <msgfile> -- <paths>`, every flag
  before the `--`. New file → `git add -N <path>` first, naming a FILE never
  a directory. Never `git add` then commit, never `-A`, never `--amend`,
  never `--no-verify`.
- **Commits UNPUSHED.** No remote exists; do not create one.
- Trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## Commit plan — READ THIS, it bounced the previous lane

**Every payload commit must carry its own version bump, in the same commit.**
This is not the usual bump-once-per-batch rule and the difference is measured,
not assumed:

- dotfiles `git/hooks/pre-commit`, `unbumped_plugins()` (`:133`), flags any
  staged file under a plugin's PAYLOAD ROOT — not just the manifest — when
  the staged version equals HEAD's. Your `cli.py`/`lanes.py` edits are payload.
- It has a multi-commit exemption (`:161-173`), but that exemption's
  comparison basis is the **origin** manifest, and `origin_manifest_text()`
  (`:122-130`) returns `None` when no remote resolves. Its own comment: "Ohne
  auflösbares origin-Manifest bleibt das alte Verhalten (fail-closed auf die
  Meldung)."
- **This repo has no remote by design**, so the exemption can never arm.
  Bumping once and committing payload afterwards fires again on the second
  commit.

So: **read the CURRENT version in `plugin/.claude-plugin/plugin.json` at your
base — do not assume a number from this brief, a sibling lane moved it — and
climb one patch level per payload commit.** Versions climb and never go
backwards (law 12). Do not touch the repo-root `.claude-plugin/marketplace.json`.
`--no-verify` is never the answer; a bounce that this plan does not explain is
a finding to report.

Other guards: `git config core.hooksPath` resolves to the dotfiles
`git/hooks` directory — read it yourself before relying on this line.

## Pre-authorized repair class

If the commit plan collides with a repo guard, reorder to satisfy the guard
and report the permutation as a deviation. Novel deviations still halt.

## STOP signals — halt the item, finish the independent remainder, return the question with its evidence

- A design decision would be needed that this brief does not make (the
  declaration-field fork is decided BY ITS STATED CRITERION, not by taste —
  if the criterion does not settle it, that is a STOP).
- No existing journal entry supports a law in item C.
- A stub `lane new` writes does not parse under the real grammar.
- The roster count changes and you did not deliberately add a row.
- Building any of it requires `init`, `lane list --json`, or `workflow bind`.

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
Report via SendMessage to `main`.
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
