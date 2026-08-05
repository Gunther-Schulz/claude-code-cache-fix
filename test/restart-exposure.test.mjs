// restart-exposure's bite. The tool exists because a restart cost 655,021
// tokens while satisfying the row-3 rule as written, and its own first live
// run then understated the very session it was built to warn about — so the
// record-selection is what this pins hardest.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { lastRecord, contextChars, scanLive } from "../tools/restart-exposure.mjs";

const req = (msgs) => ({ ts: "2026-08-05T12:00:00.000Z", key: "k", body: {
  model: "m", system: [{ type: "text", text: "sys" }], tools: [],
  messages: Array.from({ length: msgs }, (_, i) => ({ role: "user", content: `m${i}` })) } });

test("the last REQUEST record is chosen, not the last record of any kind", () => {
  // The defect this pins, found on the first live run: a capture interleaves
  // boot and outcome records, neither carrying a body. Taking the last record
  // of any kind reported "? msgs, ~0k" for the 800k session the tool exists
  // to warn about — an instrument understating its own known positive.
  const chunk = [
    JSON.stringify(req(3)),
    JSON.stringify({ type: "outcome", id: "x", usage: { cacheRead: 1 } }),
  ].join("\n");
  const rec = lastRecord(chunk);
  assert.ok(rec, "an outcome tail must not hide the request behind it");
  assert.equal(rec.body.messages.length, 3);
});

test("a boot record does not stand in for a request either", () => {
  const chunk = [JSON.stringify(req(2)), JSON.stringify({ type: "boot", gates: {} })].join("\n");
  assert.equal(lastRecord(chunk).body.messages.length, 2);
});

test("a truncated leading line is skipped, not treated as a parse failure", () => {
  const chunk = `{"body":{"mess` + "\n" + JSON.stringify(req(1));
  assert.equal(lastRecord(chunk).body.messages.length, 1);
});

test("context size counts system, tools and messages", () => {
  const n = contextChars(req(5));
  assert.ok(n > 0);
  assert.equal(contextChars({ body: null }), 0, "an outcome record contributes nothing");
});

test("only captures touched inside the window count as live", () => {
  const dir = mkdtempSync(join(tmpdir(), "restart-exp-"));
  try {
    const now = Date.now();
    const fresh = join(dir, "s-fresh-requests.jsonl");
    const stale = join(dir, "s-stale-requests.jsonl");
    writeFileSync(fresh, JSON.stringify(req(9)) + "\n");
    writeFileSync(stale, JSON.stringify(req(9)) + "\n");
    const old = (now - 6 * 3600_000) / 1000;
    utimesSync(stale, old, old);

    const r = scanLive(dir, { windowMin: 30, now });
    assert.deepEqual(r.rows.map((x) => x.capture), ["s-fresh-requests.jsonl"],
      "a session nobody is using cannot be re-billed by a restart");
    assert.equal(r.rows[0].messages, 9);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("--match narrows to sessions whose recent traffic carries the affected class", () => {
  // The half that turns a worst case into a decision: today's change affected
  // messages quoting one marker, and exactly one live session contained it.
  const dir = mkdtempSync(join(tmpdir(), "restart-exp-m-"));
  try {
    const hit = req(4);
    hit.body.messages.push({ role: "assistant", content: "quoting SENTINEL-MARKER here" });
    writeFileSync(join(dir, "s-hit-requests.jsonl"), JSON.stringify(hit) + "\n");
    writeFileSync(join(dir, "s-miss-requests.jsonl"), JSON.stringify(req(4)) + "\n");

    const all = scanLive(dir, { windowMin: 30 });
    assert.equal(all.rows.length, 2, "unfiltered is the worst case: every live session");

    const narrowed = scanLive(dir, { windowMin: 30, match: /SENTINEL-MARKER/ });
    assert.deepEqual(narrowed.rows.map((x) => x.capture), ["s-hit-requests.jsonl"]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
