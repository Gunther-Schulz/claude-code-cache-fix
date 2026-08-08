// `--at <stamp>` must never answer about a different event than the one the
// stamp names, without saying so.
//
// The incident, 2026-08-05, found by using it: the DEFAULT path printed the
// note it should — "the newest cold event is 2026-08-05 17:22:36Z
// CONTROLLED(resume), 408k re-written … Falling back to the newest BUST" —
// while `--at 2026-08-05T17:22:36Z`, the stamp copied straight out of
// `--list` as `docs/runbooks/bust-appears.md` step 2 instructs, printed
// NOTHING and returned a verdict about the 12:20:13Z messages_changed bust.
// `--at` resolved against BUSTS ONLY, so the controlled event it names was
// invisible to it and the guard `fallbackNote` exists for was routed around.
// That is worse than having no guard: the reader believes the verdict
// describes the event they asked about.
//
// These drive the real CLI rather than the resolver, with HOME pointed at a
// synthetic ledger — the defect lived in main()'s wiring, so a unit test of
// the resolver would have passed over it. Verified RED against the
// pre-change binary by direct invocation on this exact ledger: the first
// assertion below (a NOTE is printed at all) failed, and the run named the
// 12:20:13Z bust with no marking whatsoever.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "bust-triage.mjs");

const CONTROLLED_AT = "2026-08-05T17:22:36Z";       // the ❄ the reader saw
const BUST_AT = "2026-08-05T12:20:13Z";             // the older, unrelated bust
const sec = (iso) => Math.floor(Date.parse(iso) / 1000);

/** A HOME whose worktime ledger holds exactly the motivating two events. */
function fakeHome() {
  const home = tmpDirSync("bt-at-");
  const dir = join(home, ".local/share/claude-worktime");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "activity.jsonl"), [
    { type: "cold", k: "hit", t: sec(BUST_AT), s: "SBUST001", cc: 76000, cause: "messages_changed" },
    { type: "cold", k: "resume", t: sec(CONTROLLED_AT), s: "SCTRL001", cc: 408000, cause: "resume" },
  ].map((r) => JSON.stringify(r)).join("\n") + "\n");
  return home;
}

const run = (home, args) => execFileSync(process.execPath, [TOOL, ...args],
  { cwd: REPO, env: { ...process.env, HOME: home }, encoding: "utf8" });

test("BITE — --at on a CONTROLLED stamp says so, and names the stamp asked for", () => {
  const out = run(fakeHome(), ["--at", CONTROLLED_AT]);
  assert.match(out, /NOTE/, "silent substitution: the run said nothing about the event asked for");
  assert.match(out, /2026-08-05 17:22:36Z/,
    "the note must name the REQUESTED stamp, not only 'the newest'");
  assert.match(out, /CONTROLLED\(resume\)/, "and what that event actually is");
  assert.match(out, /Cannot triage/i, "the non-verdict must be stated as one");
  assert.match(out, /Falling back to the newest BUST at or before .*2026-08-05 12:20:13Z/,
    "and it must name what it triaged instead");
});

test("BITE — no bust at or before the stamp is an answer, not the newest bust", () => {
  const out = run(fakeHome(), ["--at", "2026-08-05T09:00:00Z"]);
  assert.match(out, /No bust at or before 2026-08-05 09:00:00Z/,
    "a bust LATER than the stamp is not the event the reader was looking at");
  assert.doesNotMatch(out, /VERDICT/, "and nothing may be triaged in its place");
});

test("--at on a bust's own stamp triages it and stays quiet — the tool is not chatty", () => {
  const out = run(fakeHome(), ["--at", BUST_AT]);
  assert.doesNotMatch(out, /NOTE/, "a note on every run is a note nobody reads");
  assert.match(out, /bust-triage — 2026-08-05 12:20:13Z/);
});

test("--at with an unreadable stamp refuses rather than triaging the newest", () => {
  // Date.parse -> NaN made every nearest-match comparison false, so the old
  // reduce returned its seed: the newest bust, silently.
  assert.throws(() => run(fakeHome(), ["--at", "not-a-stamp"]), (err) => {
    assert.equal(err.status, 2);
    assert.match(err.stdout, /neither an epoch nor a parseable stamp/);
    assert.doesNotMatch(err.stdout, /VERDICT/);
    return true;
  });
});

test("CONTROL — the default path's note is unchanged", () => {
  const out = run(fakeHome(), []);
  assert.match(out, /the newest cold event is 2026-08-05 17:22:36Z CONTROLLED\(resume\), 408k re-written/);
  assert.match(out, /Falling back to the newest BUST: 2026-08-05 12:20:13Z \(messages_changed\)/);
});

test("--json carries the substitution too", () => {
  const out = run(fakeHome(), ["--at", CONTROLLED_AT, "--json"]);
  const r = JSON.parse(out);
  assert.equal(r.fellBack, true, "the explicit path used to report fellBack:false while substituting");
  assert.equal(r.requested.t, sec(CONTROLLED_AT), "the event asked for rides the JSON");
  assert.equal(r.bust.t, sec(BUST_AT), "and the one actually triaged");
});
