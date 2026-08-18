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
//   DROPPED   — the blocks vanished and no standalone COUNTERPART was created
//               for them. Nothing migrated, so the rule was never exercised;
//               counting these as failures manufactures a blocker. ("Absent
//               from the later request entirely" is what this line said until
//               2026-08-08, and it was the wrong question: a reminder text
//               recurs at other indices, so the later body contains it however
//               the pair behaved — see `anyCreated` in `analysePair`.)
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
// THIRD MEASUREMENT — DUPLICATE REQUESTS (`duplicates` in the output).
// CC#78420 is "the same request body sent twice and charged twice". The
// falsifier for it — adjacent byte-identical request bodies — has been run by
// hand twice and answered differently each time, and the difference was the
// DEFINITION of "adjacent":
//   2026-07-29, a throwaway python scan over capture LINES, reported the class
//     ABSENT on this setup. Live traffic interleaves tenants (main, subagent,
//     sidecar), so two requests of one conversation are usually several lines
//     apart: file adjacency breaks on interleaving and under-counts.
//   2026-07-30, a per-CONVERSATION scan, reported ~100 pairs in ~23 streaks.
// Per-conversation adjacency is the definition here, and it is the one this
// tool already uses everywhere else (`conversationOf`, the pair loop) — a
// global-file scan is not a variant of it, it is a different question.
//
// The number alone does not say whether #78420 is happening, which is why the
// counter carries its DISCRIMINATOR: how many requests of each streak have a
// matching OUTCOME record (`type:"outcome"`, keyed by the request's `id` —
// replay.mjs writes `captureId: rec.id` and reads `outcomes.get(...)` the same
// way). The 07-30 measurement resolved the streaks as CLIENT RETRIES: distinct
// ids, backoff-shaped intervals, and ZERO outcome records — nothing was
// charged, so nothing was double-billed.
//
// The alarm is `doubleBilledStreaks` — a streak carrying TWO OR MORE outcome
// records — never `billedStreaks`: a retry that finally succeeds bills exactly
// one of its sends, which is correct. See `summariseDuplicates`. First live
// run, 2026-08-01T14:15+02:00 over 28 captures (the corpus rotates; the
// capture carrying the 07-30 streaks had already aged out): 71 duplicate
// pairs of 10,454 same-conversation pairs, in 67 streaks, longest run 4, 61
// billed requests over 32 streaks — and 29 streaks DOUBLE-billed. Verified by
// hand on two of them: s-captureK lines 3/5, identical 2384-byte haiku bodies
// 14 ms apart, 587 input tokens charged on each; s-captureT lines 654/656,
// identical 1.84 MB fable bodies 11 s apart, both answered (outputTokens 2
// and 1, the second reading 360,598 cached tokens). Duplicate SENDS cost
// nothing; duplicate ANSWERS do.
//
// Two honest edges, neither bridged: a member whose record carries no `id` can
// not be matched at all (`membersWithoutId`, reported separately from a
// missing outcome), and a streak at the very TAIL of a live capture may have
// outcome records that were not yet written when the file was read — billing
// is matched within one capture only.
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

// The closed kind vocabulary row 4's `between` export reads off a content
// block's `type`, never off its bytes — the row must stay body-free (that is
// what keeps this file's export inside its single exempted absence class in
// `tools/absence-scan.mjs`; a body-bearing field breaks the push gate for
// everyone). `text` is split further below into `text` vs `reminder-carrying`
// because that split is the whole reason the export exists: whether a passing
// reminder rode between the host and its standalone is exactly the question
// row 4's placement half needs answered.
const BLOCK_KINDS = new Set(["tool_result", "tool_use", "image", "thinking"]);

/**
 * One content block's closed-vocabulary kind: `tool_result`, `tool_use`,
 * `text`, `reminder-carrying`, `image`, `thinking`, or `other` for anything
 * outside that list (including a `text` block whose own `text` is not a
 * string). Never reads more of the block than `type` and, for text blocks,
 * whether it contains the reminder wrapper marker.
 */
export function blockKind(block) {
  if (!block || typeof block !== "object") return "other";
  if (block.type === "text") {
    return typeof block.text === "string" && block.text.includes("<system-reminder>")
      ? "reminder-carrying" : "text";
  }
  return BLOCK_KINDS.has(block.type) ? block.type : "other";
}

/**
 * One message's ordered kind list — one entry per content block, in block
 * order, duplicates NOT collapsed: a message carrying two `tool_result`
 * blocks reports `["tool_result","tool_result"]`, not one. String content
 * (a bare system message; see `textOf`'s other branch) is treated as a
 * single implicit block, `text` or `reminder-carrying` by the same rule.
 * A message with no content array and no string content (should not occur
 * on a well-formed record) reports an empty list rather than `other`.
 */
export function messageKinds(msg) {
  const c = msg?.content;
  if (typeof c === "string") return [c.includes("<system-reminder>") ? "reminder-carrying" : "text"];
  if (!Array.isArray(c)) return [];
  return c.map(blockKind);
}

/**
 * The canonical standalone form: strip each wrapper, join with "\n\n".
 * This is the exact rule a mitigation would apply, kept here so the census
 * and the mitigation can never drift apart in what they mean by "canonical".
 */
export function canonical(blocks) {
  return blocks.map(unwrapText).join(JOIN);
}

/**
 * The WRAPPER-RETAINED standalone form: the blocks with their wrappers still
 * on, TRAILING WHITESPACE REMOVED, joined with the same separator `canonical`
 * uses. Measured 2026-08-14: every MISMATCH in the corpus is this mechanism —
 * CC re-emits the migrated blocks with `<system-reminder>` wrappers RETAINED
 * rather than stripped. Row 4's DEFINITION (module header) assumes stripping;
 * this is the measured alternative CC actually took, evaluated alongside it
 * rather than replacing it — `canonical`'s own callers and behaviour are
 * untouched.
 *
 * THE `trimEnd` IS THE WHOLE MECHANISM AND IT WAS MEASURED, NOT ASSUMED. A
 * host's INLINE block carries a trailing newline after its closing tag; CC's
 * standalone does not reproduce it, and joins from the closing tag itself. The
 * first version of this function joined the blocks verbatim and returned
 * UNRELATED on all 8 multi-block occurrences while matching all 8 single-block
 * ones — the split that exposed it, since a single block has no join to get
 * wrong. What settled it is arithmetic the rows now carry (`unrelatedDiag`):
 * every non-final block reported `overhead` 38 against the canonical 37
 * (`<system-reminder>\n` = 18 plus `\n</system-reminder>` = 19), the final
 * block 37, and `wrappedDivOffset` landed exactly one byte past the first
 * block's own length — i.e. at the join, with the block bytes themselves
 * byte-identical up to it. `WRAP` already tolerates that trailing whitespace
 * (`\s*$`), which is why the STRIPPED reconstruction matched byte-for-byte all
 * along while the wrapped one could not: the difference lives entirely in
 * bytes unwrapping discards.
 *
 * This is computable from the PREDECESSOR alone — `trimEnd` is a pure function
 * of the host's own blocks — which is what makes it a candidate mechanism for
 * row 4 rather than merely a description of the divergence.
 */
export function canonicalWrapped(blocks) {
  return blocks.map((t) => t.trimEnd()).join(JOIN);
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
    // Outcome records (what the API actually charged) share the file, carry no
    // body, and are yielded for ONE consumer: the duplicate counter's billing
    // discriminator. They deliberately get no `__line` — nothing points at
    // them — and every other analysis skips them on `type`.
    if (r?.type === "outcome" && typeof r?.id === "string") { yield r; continue; }
    // Coalesced records (row 31: a duplicate send served from another
    // request's in-flight answer) share the file and carry no body either.
    // Yielded for the same one consumer, and for the same reason: without it
    // the duplicate counter reads a suppressed duplicate as an unanswered
    // send, which inverts the mitigation's own signal.
    if (r?.type === "coalesced" && typeof r?.id === "string") { yield r; continue; }
    // Coalesce-MISS records (row 31: a duplicate that met the first three
    // conditions and was forwarded anyway). Same shape of passthrough, same
    // one consumer — without it the streak row can say a pair was
    // double-billed but never why the mitigation did not absorb it.
    if (r?.type === "coalesce-miss" && typeof r?.id === "string") { yield r; continue; }
    // 1-based LINE ordinal, counting blank and corrupt lines too, so a detail
    // row's pointer resolves with `sed -n '<N>p'` on the capture itself. Set
    // on the record rather than yielded alongside it because the record is
    // never re-serialized — the pair analysis stringifies `body.messages`.
    if (r?.body?.messages && r?.ts) { r.__line = lineNo; yield r; }
  }
}

export function analysePair(before, after) {
  const b = before.body.messages, a = after.body.messages;
  const sysAfter = a
    .map((m, j) => (m?.role === "system" ? { j, text: textOf(m) } : null))
    .filter(Boolean);
  // The predecessor's standalone system messages: the population an EXTENDED
  // remainder is checked against (subclassifyExtended).
  const sysBefore = b.filter((m) => m?.role === "system").map(textOf);
  // The same population as a text -> occurrence-count MULTISET, per side. Built
  // at most once per PAIR and only if an unmatched host is reached, because the
  // pair loop runs over the whole corpus and most pairs never get here. This is
  // what `anyCreated` (the no-counterpart branch) matches on; the multiset, not
  // a bare total, is the point — see the definitional comment there.
  let sysCountsCache = null;
  const sysCounts = () => (sysCountsCache ??= (() => {
    const tally = (texts) => {
      const m = new Map();
      for (const t of texts) m.set(t, (m.get(t) ?? 0) + 1);
      return m;
    };
    return { before: tally(sysBefore), after: tally(sysAfter.map((s) => s.text)) };
  })());
  // Every reminder block still living INLINE anywhere in `after`, by text.
  // Index alignment cannot be used here: one inserted message shifts every
  // later index, so comparing before[i] to after[i] reports a migration for
  // messages that merely moved. (That bug scored 99.3% MISMATCH with
  // actual=0ch on every row — the tell, BACK THEN, that no counterpart was
  // found at all, rather than a rule that failed. That reading stopped being
  // safe once a real corpus produced a counter-instance: capture s-captureG,
  // host=30/74, where a candidate standalone DID exist at the expected
  // position — role:"system", string content, wrapper retained — and was
  // REJECTED by the classify() loop below (MISMATCH, since the wrapped bytes
  // are neither equal to nor prefixed by the unwrapped reconstruction), never
  // absent. `actual=0ch` on a no-counterpart row is therefore two different
  // populations conflated under one number: truly nothing found, and a
  // candidate found and rejected. The no-counterpart branch now tells them
  // apart (`rejectedCandidate`, tracked as `best` is sought below) and the
  // human output line prints the rejected candidate's length instead of a
  // bare 0 when one exists — see the row print in `main`.)
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
    // The wrapper-retained alternative reconstruction, evaluated alongside
    // `recon` in the same scan below (`bestWrapped`) — never substituted for
    // it. Only consulted when a finding ends up MISMATCH under the stripped
    // rule (`mismatchSub`, below).
    const reconWrapped = canonicalWrapped(blocks);
    // Where the host ended up in `after`, by tool_use_id — needed to measure
    // PLACEMENT. Content byte-matching alone is not sufficient for a
    // mitigation: emitting the right bytes at the wrong index diverges the
    // prefix just the same.
    const hid = hostId(b[i]);
    const hj = hid === null ? null : a.findIndex((m) => hostId(m) === hid);
    // Duplicate reminder texts recur, so a candidate must sit AFTER its host;
    // the nearest such is the migrated one.
    let best = null;
    // The nearest position-eligible standalone that classify() REJECTED
    // (MISMATCH) before any EXACT/EXTENDED match was found — i.e. the
    // candidate the no-counterpart branch below would otherwise report as
    // flat absence. Never overrides `best`; only consulted when `best` stays
    // null for the whole scan (see the no-counterpart branch).
    let rejectedCandidate = null;
    // The best wrapper-retained hit found in the scan below, tracked
    // independently of `best`/`rejectedCandidate`: an EXACT wrapped hit wins
    // once found and is never overwritten; the first EXTENDED wrapped hit is
    // kept only while no wrapped hit exists yet. Never influences `best` or
    // the stripped verdict — only read when a finding ends up MISMATCH.
    let bestWrapped = null;
    // "Position-eligible" is a claim about the HOST's position, so it can only
    // be made when the host was LOCATED. TWO states defeat that, and the filter
    // below short-circuits identically in both — so the first system message in
    // the array would be recorded as though it had been considered against the
    // host:
    //   hj === -1    the host is absent from `after`: it was PRUNED. Measured
    //                2026-08-07 on the pruned-host pair — 37,831 chars of an
    //                unrelated summarization notice printed as "the nearest
    //                position-eligible standalone that classify() rejected".
    //   hj === null  the host's `content[0]` carries no tool_use_id, so it has
    //                no identity to look up. This was left out when the pruned
    //                case was fixed, on reasoning rather than measurement. The
    //                measurement (2026-08-08, 100 captures, 0 unreadable,
    //                17,512 pairs, 950 hosts): it occurs TWICE, and BOTH
    //                occurrences reach this branch and report a rejected
    //                candidate — 25,870 and 36,066 chars, each the message at
    //                index 1, neither considered against anything.
    // The field's own name is false in both, so it stays null; the two states
    // are kept APART on the finding, because they print different words.
    const hostPruned = hj !== null && hj < 0;
    const hostIdless = hj === null;
    const hostUnlocated = hostPruned || hostIdless;
    for (const s of sysAfter) {
      if (hj !== null && hj >= 0 && s.j <= hj) continue;
      // Wrapped scan runs alongside the stripped one for every
      // position-eligible candidate, and stops updating once it holds an
      // EXACT (nothing can beat it). This must never short-circuit or
      // otherwise touch the stripped `best`/`rejectedCandidate` tracking
      // below — they stay exactly the scan they always were.
      if (!bestWrapped || bestWrapped.verdict !== "EXACT") {
        const wv = classify(reconWrapped, s.text);
        if (wv === "EXACT") bestWrapped = { verdict: wv, ...s };
        else if (wv === "EXTENDED" && !bestWrapped) bestWrapped = { verdict: wv, ...s };
      }
      const verdict = classify(recon, s.text);
      if (verdict === "EXACT") { best = { verdict, ...s }; break; }
      if (verdict === "EXTENDED") { if (!best) best = { verdict, ...s }; continue; }
      // `text` rides alongside `chars` so a MISMATCH row can print the actual
      // rejected bytes under --verbose (BACKLOG "the census header promises
      // MISMATCH bodies 'printed in full'"), not just their length.
      if (!best && !rejectedCandidate && !hostUnlocated) rejectedCandidate = { j: s.j, chars: s.text.length, text: s.text };
    }
    const offset = best && hj !== null && hj >= 0 ? best.j - hj : null;
    if (best) {
      const sub = best.verdict === "EXTENDED"
        ? subclassifyExtended(recon, best.text, sysBefore)
        : null;
      // The messages strictly between the host and its standalone, in WIRE
      // ORDER, role + closed-vocabulary kind only (`messageKinds`) — the
      // seventh field row 4's placement half needs: two derivation rules are
      // already refuted by measurement (not tail-anchored, not
      // predecessor-length anchored), both computed from the six fields a
      // finding already carried, which is why the next hypothesis needs a
      // field neither of those used. Set iff `offset` is — both require the
      // same located, non-negative `hj` — so a `between` array exists on a
      // finding exactly when that finding's `offset` does; the caller never
      // has to re-derive the guard.
      const between = offset != null
        ? a.slice(hj + 1, best.j).map((m) => ({ role: m?.role ?? null, kind: messageKinds(m) }))
        : null;
      // `hj` (the host's index in `after`) and `nBefore`/`nAfter` (each
      // request's own message count) ride the finding so a placement row can
      // be assembled downstream without re-deriving them — `hj` in
      // particular is never backed out of `offset` (`best.j - hj`), because
      // that inverts the exact fact this exists to carry into an arithmetic
      // reconstruction of it.
      findings.push({ host: i, blocks: blocks.length, ...best, recon, offset, sub,
                       hj, nBefore: b.length, nAfter: a.length, between });
      continue;
    }
    // No standalone counterpart matched the canonical rule. Distinguish a DROP
    // from a rule failure — and the DEFINITION decides which question to ask,
    // never the artifact: a COUNTERPART in this tool is a standalone
    // role:"system" message carrying the block's inner text (the population the
    // `classify()` scan above walks). So the question is "was such a standalone
    // CREATED", i.e. does `after` carry one that `before` did not.
    //
    // Two forms were refuted before this one, both measured (BACKLOG, "the
    // byte-gate's `anyPresent` probe can never return false"):
    //   - the WHOLE SERIALIZED BODY, searched for a 60-char probe (shipped
    //     until 2026-08-08). A reminder text recurs at other indices, so the
    //     predicate cannot return false whatever the pair did — every pruned
    //     host was reported MISMATCH. Measured: s-captureAP reqOrd 97, all
    //     counts DECREASING (4->3, 1->0), reported MISMATCH, correct DROPPED.
    //     Counting the whole body the other way round is worse than wrong: a
    //     migration CONSERVES that count (the inline occurrence disappears
    //     exactly as the standalone appears), so it is blind to the very event
    //     it detects and turns the corpus tally GREEN with the wrapper-envelope
    //     hole live.
    //   - a bare COUNT of standalone carriers, after > before. A pair that
    //     PRUNES one carrier AND creates a counterpart nets zero and reads
    //     DROPPED; prunes are ordinary here (s-captureAP block 0: 3 carriers
    //     -> 2). So the test MATCHES rather than nets: a carrier in `after`
    //     whose text occurs there MORE often than in `before` is one the
    //     predecessor cannot account for. Text identity is the correspondence
    //     relation `subclassifyExtended` already uses against `sysBefore`; no
    //     position convention is invented, because none exists to read.
    //
    // The residual, named rather than hidden: a counterpart whose text is
    // byte-identical to a carrier pruned in the same pair is accounted for by
    // it and reads DROPPED. The one-way error property (a true DROPPED may be
    // reported MISMATCH, never the reverse) holds outside that case, which is
    // what lets the corpus tally stand as an upper bound on holes.
    const { before: carriersBefore, after: carriersAfter } = sysCounts();
    const anyCreated = blocks.some((t) => {
      const inner = unwrapText(t);
      if (!inner.length) return false;
      for (const [text, n] of carriersAfter) {
        if (n <= (carriersBefore.get(text) ?? 0)) continue;
        if (text.includes(inner)) return true;
      }
      return false;
    });
    const verdict = anyCreated ? "MISMATCH" : "DROPPED";
    // Sub-classification, MISMATCH only. Precedence, in order: a host that
    // could not be LOCATED never had a position to weigh a wrapped candidate
    // against, so those two states win before wrapped evidence is even
    // consulted; only then does whether a wrapper-retained hit exists (and
    // its own verdict) decide the label; UNRELATED is what is left when the
    // host was located and nothing — stripped or wrapped — accounts for it.
    let mismatchSub = null, wrapped = null, wrappedSub, diag;
    if (verdict === "MISMATCH") {
      wrapped = bestWrapped
        ? { verdict: bestWrapped.verdict, j: bestWrapped.j,
            offset: hj !== null && hj >= 0 ? bestWrapped.j - hj : null }
        : null;
      mismatchSub = hostPruned ? "HOST-PRUNED"
        : hostIdless ? "HOST-IDLESS"
        : bestWrapped?.verdict === "EXACT" ? "WRAPPER-RETAINED-EXACT"
        : bestWrapped?.verdict === "EXTENDED" ? "WRAPPER-RETAINED-EXTENDED"
        : "UNRELATED";
      // Reported as DATA, labelled — this is not a verdict about
      // absorbability, only where the wrapped-EXTENDED remainder came from.
      // Reuses the exact primitive the stripped EXTENDED branch uses, against
      // the same predecessor population (`sysBefore`).
      if (mismatchSub === "WRAPPER-RETAINED-EXTENDED") {
        wrappedSub = subclassifyExtended(reconWrapped, bestWrapped.text, sysBefore);
      }
      // UNRELATED is the label that says least, and it is the one a design
      // decision would rest on: "neither reconstruction accounts for this" can
      // mean the wrapper bytes differ, the block ORDER differs, or the content
      // is genuinely new — three different answers for row 4, and the label
      // separates none of them. So an UNRELATED row carries the wrapper-region
      // ARITHMETIC, which is where the first two hypotheses live and which is
      // free to compute here.
      //
      // Why this is not a fourth sub-class: what the numbers below discriminate
      // is not yet known to be a closed set, and minting a vocabulary before
      // the population is read is how a label starts standing in for its own
      // body. They are measurements; the reading stays human.
      //
      // `overhead` is the block's own bytes minus its unwrapped inner text —
      // exactly 37 for the canonical form (`<system-reminder>\n` = 18 plus
      // `\n</system-reminder>` = 19). Anything else means the block carries
      // wrapper bytes `canonicalWrapped` reproduces and the candidate does not
      // (or the reverse), which no length total would reveal, since the
      // STRIPPED join can match byte-for-byte while the wrapped one cannot.
      if (mismatchSub === "UNRELATED") {
        diag = {
          reconWrappedChars: reconWrapped.length,
          candidateChars: rejectedCandidate ? rejectedCandidate.text.length : null,
          // Where the wrapper-retained reconstruction and the candidate part
          // company. Null when there is no candidate to compare against —
          // never 0, which would read as "they differ at the first byte".
          wrappedDivOffset: rejectedCandidate
            ? firstDiffOffset(reconWrapped, rejectedCandidate.text) : null,
          blockShapes: blocks.map((t) => ({
            chars: t.length,
            innerChars: unwrapText(t).length,
            overhead: t.length - unwrapText(t).length,
            wrapCanonical: WRAP.test(t),
          })),
        };
      }
    }
    findings.push({ host: i, blocks: blocks.length,
                    verdict,
                    j: null, text: "", recon, sub: null, rejectedCandidate,
                    // An unlocatable host is its own state and gets its own
                    // word: with no `rejectedCandidate` the row would otherwise
                    // fall back to `actual=0ch` — the exact misleading tell
                    // that field was built to cure, handed back to the reader.
                    // A pruned host, an ID-less host and a genuinely empty
                    // counterpart are three findings, not one (dev-loop.md,
                    // "give the state that has no word yet its own string").
                    hostPruned, hostIdless,
                    ...(verdict === "MISMATCH"
                      ? { mismatchSub, wrapped,
                          ...(wrappedSub !== undefined ? { wrappedSub } : {}),
                          ...(diag !== undefined ? { unrelatedDiag: diag } : {}) }
                      : {}) });
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

// --- duplicate requests (CC#78420's falsifier, as a standing counter) ---

/**
 * DEFINITION: two request bodies are the same request when their bodies are
 * byte-identical — the WHOLE body (model, max_tokens, messages, metadata),
 * not the messages alone, because what #78420 alleges is the same REQUEST
 * charged twice.
 *
 * Byte-identical is measured on the parse/stringify normal form, the same one
 * `analysePair` compares message arrays with. Key ORDER survives a JSON
 * round trip, so this is the capture's bytes up to whitespace.
 *
 * The message-count test is a short-circuit, not a second definition: equal
 * bodies necessarily have equal message counts, so it can reject pairs but can
 * never hide one. It is here because consecutive requests in a conversation
 * normally GROW, and stringifying two multi-megabyte bodies on every pair of
 * the corpus would double the sweep's runtime to answer a question the length
 * already answered.
 */
export function sameBody(a, b) {
  const ma = a?.messages, mb = b?.messages;
  if (!Array.isArray(ma) || !Array.isArray(mb)) return false;
  if (ma.length !== mb.length) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Accumulator for one CAPTURE's duplicate scan: per-conversation open runs,
 * member ids whose outcome has not arrived (`pending`), outcome ids that
 * arrived BEFORE their request was known to be a member (`billed`), and the
 * streaks seen so far.
 *
 * `billed` exists because of the ordering the wire actually has, which the
 * first version of this counter got wrong and its own test caught: a streak's
 * FIRST request is answered — and its outcome record written — before the
 * duplicate send that makes it a member. Matching only forwards attributed
 * zero billing to every streak opener, i.e. it under-reported exactly the
 * #78420 signal (first send charged, duplicate charged again) it exists to
 * catch. It holds one short id per outcome record and is dropped with the
 * capture — negligible beside the previous BODY per conversation the census
 * loop already retains.
 */
export function newDuplicateScan() {
  return { runs: new Map(), pending: new Map(), billed: new Map(), coalesced: new Map(), coalesceMisses: new Map(), streaks: [] };
}

/**
 * The streak-level request shape, read ONCE from the streak's FIRST member's
 * body. `sameBody` is what makes a run a run in the first place, so every
 * member's body is byte-identical by construction — one read is the whole
 * streak's answer, never re-derived per member. A missing or non-object body
 * reports null for every field, never 0 and never a silently omitted key: a
 * body-shape question this tool cannot answer is a different state than
 * "zero messages" or "no max_tokens set".
 */
function requestShapeOf(body) {
  if (!body || typeof body !== "object") return { model: null, nMsg: null, maxTokens: null };
  return {
    model: body.model ?? null,
    nMsg: Array.isArray(body.messages) ? body.messages.length : null,
    maxTokens: body.max_tokens ?? null,
  };
}

/**
 * The facts one outcome record contributes to the member it billed:
 * requestId, model, wall time, and the usage the API actually reported.
 *
 * `outputTokens` is a KNOWN PLACEHOLDER, not a completion length:
 * `buildOutcomeRecord` (proxy/extensions/request-capture.mjs) writes the
 * outcome record on `message_start`, before the completion exists, so this
 * is the message_start-time value CC reported at that instant — carried
 * through verbatim here, and no later consumer should read it as an answer
 * length.
 */
function outcomeFacts(rec) {
  const u = rec?.usage;
  return {
    requestId: rec?.requestId ?? null,
    model: rec?.model ?? null,
    ms: rec?.ms ?? null,
    usage: u ? {
      cacheRead: u.cacheRead ?? null,
      cacheCreation: u.cacheCreation ?? null,
      inputTokens: u.inputTokens ?? null,
      outputTokens: u.outputTokens ?? null,
    } : null,
  };
}

/** A request joins the run it duplicates, and brings its billing state with
 *  it: its outcome record may already have gone past. An id-less record cannot
 *  be matched to an outcome at all, and says so rather than reading as
 *  unbilled. `rec` is the request record itself (not just its id), so the
 *  member row carries its own pointer (id/ts/line) — never body content
 *  (corpus hygiene: streak rows already carry no request bodies). */
function addMember(scan, run, rec) {
  run.length++;
  const id = rec?.id;
  const idStr = (typeof id === "string" && id) ? id : null;
  const member = { id: idStr, ts: rec?.ts ?? null, line: rec?.__line ?? null, outcome: null, coalesced: null, coalesceMiss: null };
  run.members.push(member);
  if (!idStr) { run.noId++; return; }
  // A member can be coalesced OR billed, never both: the coalesced send never
  // reached upstream, so no outcome record can exist for it. Both arrival
  // orders are handled for the same reason `billed` handles both — appends
  // from concurrent requests interleave in one capture file, so wire order is
  // not a guarantee this reader may rest on.
  if (scan.coalesced.has(idStr)) {
    member.coalesced = scan.coalesced.get(idStr);
    scan.coalesced.delete(idStr);
    run.coalesced++;
  }
  if (scan.billed.has(idStr)) {
    member.outcome = scan.billed.get(idStr);
    scan.billed.delete(idStr);
    run.billed++;
  } else {
    scan.pending.set(idStr, run);
  }
}

/**
 * Track one same-conversation ADJACENT pair. `scan.runs` holds at most one
 * OPEN run per conversation, so a maximal run of k identical bodies is one
 * streak of length k and k-1 pairs — never k-1 streaks of 2.
 *
 * Adjacency is the conversation's, never the file's: the caller pairs
 * (previous request of THIS conversation, current), which is what makes an
 * interleaved subagent request stop being an artificial break. That is the
 * whole difference between the 07-29 and 07-30 hand probes (header).
 *
 * Returns the run this pair belongs to, or null when the bodies differ — in
 * which case any open run for the conversation is closed, since a streak is
 * maximal by definition.
 */
export function trackDuplicate(scan, cid, before, current) {
  if (!sameBody(before?.body, current?.body)) {
    scan.runs.delete(cid);
    return null;
  }
  let run = scan.runs.get(cid);
  if (!run) {
    const shape = requestShapeOf(before?.body);
    run = { cid, sid: current.sid ?? null, length: 0, billed: 0, coalesced: 0, noId: 0,
            startTs: before.ts ?? null, startLine: before.__line ?? null,
            lastTs: before.ts ?? null, lastLine: before.__line ?? null,
            model: shape.model, nMsg: shape.nMsg, maxTokens: shape.maxTokens,
            members: [], intervalMs: null };
    addMember(scan, run, before);
    scan.runs.set(cid, run);
    scan.streaks.push(run);
  }
  addMember(scan, run, current);
  run.lastTs = current.ts ?? null;
  run.lastLine = current.__line ?? null;
  // Last member's ts minus first member's ts, in wire order — recomputed on
  // every extension of the run so it always reflects the streak's true
  // first/last so far. null when either stamp is missing, never a NaN
  // wearing a number's costume.
  run.intervalMs = (run.startTs && run.lastTs) ? Date.parse(run.lastTs) - Date.parse(run.startTs) : null;
  return run;
}

/**
 * An outcome record: that request was answered and charged. It bills a member
 * immediately, or is REMEMBERED for the request that has not yet turned out to
 * be one (see `newDuplicateScan` on why that direction is the common one).
 * Consumed on match, so one outcome record can never bill two requests —
 * that invariant, and the counts `summariseDuplicates` returns, are
 * unchanged by carrying the record's facts.
 *
 * `outcomeRecord` (optional — existing callers that only ever needed the
 * count still pass just an id) is reduced to its facts and attached to the
 * member it billed, in EITHER arrival order: the pending branch attaches
 * straight to the found member; the remembered branch stashes the facts in
 * `scan.billed` and `addMember` reads them back out once that member is
 * finally seen.
 * Returns whether it billed a member right now.
 */
export function noteOutcome(scan, id, outcomeRecord) {
  if (typeof id !== "string" || !id) return false;
  const facts = outcomeRecord ? outcomeFacts(outcomeRecord) : null;
  const run = scan.pending.get(id);
  if (!run) { scan.billed.set(id, facts); return false; }
  scan.pending.delete(id);
  run.billed++;
  const member = run.members.find((m) => m.id === id);
  if (member) member.outcome = facts;
  return true;
}

/**
 * A COALESCED record: that send never reached upstream — row 31's mitigation
 * served it from another request's in-flight answer.
 *
 * This is the reason the record exists on disk at all. Without it, a coalesced
 * member is a streak member with no outcome, which is BYTE-FOR-BYTE the shape
 * of a retry streak's unanswered send — so the mitigation's success would be
 * counted as the failure class it removes. `billed` stays untouched here on
 * purpose: nothing was charged for this send, and inflating the billing count
 * to mark it would corrupt the one number `doubleBilledStreaks` is derived
 * from.
 *
 * Mirrors `noteOutcome` in both arrival directions, and deliberately does NOT
 * consume from `scan.pending`: a pending id means "no outcome yet", which stays
 * true — a coalesced send never gets one.
 */
export function noteCoalesced(scan, id, coalescedRecord) {
  if (typeof id !== "string" || !id) return false;
  const facts = coalescedRecord
    ? {
        leaderId: coalescedRecord.leaderId ?? null,
        sha: coalescedRecord.sha ?? null,
        deltaMs: coalescedRecord.deltaMs ?? null,
      }
    : null;
  // `scan.pending` is the id->run index of members with no outcome yet, which
  // is exactly where a coalesced member lives and stays: it never gets one.
  // Looking it up here rather than scanning `scan.streaks` keeps this O(1) —
  // a linear scan per record would be quadratic on a capture where coalescing
  // is common, which is the corpus this mitigation is FOR.
  const run = scan.pending.get(id);
  if (!run) { scan.coalesced.set(id, facts); return false; }
  const member = run.members.find((m) => m.id === id);
  if (!member || member.coalesced) return false; // one record per send, never counted twice
  member.coalesced = facts;
  run.coalesced++;
  return true;
}

/**
 * The MISS twin (row 31, added 2026-08-18). A duplicate the mitigation did NOT
 * coalesce keeps its outcome record, so by SHAPE it is an ordinary billed
 * member and the rollup counts it as one — correctly, because it really was
 * charged. What the counters cannot say is that a coalescing opportunity was
 * seen and lost, and WHICH of the two ways the window failed; that is what the
 * record carries and what this attaches to the member, so a streak row answers
 * "why was this one not absorbed" without a hand walk over the capture.
 *
 * Unlike a coalesced member this one is NOT in `scan.pending` — it has an
 * outcome — so the lookup goes through the run index, and a miss whose member
 * has not been seen yet is stashed the same way `noteCoalesced` stashes an
 * early record.
 */
export function noteCoalesceMiss(scan, id, missRecord) {
  if (typeof id !== "string" || !id) return false;
  const facts = missRecord
    ? {
        leaderId: missRecord.leaderId ?? null,
        sha: missRecord.sha ?? null,
        reason: missRecord.reason ?? null,
        ageMs: missRecord.ageMs ?? null,
        arrivalDeltaMs: missRecord.arrivalDeltaMs ?? null,
      }
    : null;
  const run = scan.runs.get(id) ?? scan.pending.get(id);
  if (!run) { scan.coalesceMisses.set(id, facts); return false; }
  const member = run.members.find((m) => m.id === id);
  if (!member || member.coalesceMiss) return false; // one record per send
  member.coalesceMiss = facts;
  run.coalesceMisses = (run.coalesceMisses ?? 0) + 1;
  return true;
}

/**
 * The capture's rollup. `pairs` is derived from the streaks (sum of
 * length - 1) rather than counted alongside them, so the two can never
 * disagree about what a streak is.
 *
 * THE ALARM IS `doubleBilledStreaks`, not `billedStreaks`, and the difference
 * is the definition of the defect rather than a threshold. A retry that
 * finally succeeds bills EXACTLY ONE of its sends: the failed attempts never
 * produced an outcome record, and one charge for one answer is correct
 * behaviour. Measured on the live corpus 2026-08-01: 32 of 67 streaks carry a
 * billed request, and treating that as the signal would raise an alarm on the
 * corpus's normal state — the check-that-fires-on-a-non-defect shape
 * (dev-loop.md). Two or more outcome records inside one streak is the thing
 * CC#78420 alleges: one body, answered and charged more than once.
 * `billedStreaks` and `billedRequests` stay as the decomposition.
 *
 * `coalescedRequests`/`coalescedStreaks` are the MITIGATION's own number, and
 * they are why row 31's record exists: a send the proxy served from another
 * request's in-flight answer is a member with no outcome, indistinguishable by
 * shape from a retry's unanswered send. Counted separately, the mitigation's
 * effect is a daily figure instead of a hand-count — and a streak whose
 * members are all coalesced-or-billed is a suppressed duplicate rather than an
 * unexplained one.
 *
 * THE CLASS SPLIT, added 2026-08-15, and it exists because row 31's
 * done-criterion is TWO-SIDED and no counter here answered either side. The
 * criterion reads: the session-start duplicate class falls to zero WHILE the
 * mid-session class stays UNCHANGED — a fall in the second is over-reach, not
 * success, because there the follower is a real retry whose first attempt was
 * never answered. Both halves were corpus-wide totals until now, so the
 * criterion could only be settled by hand, which is the hand-derivation
 * closing-gate question 3 says the census should be emitting instead.
 *
 * The discriminator is the one row 31's own entry names — `nMsg` alone: the
 * mitigation's four conditions require `nMsg === 1`, so the mid-session class
 * fails on that field before any other is read. This split is therefore the
 * ENTRY's predicate, not a new judgement made here. What it deliberately does
 * NOT claim: `singleMessage` is not "the mitigation's class" — the mitigation
 * also requires no tools, byte-identical bodies and a <50 ms interval, none of
 * which this counter reads. It is the widest bucket the mitigation can act in,
 * which is the right shape for a criterion that wants the class to fall to
 * zero.
 *
 * TWO buckets, and the third one this started with was DELETED before it
 * shipped, which is worth writing down because it is the more useful half.
 * The obvious design was three — `singleMessage`, `multiMessage`, and an
 * `unknownShape` bucket for `nMsg: null`, on the three-answer rule that an
 * unmeasured streak must not read as a measured one. Its bite failed on first
 * run, for a reason nobody planted: NO INPUT CAN REACH IT. `sameBody` gates
 * run creation on `messages` being an ARRAY on both sides, so every streak
 * `trackDuplicate` creates has a numeric `nMsg` by construction and
 * `requestShapeOf` can never report null for one. A bucket no input can
 * populate is not an unproven counter, it is an unprovable one — the shape
 * this repo's own rules name — so it went, and the reachability argument is
 * pinned by a bite instead (test/census-duplicate-requests.test.mjs, "a
 * non-object body forms no streak at all").
 *
 * `multiMessage` is every NUMERIC `nMsg` other than 1 — including 0, which the
 * API does not accept and CC therefore does not send, named here so a reader
 * is not surprised to find it on that side rather than in a bucket of its own.
 *
 * The two buckets partition the streaks exactly, which is what makes the split
 * checkable rather than merely present: each per-class counter sums to its
 * corpus-wide sibling (`*Streaks` to `streaks`, `*DoubleBilled` to
 * `doubleBilledStreaks`, `*Coalesced` to `coalescedStreaks`), asserted in
 * test/census-duplicate-requests.test.mjs.
 */
const DUPLICATE_CLASSES = ["singleMessage", "multiMessage"];

/** Which of the two buckets a streak belongs to, by `nMsg` alone. A streak
 *  always has a numeric `nMsg` (see the reachability note above), so this is
 *  total over the streaks that exist. */
export function duplicateClassOf(run) {
  return run?.nMsg === 1 ? "singleMessage" : "multiMessage";
}

export function summariseDuplicates(scan) {
  const s = { pairs: 0, streaks: 0, maxStreak: 0, requests: 0,
              billedRequests: 0, billedStreaks: 0, doubleBilledStreaks: 0,
              coalescedRequests: 0, coalescedStreaks: 0,
              // The MISS side of the same mitigation (row 31). Kept beside the
              // coalesced counts because the pair is the whole signal: absorbed
              // versus seen-and-not-absorbed. The reason tally is what makes a
              // non-zero here actionable rather than merely alarming — the two
              // reasons are two different fixes, and a count that does not
              // separate them says nothing about which one to build. Derived
              // from the members, never enumerated by hand, so a reason added
              // later cannot be dropped by this rollup the way
              // coalescedRequests once was for four days.
              coalesceMissRequests: 0, coalesceMissStreaks: 0,
              coalesceMissReasons: {},
              membersWithoutId: 0 };
  for (const c of DUPLICATE_CLASSES) {
    s[`${c}Streaks`] = 0;
    s[`${c}DoubleBilled`] = 0;
    s[`${c}Coalesced`] = 0;
  }
  for (const run of scan.streaks) {
    s.streaks++;
    s.pairs += run.length - 1;
    s.requests += run.length;
    s.billedRequests += run.billed;
    s.coalescedRequests += run.coalesced ?? 0;
    s.membersWithoutId += run.noId;
    if (run.billed > 0) s.billedStreaks++;
    if (run.billed > 1) s.doubleBilledStreaks++;
    if ((run.coalesced ?? 0) > 0) s.coalescedStreaks++;
    const misses = (run.members ?? []).filter((m) => m.coalesceMiss);
    s.coalesceMissRequests += misses.length;
    if (misses.length > 0) s.coalesceMissStreaks++;
    for (const m of misses) {
      const reason = m.coalesceMiss.reason ?? "unstated";
      s.coalesceMissReasons[reason] = (s.coalesceMissReasons[reason] ?? 0) + 1;
    }
    if (run.length > s.maxStreak) s.maxStreak = run.length;
    const c = duplicateClassOf(run);
    s[`${c}Streaks`]++;
    if (run.billed > 1) s[`${c}DoubleBilled`]++;
    if ((run.coalesced ?? 0) > 0) s[`${c}Coalesced`]++;
  }
  return s;
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

// The byte-gate's own MISMATCH rows had no way OUT of the census (BACKLOG
// "READY — the byte-gate's MISMATCH rows have no way OUT of the census"):
// `details` carries every verdict, unbounded, and never left this process.
// The producer owns its own bound, same convention as the caps above — 200
// is the cap gate-live's `persistRows` already uses for every OTHER per-gate
// row array, chosen there because it sits above every count observed (the
// largest so far a 38-row conservation gate-red).
const MISMATCH_ROW_CAP = 200;

// Backstop for the OFF-MODE placement rows — the minority the export exists to
// carry whole. Counts are reported exactly and uncapped in `placementOffsets`,
// so this bounds only the per-row export of the unusual placements; the
// population is small by construction (27 of 493 at the last full run), so
// tripping this cap would itself be the finding.
const PLACEMENT_ROW_CAP = 200;

// How many rows of the DOMINANT offset ride along. The mode needs no sample to
// be counted — `placementOffsets` has it exactly — so these exist only to show
// the class rather than to measure it, and a large sample would re-create the
// defect this split was written to fix (a 200-row export that was 95% mode).
const PLACEMENT_MODE_SAMPLE = 25;

// Per-row cap on the `between` export (row-4 placement, the seventh field —
// see `analysePair`). 40 sits above anything measured: the widest off-mode
// offset seen is +110, and the export is one row's own intervening span, not
// a corpus-wide count — this bounds export SIZE per row, it does not bound
// what the field can discover. `betweenTruncated` reports the drop the same
// way every other capped row array in this file does: present only when the
// cap actually trimmed something, valued at what it dropped.
const BETWEEN_CAP = 40;

// Same shape of backstop for duplicate-streak detail rows: the counts stay
// exact, the rows are capped and the cap reports what it dropped. Streaks are
// a small population by construction (a hundred pairs across a corpus), so
// tripping this would itself be the finding.
const DUP_ROW_CAP = 5000;

export async function census(paths) {
  const tally = { EXACT: 0, EXTENDED: 0, DROPPED: 0, MISMATCH: 0 };
  const extendedSub = { "MERGED-STANDALONE": 0, "NEW-TEXT": 0 };
  // Precedence order `analysePair`'s `mismatchSub` assignment itself uses —
  // kept identical so the printed tally's row order and the classifier's own
  // precedence never drift apart. All five labels ZERO here rather than
  // absent, so an unmeasured label prints 0 instead of vanishing from output.
  const mismatchSubs = { "HOST-PRUNED": 0, "HOST-IDLESS": 0,
                          "WRAPPER-RETAINED-EXACT": 0, "WRAPPER-RETAINED-EXTENDED": 0,
                          UNRELATED: 0 };
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
  // Duplicate requests: corpus totals, per-capture rollups, capped detail rows.
  // The totals are an EMPTY rollup rather than a second field list — a
  // hand-copied one drifts from `summariseDuplicates` silently, and the
  // key-by-key accumulation below would then add `undefined` and print NaN.
  const duplicates = summariseDuplicates(newDuplicateScan());
  const duplicatesByCapture = new Map();
  const duplicateRows = [];
  let duplicatesTruncated = 0;
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
    // Duplicate-request scan, scoped to the capture like `prev`: billing is
    // matched within one file, and a conversation continued in another capture
    // restarts its run — which can only UNDER-count streaks.
    const dupScan = newDuplicateScan();
    try {
      for await (const r of readRecords(path, torn)) {
        // The billing side of the duplicate counter, and nothing else: an
        // outcome record carries no body, so every analysis below would skip
        // it anyway — it is handled here so that skip is a decision, not a
        // side effect of `conversationOf` returning null.
        if (r.type === "outcome") { noteOutcome(dupScan, r.id, r); continue; }
        if (r.type === "coalesced") { noteCoalesced(dupScan, r.id, r); continue; }
        if (r.type === "coalesce-miss") { noteCoalesceMiss(dupScan, r.id, r); continue; }
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
        trackDuplicate(dupScan, cid, before, r);
        const prune = classifyPrune(before.body.messages, r.body.messages);
        if (prune) {
          prunes[{ "PURE-TAIL-PRUNE": "pure", "INTERIOR-DIVERGENT": "interior",
                   UNANCHORED: "unanchored" }[prune.kind]]++;
          pruneDetails.push({ path, ts: r.ts, ...prune });
        }
        for (const f of analysePair(before, r)) {
          tally[f.verdict]++;
          if (f.sub) extendedSub[f.sub]++;
          if (f.mismatchSub) mismatchSubs[f.mismatchSub]++;
          details.push({ path, ts: r.ts, ...f });
        }
      }
    } catch (e) {
      // A capture that could not be read is its own answer, never a silent
      // zero: it is the population this verdict does NOT cover.
      unreadable.push({ path, error: String(e?.message ?? e) });
      continue;
    } finally {
      // Runs on the read-error path too (that is what `finally` buys): a
      // capture that died halfway still measured the part it read, and
      // dropping those streaks would report a partial read as zero duplicates
      // — the absence-as-a-pass shape this tool was fixed for once already.
      const dup = summariseDuplicates(dupScan);
      if (dup.streaks) {
        for (const k of Object.keys(duplicates)) {
          if (k === "maxStreak") duplicates.maxStreak = Math.max(duplicates.maxStreak, dup.maxStreak);
          else duplicates[k] += dup[k];
        }
        duplicatesByCapture.set(path, dup);
        for (const run of dupScan.streaks) {
          if (duplicateRows.length >= DUP_ROW_CAP) { duplicatesTruncated++; continue; }
          duplicateRows.push({ path, ...run });
        }
      }
    }
    if (withPairs.size) captures++;
    conversations += withPairs.size;
  }
  return { tally, extendedSub, mismatchSubs, prunes, pruneDetails, details, pairs, captures, conversations,
           unreadable, considered: paths.length, tornLines: torn.n,
           volatileChange, volatileKinds, volatileRows: [...rowByEntry.values()], volatileTruncated,
           volatileExempt, volatileByCapture: [...volatileByCapture.entries()],
           volatileEntries: volatileEntries.size,
           volatileEntriesByKind: Object.fromEntries(
             Object.entries(volatileEntriesByKind).map(([k, s]) => [k, s.size])),
           duplicates, duplicatesByCapture: [...duplicatesByCapture.entries()],
           duplicateRows, duplicatesTruncated };
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
  const { tally, extendedSub, mismatchSubs, prunes, pruneDetails, details, pairs, captures, conversations,
          unreadable, considered, tornLines, volatileChange, volatileKinds, volatileRows,
          volatileTruncated, volatileExempt, volatileByCapture,
          volatileEntries, volatileEntriesByKind,
          duplicates, duplicatesByCapture, duplicateRows, duplicatesTruncated } = await census(paths);
  const total = tally.EXACT + tally.EXTENDED + tally.DROPPED + tally.MISMATCH;
  // Printed with every verdict, clean or not: the reader of a byte-gate needs
  // the DENOMINATOR, and "25 capture(s)" over a 39-file corpus read like one.
  const coverage =
    `read ${considered - unreadable.length}/${considered} capture(s), ` +
    `${unreadable.length} UNREADABLE, ${captures} with pairs` +
    (tornLines ? `, ${tornLines} TORN line(s) skipped` : "");

  // The MISMATCH-filtered slice out of `details` (BACKLOG "the byte-gate's
  // MISMATCH rows have no way OUT of the census"): never raw `details`,
  // which is unbounded and includes every other verdict too. Verbatim rows,
  // no reshaping — the census is the recorder, not the interpreter, same
  // convention gate-live's own row arrays already use. `mismatchRowsTruncated`
  // appears only when the cap actually trimmed something, so its PRESENCE
  // alone is what means rows were dropped (the same convention
  // `volatileTruncated`/`duplicatesTruncated` already use elsewhere in this
  // file's own JSON output).
  const mismatchAll = details.filter((d) => d.verdict === "MISMATCH");
  const mismatchRows = mismatchAll.slice(0, MISMATCH_ROW_CAP);

  // The per-row facts behind the "placement" text block's tally, exported so
  // the derivability question (is the index PREDICTABLE per case, not just
  // measured as a distribution) can be asked without re-running the whole
  // corpus by hand. Only findings that HAVE a placement: `best` was found
  // (verdict EXACT or EXTENDED) and the host was actually located, which is
  // exactly the condition `offset` itself is non-null under (`!= null` here
  // catches both the DROPPED/MISMATCH branch, where the field is absent
  // entirely, and a located-but-null offset, though the latter cannot occur
  // together with a found `best`).
  const placementAll = details.filter((d) =>
    (d.verdict === "EXACT" || d.verdict === "EXTENDED") && d.offset != null);
  // The COMPLETE offset distribution, uncapped, so no reader ever derives it
  // from the capped row sample below. Object keys are strings; the values are
  // exact counts over every placement-eligible finding in the run.
  const placementOffsets = {};
  for (const d of placementAll) placementOffsets[d.offset] = (placementOffsets[d.offset] ?? 0) + 1;

  // THE CAP KEEPS THE MINORITY WHOLE AND SAMPLES THE MAJORITY, and that is the
  // whole design rather than a refinement of it. A flat `slice(0, 200)` over a
  // distribution this lopsided discards precisely the rows worth having: the
  // first run of this export kept 200 rows of which 190 were the dominant
  // offset and dropped 548, so the handful of unusual placements — the only
  // ones that can answer whether the index is DERIVABLE rather than merely
  // variable — survived by luck of capture order. A sample of a skewed
  // population is not a small version of it.
  //
  // The dominant value is computed, never hardcoded: it is the MODE of the
  // distribution above, so the rule keeps holding if CC's placement changes.
  // Every row whose offset is not the mode is kept (with its own generous
  // backstop, tripping which is itself a finding); the mode's rows are sampled
  // to prove the class is there.
  const modeOffset = Object.entries(placementOffsets)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const isMode = (d) => String(d.offset) === modeOffset;
  const minority = placementAll.filter((d) => !isMode(d));
  const majority = placementAll.filter(isMode);
  // Two index spaces meet in one row — the BEFORE request's and the AFTER
  // request's — so every field below names its space rather than leaving it
  // to be inferred; conflating them is a mistake this repo has made before.
  const placementRow = (d) => {
    const between = d.between ?? [];
    const betweenTruncated = between.length > BETWEEN_CAP;
    return {
      path: d.path, ts: d.ts, verdict: d.verdict, blocks: d.blocks,
      hostIndexBefore: d.host,   // BEFORE-request index space
      nBefore: d.nBefore,        // BEFORE-request message count
      hostIndexAfter: d.hj,      // AFTER-request index space
      standaloneIndex: d.j,      // AFTER-request index space
      nAfter: d.nAfter,          // AFTER-request message count
      offset: d.offset,          // standaloneIndex - hostIndexAfter, unchanged
      placementClass: isMode(d) ? "MODE-SAMPLE" : "OFF-MODE",
      // The messages strictly between the host and the standalone, WIRE
      // ORDER, role + closed-vocabulary kind only, never text (see
      // `analysePair`). Present — possibly empty — on every row, MODE-SAMPLE
      // included: a derivation rule has to explain the +1 majority too, and
      // an export carrying the shape only for the unusual rows could never
      // test that.
      between: between.slice(0, BETWEEN_CAP),
      ...(betweenTruncated ? { betweenTruncated: between.length - BETWEEN_CAP } : {}),
    };
  };
  const placementRows = [
    ...minority.slice(0, PLACEMENT_ROW_CAP).map(placementRow),
    ...majority.slice(0, PLACEMENT_MODE_SAMPLE).map(placementRow),
  ];

  if (json) {
    // ADDITIVE ONLY. gate-live's summariseCensus and bust-triage read named
    // fields, so new keys ride along without touching either; `volatileChange`
    // keeps the flat counts a daily status file can carry, and the unbounded
    // detail rows appear only under --verbose so the sweep's status file does
    // not grow a row per reminder flip.
    process.stdout.write(JSON.stringify(
      { tally, extendedSub, mismatchSubs, prunes, pairs, captures, conversations, total, considered, unreadable,
        tornLines,
        volatileChange, volatileKinds, volatileTruncated, volatileExempt,
        volatileByCapture, volatileEntries, volatileEntriesByKind,
        duplicates, duplicatesByCapture, duplicatesTruncated,
        placementOffsets,
        ...(verbose ? { volatileRows, duplicateRows, mismatchRows, placementRows,
                         ...(mismatchAll.length > MISMATCH_ROW_CAP
                           ? { mismatchRowsTruncated: mismatchAll.length } : {}),
                         // Truncation is reported per CLASS, because one number
                         // over a split export cannot say which half was lost —
                         // and losing the off-mode half is the defect this
                         // split exists to prevent.
                         ...(minority.length > PLACEMENT_ROW_CAP
                           ? { placementOffModeTruncated: minority.length } : {}),
                         ...(majority.length > PLACEMENT_MODE_SAMPLE
                           ? { placementModeSampled: { kept: PLACEMENT_MODE_SAMPLE, total: majority.length } }
                           : {}) } : {}) },
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

  // Duplicate requests (CC#78420's falsifier as a standing counter). Printed
  // before the migration verdict's early return, like the prunes: a corpus
  // with no container migrations still answers this question. Totals and
  // per-capture rollups only — the streak rows are --verbose, so the daily
  // sweep's status file never grows a row per duplicate.
  const d = duplicates;
  if (d.pairs === 0) {
    process.stdout.write(
      `duplicate requests (same conversation, adjacent, byte-identical bodies): none in ${pairs} pair(s)\n\n`);
  } else {
    process.stdout.write(
      `duplicate requests — ${d.pairs} adjacent byte-identical pair(s) of ${pairs}, in\n` +
      `  ${d.streaks} streak(s) (longest run ${d.maxStreak} requests) covering ${d.requests} request(s).\n` +
      "  Adjacency is the CONVERSATION's, never the capture file's: interleaved\n" +
      "  tenants sit between two requests of one conversation, and a file-adjacent\n" +
      "  scan reports the class absent (the 2026-07-29 probe did exactly that).\n" +
      `  BILLED: ${d.billedRequests} of those requests have a matching outcome record,\n` +
      `  spread over ${d.billedStreaks} streak(s)` +
      (d.membersWithoutId ? `; ${d.membersWithoutId} request(s) carry no id to match on` : "") +
      ".\n" +
      `  DOUBLE-BILLED: ${d.doubleBilledStreaks} streak(s) carry TWO OR MORE outcome records.\n` +
      (d.doubleBilledStreaks === 0
        ? "  That is the CC#78420 claim, and it is not happening here: a streak billed\n" +
          "  once is a retry that finally succeeded (failed sends produce no outcome\n" +
          "  record), and one charge for one answer is correct. Duplicate SENDS cost\n" +
          "  nothing on their own.\n"
        : "  That is the CC#78420 SHAPE — one body, answered and charged more than\n" +
          "  once — and the charge is real whatever produced it. It does NOT by\n" +
          "  itself say CC sent a request it did not need to: a re-send after a\n" +
          "  degenerate answer (outputTokens 1-2) lands here too, billed because\n" +
          "  upstream did answer. Read the rows (--verbose) and their outcome\n" +
          "  records — model, usage, interval — before booking either reading.\n") +
      // Row 31's done-criterion is TWO-SIDED and both sides go in front of a
      // reader here, because a criterion reachable only through --json is a
      // criterion somebody hand-derives. `nMsg === 1` is the entry's own
      // discriminator; it is the widest bucket the mitigation can act in, not
      // a claim that every streak in it was coalescible.
      `  BY CLASS (nMsg === 1 vs everything else — row 31's own discriminator):\n` +
      `    one-message  ${d.singleMessageStreaks} streak(s), ` +
      `${d.singleMessageDoubleBilled} double-billed, ${d.singleMessageCoalesced} coalesced\n` +
      `    many-message ${d.multiMessageStreaks} streak(s), ` +
      `${d.multiMessageDoubleBilled} double-billed, ${d.multiMessageCoalesced} coalesced\n` +
      "    Row 31 closes when the one-message double-billed count reaches 0 WHILE\n" +
      "    the many-message one is UNCHANGED. A fall on the second line is\n" +
      "    over-reach, not success: there the follower is a real retry whose first\n" +
      "    attempt was never answered, and suppressing it strands a live request.\n" +
      "  Billing is matched WITHIN a capture, so a streak at a live file's tail may\n" +
      "  have outcome records that were not written yet when it was read.\n");
    if (duplicatesByCapture.length > 1) {
      process.stdout.write(
        "  per capture (pairs / streaks / longest / requests / billed / DOUBLE-billed streaks):\n");
      for (const [p, a] of duplicatesByCapture) {
        process.stdout.write(
          `    ${basename(p).padEnd(52)} ${String(a.pairs).padStart(6)} /` +
          ` ${String(a.streaks).padStart(6)} / ${String(a.maxStreak).padStart(6)} /` +
          ` ${String(a.requests).padStart(6)} / ${String(a.billedRequests).padStart(6)} /` +
          ` ${String(a.doubleBilledStreaks).padStart(6)}\n`);
      }
    }
    if (verbose && duplicateRows.length) {
      process.stdout.write("  streaks — one row each, pointers only (no bodies):\n");
      for (const row of duplicateRows) {
        process.stdout.write(
          `    x${String(row.length).padStart(3)}  ${row.startTs} -> ${row.lastTs}` +
          `  ${basename(row.path)}:${row.startLine}-${row.lastLine}` +
          `  sid=${(row.sid ?? "?").slice(0, 8)} conv=${row.cid}` +
          `  billed=${row.billed}${row.noId ? ` no-id=${row.noId}` : ""}\n`);
      }
    }
    if (duplicatesTruncated) {
      process.stdout.write(
        `  ROWS TRUNCATED (counts above are exact): ${duplicatesTruncated} streak(s) beyond ${DUP_ROW_CAP}.\n`);
    }
    process.stdout.write("\n");
  }

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
    `  ${String(tally.MISMATCH).padStart(5)}  ${pct(tally.MISMATCH).padStart(6)}  MISMATCH  rule does not hold — every one is a hole\n` +
    (tally.MISMATCH
      ? Object.entries(mismatchSubs).map(([k, n]) =>
          `         ${String(n).padStart(5)}  ${k}\n`).join("")
      : "") +
    `\n`);

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
      // A no-counterpart row (DROPPED/MISMATCH, `d.text` always "") prints
      // its rejected candidate's length when one exists, never a bare 0ch
      // that reads as "nothing found" — see the ~264 comment and BACKLOG's
      // "census must distinguish" entry. FOUR states, not two: where the host
      // could not be LOCATED — pruned from `after`, or carrying no tool_use_id
      // to look it up by — there is no position to consider a candidate
      // against, so there is no rejected candidate either, and `actual=0ch`
      // would hand the reader the same misleading tell one case over. Each
      // gets its own word, and they are different words because they are
      // different states: one says CC removed the host, the other says this
      // tool cannot identify it.
      const actualPart = d.rejectedCandidate
        ? `rejected=${d.rejectedCandidate.chars}ch`
        : d.hostPruned
          ? "host-pruned"
          : d.hostIdless
            ? "host-unlocatable"
            : `actual=${d.text.length}ch`;
      process.stdout.write(
        `  ${d.verdict.padEnd(8)} ${d.ts}  host=${d.host} blocks=${d.blocks}` +
        ` recon=${d.recon.length}ch ${actualPart}${d.sub ? `  ${d.sub}` : ""}\n`);
      if (d.verdict === "EXTENDED") {
        const extra = extendedRemainder(d.recon, d.text);
        process.stdout.write(`             extra: ${JSON.stringify(extra.slice(0, 120))}\n`);
      }
      // Header promise (:46-47 as of this comment): every MISMATCH "is a hole
      // in the rule and is printed in full, because these are what would
      // silently move a bust." Gated behind --verbose (unlike EXTENDED's
      // `extra:`, which is a 120-char preview shown at any verbosity) because
      // it is the full byte-gate hole, not a taste of one, and printed
      // UNTRUNCATED for the same reason — a truncated hole is a smaller claim
      // than the header makes. Prints the reconstruction always; the actually
      // considered-and-rejected standalone only when one exists (BACKLOG "the
      // census header promises MISMATCH bodies 'printed in full'").
      if (d.verdict === "MISMATCH" && verbose) {
        process.stdout.write(`             recon: ${JSON.stringify(d.recon)}\n`);
        if (d.rejectedCandidate) {
          process.stdout.write(`             candidate: ${JSON.stringify(d.rejectedCandidate.text)}\n`);
        }
        // The sub-classification: which of the five states this MISMATCH is,
        // and — for the wrapper-retained forms — the wrapped-reconstruction
        // hit that decided it. `wrappedSub` is reported as data (where the
        // WRAPPER-RETAINED-EXTENDED remainder came from), never a verdict
        // about absorbability.
        process.stdout.write(`             mismatchSub: ${d.mismatchSub}\n`);
        if (d.wrapped) {
          process.stdout.write(`             wrapped: ${JSON.stringify(d.wrapped)}\n`);
        }
        if (d.wrappedSub) {
          process.stdout.write(`             wrappedSub: ${d.wrappedSub}\n`);
        }
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
    // --- duplicate requests (CC#78420's falsifier) ---
    // The definition is the WHOLE body, byte-identical.
    const B = (msgs, extra = {}) => ({ model: "m", messages: msgs, ...extra });
    eq(sameBody(B([M("a")]), B([M("a")])), true, "identical bodies");
    eq(sameBody(B([M("a")]), B([M("b")])), false, "different message text");
    eq(sameBody(B([M("a")]), B([M("a"), M("b")])), false, "different message count");
    eq(sameBody(B([M("a")], { max_tokens: 1 }), B([M("a")], { max_tokens: 2 })), false,
       "same messages, different request parameter — not the same request");
    // Streaks: a run of k identical bodies is ONE streak of length k, never
    // k-1 streaks of 2. Collapsing that is the mutation the test file names.
    const rec = (id, msgs, ts) => ({ id, ts, sid: "s", __line: id, body: B(msgs) });
    const runOf = (...bodies) => {
      const sc = newDuplicateScan();
      const recs = bodies.map((m, i) => rec(String(i + 1), m, `t${i + 1}`));
      for (let i = 1; i < recs.length; i++) trackDuplicate(sc, "c", recs[i - 1], recs[i]);
      return sc;
    };
    const three = runOf([M("a")], [M("a")], [M("a")]);
    eq(summariseDuplicates(three).streaks, 1, "a 3-run is one streak");
    eq(summariseDuplicates(three).pairs, 2, "and two adjacent pairs");
    eq(summariseDuplicates(three).maxStreak, 3, "of length 3");
    eq(summariseDuplicates(three).requests, 3, "covering three requests");
    // A gap CLOSES the run: streaks are maximal, so A A B A A is two of two.
    const split = runOf([M("a")], [M("a")], [M("b")], [M("a")], [M("a")]);
    eq(summariseDuplicates(split).streaks, 2, "a differing body closes the run");
    eq(summariseDuplicates(split).maxStreak, 2, "neither run is longer than 2");
    // Non-adjacent repeats are not duplicates at all.
    eq(summariseDuplicates(runOf([M("a")], [M("b")], [M("a")])).pairs, 0,
       "identical but not adjacent");
    // The billing discriminator: an outcome record for a member bills it.
    eq(summariseDuplicates(three).billedRequests, 0, "no outcome records seen");
    eq(noteOutcome(three, "2"), true, "outcome for a streak member");
    eq(noteOutcome(three, "2"), false, "one outcome bills exactly one request");
    eq(noteOutcome(three, "999"), false, "outcome for a non-member bills nothing");
    eq(summariseDuplicates(three).billedRequests, 1, "billed request counted");
    eq(summariseDuplicates(three).billedStreaks, 1, "and its streak is a billed one");
    // ONE charge for one answer is a successful retry, not a double bill —
    // the alarm needs a second outcome record inside the same streak.
    eq(summariseDuplicates(three).doubleBilledStreaks, 0, "one charge is not a double charge");
    eq(noteOutcome(three, "3"), true, "a second member of the same streak was charged");
    eq(summariseDuplicates(three).doubleBilledStreaks, 1, "one body, two charges — the alarm");
    // The ORDER the wire has: a streak's first request is answered before the
    // duplicate send exists, so its outcome record goes past BEFORE it is a
    // member. Matching only forwards zeroes out every streak opener.
    const early = newDuplicateScan();
    const r1 = rec("e1", [M("a")], "t1"), r2 = rec("e2", [M("a")], "t2");
    eq(noteOutcome(early, "e1"), false, "not a member yet");
    trackDuplicate(early, "c", r1, r2);
    eq(summariseDuplicates(early).billedRequests, 1, "the opener's earlier outcome still bills it");
    // An id-less member cannot be matched — that is a THIRD answer, not "unbilled".
    const noid = newDuplicateScan();
    trackDuplicate(noid, "c", { ts: "t1", body: B([M("a")]) }, { ts: "t2", body: B([M("a")]) });
    eq(summariseDuplicates(noid).membersWithoutId, 2, "no id, no match possible");
    eq(summariseDuplicates(noid).billedRequests, 0, "and nothing is claimed about billing");

    eq(firstDiffOffset("abc", "abd"), 2, "first divergence offset");
    eq(firstDiffOffset("ab", "abc"), 2, "prefix then longer");
    eq(firstDiffOffset("ab", "ab"), -1, "equal strings");

    process.stdout.write("reminder-migration-census: selftest passed\n");
  } else {
    // `process.exit()` here truncated its own output: a single large
    // `--json --verbose` write (this member's own MISMATCH-rows export,
    // 200 rows, ~146 KB) landed as invalid JSON at the reading end because
    // `process.exit()` does not wait for a pending async stdout write to a
    // pipe to drain — found by executing the new capability against its own
    // cap, not by reasoning about it. Setting `exitCode` and returning lets
    // Node's normal shutdown flush stdout before the process actually exits;
    // no behavior for a caller reading the exit code changes.
    process.exitCode = await main(process.argv);
  }
}
