# Directive: EXTENDED-class absorb — pin the first-seen form, relocate the byte-computable delta

Status: NOT BUILT — design refuted by measurement 2026-07-31 (executor:
opus-5; dispatcher: fable session adf6cadb). The premise ("the delta is
new harness text") and the action ("emit it at a frozen TAIL index") both
failed: the delta is a standalone message the predecessor already carried
(9 of 9 occurrences corpus-wide), and tail placement leaves the first
forwarded divergence at 100 — unchanged — where restoring the swallowed
message at ITS index moves it to 123 of 124. The class is the
cross-message join already in flight under
`flap-move-mitigation-and-fidelity-gate.md` (unit 2, branch
`wt/fidelity/opus`, blocked on the identity decision), so this directive
closes as a DUPLICATE rather than a build. Evidence and the two spun-off
items: `docs/code-reviews/extended-absorb-report.md`. What did ship from
the dispatch: the reset path now declares its suppressions to the replay
gates (see the report).
Source of the settled design: `BACKLOG.md`, item "READY —
EXTENDED-class absorb (matrix row 4 residual)" — that entry is normative;
this file binds it to concrete paths and verifiers for execution.
Consumers: the executing agent now; future sessions tracing matrix row 4.

## Goal

Absorb the EXTENDED sub-class of the row-4 container migration: when a
canonical/pinned standalone `role:"system"` entry arrives carrying bytes
that EXTEND the first-seen form (append-shaped by definition —
`classify()` in `tools/reminder-migration-census.mjs` returns EXTENDED iff
`actual.startsWith(reconstructed)`), forward the FIRST-SEEN bytes at the
original position and emit the delta as a proxy-authored `role:"system"`
entry at a FROZEN index — appended at the current tail on first sight,
then held at that index on every later request (same stable-insertion
machinery the pins already use). Result: the A→B extension transition
changes no bytes in the mid-history region.

## Non-Functional Requirements

- **Size/complexity budget:** an extension of
  `proxy/extensions/insertion-normalization.mjs` plus one test file —
  roughly 100–200 LOC total. Never a new extension file (the acc0814
  lesson recorded in the BACKLOG entry: a separate extension was written,
  measured worse, and reverted).
- **Threat model:** the proxy forwards full conversation bodies. The
  protected property is conversation fidelity — the model must read
  identical information (safety outranks cache). Information is never
  dropped: the delta is relocated, not discarded; anything outside the
  class gate takes the honest reset.
- **Maintainability:** reuse the existing pin/suppression machinery and
  `canonical()`/`classify()` semantics; no new abstractions without a
  second call site.
- **Performance/reliability:** n/a beyond existing per-request work.
- **Load-bearing?** YES — touches the cache-critical serialization path of
  a shared extension.

## Grounding basis (read before building; report must cite what was read)

1. `BACKLOG.md` — the two row-4 items (the RESOLVED hook-context item and
   the READY EXTENDED-class item). The design constraints live there.
2. `proxy/extensions/insertion-normalization.mjs` — whole file; especially
   the volatile-wrap contract (~line 388), the reminder-swap suppression
   (#76606, decision B) block (~lines 612–1000), `resetKeepingPins`
   (~line 742), and the pin/stable-insertion machinery.
3. `tools/reminder-migration-census.mjs` — `canonical()` and `classify()`
   (~lines 85–98): the definitional source for EXTENDED.
4. `proxy/extensions/deferred-tool-rewrite.mjs` — precedent for
   content-at-relocated-position (`tool_addition` blocks).
5. `docs/dev-loop.md` — full file: the gate, "Adding a check" (red-first,
   definition-parented expectations, mutation test), grouping by
   conversation, the closing gate.
6. `docs/directives/robustness-threat-matrix.md` — row 4 (line ~309 on)
   and row 22 (the prune-refutation measurement).
7. The motivating capture:
   `~/.claude/cache-fix-captures/s-77fe2779-af11-43c0-b212-d8c67c29eff1-requests.jsonl`
   — contains the request with top-level `ts` `2026-07-31T11:41:05.778Z`
   (EXTENDED occurrence: host=99, recon=293ch, actual=716ch; delta is the
   "task tools haven't been used recently" harness reminder appended after
   `\n\n`). Pair it with its same-conversation predecessor via
   `conversationOf` from `tools/replay.mjs` — never by capture adjacency.

## Settled design (execute, don't re-derive)

- Detection: incoming standalone whose bytes satisfy
  `incoming.startsWith(firstSeen) && incoming.length > firstSeen.length`
  against the first-seen/pinned form the machinery already tracks.
- Action: forward first-seen bytes at the original position; emit
  `delta = incoming.slice(firstSeen.length)` (strip the leading `\n\n`
  join separator; it is a join artifact, not content) as one
  proxy-authored `role:"system"` message. First sight: append at current
  tail, record the frozen index; later requests: hold it at that index.
- Further extension of the same host entry: the relocated entry's content
  grows by the same rule (it is itself append-shaped at a near-tail
  index); one level only — no recursive relocation.
- Class gate: the HOST entry must be one the extension already recognizes
  as a migrated/canonical standalone (the existing recognition machinery),
  and the delta must be pure appended text after the canonical `\n\n`
  separator. If that predicate proves insufficient to exclude
  non-bookkeeping content, SURFACE the counterexample as a gap — do not
  widen the gate and do not guess. Anything outside the gate takes the
  honest reset (existing behavior).
- A genuine content CHANGE (not append-shaped) still resets. Never serve
  stale bytes for changed content.

## Write boundaries (targeted `git add <path>`, never `-A`)

- `proxy/extensions/insertion-normalization.mjs`
- `test/extended-absorb.test.mjs` (new; this name is assigned)
- `BACKLOG.md` — ONLY appending the resolution lines to the EXTENDED-class
  item (commit ref + measured result)
- `docs/directives/robustness-threat-matrix.md` — ONLY the row-4 section
  (append the disposition datapoint)
- This file — status line update only.

Everything else read-only. `tools/` is read/execute-only. Do NOT restart
the proxy or touch systemd/dotfiles — deployment (pin bump, restart,
gate stamp) is the dispatcher's act. Do NOT push.

## Verifiers (all run by you, outputs in the report)

1. **Red-first unit test** (`test/extended-absorb.test.mjs`): built from a
   SANITIZED fixture of the 293→716ch pair (deterministic hash-token text,
   structure preserved — this repo is public; never commit raw capture
   bytes; follow the harvest sanitization pattern in `tools/harvest.mjs`).
   Write the definitional comment FIRST (expected values derive from the
   EXTENDED definition and the design above, never from the
   implementation), demonstrate it RED against current code, then green.
   Assert: first-seen bytes forwarded at original position; delta present
   as `role:"system"` at the tail on first sight; index frozen on the
   following request; a non-append change still resets.
2. **Replay the motivating pair** through the pipeline with the SERVING
   gate set (resolve via `node tools/gate-live.mjs` or read the unit's
   `Environment=`; never default gates): first forwarded divergence must
   move past index 99. **Done-criterion:** with the row-4 suppression
   (059aae3) plus this change, forwarded divergence ≥ 122 on the
   motivating pair — the entire mid-history region byte-stable, leaving
   only the self-healing prune.
3. **Census byte-gate:** `node tools/reminder-migration-census.mjs
   ~/.claude/cache-fix-captures/*.jsonl` — no MISMATCH introduced.
4. **Full gate:** `node tools/gate-live.mjs` exits 0 (stability, safety,
   sequence, canonical order).
5. **`npm test`** — run ALONE, never concurrently with a `git commit`
   (index.lock hang, documented in dev-loop). If it hangs on the
   production port, run targeted test files and say so.
6. **Closing gate** (dev-loop): answer all four questions in the report —
   mechanized? harvestable (snapshot the motivating pair via the harvest
   path if not already in fixtures)? census class/annotation needed?
   instruments rode along (replay/census handle the new forwarded shape)?

## Commit convention

On `main`, unpushed. Title: lead with what changed and why. Trailer,
verbatim:

    Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>

## Report

Closing report (mandatory; the §2 form below — "none" is a valid slot
answer, silence is not): (a) items completed w/ evidence, (b) checks RUN
w/ real output, (c) gaps surfaced — incl. anything needing a tier above
yours, returned as a question with its evidence, never settled at your
tier, (d) deviations w/ reason, (e) candidate lessons, (f) files touched +
commit hashes (unpushed), (g) what was NOT verified, (h) sources actually
read, of those the brief named.
Message ≤3000 chars: full detail goes to a FILE
(`docs/code-reviews/extended-absorb-report.md`), the message carries key
findings + the file path. A missing decision, file, or value is surfaced
as a gap, never bridged with a guess. A check that got backgrounded is
AWAITED before the closing report (TaskOutput block=true on its task id) —
ending your turn orphans it; a report sent with a check still running is
an INTERIM report, says so, and names what remains.
Commits unpushed, targeted `git add <paths>` never `-A`, trailer:
`Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
After sending the report your write grant is over: a defect you find later
is REPORTED, never edited or amended.
