# Synthetic BACKLOG.md sample — backlog-census bites

Front matter above `## Open`, ignored by the census exactly as
`splitEntries` ignores it.

## Open

- **READY — build the census.** See `tools/backlog-lint.mjs` for the shape
  this extends.
  <!-- entry: "build the census" -->
  red-first proof pasted below once the mutation arms are run.

- **READY — a bare item with nothing extra.** Nothing but a plain body
  sentence, deliberately empty of any special markers.

- **READY — second consumer of the shared file.** Also touches
  `tools/backlog-lint.mjs` per the entry above.

- **(DONE — abc1234, 2026-08-01).** Finished census precursor, closed out.

- **PARKED — waiting on an evidence gap.** Needs the missing measurement
  named before this can build.

- **OPEN — POINTER to the discipline doc.** POINTER: see
  `docs/dev-loop.md` for the census discipline this entry follows.

- **`legacy-tag` — an old-style entry.** Header opens with a backtick, not
  a grade word — this is the UNCLASSIFIED case.

- **HOT — urgent thing.** Needs attention now; body stays plain.

- **OPEN/HOT — double grade example.** Watch this closely; no files.

- **RESOLVED — old work closed out.** Already resolved 2026-01-01, no
  files cited.

## Later section

- **READY — should be excluded, wrong section.** This bullet sits after
  the next `## ` header and must never appear in census output; if it
  does, the section-boundary logic is broken.
