# Directive: fixture sanitization — full-fidelity scrub (bytes, structural IDs, filenames), fixtures rebuilt, upstream blobs never reachable

Status: SECTIONS 1-5 EXECUTED 2026-07-31 (opus-5 dispatch; report:
docs/code-reviews/fixture-sanitization-report.md — verdict-neutral across
all 44 corpus verdict lines, suite 1826->1836/0 fail, +10 bites).
Section 6 (upstream branch rewrites) remains GATED and dispatcher-owned.
DESIGN SETTLED 2026-07-31 (fable session adf6cadb, operator GO;
the upstream path follows #272 reviewer Proxy Builder's explicit ask:
branch REWRITE so no identifying blob is ever reachable from upstream
main — never a scrub commit on top). Fork-side execution dispatchable
now; upstream branch rewrites are GATED on the reviewer agreeing the
path on the #272 thread. Consumers: the executing dispatch; the #272
reply (drafted beside this); the HOLD backlog entry's lift conditions.

## Goal / Background

Three sanitization gaps, all confirmed by execution
(docs/audits/pr-prep-2026-07-31/pr-prep-report.md; #272 review thread):

1. **Image bytes pass raw**: `scrubBlock` (tools/harvest.mjs:169)
   tokenizes `block.data`, but wire images nest base64 at
   `block.source.data` — one level down. reset-move fixture carries 5
   raw PNGs (dispatcher-verified: PNG magic present).
2. **Structural capture identifiers survive the prose scrub** (#272
   blocker 1, upstream reviewer, confirmed): real conversation key in
   the fixture header, per-request `sid`/`key`/wall-clock timestamps,
   and the session UUID in the FILENAME itself.
3. **flap-s-0d6f38ba-86.json keeps operator hook prose raw** — its
   raw-retention predates the scrub homomorphism (bffcb05) that was
   built precisely to make raw retention unnecessary.

Fork main history is fix-forward (blobs already public there; content
verified benign; no origin-identifying data — the hygiene rule's
rotation remedy does not apply to conversation UUIDs). Upstream is
prevention: the dirty blobs must never enter cnighswonger's repo.

## Non-Functional Requirements

- **Size/complexity budget:** ~40-70 LOC in tools/harvest.mjs (scrub
  extension), fixture regeneration (mechanical), bites in
  test/harvest-scrub-relations.test.mjs. No new files except fixtures'
  renamed replacements.
- **Threat model:** this is the SANITIZER for a public repo. After
  this directive: no raw content bytes (text, images, any `source.*`
  payload), no live capture identifiers, no live wall-clock, no
  session UUID in filenames. Residual, accepted (operator ruling
  2026-07-31, local deployment): token lengths, paragraph structure,
  intra-fixture timing DELTAS, and equality relations.
- **Maintainability:** one scrubber, one hashing scheme (existing
  header rule). Structural-ID tokens reuse the existing sha-prefix
  convention.
- **Load-bearing?** YES — sanitizer, public repo, and every committed
  fixture flows through it.

## Settled design (execute, don't re-derive)

### 1. scrubBlock recurses into `source`

`source.data` (string) → `data_<sha256-prefix-10>` token, exactly the
existing `data` treatment; `type`/`media_type` and other shape keys
kept. Any OTHER string field under `source` longer than 64 chars is
tokenized the same way (fail closed against the next nesting surprise);
short shape fields pass. Red-first: the bite must go red on the
committed reset-move fixture's raw PNG bytes BEFORE the fix.

### 2. Structural-ID scrub (new, applied at fixture-write time)

- **Conversation keys / sids** (`key`, `sid`, and the header key):
  `s-<sha256-prefix-12 of the original>` — deterministic, distinctness
  and equality preserved, prefix shape kept so every reader that
  pattern-matches `s-…` still works. Same map applied everywhere the
  value appears in the fixture (header, records, `_` metadata).
- **Timestamps** (`ts` and ISO strings in records): rebased to a fixed
  epoch `2000-01-01T00:00:00.000Z` + the original DELTA from the
  fixture's earliest timestamp — ordering and proximity relations
  preserved (bust-triage-style ±window joins still work inside a
  fixture), wall-clock gone.
- **Filenames:** the capture-derived fixture name replaces the session
  UUID segment with the key's sha12 token (e.g.
  `reset-move-s-<sha12>-196-197.json`). Test files reference fixtures
  by constant — update the constants in the same commit (dependents
  search: grep the old basenames, hits stated in the commit).
- Scrub metadata header (`_sanitization`) rewritten to state exactly
  what is tokenized and what relations are preserved — the header is a
  CLAIM; the new bite (below) is its verification.

### 3. Fixture rebuilds (fork main, fix-forward)

- `reset-move-…`: re-scrub in place under (1)+(2) — images tokenized,
  IDs tokenized, renamed.
- `flap-s-0d6f38ba-86.json`: rebuild through `scrubMessage` with the
  merged message re-joined from sanitized constituents (the reset-move
  fixture's documented method), plus (2); renamed.
- `pinned-s-633915a8-26-28.json` and every other
  `test/fixtures/harvested/*.json` (LEDGER-* excluded, fork-only):
  apply (2) (their prose is already tokenized); sweep result per file
  in the report.

### 4. Verdict-neutrality verifier (the whole point)

For EVERY rebuilt fixture: replay through the same test entry points
(insertion-join-move tests, replay-gate-selfcheck, merge-suppression,
census where applicable) and assert IDENTICAL verdicts — same actions,
same reset reasons, same suppression/reserve indices, same gate
results — as the pre-rebuild fixture on the same tree. A fixture that
changes any verdict is a STOP (the scrub broke a relation), not a
thing to patch around. Then the full suite minus the two port-bound
files.

### 5. The verification bite for the sanitizer's claim

One test that walks a scrubbed fixture and asserts the ABSENCE
classes mechanically: no base64 run >200 chars anywhere, no
`source.data` without `data_` prefix, no ISO timestamp before 2001
other than the fixed epoch family, no 8-4-4-4-12 UUID outside sha
tokens. Red-first against the current committed fixtures.

### 6. Upstream branch rewrites — GATED on reviewer agreement

After (1)-(5) land on fork main AND the #272 thread agrees the path:
rewrite `pr/insertion-normalization` (and the two prepared branches,
which are unpushed and trivially rebuilt) so that only clean fixture
blobs are ever reachable; force-push #272's branch per the reviewer's
own suggestion. NOT part of the fork-side dispatch — dispatcher-owned,
after the on-thread agreement.

## Write boundaries (worktree; targeted git add, never -A)

- tools/harvest.mjs (scrubBlock + the structural-ID scrub + header)
- test/harvest-scrub-relations.test.mjs (bites)
- test/fixtures/harvested/*.json except LEDGER-* (rebuilds/renames)
- test files whose fixture-name constants change (grep-established,
  hits in the commit message)
- docs/code-reviews/fixture-sanitization-report.md (assigned report)
- This file — Status line only.
NOT: BACKLOG.md, proxy/**, other tools/, the pr worktrees, anything
under ~/.claude (captures read-only). Do not push.

## Verifiers (in order, real output in the report)

1. Red-first bites (1) and (5) against the current committed fixtures.
2. Per-fixture verdict-neutrality (section 4), stated per fixture.
3. Full suite minus port-bound: same pass count as main's baseline
   (1826/1823/0 as of c943206) modulo the new bites.
4. Hygiene scan of every rebuilt fixture (the pr-prep report's scan
   set: IPs, ssh, host:port, user paths, key shapes) — commands and
   results in the report.
