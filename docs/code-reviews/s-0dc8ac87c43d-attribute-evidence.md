# s-0dc8ac87c43d ATTRIBUTE step -- evidence

Capture frozen at /tmp/claude-1000/s-0dc8ac87c43d-work/frozen-requests.jsonl
(copied before any analysis; source mtime 2026-07-31 13:08:17 +0200, size
734427500 bytes, unchanged in both mtime and size when rechecked after the
full run -- not growing during this session).

Tools used: `node tools/replay.mjs <frozen capture> --gates-from-capture
--census --json` (real boot gates from the capture's own boot record, not
--env guesses) for the corpus-wide violations/attribution pass; two small
single-use probe scripts under /tmp (dtr-telemetry.mjs, dtr-content-probe.mjs)
that import the repo's own proxy/pipeline.mjs + proxy/extensions read-only
and run the real pipeline over the frozen capture (CLAUDE_CONFIG_DIR pointed
at /tmp scratch dirs only) to surface `ctx.meta.deferredToolRewriteStats`,
which replay.mjs's own JSON output does not carry (its compact stability
entries only retain insertion-normalization's action/resetReason).

## 1. Per-request deferred-tool-rewrite telemetry

n=701 (15-tool conversation, subagent/sidecar tenant thread -- ReportFindings,
ScheduleWakeup, SendUserFile, TaskList, TaskOutput present):
  action=rewrite, newNames=[], heldNames=[], injected=2, reanchored=0.

n=709 (11-tool conversation, main thread -- Monitor/SendMessage present):
  action=rewrite, newNames=[], heldNames=[], injected=2, reanchored=0.

n=710 (same 11-tool conversation, immediately after n=709):
  action=reset, reason="tool-schema-changed", injected=0, reanchored=0.
  A tool present in BOTH the prior known set and the incoming set had a
  DIFFERENT toolFingerprint than what was persisted as canon -- the
  extension's one designed "honest reset" branch: passthrough of CC's own
  tools[] untouched, `additions` wiped to [], canon re-baselined.

n=718 (15-tool conversation, same tenant as n=701, arriving after it):
  action=reset, reason="tool-schema-changed", injected=0, reanchored=0.
  Identical decision shape to n=710, on the sibling tenant.

## 2. First divergence, characterized (content class only, no raw bytes)

Pair n=709->710, outDiv=236:
  n=709 output[236]: role=system, content = ONE tool_addition block
  (byteLength 104) -- sits between a user tool_result+text message (idx
  235) and an assistant thinking+text+tool_use message (idx 237, hash
  95f1cc2db587).
  n=710 output[236]: role=assistant, thinking+text+tool_use, hash
  95f1cc2db587 -- the EXACT message that sat at index 237 in n=709's
  output. The tool_addition message is simply absent; everything after it
  shifted one slot earlier.
  CC's own raw message at index 236 is identical across the pair (hash
  95f1cc2db587 both times) -- ccIdenticalAtOutDiv: true.

Pair n=701->718, outDiv=82:
  n=701 output[82]: role=system, content = TWO tool_addition blocks in one
  message (byteLength 183) -- sits between a user message with two
  tool_results+text (idx 81, hash c8580da8d905) and a system string-content
  message (idx 83, byteLength 403, hash 20fb65efa7ba).
  n=718 output[82]: role=system, content = a bare string (byteLength 403,
  hash 20fb65efa7ba) -- the EXACT message that sat at index 83 in n=701's
  output. Again the tool_addition message is gone, everything shifted one
  slot earlier.
  CC's own raw message at index 82 is identical across the pair (hash
  c8580da8d905 both times) -- ccIdenticalAtOutDiv: true.

## 3. Coincidence with a deferred-tool-rewrite decision

Both divergences coincide EXACTLY with the extension's own onRequest logic:
`let additions = result.action === "reset" ? [] : (prior?.additions ?? [])`
(proxy/extensions/deferred-tool-rewrite.mjs). On a "reset" (tool-schema-
changed), the pending `additions` list -- the previously-injected
tool_addition announcement message(s) -- is unconditionally emptied. Since
CC never echoes our injected message back (stateless contract stated in
the file's own header), CC's history is untouched, but our forwarded array
loses a message it carried one request earlier. This is neither a
new-tool announcement nor an anchor/re-anchor event (reanchored=0 in both
telemetry records) -- it is the reset branch itself removing an existing
injection. Both pairs hit the identical mechanism on two different
conversation sub-keys (11-tool main thread; 15-tool sidecar thread) of the
same session id.

## 4. Exemption / instrument condition

Failing check: `findStabilityViolations` / `scanGroup` in tools/replay.mjs.
Failing predicate: `outDiv !== null && outDiv < bar`, where
`bar = inDiv === null ? Infinity : inDiv`. For both pairs inDiv is NOT
null (376 for the n=709->710 pair, 365 for n=701->718 -- CC's own history
also diverges somewhere in each, unrelated to these indices), so bar =
376 / 365 respectively, and outDiv (236 / 82) < bar in both cases ->
violation.
The corpus's only currently-declared exemption
(`freshSessionSortExemption`, keyed on `cur.freshSessionSortStats.
targetIndex === outDiv` with a first-appearance relocation) does NOT
apply: `freshSessionSortStats` is `null` on n=710 and n=718 (confirmed
directly). So these two pairs are unexempted TRUE violations under the
check's current definition -- they do not near-miss the fresh-session-sort
exemption, they belong to a different, currently-undeclared cause
(deferred-tool-rewrite's reset-wipes-additions branch).
Corpus-wide run: violations=2 (exactly these two), exemptions=0,
gateSource="10 of 10 declared set" (replay ran under the capture's real
boot gates, not defaults).
Both violations' `attribution.ext` = "deferred-tool-rewrite" via
replay.mjs's own bisection (replay the corpus through pipeline prefixes of
increasing length; first prefix where the pair's output divergence drops
below the bar). This is instrument output, not my inference.

## 5. Capture liveness

- mtime at first read (before copy): 2026-07-31 13:08:17.707388835 +0200
- size at first read: 734427500 bytes
- mtime/size rechecked ~7 minutes later (after full replay + both probes
  completed): identical (734427500 bytes, same mtime) -- the file did not
  grow during this session's work. This does not by itself prove the
  owning session is closed (an idle-but-open session would look the same
  over a 7-minute window).
- Frozen copy's trailing bytes end in a proper `\n` (no torn final line).

## Raw artifacts (all under /tmp/claude-1000/s-0dc8ac87c43d-work/)
- frozen-requests.jsonl -- the frozen copy (734427500 bytes)
- replay-out.json -- full `replay.mjs --gates-from-capture --census --json` output
- replay-err.log -- its stderr (upstream-change / prefix-diff telemetry lines)
- dtr-telemetry.mjs, dtr-out.json -- deferred-tool-rewrite stats probe (n=700,701,708,709,710,717,718)
- dtr-content-probe.mjs, content-out.json -- message-class-at-index probe (n=709:236, 710:236, 701:82, 718:82)
