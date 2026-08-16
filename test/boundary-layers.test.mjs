// `tools/boundary-layers.mjs` prices a cold event layer by layer and
// classifies the message-array divergence. Both halves get bites, because
// both have already produced a wrong answer:
//
//  - the CASCADE is what answers matrix rows 24 and 29's standing question
//    ("where does the divergence land once layer X is pinned"), and a wrong
//    layer ordering would price the wrong mitigation;
//  - the ALIGNMENT classifier's FIRST version reported "the history below is
//    rebuilt" on the live 919k pair, because it measured the agreeing run
//    starting AT the divergence index — which is a known mismatch, so the
//    run was 0 at every offset and every shape looked like a rebuild. The
//    truth was two messages edited in place with 1,432 identical after them.
//    A scan anchored to a known mismatch cannot measure agreement; these
//    tests pin the three outcomes apart.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
// Namespace import — deliberate, matching test/gate-live-rowpins.test.mjs's
// own precedent. The red-first arm of the bites below runs against a
// tools/boundary-layers.mjs that does not yet export `captureIndexEntry` or
// `CAPTURE_INDEX_KEYS`; a named import of a missing export fails the whole
// module at ESM link time and reddens every OTHER test in this file too. A
// namespace import only fails where the missing member is actually read, so
// the real pass/fail split stays discriminating.
import * as boundaryLayers from "../tools/boundary-layers.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "boundary-layers.mjs");

const msg = (t) => ({ role: "user", content: [{ type: "text", text: `m-${t}` }] });
const sys = (t) => ({ type: "text", text: t });

function capture(records) {
  const dir = tmpDirSync("bl-");
  const f = join(dir, "s-BL01-requests.jsonl");
  writeFileSync(f, records.map((r) => JSON.stringify(r)).join("\n") + "\n");
  return f;
}

function run(file, extra = []) {
  const out = execFileSync(process.execPath,
    [TOOL, "--capture", file, "--at", "2026-08-15T15:07:49Z", "--json", ...extra],
    { cwd: REPO, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return JSON.parse(out);
}

const BODY = Array.from({ length: 12 }, (_, i) => msg(`e${i}`));
const rec = (ts, { tools, system, messages }) => ({ ts, id: ts, body: { model: "m", tools, system, messages } });

test("BITE — the cascade reports layers in wire order and names the FIRST divergence", () => {
  // tools differ AND system differs. tools render first, so the cascade must
  // name tools — pinning system alone would buy nothing, which is exactly the
  // conclusion the tool exists to make un-guessable.
  const f = capture([
    rec("2026-08-15T15:04:43.000Z", { tools: [{ name: "Bash", description: "session_AAA" }], system: [sys("s0"), sys("env-OLD")], messages: [msg("head"), ...BODY] }),
    rec("2026-08-15T15:07:10.000Z", { tools: [{ name: "Bash", description: "session_BBB" }], system: [sys("s0"), sys("env-NEW")], messages: [msg("head"), ...BODY] }),
  ]);
  const d = run(f);
  assert.equal(d.firstDivergingLayer, "tools", "tools render before system and must be named first");
  const names = d.layers.map((l) => l.layer);
  assert.deepEqual(names.slice(0, 3), ["tools", "system[0]", "system[1]"], "wire order, not object order");
  assert.equal(d.layers.find((l) => l.layer === "system[0]").identical, true);
  assert.equal(d.layers.find((l) => l.layer === "system[1]").identical, false);
});

test("BITE — two messages edited IN PLACE classify as LOCAL-EDIT, not REBUILD", () => {
  // The live shape, reduced: indices 5 and 6 change, everything after is
  // byte-identical at the SAME index. The first version of the classifier
  // called this a rebuild.
  const before = [msg("head"), ...BODY];
  const after = [msg("head"), ...BODY];
  after[5] = msg("edited-5");
  after[6] = msg("edited-6");
  const f = capture([
    rec("2026-08-15T15:04:43.000Z", { tools: [], system: [sys("s")], messages: before }),
    rec("2026-08-15T15:07:10.000Z", { tools: [], system: [sys("s")], messages: after }),
  ]);
  const d = run(f);
  assert.equal(d.messageAlignment.kind, "LOCAL-EDIT");
  assert.equal(d.messageAlignment.divergenceIndex, 5);
  assert.equal(d.messageAlignment.changedMessages, 2, "exactly the two edited messages");
  assert.equal(d.messageAlignment.resumeOffset, 0, "the tail resumes at the SAME indices");
});

test("CONTROL — an inserted message classifies as SHIFT, never LOCAL-EDIT", () => {
  // The discriminating sibling: same divergence index, different mitigation
  // class. If this returned LOCAL-EDIT the classifier would be reporting
  // "something changed" rather than WHICH outcome happened.
  const before = [msg("head"), ...BODY];
  const after = [msg("head"), ...BODY.slice(0, 5), msg("INSERTED"), ...BODY.slice(5)];
  const f = capture([
    rec("2026-08-15T15:04:43.000Z", { tools: [], system: [sys("s")], messages: before }),
    rec("2026-08-15T15:07:10.000Z", { tools: [], system: [sys("s")], messages: after }),
  ]);
  const d = run(f);
  assert.equal(d.messageAlignment.kind, "SHIFT");
  assert.equal(d.messageAlignment.resumeOffset, -1, "one message inserted shifts the tail by one");
});

test("CONTROL — a pure append reports no message divergence at all", () => {
  const before = [msg("head"), ...BODY];
  const after = [msg("head"), ...BODY, msg("new-turn")];
  const f = capture([
    rec("2026-08-15T15:04:43.000Z", { tools: [], system: [sys("s")], messages: before }),
    rec("2026-08-15T15:07:10.000Z", { tools: [], system: [sys("s")], messages: after }),
  ]);
  const d = run(f);
  assert.equal(d.messageAlignment.kind, "IDENTICAL", "an append changes nothing already sent");
  assert.equal(d.firstDivergingLayer, null, "and no layer diverges");
});

test("BITE — predecessor relations that DISAGREE are reported, never collapsed", () => {
  // A co-tenant sidecar sits between the real predecessor and the busting
  // request. "nearest earlier, any conversation" must find the sidecar while
  // "same model" finds the real one — and both must be visible, because the
  // disagreement is the finding.
  const f = capture([
    rec("2026-08-15T15:04:43.000Z", { tools: [], system: [sys("s")], messages: [msg("head"), ...BODY] }),
    { ts: "2026-08-15T15:07:09.000Z", id: "sidecar", body: { model: "haiku", tools: [], system: [sys("x")], messages: [msg("side")] } },
    rec("2026-08-15T15:07:10.000Z", { tools: [], system: [sys("s")], messages: [msg("head2"), ...BODY] }),
  ]);
  const d = run(f);
  assert.equal(d.before.ts, "2026-08-15T15:04:43.000Z", "the same-model predecessor, not the sidecar");
  const byRelation = Object.fromEntries(d.candidates.map((c) => [c.relation, c.ts]));
  assert.equal(byRelation["nearest earlier, any conversation"], "2026-08-15T15:07:09.000Z",
    "the sidecar must still be REPORTED under its own relation");
  assert.notEqual(byRelation["nearest earlier, same model"], byRelation["nearest earlier, any conversation"],
    "the relations disagree here, which is precisely what must stay visible");
});

// --- Cache segments: the readable unit ---
//
// These pin the correction that produced them. The tool first reported "pin
// tools recovers 1.5%" on the live event — a byte fraction of what CHANGED,
// not a readable span. A layer view answers "what changed"; only a segment
// view answers "what could still be read".
//
// CORRECTED 2026-08-16: this header used to end "the true recovery from
// pinning tools alone is ZERO", which is false and was never asserted by any
// bite below — the bites only ever checked the state BEFORE a pin. `tools[]`
// having no breakpoint of its own means it cannot be read on its own, not
// that pinning it buys nothing: it sits inside the span ending at
// `system[1]`, and on the live event that span's only broken layer IS tools,
// so pinning tools alone makes the whole 38.9 kB span readable. The bite
// below is the one that would have caught the wrong sentence had it ever
// been implemented.

const ccMark = { type: "ephemeral", ttl: "1h" };
const sysCC = (t) => ({ type: "text", text: t, cache_control: ccMark });
const msgCC = (t) => ({ role: "user", content: [{ type: "text", text: `m-${t}`, cache_control: ccMark }] });

test("BITE — a layer with NO breakpoint is folded into the segment that closes over it", () => {
  // tools carry no cache_control, so they belong to the span ending at the
  // first system breakpoint. Pinning them is only useful if the WHOLE span
  // matches, which is what the smallest-useful-fix line has to say.
  const f = capture([
    rec("2026-08-15T15:04:43.000Z", { tools: [{ name: "Bash", description: "session_AAA" }], system: [sys("s0"), sysCC("s1")], messages: [msg("head"), ...BODY, msgCC("last")] }),
    rec("2026-08-15T15:07:10.000Z", { tools: [{ name: "Bash", description: "session_BBB" }], system: [sys("s0"), sysCC("s1")], messages: [msg("head"), ...BODY, msgCC("last")] }),
  ]);
  const d = run(f);
  assert.equal(d.breakpoints.length, 2, "one system breakpoint and one message breakpoint");
  const first = d.segments[0];
  assert.equal(first.endsAt, "system[1]");
  assert.ok(first.layers.includes("tools"), "tools must be INSIDE the first span, not a span of their own");
  assert.deepEqual(first.broken, ["tools"], "and they are what broke it");
  assert.equal(first.readable, false);
});

test("BITE — pinning the ONLY broken layer of the first span makes that span readable", () => {
  // The discriminating sibling of the bite above, and the one that refutes
  // "a layer with no breakpoint recovers nothing when pinned". Identical
  // fixture except that `tools` now MATCHES, which is what a working pin
  // produces. The span ending at system[1] must flip to readable and carry
  // real bytes — if it did not, the smallest-useful-fix line this tool prints
  // would be naming a fix that buys nothing.
  const pinned = { name: "Bash", description: "session_AAA" };
  const f = capture([
    rec("2026-08-15T15:04:43.000Z", { tools: [pinned], system: [sys("s0"), sysCC("s1")], messages: [msg("head"), ...BODY, msgCC("last")] }),
    rec("2026-08-15T15:07:10.000Z", { tools: [pinned], system: [sys("s0"), sysCC("s1")], messages: [msg("head"), ...BODY, msgCC("last")] }),
  ]);
  const d = run(f);
  const first = d.segments[0];
  assert.equal(first.endsAt, "system[1]");
  assert.ok(first.layers.includes("tools"), "tools still belong to this span");
  assert.deepEqual(first.broken, [], "with tools pinned nothing in the span is broken");
  assert.equal(first.readable, true, "so the API can read it — the recovery is NOT zero");
  assert.ok(first.bytes > 0, `and the span carries real bytes (got ${first.bytes})`);
});

test("BITE — an intact segment behind a broken one is NOT readable", () => {
  // Prefix caching is cumulative. A later span matching byte-for-byte buys
  // nothing once an earlier one broke, and reporting it as readable would
  // overstate every recovery estimate downstream.
  const f = capture([
    rec("2026-08-15T15:04:43.000Z", { tools: [{ name: "B", description: "OLD" }], system: [sys("s0"), sysCC("s1"), sysCC("s2")], messages: [msg("head"), ...BODY, msgCC("last")] }),
    rec("2026-08-15T15:07:10.000Z", { tools: [{ name: "B", description: "NEW" }], system: [sys("s0"), sysCC("s1"), sysCC("s2")], messages: [msg("head"), ...BODY, msgCC("last")] }),
  ]);
  const d = run(f);
  const second = d.segments.find((sg) => sg.endsAt === "system[2]");
  assert.equal(second.intact, true, "system[2] itself is byte-identical");
  assert.equal(second.readable, false, "but the span before it broke, so the API cannot read it either");
});

test("CONTROL — a divergence PAST the last breakpoint does not break that span", () => {
  // The discriminating sibling: the same message layer diverging, but after
  // the breakpoint rather than before it. If this reported BROKEN the tool
  // would be answering "something changed" where the question is "was the
  // cached span still valid".
  const before = [msg("head"), ...BODY];
  const after = [msg("head"), ...BODY];
  before.splice(3, 0, msgCC("bp"));      // breakpoint early in the array
  after.splice(3, 0, msgCC("bp"));
  after.push(msg("appended-after-bp"));  // divergence strictly after it
  const f = capture([
    rec("2026-08-15T15:04:43.000Z", { tools: [], system: [sysCC("s0")], messages: before }),
    rec("2026-08-15T15:07:10.000Z", { tools: [], system: [sysCC("s0")], messages: after }),
  ]);
  const d = run(f);
  for (const sg of d.segments) {
    assert.equal(sg.intact, true, `no span should break on a pure append: ${sg.endsAt} broke on ${sg.broken}`);
  }
});

// --- scanCapture's index: SCALARS ONLY, never the parsed request record ----
//
// `scanCapture` visits every request in a capture earlier than the busting
// one, to build the predecessor candidates above — a scan whose retained set
// grows with the capture, not with the pair being priced. It used to push
// `record: r` — the ENTIRE parsed request body — into each index entry.
// `.record` was read nowhere in this file (`grep -n '\.record\b'` finds only
// the field's own definition): dead retention that held the whole capture as
// parsed JS for the life of the scan. Measured on the motivating capture
// (3,023 request lines, largest line 2.8 MB): the unmodified tool died under
// `--max-old-space-size=2048` (exit 134, heap out of memory); removing only
// `record: r` made the identical run exit 0 with byte-identical output. Both
// bites below pin that — the SHAPE of the index entry, and the resource
// ceiling that shape buys.

test("BITE — captureIndexEntry returns exactly the five closed keys, all scalars", () => {
  const sample = {
    ts: "2026-08-15T15:04:43.000Z",
    id: "req-sample",
    body: { model: "m", messages: [msg("head"), msg("e0")] },
  };
  const entry = boundaryLayers.captureIndexEntry(sample);
  assert.deepEqual(
    Object.keys(entry),
    boundaryLayers.CAPTURE_INDEX_KEYS,
    "the index entry must carry exactly the closed key list and nothing else — " +
      "re-introducing `record: r` (or any other field) fails this half",
  );
  for (const k of boundaryLayers.CAPTURE_INDEX_KEYS) {
    const v = entry[k];
    assert.ok(
      v === null || typeof v !== "object",
      `${k} must be a primitive scalar, got ${typeof v} (${JSON.stringify(v)}) — ` +
        "an object reference here is retention, not an index",
    );
  }
});

// Fixture generator for the resource-cap bite below. Sized by measurement
// (recorded in the dispatch report, not guessed): 1,500 filler requests at
// 200 kB of message text each (~300 MB on disk) reliably crash the
// UNMODIFIED tool at a 192 MB heap cap and reliably run clean at 320 MB;
// the fixed tool (scalars-only index) runs the same file clean at 192 MB.
// The filler requests share nothing with the busting pair except being
// earlier in time — `scanCapture` visits them regardless of conversation,
// which is exactly the growth this bite exercises. The "before" record
// shares `messages[0]` with "after" so `findPredecessor`'s stage 1 (exact
// first-message identity — the same relation the BITEs above already
// exercise) resolves a real pair and the run reaches JSON output on success.
function bigFillerCapture(dir, n, bodyKB) {
  const big = "x".repeat(bodyKB * 1024);
  const bigMsg = (t) => ({ role: "user", content: [{ type: "text", text: `${big}-${t}` }] });
  const base = Date.parse("2026-08-15T14:00:00.000Z");
  const lines = [];
  for (let i = 0; i < n; i++) {
    const ts = new Date(base + i * 1000).toISOString();
    lines.push(JSON.stringify(rec(ts, {
      tools: [], system: [sys("s")], messages: [msg(`filler-head-${i}`), bigMsg(i), ...BODY],
    })));
  }
  const predTs = new Date(base + n * 1000).toISOString();
  lines.push(JSON.stringify(rec(predTs, { tools: [], system: [sys("s")], messages: [msg("head"), ...BODY] })));
  const afterTs = new Date(base + n * 1000 + 10000).toISOString();
  lines.push(JSON.stringify(rec(afterTs, { tools: [], system: [sys("s")], messages: [msg("head"), ...BODY] })));
  const f = join(dir, "s-BL02-requests.jsonl");
  writeFileSync(f, lines.join("\n") + "\n");
  return { file: f, at: afterTs, predTs };
}

const HEAP_CAP_MB = 192;

// A private TMPDIR for the spawned child, inside THIS test's own scratch —
// the test/gate-live-rowpins.test.mjs precedent: a V8 heap-limit failure
// calls abort() (SIGABRT) and runs no exit handlers, so anything the child
// writes under TMPDIR survives it unless TMPDIR already points inside a
// directory that dies with the parent process. boundary-layers.mjs itself
// never calls tools/tmpdir.mjs (grep: zero hits) and neither does the
// `findPredecessor` code path it drives, so this run is not expected to
// leave anything behind either way — the private TMPDIR is precautionary
// insurance against a future call site, not a containment claim asserted
// here, since asserting "nothing appeared" where nothing CAN appear would
// be a check that can never go red on the defect it names.
function runCapped(file, atIso, capMB, tmpdirPath) {
  return spawnSync(
    process.execPath,
    [`--max-old-space-size=${capMB}`, TOOL, "--capture", file, "--at", atIso, "--json"],
    { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, TMPDIR: tmpdirPath } },
  );
}

test("BITE — a heap-capped run over a large capture does not retain the whole file", () => {
  const dir = tmpDirSync("bl-oom-");
  const { file, at, predTs } = bigFillerCapture(dir, 1500, 200);
  const res = runCapped(file, at, HEAP_CAP_MB, dir);
  assert.equal(
    res.status,
    0,
    `expected a clean exit under a ${HEAP_CAP_MB} MB heap cap; got status=${res.status} signal=${res.signal}\n` +
      `stderr tail: ${(res.stderr ?? "").slice(-500)}`,
  );
  const parsed = JSON.parse(res.stdout);
  assert.equal(parsed.before.ts, predTs, "the real near-predecessor must still be the one resolved, not a filler");
});
