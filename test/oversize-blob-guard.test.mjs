// oversize-blob-guard: the push-boundary check for a blob the remote cannot
// accept. Its motivating defect is a REAL artifact, so the instrument's
// positive is the real one: the 188 MB pin that `harvest --pin` wrote during
// the 2026-08-17 row-6 walk (`pinned-s-ec63519a9167-733-734.json`, a pair
// 733 records deep). The negative control that matters just as much is this
// repo's own largest LEGITIMATE pin, 45.8 MB — a guard that reddened on that
// would be firing on tracked, correct history.

import test from "node:test";
import assert from "node:assert/strict";
import { classifyBlobs, parseLsTree, render, BLOCK_BYTES, WARN_BYTES } from "../tools/oversize-blob-guard.mjs";

const MIB = 1048576;

test("the real defect blocks: a 188 MiB pin is refused", () => {
  const rows = [{ path: "test/fixtures/harvested/pinned-s-ec63519a9167-733-734.json", bytes: 188 * MIB }];
  const { blocking, warning } = classifyBlobs(rows);
  assert.equal(blocking.length, 1);
  assert.equal(warning.length, 0, "a blocking blob is not ALSO counted as a warning");
  assert.match(render({ blocking, warning }, "abc1234").join("\n"), /REFUSED/);
});

// The pair that gives the block its discriminating power. Both arms are
// pins, both are large; only one is over the remote's limit. If the guard
// did not separate these it would be measuring "is this file big", which is
// not the question the remote asks.
test("BITE — this repo's largest LEGITIMATE tracked pin (45.8 MB) is not blocked", () => {
  const rows = [{ path: "test/fixtures/harvested/pinned-s-9f12950909ed-892-894.json", bytes: Math.round(45.8 * 1000 * 1000) }];
  const { blocking } = classifyBlobs(rows);
  assert.deepEqual(blocking, [], "a correctly tracked 45.8 MB pin must stay green — a guard that fires here trains the override reflex");
});

test("the warn tier prints and does NOT block", () => {
  const rows = [{ path: "big.json", bytes: 60 * MIB }];
  const { blocking, warning } = classifyBlobs(rows);
  assert.equal(blocking.length, 0, "60 MiB is pushable — the remote accepts it");
  assert.equal(warning.length, 1);
  const text = render({ blocking, warning }, "abc1234").join("\n");
  assert.match(text, /WARN/);
  assert.doesNotMatch(text, /REFUSED/, "a warning must not render as a refusal");
});

// The thresholds are boundaries, and an off-by-one here reads as a working
// guard in both directions: one byte under blocks nothing, exactly at the
// limit blocks. GitHub rejects AT 100 MiB, not merely above it.
test("BITE — the block boundary is inclusive at exactly 100 MiB, and one byte under only warns", () => {
  const at = classifyBlobs([{ path: "at.json", bytes: BLOCK_BYTES }]);
  const under = classifyBlobs([{ path: "under.json", bytes: BLOCK_BYTES - 1 }]);
  assert.equal(at.blocking.length, 1, "exactly 100 MiB is already rejected by the remote");
  assert.equal(under.blocking.length, 0);
  assert.equal(under.warning.length, 1, "just under the hard limit is still worth saying out loud");
});

test("a tree of ordinary files yields neither tier", () => {
  const rows = [{ path: "tools/replay.mjs", bytes: 400 * 1024 }, { path: "README.md", bytes: 9000 }];
  const v = classifyBlobs(rows);
  assert.deepEqual(v, { blocking: [], warning: [] });
  assert.deepEqual(render(v, "abc1234"), [], "a clean tree prints nothing at all");
});

test("offenders are reported largest first", () => {
  const { blocking } = classifyBlobs([
    { path: "b.json", bytes: 120 * MIB },
    { path: "a.json", bytes: 300 * MIB },
  ]);
  assert.deepEqual(blocking.map((r) => r.path), ["a.json", "b.json"]);
});

// --- parseLsTree: the guard reads the PUSHED TREE, so its input is git's ---

test("parseLsTree reads git ls-tree --long output", () => {
  const text = [
    "100644 blob 1111111111111111111111111111111111111111     9000\tREADME.md",
    "100644 blob 2222222222222222222222222222222222222222 197000000\ttest/fixtures/harvested/pin.json",
  ].join("\n");
  assert.deepEqual(parseLsTree(text), [
    { path: "README.md", bytes: 9000 },
    { path: "test/fixtures/harvested/pin.json", bytes: 197000000 },
  ]);
});

test("BITE — a path containing a SPACE keeps its whole name", () => {
  const text = "100644 blob 3333333333333333333333333333333333333333 120000000\tdocs/a file with spaces.json";
  assert.deepEqual(parseLsTree(text), [{ path: "docs/a file with spaces.json", bytes: 120000000 }]);
});

// A tree entry can be a submodule commit (no size) or a blob git does not
// have locally (size "-"). Neither is a finding, and neither may parse to
// NaN and slip through a numeric comparison as a silent pass.
test("BITE — non-blob and unsized entries are dropped, never parsed into NaN rows", () => {
  const text = [
    "160000 commit 4444444444444444444444444444444444444444       -\tvendor/sub",
    "100644 blob 5555555555555555555555555555555555555555        -\tnot/local.bin",
    "100644 blob 6666666666666666666666666666666666666666     4096\tok.txt",
  ].join("\n");
  assert.deepEqual(parseLsTree(text), [{ path: "ok.txt", bytes: 4096 }]);
});

test("the two thresholds are ordered, and the warn tier is the advisory one", () => {
  assert.ok(WARN_BYTES < BLOCK_BYTES, "a warn threshold at or above the block threshold would be unreachable");
});
