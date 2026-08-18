import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ext, {
  resolveToolRewriteSessionKey,
  supportsToolAddition,
  toolFingerprint,
  classifyToolChange,
  buildToolAdditionMessage,
  injectAdditions,
  forwardedTools,
  anchorHash,
  addBetaToken,
} from "../proxy/extensions/deferred-tool-rewrite.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, "fixtures", "toolload-1247.json");
const GC_FIXTURE_PATH = join(__dirname, "fixtures", "toolgc-1536.json");

async function newTmp() {
  return tmpDir("deferred-tool-rewrite-test-");
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

// The announcement path is gated on MODEL support (see supportsToolAddition):
// a body without a model is "unknown", which is deliberately OFF. Most tests
// here predate that gate and exercise the announcement, so they default to a
// supported model; the tests that care about the gate set `model` explicitly.
async function runExt(body, { headers, dir } = {}) {
  const savedHome = process.env.CLAUDE_CONFIG_DIR;
  const savedState = process.env.XDG_STATE_HOME;
  // CLAUDE_CONFIG_DIR alone no longer isolates this extension's state: since
  // the XDG migration its paths resolve from XDG_STATE_HOME / XDG_DATA_HOME
  // (proxy/xdg-dirs.mjs), not from the Claude config root. Pointing all three
  // at one temp dir keeps the helper's contract — everything this case writes
  // lands under `dir` — and puts our artifacts at `dir/cache-fix/...`.
  if (dir) {
    process.env.CLAUDE_CONFIG_DIR = dir;
    process.env.XDG_STATE_HOME = dir;
  }
  try {
    const withModel = body && body.model === undefined ? { ...body, model: "claude-opus-5" } : body;
    const ctx = { body: withModel, meta: {}, headers: headers || {} };
    await ext.onRequest(ctx);
    return ctx;
  } finally {
    if (dir) {
      if (savedHome === undefined) delete process.env.CLAUDE_CONFIG_DIR;
      else process.env.CLAUDE_CONFIG_DIR = savedHome;
      if (savedState === undefined) delete process.env.XDG_STATE_HOME;
      else process.env.XDG_STATE_HOME = savedState;
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

test("buildToolAdditionMessage: documented contract — system-role message with tool_addition/tool_reference blocks", () => {
  const msg = buildToolAdditionMessage(["SendMessage", "TaskCreate"]);
  assert.equal(msg.role, "system");
  assert.equal(msg.content.length, 2);
  assert.deepEqual(msg.content[0], {
    type: "tool_addition",
    tool: { type: "tool_reference", name: "SendMessage" },
  });
  assert.deepEqual(msg.content[1], {
    type: "tool_addition",
    tool: { type: "tool_reference", name: "TaskCreate" },
  });
});

test("injectAdditions: splices the persisted message after its anchor, byte-identical", () => {
  const u0 = { role: "user", content: [{ type: "text", text: "u0" }] };
  const a1 = { role: "assistant", content: [{ type: "text", text: "a1" }] };
  const u2 = { role: "user", content: [{ type: "text", text: "u2" }] };
  const addMsg = buildToolAdditionMessage(["SendMessage"]);
  const additions = [{ names: ["SendMessage"], anchorHash: anchorHash(u0), message: addMsg }];
  const { messages, reanchored } = injectAdditions([u0, a1, u2], additions);
  assert.equal(reanchored.length, 0);
  assert.equal(messages.length, 4);
  assert.equal(messages[1], addMsg, "injected immediately after the anchor");
  assert.equal(messages[0], u0);
  assert.equal(messages[2], a1);
});

test("injectAdditions: pruned anchor → re-anchor after last user message, reported", () => {
  const uNew = { role: "user", content: [{ type: "text", text: "new turn" }] };
  const addMsg = buildToolAdditionMessage(["SendMessage"]);
  const additions = [{ names: ["SendMessage"], anchorHash: "gone-hash", message: addMsg }];
  const { messages, reanchored } = injectAdditions([uNew], additions);
  assert.equal(messages.length, 2);
  assert.equal(messages[1], addMsg, "re-anchored after the last user message");
  assert.equal(reanchored.length, 1);
  assert.equal(reanchored[0].anchorHash, anchorHash(uNew));
});

test("injectAdditions: no user message at all → injection skipped, reported with null anchor", () => {
  const a = { role: "assistant", content: [{ type: "text", text: "only assistant" }] };
  const addMsg = buildToolAdditionMessage(["SendMessage"]);
  const additions = [{ names: ["SendMessage"], anchorHash: "gone", message: addMsg }];
  const { messages, reanchored } = injectAdditions([a], additions);
  assert.equal(messages.length, 1, "nothing injected");
  assert.equal(reanchored[0].anchorHash, null);
});

// BITE — the LIFO bug (BACKLOG "READY — fix injectAdditions' LIFO stacking").
// Real capture s-captureC, n=372-397: an MCP-tool-discovery cascade produces
// one new `additions` entry per request, all anchored to the SAME message
// (the real conversation stays at 1 message the whole burst). The buggy
// implementation re-finds the anchor fresh on every iteration (the search
// excludes role==="system", so already-injected additions are invisible to
// it) and always splices at anchorIdx+1 — so the newest addition always
// lands closest to the anchor, pushing every earlier addition one slot
// further back: a LIFO stack that reorders the already-forwarded prefix on
// every new addition. Fix: a shared anchor's run stays in discovery order
// (FIFO) — a new addition appends AFTER the additions already injected
// there, so the forwarded prefix is a byte-stable prefix of every
// subsequent output and only the tail of the run grows.
test("injectAdditions: three additions sharing one anchor → output is discovery order (FIFO), not LIFO", () => {
  const u0 = { role: "user", content: [{ type: "text", text: "u0" }] };
  const sharedAnchor = anchorHash(u0);
  const addA = buildToolAdditionMessage(["ToolA"]);
  const addB = buildToolAdditionMessage(["ToolB"]);
  const addC = buildToolAdditionMessage(["ToolC"]);

  // additions array is in DISCOVERY order (oldest first), matching how
  // onRequest concatenates them across successive requests.
  const additions = [
    { names: ["ToolA"], anchorHash: sharedAnchor, message: addA },
    { names: ["ToolB"], anchorHash: sharedAnchor, message: addB },
    { names: ["ToolC"], anchorHash: sharedAnchor, message: addC },
  ];

  const { messages } = injectAdditions([u0], additions);
  assert.deepEqual(
    messages.map((m) => m.content?.[0]?.tool?.name ?? "u0"),
    ["u0", "ToolA", "ToolB", "ToolC"],
    "run stays in discovery order — ToolA first (oldest), ToolC last (newest), never reordered",
  );
});

test("injectAdditions: shared-anchor prefix stability — output N is a byte-prefix of output N+1", () => {
  const u0 = { role: "user", content: [{ type: "text", text: "u0" }] };
  const sharedAnchor = anchorHash(u0);
  const addA = buildToolAdditionMessage(["ToolA"]);
  const addB = buildToolAdditionMessage(["ToolB"]);

  // Simulates two successive requests: first only ToolA has been discovered,
  // then ToolB arrives too (additions accumulate, oldest first — as onRequest
  // does via `additions.concat([...])`).
  const afterFirst = injectAdditions([u0], [{ names: ["ToolA"], anchorHash: sharedAnchor, message: addA }]);
  const afterSecond = injectAdditions(
    [u0],
    [
      { names: ["ToolA"], anchorHash: sharedAnchor, message: addA },
      { names: ["ToolB"], anchorHash: sharedAnchor, message: addB },
    ],
  );

  const prefixBytes = JSON.stringify(afterFirst.messages);
  const nextBytes = JSON.stringify(afterSecond.messages.slice(0, afterFirst.messages.length));
  assert.equal(
    nextBytes,
    prefixBytes,
    "the already-forwarded prefix must be byte-identical once a new addition arrives — only the tail grows",
  );
  assert.equal(afterSecond.messages.length, 3, "the new addition appends at the tail of the run");
});

test("forwardedTools: names covered by additions get defer_loading, others stay untouched", () => {
  const known = [tool("Read"), tool("SendMessage")];
  const additions = [{ names: ["SendMessage"], anchorHash: "h", message: {} }];
  const fwd = forwardedTools(known, additions);
  assert.deepEqual(fwd[0], tool("Read"));
  assert.equal(fwd[1].defer_loading, true);
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
      // Same conversation across both requests: msgs[0] is what identifies
      // one, so an empty first request would now be a DIFFERENT conversation
      // (and no real first request is empty).
      const u1 = { role: "user", content: [{ type: "text", text: "turn 1" }] };
      const body1 = { tools: [tool("Read"), tool("Bash")], system: [{ type: "text", text: "sys" }], messages: [u1] };
      await runExt(body1, { headers, dir });

      const body2 = {
        tools: [tool("Read"), tool("Bash"), tool("SendMessage")],
        system: [{ type: "text", text: "sys" }],
        messages: [u1],
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

      // Top-level system UNTOUCHED (Phase A appended here — wrong location).
      assert.equal(ctx2.body.system.length, 1);
      // The announcement is a system-ROLE message injected into messages[],
      // after the anchor (the last message at addition time).
      assert.equal(ctx2.body.messages.length, 2);
      const injected = ctx2.body.messages[1];
      assert.equal(injected.role, "system");
      assert.deepEqual(injected.content[0], {
        type: "tool_addition",
        tool: { type: "tool_reference", name: "SendMessage" },
      });

      // Beta header added.
      assert.equal(headers["anthropic-beta"], "mid-conversation-tool-changes-2026-07-01");
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("onRequest: subsequent requests re-inject byte-identically at the same anchor (statelessness handled)", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-stable" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const u1 = { role: "user", content: [{ type: "text", text: "turn 1" }] };
      const body1 = { tools: [tool("Read"), tool("Bash")], system: [{ type: "text", text: "sys" }], messages: [u1] };
      await runExt(body1, { headers, dir });

      const body2 = {
        tools: [tool("Read"), tool("Bash"), tool("SendMessage")],
        system: [{ type: "text", text: "sys" }],
        messages: [u1],
      };
      const ctx2 = await runExt(body2, { headers, dir });
      const injectedAt2 = JSON.stringify(ctx2.body.messages[1]);

      // Requests 3 and 4: CC sends its own view (no injected message, no
      // defer_loading markers) with the conversation advancing. The proxy
      // must re-inject at the SAME anchor, byte-identically, and re-apply
      // the frozen tools[] with the marker — every request.
      for (const extra of [
        [{ role: "assistant", content: [{ type: "text", text: "a2" }] }],
        [
          { role: "assistant", content: [{ type: "text", text: "a2" }] },
          { role: "user", content: [{ type: "text", text: "turn 3" }] },
        ],
      ]) {
        const body = {
          tools: [tool("Read"), tool("Bash"), tool("SendMessage")],
          system: [{ type: "text", text: "sys" }],
          messages: [u1, ...extra],
        };
        const ctx = await runExt(body, { headers, dir });
        assert.equal(ctx.meta.deferredToolRewriteStats.action, "unchanged");
        assert.equal(ctx.meta.deferredToolRewriteStats.injected, 1);
        // Injection sits right after the anchor (u1), byte-identical.
        assert.equal(JSON.stringify(ctx.body.messages[1]), injectedAt2);
        // Frozen tools[] with defer_loading re-applied.
        assert.equal(ctx.body.tools[2].defer_loading, true);
        // Top-level system never touched.
        assert.equal(ctx.body.system.length, 1);
      }
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("onRequest: pruned anchor → re-anchor once, stable thereafter", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-prune" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      // msgs[0] identifies the conversation, so it must SURVIVE the prune for
      // this to exercise re-anchoring rather than a new conversation. The
      // addition anchors to the LAST message, so anchor and msgs[0] are
      // deliberately different messages here.
      const u0 = { role: "user", content: [{ type: "text", text: "turn 0" }] };
      const u1 = { role: "user", content: [{ type: "text", text: "turn 1" }] };
      await runExt({ tools: [tool("Read")], system: [], messages: [u0] }, { headers, dir });
      await runExt(
        { tools: [tool("Read"), tool("SendMessage")], system: [], messages: [u0, u1] },
        { headers, dir },
      );

      // Context management pruned the ANCHOR message while msgs[0] survives —
      // the same conversation, minus the turn the addition was anchored to.
      // (Replacing msgs[0] instead would be a different conversation by
      // design: the prefix died at index 0, so no cache survives it and a
      // fresh state costs nothing. The re-anchor path is for this case.)
      const uNew = { role: "user", content: [{ type: "text", text: "post-prune turn" }] };
      const ctx3 = await runExt(
        { tools: [tool("Read"), tool("SendMessage")], system: [], messages: [u0, uNew] },
        { headers, dir },
      );
      assert.equal(ctx3.meta.deferredToolRewriteStats.reanchored, 1);
      assert.equal(ctx3.body.messages[2].role, "system", "re-anchored after the last user message");

      // Next request: the new anchor holds — no further re-anchor.
      const ctx4 = await runExt(
        {
          tools: [tool("Read"), tool("SendMessage")],
          system: [],
          messages: [u0, uNew, { role: "assistant", content: [{ type: "text", text: "a" }] }],
        },
        { headers, dir },
      );
      assert.equal(ctx4.meta.deferredToolRewriteStats.reanchored, 0);
      // Anchored after uNew, which is now index 1 — so the injection is at 2.
      assert.equal(ctx4.body.messages[2].role, "system");
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("onRequest BITE: MCP-discovery cascade — same 1-message conversation, tools[] grows 3x → additions stack in discovery order, prefix stable", async () => {
  // Mirrors the real capture (s-captureC, n=372-397): CC's own progressive
  // MCP-tool-discovery cascade at session boot sends one new tool batch per
  // request while the real conversation never grows past 1 message, so every
  // addition shares the identical anchor (messages[0]).
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-cascade" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const u0 = { role: "user", content: [{ type: "text", text: "u0" }] };
      const base = { system: [], messages: [u0], model: "claude-opus-5" };

      await runExt({ ...base, tools: [tool("Read"), tool("Bash")] }, { headers, dir }); // no-baseline
      const ctx1 = await runExt(
        { ...base, tools: [tool("Read"), tool("Bash"), tool("ToolA")] },
        { headers, dir },
      );
      const ctx2 = await runExt(
        { ...base, tools: [tool("Read"), tool("Bash"), tool("ToolA"), tool("ToolB")] },
        { headers, dir },
      );
      const ctx3 = await runExt(
        { ...base, tools: [tool("Read"), tool("Bash"), tool("ToolA"), tool("ToolB"), tool("ToolC")] },
        { headers, dir },
      );

      const names = (ctx) =>
        ctx.body.messages
          .filter((m) => m.role === "system" && Array.isArray(m.content) && m.content[0]?.type === "tool_addition")
          .flatMap((m) => m.content.map((b) => b.tool.name));

      assert.deepEqual(names(ctx1), ["ToolA"]);
      assert.deepEqual(names(ctx2), ["ToolA", "ToolB"], "ToolA stays first — discovery order, not LIFO");
      assert.deepEqual(names(ctx3), ["ToolA", "ToolB", "ToolC"], "run grows only at the tail");

      // The forwarded prefix already produced must be a byte-prefix of the
      // next request's output — this is the "reorders the already-forwarded
      // prefix" bust the probe measured.
      const prefixOf = (ctx, n) => JSON.stringify(ctx.body.messages.slice(0, n));
      assert.equal(prefixOf(ctx2, ctx1.body.messages.length), JSON.stringify(ctx1.body.messages));
      assert.equal(prefixOf(ctx3, ctx2.body.messages.length), JSON.stringify(ctx2.body.messages));
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
      const savedState = process.env.XDG_STATE_HOME;
      process.env.CLAUDE_CONFIG_DIR = dir;
      process.env.XDG_STATE_HOME = dir;
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
        if (savedState === undefined) delete process.env.XDG_STATE_HOME;
        else process.env.XDG_STATE_HOME = savedState;
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
      // New tool present — but NOT marked, and this is the uncomfortable part.
      //
      // This fixture is the real 12:47:56 event that motivated the whole
      // extension (threat-matrix rows 6 and 13, the 175k and 766k busts), and
      // its model is `claude-sonnet-4-6`. The mid-conversation-tool-changes
      // contract is not supported there — a sonnet-5 request carrying it
      // returned `400 tool_addition/tool_removal is not supported on this
      // model` on 2026-07-28 — so the announcement path is gated off for this
      // model family and the new tool is forwarded plainly.
      //
      // Which means the mitigation does NOT apply to the traffic it was
      // designed for. Recorded in the matrix rather than papered over here:
      // holding tools[] stable and pinning ORDER still work on every model
      // (they need no beta), but ADDITIONS on sonnet remain an honest bust.
      const sendMsgTool = ctx2.body.tools.find((t) => t.name === "SendMessage");
      assert.ok(sendMsgTool, "the new tool is still forwarded — degrade, never drop");
      assert.ok(
        !("defer_loading" in sendMsgTool),
        "defer_loading belongs to a contract this model rejects with a 400",
      );
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

// Volatile session URL inside a tool DESCRIPTION. CC embeds the per-session
// console URL in Bash's description (it is the commit trailer the model is
// told to write) and does not embed it consistently: measured over 652
// same-key request pairs, it flipped twice. tools[] renders BEFORE system and
// messages, so no breakpoint survives a tools[] byte change — one such flip
// cost 705k creation tokens. Nothing about what Bash DOES changes across it.
test("toolFingerprint: the per-session console URL does not count as a schema change", () => {
  const withUrl = {
    name: "Bash",
    description:
      "Run a command.\n\nCo-Authored-By: X\nClaude-Session: https://claude.ai/code/session_01ABC\n" +
      "- End PR bodies with:\n\nhttps://claude.ai/code/session_01ABC",
    input_schema: { type: "object" },
  };
  const without = {
    name: "Bash",
    description: "Run a command.\n\nCo-Authored-By: X\n- End PR bodies with:",
    input_schema: { type: "object" },
  };
  assert.equal(toolFingerprint(withUrl), toolFingerprint(without));
});

// The narrowness is the safety property: serving a stale schema for a tool
// whose contract actually changed is the one failure this extension must
// never produce.
test("toolFingerprint: a genuine description change IS still a schema change", () => {
  const a = { name: "Bash", description: "Run a command.", input_schema: { type: "object" } };
  const b = { name: "Bash", description: "Run a DIFFERENT command.", input_schema: { type: "object" } };
  assert.notEqual(toolFingerprint(a), toolFingerprint(b));
  // input_schema changes too, obviously.
  const c = { name: "Bash", description: "Run a command.", input_schema: { type: "object", required: ["x"] } };
  assert.notEqual(toolFingerprint(a), toolFingerprint(c));
});

test("resolveToolRewriteSessionKey: prefers session-id header, falls back to model string", () => {
  // Header path is sub-keyed by system-prompt hash (threat-matrix row 14) —
  // "nosys" when the body carries no system prompt.
  const withHeader = resolveToolRewriteSessionKey({ "x-claude-code-session-id": "abc-123" }, { model: "x" });
  assert.equal(withHeader, "s-abc-123-nosys-empty");
  const withoutHeader = resolveToolRewriteSessionKey(null, { model: "claude-sonnet-4-6" });
  assert.equal(withoutHeader, "c-claude-sonnet-4-6-empty");
});

// Regression guard for the row-14 collision this extension shipped with:
// one session-id header, several tenants (main thread, subagents, CC's own
// sidecar calls), each with a DIFFERENT system prompt and a different tools
// array. Keyed on the bare session id they shared one baseline, so every
// alternation classified as "schema changed" and re-baselined — measured on
// real traffic as tools[] churn RISING when the extension was enabled.
test("resolveToolRewriteSessionKey: sidecars sharing a session-id get distinct keys", () => {
  const headers = { "x-claude-code-session-id": "abc-123" };
  const main = resolveToolRewriteSessionKey(headers, {
    system: [{ type: "text", text: "You are Claude Code, Anthropic's official CLI." }],
  });
  const sidecar = resolveToolRewriteSessionKey(headers, {
    system: [{ type: "text", text: "You are a Claude agent, built on Anthropic's API." }],
  });
  assert.notEqual(main, sidecar);
  // Same system prompt → same bucket, so the main thread stays on one baseline.
  const mainAgain = resolveToolRewriteSessionKey(headers, {
    system: [{ type: "text", text: "You are Claude Code, Anthropic's official CLI." }],
  });
  assert.equal(main, mainAgain);
});

// --- Model gate (the 400 that killed a live dispatch) ---
//
// 2026-07-28: a sonnet-5 subagent dispatch died with
// `API Error: 400 tool_addition/tool_removal is not supported on this model`.
// The contract is a documented beta but support is per-MODEL, and this
// extension applied it to whatever came through. A cache mitigation that can
// HARD-FAIL a request is worse than no mitigation, so the gate is opt-IN:
// unknown models degrade to forwarding the new tool normally.

test("supportsToolAddition: opt-IN, so an unknown model is OFF", () => {
  assert.equal(supportsToolAddition("claude-opus-5"), true);
  assert.equal(supportsToolAddition("claude-opus-5-20260101"), true, "date-suffixed ids must match by prefix");
  // Wire evidence 2026-07-29 (probe session c05a754c: block forwarded
  // byte-identically, API streamed 200).
  assert.equal(supportsToolAddition("claude-fable-5"), true);
  // The measured failure.
  assert.equal(supportsToolAddition("claude-sonnet-5"), false);
  // Everything unknown is off — a new model must not be able to break a
  // request just by existing.
  assert.equal(supportsToolAddition("claude-haiku-4-5"), false);
  assert.equal(supportsToolAddition("some-future-model"), false);
  assert.equal(supportsToolAddition(undefined), false);
  assert.equal(supportsToolAddition(null), false);
});

test("supportsToolAddition: EXTRA override admits a candidate for the live probe, per call", () => {
  // The override serves the throwaway acceptance-probe proxy only (it is how
  // fable-5 earned its baseline entry on 2026-07-29); it must be read per
  // call (a long-lived process picks up the change without a module reload)
  // and must not disturb the baseline list.
  const prev = process.env.CACHE_FIX_TOOL_ADDITION_EXTRA;
  try {
    process.env.CACHE_FIX_TOOL_ADDITION_EXTRA = "claude-candidate-x, claude-candidate-y";
    assert.equal(supportsToolAddition("claude-candidate-x"), true);
    assert.equal(supportsToolAddition("claude-candidate-y-20260101"), true);
    assert.equal(supportsToolAddition("claude-sonnet-5"), false, "override must not widen beyond its prefixes");
    delete process.env.CACHE_FIX_TOOL_ADDITION_EXTRA;
    assert.equal(supportsToolAddition("claude-candidate-x"), false, "cleared override must clear per call");
  } finally {
    if (prev === undefined) delete process.env.CACHE_FIX_TOOL_ADDITION_EXTRA;
    else process.env.CACHE_FIX_TOOL_ADDITION_EXTRA = prev;
  }
});

test("BITE — an unsupported model gets NO tool_addition, no beta header, tools passed through", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-sonnet" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const u1 = { role: "user", content: [{ type: "text", text: "turn 1" }] };
      const base = { system: [], messages: [u1], model: "claude-sonnet-5" };
      await runExt({ ...base, tools: [tool("Read")] }, { headers, dir });
      const ctx = await runExt(
        { ...base, tools: [tool("Read"), tool("SendMessage")] },
        { headers, dir },
      );
      // No injected system message anywhere in messages[].
      const injected = (ctx.body.messages || []).filter(
        (m) => m.role === "system" && Array.isArray(m.content) && m.content.some((b) => b.type === "tool_addition"),
      );
      assert.equal(injected.length, 0, "no tool_addition may reach a model that 400s on it");
      // No beta token.
      const beta = Object.entries(ctx.headers || {}).find(([k]) => k.toLowerCase() === "anthropic-beta");
      assert.ok(
        !beta || !String(beta[1]).includes("mid-conversation-tool-changes"),
        "beta token must not be sent to an unsupported model",
      );
      // And no defer_loading marker smuggled onto the new tool.
      const sm = (ctx.body.tools || []).find((t) => t.name === "SendMessage");
      assert.ok(sm, "the new tool is still forwarded — degrade, do not drop");
      assert.ok(!("defer_loading" in sm), "defer_loading belongs to the contract the model rejects");
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a suppressed announcement is LOUD: stderr once per model, telemetry every time", async () => {
  // The silent version of this path is the failure mode: a new model family
  // (documented rule is "Opus onward", so it likely supports the beta) pays
  // a full-prefix bust per tool load with nothing anywhere saying so, until
  // someone probes it by accident. The warning names the probe; telemetry
  // records every occurrence for counting.
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-new-family" };
  const warnings = [];
  const origWrite = process.stderr.write;
  process.stderr.write = (s, ...rest) => {
    if (String(s).includes("not allowlisted for tool_addition")) {
      warnings.push(String(s));
      return true;
    }
    return origWrite.call(process.stderr, s, ...rest);
  };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const u1 = { role: "user", content: [{ type: "text", text: "turn 1" }] };
      const base = { system: [], messages: [u1], model: "claude-new-family-7" };
      await runExt({ ...base, tools: [tool("Read")] }, { headers, dir });
      await runExt({ ...base, tools: [tool("Read"), tool("SendMessage")] }, { headers, dir });
      assert.equal(warnings.length, 1, "the first suppression must warn");
      assert.match(warnings[0], /claude-new-family-7/);
      assert.match(warnings[0], /probe/i, "the warning must name the way out");
      // A second suppressed load on the same model: telemetry yes, stderr no.
      await runExt(
        { ...base, tools: [tool("Read"), tool("SendMessage"), tool("Monitor")] },
        { headers, dir },
      );
      assert.equal(warnings.length, 1, "once per model per process");
      const { readdir: rd, readFile: rf } = await import("node:fs/promises");
      const snapDir = join(dir, "cache-fix", "snapshots");
      const evFile = (await rd(snapDir)).find((f) => f.endsWith("-deferred-tool-events.jsonl"));
      assert.ok(evFile, "telemetry file must exist");
      const events = (await rf(join(snapDir, evFile), "utf-8")).trim().split("\n").map(JSON.parse);
      const sup = events.filter((e) => e.suppressed);
      assert.equal(sup.length, 2, "every suppressed occurrence is recorded");
      assert.equal(sup[0].model, "claude-new-family-7");
      assert.equal(sup[0].injected, 0);
    });
  } finally {
    process.stderr.write = origWrite;
    await rm(dir, { recursive: true, force: true });
  }
});

test("a SUPPORTED model still gets the announcement (the gate is not a kill switch)", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-opus" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const u1 = { role: "user", content: [{ type: "text", text: "turn 1" }] };
      const base = { system: [], messages: [u1], model: "claude-opus-5" };
      await runExt({ ...base, tools: [tool("Read")] }, { headers, dir });
      const ctx = await runExt(
        { ...base, tools: [tool("Read"), tool("SendMessage")] },
        { headers, dir },
      );
      const injected = (ctx.body.messages || []).filter(
        (m) => m.role === "system" && Array.isArray(m.content) && m.content.some((b) => b.type === "tool_addition"),
      );
      assert.equal(injected.length, 1, "opus must keep the mitigation");
      assert.deepEqual(ctx.meta.deferredToolRewriteStats.announcedNames, ["SendMessage"]);
      assert.deepEqual(ctx.meta.deferredToolRewriteStats.passthrough, []);
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// =============================================================================
// DECISION SURFACING — the ground truth threat-matrix row 6 asked for:
// announced (tool_addition block, defer_loading) vs passed through into
// tools[] with no announcement at all, and why. `mutatedBy` (replay.mjs)
// proves the extension ran; these fields are what it decided.
// =============================================================================

test("onRequest: a new tool on an un-allowlisted model is a PASSTHROUGH, reason model-not-allowlisted", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-passthrough-model" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const u1 = { role: "user", content: [{ type: "text", text: "turn 1" }] };
      const base = { system: [], messages: [u1], model: "claude-sonnet-5" };
      await runExt({ ...base, tools: [tool("Read")] }, { headers, dir });
      const ctx = await runExt(
        { ...base, tools: [tool("Read"), tool("SendMessage")] },
        { headers, dir },
      );
      assert.equal(ctx.meta.deferredToolRewriteStats.action, "rewrite");
      assert.deepEqual(ctx.meta.deferredToolRewriteStats.announcedNames, []);
      assert.deepEqual(ctx.meta.deferredToolRewriteStats.passthrough, [
        { name: "SendMessage", reason: "model-not-allowlisted" },
      ]);
      // The other half of the same claim: the tool really did enter tools[]
      // with no announcement to explain it — indistinguishable from what an
      // unmitigated forward would have produced.
      assert.equal(ctx.body.tools.some((t) => t.name === "SendMessage"), true);
      assert.equal((ctx.body.messages || []).length, 1, "no tool_addition message injected");
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("onRequest: a new tool with no message to anchor to is a PASSTHROUGH, reason no-anchor-message", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-passthrough-anchor" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      // messages: [] on both requests — conversationSubKey("empty") keeps
      // them the same conversation (message-hash.mjs), and there is no
      // message at all to anchor an announcement after.
      const base = { system: [], messages: [], model: "claude-opus-5" };
      await runExt({ ...base, tools: [tool("Read")] }, { headers, dir });
      const ctx = await runExt(
        { ...base, tools: [tool("Read"), tool("SendMessage")] },
        { headers, dir },
      );
      assert.equal(ctx.meta.deferredToolRewriteStats.action, "rewrite");
      assert.deepEqual(ctx.meta.deferredToolRewriteStats.announcedNames, []);
      assert.deepEqual(ctx.meta.deferredToolRewriteStats.passthrough, [
        { name: "SendMessage", reason: "no-anchor-message" },
      ]);
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("onRequest: no new tool names → announcedNames/passthrough are EMPTY ARRAYS, never absent", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-decision-empty" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const u1 = { role: "user", content: [{ type: "text", text: "turn 1" }] };
      const base = { system: [], messages: [u1], model: "claude-opus-5" };
      await runExt({ ...base, tools: [tool("Read"), tool("Bash")] }, { headers, dir });
      // Reorder only — action "rewrite" (classifyToolChange pins first-seen
      // order as a side effect of the held/removed-name machinery; see its
      // own comment), but newNames is empty: nothing to announce or pass
      // through.
      const ctx = await runExt({ ...base, tools: [tool("Bash"), tool("Read")] }, { headers, dir });
      assert.equal(ctx.meta.deferredToolRewriteStats.action, "rewrite");
      assert.deepEqual(ctx.meta.deferredToolRewriteStats.newNames, []);
      assert.ok("announcedNames" in ctx.meta.deferredToolRewriteStats, "field present, not omitted");
      assert.ok("passthrough" in ctx.meta.deferredToolRewriteStats, "field present, not omitted");
      assert.deepEqual(ctx.meta.deferredToolRewriteStats.announcedNames, []);
      assert.deepEqual(ctx.meta.deferredToolRewriteStats.passthrough, []);
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// =============================================================================
// PRELOAD — threat-matrix row 6, ladder step (b) (2026-08-18)
//
// NAMESPACE IMPORT, deliberately, and it is the arrangement rather than a
// style choice: a static NAMED import of a not-yet-written export fails the
// whole module at ESM link time, so every bite in this 1000-line file goes red
// at once and the red-first run proves nothing about which half broke (the
// trap dev-loop names under "Adding a check"). `import * as` always links and
// leaves a missing export `undefined`, so each new bite fails at its own call
// site while every pre-existing bite here stays green — which is the split the
// arrangement exists to demonstrate.
// =============================================================================

const preloadMod = await import("../proxy/extensions/deferred-tool-rewrite.mjs");

const PRELOAD_STORE = (dir) => join(dir, "cache-fix", "snapshots", "deferred-tool-preload.json");

async function readPreloadStore(dir) {
  return JSON.parse(await readFile(PRELOAD_STORE(dir), "utf-8"));
}

// The tool this whole step exists for: 103 of 126 measured addition events.
function sendMessageTool() {
  return {
    name: "SendMessage",
    description: "Send a message to a named live session.",
    input_schema: { type: "object", properties: { to: { type: "string" }, message: { type: "string" } } },
  };
}

// GATE SHAPE (2026-08-18). The gate was a comma-separated NAME LIST until the
// review found it unpublishable: gate-allowlist.mjs admits no free-form value,
// and an unpublishable serving gate makes the doctor's three-way compare fail
// naming the wrong cause. So the gate is a BOOLEAN and the set is a source
// constant — which is also where a name can carry the measurement that put it
// there, as PRELOAD_TOOL_NAMES' comments do.
test("preloadNames: the gate is a BOOLEAN over a source-declared set, and anything but \"1\" is OFF", () => {
  assert.deepEqual(preloadMod.preloadNames({}), []);
  assert.deepEqual(preloadMod.preloadNames({ CACHE_FIX_TOOL_PRELOAD: "" }), []);
  assert.deepEqual(preloadMod.preloadNames({ CACHE_FIX_TOOL_PRELOAD: "1" }), ["SendMessage"]);
  // A free-form value is no longer a way to smuggle a name past the constant:
  // the old shape would have preloaded "SendMessage" here, and the new one
  // reads it as "not 1", i.e. OFF.
  assert.deepEqual(preloadMod.preloadNames({ CACHE_FIX_TOOL_PRELOAD: "SendMessage" }), []);
  assert.deepEqual(preloadMod.preloadNames({ CACHE_FIX_TOOL_PRELOAD: "true" }), []);
  assert.deepEqual(preloadMod.preloadNames({ CACHE_FIX_TOOL_PRELOAD: "0" }), []);
});

// The gate shape is what dissolves the duplicate-name finding (a gate value of
// "SendMessage,SendMessage" put two identical-name entries on the wire): a
// value can no longer name anything. What remains is a typo in the constant
// itself, and that is checkable here rather than by runtime dedupe code for a
// case no input can produce.
test("PRELOAD_TOOL_NAMES: a declared set with no duplicate, and every name a non-empty string", () => {
  const names = preloadMod.PRELOAD_TOOL_NAMES;
  assert.ok(Array.isArray(names) && names.length > 0, "the set is declared in source");
  assert.equal(new Set(names).size, names.length, "no duplicate name — a duplicate would put two identical-name entries on the wire");
  for (const n of names) assert.ok(typeof n === "string" && n.length > 0);
});

// The gate returns a COPY. `preloadPending` is built by concat/filter today,
// but the constant is process-wide state and one in-place mutation would
// change the preload set for every session the process serves.
test("preloadNames: the returned array is a copy, not the constant", () => {
  const got = preloadNamesOn();
  assert.notEqual(got, preloadMod.PRELOAD_TOOL_NAMES);
  got.push("Injected");
  assert.deepEqual(preloadNamesOn(), preloadMod.PRELOAD_TOOL_NAMES);
});

function preloadNamesOn() {
  return preloadMod.preloadNames({ CACHE_FIX_TOOL_PRELOAD: "1" });
}

test("preloadLearnable: learns an unknown wanted name, re-learns a moved schema, ignores a match", () => {
  const sm = sendMessageTool();
  const empty = { version: 1, tools: {} };
  assert.deepEqual(
    preloadMod.preloadLearnable([tool("Read"), sm], empty, ["SendMessage"]).map((t) => t.name),
    ["SendMessage"],
    "unknown wanted name is learnable",
  );

  const stored = { version: 1, tools: { SendMessage: { learnedAt: "x", tool: sm } } };
  assert.deepEqual(
    preloadMod.preloadLearnable([tool("Read"), sm], stored, ["SendMessage"]),
    [],
    "a fingerprint match is not re-learned",
  );

  // LAST-SEEN-WINS is the entire staleness answer — a pinned copy could not
  // age loudly, which is why (b) PINNED was the rejected alternative.
  const moved = { ...sm, input_schema: { type: "object", properties: { to: { type: "string" } } } };
  assert.deepEqual(
    preloadMod.preloadLearnable([moved], stored, ["SendMessage"]).map((t) => t.name),
    ["SendMessage"],
    "a schema that moved upstream is re-learned",
  );

  assert.deepEqual(
    preloadMod.preloadLearnable([tool("Read"), sm], empty, ["TaskCreate"]),
    [],
    "a name outside the wanted set is never learned",
  );
});

// THROTTLE (row 6 review, finding 7). The store is ONE file for the whole
// machine and the learn step fires on any fingerprint difference, so a name
// whose description varies by project would be rewritten by every session on
// the box, once per request, last writer winning. The window bounds that
// without giving up last-seen-wins.
test("preloadLearnable: a recently-learned name is not re-learned; an old one is", () => {
  const sm = sendMessageTool();
  const moved = { ...sm, description: "Send a message to a named live session (project X)." };
  const now = Date.parse("2026-08-18T12:00:00.000Z");
  const storeAt = (learnedAt) => ({ version: 1, tools: { SendMessage: { learnedAt, tool: sm } } });

  assert.deepEqual(
    preloadMod.preloadLearnable([moved], storeAt("2026-08-18T11:59:00.000Z"), ["SendMessage"], now),
    [],
    "inside the window the differing bytes are NOT written — this is the per-request store churn the finding names",
  );
  assert.deepEqual(
    preloadMod
      .preloadLearnable(
        [moved],
        storeAt(new Date(now - preloadMod.PRELOAD_RELEARN_MS - 1000).toISOString()),
        ["SendMessage"],
        now,
      )
      .map((t) => t.name),
    ["SendMessage"],
    "past the window last-seen-wins resumes, so an upstream schema move is still absorbed",
  );
  // Both directions of a stamp the throttle cannot trust. Suppressing a
  // re-learn on either would pin the stored bytes permanently and silently.
  assert.deepEqual(
    preloadMod.preloadLearnable([moved], storeAt("not-a-date"), ["SendMessage"], now).map((t) => t.name),
    ["SendMessage"],
    "an unparseable learnedAt does not throttle",
  );
  assert.deepEqual(
    preloadMod.preloadLearnable([moved], storeAt("2027-01-01T00:00:00.000Z"), ["SendMessage"], now).map((t) => t.name),
    ["SendMessage"],
    "a future learnedAt (clock skew) does not throttle — the re-learn rewrites the stamp and the state self-heals",
  );
  // The throttle must not reach a name the store has never seen: a first
  // bootstrap has no stamp to be young.
  assert.deepEqual(
    preloadMod.preloadLearnable([sm], { version: 1, tools: {} }, ["SendMessage"], now).map((t) => t.name),
    ["SendMessage"],
    "an unknown name is learned regardless of the window",
  );
});

test("preloadSeedTools: seeds only unknown-to-CC names the store knows, and strips defer_loading", () => {
  const sm = sendMessageTool();
  const store = {
    version: 1,
    tools: { SendMessage: { learnedAt: "x", tool: { ...sm, defer_loading: true } } },
  };
  assert.deepEqual(
    preloadMod.preloadSeedTools([tool("Read")], store, ["SendMessage"]),
    [sm],
    "seed carries the learned bytes WITHOUT the marker — forwardedTools applies it, and the persisted array must stay fingerprint-comparable against CC's raw one",
  );
  assert.deepEqual(
    preloadMod.preloadSeedTools([tool("Read"), sm], store, ["SendMessage"]),
    [],
    "a name CC already sent is never seeded",
  );
  assert.deepEqual(
    preloadMod.preloadSeedTools([tool("Read")], store, ["TaskCreate"]),
    [],
    "a wanted name the store has never learned cannot be seeded",
  );

  // The ONE odd store shape that did not degrade to "no seed": an entry whose
  // tool.name disagrees with its key seeded under the OTHER name, and since
  // the pending set records the WANTED name, forwardedTools would not mark the
  // impostor defer_loading — an unannounced tool going out presented as loaded.
  const mismatched = {
    version: 1,
    tools: { SendMessage: { learnedAt: "x", tool: { ...sm, name: "SomethingElse" } } },
  };
  assert.deepEqual(
    preloadMod.preloadSeedTools([tool("Read")], mismatched, ["SendMessage"]),
    [],
    "a store entry whose tool.name disagrees with its key is corrupt and seeds nothing",
  );
});

// A store that PARSES but carries no `tools` object — the third of the odd
// shapes, checked through the real extension because the degradation is in
// loadPreloadStore rather than in a pure helper.
test("preload STORE SHAPE: a parseable store with no tools object seeds nothing and still learns", async () => {
  const dir = await newTmp();
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1", CACHE_FIX_TOOL_PRELOAD: "1" }, async () => {
      await mkdir(join(dir, "cache-fix", "snapshots"), { recursive: true });
      await writeFile(PRELOAD_STORE(dir), JSON.stringify({ version: 1, note: "no tools key" }), "utf-8");
      const first = { role: "user", content: [{ type: "text", text: "shape turn" }] };
      const ctx = await runExt(
        { system: [], messages: [first], model: "claude-opus-5", tools: [tool("Read")] },
        { headers: { "x-claude-code-session-id": "sess-preload-shape" }, dir },
      );
      assert.deepEqual(ctx.meta.deferredToolRewriteStats.preloadSeeded, []);
      assert.deepEqual(ctx.body.tools, [tool("Read")], "CC's array is untouched");
      // And the malformed store is not a permanent dead end: the next
      // conversation that carries the name still learns it.
      await runExt(
        {
          system: [],
          messages: [{ role: "user", content: [{ type: "text", text: "teacher" }] }],
          model: "claude-opus-5",
          tools: [tool("Read"), sendMessageTool()],
        },
        { headers: { "x-claude-code-session-id": "sess-preload-shape-teacher" }, dir },
      );
      const store = await readPreloadStore(dir);
      assert.deepEqual(store.tools.SendMessage.tool, sendMessageTool());
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("forwardedTools: a pending preload gets defer_loading with NO addition record", () => {
  const known = [tool("Read"), sendMessageTool()];
  const fwd = forwardedTools(known, [], ["SendMessage"]);
  assert.equal(fwd[0].defer_loading, undefined, "an unrelated tool is untouched");
  assert.equal(fwd[1].defer_loading, true, "the preloaded name carries the marker");
  // The two-argument form is what tools/probe-tool-addition.mjs calls.
  assert.deepEqual(forwardedTools(known, []), known, "third argument stays optional");
});

test("preload END-TO-END: learn, seed a NEW conversation, hold tools[] byte-stable, announce on arrival", async () => {
  const dir = await newTmp();
  try {
    await withEnvAsync(
      { CACHE_FIX_TOOL_REWRITE: "1", CACHE_FIX_TOOL_PRELOAD: "1" },
      async () => {
        const sm = sendMessageTool();

        // --- BOOTSTRAP. The store starts empty, so the first conversation
        // seeds nothing and only LEARNS. This is why the change cannot bust
        // anything on the day it lands.
        const teacher = {
          system: [],
          messages: [{ role: "user", content: [{ type: "text", text: "teacher turn" }] }],
          model: "claude-opus-5",
          tools: [tool("Read"), sm],
        };
        const ctxT = await runExt(structuredClone(teacher), {
          headers: { "x-claude-code-session-id": "sess-preload-teacher" },
          dir,
        });
        assert.deepEqual(ctxT.meta.deferredToolRewriteStats.preloadSeeded, [], "nothing to seed from an empty store");
        const store = await readPreloadStore(dir);
        assert.deepEqual(store.tools.SendMessage.tool, sm, "learned CC's own bytes, verbatim");

        // --- SEED. A different conversation, born after the store was
        // learned, whose incoming array does NOT carry SendMessage.
        const headers = { "x-claude-code-session-id": "sess-preload-seeded" };
        const first = { role: "user", content: [{ type: "text", text: "seeded turn 1" }] };
        const body1 = {
          system: [],
          messages: [first],
          model: "claude-opus-5",
          tools: [tool("Read"), tool("Bash")],
        };
        const ctx1 = await runExt(structuredClone(body1), { headers, dir });
        assert.equal(ctx1.meta.deferredToolRewriteStats.action, "no-baseline");
        assert.deepEqual(ctx1.meta.deferredToolRewriteStats.preloadSeeded, ["SendMessage"]);
        assert.deepEqual(
          ctx1.body.tools.map((t) => t.name),
          ["Read", "Bash", "SendMessage"],
          "the preload rides at the END of the first-seen order",
        );
        assert.equal(ctx1.body.tools[2].defer_loading, true);
        // NO announcement at seed time. This half is SAFETY, not cache: an
        // unannounced deferred tool is not loadable, which is what stops the
        // model calling a tool CC does not yet know it has.
        assert.equal(ctx1.body.messages.length, 1, "no tool_addition message injected at seed time");
        assert.match(headers["anthropic-beta"] ?? "", /mid-conversation-tool-changes/,
          "defer_loading is beta-gated, so the header rides with the seed");
        const wire1 = structuredClone(ctx1.body.tools);

        // --- HOLD. The claim the whole step exists for: request 2 forwards a
        // BYTE-IDENTICAL tools[].
        const ctx2 = await runExt(
          structuredClone({ ...body1, messages: [first, { role: "assistant", content: [{ type: "text", text: "a" }] }] }),
          { headers, dir },
        );
        assert.deepEqual(ctx2.body.tools, wire1, "tools[] is byte-stable across the seeded request");
        assert.equal(ctx2.meta.deferredToolRewriteStats.preloadPending, 1);

        // --- ARRIVAL. CC finally sends SendMessage. tools[] must NOT move —
        // that is the 80% of addition events this step removes — and the
        // announcement happens NOW, so the tool becomes callable.
        const ctx3 = await runExt(
          structuredClone({
            ...body1,
            messages: [first, { role: "assistant", content: [{ type: "text", text: "a" }] }],
            tools: [tool("Read"), tool("Bash"), sm],
          }),
          { headers, dir },
        );
        assert.deepEqual(ctx3.body.tools, wire1, "the arrival moves NOTHING in tools[] — the whole point");
        assert.deepEqual(ctx3.meta.deferredToolRewriteStats.preloadAnnounced, ["SendMessage"]);
        assert.equal(ctx3.meta.deferredToolRewriteStats.preloadPending, 0);
        const announcement = ctx3.body.messages.find(
          (m) => m.role === "system" && m.content?.some?.((b) => b.type === "tool_addition"),
        );
        assert.ok(announcement, "the seeded tool is announced at the request CC sends it");
        assert.deepEqual(
          announcement.content.map((b) => b.tool.name),
          ["SendMessage"],
        );

        // --- AND IT STAYS. A fourth request re-injects the same announcement
        // (the API is stateless) and still does not move tools[].
        const ctx4 = await runExt(
          structuredClone({
            ...body1,
            messages: [first, { role: "assistant", content: [{ type: "text", text: "a" }] }],
            tools: [tool("Read"), tool("Bash"), sm],
          }),
          { headers, dir },
        );
        assert.deepEqual(ctx4.body.tools, wire1);
      },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("preload CONTROL: gate OFF forwards today's array, and a seeded session differs from it by EXACTLY the one deferred entry", async () => {
  const dir = await newTmp();
  try {
    const sm = sendMessageTool();
    const first = { role: "user", content: [{ type: "text", text: "control turn" }] };
    const body = { system: [], messages: [first], model: "claude-opus-5", tools: [tool("Read"), tool("Bash")] };

    // Arm 1 — gate OFF. A version that changes this arm is over-firing.
    const off = await withEnvAsync(
      { CACHE_FIX_TOOL_REWRITE: "1", CACHE_FIX_TOOL_PRELOAD: undefined },
      async () => {
        const ctxT = await runExt(
          structuredClone({ ...body, tools: [tool("Read"), sm] }),
          { headers: { "x-claude-code-session-id": "sess-ctl-teacher" }, dir },
        );
        assert.deepEqual(ctxT.meta.deferredToolRewriteStats.preloadSeeded, [],
          "with the gate off nothing is even learned");
        const ctx = await runExt(structuredClone(body), {
          headers: { "x-claude-code-session-id": "sess-ctl-off" },
          dir,
        });
        return ctx.body.tools;
      },
    );
    assert.deepEqual(off, [tool("Read"), tool("Bash")], "gate off is byte-for-byte today's behaviour");

    // Arm 2 — gate ON, same input. The arms MUST differ, and by exactly one
    // entry: an implementation that makes every array stable would pass arm 1
    // and fail here, and one that seeds nothing would pass here and fail the
    // end-to-end bite above.
    const on = await withEnvAsync(
      { CACHE_FIX_TOOL_REWRITE: "1", CACHE_FIX_TOOL_PRELOAD: "1" },
      async () => {
        await runExt(structuredClone({ ...body, tools: [tool("Read"), sm] }), {
          headers: { "x-claude-code-session-id": "sess-ctl-teacher2" },
          dir,
        });
        const ctx = await runExt(structuredClone(body), {
          headers: { "x-claude-code-session-id": "sess-ctl-on" },
          dir,
        });
        return ctx.body.tools;
      },
    );
    assert.notDeepEqual(on, off, "the two arms must DIFFER, or this bite discriminates nothing");
    assert.deepEqual(on.slice(0, 2), off, "every tool CC actually sent is untouched");
    assert.equal(on.length, off.length + 1);
    assert.deepEqual(on[2], { ...sm, defer_loading: true });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("preload NEVER RETROFITS: a conversation that already has a baseline is not seeded when the gate turns on", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-preload-retrofit" };
  const first = { role: "user", content: [{ type: "text", text: "retrofit turn" }] };
  const body = { system: [], messages: [first], model: "claude-opus-5", tools: [tool("Read"), tool("Bash")] };
  try {
    // Teach the store under the gate, in a DIFFERENT conversation.
    await withEnvAsync(
      { CACHE_FIX_TOOL_REWRITE: "1", CACHE_FIX_TOOL_PRELOAD: "1" },
      async () => {
        await runExt(
          structuredClone({
            ...body,
            messages: [{ role: "user", content: [{ type: "text", text: "other" }] }],
            tools: [tool("Read"), sendMessageTool()],
          }),
          { headers: { "x-claude-code-session-id": "sess-preload-retrofit-teacher" }, dir },
        );
        // This conversation gets its baseline first.
        const ctx1 = await runExt(structuredClone(body), { headers, dir });
        assert.equal(ctx1.meta.deferredToolRewriteStats.action, "no-baseline");
        assert.deepEqual(ctx1.meta.deferredToolRewriteStats.preloadSeeded, ["SendMessage"]);
      },
    );

    // A SECOND conversation whose baseline was created BEFORE any preload
    // existed — the live-session case the entry names as the ship-time hazard:
    // retrofitting a running session's array is the exact bust this prevents.
    const headers2 = { "x-claude-code-session-id": "sess-preload-running" };
    const first2 = { role: "user", content: [{ type: "text", text: "already running" }] };
    const body2 = { ...body, messages: [first2] };
    const before = await withEnvAsync(
      { CACHE_FIX_TOOL_REWRITE: "1", CACHE_FIX_TOOL_PRELOAD: undefined },
      async () => (await runExt(structuredClone(body2), { headers: headers2, dir })).body.tools,
    );
    const after = await withEnvAsync(
      { CACHE_FIX_TOOL_REWRITE: "1", CACHE_FIX_TOOL_PRELOAD: "1" },
      async () => {
        const ctx = await runExt(
          structuredClone({ ...body2, messages: [first2, { role: "assistant", content: [{ type: "text", text: "a" }] }] }),
          { headers: headers2, dir },
        );
        assert.deepEqual(ctx.meta.deferredToolRewriteStats.preloadSeeded, [],
          "an existing baseline is never seeded, whatever the gate says");
        return ctx.body.tools;
      },
    );
    assert.deepEqual(after, before, "a running conversation's tools[] does not move when the gate flips on");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("preload MODEL GATE: a model outside the tool_addition allowlist is never seeded", async () => {
  const dir = await newTmp();
  try {
    await withEnvAsync(
      { CACHE_FIX_TOOL_REWRITE: "1", CACHE_FIX_TOOL_PRELOAD: "1" },
      async () => {
        const first = { role: "user", content: [{ type: "text", text: "gate turn" }] };
        await runExt(
          {
            system: [],
            messages: [{ role: "user", content: [{ type: "text", text: "teacher" }] }],
            model: "claude-opus-5",
            tools: [tool("Read"), sendMessageTool()],
          },
          { headers: { "x-claude-code-session-id": "sess-preload-model-teacher" }, dir },
        );
        // A preloaded tool it could never announce is a tool the model could
        // never call — so no seed at all, rather than a silently dead entry.
        const ctx = await runExt(
          { system: [], messages: [first], model: "claude-sonnet-5", tools: [tool("Read")] },
          { headers: { "x-claude-code-session-id": "sess-preload-model" }, dir },
        );
        assert.deepEqual(ctx.meta.deferredToolRewriteStats.preloadSeeded, []);
        assert.deepEqual(ctx.body.tools, [tool("Read")]);
      },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("preload ABANDON: a seeded conversation whose model leaves the allowlist takes one honest reset, named", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-preload-abandon" };
  try {
    await withEnvAsync(
      { CACHE_FIX_TOOL_REWRITE: "1", CACHE_FIX_TOOL_PRELOAD: "1" },
      async () => {
        await runExt(
          {
            system: [],
            messages: [{ role: "user", content: [{ type: "text", text: "teacher" }] }],
            model: "claude-opus-5",
            tools: [tool("Read"), sendMessageTool()],
          },
          { headers: { "x-claude-code-session-id": "sess-preload-abandon-teacher" }, dir },
        );
        const first = { role: "user", content: [{ type: "text", text: "abandon turn" }] };
        const seeded = await runExt(
          { system: [], messages: [first], model: "claude-opus-5", tools: [tool("Read")] },
          { headers, dir },
        );
        assert.deepEqual(seeded.meta.deferredToolRewriteStats.preloadSeeded, ["SendMessage"]);

        const ctx = await runExt(
          { system: [], messages: [first], model: "claude-sonnet-5", tools: [tool("Read")] },
          { headers, dir },
        );
        assert.equal(ctx.meta.deferredToolRewriteStats.action, "reset");
        assert.equal(ctx.meta.deferredToolRewriteStats.reason, "preload-unannounceable");
        assert.deepEqual(ctx.meta.deferredToolRewriteStats.preloadFallback, ["SendMessage"]);
        assert.deepEqual(ctx.body.tools, [tool("Read")], "CC's own array goes through — never a dead deferred entry");
        assert.equal(ctx.meta.deferredToolRewriteStats.preloadPending, 0);
      },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// =============================================================================
// PRELOAD — the repair round (2026-08-18 fresh-context review)
//
// Every bite below names the finding it closes. They share one definition,
// which is written in classifyToolChange's own header before any assertion
// here uses it: a name WE seeded is not evidence that Claude Code changed its
// tool set, so the identity tests ask about the set CC SENT.
// =============================================================================

// A conversation seeded with SendMessage, driven to the point where a pending
// seed is outstanding. Returns the wire array of the seeding request, which is
// the byte-stability reference every later request is measured against.
async function seedConversation(dir, headers, { first, tools }) {
  await runExt(
    {
      system: [],
      messages: [{ role: "user", content: [{ type: "text", text: "teacher" }] }],
      model: "claude-opus-5",
      tools: [tool("Read"), sendMessageTool()],
    },
    { headers: { "x-claude-code-session-id": `${headers["x-claude-code-session-id"]}-teacher` }, dir },
  );
  const ctx = await runExt(
    { system: [], messages: [first], model: "claude-opus-5", tools: structuredClone(tools) },
    { headers, dir },
  );
  assert.deepEqual(
    ctx.meta.deferredToolRewriteStats.preloadSeeded,
    ["SendMessage"],
    "arrangement: the conversation really is seeded, or the bite below proves nothing",
  );
  return structuredClone(ctx.body.tools);
}

// FINDING 1 (BLOCKING). The absorb needs heldNames.length === 0; a
// seeded-but-unarrived name counted as held made that permanently false, so
// every description delta inside the pending window took the honest reset —
// the mitigation this file ships, disabled by the mitigation beside it.
// TWO ARMS, only the gate differing, and they must AGREE on the absorb: the
// preload is supposed to be invisible to this classification.
test("preload FINDING 1: a description delta inside the pending window is ABSORBED, not reset", async () => {
  const dir = await newTmp();
  const DESC_OLD = "reads a file";
  const DESC_NEW = "reads a file, now with a note";
  const first = { role: "user", content: [{ type: "text", text: "absorb turn" }] };
  const withDesc = (d) => [tool("Read", { description: d }), tool("Bash")];
  try {
    // Arm 1 — gate OFF. Today's shipped behaviour, asserted exactly.
    const off = await withEnvAsync(
      { CACHE_FIX_TOOL_REWRITE: "1", CACHE_FIX_TOOL_PRELOAD: undefined },
      async () => {
        const headers = { "x-claude-code-session-id": "sess-absorb-off" };
        const ctx1 = await runExt(
          { system: [], messages: [first], model: "claude-opus-5", tools: withDesc(DESC_OLD) },
          { headers, dir },
        );
        const wire1 = structuredClone(ctx1.body.tools);
        const ctx2 = await runExt(
          {
            system: [],
            messages: [first, { role: "assistant", content: [{ type: "text", text: "a" }] }],
            model: "claude-opus-5",
            tools: withDesc(DESC_NEW),
          },
          { headers, dir },
        );
        assert.equal(ctx2.meta.deferredToolRewriteStats.action, "description-absorbed");
        assert.deepEqual(ctx2.body.tools, wire1, "the absorb holds tools[] byte-stable");
        return ctx2.meta.deferredToolRewriteStats.action;
      },
    );

    // Arm 2 — gate ON, a pending seed outstanding, same description delta.
    const on = await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1", CACHE_FIX_TOOL_PRELOAD: "1" }, async () => {
      const headers = { "x-claude-code-session-id": "sess-absorb-on" };
      const wire1 = await seedConversation(dir, headers, { first, tools: withDesc(DESC_OLD) });
      const ctx2 = await runExt(
        {
          system: [],
          messages: [first, { role: "assistant", content: [{ type: "text", text: "a" }] }],
          model: "claude-opus-5",
          tools: withDesc(DESC_NEW),
        },
        { headers, dir },
      );
      const stats = ctx2.meta.deferredToolRewriteStats;
      assert.notEqual(stats.action, "reset", "the seeded name is OURS — it is not evidence CC changed its tool set");
      assert.equal(stats.action, "description-absorbed");
      assert.deepEqual(stats.descriptionChangedNames, ["Read"]);
      assert.deepEqual(ctx2.body.tools, wire1, "tools[] byte-stable, seeded entry and all");
      assert.equal(stats.preloadPending, 1, "and the reset did not wipe the pending set either");
      return stats.action;
    });

    assert.equal(on, off, "the preload must be invisible to the absorb classification");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// FINDING 2 (HIGH). A pending name arriving with bytes we did not guess is not
// "a known tool's schema changed" — we never had CC's bytes for it. The reset
// there is strictly worse than no preload at all: it forwards CC's raw array
// AND drops every pending injection, where the control arm holds the frozen
// order and announces.
test("preload FINDING 2: a pending name arriving with DIFFERENT bytes is adopted and announced, never reset", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-adopt" };
  const first = { role: "user", content: [{ type: "text", text: "adopt turn" }] };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1", CACHE_FIX_TOOL_PRELOAD: "1" }, async () => {
      const wire1 = await seedConversation(dir, headers, {
        first,
        tools: [tool("Read"), tool("Bash")],
      });
      const seededEntry = wire1.find((t) => t.name === "SendMessage");
      assert.ok(seededEntry, "arrangement: the seeded entry is on the wire");

      // CC's real SendMessage carries a DIFFERENT schema from the one the
      // teacher conversation taught — both a schema and a description delta,
      // so the old code's immediate schema-reset branch is the one exercised.
      const cc = {
        name: "SendMessage",
        description: "Send a message to a named live session, with a summary.",
        input_schema: {
          type: "object",
          properties: { to: { type: "string" }, message: { type: "string" }, summary: { type: "string" } },
        },
      };
      const ctx = await runExt(
        {
          system: [],
          messages: [first, { role: "assistant", content: [{ type: "text", text: "a" }] }],
          model: "claude-opus-5",
          tools: [tool("Read"), tool("Bash"), cc],
        },
        { headers, dir },
      );
      const stats = ctx.meta.deferredToolRewriteStats;
      assert.notEqual(stats.action, "reset", "never the global reset — that costs the whole frozen array");
      assert.deepEqual(stats.preloadAnnounced, ["SendMessage"], "the arrival is announced, so the tool becomes callable");
      assert.equal(stats.preloadPending, 0);

      const names = ctx.body.tools.map((t) => t.name);
      assert.deepEqual(names, ["Read", "Bash", "SendMessage"], "the frozen first-seen order survives");
      const out = ctx.body.tools[2];
      assert.deepEqual(
        { name: out.name, description: out.description, input_schema: out.input_schema },
        cc,
        "CC's bytes are ADOPTED — never our guess served as if it were CC's schema",
      );
      assert.equal(out.defer_loading, true, "and it stays deferred, announced by the block below");
      assert.deepEqual(ctx.body.tools.slice(0, 2), wire1.slice(0, 2), "every other entry is byte-identical");

      const announcement = ctx.body.messages.find(
        (m) => m.role === "system" && m.content?.some?.((b) => b.type === "tool_addition"),
      );
      assert.ok(announcement, "the adopted arrival is announced");
      assert.deepEqual(announcement.content.map((b) => b.tool.name), ["SendMessage"]);
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// FINDING 5 (MEDIUM). "Never retrofits" was guarded by action === "no-baseline",
// which is a fact about the STATE FILE. This extension's key carries a
// conversation sub-key, and a mid-conversation rotation of it (measured:
// s-captureAB, n=331->336) makes a live turn classify no-baseline. Reproduced
// here by rotating the key the way the real rotation does — a changed
// messages[0], with the rest of the history intact.
test("preload FINDING 5: a mid-conversation key rotation does not seed a running conversation", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-rotate" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1", CACHE_FIX_TOOL_PRELOAD: "1" }, async () => {
      await runExt(
        {
          system: [],
          messages: [{ role: "user", content: [{ type: "text", text: "teacher" }] }],
          model: "claude-opus-5",
          tools: [tool("Read"), sendMessageTool()],
        },
        { headers: { "x-claude-code-session-id": "sess-rotate-teacher" }, dir },
      );

      // A conversation seven turns deep whose FIRST message then changes —
      // the rotation. Under the old guard this classifies no-baseline and
      // seeds, taking the live wire from 2 tools to 3.
      const deep = (head) => [
        head,
        ...Array.from({ length: 6 }, (_, i) => ({
          role: i % 2 === 0 ? "assistant" : "user",
          content: [{ type: "text", text: `turn ${i}` }],
        })),
      ];
      const tools = [tool("Read"), tool("Bash")];
      const before = await runExt(
        { system: [], messages: deep({ role: "user", content: [{ type: "text", text: "corpus A" }] }), model: "claude-opus-5", tools: structuredClone(tools) },
        { headers, dir },
      );
      assert.deepEqual(before.body.tools.map((t) => t.name), ["Read", "Bash"]);

      const after = await runExt(
        { system: [], messages: deep({ role: "user", content: [{ type: "text", text: "corpus A (re-read from disk)" }] }), model: "claude-opus-5", tools: structuredClone(tools) },
        { headers, dir },
      );
      assert.equal(
        after.meta.deferredToolRewriteStats.action,
        "no-baseline",
        "arrangement: the rotation really did produce a no-baseline mid-conversation, or this bite proves nothing",
      );
      assert.deepEqual(
        after.meta.deferredToolRewriteStats.preloadSeeded,
        [],
        "seven turns in is not a conversation's birth, whatever the state file says",
      );
      assert.deepEqual(after.body.tools, before.body.tools, "the live conversation's tools[] does not move");
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// UNCOVERED CLAIM 1 — the header calls this placement load-bearing and no bite
// exercised it: announce-on-arrival sits OUTSIDE the wantPreload gate, so
// turning the gate off must neither bust an already-seeded conversation nor
// strand its seeded tool uncallable forever.
test("preload DRAIN: an already-seeded conversation still announces after the gate is turned OFF", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-drain" };
  const first = { role: "user", content: [{ type: "text", text: "drain turn" }] };
  try {
    const wire1 = await withEnvAsync(
      { CACHE_FIX_TOOL_REWRITE: "1", CACHE_FIX_TOOL_PRELOAD: "1" },
      async () => seedConversation(dir, headers, { first, tools: [tool("Read")] }),
    );

    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1", CACHE_FIX_TOOL_PRELOAD: undefined }, async () => {
      const ctx = await runExt(
        {
          system: [],
          messages: [first, { role: "assistant", content: [{ type: "text", text: "a" }] }],
          model: "claude-opus-5",
          tools: [tool("Read"), sendMessageTool()],
        },
        { headers, dir },
      );
      const stats = ctx.meta.deferredToolRewriteStats;
      assert.deepEqual(stats.preloadAnnounced, ["SendMessage"], "the outstanding obligation is drained with the gate off");
      assert.equal(stats.preloadPending, 0);
      assert.deepEqual(ctx.body.tools, wire1, "and the gate flip does not move the seeded conversation's tools[]");
      assert.ok(
        ctx.body.messages.some((m) => m.role === "system" && m.content?.some?.((b) => b.type === "tool_addition")),
        "the tool becomes callable rather than sitting deferred forever",
      );
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// UNCOVERED CLAIM 2 — "nothing stays pending across a reset" is a comment in
// the code with no bite behind it. A reset re-baselines against CC's own
// array, which by construction holds whatever CC is sending, so a pending
// entry surviving one would mark a name CC already sent as deferred forever.
test("preload RESET: a real schema change clears the pending set, in state and on the wire", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-reset-pending" };
  const first = { role: "user", content: [{ type: "text", text: "reset turn" }] };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1", CACHE_FIX_TOOL_PRELOAD: "1" }, async () => {
      await seedConversation(dir, headers, { first, tools: [tool("Read"), tool("Bash")] });

      // Bash's schema really changes — CC's own edit, nothing to do with the
      // preload, and the one case this extension must never paper over.
      const bumped = { name: "Bash", input_schema: { type: "object", properties: { cmd: { type: "string" } } } };
      const msgs = [first, { role: "assistant", content: [{ type: "text", text: "a" }] }];
      const ctx = await runExt(
        { system: [], messages: msgs, model: "claude-opus-5", tools: [tool("Read"), bumped] },
        { headers, dir },
      );
      assert.equal(ctx.meta.deferredToolRewriteStats.action, "reset");
      assert.equal(ctx.meta.deferredToolRewriteStats.reason, "tool-schema-changed");
      assert.equal(ctx.meta.deferredToolRewriteStats.preloadPending, 0);
      assert.deepEqual(ctx.body.tools, [tool("Read"), bumped], "CC's array goes through untouched");

      // The next request must not resurrect it from state.
      const ctx2 = await runExt(
        { system: [], messages: msgs, model: "claude-opus-5", tools: [tool("Read"), bumped] },
        { headers, dir },
      );
      assert.equal(ctx2.meta.deferredToolRewriteStats.preloadPending, 0);
      assert.deepEqual(
        ctx2.body.tools.map((t) => t.name),
        ["Read", "Bash"],
        "the seeded name is gone for good — the reset re-baselined on CC's set",
      );
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// UNCOVERED CLAIM 3 — the `unchanged` and `description-absorbed` forwarding
// branches with a NON-EMPTY pending set. Both re-forward the frozen array, and
// the pending name's defer_loading comes from `preloadPending` rather than
// from any addition record: drop it on either branch and the wire says a tool
// nobody announced is loaded.
test("preload FORWARDING: the pending marker survives the unchanged branch, request after request", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-forward" };
  const first = { role: "user", content: [{ type: "text", text: "forward turn" }] };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1", CACHE_FIX_TOOL_PRELOAD: "1" }, async () => {
      const wire1 = await seedConversation(dir, headers, { first, tools: [tool("Read"), tool("Bash")] });
      assert.equal(wire1[2].defer_loading, true);

      let msgs = [first];
      for (let turn = 0; turn < 3; turn++) {
        msgs = msgs.concat([{ role: "assistant", content: [{ type: "text", text: `t${turn}` }] }]);
        const ctx = await runExt(
          { system: [], messages: structuredClone(msgs), model: "claude-opus-5", tools: [tool("Read"), tool("Bash")] },
          { headers, dir },
        );
        assert.equal(ctx.meta.deferredToolRewriteStats.action, "unchanged", "a pending seed is not a CC set change");
        assert.deepEqual(ctx.body.tools, wire1, `turn ${turn}: byte-stable, marker and all`);
        assert.equal(ctx.meta.deferredToolRewriteStats.preloadPending, 1);
      }
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
