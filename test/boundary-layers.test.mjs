// `tools/boundary-layers.mjs` prices a cold event layer by layer and
// classifies the message-array divergence. Both halves get bites, because
// both have already produced a wrong answer:
//
//  - the CASCADE is what answers matrix rows 24 and 29's standing question
//    ("where does the divergence land once layer X is pinned"), and a wrong
//    layer ordering would price the wrong mitigation;
//  - the ALIGNMENT classifier's FIRST version reported "the history below is
//    rebuilt" on the live 919k pair, because it measured the agreeing run
//    starting AT the divergence index — which is a known mismatch, so the
//    run was 0 at every offset and every shape looked like a rebuild. The
//    truth was two messages edited in place with 1,432 identical after them.
//    A scan anchored to a known mismatch cannot measure agreement; these
//    tests pin the three outcomes apart.

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "boundary-layers.mjs");

const msg = (t) => ({ role: "user", content: [{ type: "text", text: `m-${t}` }] });
const sys = (t) => ({ type: "text", text: t });

function capture(records) {
  const dir = tmpDirSync("bl-");
  const f = join(dir, "s-BL01-requests.jsonl");
  writeFileSync(f, records.map((r) => JSON.stringify(r)).join("\n") + "\n");
  return f;
}

function run(file, extra = []) {
  const out = execFileSync(process.execPath,
    [TOOL, "--capture", file, "--at", "2026-08-15T15:07:49Z", "--json", ...extra],
    { cwd: REPO, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return JSON.parse(out);
}

const BODY = Array.from({ length: 12 }, (_, i) => msg(`e${i}`));
const rec = (ts, { tools, system, messages }) => ({ ts, id: ts, body: { model: "m", tools, system, messages } });

test("BITE — the cascade reports layers in wire order and names the FIRST divergence", () => {
  // tools differ AND system differs. tools render first, so the cascade must
  // name tools — pinning system alone would buy nothing, which is exactly the
  // conclusion the tool exists to make un-guessable.
  const f = capture([
    rec("2026-08-15T15:04:43.000Z", { tools: [{ name: "Bash", description: "session_AAA" }], system: [sys("s0"), sys("env-OLD")], messages: [msg("head"), ...BODY] }),
    rec("2026-08-15T15:07:10.000Z", { tools: [{ name: "Bash", description: "session_BBB" }], system: [sys("s0"), sys("env-NEW")], messages: [msg("head"), ...BODY] }),
  ]);
  const d = run(f);
  assert.equal(d.firstDivergingLayer, "tools", "tools render before system and must be named first");
  const names = d.layers.map((l) => l.layer);
  assert.deepEqual(names.slice(0, 3), ["tools", "system[0]", "system[1]"], "wire order, not object order");
  assert.equal(d.layers.find((l) => l.layer === "system[0]").identical, true);
  assert.equal(d.layers.find((l) => l.layer === "system[1]").identical, false);
});

test("BITE — two messages edited IN PLACE classify as LOCAL-EDIT, not REBUILD", () => {
  // The live shape, reduced: indices 5 and 6 change, everything after is
  // byte-identical at the SAME index. The first version of the classifier
  // called this a rebuild.
  const before = [msg("head"), ...BODY];
  const after = [msg("head"), ...BODY];
  after[5] = msg("edited-5");
  after[6] = msg("edited-6");
  const f = capture([
    rec("2026-08-15T15:04:43.000Z", { tools: [], system: [sys("s")], messages: before }),
    rec("2026-08-15T15:07:10.000Z", { tools: [], system: [sys("s")], messages: after }),
  ]);
  const d = run(f);
  assert.equal(d.messageAlignment.kind, "LOCAL-EDIT");
  assert.equal(d.messageAlignment.divergenceIndex, 5);
  assert.equal(d.messageAlignment.changedMessages, 2, "exactly the two edited messages");
  assert.equal(d.messageAlignment.resumeOffset, 0, "the tail resumes at the SAME indices");
});

test("CONTROL — an inserted message classifies as SHIFT, never LOCAL-EDIT", () => {
  // The discriminating sibling: same divergence index, different mitigation
  // class. If this returned LOCAL-EDIT the classifier would be reporting
  // "something changed" rather than WHICH outcome happened.
  const before = [msg("head"), ...BODY];
  const after = [msg("head"), ...BODY.slice(0, 5), msg("INSERTED"), ...BODY.slice(5)];
  const f = capture([
    rec("2026-08-15T15:04:43.000Z", { tools: [], system: [sys("s")], messages: before }),
    rec("2026-08-15T15:07:10.000Z", { tools: [], system: [sys("s")], messages: after }),
  ]);
  const d = run(f);
  assert.equal(d.messageAlignment.kind, "SHIFT");
  assert.equal(d.messageAlignment.resumeOffset, -1, "one message inserted shifts the tail by one");
});

test("CONTROL — a pure append reports no message divergence at all", () => {
  const before = [msg("head"), ...BODY];
  const after = [msg("head"), ...BODY, msg("new-turn")];
  const f = capture([
    rec("2026-08-15T15:04:43.000Z", { tools: [], system: [sys("s")], messages: before }),
    rec("2026-08-15T15:07:10.000Z", { tools: [], system: [sys("s")], messages: after }),
  ]);
  const d = run(f);
  assert.equal(d.messageAlignment.kind, "IDENTICAL", "an append changes nothing already sent");
  assert.equal(d.firstDivergingLayer, null, "and no layer diverges");
});

test("BITE — predecessor relations that DISAGREE are reported, never collapsed", () => {
  // A co-tenant sidecar sits between the real predecessor and the busting
  // request. "nearest earlier, any conversation" must find the sidecar while
  // "same model" finds the real one — and both must be visible, because the
  // disagreement is the finding.
  const f = capture([
    rec("2026-08-15T15:04:43.000Z", { tools: [], system: [sys("s")], messages: [msg("head"), ...BODY] }),
    { ts: "2026-08-15T15:07:09.000Z", id: "sidecar", body: { model: "haiku", tools: [], system: [sys("x")], messages: [msg("side")] } },
    rec("2026-08-15T15:07:10.000Z", { tools: [], system: [sys("s")], messages: [msg("head2"), ...BODY] }),
  ]);
  const d = run(f);
  assert.equal(d.before.ts, "2026-08-15T15:04:43.000Z", "the same-model predecessor, not the sidecar");
  const byRelation = Object.fromEntries(d.candidates.map((c) => [c.relation, c.ts]));
  assert.equal(byRelation["nearest earlier, any conversation"], "2026-08-15T15:07:09.000Z",
    "the sidecar must still be REPORTED under its own relation");
  assert.notEqual(byRelation["nearest earlier, same model"], byRelation["nearest earlier, any conversation"],
    "the relations disagree here, which is precisely what must stay visible");
});
