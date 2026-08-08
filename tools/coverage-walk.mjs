#!/usr/bin/env node
// coverage-walk — answer "is this content on the wire" by WALKING the
// forwarded array, never by scanning it for a substring.
//
// CERTIFIED 2026-08-08 by `test/coverage-walk-bite.test.mjs` (9 tests). Each
// covering condition has its own bite, and each was shown RED by breaking
// THAT condition's wiring alone — one mutant at a time, exactly one bite
// firing per mutant, reproduced by the dispatcher before integration. The
// suite also carries the two controls that stop the fixtures collapsing into
// one: a whole-string scan must FAIL on the join fixture (with its own
// positive control that the same scan finds each individual piece), and each
// fixture asserts the other's conditions are no-ops on it.
// WHICH POSITIVES ARE REAL, stated because it is the difference between
// certified and certified-on-what: `reminder-unwrap`, `multi-piece` and
// `separator-skip` are red on the REAL known positive (the 31 rows). Nothing
// in that population reaches a list-content sub-block — 93 covering pieces,
// zero from one — so `list-content-descent` and the `tool_reference` reader
// are red on a SYNTHETIC positive instead. That reach is not exotic: the full
// forwarded dump of one capture carries 186 list-content `tool_result` blocks
// with 186 `text` and 62 `tool_reference` sub-blocks.
// This banner replaced an UNCERTIFIED one, which existed because the builder
// wrote "must not be pushed without a bite" into `dbf85e4`'s message and the
// dispatcher pushed it anyway (`7827c4e`) — a commit message sits on nobody's
// read path once the commit is in, and the next reader of this tool reads
// this file.
//
// The question this replaces. A conservation row names a message the gate
// could not account for; attributing it means asking whether the bytes
// really left the wire or whether the gate merely could not see them. Every
// hand-rolled answer to that so far has been a substring scan, and a
// substring scan answers a NARROWER question than the one asked: it can only
// find content that survives as ONE contiguous piece in ONE block. Content
// that survives re-served in several pieces scans as absent, and the label
// that comes back is a definite REAL-LOSS with a true stated basis.
//
// Measured, and this is the known positive this file exists for: the 31
// `suppressed-without-copy` rows on capture s-captureAH (in[57], one
// byte-identical 9865-code-unit system message, 2026-08-06). A whole-string
// scan of the forwarded array finds 0% of it. The walk finds 100%, in three
// pieces across two forwarded messages:
//
//     unwrap(fwd[55].content[9])  683 cu   <- <system-reminder>-wrapped text
//     unwrap(fwd[55].content[10]) 683 cu   <- <system-reminder>-wrapped text
//     fwd[57].content            8495 cu   <- string-content system message
//     joined by "\n\n" == the raw message, byte for byte
//
// So the bytes were on the wire the whole time. What put them out of the
// GATE's reach is narrower than "the gate cannot see joins": it reconstructs
// a cross-message join only for ADJACENT forwarded messages
// (crossJoinUnitHash, replay.mjs), and the two contributing messages here sit
// at 55 and 57 with an unrelated message between them.
//
// --- What this walks, and where the enumeration comes from ---
//
// The container enumeration is derived from the SHAPES THE WIRE CARRIES, read
// off the real bodies, never from what a previous probe happened to handle.
// Surveyed over the preserved forwarded arrays of the three 2026-08-07 sweep
// captures: message.content is a string or a list; blocks are `text`
// (text:str), `tool_result` (content:str), `tool_result` (content:LIST, 7 of
// them, carrying `text` and `tool_reference` sub-blocks), `tool_use`,
// `thinking`, `tool_addition`.
//
// --- Three answers, and the ONE rule that produces the third ---
//
//     COVERED           every readable code unit of the row's content was
//                       found on the wire
//     UNCOVERED         it was not, and the remainder is reported VERBATIM
//     COULD-NOT-VERIFY  its own answer, folded into neither
//
// The third is not an enumeration of the cases someone foresaw. It is one
// rule, applied to the asymmetry between the two verdicts:
//
//     COVERED is a POSITIVE proof — the walk exhibits the pieces, so
//     anything it could not read is irrelevant to the claim.
//     UNCOVERED is an ABSENCE claim — it rests on the walk's REACH, so
//     whatever the walk could not read can hold the remainder.
//
// Therefore: whatever the walk cannot read makes the answer that DEPENDS on
// it could-not-verify. An unreadable container on the raw side (the thing
// being measured) blocks both verdicts; an unreadable container on the
// forwarded side (the population searched) blocks only UNCOVERED. Every
// reason is COMPUTED from what the walk actually hit and names it — a reason
// assembled from guesses is executed by nothing and reads exactly like a
// measured one (dev-loop, "A tool's could-not-verify REASON is a claim").
//
// --- The conditions are NAMED and individually disableable ---
//
// `--without <condition>` removes exactly one named condition and nothing
// else. That exists so a bite's mutation can remove the exact condition the
// bite names rather than adjacent machinery (dev-loop, "Adding a check"): a
// mutation that deletes a neighbour is evidence about the mutation before it
// is evidence about the bite. Measured on the 31-row known positive:
//
//     (none)                 COVERED    100.00%, 3 pieces
//     reminder-unwrap        UNCOVERED    0.00%, 0 pieces
//     multi-piece            UNCOVERED    6.92%, 1 piece
//     separator-skip         UNCOVERED    6.92%, 1 piece
//     list-content-descent   COVERED    100.00%, 3 pieces  <- NOT load-bearing
//
// The last line is the honest record, and it is load-bearing for how this
// tool may be certified: list-content descent is real reach the wire needs
// (the survey above found 7 list-content tool_result blocks), but this known
// positive does not exercise it, so a bite naming THAT condition would go
// green against a mutation and prove nothing. The three conditions above it
// are the ones this positive can certify.
//
// Usage:
//   node tools/coverage-walk.mjs <capture.jsonl> --dump <dump.jsonl>
//        --rows <rows.json> [--json] [--without <condition>]...
//
// <dump.jsonl> is `replay.mjs --dump-forwarded N:I,... --dump-out` output.
// <rows.json> is an array of conservation rows: {n, ts, at, side, ...}.
// Exit 0 whatever it finds — this reports, the reader judges. Unreadable
// input exits 2, so a broken invocation is never read as "nothing to see".

import { readFileSync } from "node:fs";

import { readCapture, blockUnitsFull } from "./replay.mjs";

// The conditions, as a closed set. A `--without` naming anything else is a
// hard error rather than a silent no-op: a mutation that quietly removed
// nothing would leave a bite green and read as evidence about the bite.
const CONDITIONS = new Set([
  "reminder-unwrap",
  "list-content-descent",
  "multi-piece",
  "separator-skip",
]);

// Block types the wire carries that hold NO conversation text — declared, so
// that a shape outside both this set and the text-bearing readers below is
// UNKNOWN rather than silently skipped. An unknown that fails loudly catches
// what a silent exemption hides; the cost of getting this list wrong in the
// permissive direction is a false UNCOVERED, which is the exact
// over-reporting-loss direction this tool exists to close.
const TEXTLESS_TYPES = new Set(["tool_use", "thinking", "tool_addition", "image", "tool_reference"]);

const JOIN_SEPARATORS = ["\n\n", "\n"];

/**
 * Text units of one message, with every container the walk could not read
 * recorded beside them rather than dropped.
 *
 * `blockUnitsFull` is IMPORTED, never restated: it is the pipeline's own
 * notion of a unit, and it is what performs the `<system-reminder>` unwrap.
 * It projects `text: null` for every non-text block by design — that design
 * is right for the gate (a tool_result never participates in a join) and is
 * exactly the reach limit this walk has to exceed, so the descent below adds
 * the text-bearing container shapes it declines to enter.
 *
 * Returns { units, unreadable, textless } where `unreadable` names a shape
 * this walk has no reader for — the input to the could-not-verify rule.
 */
export function textUnitsOf(msg, opts = {}) {
  const unwrap = opts.reminderUnwrap !== false;
  const descend = opts.listContentDescent !== false;

  const c = msg?.content;
  const blocks = typeof c === "string"
    ? [{ type: "text", text: c }]
    : (Array.isArray(c) ? c : null);
  if (blocks === null) {
    // Not a shape the wire is known to carry at all. Named, not assumed away.
    return { units: [], unreadable: [`message.content:${c === null ? "null" : typeof c}`], textless: 0 };
  }

  // The unwrapped projection, one entry per block, in block order. Taking it
  // per-message (rather than per-block) keeps `standalone` meaning what it
  // means in the pipeline — it reads `blocks.length`.
  const projected = blockUnitsFull(msg);

  // ALIGNMENT, checked rather than assumed. `blockUnitsFull` ends in
  // `.filter(u => u.hash !== null)`, and this walk indexes its result by
  // block position — so a projection that ever DID drop a block would
  // silently shift every later block's text onto the wrong index, which is
  // the two-coordinate-spaces error with no symptom. The filter cannot fire
  // today (hashMessageContent returns null only for non-array content, and
  // it is called with a one-element array), so this is not defensive
  // handling of an impossible case: it is the guard that makes the
  // dependency loud if that ever changes.
  if (projected.length !== blocks.length) {
    return {
      units: [], textless: 0,
      unreadable: [`block projection misaligned: ${projected.length} unit(s) for ${blocks.length} block(s)`],
    };
  }

  const units = [];
  const unreadable = [];
  let textless = 0;

  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi];
    if (b === null || typeof b !== "object") {
      unreadable.push(`block[${bi}]:${b === null ? "null" : typeof b}`);
      continue;
    }
    const proj = projected[bi];

    // 1. Text carried by the block itself. `proj.text` is the UNWRAPPED form;
    //    the raw `b.text` goes in too, because a message can quote a
    //    reminder with its envelope intact and the walk must match either.
    if (proj && typeof proj.text === "string" && proj.text !== "") {
      units.push({ bi, si: null, text: unwrap ? proj.text : (typeof b.text === "string" ? b.text : proj.text) });
      if (unwrap && typeof b.text === "string" && b.text !== proj.text) {
        units.push({ bi, si: null, text: b.text });
      }
      continue;
    }

    // 2. String-valued block.content — the ordinary tool_result shape, 158 of
    //    them in the survey. `blockUnitsFull` projects null here.
    if (typeof b.content === "string") {
      if (b.content !== "") units.push({ bi, si: null, text: b.content });
      else textless++;
      continue;
    }

    // 3. List-valued block.content — the shape a substring scan of `text` and
    //    string `content` can never reach, and the one this walk was
    //    graduated to enter.
    if (Array.isArray(b.content)) {
      if (!descend) { textless++; continue; }
      for (let si = 0; si < b.content.length; si++) {
        const sub = b.content[si];
        if (sub === null || typeof sub !== "object") {
          unreadable.push(`block[${bi}].content[${si}]:${sub === null ? "null" : typeof sub}`);
          continue;
        }
        if (typeof sub.text === "string") {
          if (sub.text !== "") units.push({ bi, si, text: sub.text });
          else textless++;
        } else if (typeof sub.content === "string") {
          if (sub.content !== "") units.push({ bi, si, text: sub.content });
          else textless++;
        } else if (TEXTLESS_TYPES.has(sub.type)) {
          textless++;
        } else {
          unreadable.push(`block[${bi}].content[${si}] type=${String(sub.type)}`);
        }
      }
      continue;
    }

    // 4. Declared textless shapes.
    if (TEXTLESS_TYPES.has(b.type)) { textless++; continue; }

    // 5. Everything else. This is the branch that must exist: a shape nobody
    //    enumerated reaches it and says so, instead of contributing silence.
    unreadable.push(`block[${bi}] type=${String(b.type)}`);
  }

  return { units, unreadable, textless };
}

/**
 * Walk `raw` left to right, consuming the LONGEST unit that matches at the
 * current offset, skipping the separators a join is made of.
 *
 * The accumulation is the point. The bytes of one message can leave the wire
 * as several separately re-served pieces, and a check that demands one
 * contiguous match reports the whole message lost when every byte of it is
 * present. Longest-match rather than first-match because a short unit that
 * happens to prefix a long one would otherwise strand the remainder and
 * produce a partial coverage number that means nothing.
 */
export function walkCoverage(raw, units, opts = {}) {
  const multiPiece = opts.multiPiece !== false;
  const separatorSkip = opts.separatorSkip !== false;

  let pos = 0;
  const pieces = [];
  let progress = true;
  while (pos < raw.length && progress) {
    progress = false;
    let best = null;
    for (const u of units) {
      if (!u.text) continue;
      if (!raw.startsWith(u.text, pos)) continue;
      if (best === null || u.text.length > best.text.length) best = u;
    }
    if (best !== null) {
      pieces.push({ offset: pos, fwdIdx: best.i, blockIdx: best.bi, subIdx: best.si, codeUnits: best.text.length });
      pos += best.text.length;
      if (!multiPiece) break;
      progress = true;
      continue;
    }
    if (separatorSkip) {
      for (const sep of JOIN_SEPARATORS) {
        if (raw.startsWith(sep, pos)) { pos += sep.length; progress = true; break; }
      }
    }
  }
  return { coveredTo: pos, pieces };
}

// --- inputs -----------------------------------------------------------------

/**
 * Read a --dump-forwarded dump into Map<n, {byIdx, msgsLen, outBodySha, dumped}>.
 *
 * The dump is an INPUT here, so the cross-check absorption-classify runs
 * between its two passes is not available — but the dump carries enough to
 * check itself: every line for one `n` must agree on `outBodySha` and
 * `msgsLen`, or the lines describe two different forwarded bodies and nothing
 * built on them means anything. A disagreement is fatal rather than a row
 * verdict, because it invalidates the input, not one row.
 *
 * `dumped` is what makes REACH computable: a dump that names only some
 * indices of the forwarded array searched only part of the wire, and an
 * UNCOVERED verdict from a partial dump is could-not-verify.
 */
export function readDump(path) {
  const byN = new Map();
  const text = readFileSync(path, "utf8");
  let lineNo = 0;
  for (const line of text.split("\n")) {
    lineNo++;
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch {
      throw new Error(`dump ${path}:${lineNo} is not JSON — the dump is unreadable, so nothing rests on it`);
    }
    let e = byN.get(r.n);
    if (!e) { e = { byIdx: new Map(), msgsLen: r.msgsLen, outBodySha: r.outBodySha, dumped: 0 }; byN.set(r.n, e); }
    if (e.outBodySha !== r.outBodySha || e.msgsLen !== r.msgsLen) {
      throw new Error(
        `dump ${path}:${lineNo}: n=${r.n} carries two different forwarded bodies ` +
        `(sha ${e.outBodySha} msgsLen ${e.msgsLen} vs sha ${r.outBodySha} msgsLen ${r.msgsLen})`,
      );
    }
    e.dumped++;
    // `msg: null` is DATA — the message was suppressed or the index is past
    // the array end. It is recorded as dumped (the position was asked about)
    // and contributes no unit.
    if (r.msg !== null && r.msg !== undefined) e.byIdx.set(r.i, r.msg);
  }
  return byN;
}

// --- the per-row verdict ----------------------------------------------------

const COVERED = "COVERED";
const UNCOVERED = "UNCOVERED";
const CNV = "COULD-NOT-VERIFY";

function cnv(row, reason) {
  return { n: row.n, ts: row.ts ?? null, at: row.at ?? null, side: row.side ?? null,
           kind: row.kind ?? null, verdict: CNV, reason, coveragePct: null, uncovered: null };
}

/**
 * One row -> one verdict. `rec` is the capture record at the row's ordinal,
 * `dump` the dump entry for it.
 */
export function verdictForRow(row, rec, dump, opts) {
  // The row identifies its request by ordinal AND by timestamp. Two counters
  // agreeing is not evidence that they count the same thing (dev-loop, "two
  // coordinate spaces that look like one"), so the ordinal is confirmed
  // against a field the row already carries before anything is read from it.
  if (!rec) return cnv(row, `no request at ordinal n=${row.n} in the capture`);
  if (row.ts && rec.ts !== row.ts) {
    return cnv(row, `ordinal check failed: capture n=${row.n} is ts=${rec.ts}, the row says ts=${row.ts}`);
  }

  // The gap this walk does not close, stated as a verdict rather than
  // bridged. An `in` row asks whether raw content survived into THIS
  // request's forwarded array. An `out` row ("CC never sent this in this
  // conversation") asks the inverse over a CONVERSATION-WIDE raw population —
  // a different population, needing conversationOf grouping and every
  // request's raw side, which this interface's three inputs do not carry.
  if (row.side !== "in") {
    return cnv(row, `row side is ${JSON.stringify(row.side ?? null)}; this walk measures an ` +
                    `'in' row's raw content against its own forwarded array, and an 'out' row asks the ` +
                    `inverse question over a conversation-wide raw population — not implemented`);
  }

  const msgs = rec.body?.messages;
  if (!Array.isArray(msgs)) return cnv(row, `capture n=${row.n} carries no messages array`);
  if (!(row.at >= 0 && row.at < msgs.length)) {
    return cnv(row, `row index at=${row.at} is outside the raw array (length ${msgs.length})`);
  }
  if (!dump) return cnv(row, `no forwarded array dumped for n=${row.n}`);

  const rawSide = textUnitsOf(msgs[row.at], opts);
  if (rawSide.unreadable.length) {
    return cnv(row, `the row's own content is in ${rawSide.unreadable.length} container(s) this walk ` +
                    `cannot read: ${rawSide.unreadable.join(", ")}`);
  }
  if (!rawSide.units.length) {
    return cnv(row, `the row's content carries no readable text (${rawSide.textless} textless block(s)) — ` +
                    `there is nothing to measure coverage over`);
  }

  // The search population: every text unit of every dumped forwarded message.
  const fwdUnits = [];
  const fwdUnreadable = [];
  let fwdTextless = 0;
  for (const [i, m] of [...dump.byIdx.entries()].sort((a, b) => a[0] - b[0])) {
    const t = textUnitsOf(m, opts);
    for (const u of t.units) fwdUnits.push({ ...u, i });
    for (const s of t.unreadable) fwdUnreadable.push(`fwd[${i}].${s}`);
    fwdTextless += t.textless;
  }

  // REACH, computed rather than assumed: a dump that did not name the whole
  // forwarded array searched only part of the wire.
  const partialDump = dump.msgsLen !== null && dump.msgsLen !== undefined && dump.dumped < dump.msgsLen;

  let totalCU = 0;
  let coveredCU = 0;
  const perUnit = [];
  for (const ru of rawSide.units) {
    const { coveredTo, pieces } = walkCoverage(ru.text, fwdUnits, opts);
    totalCU += ru.text.length;
    coveredCU += coveredTo;
    perUnit.push({
      blockIdx: ru.bi, subIdx: ru.si,
      codeUnits: ru.text.length,
      bytes: Buffer.byteLength(ru.text, "utf8"),
      coveredTo,
      pieces,
      // The remainder VERBATIM — a percentage alone is not an attribution.
      // Full, not a head: the whole point is that a reader can see what is
      // claimed missing and judge it.
      uncovered: coveredTo >= ru.text.length ? null : ru.text.slice(coveredTo),
    });
  }

  const pct = totalCU === 0 ? null : Math.round((10000 * coveredCU) / totalCU) / 100;
  const fullyCovered = coveredCU >= totalCU;

  // THE RULE. COVERED exhibits its pieces, so reach cannot falsify it.
  // UNCOVERED is an absence claim over the population the walk could read, so
  // any part of that population it could NOT read makes the claim
  // unsupported — not false, unsupported, which is the third answer.
  let verdict;
  let reason = null;
  if (fullyCovered) {
    verdict = COVERED;
  } else if (fwdUnreadable.length || partialDump) {
    verdict = CNV;
    const causes = [];
    if (fwdUnreadable.length) {
      causes.push(`${fwdUnreadable.length} forwarded container(s) this walk cannot read ` +
                  `(${fwdUnreadable.slice(0, 6).join(", ")}${fwdUnreadable.length > 6 ? ", …" : ""})`);
    }
    if (partialDump) {
      causes.push(`the dump names ${dump.dumped} of ${dump.msgsLen} forwarded message(s), ` +
                  `so part of the wire was never searched`);
    }
    reason = `${pct}% of the content was found on the wire; the remainder cannot be called lost because ` +
             `the search population was incomplete: ${causes.join("; ")}`;
  } else {
    verdict = UNCOVERED;
  }

  return {
    n: row.n, ts: row.ts ?? null, at: row.at, side: row.side, kind: row.kind ?? null,
    verdict, reason,
    role: msgs[row.at]?.role ?? null,
    rawCodeUnits: totalCU,
    rawBytes: perUnit.reduce((s, u) => s + u.bytes, 0),
    coveredCodeUnits: coveredCU,
    coveragePct: pct,
    rawMsgs: msgs.length,
    fwdDumped: dump.dumped,
    fwdMsgsLen: dump.msgsLen ?? null,
    fwdUnits: fwdUnits.length,
    fwdTextless,
    fwdUnreadable,
    units: perUnit,
    uncovered: perUnit.filter((u) => u.uncovered !== null).map((u) => u.uncovered),
  };
}

// --- driver -----------------------------------------------------------------

export async function coverageWalk(capturePath, dumpPath, rowsPath, opts = {}) {
  const rows = JSON.parse(readFileSync(rowsPath, "utf8"));
  if (!Array.isArray(rows)) throw new Error(`${rowsPath} is not an array of rows`);
  const dumps = readDump(dumpPath);

  const want = new Map();
  for (const r of rows) {
    if (!Number.isFinite(r?.n)) throw new Error(`a row carries no numeric n: ${JSON.stringify(r).slice(0, 200)}`);
    if (!want.has(r.n)) want.set(r.n, []);
    want.get(r.n).push(r);
  }

  // The capture is read STREAMING and ordinals are counted the way replay
  // counts them — request records only, from 0. A probe that numbered capture
  // LINES instead printed a neighbouring request and a whole wrong mechanism
  // was nearly derived from it (dev-loop).
  const recByN = new Map();
  let n = -1;
  let remaining = want.size;
  for await (const [, line] of readCapture(capturePath)) {
    if (remaining === 0) break;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    if (!rec || typeof rec.body !== "object" || rec.body === null || !Array.isArray(rec.body.messages)) continue;
    n++;
    if (want.has(n)) { recByN.set(n, rec); remaining--; }
  }

  const results = [];
  for (const r of rows) results.push(verdictForRow(r, recByN.get(r.n), dumps.get(r.n), opts));
  return results;
}

// Every class, every run, zeros stated explicitly — a class absent from a
// tally reads as "never checked", not as "never seen".
export function tally(results) {
  const t = { [COVERED]: 0, [UNCOVERED]: 0, [CNV]: 0 };
  for (const r of results) t[r.verdict]++;
  return t;
}

function parseArgs(argv) {
  const args = { capture: null, dump: null, rows: null, json: false, without: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dump") args.dump = argv[++i] ?? null;
    else if (a === "--rows") args.rows = argv[++i] ?? null;
    else if (a === "--json") args.json = true;
    else if (a === "--without") {
      const c = argv[++i] ?? "";
      if (!CONDITIONS.has(c)) {
        process.stderr.write(`unknown condition: ${c} (known: ${[...CONDITIONS].join(", ")})\n`);
        process.exit(2);
      }
      args.without.push(c);
    } else if (!args.capture) args.capture = a;
    else { process.stderr.write(`unexpected argument: ${a}\n`); process.exit(2); }
  }
  return args;
}

export function optsFromWithout(without) {
  return {
    reminderUnwrap: !without.includes("reminder-unwrap"),
    listContentDescent: !without.includes("list-content-descent"),
    multiPiece: !without.includes("multi-piece"),
    separatorSkip: !without.includes("separator-skip"),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.capture || !args.dump || !args.rows) {
    process.stderr.write(
      "usage: node tools/coverage-walk.mjs <capture.jsonl> --dump <dump.jsonl> --rows <rows.json> " +
      `[--json] [--without <${[...CONDITIONS].join("|")}>]...\n`,
    );
    process.exit(2);
  }
  const opts = optsFromWithout(args.without);
  const results = await coverageWalk(args.capture, args.dump, args.rows, opts);
  const t = tally(results);

  if (args.json) {
    process.stdout.write(JSON.stringify({ without: args.without, tally: t, rows: results }, null, 1) + "\n");
    return;
  }
  if (args.without.length) process.stdout.write(`WITHOUT: ${args.without.join(", ")}\n`);
  for (const r of results) {
    process.stdout.write(
      `n=${r.n} at=${r.at} ${r.verdict}` +
      (r.coveragePct === null ? "" : ` ${r.coveragePct}% of ${r.rawCodeUnits} cu`) +
      (r.reason ? `\n    reason: ${r.reason}` : "") + "\n",
    );
    for (const u of r.units ?? []) {
      if (u.uncovered === null) continue;
      process.stdout.write(`    uncovered from offset ${u.coveredTo} (verbatim):\n${u.uncovered}\n`);
    }
  }
  process.stdout.write(
    `\n${results.length} row(s): ${COVERED}=${t[COVERED]} ${UNCOVERED}=${t[UNCOVERED]} ${CNV}=${t[CNV]}\n`,
  );
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((e) => { process.stderr.write(`${e.stack || e}\n`); process.exit(2); });
}
