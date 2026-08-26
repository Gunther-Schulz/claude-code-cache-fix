# Wave 2 — L1: the source-scope foreign-path class, its allowlist, and the declaration wiring

Title: opus: widen the foreign-path class to source scope, wire it to the
declaration, land cache-fix's flip in the same change, re-sync lifecycle
Working copies: **WORKTREES, not the shared checkouts** — one of this repo
(base `ea27735`, this brief's own commit) and one of the `lifecycle` plugin
repo (base `4d4546c`), both under the operator's `~/dev` tree; resolve the
repos from your own environment, never from a literal path written here.
Writing an absolute `/home/<user>/…` path into this public tree is the exact
defect this item exists to catch, and this brief is held to it: no such path
appears below, which is also your worked example of a compliant `.md`.

**WHY WORKTREES ARE MANDATORY HERE, not a preference.**
`tools/absence-scan.mjs` is live-on-write and the pre-push hook locates the
scanner in the PUSHING repo. So the instant you widen the class with 25 files
unallowlisted, every push from that checkout blocks — the judgment desk's,
the operator's, this desk's, and your own A–C–D commit with them. Blocking is
the intended state for YOUR tree and is not acceptable for the production
checkout, which serves live traffic. In a worktree the hook reads that
worktree's scanner and blocks only that worktree's pushes, which are denied
by construction anyway.

**The dispatcher provisions both worktrees and denies push on every remote in
each** — this repo has an `upstream` remote pointing at the fork's source and
a push there is an outward act under any circumstances, so the denial is not
left to be re-derived per lane. Their paths arrive in your dispatch message.
You do not create, move, or remove a worktree; if one is missing or its push
denial does not hold when you check it, that is a STOP, not something to
provision yourself.

Your first act in the cache-fix worktree, before any test run: symlink
`node_modules` from the main checkout, or every proxy suite dies
`ERR_MODULE_NOT_FOUND` and two tests appear to hang for ~900s
(`CLAUDE.local.md`, read at brief time — both 2026-08-02 "hangs" were
exactly this).

Base check, in each worktree, before anything: `git merge-base --is-ancestor <base> HEAD`
AND `git log --oneline <base>..HEAD`. Base contained + nothing on top → start.
Base not contained → fast-forward to it if the tree is clean, else HALT.
Base contained WITH commits on top → HALT and report those commits as a gap.
Scratch: your OWN scratchpad.

Tier: opus. This is a guard/checker build (readiness register class
`guard-checker-bau`, target tier opus, status `eval-open`), and the
judgment that cannot be briefed away is which of 25 files are the
operator's call — see "The one judgment you do NOT make".

## Grounding basis — read before building; the report cites what was read

- the executor skill (`dispatch-guards:executor`) — load FIRST.
- `tools/absence-scan.mjs` (cache-fix, 1217 lines) — the whole file. In
  particular: the scope model (`CORPUS_SCOPE`, `inCorpus`, `scopeKey`,
  lines 206-220), the foreign-path class and its reasoning comment
  (388-468), the `ALLOWLIST` and its accessors (81-186), and the three
  scan entries `scanContent` (617), `scanFile` (653), `scanSourceText` (744).
- `.claude/lifecycle.json` in BOTH repos — the `leak-scan` object and its
  `reason` string in each. They are the specification of this item's two
  halves and they disagree with each other on purpose.
- design `docs/directives/carrier-rework-design-2026-08-26.md` §3.3, the
  leak-direction paragraph (lines 300-313) — the ONLY normative source for
  what this class must become. Read §5's precedence paragraph first (head of
  §5, `adf7e66`): §5's own wording is not normative and is not quoted here.
- `CLAUDE.local.md` — "The publication bar", which is what the class exists
  to enforce, and which binds every byte you write into this repo.
- dotfiles `git/hooks/pre-push` (read-only; it is the harness that runs your
  work) — how the scanner is located and how a finding blocks a push.

## Established, and how each line was established

Every line here was OPENED by the dispatching desk at brief-writing time.
Nothing in this section is inherited from a prior document; where a prior
document said otherwise, that is recorded as a correction.

1. **The foreign-path class exists and is scoped `corpus`.**
   `tools/absence-scan.mjs:526`, `scope: "corpus"`. Established by reading
   the class object and by evaluating `CLASSES.find(c=>c.name==="foreign-path").scope`
   → `"corpus"`.
2. **Source and markdown files never reach the class table.** `scopeKey()`
   (`:215-220`) returns `"source"` for a `SOURCE_SCANNABLE` non-`SCANNABLE`
   path, and that route runs `scanSourceText`, which applies the short-key
   and full-UUID classes only. The class's own comment states this at
   `:405-408`. So the class is structurally blind to `.md`/`.mjs` today.
3. **NEITHER repo's scanner reads its declaration. The `leak-scan` key is
   decorative in both.** Established by grep over `tools/absence-scan.mjs`
   for `lifecycle.json` / `leak-scan` / `source-scope`: zero hits, against a
   positive control that the file does read configuration elsewhere (5
   `process.env` references). **This is a correction to how lc-9 is framed.**
   lc-9 reads "the plugin declares a class its scanner cannot honour"; the
   truth is stronger and symmetric — cache-fix's `false` is equally unread,
   so the corpus-only behaviour is hardcoded rather than declared. The file
   already records one instance of exactly this disconnect at `:235`
   ("never read it, so the declaration and the guard were disconnected").
   **Building the declaration wiring is therefore part of this item, not a
   precondition someone else meets.**
4. **The two copies are byte-identical today.** `cmp -s` between
   cache-fix `tools/absence-scan.mjs` and lifecycle `tools/absence-scan.mjs`
   → identical. §3.3 requires "both copies moving together"; they do now, and
   your change must leave them that way.
5. **The population that would go red under a source-scope widening is 27
   tracked files, not the 31 named in `CLAUDE.local.md` and in the wave-2
   handoff.** Measured with the class's OWN `violates` predicate (which
   applies `exemptRoots()`, so repo-root and XDG-root paths are already
   excluded), over `git ls-files`. The raw `HOME_PATH` regex before
   exemptions matches 34; the exemption logic removes 7. Both prior
   documents say 31; neither is right. The 27 are listed in §"The
   allowlist population" below. Treat 27 as measured-at-`adf7e66`, re-measure
   at your base, and REPORT any difference rather than reconciling it.
6. **The class currently fires on ZERO files.** Same measurement, corpus
   scope: 0 tracked files under `test/fixtures/harvested/` carry a
   non-exempt home-shaped path. The one `json`-scope hit is
   `test/fixtures/cc-transcript-shape-snapshot.json`, whose synthetic
   placeholder cwd the class comment already names at `:404` (the literal
   is not reproduced here — see the note below on why). So the
   shipped class has never had a live positive; its value today is
   preventive only. This is context for your red-first proof, not a defect
   to fix.
7. **The pre-push hook blocks on findings.** dotfiles `git/hooks/pre-push`
   locates `tools/absence-scan.mjs` in the pushing repo (`:168-169`) and
   blocks the push on a non-clean summary line (`:300`, `:1349`).

## THE BOOTSTRAP PROBLEM — read this before designing anything

**The widened guard denies its own source.** Both `tools/absence-scan.mjs`
(the file you are changing) and `test/absence-scan.test.mjs` are in the 27.
So the commit that widens the class cannot pass its own pre-push hook unless
the allowlist entry covering them is in the SAME commit. This is not a
per-file judgment call; it is a structural necessity of landing the change at
all, and it is why the allowlist mechanism and the widening are one commit
rather than two.

Neither the design nor the declaration's reason string names this. It was
found by measurement at brief time. If your own measurement contradicts it,
that is a finding — report it, do not route around it.

**And a second instance of the same shape, found while writing this brief.**
The first draft of this file tripped the widened class — not on a real path,
but on a SYNTHETIC placeholder quoted from the scanner's own class comment
while explaining the class. The predicate cannot distinguish an illustrative
path from a live one, and it should not try: that is a judgment, and the
mechanism for it is the allowlist, not a cleverer regex. Two consequences you
must carry: (i) prose that DOCUMENTS this class is itself a false-fire
source, so the documentation of a guard and the guard's own reach are
coupled — the dotfiles convention of running a textual guard against its own
docstring applies here and is free; (ii) do not "fix" a false fire by
narrowing `HOME_PATH`. This brief now contains no home-shaped literal, which
is your worked example that compliant prose about this class is writable.

## The settled design — implement exactly this, do not redesign

Scope derived clause-by-clause from §3.3's leak-direction paragraph (lines
300-313). **The paragraph carries SEVEN clauses. Five are this item's; two
belong to the template-extraction item.** The count and the split are stated
so a dropped clause is visible — an earlier draft of this brief said "five
obligations" and had silently dropped the plugin-repo red-proof, which is
the partial-read defect this repo already recorded twice against wave-1
briefs, reproduced here by its own author. The seven:

- (i) the plugin repo carries the leak scan as a pre-push hook from its first
  commit → verify it is armed; **L1**, verifier 9.
- (ii) the two copies are byte-identical and move together → **L1**, step E.
- (iii) the source-scope foreign-path class is enabled per repo BY
  DECLARATION → **L1**, steps A and B.
- (iv) the plugin declares it on with no exceptions; this repo declares it
  off-with-reason or on-with-allowlist → **L1**, steps C and D.
- (v) red-proven on a planted foreign path in a `.md` in the PLUGIN repo
  before any template lands → **L1**, verifier 10.
- (vi) every template extraction is a reviewed PR carrying the hygiene grep
  output → NOT L1; the template-extraction item.
- (vii) no template is extracted until that hook exists → NOT L1; it is the
  constraint that makes L1 the head of the critical path.

**Step F below is NOT one of the seven.** It is an added scope item from the
judgment desk's ruling of 2026-08-26, on a defect found while provisioning
this item's worktree. It is named separately rather than folded into the
clause list so the derivation above stays honest about what came from the
design and what did not.

**A. A `source` scope for the foreign-path class.** Add scope handling so a
class may declare `scope: "source"` and be applied on the `source` route.
Do NOT change the class's predicate (`hasForeignPath`, `isExemptPath`,
`HOME_PATH`) — the defect is reach, not logic. Do NOT change what the
`corpus` and `json` routes already do: their behaviour must be
byte-identical after your change, and you assert that.

**B. The declaration wiring.** The scanner reads its repo's
`.claude/lifecycle.json` → `leak-scan["source-scope-foreign-path"]`
(boolean) and enables the source-scope application only when true. An absent
declaration, an absent `leak-scan` object, or an unreadable file is
**COULD-NOT-VERIFY, reported as such, and the source scope stays OFF** — never
a silent default in either direction. The declaration path is resolved from
the scanned repo's root, never hardcoded (the class's own boundary rule,
`:413-417`).

**C. An allowlist for the source scope**, expressed in the EXISTING
`ALLOWLIST` mechanism (`:81-186`) with its existing `{pattern, classes}`
entry shape and its existing class-scoped semantics — a new parallel
mechanism is out of scope. Each entry carries a reason string that survives
being read carefully, per the file's own standing rule at `:60`.

**D. The cache-fix declaration flip, in the SAME commit** as A-C: set
`leak-scan["source-scope-foreign-path"]` to `true` and replace the `reason`
string. The current reason names this exit explicitly ("it flips to
ON-with-allowlist in THE SAME CHANGE that lands the scrub, never before and
never as a separate tidy-up"), so the flip is the declaration's own
instruction, not a new decision. Replace the reason IN PLACE; do not append
a correction beneath the old text.

**E. The byte-identical re-sync into lifecycle**, as a separate commit in
that repo, after A-D are green in cache-fix. `cmp -s` between the two files
must exit 0, and you paste that. lifecycle's declaration already says `true`
and needs no edit — verify that and say so.

**F. Fix `exemptRoots()` to resolve the repo root from the COMMON dir, not
the worktree toplevel** (judgment desk ruling, 2026-08-26). Today
`exemptRoots()` (`:424-441`) takes `git rev-parse --show-toplevel`, which in
a worktree answers the WORKTREE — so every file naming the repo's own path
becomes "foreign" the moment it is read from a worktree. Measured at
`c42bef2`: **27 files fail in the main checkout, 34 in a worktree of the same
commit.** The 7 extra are false positives by the class's own definition
(`:388-394`: the class is about ANOTHER PROJECT's path, and a worktree of
this repo is this repo). It has been latent only because the corpus scope
fires on nothing; widening it without this fix would put a guard that fires
on legitimate work onto the push boundary of all 26 of this repo's
registered worktrees — law 11, and precisely what the declaration's own
reason string says it is avoiding.

Replace the root derivation with the parent of
`git rev-parse --path-format=absolute --git-common-dir`. Keep the existing
try/catch (not inside a checkout → null, nothing exempted by it).

**THE FLAG ORDER IS LOAD-BEARING AND IS NOT A STYLE CHOICE.** Measured here
on git 2.55.0: `--path-format=absolute` placed BEFORE `--git-common-dir`
returns an absolute path; placed AFTER, or omitted, it returns a RELATIVE
one — `.git` from the main checkout root, `../../.git` from a subdirectory.
`dirname(".git")` is `"."`, which would silently make the exempt root the
process's cwd and break the class in both directions with no error. Note the
trap is INVISIBLE from inside a worktree, where both orders answer absolute:
the dispatching desk's first probe ran there and returned a false negative
about this very rule before being re-run from the main checkout. So assert
the resolved value is absolute, and do it from the main checkout — a check
written only from a worktree cannot fail.

Order is fixed and is not yours to optimise: A-C-D-F in one cache-fix commit
(B may be its own commit if it is separable without leaving the tree red),
then E. F rides with the widening because shipping the widening without it
ships a guard that fires on legitimate work.

## The allowlist population

The 27 files that fail the class's own predicate under a source-scope
widening, measured at `adf7e66`:

    BACKLOG-DONE.md · BACKLOG.md · ITEMS-DONE.md
    docs/audits/pr-prep-2026-07-31/pr-prep-actions.md
    docs/audits/pr-prep-2026-07-31/pr-prep-report.md
    docs/code-reviews/absence-guard-report.md
    docs/code-reviews/pr-320-round-1-codex.md
    docs/directives/carrier-rework-handoff-2026-08-26.md
    docs/preload-setup.md
    docs/release-tests/pr-220-image-retry-circuit-breaker-container-smoke-2026-06-11.md
    docs/release-tests/v3.7.1-docker-smoke-2026-05-27.md
    proxy/forward-proxy.mjs
    test/absence-scan.test.mjs · test/alias-claim.test.mjs
    test/backlog-lint.test.mjs · test/bust-triage-list-identity.test.mjs
    test/bust-triage-session-select.test.mjs · test/capture-hardening.test.mjs
    test/findDeferredToolsBlockInBody.test.mjs
    test/gate-live-census-rows.test.mjs
    test/insertion-suppression-copy-present.test.mjs
    test/install-service.test.mjs
    test/proxy-deferred-tools-restore.test.mjs · test/xdg-dirs.test.mjs
    tools/absence-scan.mjs · tools/backlog-lint.mjs · tools/xdg-migrate.mjs

**You allowlist exactly TWO of them: `tools/absence-scan.mjs` and
`test/absence-scan.test.mjs`** — the bootstrap pair, on the stated ground
that a guard which denies its own source cannot land. Nothing else.

## The one judgment you do NOT make

**The per-file verdict on the remaining 25 is the operator's, and you do not
take it.** Your deliverable for those is a CLASSIFICATION, written to the
data file assigned below — one row per file: path · how many distinct
home-shaped tokens · for each token, whether its owner is THIS repo
(operating prose about its own checkout) or ANOTHER project. Owner tokens
only. You do not propose keep/scrub, you do not allowlist them, and you do
not edit them.

Consequence you must design for and state plainly in your report: with 25
files unallowlisted and the class enabled, **the pre-push hook blocks every
push from the tree carrying your change** until those 25 are dispositioned.
Inside your worktree that is the intended state and harmless (its pushes are
denied anyway). It is NOT acceptable on the production checkout, which is why
the integration sequence below exists and why A–C–D is never cherry-picked
onto `main` alone.

Data file (assigned, do not choose your own name):
`docs/audits/foreign-path-classification-2026-08-26.tsv`

## The integration sequence — the dispatcher's, written here so nobody meets it at push time

1. You deliver A–E plus the classification TSV, **commits unpushed in your
   worktrees**, and report. Your part ends here.
2. The TSV goes to the operator. Their per-file verdict on the 25 is their
   standing disposition, and it becomes the GATE on this item's push — this
   lane is what converts that item from a backlog entry into a blocker.
3. Their verdicts land as ONE follow-up commit in the same worktree:
   allowlist entries with reason strings for the keeps, scrubs for anything
   genuinely foreign.
4. The dispatcher cherry-picks A–C–D **together with (3)** onto `main` and
   pushes once. At push time the declaration and the tree agree, which is
   what D's "same change" requirement is for. **A–C–D is never pushed
   alone**, and the worktrees are removed only after the report is booked and
   any follow-up questions asked — removal closes your channel permanently.

## Verifier (in order; real output pasted in the report)

1. **Baseline first, before any change.** `npm test` in cache-fix, full
   counts including skips. A red-first proof over an already-red baseline
   proves nothing.
2. **RED, at the guard's real altitude.** Plant a foreign home path in a
   `.md` file in a scratch copy, run the OLD scanner over it, and show it
   reports clean — that is the defect. Then the NEW scanner over the same
   payload, reporting the finding. Run the SCANNER as the hook invokes it,
   not just its inner predicate.
3. **The discriminating pair.** The probed result must equal the outcome the
   probe names AND differ from the unprobed one. A payload that would be
   caught by `capture-uuid` or `capture-key-prefix` anyway cannot
   discriminate — pick a payload whose ONLY violation is the foreign path,
   and say why it discriminates.
4. **The must-NOT-move rows.** Assert the `corpus` and `json` routes are
   unchanged: same findings, same counts, before and after. A change that
   merely denies more scores identically to one that got the distinction
   right, without this.
5. **Declaration wiring, three arms:** declaration true → source scope
   applies; declaration false → it does not; declaration absent/unreadable →
   COULD-NOT-VERIFY reported, scope OFF. The third arm is the one that
   usually goes unbuilt.
6. **The bootstrap assertion:** with the allowlist in place, the scanner run
   over this repo's own tree does not report `tools/absence-scan.mjs` or
   `test/absence-scan.test.mjs`. And the negative control: with the allowlist
   entry removed, it DOES. Show both.
7. `npm test` green in cache-fix; `cmp -s` exit 0 between the two copies;
   lifecycle's own suite green after E.
8. Skips dispositioned individually. A skip in a check you built is a
   finding, not a pass.
9. **The plugin repo's live arm.** After E, run the scanner AS THE HOOK
   INVOKES IT over lifecycle's own tree, with that repo's declaration true
   (it already is — verify, do not set it). Any finding there beyond the
   bootstrap pair is **REPORTED, never allowlisted**: §3.3 gives the plugin
   repo "no exceptions", so a hit is a plugin-repo scrub finding and a STOP
   signal, not something you resolve. Paste the full output including a
   clean result.
10. **The design's own red-first, in the plugin repo.** Plant a foreign home
    path in a `.md` in the lifecycle worktree; OLD scanner clean → NEW
    scanner red. §3.3 requires this class "red-proven on a planted foreign
    path in a `.md` in the plugin repo before any template lands", and that
    proof is the gate the template-extraction item waits on — its output is
    the artifact that item's brief will cite, so paste it verbatim and in
    full. Remove the plant by restoring a copy taken BEFORE the injection,
    never with `git checkout --`/`restore`/`stash`, then confirm `git status`
    clean AND delete any `__pycache__`/module caches the run created.
11. **F's red-first, in a worktree.** The 7 files that name this repo's own
    root: RED under the old `exemptRoots()` read from a worktree, GREEN under
    the new one, same worktree, same commit. Name the 7 and paste both runs.
    27 vs 34 is the arithmetic this arm must reproduce.
12. **F's must-NOT-move row, in the MAIN checkout.** 27 before and 27 after,
    and the finding SETS byte-equal — not merely the counts, since two
    different 27s would pass a count check. This is the arm that proves F
    changed worktree behaviour only. Run it in the main checkout: the
    reference values in this brief were measured there.
13. **F under the hook environment.** Git exports `GIT_DIR` into every hook,
    absolute for worktree operations, and child processes inherit it — so the
    environment the guard ACTUALLY runs in is not a plain shell. Show the
    scanner's resolved exempt root under a `GIT_DIR`-redirected environment
    equals the value from a plain shell, both pasted. If they differ, that is
    a finding and a STOP: the guard would then be exempting one set of paths
    when a human runs it and another when the hook does.

## Write boundaries

- **cache-fix, owned:** `tools/absence-scan.mjs`, `test/absence-scan.test.mjs`,
  `.claude/lifecycle.json`, and the assigned data file
  `docs/audits/foreign-path-classification-2026-08-26.tsv` (new — needs
  `git add -N <path>` before the pathspec commit will see it; name the FILE,
  never a directory).
- **lifecycle, owned:** `tools/absence-scan.mjs` only.
- **Everything else in both repos: READ ONLY.** Explicitly: you do not edit
  any of the 25 classified files, you do not touch `CLAUDE.local.md` (it is
  deployed from dotfiles and edited there), and you do not touch dotfiles at
  all — including `git/hooks/pre-push`, which you read as harness.
- **You work in YOUR WORKTREES ONLY. The shared checkouts are off limits for
  writing** — both have live co-writers (the judgment desk and the operator
  write cache-fix). Commit by pathspec — `git commit -F <msgfile> -- <paths>`,
  every flag before the `--`. Never `git add` then commit. Never `-A`. Never
  `--amend`. Never `--no-verify`.
- **Commits UNPUSHED, and pushes are denied in your worktrees by
  construction.** The dispatcher integrates by cherry-pick per the sequence
  above. This matters more than usual here: your change alters the push gate
  itself.
- **Live on write:** `tools/absence-scan.mjs` is executed by the pre-push
  hook from the working tree, so it is live the moment you save it — before
  any commit. This is the whole reason for the worktree: in the shared
  checkout a broken or mid-edit state blocks every session's push. Inside
  your worktree it is contained, but still compose whole-file edits rather
  than sequences that leave the file non-parsing.
- Trailer: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **The publication bar binds every byte you write here** (`CLAUDE.local.md`):
  no other-session content, no verbatim operator quotes in tracked prose OR
  commit messages, no foreign home paths, no session or capture ids. Your
  classification data file is the sharp edge of this — it is ABOUT home-shaped
  paths. Record owner classification and token COUNTS; do not reproduce a
  foreign path verbatim in it.

## Commit plan

Commit-blocking guards in cache-fix, each named with the read that found it:

- **Global hook dispatcher**, `git config core.hooksPath` → the dotfiles
  repo's `git/hooks` directory (read at brief time with that command; not
  repo-local — resolve it yourself rather than trusting this line). Its
  pre-push runs the fixture leak scan, then chains the
  repo's own `.git/hooks/pre-push` → tracked `tools/git-hooks/pre-push`,
  which runs the full suite (`CLAUDE.local.md`, "Self-tests", read).
- **Pre-commit**: same dispatcher directory. Read the directory before you
  rely on this line; if a lane fires on your paths, that is a finding to
  report, never a `--no-verify`.
- **No payload-version bump applies** to this item — it touches no plugin
  manifest. Established by the write-set: no `plugin.json`,
  no `.claude-plugin/`.
- Sequencing: A-C-D land together because of the bootstrap problem above;
  E is a separate commit in the other repo.

## Pre-authorized repair class

If the commit plan collides with a repo guard, reorder to satisfy the guard
and report the permutation as a deviation. Novel deviations still halt.

## STOP signals — halt the item, finish the independent remainder, return the question with its evidence

- Your measurement of the 27 differs from this brief's and you cannot
  account for the difference.
- The two copies are NOT byte-identical at your base.
- A design decision would be needed that this brief does not make —
  especially any per-file verdict on the 25.
- The widening cannot be made to leave `corpus`/`json` behaviour identical.
- **Verifier 9 reports any finding in the plugin repo beyond the bootstrap
  pair.** The plugin declares the class on with no exceptions, so you have no
  allowlist to reach for there: report it and stop.
- You cannot create a worktree, or cannot deny push on every remote in one.
  Do not fall back to working in the shared checkout.

---

Closing report (mandatory; the project's own report form if it
defines one, else the §2 form here — never both; "none" is a
valid slot answer, silence is not): (a) items completed w/
evidence, (b) checks RUN w/ real output — FULL counts incl.
skips (`N passed, M failed, K skipped`), each skip dispositioned
(which check, why, whether the reason touches the item); a skip
in a check YOU built is a finding, not a pass — the built branch
did not execute, (c) gaps surfaced —
incl. anything needing a tier above yours, returned as a question
with its evidence, never settled at your tier,
(d) deviations w/ reason, (e) candidate lessons, (f) files
touched + commit hashes (unpushed) — only commits whose
Co-Authored-By trailer is YOURS; one you cannot claim by
trailer is "present in the tree, not mine"; a `.git/config`
write counts as a repo write, (g) what was NOT verified,
(h) sources actually read, of those the brief named.
Drain your inbox before sending, and between parts of a
multi-part report: every dispatcher message received up to send
time is dispositioned or named as unhandled.
Report via SendMessage to `main`.
Message ≤3000 chars each: a report longer than one message is
SPLIT into labeled parts (1/N) — do NOT write a report FILE
(harness-blocked for subagents); supporting data goes to the
brief's assigned DATA files, the message carries key findings
+ any such paths. A missing decision, file,
or value is surfaced as a gap, never bridged with a guess.
A check that got backgrounded is AWAITED before the closing
report (TaskOutput block=true on its task id) — ending your
turn orphans it; a report sent with a check still running is
an INTERIM report, says so, and names what remains.
Commits unpushed, by pathspec — `git commit -m "…" -- <paths>`
with every flag BEFORE the `--` (after it git reads `-m` as a
pathspec and the commit fails; `-F` for a multi-line message),
never
`git add` then `git commit` and never `-A`: the index is shared,
so a co-writer staging between your `git status` and your commit
rides out under your message whatever you added. A NEW file is
invisible to a pathspec commit until `git add -N <path>`
registers it (intent-to-add: zero content staged, full body
still committed). Trailer:
`Co-Authored-By: Claude <model> <noreply@anthropic.com>`.
Never amend — always a new commit: the amend-gate denies
subagent amends regardless of ownership (source: §1 amend
rule).
After sending the report your write grant is over: a defect you
find later is REPORTED, never edited or amended (source: §4
ownership rule).
