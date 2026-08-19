#!/usr/bin/env node
// closure-home — resolves where a backlog-shaped carrier keeps its CLOSED
// entries: an in-file `## Done`-prefixed section by default, a renamed
// in-file section, or a separate file entirely.
//
// WHY THIS EXISTS. `## Done` was RESTATED as a literal in three independent
// readers (tools/backlog-lint.mjs, tools/alias-claim.mjs,
// tools/runbook-lane-index.mjs) that each need to know where a carrier's
// closed entries live. BACKLOG.md is 21,628 lines, `## Done` alone 10,228 of
// them across 268 of 573 entries (2026-08-19), and the operator has decided
// to split `## Done` into its own file — which the restatement makes
// expensive, since the split has to be re-taught to each reader by hand.
// This is the single declaration they now read instead.
//
// The idiom mirrors dotfiles' `tools/backlog-census.py` carrier-header
// declaration (`Grades: READY PARKED DONE …`, `DECLARATION_RE =
// /^Grades: (.+)$/`, per-repo opt-in, a default vocabulary when the line is
// absent) — a second declaration living in the same head, same shape, same
// default-preserving contract.
//
// FORMAT: a line `Closure-home: <value>` anywhere in the carrier's HEAD —
// the lines before its first `## ` heading, the same region a carrier's
// other declarations (e.g. `Grades:`) live in.
//   - absent                 -> { kind: "section", prefix: "## Done" } —
//                                today's behaviour, unconditionally.
//   - value starts with "## " -> { kind: "section", prefix: value } — a
//                                renamed in-file section.
//   - anything else          -> { kind: "file", path: value } — a
//                                repo-relative path to a separate carrier
//                                holding the closed entries.
//
// This module ONLY resolves the declaration — it never touches the
// filesystem. A caller that resolves a `kind: "file"` home reads `path`
// itself, relative to the CARRIER's own directory (never cwd, never the
// process's), and treats a read failure as COULD-NOT-VERIFY in its own
// vocabulary — never a silent zero, never an uncaught exception (dev-loop.md,
// "A checker has THREE answers, not two").

const DEFAULT_PREFIX = "## Done";
const DECLARATION_RE = /^Closure-home: (.+)$/m;

// The carrier's HEAD: every line before its first `## ` heading. Derived
// from the text's own structure, never a fixed line count — the same idiom
// `censusOpenSection` (tools/backlog-lint.mjs) uses for the boundary it
// finds.
function headOf(text) {
  const lines = text.split("\n");
  const idx = lines.findIndex((l) => l.startsWith("## "));
  return idx === -1 ? text : lines.slice(0, idx).join("\n");
}

/** Resolve the `Closure-home:` declaration out of a carrier's text. See the
 * header above for the three outcomes and their shapes.
 */
export function resolveClosureHome(carrierText) {
  const head = headOf(carrierText);
  const m = DECLARATION_RE.exec(head);
  if (!m) return { kind: "section", prefix: DEFAULT_PREFIX };
  const value = m[1].trim();
  if (value.startsWith("## ")) return { kind: "section", prefix: value };
  return { kind: "file", path: value };
}

// Exported for callers that need today's default prefix as a literal (e.g.
// to compare against a `kind: "file"` home's absent in-file counterpart) —
// never for a second `## Done` restatement.
export const DEFAULT_CLOSURE_HOME_PREFIX = DEFAULT_PREFIX;
