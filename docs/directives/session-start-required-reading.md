# Suggestion: force the BODY of load-bearing files to be read at session start

**Status: SUGGESTION, not a decision.** Written 2026-08-05 for the operator
to hand to another session. The incident below is fact and measured; the
proposed mechanism is a recommendation with its trade-offs and its one
hard constraint stated. Whoever builds it should re-decide the shape.

**Consumer:** the session that builds the hook. It lives here because
`docs/directives/` is fork-only and tracked; if the hook is built in the
dotfiles repo (where `~/.claude/settings.json` and the hook scripts live),
move this file there — it belongs with the mechanism, not with the proxy.

## What happened

The operator asked whether the capture corpus expiring had a good permanent
solution. I designed one from scratch over several turns: evidence should
leave the rolling window at *finding* time, as kilobyte-sized pins, so the
window only has to serve discovery. Then I opened `docs/dev-loop.md` and
found the rule already there, as closing-gate question 2, written earlier
and better:

> **Is the evidence harvestable?** Captures rotate on a quadratic clock; a
> finding that rests on volatile bytes is a finding with an expiry date. If
> the claim would be unverifiable after rotation, snapshot what proves it —
> sanitized, via the harvest path — before closing.

Cost: roughly an hour of re-derivation, a machine change (retention ceiling
8192 -> 12288) proposed as *the* answer when the runbook would have framed
it as a bridge from the start, and an operator having to ask twice.

## Why it was not read — the mechanism, not the excuse

`CLAUDE.local.md` is injected at session start and does point at the file.
Its exact words:

> `docs/dev-loop.md` is the working discipline: the four commands, the gate,
> replay-the-serving-config, rule-out-the-instrument, the THREE-answer rule,
> and the **closing gate** — four questions every piece of work answers
> before it closes (mechanized? harvestable? census class? instruments rode
> along?).

So the pointer was in context from turn one, and it contains a **lossy
summary of the very rule that was missed**. "harvestable?" reads as a
yes/no answerable from general knowledge. The body says something the
one-word form does not: that the answer decays, that captures rotate on a
clock, and that the obligation is to *snapshot before closing*. Having the
label produced the feeling of holding the rule, which is exactly what stops
a session from opening the file.

This is the paraphrase-drift shape from the operator corpus, applied to
instructions rather than to data: a label standing over its own body, with
the body never fetched. The pointer did not fail by being absent or vague —
it failed by being *good enough to feel sufficient*. More pointers, or
better-worded ones, make this worse rather than better.

Second instance, same day, same shape: the absorption check shipped that
morning storing finding COUNTS only. Question 2 applied to it and was not
asked; by afternoon 3 of the 12 captures behind its first 50 finding rows
had been evicted, taking 11 rows with them. So this is a recurring session
behaviour, not one session's lapse.

## The hard constraint any design must respect (measured, twice)

**A large SessionStart hook payload does not reach the model.** The harness
truncates oversized hook output to a preview plus a file pointer. Observed
live in this session: the periodic re-anchor hook emitted ~53.9 KB and what
arrived was `Output too large (53.9KB). Full output saved to: …` plus the
first 2 KB. The same mechanism is already recorded in this repo's BACKLOG
for that hook: a 54,266-byte payload truncated to a 2,324-char preview.

The consequence is decisive for this suggestion: **a hook that injects
whole files reproduces the exact failure it exists to fix** — the model
receives a pointer to a body it did not read, which is the current
situation with extra steps. `docs/dev-loop.md` alone is 729 lines.

## Candidate designs

1. **Compact verbatim extract at SessionStart.** Inject the closing gate's
   four questions and the standing rules *verbatim* — roughly 40-60 lines,
   comfortably under the truncation threshold — rather than the whole file
   or a summary of it. Cheap, always present, no enforcement. Weakness: it
   is still injection, so it competes for attention with everything else in
   a long session, and it covers only what was extracted.
2. **A read gate (PreToolUse).** Deny the first `Write`/`Edit` in this repo
   until the session has actually `Read` the required files. This is a
   computable predicate — the harness knows which files the session read —
   with a near-zero false-fire rate, because complying costs two reads.
   Enforcement rather than hope, which is the operator corpus's stated
   preference ("anything that must be guaranteed belongs in a mechanism
   without moods"). Weakness: it fires at write time, and some sessions
   legitimately only read; it must not block read-only work.
3. **Do nothing structural; sharpen the pointer.** Rejected in this
   write-up, and the reason is the finding above: the pointer was already
   sharp, and its sharpness is what made it feel sufficient.

**Recommendation: 1 + 2 together.** The extract makes the rules present;
the gate makes the body's reading a precondition for the first change.
Neither alone covers the observed failure — 1 can be skimmed, and 2 alone
arrives only when a write is already being attempted, which is after the
design thinking has happened.

Open questions for the building session, none of them settled here:

- **Which files are "required"?** Candidates for this repo: `FORK-NOTES.md`
  (the standing vision and the trajectory test) and `docs/dev-loop.md` (the
  working discipline). Make the list data, not code, so other repos can
  carry their own; a repo with no list gets no gate.
- **Where does the list live?** A per-repo file the hook reads is the
  obvious shape, and it must fail OPEN when absent.
- **Does the gate key on the file being read, or read *recently*?** A
  session that read it 200k tokens ago is in the same position as one that
  never did — the re-anchor mechanism exists because attention decays. A
  freshness window may matter more than a boolean.
- **Interaction with the existing re-anchor hook**, which already re-shows
  the CLAUDE.md corpus periodically and is itself being truncated. Whatever
  is built here should probably fix that truncation too, since it is the
  same defect in the same class of mechanism.
