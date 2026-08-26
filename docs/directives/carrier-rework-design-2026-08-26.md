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
graded against these and nothing else. R20 was added after the Begehung round;
R1–R19 are unchanged.

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
| R18 | Orientation cost, drain ratio AND per-session prefix size are re-measurable after the change by a tool, not an impression | b4 closing gate Q1 (throwaway script); operator observation that clear procedures measurably improve sessions |
| R20 | **Every persisted kind declares its whole LIFECYCLE — writer, reader, staleness rule, exit — and a machine walks the declaration.** The previous system broke where lifecycle was implicit: items had an append path and no exit, runbooks a mint rule and no use check, directives retention prose nobody enforced, a done home without bound, a guard wired for weeks that never fired with nobody scheduled to notice. The retire lane is the lifecycle walk over every registered kind (items, done bodies, directives, audits, lanes, workflows, worktrees, lane branches, plugin cache), each with its staleness rule declared in `lanes.json`, each exit recorded; a kind with no declared lifecycle is itself a finding the router prints — dev-loop's carrier-registration clause generalized from "has a collector" to "has an owner for every stage" | operator 2026-08-26 ("nothing left stale or dormant; every persisted piece has its controlled place"); inventory §A–E |
| R21 | **Controlled autonomy (operator 2026-08-26: "more than lifecycle management — like Statiker: autonomous decisions, done in a controlled way").** The system may make any decision inside its declared box — a pick, a grade, a merge-at-intake, a drop, a disposition — provided the decision is RECORDED with its basis before the act (a `decision:` ledger line; the pick line), STOPS at a declared point (READY is judged decision-completeness, never executed past on inference), is REDIRECTABLE within a window, and is ATTACKABLE (a fresh-context verdict stage for items above a declared judgment threshold — the Begehung applied to the design is the model). Statiker's five forcing points map onto the lanes: recorded decisions → ledger lines; dispatchable-design stop → judged READY; fresh attack → the verdict stage; no-design implementation → leaves execute briefs, gaps surfaced; isolated verify → executable workflow gates. Each lane file declares `Decides:` — which decisions it may take alone, each with its recording act; a decision outside that list returns to the operator. Lifecycle management (R20) is the substrate this runs on | operator 2026-08-26; statiker skill (five forcing points) |
| R19 | **Each kind of thing has exactly one home, and a TOOL keeps it there.** Items are written only by the item tool; procedures live only in a workflow registry (procedure text elsewhere, or a lane body over one screen, is a checker finding); laws live only in the project `CLAUDE.md` under an enforced line cap; reference is free-form and never required reading; rules are minted only at their truth level. Inflation and fragmentation recurred in every carrier because each had an append path and no owner for this invariant — the corpus's prose rules against it land on a session that has to remember | operator observation 2026-08-26; inventory §A–D throughout |

## 3. The design, from a blank page — lifecycle management for everything a repo persists

Revision 2 (2026-08-26, after the Begehung round: 30 findings, 11
blocking, all accepted; and the operator's framing that the guiding term
is LIFECYCLE MANAGEMENT). Revision 1's sections on items, lanes and
workflows are restated here under one primitive rather than patched.

### 3.0 The primitive is the KIND, not the item (R19, R20)

Every kind of thing a repo persists is REGISTERED with four stages and a
bound, in the repo's declaration file `.claude/lifecycle.json`
(tracked; the plugin's install step adds the `.gitignore` negation and
the checker fails on an ignored declaration — G1's defect, closed once
per repo family, not once per repo):

    kind · home (path pattern) · writer (tool | session | producer)
    · reader (the gate, lane, report or tool that consumes it)
    · staleness (a predicate: age, use-evidence, or "none, declared why")
    · exit (move | compact | delete | never, with the recording act)
    · bound (a count or size, or "unbounded, declared why")

Items, done bodies, ledger lines, lanes, repo-private workflows,
template bindings, directives, audits, code-reviews, evidence carriers
(row-pins, census rows, growth fixtures), worktrees and lane branches,
plugin-cache versions, detector findings — all instances. The RETIRE
lane is the walk over every registered kind: it prints each kind's
count against its bound, applies each staleness predicate, and records
each exit. A persisted thing that resolves to no registered kind is a
router finding (UNREGISTERED), and a kind with an undeclared stage is a
checker finding. The Begehung's thirty findings sort almost entirely
into "a kind with one stage undeclared" — the ledger had no exit, the
done home no staleness rule, the registry no reader, the plugin cache no
exit and no rollback, `ITEMS.md` no version — which is why this is the
primitive.

### 3.1 Items

Slots: `id` (stable, `<repo-prefix>-<n>`, immutable across moves) ·
`grade` · `requirement` (why, one line + record pointer) · `goal` (one
of the repo's declared goals — this repo's are FORK-NOTES' loop stages;
an item advancing none is a retire-lane drop candidate) · `write-set`
(paths/venues the realizing change lands in; `NONE`; or `UNKNOWN` for
migrated entries that never carried one — the join treats UNKNOWN as
"ask", never "match", and the grade workflow fills it) ·
`done-criterion` · `evidence` · `blocked-by` (typed: `<item-id>` —
resolves mechanically on that item's DONE, the item returns to NEW for
re-grade; `decision <question>` — the operator's queue, listed on the
first screen and by `/lanes ?`; `evidence <predicate>` — evaluated like
a trigger). No other edge types.

Grades, closed, five: NEW · READY · PARKED · DONE · DROPPED. READY is
JUDGED — a slot-complete grade the desk assigns, "a fresh context could
execute this now" — and never derived: blocker clearance decides
SCHEDULABILITY only, so `item ready` prints "READY and unblocked" and
promotes nothing (the survey's line: graph-clear is not judged-complete;
a derived READY would re-create the 95-entry failure this repo recorded
2026-08-11 in a new form). RECORD's substance — decision-complete, not
scheduled — is READY-unscheduled: the declared `ready-cap` and
`head-rule` (a MITIGATE-goal item leads whenever one is complete; cap
ten — both operator decisions of 2026-08-11, carried) pick the head; the
rest are READY and visible, not a separate word. A PARKED item without a
typed blocker is a checker finding. A repo's declared extra grade words
are NOT accepted (R7): their meanings map (POINTER → an item whose body
lives elsewhere, referenced; OPEN → NEW) and the migration report says so
per entry.

Storage: `ITEMS.md`, first line `schema: <n>`; the tool refuses to parse
a file stamped above its own floor (red: a file stamped one above).
Fixed-slot blocks; the tool is the only writer — a hand edit that breaks
the shape fails the pre-commit shape check; an unknown grade word that
reaches the file by merge or an old tool is READABLE and reported in the
census's third answer (open / closed / unknown-with-counts, the shape
`backlog-census.py` had and the successor keeps by design). Writers
serialize on a file lock. Closure is a MOVE to `ITEMS-DONE.md` performed
as one act: append to the done home, delete from items, commit both —
a crash before the commit leaves two copies, which the next check flags
as DUPLICATE (recoverable), never as loss. Conservation: a persisted
baseline in the file head plus per-close deltas (`items + done ==
baseline + added − compacted`), re-runnable at every close. The done
home has an `## Archive (pre-migration)` section holding historical
bodies verbatim — skipped by the shape check, counted by conservation —
and a COMPACTION step in the retire lane collapses done bodies older
than N days to one ledger line each (git keeps the body), so the done
home is bounded.

Concurrency: parallel work here is many writers to CODE and one to the
carrier — "subagents never book" is a CONVENTION (dispatch-guards §4 is
prose; its writer-claims gate ships WARN, promotable to deny — corrected
by the Begehung: not hook-enforced today), and the file lock is the
MECHANISM that serializes any writer regardless. Across machines the
carrier rides git; a collision is a loud merge conflict; a database is
the answer only if that recurs measurably.

Origin and publication: the tool records the writer's cwd repo on every
write; a repo declares `public: true|false` and the default in the
ABSENCE of a declaration is refuse-unless-declared-private — an
undeclared, ignored or malformed declaration fails loudly, never open.
A public repo refuses an item whose source cwd is another repo; detectors
register their home repo. The no-operator-quote half of the bar has no
predicate and is labelled prose-rest, operator as backstop.

### 3.2 Intake is a merge (R5)

`lifecycle item add` is the only admission path for both doors
(session-noticed, operator-mentioned) and for detectors
(`--source detector:<name>`, so a detector firing twice merges into its
own open item). Before writing: candidates = live items sharing a
write-set path (UNKNOWN never matches) or a requirement token; the
caller answers `merge-into <id>` / `supersede <id>` (body to the done
home with "superseded by"; the REASON is a ledger line) / `new`; before
`new`, the cost test — a one-file, one-hunk write-set with the session
live prints "do it now?", and `new` is taken only with a named absence.
Operator-mentioned items skip the cost test's veto, never the join. The
join prints matching `rejected:` ledger lines beside candidates (§3.6).
READY is the goal state of every open item: slots complete at intake →
READY; otherwise NEW with a typed blocker; the DRAIN lane's first
workflow is GRADE (resolved blockers → re-grade at the desk), and only
then the pick. An item not gradable after n passes, or blocked on a
decision nobody will make, exits DROPPED via the retire lane.

### 3.3 Lanes, workflows, laws, reference (R1, R2, R4, R19)

A LANE is a thin decider, one screen, four parsed parts: `Decides:`
(the decisions it may take alone, each with its recording act — R21;
anything else returns to the operator), `Trigger:` (a predicate command
with RESERVED exit codes — 0 fire, 1 quiet, ≥2 broken — the broken path
red-proven with a predicate that errors, so a dead `pr` lane never reads
as a clean board), a decision table → workflows, `Ends:` (a closed set
of dispositions, each an item transition). One lane per door,
situations as dispositions. Lane names are VOCABULARY the operator
types — "drain", "bust", "pr", "slice", "retire", "close" — never
commands; `/lanes` is the only slash command (`/lanes ?` recommends,
with the blocker chain to the root). The ROUTER is generated by `lane
list` over `~/.config/lifecycle/repos` and each repo's declaration; it
prints its roster count and per-repo resolution state LONGHAND (an
absent roster is BROKEN, a listed repo that does not resolve is named),
because a sparse table renders as silence and silence reads as clean.

A WORKFLOW is a persisted, reusable procedure with executable gates
between steps and a named output, in the plugin's registry; a repo
earns a private workflow file only when two or more lanes use it or a
lane body would exceed a screen. The method file (dev-loop.md)
DECOMPOSES — nothing deleted, GATING is the cut: procedures →
workflows; LAWS → the repo's declared laws file (`laws:` in
`lifecycle.json` — `CLAUDE.local.md` here, because the tracked
`CLAUDE.md` is upstream's and non-binding; `CLAUDE.md` where the repo is
ours; laws never enter a foreign file, so nothing ships upstream and the
recorded transcription failure has no path) under a cap of 60 lines
(under the ~242 lines accretion's shrink saves, so the injected prefix
strictly falls); essays → reference, pointed at by gates, never
required reading. Decomposition budget: lane + workflow text ≤ half of
today's 2,375 runbook lines. "Laws, never method" is judgment and is
labelled prose-rest; the cap is the mechanism.

Shared workflows across repos: registry TEMPLATES with declared slots,
bound per repo in `lifecycle.json`, step overrides allowed, copies
never. Six controls: bindings not prose (drift); duplicate-text check
is PROSE-REST — exact duplication fails, near-duplication is reviewed
(labelled, not claimed); a shared lane's predicate runs only in binding
repos; an unbound required slot is a finding, never a default; the
registry records bindings and the plugin's suite runs every template
against every binder; and the LEAK direction — templates are extracted
from a PRIVATE repo into a PUBLISHED registry — gets a real guard: the
plugin repo carries the leak scan (this repo's `absence-scan`, moved
into the plugin as a shared tool) as a pre-push hook from its first
commit, red-proven on a planted foreign path before any template lands,
and every template extraction is a reviewed PR carrying the hygiene
grep output. No template is extracted until that hook exists. First
shared set: the PR workflows; bust work stays this repo's own.

### 3.4 Who starts a lane, and how the machine notices (R3, R6, R13)

Unchanged from revision 1: sessions are the unit of work; `trigger-
policy:` per repo — `on-demand` (default) / `advise` / `auto` /
`unattended` (designed-for, PARKED). Trigger evaluation at session start
and prompt submit. The machine NOTICES unattended: gate and harvest
timers run as today, findings register through §3.5, and one
notification per batch goes out — CONTENT IS COUNTS ONLY, never a repo
or producer name ("findings waiting: 3"), on a LOCAL desktop channel by
default; ntfy (a third-party public host — topic obscurity is not access
control) is an explicit per-detector opt-in for the phone case
(decision D8, accepted). Under `auto`, the drain lane prints one pick
line per item before its first tool call.

### 3.5 Detectors, dispositions, recorders, and the trust base (R3, R9, R17)

Each detector registers `run`, `finding-class`, `disposition` —
`auto-apply <command>` (reversible, with the ROLLBACK command printed in
its notification), `item`, or `notify` — and its home repo; an
unregistered detector is a router finding. The plugin update is the
auto-apply case, and its reversibility is SHOWN, not asserted: the
plugin cache keeps the last three versions (declared bound; the
cleanup retires older ones), and version selection compares parsed
semver, red-proven on the real listing where `0.9` string-sorts above
`0.11`. On THIS machine the plugin is installed SYMLINKED from its dev
checkout — drift impossible by construction, the same property the
corpus has (R17 honoured at the layer that emits every verdict); the
marketplace pin plus drift detector plus auto-apply plus rollback is
the by-discipline path for other machines.

Recorders at the effect site: the hook fire log carries the cleaned
command (cap 512 chars) and the firing token; the commit recorder is a
git hook, so it sees every commit; every producer of files under a repo
names its collector in the declaration or the state report lists it
UNREGISTERED — the state report reads the done home and the ledger too.

### 3.6 The ledger — decisions only, parsed, gated

`LEDGER.md` carries NO BODIES. Nothing migrates into it. It holds one
fixed-slot line per decision event — `superseded: <id> by <id> — reason`
· `rejected: <item> — approach — why` · `dropped: <id> — reason` ·
`decision: <question> → <answer>` — written by the tool for the slots
and by the SESSION for the reason prose (so the operator-as-backstop
moment for quotes survives at every rationale line). Readers are GATES,
not habits: the drain lane's grade workflow runs `ledger rejected --for
<item>` before re-grading, intake prints matching rejected lines beside
join candidates, the state report lists counts. Lifecycle: bound by
compaction (a line whose item is DONE and older than N days folds into
the done body's compaction line); exit never-delete. Supersede is
routed ONE way: the body to the done home (counted there), the reason
here (outside the conservation identity by construction).

### 3.7 Orientation, measured (R4, R18)

First screen: the router table + `item ready --head` + the decision
queue + the ledger tail. Required reading: the laws file (≤60 lines) +
`lifecycle.json` + what the firing lane names. R18's tool
(`tools/entrypoint-census`, wave 0) reports THREE figures — injected
prefix lines per turn, gated lines per session, tool calls before the
first write — against the measured baseline (2,123 injected + 2,858
gated + 37 calls). Wave 2 passes only if all three fall.

### 3.8 The seam (R15, R16)

| layer | holds | drift-proof by |
|---|---|---|
| CORPUS (dotfiles, symlinked) | ethics only; accretion shrinks to a pointer | symlink |
| PLUGIN `lifecycle` (one install) | the kind registry schema, `lifecycle <verb>` (one entry point, one fire log), intake merge, lane parser + generated router, workflow registry + templates, trigger evaluation + policy, detector registry, recorders, conservation/ratio/cap checks, the leak scan, `--test` bites, the refusal table, its own docs (the only description of the mechanics) | dev-mode symlink here; pin + drift detector + rollback elsewhere |
| REPO | `.claude/lifecycle.json`, `ITEMS.md`, `ITEMS-DONE.md`, `LEDGER.md`, `lanes/*.md`, private `workflows/*.md`, the declared laws file | the tool refusing writes that break the shape |

Nothing crosses upward (templates carry no project identifiers) or
downward (a repo file declares, never restates). A query surface for
agents beyond `lane list --json` is PARKED (trigger: a leaf needs
carrier state). W0.2's `.claude/lanes.json` serves the LEGACY checker
and retires with it in wave 2; `lifecycle.json` is the new system's
single declaration.

### 3.9 The refusal table (the Begehung's structural cure)

One row per refusal or state the design names, with the INPUT that must
fire it; a row that cannot be filled is PROSE-REST, labelled, never
shipped as a check. This table is wave 1's acceptance test and the
plugin's `--test` roster — one source for both.

| refusal / state | firing input (the red) |
|---|---|
| unknown grade word on write | `item add --grade FOO` |
| unknown grade word READ (merge / old tool) | a file line with `grade: FOO` → census third answer, not a crash |
| item written outside the tool | a hand-edited block missing a slot → pre-commit shape check |
| schema above floor | `schema: <n+1>` in the head |
| PARKED without a typed blocker | `item park <id>` with prose only |
| duplicate on move (crash between append and commit) | two copies of one id → DUPLICATE |
| conservation short | a body deleted by hand → the delta fails |
| public repo, foreign-origin item | `item add` from another repo's cwd against `public: true` |
| public undeclared | a repo with no / malformed declaration → refuse, print why |
| lane body over one screen | a 61-line lane file |
| laws file over cap | line 61 |
| unbound required slot | a binding missing `upstream` |
| exact template duplication in a repo | a pasted template body |
| trigger BROKEN | a predicate that exits 2 (e.g. `gh` unauthenticated) → router shows BROKEN, not quiet |
| roster absent / repo unresolved | rm the roster; list a moved repo |
| detector without disposition | a registry entry missing `disposition` |
| unregistered persisted thing | a new file under a home no kind claims |
| kind with an undeclared stage | a registry row missing `exit` |
| ignored declaration | `.gitignore` swallowing `lifecycle.json` |
| version compare | the real cache listing (`0.9` vs `0.11`) |
| leak scan on the plugin repo | a planted `/home/<user>/…` path in a template |
| **prose-rest, labelled** | "procedure text elsewhere"; near-duplicate templates; laws-vs-method; the no-operator-quote rule; "subagents never book" |

## 4. Diff against the inventory — what survives, what is cut, what is rewritten

| existing thing | verdict | why |
|---|---|---|
| `BACKLOG.md` + `BACKLOG-DONE.md` (both repos ×2) | REWRITE → `ITEMS.md`/`ITEMS-DONE.md` by the migration tool, whose REPORT classifies every entry with its rule: READY→READY (scheduled by cap/head-rule), PARKED→PARKED with a typed blocker or NEW, RECORD→READY-unscheduled, HANDOFF/OPEN/BUST/PARTLY/CANDIDATE/FINDING/NEW/ungraded → NEW with a typed blocker or DROPPED with reason — NOTHING to the ledger by default; write-set absent → UNKNOWN; historical done bodies → the archive section verbatim | R5–R8, Begehung 1.1–1.6 |
| `## Grades` prose declarations, `Closure-home:` line, declared extra words | CUT — the tool owns the vocabulary; extras' meanings map, the report says so per entry | R7 |
| session-start banner, `session-scan.py` closure regex, `named-and-unbooked-check.py` file list, `lane-check.py` + its `lanes.json` | CUT — replaced by `lane list` and the tool's census; the restated lists die with them | R7, R9 |
| `backlog-census.py` | REWRITE — its three-answer shape (open / closed / unknown-with-counts) is designed into the successor, not cut | Begehung 2.5 |
| `docs/runbooks/*.md` (9), `~/.claude/runbooks/`, `runbook-format.md`, dev-loop "Which line are you on" | REWRITE → six one-screen lanes + workflows; three bust runbooks + claude-worktime's `cachebust-runbook.md` (a FOURTH, unregistered bust lane, in a PUBLIC repo) MERGE into one bust lane; `upstream-pr-stale` + `-round` → "pr"; `session-close`, `ship-proxy-change`, `public-comms` survive as lanes; `plugin-birth` becomes a dotfiles-repo lane | R1, R2, Begehung 4.1 |
| `docs/dev-loop.md` | DECOMPOSE — laws to the declared laws file (≤60), procedures to workflows, essays stay as reference; cut from the roster | R4 |
| threat matrix + `.status.json` | SURVIVE as the evidence record per bust class (mechanically guarded); the bust lane's DISPOSITION is an item transition that CITES the matrix row — one fact, one home | R19, Begehung 1.7 |
| `docs/directives/`, `docs/audits/`, `docs/code-reviews/`, `BEGEHUNG-MAP.md`, `README`/`CHANGELOG` | SURVIVE, each REGISTERED as a kind with its four stages (directives: retention rule from FORK-NOTES; audits/code-reviews: append-only historical, exit never, bound declared; the map: its own 14-day rule as staleness) | R20 |
| `docs/release-tests/` | DROP-proposed (D5) | R16 |
| required-reading gate/inject hooks | SURVIVE; roster shrinks | R4 |
| accretion module | REWRITE to a pointer paragraph | R15, R16 |
| insurance, routing modules | SURVIVE; routing gains a route line for lanes entered under `auto`/`unattended` | — |
| `state-report` | REWRITE — reads the done home, the ledger, the declaration's collector list; unregistered producers are findings | R9 |
| daily gate, harvest | SURVIVE as detectors with dispositions; gate gets `MemoryHigh`/`MemoryMax` + run-in-progress stamp (W0.3) | R3, R9 |
| `plugin-drift-scan` | SURVIVE as `auto-apply` WITH rollback shown | R3, Begehung 7.1 |
| plugin cache (25 versions) | BOUND to the last three, cleanup retires older; never cut to one | Begehung 7.1 |
| `corpus-pointer-check.py` (never fired) | CUT unless one planted positive fires it during migration | R9 |
| fire log without command; tool-use commit recorder | REWRITE (effect-site recorders) | R9 |
| `restrict-*-paths` deny texts | AMEND wording only (W0.5) | R10 |
| kämmung skill | SURVIVE as the retire lane's diagnosis body | R6 |
| dispatch-guards | SURVIVE untouched; "lane" is the new system's word, theirs is "dispatch" | — |
| 26 finished worktrees, 58 lane branches, 3 stalled BRIEF files | CUT by the migration's cleanup, then each a registered kind with an exit | R3, R20 |
| claude-worktime `docs/cachebust-runbook.md` (public, carries fork paths and an internal incident) | SCRUB (D7, pending) and MERGE into the bust lane | R12 |
| upstream's `CLAUDE.md` team apparatus | out of scope | — |

## 5. The plan — ranked, the audit tails and the Begehung dispositioned

**Wave 0 — today (running at the peer desk, §7):** W0.1–W0.5 as
specified; **W0.6 (pending D7)** scrub claude-worktime's public
cachebust runbook with the hygiene grep red-first.

**Wave 1 — the `lifecycle` plugin core (one opus dispatch, ~3 days):**
the kind registry schema and `lifecycle.json`; `lifecycle item
add|ready|park|close|ratio` with the intake join, typed blockers, ids,
schema line, file lock, atomic move, baseline conservation, archive
section; `ledger` line kinds and the two gated readers; `lane list`
with exit-code semantics and longhand roster state; the leak scan
moved in as a shared tool and armed on the plugin repo's first commit;
`--test` bites = the refusal table, every row red-proven; the MIGRATION
tool with its classification report (rules of §4 row 1), run on
cache-fix first (tier 1), then both dotfiles carriers (tier 2 — the
migration IS their owed retirement pass). Plugin installed symlinked
here. Acceptance: every refusal-table row red then green; migration
report reconciles entry counts; zero entries routed to the ledger.

**Wave 2 — lanes as deciders, workflows, decomposition, consumers
(parallel dispatches, disjoint files):** six lanes with predicates
proven FIRING / QUIET / BROKEN; the workflow registry with procedures
extracted from the nine runbooks, the public cachebust runbook and
dev-loop, gates executable, within the decomposition budget; dev-loop
split law / workflow / reference, laws into the declared file under
cap; the old runbooks, `lane-check.py` and `lanes.json` retired in the
same commits; accretion rewritten to its pointer; claude-worktime's
status display rebuilt on `lane list --json` (lane state, findings
waiting, ready-to-integrate — with the constraint that its code carries
no repo identifiers and its data never enters that public tree). Verify:
R18's three figures all below baseline; the checker red on a planted
stray lane over a screen, an over-cap laws file, an unbound slot.

**Wave 3 — triggers, detectors, recorders:** trigger evaluation at
session start and prompt submit under the policy knob (`unattended`
parked); `/lanes`, `/lanes ?` with the blocker chain; the detector
registry with the six producers, counts-only local notifications (ntfy
opt-in per D8); effect-site recorders; state report over the done home,
ledger and collectors; plugin cache bound to three with semver compare
and rollback printed. Verify: a planted undispositioned bust prints
`bust: FIRING (1)` at the next start and prompt submit; a planted gate
finding produces exactly one counts-only notification; a planted
errored predicate prints BROKEN.

**Wave 4 — the cut pass and the lifecycle walk armed:** everything
marked CUT in §4, each with its dependents search stated; every
surviving carrier registered as a kind; the retire lane's first full
walk run and its exits recorded; the map re-walked (Begehung round 4).

**Migration order** (per repo, opt-in by declaration; measured
2026-08-26 from the fourteen carriers under `~/dev`): tier 1 cache-fix
(329, 9 runbooks); tier 2 dotfiles root (168) and dotfiles/claude (38),
both over the tripwire; tier 3 dispatch-guards (24), claude-worktime
(20); tier 4 beat-the-books (53, 1 runbook); tier 5 when next touched:
statiker, skill-craft, daneel, begehung, kaemmung,
sd-webui-prompt-enhancer; tier 6 ai-bureau (90, dormant since May) —
archive or drop on next contact. Legacy repos keep their carrier and
lose the old banner at wave 4. Nothing outside `~/dev` enters by sweep.

**Audit tails and Begehung, dispositioned:** inventory 1,2 → wave 2; 3
→ done (W0.2); 4 → wave 4; 5,6 → W0.3; 7,10 → wave 3; 8,9 → wave 1; 11
→ wave 3 (bound, not cut); 12 → wave 4; 13 → wave 3; 14 → W0.5; 15 →
dotfiles READY; 16 → wave 1 migration. Survey 1 → §3.6; 2 → the
write-set slot; 3 → §3.3 gates; 4 → typed blockers (schedulability, not
grade); 5 → D4; 6 → R11. Entrypoints 1,2 → §3.7; 3 → W0.1; 4 → the
`pr` predicate; 5,7,8 → §3.3. Begehung: 1.1–1.7 → §3.1/§4 row 1 and the
matrix seam; 2.1–2.5 → §3.1 concurrency, §3.9, origin-by-cwd, judged
READY, census third answer; 3.1–3.5 → exit codes, install-step
negation, refuse-unless-private, longhand roster, baseline + atomic
move; 4.1–4.4 → D7, D8, plugin leak scan, session-written reasons;
5.1–5.3 → cap 60, laws-home declaration, budget; 6.1–6.4 → §3.6; 7.1–7.3
→ §3.5 rollback/semver/symlink, schema line; cross-row → §3.9.

## 6. Decisions for the operator

1. Carrier shape — tool-parsed markdown blocks. **Accepted.**
2. ~~Headless by default~~ **Withdrawn**; per-repo trigger policy,
   `on-demand` default, `unattended` parked. No commands beyond `/lanes`.
3. One plugin as the single home of mechanics; accretion to a pointer.
   **Accepted** — the plugin is `lifecycle`, installed symlinked here.
4. EP2 by local polling of upstream, not a cloud routine. **Accepted.**
5. Drop `docs/release-tests/`. **Accepted.**
6. Naming: LANE is the new system's word; dispatch-guards keeps
   "dispatch". **Accepted.**
7. Scrub claude-worktime's public `docs/cachebust-runbook.md` now (fork
   paths, captures path, an internal incident, in a public repo with no
   leak scan), as W0.6 at the peer desk, hygiene grep red-first; history
   keeps the old text as always. **Accepted (operator, 2026-08-26).**
8. Notification content and channel: counts only, never a repo or
   producer name; local desktop channel by default; ntfy (third-party
   host) an explicit per-detector opt-in for the phone case. **Accepted
   (operator, 2026-08-26).**

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
