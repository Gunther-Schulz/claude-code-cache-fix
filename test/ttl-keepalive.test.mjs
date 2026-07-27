import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";

import ext, {
  resolveKeepaliveSessionKey,
  requiresMinimalMaxTokensFallback,
  selectPingMaxTokens,
  buildPingBody,
  __setClockForTests,
  __resetClockForTests,
  __setForwardRequestForTests,
  __resetForwardRequestForTests,
  __resetStateForTests,
  __getSessionStateForTests,
} from "../proxy/extensions/ttl-keepalive.mjs";

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

// --- Fake clock/scheduler ---
//
// Injectable timer: `setTimer` records {fn, delay} and returns an id; the
// test fires callbacks manually via `fireAll()` instead of waiting real
// wall-clock minutes. `clearTimer` marks the id cancelled so a fired-but-
// cancelled timer never runs its callback.
function makeFakeScheduler() {
  let nextId = 1;
  const timers = new Map(); // id -> { fn, delay, cancelled }
  return {
    setTimer(fn, delay) {
      const id = nextId++;
      timers.set(id, { fn, delay, cancelled: false });
      return id;
    },
    clearTimer(id) {
      const t = timers.get(id);
      if (t) t.cancelled = true;
    },
    // Fires every currently-armed, non-cancelled timer once (in insertion
    // order), then clears the fired set. A ping's re-arm (new setTimer call)
    // during firing is captured in `timers` for a subsequent fireAll() call —
    // this mirrors the real single-timer-per-session lifecycle.
    async fireAll() {
      const toFire = [...timers.entries()].filter(([, t]) => !t.cancelled);
      for (const [id] of toFire) timers.delete(id);
      for (const [, t] of toFire) {
        await t.fn();
      }
    },
    armedCount() {
      return [...timers.values()].filter((t) => !t.cancelled).length;
    },
  };
}

function mkCtx(body, headers = {}, meta = {}) {
  return { body, headers, meta };
}

function baseBody(overrides = {}) {
  return {
    model: "claude-sonnet-4-6",
    system: [{ type: "text", text: "You are Claude" }],
    messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
    max_tokens: 4096,
    stream: true,
    ...overrides,
  };
}

// Fake upstream response: async-iterable stream of Buffer chunks carrying a
// JSON body with a `usage` field, plus a statusCode.
function fakeUpstream({ statusCode = 200, usage = { input_tokens: 10, cache_read_input_tokens: 500 } } = {}) {
  const payload = JSON.stringify({ usage });
  const stream = Readable.from([Buffer.from(payload)]);
  return async () => ({ upstreamRes: stream, statusCode });
}

// =============================================================================
// GATE OFF = INERT
// =============================================================================

test("gate off (CACHE_FIX_KEEPALIVE unset) — onRequest is a no-op, no timer armed", async () => {
  __resetStateForTests();
  const fake = makeFakeScheduler();
  __setClockForTests({ setTimer: fake.setTimer, clearTimer: fake.clearTimer });
  try {
    await withEnvAsync({ CACHE_FIX_KEEPALIVE: undefined }, async () => {
      const ctx = mkCtx(baseBody());
      await ext.onRequest(ctx);
    });
    assert.equal(fake.armedCount(), 0);
    assert.equal(__getSessionStateForTests(resolveKeepaliveSessionKey({}, baseBody().messages)), null);
  } finally {
    __resetClockForTests();
    __resetStateForTests();
  }
});

// =============================================================================
// IDLE TIMER FIRES AT _AT
// =============================================================================

test("idle timer arms at CACHE_FIX_KEEPALIVE_AT seconds and fires a ping on expiry", async () => {
  __resetStateForTests();
  const fake = makeFakeScheduler();
  __setClockForTests({ setTimer: fake.setTimer, clearTimer: fake.clearTimer, now: () => 1000 });
  let pingCalls = 0;
  __setForwardRequestForTests(async (clientReq, bodyBuf) => {
    pingCalls++;
    return { upstreamRes: Readable.from([Buffer.from(JSON.stringify({ usage: { input_tokens: 1 } }))]), statusCode: 200 };
  });
  try {
    await withEnvAsync({ CACHE_FIX_KEEPALIVE: "1", CACHE_FIX_KEEPALIVE_AT: "120" }, async () => {
      const headers = { "x-claude-code-session-id": "sess-timer-1" };
      const ctx = mkCtx(baseBody(), headers, { _ttlTier: "1h" });
      await ext.onRequest(ctx);

      const key = resolveKeepaliveSessionKey(headers, ctx.body.messages);
      const state = __getSessionStateForTests(key);
      assert.ok(state, "session state recorded after real request");
      assert.equal(state.pingCount, 0);
      assert.equal(fake.armedCount(), 1);

      await fake.fireAll();
      assert.equal(pingCalls, 1, "timer fire triggered exactly one ping");
      const after = __getSessionStateForTests(key);
      assert.equal(after.pingCount, 1);
    });
  } finally {
    __resetForwardRequestForTests();
    __resetClockForTests();
    __resetStateForTests();
  }
});

// =============================================================================
// VERBATIM REPLAY WITH max_tokens:0
// =============================================================================

test("buildPingBody: verbatim replay except stream:false and max_tokens:0 (ordinary model)", () => {
  const body = baseBody({ tools: [{ name: "Bash" }], thinking: { type: "enabled", budget_tokens: 1024 } });
  const ping = buildPingBody(body, "claude-sonnet-4-6");
  assert.equal(ping.stream, false);
  assert.equal(ping.max_tokens, 0);
  // Everything else forwarded verbatim (same references, not just equal values).
  assert.equal(ping.messages, body.messages);
  assert.equal(ping.system, body.system);
  assert.equal(ping.tools, body.tools);
  assert.equal(ping.thinking, body.thinking);
  assert.equal(ping.model, body.model);
});

test("sent ping body over the wire: stream false, max_tokens 0, messages verbatim", async () => {
  __resetStateForTests();
  const fake = makeFakeScheduler();
  __setClockForTests({ setTimer: fake.setTimer, clearTimer: fake.clearTimer, now: () => 1000 });
  let capturedBody = null;
  __setForwardRequestForTests(async (clientReq, bodyBuf) => {
    capturedBody = JSON.parse(bodyBuf.toString("utf-8"));
    return { upstreamRes: Readable.from([Buffer.from(JSON.stringify({ usage: {} }))]), statusCode: 200 };
  });
  try {
    await withEnvAsync({ CACHE_FIX_KEEPALIVE: "1", CACHE_FIX_KEEPALIVE_AT: "60" }, async () => {
      const headers = { "x-claude-code-session-id": "sess-verbatim" };
      const body = baseBody({ model: "claude-sonnet-4-6" });
      const ctx = mkCtx(body, headers, { _ttlTier: "1h" });
      await ext.onRequest(ctx);
      await fake.fireAll();
    });
    assert.ok(capturedBody);
    assert.equal(capturedBody.stream, false);
    assert.equal(capturedBody.max_tokens, 0);
    assert.deepEqual(capturedBody.messages, baseBody().messages);
  } finally {
    __resetForwardRequestForTests();
    __resetClockForTests();
    __resetStateForTests();
  }
});

// =============================================================================
// max_tokens:1 FALLBACK WHEN THINKING CANNOT BE DISABLED (fable family)
// =============================================================================

test("requiresMinimalMaxTokensFallback: true for fable/mythos family model strings, false otherwise", () => {
  assert.equal(requiresMinimalMaxTokensFallback("claude-fable-5"), true);
  assert.equal(requiresMinimalMaxTokensFallback("claude-mythos-2"), true);
  assert.equal(requiresMinimalMaxTokensFallback("claude-opus-4-7"), false);
  assert.equal(requiresMinimalMaxTokensFallback("claude-sonnet-4-6"), false);
  assert.equal(requiresMinimalMaxTokensFallback("claude-haiku-4-5-20251001"), false);
  assert.equal(requiresMinimalMaxTokensFallback(undefined), false);
});

test("selectPingMaxTokens: 0 for ordinary models, 1 for always-thinking (fable/mythos) models", () => {
  assert.equal(selectPingMaxTokens("claude-sonnet-4-6"), 0);
  assert.equal(selectPingMaxTokens("claude-opus-4-7"), 0);
  assert.equal(selectPingMaxTokens("claude-fable-5"), 1);
  assert.equal(selectPingMaxTokens("claude-mythos-2"), 1);
});

test("buildPingBody: max_tokens:1 fallback when model is fable-5 (thinking always-on)", () => {
  const body = baseBody({ model: "claude-fable-5" });
  const ping = buildPingBody(body, "claude-fable-5");
  assert.equal(ping.max_tokens, 1);
  assert.equal(ping.stream, false);
});

// =============================================================================
// PING CAP + COUNTER RESET ON REAL REQUEST
// =============================================================================

test("ping cap: stops after CACHE_FIX_KEEPALIVE_MAX_PINGS consecutive pings without a real request", async () => {
  __resetStateForTests();
  const fake = makeFakeScheduler();
  __setClockForTests({ setTimer: fake.setTimer, clearTimer: fake.clearTimer, now: () => 1000 });
  let pingCalls = 0;
  __setForwardRequestForTests(async () => {
    pingCalls++;
    return { upstreamRes: Readable.from([Buffer.from(JSON.stringify({ usage: {} }))]), statusCode: 200 };
  });
  try {
    await withEnvAsync(
      { CACHE_FIX_KEEPALIVE: "1", CACHE_FIX_KEEPALIVE_AT: "60", CACHE_FIX_KEEPALIVE_MAX_PINGS: "2" },
      async () => {
        const headers = { "x-claude-code-session-id": "sess-cap" };
        const ctx = mkCtx(baseBody(), headers, { _ttlTier: "1h" });
        await ext.onRequest(ctx);

        const key = resolveKeepaliveSessionKey(headers, ctx.body.messages);

        // Fire repeatedly — each ping re-arms until the cap.
        await fake.fireAll(); // ping 1, re-arms
        await fake.fireAll(); // ping 2, cap reached, no re-arm
        await fake.fireAll(); // nothing armed — no-op

        assert.equal(pingCalls, 2, "exactly MAX_PINGS pings fired");
        assert.equal(__getSessionStateForTests(key).pingCount, 2);
        assert.equal(fake.armedCount(), 0, "no timer re-armed after cap reached");
      },
    );
  } finally {
    __resetForwardRequestForTests();
    __resetClockForTests();
    __resetStateForTests();
  }
});

test("counter resets to 0 on any real request", async () => {
  __resetStateForTests();
  const fake = makeFakeScheduler();
  __setClockForTests({ setTimer: fake.setTimer, clearTimer: fake.clearTimer, now: () => 1000 });
  __setForwardRequestForTests(async () => ({
    upstreamRes: Readable.from([Buffer.from(JSON.stringify({ usage: {} }))]),
    statusCode: 200,
  }));
  try {
    await withEnvAsync({ CACHE_FIX_KEEPALIVE: "1", CACHE_FIX_KEEPALIVE_AT: "60" }, async () => {
      const headers = { "x-claude-code-session-id": "sess-reset" };
      const key = resolveKeepaliveSessionKey(headers, baseBody().messages);

      await ext.onRequest(mkCtx(baseBody(), headers, { _ttlTier: "1h" }));
      await fake.fireAll(); // ping 1
      assert.equal(__getSessionStateForTests(key).pingCount, 1);

      // A real request arrives — counter resets and a fresh timer is armed.
      await ext.onRequest(mkCtx(baseBody(), headers, { _ttlTier: "1h" }));
      assert.equal(__getSessionStateForTests(key).pingCount, 0);
      assert.equal(fake.armedCount(), 1, "exactly one fresh timer armed after real request");
    });
  } finally {
    __resetForwardRequestForTests();
    __resetClockForTests();
    __resetStateForTests();
  }
});

// =============================================================================
// OVERAGE / 5m-TTL SIGNAL DISABLES
// =============================================================================

test("5m tier signal (ctx.meta._ttlTier === '5m') disables keepalive for the session — no timer armed", async () => {
  __resetStateForTests();
  const fake = makeFakeScheduler();
  __setClockForTests({ setTimer: fake.setTimer, clearTimer: fake.clearTimer });
  try {
    await withEnvAsync({ CACHE_FIX_KEEPALIVE: "1", CACHE_FIX_KEEPALIVE_AT: "60" }, async () => {
      const headers = { "x-claude-code-session-id": "sess-5m" };
      const ctx = mkCtx(baseBody(), headers, { _ttlTier: "5m" });
      await ext.onRequest(ctx);

      const key = resolveKeepaliveSessionKey(headers, ctx.body.messages);
      assert.equal(__getSessionStateForTests(key), null, "no session state recorded under 5m tier");
      assert.equal(fake.armedCount(), 0);
    });
  } finally {
    __resetClockForTests();
    __resetStateForTests();
  }
});

test("session previously armed under 1h tier, then a request arrives with 5m tier — timer is cancelled", async () => {
  __resetStateForTests();
  const fake = makeFakeScheduler();
  __setClockForTests({ setTimer: fake.setTimer, clearTimer: fake.clearTimer });
  try {
    await withEnvAsync({ CACHE_FIX_KEEPALIVE: "1", CACHE_FIX_KEEPALIVE_AT: "60" }, async () => {
      const headers = { "x-claude-code-session-id": "sess-tier-flip" };
      const key = resolveKeepaliveSessionKey(headers, baseBody().messages);

      await ext.onRequest(mkCtx(baseBody(), headers, { _ttlTier: "1h" }));
      assert.equal(fake.armedCount(), 1);

      await ext.onRequest(mkCtx(baseBody(), headers, { _ttlTier: "5m" }));
      assert.equal(fake.armedCount(), 0, "1h timer cancelled, no new timer armed under 5m");
      assert.equal(__getSessionStateForTests(key), null);
    });
  } finally {
    __resetClockForTests();
    __resetStateForTests();
  }
});

// =============================================================================
// SUBAGENT SCOPE (main-thread sessions only)
// =============================================================================

test("subagent request (detectRequestType !== 'main') is ignored — no timer armed", async () => {
  __resetStateForTests();
  const fake = makeFakeScheduler();
  __setClockForTests({ setTimer: fake.setTimer, clearTimer: fake.clearTimer });
  try {
    await withEnvAsync({ CACHE_FIX_KEEPALIVE: "1", CACHE_FIX_KEEPALIVE_AT: "60" }, async () => {
      const subagentBody = baseBody({
        system: [{ type: "text", text: "You are a Claude agent, built on Anthropic's Claude Agent SDK." }],
      });
      const ctx = mkCtx(subagentBody, {}, { _ttlTier: "1h" });
      await ext.onRequest(ctx);
      assert.equal(fake.armedCount(), 0);
    });
  } finally {
    __resetClockForTests();
    __resetStateForTests();
  }
});

// =============================================================================
// SESSION KEY RESOLUTION
// =============================================================================

test("resolveKeepaliveSessionKey: prefers session-id header, falls back to message hash", () => {
  const withHeader = resolveKeepaliveSessionKey(
    { "x-claude-code-session-id": "abc-123" },
    [{ role: "user", content: [{ type: "text", text: "hi" }] }],
  );
  assert.equal(withHeader, "s-abc-123");

  const withoutHeader = resolveKeepaliveSessionKey(null, [{ role: "user", content: [{ type: "text", text: "hi" }] }]);
  assert.match(withoutHeader, /^c-/);
});
