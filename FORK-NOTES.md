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

So neither "a restart IS a bust" nor "restarts are safe now" holds. The
discriminator is visible in the data: the bust happens exactly when the
fresh process fails to reconstruct the tool array byte-identically.
`deferred-tools-restore` exists to make that deterministic (it persists
first-seen order to a disk snapshot) and evidently did not hold at
19:32 — an open defect, not luck.

Restarts stay session-boundary-only. Before attributing any bust to
one, check the prefix-diff for `tools=match`: if the tools matched, the
restart was not the cause.

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
