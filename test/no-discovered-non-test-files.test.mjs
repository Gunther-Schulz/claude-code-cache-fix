// The WRITER-side guard for the test-glob discovery class.
//
// DEFINITION: node's default `--test` discovery (measured against node
// v26.4.0 by probe, not read from docs) executes two independent kinds of
// file: (1) any file under a directory named `test/` at any depth, and
// (2) anywhere else in the scanned tree, a file whose NAME matches
// `test-*.{js,mjs,cjs}`, `*-test.*`, `*_test.*`, `*.test.*`, or `test.*`.
// Discovery does not descend into `node_modules` or into any directory
// whose name starts with `.` (both probed).
//
// A non-test file whose name happens to match rule 2 is executed as a
// zero-assertion "test" — inflating the suite count, and if it has a
// side effect at import time, running that side effect on every
// `npm test`. The live instance this guard exists to close:
// `tools/test-config-root.mjs` matched `test-*` and ran as
// `✔ tools/test-config-root.mjs` in the suite output on every run, until
// it was renamed to `tools/suite-config-root.mjs` in this same commit —
// moving it out of `test/` (which only satisfied rule 1) had not stopped
// this, because rule 2 caught it anyway.
//
// WHY A SOURCE CHECK AND NOT A COUNT OF THE SUITE OUTPUT. A test count is
// the READER half — it notices only after a stray file is already being
// run, and only if someone is watching the number. The writer is the
// thing still running: someone adds `tools/status-check.mjs` tomorrow and
// nothing about the suite's pass/fail counts announces that it is now
// also a "test". This is the generator's guard, shaped on
// `test/no-raw-mkdtemp.test.mjs` — this repo's established guard idiom.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

// Rule 2 of node's discovery glob — basename patterns, restricted to the
// three extensions node's test runner actually imports (.js/.mjs/.cjs).
// Measured against node v26.4.0 by probe.
const DISCOVERY_PATTERNS = [
  /^test-.*\.(js|mjs|cjs)$/,
  /^test\.(js|mjs|cjs)$/,
  /^.*-test\.(js|mjs|cjs)$/,
  /^.*_test\.(js|mjs|cjs)$/,
  /^.*\.test\.(js|mjs|cjs)$/,
];

function isDiscovered(basename) {
  return DISCOVERY_PATTERNS.some((p) => p.test(basename));
}

// Walks the WHOLE repo, not a fixed set of directories — a file added in
// any new location is covered, not only the ones that happen to hold one
// today. `insideTestDir` mirrors node's rule 1: once inside a directory
// literally named `test`, every descendant is intended territory and rule
// 2's naming shape is not enforced there.
function scan() {
  const hits = [];
  const walk = (dir, insideTestDir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        walk(full, insideTestDir || e.name === "test");
        continue;
      }
      if (insideTestDir) continue;
      if (!/\.(js|mjs|cjs)$/.test(e.name)) continue;
      if (isDiscovered(e.name)) hits.push(relative(REPO, full));
    }
  };
  walk(REPO, false);
  return hits;
}

// CLASS 1 — closed, no exemptions. A file outside `test/` that node's own
// discovery would execute is a defect by construction: it either belongs
// in `test/`, or it needs a name outside every discovery pattern (the
// `suite-*` precedent this commit sets for `tools/suite-config-root.mjs`
// and `tools/suite-run-log.mjs`).
test("no non-test file matches node's --test discovery glob outside test/", () => {
  assert.deepEqual(
    scan(),
    [],
    "this file's name matches node's default --test discovery pattern and would be executed "
      + "as a zero-assertion test — rename it outside the pattern (e.g. the suite-* precedent) "
      + "or move it into test/",
  );
});
