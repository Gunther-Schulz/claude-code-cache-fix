// deferred-tool-rewrite — Phase B (robustness-threat-matrix class 6).
//
// Design: docs/directives/proxy-deferred-tool-rewrite.md, including the
// 2026-07-28 Phase B addendum (documented wire shapes + persistent
// re-injection). Spec contradiction on record: CC docs say deferred-tool
// loads append without disturbing cache; measured 2026-07-27 12:47:56
// (175k, ledger row tools[SendMessage:added], toolsMatch:false) says
// otherwise on this surface. Until upstream fixes it, the proxy holds
// tools[] byte-stable across a pure tool addition and delivers the newly
// available schema per the DOCUMENTED mid-conversation-tool-changes
// contract (beta mid-conversation-tool-changes-2026-07-01):
//
//   - the new tool goes into tools[] with defer_loading: true;
//   - the announcement is a {"type": "tool_addition", "tool":
//     {"type": "tool_reference", "name": ...}} content block on a
//     {"role": "system"} message appended to messages[] — NOT a text
//     block on top-level system (Phase A's placeholder; wrong shape AND
//     wrong location — top-level system heads the cache prefix, so every
//     injection there would bust the whole cache).
//
// STATELESSNESS: **CORRECTED 2026-08-18 — this paragraph's first clause was
// FALSE as stated, and a later design rested on it.** It read: "the API loads
// a deferred tool only when its tool_addition block is present in THAT
// request". Measured over 4 live captures: 4,972 requests carry tools[], and
// ALL 4,972 carry `defer_loading` tools with NO tool_addition block anywhere,
// while ZERO carry both — that is ordinary ToolSearch traffic, and
// `SendMessage` itself arrives from CC already deferred in 3,327 of them. The
// instrument-positive is the 4,972 total: a zero there would have made the
// parse the finding rather than the corpus.
// What IS true, and it is a different mechanism: the model's view of which
// tools it may LOAD comes from Claude Code's own deferred-tool listing — a
// system-role message CC writes into body.messages from its own registry
// (found there, never in top-level system) — not from tools[] itself. So a
// tool present in tools[] that CC has never registered is invisible to the
// model. Established by a live disposable session, not by reading: a
// fabricated tool seeded into tools[] with defer_loading:true and no
// announcement was accepted by the API (no 400) and the model answered ABSENT
// when asked whether it could see or call it, with the extension's own
// telemetry and persisted state proving the seed had actually reached the wire
// (without that control, ABSENT would be indistinguishable from a probe that
// never armed).
// The announcement still matters for what it always did — telling a model
// about a tool CC HAS registered, in-band, at the moment it appears. CC never
// echoes our injected message back. So both halves re-apply every request:
// tools[] stays held with added tools permanently defer_loading:true,
// and each injected system message is re-spliced byte-identically at a
// content-anchored position (identity hash of the message it was
// injected after). Anchor pruned by context management → re-anchor after
// the latest user message, telemetry `reanchored`, one honest partial
// re-cache. Pipeline order isolates this from insertion-normalization
// (395 < 425): the canonical never sees the injected message.
//
// Detect: compare incoming tools[] against the persisted known set (keyed
// by name). Three things can happen to a known name, and only one is an
// honest content change:
//   - present, byte-unchanged (fingerprint match) → carried forward using
//     the FROZEN persisted object (not the incoming one), so its wire
//     bytes stay stable turn over turn even if the incoming array's key
//     order or position drifted;
//   - ABSENT from incoming (harness GC'd a loaded deferred tool, e.g. a
//     skills/tool-list update) → HELD: re-inserted at its first-seen
//     position using the frozen object, exactly as if it were still
//     present. Inert once held; costs ~0 (threat-matrix row 13). This
//     also fixes pure reorder diffs (e.g. DeferredToolPlaceholder moving
//     relative to its neighbors with no add/remove) as a side effect,
//     since output order is ALWAYS the first-seen order, never the
//     incoming array's order;
//   - present but fingerprint-changed → the one honest case: passthrough
//     + full reset (the directive's "never paper over a real edit" — and
//     specifically never serve a stale schema for a name that changed) —
//     EXCEPT where the whole difference is DESCRIPTION prose (below).
// A new name (not in the known set) is additively marked
// defer_loading:true and announced via one appended tool_addition system
// block, exactly as before. Any combination of held + new in the same
// request composes (both are additive from the wire's perspective; only
// a fingerprint change is destructive).
//
// DESCRIPTION-ONLY delta (threat-matrix rows 23 and 24, 2026-08-02) — the
// fourth outcome, `description-absorbed`. Live bust 15:53:46: 13 tools
// before, 13 after, same order, exactly one field in the whole array
// different — Bash.description, one added advisory line — with
// input_schema BYTE-IDENTICAL, and 484,972 tokens of context re-written
// for it, because tools[] renders before system and messages so no
// breakpoint survives a tools delta. Row 24's /resume case is the same
// shape by construction: CC embeds the session id in the Bash
// description, so every /resume changes tools[].
//
// Why this is safe where a schema change is not: identical input_schema
// guarantees the model cannot emit a call the client is unable to
// execute. A stale DESCRIPTION costs the model current prose; a stale
// SCHEMA costs the client a call it cannot run. So the canonical array is
// forwarded byte-identically and the NEW prose is delivered in-band on
// the SAME announcement machinery an addition uses (a mid-conversation
// system message, beta-gated, anchored, re-injected every request). The
// absorb requires the tools[] identity to be otherwise untouched — same
// count, same names, every input_schema byte-identical; SET-identity, not
// order-identity (2026-08-05): sort-stabilization already name-sorts every
// incoming array, so incoming order is not a preserved property, and the
// canonical's first-seen order goes on the wire either way. Any
// other difference keeps today's honest reset. And a model with no
// announcement channel takes the honest reset too, tagged
// `descriptionFallback` so the real cause is not buried under
// "tool-schema-changed": a stale description is never served silently.
//
// PRELOAD (threat-matrix row 6, ladder step (b), 2026-08-18) — the fifth
// outcome, and the only one that acts BEFORE the event it prevents. Measured
// over the 2026-08-16 population record: `SendMessage` is 103 of 126 tool
// ADDITION events, in 24 of the 25 captures that have any, and it is the only
// frequent addition that is PREDICTABLE at session start (it appears when a
// session gains a teammate agent, unlike the one-off MCP servers that make up
// the rest). k=1 covers ~80% of addition events; the k=10 ceiling is ~89% and
// the residue is mid-session MCP arrivals that no session-start mechanism can
// reach. This does not fix that class and does not claim to.
//
// The mechanism is a SEED of the machinery above rather than a new one. Every
// KNOWN name is forwarded from the FROZEN persisted object, so a name that is
// already in the persisted array before CC ever sends it is classified as
// known on arrival and tools[] does not move. Concretely:
//
//   - at `no-baseline` ONLY (first-seen conversation), append each preload
//     name that is missing from the incoming array, using bytes LEARNED from
//     a previous session (below), and mark it defer_loading on the wire;
//   - emit NO tool_addition block at seed time. This half is load-bearing for
//     SAFETY, not for cache — and the MECHANISM is the corrected one in the
//     STATELESSNESS paragraph above, not the sentence this bullet used to
//     carry ("the API loads a deferred tool only when its tool_addition block
//     is present in THAT request", measured false 2026-08-18 over 4,972
//     requests). What actually holds: the model's loadable-tool view comes
//     from Claude Code's own deferred-tool listing inside body.messages, so a
//     name CC has not registered is invisible to it however tools[] is
//     shaped. Measured live with a FABRICATED name — the discriminating case,
//     since `SendMessage` cannot separate the hypotheses (CC lists it either
//     way): the API accepted the unannounced deferred tool and the model
//     answered ABSENT. The residual therefore lives in the preload SET rather
//     than in the mechanism — a name CC does not universally register is
//     invisible AND pins bytes nothing will ever announce — which is why the
//     set is the reviewed PRELOAD_TOOL_NAMES constant below, each name
//     carrying the measurement that put it there, and not an env string
//     anyone can set without one;
//   - when CC later sends that name for real, announce it THEN, on the same
//     addition machinery, without touching tools[]. This is NOT the new-name
//     path — by then the name is KNOWN, so the classifier reports
//     `unchanged`/`rewrite` and never lists it in `newNames`; the pending set
//     is carried in the persisted state (`preloaded`) and drained here.
//
// SEEDING IS NEVER RETROFITTED. A conversation that already has a persisted
// array keeps it; adding a name mid-flight would change tools[] and cause the
// exact bust this prevents. The seed happens at conversation birth or not at
// all, which also means a restart is transparent for every continuing
// conversation (row 3) and the change only reaches conversations born after it.
//
// "Conversation birth" is read off the CONVERSATION, never off the state file.
// `no-baseline` is a fact about the state file only: this extension's key
// carries a conversation sub-key, and a mid-conversation key rotation (this
// repo has measured one — s-captureAB, n=331->336) makes turn 7 of a live
// conversation classify `no-baseline`. Seeding there retrofits a running
// session's tools[] — measured 8 tools -> 9 — which is the ship-time hazard
// above, arriving through the back door. So the seed additionally requires the
// request's own history to show that nothing has been answered here yet
// (isConversationBirth).
//
// CORRECTED 2026-08-18, same day, and the correction is worth keeping because
// the wrong version SILENTLY DISABLED this whole mitigation while every bite
// passed. That version admitted at most ONE message, on the stated reasoning
// that "Claude Code's first request in a conversation carries exactly the user
// turn that opened it". That is a claim about CC, so the corpus answers it, and
// it is false: over 6 live captures (3,189 tool-carrying requests, 50
// conversations by conversationSubKey) the first observed request carries TWO
// messages in 36, one in 2, and 4+ in 12 — the guard would have refused 48 of
// 50 real conversations, and the bites all passed because they drive
// one-message bodies, a shape real traffic barely produces. The replacement is
// structural rather than a re-tuned number, because a number nobody can
// re-justify is what survives into the next reader's model.
//
// MODEL GATE, same opt-in stance as the announcement: seed only for a model on
// TOOL_ADDITION_MODELS. A preloaded tool that can never be announced is a tool
// the model can never call, so a model with no announcement channel gets no
// seed. If the model nevertheless changes under a seeded conversation and the
// real arrival cannot be announced, the preload is ABANDONED — CC's raw array
// is forwarded (one honest bust, `preloadFallback` in telemetry), never a
// silently uncallable tool.
//
// WHAT A PENDING SEED IS NOT EVIDENCE OF. Between the seed and CC's real
// arrival the persisted array is deliberately a SUPERSET of what CC sends, so
// every identity test in the classifier has to ask whether the set CC SENT
// moved — never whether our array equals CC's. Both halves of that were
// measured wrong before the repair (2026-08-18 review): a pending name read as
// a "held" (GC'd) tool made `sameSet` permanently false, disabling the
// description absorb for the whole pending window; and a pending name arriving
// with bytes different from the ones we guessed read as "a known tool's schema
// changed" and took the global reset, which is strictly worse than running
// with no preload at all. See classifyToolChange's own definition paragraph.
//
// WHERE THE BYTES COME FROM: LEARNED, never pinned. The first conversation
// that sees a preload name records that tool object to a machine-local store
// (`deferred-tool-preload.json` in the snapshot dir, one file, not per-key —
// deliberately outside prefix-diff's SNAPSHOT_FILE_RE key anchor, so its sweep
// cannot reach it). Last-seen-wins per name, so a Claude Code upgrade that
// moves the schema is absorbed within one conversation instead of pinning a
// stale copy that cannot age loudly. A pinned committed snapshot was the
// rejected alternative for exactly that reason.
//
// The store starts EMPTY, so the first conversation after this ships seeds
// nothing and only learns. That is the intended bootstrap, and it is why the
// change cannot bust anything on the day it lands. Re-learning is THROTTLED
// (PRELOAD_RELEARN_MS): this store is one file for the whole machine, so a
// name whose description is project- or plugin-dependent would otherwise be
// rewritten by every session on the box, once per request, last writer
// winning. The throttle keeps last-seen-wins — a Claude Code upgrade is still
// absorbed, just within the window rather than within the request.
//
// Gate: CACHE_FIX_TOOL_PRELOAD, a BOOLEAN ("1") — unset or anything else is
// OFF, which is the default. It was a comma-separated NAME LIST until
// 2026-08-18, and that shape was unpublishable: gate-allowlist.mjs admits no
// free-form value, so /health would have published it as `<redacted>` and the
// doctor's three-way DECLARED/RUNNING/VERIFIED compare would FAIL naming the
// wrong cause (measured on the prefix-diff content gate the day it shipped —
// named in gate-allowlist.mjs, deliberately not spelled out here: serving-gate
// -lint derives an extension's gates from its RAW source, comments included,
// so citing another gate's env name in prose makes every test driving this
// file owe that gate). The set itself now lives in PRELOAD_TOOL_NAMES below,
// where each name carries the measurement that put it there.
//
// Phase B stops at: documented shapes + persistent re-injection,
// validated by unit tests and replay A/B (directive addendum's gates 1-2).
// The final live acceptance probe (gate 3: one real request through the
// proxy at a session boundary, watch for 400 vs the model using the
// added tool) happens before the service-unit flag flips — the header
// plumbing this depended on was fixed in server.mjs 10d33e4.
//
// Activation: `enabled: true` in extensions.json (always loaded), runtime
// gate CACHE_FIX_TOOL_REWRITE=1, default OFF per directive ("Phase A (build
// now, env-gated CACHE_FIX_TOOL_REWRITE=1, default off)"). Order 425 — after
// sort-stabilization (200, so tools[] arrives name-sorted — comparisons and
// output order are keyed on name, not incoming array order);
// before ttl-management (500), consistent with the rest
// of the body-shaping extensions running ahead of the TTL pass.

import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
// Aliased: this module already has its own local `statePath()` (a per-session
// filename builder). The XDG root resolver is a different thing entirely.
import { statePath as xdgStatePath } from "../xdg-dirs.mjs";
import { resolveSessionId } from "./cache-telemetry.mjs";
import { hashMessageContent, conversationSubKey, PRE_PIPELINE_CONV, OLD_KEY_HIT } from "./message-hash.mjs";
import { systemPromptSubKey } from "./insertion-normalization.mjs";
import { appendFileOwnerOnly, writeFileOwnerOnly } from "./write-owner-only.mjs";
import { createHash } from "node:crypto";

// Models known to ACCEPT the mid-conversation-tool-changes contract.
//
// Opt-IN, not opt-out, and that direction is the whole point. On 2026-07-28
// a sonnet-5 subagent dispatch died with:
//
//     API Error: 400 tool_addition/tool_removal is not supported on this model
//
// The tool_addition block is a documented beta, but support is per-MODEL and
// this extension applied it to whatever came through. A cache mitigation that
// can HARD-FAIL a request is strictly worse than no mitigation, so an unknown
// model gets no announcement: it degrades to forwarding the new tool
// normally (a tools[] change, i.e. the bust we would have prevented) instead
// of a 400 that loses the request outright.
//
// This file's own header prescribed exactly this check — "the final live
// acceptance probe (gate 3: one real request through the proxy at a session
// boundary, watch for 400 vs the model using the added tool) happens before
// the service-unit flag flips". The flag was flipped without running it.
//
// Evidence, not guesswork — tools/probe-tool-addition.mjs measures a model
// in one real request (same OAuth path as production, wire shapes imported
// from this file). Add a prefix here only with a real request behind it.
//
//   claude-opus-5    ACCEPTED  sessions 58c979ce and 538c0aef, injections on
//                              the wire, no 400.
//   claude-sonnet-5  REJECTED  the 2026-07-28 live 400 above.
//   claude-haiku-4-5 REJECTED  probe 2026-07-29: "tool_addition/tool_removal
//                              requires a model that supports mid-conversation
//                              system content; this model does not" — the
//                              probe surfaced the CAPABILITY the beta gates
//                              on, which the sonnet error never named.
//   claude-fable-5   ACCEPTED  live probe 2026-07-29, session c05a754c: a
//                              disposable `claude -p` run through a throwaway
//                              proxy (CACHE_FIX_TOOL_ADDITION_EXTRA) injected
//                              the announcement for a mid-run ToolSearch load;
//                              production's capture holds the block at
//                              messages[4], the forwarded body hash matches
//                              the recorded outSha byte-for-byte, and the
//                              outcome record shows the API streamed a 200.
//                              (Direct-API probes 429 on this subscription for
//                              ALL big models — hand-built OAuth requests are
//                              refused regardless of quota, so the through-CC
//                              path is the only working probe for them;
//                              haiku's direct probe worked because CC itself
//                              sends it free-form utility traffic.)
const TOOL_ADDITION_MODELS = ["claude-opus-5", "claude-fable-5"];

// CACHE_FIX_TOOL_ADDITION_EXTRA: comma-separated additional prefixes,
// read per call like every gate. It exists for ONE purpose — the directive's
// live acceptance probe: a throwaway proxy instance sets it so a disposable
// real session can carry the announcement to a candidate model without
// touching the production allowlist. It is never set in the service unit;
// an ACCEPTED result graduates to TOOL_ADDITION_MODELS with its evidence,
// the override does not substitute for the entry.
export function supportsToolAddition(model) {
  if (typeof model !== "string") return false;
  const extra = (process.env.CACHE_FIX_TOOL_ADDITION_EXTRA ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return TOOL_ADDITION_MODELS.concat(extra).some((prefix) => model.startsWith(prefix));
}

const BETA_TOKEN = "mid-conversation-tool-changes-2026-07-01";
const BETA_HEADER_NAME = "anthropic-beta";

const DEFAULT_FS = { readFile, writeFile, rename, appendFile, mkdir };

// Models already warned about in this process — the suppressed-announcement
// warning fires once per model, not per request. Module state is acceptable
// here precisely because losing it (restart, reload) only repeats a warning.
const warnedSuppressedModels = new Set();

// --- Env gates (read per-call, mirrors the insertion-normalization idiom) ---

function isEnabled(env = process.env) {
  return env.CACHE_FIX_TOOL_REWRITE === "1";
}

function isDebug(env = process.env) {
  return env.CACHE_FIX_DEBUG === "1";
}

function debug(msg) {
  if (isDebug()) process.stderr.write(`[deferred-tool-rewrite] DEBUG: ${msg}\n`);
}

// --- Storage (snapshots-dir idiom, mirrors insertion-normalization) ---

// XDG STATE: regenerable snapshot/telemetry state, not Claude Code config.
// Writer path — no legacy fallback (proxy/xdg-dirs.mjs states why).
function getSnapshotDir() {
  return process.env.CACHE_FIX_SNAPSHOT_DIR || xdgStatePath("snapshots");
}

function statePath(dir, sessionKey) {
  return join(dir, `${sessionKey}-deferred-tool-canon.json`);
}

function eventsPath(dir, sessionKey) {
  return join(dir, `${sessionKey}-deferred-tool-events.jsonl`);
}

// --- Preload store (row 6 step (b); see the PRELOAD section in the header) ---

// THE DECLARED PRELOAD SET, in source beside TOOL_ADDITION_MODELS and for the
// same reason: a name belongs here only with a measurement behind it. This was
// an env NAME LIST until 2026-08-18; the gate is now a boolean and the set is
// here (header, Gate paragraph — gate-allowlist.mjs admits no free-form value,
// and an unpublishable serving gate breaks the doctor's three-way compare).
//
// Seeding a name is not free and not symmetric: a name Claude Code registers
// everywhere costs nothing when it never arrives (an unannounced deferred tool
// is invisible to the model) and saves a full front invalidation when it does,
// while a name CC does not universally register pins bytes nothing will ever
// announce. So each entry states the population it was measured over.
export const PRELOAD_TOOL_NAMES = [
  // SendMessage — 103 of 126 measured tool ADDITION events, present in 24 of
  // the 25 captures that have any (2026-08-16 population record, BACKLOG). The
  // only frequent addition that is PREDICTABLE at session start: it appears
  // when a session gains a teammate agent, unlike the one-off MCP servers that
  // make up the rest. k=1 covers ~80% of addition events; the k=10 ceiling is
  // ~89%. CC lists it in its own deferred-tool listing whether or not we seed
  // it (read from a PRE-pipeline capture of a teammate-less session
  // 2026-08-18), which is what makes it safe on the registration axis.
  "SendMessage",
];

// Gate: a BOOLEAN. Returns the declared set or nothing — read per call like
// every other gate here. A copy, never the constant itself: the caller
// concatenates and filters this value, and one accidental in-place mutation
// would change the set for every session in the process.
export function preloadNames(env = process.env) {
  return env.CACHE_FIX_TOOL_PRELOAD === "1" ? PRELOAD_TOOL_NAMES.slice() : [];
}

// RE-LEARN THROTTLE. The store below is ONE file for the whole machine, and
// the learn step fires on any fingerprint difference — so a preload name whose
// description varies by project or by plugin set (CC embeds per-session and
// per-project prose in tool descriptions; this file already carries a
// VOLATILE_DESC_PATTERNS entry for one such case) would be rewritten by every
// session on the box, once per request, last writer winning. The throttle
// bounds that to one write per name per window while keeping LAST-SEEN-WINS
// intact: an upstream schema move is still absorbed, within the window rather
// than within the request, and the only cost of a slightly stale stored copy
// is that the arrival adopts CC's bytes (classifyToolChange, the pending-name
// adoption) — one entry's bytes, not a reset.
export const PRELOAD_RELEARN_MS = 60 * 60 * 1000;

// IS THIS CONVERSATION BEING BORN? The seed is legal at birth and nowhere else
// (header, SEEDING IS NEVER RETROFITTED), and `no-baseline` does not establish
// birth — a mid-conversation key rotation produces it at turn 7.
//
// The test is STRUCTURAL, and a message COUNT was the wrong instrument: the
// first version of this guard admitted one message only, on the reasoning that
// a first request carries just the user turn that opened it. Measured over 6
// live captures — 3,189 tool-carrying requests, 50 conversations grouped by
// conversationSubKey — that is false, and the guard would have refused 48 of
// the 50: the first observed request carries TWO messages in 36 of them (the
// user turn plus a system-role block Claude Code writes itself; read from
// PRE-pipeline captures, so not one of ours), one in 2, and 4 or more in 12.
//
// The same measurement hands over the real discriminator, with no overlap
// between the populations: every conversation whose first request has no
// ASSISTANT turn carries 1-2 messages, and every one that has an assistant
// turn carries 4 to 459. An exchange that has already been answered was not
// born on this request, whatever the state file says — which is precisely what
// the rotation case is. So: no assistant message, no prior turn, birth.
export function isConversationBirth(messages) {
  return Array.isArray(messages) && !messages.some((m) => m?.role === "assistant");
}

// ONE file for the whole machine, NOT per session key. The name deliberately
// carries no `<key>-` prefix: prefix-diff's SNAPSHOT_FILE_RE is anchored to
// `(s-)?[0-9a-f]{12}-…`, so a keyless name cannot be swept by it (that anchor
// is load-bearing there, and this is the other side of the same boundary).
function preloadStorePath(dir) {
  return join(dir, "deferred-tool-preload.json");
}

// { version: 1, tools: { <name>: { learnedAt, tool } } }. A malformed or
// missing file reads as an empty store — the seed is an optimisation, and the
// only cost of not having it is today's behaviour.
async function loadPreloadStore(dir, fs) {
  try {
    const parsed = JSON.parse(await fs.readFile(preloadStorePath(dir), "utf-8"));
    const tools = parsed?.tools;
    if (!tools || typeof tools !== "object") return { version: 1, tools: {} };
    return { version: 1, tools };
  } catch (err) {
    if (err && err.code !== "ENOENT") debug(`preload store read failed: ${err?.message ?? err}`);
    return { version: 1, tools: {} };
  }
}

async function savePreloadStore(dir, store, fs) {
  await fs.mkdir(dir, { recursive: true });
  const finalPath = preloadStorePath(dir);
  const tmpPath = `${finalPath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  await writeFileOwnerOnly(tmpPath, JSON.stringify(store, null, 2), fs);
  await fs.rename(tmpPath, finalPath);
}

// Pure. Returns the names whose stored bytes need (re)writing: a name we want
// to preload that is present in the incoming array, whose stored copy is
// absent or fingerprint-different, and whose stored copy is older than the
// re-learn window. LAST-SEEN-WINS is the whole staleness answer — a schema
// that moves upstream is re-learned on the next conversation that carries it
// once the window has passed, so the store can never pin bytes CC has stopped
// sending.
export function preloadLearnable(incomingTools, store, wanted, now = Date.now()) {
  const want = new Set(wanted);
  const out = [];
  for (const t of incomingTools) {
    if (!want.has(t?.name)) continue;
    const entry = store?.tools?.[t.name];
    const known = entry?.tool;
    if (known && toolFingerprint(known) === toolFingerprint(t)) continue;
    // Throttle (see PRELOAD_RELEARN_MS). An UNPARSEABLE or FUTURE `learnedAt`
    // is deliberately not throttled: a corrupt or clock-skewed stamp that
    // suppressed re-learning would pin whatever bytes were stored beside it,
    // permanently and silently, which is the failure this store exists to
    // avoid. Re-learning rewrites the stamp, so the state self-heals.
    if (known) {
      const age = now - Date.parse(entry?.learnedAt ?? "");
      if (Number.isFinite(age) && age >= 0 && age < PRELOAD_RELEARN_MS) continue;
    }
    out.push(t);
  }
  return out;
}

// Pure. The tool objects to append to a FRESH baseline: every wanted name that
// the store knows and the incoming array does not already carry. Stored bytes
// go in verbatim (minus any defer_loading marker, which is applied at forward
// time by forwardedTools, exactly as it is for an announced addition — the
// persisted array must stay fingerprint-comparable against CC's raw one).
export function preloadSeedTools(incomingTools, store, wanted) {
  const present = new Set(incomingTools.map((t) => t?.name));
  const out = [];
  for (const name of wanted) {
    if (present.has(name)) continue;
    const known = store?.tools?.[name]?.tool;
    if (!known) continue;
    // A stored entry whose `tool.name` disagrees with its KEY is the one odd
    // store shape that does not degrade to "no seed": it would seed under the
    // OTHER name, putting a tool nobody asked for into tools[] — and, because
    // the pending set records the WANTED name, forwardedTools would not even
    // mark it defer_loading, so an unannounced tool would go out presented as
    // loaded. The store is a machine-local file; a key/name disagreement is a
    // corrupt entry, and a corrupt entry seeds nothing.
    if (known.name !== name) continue;
    const { defer_loading: _drop, ...bytes } = known;
    out.push(bytes);
  }
  return out;
}

// State: { tools: [...], additions: [{ name, anchorHash, message }],
//          preloaded: [name, …] }.
// `additions` (Phase B) carries each injected system message byte-frozen,
// plus the identity hash of the message it was anchored after. Old files
// without the field read as additions=[] — no migration, sessions started
// under Phase A simply have no pending injections.
// `preloaded` (row 6 step b) is the SEEDED-BUT-UNANNOUNCED set: names sitting
// in the persisted array that CC has not sent yet. It is read on every request
// because it drives the defer_loading marker on the wire — a preloaded name
// that loses its marker changes tools[], which is the bust this prevents. Old
// files without the field read as [], i.e. exactly today's behaviour.
async function loadState(dir, sessionKey, fs) {
  try {
    const txt = await fs.readFile(statePath(dir, sessionKey), "utf-8");
    const parsed = JSON.parse(txt);
    if (!Array.isArray(parsed?.tools)) return null;
    return {
      tools: parsed.tools,
      additions: Array.isArray(parsed.additions) ? parsed.additions : [],
      preloaded: Array.isArray(parsed.preloaded) ? parsed.preloaded : [],
    };
  } catch (err) {
    if (err && err.code !== "ENOENT") debug(`state read failed: ${err?.message ?? err}`);
    return null;
  }
}

async function saveState(dir, sessionKey, state, fs) {
  await fs.mkdir(dir, { recursive: true });
  const finalPath = statePath(dir, sessionKey);
  const tmpPath = `${finalPath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  await writeFileOwnerOnly(tmpPath, JSON.stringify(state, null, 2), fs);
  await fs.rename(tmpPath, finalPath);
}

async function appendTelemetry(dir, sessionKey, record, fs) {
  try {
    await fs.mkdir(dir, { recursive: true });
    await appendFileOwnerOnly(eventsPath(dir, sessionKey), JSON.stringify(record) + "\n", fs);
  } catch (err) {
    debug(`telemetry append failed: ${err?.message ?? err}`);
  }
}

// --- Session key (same idiom as insertion-normalization) ---

// Sub-keyed by system-prompt hash for the same reason insertion-normalization
// is (threat-matrix row 14): the session-id header is shared by the main
// thread, every subagent it dispatches, and CC's own sidecar calls
// (title-generation etc.) — but those carry DIFFERENT tools arrays. Keyed on
// the bare session id they all collide on one baseline, so each alternation
// reads as "a known tool's schema changed" and takes the honest-reset path,
// re-baselining against whichever tenant spoke last.
//
// Measured before this fix (2026-07-28, capture s-captureH, 602 requests):
// SIX distinct (tools, system-prompt) combinations shared a single baseline,
// and enabling the rewrite RAISED main-conversation tools[] churn from 1 to 2
// — the extension built to hold tools[] byte-stable was destabilising it.
// The directive never considered sidecars; only replay over real multi-tenant
// traffic surfaced it.
// The key carries a CONVERSATION sub-key as well as the system prompt.
//
// Without it (until 2026-07-28) every subagent of a session shared one tools
// baseline AND one set of persisted additions, because they all run the same
// agent system prompt. That is not merely noisy: the tool_addition
// announcement is anchored to a MESSAGE IDENTITY, so under a shared key the
// stored anchor belongs to a different conversation's history, fails to
// match, and injectAdditions falls back to "after the last user message" — a
// different index on every request. Measured on corpus s-captureE: our output
// diverged at index 4 while CC's own history was byte-identical through index
// 23, twice, re-billing 19 messages that never changed.
//
// insertion-normalization hit the identical collision and was fixed hours
// earlier; this extension had the same key and did not get the fix. Hence
// conversationSubKey living in message-hash.mjs rather than in either
// extension — a second copy is a second truth, and the second consumer
// learning the lesson late is exactly what happened here.
// `convOverride` is D1's pre-pipeline conversation identity (matrix row 26).
// Same contract as `resolveInsertionSessionKey`'s: present, it replaces the
// locally computed value; absent, behaviour is byte-identical to before D1.
// This extension is row 26's more expensive consumer — losing its baseline
// forwards CC's raw array where it had been forwarding the frozen order, which
// diverges the prefix ABOVE messages and re-bills everything below it.
export function resolveToolRewriteSessionKey(headers, body, convOverride = null) {
  const sid = headers ? resolveSessionId(headers) : null;
  const conv = convOverride ?? conversationSubKey(body?.messages);
  if (sid) return `s-${sid.replace(/[^A-Za-z0-9_-]/g, "_")}-${systemPromptSubKey(body?.system)}-${conv}`;
  const model = typeof body?.model === "string" ? body.model : "unknown";
  return `c-${model}-${conv}`;
}

// --- Canonical tool comparison ---
//
// Only name/description/input_schema participate in the equality check —
// any OTHER field (e.g. a defer_loading marker WE ourselves might have
// added on a prior rewrite) is deliberately excluded, so re-classifying a
// tool object that happens to carry that marker can never misfire as "the
// existing tool's schema changed."
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

// VOLATILE SUBSTRINGS inside a tool DESCRIPTION (2026-07-28). CC embeds the
// per-session console URL in the Bash tool's description — it is the commit
// trailer the model is instructed to write — and it does not embed it
// consistently: measured over 640 live requests, 628 carried it and 12 did
// not, with two transitions. Each transition is a tools[] byte change, and
// tools[] renders BEFORE system and messages, so no cache_control breakpoint
// can survive it; one of them cost 705k creation tokens on this session.
//
// Nothing about what Bash DOES changes across that flip — the session URL is
// not part of the tool's contract. So it is excluded from the identity and
// the first-seen description is forwarded: exactly the treatment
// insertion-normalization already applies to <system-reminder> blocks in
// messages, one region over.
//
// Deliberately NARROW: only the session-URL shape. Any other description
// difference is still a real edit and still resets, because serving a stale
// schema for a tool whose contract changed is the one failure this extension
// must never produce.
const VOLATILE_DESC_PATTERNS = [
  // https://claude.ai/code/session_<id> — appears bare and as a
  // "Claude-Session:" trailer line; the whole line goes either way.
  /^.*https:\/\/claude\.ai\/code\/session_[A-Za-z0-9]+.*$/gm,
];

export function stripVolatileDescription(desc) {
  if (typeof desc !== "string") return desc;
  let out = desc;
  for (const re of VOLATILE_DESC_PATTERNS) out = out.replace(re, "");
  // Collapse the blank lines the removal leaves behind, so a description that
  // differs ONLY by the volatile line canonicalizes identically either way.
  return out.replace(/\n{2,}/g, "\n").trim();
}

// The safety boundary of the description absorb, isolated so the predicate
// that decides "stale is safe here" is one readable expression: two tools
// carry the same CALLABLE contract when their input_schema is identical
// under the same canonicalization the fingerprint uses. Everything the model
// could get WRONG from a stale description is prose; everything it could get
// wrong from a stale schema is a call the client cannot execute.
function schemaIdentity(tool) {
  return JSON.stringify(canonicalize(tool?.input_schema ?? null));
}

export function toolFingerprint(tool) {
  if (!tool || typeof tool !== "object" || typeof tool.name !== "string") return null;
  return JSON.stringify(
    canonicalize({
      name: tool.name,
      description: stripVolatileDescription(tool.description ?? null),
      input_schema: tool.input_schema ?? null,
    }),
  );
}

// --- Core classifier (pure) ---
//
// Returns:
//   { action: "no-baseline", knownTools }                                             — first-seen session; persist baseline, forward unchanged (EXCEPT where onRequest seeds a preload into knownTools — the one case a fresh baseline forwards something other than CC's array; see the PRELOAD header section)
//   { action: "unchanged", knownTools }                                               — incoming === known set, same order; forward unchanged
//   { action: "reset", knownTools, reason }                                           — a known tool's schema changed; forward unchanged, re-baseline
//   { action: "rewrite", tools, newNames, heldNames, knownTools }                      — held removal and/or reorder and/or pure addition; onRequest forwards forwardedTools(knownTools, additions) and injects the addition message
//   { action: "description-absorbed", knownTools, descriptionChanges }                 — DESCRIPTION prose only, identical schemas/names/order; knownTools is the FIRST-SEEN array unchanged, and descriptionChanges carries the NEW prose for the in-band announcement
//
// `priorPreloadedNames` is the SEEDED-BUT-UNANNOUNCED set as the persisted
// state carried it: names WE put into the array, which Claude Code has not
// sent yet.
//
// THE DEFINITION IT ENFORCES, stated before the assertions that use it: a name
// WE added is not evidence that Claude Code changed its tool set. Every
// identity test below therefore asks whether the set CC SENT is unchanged, and
// never whether our persisted array equals CC's incoming one — during a
// pending window the two differ BY CONSTRUCTION, since the seed is precisely a
// name CC has not sent. Two consequences, both of them defects measured on the
// first build (2026-08-18 review) rather than hypotheses:
//   - a pending name is not a HELD tool. `held` means the harness GC'd
//     something it had sent us; a name CC never sent cannot have been GC'd.
//     Counted as held, `heldNames.length === 0` never holds, so `sameSet` is
//     permanently false and every description delta in the pending window
//     takes reset/tool-schema-changed instead of the absorb this file ships.
//     Two arms, same input, only the gate differing: preload OFF ->
//     description-absorbed, wire unchanged; preload ON -> reset, wire losing
//     the seeded entry AND the pending set with it.
//   - a pending name arriving with bytes that differ from the ones we seeded
//     is not a SCHEMA CHANGE. We never received those bytes from CC in this
//     conversation; we guessed them from another one, and the guess being
//     wrong is our error, not CC editing a tool. The honest act is to ADOPT
//     CC's bytes for that one entry and let the arrival announce it — the
//     new-name path, costing exactly that entry's bytes. The global reset
//     costs the frozen order of the whole array plus every pending injection,
//     which is strictly WORSE than having run with no preload at all.
export function classifyToolChange(incomingTools, priorKnownTools, priorPreloadedNames = []) {
  if (!Array.isArray(priorKnownTools)) {
    return { action: "no-baseline", knownTools: incomingTools };
  }

  const priorByName = new Map(priorKnownTools.map((t) => [t.name, t]));
  const incomingByName = new Map(incomingTools.map((t) => [t.name, t]));
  const pending = new Set(priorPreloadedNames);

  // Schema-change scan runs over every name present in BOTH sets — absence
  // is handled separately below (held, not reset) — so a removal elsewhere
  // in the array never short-circuits this check.
  //
  // A fingerprint difference splits in two, and only the split is new: an
  // input_schema difference is the destructive case and returns immediately,
  // as it always did; a difference confined to the DESCRIPTION is collected
  // and decided after the set/order checks below, because the absorb it
  // enables is only legal when nothing ELSE about tools[] moved.
  const descriptionChanges = [];
  // Pending names whose incoming bytes differ from the ones we seeded — see
  // the definition above. Collected rather than acted on immediately, because
  // the adoption has to survive into whichever branch the set checks pick.
  const adoptedNames = [];
  for (const [name, priorTool] of priorByName) {
    const incomingTool = incomingByName.get(name);
    if (!incomingTool) continue;
    if (toolFingerprint(incomingTool) === toolFingerprint(priorTool)) continue;
    if (pending.has(name)) {
      adoptedNames.push(name);
      continue;
    }
    if (schemaIdentity(incomingTool) !== schemaIdentity(priorTool)) {
      return { action: "reset", knownTools: incomingTools, reason: "tool-schema-changed" };
    }
    descriptionChanges.push({ name, description: incomingTool.description });
  }
  const adopted = new Set(adoptedNames);
  // The frozen object for a name, with an adopted pending name resolving to
  // CC's incoming bytes instead of the ones we guessed.
  const canonicalOf = (name) => (adopted.has(name) ? incomingByName.get(name) : priorByName.get(name));

  const priorOrderNames = [...priorByName.keys()];
  // HELD means the harness GC'd a tool it HAD sent us. A pending seed CC has
  // not sent yet is not that, so it is excluded here and from the length
  // comparison below — the set under test is CC's, not ours.
  const heldNames = priorOrderNames.filter(
    (name) => !incomingByName.has(name) && !pending.has(name),
  );
  const newNames = [...incomingByName.keys()].filter((name) => !priorByName.has(name));
  // The names CC itself established in this conversation: our persisted order
  // minus the seeds it has not sent. Equal to priorOrderNames whenever nothing
  // is pending, which is every conversation with the preload gate off.
  const ccPriorNames = priorOrderNames.filter(
    (name) => incomingByName.has(name) || !pending.has(name),
  );

  const incomingOrderNames = incomingTools.map((t) => t.name);
  // Same names in both directions AND same array length — the length guard
  // keeps a degenerate duplicate-name array out of the set-identical class,
  // since the by-name maps above collapse duplicates silently.
  const sameSet =
    heldNames.length === 0 &&
    newNames.length === 0 &&
    incomingOrderNames.length === ccPriorNames.length;
  // An adoption is a byte change to the canonical array, so it can never be
  // "unchanged" however well the names line up.
  const orderMatches =
    sameSet && adopted.size === 0 && incomingOrderNames.every((name, i) => name === ccPriorNames[i]);

  // The absorb's precondition is SET-identity, not order-identity (decision
  // 2026-08-05): sort-stabilization (order 200) name-sorts tools[] on every
  // request, so incoming order is not a property this pipeline preserves —
  // and the canonical's own first-seen order goes on the wire either way, so
  // admitting a reordered-but-set-identical array changes zero wire bytes. A
  // description delta arriving ALONGSIDE an add or a removal is still not
  // this class and takes the reset it took before — the safety argument
  // ("the schema the model calls against is unchanged") needs every name
  // present with its schema byte-identical, which the scan above enforced.
  if (descriptionChanges.length > 0) {
    if (!sameSet) {
      return { action: "reset", knownTools: incomingTools, reason: "tool-schema-changed" };
    }
    // The canonical is the first-seen array — including any pending seed,
    // which must stay on the wire — with an adopted name's bytes replaced.
    return {
      action: "description-absorbed",
      knownTools: adopted.size === 0 ? priorKnownTools : priorOrderNames.map(canonicalOf),
      descriptionChanges,
    };
  }

  if (orderMatches) {
    return { action: "unchanged", knownTools: priorKnownTools };
  }

  const newTools = newNames.map((name) => incomingByName.get(name));
  const deferredNewTools = newTools.map((t) => ({ ...t, defer_loading: true }));
  // First-seen order, for every name ever known — held (removed) names and
  // pending seeds included, using the frozen object so wire bytes never drift
  // for a tool whose content didn't actually change.
  const heldOrPresentTools = priorOrderNames.map(canonicalOf);

  return {
    action: "rewrite",
    tools: heldOrPresentTools.concat(deferredNewTools),
    newNames,
    heldNames,
    knownTools: priorOrderNames.concat(newNames).map((name) => canonicalOf(name) ?? incomingByName.get(name)),
  };
}

// --- Wire shapes (documented mid-conversation-tool-changes contract) ---

// The tool_addition announcement: one system-ROLE message in messages[]
// carrying a tool_addition block per newly-added tool. The tool must
// already be in tools[] with defer_loading: true; the block references it
// by name. See the directive addendum for the placement constraints this
// satisfies.
export function buildToolAdditionMessage(toolNames) {
  return {
    role: "system",
    content: toolNames.map((name) => ({
      type: "tool_addition",
      tool: { type: "tool_reference", name },
    })),
  };
}

// The description announcement. Same carrier as tool_addition — one
// system-ROLE message in messages[], legalised by the same beta and
// re-injected by the same anchor machinery — but TEXT blocks, not
// tool_addition blocks: nothing is being added to tools[], so there is no
// tool to reference. The tool is already loaded and its schema is
// unchanged; the only thing the model is missing is the new prose, so the
// new prose is what the block carries, verbatim.
const DESCRIPTION_NOTICE_PREFIX = "The description of the `";
const DESCRIPTION_NOTICE_MARKER = "` tool has been updated. Its parameters are unchanged";

export function buildDescriptionChangeMessage(changes) {
  return {
    role: "system",
    content: changes.map(({ name, description }) => ({
      type: "text",
      text:
        `${DESCRIPTION_NOTICE_PREFIX}${name}${DESCRIPTION_NOTICE_MARKER} — ` +
        `call it exactly as before. Its current description is:\n\n${description}`,
    })),
  };
}

// Recognizer for the message the builder above produces, exported for
// replay's declared-injection exemption. It lives HERE, sharing the
// builder's own template constants, so the two cannot drift apart — a
// recognizer re-stating the prose in tools/ would silently stop matching
// the day the template changed, and the gate would go red on legitimate
// work. Shape-based rather than telemetry-keyed on purpose: replay must
// also strip an input-side ECHO of this message (a chained proxy feeding
// the pipeline its own output — the case that broke the tool_addition
// exemption one-sided on 2026-07-29), and an echo carries no telemetry.
export function isDescriptionNotice(msg) {
  if (!msg || msg.role !== "system" || !Array.isArray(msg.content) || !msg.content.length) return false;
  return msg.content.every(
    (b) =>
      b &&
      b.type === "text" &&
      typeof b.text === "string" &&
      b.text.startsWith(DESCRIPTION_NOTICE_PREFIX) &&
      b.text.includes(DESCRIPTION_NOTICE_MARKER),
  );
}

// Description notices ride in the SAME persisted `additions` list as
// tool_addition announcements (one injection mechanism, one anchor
// mechanism, one beta token) and are told apart by `kind` — entries
// written before this existed have none, which reads correctly as
// "addition" everywhere it is checked.
const DESCRIPTION_KIND = "description";

// Dedupe, and it is the difference between a steady state of one
// announcement and one per request: the canonical never absorbs the new
// prose, so the delta is re-detected on EVERY subsequent request. At most
// one description notice exists at a time; an unchanged signature leaves
// the persisted entry — and therefore the forwarded bytes — untouched, and
// a changed one replaces it in place, keeping the established anchor so the
// announcement does not also move.
export function upsertDescriptionNotice(additions, changes, anchorMsg) {
  const sig = JSON.stringify(changes);
  const existing = additions.find((a) => a.kind === DESCRIPTION_KIND);
  if (existing && existing.sig === sig) return additions;
  return additions
    .filter((a) => a.kind !== DESCRIPTION_KIND)
    .concat([
      {
        kind: DESCRIPTION_KIND,
        sig,
        names: changes.map((c) => c.name),
        anchorHash: existing?.anchorHash ?? anchorHash(anchorMsg),
        message: buildDescriptionChangeMessage(changes),
      },
    ]);
}

// Identity hash for an anchor message. hashMessageContent covers
// block-array content; string-content messages hash their raw string
// (same fallback family as insertion-normalization's content-derived
// identity — never positional).
export function anchorHash(msg) {
  const h = hashMessageContent(msg);
  if (h) return h;
  const c = msg?.content;
  if (typeof c === "string") return "s:" + createHash("sha256").update(c).digest("hex").slice(0, 16);
  return null;
}

// Splice persisted addition messages back into messages[] at their
// anchors. Pure: returns { messages, reanchored } without mutating input.
// Each addition lands immediately after the message whose identity hash
// matches its anchorHash; a vanished anchor (context-management prune)
// re-anchors after the LAST user message — the closest stable position
// that satisfies the "must follow a user message" placement constraint —
// and reports it so state can be updated and telemetry emitted.
//
// Resolution happens in a first pass against the ORIGINAL `messages` array
// (never mutated while resolving), so a SHARED anchor's landing position is
// computed once regardless of how many additions target it. This is what
// keeps the run FIFO — discovery order, oldest first — instead of the
// previous idx+1-per-addition splice, which re-found the same anchor fresh
// on every iteration (the search excludes role==="system", so
// already-injected additions were invisible to it) and always landed the
// newest addition closest to the anchor: a LIFO stack that reordered the
// already-forwarded prefix on every new addition (probe s-captureC,
// n=372-397, 25 stability violations during an MCP discovery cascade).
export function injectAdditions(messages, additions) {
  if (!Array.isArray(additions) || additions.length === 0) {
    return { messages, reanchored: [] };
  }

  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUserIdx = i;
      break;
    }
  }

  const reanchored = [];
  // Original-array index -> messages to inject right after it, in discovery
  // (oldest-first) order — the run for a shared anchor.
  const byAnchorIdx = new Map();

  for (const add of additions) {
    const idx = messages.findIndex((m) => m.role !== "system" && anchorHash(m) === add.anchorHash);
    let landingIdx = idx;
    if (idx < 0) {
      if (lastUserIdx >= 0) {
        landingIdx = lastUserIdx;
        // `kind` rides along only when set: the caller matches the report
        // back to its entry by (names, kind), and a description notice can
        // legitimately carry the same names as an addition for the same tool.
        reanchored.push({ names: add.names, anchorHash: anchorHash(messages[lastUserIdx]), ...(add.kind ? { kind: add.kind } : {}) });
      } else {
        // No user message at all — cannot satisfy the placement
        // constraint; skip this injection (the tool stays deferred and
        // unloaded this request; honest degradation, not a malformed
        // request).
        reanchored.push({ names: add.names, anchorHash: null, ...(add.kind ? { kind: add.kind } : {}) });
        continue;
      }
    }
    if (!byAnchorIdx.has(landingIdx)) byAnchorIdx.set(landingIdx, []);
    byAnchorIdx.get(landingIdx).push(add.message);
  }

  const out = [];
  messages.forEach((m, i) => {
    out.push(m);
    const injected = byAnchorIdx.get(i);
    if (injected) out.push(...injected);
  });

  return { messages: out, reanchored };
}

// The frozen tools[] to forward when additions exist: knownTools order,
// with every name covered by an addition marked defer_loading — the
// classifier's knownTools stores UNMARKED objects (fingerprints must
// match CC's raw array), so the marker is applied at forward time.
//
// Description notices are excluded from that name set: the tool they name
// is already loaded and stays loaded, and marking it defer_loading would
// both be a lie and change the very bytes the absorb exists to hold still.
//
// `preloadedNames` (row 6 step b, optional third argument so the existing
// caller in tools/probe-tool-addition.mjs is untouched) is the seeded-but-
// unannounced set. It needs the SAME marker for a different reason: those
// tools are in tools[] with no tool_addition block anywhere, so defer_loading
// is the only thing telling the API they are not loaded. Dropping the marker
// on a later request would both change tools[] and present an unannounced tool
// as loaded.
export function forwardedTools(knownTools, additions, preloadedNames = []) {
  const deferredNames = new Set(additions.filter((a) => a.kind !== DESCRIPTION_KIND).flatMap((a) => a.names));
  for (const name of preloadedNames) deferredNames.add(name);
  return knownTools.map((t) => (deferredNames.has(t.name) ? { ...t, defer_loading: true } : t));
}

// (Phase A's placeholder — a pseudo-XML text block appended to top-level
// body.system — was removed in Phase B: wrong shape, and decisively wrong
// location, since top-level system heads the cache prefix and every
// injection there would have busted the whole cache.)

// --- Beta header (additive token; reuses no state from auto-1m-guard, but
// mirrors its header-token parse/join idiom rather than reimplementing ad
// hoc string splitting) ---

function findBetaHeader(headers) {
  if (!headers) return null;
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === BETA_HEADER_NAME) return { key: k, raw: headers[k] };
  }
  return null;
}

function parseBetaTokens(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

export function addBetaToken(headers) {
  const found = findBetaHeader(headers);
  const tokens = found ? parseBetaTokens(found.raw) : [];
  if (tokens.includes(BETA_TOKEN)) return; // already present — idempotent
  tokens.push(BETA_TOKEN);
  const key = found ? found.key : BETA_HEADER_NAME;
  headers[key] = tokens.join(", ");
}

// --- Extension contract ---

export default {
  name: "deferred-tool-rewrite",
  description:
    "Phase A: hold tools[] byte-stable across a pure tool addition, announcing the new tool via an appended " +
    "tool_addition system block instead; also holds a harness-GC'd tool in place and pins output order to " +
    "first-seen (works around CC's mid-conversation deferred-tool-load and tool-GC cache busts)",
  enabled: false, // overridden by extensions.json
  order: 425,

  async onRequest(ctx) {
    if (!isEnabled()) return;
    if (!ctx || !ctx.body) return;

    const body = ctx.body;
    if (!Array.isArray(body.tools) || body.tools.length === 0) return;

    const dir = getSnapshotDir();
    const fs = DEFAULT_FS;
    const headers = ctx.headers || null;
    const sessionId = headers ? resolveSessionId(headers) : null;
    // D1 DUAL-READ (matrix row 26, operator GO 2026-08-10). Read under the
    // pre-pipeline identity, fall back to the rotated one ONCE, always WRITE
    // under the new one. Losing the baseline here is what row 26 measured at
    // 216,060 tokens: `no-baseline` forwards CC's raw array where the held
    // frozen order was being forwarded, so the prefix diverges above messages.
    const preConv = ctx.meta?.[PRE_PIPELINE_CONV] ?? null;
    const sessionKey = resolveToolRewriteSessionKey(headers, body, preConv);
    const rotatedKey = resolveToolRewriteSessionKey(headers, body);

    try {
      const incomingTools = body.tools;
      let prior = await loadState(dir, sessionKey, fs);
      // The BRIDGE, named as one. RETIREMENT TRIGGER: identical to
      // insertion-normalization's, and deliberately the same window so the two
      // retire together rather than leaving one half-migrated — remove this
      // fallback once the `oldKeyFallback: true` records this extension writes
      // into its own `<key>-deferred-tool-events.jsonl` have been absent for
      // SEVEN CONSECUTIVE DAYS. The instrument is `gate-live`'s
      // `collectD1Retirement`, which walks that directory on every sweep and
      // reports `d1OldKeyFallback { hits, newestUtc, filesScanned, window }` in
      // `gate-status.json` (the twin comment in insertion-normalization carries
      // the full reading rules). Read `hits` with `filesScanned` — zero files
      // scanned is could-not-verify, not a clean zero. A sustained VERIFIED
      // zero over the window discharges the bridge — never an impression that
      // "everything has migrated by now".
      // The same status object carries `d1PostRelocationNoBaseline`, which
      // counts THIS extension's `no-baseline` actions correlated with an
      // insertion-normalization fallback hit: dual-read landing on one consumer
      // and missing on the other. Post-D1 zero; a non-zero is row 26 re-opening.
      if (prior === null && rotatedKey !== sessionKey) {
        prior = await loadState(dir, rotatedKey, fs);
        if (prior !== null) {
          ctx.meta = ctx.meta || {};
          ctx.meta[OLD_KEY_HIT] = true;
        }
      }
      // The pending seeds are an INPUT to the classifier, not an afterthought:
      // they are the difference between our persisted array and CC's, and
      // every identity test in there is about CC's set (classifyToolChange's
      // definition paragraph).
      const priorPreloaded = prior?.preloaded ?? [];
      let result = classifyToolChange(incomingTools, prior?.tools ?? null, priorPreloaded);

      const announceOk = supportsToolAddition(body?.model);

      // --- PRELOAD (row 6 step b) ---------------------------------------
      // Three acts, in this order, and the order matters: LEARN from what CC
      // actually sent (so the store is never a restated copy of a schema
      // nobody serves), SEED only a brand-new baseline, and ANNOUNCE a seeded
      // name at the request where CC finally sends it.
      const wantPreload = preloadNames();
      // Carried forward on every request; a reset re-baselines against CC's
      // own array, which by definition already contains whatever it sends, so
      // nothing stays pending across one.
      let preloadPending = result.action === "reset" ? [] : priorPreloaded;
      let preloadSeeded = [];
      let preloadAnnounced = [];
      let preloadFallback = null;
      // Built here, appended to `additions` below — `additions` is derived
      // from `result` further down, and this block can still change `result`.
      let additionsFromPreload = null;

      if (wantPreload.length > 0) {
        const store = await loadPreloadStore(dir, fs);

        const learnable = preloadLearnable(incomingTools, store, wantPreload);
        if (learnable.length > 0) {
          const now = new Date().toISOString();
          for (const t of learnable) store.tools[t.name] = { learnedAt: now, tool: t };
          try {
            await savePreloadStore(dir, store, fs);
          } catch (err) {
            // A store we could not write is a seed we will not have next
            // conversation — never a reason to fail the request in flight.
            debug(`preload store write failed: ${err?.message ?? err}`);
          }
        }

        // SEED: a FRESH CONVERSATION only, allowlisted model only. Never a
        // retrofit — adding a name to a conversation that already has a
        // persisted array changes tools[] mid-flight, i.e. causes the class
        // this prevents.
        //
        // `no-baseline` alone does NOT establish that: it is a fact about the
        // state FILE, and this extension's key carries a conversation sub-key
        // that has been measured rotating mid-conversation (s-captureAB,
        // n=331->336), which makes turn 7 of a live session classify
        // `no-baseline` and seed into it — wire 8 tools -> 9. So the request's
        // own history has to say that nothing has been answered here yet:
        // isConversationBirth, which carries the measurement behind the test
        // and the reason it is structural rather than a message count.
        if (result.action === "no-baseline" && announceOk && isConversationBirth(body.messages)) {
          const seeds = preloadSeedTools(incomingTools, store, wantPreload);
          if (seeds.length > 0) {
            preloadSeeded = seeds.map((t) => t.name);
            preloadPending = preloadPending.concat(preloadSeeded);
            result = { ...result, knownTools: incomingTools.concat(seeds) };
          }
        }
      }

      // ANNOUNCE-ON-ARRIVAL. By now the name is KNOWN, so the classifier never
      // lists it in `newNames` — this is the drain the header calls out as NOT
      // being the new-name path.
      //
      // DELIBERATELY OUTSIDE the `wantPreload` gate above, and that placement
      // is load-bearing: turning the gate off must not bust the conversations
      // already seeded under it (their persisted array still carries the
      // name), and it must not strand them either — a drain that only ran
      // while the gate is on would leave an already-seeded tool permanently
      // uncallable the moment the operator removed a name from the list. The
      // gate governs LEARNING and SEEDING, never the obligations already
      // outstanding.
      if (preloadPending.length > 0) {
        const arrived = preloadPending.filter((name) =>
          incomingTools.some((t) => t?.name === name),
        );
        const canAnnounceHere = announceOk && Array.isArray(body.messages) && body.messages.length > 0;
        // ABANDON, and it fires on the MODEL as well as on the arrival. A
        // seeded conversation whose model has since changed to one outside the
        // allowlist can never announce, so its pending name would sit in
        // tools[] uncallable forever — and we would be putting defer_loading
        // plus the beta token in front of a model that has 400'd on this
        // contract. One honest bust, named in telemetry, beats either.
        if (!announceOk || (arrived.length > 0 && !canAnnounceHere)) {
          preloadFallback = preloadPending;
          preloadPending = [];
          result = { action: "reset", knownTools: incomingTools, reason: "preload-unannounceable" };
        } else if (arrived.length > 0) {
          preloadAnnounced = arrived;
          preloadPending = preloadPending.filter((name) => !arrived.includes(name));
          additionsFromPreload = {
            names: arrived,
            anchorHash: anchorHash(body.messages[body.messages.length - 1]),
            message: buildToolAdditionMessage(arrived),
          };
        }
      }

      // FALLBACK, and it is load-bearing: absorbing a description delta is
      // only honest because the model is TOLD the new prose in-band. Where
      // there is no channel to tell it on — an un-allowlisted model, or no
      // message to anchor to — the absorb is not available and the honest
      // reset stands. `descriptionFallback` keeps the real cause visible;
      // without it this reset is indistinguishable in telemetry from a
      // genuine schema change, which is the class it exists to separate.
      const canAnnounce = announceOk && Array.isArray(body.messages) && body.messages.length > 0;
      let descriptionFallback = null;
      if (result.action === "description-absorbed" && !canAnnounce) {
        descriptionFallback = result.descriptionChanges.map((c) => c.name);
        result = { action: "reset", knownTools: incomingTools, reason: "tool-schema-changed" };
      }

      // Carry prior additions forward except on reset (a schema change
      // re-baselines everything — the harness's own tools[] becomes truth
      // and pending injections are abandoned with it).
      let additions = result.action === "reset" ? [] : (prior?.additions ?? []);
      // The preload's own announcement, if a seeded name arrived this request.
      // Appended here rather than at the site that built it, so it goes
      // through the same reset/model gating every other addition does.
      if (additionsFromPreload && result.action !== "reset") {
        additions = additions.concat([additionsFromPreload]);
      }

      // Model gate, applied at the single point everything downstream reads.
      // Emptying `additions` here disables the announcement, the
      // defer_loading markers forwardedTools() derives from it, AND the beta
      // header — one place rather than three, and it also neutralises state
      // persisted before this gate existed (a session that accumulated
      // additions under the old build must not keep replaying them into a
      // model that 400s on them).
      if (!announceOk) additions = [];

      // A suppressed announcement is a real cost and must not be silent: the
      // session pays a full-prefix bust per tool load exactly as if this
      // extension were absent. The documented availability rule is "Opus
      // onward", so a NEW model family landing here is most likely
      // support-capable and unprobed — the warning names the probe so the
      // gap closes in minutes instead of surviving until someone reads
      // telemetry. Once per model per process; the telemetry entry carries
      // `suppressed` on every occurrence.
      const suppressed =
        !announceOk && result.action === "rewrite" && (result.newNames?.length ?? 0) > 0;
      if (suppressed && !warnedSuppressedModels.has(body?.model)) {
        warnedSuppressedModels.add(body?.model);
        process.stderr.write(
          `[deferred-tool-rewrite] model ${body?.model} is not allowlisted for tool_addition — ` +
            `tools[] busts are being paid (${result.newNames.join(",")}). ` +
            `Probe it: see tools/probe-tool-addition.mjs (big models need the through-proxy method).\n`,
        );
      }

      // The announcement path is gated on model support; the HOLD and
      // ORDER-PIN paths are not, because neither needs the beta contract —
      // they only ever re-send tools the model already understands.
      if (
        announceOk &&
        result.action === "rewrite" &&
        result.newNames.length > 0 &&
        Array.isArray(body.messages) &&
        body.messages.length > 0
      ) {
        // New tool(s): ONE addition message covering them all, anchored
        // after the current last message. Injected below with any prior
        // additions, and persisted for re-injection on every subsequent
        // request (the API is stateless — see file header).
        const anchorMsg = body.messages[body.messages.length - 1];
        additions = additions.concat([
          {
            names: result.newNames,
            anchorHash: anchorHash(anchorMsg),
            message: buildToolAdditionMessage(result.newNames),
          },
        ]);
      }

      // The DECISION this request made about every genuinely new tool name,
      // surfaced rather than left implicit in the branch above — the ground
      // truth threat-matrix row 6 asked for and `mutatedBy` cannot answer
      // (it proves the extension ran, never what it decided). A new name
      // either gets announced (tool_addition block, defer_loading:true, the
      // documented mid-conversation contract) or it enters tools[] with no
      // announcement at all — indistinguishable on the wire from what an
      // unmitigated pass-through would have produced. `willAnnounce` mirrors
      // the gating condition immediately above byte-for-byte so the two
      // cannot drift apart.
      const newNames = result.newNames ?? [];
      const willAnnounce = canAnnounce && result.action === "rewrite" && newNames.length > 0;
      const announcedNames = willAnnounce ? newNames : [];
      // announceOk false -> the model gate (no allowlisted channel at all);
      // announceOk true but canAnnounce false -> messages[] was empty, so
      // there was nothing to anchor the announcement to. These are the only
      // two ways to reach this branch (canAnnounce === announceOk &&
      // messages-present), so the reason is never ambiguous.
      const passthrough =
        result.action === "rewrite" && newNames.length > 0 && !willAnnounce
          ? newNames.map((name) => ({
              name,
              reason: announceOk ? "no-anchor-message" : "model-not-allowlisted",
            }))
          : [];

      // The description absorb's other half: the canonical tools[] goes on
      // the wire unchanged (below), so the new prose has to reach the model
      // here or not at all. Anchored after the current last message like an
      // addition, and upserted rather than appended — see the dedupe note on
      // upsertDescriptionNotice.
      if (result.action === "description-absorbed") {
        additions = upsertDescriptionNotice(
          additions,
          result.descriptionChanges,
          body.messages[body.messages.length - 1],
        );
      }

      // Forward the frozen array whenever we hold state: rewrite uses the
      // classifier's held order; "unchanged" ALSO re-forwards it when
      // additions exist, because CC's incoming array never carries our
      // defer_loading markers — forwarding it raw would silently un-defer
      // every added tool. no-baseline and reset pass through untouched.
      if (result.action === "rewrite") {
        body.tools = forwardedTools(result.knownTools, additions, preloadPending);
      } else if (result.action === "no-baseline" && preloadSeeded.length > 0) {
        // The ONE case where a fresh baseline does not forward CC's array
        // untouched: the seed appended names CC did not send, so the wire has
        // to carry them from the very first request. Forwarding the raw array
        // here and the seeded one next request would move tools[] at request
        // 2 — the bust, one turn later.
        body.tools = forwardedTools(result.knownTools, additions, preloadPending);
      } else if (result.action === "unchanged" || result.action === "description-absorbed") {
        // ALWAYS re-forward the frozen array here, not only when additions
        // exist. Two reasons, and the second was measured the hard way:
        //   - CC's incoming array never carries our defer_loading markers, so
        //     forwarding it raw would silently un-defer every added tool;
        //   - "unchanged" now means "identical after volatile stripping",
        //     which includes descriptions that differ ONLY by the per-session
        //     console URL. Forwarding CC's raw array in that case would put
        //     the flip straight back on the wire and invalidate tools[] —
        //     making the identity fix pointless. The frozen array is the
        //     first-seen form, so the wire stays byte-stable.
        // "description-absorbed" shares this branch because it wants exactly
        // the same thing, for a third variant of the same reason: its
        // knownTools IS the frozen first-seen array (the classifier returns
        // the prior one untouched), and forwarding CC's array instead would
        // put the description delta on the wire — the whole bust the absorb
        // exists to prevent.
        body.tools = forwardedTools(result.knownTools, additions, preloadPending);
      }

      let reanchored = [];
      if (additions.length > 0 && Array.isArray(body.messages)) {
        const injected = injectAdditions(body.messages, additions);
        body.messages = injected.messages;
        reanchored = injected.reanchored;
        if (reanchored.length > 0) {
          additions = additions.map((a) => {
            const r = reanchored.find(
              (x) => x.names.join() === a.names.join() && (x.kind ?? null) === (a.kind ?? null),
            );
            return r && r.anchorHash ? { ...a, anchorHash: r.anchorHash } : a;
          });
        }
        // Beta token whenever a deferred tool / injected message is on
        // the wire — every request after the first addition.
        if (headers) addBetaToken(headers);
      }
      // A pending preload puts defer_loading on the wire with NO injected
      // message, so the branch above cannot cover it — and defer_loading is
      // part of the same beta as the tool_addition block. Without this the
      // very first seeded request sends a beta field under no beta header.
      if (preloadPending.length > 0 && headers) addBetaToken(headers);

      await saveState(
        dir,
        sessionKey,
        { tools: result.knownTools, additions, preloaded: preloadPending },
        fs,
      );

      ctx.meta = ctx.meta || {};
      ctx.meta.deferredToolRewriteStats = {
        action: result.action,
        newNames: result.newNames ?? [],
        heldNames: result.heldNames ?? [],
        reason: result.reason ?? null,
        injected: additions.length,
        reanchored: reanchored.filter((r) => r.anchorHash).length,
        // Always present, [] when nothing of the kind happened this
        // request — never omitted, so "ran and decided nothing" stays
        // distinguishable from "never ran" (ctx.meta.deferredToolRewriteStats
        // itself absent) one level up, at any consumer that reads this object.
        announcedNames,
        passthrough,
        // Always present, [] / 0 when no preload is configured — same stance
        // as announcedNames above: "ran and preloaded nothing" must stay
        // distinguishable from "never ran" at every consumer.
        preloadSeeded,
        preloadAnnounced,
        preloadPending: preloadPending.length,
        ...(result.descriptionChanges
          ? { descriptionChangedNames: result.descriptionChanges.map((c) => c.name) }
          : {}),
        ...(descriptionFallback ? { descriptionFallback } : {}),
        ...(preloadFallback ? { preloadFallback } : {}),
      };

      await appendTelemetry(
        dir,
        sessionKey,
        {
          ts: new Date().toISOString(),
          key: sessionKey,
          sid: sessionId,
          action: result.action,
          newNames: result.newNames ?? [],
          heldNames: result.heldNames ?? [],
          injected: additions.length,
          // D1's RETIREMENT COUNTER (matrix row 26) — same field name and same
          // reason as insertion-normalization's, so one grep answers the
          // retirement question across both consumers rather than two.
          ...(ctx.meta?.[OLD_KEY_HIT] ? { oldKeyFallback: true, oldKey: rotatedKey } : {}),
          ...(result.descriptionChanges
            ? { descriptionChangedNames: result.descriptionChanges.map((c) => c.name) }
            : {}),
          ...(descriptionFallback ? { descriptionFallback } : {}),
          // Preload fields are OMITTED when empty rather than always written:
          // this file is one line per request on every session on the machine,
          // and three permanently-empty arrays per line is real bytes. The
          // reader's rule is the one this repo already pays for elsewhere —
          // absence here means "no preload act", and the presence of the
          // extension's own line is what proves it ran.
          ...(preloadSeeded.length > 0 ? { preloadSeeded } : {}),
          ...(preloadAnnounced.length > 0 ? { preloadAnnounced } : {}),
          ...(preloadFallback ? { preloadFallback, model: body?.model } : {}),
          ...(suppressed ? { suppressed: true, model: body?.model } : {}),
          ...(reanchored.length > 0 ? { reanchored } : {}),
          ...(result.reason ? { reason: result.reason } : {}),
        },
        fs,
      );

      if (isDebug()) {
        process.stderr.write(
          `[deferred-tool-rewrite] action=${result.action}` +
            (result.newNames ? ` new=${result.newNames.join(",")}` : "") +
            (result.heldNames && result.heldNames.length ? ` held=${result.heldNames.join(",")}` : "") +
            (result.descriptionChanges ? ` desc=${result.descriptionChanges.map((c) => c.name).join(",")}` : "") +
            (descriptionFallback ? ` descFallback=${descriptionFallback.join(",")}` : "") +
            (preloadSeeded.length ? ` preloadSeeded=${preloadSeeded.join(",")}` : "") +
            (preloadAnnounced.length ? ` preloadAnnounced=${preloadAnnounced.join(",")}` : "") +
            (preloadFallback ? ` preloadFallback=${preloadFallback.join(",")}` : "") +
            (result.reason ? ` reason=${result.reason}` : "") +
            "\n",
        );
      }
    } catch (err) {
      debug(`onRequest unexpected: ${err?.message ?? err}`);
    }
  },
};
