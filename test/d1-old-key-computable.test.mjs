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
