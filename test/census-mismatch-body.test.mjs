// census-mismatch-body — the census header
// (reminder-migration-census.mjs:46-47) promises every MISMATCH is "a hole in
// the rule and is printed in full, because these are what would silently move
// a bust." The code prints lengths only: a MISMATCH row's own `text` field is
// always "" by construction (the no-counterpart branch), and the printed row
// shows `rejected=<n>ch` / `actual=<n>ch` — a count, never the bytes.
//
// BACKLOG (READY — "the census header promises MISMATCH bodies 'printed in
// full'"): three consumers had already read the sentence as a capability
// (the header's own author, the dotfiles 2026-08-07 handover, this repo's own
// dispatch brief) before anyone traced it to what the code actually emits.
// Decision: build the capability. Under `--verbose`, a MISMATCH row prints
// the canonical reconstruction and — where one exists — the rejected
// candidate's actual text, UNTRUNCATED (unlike EXTENDED's `extra:` sample,
// which is deliberately a 120-char preview; a byte-gate hole needs the whole
// hole). Without `--verbose` the row stays as it is today — a summary line,
// no body — matching the existing convention that unbounded body content is
// verbose-gated (`extra:` for EXTENDED already follows the same paywall for
// the SAMPLE COUNT; this gates the BODY ITSELF for MISMATCH specifically,
// which is the new capability).
//
// Reuses the exact MISMATCH shape `census-counterpart-diagnostic.test.mjs`
// pins at the `analysePair` level (a position-eligible standalone whose bytes
// are wrapped, so `classify()` rejects it) — this file exercises it through
// the real CLI end to end, because the row a reader acts on is the delivered
// stdout, not a field on a finding object (dev-loop.md, "wrongness lives
// where the work takes effect"). Synthetic, deterministic bytes only — this
// repo is public.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const TOOL = new URL("../tools/reminder-migration-census.mjs", import.meta.url).pathname;

// Padded well past EXTENDED's 120-char preview length, so a truncated-to-120
// printout is distinguishable from the real, untruncated one.
const HOST_ID = "t_host_mismatch_body_007";
const INNER = "synthetic mismatch-body reminder text, deterministic, not capture bytes, " +
  "padded past the 120-char preview boundary so truncation would be visible ".repeat(3);
const WRAPPED = `<system-reminder>\n${INNER}\n</system-reminder>`;

const head = { role: "user", content: [{ type: "text", text: "conversation head, synthetic" }] };
const hostMsg = {
  role: "user",
  content: [
    { type: "tool_result", tool_use_id: HOST_ID },
    { type: "text", text: WRAPPED },
  ],
};
const hostEcho = { role: "user", content: [{ type: "tool_result", tool_use_id: HOST_ID }] };
// The rejected candidate: same wrapped bytes, position-eligible (after the
// host), but classify() rejects it (wrapper retained) — MISMATCH, with
// `rejectedCandidate` set and `anyCreated` true (the standalone's text
// contains the unwrapped inner block), never DROPPED.
const rejected = { role: "system", content: WRAPPED };

function runCensus(extraArgs = []) {
  const dir = tmpDirSync("census-mismatch-body-");
  const p = join(dir, "s-synthetic-requests.jsonl");
  writeFileSync(p, [
    JSON.stringify({ ts: "2026-08-10T09:00:00.000Z",
                      body: { messages: [head, hostMsg] } }),
    JSON.stringify({ ts: "2026-08-10T09:00:01.000Z",
                      body: { messages: [head, hostEcho, rejected] } }),
  ].join("\n") + "\n");
  return execFileSync(process.execPath, [TOOL, p, ...extraArgs],
    { encoding: "utf-8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
}

test("RED-FIRST — --verbose prints a MISMATCH row's full reconstruction and rejected candidate", () => {
  const out = runCensus(["--verbose"]);
  assert.match(out, /1 same-conversation pair\(s\)/, "the pair must have been compared");
  const row = out.split("\n").find((l) => l.trim().startsWith("MISMATCH"));
  assert.ok(row, `a MISMATCH row must be printed; got:\n${out}`);

  // The reconstruction (canonical(), wrapper stripped) — full INNER text,
  // not a 120-char slice. Printed via JSON.stringify (matching the header's
  // `--verbose` body-print convention), so the wrapped candidate's embedded
  // newline is compared against its JSON-escaped form, not the raw bytes.
  assert.ok(out.includes(JSON.stringify(INNER)),
    `the row's full reconstruction must be printed under --verbose; got:\n${out}`);
  // The rejected candidate — the actual standalone bytes considered and
  // turned down, wrapper included, not just its length.
  assert.ok(out.includes(JSON.stringify(WRAPPED)),
    `the rejected candidate's full text must be printed under --verbose; got:\n${out}`);
});

test("without --verbose, the MISMATCH row stays a summary line — no body printed", () => {
  const out = runCensus([]);
  const row = out.split("\n").find((l) => l.trim().startsWith("MISMATCH"));
  assert.ok(row, `a MISMATCH row must still be printed; got:\n${out}`);
  assert.ok(!out.includes(INNER),
    "the body is verbose-gated; the plain run must not leak the full reconstruction");
  assert.ok(!out.includes(WRAPPED),
    "the body is verbose-gated; the plain run must not leak the rejected candidate's bytes");
});
