# Directive: the mitigation round, 2026-08-16

Handed to a peer session by the desk. This is a HANDOFF, not a subagent
brief: you hold the judgment inside each item, you own the working copy, and
you take your own decisions to the operator. What follows is the evidence
you would otherwise re-derive, the decisions already made, and the ones that
are explicitly NOT yours.

## Writer ownership — read this first

**You own `/home/g/dev/vendor/claude-code-cache-fix`.** The previous holder
(session `-6d`) closed cleanly: HEAD `9d35504`, nothing unpushed, tree
clean, carve-outs intact. The desk is hands-off on that clone from the
moment it sends you this pointer.

Two things are NOT yours to change:

- **`wip/resume-key-third-read`** (at `538c0f1`, 9 commits) — the parked
  mitigation. Do not delete, rebase or merge it. Item 3 below concerns it,
  and concerns it as a READ.
- **`docs/drafts/row-31-upstream-filing.md`** — a public post. Issue #87101
  is already filed and carries the corrected wording; the draft is now the
  stored copy of a published thing. Do not post, do not edit, and note that
  where the two disagree **the live issue outranks the file**.

`BACKLOG.md` is yours while you hold the copy.

## Required reading before the first change

Mechanically gated: a PreToolUse hook denies your first Write/Edit until you
have Read `docs/dev-loop.md` and `FORK-NOTES.md`.

- `CLAUDE.local.md` — the fork overlay. Upstream's tracked `CLAUDE.md` is a
  foreign team's; its bot identities, label state machine, agent roles and
  npm release rules do NOT bind here. The recorded failure is transcription,
  not obedience.
- `docs/dev-loop.md` — the method, and specifically the closing gate's four
  questions. Question 2's recurring-producer clause is load-bearing for
  item 2 below.
- `BACKLOG.md` — the entries named per item.

## The standing context

Three threat-matrix rows carry open mitigation obligations. Read that
sentence carefully: it is the answer to "have the mitigations shipped", and
the answer is one-and-a-half of three.

- **Row 31** (duplicate sidecar) — MITIGATED and LIVE since 2026-08-14,
  `CACHE_FIX_COALESCE_SIDECAR=1`, confirmed present in the serving unit.
  Covers the single-message case ONLY. Effect measurement still open.
- **Row 24** (same-machine `/resume`) — OPEN, mitigability unassessed. The
  candidate mitigation is built, reviewed, KILLED on ten findings, parked.
- **Row 6** (tool-schema drift) — the existing machinery absorbs what it
  can; the row itself names the next lever as step (b), a session-start
  PRELOAD list for near-certain tools. Not built.

## Item 1 — the content gate (DECIDED, build it)

Booked in `BACKLOG.md` as DECIDED, answer (a): port upstream's
`CACHE_FIX_PREFIXDIFF_CONTENT` gate, default-OFF, and let the deployment opt
in. Code matches upstream exactly; the deployment carries the divergence
with a recorded reason.

**Yours:** the gate in `proxy/extensions/prefix-diff.mjs`, plus
`test/proxy-prefix-diff-security.test.mjs`. That bite currently asserts the
fork's persist-by-default contract, so **it WILL go red the day you port the
gate. Expect the red and update it deliberately** — reflexively greening it
is how a live finding becomes a silenced instrument.

**NOT yours** — residue, and it lands in the dotfiles repo which you do not
own: the `Environment=CACHE_FIX_PREFIXDIFF_CONTENT=1` line on the serving
unit, the manifest gate classification, and the `CACHE_FIX_GATE_ACCEPTANCE`
entry. Do not reach into that repo. Send the desk the fact when your half
lands and the desk routes the rest.

**Ship discipline:** this is a `proxy/**` change, so it owes its own pin
bump and its own restart — do NOT bundle it with anything else, because a
restart carrying two changes cannot attribute its own effect. As of today
the ship lane names BOTH dotfiles pins (`9d35504`); read step 4 before you
ship, not after.

## Item 2 — the row-31 effect measurement (design DECIDED, execute it)

The matrix says "effect measurement pending the next sweeps". Those sweeps
have run. The measurement is now possible, but **not the way the entry
implies**, and this is the desk's decision rather than yours to re-open:

**A naive before/after is CONFOUNDED and must not be reported as the
effect.** The pre-mitigation numbers that exist (75 pairs, 65 streaks, 140
requests, 24 double-billed streaks) were measured over **45 captures**;
today's gate reports over **34 captures / 11,190 MB**. Captures rotate on
their own retention clock, the corpus is live, and the denominators differ.
Any delta between those two figures mixes the mitigation with corpus churn.

**The instrument is an A/B REPLAY over ONE FIXED corpus**, coalescer off vs
on, same captures both arms, one variable. This repo already runs
disabled-vs-enabled arms elsewhere; use that shape.

Today's enabled-arm numbers, for your reference and NOT as an answer:

    pairs 56 · streaks 51 · maxStreak 3 · requests 107
    billedRequests 36 · billedStreaks 26 · doubleBilledStreaks 10
    coalescedRequests 14 · coalescedStreaks 14
    singleMessageCoalesced 14 · multiMessageCoalesced 0
    membersWithoutId 0

**Done-criterion:** the two arms DIFFER on the coalesce and double-billing
counts and AGREE on everything else. Both halves are required — an arm pair
that differs everywhere means the replay changed more than one thing.
`multiMessageCoalesced: 0` is expected in both arms and is not a defect: the
mitigation covers the single-message case by design, and the multi-message
half is unmitigated. Say so in the result rather than letting a zero read as
a failure.

**A CARRIER FINDING you will hit immediately, and it is why no baseline
exists.** `gate-status.json` is overwritten every run, and the fire-ledger
carries `captures`/`ccVersions` but NOT the duplicate block — verified by
reading the last twelve ledger entries. So the daily gate produces these
numbers every morning and retains none of them. That is dev-loop question
2's recurring-producer clause failing on a live mechanism: the producer does
not write out what proves its own findings, so every day's evidence expires
by the next run. Book it, and treat the fix as in scope for this item if it
is small — a per-run append of the duplicate block to the fire-ledger is the
obvious shape, but the design is yours.

## Item 3 — row 24, the parked mitigation (DISCOVERY first, then STOP)

Do NOT start redesigning. The entry is a stored brief and its grade records
decision-completeness as of the day it was written, which was before a
37-commit upstream merge landed on four of the files it touches.

**What is yours:** re-read the parked entry's premises against the CURRENT
world and report what still holds. Specifically — do the ten review findings
still describe the code as it now is; do the two blocking ones survive the
merge; does the branch still rebase cleanly; and is the diagnosis under the
fix still true, which is the half that rots quietly while the fix still
looks plausible.

**Then stop and report.** The redesign itself is judgment the desk holds,
and it needs an operator decision the desk has not put yet. A design round
arriving from you would be answering a question that has not been asked.

## Item 4 — row 6, step (b) (DISCOVERY only)

The row names a session-start PRELOAD list for near-certain tools as the
remaining lever. Before anything is designed, the population must be
measured: **which tools actually get added mid-session, how often, and in
what order** across the corpus. `--census` already classifies tool
additions; the question is whether a small preload set would cover most
real additions, and that is a measurement, not an opinion.

Report the distribution. Do not propose the list — a list proposed from an
unmeasured population is exactly the shape this repo keeps catching.

## Obligations that are not yours to waive

1. **The suite is the gate.** `npm test` run ALONE (it shells out to git; a
   concurrent commit blocks on `index.lock`). Never `--no-verify`.
2. **Never set a repo-local `core.hooksPath`** — it replaces the global
   dispatcher and silently disables the fixture-leak scan.
3. **Nothing goes public without operator GO on exact text.**
4. **Any `proxy/**` change** needs the dotfiles pin bump plus a restart, and
   the restart is priced and timed by the operator — not by you.
5. **Instruments before claims.** A measurement is a claim; an A/B whose
   arms do not differ on the probed quantity has not measured it.

## The return channel — stated because a handoff has none by construction

Send the desk a message when each item closes: what landed, what is still
owed, and who holds it. Expected-return horizon: report on item 1 or item 2,
whichever finishes first, within roughly two hours — silence past that is a
finding, not more waiting. If you hit a fact whose consumer is the desk (a
premise of this directive killed, a residue item that turns out to land
outside your copy), send it WHEN IT LANDS rather than saving it for a
closing report.

**Residue split, per the rule minted today:** anything whose realizing write
lands outside this working copy stays the DESK's — the dotfiles unit line,
the manifest classification, the gate-acceptance entry, and the restart
timing. Naming them here is what keeps them from being silently yours; do
not attempt them, and do not treat them as done because they are written
down.

## Not in scope

Posting anything. Touching dotfiles. The row-24 redesign. Proposing the
row-6 preload list. The `~/.claude/cache-fix-state` cause hunt (booked,
cause unknown, not this round).
