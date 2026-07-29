# claude-code-cache-fix (fork) — open operational items

Proxy-domain parking. Deployment-side items (which gates run on which
machine, pins, acceptance records) live in the operator's dotfiles repo;
SYSTEM items — code, PRs, investigations, upstream threads — live here.
Fork-only file, excluded from PR slices like FORK-NOTES.md. One item per
bullet, evidence pointer included.

## Open

- **Upstream PR series #272–#281 (ten open, #281 draft) — await review.**
  Rebase worktrees: `~/dev/vendor/cache-fix-pr{1..10}`. #281 flips to
  ready when #272 merges (either side can; `gh pr ready 281`). Residue
  riding with rebases or a final chore PR: +35 lines of test hardening
  (install-service / proxy-wrapper / read-dedupe tests) and
  proxy-restart-transparent.test.mjs. PR2's copy of
  session-key-invariants.test.mjs excises the prefix-diff tenantId case;
  it lives in #280's proxy-prefix-diff.test.mjs.

- **COMMITTED on PR #272 and #273 threads: week-of-soak summary, due
  ~2026-08-05.** Material: cache-fix-gate-status.json history + the
  worktime --cold ledger (preventable vs TTL-idle split).

- **Watch threads** for responses: anthropics/claude-code #76606,
  #81967, #78660 (our comments with measurements), #82229 (our issue),
  cnighswonger PRs #272–#281.

- **ECONNRESET on >200K cold contexts (CC#79989) — exposure noted,
  mitigation candidate.** This fleet runs the 1m beta at 700k+ contexts.
  If a session hard-fails every request after going cold, this is the
  first hypothesis; the candidate mitigation is a forward-path
  retry/backoff. Not built: no local occurrence yet (deferral basis:
  zero observed instances here — an occurrence is the build trigger,
  and the threat-matrix coverage section carries the class).

- **Row 2 (threat matrix): TTL keepalive** — OPEN since 2026-07-27,
  phase-3 candidate, cost-positive only if the operator returns after
  idle; needs idle-detection + opt-in. Unchanged.

- **Reminder-swap (#76606) measured in-house, unmitigated — two named
  pieces** (evidence: s-633915a8 n=26->28 @2026-07-29T16:52:11Z, 124k
  re-billed; matrix coverage line RE-OPENED same day). (a) READY —
  census block-migration annotation: classify "same bytes left an
  inline block and appeared as a standalone message (or reverse)" on
  splice/edit pairs, beside anchorDelta; the two session-scratchpad
  extractors (splice-extract/splice-context, 2026-07-29) are the
  prototype; done-criterion: annotation emitted on the harvested shape
  and red-tested by mutating it; also fixes harvest novelty blindness
  to the compound shape (this event harvested 0-novel). (b) PARKED —
  mitigation design (may the proxy re-render CC's new shape back to
  the cached shape?): blocked on the UNVERIFIED absorb question
  (replay the pair under --trace, serving gates — which branch
  declined) and entangled with the restored-block safety incident
  (out != in); design after that answer exists. Instance-pinning of
  this event's bytes rides the existing "Harvest pins instances" item
  above (second motivating instance).

## From the closing-gate sweep (2026-07-29, opus dispatch) — parked with bases

- **Orphan telemetry consumers (Q4).** Alarm files written by ON gates
  that nothing reads: `guard-events.jsonl` (output-guard restores),
  `upstream-changes.jsonl` (row 5's alarm), insertion/deferred event
  logs, session mirrors; plus status-file fields (`gateSource`,
  `fidelityMutated*`) and boot-record `proxyTree`. Design ONE consumer
  pattern (likely: more shape-verdicts entries reading each file's
  recency + alarm count) rather than N bespoke checks. Deferral basis:
  consumer DESIGN per file is judgment work (which absence fails, which
  warns), not a mechanical port. Effort M.
- **Harvest pins instances, not only classes (Q2).** Fixtures bank one
  exemplar per CLASS; the evidence behind specific verdicts (row 4's
  distribution on s-58c979ce, acceptance strings citing s-538c0aef)
  still rots with rotation. Spec sketch: `harvest --pin <key> <n..m>`
  freezes a sanitized range as a named fixture; matrix rows and
  acceptance strings then cite fixtures, not capture keys. Effort M.
- **Row 6's isolating query is built and unread (Q3).** findToolsDeltas
  emits exactly the tools-only classification row 6 says "cannot be run
  as-is". With --census now on every sweep, read the answer off the
  next gate status and update row 6. Effort S, blocked on one timer run.
- **Duplicate-request probe → census check (Q1).** The #78420 falsifier
  (adjacent byte-identical bodies) was a throwaway python scan; as a
  census counter it re-answers daily. Effort S.
- **upstream-error-log gate ON? (operator decision.)** CC#79989's named
  first-hypothesis alarm exists in-tree and is OFF. Needs the standard
  acceptance probe before flipping — a gate flip without one is the
  class the roster check exists for.
- **resolveCaptureKey pools literal "empty" (79 requests).** A capture
  keying change = state-KEY change (threat matrix row 3): belongs at a
  session boundary, stated before the restart. Not urgent — the pooled
  requests are keyless utility calls.

## Parked decisions

- **Repo location `~/dev/vendor/` — LEAVE for now** (operator + session
  2026-07-29). The fork is operator-owned (taxonomy says
  `~/dev/Gunther-Schulz/`), but a move touches the serving unit's
  ExecStart, HTTPS_PROXY env, manifest paths, repos.tsv, and ten live
  PR worktrees' gitdir pointers — coordinated migration for purely
  taxonomic gain. Revisit trigger: PR series merged and worktrees
  removed (the natural cheap moment).

- **Resume-boundary attribution — BUILT the day it was parked**
  (operator push; findSuccessions in tools/replay.mjs, census-gated,
  rides the daily sweep): compaction/resume/fork boundary classes with
  opener pricing; interleaves structurally suppressed (never-returns +
  first-appearance conditions — the one-shot-sidecar phantom was caught
  by the class's own bite). Validated pair-for-pair against the hand
  probe on s-0edbd11c (9de68b3).

- **Census system-delta class — candidate, not built** (2026-07-29).
  Within-session inflation instruments: tools[] churn is classified
  (findToolsDeltas, counts + forwardedStable); SYSTEM deltas are only
  observed live (prefix-diff cause lines) and preserved in captures —
  censusPair classifies messages only, so an offline "how often / how
  expensive are mid-session system changes" question has no census
  answer today. Deliberately not built: no such question is currently
  unanswered (prefix-diff logs + matrix row 5 cover the known classes).
  Build trigger: the first system-delta question that needs an offline
  answer over a corpus — then a census kind beside toolsDeltas, same
  shape.
