// synthetic-home — ONE builder for the synthetic HOME every CLI-driving test
// in this repo needs, instead of a `fakeHome()` re-invented per file.
//
// WHY (BACKLOG.md, "the synthetic-HOME pattern is the only way to drive
// this repo's CLIs, and it is currently re-invented per test"). Every tool
// here that matters reads `~/.claude` or its XDG successor — the worktime
// ledger, the gate status file, the capture directory, the alias registry —
// through a CLI whose WIRING is where the defects have actually lived: the
// `--at` silent substitution lived entirely in `main()`, so a resolver unit
// test passes straight over it, and pointing HOME at a synthetic tree and
// spawning the REAL BINARY is what caught it. It also produces the
// strongest red arrangement available — new expectations against the OLD
// implementation, with no module-load red to mistake for discrimination.
//
// USAGE
//   import { buildSyntheticHome } from "../tools/synthetic-home.mjs";
//   const home = buildSyntheticHome({ ledger: [...], gateStatus: {...} });
//   execFileSync(process.execPath, [TOOL, ...args], { env: { ...process.env, HOME: home } });
//
// Every new CLI bite drives the real binary through the returned HOME
// instead of importing the tool's internals. Cleanup rides `tmpDirSync`'s
// own exit-time removal (tools/tmpdir.mjs) — no separate teardown call,
// matching every existing `fakeHome()` this helper replaces.
//
// `XDG_DATA_HOME` / `XDG_STATE_HOME` are deliberately NOT set here — a
// caller drives the CLI with only `HOME` overridden (the repo's established
// idiom; every existing `fakeHome()` does exactly this), which exercises the
// resolver's DEFAULT branch, the one production actually takes on a stock
// login shell.
//
// FAIL LOUD ON EMPTY, DELIBERATELY. A component the caller NAMES but
// supplies no data for is REFUSED rather than silently written as an empty
// file. "The '0/0 reads like clean' shape this repo has hit three times"
// (docs/dev-loop.md, "Adding a check") is exactly a synthetic fixture that
// looks wired but carries nothing: the CLI under test reads zero records,
// and every assertion about absence then passes for the wrong reason.
// Naming a key is a declaration "this test needs real data here" — supply
// it, or omit the key entirely for a genuinely component-free home.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpDirSync } from "./tmpdir.mjs";

function isEmpty(value) {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function requireNonEmpty(value, label) {
  if (isEmpty(value)) {
    throw new Error(
      `buildSyntheticHome: "${label}" was named but carries no data — omit the key entirely `
        + "for a component-free home, or supply real content. An empty file here reads as a "
        + "passing test over nothing, which is exactly the failure this helper exists to refuse.",
    );
  }
}

/** One line of a JSONL file. Accepts a pre-built string verbatim, for a bite that needs precise control over malformed bytes. */
function line(row) {
  return typeof row === "string" ? row : JSON.stringify(row);
}

function writeJSONL(path, rows) {
  writeFileSync(path, rows.map(line).join("\n") + "\n");
}

/**
 * @param {object} [spec]
 * @param {Array<object|string>} [spec.ledger] — rows for
 *   `.local/share/claude-worktime/activity.jsonl`, the worktime ledger
 *   `bust-triage` and `dossier` read.
 * @param {object} [spec.gateStatus] — written verbatim as JSON to the XDG
 *   state root's `gate-status.json` (`tools/gate-live.mjs`'s
 *   `DEFAULT_STATUS`, also what `tools/shape-verdicts.mjs` reads).
 * @param {Array<{sid: string, lines: Array<object|string>}>} [spec.captures]
 *   — one `s-<sid>-requests.jsonl` per entry under the XDG data root's
 *   `captures/` (the `captures` producer in `tools/xdg-migrate.mjs`'s
 *   TABLE). Each entry's own `lines` must be non-empty too — a capture
 *   named with nothing in it is the same "0/0" hazard one level down.
 * @param {object} [spec.aliases] — written verbatim as JSON to the XDG data
 *   root's `capture-aliases.json` (`tools/alias-claim.mjs`'s registry).
 * @returns {string} the synthetic HOME's absolute path.
 */
export function buildSyntheticHome(spec = {}) {
  const home = tmpDirSync("synthetic-home-");

  if ("ledger" in spec) {
    requireNonEmpty(spec.ledger, "ledger");
    const dir = join(home, ".local", "share", "claude-worktime");
    mkdirSync(dir, { recursive: true });
    writeJSONL(join(dir, "activity.jsonl"), spec.ledger);
  }

  if ("gateStatus" in spec) {
    requireNonEmpty(spec.gateStatus, "gateStatus");
    const dir = join(home, ".local", "state", "cache-fix");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "gate-status.json"), `${JSON.stringify(spec.gateStatus, null, 2)}\n`);
  }

  if ("captures" in spec) {
    requireNonEmpty(spec.captures, "captures");
    const dir = join(home, ".local", "share", "cache-fix", "captures");
    mkdirSync(dir, { recursive: true });
    for (const cap of spec.captures) {
      requireNonEmpty(cap.lines, `captures[sid=${cap.sid}].lines`);
      writeJSONL(join(dir, `s-${cap.sid}-requests.jsonl`), cap.lines);
    }
  }

  if ("aliases" in spec) {
    requireNonEmpty(spec.aliases, "aliases");
    const dir = join(home, ".local", "share", "cache-fix");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "capture-aliases.json"), `${JSON.stringify(spec.aliases, null, 2)}\n`);
  }

  return home;
}
