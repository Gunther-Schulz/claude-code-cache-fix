// The far-from-anchor excerpt pass must print the bytes of the request the
// census row names — not of whatever capture LINE happens to share its number.
//
// THE DEFECT THIS GOES RED ON (measured 2026-08-06, capture s-captureAM, while
// walking the 18:08:32Z 301k bust). main()'s own read loop says it plainly:
// "`n` counts REQUEST records only. Outcome records ... letting them consume an
// index would shift every request number". The excerpt pass 570 lines below it
// keyed its asks by `e.n`/`e.prevN` and then matched them against
// `readCapture`'s index, which counts every non-blank LINE — outcome and boot
// records included. Live result on that capture: 5 of 6 asks printed
// "(missing)" because the ask landed on an outcome record, and the one that DID
// print — `@1 n=222 (after)` — came from capture line 223, ts 17:50:41.461Z,
// while census request n=222 is ts 18:01:50.146Z. Eleven minutes and 106
// outcome records apart, presented as the bytes at the divergence.
//
// That is the third recorded instance of the ordinal-namespace error in this
// repo (docs/dev-loop.md, "Two coordinate spaces that look like one") and the
// first INSIDE the tool built to end the hand-extraction the class used to
// need. The join is the record's own `id` — a field the row carries — never a
// counter re-derived at the read.
//
// Spawns the real CLI rather than an exported helper: the thing under test is
// what a reader sees on stdout, and the wrong-record failure is invisible to
// any test of `excerptMessage` in isolation (that function is already tested,
// and was already correct — the guard sat on the pure function while the
// record SELECTION feeding it was unguarded, this repo's one-route shape).

import { tmpDir } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFile, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPLAY = join(__dirname, "..", "tools", "replay.mjs");

const text = (t) => ({ type: "text", text: t });
const reminder = (t) => ({ role: "user", content: [text(`<system-reminder>${t}</system-reminder>`)] });
const asst = (t) => ({ role: "assistant", content: [text(t)] });
const human = (t) => ({ role: "user", content: [text(t)] });

// 40 messages: an injected reminder at index 2 (the slot that gets re-stamped)
// and the only human turn at index 39, so anchorDelta is -37 and the
// far-from-anchor tripwire (>30) fires. Nothing else in the history moves.
function history(marker) {
  const msgs = [reminder("boot")];
  for (let i = 1; i < 39; i++) msgs.push(asst(`turn ${i}`));
  msgs[2] = reminder(marker);
  msgs.push(human("please continue"));
  return msgs;
}

function reqLine(ts, id, sid, messages) {
  return JSON.stringify({
    ts,
    id,
    sid,
    key: `s-${sid}`,
    headers: { "anthropic-beta": null, "session-id": sid },
    body: { model: "claude-opus-5", system: [{ type: "text", text: "sys" }], messages },
  });
}

const outcomeLine = (ts, id, sid) =>
  JSON.stringify({ ts, type: "outcome", id, key: `s-${sid}`, requestId: `req_${id}`, usage: {} });

// Line order is the whole point: request ordinals (0,1,2) and line indices
// (0,2,4) diverge, and line index 2 holds a DECOY request from another
// session. Under the defect the "after" ask reads the decoy and prints it as
// evidence; under the fix it reads the request the row actually names.
async function writeFixture(dir) {
  const path = join(dir, "capture.jsonl");
  const lines = [
    reqLine("2026-08-06T10:00:00.000Z", "req-A", "sid-main", history("MARKER-BEFORE")),
    outcomeLine("2026-08-06T10:00:01.000Z", "req-A", "sid-main"),
    reqLine("2026-08-06T10:00:02.000Z", "req-DECOY", "sid-other", history("MARKER-DECOY")),
    outcomeLine("2026-08-06T10:00:03.000Z", "req-DECOY", "sid-other"),
    reqLine("2026-08-06T10:00:04.000Z", "req-B", "sid-main", history("MARKER-AFTER")),
  ];
  await writeFile(path, lines.join("\n") + "\n");
  return path;
}

test("BITE — the far-from-anchor excerpt names the request the census row names, not the capture line", async () => {
  const dir = await tmpDir("replay-excerpt-");
  try {
    const file = await writeFixture(dir);
    const run = spawnSync(process.execPath, [REPLAY, file, "--census"], {
      encoding: "utf-8",
      env: { PATH: process.env.PATH },
    });
    const out = run.stdout ?? "";

    // Precondition: the tripwire fired at all. Without this the assertions
    // below would pass vacuously on an empty section — the absence-of-evidence
    // shape docs/dev-loop.md calls a verdict's clothes.
    assert.match(out, /edit\(s\) >30 from the human anchor/, "the far-from-anchor tripwire must fire");

    const excerpts = out.split("\n").filter((l) => /^\s+@\d+ n=\d+ \((before|after)\)/.test(l));
    assert.equal(excerpts.length, 2, `expected one excerpt per side, got:\n${excerpts.join("\n")}`);

    const before = excerpts.find((l) => l.includes("(before)"));
    const after = excerpts.find((l) => l.includes("(after)"));

    assert.match(before, /MARKER-BEFORE/, "the (before) excerpt is the predecessor request's bytes");
    assert.match(after, /MARKER-AFTER/, "the (after) excerpt is the successor request's bytes");
    // The dangerous half: a wrong record that still prints something plausible.
    assert.doesNotMatch(after, /MARKER-DECOY/, "an excerpt must never come from an unrelated request");
    assert.doesNotMatch(before, /MARKER-DECOY/, "an excerpt must never come from an unrelated request");
    // And "(missing)" is the other observed failure — an ask that landed on an
    // outcome record. A record that genuinely has no message at the index is a
    // different answer and says so in its own words.
    for (const l of excerpts) assert.doesNotMatch(l, /\(missing\)/, `ask landed on a body-less record: ${l}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
