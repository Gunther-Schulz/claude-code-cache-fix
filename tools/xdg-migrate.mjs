#!/usr/bin/env node
// Move this repo's 24 artifacts out of `~/.claude/` into the XDG roots.
//
// The count started at 16 and reached 24 in three corrections, every one of
// them the same error: `ls ~/.claude` — an enumeration of what EXISTS —
// standing in for the class "paths this project owns". Latent writers that had
// simply never fired were invisible to it. The table below is derived from the
// WRITERS in the code; a 17th, 21st or 25th path is found by grepping those,
// never by listing the directory again.
//
//   node tools/xdg-migrate.mjs              # DRY RUN (the default)
//   node tools/xdg-migrate.mjs --apply      # perform the moves
//
// WHY. `~/.claude/` is Claude Code's CONFIG root, and the harness protects it
// by PATH SHAPE. Every read and write of OUR artifacts there raised a
// sensitive-file prompt for the operator and for every dispatched agent; on
// 2026-08-07 one was DENIED mid-task and the session lost the work in flight.
// The destinations and the DATA/STATE split rule live in proxy/xdg-dirs.mjs,
// which is also what the running code resolves through — this script imports
// the roots from there rather than restating them, so the mover and the
// resolver cannot drift apart.
//
// THE THREE ANSWERS, per path (docs/dev-loop.md, "A checker has THREE answers,
// not two"): MOVED, ALREADY-DONE, or COULD-NOT with the reason that was
// COMPUTED, never guessed. Nothing is folded into a pass. A run that moved
// nothing and found nothing says it proved nothing, rather than printing a
// zero that reads like success.
//
// WHAT IT REFUSES TO DO, and why each refusal is loud:
//  - Cross-device moves. `cache-fix-captures/` is a multi-GB corpus; a silent
//    copy-then-delete would take minutes and could half-finish. `rename(2)`
//    fails with EXDEV across filesystems, and this script checks st_dev FIRST
//    so the reason is named before anything is attempted.
//  - Merging into a non-empty destination. Two stores with the same name are
//    exactly the divergence the migration exists to end; the path is reported
//    and skipped so a human decides.
//  - Anything not on the table below. A 17th path is a finding, not an
//    inferred move.

import { existsSync, statSync, mkdirSync, renameSync, readdirSync, chmodSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

import { xdgData, xdgState } from "../proxy/xdg-dirs.mjs";

const CLAUDE = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");

// The table. `legacy` is relative to the Claude config root, `name` to the
// chosen XDG root. The `cache-fix-` prefix is dropped: the directory already
// names the tool, so `cache-fix/cache-fix-keymap.jsonl` says it twice.
//
// Split rule, stated so a reader can check the assignment rather than trust
// it: unrecoverable if lost -> DATA; regenerable, or merely expensive to
// lose -> STATE.
const TABLE = [
  // --- DATA: unrecoverable if lost ---
  ["data", "cache-fix-captures", "captures", "the evidence corpus; the alias registry naming its members already lives in this root"],
  ["data", "cache-fix-ca", "ca", "private keys; losing them re-issues a CA every client must re-trust"],

  // --- STATE: regenerable, or merely expensive to lose ---
  ["state", "cache-fix-snapshots", "snapshots", "per-session extension state, rebuilt from traffic"],
  ["state", "cache-fix-state", "state", "deferred-tools-restore's own store"],
  ["state", "cache-fix-gate-status.json", "gate-status.json", "the last sweep's verdict; the sweep re-writes it"],
  ["state", "cache-fix-fire-ledger.jsonl", "fire-ledger.jsonl", "fire-rate history"],
  ["state", "cache-fix-keymap.jsonl", "keymap.jsonl", "session-key -> conversation map"],
  ["state", "cache-fix-bootstrap-log.jsonl", "bootstrap-log.jsonl", "bootstrap audit records"],
  ["state", "cache-fix-debug.log", "debug.log", "debug output"],
  ["state", "quota-status", "quota-status", "quota telemetry, refreshed from every response"],
  ["state", "session-mirrors", "session-mirrors", "conversation mirrors, rebuilt from traffic"],
  ["state", "upstream-baseline.json", "upstream-baseline.json", "upstream-shape baseline"],
  ["state", "upstream-changes.jsonl", "upstream-changes.jsonl", "upstream-shape change log"],
  ["state", "usage.jsonl", "usage.jsonl", "per-request usage rows"],
  ["state", "usage-log", "usage-log", "rate-limit and upstream-error logs"],
  ["state", "workflow-derivation-events.jsonl", "workflow-derivation-events.jsonl", "agent-id derivation events"],

  // --- The LATENT writers: enabled, never fired, so no file exists yet. ---
  //
  // These are here because the first enumeration listed `~/.claude` — it
  // enumerated what EXISTS and let that stand for what the CODE WRITES. Each
  // writer below is enabled and has simply never fired, so a directory listing
  // cannot see it. Left alone, the migration would clear the class and first
  // fire would put it straight back. A path with no data to move is still
  // work: the WRITER is what moved.
  ["state", "quota-status.json", "quota-status.json", "the FLAT pre-directory quota file — a separate path from quota-status/; preload.mjs writes it, tools/cache_analysis.py reads it"],
  ["state", "session-budget-events.jsonl", "session-budget-events.jsonl", "session-budget-breaker (enabled, order 690, never fired)"],
  ["state", "image-retry-events.jsonl", "image-retry-events.jsonl", "image-retry-circuit-breaker (enabled, order 370, never fired)"],
  ["state", "overage-warnings.jsonl", "overage-warnings.jsonl", "overage-warning (enabled, order 610, never fired)"],
  ["state", "anthropic-proxy-logs", "anthropic-proxy-logs", "tools/usage-to-dashboard-ndjson.mjs output dir"],
  ["state", "cache-fix-stats.json", "stats.json", "preload.mjs effectiveness stats — found by grepping the writers; on NO list handed to this session, flagged in the closing report"],
  ["state", "cache-fix-oauth-events.jsonl", "oauth-events.jsonl", "proxy/oauth/events.mjs — likewise found by grepping the writers, on no list"],
  ["state", "cache-fix-cold-events.jsonl", "cold-events.jsonl", "tools/cold-events.mjs ledger — likewise found by grepping the writers, on no list"],
];

// --- --verify: does the OWNING CODE find its data at the new location? -----
//
// This is the restart's abort gate, and it exists because the row-3
// pre-declaration for the restart is CONDITIONAL: an extension whose persisted
// store arrives forwards byte-identical output, and one whose store does NOT
// arrive starts empty — indistinguishable in effect from a changed state key,
// costing a guaranteed re-baseline per live conversation (measured exposure: 7
// sessions, ~846k tokens worst case).
//
// WHAT IT DELIBERATELY IS NOT: an `ls` of the emptied source. An empty old
// directory proves a move happened and says nothing about whether the
// destination is readable by the code that needs it — and that gap is exactly
// where a silent failure sits. So every row below resolves its path by calling
// the ACCESSOR EXPORTED BY THE OWNING MODULE, and then really reads it. The
// verifier never builds a path string of its own; if it did, it would be
// checking its own arithmetic against itself and would agree with a resolver
// that had silently diverged.
//
// Three answers, and COULD-NOT-VERIFY is folded into neither of the others.
const OWNERS = [
  ["captures", "../proxy/extensions/request-capture.mjs", (m) => m.getCaptureDir()],
  ["ca", "../proxy/config.mjs", (m) => m.default.caDir],
  ["snapshots", "../proxy/extensions/prefix-diff.mjs", (m) => m.getSnapshotDir()],
  ["state", "../proxy/extensions/deferred-tools-restore.mjs", (m) => m.getSnapshotDir()],
  ["gate-status.json", "./gate-live.mjs", (m) => m.DEFAULT_STATUS],
  ["fire-ledger.jsonl", "./shape-verdicts.mjs", (m) => m.fireLedgerPath()],
  ["keymap.jsonl", "../proxy/extensions/prefix-diff.mjs", (m) => m.getKeymapPath()],
  ["bootstrap-log.jsonl", "../proxy/extensions/bootstrap-defense.mjs", (m) => m.logPath()],
  ["debug.log", "../proxy/server.mjs", (m) => m.debugLogPath()],
  ["quota-status", "../proxy/extensions/cache-telemetry.mjs", (m) => m.paths().quotaDir],
  ["session-mirrors", "../proxy/session-mirror-writer.mjs", (m) => m.mirrorRoot()],
  ["upstream-baseline.json", "../proxy/extensions/upstream-change-detection.mjs", (m) => join(m.getOutputDir(), "upstream-baseline.json")],
  ["upstream-changes.jsonl", "../proxy/extensions/upstream-change-detection.mjs", (m) => join(m.getOutputDir(), "upstream-changes.jsonl")],
  ["usage.jsonl", "../proxy/extensions/usage-log.mjs", (m) => m.logPath()],
  ["usage-log", "../proxy/extensions/upstream-error-log.mjs", (m) => dirname(m.getLogPath())],
  ["workflow-derivation-events.jsonl", "../proxy/extensions/workflow-agent-id-synthesis.mjs", (m) => m.logPath()],
  ["quota-status.json", "../proxy/extensions/cache-telemetry.mjs", (m) => m.paths().legacyPath],
  ["session-budget-events.jsonl", "../proxy/extensions/session-budget-breaker.mjs", (m) => m.eventLogPath()],
  ["image-retry-events.jsonl", "../proxy/extensions/image-retry-circuit-breaker.mjs", (m) => m.logPath()],
  ["overage-warnings.jsonl", "../proxy/extensions/overage-warning.mjs", (m) => m.logPath()],
  ["oauth-events.jsonl", "../proxy/oauth/events.mjs", (m) => m.eventsPath()],
  ["cold-events.jsonl", "./cold-events.mjs", (m) => m.DEFAULT_LEDGER_PATH],
  // No accessor is reachable for these two, and the reason is COMPUTED, not
  // assumed — each is stated per path rather than folded into "arrived".
  ["anthropic-proxy-logs", null, null,
    "no accessor: the path is a default constructed inside parseArgs() in tools/usage-to-dashboard-ndjson.mjs, reachable only by running the CLI"],
  ["stats.json", null, null,
    "no accessor: preload.mjs is a NODE_OPTIONS preload deployed standalone into ~/.claude and importing it executes its install side effects"],
];

// NEVER-WRITTEN vs NOT-ARRIVED — the distinction the FIRST run of this gate
// got wrong (BACKLOG.md, "`xdg-migrate.mjs --verify` exits 1 on a
// NON-defect"). A path can fail the real read above for two different
// reasons, and only one of them is an abort:
//
//   NOT-ARRIVED   the data is real and sitting somewhere this run cannot
//                 reach it — the legacy `~/.claude/...` copy is still there,
//                 waiting on a migration that has not happened or did not
//                 finish. Starting the restart here means the extension
//                 begins empty while its old data survives, unreachable: a
//                 guaranteed re-baseline that a completed move would have
//                 avoided. This is the real abort condition.
//   NEVER-WRITTEN the legacy copy does not exist EITHER: the writer behind
//                 this row has simply never fired (several of the 24 rows
//                 are exactly this — enabled extensions with no traffic
//                 shaped to trigger them yet). There was never anything to
//                 move, so there is nothing this restart can lose. Reported,
//                 not aborting.
//
// Computed from the CURRENT filesystem, never from a stored record of what
// `--apply` did: `--apply` and `--verify` are separate invocations, often
// separated by a restart, and a machine migrated by an OLDER build of this
// script (before this distinction existed) carries no such record — the
// verdict still has to be right there. `planOne` is a pure function of
// on-disk state, so calling it again at verify time answers exactly the
// question "what would `--apply` say about this row RIGHT NOW" without
// needing `--apply` to have said it out loud anywhere (docs/dev-loop.md,
// "CLOSING is established against the WORLD, never against a document that
// says it is closed" — the document here would have been a log file, and
// this avoids depending on one existing at all).
function neverWritten(name) {
  const row = TABLE.find(([, , newName]) => newName === name);
  if (!row) return false; // no TABLE row names this owner; never guess
  return planOne(row).reason === "neither present — nothing was ever written here";
}

/** One miss, classified. `detail` is the reason the real read already computed. */
function classifyMiss(name, detail) {
  if (neverWritten(name)) {
    return {
      name,
      state: "never-written",
      detail: `${detail} (and the legacy path is empty too — this artifact was never written)`,
    };
  }
  return { name, state: "not-arrived", detail };
}

async function verify() {
  const results = [];
  for (const [name, spec, pick, why] of OWNERS) {
    if (!spec) {
      results.push({ name, state: "could-not-verify", detail: why });
      continue;
    }
    let resolved;
    try {
      const mod = await import(spec);
      resolved = pick(mod);
    } catch (err) {
      results.push({
        name,
        state: "could-not-verify",
        detail: `the owning module could not be loaded or queried: ${err.message}`,
      });
      continue;
    }
    if (typeof resolved !== "string" || resolved.length === 0) {
      results.push({ name, state: "could-not-verify", detail: `the owner returned no path (${String(resolved)})` });
      continue;
    }
    // CONTAINMENT FIRST — and this check is here because its absence produced
    // a false green on the very first run. Readers carry a one-transition
    // legacy fallback (proxy/xdg-dirs.mjs, legacyReadPath), so an owner whose
    // data has NOT moved resolves happily to `~/.claude/...` and the read
    // below succeeds. `fire-ledger.jsonl` reported "arrived" at
    // `/home/g/.claude/cache-fix-fire-ledger.jsonl` — a path that had not
    // moved at all. An abort gate that a fallback can satisfy is not a gate.
    //
    // This is a containment test against the roots the owner itself resolves
    // through, not a reconstruction of the expected path: the verifier still
    // never builds the string it is checking.
    if (!resolved.startsWith(ROOTS.data) && !resolved.startsWith(ROOTS.state)) {
      results.push(classifyMiss(
        name,
        `${resolved} — the owner resolved OUTSIDE both XDG roots (legacy fallback still in effect)`,
      ));
      continue;
    }
    // The real read. `statSync` on the resolved path, and for a directory a
    // `readdirSync` too — a directory that stats but cannot be listed is not
    // arrived, and that is a permissions failure a stat alone would miss.
    try {
      const st = statSync(resolved);
      if (st.isDirectory()) readdirSync(resolved);
      results.push({ name, state: "arrived", detail: resolved });
    } catch (err) {
      results.push(classifyMiss(name, `${resolved} — ${err.code || err.message}`));
    }
  }
  return results;
}

const ROOTS = { data: xdgData(), state: xdgState() };

if (process.argv.includes("--verify")) {
  const results = await verify();
  const V = {
    arrived: "arrived",
    "not-arrived": "NOT-ARRIVED",
    "never-written": "NEVER-WRITTEN",
    "could-not-verify": "COULD-NOT-VERIFY",
  };
  const w = Math.max(...results.map((r) => r.name.length));
  process.stdout.write("xdg-migrate --verify: reading each path through the code that OWNS it\n\n");
  for (const r of results) {
    process.stdout.write(`  ${V[r.state].padEnd(17)} ${r.name.padEnd(w)}  ${r.detail}\n`);
  }
  const n = (s) => results.filter((r) => r.state === s).length;
  process.stdout.write(
    `\n  arrived: ${n("arrived")}   NOT-ARRIVED: ${n("not-arrived")}   never-written: ${n("never-written")}`
      + `   COULD-NOT-VERIFY: ${n("could-not-verify")}   (of ${results.length})\n`,
  );
  if (n("not-arrived") > 0) {
    process.stdout.write(
      "\n  NOT-ARRIVED is the ABORT condition for the restart, not a warning: an\n"
        + "  extension whose store did not arrive starts empty, which costs a\n"
        + "  guaranteed re-baseline on every live conversation.\n",
    );
  }
  if (n("arrived") === 0) {
    process.stdout.write("\n  NOTHING arrived. If --apply has not run yet, that is the expected red.\n");
  }
  // PERSIST THE VERDICT, at the moment it is found.
  //
  // The closing gate asks whether the evidence is harvestable, and this check
  // is the worst case for that question: it runs once, at a restart, and the
  // stores it inspects begin mutating the second the proxy comes back. A
  // verdict that exists only as terminal output is one nobody can re-read, and
  // "re-run it later" is no answer when a later run measures a different world.
  //
  // Appended, never overwritten — a re-verify after a repaired path is exactly
  // the datum worth keeping — and written into the state root so the record
  // travels with the thing it describes.
  try {
    mkdirSync(ROOTS.state, { recursive: true, mode: 0o700 });
    appendFileSync(
      join(ROOTS.state, "xdg-verify-log.jsonl"),
      JSON.stringify({
        at: new Date().toISOString(),
        roots: ROOTS,
        counts: {
          arrived: n("arrived"),
          notArrived: n("not-arrived"),
          neverWritten: n("never-written"),
          couldNotVerify: n("could-not-verify"),
          total: results.length,
        },
        rows: results,
      }) + "\n",
      { mode: 0o600 },
    );
  } catch (err) {
    // Bookkeeping never decides the gate: the VERDICT is what the restart rests
    // on, so losing the log must not turn a clean run red nor a red run clean.
    // Say so loudly instead of swallowing it.
    process.stdout.write(`\n  WARNING: could not write the verify log: ${err.message}\n`);
  }
  process.exit(n("not-arrived") > 0 ? 1 : 0);
}

const apply = process.argv.includes("--apply");
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  process.stdout.write(
    "usage: node tools/xdg-migrate.mjs [--apply]\n"
      + "  default is a DRY RUN; --apply performs the moves.\n",
  );
  process.exit(0);
}

function deviceOf(path) {
  // The device of the nearest EXISTING ancestor: a destination directory that
  // does not exist yet still lands on whatever filesystem holds its parent.
  let p = path;
  for (;;) {
    if (existsSync(p)) return statSync(p).dev;
    const up = dirname(p);
    if (up === p) return null;
    p = up;
  }
}

function isEmptyDir(path) {
  try {
    return readdirSync(path).length === 0;
  } catch {
    return false;
  }
}

/** One path's verdict. `state` is exactly one of moved | already-done | could-not. */
function planOne([rootKey, legacyName, newName, why]) {
  const src = join(CLAUDE, legacyName);
  const dst = join(ROOTS[rootKey], newName);
  const row = { rootKey, legacyName, newName, why, src, dst };

  const srcExists = existsSync(src);
  const dstExists = existsSync(dst);

  if (!srcExists && dstExists) return { ...row, state: "already-done", reason: "destination present, source gone" };
  if (!srcExists && !dstExists) return { ...row, state: "already-done", reason: "neither present — nothing was ever written here" };

  if (dstExists) {
    const dstIsDir = statSync(dst).isDirectory();
    if (!dstIsDir || !isEmptyDir(dst)) {
      return {
        ...row,
        state: "could-not",
        reason: "destination already exists and is non-empty — refusing to merge two stores; resolve by hand",
      };
    }
  }

  const srcDev = deviceOf(src);
  const dstDev = deviceOf(dst);
  if (srcDev === null || dstDev === null) {
    return { ...row, state: "could-not", reason: "could not stat a device for source or destination" };
  }
  if (srcDev !== dstDev) {
    return {
      ...row,
      state: "could-not",
      reason: `cross-device (src dev ${srcDev}, dst dev ${dstDev}) — rename(2) cannot span filesystems and a silent multi-GB copy is not acceptable`,
    };
  }

  return { ...row, state: "moved", reason: null };
}

const rows = TABLE.map(planOne);

// --- Apply ---------------------------------------------------------------
if (apply) {
  // 0700 on both roots: `ca/` holds private keys, and the state root carries
  // full request/response telemetry. Applied to the ROOT, and re-applied to
  // `ca/` after the move so a permissive source mode is not inherited.
  for (const root of Object.values(ROOTS)) mkdirSync(root, { recursive: true, mode: 0o700 });

  for (const row of rows) {
    if (row.state !== "moved") continue;
    try {
      mkdirSync(dirname(row.dst), { recursive: true, mode: 0o700 });
      renameSync(row.src, row.dst);
      if (row.newName === "ca") chmodSync(row.dst, 0o700);
    } catch (err) {
      // A verdict computed at plan time can still lose a race with the
      // filesystem. The failure replaces the verdict rather than being
      // swallowed — this is the could-not answer arriving late.
      row.state = "could-not";
      row.reason = `${err.code || "error"} during the move: ${err.message}`;
    }
  }
}

// --- Report --------------------------------------------------------------
const LABEL = { moved: apply ? "MOVED" : "WOULD-MOVE", "already-done": "ALREADY-DONE", "could-not": "COULD-NOT" };
const width = Math.max(...rows.map((r) => r.legacyName.length));

process.stdout.write(apply ? "xdg-migrate: APPLYING\n\n" : "xdg-migrate: DRY RUN (pass --apply to perform)\n\n");
for (const row of rows) {
  process.stdout.write(
    `  ${LABEL[row.state].padEnd(12)} ${row.legacyName.padEnd(width)}  ->  ${row.dst}\n`,
  );
  if (row.reason) process.stdout.write(`  ${" ".repeat(12)} ${" ".repeat(width)}      (${row.reason})\n`);
}

const count = (s) => rows.filter((r) => r.state === s).length;
const moved = count("moved");
const done = count("already-done");
const couldNot = count("could-not");

process.stdout.write(
  `\n  ${apply ? "moved" : "would move"}: ${moved}   already-done: ${done}   COULD-NOT: ${couldNot}   (of ${rows.length})\n`,
);

// The zero-work answer is its own answer, never a pass. A sweep over nothing
// proved nothing, and saying so is the whole point of the third answer.
if (moved === 0 && couldNot === 0) {
  process.stdout.write(
    "\n  NOTHING TO DO — every path is already at its destination or was never written.\n"
      + "  This run proved that the legacy locations are clear; it did not exercise a move.\n",
  );
}
if (couldNot > 0) {
  process.stdout.write(
    `\n  ${couldNot} path(s) COULD NOT be migrated. Each reason is printed above, and each\n`
      + "  is a decision for a human — none was folded into a pass.\n",
  );
}

process.exit(couldNot > 0 ? 1 : 0);
