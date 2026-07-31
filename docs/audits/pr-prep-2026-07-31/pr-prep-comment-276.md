Pushed wave 3 — fifteen commits, bringing the slice back to byte-equality with
fork tip for the whole of `tools/`.

Four of them are prerequisites the earlier waves had skipped, surfaced by
re-deriving the file-scoped history rather than trusting the wave's commit
list: the blockMigration counter now counts only reminder-wrapped blocks (a
message that merely shed a sibling is not a standalone emergence), the flap
annotation that flags a migration pair reversing within 5 requests instead of
reading it off adjacent capture lines, the **fidelity gate** (every CC byte
accounted for in the forwarded body, or red), and the pinned flap fixture those
checks read.

The rest is the day's work:

- **`tools/reminder-migration-census.mjs`** (new) — byte-tests the canonical
  reconstruction rule across the capture corpus and reports four deliberately
  separated verdicts (EXACT / EXTENDED / DROPPED / MISMATCH) so none can inflate
  another. It exists because the rule had been hand-derived from two occurrences
  in one capture: it reproduced one byte-exactly and failed the other, a split
  invisible at n=1. Since then it has learned to read captures by *line* and
  name what it could not read, to split EXTENDED into MERGED-STANDALONE vs
  NEW-TEXT, to classify prune events, and to measure placement by host identity
  rather than first-content-match.
- **`tools/bust-triage.mjs`** (new) — one command from an observed bust to a
  classified verdict, and it now also sees the controlled-cost events the
  statusline surfaces.
- **`tools/verdict-ab.mjs`** (new) — per-request classification verdicts for two
  trees, diffed. This is the A/B instrument from the pinning work graduated into
  a tool; it is what makes an old-canon compatibility claim measured instead of
  argued.
- **`tools/harvest.mjs`** — the scrubber now splits on `"\n\n"`, tokenizes each
  paragraph and rejoins, so the prefix and join relations that *define* the
  merged-standalone class survive sanitization. Measured, not inferred:
  `scrub(a + "\n\n" + b) != scrub(a) + "\n\n" + scrub(b)` under the old
  whole-text tokenizer, which meant a fixture pinned for that class could not
  reproduce the class it was pinned for.
- **`tools/gate-live.mjs`** — the daily sweep rides the byte-match census on
  every run.
- **`tools/replay.mjs`** — plus the join-move declaration, so a re-served move
  reads to the gates as designed behaviour rather than as a violation. (Only the
  `tools/` half of that fork commit travels here; the extension half is in the
  new stacked PR below.)

Tests: **179 pass / 0 fail** across the seventeen verification-stack files;
**1703 pass / 1 fail** on the full suite minus the two port-bound files
(`proxy-integration`, `proxy-wrapper`). The one failure is
`test/proxy-read-dedupe.test.mjs:505`, the extension-order adjacency assertion
already reported on #272 — reproduced at this branch's previous head before any
of these commits, so it is inherited, not introduced. It stays for the
deliberate fix that review asked for.

Merges cleanly onto current `upstream/main` (`git merge-tree` clean, no rebase
needed).

Related: the join-move / reserved-entry work that consumes these gates is now up
as a draft PR stacked on this branch and on #272.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
