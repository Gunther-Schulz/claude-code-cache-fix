// gate-live — the sweep that runs the real gate over live captures.
//
// It exists because two gate defects (a RangeError on a 955 MB capture, a
// 3.2 GB retention peak) were invisible to `npm test` by construction: the
// committed corpus is harvested for STRUCTURAL NOVELTY and sanitised, so it is
// small on purpose and can never contain a scale-shaped input.
//
// Which means this file cannot test the thing that matters either — only the
// scheduled run against real captures can. What it CAN pin is the reporting:
// that a gate which died is recorded as an error rather than smoothed into a
// clean row, and that a clean sweep needs actual captures behind it. Those are
// the two ways a green verdict could lie.

import { test } from "node:test";
import assert from "node:assert/strict";

import { summarise, rowIsClean } from "../tools/gate-live.mjs";

const json = (o) => ({ code: 0, out: JSON.stringify(o), err: "" });

test("summarise: a clean gate run reads clean", () => {
  const row = summarise("c.jsonl", 100, json({
    report: [{ n: 0 }, { n: 1 }],
    violations: [], safety: [], sequence: [], orderViolations: [],
  }));
  assert.equal(row.requests, 2);
  assert.equal(rowIsClean(row), true);
});

// The case the job was built for. A gate that CRASHED produces no JSON; if
// that were treated as "no violations found", the sweep would report success
// precisely when the gate ran no checks at all — the exact false green that
// let the RangeError live.
test("BITE — a gate that died is an error, never a clean row", () => {
  const row = summarise("big.jsonl", 955_000_000, {
    code: 1,
    out: "",
    err: "replay failed: RangeError: Invalid string length\n    at readFileHandle",
  });
  assert.ok(row.error, "a crash must be recorded as an error");
  assert.match(row.error, /RangeError/, "the reason must survive into the status file");
  assert.equal(rowIsClean(row), false);
  assert.equal(row.stability, undefined, "no violation counts may be invented for a run that produced none");
});

test("BITE — a nonzero exit is not clean even if JSON parsed", () => {
  // replay exits non-zero on violations; the counts and the exit code must
  // agree, and if they ever disagree the stricter one wins.
  const res = json({ report: [{ n: 0 }], violations: [], safety: [], sequence: [], orderViolations: [] });
  res.code = 1;
  assert.equal(rowIsClean(summarise("c.jsonl", 10, res)), false);
});

test("BITE — each violation class alone is enough to fail the row", () => {
  for (const key of ["violations", "safety", "sequence", "orderViolations"]) {
    const payload = {
      report: [{ n: 0 }], violations: [], safety: [], sequence: [], orderViolations: [],
    };
    payload[key] = [{ n: 0 }];
    const row = summarise("c.jsonl", 10, json(payload));
    assert.equal(rowIsClean(row), false, `${key} must fail the row on its own`);
  }
});

test("summarise: unparseable capture lines are counted, not hidden", () => {
  const row = summarise("c.jsonl", 10, json({
    report: [{ n: 0 }, { n: 1, error: "unparseable capture line" }],
    violations: [], safety: [], sequence: [], orderViolations: [],
  }));
  assert.equal(row.unparseable, 1);
});

test("spawn failure (no node, bad path) is an error row", () => {
  const row = summarise("c.jsonl", 10, { code: -1, out: "", err: "spawn ENOENT" });
  assert.equal(rowIsClean(row), false);
  assert.match(row.error, /ENOENT/);
});
