// The busting request is selected by what could HAVE BEEN it, not by clock
// position alone.
//
// The incident, measured 2026-08-07T01:00:55Z (a 375,646-token opus event):
// the selection rule was "the newest plausible request at or before the ledger
// stamp", where plausible meant only ">= 2 messages" — a floor so low that
// every co-tenant request in the session clears it. One session id covers many
// conversations (main thread, subagents, one-message sidecars), and live
// traffic interleaves them, so the candidate set around the bust held a 111 kB
// two-message request alongside the real 1.0 MB opus one. The telemetry
// preference picked the small one (a sidecar's own reset event landed 5 ms
// from it), it was the FIRST request of its own conversation, so no
// predecessor existed and the whole walk cascaded to UNVERIFIABLE — with the
// capture present at 80 MB and the real request four records away.
//
// The discriminator, from the entry's design: the ledger's own `ctx` against
// the candidate's byte size. It is DEFINITIONAL, not tuned — no tokenizer
// emits a token from fewer than one byte, so a request that carried `ctx`
// tokens occupies at least `ctx` bytes, and anything smaller provably is not
// the busting request. The bound errs only toward keeping candidates. Size is
// primary over the model because a model list goes stale and a byte count does
// not.
//
// RED, on the real artifact rather than a fixture (recorded in the dispatch
// report): before this change `--at 2026-08-07T01:00:55Z` selected the
// 01:00:21.763Z 2-message request and returned UNVERIFIABLE; after it, the
// 01:00:27.553Z opus request and a real verdict. The synthetic bites below
// carry the same mechanism so it survives the capture's rotation, and each is
// falsifiable by disabling the size test (see the last test).

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { capturePairResult } from "../tools/bust-triage.mjs";

const at = (iso) => Date.parse(iso) / 1000;

/** A request record whose serialized size is padded to roughly `bytes`. */
function req(ts, conv, n, bytes) {
  const head = { role: "user", content: [{ type: "text", text: "conv-" + conv }] };
  const rest = Array.from({ length: n - 1 }, (_, i) => ({
    role: "user", content: [{ type: "text", text: "m" + i }],
  }));
  const rec = { ts, id: ts, body: { messages: [head, ...rest] } };
  const pad = bytes - Buffer.byteLength(JSON.stringify(rec));
  if (pad > 0) rec.body.messages[rec.body.messages.length - 1].content[0].text += "x".repeat(pad);
  return JSON.stringify(rec);
}

function capture(records, key = "s-sel0001") {
  const dir = tmpDirSync("bt-sel-");
  writeFileSync(join(dir, `${key}-requests.jsonl`), records.join("\n") + "\n");
  return dir;
}

// THE motivating shape, reproduced with the live numbers' proportions: a small
// co-tenant request sits NEWER than the real one and is the first of its own
// conversation, so selecting it destroys the walk.
const CTX = 375646;
const SHAPE = [
  req("2026-08-07T01:00:21.700Z", "MAIN", 2, 900000),   // the real predecessor
  req("2026-08-07T01:00:27.553Z", "MAIN", 4, 1020000),  // THE busting request
  req("2026-08-07T01:00:54.702Z", "SIDECAR", 2, 20000), // newer, far too small
];

test("BITE — a request too small to BE the event is not selected as its cause", async () => {
  const dir = capture(SHAPE);
  const r = await capturePairResult("sel0001", at("2026-08-07T01:00:55Z"), dir, CTX);
  assert.equal(r.ok, true, `walk failed: ${r.code} — ${r.detail}`);
  assert.equal(r.after.ts, "2026-08-07T01:00:27.553Z",
    "the newest request is not the busting request when it cannot hold the context");
  assert.equal(r.before.ts, "2026-08-07T01:00:21.700Z",
    "and its predecessor comes from the SAME conversation");
});

// The cascade the entry describes: with the sidecar selected there is no
// predecessor, so the tool reports UNVERIFIABLE about a capture that holds
// the answer. This pins that the size test is what prevents it — the same
// input with the test disabled reproduces the original failure.
test("BITE — without the ctx test the same input reproduces the original UNVERIFIABLE", async () => {
  const dir = capture(SHAPE);
  const off = await capturePairResult("sel0001", at("2026-08-07T01:00:55Z"), dir, null);
  assert.equal(off.ok, false, "with no ctx the sidecar is selectable again");
  assert.equal(off.code, "no-pair-in-conversation");
  assert.match(off.detail, /2026-08-07T01:00:54\.702Z/,
    "and the reason names the sidecar it wrongly selected");
  // …which is exactly the pair the ctx test recovers.
  const on = await capturePairResult("sel0001", at("2026-08-07T01:00:55Z"), dir, CTX);
  assert.equal(on.ok, true);
});

// Size, not model. The entry: "Prefer the size test as primary; it needs no
// model list to go stale." A big request from an unexpected model is still a
// candidate; a small one from the RIGHT model is not.
test("BITE — the test is byte size, not a model allowlist", async () => {
  const dir = capture([
    req("2026-08-07T01:00:00.000Z", "MAIN", 2, 900000),
    req("2026-08-07T01:00:10.000Z", "MAIN", 4, 1020000),
  ], "s-sel0002");
  const r = await capturePairResult("sel0002", at("2026-08-07T01:00:55Z"), dir, CTX);
  assert.equal(r.ok, true, "no model appears anywhere in the rule");
  assert.equal(r.after.ts, "2026-08-07T01:00:10.000Z");
});

// The bound must not exclude a genuine candidate. Bytes >= tokens always, so a
// request whose size sits just above ctx is kept; the test can only ever be
// too permissive, never too strict.
test("CONTROL — a candidate only just large enough is kept", async () => {
  const dir = capture([
    req("2026-08-07T01:00:00.000Z", "MAIN", 2, CTX + 500),
    req("2026-08-07T01:00:10.000Z", "MAIN", 3, CTX + 800),
  ], "s-sel0003");
  const r = await capturePairResult("sel0003", at("2026-08-07T01:00:55Z"), dir, CTX);
  assert.equal(r.ok, true, "a request larger than ctx bytes must never be excluded");
  assert.equal(r.after.ts, "2026-08-07T01:00:10.000Z");
});

// A ledger record with no ctx (older records) must leave the pre-existing rule
// exactly as it was — the fix may not turn a missing field into an empty
// candidate set.
test("CONTROL — a null ctx disables the test rather than excluding everything", async () => {
  const dir = capture([
    req("2026-08-07T01:00:00.000Z", "MAIN", 2, 5000),
    req("2026-08-07T01:00:10.000Z", "MAIN", 3, 6000),
  ], "s-sel0004");
  const r = await capturePairResult("sel0004", at("2026-08-07T01:00:55Z"), dir, null);
  assert.equal(r.ok, true, "no ctx means the old behaviour, unchanged");
  assert.equal(r.after.ts, "2026-08-07T01:00:10.000Z");
});

// When the size test empties the candidate set, that is the THIRD answer with
// its own measured reason — never a silent fallback to a request the tool has
// just proved cannot be the cause.
test("BITE — an emptied candidate set names the test that emptied it", async () => {
  const dir = capture([
    req("2026-08-07T01:00:00.000Z", "MAIN", 2, 5000),
    req("2026-08-07T01:00:10.000Z", "MAIN", 3, 6000),
  ], "s-sel0005");
  const r = await capturePairResult("sel0005", at("2026-08-07T01:00:55Z"), dir, CTX);
  assert.equal(r.ok, false);
  assert.equal(r.code, "no-candidate");
  assert.match(r.detail, /smaller than the ledger's ctx of 375646 tokens/,
    `the reason must name the test that ruled them out: ${r.detail}`);
  assert.match(r.detail, /2 request\(s\)/, "and how many it ruled out");
});
