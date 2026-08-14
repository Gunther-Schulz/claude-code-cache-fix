// gate-live's census-rows writer — docs/dev-loop.md closing gate question 2,
// the RECURRING-PRODUCER clause. The daily sweep already carries the
// byte-gate's COUNTS (byteGate.tally/.prunes/.duplicates); this is the
// mechanism that writes the ROWS behind them — which capture, which
// request, how many bytes apart — into a committable, body-free document
// before the capture proving them rotates off the 12 GB cap.
//
// Two arms, matching the settled design exactly:
//
//   DISABLED  a sweep whose census found nothing (every row array empty)
//             writes NO document at all — writeRowPins's own early-return
//             property, copied for the same reason (an all-clean day is a
//             non-event, not a finding to manufacture).
//   ENABLED   a sweep with findings writes exactly one document whose row
//             counts RECONCILE, as numbers, against the same sweep's
//             aggregated tally/duplicates/volatile rollup.
//
// RED-FIRST, pasted in the closing report rather than encoded as a
// permanent test here: run against gate-live.mjs before this file's
// functions existed, `node --test` on this file fails at import
// (extractCensusRowEvidence/reduceCensusRowEvidence/buildCensusRowsDocument/
// writeCensusRowsDocument are undefined) — the mechanism did not exist, so
// nothing could write, disabled or not.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import {
  extractCensusRowEvidence,
  reduceCensusRowEvidence,
  buildCensusRowsDocument,
  writeCensusRowsDocument,
} from "../tools/gate-live.mjs";
import { scanDocument, CLASSES, exemptClasses } from "../tools/absence-scan.mjs";
import { tmpDirSync } from "../tools/tmpdir.mjs";

const censusResJson = (o) => ({
  code: 0,
  err: "",
  out: JSON.stringify({
    tally: { EXACT: 0, EXTENDED: 0, DROPPED: 0, MISMATCH: 0 },
    extendedSub: { "MERGED-STANDALONE": 0, "NEW-TEXT": 0 },
    prunes: { pure: 0, interior: 0, unanchored: 0 },
    pairs: 0, captures: 0, conversations: 0, considered: 1, unreadable: [], tornLines: 0,
    volatileChange: { matchedAll: 0, matched: 0, identical: 0, reserialized: 0, changed: 0 },
    volatileKinds: {}, volatileEntries: 0, volatileEntriesByKind: {}, volatileExempt: 0,
    volatileTruncated: {},
    duplicates: { pairs: 0, streaks: 0, maxStreak: 0, requests: 0, billedRequests: 0,
                  billedStreaks: 0, doubleBilledStreaks: 0, membersWithoutId: 0 },
    ...o,
  }),
});

const SECRET = "REAL-MESSAGE-BODY-MUST-NEVER-LEAK-38214";

/** One synthetic MISMATCH finding, verbatim-shaped like
 * reminder-migration-census.mjs's own `details` row (census-mismatch-rows-
 * export.test.mjs pins `recon` and `rejectedCandidate.text` as the fields
 * that carry the full body) — `SECRET` stands in for real message bytes.
 */
const mismatchRow = () => ({
  path: "/home/anyone/.local/share/cache-fix/captures/s-doesnotmatter-requests.jsonl",
  ts: "2026-08-14T07:23:11.000Z",
  host: 3, blocks: 3, verdict: "MISMATCH",
  j: null, text: "", recon: `wrapper(${SECRET})`, sub: null,
  rejectedCandidate: { text: `candidate(${SECRET}) extra tail bytes` },
  hostPruned: false, hostIdless: false,
  mismatchSub: "WRAPPER-RETAINED-EXTENDED",
  wrapped: { verdict: "EXTENDED", j: 5, offset: 2 },
  wrappedSub: "MERGED-STANDALONE",
});

const unrelatedMismatchRow = () => ({
  path: "/home/anyone/.local/share/cache-fix/captures/s-doesnotmatter-requests.jsonl",
  ts: "2026-08-14T07:24:00.000Z",
  host: 1, blocks: 1, verdict: "MISMATCH",
  j: null, text: "", recon: SECRET, sub: null,
  rejectedCandidate: { text: SECRET + "x" },
  hostPruned: false, hostIdless: false,
  mismatchSub: "UNRELATED",
  wrapped: null, wrappedSub: undefined,
  unrelatedDiag: {
    reconWrappedChars: 40, candidateChars: 41, wrappedDivOffset: 12,
    blockShapes: [{ chars: 41, innerChars: 4, overhead: 37, wrapCanonical: true }],
  },
});

const duplicateRow = (startLine) => ({
  path: "/home/anyone/.local/share/cache-fix/captures/s-doesnotmatter-requests.jsonl",
  cid: 7, sid: `real-session-id-${SECRET}`, length: 2, billed: 2, noId: 0,
  startTs: "2026-08-11T11:22:25.731Z", startLine, lastTs: "2026-08-11T11:22:25.746Z", lastLine: startLine + 2,
  model: "claude-sonnet-5", nMsg: 4, maxTokens: 4096, intervalMs: 15,
  members: [{ id: `req-${SECRET}`, ts: "2026-08-11T11:22:25.731Z", line: startLine, outcome: null }],
});

const volatileRow = () => ({
  path: "/home/anyone/.local/share/cache-fix/captures/s-doesnotmatter-requests.jsonl",
  sid: `real-session-id-${SECRET}`, ts: "2026-08-11T11:43:30.757Z", cid: 3,
  line: 447, req: 106, occurrences: 1, lastTs: "2026-08-11T12:05:33.706Z", lastLine: 500, lastReq: 197,
  kind: "VANISHED", index: 109, h: 12345, key: "12345|3|0",
  firstBytes: 742, nowBytes: 2, divOffset: 1, cacheControlExempt: false,
});

test("BITE — a sweep with zero rows (DISABLED arm) writes no document, creates no directory", async () => {
  const dir = join(tmpDirSync("census-rows-disabled-"), "census-rows");
  const reduced = reduceCensusRowEvidence([extractCensusRowEvidence(censusResJson({}), "s-000000000000")]);
  assert.equal(reduced.mismatchRows.length, 0);
  assert.equal(reduced.duplicateStreaks.length, 0);
  assert.equal(reduced.volatileEntries.length, 0);
  const doc = buildCensusRowsDocument(reduced, {
    producedAt: "2026-08-14T09:00:00.000Z", invocation: "test", censusRunAt: "2026-08-14T09:00:00.000Z",
  });
  const out = await writeCensusRowsDocument(doc, dir);
  assert.equal(out.written, false);
  assert.equal(out.file, null);
  await assert.rejects(readdir(dir), /ENOENT/, "an all-clean sweep must not even create the directory");
});

test("BITE — a sweep with findings (ENABLED arm) writes one document whose row counts RECONCILE against the sweep's own rollup", async () => {
  const dir = join(tmpDirSync("census-rows-enabled-"), "census-rows");
  // Two captures, so the reducer's SUM behaviour (not just pass-through) is
  // exercised: capture A carries the two mismatch shapes plus one
  // session-start duplicate streak; capture B carries one mid-session
  // duplicate streak plus the volatile entry.
  const capA = extractCensusRowEvidence(censusResJson({
    tally: { EXACT: 1, EXTENDED: 0, DROPPED: 0, MISMATCH: 2 },
    mismatchRows: [mismatchRow(), unrelatedMismatchRow()],
    duplicates: { pairs: 1, streaks: 1, maxStreak: 2, requests: 2, billedRequests: 2,
                  billedStreaks: 1, doubleBilledStreaks: 0, membersWithoutId: 0 },
    duplicateRows: [duplicateRow(3)],
  }), "s-aaaaaaaaaaaa");
  const capB = extractCensusRowEvidence(censusResJson({
    tally: { EXACT: 0, EXTENDED: 0, DROPPED: 0, MISMATCH: 0 },
    duplicates: { pairs: 1, streaks: 1, maxStreak: 5, requests: 3, billedRequests: 1,
                  billedStreaks: 1, doubleBilledStreaks: 1, membersWithoutId: 0 },
    duplicateRows: [duplicateRow(40)],
    volatileEntries: 1, volatileEntriesByKind: { VANISHED: 1 },
    volatileKinds: { VANISHED: 1 },
    volatileChange: { matchedAll: 5, matched: 3, identical: 1, reserialized: 0, changed: 1 },
    volatileRows: [volatileRow()],
  }), "s-bbbbbbbbbbbb");

  const reduced = reduceCensusRowEvidence([capA, capB]);

  // Reconciliation, stated as numbers: the sweep-wide rollup this document's
  // OWN row arrays must agree with.
  assert.equal(reduced.tally.MISMATCH, 2, "capA's 2 MISMATCH");
  assert.equal(reduced.mismatchRows.length, reduced.tally.MISMATCH,
    "mismatchRows count must reconcile against tally.MISMATCH");
  assert.equal(reduced.duplicates.streaks, 2, "capA 1 + capB 1");
  assert.equal(reduced.duplicateStreaks.length, reduced.duplicates.streaks,
    "duplicateStreaks count must reconcile against duplicates.streaks");
  assert.equal(reduced.duplicates.maxStreak, 5, "MAX across captures, never summed");
  assert.equal(reduced.volatile.entries, 1);
  assert.equal(reduced.volatileEntries.length, reduced.volatile.entries,
    "volatileEntries count must reconcile against volatile.entries");

  const doc = buildCensusRowsDocument(reduced, {
    producedAt: "2026-08-14T09:00:00.000Z", invocation: "test", censusRunAt: "2026-08-14T09:00:00.000Z",
  });
  // Prototype's own top-level shape (test/fixtures/harvested/census-rows/
  // census-rows-2026-08-14.json — "the PROTOTYPE and your schema").
  for (const k of ["corpus", "tally", "prunes", "duplicates", "volatile", "producedAt",
                    "producedBy", "extendedSub", "mismatchRows", "duplicateStreaks", "volatileEntries"]) {
    assert.ok(k in doc, `document must carry top-level key "${k}"`);
  }

  const out = await writeCensusRowsDocument(doc, dir);
  assert.equal(out.written, true);
  assert.equal(out.file, "census-rows-2026-08-14.json");
  const onDisk = JSON.parse(await readFile(join(dir, out.file), "utf-8"));
  assert.equal(onDisk.mismatchRows.length, 2);
  assert.equal(onDisk.duplicateStreaks.length, 2);
  assert.equal(onDisk.volatileEntries.length, 1);

  // The family discriminator: capA's streak starts at line 3 (<=5,
  // session-start — the haiku-sidecar population duplicate-billing.mjs's
  // own buildStreakRow names); capB's at line 40 (mid-session).
  const families = onDisk.duplicateStreaks.map((r) => r.family).sort();
  assert.deepEqual(families, ["mid-session", "session-start"]);

  // No raw filesystem path, no raw session id, no raw request id, and no
  // message BODY anywhere in the committed bytes — the property that keeps
  // the census-rows/ exemption's single class (live-timestamp) sufficient.
  const text = JSON.stringify(onDisk);
  assert.ok(!text.includes("/home/anyone"), "no filesystem path");
  assert.ok(!text.includes(SECRET), "no message body substring, in any field");
  assert.ok(!text.includes("real-session-id"), "no raw session id");

  // The boundary half (test/evidence-census-rows.test.mjs) grades by
  // scanning for exactly these classes; run the same scan here so a
  // regression in THIS writer is caught at the source, not only at the
  // fixed prototype file.
  const exempt = exemptClasses(`test/fixtures/harvested/census-rows/${out.file}`);
  const findings = scanDocument(onDisk, { file: `test/fixtures/harvested/census-rows/${out.file}`, classes: CLASSES })
    .findings.filter((f) => !exempt.has(f.class));
  assert.equal(findings.length, 0,
    `${findings.length} finding(s): ${[...new Set(findings.map((f) => f.class))].join(",")}`);
});

test("BITE — idempotent and NON-overwriting on differing content (writeRowPins's own property, copied)", async () => {
  const dir = join(tmpDirSync("census-rows-idem-"), "census-rows");
  const reduced = reduceCensusRowEvidence([extractCensusRowEvidence(censusResJson({
    tally: { EXACT: 0, EXTENDED: 0, DROPPED: 0, MISMATCH: 1 },
    mismatchRows: [mismatchRow()],
  }), "s-cccccccccccc")]);
  const doc = buildCensusRowsDocument(reduced, {
    producedAt: "2026-08-14T09:00:00.000Z", invocation: "test", censusRunAt: "2026-08-14T09:00:00.000Z",
  });

  const first = await writeCensusRowsDocument(doc, dir);
  assert.equal(first.written, true);

  const second = await writeCensusRowsDocument(doc, dir);
  assert.equal(second.written, false);
  assert.equal(second.unchanged, true, "identical body a second time must read as unchanged, not re-written");

  // A DIFFERENT document that resolves to the SAME filename (same UTC date)
  // must not overwrite the first — the conflict branch, proven by the file
  // on disk staying byte-identical to the FIRST write.
  const before = await readFile(join(dir, first.file), "utf-8");
  const reducedDiffering = reduceCensusRowEvidence([extractCensusRowEvidence(censusResJson({
    tally: { EXACT: 0, EXTENDED: 0, DROPPED: 0, MISMATCH: 1 },
    mismatchRows: [unrelatedMismatchRow()],
  }), "s-dddddddddddd")]);
  const differingDoc = buildCensusRowsDocument(reducedDiffering, {
    producedAt: "2026-08-14T09:00:00.000Z", invocation: "test", censusRunAt: "2026-08-14T09:00:00.000Z",
  });
  const third = await writeCensusRowsDocument(differingDoc, dir);
  assert.equal(third.written, false);
  assert.equal(third.conflict, true, "different content, same filename, must read as a conflict");
  const after = await readFile(join(dir, first.file), "utf-8");
  assert.equal(after, before, "the earlier evidence must not be overwritten by the conflicting write");
});

test("BITE — per-capture Truncated counters ride into the document, summed rather than dropped", () => {
  const capA = extractCensusRowEvidence(censusResJson({
    mismatchRowsTruncated: 250, duplicatesTruncated: 12,
  }), "s-eeeeeeeeeeee");
  const capB = extractCensusRowEvidence(censusResJson({
    mismatchRowsTruncated: 5,
  }), "s-ffffffffffff");
  const reduced = reduceCensusRowEvidence([capA, capB]);
  assert.equal(reduced.mismatchRowsTruncated, 255);
  assert.equal(reduced.duplicatesTruncated, 12);
  const doc = buildCensusRowsDocument(reduced, {
    producedAt: "2026-08-14T09:00:00.000Z", invocation: "test", censusRunAt: "2026-08-14T09:00:00.000Z",
  });
  assert.equal(doc.mismatchRowsTruncated, 255, "the marker's presence alone means rows were dropped");
  assert.equal(doc.duplicates.streaksTruncated, 12);
});

test("BITE — a census run this dispatch's own error-tolerance stance covers (unparseable JSON) contributes nothing rather than crashing the reduce", () => {
  const broken = extractCensusRowEvidence({ code: 0, out: "not json", err: "boom" }, "s-000000000001");
  assert.equal(broken, null, "the three-answer stance: an unparseable run measured nothing, is not a zero");
  const reduced = reduceCensusRowEvidence([broken, null, extractCensusRowEvidence(censusResJson({}), "s-000000000002")]);
  assert.equal(reduced.mismatchRows.length, 0);
  assert.equal(reduced.corpus.considered, 1, "only the one parseable capture counted");
});
