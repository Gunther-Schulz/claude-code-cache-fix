# Fork notes (Gunther-Schulz/claude-code-cache-fix)

**Running branch: `main`** (operator convention 2026-07-27: all fork
work lands on main — main IS the deployment state; a PR branch is cut
from main only when an upstream PR actually happens). The former
long-running branches (`local/marker-anchored-diff`, then
`feature/mid-history-breakpoint-ladder` with the 2026-07-27 prevention
stack) are fully merged into main and deleted, local + fork.

Remotes (as of 2026-07-31): `origin` = our fork (Gunther-Schulz),
`upstream` = cnighswonger. (An earlier note here had them reversed —
verify with `git remote -v`, not this file.)
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

Per EVENT, not only per work item: every threshold bust walks the
loop to a terminal disposition — mitigated, parked with its named
missing piece, controlled-cause, or upstream-filed — recorded in the
threat matrix. An investigation that ends at "interesting" has not
ended; a bust means something every time, and the walk from seeing
it to its disposition is the unit of done.

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
supervisor-level restart. Restarts are cache-transparent (matrix
row 3; measured 2026-07-31, `verdict-ab --seed-from-a` IDENTICAL over
old-canon state) UNLESS the change touches state KEYS or freeze
logic — such a change states its row-3 declaration before the
restart. Reading `<key>-events.jsonl` (append-only) needs no live
intervention — never restart to investigate.

## Where this fork's own state lives — and why the READMEs do NOT say so

**This fork writes its data and state under XDG paths; upstream writes under
`~/.claude`.** Resolver: `proxy/xdg-dirs.mjs`, `resolveRoot(kind, {platform,
env, home})`. Order per root: explicit `CACHE_FIX_DATA_DIR` /
`CACHE_FIX_STATE_DIR`, then `XDG_DATA_HOME` / `XDG_STATE_HOME` (honoured on
every platform), then the platform default — Linux `~/.local/share|state`,
darwin `Library/Application Support` | `Library/Logs`, win32 `%LOCALAPPDATA%`.
On Linux with `XDG_*` unset the paths are byte-identical to what this fork used
before the platform work, which is why that change needed no migration
(`8ba8c0d`).

**The three READMEs are UPSTREAM's and are deliberately left describing
upstream's behaviour.** On 2026-08-08 two fork commits (`ddcdca3`, `332df4a`)
patched `README.md` and `README.zh.md` to describe our XDG paths while
`README.ko.md` was never touched — leaving three translations of one document
disagreeing about the same software, and the English and Chinese ones
disagreeing with THEMSELVES (29 new-path claims beside 22 old-path ones in
`README.md`). Both patches were reverted to their pre-patch state, restoring
exactly our own edits and pulling in no upstream drift (verified: no merge
touched those files after the patches, so `ddcdca3^` is the precise base).

Reverted rather than completed, for reasons that outlive this instance:
- The READMEs are upstream's user-facing docs and are not on this file's
  fork-only list, so fork behaviour does not belong in them — the same rule
  that keeps fork content out of PR slices.
- Upstream's `~/.claude` claims are TRUE OF UPSTREAM. Their convention is
  stated in their own source (`session-mirror-writer.mjs:8-9`, byte-identical
  here) and implemented in it (`cache-telemetry.mjs:16` calls
  `join(claudeHome(), …)`). Patching their docs made English and Chinese wrong
  about upstream while only half-right about us.
- Finishing the migration would have meant editing Korean and Chinese prose
  nobody here can review, and tripling the merge-conflict surface on the most
  frequently merged files while this fork sits 27 commits behind.
- If the XDG work ever goes upstream, the doc updates ride WITH that PR, in all
  three languages, through upstream's own translation process.

So: **this section is the carrier for the divergence.** Anyone reading the
fork's README gets upstream's paths; the fork's real layout is here. If that
trade ever stops being right — i.e. if people actually install from this fork
rather than it being the operator's deployment plus a PR staging ground — the
answer changes to finishing the migration properly and accepting the conflicts,
and that is the discriminator to re-check, not the tidiness of the docs.

## Update-from-upstream procedure

    # Restart timing is free: restarts are cache-transparent (row 3,
    # measured — see above) unless the merged change touches state
    # keys or freeze logic, which states its declaration first.
    # (The old "busts live sessions" caution predated the freeze
    # logic and was removed on operator ruling 2026-07-31.)
    # CORRECTED 2026-08-06. This block read `git fetch origin` /
    # `git merge origin/main` / `git push fork main` — all three wrong
    # since the remotes were renamed: origin IS our fork, so the merge
    # was a no-op against ourselves and the push named a remote that
    # does not exist. Verified with `git remote -v`, which is what the
    # warning three paragraphs above this one already told the reader
    # to trust over the prose — and the prose it was warning about was
    # this block. A caution about a class does not repair an instance.
    git fetch upstream
    git merge upstream/main          # on main (merge, not rebase —
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
    git push origin main             # origin IS the fork — see above
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
