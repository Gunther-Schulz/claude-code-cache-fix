# Runbook: ship a proxy change

Trigger: intent | a session is about to commit and deploy a change touching `proxy/**` (or a doc/tools-only commit riding the same lane) from this repo's `main` to the running `cache-fix-proxy` service

Standing procedure, written for a fresh context. Consumer: D1 and every
future proxy ship — booked because the deploy discipline was scattered
across three homes and a fresh context reconstructed it from all three or
missed a step. The upstream catch-up merge (FORK-NOTES.md's
"Update-from-upstream procedure") ENTERS this lane as a caller: its
restart-and-repin tail is the same seven steps below, not a separate
sketch, and that block stops being the only carrier for the sequence once
this file exists.

Companion facts, by pointer — read there, not restated here:
`FORK-NOTES.md` ("⚠ Avoid restarting the proxy during a live Claude Code
session" for the restart-transparency argument and its state-key/freeze-logic
exception; "Update-from-upstream procedure" for the merge-then-ship tail this
lane also serves), `CLAUDE.local.md` ("Deployment coupling" for the pin
mechanics, the restart unit, the gate run, and what doctor checks),
`docs/directives/robustness-threat-matrix.md` (row 3, the restart-transparency
verdict and its state-key/freeze-logic exception), `docs/dev-loop.md`
("Replay the configuration that is SERVING, not the defaults" for the
DECLARED/RUNNING/VERIFIED triple; "Before a restart: price it against LIVE
sessions, not the corpus" for why the exposure tool takes `--match`, not just
`--window-min`).

## The steps

1. **Row-3 declaration owed?** Does the change touch state KEYS or freeze
   logic (threat matrix row 3's exception to restart-transparency)? If yes,
   state the declaration NOW, before the restart in step 5 — naming the
   affected class and its expected one-time cost — not after the bust
   already happened. If the change is a doc/tools-only commit with no
   `proxy/**` diff, the answer is trivially no; say so and continue.

1b. **Run the A/B verdict tool, and read its silence correctly.**
   ```sh
   node tools/verdict-ab.mjs <last-shipped> .
   ```
   `tools/verdict-ab.mjs` diffs two trees' REPLAYED verdicts over the
   fixture corpus, but it loads exactly one module (`EXT`,
   `proxy/extensions/insertion-normalization.mjs` as of this writing — read
   the constant at the top of the file, not this sentence, since it can
   move) and nothing else. This repo carries 42 files under
   `proxy/extensions/`. A change to any of the other 41 leaves `EXT`
   byte-identical between the two trees, and the tool exits 2 printing
   COULD NOT VERIFY — **that is the EXPECTED answer for a change outside
   `EXT`, not a failure, and it says nothing about whether THIS ship is
   safe.** Read it as "this tool had nothing to say," never as "this ship
   passed." A change that DOES touch `EXT` gets a real comparison instead:
   exit 0 (IDENTICAL across every replayed verdict) or exit 1 (at least one
   diverges, printed) — that result is load-bearing for step 1's judgment.
   **Why a step that mostly reports could-not-verify is worth having:** the
   restart-transparency call in step 1 was, until this step existed, a
   judgment with no mechanical arm anywhere in this runbook and no line
   even naming the tool (`grep -c verdict-ab` over this file returned 0).
   This step checks the one file the tool DOES cover instead of assuming
   it, and it makes the other 41 files' blind spot VISIBLE at ship time
   instead of silently absent. A step that read as a gate while returning
   could-not-verify on almost every real ship would train the override
   reflex within a week — so this step is deliberately not styled as one;
   it is styled as a measurement whose usual result is "not applicable
   here," stated as such rather than skipped.
   Widening the tool to load the changed extension(s) instead of the one
   hardcoded module is a real, undecided design question — not this step,
   and never bundled with it.

2. **Session boundary confirmed.** Restarts are cache-transparent (row 3)
   unless step 1 said otherwise, but "cache-transparent" is a claim about
   the DIFF, not about who pays — price the live exposure before treating
   the restart as free:
   ```sh
   node tools/restart-exposure.mjs --window-min 60                 # worst case
   node tools/restart-exposure.mjs --match '<affected class>'      # the real number
   ```
   Run the second form whenever step 1 named an affected class; run at
   least the first form otherwise. A non-trivial number here is a decision
   point (restart now vs. wait for a quieter window), not a step to note
   and proceed past.

2b. **Name the skip-gauge outcome, and let it decide what must happen BEFORE
   step 3.** The gauge itself is the global corpus's (Calibration); this step
   is only its FIRING MOMENT, which is the half that was missing here. State
   the outcome in one line — "gauge: clean", or each no with its paired
   mechanism — and for a `proxy/**` change answer the two axes explicitly:
   would a failure be SILENT, and is the blast radius large? On this
   deployment the second is almost always yes, because the proxy fronts every
   Claude Code session on this machine.
   - **Both noes → a fresh-context review of the BUILT change runs before the
     push,** and where the change also rests on an unverified behavioural
     premise about an external system and spans sessions, the corpus's
     escalation applies: ITERATED falsification rounds until one returns zero
     delta, not a single round (Insurance, "Escalation past one-shot
     review"). One-shot review misses two classes by construction — a premise
     silently substituted between cycles, and a fix that OVERSHOOTS, visible
     only when a later round re-falsifies it.
   - **Fewer than both → say so and continue.** This step is deliberately not
     an unconditional review gate: a check that fires on every ship is the
     check-that-fires-on-a-non-defect shape, and it would train the override
     reflex that kills it.

   **Why this is a STEP and not a note, which is the same argument step 4b
   makes.** Push is step 3 of eight, so every verification this lane owns —
   pin, restart, gate run, doctor — sits AFTER the publish boundary. `main` is
   this machine's deployed state AND a public repo whose history is permanent
   (CLAUDE.local.md, the publication bar), so a review after step 3 is a
   post-mortem on live traffic rather than a gate. The repo already agrees
   with itself here: the hygiene scan sits at pre-push for exactly this
   reason, and the ranking rubric carries irreversibility as its own
   partition. Measured 2026-08-18: the SendMessage-preload ship ran its review
   before the push only because the backlog entry happened to carry the gauge
   outcome, written by the session that booked it the day before — this lane
   contained no step that would have asked (`grep -niE
   "review|gauge|skip.gauge"` over this file returned only the phrase "written
   for a fresh context", against the same pattern matching in every other
   runbook, so the zero was a measurement). A missing STEP, not missing
   knowledge, which is the class this runbook set exists to close.
   `[GRADUATE -> a pre-push check that fails when a proxy/** commit's own
   entry recorded two gauge noes and no review is booked against its hash;
   trigger: a second proxy ship where the review fired by recollection rather
   than by a step]`

3. **Commit + push.** Land the change on `main` in this repo.

4. **Pin bump in dotfiles.** **Doc/tools-only commits skip steps 4–7
   entirely** — if step 1 already established there is no `proxy/**` tree
   change, stop here; the ship's disposition is "shipped (doc/tools-only,
   no restart owed)". Otherwise:
   ```sh
   git rev-parse --short HEAD:proxy
   ```
   and set that value as `CACHE_FIX_PROXY_TREE_PIN` in the dotfiles repo's
   `bootstrap/manifest.py`, committed there (dotfiles is a separate repo
   with its own write boundary — this step happens outside this repo's
   checkout).
   **THERE ARE TWO PINS, and this step used to name only one.** dotfiles also
   carries `CACHE_FIX_PIN` — the `/health` VERSION STRING, not the tree — and
   the doctor FAILs (not warns) when `/health`'s `version` differs from it.
   Nothing in steps 1–7 looked at it, so a merge that bumps `package.json`
   turns the operator's health check red at the next restart with no step
   having asked. Measured 2026-08-16: the upstream catch-up merge moved
   `package.json` 4.3.0 -> 4.4.0-beta.0; `/health` reported 4.3.0 and passed
   before the restart and 4.4.0-beta.0 and FAILED after, while the tree pin
   was correct throughout. Both pins live in one file and only one was owed.
   The cheap read, and it is a real filter rather than a glance:
   ```sh
   git diff <last-shipped>..HEAD -- package.json | grep '"version"'
   curl -s 127.0.0.1:9801/health | grep -o '"version":"[^"]*"'   # after step 5
   ```
   A moved version string means `CACHE_FIX_PIN` is owed in the same dotfiles
   commit as the tree pin. Empty means it is n/a — say which, because the
   doctor's FAIL is the only other thing that will tell you, and it tells you
   after the restart rather than before.
   `[GRADUATE -> a script that runs the rev-parse and edits
   CACHE_FIX_PROXY_TREE_PIN directly instead of a hand copy-paste into
   bootstrap/manifest.py; not yet booked, trigger: a second instance of the
   pin value being copied wrong or the edit landing in the wrong repo]`

4b. **Enable + classify — new-gate ships only.** If the change INTRODUCES or
   RENAMES a `CACHE_FIX_*` gate: add its `Environment=` line to
   `cache-fix-proxy.service` and `systemctl --user daemon-reload`; classify it in
   dotfiles `bootstrap/manifest.py` — `CACHE_FIX_GATES_ACTIVE` (with the reason)
   or `CACHE_FIX_GATES_PARKED` — plus its `CACHE_FIX_GATE_ACCEPTANCE` entry
   naming the probe that proved it safe to turn on.
   **Why this is a step and not a note.** A mitigation shipped without it is
   DORMANT: step 5's restart serves the old gate set, and step 7 then reads
   green because all three of its answers agree on the gate's ABSENCE — the
   three-way compare is a consistency check, so a gate missing from every
   answer is invisible to it. Only the doctor's source-derived roster check
   catches that, and it catches it after the fact.
   The cheap read that decides whether this step is owed, and it is a real
   filter rather than a glance at the diff:
   ```sh
   git show <commit> | grep -E '^[+-]' | grep -o 'CACHE_FIX_[A-Z_]*' | sort -u
   ```
   Empty means no gate token moved and the step is n/a; the filter is proven
   able to fire on `d6647cc` (`CACHE_FIX_ALIAS_REGISTRY`), which is what makes
   the empty result an absence rather than a filter that never matched.
   **THERE IS A THIRD COUPLED HALF, and it is in THIS repo, which is why the
   two dotfiles-side ones above did not cover it.** Added 2026-08-16, the same
   day and the same shape as step 4's two-pins correction: shipping a gate
   touches fork code, dotfiles, AND the restart, and 4a/4b tracked only the
   last two. The fork-side half is `proxy/gate-allowlist.mjs` — a gate the
   deployment turns ON must be in `PUBLISHABLE_GATES`, or `/health` publishes
   it as `<redacted>` (deny-by-default, working as designed) while the unit
   declares a value, and **step 7's three-way compare can never agree**. It
   FAILS with "Unit geaendert ohne Restart" about a process that was just
   restarted — a red that is wrong about its own cause and therefore stays red
   forever. Measured live on `CACHE_FIX_PREFIXDIFF_CONTENT`, and it was the
   SECOND instance in one day: `CACHE_FIX_COALESCE_SIDECAR` had hit it hours
   earlier.
   The cheap read, same form as the filter above:
   ```sh
   git show <commit> | grep -o 'CACHE_FIX_[A-Z_]*' | sort -u | while read g; do
     grep -q "\"$g\"" proxy/gate-allowlist.mjs || echo "NOT PUBLISHABLE: $g"
   done
   ```
   A gate named in the diff and absent from the allowlist is the finding. Two
   things this deliberately does NOT say: not every `CACHE_FIX_*` token
   belongs there (the allowlist is deny-by-default on purpose, and a key naming
   a path, URL, command or credential must never be added — the suite pins that
   rule); and the entry belongs in the SAME commit as the gate, not in a
   follow-up, or the first restart serves a proxy the doctor cannot verify.
   `[GRADUATE -> the check above as a real script beside the other ship
   checks; trigger: a third gate shipping without its allowlist entry]`

5. **Restart + health gates check.**
   **First, project what the boot sweep would delete — this is BEFORE an
   irreversible boundary, which is the only side of it worth checking from:**
   ```sh
   node tools/snapshot-sweep-projection.mjs      # exit 2 = it would delete another extension's files
   ```
   prefix-diff's retention sweep runs on the FIRST REQUEST after a restart and
   its deletions are terminal; nothing in the extension asks anyone first. On
   2026-08-16 an unanchored scope regex would have destroyed 13,699 co-tenant
   attribution logs on the next restart, and it was found by building this
   projection by hand rather than by any check firing. A non-zero own-deletion
   count is normal (the age and key-cap passes doing their job); a non-zero
   FOREIGN count is a blocking finding, not a number to note.
   ```sh
   systemctl --user restart cache-fix-proxy && curl -s 127.0.0.1:9801/health
   ```
   Confirm `/health`'s `gates` field is what you expect to be RUNNING —
   this is the RUNNING answer in the DECLARED/RUNNING/VERIFIED triple
   (dev-loop.md, "Replay the configuration that is SERVING").

6. **Gate run.**
   ```sh
   systemctl --user start cache-fix-gate
   ```
   This produces the VERIFIED answer (what the sweep replayed) once it
   finishes; see `docs/runbooks/sweep-finding.md` if it reports a finding.

6b. **Re-run `serving-gate-lint` AFTER the restart, whenever this ship ADDS a
   gate — a run from before the restart certifies nothing about the gate you
   just added.**
   ```sh
   node tools/serving-gate-lint.mjs   # exit 0, or fix the named file
   ```
   The lint derives its serving set from `/health`, so its verdict is only
   ever about the configuration running at the moment it ran. Turning a gate
   ON makes every test file that drives that extension without naming the gate
   newly non-compliant — the gap was always there, the flip is what makes it
   visible. Run it before the restart and it reads the OLD serving set, passes,
   and says nothing about the gate this ship exists to add.
   Measured 2026-08-18, and it reached a push: `CACHE_FIX_TOOL_PRELOAD` went
   serving in the morning with a pre-restart lint run recorded as exit 0; the
   finding (`deferred-tool-description-absorb.test.mjs` driving the extension
   without naming the gate) surfaced only that afternoon, on the next run, and
   was first misread as a defect in the change that happened to be in flight.
   `[GRADUATE -> the lint runs from the gate unit, so the sweep re-asks it
   daily against whatever is serving; BACKLOG.]`

7. **Doctor's three answers agree.** DECLARED (`Environment=` in
   `cache-fix-proxy.service`) / RUNNING (`/health`'s `gates`, from step 5) /
   VERIFIED (`gates` in `cache-fix-gate-status.json`, from step 6) must all
   match before this ship's restart is trusted for production. A mismatch
   between any two makes the third meaningless too (dev-loop.md) — that is
   a finding, not a step to re-run hoping it clears.
   **VERIFIED is the smaller set by construction, and the compare is a union,
   not an equality.** The sweep replays two gates OFF on purpose —
   `CACHE_FIX_REQUEST_CAPTURE` would capture the captures, `CACHE_FIX_SESSION_MIRROR`
   would write mirrors — so `gates` carries exactly two fewer than the unit.
   (This line read "nine where the unit carries eleven" until 2026-08-16; the
   unit carries TWELVE today and the sweep replays ten. Hardcoding the pair was
   the defect — the counts move whenever a gate is added, while the RULE, minus
   exactly the two artifact-only gates, does not. Read the numbers off the two
   commands below rather than off this sentence.)
   The status file names them in `gatesExcludedArtifactOnly` (added 2026-08-11
   for this step: the stdout line that used to be the only carrier sits behind
   `!args.quiet`, and the scheduled run passes `--quiet`, so the artifact this
   step reads never carried its own exclusion). The exact compare:
   ```sh
   node -e 'const j=require(process.env.HOME+"/.local/state/cache-fix/gate-status.json");
     console.log([...j.gates.map(g=>g.split("=")[0]), ...j.gatesExcludedArtifactOnly].sort().join("\n"))'
   systemctl --user cat cache-fix-proxy | grep ^Environment= | sed "s/^Environment=//" | tr " " "\n" | cut -d= -f1 | sort
   ```
   Those two lists must be identical. A status file with no
   `gatesExcludedArtifactOnly` predates this step — re-run the gate rather
   than comparing nine against eleven and calling it a mismatch.
   `[GRADUATE -> a single wrapper chaining steps 5–7 (restart, /health
   check, gate run, doctor's three-answer compare) so a fresh context runs
   one command instead of four hand steps in sequence; not yet booked,
   trigger: a second proxy ship where one of the four hand steps is run out
   of order or skipped]`

## Disposition

Every run of this lane ends at one of two states:

- **shipped** — every owed step (1–3, or 1–7 when `proxy/**` changed, with 4b
  answered either way) completed, with step 7's three answers agreeing. A run
  that reports "shipped" without saying whether 4b was owed has not answered
  it: n/a is a result and silence is not, precisely because step 7 cannot see
  the omission.
- **aborted-with-reason** — halted at a named step, with the reason (a
  STOP signal below, an operator hold, a failed check) stated in whatever
  record this session is carrying (chat, ledger, commit message) before
  ending the session.

STOP signals, each returning the question rather than being bridged:

- Step 1 finds a state-key or freeze-logic touch and no declaration has
  been stated yet — stop before step 5, state it, then resume.
- Step 2's exposure tool reports a live match large enough that the
  operator would want to wait — surface the number, do not restart past it
  silently.
- Step 7's three answers disagree — this is itself a finding; do not
  restart again "to fix it" without first reading why they disagree (row
  3's own attribution trap: a bust around a restart is often a config
  change flipped at the same time, not the restart itself).

## Limits (the box)

- Never treat a restart as free (skip step 2) just because row 3 calls
  restarts cache-transparent in general — that verdict is about the diff,
  step 2 is about who is paying right now.
- Never restart to "investigate" a finding — append-only event logs need
  no live intervention (FORK-NOTES.md).
- Never bump `CACHE_FIX_PROXY_TREE_PIN` for a commit that did not change
  the `proxy/` tree, and never skip the bump for one that did.
- Never soften step 7's three-way compare into a two-way one, and never
  book a ship as "shipped" while any of the three answers disagrees.
- This lane WRITES/EXECUTES the deploy; it does not decide row-3
  mitigability or redesign the restart-transparency argument — those
  live in the threat matrix and FORK-NOTES respectively, by pointer.

## Report

Close a run of this lane with the dispatch-discipline §2 report form:
items completed with evidence (which steps ran, doc/tools-only vs. full
1–7, step 2's actual exposure number), checks run with real output (the
`/health` response, the gate's verdict, doctor's three answers verbatim —
not a summary), gaps (any step that could not execute as written,
surfaced as a question), deviations, lessons, files/commits touched (both
repos), and what was NOT verified. A run that reached `aborted-with-reason`
names the STOP signal and the resume path, not just that it stopped.
