// A walk whose disposition is NOT-OURS or NON-DEFECT with `row=none` read
// STATUS-UNREADABLE — a stop-here on a walk that needed no stopping.
//
// Named 2026-08-07 by the enum lane and deliberately not built there
// (widening the enum a second time was outside that lane's decided scope);
// this is that widening, the exact fix pattern the CONTROLLED-CAUSE token
// used one entry earlier — added to STATUS_RULES / VERDICT_BY_KIND so
// `statusKind`/`statusVerdict` recognise both tokens instead of returning
// null. Neither token is new to this repo: NOT-OURS already appears in two
// live `row=4` WALK-INDEX lines (harmless there — a row match never reaches
// `statusKind`), and NON-DEFECT is `docs/runbooks/sweep-finding.md`'s own
// terminal-state word — the live matrix already carries one `row=none`
// NON-DEFECT walk (`cause=none`), which was unreachable (nothing has
// `cause=none`) until this token existed, so this was a latent defect, not
// a live one.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpDirSync } from "../tools/tmpdir.mjs";

import { statusKind, statusVerdict, causeToWalk, eventWalks } from "../tools/bust-triage.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const MATRIX = join(REPO, "docs/directives/robustness-threat-matrix.md");

test("BITE — statusKind/statusVerdict recognise NOT-OURS", () => {
  assert.equal(statusKind("NOT-OURS"), "NOT-OURS");
  assert.equal(statusVerdict("NOT-OURS"), "NOT-OURS",
    "a row=none walk dispositioned NOT-OURS must reach a real verdict, not STATUS-UNREADABLE");
});

test("BITE — statusKind/statusVerdict recognise NON-DEFECT", () => {
  assert.equal(statusKind("NON-DEFECT"), "NON-DEFECT");
  assert.equal(statusVerdict("NON-DEFECT"), "NON-DEFECT",
    "a row=none walk dispositioned NON-DEFECT must reach a real verdict, not STATUS-UNREADABLE");
});

// CONTROL, from the entry: the two existing NOT-OURS/row=4 walks must be
// completely unaffected — a row match never reaches statusKind at all, so
// widening its vocabulary must change nothing about them.
test("CONTROL — an existing NOT-OURS/row=4 walk is untouched (it never reaches statusKind)", () => {
  const walk = causeToWalk("messages_changed", MATRIX);
  assert.ok(walk, "the live messages_changed walk must still resolve");
  assert.equal(walk.disposition, "NOT-OURS");
  assert.notEqual(walk.row, null, "this walk carries a real row — the row path, not the token path");
});

// The live matrix's own `cause=none disposition=NON-DEFECT row=none` walk
// (docs/directives/robustness-threat-matrix.md, the 2026-08-07 01:00:55Z
// walk) is deliberately UNREACHABLE from `causeToWalk` — `eventWalks`
// normalises a declared `cause=none` to `null` (no walks in the returned
// array ever carry `.cause === "none"`), because "none" names the ABSENCE
// of a cause token, not a token any real bust could carry (see
// `eventWalks`'s own `decl[1] !== "none" ? decl[1] : null`). So the entry's
// "no walk is in that state today (... or cause=none)" is exactly this: the
// live NON-DEFECT walk is real but structurally out of `causeToWalk`'s
// reach regardless of this fix — proven directly against `statusVerdict`
// instead, and the reachable case (a real cause, `disposition=NON-DEFECT`)
// is proven via a planted walk below, the same way as NOT-OURS.
test("BITE — the live cause=none NON-DEFECT/row=none walk's own disposition token now reaches a real verdict", () => {
  const walks = eventWalks(MATRIX);
  const walk = walks.find((w) => w.disposition === "NON-DEFECT" && w.row === null);
  assert.ok(walk, "the live NON-DEFECT/row=none walk must still parse");
  assert.equal(statusVerdict(walk.disposition), "NON-DEFECT",
    "before this fix, statusVerdict(walk.disposition) returned STATUS-UNREADABLE here");
});

// A planted NOT-OURS/row=none walk (the entry's own named scenario — the
// live matrix has none, since both live NOT-OURS walks carry row=4)
// must also reach a real verdict rather than stopping.
function withMatrix(mutate) {
  const dir = tmpDirSync("bt-wdt-");
  const p = join(dir, "matrix.md");
  writeFileSync(p, mutate(readFileSync(MATRIX, "utf8")));
  return p;
}

test("BITE — a planted NOT-OURS/row=none walk reaches a real verdict", () => {
  const p = withMatrix((s) => s.replace(
    /^WALK-INDEX: cause=messages_changed disposition=NOT-OURS row=4$/m,
    "WALK-INDEX: cause=messages_changed disposition=NOT-OURS row=none — planted for this test"));
  const walk = causeToWalk("messages_changed", p);
  assert.ok(walk);
  assert.equal(walk.row, null);
  assert.equal(walk.disposition, "NOT-OURS");
  assert.equal(statusVerdict(walk.disposition), "NOT-OURS",
    "a walk that needs no stopping must not stop at STATUS-UNREADABLE");
});

// Negative control: an unmatched status string still stops the reader —
// widening the vocabulary must not turn statusKind permissive.
test("CONTROL — an unrelated status string still reads STATUS-UNREADABLE", () => {
  assert.equal(statusKind("SOME-FUTURE-TOKEN"), null);
  assert.equal(statusVerdict("SOME-FUTURE-TOKEN"), "STATUS-UNREADABLE");
});
