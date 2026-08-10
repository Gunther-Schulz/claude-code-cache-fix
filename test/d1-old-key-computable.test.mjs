// D1 gate 1 — is the OLD conversation key still COMPUTABLE at each stateful
// extension's read point?
//
// WHY THIS FILE EXISTS. `BACKLOG.md`'s "DECISIONS 2026-08-10" GO'd DUAL-READ
// for the row-26 migration: read the new pre-pipeline key, fall back to the
// old rotated key once, always write under the new one. The operator's stated
// rationale is that this satisfies row 3's restart-transparency obligation BY
// CONSTRUCTION — old rotated keys stay readable, so no live session's state
// orphans at the restart.
//
// That rationale was explicitly graded TESTIMONY, not authority: the entry
// records the claim as "from the entry, unverified in the extension source",
// and instructs the implementing session to confirm it against the source
// before building. If the old key is NOT computable at a read point, the
// fallback is unavailable there and the answer reverts to drop-and-re-baseline
// (priced with `restart-exposure --match` at a session boundary). So this is
// the probe that decides D1's design, and it is executed rather than read:
// `docs/dev-loop.md` — reconstructing behaviour from the source is the same
// error one level down, and every claim from modelling this pipeline has been
// wrong while every claim from executing it survived.
//
// SYNTHETIC BY THE RULE, not for convenience. `fresh-session-sort`'s four
// relocatable-block predicates key on LITERAL prefixes (`fresh-session-sort
// .mjs:17-32`), and the harvest scrubber tokenizes those away — measured in
// `e53f873`, where a pin taken minutes before its capture rotated carried the
// structure (33 live vs 33 pinned pairs) and NOT the class (`identityRotations
// = 0` on the pinned replay, cause confirmed by two independent instruments).
// So this class cannot be frozen from a harvested pin at all, and
// `docs/dev-loop.md`'s exit applies: where a class cannot survive the scrub,
// the durable evidence is synthetic, "not merely preferred but the only
// option".
//
// WHAT IT MEASURES, at three cut points derived from the live registry BY NAME
// rather than hardcoded — the numbers 250/395/425 are facts about today's
// `extensions.json` and this file must follow it if they move:
//
//   K_pre  the identity over the body BEFORE fresh-session-sort (order 250).
//          This is the identity D1 proposes to distribute via `ctx.meta`, and
//          the one `fresh-session-sort.mjs:373` already files its OWN memory
//          under — the asymmetry that is row 26's signature.
//   K_ins  the identity where insertion-normalization (395) reads it.
//   K_def  the identity where deferred-tool-rewrite (425) reads it.
//
// The gate-1 question is answered by K_ins and K_def being COMPUTABLE at those
// points at all; the rotation (K_pre != K_ins) is what makes the fixture a
// real instance of the class rather than a vacuous arrangement.

import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadExtensions, runOnRequest } from "../proxy/pipeline.mjs";
import { conversationSubKey } from "../proxy/extensions/message-hash.mjs";
import { resolveInsertionSessionKey } from "../proxy/extensions/insertion-normalization.mjs";
import { tmpDir } from "../tools/tmpdir.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_DIR = join(__dirname, "..", "proxy", "extensions");
const EXT_CONFIG = join(__dirname, "..", "proxy", "extensions.json");

const SR = "<system-reminder>\n";
// Matches `isMcpBlock` (`fresh-session-sort.mjs:30-32`): the predicate is a
// startsWith on this exact prefix. The body text is invented.
const mcpBlock = () => ({
  type: "text",
  text: `${SR}# MCP Server Instructions\n\nSynthetic server instructions for the D1 probe.\n</system-reminder>`,
});

async function withEnv(overrides, fn) {
  const keys = Object.keys(overrides);
  const original = {};
  for (const k of keys) {
    original[k] = process.env[k];
    if (overrides[k] === undefined) delete process.env[k];
    else process.env[k] = String(overrides[k]);
  }
  try {
    return await fn();
  } finally {
    for (const k of keys) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    }
  }
}

const makeCtx = (body) => ({
  body,
  headers: {
    "anthropic-beta": "context-1m-2025-08-07",
    "x-session-id": "synthetic-d1-old-key-probe",
  },
  meta: { route: "messages" },
});

// The row-26 class: a relocatable block arriving at a message index CC chose,
// which is NOT messages[0]. fresh-session-sort strips it and prepends it to
// messages[firstUserIdx], inventing new bytes at index 0.
const bodyWithBlockAwayFromZero = () => ({
  model: "claude-sonnet-5",
  system: "synthetic system prompt for the D1 probe",
  tools: [{ name: "Read", description: "read a file", input_schema: { type: "object", properties: {} } }],
  messages: [
    { role: "user", content: [{ type: "text", text: "turn one" }] },
    { role: "assistant", content: [{ type: "text", text: "reply one" }] },
    { role: "user", content: [mcpBlock(), { type: "text", text: "turn two" }] },
  ],
});

// The NEGATIVE CONTROL, and it is what makes the positive mean "relocation"
// rather than "any mutation": the same block already sitting first in
// messages[0]. The strip-then-prepend round trip restores the identical array,
// so a correct pipeline rotates nothing here.
const bodyWithBlockAtZero = () => ({
  model: "claude-sonnet-5",
  system: "synthetic system prompt for the D1 probe",
  tools: [{ name: "Read", description: "read a file", input_schema: { type: "object", properties: {} } }],
  messages: [
    { role: "user", content: [mcpBlock(), { type: "text", text: "turn one" }] },
    { role: "assistant", content: [{ type: "text", text: "reply one" }] },
    { role: "user", content: [{ type: "text", text: "turn two" }] },
  ],
});

const orderOf = (exts, name) => {
  const e = exts.find((x) => x.name === name);
  assert.ok(e, `${name} must be present in the loaded registry — this probe is about its read point`);
  return e.order;
};

/**
 * Runs the REAL pipeline in segments, reading the conversation identity at each
 * stateful extension's own read point. Returns the three identities plus the
 * full session keys, so a caller can assert both computability and rotation.
 */
async function keysAtReadPoints(body) {
  const scratch = await tmpDir("d1-old-key-probe-");
  return withEnv(
    {
      CACHE_FIX_INSERTION_NORMALIZE: "1",
      CACHE_FIX_TOOL_REWRITE: "1",
      // fresh-session-sort's memory, contained — never the live proxy's state.
      CACHE_FIX_SNAPSHOT_DIR: scratch,
    },
    async () => {
      const exts = await loadExtensions(EXT_DIR, EXT_CONFIG);
      const fssOrder = orderOf(exts, "fresh-session-sort");
      const insOrder = orderOf(exts, "insertion-normalization");
      const defOrder = orderOf(exts, "deferred-tool-rewrite");
      assert.ok(
        fssOrder < insOrder && insOrder < defOrder,
        `the whole class depends on this ordering (relocate at ${fssOrder}, then read at ${insOrder} and ${defOrder})`,
      );

      const ctx = makeCtx(body);
      const read = () => ({
        conv: conversationSubKey(ctx.body.messages),
        session: resolveInsertionSessionKey(ctx.headers, ctx.body.messages, ctx.body.system),
      });

      // Everything strictly below fresh-session-sort: the pre-pipeline identity.
      await runOnRequest(ctx, exts.filter((e) => e.order < fssOrder));
      const pre = read();

      // Up to (not including) insertion-normalization's own order: this is the
      // body as it reaches order 395, relocation included.
      await runOnRequest(ctx, exts.filter((e) => e.order >= fssOrder && e.order < insOrder));
      const ins = read();

      // Up to (not including) deferred-tool-rewrite: insertion-normalization
      // itself has now run, so this is the body as it reaches order 425.
      await runOnRequest(ctx, exts.filter((e) => e.order >= insOrder && e.order < defOrder));
      const def = read();

      return { pre, ins, def, orders: { fssOrder, insOrder, defOrder } };
    },
  );
}

const HEX16 = /^[0-9a-f]{16}$/;

test("D1 gate 1: the fixture really rotates the identity — without this the computability result below is vacuous", async () => {
  const { pre, ins } = await keysAtReadPoints(bodyWithBlockAwayFromZero());
  assert.match(pre.conv, HEX16, "the pre-pipeline identity must be a real conversation sub-key");
  assert.notEqual(
    ins.conv,
    pre.conv,
    "this is threat-matrix row 26: relocating a block into messages[0] rotates the identity every downstream stateful extension keys on. " +
      "If these are equal the synthetic fixture no longer reproduces the class and nothing below this line means anything.",
  );
});

test("D1 gate 1: the negative control does NOT rotate — the positive means relocation, not any mutation", async () => {
  const { pre, ins, def } = await keysAtReadPoints(bodyWithBlockAtZero());
  assert.equal(
    ins.conv,
    pre.conv,
    "a relocatable block already first in messages[0] survives strip-then-prepend unchanged, so nothing rotates; " +
      "a rotation here would mean the probe is detecting some OTHER mutation and the positive above proves less than it claims",
  );
  assert.equal(def.conv, pre.conv, "and it is still unrotated at deferred-tool-rewrite's read point");
});

test("D1 gate 1: the OLD key is COMPUTABLE at both stateful extensions' read points — the dual-read premise", async () => {
  const { pre, ins, def, orders } = await keysAtReadPoints(bodyWithBlockAwayFromZero());

  // The gate-1 answer. `resolveInsertionSessionKey` is the very function both
  // extensions call today, run over the body as it actually reaches each of
  // them — so a well-formed result here IS the old key being available for a
  // fallback read at that point.
  for (const [label, at, order] of [
    ["insertion-normalization", ins, orders.insOrder],
    ["deferred-tool-rewrite", def, orders.defOrder],
  ]) {
    assert.match(at.conv, HEX16, `the old conversation sub-key must be computable at ${label} (order ${order})`);
    assert.ok(
      typeof at.session === "string" && at.session.length > 0,
      `the old full session key must be computable at ${label} (order ${order}) — without it the dual-read fallback has nothing to read`,
    );
    assert.notEqual(
      at.conv,
      pre.conv,
      `${label} must genuinely be reading a ROTATED key today, or it is not a migration consumer at all`,
    );
  }
});

// --- D1 STATE CONTINUITY: the bite that discharges the row-3 declaration -----
//
// The restart D1 needs changes state keys for two extensions, so row 3 says it
// is NOT cache-transparent. Measured 2026-08-10 19:32Z, `restart-exposure
// --window-min 60`: 8 live sessions, ~817k tokens if forwarded bytes change for
// them. Dual-read's claim is that the true figure is ZERO — and that claim is
// falsifiable rather than a pricing argument, which is what this bite is for:
// state written under the OLD rotated key must still be FOUND after the carrier
// change. If it is not, ~817k is the real number.
//
// Red-first arrangement, and it is a MUTATION rather than a revert because the
// condition under test is a new branch: disable the fallback (pass no carrier
// AND read only the new key) and the same arrangement must MISS. The pair is
// what makes it discriminating — a hit alone would also be produced by a
// fixture whose two keys happen to be equal, which is precisely why the
// unrotated case is asserted separately below.

import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import { resolveToolRewriteSessionKey } from "../proxy/extensions/deferred-tool-rewrite.mjs";
import { PRE_PIPELINE_CONV, OLD_KEY_HIT } from "../proxy/extensions/message-hash.mjs";

// The loader's own filename builder (`deferred-tool-rewrite.mjs:205`). Named
// here rather than guessed: the first draft of this bite wrote
// `-deferred-tools.json`, which no loader reads, and it would have reported a
// MISS for a reason that is not the defect — the arrangement failing silently
// instead of the code.
const deferredStateFile = (key) => `${key}-deferred-tool-canon.json`;

/**
 * Runs the real pipeline over the row-26 fixture against a scratch state dir,
 * returning the ctx so a caller can read what the dual-read did.
 */
async function runWithState(scratch) {
  return withEnv(
    {
      CACHE_FIX_INSERTION_NORMALIZE: "1",
      CACHE_FIX_TOOL_REWRITE: "1",
      CACHE_FIX_SNAPSHOT_DIR: scratch,
    },
    async () => {
      const exts = await loadExtensions(EXT_DIR, EXT_CONFIG);
      const ctx = makeCtx(bodyWithBlockAwayFromZero());
      await runOnRequest(ctx, exts);
      return ctx;
    },
  );
}

test("D1 state continuity: a baseline on disk under the OLD rotated key IS found — the row-3 declaration's discharge", async () => {
  const scratch = await tmpDir("d1-continuity-hit-");

  // Derive the OLD (rotated) key the way the pipeline will, by running once
  // against an empty dir and reading the carrier the run published. Deriving it
  // from the extension's own resolver rather than restating the hash keeps this
  // from being a second implementation of the identity.
  const probe = await runWithState(await tmpDir("d1-continuity-derive-"));
  const preConv = probe.meta?.[PRE_PIPELINE_CONV];
  assert.match(String(preConv), HEX16, "the carrier must be published by fresh-session-sort");
  const rotatedBody = probe.body; // post-pipeline: messages[0] carries the relocated block
  const oldKey = resolveToolRewriteSessionKey(probe.headers, rotatedBody);
  const newKey = resolveToolRewriteSessionKey(probe.headers, rotatedBody, preConv);
  assert.notEqual(oldKey, newKey, "arrangement: the rotated and pre-pipeline keys must differ, or there is nothing to bridge");

  // Plant a baseline under the OLD key only — exactly the on-disk state a live
  // conversation carries into the restart that ships D1.
  await mkdir(scratch, { recursive: true });
  await writeFile(
    join(scratch, deferredStateFile(oldKey)),
    JSON.stringify({ tools: [{ name: "Read", description: "d", input_schema: { type: "object", properties: {} } }], additions: [] }),
  );

  const ctx = await runWithState(scratch);
  assert.equal(
    ctx.meta?.[OLD_KEY_HIT],
    true,
    "the dual-read must FALL BACK to the rotated key and find the planted baseline; without this the D1 restart re-baselines every live conversation and the ~817k figure is real",
  );

  // The RETIREMENT COUNTER is itself an instrument, so it is proven rather than
  // assumed. The trigger is "the event logs show zero old-key hits over a
  // window", and a flag that never reaches a log makes that condition
  // unobservable while reading as though it had been checked — the absence
  // would be indistinguishable from a genuine zero, which is precisely the
  // shape that discharges bridges early.
  const events = await readdir(scratch);
  const eventFiles = events.filter((n) => n.endsWith("-deferred-tool-events.jsonl"));
  assert.ok(eventFiles.length > 0, "the extension must have written an event log at all");
  const logged = await readFile(join(scratch, eventFiles[0]), "utf-8");
  assert.match(
    logged,
    /"oldKeyFallback":true/,
    `the fallback must be COUNTED in the persisted event log, not only on ctx.meta, or the retirement trigger cannot be evaluated: ${logged.slice(0, 400)}`,
  );
});

// The SECOND consumer, and it gets its own bite rather than riding the first.
// Both extensions set the same `OLD_KEY_HIT` flag, so a single planted file
// cannot tell which one found it — the bite above plants only a
// deferred-tool-canon and therefore measures only that consumer. This repo's
// own history is the argument: `conversationSubKey` lives in message-hash.mjs
// precisely because insertion-normalization got a keying fix and
// deferred-tool-rewrite "had the same key and did not get the fix"
// (deferred-tool-rewrite.mjs:275-279). A shared idea with one tested consumer
// is one tested consumer.
const insertionStateFile = (key) => `${key}-insertion-canon.json`;

test("D1 state continuity: insertion-normalization's OWN fallback finds its old-key canonical too", async () => {
  const scratch = await tmpDir("d1-continuity-insertion-");

  const probe = await runWithState(await tmpDir("d1-continuity-ins-derive-"));
  const preConv = probe.meta?.[PRE_PIPELINE_CONV];
  assert.match(String(preConv), HEX16, "the carrier must be published");
  const oldKey = resolveInsertionSessionKey(probe.headers, probe.body.messages, probe.body.system);
  const newKey = resolveInsertionSessionKey(probe.headers, probe.body.messages, probe.body.system, preConv);
  assert.notEqual(oldKey, newKey, "arrangement: insertion's two keys must differ");

  await mkdir(scratch, { recursive: true });
  // loadCanonical requires an `entries` array AND a matching `mode`; a wrong
  // mode returns null, which would read as "the fallback failed" when in fact
  // the fixture was unloadable. Plain mode, since CACHE_FIX_VOLATILE_PIN is unset.
  await writeFile(
    join(scratch, insertionStateFile(oldKey)),
    JSON.stringify({ mode: "plain", entries: [{ hash: "synthetic-entry", role: "user" }] }),
  );

  const ctx = await runWithState(scratch);
  assert.equal(
    ctx.meta?.[OLD_KEY_HIT],
    true,
    "insertion-normalization must fall back to its own rotated key; nothing here plants a deferred-tool canonical, so only its own fallback can set this",
  );
});

test("D1 state continuity: with nothing planted the fallback does NOT report a hit — the discriminating half", async () => {
  const scratch = await tmpDir("d1-continuity-miss-");
  await mkdir(scratch, { recursive: true });
  const ctx = await runWithState(scratch);
  // Same arrangement, one variable removed. A hit here would mean the flag
  // tracks "the fallback was attempted" rather than "the old state was found",
  // which would make the bite above unfalsifiable.
  assert.notEqual(
    ctx.meta?.[OLD_KEY_HIT],
    true,
    "an empty state dir has no old-key state to find, so the fallback must report no hit",
  );
});

test("D1 gate 1: both read points rotate to the SAME key — one fallback value serves both consumers", async () => {
  const { ins, def } = await keysAtReadPoints(bodyWithBlockAwayFromZero());
  // Load-bearing for the SHAPE of the fallback. If these ever differ, "the old
  // key" is not one value and each extension needs its own fallback computed at
  // its own read point — a design difference, not a detail. Pinned either way
  // so the next change to the 395..425 window cannot move it silently.
  assert.equal(
    ins.conv,
    def.conv,
    "no extension ordered between the two read points mutates messages[0], so both consumers rotate to one identity; " +
      "if this fails, the dual-read fallback must be computed per-extension rather than shared",
  );
});
