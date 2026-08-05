# Fresh-context review brief — 2026-08-05 relocation-memory work

For a session running **fable-5**. This is a VERIFIER brief: it carries the
artifact and the question, and deliberately NOT the reasoning that produced
the claims. A verifier briefed with the author's reasoning inherits the
author's blind spots, which is the one thing this dispatch exists to avoid.

Working copy: `/home/g/dev/vendor/claude-code-cache-fix`, branch `main`.
Read-only is fine and expected; if you change anything, say so.

## The artifact

- Commit range `65d0455..e57908b` on fork main (13 commits, one day).
- The RUNNING proxy: restarted at ~17:55Z on this build.
  `curl -s 127.0.0.1:9801/health` → `proxy_tree a5ca4c18d185`.
- The sweep verdict it is stamped against: `~/.claude/cache-fix-gate-status.json`
  (run 17:56→18:13Z, 42 captures).
- Changed under `proxy/`: exactly one file, `proxy/extensions/fresh-session-sort.mjs`.
- Changed under `tools/`: `replay.mjs`, `gate-live.mjs`, `backlog-lint.mjs`,
  and a new `tools/test-config-root.mjs`.
- Docs: `docs/dev-loop.md`, `docs/audits/restart-state-audit.md`,
  `docs/directives/robustness-threat-matrix.md` (row 25), `BACKLOG.md`.

Capture aliases: this repo is PUBLIC and capture filenames carry live
session ids, so entries name captures by alias. Resolve an alias to a file
locally by joining on the timestamps quoted with each claim against
`~/.claude/cache-fix-gate-status.json`, which is machine-local. Do not write
a resolved filename into any tracked file.

## The standard

`docs/dev-loop.md` is this repo's working discipline — read it whole and judge
against it, not against general practice. Its sections on adding a check, the
three answers, never hand-rolling identity, and replaying the SERVING config
are the ones this work touches most.

## The claims under test

Each is asserted somewhere in the artifact. Attack them.

1. **Mechanism.** `fresh-session-sort` re-derived its relocated block set from
   the current request on every call, so when Claude Code stopped sending a
   relocatable `<system-reminder>`, the forwarded `messages[0]` lost it — our
   divergence at index 0 from CC's edit at index 3. `pinBlockContent` was never
   implicated.
2. **The fix.** A per-conversation memory, keyed by `resolveInsertionSessionKey`,
   serving a remembered block only when CC sends no instance of that type, with
   CC's newer bytes always winning.
3. **Persistence.** That memory survives a restart via one file per conversation
   key (tmp+rename, 0600, fail-open read, written only on change, disk bounded
   by the same cap as memory).
4. **Proven live.** Capture **s-captureAC** replayed under the pre-fix build
   (`76658d8`) produces two stability violations (n=120→123, n=254→259) and is
   clean under the shipped build; the departure census independently grades
   those same two pairs costly.
5. **Saving, bounded.** The fix prevents amplification from CC's index 3 to our
   index 0, recovering messages 0..2 — 19.7% and 62.4% of those arrays by
   bytes. The billed-token saving is explicitly NOT claimed.
6. **The restart was free.** Old vs new code with an empty state dir is
   byte-identical on 23 of 23 sampled requests of the largest live session; no
   cold-rewrite record appeared afterwards.
7. **Zero cost on the originating row.** The index-0 violation that opened the
   investigation (capture **s-captureAB**, n=331→336) cost nothing, because CC
   changed `tools[]` 11→9 and its first system block 57→62 chars in the same
   request.
8. **New instruments do what they claim.** `prefixAboveMessages` on every
   stability violation; `findRelocDepartures`; eight per-gate row arrays in the
   sweep with a cap and truncation marker; conservation F-side clause (e) for a
   declared re-serve; `--pointers` in `backlog-lint`; the config-root isolation
   plus its bypass guard.
9. **Nothing regressed.** Suite 2170/2170; the post-deploy sweep fails on the
   same two attributed captures as the pre-fix sweep and no others.

## The question

**Which of these claims does not survive contact with the artifact?**

For each one you break: the claim, the command or file:line that breaks it,
and what is actually true. For each one you confirm: say so in one line — a
confirmation with no basis is worth less than nothing here.

Then two questions the claims do not cover:

- **Is anything shipped that should not have been?** Live-serving code is the
  part that matters: `proxy/extensions/fresh-session-sort.mjs` re-serves a
  block Claude Code has stopped sending. Judge that decision, not just its
  implementation.
- **Does any new check fail the repo's own bar** — went red on a real defect,
  cannot be satisfied vacuously, does not fire on legitimate work?

## Already corrected today (stated so you do not re-find them)

These are known and fixed; they are not the answer.

- A first probe hand-rolled a tenant filter and reported 109 "boundaries" that
  were co-tenant interleaving; re-run with the imported identity it found one.
- A commit ref was attributed across a backlog entry boundary, a check was
  briefed on that false premise, and the resulting commit message was wrong;
  corrected in `0fb0d27`, and the check was dropped rather than rescued.
- The config-root isolation initially covered `npm test` only; a bare
  `node --test` still leaked into the live `~/.claude` until `578e3bb`.
- `COMMIT-DEAD` in `backlog-lint` scored 0-for-8 and was removed, not tuned.

## Output

One message. Findings first, ordered by consequence. No file writes unless a
finding requires demonstrating something, and say so if you do.
