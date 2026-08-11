// The relocate-then-pin content loss, reproduced SYNTHETICALLY end to end.
//
// WHY SYNTHETIC RATHER THAN A HARVESTED PIN, which is the obvious choice and
// the wrong one here. `docs/dev-loop.md` ("The scrub destroys CONTENT
// PREDICATES") measured that all four of fresh-session-sort's relocatable-block
// predicates are literal-text prefix tests — `isMcpBlock` is
// `text.startsWith("<system-reminder>\n# MCP Server Instructions")` —  and the
// harvest sanitizer replaces text with hash tokens. A pinned fixture therefore
// scores ZERO relocations where the live capture scores many, and `harvest
// --pin` reports success while freezing a fixture that reproduces nothing. So
// for this class the durable evidence is a fixture built from known-safe parts,
// which is also what the publication bar prefers: nothing here came off anyone's
// conversation.
//
// WHAT IT REPRODUCES (measured first on live traffic, capture alias
// s-captureBA, 2026-08-11; the same signature on s-captureBD and s-captureBG):
//
//   1. fresh-session-sort (order 250) relocates an `# MCP Server Instructions`
//      reminder out of the user message CC put it in and into an earlier
//      message.
//   2. insertion-normalization (order 395) then serves that earlier message's
//      STORED FIRST-SEEN form (`pinnedForwardForm` -> `stored.m`), which
//      predates the relocated block.
//   3. Net: the block CC sent reaches the wire in NO message. The conservation
//      gate reports `kind: "lost", at: <raw index>, side: "in"`, one unit,
//      and ZERO `invented` rows — pure loss, which is the signature that
//      separates this from the 2026-08-05 rewrite class (19 lost + 19 invented
//      in 1:1, because a rewrite loses one unit and invents one).
//
// STATUS — FIXED 2026-08-11, and this file is now the INVARIANT rather than a
// characterization. It shipped first as a characterization of the live defect
// (asserting the block was absent), and the flip performed here IS the fix's
// red-first arrangement: run these assertions against the pre-fix
// `insertion-normalization` and every one of them fails on the block being
// missing, with the two instrument-positives still green — which is the
// discriminating split, not a module that fails to load. The expectation comes
// from the conservation gate's own definition (replay.mjs, "Content
// conservation: the fifth gate", R-side clause (a)): content CC sent is present
// in the forwarded array, byte-identically, somewhere. It does NOT come from
// what either extension does, which is the parentage rule — an expectation
// derived from the artifact it grades stays green on the corruption it exists
// to catch.

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { readdir, unlink } from "node:fs/promises";

import { loadExtensions, runOnRequest } from "../proxy/pipeline.mjs";
import { blockUnitsFull, conservationViolations } from "../tools/replay.mjs";
import freshSessionSortExt, {
  isMcpBlock, isRelocatableBlock, fixBlockText, getBlockType, _resetRelocationMemory,
} from "../proxy/extensions/fresh-session-sort.mjs";
import { statePath as xdgStatePath } from "../proxy/xdg-dirs.mjs";
import { tmpDirSync } from "../tools/tmpdir.mjs";

const EXT_DIR = new URL("../proxy/extensions", import.meta.url).pathname;
const EXT_CONFIG = new URL("../proxy/extensions.json", import.meta.url).pathname;

// The block the live traffic loses. Only the FIRST LINE is load-bearing — it is
// what `isMcpBlock` keys on — so the body is invented filler and the whole
// fixture is safe to publish.
const MCP_BLOCK =
  "<system-reminder>\n# MCP Server Instructions\n\n" +
  "The following MCP servers have provided instructions for how to use their tools:\n\n" +
  "## example-server\nUse the example tools to do example things.\n</system-reminder>";

// A reminder that is NOT relocatable, carried alongside as the control: if the
// pin ate this one too the finding would be "the pin strips every reminder",
// a different and much wider claim.
const PLAIN_BLOCK = "<system-reminder>\nAn ordinary reminder with no relocatable heading.\n</system-reminder>";

const user = (...blocks) => ({ role: "user", content: blocks.map((text) => ({ type: "text", text })) });
const assistant = (text) => ({ role: "assistant", content: [{ type: "text", text }] });

// Request 1 establishes the canonical: message 0 exists and carries a volatile
// block (which is what makes insertion-normalization STORE a first-seen form for
// it), and no MCP block exists anywhere yet.
const request1 = () => [
  user("The user's opening prompt.", PLAIN_BLOCK),
  assistant("An answer."),
];

// Request 2 is the event: CC appends turns AND injects the MCP block into a
// later user message. Message 0's bytes are untouched by CC.
const request2 = () => [
  user("The user's opening prompt.", PLAIN_BLOCK),
  assistant("An answer."),
  user("A follow-up prompt."),
  user("Tool output and its reminders.", MCP_BLOCK),
];

async function forwardThrough(bodies) {
  // A fresh state root per run: the extensions persist canonical state, and a
  // run inheriting another's would start with message 0 already pinned from a
  // different fixture.
  const scratch = tmpDirSync("relocate-pin-");
  const saved = {
    home: process.env.CLAUDE_CONFIG_DIR,
    state: process.env.XDG_STATE_HOME,
    data: process.env.XDG_DATA_HOME,
    pin: process.env.CACHE_FIX_VOLATILE_PIN,
    ins: process.env.CACHE_FIX_INSERTION_NORMALIZE,
    xdg: process.env.CACHE_FIX_TEST_XDG,
  };
  process.env.CLAUDE_CONFIG_DIR = scratch;
  process.env.XDG_STATE_HOME = scratch;
  process.env.XDG_DATA_HOME = scratch;
  // NOT optional, and the reason is the whole point of this fixture. Under the
  // node test runner `proxy/xdg-dirs.mjs`'s `assertIsolated` THROWS unless the
  // caller declares an isolated root, and the stateful extensions wrap their
  // state I/O in fail-open catches — so the throw degrades to no-op
  // persistence. Without this line the pipeline runs STATELESS: no canonical
  // entry, no pin, and the relocated block survives. The first version of this
  // file omitted it and reported the loss ABSENT — a green-looking measurement
  // of the harness rather than of the system. `CACHE_FIX_TEST_XDG` is the
  // module's own name for "the caller isolated the XDG roots itself", which is
  // exactly what the three assignments above did.
  process.env.CACHE_FIX_TEST_XDG = "1";
  // The SERVING gates for the two extensions under test, set explicitly:
  // replay.mjs inherits nothing from the unit, and a run under defaults
  // exercises a pipeline nobody runs (dev-loop.md, "Replay the configuration
  // that is SERVING").
  process.env.CACHE_FIX_VOLATILE_PIN = "1";
  process.env.CACHE_FIX_INSERTION_NORMALIZE = "1";
  try {
    const exts = await loadExtensions(EXT_DIR, EXT_CONFIG);
    const out = [];
    for (const messages of bodies) {
      const ctx = {
        body: { messages },
        headers: { "x-session-id": "relocate-then-pin-fixture" },
        meta: { route: "messages" },
      };
      const raw = structuredClone(messages);
      await runOnRequest(ctx, exts);
      out.push({ raw, forwarded: ctx.body.messages ?? [], meta: ctx.meta });
    }
    return out;
  } finally {
    for (const [k, v] of [
      ["CLAUDE_CONFIG_DIR", saved.home], ["XDG_STATE_HOME", saved.state],
      ["XDG_DATA_HOME", saved.data], ["CACHE_FIX_VOLATILE_PIN", saved.pin],
      ["CACHE_FIX_INSERTION_NORMALIZE", saved.ins], ["CACHE_FIX_TEST_XDG", saved.xdg],
    ]) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const hashesOf = (messages) => {
  const s = new Set();
  for (const m of messages) for (const u of blockUnitsFull(m)) s.add(u.hash);
  return s;
};
const hashOfText = (text) => blockUnitsFull({ content: [{ type: "text", text }] })[0].hash;

test("arrange — the fixture's own predicates discriminate", () => {
  // Without this the whole file could pass vacuously against a block
  // fresh-session-sort never relocates, which is exactly how a fixture ends up
  // testing the harness instead of the system.
  assert.equal(isMcpBlock(MCP_BLOCK), true, "the MCP block must be one the extension claims");
  assert.equal(isRelocatableBlock(MCP_BLOCK), true);
  assert.equal(isRelocatableBlock(PLAIN_BLOCK), false, "the control must NOT be relocatable");
});

test("INVARIANT — a relocated block survives the pin, and CC's bytes stay on the wire", async () => {
  const runs = await forwardThrough([request1(), request2()]);
  const second = runs[1];
  const mcpHash = hashOfText(MCP_BLOCK);

  assert.ok(hashesOf(second.raw).has(mcpHash), "arrange: CC's raw request really does carry the block");

  // THE INSTRUMENT-POSITIVES, and they are here because their absence already
  // produced a wrong answer once. Both mechanisms must be observably ON: if the
  // pipeline runs stateless (the isolation trap above) nothing pins, the block
  // survives, and an assertion about the block alone cannot tell "the defect is
  // absent" from "neither mechanism ran". Assert on the extensions' OWN
  // telemetry, not on shape.
  assert.deepEqual(
    (second.meta.freshSessionSortStats?.relocated ?? []).map((r) => r.type), ["mcp"],
    "fresh-session-sort must actually have relocated the MCP block",
  );
  assert.equal(second.meta.freshSessionSortStats?.targetIndex, 0, "relocated into message 0");
  // The pin machinery must be ENGAGED — i.e. request 1's canonical survived and
  // message 0 is a matched pinned entry, which is the precondition the loss
  // needed. Asserted as state, not as `pinned > 0`: that counter was the first
  // version of this check and it was pinned to the DEFECT's own telemetry. The
  // fix makes the pin a legitimate no-op here (its output now equals the
  // incoming message, so nothing is rewritten and the counter is 0), so an
  // expectation of `> 0` would have demanded the broken behaviour forever —
  // a same-parentage expectation, which is the trap of deriving what to expect
  // from the artifact under test instead of from the invariant.
  assert.notEqual(second.meta.insertionNormalizeStats?.action, "reset",
    "request 1's canonical must have survived — a reset here means the run was stateless and proves nothing");
  assert.equal(second.meta.insertionNormalizeStats?.canonSize, 4,
    "all four messages are canonical, so message 0 is a matched pinned entry");
  assert.equal(second.meta.insertionNormalizeStats?.pinned, 0,
    "and the pin is now a NO-OP on message 0: stored form plus declared relocations "
    + "equals what came in, so there is nothing to rewrite. This was 1 before the fix.");
  // And the three counters the 2026-08-11 walk originally read to REFUTE this
  // extension are all zero here, exactly as they were live — which is why
  // reading them was the wrong probe: a pin is none of suppressed/dropped/moved.
  for (const field of ["suppressed", "dropped", "moved"]) {
    assert.equal(second.meta.insertionNormalizeStats?.[field], 0,
      `${field} stays 0 — the pin is not counted by it, so it can never evidence this loss`);
  }

  const forwarded = hashesOf(second.forwarded);
  assert.equal(forwarded.has(mcpHash), true,
    "THE INVARIANT: a block CC sent is on the wire, byte-identically, somewhere in "
    + "the forwarded array. Before the fix this was `false` — the pin served a stored "
    + "first-seen form that predated the relocation and the bytes were destroyed.");

  // The control, and it is what keeps the claim narrow: the non-relocatable
  // reminder in the SAME conversation survives. Were it lost too, the finding
  // would be about the pin stripping every reminder, not about the relocation.
  assert.equal(forwarded.has(hashOfText(PLAIN_BLOCK)), true,
    "a non-relocatable reminder is untouched — the loss is specific to the relocated block");
});

// THE SIBLING ENUMERATION (dev-loop.md, "A mitigation ships with its SIBLINGS
// enumerated"). Live traffic showed only the `mcp` type, because that is the
// block CC happened to inject late in these conversations. The MECHANISM is
// type-blind — it is `pinnedForwardForm` serving a stored form that predates
// whatever was relocated in — so the other three relocatable types are the
// adjacent cases, and their blast radius is measured here rather than assumed.
const RELOCATABLE = {
  skills: "<system-reminder>\nThe following skills are available for use with the Skill tool:\n\n- example: does example things\n</system-reminder>",
  deferred: "<system-reminder>\nThe following deferred tools are now available via ToolSearch:\n\nExampleTool\n</system-reminder>",
  hooks: "<system-reminder>\nSessionStart:startup hook success: an example hook fired\n</system-reminder>",
};

for (const [type, block] of Object.entries(RELOCATABLE)) {
  test(`sibling — a late-arriving ${type} block survives the same way`, async () => {
    assert.equal(isRelocatableBlock(block), true, `arrange: the ${type} block must be one the extension relocates`);
    const runs = await forwardThrough([
      request1(),
      [
        user("The user's opening prompt.", PLAIN_BLOCK),
        assistant("An answer."),
        user("A follow-up prompt."),
        user("Tool output and its reminders.", block),
      ],
    ]);
    const second = runs[1];
    assert.ok((second.meta.freshSessionSortStats?.relocated ?? []).length > 0,
      "instrument-positive: the relocation must actually have fired");
    assert.notEqual(second.meta.insertionNormalizeStats?.action, "reset",
      "instrument-positive: the canonical survived, so the pin path was engaged");
    // The invariant is the conservation gate's, not byte-identity: a relocated
    // block may reach the wire as the relocator's OWN declared rewrite of it
    // (`deferred` and `skills` are SORTED by `fixBlockText`), and the gate's
    // R-side clause (f) accounts for exactly that — a lost unit is excused when
    // its own pre-image maps to a post-image present in F. Asserting raw
    // identity here would demand that a declared, verified rewrite not happen,
    // which is a different extension's contract and not this fix's business.
    const onWire = hashOfText(fixBlockText(getBlockType(block), block));
    assert.equal(hashesOf(second.forwarded).has(onWire), true,
      `the ${type} block CC sent is on the wire too, as itself or as its declared `
      + "rewrite — the fix is the mechanism's, not the mcp type's, exactly as the loss was");
  });
}

test("the conservation gate goes quiet, and for the right reason", async () => {
  const runs = await forwardThrough([request1(), request2()]);
  const seen = new Set();
  let rows = [];
  for (const run of runs) {
    const r = conservationViolations({
      n: 0, ts: "2026-08-11T00:00:00.000Z",
      inMsgs: run.raw, outMsgs: run.forwarded,
      stats: run.meta.insertionNormalizeStats ?? null,
      freshSessionSortStats: run.meta.freshSessionSortStats ?? null,
      contentStripStats: run.meta.contentStripStats ?? null,
      smooshSplitStats: run.meta.smooshSplitStats ?? null,
      mutatedBy: [],
    }, seen);
    rows = rows.concat(r.violations);
  }

  // The gate is the instrument the daily sweep reads, so the fix is only real
  // if the gate goes quiet for the right reason: no loss AND no invention. A
  // fix that put the bytes back by INVENTING them would clear `lost` and light
  // `invented`, so asserting both is what separates the two.
  const lost = rows.filter((r) => r.kind === "lost");
  const invented = rows.filter((r) => r.kind === "invented");
  assert.deepEqual(lost, [], "no unit CC sent is unaccounted for any more");
  assert.deepEqual(invented, [], "and nothing was invented to achieve that");
});

// THE EVICTION PATH (BACKLOG "row 30's fix is untested on the eviction
// path"; threat-matrix row 30, RESIDUAL half; row 25, the LRU/prune cap on
// fresh-session-sort's per-conversation memory). The shipped fix carries a
// relocated block across the pin only because fresh-session-sort DECLARES it
// in `relocatedBlocks`. That declaration comes from PERSISTED per-conversation
// memory (fresh-session-sort.mjs, "Sticky relocation memory"), capped at 256
// conversations (module default `DEFAULT_MAX_CONVERSATIONS`, unverified by me
// against a literal loop — this bite forces the eviction directly instead, per
// brief). A conversation quiet past the cap stops declaring; the pin then has
// nothing to carry, and insertion-normalization's own comment at
// `pinnedForwardForm` states the intended fallback in so many words: "Where
// that memory is evicted the block simply stops being declared, and CC's own
// bytes win — which is the pre-existing behaviour, not a new one." Nothing
// asserted that until now. The failure this guards against is NOT absence of
// the block (that is correct) — it is a HALF-BUILT forward: a stale
// carry-over from a declaration that no longer exists.
//
// WHY THE RESET SEAM NEEDS TWO PARTS, not just the exported
// `_resetRelocationMemory()` call the brief names. Probed directly (see the
// dispatcher's grounding basis, "Adding a check" — a load-bearing claim earns
// a disproving probe before building on it): calling the plainly-imported
// `_resetRelocationMemory()` while the pipeline's own `exts` come from
// `loadExtensions()` has NO effect on the memory the pipeline actually
// consults. `loadExtensions()` (proxy/pipeline.mjs:39) imports every
// extension file through a CACHE-BUSTED URL (`?t=<counter>`) so hot-reload
// gets a fresh module graph on every call — which means the fresh-session-sort
// instance running inside `exts` is a DIFFERENT module instance than the one a
// plain `import` binds to, with its own separate `_relocatedByConversation`
// map. A first probe (reset only, shared scratch dir) still showed the MCP
// block re-declared on request 3; a second probe (reset + deleting the
// on-disk `*-fresh-sort-relocated.json` state) showed the SAME re-declaration
// — proving the reset call was hitting an unrelated instance, not a disk
// fallback. The fix used here: after `loadExtensions()` builds the real,
// correctly-configured (order/enabled from extensions.json) extension set,
// splice in the PLAINLY-imported instance's `onRequest` for the
// "fresh-session-sort" slot, so the exported `_resetRelocationMemory` (bound
// to that same plain import) reaches the memory the pipeline run actually
// uses. Even then, `recallMemory` falls back to `readMemory` from disk when
// RAM is empty (fresh-session-sort.mjs:267-277), so the on-disk state file
// for this conversation is deleted too — otherwise the "eviction" is RAM-only
// and the disk read silently un-evicts it. Both were confirmed necessary and
// sufficient by direct execution before this test was written: reset alone —
// still declared; reset+disk-delete on the wrong instance — still declared;
// reset+disk-delete on the right instance — declaration gone, forwarded
// message byte-identical to CC's raw send.
async function runEvictionScenario() {
  const scratch = tmpDirSync("relocate-pin-evict-");
  const saved = {
    home: process.env.CLAUDE_CONFIG_DIR,
    state: process.env.XDG_STATE_HOME,
    data: process.env.XDG_DATA_HOME,
    pin: process.env.CACHE_FIX_VOLATILE_PIN,
    ins: process.env.CACHE_FIX_INSERTION_NORMALIZE,
    xdg: process.env.CACHE_FIX_TEST_XDG,
  };
  process.env.CLAUDE_CONFIG_DIR = scratch;
  process.env.XDG_STATE_HOME = scratch;
  process.env.XDG_DATA_HOME = scratch;
  process.env.CACHE_FIX_TEST_XDG = "1";
  process.env.CACHE_FIX_VOLATILE_PIN = "1";
  process.env.CACHE_FIX_INSERTION_NORMALIZE = "1";
  try {
    let exts = await loadExtensions(EXT_DIR, EXT_CONFIG);
    const idx = exts.findIndex((e) => e.name === "fresh-session-sort");
    assert.notEqual(idx, -1, "arrange: fresh-session-sort must be in the loaded, configured extension set");
    // Keep every config-resolved field (order/enabled/_file/...) — only the
    // onRequest implementation is swapped, to the plain import's, so
    // `_resetRelocationMemory` (same import) reaches the live memory.
    exts = exts.map((e, i) => (i === idx ? { ...e, onRequest: freshSessionSortExt.onRequest } : e));

    // Defensive: this conversation must start with no leaked memory from the
    // plain import being reused (it is process-lifetime, not per-scratch).
    _resetRelocationMemory();

    const headers = { "x-session-id": "relocate-then-pin-eviction-fixture" };
    const out = [];
    for (const messages of [request1(), request2()]) {
      const ctx = { body: { messages }, headers, meta: { route: "messages" } };
      const raw = structuredClone(messages);
      await runOnRequest(ctx, exts);
      out.push({ raw, forwarded: ctx.body.messages ?? [], meta: ctx.meta });
    }

    // THE FORCED EVICTION: both halves, per the probe above.
    _resetRelocationMemory();
    const snapDir = xdgStatePath("snapshots");
    for (const name of await readdir(snapDir)) {
      if (name.endsWith("-fresh-sort-relocated.json")) await unlink(join(snapDir, name));
    }

    // Request 3: the same conversation, one turn later, and CC does not send
    // the MCP block again — it never does, on any turn after the one that
    // introduced it (module doc, "Sticky relocation memory": CC sent it
    // n=325..n=331 and stopped at n=336). message[3] keeps its plain text but
    // loses the wrapped reminder — CC has stopped injecting it — and two new
    // turns are appended. Reusing `request2()[3]` verbatim here would still
    // carry MCP_BLOCK and defeat the whole scenario: fresh-session-sort would
    // find it again by direct scan, memory or no memory.
    const request3 = () => [
      request1()[0],
      request1()[1],
      { role: "user", content: [{ type: "text", text: "A follow-up prompt." }] },
      { role: "user", content: [{ type: "text", text: "Tool output and its reminders." }] },
      { role: "assistant", content: [{ type: "text", text: "A second answer." }] },
      { role: "user", content: [{ type: "text", text: "One more follow-up, no MCP block this time." }] },
    ];
    const messages3 = request3();
    const ctx3 = { body: { messages: messages3 }, headers, meta: { route: "messages" } };
    const raw3 = structuredClone(messages3);
    await runOnRequest(ctx3, exts);
    out.push({ raw: raw3, forwarded: ctx3.body.messages ?? [], meta: ctx3.meta });

    return out;
  } finally {
    for (const [k, v] of [
      ["CLAUDE_CONFIG_DIR", saved.home], ["XDG_STATE_HOME", saved.state],
      ["XDG_DATA_HOME", saved.data], ["CACHE_FIX_VOLATILE_PIN", saved.pin],
      ["CACHE_FIX_INSERTION_NORMALIZE", saved.ins], ["CACHE_FIX_TEST_XDG", saved.xdg],
    ]) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("EVICTION — a relocation declaration evicted from memory degrades to CC's own bytes, not a stale carry-over", async () => {
  const [run1, run2, run3] = await runEvictionScenario();

  // THE INSTRUMENT-POSITIVES. Absence of the relocated block on request 3 is
  // the CORRECT outcome, which is exactly why it cannot be asserted alone —
  // a naive absence check passes just as well when the mechanism never ran.
  // So both arms are asserted: declared where CC's block was just seen
  // (request 2), and NOT declared once the memory holding that declaration
  // has been forced out (request 3) — proving the eviction really happened
  // rather than being assumed.
  assert.ok(
    (run2.meta.freshSessionSortStats?.relocatedBlocks ?? []).length > 0,
    "instrument-positive, present arm: request 2 must have DECLARED the relocated MCP block",
  );
  assert.equal(
    run3.meta.freshSessionSortStats?.relocatedBlocks?.length ?? 0, 0,
    "instrument-positive, absent arm: request 3 must show NO relocation declaration — the memory eviction "
    + "must actually have happened, not merely be assumed",
  );

  // THE INVARIANT: the degraded forward is exactly CC's own incoming bytes
  // for message 0 — no relocated block, and no stale carry-over left behind
  // by a pin whose declaration no longer exists. Compared as parsed
  // structure, not as a rendered/substring match.
  assert.deepEqual(
    run3.forwarded[0], run3.raw[0],
    "degraded form must equal CC's own incoming message 0 byte-for-byte: no relocated block, no stale pin content",
  );

  // And the conservation gate itself reports neither lost nor invented for
  // this degraded request — absence of the relocated block is the correct
  // outcome here, so the gate must be quiet about it, not flag a loss.
  const seen = new Set();
  let rows = [];
  for (const run of [run1, run2, run3]) {
    const r = conservationViolations({
      n: 0, ts: "2026-08-11T00:00:00.000Z",
      inMsgs: run.raw, outMsgs: run.forwarded,
      stats: run.meta.insertionNormalizeStats ?? null,
      freshSessionSortStats: run.meta.freshSessionSortStats ?? null,
      contentStripStats: run.meta.contentStripStats ?? null,
      smooshSplitStats: run.meta.smooshSplitStats ?? null,
      mutatedBy: [],
    }, seen);
    rows = rows.concat(r.violations);
  }
  const lost = rows.filter((r) => r.kind === "lost");
  const invented = rows.filter((r) => r.kind === "invented");
  assert.deepEqual(lost, [], "no loss on the degraded request — CC's own bytes winning is the correct outcome");
  assert.deepEqual(invented, [], "and nothing invented either");
});
