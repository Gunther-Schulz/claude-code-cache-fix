import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import ext, {
  resolveCaptureKey,
  buildCaptureRecord,
  sweepCaptureDir,
} from "../proxy/extensions/request-capture.mjs";

function makeCtx(overrides = {}) {
  return {
    body: {
      model: "claude-opus-5",
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      ...overrides.body,
    },
    headers: {
      "anthropic-beta": "context-1m-2025-08-07",
      "x-session-id": "abc-123",
      authorization: "Bearer SECRET",
      ...overrides.headers,
    },
    meta: { route: "messages" },
  };
}

test("request-capture: disabled by default (no env flag) — onRequest is a no-op", async () => {
  const dir = await mkdtemp(join(tmpdir(), "capture-test-"));
  const prevConfig = process.env.CLAUDE_CONFIG_DIR;
  const prevFlag = process.env.CACHE_FIX_REQUEST_CAPTURE;
  process.env.CLAUDE_CONFIG_DIR = dir;
  delete process.env.CACHE_FIX_REQUEST_CAPTURE;
  try {
    await ext.onRequest(makeCtx());
    const entries = await readdir(dir);
    assert.deepEqual(entries, [], "no capture dir should be created when disabled");
  } finally {
    if (prevConfig === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = prevConfig;
    if (prevFlag !== undefined) process.env.CACHE_FIX_REQUEST_CAPTURE = prevFlag;
    await rm(dir, { recursive: true, force: true });
  }
});

test("request-capture: enabled — appends one full-body NDJSON record per request", async () => {
  const dir = await mkdtemp(join(tmpdir(), "capture-test-"));
  const prevConfig = process.env.CLAUDE_CONFIG_DIR;
  const prevFlag = process.env.CACHE_FIX_REQUEST_CAPTURE;
  process.env.CLAUDE_CONFIG_DIR = dir;
  process.env.CACHE_FIX_REQUEST_CAPTURE = "1";
  try {
    const ctx = makeCtx();
    await ext.onRequest(ctx);
    await ext.onRequest(ctx);
    const captureDir = join(dir, "cache-fix-captures");
    const files = await readdir(captureDir);
    assert.equal(files.length, 1);
    assert.match(files[0], /^s-abc-123-requests\.jsonl$/);
    const lines = (await readFile(join(captureDir, files[0]), "utf-8"))
      .split("\n")
      .filter(Boolean);
    assert.equal(lines.length, 2);
    const rec = JSON.parse(lines[0]);
    assert.equal(rec.body.model, "claude-opus-5");
    assert.deepEqual(rec.body.messages, ctx.body.messages, "body captured verbatim");
    assert.equal(rec.headers["anthropic-beta"], "context-1m-2025-08-07");
  } finally {
    if (prevConfig === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = prevConfig;
    if (prevFlag === undefined) delete process.env.CACHE_FIX_REQUEST_CAPTURE;
    else process.env.CACHE_FIX_REQUEST_CAPTURE = prevFlag;
    await rm(dir, { recursive: true, force: true });
  }
});

test("request-capture: record never contains auth material", () => {
  const rec = buildCaptureRecord(makeCtx());
  const flat = JSON.stringify(rec);
  assert.doesNotMatch(flat, /SECRET/, "authorization header must not be captured");
  assert.equal(Object.keys(rec.headers).length, 2, "only beta + session-id headers");
});

test("resolveCaptureKey: session header preferred, content-hash fallback", () => {
  const withSid = resolveCaptureKey({ "x-session-id": "abc" }, { messages: [] });
  assert.equal(withSid, "s-abc");
  const noSid = resolveCaptureKey(
    {},
    { messages: [{ role: "user", content: "x" }] },
  );
  assert.match(noSid, /^c-[0-9a-f]{12}$/);
  const empty = resolveCaptureKey({}, { messages: [] });
  assert.equal(empty, "c-empty");
});

test("sweepCaptureDir: deletes oldest files first until under the cap", async () => {
  const dir = await mkdtemp(join(tmpdir(), "capture-sweep-"));
  try {
    // Three 100-byte files with distinct mtimes (writes are sequential).
    for (const name of ["a", "b", "c"]) {
      await writeFile(join(dir, `s-${name}-requests.jsonl`), "x".repeat(100));
      await new Promise((r) => setTimeout(r, 10));
    }
    const deleted = await sweepCaptureDir(dir, 150);
    assert.equal(deleted, 2, "two oldest deleted to get 300 bytes under 150");
    const left = await readdir(dir);
    assert.deepEqual(left, ["s-c-requests.jsonl"], "newest survives");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("sweepCaptureDir: no-op under the cap and on missing dir", async () => {
  const dir = await mkdtemp(join(tmpdir(), "capture-sweep-"));
  try {
    await writeFile(join(dir, "s-a-requests.jsonl"), "x".repeat(50));
    assert.equal(await sweepCaptureDir(dir, 1000), 0);
    assert.equal(await sweepCaptureDir(join(dir, "does-not-exist"), 1000), 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
