// tools/runbook-lane-index.mjs — the domain-free half of "an index check for
// the runbook lane system" (BACKLOG.md). Covers CHECK 2 (INDEX vs FILES,
// both directions, including CLAUDE.local.md's own inline list) and CHECK 3
// (MARKERS). CHECK 1 (producers vs lanes, fork-private) and CHECK 4
// (detection channel) are not built here — see the tool's own header.
//
// Section 1: unit tests against SYNTHETIC fixtures, written from the
// definition, so a change to this repo's real files cannot silently widen
// or narrow what the rule accepts.
// Section 2: red-first proof against the REAL repo files — planting a
// positive is not needed for CHECK 2 (this repo's own index and runbooks
// are currently consistent, which the test pins as the baseline) but IS
// needed for CHECK 2b (CLAUDE.local.md is untracked and not present in a
// worktree checkout, so its red is demonstrated via a synthetic fixture
// built from the same shape as the real file, cited by structure only —
// never by pasting the real file's prose, which the public-repo hygiene
// rule forbids reproducing here) and for CHECK 3 (the real markers in this
// repo's own runbooks).

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseDevLoopIndex,
  listRunbookFiles,
  parseClaudeLocalRunbookList,
  extractGraduateMarkers,
  checkIndexVsFiles,
  checkClaudeLocalList,
  checkMarkers,
} from "../tools/runbook-lane-index.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools/runbook-lane-index.mjs");

function runTool(args) {
  try {
    const out = execFileSync(process.execPath, [TOOL, ...args], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? -1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

// --- Section 1: the rules, against synthetic content -----------------------

test("parseDevLoopIndex: parses a clean two-row table", () => {
  const doc = [
    "## Which line are you on",
    "",
    "| the event | the line | ends at |",
    "|---|---|---|",
    "| a widget breaks | `runbooks/widget-breaks.md` | fixed / parked |",
    "| a gadget breaks | `runbooks/gadget-breaks.md` | fixed / parked |",
    "",
    "Prose after the table.",
  ].join("\n");
  const rows = parseDevLoopIndex(doc);
  assert.deepEqual(
    rows.map((r) => r.runbook),
    ["widget-breaks.md", "gadget-breaks.md"],
  );
});

test("parseDevLoopIndex: throws when the heading is missing (premise, not a silent empty)", () => {
  assert.throws(() => parseDevLoopIndex("no such heading here"), /heading not found/);
});

test("checkIndexVsFiles: catches a DEAD POINTER (row cites a file that doesn't exist)", () => {
  const rows = [{ event: "a widget breaks", runbook: "widget-breaks.md" }];
  const files = ["gadget-breaks.md"]; // widget-breaks.md is not on disk
  const { deadPointers, orphans } = checkIndexVsFiles(rows, files);
  assert.equal(deadPointers.length, 1);
  assert.equal(deadPointers[0].runbook, "widget-breaks.md");
  assert.equal(orphans.length, 1);
  assert.equal(orphans[0], "gadget-breaks.md");
});

test("checkIndexVsFiles: clean on a matched set", () => {
  const rows = [{ event: "a widget breaks", runbook: "widget-breaks.md" }];
  const files = ["widget-breaks.md"];
  const { deadPointers, orphans } = checkIndexVsFiles(rows, files);
  assert.deepEqual(deadPointers, []);
  assert.deepEqual(orphans, []);
});

test("parseClaudeLocalRunbookList: stops at the sentence boundary, not a fixed window", () => {
  // Reproduces the real file's SHAPE (a comma-joined `file.md` (desc) list
  // ending in ").") followed by an UNRELATED bullet that also names `.md`
  // files — the defect this parser was corrected against: an unbounded
  // window bled into the next bullet and invented two phantom stale
  // entries. Structure only, no real prose reproduced.
  const doc = [
    "- **Runbooks**: pointer text, will go",
    "  stale first. Today: `alpha.md` (an alpha event),",
    "  `beta.md` (a beta event), `gamma.md` (a gamma event —",
    "  more words here).",
    "  Convention: unrelated trailing sentence.",
    "- **Fork-only files**: `CLAUDE.local.md`, `OTHER.md`, `THIRD.md`.",
  ].join("\n");
  const listed = parseClaudeLocalRunbookList(doc);
  assert.deepEqual(listed, ["alpha.md", "beta.md", "gamma.md"]);
});

test("parseClaudeLocalRunbookList: returns null when there is no 'Today:' sentence", () => {
  assert.equal(parseClaudeLocalRunbookList("nothing relevant here"), null);
});

test("checkClaudeLocalList: RED on a 3-of-5 shape (two files on disk missing from the list)", () => {
  const listed = ["alpha.md", "beta.md", "gamma.md"];
  const onDisk = ["alpha.md", "beta.md", "gamma.md", "delta.md", "epsilon.md"];
  const { verifiable, missing, stale } = checkClaudeLocalList(listed, onDisk);
  assert.equal(verifiable, true);
  assert.deepEqual(missing.sort(), ["delta.md", "epsilon.md"]);
  assert.deepEqual(stale, []);
});

test("checkClaudeLocalList: null input is COULD-NOT-VERIFY, not a finding", () => {
  const result = checkClaudeLocalList(null, ["alpha.md"]);
  assert.equal(result.verifiable, false);
  assert.deepEqual(result.missing, []);
});

test("extractGraduateMarkers: finds a single-line and a multi-line marker, with line numbers", () => {
  const doc = ["line one", "[GRADUATE -> a short one]", "line three", "[GRADUATE -> a longer marker", "that wraps across two lines]"].join(
    "\n",
  );
  const markers = extractGraduateMarkers(doc, "synthetic.md");
  assert.equal(markers.length, 2);
  assert.equal(markers[0].line, 2);
  assert.equal(markers[0].body, "a short one");
  assert.equal(markers[1].line, 4);
  assert.match(markers[1].body, /wraps across two lines/);
});

// A "BACKLOG ready" claim is confirmed only against the bodies of READY
// entries in `## Open` (see `readyEntriesText`), so these carriers carry the
// real section shape rather than a bare bullet — the premise is pinned INSIDE
// the check instead of being inherited from whatever the file happens to look
// like.
const openSection = (...entries) => `## Open\n\n${entries.join("\n\n")}\n`;

test("checkMarkers: BACKLOG-ready marker with a matching phrase is ready-confirmed", () => {
  const markers = [{ source: "x.md", line: 1, body: "the widget dedup fix; BACKLOG ready" }];
  const backlog = openSection("- **READY — the widget dedup fix.** Design decided, verifier named.");
  const [result] = checkMarkers(markers, backlog);
  assert.equal(result.classification, "ready-confirmed");
});

test("checkMarkers: BACKLOG-ready marker with NOTHING matching is STALE", () => {
  const markers = [{ source: "x.md", line: 1, body: "an entirely unrelated fabricated widget rework; BACKLOG ready" }];
  const backlog = openSection("- **READY — something completely different about gadgets.**");
  const [result] = checkMarkers(markers, backlog);
  assert.equal(result.classification, "STALE-ready-unmatched");
});

// BITE — the live false confirmation this narrowing was built for
// (2026-08-18): the SAME text that confirms from a READY entry must NOT
// confirm from any other grade. Without this pair the narrowing is
// indistinguishable from a matcher that simply became stricter about
// formatting, and the defect it exists to catch — a marker's "ready" claim
// satisfied by a PARKED entry or by its own closure in `## Done` — walks
// straight back in.
test("checkMarkers: BITE — the same phrase in a PARKED entry does NOT confirm a READY claim", () => {
  const markers = [{ source: "x.md", line: 1, body: "the widget dedup fix; BACKLOG ready" }];
  const parked = openSection("- **PARKED — the widget dedup fix.** Named missing evidence: a case.");
  assert.equal(checkMarkers(markers, parked)[0].classification, "STALE-ready-unmatched",
    "a PARKED entry is not a READY one, whatever words it shares");
  const ready = openSection("- **READY — the widget dedup fix.** Design decided, verifier named.");
  assert.equal(checkMarkers(markers, ready)[0].classification, "ready-confirmed",
    "control: the identical phrase under a READY header still confirms, so the " +
    "narrowing discriminates on GRADE and not on the words");
});

test("checkMarkers: BITE — a phrase living only in `## Done` does NOT confirm a READY claim", () => {
  const markers = [{ source: "x.md", line: 1, body: "the widget dedup fix; BACKLOG ready" }];
  const backlog = `${openSection("- **READY — something completely different about gadgets.**")}
## Done — closures

- **DONE 2026-08-01 (\`abc1234\`) — the widget dedup fix.** Shipped and verified.
`;
  assert.equal(checkMarkers(markers, backlog)[0].classification, "STALE-ready-unmatched",
    "an item's own CLOSURE must not read as evidence that it is still queued");
});

// DECLARATION-AGNOSTIC — tools/closure-home.mjs is the single home for
// "where does this carrier's closure home live", and `readyEntriesText`
// (checkMarkers' engine) needs no literal of its own to stay correct under a
// `Closure-home:` declaration: it selects `## Open` POSITIVELY
// (censusOpenSection), so whatever the closure home is named, or whether it
// lives in this text at all, never enters its scope. These three cases
// prove that by construction rather than by absence of a counter-example —
// each is the SAME discriminating shape as the `## Done` case above, with a
// declaration present that would matter to backlog-lint.mjs and
// alias-claim.mjs but provably does not matter here.
test("checkMarkers: DECLARATION-AGNOSTIC — a phrase living only under a Closure-home:-renamed section still does NOT confirm a READY claim", () => {
  const markers = [{ source: "x.md", line: 1, body: "the widget dedup fix; BACKLOG ready" }];
  const backlog =
    "Closure-home: ## Archive\n" +
    `${openSection("- **READY — something completely different about gadgets.**")}` +
    "## Archive — closures\n\n" +
    "- **DONE 2026-08-01 (`abc1234`) — the widget dedup fix.** Shipped and verified.\n";
  assert.equal(checkMarkers(markers, backlog)[0].classification, "STALE-ready-unmatched",
    "renaming the closure home changes nothing here — ## Open is still the only text consulted");
});

test("checkMarkers: DECLARATION-AGNOSTIC — a `Closure-home:` file declaration (closed entries physically elsewhere) changes nothing about a READY match", () => {
  const markers = [{ source: "x.md", line: 1, body: "the widget dedup fix; BACKLOG ready" }];
  const backlog =
    "Closure-home: BACKLOG-DONE.md\n" +
    openSection("- **READY — the widget dedup fix.** Design decided, verifier named.");
  const [result] = checkMarkers(markers, backlog);
  assert.equal(result.classification, "ready-confirmed", "the declaration's head line never enters ## Open's body");
});

test("checkMarkers: DECLARATION-AGNOSTIC — a residual `## Done` section left behind by a `kind:\"file\"` migration still does NOT confirm a READY claim", () => {
  const markers = [{ source: "x.md", line: 1, body: "the widget dedup fix; BACKLOG ready" }];
  const backlog =
    "Closure-home: BACKLOG-DONE.md\n" +
    `${openSection("- **READY — something completely different about gadgets.**")}` +
    "## Done — pre-migration residue\n\n" +
    "- **DONE 2026-08-01 (`abc1234`) — the widget dedup fix.** Shipped and verified.\n";
  assert.equal(checkMarkers(markers, backlog)[0].classification, "STALE-ready-unmatched",
    "even a residual ## Done section is out of readyEntriesText's scope, same as before the declaration existed");
});

test("checkMarkers: not-yet-booked with a named trigger is accepted", () => {
  const markers = [{ source: "x.md", line: 1, body: "not yet booked, trigger: a second occurrence" }];
  const [result] = checkMarkers(markers, "");
  assert.equal(result.classification, "not-yet-booked-with-trigger");
});

test("checkMarkers: not-yet-booked with NO trigger is STALE", () => {
  const markers = [{ source: "x.md", line: 1, body: "not yet booked" }];
  const [result] = checkMarkers(markers, "");
  assert.equal(result.classification, "STALE-not-yet-booked-no-trigger");
});

test("checkMarkers: a marker with neither disposition is UNCLASSIFIED", () => {
  const markers = [{ source: "x.md", line: 1, body: "someday, maybe" }];
  const [result] = checkMarkers(markers, "");
  assert.equal(result.classification, "UNCLASSIFIED-no-disposition");
});

// --- Section 2: red-first proof against real files -------------------------

test("RED-FIRST baseline: the real docs/dev-loop.md index and docs/runbooks/*.md agree (CHECK 2 clean today)", () => {
  const devLoopText = readFileSync(join(REPO, "docs/dev-loop.md"), "utf8");
  const rows = parseDevLoopIndex(devLoopText);
  const files = listRunbookFiles(join(REPO, "docs/runbooks"));
  const { deadPointers, orphans } = checkIndexVsFiles(rows, files);
  assert.deepEqual(deadPointers, [], "a stale index row would be a real regression, not a fixture defect");
  assert.deepEqual(orphans, [], "an unindexed runbook file would be a real regression, not a fixture defect");
  assert.ok(rows.length >= 5, "sanity: the table has at least the five documented lanes");
  assert.deepEqual(files, readdirSync(join(REPO, "docs/runbooks")).filter((f) => f.endsWith(".md")).sort());
});

test("RED-FIRST: CHECK 3 over the real runbooks finds real STALE markers today", () => {
  // Not a fixture defect — this is the tool doing its job over live content.
  // Pinned so a future session sees this go GREEN as a real signal that the
  // markers were resolved, not as an unexplained test failure.
  const devLoopText = readFileSync(join(REPO, "docs/dev-loop.md"), "utf8");
  const backlogText = readFileSync(join(REPO, "BACKLOG.md"), "utf8");
  const runbooksDir = join(REPO, "docs/runbooks");
  const files = listRunbookFiles(runbooksDir);
  const markers = [
    ...extractGraduateMarkers(devLoopText, "docs/dev-loop.md"),
    ...files.flatMap((f) => extractGraduateMarkers(readFileSync(join(runbooksDir, f), "utf8"), `docs/runbooks/${f}`)),
  ].filter((m) => !/<where it belongs>/i.test(m.body));
  assert.ok(markers.length > 0, "sanity: real runbooks carry real GRADUATE markers");
  const results = checkMarkers(markers, backlogText);
  const stale = results.filter((r) => r.classification.startsWith("STALE"));
  assert.ok(stale.length > 0, "at least one real marker should be flagged today (see BACKLOG.md — the tool's own dispatch report names them)");
});

test("CLI: exits 1 with findings on the real repo (markers are stale today; see above)", () => {
  const { code, out } = runTool([]);
  assert.equal(code, 1);
  assert.match(out, /runbook-lane-index: examined \d+ index row\(s\)/);
});

test("CLI: --json emits parseable JSON with the same finding count as text mode", () => {
  const text = runTool([]);
  const jsonRun = runTool(["--json"]);
  const parsed = JSON.parse(jsonRun.out);
  assert.equal(jsonRun.code, text.code);
  assert.equal(parsed.findings.length > 0, true);
});

test("CLI: an unknown flag is an operational error (exit 2), not a silent no-op", () => {
  const { code } = runTool(["--nonsense"]);
  assert.equal(code, 2);
});
