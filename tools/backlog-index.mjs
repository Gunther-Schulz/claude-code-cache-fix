#!/usr/bin/env node
// tools/backlog-index.mjs — a derived VIEW of BACKLOG.md that does not
// silently go stale.
//
// WHY THIS EXISTS. See BACKLOG.md, "a derived VIEW of this backlog outlives
// its source within one session". A line-number index generated at
// `8e58988` was read after a commit inserted lines, and six entries came
// back as the WRONG entries; ORDINALS shift when entries leave `## Open`,
// so a lane's `n=61` and the desk's `n=61` can name different entries. Both
// are the same class docs/dev-loop.md already names ("two coordinate spaces
// that look like one") — a volatile position (line number, ordinal) is
// read as if it were a stable identity.
//
// WHAT THIS IS: per READY `## Open` entry, a STABLE id (the header line's
// own content hash — survives insertion and removal elsewhere in the file)
// alongside the volatile ordinal `n` and `line`, plus the exact
// `git rev-parse HEAD:BACKLOG.md` blob the index was built from. Resolving
// by ORDINAL against a text whose blob does not match the index's stamped
// blob fails LOUDLY rather than returning a plausible wrong entry — the
// entry's own done-criterion. Resolving by ID always re-derives from the
// CURRENT text, so it is never stale by construction.
//
// CLI:
//   node tools/backlog-index.mjs               # build + print the index (JSON) for BACKLOG.md
//   node tools/backlog-index.mjs <path>         # build + print the index for a specific file
//   node tools/backlog-index.mjs --resolve <id> [<path>]
//                                                # resolve one id against a (possibly different) file

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { censusEntries } from "./backlog-lint.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
export const DEFAULT_BACKLOG = join(REPO_ROOT, "BACKLOG.md");

// The entry's stable id: a content hash of its RAW header line (untruncated,
// unlike the `.headline` census field) — the header line is what a reader
// and a dispatch brief both actually cite, so it is what identity is keyed
// on. Truncated to 12 hex chars, same convention as this corpus's own short
// commit-hash citations.
export function entryId(rawFirstLine) {
  return createHash("sha256").update(rawFirstLine).digest("hex").slice(0, 12);
}

// Builds the index: one row per READY '## Open' entry, in file order (the
// ordinal `n`, 0-based), each carrying its stable id alongside the volatile
// `line`. `blob` is the exact git blob hash the index was built from —
// stamped by the caller (CLI: `git rev-parse HEAD:BACKLOG.md`; a bite:
// whatever ref it is proving against), never re-derived here, so this
// function stays pure and testable without git.
export function buildIndex(text, blob) {
  const ready = censusEntries(text).filter((e) => e.grade === "READY");
  return {
    blob,
    entries: ready.map((e, n) => ({
      n,
      id: entryId(e.rawFirstLine),
      line: e.line,
      headline: e.headline,
    })),
  };
}

export function currentBlob(cwd = REPO_ROOT) {
  return execFileSync("git", ["rev-parse", "HEAD:BACKLOG.md"], { cwd, encoding: "utf8" }).trim();
}

// Resolves an id against a (possibly newer, possibly older) TEXT directly —
// never against a stored index's stale rows. Returns null when the id no
// longer resolves (the entry closed, or its header text changed — a
// content-hash id cannot survive a HEADER edit, which is a real limit
// stated rather than hidden: the id is stable across the REST of the file
// changing, not across the entry's OWN header changing).
export function resolveById(text, id) {
  const ready = censusEntries(text).filter((e) => e.grade === "READY");
  return ready.find((e) => entryId(e.rawFirstLine) === id) ?? null;
}

// Resolves an ORDINAL against the index — but only when `blobNow` (the
// caller's freshly-measured current blob) matches the index's own stamped
// blob. A mismatch throws rather than returning the ordinal's row from the
// STALE index, which is exactly the "returns a plausible wrong entry"
// failure this tool exists to stop. `blobNow` is a parameter (never
// re-derived internally) so this function stays pure and testable without
// git, same idiom as the rest of this backlog-* family.
export function resolveByOrdinal(index, blobNow, n) {
  if (blobNow !== index.blob) {
    throw new Error(
      `backlog-index: STALE — index built from blob ${index.blob}, current blob is ${blobNow}. ` +
        `An ordinal is not meaningful across a blob change; re-derive the index or resolve by id instead.`,
    );
  }
  const row = index.entries.find((e) => e.n === n);
  if (!row) throw new Error(`backlog-index: no entry at ordinal ${n} (index has ${index.entries.length})`);
  return row;
}

function readInput(pathArg) {
  if (pathArg === "-") return readFileSync(0, "utf8");
  return readFileSync(pathArg ?? DEFAULT_BACKLOG, "utf8");
}

function main(argv) {
  const args = argv.slice(2);
  const resolveIdx = args.indexOf("--resolve");
  if (resolveIdx >= 0) {
    const id = args[resolveIdx + 1];
    if (!id) {
      process.stderr.write("backlog-index: --resolve requires an id\n");
      return 2;
    }
    const rest = args.filter((_, i) => i !== resolveIdx && i !== resolveIdx + 1);
    const text = readInput(rest[0]);
    const row = resolveById(text, id);
    if (!row) {
      process.stdout.write(`NOT-FOUND id=${id}\n`);
      return 1;
    }
    process.stdout.write(`line=${row.line} headline="${row.headline}"\n`);
    return 0;
  }

  const pathArg = args[0];
  const text = readInput(pathArg);
  const blob = pathArg && pathArg !== "-" ? execFileSync("git", ["hash-object", pathArg], { cwd: REPO_ROOT, encoding: "utf8" }).trim() : currentBlob();
  const index = buildIndex(text, blob);
  process.stdout.write(JSON.stringify(index, null, 2) + "\n");
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(main(process.argv));
}
