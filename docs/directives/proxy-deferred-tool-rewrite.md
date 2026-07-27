# Directive: rewrite-to-deferred tool loads (class 6 → zero, feasibility-gated)

Spec contradiction on record: CC docs say deferred-tool loads append
without disturbing cache; measured 2026-07-27 12:47:56 (175k, ledger
row tools[SendMessage:added], toolsMatch:false) says otherwise on
this surface. Until upstream fixes it, the proxy can hold tools[]
byte-stable and deliver newly-loaded schemas as appended
tool_addition system-message blocks (mid-conversation tool changes,
beta mid-conversation-tool-changes-2026-07-01; requires the tool
declared with defer_loading up front).

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
