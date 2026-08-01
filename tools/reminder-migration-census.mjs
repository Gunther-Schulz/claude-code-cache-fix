#!/usr/bin/env node
// reminder-migration-census — measure the row-4 container migration across a
// capture corpus, and BYTE-TEST the canonical rule a mitigation would use.
//
// Why this exists: the migration was hand-derived from two occurrences in one
// capture. The canonical rule reproduced one of them byte-exactly and failed
// the other — a split invisible at n=1, and the difference between a
// mitigation that absorbs a bust and one that moves it (threat matrix,
// "Byte-match test"). A design resting on a hand-derivation is resting on the
// prototype; this is the mechanism, so the next session gets the answer
// without re-deriving it.
//
// The class (threat matrix row 4): Claude Code first appends hook
// additional-context as text blocks INSIDE the preceding message, each wrapped
//   <system-reminder>\n...\n</system-reminder>
// and later emits the same text as ONE standalone role:"system" message
// positioned after that host, wrappers STRIPPED and blocks JOINED with "\n\n".
// The later form re-writes history at the host's index, so everything after it
// re-bills.
//
// What it reports, per adjacent same-conversation request pair:
//   EXACT     — canonical reconstruction is byte-identical to CC's own later
//               message. This is the absorbable population.
//   EXTENDED  — CC's later message CONTAINS the reconstruction as a prefix but
//               carries more. Counted separately so it can never inflate the
//               absorbable claim, and SUB-CLASSIFIED by where the remainder
//               came from, because that is what decides a mitigation:
//                 MERGED-STANDALONE — the remainder is, byte-for-byte, a
//                   standalone role:"system" message the BEFORE request
//                   already carried. CC merged an existing message into the
//                   migrated one; nothing new crossed the wire, so the later
//                   form is computable from the predecessor alone.
//                 NEW-TEXT — the remainder matches no such message: content
//                   that did not exist at the earlier request, and no
//                   normalization can predict it.
//               An earlier revision of this header called the whole class
//               "NOT absorbable by any normalization — new information, not
//               re-serialization". That reading is REFUTED for the merged
//               sub-class and was measured, not argued: 9 of 9 EXTENDED
//               occurrences in the then-readable corpus were merged
//               standalones and 0 were new text (report §b1). "Absorbable"
//               still needs the placement half — see the placement block.
//   DROPPED   — the blocks vanished and the text is absent from the later
//               request entirely. Nothing migrated, so the rule was never
//               exercised; counting these as failures manufactures a blocker.
//   MISMATCH  — neither. Every one is a hole in the rule and is printed in
//               full, because these are what would silently move a bust.
//
// SECOND MEASUREMENT — volatile-block CHANGE across matched pinned entries
// (#272 blocker 2, `--volatile` section of the output).
// insertion-normalization pins a matched user message to its FIRST-SEEN bytes,
// and pin-mode identity deliberately EXCLUDES volatile blocks from the hash.
// That exclusion IS the flip-absorption mechanism, and it is also why the
// extension cannot distinguish CC RE-SERIALIZING a reminder (pin: correct)
// from CC CHANGING its bytes (stale forward: the model is shown text CC
// replaced). The upstream reviewer reproduced the second. Which fix is right —
// an evidenced allowlist or a fail-closed re-pin — turns on how often the
// second actually occurs, so this sweep counts it instead of arguing it. See
// `scanVolatileRegions` for the classification and its definitional comment.
//
// Usage:
//   node tools/reminder-migration-census.mjs <capture.jsonl> [more.jsonl ...]
//   node tools/reminder-migration-census.mjs ~/.claude/cache-fix-captures/*.jsonl
//   ... --json     machine-readable summary
//   ... --verbose  print every EXTENDED/MISMATCH body, not just a sample
//
// Exit code is 0 for a clean read and 1 only when a capture could not be read
// at all — a MISMATCH is a finding to report, not a failure of this tool.
//
// Reading is by LINE, and unreadable captures are named. Until 2026-07-31 this
// tool slurped each capture with readFileSync and swallowed the failure
// (`catch { continue; }`): on the live corpus that silently dropped the four
// LARGEST captures — 6.2 GB of 7.8 GB, 79% by bytes — on `RangeError: Cannot
// create a string longer than 0x1fffffe8 characters`, while reporting "25
// capture(s)" as though that were the corpus. Every verdict this "gate every
// NORMALIZATION must pass" ever produced covered 21% of the bytes and said
// nothing about the rest. That is the same RangeError `replay.mjs` was fixed
// for on 2026-07-28, re-committed in a newer tool, plus the three-answer
// violation (dev-loop.md): an absence reported as a pass. So the read shares
// `read-lines.mjs` with the gate, and a run that could not read something says
// so in its verdict block instead of counting it as zero findings.

import { createHash } from "node:crypto";
import { basename } from "node:path";
import { readLines } from "./read-lines.mjs";
import { firstDivergence, isHumanTurn } from "./replay.mjs";
// The volatile-change sweep asks "when the PIN's identity matches, do the
// pinned bytes differ", so identity must be the MECHANISM's, never an
// approximation of it (dev-loop.md, "Never hand-roll identity in a probe").
import { computePinnedIdentities, isVolatileBlock }
  from "../proxy/extensions/insertion-normalization.mjs";

const WRAP = /^<system-reminder>\n([\s\S]*)\n<\/system-reminder>\s*$/;

/** One block's text with the reminder wrapper removed; anything else verbatim. */
const unwrapText = (t) => {
  const m = WRAP.exec(t);
  return m ? m[1] : t;
};

// The separator CC joins migrated reminder blocks with — the extension names
// the same constant JOIN_SEPARATOR. Named once here so `canonical` and the
// volatile-change normal form cannot drift into two grammars.
const JOIN = "\n\n";

/** Text of a message, whether content is a string or a block array. */
export function textOf(msg) {
  const c = msg?.content;
  if (typeof c === "string") return c;
  if (!Array.isArray(c)) return "";
  return c.filter((x) => x && x.type === "text").map((x) => x.text ?? "").join("");
}

/**
 * Stable identity for a HOST message across two requests: the tool_use_id of
 * its leading tool_result block. Index cannot be used (it shifts), and text
 * cannot (the reminder text repeats verbatim many times in one conversation —
 * matching on it alone picked a system message hundreds of slots away and
 * produced offsets like -839).
 */
export function hostId(msg) {
  const c = msg?.content;
  if (!Array.isArray(c) || !c.length) return null;
  const first = c[0];
  return (first && typeof first === "object" && first.tool_use_id) || null;
}

/** Trailing text blocks of a message that are <system-reminder> wrapped. */
export function reminderBlocks(msg) {
  const c = msg?.content;
  if (!Array.isArray(c) || c.length < 2) return [];
  return c.slice(1)
    .filter((x) => x && x.type === "text" && typeof x.text === "string")
    .map((x) => x.text)
    .filter((t) => t.includes("<system-reminder>"));
}

/**
 * The canonical standalone form: strip each wrapper, join with "\n\n".
 * This is the exact rule a mitigation would apply, kept here so the census
 * and the mitigation can never drift apart in what they mean by "canonical".
 */
export function canonical(blocks) {
  return blocks.map(unwrapText).join(JOIN);
}

/** Classify one reconstruction against CC's own later text. */
export function classify(reconstructed, actual) {
  if (reconstructed === actual) return "EXACT";
  if (actual.startsWith(reconstructed)) return "EXTENDED";
  return "MISMATCH";
}

/**
 * The bytes an EXTENDED occurrence carries BEYOND the reconstruction, with the
 * "\n\n" that joins them removed — the same join `canonical` uses, so the
 * remainder is the merged message itself rather than the message plus glue.
 */
export function extendedRemainder(reconstructed, actual) {
  const extra = actual.slice(reconstructed.length);
  return extra.startsWith("\n\n") ? extra.slice(2) : extra;
}

/**
 * Where an EXTENDED remainder came from. `beforeStandalones` are the texts of
 * the BEFORE request's standalone role:"system" messages — the predecessor's,
 * deliberately: the question is whether the later form is derivable from what
 * CC had ALREADY sent. Matching against the after request's own standalones
 * would make every merge trivially true, since the message being classified is
 * one of them.
 */
export function subclassifyExtended(reconstructed, actual, beforeStandalones) {
  const extra = extendedRemainder(reconstructed, actual);
  return beforeStandalones.includes(extra) ? "MERGED-STANDALONE" : "NEW-TEXT";
}

/**
 * Capture records, one line at a time. Pull-based via `readLines`, so the read
 * position stands still between yields: memory is bounded by what the consumer
 * retains, never by the file. A read error propagates — the caller names the
 * file it could not read rather than continuing as if it held nothing.
 */
async function* readRecords(path, tornCount) {
  let lineNo = 0;
  for await (const line of readLines(path)) {
    lineNo++;
    if (!line.trim()) continue;
    let r;
    // A corrupt line costs one record, not the file — but it is still a record
    // this run did not see, so it is COUNTED rather than swallowed. Measured
    // 2026-08-01: 54 such lines across the corpus, arriving in pairs (a record
    // cut mid-JSON followed by its remainder), i.e. torn appends by the
    // capture writer. Silence here was the tool's own three-answer violation:
    // an absence of coverage reported as nothing at all.
    try { r = JSON.parse(line); } catch { if (tornCount) tornCount.n++; continue; }
    // 1-based LINE ordinal, counting blank and corrupt lines too, so a detail
    // row's pointer resolves with `sed -n '<N>p'` on the capture itself. Set
    // on the record rather than yielded alongside it because the record is
    // never re-serialized — the pair analysis stringifies `body.messages`.
    if (r?.body?.messages && r?.ts) { r.__line = lineNo; yield r; }
  }
}

function analysePair(before, after) {
  const b = before.body.messages, a = after.body.messages;
  let wholeAfterCache = null;
  const wholeAfter = () => (wholeAfterCache ??= JSON.stringify(a));
  const sysAfter = a
    .map((m, j) => (m?.role === "system" ? { j, text: textOf(m) } : null))
    .filter(Boolean);
  // The predecessor's standalone system messages: the population an EXTENDED
  // remainder is checked against (subclassifyExtended).
  const sysBefore = b.filter((m) => m?.role === "system").map(textOf);
  // Every reminder block still living INLINE anywhere in `after`, by text.
  // Index alignment cannot be used here: one inserted message shifts every
  // later index, so comparing before[i] to after[i] reports a migration for
  // messages that merely moved. (That bug scored 99.3% MISMATCH with
  // actual=0ch on every row — the tell that no counterpart was found at all,
  // rather than a rule that failed.)
  const inlineAfter = new Set();
  for (const m of a) for (const t of reminderBlocks(m)) inlineAfter.add(t);

  const findings = [];
  for (let i = 0; i < b.length; i++) {
    const blocks = reminderBlocks(b[i]);
    if (blocks.length === 0) continue;
    // A HOST is a message whose reminder blocks left the inline form entirely.
    // If any block is still inline somewhere in `after`, nothing migrated.
    if (blocks.some((t) => inlineAfter.has(t))) continue;
    const recon = canonical(blocks);
    // Where the host ended up in `after`, by tool_use_id — needed to measure
    // PLACEMENT. Content byte-matching alone is not sufficient for a
    // mitigation: emitting the right bytes at the wrong index diverges the
    // prefix just the same.
    const hid = hostId(b[i]);
    const hj = hid === null ? null : a.findIndex((m) => hostId(m) === hid);
    // Duplicate reminder texts recur, so a candidate must sit AFTER its host;
    // the nearest such is the migrated one.
    let best = null;
    for (const s of sysAfter) {
      if (hj !== null && hj >= 0 && s.j <= hj) continue;
      const verdict = classify(recon, s.text);
      if (verdict === "EXACT") { best = { verdict, ...s }; break; }
      if (verdict === "EXTENDED" && !best) best = { verdict, ...s };
    }
    const offset = best && hj !== null && hj >= 0 ? best.j - hj : null;
    if (best) {
      const sub = best.verdict === "EXTENDED"
        ? subclassifyExtended(recon, best.text, sysBefore)
        : null;
      findings.push({ host: i, blocks: blocks.length, ...best, recon, offset, sub });
      continue;
    }
    // No standalone counterpart. Distinguish a DROP from a rule failure: if
    // the text is absent from `after` ENTIRELY, nothing migrated and the rule
    // was never exercised — calling that MISMATCH blames the rule for a
    // different phenomenon and manufactures a blocker. (Observed: a 3-block
    // host whose blocks vanished as the array went 211 -> 209.)
    // Serialized at most once per PAIR, not once per unmatched host: on the
    // corpus's largest captures one request body is tens of MB, and the
    // per-host form made this O(hosts x bytes) on exactly the files that only
    // became readable when the read was fixed.
    const anyPresent = blocks.some((t) => {
      const inner = WRAP.exec(t);
      const probe = (inner ? inner[1] : t).slice(0, 60);
      return probe.length > 0 && wholeAfter().includes(JSON.stringify(probe).slice(1, -1));
    });
    findings.push({ host: i, blocks: blocks.length,
                    verdict: anyPresent ? "MISMATCH" : "DROPPED",
                    j: null, text: "", recon, sub: null });
  }
  return findings;
}

/**
 * Prune classification for one same-conversation pair.
 *
 * A PRUNE is a pair whose message count DECREASED: CC removed entries it had
 * already sent (threat-matrix row 22's suggestion-mode scaffolding is the
 * measured case). What it COSTS is positional and only positional — the API
 * keys on the longest identical PREFIX — so the classifier asks where the
 * prefix breaks, and against what:
 *
 *   PURE-TAIL-PRUNE     the retained prefix is byte-identical up to the LIVE
 *                       TURN: either nothing retained changed at all
 *                       (firstDivergence === null), or the first change sits
 *                       at or after the last human-typed message. The turn the
 *                       user is producing is rewritten by every request
 *                       anyway, so a prune confined to it invalidates nothing
 *                       that was settled. Cost: the live turn, which was never
 *                       free.
 *   INTERIOR-DIVERGENT  the first change sits BEFORE the last human turn:
 *                       settled history moved, and everything from that index
 *                       re-bills. `rebilled` carries the magnitude, because
 *                       these range from 2 messages to the whole context.
 *   UNANCHORED          no human-typed message in the later array, so "live
 *                       turn" has no referent and neither verdict is earned
 *                       (dev-loop.md, "A checker has THREE answers"). Zero
 *                       occurrences in 226 drop events across the 39-capture
 *                       corpus — kept because the alternative is answering
 *                       PURE without a basis, not because it is expected.
 *
 * The boundary is the ANCHOR rather than a distance: `isHumanTurn` is the same
 * primitive row 4's verdict rests on (`anchorDelta`), and the alternative on
 * offer was a message-count threshold that no definition produces. Measured on
 * the pair that forced the question (2026-07-31 11:31:58, n=83->77): CC pruned
 * a `[SUGGESTION MODE: …]` scaffolding block and the user's real turn landed at
 * the same index — byte-for-byte the same phenomenon as the events that
 * re-bill one message, differing only in how many messages the live turn had
 * produced when the request went out. A threshold splits those; the anchor
 * does not.
 *
 * Mechanized from the 2026-07-31 drop-scan probe that refuted row 22 as a bust
 * cause. The probe was a throwaway with hand-rolled per-message hashes — the
 * tell that a check was missing — so identity here is `firstDivergence` and
 * `isHumanTurn`, imported from the gate rather than restated.
 */
export function classifyPrune(beforeMsgs, afterMsgs) {
  if (!Array.isArray(beforeMsgs) || !Array.isArray(afterMsgs)) return null;
  const n0 = beforeMsgs.length, n1 = afterMsgs.length;
  if (n1 >= n0) return null;
  const div = firstDivergence(beforeMsgs, afterMsgs);
  if (div === null) return { kind: "PURE-TAIL-PRUNE", div, anchor: null, rebilled: 0, n0, n1 };
  let anchor = -1;
  for (let i = 0; i < n1; i++) if (isHumanTurn(afterMsgs[i])) anchor = i;
  const rebilled = n1 - div;
  if (anchor < 0) return { kind: "UNANCHORED", div, anchor: null, rebilled, n0, n1 };
  return { kind: div >= anchor ? "PURE-TAIL-PRUNE" : "INTERIOR-DIVERGENT",
           div, anchor, rebilled, n0, n1 };
}

/**
 * Conversation identity: the first message's byte hash.
 *
 * Same definition as replay.mjs's `conversationOf` (replay.mjs:692,
 * `e.inHash[0]`) — restated rather than imported because that one is
 * module-private. If it ever changes there, this must follow.
 *
 * Grouping on it is load-bearing, and replay.mjs documents why: live traffic
 * interleaves tenants (main, subagent, sidecar), so two requests of the SAME
 * conversation are usually several capture lines apart. An adjacent-line scan
 * silently skips those pairs. This tool made that exact error first: pairing
 * by `sid` alone put a 29-message request next to a 5-message one — different
 * conversations under one session — and scored them as 475 rule failures.
 */
export function conversationOf(rec) {
  const m0 = rec?.body?.messages?.[0];
  if (!m0) return null;
  return createHash("sha256").update(JSON.stringify(m0)).digest("hex").slice(0, 16);
}

// --- #272 blocker 2: do PINNED volatile bytes actually change? ---

/**
 * The volatile region of a message: the blocks insertion-normalization's pin
 * overrides, in wire order, cache_control stripped.
 *
 * `isVolatileBlock` is imported, not restated — it is the predicate that
 * decides what the pin excludes from identity, and a second copy of it here
 * would be measuring a different mechanism than the one that ships.
 * cache_control is stripped for the same reason `buildPinEntry` strips it
 * (stripAllCacheControl): a marker the tail rotation happened to leave on the
 * message is the proxy's own mutation, so counting it as a CC byte change
 * would manufacture findings.
 *
 * null for anything the pin cannot rewrite as a volatile-carrying user
 * message (`pinnedForwardForm` returns non-user entries untouched).
 *
 * Only `raw` is retained per entry, deliberately: it is the exact byte form,
 * and everything else (unwrapped texts, the joined normal form) is recovered
 * from it on the RARE path where the raw bytes differ. Retaining the derived
 * forms too would double a per-conversation map that the corpus's largest
 * captures already stress.
 */
export function volatileRegionOf(msg) {
  if (!msg || msg.role !== "user" || !Array.isArray(msg.content)) return null;
  const kept = [];
  let cacheControl = false;
  for (const b of msg.content) {
    if (b && typeof b === "object" && b.cache_control) cacheControl = true;
    if (!isVolatileBlock(b)) continue;
    const { cache_control, ...rest } = b;
    kept.push(rest);
  }
  return { blocks: kept.length, raw: JSON.stringify(kept), cacheControl };
}

/**
 * The INFORMATION a volatile region carries: each block's text with the
 * reminder wrapper removed, empties dropped, in order. Empty text blocks are
 * volatile by `isVolatileBlock` (the measured flip alternates a reminder with
 * an empty block) and carry nothing, so they are presence, not content.
 */
export function regionTexts(region) {
  let blocks;
  try { blocks = JSON.parse(region.raw); } catch { return []; }
  return blocks
    .map((b) => unwrapText(typeof b?.text === "string" ? b.text : ""))
    .filter((t) => t !== "");
}

const isSubsequence = (small, big) => {
  let i = 0;
  for (const t of big) if (i < small.length && small[i] === t) i++;
  return i === small.length;
};

/**
 * DEFINITION first, because the whole directive rests on this boundary and an
 * expectation derived from the implementation would pin whatever the
 * implementation does (dev-loop.md, "Adding a check", rule on parentage).
 *
 * The pin serves a matched entry's FIRST-SEEN volatile bytes. The fidelity
 * question is therefore: relative to those bytes, does this occurrence carry
 * the same INFORMATION?
 *
 *   IDENTICAL     the region's bytes are unchanged. The pin is a no-op here.
 *   RESERIALIZED  the bytes differ but the unwrapped, empty-dropped texts
 *                 joined with "\n\n" are equal — CC re-wrapped, re-split, or
 *                 re-joined the same reminders. This is the class the pin
 *                 exists to absorb, and it is the same "\n\n" grammar
 *                 `canonical` and the extension's join-move recognition use,
 *                 so a block pair merged into one block lands here rather
 *                 than reading as new text.
 *   CHANGED       neither. The information differs, so the pin forwards bytes
 *                 that no longer say what CC is saying. Sub-classified,
 *                 because these are NOT one phenomenon and a single number
 *                 would hide the one the reviewer reproduced:
 *                   IN-PLACE-TEXT  some reminder's text was replaced — the
 *                                  texts are neither a superset nor a subset
 *                                  of first-seen. THE reviewer's OLD->NEW
 *                                  shape, and the count the design turns on.
 *                   VANISHED       every reminder is gone. The measured flip;
 *                                  the pin re-serves what the model already
 *                                  consumed, stating nothing false.
 *                   APPEARED       first-seen carried none and this occurrence
 *                                  does; the pin strips them
 *                                  (`stripVolatileBlocks`), suppressing new
 *                                  text without contradicting old text.
 *                   AUGMENTED      first-seen's texts survive in order and
 *                                  more were added — suppressed addition.
 *                   REDUCED        a subset of first-seen's texts survives —
 *                                  suppressed removal.
 * `changed` stays the total of all five: the sub-kinds decompose it, they
 * never shrink it.
 */
export function classifyVolatileChange(first, now) {
  if (first.raw === now.raw) return { verdict: "IDENTICAL", kind: null };
  const tf = regionTexts(first), tn = regionTexts(now);
  if (tf.join(JOIN) === tn.join(JOIN)) return { verdict: "RESERIALIZED", kind: null };
  let kind;
  if (tn.length === 0) kind = "VANISHED";
  else if (tf.length === 0) kind = "APPEARED";
  else if (isSubsequence(tf, tn)) kind = "AUGMENTED";
  else if (isSubsequence(tn, tf)) kind = "REDUCED";
  else kind = "IN-PLACE-TEXT";
  return { verdict: "CHANGED", kind };
}

/** Offset of the first differing character; -1 when the strings are equal. */
export function firstDiffOffset(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
}

/**
 * One request's volatile-region comparisons against a conversation's
 * FIRST-SEEN forms. `seen` is the conversation's accumulator (identity tuple
 * -> first-seen region) and is MUTATED: an identity not yet present records
 * its region and yields no comparison; one already present yields exactly one
 * comparison against THAT first-seen form.
 *
 * First-seen, not adjacent: the pin restores first-seen bytes, so that is the
 * comparison the mechanism actually performs. An adjacent-only sweep is the
 * known checker-failure shape (dev-loop.md) and would score a reminder that
 * changed once and then held as a single event no matter how long it was
 * served stale.
 *
 * `matchedAll` counts every re-occurrence of a pinned identity; `matched`
 * counts only those where the pin rewrites bytes at all — a region empty on
 * BOTH sides is a message the pin passes through, and folding those into the
 * denominator would bury the rate under the conversation's whole history.
 */
export function scanVolatileRegions(messages, seen) {
  const rows = [];
  const counts = { matchedAll: 0, matched: 0, identical: 0, reserialized: 0, changed: 0 };
  for (const e of computePinnedIdentities(messages)) {
    const region = volatileRegionOf(messages[e.index]);
    if (region === null) continue;
    // The identity is the (h, r, o) TUPLE. insertion-normalization's
    // `identityKey` joins it exactly this way but is module-private; the join
    // is a Map-key encoding of an imported identity, not a second derivation
    // of one.
    const key = `${e.h}|${e.r}|${e.o}`;
    const first = seen.get(key);
    if (!first) { seen.set(key, region); continue; }
    counts.matchedAll++;
    if (first.blocks === 0 && region.blocks === 0) continue;
    counts.matched++;
    const { verdict, kind } = classifyVolatileChange(first, region);
    if (verdict === "IDENTICAL") { counts.identical++; continue; }
    if (verdict === "RESERIALIZED") { counts.reserialized++; continue; }
    counts.changed++;
    rows.push({
      kind, index: e.index, h: e.h, key,
      firstBytes: first.raw.length, nowBytes: region.raw.length,
      divOffset: firstDiffOffset(first.raw, region.raw),
      // The live pin never rewrites a message currently carrying a
      // cache_control marker (`pinnedForwardForm`), so these rows are changes
      // the shipped extension would not have overridden. Counted, not
      // dropped: the sweep stays a superset.
      cacheControlExempt: region.cacheControl,
    });
  }
  return { rows, counts };
}

// Detail rows are retained ONE PER DISTINCT ENTRY, not one per occurrence:
// an entry whose region changes once and then holds produces a row per later
// request, and a flat occurrence cap then enumerates the first few entries
// exhaustively and the rest not at all — which is the opposite of what a
// design needs. Keyed by entry, the retained set covers EVERY changed entry
// and each row carries its own repeat count. The cap below is a memory
// backstop, not the working limit, and tripping it is reported.
const ENTRY_ROW_CAP = 5000;

export async function census(paths) {
  const tally = { EXACT: 0, EXTENDED: 0, DROPPED: 0, MISMATCH: 0 };
  const extendedSub = { "MERGED-STANDALONE": 0, "NEW-TEXT": 0 };
  const prunes = { pure: 0, interior: 0, unanchored: 0 };
  const pruneDetails = [];
  const details = [];
  const unreadable = [];
  // #272 blocker 2. Counts are corpus-wide and exact; `volatileRows` is capped
  // per kind and `volatileTruncated` names what the cap dropped.
  const volatileChange = { matchedAll: 0, matched: 0, identical: 0, reserialized: 0, changed: 0 };
  const volatileKinds = { "IN-PLACE-TEXT": 0, VANISHED: 0, APPEARED: 0, AUGMENTED: 0, REDUCED: 0 };
  const volatileByCapture = new Map();
  const volatileTruncated = {};
  const rowByEntry = new Map();
  let volatileExempt = 0;
  // DISTINCT entries, not comparisons. A pinned entry whose region changes
  // once then HOLDS is re-counted on every later request (correctly — each is
  // another request served stale), so the occurrence count answers "how much
  // staleness" while this answers "how many reminders". The measured spread is
  // wide enough that reporting only one of them would mislead: 284 REDUCED
  // occurrences on the first corpus run came from a handful of entries.
  const volatileEntries = new Set();
  const volatileEntriesByKind = {};
  const torn = { n: 0 };
  let pairs = 0, captures = 0, conversations = 0;
  for (const path of paths) {
    // Group by conversation, then compare consecutive requests WITHIN each
    // group in arrival order — never adjacent capture lines. Streamed, so the
    // grouping keeps only each conversation's PREVIOUS request rather than
    // every record of the file: the pair a group yields is (previous, current)
    // either way, and retaining the whole file is how the sibling tools each
    // hit their own memory wall (replay.mjs's 3.2 GB peak, harvest's 2.1 GB).
    const prev = new Map();
    const withPairs = new Set();
    // Per-conversation first-seen volatile regions and request ordinals. Scoped
    // to the capture, like `prev`: a conversation spanning two capture files
    // restarts its first-seen baseline, which can only UNDER-count changes.
    const firstSeen = new Map();
    const reqOrd = new Map();
    try {
      for await (const r of readRecords(path, torn)) {
        const cid = conversationOf(r);
        if (cid === null) continue;

        // Runs on EVERY request, including a conversation's first — that is
        // where first-seen is established, and the pair loop below skips it.
        let seen = firstSeen.get(cid);
        if (!seen) { seen = new Map(); firstSeen.set(cid, seen); }
        const ord = (reqOrd.get(cid) ?? 0) + 1;
        reqOrd.set(cid, ord);
        const vol = scanVolatileRegions(r.body.messages, seen);
        for (const k of Object.keys(volatileChange)) volatileChange[k] += vol.counts[k];
        if (vol.counts.matched) {
          const agg = volatileByCapture.get(path) ??
            { matched: 0, identical: 0, reserialized: 0, changed: 0, kinds: {} };
          agg.matched += vol.counts.matched;
          agg.identical += vol.counts.identical;
          agg.reserialized += vol.counts.reserialized;
          agg.changed += vol.counts.changed;
          volatileByCapture.set(path, agg);
        }
        for (const row of vol.rows) {
          volatileKinds[row.kind]++;
          const agg = volatileByCapture.get(path);
          agg.kinds[row.kind] = (agg.kinds[row.kind] ?? 0) + 1;
          if (row.cacheControlExempt) volatileExempt++;
          const entryId = `${path}|${cid}|${row.key}`;
          volatileEntries.add(entryId);
          (volatileEntriesByKind[row.kind] ??= new Set()).add(entryId);
          const seenRow = rowByEntry.get(entryId);
          if (seenRow) {
            // Same entry, still diverging from first-seen: another request
            // served stale, not another finding.
            seenRow.occurrences++;
            seenRow.lastTs = r.ts;
            seenRow.lastLine = r.__line;
            seenRow.lastReq = ord;
            continue;
          }
          if (rowByEntry.size >= ENTRY_ROW_CAP) {
            volatileTruncated[row.kind] = (volatileTruncated[row.kind] ?? 0) + 1;
            continue;
          }
          rowByEntry.set(entryId, { path, sid: r.sid ?? null, ts: r.ts, cid,
                                    line: r.__line, req: ord, occurrences: 1,
                                    lastTs: r.ts, lastLine: r.__line, lastReq: ord, ...row });
        }

        const before = prev.get(cid);
        prev.set(cid, r);
        if (!before) continue;
        pairs++;
        withPairs.add(cid);
        const prune = classifyPrune(before.body.messages, r.body.messages);
        if (prune) {
          prunes[{ "PURE-TAIL-PRUNE": "pure", "INTERIOR-DIVERGENT": "interior",
                   UNANCHORED: "unanchored" }[prune.kind]]++;
          pruneDetails.push({ path, ts: r.ts, ...prune });
        }
        for (const f of analysePair(before, r)) {
          tally[f.verdict]++;
          if (f.sub) extendedSub[f.sub]++;
          details.push({ path, ts: r.ts, ...f });
        }
      }
    } catch (e) {
      // A capture that could not be read is its own answer, never a silent
      // zero: it is the population this verdict does NOT cover.
      unreadable.push({ path, error: String(e?.message ?? e) });
      continue;
    }
    if (withPairs.size) captures++;
    conversations += withPairs.size;
  }
  return { tally, extendedSub, prunes, pruneDetails, details, pairs, captures, conversations,
           unreadable, considered: paths.length, tornLines: torn.n,
           volatileChange, volatileKinds, volatileRows: [...rowByEntry.values()], volatileTruncated,
           volatileExempt, volatileByCapture: [...volatileByCapture.entries()],
           volatileEntries: volatileEntries.size,
           volatileEntriesByKind: Object.fromEntries(
             Object.entries(volatileEntriesByKind).map(([k, s]) => [k, s.size])) };
}

async function main(argv) {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const verbose = args.includes("--verbose");
  const paths = args.filter((a) => !a.startsWith("--"));
  if (paths.length === 0) {
    process.stderr.write("usage: reminder-migration-census <capture.jsonl> ...\n");
    return 1;
  }
  const { tally, extendedSub, prunes, pruneDetails, details, pairs, captures, conversations,
          unreadable, considered, tornLines, volatileChange, volatileKinds, volatileRows,
          volatileTruncated, volatileExempt, volatileByCapture,
          volatileEntries, volatileEntriesByKind } = await census(paths);
  const total = tally.EXACT + tally.EXTENDED + tally.DROPPED + tally.MISMATCH;
  // Printed with every verdict, clean or not: the reader of a byte-gate needs
  // the DENOMINATOR, and "25 capture(s)" over a 39-file corpus read like one.
  const coverage =
    `read ${considered - unreadable.length}/${considered} capture(s), ` +
    `${unreadable.length} UNREADABLE, ${captures} with pairs` +
    (tornLines ? `, ${tornLines} TORN line(s) skipped` : "");

  if (json) {
    // ADDITIVE ONLY. gate-live's summariseCensus and bust-triage read named
    // fields, so new keys ride along without touching either; `volatileChange`
    // keeps the flat counts a daily status file can carry, and the unbounded
    // detail rows appear only under --verbose so the sweep's status file does
    // not grow a row per reminder flip.
    process.stdout.write(JSON.stringify(
      { tally, extendedSub, prunes, pairs, captures, conversations, total, considered, unreadable,
        tornLines,
        volatileChange, volatileKinds, volatileTruncated, volatileExempt,
        volatileByCapture, volatileEntries, volatileEntriesByKind,
        ...(verbose ? { volatileRows } : {}) },
      null, 2) + "\n");
    return unreadable.length ? 1 : 0;
  }

  process.stdout.write(
    `\nreminder-migration census — ${coverage}, ${conversations} conversation(s), ${pairs} same-conversation pair(s)\n\n`);
  if (unreadable.length) {
    process.stdout.write("COULD NOT READ — outside every number below:\n");
    for (const u of unreadable) process.stdout.write(`  ${u.path} :: ${u.error}\n`);
    process.stdout.write("\n");
  }
  // Prunes are reported before (and independently of) the migration verdict:
  // they are a different class on the same pairs, and a corpus with no
  // migrations at all still answers the row-22 question.
  const nPrunes = prunes.pure + prunes.interior + prunes.unanchored;
  process.stdout.write(
    nPrunes === 0
      ? `prune events (message count decreased): none in ${pairs} pair(s)\n\n`
      : `prune events (message count decreased): ${nPrunes} — ` +
        `${prunes.pure} PURE-TAIL-PRUNE (prefix intact up to the live turn), ` +
        `${prunes.interior} INTERIOR-DIVERGENT` +
        (prunes.unanchored ? `, ${prunes.unanchored} UNANCHORED (no human turn — unclassifiable)` : "") +
        "\n");
  // Sorted by what re-bills, not by time: these range from 2 messages to the
  // whole context, and the deep ones are the finding. An interior prune of 2
  // is a rounding error; one of 671 is the entire conversation re-written.
  const interior = pruneDetails
    .filter((p) => p.kind !== "PURE-TAIL-PRUNE")
    .sort((x, y) => y.rebilled - x.rebilled);
  if (interior.length) {
    for (const p of (verbose ? interior : interior.slice(0, 10))) {
      process.stdout.write(
        `  ${p.kind.padEnd(18)} ${p.ts}  n=${p.n0}->${p.n1}  breaks at ${p.div}` +
        ` (anchor ${p.anchor ?? "none"})  re-bills ${p.rebilled} of ${p.n1}\n`);
    }
    if (!verbose && interior.length > 10) {
      process.stdout.write(`  ... ${interior.length - 10} more (--verbose for all)\n`);
    }
  }
  if (nPrunes) process.stdout.write("\n");

  // Volatile-block change across matched pinned entries (#272 blocker 2).
  // Printed BEFORE the migration verdict's early return: a corpus with no
  // container migrations at all still answers this question.
  const vc = volatileChange;
  if (vc.matched === 0) {
    process.stdout.write(
      "pinned volatile-block change: no matched entry in this corpus has a volatile\n" +
      `  region on either side (${vc.matchedAll} pinned re-occurrence(s) seen). Nothing\n` +
      "  measured — an absence of the population, not a measurement of zero change.\n\n");
  } else {
    const vpct = (n) => `${((n / vc.matched) * 100).toFixed(2)}%`;
    process.stdout.write(
      `pinned volatile-block change — ${vc.matched} matched comparison(s) where the pin\n` +
      `  rewrites bytes (of ${vc.matchedAll} pinned re-occurrence(s)), each against the\n` +
      "  entry's FIRST-SEEN form:\n" +
      `  ${String(vc.identical).padStart(7)}  ${vpct(vc.identical).padStart(7)}  IDENTICAL     bytes unchanged\n` +
      `  ${String(vc.reserialized).padStart(7)}  ${vpct(vc.reserialized).padStart(7)}  RESERIALIZED  same texts, re-wrapped/re-split/re-joined\n` +
      `  ${String(vc.changed).padStart(7)}  ${vpct(vc.changed).padStart(7)}  CHANGED       the information differs\n`);
    for (const [k, n] of Object.entries(volatileKinds)) {
      if (!n) continue;
      const note = {
        "IN-PLACE-TEXT": "reminder text REPLACED — the reviewer's OLD->NEW shape",
        VANISHED: "all reminders gone — the measured flip",
        APPEARED: "first-seen had none; pin strips the new ones",
        AUGMENTED: "first-seen's texts survive, more added",
        REDUCED: "a subset of first-seen's texts survives",
      }[k];
      process.stdout.write(
        `         ${String(n).padStart(7)}  ${k.padEnd(13)} ${note}\n` +
        `         ${String(volatileEntriesByKind[k] ?? 0).padStart(7)}  ` +
        `${"".padEnd(13)} ^ distinct pinned entries behind those\n`);
    }
    process.stdout.write(
      `  ${vc.changed} CHANGED comparison(s) come from ${volatileEntries} DISTINCT pinned entr(ies):\n` +
      "  an entry whose region changes once and then holds is re-counted on every\n" +
      "  later request, so occurrences measure staleness and entries measure reminders.\n");
    process.stdout.write(
      `  of the ${vc.changed} CHANGED, ${volatileExempt} sit on a message carrying a cache_control\n` +
      "  marker, which pinnedForwardForm never rewrites — the live pin would not have\n" +
      "  overridden those.\n");
    process.stdout.write(
      "  This sweep ignores canonical-state RESETS, so it counts a SUPERSET of the\n" +
      "  comparisons the live pin performs: it can only find more changes than\n" +
      "  re-serving actually made.\n\n");

    if (volatileByCapture.length > 1) {
      process.stdout.write("  per capture (matched / identical / reserialized / changed):\n");
      for (const [p, a] of volatileByCapture) {
        const kinds = Object.entries(a.kinds).map(([k, n]) => `${n} ${k}`).join(", ");
        process.stdout.write(
          `    ${basename(p).padEnd(52)} ${String(a.matched).padStart(7)} /` +
          ` ${String(a.identical).padStart(7)} / ${String(a.reserialized).padStart(6)} /` +
          ` ${String(a.changed).padStart(6)}${kinds ? `  (${kinds})` : ""}\n`);
      }
      process.stdout.write("\n");
    }

    if (volatileRows.length) {
      process.stdout.write(
        `CHANGED detail — one row per DISTINCT pinned entry (${volatileRows.length}), at its\n` +
        "  FIRST diverging request. No reminder text is printed, by corpus hygiene:\n");
      for (const r of volatileRows) {
        process.stdout.write(
          `  ${r.kind.padEnd(13)} ${r.ts}  ${basename(r.path)}:${r.line}` +
          `  sid=${(r.sid ?? "?").slice(0, 8)} conv=${r.cid} req#${r.req} msg=${r.index}` +
          `  id=${r.h}  ${r.firstBytes}->${r.nowBytes}ch  firstDiff@${r.divOffset}` +
          `  x${r.occurrences} request(s) (through :${r.lastLine})` +
          `${r.cacheControlExempt ? "  [cache_control: pin exempt]" : ""}\n`);
      }
      process.stdout.write("\n");
    }
    const truncTotal = Object.values(volatileTruncated).reduce((a, b) => a + b, 0);
    if (truncTotal) {
      process.stdout.write(
        `  ROWS TRUNCATED (counts above are exact): ${Object.entries(volatileTruncated)
          .map(([k, n]) => `${n} ${k}`).join(", ")} beyond ${ENTRY_ROW_CAP} distinct entries.\n\n`);
    }
  }

  if (total === 0) {
    // "none found" must be distinguishable from "not looked for".
    process.stdout.write(
      "  no container migrations observed in this corpus.\n" +
      "  (That is a measured absence, not a clean bill: the class needs a\n" +
      "   host whose reminder blocks move out between two adjacent requests.)\n\n");
    return unreadable.length ? 1 : 0;
  }
  const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;
  process.stdout.write(
    `  ${String(tally.EXACT).padStart(5)}  ${pct(tally.EXACT).padStart(6)}  EXACT     canonical rule reproduces CC byte-for-byte — absorbable\n` +
    `  ${String(tally.EXTENDED).padStart(5)}  ${pct(tally.EXTENDED).padStart(6)}  EXTENDED  CC's later form carries MORE than the reconstruction\n` +
    (tally.EXTENDED
      ? `         ${String(extendedSub["MERGED-STANDALONE"]).padStart(5)}  MERGED-STANDALONE  the remainder is a standalone the PREDECESSOR already sent\n` +
        `         ${String(extendedSub["NEW-TEXT"]).padStart(5)}  NEW-TEXT           the remainder is content no earlier request carried\n`
      : "") +
    `  ${String(tally.DROPPED).padStart(5)}  ${pct(tally.DROPPED).padStart(6)}  DROPPED   blocks vanished, no counterpart — nothing migrated, rule not exercised\n` +
    `  ${String(tally.MISMATCH).padStart(5)}  ${pct(tally.MISMATCH).padStart(6)}  MISMATCH  rule does not hold — every one is a hole\n\n`);

  const offs = details.filter((d) => d.verdict === "EXACT" && d.offset !== null && d.offset !== undefined);
  if (offs.length) {
    const tallyOff = new Map();
    for (const d of offs) tallyOff.set(d.offset, (tallyOff.get(d.offset) ?? 0) + 1);
    const sorted = [...tallyOff.entries()].sort((x, y) => y[1] - x[1]);
    process.stdout.write("placement (standalone index - host index, EXACT only):\n");
    for (const [o, c] of sorted) {
      process.stdout.write(`  ${String(o >= 0 ? "+" + o : o).padStart(5)}  ${String(c).padStart(4)}` +
        `${sorted.length === 1 ? "   <- single placement; safe to emit" : ""}\n`);
    }
    if (sorted.length > 1) {
      process.stdout.write(
        "  MORE THAN ONE PLACEMENT — a mitigation cannot pick an index that is\n" +
        "  right every time; emitting at the wrong one diverges the prefix even\n" +
        "  with byte-correct content.\n");
    }
    process.stdout.write("\n");
  }

  const show = details.filter((d) => d.verdict !== "EXACT");
  if (show.length) {
    process.stdout.write("non-EXACT occurrences:\n");
    for (const d of (verbose ? show : show.slice(0, 5))) {
      process.stdout.write(
        `  ${d.verdict.padEnd(8)} ${d.ts}  host=${d.host} blocks=${d.blocks}` +
        ` recon=${d.recon.length}ch actual=${d.text.length}ch${d.sub ? `  ${d.sub}` : ""}\n`);
      if (d.verdict === "EXTENDED") {
        const extra = extendedRemainder(d.recon, d.text);
        process.stdout.write(`             extra: ${JSON.stringify(extra.slice(0, 120))}\n`);
      }
    }
    if (!verbose && show.length > 5) {
      process.stdout.write(`  ... ${show.length - 5} more (--verbose for all)\n`);
    }
    process.stdout.write("\n");
  }
  process.stdout.write(
    "verdict for a normalization built on the canonical rule:\n" +
    (tally.MISMATCH > 0
      ? "  DO NOT SHIP as-is — MISMATCH occurrences mean the canonical form differs\n" +
        "  from CC's own, so normalizing would move the bust rather than absorb it\n" +
        "  (threat matrix, Byte-match test).\n\n"
      : `  the rule holds on every occurrence it applies to; EXTENDED cases are a\n` +
        `  separate class and must be booked separately, never folded into the\n` +
        `  absorbable claim.\n\n`));
  // The third answer, and it OVERRIDES the two above: a rule proven on the
  // corpus this run could read says nothing about the captures it could not,
  // and the unreadable ones are the largest — the likeliest to carry the class.
  if (unreadable.length) {
    process.stdout.write(
      `  COULD NOT VERIFY over ${unreadable.length} of ${considered} capture(s) (listed above).\n` +
      "  This is NOT a clean byte-gate: treat the verdict as covering the read\n" +
      "  corpus only, and fix the read before shipping a normalization on it.\n\n");
  }
  return unreadable.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--selftest")) {
    const eq = (a, b, m) => { if (a !== b) throw new Error(`${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };
    // canonical: strips wrappers, joins with a blank line
    eq(canonical(["<system-reminder>\nA\n</system-reminder>\n",
                  "<system-reminder>\nB\n</system-reminder>"]), "A\n\nB", "canonical join");
    // an unwrapped block passes through untouched (never invent structure)
    eq(canonical(["plain"]), "plain", "unwrapped passthrough");
    // classify's three verdicts, including the EXTENDED prefix rule
    eq(classify("A", "A"), "EXACT", "exact");
    eq(classify("A", "A\n\nB"), "EXTENDED", "extended");
    eq(classify("A", "Z"), "MISMATCH", "mismatch");
    // EXTENDED must NOT be reported as EXACT — that conflation is what would
    // let new-information cases inflate the absorbable population.
    eq(classify("A", "AB") === "EXACT", false, "extended is not exact");
    // the EXTENDED remainder is the merged message, not the message plus glue
    eq(extendedRemainder("A", "A\n\nB"), "B", "join stripped");
    eq(extendedRemainder("A", "AB"), "B", "no join to strip");
    // and it is MERGED only against what the PREDECESSOR already sent
    eq(subclassifyExtended("A", "A\n\nB", ["B"]), "MERGED-STANDALONE", "merged");
    eq(subclassifyExtended("A", "A\n\nB", ["C"]), "NEW-TEXT", "not in predecessor");
    eq(subclassifyExtended("A", "A\n\nB", []), "NEW-TEXT", "no standalones, no merge");
    // reminderBlocks only picks trailing wrapped text, never the leading block
    eq(reminderBlocks({ content: [{ type: "tool_result" },
                                  { type: "text", text: "<system-reminder>\nX\n</system-reminder>" }] }).length,
       1, "one trailing reminder");
    eq(reminderBlocks({ content: [{ type: "text", text: "<system-reminder>\nX\n</system-reminder>" }] }).length,
       0, "leading-only is not a host");
    eq(textOf({ content: "str" }), "str", "string content");
    // prunes: a drop whose retained prefix is byte-identical costs nothing;
    // one whose retained prefix breaks re-bills from the breaking index.
    const M = (t) => ({ role: "user", content: t });      // a human-typed turn
    const T = (t) => ({ role: "user", content: [{ type: "tool_result", content: t }] });
    eq(classifyPrune([M("a"), M("b"), M("c")], [M("a"), M("b")]).kind,
       "PURE-TAIL-PRUNE", "after is a prefix of before");
    eq(classifyPrune([M("a"), T("x"), M("live-old")], [M("a"), T("x"), M("live-new")]),
       null, "same length is not a prune");
    // divergence AT the live turn: the turn the user is producing, not history
    eq(classifyPrune([M("a"), T("x"), T("y"), M("old")], [M("a"), T("x"), M("new")]).kind,
       "PURE-TAIL-PRUNE", "prune landing on the last human turn");
    // divergence BEFORE the live turn: settled history moved
    const interior = classifyPrune([M("a"), T("x"), T("y"), M("live")],
                                   [M("a"), T("CHANGED"), M("live")]);
    eq(interior.kind, "INTERIOR-DIVERGENT", "retained history changed");
    eq(interior.div, 1, "breaks at 1");
    eq(interior.rebilled, 2, "re-bills from the break to the end");
    // no human turn at all: neither verdict is earned
    eq(classifyPrune([T("a"), T("b"), T("c")], [T("a"), T("ZZ")]).kind,
       "UNANCHORED", "no anchor, no verdict");
    eq(classifyPrune([M("a")], [M("a"), M("b")]), null, "growth is not a prune");

    // --- volatile-change (#272 blocker 2) ---
    // The census's WRAP and the extension's VOLATILE_WRAP_REGEX must agree on
    // what a volatile block IS, or this sweep measures a different mechanism
    // than the one that ships. Pinned by behaviour rather than by hope: the
    // extension's predicate is imported, so this goes red if it moves.
    const R = (t) => ({ type: "text", text: t });
    for (const t of ["<system-reminder>\nA\n</system-reminder>", "", "plain",
                     "<system-reminder>\nA\n</system-reminder>\n",
                     "lead <system-reminder>\nA\n</system-reminder>"]) {
      eq(isVolatileBlock(R(t)), WRAP.test(t) || t === "", `volatile predicate agrees on ${JSON.stringify(t)}`);
    }
    eq(isVolatileBlock({ type: "tool_result", text: "" }), false, "tool_result is never volatile");

    const reg = (blocks) => volatileRegionOf({ role: "user", content: blocks });
    eq(reg([R("x")]) === null, false, "user block-array has a region");
    eq(volatileRegionOf({ role: "system", content: [R("")] }), null, "non-user has no pinned region");
    eq(reg([{ type: "tool_result", tool_use_id: "t" }]).blocks, 0, "no volatile blocks");
    // cache_control is the proxy's OWN mutation and must not read as a change
    eq(reg([{ ...R("<system-reminder>\nA\n</system-reminder>"), cache_control: { type: "ephemeral" } }]).raw,
       reg([R("<system-reminder>\nA\n</system-reminder>")]).raw, "cache_control stripped from the region");
    eq(reg([{ ...R("x"), cache_control: { type: "ephemeral" } }]).cacheControl, true, "marker noticed");

    const V = (verdict, kind) => JSON.stringify({ verdict, kind });
    const cvc = (a, b) => JSON.stringify(classifyVolatileChange(reg(a), reg(b)));
    const SR = (t) => R(`<system-reminder>\n${t}\n</system-reminder>`);
    eq(cvc([SR("A")], [SR("A")]), V("IDENTICAL", null), "same bytes");
    // wrapper add/remove, empty-block presence and "\n\n" split/merge are all
    // re-serialization: the texts are unchanged
    eq(cvc([SR("A")], [SR("A"), R("")]), V("RESERIALIZED", null), "empty block added");
    eq(cvc([SR("A"), SR("B")], [SR("A\n\nB")]), V("RESERIALIZED", null), "two blocks merged on the join");
    eq(cvc([SR("A\n\nB")], [SR("A"), SR("B")]), V("RESERIALIZED", null), "one block split on the join");
    // and the changes, each by its definition
    eq(cvc([SR("OLD")], [SR("NEW")]), V("CHANGED", "IN-PLACE-TEXT"), "text replaced");
    eq(cvc([SR("A")], [R("")]), V("CHANGED", "VANISHED"), "the measured flip");
    eq(cvc([R("")], [SR("A")]), V("CHANGED", "APPEARED"), "gained a reminder");
    eq(cvc([SR("A")], [SR("A"), SR("B")]), V("CHANGED", "AUGMENTED"), "reminder added alongside");
    eq(cvc([SR("A"), SR("B")], [SR("A")]), V("CHANGED", "REDUCED"), "reminder removed");
    // a region empty on BOTH sides is outside the population entirely
    const seen = new Map();
    const plain = [{ role: "user", content: [{ type: "tool_result", tool_use_id: "t" }] }];
    scanVolatileRegions(plain, seen);
    const s2 = scanVolatileRegions(plain, seen);
    eq(s2.counts.matchedAll, 1, "re-occurrence counted");
    eq(s2.counts.matched, 0, "but the pin rewrites nothing there");
    eq(firstDiffOffset("abc", "abd"), 2, "first divergence offset");
    eq(firstDiffOffset("ab", "abc"), 2, "prefix then longer");
    eq(firstDiffOffset("ab", "ab"), -1, "equal strings");

    process.stdout.write("reminder-migration-census: selftest passed\n");
    process.exit(0);
  }
  process.exit(await main(process.argv));
}
