# Closing report — fixture sanitization (directive sections 1-5), 2026-07-31

Dispatch: opus-5, isolated worktree `agent-a8aaefc1451e152fd`, base `20be710`
(`git merge-base --is-ancestor 20be710 HEAD` → 0, tree clean at start).
Directive: `docs/directives/fixture-sanitization-directive.md`, settled design
sections 1, 2, 3, 5. Section 6 (upstream branch rewrites) untouched — it is
dispatcher-owned and reviewer-gated.

## (a) Items completed, with evidence

**1. `scrubBlock` recurses into `source` (directive §1).**
`tools/harvest.mjs` — `source.data` (string) → `data_<sha10>`, the existing
`data` treatment; any other string under `source` longer than 64 chars
(`SOURCE_SHAPE_MAX`) tokenized the same way; short shape fields (`type`,
`media_type`) pass. Fail-closed by construction, with the asymmetry stated in
the comment: a shape field wrongly tokenized is visible and harmless, a payload
wrongly passed is a silent leak.

**2. Structural-ID scrub (directive §2).** Three pieces in `tools/harvest.mjs`:

- `sidToken(original) = "s-" + sha256(original).slice(0,12)` — one hashing
  scheme, `s-` prefix kept. `scrubRecord` now emits it for `sid` and `key`
  (was `sid_<sha8>` / `k_<sha8>`), `scrubOutcomeRecord` for `key`.
  `id`/`requestId` keep their existing `id_`/`rq_` tokens: they are
  request-scoped, already sanitized, and not what the directive names.
- `FIXED_EPOCH = "2000-01-01T00:00:00.000Z"` + `rebaseTimestamps(value)` —
  fixture-wide, because "the earliest instant" is a property of the whole
  artifact. Whole-string ISO instants only; a date inside authored prose
  (a fixture's "measured 2026-07-30" provenance note, a growth artifact's
  filename) is documentation the artifact exists to carry.
- Filenames: `pinned-`, `growth-` and `harvested-` names now carry
  `sidToken(key)` where they carried `key.slice(0,10)` — i.e. `s-` + 12 hex,
  never `s-` + 8 hex of a session UUID.

Size against the directive's ~40-70 LOC budget: 129 added lines in
`tools/harvest.mjs`, of which 62 are comment or blank → **67 lines of code**.

**3. Fixture rebuilds and renames (directive §3).** All nine non-LEDGER
fixtures. Old → new, with what changed:

| old | new | change |
|---|---|---|
| `flap-s-0d6f38ba-86.json` | `flap-s-0dc8ac87c43d-86.json` | FULL rebuild from the live capture through `scrubMessage`; merged msgs 86/91/94 re-joined from sanitized constituents; ts rebased |
| `oscillation-s-633915a8-863.json` | `oscillation-s-4b6a435234bf-863.json` | FULL re-scrub (was raw end to end); merged msg864 re-joined from sanitized constituents; ts rebased |
| `reset-move-s-dc3f8071-196-197.json` | `reset-move-s-97097e027ac0-196-197.json` | 5 nested PNG payloads tokenized; ts rebased; text was already clean |
| `pinned-s-633915a8-26-28.json` | `pinned-s-4b6a435234bf-26-28.json` | header key + record `k_`/`sid_` tokens → `s-<sha12>`; 55 ts rebased; header `sanitizer` rewritten |
| `growth-s-2cd640f8-…` | `growth-s-b2d596db197e-…` | `key` → token |
| `growth-s-633915a8-…` | `growth-s-4b6a435234bf-…` | `key` → token |
| `harvested-append-after-change-s-35d72503-323.jsonl` | `…-s-628f31b605ed-323.jsonl` | `key`/`sid` → tokens; ts rebased as one unit (the pair's delta survives) |
| `harvested-replace-edit-s-0edbd11c-20.jsonl` | `…-s-157bd37224d7-20.jsonl` | same |
| `harvested-splice-insert-mid-s-0edbd11c-19.jsonl` | `…-s-157bd37224d7-19.jsonl` | same |

Each file keeps the indentation it was committed with (1 space for the three
hand-built fixtures, 2 for the tool-written ones), so the diff shows what
changed rather than a reflow.

Two recovery facts worth recording, both **verified rather than assumed**:

- The `flap` capture (`s-0d6f38ba-…`, 734 MB) is still on disk, so the rebuild
  is from the ORIGINAL bytes, not a patch of the committed ones. Alignment
  checked before rebuilding: requests 102/104/105/108 of the capture match the
  fixture's `n`, `ts` and `msgCount` exactly (97/99/99/101).
- The two `harvested-*.jsonl` captures had rotated away, so their session keys
  were recovered from the local CC session store (`~/.claude/projects/`) and
  **proved** rather than assumed: `sha256(recovered key).slice(0,8)` reproduces
  the token the fixture already carried — `k_628f31b6` for the
  append-after-change pair and `k_157bd372` for the replace/splice pair — and
  the same re-derivation from the bare UUID reproduces `sid_1589e05d` and
  `sid_7f72c8d5`. A guessed key would have failed all four. (The recovered
  values are deliberately not written down here; the check is reproducible
  from the store.)

**4. The merged-message reconstruction is now a CHECK, not a claim.** For flap
and oscillation the rebuild asserts, per merged message, that the join of the
SANITIZED constituents is byte-equal to the plain `scrubMessage` of the merged
string. That equality is the `"\n\n"` homomorphism (bffcb05) exercised on the
real bytes — and it is what retires the raw-retention precedent both fixtures'
old headers cited ("scrubText is not a homomorphism over concatenation", true
when written, false since bffcb05). All assertions passed on the first run.

**5. The absence-class bite (directive §5), plus a fifth class.** In
`test/harvest-scrub-relations.test.mjs`, walking every committed fixture except
`LEDGER-*`:

- (a) no base64-alphabet run > 200 chars,
- (b) every `source.data` is a `data_<sha10>` token,
- (c) every whole-string ISO instant lies in `[2000-01-01, 2001-01-01)`,
- (d) no 8-4-4-4-12 UUID in any string — and no fixture FILENAME carries a UUID
  or an `s-<8 hex>` prefix segment,
- (e) **added beyond the directive's four**: every content string (`text`,
  `thinking`, `content`) is a well-formed token, once unwrapped. Reason: the
  directive's four classes mechanize the image and identifier findings, but
  pr-prep gap 2 (raw operator hook prose) belongs to none of them, so that
  finding would have stayed hand-derived. It went red on 36 flap strings and 21
  oscillation strings.
- plus a non-vacuity guard: ≥ 8 fixtures parsed and > 1000 strings scanned, so
  the scan cannot pass by finding nothing.

Expectation parentage: the epoch bound, the token shapes and the filename shape
are stated in the test from the directive and from `harvest.mjs`'s sanitization
header, not imported from the code under test. Same for the new
`harvest-pin.test.mjs` `KEY_TOKEN`, computed with `node:crypto` from the
definition rather than from `sidToken`.

## (b) Checks RUN, with real output

**Verifier 1 — red-first.** Both bite families red against the committed
fixtures BEFORE the fix and the rebuilds
(`node --test test/harvest-scrub-relations.test.mjs`):

```
✔ …the 10 pre-existing relation properties…
✖ nesting: a wire image block's source.data is tokenized, its shape fields survive
✖ nesting: equal payloads tokenize equal, different payloads differ
✖ nesting: an unknown long string under source is tokenized too (fail closed)
✔ absence: the committed corpus is non-empty and every fixture parses
✖ absence (a): no committed fixture carries a base64 run longer than 200 characters
✖ absence (b): every source.data in the corpus is a data_ token
✖ absence (c): every whole-string ISO instant lies in the fixed-epoch family
✖ absence (d): no 8-4-4-4-12 UUID appears anywhere in the corpus
✖ absence (e): every content string in the corpus is a token, not capture prose
✖ absence (d): no fixture FILENAME carries a UUID or a UUID prefix segment
ℹ tests 20   ℹ pass 11   ℹ fail 9
```

The named hits, i.e. what the bites actually found:

```
(a)  oscillation-s-633915a8-863.json $.requests_864[0].msg864.content[0].signature (1170 chars)
     oscillation-s-633915a8-863.json $.requests_864[0].msg864.content[1].signature (531 chars)
     oscillation-s-633915a8-863.json $.requests_864[2].msg864.content[0].signature (1170 chars)
     oscillation-s-633915a8-863.json $.requests_864[2].msg864.content[1].signature (531 chars)
     reset-move-s-dc3f8071-196-197.json $.requests[0..4].messages[210].content[2].source.data (13059 chars each)
(b)  reset-move-s-dc3f8071-196-197.json $.requests[0..4].messages[210].content[2].source.data (13060 chars each)
(c)  83 live wall-clock instants — pinned 55, oscillation 13, reset-move 5,
     flap 4, the three .jsonl pairs 2 each
     (e.g. pinned $.records[53].ts = 2026-07-29T16:52:11.526Z)
(d)  3 full session UUIDs, one per hit — the two growth artifacts' $.key and
     pinned's $.header.key (values elided here; they are in the pre-rebuild
     blobs and there is no reason to restate them in a new tracked file)
(d') all nine fixture filenames
(e)  57 raw content strings — 36 in flap, 21 in oscillation: operator hook
     prose, verbatim, plus an agent tool_result naming a sub-agent and its
     session
```

Note (a): the four raw thinking-block **signatures** in the oscillation fixture
were NOT in the directive's finding list. `scrubBlock` has redacted
`signature` since long before this change; that fixture was hand-built and
never went through it.

After the `scrubBlock` fix and before the rebuilds, the three `nesting` bites
went green and the six corpus bites stayed red — the split the directive asks
for (the sanitizer is fixed; the artifacts are not yet).

**Verifier 2 — per-fixture verdict neutrality.** Instrument:
`tools/verdict-ab.mjs`, the repo's own corpus verdict tool, run as
`<worktree> <worktree> --verbose --fixtures <dir>` so the CODE is held fixed
and only the CORPUS varies. It prints the seven fields every downstream gate
reads (`action`, reset reason, `pinned`, `suppressed`, `moved`, `dropped`,
forwarded length) per request.

```
before: IDENTICAL across 44 verdict lines, 6 corpora   (EXIT=0)
after : IDENTICAL across 44 verdict lines, 6 corpora   (EXIT=0)
diff (corpus-name token normalised): before 44 lines / after 44 lines
VERDICTS IDENTICAL
```

The load-bearing lines, unchanged before and after:

```
flap        n=102 action=reset reset=no-prior-canonical pinned=0 suppressed=0 moved=0 dropped=0 out=97
flap        n=104 action=normalized reset=- pinned=3 suppressed=3 moved=1 dropped=1 out=97
flap        n=105 action=append-only reset=- pinned=0 suppressed=0 moved=0 dropped=1 out=99
flap        n=108 action=normalized reset=- pinned=3 suppressed=3 moved=1 dropped=3 out=99
reset-move  n=187 action=reset reset=no-prior-canonical … out=233
reset-move  n=195 action=normalized reset=- pinned=1 suppressed=1 moved=1 dropped=6 out=234
reset-move  n=196 action=normalized reset=- pinned=1 suppressed=1 moved=1 dropped=1 out=236
reset-move  n=197 action=normalized reset=- pinned=1 suppressed=1 moved=1 dropped=3 out=237
reset-move  n=198 action=normalized reset=- pinned=1 suppressed=1 moved=1 dropped=4 out=239
pinned      29 requests / 6 conversations, all 29 lines identical
3 .jsonl pairs, 6 lines identical
```

`verdict-ab` skips the two growth artifacts and the oscillation fixture ("no
request carries a messages array") and says so rather than counting them clean.
Their neutrality is covered by the consuming tests below, run green after the
rebuild:

```
node --test test/insertion-join-move.test.mjs test/replay-gate-selfcheck.test.mjs \
            test/insertion-merge-suppression.test.mjs test/insertion-suppression.test.mjs \
            test/mitigation-output-form.test.mjs test/harvest-pin.test.mjs \
            test/harvest.test.mjs test/harvest-scrub-relations.test.mjs
ℹ tests 166   ℹ pass 166   ℹ fail 0
```

That set covers every consumer: flap (join-move classify sequence + the
`findBlockMigrations` three-leg/one-hash bite), reset-move (the reset leg),
oscillation (`pinnedJoinHashes` / `findSuppressibleDuplicate` / the tail
guard), pinned (`harvest-pin.test.mjs` forces the fixture path with
`CACHE_FIX_TEST_CAPTURE_OVERRIDE=/nonexistent`, asserting `# pass 1 / # fail 0`
from the fixture for both real-pair tests).

**No verdict changed anywhere. No STOP was triggered.**

**Verifier 3 — full suite minus the two port-bound files.**

```
$ node --test $(ls test/*.test.mjs | grep -vE 'proxy-integration|proxy-wrapper')
BEFORE (at 20be710, this worktree):  ℹ tests 1826  ℹ pass 1826  ℹ fail 0  ℹ skipped 0
AFTER  (all changes):                ℹ tests 1836  ℹ pass 1836  ℹ fail 0  ℹ skipped 0
```

Delta = **+10 tests, exactly the new bites** (3 nesting + 1 non-vacuity + 5
absence classes + 1 filename), 0 failures either side.

The brief's stated baseline was 1826/1823/0. Measured here it is 1826/1826/0
with 0 skipped: the three real-capture tests that SKIP when their capture has
rotated find their captures present on this machine, so they run instead of
skipping. Same test count, three more passes; noted rather than silently
absorbed.

**Verifier 4 — hygiene scan, the pr-prep scan set, over the nine rebuilt
fixtures.** Every pattern empty (`rc=1` from grep means no match):

```
1. IPv4 literals                            rc=1
2. ssh / IPv6 / host:port                   rc=1
3. absolute user paths (/home|/Users)       rc=1
4. sk-ant- / Bearer / ghp_                  rc=1
5. base64 runs > 200                        rc=1
6. 8-4-4-4-12 UUIDs                         rc=1
7. live-year ISO instants (20xx-..-..T)     no matches in any rebuilt fixture
```

Pattern 7 over the whole fixture directory returns exactly one file:
`LEDGER-Siren.json` — see gap 1.

## (c) Gaps surfaced — for a tier above mine

**1. `test/fixtures/harvested/LEDGER-Siren.json` is the largest remaining
exposure of exactly the class this directive closes, and it was out of my
scope.** It is tracked in a public repo and carries **42 distinct session
UUIDs** as object keys, live `lastHarvest` wall-clock timestamps, per-capture
byte counts, and the machine's hostname in its own filename. The brief and the
directive both exclude `LEDGER-*` as fork-only; "fork-only" means "never in an
upstream PR slice", which is not the same as "not public" — fork main is
public. The new absence bites exclude it by name, and that exclusion is stated
in the test rather than left implicit, so it will not be mistaken for coverage.
Question for the dispatcher: is the ledger in scope for a follow-up (its keys
could carry `sidToken` exactly as the fixtures now do, at the cost of making
"which capture is this" unreadable to the operator), or is it a deliberate
accepted residual that should be written down as one?

**2. Two tracked test files hardcode a full session UUID *and* the operator's
absolute home path.** `test/insertion-suppression.test.mjs:288` and
`test/mitigation-output-form.test.mjs:120` both hold a literal
`"/home/<user>/.claude/cache-fix-captures/s-<full session UUID>-requests.jsonl"`
as the `REAL_CAPTURE` default (quoted in shape only — the literal is on public
main already and this report does not restate it).

Same two classes the directive closes for fixtures (session UUID, and an
absolute user path that the pr-prep hygiene scan explicitly looks for), in
source rather than in a fixture. Load-bearing: it is the live-capture path the
real-pair tests prefer over the fixture. Both files are in my write boundary
because their fixture-name constants changed, but changing this constant is a
design decision (env-var default? a `homedir()` join? drop the live path now
that the pinned fixture exists?) that the directive does not settle, so I did
not take it.

**3. 168 session-key prefix mentions (`s-<8 hex>`) remain in prose across 29
files** (count excludes this report, which cites the old names deliberately):
`proxy/` + `tools/` 27, `test/` 23, `docs/**` + `BACKLOG.md` 118. Four of those
(2 in `proxy/extensions/insertion-normalization.mjs`, 2 in `tools/replay.mjs`)
also name the OLD fixture filenames in comments and are now stale references:

```
proxy/extensions/insertion-normalization.mjs:737   // flap-s-0d6f38ba-86.json, request n=104):
proxy/extensions/insertion-normalization.mjs:1093  // …Frozen in reset-move-s-dc3f8071-196-197.json.
tools/replay.mjs:1099                              // …fixture flap-s-0d6f38ba-86.json): the block
tools/replay.mjs:1521                              // (fixture flap-s-0d6f38ba-86.json, request n=104…
```

`proxy/**` and `tools/` other than `harvest.mjs` are outside my write boundary,
so I could not make this class consistent. I deliberately did NOT fix the
in-boundary subset: a half-scrubbed prose class reads as done and is not.
Decision needed on whether `s-<8 hex>` in prose is in scope at all (it is a
UUID *prefix*, not a UUID) and, separately, on the four stale filename
references, which are a correctness issue independent of privacy.

**4. `scrubBlock`'s `source` recursion fails closed on STRINGS only.** A
`source` carrying a nested object or array (the wire's content-block source
shapes) passes through untouched. No such shape exists in the current corpus —
the only `source` blocks are the five `{type, media_type, data}` images — and
the directive's §1 text names strings specifically, so I implemented exactly
that and am surfacing the residual rather than widening the design at my tier.
The absence bites would catch a leaked base64 payload there but not leaked
prose.

## (d) Deviations, with reason

- **The oscillation fixture needed a FULL rebuild, not the `(2)`-only treatment
  the directive's §3 third bullet assumes.** That bullet says of the remaining
  fixtures "their prose is already tokenized". Measured, it is not: a corpus
  sweep found `oscillation-s-633915a8-863.json` raw end to end — its own header
  says "RAW bytes" — carrying operator hook prose, an agent `tool_result`
  naming a sub-agent and its session, and two thinking signatures of 1170 and
  531 base64 chars. The directive's own threat model ("no raw content bytes")
  governs over the bullet's refuted premise, so I rebuilt it the same way as
  flap. Verdict-neutral (`insertion-merge-suppression.test.mjs`, 12 tests
  green).
- **Added a fifth absence class (e).** Reasoned above under (a)(5).
- **Extended two existing bites rather than only adding new ones.** The
  `nesting: equal payloads` property passed pre-fix for the wrong reason (raw
  payloads are trivially equal to themselves), so it now also asserts that both
  legs are tokens — after which it went red pre-fix like the others.
- **`test/harvest-pin.test.mjs`'s CLI test was rewritten, not just renamed.**
  Its title and assertions encoded the old `key.slice(0,10)` convention. It now
  asserts the `s-<sha12>` name, the token in the header, the absence of the raw
  key anywhere in the serialized fixture, and the rebased timestamps with their
  deltas intact (`[0, 1000, 2000, 3000]` ms).
- **Symlinked `node_modules` into the worktree** (`ln -s` to the main
  checkout's). The suite cannot load otherwise. Untracked, never staged;
  remove with `rm <worktree>/node_modules` when the worktree is torn down.
- **The rebuild ran from a scratchpad script, not from a `tools/` entry point.**
  It is a one-shot migration over nine named files, and `tools/` other than
  `harvest.mjs` is outside my write boundary. The durable half — the rules it
  applied — lives in `harvest.mjs` and is exercised by the bites; the
  throwaway half is the per-fixture surgery, which does not recur.

## (e) Candidate lessons

- **A fixture header is a claim; the corpus scan is the verification.** Three
  headers were confidently wrong at once: reset-move claimed "no raw text at
  all" over five raw PNGs, flap and reset-move both cited "scrubText is not a
  homomorphism over concatenation" as the reason to keep raw bytes — true when
  written, refuted by bffcb05 and never revisited, and oscillation announced
  "RAW bytes" as if that were a sanitization decision. The corpus-walking bite
  found all three in one run.
- **A premise that dies leaves its dependents standing.** The
  raw-retention decision in two fixtures was derived from the
  non-homomorphism fact. When bffcb05 made the scrub a homomorphism, nothing
  re-derived those two decisions, so raw operator prose sat in a public repo
  for a day past the reason for it. The general shape: when a premise is
  refuted, enumerate what was built on it.
- **A sanitizer that redacts by field NAME misses the same field one level
  down.** Right field, wrong depth — and the fix's durable half is not the
  extra recursion but the fail-closed rule beside it, because the wire format
  will nest something else next.
- **A rotated capture is not necessarily an unrecoverable identifier.** Both
  "lost" session keys were recovered from `~/.claude/projects/` and *proved* by
  re-deriving the committed short token. Deriving is cheap; guessing would have
  been silently wrong, and the sha8 re-derivation is what tells them apart.
- **"Fork-only" and "not public" are different properties.** The LEDGER
  exclusion rides on a phrase that means "never in a PR slice"; the file is on
  public fork main either way.

## (f) Files touched + commit hash

One commit on `worktree-agent-a8aaefc1451e152fd`, parent `20be710` — unpushed,
targeted `git add`, never `-A`. 23 files, +1444/-622. The hash is reported to
the dispatcher rather than written here: a commit cannot state its own id
without an amend that changes it, and a stale hash in a tracked file is worse
than none. `git log --oneline -1 20be710..` resolves it.

- `tools/harvest.mjs` (+129/-15; 67 code lines)
- `test/harvest-scrub-relations.test.mjs` (+260)
- `test/harvest-pin.test.mjs` (+31/-8)
- `test/insertion-join-move.test.mjs`, `test/replay-gate-selfcheck.test.mjs`,
  `test/insertion-merge-suppression.test.mjs`,
  `test/insertion-suppression.test.mjs`, `test/mitigation-output-form.test.mjs`
  (fixture-name constants and their comment references)
- nine fixtures under `test/fixtures/harvested/` deleted and re-added under
  their new names (table in (a)3)
- `docs/directives/fixture-sanitization-directive.md` — Status line only
- `docs/code-reviews/fixture-sanitization-report.md` — this file

Not touched, per the write boundary: `BACKLOG.md`, `proxy/**`, `tools/` other
than `harvest.mjs`, `test/fixtures/harvested/LEDGER-*`, the `cache-fix-pr*`
worktrees, anything under `~/.claude`. Nothing pushed.

## (g) What was NOT verified

- `test/proxy-integration.test.mjs` and `test/proxy-wrapper.test.mjs` —
  excluded per the brief; port-bound on this machine.
- **The running proxy was not restarted and the live gate was not run.** This
  commit touches `tools/` and `test/` only, so per `CLAUDE.local.md` no
  dotfiles pin bump and no `cache-fix-proxy` restart is required; but
  `tools/harvest.mjs` IS the scheduled harvester, and its next timer firing
  will be the first execution of the new naming and rebasing paths against a
  real capture. The unit path is covered (`harvest-pin.test.mjs` drives the
  real CLI end to end over a synthetic capture); a live `node tools/harvest.mjs
  --dry-run` against the real capture directory was not run.
- Whether any consumer outside this repo reads the old fixture filenames. I
  grepped `proxy/ test/ tools/` (hits in (c)3) and the docs tree; the
  `cache-fix-pr4` / `cache-fix-pr12` worktrees carry copies of two of these
  fixtures and are explicitly outside my boundary — their copies are now stale
  relative to fork main.
- The decoded content of the five PNG payloads. I did not re-open them; the
  pr-prep report's decode (a terminal screenshot, `gnome-screenshot`, benign
  content) is taken as read, and it makes no difference to the fix — the bytes
  are gone either way.
- Collision behaviour of `sidToken` at 12 hex (48 bits). Not probed; with a
  corpus of single-digit fixture families it is not a live risk, and the
  existing 8-hex convention it replaces was weaker.

## (h) Sources actually read, of those the brief named

Read in full: `docs/directives/fixture-sanitization-directive.md` (144 lines);
`tools/harvest.mjs` (773 lines, before editing);
`test/harvest-scrub-relations.test.mjs` (192 lines);
`docs/audits/pr-prep-2026-07-31/pr-prep-report.md` (266 lines);
`docs/dev-loop.md` "Adding a check" (lines 385-441). All nine committed
fixtures under `test/fixtures/harvested/` — headers read in full, bodies
inspected by scripted sweep (raw-content, base64, UUID, timestamp and
`source.data` scans) rather than line by line, which is the only tractable read
of a 485 KB fixture and is also the altitude the finding lives at.
`test/fixtures/harvested/LEDGER-Siren.json` — head plus a UUID count, to state
gap 1; not otherwise in scope.

Also read, not named by the brief but load-bearing: `tools/verdict-ab.mjs`
(to use it as the neutrality instrument), and the consuming sections of
`test/insertion-join-move.test.mjs`, `test/replay-gate-selfcheck.test.mjs`,
`test/insertion-merge-suppression.test.mjs`, `test/insertion-suppression.test.mjs`,
`test/mitigation-output-form.test.mjs`, `test/harvest-pin.test.mjs`.

— Fixture Sanitization dispatch (opus-5)
