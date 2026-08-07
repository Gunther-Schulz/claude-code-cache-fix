#!/usr/bin/env node
// fixture-verdict-identity — the acceptance check for a fixture CUT.
//
// docs/directives/insertion-normalization-identity-directive.md, "Fixture
// strategy": a harvested fixture is the harvester's range dump, not a
// measured minimum, and any cut is accepted only when "replayed classifier
// verdicts [are] identical to the full-range fixture's". That sentence was a
// hand-derivation the first time it was applied; this is the mechanism, so
// the next cut is checked at the moment it is made rather than re-reasoned
// (docs/dev-loop.md: the manual pass finds the defect once, the mechanism
// finds it forever).
//
//   node tools/fixture-verdict-identity.mjs <full.json> <cut.json>
//
// exit 0  — every verdict the two fixtures both cover is identical
// exit 1  — a NAMED first divergence (or the cut no longer covers the pinned
//           range at all, which is the same failure one level up: a cut that
//           drops the pair under test compares nothing and must never pass)
// exit 2  — internal error (bad arguments, unreadable fixture)
//
// WHAT A "VERDICT" IS, and where the definition comes from: not a new
// opinion invented here, but exactly the values the consuming tests read off
// a replay — test/insertion-suppression.test.mjs and
// test/mitigation-output-form.test.mjs. Per request record:
// insertion-normalization's own self-report (`action`, `resetReason`,
// `suppressed`, the suppressed INDICES), the forwarded array's length, and a
// content hash of the forwarded messages; per adjacent pair,
// `findMitigationGaps`'s row (kind / mitigated / rebilledBytes / outputForm /
// outputPreserved / rebilledOutBytes); and across the whole replay,
// `findSafetyViolations`. The replay itself is the tests' own loop
// (loadExtensions + runOnRequest over a scratch config + XDG root under the
// capture's gate set), not a re-derivation of it.
//
// NUMBERING. A cut fixture drops leading request records, so its own record
// order no longer starts at capture ordinal 0. `header.replayFrom` names the
// capture ordinal of its FIRST request record (0 for a full-prefix pin), and
// every entry is numbered with its ORIGINAL capture ordinal — which is what
// makes "n=26->28" mean the same pair on both sides of the comparison, and
// what lets the consuming tests keep asserting those numbers unchanged.
//
// Each replay runs in its own child process (`--dump <fixture>`): the
// extension pipeline keeps per-conversation canonical state both on disk and
// in module scope, so two replays in one process would compare a cold run
// against a warm one.

import { existsSync, readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");
const EXT_DIR = join(REPO, "proxy", "extensions");
const EXT_CONFIG = join(REPO, "proxy", "extensions.json");

// The gate set the two real-pair tests replay under, stated once here and
// read from the fixture's boot record only if that record still carries one
// (the directive drops the boot gate dump from committed fixtures).
export const GATES = {
  CACHE_FIX_FORWARD_PROXY: "on",
  CACHE_FIX_SESSION_MIRROR: "on",
  CACHE_FIX_PREFIXDIFF: "1",
  CACHE_FIX_INSERTION_NORMALIZE: "1",
  CACHE_FIX_VOLATILE_PIN: "1",
  CACHE_FIX_TOOL_REWRITE: "1",
  CACHE_FIX_UPSTREAM_DETECTION: "1",
  CACHE_FIX_REQUEST_CAPTURE: "1",
  CACHE_FIX_CAPTURE_MAX_MB: "8192",
  CACHE_FIX_OUTPUT_GUARD: "1",
};

const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

/**
 * Replay one pinned fixture through the real extension pipeline and return
 * its verdicts, keyed by ORIGINAL capture ordinal.
 */
export async function replayVerdicts(fixturePath) {
  const fixture = JSON.parse(readFileSync(fixturePath, "utf-8"));
  const records = fixture.records;
  if (!Array.isArray(records)) throw new Error(`${fixturePath}: no records array`);
  const replayFrom = fixture.header?.replayFrom ?? 0;
  const range = fixture.header?.range ?? null;

  const scratch = await mkdtemp(join(tmpdir(), "fixture-verdict-"));
  const saved = {};
  // All three roots, not CLAUDE_CONFIG_DIR alone: since the XDG migration the
  // state-writing extensions resolve their snapshots from XDG_STATE_HOME /
  // XDG_DATA_HOME (proxy/xdg-dirs.mjs). With only the config root scratched,
  // every invocation shared ONE snapshot store and a fixture diverged from
  // itself — which is the failure this tool exists to detect, produced by the
  // tool rather than by the fixture.
  const overrides = {
    CLAUDE_CONFIG_DIR: scratch,
    XDG_STATE_HOME: scratch,
    XDG_DATA_HOME: scratch,
    ...GATES,
  };
  for (const k of Object.keys(overrides)) {
    saved[k] = process.env[k];
    process.env[k] = overrides[k];
  }
  const origStderr = process.stderr.write.bind(process.stderr);
  process.stderr.write = () => true;
  try {
    const { loadExtensions, runOnRequest } = await import(
      pathToFileURL(join(REPO, "proxy", "pipeline.mjs")).href
    );
    const { findMitigationGaps, findSafetyViolations } = await import(
      pathToFileURL(join(REPO, "tools", "replay.mjs")).href
    );
    const extensions = await loadExtensions(EXT_DIR, EXT_CONFIG);

    const entries = [];
    let reqN = replayFrom - 1;
    for (const rec of records) {
      if (rec.type === "outcome" || rec.type === "boot") continue;
      const n = ++reqN;
      const body = structuredClone(rec.body);
      const headers = {
        "anthropic-beta": rec.headers?.["anthropic-beta"] ?? undefined,
        "x-session-id": rec.headers?.["session-id"] ?? rec.sid ?? undefined,
      };
      const ctx = { body, headers, meta: { route: "messages" } };
      await runOnRequest(ctx, extensions);
      entries.push({
        n,
        ts: rec.ts,
        key: rec.key,
        inMsgs: Array.isArray(rec.body?.messages) ? rec.body.messages : [],
        outMsgs: Array.isArray(ctx.body?.messages) ? ctx.body.messages : [],
        action: ctx.meta.insertionNormalizeStats?.action ?? null,
        resetReason: ctx.meta.insertionNormalizeStats?.resetReason ?? null,
        stats: ctx.meta.insertionNormalizeStats ?? null,
      });
      if (range && n === range.m) break;
    }

    const perEntry = entries.map((e) => ({
      n: e.n,
      action: e.action,
      resetReason: e.resetReason,
      suppressed: e.stats?.suppressed ?? 0,
      suppressions: (e.stats?.suppressions ?? []).map((s) => s.index),
      inLen: e.inMsgs.length,
      outLen: e.outMsgs.length,
      outHash: sha(JSON.stringify(e.outMsgs)),
    }));
    const rows = findMitigationGaps(entries).map((r) => ({
      prevN: r.prevN,
      n: r.n,
      kind: r.kind,
      mitigated: r.mitigated,
      rebilledBytes: r.rebilledBytes,
      outputForm: r.outputForm,
      outputPreserved: r.outputPreserved,
      rebilledOutBytes: r.rebilledOutBytes,
    }));
    const safety = findSafetyViolations(entries).map((v) => ({ n: v.n, kind: v.kind, detail: v.detail }));
    return { fixture: fixturePath, replayFrom, range, perEntry, rows, safety };
  } finally {
    process.stderr.write = origStderr;
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

// The ONE exemption, and why it is not a loophole: the cut's FIRST retained
// request has no prior canonical state to compare against, so
// insertion-normalization necessarily self-reports
// action:"reset"/resetReason:"no-prior-canonical" for it — a fact about where
// the replay window starts, not about the traffic. Measured: with no
// exemption at all, only a zero-record cut passes, so this is intrinsic to
// the notion of a cut rather than a convenience. It is deliberately narrow —
// those two fields, that one ordinal. Everything else about the seed
// (suppressed, the suppressed indices, the incoming length, the FORWARDED
// length and the forwarded bytes' hash) is still compared, which is what
// keeps the exemption from hiding a real change: a cut that starts too late
// to establish the pin changes the seed's own forwarded bytes and is caught
// on outHash.
const SEED_EXEMPT = new Set(["action", "resetReason"]);

/**
 * First divergence between a full replay and a cut replay, or null.
 *
 * Compared over the ordinals BOTH replays cover — a cut by construction has
 * no verdict for the prefix it dropped. That intersection is only a valid
 * basis if it still contains the pinned range, so the coverage check comes
 * first: without it, an empty cut would pass by having nothing to disagree
 * about (the fires-on-nothing failure the classes in tools/absence-scan.mjs
 * are guarded against the same way).
 */
export function firstDivergence(full, cut) {
  const range = cut.range ?? full.range;
  if (!range) return { where: "header", detail: "neither fixture declares header.range — the pair under test is unnamed" };
  const covered = new Set(cut.perEntry.map((e) => e.n));
  for (let n = range.n; n <= range.m; n++) {
    if (!covered.has(n)) {
      return { where: `coverage n=${n}`, detail: `the cut does not replay pinned range ordinal ${n} (covers ${cut.perEntry.length ? `${cut.perEntry[0].n}..${cut.perEntry[cut.perEntry.length - 1].n}` : "nothing"})` };
    }
  }

  const fullBy = new Map(full.perEntry.map((e) => [e.n, e]));
  const seedN = cut.perEntry[0]?.n;
  for (const c of cut.perEntry) {
    const f = fullBy.get(c.n);
    if (!f) return { where: `entry n=${c.n}`, detail: "present in the cut, absent from the full replay" };
    for (const k of ["action", "resetReason", "suppressed", "suppressions", "inLen", "outLen", "outHash"]) {
      if (c.n === seedN && SEED_EXEMPT.has(k)) continue;
      if (JSON.stringify(f[k]) !== JSON.stringify(c[k])) {
        return { where: `entry n=${c.n} field ${k}`, detail: `full=${JSON.stringify(f[k])} cut=${JSON.stringify(c[k])}` };
      }
    }
  }

  const rowKey = (r) => `${r.prevN}->${r.n}`;
  const fullRows = new Map(full.rows.map((r) => [rowKey(r), r]));
  for (const c of cut.rows) {
    const f = fullRows.get(rowKey(c));
    if (!f) return { where: `mitigation row ${rowKey(c)}`, detail: "present in the cut, absent from the full replay" };
    for (const k of ["kind", "mitigated", "rebilledBytes", "outputForm", "outputPreserved", "rebilledOutBytes"]) {
      if (JSON.stringify(f[k]) !== JSON.stringify(c[k])) {
        return { where: `mitigation row ${rowKey(c)} field ${k}`, detail: `full=${JSON.stringify(f[k])} cut=${JSON.stringify(c[k])}` };
      }
    }
  }
  // The pair under test must still PRODUCE a row, or the cut silently removed
  // the very comparison the fixture exists for. TWO-SIDED, and it has to be:
  // asking only whether the CUT has the row makes this a hidden assertion
  // about the input rather than a comparison, and identity stops being
  // reflexive — `firstDivergence(x, x)` returns a divergence for any x whose
  // pinned range produces no row. That is not hypothetical. The 46 MB row-4
  // fixture replays 895 entries and produces exactly one mitigation row, at
  // 783->804; the one-sided form refused it against itself, fixture-cut
  // reported the refusal as its own internal error, and the evidence stayed
  // out of git. A row the full replay never had is not a row the cut lost.
  if (full.rows.some((r) => r.n === range.m) && !cut.rows.some((r) => r.n === range.m)) {
    return { where: `mitigation row for n=${range.m}`, detail: "the cut produces no mitigation row for the pinned pair's end" };
  }

  const sfull = JSON.stringify(full.safety.filter((v) => covered.has(v.n)));
  const scut = JSON.stringify(cut.safety);
  if (sfull !== scut) return { where: "safety violations", detail: `full=${sfull} cut=${scut}` };

  return null;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === "--dump") {
    if (!argv[1]) {
      process.stderr.write("usage: fixture-verdict-identity.mjs --dump <fixture.json>\n");
      process.exit(2);
    }
    const v = await replayVerdicts(argv[1]);
    process.stdout.write(JSON.stringify(v));
    return;
  }
  const [fullPath, cutPath] = argv;
  if (!fullPath || !cutPath) {
    process.stderr.write("usage: fixture-verdict-identity.mjs <full.json> <cut.json>\n");
    process.exit(2);
  }
  for (const p of [fullPath, cutPath]) {
    if (!existsSync(p)) {
      process.stderr.write(`fixture-verdict-identity: no such fixture: ${p}\n`);
      process.exit(2);
    }
  }
  const dump = (p) =>
    JSON.parse(
      execFileSync(process.execPath, [fileURLToPath(import.meta.url), "--dump", p], {
        encoding: "utf-8",
        maxBuffer: 64 * 1024 * 1024,
      }),
    );
  const full = dump(fullPath);
  const cut = dump(cutPath);
  const d = firstDivergence(full, cut);
  if (d) {
    process.stdout.write(
      `fixture-verdict-identity: DIVERGENCE\n  full: ${fullPath}\n  cut:  ${cutPath}\n  at:   ${d.where}\n  ${d.detail}\n`,
    );
    process.exit(1);
  }
  process.stdout.write(
    `fixture-verdict-identity: identical\n` +
      `  full: ${fullPath} (replayFrom ${full.replayFrom}, ${full.perEntry.length} request(s))\n` +
      `  cut:  ${cutPath} (replayFrom ${cut.replayFrom}, ${cut.perEntry.length} request(s))\n` +
      `  compared ${cut.perEntry.length} entry verdict(s), ${cut.rows.length} mitigation row(s), ` +
      `${cut.safety.length} safety violation(s)\n`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => {
    process.stderr.write(`fixture-verdict-identity: ${err?.stack ?? err}\n`);
    process.exit(2);
  });
}
