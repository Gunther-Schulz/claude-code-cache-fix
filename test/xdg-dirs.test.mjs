// The XDG path table, pinned.
//
// DEFINITION, written before the assertions (dev-loop "Adding a check": a
// bite's expected value comes from the invariant's DEFINITION, never from the
// implementation). The invariant this file pins:
//
//   Every artifact this repo OWNS resolves under an XDG root named for this
//   tool — `$XDG_DATA_HOME/cache-fix` for anything unrecoverable if lost,
//   `$XDG_STATE_HOME/cache-fix` for anything regenerable — and never under the
//   Claude Code config root. `~/.claude/` holds Claude Code's configuration;
//   the harness protects it by PATH SHAPE, so every read and write of OUR data
//   there raised a sensitive-file prompt. One such prompt was DENIED mid-task
//   on 2026-08-07 and the session lost the work in flight. Moving the data out
//   removes the prompt without touching a security control.
//
// The `cache-fix-` filename prefix goes away with the move: the directory
// already names the tool, so `cache-fix/cache-fix-keymap.jsonl` says it twice.
//
// RED-FIRST ARRANGEMENT, stated explicitly (dev-loop: "It must go RED on the
// real defect before it counts", and "a red that is a MODULE-LOAD failure
// proves the check is new, never that it discriminates"). The pins below are
// split in two on exactly that line:
//
//   PART A pins CONSUMER functions that ALREADY EXIST and are already
//   exported. These expectations run against the OLD implementation and go
//   red with a real path mismatch — `<home>/.claude/cache-fix-ca` where the
//   definition says `<home>/.local/share/cache-fix/ca`. That is the strong
//   arrangement (new expectations, old code) and it is the default.
//
//   PART B pins the resolver module itself, which does not exist before this
//   change. Its only available red is a module-load failure, which any
//   implementation whatsoever satisfies — so it is NOT evidence of
//   discrimination, and the per-condition mutation reds recorded in the
//   migration commit are what stand in for it.
//
// ISOLATION: `HOME` is overridden per case rather than `XDG_DATA_HOME` /
// `XDG_STATE_HOME`, deliberately. That is this repo's established idiom
// (tools/test-config-root.mjs sets HOME for the whole suite, and eight test
// files override it per case), and it exercises the DEFAULT branch of the
// resolver — the branch production actually takes, since neither XDG variable
// is set in a stock login shell. The explicit-variable branch gets its own
// case.
import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { resolveRoot } from "../proxy/xdg-dirs.mjs";

// `async` and `await fn(...)`, not a bare `return fn(...)`: a synchronous
// `finally` around a returned promise restores the environment BEFORE the
// async body runs, so every case would silently measure the SUITE's home
// instead of its own. Caught by the first red run naming two temp homes on
// adjacent lines — the same shape tools/test-config-root.mjs records.
async function withHome(fn) {
  const home = tmpDirSync("cache-fix-xdg-pin-");
  const saved = {
    HOME: process.env.HOME,
    XDG_DATA_HOME: process.env.XDG_DATA_HOME,
    XDG_STATE_HOME: process.env.XDG_STATE_HOME,
  };
  process.env.HOME = home;
  delete process.env.XDG_DATA_HOME;
  delete process.env.XDG_STATE_HOME;
  try {
    return await fn(home);
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    rmSync(home, { recursive: true, force: true });
  }
}

const data = (home, ...rest) => join(home, ".local", "share", "cache-fix", ...rest);
const state = (home, ...rest) => join(home, ".local", "state", "cache-fix", ...rest);

// --- PART A: consumer pins. These run against the OLD implementation. ---

test("BITE A1 — the forward-proxy CA lives under XDG data, not the config root", async () => {
  await withHome(async (home) => {
    delete process.env.CACHE_FIX_CA_DIR;
    const { default: config } = await import(`../proxy/config.mjs?pin=${Date.now()}`);
    assert.equal(config.caDir, data(home, "ca"));
  });
});

test("BITE A2 — the upstream-error log lives under XDG state", async () => {
  await withHome(async (home) => {
    delete process.env.CACHE_FIX_UPSTREAM_ERROR_LOG_PATH;
    const mod = await import(`../proxy/extensions/upstream-error-log.mjs?pin=${Date.now()}`);
    assert.equal(mod.getLogPath(), state(home, "usage-log", "upstream-errors.jsonl"));
  });
});

test("BITE A3 — the rate-limit log and the quota-status files live under XDG state", async () => {
  await withHome(async (home) => {
    const rl = await import(`../proxy/extensions/rate-limit-log.mjs?pin=${Date.now()}`);
    assert.equal(rl.getLogPath(), state(home, "usage-log", "rate-limit-events.jsonl"));
  });
});

test("BITE A4 — per-session quota files live under XDG state", async () => {
  await withHome(async (home) => {
    const ct = await import(`../proxy/extensions/cache-telemetry.mjs?pin=${Date.now()}`);
    // `sessionFilePath` is the only handle any module gives a caller on
    // `quota-status/sessions/`, so the directory is pinned through it.
    const path = ct.sessionFilePath("synthetic-session-for-path-pin");
    assert.equal(dirname(path), state(home, "quota-status", "sessions"));
  });
});

test("BITE A5 — the fire ledger lives under XDG state", async () => {
  await withHome(async (home) => {
    const sv = await import(`../tools/shape-verdicts.mjs?pin=${Date.now()}`);
    assert.equal(sv.fireLedgerPath(), state(home, "fire-ledger.jsonl"));
  });
});

// --- PART B: the resolver's own table. Module-load red only, see the header. ---

test("BITE B1 — the two roots, default branch", async () => {
  await withHome(async (home) => {
    const { xdgData, xdgState } = await import(`../proxy/xdg-dirs.mjs?pin=${Date.now()}`);
    assert.equal(xdgData(), data(home));
    assert.equal(xdgState(), state(home));
  });
});

test("BITE B2 — the two roots honour XDG_DATA_HOME / XDG_STATE_HOME", async () => {
  await withHome(async () => {
    process.env.XDG_DATA_HOME = "/tmp/pin-data";
    process.env.XDG_STATE_HOME = "/tmp/pin-state";
    const { xdgData, xdgState } = await import(`../proxy/xdg-dirs.mjs?pin=${Date.now()}`);
    assert.equal(xdgData(), join("/tmp/pin-data", "cache-fix"));
    assert.equal(xdgState(), join("/tmp/pin-state", "cache-fix"));
  });
});

// --- PART C: the legacy fallback. LOUD, and for one transition only. ---
//
// DEFINITION: a READER whose new path does not exist, on a machine where the
// data has not been moved yet, still finds the data — and says so, every time,
// naming both paths. Silence here is how two stores diverge. The three answers
// are the point (dev-loop, "A checker has THREE answers"): new path when it
// exists, legacy WITH a warning when only that does, and — the mutation case
// below — the new path when NEITHER exists, because inventing a third location
// would hide an absent artifact rather than report it.

test("BITE C1 — the fallback fires, returns the legacy path, and WARNS", async () => {
  await withHome(async (home) => {
    const { legacyReadPath } = await import(`../proxy/xdg-dirs.mjs?pin=${Date.now()}`);
    const legacyDir = join(home, ".claude");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(join(legacyDir, "cache-fix-fire-ledger.jsonl"), "{}\n");

    const warnings = [];
    const onWarning = (w) => warnings.push(w);
    process.on("warning", onWarning);
    const resolved = legacyReadPath(state(home, "fire-ledger.jsonl"), "cache-fix-fire-ledger.jsonl");
    await new Promise((r) => setImmediate(r));
    process.off("warning", onWarning);

    assert.equal(resolved, join(legacyDir, "cache-fix-fire-ledger.jsonl"));
    const w = warnings.find((x) => x.name === "CacheFixLegacyPathWarning");
    assert.ok(w, `expected a CacheFixLegacyPathWarning, got ${warnings.map((x) => x.name)}`);
    // Both paths named, or the warning does not tell the reader what to do.
    assert.ok(w.message.includes(legacyDir), "the warning must name the legacy path");
    assert.ok(
      w.message.includes(state(home, "fire-ledger.jsonl")),
      "the warning must name the new path",
    );
  });
});

test("BITE C2 — with BOTH paths absent it returns the NEW path and invents nothing", async () => {
  await withHome(async (home) => {
    const { legacyReadPath } = await import(`../proxy/xdg-dirs.mjs?pin=${Date.now()}`);
    const wanted = state(home, "fire-ledger.jsonl");
    const warnings = [];
    const onWarning = (w) => warnings.push(w);
    process.on("warning", onWarning);
    const resolved = legacyReadPath(wanted, "cache-fix-fire-ledger.jsonl");
    await new Promise((r) => setImmediate(r));
    process.off("warning", onWarning);

    assert.equal(resolved, wanted);
    assert.equal(
      warnings.filter((x) => x.name === "CacheFixLegacyPathWarning").length,
      0,
      "nothing was found anywhere, so there is nothing to warn about",
    );
  });
});

test("BITE C3 — the new path WINS when both exist, so a migrated machine never reads the corpse", async () => {
  await withHome(async (home) => {
    const { legacyReadPath } = await import(`../proxy/xdg-dirs.mjs?pin=${Date.now()}`);
    const legacyDir = join(home, ".claude");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(join(legacyDir, "cache-fix-fire-ledger.jsonl"), "legacy\n");
    const wanted = state(home, "fire-ledger.jsonl");
    mkdirSync(dirname(wanted), { recursive: true });
    writeFileSync(wanted, "new\n");
    assert.equal(legacyReadPath(wanted, "cache-fix-fire-ledger.jsonl"), wanted);
  });
});

test("BITE B3 — the roots resolve LIVE, not frozen at module load", async () => {
  const { xdgState } = await import(`../proxy/xdg-dirs.mjs?pin=${Date.now()}`);
  const first = await withHome(async () => xdgState());
  const second = await withHome(async () => xdgState());
  assert.notEqual(first, second, "a root captured at import ignores a later env change");
});

// --- PART E: resolveRoot — the pure function, platform table and override
// precedence (`docs/directives/portable-state-roots.md` §§1-4). No temp home
// or env mutation needed: the function takes platform/env/home as arguments,
// which is the whole reason it is pure and testable without touching
// globals.
//
// RED-FIRST, stated per the directive's Verifier item 1: `resolveRoot` does
// not exist before this change at all, so a literal red-first run against
// the unmutated file is a module-load failure only — the same caveat PART B's
// header already states for this module. The discriminating red was
// established differently: these same expectations (E1-E3, E6-E7) were run
// against a scratch shim reproducing the OLD xdgData()/xdgState() behavior
// (env-var-or-home fallback, no platform branch, no override) — see the
// closing report for the pasted output. E1-E3 (platform mapping) and E6-E7
// (override precedence) went red there; E4 (no-op control) and E5 (XDG
// honoured regardless of platform) were already green, because the old
// behavior already does both unconditionally — which is exactly the
// no-op-on-Linux invariant this change must preserve.

test("BITE E1 — darwin platform default", () => {
  const home = "/Users/pin";
  assert.equal(
    resolveRoot("data", { platform: "darwin", env: {}, home }),
    join(home, "Library", "Application Support", "cache-fix"),
  );
  assert.equal(
    resolveRoot("state", { platform: "darwin", env: {}, home }),
    join(home, "Library", "Logs", "cache-fix"),
  );
});

test("BITE E2 — win32 platform default, LOCALAPPDATA set", () => {
  const home = "C:\\Users\\pin";
  const env = { LOCALAPPDATA: "C:\\Users\\pin\\AppData\\Local" };
  assert.equal(
    resolveRoot("data", { platform: "win32", env, home }),
    join(env.LOCALAPPDATA, "cache-fix"),
  );
  assert.equal(
    resolveRoot("state", { platform: "win32", env, home }),
    join(env.LOCALAPPDATA, "State", "cache-fix"),
  );
});

test("BITE E3 — win32 falls back to ~/AppData/Local when LOCALAPPDATA is unset", () => {
  const home = "C:\\Users\\pin";
  assert.equal(
    resolveRoot("data", { platform: "win32", env: {}, home }),
    join(home, "AppData", "Local", "cache-fix"),
  );
  assert.equal(
    resolveRoot("state", { platform: "win32", env: {}, home }),
    join(home, "AppData", "Local", "State", "cache-fix"),
  );
});

// BITE E4 — the no-op control. LOAD-BEARING (directive, Verifier item 2): if
// this assertion is absent, the change can silently relocate the live
// deployment's entire state while every other test in this file stays green.
test("BITE E4 — no-op control: linux, XDG unset, resolves EXACTLY today's paths", () => {
  const home = "/home/pin";
  assert.equal(
    resolveRoot("data", { platform: "linux", env: {}, home }),
    join(home, ".local", "share", "cache-fix"),
  );
  assert.equal(
    resolveRoot("state", { platform: "linux", env: {}, home }),
    join(home, ".local", "state", "cache-fix"),
  );
});

test("BITE E5 — XDG_DATA_HOME / XDG_STATE_HOME honoured on every platform, not only Linux", () => {
  const home = "/Users/pin";
  const env = { XDG_DATA_HOME: "/tmp/xdg-data", XDG_STATE_HOME: "/tmp/xdg-state" };
  assert.equal(
    resolveRoot("data", { platform: "darwin", env, home }),
    join("/tmp/xdg-data", "cache-fix"),
  );
  assert.equal(
    resolveRoot("state", { platform: "darwin", env, home }),
    join("/tmp/xdg-state", "cache-fix"),
  );
});

test("BITE E6 — CACHE_FIX_DATA_DIR / CACHE_FIX_STATE_DIR beat XDG_*, used as-is with no `cache-fix` appended", () => {
  const home = "/home/pin";
  const env = {
    CACHE_FIX_DATA_DIR: "/opt/cache-fix-data",
    CACHE_FIX_STATE_DIR: "/opt/cache-fix-state",
    XDG_DATA_HOME: "/tmp/xdg-data",
    XDG_STATE_HOME: "/tmp/xdg-state",
  };
  assert.equal(resolveRoot("data", { platform: "linux", env, home }), "/opt/cache-fix-data");
  assert.equal(resolveRoot("state", { platform: "linux", env, home }), "/opt/cache-fix-state");
});

test("BITE E7 — CACHE_FIX_DATA_DIR / CACHE_FIX_STATE_DIR beat the platform default too", () => {
  const home = "/home/pin";
  const env = { CACHE_FIX_DATA_DIR: "/opt/cache-fix-data", CACHE_FIX_STATE_DIR: "/opt/cache-fix-state" };
  assert.equal(resolveRoot("data", { platform: "darwin", env, home }), "/opt/cache-fix-data");
  assert.equal(resolveRoot("state", { platform: "win32", env, home }), "/opt/cache-fix-state");
});

// --- PART D: the HARD GUARD. What must NOT have moved. ---
//
// DEFINITION: `claudeHome()` still resolves to Claude Code's CONFIG root, and
// the paths that belong to Claude Code — not to us — still derive from it.
// This is the other half of the migration and the half with no symptom: moving
// our artifacts out is visible the moment a read fails, whereas redirecting
// `claudeHome()` itself would silently relocate Claude Code's OAuth credential
// store and its session transcripts. OAuth refresh would stop working and the
// failure would not look like a path problem.
//
// The guarded paths, and their owners:
//   ~/.claude/.credentials.json  Claude Code's credential store
//                                (proxy/oauth/refresher.mjs, tools/probe-tool-addition.mjs)
//   ~/.claude/.claude.json       Claude Code's own config (preload.mjs)
//   ~/.claude/projects/          Claude Code's session transcripts
//                                (tools/gate-live.mjs, bust-triage.mjs, dossier.mjs)

test("BITE D1 — claudeHome() still IS the Claude config root, unmoved", async () => {
  await withHome(async (home) => {
    delete process.env.CLAUDE_CONFIG_DIR;
    const { claudeHome } = await import(`../proxy/claude-home.mjs?pin=${Date.now()}`);
    assert.equal(claudeHome(), join(home, ".claude"));
    // And it is NOT either XDG root — the failure this pins is a redirect of
    // the function rather than of the individual paths.
    assert.notEqual(claudeHome(), data(home));
    assert.notEqual(claudeHome(), state(home));
  });
});

test("BITE D2 — Claude Code's own paths did NOT move", async () => {
  await withHome(async (home) => {
    delete process.env.CLAUDE_CONFIG_DIR;
    const { claudeHome } = await import(`../proxy/claude-home.mjs?pin=${Date.now()}`);
    const claude = claudeHome();
    for (const owned of [".credentials.json", "projects"]) {
      const p = join(claude, owned);
      assert.equal(p, join(home, ".claude", owned));
      assert.ok(
        !p.startsWith(data(home)) && !p.startsWith(state(home)),
        `${owned} must not have been dragged into an XDG root, got ${p}`,
      );
    }
  });
});

test("BITE D3 — the transcripts dir the tools read is still the Claude config root's", async () => {
  await withHome(async (home) => {
    delete process.env.CLAUDE_CONFIG_DIR;
    const { PROJECTS } = await import(`../tools/dossier.mjs?pin=${Date.now()}`);
    assert.equal(PROJECTS, join(home, ".claude", "projects"));
  });
});
