// xdg-writer-guard — tests for the WRITER-side check that ends the XDG
// stale-path class (tools/xdg-writer-guard.mjs).
//
// Two arms proven with REAL bytes rather than synthetic fixtures, per the
// backlog entry's own "two things that decide" bar:
//   RED    — the tree before `bdd964d` (bdd964d^ = acbfe336) is committed
//            history containing the accounting's bucket-(d) hits. The
//            entry's claimed SILENT reference tree ("after the bucket-(d)
//            lane lands") does not exist anywhere in committed or
//            in-flight history — verified by a one-command probe before
//            this file was written (see the shipping commit's report) —
//            so this file does not claim it; that is a correction to the
//            entry, not a gap in this check.
//   SILENT — `tools/usage-to-dashboard-ndjson.mjs:136`, read live off disk,
//            is a REAL in-tree module that imports statePath/legacyReadPath
//            from xdg-dirs.mjs and carries a genuinely-labelled
//            "legacy ~/.claude/usage.jsonl" citation on one line, while
//            still carrying OTHER real unlabelled citations a few lines
//            away. One file, both answers — the exemption is proven
//            precise, not just present.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { importsXdgHelpers, findViolations, checkFile, sweep, defaultFiles } from "../tools/xdg-writer-guard.mjs";
import { tmpDirSync } from "../tools/tmpdir.mjs";
import { writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

function gitShow(ref, path) {
  return execFileSync("git", ["show", `${ref}:${path}`], { encoding: "utf-8", cwd: REPO_ROOT });
}

// ---------------------------------------------------------------------------
// Scope by construction — no import, no matter how many citations.
// ---------------------------------------------------------------------------

test("scope: a file with no statePath/dataPath import is out of scope, however many ~/.claude citations it carries", () => {
  const readmeLike = [
    "# cache-fix",
    "",
    "State is written under ~/.claude/session-mirrors/.",
    "Logs: ~/.claude/cache-fix-debug.log",
  ].join("\n");
  const result = checkFile("README.md", readmeLike);
  assert.equal(result.inScope, false);
  assert.deepEqual(result.violations, []);
});

test("scope: a .mjs file that imports something else from xdg-dirs.mjs (not statePath/dataPath) is out of scope", () => {
  const content = [
    'import { xdgState } from "../xdg-dirs.mjs";',
    "// writes under ~/.claude/foo — not actually true of this module",
    "export function f() { return xdgState(); }",
  ].join("\n");
  assert.equal(importsXdgHelpers(content), false);
  assert.equal(checkFile("tools/fake.mjs", content).inScope, false);
});

test("scope: importing statePath from an unrelated module named xdg-dirs.mjs-like is NOT enough — path must end in xdg-dirs.mjs", () => {
  const content = 'import { statePath } from "../not-the-real-module.mjs";\n// ~/.claude/x\n';
  assert.equal(importsXdgHelpers(content), false);
});

// ---------------------------------------------------------------------------
// RED — real defect, real committed history (bdd964d^ = acbfe336).
// ---------------------------------------------------------------------------

test("RED: proxy/extensions/usage-log.mjs at bdd964d^ (acbfe336) — real, committed, pre-fix hits", () => {
  const content = gitShow("acbfe336", "proxy/extensions/usage-log.mjs");
  const result = checkFile("proxy/extensions/usage-log.mjs", content);
  assert.equal(result.inScope, true, "usage-log.mjs imports statePath — must be in scope");
  const lines = result.violations.map((v) => v.line);
  // The two real comment hits from the accounting's bucket (d); line 302 is
  // the `description:` string bdd964d itself later fixed (a different,
  // already-closed bucket) — present here because this ref predates that fix.
  assert.deepEqual(lines, [1, 47, 302], "must name exactly the known hits, in order");
  assert.match(result.violations[0].text, /~\/\.claude\/usage\.jsonl/);
});

test("RED: proxy/session-mirror-writer.mjs at bdd964d^ — a second independent real hit", () => {
  const content = gitShow("acbfe336", "proxy/session-mirror-writer.mjs");
  const result = checkFile("proxy/session-mirror-writer.mjs", content);
  assert.equal(result.inScope, true);
  assert.ok(result.violations.length >= 1, "must flag at least one real pre-fix citation");
});

// ---------------------------------------------------------------------------
// SILENT — the real labelled-legacy instance already in the tree, read live.
// ---------------------------------------------------------------------------

test("SILENT: tools/usage-to-dashboard-ndjson.mjs's real inline-labelled legacy citation is exempt, while its real unlabelled citations in the SAME file still fire", () => {
  const path = join(REPO_ROOT, "tools/usage-to-dashboard-ndjson.mjs");
  const content = readFileSync(path, "utf-8");
  const result = checkFile("tools/usage-to-dashboard-ndjson.mjs", content);
  assert.equal(result.inScope, true, "this module really does import statePath/legacyReadPath");

  const lines = content.split("\n");
  const legacyLineIdx = lines.findIndex((l) => l.includes("legacy ~/.claude/usage.jsonl"));
  assert.notEqual(legacyLineIdx, -1, "the real inline-labelled line must still exist at the expected text");
  const legacyLine = legacyLineIdx + 1;

  const flaggedLines = result.violations.map((v) => v.line);
  assert.ok(!flaggedLines.includes(legacyLine), `line ${legacyLine} (inline "legacy" label) must be exempt`);
  assert.ok(flaggedLines.length > 0, "the same file must still carry real, unlabelled violations elsewhere");
});

test("SILENT: a wrapped sentence exempts across two adjacent lines (the real gate-live.mjs:53-54 shape)", () => {
  // Real instance, read live: a sentence naming "legacy" wraps onto the
  // next `//` line before reaching its citation.
  const content = readFileSync(join(REPO_ROOT, "tools/gate-live.mjs"), "utf-8");
  const result = checkFile("tools/gate-live.mjs", content);
  const lines = content.split("\n");
  const citeLine = lines.findIndex((l) => l.includes("`~/.claude/` location and warn loudly")) + 1;
  assert.ok(citeLine > 0, "the real wrapped-sentence citation must still exist at the expected text");
  assert.ok(!result.violations.map((v) => v.line).includes(citeLine), `line ${citeLine} must be exempt (label on the line above)`);
});

test("NOT exempt: a \"legacy\" label does not reach across a paragraph boundary (blank comment line) to an unrelated citation further down", () => {
  const content = [
    'import { statePath } from "../xdg-dirs.mjs";',
    "// legacy note: this describes an old transition, now finished.",
    "//",
    "// Unrelated paragraph: this module still writes to ~/.claude/new.jsonl today.",
  ].join("\n");
  const result = checkFile("tools/fake2.mjs", content);
  assert.equal(result.violations.length, 1, "the label must not blanket the next paragraph");
  assert.equal(result.violations[0].line, 4);
});

test("NOT exempt: a \"legacy\" label many lines away (beyond LEGACY_WINDOW, same paragraph or not) does not exempt a distant citation", () => {
  const content = [
    'import { statePath } from "../xdg-dirs.mjs";',
    "// legacy note: this describes an old transition.",
    "// line 2 of filler prose in the same paragraph, no boundary.",
    "// line 3 of filler prose.",
    "// line 4 of filler prose.",
    "// This still claims to write to ~/.claude/new.jsonl today.",
  ].join("\n");
  const result = checkFile("tools/fake2b.mjs", content);
  assert.equal(result.violations.length, 1, "a label 4 lines away must not reach the citation");
  assert.equal(result.violations[0].line, 6);
});

// ---------------------------------------------------------------------------
// Negative control — a clean, in-scope file that must NOT fire.
// ---------------------------------------------------------------------------

test("negative control: an in-scope file with zero ~/.claude citations is silent", () => {
  const content = [
    'import { statePath, dataPath } from "../xdg-dirs.mjs";',
    "// writes usage records under the XDG state root.",
    "export function usagePath() { return statePath(\"usage.jsonl\"); }",
  ].join("\n");
  const result = checkFile("tools/clean.mjs", content);
  assert.equal(result.inScope, true);
  assert.deepEqual(result.violations, []);
});

// ---------------------------------------------------------------------------
// Function-name exemption (legacyReadPath-shaped, synthetic — the real
// legacyReadPath() in proxy/xdg-dirs.mjs carries no literal ~/.claude
// substring itself, so its NAME-based exemption path is proven here with a
// constructed case shaped exactly like it; the LABEL-based exemption above
// is proven on real bytes).
// ---------------------------------------------------------------------------

test("exempt by enclosing function name: a function named legacyReadFoo() is exempt even with no nearby comment label", () => {
  const content = [
    'import { statePath } from "../xdg-dirs.mjs";',
    "export function legacyReadFoo(name) {",
    "  return join(home, '~/.claude', name);",
    "}",
  ].join("\n");
  const result = checkFile("tools/fake3.mjs", content);
  assert.deepEqual(result.violations, []);
});

test("NOT exempt by enclosing function name: a plain function with the same citation fires", () => {
  const content = [
    'import { statePath } from "../xdg-dirs.mjs";',
    "export function readFoo(name) {",
    "  return join(home, '~/.claude', name);",
    "}",
  ].join("\n");
  const result = checkFile("tools/fake4.mjs", content);
  assert.equal(result.violations.length, 1);
});

// ---------------------------------------------------------------------------
// The wired consumer (BACKLOG "xdg-writer-guard main() is wired to no
// consumer") — `sweep()` is what gate-live.mjs now imports and calls every
// day, so it is proven here rather than only through the CLI's main().
// RED-FIRST: the baseline over the real tree is already non-zero (the known
// stale claims); a mutate-and-revert proof over an always-red baseline would
// prove nothing, so this states that baseline result before touching it.
// ---------------------------------------------------------------------------

test("sweep(): the real default file set is non-zero today — the baseline gate-live's sweep now reads", () => {
  const { violations, readErrors } = sweep();
  assert.deepEqual(readErrors, [], "every default file must be readable");
  assert.ok(violations.length > 0, "the real tree still carries stale ~/.claude citations (currently unfixed)");
  for (const v of violations) {
    assert.equal(typeof v.path, "string");
    assert.equal(typeof v.line, "number");
  }
});

test("sweep(): planting one fresh stale claim moves the count by exactly one", () => {
  const before = sweep(defaultFiles()).violations.length;
  const dir = tmpDirSync("xdg-writer-guard-plant-");
  const planted = join(dir, "planted.mjs");
  writeFileSync(
    planted,
    [
      'import { statePath } from "../proxy/xdg-dirs.mjs";',
      "// this freshly-planted module still writes to ~/.claude/planted.jsonl today.",
    ].join("\n"),
  );
  const after = sweep([...defaultFiles(), planted]).violations.length;
  assert.equal(after, before + 1, "the wired consumer must move by exactly the one planted violation");
});
