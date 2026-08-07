# Runbook: the operator signals a session is ending

Standing procedure, written for a fresh context. Consumer: the session
being closed — "I'm starting a new session", "we done here?", or a
restart decision at depth. Companion files: `docs/dev-loop.md` (the
three binding rules and the closing gate this sits beside),
`BACKLOG.md` (where everything caught here lands).

**What makes this different from the closing gate in dev-loop.** Those
four questions run per CHANGE and ask whether the WORK is finished.
This runs once per SESSION and asks a different question: is every fact
that currently lives only in context now on disk? A session can close
with every piece of work correctly finished and still lose a decision
nobody wrote down. The job is converting context-resident state into
disk-resident state, and everything not converted is gone — silently,
with no artifact recording that it ever existed.

Why it exists at all: asked "all threads done or booked?" on
2026-08-06, the walk found two that were not, and both were invisible
to every existing check — a bust `bust-triage --list` had surfaced
hours earlier and nobody walked, and two agreed corpus edits living
only in chat. Neither was a tool defect. They are the class that dies
with the context, and session close is the only moment they can be
caught.

## Setup

**Nothing here is answered from memory.** Every item below is a command
whose output is read. That is not ceremony: see step 1.

The trigger is the operator saying the session is ending, or a
continue-or-restart decision at depth. It is not "the work looks done"
— work finishing is what the dev-loop gate covers.

## The line

1. **RUN the mechanism; do not describe it.** Every close-out claim
   about what some machinery will do is checked by executing that
   machinery. The checks are seconds each, and the failure is not
   hypothetical: measured twice within ten minutes on 2026-08-06, both
   times the description was wrong. "The next session picks this up
   automatically" — running `session-scan.py` showed it hands over
   eight READY headers in FILE order with the ranking invisible.
   "Everything is booked" — running the enumeration found two findings
   named in conversation and never written down. This is dev-loop's
   rule about reconstructing behaviour instead of exercising it, aimed
   at machinery WE wrote, which is where it is least suspected because
   we think we know what it does.

2. **Inventory events since the session started, and check each reached
   a disposition.** `node tools/bust-triage.mjs --list` — then for each
   event in the session's window, confirm a terminal state exists in
   the matrix or the backlog. An event that was SURFACED and not walked
   is the exact miss this lane was built on: the tool printed it, the
   session read past it while working the reported one, and the count
   later committed into a ranked artifact was wrong.
   `[GRADUATE -> the computable half of this lane; BACKLOG ready]`

3. **Both repos, not one.** `git status --short` and
   `git log --oneline origin/<branch>..<branch>` in the fork AND in
   dotfiles. Deployment coupling means a session often writes to both,
   and the second is the one that gets forgotten. Unpushed commits are
   already covered by the dotfiles Stop hook — do not re-implement that
   check here, but do read what it says.

4. **Anything still running or armed.** Background agents without a
   booked report (silence is never success — demand it, never book it);
   a `ScheduleWakeup` still scheduled; worktrees carrying dangling
   rebase state (`.git/rebase-merge`, `.git/rebase-apply`); a
   backgrounded check nobody awaited.
   `[GRADUATE -> the computable half of this lane; BACKLOG ready]`

5. **Sweep your OWN output for named-and-unbooked.** Not "did I miss
   anything" — that is unanswerable by feel. The failure mode is
   NAMED-and-unbooked: on 2026-08-06 four findings were spotted,
   correctly described in prose, and stalled there until the operator
   converted them, because naming a gap feels like delivering it. Reread
   the session's own replies for gap-language — "we should", "worth
   booking", "the gap is", "I'd carry forward", "worth watching" — and
   require each to resolve to a commit, a backlog entry, or a file
   change made in this session.
   `[GRADUATE -> the named-and-unbooked check; BACKLOG ready]`

6. **Re-read numbers this session committed into durable artifacts.**
   Later evidence revises earlier claims, and the artifact does not
   update itself. Measured 2026-08-06: a build-order block was committed
   saying "four busts, 1,124,000 tokens" when the tool's own output had
   listed five — the count came from what was attended to rather than
   from what was printed. A number in a ranked artifact is load-bearing
   for whoever reads it next.

7. **Decisions taken in conversation with no carrier.** The tell is a
   sentence like "we agreed X", "I'll carry that forward", or "that's
   for the other session" with no commit, entry, or file behind it. Two
   of 2026-08-06's losses were exactly this shape. Deciding NOT to do
   something is a legitimate call; not booking it never is — and for
   anything small, booking costs about what doing it costs, so the
   postponement refutes itself (dev-loop, rule three).

8. **The backlog closes DISPATCHABLE — every open entry executable by
   someone who is not you, in the repo where the work happens, without
   asking anyone a question.** Steps 5 to 7 catch findings that were
   never booked. This catches the opposite and less visible failure: an
   entry that IS booked, reads complete, carries its grade and its
   verifier — and cannot be executed. Two shapes, both measured
   2026-08-06, both by the session that wrote the entries:

   - **A question parked in a work queue.** An entry whose body says
     "this is an operator decision, stated rather than taken". That is
     correct authorship — a decision only the operator can settle must
     not be taken silently — and it is incomplete as a QUEUE ITEM,
     because a dispatch that reaches it stops, and the operator learns
     of the question whenever some future session happens to surface
     it. **The decision costs one question and the operator is
     present at session close.** Not asking converts a one-question
     cost into open-ended latency, and it is invisible precisely
     because the entry looks finished.
   - **The wrong carrier.** An entry whose fix lives in ANOTHER repo,
     booked here. A fresh session in that repo loads ITS backlog, not
     this one, so the entry has no reader. Measured: two
     claude-worktime items sat in this file while
     `~/dev/Gunther-Schulz/claude-worktime/BACKLOG.md` read "Ready:
     (empty), Parked: (empty)". The corpus rule is that everything
     persisted names its consumer and sits on that consumer's read
     path; a backlog is the one artifact where violating it is
     invisible, because the entry is perfectly well written.

   **The line that keeps this from swallowing PARKED: park on missing
   EVIDENCE, never on a missing DECISION.** Evidence may genuinely not
   be obtainable today, and naming it is what makes a park a spec. A
   decision is always obtainable at close, because the person who makes
   it is in the conversation. So "parked pending measurement X" is
   healthy; "ready, but the operator must first decide Y" is a
   question wearing a work item's clothes — the costume shape the
   grounding corpus names, applied to the backlog.

   Ask it as a round, not one at a time: every decision whose
   prerequisites are settled, numbered, each with a recommendation and
   the facts already gathered. Facts are gathered, never asked.
   `[GRADUATE -> a backlog-lint lane over READY bodies: decision-language
   ("operator decision", "stated rather than taken", "bring to the
   operator", "decide whether") and cross-repo path tells. The language
   half is computable; whether a given entry is genuinely blocked is
   not, so the lint flags and the operator backstops. BACKLOG ready]`

9. **Answer the three closing questions** from the operator corpus, each
   against its evidence rather than from feel: anything missing (against
   the enumeration above), anything learned (against the session's
   incident and correction list), how was it routed (against the turn
   record — dispatches made, inline stretches held, each with its named
   basis).

## Terminal state

One, and there is no second: **CLOSED — every context-resident fact is
on disk, in the carrier its consumer reads, and every open backlog
entry is executable without asking anyone a question; or the exception
is explicitly named as deliberately dropped.** "I think that's
everything" is not it, and neither is a clean `git status`: the losses
this lane exists for are invisible to git by construction. A backlog
full of well-written entries that a dispatch cannot execute is the
same failure one level up — the queue looks full and is not moving.

## Limits (the box)

- **Do not defer a small fix to the next session because this one is
  deep.** Depth argues for restarting, never for carrying a finding out
  of the session — the finding leaves with the context. The now-or-book
  call is made on the FIX's size, never the session's state (dev-loop,
  rule three), and this lane is where that rule is most often broken,
  because closing feels like a reason to stop making changes.
- **Do not classify an undispositioned finding just to close.** A guess
  at a terminal state is worse than an explicit "surfaced, not walked,
  here is what is measured" — the guess reads as settled to the next
  reader and stops the walk.
- **Do not book what you could do.** See the first limit; the two
  failures are opposite and equally common at this moment.
- **Do not treat a clean checker as a clean session.** Every mechanical
  check can pass while a decision made an hour ago exists nowhere. That
  gap is the whole reason for steps 5 to 7.
- **Do not take an operator decision yourself in order to satisfy step
  8.** The repair for a question parked in the queue is to ASK it, not
  to answer it — silently picking is the failure the entry's author
  correctly avoided, and re-introducing it at close is worse, because
  by then it is buried in a close-out rather than stated in a reply. If
  the operator is genuinely unreachable, the entry stays as it is and
  the close-out names it: still a question, still unasked, here is the
  recommendation.

## Report

Close with: the terminal state; what the enumeration examined (events,
repos, agents, wakeups) with counts, since a close-out reporting
"nothing outstanding" over an empty enumeration is this repo's
most-repeated failure; anything found and where it landed; and the three
closing questions with their bases. If a finding was surfaced but not
walked, say so plainly and name what is measured about it — that is a
complete answer, and pretending otherwise is what this lane prevents.
