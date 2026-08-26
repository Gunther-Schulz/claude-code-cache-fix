# Handoff — carrier & event-lane system rework: discovery arc (2026-08-26)

Judgment desk: `claude-code-cache-fix-9e [96132d]` (fable). Peer desk:
`claude-code-cache-fix-b4 [2bb912]` (opus). Operator GO 2026-08-26 for
the discovery arc (steps 1–3 below); the seam proposal and the plan
(steps 4–5) stay at the judgment desk and are NOT part of this handoff.

REPORT-CHANNEL: SendMessage `claude-code-cache-fix-9e [96132d]`
Cadence: one digest message at the end of each step (1, 2, 3), each
naming the state token (audit-file commit sha) it was composed against;
immediate messages only for blockers or a decision only the operator can
make (those go to the judgment desk, never straight to the operator).
Judgment-desk horizon: a look at the audit files every ~45 min.

Wave 1 (step 1) starts only after the peer desk has acknowledged that
the operator's delegation confirmation is on its own record.

State-dependent: valid unless `docs/audits/carrier-rework-*.md` already
exists in cache-fix — then report which step is done and continue from
there, never restart.

## Why (operator, restated — not a quote)

The operator returns to this repo through four recurring entry points and
re-derives "what now" each time: (1) drain the backlog, (2) check open
upstream PRs and do what they need, (3) cut new upstream PRs when fork
work is ready, (4) walk a newly posted bust. The carrier system that
should make those mechanical — BACKLOG/LEDGER/runbook files, their
grades, the session-start banners and gates that read them, in this repo
AND in the dotfiles corpus that defines the defaults — grew by accretion
and is not lean; the operator's read is that the global half is
half-baked too, and that an event-lane system should exist GLOBALLY so any
project can adopt it. Target: a robust, lean system. This arc gathers the
evidence the redesign rests on; it designs nothing.

Trajectory (FORK-NOTES loop stage): none directly — this is the
machinery the loop runs on; the plan will say whether that is a missing
stage.

Operator decision (2026-08-26, after kickoff, restated): the default AI
tendency is to add or amend; this rework weighs CUTTING and FULL REWRITE
(cut and replace) as first-class options, not fallbacks. Consequences:
every inventory row (steps 1a/1b/1d) carries a USE-EVIDENCE column —
when the thing last demonstrably fired, was read, or was followed, with
basis, or "no evidence of use" — so retirement candidates are derived,
not judged; and the step-4 proposal states each item in three shapes,
cut / rewrite / amend, with amend having to earn its place against the
other two.

Operator clarification (same day, restated): GREENFIELD thinking, beyond
retirement evidence. Step 4's method is therefore: design the target
system from requirements alone — the four entry points, the operator's
constraints (single operator, public repo, local-only bust evidence,
lean), and the failures the record shows actually occurred — with the
current system out of view; THEN diff the design against the inventory.
What the greenfield design independently re-derives survives; what it
does not is cut by default, and an existing mechanism re-enters only by
naming the requirement the design missed. What discovery owes for this:
each inventory row carries a REQUIREMENT column — the incident or
failure the item was minted to prevent (with the ledger/journal/commit
that records it), or "no recorded motivation" — because the requirement
is what must survive, the mechanism is disposable.

Operator question (same day): fold in the dispatch-guards plugin drift
(active 0.11.4, released 0.11.5 on 2026-08-23, 25 cached versions)?
Judgment-desk answer, basis executed: the detector fired (this session's
start hook printed the outdated warning with its fix command); what
failed is that the fix is a human-run command nobody ran for three days,
and the cache cleanup has no detector at all. Folded in as a step-4
REQUIREMENT, not as plugin work: every detector's output has a
disposition path that is not "the operator remembers" — auto-apply
where safe, a booked item otherwise. Same class as a lane minted and
never run, and a scheduled gate whose findings nobody closes.

Operator requirement (same day, restated): the backlog grows faster than
it drains, always; grade additions (RECORD etc.) did not fix it; a
system that merges, batches and prioritizes the existing queue is part
of the target — and whether the kämmung skill is sufficient for that is
an open question (judgment-desk read: it is the right shape but
operator-invoked, so it inherits the detector-lands-on-a-human class;
unverified beyond that). Step-4 requirement: DRAIN is the default
behaviour of the carrier — ready items dispatch on schedule, merge and
batch are a mechanical join over write-sets, the retirement pass runs
on the ratio without a human remembering — measured today at ~3.5:1
against the 3:1 tripwire in both dotfiles backlogs with the banner
firing and nothing draining (inventory, candidate booking 16).

Operator observation (same day, restated; articulated at the judgment
desk, operator to confirm): items enter by two paths — a session
noticing a gap, or the operator mentioning one — and both end in the
same act, an APPEND. Nothing at intake asks whether the item already
exists, supersedes or obsoletes another, or costs less to do than to
book; the judgment is deferred to grooming, where it is expensive and
operator-invoked. Step-4 requirement: INTAKE IS A MERGE, not an append —
a candidate is joined against the live set on requirement and write-set
and exits as do-now / merge-into / supersede (the superseded body moves
to the closure home with the reason) / new, with "new" the last outcome;
operator mentions carry authority over the do-or-book choice, session
findings pass the cost test. The corpus's "two exits, done or booked"
rule is thereby a cut/rewrite candidate: it makes booking read as
compliance. Kämmung stays as the backstop, never the mechanism.

## Base commits (read at compose time)

- cache-fix `main` @ `7802c82` (working tree carries untracked harvested
  fixtures and a modified LEDGER-Siren.json — not yours, leave them).
- dotfiles `main` @ `4250e66` (`/home/g/dev/Gunther-Schulz/dotfiles`) —
  READ-ONLY for this arc.

Arrival check in cache-fix: `git merge-base --is-ancestor 7802c82 HEAD`
and `git log --oneline 7802c82..HEAD`; commits on top that touch
`docs/audits/carrier-rework-*` mean a prior lane ran — read them, don't
redo. Other commits on top (the judgment desk may commit this handoff
file) are expected and harmless to your write set.

## Grounding — read before step 1; the digest cites what was read

- `CLAUDE.local.md` (this repo) — the publication bar; binds every file
  you commit here. Your audit files describe MECHANISMS and counts; no
  content from other sessions' transcripts, no operator quotes.
- `docs/dev-loop.md` — sections "Which line are you on" (line 53, the
  nine-row lane table is the registered-lane set for step 1d) and "The
  closing gate" (line 1740, incl. the CARRIER REGISTRATION clause and
  `state-report`) only; the file is 2548 lines — scoped reads.
- `~/.claude/runbook-format.md` (dotfiles `claude/runbook-format.md`) —
  the lane format the current system prescribes.
- `~/.claude/runbooks/INDEX.md` — the machine-wide router (one lane; its
  own text says it is checked by nobody).
- `~/.claude/CLAUDE.md` + `modules/accretion.md` (file roles, backlog
  doctrine) and `modules/insurance.md` — the global defaults under
  review. Read for INVENTORY, not to obey as design.
- `~/.claude/CLAUDE-maintenance.md` — how the corpus is edited (so the
  plan later lands correctly); skim.

## Step 1 — inventory the system AS IT OPERATES (not as documented)

Output: `docs/audits/carrier-rework-inventory-2026-08-26.md`, one table
per class. Every row from an executed read (a file opened, a hook run
with `--test`, a `systemctl` listing), basis column mandatory;
"documented but not found" and "found but undocumented" are rows.

Classes to enumerate, exhaustively:

a. **Carriers** — every persistent file a session is expected to read or
   write as process state, in BOTH repos: cache-fix `BACKLOG.md`,
   `BACKLOG-DONE.md`, `LEDGER`-role files (find them: grep for the
   `Closure-home:`/ledger declarations, `.claude/required-reading.json`),
   `docs/directives/*`, `docs/runbooks/*`, `docs/audits/*`,
   `test/fixtures/harvested/LEDGER-*.json`, threat-matrix
   `.status.json`, whatever `tools/state-report` collects; dotfiles
   `BACKLOG.md`, `claude/BACKLOG.md`, `claude/JOURNAL.md`,
   `claude/records/`, `claude/runbooks/`, `claude/readiness.json`,
   `claude/OPERATOR-NOTES.md`, dev-notes OBSERVATIONS files,
   dispatch-guards' own carriers. Per row: role (per accretion.md's role
   list or "no declared role"), size (lines, entries), who WRITES, who
   READS (name the hook/tool/runbook or "a session that remembers to"),
   declared grade vocabulary vs. grades actually present (the
   session-start banner here reported 26 unknown grade words, RECORD×187,
   HANDOFF×7 — reproduce that count with the banner's own script, find it
   in dotfiles hooks).
b. **Readers/enforcers** — every hook, gate, banner and doctor check that
   reads a carrier: dotfiles `claude/hooks/*.py`, `git/hooks/*`,
   `bootstrap/doctor.py`, `tools/lane-check.py`, the dispatch-guards
   plugin hooks (`~/.claude/plugins/cache/dispatch-guards-marketplace/…/hooks/`),
   cache-fix `tools/state-report`. Per row: what it reads, what it emits,
   whether its `--test` bite passes today (run it), and whether its check
   is prose-scoped ("## Open only") — the banner already admits that
   scoping.
c. **Scheduled machinery** — `systemctl --user list-timers --all` and
   the units (`cache-fix-gate`, `cache-fix-harvest` exist; find any
   other claude-related timer, cron, or `/schedule` routine), what each
   produces, and where its findings LAND (a file nobody reads is the
   finding — dev-loop's recurring-producer clause).
d. **Lanes** — every runbook in `docs/runbooks/` (nine registered in the
   dev-loop table) and `~/.claude/runbooks/`: trigger, kind
   (event/intent), terminal states, last time it was demonstrably
   followed (grep LEDGER/journal/commit messages for the lane name), and
   which of the four entry points it serves. Also lanes that exist only
   as prose inside `dev-loop.md`/`CLAUDE.local.md`/`FORK-NOTES.md`
   (e.g. the update-from-upstream procedure) — list them as unregistered
   lanes.

## Step 2 — measure the four entry points against the record

Output: `docs/audits/carrier-rework-entrypoints-2026-08-26.md`.

For each of the four entry points, over the last 4 weeks (2026-07-29 →
now): how many sessions entered through it, and per session roughly how
much was ORIENTATION (reading carriers, re-deriving state, asking the
operator what is current) versus WORK. Instruments: the `session-search`
MCP tools (`list_sessions`, `search`, `get_thread`) over the cache-fix
project; `git log` of both repos; LEDGER/journal entries. This is a
count with a stated method, not an impression: state the query, the
hit count, and a hand-classified sample size; label the split an
ESTIMATE where it is one. Publication bar applies: you may cite session
counts and your own summaries, never transcript text.

Also per entry point: the current de-facto procedure (which files the
session actually opened first, from the transcripts), and where it
stalled or asked the operator — those stalls rank the lanes.

Separately for entry point (4): list every bust-related producer
(`bust-triage`, `gate-live`, the ntfy/notify hooks, the statusline)
and trace what happens today from "bust observed" to "disposition
recorded" — who is human in that chain.

## Step 3 — external survey

Output: `docs/audits/carrier-rework-survey-2026-08-26.md`.

Question: how do others run an agent-operated repo's backlog, event
lanes and scheduled maintenance, and what is adoptable here. Hard
filters: the publication bar (this repo is public; every carrier entry
would be public text if it moves to GitHub), single-operator (no team
apparatus), local-first (the bust lane needs local captures; cloud
routines cannot see them).

Candidates to check (all "from memory, unverified" — verify each from
its RAW source/README, and list what else you find):
- Claude Code native: `/schedule` cloud routines, `/loop`, hooks +
  `CronCreate`, the GitHub `claude-code-action`, `AGENTS.md`/`CLAUDE.md`
  conventions in the docs.
- GitHub native: Issues + labels as a closed grade vocabulary, Projects
  (v2) fields/automation, scheduled Actions running an agent, `gh`
  CLI as the carrier API.
- Agent-oriented task carriers: `MrLesk/Backlog.md` (markdown-native
  task manager with CLI + MCP), `steveyegge/beads` (git-backed issue
  graph for agents), any others with real adoption.
- Published "agentic repo maintenance" write-ups (Anthropic engineering
  blog, OpenAI/Codex docs on cloud tasks, notable OSS maintainers).

Per candidate: what it gives for each of the four entry points, what it
would cost (migration, lock-in, public exposure), and a one-line
adopt / learn-from / reject with basis. No recommendation for the
whole system — that is step 4 at the judgment desk.

## Boundaries

- Write set: `docs/audits/carrier-rework-*.md` in cache-fix ONLY. Commit
  by pathspec (`git add -N <file>` first for new files; `git commit -m
  "…" -- <paths>`), trailer `Co-Authored-By: Claude Opus 5
  <noreply@anthropic.com>`; push to `origin main` per this fork's
  commit-means-push convention (pre-push runs the leak scan and the
  suite; a red from someone else's state is reported, never
  `--no-verify`). Never amend.
- No edits to BACKLOG/LEDGER/corpus/dotfiles/hooks. Findings that look
  like work items are LISTED in the audit file under "candidate
  bookings" — the judgment desk books.
- Scratch: your own scratchpad.
- Routing inside the arc is yours: step 1 and step 3 are fan-out-shaped
  (sonnet discovery lanes per class/candidate, read-only tail); step 2's
  classification stays at your desk. Name lanes `<model>-<slug>`.
- Gaps (a file missing, an instrument not runnable, a count that cannot
  be established) are reported as gaps, never bridged.
- Stop and ask the judgment desk before: anything touching the running
  proxy, any `gh` write, any read that would pull another session's
  transcript text into a file.

## Done-criterion for the arc

Three audit files committed and pushed, each with a basis column per
row, a "could not verify" section (explicit, "none" allowed), and a
"candidate bookings" tail; a digest per step sent; the closing digest
lists (a) files + shas, (b) checks run with counts, (c) gaps, (d)
deviations, (e) candidate lessons, (g) not verified, (h) sources read.
