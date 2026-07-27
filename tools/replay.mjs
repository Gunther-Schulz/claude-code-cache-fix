#!/usr/bin/env node
// replay — run captured request bodies through the extension pipeline
// offline. Directive: docs/directives/proxy-request-capture-replay.md
// (stage 2).
//
// Usage:
//   node tools/replay.mjs <captures.jsonl> [--env FLAG=1 ...] [--json]
//
// Loads the extension pipeline exactly as server.mjs does (same loader,
// same extensions.json ordering), sets the given env flags, and feeds
// each captured body through runOnRequest in file order. State-writing
// extensions are pointed at a scratch CLAUDE_CONFIG_DIR so the live
// ~/.claude/cache-fix-snapshots is never touched.
//
// Per request it reports which extensions changed the body (measured by
// hashing the body between every pipeline stage — not by trusting
// telemetry) and the summary telemetry the pipeline itself emitted
// (insertion-normalization action, breakpoint injections, ladder
// placements).
//
// Acceptance gate for a pipeline change (directive): replay the same
// corpus with the flag OFF and ON; the reports must differ only in the
// intended mutations.

import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_DIR = join(__dirname, "..", "proxy", "extensions");
const EXT_CONFIG = join(__dirname, "..", "proxy", "extensions.json");

function sha(s) {
  return createHash("sha256").update(s).digest("hex").slice(0, 12);
}

function parseArgs(argv) {
  const args = { file: null, env: {}, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--env") {
      const kv = argv[++i] ?? "";
      const eq = kv.indexOf("=");
      if (eq < 1) {
        process.stderr.write(`bad --env value: ${kv} (want FLAG=value)\n`);
        process.exit(2);
      }
      args.env[kv.slice(0, eq)] = kv.slice(eq + 1);
    } else if (a === "--json") {
      args.json = true;
    } else if (!args.file) {
      args.file = a;
    } else {
      process.stderr.write(`unexpected argument: ${a}\n`);
      process.exit(2);
    }
  }
  if (!args.file) {
    process.stderr.write("usage: node tools/replay.mjs <captures.jsonl> [--env FLAG=1 ...] [--json]\n");
    process.exit(2);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  // Scratch state dir BEFORE loading extensions: several read env at
  // module scope is not the idiom here (all gates are read per-call),
  // but claude-home is read per-call too — set it first anyway so no
  // load-order surprise can leak a write to the live ~/.claude.
  const scratch = await mkdtemp(join(tmpdir(), "cache-fix-replay-"));
  process.env.CLAUDE_CONFIG_DIR = scratch;
  for (const [k, v] of Object.entries(args.env)) process.env[k] = v;

  const { loadExtensions, runOnRequest } = await import(
    new URL("../proxy/pipeline.mjs", import.meta.url).href
  );

  const extensions = await loadExtensions(EXT_DIR, EXT_CONFIG);

  const lines = (await readFile(args.file, "utf-8")).split("\n").filter((l) => l.trim());
  const report = [];

  for (let n = 0; n < lines.length; n++) {
    let rec;
    try {
      rec = JSON.parse(lines[n]);
    } catch {
      report.push({ n, error: "unparseable capture line" });
      continue;
    }
    const body = structuredClone(rec.body);
    // The capture record stores the session id under "session-id", but
    // resolveSessionId (cache-telemetry) reads x-session-id /
    // x-claude-code-session-id — reconstruct under a key it actually
    // reads, or every extension keys by content-hash fallback and the
    // replay silently loses session identity.
    const headers = {
      "anthropic-beta": rec.headers?.["anthropic-beta"] ?? undefined,
      "x-session-id": rec.headers?.["session-id"] ?? rec.sid ?? undefined,
    };
    const ctx = { body, headers, meta: { route: "messages" } };

    // Measure per-extension mutation by hashing between stages: run the
    // pipeline one extension at a time (same order — loadExtensions
    // already sorted) instead of trusting each extension's telemetry.
    const mutatedBy = [];
    let prevHash = sha(JSON.stringify(ctx.body));
    for (const ext of extensions) {
      if (!ext.onRequest) continue;
      await runOnRequest(ctx, [ext]);
      const h = sha(JSON.stringify(ctx.body));
      if (h !== prevHash) mutatedBy.push(ext.name);
      prevHash = h;
    }

    report.push({
      n,
      ts: rec.ts,
      key: rec.key,
      msgs: Array.isArray(rec.body?.messages) ? rec.body.messages.length : 0,
      mutatedBy,
      insertion: ctx.meta.insertionNormalizeStats ?? null,
      breakpoint: ctx.meta.messagesBreakpointStats ?? null,
      ladder: ctx.meta.ladderStats ?? null,
      outHash: prevHash,
    });
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    const counts = new Map();
    for (const r of report) {
      for (const name of r.mutatedBy ?? []) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    process.stdout.write(`replayed ${report.length} requests from ${args.file}\n`);
    process.stdout.write(`mutating extensions (requests touched):\n`);
    for (const [name, c] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
      process.stdout.write(`  ${name}: ${c}\n`);
    }
    const resets = report.filter((r) => r.insertion?.action === "reset");
    process.stdout.write(`insertion-normalization resets: ${resets.length}\n`);
    for (const r of resets.slice(0, 20)) {
      process.stdout.write(`  n=${r.n} ts=${r.ts} reason=${r.insertion.resetReason}\n`);
    }
  }

  await rm(scratch, { recursive: true, force: true });
}

main().catch((err) => {
  process.stderr.write(`replay failed: ${err?.stack ?? err}\n`);
  process.exit(1);
});
