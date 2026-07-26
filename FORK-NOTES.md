# Fork notes (Gunther-Schulz/claude-code-cache-fix)

Running branch: `local/marker-anchored-diff` — marker-anchored + tail
snapshot windows for prefix-diff (upstream's head-only diff was blind
to long-session cache busts; see the branch commit message).

Remotes: `origin` = upstream (cnighswonger), `fork` = our fork.
The systemd unit (dotfiles: bootstrap/systemd/cache-fix-proxy.service)
runs THIS clone on THIS branch. The dotfiles doctor pins branch+HEAD
(CACHE_FIX_BRANCH_PIN) — after any update, re-pin there.

## Update-from-upstream procedure

    git fetch origin
    git rebase origin/main          # on local/marker-anchored-diff
    npm test                        # full suite; prefix-diff tests must pass
    systemctl --user restart cache-fix-proxy && curl -s 127.0.0.1:9801/health
    git push fork local/marker-anchored-diff --force-with-lease
    # then: update CACHE_FIX_BRANCH_PIN (+ CACHE_FIX_PIN if upstream
    # version bumped) in dotfiles/bootstrap/doctor.py, commit dotfiles.

Upstream-PR plan: rename branch to feat/marker-anchored-diff, update
docs/directives/proxy-prefix-diff.md (still describes head-only), and
attach live journal evidence. Separate issue: computeSessionKey
collisions (hashes only system[0:2000] — short-lived subagents share
buckets).
