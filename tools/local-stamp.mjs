// Shared rendering for HUMAN-FACING timestamps.
//
// BACKLOG ("every human-facing stamp emits BOTH zones..."): the tools stay
// UTC — dev-loop.md, "Timestamps are UTC, at both ends of the chain" — but
// the operator reads a wall clock, and a bare UTC stamp in a reply or a
// terminal line hands them a number that is not the one on their screen.
// Measured 2026-08-07: `04:08:35Z` and `04:17:25Z` were 06:08 and 06:17
// locally; two people were each right about a different bust while
// appearing to contradict each other, and only converting both stamps into
// both zones separated them.
//
// This module renders the LOCAL half only. Callers keep the UTC token as
// they already produce it (still first, still unmodified) and pair it with
// what this module returns:
//   `2026-08-07T04:08:35Z ${localSuffix(t)}` -> "...04:08:35Z (06:08 local)"
//
// Machine-read output — JSON, status files, ledgers, JSONL, wire query
// parameters, anything another tool parses — does not call this module at
// all; that is the same class in mirror (a local suffix there is a parsing
// hazard, not a fix) and stays exactly as it was.
//
// Where a UTC token is itself a documented copy-paste target (bust-triage
// --list -> dossier), it stays a stand-alone field — this module's output
// goes beside it, never glued on with a single space, so the existing
// "first token = the stamp" parsing keeps working unchanged.

/** "HH:MM local" for the given instant, in this machine's zone. */
export function localClock(epochMsOrDate) {
  const d = epochMsOrDate instanceof Date ? epochMsOrDate : new Date(epochMsOrDate);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} local`;
}

/** "(HH:MM local)" — the parenthesised suffix used inline in prose. */
export function localSuffix(epochMsOrDate) {
  return `(${localClock(epochMsOrDate)})`;
}

/**
 * Pairs an already-rendered UTC stamp with its local suffix, separated by a
 * plain space: "2026-08-07T04:08:35Z (06:08 local)". Only for sites where
 * the combined string is never re-parsed or re-split elsewhere — a
 * copy-paste or column-parsed UTC token uses `localSuffix` as its own
 * field instead (two-space-separated), so trimming or splitting on
 * whitespace still isolates the bare UTC stamp.
 */
export function withLocal(utcText, epochMsOrDate) {
  return `${utcText} ${localSuffix(epochMsOrDate)}`;
}
