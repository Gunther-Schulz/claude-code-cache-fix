// tools/backlog-neighbours.mjs — a closing commit lists the open entries it
// may have invalidated.
//
// Section 1 pins the RULE (findCandidates / buildReport) against synthetic
// entries, so bites do not need git or a fixture file on disk — the pure
// core is dependency-injected (`buildReport` takes already-resolved
// { ok, ... } shapes for touched files and open entries), same idiom as
// `backlog-lint.mjs`'s injectable resolvers.
//
// Section 2 is the real-corpus, red-first proof, in the sibling suites'
// idiom: immutable commit refs, read at test time, never a live tree.
//
// KNOWN GAP, surfaced rather than silently worked around (see the closing
// report for the full investigation): the settled design's own verifier
// text (BACKLOG.md, the "closing an entry can invalidate a DIFFERENT open
// entry" entry) names `508a006` as the commit that must surface the
// verdict-count entry (`cache-fix/CLAUDE.local.md:91` lists FOUR verdicts,
// line ~4396) as a candidate. Measured against real history: `508a006`
// touches only `BACKLOG.md`; the code commits that actually shipped
// KEY-FLIP (`13278fa`, `d794f01`) touch `tools/bust-triage.mjs`,
// `test/bust-triage-key-flip.test.mjs`, `docs/runbooks/bust-appears.md`;
// and the commit that actually graded the state-key entry RETIRED
// (`d57232d`) also touches only `BACKLOG.md`. The verdict-count entry's ONLY
// backtick file-shaped token is `cache-fix/CLAUDE.local.md:91` — a
// dotfiles-repo-relative path to a file this repo's `.git/info/exclude`
// keeps untracked, so no commit in this repo's history can ever touch it.
// The join this tool implements is exactly the settled design (file-token
// overlap between a commit's diff-tree and an entry's backtick citations);
// it is the BRIEF's named example pairing that does not reproduce, not a
// defect in the join. Sections 3-4 below pin what real history actually
// gives instead: `508a006` and `13278fa` each produce a real, reproducible,
// non-empty candidate set (the true-positive proof for the MECHANISM), and
// an explicit test records that the verdict-count entry is — and structurally
// must remain — absent from `508a006`'s output.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  findCandidates,
  buildReport,
  resolveOpenEntries,
  OPEN_GRADES,
} from "../tools/backlog-neighbours.mjs";
// Namespace import for the identifier-join additions (docs/dev-loop.md's
// ESM link-collapse rule): a static named import of a not-yet-existing
// export fails the WHOLE file at link time, before a single bite runs, so
// the discriminating red/green split between old and new bites is lost.
import * as neighbours from "../tools/backlog-neighbours.mjs";
import { tmpDirSync } from "../tools/tmpdir.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools/backlog-neighbours.mjs");

function runTool(args) {
  try {
    const out = execFileSync(process.execPath, [TOOL, ...args], {
      cwd: REPO,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? -1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

// ==========================================================================
// Section 1: findCandidates — the pure join, one condition at a time
// ==========================================================================

const entry = (over) => ({
  line: 1,
  grade: "READY",
  files: ["tools/foo.mjs"],
  headline: "READY — a thing.",
  ...over,
});

test("findCandidates: an open-graded entry naming a touched file is a candidate", () => {
  const out = findCandidates(["tools/foo.mjs"], [entry()]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], { line: 1, headline: "READY — a thing.", files: ["tools/foo.mjs"] });
});

test("findCandidates: condition disabled -- grade is not open (DONE) -- excluded", () => {
  const out = findCandidates(["tools/foo.mjs"], [entry({ grade: "DONE" })]);
  assert.deepEqual(out, [], "a closed grade must never surface, however the files line up");
});

test("findCandidates: condition disabled -- no file overlap -- excluded", () => {
  const out = findCandidates(["tools/other.mjs"], [entry()]);
  assert.deepEqual(out, [], "an open entry naming a file the commit did not touch is not a candidate");
});

test("findCandidates: OPEN_GRADES is exactly READY/PARKED/OPEN -- HOT and OPEN/HOT excluded", () => {
  assert.deepEqual([...OPEN_GRADES].sort(), ["OPEN", "PARKED", "READY"]);
  for (const grade of ["HOT", "OPEN/HOT", "RETIRED", "UNCLASSIFIED"]) {
    const out = findCandidates(["tools/foo.mjs"], [entry({ grade })]);
    assert.deepEqual(out, [], `grade ${grade} is not one of the three open grades`);
  }
  for (const grade of ["READY", "PARKED", "OPEN"]) {
    const out = findCandidates(["tools/foo.mjs"], [entry({ grade })]);
    assert.equal(out.length, 1, `grade ${grade} must surface`);
  }
});

test("findCandidates: multiple shared files are all reported for one entry", () => {
  const e = entry({ files: ["tools/foo.mjs", "docs/bar.md", "tools/unrelated.mjs"] });
  const out = findCandidates(["tools/foo.mjs", "docs/bar.md"], [e]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].files, ["tools/foo.mjs", "docs/bar.md"]);
});

// ==========================================================================
// Section 2: buildReport -- THREE answers, not two
// ==========================================================================

test("buildReport: commit-resolve failure -- COULD-NOT-VERIFY, exit 2", () => {
  const r = buildReport("bad-ref", { ok: false, proof: "fatal: bad revision 'bad-ref'" }, { ok: true, entries: [] });
  assert.equal(r.code, 2);
  assert.match(r.lines[0], /^COULD-NOT-VERIFY commit-resolve commit=bad-ref -- fatal: bad revision/);
});

test("buildReport: open-section-parse failure -- COULD-NOT-VERIFY, exit 2", () => {
  const r = buildReport("HEAD", { ok: true, files: ["a.md"] }, { ok: false, proof: "no '## Open' section in x" });
  assert.equal(r.code, 2);
  assert.match(r.lines[0], /^COULD-NOT-VERIFY open-section-parse -- no '## Open' section/);
});

test("buildReport: commit touches no tracked file -- '0 candidates' with reason, exit 0", () => {
  const r = buildReport("HEAD", { ok: true, files: [] }, { ok: true, entries: [entry()] });
  assert.equal(r.code, 0);
  assert.match(r.lines[0], /^0 candidates -- commit HEAD touched no tracked file$/);
});

test("buildReport: touched files exist but nothing overlaps -- '0 candidates' with the OTHER reason, exit 0", () => {
  const r = buildReport("HEAD", { ok: true, files: ["docs/unrelated.md"] }, { ok: true, entries: [entry()] });
  assert.equal(r.code, 0);
  assert.match(r.lines[0], /^0 candidates -- no open entry \(READY\/PARKED\/OPEN\) names a file/);
});

test("buildReport: candidates present -- CANDIDATE lines plus the count line, exit 0", () => {
  const r = buildReport("HEAD", { ok: true, files: ["tools/foo.mjs"] }, { ok: true, entries: [entry()] });
  assert.equal(r.code, 0);
  assert.equal(r.lines.length, 2);
  assert.match(
    r.lines[0],
    /^CANDIDATE line=1 via=file shared=tools\/foo\.mjs disposition=<still-valid\|premise-corrected\|now-unnecessary> "READY — a thing\."$/,
  );
  assert.equal(r.lines[1], "1 candidate(s) for commit HEAD");
});

// The empty-result and non-empty-result cases must never look alike (per the
// brief's "an empty result and a broken run must not look alike").
test("buildReport: both zero-candidate reasons are non-empty, distinguishable strings", () => {
  const noFiles = buildReport("H", { ok: true, files: [] }, { ok: true, entries: [] });
  const noOverlap = buildReport("H", { ok: true, files: ["x"] }, { ok: true, entries: [] });
  assert.notEqual(noFiles.lines[0], noOverlap.lines[0]);
  assert.ok(noFiles.lines[0].length > 0 && noOverlap.lines[0].length > 0);
});

// ==========================================================================
// Section 3: resolveOpenEntries -- absence vs emptiness
// ==========================================================================

test("resolveOpenEntries: no '## Open' section at all -- ok:false (COULD-NOT-VERIFY territory)", () => {
  const dir = tmpDirSync("neighbours-");
  const file = join(dir, "BACKLOG.md");
  writeFileSync(file, "# Not a backlog\nJust prose.\n");
  const r = resolveOpenEntries(file);
  assert.equal(r.ok, false);
  assert.match(r.proof, /no '## Open' section/);
});

test("resolveOpenEntries: an EMPTY '## Open' section -- ok:true, entries: [] (not an absence)", () => {
  const dir = tmpDirSync("neighbours-");
  const file = join(dir, "BACKLOG.md");
  writeFileSync(file, "## Open\n\n## Later\n- **READY — outside the section.** Body.\n");
  const r = resolveOpenEntries(file);
  assert.equal(r.ok, true);
  assert.deepEqual(r.entries, []);
});

test("resolveOpenEntries: file does not exist -- ok:false", () => {
  const r = resolveOpenEntries(join(REPO, "does-not-exist-BACKLOG.md"));
  assert.equal(r.ok, false);
  assert.match(r.proof, /cannot read/);
});

// ==========================================================================
// Section 4: real-corpus CLI bites -- immutable refs, reproduce forever
// ==========================================================================

// True positive from real history, red-first. `508a006` is the commit the
// settled design names; it touches only BACKLOG.md, and eight still-open
// entries cite `BACKLOG.md` in backticks -- a real, reproducible,
// non-empty candidate set. (Not the verdict-count entry -- see Section 5.)
test("CLI: 508a006 over a FROZEN BACKLOG.md -- real, reproducible candidate set", () => {
  const { code, out } = runTool(["508a006", frozenBacklog()]);
  assert.equal(code, 0);
  const lines = out.trim().split("\n").filter((l) => l.startsWith("CANDIDATE"));
  assert.equal(lines.length, 8, `expected the eight entries citing \`BACKLOG.md\`:\n${lines.join("\n")}`);
  assert.ok(lines.every((l) => /shared=BACKLOG\.md\b/.test(l)), "every candidate shares BACKLOG.md");
  assert.match(out, /^8 candidate\(s\) for commit 508a006$/m);
});

// Over-firing control: an entry whose only overlap is a file 508a006 did NOT
// touch must not appear. Line 265 ("bust-triage emits an ATTRIBUTION
// verdict") cites `tools/bust-triage.mjs`, not `BACKLOG.md` -- confirmed
// absent here, confirmed PRESENT below for 13278fa (which does touch that
// file), so this is a real exclusion, not an entry that never matches
// anything.
test("CLI: 508a006 -- an entry citing a file it did not touch is excluded (over-firing control)", () => {
  const { out } = runTool(["508a006", frozenBacklog()]);
  // Asserted by HEADLINE, not by line number: the attribution entry cites
  // tools/bust-triage.mjs, which 508a006 does not touch, and it is confirmed
  // PRESENT for 13278fa below -- so this is a real exclusion, not an entry
  // that never matches anything.
  assert.doesNotMatch(out, /ATTRIBUTION verdict/, "excluded: cites tools/bust-triage.mjs, not BACKLOG.md");
});

// ANCHORED TO A FROZEN BACKLOG, and it was not: this bite first asserted an
// exact line set against the WORKING TREE's BACKLOG.md, and went red within
// the hour when the dispatcher edited that file in the same series -- one
// candidate appeared and every line number shifted. A red-first arrangement
// anchored to live mutable state decays into a false red exactly as
// docs/dev-loop.md records. The reference is now the file at a fixed commit,
// so the numbers are facts about that blob and reproduce forever.
const FROZEN = "e5d635a";
// One frozen reference for every real-corpus bite. A line number is a fact
// about a file VERSION; the working tree is the one thing guaranteed to move,
// and these bites went red within the hour when it did.
function frozenBacklog() {
  const path = join(tmpDirSync("neighbours-frozen-"), "BACKLOG.md");
  writeFileSync(path, execFileSync("git", ["show", `${FROZEN}:BACKLOG.md`], { encoding: "utf8" }));
  return path;
}
test("CLI: 13278fa (a real KEY-FLIP-shipping commit) -- a real candidate set over a FROZEN backlog", () => {
  const { code, out } = runTool(["13278fa", frozenBacklog()]);
  assert.equal(code, 0);
  const lines = out.trim().split("\n").filter((l) => l.startsWith("CANDIDATE"));
  // The entry that matters is the one citing tools/bust-triage.mjs -- asserted
  // by its HEADLINE, because a line number is a fact about a file VERSION while
  // a headline is a fact about the entry.
  assert.ok(lines.some((l) => /ATTRIBUTION verdict/.test(l)),
    `expected the attribution entry among:\n${lines.join("\n")}`);
  assert.ok(lines.length >= 4, `expected >= 4 candidates, got ${lines.length}`);
});

// Third-answer control: an unresolvable commit-ish.
test("CLI: a non-existent commit-ish -- COULD-NOT-VERIFY, exit 2", () => {
  const { code, out } = runTool(["not-a-real-commit-ish-xyz"]);
  assert.equal(code, 2);
  assert.match(out, /^COULD-NOT-VERIFY commit-resolve commit=not-a-real-commit-ish-xyz -- /m);
});

// Third-answer control, the other half: a BACKLOG.md with no '## Open'
// section, passed via the CLI's optional second argument.
test("CLI: a BACKLOG.md with no '## Open' section -- COULD-NOT-VERIFY, exit 2", () => {
  const dir = tmpDirSync("neighbours-");
  const file = join(dir, "BACKLOG.md");
  writeFileSync(file, "# no open section\n");
  const { code, out } = runTool(["508a006", file]);
  assert.equal(code, 2);
  assert.match(out, /^COULD-NOT-VERIFY open-section-parse -- no '## Open' section/m);
});

// Default commit-ish is HEAD.
test("CLI: no argument defaults to HEAD and does not crash", () => {
  const { code } = runTool([]);
  assert.equal(code, 0);
});

// ==========================================================================
// Section 5: the recorded gap -- the settled design's named pairing does not
// reproduce against real history (see the file header and the closing
// report for the full investigation).
// ==========================================================================

test("CLI: 508a006 does NOT surface the verdict-count entry (line ~4396) -- documents the finding", () => {
  const { out } = runTool(["508a006"]);
  assert.doesNotMatch(
    out,
    /CLAUDE\.local\.md/,
    "the verdict-count entry's only file-shaped token, `cache-fix/CLAUDE.local.md:91`, is a " +
      "dotfiles-repo path this repo's git can never report as touched -- structurally " +
      "unreachable by this join, not a bug in it",
  );
});

// ==========================================================================
// Section 6: CAMEL_CASE_IDENTIFIER / extractIdentifiers -- the identifier
// join's own token filter, one condition at a time.
// ==========================================================================

test("CAMEL_CASE_IDENTIFIER: accepts conversationOf and sameLineage", () => {
  assert.ok(neighbours.CAMEL_CASE_IDENTIFIER.test("conversationOf"));
  assert.ok(neighbours.CAMEL_CASE_IDENTIFIER.test("sameLineage"));
});

test("CAMEL_CASE_IDENTIFIER: rejects a file path, a path:line citation, an ALL-CAPS token, and plain lowercase", () => {
  for (const tok of ["tools/replay.mjs", "foo.mjs:12", "BACKLOG.md", "UPPER", "lowercase"]) {
    assert.equal(neighbours.CAMEL_CASE_IDENTIFIER.test(tok), false, `${tok} must not match`);
  }
});

test("extractIdentifiers: pulls camelCase tokens from backtick spans, ignoring file paths and path:line citations", () => {
  const body =
    "Cites `conversationOf`, `tools/replay.mjs`, and `foo.mjs:12`, plus `sameLineage()` with a trailing call.";
  assert.deepEqual(neighbours.extractIdentifiers(body), ["conversationOf", "sameLineage"]);
});

test("extractIdentifiers: dedupes, first-appearance order", () => {
  const body = "`conversationOf` appears twice: `conversationOf` again, then `sameLineage`.";
  assert.deepEqual(neighbours.extractIdentifiers(body), ["conversationOf", "sameLineage"]);
});

test("extractIdentifiers: a body with no qualifying token returns an empty array", () => {
  assert.deepEqual(neighbours.extractIdentifiers("Only `BACKLOG.md` and `tools/foo.mjs` here."), []);
});

// ==========================================================================
// Section 7: parseChangedLines / changedEntriesOf -- pure, no git
// ==========================================================================

test("parseChangedLines: a hunk with an explicit count expands to every post-image line in range", () => {
  const diff = "@@ -5,2 +10,3 @@\n+a\n+b\n+c\n";
  assert.deepEqual([...neighbours.parseChangedLines(diff)].sort((a, b) => a - b), [10, 11, 12]);
});

test("parseChangedLines: a hunk with an implicit count (single line) is exactly one line", () => {
  const diff = "@@ -5 +10 @@\n+a\n";
  assert.deepEqual([...neighbours.parseChangedLines(diff)], [10]);
});

test("parseChangedLines: a pure deletion (post-image count 0) contributes no line", () => {
  const diff = "@@ -5,3 +10,0 @@\n-a\n-b\n-c\n";
  assert.deepEqual([...neighbours.parseChangedLines(diff)], []);
});

const bodyEntry = (line, bodyLines, over) => ({
  line,
  grade: "READY",
  headline: `entry at ${line}`,
  files: [],
  body: bodyLines.join("\n"),
  ...over,
});

test("changedEntriesOf: a changed line inside an entry's own span selects it", () => {
  const entries = [bodyEntry(10, ["- **READY**", "body line 2", "body line 3"])]; // spans 10-12
  const out = neighbours.changedEntriesOf(new Set([11]), entries);
  assert.equal(out.length, 1);
});

test("changedEntriesOf: a changed line at the entry's LAST line still selects it (off-by-one control)", () => {
  const entries = [bodyEntry(10, ["- **READY**", "body line 2", "body line 3"])]; // spans 10-12
  const out = neighbours.changedEntriesOf(new Set([12]), entries);
  assert.equal(out.length, 1);
});

test("changedEntriesOf: a changed line outside every entry's span selects nothing", () => {
  const entries = [bodyEntry(10, ["- **READY**", "body line 2", "body line 3"])]; // spans 10-12
  const out = neighbours.changedEntriesOf(new Set([20]), entries);
  assert.deepEqual(out, []);
});

// ==========================================================================
// Section 8: resolveOpenEntriesWithBodies -- censusEntries's rows, plus body
// ==========================================================================

test("resolveOpenEntriesWithBodies: no '## Open' section at all -- ok:false", () => {
  const r = neighbours.resolveOpenEntriesWithBodies("# not a backlog\nJust prose.\n");
  assert.equal(r.ok, false);
  assert.match(r.proof, /no '## Open' section/);
});

test("resolveOpenEntriesWithBodies: an entry's row carries both censusEntries metadata and its own body text", () => {
  const text = "## Open\n- **READY — a thing.** Cites `conversationOf` here.\n\n## Later\nprose\n";
  const r = neighbours.resolveOpenEntriesWithBodies(text);
  assert.equal(r.ok, true);
  assert.equal(r.entries.length, 1);
  assert.equal(r.entries[0].grade, "READY");
  assert.equal(r.entries[0].line, 2);
  assert.match(r.entries[0].body, /conversationOf/);
});

test("resolveOpenEntriesWithBodiesFromPath: file does not exist -- ok:false", () => {
  const r = neighbours.resolveOpenEntriesWithBodiesFromPath(join(REPO, "does-not-exist-BACKLOG.md"));
  assert.equal(r.ok, false);
  assert.match(r.proof, /cannot read/);
});

// ==========================================================================
// Section 9: buildIdentifierReport -- the THREE-answer discipline, one
// injected failure at a time (same idiom as buildReport in Section 2).
// ==========================================================================

test("buildIdentifierReport: commit did not resolve -- shares the file join's fate, empty lines, exit 2", () => {
  const r = neighbours.buildIdentifierReport(
    "bad-ref",
    { ok: false, proof: "fatal: bad revision 'bad-ref'" },
    null,
    null,
  );
  assert.equal(r.code, 2);
  assert.deepEqual(r.lines, [], "the file join already reported this failure; nothing to add here");
});

test("buildIdentifierReport: commit resolves but did not touch BACKLOG.md -- '0 identifier candidates' with reason, exit 0", () => {
  const r = neighbours.buildIdentifierReport("c1", { ok: true, files: ["tools/x.mjs"] }, null, null);
  assert.equal(r.code, 0);
  assert.match(r.lines[0], /^0 identifier candidates -- commit c1 did not change BACKLOG\.md$/);
});

test("buildIdentifierReport: image resolution failed (e.g. root commit) -- COULD-NOT-VERIFY identifier-join-images, exit 2", () => {
  const r = neighbours.buildIdentifierReport(
    "c1",
    { ok: true, files: ["BACKLOG.md"] },
    { ok: false, proof: "fatal: bad object HEAD^" },
    { ok: true, entries: [] },
  );
  assert.equal(r.code, 2);
  assert.match(r.lines[0], /^COULD-NOT-VERIFY identifier-join-images -- fatal: bad object HEAD\^$/);
});

test("buildIdentifierReport: the AFTER image has no '## Open' section -- COULD-NOT-VERIFY identifier-join-images, exit 2", () => {
  const r = neighbours.buildIdentifierReport(
    "c1",
    { ok: true, files: ["BACKLOG.md"] },
    { ok: true, after: "# not a backlog\n", diff: "@@ -1 +1 @@\n" },
    { ok: true, entries: [] },
  );
  assert.equal(r.code, 2);
  assert.match(r.lines[0], /^COULD-NOT-VERIFY identifier-join-images -- no '## Open' section$/);
});

test("buildIdentifierReport: pool resolution failed -- COULD-NOT-VERIFY identifier-join-pool, exit 2", () => {
  const after = "## Open\n- **READY — x.** Cites `conversationOf`.\n";
  const r = neighbours.buildIdentifierReport(
    "c1",
    { ok: true, files: ["BACKLOG.md"] },
    { ok: true, after, diff: "@@ -1 +2 @@\n+x\n" },
    { ok: false, proof: "cannot read x: ENOENT" },
  );
  assert.equal(r.code, 2);
  assert.match(r.lines[0], /^COULD-NOT-VERIFY identifier-join-pool -- cannot read x: ENOENT$/);
});

test("buildIdentifierReport: diff touches BACKLOG.md but no changed line falls inside an Open entry's body -- '0 identifier candidates', exit 0", () => {
  const after = "## Open\n- **READY — x.** Cites `conversationOf`.\n\n## Later\nprose\n";
  const diff = "@@ -1 +10 @@\n+something\n"; // line 10 is well past the Open section
  const r = neighbours.buildIdentifierReport(
    "c1",
    { ok: true, files: ["BACKLOG.md"] },
    { ok: true, after, diff },
    { ok: true, entries: [] },
  );
  assert.equal(r.code, 0);
  assert.match(
    r.lines[0],
    /^0 identifier candidates -- commit c1 changed BACKLOG\.md but no '## Open' entry body$/,
  );
});

test("buildIdentifierReport: the changed entry cites no camelCase identifier -- '0 identifier candidates', exit 0", () => {
  const after = "## Open\n- **READY — x.** No identifiers here, just `BACKLOG.md`.\n";
  const diff = "@@ -1 +2 @@\n+x\n";
  const r = neighbours.buildIdentifierReport(
    "c1",
    { ok: true, files: ["BACKLOG.md"] },
    { ok: true, after, diff },
    { ok: true, entries: [] },
  );
  assert.equal(r.code, 0);
  assert.match(
    r.lines[0],
    /^0 identifier candidates -- changed entries in commit c1 cite no camelCase identifier$/,
  );
});

test("buildIdentifierReport: candidates present -- excludes the changed entry itself (by headline), grade-filters the rest, CANDIDATE + count line, exit 0", () => {
  const after = "## Open\n- **READY — a title.** Cites `conversationOf` and `capturePairResult`.\n";
  const diff = "@@ -1 +2 @@\n+x\n";
  const afterEntries = neighbours.resolveOpenEntriesWithBodies(after);
  const changedHeadline = afterEntries.entries[0].headline;
  const pool = {
    ok: true,
    entries: [
      // Same entry, reached via a DIFFERENT file (the pool argument) -- must
      // be excluded from its own candidate list by headline.
      {
        line: 50,
        grade: "READY",
        headline: changedHeadline,
        files: [],
        body: "Cites `conversationOf` and `capturePairResult`.",
      },
      { line: 99, grade: "READY", headline: "the pin entry", files: [], body: "Cites `conversationOf` too." },
      { line: 5, grade: "DONE", headline: "closed entry", files: [], body: "Also cites `conversationOf`." },
      {
        line: 7,
        grade: "READY",
        headline: "unrelated entry",
        files: [],
        body: "Cites `somethingElseEntirely`.",
      },
    ],
  };
  const r = neighbours.buildIdentifierReport(
    "c1",
    { ok: true, files: ["BACKLOG.md"] },
    { ok: true, after, diff },
    pool,
  );
  assert.equal(r.code, 0);
  assert.equal(r.lines.length, 2, `expected exactly one candidate plus the count line:\n${r.lines.join("\n")}`);
  assert.match(
    r.lines[0],
    /^CANDIDATE line=99 via=identifier shared=conversationOf disposition=<still-valid\|premise-corrected\|now-unnecessary> "the pin entry"$/,
  );
  assert.equal(r.lines[1], "1 identifier candidate(s) for commit c1");
});

// ==========================================================================
// Section 10: resolveIdentifierImages -- real git, one failure mode
// ==========================================================================

test("resolveIdentifierImages: a root commit (no parent) -- ok:false", () => {
  const root = execFileSync("git", ["rev-list", "--max-parents=0", "HEAD"], { cwd: REPO, encoding: "utf8" })
    .trim()
    .split("\n")[0];
  const r = neighbours.resolveIdentifierImages(root, REPO);
  assert.equal(r.ok, false);
});

// ==========================================================================
// Section 11: CLI, real history -- the settled design's own red-first proof.
// `cf0592d` recorded a rotation measurement in the `capturePairResult` entry
// that refuted the retention rule of the bounded-`--pin` entry (line 1017 of
// this frozen image); the file join cannot see it (Section 4 idiom: 508a006
// already proves the file join's own true-positive/over-firing pair, so this
// section is scoped to what only the identifier join demonstrates).
// ==========================================================================

function frozenAt(ref) {
  const path = join(tmpDirSync("neighbours-frozen-"), "BACKLOG.md");
  writeFileSync(path, execFileSync("git", ["show", `${ref}:BACKLOG.md`], { encoding: "utf8" }));
  return path;
}

test("CLI: cf0592d over its OWN frozen image -- identifier join surfaces line=1017 via conversationOf, file join still 9 rows", () => {
  const { code, out } = runTool(["cf0592d", frozenAt("cf0592d")]);
  assert.equal(code, 0);
  const lines = out.trim().split("\n");
  const fileLines = lines.filter((l) => l.startsWith("CANDIDATE") && l.includes(" via=file "));
  assert.equal(fileLines.length, 9, `expected the 9 file-join rows:\n${fileLines.join("\n")}`);
  assert.ok(fileLines.every((l) => /shared=BACKLOG\.md\b/.test(l)));
  const idLines = lines.filter((l) => l.startsWith("CANDIDATE") && l.includes(" via=identifier "));
  assert.ok(
    idLines.some((l) => l.startsWith("CANDIDATE line=1017 ") && /shared=[^ ]*\bconversationOf\b/.test(l)),
    `expected line=1017 sharing conversationOf among:\n${idLines.join("\n")}`,
  );
});
