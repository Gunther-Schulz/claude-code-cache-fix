#!/usr/bin/env node
// snapshot-sweep-projection — what WOULD prefix-diff's boot sweep delete, if
// the proxy restarted right now?
//
// Why this exists as a tool rather than as another one-off probe. The sweep
// runs on the first request after a restart and its deletions are terminal;
// there is no dry-run in the extension and no moment at which a human is
// asked. On 2026-08-16 the sweep's scope regex was unanchored, so it claimed
// every co-tenant extension's `<key>-<family>-events.jsonl` as its own: a
// restart would have destroyed 13,699 files belonging to
// insertion-normalization, deferred-tool-rewrite and output-guard, against 846
// of prefix-diff's own. That was found by building this projection BY HAND,
// twice on one day, by two different sessions — which is the tell this repo
// already names for a check that should exist.
//
// It is a GATE, not a report: exit 2 if the sweep would delete a file that
// belongs to another extension. A projection nobody reads is worth nothing at
// the moment it matters, which is the minute before a restart.
//
// READ-ONLY BY CONSTRUCTION. The real `sweepSnapshotDir` is imported and
// driven — never a transcription of its rules, which would drift from the
// predicate it is meant to grade — but the fs handed to it RECORDS unlink
// calls instead of performing them, and neither `unlink` nor `chmod` touches
// the disk. Only `readdir` and `stat` are real.
//
// Usage:
//   node tools/snapshot-sweep-projection.mjs                 # the live dir
//   node tools/snapshot-sweep-projection.mjs --dir <path>    # another dir
//   node tools/snapshot-sweep-projection.mjs --json

import { readdir, stat, readFile } from "node:fs/promises";
import { join } from "node:path";
import { statePath } from "../proxy/xdg-dirs.mjs";
import { sweepSnapshotDir } from "../proxy/extensions/prefix-diff.mjs";

const OWN = "prefix-diff.mjs";

// Which per-session artifact names does each extension write into the snapshot
// directory? ASKED OF THE SOURCES, never restated here — a hardcoded roster
// cannot age loudly, and the whole defect this tool exists for was a list that
// disagreed with the code beside it.
async function artifactTailsByOwner(extDirUrl) {
  const NAME_RE = /\$\{[A-Za-z_$][\w$]*\}(-[A-Za-z0-9._-]+)/g;
  const out = new Map();
  for (const f of (await readdir(extDirUrl)).filter((n) => n.endsWith(".mjs"))) {
    const src = await readFile(new URL(f, extDirUrl), "utf-8");
    for (const m of src.matchAll(NAME_RE)) {
      if (!/\.(json|jsonl)$/.test(m[1])) continue;
      if (!out.has(f)) out.set(f, new Set());
      out.get(f).add(m[1]);
    }
  }
  return out;
}

function ownerOf(name, tailsByOwner) {
  // Longest tail wins: `-insertion-events.jsonl` must beat `-events.jsonl`,
  // which is the exact ambiguity that produced the defect.
  let best = null;
  for (const [owner, tails] of tailsByOwner) {
    for (const tail of tails) {
      if (!name.endsWith(tail) && !name.endsWith(`${tail}.1`)) continue;
      if (!best || tail.length > best.tail.length) best = { owner, tail };
    }
  }
  return best?.owner ?? "unknown";
}

async function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const dirFlag = argv.indexOf("--dir");
  const dir = dirFlag >= 0 ? argv[dirFlag + 1] : statePath("snapshots");

  const extDirUrl = new URL("../proxy/extensions/", import.meta.url);
  const tailsByOwner = await artifactTailsByOwner(extDirUrl);
  if (!tailsByOwner.has(OWN)) {
    process.stderr.write(`could not read ${OWN}'s own artifact names — refusing to grade\n`);
    process.exit(3);
  }

  const deleted = [];
  const recordingFs = {
    readdir,
    stat,
    unlink: async (p) => { deleted.push(p.slice(p.lastIndexOf("/") + 1)); },
    chmod: async () => {},
  };

  let total = 0;
  try {
    total = (await readdir(dir)).length;
  } catch (err) {
    process.stderr.write(`cannot read ${dir}: ${err?.message ?? err}\n`);
    process.exit(3);
  }

  const res = await sweepSnapshotDir(dir, recordingFs);

  const byOwner = new Map();
  for (const name of deleted) {
    const owner = ownerOf(name, tailsByOwner);
    byOwner.set(owner, (byOwner.get(owner) ?? 0) + 1);
  }
  const foreign = [...byOwner].filter(([o]) => o !== OWN);
  const foreignTotal = foreign.reduce((a, [, n]) => a + n, 0);
  const ownTotal = byOwner.get(OWN) ?? 0;

  const report = {
    dir,
    filesInDir: total,
    wouldDelete: res.deleted,
    keysRemaining: res.keysRemaining,
    ownDeletions: ownTotal,
    foreignDeletions: foreignTotal,
    byOwner: Object.fromEntries([...byOwner].sort((a, b) => b[1] - a[1])),
  };

  if (asJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(`snapshot dir: ${dir}\n`);
    process.stdout.write(`  files present   : ${total}\n`);
    process.stdout.write(`  would delete    : ${res.deleted}\n`);
    process.stdout.write(`  keys remaining  : ${res.keysRemaining}\n`);
    process.stdout.write(`  prefix-diff's own: ${ownTotal}\n`);
    process.stdout.write(`  OTHER extensions': ${foreignTotal}\n`);
    for (const [owner, n] of [...byOwner].sort((a, b) => b[1] - a[1])) {
      process.stdout.write(`      ${String(n).padStart(6)}  ${owner}\n`);
    }
  }

  // Both arms matter, and this is the half a naive fix gets wrong: a sweep
  // that deletes NOTHING has been broken, not repaired. Report it rather than
  // passing silently — a projection of zero over a non-empty directory is the
  // could-not-verify answer, not a clean one.
  if (foreignTotal > 0) {
    process.stderr.write(
      `\nFINDING: the sweep would delete ${foreignTotal} file(s) owned by other extensions.\n`,
    );
    process.exit(2);
  }
  if (total > 0 && res.deleted === 0) {
    process.stderr.write(
      `\nnote: the sweep would delete nothing at all over ${total} files — ` +
      `expected where everything is recent and under the key cap, ` +
      `suspicious if this directory holds artifacts past the TTL.\n`,
    );
  }
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`${err?.stack ?? err}\n`);
  process.exit(3);
});
