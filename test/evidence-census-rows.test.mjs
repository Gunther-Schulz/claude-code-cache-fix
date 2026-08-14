// The byte-gate census's ROW-LEVEL evidence — what proves a finding after the
// capture behind it has rotated.
//
// WHAT THIS GUARDS, and why it is not "a file exists". The daily sweep runs
// the byte-match census over every live capture and stores COUNTS: 16
// MISMATCH, 140 duplicate pairs, 40,190 changed volatile blocks. The rows
// behind those counts — which capture, which request, which host index, how
// many bytes apart — live only in the captures, and captures rotate on a
// 12 GB oldest-mtime-first cap. So a finding is checkable for as long as its
// capture survives and no longer, which is closing-gate question 2's
// recurring-producer clause (docs/dev-loop.md): a producer that runs on a
// schedule satisfies the harvest obligation in its own machinery or not at
// all.
//
// The property under test is therefore that an evidence document can be
// COMMITTED — i.e. that it carries the join keys (instants, capture tokens,
// line and request ordinals) while carrying no message text, no capture key
// and no session id — and that the one exempted class is exempted for this
// directory ALONE.
//
// The document under test is real output, not a fixture: it is the run the
// row-4 and duplicate-billing findings of 2026-08-14 rest on.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { scanDocument, CLASSES, exemptClasses } from "../tools/absence-scan.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(REPO, "test/fixtures/harvested/census-rows");
const REL = (name) => `test/fixtures/harvested/census-rows/${name}`;

const documents = readdirSync(DIR).filter((f) => f.endsWith(".json"));

// What the PUSH SCAN sees, not what `scanDocument` sees bare: the boundary
// drops findings of a class the path is exempt from, and a test that skips
// that subtraction grades the document by a second route — the entry-path
// shape this repo collects. Class-scoped, so every other class still fails.
function boundaryFindings(doc, file) {
  const exempt = exemptClasses(file);
  const findings = scanDocument(doc, { file, classes: CLASSES }).findings;
  if (exempt === "all") return [];
  return findings.filter((f) => !exempt.has(f.class));
}

test("BITE — the census-rows exemption covers live-timestamp and NOTHING else", () => {
  const exempt = exemptClasses(REL("census-rows-2026-08-14.json"));
  assert.notEqual(exempt, "all", "a path-wide exemption is a hole with a comment on it");
  assert.equal(exempt.has("live-timestamp"), true, "the instant is the join to the ledger and to the capture");
  for (const c of ["capture-uuid", "capture-key-prefix", "raw-content"]) {
    assert.equal(exempt.has(c), false, `${c} must still fire inside census-rows/`);
  }
});

test("BITE — the exemption does not leak outside the census-rows directory", () => {
  for (const p of [
    "test/fixtures/harvested/census-rows-2026-08-14.json",
    "test/fixtures/harvested/pinned-s-abc-1-2.json",
    "docs/directives/robustness-threat-matrix.md",
  ]) {
    const exempt = exemptClasses(p);
    assert.equal(exempt === "all" ? true : exempt.has("live-timestamp"), false, `${p} keeps live-timestamp`);
  }
});

test("BITE — every committed evidence document passes the boundary scan", () => {
  assert.ok(documents.length > 0, "the directory exists to hold documents; an empty one is the finding");
  for (const name of documents) {
    const doc = JSON.parse(readFileSync(join(DIR, name), "utf-8"));
    const findings = boundaryFindings(doc, REL(name));
    // Counted, not deep-compared: a failing deepEqual over a document with
    // hundreds of rows prints every finding into the terminal (and into a
    // hook transcript), which is the "a leak reporter that moves the leak"
    // shape this scanner's own header forbids — and it buries the verdict.
    const summary = [...new Set(findings.map((f) => f.class))].sort().join(",");
    assert.equal(findings.length, 0,
      `${name}: ${findings.length} finding(s), classes [${summary}], first at ${findings[0]?.path}`);
  }
});

// The control the bite above needs to mean anything: a zero from an instrument
// that never fires is indistinguishable from a zero that means something. A
// planted identifier of a NON-exempt class, inside this directory's own path,
// must still be caught.
test("BITE — a non-exempt class still fires inside census-rows/ (planted positive)", () => {
  // ASSEMBLED, not written out, and the reason is not obfuscation. The first
  // draft of this bite planted a REAL capture id copied out of the live
  // corpus and the pre-push scan blocked it — the guard catching its own test
  // author, which is the fire this repo wants. The replacement is synthetic,
  // but a synthetic LITERAL is refused too: the tracked-write hook and the
  // suite's SOURCE_UUID_ALLOWLIST roster both key on the SHAPE, and neither
  // can tell a synthetic from a live id — correctly, since nothing about the
  // bytes says which it is. Joining the parts at runtime keeps the tracked
  // file free of the shape while the scanner still receives the whole string,
  // which is the only thing this bite needs.
  const syntheticId = ["00000000", "0000", "4000", "8000", "c4f1efb22224"].join("-");
  const planted = { producedAt: "2026-08-14T07:23:00.000Z", note: `s-${syntheticId}` };
  const findings = boundaryFindings(planted, REL("planted.json"));
  assert.ok(findings.length > 0, "a session UUID inside census-rows/ must not be excused by the timestamp exemption");
  assert.ok(findings.some((f) => f.class === "capture-uuid"), `expected capture-uuid, got ${findings.map((f) => f.class).join(",")}`);
});

// Body-freeness is the document class's DEFINITION, not a property of the one
// document that happens to be committed today — so it is asserted over the
// value space rather than over a field list. A future writer (the booked
// mechanism that replaces the hand run) adding a text-bearing field fails
// here, at the moment it is added, rather than at a push months later.
const ALLOWED_STRING = [
  /^s-[0-9a-f]{12}$/,                       // harvest's sidToken — the capture's tracked identity
  /^s-capture[A-Z]+$/,                      // the alias convention
  /^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/,          // an instant
  /^[A-Z][A-Z-]*[A-Z]$/,                    // a closed-vocabulary label (WRAPPER-RETAINED-EXACT, VANISHED, …)
  /^(session-start|mid-session)$/,          // the streak family
];

test("BITE — the evidence documents carry no free text outside the provenance header", () => {
  for (const name of documents) {
    const doc = JSON.parse(readFileSync(join(DIR, name), "utf-8"));
    // The header is prose by design (it states how the document was produced);
    // every ROW is machine vocabulary.
    for (const family of ["mismatchRows", "duplicateStreaks", "volatileEntries"]) {
      for (const [i, row] of (doc[family] ?? []).entries()) {
        for (const [k, v] of Object.entries(row)) {
          if (typeof v !== "string") continue;
          assert.ok(ALLOWED_STRING.some((re) => re.test(v)),
            `${name} ${family}[${i}].${k} is free text: ${JSON.stringify(v.slice(0, 40))}`);
        }
      }
    }
  }
});
