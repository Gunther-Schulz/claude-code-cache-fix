Agreed on the fixture path, and thank you for the "don't push a fix
commit yet" catch — you're right that a scrub-on-top leaves the
original blobs reachable. Plan, for your confirmation before anything
lands:

1. **We rewrite this branch** so the identifying fixture blob never
   becomes reachable from your `main` — the original fixture never
   existed in the rewritten history; only a fully sanitized
   replacement (new UUID-free filename) does. Force-push once you
   confirm.

2. **The sanitizer itself gets the fix first, on our fork.** While
   preparing follow-up branches we found two more gaps in the same
   scrubber, so the rewrite will carry a strictly stronger
   sanitization than a spot-fix would: (a) image blocks passed through
   raw — the scrubber redacted `block.data` but wire images nest
   base64 at `block.source.data`, one level down; (b) exactly the
   structural-identifier class you flagged: conversation keys,
   per-request `sid`s, wall-clock timestamps, and the session UUID in
   the filename. New scheme: content bytes and images one-way
   tokenized (`t_<sha12>_<len>` per paragraph, preserving the `"\n\n"`
   join relations the tests assert; `data_<sha10>` for binary), keys
   and sids replaced by deterministic sha-derived tokens, timestamps
   rebased to a fixed epoch keeping only intra-fixture deltas,
   filenames carrying the token instead of the UUID. Every rebuilt
   fixture is replay-verified to reproduce identical classifier
   verdicts, and a mechanical test asserts the absence classes (no
   raw base64 runs, no live timestamps, no UUIDs) so the sanitization
   claim is checked, not just stated.

On the other blockers, all accepted:

- **Blocker 2 (reminder-only byte change re-served stale):** agreed
  this is the load-bearing safety question and not patchable in the
  diff — we'll write the directive you asked for before the next
  review round. It will lead with a measurement: how often pinned
  reminder bytes actually change across matched entries in our
  capture corpus. If the answer is effectively never, the directive
  argues the evidenced allowlist; if it happens, the design is
  fail-closed re-pin (store the new bytes, honest reset of that
  boundary only). Either way the evidence rides in the directive.
- **Blocker 3 (state files at ambient umask):** agreed, and agreed
  it's a series-wide pattern — we'll fix it once as a pattern
  (explicit owner-only modes on every conversation-derived write,
  hashes instead of raw bytes where bytes aren't structurally
  required) rather than per-PR.
- **Blocker 4 (read-dedupe adjacency assertion):** will be the
  deliberate call you asked for — we'll check whether the adjacency
  is load-bearing for read-dedupe before deciding between moving the
  order and updating the assertion, and put the reasoning in the
  commit.

Nothing further lands on this branch until you've confirmed the
rewrite path in (1).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

— Claude (drafted for and approved by Gunther Schulz)
