// tools/backlog-index.mjs — a derived VIEW of BACKLOG.md that does not
// silently go stale.
//
// Definitions from BACKLOG.md, "a derived VIEW of this backlog outlives its
// source within one session": per READY entry, a STABLE content-hash id
// alongside the volatile ordinal/line, stamped with the exact git blob the
// index was built from. Resolving by ORDINAL against a mismatched blob
// fails loudly; resolving by ID always re-derives from the current text.
//
// Section 1 pins the pure core against synthetic fixtures. Section 2 is the
// real-corpus, red-first proof: the entry's own verifier names `8e58988`
// (index built there) and `f3980db` (HEAD, later) — ordinals 50 and 61 must
// resolve to DIFFERENT headers (the defect, reproduced), while content-hash
// ids must resolve to the SAME two entries in both.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildIndex, entryId, resolveById, resolveByOrdinal } from "../tools/backlog-index.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function gitShow(ref, path) {
  return execFileSync("git", ["show", `${ref}:${path}`], { cwd: REPO, encoding: "utf8" });
}

const doc = (...bullets) => ["## Open", "", ...bullets].join("\n\n") + "\n";

// ==========================================================================
// Section 1: pure core, synthetic fixtures
// ==========================================================================

test("entryId: deterministic and distinct for distinct header lines", () => {
  const a = entryId("- **READY — one thing.**");
  const b = entryId("- **READY — a different thing.**");
  assert.equal(a, entryId("- **READY — one thing.**"), "same input, same id");
  assert.notEqual(a, b);
  assert.equal(typeof a, "string");
  assert.equal(a.length, 12);
});

test("buildIndex: one row per READY entry, in file order, non-READY excluded", () => {
  const text = doc(
    "- **READY — first.** Body.",
    "- **PARKED — not indexed.** Body.",
    "- **READY — second.** Body.",
  );
  const idx = buildIndex(text, "deadbeef");
  assert.equal(idx.blob, "deadbeef");
  assert.equal(idx.entries.length, 2);
  assert.deepEqual(idx.entries.map((e) => e.n), [0, 1]);
  assert.match(idx.entries[0].headline, /first/);
  assert.match(idx.entries[1].headline, /second/);
});

test("buildIndex: two entries with distinct headers get distinct ids", () => {
  const text = doc("- **READY — first.** Body.", "- **READY — second.** Body.");
  const idx = buildIndex(text, "deadbeef");
  assert.notEqual(idx.entries[0].id, idx.entries[1].id);
});

test("resolveById: finds an entry by its stable id regardless of position", () => {
  const before = doc("- **READY — target.** Body.", "- **READY — other.** Body.");
  const after = doc("- **READY — inserted first.** New.", "- **READY — target.** Body.", "- **READY — other.** Body.");
  const idx = buildIndex(before, "b1");
  const targetId = idx.entries[0].id;
  assert.match(idx.entries[0].headline, /target/);

  // The SAME id, resolved against the LATER text where an insertion moved
  // its ordinal from 0 to 1 -- resolveById must still find the right one.
  const row = resolveById(after, targetId);
  assert.ok(row);
  assert.match(row.headline, /target/);
});

test("resolveById: returns null when the id no longer resolves (entry closed)", () => {
  const before = doc("- **READY — will close.** Body.");
  const after = doc("- **PARKED — unrelated.** Body."); // the READY entry is gone
  const idx = buildIndex(before, "b1");
  assert.equal(resolveById(after, idx.entries[0].id), null);
});

test("resolveByOrdinal: SILENT (returns the row) when the blob matches", () => {
  const text = doc("- **READY — a.** Body.", "- **READY — b.** Body.");
  const idx = buildIndex(text, "b1");
  const row = resolveByOrdinal(idx, "b1", 1);
  assert.match(row.headline, /b\./);
});

test("resolveByOrdinal: FAILS LOUDLY (throws) when the blob does not match -- never a plausible wrong entry", () => {
  const text = doc("- **READY — a.** Body.", "- **READY — b.** Body.");
  const idx = buildIndex(text, "b1");
  assert.throws(() => resolveByOrdinal(idx, "b2-different-blob", 1), /STALE/);
});

test("resolveByOrdinal: throws on an out-of-range ordinal even with a matching blob", () => {
  const text = doc("- **READY — only one.** Body.");
  const idx = buildIndex(text, "b1");
  assert.throws(() => resolveByOrdinal(idx, "b1", 5), /no entry at ordinal/);
});

// ==========================================================================
// Section 2: real-corpus, RED-FIRST proof — 8e58988 (index built here) vs
// f3980db (HEAD, later) — both immutable, read at test time.
// ==========================================================================

const INDEX_BUILT_AT = "8e58988";
const LATER_HEAD = "f3980db";

test("RED — ordinals 50 and 61 resolve to DIFFERENT headers between 8e58988 and f3980db (the defect, reproduced)", () => {
  const early = gitShow(INDEX_BUILT_AT, "BACKLOG.md");
  const later = gitShow(LATER_HEAD, "BACKLOG.md");
  const idxEarly = buildIndex(early, INDEX_BUILT_AT);
  const idxLater = buildIndex(later, LATER_HEAD);

  const h50early = idxEarly.entries[50]?.headline;
  const h50later = idxLater.entries[50]?.headline;
  const h61early = idxEarly.entries[61]?.headline;
  const h61later = idxLater.entries[61]?.headline;
  assert.ok(h50early && h50later, "ordinal 50 must exist on both sides");
  assert.ok(h61early && h61later, "ordinal 61 must exist on both sides");
  assert.notEqual(h50early, h50later, "RED: ordinal 50 must name a DIFFERENT entry across the two commits");
  assert.notEqual(h61early, h61later, "RED: ordinal 61 must name a DIFFERENT entry across the two commits");
});

test("GREEN — content-hash ids resolve to the SAME two entries in both commits", () => {
  const early = gitShow(INDEX_BUILT_AT, "BACKLOG.md");
  const later = gitShow(LATER_HEAD, "BACKLOG.md");
  const idxEarly = buildIndex(early, INDEX_BUILT_AT);

  const id50 = idxEarly.entries[50].id;
  const id61 = idxEarly.entries[61].id;
  const headline50Early = idxEarly.entries[50].headline;
  const headline61Early = idxEarly.entries[61].headline;

  const row50Later = resolveById(later, id50);
  const row61Later = resolveById(later, id61);
  assert.ok(row50Later, "id for ordinal-50's entry must still resolve in the later text");
  assert.ok(row61Later, "id for ordinal-61's entry must still resolve in the later text");
  assert.equal(row50Later.headline, headline50Early, "same entry, by id, regardless of ordinal drift");
  assert.equal(row61Later.headline, headline61Early, "same entry, by id, regardless of ordinal drift");
});

test("GREEN — resolveByOrdinal fails loudly rather than returning the plausible-but-wrong entry across the two blobs", () => {
  const early = gitShow(INDEX_BUILT_AT, "BACKLOG.md");
  const idxEarly = buildIndex(early, INDEX_BUILT_AT);
  // A stale index (built at 8e58988) read against the LATER blob must throw,
  // never silently return ordinal 50's row as if it still named the same
  // entry -- the exact failure mode that cost six wrong entries by hand.
  assert.throws(() => resolveByOrdinal(idxEarly, LATER_HEAD, 50), /STALE/);
});
