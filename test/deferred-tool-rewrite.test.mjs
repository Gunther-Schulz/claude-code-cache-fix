import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ext, {
  resolveToolRewriteSessionKey,
  toolFingerprint,
  classifyToolChange,
  buildToolAdditionBlock,
  addBetaToken,
} from "../proxy/extensions/deferred-tool-rewrite.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, "fixtures", "toolload-1247.json");
const GC_FIXTURE_PATH = join(__dirname, "fixtures", "toolgc-1536.json");

async function newTmp() {
  return mkdtemp(join(tmpdir(), "deferred-tool-rewrite-test-"));
}

function withEnv(overrides, fn) {
  const saved = {};
  for (const k of Object.keys(overrides)) {
    saved[k] = process.env[k];
    if (overrides[k] === undefined) delete process.env[k];
    else process.env[k] = overrides[k];
  }
  try {
    return fn();
  } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

async function withEnvAsync(overrides, fn) {
  const saved = {};
  for (const k of Object.keys(overrides)) {
    saved[k] = process.env[k];
    if (overrides[k] === undefined) delete process.env[k];
    else process.env[k] = overrides[k];
  }
  try {
    return await fn();
  } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

async function runExt(body, { headers, dir } = {}) {
  const savedHome = process.env.CLAUDE_CONFIG_DIR;
  if (dir) process.env.CLAUDE_CONFIG_DIR = dir;
  try {
    const ctx = { body, meta: {}, headers: headers || {} };
    await ext.onRequest(ctx);
    return ctx;
  } finally {
    if (dir) {
      if (savedHome === undefined) delete process.env.CLAUDE_CONFIG_DIR;
      else process.env.CLAUDE_CONFIG_DIR = savedHome;
    }
  }
}

function tool(name, extra = {}) {
  return { name, input_schema: { type: "object", properties: {} }, ...extra };
}

// =============================================================================
// GATE OFF = INERT
// =============================================================================

test("gate off (CACHE_FIX_TOOL_REWRITE unset) — onRequest is a no-op", async () => {
  const dir = await newTmp();
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: undefined }, async () => {
      const body = { tools: [tool("Read"), tool("Bash")], messages: [] };
      const ctx = await runExt(body, { dir });
      assert.equal(ctx.meta.deferredToolRewriteStats, undefined);
      assert.deepEqual(ctx.body.tools, [tool("Read"), tool("Bash")]);
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// =============================================================================
// PURE CLASSIFIER
// =============================================================================

test("classifyToolChange: no prior baseline → action no-baseline, knownTools = incoming", () => {
  const incoming = [tool("Read"), tool("Bash")];
  const result = classifyToolChange(incoming, null);
  assert.equal(result.action, "no-baseline");
  assert.deepEqual(result.knownTools, incoming);
});

test("classifyToolChange: identical tools[] → action unchanged", () => {
  const prior = [tool("Read"), tool("Bash")];
  const incoming = [tool("Read"), tool("Bash")];
  const result = classifyToolChange(incoming, prior);
  assert.equal(result.action, "unchanged");
});

test("classifyToolChange: pure addition (SendMessage added) → action rewrite, new tool marked defer_loading:true", () => {
  const prior = [tool("Read"), tool("Bash")];
  const incoming = [tool("Read"), tool("Bash"), tool("SendMessage")];
  const result = classifyToolChange(incoming, prior);
  assert.equal(result.action, "rewrite");
  assert.deepEqual(result.newNames, ["SendMessage"]);
  assert.equal(result.tools.length, 3);
  assert.equal(result.tools[0].name, "Read");
  assert.equal(result.tools[0].defer_loading, undefined, "existing tools are not marked defer_loading");
  assert.equal(result.tools[2].name, "SendMessage");
  assert.equal(result.tools[2].defer_loading, true);
  assert.equal(result.systemAdditions.length, 1);
});

test("classifyToolChange: existing tool removed → action rewrite, held in place at its first-seen position, byte-identical", () => {
  const prior = [tool("Read"), tool("Bash")];
  const incoming = [tool("Read")]; // Bash missing — harness GC'd it
  const result = classifyToolChange(incoming, prior);
  assert.equal(result.action, "rewrite");
  assert.deepEqual(result.heldNames, ["Bash"]);
  assert.equal(result.newNames.length, 0);
  assert.equal(result.tools.length, 2, "held tool is re-inserted");
  assert.deepEqual(result.tools[0], tool("Read"));
  assert.deepEqual(result.tools[1], tool("Bash"), "held tool is byte-identical to its known form");
  assert.equal(result.systemAdditions.length, 0, "a hold announces nothing — only additions do");
});

test("classifyToolChange: pure reorder (no add/remove) → action rewrite, output pinned to first-seen order", () => {
  const prior = [tool("Read"), tool("Bash"), tool("SendMessage")];
  const incoming = [tool("SendMessage"), tool("Read"), tool("Bash")]; // reordered, nothing added/removed
  const result = classifyToolChange(incoming, prior);
  assert.equal(result.action, "rewrite");
  assert.deepEqual(result.heldNames, []);
  assert.deepEqual(result.newNames, []);
  assert.deepEqual(
    result.tools.map((t) => t.name),
    ["Read", "Bash", "SendMessage"],
    "output order is first-seen order, not the incoming array's order",
  );
});

test("classifyToolChange: existing tool's schema changed → action reset, reason tool-schema-changed", () => {
  const prior = [tool("Read", { input_schema: { type: "object", properties: { file_path: { type: "string" } } } })];
  const incoming = [tool("Read", { input_schema: { type: "object", properties: { path: { type: "string" } } } })];
  const result = classifyToolChange(incoming, prior);
  assert.equal(result.action, "reset");
  assert.equal(result.reason, "tool-schema-changed");
});

test("classifyToolChange: addition AND removal in the same request → composes (held removal + additive new tool), still rewrite", () => {
  const prior = [tool("Read"), tool("Bash")];
  const incoming = [tool("Read"), tool("SendMessage")]; // Bash removed, SendMessage added
  const result = classifyToolChange(incoming, prior);
  assert.equal(result.action, "rewrite");
  assert.deepEqual(result.heldNames, ["Bash"]);
  assert.deepEqual(result.newNames, ["SendMessage"]);
  assert.deepEqual(
    result.tools.map((t) => t.name),
    ["Read", "Bash", "SendMessage"],
    "held tool re-inserted at its first-seen position, new tool appended",
  );
  assert.equal(result.tools[2].defer_loading, true);
});

test("classifyToolChange: a tool carrying OUR OWN defer_loading marker from a prior rewrite is not misread as schema-changed", () => {
  // Simulates: prior known set was captured AFTER a rewrite had already
  // marked a tool defer_loading:true; toolFingerprint must ignore that
  // marker so re-comparing it against itself is still "unchanged".
  const priorWithMarker = [tool("Read"), { ...tool("SendMessage"), defer_loading: true }];
  const incoming = [tool("Read"), tool("SendMessage")]; // no marker this time — still the same tool
  const result = classifyToolChange(incoming, priorWithMarker);
  assert.equal(result.action, "unchanged");
});

test("toolFingerprint: order-independent on schema property keys", () => {
  const a = tool("Read", { input_schema: { type: "object", properties: { a: {}, b: {} } } });
  const b = tool("Read", { input_schema: { type: "object", properties: { b: {}, a: {} } } });
  assert.equal(toolFingerprint(a), toolFingerprint(b));
});

test("toolFingerprint: missing tool or missing name → null", () => {
  assert.equal(toolFingerprint(null), null);
  assert.equal(toolFingerprint({}), null);
});

// =============================================================================
// WIRE SHAPES
// =============================================================================

test("buildToolAdditionBlock: text block carrying the tool's name/description/schema", () => {
  const block = buildToolAdditionBlock(tool("SendMessage", { description: "send a message" }));
  assert.equal(block.type, "text");
  assert.match(block.text, /SendMessage/);
  assert.match(block.text, /send a message/);
});

test("addBetaToken: adds the token when header absent", () => {
  const headers = {};
  addBetaToken(headers);
  assert.equal(headers["anthropic-beta"], "mid-conversation-tool-changes-2026-07-01");
});

test("addBetaToken: appends to an existing anthropic-beta header without duplicating", () => {
  const headers = { "anthropic-beta": "other-beta-2026-01-01" };
  addBetaToken(headers);
  assert.equal(headers["anthropic-beta"], "other-beta-2026-01-01, mid-conversation-tool-changes-2026-07-01");
  addBetaToken(headers); // idempotent
  assert.equal(headers["anthropic-beta"], "other-beta-2026-01-01, mid-conversation-tool-changes-2026-07-01");
});

test("addBetaToken: case-insensitive header key lookup (Anthropic-Beta)", () => {
  const headers = { "Anthropic-Beta": "x" };
  addBetaToken(headers);
  assert.equal(headers["Anthropic-Beta"], "x, mid-conversation-tool-changes-2026-07-01");
  assert.equal(headers["anthropic-beta"], undefined, "must mutate the existing key, not add a duplicate");
});

// =============================================================================
// EXTENSION CONTRACT — full onRequest round trip
// =============================================================================

test("onRequest: first request (no prior state) → tools forwarded unchanged, baseline persisted", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-first" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const body = { tools: [tool("Read"), tool("Bash")], system: [{ type: "text", text: "sys" }], messages: [] };
      const ctx = await runExt(body, { headers, dir });
      assert.equal(ctx.meta.deferredToolRewriteStats.action, "no-baseline");
      assert.deepEqual(ctx.body.tools, [tool("Read"), tool("Bash")]);
      assert.equal(ctx.body.system.length, 1, "no tool_addition appended on the baseline-establishing request");
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("onRequest: second request adds SendMessage → tools[] byte-stable for known tools + defer_loading on the new one + tool_addition system block + beta header", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-add" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const body1 = { tools: [tool("Read"), tool("Bash")], system: [{ type: "text", text: "sys" }], messages: [] };
      await runExt(body1, { headers, dir });

      const body2 = {
        tools: [tool("Read"), tool("Bash"), tool("SendMessage")],
        system: [{ type: "text", text: "sys" }],
        messages: [],
      };
      const ctx2 = await runExt(body2, { headers, dir });

      assert.equal(ctx2.meta.deferredToolRewriteStats.action, "rewrite");
      assert.deepEqual(ctx2.meta.deferredToolRewriteStats.newNames, ["SendMessage"]);

      // Known tools byte-stable (no defer_loading marker added to them).
      assert.deepEqual(ctx2.body.tools[0], tool("Read"));
      assert.deepEqual(ctx2.body.tools[1], tool("Bash"));
      // New tool additively marked.
      assert.equal(ctx2.body.tools[2].name, "SendMessage");
      assert.equal(ctx2.body.tools[2].defer_loading, true);

      // System gained exactly one tool_addition block at the tail.
      assert.equal(ctx2.body.system.length, 2);
      assert.match(ctx2.body.system[1].text, /SendMessage/);

      // Beta header added.
      assert.equal(headers["anthropic-beta"], "mid-conversation-tool-changes-2026-07-01");
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("onRequest: third request with no further tool changes → unchanged, no additional system block", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-stable" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const body1 = { tools: [tool("Read"), tool("Bash")], system: [{ type: "text", text: "sys" }], messages: [] };
      await runExt(body1, { headers, dir });

      const body2 = {
        tools: [tool("Read"), tool("Bash"), tool("SendMessage")],
        system: [{ type: "text", text: "sys" }],
        messages: [],
      };
      await runExt(body2, { headers, dir });

      const body3 = {
        tools: [tool("Read"), tool("Bash"), tool("SendMessage")],
        system: [{ type: "text", text: "sys" }],
        messages: [],
      };
      const ctx3 = await runExt(body3, { headers, dir });

      assert.equal(ctx3.meta.deferredToolRewriteStats.action, "unchanged");
      assert.equal(ctx3.body.system.length, 1, "no additional tool_addition block on an unchanged request");
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("onRequest: a tool removed after an addition → HELD (rewrite, passthrough of held tool), no beta header (nothing new to defer)", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-hold" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const body1 = { tools: [tool("Read"), tool("Bash")], system: [{ type: "text", text: "sys" }], messages: [] };
      await runExt(body1, { headers, dir });

      const body2 = { tools: [tool("Read")], system: [{ type: "text", text: "sys" }], messages: [] };
      const ctx2 = await runExt(body2, { headers, dir });

      assert.equal(ctx2.meta.deferredToolRewriteStats.action, "rewrite");
      assert.deepEqual(ctx2.meta.deferredToolRewriteStats.heldNames, ["Bash"]);
      assert.deepEqual(ctx2.body.tools, [tool("Read"), tool("Bash")], "Bash held in place, byte-identical");
      assert.equal(ctx2.body.system.length, 1, "a hold announces nothing — no tool_addition block appended");
      assert.equal(headers["anthropic-beta"], undefined, "no defer_loading tool this turn -> no beta token needed");
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("onRequest: a known tool's SCHEMA changing (not removal) → still resets (honest content change, never served stale)", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-schema-reset" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const body1 = { tools: [tool("Read"), tool("Bash")], system: [{ type: "text", text: "sys" }], messages: [] };
      await runExt(body1, { headers, dir });

      const body2 = {
        tools: [tool("Read", { input_schema: { type: "object", properties: { path: { type: "string" } } } }), tool("Bash")],
        system: [{ type: "text", text: "sys" }],
        messages: [],
      };
      const ctx2 = await runExt(body2, { headers, dir });

      assert.equal(ctx2.meta.deferredToolRewriteStats.action, "reset");
      assert.equal(ctx2.meta.deferredToolRewriteStats.reason, "tool-schema-changed");
      assert.equal(headers["anthropic-beta"], undefined);
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("onRequest: state persists across a simulated restart (fresh dynamic import) via disk", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-restart" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const body1 = { tools: [tool("Read"), tool("Bash")], system: [{ type: "text", text: "sys" }], messages: [] };
      await runExt(body1, { headers, dir });

      // Simulate restart: fresh module import, empty in-memory state — the
      // classifier must reload the persisted baseline from disk.
      const { pathToFileURL } = await import("node:url");
      const modPath = join(__dirname, "..", "proxy", "extensions", "deferred-tool-rewrite.mjs");
      const reloaded = await import(pathToFileURL(modPath).href + "?restart-probe=" + Date.now());

      const savedHome = process.env.CLAUDE_CONFIG_DIR;
      process.env.CLAUDE_CONFIG_DIR = dir;
      try {
        const body2 = {
          tools: [tool("Read"), tool("Bash"), tool("SendMessage")],
          system: [{ type: "text", text: "sys" }],
          messages: [],
        };
        const ctx2 = { body: body2, meta: {}, headers };
        await reloaded.default.onRequest(ctx2);
        assert.equal(ctx2.meta.deferredToolRewriteStats.action, "rewrite", "post-restart module reloaded baseline from disk");
        assert.deepEqual(ctx2.meta.deferredToolRewriteStats.newNames, ["SendMessage"]);
      } finally {
        if (savedHome === undefined) delete process.env.CLAUDE_CONFIG_DIR;
        else process.env.CLAUDE_CONFIG_DIR = savedHome;
      }
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// =============================================================================
// SYNTHETIC FIXTURE (ledger SHAPE, 2026-07-27 12:47:56 — tools[SendMessage:added])
// =============================================================================

test("fixture toolload-1247.json: prior → incoming reproduces the ledger's tools[SendMessage:added] shape as a rewrite", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-fixture" };
  try {
    const raw = await readFile(FIXTURE_PATH, "utf-8");
    const fixture = JSON.parse(raw);

    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const ctx1 = await runExt(structuredClone(fixture.prior), { headers, dir });
      assert.equal(ctx1.meta.deferredToolRewriteStats.action, "no-baseline");

      const ctx2 = await runExt(structuredClone(fixture.incoming), { headers, dir });
      assert.equal(ctx2.meta.deferredToolRewriteStats.action, "rewrite");
      assert.deepEqual(ctx2.meta.deferredToolRewriteStats.newNames, ["SendMessage"]);

      // Known tools (Read, Bash) byte-identical to the fixture's prior entries.
      assert.deepEqual(ctx2.body.tools[0], fixture.prior.tools[0]);
      assert.deepEqual(ctx2.body.tools[1], fixture.prior.tools[1]);
      // New tool present, additively marked.
      const sendMsgTool = ctx2.body.tools.find((t) => t.name === "SendMessage");
      assert.ok(sendMsgTool);
      assert.equal(sendMsgTool.defer_loading, true);
      // tools[] count did not shrink or reorder the known prefix.
      assert.equal(ctx2.body.tools.length, 3);
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// =============================================================================
// SYNTHETIC FIXTURE (ledger SHAPE, 2026-07-27 15:36 — tools:REMOVE + reorder,
// threat-matrix row 13)
// =============================================================================

test("fixture toolgc-1536.json: CronCreate removed + DeferredToolPlaceholder reordered -> held in place, first-seen order pinned", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-gc-fixture" };
  try {
    const raw = await readFile(GC_FIXTURE_PATH, "utf-8");
    const fixture = JSON.parse(raw);

    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const ctx1 = await runExt(structuredClone(fixture.prior), { headers, dir });
      assert.equal(ctx1.meta.deferredToolRewriteStats.action, "no-baseline");

      const ctx2 = await runExt(structuredClone(fixture.incoming), { headers, dir });
      assert.equal(ctx2.meta.deferredToolRewriteStats.action, "rewrite");
      assert.deepEqual(ctx2.meta.deferredToolRewriteStats.heldNames, ["CronCreate"]);
      assert.deepEqual(ctx2.meta.deferredToolRewriteStats.newNames, []);

      // Output order is first-seen order from the baseline request, not the
      // incoming (reordered, CronCreate-missing) array's order.
      assert.deepEqual(
        ctx2.body.tools.map((t) => t.name),
        ["Read", "Bash", "CronCreate", "DeferredToolPlaceholder"],
      );
      // Held tool is byte-identical to its baseline form.
      assert.deepEqual(
        ctx2.body.tools.find((t) => t.name === "CronCreate"),
        fixture.prior.tools.find((t) => t.name === "CronCreate"),
      );
      // No addition -> no tool_addition block, no beta header.
      assert.equal(ctx2.body.system.length, 1);
      assert.equal(headers["anthropic-beta"], undefined);
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// =============================================================================
// SESSION KEY RESOLUTION
// =============================================================================

test("resolveToolRewriteSessionKey: prefers session-id header, falls back to model string", () => {
  const withHeader = resolveToolRewriteSessionKey({ "x-claude-code-session-id": "abc-123" }, { model: "x" });
  assert.equal(withHeader, "s-abc-123");
  const withoutHeader = resolveToolRewriteSessionKey(null, { model: "claude-sonnet-4-6" });
  assert.equal(withoutHeader, "c-claude-sonnet-4-6");
});
