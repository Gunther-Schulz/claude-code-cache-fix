# Runbook: an open upstream PR of ours has gone stale

Trigger: event | operator,scheduled | an open upstream-facing PR of ours has gone red, conflicting, or quiet — or nobody has read the whole open set in a week

Standing procedure, written for a fresh context. This lane is about the
SET, not about one review round: answering a round is
`upstream-pr-round.md`, and this lane routes into it. Companion facts:
`CLAUDE.local.md` (identity, and what upstream's tracked CLAUDE.md does
and does not bind here), upstream issue #284 (upstream's own landing
order), `BACKLOG.md`'s `## Upstream PR round` section (per-PR history).

Why the lane exists, from the occurrence that minted it. On 2026-08-22 a
sweep found two of five open PRs red — #352 since 08-20, #276 since
08-06 with its head unmoved for sixteen days — and neither redness had
reached anybody. The cause was structural, not anyone's lapse: the
session that pushed #352 could not run the suite (running it is what
takes the desktop down), so it shipped a red it had no way to observe,
and after that nothing ever looked again. `upstream-pr-round.md` is an
INTENT workflow — a procedure a session sets out to run for a round.
Rot is not an intent, it is elapsed time, so nothing fired.

## The sweep

Do this for EVERY open PR of ours before acting on any of them. The
whole point is the set: acting on the one that came to mind is how the
other four keep rotting.

1. **Read the state from the API. Never from memory, never from the
   backlog's table.** That table is a snapshot with a date on it and it
   was seven days stale when this lane was written — it still listed a
   PR that had since closed and knew nothing of two that had opened.

   ```sh
   gh pr list --repo cnighswonger/claude-code-cache-fix \
     --author Gunther-Schulz --state open \
     --json number,title,headRefName,headRefOid,mergeable,updatedAt,labels
   ```

2. **For each PR, get the CI conclusion AND the head it ran against.**
   This is the step with a trap in it, and the trap is silent:

   ```sh
   gh pr checks <n> --repo cnighswonger/claude-code-cache-fix
   gh api repos/cnighswonger/claude-code-cache-fix/actions/runs/<run-id> \
     --jq '.head_sha, .conclusion, .created_at'
   ```

   **A pass whose `head_sha` is not the PR's current head is not a
   pass.** It is a green about code nobody is proposing any more, and it
   reads exactly like a real one. Compare the two shas explicitly and
   report `unverified` when they differ — never `green`.

3. **Read the thread before deciding anything.** `gh pr view <n>
   --comments`. A PR can be green and mergeable and still be waiting on
   a maintainer's sequencing answer, in which case rebasing it is work
   done twice. #276 sat in exactly that state.

4. **Classify each PR into ONE disposition** from the closed set below,
   and write the set down before acting. A disposition is a decision
   about the next act, not a description of the state.

## Terminal dispositions

Every PR ends the sweep in exactly one of these. The lane is discharged
when every open PR carries one.

- **GREEN, WAITING** — mergeable, CI green on the current head, thread
  answered. The act is a comment if the last word was ours more than a
  week ago, and nothing otherwise. Waiting is a legitimate end state;
  a nudge on a PR whose ball is upstream's is noise.
- **RED** — CI failing on the current head. Route to
  `upstream-pr-round.md` and fix on the branch. Read the failing job's
  log before touching anything: today's five failures had one cause and
  the log named it exactly.
- **CONFLICTING** — rebase per the round runbook's rebase policy, UNLESS
  the thread shows the branch is waiting on a maintainer decision about
  how it lands. Then it is BLOCKED, not conflicting-to-fix.
- **BLOCKED ON UPSTREAM** — a question is outstanding with them. Record
  what was asked and when. Do not re-ask inside a week.
- **BLOCKED ON US** — a design decision this session cannot make. It
  goes to the operator as one numbered question with a recommendation,
  never decided at execution time.
- **STALE APPROVAL** — a label or approval that predates the current
  head. Ours to point out in a comment; never ours to change. Upstream's
  label state machine is theirs alone.
- **DROP** — the change has been overtaken. A recorded drop is a real
  exit, not a failure. Say so in a comment and close it.

## The verification constraint — read this before promising a test run

While the session-kill fix (#352) is unmerged, **a tree cut from
upstream `main` cannot have its suite run on this host at all.** The
machine-wide gate denies it, correctly: those trees carry
`test/proxy-held-port.test.mjs` without the `killOurs()` choke point,
and running them signals `systemd --user` — SIGTERM to it is a logout,
SIGKILL makes pid 1 tear down the session cgroup. Five desktops, 08-20
and 08-22.

Two consequences, both load-bearing for this lane:

- **CI is the verifier for every upstream-facing branch**, and a comment
  must say so plainly rather than implying a local green that was never
  earned.
- **#352 is the sequencing head of the whole board.** Until it lands,
  every other upstream PR is verifiable only in CI. Prefer it over
  anything else that is merely older.

## The slice trap — opening a NEW upstream PR from fork work

A fork commit does not cherry-pick onto `upstream/main` merely because
its files exist there. Measured 2026-08-22 on the XDG relocation
(`f333124`): of 66 files, 47 existed upstream and the slice still landed
9 files in conflict — because the change sits on OTHER unmerged fork
changes in the same files, not because of anything about the change
itself. Check for that before promising a PR:

```sh
git worktree add -b pr/<slug> /tmp/wt-<slug> upstream/main
git diff <commit>^ <commit> -- <slice paths> | git apply --3way -
git diff --name-only --diff-filter=U     # conflicts = the slice is not free-standing
```

A conflicting slice means the change must be re-authored against
upstream, which is a build and not a cherry-pick. Say that to the
operator before starting it; do not grind through the conflicts as if
they were mechanical.

Fork-only paths NEVER enter a slice, whether or not upstream happens to
carry a copy: `CLAUDE.local.md`, `FORK-NOTES.md`, `BACKLOG.md`,
`BACKLOG-DONE.md`, `docs/directives/`, `docs/audits/`,
`docs/code-reviews/`, `docs/release-tests/`, `docs/runbooks/`,
`test/fixtures/harvested/LEDGER-*.json`.

## Limits (the box)

- Plain `gh` under the operator's own identity. The bot-token machinery
  in upstream's tracked CLAUDE.md does not exist on this machine; any
  instruction to run `generate-token.sh` is a transcription bug — stop
  and surface it.
- No pushes to any `main`. Fork-main is production, upstream-main is not
  ours. PR branches only.
- No label changes, ever — including removing a stale one. Point at it
  in a comment instead.
- No new issues, discussions, or posts beyond the push-announcement
  comment pattern without an operator GO. Opening a NEW PR is such an
  act: recommend it, do not open it unasked.
- No `--force-with-lease` except as the rebase policy's own last step.
- A finding needing a design decision returns as a question. It is not
  decided at execution time.

## Report

Close with the dispatch-discipline §2 report form — items completed with
evidence, checks run with real output, gaps, deviations, files and
commits, and what was NOT verified. The sweep's own output is a table:
one row per open PR, its disposition, and the act taken or the reason
none was. A sweep that reports only the PRs it touched has not
discharged this lane — the ones it left alone are the finding it exists
to produce.
