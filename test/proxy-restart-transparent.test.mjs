// Restart-transparent serialization — acceptance test per
// docs/directives/proxy-restart-transparent-state.md and the audit at
// docs/audits/restart-state-audit.md.
//
// Acceptance criterion (directive): "a test that serializes a request,
// simulates process restart (fresh module state, reload persisted files),
// replays the same incoming request, asserts BYTE-IDENTICAL output."
//
// Covers the audit's DETERMINISTIC class (sort-stabilization,
// fresh-session-sort, tool-input-normalize, identity-normalization,
// content-strip) — for these, "restart" is simulated via a fresh dynamic
// `import()` with a cache-busting query string (fresh module-scope state,
// same idiom as test/proxy-prefix-diff.test.mjs's hot-reload test) and
// asserts the output is byte-identical to a non-restarted run on the same
// input. Also covers insertion-normalization's disk-reload path (the one
// stateful-persisted extension the directive names for reload-path
// verification): canonical state survives a restart via the snapshots-dir
// file, verified against a real CLAUDE_CONFIG_DIR-scoped tmp directory.
//
// mid-history-breakpoint-ladder is DELIBERATELY NOT covered here — the
// audit found it stateful-UNPERSISTED (contradicting the directive's own
// "rungs persisted (check)" claim) and surfaced that as a gap rather than
// fixing it; a byte-identical-restart test for it would fail by design
// until that follow-up lands.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_DIR = join(__dirname, "..", "proxy", "extensions");

async function newTmp() {
  return mkdtemp(join(tmpdir(), "restart-transparent-test-"));
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

// Fresh dynamic import with a cache-busting query — simulates "process
// restart" for module-scope state (empty Maps/Sets on the reloaded module),
// same idiom as proxy-prefix-diff.test.mjs's hot-reload test.
let _reloadCounter = 0;
async function freshImport(filename) {
  _reloadCounter += 1;
  const url = pathToFileURL(join(EXT_DIR, filename)).href + "?restart-probe=" + _reloadCounter;
  return import(url);
}

function deepClone(x) {
  return JSON.parse(JSON.stringify(x));
}

// =============================================================================
// DETERMINISTIC extensions — fresh module state must reproduce byte-identical
// output for byte-identical input, regardless of what any OTHER module
// instance (simulating "before the restart") had already done.
// =============================================================================

const DETERMINISTIC_CASES = [
  {
    file: "sort-stabilization.mjs",
    buildBody: () => ({
      system: [
        {
          type: "text",
          text:
            "<system-reminder>\nThe following skills are available for use with the Skill tool:\n\n" +
            "- zeta-skill: z desc\n- alpha-skill: a desc\n</system-reminder>",
        },
      ],
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      tools: [{ name: "zTool" }, { name: "aTool" }],
    }),
  },
  {
    file: "fresh-session-sort.mjs",
    buildBody: () => ({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "<system-reminder>\nThe following skills are available for use with the Skill tool:\n\n" +
                "- zeta-skill: z desc\n- alpha-skill: a desc\n</system-reminder>",
            },
            { type: "text", text: "hello" },
          ],
        },
      ],
    }),
  },
  {
    file: "tool-input-normalize.mjs",
    buildBody: () => ({
      tools: [{ name: "Foo", input_schema: { properties: { a: {}, b: {}, c: {} } } }],
      messages: [
        { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "Foo", input: { c: 3, a: 1, b: 2 } }] },
      ],
    }),
  },
  {
    file: "identity-normalization.mjs",
    buildBody: () => ({
      system: [
        {
          type: "text",
          text: "<system-reminder>\nSessionStart:resume hook success:\n<session-id>abc</session-id>\n</system-reminder>",
        },
      ],
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
    }),
  },
  {
    file: "content-strip.mjs",
    buildBody: () => ({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Continue from where you left off." },
            { type: "text", text: "real content" },
          ],
        },
      ],
    }),
  },
];

for (const { file, buildBody } of DETERMINISTIC_CASES) {
  test(`byte-identical restart: ${file} — fresh module state reproduces the same output as a warm instance`, async () => {
    // "Before restart": a warm module instance processes some UNRELATED
    // requests first (to populate any module-scope state with content that
    // has nothing to do with the request under test), then processes the
    // request under test.
    const warmMod = await freshImport(file);
    const unrelatedBody = {
      system: [{ type: "text", text: "<system-reminder>\nunrelated priming content\n</system-reminder>" }],
      messages: [{ role: "user", content: [{ type: "text", text: "priming turn" }] }],
      tools: [{ name: "PrimingTool", input_schema: { properties: {} } }],
    };
    await warmMod.default.onRequest({ body: deepClone(unrelatedBody), headers: {}, meta: {} });

    const bodyForWarm = buildBody();
    await warmMod.default.onRequest({ body: bodyForWarm, headers: {}, meta: {} });
    const warmOutput = JSON.stringify(bodyForWarm);

    // "After restart": a completely fresh module import (empty module-scope
    // state) processes ONLY the request under test — no priming.
    const restartedMod = await freshImport(file);
    const bodyForRestarted = buildBody();
    await restartedMod.default.onRequest({ body: bodyForRestarted, headers: {}, meta: {} });
    const restartedOutput = JSON.stringify(bodyForRestarted);

    assert.equal(
      restartedOutput,
      warmOutput,
      `${file}: restart must not change output for byte-identical input`,
    );
  });
}

// =============================================================================
// insertion-normalization — stateful-PERSISTED. Canonical identity state must
// survive a restart via the snapshots-dir file (loadCanonical/saveCanonical),
// so a restart between two requests of a growing conversation produces the
// SAME re-serialization as the equivalent non-restarted continuation.
// =============================================================================

function userMsg(text) {
  return { role: "user", content: [{ type: "text", text }] };
}
function assistantMsg(text) {
  return { role: "assistant", content: [{ type: "text", text }] };
}
function conv(n, seed = "c") {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(i % 2 === 0 ? userMsg(`${seed}-u${i}`) : assistantMsg(`${seed}-a${i}`));
  }
  return out;
}

test("byte-identical restart: insertion-normalization — canonical state reloaded from disk reproduces the non-restarted continuation", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "restart-transparent-insertion" };
  try {
    await withEnvAsync({ CACHE_FIX_INSERTION_NORMALIZE: "1", CLAUDE_CONFIG_DIR: dir }, async () => {
      // Turn 1 (both paths share this — establishes canonical on disk).
      const modA = await freshImport("insertion-normalization.mjs");
      const turn1 = conv(6, "seed");
      const ctxA1 = { body: { messages: turn1 }, headers, meta: {} };
      await modA.default.onRequest(ctxA1);

      // NO-RESTART continuation: same module instance, turn 2 grows the
      // conversation by a tail-only addition (ordinary growth).
      const turn2NoRestart = turn1.concat(conv(2, "tail"));
      const ctxNoRestart = { body: { messages: deepClone(turn2NoRestart) }, headers, meta: {} };
      await modA.default.onRequest(ctxNoRestart);
      const noRestartOutput = JSON.stringify(ctxNoRestart.body.messages);

      // RESTARTED continuation: fresh module import (empty in-memory
      // canonical), which must reload the SAME persisted canonical file from
      // disk before classifying turn 2.
      const modB = await freshImport("insertion-normalization.mjs");
      const turn2Restarted = turn1.concat(conv(2, "tail"));
      const ctxRestarted = { body: { messages: deepClone(turn2Restarted) }, headers, meta: {} };
      await modB.default.onRequest(ctxRestarted);
      const restartedOutput = JSON.stringify(ctxRestarted.body.messages);

      assert.equal(
        restartedOutput,
        noRestartOutput,
        "restart must reload canonical from disk and classify identically to the non-restarted path",
      );
      // Sanity: this must actually exercise the persisted-reload path, not
      // just two independent "reset" classifications that happen to agree —
      // assert both landed on append-only (the only way `messages` is
      // identical to incoming AND both runs picked the same action).
      assert.equal(ctxRestarted.meta.insertionNormalizeStats.action, "append-only");
      assert.equal(ctxNoRestart.meta.insertionNormalizeStats.action, "append-only");
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
