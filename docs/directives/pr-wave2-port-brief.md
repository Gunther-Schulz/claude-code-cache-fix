# Brief: PR port wave 2 — post-morning commits into the upstream slices

Dispatched 2026-07-30 (opus-4.8). Wave 1 (2026-07-30 morning) put c713d0e
into #272, the metric/census refresh into #276, and rebased #281. This
wave ports every slice-relevant commit that landed after it. The
commit→slice mapping below is SETTLED by the dispatcher — execute it,
don't re-derive it. A conflict or state that contradicts the mapping is
a gap to report, never a decision to make.

## Non-Functional Requirements

- **Size/complexity budget**: no new code — cherry-picks and path-scoped
  splits of existing fork commits; ~10 commits across 5 worktrees.
- **Threat model**: public repo. The one new fixture
  (`test/fixtures/harvested/pinned-s-633915a8-26-28.json`) is
  harvest-sanitized and already public on fork origin; before each
  commit, grep staged content for literal IPv4/IPv6 — a hit is a HALT
  and a report, not a scrub-and-continue.
- **Maintainability**: keep cherry-picked commit messages (use `-x`);
  split/sync commits use the exact titles given below.
- **Load-bearing?** Yes (extension code on the wire path) — but zero
  novel logic: every ported hunk is already reviewed, tested, and
  serving on fork main.

## Worktrees (write boundary — these five and NOTHING else)

- `~/dev/vendor/cache-fix-pr1` → branch `pr/insertion-normalization` (#272)
- `~/dev/vendor/cache-fix-pr4` → branch `pr/verification-tools` (#276)
- `~/dev/vendor/cache-fix-pr7` → branch `pr/output-guard` (#278)
- `~/dev/vendor/cache-fix-pr9` → branch `pr/prefix-diff-attribution` (#280)
- `~/dev/vendor/cache-fix-pr10` → branch `pr/retire-messages-cache-breakpoint` (#281)

Never touch the main tree at `~/dev/vendor/claude-code-cache-fix`.
Verify each worktree is on its listed branch and clean
(`git status --porcelain` empty) before starting; a dirty worktree or
wrong branch is a gap — report, skip that worktree.

## Grounding basis — source commits (fork main; read each with `git show` before porting)

Oldest→newest, apply in this order where a worktree takes several:
da4e7e1, fda83cc, 2dfe0f0, e41e068, 813edc8, 9876fff, 7790dff,
b167fa5, 78940a0, e0f8fcb.

NOT ported (dispatcher's decision, listed so you don't "fix" the gap):
88f140e (upstream-change-detection noise fix — new-PR candidate,
operator not yet asked), b1f7c58/4413b2e/ec03841/b3ba6fd (fork-only
fixtures + BACKLOG), and anything touching `tools/shape-verdicts.mjs`
history before 9876fff (already in the slice from wave 1).

## Per-worktree plan

### pr1 (#272, pr/insertion-normalization)

1. `git cherry-pick -n 2dfe0f0`; reset `test/harvest-pin.test.mjs` and
   `test/mitigation-output-form.test.mjs` back to HEAD (they belong to
   #276); commit what remains (`test/insertion-suppression.test.mjs` +
   `test/fixtures/harvested/pinned-s-633915a8-26-28.json`) as:
   `test(insertion-suppression): real-pair check falls back to pinned fixture (slice of fork 2dfe0f0)`
2. `git cherry-pick -x 78940a0`
3. `git cherry-pick -n e0f8fcb`; reset
   `proxy/extensions/output-guard.mjs` and `test/output-guard.test.mjs`
   to HEAD (they belong to #278); commit the rest as:
   `insertion-normalization: never strip the tail — a final-message duplicate is payload (insertion slice of fork e0f8fcb)`
4. Acceptance: `git diff e0f8fcb --stat -- proxy/extensions/insertion-normalization.mjs test/insertion-suppression.test.mjs test/insertion-merge-suppression.test.mjs test/fixtures/harvested/pinned-s-633915a8-26-28.json`
   must be EMPTY.
5. Tests: `node --test test/insertion-normalization.test.mjs test/insertion-suppression.test.mjs test/insertion-merge-suppression.test.mjs`

### pr4 (#276, pr/verification-tools)

1. `git cherry-pick -x da4e7e1`
2. `git cherry-pick -x fda83cc`
3. `git cherry-pick -x 2dfe0f0` (all four paths belong here)
4. `git cherry-pick -x e41e068` (wholesale — the fresh-session-sort
   telemetry exists FOR the replay exemption; extension rides with its
   checker, that note goes in the closing report for the PR comment)
5. `git cherry-pick -x 813edc8`
6. `git cherry-pick -x 9876fff`
7. `git cherry-pick -x 7790dff`
8. Sync commit: `git checkout e0f8fcb -- proxy/extensions/insertion-normalization.mjs test/insertion-suppression.test.mjs`
   then commit as:
   `sync(insertion-normalization): match #272 tip — join-hash + tail guard`
9. Acceptance: `git diff e0f8fcb --stat -- tools/ proxy/extensions/insertion-normalization.mjs proxy/extensions/fresh-session-sort.mjs test/harvest-pin.test.mjs test/mitigation-output-form.test.mjs test/insertion-suppression.test.mjs test/replay-gate-selfcheck.test.mjs test/shape-verdicts.test.mjs test/proxy-fresh-session-sort.test.mjs test/fixtures/harvested/pinned-s-633915a8-26-28.json`
   must be EMPTY.
10. Tests: `node --test test/harvest.test.mjs test/harvest-pin.test.mjs test/mitigation-output-form.test.mjs test/insertion-suppression.test.mjs test/replay-gate-selfcheck.test.mjs test/replay-gate-warning.test.mjs test/shape-verdicts.test.mjs test/proxy-fresh-session-sort.test.mjs test/replay-class-matrix.test.mjs test/replay-fidelity.test.mjs test/gate-live.test.mjs`

### pr7 (#278, pr/output-guard)

1. `git cherry-pick -n e0f8fcb`; reset
   `proxy/extensions/insertion-normalization.mjs`,
   `test/insertion-suppression.test.mjs`,
   `test/insertion-merge-suppression.test.mjs` to HEAD; commit
   `proxy/extensions/output-guard.mjs` + `test/output-guard.test.mjs` as:
   `output-guard: the forwarded tail must stay assistant-terminal-equivalent (output slice of fork e0f8fcb)`
2. Sync commit: `git checkout e0f8fcb -- proxy/extensions/insertion-normalization.mjs test/insertion-suppression.test.mjs`
   commit as:
   `sync(insertion-normalization): match #272 tip — join-hash + tail guard`
   (NO pinned fixture here — the suppression test skips without it by
   design; that note goes in the closing report for the PR comment.)
3. Acceptance: `git diff e0f8fcb --stat -- proxy/extensions/output-guard.mjs test/output-guard.test.mjs proxy/extensions/insertion-normalization.mjs test/insertion-suppression.test.mjs`
   must be EMPTY.
4. Tests: `node --test test/output-guard.test.mjs test/insertion-normalization.test.mjs test/insertion-suppression.test.mjs`

### pr9 (#280, pr/prefix-diff-attribution)

1. `git cherry-pick -x b167fa5`
2. Acceptance: `git diff e0f8fcb --stat -- proxy/extensions/prefix-diff.mjs test/proxy-prefix-diff.test.mjs` must be EMPTY.
3. Tests: `node --test test/proxy-prefix-diff.test.mjs`

### pr10 (#281, pr/retire-messages-cache-breakpoint) — AFTER pr1 is done

1. `git rebase pr/insertion-normalization`
2. Tests: `node --test test/insertion-normalization.test.mjs test/insertion-suppression.test.mjs test/insertion-merge-suppression.test.mjs`

## Rules

- A cherry-pick CONFLICT is a gap: `git cherry-pick --abort` (or
  `git rebase --abort` for pr10), report which commit/worktree/paths, do
  NOT resolve by hand — the mapping said these apply clean; a conflict
  means the mapping's premise is wrong and the dispatcher re-derives it.
- A non-empty acceptance diff is likewise a gap: report the diffstat,
  leave the worktree as it stands.
- Never run bare `npm test` (it can hang on the production port) — only
  the named test files.
- New (split/sync) commits carry the trailer
  `Co-Authored-By: Claude opus-4.8 <noreply@anthropic.com>`.
  Targeted `git add <paths>`, never `-A`.
- No `gh` commands at all; no pushes.

Closing report (mandatory; the project's own report form if it
defines one, else the §2 form here — never both; "none" is a
valid slot answer, silence is not): (a) items completed w/
evidence, (b) checks RUN w/ real output, (c) gaps surfaced —
incl. anything needing a tier above yours, returned as a question
with its evidence, never settled at your tier,
(d) deviations w/ reason, (e) candidate lessons, (f) files
touched + commit hashes (unpushed), (g) what was NOT verified,
(h) sources actually read, of those the brief named.
Report channel: SendMessage to the dispatcher — your final text reaches no one.
Message ≤3000 chars: full detail goes to a FILE, the message
carries key findings + the file path. A missing decision, file,
or value is surfaced as a gap, never bridged with a guess.
A check that got backgrounded is AWAITED before the closing
report (TaskOutput block=true on its task id) — ending your
turn orphans it; a report sent with a check still running is
an INTERIM report, says so, and names what remains.
Commits unpushed, targeted `git add <paths>` never `-A`, trailer:
`Co-Authored-By: Claude opus-4.8 <noreply@anthropic.com>`.
After sending the report your write grant is over: a defect you
find later is REPORTED, never edited or amended (source: §4
ownership rule).
