import { test } from "node:test";
import assert from "node:assert/strict";

import ext, {
  hashMessageContent,
  computeRungDepth,
  findUserMessageAtOrBefore,
  computeLadderPlacement,
  resolveLadderSessionKey,
  resetLadderState,
} from "../proxy/extensions/mid-history-breakpoint-ladder.mjs";

// --- Fixture helpers (mirrors proxy-messages-cache-breakpoint.test.mjs idiom) ---

function userMsg(text, extra = {}) {
  return { role: "user", content: [{ type: "text", text, ...extra }] };
}

function assistantMsg(text) {
  return { role: "assistant", content: [{ type: "text", text }] };
}

// Build an alternating user/assistant conversation of `n` messages, starting
// and ending on a user turn where possible. messages[0] stays identical
// (by index/text) across calls in a test unless explicitly noted, since the
// session key (no headers) falls back to a hash of messages[0].
function buildConversation(n, { seed = "conv" } = {}) {
  const messages = [];
  for (let i = 0; i < n; i++) {
    messages.push(i % 2 === 0 ? userMsg(`${seed}-user-${i}`) : assistantMsg(`${seed}-assistant-${i}`));
  }
  return messages;
}

function makeBody(messages) {
  return { model: "claude-opus-4-7", messages };
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

// Silence stderr summary lines during a callback; restores after.
async function silenced(fn) {
  const origWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = () => true;
  try {
    return await fn();
  } finally {
    process.stderr.write = origWrite;
  }
}

async function runExt(body, { headers } = {}) {
  const ctx = { body, meta: {}, headers: headers || {} };
  await ext.onRequest(ctx);
  return ctx;
}

// --- 1. Placement math: 50% depth, user-role only ---

test("computeRungDepth: 50% of 100 messages → 50", () => {
  assert.equal(computeRungDepth(100, 0.5), 50);
});

test("findUserMessageAtOrBefore: lands on nearest user message at or before target", () => {
  const messages = buildConversation(10); // even idx = user, odd = assistant
  // target 5 is assistant -> nearest user at-or-before is 4
  assert.equal(findUserMessageAtOrBefore(messages, 5), 4);
  // target 4 is already user
  assert.equal(findUserMessageAtOrBefore(messages, 4), 4);
});

test("findUserMessageAtOrBefore: returns -1 when no user message exists in range", () => {
  const messages = [assistantMsg("only assistant")];
  assert.equal(findUserMessageAtOrBefore(messages, 0), -1);
});

test("placement at 50% on user-role only: rung lands on a user message, never assistant", () => {
  const messages = buildConversation(100, { seed: "p50" });
  const placement = computeLadderPlacement(messages, null, 1, 40);
  assert.equal(placement.length, 1);
  const rung = placement[0];
  assert.equal(rung.status, "placed");
  assert.ok(rung.idx >= 0);
  assert.equal(messages[rung.idx].role, "user");
  // Target depth is floor(100*0.5)=50 which is a user index (even) already.
  assert.equal(rung.idx, 50);
});

// --- 2. Sticky under pure append ---

test("sticky under pure append: rung stays on the identical message index+hash", () => {
  resetLadderState();
  const messages1 = buildConversation(100, { seed: "sticky" });
  const first = computeLadderPlacement(messages1, null, 1, 40);
  assert.equal(first[0].status, "placed");
  const rungIdx = first[0].idx;
  const rungHash = first[0].hash;

  // Append 10 more messages (below the advance threshold of 40) — pure
  // append, messages[0..rungIdx] byte-identical.
  const messages2 = messages1.concat(buildConversation(10, { seed: "sticky-tail" }));
  const second = computeLadderPlacement(messages2, first, 1, 40);
  assert.equal(second[0].status, "sticky");
  assert.equal(second[0].idx, rungIdx);
  assert.equal(second[0].hash, rungHash);
});

// --- 3. Advance after threshold ---

test("advance after threshold: rung re-places at new 50% depth once tail grows >= CACHE_FIX_LADDER_ADVANCE", () => {
  const messages1 = buildConversation(100, { seed: "advance" });
  const first = computeLadderPlacement(messages1, null, 1, 40);
  const rungIdx = first[0].idx; // 50

  // Grow the tail by exactly the threshold (40) messages past the rung.
  const messages2 = messages1.concat(buildConversation(40, { seed: "advance-tail" }));
  const second = computeLadderPlacement(messages2, first, 1, 40);
  assert.equal(second[0].status, "advanced");
  // New target depth: floor(140*0.5) = 70, which should be strictly ahead
  // of the old rung.
  assert.ok(second[0].idx > rungIdx);
  assert.equal(messages2[second[0].idx].role, "user");
});

test("advance: below-threshold growth stays sticky (does not advance early)", () => {
  const messages1 = buildConversation(100, { seed: "no-advance" });
  const first = computeLadderPlacement(messages1, null, 1, 40);
  const rungIdx = first[0].idx;

  const messages2 = messages1.concat(buildConversation(39, { seed: "no-advance-tail" }));
  const second = computeLadderPlacement(messages2, first, 1, 40);
  assert.equal(second[0].status, "sticky");
  assert.equal(second[0].idx, rungIdx);
});

// --- 4. Budget no-op at 4 markers ---

test("budget no-op at 4 markers: extension no-ops and logs, body unchanged", async () => {
  resetLadderState();
  const messages = [
    userMsg("m0", { cache_control: { type: "ephemeral" } }), // marker 1
    assistantMsg("a1"),
    userMsg("m2", { cache_control: { type: "ephemeral" } }), // marker 2
    assistantMsg("a3"),
    userMsg("m4", { cache_control: { type: "ephemeral" } }), // marker 3
    assistantMsg("a5"),
    userMsg("m6", { cache_control: { type: "ephemeral" } }), // marker 4 — at budget
  ];
  const body = makeBody(messages);
  const before = JSON.stringify(body);

  const captured = [];
  const origWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk) => {
    captured.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  };
  let ctx;
  try {
    await withEnvAsync({ CACHE_FIX_LADDER: "1" }, async () => {
      ctx = await runExt(body);
    });
  } finally {
    process.stderr.write = origWrite;
  }

  assert.equal(JSON.stringify(body), before, "body must not mutate at marker budget");
  assert.equal(ctx.meta.ladderStats.skipped, true);
  assert.equal(ctx.meta.ladderStats.reason, "budget");
  assert.ok(
    captured.some((l) => l.includes("ladder=skipped") || l.includes("skipped reason=budget")),
    `expected a budget-skip log line, got: ${JSON.stringify(captured)}`,
  );
});

// --- 5. Opt-in gate off ⇒ passthrough untouched ---

test("opt-in gate off: CACHE_FIX_LADDER unset -> extension is a no-op (no mutation, no telemetry)", async () => {
  resetLadderState();
  const messages = buildConversation(100, { seed: "gate-off" });
  // Give it 2 existing markers so budget would otherwise allow placement.
  messages[0].content[0].cache_control = { type: "ephemeral" };
  const lastUser = messages[messages.length - 2];
  lastUser.content[lastUser.content.length - 1] = {
    ...lastUser.content[lastUser.content.length - 1],
    cache_control: { type: "ephemeral" },
  };
  const body = makeBody(messages);
  const before = JSON.stringify(body);

  let ctx;
  await withEnvAsync({ CACHE_FIX_LADDER: undefined }, async () => {
    ctx = await runExt(body);
  });

  assert.equal(JSON.stringify(body), before, "body must be untouched when gate is off");
  assert.equal(ctx.meta.ladderStats, undefined, "no telemetry when gate is off");
});

// --- 6. Assistant-message never touched ---

test("assistant-message never touched: rung placement never adds cache_control to an assistant message", async () => {
  resetLadderState();
  const messages = buildConversation(100, { seed: "no-assistant" });
  // Seed one existing marker so budget allows placement without hitting the cap.
  messages[0].content[0].cache_control = { type: "ephemeral" };
  const body = makeBody(messages);

  await silenced(() =>
    withEnvAsync({ CACHE_FIX_LADDER: "1" }, async () => {
      await runExt(body);
    }),
  );

  for (const msg of body.messages) {
    if (msg.role !== "assistant") continue;
    for (const block of msg.content) {
      assert.equal(
        block.cache_control,
        undefined,
        `assistant message unexpectedly marked: ${JSON.stringify(block)}`,
      );
    }
  }
});

test("end-to-end onRequest: places a marker on a user message at ~50% depth when gate is on", async () => {
  resetLadderState();
  const messages = buildConversation(100, { seed: "e2e" });
  messages[0].content[0].cache_control = { type: "ephemeral" }; // 1 existing marker
  const body = makeBody(messages);

  let ctx;
  await silenced(() =>
    withEnvAsync({ CACHE_FIX_LADDER: "1" }, async () => {
      ctx = await runExt(body);
    }),
  );

  assert.equal(ctx.meta.ladderStats.skipped, false);
  assert.equal(ctx.meta.ladderStats.rungs.length, 1);
  const rungIdx = ctx.meta.ladderStats.rungs[0].idx;
  assert.equal(body.messages[rungIdx].role, "user");
  const content = body.messages[rungIdx].content;
  assert.deepEqual(content[content.length - 1].cache_control, { type: "ephemeral" });
});

// --- Session key resolution ---

test("resolveLadderSessionKey: prefers session-id header over content hash", () => {
  const messages = buildConversation(10, { seed: "key" });
  const withHeader = resolveLadderSessionKey({ "x-claude-code-session-id": "abc123" }, messages);
  const withoutHeader = resolveLadderSessionKey({}, messages);
  assert.notEqual(withHeader, withoutHeader);
  assert.ok(withHeader.startsWith("s-"));
  assert.ok(withoutHeader.startsWith("c-"));
});

// --- hashMessageContent ignores cache_control ---

test("hashMessageContent: identical modulo cache_control hashes equal", () => {
  const a = userMsg("same text");
  const b = userMsg("same text", { cache_control: { type: "ephemeral" } });
  assert.equal(hashMessageContent(a), hashMessageContent(b));
});

test("hashMessageContent: different text hashes differently", () => {
  const a = userMsg("text a");
  const b = userMsg("text b");
  assert.notEqual(hashMessageContent(a), hashMessageContent(b));
});
