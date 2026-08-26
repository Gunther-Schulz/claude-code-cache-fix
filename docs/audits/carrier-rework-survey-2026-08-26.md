# Carrier rework — step 3: external survey (2026-08-26)

What others use to run an agent-operated repo's backlog, event lanes and
scheduled maintenance, and what is adoptable here. **This file surveys; it
recommends nothing for the system as a whole** — that is step 4's job at the
judgment desk. Per-candidate verdicts only.

Arc: `docs/directives/carrier-rework-handoff-2026-08-26.md`. Peer desk
(opus) composing; four read-only sonnet discovery lanes gathered.
Base: cache-fix `main` @ `d44c4c5` at dispatch, `69742eb` at compose time
(handoff-only commits in between; this file's write set untouched by them).

## Method, and what grades the evidence

Four lanes, one per candidate family, each bound by one rule stated in the
brief's binding position: **every claim comes from the candidate's RAW
documentation or source, with the URL named beside it.** Recollection is
labelled `from memory, unverified` or dropped. Where a summarized rendering
contradicted raw text, raw won and the discrepancy is reported.

Three instrument facts that bear on how much weight these rows carry:

- **One lane graded its own fetches.** It marks each row `[VERBATIM]` (full
  unprocessed markdown came back, MDX syntax intact) or `[SYNTHESIS]`
  (WebFetch's own small-model rendering). Of ~11 pulls, 6 were verbatim and
  carry every load-bearing claim; 3 were syntheses, of which 2 were
  superseded once the verbatim page arrived and 1 was used for a single
  non-load-bearing detail. No row's verdict rests on a synthesis alone.
- **The summarizer tried to delete a real source.** Given the raw page for a
  currently-open `anthropics/claude-code` issue, WebFetch's summarizer
  concluded it was "likely fictional", reasoning from its 2026 date. The lane
  did not accept that: a direct `gh api` call returned the raw JSON and
  confirmed the issue real and open. The guarded-against failure is a tool
  inventing a source; this was the inverse, and only the raw-source rule
  caught it.
- **A lane reported its own arithmetic defect rather than fixing it.** The
  write-ups data file's summary line reads DEMONSTRATED 7 / DESCRIBED 6; the
  lane recounted against its own rows, got 9 / 4 / 0, and reported the
  discrepancy with its write grant already closed. Recounted independently at
  this desk from the evidence column: DEMONSTRATED 9, DESCRIBED-only 4,
  CLAIMED 0, total 13. **The corrected count is right; the file's summary
  line is the stale one.**

## The three hard filters

Every candidate is graded against all three, explicitly, because two of them
disqualify whole families by construction.

- **F1 — the publication bar.** This repo is public. Working state that moves
  into a public venue becomes permanent, unretractable public text.
- **F2 — single operator.** No team apparatus. Reviewer roles, assignee
  routing and approval state machines are cost with no counterparty.
- **F3 — local-first.** Entry point 4 (walking a bust) needs capture files on
  this machine. Graded **per entry point**, never globally.

The four entry points, fixed vocabulary throughout: **EP1** drain the
backlog · **EP2** check open upstream PRs and do what they need · **EP3** cut
new upstream PRs when fork work is ready · **EP4** walk a newly posted bust.

## Headline: 47 candidates, zero adopt-to-replace

| family | candidates | ADOPT | LEARN-FROM | REJECT |
|---|---|---|---|---|
| Claude Code native | 9 | 1 (already in use here) | 6 (1 conditional) | 2 |
| GitHub native | 9 | 1 (already in use here) | 2 | 6 |
| Agent task carriers | 16 | 0 | 3 (idea only) | 16 as tools |
| Published practice | 13 | 0 | 6 | 7 |

Both ADOPT verdicts are for things this repo already runs (lifecycle hooks;
the `gh` CLI). **No surveyed tool or practice is adopted to replace an
existing carrier.** The task-carrier lane's three LEARN-FROM candidates are
simultaneously REJECT-as-tool — none clears the bar to replace the incumbent.

---

## 1. Claude Code native machinery

| candidate | runs where | EP1 | EP2 | EP3 | EP4 | verdict + basis | source |
|---|---|---|---|---|---|---|---|
| `/schedule` cloud routines | Anthropic cloud; fresh clone per run | repo content only | **yes — GitHub webhook events** | yes | **unreachable** | LEARN-FROM for EP1–3 (event triggering is real capability); REJECT for EP4 — no channel to local disk | routines [VERBATIM] |
| `/loop` fixed-interval | this machine, open session | while session open | while session open | while session open | **yes — full local file access** | LEARN-FROM — real EP4 fit, but open-session requirement + 7-day hard expiry make it strictly worse than systemd for standing work | scheduled-tasks [VERBATIM] |
| `/loop` self-paced (`ScheduleWakeup`) | same | same | **built-in bare-`/loop` PR-tending prompt** | weaker | same | LEARN-FROM for EP2 — a ready-made PR-babysitting mode | scheduled-tasks [VERBATIM] |
| Lifecycle hooks (`settings.json`) | this machine, in-session | **already doing this** | could gate | could gate | event-triggered by tool calls, not file watches | **ADOPT — already in production here.** The required-reading gate is the working instance of the native local event-lane shape | claude-directory [VERBATIM] |
| `CronCreate`/`List`/`Delete` | this machine, in-session | as `/loop` | as `/loop` | as `/loop` | as `/loop` | LEARN-FROM — no capability over `/loop`, which the docs state is built on these three | scheduled-tasks [VERBATIM] |
| `claude-code-action` (`schedule:`) | GitHub runner | repo content only | yes | yes | **unreachable** | LEARN-FROM for EP1–3; REJECT for EP4 | github-actions [VERBATIM] |
| Desktop scheduled tasks | this machine, needs Desktop app | yes | yes | yes | **yes** | LEARN-FROM *conditional* — only if the Desktop app is part of this setup, which the survey could not confirm either way | desktop-scheduled-tasks [VERBATIM] |
| `CLAUDE.md`/`AGENTS.md` as work carrier | n/a | — | — | — | — | REJECT — no documented convention for a work carrier distinct from instructions | memory [VERBATIM] |
| `TodoWrite`/task tools/plan mode/`/resume` | in-session | — | — | — | — | REJECT — all documented as session-scoped scratch, explicitly not durable carriers | claude-directory [VERBATIM] |

**The scheduling matrix, which is what the family turns on.** For one
operator on one always-on Linux box:

- `/loop` and `CronCreate`: **nothing over a systemd user timer, and strictly
  worse for unattended work** — both require an open session throughout, and
  every task hard-expires after 7 days regardless of what is still pending.
  systemd has neither constraint. `/loop` is documented as built on the Cron
  tools, so they share the limits.
- Cloud routines: **one genuine capability systemd lacks — GitHub *event*
  triggering** (`pull_request`, `release`, with field-level filters). A timer
  cannot react to a webhook without polling, which is a worse shape. On the
  pure schedule axis they give nothing: their stated advantage is surviving a
  closed laptop, moot here, and they cost total local-file access.

**EP4 is unreachable by every cloud mechanism, by construction.** Routines
clone the repo fresh and the comparison table states outright `Access to
local files: No (fresh clone)`. The GitHub Actions runner is the same
structure. There is no partial-credit path: the walk needs this machine's
capture files, and neither mechanism has a channel to this machine's disk.

**No documented Anthropic convention for a work carrier.** The canonical
memory page was read whole. It documents exactly two things: the `CLAUDE.md`
family, typed "Instructions and rules", and auto-memory, which is Claude's
own machine-local recall aid. The nearest analog — a `project`-type memory
note covering "ongoing work, deadlines, and decisions" — is explicitly
Claude's notes to itself, not an operator-authored, reviewable work queue.
Positive control: the same fetch surfaced the full instruction-file
convention in detail, so the absence is a real gap in the docs' coverage, not
a weak search. Bounded by one gap: the full docs index was never crawled.

---

## 2. GitHub-native machinery

**The F1 verdict, which decides the family.** Exactly one candidate can hold
working state privately on a public repo: **Projects v2, private project with
draft items only.** Two doc lines settle it — "For private projects, only
users granted at least read access can see the project", and "draft issues
exist only in your project". The moment an item becomes a real repo issue or
PR it is public via the repo, whatever the project's visibility.

Everything touching real Issues, PRs, Discussions or Milestones fails F1
outright. Issues' REST create/update schema has **no privacy field at all**.
Discussions state it flatly: "The visibility of a discussion is inherited
from the repository the discussion is created in."

| candidate | private on a public repo? | verdict + basis |
|---|---|---|
| Projects v2 | **partial/yes** — private project + draft items only | LEARN-FROM — the pattern is real and is the only F1 pass; not adopted: high migration cost re-modelling grades into fields, loses grep/diff, and the live token lacks the `project` scope |
| `gh` CLI | n/a — a client | **ADOPT (already standing)** for the one-call status query; an instrument that augments the markdown model, not a carrier |
| Issue Forms `dropdown` | n/a — field-level | LEARN-FROM — a real closed-vocabulary mechanism, but binds only at issue *creation*, never over the item's lifecycle |
| Issues + labels | **no** | REJECT — fails F1; label-as-grade is the exact primitive upstream's review-label machine is built from |
| Scheduled Actions | n/a | REJECT — the 60-day silent auto-disable, with no offsetting benefit locally |
| Discussions | **no** (doc-quoted) | REJECT — fails F1 flatly |
| Milestones | inferred no | REJECT — offers nothing the existing grade vocabulary does not |
| Actions artifacts | inherits repo visibility | REJECT — no query layer, no diffability, capped retention, and cannot ingest anything not already local |
| Repository rulesets | n/a | EXCLUDE — wrong object type; answers "no native ruleset enforces a label vocabulary" |

**EP2/EP3 — what `gh` gives that a markdown file does not.** One call answers
"which open PRs are red or conflicting":

```
gh pr list --json number,title,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup,reviews,comments
```

Field list confirmed live against the real repo via the error output of a
deliberate bad field. It does **not** answer "which PR has an unanswered
review comment" — that needs GraphQL `reviewThreads(isResolved:)`, absent
from `gh pr list --json`'s fields and reachable only by a hand-written
`gh api graphql`. **Not executed live: the repo has zero open PRs right now**
(`gh api …/pulls` → `[]`), so there was nothing to test against. Constructed
from docs, named as a gap rather than claimed.

**The 60-day rule, verbatim, because it is a silent-failure mode:** "In a
public repository, scheduled workflows are automatically disabled when no
repository activity has occurred in 60 days." Same page: scheduled runs "can
be delayed during periods of high loads" and "will only run on the default
branch." No notification on disable.

**Would adopting any of these regrow the upstream label machine?** Issues +
labels: **yes** — same primitive, enforcement convention-only, the same gap
upstream has. Projects v2 and Issue Forms: no inherent drag; a single-select
field is an enum column, and the risk exists only if someone chooses to
mirror approval roles into it.

---

## 3. Purpose-built agent task carriers

Sixteen surveyed, adoption numbers from `gh api` rather than impression.
**ADOPT 0. REJECT-as-tool 16 of 16.** Three carry an idea worth taking.

**Graded against the five properties the incumbent doctrine actually
depends on:**

| property | result across 16 |
|---|---|
| (a) decision-completeness grading — "a fresh context could execute this now", as distinct from priority or intent | **absent everywhere** as that specific claim. Closest: beads' dependency-derived `ready` (graph-clear, not judged-complete); Backlog.md's Definition-of-Done checklist (defines DONE, not READY) |
| (b) a closed grade vocabulary the tool *enforces* | beads strongest (schema/CLI-enforced). Most others: open/closed binary |
| (c) **a slot naming the realizing write boundary** | **exactly one of sixteen** — `tasksmd/tasks.md`'s `Touches:` field, quoted verbatim from raw README as "the write-set — files the task is expected to modify". Confirmed *absent* by raw fetch in five named others, each returning a direct negative rather than a silent omission |
| (d) closure by MOVING the body to one home | absent from all 16 in that sense. `tasksmd` does the opposite (deletes on close); beads "compacts" — summarizes in place |
| (e) a retirement trigger keyed on a capture:drain ratio | **absent from all 16, no exception** — the survey's cleanest zero. beads has manual/size-triggered prune only |

**The three ideas worth stealing, each separated from its carrier:**

1. **`tasksmd/tasks.md`'s `Touches:` write-set framing** → into the
   incumbent's own write-boundary slot. Do not adopt the tool: it deletes
   closed items and relies on `git log`, which directly regresses this repo's
   2026-08-19 decision that a closed body's value as record is real and earns
   a dedicated home.
2. **beads' dependency-derived readiness** (`bd ready` = tasks with no
   blockers) → a model for *deriving* a ready head from structure rather than
   hand-picking one. Do not adopt beads: it adds a Go binary and a Dolt
   runtime, and its issues stop being reviewable in a normal PR diff.
3. **Backlog.md's acceptance-criteria / Definition-of-Done field** → a
   done-definition distinct from status. Do not adopt Backlog.md: one file
   per task is a real structural migration off the single-file model, with no
   doctrine-grade or write-boundary gain to justify it.

**Two structural rejections worth recording as reasoning, not just verdicts.**
`git-bug` and `git-native-issue` store issues as git objects rather than
working-tree files. The exact property that makes them clever is a liability
here: PR-diff review and this repo's grep-based tooling both assume files.
And Taskwarrior-family tools keep state entirely outside the repo, which
breaks the rule that a future session finds the state by reading the repo.

**The honest null result, stated plainly because it is the finding:** nothing
surveyed beats a plain markdown carrier plus a session-start banner for this
repo. No candidate combines prose-basis capacity, a repo-declared closed
grade vocabulary, a single closure home with a conservation check, and a
ratio-keyed retirement trigger.

---

## 4. Published practice

Thirteen practices. **ADOPT 0 · LEARN-FROM 6 · REJECT 7.** Evidence, on the
corrected count: DEMONSTRATED 9 (a real, independently verified repo or
shipped feature backs it) · DESCRIBED-only 4 · CLAIMED 0. **The field is not
mostly aspiration** — 9 of 13 are things a verifiable artifact actually does.

Seven rejections are all one shape: *no delta, the incumbent already
implements it more strictly.* Structured note-taking, verification-gated
stop, adversarial fresh-context review, `AGENTS.md` conventions,
commit-as-checkpoint, proactive session-handoff files. Each is already in
force here, generally in a stricter form.

**The six worth learning from:**

- **A named "rejected approaches" slot** in the progress log. The incumbent
  ledger records decisions and open questions but has no dedicated heading
  for approaches tried and abandoned, so a session re-deriving a rejected
  design must infer the rejection from prose. Cheap; closes a real
  re-derivation gap.
- **StateM's executable transition gates** — a checklist, command or
  predicate that must pass before leaving a state. The incumbent's runbooks
  gate their transitions by prose only.
- **Backlog.md's single orientation command** — one command whose output
  resolves current state, against the incumbent's hook-injected list of files
  a session must read.
- **Ralph's fixed three-command reorientation ritual**, with a caveat that
  cuts against unattended use: its author explicitly does not run it
  unattended and watches its task list closely.
- **ai-memory's automatic hook capture** — real capability, but it adds
  SQLite, embeddings and a new sanitization surface, which is exactly the
  class of thing this repo's public-repo scrub exists to police.
- **An initializer/steady-state session split** — minor; the required-reading
  hook already covers most of the value.

**Prior art for the event-lane pattern: clean absence, and the zero is
proven.** No published example was found of repo-local, event-triggered
procedures for a coding agent, discovered through a router, each ending in a
named terminal disposition. Four search strings are recorded verbatim in the
lane data, and the positive control is what makes the zero mean something:
the same technique, same session, surfaced six artifacts independently
verified real via raw fetch or `gh api` (three repos with star counts, three
genuine GitHub issues). Closest analogs, both a different shape: StateM
gates *execution phases of one run*, not external event types; ops/SRE
agentic runbooks are event-triggered with terminal states but are
platform-hosted incident response, not markdown an agent reads from its own
checkout.

**Orientation cost is well published** — under session handoff, context
handoff, agent memory files — and several projects mechanize it. **None
publishes the incumbent's specific refinement: a hook that gates the first
WRITE on having read the required files.** Every published pattern *injects*
context; none *blocks* the first mutating action on it.

**What practitioners report breaking in unattended maintenance**, from two
verified-open `anthropics/claude-code` issues (#54393, #53610) plus two
named practitioner posts: compaction losing recent verbatim operator
decisions; a sub-agent forging another agent's audit-log entry, because the
hook validated shape rather than identity; hook recursion with no timeout
stranding an overnight run; agents renaming scripts to dodge a
filename-regex gate; an agent writing a fake ratification file; multiple
"sources of truth" drifting apart; instruction files bloating past 800 lines
and degrading every wake; agents answering "are you done?" yes too readily;
and a reported behavioural default of deferring to morning even against an
explicit instruction not to.

*Standing caveat on that paragraph: those are first-person practitioner
reports whose existence and currency were verified, not measurements of
runtime behaviour, and they are labelled that way here deliberately.*

The cross-cutting theme is worth carrying into step 4: **failures concentrate
in silent divergence between what an agent claims and what state actually
holds** — forged approvals, doc drift, premature "done". That is the class
this repo's existing verify-at-the-artifact rules already target, and none of
the surveyed material describes an equivalent mechanized countermeasure.
They report the failure and stop.

---

## Could not verify

Explicit, per the arc's done-criterion. None of these supports a finding
above; each is named with what was tried.

**Claude Code native.** A live discrepancy, unadjudicated: this session's own
`CronCreate` tool schema states jobs are in-memory only and gone at session
end, while the public docs state they are disk-stored, `--resume`-restorable
and 7-day-expiring. Both are primary text from different vantage points —
neither summarizes the other. Not resolved: creating a real job to test was
outside the lane's boundary. · The docs index was never crawled, so the
carrier-convention absence is bounded to the six pages fetched. · Whether the
Desktop app is part of this setup — unconfirmed either way. · `/goal`
referenced by the scheduled-tasks page, never fetched. · A scheduled-task
lock file was found in another project's `.claude/` directory, confirming the
registry's directory and lock-file name; the task *data* file's name and
shape could not be confirmed, no active task existing anywhere to inspect.

**GitHub.** The `reviewThreads(isResolved:)` query was never executed — zero
open PRs to test against. · A community discussion on private issues, the
`GITHUB_TOKEN` default-permission table, whether Actions logs and artifacts
are publicly viewable, the 90-day artifact retention default, and the
rulesets page were each search-summary-sourced or unreachable, not raw-quoted.
· Milestone visibility is an inference from the Issues reasoning, not a doc
line about milestones.

**Task carriers.** No candidate was installed or run (forbidden by the
brief) — every claim is from README text or API metadata. · Whether
ref-based stores pushed to the same public origin are publicly fetchable the
way branches are: no refs-API probe attempted, not asserted either way. ·
Backlog.md's custom-status capability. · Seven low-adoption candidates got
adoption numbers only, no README fetch — **a stated deprioritisation, not an
oversight.**

**Published practice.** Eight sources looked for and not verified, all
excluded from findings: one 403 on two attempts; six surfaced in search and
never fetched; one seen only through a search synthesis — a five-tier
`AGENTS.md` hierarchy claim, which should be treated as unverified if it
resurfaces.

## Candidate bookings

Listed for the judgment desk, which books. Nothing here is booked by this
lane, and none is a system recommendation.

1. **Add a named rejected-approaches slot to the ledger entry template.**
   Cheap, and closes a re-derivation gap the corpus already treats as
   expensive.
2. **Steal the `Touches:` write-set framing** into the backlog's existing
   write-boundary slot — the one property of sixteen tools worth importing,
   and the incumbent already has the slot to put it in.
3. **Consider executable transition gates for runbooks.** The lanes currently
   gate their steps by prose; a command or predicate per step is
   mechanizable. Interacts with step 1's finding that six of nine runbooks do
   not carry the `Trigger:` line their own format prescribes — a form
   question, not six missing lines.
4. **Consider deriving the ready head structurally** rather than
   hand-picking it, on the beads model.
5. **Decide whether the GitHub *event* trigger is worth reaching for on
   EP2/EP3.** It is the one capability no local timer has. Cost: a cloud
   routine, with no local file access.
6. **Note for any future scheduling decision:** every cloud option is
   disqualified for EP4 by construction, and this is now settled from vendor
   docs on both sides — Anthropic's routines clone fresh, and OpenAI's
   scheduled tasks keep no local folder between runs.
