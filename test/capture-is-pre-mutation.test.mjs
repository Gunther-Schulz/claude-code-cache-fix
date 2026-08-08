// capture-is-pre-mutation — pins the premise every OURS / CC's attribution
// verdict in this repo rests on: request-capture (order 60) runs before any
// body-mutating extension, so a divergence visible in the raw capture was
// sent by Claude Code, never by us. Until this file, that premise was
// guarded by nothing but a code comment in output-guard-stash.mjs ("Order
// 55: before the first body-mutating extension (cc-version-normalize, 90)")
// — no test pinned it, so an extension added or reordered below order 60
// that touches body.messages would flip every future verdict from "CC's" to
// possibly-ours with NO alarm (BACKLOG.md, "READY — the premise EVERY
// attribution verdict rests on...").
//
// This is deliberately a RUNTIME check, not a static one: a grep for
// body-mutation idioms returns zero for the three sub-60 extensions AND
// zero for two KNOWN mutators (sort-stabilization, identity-normalization)
// — pattern search cannot answer "does X mutate Y" here.
//
// Three bites:
//   (a) REAL-REGISTRY BITE — run the actual loaded extensions ordered below
//       request-capture over a realistic fixture body; structurally hash
//       body.messages; assert it equals the hash of the unmutated input.
//   (b) RED-FIRST — a synthetic extension at order 50 that mutates
//       body.messages must make (a) fail. A real mechanism disable against
//       real input, not a module-load red.
//   (c) OVER-FIRING CONTROL — a synthetic extension at order 100 (i.e.
//       after request-capture) that mutates just as hard must NOT make (a)
//       fail. Without this, (a) passing is indistinguishable from "nothing
//       anywhere ever mutates" (false, and unprovable otherwise).
//
// The pre-capture slice is derived from the loaded registry's own `order`
// values every run (`splitAtCapture`), never hardcoded to today's three
// sub-60 extension names — so a future extension landing below order 60
// is automatically exercised by (a) without this file changing.

import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { rm } from "node:fs/promises";

import { loadExtensions, runOnRequest } from "../proxy/pipeline.mjs";
import { canonicalStringify } from "../proxy/extensions/signature-surface-hash.mjs";
import { tmpDir } from "../tools/tmpdir.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_DIR = join(__dirname, "..", "proxy", "extensions");
const EXT_CONFIG = join(__dirname, "..", "proxy", "extensions.json");

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

// Structural hash over body.messages. Reuses the repo's own canonical
// stringify (signature-surface-hash.mjs: recursive key sort at every
// nesting level, array order preserved) so the check is insensitive to
// object key-insertion order and sensitive only to actual structural or
// content change — the same canonicalization rule the repo already uses
// for its other content-identity hash.
function hashMessages(messages) {
  return createHash("sha256").update(canonicalStringify(messages)).digest("hex");
}

// A realistic /v1/messages body — system prompt with cache_control, a real
// tool schema, and a full user -> assistant(thinking + tool_use) ->
// user(tool_result) -> assistant turn. This is not incidental detail: the
// pre-60 extensions branch on exactly these shapes (output-guard-stash
// checks Array.isArray(body.messages); upstream-change-detection
// fingerprints system block types, tool names/schema shapes, and message
// block types/sizes). A fixture thin enough that every extension no-ops
// (e.g. a single bare-string user turn) would make bite (a) pass vacuously
// — see the closing report for how this was checked.
function buildFixtureBody() {
  return {
    model: "claude-opus-5",
    max_tokens: 8192,
    system: [
      {
        type: "text",
        text: "You are Claude Code, Anthropic's official CLI for Claude.",
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        name: "Bash",
        description: "Run a shell command",
        input_schema: {
          type: "object",
          properties: {
            command: { type: "string" },
            description: { type: "string" },
          },
          required: ["command"],
        },
      },
      {
        name: "Read",
        description: "Read a file from the filesystem",
        input_schema: {
          type: "object",
          properties: { file_path: { type: "string" } },
          required: ["file_path"],
        },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "List the files under /tmp/synthetic-fixture and read the first one.",
          },
        ],
      },
      {
        role: "assistant",
        content: [
          {
            type: "thinking",
            thinking: "I should list the directory first.",
            signature: "synthetic-sig-0001",
          },
          { type: "text", text: "I'll list the directory." },
          {
            type: "tool_use",
            id: "toolu_capture_pre_mutation_synthetic_1",
            name: "Bash",
            input: { command: "ls /tmp/synthetic-fixture", description: "List files" },
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "toolu_capture_pre_mutation_synthetic_1",
            content: [{ type: "text", text: "alpha.txt\nbeta.txt" }],
          },
        ],
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "alpha.txt and beta.txt are present." }],
      },
    ],
  };
}

function makeCtx(body) {
  return {
    body,
    headers: {
      "anthropic-beta": "context-1m-2025-08-07",
      "x-session-id": "synthetic-capture-pre-mutation-test",
    },
    meta: { route: "messages" },
  };
}

// Splits a loaded (or loaded+synthetic) extension list at request-capture's
// own `order` — never a hardcoded list of "the sub-60 extensions". This is
// what makes the bite generalize: it does not need to know which extension
// mutates, only where request-capture sits relative to everything else.
function splitAtCapture(extensions) {
  const rc = extensions.find((e) => e.name === "request-capture");
  assert.ok(rc, "request-capture must be present in the loaded registry");
  const before = extensions.filter((e) => e.order < rc.order);
  const atOrAfter = extensions.filter((e) => e.order >= rc.order);
  return { rcOrder: rc.order, before, atOrAfter };
}

test("capture-is-pre-mutation: request-capture's own loaded order is 60", async () => {
  const exts = await loadExtensions(EXT_DIR, EXT_CONFIG);
  const rc = exts.find((e) => e.name === "request-capture");
  assert.ok(rc, "request-capture must load from the real extensions.json");
  assert.equal(rc.order, 60, "the number this whole design pins — output-guard-stash.mjs's header comment and BACKLOG.md both cite it");
});

test("(a) REAL-REGISTRY BITE: body.messages is unmutated by every real extension ordered below request-capture", async () => {
  let scratchDir;
  try {
    scratchDir = await tmpDir("capture-pre-mutation-");
    await withEnv(
      {
        // Engage the two pre-60 extensions that are gated OFF by default, so
        // the fixture is exercised for real instead of short-circuiting on
        // an env check before ever looking at the body.
        CACHE_FIX_OUTPUT_GUARD: "1",
        CACHE_FIX_UPSTREAM_DETECTION: "1",
        // Contains upstream-change-detection's baseline/event writes inside
        // a scratch dir — never the live proxy's real XDG state.
        CACHE_FIX_UPSTREAM_DIR: scratchDir,
        // Left deliberately UNSET: CACHE_FIX_REQUEST_CAPTURE (never touch
        // the live proxy's capture directory — request-capture is never
        // invoked by this bite anyway, see below) and
        // CACHE_FIX_BOOTSTRAP_MODE (bootstrap-defense is route-gated away
        // from "messages" regardless of its mode).
      },
      async () => {
        const exts = await loadExtensions(EXT_DIR, EXT_CONFIG);
        const { before } = splitAtCapture(exts);
        assert.ok(
          before.length >= 2,
          "at least bootstrap-defense and output-guard-stash must be in the pre-capture slice"
        );

        const body = buildFixtureBody();
        const baselineHash = hashMessages(body.messages);

        const ctx = makeCtx(body);
        // Only the pre-capture slice runs — this bite never invokes
        // request-capture itself (which would need CACHE_FIX_REQUEST_CAPTURE
        // and write to the real capture directory); it hashes at the exact
        // instant request-capture's onRequest would run, which is precisely
        // "after every extension ordered below it has run".
        await runOnRequest(ctx, before);

        const afterHash = hashMessages(ctx.body.messages);
        assert.equal(
          afterHash,
          baselineHash,
          "no extension ordered below request-capture (60) may mutate body.messages"
        );
      }
    );
  } finally {
    if (scratchDir) await rm(scratchDir, { recursive: true, force: true });
  }
});

test("(b) RED-FIRST: a synthetic extension at order 50 that mutates body.messages makes the bite fail", async () => {
  const exts = await loadExtensions(EXT_DIR, EXT_CONFIG);
  const syntheticMutator = {
    name: "test-synthetic-mutator-order-50",
    order: 50,
    async onRequest(ctx) {
      ctx.body.messages.push({
        role: "user",
        content: [{ type: "text", text: "INJECTED-BY-TEST-SYNTHETIC-MUTATOR" }],
      });
    },
  };
  const combined = [...exts, syntheticMutator];
  const { before } = splitAtCapture(combined);
  assert.ok(
    before.some((e) => e.name === "test-synthetic-mutator-order-50"),
    "the synthetic order-50 mutator must land in the pre-capture slice"
  );

  const body = buildFixtureBody();
  const baselineHash = hashMessages(body.messages);

  const ctx = makeCtx(body);
  await runOnRequest(ctx, before);

  const afterHash = hashMessages(ctx.body.messages);
  assert.notEqual(
    afterHash,
    baselineHash,
    "a real mechanism disable (order-50 mutator actually run through runOnRequest) must be observable as a hash mismatch — this is not a module-load red"
  );
});

test("(c) OVER-FIRING CONTROL: a synthetic extension at order 100 that mutates just as hard does NOT trip the bite", async () => {
  const exts = await loadExtensions(EXT_DIR, EXT_CONFIG);
  const syntheticMutator = {
    name: "test-synthetic-mutator-order-100",
    order: 100,
    async onRequest(ctx) {
      ctx.body.messages.push({
        role: "user",
        content: [{ type: "text", text: "INJECTED-BY-TEST-SYNTHETIC-MUTATOR-POST-CAPTURE" }],
      });
    },
  };
  const combined = [...exts, syntheticMutator];
  const { before, atOrAfter, rcOrder } = splitAtCapture(combined);
  assert.ok(
    !before.some((e) => e.name === "test-synthetic-mutator-order-100"),
    `the synthetic order-100 mutator must NOT land in the pre-capture slice (order 100 > request-capture's order ${rcOrder})`
  );
  assert.ok(
    atOrAfter.some((e) => e.name === "test-synthetic-mutator-order-100"),
    "the synthetic order-100 mutator must be present in the registry, at-or-after request-capture — this control is about SCOPE, not absence"
  );

  const body = buildFixtureBody();
  const baselineHash = hashMessages(body.messages);
  const ctx = makeCtx(body);

  // Bite (a)'s own check: only the pre-capture slice runs before the hash
  // the attribution premise depends on is taken.
  await runOnRequest(ctx, before);
  const preCaptureHash = hashMessages(ctx.body.messages);
  assert.equal(
    preCaptureHash,
    baselineHash,
    "the pre-capture bite must NOT fire on a mutation that happens at or after request-capture's order"
  );

  // Positive proof the synthetic mutator is a real, functioning mutator —
  // not silently excluded for some unrelated reason. Without this, a green
  // bite (a) here would be indistinguishable from "nothing anywhere ever
  // mutates", which is false and would make the whole check unprovable.
  await runOnRequest(ctx, [syntheticMutator]);
  const postCaptureHash = hashMessages(ctx.body.messages);
  assert.notEqual(
    postCaptureHash,
    baselineHash,
    "the order-100 synthetic mutator must actually mutate when run — proves this is a real over-firing control, not a vacuous exclusion"
  );
});

// (d) THE TIE IS FORBIDDEN, not resolved. `splitAtCapture` divides on
// `order < rc.order`, so an extension registered at EXACTLY 60 lands in
// `atOrAfter` and is never exercised by (a) — while the pipeline's real
// execution order between it and request-capture is whatever the sort
// happens to do, which no contract fixes. That is the same silent,
// wrong-direction failure this file exists to prevent, one order value
// further along: such an extension could mutate before the capture and
// every verdict would still read "CC's".
//
// Found at the desk by probing the boundary after the bites above were
// green: a synthetic mutator at 59 is caught by (b); moved to 60 it is
// not, and (b) goes red for the wrong reason.
//
// The repair is to make the ambiguous state unreachable rather than to
// define a tie-break — a tie-break would still leave the capture's
// position resting on sort stability. Nothing legitimate needs order 60;
// it belongs to request-capture.
test("capture-is-pre-mutation: no other extension shares request-capture's order", async () => {
  const exts = await loadExtensions(EXT_DIR, EXT_CONFIG);
  const rc = exts.find((e) => e.name === "request-capture");
  assert.ok(rc, "request-capture must be present in the loaded registry");
  const collisions = exts
    .filter((e) => e.name !== "request-capture" && e.order === rc.order)
    .map((e) => `${e.name} (order ${e.order})`);
  assert.deepEqual(
    collisions,
    [],
    `order ${rc.order} is request-capture's alone — a tie makes the capture's ` +
      `position depend on sort stability, and the pre-capture bite above ` +
      `does not cover the tied extension. Give it a different order.`
  );
});
