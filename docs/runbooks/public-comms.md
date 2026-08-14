# Runbook: posting publicly — issues, PRs, comments (any venue)

Standing procedure, written for a fresh context. Trigger: a public post —
an issue comment, a new issue, a PR body, a PR comment — is about to be
written under the operator's account, in this repo, upstream, or a
third-party tracker. Consumer: any session about to post; pointed from
`docs/dev-loop.md`'s "Which line are you on". Terminal state: posted with
operator GO, or the draft handed to the operator with its verification
stated.

Minted 2026-08-14 (operator ask, mid-review of that day's five posts and
the #78420 correction round); every rule below carries the incident that
produced it. The distillation corpus: anthropics/claude-code#82642
comment, cnighswonger PRs #306/#276/#336/#337, and the #78420 correction.

## The gates, in order

1. **GO.** Nothing goes public without the operator's explicit GO on the
   specific text (publication bar, `CLAUDE.local.md`; upstream CLAUDE.md's
   "Public Communication" says the same). Draft first. The GO covers the
   draft it was given: a materially edited draft goes back for a new GO.
2. **Hygiene.** The publication bar and the Public-Repo Information
   Hygiene rules apply to post bodies exactly as to tracked files: no
   other-session content, no origin identifiers, no canonical UUIDs or
   capture ids. Where a finding concerns identifier-shaped values in
   someone else's repo, report POSITIONS, never values (the #306 UUID
   listing is the model).
3. **Numbers.** Every number ships with its instrument named — tool plus
   commit, or state file plus timestamp — and is re-run or re-read against
   that instrument at compose time, stated so a reader can re-run rather
   than trust. A number recalled from our own notes, backlog, or memory is
   unverified: of five posts on 2026-08-14, the one sentence that shipped
   wrong ("third platform") was the one restated from a backlog header.
   Snapshot counts carry their date and a drift note.
   The compose-time re-check is hand-run today
   [GRADUATE -> a pre-post checklist tool].
4. **Third-party claims.** Restate someone else's figures or findings
   only after reading their live post in the same sitting. Our paraphrase
   of their work is not a source, however carefully it was written down.
5. **State what was not checked.** A claim not exercised ships labeled
   ("we did not check…", "not re-measured either way"). The strongest
   sections of the 2026-08-14 set are its "What we did not check"
   paragraphs — they are what make the verified parts believable.

## Form

- **Answer first.** On someone else's thread, answer the thread's actual
  ask before adding our findings (#306's answer-the-three-calls opener is
  the model).
- **Attribution.** Everything authored under the operator's account ends
  with the 🤖 footer plus the authoring session link. Upstream's
  agent-name sign-off convention binds their team, not this fork
  (`CLAUDE.local.md`).
- **Tone.** Measured, mechanism-first, no speculation presented as
  finding; different-shape results are stated as different shapes, not
  spun toward the thread's hypothesis (#78420 correction, "does not
  confirm the shape in this issue").

## Correcting our own public claims

- A correction is owed as soon as a published claim fails re-measurement,
  whether or not we ever post in that venue again — a negative data point
  on a scoping question is weighed by maintainers, so it must be
  un-weighed explicitly.
- **Form (decided 2026-08-14, #78420):** a NEW comment carrying the full
  correction — the only form subscribers and past readers are notified
  of — plus a minimal pointer-edit prepended to the original
  ("**Correction (date):** … see <link>"), the only form future scanners
  of the thread meet first. Never a silent in-place rewrite of a claim
  someone may have acted on.
- **Same-day exception:** a post found defective while still same-day and
  unanswered may be fixed by in-place edit (#82642's opener, 2026-08-14).
  Once a post has been read, answered, or acted on, corrections take the
  new-comment-plus-pointer form.

## New issue vs comment

New issue: a distinct mechanism with its own repro, not yet reported —
and the issue body carries the repro, not a pointer to one. Comment:
corroborating, scoping, or correcting on an existing thread. Cross-link
either way. Upstream-PR review-round mechanics (worktrees, the box,
comment cadence) are `upstream-pr-round.md`'s, not duplicated here.
