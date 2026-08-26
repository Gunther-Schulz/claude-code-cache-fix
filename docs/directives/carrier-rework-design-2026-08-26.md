# Carrier & event-lane system — greenfield design and plan (2026-08-26)

Steps 4–5 of the carrier-rework arc (`carrier-rework-handoff-2026-08-26.md`).
Written at the judgment desk from the three audits (`docs/audits/
carrier-rework-{inventory,survey,entrypoints}-2026-08-26.md`) and the
operator's decisions recorded in the handoff. Status: **GO (operator,
2026-08-26) on the full plan; decisions 1–6 accepted as recommended.**
Nothing is built yet; wave 0 opens from the judgment desk.

Operator addition at GO (restated): `claude-worktime` is supposed to show
the status of this repo's issues; something was built for it and is not
working, most likely format drift against the carrier it reads. Its
overhaul on the new ITEM/lane model is part of the plan — wave 2, as the
first external CONSUMER of the plugin's query interface (`item ready`,
`lane list`), which is also what makes it drift-proof: it reads the
tool's output, never the file. Named gap: the existing feature could not
be located by grep in claude-worktime (`claude-worktime.sh`, `config.sh`,
`tools/` — no matrix/backlog/PR reader found); the operator identifies
what it displayed before the item is graded READY.

Method, as ruled: the design below was derived from the requirements with
the current system out of view; §4 then diffs it against the inventory.
What the design did not re-derive is cut by default; an existing
mechanism re-enters only by naming the requirement the design missed.

## 1. What the system is for

One operator, one machine, several repos, a public fork. The operator
returns through four doors — drain the backlog, tend upstream PRs, cut a
PR, walk a bust — and today pays a re-derivation toll at each: 37 tool
calls before the first write on a backlog drain (median, n=27), the same
instruction pasted three times in one day, six sessions asking for an
overview before work, fourteen of twenty-seven backlog sessions where the
operator hand-supplied the pointer a lane should have found. Two of the
four doors have no lane; the one with a conforming lane is never used as
a door; the bust door's only manual link is the operator pasting a
statusline figure.

The target system makes the doors mechanical: the machine notices, the
machine prepares, the human decides only what only a human can decide.

## 2. Requirements — each with its record

Derived from the audits and the operator's rulings; the design in §3 is
graded against these and nothing else.

| id | requirement | record |
|---|---|---|
| R1 | Every door has exactly one lane, and the lane is where a session enters — not the method file | entrypoints §"headline", §EP4 (2/10 open the lane) |
| R2 | A lane fires on a computable PREDICATE evaluated by a machine, not on prose a session matches | inventory §D (router unenforced, 6/9 lack Trigger); plugin-drift and stale-PR lane never run |
| R3 | Every detector's output has a disposition path that is not "the operator remembers" | handoff (plugin drift); inventory §C (LANDS-UNREAD), §B (never-fired guard); backlog ratio firing with no pass |
| R4 | The orientation toll is cut by changing WHAT MUST BE READ, not by documenting the reads | entrypoints §"de-facto procedure" |
| R5 | Intake is a MERGE with four exits (do-now / merge-into / supersede / new), "new" last; operator mentions carry authority, session findings pass the cost test | handoff, operator-confirmed |
| R6 | Drain is the carrier's default behaviour: ready items dispatch on schedule; merge/batch is a mechanical join over write-sets; retirement runs on the ratio | handoff (operator); inventory booking 16 |
| R7 | The grade vocabulary is closed BY THE TOOL, not declared in prose — a grade the tool does not know is rejected at write time, not counted later | inventory (26 unknown words; PARKED undeclared; 18-word closure home) |
| R8 | One closure home per carrier, with a conservation check whose formula is stated and re-runnable | inventory §"could not verify" |
| R9 | Instruments record at the effect site: a guard fire carries its command; a commit recorder sees every commit; a producer's evidence has a collector | inventory §B; b4 closing digest (the arc's own audits have no collector) |
| R10 | Guard denials name a permitted next act; "do not work around" alone is prose that turns correct narrowing into a dodge | inventory §B (guard wording) |
| R11 | EP4 is local-only by construction: no cloud mechanism reaches the captures | survey §1 |
| R12 | Nothing that was other sessions' content, and no operator quote, reaches the public tree — carriers holding cross-project state live outside public repos | CLAUDE.local.md publication bar; inventory scope note |
| R13 | Irreversible or outward acts (push to upstream, post, publish, merge to production main) stay with a human; everything up to a ready-to-integrate artifact may be automated | routing module carve-out floor; fork main is production |
| R14 | Any PR query names the UPSTREAM repo | entrypoints scoping note |
| R15 | The design is one system for every repo on the machine — repos hold only items, lanes and declarations; mechanics live once | operator: global event-lane system |
| R16 | Cut and rewrite are first-class; a mechanism whose requirement the design already satisfies is removed, not amended | operator ruling |
| R17 | A "no drift by construction" property is preferred over a "no drift by discipline" one wherever available | inventory §A2 (symlinked corpus) |
| R18 | Orientation cost and drain ratio are re-measurable after the change by a tool, not an impression | b4 closing gate Q1 (throwaway script) |

## 3. The design, from a blank page

### 3.1 One primitive: the ITEM

Everything the system tracks — a backlog entry, a bust disposition, a
detector finding, a PR needing attention — is an ITEM with six slots:

    id · grade · requirement (why it exists, one line + record pointer)
    · write-set (files/venues the realizing change lands in, or NONE)
    · done-criterion · evidence (pointers, dated)

Grades, closed, five: NEW (admitted, not yet decision-complete) · READY
(dispatchable by construction) · PARKED (names its missing evidence or
trigger) · DONE (commit ref) · DROPPED (one-line reason). The tool refuses
any other word (R7). "Record"-type prose is not an item — it goes to the
ledger (a chronological, append-only file), which is the ONLY other
carrier a repo has.

Storage: one file per repo, `ITEMS.md`, markdown for humans and git
diffs, but each item is a fixed-slot block the tool parses; the tool is
the writer of record (a hand edit that breaks the shape fails the
pre-commit check). DONE and DROPPED bodies move to `ITEMS-DONE.md` on
closure — the move is the tool's act, so the conservation check is
`count(before) == count(items) + count(done)`, stated once and run at
every close (R8).

Cross-project or sensitive items (the office-domain timers, another
session's content) never enter a public repo's file: the tool refuses a
write to a repo whose `.claude/lanes.json` declares `public: true` when
the item is tagged from another project (R12); such items live in the
dotfiles carrier or in a local XDG-state carrier.

### 3.2 Intake is a merge (R5)

`item add` is the only admission path, for both doors (session-noticed,
operator-mentioned). It runs the join before writing:

1. candidates = live items sharing a write-set path OR a requirement
   token with the new one (the join is mechanical; write-set is the key
   the survey found only one tool in sixteen has, and ours already has);
2. the caller answers, for each candidate, one of: `merge-into <id>`
   (append evidence, no new item), `supersede <id>` (old body to DONE
   home with "superseded by"), `new`;
3. before `new`, the cost test: if the change is smaller than the entry
   (the tool asks for the write-set; a one-file, one-hunk write-set with
   the session live prints "do it now?"), the default exit is DO-NOW —
   `new` is taken only with a named absence (evidence outstanding, other
   desk, tier, blast radius). Operator-mentioned items skip the cost
   test's veto but still run the join.

Detector outputs (§3.5) enter through the same call with `--source
detector:<name>`, so a detector firing twice merges into its own open
item instead of appending.

### 3.3 Lanes are triggered, not matched (R1, R2, R3)

A LANE is a procedure file with three parsed parts and a prose body:

    Trigger:  <predicate command> — exits 0 when the lane should run,
              prints the items it fires on
    Gates:    <ordered checks, each a command that must exit 0 to leave
              the step> (executable transition gates, from the survey)
    Ends:     <closed set of terminal dispositions, each mapping to an
              ITEM grade or a DONE/DROPPED move>

The machine-wide ROUTER is a generated table, never hand-edited: `lane
list` walks every repo declared in `~/.config/lanes/repos` and each
repo's `.claude/lanes.json`, and prints trigger-state per lane
(quiet / FIRING: n items / broken: predicate failed). The session-start
hook prints that table — this is what replaces "which line are you on".

The four doors, as lanes with predicates:

| lane | Trigger predicate | runs where | ends |
|---|---|---|---|
| `drain` (EP1) | `item ready --count ≥ 1` | headless, scheduled | per item: dispatched → artifact ready / blocked (→ PARKED with evidence) |
| `pr-tend` (EP2) | `gh pr list -R <upstream> --author @me --json …` returns any red / conflicting / unanswered-thread / idle > N days (R14) | headless, scheduled | per PR: rebased / answered (draft) / blocked-on-upstream / drop-proposed |
| `pr-cut` (EP3) | `item ready --tag upstream-slice ≥ 1` | session (judgment) | drafted → handed to `pr-tend` |
| `bust` (EP4) | `bust-triage --list --undispositioned` non-empty | headless, local (R11) | mitigated / parked / controlled-cause / upstream-filed / UNCLASSIFIED (→ item, NEW) |
| `retire` | `item ratio ≥ 3` (capture:drain over the window) | headless, scheduled | pass run: merged n / dropped n / kept n |
| `detector` | any registered detector printed a finding since the last run | headless | one item per finding class via `item add --source` |

### 3.4 Headless execution under systemd (R6, R11, R13)

A user timer runs `lane tick` every N minutes: evaluate every trigger,
and for each FIRING lane whose `runs` is headless, launch `claude
--print --agent lane-runner --allowedTools <lane's tool set>
--permission-mode <lane's mode> "<lane> <item ids>"` through the proxy.
Everything the run produces is an ARTIFACT — a branch with unpushed
commits, a drafted PR comment, a disposition proposal — plus one item
transition. The run never pushes to a public remote, never posts, never
merges to production main: those are the operator's acts, taken from the
next interactive session, which opens on the router table showing what
is ready to integrate (R13). A headless run that needs a decision only
the operator can make ends in PARKED with the question as the item's
missing evidence — the interactive session's first screen.

Guard: a headless run has the same permission hooks as an interactive
one; the lane's `--allowedTools` is the box; a denied call ends the run
with the denial as the item's evidence (R10: every denial text names the
permitted next act — "narrow to an in-bounds path, or PARK with this
denial as evidence").

### 3.5 Detectors register their disposition (R3, R9)

A detector is anything that emits a finding on a schedule or at session
start: the daily gate, the harvest, plugin-drift-scan, the backlog ratio,
the never-fired-guard census, the worktree census. Each registers in
`~/.config/lanes/detectors` with `run:`, `finding-class:` and
`disposition:` = one of `auto-apply <command>` (safe, reversible — the
plugin update is this class), `item` (enter the carrier through intake),
`notify` (operator-only, for the genuinely undecidable). A detector with
no registered disposition is itself a finding the router prints.

Recorders sit at the effect site: the hook fire log carries the cleaned
command (cap 512 chars) and the token that fired; the commit recorder
runs as a git hook, not a tool-use hook, so it sees every commit; every
producer of files under a repo names its collector in `lanes.json` or
the state report lists it as UNREGISTERED (the state report reads the
closure home too).

### 3.6 Orientation: one command, one screen (R4)

A session's first screen is `lane list` + `item ready --head` + the
ledger tail (5 lines). The 2,548-line method file stops being required
reading: its rules that are LAW move into gates (executable, §3.3), its
rules that are METHOD stay where they are and are read when a gate
points at them. Required reading shrinks to: this repo's `lanes.json`
declaration (tiny), the fork notes' vision paragraph, and whatever the
firing lane names. The measurement that grades this is R18's tool.

### 3.7 The corpus / project seam (R15, R16, R17)

Three layers, one home each, drift-free by construction (symlinks or a
single installed plugin):

| layer | holds | home |
|---|---|---|
| ETHICS | grounding, fixing, calibration, reporting — stances, not mechanics | corpus modules (unchanged in kind; shorter once mechanics leave) |
| MECHANICS | the ITEM schema and tool, intake merge, lanes format and router, headless runner, detector registry, conservation and ratio checks, the state report | ONE plugin (`lanes`), installed once, versioned; its docs are the only description of the mechanics |
| DECLARATIONS | per repo: `.claude/lanes.json` (public?, closure home, lanes, collectors), `ITEMS.md`, `ITEMS-DONE.md`, `LEDGER.md`, `lanes/*.md`; per machine: `~/.config/lanes/{repos,detectors}` | the repo / the config dir |

The accretion module's file roles, backlog doctrine and retirement
trigger — 200 lines of prose describing mechanics — are REPLACED by a
one-paragraph pointer to the plugin (R16); the plugin's checker enforces
what the prose asked sessions to remember. `runbook-format.md` and the
machine-wide runbooks router are replaced by the lane format and the
generated router. Kämmung survives as the DIAGNOSIS the `retire` lane
runs when the ratio fires — the four diseases are its body; the trigger
and the pass move to the lane.

## 4. Diff against the inventory — what survives, what is cut, what is rewritten

| existing thing | verdict | why (requirement) |
|---|---|---|
| `BACKLOG.md` + `BACKLOG-DONE.md` (both repos ×2) | REWRITE → `ITEMS.md`/`ITEMS-DONE.md` via one-time migration (grade map: READY→READY, PARKED→PARKED, RECORD/HANDOFF/etc.→ledger entries, DONE/RESOLVED/...→done home); every unknown word resolved by the migration report | R5–R8 |
| `## Grades` prose declarations, `Closure-home:` line | CUT — the tool owns the vocabulary | R7 |
| session-start backlog banner, `backlog-census.py`, `session-scan.py`'s closure regex, `named-and-unbooked-check.py`'s file list | CUT — replaced by `lane list` and the tool's own census; the restated lists die with them | R7, R9 |
| `docs/runbooks/*.md` (9), `~/.claude/runbooks/`, `runbook-format.md`, `lane-check.py`, dev-loop "Which line are you on" | REWRITE → `lanes/*.md` in the new format with predicates; the three bust lanes MERGE into one with `Ends` carrying the tie-break; `upstream-pr-stale` + `upstream-pr-round` merge into `pr-tend`; `session-close`, `ship-proxy-change`, `public-comms` survive as lanes (session-run) | R1, R2 |
| `docs/dev-loop.md` as required reading | CUT from the roster; the file stays as METHOD, gates point into it | R4 |
| required-reading gate/inject hooks | SURVIVE (survey: the one refinement nobody else publishes) — roster shrinks | R4 |
| accretion module (file roles, backlog doctrine, retirement trigger, operator verbs) | REWRITE to a pointer paragraph | R15, R16 |
| insurance module (ledger, fresh-context, dispatched work) | SURVIVE — ethics-grade; ledger clause points at `LEDGER.md` role | — |
| routing module | SURVIVE; the headless runner is a new route line it must name | R13 |
| `state-report` | REWRITE — reads the closure home and the `lanes.json` collector list; unregistered producers become findings | R9 |
| daily gate, harvest timers | SURVIVE as detectors with registered dispositions; gate gets a memory cap and a run-in-progress stamp | R3, R9 |
| `plugin-drift-scan` | SURVIVE as a detector with `auto-apply` | R3 |
| `corpus-pointer-check.py` (never fired) | CUT unless one planted positive makes it fire within the migration — a guard that cannot be shown to fire is retired | R9 |
| fire log without command; tool-use commit recorder | REWRITE (effect-site recorders) | R9 |
| `restrict-*-paths` deny texts | AMEND wording only — the one amend in this table, because the mechanism is right and the prose is the defect | R10 |
| kämmung skill | SURVIVE as the diagnosis body of the `retire` lane | R6 |
| dispatch-guards plugin | SURVIVE untouched — it governs lanes-as-subagents, a different "lane"; the naming collision is resolved by calling the new thing LANE and theirs DISPATCH in every new text | — |
| 24 orphaned plugin-cache versions, 26 finished worktrees, 58 lane branches, three stalled BRIEF files | CUT by the migration's cleanup step (each a detector class afterwards) | R3 |
| `docs/release-tests/` (no recorded motivation, 75 days) | DROP-proposed; operator decision D5 | R16 |
| upstream's `CLAUDE.md` team apparatus | out of scope (not ours) | — |

Not re-derived by the design and re-entering by a named requirement:
none found. Items in the three audit tails not covered above are
dispositioned in §5.

## 5. The plan — ranked, with the audit tails dispositioned

Order is by cost-to-benefit against the record, not by wave size. Each
wave is decision-complete for a dispatch once the operator GOes it.

**Wave 0 — today, no design dependency (hours):**
- `pr-tend` by hand once: the 5 idle upstream PRs (one conflicting) —
  entrypoints booking 3. The highest value per effort in the set.
- Arm the existing lane checker: one `lanes` line in this repo's
  roster (inventory booking 3) — keeps the old system honest while it
  lives.
- Cap the gate service's memory (inventory 6); stamp run-in-progress
  (inventory 5). Two systemd/JSON edits.
- Book the fire-log command field (done, dotfiles READY); guard deny
  wording (inventory 14).
- Graduate b4's session-measurement script to `tools/` (R18) — the
  before/after instrument, before anything changes.

**Wave 1 — the `lanes` plugin core (one dispatch, opus-briefed, ~2–3
days):** ITEM schema + `item add|ready|ratio|close` with the intake
join; lane format parser + `lane list` router; `lanes.json`
declaration; conservation and ratio checks as pre-commit; `--test`
bites; migration tool that converts both repos' backlogs and prints the
unknown-grade resolution report. Verifier: red-first on a planted
unknown grade, a planted duplicate item, a planted broken closure count.

**Wave 2 — lanes rewritten (parallel dispatches, disjoint files):**
the six lanes of §3.3 in the new format, each with its predicate proven
FIRING on a planted item and QUIET on none; the old runbooks retired in
the same commits. The corpus accretion module rewritten to its pointer.

**Wave 3 — headless runner + detectors (one dispatch):** `lane tick`
under a user timer; `--agent lane-runner` definition; detector registry
with the six existing producers registered; effect-site recorders
(fire-log command field, git-hook commit recorder); state report reads
collectors. Verifier: a planted bust in `bust-triage --list` produces a
PARKED item with evidence overnight with no human present; a planted
ready item produces an unpushed branch.

**Wave 4 — cut pass:** everything marked CUT in §4, each removal with
its dependents search stated; the cleanup detectors armed.

Audit-tail items not named above, dispositioned: inventory 1,2 → wave
2; 4 → wave 4; 7,10 → wave 3; 8,9 → wave 1 (the migration report);
11,12 → wave 4; 13 → wave 3 (the dispatch log registers or is cut); 15
→ wave 3; 16 → wave 1's migration runs the pass on both dotfiles
carriers. Survey 1 → the ledger gains a `rejected:` line kind (wave 1);
2 → the ITEM write-set slot IS this; 3 → §3.3 gates; 4 → `item ready`
derives the head from PARKED-evidence resolution + write-set
disjointness (wave 1); 5 → decision D4; 6 → R11, settled. Entrypoints
1,2 → §3.6; 4 → R14 in `pr-tend`'s predicate; 5,7,8 → §3.3.

## 6. Decisions for the operator

Each with a recommendation; a "no" flips the marked design line.

1. **Carrier shape:** ITEMS as fixed-slot markdown blocks parsed by the
   tool (recommended: keeps git diff review and grep, satisfies R7 by
   the tool refusing writes) — or a JSON/YAML sidecar as the truth with
   markdown rendered from it (stricter, loses hand-editability). Rec: A.
2. **Headless runs on this machine** via `claude --print` under a user
   timer, through the proxy, producing artifacts only (never pushing to
   a public remote or production main). This spends subscription budget
   unattended; the timer cadence and the lane tool boxes are the knobs.
   Rec: yes, cadence 30 min, `drain` capped at one item per tick.
3. **The `lanes` plugin as the single home of mechanics**, with the
   accretion module cut to a pointer and `runbook-format.md` retired.
   Rec: yes — this is the global/project seam in one line.
4. **GitHub event triggering for EP2** (a cloud routine watching upstream
   `pull_request` events) versus polling upstream from the local timer.
   Rec: poll — five PRs, no cloud footprint, R11-consistent.
5. **Drop `docs/release-tests/`** (no recorded motivation, 75 days
   stale, upstream-shaped). Rec: drop, with the ledger line.
6. **Naming:** the new thing is LANE; dispatch-guards' report channels
   stay DISPATCH lanes in their own docs and are never called lanes in
   new text. Rec: yes.

On GO: wave 0 runs from this desk today; wave 1 is written as a brief and
dispatched (opus, judgment-dense build), with this document as its
settled design.

## 7. Execution handoff — waves 0 and 1 to the peer desk (2026-08-26)

Judgment desk: `claude-code-cache-fix-9e [96132d]`. Peer desk:
`claude-code-cache-fix-b4 [2bb912]` — chosen because it is warm and holds
every grounding fact wave 0 needs (unit paths, verdict-file fields, the
measurement script). Delegation is inert until the operator confirms it
first-hand in the peer's session; wave 0 starts on that confirmation.

REPORT-CHANNEL: SendMessage `claude-code-cache-fix-9e [96132d]`. Cadence:
one digest at the end of wave 0 and one per wave-1 milestone; blockers
and carve-out questions immediately.

Wave 0 items, each with its write-set (routing inside the wave is the
peer's; sonnet lanes for the mechanical ones):
- **W0.1 pr-tend by hand** — the five open upstream PRs (query names the
  UPSTREAM repo). Per PR: state, unanswered threads, rebase where
  conflicting, DRAFT any reply. Carve-out: nothing is posted, no PR is
  pushed to upstream, until the drafts have passed the judgment desk and
  the operator (public-comms lane). Write-set: local branches only.
- **W0.2 arm the existing lane checker** — `lanes` declaration in
  `.claude/required-reading.json` (cache-fix), shaped as the checker's own
  worked example; verify by a commit that the checker now grades.
- **W0.3 gate memory cap + run-in-progress stamp** — dotfiles
  `bootstrap/systemd/cache-fix-gate.service` (`MemoryMax=`, value from
  the measured 12 GiB peak plus headroom, stated); cache-fix
  `tools/gate-live.mjs` writes a start stamp the banner reads as
  "running" until the finish stamp lands. Two red-first bites.
- **W0.4 graduate the session-measurement script** to cache-fix
  `tools/entrypoint-census.mjs` (or `.py`, whichever it is): top-level
  sessions only, subagents counted separately, first-message
  classification as a stated rule, tool-calls-before-first-write. Its
  output on today's store must reproduce the step-2 numbers (27/2/0/10;
  median 37). Publication bar: no transcript text in output.
- **W0.5 guard deny wording** — dotfiles `restrict-*-paths.py` deny text
  gains the permitted next act ("narrow to an in-bounds path, or stop and
  report with this denial as evidence"); test fixtures updated.

**Decisions on the peer desk's wave-0 ACK gaps (judgment desk,
2026-08-26; the peer session was cleared after the ACK, so these live
here, not in its context):**
- **G1 (W0.2) — the declaration goes in a TRACKED file, `.claude/lanes.json`.**
  Basis (peer, verified): `required-reading.json` is untracked by design
  (`.git/info/exclude`) and the commit-time gate reads the INDEX (`git
  show :<rel>`), so a key there can never arm it. `.claude/lanes.json` is
  also the declaration file §3.7 gives the future plugin, so nothing is
  thrown away. Realizing change: the checker (`tools/lane-check.py`,
  dotfiles) and the commit-time gate read the `lanes` declaration from
  `.claude/lanes.json` first, `required-reading.json` second; W0.2's
  write-set widens to that checker. Verify by a commit the gate grades.
- **G2 — arm now, with the six non-conforming lanes as a DECLARED
  EXEMPTION the checker verifies:** the exemption list names each file
  and the missing part; the checker FAILS if an exempted file has become
  conforming (a stale exemption) — so wave 2 retires the list entry by
  entry and the gate is fully armed when the list is empty.
- **G3 — `MemoryHigh=16G` as the working limit, `MemoryMax=24G` as the
  backstop** (peak ~12 GiB measured, box 60 GiB), plus the unit's failure
  surfaced as a detector finding (the banner reads systemd's result and
  prints "gate: no verdict — unit failed"), because a hard cap alone turns
  a loud memory problem into a silent absence of verdicts.
- **G4 — the tool's acceptance splits by parentage:** the mechanical
  half is exact (78 top-level sessions vs 264 subagent files; median 37
  calls before first write); the entry-point split states its rule, runs
  it, and PRINTS every disagreement with the recorded hand classification
  for adjudication — resolved by amending whichever is wrong, never by
  tuning to agree.
- Readings confirmed: W0.1 rebases locally, unpushed — a force-push to a
  PR head is an outward act; dotfiles is WRITABLE for W0.3 and W0.5 only
  (the unit file, `gate-live` stamp reader in the banner hook, the two
  path guards and their tests), read-only otherwise.

Wave 1 is briefed by the peer desk from §3.1–3.2 and §3.7 once wave 0's
digest is booked; the brief passes this desk before dispatch (release
gate: the plugin's first version is an outward artifact).
