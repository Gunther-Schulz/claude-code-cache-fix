# Directive: restart-transparent serialization (class 3 → zero)

Goal: a proxy restart (scheduled OR crash) produces byte-identical
request serialization, so restarts stop being busts entirely and
the FORK-NOTES "never restart mid-session" rule can retire.

Audit + fix, per extension that makes order-affecting or
content-affecting decisions. **The ✓ marks below were the directive's
TARGET state, not a finding** — read as already-true they misled a
later reader; the audit this directive commissioned
(`docs/audits/restart-state-audit.md`) is the authority on what was
actually persisted, and it contradicted one of them.
- insertion-normalization: canonical persisted ✓ (verify reload
  path against a real restart in tests).
- mid-history-breakpoint-ladder: rungs persisted — ✓ only since
  commit `7ed1886` (2026-07-27). When this directive was written the
  claim was FALSE: `sessionRungs` was a module-scope in-memory Map
  that never touched disk, as the extension's own comment block
  stated. The audit found it (restart-state-audit.md:76-91), which is
  precisely what the "verify against a real restart" instruction was
  for.
- sort-stabilization / fresh-session-sort / tool-input-normalize /
  identity-normalization / content-strip: decide per extension —
  DETERMINISTIC functions of the request alone need no state;
  anything keyed on "first-seen" order MUST persist it (snapshots
  dir, same idiom). The audit lists each extension with verdict
  deterministic|stateful-persisted|stateful-UNPERSISTED and fixes
  the last class.
- Startup self-check: on first request after boot, if a persisted
  serialization state exists for the session key, apply it BEFORE
  emitting; telemetry line {restart_transparent: true|false,
  reason} so worktime can attribute any residue.
- Acceptance: a test that serializes a request, simulates process
  restart (fresh module state, reload persisted files), replays
  the same incoming request, asserts BYTE-IDENTICAL output.
