# Directive: the upstream merge (37 behind), 2026-08-16

Handed to a peer session by the desk session that sized it. This is a
HANDOFF, not a subagent brief: you hold the judgment, you own the working
copy, and you take your own decisions to the operator. What follows is the
evidence you would otherwise re-derive, plus the obligations that are not
yours to waive.

## Writer ownership — read this first

**You own `/home/g/dev/vendor/claude-code-cache-fix` for this work.** The
desk session that wrote this directive is hands-off on that clone from the
moment it sends you the pointer: no commits, no edits, no pushes there. One
writer per working copy is the rule that makes this safe, and a merge is the
worst possible time to break it.

Two things in that clone are NOT yours to change:

- **`wip/resume-key-third-read`** — a parked branch carrying four commits of
  a mitigation that failed review. Do not delete, rebase or merge it. It
  touches four files in your conflict set and will be re-derived later; its
  entry in `BACKLOG.md` names it so it is not a lost pile.
- **`docs/drafts/row-31-upstream-filing.md`** — a public post awaiting the
  operator's GO on its exact text. Do not post it, do not edit it. Nothing
  goes public without operator GO, ever.

`BACKLOG.md` is yours while you hold the copy — book what you find.

## Required reading before the first change

The repo gates this mechanically: a PreToolUse hook denies your first
Write/Edit until you have Read `docs/dev-loop.md` and `FORK-NOTES.md`.

- `CLAUDE.local.md` — the fork overlay. Most important here: **upstream's
  tracked `CLAUDE.md` is a foreign team's**, and its bot identities, label
  state machine, agent roles and npm release rules do NOT bind this fork.
  The recorded failure mode is transcription, not obedience: a session
  reaches for the word "review" or "rollout", finds upstream's process is
  the only one written down, and copies it in. Twice by 2026-07-30.
- `FORK-NOTES.md` — "Update-from-upstream procedure" is the actual sequence
  (`git fetch upstream`, `git merge upstream/main` on main — **merge, not
  rebase**: fork main is deployed, published state and is never rewritten).
  Note the block's own correction history: an earlier version named remotes
  that do not exist. `origin` IS our fork; `upstream` is cnighswonger.
- `docs/dev-loop.md` — the method. For this job especially: "Replay the
  configuration that is SERVING, not the defaults", and "Before a restart:
  price it against LIVE sessions, not the corpus".
- `BACKLOG.md`, the entry `<!-- entry: "fork main 33 behind upstream,
  disposition owed, merge not exemption" -->` — it carries the sizing below
  and the sequencing decision.

## What is already measured — do not re-derive this

Established at the desk 2026-08-16, against `git merge-base` (`76d586d`):

- **37 commits behind**, up from 33 earlier the same day. It drifts while
  you read this.
- **Incoming: 97 files, +22,197 / −782**, including two whole new upstream
  tools (`tools/tier-advisor.mjs`, 722 lines; upstream's own
  `tools/absence-scan.mjs`, 479 lines).
- **Conflict surface: 56 files** changed on BOTH sides since the base. It
  lands on this fork's core — `proxy/extensions/insertion-normalization.mjs`,
  `proxy/extensions/message-hash.mjs`,
  `proxy/extensions/deferred-tool-rewrite.mjs`, `proxy/server.mjs`, plus
  twenty-odd test files.
- **The incoming set touches state keys / freeze logic** (15 matched lines).

**METHOD NOTE — the desk got this wrong before it got it right.** `git diff
main..upstream/main` renders the fork's OWN work as deletions:
`proxy/xdg-dirs.mjs -208` is our fork-only file, not upstream removing it,
and the state-key hits in that direction were our own D1 machinery. Size an
incoming merge against `merge-base`, never tree-to-tree.

## The hazard to open with

**`tools/absence-scan.mjs`.** Upstream has independently grown its own; ours
is the publication-bar enforcer that runs as a pre-push hook and is the only
thing standing between this repo and an unretractable leak into public git
history. A careless resolution there weakens the leak gate on the one
irreversible axis this repo has.

Resolve it deliberately, and prove the result: after resolution, run the
scan on a PLANTED known positive (a real session UUID in a scratch copy of a
fixture) and confirm it still fires. A leak gate that no longer fires is
byte-identical to a clean repo, which is why the proof is not optional.

## Obligations that are not yours to waive

1. **Row 3 does NOT carry here.** Restarts are cache-transparent *unless* the
   change touches state KEYS or freeze logic — and this one does. So the
   restart is priced against LIVE sessions before it happens:
   `node tools/restart-exposure.mjs --window-min 60`, and with a `--match`
   predicate for the affected class once you know it. Write the row-3
   declaration BEFORE the restart, not after.
2. **The restart timing is the OPERATOR's call, not yours.** Live sessions
   re-baseline. Surface the priced number and let them choose the boundary.
3. **Deployment coupling:** any `proxy/**` change needs, in the dotfiles
   repo, a `CACHE_FIX_PROXY_TREE_PIN` bump (`git rev-parse --short
   HEAD:proxy`) plus `systemctl --user restart cache-fix-proxy`. That is a
   second repo — do not forget it, and do not do it before the operator has
   chosen the boundary.
4. **The suite is the gate.** `npm test` run ALONE (it shells out to git; a
   concurrent commit blocks on `index.lock`). The pre-push hook runs it at
   the pushed commit and will block you otherwise. Never `--no-verify`.
5. **After the merge, run the gate over live captures** —
   `node tools/gate-live.mjs` — because the committed fixture corpus is blind
   along its own curation axis and only live captures are production-shaped.
6. **Never set a repo-local `core.hooksPath`.** It replaces the global
   dispatcher and silently disables the fixture-leak scan.

## Done means

Merge committed on `main`, full suite green at that commit, the leak scan
proven still firing on a planted positive, `gate-live` run, the row-3
declaration written with its priced number, the pin bump prepared, and the
restart either taken at an operator-chosen boundary or explicitly deferred
with that stated. Anything you could not settle goes back to the operator as
a question with its evidence — never bridged with a guess.

## Not in scope

The resume-key mitigation redesign and the harness lint. Both are sequenced
AFTER this merge, deliberately: the parked branch touches four of your
conflict files and will be re-derived anyway, so its rebase cost is at its
minimum now; and the lint's own subject — test files exercising gated
extensions — sits in your conflict set, so building it first means
validating it twice.
