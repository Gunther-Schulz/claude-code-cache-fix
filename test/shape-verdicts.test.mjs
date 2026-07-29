// shape-verdicts — the fork's own judgment over its shape/baseline telemetry.
//
// These cases are ported from the dotfiles doctor's selftests, where this
// judgment briefly lived: the port is the proof that moving the logic across
// repos changed nothing about what fires and what stays quiet. The deployment
// side now only invokes the CLI and books the verdicts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { shapeWatchVerdict, baselineStepVerdict, computeVerdicts } from "../tools/shape-verdicts.mjs";

const shape = (over = {}) => ({ pairs: 300, thinkingDropPairs: 2, thinkingTextCompleted: 0, ...over });
const ledger = (s) => ({ keys: { "s-a": { shape: s } } });

test("shape-watch: could-not-verify is warn with the inability named, never green", () => {
  assert.equal(shapeWatchVerdict(null).level, "warn");
  assert.match(shapeWatchVerdict(null).message, /NOT currently watched/);
  assert.equal(shapeWatchVerdict({ keys: {} }).level, "warn");
  assert.match(shapeWatchVerdict({ keys: { "s-a": { requests: 5 } } }).message, /run harvest/);
});

test("shape-watch: dormant classes read ok with the counts on display", () => {
  const v = shapeWatchVerdict(ledger(shape()));
  assert.equal(v.level, "ok");
  assert.match(v.message, /2\/300/);
});

test("BITE — reappeared completed-turn thinking warns with count and CC#69568", () => {
  const v = shapeWatchVerdict(ledger(shape({ pairs: 10, thinkingTextCompleted: 7 })));
  assert.equal(v.level, "warn");
  assert.match(v.message, /69568/);
  assert.match(v.message, /7 blocks/);
});

test("BITE — drop rate over 5% warns on a real sample; the same rate on a tiny sample is noise", () => {
  assert.equal(shapeWatchVerdict(ledger(shape({ pairs: 100, thinkingDropPairs: 9 }))).level, "warn");
  assert.equal(shapeWatchVerdict(ledger(shape({ pairs: 10, thinkingDropPairs: 1 }))).level, "ok");
});

test("baseline: three answers — missing working ledger warns, missing committed state is a named ok", () => {
  assert.equal(baselineStepVerdict(null, null).level, "warn");
  const base = ledger(shape({ systemBytes: 20000, toolsBytes: 40000 }));
  assert.equal(baselineStepVerdict(null, base).level, "ok");
  assert.match(baselineStepVerdict(null, base).message, /no committed comparison/);
  assert.equal(baselineStepVerdict(base, base).level, "ok");
});

test("BITE — the +94% class fires with numbers; shrinkage and floor stay quiet", () => {
  const base = ledger(shape({ systemBytes: 20000, toolsBytes: 40000 }));
  const grown = ledger(shape({ systemBytes: 38800, toolsBytes: 40000 }));
  const v = baselineStepVerdict(base, grown);
  assert.equal(v.level, "warn");
  assert.match(v.message, /20000->38800/);
  assert.match(v.message, /committing the ledger acknowledges/);
  assert.equal(baselineStepVerdict(base, ledger(shape({ systemBytes: 9000, toolsBytes: 40000 }))).level, "ok");
  assert.equal(
    baselineStepVerdict(ledger(shape({ systemBytes: 100 })), ledger(shape({ systemBytes: 400 }))).level,
    "ok",
  );
});

test("computeVerdicts: a missing ledger file yields both verdicts as honest warns, exit path intact", async () => {
  const dir = await mkdtemp(join(tmpdir(), "shape-verdicts-"));
  try {
    const verdicts = await computeVerdicts(join(dir, "no-such-ledger.json"));
    assert.equal(verdicts.length, 3);
    assert.ok(verdicts.every((v) => v.level === "warn" || v.name === "baseline"));
    assert.equal(verdicts[0].level, "warn", "shape-watch cannot read as green without a ledger");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("BITE — a stalled harvest timer cannot print dormant forever: frozen numbers warn", async () => {
  const { HARVEST_MAX_AGE_H } = await import("../tools/shape-verdicts.mjs");
  const old = { keys: { "s-a": { lastHarvest: "2026-07-01T00:00:00Z", shape: shape() } } };
  const now = Date.parse("2026-07-29T00:00:00Z");
  const v = shapeWatchVerdict(old, now);
  assert.equal(v.level, "warn");
  assert.match(v.message, /frozen/);
  const fresh = { keys: { "s-a": { lastHarvest: new Date(now - 3600_000).toISOString(), shape: shape() } } };
  assert.equal(shapeWatchVerdict(fresh, now).level, "ok", `within ${HARVEST_MAX_AGE_H}h stays ok`);
});

test("retention: a NEW expired capture warns until the ledger commit acknowledges it", async () => {
  const { retentionVerdict } = await import("../tools/shape-verdicts.mjs");
  assert.equal(retentionVerdict(null, null).level, "warn");
  const committed = { keys: { "s-old": { gone: true }, "s-b": {} } };
  const sameGone = { keys: { "s-old": { gone: true }, "s-b": {} } };
  assert.equal(retentionVerdict(committed, sameGone).level, "ok", "already-acknowledged gone stays quiet");
  const newGone = { keys: { "s-old": { gone: true }, "s-b": { gone: true } } };
  const v = retentionVerdict(committed, newGone);
  assert.equal(v.level, "warn");
  assert.match(v.message, /s-b/);
  assert.match(v.message, /CAPTURE_MAX_MB/);
});
