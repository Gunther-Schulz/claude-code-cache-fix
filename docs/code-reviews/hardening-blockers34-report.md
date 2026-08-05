# #272 blockers 3 and 4 — implementation report

Date: 2026-07-31
Base: 94cbf82 (verified ancestor before any write)
Commits: `7b4dbf3` (blocker 3 + fold-in), `<blocker-4>` (blocker 4 + this report)
Both unpushed. Consumer: the next session preparing the #272 response, and
the dispatcher deciding the deployment boundary.

## Blocker 3 — conversation-derived writes at ambient umask

### What the reviewer asked for

Fixed once as a series-wide pattern (#272 canon content, #275 request
bodies, #280 system-prompt text are the same shape three times): explicit
owner-only modes on every conversation-derived write, hashes instead of raw
bytes where the bytes are not structurally required.

### Scope criterion

A write is conversation-derived when its payload is derived from live
traffic: message bytes, request/response bodies, system-prompt text, **or
the stable session identifiers that link a record back to a conversation**.
The identifier clause is the reviewer's own — blocker 3 names
`insertion-normalization.mjs:1076` ("telemetry logs stable session
identifiers") as part of the finding, not just the canon content. Under that
criterion every write site found qualifies, and all were converted.

### Call sites — grep-established

```
$ grep -rn "writeFile\|writeFileSync\|appendFile\|appendFileSync" proxy/extensions/
56 hits across 19 files
```

27 of the 56 are real write sites, across 18 extensions; the rest are
comments, imports, and test-seam declarations. All 27 converted:

| extension | sites | what it writes |
|---|---|---|
| insertion-normalization | 2 | canon (`entry.m` raw bytes) + events |
| prefix-diff | 2 | snapshot state + events |
| deferred-tool-rewrite | 2 | state + events |
| upstream-change-detection | 2 | baseline doc + events |
| deferred-tools-restore | 1 | tool-definition state |
| request-capture | 3 | full request bodies (the #275 case) |
| rate-limit-log | 2 | jsonl |
| usage-log | 2 | jsonl |
| upstream-error-log | 2 | jsonl |
| request-log | 1 | jsonl |
| output-guard | 1 | guard events |
| microcompact-stability | 1 | diagnostics |
| overage-warning | 1 | jsonl |
| bootstrap-defense | 1 | event log (sync) |
| session-budget-breaker | 1 | event log (sync) |
| image-retry-circuit-breaker | 1 | event log (sync) |
| workflow-agent-id-synthesis | 1 | event log (sync) |
| cache-telemetry | 1 | per-session telemetry (atomicWrite, 2 callers) |

Post-change verification that nothing was missed:

```
$ grep -rn "fs\.writeFile(\|fs\.appendFile(\|[^c]writeFileSync(\|[^c]appendFileSync(\|await appendFile(\|await writeFile(" \
    proxy/extensions/ | grep -v "write-owner-only.mjs" | grep -v "append-queue.mjs"
(no output)
```

### The helper

`proxy/extensions/write-owner-only.mjs`. No shared extension write utility
existed — `append-queue.mjs` is a write primitive but had exactly one
consumer, and `../claude-home.mjs` is a path resolver outside the extensions
directory — so the brief's assigned new home was used.

Two mechanisms, because neither covers the other's case:

1. **`mode` at create.** Node applies the `mode` option only when the write
   actually creates the file. Passing it means a new file is never, not even
   briefly, group-readable.
2. **A lazy chmod, once per path per process.** This is what fixes files
   written before the helper existed, and the rare umask that masks bits out
   of the create mode (chmod ignores umask; the `mode` option does not).
   Deliberately not a startup sweep, per the brief — a sweep would have to
   guess the file set and would touch state nobody writes again; binding the
   repair to the next write makes the repaired set exactly the live one.

**Atomic writers (tmp + rename) need only mechanism 1** and carry no chmod
call: the tmp file is always freshly created, so it is born 0600, and the
rename carries that mode onto the final path — repairing a loose mode on an
existing final file for free. Log rotation (`rename(path, path + ".1")`)
preserves mode the same way.

### Raw bytes vs hashes

- **canon `entry.m` stays**, documented at the write site. Replaying those
  bytes *is* the pinning mechanism; a hash cannot stand in for them. That is
  exactly why the file must be owner-only.
- **request-capture bodies stay** for the same structural reason — the
  corpus exists to be replayed.
- **One candidate found and NOT converted** — see gap 1 below.

### Verifier

`test/write-owner-only.test.mjs`, four bites driving the real extension
end-to-end against a real temp config root. A test double would report
whatever the double chose; the wrongness lives in the filesystem, so the
check runs at that altitude. The definition of "owner-only" is written above
the assertions, before them, so the expected value comes from the invariant
and not from the code meant to satisfy it — and it asserts **exactly** 0600
rather than "0600 or tighter", because a range assertion would pass on the
very 0664 that motivated the check.

- **Red-first**: all four failed against unmodified code, observing 420
  (0644) and 436 (0664) against expected 384 (0600) — the reviewer's
  reproduced `-rw-rw-r--`.
- **Green after**: 4/4.
- **Mutation**: deleting only the lazy chmod from the append path turns
  exactly the repair bite red and leaves the other three green. The mutation
  removes the precise condition that bite names, and the two mechanisms are
  pinned separately rather than by one overlapping assertion.

## Blocker 4 — the read-dedupe adjacency call

**Verdict: the adjacency is not load-bearing. The assertion loosens; the
order does not move. Already correct on fork-main — no code change needed.**

The reviewer saw the PR branch merged onto upstream `origin/main`, where the
test still pinned `cache-control-normalize` as read-dedupe's immediate
successor. On this fork the assertion was already generalized at **60cb337**
(the ttl-keepalive commit), independently of the insertion-normalization
work, and `node --test test/proxy-read-dedupe.test.mjs` is 42/42 green at the
base commit.

The decision derives from what the adjacency is *for*, not from what makes
the test pass:

```
$ grep -rn -i "cache-control-normalize\|cache_control\|breakpoint" proxy/extensions/read-dedupe.mjs
(no hits)
```

read-dedupe has no reference to cache-control-normalize, to `cache_control`,
or to breakpoints anywhere in its source. It rewrites duplicate `Read`
tool_result bodies and reads nothing a later breakpoint pass writes. The
adjacency was an incidental fact about the registry on the day the test was
written, never a contract. What *is* load-bearing — read-dedupe's own order
value (380) and that it is bracketed rather than at an end — is still
asserted.

Because no order moves, this stays clear of threat-matrix row 3.

The code change is therefore only the recording of the determination in the
test comment: the existing comment explained order-tolerance but never stated
that the adjacency had been checked and found non-load-bearing, which is the
deliberate call the reviewer actually asked for.

## Gaps — surfaced, not settled

1. **prefix-diff persists truncated raw message text.** `buildSnapshot()`
   (`proxy/extensions/prefix-diff.mjs:545`) stores `prefixMessages`,
   `tailMessages`, and `markerMessages` — truncated raw conversation
   content, alongside the hashes. It is the one payload found where a hash
   could plausibly replace bytes. It was **not** converted: the extension
   exists to diagnose *what* changed between requests, and a hash answers
   only *that* something changed, so the conversion trades diagnostic
   fidelity for reduced persisted sensitivity. That is a design decision
   above this tier, not a mechanical fix. 0600 covers it in the meantime.
   Not audited: whether the other payloads have byte-reducible fields — the
   pass was write-site-complete, not field-complete.

2. **`docs/directives/proxy-read-dedupe.md` does not exist.**
   `proxy/extensions/read-dedupe.mjs:3` and
   `docs/extension-impact-guide.md:276` both cite it as read-dedupe's
   directive. It is absent from `docs/directives/`. The blocker-4 verdict
   did not need it (the artifact answered the question), but a doc-vs-artifact
   gap on a shipped extension's stated rationale is worth a decision:
   write it, or drop the two references.

3. **The fold-in re-links sanitized fixture names to their capture keys.**
   As instructed, the corrected comments keep the old capture names beside
   the new ones ("captured as s-captureB" / "captured as s-captureC"). Both
   prefixes were already in this file before the change, so exposure is
   unchanged — but the pairing now provides a *mapping* from the sha-derived
   fixture token back to the real capture prefix, which is a partial undo of
   what the fixture sanitization set out to break. This is a public repo.
   Flagging for a deliberate keep-or-drop rather than acting on it.

## Deployment

Touches `proxy/**` → dotfiles pin bump (`git rev-parse --short HEAD:proxy`)
+ `systemctl --user restart cache-fix-proxy` ride the next boundary,
dispatcher-owned.

**Does not touch state KEYS or freeze logic.** 0600 is file metadata; no
key derivation, no canon shape, no freeze path changed. The restart is
cache-transparent (threat matrix row 3). No pipeline order changed either,
since blocker 4 resolved without moving read-dedupe.

After the restart the gate should run once
(`systemctl --user start cache-fix-gate`) — extension write behavior changed
even though extension *decision* behavior did not.

## Checks run

| check | result |
|---|---|
| `git merge-base --is-ancestor 94cbf82 HEAD` | BASE-OK, clean tree |
| `node --test test/write-owner-only.test.mjs` (red-first, pre-change) | 0 pass / 4 fail — 420 and 436 vs expected 384 |
| `node --test test/write-owner-only.test.mjs` (post-change) | 4 pass / 0 fail |
| mutation: lazy chmod removed | 3 pass / 1 fail — exactly the repair bite |
| `node --test` over 5 touched test files | 181 pass / 0 fail |
| full suite minus proxy-integration/proxy-wrapper (117 files) | **1843 pass / 0 fail / 0 skipped** (baseline 1839 + 4 new bites) |

## Not verified

- **No live traffic.** Every mode observation comes from temp config roots
  under `node --test`, never from the serving proxy's real `~/.claude`. The
  lazy repair of *actually existing* production files is proven by
  construction and by the repair bite, not by observation on the real
  state directory.
- **Port-bound suites** (`proxy-integration`, `proxy-wrapper`) not run, per
  the brief.
- **umask sensitivity**: all runs were at `umask 022`. The 0664 case is
  covered by the repair bite's explicit `chmod 0o664` precondition rather
  than by running the suite under a second umask.
- **`entry.m` byte-vs-hash** was accepted as structurally required from the
  brief and the code's own rationale; not independently re-derived.
