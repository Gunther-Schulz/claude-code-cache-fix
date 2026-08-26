# Wave 1b — the `lifecycle` item and ledger verbs: dispatch brief

Stages 4–6 of the wave-1 design. Written at the execution desk on the judgment
desk's GO of 2026-08-26 ("W1b: GO on fa45623").

**This brief is COMPLETE AT DISPATCH and assumes no mid-flight correction.**
Not a style preference: W1a's closing report and this desk's two directives
crossed on the wire — each was accurate when composed and stale when it
landed. Crossings are inherent to the channel, so a correction sent while you
work may arrive after the work it was meant to change. Anything you need is
here or in the files named here; if something is genuinely missing, that is a
gap to REPORT, never to bridge with a guess.

**The wave-1 brief remains in force** —
`docs/directives/wave1-lifecycle-plugin-brief-2026-08-26.md`, decisions D-a
through D-h. This file adds stage-specific scope and the corrections W1a
earned. Where the two differ, THIS file wins for stages 4–6 and the difference
is a defect in one of them worth reporting.

---

Title: opus: build the `lifecycle` item and ledger verbs (stages 4–6)
Working copy: `~/dev/Gunther-Schulz/lifecycle`, branch `main`, base `fa45623`.
Base check: `git -C ~/dev/Gunther-Schulz/lifecycle rev-parse --short HEAD`.
**Anything other than `fa45623` → HALT and report** — nobody else should have
written there, so a different HEAD is a real finding rather than drift.
Scratch: your OWN scratchpad, never the dispatcher's, never `.claude/`-shaped.

## Grounding — read before building; the report cites what was read

- the executor skill (`dispatch-guards:executor`) — load FIRST
- **`docs/directives/wave1-lifecycle-plugin-brief-2026-08-26.md`** in cache-fix
  — the wave-1 brief whole. D-c (verbs and BOTH exit-code contracts), D-d
  (stage order), D-g (`--test` rows are never deleted), D-h (the declaration's
  assigned content).
- **`docs/directives/carrier-rework-design-2026-08-26.md`** in cache-fix —
  **§3.1 in full** (item slots, the five grades, storage, the closure MOVE,
  the conservation identity, the archive section, concurrency, origin and
  publication), **§3.2 in full** (intake is a merge), **§3.6** (the ledger),
  and **§3.9** (the refusal table — your acceptance test AND your row roster,
  one source for both).
- **The plugin repo's own stage-1..3 code**, which you are extending rather
  than replacing: `plugin/cli/lifecycle_core/{declaration,items,refusals,
  exits,firelog,cli}.py`, and `test/test_refusals.py`, `test/test_items.py`,
  `test/test_lock.py`.
- The plugin's `CLAUDE.md`, `LEDGER.md` and `BACKLOG.md` — W1a recorded the
  known reds and open questions there; read them so you do not re-derive them.
- cache-fix `docs/dev-loop.md`, "A checker has THREE answers, not two" and
  "Adding a check" — both bind every check you write.
- **`tools/backlog-census.py` in the operator's dotfiles repo, the
  `closure_visibility` function.** W1a did NOT open this and flagged the
  omission: it took the three-answer census shape from the design's
  description instead. **You open it.** If the tool's actual OUTPUT shape
  differs from the design's description of it, that difference is a finding to
  report, not a thing to reconcile silently.

## Established, and how each line was established

Each line below was opened by this desk at brief time unless marked otherwise.

- **Base `fa45623` carries stages 1–3**: the repo skeleton and manifests, the
  leak scan copied byte-identical and armed as a pre-push hook, the kind
  registry (`lifecycle kind list|check|show`), and the `ITEMS.md` shape with
  its parser, flock-based carrier lock and `lifecycle item check`. Verified by
  this desk at the artifact, not read off the report: python suite 14 run /
  0 failures / 0 errors / 0 skipped, node bites 51 / 50 pass / 1 fail /
  0 skipped, three commits each carrying its own trailer, tree clean, no
  remote, `core.hooksPath` NOT set repo-locally.
- **The leak gate genuinely blocks a push.** Exercised by this desk end to end
  in a throwaway clone with a `file://` remote: clean tree → push exit 0;
  a planted capture token → push exit 1, `FINDING capture-key-prefix`. One
  limit, stated because it bounds the claim: the machine's global dispatcher
  scan is what blocked, so the repo's own chained hook did not get its turn in
  that arm. A leak is provably stopped; which layer stops it is not separated.
- **ONE NODE BITE FAILS AND MUST KEEP FAILING** — "source: every UUID in a
  tracked SOURCE_SCANNABLE file is on the synthetic allowlist". Its
  anti-vacuity guards assert the walk reached `proxy/`, `docs/`, that
  `BACKLOG.md` is present and that it enumerated >500 files. Those are
  cache-fix's tree, hardcoded, and the file is byte-identical by instruction.
  **This is a could-not-verify about the COPY, never a statement about the
  scanner. Do not edit that file, do not delete the bite, do not "fix" the
  roster to 51/51.** Parameterising those anchors is booked in cache-fix as a
  separate item and is explicitly NOT this dispatch's (judgment desk).
- **The plugin version will move again and that is expected.** The machine's
  global pre-commit blocks a plugin payload change without a version bump. Its
  premise — an installed copy that could go stale — is false for a
  never-released plugin, so it over-fires here; the judgment desk's decision
  is **keep bumping** (0.1.x is a birth series, versions never go backwards)
  and the guard's false premise is booked as a dotfiles item. **Never
  `--no-verify`**: it disables every lane in that hook rather than the one
  that fired, which is how a guard trains the override reflex that kills it.
  W1a hit this and bumped 0.1.0 → 0.1.1 → 0.1.2; you continue the series.
- **A `Design` token is required in a plugin BACKLOG.md entry** — the
  pre-commit's READY-envelope gate fired on W1a for its absence. Correct fire;
  write conforming entries rather than working around it.

## ITEM 0 — a defect in shipped stage-2 code, fixed FIRST

**`ignored_by_git()` in `plugin/cli/lifecycle_core/declaration.py` (the
`check-ignore` call, currently line ~147) omits `--no-index`, so `kind check`
reports a CLEAN board over exactly the misconfiguration the check exists to
catch.** Found by W1a in its own shipped code after this desk hit the same
mistake one layer up; reported rather than edited, its write grant having
ended. Confirmed by this desk at the source.

The measurements — all four arms, do not re-derive them, but DO re-run them as
your red-first proof:

    TRACKED, negation ABSENT (the defect)
      git check-ignore --no-index   -> exit 0   sees the defect
      git check-ignore              -> exit 1   reports "not ignored"  ← shipped
      lifecycle kind check          -> CLEAN, exit 0                   ← the bug

    UNTRACKED, negation ABSENT (the existing row's plant)
      git check-ignore --no-index   -> exit 0   still fires
    UNTRACKED, negation PRESENT (the existing row's control)
      git check-ignore --no-index   -> exit 1   still clean

So adding the flag **keeps the existing red-proven row's pair intact** and
closes the tracked case. Two changes:

1. Pass `--no-index` on that call. **Delete the docstring paragraph that
   justifies omitting it** — its reasoning ("a tracked file reaches every
   clone whatever the ignore rules say") answers a different question than the
   hazard, which is a declaration one `git rm --cached` away from vanishing
   silently. Leaving correct-sounding prose beside a corrected line is how the
   next reader restores the bug.
2. **Add the refusal row that does not exist today: TRACKED + negation
   ABSENT.** Red-proven like every other row. Today's roster covers only the
   untracked case, which is why a real defect had no row.

Do not touch the `-v` call on the neighbouring line unless you find it wrong
too — if you do, that is a finding, and `-v` changes exit SEMANTICS rather
than output, so probe it rather than reasoning about it.

## Scope: stages 4, 5 and 6 of D-d. Nothing else.

**4. `lifecycle item add` — the intake join (design §3.2).** The only
admission path for both doors and for detectors (`--source detector:<name>`,
so a detector firing twice merges into its own open item). Before writing:
candidates = live items sharing a write-set path (**`UNKNOWN` never matches**)
or a requirement token; the caller answers `merge-into <id>` / `supersede
<id>` / `new`. Before `new`, the cost test — a one-file, one-hunk write-set
with the session live prints "do it now?" — and `new` is taken only with a
named absence. **Operator-mentioned items skip the cost test's veto, never the
join.** The join prints matching `rejected:` ledger lines beside candidates.
Typed blockers exactly as §3.1 lists them (`<item-id>` / `decision <question>`
/ `evidence <predicate>`), **no other edge types**. Ids are `cf-<n>`-shaped
per the declaration's prefix, stable and immutable across moves. Slots
complete at intake → READY; otherwise NEW with a typed blocker. **A PARKED
item without a typed blocker is a checker finding.**

**5. `lifecycle item ready|park|close`.** `item ready` **prints "READY and
unblocked" and PROMOTES NOTHING** — READY is judged at the desk, never
derived; blocker clearance decides schedulability only. Closure is a MOVE
performed as ONE act: append to the done home, delete from items, commit both.
A crash between them leaves two copies, which the next check flags as
**DUPLICATE (recoverable), never as loss** — build that flag, it is the whole
reason the move is specified this way. Conservation: the persisted baseline in
the file head plus per-close deltas, `items + done == baseline + added −
compacted`, **re-runnable at every close**. The `## Archive (pre-migration)`
section in the done home holds historical bodies verbatim — skipped by the
shape check, **counted by conservation**.

**6. `lifecycle ledger` (design §3.6).** Four line kinds, fixed slots:
`superseded: <id> by <id> — reason` · `rejected: <item> — approach — why` ·
`dropped: <id> — reason` · `decision: <question> → <answer>`. **The ledger
carries NO BODIES and nothing migrates into it.** The tool writes the slots;
the SESSION writes the reason prose — that split is deliberate and keeps the
operator-as-backstop moment at every rationale line, so do not generate
rationale text. Its readers are **GATES, not habits**: `ledger rejected --for
<item>` runs in the grade workflow before a re-grade, and intake prints
matching rejected lines beside join candidates (that is stage 4's consumer of
this stage — build them to fit). Supersede is routed ONE way: the body to the
done home (counted there), the reason here, **outside the conservation
identity by construction**.

**Stages 7–9 are NOT yours** (`lane list`, `--test`, `migrate`). They are W1c,
opening after this desk verifies your rows. Building ahead is a deviation, not
a head start: stage 9's decisions are not all made yet.

## Verifier (in order; real output pasted in the report)

1. **Baseline first, stated:** both suites at `fa45623` before you change
   anything, full counts. The node bites are 50/51 with the known failure
   above — state it as the expected red rather than discovering it.
2. **Every new §3.9 row RED first, then green**, with the arrangement named
   per row. One named condition disabled at the single place a finding is
   recorded, so exactly one row goes dark; restore **BY FILE COPY** — never
   `git checkout`/`restore`/`stash`, which take the whole tree — and delete
   `__pycache__` around every arm. **A red that is a module-load or import
   error proves your code is new, not that the check discriminates**: say so
   and build a real one. Each control must differ from its plant in exactly
   the condition under test.
3. **Item 0's four arms**, as tabulated above.
4. **The conservation identity, exercised across a real close**, not asserted:
   baseline, add, close, re-run — and one arm where the identity is VIOLATED
   on purpose, showing the check fires. An identity that has never been seen
   to fail is not a check.
5. **The DUPLICATE branch**, exercised: interrupt the move between append and
   delete (simulate it) and show the next check reports DUPLICATE, recoverable,
   and does NOT report loss.
6. **The lock's BOTH arms in the suite**, as stage 3 already does it: N
   processes racing a read-modify-write give N with the lock and fewer without,
   asserted both ways, so the red cannot rot into a meaningless green.
7. Both suites green at the end, full counts, **every skip dispositioned**. A
   skip in a check YOU built is a finding by construction.

## Write boundaries

- **`~/dev/Gunther-Schulz/lifecycle`** — yours. Commit freely, one commit per
  stage plus one for item 0. **Never push, never create a remote.**
- **cache-fix `/home/g/dev/vendor/claude-code-cache-fix` — READ ONLY.** Every
  cache-fix write in wave 1 belongs to stage 9, which is W1c's. It is a shared,
  PUBLIC copy with live co-writers; a stray write there is the worst deviation
  available to you.
- **The operator's dotfiles repo — READ ONLY** (you open `backlog-census.py`
  there; you write nothing).
- **Do not edit `test/absence-scan.test.mjs` or `tools/absence-scan.mjs`** in
  the plugin — byte-identical copies by instruction, known red documented above.
- Commit by pathspec — `git commit -m "…" -- <paths>`, every flag BEFORE the
  separator. A NEW file needs `git add -N <path>` first, naming the FILE never
  a directory. Never `git add` then commit, never `-A`, **never amend**.
- Trailer: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## Commit plan

- Commit-blocking guards read at compose time: the machine's global pre-commit
  runs in this repo (`core.hooksPath` → dotfiles `git/hooks/`, inherited, not
  repo-local — verified). Two of its lanes fire here: the **plugin version
  bump** (expected, keep bumping — see Established) and the **READY-envelope
  gate** on BACKLOG.md entries lacking a `Design` token. The lane gate stays
  quiet — this repo has no `lanes` declaration.
- Item 0 lands in its own commit BEFORE stage 4, so the fix to shipped code is
  attributable separately from new work.
- One commit per stage. No push, at any point.

## Report

Closing report per dispatch skill §2, slots (a)–(h). **Label report parts by
CONTENT, not by a fixed `N` of parts** — W1a's numbering went 4/7 → 6/8 → 9/9
as the payload gate split messages, which made re-requesting a part ambiguous.
Say "part: deviations", "part: gaps", and the count can grow without confusing
anyone.

**State token on every message:** the lifecycle HEAD you are at, and the
cache-fix HEAD you read.

## Recorded for W1c, NOT executed here (judgment desk decisions, 2026-08-26)

Written down now so they survive to the dispatch that needs them:

- **Stage 9 registers FIVE kinds**, not three: items, done bodies, ledger
  lines, JOURNAL entries, audits. `JOURNAL.md` is created header-only, like
  `LEDGER.md`.
- **`kind check` WILL exit 2 on cache-fix's laws file** — `CLAUDE.local.md` is
  243 lines against the declared cap of 60. **That is the checker working.**
  The decomposition that brings it under cap is wave 2's, and stage 9's
  acceptance is the migration report's properties. A red there is expected and
  named in advance, never a stage-9 bug.
- **Verifier item 6 of the wave-1 brief was corrected in place** — the durable
  form is `git check-ignore --no-index <path>`, exit 1 required, no `-v`.
