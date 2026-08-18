// The instrument index must stay DERIVED and must stay complete.
//
// Grounding, 2026-08-18: the repo carried 59 tools while the documents a fresh
// session reads named 20. A session designed a ninth state aggregator that
// evening without finding `state-report.mjs`, which was in the unnamed set and
// whose own header calls it the one-command answer to "what is the state of
// things". The index closes that, and these bites are what stop the index
// itself from becoming the next stale list.

import { test } from "node:test";
import assert from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { collectTools, purposeOf } from "../tools/tools-index.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS = join(REPO, "tools");

test("index membership is DERIVED from the directory, not restated", () => {
  // The defect this pins: a hand-kept list stays green while the directory
  // grows. Derivation is checked by planting nothing and comparing sets —
  // any divergence means someone introduced a second source of truth.
  const onDisk = readdirSync(TOOLS).filter((f) => f.endsWith(".mjs")).sort();
  const indexed = collectTools(TOOLS).map((t) => t.tool).sort();
  assert.deepStrictEqual(indexed, onDisk,
    "every tools/*.mjs must appear in the index; a divergence means the index stopped deriving");
});

test("every tool carries a purpose header — a nameless tool is an undiscoverable tool", () => {
  const missing = collectTools(TOOLS).filter((t) => !t.purpose).map((t) => t.tool);
  assert.deepStrictEqual(missing, [],
    `these tools have no purpose header, so the index cannot describe them: ${missing.join(", ")}`);
});

test("purposeOf reads BOTH header styles — the false-positive class, pinned", () => {
  // The first draft read only `//` and reported three JSDoc-headed tools as
  // headerless: a check firing on a non-defect. Both arms, so a regression to
  // either side goes red.
  assert.strictEqual(purposeOf("// widget-tool — does the widget thing.\n", "widget-tool.mjs"),
    "does the widget thing.");
  assert.strictEqual(purposeOf("#!/usr/bin/env node\n/**\n * widget-tool — does the widget thing.\n */\n", "widget-tool.mjs"),
    "does the widget thing.");
});

test("purposeOf returns null when there is genuinely no header — the negative control", () => {
  // Without this, the test above passes for a function that returns a string
  // unconditionally, and "every tool has a purpose" becomes unfalsifiable.
  assert.strictEqual(purposeOf("import x from 'y';\nconst a = 1;\n", "bare.mjs"), null);
});

test("the SessionStart injection form stays small — it is re-billed every turn", () => {
  // Not a style rule: this string enters the prefix of every session and is
  // re-read on every later turn. Measured at mint: ~995 chars / ~249 tokens.
  // The cap is deliberately loose enough for real growth and tight enough to
  // fail before someone pastes the full index in here.
  const names = collectTools(TOOLS).map((t) => t.name).join(", ");
  assert.ok(names.length < 2200,
    `injection form is ${names.length} chars; past ~2200 it costs more per turn than it saves — ` +
    "switch to a narrower form rather than raising this number");
});

test("the index names the tools tonight's failure needed", () => {
  // A membership assertion derived from the directory cannot notice that the
  // SPECIFIC instrument nobody could find is present. These three are the
  // recorded misses; they are cheap to assert and they document why the file
  // exists.
  const names = new Set(collectTools(TOOLS).map((t) => t.name));
  for (const n of ["state-report", "duplicate-billing", "backlog-index"]) {
    assert.ok(names.has(n), `${n} must be discoverable from the index`);
  }
  const sr = collectTools(TOOLS).find((t) => t.name === "state-report");
  assert.ok(sr.purpose && sr.purpose.length > 10,
    "state-report's purpose line is what would have prevented the duplicate build");
});
