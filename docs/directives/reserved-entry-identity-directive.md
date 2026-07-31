# Directive: reserved-entry identity — a re-served entry leaves the wire-identity space

Status: DESIGN SETTLED 2026-07-31 (fable session adf6cadb, design pass
the unit-2b closing report asked for; not built). Consumers: the build
dispatch for this directive; the flap-move directive
(`flap-move-mitigation-and-fidelity-gate.md`) whose units 2/2b are
blocked on exactly this decision; the restart-boundary BACKLOG item
(this build rides the same deferred restart, operator settle
2026-07-31: after all proxy work).

## Goal / Background

Unit 2b's closing report (`docs/audits/unit-2b-closing-report-2026-07-30.md`,
§ "Why the criterion is not met") proved by execution that the flap
regression is an IDENTITY MIS-BINDING, not a reset problem:
`computePinnedIdentities` keys a message as (content-hash, role,
occurrence-ordinal-within-the-request), and a recognized move keeps the
absorbed entry D alive in our canonical while CC has stopped sending
it — so D's ordinal is a claim about an array D is not in. The moment a
later request carries one MORE copy of the same recurring text (measured:
n=197's fresh tail reminder took o=7), D binds to that unrelated copy at
an inverted position, which (1) removes D from `droppedNow` so no move
recognition can fire and (2) trips `not-subsequence` — the merged
message goes out raw and our bytes flip where CC's were identical.
Frozen in fixture `test/fixtures/harvested/reset-move-s-dc3f8071-196-197.json`
(`_mechanism` note); same shape and hash at n=399→400.

The report named three candidate directions and chose none. This pass
chooses.

## Non-Functional Requirements

- **Size/complexity budget:** ~120–200 LOC in
  `proxy/extensions/insertion-normalization.mjs` (one new optional
  canonical-entry field, one per-request disposition pass, edits to the
  two canonical-rebuild sites) plus bites in
  `test/insertion-join-move.test.mjs`. No new file, no new abstraction.
  Materially larger → stop and surface.
- **Threat model:** conversation fidelity is the protected property and
  the conservation gate is the enforcement. The specific new risk this
  design introduces is re-serving stored bytes into a context CC has
  pruned or compacted away; the lapse rule below is the mitigation and
  it fails CLOSED (no re-serve) whenever its preconditions are not
  byte-established on the current wire.
- **Maintainability:** extends `classifyPinned` / `resetKeepingPins` /
  `findJoinMoves` in place; the join grammar stays single-copy
  (`JOIN_SEPARATOR`, the existing "same grammar seen from two sides"
  rule). `rs` is one optional boolean field on an existing entry shape.
- **Performance/reliability:** the disposition pass is O(reserved
  entries × neighborhood) per request; reserved entries are ~1–2 per
  conversation in every measured instance. n/a otherwise.
- **Load-bearing?** YES — canonical state entries (threat-matrix row 3)
  and the extension pipeline's classification order.

## The decision

**Direction B, made precise: a re-served entry's identity is its stored
first-seen bytes plus the canonical slot where we last forwarded them —
it does not participate in (hash, role, ordinal) wire matching at all.**
Marked by a new optional field `rs: true` on the canonical entry.

Why not the other two directions the report enumerated:

- **(A) ordinal over the wire WE forwarded** — rejected: incoming
  identities are necessarily computed over CC's array, so re-keying the
  canonical side over OUR array misaligns the lookup at exactly the
  requests where the two arrays differ (i.e. whenever a re-serve or
  suppression happened). It moves the mismatch, it does not remove it.
- **(C) recognize the move before the identity match** — rejected as
  the primary fix: the measured failure (n=197) is not at a
  move-recognition request. The move happened at n=195/196; n=197 fails
  because an already-resident entry re-binds. No reordering of
  recognition fixes a later request with no move event in it. (The
  design below does subsume C's intent: `rs` entries are handled before
  and outside the match.)

The general ordinal-instability of duplicate copies under middle-copy
drops is a PRE-EXISTING degradation class, not this defect, and is
deliberately out of scope — non-`rs` entries keep absolute (h, r, o)
matching byte-for-byte. Measured shapes only.

## Settled design (execute, don't re-derive)

### Mint

When a move is recognized (either path), the canonical slot for the
merged wire message files the absorbed entry `priorCanonical[mv.ci]` —
as today — now with `rs: true` added. P (the reminder-carrying
predecessor) is matched normally and never flagged.

### Match exclusion

In `classifyPinned`'s match loop, an entry with `stored.rs` is neither
looked up in `incomingByKey` nor added to `droppedNow`; it is collected
into `reserved` (ci list). Consequence, which IS the fix: a fresh
incoming copy of the same text takes the next free ordinal and matches
nothing, so it classifies as a new entry on today's append/splice path —
no re-bind, no inversion, no reset. The stored (h, r, o) key on an `rs`
entry is retained for telemetry/debugging but is no longer load-bearing.

### Per-request disposition (one of three, checked in this order)

For each reserved ci, resolve its neighborhood exactly as
`findJoinMoves` condition (d) does: lo = wire index of the nearest
preceding live matched canonical entry, hi = wire index of the nearest
following one. If either bound is unresolvable (neighbor dropped,
unmatched, or bounds crossed — disorder), the disposition pass does
NOTHING for this entry this request: no substitution, no state change,
raw forward — fail-closed, today's behavior.

1. **Re-fire:** a wire message strictly inside (lo, hi) whose
   `standaloneText` equals `pinnedReminderText(P) + JOIN_SEPARATOR +
   D.text` (the existing merged-form test) → substitute
   `out[idx] = D.m`, declare `suppressions` kind `"join-move"` and
   `reserves` as unit 2b already does, file D (`rs` kept) at that slot
   in the rebuilt canonical.
2. **Reclaim:** no merged form, but a wire message strictly inside
   (lo, hi) whose `standaloneText` equals D's whole first-seen text —
   CC flipped back to the original form (the measured oscillation leg,
   flap fixture) → clear `rs`, bind D to that wire index as an ordinary
   matched entry, and REWRITE its stored key from the incoming identity
   of that message so future absolute lookups are consistent. It then
   participates in the subsequence order check like any matched entry.
3. **Lapse:** neighborhood resolvable, neither form present — CC
   genuinely edited/pruned the region → the entry is simply not carried
   into the rebuilt canonical (today's drop semantics). Never re-serve
   into a context that no longer carries the region.

Because both canonical-rebuild sites construct the new canonical from
the incoming/out arrays, an `rs` entry persists exactly as long as its
re-serve fires — lifecycle is self-limiting by construction, on the
success path and the reset path alike (`resetKeepingPins` runs the same
disposition pass; under disorder its bounds collapse and everything
fails closed).

### Role constraint (sub-gap folded in, from the unit-2b report §c5)

`findJoinMoves` gains condition (f): the merged wire message's role must
be `"system"` and the absorbed entry's stored role must be `"system"` —
the only measured shape (`role:"system"` in `messages[]` is legitimate
wire shape per deferred-tool-rewrite). Anything else: no match, raw
path. Same constraint applies to the re-fire and reclaim probes.

## Threat-matrix row 3 — restart declaration

No key-scheme change: (h, r, o) storage is unchanged, `rs` is a new
OPTIONAL field, and canon files written by the old code contain no `rs`
entries — under the new code they take identical decisions (this is
verifier 4, not an assumption). Production has never run unit 2, so no
deployed canon file can carry a re-serve. The restart that ships this
bundle is therefore cache-transparent for every existing conversation;
the new machinery activates only at the first post-restart move
recognition. This statement is the pre-restart declaration the row
requires.

## Integration plan (dispatcher-owned)

1. Rebase `wt/fidelity/opus` (aef760b + dc8c475) onto current `main`.
   Known collision, named at booking time: 5c4d70a also modified
   `resetKeepingPins` (reset-path duplicate suppression, `suppressionsR`
   declarations). Reconcile by unifying the declaration arrays — both
   suppression kinds (`join-move` and the duplicate kind) flow through
   the one `suppressions` array the gates already read.
2. Build this directive on top.
3. The three TODO tests in `test/insertion-join-move.test.mjs` assert
   the unit-2 done-criterion this decision unblocks; they must flip to
   passing WITHOUT edits to their expectations (they are the
   definition-parented red, written before this design existed).
4. Ship as ONE deployment at the deferred restart boundary (operator
   settle 2026-07-31: after all proxy work): dotfiles pin bump + single
   proxy restart + gate stamp + the upstream-error-log flip already
   booked on that boundary's BACKLOG item.

## Verifiers (in order, real output in the report)

1. Red-first bites for the three dispositions, expectations written
   from this section before implementation: re-fire (from the committed
   reset-move fixture — n=197 must not reset and must re-serve),
   reclaim (from the flap fixture's oscillation pairs), lapse (synthetic
   prune of the region — no re-serve, entry gone). Mutation precision
   per dev-loop: each named condition removed must be bitten by the
   bite that names it — including the (f) role constraint and the
   fail-closed bounds.
2. The three existing TODO tests report as passing todos.
3. `s-dc3f8071` stability violations 2 → 0 (both measured pairs are
   this shape/hash) under `--gates-from-capture`.
4. Old-canon compatibility probe: decisions over every committed
   fixture corpus with `rs`-free canon files, pre-tree vs post-tree —
   verdict-line diff EMPTY (the unit-2b A/B instrument; it exits 2 on
   an empty corpus, keep that).
5. Full five-gate sweep, serving gate set, all corpora + live captures:
   safety/conservation/sequence/order stay 0 everywhere; stability on
   `s-633915a8` and `s-58c979ce` measured and ATTRIBUTED per pair, not
   promised — any pair this design does not close gets its mechanism
   stated (the unit-2b report's A/B discipline).
6. `npm test` full suite (known port-bound exclusions per
   CLAUDE.local.md), census sweep, `bust-triage` on the historical
   14:32:29 event re-run for its verdict line.

## Out of scope

General ordinal instability for non-`rs` duplicates (pre-existing
class, unmeasured cost); subset merges, ≥3-way joins, non-`"\n\n"`
separators, non-system roles (all fail closed); the harvest
"select ordinals + keep join relation" fixture mode and the census
replace/edit absorption class — both remain their own BACKLOG items and
are NOT preconditions for this build.
