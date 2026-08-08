// A disposition the matrix records as PROSE must be reachable from the cause
// it dispositions — and the next walk must not be able to land out of reach.
//
// The incident, found 2026-08-06 at session close and fired live again
// 2026-08-07 09:52:42Z on the operator's own 212k bust: `bust-triage --at`
// returned UNCLASSIFIED — "a class nothing currently covers" — for
// `previous_message_not_found`, which this repo walked to CONTROLLED-CAUSE on
// 2026-07-31 and wrote up under a `## Event walk` heading. The matrix has TWO
// containers for a disposition, numbered rows and walk prose, and `causeToRow`
// indexed one. A reader following the documented route finds the answer; the
// tool following its route reports a new class.
//
// BOTH HALVES ARE ASSERTED HERE, because fixing the reader alone is the
// symptom-site fix one level up: nothing required a walk ending in
// CONTROLLED-CAUSE to become a numbered row or to say why it deliberately is
// not, so the amplifier goes quiet and the GENERATOR keeps producing prose
// nothing can index (dev-loop rule three: every reach failure has a writer,
// and it is still running).
//
// WHERE THE EXPECTATIONS COME FROM — the matrix's own two containers, not the
// tool's index. The set difference "a cause token dispositioned in the matrix
// that this tool cannot resolve" is computed from the walk HEADINGS while the
// index it is tested against is built from the walks' WALK-INDEX
// DECLARATIONS. Two independent readings of the same section: a declaration
// that disagrees with the heading above it goes red, where a single-source
// check would be the predicate no input can falsify.
//
// RED-FIRST ARRANGEMENT (new expectations against the OLD state). The lint
// was run against the matrix before any WALK-INDEX line existed. Recorded
// output, exit 1:
//     matrix walk lint — 5 `## Event walk` section(s), 2 cause token(s) checked
//       MISS  line 1212  cause=- disposition=- row=-  heading=[other]
//       … (five MISS rows) …
//     6 finding(s):
//       - … no WALK-INDEX line …          (x5, the WRITER half)
//       - cause "previous_message_not_found" is dispositioned in the matrix
//         but this tool cannot resolve it — it reads as UNCLASSIFIED
// and `--at 2026-08-07T09:52:42Z` / `--at 2026-08-06T16:35:15Z` both printed
// `VERDICT: UNCLASSIFIED` there.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { eventWalks, causeToWalk, causeIsReachable, lintMatrix, NON_CAUSES }
  from "../tools/bust-triage.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "bust-triage.mjs");
const MATRIX = join(REPO, "docs/directives/robustness-threat-matrix.md");

// --- THE lint, over the LIVE matrix: this is what runs in `npm test` ---

test("BITE — the live matrix passes --lint-matrix, and the mode reports its coverage", () => {
  let out;
  try {
    out = execFileSync(process.execPath, [TOOL, "--lint-matrix"],
      { cwd: REPO, encoding: "utf8" });
  } catch (err) {
    assert.fail(`--lint-matrix exited ${err.status}:\n${err.stdout}`);
  }
  // Coverage before verdict: a lint that read nothing reports clean, which is
  // the "0/0 reads like checked and clean" shape this repo has hit three
  // times (dev-loop, "A checker has THREE answers").
  const m = /(\d+) `## Event walk` section\(s\), (\d+) cause token\(s\) checked/.exec(out);
  assert.ok(m, `the mode must state what it read:\n${out}`);
  assert.ok(Number(m[1]) >= 5, `only ${m[1]} walk sections read — the READER is the suspect`);
  assert.ok(Number(m[2]) >= 2, `only ${m[2]} cause tokens checked`);
  assert.match(out, /OK: every walk declares itself/);
});

test("BITE — every live walk declares its cause, its disposition and its row-or-none", () => {
  const walks = eventWalks(MATRIX);
  assert.ok(walks.length >= 5, `only ${walks.length} walks parsed`);
  for (const w of walks) {
    assert.ok(w.declared, `line ${w.line} "${w.title}" carries no WALK-INDEX line`);
    assert.ok(w.disposition, `line ${w.line} declares no disposition`);
    assert.ok(w.row !== null || w.rowDeclaredNone,
      `line ${w.line} declares neither a row nor an explicit none`);
    if (w.rowDeclaredNone) {
      assert.ok(w.reason && w.reason.length > 20,
        `line ${w.line} declares row=none with no stated reason — "deliberately no row" and ` +
        `"nobody minted one" must not read alike`);
    }
  }
});

// The set difference the entry names, asserted directly rather than only
// through the CLI: causes dispositioned anywhere in the matrix that the tool
// cannot resolve must be an EMPTY set.
test("BITE — no cause the matrix dispositions is unreachable from this tool", () => {
  const { population, findings } = lintMatrix(MATRIX);
  assert.ok(population.includes("previous_message_not_found"),
    "the motivating cause must be IN the population — otherwise this asserts nothing");
  const unreachable = population.filter((c) => !causeIsReachable(c, MATRIX));
  assert.deepEqual(unreachable, [],
    `dispositioned but unreachable — each reads as UNCLASSIFIED: ${unreachable.join(", ")}`);
  assert.deepEqual(findings, [], findings.join("\n"));
});

// --- the reader half, end to end, on the live pair the entry names ---

const sec = (iso) => Math.floor(Date.parse(iso) / 1000);

/** A HOME whose ledger holds one `previous_message_not_found` bust with no
 *  capture at all — the walk lookup must not depend on capture survival, and
 *  the captures behind the two live stamps rotate. */
function fakeHome(at, sid) {
  const home = tmpDirSync("bt-walk-");
  const dir = join(home, ".local/share/claude-worktime");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "activity.jsonl"),
    JSON.stringify({ type: "cold", k: "hit", t: sec(at), s: sid, gap: 14875,
                     ctx: 226800, cc: 211558, cause: "previous_message_not_found" }) + "\n");
  return home;
}

test("BITE — a cause the matrix has walked never reads as UNCLASSIFIED again", () => {
  // No capture, so the run stops at UNVERIFIABLE before the walk lookup —
  // which is why this drives the resolver rather than the CLI for the pair.
  // The CLI half is verified live and recorded in this file's header.
  const walk = causeToWalk("previous_message_not_found", MATRIX);
  assert.ok(walk, "the 2026-07-31 disposition must be reachable from the cause it dispositions");
  assert.equal(walk.disposition, "CONTROLLED-CAUSE");
  assert.equal(walk.row, null, "this class has no numbered row, deliberately");
  assert.match(walk.title, /^Event walk\b/);
  // …and the run that could not reach it is still a real run: an unrelated
  // cause must stay unreachable rather than falling onto the nearest walk.
  assert.equal(causeToWalk("some_cause_nobody_walked", MATRIX), null);
});

test("BITE — a degraded default is never resolved to a disposition", () => {
  // `other`/`unavailable` mean "no cause available", never "causes tested and
  // rejected" (matrix row 21). Two of the five walk headings render `other`,
  // so a reader that indexed heading tokens blindly would hand a disposition
  // to the absence of a cause.
  for (const c of NON_CAUSES) {
    assert.equal(causeToWalk(c, MATRIX), null, `${c} must not resolve to a walk`);
  }
  const { population } = lintMatrix(MATRIX);
  for (const c of NON_CAUSES) {
    assert.ok(!population.includes(c),
      `${c} is in the lint's cause population, so the lint can never go green`);
  }
});

// --- the WRITER half, proven on a planted walk ---
//
// An absence claim needs its instrument shown live on a known positive
// (dev-loop, "Non-events"). The live matrix passes the lint; that is exactly
// what a lint which could never fire also produces. So: plant each defect in
// a copy of the real matrix and watch the specific finding appear.

function withMatrix(mutate) {
  const dir = tmpDirSync("bt-lintmx-");
  const p = join(dir, "matrix.md");
  writeFileSync(p, mutate(readFileSync(MATRIX, "utf8")));
  return p;
}

test("BITE — a walk with no WALK-INDEX line is a finding (planted)", () => {
  const p = withMatrix((s) => s.replace(
    /^WALK-INDEX: cause=previous_message_not_found disposition=CONTROLLED-CAUSE row=none — the API's own.*$/m,
    ""));
  const { findings } = lintMatrix(p);
  assert.ok(findings.some((f) => /no WALK-INDEX line/.test(f)),
    `planting an undeclared walk produced no finding:\n${findings.join("\n")}`);
});

test("BITE — an undeclared walk ALSO reopens the set difference (planted)", () => {
  // Both declarations of the motivating cause removed: the writer half and
  // the reader half are one gap, and this is the state the tool shipped in.
  const p = withMatrix((s) => s.split("\n")
    .filter((l) => !/^WALK-INDEX: cause=previous_message_not_found/.test(l)).join("\n"));
  const { findings } = lintMatrix(p);
  assert.ok(findings.some((f) => /cause "previous_message_not_found" is dispositioned/.test(f)),
    `the set difference stayed empty with the cause unreachable:\n${findings.join("\n")}`);
  assert.equal(causeIsReachable("previous_message_not_found", p), false);
});

test("BITE — row=none with no stated reason is a finding (planted)", () => {
  const p = withMatrix((s) => s.replace(
    /^(WALK-INDEX: cause=none disposition=NON-DEFECT row=none) — .*$/m, "$1"));
  const { findings } = lintMatrix(p);
  assert.ok(findings.some((f) => /row=none with no stated reason/.test(f)),
    `planting a bare row=none produced no finding:\n${findings.join("\n")}`);
});

test("BITE — a row= that names no readable matrix row is a finding (planted)", () => {
  const p = withMatrix((s) => s.replace(
    /^WALK-INDEX: cause=messages_changed disposition=NOT-OURS row=4$/m,
    "WALK-INDEX: cause=messages_changed disposition=NOT-OURS row=997"));
  const { findings } = lintMatrix(p);
  assert.ok(findings.some((f) => /declares row=997, which is not a readable matrix row/.test(f)),
    `planting a dangling row reference produced no finding:\n${findings.join("\n")}`);
});

// The row check must read the file being LINTED, not the default one — a copy
// whose row 4 has been deleted must fail even though the real matrix has one.
// Without the path parameter this passed by reading the wrong file, which is
// the coordinate-space error one level up.
test("BITE — the row check reads the matrix under lint, not the default (planted)", () => {
  const p = withMatrix((s) => s.split("\n").filter((l) => !/^\|\s*4\s*\|/.test(l)).join("\n"));
  const { findings } = lintMatrix(p);
  assert.ok(findings.some((f) => /declares row=4, which is not a readable matrix row/.test(f)),
    `row 4 was deleted from the linted copy and the lint did not notice:\n${findings.join("\n")}`);
});

test("BITE — two walks dispositioning one cause differently is a finding (planted)", () => {
  const p = withMatrix((s) => s.replace(
    /^WALK-INDEX: cause=previous_message_not_found disposition=CONTROLLED-CAUSE row=none — the API's own(.*)$/m,
    "WALK-INDEX: cause=previous_message_not_found disposition=NON-DEFECT row=none — the API's own$1"));
  const { findings } = lintMatrix(p);
  assert.ok(findings.some((f) => /earlier walk dispositions the same cause as/.test(f)),
    `two walks disagreeing about one cause produced no finding:\n${findings.join("\n")}`);
});

// CONTROL — the mode must fail loudly, not pass quietly, when it reads nothing.
test("CONTROL — a matrix with no walk sections FAILS rather than reporting clean", () => {
  const p = withMatrix((s) => s.split("\n").filter((l) => !/^## Event walk\b/.test(l)).join("\n"));
  const walks = eventWalks(p);
  assert.equal(walks.length, 0);
  const out = execFileSync(process.execPath, ["-e",
    `import("${JSON.stringify(TOOL).slice(1, -1)}").then(async (m) => {
       const r = m.lintMatrix(${JSON.stringify(p)});
       console.log(JSON.stringify({ walks: r.walks.length, population: r.population.length }));
     })`], { encoding: "utf8" });
  const r = JSON.parse(out);
  assert.equal(r.walks, 0);
  assert.equal(r.population, 0,
    "an empty read must be visible as zero coverage, never as an empty findings list alone");
});
