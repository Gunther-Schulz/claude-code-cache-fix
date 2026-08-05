# Backlog takeover brief — 2026-08-05 evening

For an **opus-5** session run interactively by the operator on this repo.
This is an EXECUTION brief for a peer session, not a subagent dispatch: fork
conventions bind in full (commit means commit-and-push on fork main; the
subagent commit-unpushed rule does NOT apply). Judgment calls that change
serving behavior or the matrix's shape return to the operator as questions.

Working copy: `/home/g/dev/vendor/claude-code-cache-fix`, branch `main`,
at or after `0844e15`. Base check: `git pull --ff-only` first; a non-ff
state halts — another writer moved main.

## Grounding basis — read before the first change; cite what was read

- `docs/dev-loop.md` and `FORK-NOTES.md` — WHOLE files. A PreToolUse gate
  denies the session's first Write/Edit here until both are Read; read them
  before you need them, not when bounced.
- `CLAUDE.local.md` — the operator overlay: deployment coupling, verify
  commands, fork-vs-upstream rules.
- `BACKLOG.md` — the ready items named below, read at their entries, in
  full. Entries are the briefs; this file only orders them.
- The last five commits (`git log -5`) — today's review session's changes;
  the commit messages carry the rationale.

## Background (established today; verify at the cited places, do not re-derive)

- The proxy serves tree `ddefe1d35695` (restarted this evening;
  `curl -s 127.0.0.1:9801/health` must equal
  `node proxy/source-fingerprint.mjs`). Row-3 for that restart: stated and
  clean (no state keys, test-only code path).
- A gate re-stamp sweep was started right after. **First act of the
  session: read `~/.claude/cache-fix-gate-status.json` and confirm
  `code.proxyTree == ddefe1d35695` and `failing == 1`** — only the
  long-standing conservation capture (matrix row 24's own pair) should
  remain red. The former second red (the index-0 capture) is now a
  declared stability exemption, `memory-stranded-by-key-rotation`
  (replay.mjs; row 25 explains it). Any OTHER failing row is a fresh
  finding: triage it before queue work (`node tools/bust-triage.mjs`).
- CLOSED today, do not reopen without new evidence: the `/resume`
  messages[0]-pin question (refused on corpus-wide measurement — BACKLOG
  "DONE … closed on measurement, step 0" and matrix row 24's
  "MITIGABILITY ASSESSED"); the index-0 investigation (row 25, MITIGATED,
  standing red explained); the relocation-memory extension design (its one
  uncovered stranding route is PARKED with its promotion signal named).

## The queue (each entry in BACKLOG.md is the decision-complete brief)

1. **Classify CACHE-CONTROL 14 / TEXT 15** — the night handoff's stated
   top of queue (BACKLOG, "HANDOFF 2026-08-05 NIGHT", THEN-the-next-number
   section): 30 remaining absorption misses, 24 ours, both classes masked
   until the container fix. Note: the handoff's "exactly as the evening
   handoff ordered them" clause contradicts its own ordering sentence —
   the ordering SENTENCE (cache-control first) is the later ruling; if the
   classification surfaces a reason to reorder, that is a session-level
   call, state it in the booking.
2. **`builtByUs` + pin-at-finding, one lane, sequential** (evening
   handoff's item (1); both `tools/`, both touch replay.mjs/gate-live.mjs).
   pin-at-finding is ALSO the written revert trigger for the
   `CACHE_FIX_CAPTURE_MAX_MB` 12288 bridge — landing it retires the bridge
   (revert note lives in the dotfiles unit file).
3. **Born-large census class** (BACKLOG "READY — born-large conversation
   starts become a census class") — design, verifier, and done-criterion in
   the entry; ~60 LOC + 3 bites, report-only.
4. Remaining READY items in BACKLOG order (`bust-triage --at`
   substitution note; byte-gate MISMATCH rows' exit path; the
   evidence-leaves-window FINDING items), each self-contained at its entry.

PARKED items stay parked unless their named promotion evidence appears —
in particular the rotated-identity born-large population (two one-capture
lookups would promote it; cheap, optional, but a finding not a queue item).

## Standing constraints

- `proxy/**` changes are deployment-coupled: dotfiles pin bump
  (`git rev-parse --short HEAD:proxy` → `CACHE_FIX_PROXY_TREE_PIN` in
  dotfiles `bootstrap/manifest.py`) + restart + gate re-stamp, row-3
  statement BEFORE the restart. `tools/`-only commits need none of that.
- Extension-behavior or gate changes land WITH their instruments (dev-loop
  closing gate Q4) and their red-first bites — a new check counts only
  after it has gone red on the real defect (dev-loop "Adding a check").
- Public repo: no session ids, no capture filenames, no origin details in
  tracked files or commit messages. Captures are named by alias
  (s-captureAB style) with timestamp joins against the local status file.
- Verify before booking anything: `npm test` (run alone), and for
  gate-facing changes `node tools/gate-live.mjs` or the systemd gate unit;
  `node tools/backlog-lint.mjs` after BACKLOG edits.

## Report

Interactive session: your reports go to the operator in-conversation, and
the durable half goes where the repo's conventions put it — decisions and
closures into BACKLOG.md entries with commit refs, mechanisms into
dev-loop.md or the matrix only at the level they are true, rationale in
commit messages. Every work item closes through dev-loop's four closing
questions, answers stated in the closing reply, not silently. A missing
decision, file, or value is surfaced as a gap, never bridged with a guess;
anything needing the operator's call (serving-behavior changes, matrix
reshaping, public posts) is returned as a question with its evidence.
