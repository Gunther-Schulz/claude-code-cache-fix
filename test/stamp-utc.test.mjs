// The bust-triage -> dossier round trip is UTC at both ends.
//
// dev-loop.md documents the chain: `bust-triage --list` to find the event,
// `dossier <stamp>` to collect its evidence. The two ends disagreed about what
// a timestamp means. `--list` printed UTC with no marker; `dossier` handed a
// zone-less stamp to `Date.parse`, which applies the LOCAL zone. On this
// machine (CEST) that addressed a window two hours from the event, and the
// dossier reported 1/5 evidence classes PRESENT with four "ABSENT" lines each
// stating a plausible, wrong reason — a wrong answer that looks exactly like a
// right one, which is the shape worth a regression test.
//
// The bite is the ROUND TRIP, not either end in isolation: fixing one end
// while the other drifts reintroduces the same silent offset.

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseStampUTC } from "../tools/dossier.mjs";
import { listRows } from "../tools/bust-triage.mjs";

const EPOCH = 1785921003; // 2026-08-05T09:10:03Z — the 349k bust

test("a stamp with no zone designator is read as UTC, not as local time", () => {
  assert.equal(new Date(parseStampUTC("2026-08-05T09:10:03")).toISOString(),
    "2026-08-05T09:10:03.000Z");
  assert.equal(new Date(parseStampUTC("2026-08-05 09:10:03")).toISOString(),
    "2026-08-05T09:10:03.000Z",
    "the space-separated form is what bust-triage prints");
});

test("an explicit zone is honoured rather than overridden", () => {
  assert.equal(new Date(parseStampUTC("2026-08-05T09:10:03Z")).toISOString(),
    "2026-08-05T09:10:03.000Z");
  assert.equal(new Date(parseStampUTC("2026-08-05T09:10:03+02:00")).toISOString(),
    "2026-08-05T07:10:03.000Z",
    "reading everything as UTC regardless would be the same bug in mirror");
});

test("a date-only stamp stays valid — appending Z to it would not be", () => {
  assert.equal(new Date(parseStampUTC("2026-08-05")).toISOString(),
    "2026-08-05T00:00:00.000Z");
});

test("bust-triage marks its rows UTC", () => {
  const [row] = listRows([{ t: EPOCH, cc: 349004, cause: "messages_changed", s: "0600c21f-x", cls: "bust" }]);
  assert.match(row, /2026-08-05 09:10:03Z/,
    "an unmarked row reads as local time to every reader and to the next tool");
});

test("THE ROUND TRIP: the stamp bust-triage prints addresses the event it printed", () => {
  const [row] = listRows([{ t: EPOCH, cc: 349004, cause: "messages_changed", s: "0600c21f-x", cls: "bust" }]);
  // Exactly what a reader does: copy the timestamp field out of the row.
  const stamp = row.trim().split(/\s{2,}/)[0];
  const parsed = Math.floor(parseStampUTC(stamp) / 1000);
  assert.equal(parsed, EPOCH,
    `round trip drifted by ${parsed - EPOCH}s — the offset is this machine's ` +
    `UTC offset, and it silently moves dossier's ±90s window off the event`);
});
