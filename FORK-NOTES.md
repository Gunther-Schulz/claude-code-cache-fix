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

## ⚠ Never restart the proxy during a live Claude Code session

A restart **is** a cache bust for every session then in flight —
measured at **225k tokens** rewritten (2026-07-27 00:15), logged by
`claude-worktime --cold` as `tools_changed` six seconds after the
restart. The tools array the fresh process sends differs from what the
old one sent, so the invalidation is real, not just downtime.
(The restart-transparency work merged 2026-07-27 — persisted
serialization state in ladder + insertion-normalization, audit in
docs/audits/restart-state-audit.md — shrinks this class; treat
restarts as session-boundary-only until a measured restart shows
clean, then relax this rule on evidence.)

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
    npm test                         # prefix-diff tests must pass;
                                     # 2 known upstream-side failures
                                     # as of 2026-07-27: EADDRINUSE
                                     # 9876 (environmental), lowercase
                                     # no_proxy launcher test
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
