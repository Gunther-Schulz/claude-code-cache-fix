// hook-decision-census: the census logic, exercised against synthesized
// fixtures only — never a copied real transcript (CLAUDE.local.md, the
// publication bar; this repo is public and the fixtures directory is
// audited).
//
// Namespace import (dispatch-guards:executor, conduct rule 3 / brief step 3):
// a missing export fails at its own call site, not at module link time.

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import * as mod from "../tools/hook-decision-census.mjs";
import { tmpDirSync } from "../tools/tmpdir.mjs";

const {
  classifyDecision,
  extractDenialLabel,
  censusLines,
  censusFile,
  censusTree,
  formatHuman,
} = mod;

// --- classifyDecision --------------------------------------------------

test("classifyDecision: allow/ask/deny from hookSpecificOutput.permissionDecision", () => {
  for (const pd of ["allow", "ask", "deny"]) {
    const stdout = JSON.stringify({ hookSpecificOutput: { permissionDecision: pd, permissionDecisionReason: "x" } });
    assert.equal(classifyDecision(stdout).kind, pd);
  }
});

test("classifyDecision: valid JSON with no permissionDecision field is empty", () => {
  const stdout = JSON.stringify({ hookSpecificOutput: { additionalContext: "some context" } });
  assert.equal(classifyDecision(stdout).kind, "empty");
});

test("classifyDecision: empty string stdout is empty", () => {
  assert.equal(classifyDecision("").kind, "empty");
  assert.equal(classifyDecision(undefined).kind, "empty");
});

test("classifyDecision: invalid JSON is unparseable", () => {
  assert.equal(classifyDecision("{not json").kind, "unparseable");
});

test("classifyDecision: JSON array or non-object top level is unparseable", () => {
  assert.equal(classifyDecision("[1,2,3]").kind, "unparseable");
  assert.equal(classifyDecision("null").kind, "unparseable");
  assert.equal(classifyDecision('"a string"').kind, "unparseable");
});

test("classifyDecision: an unrecognized permissionDecision value falls back to empty, not a crash", () => {
  const stdout = JSON.stringify({ hookSpecificOutput: { permissionDecision: "something-new" } });
  assert.equal(classifyDecision(stdout).kind, "empty");
});

// --- extractDenialLabel --------------------------------------------------

test("extractDenialLabel: the hook-crash-wrapper signature", () => {
  const r = extractDenialLabel("PreToolUse:Bash hook error: [/some/path/hook.py] Traceback...");
  assert.deepEqual(r, { kind: "hook-crash-wrapper", label: "PreToolUse:Bash" });
});

test("extractDenialLabel: the hook-reason-bracket signature", () => {
  const r = extractDenialLabel("[dispatch-guards/push-claim-reminder] Fused push (dispatch skill §1): ...");
  assert.deepEqual(r, { kind: "hook-reason-bracket", label: "dispatch-guards/push-claim-reminder" });
});

test("extractDenialLabel: ordinary tool failures match neither signature", () => {
  assert.equal(extractDenialLabel("Exit code 1\nTraceback (most recent call last):"), null);
  assert.equal(extractDenialLabel("<tool_use_error>File does not exist.</tool_use_error>"), null);
  assert.equal(extractDenialLabel("error: pathspec '-m' did not match any file(s)"), null);
});

test("extractDenialLabel: a markdown checklist line is not a bracket hook name (over-firing control)", () => {
  // "[ ] some task" starts with a bracket but is not \w-shaped inside it.
  assert.equal(extractDenialLabel("[ ] an unchecked markdown task"), null);
});

test("extractDenialLabel: non-string input returns null rather than throwing", () => {
  assert.equal(extractDenialLabel(undefined), null);
  assert.equal(extractDenialLabel(null), null);
});

// --- fixture builders ------------------------------------------------------

function preToolUseHookSuccess({ toolUseID, hookName, decision }) {
  const stdout = decision
    ? JSON.stringify({ hookSpecificOutput: { permissionDecision: decision, permissionDecisionReason: "r" } })
    : JSON.stringify({ hookSpecificOutput: { additionalContext: "ctx" } });
  return JSON.stringify({
    type: "attachment",
    attachment: {
      type: "hook_success",
      hookName,
      hookEvent: "PreToolUse",
      toolUseID,
      content: "",
      stdout,
      stderr: "",
      exitCode: 0,
    },
  });
}

function toolResultErrorLine({ toolUseId, text }) {
  return JSON.stringify({
    message: {
      content: [
        { type: "tool_result", tool_use_id: toolUseId, is_error: true, content: text },
      ],
    },
  });
}

// --- censusLines: the core correlation logic --------------------------

test("censusLines: counts a PreToolUse attachment and its parsed decision, by hookName and in total", () => {
  const lines = [
    preToolUseHookSuccess({ toolUseID: "toolu_1", hookName: "PreToolUse:Bash", decision: "allow" }),
  ];
  const r = censusLines(lines);
  assert.equal(r.preToolUseTotal.total, 1);
  assert.equal(r.preToolUseTotal.byHookName.get("PreToolUse:Bash"), 1);
  assert.equal(r.decisionTotals.get("PreToolUse:Bash").allow, 1);
});

test("censusLines: an error-text denial with NO deny decision anywhere on that call counts as error-only", () => {
  const lines = [
    preToolUseHookSuccess({ toolUseID: "toolu_1", hookName: "PreToolUse:Bash", decision: null }), // empty
    toolResultErrorLine({
      toolUseId: "toolu_1",
      text: "[dispatch-guards/push-claim-reminder] Fused push (dispatch skill §1): reason text",
    }),
  ];
  const r = censusLines(lines);
  assert.equal(r.errorOnly.total, 1);
  assert.equal(r.errorOnly.byLabel.get("dispatch-guards/push-claim-reminder"), 1);
  assert.equal(r.errorOnly.withRecordedDenyElsewhere, 0);
  assert.equal(r.errorOnly.unattributedNoAttachment, 0);
});

test("censusLines: an error-text denial IS excluded when a deny decision WAS recorded on the same call — the discriminating case", () => {
  const lines = [
    preToolUseHookSuccess({ toolUseID: "toolu_1", hookName: "PreToolUse:Bash", decision: "deny" }),
    toolResultErrorLine({
      toolUseId: "toolu_1",
      text: "[dispatch-guards/push-claim-reminder] Fused push (dispatch skill §1): reason text",
    }),
  ];
  const r = censusLines(lines);
  assert.equal(r.errorOnly.total, 0, "excluded from the error-only total because a deny WAS recorded");
  assert.equal(r.errorOnly.withRecordedDenyElsewhere, 1);
  assert.equal(r.decisionTotals.get("PreToolUse:Bash").deny, 1, "the deny itself is still counted in item 2");
});

test("censusLines: the hook-crash-wrapper signature is counted separately from the bracket signature", () => {
  const lines = [
    toolResultErrorLine({
      toolUseId: "toolu_2",
      text: "PreToolUse:Edit hook error: [/some/hook/path.py] Traceback (most recent call last): ...",
    }),
  ];
  const r = censusLines(lines);
  assert.equal(r.errorOnly.total, 1);
  assert.equal(r.errorOnly.byLabel.get("PreToolUse:Edit"), 1);
});

test("censusLines: an error-text denial whose toolUseID has NO attachment at all is still counted, and flagged unattributed", () => {
  const lines = [
    toolResultErrorLine({
      toolUseId: "toolu_orphan",
      text: "[dispatch-guards/brief-reminder] some reason",
    }),
  ];
  const r = censusLines(lines);
  assert.equal(r.errorOnly.total, 1);
  assert.equal(r.errorOnly.unattributedNoAttachment, 1);
});

test("censusLines: a tool_result error that matches neither signature is not counted at all (over-firing control)", () => {
  const lines = [
    toolResultErrorLine({ toolUseId: "toolu_3", text: "Exit code 1\nTraceback (most recent call last): ..." }),
  ];
  const r = censusLines(lines);
  assert.equal(r.errorOnly.total, 0);
});

test("censusLines: a non-error tool_result is never counted, even if its text happens to match a signature", () => {
  const lines = [
    JSON.stringify({
      message: {
        content: [
          { type: "tool_result", tool_use_id: "toolu_4", is_error: false, content: "[dispatch-guards/foo] not actually an error" },
        ],
      },
    }),
  ];
  const r = censusLines(lines);
  assert.equal(r.errorOnly.total, 0);
});

test("censusLines: malformed JSON lines are skipped and counted, never silently dropped", () => {
  const lines = ["{not valid json", preToolUseHookSuccess({ toolUseID: "toolu_1", hookName: "PreToolUse:Bash", decision: "ask" })];
  const r = censusLines(lines);
  assert.equal(r.malformedLines, 1);
  assert.equal(r.decisionTotals.get("PreToolUse:Bash").ask, 1);
});

test("censusLines: blank lines are skipped without affecting malformedLines", () => {
  const r = censusLines(["", "   ", ""]);
  assert.equal(r.malformedLines, 0);
  assert.equal(r.preToolUseTotal.total, 0);
});

test("censusLines: a non-PreToolUse attachment (e.g. Stop) is not counted toward the PreToolUse total", () => {
  const lines = [
    JSON.stringify({
      type: "attachment",
      attachment: { type: "hook_blocking_error", hookName: "Stop", hookEvent: "Stop", toolUseID: "x" },
    }),
  ];
  const r = censusLines(lines);
  assert.equal(r.preToolUseTotal.total, 0);
});

// --- censusFile / censusTree: file and directory walking -----------------

test("censusFile: a nonexistent path is reported could-not-verify (ok:false), not a silent zero", () => {
  const r = censusFile("/nonexistent/path/that/does/not/exist.jsonl");
  assert.equal(r.ok, false);
  assert.ok(r.reason);
});

test("censusFile: a real synthetic file is read and censused", () => {
  const dir = tmpDirSync("hook-census-test-");
  const fp = join(dir, "s1.jsonl");
  writeFileSync(fp, [
    preToolUseHookSuccess({ toolUseID: "toolu_1", hookName: "PreToolUse:Bash", decision: "allow" }),
  ].join("\n") + "\n");
  const r = censusFile(fp);
  assert.equal(r.ok, true);
  assert.equal(r.preToolUseTotal.total, 1);
});

test("censusTree: walks a directory of synthetic files recursively and merges counts, RED-FIRST control", () => {
  const dir = tmpDirSync("hook-census-tree-");
  const sub = join(dir, "proj-a");
  mkdirSync(sub, { recursive: true });

  writeFileSync(join(sub, "s1.jsonl"), [
    preToolUseHookSuccess({ toolUseID: "toolu_1", hookName: "PreToolUse:Bash", decision: "allow" }),
    preToolUseHookSuccess({ toolUseID: "toolu_1", hookName: "PreToolUse:Bash", decision: null }),
    toolResultErrorLine({
      toolUseId: "toolu_2",
      text: "[dispatch-guards/push-claim-reminder] Fused push (dispatch skill §1): reason",
    }),
  ].join("\n") + "\n");
  writeFileSync(join(dir, "s2.jsonl"), [
    preToolUseHookSuccess({ toolUseID: "toolu_3", hookName: "PreToolUse:Skill", decision: "ask" }),
  ].join("\n") + "\n");

  const before = censusTree(join(dir, "does-not-exist-yet"));
  assert.equal(before.filesWalked, 0, "RED before the fixture root exists — the instrument reports zero honestly, not a crash");

  const r = censusTree(dir);
  assert.equal(r.filesWalked, 2);
  assert.equal(r.filesCouldNotVerify, 0);
  assert.equal(r.preToolUse.total, 3);
  assert.equal(r.preToolUse.byHookName["PreToolUse:Bash"], 2);
  assert.equal(r.preToolUse.byHookName["PreToolUse:Skill"], 1);
  assert.equal(r.decisions.total.allow, 1);
  assert.equal(r.decisions.total.ask, 1);
  assert.equal(r.decisions.byHookName["PreToolUse:Bash"].allow, 1);
  assert.equal(r.errorOnlyDenials.total, 1);
  assert.equal(r.errorOnlyDenials.byLabel["dispatch-guards/push-claim-reminder"], 1);

  // formatHuman must not throw and must carry the headline numbers as text —
  // a positional smoke check, not a byte-exact snapshot (the layout is free
  // to change; the numbers reaching the reader are not).
  const text = formatHuman(r);
  assert.match(text, /files walked: 2/);
  assert.match(text, /total: 3/); // PreToolUse attachments total
  assert.match(text, /dispatch-guards\/push-claim-reminder: 1/);
});

test("censusTree: a directory holding an unreadable-as-JSON file still reports the OTHER file's counts, and could-not-verify covers only genuine read failures", () => {
  // Files that exist but fail to *decode as JSONL per line* are NOT
  // could-not-verify (they are handled per-line, malformedLines) — only a
  // file that cannot be READ at all is. This tree has no such file; it
  // exists to pin that a present-and-readable file with garbage content
  // does NOT inflate filesCouldNotVerify.
  const dir = tmpDirSync("hook-census-garbage-");
  writeFileSync(join(dir, "garbage.jsonl"), "this is not json at all\nnor is this\n");
  const r = censusTree(dir);
  assert.equal(r.filesWalked, 1);
  assert.equal(r.filesCouldNotVerify, 0);
  assert.equal(r.malformedLines, 2);
  assert.equal(r.preToolUse.total, 0);
});
