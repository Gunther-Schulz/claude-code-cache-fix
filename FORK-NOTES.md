# Fork notes (Gunther-Schulz/claude-code-cache-fix)

**Running branch: `main`** (operator convention 2026-07-27: all fork
work lands on main — main IS the deployment state; a PR branch is cut
from main only when an upstream PR actually happens). The former
long-running branches (`local/marker-anchored-diff`, then
`feature/mid-history-breakpoint-ladder` with the 2026-07-27 prevention
stack) are fully merged into main and deleted, local + fork.

Remotes: `origin` = upstream (cnighswonger), `fork` = our fork.
The systemd unit (dotfiles: bootstrap/systemd/cache-fix-proxy.service)
runs THIS clone on `main`. Pins live in dotfiles
`bootstrap/manifest.py` (CACHE_FIX_PIN / CACHE_FIX_BRANCH /
CACHE_FIX_PROXY_TREE_PIN — single declaration; doctor imports them).
After any proxy/ change on main: re-pin CACHE_FIX_PROXY_TREE_PIN via
`git rev-parse --short HEAD:proxy` (doc/test-only commits leave the
tree unchanged and need no re-pin).

## The loop — standing vision (operator, 2026-07-30)

Everything this fork builds serves one closed loop:

    SEE every bust -> ATTRIBUTE it (ours vs CC's, to bytes) ->
    MITIGATE with proof, or PARK with its named missing piece ->
    VERIFY every mitigation fidelity-safe -> RETIRE it when
    upstream fixes theirs.

Standing stances, each enforced somewhere concrete:

- Any non-operator-initiated bust is a prevention target; cost never
  gates mitigation (threat-matrix header).
- Safety outranks cache: conversation fidelity is the protected
  property, and the fidelity gate is its mechanism (directive
  flap-move-mitigation-and-fidelity-gate).
- "The tooling doesn't cover it" is never a terminal answer — a
  coverage gap in the loop is a BACKLOG item by definition, at worst
  parked with its named missing evidence. Too-bad is drift.
- Attribution starts at our own event logs (dev-loop).
- A manual investigation ends as machinery (dev-loop closing gate).
- Upstream is part of the loop: sweep the tracker when an
  investigation opens; post verified mechanisms back (operator GO
  gates posts); the fire-rate ledger is the retirement machinery.

Trajectory test at intake, for any new work here: name the loop stage
it advances (see / attribute / mitigate / verify / retire). Work that
advances none is either not this project's work, or evidence of a
missing stage — surface which.

Consumers: session intake (pointed from CLAUDE.local.md "The
method"), directive triage (threat-matrix header), the fire-rate
review.

## ⚠ Avoid restarting the proxy during a live Claude Code session

**Observed, 2026-07-27 00:15:** a restart coincided with a ~225k-token
rewrite, reported by `claude-worktime --cold` as `tools_changed` about
six seconds later.

**What that does and does not establish.** The co-occurrence is the
measurement; the mechanism is not. "The fresh process sends a different
tools array" was the working explanation at the time, but it was never
demonstrated against the wire bytes — the session-mirror and
prefix-diff gates that could have shown it postdate the observation.
Treat the mechanism as unverified.

**A restart busts SOMETIMES — three measured outcomes, 2026-07-27:**

| Restart | Tool array after | Result |
|---|---|---|
| 19:01 | `tools=match, system=match` | no bust (`cache_read` climbed 35990 → 42475 straight through) |
| 19:15 | — | no bust |
| 19:32 | `tools[Bash:schema, SendUserFile:removed, Skill/TaskList/TaskOutput/ToolSearch/Write:reordered]` | **188k bust**, 38s later, `tools_changed` |

So neither "a restart IS a bust" nor "restarts are safe now" holds.

**The proxy is not the variable — CC is.** Tool-array changes are NOT
restart-correlated: they occur throughout a session (17:11, 17:12,
17:16, 17:22, 17:33 UTC on 2026-07-27) while restarts were at 17:01,
17:15, 17:32 and 18:20. And no enabled extension can vary the array
across a restart: `sort-stabilization` sorts `body.tools` alphabetically
(`sort-stabilization.mjs:60-62`) — deterministic and stateless, so a
fresh process produces byte-identical output;
`deferred-tool-rewrite` (the only extension holding tool-order state) is
disabled in the unit; and `deferred-tools-restore` never touches
`body.tools` at all — it rewrites a system-reminder TEXT block
(`findDeferredToolsBlockInBody`, messages only, zero `body.tools`
references).

What actually varies the array is CC's own tool set: `ToolSearch`
loading deferred tools, MCP servers connecting and disconnecting,
`SendMessage` appearing when a teammate agent exists. The 19:32 bust
landed 38s after a restart because a session was resuming right then —
MCP reconnect — not because the restart reconstructed anything
differently. Correlation misread as mechanism; the proxy-side
"open defect" recorded here earlier does not exist.

Restarts stay session-boundary-only. Before attributing any bust to
one, check the prefix-diff for `tools=match`: if the tools matched, the
restart was not the cause — and if they did not, check whether CC's tool
set changed for its own reasons before blaming the restart.

(The restart-transparency work merged 2026-07-27 — persisted
serialization state in insertion-normalization and, since `7ed1886`,
the ladder; audit in docs/audits/restart-state-audit.md. The clean
restarts above are consistent with it working, but do not isolate it:
the ladder was largely budget-skipped in the observed session, so the
credit cannot be assigned to any one extension.)

**Reading `--cold` output:** `other` is the DEGRADED cause, not a
residual category — `claude-worktime.sh:1662` sets it as a default and
overwrites it only if `cache_miss_reason` is successfully read. It
means "no cause available", never "known causes tested and rejected".
Do not treat an `other` bust as evidence for any mechanism.

**`other` in the statusline does not mean the cause is unavailable.**
On 2026-07-27 a bust displayed `other` while the transcript held
`tools_changed` (49153 tok) all along. Always grep the transcript at
the busting timestamp before concluding the cause is unknown.

**One session id carries several conversations.** Subagents and CC's
background calls share the main session's id. Since `6aa85f8` the
prefix-diff keeps a separate baseline per tenant and marks
`crossTenant` when it must fall back across one; before that fix,
co-tenant traffic rendered as prefix churn and was misread as a bust
cause. A `crossTenant` record is not evidence of a bust.

Hot-reload is off (`CACHE_FIX_HOT_RELOAD`), so extension edits need a
supervisor-level restart. Batch them at session boundaries. Reading
`<key>-events.jsonl` (append-only) needs no live intervention —
never restart to investigate.

## Update-from-upstream procedure

    # Run BETWEEN sessions — the restart below busts live sessions.
    git fetch origin
    git merge origin/main            # on main (merge, not rebase —
                                     # fork main is deployed state,
                                     # published; never rewrite it)
    npm test                         # all green (1496 as of 2026-07-27).
                                     # The two long-standing "known
                                     # failures" (EADDRINUSE 9876,
                                     # lowercase no_proxy) were tests
                                     # reading ambient env they had not
                                     # set, fixed 2026-07-27 (2a1585a) —
                                     # a failure here is now real.
    systemctl --user restart cache-fix-proxy && curl -s 127.0.0.1:9801/health
    git push fork main
    # then, ONLY if proxy/ changed:
    #   git rev-parse --short HEAD:proxy → CACHE_FIX_PROXY_TREE_PIN
    #   in dotfiles bootstrap/manifest.py, commit dotfiles.

Upstream-PR plan (when ready): cut feat/<topic> from main, per-topic
slices (prefix-diff enhancements; the 2026-07-27 prevention stack:
ladder, insertion-normalization, header-propagation fix — the last
one likely first, it is the smallest and fixes a plain bug), attach
the live forensics from claude-worktime docs/cachebust-runbook.md.
The old computeSessionKey history (fc432bf) and directives under
docs/directives/ carry the evidence trail.
