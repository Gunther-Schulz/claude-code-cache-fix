# Wave 1 — the `lifecycle` plugin core: dispatch brief

Written at the execution desk (`claude-code-cache-fix-b4`) on the judgment
desk's GO, 2026-08-26. **PASSED the judgment desk 2026-08-26 against `8b6e2ec`
(brief read whole), with two fixes landed here — FIX 1 as D-h, FIX 2 inside
D-c — and the open question answered: THREE sequential dispatches, 1–3 / 4–6 /
7–9, this desk integrating and verifying between them.** No further pass is
owed before dispatch.

Design read at cache-fix `b617ac7`, sections §3.0, §3.1, §3.2, §3.3, §3.4,
§3.6, §3.8, §3.9, §4 row 1 and §5 of
`docs/directives/carrier-rework-design-2026-08-26.md`
(revision 2). **The design is the brief's core and is QUOTED BY POINTER, never
restated here** — where this file and the design differ, the design wins and
the difference is a defect in this file.

---

Title: opus: build the `lifecycle` plugin core and migrate cache-fix's carrier
Working copies: TWO, both named below. Base check on each: `git -C <copy>
rev-parse --short HEAD` against the sha in "Base state", then `git -C <copy>
log --oneline <sha>..HEAD` — commits on top → HALT and report them.
Scratch: your OWN scratchpad, never the dispatcher's.

## Grounding basis — read before building; the report cites what was read

- the executor skill (`dispatch-guards:executor`) — load FIRST
- `docs/directives/carrier-rework-design-2026-08-26.md` (cache-fix) —
  §3.0, §3.1, §3.2, §3.3, §3.4, §3.6, §3.8, §3.9, §4 row 1, §5's wave-1
  paragraph. **This
  is the settled design. Read these sections in full before writing code.**
  §3.9's table is your acceptance test AND your `--test` roster — one source
  for both, as the design says. §3.3 is the source for `lane list` (stage 7)
  and for the trigger predicate's exit codes; §3.4 is the source for
  `trigger-policy:`. Both were absent from this list in `8b6e2ec` and were
  added by the judgment desk's pass.
- `~/dev/Gunther-Schulz/dispatch-guards/` — the house plugin convention you
  are copying: root `.claude-plugin/marketplace.json`, `plugin/` holding
  `.claude-plugin/plugin.json`, `hooks/`, `skills/`; repo root carrying
  `CLAUDE.md`, `LEDGER.md`, `BACKLOG.md`, `dev-notes/`, `tools/`. Read its
  `plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`
  for the exact schema fields.
- cache-fix `tools/absence-scan.mjs` + `test/absence-scan.test.mjs` — the leak
  scan you are MOVING (not rewriting), and its existing bites.
- dotfiles `tools/backlog-census.py` — read `closure_visibility` and the
  three-answer census shape §4 row 1 says the successor keeps by design.
- cache-fix `BACKLOG.md` head (`## Grades`, `Closure-home:`) and
  `BACKLOG-DONE.md` head — the carrier you migrate, and the declarations §4
  row 1 cuts.
- cache-fix `docs/dev-loop.md`, "A checker has THREE answers, not two" and
  "Adding a check" — both bind every check you write here.

## Background (established; verify at the cited lines)

Each line below was OPENED by the dispatcher at brief time unless marked.

- **No `lifecycle` plugin exists anywhere yet.** Checked: no directory
  matching `*lifecycle*` under `~/dev/*/` or `~/.claude/plugins/cache/*/`.
  This is greenfield.
- **The plugin convention is real and is dispatch-guards'.** Its layout is
  quoted above from the directory listing and the two manifest files.
- **cache-fix's carrier is 331 entries today** — counted at brief time
  (`grep -c '^- \*\*' BACKLOG.md`). The design §5 says 329, measured earlier
  the same day; the difference is this desk's own wave-0 bookings, three
  added and one closed out to the done home. Re-derive it yourself and report
  what you get. It is a sanity figure, not an acceptance criterion — and the
  fact that it moved twice in one day is the reason it is not one.
- **`.claude/lanes.json` already exists in cache-fix and is TRACKED**
  (`d995296`), together with the `.gitignore` negation that made tracking
  possible. §3.8 says it serves the LEGACY checker and retires in wave 2 —
  **you do not touch it, and `lifecycle.json` is a separate new file.** The
  `.gitignore` negation your install step must add is the same shape:
  `.claude/*` with per-file negations, so `!.claude/lifecycle.json` is the
  line, and the checker fails on an ignored declaration (§3.0, §3.9's
  "ignored declaration" row).
- **The design's own §3.9 row "leak scan on the plugin repo" needs the scan to
  exist in the plugin before its own first commit.** That ordering is stated
  in §5's wave-1 paragraph; it is a real constraint on your commit order, not
  a preference.

## The settled design — implement exactly this, do not redesign

Everything under §3.0, §3.1, §3.2, §3.6 and §3.9 of the design document is
settled and is implemented as written. The decisions BELOW are the ones the
design leaves to the brief; they are made here, and a fresh context needs no
further judgment to execute.

**D-a. The plugin's home is a NEW repo, `~/dev/Gunther-Schulz/lifecycle`,
laid out exactly like dispatch-guards.** Root: `.claude-plugin/
marketplace.json` (name `lifecycle-marketplace`), `CLAUDE.md`, `LEDGER.md`,
`BACKLOG.md`, `dev-notes/`, `tools/`. Under `plugin/`: `.claude-plugin/
plugin.json` (name `lifecycle`, version `0.1.0`), `cli/`, `skills/`. Initialise
it with `git init -b main`; **do not create a GitHub remote and do not push** —
publishing a new public repo is an outward act reserved to the operator.

**D-b. The CLI is PYTHON; the leak scan stays NODE and MOVES unchanged.**
Basis, so you can check the reasoning rather than inherit it: the commit-time
consumers already live in dotfiles' python `git/hooks/pre-commit`, and the
three-answer census shape the design tells you to keep is python
(`backlog-census.py`); the leak scan is a 390-line node tool with its own
proven bite file, and porting it would re-derive a red-proven instrument for
no requirement the design states. `lifecycle` shells out to it and reports its
exit code; a missing node runtime is COULD-NOT-VERIFY, never a pass.

**D-c. One entry point, `lifecycle`, with subcommands** — `item
add|ready|park|close|ratio`, `ledger`, `lane list`, `kind`, `migrate`,
`--test`. One fire log, as §3.8 says.

**There are TWO exit-code contracts in this system and they are NOT the same
contract. Do not unify them, do not translate one into the other, and state
both in the plugin's own docs** (judgment desk, FIX 2):

- **The `lifecycle` CLI's own verbs EXIT** `0` = clean, `2` = a finding,
  `3` = could-not-verify. A finding and an unreadable input must not share a
  code. This is what a caller of `lifecycle item …`, `lifecycle migrate`,
  `lifecycle --test` reads.
- **A lane's `Trigger:` predicate — a command `lane list` EXECUTES, not a
  `lifecycle` verb — exits** `0` = fire, `1` = quiet, `≥2` = broken (§3.3,
  reserved there). `lane list` reads that code and reports the lane's state;
  the broken path is red-proven with a predicate that errors, so a dead
  predicate never renders as a clean board.

The collision is real and is why the desk called it out: `2` means "a finding"
in the first contract and "broken" in the second, and `lane list` is the one
place both meet — it EXITS under the first contract while READING the second.
A `lane list` run that finds a broken predicate is a finding: it exits `2`
under its own contract because it found something, not because it saw a `2`.

**D-d. Verb-by-verb order, and each stage lands its own commit.** The stages
are ordered so each one's verifier can run before the next exists:
  1. repo skeleton + manifests + the leak scan moved in + the scan armed on
     this repo's own first commit (§5's ordering constraint);
  2. the kind registry: `lifecycle.json` schema, `kind` verb, the declaration
     reader, the refusal rows for an ignored/absent/malformed declaration;
  3. `ITEMS.md` shape: schema line, fixed-slot blocks, the parser, the file
     lock, the shape check;
  4. `item add` with the intake join (§3.2), typed blockers, ids;
  5. `item ready|park|close` with the atomic move, baseline conservation, the
     archive section;
  6. `ledger` line kinds and its two gated readers (§3.6);
  7. `lane list` with exit-code semantics and longhand roster state;
  8. `--test` = the refusal table, every row red-proven;
  9. `migrate` with its classification report (§4 row 1's rules), run on
     cache-fix.
**Stages 1–8 are in the plugin repo. Stage 9 WRITES INTO cache-fix and is the
only stage that does** — see Write boundaries.

**D-e. The migration is a DRY RUN in this dispatch.** `migrate` produces
`ITEMS.md`, `ITEMS-DONE.md` and the classification report as new files;
**`BACKLOG.md` and `BACKLOG-DONE.md` are not deleted, not edited, and not
moved.** Retiring the old carrier is a separate act with its own review, after
a human has read the report. The design's acceptance criterion — "migration
report reconciles entry counts; zero entries routed to the ledger" — is a
property of the report and needs no destruction to check.

**D-f. Every classification rule in §4 row 1 is applied as written, and every
entry the rules do NOT cover is reported as UNCLASSIFIED with its grade word
and line number.** Never guess a mapping. An unclassified entry is a finding
for the desk, not a defect you resolve.

**D-g. `--test` is the refusal table, one bite per row, and a row you cannot
fire is reported as PROSE-REST with the reason** — the design already labels
one row that way and expects the labelling, not silence. Do not delete a row
to make the roster green.

**D-h. cache-fix's OWN declaration is part of stage 9, and its content is
assigned here** (judgment desk, FIX 1 — `8b6e2ec` registered no declaration
for the repo being migrated, so the migration had nothing to migrate INTO).

Stage 9 writes `.claude/lifecycle.json` in cache-fix and adds one line to
cache-fix's `.gitignore`. **The VALUES are assigned below; the KEY SPELLINGS
come from the schema stage 2 defines — this is one system, not two, and a
value below with no slot in that schema is a GAP TO REPORT, never a value to
drop.** Dispatch 1 (stages 1–3) therefore owes a schema that can carry every
one of them; that is a requirement on stage 2, not a discovery for stage 9.

- **id prefix** `cf` — item ids are `cf-<n>`, immutable across moves (§3.1).
- **`public: true`** — this repo is public; the publication bar in
  `CLAUDE.local.md` is why the value matters rather than decorates.
- **laws file: `CLAUDE.local.md`** — §3.3 names this repo explicitly and gives
  the reason (the tracked `CLAUDE.md` is upstream's and non-binding here). It
  is UNTRACKED by design. The declaration NAMES it; the 60-line cap check
  reads the WORKING TREE for that one file. A cap check that resolved laws
  through the index would report a clean 0 lines here — that is the
  could-not-verify shape, and it must exit `3`, never `0`.
- **closure home: `ITEMS-DONE.md`.**
- **`trigger-policy: on-demand`** (§3.4's default).
- **goals — FORK-NOTES' five loop stages:** `see`, `attribute`, `mitigate`,
  `verify`, `retire`. An item advancing none of these is a retire-lane drop
  candidate (§3.1), not a rejection at intake.
- **`ready-cap: 10`** and the head rule *a MITIGATE-goal item leads whenever
  one is complete* — both are the operator's 2026-08-11 decisions, carried by
  §3.1, not new choices.
- **lanes: none. template bindings: none.** Lanes are wave 2. An empty
  declared list is not the same as an absent key: absent is a checker finding,
  empty is a stated fact.
- **kinds registered in THIS dispatch: three only** — `items`, `done bodies`,
  `ledger lines`. Every other kind §3.0 enumerates (lanes, workflows,
  directives, audits, evidence carriers, worktrees, plugin-cache versions,
  detector findings) is wave 4 and is NOT registered here. Do not register a
  kind you are not migrating.

Each of the three carries all six §3.0 stages — a kind with an undeclared
stage is a checker finding, so none may be left blank:

| kind | home | writer | reader | staleness | exit | bound |
|---|---|---|---|---|---|---|
| items | `ITEMS.md` | tool — `lifecycle item add\|ready\|park\|close` only | the drain lane, `lifecycle item ratio`, the session-start banner | change-coupling — an item whose `evidence` or `requirement` record pointer no longer resolves | move → `ITEMS-DONE.md` on DONE or DROPPED; recording act = the `item close` fire-log line | unbounded, declared why: `ready-cap` 10 bounds the SCHEDULED head and the retirement ratio governs growth; a hard cap on the carrier would force silent drops, which is the failure the carrier exists to prevent |
| done bodies | `ITEMS-DONE.md` | tool — `lifecycle item close`, the atomic move; no other writer | the retire lane's conservation check; `item ratio`'s closed count | none, declared why: a closure record is history — it accumulates, it does not go stale; growth is the exit question, not a staleness one | compact — the retire lane folds bodies past the archive horizon into a summary line, recording act = a ledger `decision:` line naming the compacted range. **Wave 4; declared now so the kind has no undeclared stage, NOT implemented in this dispatch** | unbounded, declared why: this is the archive — the `BACKLOG-DONE.md` split of 2026-08-19 exists because 47% of the live carrier was archive; compaction is its control, not a bound |
| ledger lines | `LEDGER.md` | tool for the slots, SESSION for the reason prose (§3.6) | GATES only — `ledger rejected --for <item>` in the grade workflow, intake's join print, the state report's counts | none, declared why: §3.6 makes the ledger append-only decision history | never-delete; bound by compaction only (§3.6) | unbounded, declared why: §3.6 — one line per decision event, no bodies |

**One deviation from the desk's FIX 1 as stated, named rather than slid in.**
FIX 1 says two writes. Registering `ledger lines` with home `LEDGER.md` makes
three, because **cache-fix has no `LEDGER.md`** (checked at brief time: `ls -d
LEDGER*` → no matches). Stage 9 therefore also creates it, EMPTY apart from
its schema/header line. Reasons: a declaration whose home does not exist is
the absent-roster shape §3.3 calls BROKEN; and the design's own acceptance
criterion "zero entries routed to the ledger" becomes checkable at the
ARTIFACT rather than only in the migration report. It remains additive — no
existing file is touched by it. **This is the only place this brief adds a
cache-fix write the desk did not name; if the desk prefers the kind
unregistered until wave 2, that is a one-line correction at the dispatch-2
integration point, well before stage 9 runs.**

The `.gitignore` line is the same shape `.claude/lanes.json` already uses —
`.claude/*` with per-file negations, so the added line is exactly
`!.claude/lifecycle.json` (verified at brief time: `.gitignore:8` is
`.claude/*`, with negations at lines 9, 10 and 16). **An ignored declaration
is a refusal row in §3.9** — so this is not housekeeping, it is the
precondition that stops the checker reporting a clean board over a repo whose
declaration git cannot see. G1 in wave 0 is the recorded instance of exactly
this defect.

## Verifier (in order; real output pasted in the report)

1. **Every §3.9 row RED first, then green.** For each row: the firing input
   the table names, run against the implementation BEFORE that row's guard
   exists (or with that one condition disabled and restored BY FILE COPY —
   never `git checkout`/`restore`/`stash`, and delete `__pycache__` after a
   python revert). Report per row: the red, the green, and the arrangement.
   A row whose red is a module-load or import error proves the code is new,
   not that the check discriminates — say so and build a real one.
2. **`lifecycle --test`** — full output, full counts including skips, every
   skip dispositioned.
3. **The leak scan, on the plugin repo itself**, shown red on a planted
   `/home/<user>/…` path in a template and then clean. A clean scan that was
   never shown to fire proves nothing.
4. **`migrate` over cache-fix's real carrier**: paste the reconciliation —
   entries in, entries out per class, UNCLASSIFIED count, and the ledger count
   which must be zero. Then the conservation identity from §3.1 computed on
   the produced files.
5. **The old carrier is byte-identical afterwards**: `git -C <cache-fix>
   status --porcelain BACKLOG.md BACKLOG-DONE.md` prints nothing.
6. **The declaration is VISIBLE TO GIT** (D-h): `git -C <cache-fix>
   check-ignore -v .claude/lifecycle.json` must exit NON-ZERO with no output.
   Run it BEFORE adding the negation too, and paste both — an exit-0 line
   naming `.gitignore:8` first, nothing second. A check that was never shown
   to fire proves nothing, and this one has a known positive available for
   free: the same command against any other `.claude/` path still fires.
7. **The declaration's own refusal rows fire on it** — run §3.9's
   ignored-declaration and malformed-declaration rows against cache-fix's real
   `.claude/lifecycle.json`, not a fixture, and paste the red and the green.
   The laws-file row too: `CLAUDE.local.md` is untracked, so a cap check
   reading the index sees 0 lines and must exit `3` (could-not-verify), never
   `0`. Show that it does.

## Write boundaries

- **`~/dev/Gunther-Schulz/lifecycle`** — the whole repo; it is yours, you
  created it. Commit freely there; **never push, and never create a remote.**
- **cache-fix `/home/g/dev/vendor/claude-code-cache-fix`** — all from stage 9,
  and nothing else in that repo:
  - **five NEW files**: `ITEMS.md`, `ITEMS-DONE.md`,
    `docs/audits/migration-report-2026-08-26.md`, `.claude/lifecycle.json`,
    and `LEDGER.md` (empty but for its header — D-h).
  - **one EXISTING file, one added line**: `.gitignore` gains
    `!.claude/lifecycle.json` and nothing else. This is the ONLY edit to an
    existing cache-fix file anywhere in wave 1. **Nothing there is deleted,
    and no other existing file is edited** — in particular `BACKLOG.md` and
    `BACKLOG-DONE.md` stay byte-identical (D-e).
  - New files are invisible to a pathspec commit until `git add -N <path>`
    registers them — name the FILE, never a directory. `.claude/lifecycle.json`
    additionally needs its `.gitignore` negation to land in the SAME commit,
    or the add is silently a no-op against an ignored path.
- **Do not touch dotfiles at all.** Tier-2 migration is wave 1's second half
  in the design and is NOT in this dispatch; if you find yourself needing a
  dotfiles change, that is a gap to report.
- Commit by pathspec — `git commit -m "…" -- <paths>` with every flag BEFORE
  the separator; never `git add` then commit, never `-A`. Never amend.
- cache-fix is a SHARED working copy with live co-writers (this desk and the
  judgment desk). Its `test/fixtures/harvested/` carries a scheduled harvest
  timer's output — never assume a clean tree there, and never stage it.
- cache-fix is PUBLIC: no foreign home path, session id, capture id or
  transcript text in anything you write there. The migration report describes
  entries; it does not quote operator prose.
- Trailer on every commit:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## Commit plan

- **Guards, read rather than assumed:** the machine's global pre-commit is
  `~/dev/Gunther-Schulz/dotfiles/git/hooks/pre-commit` (`git config
  core.hooksPath` → that directory), and it runs in EVERY repo on this
  machine, including your new one. Its lane gate stays silent in a repo with
  no `lanes` declaration, which yours will not have. cache-fix additionally
  runs its full suite on PUSH, not on commit — and you do not push.
- Stage 1's commit must come after the leak scan is in place, per §5.
- One commit per stage of D-d, each with its own verifier output.
- No version bump anywhere; `0.1.0` is the plugin's birth version.

## Base state

- cache-fix: `b617ac7` at brief time; **`8b6e2ec` at the judgment desk's pass,
  and this file's own fix commit on top of it** (re-read at dispatch — this desk
  and the judgment desk both commit there, so a newer HEAD whose extra commits
  leave `BACKLOG.md`, `BACKLOG-DONE.md` and `docs/directives/` untouched is a
  fast path rather than a halt; report the changed-file list either way).
- `~/dev/Gunther-Schulz/lifecycle`: does not exist; you create it.

## The split: THREE sequential dispatches (settled)

Answered by the judgment desk 2026-08-26, accepting this desk's
recommendation and its reason — early reds, and a carrier still being written
to by two live desks:

| dispatch | stages | ends when |
|---|---|---|
| **W1a** | 1–3 — skeleton + manifests + leak scan armed; kind registry; `ITEMS.md` shape | this desk has run the refusal rows for stages 2–3 itself |
| **W1b** | 4–6 — `item add` intake join; `ready\|park\|close`; `ledger` | same, for stages 4–6 |
| **W1c** | 7–9 — `lane list`; `--test` roster; `migrate` + D-h's declaration | same, plus the migration reconciliation |

Sequential, never parallel: each dispatch's base is the previous one's
integrated HEAD in the plugin repo, and **this desk books each report and
verifies its refusal rows before the next opens.** The design priced wave 1 at
one dispatch; three pays the fixed context load three times and adds two
integration seams, and that cost was accepted deliberately in exchange for the
three early reds.

## Report channel — read this, it is a fixed defect

**The report is your FINAL MESSAGE.** It returns to this desk by construction.
Do not assume any other channel delivers.

**For a BLOCKER mid-flight**, before you send anything: run `ListAgents`, find
the row naming this desk, and send to the name exactly as that row prints it.
**Do not hardcode a name from this brief.** If no row resolves to this desk,
**HALT and make the blocker your final message** — do not pick a
plausible-looking substitute and do not continue past the blocker.

Why this paragraph exists, since it will look like fussing: in wave 0 this
desk's briefs named `SendMessage to claude-code-cache-fix-b4` as the report
channel. That name **does not resolve from inside a subagent.** One lane said
so in part 1 of its report, routed elsewhere, and its four-part report sat
undelivered while this desk walked an escalation ladder built for a stalled
lane and reached a confident wrong conclusion about a lane that had done
everything right. The defect was the brief's, not the lane's.
