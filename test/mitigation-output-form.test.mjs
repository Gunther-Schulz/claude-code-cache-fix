// mitigation-output-form — the OUTPUT-side companion to `mitigated`.
//
// `findMitigationGaps`'s `mitigated` field is an INPUT-side fact: it trusts
// insertion-normalization's own self-report that it re-serialised CC's
// splice into an append, and prices the miss from CC's own input divergence
// index. It has no opinion on where the result actually landed once
// forwarded. Measured 2026-07-29 (capture s-633915a8, pair n=26->28):
// `mitigated: true`, `rebilledBytes: 0` — while the forwarded array kept a
// byte-stable prefix through index 30 and then SPLICED a standalone system
// message in at index 31, re-billing everything from there (outcome record:
// cacheRead 15424 / cacheCreation 124025). `mitigated` alone cannot see
// this; `outputForm`/`outputPreserved`/`rebilledOutBytes` can, because they
// compare `outHash`/`outBytes` — what we actually forwarded — instead of
// `inHash`/`inBytes` — what CC sent.
//
// Full evidence trail: the fidelity probe report at
// /tmp/claude-1000/-home-g-dev-vendor-claude-code-cache-fix/633915a8-dcfd-479a-8ca8-0c4452d5a9b6/scratchpad/fidelity-probe-report.md

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { findMitigationGaps, readCapture } from "../tools/replay.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");
const EXT_DIR = join(REPO, "proxy", "extensions");
const EXT_CONFIG = join(REPO, "proxy", "extensions.json");

const user = (t) => ({ role: "user", content: [{ type: "text", text: t }] });
const asst = (t) => ({ role: "assistant", content: [{ type: "text", text: t }] });
const sys = (t) => ({ role: "system", content: t });

// One capture entry as replay.mjs's own main() loop builds it, before
// compactEntry converts it (same shape used by test/replay-gate-selfcheck).
const entry = (n, inMsgs, outMsgs, extra = {}) => ({
  n,
  ts: `2026-07-28T00:00:${String(n).padStart(2, "0")}Z`,
  key: "k",
  inMsgs,
  outMsgs,
  action: null,
  resetReason: null,
  ...extra,
});

// --- (ii) fires-on-non-defect guard: a GENUINE tail append is not flagged ---
//
// Same input-side shape as the existing "normalized splice counts as
// absorbed" test in replay-gate-selfcheck (input splices SPLICED mid-array,
// action: "normalized"), but here the reconstruction actually does what
// `mitigated: true` claims: the forwarded array keeps prev's output as a
// strict prefix and appends the new content at the TAIL. This must NOT be
// flagged — a checker that fires on a correct append is broken the same way
// as one that misses a real splice.
test("mitigation output-form: a genuine tail-append reconstruction reports append/preserved/0", () => {
  const prevIn = [user("u0"), asst("a1"), user("u2")];
  const curIn = [user("u0"), asst("a1"), user("SPLICED"), user("u2")];
  // The extension correctly stabilises the shared prefix AND appends the
  // new content at the tail instead of splicing it mid-array.
  const prevOut = [user("u0"), asst("a1"), user("u2")];
  const curOut = [user("u0"), asst("a1"), user("u2"), user("SPLICED")];

  const rows = findMitigationGaps([
    entry(0, prevIn, prevOut, { action: "append-only" }),
    entry(1, curIn, curOut, { action: "normalized" }),
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, "splice/insert-mid", "input-side classification is unchanged");
  assert.equal(rows[0].mitigated, true);
  assert.equal(rows[0].outputForm, "append");
  assert.equal(rows[0].outputPreserved, true);
  assert.equal(rows[0].rebilledOutBytes, 0);
});

// --- (i) the real defect: capture s-633915a8, pair n=26->28 ---
//
// Replays the ACTUAL extension pipeline over the ACTUAL capture, from the
// start of the file through request 28, under the same gate set the
// fidelity probe used (the boot record's gates, capture file line 1) — the
// same machinery tools/replay.mjs's main() drives (loadExtensions +
// runOnRequest, scratch CLAUDE_CONFIG_DIR), not a re-derivation of it.
// insertion-normalization is stateful (canonical persisted per conversation
// under CLAUDE_CONFIG_DIR), so every request from 0 must be replayed in
// order for n=28's reconstruction to match what actually shipped.
//
// The capture lives outside the repo, in the per-machine capture directory
// that rotates on a quadratic clock (docs/dev-loop.md, "Corpus hygiene") —
// it is not a committed fixture. If it has rotated away since this test was
// written, the test SKIPS with a stated reason rather than reporting a
// false pass or a false fail (docs/dev-loop.md, "A checker has THREE
// answers"); see the closing report for the harvesting gap this leaves.
const REAL_CAPTURE =
  "/home/g/.claude/cache-fix-captures/s-633915a8-dcfd-479a-8ca8-0c4452d5a9b6-requests.jsonl";
const GATES = {
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
const TARGET_N = 28;

test(
  "mitigation output-form: real capture n=26->28 reports a non-append output form at index 31",
  async (t) => {
    if (!existsSync(REAL_CAPTURE)) {
      t.skip(`capture rotated away (not found at ${REAL_CAPTURE}) — COULD NOT VERIFY`);
      return;
    }

    const scratch = await mkdtemp(join(tmpdir(), "mitigation-output-form-"));
    const saved = {};
    const overrides = { CLAUDE_CONFIG_DIR: scratch, ...GATES };
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
      const extensions = await loadExtensions(EXT_DIR, EXT_CONFIG);

      const entries = [];
      let reqN = -1;
      for await (const [, line] of readCapture(REAL_CAPTURE)) {
        let rec;
        try {
          rec = JSON.parse(line);
        } catch {
          continue;
        }
        if (rec.type === "outcome" || rec.type === "boot") continue;
        const n = ++reqN;
        const body = structuredClone(rec.body);
        const headers = {
          "anthropic-beta": rec.headers?.["anthropic-beta"] ?? undefined,
          "x-session-id": rec.headers?.["session-id"] ?? rec.sid ?? undefined,
        };
        const ctx = { body, headers, meta: { route: "messages" } };
        await runOnRequest(ctx, extensions);
        entries.push(
          entry(
            n,
            Array.isArray(rec.body?.messages) ? rec.body.messages : [],
            Array.isArray(ctx.body?.messages) ? ctx.body.messages : [],
            {
              key: rec.key,
              ts: rec.ts,
              action: ctx.meta.insertionNormalizeStats?.action ?? null,
              resetReason: ctx.meta.insertionNormalizeStats?.resetReason ?? null,
            },
          ),
        );
        if (n === TARGET_N) break;
      }

      const rows = findMitigationGaps(entries);
      const row = rows.find((r) => r.n === 28 && r.prevN === 26);

      assert.ok(row, "expected a mitigation row for pair n=26->28");
      // Established facts from the fidelity probe (not re-derived here):
      // input-side self-report claims full mitigation.
      assert.equal(row.mitigated, true, "input-side self-report: normalized, 0 rebilled");
      assert.equal(row.rebilledBytes, 0);
      // Output-side reality: the forwarded prefix is stable through index 30
      // (fidelity report Fact 2/5 — n=26's own index 30 hash equals n=28's
      // reconstructed index 30) and diverges at 31, where the standalone
      // system message is spliced in ahead of n=26's carried-forward tail
      // (fidelity report "What's actually happening"). The census classifies
      // this specific pair as "replace/edit" rather than pure
      // "splice/insert-mid" — one of n=26's forwarded messages is entirely
      // ABSENT from n=28's output (missing=1, added=1: confirmed by a direct
      // set-membership diff of the two outHash arrays, independent of this
      // implementation's classification branch), so `outputForm` lands on
      // the `edit@N` branch rather than `splice@N` — both are the
      // non-append buckets the brief names as acceptable, and the load-
      // bearing fact is the INDEX (31) and non-append, not which of the two
      // labels.
      assert.notEqual(row.outputForm, "append", "the output is NOT a clean tail append");
      assert.equal(
        row.outputForm,
        "edit@31",
        "byte evidence (fidelity report Fact 2/5 + missing-message diff): divergence at 31, not a pure splice",
      );
      assert.equal(row.outputPreserved, false);
      assert.ok(row.rebilledOutBytes > 0, "the splice re-bills everything from index 31 on");
    } finally {
      process.stderr.write = origStderr;
      for (const k of Object.keys(saved)) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    }
  },
);
