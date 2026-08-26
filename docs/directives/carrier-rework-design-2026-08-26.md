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
PR, walk a bust — and today pays a re-derivation toll at each: 35 tool
calls before the first write on a backlog drain (median over the 26 of
27 sessions that ever wrote; corrected from 37 by the census tool's per-
case adjudication, `c52ede7`), the same
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
| R21 | **Controlled autonomy, PROPORTIONAL (operator 2026-08-26: Statiker as an IDEA — decisions have structure — not its rigor copied; heavy loops are a workflow a lane may route to, never the default).** The system may make any decision inside its declared box — a pick, a grade, a merge-at-intake, a drop, a disposition. The DEFAULT decision is light: recorded with its basis before the act (a `decision:` ledger line; the pick line) and redirectable within a window. Rigor is PULLED IN by the decision's weight, read by the lane from the item's own slots via the skip gauge's four questions (loud failure? fast check? small blast radius? one session?) — blast radius from the write-set (paths, count, live-on-write), silent-failure from whether a verifier is named, multi-session from the blocker type. Four yeses → the light default; each "no" adds one step — a verifier built, a fresh-context verdict, an enumeration, a ledger entry — and only an item heavy on every axis routes to the Statiker-shaped workflow (grounding, design loop, attack round, isolated verify). Each lane declares `Decides:` — the decisions it may take alone, each with its recording act and its weight rule; a decision outside the list returns to the operator. Lifecycle management (R20) is the substrate | operator 2026-08-26; calibration module (the skip gauge); statiker skill (as the heavy-end workflow) |
| R22 | **No caps. Every kind declares its GROWTH CONTROL, and the alarm is flow, never size** (operator 2026-08-26: "no caps at all — everything has a place, a good reason, and is controlled"; the READY cap of ten never worked, and a size tells nothing about control). Growth control is one of: bounded-by-exit (items close), compacted (done bodies and journal lines fold on a declared rule), or unbounded-with-reason. The retire lane's finding is a kind that GREW WITHOUT AN EXIT EVENT, a capture:drain ratio over the tripwire, or an injected prefix that grew (R18) — whatever the count; a large kind draining steadily is fine, a small one never draining is not. This is the corpus's own retirement doctrine (a ratio, never a size) applied to every kind; the size caps in revision 2 (laws file 60, lane body one screen, cache three) are WITHDRAWN as caps — laws-vs-method is the review's judgment with the prefix measurement as its alarm, lane bodies are held one-screen by the lane/workflow split and reviewed, the cache keeps versions by its exit rule (delete oldest past three is an EXIT rule, not a cap) | operator 2026-08-26; accretion module (retirement trigger reads a ratio, never a size) |
| R19 | **Each kind of thing has exactly one home, and a TOOL keeps it there.** Items are written only by the item tool; procedures live only in a workflow registry (procedure text elsewhere is a checker finding — prose-rest); laws live only in the repo's declared laws file; reference is free-form and never required reading; rules are minted only at their truth level. Inflation and fragmentation recurred in every carrier because each had an append path and no owner for this invariant — the corpus's prose rules against it land on a session that has to remember | operator observation 2026-08-26; inventory §A–D throughout |

## 3. The design, from a blank page — lifecycle management for everything a repo persists

Revision 2 (2026-08-26, after the Begehung round: 30 findings, 11
blocking, all accepted; and the operator's framing that the guiding term
is LIFECYCLE MANAGEMENT). Revision 1's sections on items, lanes and
workflows are restated here under one primitive rather than patched.

### 3.0 The primitive is the KIND, not the item (R19, R20)

Every kind of thing a repo persists is REGISTERED with SIX stages (stated here once, cited never restated), in the repo's declaration file `.claude/lifecycle.json`
(tracked; the plugin's install step adds the `.gitignore` negation and
the checker fails on an ignored declaration — G1's defect, closed once
per repo family, not once per repo):

    kind · home (path pattern) · writer (tool | session | producer)
    · reader (the gate, lane, report or tool that consumes it)
    · staleness (a predicate: age, use-evidence, CHANGE-COUPLING — the
      artifact this kind is about changed past the citation it carries,
      the signal age misses; or "none, declared why")
    · exit (move | compact | delete | never, with the recording act)
    · bound (a count or size, or "unbounded, declared why")

Items, done bodies, ledger lines, lanes, repo-private workflows,
template bindings, directives, audits, code-reviews, evidence carriers
(row-pins, census rows, growth fixtures), worktrees and lane branches,
plugin-cache versions, detector findings — all instances. The RETIRE
lane is the walk over every registered kind: it RE-LISTS each kind's
real home on every pass — never a cached index, which is Terraform's
state-file-vs-reality defect and the `quota_pressure` stock-vs-flow
defect this repo already booked against itself — prints each kind's
count against its bound, applies each staleness predicate, and records
each exit. A persisted thing that resolves to no registered kind is a
router finding (UNREGISTERED), and a kind with an undeclared stage is a
checker finding. The Begehung's thirty findings sort almost entirely
into "a kind with one stage undeclared" — the ledger had no exit, the
done home no staleness rule, the registry no reader, the plugin cache no
exit and no rollback, `ITEMS.md` no version — which is why this is the
primitive.

### 3.0b The INVARIANTS — the plugin's definition of "controlled" (operator 2026-08-26)

Distinct from LAWS (how a session acts in a repo) and from REFUSALS
(checks the tool runs): invariants are properties that must hold of
the workspace at every moment, whoever worked last, and they do not
care who broke them. They live in the plugin, open its docs, and its
refusal registry is derived from them; a declaring repo is held to
them by the tool, may add its own in its declaration, never subtract.
They are the standard for every project on this machine by
construction.

1. Every persisted thing resolves to a registered kind.
2. Every kind has an owner for every one of its six stages (§3.0: home,
   writer, reader, staleness, exit, growth control).
3. One home per kind; a fact lives in exactly one place.
4. Nothing dangles: every typed reference resolves; every lane has a
   reader; every producer has a disposition; every detector has a
   home.
5. Every exit is recorded — a move, a compaction, a drop, each with
   its reason and its commit.
6. Every autonomous decision is recorded with its basis before the
   act, and is redirectable.
7. Nothing enters without a reason: an item names its requirement and
   goal; a kind names why it exists; an unbounded kind names why.
8. Growth is controlled by flow, never by size (R22).
9. What the tool cannot enforce is labelled prose-rest, never
   presented as enforced.

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

MIGRATION WRITE-RULES (round 4, blocking, fixed): a migrated entry NEVER
inherits READY — the old READY grade maps to NEW with `blocked-by:
decision "regrade: was READY under the old carrier"`; every entry the
rules leave slot-incomplete is NEW with `blocked-by: decision <what the
desk must supply>`, never `NONE` — which puts all of them in the
operator's court, where staleness surfaces and never drops. `UNKNOWN`
is a DECLARED transitional value for migrated slots (goal, write-set,
done-criterion, evidence) that the grade workflow fills before READY,
that the retire lane never reads as "advances no goal", and that `item
check` reports as a count; READY is REFUSED — in `item check` over the
carrier, not only at `item add` — to any item holding an UNKNOWN slot.
`goal` is a closed vocabulary owned by the declaration; a value outside
it on a new item is a refusal row. The cache-fix dry run is regenerated
under these rules (the old carrier is byte-identical, nothing is lost).

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
then the pick. Staleness and DROPPED branch on WHOSE COURT the item is in
(probot/stale's ownership fix, prior-art lane): an item aging on
`blocked-by: decision` is in the operator's court — surfaced, never
auto-dropped; one aging on `blocked-by: evidence` or `<item-id>` is in
the machine's court — re-evaluated each pass; one with no blocker and no
grade movement after n passes is in nobody's court — that is genuine
staleness, and it exits DROPPED with its reason via the retire lane.

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
recorded transcription failure has no path) — no line cap (R22); the control is SCOPE, not
size (operator 2026-08-26: a laws file may need 200 lines — the only
question is whether every line is a law). The laws kind's own check is
a scope audit, two halves: the computable slice flags lines carrying
another kind's MARKERS — a numbered step sequence (workflow), a dated
incident (journal), a measured figure with a unit (audit), a file:line
citation wrapped in explanation (journal) — as possibly mis-homed, a
finding for review, never a refusal, since the same markers appear
legitimately in a law's one-line basis pointer; the judgment remainder
— is this line a law — is the review's, labelled prose-rest. The alarm
that the review is due is growth (R18's injected-prefix measurement),
not a number. The requirement stays that the injected prefix falls
after the decomposition (accretion's shrink saves ~242 lines); incidents and lessons → the project JOURNAL, cited
by the law or workflow they justify — no reference tier, no dev-book
concept survives (operator 2026-08-26); what fits none of law /
workflow / journal / audit is dropped. Decomposition budget: lane + workflow text ≤ half of
today's 2,375 runbook lines. "Laws, never method" is judgment and is
labelled prose-rest; the SCOPE AUDIT is the mechanism (no cap, R22).

Shared workflows across repos: registry TEMPLATES with declared slots,
bound per repo in `lifecycle.json`, step overrides allowed, copies
never. Six controls: bindings not prose (drift); duplicate-text check
is PROSE-REST — exact duplication fails, near-duplication is reviewed
(labelled, not claimed); a shared lane's predicate runs only in binding
repos; an unbound required slot is a finding, never a default; the
registry records bindings and the plugin's suite runs every template
against every binder; and the LEAK direction — templates are extracted
from a PRIVATE repo into a PUBLISHED registry — gets a real guard: the
plugin repo carries the leak scan (this repo's `absence-scan`, copied
byte-identical, both copies moving together) as a pre-push hook from
its first commit — WITH a source-scope foreign-path class enabled per
repo by declaration (round 4: the corpus-only class is right for
cache-fix, whose own prose names this machine's home, and blind in the
plugin repo, whose templates are `.md`; the plugin repo declares it on,
no exceptions; cache-fix declares it off with the reason, or on with an
allowlist — the operator's scrub call), red-proven on a planted foreign
path in a `.md` in the plugin repo before any template lands,
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
queue + the ledger tail. Required reading: the laws file +
`lifecycle.json` + what the firing lane names. R18's tool
(`tools/entrypoint-census`, wave 0) reports THREE figures — injected
prefix lines per turn, gated lines per session, tool calls before the
first write — against the measured baseline (2,123 injected + 2,858
gated + 35 calls at n=26). Wave 2 passes only if all three fall.

### 3.8 The seam (R15, R16)

| layer | holds | drift-proof by |
|---|---|---|
| CORPUS (dotfiles, symlinked) | ethics only; accretion shrinks to a pointer | symlink |
| PLUGIN `lifecycle` (one install) | the kind registry schema, `lifecycle <verb>` (one entry point, one fire log), intake merge, lane parser + generated router, workflow registry + templates, trigger evaluation + policy, detector registry, recorders, conservation/ratio/cap checks, the leak scan, `--test` bites, the refusal table, its own docs (the only description of the mechanics) | dev-mode symlink here; pin + drift detector + rollback elsewhere |
| REPO | `.claude/lifecycle.json`, `ITEMS.md`, `ITEMS-DONE.md`, `LEDGER.md` (decisions), `JOURNAL.md` (incidents + lessons), `lanes/*.md`, private `workflows/*.md`, the declared laws file, `docs/audits/` | the tool refusing writes that break the shape |

Nothing crosses upward (templates carry no project identifiers) or
downward (a repo file declares, never restates). A query surface for
agents beyond `lane list --json` is PARKED (trigger: a leaf needs
carrier state). W0.2's `.claude/lanes.json` serves the LEGACY checker
and retires with it in wave 2; `lifecycle.json` is the new system's
single declaration.

### 3.8b Where everything lives, and the flow (operator question 2026-08-26)

| thing | lives | written by | read by |
|---|---|---|---|
| invariants, kind schema, refusal registry, the `lifecycle` tool, hooks, leak scan | plugin repo `~/dev/Gunther-Schulz/lifecycle/plugin/` (global, one install, symlinked here) | plugin releases | every verb, every hook |
| workflow TEMPLATES | plugin registry (global) | plugin releases, each a reviewed PR with hygiene output | a repo's bindings |
| LANES | always LOCAL: `lanes/<door>.md` | the repo, by hand | the router (`lane list`), the session entering |
| repo-private workflows | local `workflows/` (only ≥2 lanes or over a screen) | the repo | its lanes |
| declaration `.claude/lifecycle.json` (kinds, lanes, bindings, goals, policy, laws file, homes) | local, tracked | hand once; `migrate` writes the initial one | every verb (`kind check` validates) |
| items / done home / ledger / journal | local: `ITEMS.md`, `ITEMS-DONE.md`, `LEDGER.md`, `JOURNAL.md` | items + done: the tool only; ledger: tool slots + session reasons; journal: sessions | gates, the router, the state report |
| laws file | local, NAME DECLARED — the deciding rule has three branches: `CLAUDE.md` where ours; the local overlay where the tracked one is foreign; DEPLOYED (the declaration carries `source:` naming the dotfiles path) where the overlay is deployed from elsewhere — an absent laws file is COULD-NOT-VERIFY naming the source, never a pass | sessions, or the deploying repo where `source:` is set | every session (required reading); the scope audit |
| audits | local, default `docs/audits/` (declared home) | sessions, lanes | the retire lane, readers by pointer |
| detector registry, repo roster | dotfiles (tracked), deployed by symlink into `~/.config/lifecycle/`; the roster is CREATED by `lane register <repo>` (schema wave) — an absent roster is BROKEN | the operator / a session in dotfiles; `lane register` | `lane list`, the detector runner |
| directives, code-reviews | local `docs/directives/`, `docs/code-reviews/` | sessions | readers by pointer; the retire lane (change-coupling staleness) |
| evidence carriers (row-pins, census rows, growth fixtures) | local `test/fixtures/harvested/` subdirs | the gate and harvest producers | the state report; the retire lane |
| worktrees, lane branches | `.claude/worktrees/`, `refs/heads/wt/*` | dispatches | the state report; the retire lane (exit: delete after integration) |
| plugin-cache versions | `~/.claude/plugins/cache/<marketplace>/<plugin>/` | the plugin installer | the drift detector; exit: delete oldest past three |
| detector findings | per-detector state under XDG state | detectors | `item add --source detector:` (intake) |
| the tool's FIRE LOG | `$XDG_STATE_HOME/lifecycle/fire.jsonl` — registered in the PLUGIN's own declaration | the tool | `lifecycle audit`; growth: compacted on a declared rule; exit: compact |
| this design document | cache-fix `docs/directives/` — registered as a directive with change-coupling staleness to `lifecycle/CLAUDE.md` | the judgment desk | the plugin's laws file (which cites it as normative) |

Flow: `lane list` (session start, prompt submit, `/lanes`) walks the
roster, reads each declaration, EXECUTES each declared lane's trigger
predicate → the router table. Under the repo's policy a firing lane is
entered. Its decision table maps what the predicate printed to
workflows (bound templates or local), within its `Decides:`. Each
workflow's gates are commands that must exit 0; a failed gate is a
disposition, not a retry. The lane ends in one of its closed
dispositions, each an item transition or a recorded exit. Trigger =
when; lane = which situation, which decisions, which workflows, which
ending; workflow = how. Registration: a lane or workflow file the
declaration does not list is UNREGISTERED (finding); a lane naming a
workflow that does not exist fails `kind check` (nothing dangles); a
lane with no use-evidence is stale (retire lane).

### 3.8c Decisions from Begehung round 4 (2026-08-26; 38 findings, all accepted)

- **Every verb has a wave** (law 24): schema wave — `retire`, `audit`,
  `migrate --schema-from <n>` / `--apply`, `item ready --head`, `item
  ratio` (built, now placed), `lane register`, `item check` (the shape
  verb, named), `kind sweep` (the unregistered-file half of invariant
  1, brought forward from wave 4); wave 2 — `init`, `lane new`,
  `workflow bind`, `lane list --json`.
- **Flags never share a spelling across meanings**: the schema path is
  `--schema-from <n>`; `--from <path>` stays the carrier source.
  `migrate` has two modes, dry-run (default) and `--apply`.
- **One schema version per repo**, stamped in the declaration; the
  carrier files' `schema:` lines must EQUAL it (mismatch is a finding);
  one number, one command per bump. A comment block may precede a
  carrier's schema line so a public `LEDGER.md` can say what it is for.
- **Exit codes**: argparse usage errors remap to 3 with a `usage:`
  prefix — unreadable input, never a finding (law 1). A registry row
  yielding different answer classes at different sites SPLITS into one
  row per site.
- **Typed references**: a declaration's `reader`/`writer` values are
  typed — `lane:<name>`, `verb:<subcommand>`, `hook:<name>`,
  `session`, `producer:<name>`, `operator` — prose in the slot is a
  finding; `dangling_reference` then reaches every type (invariant 4).
- **Route set per refusal row** (the round's cross-row cure): beside
  its firing input every row states the ROUTE SET it watches, derived
  from the source as the emit-site check derives sites; `--test` fails
  a row whose refusal text names an effect wider than its routes.
  Red-first: `dangling_reference` goes red on today's roster,
  `schema_above_floor` stays green.
- **The pre-commit seam exists**: the plugin declares its hooks in
  `plugin.json` and registers its shape checks with the machine's
  global hook dispatcher (`core.hooksPath`), never a second hooks path.
- **The plugin repo** is tier 1b of the migration order (its legacy
  backlog migrates with the tool, the prose grade declaration cut) and
  declares its fire log and the plugin cache as kinds; a repo born
  after the tier measurement is tiered at birth.
- **R3 on the walk's own outputs**: the migration report's findings and
  every Begehung finding enter the carrier as items via intake, never
  as prose in an audit nobody routes.
- **§3.9 below is a STALE snapshot** (22 of 49 rows at `fa45623`); the
  schema wave regenerates it from `lifecycle --test --list` and the
  design carries the generated table, never a hand copy.

### 3.9 The refusal table (the Begehung's structural cure)

One row per refusal or state the design names, with the INPUT that must
fire it; a row that cannot be filled is PROSE-REST, labelled, never
shipped as a check. **Source of truth (decided 2026-08-26 at W1b's
integration): the plugin's refusals REGISTRY is the source and this table
is its snapshot — the table updates from the registry, never the
reverse.** W1b alone added eleven rows the design's prose required but
this table did not list, which is the tell. Code-side coverage is
mechanical: every site emitting a FINDING exit maps to a registered row
or `--test` fails; and since the schema wave a second check runs beside
it, the ROUTE SET — a row whose refusal TEXT names an effect wider than
the routes the code watches fails even though its plant and control both
pass. The remainder — a refusal the prose names and the code lacks — is
found only by the end-to-end walk (Begehung), and is said so here rather
than assumed covered.

**REGENERATED by the schema wave (1d) from `lifecycle --test --list`,
which is what §3.8c's last bullet asked for.** The previous snapshot was
22 of 49 rows frozen at `fa45623`; this one is the whole registry. The
`route set` column is a CLOSED VOCABULARY where the refusal has one and
the derived emit-site count otherwise — never a truncated list of sites,
which would be a partial view standing in for its whole body.

**Generated from `lifecycle --test --list` — 54 executable rows, 7 prose-rest. Never hand-copied: the registry is the source and this table is its snapshot.**

| row (the registry's own ident) | refusal / state | firing input (the red) | expects | route set |
|---|---|---|---|---|
| `declaration_absent` | public undeclared — a repo with no declaration | a repo with no `.claude/lifecycle.json` at all | FINDING | 1 emit site(s) in declaration.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `declaration_malformed` | public undeclared — a malformed declaration | `.claude/lifecycle.json` whose bytes are not valid JSON | FINDING | 28 emit site(s) in declaration.py, verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `declaration_malformed_missing_key`<br>→ `declaration_malformed` | public undeclared — `public` absent, so the repo is neither declared public nor declared private | a declaration with the `public` key removed | FINDING | 28 emit site(s) in declaration.py, verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `declaration_ignored` | ignored declaration | `.gitignore` swallowing `lifecycle.json` (`.claude/*` with no negation) | FINDING | 1 emit site(s) in declaration.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `declaration_ignored_tracked`<br>→ `declaration_ignored` | ignored declaration — the TRACKED case, which is every declaration a real repo has once it is committed | `.gitignore` swallowing `lifecycle.json` with the declaration COMMITTED (`.claude/*`, no negation) | FINDING | 1 emit site(s) in declaration.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `kind_stage_undeclared` | a kind with an undeclared stage | a registry row missing `exit` | FINDING | 7 emit site(s) in declaration.py, verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `dangling_reference` | dangling typed reference in the declaration | a `lifecycle.json` row naming `lane: nope` | FINDING | lane, verb, hook, session, producer, operator   (a closed VOCABULARY, checked against the source) |
| `laws_scope_audit` | a line in the declared laws file carries ANOTHER KIND's marker — a numbered step sequence (workflow), a dated incident (journal), a measured figure with a unit (audit), a file:line citation wrapped in explanation (journal). POSSIBLY mis-homed: a finding for review, never a refusal, since the same markers appear legitimately inside a law's one-line basis pointer | a laws file whose law list is followed by a dated incident paragraph | FINDING | 1 emit site(s) in retire.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `laws_absent_could_not_verify` | the laws file the declaration names is not in the working tree — COULD NOT VERIFY, never a clean zero | a declaration naming a laws file that is not there (the shape an index-resolved cap check reports as 0) | COULD NOT VERIFY | (no emit site — this row's verdict is a code, not a named finding) |
| `schema_above_floor` | schema above floor | `schema: <n+1>` in the carrier head | FINDING | declaration, items, done, ledger   (a closed VOCABULARY, checked against the source) |
| `item_shape` | item written outside the tool | a hand-edited block missing a slot | FINDING | 16 emit site(s) in items.py, verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `duplicate_id` | duplicate on move (a crash between the append and the commit) | two copies of one id in the carrier | FINDING | 2 emit site(s) in items.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `unknown_grade_read` | unknown grade word READ (merge / old tool) — the census's third answer, not a crash and not folded into open or closed | a file line with `grade: FOO` | COULD NOT VERIFY | (no emit site — this row's verdict is a code, not a named finding) |
| `unknown_grade_write` | unknown grade word on write | `item add --grade FOO` | FINDING | 1 emit site(s) in verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `foreign_origin_item` | public repo, foreign-origin item | `item add` from another repo's cwd against `public: true` | FINDING | 1 emit site(s) in verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `join_undisposed` | intake is a MERGE: candidates found, no disposition given (§3.2 — the caller answers merge-into / supersede / new) | an `item add` whose write-set path a live item already carries, with no `--join` | FINDING | 1 emit site(s) in verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `new_without_absence` | `new` is taken only with a named absence (§3.2) | `item add` with no `--absence` | FINDING | 1 emit site(s) in verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `cost_test_veto` | the cost test — a one-file, one-hunk write-set with the session live is do-it-now, not book-it (§3.2) | `item add --hunks 1` over a one-path write-set, source session | FINDING | 1 emit site(s) in verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `cost_test_unverified` | the cost test could not be evaluated — one file named, hunk count not stated. COULD NOT VERIFY, never a pass | `item add` over a one-path write-set with no `--hunks` | COULD NOT VERIFY | (no emit site — this row's verdict is a code, not a named finding) |
| `blocker_untyped` | a blocker that is prose rather than one of §3.1's three closed edge types | `item add --blocked-by 'we should think about it'` | FINDING | 2 emit site(s) in verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `dangling_reference_item`<br>→ `dangling_reference` | dangling typed reference — `blocked-by <item-id>` naming an id no home holds (the ITEM half of §3.9's row; the declaration half is `dangling_reference` above) | `item add --blocked-by xx-9999` | FINDING | 7 emit site(s) in declaration.py, verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `parked_without_typed_blocker` | PARKED without a typed blocker | `item park <id>` with prose only | FINDING | 2 emit site(s) in items.py, verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `duplicate_id_cross_home`<br>→ `duplicate_id` | duplicate on move, ACROSS THE TWO HOMES — the within-file row above cannot see this one: a close appends to the done home and then deletes from the carrier, so the crash window leaves one copy in EACH file and no single-file check looks at both. DUPLICATE and RECOVERABLE, never loss | one id present in BOTH homes | FINDING | 2 emit site(s) in items.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `conservation_short` | conservation short — a body left the carrier by a path that is not a closure | a body deleted by hand → the delta fails | FINDING | 1 emit site(s) in items.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `conservation_surplus` | conservation OVER — the homes hold more bodies than were ever admitted. NOT loss, and it must not be repaired as if it were: the ordinary cause is an interrupted close. This row is not in §3.9, which names only 'conservation short'; it was found by the interrupted-move test, where the single short-message told a deletion story over the recoverable case (surfaced to the desk) | a carrier whose head under-counts what the two homes hold (here: the interrupted move's two copies) | FINDING | 1 emit site(s) in items.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `conservation_unverified` | the conservation identity could not be computed — the head declares no baseline. COULD NOT VERIFY, never a clean identity | a carrier head with `baseline` removed | COULD NOT VERIFY | (no emit site — this row's verdict is a code, not a named finding) |
| `ledger_body` | the ledger carries NO BODIES — one fixed-slot line per decision event (§3.6) | a `ledger add` whose reason spans more than one line | FINDING | 3 emit site(s) in verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `closure_home_split` | the declaration names TWO closure homes — one fact, one home (§3.1's closure MOVE has one destination) | `closure-home` and the `done bodies` kind's `home` disagreeing | FINDING | 1 emit site(s) in verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `roster_absent` | roster absent — the router is GENERATED over the roster, so with no roster there is no board, and an empty board renders exactly like one on which every lane is quiet | rm the roster; run `lane list` | FINDING | 1 emit site(s) in lanes.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `repo_unresolved` | a listed repo that does not resolve is NAMED — a router that dropped the line would print a shorter board rather than a broken one | a roster line naming a moved repo | FINDING | 2 emit site(s) in lanes.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `trigger_broken` | trigger BROKEN — a predicate exiting >=2 (§3.3's reserved code) is a FINDING, never folded into quiet: a dead lane that renders quiet is a clean board over a router that does not work | a lane whose `Trigger:` predicate exits 2 | FINDING | 3 emit site(s) in lanes.py, verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `unknown_item` | a verb naming an item no live home holds | `item ready xx-9999` | FINDING | 5 emit site(s) in verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `unknown_source` | a `--source` outside the closed door set — an unrecognised source would decide the cost test's veto silently | `item add --source somebody` | FINDING | 1 emit site(s) in verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `new_without_typed_blocker` | an item whose slots are incomplete is NEW, and a NEW item carries a TYPED blocker saying what it waits for. An incomplete item with nothing to wait for ages in nobody's court | `item add --write-set UNKNOWN` with no `--blocked-by` | FINDING | 1 emit site(s) in verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `move_uncommitted` | the move is on disk but was NOT committed, so its two halves are not durable together — the third step of the move failing, not the move | `item close` in a repo whose commit is refused | FINDING | 1 emit site(s) in verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `ledger_shape` | a ledger with no `schema:` head line — a carrier without a version cannot be refused by a future tool | a `LEDGER.md` whose first line is a ledger entry | FINDING | 2 emit site(s) in ledger.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `unregistered_kind` | `kind show` naming a kind the declaration does not register | `kind show nosuchkind` | FINDING | 2 emit site(s) in cli.py, retire.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `emit_site_unregistered` | ASSIGNED ITEM B — a site in the code emits a FINDING under a row the roster does not register: no plant, no control, no line in the §3.9 snapshot, so the roster's green says nothing about it | a planted `FINDING [<unregistered row>]` in a copy of the package, scanned | FINDING | 1 emit site(s) in roster.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `migrate_would_overwrite` | `migrate` over a repo whose successor carrier already exists — a second run would replace real work with a re-derivation of the carrier it replaced | `migrate` with `ITEMS.md` already present, no `--force` | FINDING | 1 emit site(s) in migrate.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `migration_unclassified` | an entry whose grade word no rule in §4 row 1 or §3.1 covers (D-f): reported with its grade word and line number, never given a plausible mapping | a source carrier entry graded with an unknown word | FINDING | 2 emit site(s) in migrate.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `migration_ledger_nonzero` | the acceptance criterion 'zero entries routed to the ledger' (§3.6, §4 row 1) is checked at the ARTIFACT and not only in the report | a `LEDGER.md` already carrying a line when `migrate` runs | FINDING | 1 emit site(s) in migrate.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `declaration_retired_key` | a declaration carrying a key this schema WITHDREW — `ready-cap`, whose whole premise R22 removed | a declaration still carrying `ready-cap: 10` | FINDING | 1 emit site(s) in declaration.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `leak_scan_undeclared_reason` | the source-scope foreign-path class turned OFF with no reason declared (§3.3 — the enabling decision is the repo's and it is written down) | `leak-scan: {source-scope-foreign-path: false}` with no `reason` | FINDING | 1 emit site(s) in declaration.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `reference_untyped` | PROSE in a `reader`/`writer` slot — §3.8c's reference types are closed, and prose cannot be resolved | a kind whose `reader` says "the drain lane" | FINDING | 2 emit site(s) in declaration.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `schema_mismatch` | ONE schema version per repo — the declaration and a carrier disagree (§3.8c). Not a floor question: the floor asks what this BUILD can read, this asks whether the REPO agrees with itself | a declaration stamped 2 over an `ITEMS.md` stamped 1 | FINDING | 1 emit site(s) in declaration.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `done_slot_on_live_item` | a LIVE block carrying a closed-body slot — `superseded-by:` or `blocker-moot:`, each of which records something a CLOSURE did | a READY block with a `superseded-by:` line | FINDING | 1 emit site(s) in items.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `open_grade_in_done_home` | an OPEN grade in the closure home — a body that arrived by some path that is not a close | a `READY` block in `ITEMS-DONE.md` | FINDING | 1 emit site(s) in items.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `blocked_in_done_home` | a closed body still carrying a blocker — a wait recorded against something that has stopped waiting, which is what leaves an unanswerable question in the operator's queue after the item that asked it is gone | a DONE block with `blocked-by: decision <question>` | FINDING | 1 emit site(s) in items.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `unknown_slot_misplaced` | UNKNOWN in a slot that may never hold it — a grade is one of the five and a blocker is typed or NONE, so UNKNOWN there is a value nothing can ever fill in | a block with `blocked-by: UNKNOWN` | FINDING | 1 emit site(s) in items.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `ready_with_unknown_slot` | READY over a slot nobody has ever written (§3.1) — UNKNOWN is the migration's declared marker and the grade workflow fills it BEFORE READY | a READY block whose `goal` is UNKNOWN | FINDING | 2 emit site(s) in items.py, verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `capture_dominated` | booking outrunning shipped-plus-dropped — a RATIO, never a size (R22). A large carrier draining steadily owes nothing and a small one that never drains does | a carrier that admitted four items and closed none | FINDING | 2 emit site(s) in verbs.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `kind_grew_without_exit` | a kind that GREW WITHOUT AN EXIT EVENT (the design's own replacement for a cap) — its home holds instances, it declares `bounded-by-exit`, and its exit has recorded nothing | a repo holding items with no `item close` ever recorded | FINDING | 1 emit site(s) in retire.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `unregistered_persisted_thing` | invariant 1 — a tracked file that resolves to no registered kind | a tracked file under a home no kind claims | FINDING | 1 emit site(s) in retire.py   (derived; this refusal names no closed vocabulary for the route check to compare against) |
| `route_set_unwatched` | a refusal whose TEXT names an effect WIDER than the routes the code watches — round 4's cross-row cure. The row fires correctly on the routes it does watch, so its green says nothing about the rest | the reference resolver narrowed to `lane:` alone, which is what it watched before this wave, with `dangling_reference` still claiming every type | FINDING | 1 emit site(s) in roster.py   (derived; this refusal names no closed vocabulary for the route check to compare against) lanes' BODIES are wave 2 — this build parses `Trigger:` and reports the other three parts by presence, so it has no one-screen cap to fire template bindings are wave 2 templates are wave 2 the detector registry is wave 3 the plugin cache bound is wave 3 FIRES, but NOT on the input the design names. The scanner has no foreign-path class, so a planted `/home/<user>/…` path scans clean (measured, exit 0); the row was red-proven with a capture-key token instead (exit 2). Reported to the judgment desk — closing it is either a new scanner class or an amended row, and both are design decisions. the design's own prose-rest row: no predicate exists, operator is the backstop |

**PROSE-REST — named by the design, not fireable in this build.** Labelled with the reason, never deleted to make a roster green (D-g):

| prose-rest row | why it cannot be fired here |
|---|---|
| lane body over one screen | lanes' BODIES are wave 2 — this build parses `Trigger:` and reports the other three parts by presence, so it has no one-screen cap to fire |
| unbound required slot | template bindings are wave 2 |
| exact template duplication in a repo | templates are wave 2 |
| detector without disposition | the detector registry is wave 3 |
| version compare (`0.9` vs `0.11`) | the plugin cache bound is wave 3 |
| leak scan on the plugin repo | FIRES, but NOT on the input the design names. The scanner has no foreign-path class, so a planted `/home/<user>/…` path scans clean (measured, exit 0); the row was red-proven with a capture-key token instead (exit 2). Reported to the judgment desk — closing it is either a new scanner class or an amended row, and both are design decisions. |
| procedure text elsewhere; near-duplicate templates; laws-vs-method; the no-operator-quote rule; "subagents never book" | the design's own prose-rest row: no predicate exists, operator is the backstop |

### 3.10 The plugin's own laws (operator 2026-08-26: development rules, earned this session)

Lands as `lifecycle/CLAUDE.md` at W1c's integration — the plugin's own
laws file — no cap (R22), its size reported not refused; each law's incident goes to the
plugin's JOURNAL under today's date, never inline. Laws, not method:

1. Three answers, always: clean / finding / could-not-verify. A finding
   and an unreadable input never share an exit code.
2. Every refusal is a registry row with the input that fires it, proven
   red first; a row that cannot be fired is labelled PROSE-REST, never
   deleted to green the roster.
3. The registry is the source; every table of it elsewhere is a snapshot.
   Every site that emits a finding maps to a row, or `--test` fails.
4. A red from a module-load or import error is not a discriminating red.
   The arrangement is stated: which side was old, where the expectation
   came from, baseline green first.
5. A check whose verdict is another tool's exit code draws its own pair
   from that tool, in the invocation mode the code will use, before the
   code is written around it. Flags are part of the instrument.
6. No hardcoded machine path, login, repo root or XDG root anywhere;
   boundaries are derived at run time. A public tree is the reason.
7. The leak scan is armed before the repo's own first commit and runs
   on every push; a clean scan never shown to fire proves nothing.
8. The tool is the only writer of the carriers it owns; a hand edit
   that breaks the shape fails at commit; a lock serializes writers.
9. A two-file move is one act: append, delete, commit. A crash leaves a
   DUPLICATE, never a loss, and the next check says so.
10. READY is judged, never derived. Blocker clearance decides
    schedulability only.
11. A guard that fires on legitimate work stops the lane; the repair is a
    declared exemption the guard verifies, never a softened predicate, and
    `--no-verify` is never taken — it kills every lane in the hook.
12. Versions climb and never go backwards; the birth series is `0.1.x`.
13. Installed symlinked from the dev checkout on the machine that builds
    it; pinned and drift-detected elsewhere; the cache keeps three.
14. `ITEMS.md` carries a schema line; the tool refuses above its floor.
15. Every registered kind declares all its stages, including the ones a
    later wave implements — declared-but-not-implemented is a state,
    undeclared is a finding.
16. Templates carry no project identifiers; a public repo refuses a
    foreign binding; the default under a missing declaration is refuse.
17. Reports are booked from the file, never the summary; every figure a
    lane reports is re-run at the integrating desk before it is believed.
18. A brief is complete at dispatch; a correction that matters is a
    stop-and-redispatch. The report channel names a target the executor
    can resolve.
19. An unverified negative that agrees with a held suspicion is where the
    free probe is owed.
20. What a push carried is settled at the remote, never by the local
    reflog or the hook's printed range.
21. A lane that finds a defect in its own shipped code after its report
    REPORTS it; its write grant is over.
22. A check no input can falsify is deleted, not registered; a partition
    exact by construction is reported as could-not-verify arithmetic,
    never as a green row (found by the W1c lane on its own work).
23. A design line that names a thing names its home, its writer and its
    reader; a home is always explicit, never a default the tool assumes.
24. A verb named is a verb placed in a stage; a refusal named has its
    firing input; neither exists in prose alone.
25. Every schema change ships its migration, dry-run first, over every
    declared repo, before it is applied anywhere.

### 3.11 Authoring, homes, and the judgment register (operator questions 2026-08-26)

**Every home is named explicitly in the declaration; no implicit
defaults.** A schema default is what `lifecycle init` WRITES into the
file, never what the tool assumes when a line is absent — an absent
home is a finding. The laws file is the one home with a DECIDING RULE
(own repo → `CLAUDE.md`; foreign tracked `CLAUDE.md` → the local
overlay), applied by `init` and still written as a named file.

**Authoring support is part of the plugin:** `lifecycle init`
(declaration + lane stubs for the declared doors), `lifecycle lane new
<door>` (a lane file from the format with `Decides:` / `Trigger:` /
decision table / `Ends:` stubs and a predicate skeleton), `lifecycle
workflow bind <template>` (the binding with its required slots
listed), the format docs as the guideline, and the checker to name
what is still missing. A fresh repo reaches a valid declaration and
checked lane files without reading this document.

**The plugin is the linter for every kind it owns** — declaration
schema, lane format, item shape, done-home shape, ledger line kinds,
bindings — at pre-commit through its hook and in `--test`; for
session-written prose kinds (laws, journal) the lint is the scope
audit, a finding never a refusal; a kind it cannot lint is labelled so
(invariant 9). Trigger policy is one line of the declaration.

**The judgment register — DESIGNED NOW, reviewed on evidence later**
(operator 2026-08-26: waiting for use to show a rule wrong is what
produces drift; the corpus agrees — a noticed improvement defaults to
building, and the judgment desk's earlier "not fixed now" was the
deferral in prudence's costume). Each rule below is stated concretely,
emits a FINDING never a refusal, has the ledger line as its correction
path, and records its use-evidence (fired / fired on legitimate work /
overridden) for the fire-rate review the retire lane runs.

1. *Staleness per kind* (defaults `init` writes; a repo may override):
   items — no grade movement across N retire passes AND no blocker
   (nobody's court) → stale; PARKED on `decision` → never stale,
   surfaced; done bodies — uncited by any ledger/journal/commit since
   close → compact; journal entries — cited by no law or workflow →
   stale; lanes — trigger never fired AND no use-evidence since mint →
   stale; workflows — no lane routes to it → stale; directives — a
   cited file changed past the citation → stale (change-coupling);
   audits — never (append-only, exit never); templates — no binder →
   stale. N = 3 passes, a placeholder the first walk replaces.
2. *Intake cost test*: write-set ≤ 1 file AND session live AND no typed
   blocker → the tool asks "do it now?"; any other shape → NEW. Never a
   silent decision either way.
3. *Decision weight* (R21): loud-failure = a verifier is named;
   fast-check = the verifier runs under one minute (declared); small
   blast radius = write-set ≤ 3 files, none live-on-write, none in a
   public repo's outward surface; one-session = blocker type is not
   `decision`. Four yes → light; each no → its paired step (verifier
   built / fresh verdict / enumeration / ledger entry); four no → the
   heavy workflow. The mapping prints with the pick line.
4. *Auto-apply class*: only a disposition that is REVERSIBLE (rollback
   command printed), LOCAL (touches this machine only), and RE-RUNNABLE
   (idempotent); initial members: the plugin update, plugin-cache
   cleanup past three; every addition is a ledger decision line.
5. *Laws-file deciding rule*: tracked `CLAUDE.md` whose git author set
   is only ours → `CLAUDE.md`; any foreign author in its history → the
   local overlay; `init` prints which and why.
6. *Trigger-policy default*: `on-demand` (operator decision); `init`
   writes it explicitly and names `advise` as the recommended next
   step once the router has run clean for a week — a suggestion in
   the file, never a silent switch.

**Migration on plugin update (operator 2026-08-26):** the schema line
makes an old file refusable, not migratable. Every schema bump ships
`lifecycle migrate --from <n>` as a dry-run-first pass with a report;
the drift detector's auto-apply runs that dry run over every declared
repo and reports before anything is applied; a repo whose dry run
shows UNCLASSIFIED blocks the apply for that repo only.

**`lifecycle audit` — the auditor (operator idea 2026-08-26):** the
retire lane's walk run read-only on demand, one screen per repo: every
check's three-answer result, every kind's count and growth mode,
use-evidence per lane and per judgment rule, unregistered files, and
the judgment register's fire-rate. Not a new mechanism; the same walk,
reporting instead of acting.

## 4. Diff against the inventory — what survives, what is cut, what is rewritten

| existing thing | verdict | why |
|---|---|---|
| `BACKLOG.md` + `BACKLOG-DONE.md` (both repos ×2) | REWRITE → `ITEMS.md`/`ITEMS-DONE.md` by the migration tool, whose REPORT classifies every entry with its rule: READY→READY (scheduled by cap/head-rule), PARKED→PARKED with a typed blocker or NEW, RECORD→READY-unscheduled, HANDOFF/OPEN/BUST/PARTLY/CANDIDATE/FINDING/NEW/ungraded → NEW with a typed blocker or DROPPED with reason — NOTHING to the ledger by default; write-set absent → UNKNOWN; historical done bodies → the archive section verbatim | R5–R8, Begehung 1.1–1.6 |
| `## Grades` prose declarations, `Closure-home:` line, declared extra words | CUT — the tool owns the vocabulary; extras' meanings map, the report says so per entry | R7 |
| session-start banner, `session-scan.py` closure regex, `named-and-unbooked-check.py` file list, `lane-check.py` + its `lanes.json` | CUT — replaced by `lane list` and the tool's census; the restated lists die with them | R7, R9 |
| `backlog-census.py` | REWRITE — its three-answer shape (open / closed / unknown-with-counts) is designed into the successor, not cut | Begehung 2.5 |
| `docs/runbooks/*.md` (9), `~/.claude/runbooks/`, `runbook-format.md`, dev-loop "Which line are you on" | REWRITE → six one-screen lanes + workflows; three bust runbooks + claude-worktime's `cachebust-runbook.md` (a FOURTH, unregistered bust lane, in a PUBLIC repo) MERGE into one bust lane; `upstream-pr-stale` + `-round` → "pr"; `session-close`, `ship-proxy-change`, `public-comms` survive as lanes; `plugin-birth` becomes a dotfiles-repo lane | R1, R2, Begehung 4.1 |
| `docs/dev-loop.md` | DECOMPOSE FULLY, THEN DELETE (operator 2026-08-26: no dev-book concept survives, globally) — every part sorts into one of four kinds: a rule a session must obey → the declared laws file; a procedure → a workflow; an incident and its lesson → the project JOURNAL (new repo-level kind, the corpus's journal one level down: dated, incident + lesson, cited by the law or workflow it justifies; a law without a journal pointer has no basis, a journal entry nothing cites is stale by change-coupling); a measurement → audits. What sorts into none is dropped with a ledger line. Git keeps the body | R4, R19, R20 |
| threat matrix + `.status.json` | SURVIVE as the evidence record per bust class (mechanically guarded); the bust lane's DISPOSITION is an item transition that CITES the matrix row — one fact, one home | R19, Begehung 1.7 |
| `docs/directives/`, `docs/audits/`, `docs/code-reviews/`, `BEGEHUNG-MAP.md`, `README`/`CHANGELOG` | SURVIVE, each REGISTERED as a kind with its six stages (directives: retention rule from FORK-NOTES; audits/code-reviews: append-only historical, exit never, bound declared; the map: its own 14-day rule as staleness) | R20 |
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

**What "wave 1 done" does NOT mean (W1c's slot (g), carried here so wave
2 inherits it rather than re-deriving it):** the migration output has
been consumed by nothing; the 273 archive bodies were counted and
copied, never parsed; the 18 unclassified (now decided by grade word)
were never read for meaning; `lane list` has never resolved a real
roster; the plugin has never been installed or loaded AS a plugin;
cache-fix's pre-push suite ran over stage 9's commit at the desk's
push, not the lane's. None is a failure; all are wave 2's first checks.
Also owed before wave 2: the combined schema brief (no-caps growth
control, `superseded-by:`/`blocker-moot:` as real slots, the done-home
shape check, the `retire` verb) — one declaration exists today.

**Wave 1d — the SCHEMA WAVE (one opus dispatch, brief passes this
desk):** everything in §3.8c plus: growth-control vocabulary replacing
`bound` (R22) and `ready-cap` removed; `superseded-by:`/`blocker-moot:`
as real done-body slots; the done-home shape check; the laws scope
audit replacing `laws_over_cap`; the `head-rule` predicate widened; the
migration write-rules of §3.1 with the cache-fix dry run regenerated;
the source-scope foreign-path class; the six judgment rules of §3.11
built as findings with use-evidence; `migrate --schema-from` run over
the existing declarations as its own first proof. Verifier: every new
and changed row red then green under the route-set check; `kind check`
and `item check` clean on cache-fix's regenerated dry run with 0 READY,
all migrated items blocked on a decision, UNKNOWN counted.

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
stray lane over a screen (finding), a mis-homed law line (scope audit, finding), an unbound slot.

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

**Wave 4 — the cut pass, the FILE SWEEP, and the lifecycle walk
armed:** everything marked CUT in §4, each with its dependents search
stated. Then the file sweep (operator 2026-08-26: nothing stray left
lying around): every tracked file in the migrated repo — every `.md`
first, then the rest — is sorted into exactly one of three outcomes,
recorded per file in the migration report: (a) an existing registered
kind; (b) a REPO-SPECIFIC kind declared in `lifecycle.json` with its own
writer / reader / staleness / exit / bound — legitimate, and the only
way a one-off file stays; (c) removed, with a ledger line naming the
commit (git keeps the body). No fourth outcome. The tell to hunt: a
file whose NAME wears a kind's costume — `HANDOFF-*`, `*-BRIEF-*`,
`SESSION_STATE*`, `FORK-NOTES`, `*-OBSERVATIONS`, a `dev-notes/`
directory, `docs/*.md` prose, a fork's inherited upstream `README`/
`CHANGELOG` — each is an item, a directive, a journal entry, a law, an
audit, or nothing. Afterwards the rule holds by construction: an
unregistered file is a router finding, so nothing stray re-accumulates
unnoticed. Every surviving kind registered; the retire lane's first
full walk run and its exits recorded; the map re-walked (Begehung
round 4).

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
