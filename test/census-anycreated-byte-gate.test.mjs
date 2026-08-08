// census-anycreated — the byte-gate's no-counterpart branch asks whether a
// standalone COUNTERPART WAS CREATED, not whether the text appears somewhere.
//
// THE DEFINITION, written before the assertions so they follow from it rather
// than from the code (dev-loop.md, "a bite's expected value comes from the
// invariant's DEFINITION"): a counterpart, in this tool, is a standalone
// role:"system" message carrying a host block's inner text — the population
// `analysePair`'s `classify()` scan walks as sysBefore/sysAfter. A pair
// MIGRATED when `after` carries such a standalone that `before` cannot account
// for. It DROPPED when it does not: the blocks vanished, no counterpart was
// created, the canonical rule was never exercised, and calling that MISMATCH
// blames the rule for a different phenomenon.
//
// Grounding, measured 2026-08-08 on the two live pairs the BACKLOG entry names
// ("READY — the byte-gate's `anyPresent` probe can never return false"), by a
// dry run of the rule BEFORE it was implemented:
//   s-captureAP reqOrd 97 (host PRUNED, hj=-1): standalone carriers per block
//     3->2 and 0->0, whole-body probe 4->3 and 1->0. Every count DECREASING,
//     and the shipped code answered MISMATCH. Correct: DROPPED.
//   s-captureAQ reqOrd 25 (host present at hj=2, the genuine wrapper-envelope
//     hole): a 7961ch standalone appears in `after` that `before` did not
//     carry, and it contains all three blocks' inner texts. Correct: MISMATCH.
// Two rules were refuted on that data before this one: searching the whole
// serialized body (cannot return false for a recurring text — and counting it
// is blind by conservation, since a migration removes the inline occurrence as
// it adds the standalone), and a bare CARRIER COUNT (a pair that prunes one
// carrier while creating a counterpart nets zero and reads DROPPED).
//
// Every fixture here is SYNTHETIC and must stay so: the class is detected by
// literal TEXT and `harvest.mjs` replaces text with hash tokens, so a harvested
// pin of either real pair reproduces nothing (dev-loop.md, "The scrub destroys
// CONTENT PREDICATES"). This tree is also public, where synthesized is the
// default anyway.

import { test } from "node:test";
import assert from "node:assert/strict";
import { analysePair } from "../tools/reminder-migration-census.mjs";

const HOST_ID = "t_host_anycreated_003";
const B0 = "synthetic recurring reminder body zero for anyCreated, not capture bytes";
const B1 = "synthetic vanishing reminder body one for anyCreated, not capture bytes";
const wrap = (t) => `<system-reminder>\n${t}\n</system-reminder>`;

const standalone = (t) => ({ role: "system", content: t });
const filler = (n) => ({ role: "user", content: [{ type: "text", text: `filler ${n}` }] });

/** A host: leading tool_result (its identity) + trailing wrapped blocks. */
const host = (blocks) => ({
  role: "user",
  content: [{ type: "tool_result", tool_use_id: HOST_ID },
            ...blocks.map((t) => ({ type: "text", text: wrap(t) }))],
});
/** The same message with its blocks departed — the host still present. */
const hostEcho = () => ({ role: "user", content: [{ type: "tool_result", tool_use_id: HOST_ID }] });

const verdictOf = (before, after) => {
  const findings = analysePair({ body: { messages: before } }, { body: { messages: after } });
  assert.equal(findings.length, 1, "these fixtures carry exactly one host");
  return findings[0];
};

test("RED-FIRST — a PRUNED host whose reminder text merely RECURS is DROPPED, not MISMATCH", () => {
  // The s-captureAP shape. B0 sits as two byte-identical standalones on BOTH
  // sides; the host and B1 are gone. Nothing was created, so nothing migrated.
  // Against the pre-fix code this reads MISMATCH: the whole-body probe finds
  // B0 among the surviving standalones and can never return false.
  const before = [standalone(wrap(B0)), filler(1), standalone(wrap(B0)), filler(2),
                  host([B0, B1]), filler(3)];
  const after = [standalone(wrap(B0)), filler(1), standalone(wrap(B0)), filler(2), filler(3)];

  // Preconditions, asserted rather than assumed — a fixture that quietly
  // stopped reproducing the shape would leave the bite passing for the wrong
  // reason.
  const wa = JSON.stringify(after);
  assert.ok(!wa.includes(HOST_ID), "the host must be absent from `after` (pruned)");
  assert.ok(!wa.includes(B1), "B1 must be gone from `after` entirely");
  assert.equal(after.filter((m) => m.role === "system" && m.content.includes(B0)).length, 2,
    "B0's carriers survive in `after`…");
  assert.equal(before.filter((m) => m.role === "system" && m.content.includes(B0)).length, 2,
    "…and are exactly the ones `before` already carried");

  const f = verdictOf(before, after);
  assert.equal(f.verdict, "DROPPED",
    "no counterpart was created — a recurring text is not a migration");
  assert.equal(f.hostPruned, true, "and the host really was pruned");
});

test("a counterpart CREATED after the host stays MISMATCH — the wrapper-envelope hole is not hidden", () => {
  // The s-captureAQ shape, and the direction that matters most: the created
  // standalone RETAINS the wrapper, so `classify()` rejects it (the wrapped
  // bytes are neither equal to nor prefixed by the unwrapped reconstruction)
  // and the row lands in this branch. It is still a counterpart CC created,
  // so the rule does not hold on it and the gate must keep saying so.
  const created = standalone(`${wrap(B0)}\n\n${wrap(B1)}`);
  const before = [filler(1), host([B0, B1]), filler(2)];
  const after = [filler(1), hostEcho(), created, filler(2)];

  assert.ok(JSON.stringify(after).includes(HOST_ID), "the host is PRESENT in `after` here");
  assert.equal(before.filter((m) => m.role === "system").length, 0,
    "`before` carries no standalone at all — the counterpart is new by construction");

  const f = verdictOf(before, after);
  assert.equal(f.verdict, "MISMATCH", "a created counterpart the canonical rule missed is a hole");
  assert.equal(f.hostPruned, false, "and this host was not pruned");
});

test("PRUNE + CREATE is MISMATCH — matching, never netting", () => {
  // The case a bare carrier COUNT gets wrong, and the reason the shipped rule
  // matches per TEXT: `before` carries one standalone containing B0's text (as
  // part of a larger, merged message), `after` has pruned it AND created a
  // genuine counterpart for the host. Carriers of B0 go 1 -> 1, so "after-count
  // exceeds before-count" reads no-increase and would answer DROPPED — a FALSE
  // DROPPED, the error direction that hides a real hole. The created
  // counterpart's TEXT occurs in `after` once and in `before` never, so the
  // matching form answers MISMATCH.
  //
  // The host carries ONE block deliberately. With a second block that the
  // pruned carrier does not contain, that block's own count rises 0 -> 1 and
  // rescues the count-only rule — the first draft of this fixture did exactly
  // that and stayed green under the netting mutation, which was evidence about
  // the fixture, not about the rule.
  const BX = "synthetic unrelated body merged alongside B0, not capture bytes";
  const pruned = standalone(`${wrap(B0)}\n\n${wrap(BX)}`);   // present in `before` only
  const created = standalone(wrap(B0));                      // created in `after` only
  const before = [pruned, filler(1), host([B0]), filler(2)];
  const after = [filler(1), hostEcho(), created, filler(2)];

  const carriers = (msgs) => msgs.filter((m) => m.role === "system" && m.content.includes(B0)).length;
  assert.equal(carriers(before), 1, "one carrier of B0 before…");
  assert.equal(carriers(after), 1, "…and one after: a bare count sees no change");
  assert.notEqual(pruned.content, created.content,
    "the two carriers differ in text — the case the matching form separates");

  const f = verdictOf(before, after);
  assert.equal(f.verdict, "MISMATCH",
    "a counterpart was created; a simultaneous prune must not net it away");
});

test("a new standalone that does NOT carry the block's text leaves the verdict DROPPED", () => {
  // The carrier condition itself: `after` gains a standalone `before` never had,
  // but it carries none of the host's block texts, so it is not a counterpart
  // and cannot make this a migration. Without this bite, a rule that counted
  // any new standalone would pass every other case here.
  const unrelated = standalone("UNRELATED SUMMARIZATION NOTICE, carries no reminder body");
  const before = [standalone(wrap(B0)), filler(1), host([B0, B1]), filler(2)];
  const after = [standalone(wrap(B0)), filler(1), hostEcho(), unrelated, filler(2)];

  assert.ok(!unrelated.content.includes(B0) && !unrelated.content.includes(B1),
    "the new standalone must carry neither block's text, or this proves nothing");
  assert.equal(after.filter((m) => m.role === "system").length,
    before.filter((m) => m.role === "system").length + 1,
    "…and it really is one MORE standalone than `before` carried");

  const f = verdictOf(before, after);
  assert.equal(f.verdict, "DROPPED", "a new standalone is only a counterpart if it carries the text");
});
