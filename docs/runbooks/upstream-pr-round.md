# Runbook: answering a review round on an upstream-facing PR branch

Standing procedure, written for a fresh context. Consumer: any dev
session (typically the Opus dev session) executing PR-round items from
BACKLOG.md. Companion facts: `docs/audits/upstream-pr-sweep-2026-08-05.md`
(per-PR state as of that date), upstream issue #284 (upstream's own
landing order), `CLAUDE.local.md` (identity + what upstream's tracked
CLAUDE.md does and does not bind here).

## Setup (once per branch)

Never check a PR branch out in the main working tree — that tree IS the
serving config of the production proxy (systemd runs
`proxy/server.mjs` from it; /health fingerprints it). Use a worktree:

```sh
git fetch upstream && git fetch origin
git worktree add /tmp/wt-<branch-slug> <branch>
ln -s /home/g/dev/vendor/claude-code-cache-fix/node_modules /tmp/wt-<branch-slug>/node_modules
```

The symlink is mandatory: a fresh worktree has no `node_modules`, and
without it `npm test` dies with `ERR_MODULE_NOT_FOUND: hpagent` and two
suites appear to hang ~900 s (measured 2026-08-02; it is the missing
deps, not the documented production-port hazard).

Isolation basis for that symlink (the environment-resolution question,
2026-08-05): it shares only THIRD-PARTY deps with the main tree. The
project's own code is imported by relative path everywhere
(`../proxy/...`, `./read-lines.mjs`), so a suite run in the worktree
measures the worktree's code, never the main tree's. If a self-import
via package name is ever introduced, this basis breaks — re-check then.

Pushes from a worktree run the same two gates as main-tree pushes: the
global dispatcher chains the repo's `.git/hooks/pre-push` via its
common-dir fallback (dotfiles, 2026-08-05), so the full suite gates
worktree pushes too.

When done with a branch: `git worktree remove /tmp/wt-<branch-slug>`.

## The round

1. **Read before acting.** `gh pr view <n> --repo
   cnighswonger/claude-code-cache-fix --json reviews,comments` and read
   the FULL latest review + all comments since our last push. Never work
   from a remembered or summarized finding when the thread is one read
   away — and never assume the previously seen diff is current
   (fetch the PR head first).
2. **Fix on the branch.** The backlog entry carries the settled design;
   a gap in it is surfaced in the PR-round report, never bridged with a
   guess.
3. **Rebase policy.** Upstream requires contributors to rebase against
   current `upstream/main` before requesting review — rebase when the
   PR is CONFLICTING or when the reviewer asks; use
   `git push --force-with-lease` afterwards (established precedent on
   #281). Never resolve by cherry-picking the conflict away.
4. **Verify.** Targeted suites for the touched area, then the FULL
   `npm test` in the worktree (fast: ~17 s for ~2050 tests). Any red
   that is not the documented branch-base artifact blocks the push.
5. **Hygiene gate — before every push, non-negotiable (public repo).**
   The Public-Repo Information Hygiene section of the tracked CLAUDE.md
   binds in full. Mechanically:
   ```sh
   node --test test/absence-scan.test.mjs        # where the branch has it
   git diff upstream/main...HEAD | grep -E '^\+' \
     | grep -nE '([0-9]{1,3}\.){3}[0-9]{1,3}|ssh [a-z]+@|(^|[^0-9a-f])s-[0-9a-f]{8}([^0-9a-f]|$)'
   git log <branch-base>..HEAD --format='%s%n%b' \
     | grep -nE '([0-9]{1,3}\.){3}[0-9]{1,3}|ssh [a-z]+@|(^|[^0-9a-f])s-[0-9a-f]{8}([^0-9a-f]|$)'
   ```
   `<branch-base>` is the commit the branch was at before THIS round's
   work — the commits you are about to add, not the whole branch. That
   scoping is load-bearing and was got wrong first: run over
   `upstream/main..HEAD` the message grep flags the branch's own
   historical commits, which are already in upstream's
   `refs/pull/N/head` and cannot be retracted by any push. Measured
   2026-08-05 on `pr/verification-tools`: five such lines, all
   pre-existing, all already public. A gate that cannot pass is the
   fires-on-a-non-defect shape — it belongs in the BACKLOG entry about
   historical exposure, not in front of a push it cannot help.
   Both greps must return nothing attributable to real infrastructure or
   real capture/session identifiers. PR diffs are public the instant
   they open, and objects persist in upstream's `refs/pull/N/head` even
   after close — there is no retraction (confirmed on #294/#296).

   Three refinements, each earned by an occurrence on 2026-08-05:

   - **Filter the diff to ADDED lines** (`grep -E '^\+'`). A scrub's
     removed lines necessarily show the value being deleted, so an
     unfiltered grep reports every scrub as a finding and trains its
     reader to wave the check through.
   - **Grep the COMMIT MESSAGES too** — the second command above. A
     scrub commit that names the value in its own subject publishes it
     exactly as permanently as a file would, and nothing else catches
     it: `tools/absence-scan.mjs` scans file contents, never messages.
     Observed live: a dispatched agent's subject read "replace real
     capture id `s-<8hex>` …", caught at review, reworded before push.
   - **Anchor the `s-<8hex>` pattern on both sides**
     (`(^|[^0-9a-f])…([^0-9a-f]|$)`). Unanchored it matches the
     12-hex tokenized form — which is the SAFE form — and it matches
     `claude-3-opus-20240229`, whose `s-20240229` is a coincidence.
     Both are false fires on the one gate that guards a public
     boundary.

   **Known blind spot, not fixed by these greps:** `absence-scan`'s
   `--git-range` mode filters candidates to `.json`/`.jsonl`
   (`SCANNABLE`, tools/absence-scan.mjs:270) before any class is
   consulted, so a capture identifier in a tracked `.mjs` or `.md`
   passes the push hook silently — proved with a planted UUID on
   2026-08-05. Until that is decided (BACKLOG), the greps above are
   the only thing covering source files, so running them is not
   optional belt-and-braces; it is the check.
6. **Push, then comment.** Every push gets a PR comment: what changed
   in response to which finding, real test counts from the run, then
   the footer:
   ```
   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   <session link>
   ```
   That footer IS the AI attribution — never dropped.

## Limits (the box)

- Plain `gh` under the operator's own identity. The bot-token
  machinery described in the tracked CLAUDE.md does not exist on this
  machine (verified 2026-07-30, `CLAUDE.local.md`); any instruction to
  run `generate-token.sh` is a transcription bug — stop and surface it.
- No pushes to any `main` (fork-main is production; upstream-main is
  not ours). PR branches only.
- No label changes, ever — upstream's review/approval label state
  machine is theirs alone.
- No new issues, discussions, or posts beyond the established
  push-announcement comment pattern without an operator GO.
- A finding that needs a DESIGN decision not already settled in the
  backlog entry returns as a question in the report — it is not decided
  at execution time.

## Report

Close the round with the dispatch-discipline §2 report form (items
completed with evidence, checks run with real output, gaps, deviations,
lessons, files+commits, what was NOT verified) — in the session's final
message if working directly for the operator.
