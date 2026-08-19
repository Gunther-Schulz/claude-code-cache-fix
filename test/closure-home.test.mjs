// tools/closure-home.mjs — the single home for "where does this carrier's
// closure home live", read instead of restated by tools/backlog-lint.mjs,
// tools/alias-claim.mjs and tools/runbook-lane-index.mjs.
//
// WHAT THIS GUARDS. `## Done` was a literal in all three readers, which made
// splitting `## Done` out of BACKLOG.md into its own file expensive — the
// split had to be re-taught to each reader by hand. This suite pins the
// resolver's own three outcomes; the three readers' own suites pin that they
// actually use it (backlog-lint.test.mjs, alias-claim.test.mjs) or that they
// provably do not need to (runbook-lane-index.test.mjs).

import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveClosureHome, DEFAULT_CLOSURE_HOME_PREFIX } from "../tools/closure-home.mjs";

test("DEFAULT_CLOSURE_HOME_PREFIX is ## Done — today's behaviour, named as a constant", () => {
  assert.equal(DEFAULT_CLOSURE_HOME_PREFIX, "## Done");
});

test("no declaration at all -> the default section, unconditionally", () => {
  const text = "## Open\n\n- **READY — nothing declares a closure home.**\n";
  assert.deepEqual(resolveClosureHome(text), { kind: "section", prefix: "## Done" });
});

test("an empty carrier (no head, no sections) still resolves to the default", () => {
  assert.deepEqual(resolveClosureHome(""), { kind: "section", prefix: "## Done" });
});

test("a `## `-prefixed declared value resolves to a renamed in-file section", () => {
  const text = "Closure-home: ## Archive\n## Open\n\n- **READY — a thing.**\n";
  assert.deepEqual(resolveClosureHome(text), { kind: "section", prefix: "## Archive" });
});

test("any other declared value resolves to a repo-relative FILE path", () => {
  const text = "Closure-home: BACKLOG-DONE.md\n## Open\n\n- **READY — a thing.**\n";
  assert.deepEqual(resolveClosureHome(text), { kind: "file", path: "BACKLOG-DONE.md" });
});

test("a file path nested under a subdirectory is passed through unresolved — the caller joins it against the carrier's own directory", () => {
  const text = "Closure-home: archive/BACKLOG-DONE.md\n## Open\n";
  assert.deepEqual(resolveClosureHome(text), { kind: "file", path: "archive/BACKLOG-DONE.md" });
});

// THE HEAD BOUNDARY — the declaration is only read from the lines BEFORE the
// first `## ` heading. A line that happens to start with "Closure-home: "
// inside a bullet's body (quoting this file's own convention, say) must
// never be mistaken for the real declaration.
test("a `Closure-home:`-shaped line INSIDE a section body is not the declaration — the default still applies", () => {
  const text =
    "## Open\n\n" +
    "- **READY — document the convention.** The carrier-header declaration is\n" +
    "  spelled `Closure-home: BACKLOG-DONE.md`, quoted here for reference.\n";
  assert.deepEqual(resolveClosureHome(text), { kind: "section", prefix: "## Done" });
});

test("the declaration is read even when other head lines precede or follow it", () => {
  const text = "Grades: READY PARKED DONE\nClosure-home: BACKLOG-DONE.md\n## Open\n";
  assert.deepEqual(resolveClosureHome(text), { kind: "file", path: "BACKLOG-DONE.md" });
});

test("a carrier whose very first line is a `## ` heading (no head at all) resolves to the default", () => {
  const text = "## Open\n\n- **READY — a thing.**\n";
  assert.deepEqual(resolveClosureHome(text), { kind: "section", prefix: "## Done" });
});

test("only the FIRST Closure-home: line in the head is read", () => {
  const text = "Closure-home: BACKLOG-DONE.md\nClosure-home: ## Archive\n## Open\n";
  assert.deepEqual(resolveClosureHome(text), { kind: "file", path: "BACKLOG-DONE.md" });
});

test("surrounding whitespace on the declared value is trimmed", () => {
  const text = "Closure-home:   BACKLOG-DONE.md  \n## Open\n";
  assert.deepEqual(resolveClosureHome(text), { kind: "file", path: "BACKLOG-DONE.md" });
});
