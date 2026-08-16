// #275 round 2: the capture corpus is owner-only, and neither /health nor the
// boot record publishes an unrecognised CACHE_FIX_* value.
//
// Both halves are silent failures by nature. A capture file at 0644 works
// exactly as well as one at 0600, and a boot record carrying an OAuth client
// id parses exactly as well as one without — so nothing about the running
// system says anything is wrong. Only an assertion does.

import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync, statSync, writeFileSync, chmodSync, readdirSync } from "node:fs";
import { tmpDirSync } from "../tools/tmpdir.mjs";
import { join } from "node:path";

import ext, { buildBootRecord } from "../proxy/extensions/request-capture.mjs";
import { publishableGates, PUBLISHABLE_GATES, REDACTED } from "../proxy/gate-allowlist.mjs";
import { appendFileOwnerOnly } from "../proxy/extensions/write-owner-only.mjs";

const mode = (p) => statSync(p).mode & 0o777;

async function withTemp(fn) {
  const dir = tmpDirSync("capture-hardening-");
  try { return await fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

// --- part 1: modes -----------------------------------------------------------

test("a capture file is created 0600, not at the ambient umask", async () => {
  await withTemp(async (dir) => {
    const f = join(dir, "s-000000000000-requests.jsonl");
    await appendFileOwnerOnly(f, "{}\n");
    assert.equal(mode(f), 0o600, "a capture file must never be group- or world-readable");
  });
});

test("a pre-existing loose capture file is repaired on the next append", async () => {
  await withTemp(async (dir) => {
    // A file written before this hardening existed — the real migration case.
    const f = join(dir, "s-111111111111-requests.jsonl");
    writeFileSync(f, "{}\n");
    chmodSync(f, 0o644);
    assert.equal(mode(f), 0o644, "arrange: the file starts group-readable");
    await appendFileOwnerOnly(f, "{}\n");
    assert.equal(mode(f), 0o600, "the next append must repair the mode");
  });
});

// The two tests above exercise the HELPER. This one exercises the extension's
// own write path, which is the thing that can regress: someone reverting the
// call site back to a bare appendFile leaves the helper perfectly correct and
// every capture file group-readable again. Drives ext.onRequest end to end and
// stats what actually landed on disk.
test("request-capture's own write path lands the dir 0700 and the file 0600", async () => {
  await withTemp(async (dir) => {
    const prevConfig = process.env.CLAUDE_CONFIG_DIR;
    const prevData = process.env.XDG_DATA_HOME;
    const prevFlag = process.env.CACHE_FIX_REQUEST_CAPTURE;
    // FORK DEVIATION 2026-08-16 (upstream merge): upstream isolates this with
    // CLAUDE_CONFIG_DIR alone and expects `<dir>/cache-fix-captures`, because
    // upstream resolves capture paths from claudeHome(). This fork resolves
    // them from the XDG roots (proxy/xdg-dirs.mjs), so the config root no
    // longer relocates proxy state and the artifacts land at
    // `<XDG_DATA_HOME>/cache-fix/captures`. Both env vars are pointed at the
    // one temp dir, which is the same arrangement test/request-capture.test.mjs
    // already uses. The ASSERTIONS — dir 0700, file 0600 — are upstream's and
    // are unchanged; only the path resolution differs.
    process.env.CLAUDE_CONFIG_DIR = dir;
    process.env.XDG_DATA_HOME = dir;
    process.env.CACHE_FIX_REQUEST_CAPTURE = "1";
    try {
      await ext.onRequest({
        body: { model: "claude-opus-5", messages: [{ role: "user", content: "hi" }] },
        headers: { "x-session-id": "abc-123" },
        meta: { route: "messages" },
      });
      const captureDir = join(dir, "cache-fix", "captures");
      assert.equal(mode(captureDir), 0o700,
        "the directory listing leaks session keys through filenames — it is owner-only too");
      const files = readdirSync(captureDir);
      assert.equal(files.length, 1, `expected one capture file, got ${JSON.stringify(files)}`);
      assert.equal(mode(join(captureDir, files[0])), 0o600,
        "the capture file holds whole request bodies — it must never land at the ambient umask");
    } finally {
      if (prevConfig === undefined) delete process.env.CLAUDE_CONFIG_DIR;
      else process.env.CLAUDE_CONFIG_DIR = prevConfig;
      if (prevData === undefined) delete process.env.XDG_DATA_HOME;
      else process.env.XDG_DATA_HOME = prevData;
      if (prevFlag === undefined) delete process.env.CACHE_FIX_REQUEST_CAPTURE;
      else process.env.CACHE_FIX_REQUEST_CAPTURE = prevFlag;
    }
  });
});

// --- part 2: the gate allowlist ---------------------------------------------

test("an unrecognised CACHE_FIX_* key is published by NAME, never by value", () => {
  const secret = "https://token.example.invalid/oauth/v2/token";
  const env = {
    CACHE_FIX_TOOL_REWRITE: "1",
    CACHE_FIX_OAUTH_TOKEN_URL: secret,
    CACHE_FIX_SOMETHING_INVENTED_TOMORROW: "s3cr3t",
    PATH: "/usr/bin",
  };
  const gates = publishableGates(env);

  assert.equal(gates.CACHE_FIX_TOOL_REWRITE, "1", "an allowlisted gate keeps its value");
  assert.equal(gates.CACHE_FIX_OAUTH_TOKEN_URL, REDACTED);
  assert.equal(gates.CACHE_FIX_SOMETHING_INVENTED_TOMORROW, REDACTED,
    "a key nobody has seen before must be safe on the day it is added");
  assert.ok("CACHE_FIX_OAUTH_TOKEN_URL" in gates,
    "the NAME still appears — provenance needs to know the variable is set");
  assert.ok(!("PATH" in gates), "non-CACHE_FIX_ variables are not this object's business");

  // The whole point, stated as one assertion: the secret is nowhere in it.
  assert.ok(!JSON.stringify(gates).includes(secret));
  assert.ok(!JSON.stringify(gates).includes("s3cr3t"));
});

// The VALUE is the assertion, not the key's presence — and that distinction is
// the whole bite. A redacted gate is still PRESENT in the object (that is the
// deny-by-default design working), so a bite asserting `"KEY" in gates` passes
// in both worlds and proves nothing. This one fails the day a serving gate
// drops off the allowlist.
//
// It exists because that failure happened live, 2026-08-16: the newly enabled
// `CACHE_FIX_PREFIXDIFF_CONTENT` was not listed, `/health` published
// `<redacted>`, and the doctor's three-way gate compare (ship-runbook step 7)
// went FAIL with a message blaming a missing restart on a process that had
// just been restarted. The population is DERIVED from the serving unit's own
// gate set rather than hand-listed, so it cannot go quietly green when the
// deployment turns on a gate nobody added here.
test("every gate the serving unit turns ON publishes its VALUE, not <redacted>", () => {
  // The serving set, as of 2026-08-16 — the twelve Environment= gates on
  // cache-fix-proxy.service. Kept here because the unit lives in another repo
  // this one must not read; a gate added there and not here shows up as a
  // doctor FAIL, which is the backstop this bite exists to make cheaper.
  const serving = {
    CACHE_FIX_FORWARD_PROXY: "on",
    CACHE_FIX_SESSION_MIRROR: "on",
    CACHE_FIX_PREFIXDIFF: "1",
    CACHE_FIX_PREFIXDIFF_CONTENT: "1",
    CACHE_FIX_INSERTION_NORMALIZE: "1",
    CACHE_FIX_VOLATILE_PIN: "1",
    CACHE_FIX_TOOL_REWRITE: "1",
    CACHE_FIX_UPSTREAM_DETECTION: "1",
    CACHE_FIX_UPSTREAM_ERROR_LOG: "on",
    CACHE_FIX_REQUEST_CAPTURE: "1",
    CACHE_FIX_OUTPUT_GUARD: "1",
    CACHE_FIX_COALESCE_SIDECAR: "1",
  };
  const gates = publishableGates(serving);
  const redacted = Object.keys(serving).filter((k) => gates[k] === REDACTED);
  assert.deepEqual(redacted, [],
    "a serving gate published as <redacted> cannot be compared against the unit's " +
    "declared value, so the doctor's three-way compare can never agree:\n" + redacted.join("\n"));
  for (const [k, v] of Object.entries(serving)) assert.equal(gates[k], v);
});

test("the allowlist contains no path, URL, command or credential key", () => {
  // The allowlist is hand-maintained, so this pins the RULE that governs
  // adding to it rather than the current membership: a key whose value names
  // a place on the operator's machine or a credential is not a gate.
  // Suffix-based, and the distinction is real in this codebase: `*_LOG` is an
  // on/off switch ("write the usage log?") while `*_LOG_PATH` names where it
  // goes. Only the latter is a location.
  const forbidden = /(_(PATH|DIR|URL|CMD|FILE|CRED|SCOPE|UPSTREAM|SENTINEL|PATTERN|PREFIX|REPLACEMENT|KEYS|PLAN)|_CLIENT_ID|_LOG_PATH|_STATE)$/;
  const offenders = [...PUBLISHABLE_GATES].filter((k) => forbidden.test(k));
  assert.deepEqual(offenders, [],
    `these allowlisted keys name a location or a secret rather than a gate:\n${offenders.join("\n")}`);
});

test("the boot record redacts the same way, and drops the tree it already carries", () => {
  const rec = buildBootRecord(new Date(), {
    CACHE_FIX_INSERTION_NORMALIZE: "1",
    CACHE_FIX_OAUTH_CRED_PATH: "/home/someone/.claude/.credentials.json",
    CACHE_FIX_PROXY_TREE: "deadbeef",
  }, "deadbeef");

  assert.equal(rec.gates.CACHE_FIX_INSERTION_NORMALIZE, "1");
  assert.equal(rec.gates.CACHE_FIX_OAUTH_CRED_PATH, REDACTED);
  assert.ok(!JSON.stringify(rec.gates).includes("/home/someone"),
    "a capture file must not carry the operator's filesystem layout");
  assert.ok(!("CACHE_FIX_PROXY_TREE" in rec.gates),
    "the tree is already a field of this record — it is not a gate");
  assert.equal(rec.proxyTree, "deadbeef");
});

test("gate objects are key-sorted, so two boot records are comparable byte-for-byte", () => {
  const a = publishableGates({ CACHE_FIX_VOLATILE_PIN: "1", CACHE_FIX_DEBUG: "1" });
  const b = publishableGates({ CACHE_FIX_DEBUG: "1", CACHE_FIX_VOLATILE_PIN: "1" });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});
