# Handoff 2026-07-30: session restart after CC Agent-tool denial

Written by the ending session (633915a8, Fable, compacted 10:19Z) for its
successor. The ending session's Agent tool broke post-compaction; all
other state is clean and verified. Read this top to bottom before acting.

## CORRECTION (2026-07-30, successor session 78b3e7fe) — root cause refuted

The "Why the restart" section below is WRONG; kept as historical record.
There was no Claude Code bug. All 8 denied Agent dispatches in session
633915a8 (and 3 more in the successor + fresh-session tests) replay
offline as denies by our own dispatch-guards `brief-reminder` hook, each
with a specific lane: the post-compaction wave-2 prompts pointed at the
tail-bearing brief FILE while guard ≤0.1.8 read only the prompt (fixed:
0.1.9 verifies referenced brief files — the operator-settled rule is
tail inline OR via file brief, channel line always prompt-side), one
probe was denied by a matcher defect (single-line anchor vs. the doc's
own line wrap), and the rest were genuinely non-conforming briefs.
Compaction correlated because it degraded the BRIEFS (free-composed,
invariants dropped), not any permission state.

Why it was misattributed, and what changed:
- The model never saw the guard's reason: brief-reminder emitted only
  `systemMessage` (user UI), so the model got the harness's bare
  "Hook PreToolUse:Agent denied this tool". Fixed in dispatch-guards
  0.1.8 (9f33229): every deny is dual-field (`permissionDecisionReason`
  reaches the model) and source-tagged `[dispatch-guards/<hook>]`.
- `toolDenialKind` is NOT a truth-bearer: it records "permission-rule"
  even for real hook denies (counterexample: fresh session 3741ed60,
  guard message visibly displayed, field still "permission-rule"). The
  lesson candidate below asserting the opposite is retracted.
- The offline hook replay that "eliminated" the hooks never went red:
  it reported "no deny JSON" on payloads that demonstrably produce deny
  JSON (instrument fault, likely fail-open on malformed input).
- The tengu_harbor_permissions flag cache was flipped and restored
  during diagnosis; a conforming dispatch succeeds with the flag true.
  No evidence implicates it.
- The #73434 comment posted from this handoff's evidence stands on the
  refuted replay; a correction is drafted (operator GO per thread).
- DD §2 now states the placement rule (settled after one same-day
  over-narrow render was caught by the operator): the tail reaches the
  agent inline OR inside a brief file the prompt names; the channel
  line alone is always prompt-side (dotfiles 1c034e5 + dcf7997,
  guards 9f33229 + a737cc7).
- The wave-2 brief gained its labeled grounding section; its dispatch
  payload now replays as ALLOW on guard 0.1.9 — wave 2 is dispatchable
  as written once the operator releases it.

## Why the restart

From the compaction boundary (10:19:14Z) onward, EVERY `Agent` dispatch
was instantly denied — 4/4 attempts, while Bash/Edit/Write/Task tools
kept working. Root cause, as far as locally provable:

- The transcript records each failure as `"toolDenialKind":
  "permission-rule"` — a CLI-local permission-layer verdict produced
  BEFORE any API request exists. The visible error text ("Hook
  PreToolUse:Agent denied this tool") is mislabeled; do not trust it.
- It is NOT our hooks: the exact denied payload passes every registered
  hook offline (dispatch-guards 0.1.2–0.1.7 cache + dev repo, worktime,
  GitKraken — all exit 0, no deny JSON).
- It is NOT a permission rule: `Agent(*)` sits in allow
  (~/.claude/settings.json, identical to dotfiles source); no deny rule
  in any settings layer (user/project/local/managed — checked all)
  matches Agent; session mode acceptEdits throughout.
- It is NOT the proxy: a PreToolUse denial never reaches the wire; proxy
  journal since 08:40 shows zero errors/guard events; the same serving
  code (pin 3730d27, restarted 08:41) handled a successful dispatch at
  08:45. Attribution done per dev-loop (own event logs first).
- Upstream match: anthropics/claude-code #73434 — instant (~18–25ms)
  client-side denials of Agent/Edit/Write with no matching rule/hook,
  "grant state appears to reset mid-session", suspected feature-flagged
  permission path (tengu_harbor_permissions). Our variant: the reset
  landed exactly at the compaction boundary; CC 2.1.220, entrypoint cli.
- DONE (operator GO 2026-07-30): evidence posted on #73434 —
  https://github.com/anthropics/claude-code/issues/73434#issuecomment-5129864395
  (compaction-boundary trigger, 4/4, hook-replay elimination). Watch the
  thread for maintainer follow-up; sanitized transcript excerpts were
  offered.

If the fresh session's first Agent dispatch is ALSO denied, the state
survived the restart — then suspect the flag/machine level, not the
session; check `claude --version` drift and retry after
`/permissions` inspection. Do not burn turns re-deriving the above.

## Production state (verified this morning)

- Serving: pin 3730d27, all protection switches + UPSTREAM_ERROR_LOG=on.
- Gate sweep: ran 12:20–12:30 on the serving config, clean finish
  (systemd exit 0, 9m41s, no violations — see cache-fix-gate journal).
- Upstream error log live at ~/.claude/usage-log/upstream-errors.jsonl:
  exactly 2 records, both the known 2026-07-30 tail-strip 400s (ours,
  fixed by e0f8fcb). First-week correlation check (harness task #3) is
  due ~2026-08-06 — needs a week of data, do not run early.

## The one open work item: PR port wave 2 (harness task #7)

Operator released the hold ("we could do all this now", 2026-07-30).
The brief is DONE and decision-complete:
`docs/directives/pr-wave2-port-brief.md` (committed d180b58). It maps
10 fork commits (da4e7e1..e0f8fcb) into worktrees pr1/pr4/pr7/pr9
(slices #272/#276/#278/#280) + rebases pr10 (#281). Execute it via an
opus dispatch (preferred; brief-tail already pasted in the brief file)
or inline if dispatch is still broken — the brief works for both.

After execution, the DISPATCHER'S half (never delegated):
1. Verify in the worktrees: run each slice's acceptance diff and named
   test commands from the brief yourself.
2. Push: normal push for pr/insertion-normalization,
   pr/verification-tools, pr/output-guard, pr/prefix-diff-attribution;
   `--force-with-lease` for pr/retire-messages-cache-breakpoint.
3. Comment on PRs #272/#276/#278/#280/#281 (bot identity per tracked
   CLAUDE.md: `TOKEN=$(~/.claude/github-apps/generate-token.sh
   proxy-builder) && GH_TOKEN=$TOKEN gh ...`; sign-off suffix per repo
   convention — read an existing morning-wave comment first and match
   it). Note in #276's comment: the fresh-session-sort extension change
   rides with its replay-exemption checker (e41e068, deliberate); in
   #278's: the suppression test skips without the pinned fixture by
   design.
4. Approval labels: any prior approvals are stale after these pushes
   (repo policy — label freshness is timestamp-checked).

## Follow-up: update our threads on anthropics/claude-code (operator request 2026-07-30)

After the wave-2 work, draft evidence updates for the CC-repo threads we
already own — post only after operator GO per thread (today's precedent:
#73434 drafted, GO'd, posted): 
- #76606 / #78660 (reminder re-shaping family): today's NEW shape — the
  MERGE variant (two reminders wrapper-stripped, "\n\n"-joined into one
  standalone; the 587k event), oscillation between already-seen forms,
  and that content-identity suppression + join-hash absorbs all of it.
  Evidence: fixture test/fixtures/harvested/oscillation-s-633915a8-863.json,
  commits 78940a0/e0f8fcb, census clean after.
- #81967 (tools-list): tonight's toolsBytes growth step from deferred
  tool loads (harvest snapshot b3ba6fd) if it adds measurement value.
- #82229 (our issue): check whether today's findings change its state.
- #73434: already updated today — watch for maintainer follow-up only.

## Also pending (no action until trigger)

- 88f140e (upstream-change-detection: messages.count-only diffs stop
  alarming) is NOT in any slice — candidate for its own small upstream
  PR; needs operator GO before creating.
- Week-of-soak summary committed on #272/#273 threads, due ~2026-08-05
  (material: gate-status history + worktime --cold ledger).
- BACKLOG.md carries everything parked, each with its named trigger.
- Fire-ledger build (raw/absorbed columns) is booked ready in BACKLOG.

## Lesson candidates from the incident (mint only if they recur)

- CC's tool-denial error text can mislabel the denial source; the
  transcript's `toolDenialKind` field is the truth-bearer.
- A compaction boundary is a state-loss suspect for CLI-side session
  grants, not just for conversation context.
