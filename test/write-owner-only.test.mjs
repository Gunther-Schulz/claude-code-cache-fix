import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdir, readFile, stat, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

import ext, { resolveInsertionSessionKey } from "../proxy/extensions/insertion-normalization.mjs";

// =====================================================================
// DEFINITION — what "owner-only" means here, written before the
// assertions so the expected value comes from the invariant and not
// from the implementation that is supposed to satisfy it.
//
// A conversation-derived state file is one the proxy writes under the
// user's Claude config root whose content is derived from live traffic:
// message bytes, request/response bodies, system-prompt text, or the
// stable session identifiers that link a record back to a conversation.
//
// The invariant: such a file's permission bits are exactly 0600 — owner
// read+write, nothing for group, nothing for other. Not "0600 or
// tighter", not "no world bit": exactly 0600, because the failure being
// guarded is a file landing at the ambient umask (0664 / 0644), and a
// range assertion would pass on the very mode that motivated the check.
//
// The threat is not a remote attacker. It is that ~/.claude state gets
// attached to a bug report, backed up, synced, or read by another
// account on a shared machine — a mode the owner never chose and never
// sees, because umask is invisible at the write site.
// =====================================================================

const OWNER_ONLY = 0o600;

async function modeOf(path) {
  return (await stat(path)).mode & 0o777;
}

async function newTmp() {
  return tmpDir("write-owner-only-test-");
}

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

// Drive the real extension end-to-end against a real temp config root, so
// the modes observed are the ones a real file lands with. A test double
// for `fs` would report whatever the double chose — the wrongness this
// check hunts lives in the filesystem, not in the call.
//
// SERVING CONFIG, not the minimum that reaches the write. The unit runs
// CACHE_FIX_VOLATILE_PIN=1 alongside the phase-2 gate, and pin mode is what
// decides which canonical shape `loadCanonical`/`saveCanonical` round-trip
// (`insertion-normalization.mjs:1958`, `mode: pin | plain`). Driving with the
// phase-2 gate alone left these BITEs green about a "plain" canonical the
// proxy never writes. Found by `tools/serving-gate-lint.mjs` — the check that
// derives each extension's gates from its source and the serving set from
// /health. The canon-shape assertion in the first BITE is what keeps this
// honest: drop CACHE_FIX_VOLATILE_PIN again and it goes red rather than
// silently reverting to the unserved path.
const SERVING_GATES = { CACHE_FIX_INSERTION_NORMALIZE: "1", CACHE_FIX_VOLATILE_PIN: "1" };

async function driveInsertion(dir, seed, headers) {
  const body = { model: "claude-opus-4-7", messages: conv(6, seed) };
  await silenced(() => withEnvAsync(SERVING_GATES, () => runExt(body, { headers, dir })));
  const key = resolveInsertionSessionKey(headers, body.messages, body.system);
  return {
    canon: join(dir, "cache-fix", "snapshots", `${key}-insertion-canon.json`),
    events: join(dir, "cache-fix", "snapshots", `${key}-insertion-events.jsonl`),
  };
}

// =====================================================================
// BITEs
// =====================================================================

test("BITE — a freshly written canon file lands 0600, not at the ambient umask", async () => {
  const dir = await newTmp();
  try {
    const { canon } = await driveInsertion(dir, "fresh-canon", {
      "x-claude-code-session-id": "sess-fresh-canon",
    });
    assert.equal(
      await modeOf(canon),
      OWNER_ONLY,
      "canon holds first-seen message bytes (entry.m) and must be owner-only",
    );
    // The gate-took-effect assertion. `mode` is written from `isPinEnabled()`
    // at save time, so this is the one observable that separates the serving
    // path from the phase-2-only one; without it, adding CACHE_FIX_VOLATILE_PIN
    // to SERVING_GATES would be decoration nothing could falsify.
    assert.equal(
      JSON.parse(await readFile(canon, "utf8")).mode,
      "pin",
      "the drive helper must exercise the SERVING config (pin mode), not phase-2 alone",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("BITE — a freshly written events file lands 0600, not at the ambient umask", async () => {
  const dir = await newTmp();
  try {
    const { events } = await driveInsertion(dir, "fresh-events", {
      "x-claude-code-session-id": "sess-fresh-events",
    });
    assert.equal(
      await modeOf(events),
      OWNER_ONLY,
      "events carry stable session identifiers and must be owner-only",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// The lazy-repair half of the invariant. Node applies a `mode` option only
// when the write CREATES the file, so a file written before this mechanism
// existed keeps its old, umask-derived mode forever unless something
// actively repairs it. The repair is deliberately bound to the next write
// rather than to a startup sweep: a sweep would have to guess the file set
// and would touch state nobody writes again.
test("BITE — a pre-existing group-readable events file is repaired to 0600 on the next write", async () => {
  const dir = await newTmp();
  try {
    const headers = { "x-claude-code-session-id": "sess-repair-events" };
    const body = { model: "claude-opus-4-7", messages: conv(6, "repair-events") };
    const key = resolveInsertionSessionKey(headers, body.messages, body.system);
    const snapshotDir = join(dir, "cache-fix", "snapshots");
    const events = join(snapshotDir, `${key}-insertion-events.jsonl`);

    await mkdir(snapshotDir, { recursive: true });
    await writeFile(events, "");
    await chmod(events, 0o664);
    assert.equal(await modeOf(events), 0o664, "precondition: file starts group-writable");

    await silenced(() => withEnvAsync(SERVING_GATES, () => runExt(body, { headers, dir })));

    assert.equal(await modeOf(events), OWNER_ONLY, "next write must repair the stale mode");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// Atomic writers get the repair for free and it is worth pinning, because
// it is the reason they need no chmod call: the tmp file is always freshly
// created, so it is born 0600, and the rename carries that mode onto the
// final path — replacing a loose mode on an existing final file.
test("BITE — a pre-existing group-readable canon file is replaced at 0600 by the atomic write", async () => {
  const dir = await newTmp();
  try {
    const headers = { "x-claude-code-session-id": "sess-repair-canon" };
    const body = { model: "claude-opus-4-7", messages: conv(6, "repair-canon") };
    const key = resolveInsertionSessionKey(headers, body.messages, body.system);
    const snapshotDir = join(dir, "cache-fix", "snapshots");
    const canon = join(snapshotDir, `${key}-insertion-canon.json`);

    await mkdir(snapshotDir, { recursive: true });
    // `mode: "pin"` because the arranged file stands in for one the RUNNING
    // proxy left behind, and the running proxy serves CACHE_FIX_VOLATILE_PIN=1.
    // A "plain" file under a pin-mode load is a different case (a mode
    // mismatch), and it is not the one this BITE is about.
    await writeFile(canon, JSON.stringify({ mode: "pin", entries: [] }));
    await chmod(canon, 0o644);
    assert.equal(await modeOf(canon), 0o644, "precondition: file starts world-readable");

    await silenced(() => withEnvAsync(SERVING_GATES, () => runExt(body, { headers, dir })));

    assert.equal(await modeOf(canon), OWNER_ONLY, "rename must carry the tmp file's 0600");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// --- fresh-session-sort's relocation memory (2026-08-05) --------------
//
// The same invariant, on a second conversation-derived state file: it holds
// the BYTES of a `<system-reminder>` block CC sent in this conversation (MCP
// server instructions, the skills list, SessionStart hook output), keyed by
// the conversation identity. Replaying those bytes is the whole mechanism, so
// a hash cannot stand in for them — which is exactly the reason the canon
// file above must not be readable by group or other.

// `convSeed` fixes the CONVERSATION identity (it rides messages[0]);
// `blockSeed` fixes the block CONTENT. They are separate parameters because
// the memory is written only when it CHANGES, so a second write to the same
// conversation needs different block bytes — the same conversation with the
// same block is a no-op by design, and a test that did not separate the two
// would be asserting on a write that never happened.
async function driveFreshSort(dir, convSeed, headers, blockSeed = convSeed) {
  const mcp = "<system-reminder>\n# MCP Server Instructions\n\n" + blockSeed + "\n</system-reminder>";
  const messages = [
    userMsg(`${convSeed}-first prompt`),
    assistantMsg("reply"),
    { role: "user", content: [{ type: "text", text: mcp }] },
  ];
  const body = { model: "claude-opus-4-7", messages };
  const key = resolveInsertionSessionKey(headers, messages, body.system);
  await silenced(() =>
    withEnvAsync({ CLAUDE_CONFIG_DIR: dir, XDG_STATE_HOME: dir }, async () => {
      const mod = await import(
        "../proxy/extensions/fresh-session-sort.mjs?owner-only-probe=" + encodeURIComponent(convSeed + ":" + blockSeed)
      );
      await mod.default.onRequest({ body, headers, meta: {} });
    }),
  );
  return join(dir, "cache-fix", "snapshots", `${key}-fresh-sort-relocated.json`);
}

test("BITE — the relocation-memory file lands 0600, not at the ambient umask", async () => {
  const dir = await newTmp();
  try {
    const state = await driveFreshSort(dir, "fresh-sort-mode", {
      "x-claude-code-session-id": "sess-fresh-sort-mode",
    });
    assert.equal(
      await modeOf(state),
      OWNER_ONLY,
      "the relocation memory holds first-seen reminder bytes and must be owner-only",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("BITE — a pre-existing group-readable relocation-memory file is replaced at 0600 by the atomic write", async () => {
  const dir = await newTmp();
  try {
    const headers = { "x-claude-code-session-id": "sess-fresh-sort-repair" };
    const first = await driveFreshSort(dir, "fresh-sort-repair", headers, "v1");
    await chmod(first, 0o664);
    assert.equal(await modeOf(first), 0o664, "arrange: the file is group-readable before the next write");
    // A second request with DIFFERENT block content updates the memory, so the
    // extension writes again — through tmp+rename, which replaces the inode.
    const again = await driveFreshSort(dir, "fresh-sort-repair", headers, "v2");
    assert.equal(again, first, "arrange: same conversation, same state path");
    assert.equal(
      await modeOf(first),
      OWNER_ONLY,
      "the atomic write must land the replacement owner-only, whatever mode the old file had",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
