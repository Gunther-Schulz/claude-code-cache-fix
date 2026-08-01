# Branch rewrite plan — 2026-08-01 (fork-only)

Basis: #272 reviewer confirmation (issuecomment-5151107400, 2026-08-01
10:53Z): rewrite so the original fixture blobs are never reachable from
upstream main; force-push OK, nothing depends on current SHAs; stack
order after #272 lands: #273 → #276 → #278, #281 last; re-review from
the top. HOLD entry: BACKLOG.md "prepared PR-slice branches" (conditions
1+2 MET; this plan is condition 3). Executed by the dispatching session
inline; this file is the resume point if the session dies mid-surgery.

## Dirty→clean fixture mapping (clean counterparts all on fork main)

| dirty (pre-687cbc5) | clean |
|---|---|
| flap-s-0d6f38ba-86.json | flap-s-0dc8ac87c43d-86.json |
| oscillation-s-633915a8-863.json | oscillation-s-4b6a435234bf-863.json |
| pinned-s-633915a8-26-28.json | pinned-s-4b6a435234bf-26-28.json |
| reset-move-s-dc3f8071-196-197.json | reset-move-s-97097e027ac0-196-197.json |
| harvested-append-after-change-s-35d72503-323.jsonl | …-s-628f31b605ed-323.jsonl |
| harvested-replace-edit-s-0edbd11c-20.jsonl | …-s-157bd37224d7-20.jsonl |
| harvested-splice-insert-mid-s-0edbd11c-19.jsonl | …-s-157bd37224d7-19.jsonl |

(growth-* dirty names never reached any PR branch.)

## Affected branches (scan 2026-08-01, `git log <b> --not upstream/main
--diff-filter=A -- <dirty names>`; upstream/main = 23346ac)

- pr/insertion-normalization (#272, worktree pr1): 7 commits; dirty adds
  at 1ca82f0 (pinned) and tip b713b2f (oscillation). Literal name refs at
  those commits: test/insertion-suppression.test.mjs (:281 comment, :291
  path), test/insertion-merge-suppression.test.mjs (:32 path).
- pr/retire-messages-cache-breakpoint (#281, worktree pr10): #272's 7 +
  b07c0dc — rebase b07c0dc onto rewritten #272.
- pr/verification-tools (#276, worktree pr4): 34 commits; dirty adds at
  8069f75 (three harvested-*.jsonl), c392095 (pinned), e15e48f (flap).
  Origin has up to 53761a3 — force-push required (reviewer-cleared).
- pr/insertion-join-moves (pr12, never pushed): rewritten-#272 tip +
  merge of rewritten-#276 tip + 7 commits, dirty add at 50ba316
  (reset-move) fixed during replay.

Clean branches (no rewrite; rebase onto 23346ac only when their turn in
the stack comes / on demand): #273, #275, #278, #279, #280, #282.

## Method (per branch, in its own worktree)

1. Safety ref first: `git branch backup/<name>-pre-rewrite <tip>`
   (fork-local, never pushed).
2. `git reset --hard 23346ac`, then cherry-pick the old commit list in
   order. At each dirty-add commit: `git rm` the dirty fixture, copy the
   clean counterpart from fork main (`git checkout main -- <clean
   path>`), update literal name references in the same commit's files,
   `git commit --amend --no-edit`. Later commits touching old names:
   resolve conflicts to the clean names.
3. Comment rule (HOLD detail): fixture↔capture PAIRINGS ("(capture
   s-XXXX)" beside a fixture name) are dropped in slice copies; BARE
   capture short-forms (measurement provenance) stay — they are already
   public on the pushed slices, consistent precedent.
4. Verify per branch before any push:
   - `git rev-list --objects <new-tip> --not upstream/main | grep -f
     <dirty-names>` → empty (blob reachability, the reviewer's actual
     criterion), plus full-UUID regex grep over the tip tree.
   - `node tools/slice-preflight.mjs` (absence arm) as on main.
   - Branch suite green in the worktree (targeted `node --test`; the
     proxy-read-dedupe failure on #276 is the known pre-existing red,
     proven at 53761a3).
5. Push order: force-push #272 → push #276 (force) → push pr12 (`-u`,
   new) + open draft PR (pr-prep-actions.md steps 3-5, comment files in
   docs/audits/pr-prep-2026-07-31/) → force-push #281 → then stack
   rebases #273 → #278 as upstream review proceeds. Comment on #272
   after the force-push: rewrite done, blobs unreachable, ready for the
   fresh round.

## Status ledger (append as steps complete)

- 2026-08-01: plan written; no branch touched yet.
