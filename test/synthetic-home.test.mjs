// synthetic-home — the shared builder (BACKLOG.md, "the synthetic-HOME
// pattern is the only way to drive this repo's CLIs, and it is currently
// re-invented per test"). Unit tests for the builder itself; the RED-FIRST
// proof that it actually drives real CLIs correctly is in the two re-pointed
// files (test/bust-triage-at-substitution.test.mjs,
// test/bust-triage-idle-ttl.test.mjs — see their own headers for the
// before/after comparison).

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSyntheticHome } from "../tools/synthetic-home.mjs";

test("BITE — a component-free home ({}) is valid and empty", () => {
  const home = buildSyntheticHome();
  assert.ok(existsSync(home));
  assert.equal(existsSync(join(home, ".local")), false, "nothing was named, so nothing was written");
});

test("BITE — ledger rows land at the real worktime-ledger path, one JSON line each", () => {
  const home = buildSyntheticHome({ ledger: [{ type: "cold", k: "hit", t: 1 }, { type: "cold", k: "hit", t: 2 }] });
  const p = join(home, ".local", "share", "claude-worktime", "activity.jsonl");
  const lines = readFileSync(p, "utf8").trim().split("\n");
  assert.equal(lines.length, 2);
  assert.deepEqual(JSON.parse(lines[0]), { type: "cold", k: "hit", t: 1 });
});

test("BITE — a pre-built STRING ledger row is written verbatim, for a bite needing malformed bytes", () => {
  const home = buildSyntheticHome({ ledger: ["not even json"] });
  const p = join(home, ".local", "share", "claude-worktime", "activity.jsonl");
  assert.equal(readFileSync(p, "utf8"), "not even json\n");
});

test("BITE — gateStatus lands at the real gate-live DEFAULT_STATUS path", () => {
  const home = buildSyntheticHome({ gateStatus: { ok: true, gates: ["FOO=1"] } });
  const p = join(home, ".local", "state", "cache-fix", "gate-status.json");
  assert.deepEqual(JSON.parse(readFileSync(p, "utf8")), { ok: true, gates: ["FOO=1"] });
});

test("BITE — each capture lands at s-<sid>-requests.jsonl under the real XDG captures dir", () => {
  const home = buildSyntheticHome({
    captures: [
      { sid: "AAA", lines: [{ type: "request", body: {} }] },
      { sid: "BBB", lines: [{ type: "request", body: {} }, { type: "outcome" }] },
    ],
  });
  const dir = join(home, ".local", "share", "cache-fix", "captures");
  assert.ok(existsSync(join(dir, "s-AAA-requests.jsonl")));
  const bbb = readFileSync(join(dir, "s-BBB-requests.jsonl"), "utf8").trim().split("\n");
  assert.equal(bbb.length, 2);
});

test("BITE — aliases land at the real capture-aliases.json path", () => {
  const home = buildSyntheticHome({ aliases: { "s-captureAA": { sid: "aaa" } } });
  const p = join(home, ".local", "share", "cache-fix", "capture-aliases.json");
  assert.deepEqual(JSON.parse(readFileSync(p, "utf8")), { "s-captureAA": { sid: "aaa" } });
});

// --- FAIL LOUD ON EMPTY — the "0/0 reads like clean" guard ------------------

test("RED-FIRST — a NAMED but EMPTY ledger throws rather than silently writing nothing", () => {
  assert.throws(() => buildSyntheticHome({ ledger: [] }), /"ledger" was named but carries no data/);
});

test("RED-FIRST — a NAMED but EMPTY gateStatus throws", () => {
  assert.throws(() => buildSyntheticHome({ gateStatus: {} }), /"gateStatus" was named but carries no data/);
});

test("RED-FIRST — a NAMED but EMPTY captures array throws", () => {
  assert.throws(() => buildSyntheticHome({ captures: [] }), /"captures" was named but carries no data/);
});

test("RED-FIRST — a capture entry with an EMPTY lines array throws (the hazard one level down)", () => {
  assert.throws(
    () => buildSyntheticHome({ captures: [{ sid: "AAA", lines: [] }] }),
    /captures\[sid=AAA\]\.lines" was named but carries no data/,
  );
});

test("RED-FIRST — a NAMED but EMPTY aliases object throws", () => {
  assert.throws(() => buildSyntheticHome({ aliases: {} }), /"aliases" was named but carries no data/);
});

test("BITE — every component together, all at their real paths simultaneously", () => {
  const home = buildSyntheticHome({
    ledger: [{ type: "cold", k: "hit", t: 1 }],
    gateStatus: { ok: true },
    captures: [{ sid: "AAA", lines: [{ type: "request" }] }],
    aliases: { "s-captureAA": {} },
  });
  assert.ok(existsSync(join(home, ".local", "share", "claude-worktime", "activity.jsonl")));
  assert.ok(existsSync(join(home, ".local", "state", "cache-fix", "gate-status.json")));
  assert.ok(existsSync(join(home, ".local", "share", "cache-fix", "captures", "s-AAA-requests.jsonl")));
  assert.ok(existsSync(join(home, ".local", "share", "cache-fix", "capture-aliases.json")));
});
