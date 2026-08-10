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
    /^CANDIDATE line=1 shared=tools\/foo\.mjs disposition=<still-valid\|premise-corrected\|now-unnecessary> "READY — a thing\."$/,
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
test("CLI: 508a006 against the current BACKLOG.md -- real, reproducible candidate set", () => {
  const { code, out } = runTool(["508a006"]);
  assert.equal(code, 0);
  const lines = out.trim().split("\n").filter((l) => l.startsWith("CANDIDATE"));
  const atLines = lines.map((l) => Number(l.match(/^CANDIDATE line=(\d+)/)[1]));
  assert.deepEqual(
    atLines,
    [665, 722, 787, 1558, 1879, 4314, 4728, 4766],
    "the eight still-open entries citing `BACKLOG.md`, in file order",
  );
  assert.match(out, /^8 candidate\(s\) for commit 508a006$/m);
});

// Over-firing control: an entry whose only overlap is a file 508a006 did NOT
// touch must not appear. Line 265 ("bust-triage emits an ATTRIBUTION
// verdict") cites `tools/bust-triage.mjs`, not `BACKLOG.md` -- confirmed
// absent here, confirmed PRESENT below for 13278fa (which does touch that
// file), so this is a real exclusion, not an entry that never matches
// anything.
test("CLI: 508a006 -- an entry citing a file it did not touch is excluded (over-firing control)", () => {
  const { out } = runTool(["508a006"]);
  assert.doesNotMatch(out, /line=265\b/, "excluded: cites tools/bust-triage.mjs, not BACKLOG.md");
});

test("CLI: 13278fa (a real KEY-FLIP-shipping commit) -- a different real candidate set, including line 265", () => {
  const { code, out } = runTool(["13278fa"]);
  assert.equal(code, 0);
  const lines = out.trim().split("\n").filter((l) => l.startsWith("CANDIDATE"));
  const atLines = lines.map((l) => Number(l.match(/^CANDIDATE line=(\d+)/)[1]));
  assert.deepEqual(atLines, [265, 1125, 1335, 3580]);
  assert.match(out, /^4 candidate\(s\) for commit 13278fa$/m);
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
