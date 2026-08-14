// The WRITER-side guard for the temp-directory leak.
//
// DEFINITION: every temporary directory this repo creates comes from
// `tools/tmpdir.mjs`, which removes it when the process exits. A call site that
// creates one any other way is a leak by construction, because nothing else
// registers cleanup.
//
// WHY A SOURCE CHECK AND NOT ONLY A FILESYSTEM ONE. gate-live counts leftover
// run roots on disk, which is the READER half — it notices residue after a run
// has already left it. The writer is the thing that is still running: someone
// adds `mkdtemp(join(tmpdir(), "new-thing-"))` in a new test, and the leftover
// count says nothing about it, because a fresh raw prefix is not a run root and
// never will be. Fixing the reader and leaving the writer is the symptom-site
// fix docs/dev-loop.md names: the amplifier goes quiet and the generator keeps
// producing. This is the generator's guard.
//
// The 2026-08-08 state it exists to prevent returning: /tmp (31 GB tmpfs) at
// 100% with 31,108 directories, breaking unrelated tooling machine-wide while
// this suite stayed green.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCANNED = ["tools", "test", "proxy"];
// The helper is the sanctioned producer; this file is the instrument, and its
// patterns are written as regex literals containing the very tokens it hunts.
// Both were found by running it: the first run failed on its own line 104 and
// 112 — the needle matching the hand holding it. That failure is also the
// cheapest positive control this check has, since it proved both patterns match
// a real occurrence before either was pointed at the repo.
const NOT_SCANNED = new Set(["tools/tmpdir.mjs", "test/no-raw-mkdtemp.test.mjs"]);

function sourceFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === "fixtures" || e.name.startsWith(".")) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".mjs") || e.name.endsWith(".js")) out.push(full);
    }
  };
  for (const d of SCANNED) walk(join(REPO, d));
  return out;
}

// A line whose first non-space characters open a comment. Deliberately crude:
// it is only used to let PROSE mention these names, and a false negative here
// costs nothing but a finding someone has to read.
const isComment = (line) => /^\s*(\/\/|\*|\/\*)/.test(line);

function scan(pattern) {
  const hits = [];
  for (const file of sourceFiles()) {
    const rel = relative(REPO, file);
    if (NOT_SCANNED.has(rel)) continue;
    const lines = readFileSync(file, "utf-8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!isComment(lines[i]) && pattern.test(lines[i])) hits.push({ rel, line: i + 1, text: lines[i].trim() });
    }
  }
  return hits;
}

// CLASS 1 — closed, no exemptions. `mkdtemp` may not be named outside the
// helper at all: not called, not imported, not aliased. Matching the NAME
// rather than the call shape is what makes the alias route fail too — the one
// real site this guard's own build missed was
// `import { mkdtemp as mkd }` in test/harvest.test.mjs, which a call-shape
// scan for `mkdtemp(` cannot see, and which the 81-file enumeration therefore
// skipped silently.
test("no raw mkdtemp outside tools/tmpdir.mjs", () => {
  const hits = scan(/\bmkdtempSync?\b|\bmkdtemp\b/);
  assert.deepEqual(
    hits.map((h) => `${h.rel}:${h.line}: ${h.text}`),
    [],
    "temp directories come from tools/tmpdir.mjs (tmpDir / tmpDirSync), which removes them at exit",
  );
});

// CLASS 2 — declared exemptions, per file, verified by count. A bare `tmpdir()`
// is legitimate in two shapes: an assertion about a path, and a path built to be
// ABSENT. It is also how the last leaking producer was written
// (`join(tmpdir(), \`verdict-ab-${pid}\`)`, 3 leaked directories per suite run,
// invisible to a scan for `mkdtemp`), so the shape is not waved through — it is
// enumerated. The exemption is scoped to a file and a COUNT rather than to a
// path, because a path-wide exemption silently excuses classes nobody had
// thought of when it was written (docs/dev-loop.md, the absence-scan lesson).
//
// Adding a site to a listed file fails this until the count and the reason are
// updated, which is the point: the reason has to still be true.
const TMPDIR_EXEMPT = {
  // Creators that own their cleanup — each verified by the leftover count
  // after a full suite run, which is 0.
  "tools/sim-session-budget-breaker.mjs": [1, "sim event log; removed by its own process.on('exit')"],
  "test/proxy-server.test.mjs": [3, "ext dirs; removed in finally / after hooks"],
  "test/proxy-session-budget-breaker.test.mjs": [3, "event log files; removed in after hooks"],
  "test/proxy-pipeline.test.mjs": [1, "config dir; removed in the after hook"],
  // Paths built to be ABSENT or merely asserted about — these create nothing.
  "test/proxy-rate-limit-log.test.mjs": [1, "a path that must not exist"],
  "test/config-root-isolation.test.mjs": [1, "assertion only: claudeHome() is under the temp root"],
  "test/census-read-coverage.test.mjs": [2, "paths that must not exist"],
  "test/slice-preflight.test.mjs": [1, "a tree path that must not exist"],
  "test/proxy-forward-attach-fallback.test.mjs": [1, "an empty PATH entry, never created"],
  // Reads the shared temp root, creates nothing: the pid-scoped assertion that
  // a deliberately OOM-aborted replay child left NO residue there. It is the
  // check that closed this guard's own sibling defect — the two run roots every
  // full suite leaked (BACKLOG "## Done", 2026-08-14).
  "test/gate-live-rowpins.test.mjs": [1, "assertion only: this child's pid has no run root in the shared temp root"],
};

test("every hand-rolled tmpdir() site is declared, with a reason", () => {
  const byFile = {};
  for (const h of scan(/\btmpdir\s*\(\s*\)/)) (byFile[h.rel] ??= []).push(h);

  const undeclared = Object.keys(byFile).filter((f) => !TMPDIR_EXEMPT[f]);
  assert.deepEqual(
    undeclared.map((f) => `${f}: ${byFile[f].map((h) => h.line).join(",")}`),
    [],
    "a new tmpdir() site: use tools/tmpdir.mjs, or declare it in TMPDIR_EXEMPT with why it cannot leak",
  );

  const wrongCount = [];
  for (const [file, [expected, reason]] of Object.entries(TMPDIR_EXEMPT)) {
    const actual = byFile[file]?.length ?? 0;
    if (actual !== expected) wrongCount.push(`${file}: declared ${expected} (${reason}), found ${actual}`);
  }
  assert.deepEqual(wrongCount, [], "the declared count moved — re-check that the stated reason still holds");
});
