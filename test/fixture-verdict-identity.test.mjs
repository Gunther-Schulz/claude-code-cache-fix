// tools/fixture-verdict-identity.mjs — the acceptance check's own bite.
//
// The tool shipped with both of its reds demonstrated BY HAND during the
// fixture cut (BACKLOG.md, "committed bite for tools/fixture-verdict-identity"):
// the hand-derivation found each defect once, and nothing in test/ would notice
// either of them regressing. This file is the mechanism.
//
// The definitions the assertions come from — written from what a fixture CUT
// is, not from the tool's code, so the expectations do not inherit its
// parentage:
//
//   (1) A cut that no longer replays the pinned range compares nothing about
//       the pair the fixture exists for. That is a COVERAGE failure and must
//       exit 1 — a "identical" over an interval that excludes the pair under
//       test is an absence of evidence wearing a verdict's clothes.
//   (2) A cut that keeps every record but changes the bytes that ESTABLISH the
//       pin changes what the pipeline forwards. The check must catch that on
//       the forwarded-content hash, at the ordinal where it happened — a cut
//       is accepted only when the replayed verdicts are identical, and the
//       forwarded bytes are a verdict.
//   (3) Two byte-identical fixtures diverge nowhere: exit 0, and the run must
//       SAY how much it compared, or a green over zero comparisons would read
//       the same as a real one.
//
// NO FIXTURE IS NAMED HERE. The pair is discovered at test time by the
// property that makes a fixture replayable by this tool — a `header.replayFrom`
// and a `header.range` over a `records` array — the same rename-safety the
// verdict-ab self-test uses. A hardcoded name would go red the day a fixture
// is renamed, which is a check firing on a non-defect.
//
// The MUTANTS are derived at test time from the committed fixture and written
// to a scratch directory: committing them would mean committing two more
// harvested-shaped files into a public repo for no gain. The committed fixture
// plays the "full" side and its mutant the "cut" side — the comparison the
// tool performs is between two replays, and it does not care which side of it
// history called which.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "fixture-verdict-identity.mjs");
const CORPUS = join(REPO, "test", "fixtures", "harvested");

/**
 * A request record, by the WIRE's definition rather than the tool's: it
 * carries a request body with a messages array. Deliberately not "type is
 * neither boot nor outcome" — that is the tool's own predicate, and a mutant
 * built with it could not disagree with it.
 */
const isRequest = (rec) => Array.isArray(rec?.body?.messages);

/** Fixtures this tool can replay at all — discovered, never named. */
function replayableFixtures() {
  const out = [];
  for (const name of readdirSync(CORPUS).sort()) {
    if (!name.endsWith(".json")) continue;
    let doc;
    try {
      doc = JSON.parse(readFileSync(join(CORPUS, name), "utf-8"));
    } catch {
      continue;
    }
    if (typeof doc?.header?.replayFrom !== "number") continue;
    if (typeof doc?.header?.range?.n !== "number") continue;
    if (!Array.isArray(doc?.records) || !doc.records.some(isRequest)) continue;
    out.push({ name, path: join(CORPUS, name), doc });
  }
  return out;
}

const FIXTURES = replayableFixtures();
// Guard the guard: with an empty population every assertion below would pass
// by never running.
assert.ok(FIXTURES.length > 0, "no fixture in the corpus declares header.replayFrom + header.range — discovery or corpus is broken");
const PAIR = FIXTURES[0];

function run(fullPath, cutPath) {
  try {
    const stdout = execFileSync(process.execPath, [TOOL, fullPath, cutPath], {
      encoding: "utf-8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stdout };
  } catch (e) {
    return { status: e.status ?? -1, stdout: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

const scratch = mkdtempSync(join(tmpdir(), "fixture-verdict-identity-"));
test.after(() => rmSync(scratch, { recursive: true, force: true }));
const write = (name, doc) => {
  const p = join(scratch, name);
  writeFileSync(p, JSON.stringify(doc));
  return p;
};

// --- the two mutants ----------------------------------------------------------

/** (1) Every record but the last request — the cut that stops short. */
function dropLastRequest(doc) {
  const m = structuredClone(doc);
  for (let i = m.records.length - 1; i >= 0; i--) {
    if (isRequest(m.records[i])) {
      m.records.splice(i, 1);
      return { doc: m, droppedAt: i };
    }
  }
  return { doc: m, droppedAt: -1 };
}

const REMINDER_BLOCK = /^<system-reminder>\n[\s\S]*\n<\/system-reminder>\s*$/;

/**
 * (2) Every record kept; the `<system-reminder>` blocks are removed from the
 * last message of the FIRST request that carries any. That first request is
 * the one that establishes the pin (it is where the cut's replay window
 * starts), so those bytes are exactly what the pin is built from.
 */
function stripPinReminders(doc) {
  const m = structuredClone(doc);
  const first = m.records.find(isRequest);
  for (let i = first.body.messages.length - 1; i >= 0; i--) {
    const msg = first.body.messages[i];
    if (!Array.isArray(msg.content)) continue;
    const keep = msg.content.filter((b) => !(typeof b.text === "string" && REMINDER_BLOCK.test(b.text)));
    if (keep.length !== msg.content.length) {
      const removed = msg.content.length - keep.length;
      msg.content = keep;
      return { doc: m, removed, messageIdx: i };
    }
  }
  return { doc: m, removed: 0, messageIdx: -1 };
}

// --- the three runs -----------------------------------------------------------

test("(1) a mutant that drops the pinned range's last request is a COVERAGE red, exit 1", () => {
  const { doc, droppedAt } = dropLastRequest(PAIR.doc);
  assert.notEqual(droppedAt, -1, `${PAIR.name} carries no request record — the mutation would be a no-op`);
  const r = run(PAIR.path, write("mutant-short.json", doc));
  assert.equal(r.status, 1, `a cut that does not cover the pinned pair must exit 1:\n${r.stdout}`);
  assert.match(r.stdout, /DIVERGENCE/);
  assert.match(r.stdout, new RegExp(`at: +coverage n=${PAIR.doc.header.range.m}`),
    `the finding must NAME the uncovered ordinal:\n${r.stdout}`);
  assert.match(r.stdout, /does not replay pinned range ordinal/);
});

test("(2) a mutant keeping every record but stripping the pin-establishing reminder bytes is an outHash red, exit 1", () => {
  const { doc, removed, messageIdx } = stripPinReminders(PAIR.doc);
  assert.ok(removed > 0, `${PAIR.name}'s first request carries no <system-reminder> block — the mutation would be a no-op`);
  assert.equal(doc.records.filter(isRequest).length, PAIR.doc.records.filter(isRequest).length,
    "this mutant must keep every record, or it would be mutant (1) again");
  const r = run(PAIR.path, write("mutant-unpinned.json", doc));
  assert.equal(r.status, 1, `stripped pin bytes must exit 1:\n${r.stdout}`);
  assert.match(r.stdout, /DIVERGENCE/);
  assert.match(r.stdout, new RegExp(`at: +entry n=${PAIR.doc.header.replayFrom} field outHash`),
    `the forwarded-bytes hash is where this must be caught (message ${messageIdx}):\n${r.stdout}`);
  // The seed exemption covers `action`/`resetReason` only — a divergence
  // reported there instead would mean the exemption had widened into a hole.
  assert.doesNotMatch(r.stdout, /field (action|resetReason)/);
});

test("(3) a byte-identical copy diverges nowhere, exit 0 — and the run says how much it compared", () => {
  const r = run(PAIR.path, write("identical.json", PAIR.doc));
  assert.equal(r.status, 0, `identical fixtures must pass:\n${r.stdout}`);
  assert.match(r.stdout, /fixture-verdict-identity: identical/);
  const compared = /compared (\d+) entry verdict\(s\), (\d+) mitigation row\(s\)/.exec(r.stdout);
  assert.ok(compared, `the run must state its comparison count:\n${r.stdout}`);
  assert.ok(Number(compared[1]) > 0, "a green over zero entry verdicts is not identity");
  assert.ok(Number(compared[2]) > 0, "a green over zero mitigation rows is not identity");
});
