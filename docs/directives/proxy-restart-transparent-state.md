# Directive: restart-transparent serialization (class 3 → zero)

Goal: a proxy restart (scheduled OR crash) produces byte-identical
request serialization, so restarts stop being busts entirely and
the FORK-NOTES "never restart mid-session" rule can retire.

Audit + fix, per extension that makes order-affecting or
content-affecting decisions:
- insertion-normalization: canonical persisted ✓ (verify reload
  path against a real restart in tests).
- mid-history-breakpoint-ladder: rungs persisted ✓ (same).
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
