// tools/fixture-cut.mjs — the minimization post-step's own bite.
//
// Both reds are demonstrated BY HAND first (the fixture-cut dispatch,
// BACKLOG.md "fixture minimization at pin time"), then encoded here so
// neither regresses silently. Definitions below come from the WIRE and the
// fixture FORMAT's own documented contract (fixture-verdict-identity.mjs's
// NUMBERING comment), not from fixture-cut.mjs's implementation — the same
// discipline test/fixture-verdict-identity.test.mjs uses for its own
// mutants, so the expectations do not inherit the tool's parentage.
//
// NO FIXTURE IS NAMED HERE, for the same reason: the pair is discovered at
// test time by the property that makes a fixture replayable at all
// (header.replayFrom + header.range over a records array carrying at least
// one request) — the identical discovery predicate
// test/fixture-verdict-identity.test.mjs uses.
//
//   (1) RED-FIRST: a fixture whose prefix carries two records — a `boot`
//       and an `outcome` — that the wire format itself documents as
//       skipped during replay (fixture-verdict-identity.mjs's replayVerdicts
//       skips both types before assigning any ordinal, so neither can affect
//       a replayed verdict by construction). The cut must drop both and
//       identity must hold.
//   (2) REFUSAL: a fixture whose sole prefix record is the one that
//       ESTABLISHES the pinned range's own mitigation — measured by hand
//       (relabeling this corpus fixture's own range.n one ordinal later
//       turns its own pin-establishing record into "prefix" and its
//       mitigation row at range.m vanishes without it: suppressed count
//       1 -> 0, the row itself absent). The tool must write nothing.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "fixture-cut.mjs");
const CORPUS = join(REPO, "test", "fixtures", "harvested");

/** A request record, by the wire's own definition — same as the identity test. */
const isRequest = (rec) => Array.isArray(rec?.body?.messages);

/** Fixtures fixture-cut.mjs can operate on at all — discovered, never named. */
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
    if (typeof doc?.header?.range?.m !== "number") continue;
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

/**
 * Original capture ordinal per record, per the FORMAT's own documented
 * numbering rule (fixture-verdict-identity.mjs's NUMBERING comment):
 * boot/outcome records consume no ordinal, every request record is
 * consecutive from `replayFrom`. Written independently of fixture-cut.mjs's
 * own `computeOrdinals` so a bug shared between the two would not hide.
 */
function ordinalsOf(records, replayFrom) {
  const ords = [];
  let n = replayFrom - 1;
  for (const rec of records) {
    ords.push(isRequest(rec) ? ++n : null);
  }
  return ords;
}

function run(args) {
  try {
    const stdout = execFileSync(process.execPath, [TOOL, ...args], {
      encoding: "utf-8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stdout };
  } catch (e) {
    return { status: e.status ?? -1, stdout: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

const scratch = mkdtempSync(join(tmpdir(), "fixture-cut-test-"));
test.after(() => rmSync(scratch, { recursive: true, force: true }));
const write = (name, doc) => {
  const p = join(scratch, name);
  writeFileSync(p, JSON.stringify(doc));
  return p;
};

// --- (1) RED-FIRST: two verdict-irrelevant prefix records get dropped -------

test("(1) a prefix of boot+outcome records (verdicts never depend on either) gets fully dropped, identity holds", () => {
  const seed = structuredClone(PAIR.doc);
  const bootRec = { ts: seed.records[0]?.ts ?? "2000-01-01T00:00:00.000Z", type: "boot", proxyTree: null, gates: null };
  const outcomeRec = { ts: bootRec.ts, type: "outcome", id: null, key: null, requestId: null, model: null, usage: null, outSha: null, outBytes: null, ms: null };
  seed.records = [bootRec, outcomeRec, ...PAIR.doc.records];
  // header.replayFrom/range are unaffected: boot/outcome consume no ordinal.

  const seedPath = write("red-seed.json", seed);
  const outPath = join(scratch, "red-cut.json");
  const ords = ordinalsOf(seed.records, seed.header.replayFrom);
  const prefixLen = ords.indexOf(seed.header.range.n);
  assert.ok(prefixLen > 0, `${PAIR.name}'s seed carries no prefix ahead of range.n=${seed.header.range.n} — the mutation would be a no-op`);

  const r = run([seedPath, "--out", outPath]);
  assert.equal(r.status, 0, `a prefix of only inert records must be fully droppable:\n${r.stdout}`);
  const dropped = /dropped (\d+)\/(\d+) prefix record/.exec(r.stdout);
  assert.ok(dropped, `the run must report how many prefix records it dropped:\n${r.stdout}`);
  assert.equal(dropped[1], String(prefixLen), `every prefix record here is inert, so the cut must drop all ${prefixLen}, not ${dropped[1]}:\n${r.stdout}`);
  assert.equal(dropped[2], String(prefixLen));
  assert.match(r.stdout, /identity verified against/);

  assert.ok(existsSync(outPath), "a successful cut must write its output file");
  const cut = JSON.parse(readFileSync(outPath, "utf-8"));
  const wantRequests = seed.records.filter(isRequest).length;
  assert.equal(cut.records.length, wantRequests, "the cut must retain exactly the request records, no boot/outcome");
  assert.ok(cut.records.every(isRequest), "no boot/outcome record should survive a fully-inert-prefix cut");
});

// --- (2) REFUSAL: the pin-establishing record cannot be dropped -------------

test("(2) a fixture whose sole prefix record establishes the pinned range's own mitigation is refused: nothing written", () => {
  const ords = ordinalsOf(PAIR.doc.records, PAIR.doc.header.replayFrom);
  const idxN = ords.indexOf(PAIR.doc.header.range.n);
  assert.notEqual(idxN, -1, `${PAIR.name}: range.n does not appear among its own ordinals — corpus fixture is malformed`);
  assert.ok(
    PAIR.doc.header.range.n + 1 <= PAIR.doc.header.range.m,
    `${PAIR.name}'s pinned range must span at least 2 request ordinals (n=${PAIR.doc.header.range.n}, ` +
      `m=${PAIR.doc.header.range.m}) for this relabeling to name a real pair`,
  );

  // Relabel: drop everything before range.n from the array (idxN..end kept
  // verbatim) and rename the FORMER range.n as the new prefix by moving
  // range.n one ordinal later. The record that used to establish the pin is
  // now "prefix", exactly the shape measured by hand to break the mitigation
  // row at range.m.
  const seed = {
    header: { ...PAIR.doc.header, replayFrom: PAIR.doc.header.range.n, range: { n: PAIR.doc.header.range.n + 1, m: PAIR.doc.header.range.m } },
    records: PAIR.doc.records.slice(idxN),
  };
  const seedOrds = ordinalsOf(seed.records, seed.header.replayFrom);
  const seedPrefixLen = seedOrds.indexOf(seed.header.range.n);
  assert.equal(seedPrefixLen, 1, `the relabeled seed must carry exactly one prefix record (the former range.n):\n${JSON.stringify(seedOrds)}`);

  const seedPath = write("refusal-seed.json", seed);
  const outPath = join(scratch, "refusal-cut.json");

  const r = run([seedPath, "--out", outPath]);
  assert.equal(r.status, 1, `a fixture with a genuinely load-bearing prefix must refuse (exit 1), not silently pass or truncate:\n${r.stdout}`);
  assert.match(r.stdout, /refusal/i, `the reason must be stated:\n${r.stdout}`);
  assert.match(r.stdout, /load-bearing/, `the reason must name WHY, not just fail silently:\n${r.stdout}`);
  assert.ok(!existsSync(outPath), "a refusal must write nothing");
});
