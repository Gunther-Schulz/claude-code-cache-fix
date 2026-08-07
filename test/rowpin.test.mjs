// Row evidence pins — the sweep writes out what proves its own findings.
//
// WHAT THIS GUARDS. The daily sweep is a RECURRING producer of findings, so
// nobody is present to snapshot the bytes behind a row before the capture
// rotates: eviction is oldest-mtime-first and takes the QUIET session first,
// and a session goes quiet exactly when it stops being traffic and starts
// being evidence. Measured 2026-08-06 — a stability EXEMPTION row measured at
// 09:59Z lost its capture by ~19:25Z, which took with it the known positive a
// booked item had named as its red-first arrangement.
//
// So the property under test is not "a file appears". It is that the pin
// ANSWERS THE ATTRIBUTION QUESTION WITHOUT THE CAPTURE ("did we build these
// bytes, or did CC send them"), that a pin whose bytes do not match the row it
// names is REJECTED rather than trusted, and that the scrub is live on the
// path that writes — proven against a planted sentinel with the scrub
// disabled as the control, because a zero from an instrument that never fires
// is indistinguishable from a zero that means something.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { pinAsks, buildRowPins, PIN_CAP, PIN_FAMILIES } from "../tools/replay.mjs";
import { writeRowPins, buildRowPinDocument, rowPinName, reduceRowPins } from "../tools/gate-live.mjs";
import { scanDocument, scanName, CLASSES, exemptClasses } from "../tools/absence-scan.mjs";

// What the PUSH SCAN sees, not what `scanDocument` sees. The scanner's own
// walker drops findings of a class the path is exempt from; a test calling
// scanDocument bare takes a second route to the verdict and grades a pin more
// harshly than the boundary does — the entry-path shape this repo collects.
// The subtraction is class-scoped, so a non-exempt class still fails here.
function walkerFindings(doc, file) {
  const exempt = exemptClasses(file);
  const findings = scanDocument(doc, { file, classes: CLASSES }).findings;
  if (exempt === "all") return [];
  return findings.filter((f) => !exempt.has(f.class));
}

const run = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPLAY = join(__dirname, "..", "tools", "replay.mjs");

// --- pinAsks: which index each family names, and in which space -------------

test("pinAsks: each family's ask carries the row's own index and its space", () => {
  const { asks } = pinAsks({
    stability: [{ n: 5, prevN: 3, outDiv: 7 }],
    relocDeparture: [{ n: 9, prevN: 8, prevMsgIdx: 2 }],
    conservation: [{ n: 4, at: 1, side: "out" }],
    order: [{ n: 6, at: 11, wireIdx: 3 }],
  });
  const byFamily = Object.fromEntries(asks.map((a) => [a.family, a]));
  assert.deepEqual(
    { index: byFamily.stability.index, space: byFamily.stability.indexSpace, owner: byFamily.stability.indexOwner },
    { index: 7, space: "forwarded", owner: "cur" },
  );
  // The departure is recorded at its position in the PREDECESSOR's RAW array;
  // reading it as a forwarded index of the successor is the coordinate-space
  // error this repo has paid for twice (raw 370 forwards as 360).
  assert.deepEqual(
    { index: byFamily.relocDeparture.index, space: byFamily.relocDeparture.indexSpace, owner: byFamily.relocDeparture.indexOwner },
    { index: 2, space: "raw", owner: "prev" },
  );
  // The conservation gate's side decides the space: `out[i]` is a forwarded
  // index, `in[i]` a raw one, and one field cannot answer for both.
  assert.equal(byFamily.conservation.indexSpace, "forwarded");
  assert.equal(byFamily.conservation.prevN, null, "a per-request family has no pair");
  // insertion-normalization's canonOrderViolation carries BOTH `at` (an
  // ordinal in the canonical list) and `wireIdx` (a message index). Pinning
  // `at` would pin an unrelated message.
  assert.equal(byFamily.order.index, 3);
});

test("BITE — a row with no message index yields no ask and says why", () => {
  const { asks, skipped } = pinAsks({ sequence: [{ n: 2, normalizedAt: null }] });
  assert.equal(asks.length, 0, "an ask at a guessed index would pin the wrong message");
  assert.equal(skipped.length, 1);
  assert.match(skipped[0].reason, /no message index/);
});

test("BITE — the per-family cap carries a PRESENCE marker, never a silent truncation", () => {
  const many = Array.from({ length: PIN_CAP + 3 }, (_, i) => ({ n: i, prevN: i - 1, outDiv: 0 }));
  const capped = pinAsks({ stability: many });
  assert.equal(capped.asks.length, PIN_CAP);
  assert.equal(capped.truncated.stability, PIN_CAP + 3, "the pre-truncation total rides beside the array");
  // At or below the cap there is no key at all — the marker's PRESENCE is the
  // signal, so a reader cannot mistake a short list for a complete one.
  const under = pinAsks({ stability: many.slice(0, 2) });
  assert.deepEqual(under.truncated, {});
});

test("a family the run never produced contributes nothing (null is not a measured zero)", () => {
  const { asks, skipped } = pinAsks({ stability: null, absorptionMiss: undefined });
  assert.equal(asks.length, 0);
  assert.equal(skipped.length, 0, "an absent family is not a skipped row");
  assert.ok(Object.keys(PIN_FAMILIES).length >= 8, "every family gate-live persists has a rule");
});

// --- buildRowPins: the cross-pass check that makes a pin evidence -----------

const evidenceFor = (n, forwardedSha, rawSha) =>
  [n, {
    outBodySha: `body${n}`, rawLen: 3, forwardedLen: 3, ts: "2026-08-06T09:59:00.000Z",
    key: "s-key", id: `id-${n}`,
    at: new Map([[1, {
      forwarded: { role: "user", content: "F" }, raw: { role: "user", content: "R" },
      forwardedSha, rawSha, forwardedPresentInRawAt: null,
    }]]),
  }];

test("buildRowPins: bytes that match the first pass's hashes are evidence for the row", () => {
  const asks = pinAsks({ stability: [{ n: 5, prevN: 3, outDiv: 1 }] }).asks;
  const evidence = new Map([evidenceFor(5, "fwd5", "raw5"), evidenceFor(3, "fwd3", "raw3")]);
  const byN = new Map([
    [5, { n: 5, outHash: ["a", "fwd5", "c"], inHash: ["a", "raw5", "c"] }],
    [3, { n: 3, outHash: ["a", "fwd3", "c"], inHash: ["a", "raw3", "c"] }],
  ]);
  const [pin] = buildRowPins(asks, evidence, byN);
  assert.equal(pin.checks.bytesMatchRow, true);
  assert.equal(pin.checks.comparisons, 4, "both sides, both arrays");
});

// THE CONTROL. A pin whose bytes do not match the row it names describes a
// different request — a nondeterministic stage, a drifted second loop — and a
// control that cannot fail is not a control, so the mismatch is built
// deliberately: the second pass's forwarded byte-hash is changed and nothing
// else.
test("BITE — a pin whose bytes do not match its row is flagged, not trusted", () => {
  const asks = pinAsks({ stability: [{ n: 5, prevN: 3, outDiv: 1 }] }).asks;
  const evidence = new Map([evidenceFor(5, "DIFFERENT", "raw5"), evidenceFor(3, "fwd3", "raw3")]);
  const byN = new Map([
    [5, { n: 5, outHash: ["a", "fwd5", "c"], inHash: ["a", "raw5", "c"] }],
    [3, { n: 3, outHash: ["a", "fwd3", "c"], inHash: ["a", "raw3", "c"] }],
  ]);
  const [pin] = buildRowPins(asks, evidence, byN);
  assert.equal(pin.checks.bytesMatchRow, false);
  assert.equal(pin.sides.cur.forwardedMatchesFirstPass, false);
  assert.equal(pin.sides.prev.forwardedMatchesFirstPass, true, "the other side is unaffected");
});

test("BITE — a pin nothing could be compared against is unverifiable, not passing", () => {
  const asks = pinAsks({ stability: [{ n: 5, prevN: 3, outDiv: 9 }] }).asks;
  const evidence = new Map([evidenceFor(5, "fwd5", "raw5"), evidenceFor(3, "fwd3", "raw3")]);
  // Index 9 is past the end of the first pass's hash arrays: nothing to
  // compare, which is its own answer and is not a pass.
  const byN = new Map([
    [5, { n: 5, outHash: ["a", "b"], inHash: ["a", "b"] }],
    [3, { n: 3, outHash: ["a", "b"], inHash: ["a", "b"] }],
  ]);
  const [pin] = buildRowPins(asks, evidence, byN);
  assert.equal(pin.checks.comparisons, 0);
  assert.equal(pin.checks.bytesMatchRow, null, "null, never true");
});

// --- The attribution question, answered from the pin ALONE ------------------

// The red-first arrangement the backlog entry names. The question is the one
// the builtByUs probe asked of a live capture: is what we forwarded at the
// row's index a message CC ever sent in that request? A ROW cannot answer it
// — it carries indices and verdicts, no bytes and no presence answer — which
// is why the answer used to require the capture, and why the answer expired
// with it.
const answerBuiltByUs = (doc) => {
  const cell = doc?.sides?.cur;
  if (!cell || cell.forwardedPresentInRawAt === undefined) return "UNANSWERABLE";
  return cell.forwardedPresentInRawAt === null ? "we built these bytes" : `CC sent them at raw[${cell.forwardedPresentInRawAt}]`;
};

test("BITE — the pin answers 'did we build these bytes'; the row alone cannot", () => {
  const row = { n: 40, prevN: 38, outDiv: 0, ccIdenticalAtOutDiv: true, key: "s-key" };
  // OLD arrangement: what the sweep persisted before this change — the row,
  // and no capture. Unanswerable, which is the red.
  assert.equal(answerBuiltByUs({ row }), "UNANSWERABLE");

  const asks = pinAsks({ stability: [row] }).asks;
  const evidence = new Map([
    [40, { outBodySha: "b", rawLen: 5, forwardedLen: 5, ts: "2026-08-05T18:38:30.685Z", key: "s-key", id: "id40",
      at: new Map([[0, { forwarded: { role: "user", content: "ours" }, raw: { role: "user", content: "cc" },
        forwardedSha: "f40", rawSha: "r40", forwardedPresentInRawAt: null }]]) }],
    [38, { outBodySha: "a", rawLen: 2, forwardedLen: 2, ts: "2026-08-05T18:38:26.610Z", key: "s-key", id: "id38",
      at: new Map([[0, { forwarded: { role: "user", content: "cc" }, raw: { role: "user", content: "cc" },
        forwardedSha: "r38", rawSha: "r38", forwardedPresentInRawAt: 0 }]]) }],
  ]);
  const byN = new Map([
    [40, { n: 40, outHash: ["f40"], inHash: ["r40"] }],
    [38, { n: 38, outHash: ["r38"], inHash: ["r38"] }],
  ]);
  const doc = buildRowPinDocument(buildRowPins(asks, evidence, byN)[0]);
  assert.equal(answerBuiltByUs(doc), "we built these bytes");
  assert.equal(doc.sides.prev.forwardedPresentInRawAt, 0, "the predecessor's forwarded message was CC's own");
});

// --- The writer: idempotent, rejecting, scrubbing, never committing ---------

const pinWith = (msg, overrides = {}) => ({
  family: "stability", n: 5, prevN: null, index: 0, indexSpace: "forwarded", indexOwner: "cur",
  row: { n: 5, ts: "2026-08-06T09:59:00.000Z", key: "s-live-key", outDiv: 0 },
  sides: {
    cur: {
      n: 5, ts: "2026-08-06T09:59:00.000Z", key: "s-live-key", id: "rec-id", rawLen: 2, forwardedLen: 2,
      outBodySha: "deadbeef", forwarded: msg, raw: msg, forwardedSha: "f", rawSha: "f",
      forwardedPresentInRawAt: 0, firstPassForwardedSha: "f", firstPassRawSha: "f",
      forwardedMatchesFirstPass: true, rawMatchesFirstPass: true,
    },
  },
  checks: { comparisons: 2, bytesMatchRow: true },
  ...overrides,
});

const SENTINEL = "ZZ-planted-sentinel-do-not-ship-9f13c7";
const sentinelMessage = {
  role: "user",
  content: [{ type: "text", text: `<system-reminder>\nfirst paragraph\n\n${SENTINEL}\n</system-reminder>` }],
};

test("the writer scrubs — proven on a planted sentinel, with the scrub OFF as the control", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rowpin-scrub-"));
  try {
    const res = await writeRowPins([pinWith(sentinelMessage)], dir);
    assert.equal(res.written, 1);
    const written = await readFile(join(dir, res.files[0]), "utf-8");
    assert.equal(written.includes(SENTINEL), false, "the planted content must not reach a tracked file");

    // THE CONTROL: the same grep against the same document built WITHOUT the
    // scrub. If this does not find the sentinel, the assertion above proved
    // nothing — a zero from an instrument that never fires is
    // indistinguishable from a zero that means something.
    const unscrubbed = JSON.stringify(pinWith(sentinelMessage));
    assert.equal(unscrubbed.includes(SENTINEL), true, "the grep can see the sentinel when nothing removed it");

    // And the STRUCTURE survives the scrub, which is the whole reason the pin
    // is worth committing: paragraph count, the wrapper, the block shape.
    const doc = JSON.parse(written);
    const text = doc.sides.cur.forwarded.content[0].text;
    assert.match(text, /^<system-reminder>\n/);
    assert.equal(text.split("\n\n").length, 2, "the per-segment scrub preserves the paragraph relation");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// The instant a pin carries is the join to the bust ledger, so it is written
// at full precision and the `live-timestamp` class is exempted for this
// directory ALONE — the same standing LEDGER-*.json's `lastHarvest` fields
// have, and for the same reason: the timestamps ARE the artifact's content.
// It exposes nothing new — the threat matrix quotes live instants like
// "05:24:31.780Z" in tracked prose on every event walk.
//
// Booked and built 2026-08-07 on an operator correction, and the correction is
// the point: this session put the choice up as "leave it until a join actually
// needs the hour", which is the deferral that costs about what doing it costs.
// The exemption is CLASS-scoped, so the two bites below are one rule with its
// own limit — the exempted class stops firing here, and every other class
// still does.
test("BITE — the rowpins exemption covers live-timestamp and NOTHING else", () => {
  const exempt = exemptClasses("test/fixtures/harvested/rowpins/rowpin-s-abc-1-0-forwarded-stability.json");
  assert.notEqual(exempt, "all", "a path-wide exemption is a hole with a comment on it");
  assert.equal(exempt.has("live-timestamp"), true, "the instant is the artifact's content here");
  for (const c of ["capture-uuid", "capture-key-prefix", "raw-content"]) {
    assert.equal(exempt.has(c), false, `${c} must still fire inside rowpins/`);
  }
});

test("BITE — the exemption does not leak outside the rowpins directory", () => {
  for (const p of [
    "test/fixtures/harvested/rowpin-s-abc-1-0-forwarded-stability.json",
    "test/fixtures/harvested/pinned-s-abc-1-2.json",
    "docs/directives/robustness-threat-matrix.md",
  ]) {
    const exempt = exemptClasses(p);
    assert.equal(exempt === "all" ? true : exempt.has("live-timestamp"), false, `${p} keeps live-timestamp`);
  }
});

test("BITE — a live capture key or instant never reaches the pin", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rowpin-ids-"));
  try {
    const res = await writeRowPins([pinWith(sentinelMessage)], dir);
    const body = await readFile(join(dir, res.files[0]), "utf-8");
    assert.equal(body.includes("s-live-key"), false, "the capture key rides as a token, never verbatim");
    assert.equal(body.includes("rec-id"), false, "so does the capture record id");
    const doc = JSON.parse(body);
    assert.equal(doc.instantUtc, "2026-08-06T09:59:00.000Z", "the instant is the join key to the bust ledger");
    assert.equal(doc.key, doc.sides.cur.keyToken);
    // The hygiene classes themselves, run over the document as the push scan
    // would: a claim of sanitization counts only as its checker's output.
    assert.deepEqual(
      walkerFindings(doc, "test/fixtures/harvested/rowpins/x.json"),
      [],
      "absence classes green on the written pin, as the push scan reads it",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("BITE — a pin whose bytes do not match its row is REJECTED, never written", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rowpin-reject-"));
  try {
    const bad = pinWith(sentinelMessage, { checks: { comparisons: 2, bytesMatchRow: false } });
    const res = await writeRowPins([bad], dir);
    assert.equal(res.rejected, 1);
    assert.equal(res.written, 0);
    assert.deepEqual(await readdir(dir), [], "nothing on disk claiming to be this row's evidence");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("an unverifiable pin IS written, and says so in its own checks", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rowpin-unver-"));
  try {
    const res = await writeRowPins([pinWith(sentinelMessage, { checks: { comparisons: 0, bytesMatchRow: null } })], dir);
    assert.equal(res.written, 1);
    assert.equal(res.unverifiable, 1);
    const doc = JSON.parse(await readFile(join(dir, res.files[0]), "utf-8"));
    assert.equal(doc.checks.bytesMatchRow, null, "the artifact declares its own status");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("idempotent by (key, n, index, family); a same-name pin with DIFFERENT bytes is a conflict, not an overwrite", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rowpin-idem-"));
  try {
    const first = await writeRowPins([pinWith(sentinelMessage)], dir);
    assert.equal(first.written, 1);
    const again = await writeRowPins([pinWith(sentinelMessage)], dir);
    assert.deepEqual({ w: again.written, u: again.unchanged }, { w: 0, u: 1 });

    const other = { role: "user", content: [{ type: "text", text: "a different message entirely" }] };
    const clash = await writeRowPins([pinWith(other)], dir);
    assert.equal(clash.written, 0);
    assert.deepEqual(clash.conflicts, first.files, "the clash names the file it refused to overwrite");
    // The earlier evidence survives — overwriting it would destroy the only
    // copy of bytes whose capture is already gone.
    const still = JSON.parse(await readFile(join(dir, first.files[0]), "utf-8"));
    assert.equal(still.sides.cur.forwarded.content[0].text.startsWith("<system-reminder>"), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// Found by running a second capture with a DIFFERENT family's rows: only the
// pair families carry a capture key ON THE ROW, so a writer that read the key
// there skipped every conservation, sequence and order pin while its summary
// said "21 built". One family's row shape is not the row shape.
test("BITE — a family whose rows carry no key still names its pin (the key comes off the side)", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rowpin-keyless-"));
  try {
    const keyless = pinWith(sentinelMessage, {
      family: "conservation",
      row: { n: 5, ts: "2026-08-06T09:59:00.000Z", kind: "invented", at: 0, side: "out" },
    });
    const res = await writeRowPins([keyless], dir);
    assert.deepEqual(res.skipped, [], "a keyless ROW is not a keyless pin");
    assert.equal(res.written, 1);
    assert.match(res.files[0], /^rowpin-s-[0-9a-f]{12}-5-0-forwarded-conservation\.json$/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// The identity collision, as a bite. The conservation gate reports both a
// raw-side and a forwarded-side row at the same request and index — two
// different messages — and a name without the space maps them onto one file.
test("BITE — a raw-side and a forwarded-side row at the same index get different pins", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rowpin-space-"));
  try {
    const inSide = pinWith(sentinelMessage, {
      family: "conservationExempt", index: 0, indexSpace: "raw",
      row: { n: 5, ts: "2026-08-06T09:59:00.000Z", kind: "lost", at: 0, side: "in" },
    });
    const outSide = pinWith({ role: "user", content: [{ type: "text", text: "a different message" }] }, {
      family: "conservationExempt", index: 0, indexSpace: "forwarded",
      row: { n: 5, ts: "2026-08-06T09:59:00.000Z", kind: "invented", at: 0, side: "out" },
    });
    const res = await writeRowPins([inSide, outSide], dir);
    assert.equal(res.written, 2, "two rows, two artifacts");
    assert.deepEqual(res.conflicts, [], "neither may overwrite the other");
    assert.equal(new Set(res.files).size, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("reduceRowPins: a capture whose child emitted no pins contributes to neither total nor zero", () => {
  const acc = reduceRowPins([
    { rowPins: { written: 2, unchanged: 1, rejected: 1, unverifiable: 0, conflicts: ["a"] } },
    { rowPins: null },
    { rowPins: { error: "EACCES" } },
  ]);
  assert.deepEqual(acc, { captures: 2, written: 2, unchanged: 1, rejected: 1, unverifiable: 0, conflicts: 1, errors: 1 });
});

// --- End to end: a synthetic capture through the real replay ---------------

// A relocated-block DEPARTURE is the cheapest real finding row to build from
// input alone (threat-matrix row 25): a relocatable <system-reminder> type
// present in the predecessor's raw array and absent from the successor's,
// same conversation. No extension state is required, so this exercises the
// whole path — the row producer, the ask, the second pipeline pass, the
// cross-pass hash check — on bytes this test controls.
const captureLine = (n, id, messages) => JSON.stringify({
  ts: `2026-08-06T09:0${n}:00.000Z`,
  id,
  sid: "11111111-2222-3333-4444-555555555555",
  key: "11111111-2222-3333-4444-555555555555",
  headers: { "session-id": "11111111-2222-3333-4444-555555555555" },
  body: { model: "claude-test", max_tokens: 100, messages },
});

test("END TO END — a departure row on a synthetic capture pins the bytes behind it", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rowpin-e2e-"));
  try {
    const opener = { role: "user", content: [{ type: "text", text: "opening turn" }] };
    // The relocatable block, carrying the sentinel where a real one carries
    // live prose.
    const withBlock = {
      role: "user",
      content: [{ type: "text", text: `<system-reminder>\nThe following skills are available:\n\n${SENTINEL}\n</system-reminder>` }],
    };
    const plain = { role: "user", content: [{ type: "text", text: "later turn" }] };
    const capture = join(dir, "synthetic-requests.jsonl");
    await writeFile(capture, [
      captureLine(1, "rec-1", [opener, withBlock]),
      captureLine(2, "rec-2", [opener, plain]),
    ].join("\n") + "\n");

    const { stdout } = await run("node", [REPLAY, capture, "--pin-rows", "--json"], { maxBuffer: 64 * 1024 * 1024 });
    const parsed = JSON.parse(stdout);
    assert.equal(parsed.relocDepartures.length, 1, "the synthetic pair must produce the row this pins");
    assert.equal(parsed.pins.length, 1);
    const pin = parsed.pins[0];
    assert.equal(pin.family, "relocDeparture");
    assert.equal(pin.index, 1, "the departure's index in the PREDECESSOR's raw array");
    assert.equal(pin.checks.bytesMatchRow, true, "the second pass reproduced the first pass's bytes");
    // The evidence itself: the departed block is IN the pin, so the row stays
    // answerable once the capture is gone.
    assert.match(JSON.stringify(pin.sides.prev.raw), /skills are available/);
    // And the attribution answer is computed on the REAL bytes by the real
    // pipeline, not asserted from a hand-built evidence map: at the departure
    // index our forwarded message on the predecessor is NOT any message CC
    // sent (the relocation rewrote it — "we built these bytes"), while the
    // successor forwards CC's own message unchanged. Those two answers
    // together are what a reader needs after the capture is gone, and neither
    // is derivable from the row.
    assert.equal(pin.sides.prev.forwardedPresentInRawAt, null, "ours at the departure index");
    assert.equal(pin.sides.cur.forwardedPresentInRawAt, 1, "CC's own on the successor");
    assert.equal(answerBuiltByUs({ sides: { cur: pin.sides.prev } }), "we built these bytes");
    // The content predicate, which the scrub destroys and the pin therefore
    // records as an ANSWER: the departed block was a skills block, by
    // fresh-session-sort's own predicate rather than by a restatement of it.
    // Without this the pinned artifact could not carry the very class this
    // item was motivated by (a first-appearance-relocation exemption), since
    // every literal-prefix test scores zero on a scrubbed fixture.
    assert.deepEqual(pin.sides.prev.rawRelocTypes, ["skills"]);
    assert.deepEqual(pin.sides.cur.rawRelocTypes, [], "the successor is where it departed from");

    const pinDir = join(dir, "pins");
    const res = await writeRowPins(parsed.pins, pinDir);
    assert.equal(res.written, 1);
    const body = await readFile(join(pinDir, res.files[0]), "utf-8");
    assert.equal(body.includes(SENTINEL), false, "the scrub is live on the real path");
    const doc = JSON.parse(body);
    assert.deepEqual(
      walkerFindings(doc, "test/fixtures/harvested/rowpins/x.json"),
      [],
      "a pin produced by the real path passes the hygiene classes",
    );
    assert.equal(doc.sides.prev.rawLen, 2);
    assert.equal(doc.sides.cur.rawLen, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// --- The committed example, replayed as the corpus reads it ----------------

test("the committed row pin is well formed and self-describing", async () => {
  const dir = join(__dirname, "fixtures", "harvested", "rowpins");
  let names = [];
  try {
    names = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch {
    names = [];
  }
  // Absence is its own answer: this corpus is allowed to be empty (a fresh
  // clone, a machine that has swept nothing yet), and an empty run must not
  // read as "checked and clean".
  if (names.length === 0) {
    assert.ok(true, "no committed pins on this machine — nothing checked, nothing claimed");
    return;
  }
  // The corpus check in test/harvest-scrub-relations.test.mjs reads
  // test/fixtures/harvested NON-recursively, so nothing there sees this
  // subdirectory — the one-guard-one-route shape docs/dev-loop.md collects.
  // Every class it would have applied is applied here instead, filenames
  // included: a filename is as public as the content it names.
  for (const name of names) {
    assert.deepEqual(scanName(`test/fixtures/harvested/rowpins/${name}`), [], `${name}: filename`);
    const doc = JSON.parse(await readFile(join(dir, name), "utf-8"));
    assert.equal(doc.schema, "rowpin/1", `${name}: schema`);
    assert.equal(name, rowPinName(doc.key, doc), `${name}: the filename must name the row it holds`);
    assert.ok(Object.keys(PIN_FAMILIES).includes(doc.family), `${name}: family`);
    assert.notEqual(doc.checks.bytesMatchRow, false, `${name}: a rejected pin must never have been committed`);
    assert.deepEqual(
      walkerFindings(doc, `test/fixtures/harvested/rowpins/${name}`),
      [],
      `${name}: hygiene classes`,
    );
  }
});
