// tools/md-splice.mjs — anchored find/replace edits, and their red-first
// proof.
//
// Motivating incident (2026-08-08, `claude-worktime`): a hand-rolled python
// splice targeted `## Open`; the target repo actually used `## Ready`.
// Only the FIRST replacement was asserted, so the second dropped silently —
// the only tell was an insertion count that still looked plausible
// (BACKLOG.md, "the anchored markdown splices" entry, ref 8d52837).
//
// Three bites below, each independently reddened from a green baseline:
//   1. an absent find throws, NAMING the operation (not a generic error)
//   2. a find matching twice where count:1 was stated throws
//   3. ALL-OR-NOTHING: a two-op call whose second op fails leaves the file
//      byte-identical (hashed before/after).
//
// Bite 3 is the one nobody would see fail by accident — a NON-EVENT
// (nothing changed) is exactly what a dead all-or-nothing mechanism also
// produces. It was proven red-first by literally disabling the mechanism —
// writing the file after each successful operation instead of once at the
// end — confirming this bite goes red under that arrangement, then
// restoring the real (write-once) implementation; that arrangement and its
// output are reported alongside this suite, not re-encoded here, since it
// requires mutating the module under test.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { spliceMarkdown } from "../tools/md-splice.mjs";

function withTempFile(content, fn) {
  const dir = tmpDirSync("md-splice-");
  const path = join(dir, "f.md");
  writeFileSync(path, content);
  return fn(path);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

test("an absent find throws, naming the operation and both counts", () => {
  withTempFile("## Ready\n\nsome text\n", (path) => {
    assert.throws(
      () => spliceMarkdown(path, [{ find: "## Open", replace: "## Open (2)", count: 1 }]),
      (err) => {
        assert.match(err.message, /operation 1/);
        assert.match(err.message, /## Open/);
        assert.match(err.message, /expected 1/);
        assert.match(err.message, /found 0/);
        return true;
      },
    );
    // unmodified — the write never happens once validation fails
    assert.equal(readFileSync(path, "utf8"), "## Ready\n\nsome text\n");
  });
});

test("a find matching twice where count:1 was stated throws, naming both counts", () => {
  withTempFile("## Ready\n\ntext\n\n## Ready\n\nmore\n", (path) => {
    assert.throws(
      () => spliceMarkdown(path, [{ find: "## Ready", replace: "## Done", count: 1 }]),
      (err) => {
        assert.match(err.message, /operation 1/);
        assert.match(err.message, /expected 1/);
        assert.match(err.message, /found 2/);
        return true;
      },
    );
  });
});

test("all-or-nothing: a two-op call whose second op fails leaves the file byte-identical", () => {
  withTempFile("## Ready\n\ntext\n\n## Blocked\n\nmore\n", (path) => {
    const beforeHash = sha256(path);
    const beforeContent = readFileSync(path, "utf8");

    assert.throws(() =>
      spliceMarkdown(path, [
        { find: "## Ready", replace: "## Done", count: 1 }, // matches, would apply
        { find: "## Open", replace: "## Closed", count: 1 }, // absent — this is what fails
      ]),
    );

    assert.equal(sha256(path), beforeHash, "file must be byte-identical after a failed second operation");
    assert.equal(readFileSync(path, "utf8"), beforeContent);
  });
});

test("happy path: multiple operations apply in order, file written once", () => {
  withTempFile("## Ready\n\ntext\n\n## Blocked\n\nmore\n", (path) => {
    spliceMarkdown(path, [
      { find: "## Ready", replace: "## Done", count: 1 },
      { find: "## Blocked", replace: "## Closed", count: 1 },
    ]);
    assert.equal(readFileSync(path, "utf8"), "## Done\n\ntext\n\n## Closed\n\nmore\n");
  });
});

test("count > 1 requires and replaces every occurrence", () => {
  withTempFile("x TODO x TODO x TODO x\n", (path) => {
    spliceMarkdown(path, [{ find: "TODO", replace: "DONE", count: 3 }]);
    assert.equal(readFileSync(path, "utf8"), "x DONE x DONE x DONE x\n");
  });
});

test("rejects a non-array or empty operations list", () => {
  withTempFile("x\n", (path) => {
    assert.throws(() => spliceMarkdown(path, []));
    assert.throws(() => spliceMarkdown(path, undefined));
  });
});
