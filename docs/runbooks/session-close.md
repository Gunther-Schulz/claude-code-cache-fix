# Runbook: the operator signals a session is ending

Standing procedure, written for a fresh context. Consumer: the session
being closed — "I'm starting a new session", "we done here?", or a
restart decision at depth. Companion files: `docs/dev-loop.md` (the
three binding rules and the closing gate this sits beside),
`BACKLOG.md` (where everything caught here lands).

Close-scan: node tools/named-unbooked-scan.mjs --transcript "$T" --until HEAD

The line above is the machine-readable contract, opt-in by its presence: the
dotfiles close-signal Stop-hook greps for `^Close-scan:` and demands this
repo's scan rather than trusting a closing report's "all booked" — which was
wrong on 2 of 4 the day that hook was booked, caught by operator challenge
instead of by step 6 below. `$T` is the session transcript; step 6 carries the
assignment that resolves it, and this line is that step's command verbatim, not
a second copy to keep in sync.

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

3. **Re-run the SessionStart scan and resolve every non-silent part of the
   attention line.** The line is silent when clean by construction — a no-op
   on a healthy session — and costs one command otherwise. For each
   non-silent part (`N behind upstream`, `N READY, oldest Nd`, a gate-red
   once it ships), require it to resolve to (a) an action taken this
   session, (b) a booked entry, or (c) an explicit "not this session,
   because —". A signal that has been on since session start with no
   disposition step is wallpaper, not evidence of nothing — a doorbell that
   fires correctly and is never answered trains the reader to stop hearing
   it. Measured 2026-08-06: `attention: 25 behind upstream (as of last
   fetch) | 33 READY, oldest 1d` rendered unresolved for ~8 hours, because
   the event-inventory step above and the git-state step below both walk
   past it — neither asks what the standing signals were saying, so the one
   signal that was on the whole time was the one thing not walked.
   `[GRADUATE -> a parse plus a set difference against the session's own
   commits; no judgment beyond option (c)'s reason. BACKLOG ready]`

4. **Both repos, not one.** `git status --short` and
   `git log --oneline origin/<branch>..<branch>` in the fork AND in
   dotfiles. Deployment coupling means a session often writes to both,
   and the second is the one that gets forgotten. Unpushed commits are
   already covered by the dotfiles Stop hook — do not re-implement that
   check here, but do read what it says.

5. **Anything still running or armed.** Background agents without a
   booked report (silence is never success — demand it, never book it);
   a `ScheduleWakeup` still scheduled; worktrees carrying dangling
   rebase state (`.git/rebase-merge`, `.git/rebase-apply`); a
   backgrounded check nobody awaited.
   `[GRADUATE -> the computable half of this lane; BACKLOG ready]`

6. **Sweep your OWN output for named-and-unbooked — by RUNNING the
   check, not by rereading.** Not "did I miss anything", which is
   unanswerable by feel. The failure mode is NAMED-and-unbooked: on
   2026-08-06 four findings were spotted, correctly described in prose,
   and stalled there until the operator converted them, because naming a
   gap feels like delivering it.

   ```sh
   T=$(ls -t ~/.claude/projects/-home-g-dev-vendor-claude-code-cache-fix/*.jsonl | head -1)
   node tools/named-unbooked-scan.mjs --transcript "$T" --until HEAD
   ```

   It scans this session's own assistant output for gap-language and for
   messages enumerating two or more of the session's OWN errors, then
   requires each hit to resolve to a commit, a BACKLOG entry, or a file
   change in the same session. Unresolved hits are the list to walk. It
   REPORTS and never blocks — the phrasing is common in ordinary
   explanation, so expect false fires and read the output as a list, not
   a verdict. Its examined-count line is part of the answer: a run
   reporting nothing over zero messages is the failure this repo hits
   most often.
   **Two known holes in this step, both measured 2026-08-07 and both now
   covered elsewhere — read them as limits on what step 6 proves, not as
   work to redo here.** It scans REPLIES only, so a gap named inside a
   backlog entry's own prose is invisible to it by construction (observed:
   an entry ending "that is a separate item, not this one", which booked
   nothing and surfaced only when the operator asked). And it runs at
   CLOSE, so a gap named hours earlier stays unbooked until then and is
   lost outright if the session dies first. The reply half is booked as a
   Stop hook in the dotfiles backlog; the file-prose half belongs to the
   `backlog-lint` lane in this repo's own backlog.
   `[GRADUATE -> a Stop hook runs this without anyone reading the runbook]`
   — the close-scoped half is now mechanized, and the residual is the
   trigger: a step in a runbook still depends on someone opening the
   runbook, which is the same dependency that produced the defect. The
   scan's own first finding was itself: built 2026-08-10 and referenced
   by nothing but its own source until a grep was run for it.

7. **Re-read numbers this session committed into durable artifacts.**
   Later evidence revises earlier claims, and the artifact does not
   update itself. Measured 2026-08-06: a build-order block was committed
   saying "four busts, 1,124,000 tokens" when the tool's own output had
   listed five — the count came from what was attended to rather than
   from what was printed. A number in a ranked artifact is load-bearing
   for whoever reads it next.

8. **Decisions taken in conversation with no carrier.** The tell is a
   sentence like "we agreed X", "I'll carry that forward", or "that's
   for the other session" with no commit, entry, or file behind it. Two
   of 2026-08-06's losses were exactly this shape. Deciding NOT to do
   something is a legitimate call; not booking it never is — and for
   anything small, booking costs about what doing it costs, so the
   postponement refutes itself (dev-loop, rule three).

9. **The backlog closes DISPATCHABLE — every open entry executable by
   someone who is not you, in the repo where the work happens, without
   asking anyone a question.** Steps 6 to 8 catch findings that were
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

   **And the same property at the SET grain, which is the acceptance
   test for this whole step: `continue from backlog` must suffice as
   the next session's entire instruction.** Per-entry executability is
   not enough on its own — the set needs an entry point that is present
   and CURRENT, and nothing load-bearing may live only in a chat
   message. Session end is the DEADLINE for this, not the moment to
   start: the property is maintained as work lands, and the close only
   verifies it.

   **The pasted brief is the tell, and it is a reliable one.** If
   closing means writing a long handover into chat, everything in that
   brief which is not derivable from the file is precisely the material
   that has no carrier — and chat is the one carrier the next session
   cannot load. So the brief is DERIVED from the backlog, never a
   supplement to it. Measured 2026-08-06/07: three briefs were written
   across one session; the third was diffed against the entries on the
   operator's question rather than trusted, and the diff found a real
   defect — an ordering constraint that existed only in the brief,
   whose absence would have had the next session write a test pinning a
   workaround (it asserted a verdict value that changes when the
   sibling entry lands). Two briefs had already shipped without it.

   The mechanical form: before closing, ask what you would put in a
   brief, then put each item in the FILE instead — an entry if it is
   about one item, the handoff section if it is about the set. Then the
   brief is one line. What genuinely belongs at set level is small and
   knowable: the current state, the disjoint write-sets (a fact about
   the files, not a judgement), pointers to cross-entry orderings that
   are stated in their own entries, what is actually BROKEN rather than
   merely unbuilt, and work booked in other repos. Build ORDER is not
   on that list — this repo derives it at build time and storing it
   re-creates the stale-priority defect the rubric exists to prevent.

   **A stale handoff is worse than no handoff**, because it reads as
   authoritative: the one replaced on 2026-08-07 was twelve hours old
   and still warned against pushing a sibling repo whose commits had
   long since been claimed. Rewrite it, never append to it.
   `[GRADUATE -> a backlog-lint lane over READY bodies: decision-language
   ("operator decision", "stated rather than taken", "bring to the
   operator", "decide whether") and cross-repo path tells. The language
   half is computable; whether a given entry is genuinely blocked is
   not, so the lint flags and the operator backstops. BACKLOG ready]`

10. **Answer the three closing questions** from the operator corpus, each
   against its evidence rather than from feel: anything missing (against
   the enumeration above), anything learned (against the session's
   incident and correction list), how was it routed (against the turn
   record — dispatches made, inline stretches held, each with its named
   basis).

## Terminal state

One, and there is no second: **CLOSED — every context-resident fact is
on disk, in the carrier its consumer reads; every open backlog entry is
executable without asking anyone a question; and `continue from
backlog` would suffice as the next session's entire instruction; or
each exception is explicitly named as deliberately dropped.** "I think that's
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
  gap is the whole reason for steps 6 to 8.
- **Do not take an operator decision yourself in order to satisfy step
  9.** The repair for a question parked in the queue is to ASK it, not
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

**The close-out is a REPORT, not a handover.** Its reader is the
operator, who was present; the next session's reader is the file. So it
never carries an instruction the backlog lacks — if something needs
saying to the successor, it goes in the file and the close-out says
where. The handover itself is one line: `continue from backlog`. A
close-out that grows a "here is what to do next" section has found a
gap in the backlog and is papering over it in the one place the
successor cannot read.
