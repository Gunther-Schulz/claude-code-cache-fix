// Every human-facing stamp emits BOTH zones (BACKLOG, 2026-08-07): the tools
// stay UTC, but a human reads a wall clock — dev-loop.md, "Timestamps are
// UTC, at both ends of the chain". This pins three things: the shared
// renderer itself against the documented incident pair, that the sites this
// sweep touched actually carry both zones, and — the over-firing control —
// that the machine-read fields those same sites read from were NOT touched
// (a fix that converts everything passes the first check and fails this
// one).

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { localClock, localSuffix, withLocal } from "../tools/local-stamp.mjs";
import { listRows, fallbackNote } from "../tools/bust-triage.mjs";
import { tmpDirSync } from "../tools/tmpdir.mjs";
import { scanLive } from "../tools/restart-exposure.mjs";

// --- localClock/localSuffix/withLocal: the renderer itself -----------------

// Portable across machines and CI: independently recomputes the expected
// wall-clock string from `getTimezoneOffset()` rather than assuming any
// particular zone, so it is a real check of the rendering rule (UTC instant
// + this machine's own offset -> HH:MM) and not a tautology restating
// `getHours()`.
test("localClock renders the instant shifted by THIS machine's actual UTC offset", () => {
  const t = Date.parse("2026-08-07T04:08:35Z");
  const offsetMin = -new Date(t).getTimezoneOffset(); // minutes EAST of UTC
  const shifted = new Date(t + offsetMin * 60_000);
  const expected = `${String(shifted.getUTCHours()).padStart(2, "0")}:` +
    `${String(shifted.getUTCMinutes()).padStart(2, "0")} local`;
  assert.equal(localClock(t), expected);
});

// The documented incident pair itself (dev-loop.md, "Timestamps are UTC, at
// both ends of the chain"): `04:08:35Z` was `06:08` locally on the CEST
// machine the incident happened on. Runs only where that holds, so it is not
// flaky elsewhere — the portable test above is what always runs.
const CEST = -new Date(Date.parse("2026-08-07T04:08:35Z")).getTimezoneOffset() === 120;
test("BITE (known instant) — 04:08:35Z reads as 06:08 local, the exact incident pair",
  { skip: !CEST && "this machine is not on the CEST offset the incident was measured on" },
  () => {
    assert.equal(localClock(Date.parse("2026-08-07T04:08:35Z")), "06:08 local");
    assert.equal(localSuffix(Date.parse("2026-08-07T04:08:35Z")), "(06:08 local)");
  });

test("withLocal pairs the UTC text with the local suffix, UTC first and unmodified", () => {
  const t = Date.parse("2026-08-07T04:08:35Z");
  const paired = withLocal("2026-08-07T04:08:35Z", t);
  assert.ok(paired.startsWith("2026-08-07T04:08:35Z "),
    "the UTC token must stay first and byte-identical — it is what a reader copies");
  assert.equal(paired, `2026-08-07T04:08:35Z ${localSuffix(t)}`);
});

// --- BITE: a human line carries both zones (bust-triage --list) -----------

const EPOCH = 1785921003; // 2026-08-05T09:10:03Z

test("BITE — a --list row carries both zones, local as its own field", () => {
  const [row] = listRows([{ t: EPOCH, cc: 349004, cause: "messages_changed", s: "0600c21f-x", cls: "bust" }]);
  assert.match(row, /2026-08-05 09:10:03Z/, "the UTC stamp must still be there");
  assert.match(row, /\(\d{2}:\d{2} local\)/, `no local rendering found: ${row}`);
});

// The OVER-FIRING CONTROL for the row above: without it, a fix that glued
// the local suffix onto `fmt(e.t)` itself (instead of giving it its own
// column) would pass the "carries both zones" bite while silently breaking
// the documented copy-paste path — this is the exact regression
// test/stamp-utc.test.mjs's round-trip test already guards, extended here to
// state the reason inline.
test("CONTROL — the copy-paste field (first token, 2+-space split) is still the bare UTC stamp", () => {
  const [row] = listRows([{ t: EPOCH, cc: 349004, cause: "messages_changed", s: "0600c21f-x", cls: "bust" }]);
  const stamp = row.trim().split(/\s{2,}/)[0];
  assert.equal(stamp, "2026-08-05 09:10:03Z",
    `the local suffix must not attach to the pasteable field: got "${stamp}"`);
});

test("BITE — fallbackNote's CONTROLLED and BUST lines both carry local", () => {
  const events = [
    { t: EPOCH, s: "S1", cc: 55000, cause: "compact", cls: "controlled" },
    { t: EPOCH - 100, s: "S1", cc: 40000, cause: "messages_changed", cls: "bust" },
  ];
  const [head, fallback] = fallbackNote(events);
  assert.match(head, /\(\d{2}:\d{2} local\)/, `NOTE line missing local: ${head}`);
  assert.match(fallback, /\(\d{2}:\d{2} local\)/, `fallback line missing local: ${fallback}`);
});

// --- CONTROL: machine-read fields were NOT touched --------------------------

test("CONTROL — restart-exposure's scanLive machine field (lastActivity) stays bare ISO", () => {
  const dir = tmpDirSync("local-stamp-control-");
  try {
    const req = { ts: "2026-08-05T12:00:00.000Z", key: "k", body: {
      model: "m", system: [], tools: [], messages: [{ role: "user", content: "hi" }] } };
    writeFileSync(join(dir, "s-x-requests.jsonl"), JSON.stringify(req) + "\n");
    const { rows } = scanLive(dir, { windowMin: 30 });
    assert.equal(rows.length, 1);
    assert.doesNotMatch(rows[0].lastActivity, /local/,
      "a --json consumer reads this field; a local suffix here is a parsing hazard, not a fix");
    assert.match(rows[0].lastActivity, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      "must stay a bare ISO instant");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
