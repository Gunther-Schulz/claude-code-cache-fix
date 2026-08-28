#!/usr/bin/env node
// harvest — promote NOVEL request pairs from live captures into permanent,
// committable regression fixtures.
//
// Usage:
//   node tools/harvest.mjs [--captures DIR] [--out DIR] [--ledger FILE]
//                          [--dry-run] [--json]
//   node tools/harvest.mjs --captures DIR --pin <key> <n>..<m> [--bounded]
//     --bounded keeps only the busting request's own conversation and its
//     sameLineage union, dropping the rest as ordinal-preserving
//     placeholders — for a late event in a large capture, where the
//     unbounded default's full 0..m prefix would freeze hundreds of MB.
//     See the "--pin --bounded" section below.
//
// The problem it solves. Live captures are the only source of real CC
// behaviour, and they are transient: measured 2026-07-28, one day of use
// produced 677 MB against a 2 GB cap that deletes oldest-first — roughly
// three days of retention. Every finding in that session came from two
// captures that would have been gone within the week. Meanwhile 94.5% of
// captured request pairs are plain appends carrying nothing we do not
// already know, and capture size grows QUADRATICALLY with session length
// (each request re-sends the whole history), so keeping everything is not an
// option either.
//
// So: keep the ~5% that is structurally novel, discard the rest, and make
// what is kept safe to commit.
//
// Runs BOTH scheduled and ad-hoc: cache-fix-harvest.timer fires it twice
// daily (fixtures, shape watch and growth snapshots must not depend on
// someone remembering), and the ledger is what makes every run idempotent —
// watermarks track what has been harvested, so a manual run between timer
// firings harvests nothing twice and a month of silence catches up in one
// pass. Silent failure of the schedule is watched: shape-verdicts warns when
// the newest ledger entry goes stale (HARVEST_MAX_AGE_H).
//
// --- Why a ledger with WATERMARKS, not a "harvested" flag ---
//
// A capture file is append-only and keyed by session-id, so a session that
// resumes keeps growing the same file. A boolean flag would freeze coverage
// at whatever the file contained the first time it was seen — a session
// harvested at 400 requests and later grown to 900 would have its last 500
// permanently invisible. The watermark records how far we got; the next run
// resumes there.
//
// It also removes the need to know whether a session is "finished", a
// question with no reliable answer: sessions end by crash, by sleep, by
// /clear, or never.
//
// --- Sanitization ---
//
// Captures contain real conversation content. Fixtures must be committable,
// so every text body is replaced by a deterministic token derived from its
// hash. This is safe precisely because every class we chase is STRUCTURAL —
// shape flips, splits, prunes, splices, reorders. The text is irrelevant;
// only the arrangement matters.
//
// Two things survive verbatim, because for them the content IS the class:
//   - <system-reminder> WRAPPER TAGS (the volatile-block detector matches on
//     the wrapper, so replacing it would erase the very property under
//     test); the text they wrap is still tokenized like any other text
//     (scrubText), not replaced by a fixed placeholder — a fixed
//     placeholder made every reminder hash identically regardless of real
//     content, which breaks the separate class where a reminder migrates
//     OUT of its wrapper into a standalone duplicate message and must still
//     hash-match its wrapped original post-scrub (see scrubText's comment)
//   - structural ids: tool_use_id / id pairs, which must stay consistent or
//     the tool-adjacency invariant breaks
//
// Tool SCHEMAS are dropped rather than sanitized: they carry descriptions
// and parameter docs, and no message-shape class depends on them.
//
// Two classes below the text layer, added 2026-07-31 after both were found
// LIVE in committed fixtures (docs/audits/pr-prep-2026-07-31/pr-prep-report.md;
// docs/directives/fixture-sanitization-directive.md):
//
//   - NESTED PAYLOADS. A block's binary content sits at `block.source.data`,
//     one level below the `block.data` this scrubber redacted, so five raw
//     PNGs rode into a public repo behind a header claiming the fixture kept
//     "no raw text at all". scrubBlock now recurses into `source` and fails
//     CLOSED there: `data` always, plus any other string over 64 chars.
//   - STRUCTURAL CAPTURE IDENTIFIERS. Session keys/sids and wall-clock
//     timestamps are not conversation content, so the text scrub never saw
//     them; they identify a real session, a real machine and a real moment.
//     Keys and sids become `s-<sha256-prefix-12>` (sidToken) — same hashing
//     scheme, `s-` prefix kept so readers that pattern-match it still work —
//     and timestamps are rebased onto a FIXED epoch keeping their intra-
//     fixture deltas (rebaseTimestamps), so ordering and proximity joins
//     survive with the wall-clock gone. The same token names the FIXTURE
//     FILE, so no session UUID survives in a filename either.
//
// Accepted residual (operator ruling 2026-07-31, local operator-controlled
// traffic): token lengths, paragraph structure, intra-fixture timing deltas,
// and equality relations. See the audience caveat on scrubText below.

import { tmpDir } from "./tmpdir.mjs";
import { readdir, readFile, writeFile, stat, mkdir, rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { hostname } from "node:os";
import { dataPath, legacyReadPath } from "../proxy/xdg-dirs.mjs";

import { censusPair, compactEntry, conversationOf, sameLineage } from "./replay.mjs";
import { readLines } from "./read-lines.mjs";
import { isCaptureRequestRecord } from "./logs.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CAPTURES = process.env.CACHE_FIX_CAPTURE_DIR
  || legacyReadPath(dataPath("captures"), "cache-fix-captures");
const DEFAULT_OUT = join(__dirname, "..", "test", "fixtures", "harvested");
// PER-MACHINE ledger. Fixtures are committed and therefore shared across
// machines — which is the point, since a bust class found on one machine
// should regress-test on both. Fixture FILENAMES already cannot collide (they
// embed the capture key and request index), but a single shared ledger would
// conflict on every merge: both machines write the same file, and the
// watermarks inside are machine-local facts about machine-local captures.
// Splitting by hostname makes the conflict structurally impossible and makes
// "which machine still has unharvested captures" readable at a glance.
const LEDGER_HOST = (process.env.CACHE_FIX_HARVEST_HOST || hostname() || "unknown").replace(
  /[^A-Za-z0-9._-]/g,
  "_",
);
export const DEFAULT_LEDGER = join(
  __dirname,
  "..",
  "test",
  "fixtures",
  "harvested",
  `LEDGER-${LEDGER_HOST}.json`,
);

const sha = (s) => createHash("sha256").update(s).digest("hex");

// --- Sanitization ---

const VOLATILE_WRAP = /^<system-reminder>\n([\s\S]*)\n<\/system-reminder>\s*$/;

// Deterministic placeholder: same input text always yields the same token, so
// a message that repeats across requests still compares equal — which is the
// whole point, since identity matching is what we are testing.
//
// A wrapped reminder re-wraps its OWN deterministic token instead of a fixed
// constant. A fixed constant ("REDACTED" for every reminder regardless of
// content) was tried first and is wrong: CC sometimes migrates a reminder
// OUT of its wrapper into a standalone duplicate message
// (insertion-normalization.mjs's findSuppressibleDuplicate/
// unwrapVolatileText compares the wrapped original's stripped bytes against
// the standalone copy's bytes to suppress the duplicate). A fixed constant
// made the wrapped original hash to "REDACTED" while the unwrapped
// duplicate — never matching VOLATILE_WRAP — hashed its real text
// independently, so the two never matched post-scrub and the suppression
// class became unobservable in any fixture built from it (measured
// empirically while building the harvest --pin fixture for capture
// s-captureA n=26->28: suppressed count 1->0, outputForm "append"->
// "splice@31" under the fixed-constant scrub). Recursing scrubText on the
// captured inner text keeps both sides deterministic and equal when their
// real bytes were equal, wrapped or not — the wrapper tags still survive
// verbatim, so a check that only tests for wrapper PRESENCE is unaffected.
//
// PER SEGMENT, not per whole text: the scrub is a homomorphism over "\n\n".
// Tokenizing whole texts destroyed the relations that DEFINE the classes we
// harvest for — measured, not inferred (extended-absorb-report §c5):
// `scrub(a + "\n\n" + b) !== scrub(a) + "\n\n" + scrub(b)`, so a fixture
// pinned for a merged-standalone pair could not reproduce the class it was
// pinned for. "\n\n" is the domain's join and nothing narrower: the census's
// canonical()/classify() join stripped reminder blocks with it, and
// insertion-normalization's duplicate suppression compares the same join.
// Splitting on it makes both survive scrubbing (test/harvest-scrub-relations
// .test.mjs). A boundary that lands inside a longer newline run re-splits and
// loses the relation — that degrades to the old whole-text behaviour, no
// crash and no leak, and sub-paragraph relations are not promised at all.
//
// Audience caveat on the privacy delta. Per-segment tokens expose paragraph
// COUNT, per-paragraph LENGTHS, and cross-text sharing of identical
// paragraphs, where whole-text tokens exposed one total length and whole-text
// equality. No content bytes either way. That delta is accepted for THIS
// deployment because the captured traffic is local and operator-controlled
// (operator ruling 2026-07-31). Anyone harvesting non-local or third-party
// traffic must re-make that judgment before committing fixtures publicly: a
// length vector can fingerprint a known public text that a single total
// length would not.
const PARA_SEP = "\n\n";
// Longest string under `source` that counts as a shape field rather than a
// payload. The known shape fields (`type`, `media_type`, `url`-style short
// forms) sit far below this; an unknown longer one is treated as content. The
// asymmetry is deliberate: a shape field wrongly tokenized is an unreadable
// but visible token in a fixture, while a payload wrongly passed is a silent
// leak into a public repo.
const SOURCE_SHAPE_MAX = 64;
function scrubText(text) {
  if (typeof text !== "string") return text;
  const wrapped = VOLATILE_WRAP.exec(text);
  if (wrapped) return `<system-reminder>\n${scrubText(wrapped[1])}\n</system-reminder>`;
  // An empty segment carries no bytes, so there is nothing to tokenize; it
  // stays empty and the separators around it survive untouched.
  return text
    .split(PARA_SEP)
    .map((seg) => (seg === "" ? "" : `t_${sha(seg).slice(0, 12)}_${seg.length}`))
    .join(PARA_SEP);
}

function scrubBlock(block) {
  if (typeof block === "string") return scrubText(block);
  if (!block || typeof block !== "object") return block;
  const out = { ...block };
  if (typeof out.text === "string") out.text = scrubText(out.text);
  if (typeof out.thinking === "string" && out.thinking !== "") out.thinking = scrubText(out.thinking);
  if (typeof out.signature === "string") out.signature = `sig_${sha(out.signature).slice(0, 10)}`;
  if (typeof out.data === "string") out.data = `data_${sha(out.data).slice(0, 10)}`;
  // The payload one level down. `source.data` is where the wire actually
  // carries image bytes; `type`/`media_type` and the other short shape fields
  // are structure and survive, because a reader branching on them is testing
  // the block's KIND. Fail CLOSED on everything else: the wire format is not
  // ours to freeze, so an unrecognised string over 64 chars under `source` is
  // treated as a payload rather than waved through.
  if (out.source && typeof out.source === "object" && !Array.isArray(out.source)) {
    out.source = Object.fromEntries(
      Object.entries(out.source).map(([k, v]) =>
        typeof v === "string" && (k === "data" || v.length > SOURCE_SHAPE_MAX)
          ? [k, `data_${sha(v).slice(0, 10)}`]
          : [k, v],
      ),
    );
  }
  // tool_result content can be a string or a block array.
  if (typeof out.content === "string") out.content = scrubText(out.content);
  else if (Array.isArray(out.content)) out.content = out.content.map(scrubBlock);
  // Tool inputs are arbitrary user data; keep only the key SHAPE.
  if (out.input && typeof out.input === "object") {
    out.input = Object.fromEntries(Object.keys(out.input).map((k) => [k, "REDACTED"]));
  }
  return out;
}

export function scrubMessage(msg) {
  if (!msg || typeof msg !== "object") return msg;
  const out = { ...msg };
  if (typeof out.content === "string") out.content = scrubText(out.content);
  else if (Array.isArray(out.content)) out.content = out.content.map(scrubBlock);
  return out;
}

// --- Structural identifiers: keys, sids, wall-clock ---
//
// A conversation key or sid is a live capture identifier, not content, so the
// text scrub never touched it. Same hashing scheme as everything else, and the
// `s-` prefix of a real key is kept so a reader that pattern-matches `s-…`
// still works. Distinctness is preserved (different originals hash apart) and
// so is equality (the same original always yields the same token), which is
// what lets a fixture still show "these records are one conversation".
export const sidToken = (original) => `s-${sha(original).slice(0, 12)}`;

// Rebased onto a fixed epoch, keeping every DELTA from the fixture's earliest
// instant. Ordering survives, so does proximity — bust-triage-style ±window
// joins still work INSIDE a fixture — while the wall-clock (which machine, at
// what hour, in what timezone) is gone. Fixture-wide by necessity: the
// earliest instant is a property of the whole artifact, not of one record,
// which is why this runs at fixture-WRITE time rather than inside scrubRecord.
export const FIXED_EPOCH = "2000-01-01T00:00:00.000Z";
const FIXED_EPOCH_MS = Date.parse(FIXED_EPOCH);
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

// Whole-string instants only. A date inside authored prose (a fixture's own
// "measured on 2026-07-30" provenance note, a growth artifact's filename) is
// documentation the artifact exists to carry, not capture data.
function mapStrings(node, fn) {
  if (typeof node === "string") return fn(node);
  if (Array.isArray(node)) return node.map((v) => mapStrings(v, fn));
  if (node && typeof node === "object") {
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, mapStrings(v, fn)]));
  }
  return node;
}

export function rebaseTimestamps(fixture) {
  let earliest = null;
  mapStrings(fixture, (s) => {
    if (!ISO_INSTANT.test(s)) return s;
    const t = Date.parse(s);
    if (Number.isFinite(t) && (earliest === null || t < earliest)) earliest = t;
    return s;
  });
  if (earliest === null) return fixture;
  return mapStrings(fixture, (s) => {
    if (!ISO_INSTANT.test(s)) return s;
    const t = Date.parse(s);
    return Number.isFinite(t) ? new Date(FIXED_EPOCH_MS + (t - earliest)).toISOString() : s;
  });
}

export function scrubRecord(rec) {
  const body = rec.body ?? {};
  const system = Array.isArray(body.system)
    ? body.system.map(scrubBlock)
    : typeof body.system === "string"
      ? scrubText(body.system)
      : body.system;
  return {
    ts: rec.ts,
    sid: rec.sid ? sidToken(rec.sid) : null,
    key: rec.key ? sidToken(rec.key) : null,
    headers: { "anthropic-beta": rec.headers?.["anthropic-beta"] ?? null },
    body: {
      model: body.model,
      system,
      // Tool definitions carry descriptions and parameter docs and no
      // message-shape class depends on them; keep the NAMES so tools[]
      // add/remove/reorder classes stay observable.
      tools: Array.isArray(body.tools) ? body.tools.map((t) => ({ name: t?.name })) : undefined,
      messages: Array.isArray(body.messages) ? body.messages.map(scrubMessage) : [],
    },
  };
}

// --- Ledger ---

// The ledger's key is a LOOKUP, not a record — so it does not need to be the
// capture key, and it should not be.
//
// It was, and that put 94 full session identifiers into a tracked file in a
// public repo. They were invisible to the hygiene scan for a second reason
// (object KEY names were never scanned until 2026-08-05), so nothing said so.
// The allowlist entry that covers this file was read as covering the ids too;
// it never did — it covers the `lastHarvest` timestamps, which ARE this
// file's content.
//
// Hashing is free here because nothing compares a ledger key to anything
// outside the ledger: it is derived from the capture FILENAME below, used only
// to index `ledger.keys`, and the cross-machine merge reads `Object.values`
// and never the keys. The file is also per-machine and regenerable, so the
// worst case of a bad migration is one redundant harvest pass.
export const ledgerKey = (k) => (k.startsWith("k_") ? k : `k_${sha(k).slice(0, 16)}`);

// Migrate on LOAD rather than with a one-shot script: the mapping is
// deterministic, so an old ledger converts on first read and its watermarks
// (request counts, banked classes) survive. A load-time migration also means
// no machine needs to run anything to be fixed — the next harvest does it.
export async function loadLedger(path) {
  let raw;
  try {
    raw = JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return { version: 1, keys: {} };
  }
  const keys = {};
  for (const [k, v] of Object.entries(raw.keys ?? {})) keys[ledgerKey(k)] = v;
  return { ...raw, version: 1, keys };
}

// --- Harvest ---

const conversationId = (msgs) => (msgs?.length ? sha(JSON.stringify(msgs[0])).slice(0, 12) : null);

// A pair is novel when its structural class is one we have not banked yet.
// "append-only" and "identical" are never novel — they are the 94.5% baseline.
const BORING = new Set(["append-only", "identical"]);

// Records may be a plain array (tests, small corpora) or a lazy accessor —
// see scanCapture, which keeps only ONE request per conversation resident so
// a multi-hundred-MB capture does not become multi-GB of live objects.
export function selectNovelPairs(records, seenClasses) {
  const groups = new Map();
  records.forEach((rec, i) => {
    const cid = conversationId(rec.body?.messages);
    if (cid === null) return;
    if (!groups.has(cid)) groups.set(cid, []);
    groups.get(cid).push(i);
  });
  const picks = [];
  for (const idxs of groups.values()) {
    for (let k = 1; k < idxs.length; k++) {
      const a = records[idxs[k - 1]];
      const b = records[idxs[k]];
      const kind = censusPair(a.body?.messages ?? [], b.body?.messages ?? []);
      if (BORING.has(kind)) continue;
      if (seenClasses.has(kind)) continue;
      seenClasses.add(kind);
      picks.push({ kind, prev: idxs[k - 1], cur: idxs[k] });
    }
  }
  return picks;
}

// --- Shape watch: the two dormant thinking classes, plus baseline growth ---
//
// Both classes were measured INACTIVE on 2026-07-29 and would otherwise be
// watched by nothing. This is the mechanism that replaces the one-off probes:
// harvest already parses every record twice a day, so the counters ride the
// existing scan and land in the per-machine ledger, where a checker can WARN
// the day either class activates.
//
//   thinkingTextCompleted — thinking blocks with NON-EMPTY text in completed
//     assistant turns of each conversation's newest request. Measured today:
//     0 everywhere (all 277 deep-history blocks are signature-only stubs).
//     Non-zero means CC started re-sending completed-turn thinking content
//     (CC#69568's population reappearing) — quiet context growth with no
//     bust to make it loud, which is exactly why nothing else would notice.
//   thinkingDropPairs — consecutive same-conversation pairs where a thinking
//     block left the SHARED history region (CC#76253's class; measured 2 of
//     323 pairs today, context-pruning-shaped). A rate jump means per-turn
//     mid-history rewrites.
//   systemBytes / toolsBytes — serialized size of the newest request's
//     system[] and tools[], max across conversations. The quiet-growth
//     baseline: version-inflated prompts (CC#47528 measured +94% across six
//     releases) show up here as a step, without any bust.

export function completedThinkingTextCount(msgs) {
  if (!Array.isArray(msgs)) return 0;
  let n = 0;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (m?.role !== "assistant" || !Array.isArray(m.content) || m.content.length === 0) continue;
    // Active tool-continuation (terminal tool_use answered by the following
    // tool_result) keeps its thinking BY CONTRACT — not part of this count.
    const last = m.content[m.content.length - 1];
    if (last?.type === "tool_use") {
      const next = msgs[i + 1];
      const answered =
        Array.isArray(next?.content) &&
        next.content.some((b) => b?.type === "tool_result" && b.tool_use_id === last.id);
      if (answered) continue;
    }
    for (const b of m.content) {
      if (b?.type === "thinking" && typeof b.thinking === "string" && b.thinking.trim()) n++;
    }
  }
  return n;
}

// --- Growth-step snapshots: the evidence must outlive capture rotation ---
//
// The shape block records SIZES; when the baseline steps (a CC update
// inflating the system prompt, a tool description ballooning), the diff that
// EXPLAINS the step lives in the capture — which rotates. These snapshot the
// changed component at detection time: identity and per-item sizes, content
// scrubbed with the same deterministic tokens as fixtures, so the artifact
// is committable and diffable long after the bytes that caused it are gone.
//
// SINGLE SOURCE for the growth thresholds: tools/shape-verdicts.mjs (the
// alarm) imports them from here (the evidence freezer), and the deployment
// repo's doctor only invokes that CLI — no mirrored numbers anywhere.
// Growth only: shrinkage is visible intent.
export const GROWTH_STEP_THRESHOLD = 0.15;
export const GROWTH_STEP_FLOOR = 5000;

export function detectGrowthSteps(priorShape, shape) {
  if (!priorShape || !shape) return [];
  const steps = [];
  for (const field of ["systemBytes", "toolsBytes"]) {
    const old = priorShape[field] ?? 0;
    const now = shape[field] ?? 0;
    if (old >= GROWTH_STEP_FLOOR && now > old * (1 + GROWTH_STEP_THRESHOLD)) {
      steps.push({ field, oldBytes: old, newBytes: now });
    }
  }
  return steps;
}

// Identity + per-item size, content scrubbed. Enough to say WHICH block or
// tool grew and by how much, without carrying a byte of real content.
export function growthComponentSnapshot(body) {
  const sys = body?.system;
  return {
    system: Array.isArray(sys)
      ? sys.map((b) => ({ ...scrubBlock(b), bytes: JSON.stringify(b).length }))
      : typeof sys === "string"
        ? { text: scrubText(sys), bytes: sys.length }
        : null,
    tools: Array.isArray(body?.tools)
      ? body.tools.map((t) => ({ name: t?.name ?? null, bytes: JSON.stringify(t).length }))
      : [],
  };
}

export function thinkingCountInPrefix(msgs, upto) {
  let n = 0;
  for (const m of (msgs ?? []).slice(0, upto)) {
    if (m?.role !== "assistant" || !Array.isArray(m.content)) continue;
    for (const b of m.content) {
      if (b?.type === "thinking" || b?.type === "redacted_thinking") n++;
    }
  }
  return n;
}

// Single streaming pass that decides novelty WITHOUT holding the file.
//
// Streaming the read was not enough: retaining every parsed record turned a
// 555 MB capture into a 2.1 GB memory peak (measured from the systemd unit's
// own accounting on the first scheduled run — a background job has no business
// taking 2 GB). Pairs are only ever formed between CONSECUTIVE requests of the
// same conversation, so exactly one predecessor per conversation needs to be
// resident; everything else is garbage the moment its successor is classified.
//
// Returns the picks with both records already materialised, so the caller
// never needs a second pass over the file.
export async function scanCapture(path, seenClasses, minIndex = 0) {
  const prevByConv = new Map(); // conversation id -> { rec, index }
  const picks = [];
  let count = 0;
  const shape = { pairs: 0, thinkingDropPairs: 0, thinkingTextCompleted: 0, systemBytes: 0, toolsBytes: 0 };
  // For growth snapshots: the last request BEFORE the watermark carries the
  // "old" component (it was the newest at the previous harvest), the
  // max-baseline conversation-newest carries the "new". Rough on purpose —
  // cross-conversation pairs are possible and documented in the artifact;
  // the per-item sizes carry the attribution either way.
  let watermarkBody = null;
  let newestBody = null;
  // readLines, not readline: this loop body is currently await-free, so
  // readline happened not to run ahead here — but one await added to the body
  // would silently buffer the whole remaining file (see tools/read-lines.mjs
  // for the measured failure in replay.mjs). Same reader everywhere, so the
  // property is structural rather than an accident of the loop body.
  for await (const line of readLines(path)) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      count++;
      continue;
    }
    // Outcome records carry no body and must not consume a request index —
    // watermarks are stated in request numbers.
    if (!isCaptureRequestRecord(rec)) continue;
    const index = count++;
    const cid = conversationId(rec.body?.messages);
    if (cid === null) continue;
    if (index === minIndex - 1) watermarkBody = rec.body ?? null;
    const prev = prevByConv.get(cid);
    prevByConv.set(cid, { rec, index });
    if (!prev || index < minIndex) {
      if (prev) shapePairs(shape, prev.rec, rec);
      continue;
    }
    shapePairs(shape, prev.rec, rec);
    const kind = censusPair(prev.rec.body?.messages ?? [], rec.body?.messages ?? []);
    if (BORING.has(kind) || seenClasses.has(kind)) continue;
    seenClasses.add(kind);
    picks.push({ kind, prevRec: prev.rec, rec, cur: index });
  }
  // Newest request per conversation: the completed-thinking population and
  // the baseline prefix sizes (max across conversations — the main session
  // dominates, sidecars are noise).
  for (const { rec } of prevByConv.values()) {
    const body = rec.body ?? {};
    shape.thinkingTextCompleted += completedThinkingTextCount(body.messages);
    const sysBytes = JSON.stringify(body.system ?? "").length;
    const toolBytes = JSON.stringify(body.tools ?? []).length;
    if (Math.max(sysBytes, toolBytes) >= Math.max(shape.systemBytes, shape.toolsBytes)) {
      newestBody = body;
    }
    shape.systemBytes = Math.max(shape.systemBytes, sysBytes);
    shape.toolsBytes = Math.max(shape.toolsBytes, toolBytes);
  }
  return { picks, count, shape, watermarkBody, newestBody };
}

function shapePairs(shape, prevRec, rec) {
  shape.pairs++;
  const a = prevRec.body?.messages ?? [];
  const b = rec.body?.messages ?? [];
  if (b.length >= a.length && thinkingCountInPrefix(b, a.length) < thinkingCountInPrefix(a, a.length)) {
    shape.thinkingDropPairs++;
  }
}

function parseArgs(argv) {
  const args = {
    captures: DEFAULT_CAPTURES,
    out: DEFAULT_OUT,
    ledger: DEFAULT_LEDGER,
    dryRun: false,
    json: false,
    pinKey: null,
    pinRange: null,
    bounded: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--captures") args.captures = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--ledger") args.ledger = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--json") args.json = true;
    else if (a === "--pin") {
      args.pinKey = argv[++i];
      args.pinRange = argv[++i];
    } else if (a === "--bounded") {
      args.bounded = true;
    } else {
      process.stderr.write(`unexpected argument: ${a}\n`);
      process.exit(2);
    }
  }
  return args;
}

// --- --pin: freeze a sanitized range as a named, committable fixture ---
//
// BACKLOG.md "READY — harvest --pin freezes evidence ranges as fixtures":
// real-pair tests (test/insertion-suppression.test.mjs,
// test/mitigation-output-form.test.mjs) SKIP once their capture rotates out
// of the retention window. --pin freezes the evidence those tests need
// while the capture still holds it, using the SAME scrubRecord sanitizer as
// the scheduled harvest — never a second scrubber.
//
// Range vs. replay-from-start: both real-pair tests replay the capture from
// request 0 (not from n), because insertion-normalization keeps
// per-conversation canonical state that only matches CC's own behaviour if
// every prior request was replayed in order. A fixture containing only
// records n..m would desync that state and reconstruct n..m incorrectly.
// So the fixture holds every record (boot, outcome, request) from the
// START OF THE FILE through request m inclusive — n..m is the PAIR under
// test and names the fixture, not a truncation point. This is stated
// explicitly in the fixture's header so a reader does not assume n..m bounds
// the content.
export function parsePinRange(rangeStr) {
  const m = /^(\d+)\.\.(\d+)$/.exec(rangeStr ?? "");
  if (!m) throw new Error(`--pin range must look like <n>..<m>, got: ${rangeStr}`);
  const n = Number(m[1]);
  const end = Number(m[2]);
  if (end < n) throw new Error(`--pin range end must be >= start: ${rangeStr}`);
  return { n, m: end };
}

// Boot/outcome records carry no conversation content, so they need no text
// scrubbing — only the identifiers get hashed, matching scrubRecord's own
// sid/key convention (same sha() helper, same prefix style), so this is
// still ONE hashing scheme, not a second scrubber.
function scrubBootRecord(rec) {
  return { ts: rec.ts, type: "boot", proxyTree: rec.proxyTree ?? null, gates: rec.gates ?? null };
}
function scrubOutcomeRecord(rec) {
  return {
    ts: rec.ts,
    type: "outcome",
    id: rec.id ? `id_${sha(rec.id).slice(0, 8)}` : null,
    key: rec.key ? sidToken(rec.key) : null,
    requestId: rec.requestId ? `rq_${sha(rec.requestId).slice(0, 8)}` : null,
    model: rec.model ?? null,
    usage: rec.usage ?? null,
    outSha: rec.outSha ?? null,
    outBytes: rec.outBytes ?? null,
    ms: rec.ms ?? null,
  };
}
// The coalesced record (row 31's mitigation: a duplicate send served from
// another request's in-flight answer). Both ids go through the SAME
// `id_<sha8>` hashing the request and outcome records use, which is what keeps
// the follower->leader join alive inside a fixture: a pin that broke the join
// would freeze the evidence and lose the fact it exists to prove.
function scrubCoalescedRecord(rec) {
  return {
    ts: rec.ts,
    type: "coalesced",
    id: rec.id ? `id_${sha(rec.id).slice(0, 8)}` : null,
    key: rec.key ? sidToken(rec.key) : null,
    leaderId: rec.leaderId ? `id_${sha(rec.leaderId).slice(0, 8)}` : null,
    sha: rec.sha ?? null,
    deltaMs: rec.deltaMs ?? null,
  };
}
// The coalesce-miss record (row 31's NEGATIVE evidence: a duplicate sidecar
// send that was NOT coalesced, and why — desk change in flight, third
// non-request record type in captures). Same `id_<sha8>` hashing as
// scrubCoalescedRecord for both `id` and `leaderId`, so the follower->leader
// join survives a pin here too; `sha`, `reason`, `ageMs`, `arrivalDeltaMs`
// are scalars with no conversation content and ride through unchanged. This
// does NOT resolve a pinned ordinal's chase (see the `reached`-branch
// handling in pinRange/pinRangeBounded below): it is not a completion
// record — the request it describes still gets its own outcome — only
// `outcome` and `coalesced` mark an ordinal resolved.
function scrubCoalesceMissRecord(rec) {
  return {
    ts: rec.ts,
    type: "coalesce-miss",
    id: rec.id ? `id_${sha(rec.id).slice(0, 8)}` : null,
    key: rec.key ? sidToken(rec.key) : null,
    leaderId: rec.leaderId ? `id_${sha(rec.leaderId).slice(0, 8)}` : null,
    sha: rec.sha ?? null,
    reason: rec.reason ?? null,
    ageMs: rec.ageMs ?? null,
    arrivalDeltaMs: rec.arrivalDeltaMs ?? null,
  };
}

// BACKLOG.md "harvest --pin excludes the pinned pair's own outcome
// records": the proxy writes a request's OUTCOME only once the response
// completes, which can land in the capture file after later requests'
// own lines. Breaking out the instant ordinal `m` is pushed (the old
// behaviour) therefore excluded exactly the evidence a pin is usually
// taken FOR — a billing or coalescing claim, which lives in the outcome/
// coalesced records, never in the request records themselves. So after
// pushing `m`, both pinRange and pinRangeBounded keep reading — never
// pushing another REQUEST record, which would silently grow past the
// FULL PREFIX 0..m the header promises — watching only for outcome/
// coalesced records that resolve a pinned ordinal's own raw id, until
// every pinned ordinal is resolved or this bound is exhausted. A bound,
// not a scan of the rest of a 435 MB capture.
const OUTCOME_LOOKAHEAD_MAX_RECORDS = 200;
const OUTCOME_LOOKAHEAD_MAX_BYTES = 32 * 1024 * 1024;

// requestIds[i] is the RAW capture id of pinned ordinal i, or `undefined`
// where ordinal i is not part of the pin's evidentiary claim at all (a
// pinRangeBounded placeholder, whose fabricated content has no real
// outcome to chase). `null` is a real, kept ordinal whose raw record
// carried no id (should not occur in practice; treated as unresolved).
// Shared by pinRange and pinRangeBounded so "what counts as resolved"
// cannot drift into two hand-rolled readings of the same question.
function outcomesSummary(requestIds, resolvedIds) {
  const resolved = [];
  const unresolved = [];
  for (let i = 0; i < requestIds.length; i++) {
    const id = requestIds[i];
    if (id === undefined) continue;
    if (id !== null && resolvedIds.has(id)) resolved.push(i);
    else unresolved.push(i);
  }
  return { resolved, unresolved };
}

// Streams capturePath from its start and returns every record (boot,
// outcome, request — sanitized) through the request whose file-wide ordinal
// (counting only request-only (no `type` field) records, same counting rule
// scanCapture and both real-pair tests use) equals `m`, PLUS whatever
// outcome/coalesced records resolve a PINNED ordinal (n..m — the announced
// pair, never the whole 0..m prefix: an ordinal below n has no outcome
// anywhere in the file as often as not, and chasing it too would sweep in
// every unrelated record between it and the pinned pair, which measured
// 5 -> 95 records over the real row-31 range) within the bounded lookahead
// past `m` (see OUTCOME_LOOKAHEAD_MAX_* above). `n` defaults to 0 for
// callers that only care about m (every existing caller outside this file,
// none of which pin a range whose target sits beyond ordinal 0). The
// returned array carries an OUT-OF-BAND `.outcomes` property (`{resolved,
// unresolved}`, both arrays of ordinals, over n..m only), and an
// `.outcomeScope` `{n, m}` alongside it — a plain extra property on the
// array object, never folded into its own indices, so every existing
// consumer that reads this as a plain records array (length, filter, map,
// JSON.stringify) is unaffected. Throws if the capture has fewer than
// m+1 request records —
// a pin that cannot be fulfilled must fail loudly, not write a truncated
// fixture silently.
export async function pinRange(capturePath, m, n = 0) {
  const records = [];
  const requestIds = [];
  const resolvedIds = new Set();
  let count = 0;
  let reached = false;
  let lookaheadRecords = 0;
  let lookaheadBytes = 0;
  for await (const line of readLines(capturePath)) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (reached) {
      lookaheadRecords++;
      lookaheadBytes += Buffer.byteLength(line, "utf-8");
      if (rec.type === "outcome") {
        records.push(scrubOutcomeRecord(rec));
        if (rec.id) resolvedIds.add(rec.id);
      } else if (rec.type === "coalesced") {
        records.push(scrubCoalescedRecord(rec));
        if (rec.id) resolvedIds.add(rec.id);
      } else if (rec.type === "coalesce-miss") {
        // Preserved (it is evidence), never resolving — see
        // scrubCoalesceMissRecord's own header comment.
        records.push(scrubCoalesceMissRecord(rec));
      }
      const allResolved = requestIds.every((id) => id === undefined || (id !== null && resolvedIds.has(id)));
      if (
        allResolved ||
        lookaheadRecords >= OUTCOME_LOOKAHEAD_MAX_RECORDS ||
        lookaheadBytes >= OUTCOME_LOOKAHEAD_MAX_BYTES
      ) {
        break;
      }
      continue;
    }
    if (rec.type === "boot") {
      records.push(scrubBootRecord(rec));
      continue;
    }
    if (rec.type === "outcome") {
      records.push(scrubOutcomeRecord(rec));
      if (rec.id) resolvedIds.add(rec.id);
      continue;
    }
    if (rec.type === "coalesced") {
      records.push(scrubCoalescedRecord(rec));
      if (rec.id) resolvedIds.add(rec.id);
      continue;
    }
    if (rec.type === "coalesce-miss") {
      records.push(scrubCoalesceMissRecord(rec));
      continue;
    }
    const idx = count++;
    records.push(scrubRecord(rec));
    // Only the PINNED range n..m enters the must-resolve set; an ordinal
    // below n is prefix context for insertion-normalization's state, never
    // part of the pin's own evidentiary claim (outcomesSummary skips
    // `undefined` entries for exactly this reason — the same rule
    // pinRangeBounded's placeholders already use).
    requestIds[idx] = idx >= n && idx <= m ? (rec.id ?? null) : undefined;
    if (idx === m) {
      reached = true;
    }
  }
  if (!reached) {
    throw new Error(`capture ${capturePath} has only ${count} request record(s), cannot pin through m=${m}`);
  }
  records.outcomes = outcomesSummary(requestIds, resolvedIds);
  records.outcomeScope = { n, m };
  return records;
}

// --- --pin --bounded: freeze only the busting conversation's own state ---
//
// BACKLOG.md "READY (small) — harvest --pin cannot freeze a LATE event in a
// LARGE capture, which is exactly when the expensive busts happen": pinRange
// above is correct and does not scale — measured 2026-08-10, a late event at
// n=1048/1049 in a 592 MB / 2065-record capture would have frozen roughly
// 300 MB into public git history, an order of magnitude past the largest
// existing tracked pin.
//
// pinRange's full 0..m prefix exists to keep insertion-normalization's
// PER-CONVERSATION canonical state in sync (see pinRange's own header
// comment above) — but that state is keyed per conversation
// (conversationOf, the same identity replay.mjs's grouping uses), so a
// record belonging to a DIFFERENT conversation contributes nothing to the
// busting conversation's own trajectory and is safe to drop. The bound is
// therefore per-conversation, unioned with everything `sameLineage` relates
// to the busting request — the case where CC has rebuilt the conversation's
// own history, so the busting request's `conversationOf` (its own
// messages[0] hash) has no predecessor in the capture at all even though
// its later messages are 97%+ identical to an earlier, differently-keyed
// request. Both `conversationOf` and `sameLineage` are replay.mjs's own
// primitives (compactEntry's inHash), imported rather than restated — a
// second implementation of an identity or divergence test is the
// confident-wrong-answer shape dev-loop.md already names three times over.
//
// Two passes, neither buffering the whole file. Pass 1 (below,
// locateBoundedTarget) streams the capture once to find the target record
// at ordinal m and build just enough of a compact entry — fed only
// `inMsgs`, since conversationOf/sameLineage read nothing else — to answer
// identity questions about it. Pass 2 (pinRangeBounded) streams the capture
// AGAIN: boot and outcome records always travel (no message bodies, so
// nothing to filter and they are what makes gate resolution and fidelity
// data still work); a request record is scrubbed and kept when its own
// conversationOf matches the target's OR sameLineage relates it to the
// target, and REPLACED — never simply dropped — otherwise.
//
// Replacement rather than omission is deliberate: dropping a record would
// shift every ordinal after it, and the pin's own self-verification
// (verifyPin, below) reads violation lines by ordinal ("prevN->n") against
// the SAME range of the raw source capture — an ordinal that no longer
// lines up desyncs that comparison silently. boundedPlaceholder below is
// the stand-in.

// A dropped request's stand-in: occupies its ordinal without carrying any
// real conversation content. Exactly one user message whose text embeds the
// ordinal makes `messages[0]` UNIQUE per placeholder, so `conversationOf`
// makes every placeholder its own singleton conversation — replay's
// per-conversation grouping can never pair it with anything, real or
// synthetic, which is what keeps it contributing zero pairs, zero stability
// violations and zero census classes. `sid`/`key` deliberately do NOT go
// through `sidToken` (which produces an indistinguishable `s-<hash>` token
// identical in shape to real traffic) — "bounded-placeholder-<ordinal>" is
// unmistakable as synthetic on sight, which is the header note's own
// promise (see runPin's `boundedNote` below) made good at the record level.
function boundedPlaceholder(ordinal, ts) {
  return {
    ts: ts ?? null,
    sid: `bounded-placeholder-${ordinal}`,
    key: `bounded-placeholder-${ordinal}`,
    headers: { "anthropic-beta": null },
    body: {
      model: null,
      system: null,
      tools: undefined,
      messages: [
        {
          role: "user",
          // TOKENIZED, exactly like every other content string this tool
          // writes — through `scrubText`, the same function the scrub itself
          // uses, never a hand-built token.
          //
          // WHY, measured 2026-08-10 at the push boundary: this body used to be
          // the raw sentence below, and the first bounded pin ever committed was
          // BLOCKED by the pre-push hygiene scan with 99 `raw-content` findings —
          // every one of them this tool's own placeholder. The mechanism could
          // not produce a committable fixture, which is its entire purpose, and
          // nothing caught it because the feature was proven at its own bench
          // and never carried to the boundary.
          //
          // The tempting repair was an exemption in the scanner. That is the
          // symptom-site fix: it widens what the hygiene guard accepts, forever,
          // to accommodate a writer that should not have emitted raw prose into
          // a content field in the first place. The corpus invariant is that
          // EVERY content string is a token; a placeholder is not entitled to an
          // exception to it, and the guard stays universal.
          //
          // The token is still distinct per ordinal (the ordinal is inside the
          // hashed text), which is what keeps each placeholder its own singleton
          // conversation. The human-readable explanation lives in the fixture
          // header's `boundedNote`, once, where a reader actually meets it —
          // rather than 212 times inside the records.
          content: scrubText(
            `BOUNDED PIN PLACEHOLDER: the record at ordinal ${ordinal} was outside the ` +
              "busting request's own conversation and its sameLineage union, and was " +
              "dropped. This is synthetic content, not captured traffic — see this " +
              "fixture's header.boundedNote.",
          ),
        },
      ],
    },
  };
}

// Pass 1: stream the capture once to find the request record at ordinal m
// and build its compact identity (inMsgs only — the fields compactEntry
// needs for conversationOf/sameLineage; everything else it accepts default
// gracefully, since neither primitive reads them). Never buffers records
// before m.
async function locateBoundedTarget(capturePath, m) {
  let count = 0;
  for await (const line of readLines(capturePath)) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isCaptureRequestRecord(rec)) continue;
    if (count++ === m) {
      const inMsgs = Array.isArray(rec.body?.messages) ? rec.body.messages : [];
      return compactEntry({ inMsgs });
    }
  }
  throw new Error(`capture ${capturePath} has only ${count} request record(s), cannot pin through m=${m}`);
}

// The retention decision itself, factored out so pinRangeBounded and
// writeCapturePrefixBounded (verifyPin's bounded-aware live side, below)
// share ONE rule rather than two hand-rolled copies that could drift apart
// — the confident-wrong-answer shape dev-loop.md names repeatedly.
function boundedKeep(rec, target, targetCid) {
  const inMsgs = Array.isArray(rec.body?.messages) ? rec.body.messages : [];
  const entry = compactEntry({ inMsgs });
  const cid = conversationOf(entry);
  return (cid !== null && cid === targetCid) || sameLineage(entry, target);
}

// Pass 2: stream the capture again, scrubbing and keeping boot/outcome
// records and every request whose conversation or lineage relates it to the
// target, replacing every other request with a placeholder that occupies
// its ordinal. Identity is computed on the RAW (unscrubbed) record — cheaper
// than scrubbing every candidate just to test identity, and equivalent: the
// scrub's own text tokenization is a deterministic function of content
// (scrubRecord's header comment, "PRESERVED: equality of equal texts"), so
// the SET-based relations conversationOf/sameLineage read are identical
// whichever side of the scrub they are computed on.
// Shares the same break-at-`m` shape pinRange had (and the same fix): a
// request's outcome record can land in the capture after later requests'
// own lines, so pushing `m` and breaking immediately excluded it here too.
// Only KEPT ordinals (boundedKeep === true) WITHIN the pinned range n..m
// enter the pinned-evidence set — a placeholder ordinal's fabricated
// content has no real outcome to chase, and an ordinal below n (kept or
// not) is prefix context, never part of the pin's own evidentiary claim,
// the same scoping pinRange applies above and for the same reason (a
// measured 5 -> 95 record blowup chasing outcomes for ordinals nobody
// pinned). `outcomesSummary` skips `undefined` entries for both cases.
export async function pinRangeBounded(capturePath, m, n = 0) {
  const target = await locateBoundedTarget(capturePath, m);
  const targetCid = conversationOf(target);

  const records = [];
  const requestIds = [];
  const resolvedIds = new Set();
  let count = 0;
  let reached = false;
  let kept = 0;
  let placeholders = 0;
  let lookaheadRecords = 0;
  let lookaheadBytes = 0;
  for await (const line of readLines(capturePath)) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (reached) {
      lookaheadRecords++;
      lookaheadBytes += Buffer.byteLength(line, "utf-8");
      if (rec.type === "outcome") {
        records.push(scrubOutcomeRecord(rec));
        if (rec.id) resolvedIds.add(rec.id);
      } else if (rec.type === "coalesced") {
        records.push(scrubCoalescedRecord(rec));
        if (rec.id) resolvedIds.add(rec.id);
      } else if (rec.type === "coalesce-miss") {
        records.push(scrubCoalesceMissRecord(rec));
      }
      const allResolved = requestIds.every((id) => id === undefined || (id !== null && resolvedIds.has(id)));
      if (
        allResolved ||
        lookaheadRecords >= OUTCOME_LOOKAHEAD_MAX_RECORDS ||
        lookaheadBytes >= OUTCOME_LOOKAHEAD_MAX_BYTES
      ) {
        break;
      }
      continue;
    }
    if (rec.type === "boot") {
      records.push(scrubBootRecord(rec));
      continue;
    }
    if (rec.type === "outcome") {
      records.push(scrubOutcomeRecord(rec));
      if (rec.id) resolvedIds.add(rec.id);
      continue;
    }
    if (rec.type === "coalesced") {
      records.push(scrubCoalescedRecord(rec));
      if (rec.id) resolvedIds.add(rec.id);
      continue;
    }
    if (rec.type === "coalesce-miss") {
      records.push(scrubCoalesceMissRecord(rec));
      continue;
    }
    const idx = count++;
    const inScope = idx >= n && idx <= m;
    if (boundedKeep(rec, target, targetCid)) {
      records.push(scrubRecord(rec));
      requestIds[idx] = inScope ? (rec.id ?? null) : undefined;
      kept++;
    } else {
      records.push(boundedPlaceholder(idx, rec.ts));
      requestIds[idx] = undefined;
      placeholders++;
    }
    if (idx === m) {
      reached = true;
    }
  }
  if (!reached) {
    throw new Error(`capture ${capturePath} has only ${count} request record(s), cannot pin through m=${m}`);
  }
  return {
    records,
    kept,
    placeholders,
    outcomes: outcomesSummary(requestIds, resolvedIds),
    outcomeScope: { n, m },
  };
}

// --- pin self-verification: a pin is a claim until it is replayed ---
//
// docs/dev-loop.md, "The scrub destroys CONTENT PREDICATES — a pin is
// evidence only once replayed": the sanitizer replaces text with hash
// tokens, so any extension gated on a literal text prefix cannot fire on a
// harvested fixture. Measured 2026-08-06: this tool printed
// `pinned 327 record(s), range 166..167` for a fixture that replays with 0
// stability exemptions where the same range of the live capture yields
// `first-appearance-relocation (skills)`. Nothing compared the two, so a
// fixture that proves nothing looked exactly like one that does.
//
// So --pin now replays BOTH sides itself, under the same gates, and reports
// what differs. Two constraints the design is built around, both from
// walking into them:
//
//   * A pin is `{header, records}` JSON, not JSONL. `replay.mjs <pin>.json`
//     reads no capture out of it: it reports `census: 0 same-conversation
//     pairs`, `no gates declared in capture`, and exits CLEAN — the same
//     zeros a real finding produces, from an instrument that never ran. So
//     the pin side is fed as `.records` written out as JSONL, never as the
//     .json file.
//   * The comparison asserts the PAIR COUNT first, and requires it non-zero
//     on both sides. Two runs that compared nothing agree perfectly and mean
//     nothing.
//
// The live side is the SAME prefix (0..m) of the source capture, not the
// whole file: the pin holds records 0..m, and comparing it against a replay
// of a longer capture would diverge on records the pin never claimed to
// hold. Gates come from the capture's own boot records on both sides
// (`--gates-from-capture`), which the scrub preserves verbatim — replaying
// under default gates is testing fiction (dev-loop, "Replay the
// configuration that is SERVING").
//
// A divergence WARNS and does not refuse: a pin that reproduces nothing is
// still worth keeping as raw structure. What it must never do is read as
// success.

const REPLAY = join(__dirname, "replay.mjs");

// Raw prefix of a capture through request ordinal m, same counting rule as
// pinRange (boot/outcome records do not consume an index) — so the two
// sides hold the same records, one scrubbed and one not.
export async function writeCapturePrefix(capturePath, m, outPath) {
  const ws = createWriteStream(outPath, { flags: "w" });
  let count = 0;
  let reached = false;
  for await (const line of readLines(capturePath)) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    ws.write(line + "\n");
    if (!isCaptureRequestRecord(rec)) continue;
    if (count++ === m) {
      reached = true;
      break;
    }
  }
  await new Promise((resolve) => ws.end(resolve));
  return { requests: count, reached };
}

// The live side of a BOUNDED pin's self-verification. Comparing a bounded
// pin against the unfiltered writeCapturePrefix above answers the wrong
// question: the bound deliberately drops every request outside the busting
// conversation and its lineage union, so on an interleaved multi-tenant
// capture the RAW full prefix's census counts pairs the pin was never
// claiming to hold — that is the bound working as designed, not a
// reproduction failure, and comparing against it makes every bounded pin
// read as a divergence regardless of scrub fidelity.
//
// So this applies the SAME retention rule (boundedKeep, the one
// pinRangeBounded uses) to the RAW capture — same kept/placeholder shape,
// same ordinals, RAW bytes instead of scrubbed ones — which isolates the
// question unbounded verifyPin already asks (did the scrub preserve
// fidelity for what was retained) from the bound's own, deliberate
// narrowing. A record placeholder here uses the same synthetic
// boundedPlaceholder as the pin side; there is nothing to leak, since it
// carries no captured bytes on either side.
export async function writeCapturePrefixBounded(capturePath, m, outPath) {
  const target = await locateBoundedTarget(capturePath, m);
  const targetCid = conversationOf(target);

  const ws = createWriteStream(outPath, { flags: "w" });
  let count = 0;
  let reached = false;
  for await (const line of readLines(capturePath)) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isCaptureRequestRecord(rec)) {
      ws.write(line + "\n");
      continue;
    }
    const idx = count++;
    if (boundedKeep(rec, target, targetCid)) {
      ws.write(line + "\n");
    } else {
      ws.write(JSON.stringify(boundedPlaceholder(idx, rec.ts)) + "\n");
    }
    if (idx === m) {
      reached = true;
      break;
    }
  }
  await new Promise((resolve) => ws.end(resolve));
  return { requests: count, reached };
}

// --- bounded pin content check: is the busting conversation COMPLETE? ---
//
// BACKLOG.md "READY (BLOCKING the bounded pin's fidelity claim) — verifyPin
// on a BOUNDED pin applies the retention filter to its own reference side,
// so it cannot fail for the defect it exists to catch. PROVEN by sabotage,
// not argued." writeCapturePrefixBounded above applies boundedKeep to build
// its reference side — the SAME retention function pinRangeBounded used to
// build the pin itself — so both sides drop the same records and a defect
// in boundedKeep is invisible to compareReplayVerdicts by construction.
// Measured 2026-08-10: boundedKeep sabotaged to drop every third record it
// should keep still returned `diffs: []` (188 pairs -> 125 on both sides) —
// a pin that had silently lost a third of its evidence got a clean bill of
// health.
//
// This is a CONTENT check instead, and it is independent of boundedKeep on
// purpose — that is the entire point. From the RAW capture, compute
//   S = { ordinals i <= m : conversationOf(record_i) === conversationOf(target) }
// directly (never by calling boundedKeep, which also admits sameLineage
// matches), then assert the pin holds a REAL record — never a
// boundedPlaceholder stand-in — at every ordinal in S. A retention filter
// that drops a member of the busting conversation now fails on evidence the
// filter had no hand in producing, which is exactly the property
// compareReplayVerdicts lacks here.
//
// Scope, stated exactly so it is not over-read (BACKLOG, same entry): this
// establishes that the BUSTING CONVERSATION is complete in the pin.
// Lineage-related records (sameLineage matches whose own conversationOf
// differs from the target's) are deliberately NOT part of S — they are
// retained so a later lineage-aware consumer can find them, and a contract
// defined over them would be filter-derived again, which is exactly the
// defect this check removes.
export async function bustingConversationOrdinals(capturePath, m) {
  const target = await locateBoundedTarget(capturePath, m);
  const targetCid = conversationOf(target);
  const ordinals = new Set();
  let count = 0;
  for await (const line of readLines(capturePath)) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isCaptureRequestRecord(rec)) continue;
    const idx = count++;
    const inMsgs = Array.isArray(rec.body?.messages) ? rec.body.messages : [];
    const cid = conversationOf(compactEntry({ inMsgs }));
    if (cid !== null && cid === targetCid) ordinals.add(idx);
    if (idx === m) break;
  }
  return ordinals;
}

// A record is the boundedPlaceholder stand-in, never real traffic, iff its
// sid carries the prefix boundedPlaceholder mints — deliberately not
// sidToken's `s-<hash>` shape real traffic carries (boundedPlaceholder's own
// header comment).
const isPlaceholderRecord = (rec) => typeof rec?.sid === "string" && rec.sid.startsWith("bounded-placeholder-");

// request-only, ordinal-ordered view of a pin's `records` array. Boot and
// outcome records travel in the same flat array (pinRangeBounded's own
// header comment) but consume no ordinal, so indexing `records` directly by
// request ordinal is off by however many boot/outcome records precede it —
// the same filter test/harvest-pin-bounded.test.mjs's own `requestOnly`
// helper uses.
const requestRecords = (records) => records.filter((r) => r.type !== "boot" && r.type !== "outcome");

// Which ordinals in `ordinals` (S, above) are missing from the pin's
// `records` or hold a placeholder there — NAMED, not merely counted, so the
// message says what was lost rather than that something was (BACKLOG, same
// entry).
export function missingBustingOrdinals(records, ordinals) {
  const requests = requestRecords(records);
  const missing = [];
  for (const i of [...ordinals].sort((a, b) => a - b)) {
    const rec = requests[i];
    if (!rec || isPlaceholderRecord(rec)) missing.push(i);
  }
  return missing;
}

// Timestamps are REBASED by the scrub onto a fixed epoch, so they differ
// between the two sides by design and say nothing about reproduction.
// Everything else on a violation/exemption line is an ordinal or a reason
// and does compare.
const stripTs = (s) => s.replace(/\bts=\S+\s*/g, "");

/**
 * The verdict-bearing rows of one replay, read off its own output.
 *
 * `ok` is false when an anchor line is missing — the output is then not a
 * verdict at all, and the caller must say so rather than compare absences:
 * a parse that finds nothing produces exactly the same shape as two
 * agreeing empty runs.
 */
export function parseReplayVerdicts(stdout, exitCode) {
  const out = { ok: true, missing: [], exitCode, pairs: null, conversations: null, classes: {}, violations: null, violationLines: [], exemptions: null, exemptionLines: [] };

  const block = (headRe, into, countKey, linesKey) => {
    const lines = stdout.split("\n");
    const i = lines.findIndex((l) => headRe.test(l));
    if (i === -1) {
      into.ok = false;
      into.missing.push(headRe.source);
      return;
    }
    into[countKey] = Number(headRe.exec(lines[i])[1]);
    for (let j = i + 1; j < lines.length && lines[j].startsWith("  "); j++) {
      into[linesKey].push(stripTs(lines[j].trim()));
    }
  };

  block(/^cross-request byte-stability violations \(self-inflicted busts\): (\d+)$/, out, "violations", "violationLines");
  block(/^stability exemptions \(telemetry-backed, not counted as violations\): (\d+)$/, out, "exemptions", "exemptionLines");

  const lines = stdout.split("\n");
  const ci = lines.findIndex((l) => /^census: \d+ same-conversation pairs across \d+ conversations$/.test(l));
  if (ci === -1) {
    out.ok = false;
    out.missing.push("census");
  } else {
    const cm = /^census: (\d+) same-conversation pairs across (\d+) conversations$/.exec(lines[ci]);
    out.pairs = Number(cm[1]);
    out.conversations = Number(cm[2]);
    for (let j = ci + 1; j < lines.length && lines[j].startsWith("  "); j++) {
      // `      7    5.1%  replace/edit   e.g. n=60->62` — the count and the
      // class name; the percentage is derived from the count and the example
      // ordinal is not a verdict.
      const km = /^\s+(\d+)\s+[\d.]+%\s+(.+?)(?:\s{2,}e\.g\..*)?$/.exec(lines[j]);
      if (km) out.classes[km[2].trim()] = Number(km[1]);
    }
  }
  return out;
}

/**
 * What differs between the live replay and the pin's replay, as a list of
 * human-readable clauses. Empty means the pin reproduces the live verdicts
 * over the range it was taken for.
 *
 * PAIR COUNT FIRST, and non-zero required on both sides — a comparison over
 * zero pairs is the failure this whole check exists to catch, not a pass.
 */
export function compareReplayVerdicts(live, pin) {
  const diffs = [];
  if (!live.ok || !pin.ok) {
    const who = [!live.ok && `live(${live.missing.join(",")})`, !pin.ok && `pin(${pin.missing.join(",")})`].filter(Boolean).join(" ");
    return { diffs: [`replay output unreadable — no verdict block found: ${who}`], unreadable: true };
  }
  if (live.pairs === 0 || pin.pairs === 0) {
    diffs.push(`compared nothing — same-conversation pairs live=${live.pairs} pin=${pin.pairs}; a replay over zero pairs proves nothing`);
    return { diffs, unreadable: false };
  }
  if (live.pairs !== pin.pairs) {
    diffs.push(`same-conversation pairs live=${live.pairs} pin=${pin.pairs}`);
  }
  if (live.exitCode !== pin.exitCode) {
    diffs.push(`gate exit code live=${live.exitCode} pin=${pin.exitCode}`);
  }
  if (live.violations !== pin.violations) {
    diffs.push(`stability violations live=${live.violations} pin=${pin.violations}`);
  } else if (JSON.stringify(live.violationLines) !== JSON.stringify(pin.violationLines)) {
    diffs.push(`stability violations differ in detail (live=${JSON.stringify(live.violationLines)} pin=${JSON.stringify(pin.violationLines)})`);
  }
  if (live.exemptions !== pin.exemptions) {
    const lost = live.exemptionLines.filter((l) => !pin.exemptionLines.includes(l));
    diffs.push(
      `stability exemptions live=${live.exemptions} pin=${pin.exemptions}` +
        (lost.length ? ` — missing from the pin: ${lost.join(" | ")}` : ""),
    );
  } else if (JSON.stringify(live.exemptionLines) !== JSON.stringify(pin.exemptionLines)) {
    diffs.push(`stability exemptions differ in detail (live=${JSON.stringify(live.exemptionLines)} pin=${JSON.stringify(pin.exemptionLines)})`);
  }
  const kinds = [...new Set([...Object.keys(live.classes), ...Object.keys(pin.classes)])].sort();
  const classDiffs = kinds
    .filter((k) => (live.classes[k] ?? 0) !== (pin.classes[k] ?? 0))
    .map((k) => `${k} live=${live.classes[k] ?? 0} pin=${pin.classes[k] ?? 0}`);
  if (classDiffs.length) diffs.push(`census classes: ${classDiffs.join(", ")}`);
  return { diffs, unreadable: false };
}

// One replay, run as a child process because the pipeline keeps
// per-conversation canonical state in module scope — two replays in one
// process would compare a cold run against a warm one.
function runReplay(jsonlPath) {
  const argv = [REPLAY, jsonlPath, "--census", "--gates-from-capture"];
  try {
    const stdout = execFileSync(process.execPath, argv, {
      encoding: "utf-8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return parseReplayVerdicts(stdout, 0);
  } catch (e) {
    return parseReplayVerdicts(`${e.stdout ?? ""}`, e.status ?? -1);
  }
}

/**
 * Replay the written pin and the same prefix of its source capture, and
 * report what the pin fails to reproduce. Returns the clause list plus the
 * numbers a reader needs to see that something WAS compared.
 *
 * The pin's own header says whether it is bounded (`header.bounded`) — read
 * before choosing the live-side builder, never re-derived from the record
 * shape, so the two stay in lockstep with whatever wrote the pin. Bounded
 * pins compare against writeCapturePrefixBounded's SAME-filter live side
 * (see its header comment); unbounded pins keep the plain full-prefix
 * comparison, unchanged.
 */
export async function verifyPin(capturePath, pinPath, m) {
  const scratch = await tmpDir("cache-fix-pin-verify-");
  try {
    const liveJsonl = join(scratch, "live.jsonl");
    const pinJsonl = join(scratch, "pin.jsonl");
    const { header, records } = JSON.parse(await readFile(pinPath, "utf-8"));
    if (header?.bounded) {
      await writeCapturePrefixBounded(capturePath, m, liveJsonl);
    } else {
      await writeCapturePrefix(capturePath, m, liveJsonl);
    }
    await writeFile(pinJsonl, records.map((r) => JSON.stringify(r)).join("\n") + "\n");
    const live = runReplay(liveJsonl);
    const pin = runReplay(pinJsonl);
    const verdictCmp = compareReplayVerdicts(live, pin);
    const diffs = [...verdictCmp.diffs];
    // The content check (bustingConversationOrdinals / missingBustingOrdinals,
    // above) is the PRIMARY signal for a bounded pin: it catches a
    // retention-filter defect the verdict comparison cannot, by construction
    // (see that section's header comment). Its clause leads; the verdict
    // comparison stays as the existing, weaker second check — it still
    // catches things this one does not (BACKLOG, same entry).
    if (header?.bounded) {
      const ordinals = await bustingConversationOrdinals(capturePath, m);
      const missing = missingBustingOrdinals(records, ordinals);
      if (missing.length) {
        diffs.unshift(
          `busting conversation incomplete in the bounded pin: ${missing.length} of ` +
            `${ordinals.size} member ordinal(s) missing or placeholder — ordinal(s) ${missing.join(", ")}`,
        );
      }
    }
    return { live, pin, diffs, unreadable: verdictCmp.unreadable };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

async function runPin(args) {
  let n, m;
  try {
    ({ n, m } = parsePinRange(args.pinRange));
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(2);
  }
  const key = args.pinKey;
  if (!key) {
    process.stderr.write("--pin requires a <key> argument\n");
    process.exit(2);
  }
  const capturePath = join(args.captures, `${key}-requests.jsonl`);
  try {
    await stat(capturePath);
  } catch {
    process.stderr.write(`no capture found for key ${key} at ${capturePath}\n`);
    process.exit(2);
  }

  let records, boundedInfo = null, outcomesInfo;
  try {
    if (args.bounded) {
      const res = await pinRangeBounded(capturePath, m, n);
      records = res.records;
      boundedInfo = { kept: res.kept, placeholders: res.placeholders };
      outcomesInfo = res.outcomes;
    } else {
      records = await pinRange(capturePath, m, n);
      // Captured before rebaseTimestamps below, which clones `records` via
      // Array.prototype.map (mapStrings) and would drop this non-index
      // property along with any other shape the clone does not carry.
      outcomesInfo = records.outcomes;
    }
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }

  const fixture = rebaseTimestamps({
    header: {
      key: sidToken(key),
      range: { n, m },
      // Per PINNED ordinal — n..m, the announced pair, never the full 0..m
      // prefix (see the `note` field below, which states this explicitly
      // so a reader does not read `resolved:[1,2,3]` as "records 1..3
      // only"; ordinals outside n..m are still WRITTEN, just never
      // chased): whether its outcome or coalesced record was found,
      // inline or within the bounded lookahead past m. An ordinal in
      // `unresolved` has no billing or coalescing evidence in this
      // fixture at all — its outcome record simply never arrived within
      // the lookahead bound.
      outcomes: outcomesInfo,
      replayFrom: 0,
      note:
        "records holds the FULL prefix 0..m, not just n..m: the real-pair " +
        "tests replay every request from index 0 in order because " +
        "insertion-normalization's per-conversation canonical state is " +
        "stateful (see tools/harvest.mjs runPin's header comment). n..m " +
        "names the pair under test, not a truncation point. " +
        "header.outcomes is narrower than records: it reports resolution " +
        "only for the PINNED ordinals n..m — an ordinal outside that range " +
        "is still present in records (the full prefix above), it is just " +
        "never chased for its own outcome, so it appears in neither " +
        "outcomes.resolved nor outcomes.unresolved." +
        (boundedInfo
          ? " BOUNDED: records outside the busting request's own conversation " +
            "and its sameLineage union were replaced by placeholders (see " +
            "boundedNote below) — the FULL PREFIX claim above is true of the " +
            "unbounded mode only."
          : ""),
      harvestedAt: new Date().toISOString(),
      sanitizer:
        "tools/harvest.mjs scrubRecord + rebaseTimestamps. TOKENIZED: every " +
        "text, per '\\n\\n' segment, as t_<sha12>_<len> (tool schemas dropped; " +
        "<system-reminder> WRAPPERS survive verbatim around a tokenized inner " +
        "text); every nested payload (block.data, block.source.data, any " +
        ">64-char string under source) as data_<sha10>; thinking signatures " +
        "as sig_<sha10>; conversation keys and sids as s-<sha12>, the same " +
        "token the filename carries. REBASED: every timestamp onto " +
        "2000-01-01T00:00:00.000Z + its original delta from this fixture's " +
        "earliest instant. PRESERVED (this is what the fixture is FOR): " +
        "equality of equal texts, the '\\n\\n' join and paragraph-prefix " +
        "relations, tool_use_id/id pairing, message and block ordering, and " +
        "timestamp ordering and spacing within the fixture. RESIDUAL, " +
        "accepted: token lengths, paragraph counts, intra-fixture timing " +
        "deltas. Verified, not asserted: test/harvest-scrub-relations.test.mjs " +
        "walks this file and re-checks each absence class mechanically.",
      ...(boundedInfo
        ? {
            bounded: true,
            boundedTarget: m,
            boundedKept: boundedInfo.kept,
            boundedPlaceholders: boundedInfo.placeholders,
            boundedNote:
              "Records outside the busting request's own conversation " +
              "(conversationOf) and its sameLineage union (LINEAGE_THRESHOLD " +
              "= 0.5, tools/replay.mjs) were replaced with synthetic " +
              "placeholder request records that occupy the same ordinal: " +
              "sid/key start with 'bounded-placeholder-<ordinal>' (never the " +
              "s-<hash> shape real traffic carries) and body.messages holds " +
              "exactly one user message whose content is a TOKENIZED " +
              "placeholder sentence naming the dropped ordinal — tokenized " +
              "through the same scrub every other content string here goes " +
              "through, so this corpus has no raw-prose exception anywhere and " +
              "the pre-push hygiene scan needs no exemption to accept a bounded " +
              "pin. The token differs per ordinal, so a placeholder is its own " +
              "singleton conversation and pairs with nothing. This note is the " +
              "only place the sentence is readable, deliberately.",
          }
        : {}),
    },
    records,
  });

  // File name carries the key's sanitized token, never the session UUID — a
  // filename is as public as the content, and `pinned-s-captureA-…` named a
  // real session. Same token as the header and the records, so a reader can
  // still tell which fixtures came from one capture.
  const outName = `pinned-${sidToken(key)}-${n}-${m}.json`;
  const outPath = join(args.out, outName);
  if (!args.dryRun) {
    await mkdir(args.out, { recursive: true });
    await writeFile(outPath, JSON.stringify(fixture, null, 2) + "\n");
  }
  const boundedSuffix = boundedInfo
    ? ` — bounded: ${boundedInfo.kept} kept, ${boundedInfo.placeholders} placeholder(s)`
    : "";
  process.stdout.write(
    `pinned ${records.length} record(s), range ${n}..${m} (full prefix from 0)${boundedSuffix}, to ${outPath}` +
      `${args.dryRun ? " (dry run)" : ""}\n`,
  );

  // The pin is a claim until it is replayed. --dry-run wrote no file, so
  // there is nothing to replay; say that rather than staying silent, because
  // silence here is what the whole check exists to remove.
  if (args.dryRun) {
    process.stdout.write("pin verification skipped: --dry-run wrote no fixture to replay\n");
    return;
  }
  const v = await verifyPin(capturePath, outPath, m);
  if (v.diffs.length) {
    process.stdout.write(
      `pinned, but does NOT reproduce: ${v.diffs.join("; ")}\n` +
        `  compared ${v.live.pairs ?? "?"} live vs ${v.pin.pairs ?? "?"} pinned same-conversation pair(s) over records 0..${m}, gates from the capture's boot record(s)\n` +
        `  the fixture is kept — it is still raw structure — but it is NOT evidence for what it was pinned for\n`,
    );
    return;
  }
  // Narrowed on purpose (BACKLOG.md "harvest --pin excludes the pinned
  // pair's own outcome records"): this line names the STABILITY/CENSUS
  // verdicts it actually replayed, never "the live verdicts" unqualified —
  // that wider phrasing is what let a billing finding get pinned as
  // "verified" while the outcome records its whole proof lives in were
  // silently absent. A pin with any unresolved ordinal states plainly that
  // it carries no billing or coalescing evidence for them.
  const unresolved = outcomesInfo.unresolved;
  const outcomesLine = unresolved.length
    ? `  ${unresolved.length} pinned ordinal(s) unresolved (${unresolved.join(", ")}): this pin does NOT ` +
      "carry billing or coalescing evidence for them — no outcome or coalesced record for their own " +
      "id appeared within the lookahead bound\n"
    : `  outcomes resolved for all ${outcomesInfo.resolved.length} pinned ordinal(s): this pin carries ` +
      "billing/coalescing evidence for the full pinned range\n";
  process.stdout.write(
    `pin verified: reproduces the live stability/census verdicts over records 0..${m} — ` +
      `${v.pin.pairs} same-conversation pair(s), ${v.pin.violations} stability violation(s), ` +
      `${v.pin.exemptions} exemption(s), ${Object.keys(v.pin.classes).length} census class(es), exit ${v.pin.exitCode}\n` +
      outcomesLine,
  );
}

// Fixture-fallback reader: yields the same [n, line] tuple shape as
// readCapture, over a pinned fixture's `records` array, so a consumer of
// readCapture can swap sources without changing its own parsing loop.
export async function* readPinnedFixture(fixturePath) {
  const { records } = JSON.parse(await readFile(fixturePath, "utf-8"));
  for (let i = 0; i < records.length; i++) {
    yield [i, JSON.stringify(records[i])];
  }
}

// --- commitHarvest: the harvest run commits its own output (cf-333) ---
//
// Before this, every file the harvest wrote (fixtures, growth snapshots, the
// ledger) sat untracked until a session happened to notice and commit them
// by hand — 302 files accumulated over one week with no named actor. This
// closes that gap: the run itself is the committing actor.
//
// CARRIER REGISTRATION (docs/dev-loop.md closing-gate question 4): this
// changes the harvest's carrier KIND, from untracked files to UNPUSHED
// COMMITS on main. Collector: tools/state-report.mjs's collectUnpushed()
// (`origin/main..main`, already generic over any unpushed commit — no new
// collector code needed, this carrier falls under the existing one).
//
// Pathspec-only, by design: `git add -- <outDirRel>` is the one place a
// bare `add` is licensed (dispatch-guards executor skill §1 rule 6's
// sanctioned exception) because the directory IS the tool's own output and
// every file in it is this run's deliverable — never `-A`, never a second
// `add` outside this path.
//
// Never pushes. A git failure at any step (add/diff/commit) is reported via
// `error: true` so the caller can fail loudly rather than let a broken
// commit step pass as a quiet no-op.
export function commitHarvest({ repoRoot, outDirRel, count, dryRun }) {
  if (dryRun) {
    process.stdout.write("NOT COMMITTED: dry run\n");
    return { committed: false, reason: "dry run" };
  }

  const runGit = (args) => {
    try {
      const out = execFileSync("git", args, {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return { ok: true, out, status: 0 };
    } catch (e) {
      const stderr = (e && e.stderr ? e.stderr.toString() : "").trim();
      return { ok: false, reason: (stderr.split("\n")[0] || e?.message || String(e)), status: e?.status };
    }
  };

  const add = runGit(["add", "--", outDirRel]);
  if (!add.ok) {
    process.stdout.write(`NOT COMMITTED: ${add.reason}\n`);
    return { committed: false, reason: add.reason, error: true };
  }

  // `git diff --cached --quiet` exits 0 when nothing staged differs from
  // HEAD, 1 when it does, and anything else is a genuine git failure — the
  // three-way outcome the repo's own checker convention requires (never
  // collapsing "no diff" and "cannot tell" into the same reading).
  const diff = runGit(["diff", "--cached", "--quiet", "--", outDirRel]);
  if (diff.ok) {
    process.stdout.write("NOT COMMITTED: nothing to commit\n");
    return { committed: false, reason: "nothing to commit" };
  }
  if (diff.status !== 1) {
    process.stdout.write(`NOT COMMITTED: ${diff.reason}\n`);
    return { committed: false, reason: diff.reason, error: true };
  }

  const message = `harvest: ${count} file(s) written, ${new Date().toISOString()}`;
  const commit = runGit(["commit", "-m", message, "--", outDirRel]);
  if (!commit.ok) {
    process.stdout.write(`NOT COMMITTED: ${commit.reason}\n`);
    return { committed: false, reason: commit.reason, error: true };
  }

  const shaRes = runGit(["rev-parse", "--short", "HEAD"]);
  const sha = shaRes.ok ? shaRes.out.trim() : null;
  process.stdout.write(`committed ${sha ?? "(unknown sha)"}\n`);
  return { committed: true, sha };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.pinKey !== null) {
    await runPin(args);
    return;
  }
  const ledger = await loadLedger(args.ledger);
  const report = { harvested: [], skipped: [], expired: [], scanned: 0 };

  let files = [];
  try {
    files = (await readdir(args.captures)).filter((f) => f.endsWith("-requests.jsonl"));
  } catch {
    process.stderr.write(`no capture directory at ${args.captures}\n`);
    process.exit(2);
  }

  // A key the ledger knows but disk no longer has was deleted by the capture
  // retention cap before we harvested it. That is the signal for whether the
  // cap is large enough — reported, never silent.
  for (const [key, entry] of Object.entries(ledger.keys)) {
    if (!files.includes(`${key}-requests.jsonl`) && !entry.gone) {
      entry.gone = true;
      report.expired.push({ key, watermark: entry.requests ?? 0 });
    }
  }

  // Novelty is judged against EVERY machine's ledger, not just this one's.
  // The ledger is per-machine (watermarks are local facts), but the fixture
  // set is shared — so a class machine A already banked must not be harvested
  // again by machine B. Reading the sibling ledgers keeps the shared corpus
  // deduplicated without needing a shared writer.
  const seenClasses = new Set(Object.values(ledger.keys).flatMap((e) => e.classes ?? []));
  try {
    const ledgerDir = dirname(args.ledger);
    for (const f of await readdir(ledgerDir)) {
      if (!f.startsWith("LEDGER-") || !f.endsWith(".json")) continue;
      if (join(ledgerDir, f) === args.ledger) continue;
      try {
        const other = JSON.parse(await readFile(join(ledgerDir, f), "utf-8"));
        for (const e of Object.values(other.keys ?? {})) for (const c of e.classes ?? []) seenClasses.add(c);
      } catch {}
    }
  } catch {}

  for (const file of files) {
    const captureKey = file.replace(/-requests\.jsonl$/, "");
    const key = ledgerKey(captureKey);
    const path = join(args.captures, file);
    const st = await stat(path);
    const prior = ledger.keys[key] ?? { requests: 0, classes: [] };

    // STREAM, never readFile, and never retain the file. A capture is the
    // whole conversation re-sent per request, so it grows quadratically: a
    // single live session reached 555 MB here — past Node's ~512 MB maximum
    // string length, so readFile threw outright — and merely streaming while
    // KEEPING every parsed record still peaked at 2.1 GB. scanCapture holds
    // one predecessor per conversation and nothing else. Every request is
    // still examined, because a novel pair may straddle the watermark; only
    // pairs at or beyond it are eligible to be harvested.
    const { picks, count, shape, watermarkBody, newestBody } =
      await scanCapture(path, seenClasses, prior.requests);
    report.scanned += count;
    if (count <= prior.requests) {
      report.skipped.push({ key: sidToken(captureKey), requests: count });
      continue;
    }

    // Growth steps vs this ledger's own prior entry: freeze the evidence
    // while the capture still holds it (see the snapshot helpers' header).
    for (const step of detectGrowthSteps(prior.shape, shape)) {
      const date = new Date().toISOString().slice(0, 10);
      const name = `growth-${sidToken(captureKey)}-${step.field}-${date}.json`;
      const artifact = {
        key: sidToken(captureKey),
        ...step,
        // "old" = newest at the previous harvest (last pre-watermark
        // request); "new" = current max-baseline conversation-newest. May
        // span conversations; per-item sizes carry attribution either way.
        watermark: watermarkBody ? growthComponentSnapshot(watermarkBody) : null,
        newest: newestBody ? growthComponentSnapshot(newestBody) : null,
      };
      if (!args.dryRun) {
        await mkdir(args.out, { recursive: true });
        await writeFile(join(args.out, name), JSON.stringify(artifact, null, 2) + "\n");
      }
      report.growth = report.growth ?? [];
      report.growth.push({ key: sidToken(captureKey), field: step.field, file: name, oldBytes: step.oldBytes, newBytes: step.newBytes });
    }

    for (const pick of picks) {
      const name = `harvested-${pick.kind.replace(/[^a-z]+/gi, "-")}-${sidToken(captureKey)}-${pick.cur}.jsonl`;
      // Rebased as ONE unit, so the pair's own inter-request delta — the
      // only timing fact a two-record fixture carries — survives.
      const body =
        rebaseTimestamps([pick.prevRec, pick.rec].map(scrubRecord))
          .map((r) => JSON.stringify(r))
          .join("\n") + "\n";
      if (!args.dryRun) {
        await mkdir(args.out, { recursive: true });
        await writeFile(join(args.out, name), body);
      }
      report.harvested.push({ key: sidToken(captureKey), kind: pick.kind, file: name, at: pick.cur });
    }

    ledger.keys[key] = {
      requests: count,
      bytes: st.size,
      lastHarvest: new Date().toISOString(),
      classes: [...new Set([...(prior.classes ?? []), ...picks.map((p) => p.kind)])],
      // Shape watch (see the helpers' header): a checker reads these and
      // warns the day a dormant class activates or the baseline steps.
      shape,
    };
  }

  if (!args.dryRun) {
    await mkdir(dirname(args.ledger), { recursive: true });
    await writeFile(args.ledger, JSON.stringify(ledger, null, 2) + "\n");
  }

  // The run commits its own output (cf-333) — see commitHarvest's header.
  // Count = files THIS run wrote: novel-pair fixtures, growth-step
  // snapshots, and the ledger itself (written above whenever !dryRun,
  // whether or not its content changed — commitHarvest's own
  // git-diff-cached check is what decides whether there is anything to
  // commit, so an inflated count here never fabricates a commit).
  const repoRoot = join(__dirname, "..");
  const outDirRel = relative(repoRoot, args.out);
  const writtenCount = report.harvested.length + (report.growth?.length ?? 0) + (args.dryRun ? 0 : 1);
  report.commit = commitHarvest({ repoRoot, outDirRel, count: writtenCount, dryRun: args.dryRun });
  if (report.commit.error) process.exitCode = 1;

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(
      `scanned ${report.scanned} requests across ${files.length} capture(s)${args.dryRun ? " (dry run)" : ""}\n`,
    );
    process.stdout.write(`harvested ${report.harvested.length} novel pair(s)\n`);
    for (const h of report.harvested) process.stdout.write(`  ${h.kind.padEnd(20)} ${h.file}\n`);
    if (report.skipped.length) process.stdout.write(`up to date: ${report.skipped.length} capture(s)\n`);
    for (const g of report.growth ?? []) {
      process.stdout.write(
        `GROWTH STEP: ${g.key.slice(0, 20)} ${g.field} ${g.oldBytes}->${g.newBytes} — evidence frozen in ${g.file}\n`,
      );
    }
    if (report.expired.length) {
      process.stdout.write(
        `\nWARNING: ${report.expired.length} capture(s) expired before harvest — raise CACHE_FIX_CAPTURE_MAX_MB\n`,
      );
      for (const e of report.expired) process.stdout.write(`  ${e.key} (last seen at ${e.watermark} requests)\n`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    process.stderr.write(`harvest failed: ${err?.stack ?? err}\n`);
    process.exit(1);
  });
}
