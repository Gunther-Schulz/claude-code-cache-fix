// `restart-exposure --match-class` — a STRUCTURAL predicate for the commonest
// case `--match`'s TEXT form cannot state.
//
// THE GAP (BACKLOG.md, "`restart-exposure --match` takes a TEXT predicate"):
// an extension-behaviour change's affected class is usually a predicate over
// canonical state and forwarded bytes — "a conversation where a suppression
// is firing with nothing restoring the block" — not a string `--match` can
// grep for. Without a predicate, the tool answers the worst case across
// every live session, which is not the number a restart decision needs.
//
// RED-FIRST, with its baseline. Direct invocation against the PRE-CHANGE
// binary is a module-load failure only (`--match-class` did not exist), so
// per dev-loop's "Adding a check" the discriminating red is the per-condition
// bite below instead: `git stash` the change and every BITE 1/2 assertion
// here fails with "unknown option '--match-class'" / a TypeError on the
// missing export, while BITE 4 (the pre-existing `--match` behaviour) still
// passes — proving the split is real. Confirmed by hand before writing this
// file (see the closing report for the pasted `git stash` transcript).
//
// END-TO-END PROOF AGAINST THE REAL PIPELINE (not committed here — the repo
// forbids shipping real-traffic captures as fixtures; see
// docs/dev-loop.md's hygiene-gate section and CLAUDE.local.md's publication
// bar). Run by hand against the two preserved captures the entry's own
// investigation left at `~/.local/share/cache-fix/attribution-2026-08-07/`
// (report carries the full transcript):
//   node tools/replay.mjs <s-captureAH> --gates-from-capture --json
//     -> conservation: 31x "suppressed-without-copy", exit 1
//   node tools/replay.mjs <s-captureAE> --gates-from-capture --json
//     -> conservation: 34x "invented", ZERO "suppressed-without-copy", exit 1
// The entry named s-captureAE/s-captureAO as the carries/does-not pair; that
// pair no longer separates on `suppressed-without-copy` because `403dde9`
// (the very fix the entry was written alongside) already closed AE's row —
// confirmed against `docs/dev-loop.md`'s own residual note
// (`~/.local/share/cache-fix/attribution-2026-08-07/HOT-branch-trace.md`:
// "the other two preserved captures' conservation rows are unchanged under
// the fix — 31 suppressed-without-copy on s-captureAH ... and 34 invented on
// s-captureAE itself"). s-captureAH substitutes for s-captureAO as the
// "carries" side; the class this tool must separate on (a session either
// carries a named conservation kind or it does not) is unchanged by the
// substitution, and AH/AE separate on it exactly as cleanly today.
//
// THE COMMITTED SUITE below tests the WIRING this member actually owns — the
// CLI flag, the class-name validation, the exit-code-as-signal handling
// (replay.mjs sets a non-zero exit whenever it finds ANY violation, which is
// the EXPECTED shape for a match, not an error), and scanLive's filtering —
// against a tiny STUB standing in for `replay.mjs` (`CACHE_FIX_REPLAY_TOOL_PATH`,
// the same override idiom as `CACHE_FIX_CAPTURE_DIR` elsewhere in this repo).
// The conservation CHECKER's own logic is out of this member's write
// boundary and already carries its own red-first-proven suite
// (test/conservation-exemptions.test.mjs, test/replay-gate-selfcheck.test.mjs).

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, utimesSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "restart-exposure.mjs");

// The stub: reads the capture path it was handed, looks for a `MARK:<kind>`
// line, and reports that kind as a conservation violation — mirroring
// replay.mjs's own contract (`process.exitCode = 1` iff `conservation.length`
// is non-zero, per tools/replay.mjs's end-of-file `main()`).
const STUB_SRC = `
import { readFileSync } from "node:fs";
const capturePath = process.argv[2];
const content = readFileSync(capturePath, "utf8");
const kinds = [];
for (const kind of ["suppressed-without-copy", "invented", "lost"]) {
  if (content.includes("MARK:" + kind)) kinds.push(kind);
}
process.stdout.write(JSON.stringify({ conservation: kinds.map((kind) => ({ kind, n: 1 })) }) + "\\n");
if (kinds.length) process.exitCode = 1;
`;

/** A capture dir with two sessions, one MARKed and one not, both "live" (fresh mtime). */
function fakeCaptures({ markedKind = "suppressed-without-copy" } = {}) {
  const home = tmpDirSync("re-match-class-");
  const dir = join(home, "captures");
  mkdirSync(dir, { recursive: true });
  const carries = join(dir, "s-carries-requests.jsonl");
  const clean = join(dir, "s-clean-requests.jsonl");
  writeFileSync(carries, JSON.stringify({ body: { messages: [{ role: "user", content: "hi" }] } }) + `\nMARK:${markedKind}\n`);
  writeFileSync(clean, JSON.stringify({ body: { messages: [{ role: "user", content: "hi" }] } }) + "\n");
  const now = Date.now() / 1000;
  utimesSync(carries, now, now);
  utimesSync(clean, now, now);

  const stubDir = tmpDirSync("re-match-class-stub-");
  const stubPath = join(stubDir, "stub-replay.mjs");
  writeFileSync(stubPath, STUB_SRC);

  return { dir, stubPath };
}

function run(dir, stubPath, args) {
  try {
    const out = execFileSync(process.execPath, [TOOL, ...args], {
      cwd: REPO,
      env: {
        ...process.env,
        CACHE_FIX_CAPTURE_DIR: dir,
        CACHE_FIX_REPLAY_TOOL_PATH: stubPath,
      },
      encoding: "utf8",
    });
    return { out, err: "", status: 0 };
  } catch (err) {
    return { out: err.stdout, err: err.stderr, status: err.status };
  }
}

test("BITE 1 — --match-class narrows to the session that carries the named kind", () => {
  const { dir, stubPath } = fakeCaptures({ markedKind: "suppressed-without-copy" });
  const { out, status } = run(dir, stubPath, ["--match-class", "suppressed-without-copy", "--json"]);
  assert.equal(status, 0, out);
  const r = JSON.parse(out);
  assert.equal(r.rows.length, 1, "exactly the one session that carries the class");
  assert.equal(r.rows[0].capture, "s-carries-requests.jsonl");
  assert.equal(r.rows[0].matchedClass, "suppressed-without-copy");
});

test("BITE 2 — the session that does NOT carry the class is excluded, not merely unflagged", () => {
  const { dir, stubPath } = fakeCaptures({ markedKind: "invented" }); // a DIFFERENT class
  const { out } = run(dir, stubPath, ["--match-class", "suppressed-without-copy", "--json"]);
  const r = JSON.parse(out);
  assert.equal(r.rows.length, 0, "neither session carries suppressed-without-copy, so neither is reported");
});

test("BITE 3 — an unknown --match-class name refuses rather than silently matching nothing", () => {
  const { dir, stubPath } = fakeCaptures();
  const { err, status } = run(dir, stubPath, ["--match-class", "not-a-real-kind"]);
  assert.equal(status, 2);
  assert.match(err ?? "", /unknown --match-class/);
});

test("BITE 4 — CONTROL: plain --match (text) is unaffected by the new flag", () => {
  const { dir, stubPath } = fakeCaptures();
  const { out, status } = run(dir, stubPath, ["--match", "hi", "--json"]);
  assert.equal(status, 0, out);
  const r = JSON.parse(out);
  // The stub is never invoked for a plain --match run — both sessions'
  // tails contain "hi", so both are reported regardless of MARK content.
  assert.equal(r.rows.length, 2);
});

test("BITE 5 — with no predicate at all, every live session is still listed (today's default, unchanged)", () => {
  const { dir, stubPath } = fakeCaptures();
  const { out } = run(dir, stubPath, ["--json"]);
  const r = JSON.parse(out);
  assert.equal(r.rows.length, 2);
});
