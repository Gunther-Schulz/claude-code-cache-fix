// An idle-gap TTL expiry must not be filed as a row-4 container migration.
//
// The incident, measured 2026-08-06 23:59:10Z (s-captureAL, the walk that
// minted matrix row 27): ledger `gap` 22,702 s against `"ttl":"1h"` on that
// session's own wire, transcript `previous_message_not_found`, and a
// surviving read of 2 tokens (`ctx` 215,875 - `cc` 215,873). The cached entry
// had expired five hours before the request existed. `bust-triage` never
// looked: `classToRow` saw census `replace/edit`, returned 4, and the verdict
// inflated row 4's evidence with an instance row 4 did not produce. The
// pair's real container migration at host 104 is a true statement that is
// not the cause.
//
// WHERE THE EXPECTATIONS COME FROM — matrix row 27's own definition
// ("IDLE-GAP TTL EXPIRY — a conversation sits longer than the cache TTL and
// the next request re-bills the whole prefix"), not from this guard's code.
// Two things follow from that sentence and neither is tuned:
//   * the gap must exceed the TTL **in force**, which is a fact on the
//     request's own wire (`cache_control.ttl`) — a hardcoded 3600 would be
//     the remembered-number error, and the 5m-TTL bite below is what proves
//     the number is read rather than assumed;
//   * an expiry removes the entry WHOLE, so the surviving read (`ctx` - `cc`)
//     is zero up to accounting rounding. `mtok` is deliberately NOT used: it
//     defaults to 0 whenever the transcript diagnostic was not read, and the
//     2026-08-06 17:39 event is booked three times with `mtok` 0, 0 and
//     182,728 — one event, three values.
//
// THE THREE LIVE SIDES, with their real ledger numbers, reproduced below as
// synthetic captures so they survive capture rotation (the closing gate's
// question 2 — these stamps' captures expire; the numbers do not):
//   23:59:10Z  gap 22,702  ctx 215,875  cc 215,873  read      2 -> row 27
//   18:08:32Z  gap      7  ctx 315,821  cc 300,597  read 15,224 -> row 4
//   01:00:55Z  gap     15  ctx 375,646  cc 335,933  read 39,713 -> neither
// The third is GROWTH: its surviving read exactly equalled its predecessor's
// write, i.e. every cached token was reused. A guard that folds it in with
// the idle case has learned "large `cc`" instead of "prefix lost".
//
// RED-FIRST ARRANGEMENT (the strong form: NEW expectations against the OLD
// implementation). These CLI cases were run against the tool as it stood
// before the guard existed. Recorded output for the idle case:
//     VERDICT: KNOWN-OPEN
//     matrix row 4 (OPEN): **OPEN — RE-OPENED 2026-07-31** …
// The two other sides passed there unchanged, which is the point of having
// them: a guard that reclassifies all three is worse than none.
//
// The verdict asserted for the idle side is the POST-enum value
// CONTROLLED-CAUSE (row 27's cell led with `ACCEPT` until 2026-08-07 solely
// to stay readable). Asserting today's KNOWN-OPEN would pin the workaround.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSyntheticHome } from "../tools/synthetic-home.mjs";

import { ttlSeconds, wireTtlSeconds, idleExpiry } from "../tools/bust-triage.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "bust-triage.mjs");
const sec = (iso) => Math.floor(Date.parse(iso) / 1000);

const msg = (role, text) => ({ role, content: [{ type: "text", text }] });

/**
 * A capture pair for one synthetic session. `pad` makes the record line
 * exceed the ledger's `ctx`, which is `capturePairResult`'s own size floor
 * (no tokenizer emits a token from fewer than one byte); it rides
 * `messages[0]`, which is also the conversation key, so it is byte-identical
 * across the pair and invisible to the census.
 */
function captureLines({ ctx, ttl, edited, beforeTs, afterTs }) {
  const pad = "x".repeat(ctx + 2000);
  const head = msg("user", `HEAD ${pad}`);
  const system = [
    { type: "text", text: "you are a helpful assistant" },
    { type: "text", text: "tools follow", cache_control: { type: "ephemeral", ttl } },
  ];
  const before = [head, msg("assistant", "B"), msg("user", "C")];
  const after = edited
    ? [head, msg("assistant", "B-EDITED"), msg("user", "C")]   // -> replace/edit
    : [head, msg("assistant", "B"), msg("user", "C"), msg("assistant", "D")]; // -> append-only
  return [
    JSON.stringify({ ts: beforeTs, type: "request", body: { system, messages: before } }),
    JSON.stringify({ ts: afterTs, type: "request", body: { system, messages: after } }),
  ].join("\n") + "\n";
}

// RE-POINTED at the shared synthetic-HOME builder (BACKLOG.md, "the
// synthetic-HOME pattern is the only way to drive this repo's CLIs, and it
// is currently re-invented per test"). This file's own hand-rolled
// fakeHome() used to write captures at the LEGACY `.claude/cache-fix-captures`
// path, which `bust-triage.mjs` only reached via its one-transition
// `legacyReadPath` fallback (a `CacheFixLegacyPathWarning` fired on every
// run here, proof the fallback was doing real work). The shared builder
// writes to the XDG path directly — the location a migrated machine
// actually has — which is also production's PREFERRED path, so this both
// modernizes the fixture and removes a warning that was never the point of
// the test. Verified by this file's own suite staying green with identical
// verdicts (see the closing report for the before/after transcript).
/** A HOME carrying one cold-hit record and the capture pair behind it. */
function fakeHome({ at, sid, gap, ctx, cc, cause, ttl = "1h", edited = true }) {
  const afterTs = new Date((sec(at) - 5) * 1000).toISOString();
  const beforeTs = new Date((sec(at) - 5 - gap) * 1000).toISOString();
  return buildSyntheticHome({
    ledger: [{ type: "cold", k: "hit", t: sec(at), s: sid, gap, ctx, cc, cause }],
    captures: [{
      sid,
      lines: captureLines({ ctx, ttl, edited, beforeTs, afterTs }).trimEnd().split("\n"),
    }],
  });
}

const run = (home, args) => execFileSync(process.execPath, [TOOL, ...args],
  { cwd: REPO, env: { ...process.env, HOME: home }, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });

// --- THE three live sides, by their real numbers ---

test("BITE — the idle side: a gap past the TTL with nothing left reads as row 27", () => {
  const home = fakeHome({ at: "2026-08-06T23:59:10Z", sid: "SIDLE001",
                          gap: 22702, ctx: 215875, cc: 215873, cause: "idle" });
  const out = run(home, ["--at", "2026-08-06T23:59:10Z"]);
  assert.match(out, /matrix row 27\b/,
    `an expired entry was filed against another row:\n${out}`);
  assert.doesNotMatch(out, /matrix row 4\b/,
    "row 4's evidence must not be inflated with an instance it did not produce");
  assert.match(out, /VERDICT: CONTROLLED-CAUSE/,
    "row 27 is a controlled cause, and the enum now has the word for it");
  // The guard states its own arithmetic, so a reader can check it rather than
  // trust it — the numbers it quotes are the ones it decided on.
  assert.match(out, /idle-ttl/, "the step that decided this must be visible");
  assert.match(out, /22,?702/, "the gap it tested");
  assert.match(out, /3600|1h/, "against the TTL it read off the wire");
});

test("CONTROL — the row-4 side: a sub-minute gap with a real remainder still reads row 4", () => {
  const home = fakeHome({ at: "2026-08-06T18:08:32Z", sid: "SROW4001",
                          gap: 7, ctx: 315821, cc: 300597, cause: "messages_changed" });
  const out = run(home, ["--at", "2026-08-06T18:08:32Z"]);
  assert.match(out, /matrix row 4\b/, `the standing control moved:\n${out}`);
  assert.doesNotMatch(out, /matrix row 27\b/,
    "a guard that reclassifies this one too is worse than no guard");
  assert.match(out, /VERDICT: KNOWN-OPEN/);
});

test("CONTROL — the GROWTH side: a healthy read is neither row", () => {
  const home = fakeHome({ at: "2026-08-07T01:00:55Z", sid: "SGROWTH1",
                          gap: 15, ctx: 375646, cc: 335933, cause: "other", edited: false });
  const out = run(home, ["--at", "2026-08-07T01:00:55Z"]);
  assert.doesNotMatch(out, /matrix row 27\b/,
    "39,713 tokens survived — the prefix was grown into, not lost");
  assert.doesNotMatch(out, /matrix row 4\b/, "and no message was replaced either");
  assert.match(out, /VERDICT: UNCLASSIFIED/,
    "the ❄ detector firing on `cc` alone is a separate, booked defect — this guard must not paper over it");
});

// --- the TTL is READ, not assumed ---
//
// The pair that proves it: identical gap, identical tokens, different wire.
// A hardcoded 3600 gives the same answer to both and fails the first.

test("BITE — a 10-minute gap on a 5m wire IS an expiry", () => {
  const home = fakeHome({ at: "2026-08-06T12:00:00Z", sid: "STTL5M01",
                          gap: 600, ctx: 200000, cc: 199998, cause: "idle", ttl: "5m" });
  const out = run(home, ["--at", "2026-08-06T12:00:00Z"]);
  assert.match(out, /matrix row 27\b/,
    `a 600 s gap exceeds the 300 s TTL this session declared:\n${out}`);
});

test("CONTROL — the same 10-minute gap on a 1h wire is NOT an expiry", () => {
  const home = fakeHome({ at: "2026-08-06T12:00:00Z", sid: "STTL1H01",
                          gap: 600, ctx: 200000, cc: 199998, cause: "idle", ttl: "1h" });
  const out = run(home, ["--at", "2026-08-06T12:00:00Z"]);
  assert.doesNotMatch(out, /matrix row 27\b/,
    `600 s is well inside a 1h TTL — the entry was there:\n${out}`);
});

// --- the decision core, and the cases no live event supplies ---

test("ttlSeconds parses the wire's own vocabulary and refuses everything else", () => {
  assert.equal(ttlSeconds("1h"), 3600);
  assert.equal(ttlSeconds("5m"), 300);
  assert.equal(ttlSeconds("90s"), 90);
  assert.equal(ttlSeconds("2h"), 7200);
  for (const junk of [null, undefined, "", "1", "h", "1 hour", "forever", "-1h", "1d"]) {
    assert.equal(ttlSeconds(junk), null, `guessed at ${JSON.stringify(junk)}`);
  }
});

test("wireTtlSeconds takes the LONGEST declared TTL, and null when none is declared", () => {
  const withTtl = (ttls) => ({
    before: { body: { system: ttls.map((t) => ({ type: "text", text: "s", cache_control: { type: "ephemeral", ttl: t } })), messages: [] } },
    after: { body: { system: [], messages: [] } },
  });
  assert.equal(wireTtlSeconds(withTtl(["5m", "1h"])), 3600,
    "claiming expiry against the SHORTEST would over-fire; the longest is the conservative read");
  assert.equal(wireTtlSeconds(withTtl(["5m"])), 300);
  assert.equal(wireTtlSeconds(withTtl([])), null, "no ttl on the wire is not a default of 3600");
  // cache_control nested on message content, which is where CC puts the
  // moving breakpoint — the same wire, a different site.
  const onMessage = {
    before: { body: { messages: [{ role: "user", content: [{ type: "text", text: "x", cache_control: { type: "ephemeral", ttl: "1h" } }] }] } },
    after: { body: { messages: [] } },
  };
  assert.equal(wireTtlSeconds(onMessage), 3600, "a breakpoint on a message declares the TTL too");
});

// CONSTRUCTED, not observed — stated as such. No live event on this machine
// has a gap past the TTL together with a real surviving read, so the case
// that separates the two conditions has to be built. Its expectation is
// row 27's definition: an expiry removes the entry whole, so a remainder of
// system+tools size proves the entry WAS there and something else lost it.
test("BITE — a long gap with a real surviving read is NOT an expiry (constructed)", () => {
  const bust = { gap: 22702, ctx: 315821, cc: 300597 };            // read 15,224
  const pair = { before: { body: { system: [{ cache_control: { ttl: "1h" } }], messages: [] } },
                 after: { body: { messages: [] } } };
  const r = idleExpiry(bust, pair);
  assert.notEqual(r.code, "fired",
    "15,224 tokens survived a supposedly expired entry — both conditions are load-bearing");
  assert.equal(r.code, "read-survived");
});

test("BITE — nothing surviving but a gap INSIDE the TTL is NOT an expiry (constructed)", () => {
  const bust = { gap: 40, ctx: 215875, cc: 215873 };
  const pair = { before: { body: { system: [{ cache_control: { ttl: "1h" } }], messages: [] } },
                 after: { body: { messages: [] } } };
  const r = idleExpiry(bust, pair);
  assert.notEqual(r.code, "fired",
    "a total loss 40 s after the last request is a bust, not an expiry — a compaction reads like this");
  assert.equal(r.code, "not-idle");
});

// The third answer, at the guard's own level: a step that could not run says
// so instead of quietly declining to fire (dev-loop, "A checker has THREE
// answers, not two").
test("BITE — a guard that could not run reports why, and never as a silent pass", () => {
  const noTtl = idleExpiry({ gap: 22702, ctx: 215875, cc: 215873 },
    { before: { body: { messages: [] } }, after: { body: { messages: [] } } });
  assert.equal(noTtl.code, "no-ttl");
  assert.match(noTtl.detail, /ttl/i);
  const noGap = idleExpiry({ ctx: 215875, cc: 215873 },
    { before: { body: { system: [{ cache_control: { ttl: "1h" } }], messages: [] } },
      after: { body: { messages: [] } } });
  assert.equal(noGap.code, "no-gap");
  const noTokens = idleExpiry({ gap: 22702 },
    { before: { body: { system: [{ cache_control: { ttl: "1h" } }], messages: [] } },
      after: { body: { messages: [] } } });
  assert.equal(noTokens.code, "no-tokens");
  for (const r of [noTtl, noGap, noTokens]) {
    assert.notEqual(r.code, "fired");
    assert.ok(r.detail && r.detail.length > 10, "a could-not-run must name what was missing");
  }
});
