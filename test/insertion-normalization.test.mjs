import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ext, {
  computeIdentities,
  classifyInsertion,
  validateToolAdjacency,
  resolveInsertionSessionKey,
} from "../proxy/extensions/insertion-normalization.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Helpers ---

function userMsg(text) {
  return { role: "user", content: [{ type: "text", text }] };
}
function assistantMsg(text) {
  return { role: "assistant", content: [{ type: "text", text }] };
}
function toolUseMsg(id, name = "Bash") {
  return { role: "assistant", content: [{ type: "tool_use", id, name, input: {} }] };
}
function toolResultMsg(toolUseId, text = "result") {
  return { role: "user", content: [{ type: "tool_result", tool_use_id: toolUseId, content: text }] };
}

function conv(n, seed = "c") {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(i % 2 === 0 ? userMsg(`${seed}-u${i}`) : assistantMsg(`${seed}-a${i}`));
  }
  return out;
}

async function newTmp() {
  return mkdtemp(join(tmpdir(), "insertion-norm-test-"));
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

async function silenced(fn) {
  const orig = process.stderr.write.bind(process.stderr);
  process.stderr.write = () => true;
  try {
    return await fn();
  } finally {
    process.stderr.write = orig;
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

// =====================================================================
// Pure classifier tests
// =====================================================================

test("pure append: canonical is a strict prefix, no splice -> action append-only, messages unchanged", () => {
  const prior = conv(10, "append");
  const priorCanon = computeIdentities(prior).map((e) => ({ h: e.h, r: e.r, o: e.o }));
  const incoming = prior.concat(conv(2, "append-tail"));

  const result = classifyInsertion(incoming, priorCanon);
  assert.equal(result.action, "append-only");
  assert.deepEqual(result.messages, incoming);
  assert.equal(result.inserted, 2);
});

test("single user-role mid-insertion: normalized to tail, cache-relevant prefix byte-identical to canonical", () => {
  const prior = conv(10, "mid");
  const priorCanon = computeIdentities(prior).map((e) => ({ h: e.h, r: e.r, o: e.o }));

  // Splice one new user message between prior[4] and prior[5].
  const incoming = prior.slice(0, 5).concat([userMsg("mid-inserted")], prior.slice(5));

  const result = classifyInsertion(incoming, priorCanon);
  assert.equal(result.action, "normalized");
  assert.equal(result.inserted, 1);
  // Cache-relevant prefix: canonical order first, byte-identical to `prior`.
  assert.deepEqual(result.messages.slice(0, prior.length), prior);
  // New entry appended at the tail.
  assert.deepEqual(result.messages[prior.length], userMsg("mid-inserted"));
});

test("multiple insertions keep relative order", () => {
  const prior = conv(10, "multi");
  const priorCanon = computeIdentities(prior).map((e) => ({ h: e.h, r: e.r, o: e.o }));

  const insertA = userMsg("insert-A");
  const insertB = userMsg("insert-B");
  // Both spliced between prior[3] and prior[4], in order A then B.
  const incoming = prior.slice(0, 4).concat([insertA, insertB], prior.slice(4));

  const result = classifyInsertion(incoming, priorCanon);
  assert.equal(result.action, "normalized");
  assert.equal(result.inserted, 2);
  assert.deepEqual(result.messages.slice(0, prior.length), prior);
  assert.deepEqual(result.messages[prior.length], insertA);
  assert.deepEqual(result.messages[prior.length + 1], insertB);
});

test("assistant-role insertion -> reset (never reorders an assistant message)", () => {
  const prior = conv(10, "asst");
  const priorCanon = computeIdentities(prior).map((e) => ({ h: e.h, r: e.r, o: e.o }));

  const incoming = prior.slice(0, 4).concat([assistantMsg("unexpected-assistant-insert")], prior.slice(4));

  const result = classifyInsertion(incoming, priorCanon);
  assert.equal(result.action, "reset");
  assert.equal(result.resetReason, "assistant-interleaved");
});

test("shrunk history (fewer messages than canonical) -> reset", () => {
  const prior = conv(10, "shrink");
  const priorCanon = computeIdentities(prior).map((e) => ({ h: e.h, r: e.r, o: e.o }));

  const incoming = prior.slice(0, 6); // fewer than canonical's 10 entries
  const result = classifyInsertion(incoming, priorCanon);
  assert.equal(result.action, "reset");
  // A shorter array cannot contain every canonical identity, so it fails
  // the subsequence match.
  assert.equal(result.resetReason, "not-subsequence");
});

test("tool_result adjacency violation -> reset even when insertion would otherwise qualify", () => {
  // Canonical ends on a plain user turn (u3) that is NOT part of the
  // tool_use/tool_result pair — this is what makes the inserted entries
  // count as a genuine mid-canonical splice (index <= lastMatched) rather
  // than ordinary tail growth, so the splice path (and its adjacency
  // check) actually runs.
  const tu = toolUseMsg("tu-1");
  const trOrig = toolResultMsg("tu-1", "orig-result");
  const u3 = userMsg("u3-final-canonical");
  const prior = [userMsg("p0"), tu, trOrig, u3];
  const priorCanon = computeIdentities(prior).map((e) => ({ h: e.h, r: e.r, o: e.o }));

  // Two new user-role entries spliced between trOrig and u3: an unrelated
  // message, then a DIFFERENT tool_result for the same tu-1 id (content
  // differs from trOrig, so it doesn't match that canonical identity and
  // is treated as new). Re-serializing (canonical order + new entries
  // appended) would place the unrelated message directly before this new
  // tool_result, separating it from its tool_use — must reset instead.
  const otherNew = userMsg("unrelated queued message");
  const trDiffering = toolResultMsg("tu-1", "different-late-result");
  const incoming = [userMsg("p0"), tu, trOrig, otherNew, trDiffering, u3];

  const result = classifyInsertion(incoming, priorCanon);
  assert.equal(result.action, "reset");
  assert.equal(result.resetReason, "adjacency-violation");
});

test("validateToolAdjacency: true for well-formed tool_use/tool_result pairing", () => {
  const tu = toolUseMsg("tu-2");
  const tr = toolResultMsg("tu-2");
  assert.equal(validateToolAdjacency([userMsg("a"), tu, tr]), true);
});

test("validateToolAdjacency: false when tool_result's preceding message isn't the matching tool_use", () => {
  const tu = toolUseMsg("tu-3");
  const tr = toolResultMsg("tu-3");
  assert.equal(validateToolAdjacency([userMsg("a"), tu, userMsg("intervening"), tr]), false);
});

test("duplicate identical user messages disambiguated by occurrence counter", () => {
  const dup = userMsg("same text every time");
  const prior = [userMsg("p0"), dup, userMsg("p2"), dup];
  const identities = computeIdentities(prior);
  // Both `dup` entries share the same hash+role but must get distinct
  // occurrence indices (0 and 1).
  const dupEntries = identities.filter((e) => e.h === identities[1].h && e.r === "user");
  assert.deepEqual(
    dupEntries.map((e) => e.o).sort(),
    [0, 1],
  );
});

test("no prior canonical -> reset with reason no-prior-canonical (first request in a session)", () => {
  const incoming = conv(4, "first");
  const result = classifyInsertion(incoming, null);
  assert.equal(result.action, "reset");
  assert.equal(result.resetReason, "no-prior-canonical");
  assert.equal(result.canonicalEntries.length, 4);
});

// =====================================================================
// Extension-level tests (env gate, persistence, telemetry)
// =====================================================================

test("gate off: CACHE_FIX_INSERTION_NORMALIZE unset -> passthrough byte-identical, no telemetry file written", async () => {
  const dir = await newTmp();
  try {
    const messages = conv(6, "gate-off");
    const body = { model: "claude-opus-4-7", messages };
    const before = JSON.stringify(body);

    let ctx;
    await withEnvAsync({ CACHE_FIX_INSERTION_NORMALIZE: undefined }, async () => {
      ctx = await runExt(body, { dir });
    });

    assert.equal(JSON.stringify(body), before, "body must be untouched when gate is off");
    assert.equal(ctx.meta.insertionNormalizeStats, undefined, "no telemetry when gate is off");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("canonical persistence round-trip: write, reload, continue (append-only across two requests)", async () => {
  const dir = await newTmp();
  try {
    const headers = { "x-claude-code-session-id": "sess-roundtrip" };
    const messages1 = conv(6, "rt");
    const body1 = { model: "claude-opus-4-7", messages: messages1 };

    let ctx1;
    await silenced(() =>
      withEnvAsync({ CACHE_FIX_INSERTION_NORMALIZE: "1" }, async () => {
        ctx1 = await runExt(body1, { headers, dir });
      }),
    );
    assert.equal(ctx1.meta.insertionNormalizeStats.action, "reset");
    assert.equal(ctx1.meta.insertionNormalizeStats.resetReason, "no-prior-canonical");

    // Second request: pure append of 2 more messages. Canonical was
    // persisted by request 1 — this call must reload it from disk (fresh
    // ctx, same extension module) rather than relying on in-memory state.
    const messages2 = messages1.concat(conv(2, "rt-tail"));
    const body2 = { model: "claude-opus-4-7", messages: messages2 };
    let ctx2;
    await silenced(() =>
      withEnvAsync({ CACHE_FIX_INSERTION_NORMALIZE: "1" }, async () => {
        ctx2 = await runExt(body2, { headers, dir });
      }),
    );
    assert.equal(ctx2.meta.insertionNormalizeStats.action, "append-only");
    assert.equal(ctx2.meta.insertionNormalizeStats.inserted, 2);
    assert.equal(JSON.stringify(body2.messages), JSON.stringify(messages2));

    // Third request: a real mid-history splice — must reload request 2's
    // persisted canonical (8 entries) and correctly detect the splice.
    // Insert BEFORE the last two canonical entries (not at the tail) so
    // this is a genuine splice, not ordinary append growth.
    const spliced = messages2
      .slice(0, 6)
      .concat([userMsg("late-splice")], messages2.slice(6));
    const body3 = { model: "claude-opus-4-7", messages: spliced };
    let ctx3;
    await silenced(() =>
      withEnvAsync({ CACHE_FIX_INSERTION_NORMALIZE: "1" }, async () => {
        ctx3 = await runExt(body3, { headers, dir });
      }),
    );
    assert.equal(ctx3.meta.insertionNormalizeStats.action, "normalized");
    assert.equal(ctx3.meta.insertionNormalizeStats.inserted, 1);
    assert.deepEqual(body3.messages.slice(0, messages2.length), messages2);
    assert.deepEqual(body3.messages[messages2.length], userMsg("late-splice"));

    // Telemetry file exists with 3 lines, one per action. No system prompt
    // was set on any of the three bodies, so all three land in the same
    // "nosys" sub-key bucket.
    const key = "s-sess-roundtrip-nosys";
    const telemetryFile = join(dir, "cache-fix-snapshots", `${key}-insertion-events.jsonl`);
    const lines = (await readFile(telemetryFile, "utf-8")).trim().split("\n");
    assert.equal(lines.length, 3);
    const actions = lines.map((l) => JSON.parse(l).action);
    assert.deepEqual(actions, ["reset", "append-only", "normalized"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("session key resolution: session-id header takes precedence over content-hash fallback", () => {
  const messages = conv(4, "key");
  const withHeader = resolveInsertionSessionKey({ "x-claude-code-session-id": "abc123" }, messages);
  const withoutHeader = resolveInsertionSessionKey({}, messages);
  assert.notEqual(withHeader, withoutHeader);
  assert.ok(withHeader.startsWith("s-"));
  assert.ok(withoutHeader.startsWith("c-"));
});

// =====================================================================
// Sidecar sub-keying (threat-matrix row 14)
// =====================================================================

test("session key resolution: same session-id, different system prompt -> different sub-key", () => {
  const messages = conv(4, "sidecar-key");
  const headers = { "x-claude-code-session-id": "shared-sid" };
  const mainKey = resolveInsertionSessionKey(headers, messages, [{ type: "text", text: "You are Claude Code" }]);
  const sidecarKey = resolveInsertionSessionKey(headers, messages, [{ type: "text", text: "Generate a short title" }]);
  assert.notEqual(mainKey, sidecarKey);
  assert.ok(mainKey.startsWith("s-shared-sid-"));
  assert.ok(sidecarKey.startsWith("s-shared-sid-"));
});

test("session key resolution: same session-id + same system prompt -> same sub-key (stable across calls)", () => {
  const messages = conv(4, "stable-key");
  const headers = { "x-claude-code-session-id": "shared-sid-2" };
  const system = [{ type: "text", text: "You are Claude Code" }];
  const k1 = resolveInsertionSessionKey(headers, messages, system);
  const k2 = resolveInsertionSessionKey(headers, messages, system);
  assert.equal(k1, k2);
});

test("session key resolution: absent system prompt -> stable 'nosys' bucket, distinct from a present one", () => {
  const messages = conv(4, "nosys-key");
  const headers = { "x-claude-code-session-id": "shared-sid-3" };
  const withSystem = resolveInsertionSessionKey(headers, messages, [{ type: "text", text: "sys" }]);
  const withoutSystem = resolveInsertionSessionKey(headers, messages, undefined);
  assert.notEqual(withSystem, withoutSystem);
  assert.ok(withoutSystem.endsWith("-nosys"));
});

test("two interleaved streams under one session-id (main thread + sidecar) keep independent canonicals, neither thrashes the other", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-interleave" };
  const mainSystem = [{ type: "text", text: "You are Claude Code, Anthropic's official CLI for Claude." }];
  const sidecarSystem = [{ type: "text", text: "Generate a concise 5-word title for this conversation." }];
  try {
    await silenced(() =>
      withEnvAsync({ CACHE_FIX_INSERTION_NORMALIZE: "1" }, async () => {
        // Main thread request 1: establishes canonical.
        const mainMessages1 = conv(6, "main");
        const mainBody1 = { model: "claude-opus-4-7", system: mainSystem, messages: mainMessages1 };
        const mainCtx1 = await runExt(mainBody1, { headers, dir });
        assert.equal(mainCtx1.meta.insertionNormalizeStats.action, "reset");
        assert.equal(mainCtx1.meta.insertionNormalizeStats.resetReason, "no-prior-canonical");

        // Sidecar request (title-gen), same session-id header, different
        // system prompt, entirely unrelated single-turn messages. Before
        // the fix this would have been compared against the main thread's
        // canonical and thrashed it to reset.
        const sidecarMessages = [userMsg("please title this conversation")];
        const sidecarBody = { model: "claude-haiku-4-5", system: sidecarSystem, messages: sidecarMessages };
        const sidecarCtx = await runExt(sidecarBody, { headers, dir });
        assert.equal(sidecarCtx.meta.insertionNormalizeStats.action, "reset");
        assert.equal(sidecarCtx.meta.insertionNormalizeStats.resetReason, "no-prior-canonical", "sidecar's own first-seen, not a thrash of the main thread's canonical");

        // Main thread request 2: pure append of 2 more messages. Must
        // reload MAIN'S OWN canonical (6 entries) from request 1 — not
        // reset, and not polluted by the sidecar call in between.
        const mainMessages2 = mainMessages1.concat(conv(2, "main-tail"));
        const mainBody2 = { model: "claude-opus-4-7", system: mainSystem, messages: mainMessages2 };
        const mainCtx2 = await runExt(mainBody2, { headers, dir });
        assert.equal(mainCtx2.meta.insertionNormalizeStats.action, "append-only", "main thread's canonical survived the interleaved sidecar call");
        assert.equal(mainCtx2.meta.insertionNormalizeStats.inserted, 2);

        // A second sidecar call (another title-gen turn, same system
        // prompt) similarly should not disturb, and should build its OWN
        // append-only history rather than resetting every time.
        const sidecarMessages2 = sidecarMessages.concat([assistantMsg("Title: proxy fixes")]);
        const sidecarBody2 = { model: "claude-haiku-4-5", system: sidecarSystem, messages: sidecarMessages2 };
        const sidecarCtx2 = await runExt(sidecarBody2, { headers, dir });
        assert.equal(sidecarCtx2.meta.insertionNormalizeStats.action, "append-only", "sidecar's own canonical persisted across its own turns");
      }),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("old-format (pre-sub-key) state file is ignored gracefully -> treated as no-prior-canonical, not a crash", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-oldformat" };
  const system = [{ type: "text", text: "You are Claude Code" }];
  try {
    // Simulate a leftover pre-sub-key state file at the OLD path (no
    // system sub-key suffix) — the new code never reads this path, so it
    // must be silently abandoned rather than erroring.
    const { mkdir: mkdirP, writeFile: writeFileP } = await import("node:fs/promises");
    const snapshotDir = join(dir, "cache-fix-snapshots");
    await mkdirP(snapshotDir, { recursive: true });
    await writeFileP(
      join(snapshotDir, "s-sess-oldformat-insertion-canon.json"),
      JSON.stringify({ entries: [{ h: "stale-hash", r: "user", o: 0 }] }),
    );

    await silenced(() =>
      withEnvAsync({ CACHE_FIX_INSERTION_NORMALIZE: "1" }, async () => {
        const messages = conv(4, "oldformat");
        const body = { model: "claude-opus-4-7", system, messages };
        const ctx = await runExt(body, { headers, dir });
        // New sub-keyed path has no file yet -> ordinary first-seen reset,
        // not a crash and not accidentally matching the stale entries.
        assert.equal(ctx.meta.insertionNormalizeStats.action, "reset");
        assert.equal(ctx.meta.insertionNormalizeStats.resetReason, "no-prior-canonical");
      }),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// =====================================================================
// Fixture-driven repro: the 2026-07-27 14:05 shape
// =====================================================================

test("fixture insertion-1405: normalization yields the arrival-order serialization", async () => {
  const fixturePath = join(__dirname, "fixtures", "insertion-1405.json");
  const raw = await readFile(fixturePath, "utf-8");
  const fixture = JSON.parse(raw);

  const priorCanon = computeIdentities(fixture.priorMessages).map((e) => ({ h: e.h, r: e.r, o: e.o }));
  const result = classifyInsertion(fixture.incomingMessages, priorCanon);

  assert.equal(result.action, "normalized");
  assert.equal(result.inserted, 2);
  // Arrival-order serialization: prior canonical order first...
  assert.deepEqual(result.messages.slice(0, fixture.priorMessages.length), fixture.priorMessages);
  // ...then the two new entries in their incoming relative order.
  assert.deepEqual(result.messages[fixture.priorMessages.length].content[0].text, "queued-message: operator says pause before deploy");
  assert.deepEqual(
    result.messages[fixture.priorMessages.length + 1].content[0].text,
    "<system-reminder>\nThe task tools haven't been used recently.\n</system-reminder>",
  );
});

// =====================================================================
// String-content identity (regression, 2026-07-27)
// =====================================================================
//
// hashMessageContent returns null unless `content` is a block ARRAY, and CC
// sends many messages whose content is a plain string. The fallback identity
// used to be `noContent:${i}` — the array INDEX — so such a message's identity
// WAS its position. The first insertion ahead of one shifted it, the canonical
// lookup missed, and the classifier reset with "not-subsequence": the
// extension broke on exactly the event it exists to absorb. Live measurement
// that day: 83 index-keyed entries in one sub-key, 125 resets over 350
// requests.

test("string-content message keeps its identity when an insertion shifts its index", () => {
  const sys = (t) => ({ role: "system", content: t });   // string, not blocks
  const prior = [
    userMsg("q1"),
    { role: "assistant", content: [{ type: "text", text: "a1" }] },
    sys("sys-note"),
    userMsg("q2"),
  ];
  const priorCanon = computeIdentities(prior).map((e) => ({ h: e.h, r: e.r, o: e.o }));

  // Insert a mid-conversation system message BEFORE the string-content one,
  // shifting its index from 2 to 3.
  const incoming = [
    prior[0],
    sys("MID-TURN NOTE"),
    prior[1],
    prior[2],
    prior[3],
    { role: "assistant", content: [{ type: "text", text: "a2" }] },
  ];

  const result = classifyInsertion(incoming, priorCanon);
  assert.notEqual(result.action, "reset", `must not reset: ${result.resetReason ?? ""}`);
  assert.equal(result.action, "normalized");
});

test("string-content identity is content-derived, not positional", () => {
  const sys = (t) => ({ role: "system", content: t });
  const atTwo = computeIdentities([userMsg("a"), userMsg("b"), sys("same text")]);
  const atThree = computeIdentities([userMsg("a"), userMsg("b"), userMsg("c"), sys("same text")]);
  assert.equal(
    atTwo[2].h,
    atThree[3].h,
    "identical string content must hash identically regardless of position",
  );
  // Different content must still differ.
  const other = computeIdentities([sys("different text")]);
  assert.notEqual(atTwo[2].h, other[0].h);
});

test("a genuinely contentless message still falls back to the index", () => {
  const ids = computeIdentities([userMsg("a"), { role: "system" }]);
  assert.match(ids[1].h, /^noContent:1$/);
});
