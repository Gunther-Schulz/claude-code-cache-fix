# Runbook: slicing an upstream-facing PR out of `main`

Trigger: intent | a session sets out to produce one reviewable upstream PR from this fork's `main`, without leaking fork-only content into it

Standing procedure, written for a fresh context. This is the lane FORK-NOTES'
"Upstream-PR plan (when ready)" sketch (cut `feat/<topic>` from main, per-topic
slices, attach forensics) was a placeholder for — it consolidates the sketch,
`tools/slice-preflight.mjs`, the fork-only-files list, and the publication bar
into one ordered sequence. Companion facts: BACKLOG.md's "an upstream-PR-slice
runbook" entry (this file's own realizing write-boundary), `CLAUDE.local.md`
("Where things live" -> "Fork-only files", and the publication bar above it),
`docs/runbooks/upstream-pr-round.md` (the lane this one hands off to once the
PR exists).

The stakes are public git history: a fork-only file or a capture identifier
that reaches `upstream/main`'s pull-request refs is there forever — the
remediation precedent (this repo's tracked `CLAUDE.md`) is destroying and
recreating a host, and `CLAUDE.local.md` records a real prior leak through an
earlier scrubber into a public PR. Every gate below runs BEFORE the push that
would make its finding permanent, never after.

## Setup (once, per slice)

Reuse `docs/runbooks/upstream-pr-round.md`'s "Setup (once per branch)" recipe
verbatim — the worktree creation, the `node_modules` symlink, and the "never
in the main working tree" rule are stated there once and are not restated
here; a second copy would drift the moment one of them changes. Before step 1:

```sh
git fetch upstream && git fetch origin
```

so `upstream/main` is current — every scoping decision below is measured
against it, not against a stale local copy.

## The slice

1. **Topic and branch.** Pick the topic from the slice plan (FORK-NOTES' own
   candidate list: prefix-diff enhancements; the 2026-07-27 prevention stack —
   ladder, insertion-normalization, header-propagation fix, the last one
   likely first since it is the smallest and fixes a plain bug) or from a
   BACKLOG entry that names itself upstream-facing. Create the branch on top
   of `upstream/main` (never `main` directly — this fork's `main` carries
   years of fork-only history that `upstream/main` never had, and starting
   there is what step 2 exists to catch if it happens anyway) and port onto it
   only the commits that implement the chosen topic — cherry-pick where the
   history is already clean, a hand-assembled patch where it is not. Which
   commits belong to a topic is a judgment call this runbook does not automate
   ; a topic whose commits cannot be cleanly separated from unrelated work is
   a reason to return to the slice plan, not to force a slice.

2. **Fork-only exclusion sweep.** The list of what must never reach an
   upstream slice is DATA, not something this file copies: it lives in
   `CLAUDE.local.md`, under "Where things live" -> "Fork-only files", and the
   command below reads it from there at run time so the two cannot drift
   apart silently.

   ```sh
   BASE=$(git merge-base upstream/main <branch>)
   PATTERNS=$(awk '/\*\*Fork-only files\*\*/{f=1} f{print; if (/\.$/) exit}' CLAUDE.local.md \
     | grep -oE '`[^`]+`' | tr -d '`' | sed 's/\./\\./g; s/\*/.*/g')
   HITS=$(git diff --name-only "$BASE" <branch> | grep -Ef <(printf '%s\n' "$PATTERNS") || true)
   ```

   **Refusal condition:** a non-empty `$HITS` REFUSES the slice — print it
   (the filenames, never their content) and stop. It means the port in step 1
   pulled in more than the topic (a cherry-pick or squash that swept up a
   fork-only path) or the topic's own work touched one by mistake; go back to
   step 1, never edit the diff in place and re-run only the sweep. An empty
   `$HITS` is the pass condition — proceed to step 3.

   Verified live (2026-08-10, throwaway clone, deleted after): a slice
   carrying a one-line touch to `BACKLOG.md` was REFUSED, naming
   `BACKLOG.md`; the identical command against a slice touching only
   `README.md` reported clean. Both arms exercised — a refusal alone would
   not show the check can ever pass a real slice.

   [GRADUATE -> a dedicated `tools/slice-exclusion-scan.mjs`, parameterized
   on `<base>..<branch>`, replacing this hand-run awk/grep pipeline: not yet booked in BACKLOG.md.
   trigger: this lane's second real execution (twice is a shape, per this
   file's own minting rule), or the first execution where the hand pipeline
   mis-reads CLAUDE.local.md's bullet, whichever comes first.]

3. **`slice-preflight` over every mapped test file.** "Mapped" means every
   test file the topic's own commits touch or add:

   ```sh
   git diff --name-only "$BASE" <branch> -- 'test/**/*.test.mjs'
   ```

   Feed that list to the real tool, real invocation form:

   ```sh
   node tools/slice-preflight.mjs <slice-worktree-root> <mapped-test-file>...
   ```

   Exit 0 -> proceed to step 4. Exit 1 -> named findings (a static import or a
   module-scope read that resolves outside the slice) — either the missing
   file belongs in this slice too, or the test does not belong in this topic;
   fix and re-run, never silence the finding by deleting the test's import.
   Exit 2 -> the tool's own error (bad arguments, unreadable file) — STOP and
   report, this is not a slice defect.

4. **Hygiene gates, scoped to the SLICE, never to the branch it came from.**

   ```sh
   node tools/absence-scan.mjs --git-range "$BASE..<branch>"
   ```

   Scoped to `$BASE..<branch>` — the same `$BASE` step 2 computed, i.e. only
   the commits this slice actually adds — never to `upstream/main`'s full
   ancestry and never to this fork's own `main` history. `main` carries years
   of commits already public in this fork's own repo; a whole-branch or
   whole-history scan reports findings this push cannot retract either way,
   which is a gate that cannot pass (the exact scoping fact
   `docs/runbooks/upstream-pr-round.md`'s own hygiene gate already relies on,
   there stated as "`<branch-base>` is the commit the branch was at before
   THIS round's work"). Any finding REFUSES the slice the same way step 2's
   does — named, never printed as bytes.

5. **Upstream PR body form.** Compose the PR body with: a summary of the
   topic's own commits, a test plan, and — where the topic is a bust or
   mitigation — the live forensics that motivated it (a `replay.mjs` census,
   the threat-matrix row, a `bust-triage` verdict); `n/a` where the topic is
   not bust-shaped. Close with the AI-attribution footer this fork already
   uses (`docs/runbooks/upstream-pr-round.md`, step 6) — note, not a line
   found in the tracked upstream `CLAUDE.md` itself (checked directly: it
   carries no such footer text), but this fork's own standing convention,
   applied here for the same reason:

   ```
   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   <session link>
   ```

   Assemble the body and hold it. Do not run `gh pr create` without an
   explicit operator GO to open THIS slice — opening a new public PR is the
   irreversible act the tracked `CLAUDE.md`'s "Public Communication" section
   already gates ("never post publicly without ... approval. Draft and wait
   for go-ahead"), and it is a bigger one than the follow-up comment
   `upstream-pr-round.md`'s own box already permits without asking every
   time.

6. **Handoff.** Once the PR is open, this lane's job is done. Any review
   activity on it enters `docs/runbooks/upstream-pr-round.md` — reuse this
   lane's own worktree (its "Setup (once per branch)" is idempotent: skip
   creating a new one if it already exists) and the round itself begins at
   that file's "## The round", step 1 ("Read before acting") the moment a
   review actually lands. Until then there is nothing further to do here.

## Limits (the box)

- No `git push` and no `gh pr create` land without the explicit operator GO
  named in step 5 — this lane drafts the PR, it does not decide to open it.
- Never push to `main` (this fork's or upstream's) from this lane; a topic
  branch only.
- Plain `gh` under the operator's own identity — no bot token, matching
  `CLAUDE.local.md`'s standing correction of the tracked `CLAUDE.md`'s bot
  apparatus, which does not exist on this machine.
- No label changes — upstream's review/approval label machine is theirs
  alone (same box as `upstream-pr-round.md`).
- A step-2 or step-4 finding is a REFUSE, never a squash-and-recheck-in-place:
  fix at the commit that introduced it and re-run the sweep from the top.
- Which commits belong to a topic, and which topic to slice next, are
  judgment calls this runbook surfaces, never decides — that is the slice
  plan's job (FORK-NOTES, BACKLOG), not this file's.

## Report

Close with the dispatch-discipline §2 report form (items completed with
evidence, checks run with real output, gaps, deviations, lessons, files and
commits touched, what was NOT verified) — in the session's final message if
working directly for the operator.
