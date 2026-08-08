// slice-preflight — the preflight's own bite.
//
// The tool answers ONE question: mapped into this tree, does the test file
// still LOAD? So the definitions the assertions below come from are stated
// first, from the wave-2 incident rather than from the tool's code (a
// same-parentage expectation pins the bug it should catch):
//
//   (a) A STATIC import of a path that is not in the tree kills the file at
//       load. Red, and the specifier NAMED — "something is missing" is not a
//       port instruction.
//   (b) The same module reached by a DYNAMIC `await import(...)` inside a
//       function is NOT a finding. That is precisely the cure wave-2 shipped
//       (fork da9bf8c, "a tools-less tree skips, not dies"); a check that went
//       red on it would fire on the fix and train the override reflex.
//   (c) A `readFileSync` at MODULE scope of a file that is not in the tree is
//       the second wave-2 shape (the oscillation fixture) — red, named. The
//       same read inside a test body is not: it fails one test, it does not
//       kill the file, and the designed answer there is a skip.
//   (d) WIDENED arm: a fixture that is IN the tree while
//       `tools/absence-scan.mjs` is not means that branch pushes a fixture
//       nobody scans. Red, named — and green as soon as the scanner is in the
//       tree beside it.
//   (e) A path expression the reader cannot evaluate is named on a `degraded:`
//       line, never silently dropped and never a confident clean.
//
// Every tree here is built at test time under a scratch directory: the bite
// must not depend on any slice branch existing on this machine, and the two
// defect shapes are SEEDED rather than remembered.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { preflight } from "../tools/slice-preflight.mjs";

const TOOL = join(dirname(fileURLToPath(import.meta.url)), "..", "tools", "slice-preflight.mjs");

function withTree(files, fn) {
  const dir = tmpDirSync("slice-preflight-");
  try {
    for (const [rel, body] of Object.entries(files)) {
      const p = join(dir, rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, body);
    }
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const run = (args) => spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf-8" });
const kinds = (r) => r.findings.map((f) => f.kind);

// The head every seeded test file shares — the real idiom (`__dirname` out of
// `import.meta.url`) the wave-2 files use to name a sibling fixture.
const HEAD = `import { test } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
`;

const EXTENSION = "export function classifyPinned() { return null; }\n";
const SCANNER = "export const ALLOWLIST = [];\n";
const FIXTURE = JSON.stringify({ records: [] });

// --- (a) and (b): the static/dynamic split ------------------------------------

test("(a) a static import of a module outside the tree is red, and names the specifier", () => {
  withTree({
    "test/mapped.test.mjs": `${HEAD}import { readPinnedFixture } from "../tools/harvest.mjs";
test("x", () => { readPinnedFixture; });
`,
    "proxy/extensions/insertion-normalization.mjs": EXTENSION,
  }, (dir) => {
    const r = preflight(dir, ["test/mapped.test.mjs"]);
    assert.deepEqual(kinds(r), ["missing-import"]);
    assert.match(r.findings[0].detail, /\.\.\/tools\/harvest\.mjs/, "the specifier must be named");
    assert.match(r.findings[0].detail, /tools\/harvest\.mjs is not in the slice tree/);
    assert.equal(r.findings[0].file, "test/mapped.test.mjs");
  });
});

test("(b) the SAME module reached by a dynamic import inside a function is not a finding", () => {
  // The wave-2 cure itself. A red here would fire on the fix.
  withTree({
    "test/mapped.test.mjs": `${HEAD}test("x", async () => {
  const { readPinnedFixture } = await import("../tools/harvest.mjs");
  readPinnedFixture;
});
`,
  }, (dir) => {
    assert.deepEqual(preflight(dir, ["test/mapped.test.mjs"]).findings, []);
  });
});

test("a static import that DOES resolve inside the tree is not a finding", () => {
  withTree({
    "test/mapped.test.mjs": `${HEAD}import { classifyPinned } from "../proxy/extensions/insertion-normalization.mjs";
test("x", () => { classifyPinned; });
`,
    "proxy/extensions/insertion-normalization.mjs": EXTENSION,
  }, (dir) => {
    assert.deepEqual(preflight(dir, ["test/mapped.test.mjs"]).findings, []);
  });
});

// --- (c): the module-scope read ----------------------------------------------

const READS_FIXTURE = `${HEAD}const FIXTURE_PATH = join(__dirname, "fixtures", "harvested", "oscillation-s-0123456789ab-863.json");
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));
test("x", () => { fixture; });
`;

test("(c) a module-scope readFileSync of a fixture outside the tree is red, and names the fixture", () => {
  withTree({ "test/merge.test.mjs": READS_FIXTURE }, (dir) => {
    const r = preflight(dir, ["test/merge.test.mjs"]);
    assert.deepEqual(kinds(r), ["missing-read"]);
    assert.match(r.findings[0].detail, /test\/fixtures\/harvested\/oscillation-s-0123456789ab-863\.json/);
    assert.match(r.findings[0].detail, /not in the slice tree/);
  });
});

test("(c) the same read inside a test body is not a finding — it skips, it does not die", () => {
  withTree({
    "test/merge.test.mjs": `${HEAD}test("x", () => {
  const p = join(__dirname, "fixtures", "harvested", "oscillation-s-0123456789ab-863.json");
  JSON.parse(readFileSync(p, "utf-8"));
});
`,
  }, (dir) => {
    assert.deepEqual(preflight(dir, ["test/merge.test.mjs"]).findings, []);
  });
});

test("an arrow function with an EXPRESSION body is a function body too, not module scope", () => {
  // No brace opens, so a depth counter that only watches `{` would call this
  // load-time and flag a lazy read.
  withTree({
    "test/lazy.test.mjs": `${HEAD}const load = (name) => JSON.parse(readFileSync(join(__dirname, "fixtures", "harvested", "missing.json"), "utf-8"));
test("x", () => { load; });
`,
  }, (dir) => {
    assert.deepEqual(preflight(dir, ["test/lazy.test.mjs"]).findings, []);
  });
});

// --- (d): the widened fixture-coverage arm ------------------------------------

test("(d) a fixture that IS in the tree without tools/absence-scan.mjs is red, and names both", () => {
  const files = {
    "test/merge.test.mjs": READS_FIXTURE,
    "test/fixtures/harvested/oscillation-s-0123456789ab-863.json": FIXTURE,
  };
  withTree(files, (dir) => {
    const r = preflight(dir, ["test/merge.test.mjs"]);
    assert.deepEqual(kinds(r), ["uncovered-fixture"]);
    assert.match(r.findings[0].detail, /oscillation-s-0123456789ab-863\.json/);
    assert.match(r.findings[0].detail, /tools\/absence-scan\.mjs is not/);
  });
  withTree({ ...files, "tools/absence-scan.mjs": SCANNER }, (dir) => {
    assert.deepEqual(preflight(dir, ["test/merge.test.mjs"]).findings, [],
      "the scanner in the tree beside the fixture is the whole point of the arm");
  });
});

// --- the complete tree, and the mapping's own gap -----------------------------

test("a complete tree — every import, read and fixture present — is clean", () => {
  withTree({
    "test/mapped.test.mjs": `${HEAD}import { classifyPinned } from "../proxy/extensions/insertion-normalization.mjs";
import { readPinnedFixture } from "../tools/harvest.mjs";
const FIXTURE_PATH = join(__dirname, "fixtures", "harvested", "pinned-s-0123456789ab-26-28.json");
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));
test("x", () => { classifyPinned; readPinnedFixture; fixture; });
`,
    "proxy/extensions/insertion-normalization.mjs": EXTENSION,
    "tools/harvest.mjs": "export const readPinnedFixture = () => null;\n",
    "tools/absence-scan.mjs": SCANNER,
    "test/fixtures/harvested/pinned-s-0123456789ab-26-28.json": FIXTURE,
  }, (dir) => {
    assert.deepEqual(preflight(dir, ["test/mapped.test.mjs"]).findings, []);
  });
});

test("a test file the mapping named but did not port is itself a finding", () => {
  withTree({ "tools/absence-scan.mjs": SCANNER }, (dir) => {
    const r = preflight(dir, ["test/never-ported.test.mjs"]);
    assert.deepEqual(kinds(r), ["missing-test"]);
  });
});

// --- (e): the third answer -----------------------------------------------------

test("(e) an unevaluable module-scope read is reported degraded, never silently passed", () => {
  withTree({
    "test/odd.test.mjs": `${HEAD}const fixture = JSON.parse(readFileSync(process.env.SOME_OVERRIDE, "utf-8"));
test("x", () => { fixture; });
`,
  }, (dir) => {
    const r = preflight(dir, ["test/odd.test.mjs"]);
    assert.deepEqual(r.findings, [], "an unknown is not a defect");
    assert.equal(r.degraded.length, 1, "...but the run must say it could not check it");
    assert.match(r.degraded[0], /could not be evaluated statically/);
  });
});

test("the idioms this repo's tests actually use all resolve: ?? fallback, new URL, concatenation", () => {
  withTree({
    "test/idioms.test.mjs": `${HEAD}const A = process.env.CACHE_FIX_TEST_FIXTURE_OVERRIDE ?? join(__dirname, "fixtures", "a.json");
const B = new URL("./fixtures/b.json", import.meta.url);
const C = join(__dirname, "fixtures") + "/c.json";
const a = readFileSync(A, "utf-8");
const b = readFileSync(B, "utf-8");
const c = readFileSync(C, "utf-8");
test("x", () => { a; b; c; });
`,
    "test/fixtures/a.json": FIXTURE,
    "test/fixtures/b.json": FIXTURE,
    "test/fixtures/c.json": FIXTURE,
    "tools/absence-scan.mjs": SCANNER,
  }, (dir) => {
    const r = preflight(dir, ["test/idioms.test.mjs"]);
    assert.deepEqual(r.findings, [], "an idiom that does not evaluate would hide a missing file");
    assert.deepEqual(r.degraded, []);
  });
});

// --- CLI contract --------------------------------------------------------------

test("CLI: exit 1 with the findings printed, exit 0 on a clean tree", () => {
  withTree({ "test/merge.test.mjs": READS_FIXTURE }, (dir) => {
    const red = run([dir, "test/merge.test.mjs"]);
    assert.equal(red.status, 1, red.stdout + red.stderr);
    assert.match(red.stdout, /^FINDING missing-read {2}test\/merge\.test\.mjs/m);
    assert.match(red.stdout, /would fail at LOAD/);
  });
  withTree({
    "test/plain.test.mjs": `${HEAD}test("x", () => {});\n`,
  }, (dir) => {
    const green = run([dir, "test/plain.test.mjs"]);
    assert.equal(green.status, 0, green.stdout + green.stderr);
    assert.match(green.stdout, /slice-preflight: clean/);
  });
});

test("CLI: missing arguments and a non-directory root are internal errors, not silent passes", () => {
  assert.equal(run([]).status, 2);
  assert.equal(run(["."]).status, 2);
  assert.equal(run([join(tmpdir(), "slice-preflight-no-such-tree"), "test/x.test.mjs"]).status, 2);
});
