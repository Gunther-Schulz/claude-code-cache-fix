# Directive: relation-preserving scrub — make scrubText a `"\n\n"`-homomorphism

Status: DISPATCHED 2026-07-31 (executor: opus-5, worktree-isolated;
dispatcher: fable session adf6cadb). Unparks BACKLOG "PARKED — harvest
scrub cannot express prefix/join byte relations"; the named missing
piece (a relation-preserving scrub design that does not weaken the
privacy guarantee) is settled below. Origin of the gap:
`docs/code-reviews/extended-absorb-report.md` §c5 (executed, not
inferred: `scrub(a+"\n\n"+b) != scrub(a)+"\n\n"+scrub(b)`).
Consumers: the executing agent now; future sessions asking why scrub
tokens are per-paragraph.

## Goal

A harvested fixture of a merged-standalone pair (or any class defined
by the domain's `"\n\n"` join contract — census `canonical()`/
`classify()`, insertion-normalization's join suppression) must
reproduce the class it was pinned for. Today it cannot: `scrubText`
tokenizes whole texts, so concatenation relations die at scrub time.

## Non-Functional Requirements

- **Size/complexity budget:** ~10 changed lines in `scrubText` plus one
  property-test file. Anything materially larger is a flag.
- **Threat model:** this is the SANITIZER for a public repo. Tokens stay
  one-way (`t_<sha256-prefix-12>_<len>`); no content bytes may ever
  survive. The deliberate privacy delta of this design is metadata
  only, named below — nothing else may widen.
- **Maintainability:** one scrubber, one hashing scheme (existing rule
  in the file header); the split contract references the same `"\n\n"`
  join constant the domain already hardcodes — no second notion of
  "paragraph".
- **Performance/reliability:** streaming behavior of harvest untouched.
- **Load-bearing?** YES — security-relevant (sanitizer) and a shared
  contract (every committed fixture flows through it).

## Settled design (execute, don't re-derive)

In `tools/harvest.mjs`, `scrubText` becomes a homomorphism over the
`"\n\n"` separator:

1. Wrap handling FIRST, unchanged: `VOLATILE_WRAP` match re-wraps the
   split-scrubbed inner text (preserves the fixed-constant lesson at
   lines 109–125 — wrapped original and standalone copy still tokenize
   equal when their bytes were equal).
2. Otherwise `text.split("\n\n")`, scrub each segment to its own
   deterministic token (`t_<sha12>_<len>`; empty segment stays `""`),
   rejoin with `"\n\n"`.

Guaranteed properties (assert them, in this order, in the test):
- **Equality:** equal inputs → equal outputs (unchanged).
- **Join:** for a, b with no trailing/leading `"\n"` at the boundary,
  `scrub(a + "\n\n" + b) === scrub(a) + "\n\n" + scrub(b)`.
- **Prefix at paragraph granularity:** `actual = recon + "\n\n" + extra`
  → `scrub(actual).startsWith(scrub(recon))`. This is the census
  EXTENDED relation surviving scrub — the §c5 refutation reversed.
- **Degradation, never breakage:** texts whose join boundary creates a
  `"\n\n\n"` run lose the relation (JS `split` semantics decide
  deterministically) but degrade exactly to today's behavior — no
  crash, no content leak. Sub-paragraph prefix relations are NOT
  preserved and that residual is accepted: the domain's join contract
  is `"\n\n"` and nothing narrower.

**Named privacy delta (accepted at dispatch, operator veto open):**
per-segment tokens reveal paragraph count, per-paragraph lengths, and
cross-text sharing of identical paragraphs — where the old scrub
revealed one total length and whole-text equality only. No content
bytes; consistent with the existing `_len` suffix and the
equality-preservation the scrub already commits to. If implementation
surfaces a leak channel beyond these three, STOP and report — do not
proceed and do not patch around it.

**Novelty untouched (verify, then state in the report):**
`scanCapture` classifies RAW records during the streaming pass; scrub
applies only at fixture-write time (`harvest.mjs:517`). Confirm no
scrubbed bytes flow into `seenClasses` keys; if any do, that is a STOP
gap, not a thing to fix silently. Committed fixtures are not
re-scrubbed; mixed token granularity across old/new fixtures is fine
because comparisons happen within a fixture.

## Write boundaries (worktree; targeted `git add <path>`, never `-A`)

- `tools/harvest.mjs` (`scrubText` and its comment block only)
- `test/harvest-scrub-relations.test.mjs` (new; this name is assigned)
- `docs/code-reviews/scrub-relations-report.md` (your report file)
- This file — status line update only.

NOT: `BACKLOG.md` (dispatcher books it), `tools/reminder-migration-census.mjs`,
`tools/bust-triage.mjs`, `tools/gate-live.mjs` (another agent owns them
on main right now), anything under `proxy/`. Do NOT execute the census
tool for the same reason — the cross-tool round-trip (harvest a
merged-standalone pair, census must classify it EXTENDED post-scrub)
is the DISPATCHER's integration check, not yours. Do NOT push.

## Verifiers (all run by you, real output in the report)

1. **Red-first property test** (`test/harvest-scrub-relations.test.mjs`):
   the four properties above, expectations written from the property
   definitions (this section), never from the implementation. The join
   and prefix assertions must be demonstrated RED against the current
   `scrubText` before the change lands, then green after.
2. **Existing suite:** `npm test` — run ALONE; all existing harvest
   tests (the fixed-constant/wrap lesson especially) stay green.
3. **`node tools/harvest.mjs --dry-run`** over the live captures
   (`~/.claude/cache-fix-captures/` — absolute path works from the
   worktree): runs clean, streaming intact, and its would-harvest
   output is sane.

## Commit convention

Worktree branch, unpushed. Title leads with what changed and why.
Trailer verbatim:

    Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
