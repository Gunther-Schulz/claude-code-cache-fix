// The harvest ledger indexes by a HASH, not by the capture key.
//
// It indexed by the capture key until 2026-08-05, which put 94 full session
// identifiers into a tracked file in a public repo. Two things kept that
// quiet: the file is allowlisted in the scanner (for its `lastHarvest`
// timestamps, which ARE its content — not for the ids), and object KEY names
// were not scanned at all, so the class that would have caught them never
// looked. Both are fixed; this pins the half that lives here.

import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

import { ledgerKey, loadLedger } from "../tools/harvest.mjs";

const UUID_SHAPE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const REAL_SHAPE = "s-0123abcd-4567-89ef-0123-456789abcdef";

test("a capture key hashes to something that is not a capture identifier", () => {
  const k = ledgerKey(REAL_SHAPE);
  assert.match(k, /^k_[0-9a-f]{16}$/);
  assert.ok(!UUID_SHAPE.test(k), "the point: no session identifier survives into the index");
  assert.ok(!k.includes("0123abcd"), "not even the prefix");
});

test("hashing is idempotent, so a migrated ledger does not re-migrate", () => {
  const once = ledgerKey(REAL_SHAPE);
  assert.equal(ledgerKey(once), once,
    "loadLedger runs on every read — a non-idempotent map would rehash forever");
});

test("distinct captures keep distinct entries", () => {
  const a = ledgerKey("s-aaaaaaaa-0000-0000-0000-000000000000");
  const b = ledgerKey("s-bbbbbbbb-0000-0000-0000-000000000000");
  assert.notEqual(a, b, "a collision would silently merge two captures' watermarks");
});

test("MIGRATION: an old raw-key ledger loads with its watermarks intact", async () => {
  // The case that decides whether this ships without anyone running anything:
  // every existing ledger is raw-keyed, and losing its watermarks would make
  // the next harvest re-bank fixtures it already has.
  const dir = await tmpDir("ledger-mig-");
  const path = join(dir, "LEDGER-Test.json");
  await writeFile(path, JSON.stringify({
    version: 1,
    keys: {
      [REAL_SHAPE]: { requests: 892, classes: ["replace/edit"] },
      "s-fedcba98-7654-3210-fedc-ba9876543210": { requests: 7, classes: [] },
    },
  }));

  const migrated = await loadLedger(path);
  const keys = Object.keys(migrated.keys);
  assert.equal(keys.length, 2, "no entry lost");
  assert.ok(!keys.some((k) => UUID_SHAPE.test(k)), "no identifier survives the load");
  assert.equal(migrated.keys[ledgerKey(REAL_SHAPE)].requests, 892,
    "the watermark is what makes re-harvesting unnecessary — it must survive");
  assert.deepEqual(migrated.keys[ledgerKey(REAL_SHAPE)].classes, ["replace/edit"],
    "and so must the banked classes");
});

test("a ledger that does not parse yields an empty one rather than throwing", async () => {
  const dir = await tmpDir("ledger-bad-");
  const path = join(dir, "LEDGER-Test.json");
  await writeFile(path, "{ not json");
  const l = await loadLedger(path);
  assert.deepEqual(l, { version: 1, keys: {} });
});

test("the committed ledger carries no session identifier", async () => {
  // The artifact itself, not a synthetic stand-in: this is the file that was
  // exposed, and the assertion is about its real current bytes.
  const path = new URL("./fixtures/harvested/LEDGER-Siren.json", import.meta.url);
  const raw = JSON.parse(await readFile(path, "utf-8"));
  const offenders = Object.keys(raw.keys ?? {}).filter((k) => UUID_SHAPE.test(k));
  assert.deepEqual(offenders, [], "a raw capture key came back into the ledger");
});
