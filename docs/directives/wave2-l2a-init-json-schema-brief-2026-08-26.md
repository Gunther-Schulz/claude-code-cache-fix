# Wave 2 — L2a: `lifecycle init`, `lane list --json`, and single-sourcing the schema floor

Title: sonnet: build the two wave-2 verbs a fresh repo and an external
consumer need, and single-source the schema floor the tool defines three times
Working copy: a WORKTREE of the `lifecycle` plugin repo (base `3bc1783`, or
any later HEAD whose extra commits leave your write-set untouched),
provisioned by the dispatcher; its path arrives in your dispatch message.
That repo has NO remote by design and none is to be created.
Base check, before anything: `git merge-base --is-ancestor <base> HEAD` AND
`git log --oneline <base>..HEAD`. Base contained + nothing on top → start.
Base not contained → fast-forward to it if the tree is clean, else HALT.
Base contained WITH commits on top → HALT and report those commits as a gap.
Scratch: your OWN scratchpad.

Tier: sonnet. Every design decision below is made; nothing here asks you to
choose a shape. Where you find one that is not made, that is a STOP, not an
invitation.

## Grounding basis — read before building; the report cites what was read

- the executor skill (`dispatch-guards:executor`) — load FIRST.
- `plugin/cli/lifecycle_core/declaration.py` — the whole file. Specifically
  `REQUIRED_KEYS` (:114), `RETIRED_KEYS` (:123), `KIND_STAGES` (:89),
  `GROWTH_MODES` (:84), `SCHEMA_FLOOR` (:55), `DECLARATION_REL` (:61),
  `ignored_by_git` (:170) and `ignore_pattern` (:224).
- `plugin/cli/lifecycle_core/lanes.py` — `cmd_lane_list` (:322), `read_lane`
  (:139), `LANE_PARTS` (:59), `LANES_DIR` (:49), `_TRIGGER_LINE` (:56),
  `ROSTER_REL` (:46).
- `plugin/cli/lifecycle_core/cli.py` — `NOT_YET_BUILT` (:33) and the parser
  registrations around :249-360, for the idiom new subcommands follow.
- `plugin/cli/lifecycle_core/items.py` (:45) and `ledger.py` (:38) — the other
  two `SCHEMA_FLOOR` definitions.
- `test/test_schema.py` — what it asserts today (and what it does not).
- cache-fix `docs/directives/carrier-rework-design-2026-08-26.md`: **read the
  precedence paragraph at the head of §5 FIRST**, then §3.11 (authoring, the
  homes rule, judgment rules 5 and 6), §3.3 (the lane's parts, the trigger's
  exit codes), §3.8b (the homes table), §3.0 (the six stages — AMENDED
  2026-08-26; if your copy still reads `bound`, you are on a stale checkout,
  which is a STOP).
- `~/.claude/runbook-format.md` — the `Trigger:` line grammar, §"The
  `Trigger:` line".

## Established, and how each line was established

Every line was OPENED by the dispatching desk at brief-writing time.

1. **The four wave-2 verbs are named by the tool itself.** `NOT_YET_BUILT`
   (`cli.py:33-36`) contains exactly `init`, `lane new`, `workflow bind`,
   `lane list --json`, each with its wave. **Two of them are yours** (`init`,
   `lane list --json`); the other two are a sibling lane's — do not build them.
2. **A declaration carries twelve required keys** (`REQUIRED_KEYS`, :114):
   `schema`, `id-prefix`, `public`, `laws`, `closure-home`, `trigger-policy`,
   `goals`, `head-rule`, `lanes`, `template-bindings`, `leak-scan`, `kinds`.
3. **An EMPTY declared list is NOT the same as an ABSENT key** — the file says
   so at :105-107: absent is a finding, empty is a stated fact, which is why
   `lanes` and `template-bindings` are required even where a repo has none.
   This is load-bearing for `init`: a fresh repo with no lanes gets
   `"lanes": []`, never a missing key.
4. **Two keys are REFUSED outright** (`RETIRED_KEYS`, :123): `ready-cap`
   (R22 withdrew caps) and `bound` (renamed `growth`, vocabulary closed).
   `init` must never emit either.
5. **The six kind stages are** `home, writer, reader, staleness, exit, growth`
   (`KIND_STAGES`, :89), and growth takes one of `bounded-by-exit`,
   `compacted`, `unbounded-with-reason` (`GROWTH_MODES`, :84) — never a count
   or a size. The design's §3.0 said `bound` until it was amended today; the
   shipped constant is the authority, per the precedence rule.
6. **`SCHEMA_FLOOR = 2` is defined THREE TIMES, independently** —
   `declaration.py:55`, `items.py:45`, `ledger.py:38` — and **nothing pins
   them equal**. `test/test_schema.py` asserts only against `declaration`'s
   (two references). Verified with a positive control: `SCHEMA_FLOOR` IS
   findable in `test/` (2 hits), so the absent equality assertion is a real
   absence and not a dead search.
7. **`cmd_lane_list` prints LONGHAND and prints every state including the
   zeros** (:322-327, its own docstring): "a repo with no declared lanes says
   so in a line of its own, because '0 lanes' and 'this repo was skipped' are
   different facts and only one of them is clean."
8. **A lane body is found at `lanes/<name>.md`** (`LANES_DIR`, :49), its
   trigger matched by `^Trigger:\s*(.+?)\s*$` (:56), and `LANE_PARTS` is
   `("Decides:", "Trigger:", "Ends:")` (:59).
9. **`git check-ignore` needs `--no-index`** — `ignored_by_git`'s own comment
   (:193) records its absence as a shipped defect.

## A DIVERGENCE you will meet, already dispositioned — do not "fix" it

§3.3 calls a lane "four parsed parts": `Decides:`, `Trigger:`, a decision
table → workflows, and `Ends:`. `LANE_PARTS` names **three**. This is not a
bug: the first, second and fourth are label-prefixed lines a `startswith`
scan can find; the decision table is a markdown table with no label, so it is
structurally undetectable by that scan. The consequence is real and is
someone else's item: **nothing checks that a lane carries its decision
table.** Your stubs emit all FOUR parts. You do not extend `LANE_PARTS`, and
you do not add a decision-table check — report it if you like, but it is out
of scope and touching it collides with the sibling lane.

## The settled design — implement exactly this, do not redesign

**A. `lifecycle init`.** Writes a repo's `.claude/lifecycle.json`
(`DECLARATION_REL`, :61) with all twelve `REQUIRED_KEYS`, and lane stubs for
any doors named. Interface:

    lifecycle init [--lane <name>]... [--id-prefix <p>] [--force]

- `--lane` is repeatable and may be omitted; with none, `lanes` is `[]`.
- **REFUSES by default if the declaration already exists**, printing the path.
  `--force` overwrites. A silent overwrite of a declaration is not available.
- `id-prefix`: `--id-prefix` overrides. Otherwise DERIVED by this rule, which
  is specified rather than left to you: take the repo's directory name, split
  on hyphens and underscores, and use the first letter of each of the first
  TWO words, lowercased (`claude-code-cache-fix` → `cc`); a one-word name
  yields its first two letters (`lifecycle` → `li`). Print `derived from
  <dir>` beside it. **Uniqueness across repos is NOT checked and `init` says
  so in its output** — there is no registry to check against yet, and a
  collision is a real possibility this verb cannot see. An unstated
  non-check reads as a passed check.
- `schema` is the single-sourced floor from step C — never a literal.
- `trigger-policy`: `on-demand` (§3.11 judgment rule 6), written EXPLICITLY,
  and `init` prints that `advise` is the recommended next step once the
  router has run clean for a week. A suggestion in the file, never a switch.
- `laws`: apply §3.11 judgment rule 5. **The discriminator is computable and
  is specified here rather than left to you** — "only the operator's
  authorship" is not a judgment call:
  - The author set is `git log --format=%ae -- CLAUDE.md`.
  - OPERATOR is the repo's configured `git config user.email` — the identity
    `init` itself runs under.
  - FOREIGN is any author email in that set not equal to it.
  - **`Co-Authored-By` trailers are NOT authors and are ignored.** They are
    trailers in a message body, not the commit's author field, and counting
    them would make every AI-assisted commit "foreign" — which would flip
    this repo's own branch.
  - Author set contains only OPERATOR → `laws: "CLAUDE.md"`. Any FOREIGN →
    `laws: "CLAUDE.local.md"` (the local overlay).
  - No history, no tracked `CLAUDE.md`, or git cannot answer →
    COULD-NOT-VERIFY: take the overlay branch, print the reading as NOT
    established, and say which of those three cases it was.
  **`init` PRINTS which branch it took and why** — the rule says so
  explicitly, and the print is what makes the reading checkable rather than
  buried in a JSON value.
- `goals`, `head-rule`, `closure-home`, `public`, `template-bindings`,
  `leak-scan`: schema-valid defaults that `kind check` accepts.
  `template-bindings` is `{}` (empty, not absent). `leak-scan`
  `source-scope-foreign-path` defaults to `false` WITH a reason naming that
  the repo has not been scanned yet — never `true` by default, and never a
  bare `false`.
- **`kinds` — the three carrier kinds are COPIED, never invented.** Their
  source is the plugin repo's OWN `.claude/lifecycle.json` `kinds` block:
  its `items`, `done bodies` and `ledger lines` entries, taken whole —
  including the TYPED `writer`/`reader` values (`verb:item add`,
  `verb:retire`, …) — with only the home paths adapted to the target repo.
  Copying rather than authoring is what makes `kind check`'s typed-reference
  rows pass by construction: an invented `reader` string is prose in a typed
  slot, which is a finding by §3.8c, and you would be re-deriving a
  vocabulary that already exists two directories away.
  Copy the SHAPES faithfully too: in that source `writer` is a
  comma-joined string while `reader` is a list. Do not normalize them —
  the schema accepts both and a "tidy-up" here is an undeclared change to
  a validated structure.
- **The declaration must be visible to git.** `init` adds the `.gitignore`
  negation for `DECLARATION_REL` and verifies with `git check-ignore
  --no-index` that the path is not ignored (`ignored_by_git`, and the
  `--no-index` requirement at :193). A declaration git cannot see is G1's
  recorded defect.
- **`init` also writes the `.gitignore` line covering `ITEMS.md.lock`**
  (booked as `lc-11`; the judgment desk placed it here). One line, beside the
  declaration negation.

**B. `lane list --json`.** A machine-readable emitter beside the longhand,
selected by `--json`. Non-negotiable properties, each from established fact 7:

- **Every state the longhand prints appears in the JSON, including the
  zeros.** An omitted key makes "0 lanes" and "this repo was skipped"
  identical, which is the exact failure the longhand exists to avoid.
- **The exit code is unchanged** by `--json`. `--json` changes the rendering,
  never the verdict: same input, same exit, byte-for-byte the same
  finding set.
- Per repo: the raw roster line, the resolution, the declaration verdict, its
  notes, the lane rows with each lane's name, trigger, parts present, its
  problem where it has one, and the fired/quiet/broken counts.
- Findings carry their **row id** (`roster_absent`, `repo_unresolved`, …) as
  a field, not only as prose — the id is what a consumer can act on.
- Absent roster: still a FINDING, not a could-not-verify, and it says so in
  the JSON as it does in the longhand.
- Output is a single JSON document on stdout. Longhand lines do not
  interleave with it.

**C. Single-source `SCHEMA_FLOOR`.** One home; the other two import it. Pick
`declaration.py` as the home (it is where the declaration's own schema rule
lives and where `test_schema.py` already points). `items.py` and `ledger.py`
import it rather than redefining. **Plus the test that was missing:** the
three modules' floors are equal, red-first by mutating ONE copy under the old
three-definition layout and showing the new test goes red while the old suite
stays green.

## Verifier (in order; real output pasted in the report)

1. **Baseline first**: `python3 -m unittest discover` and `lifecycle --test`,
   full counts including skips, before any change.
2. **C red-first**: with the three definitions still separate, mutate one to
   `3` and show the OLD suite stays green (that is the defect) and your NEW
   equality test goes red (that is the catch). Then single-source and show
   both green. Restore the mutation by restoring a copy taken BEFORE it —
   never `git checkout --`, `git restore`, or `git stash` — then `git status`
   clean AND delete `__pycache__` in every directory you imported from, since
   CPython invalidates on (mtime, size) and a same-size restore can leave
   injected bytecode live.
3. **A, the refusal arm**: `init` in a repo that already has a declaration
   refuses and names the path; with `--force` it overwrites. Both pasted.
4. **A, the round trip**: `init` in a scratch repo → `kind check` and
   `lifecycle --test` clean on the result. A declaration `init` writes that
   its own checker rejects is the defect this arm exists to catch.
5. **A, the twelve keys**: assert the written declaration's key set EQUALS
   `REQUIRED_KEYS` — derived from the constant, never a restated list, so the
   assertion cannot age quietly when a key is added.
6. **A, the retired keys**: assert neither `ready-cap` nor `bound` appears.
7. **A, the laws branch — three arms**: operator-only authorship →
   `CLAUDE.md`; a foreign author → the overlay; no tracked `CLAUDE.md` →
   could-not-verify with the overlay and the reason printed. Each pasted with
   the branch and the why.
   **Constructing the foreign-author arm is legitimate and here is how:** a
   scratch repo with two configured identities, committing once as each —
   `git -c user.email=<other> commit …`. That is a purpose-built fixture, not
   a falsified history. What is forbidden is MUTATING a real repo's history
   to manufacture the arm. Also assert the `Co-Authored-By` case explicitly:
   a commit authored by the operator carrying a `Co-Authored-By` trailer for
   someone else must take the OPERATOR branch — if trailers leaked into the
   author set, this repo's own branch would flip, so it is the arm that
   discriminates the rule from a naive reading of it.
8. **A, git visibility**: `git check-ignore --no-index` shows the declaration
   NOT ignored, and the `ITEMS.md.lock` line IS matched. The pair matters:
   one asserts a negation, the other an assertion, and only both together
   show the `.gitignore` writing worked rather than the file being absent.
9. **B, the must-NOT-move row**: same roster, same repos — `lane list` and
   `lane list --json` produce the SAME exit code and the same finding set.
   Not just equal counts: two different sets of the same size would pass a
   count check.
10. **B, the zeros**: a repo with zero declared lanes appears in the JSON with
    an explicit zero, and a roster-absent run emits its finding in JSON.
    Both pasted. This is the arm the whole item exists for.
11. Full suites green; skips dispositioned individually. A skip in a check
    YOU built is a finding, not a pass.

## Write boundaries

- **Owned, in your worktree only:** `plugin/cli/lifecycle_core/cli.py`,
  `declaration.py`, `items.py`, `ledger.py`, `lanes.py`, any NEW module you
  add under `plugin/cli/lifecycle_core/`, and the tests under `test/`.
- **READ ONLY:** everything else, including `CLAUDE.md`, `JOURNAL.md`,
  `LEDGER.md`, `ITEMS.md`, `.claude/lifecycle.json`, and `tools/`. In
  particular **do not touch `tools/absence-scan.mjs`** — it is byte-identical
  to cache-fix's by mandate and another lane's change is in flight on it.
- **Do not touch cache-fix or dotfiles at all.** You read the design document
  and the format doc; you write neither.
- **`cli.py` is the collision point with a sibling lane** (`lane new`,
  `workflow bind`, `desk state`). You are FIRST and it is serialized, so the
  file is yours for this dispatch — but keep your parser additions
  self-contained and adjacent, so the sibling's additions merge without
  touching your lines.
- Commit by pathspec — `git commit -F <msgfile> -- <paths>`, every flag
  before the `--`. A NEW file needs `git add -N <path>` first, naming a FILE,
  never a directory. Never `git add` then commit, never `-A`, never
  `--amend`, never `--no-verify`.
- **Commits UNPUSHED.** That repo has no remote; do not create one.
- Trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## Commit plan

- Commit-blocking guards: `git config core.hooksPath` resolves to the
  dotfiles `git/hooks` directory (read at brief time with that command; not
  repo-local). Read the directory yourself before relying on this line; a
  lane firing on your paths is a finding to report, never a `--no-verify`.
- No plugin-payload version bump applies: your write-set touches no
  `plugin.json` and no `.claude-plugin/` manifest. Established from the
  write-set itself.
- Suggested sequence: C first (it is the foundation `init` writes with), then
  A, then B. Each its own commit, so a bisect can separate them.

## Pre-authorized repair class

If the commit plan collides with a repo guard, reorder to satisfy the guard
and report the permutation as a deviation. Novel deviations still halt.

## STOP signals — halt the item, finish the independent remainder, return the question with its evidence

- Your checkout's §3.0 still reads `bound` (you are on a stale design copy).
- A design decision would be needed that this brief does not make.
- `init` cannot produce a declaration its own `kind check` accepts.
- The `--json` emitter cannot preserve the exit code or the finding set.
- Building any of it requires touching `lane new`, `workflow bind`, or
  `desk state`.

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
