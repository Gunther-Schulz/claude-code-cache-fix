// DESCRIPTION-ONLY tools[] delta — absorbed, not reset.
//
// Motivating live bust (transcript 2026-08-02T15:53:46, `tools_changed /
// 484972`; capture s-captureJ, replay request ordinals 1201 -> 1203, ts
// 15:53:08.789Z -> 15:53:26.105Z). Re-measured here off the raw captured
// bodies rather than carried over: the tool SET is unchanged (13 before, 13
// after, same order) and exactly ONE field anywhere in the array differs —
// `Bash.description`, 1424 -> 1500 bytes (one added advisory line), with
// `Bash.input_schema` BYTE-IDENTICAL. deferred-tool-rewrite
// took `action=reset reason=tool-schema-changed`, which is the designed honest
// reset — and 76 bytes of tool prose re-billed 484,972 tokens, because tools[]
// renders before system and messages so no breakpoint survives it.
//
// The boundary these bites pin: identical `input_schema` is what makes a stale
// DESCRIPTION safe, because the model cannot emit a call the client is unable
// to execute. A stale SCHEMA is not safe, so an input_schema delta must still
// reset — that is the CONTROL bite, and it is what proves the absorb did not
// widen into unsafe territory.

import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ext, { classifyToolChange } from "../proxy/extensions/deferred-tool-rewrite.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function newTmp() {
  return tmpDir("deferred-tool-desc-test-");
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
    const ctx = { body, meta: {}, headers: headers || {} };
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

const SCHEMA = { type: "object", properties: { command: { type: "string" } }, required: ["command"] };

function tool(name, description, extra = {}) {
  return { name, description, input_schema: SCHEMA, ...extra };
}

// The real delta, shortened: same prose, one advisory line appended.
const DESC_OLD = "Executes a bash command and returns its output.\n\n- Working directory persists.";
const DESC_NEW = DESC_OLD + "\n- Command output is displayed to you, not reliably to the user.";

const U1 = { role: "user", content: [{ type: "text", text: "turn 1" }] };

function body(tools, { model = "claude-opus-5", messages = [U1] } = {}) {
  return { model, system: [{ type: "text", text: "sys" }], messages: messages.map((m) => ({ ...m })), tools };
}

function announcements(ctx) {
  return ctx.body.messages.filter(
    (m) => m.role === "system" && Array.isArray(m.content) && m.content.every((b) => b?.type === "text"),
  );
}

async function readEvents(dir) {
  const snapDir = join(dir, "cache-fix", "snapshots");
  const f = (await readdir(snapDir)).find((n) => n.endsWith("-deferred-tool-events.jsonl"));
  assert.ok(f, "telemetry file must exist");
  return (await readFile(join(snapDir, f), "utf-8")).trim().split("\n").map(JSON.parse);
}

// =============================================================================
// THE BITE — description-only delta is absorbed
// =============================================================================

test("classifyToolChange: description-only delta → description-absorbed, canonical kept, changed name reported", () => {
  const prior = [tool("Read", "reads a file"), tool("Bash", DESC_OLD)];
  const incoming = [tool("Read", "reads a file"), tool("Bash", DESC_NEW)];

  const result = classifyToolChange(incoming, prior);

  assert.equal(result.action, "description-absorbed");
  assert.equal(result.knownTools, prior, "the canonical is the FIRST-SEEN array, unchanged");
  assert.deepEqual(
    result.descriptionChanges.map((c) => c.name),
    ["Bash"],
  );
  assert.equal(result.descriptionChanges[0].description, DESC_NEW, "the NEW prose travels to the announcement");
});

test("onRequest: description-only delta → no reset, canonical tools[] forwarded byte-identical, change announced in-band", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-desc" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const canonical = [tool("Read", "reads a file"), tool("Bash", DESC_OLD)];
      const canonicalJson = JSON.stringify(canonical);

      const ctx1 = await runExt(body(canonical.map((t) => ({ ...t }))), { headers, dir });
      assert.equal(ctx1.meta.deferredToolRewriteStats.action, "no-baseline");

      const ctx2 = await runExt(body([tool("Read", "reads a file"), tool("Bash", DESC_NEW)]), { headers, dir });

      const stats = ctx2.meta.deferredToolRewriteStats;
      assert.equal(stats.action, "description-absorbed", "a description-only delta must NOT reset");
      assert.equal(stats.reason, null);
      assert.deepEqual(stats.descriptionChangedNames, ["Bash"], "telemetry names the changed tool");

      // The whole point: the cache prefix does not move.
      assert.equal(JSON.stringify(ctx2.body.tools), canonicalJson, "forwarded tools[] byte-identical to first-seen");

      // The model still receives the new information.
      const anns = announcements(ctx2);
      assert.equal(anns.length, 1, "exactly one in-band announcement");
      const text = anns[0].content[0].text;
      assert.match(text, /Bash/);
      assert.ok(
        text.includes("Command output is displayed to you, not reliably to the user."),
        "the announcement carries the NEW description text",
      );

      // The announcement is a mid-conversation system message, so the beta
      // token that legalises it must be on the wire, exactly as for
      // tool_addition.
      assert.match(headers["anthropic-beta"] ?? "", /mid-conversation-tool-changes/);

      const events = await readEvents(dir);
      const absorbed = events.filter((e) => e.action === "description-absorbed");
      assert.equal(absorbed.length, 1);
      assert.deepEqual(absorbed[0].descriptionChangedNames, ["Bash"]);
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("onRequest: the SAME changed description on later requests announces once, not once per request", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-desc-steady" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const canonical = [tool("Read", "reads a file"), tool("Bash", DESC_OLD)];
      const canonicalJson = JSON.stringify(canonical);
      await runExt(body(canonical.map((t) => ({ ...t }))), { headers, dir });

      const changed = () => [tool("Read", "reads a file"), tool("Bash", DESC_NEW)];
      const ctx2 = await runExt(body(changed()), { headers, dir });
      const ctx3 = await runExt(body(changed()), { headers, dir });

      // The canonical never absorbs the new prose, so the delta is re-detected
      // every request — without dedupe this grows one announcement per request.
      assert.equal(ctx3.meta.deferredToolRewriteStats.action, "description-absorbed");
      assert.equal(announcements(ctx2).length, 1);
      assert.equal(announcements(ctx3).length, 1, "steady state: one announcement, re-injected, not re-appended");
      assert.equal(JSON.stringify(ctx3.body.tools), canonicalJson);
      assert.equal(
        JSON.stringify(ctx3.body.messages),
        JSON.stringify(ctx2.body.messages),
        "the forwarded message array is byte-stable across the steady state",
      );
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// =============================================================================
// THE CONTROL — the unsafe half still resets
// =============================================================================

test("CONTROL — an input_schema delta on the same tool still RESETS (stale schema is never served)", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-schema" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      await runExt(body([tool("Read", "reads a file"), tool("Bash", DESC_OLD)]), { headers, dir });

      const bumped = {
        name: "Bash",
        description: DESC_OLD,
        input_schema: { type: "object", properties: { command: { type: "string" }, timeout: { type: "number" } } },
      };
      const ctx2 = await runExt(body([tool("Read", "reads a file"), bumped]), { headers, dir });

      const stats = ctx2.meta.deferredToolRewriteStats;
      assert.equal(stats.action, "reset", "an input_schema delta must still take the honest reset");
      assert.equal(stats.reason, "tool-schema-changed");
      assert.deepEqual(ctx2.body.tools[1], bumped, "CC's own array is forwarded untouched on reset");
      assert.equal(announcements(ctx2).length, 0, "a reset announces nothing");
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("CONTROL — description delta PLUS a tool-SET change is a rewrite/reset, never a description absorb", () => {
  const prior = [tool("Read", "reads a file"), tool("Bash", DESC_OLD)];

  // A new tool arriving alongside a description delta → not the absorb class.
  const added = classifyToolChange(
    [tool("Read", "reads a file"), tool("Bash", DESC_NEW), tool("Write", "writes a file")],
    prior,
  );
  assert.equal(added.action, "reset");

  // A tool DISAPPEARING alongside a description delta → not the absorb class
  // either: set identity binds in both directions.
  const removed = classifyToolChange([tool("Bash", DESC_NEW)], prior);
  assert.equal(removed.action, "reset");
});

test("CONTROL — an input_schema delta hidden inside a reorder still RESETS (the schema scan is order-blind)", () => {
  const prior = [tool("Read", "reads a file"), tool("Bash", DESC_OLD)];
  const bumpedSchema = {
    name: "Bash",
    description: DESC_OLD,
    input_schema: { type: "object", properties: { command: { type: "string" }, timeout: { type: "number" } } },
  };
  const result = classifyToolChange([bumpedSchema, tool("Read", "reads a file")], prior);
  assert.equal(result.action, "reset", "reordering must never launder a schema change past the safety boundary");
  assert.equal(result.reason, "tool-schema-changed");
});

// SET-identity, not ORDER-identity, is the absorb's precondition (decision
// 2026-08-05, G2 of the fd87e12 handoff). Basis: sort-stabilization (order
// 200) name-sorts tools[] on EVERY live request, so incoming order is not a
// property the pipeline preserves — and the absorb forwards the canonical's
// own first-seen order regardless, so admitting a reordered-but-set-identical
// array changes zero wire bytes versus the order-identical case. Callability
// is name + input_schema, and both still bind above.
test("same names, different order + description delta → description-absorbed, canonical order kept", () => {
  const prior = [tool("Read", "reads a file"), tool("Bash", DESC_OLD)];

  const result = classifyToolChange([tool("Bash", DESC_NEW), tool("Read", "reads a file")], prior);

  assert.equal(result.action, "description-absorbed");
  assert.equal(result.knownTools, prior, "the wire still carries the FIRST-SEEN array, unchanged");
  assert.deepEqual(
    result.descriptionChanges.map((c) => c.name),
    ["Bash"],
  );
});

test("CONTROL — a model that cannot take the announcement falls back to the honest reset", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-desc-sonnet" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const canonical = [tool("Read", "reads a file"), tool("Bash", DESC_OLD)];
      await runExt(body(canonical.map((t) => ({ ...t })), { model: "claude-sonnet-5" }), { headers, dir });

      const ctx2 = await runExt(
        body([tool("Read", "reads a file"), tool("Bash", DESC_NEW)], { model: "claude-sonnet-5" }),
        { headers, dir },
      );

      const stats = ctx2.meta.deferredToolRewriteStats;
      assert.equal(stats.action, "reset", "no announcement channel → never serve the stale description silently");
      assert.equal(stats.reason, "tool-schema-changed", "the reason the replay gate's exemption is keyed on");
      assert.deepEqual(stats.descriptionFallback, ["Bash"], "the REAL cause stays visible in telemetry");
      assert.equal(announcements(ctx2).length, 0);
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("CONTROL — the volatile session-URL line is still handled by stripVolatileDescription, not by the absorb", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-desc-volatile" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      const withUrl = DESC_OLD + "\nClaude-Session: https://claude.ai/code/session_abc123";
      const canonical = [tool("Read", "reads a file"), tool("Bash", withUrl)];
      const canonicalJson = JSON.stringify(canonical);
      await runExt(body(canonical.map((t) => ({ ...t }))), { headers, dir });

      const ctx2 = await runExt(body([tool("Read", "reads a file"), tool("Bash", DESC_OLD)]), { headers, dir });

      assert.equal(
        ctx2.meta.deferredToolRewriteStats.action,
        "unchanged",
        "a volatile-only difference is identity-equal — it never reaches the absorb path",
      );
      assert.equal(JSON.stringify(ctx2.body.tools), canonicalJson);
      assert.equal(announcements(ctx2).length, 0, "nothing to announce: the model's view did not change");
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// =============================================================================
// SIBLING — survival across a RESET
// =============================================================================
//
// The sibling extension shipped exactly this bug and it hid for weeks:
// insertion-normalization's migrated-duplicate suppression was correct,
// shipped, and silently disarmed by ANY reset, because `resetKeepingPins`
// returned before the suppression pass ran (fixed 059aae3/5c4d70a) — telemetry
// read `suppressed=0` at a ~1-in-3 reset rate, so it read as shipped and
// behaved as absent. This extension's OTHER paths reset, so the absorb owes
// the same question an executed answer: after a reset, does the absorb still
// fire, and against WHICH canonical?

test("SIBLING — after a reset, the absorb still fires, against the REBASELINED canonical", async () => {
  const dir = await newTmp();
  const headers = { "x-claude-code-session-id": "sess-desc-after-reset" };
  try {
    await withEnvAsync({ CACHE_FIX_TOOL_REWRITE: "1" }, async () => {
      // 1. baseline
      await runExt(body([tool("Read", "reads a file"), tool("Bash", DESC_OLD)]), { headers, dir });

      // 2. a real schema change → the honest reset. CC's array becomes truth.
      const SCHEMA2 = { type: "object", properties: { command: { type: "string" }, timeout: { type: "number" } } };
      const postReset = [
        tool("Read", "reads a file"),
        { name: "Bash", description: DESC_OLD, input_schema: SCHEMA2 },
      ];
      const postResetJson = JSON.stringify(postReset);
      const ctx2 = await runExt(body(postReset.map((t) => ({ ...t }))), { headers, dir });
      assert.equal(ctx2.meta.deferredToolRewriteStats.action, "reset");

      // 3. a description-only delta AFTER that reset.
      const ctx3 = await runExt(
        body([tool("Read", "reads a file"), { name: "Bash", description: DESC_NEW, input_schema: SCHEMA2 }]),
        { headers, dir },
      );

      assert.equal(
        ctx3.meta.deferredToolRewriteStats.action,
        "description-absorbed",
        "the absorb must not be disarmed by a preceding reset",
      );
      assert.equal(
        JSON.stringify(ctx3.body.tools),
        postResetJson,
        "the canonical it holds is the POST-reset array — the reset already paid that bust",
      );
      assert.equal(announcements(ctx3).length, 1, "the announcement still fires after a reset");
      assert.ok(announcements(ctx3)[0].content[0].text.includes("not reliably to the user."));

      // 4. and the mirror: a LATER reset drops the announcement, but loses
      //    nothing — CC's own array carries the current description already.
      const SCHEMA3 = { type: "object", properties: { command: { type: "string" }, cwd: { type: "string" } } };
      const later = [tool("Read", "reads a file"), { name: "Bash", description: DESC_NEW, input_schema: SCHEMA3 }];
      const ctx4 = await runExt(body(later.map((t) => ({ ...t }))), { headers, dir });
      assert.equal(ctx4.meta.deferredToolRewriteStats.action, "reset");
      assert.equal(announcements(ctx4).length, 0, "the absorbed announcement is dropped with the rest");
      assert.equal(
        ctx4.body.tools[1].description,
        DESC_NEW,
        "no information is lost: CC's forwarded array carries the current description",
      );

      // 5. and the cycle repeats — a description delta after THAT reset absorbs too.
      const ctx5 = await runExt(
        body([
          tool("Read", "reads a file"),
          { name: "Bash", description: DESC_NEW + "\n- and one more line.", input_schema: SCHEMA3 },
        ]),
        { headers, dir },
      );
      assert.equal(ctx5.meta.deferredToolRewriteStats.action, "description-absorbed");
      assert.equal(JSON.stringify(ctx5.body.tools), JSON.stringify(later), "held against the newest canonical");
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// Keeps the file honest about where it lives.
test("meta: this file sits beside the extension it pins", () => {
  assert.ok(__dirname.endsWith("test"));
});
