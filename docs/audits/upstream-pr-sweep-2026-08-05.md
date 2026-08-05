# Upstream PR sweep — 2026-08-05 (read-only)

Sources: `gh pr view <n> --json comments,reviews,commits,mergeable,mergeStateStatus,reviewDecision` per PR; `gh api .../pulls/<n>`; `gh api "search/issues?q=repo:cnighswonger/claude-code-cache-fix+updated:>=2026-08-02"`; full comment/review bodies read on all threads with 08-01+ activity.

## HEADLINE — supersedes the per-PR sweep below

Upstream posted a comprehensive design-appetite response on issue **#284** ("Index for the 11 open PRs from the cache-fix fork") at **2026-08-04T23:56:13Z** — one day after the framing that nothing postdates 08-01. It answers yes/no/not-this-one for every PR at once and gives an explicit landing order. Read this before acting on anything below.

---

## Per-PR facts (all 10)

### #272 insertion-normalization
- Review: vsits-codex-review-agent, 2026-07-31T18:01:09Z, CHANGES_REQUESTED (fixture PII, stale-reminder-forward not fail-closed, plaintext persistence, read-dedupe test regression).
- Last comment: Proxy Builder, 2026-08-01T13:57:40Z — rewrite mostly landed (421KB→32.3KB fixture, token-named, epoch-rebased) but **5 residual `<real-capture-id>` session-id fragments remain in comments** across `insertion-normalization.mjs:616,659`, `test/insertion-merge-suppression.test.mjs:2`, `test/insertion-suppression.test.mjs:7,267` — including the shipped extension.
- Last commit: `720ecb46`, committed 2026-08-01T13:30:35Z.
- **Verdict: AWAITING US** (comment postdates commit by 27min).
- Mergeable: MERGEABLE/BLOCKED.
- **Next action: scrub the 5 comment strings (→ token `s-4b6a435234bf`), push — reviewer restarts full review from top.**
- #284 calls this "the highest-leverage thing on your side of the board" (gates #273/#278/#281, underlies #276/#295).

### #273 deferred-tool-rewrite
- reviewDecision REVIEW_REQUIRED, zero formal reviews. Last comment is our own push announcement (2026-07-30T06:04:41Z), matches last commit `6636aa94`.
- **Verdict: NO FEEDBACK YET.**
- Mergeable: MERGEABLE/BLOCKED.
- #284: "Yes" (wanted), explicitly blocked on #272 landing first.
- **Next action: none — waiting in queue.**

### #275 request-capture
- Review: codex, 2026-07-31T17:53:23Z, CHANGES_REQUESTED (request bodies at ambient umask, need 0700/0600 + pre-write cap; `/health`+boot records dump entire unfiltered `CACHE_FIX_*` env, need allowlist).
- Last comment: Proxy Builder, 2026-07-31T17:58:15Z, same findings, notes load-bearing → needs Chris's review too.
- Last commit `7f9734ba`, 2026-07-29T10:18:52Z.
- **Verdict: AWAITING US.**
- **Mergeable: CONFLICTING/DIRTY — the only one of the ten with a real conflict.** Conflict file list not obtainable via read-only API (`mergeable_state:"dirty"` gives no path enumeration; would need a local merge attempt, out of scope for this dispatch).
- #284: wanted, "not in question at design level."
- **Next action: fix the two security blockers AND rebase to clear the conflict.**

### #276 verification-tools
- No formal review object; active comment thread instead.
- Last comment: Proxy Builder, 2026-08-01T14:00:38Z — `tools/absence-scan.mjs` has a scope blind spot: it only checks fixture *filenames* under `test/fixtures/harvested/`, never file *contents*/source comments, so 9 shipped files (incl. `insertion-normalization.mjs`, `tools/harvest.mjs`, `tools/replay.mjs`) still carry `<real-capture-id>` in comments. Reviewer explicitly "holding the fresh review on this and #272 until the scan is widened and re-run."
- Last commit `8bb3af48`, 2026-08-01T13:54:18Z.
- **Verdict: AWAITING US.**
- Mergeable: MERGEABLE/BLOCKED.
- #284 (critical addition): wants #276 but **not as one 23,378-line review** — explicitly asks to **split `tools/absence-scan.mjs` (402 LOC) into its own standalone PR**, since upstream's separate directive PR #302 depends on it and they don't want a second scanner implementation. Called "the only thing in this triage we are actively blocked on."
- **Next action: (1) widen absence-scan to scan tracked-file contents not just fixture filenames, fix the 9 files; (2) split absence-scan.mjs into its own PR — this is currently blocking upstream's #302.**

### #278 output-guard
- reviewDecision REVIEW_REQUIRED, zero reviews, only comment is our own (2026-07-30T12:38:16Z), matches last commit `e4bd379a`.
- **Verdict: NO FEEDBACK YET.**
- Mergeable: MERGEABLE/BLOCKED.
- #284: "Yes," praised, no blockers named, queued after #273.
- **Next action: none.**

### #279 thinking-block-sanitize
- Review: codex, 2026-07-31T15:39:39Z, CHANGES_REQUESTED.
- Last comment: Proxy Builder, 2026-07-31T17:14:52Z — bug confirmed real, but fix over-reaches into a case that protects against a hard failure rather than a cost regression; wants it **split by mode**.
- Last commit `0f1920ef`, 2026-07-29T10:27:06Z.
- **Verdict: AWAITING US.**
- Mergeable: MERGEABLE/BLOCKED.
- #284: "smallest and closest to landing," sequenced ahead of #273/#278.
- **Next action: split the fix by mode, push.**

### #280 prefix-diff-attribution
- Review: codex, 2026-07-31T17:57:08Z, CHANGES_REQUESTED.
- Last comment: Proxy Builder, 2026-07-31T17:58:39Z — read-only claim into the pipeline confirmed true, BUT the rewrite persists prompt-derived *content* (up to 20,000 chars of system-prompt text per block, message previews) to disk at ambient umask with **no cross-session retention bound** (no TTL/GC/cap on the snapshot directory). Load-bearing → needs Chris's review.
- Last commit `69497a33`, committed 2026-07-30T12:26:28Z.
- **Verdict: AWAITING US.**
- Mergeable: MERGEABLE/BLOCKED.
- #284: wanted, "not in question," findings from 07-31 still outstanding.
- **Next action: bound the content (hash instead of raw text) or bound retention (0600 + cross-key sweep + documented TTL), and document that `CACHE_FIX_PREFIXDIFF=1` writes prompt content to disk.**

### #281 messages-cache-breakpoint removal (draft, stacked on #272)
- reviewDecision REVIEW_REQUIRED, zero reviews. Last comment: us, 2026-07-30T12:38:18Z (rebase announcement); last commit `fb63f612` committed 2026-08-01T13:32:27Z — i.e. rebased again *after* that comment with no new comment posted.
- **Verdict: NO FEEDBACK YET** from reviewers.
- Mergeable: MERGEABLE/BLOCKED.
- #284: **explicitly deferred, not declined** — upstream wants to land #272 first, run it in production, then decide #281 "with evidence rather than in advance."
- **Next action: none — correctly parked pending #272.**

### #282 upstream-change-detection
- Review: codex, 2026-07-31T15:46:33Z, CHANGES_REQUESTED.
- Last comment: Proxy Builder, 2026-07-31T17:15:11Z — narrow blocker: the alarm predicate (`upstream-change-detection.mjs:469`) suppresses *every* count-only diff, including a **decrease** (compaction/truncation/upstream rewrite), not just growth. Wants: require count-only-diff **and** increase, plus a regression test for the decrease case.
- Last commit `de9ab87e`, committed 2026-07-30T12:24:47Z.
- **Verdict: AWAITING US.**
- Mergeable: MERGEABLE/BLOCKED.
- #284: "smallest and closest to landing."
- **Next action: narrow the predicate to increase-only, add decrease regression test, push.**

### #295 insertion-join-moves (draft, stacked on #272+#276)
- reviewDecision REVIEW_REQUIRED, zero reviews, **zero comments** (confirmed via comment count).
- Last commit `edd3173d`, 2026-08-01T13:54:24Z.
- **Verdict: NO FEEDBACK YET.**
- Mergeable: MERGEABLE/BLOCKED.
- #284: wanted but **not reviewable as presented** — GitHub's diff carries both parent stacks (69 files, 27,939 fixture + 6,373 tool lines inherited from #272/#276), so the actual 7-commit slice is invisible. Two options given: wait for #272/#276 to land and rebase down, OR **cut a branch from `main` carrying only the 7 #295-specific commits now** ("the same shape as #304, which worked").
- **Next action (optional acceleration): cut the isolated 7-commit branch if you want review to start immediately rather than waiting on #272/#276.**

## #302 / #304 (not ours)
- **#302** "docs: directive for pre-publication guards against capture-derived data" — author `vsits-proxy-builder[bot]` (upstream's own AI reviewer, not us), opened 2026-08-03T14:29:56Z, directive-only. Explicitly depends on our `tools/absence-scan.mjs` per #284/#292 threads — currently blocked on us splitting it out.
- **#304** "fix(proxy): survive a reload instead of cutting the response" — author `codeslake` (third-party contributor), opened 2026-08-04T16:00:51Z, still open, updated 2026-08-05T08:11:37Z. Supersedes a closed prior attempt #303 by the same author. Not fork-authored, no action needed from us; referenced in #284 only as a structural example ("cut a branch carrying only the relevant commits").

## Threads since 2026-08-02 mentioning the fork or asking us something

Search hit 14 items total; of those, only two are fork-authored and both have load-bearing new content:

### #284 (Gunther-Schulz, us)
The headline comment above. **Directly asks something of us**, multiple times: fix #272's comment ids; split absence-scan.mjs; decide on the #295 branch-cut option.

### #292 "cc-transcript-shape-snapshot.json carries capture-derived identifiers" (Gunther-Schulz, us)
3 follow-up comments from Proxy Builder 2026-08-03T14:11–14:39Z:
- Confirmed 6 UUIDs + 448-char thinking signature + a `$.source` path + **2,305 chars of verbatim third-party GitHub comment text with 3 third-party logins** (flagged as the highest-weight item, not in our original report). Noted the fixture's own `_note` field falsely claims it's already redacted.
- Follow-up: CI can't prevent exposure (only contributor pre-push can, since fork-PR diffs are public the instant they open and objects persist in upstream's `refs/pull/N/head` even after close/fork-deletion — confirmed for #294 and #296).
- **Asks: will we split `tools/absence-scan.mjs` out as a standalone, hook-shaped tool** (ran it against the file, confirmed it catches all findings, class+path+length only, never values) — same ask as in #284, doubly stated. Flags two fork-vs-upstream boundary conditions to fix before the split: the `cc-transcript-shape-snapshot.json` allowlist entry must be removed once that fixture is synthesized, and `CORPUS_SCOPE` has no upstream equivalent (upstream has no `test/fixtures/harvested/` directory).

### Other 12 hits
#293, #294, #296, #297, #298, #299, #300, #301, #303, #305 — upstream's own internal team activity (bot identities `vsits-proxy-builder[bot]`, `vsits-team-lead-agent[bot]`, `vsits-codex-review-agent` are cnighswonger's own AI team, per CLAUDE.local.md — same naming scheme as our tracked-but-inapplicable CLAUDE.md, not related to this fork) or third-party contributor PRs (#294 anupamme, #296/#303/#304 codeslake). None mention the fork or address us. Bodies checked, no cross-reference found.

## Gap
Could not enumerate #275's actual conflicting file paths — GitHub's REST API doesn't expose a conflict-file list short of a local merge attempt, which this dispatch was scoped read-only against. If needed: a scratch clone/merge, or wait for GitHub's mergeability recompute after a rebase.

## Full structure of the #284 headline comment (Proxy Builder, 2026-08-04T23:56:13Z)
- **Yes, review ours to schedule:** #273 (blocked on #272), #278, #279, #282.
- **Yes, with a pulled-forward request:** #276 — split absence-scan.mjs out first.
- **Already landed:** #274, #277 (merged 2026-07-31).
- **Wanted, no new decision, findings pending on us:** #275, #280.
- **Keystone, blocking everything else:** #272 — 5 stale comment-id strings only.
- **Not in reviewable shape yet:** #295 — stack makes the diff unreadable; offered a branch-cut workaround.
- **Deferred, not declined:** #281 — decide after #272 has run in production.
- **Stated order of intent (not a schedule):** 1) #272 comment fix → fresh review; 2) absence-scan.mjs split (unblocks upstream's #302); 3) #279/#282/#275/#280 when updated; 4) #273 then #278; 5) #276 in pieces; 6) #295 once visible, #281 after #272 soaks.
- Closing note: explicitly invites "ask for a decision any time a slice is blocked on one" and apologizes for the 4-day silence (attributed to a security defect + a first-time contributor consuming their bandwidth).
