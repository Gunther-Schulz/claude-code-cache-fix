# Report: relation-preserving scrub — `scrubText` as a `"\n\n"`-homomorphism

Directive: `docs/directives/scrub-relation-preservation-directive.md`
(DISPATCHED 2026-07-31). Executor: opus-5, worktree-isolated, unpushed.
Consumers: the dispatcher's integration check (harvest a merged-standalone
pair, census must classify it EXTENDED post-scrub); future sessions asking
why scrub tokens are per-paragraph.

## (a) Items completed, with evidence

1. **`scrubText` splits on `"\n\n"`, scrubs each segment, rejoins.**
   `tools/harvest.mjs:149-160`. Wrap handling runs FIRST and unchanged, so
   the fixed-constant lesson (a wrapped reminder re-wraps its own
   deterministic token, never a fixed placeholder) is intact — now at
   paragraph granularity, asserted by its own test. The whole-text
   `if (text === "") return ""` early return was removed as dead: `""`
   splits to `[""]`, the empty-segment rule returns `""`, join returns
   `""` — same output, one rule instead of two.
   Non-comment diff is 7 lines:

       +const PARA_SEP = "\n\n";
       -  if (text === "") return "";
       -  return `t_${sha(text).slice(0, 12)}_${text.length}`;
       +  return text
       +    .split(PARA_SEP)
       +    .map((seg) => (seg === "" ? "" : `t_${sha(seg).slice(0, 12)}_${seg.length}`))
       +    .join(PARA_SEP);

   Against a directive budget of ~10 changed lines plus one test file:
   `git diff --stat` → `tools/harvest.mjs | 32 +++, 30 insertions(+), 2
   deletions(-)`, of which 23 are the comment block the directive (and the
   operator's caveat addition) put in scope.

2. **`PARA_SEP` is the domain's join, not a second notion of paragraph.**
   The comment names both existing hardcode sites — census
   `canonical()`/`classify()` (`tools/reminder-migration-census.mjs:117`,
   `:134`) and insertion-normalization's duplicate suppression
   (`proxy/extensions/insertion-normalization.mjs:680`). No import edge was
   added to either file (both are owned by other agents right now, and the
   directive says "references the same join constant the domain already
   hardcodes" — a shared literal, not a new coupling).

3. **`test/harvest-scrub-relations.test.mjs`** — 10 tests over the four
   properties, red-first (§b). Expectations are written from the property
   definitions in the directive and from the census/normalization join
   contract; the file states that parentage in its header. The scrub is
   exercised through the exported `scrubMessage`, the same channel §c5
   refuted it on, so what is tested is what fixtures actually get — no
   export was added to `harvest.mjs` for testability.

4. **Novelty untouched — verified at the data altitude, not by reading.**
   `seenClasses` keys come from `censusPair()` over RAW `rec.body.messages`
   (`harvest.mjs:220`, `:383`); scrub applies only when a fixture body is
   serialized (`:693` main path, `:517` `pinRange`) and in
   `growthComponentSnapshot`. The live per-machine ledger's stored classes
   are census labels, printed from the real file:

       LEDGER-Siren.json ["splice/insert-mid","replace/edit","append-after-change"]

   No token strings, no scrubbed bytes. No STOP gap here.

5. **The §c5 refutation, reversed.** Same probe shape as the report's
   executed refutation, run against the shipped sanitizer post-change with
   synthetic text (this repo is public — the §c5 numbers came from real
   capture bytes and are not reproducible here by design):

       scrubbed inner reminder : t_458a3fe14169_54
       scrubbed merged         : t_458a3fe14169_54
       
       t_9f639c1ee9be_52
       scrubbed standalone     : t_9f639c1ee9be_52
       prefix relation survives: true
       join relation survives  : true

   §c5's same two lines read `false` / `false`.

## (b) Checks RUN, with real output

**1. Red-first property test.** Against the UNCHANGED `scrubText`, the join
and prefix assertions go red and nothing else does:

    ✔ equality: equal bytes scrub equal, different bytes scrub different, no content survives
    ✔ equality: a wrapped multi-paragraph reminder and its unwrapped duplicate still match
    ✖ join: scrub(a + "\n\n" + b) === scrub(a) + "\n\n" + scrub(b)
    ✖ join: holds for three segments and for an empty middle segment
    ✖ prefix: an EXTENDED pair keeps startsWith after scrubbing
    ✖ prefix: the extra block is recoverable at the same join the census strips
    ✔ prefix: a NON-extension does not falsely satisfy startsWith
    ✔ degradation: a "\n\n\n" boundary loses the relation but stays safe and deterministic
    ✔ degradation: a sub-paragraph extension stays safe, and its relation is not promised
    ✔ degradation: non-strings and the empty string pass through unchanged

The join failure diff is the defect itself, not a placeholder mismatch:

    + actual - expected
    + 't_bb44eb60e2b4_142'
    - 't_7d4ed2d32871_44\n\nt_2426a039706c_49\n\nt_66e68d0e5729_45'

After the change, all ten pass. The five that were green before are
preservation checks (equality, the wrap/fixed-constant lesson, the
non-extension discriminator, both degradation paths) — they are green in
both states BY DESIGN, and their job is to go red if the split breaks
what the scrub already guaranteed.

**2. Existing suite** — `npm test`, run alone, at the changed tree:

    ℹ tests 1800
    ℹ suites 56
    ℹ pass 1800
    ℹ fail 0
    ℹ cancelled 0
    ℹ skipped 0
    ℹ duration_ms 16578.12253

Includes `harvest.test.mjs` (the fixed-constant/wrap tests),
`harvest-pin.test.mjs`, `extended-absorb.test.mjs`.

**3. `node tools/harvest.mjs --dry-run`** over the live captures
(`~/.claude/cache-fix-captures`, 8.0 G, 39 files):

    scanned 11617 requests across 39 capture(s) (dry run)
    harvested 0 novel pair(s)
    up to date: 26 capture(s)
    
    WARNING: 4 capture(s) expired before harvest — raise CACHE_FIX_CAPTURE_MAX_MB
      s-captureH… (last seen at 603 requests)  [+3 more]

Sane: every class in the ledger is already banked, so zero novel picks is
the expected steady state, and the expiry warning is the pre-existing
retention finding, untouched by this change.

**4. Streaming behaviour (the NFR this change could plausibly hurt).**
`split()` allocates per text, so the dry-run was repeated under a hard heap
cap — `node --max-old-space-size=512 tools/harvest.mjs --dry-run`:

    scanned 11623 requests across 39 capture(s) (dry run)
    harvested 0 novel pair(s)
    up to date: 26 capture(s)
    EXIT=0

Clean at 512 MB over an 8 G corpus. (The 11617 → 11623 delta between runs is
live captures growing between them, not a read difference.)

## (c) Gaps surfaced

**None requiring a tier above mine.** The two STOP conditions the directive
named were both checked and neither fired: no leak channel beyond the three
named metadata channels (§d), and no scrubbed bytes in `seenClasses` (§a4).

One observation, recorded rather than raised: fixtures committed BEFORE this
change carry whole-text tokens and are not re-scrubbed. The directive
already rules this fine (comparisons happen within a fixture), and nothing
in the corpus mixes granularities inside one file. No action taken.

## (d) Deviations, with reason

1. **Operator ruling on the named privacy delta, mid-execution.** The
   delta — per-segment tokens expose paragraph count, per-paragraph
   lengths, and cross-text sharing of identical paragraphs, where whole-text
   tokens exposed one total length and whole-text equality; no content bytes
   either way — was ACCEPTED for this deployment on the ground that captured
   traffic is local and operator-controlled. The STOP condition is thereby
   resolved, and the ruling extended the comment-block ownership by one
   requirement: the audience caveat now sits in the code
   (`harvest.mjs:140-148`), telling anyone harvesting non-local or
   third-party traffic to re-make the judgment before committing fixtures
   publicly, because a length VECTOR can fingerprint a known public text
   that a single total length would not.

2. **Property 4 asserts the safety half, not the inequality.** The directive
   describes degradation as "loses the relation … but degrades exactly to
   today's behaviour — no crash, no content leak". The assertable content is
   therefore: does not throw, deterministic, well-formed token string, no
   source bytes. The inequality itself is documented in the test with its
   two measured shapes (`"\n\n\n"` boundary, sub-paragraph extension) and
   deliberately NOT asserted — a scrub that later preserved those would be a
   strengthening, and a test going red on a strengthening is a check firing
   on a non-defect (`dev-loop.md` "Adding a check"; the global corpus's
   same rule). This is a choice about how to assert an accepted residual,
   not a change to the settled design.

3. **The dead `text === ""` early return was removed** rather than left in
   place beside the new empty-segment rule (§a1). Same output, and the
   directive's maintainability constraint is one rule per notion.

## (e) Candidate lessons

1. **A sanitizer's contract is not only what it destroys — it is which
   relations it carries.** `harvest.test.mjs` fully pinned the destruction
   half and was green through the entire life of the defect; the class of
   bug it could not see is the class the whole fixture corpus exists to
   capture. Where a downstream consumer is defined by a relation BETWEEN
   inputs, the transform's test needs a property over pairs, not assertions
   over singletons.
2. **Red-first sorted this file into two kinds of test on the first run.**
   Four assertions went red (the deliverable) and five were green in both
   states (preservation guards on the change). The split is only visible
   because the red run happened first; written after the fix, all ten would
   have looked alike and the guards would have carried unearned authority.
3. **An accepted residual needs a home in the code, not only in the
   report.** The privacy delta is a judgment bound to a deployment
   ("local traffic"), and a deployment can change hands. It is recorded at
   the place a future harvester will read — the scrubber's own comment —
   rather than in a review file nobody opens before committing a fixture.

## (f) Files touched + commit

    tools/harvest.mjs                                        scrubText + its comment block
    test/harvest-scrub-relations.test.mjs                    new, 10 tests
    docs/code-reviews/scrub-relations-report.md              this file
    docs/directives/scrub-relation-preservation-directive.md status line only

A single commit on the worktree branch, **unpushed**, targeted `git add` per
path — titled `harvest: scrub per paragraph so merge/extension relations
survive sanitization`. Referenced by title, not hash: this report is IN that
commit, so writing the hash here would change it (the hash is in the closing
message; `git log -1` is authoritative). `BACKLOG.md` untouched (dispatcher books it); census, bust-triage and
gate-live untouched (owned by another agent on main); the census tool was
NOT executed — the cross-tool round-trip is the dispatcher's check.

## (g) What was NOT verified

- **The cross-tool round-trip.** That a freshly harvested merged-standalone
  fixture is classified EXTENDED / MERGED-STANDALONE by
  `tools/reminder-migration-census.mjs` post-scrub is the property this
  change exists to enable, and it is the dispatcher's integration check by
  directive. What is verified here is the byte relation the census consumes
  (§a5), not the census's verdict on a real harvested fixture.
- **A real harvested fixture of this class.** The dry-run produced zero
  novel picks (all banked classes), so no new fixture was written under the
  new scrub. First real exercise happens on the next novel pair.
- **Fixture-consumer behaviour under mixed granularity across files.**
  Argued from the directive (comparisons are within-fixture) and from the
  green suite, not measured across the whole corpus.
- **Performance beyond the heap ceiling.** Wall-clock of the dry-run was
  not compared before/after; only that it completes clean at 512 MB.

## (h) Sources read, of those the brief named

- `docs/directives/scrub-relation-preservation-directive.md` — in full, first.
- `tools/harvest.mjs` — header + sanitization section in full; plus
  `selectNovelPairs`, `scanCapture`, `growthComponentSnapshot`, `pinRange`
  and the fixture-write/ledger paths for the novelty verification.
- `docs/code-reviews/extended-absorb-report.md` §c5 (plus §d, §e for context).
- `docs/dev-loop.md` "Adding a check" — in full.
- `CLAUDE.md` Public-Repo Information Hygiene — applied: all test text is
  synthetic, no capture bytes, no IPs/hosts; the §c5 real-capture numbers
  were quoted only as they already stand in a tracked file.
- `test/harvest.test.mjs`, `test/extended-absorb.test.mjs` — read for the
  existing test conventions and the workaround this change removes.
