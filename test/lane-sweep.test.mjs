// lane-sweep — the three set-difference cross-checks (BACKLOG.md,
// "`tools/lane-sweep.mjs`: make the lane enumeration repeatable").
//
// FIXTURES ARE SYNTHETIC, DELIBERATELY, not the live BACKLOG.md / dev-loop.md
// / docs/runbooks. This repo's own dev-loop already names the failure mode a
// test against live content falls into: "a test asserting 'zero false fires
// on the real CURRENT BACKLOG.md' is anchored to live, mutating state, and
// decays into a false alarm by construction... pin the control to a FROZEN
// snapshot ... the suite gets an immutable one, the human gets the live
// one." A committed bite asserting specific findings against the live
// BACKLOG would break the moment someone legitimately FIXES one of them —
// which is the tool's whole purpose. So every bite below builds its own
// small, frozen input.
//
// THE REAL POSITIVE lives in the closing report, not here: run by hand
// against this repo's actual state (2026-08-10), `node tools/lane-sweep.mjs`
// reports 11 UNROUTED producers (including "ca" and "state" — confirmed by
// direct grep that "cache-fix-ca" / "cache-fix-state" appear in NO file
// under tools/ or docs/runbooks/ other than xdg-migrate.mjs itself, which is
// deliberately excluded as a reader) and 4 UNRESOLVED markers, one of them
// "harvest --pin verifies its own pin; BACKLOG ready" — which the real
// BACKLOG.md's line 12202 shows already shipped as `DONE 2026-08-06
// (c003759)`. That transcript is the red-first, true-positive proof; see the
// closing report for the full pasted output.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  mentions, specific, parseIndexTable, splitBacklogBullets, bestBacklogMatch, tokenize,
} from "../tools/lane-sweep.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "lane-sweep.mjs");

// --- mentions() / specific() -------------------------------------------------

test("mentions(): a whole-word/identifier match, not a raw substring", () => {
  assert.equal(mentions("the cache-fix-state directory", "cache-fix-state"), true);
  // "state" is a real TABLE row name — a bare substring test would fire on
  // ordinary prose ("the XDG state root"), which is exactly what this
  // function exists to refuse.
  assert.equal(mentions("cache-fix-stated", "state"), false, "embedded inside a longer identifier must not count");
  assert.equal(mentions("the sweep re-writes the state", "state"), true, "a standalone word DOES count — filtering that out is specific()'s job");
});

test("specific(): excludes short/generic ids, includes distinctive ones", () => {
  assert.equal(specific("ca"), false);
  assert.equal(specific("state"), false);
  assert.equal(specific("captures"), true);
  assert.equal(specific("gate-status.json"), true, "a dot always counts regardless of length");
});

// --- parseIndexTable() -------------------------------------------------------

const GOOD_TABLE = `# Dev loop

## Which line are you on

| the event | the line | ends at |
|---|---|---|
| event one | \`runbooks/one.md\` | terminal one |
| event two | \`runbooks/two.md\` | terminal two |

## Next section
irrelevant prose naming \`runbooks/three.md\` that must NOT be picked up
`;

test("BITE — parseIndexTable() reads exactly the rows inside the named section", () => {
  const rows = parseIndexTable(GOOD_TABLE);
  assert.deepEqual(rows.map((r) => r.path), ["runbooks/one.md", "runbooks/two.md"]);
});

test("BITE — parseIndexTable() returns null when the section heading is gone (structural mismatch)", () => {
  assert.equal(parseIndexTable("# Dev loop\n\nno such section here\n"), null);
});

// --- splitBacklogBullets() ---------------------------------------------------

const BACKLOG_FIXTURE = `# Backlog

- **READY — first item.** Some body text
  continued on a second line.

- **DONE 2026-08-06 (abc1234) — second item, already shipped.**
  Body.

- **PARKED — third item.**
`;

test("BITE — splitBacklogBullets() extracts grade and multi-line body per bullet", () => {
  const bullets = splitBacklogBullets(BACKLOG_FIXTURE);
  assert.equal(bullets.length, 3);
  assert.equal(bullets[0].grade, "READY");
  assert.match(bullets[0].text, /continued on a second line/);
  assert.equal(bullets[1].grade, "DONE");
  assert.equal(bullets[2].grade, "PARKED");
});

// --- bestBacklogMatch() / the threshold's own red-first proof --------------

test("BITE — bestBacklogMatch() picks the higher-overlap bullet", () => {
  const bullets = [
    { grade: "READY", text: "- **READY — an unrelated topic about widgets.**" },
    { grade: "DONE", text: "- **DONE — harvest pin verify reproduces exactly what it captured.**" },
  ];
  const best = bestBacklogMatch("harvest pin verify reproduces its capture", bullets);
  assert.equal(best.bullet.grade, "DONE");
});

test("RED-FIRST — plain token overlap alone is NOT a safe match rule (this is why the threshold in checkMarkers is 0.85, not the default Jaccard-style 0.5-0.6)", () => {
  // Reproduces, in miniature, the real defect found against this repo's own
  // BACKLOG.md: a marker citing "harvest --pin verifies its own pin" scores
  // HIGHER against an unrelated entry that merely shares common connector
  // words than against the entry that is actually about pin verification.
  const wrongButWordy = {
    grade: "READY",
    text: "- **READY — harvest --pin cannot freeze a late event; its own retry needs a ready fallback.**",
  };
  const rightButTerse = {
    grade: "DONE",
    text: "- **DONE — pin reproduction verified.**",
  };
  const body = "harvest --pin verifies its own pin; BACKLOG ready";
  const wrongOverlap = bestBacklogMatch(body, [wrongButWordy]).overlap;
  const rightOverlap = bestBacklogMatch(body, [rightButTerse]).overlap;
  assert.ok(
    wrongOverlap > rightOverlap,
    `expected the wordy WRONG bullet (${wrongOverlap}) to out-score the terse RIGHT one (${rightOverlap}) — `
      + "if this assertion ever fails, plain token overlap has become safe and the 0.85 threshold's rationale should be re-checked",
  );
  // And both sit below 0.85 — checkMarkers' actual threshold — so a picker
  // gated on that threshold reports UNRESOLVED for either rather than
  // asserting the wrong one with confidence.
  assert.ok(wrongOverlap < 0.85, `wrong-bullet overlap ${wrongOverlap} must be below the 0.85 threshold`);
});

test("tokenize(): case-insensitive, drops short tokens", () => {
  assert.deepEqual(tokenize("Harvest --pin Verifies own PIN"), ["harvest", "verifies"]);
});

// --- integration smoke test, against the REAL repo --------------------------
//
// Structural invariants only — never a specific finding, which would break
// the moment a real UNROUTED producer or stale marker gets fixed (the tool's
// own purpose). Exit-code-matches-finding-count is the one invariant that
// cannot legitimately drift.

test("SMOKE — the real CLI runs end-to-end, --json is well-shaped, and exit code matches finding count", () => {
  let out; let status;
  try {
    out = execFileSync(process.execPath, [TOOL, "--json"], { cwd: REPO, encoding: "utf8" });
    status = 0;
  } catch (err) {
    out = err.stdout;
    status = err.status;
  }
  const d = JSON.parse(out);
  assert.ok(Array.isArray(d.producers.rows) && d.producers.examined === d.producers.rows.length);
  assert.ok(Array.isArray(d.markers.rows) && d.markers.examined === d.markers.rows.length);
  assert.ok(typeof d.index.examined === "number" && typeof d.index.fileCount === "number");
  assert.equal(status, d.findingCount > 0 ? 1 : 0);
});

test("SMOKE — human-readable output names what it EXAMINED (producer/index/marker counts)", () => {
  let out;
  try {
    out = execFileSync(process.execPath, [TOOL], { cwd: REPO, encoding: "utf8" });
  } catch (err) {
    out = err.stdout;
  }
  assert.match(out, /examined \d+ producer\(s\), \d+ index row\(s\) against \d+ runbook file\(s\), \d+ GRADUATE marker\(s\)/);
});
