# Brief: git worktree LIFECYCLE — nobody removes them, and the cleanup that does is unsafe

**Status:** design brief, written 2026-08-08 for a FRESH session. Not
decision-complete: the strategy is the deliverable, and two of the design
questions are genuinely open. Read the whole thing before proposing a fix —
the second incident is the one that constrains the solution.

**Where the body of the fix belongs:** the `dispatch-guards` plugin repo
(`dev-notes/dispatch-OBSERVATIONS.md` + its BACKLOG, and its `worktree` SKILL,
which is the single source for portable worktree mechanics). A machine-local
check may also belong in the dotfiles doctor. This file is the BRIEF, not the
fix; it lives here because that is where the incident happened.

---

## The two halves, and why neither alone is the problem

### Half 1 — worktrees ACCUMULATE, because removal is prose

`docs/dev-loop.md` and the dispatch skill's worktree recipe BOTH say the
dispatcher removes the worktree after integration. On 2026-08-08 this repo had
**16 extra registered worktrees**, accumulated over roughly a week by several
different sessions, every one of which had committed its work and left:

    /home/g/dev/vendor/cache-fix-pr1 … cache-fix-pr12   (12, upstream PR slices)
    /home/g/dev/vendor/cache-fix-absence-scan
    /home/g/dev/vendor/cache-fix-fixture
    /home/g/dev/vendor/cache-fix-xdg
    /tmp/claude-1000/…/0600c21f-…/scratchpad/wt-g2       (another session's)

Plus two harness-cut agent worktrees under `.claude/worktrees/agent-*`. The
harness auto-cleans those only when UNCHANGED; both carried commits, so both
stayed. That is the mechanism for the harness-cut ones and it is working as
documented — the ones that matter are the 15 hand-cut ones with no owner.

**The measured fact is the fire rate: a rule stated in two places, followed by
nobody, for a week.** That is the shape the corpus already names — a
judgment-shaped obligation with no mechanism decays to zero compliance, and
nothing surfaces it because a stale worktree is silent. It costs disk, it makes
`git worktree list` unreadable, it leaves branches pinned so they cannot be
pruned, and — the one that bit here — it presents a large, tempting,
undifferentiated cleanup target.

### Half 2 — the cleanup that DOES happen is unsafe, and this is the constraint

The same day, a dispatcher session (me) intending to remove its own four lanes'
worktrees ran a loop over `git worktree list` and force-removed **every**
registered worktree in the repo — all 16, including 15 that were not its own
and one belonging to a different session's scratchpad.

    for w in $(git worktree list --porcelain | awk '/^worktree/{print $2}' \
              | grep -v "^$(pwd)$"); do git worktree remove --force "$w"; done

What that cost, established rather than assumed:

- **All committed work survived.** Worktree removal does not touch branches;
  all 28 branches remain (`pr/absence-scan` `fb9763b`, `wt/xdg-migration`
  `aca9e1e`, `pr/insertion-normalization` `60a9e3c`, …).
- **Any UNCOMMITTED work in those 16 directories is unrecoverable.** No stash,
  no reflog for working-tree files.
- **The path→branch mapping is gone**, because `git worktree prune` cleared
  `.git/worktrees/` and nothing else in `.git` retains it. Recreation is
  possible per path but requires someone to say which branch each carried.

The failure shape is the corpus's own: *before deleting, look at the target*,
and an undo sized to "the thing I just made" reaching real work instead. The
loop had no OWNERSHIP predicate — it could not distinguish this session's lanes
from a week of other people's.

**The two halves are one system.** Accumulation creates the mess; the mess
invites a blunt sweep; the blunt sweep is destructive because nothing marks
ownership. A fix for either half alone leaves the other running.

---

## What the fix must satisfy (constraints, not design)

1. **Ownership must be MARKED, not inferred.** Any removal predicate that keys
   on a naming convention will misfire the moment someone names a worktree
   differently — the pattern-scope blind spot `docs/dev-loop.md` records at
   length. Whatever marks ownership must be written at CREATE time by the
   creator, and must survive the creating session's death.
2. **Nothing may force-remove a worktree with uncommitted changes without an
   explicit, per-worktree decision.** `--force` is the whole difference between
   this incident and a no-op: `git worktree remove` WITHOUT `--force` already
   refuses a dirty worktree. That refusal is a feature and the incident is
   partly "someone passed --force to a loop".
3. **A sweep reports before it acts.** Dry-run by default; the acting form
   names each target and why it qualifies.
4. **It must reach worktrees whose creating session is DEAD.** That is the
   whole population — a session that is alive usually cleans up. So "ask the
   owner" is not a mechanism.
5. **It must not depend on the harness.** Harness-cut worktrees are only a
   fraction; the majority here were hand-cut by `git worktree add`.

## The open design questions — these are the deliverable

- **What marks ownership durably?** Candidates, none obviously right: a marker
  file inside the worktree naming session + purpose + creation time; a
  `git config` key in the worktree's own config; a branch-name convention plus
  a registry file outside the repo. Weigh against constraint 1 — a convention
  is a pattern, and patterns have blind spots.
- **What is the retirement TRIGGER?** Age alone is wrong (a long-lived PR
  worktree is legitimate). "Branch merged into main" is stronger but the `pr/*`
  branches here are deliberately unmerged upstream slices. "No commits in N
  days AND clean AND branch has no unmerged work" is a candidate; it needs a
  measured false-fire rate before it removes anything.
- **Who runs it, and when?** A doctor verdict that REPORTS (three answers:
  clean / stale-worktrees-found / could-not-verify) is the cheap, safe start
  and probably the right first ship. An automatic remover is the tempting
  version and is the one that just went wrong.
- **Should the dispatch skill's recipe change?** Today it says "remove after
  integration" in prose. Consider whether the dispatcher's integration step can
  carry it mechanically, and whether a lane's closing report should be required
  to state its worktree path so the dispatcher has the target in hand.

## Evidence limits — read this before quoting any number

**The population that would have measured how general this is was destroyed by
the incident itself.** A scan across every repo under `~/dev` immediately
afterwards returned **zero** extra worktrees anywhere — which proves nothing,
because the only known population had just been deleted. Whether other repos
accumulate the same way is UNMEASURED and must be established prospectively,
not inferred from that zero. Treat "16 in one repo over a week" as the single
datapoint it is.

Second limit: nobody knows whether any of the 16 held uncommitted work, and
nobody can now find out. Do not write "no work was lost" anywhere — the honest
statement is "all committed work survived; uncommitted work, if any, is
unrecoverable and its existence is unknown".

## What NOT to do

- Do not write a cleanup that force-removes on a pattern. That is this
  incident with a different regex.
- Do not "fix" it by telling sessions to remember — that is the rule that
  already exists in two files and produced 16 strays.
- Do not delete branches as part of any worktree cleanup. Branches are the
  reason the committed work survived; they are a separate lifecycle with its
  own retirement question.
- Do not point a destructive repro at a repo that matters — build a throwaway
  clone, per `docs/dev-loop.md`.

## Verifier for whatever ships

Red-first, in a throwaway clone: create three worktrees — one clean and owned,
one clean and foreign, one DIRTY — and require the mechanism to (a) name all
three in its report, (b) act on only the owned clean one, (c) refuse the dirty
one loudly even if it is owned, and (d) leave the foreign one untouched with a
stated reason. Arm (c) is the one this incident would have failed.
