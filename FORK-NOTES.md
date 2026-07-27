# Fork notes (Gunther-Schulz/claude-code-cache-fix)

Running branch: `local/marker-anchored-diff` — marker-anchored + tail
snapshot windows for prefix-diff (upstream's head-only diff was blind
to long-session cache busts; see the branch commit message).

Remotes: `origin` = upstream (cnighswonger), `fork` = our fork.
The systemd unit (dotfiles: bootstrap/systemd/cache-fix-proxy.service)
runs THIS clone on THIS branch. The dotfiles doctor pins branch+HEAD
(CACHE_FIX_BRANCH_PIN) — after any update, re-pin there.

## ⚠ Never restart the proxy during a live Claude Code session

A restart **is** a cache bust for every session then in flight —
measured at **225k tokens** rewritten (2026-07-27 00:15), logged by
`claude-worktime --cold` as `tools_changed` six seconds after the
restart. The tools array the fresh process sends differs from what the
old one sent (`cause=tools[Bash:schema]` in the prefix-diff line), so
the invalidation is real, not just the seconds of downtime.

Hot-reload is off (`CACHE_FIX_HOT_RELOAD`), so extension edits need a
supervisor-level restart to take effect — which means **there is no
cheap way to ship a proxy change mid-session**. Batch them and restart
at a session boundary, before starting work rather than during it. The
same applies to any config change that ships through the proxy.

The irony to remember: restarting the proxy to investigate a cache
bust creates a cache bust. Read `<key>-events.jsonl` instead — it is
append-only precisely so a post-mortem needs no live intervention.

## Update-from-upstream procedure

    # Run this BETWEEN sessions — the restart below busts live sessions.
    git fetch origin
    git rebase origin/main          # on local/marker-anchored-diff
    npm test                        # full suite; prefix-diff tests must pass
    systemctl --user restart cache-fix-proxy && curl -s 127.0.0.1:9801/health
    git push fork local/marker-anchored-diff --force-with-lease
    # then, ONLY if proxy/ actually changed:
    #   git rev-parse --short HEAD:proxy
    # and put that in CACHE_FIX_PROXY_TREE_PIN in
    # dotfiles/bootstrap/doctor.py (+ CACHE_FIX_PIN if upstream version
    # bumped), commit dotfiles. The pin is the TREE of proxy/, not the
    # commit HEAD — doc- and test-only commits leave it unchanged and
    # need no re-pin.

Upstream-PR plan: rename branch to feat/marker-anchored-diff, update
docs/directives/proxy-prefix-diff.md (still describes head-only and the
old session key), and attach live journal evidence.

The computeSessionKey issue noted here previously — hashing only
`system[0:2000]`, so short-lived subagents share buckets — turned out
to be worse than a collision problem: because the key was derived from
the system prompt, a change *inside* that window moved the key, missed
the prior snapshot, and wrote no diff and no log line at all. The bust
class the tool exists to catch was the one it could silently drop.
Fixed in `fc432bf` (key from the session-id header); see that commit
for the other three blind spots closed alongside it.
