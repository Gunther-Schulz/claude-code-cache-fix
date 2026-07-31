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
//               carries more: new reminder text that did not exist at the
//               earlier request. NOT absorbable by any normalization — new
//               information, not re-serialization — and counted separately so
//               it can never inflate the absorbable claim.
//   DROPPED   — the blocks vanished and the text is absent from the later
//               request entirely. Nothing migrated, so the rule was never
//               exercised; counting these as failures manufactures a blocker.
//   MISMATCH  — neither. Every one is a hole in the rule and is printed in
//               full, because these are what would silently move a bust.
//
// Usage:
//   node tools/reminder-migration-census.mjs <capture.jsonl> [more.jsonl ...]
//   node tools/reminder-migration-census.mjs ~/.claude/cache-fix-captures/*.jsonl
//   ... --json     machine-readable summary
//   ... --verbose  print every EXTENDED/MISMATCH body, not just a sample
//
// Exit code is 0 for a clean read and 1 only when a capture could not be read
// at all — a MISMATCH is a finding to report, not a failure of this tool.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const WRAP = /^<system-reminder>\n([\s\S]*)\n<\/system-reminder>\s*$/;

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
  return blocks.map((t) => {
    const m = WRAP.exec(t);
    return m ? m[1] : t;
  }).join("\n\n");
}

/** Classify one reconstruction against CC's own later text. */
export function classify(reconstructed, actual) {
  if (reconstructed === actual) return "EXACT";
  if (actual.startsWith(reconstructed)) return "EXTENDED";
  return "MISMATCH";
}

function readCapture(path) {
  const out = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (r?.body?.messages && r?.ts) out.push(r);
    } catch { /* corrupt line costs one record, not the file */ }
  }
  return out;
}

function analysePair(before, after) {
  const b = before.body.messages, a = after.body.messages;
  const sysAfter = a
    .map((m, j) => (m?.role === "system" ? { j, text: textOf(m) } : null))
    .filter(Boolean);
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
      findings.push({ host: i, blocks: blocks.length, ...best, recon, offset });
      continue;
    }
    // No standalone counterpart. Distinguish a DROP from a rule failure: if
    // the text is absent from `after` ENTIRELY, nothing migrated and the rule
    // was never exercised — calling that MISMATCH blames the rule for a
    // different phenomenon and manufactures a blocker. (Observed: a 3-block
    // host whose blocks vanished as the array went 211 -> 209.)
    const wholeAfter = JSON.stringify(a);
    const anyPresent = blocks.some((t) => {
      const inner = WRAP.exec(t);
      const probe = (inner ? inner[1] : t).slice(0, 60);
      return probe.length > 0 && wholeAfter.includes(JSON.stringify(probe).slice(1, -1));
    });
    findings.push({ host: i, blocks: blocks.length,
                    verdict: anyPresent ? "MISMATCH" : "DROPPED",
                    j: null, text: "", recon });
  }
  return findings;
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

export function census(paths) {
  const tally = { EXACT: 0, EXTENDED: 0, DROPPED: 0, MISMATCH: 0 };
  const details = [];
  let pairs = 0, captures = 0, conversations = 0;
  for (const path of paths) {
    let recs;
    try { recs = readCapture(path); } catch { continue; }
    if (recs.length < 2) continue;
    captures++;
    // Group by conversation, then compare consecutive requests WITHIN each
    // group in arrival order — never adjacent capture lines.
    const groups = new Map();
    for (const r of recs) {
      const cid = conversationOf(r);
      if (cid === null) continue;
      if (!groups.has(cid)) groups.set(cid, []);
      groups.get(cid).push(r);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      conversations++;
      for (let k = 1; k < group.length; k++) {
        pairs++;
        for (const f of analysePair(group[k - 1], group[k])) {
          tally[f.verdict]++;
          details.push({ path, ts: group[k].ts, ...f });
        }
      }
    }
  }
  return { tally, details, pairs, captures, conversations };
}

function main(argv) {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const verbose = args.includes("--verbose");
  const paths = args.filter((a) => !a.startsWith("--"));
  if (paths.length === 0) {
    process.stderr.write("usage: reminder-migration-census <capture.jsonl> ...\n");
    return 1;
  }
  const { tally, details, pairs, captures, conversations } = census(paths);
  const total = tally.EXACT + tally.EXTENDED + tally.DROPPED + tally.MISMATCH;

  if (json) {
    process.stdout.write(JSON.stringify({ tally, pairs, captures, conversations, total }, null, 2) + "\n");
    return 0;
  }

  process.stdout.write(
    `\nreminder-migration census — ${captures} capture(s), ${conversations} conversation(s), ${pairs} same-conversation pair(s)\n\n`);
  if (total === 0) {
    // "none found" must be distinguishable from "not looked for".
    process.stdout.write(
      "  no container migrations observed in this corpus.\n" +
      "  (That is a measured absence, not a clean bill: the class needs a\n" +
      "   host whose reminder blocks move out between two adjacent requests.)\n\n");
    return 0;
  }
  const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;
  process.stdout.write(
    `  ${String(tally.EXACT).padStart(5)}  ${pct(tally.EXACT).padStart(6)}  EXACT     canonical rule reproduces CC byte-for-byte — absorbable\n` +
    `  ${String(tally.EXTENDED).padStart(5)}  ${pct(tally.EXTENDED).padStart(6)}  EXTENDED  CC's later form carries NEW text — a different class, not absorbable\n` +
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
        ` recon=${d.recon.length}ch actual=${d.text.length}ch\n`);
      if (d.verdict === "EXTENDED") {
        const extra = d.text.slice(d.recon.length);
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
  return 0;
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
    // reminderBlocks only picks trailing wrapped text, never the leading block
    eq(reminderBlocks({ content: [{ type: "tool_result" },
                                  { type: "text", text: "<system-reminder>\nX\n</system-reminder>" }] }).length,
       1, "one trailing reminder");
    eq(reminderBlocks({ content: [{ type: "text", text: "<system-reminder>\nX\n</system-reminder>" }] }).length,
       0, "leading-only is not a host");
    eq(textOf({ content: "str" }), "str", "string content");
    process.stdout.write("reminder-migration-census: selftest passed\n");
    process.exit(0);
  }
  process.exit(main(process.argv));
}
