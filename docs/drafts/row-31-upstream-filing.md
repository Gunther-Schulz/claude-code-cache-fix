# POSTED 2026-08-16 as issue #87101 — https://github.com/anthropics/claude-code/issues/87101

**Status corrected 2026-08-16.** This header read "DRAFT — not posted.
Awaiting operator GO on this exact text." after the filing had already
published, which is a stale label over its own resolved body — the exact drift
class this repo's grounding rules name, and the reason a status header is never
the basis for a claim about what is public. Verified against the world rather
than against this file: `gh issue view 87101` returns state OPEN, author
Gunther-Schulz, created `2026-08-16T09:11:12Z` (11:11 local), title identical
to the one below.

**The text below is the AS-POSTED body, with one divergence now repaired.**
This file described #78420 as a doubled-*tools* shape. It is not: #78420 is
titled "Prompt intermittently sent doubled (exact 2x conversation prefix,
cache_read=2.00x prev)" — a doubled conversation PREFIX. The posted issue was
already correct; only this stored copy carried the wrong characterisation, so
nothing wrong about a third party reached the public. Read live at correction
time, not recalled.

Venue: a NEW issue on `anthropics/claude-code`. Not a comment on #78420 —
that thread is a doubled-*prefix* shape (theirs is one request carrying a
doubled body; ours is two separate requests carrying identical bodies) and we
have already told it, in the 2026-08-14 correction, that our numbers "do not
confirm the shape in this issue". Filing this under that thread would re-blur
two different shapes.

Composed 2026-08-16 per `docs/runbooks/public-comms.md`. Every number below
was re-read at compose time from `~/.local/state/cache-fix/gate-status.json`,
written by the daily sweep that started `2026-08-16T06:48:42.781Z` and
finished `07:18:00.303Z` over 45 captures (`ok: true`, `failing: 0`).

---

**Title:** Session-start sidecar request is sent twice, ~13 ms apart, and both are billed

**Body:**

Reporting a duplicate-send shape we can measure continuously, in case it is
useful. This is a client-side send pattern, not a caching question, and it is
a *different* shape from the doubled-prefix report in #78420: theirs is one
request carrying a doubled body, ours is two separate requests carrying
identical bodies. I am filing it separately rather than adding it there for
that reason.

**What we see.** At session start, the same sidecar request is issued twice,
roughly 13 ms apart, with the second going out while the first is still in
flight. Both are answered and both are charged. The two are byte-identical
adjacent same-conversation requests carrying *distinct* upstream request-ids,
and each has its own completed usage record — so this is two accepted
requests, not one request retried after a failed stream.

**How it is measured.** We run a local forwarding proxy in front of Claude
Code that records requests pre-pipeline and replays them through a gate. The
duplicate detector groups by conversation, pairs adjacent byte-identical
bodies, and joins each member to its own usage record; a member that cannot
be joined is reported rather than dropped.

**Numbers, from the sweep named above (single machine, one day's live
traffic across 45 captures):**

- 75 duplicate pairs, forming 65 streaks; longest streak 5
- 140 requests involved, of which 62 were billed
- 38 billed streaks, of which 24 were double-billed
- `membersWithoutId: 0` — every member joined to a usage record, so the
  billing split is a read and not an estimate
- split by shape: 51 single-message streaks (17 double-billed) and 14
  multi-message streaks (7 double-billed)

**Why the split matters.** The single-message streaks are the session-start
sidecar and are the bulk of the population. The multi-message ones are a
smaller, separate group that we have characterised much less well.

**What we did NOT check, stated so the verified parts are usable:**

- We have not established the client-side cause. We observe two sends on the
  wire; we have not traced what issues them, and nothing here should be read
  as a claim about the code path.
- These are counts from **one machine's** traffic on **one day**. We have not
  checked whether the rate holds across machines, versions, or workloads, and
  we are not claiming a fleet rate.
- We have not measured the token cost of the duplicates as a fraction of
  total spend. The counts above are request counts, not a bill.
- Our own mitigation coalesces the single-message case only:
  `multiMessageCoalesced` reads **0** in the same sweep. So the multi-message
  half is unmitigated on our side and its "unchanged versus mitigated"
  comparison is *not* established — we have one post-flip multi-message
  control, which is too few to conclude anything either way.
- We have not tested whether the duplicate is idempotent from the server's
  point of view, only that both members are billed.

Happy to provide the detector's grouping rules or re-run the counts over a
longer window if that would help.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_019stbymw1bF8UET5DgRkrCv

---

## Pre-post checks (hand-run, per the runbook's gates)

- [x] **Numbers re-read at compose time** from the named instrument, not
      recalled from a backlog header. Sweep window and corpus size stated
      inline so a reader can date them.
- [x] **Hygiene** — no session ids, capture filenames, origin identifiers,
      or other-session content. No aliases either: nothing in this text needs
      to name a capture.
- [x] **Third-party claims** — the only reference to #78420 is to say the
      shapes differ, which is what our own posted correction there already
      says. No figure of theirs is restated. **Re-verified 2026-08-16 against
      the live issue**, because this file had mischaracterised it: #78420 is a
      doubled conversation PREFIX, not doubled tools. The posted body was
      already right; this stored copy was not.
- [x] **What was not checked** — five items, including the one that cuts
      against us (our own mitigation covers half the population).
- [x] **Operator GO on this exact text** — given, and the issue published as
      #87101 on 2026-08-16.

## After posting

- **Any further edit to #87101 is a fresh publication act** and needs its own
  operator GO on the exact text. Correcting this file is not that, and did not
  touch the issue.
- The as-posted body is recoverable from the world, not from here:
  `gh issue view 87101 --repo anthropics/claude-code --json body -q .body`.
  Where this file and that output disagree, the issue is the truth and this
  file is the stale copy — which is how the #78420 mischaracterisation above
  was found.
