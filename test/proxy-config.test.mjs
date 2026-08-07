// Tests for config.mjs path resolution.
//
// CONVENTION REVERSED BY THE XDG MIGRATION. The forward-proxy CA dir used to
// default under the Claude config root and follow CLAUDE_CONFIG_DIR. It is now
// XDG DATA — `$XDG_DATA_HOME/cache-fix/ca`, default `~/.local/share/cache-fix/ca`
// — because the CA is this repo's own artifact, not Claude Code configuration,
// and private keys are the clearest case of "unrecoverable if lost".
// CACHE_FIX_CA_DIR remains the explicit override and still wins over both.
//
// `fish/config.fish` in the dotfiles repo reads ca.pem from this directory for
// NODE_EXTRA_CA_CERTS, so the default here and that line move together.

import { test } from "node:test";
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";

import config from "../proxy/config.mjs";

const KEYS = ["CACHE_FIX_CA_DIR", "CLAUDE_CONFIG_DIR", "XDG_DATA_HOME"];

function withEnv(overrides, fn) {
  const saved = {};
  for (const k of KEYS) saved[k] = process.env[k];
  try {
    for (const k of KEYS) delete process.env[k];
    for (const [k, v] of Object.entries(overrides)) process.env[k] = v;
    return fn();
  } finally {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

test("config.caDir: honors XDG_DATA_HOME so the CA follows the data root", () => {
  withEnv({ XDG_DATA_HOME: "/tmp/relocated-data" }, () => {
    assert.equal(config.caDir, join("/tmp/relocated-data", "cache-fix", "ca"));
  });
});

test("config.caDir: falls back to ~/.local/share/cache-fix when XDG_DATA_HOME is unset", () => {
  withEnv({}, () => {
    assert.equal(config.caDir, join(homedir(), ".local", "share", "cache-fix", "ca"));
  });
});

// CLAUDE_CONFIG_DIR must no longer reach this path at all — that is the whole
// point of the move, and a silent re-coupling is exactly what would go unseen.
test("config.caDir: CLAUDE_CONFIG_DIR does NOT move the CA any more", () => {
  withEnv({ CLAUDE_CONFIG_DIR: "/tmp/relocated-cfg" }, () => {
    assert.equal(config.caDir, join(homedir(), ".local", "share", "cache-fix", "ca"));
  });
});

test("config.caDir: CACHE_FIX_CA_DIR override wins over XDG_DATA_HOME", () => {
  withEnv({ CACHE_FIX_CA_DIR: "/pinned/ca", XDG_DATA_HOME: "/tmp/relocated-data" }, () => {
    assert.equal(config.caDir, "/pinned/ca");
  });
});
