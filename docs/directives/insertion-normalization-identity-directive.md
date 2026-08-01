# Directive: insertion-normalization — identity scheme, pin safety, persistence, and fixture strategy

Requested by the reviewer on PR #272 (review round 1, 2026-07-31) before the
next code-review pass. Scope: the four blockers' design questions, answered
once here so #273/#276/#278/#281 inherit a settled scheme instead of
re-litigating it per diff. Written against measurement, not argument; every
load-bearing number cites its run.

## Goal / Background

CC re-serializes old `<system-reminder>` blocks mid-history (splice, merge,
migration); each hit edits a settled message and re-bills everything after it
(~40 kB per unmitigated hit; anthropics/claude-code#76606). The extension
keeps a canonical per-conversation model keyed by content identity and pins
volatile blocks to their first-seen serialization. The open design question
(blocker 2): pin-mode identity *deliberately excludes* volatile blocks from
the hash — that exclusion is the mechanism — so the extension cannot
structurally distinguish CC re-serializing a reminder (pin: correct) from CC
*changing its bytes* (pin would forward stale text: a fidelity risk the
reviewer reproduced synthetically).

## Non-Functional Requirements

- **Size/complexity budget:** extension stays ~1,100 LOC (no new modules;
  `message-hash.mjs` remains the one shared primitive). Fixture budget is the
  real change: target is a ≥10× reduction of the 432 KB harvested fixture
  (see Fixture strategy); an implementation landing materially above these
  marks is a review flag.
- **Threat model:** three surfaces. (1) Wire: the extension mutates request
  bodies; forwarding bytes CC did not send is the corruption class — bounded
  below by the allowlist + monitor design. (2) Disk: canonical state persists
  first-seen message bytes (`entry.m`, structurally required for re-serving);
  all conversation-derived writes land mode 0600 via a shared write-owner-only
  primitive (series-wide fix, 27 write sites). (3) Public repo: fixtures are
  conversation-derived; identifiers and content bytes must never be
  committable — enforced mechanically (absence scan at test time and at
  pre-push), not by care.
- **Maintainability:** no new abstractions. Census/replay import the
  extension's own identity helpers rather than restating them (export
  `identityKey`, `unwrapVolatileText`, `pinnedForwardForm`, `hasCacheControl`;
  small proxy-side change riding the next deploy boundary).
- **Performance/reliability:** unchanged; per-request work stays O(messages).
- **Load-bearing?** **Yes** — mutates request bodies on the wire, persists
  conversation-derived state, changes forwarded history shape. Requires human
  (Chris) review before merge per repo policy.

## Identity scheme (what it is, and what it cannot see)

Identity = content hash + occurrence ordinal (`message-hash.mjs`),
position-independent; repeated identical reminders stay distinct (a real
history carried the same reminder 44×). In pin mode, volatile blocks are
excluded from the hash and the first-seen serialization is stored and
re-served on later matches. Consequence, stated plainly: a change *inside* a
volatile block of a still-matching message is invisible to identity. Whether
that is acceptable is an empirical question about CC's actual behavior.

## The measurement the design rests on

Full method and per-entry rows: `docs/code-reviews/`
`blocker2-volatile-change-measurement.md` (census extension, commit 97867f3;
red-first both directions; instrument imports the extension's own
`computePinnedIdentities`/`isVolatileBlock`). Corpus: 36/36 captures, 7.1 GB,
2026-07-28..08-01, 196 conversations, 11,074 same-conversation pairs.
First-seen comparison per pinned identity — a strict superset of the
comparisons the live pin performs (it can over-report change, never
under-report).

| CHANGED sub-kind (of 23,328 pin-rewritten comparisons) | occurrences | entries |
|---|---|---|
| VANISHED — every first-seen reminder gone | 11,478 | 80 |
| REDUCED — a subset survives | 284 | 1 |
| **IN-PLACE-TEXT — a reminder's text replaced** | **0** | **0** |
| APPEARED / AUGMENTED | 0 | 0 |

The zero is informative, not vacuous: the corpus carries 119 distinct
reminder texts across 10 kinds (5 kinds with >1 text — one with 75), so
in-place variation is possible by construction; it lives across messages,
never inside a settled one. Removals (VANISHED/REDUCED) are the #76606 flip
the pin exists to absorb: the model re-reads text it already consumed —
information is repeated, never contradicted. Named boundaries: first-seen
scope is per capture file (over-counts staleness across rotations —
conservative in the right direction); the corpus is live (totals drifted
across three runs; the zero held in all three); CC-version spread is not
recoverable from captures.

## Decision: evidenced allowlist, monitored — not fail-closed re-pin

Pinning stays allowlist-scoped to blocks matching the volatile wrap contract,
justified by the measured absence of the harmful class. The claim is kept
**monitored, not assumed**: the census now computes IN-PLACE-TEXT on every
daily gate sweep, so the first real occurrence surfaces mechanically. That
occurrence is the build trigger for the fallback already designed:
fail-closed re-pin — store the new bytes, honest reset of that boundary only.

**Failure mode when the canon is wrong** (the reviewer's ask, answered
per class): in-place change — zero observed; if one ever occurs it is served
stale once per request until the next sweep flags it (bounded by the
monitor's cadence), then the fallback ships. Removal — designed absorption,
safety argument above. Structural mismatch (compaction, genuine rewrite) —
honest reset, pins survive, order assumptions do not (unchanged behavior).

## Persistence scope (answered once for the series)

On disk: canonical entries including first-seen bytes (`entry.m` — raw bytes
are structurally required; a hash cannot re-serve), event logs, and telemetry
with stable session identifiers. All conversation-derived writes: owner-only
0600 (mode at create + lazy chmod; Node's `mode` option is create-only).
Retention: state lives under the state dir per conversation; an honest reset
clears order state, pins expire with their conversation's state. Where bytes
are not structurally required, hashes are stored instead. This answer carries
to #275 (request capture) and #280 (prefix-diff snapshots) unchanged.

## Fixture strategy (the 432 KB question)

Principles first, then the concrete cut:

- **Synthesized by default.** Constructing a fixture is additive — nothing
  identifying exists unless placed. Harvested-and-scrubbed is the exception,
  justified per fixture by real-pair evidence value (a class only real
  traffic teaches), and committable only with the absence scan green.
- **Sanitization is checked, never claimed.** The scrubber one-way tokenizes
  content (`t_<sha12>_<len>` per paragraph preserving `"\n\n"` join
  relations; `data_<sha10>` for binary), replaces keys/sids with sha-derived
  tokens, rebases timestamps to a fixed epoch keeping intra-fixture deltas,
  and names files by token, not session UUID. A mechanical absence test
  (base64 runs, UUIDs, live timestamps, raw strings, signatures) went
  red-first 9/20 on the old fixtures and now guards the whole fixtures
  directory at test time and the push boundary via a pre-push scan.
- **Minimum record set, answered honestly:** the current 54-record fixture is
  the harvester's range dump, not a measured minimum. The suppression pair
  needs its conversation prefix only to establish pin state; the cut is a
  pinned pair plus a minimal pin-establishing prefix, minified (single-line
  JSON — assertions read it, people don't). Acceptance for any cut: replayed
  classifier verdicts identical to the full-range fixture's, byte-relation
  assertions still exercised. Expected result ≥10× smaller; if the measured
  minimum genuinely needs more history, the fixture says so in a header
  comment with the number.
- **body/headers retention:** full request bodies are not required by the
  suppression tests; tokenized structural shape preserves every asserted
  relation (join equality survives tokenization by construction). The boot
  record's gate-set dump is dropped from fixtures — same class as the #275
  env-dump finding.

## Public-repo hygiene class (proposed upstream adoption)

The repo's hygiene section covers origin-server identifiers. This incident
adds a second class with the same non-negotiable property (public git history
is unscrubbable): **conversation/capture-derived data** — session/conversation
keys, request sids, wall-clock timestamps, content or image bytes, and
env/gate dumps from live systems. Same remedy shape: placeholders/tokens +
mechanical scan before push. Proposed as an addition to CLAUDE.md's hygiene
section; wording follows the fixture-strategy principles above.

## Sequencing

1. This directive reviewed (label per repo policy; implementation of the
   remaining deltas only after `plan-approved`).
2. Branch rewrite of #272 per the agreed remediation (original fixture blobs
   never reachable from upstream `main`; sanitizer-hardened, minimized
   fixtures only) — already coordinated on-thread, awaiting reviewer
   confirmation; force-push follows that confirmation, nothing lands before.
3. Stacked PRs rebase onto the rewritten base in order (#273 → #276 → #278,
   #281 last); the identity scheme lands once, here.

## Verification

- Census IN-PLACE-TEXT metric present in the daily gate output (standing
  monitor for the allowlist premise).
- Absence scan green over every committed fixture; red-first history retained
  in the test file.
- Replay verdict-identity check for every fixture cut (classifier verdicts
  byte-identical pre/post cut).
- Full suite + the slice's targeted suites green at the rewritten tips.
