// tools-index — what instruments this repo owns, DERIVED from the directory.
//
// Why this exists, measured 2026-08-18: the repo carried 59 tools and the
// documents a fresh session reads named 20 of them. `state-report.mjs` — whose
// own header calls it the one-command answer to "what is the state of things" —
// was in the unnamed 39, and a session that evening designed a ninth
// aggregator from scratch without finding it. That is a discoverability
// failure, not a judgment failure: an instrument nobody can find is an
// instrument nobody runs, and its absence is indistinguishable from it not
// existing.
//
// The list is DERIVED, never restated. A hand-maintained index beside the
// directory it mirrors is the coverage-assertion defect this repo has been
// bitten by before: the directory gains a member, the list stays green, and
// the staleness is byte-identical to health. So the directory is the source
// and the purpose line comes out of each file's own header.
//
// CLI:
//   node tools/tools-index.mjs            # grouped text, one line per tool
//   node tools/tools-index.mjs --json     # machine-readable
//   node tools/tools-index.mjs --missing  # only tools lacking a purpose header
//   node tools/tools-index.mjs --grep <s> # tools whose name or purpose matches
//   node tools/tools-index.mjs --names    # the SessionStart injection form
//
// `--names` is sized deliberately. Measured 2026-08-18, the four candidate
// injection forms cost ~1370 / ~949 / ~249 / ~21 tokens, and a session-start
// injection is re-billed on every later turn of every session forever. Names
// alone were chosen: recognising that `state-report` EXISTS is the whole of
// what the failure needed, and the purpose line is one `--grep` away. The
// 21-token pointer was rejected for being a pointer — this repo's own record
// is that a pointer a session must choose to follow goes inert, which is the
// failure mode this exists to close.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// A tool's purpose is the first `//` comment line of its own header, with the
// leading name (and any `tools/` path form) stripped. Reading it from the file
// is what keeps this honest: the tool and its description cannot drift apart,
// because there is only one of them.
// Both header styles occur here and BOTH are legitimate: `//` line comments
// and `/** … */` JSDoc blocks. The first draft of this read only `//` and
// reported three JSDoc-headed tools as headerless — a check firing on a
// non-defect, which is the shape that trains a reader to discount its reds.
// Found within a minute of first running it, on real input.
export function purposeOf(source, basename) {
  const stem = basename.replace(/\.mjs$/, "");
  for (const raw of source.split("\n").slice(0, 8)) {
    const line = raw.trim();
    const isComment = line.startsWith("//") || line.startsWith("/*") || line.startsWith("*");
    if (!isComment) {
      if (line === "" || line.startsWith("#!")) continue;
      break; // real code started; no header comment
    }
    const text = line.replace(/^\/\*+\s?/, "").replace(/^\*+\/?\s?/, "").replace(/^\/\/\s?/, "").trim();
    if (!text) continue;
    // Accept "name — purpose", "tools/name.mjs — purpose", or bare prose.
    const m = text.match(/^(?:tools\/)?([a-z0-9-]+)(?:\.mjs)?\s*[—–-]\s*(.+)$/i);
    if (m && (m[1] === stem || m[1] === basename)) return m[2].trim();
    return text;
  }
  return null;
}

export function collectTools(dir = HERE) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".mjs"))
    .sort()
    .map((f) => {
      let purpose = null;
      try { purpose = purposeOf(readFileSync(join(dir, f), "utf8"), f); } catch { /* unreadable */ }
      return { tool: f, name: f.replace(/\.mjs$/, ""), purpose };
    });
}

function main(argv) {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const missingOnly = args.includes("--missing");
  const gi = args.indexOf("--grep");
  const needle = gi >= 0 ? (args[gi + 1] || "").toLowerCase() : null;

  let rows = collectTools();
  const missing = rows.filter((r) => !r.purpose);

  if (args.includes("--names")) {
    console.log(`This repo owns ${rows.length} instruments under tools/. Before building a new one,`);
    console.log("check whether it already exists: node tools/tools-index.mjs --grep <intent>");
    console.log(rows.map((r) => r.name).join(", "));
    return 0;
  }
  if (missingOnly) rows = missing;
  if (needle) {
    rows = rows.filter((r) =>
      r.name.toLowerCase().includes(needle) || (r.purpose || "").toLowerCase().includes(needle));
  }

  if (json) {
    console.log(JSON.stringify({ total: collectTools().length, missingPurpose: missing.length, tools: rows }, null, 2));
    return missing.length && missingOnly ? 1 : 0;
  }

  const width = Math.max(...rows.map((r) => r.name.length), 10);
  for (const r of rows) {
    const p = r.purpose ? r.purpose.replace(/\s+/g, " ") : "(NO PURPOSE HEADER — add one as line 1)";
    console.log(`${r.name.padEnd(width)}  ${p.slice(0, 108)}`);
  }
  if (!needle && !missingOnly) {
    console.log(`\n${collectTools().length} tools; ${missing.length} without a purpose header.`);
    console.log("Run this BEFORE building a new tool — the one it duplicates is usually already here.");
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv));
}
