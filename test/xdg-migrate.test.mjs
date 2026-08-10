// `xdg-migrate.mjs --verify` must not exit 1 on a NON-defect.
//
// THE DEFECT (BACKLOG.md, "`xdg-migrate.mjs --verify` exits 1 on a
// NON-defect"): `--verify` folded two different situations into one
// NOT-ARRIVED bucket — a path whose data genuinely failed to move, and a
// path that was simply NEVER WRITTEN (the owning extension is enabled but
// has never fired, so neither the legacy `~/.claude/...` copy nor the new
// XDG location has ever held anything). NOT-ARRIVED is the restart's ABORT
// condition; firing it on a store that never existed trains the reader to
// discount the red that will one day be real.
//
// RED-FIRST, with its baseline (docs/dev-loop.md, "A red-first run in which
// nothing goes red has demonstrated nothing"). Direct invocation against the
// pre-fix binary, over a totally fresh synthetic HOME (nothing written
// anywhere — the maximal never-written case, since none of the 24 owned
// paths has ever fired):
//
//   arrived: 0   NOT-ARRIVED: 22   COULD-NOT-VERIFY: 2   (of 24)
//   EXIT=1
//
// 22 of 24 owned paths reported NOT-ARRIVED — the abort condition — for a
// machine that has simply never run any of this repo's extensions. After the
// fix, the same run reports:
//
//   arrived: 0   NOT-ARRIVED: 0   never-written: 22   COULD-NOT-VERIFY: 2
//   EXIT=0
//
// The two bites below drive the REAL CLI (per BACKLOG's "the synthetic-HOME
// pattern" entry: the defect lived in `verify()`'s own classification logic,
// not in a resolver a unit test could isolate) with HOME pointed at a
// synthetic root, and they pin BOTH halves the repair must get right — a
// declared exemption that silences a non-defect is not an exemption unless
// the real positive still fires (dev-loop, "Adding a check"):
//
//   BITE 1 — the non-defect: nothing was ever written anywhere. Every row
//   this test controls must read never-written, not not-arrived, and the
//   run must exit 0.
//   BITE 2 — the real positive, so the exemption cannot be a disabled check:
//   a legacy copy that genuinely has NOT been migrated — data sitting at
//   `~/.claude/...`, nothing at the new XDG location — must still read
//   NOT-ARRIVED and the run must still exit 1. "A synthetic case where a
//   path IS recorded as moved but is missing still aborts" (the entry's own
//   done-criterion).
//
// Two owners are asserted by name, chosen to cover BOTH resolution shapes
// `--verify` walks: `captures` (a plain writer path, `getCaptureDir()` —
// most of the 24 rows are this shape) and `fire-ledger.jsonl` (a READER that
// carries the one-transition `legacyReadPath` fallback — the shape the
// existing containment check already partly covers). The other 22 rows are
// left unasserted per case; BITE 1's own summary line pins their aggregate
// count instead, so a regression touching any of them still shows.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "xdg-migrate.mjs");

function run(home) {
  try {
    const out = execFileSync(process.execPath, [TOOL, "--verify"], {
      cwd: REPO,
      env: { ...process.env, HOME: home },
      encoding: "utf8",
    });
    return { out, status: 0 };
  } catch (err) {
    return { out: err.stdout, status: err.status };
  }
}

test("BITE 1 — nothing ever written anywhere: every controlled row reads never-written, exit 0", () => {
  const home = tmpDirSync("xdg-verify-never-written-");
  mkdirSync(join(home, ".claude"), { recursive: true }); // the config root exists; nothing under it does
  const { out, status } = run(home);

  assert.match(out, /NEVER-WRITTEN\s+captures\s/, "the plain-writer shape must read never-written");
  assert.match(out, /NEVER-WRITTEN\s+fire-ledger\.jsonl\s/, "the legacy-fallback shape must read never-written too");
  assert.doesNotMatch(out, /NOT-ARRIVED\s+captures\s/);
  assert.doesNotMatch(out, /NOT-ARRIVED\s+fire-ledger\.jsonl\s/);

  // The aggregate line: all 22 real (non-null-spec) owners must be
  // never-written, since this HOME never wrote any of them, and NOT-ARRIVED
  // must be zero — the whole point of the fix.
  assert.match(out, /arrived: 0\s+NOT-ARRIVED: 0\s+never-written: 22\s+COULD-NOT-VERIFY: 2\s+\(of 24\)/);
  assert.equal(status, 0, "a machine that never wrote anything must not fail the restart's abort gate");
});

test("BITE 2 — CONTROL: a legacy copy that truly has not migrated still aborts", () => {
  const home = tmpDirSync("xdg-verify-real-not-arrived-");
  // `captures` is a plain-writer shape: its owner (getCaptureDir()) never
  // consults the legacy path at all, so the ONLY way `--verify` can tell
  // "real failure" from "never written" is by checking the legacy location
  // itself — which is exactly what this control exercises.
  mkdirSync(join(home, ".claude", "cache-fix-captures"), { recursive: true });
  writeFileSync(join(home, ".claude", "cache-fix-captures", "s-example-requests.jsonl"), "{}\n");
  // `fire-ledger.jsonl` is a legacy-fallback (reader) shape: its owner
  // resolves straight to the legacy file via `legacyReadPath`, which is the
  // containment-check path rather than the ENOENT path.
  writeFileSync(join(home, ".claude", "cache-fix-fire-ledger.jsonl"), "{}\n");

  const { out, status } = run(home);

  assert.match(out, /NOT-ARRIVED\s+captures\s/, "real un-migrated data must still abort — the exemption must not swallow it");
  assert.match(out, /NOT-ARRIVED\s+fire-ledger\.jsonl\s/);
  assert.doesNotMatch(out, /NEVER-WRITTEN\s+captures\s/);
  assert.doesNotMatch(out, /NEVER-WRITTEN\s+fire-ledger\.jsonl\s/);

  // The 20 untouched rows (never written by this HOME either) still resolve
  // never-written, so NOT-ARRIVED is exactly the two this test planted.
  assert.match(out, /arrived: 0\s+NOT-ARRIVED: 2\s+never-written: 20\s+COULD-NOT-VERIFY: 2\s+\(of 24\)/);
  assert.equal(status, 1, "data left behind at the legacy path is the genuine abort condition");
});

test("BITE 3 — CONTROL: COULD-NOT-VERIFY is untouched by the fix (both null-spec owners, either scenario)", () => {
  const home = tmpDirSync("xdg-verify-could-not-verify-");
  mkdirSync(join(home, ".claude"), { recursive: true });
  const { out } = run(home);
  assert.match(out, /COULD-NOT-VERIFY\s+anthropic-proxy-logs\s/);
  assert.match(out, /COULD-NOT-VERIFY\s+stats\.json\s/);
});
