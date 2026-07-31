# TITLE

feat(insertion-normalization): un-merge CC's join-moves, and stop a re-served entry from re-binding

# BODY

> **DRAFT — stacks on #272 and #276, review alongside them.** This branch is
> cut from #272's head (`b713b2f`) and merges #276's updated head, because its
> tests assert against `tools/replay.mjs`'s gate functions. Base is
> `upstream/main`, so the diff shown by GitHub includes both parents' content;
> the material new to *this* PR is the six commits after the merge. Same
> precedent as #281.

## What this is

CC sometimes **merges a `<system-reminder>` message and its immediate
standalone neighbour into a single message** mid-history, then sometimes
un-merges them again a few requests later. Every one of those flips rewrites
history the model has already seen, which busts the prefix cache and re-bills
the whole conversation.

#272 gave the proxy the ability to recognise a message across
re-serializations and to pin the first-seen bytes. This PR closes the two
cases that pinning alone could not:

**1. The join-move un-merge.** When we recognise that a message CC used to send
standalone has been absorbed into its neighbour, we serve the first-seen
(un-merged) form upstream instead of the newly merged bytes. The join grammar
is a single `"\n\n"` separator — the same literal the duplicate-suppression
path already keys on — and the probe is byte-exact: the merged wire message's
text must equal `pinnedReminderText(predecessor) + "\n\n" + absorbed.text`, both
messages must be `role: "system"`, and the absorbed entry's neighbourhood
bounds must resolve on the current wire. Anything else fails closed: no
substitution, raw forward, today's behaviour.

**2. The identity fix — a re-served entry leaves the wire-identity space.**
This is the part that took a rebuild rather than a patch. Pinned entries are
keyed by `(content-hash, role, occurrence-ordinal-within-the-request)`. A
recognised move keeps the absorbed entry alive in *our* canonical while CC has
stopped sending it — so its ordinal is a claim about an array it is not in.
The moment a later request carries **one more copy of the same recurring text**
(measured: a fresh tail reminder taking `o=7`), the stale entry binds to that
unrelated copy at an inverted position, which both removes it from the dropped
set — so no move recognition can fire — and trips the subsequence check. The
merged message then goes out raw and *our* bytes flip at an index where CC's
were identical.

The fix marks such an entry `rs: true` and takes it out of `(h, r, o)` matching
entirely. Its identity becomes its stored first-seen bytes plus the canonical
slot where we last forwarded them. Each request it gets exactly one of three
dispositions, checked in order: **re-fire** (the merged form is present again →
re-serve), **reclaim** (CC flipped back to the original form → clear the mark
and rebind as an ordinary matched entry), **lapse** (neither form present → the
entry is dropped, never re-served into a region CC no longer carries). Entries
that were never re-served keep absolute `(h, r, o)` matching byte-for-byte.

## Measured — A/B over the live corpus

Two detached worktrees differing only by this diff, replayed over 8.5 GB of
real capture (36 captures, ~10 000 requests) under the serving gate set:

| capture | before | after | requests (identical both runs) |
|---|---|---|---|
| s-dc3f8071 | 2 | **0** | 769 |
| s-58c979ce | 2 | **0** | 2073 |
| s-633915a8 | 2 | **0** | 2630 |
| s-9f9d8a9d | 1 | **0** | 209 |
| s-0d6f38ba | 3 | **2** | 1058 |
| **corpus total** | **10** | **2** | |

Cross-request byte-stability violations go **10 → 2**, and the two survivors
are attributed by the gate's own attribution line to a *different* extension
(`deferred-tool-rewrite`) and are byte-for-byte the same two pairs in both
trees. **Zero insertion-normalization stability violations remain in the whole
corpus.** Safety, conservation, sequence and canonical order read 0 on every
capture in both trees.

Worth stating plainly: the same ordinal collision was firing on **four**
captures, not the one it was found on. That only became visible because the
measurement was corpus-wide rather than fixture-wide.

Two honesty notes about the sweep as an A/B. The capture *count* differs (33 vs
36) — three tiny captures (2, 13 and 1 requests) were present only for the
second run, all clean, none in the failing set. And several captures are live
and still growing, so two sequential 8 GB sweeps are confounded in principle —
but the per-capture request counts are identical for every capture in the table,
so for the captures the comparison is about, both trees replayed the same input.

**Old-canon compatibility** was measured, not argued: `tools/verdict-ab.mjs
--seed-from-a` replays decisions over canon files written by the pre-change
code and is **identical across 44 verdict lines / 6 corpora**. `rs` is a new
optional field; canon files from the old code contain none, and under the new
code they take identical decisions. A restart shipping this is
cache-transparent for every existing conversation.

## Non-Functional Requirements

- **Size/complexity budget.** ~590 added lines in
  `proxy/extensions/insertion-normalization.mjs` (no new production file, no
  new abstraction, no new env var — it extends `classifyPinned`,
  `resetKeepingPins` and `findJoinMoves` in place). The originating directive
  budgeted 120–200 LOC; the overrun is the reconciliation with #272's
  reset-path duplicate suppression, which had to unify two declaration paths
  rather than add a second one. Tests: ~1,170 lines across three files, plus a
  20.6k-line harvested fixture — see the fixture caveat below.
- **Threat model.** Conversation fidelity is the protected property; the
  conservation and stability gates are the enforcement. The new risk this
  design introduces is re-serving stored bytes into a context CC has pruned or
  compacted away. The lapse disposition is the mitigation and it fails **closed**
  — no re-serve — whenever its preconditions are not byte-established on the
  current wire. No new persisted state shape beyond `rs`, one optional boolean
  on an existing entry.
- **Maintainability.** The join grammar stays single-copy (`JOIN_SEPARATOR`);
  the merged-form probe is the same literal the duplicate suppression already
  uses, seen from the other side.
- **Performance/reliability.** The disposition pass is O(reserved entries ×
  neighbourhood) per request; reserved entries measured at 1–2 per conversation
  in every observed instance.
- **Load-bearing? YES.** It changes canonical state entries and the bytes
  forwarded on the wire.

## Open, and inherited from #272

- **#272's four blockers are not addressed here.** In particular the
  reminder-only-edit case (blocker 1) and the canon-file permissions (blocker 3)
  are properties of the base this branch sits on. Whatever lands there lands
  here.
- **`test/proxy-read-dedupe.test.mjs:505` is red on this branch**, exactly as it
  is on #272 — the extension-order adjacency assertion. Reproduced at #272's
  head before any commit here: 41/42 on that file alone. Left for the
  deliberate fix #272's review asked for (move the order, or update the
  assertion) rather than patched in a stacked PR.
- **Fixture sanitization is an open question, not a settled one.** This branch
  carries `test/fixtures/harvested/reset-move-s-dc3f8071-196-197.json` (the
  reset leg) and, via the #276 merge, `flap-s-0d6f38ba-86.json` (the
  oscillation leg). #272's review flagged the harvested-fixture class as a
  blocker and asked us to agree a path before pushing changes. Neither fixture
  should be treated as reviewed on that axis by this PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
