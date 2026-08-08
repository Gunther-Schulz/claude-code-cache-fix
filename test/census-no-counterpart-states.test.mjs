// census-no-counterpart-states — each state a no-counterpart row can be in
// gets its own word in the census's printed row, instead of collapsing into
// `actual=0ch`.
//
// THE DEFINITION: a non-EXACT row's third field says what was found where a
// counterpart should have been. FOUR states exist, not two — a candidate was
// found and rejected (`rejected=<n>ch`); a counterpart was matched and its
// length is real (`actual=<n>ch`); the HOST was PRUNED from `after`
// (`host-pruned`); or the host carries no `tool_use_id`, so this tool cannot
// locate it at all (`host-unlocatable`). In the last two there is no position
// to consider a candidate against, no candidate is recorded, and `d.text` is
// "" for a reason that has nothing to do with a counterpart's size. Printing
// `actual=0ch` for either is the exact misleading tell `rejectedCandidate` was
// built to cure, handed back to the reader one case over (dev-loop.md, "give
// the state that has no word yet its own string"; BACKLOG, "the byte-gate's
// `anyPresent` probe can never return false", second defect).
//
// The ID-less host is not hypothetical and was not admitted on reasoning: over
// the live corpus on 2026-08-08 (100 captures, 0 unreadable, 17,512 pairs, 950
// hosts) it occurs twice, and BOTH occurrences reached the no-counterpart
// branch reporting a rejected candidate of 25,870 and 36,066 chars — in each
// case the message at index 1, never considered against anything.
//
// This asserts the DELIVERED OUTPUT — the tool run end to end over a capture,
// its own stdout read — rather than a field on a finding, because the row is
// what a reader of the byte-gate acts on (dev-loop.md, "wrongness lives where
// the work takes effect"). The capture is SYNTHETIC and written to a temp dir.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { analysePair, hostId } from "../tools/reminder-migration-census.mjs";

const TOOL = new URL("../tools/reminder-migration-census.mjs", import.meta.url).pathname;

const HOST_ID = "t_host_pruned_token_004";
const B0 = "synthetic recurring reminder body for the host-pruned token, not capture bytes";
const B1 = "synthetic vanishing reminder body for the host-pruned token, not capture bytes";
const wrap = (t) => `<system-reminder>\n${t}\n</system-reminder>`;
const standalone = (t) => ({ role: "system", content: wrap(t) });
// messages[0] is the conversation identity (`conversationOf`), so it must be
// byte-identical across the two records or they are not a pair at all.
const head = { role: "user", content: [{ type: "text", text: "conversation head, synthetic" }] };
const filler = (n) => ({ role: "user", content: [{ type: "text", text: `filler ${n}` }] });

const before = [head, standalone(B0), filler(1),
                { role: "user", content: [
                  { type: "tool_result", tool_use_id: HOST_ID },
                  { type: "text", text: wrap(B0) },
                  { type: "text", text: wrap(B1) }] },
                filler(2)];
// The host is PRUNED — its tool_use_id is gone from the body entirely — while
// B0's standalone survives byte-identical. Nothing migrated: DROPPED.
const after = [head, standalone(B0), filler(1), filler(2)];

function runCensus(beforeMsgs = before, afterMsgs = after) {
  const dir = tmpDirSync("census-no-counterpart-");
  const p = join(dir, "s-synthetic-requests.jsonl");
  writeFileSync(p, [
    JSON.stringify({ ts: "2026-08-08T09:00:00.000Z", body: { messages: beforeMsgs } }),
    JSON.stringify({ ts: "2026-08-08T09:00:01.000Z", body: { messages: afterMsgs } }),
  ].join("\n") + "\n");
  return execFileSync(process.execPath, [TOOL, p, "--verbose"],
    { encoding: "utf-8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
}

test("RED-FIRST — the pruned-host row prints `host-pruned`, never `actual=0ch`", () => {
  const out = runCensus();

  // Precondition: the run really compared the pair and really produced the
  // row under test. A zero-pair run prints no rows at all and would satisfy an
  // absence assertion vacuously (dev-loop.md, "a checker has THREE answers").
  assert.match(out, /1 same-conversation pair\(s\)/, "the pair must have been compared");
  const row = out.split("\n").find((l) => l.trim().startsWith("DROPPED"));
  assert.ok(row, `a DROPPED row must be printed; got:\n${out}`);

  assert.match(row, /host-pruned/, "the pruned-host state must carry its own token");
  assert.doesNotMatch(row, /actual=0ch/,
    "…and must not reuse the tell that reads as 'a counterpart of length zero'");
});

test("the token is not printed for a row whose host survived", () => {
  // The other side of the split: same shape, host PRESENT in `after`, so the
  // third field is about a candidate again and `host-pruned` would be a lie.
  // Without this, a rule that printed the token unconditionally would pass.
  const dir = tmpDirSync("census-host-present-");
  const p = join(dir, "s-synthetic-requests.jsonl");
  const afterPresent = [head, standalone(B0), filler(1),
                        { role: "user", content: [{ type: "tool_result", tool_use_id: HOST_ID }] },
                        standalone(B1), filler(2)];
  writeFileSync(p, [
    JSON.stringify({ ts: "2026-08-08T09:00:00.000Z", body: { messages: before } }),
    JSON.stringify({ ts: "2026-08-08T09:00:01.000Z", body: { messages: afterPresent } }),
  ].join("\n") + "\n");
  const out = execFileSync(process.execPath, [TOOL, p, "--verbose"],
    { encoding: "utf-8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });

  assert.match(out, /1 same-conversation pair\(s\)/, "the pair must have been compared");
  const row = out.split("\n").find((l) => /^\s*(DROPPED|MISMATCH|EXTENDED)/.test(l.trim()));
  assert.ok(row, `a non-EXACT row must be printed; got:\n${out}`);
  assert.doesNotMatch(row, /host-pruned/, "the host is present here — the token would be false");
  assert.doesNotMatch(row, /host-unlocatable/, "…and it was locatable, by its tool_use_id");
});

// --- the ID-less host: present in the corpus, and it reaches the same tell ---

// A host whose leading content block is not a tool_result, so `hostId()` has
// nothing to key on. Its reminder block still departs, so it is a host by the
// only definition this tool has.
const idlessHost = { role: "user", content: [
  { type: "text", text: "a leading text block, not a tool_result" },
  { type: "text", text: wrap(B1) }] };
// The message the defect reports: a long system message far from any host and
// never considered against one. Stands in for the 25,870- and 36,066-char
// notices of the two measured live occurrences.
const unrelated = { role: "system", content: "UNRELATED SUMMARIZATION NOTICE ".repeat(40) };
const idlessBefore = [head, unrelated, filler(1), idlessHost, filler(2)];
const idlessAfter = [head, unrelated, filler(1), filler(2)];

test("RED-FIRST — an ID-less host reports NO rejected candidate: nothing was position-eligible", () => {
  const findings = analysePair({ body: { messages: idlessBefore } },
                               { body: { messages: idlessAfter } });
  assert.equal(findings.length, 1, "one host, one finding");
  const f = findings[0];

  // Preconditions: this really is the ID-less state, and it really reaches the
  // no-counterpart branch — the only branch that carries `rejectedCandidate`.
  assert.equal(hostId(idlessHost), null, "the fixture's host must have no tool_use_id");
  assert.equal(f.text.length, 0, "no counterpart matched — the branch under test");
  assert.equal(f.hostIdless, true, "…reached through the ID-less state, not the pruned one");
  assert.equal(f.hostPruned, false, "the host was not pruned: it has no identity to look up");

  // The bite. Against the pre-fix code this reads `{ j: 1, chars: 1240 }` — the
  // unrelated notice, which no position filter excluded because there was no
  // position to filter by.
  assert.equal(f.rejectedCandidate, null,
    "with the host unlocatable there is no position-eligible standalone, so the field must be null");
});

test("RED-FIRST — the ID-less row prints `host-unlocatable`, its own word, never `actual=0ch`", () => {
  const out = runCensus(idlessBefore, idlessAfter);

  assert.match(out, /1 same-conversation pair\(s\)/, "the pair must have been compared");
  const row = out.split("\n").find((l) => l.trim().startsWith("DROPPED"));
  assert.ok(row, `a DROPPED row must be printed; got:\n${out}`);

  assert.match(row, /host-unlocatable/, "the ID-less state must carry its own token");
  assert.doesNotMatch(row, /host-pruned/,
    "…and not the pruned host's word: CC did not remove this host, the tool cannot identify it");
  assert.doesNotMatch(row, /actual=0ch/, "…nor the tell that reads as 'a counterpart of length zero'");
});
