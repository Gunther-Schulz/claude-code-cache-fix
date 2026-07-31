# Closing report — PR slice update prep (2026-07-31)

## (a) Items completed, with evidence

**Task 1 — inventory.** The candidate list was incomplete. Verified by
file-scoped `git log` rather than trusted:

```
git log --reverse --format='%h %ci %s' da9bf8c..main -- tools/
git log --reverse --format='%h %s'     da9bf8c..main -- test/
git log --reverse --format='%h %ci %s' b1f7c58..main -- proxy/extensions/insertion-normalization.mjs
```

Seven commits touching slice files were missing from the brief's list:
`fc44da3`, `47defba`, `7b2a5ef`, `a774176`, `3afce21`, `090a110` (verification
slice) and `059aae3`, `9983a1b` (insertion slice). Two of those are hard
prerequisites, not nice-to-haves: `059aae3` is the reset-path duplicate
suppression that `5c4d70a` and `a1170a7` are explicitly reconciled *with*, and
`090a110` is the flap fixture that both `test/replay-gate-selfcheck.test.mjs`
and `test/insertion-join-move.test.mjs` read.

Two commits in the brief's list turned out not to belong anywhere:
`496fbf0` did (test-comment correction, verification slice), but `95ca0cb`
was mis-scoped in the brief as "may already be sliced" — it was not, and it
carries the fidelity gate.

Classification, with the split points:

*Verification slice (15 commits appended to `pr/verification-tools`):*
`090a110`, `fc44da3`, `47defba`, `95ca0cb`, `7b2a5ef`, `a774176`, `3afce21`,
`a77c930`, `a301ef1`, `404d5fc`, `6efce90` ported whole; `bffcb05` ported with
its `docs/code-reviews/` and `docs/directives/` halves dropped; `496fbf0` whole;
`a1170a7` **path-split — only `tools/replay.mjs`**, committed as "(verification
slice of fork a1170a7)"; `da8b837` whole.

*Insertion slice (7 commits on the new `pr/insertion-join-moves`):*
merge of `pr/verification-tools`; `059aae3` whole; `5c4d70a` **path-split —
extension + `test/extended-absorb.test.mjs`**, BACKLOG / threat-matrix /
directive / report halves dropped; `a1170a7` (extension + test + fixture; its
`tools/replay.mjs` half already present via the merge); `fad6f6b`, `0cc05c7`,
`8e3c265` whole; `9983a1b` **path-split — the 6-line code comment only**.

`9983a1b` deserves a note: it looks like a pure-docs commit and is titled as
one, but it also carries six lines of comment in
`proxy/extensions/insertion-normalization.mjs`. I found it by byte-comparing the
prepared extension against fork `main`, not by reading titles — worth
remembering as the check that catches this class.

`test/extended-absorb.test.mjs` was the one genuinely ambiguous file: it imports
*both* `proxy/extensions/insertion-normalization.mjs` and
`tools/reminder-migration-census.mjs`. Resolved by placement rather than
guess — it can only run where both exist, which is the new branch, not either
parent slice.

`docs/dev-loop.md` is **not** fork-only: it is already tracked on
`pr/verification-tools` (in a slice-portable form, 100 lines shorter than fork
main's), so `7b2a5ef`'s 29-line amendment to it rides along legitimately.

**Task 2 — `pr/verification-tools` updated in place.** `/home/g/dev/vendor/cache-fix-pr4`,
`53761a3` → `a0a051f`, 15 commits. `tools/` is now **byte-equal to fork main**
(`git diff --stat main HEAD -- tools/` empty), as are all eight
verification-owned test files and the flap fixture. No rebase performed:
`git merge-tree --write-tree upstream/main HEAD` exits 0, so it merges clean.

**Task 3 — `pr/insertion-join-moves` created.** `/home/g/dev/vendor/cache-fix-pr12`,
new worktree, cut from `b713b2f`. Base verified three ways before building:
local `pr/insertion-normalization`, `origin/pr/insertion-normalization`, and
`gh pr view 272 --json headRefOid` all read
`b713b2f4f6ca4b309876c5bd1a3ee9c3411449ea`. Merged `pr/verification-tools`'
updated tip `a0a051f` (`--no-ff`, no conflicts), then the seven insertion
commits. `proxy/extensions/insertion-normalization.mjs` and all four slice test
/ fixture files are **byte-equal to fork main**. Also merges clean onto
`upstream/main`.

**Task 5 — drafts written.** `pr-prep-body-join-moves.md`,
`pr-prep-comment-276.md`, `pr-prep-actions.md`, all in this directory.

## (b) Checks RUN, with real output

Full suite, both worktrees, minus the two port-bound files:

```
$ cd /home/g/dev/vendor/cache-fix-pr4 && node --test $(ls test/*.test.mjs | grep -vE 'proxy-integration|proxy-wrapper')
ℹ tests 1704   ℹ suites 50   ℹ pass 1703   ℹ fail 1   ℹ skipped 0

$ cd /home/g/dev/vendor/cache-fix-pr12 && node --test $(ls test/*.test.mjs | grep -vE 'proxy-integration|proxy-wrapper')
ℹ tests 1756   ℹ suites 50   ℹ pass 1755   ℹ fail 1   ℹ skipped 0
```

The one failure on each is the same, and it is inherited:

```
test at test/proxy-read-dedupe.test.mjs:505:1
✖ 28. read-dedupe loads at order 380 between image-retry-circuit-breaker (370) and cache-control-normalize (400)
  AssertionError: + actual 'insertion-normalization' / - expected 'cache-control-normalize'
```

Proven pre-existing by execution, not by argument — a detached worktree at
`pr/verification-tools`' *previous* head `53761a3`, before any commit of mine:

```
$ node --test test/proxy-read-dedupe.test.mjs
✖ 28. read-dedupe loads at order 380 ...
ℹ tests 42   ℹ pass 41   ℹ fail 1
```

and `git diff --stat 53761a3 HEAD -- proxy/ test/proxy-read-dedupe.test.mjs` is
empty, so nothing I added can have caused it. This is #272's open blocker 4.

Slice-specific runs, both fully green:

```
pr4,  17 verification-stack files:  ℹ tests 179  ℹ pass 179  ℹ fail 0
pr12,  6 insertion files:           ℹ tests 112  ℹ pass 112  ℹ fail 0
```

Mergeability: `git merge-tree --write-tree upstream/main HEAD` exit 0 on both
(trees `5fab2ee` and `1d06931`).

Byte-equality against fork main (all empty = equal): `tools/` on pr4;
`proxy/extensions/insertion-normalization.mjs`, `test/insertion-join-move.test.mjs`,
`test/extended-absorb.test.mjs`, `test/insertion-suppression-on-reset.test.mjs`,
both harvested fixtures on pr12.

Public-repo hygiene, run over each branch's own delta (`git diff --name-only
<base> HEAD`, 16 files on pr4, 60 on pr12) — all empty:

```
git grep -nhoE '(^|[^0-9.a-zA-Z])((25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})([^0-9.]|$)' HEAD -- $FILES
git grep -nE 'ssh +[a-z_]+@|([0-9a-fA-F]{1,4}:){4,}[0-9a-fA-F]{1,4}|[a-z0-9.-]+\.(com|net|io|org|de|dev):[0-9]{2,5}' HEAD -- $FILES
git grep -nE "/(home|Users)/[a-z]+" HEAD -- $FILES
git grep -niE 'sk-ant-|Bearer [A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}' HEAD -- $FILES
echo "$FILES" | grep -E '^(BACKLOG|FORK-NOTES|CLAUDE\.local)\.md|^docs/(directives|audits|code-reviews|release-tests)/|LEDGER-'
```

Those patterns do **not** cover the capture-metadata class, which is where the
real findings are — see (c).

## (c) Gaps surfaced — for a tier above mine

**1. `tools/harvest.mjs` does not scrub images. This is a tool bug with a
public-repo consequence.** `scrubBlock` redacts `block.data`
(`tools/harvest.mjs:169` — `out.data = \`data_${sha(out.data).slice(0,10)}\``),
but an Anthropic image block nests its base64 at `block.source.data`, one level
below where the scrubber looks. So images pass through raw. Confirmed in the
artifact, not inferred from the source:
`test/fixtures/harvested/reset-move-s-dc3f8071-196-197.json` carries five
identical `image/png` blocks, 13,060 base64 chars each. Decoded: 9,794 bytes,
951×55, PNG `tEXt` chunks `Creation Time: Mi 29 Jul 2026 16:46:01 CEST` and
`Software: gnome-screenshot`. I viewed it — a terminal line of the operator's own
prose about GitHub PR-link rendering. Content is benign; the exposure class is
not (unsanitized capture, locale + desktop-environment fingerprint, wall-clock
stamp), and the fixture's own `_sanitization` header asserts it "keeps no raw
text at all", which is false as written. The fix is in `scrubBlock` (recurse into
`source`) and needs a bite that goes red on this fixture before it counts.

**2. `flap-s-0d6f38ba-86.json` puts operator hook prose in a public repo, against
the fork's own later standard.** Its header states the participating reminder
texts are kept RAW deliberately. Six of the eight raw strings >40 chars are the
operator's own hook text quoting private files by name (`dispatch-discipline.md
§1`, `CLAUDE-maintenance.md Provenance`) and paraphrasing private corpus rules;
only "The task tools haven't been used recently…" is genuine harness text. The
*later* `reset-move` fixture's header records deviating from this precedent for
exactly this reason. Both fixtures are already on `origin/main`, so the fork-side
exposure is done, but pushing them into upstream PRs extends it — and #272's
reviewer explicitly asked that we agree a path before moving on fixture
sanitization. Both are load-bearing for real-capture test legs.

**These two together are why nothing was pushed and no PR was created beyond
what the brief already forbade.** The actions file leads with them as a STOP.

**3. #272's blockers 1 and 3 propagate.** The reminder-only-edit case (forwards
stale bytes) and canon files at ambient umask with full message content are
properties of `b713b2f`, which the new branch is cut from. Whatever lands on
#272 lands here. Called out in the drafted body rather than silently inherited.

**4. The new branch stacks on three PRs, not two.** `pr/verification-tools`
carries `6b897ef feat(deferred-tool-rewrite)`, so merging it brought
`proxy/extensions/deferred-tool-rewrite.mjs` and `proxy/source-fingerprint.mjs`
into `pr/insertion-join-moves` as well. The drafted body says "stacks on #272 and
#276" per the brief; if #273 is the deferred-tool-rewrite PR, that sentence
should name it too. I did not change the wording the brief specified — flagging
it instead.

## (d) Deviations, with reason

- **Ported seven commits the brief did not list.** Verifying completeness by
  file-scoped log was instructed; acting on the result was the only way to keep
  the slices coherent (`059aae3` in particular is a prerequisite the later
  commits are written against).
- **Symlinked `node_modules` into both worktrees.** The suites could not run
  otherwise (`ERR_MODULE_NOT_FOUND: hpagent`). Untracked, never staged, removal
  command in the actions file.
- **Did not fix the red `proxy-read-dedupe` assertion.** It is an open #272
  blocker whose resolution the reviewer asked to be deliberate (move the order
  vs. update the assertion). Patching it in a stacked PR would decide it by
  default.
- **`bffcb05`'s ported message still references `extended-absorb.test.mjs`**,
  which lives on the other branch. Left as-is: rewriting a ported rationale to
  match a slice boundary would make the provenance wrong in a different way.

## (e) Candidate lessons

- A commit's title names its *intent*, not its file set. `9983a1b` is titled
  "docs:" and carries production code. Byte-comparing the prepared artifact
  against the source tree is what caught it; reading the commit list would not
  have.
- A sanitizer that redacts a field by name misses the same field one level down
  in the wire format. The harvest scrubber's `data` handling is the whole bug:
  right field, wrong depth.
- A fixture's own `_sanitization` header is a claim, not a verification. Both
  fixtures here carry confident sanitization prose; one of them is wrong.

## (f) Files touched + commit hashes (all unpushed)

`/home/g/dev/vendor/cache-fix-pr4` on `pr/verification-tools`, `53761a3` →
`a0a051f`: `e15e48f 632806d 702aede ab008e5 1c528b5 de8f2f4 6914993 856fee6
6d25e43 50e3407 2b91021 71eac66 96938da 1915a79 a0a051f`. Files: `docs/dev-loop.md`,
`tools/{bust-triage,gate-live,harvest,reminder-migration-census,replay,verdict-ab}.mjs`,
`test/{bust-triage-controlled,census-byte-gate-sweep,census-extended-subclass,census-prune-classification,census-read-coverage,gate-live,harvest-scrub-relations,replay-gate-selfcheck}.test.mjs`,
`test/fixtures/harvested/flap-s-0d6f38ba-86.json`.

`/home/g/dev/vendor/cache-fix-pr12` on `pr/insertion-join-moves` (new),
`b713b2f` → `fbec02f`: `4b00ac6` (merge of `a0a051f`), `3cc44fe 8808bf7 50ba316
2ae96d7 dff93fc f9b0ae9 fbec02f`. Files beyond the merge:
`proxy/extensions/insertion-normalization.mjs`,
`test/{extended-absorb,insertion-join-move,insertion-suppression-on-reset}.test.mjs`,
`test/fixtures/harvested/reset-move-s-dc3f8071-196-197.json`.

Drafts: `pr-prep-body-join-moves.md`, `pr-prep-comment-276.md`,
`pr-prep-actions.md`, `pr-prep-report.md`, plus `pr-prep-fixture-image.png`
(the decoded screenshot, evidence for gap 1).

## (g) What was NOT verified

- `test/proxy-integration.test.mjs` and `test/proxy-wrapper.test.mjs` — excluded
  per the brief; they hang on the production port.
- No tool was *executed* against a live capture corpus. The census, gate-live and
  verdict-ab runs quoted in the drafted texts come from the fork's own report
  (`docs/code-reviews/reserved-entry-identity-report.md`), not from a run of
  mine. The corpus is not present in these worktrees.
- Whether the `_sanitization` claims hold for fixtures **other** than the two on
  these branches. The image-scrubber gap is generic, so other harvested fixtures
  carrying images are likely affected; I checked only these two.
- I did not read #273's PR body, so gap 4's "if #273 is the deferred-tool-rewrite
  PR" is an assumption from the branch name, not a checked fact.
- Whether GitHub will render the new branch's diff usefully given the merge
  commit — asserted in the drafted body from the #281 precedent the brief cited,
  not observed.

## (h) Sources actually read, of those the brief named

Read: fork-root `CLAUDE.md` (Public-Repo Information Hygiene; Release Safety
Rules; Non-Functional Requirements; PR/label policy) and `CLAUDE.local.md`
(fork-only file list, plain-`gh` identity rule, upstream-team apparatus does not
bind) — both via the session's project-instruction load. `gh pr view 272
--comments` and `gh pr view 276 --comments`, full threads, both in this session.
`git log` of both slice branches against `upstream/main`, and fork main since
`3afce21`. `docs/directives/reserved-entry-identity-directive.md` (all 244
lines). `docs/code-reviews/reserved-entry-identity-report.md` — the results
sections (verifier 5 table and attribution, lines 228–297) and a heading/grep
pass over the rest, not the full 545 lines.

Not read, though relevant: `AGENTS.md` (the reviewer-side anti-bloat lens),
`docs/dev-loop.md` (the fork's working discipline), `BACKLOG.md`.
