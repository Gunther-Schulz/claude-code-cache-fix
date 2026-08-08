// `--list` gains the fields the operator's own screen already shows —
// ORDINAL, PROJECT, AGE — because the ❄ token and `bust-triage --list` used
// to share NO identifying field at all (BACKLOG, operator 2026-08-07: "I
// feel like there must be some gaps here as well in our tooling that we
// can't properly match my reporting and what you are able to easily
// investigate and match"). The only overlap was size+cause, which is why an
// entire exchange ran on "203k / 230k / 419k" as the sole handles and "the
// largest" collided with "the latest".
//
// RED-FIRST ARRANGEMENT (the strong form: NEW expectations against the OLD
// implementation). Run against the tool as it stood before this entry,
// `node tools/bust-triage.mjs --list`:
//     2026-08-08 12:06:02Z   339k  messages_changed               1e04119a
//     2026-08-08 11:58:22Z   353k  other                          1e04119a
//     ...
// Four columns: stamp, size, cause, 8-char sid. No project, no ordinal, no
// age — "given only what the operator can see" (project, ordinal, size,
// cause, age) a `--list` row could not be matched to it at all. That is the
// red this entry closes.
//
// LIVE GROUNDING (dispatcher-checked 2026-08-08, both still present in
// today's `~/.local/share/claude-worktime/activity.jsonl` at probe time —
// this is the motivating BACKLOG measurement itself, still on disk):
//   session c08e2235…, project statiker: busts at 04:08:35Z (203k, ord 1,
//   omitted), 04:17:25Z (230k, ord 2), 04:37:58Z (274k, ord 3) — UTC+2 local
//   is 06:08 / 06:17 / 06:37, matching the entry's own "06:08 and 06:17
//   local, 203k and 230k" verbatim.
//   session e81a9942…, SAME project statiker, one bust: 01:49:59Z (419k,
//   ord 1, omitted) — UTC+2 local 03:49, matching "03:49 local 419k in one
//   session".
// `node -e` against the live ledger confirmed both: the c08e2235 #2 row and
// the e81a9942 (no ordinal) row are two DIFFERENT single rows once ordinal,
// project and age are printed, disambiguated even though they share one
// project — which is the harder case the entry's verifier asks for
// ("the OTHER session's 419k event must identify a different single row").
// The exact live numbers are not pinned into an assertion below because the
// append-only ledger keeps growing and these two rows will eventually
// scroll past `--list`'s 15-row window; what is pinned is the MECHANISM —
// reproduced here as constructed fixtures shaped exactly like the live pair,
// so the test survives ledger rotation instead of expiring with it (the
// dev-loop rule against a red-first arrangement anchored to mutable state).

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  coldEvents, listRows, listHeader, projectFor, ageStr, sessionOrdinals,
  collapseDuplicateBookings, DUPLICATE_BOOKING_WINDOW_SEC,
} from "../tools/bust-triage.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "bust-triage.mjs");
const sec = (iso) => Math.floor(Date.parse(iso) / 1000);

// --- ageStr: EXACTLY the ❄ token's own formula (claude-worktime.sh) ---

test("ageStr floors minutes under an hour, hours+minutes past it, no padding", () => {
  assert.equal(ageStr(0), "0m");
  assert.equal(ageStr(59), "0m");
  assert.equal(ageStr(60), "1m");
  assert.equal(ageStr(17 * 60), "17m");
  assert.equal(ageStr(3599), "59m");
  assert.equal(ageStr(3600), "1h0m");
  assert.equal(ageStr(3600 + 3 * 60), "1h3m", "no zero-padding on minutes, matching the token's own \"1h3m\"");
  assert.equal(ageStr(-5), "0m", "a clock that reads negative (clock skew) floors at zero, never a negative age");
});

// --- sessionOrdinals: mirrors worktime's cold_count — bust-only, omit-at-1 ---

test("BITE — ordinal counts BUST events only, per session, oldest first", () => {
  const events = [
    { t: 300, s: "S1", cc: 3000, cause: "messages_changed", cls: "bust" },
    { t: 200, s: "S1", cc: 2000, cause: "messages_changed", cls: "bust" },
    { t: 250, s: "S1", cc: 2500, cause: "compact", cls: "controlled" }, // never counted
    { t: 100, s: "S1", cc: 1000, cause: "messages_changed", cls: "bust" },
    { t: 500, s: "S2", cc: 9000, cause: "other", cls: "bust" },
  ];
  const ord = sessionOrdinals(events);
  assert.equal(ord.get("S1#100"), 1, "oldest bust in S1 is #1");
  assert.equal(ord.get("S1#200"), 2);
  assert.equal(ord.get("S1#300"), 3);
  assert.equal(ord.get("S1#250"), undefined, "a controlled event never gets a bust ordinal");
  assert.equal(ord.get("S2#500"), 1, "a different session counts from its own 1");
});

test("BITE — a session with one bust renders NO ordinal (the token's own omit-at-N=1 rule)", () => {
  const events = [{ t: 100, s: "SOLO", cc: 1000, cause: "messages_changed", cls: "bust" }];
  const [row] = listRows(events, { now: 100 });
  assert.doesNotMatch(row, /#1\b/, `a lone bust must not carry an ordinal: ${row}`);
});

test("CONTROL — the second bust in a session DOES carry its ordinal", () => {
  // listRows renders whatever order it is given (coldEvents' own newest-
  // first order in real use) — newest first here too, so index 0 is the
  // more-recent (ordinal 2) row.
  const events = [
    { t: 200, s: "S", cc: 2000, cause: "messages_changed", cls: "bust" },
    { t: 100, s: "S", cc: 1000, cause: "messages_changed", cls: "bust" },
  ];
  const rows = listRows(events, { now: 200 });
  assert.match(rows[0], /#2\b/, `the newer of two busts must show #2: ${rows[0]}`);
  assert.doesNotMatch(rows[1], /#1\b/, "the first of the two stays unnumbered");
});

// --- collapseDuplicateBookings: the "one event booked three times" mode ---
//
// CONSTRUCTED, not observed — the real 17:39:59/17:40:08/17:40:16Z triple
// (BACKLOG) has rotated out of the ledger by the time this ships; reproduced
// here with the SAME 9-second total span and the SAME shape (identical `cc`,
// the first booking racing to "other" before the diagnostic lands, exactly
// as claude-worktime.sh's own late-binding comment describes).

const TRIPLE_BASE = sec("2026-07-31T17:39:59Z");
const triple = () => [
  { t: TRIPLE_BASE, s: "SDUP", cc: 90000, cause: "other", cls: "bust" },
  { t: TRIPLE_BASE + 9, s: "SDUP", cc: 90000, cause: "messages_changed", cls: "bust" },
  { t: TRIPLE_BASE + 17, s: "SDUP", cc: 90000, cause: "messages_changed", cls: "bust" },
];

test("BITE — the 17:40-shaped triple collapses to ONE row, never three", () => {
  const collapsed = collapseDuplicateBookings(triple());
  assert.equal(collapsed.length, 1, `three bookings of one event must render as one row: ${JSON.stringify(collapsed)}`);
  assert.equal(collapsed[0].t, TRIPLE_BASE, "the EARLIEST booking is the row's true moment");
  assert.equal(collapsed[0].dupCount, 3);
});

test("the collapsed row is FLAGGED, not silently merged", () => {
  const [row] = listRows(collapseDuplicateBookings(triple()), { now: TRIPLE_BASE + 60 });
  assert.match(row, /x3 booked/, `a merged row must say so out loud: ${row}`);
});

test("the collapsed row upgrades its cause off the raced \"other\" placeholder", () => {
  const [collapsed] = collapseDuplicateBookings(triple());
  assert.equal(collapsed.cause, "messages_changed",
    "the true cause (found by the second booking) must win over the first booking's raced \"other\"");
});

test("CONTROL — a genuine second bust (different cc) in the same session is NEVER collapsed", () => {
  const events = [
    { t: TRIPLE_BASE, s: "SDUP", cc: 90000, cause: "messages_changed", cls: "bust" },
    { t: TRIPLE_BASE + 9, s: "SDUP", cc: 91500, cause: "messages_changed", cls: "bust" }, // different cc
  ];
  const collapsed = collapseDuplicateBookings(events);
  assert.equal(collapsed.length, 2, "two distinct busts 9s apart must stay two rows — same session is not enough");
});

test("CONTROL — same session + same cc, but OUTSIDE the window, is not collapsed", () => {
  const events = [
    { t: TRIPLE_BASE, s: "SDUP", cc: 90000, cause: "messages_changed", cls: "bust" },
    { t: TRIPLE_BASE + DUPLICATE_BOOKING_WINDOW_SEC + 1, s: "SDUP", cc: 90000, cause: "messages_changed", cls: "bust" },
  ];
  const collapsed = collapseDuplicateBookings(events);
  assert.equal(collapsed.length, 2, `a re-bust of the identical cc past the window is a real repeat, not a race: ${JSON.stringify(collapsed)}`);
});

test("CONTROL — a controlled (cost/resume) event is never folded into a bust, or vice versa", () => {
  const events = [
    { t: TRIPLE_BASE, s: "SDUP", cc: 90000, cause: "messages_changed", cls: "bust" },
    { t: TRIPLE_BASE + 5, s: "SDUP", cc: 90000, cause: "compact", cls: "controlled" },
  ];
  const collapsed = collapseDuplicateBookings(events);
  assert.equal(collapsed.length, 2, "the triple-booking race is a bust-side (k:\"hit\") defect only");
});

// --- projectFor: reads the session's own cwd, never the mangled dirname ---
//
// The CONTROL this proves: the mangled `~/.claude/projects/<dir>` name
// cannot be reversed by splitting on dashes — this repo's own directory,
// `claude-code-cache-fix`, carries three literal dashes that are NOT slash
// substitutions. A "last dash segment" heuristic would report "fix"; reading
// `cwd` and taking its basename reports the whole real name.

function fakeProjects(base, sid, cwd, { includeCwd = true } = {}) {
  const projects = join(base, ".claude", "projects");
  const mangled = cwd.replace(/\//g, "-");
  const dir = join(projects, mangled);
  mkdirSync(dir, { recursive: true });
  const lines = [];
  if (includeCwd) lines.push(JSON.stringify({ type: "user", cwd, sessionId: sid }));
  lines.push(JSON.stringify({ type: "summary", sessionId: sid }));
  writeFileSync(join(dir, `${sid}.jsonl`), lines.join("\n") + "\n");
  return projects;
}

test("BITE — projectFor reads cwd's basename, proving a dash-name is not mistaken for a path", () => {
  const home = tmpDirSync("bt-proj-");
  const projects = fakeProjects(home, "SID1", "/home/x/dev/vendor/claude-code-cache-fix");
  assert.equal(projectFor("SID1", projects), "claude-code-cache-fix",
    "a naive last-dash-segment split of the mangled dirname would have said \"fix\"");
});

test("CONTROL — a single-segment project name still resolves (the statiker case)", () => {
  const home = tmpDirSync("bt-proj-");
  const projects = fakeProjects(home, "SID2", "/home/x/dev/Gunther-Schulz/statiker");
  assert.equal(projectFor("SID2", projects), "statiker");
});

test("a transcript with no cwd anywhere in it resolves to null, never a guess", () => {
  const home = tmpDirSync("bt-proj-");
  const projects = fakeProjects(home, "SID3", "/home/x/whatever", { includeCwd: false });
  assert.equal(projectFor("SID3", projects), null);
});

test("no transcript for the session at all resolves to null", () => {
  const home = tmpDirSync("bt-proj-");
  const projects = join(home, ".claude", "projects");
  mkdirSync(projects, { recursive: true });
  assert.equal(projectFor("NOPE", projects), null);
});

// --- end-to-end: a fake HOME shaped like the live c08e2235/e81a9942 pair ---

function fakeHome({ sid, project, hits }) {
  const home = tmpDirSync("bt-list-");
  const wt = join(home, ".local", "share", "claude-worktime");
  mkdirSync(wt, { recursive: true });
  writeFileSync(join(wt, "activity.jsonl"),
    hits.map((h) => JSON.stringify({ type: "cold", k: "hit", s: sid, ...h })).join("\n") + "\n");
  fakeProjects(home, sid, `/home/x/dev/Gunther-Schulz/${project}`);
  return home;
}

const run = (home, args) => execFileSync(process.execPath, [TOOL, ...args],
  { cwd: REPO, env: { ...process.env, HOME: home }, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });

test("BITE — end to end: --list carries project, ordinal and age, and omits the ordinal at N=1", () => {
  const home = fakeHome({
    sid: "c08e2235fake", project: "statiker",
    hits: [
      { t: sec("2026-08-07T04:08:35Z"), cc: 203091, cause: "messages_changed", gap: 6, ctx: 218795 },
      { t: sec("2026-08-07T04:17:25Z"), cc: 229805, cause: "messages_changed", gap: 7, ctx: 245509 },
      { t: sec("2026-08-07T04:37:58Z"), cc: 274036, cause: "messages_changed", gap: 4, ctx: 289740 },
    ],
  });
  const out = run(home, ["--list"]);
  assert.match(out, /statiker/, `project column missing: ${out}`);
  assert.match(out, /203k\s+messages_changed\s+\S+\s+statiker/,
    `the FIRST bust in the session must carry no ordinal: ${out}`);
  assert.match(out, /230k\s+#2 messages_changed\s+\S+\s+statiker/, `the second bust must be #2: ${out}`);
  assert.match(out, /274k\s+#3 messages_changed\s+\S+\s+statiker/, `the third bust must be #3: ${out}`);
});

test("BITE — the SAME project, a DIFFERENT session's solo bust, is a distinguishable row", () => {
  // Mirrors the live e81a9942 case: same project (statiker) as the fixture
  // above but its own session, one bust — must read with no ordinal and
  // must not be confusable with the other session's rows once both are on
  // screen (the verifier's harder disambiguation case).
  const home = tmpDirSync("bt-list-two-");
  const wt = join(home, ".local", "share", "claude-worktime");
  mkdirSync(wt, { recursive: true });
  const sidA = "c08e2235fake", sidB = "e81a9942fake";
  writeFileSync(join(wt, "activity.jsonl"), [
    { s: sidA, t: sec("2026-08-07T04:08:35Z"), cc: 203091, cause: "messages_changed" },
    { s: sidA, t: sec("2026-08-07T04:17:25Z"), cc: 229805, cause: "messages_changed" },
    { s: sidB, t: sec("2026-08-07T01:49:59Z"), cc: 419062, cause: "messages_changed" },
  ].map((r) => JSON.stringify({ type: "cold", k: "hit", gap: 5, ctx: r.cc + 15000, ...r })).join("\n") + "\n");
  fakeProjects(home, sidA, "/home/x/dev/Gunther-Schulz/statiker");
  fakeProjects(home, sidB, "/home/x/dev/Gunther-Schulz/statiker");
  const out = run(home, ["--list"]);
  const rows = out.split("\n").filter((l) => l.includes("statiker"));
  assert.equal(rows.length, 3, `expected all three busts listed: ${out}`);
  const row419 = rows.find((r) => r.includes("419k"));
  assert.ok(row419, `419k row missing: ${out}`);
  assert.doesNotMatch(row419, /#\d/, "the OTHER session's solo bust must render with no ordinal too");
  assert.match(row419, new RegExp(sidB.slice(0, 8)), "and it must carry ITS OWN sid, not the other session's");
});

// --- listHeader still states its own form, now over the DEDUPED count ---

test("listHeader's \"of N\" reflects the de-duplicated population when a caller passes one", () => {
  const collapsed = collapseDuplicateBookings(triple());
  const full = listHeader(collapsed, collapsed.length);
  assert.match(full, /showing 1 of 1/, `three raced bookings must count as one event: ${full}`);
});
