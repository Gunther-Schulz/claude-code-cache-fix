# Blocker 2 (#272): how often do pinned volatile bytes actually CHANGE?

Measurement for the BACKLOG item *"READY-for-design — #272 blocker 2: a
reminder-only BYTE change is re-served stale"*. The directive is written
separately; this file is the number it rests on.

## The question, and why it decides the design

`insertion-normalization` pins a matched user message to its FIRST-SEEN bytes,
and pin-mode identity deliberately EXCLUDES volatile `<system-reminder>` blocks
from the hash (`hashPinnedIdentity`, `insertion-normalization.mjs:414`). That
exclusion IS the flip-absorption mechanism — and it is also why the extension
cannot distinguish:

- CC **re-serializing** a reminder → the pin restores first-seen bytes, correct;
- CC **changing** a reminder's bytes → the pin forwards STALE bytes, and the
  model is shown text CC replaced. The upstream reviewer reproduced exactly
  this (an in-place OLD→NEW text change overridden with the pinned bytes).

Measured-never routes to the evidenced allowlist the reviewer offered;
measured-real routes to a fail-closed re-pin. So the corpus was asked.

## Headline

**Zero in-place reminder text changes across the whole corpus.** Every CHANGED
comparison is a reminder being REMOVED, never one whose text was replaced:

| class | comparisons | distinct pinned entries |
|---|---|---|
| IDENTICAL — bytes unchanged | 11 566 (49.58 %) | — |
| RESERIALIZED — same texts, re-wrapped/re-split/re-joined | **0** | — |
| CHANGED — the information differs | 11 762 (50.42 %) | **81** |
| &nbsp;&nbsp;· VANISHED — every reminder gone | 11 478 | 80 |
| &nbsp;&nbsp;· REDUCED — a subset of first-seen survives | 284 | 1 |
| &nbsp;&nbsp;· **IN-PLACE-TEXT — a reminder's text REPLACED** | **0** | **0** |
| &nbsp;&nbsp;· APPEARED — first-seen had none, this one does | 0 | 0 |
| &nbsp;&nbsp;· AUGMENTED — first-seen's texts survive, more added | 0 | 0 |

Denominator: 23 328 matched comparisons where the pin rewrites bytes at all,
drawn from 947 282 pinned re-occurrences (the rest are messages with no
volatile region on either side, which the pin passes through untouched).

Two numbers, deliberately: an entry whose region changes once and then HOLDS
diverges on every later request, so **comparisons measure staleness** (11 762
requests were served a stale volatile region) while **entries measure
reminders** (81 reminders ever changed). The REDUCED row is one single entry
seen 284 times.

`cacheControlExempt`: **0** of the 11 762 CHANGED comparisons sit on a message
carrying a `cache_control` marker, which `pinnedForwardForm` never rewrites —
so the exemption removes none of them.

## What this means for the design

The reviewer's reproduction is real as a *capability* but has **no instance in
four days of production traffic**. What the pin actually suppresses is
*removal*, not *contradiction*:

- **VANISHED (80 entries)** — CC sheds a reminder it had attached to a settled
  message; the pin keeps serving it. The model re-reads something it already
  consumed. This is the documented, accepted flip the pin exists to absorb.
- **REDUCED (1 entry)** — same phenomenon, partial: a message that first
  carried two reminders later carries one. Inspected at the bytes (capture
  `dc3f8071`, line 286, msg 210): the surviving block is a 329-char reminder
  whose first line is *"The user sent a new message while you were working:"*;
  the region went 1116 → 361 characters. A shed sibling, not a rewrite.

**No measured case exists in which the pin states something CC has contradicted.**
That is the fact the directive turns on; it is a measurement of this corpus, not
a proof about CC, and the "could not decide" section below bounds it.

## The zero is a measurement, not a tautology

A zero is worthless if the phenomenon were impossible by construction, so that
was probed to DISPROVE the finding before it was reported. If every reminder
kind carried exactly one fixed text, an in-place change could never occur and
the zero would say nothing.

It does not. Across the corpus (`probe-reminder-variance.mjs`, scratch):

- **119 distinct reminder texts** in **10 distinct kinds** (keyed by first line);
- **5 of the 10 kinds carry MORE than one distinct text** — one kind has **75**
  distinct texts, another **32**, then 3, 2 and 2;
- only 5 kinds are single-texted.

So CC's reminder text is strongly dynamic *within a kind*. The variation lives
across DIFFERENT messages (reminders are injected at the live edge and then
either persist or are shed), not within one settled message — which is exactly
the shape the measurement reports. The zero is informative.

## Coverage — what this verdict does and does not cover

```
reminder-migration census — read 36/36 capture(s), 0 UNREADABLE, 24 with pairs,
54 TORN line(s) skipped, 196 conversation(s), 11074 same-conversation pair(s)
```

- **Captures**: 36 of 36 read, **0 unreadable**, 7.1 GB, `~/.claude/cache-fix-captures/`.
- **Date range**: earliest record `2026-07-28T11:15:27Z`, latest capture write
  `2026-08-01T08:29Z` — four days.
- **Line accounting** (all 23 257 lines classified, none unexplained):
  12 120 request records · 11 025 `type=outcome` · 58 `type=boot` · **54 torn**.
- **The 54 torn lines are the one read gap.** They arrive in PAIRS — a record cut
  mid-JSON followed by its remainder — i.e. torn appends by the capture writer,
  so ≈27 request records, **0.22 %** of requests. All 54 sit in two captures
  (`633915a8`: 44, `dc3f8071`: 10). The census swallowed these silently before
  this change (`catch { continue; }`); it now counts them and prints them in the
  coverage line, because an absence of coverage reported as nothing is the
  three-answer violation this tool's own header was written about.
- **CC version spread: not answerable from this corpus.** The capture format
  records only two headers (`anthropic-beta`, `session-id`); no user-agent or
  client-version field is captured, so version cannot be attributed to any row.
  Stated rather than omitted.
- **The corpus is LIVE.** Captures are appended to while the sweep runs (this
  machine's own sessions included). Three runs during this work returned
  11 027 / 11 074 pairs and 75 / 81 distinct changed entries as the corpus grew.
  All numbers here are from the final run, **2026-08-01 10:38–10:39 (+02:00)**.
  The qualitative result — `IN-PLACE-TEXT = 0` — held identically across all
  three runs.

### The superset framing (conservative in the safety direction)

This sweep **ignores canonical-state resets**. The live extension drops its
canonical on a reset and re-establishes first-seen bytes; the sweep keeps one
first-seen form per identity for the whole capture. It therefore counts a
**SUPERSET** of the comparisons the live pin actually performs: every stale
forward the pin really made is in here, plus some the pin never made because it
had reset in between. It can only over-report change, never under-report it.

One boundary runs the other way and is named for honesty rather than found in
the data: first-seen is scoped **per capture file**, so a conversation spanning
two captures restarts its baseline. That can only lose comparisons, and no
CHANGED row sits at a capture boundary.

## What the classification could NOT decide

- **Nothing was left unclassified.** Every comparison landed in exactly one of
  IDENTICAL / RESERIALIZED / CHANGED, and every CHANGED in exactly one kind
  (asserted by a totality test in `test/census-volatile-change.test.mjs`).
  `volatileTruncated` is `{}` — no detail row was dropped by the memory cap.
- **Out of scope by construction, and NOT measured here**: whether a reminder's
  text changes at a message whose *pinned identity does not match*. That is an
  honest reset, not a stale forward, so it carries no fidelity risk — but it
  also means this file says nothing about how often CC rewrites reminder text
  in general, only about how often it does so **where the pin would override it**.
- **The migrated-standalone leg is not RESERIALIZED here.** When CC strips a
  wrapper *in place*, the block stops satisfying `isVolatileBlock` and becomes
  part of the message's IDENTITY — the entry no longer matches and the extension
  resets honestly. When CC moves the text to a *different* message, this
  message's region goes empty and the row is VANISHED. So `RESERIALIZED = 0` is
  expected structurally, not a surprise: re-serialization inside a still-pinned
  region (re-wrap, re-split, empty-block flip) simply does not occur in this
  corpus.

## Per capture

| capture | matched | IDENTICAL | RESERIALIZED | CHANGED | kinds |
|---|---|---|---|---|---|
| `633915a8` | 7612 | 2453 | 0 | 5159 | 5159 VANISHED |
| `7749d7fc` | 3996 | 1955 | 0 | 2041 | 2041 VANISHED |
| `0d6f38ba` | 2297 | 970 | 0 | 1327 | 1327 VANISHED |
| `dc3f8071` | 1524 | 627 | 0 | 897 | 284 REDUCED, 613 VANISHED |
| `adf6cadb` | 2316 | 1613 | 0 | 703 | 703 VANISHED |
| `77fe2779` | 1028 | 458 | 0 | 570 | 570 VANISHED |
| `f94e53ce` | 1778 | 1337 | 0 | 441 | 441 VANISHED |
| `78b3e7fe` | 463 | 251 | 0 | 212 | 212 VANISHED |
| `b6952ffc` | 397 | 189 | 0 | 208 | 208 VANISHED |
| `d06b9ff1` | 244 | 173 | 0 | 71 | 71 VANISHED |
| `9f9d8a9d` | 312 | 247 | 0 | 65 | 65 VANISHED |
| `2cd640f8` | 203 | 170 | 0 | 33 | 33 VANISHED |
| `64802bc6` | 157 | 139 | 0 | 18 | 18 VANISHED |
| `cbc27f3c` | 579 | 568 | 0 | 11 | 11 VANISHED |
| `e703682f` | 97 | 91 | 0 | 6 | 6 VANISHED |
| `51c8511a` | 167 | 167 | 0 | 0 | — |
| `f3db21fa` | 102 | 102 | 0 | 0 | — |
| `37e1a3fa` | 17 | 17 | 0 | 0 | — |
| `f86c7752` | 16 | 16 | 0 | 0 | — |
| `2b846d33` | 11 | 11 | 0 | 0 | — |
| `166894ea` | 9 | 9 | 0 | 0 | — |
| `7a35a44b` | 6 | 6 | 0 | 0 | — |
| `67e7a16b` | 5 | 5 | 0 | 0 | — |

## Every CHANGED entry (all 81, one row per distinct pinned entry)

Captures are named by their session-id prefix; `line` resolves with `sed -n '<N>p'`
on `~/.claude/cache-fix-captures/s-<sid>-*.jsonl`. No reminder text appears in any
row — lengths and offsets only (corpus hygiene).

| kind | capture | conv | first request | msg | identity | first-seen -> now | requests served stale |
|---|---|---|---|---|---|---|---|
| REDUCED | `dc3f8071` | `ab9d86b0ab5769b2` | line 286 (req #128) | 210 | `v:982c055ac56c5071` | 1116 -> 361 ch | 284 (through line 1407) |
| VANISHED | `0d6f38ba` | `4e261428201541e6` | line 124 (req #52) | 72 | `v:b07c42e92c978db4` | 758 -> 2 ch | 230 (through line 1776) |
| VANISHED | `0d6f38ba` | `4e261428201541e6` | line 194 (req #72) | 85 | `v:3dccdba865d32c7c` | 1517 -> 2 ch | 209 (through line 1776) |
| VANISHED | `0d6f38ba` | `4e261428201541e6` | line 194 (req #72) | 90 | `v:b4a5bb17efee933d` | 769 -> 2 ch | 209 (through line 1776) |
| VANISHED | `0d6f38ba` | `4e261428201541e6` | line 194 (req #72) | 93 | `v:6196993de647051b` | 769 -> 2 ch | 209 (through line 1776) |
| VANISHED | `0d6f38ba` | `4e261428201541e6` | line 614 (req #137) | 203 | `v:62c3f328fb1ab5e3` | 758 -> 2 ch | 145 (through line 1776) |
| VANISHED | `0d6f38ba` | `4e261428201541e6` | line 614 (req #137) | 206 | `v:2c279a863752f7a3` | 758 -> 2 ch | 145 (through line 1776) |
| VANISHED | `0d6f38ba` | `4e261428201541e6` | line 868 (req #175) | 274 | `v:15b087a165bb2dbf` | 758 -> 2 ch | 107 (through line 1776) |
| VANISHED | `0d6f38ba` | `4e261428201541e6` | line 1260 (req #233) | 351 | `v:6baa1651df401a26` | 758 -> 2 ch | 49 (through line 1776) |
| VANISHED | `0d6f38ba` | `4e261428201541e6` | line 1633 (req #258) | 407 | `v:ebe9aafeb1539601` | 758 -> 2 ch | 24 (through line 1776) |
| VANISHED | `2cd640f8` | `12435c81782861ce` | line 282 (req #100) | 171 | `v:39970c91ed64586f` | 758 -> 2 ch | 33 (through line 352) |
| VANISHED | `633915a8` | `0d9e9d2a25bc57c6` | line 54 (req #23) | 30 | `v:cb69f59788a7393b` | 608 -> 2 ch | 412 (through line 1541) |
| VANISHED | `633915a8` | `0d9e9d2a25bc57c6` | line 196 (req #90) | 155 | `v:c6d392fe415c660b` | 583 -> 2 ch | 344 (through line 1541) |
| VANISHED | `633915a8` | `0d9e9d2a25bc57c6` | line 370 (req #166) | 224 | `v:5c29f08d796242ff` | 758 -> 2 ch | 265 (through line 1541) |
| VANISHED | `633915a8` | `0d9e9d2a25bc57c6` | line 393 (req #173) | 231 | `v:b4b1b536dd60c26a` | 758 -> 2 ch | 259 (through line 1541) |
| VANISHED | `633915a8` | `0d9e9d2a25bc57c6` | line 425 (req #184) | 238 | `v:66f79b485cb7b5f2` | 758 -> 2 ch | 248 (through line 1541) |
| VANISHED | `633915a8` | `0d9e9d2a25bc57c6` | line 538 (req #221) | 267 | `v:21e37c90c4113b77` | 1517 -> 2 ch | 212 (through line 1541) |
| VANISHED | `633915a8` | `0d9e9d2a25bc57c6` | line 749 (req #250) | 289 | `v:08e3a40f2efb66cd` | 758 -> 2 ch | 185 (through line 1541) |
| VANISHED | `633915a8` | `0d9e9d2a25bc57c6` | line 1033 (req #315) | 379 | `v:e88f5d6dbb89d047` | 758 -> 2 ch | 120 (through line 1541) |
| VANISHED | `633915a8` | `0d9e9d2a25bc57c6` | line 1197 (req #347) | 418 | `v:d55d147aced855da` | 1517 -> 2 ch | 88 (through line 1541) |
| VANISHED | `633915a8` | `0d9e9d2a25bc57c6` | line 1353 (req #376) | 465 | `v:6897cd65d105cb63` | 758 -> 2 ch | 58 (through line 1541) |
| VANISHED | `633915a8` | `c3f8e590e14fb746` | line 1903 (req #138) | 251 | `v:474e09d5c0e98edb` | 1517 -> 2 ch | 508 (through line 4799) |
| VANISHED | `633915a8` | `c3f8e590e14fb746` | line 2168 (req #195) | 346 | `v:42eca728e0055ba4` | 758 -> 2 ch | 451 (through line 4799) |
| VANISHED | `633915a8` | `c3f8e590e14fb746` | line 2316 (req #220) | 401 | `v:3534c5ea4476ece9` | 1517 -> 2 ch | 426 (through line 4799) |
| VANISHED | `633915a8` | `c3f8e590e14fb746` | line 2882 (req #344) | 638 | `v:b9a67591ac875474` | 1517 -> 2 ch | 302 (through line 4799) |
| VANISHED | `633915a8` | `c3f8e590e14fb746` | line 2882 (req #344) | 641 | `v:9602950dbc4644ee` | 758 -> 2 ch | 302 (through line 4799) |
| VANISHED | `633915a8` | `c3f8e590e14fb746` | line 3085 (req #354) | 659 | `v:ea51918689eefb4e` | 2276 -> 2 ch | 292 (through line 4799) |
| VANISHED | `633915a8` | `c3f8e590e14fb746` | line 3391 (req #387) | 709 | `v:65d2b6ee1904bca4` | 1517 -> 2 ch | 259 (through line 4799) |
| VANISHED | `633915a8` | `c3f8e590e14fb746` | line 4034 (req #470) | 851 | `v:30c15cf716dd8f6d` | 758 -> 2 ch | 176 (through line 4799) |
| VANISHED | `633915a8` | `c3f8e590e14fb746` | line 4165 (req #500) | 863 | `v:0228a18708bc2196` | 758 -> 2 ch | 145 (through line 4799) |
| VANISHED | `633915a8` | `c3f8e590e14fb746` | line 4269 (req #548) | 995 | `v:78506a887ae5e252` | 758 -> 2 ch | 98 (through line 4799) |
| VANISHED | `633915a8` | `c3f8e590e14fb746` | line 4780 (req #637) | 1127 | `v:dda6b0c25883f747` | 758 -> 2 ch | 9 (through line 4799) |
| VANISHED | `64802bc6` | `a6c4eb8cc66b8821` | line 80 (req #17) | 30 | `v:5a02d8fadeb3f288` | 758 -> 2 ch | 18 (through line 242) |
| VANISHED | `7749d7fc` | `5f9ddc7c496ed940` | line 119 (req #39) | 58 | `v:61f6218554a342f7` | 758 -> 2 ch | 31 (through line 283) |
| VANISHED | `7749d7fc` | `5f9ddc7c496ed940` | line 278 (req #68) | 117 | `v:306bb0bb198f8391` | 758 -> 2 ch | 1 (through line 278) |
| VANISHED | `7749d7fc` | `089f53b386ebd37c` | line 1046 (req #70) | 69 | `v:8b5c7538dda074de` | 2276 -> 2 ch | 258 (through line 3633) |
| VANISHED | `7749d7fc` | `089f53b386ebd37c` | line 1046 (req #70) | 72 | `v:43ba5e6885e78d62` | 1517 -> 2 ch | 258 (through line 3633) |
| VANISHED | `7749d7fc` | `089f53b386ebd37c` | line 1046 (req #70) | 148 | `v:36efade6df3c9811` | 1517 -> 2 ch | 258 (through line 3633) |
| VANISHED | `7749d7fc` | `089f53b386ebd37c` | line 1632 (req #130) | 276 | `v:4eb6e12c811081ed` | 758 -> 2 ch | 198 (through line 3633) |
| VANISHED | `7749d7fc` | `089f53b386ebd37c` | line 1679 (req #139) | 294 | `v:eb62ed0ca741c957` | 1517 -> 2 ch | 189 (through line 3633) |
| VANISHED | `7749d7fc` | `089f53b386ebd37c` | line 2126 (req #178) | 365 | `v:0c112605f6417645` | 1517 -> 2 ch | 150 (through line 3633) |
| VANISHED | `7749d7fc` | `089f53b386ebd37c` | line 2194 (req #191) | 395 | `v:a4129a5b34540457` | 1517 -> 2 ch | 137 (through line 3633) |
| VANISHED | `7749d7fc` | `089f53b386ebd37c` | line 2399 (req #202) | 415 | `v:06d32b2455a2a0cc` | 758 -> 2 ch | 126 (through line 3633) |
| VANISHED | `7749d7fc` | `089f53b386ebd37c` | line 2513 (req #213) | 441 | `v:52cc9af2d9993fe6` | 1517 -> 2 ch | 115 (through line 3633) |
| VANISHED | `7749d7fc` | `089f53b386ebd37c` | line 2811 (req #233) | 482 | `v:956d178f0bbb229c` | 1517 -> 2 ch | 95 (through line 3633) |
| VANISHED | `7749d7fc` | `089f53b386ebd37c` | line 3114 (req #245) | 504 | `v:66475173056ca441` | 1517 -> 2 ch | 83 (through line 3633) |
| VANISHED | `7749d7fc` | `089f53b386ebd37c` | line 3177 (req #253) | 523 | `v:385c31ac25c9c9ec` | 1517 -> 2 ch | 75 (through line 3633) |
| VANISHED | `7749d7fc` | `089f53b386ebd37c` | line 3340 (req #261) | 538 | `v:ca886e61e2335b19` | 1517 -> 2 ch | 67 (through line 3633) |
| VANISHED | `77fe2779` | `e7394e052ea78bbc` | line 191 (req #74) | 97 | `v:70bffabac6bade9c` | 758 -> 2 ch | 285 (through line 775) |
| VANISHED | `77fe2779` | `e7394e052ea78bbc` | line 191 (req #74) | 100 | `v:c05ef0b6b7d0776b` | 359 -> 2 ch | 285 (through line 775) |
| VANISHED | `78b3e7fe` | `0a3c75290b548796` | line 83 (req #35) | 60 | `v:9a7c9effa5287f15` | 758 -> 2 ch | 147 (through line 524) |
| VANISHED | `78b3e7fe` | `0a3c75290b548796` | line 313 (req #117) | 217 | `v:3089423b1a7e623a` | 758 -> 2 ch | 65 (through line 524) |
| VANISHED | `9f9d8a9d` | `8f7ea4fbb70b5c4a` | line 225 (req #97) | 190 | `v:6b59c1d3bb4f3cc3` | 758 -> 2 ch | 65 (through line 401) |
| VANISHED | `adf6cadb` | `40625935bdc3c481` | line 263 (req #10) | 16 | `v:ce3a7995b717080c` | 758 -> 2 ch | 67 (through line 867) |
| VANISHED | `adf6cadb` | `40625935bdc3c481` | line 314 (req #24) | 48 | `v:b561b272cfdfe141` | 758 -> 2 ch | 53 (through line 867) |
| VANISHED | `adf6cadb` | `40625935bdc3c481` | line 510 (req #38) | 76 | `v:d5b848de12c2a86d` | 758 -> 2 ch | 39 (through line 867) |
| VANISHED | `adf6cadb` | `4c95e5a4bbbdccca` | line 1163 (req #55) | 58 | `v:8fabd957a9230903` | 758 -> 2 ch | 199 (through line 3209) |
| VANISHED | `adf6cadb` | `4c95e5a4bbbdccca` | line 2062 (req #127) | 268 | `v:86ece847489712d6` | 758 -> 2 ch | 127 (through line 3209) |
| VANISHED | `adf6cadb` | `4c95e5a4bbbdccca` | line 2297 (req #169) | 335 | `v:bb709c1f24388a67` | 758 -> 2 ch | 85 (through line 3209) |
| VANISHED | `adf6cadb` | `4c95e5a4bbbdccca` | line 2362 (req #175) | 353 | `v:0ae2b19e107994c5` | 758 -> 2 ch | 79 (through line 3209) |
| VANISHED | `adf6cadb` | `4c95e5a4bbbdccca` | line 2815 (req #226) | 460 | `v:949fff1d5612aed6` | 758 -> 2 ch | 27 (through line 3209) |
| VANISHED | `adf6cadb` | `4c95e5a4bbbdccca` | line 2815 (req #226) | 463 | `v:34035882cfa90310` | 758 -> 2 ch | 27 (through line 3209) |
| VANISHED | `b6952ffc` | `8e0215cab1e64136` | line 85 (req #21) | 40 | `v:1c8f2ed58785e17a` | 831 -> 2 ch | 68 (through line 394) |
| VANISHED | `b6952ffc` | `8e0215cab1e64136` | line 85 (req #21) | 43 | `v:d6a1484ba4a92340` | 1517 -> 2 ch | 68 (through line 394) |
| VANISHED | `b6952ffc` | `8e0215cab1e64136` | line 308 (req #53) | 102 | `v:681da9745da6070a` | 769 -> 2 ch | 36 (through line 394) |
| VANISHED | `b6952ffc` | `8e0215cab1e64136` | line 308 (req #53) | 115 | `v:1ab5328d6593372e` | 758 -> 2 ch | 36 (through line 394) |
| VANISHED | `cbc27f3c` | `ae212ba102fed5b0` | line 349 (req #125) | 237 | `v:84ad0d7d43dc7833` | 758 -> 2 ch | 11 (through line 377) |
| VANISHED | `d06b9ff1` | `373d8fbba10932f9` | line 272 (req #7) | 9 | `v:feb2594cd7d2f82a` | 1517 -> 2 ch | 71 (through line 439) |
| VANISHED | `dc3f8071` | `ab9d86b0ab5769b2` | line 342 (req #133) | 222 | `v:4789fbcf70fbcae8` | 758 -> 2 ch | 277 (through line 1407) |
| VANISHED | `dc3f8071` | `ab9d86b0ab5769b2` | line 643 (req #240) | 330 | `v:4b85c5bfda977535` | 758 -> 2 ch | 172 (through line 1407) |
| VANISHED | `dc3f8071` | `ab9d86b0ab5769b2` | line 799 (req #282) | 390 | `v:436ffbbb0ff4633a` | 1517 -> 2 ch | 129 (through line 1407) |
| VANISHED | `dc3f8071` | `ab9d86b0ab5769b2` | line 1329 (req #377) | 573 | `v:92920ccb16f885d0` | 758 -> 2 ch | 35 (through line 1407) |
| VANISHED | `e703682f` | `f8688780181602e6` | line 148 (req #29) | 43 | `v:ff9af03501204df4` | 395 -> 2 ch | 1 (through line 148) |
| VANISHED | `e703682f` | `f8688780181602e6` | line 148 (req #29) | 49 | `v:e98e89317422fee5` | 395 -> 2 ch | 1 (through line 148) |
| VANISHED | `e703682f` | `f8688780181602e6` | line 148 (req #29) | 52 | `v:3cd414d64144a50f` | 395 -> 2 ch | 1 (through line 148) |
| VANISHED | `e703682f` | `f8688780181602e6` | line 148 (req #29) | 57 | `v:db3a80d730cc3c98` | 395 -> 2 ch | 1 (through line 148) |
| VANISHED | `e703682f` | `f8688780181602e6` | line 148 (req #29) | 62 | `v:cb5e9a276d710f6f` | 395 -> 2 ch | 1 (through line 148) |
| VANISHED | `e703682f` | `f8688780181602e6` | line 148 (req #29) | 65 | `v:4431d4a54af7b7e7` | 1517 -> 2 ch | 1 (through line 148) |
| VANISHED | `f94e53ce` | `f67eedc931a7fd98` | line 919 (req #171) | 360 | `v:7254f82c4da33c8a` | 758 -> 2 ch | 196 (through line 2777) |
| VANISHED | `f94e53ce` | `f67eedc931a7fd98` | line 1073 (req #175) | 369 | `v:87546972e0504ccd` | 758 -> 2 ch | 192 (through line 2777) |
| VANISHED | `f94e53ce` | `f67eedc931a7fd98` | line 2660 (req #314) | 671 | `v:5984446c5ca0c0c3` | 758 -> 2 ch | 53 (through line 2777) |

## Reproducing

```sh
node --max-old-space-size=2048 tools/reminder-migration-census.mjs \
  ~/.claude/cache-fix-captures/*.jsonl                       # human-readable
node --max-old-space-size=2048 tools/reminder-migration-census.mjs \
  ~/.claude/cache-fix-captures/*.jsonl --json --verbose      # + volatileRows
node tools/reminder-migration-census.mjs --selftest
node --test test/census-volatile-change.test.mjs
```

`--json` gained `volatileChange`, `volatileKinds`, `volatileEntries`,
`volatileEntriesByKind`, `volatileByCapture`, `volatileExempt`,
`volatileTruncated` and `tornLines`, all ADDITIVE — `gate-live`'s
`summariseCensus` and `bust-triage` read named fields and are untouched
(both test suites re-run green). `volatileRows` rides in `--json` only under
`--verbose`, so the daily sweep's status file does not grow a row per flip.

## Instrument evidence (red-first, both directions)

A counter for this question is worthless unless it fires on the defect AND
stays silent on the non-defect — a check that fires on a non-defect is broken
too, and had every reminder flip been scored as a fidelity change, the
corpus-wide number would have argued for the wrong design.

**Red against the PRE-change census** (`git 604748f`) — the OLD→NEW change
could not have been counted at all before this work:

```
$ git checkout 604748f -- tools/reminder-migration-census.mjs
$ node --test test/census-volatile-change.test.mjs
SyntaxError: The requested module '../tools/reminder-migration-census.mjs'
  does not provide an export named 'classifyVolatileChange'
ℹ tests 1   ℹ pass 0   ℹ fail 1
```

**Mutation 1** — `IN-PLACE-TEXT` collapsed into `RESERIALIZED` (the exact
condition the defect bite names). The defect tests go red; the re-serialization
tests stay green:

```
✖ in-place OLD->NEW reminder text is CHANGED / IN-PLACE-TEXT
✔ wrapper-only re-serialization is RESERIALIZED, never CHANGED
✔ blocks rejoined on the "\n\n" separator are RESERIALIZED
ℹ tests 13   ℹ pass 7   ℹ fail 6
```

**Mutation 2** — the `RESERIALIZED` branch removed. The non-defect tests go red
while the defect test stays green, so the two halves are independently pinned:

```
✔ in-place OLD->NEW reminder text is CHANGED / IN-PLACE-TEXT
✖ wrapper-only re-serialization is RESERIALIZED, never CHANGED
✖ blocks rejoined on the "\n\n" separator are RESERIALIZED
✖ an empty volatile block appearing beside a reminder is RESERIALIZED
ℹ tests 13   ℹ pass 10   ℹ fail 3
```

Restored: 14 tests, 14 pass. Identity in the sweep is the mechanism's own —
`computePinnedIdentities` and `isVolatileBlock` are imported from the
extension, never re-derived, and a selftest bite pins the census's `WRAP`
against the extension's `isVolatileBlock` so a change to `VOLATILE_WRAP_REGEX`
goes red here rather than silently splitting the two definitions.
