// dossier — the collection contract, over synthetic mini-ledgers.
//
// No test here reads a live ledger, capture, transcript or snapshot: every
// path is injected. The live files rotate and their contents are evidence,
// not fixtures — a suite that depended on them would go green or red for
// reasons that have nothing to do with this code.
//
// The contract under test is the THREE-answer rule (dev-loop.md): each of the
// runbook's four evidence classes, plus the mandated `gh search issues` sweep,
// is PRESENT with its evidence or ABSENT with the REASON. What is never
// allowed is a section that is simply blank — an absence wearing a verdict's
// clothes is the specific defect this shape exists to prevent.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  step1Worktime,
  step2PrefixDiff,
  step3Bytes,
  step4Transcript,
  ghSweep,
  sweepTerms,
  snapshotKeyFor,
  renderDossier,
  collect,
  STEP3_VIEW,
} from "../tools/dossier.mjs";

const TS = Math.floor(Date.parse("2026-07-30T16:57:14Z") / 1000);
const SID = "0d6f38ba-e2a1-41c2-9558-b06bc238c79d";

const bust = {
  type: "cold", k: "hit", cls: "bust", t: TS, s: SID,
  cc: 221065, ctx: 236536, cause: "messages_changed", mdl: "claude-fable-5",
  mtok: 201434, gap: 9, pblk: ["text"], flight: false, ubytes: 4248, concur: 1,
};

const tmp = () => mkdtemp(join(tmpdir(), "dossier-test-"));

// --- step 1 ---

test("step 1: the nearest worktime row is selected, and its forensic fields survive", () => {
  const s = step1Worktime([bust, { ...bust, t: TS + 3600, cc: 1 }], TS);
  assert.equal(s.status, "PRESENT");
  assert.equal(s.data.cc, 221065);
  assert.equal(s.data.mtok, 201434);
  assert.equal(s.data.ubytes, 4248);
  assert.equal(s.data.flight, false);
});

test("step 1: an empty ledger is ABSENT with a reason, not an empty section", () => {
  const s = step1Worktime([], TS);
  assert.equal(s.status, "ABSENT");
  assert.match(s.detail, /no cold events/);
});

test("step 1: selecting a row far from the requested stamp says how far", () => {
  const s = step1Worktime([{ ...bust, t: TS + 4000 }], TS);
  assert.equal(s.status, "PRESENT");
  assert.match(s.detail, /nearest event, 4000s from the requested stamp/);
});

// --- step 2 ---

test("step 2: the ledger slice is the rows inside the window, and only those", async () => {
  const dir = await tmp();
  try {
    const key = snapshotKeyFor(SID);
    const row = (offset, cause) => JSON.stringify({
      ts: new Date((TS + offset) * 1000).toISOString(),
      key, causes: [cause], msgs: "99->99", systemMatch: true, toolsMatch: true,
    });
    await writeFile(join(dir, `${key}-events.jsonl`),
      [row(-1000, "far-before"), row(-5, "in"), row(2, "also-in"), row(1000, "far-after")].join("\n") + "\n");
    const s = step2PrefixDiff(SID, TS, { dir, window: 90 });
    assert.equal(s.status, "PRESENT");
    assert.deepEqual(s.data.rows.map((r) => r.causes[0]), ["in", "also-in"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("step 2: no ledger file is ABSENT with the key that was looked for", async () => {
  const dir = await tmp();
  try {
    const s = step2PrefixDiff(SID, TS, { dir });
    assert.equal(s.status, "ABSENT");
    assert.match(s.detail, new RegExp(snapshotKeyFor(SID)));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("step 2: a ledger that exists but is empty in the window says so explicitly", async () => {
  // "no rows in the window" and "no ledger" are different findings, and the
  // second must never be reported as the first.
  const dir = await tmp();
  try {
    const key = snapshotKeyFor(SID);
    await writeFile(join(dir, `${key}-events.jsonl`),
      JSON.stringify({ ts: "2020-01-01T00:00:00.000Z", causes: [] }) + "\n");
    const s = step2PrefixDiff(SID, TS, { dir, window: 90 });
    assert.equal(s.status, "ABSENT");
    assert.match(s.detail, /exists but carries no row within/);
    assert.match(s.detail, /NOT the same as no divergence/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("snapshotKeyFor: the key is prefix-diff's own derivation, not a lookalike", () => {
  // Derived by calling the extension's resolveSessionKey — if the two ever
  // diverge, the dossier looks in a file that does not exist and reports
  // ABSENT for evidence that is right there.
  const k = snapshotKeyFor(SID);
  assert.match(k, /^s-[0-9a-f]{12}$/);
  assert.notEqual(k, `s-${SID}`);
  assert.equal(k, snapshotKeyFor(SID));
  assert.notEqual(k, snapshotKeyFor("other-session"));
});

// --- step 3 ---

const synthPair = () => ({
  before: { ts: "2026-07-30T16:57:05.767Z", body: { messages: [
    { role: "user", content: [{ type: "text", text: "a" }] },
    { role: "assistant", content: [{ type: "text", text: "b" }] },
  ] } },
  after: { ts: "2026-07-30T16:57:08.353Z", body: { messages: [
    { role: "user", content: [{ type: "text", text: "a" }] },
    { role: "assistant", content: [{ type: "text", text: "CHANGED" }] },
  ] } },
});

test("step 3: a pair is classified and mapped to a matrix row, with its TAP POINT named", async () => {
  const s = await step3Bytes(SID, TS, { pair: synthPair(), mirrors: "/nonexistent" });
  assert.equal(s.status, "PRESENT");
  assert.equal(s.data.view, STEP3_VIEW);
  assert.match(s.detail, /raw-capture@60/);
  // The counts are messages.length in the raw capture. A hand census of the
  // same event counts block units and reports different numbers; a number
  // without its tap point is not comparable (dev-loop.md, "Tap points").
  assert.equal(s.data.nBefore, 2);
  assert.equal(s.data.nAfter, 2);
  assert.equal(s.data.censusClass, "replace/edit");
  assert.equal(s.data.matrixRow, 4);
  assert.equal(s.data.matrixOpen, true);
});

test("step 3: no capture pair is ABSENT with the reason, never a silent skip", async () => {
  const s = await step3Bytes(SID, TS, { pair: null });
  assert.equal(s.status, "ABSENT");
  assert.match(s.detail, /request capture was off, or the capture rotated/);
});

test("step 3: a class no matrix row covers is reported as UNCLASSIFIED, not defaulted", async () => {
  // classToRow must not invent a row — an unrecognised class is the one thing
  // no existing check reports.
  const same = { role: "user", content: [{ type: "text", text: "a" }] };
  const s = await step3Bytes(SID, TS, {
    pair: { before: { ts: "t1", body: { messages: [same] } },
            after: { ts: "t2", body: { messages: [same, same] } } },
    mirrors: "/nonexistent",
  });
  assert.equal(s.status, "PRESENT");
  assert.equal(s.data.matrixRow, null);
  const md = renderDossier({ bust, tsEpoch: TS, sid: SID, key: "k",
    step1: step1Worktime([bust], TS), step2: step2PrefixDiff(SID, TS, { dir: "/nonexistent" }),
    step3: s, step4: step4Transcript(SID, TS, { projects: "/nonexistent" }),
    gh: await ghSweep([], { run: async () => ({ stdout: "[]" }) }), transcriptCause: null });
  assert.match(md, /UNCLASSIFIED, treat as a new class/);
});

// --- step 4 ---

test("step 4: transcript entries in the window come back as POINTERS with line numbers", async () => {
  const root = await tmp();
  try {
    const proj = join(root, "-some-project");
    await mkdir(proj, { recursive: true });
    const entry = (offset, extra = {}) => JSON.stringify({
      timestamp: new Date((TS + offset) * 1000).toISOString(), type: "assistant", ...extra,
    });
    await writeFile(join(proj, `${SID}.jsonl`), [
      entry(-5000),
      entry(-2),
      entry(0, { message: { usage: { cache_creation_input_tokens: 221065, cache_read_input_tokens: 15469 },
                            diagnostics: { cache_miss_reason: { type: "messages_changed" } } } }),
      entry(5000),
    ].join("\n") + "\n");
    const s = step4Transcript(SID, TS, { projects: root, window: 90 });
    assert.equal(s.status, "PRESENT");
    assert.equal(s.data.hits.length, 2);
    assert.deepEqual(s.data.hits.map((h) => h.line), [2, 3]);
    assert.equal(s.data.hits[1].cc, 221065);
    assert.equal(s.data.hits[1].apiCause, "messages_changed");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("step 4: a missing transcript is ABSENT with the session it looked for", () => {
  const s = step4Transcript(SID, TS, { projects: "/nonexistent-projects-root" });
  assert.equal(s.status, "ABSENT");
  assert.match(s.detail, /no transcript root/);
});

// --- the gh sweep ---

test("gh sweep: results are collected per term", async () => {
  const seen = [];
  const s = await ghSweep(["alpha", "beta"], {
    run: async (args) => {
      seen.push(args);
      return { stdout: JSON.stringify([{ repository: { nameWithOwner: "a/b" }, number: 1, title: "t", state: "open", url: "u" }]) };
    },
  });
  assert.equal(s.status, "PRESENT");
  assert.equal(s.data.length, 2);
  // READ-ONLY by construction: `gh search` has no write form, and the tool
  // must never reach for one.
  for (const args of seen) assert.equal(args[0], "search");
  for (const args of seen) assert.equal(args[1], "issues");
});

test("gh sweep: a failed search is ABSENT and says the class is still unswept", async () => {
  const s = await ghSweep(["alpha"], { run: async () => { throw new Error("gh: not found"); } });
  assert.equal(s.status, "ABSENT");
  assert.match(s.detail, /still unswept/);
});

test("sweepTerms: the API cause drives the query; a bare 'other' does not", () => {
  assert.match(sweepTerms(bust, null)[0], /messages_changed/);
  const generic = sweepTerms({ ...bust, cause: "other" }, null);
  assert.equal(generic.length, 1);
  assert.match(generic[0], /prompt cache invalidation/);
  const withMig = sweepTerms(bust, { data: { censusClass: "replace/edit" } });
  assert.ok(withMig.some((t) => /system-reminder standalone/.test(t)));
});

// --- the whole file ---

test("collect + render: ONE file, all five classes answered, none blank", async () => {
  const d = await collect(bust, TS, {
    events: [bust],
    dir: "/nonexistent-snapshots",
    projects: "/nonexistent-projects",
    pair: null,
    transcriptCause: { type: "messages_changed", missed: 201434 },
    run: async () => ({ stdout: "[]" }),
  });
  const md = renderDossier(d);
  for (const heading of [
    "1. Magnitude, API cause, forensic fields",
    "2. Where the prefix diverged",
    "3. The exact mutated bytes",
    "4. Conversation context",
    "5. Upstream issue sweep",
  ]) {
    assert.ok(md.includes(heading), `missing section: ${heading}`);
  }
  // Every heading carries a verdict; none is left to be read as a blank.
  const verdicts = [...md.matchAll(/^## \d\..*— (PRESENT|ABSENT)$/gm)].map((m) => m[1]);
  assert.equal(verdicts.length, 5);
  assert.ok(verdicts.every((v) => v === "PRESENT" || v === "ABSENT"));
  // The facts the hand investigation established ride in section 1.
  assert.match(md, /221065/);
  assert.match(md, /201434/);
  assert.match(md, /4248/);
  assert.match(md, /claude-fable-5/);
});

test("collect: --no-gh is recorded as a skip, not silently omitted", async () => {
  const d = await collect(bust, TS, {
    events: [bust], dir: "/nonexistent", projects: "/nonexistent", pair: null,
    transcriptCause: null, gh: false,
  });
  assert.equal(d.gh.status, "ABSENT");
  assert.match(d.gh.detail, /did NOT run/);
  assert.match(renderDossier(d), /did NOT run/);
});

test("render: a ledger/transcript disagreement is called out, not averaged away", () => {
  const d = {
    bust, tsEpoch: TS, sid: SID, key: "k",
    step1: step1Worktime([{ ...bust, cause: "other" }], TS),
    step2: { status: "ABSENT", detail: "x", data: null },
    step3: { status: "ABSENT", detail: "x", data: null },
    step4: { status: "ABSENT", detail: "x", data: null },
    gh: { status: "ABSENT", detail: "x", data: null },
    transcriptCause: { type: "messages_changed", missed: 201434 },
  };
  assert.match(renderDossier(d), /RECONCILE: ledger says `other`, transcript says `messages_changed`/);
});

test("the output is ONE file and it is written where it is told", async () => {
  const dir = await tmp();
  try {
    const d = await collect(bust, TS, {
      events: [bust], dir: "/nonexistent", projects: "/nonexistent", pair: null,
      transcriptCause: null, gh: false,
    });
    const path = join(dir, "d.md");
    await writeFile(path, renderDossier(d));
    const txt = await readFile(path, "utf8");
    assert.match(txt, /^# Cache-bust dossier/);
    assert.match(txt, /Evidence classes: 1\/5 PRESENT/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
