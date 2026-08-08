# Worktree lifecycle — POINTER, the body lives in `dispatch-guards`

The incident happened here (2026-08-08: 16 stale worktrees in this repo,
then a dispatcher sweep that force-removed all of them including other
sessions'), but the FIX is not this repo's — it belongs to the
`dispatch-guards` plugin, which owns the worktree recipe and the
`worktree` skill.

**Body:** `~/dev/Gunther-Schulz/dispatch-guards/dev-notes/worktree-OBSERVATIONS.md`,
section "2026-08-08 — LIFECYCLE" (both halves, the constraints, the open
design questions, the evidence limits, the red-first verifier).
**Work item:** that repo's `BACKLOG.md`, PARKED with its named missing
evidence.

This file was originally written as the full brief IN THIS REPO, which was
the wrong carrier and is worth recording as the reason it is now a pointer:
the consumer is a session working in `dispatch-guards`, and a fresh context
loads its own repo's notes, never a sibling's. A brief parked off its
consumer's read path reaches that consumer only by operator relay — which
is exactly what happened here, in the one turn between writing it and being
asked "isn't that a dispatch-guards issue?".

**What this repo still owns, and it is only this:** `docs/dev-loop.md` says
concurrent lanes here need worktrees and that a fresh worktree needs its
`node_modules` symlink. If the plugin-side design implies a change to that
text, it comes back as a recommendation and is applied here by a session
working in this repo — the worktree lane does not write to this tree.
