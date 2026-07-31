# Dispatcher actions — prepared 2026-07-31

Everything below is prepared and unpushed. Two worktrees hold the work:

| worktree | branch | head | state |
|---|---|---|---|
| `/home/g/dev/vendor/cache-fix-pr4` | `pr/verification-tools` | `a0a051f` | 15 commits appended to `53761a3` |
| `/home/g/dev/vendor/cache-fix-pr12` | `pr/insertion-join-moves` | `fbec02f` | new branch: `b713b2f` + merge of `a0a051f` + 7 commits |

Both merge cleanly onto `upstream/main` (`0817302`) — `git merge-tree
--write-tree` exits 0 for each, so no rebase is needed.

---

## STOP — decide this before step 1

The two harvested fixtures these branches carry contain material that the OPEN
sanitization blocker on #272 is about. **Both are already on `origin/main`** (so
they are already public in the fork), but pushing them into an upstream-facing PR
extends the exposure into `cnighswonger`'s repo while that blocker is unresolved,
and #272's reviewer explicitly asked us not to move on fixture sanitization
before agreeing a path.

1. **`test/fixtures/harvested/reset-move-s-dc3f8071-196-197.json` embeds a real
   screenshot, five times.** Five identical `image/png` blocks, 13,060 base64
   chars each (~9.8 kB decoded, 951×55), PNG `tEXt` chunks reading
   `Creation Time: Mi 29 Jul 2026 16:46:01 CEST` and `Software: gnome-screenshot`.
   Decoded and viewed: it shows a terminal line of the operator's own prose
   ("So: when I write PR #184 — do you see just PR #184, or ..."). Benign content,
   but it is unsanitized real capture, plus a locale + desktop-environment
   fingerprint and a wall-clock stamp — and the fixture's own `_sanitization`
   header claims it "keeps no raw text at all". That claim is false as written.

   **Root cause, and it is a tool bug, not a fixture slip:** `tools/harvest.mjs:169`
   redacts `block.data`, but an Anthropic image block nests the base64 at
   `block.source.data` — one level below where the scrubber looks. Every image in
   every harvested fixture passes through raw. The fix belongs in `scrubBlock`
   (recurse into `source`), and it needs a bite that goes red on this fixture
   first.

2. **`test/fixtures/harvested/flap-s-0d6f38ba-86.json` retains raw operator hook
   prose.** Its `_sanitization` header says the participating reminder texts are
   kept RAW on purpose. Six of the eight raw strings are the operator's own hook
   text, quoting private files by name — `dispatch-discipline.md §1`,
   `CLAUDE-maintenance.md Provenance` — and paraphrasing private corpus rules.
   Only "The task tools haven't been used recently…" is genuine harness text.
   The *later* `reset-move` fixture's header states it deviated from this
   precedent for exactly this reason: "two of the three constituents here are the
   operator's own hook texts rather than harness-generated reminders, so raw
   retention would put operator prose in a public repo."

   So the fork's own standard, set one day later, is not met by the fixture the
   verification slice would now carry upstream.

Both fixtures are load-bearing for tests on these branches: `flap-…` is read by
`test/insertion-join-move.test.mjs` and `test/replay-gate-selfcheck.test.mjs`,
`reset-move-…` by `test/insertion-join-move.test.mjs`. Dropping them means those
checks lose their real-capture leg. **This is an operator decision — go / re-scrub
/ hold — and nothing below should run until it is made.**

Everything else scanned clean on both deltas: no IPv4 or IPv6 literals, no `ssh
user@host` lines, no non-loopback `host:port`, no absolute user paths, no
`sk-ant-` / `Bearer` / `ghp_` shapes, no fork-only files
(`BACKLOG.md`, `FORK-NOTES.md`, `CLAUDE.local.md`, `docs/directives/**`,
`docs/audits/**`, `docs/code-reviews/**`, `docs/release-tests/**`,
`test/fixtures/harvested/LEDGER-*.json`).

---

## 1 — push the verification-tools update

```bash
cd /home/g/dev/vendor/cache-fix-pr4
git push origin pr/verification-tools
```

Fast-forward: the 15 new commits sit on top of the pushed `53761a3`, no force
needed.

## 2 — comment on #276

```bash
cd /home/g/dev/vendor/claude-code-cache-fix
gh pr comment 276 --repo cnighswonger/claude-code-cache-fix \
  --body-file /tmp/claude-1000/-home-g-dev-vendor-claude-code-cache-fix/adf6cadb-d98f-49c5-ae2c-578f4596ca9a/scratchpad/pr-prep-comment-276.md
```

## 3 — push the new branch

```bash
cd /home/g/dev/vendor/cache-fix-pr12
git push -u origin pr/insertion-join-moves
```

## 4 — open the draft PR

Title and body live in `pr-prep-body-join-moves.md`; the file's first section is
the title, the rest (from `# BODY`) is the body. Strip the two headers before
posting, e.g.:

```bash
SP=/tmp/claude-1000/-home-g-dev-vendor-claude-code-cache-fix/adf6cadb-d98f-49c5-ae2c-578f4596ca9a/scratchpad
sed -n '/^# BODY$/,$p' $SP/pr-prep-body-join-moves.md | tail -n +3 > $SP/pr-prep-body-join-moves.rendered.md

cd /home/g/dev/vendor/claude-code-cache-fix
gh pr create --repo cnighswonger/claude-code-cache-fix --draft \
  --base main \
  --head Gunther-Schulz:pr/insertion-join-moves \
  --title "feat(insertion-normalization): un-merge CC's join-moves, and stop a re-served entry from re-binding" \
  --body-file $SP/pr-prep-body-join-moves.rendered.md
```

## 5 — cross-link on #272

Not drafted as a separate file; one line is enough, and it should only go up
after step 4 so it can carry the real number:

> The join-move / reserved-entry work that this branch's pinning made possible
> is now up as #NNN (draft, stacked on this branch and on #276). It closes the
> identity mis-binding where one extra copy of a recurring reminder re-binds an
> entry CC has stopped sending — corpus A/B: stability violations 10 → 2, and
> both survivors belong to `deferred-tool-rewrite` and are identical in both
> trees.
>
> 🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Cleanup

Both worktrees have an untracked `node_modules` symlink pointing at the fork
main checkout's, added so the suites could run (`hpagent` etc. are not installed
per-worktree). Remove if you want the trees pristine:

```bash
rm /home/g/dev/vendor/cache-fix-pr4/node_modules /home/g/dev/vendor/cache-fix-pr12/node_modules
```

Note `.gitignore` has `node_modules/` with a trailing slash, so a *symlink* of
that name shows as untracked rather than ignored. It was never staged.
