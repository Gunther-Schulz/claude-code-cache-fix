import { test } from "node:test";
import assert from "node:assert/strict";
import {
  betaAllowsSystemMessages,
  canonicalBody,
  normalizeMessages,
  reminderBlocks,
  runHookContextNormalize,
} from "../proxy/extensions/hook-context-normalize.mjs";

const REMINDER = (body) => `<system-reminder>\n${body}\n</system-reminder>`;
const BETA = "mid-conversation-system-2026-04-07";

// The real pair from the 2026-07-31 bust: two wrapped blocks inside a
// tool_result host became one standalone message of exactly this body.
const BLOCK_A = REMINDER("PreToolUse:Agent hook additional context: Dispatch starting.") + "\n";
const BLOCK_B = REMINDER("PostToolUse:Agent hook additional context: Dispatch closed.");
const CANON =
  "PreToolUse:Agent hook additional context: Dispatch starting.\n\n" +
  "PostToolUse:Agent hook additional context: Dispatch closed.";

const host = () => ({
  role: "user",
  content: [
    { type: "tool_result", tool_use_id: "toolu_1", content: "ok" },
    { type: "text", text: BLOCK_A },
    { type: "text", text: BLOCK_B },
  ],
});

test("canonicalBody strips wrappers and joins with a blank line", () => {
  assert.equal(canonicalBody([BLOCK_A, BLOCK_B]), CANON);
});

test("canonicalBody is byte-exact on the shape CC itself emits", () => {
  // The whole design rests on producing CC's own bytes; a trailing newline or
  // a single-\n join would look right and still diverge the prefix.
  assert.ok(!canonicalBody([BLOCK_A, BLOCK_B]).endsWith("\n"));
  assert.ok(canonicalBody([BLOCK_A, BLOCK_B]).includes("\n\n"));
});

test("reminderBlocks finds only wrapped TRAILING text blocks", () => {
  assert.equal(reminderBlocks(host()).length, 2);
  // a leading reminder with nothing before it is not a host
  assert.equal(reminderBlocks({ content: [{ type: "text", text: BLOCK_A }] }).length, 0);
  // unwrapped trailing text is left alone
  assert.equal(
    reminderBlocks({ content: [{ type: "tool_result" }, { type: "text", text: "plain" }] }).length,
    0);
});

test("normalizeMessages moves blocks to a standalone message at host+1", () => {
  const { messages, moved } = normalizeMessages([{ role: "assistant", content: "x" }, host()]);
  assert.equal(moved, 1);
  assert.equal(messages.length, 3);
  // host keeps its tool_result and loses only the reminders
  assert.deepEqual(messages[1].content, [{ type: "tool_result", tool_use_id: "toolu_1", content: "ok" }]);
  // placement is host+1 — measured as the single placement across the corpus
  assert.equal(messages[2].role, "system");
  assert.equal(messages[2].content, CANON);
});

test("an already-canonical body is passed through byte-untouched", () => {
  // Idempotence is the property that makes request N and N+1 agree; without it
  // the extension would itself become the mid-history rewrite it prevents.
  const once = normalizeMessages([host()]).messages;
  const twice = normalizeMessages(once);
  assert.equal(twice.moved, 0);
  assert.deepEqual(twice.messages, once);
});

test("a message of ONLY reminders is never emptied", () => {
  // Deleting a turn is a fidelity change; safety outranks cache.
  const only = { role: "user", content: [{ type: "text", text: BLOCK_A }, { type: "text", text: BLOCK_B }] };
  const { messages, moved } = normalizeMessages([only]);
  assert.equal(moved, 0);
  assert.deepEqual(messages, [only]);
});

test("beta gate: exact member match, not substring", () => {
  assert.equal(betaAllowsSystemMessages({ "anthropic-beta": `a,${BETA},b` }), true);
  assert.equal(betaAllowsSystemMessages({ "Anthropic-Beta": BETA }), true);
  assert.equal(betaAllowsSystemMessages({ "anthropic-beta": `${BETA}-suffix` }), false);
  assert.equal(betaAllowsSystemMessages({ "anthropic-beta": "other" }), false);
  assert.equal(betaAllowsSystemMessages({}), false);
  assert.equal(betaAllowsSystemMessages(null), false);
});

test("gated OFF by default — no mutation without the env flag", async () => {
  delete process.env.CACHE_FIX_HOOK_CONTEXT_NORMALIZE;
  const ctx = { body: { messages: [host()] }, headers: { "anthropic-beta": BETA } };
  const before = JSON.stringify(ctx.body);
  const stats = await runHookContextNormalize(ctx);
  assert.equal(stats.enabled, false);
  assert.equal(JSON.stringify(ctx.body), before, "body must be untouched when gated off");
});

test("without the beta the body is NOT rewritten", async () => {
  // Emitting role:"system" without mid-conversation-system would hand the API
  // a shape it does not accept — a cache win that breaks the request.
  process.env.CACHE_FIX_HOOK_CONTEXT_NORMALIZE = "1";
  const ctx = { body: { messages: [host()] }, headers: { "anthropic-beta": "something-else" } };
  const before = JSON.stringify(ctx.body);
  const stats = await runHookContextNormalize(ctx);
  assert.equal(stats.enabled, true);
  assert.equal(stats.beta_ok, false);
  assert.equal(stats.hosts_moved, 0);
  assert.equal(JSON.stringify(ctx.body), before);
  delete process.env.CACHE_FIX_HOOK_CONTEXT_NORMALIZE;
});

test("enabled + beta present rewrites, and reports what it did", async () => {
  process.env.CACHE_FIX_HOOK_CONTEXT_NORMALIZE = "1";
  const ctx = { body: { messages: [host()] }, headers: { "anthropic-beta": BETA } };
  const stats = await runHookContextNormalize(ctx);
  assert.equal(stats.beta_ok, true);
  assert.equal(stats.hosts_moved, 1);
  assert.equal(ctx.body.messages.length, 2);
  assert.equal(ctx.body.messages[1].role, "system");
  assert.equal(ctx.body.messages[1].content, CANON);
  delete process.env.CACHE_FIX_HOOK_CONTEXT_NORMALIZE;
});

test("REGRESSION: the two forms converge to identical bytes", async () => {
  // The defect this extension exists for: request N sends the inline form and
  // request N+1 sends CC's standalone form, and the prefix diverges at the
  // host. After normalization both must serialize identically — this assertion
  // is the whole mitigation, and it fails on the unmitigated bodies.
  process.env.CACHE_FIX_HOOK_CONTEXT_NORMALIZE = "1";
  const headers = { "anthropic-beta": BETA };

  const inlineForm = { body: { messages: [host()] }, headers };
  const ccStandaloneForm = {
    body: {
      messages: [
        { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_1", content: "ok" }] },
        { role: "system", content: CANON },
      ],
    },
    headers,
  };

  assert.notEqual(
    JSON.stringify(inlineForm.body.messages),
    JSON.stringify(ccStandaloneForm.body.messages),
    "precondition: unmitigated, the two forms differ — that IS the bust");

  await runHookContextNormalize(inlineForm);
  await runHookContextNormalize(ccStandaloneForm);

  assert.equal(
    JSON.stringify(inlineForm.body.messages),
    JSON.stringify(ccStandaloneForm.body.messages),
    "after normalization the transition must change no bytes");
  delete process.env.CACHE_FIX_HOOK_CONTEXT_NORMALIZE;
});

test("a throwing/odd ctx never takes the request down", async () => {
  process.env.CACHE_FIX_HOOK_CONTEXT_NORMALIZE = "1";
  for (const ctx of [{}, { body: {} }, { body: { messages: null } }]) {
    const stats = await runHookContextNormalize(ctx);
    assert.equal(stats.hosts_moved, 0);
  }
  delete process.env.CACHE_FIX_HOOK_CONTEXT_NORMALIZE;
});
