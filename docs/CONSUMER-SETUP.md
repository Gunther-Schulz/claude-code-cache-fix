# Consumer setup — the protection set, nothing else

For running this fork purely as protection: no captures, no telemetry, no
development machinery. Install and launch mechanics are upstream's — follow
the main [README](../README.md) ("Quick Start", "Running as a service");
this page only tells you **which switches to turn on and why**.

## What it protects against

Claude Code re-sends the whole conversation every request; Anthropic bills
the unchanged part cheaply only while the bytes match exactly. Three CC
behaviors break that match and silently re-bill six-figure token counts:

1. **Old reminder blocks get re-shaped mid-history**
   ([anthropics/claude-code#76606](https://github.com/anthropics/claude-code/issues/76606),
   [#78660](https://github.com/anthropics/claude-code/issues/78660)) — an
   edit deep in the history re-bills everything after it.
2. **The tools list changes when a tool loads mid-session**
   ([#81967](https://github.com/anthropics/claude-code/issues/81967)) — the
   tools list heads the cached prefix, so one late tool load re-bills the
   entire context.
3. **Byte drift in already-sent messages** (stray whitespace, block
   re-serialization —
   [#48734](https://github.com/anthropics/claude-code/issues/48734)) — any
   2-byte wobble invalidates the whole prefix.

The extensions below hold the forwarded bytes stable across all three, and
a last-line guard makes sure no mitigation can ever corrupt a conversation:
on any structural mismatch it forwards the original untouched.

## The switches

Bake these into the service at install time (see the README's
`install-service` section — flags set at install time land in the unit):

```sh
CACHE_FIX_FORWARD_PROXY=on \
CACHE_FIX_INSERTION_NORMALIZE=1 \
CACHE_FIX_VOLATILE_PIN=1 \
CACHE_FIX_TOOL_REWRITE=1 \
CACHE_FIX_OUTPUT_GUARD=1 \
cache-fix-proxy install-service
```

| switch | what it does |
|---|---|
| `FORWARD_PROXY=on` | transport mode — Claude Code connects through the proxy with no `ANTHROPIC_BASE_URL` change |
| `INSERTION_NORMALIZE=1` | recognizes messages by content, so relocated/re-shaped history is forwarded in its first-seen form |
| `VOLATILE_PIN=1` | pins reminder blocks to their first serialization — CC's re-stamps stop reaching the wire |
| `TOOL_REWRITE=1` | freezes the tools list; late-loaded tools are announced at the tail instead of re-writing the prefix (auto-limited to models measured to support it — everywhere else it degrades to stock behavior, never an error) |
| `OUTPUT_GUARD=1` | the safety net: validates structure after all mitigations and restores the original on any violation |

Everything upstream ships enabled by default stays enabled — those handle
further stabilization (fingerprint stripping, sort stabilization, etc.).
Every switch recommended on this page runs with a recorded acceptance on
the reference deployment (a live probe before each was turned on, and a
daily replay gate over real traffic since) — this is the battle-tested
combination, not a guess.

## Optional: the diagnosis pack

The protection set above writes **nothing about your conversations to
disk**. If you ever want to answer "why did my session suddenly re-bill?"
yourself — or file a bug report with evidence instead of vibes — these
switches record what the attribution needs. Each carries a different
privacy cost; add them top-down:

| switch | what it records | privacy cost |
|---|---|---|
| `UPSTREAM_ERROR_LOG=on` | one line per non-200 upstream response: status, retry/ratelimit headers, request-id | **none** — no conversation content, errors only |
| `UPSTREAM_DETECTION=1` | structural fingerprints (hashes, counts) when CC's request SHAPE changes | none — hashes and counts, no text |
| `PREFIXDIFF=1` | which message/block/tool changed between requests — the bust-attribution journal | **text fragments** of changed blocks land on local disk |
| `REQUEST_CAPTURE=1` + `CAPTURE_MAX_MB=<cap>` | full request bodies (pre-mitigation), size-capped, local only | **full conversation content** on local disk — the complete evidence base |

With all four on, a cache bust is attributable to the exact byte that
moved; with none, the protection still works — you just can't see why
something happened.

**Deliberately NOT enabled**: `SESSION_MIRROR` and the rest of the
development machinery — verification tooling for working on the proxy
itself; a consumer needs none of it.

## How you'd notice it working

The mitigation is invisible by design — the observable is your usage:
long sessions stop hitting sudden six-figure `cache_creation` spikes on
turns where nothing big changed. If you suspect a problem, the guard's
restore events land in `~/.local/state/cache-fix/snapshots/` as
`<key>-guard-events.jsonl`; an empty or absent file is the normal
state.
