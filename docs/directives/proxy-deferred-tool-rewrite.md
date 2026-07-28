# Directive: rewrite-to-deferred tool loads (class 6 → zero, feasibility-gated)

Spec conflict on record — but the evidence is weaker than first
written, and the directive should not be read as resting on it. CC
docs say deferred-tool loads append without disturbing cache. The
2026-07-27 12:47:56 event (175k) was taken as contradicting that, on
the ledger row `tools[SendMessage:added], toolsMatch:false`.
Re-reading the FULL row: the same request also carries
`messages@165(user)`, and the tools delta reorders five existing
entries (`SendUserFile, Skill, ToolSearch, Workflow, Write`) rather
than being a pure addition. Two candidate causes, and the event fails
Phase A's own "⊃ previous, no schema change" precondition below — so
it cannot serve as proof of the contradiction. Status: OPEN, pending
an event with a tools-only delta and no message divergence in the
same request.

The mechanism stands on its own regardless: a tools[] change
invalidates from the front, so holding tools[] byte-stable is worth
building whether or not the CC doc is wrong. Until upstream settles
it, the proxy can hold tools[] byte-stable and deliver newly-loaded
schemas as appended tool_addition system-message blocks
(mid-conversation tool changes, beta
mid-conversation-tool-changes-2026-07-01; requires the tool declared
with defer_loading up front).

Phase A (build now, env-gated CACHE_FIX_TOOL_REWRITE=1, default off):
- Detect: incoming tools[] ⊃ previous tools[] (pure addition, no
  schema change to existing entries) → rewrite: forward previous
  tools[] + new tools marked defer_loading:true + append
  tool_addition block per new tool as a system-role message at the
  tail; record mapping persisted per session.
- Any non-additive tools[] change → passthrough + reset (honest).
- Unit tests with recorded shapes; fixture from the 12:47:56 ledger
  (synthetic, minimal).
Phase B (live validation, session boundary): one real session with
the flag on; verify the API accepts the rewrite on the OAuth
surface and the model uses the added tool (a 400 or tool-misuse →
flag off, file findings). NOT part of this build.
Risk note: beta header + block shapes must match the API's current
mid-conversation-tool-changes contract; if the surface rejects the
beta for subscription auth, Phase A stays dark and the preload
list (behavioral) remains the mitigation.

---

## Phase B addendum (2026-07-28) — documented wire shapes + persistent re-injection

Status: APPROVED (operator). The three Phase-A blockers have resolved:
header plumbing fixed in `10d33e4`; the wire contract for
`mid-conversation-tool-changes-2026-07-01` is now DOCUMENTED (no
live 400-probe needed to discover shapes); validation runs through the
replay harness (proxy-request-capture-replay.md) with one final live
acceptance probe.

### The documented contract (replaces Phase A's placeholders)

1. A deferred tool is declared in `tools[]` with `"defer_loading": true`
   — Phase A already does this.
2. The announcement is NOT a text block on top-level `system`. It is a
   content block on a system-ROLE MESSAGE appended to `messages[]`:

       {"role": "system", "content": [
         {"type": "tool_addition",
          "tool": {"type": "tool_reference", "name": "<tool name>"}}]}

   Phase A's pseudo-XML text block appended to `body.system` is wrong
   twice over: wrong shape, and — decisively — wrong LOCATION. Top-level
   system sits at the front of the cache prefix; every injection there
   busts the whole cache, defeating the extension's purpose. The
   documented placement (after the conversation history) is what
   preserves the prefix.
3. Placement constraints: a mid-conversation system message must follow
   a user message and be either last in `messages[]` or followed by an
   assistant turn. At injection time the request tail is a user turn
   (satisfied); on later requests the assistant reply follows it
   (satisfied).

### The statelessness problem and its solution

The API is stateless: a deferred tool is loaded only when its
tool_addition block is present in THAT request. CC never sees our
injected message, so it never echoes it back — the proxy must therefore
re-apply BOTH halves on every subsequent request:

- `tools[]` stays held at first-seen order with every added tool
  permanently marked `defer_loading: true` (byte-stable forever — this
  is the entire point);
- the tool_addition system message is re-injected at a STABLE position,
  byte-identical, from persisted state.

**Anchoring:** each persisted addition records the identity hash
(hashMessageContent, the ladder/canon idiom) of the message it was
injected after — the request's last message at addition time. On every
request, find the anchor by hash and splice the persisted message
immediately after it. The anchor is deep history within a turn or two,
so its position is stable and the injected bytes never move relative to
the prefix. If the anchor vanishes (context-management prune):
re-anchor after the latest user message, update state, emit telemetry
(`reanchored`) — one honest partial re-cache, never a malformed
request.

**Isolation from insertion-normalization is free, by pipeline order:**
the rewrite runs at 425, after insertion-normalization (395). The
injected message exists only downstream of 425 — the canonical never
sees it, phase-2/3 classification is untouched, and prefix-diff
(~1000) sees a stable stream so long as injection is byte-stable.

**Beta token** is added whenever any deferred tool or injected message
is present in the outgoing request — i.e. on every request after the
first addition, not just the first.

### State schema (extends the existing canon file)

    { tools: [...],                       // unchanged: first-seen order
      additions: [{ name, anchorHash, message }] }
                                          // message = the exact injected
                                          // system message, byte-frozen

Old state files without `additions` read as additions=[] (no
migration; existing sessions simply have no pending injections).

### Validation gate (blocking, same discipline as phase 3)

1. Unit: documented shapes exact; sequence test — request N adds a
   tool, requests N+1..N+3 produce byte-identical tools[] and an
   injection at the same anchor; anchor-prune → re-anchor once;
   schema-change → reset (unchanged from Phase A); output-guard active
   throughout.
2. Replay: class-matrix corpora + a tools-addition corpus, flag A/B —
   flag off byte-identical to today; flag on shows exactly the
   documented mutations and nothing else.
3. Live acceptance probe (the ONLY live step): one real request
   through the proxy with the flag on at a session boundary — watch
   for 400 vs the model using the added tool. Then, and only then,
   the service unit flag.
