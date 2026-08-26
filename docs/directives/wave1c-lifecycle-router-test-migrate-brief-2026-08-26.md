# Wave 1c — the router, the test roster, and the migration: dispatch brief

Stages 7–9 of the wave-1 design, plus the items the judgment desk assigned
here. Written at the execution desk on its GO of 2026-08-26 ("W1c: GO on
e78e756").

**COMPLETE AT DISPATCH — no mid-flight correction is assumed.** W1a's and
W1b's reports both crossed this desk's directives on the wire, each accurate
when composed and stale when it landed. Anything you need is here or in the
files named here; something genuinely missing is a gap to REPORT, never to
bridge with a guess.

**Two earlier briefs remain in force** and are named in Grounding: the wave-1
brief (D-a … D-h) and the W1b brief. Where they and this file differ, THIS
file wins for stages 7–9 and the difference is worth reporting.

---

Title: opus: build `lane list`, `--test` and `migrate` (stages 7–9)
Working copies: TWO. `~/dev/Gunther-Schulz/lifecycle` at **`e78e756`**, and
cache-fix at **`48ab917`** or newer for a NARROW, ENUMERATED write set (below).
Base check both: `git -C <copy> rev-parse --short HEAD`. A lifecycle HEAD other
than `e78e756` → HALT and report; nobody else should be writing there. A newer
cache-fix HEAD is expected — report the changed-file list.
Scratch: your OWN scratchpad, never the dispatcher's, never `.claude/`-shaped.

## Grounding — read before building; the report cites what was read

- the executor skill (`dispatch-guards:executor`) — load FIRST
- cache-fix `docs/directives/wave1-lifecycle-plugin-brief-2026-08-26.md` —
  whole. **D-c's TWO exit-code contracts, D-e (the migration is a DRY RUN),
  D-f (unclassified is reported, never guessed), D-g, and D-h (the declaration's
  assigned content).** Note its **verifier item 6 was CORRECTED in place** —
  the durable form is `git check-ignore --no-index <path>`, exit 1 required,
  no `-v`. Read the correction; it explains why the first form was unprovable.
- cache-fix `docs/directives/wave1b-lifecycle-verbs-brief-2026-08-26.md` —
  whole, for the item/ledger contracts your stages consume.
- cache-fix `docs/directives/carrier-rework-design-2026-08-26.md` — **§3.3 and
  §3.4 IN FULL** (lanes, the trigger predicate's reserved exit codes, the
  router, trigger-policy), **§3.9** (the refusal table), **§4 row 1** (the
  migration's classification rules), **§3.1** and **§3.6** for what you migrate
  INTO. §3.9's header now records that **the plugin's refusals registry is the
  SOURCE and the table is its snapshot** — the table updates from the registry,
  never the reverse.
- the plugin's whole `plugin/cli/lifecycle_core/` tree and its `test/`, plus
  **`tools/prove-rows.py`** — you extend that instrument, you do not replace it.
- the plugin's `CLAUDE.md`, `LEDGER.md` and `BACKLOG.md` — W1a and W1b recorded
  known reds, parked items and open questions there. Read them so you do not
  re-derive what is already measured.
- cache-fix `BACKLOG.md`, the `## Record` entries dated 2026-08-26 — the
  foreign-path finding, the CI finding, and W1b's closing findings.
- cache-fix `docs/dev-loop.md`, "A checker has THREE answers, not two" and
  "Adding a check".
- cache-fix `BACKLOG.md` and `BACKLOG-DONE.md` **heads** — the carrier you
  migrate: `## Grades`, the `Closure-home:` declaration, the section structure.

## Established — how each line was established

- **Base `e78e756`** carries stages 1–6 plus this desk's re-sync of the leak
  scan. Verified at the artifact by this desk: python 21/21 OK, node bites
  62 tests / 61 pass / 1 fail / 0 skipped, `tools/prove-rows.py` exit 0 with
  every recorded arrangement holding, tree clean, no remote, no repo-local
  `core.hooksPath`.
- **The node bite that fails must KEEP failing** — "source: every UUID in a
  tracked SOURCE_SCANNABLE file is on the synthetic allowlist". Its
  anti-vacuity anchors are cache-fix's tree, hardcoded, and the file is a
  byte-identical copy. **A could-not-verify about the COPY, never about the
  scanner. Do not edit it, do not delete the bite, do not "fix" the roster.**
- **`prove-rows.py` discriminates** — probed by this desk, not assumed: with a
  real guard anchor neutered it returned exit 3, "COULD NOT VERIFY — the anchor
  appears 0 times … the source moved under this arrangement", naming the row.
  Not a false pass and not a false failure.
- **The version bump guard will fire on every plugin payload commit.** Keep
  bumping (0.1.x is a birth series; versions never go backwards). W1b left it
  at 0.1.5. **Never `--no-verify`** — it disables every lane in that hook
  rather than the one that fired.
- **A plugin `BACKLOG.md` entry needs a `Design` token** or the pre-commit's
  READY-envelope gate refuses the commit. Correct fire; write conforming
  entries.

## Scope — stages 7, 8, 9, and five assigned items

**Stage 7 — `lane list` (§3.3).** The router, generated over
`~/.config/lifecycle/repos` and each repo's declaration. **Print roster count
and per-repo resolution state LONGHAND** — an absent roster is BROKEN, a listed
repo that does not resolve is NAMED. A sparse table renders as silence and
silence reads as clean; that is the whole reason this is specified.

**The trigger predicate contract is NOT the CLI's** — D-c states both and they
collide on the value 2. A lane's `Trigger:` is a command `lane list` EXECUTES:
`0` fire, `1` quiet, `≥2` broken. `lane list` itself EXITS under the CLI
contract (0 clean / 2 a finding / 3 could-not-verify). A run that finds a
broken predicate exits 2 because it FOUND something, not because it saw a 2.
**Red-prove the broken path with a predicate that errors**, so a dead lane
never reads as a clean board.

**Assigned item A — wire `item ready`'s `evidence` blocker to this evaluator**
(W1b gap 5). W1b returns COULD NOT VERIFY there rather than building a second
evaluator behind one contract; stage 7 is where the one evaluator exists. Two
bodies behind one contract would disagree about the `≥2 broken` case first.

**Stage 8 — `--test`, the refusal roster, plus a coverage mechanism.**
`--test` is a thin printer over the registry (W1b's `refusals.py`), one bite
per row, **a row you cannot fire reported PROSE-REST with its reason, never
deleted** (D-g).

**Assigned item B — the emit-site coverage check (judgment desk decision).**
**Every site in the code that emits a FINDING exit maps to a registered row,
or `--test` FAILS** with "finding emitted with no registered row". Build it
code-side. **State its limit in its own output**: it cannot catch a refusal the
PROSE requires and the code lacks — that remainder is found only by an
end-to-end walk of §3.9, and saying so is part of the deliverable. An assurance
wider than its predicate is the defect this whole arc keeps finding.

**Assigned item C — mutations for the 12 unproven rows.** 12 of 28 registry
rows have NO recorded mutation in `prove-rows.py` — the stage 1–3 rows. They
pass their plant/control pair but were never shown to go dark when their named
condition is removed. Add their arrangements. **W1b's lesson applies: a
mutation that CRASHES proves the branch is reached, not that the row
discriminates** — fold a verdict into another verdict (one token) rather than
removing machinery, so the output is a wrong VERDICT, not a TypeError.

**Stage 9 — `migrate`, and it is a DRY RUN (D-e).** It produces `ITEMS.md`,
`ITEMS-DONE.md` and the classification report as NEW files. **`BACKLOG.md` and
`BACKLOG-DONE.md` are not deleted, not edited, not moved** — retiring the old
carrier is a separate act after a human reads the report, and the acceptance
criterion is a property of the report. Apply every §4 row-1 rule as written;
**every entry the rules do not cover is reported UNCLASSIFIED with its grade
word and line number** (D-f). Never guess a mapping — an unclassified entry is
a finding for this desk, not a defect for you to resolve.

**Assigned item D — cache-fix's own declaration, FIVE kinds.** D-h assigns the
content; the judgment desk has since raised the kind count from three to
**five: items, done bodies, ledger lines, JOURNAL entries, audits.** Read D-h
for every other value (prefix `cf`, `public: true`, laws `CLAUDE.local.md`,
closure home `ITEMS-DONE.md`, `trigger-policy: on-demand`, the five FORK-NOTES
goals, `ready-cap: 10` and the head rule, lanes and bindings EMPTY not absent).
Each of the five kinds carries **all six §3.0 stages** — a kind with an
undeclared stage is a checker finding. `LEDGER.md` and `JOURNAL.md` are both
created **header-only**, so a declaration never names a home that does not
exist.

**Assigned item E — the moot-blocker annotation** (W1b gap 6, desk decision).
`item close` over an item with an unresolved `decision` blocker stays
UNGUARDED — closing is the desk's act and a guard there fires on legitimate
work — but it now RECORDS the fact: `blocker-moot: <question>` on the moved
body, and a `decision: <question> → moot (closed by <ref>)` ledger line.

## Verifier (real output pasted; the arrangement is part of the evidence)

1. **Baseline first, stated:** both suites and `prove-rows.py` at `e78e756`
   before anything changes, full counts, the known node red named as expected.
2. **Every new row RED first, then green**, one named condition disabled at the
   single place a finding is recorded, restored **BY FILE COPY** (never
   `git checkout`/`restore`/`stash`), `__pycache__` cleared around every arm,
   and the PAIR asserted: the named row's verdict changes AND no other row's
   does. Prefer adding the arrangement to `prove-rows.py` over proving by hand
   — a red-first proof that lives only in a transcript is correct once and gone.
3. **`prove-rows.py` covers 28 of 28** when you are done, or the remainder is
   LISTED in its own output with the reason, never omitted.
4. **The broken-trigger path**, red-proven with a predicate that errors.
5. **`lifecycle --test`** — full output, full counts including skips, every
   skip dispositioned, every PROSE-REST row labelled with its reason.
6. **The declaration is VISIBLE TO GIT**: `git -C <cache-fix> check-ignore
   --no-index .claude/lifecycle.json` → **exit 1**. Paste it with the negation
   absent (exit 0) and present (exit 1). **Do not use `-v`** and do not read
   the exit code of a bare `check-ignore` on a tracked path — the wave-1 brief
   records why that form could never fail.
7. **`kind check` over cache-fix's real declaration WILL EXIT 2** on
   `laws_over_cap`: `CLAUDE.local.md` is 243 lines against the declared cap of
   60. **That is the checker working.** The decomposition is wave 2's. Report
   it as the expected red it is — it is not a stage-9 bug and stage 9's
   acceptance does not depend on it.
8. **`migrate` over cache-fix's real carrier**: paste the reconciliation —
   entries in, entries out per class, UNCLASSIFIED count with each entry's
   grade word and line number, and the ledger count which **must be zero**.
   Then the §3.1 conservation identity computed on the produced files.
9. **The old carrier is byte-identical afterwards**: `git -C <cache-fix> status
   --porcelain BACKLOG.md BACKLOG-DONE.md` prints NOTHING.

## Write boundaries

- **`~/dev/Gunther-Schulz/lifecycle`** — yours. **Never push, never create a
  remote.**
- **cache-fix — a NARROW, ENUMERATED write set, all from stage 9:**
  - **six NEW files**: `ITEMS.md`, `ITEMS-DONE.md`,
    `docs/audits/migration-report-2026-08-26.md`, `.claude/lifecycle.json`,
    `LEDGER.md` (header-only), `JOURNAL.md` (header-only).
  - **one EXISTING file, one added line**: `.gitignore` gains
    `!.claude/lifecycle.json` and nothing else. **This is the only edit to an
    existing cache-fix file in the whole of wave 1.**
  - `.claude/lifecycle.json` needs its `.gitignore` negation in the SAME
    commit, or `git add -N` against an ignored path is silently a no-op.
  - Nothing else in that repo. **Nothing is deleted.**
- **The operator's dotfiles repo — READ ONLY.**
- **Do not edit** `tools/absence-scan.mjs` or `test/absence-scan.test.mjs` in
  the plugin — byte-identical copies, known red documented.
- cache-fix is a SHARED, PUBLIC copy with live co-writers. Never assume a clean
  tree; `test/fixtures/harvested/` carries a scheduled timer's output and is
  **never staged**. No foreign home path, session id, capture id or transcript
  text in anything you write there — **the migration report describes entries;
  it does not quote operator prose.**
- Commit by pathspec, flags before the separator; `git add -N <file>` for new
  files, naming the FILE never a directory. Never `git add` then commit, never
  `-A`, **never amend**.
- Trailer: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## Commit plan

- Guards read at compose time: the machine's global pre-commit runs in both
  repos (`core.hooksPath` → dotfiles `git/hooks/`, inherited, verified not
  repo-local). Firing lanes: the **plugin version bump** (expected — keep
  bumping) and the **READY-envelope** gate on plugin BACKLOG entries. cache-fix
  runs its full suite on PUSH, not commit — **and you do not push.**
- **Commit per VERIFIER-PASSING STATE, not per stage** (judgment desk): D-d's
  stage order is a VERIFICATION order, not a commit order — W1b established
  that stage 4 depends on 5 and 6. Group stages 7–9 however yields commits that
  each pass their own verifier, and say in the report how you grouped and why.
- Stage 9's cache-fix commit is separate from every lifecycle commit — two
  repos, never one commit.

## Report

Closing report per dispatch skill §2, slots (a)–(h). **Label parts by CONTENT,
not a fixed N** — "part: gaps", "part: deviations". The payload gate splits
messages, so the count may grow; stable labels keep a part re-requestable.

**State token on every message:** your lifecycle HEAD and the cache-fix HEAD
you read.

Blockers immediately, mid-flight. Everything else batches into the report.
