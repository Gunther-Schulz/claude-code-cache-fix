#!/usr/bin/env node
// bust-triage — one command from an observed cache bust to a classified verdict.
//
// Why this exists: on 2026-07-31 a single bust took a six-step hand
// investigation — statusline, worktime ledger, CC transcript, proxy journal,
// capture pair, body diff — before `replay --census` could even be pointed at
// it. Two of the day's most valuable findings came out of steps nobody repeats
// under time pressure, and one of them (an entirely uncovered bust class) was
// found only because a diff happened to be read. The manual pass finds a defect
// once; the mechanism finds it at the moment it occurs, without the reasoning
// that produced it — and that reasoning is exactly what does not survive into
// the next session.
//
// It CHAINS existing tools rather than reimplementing them (dev-loop.md,
// "Never hand-roll identity in a probe"): classification comes from
// replay.mjs's censusPair, the migration byte-test from
// reminder-migration-census.mjs, conversation grouping from the shared
// identity. The only logic new here is the ledger/transcript reconciliation
// and the matrix lookup.
//
// Usage:
//   node tools/bust-triage.mjs                  # newest bust in the ledger
//   node tools/bust-triage.mjs --at 1785498086  # a specific one (epoch or ISO)
//   node tools/bust-triage.mjs --list           # recent ❄ events, newest first
//                                               # (busts AND controlled costs)
//   ... --json
//
// THREE answers, never two (dev-loop.md, "A checker has THREE answers"):
//   MITIGATED     known class, shipped extension, absorbed as designed
//   KNOWN-OPEN    known class, matrix row N, still open — prints the status
//   UNCLASSIFIED  no matrix row matches. THE payload of this tool: an
//                 unrecognised class is the one thing no existing check
//                 reports, and it is how a whole bust class stayed invisible.
// A step that cannot run says so and does not fold into a pass.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { censusPair } from "./replay.mjs";
import { readLines } from "./read-lines.mjs";
import { canonical, classify, reminderBlocks, subclassifyExtended, textOf }
  from "./reminder-migration-census.mjs";

const LEDGER = join(homedir(), ".local/share/claude-worktime/activity.jsonl");
const CAPTURES = join(homedir(), ".claude/cache-fix-captures");
const PROJECTS = join(homedir(), ".claude/projects");
const MATRIX = "docs/directives/robustness-threat-matrix.md";
// Mirrors CAPTURES above: hardcoded to ~/.claude rather than routed through
// proxy/claude-home.mjs's claudeHome() (which also honors CLAUDE_CONFIG_DIR)
// — pre-existing in this file, not introduced here.
const SNAPSHOTS = join(homedir(), ".claude/cache-fix-snapshots");
// A non-append telemetry event within this many ms of a candidate request's
// own `ts` is treated as "that request is what the event is reporting on"
// (BACKLOG TOOL GAP, 2026-07-31 twin-busts entry). Measured live on the
// motivating case: the reset event and its causing request's ts differ by
// ~5ms; the wrongly-chosen append-only request sat ~15.8s from that reset,
// well outside this window.
const TELEMETRY_WINDOW_MS = 3000;
// How far back from the recency-picked `after` the telemetry preference is
// even allowed to look for a replacement candidate. Discovered live: without
// this bound, "nearest wins" (preferTelemetryConfirmed) searches EVERY
// plausible candidate in the whole capture — and every non-append-only
// request writes its OWN telemetry line moments after itself, so near-zero
// coincidental matches are common throughout a long session, not rare. On
// the 19:22:40 capture this picked a candidate from ~18 MINUTES earlier
// (an unrelated near-exact match) over the genuine 5ms one 16s before the
// wrongly-selected newest candidate. The observed real gap between a wrong
// newest pick and its correct predecessor is 4-16s (BACKLOG); this window
// is generous against that (10x the high end) while still nowhere near
// covering a multi-hour session, so an unrelated old coincidence can't win.
const NEAR_CUTOFF_WINDOW_MS = 60_000;

const j = (line) => { try { return JSON.parse(line); } catch { return null; } };
const lines = (p) => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean) : []);

// The ❄-visible cold classes, and the definition is the statusline's own.
// `claude-worktime` advances the ❄ token on two paths — `cold_hit` (k:"hit")
// and `cold_cost` (k:"cost", plus legacy k:"resume" records) — and its
// `--cold --all` filter is written exactly that way. This tool read only
// k:"hit", so on 2026-07-31 the statusline showed `❄ 55k compact (8m)` while
// `--list` showed nothing newer than 90 minutes earlier and the default run
// silently triaged an older, unrelated event. An event the operator can SEE
// must never be missing from the tool that explains events.
const CONTROLLED = new Set(["cost", "resume"]);

/**
 * Every ❄-visible cold event, newest first, retractions and cause upgrades
 * applied. `cls` splits them: "bust" is a preventable cache loss, "controlled"
 * is a cost the operator (or the auto-compact ceiling) caused — real, visible,
 * and NOT triageable, which is an answer rather than a reason to hide it.
 */
export function coldEvents(ledgerPath = LEDGER) {
  const recs = lines(ledgerPath).map(j).filter((r) => r && r.type === "cold");
  const retracted = new Set(
    recs.filter((r) => r.k === "hit-retract").map((r) => `${r.s}#${r.hit_t}`));
  // A k:"hit-cause" marker carries the cause recovered after a raced read;
  // honoring it here is why this tool and `--cold` cannot disagree.
  const causeFix = new Map(
    recs.filter((r) => r.k === "hit-cause").map((r) => [`${r.s}#${r.hit_t}`, r.cause]));
  return recs
    .filter((r) => (r.k === "hit" || CONTROLLED.has(r.k)) && !retracted.has(`${r.s}#${r.t}`))
    .map((r) => ({ ...r, cls: r.k === "hit" ? "bust" : "controlled",
                   cause: causeFix.get(`${r.s}#${r.t}`) ?? r.cause }))
    .sort((x, y) => y.t - x.t);
}

/** Cold HIT records only — the population that can actually be triaged. */
export function busts(ledgerPath = LEDGER) {
  return coldEvents(ledgerPath).filter((e) => e.cls === "bust");
}

/** The transcript's own diagnostic for a bust, or null when unreadable. */
export function transcriptCause(sid, cc) {
  if (!existsSync(PROJECTS)) return null;
  for (const proj of readdirSync(PROJECTS)) {
    const f = join(PROJECTS, proj, `${sid}.jsonl`);
    if (!existsSync(f)) continue;
    for (const line of lines(f)) {
      const r = j(line);
      const d = r?.message?.diagnostics?.cache_miss_reason;
      if (!d) continue;
      if ((r.message?.usage?.cache_creation_input_tokens ?? -1) === cc) {
        return { type: d.type, missed: d.cache_missed_input_tokens ?? null };
      }
    }
  }
  return null;
}

/**
 * Non-append insertion-normalization telemetry for a session, at or before
 * a cutoff (epoch ms) — the population `preferTelemetryConfirmed` matches
 * candidates against. Filename pattern mirrors
 * proxy/extensions/insertion-normalization.mjs's eventsPath/
 * resolveInsertionSessionKey: `s-${sid}-<systemPromptSubKey>-<conv>-
 * insertion-events.jsonl`. One sid owns SEVERAL such files — one per
 * conversation/system-prompt sub-key (main thread, sidecars, subagents) —
 * and the sub-key components are internal to that extension and not
 * re-derivable here, so this globs by prefix rather than composing the
 * exact key. Record shape grounded on a real file (2026-08-02, files under
 * ~/.claude/cache-fix-snapshots/): {ts (ISO), key, sid, action, inserted,
 * resetReason?, pinned, dropped, suppressed, moved}. The motivating case's
 * reset event lived in a DIFFERENT conversation sub-key than the one that
 * produced the wrongly-chosen append-only candidate, which is why this
 * cannot be narrowed to a single exact events file.
 * Returns null (never []) for "missing/unreadable directory or no matching
 * files" so the caller can skip the preference and fall through to the
 * unchanged existing rule, exactly.
 */
export function nonAppendEvents(sid, cutoffMs, dir = SNAPSHOTS) {
  if (!existsSync(dir)) return null;
  let files;
  try {
    files = readdirSync(dir).filter(
      (f) => f.startsWith(`s-${sid}-`) && f.endsWith("-insertion-events.jsonl"));
  } catch {
    return null;
  }
  if (!files.length) return null;
  const out = [];
  for (const name of files) {
    for (const line of lines(join(dir, name))) {
      const r = j(line);
      if (!r?.ts || !r.action || r.action === "append-only") continue;
      const t = Date.parse(r.ts);
      if (!Number.isNaN(t) && t <= cutoffMs) out.push({ ts: t, action: r.action });
    }
  }
  return out;
}

/**
 * Pure preference decision (BACKLOG TOOL GAP, 2026-07-31 twin-busts entry,
 * "TOOL GAP found en route"): capturePair's plain rule — the newest
 * plausible same-conversation candidate at-or-before the bust stamp — chose
 * an APPEND-ONLY request 4-16s after the actual reset-carrying request in
 * the 19:22:40 case, and the resulting UNCLASSIFIED verdict was a pair-
 * SELECTION artifact, not a new bust class.
 *
 * Rule (dispatcher decision, superseding a first "newest-of-matches"
 * attempt that shipped but did not fix the motivating case — see below):
 * among candidates within `windowMs` of a telemetry event whose action is
 * NOT "append-only" (append-only cannot have rewritten the cached prefix,
 * so it is never the event a real bust is reporting on), the one with the
 * SMALLEST |candidate.ts - event.ts| wins; ties broken by newest candidate.
 * Basis: the event is written during the SAME request's processing, so a
 * genuine join is millisecond-scale, while a spurious cross-conversation
 * join (a different, unrelated sub-key's own event landing in the window
 * by coincidence) lands randomly across the window. Live-traced on the
 * 19:22:40 capture: the genuine join was 5ms away, a same-window spurious
 * join from an unrelated single-message sidecar's own bootstrap reset
 * ("no-prior-canonical") was 1899ms away — the FIRST version of this rule
 * ("prefer the newest of all matching candidates") picked the spurious
 * one, because both were "a match" and the wrong one was newer. Nearness
 * to the matching event, not recency of the candidate, is what
 * distinguishes a real causal link from a coincidence.
 * Falls back to the newest candidate overall — the pre-existing rule,
 * unchanged — when no candidate matches, including when `events` is
 * null/empty (the "missing/unreadable events file" case).
 *
 * Takes only `{ts}`-shaped candidates (epoch ms) rather than full capture
 * records, deliberately: this is the pure decision core the selftest
 * exercises without filesystem fixtures, and it is also what lets
 * capturePair's streaming pass build the candidate list without holding
 * full (multi-MB) request bodies for every candidate at once.
 */
export function preferTelemetryConfirmed(candidates, events, windowMs = TELEMETRY_WINDOW_MS) {
  let newest = null;
  let best = null; // { c, dist }
  for (const c of candidates) {
    if (!newest || c.ts > newest.ts) newest = c;
    if (!events || !events.length) continue;
    let dist = Infinity;
    for (const e of events) {
      const d = Math.abs(e.ts - c.ts);
      if (d < dist) dist = d;
    }
    if (dist > windowMs) continue;
    if (!best || dist < best.dist || (dist === best.dist && c.ts > best.c.ts)) best = { c, dist };
  }
  return best ? best.c : newest;
}

/** The capture request pair straddling a bust, by conversation.
 * Streamed via readLines, never readFileSync: the busting session's own
 * capture is routinely the largest on disk, and the whole-file string read
 * died at >512 MB (ERR_STRING_TOO_LONG, live 2026-07-31) — the same class
 * a77c930 fixed in the census. Two passes, retaining only the two records
 * that matter. */
export async function capturePair(sid, tsEpoch) {
  const f = join(CAPTURES, `s-${sid}-requests.jsonl`);
  if (!existsSync(f)) return null;
  // The busting request is the newest one at or before the ledger stamp; its
  // predecessor IN THE SAME CONVERSATION is the comparison. Conversation, not
  // adjacency — interleaved tenants sit several lines apart.
  // STRICTLY at or before the ledger stamp: worktime books the hit from the
  // statusline hook, which runs AFTER the response, so the busting request
  // always precedes the stamp. An earlier version allowed +30s of slack and
  // selected a request 35s LATER than the bust — an append-only pair that
  // classified as UNCLASSIFIED and would have been reported as a new class.
  // ...and it must be a request that could PRODUCE this bust. One session id
  // covers several conversations (main thread, subagents, the 1-message
  // bootstrap/sidecar calls), and the newest request before the stamp is
  // frequently a sidecar. Selecting one made a 44k rewrite classify as
  // "identical" on an n=1->n=1 pair and report a phantom new class. The
  // context the bust re-wrote is the discriminator: require a body at least
  // as large as the ledger's own ctx figure allows, floored at 2 messages
  // since a single-message request has no prefix to bust.
  const cutoff = tsEpoch * 1000;
  const plausible = (r) => (r.body.messages?.length ?? 0) >= 2;
  // Telemetry preference (BACKLOG TOOL GAP, 2026-07-31): computed BEFORE the
  // scan so a missing/unreadable events file costs nothing extra — the
  // `candidates` accumulation below only happens when `events` is truthy,
  // keeping the "missing events file => existing behavior exactly" case
  // identical in both output and cost to the pre-existing single-pass scan.
  const events = nonAppendEvents(sid, cutoff);
  let after = null;
  // Lightweight {ts}-only candidates, never full records — a candidate's
  // body can be multi-MB (the same reason this function streams at all;
  // see the header comment above), so only the two records that end up
  // chosen (`after`, `before`) ever get held in full.
  const candidates = [];
  let seen = 0;
  for await (const line of readLines(f)) {
    const r = j(line);
    if (!r?.body?.messages || !r?.ts) continue;
    seen++;
    const t = Date.parse(r.ts);
    if (t <= cutoff && plausible(r)) {
      if (!after || t > Date.parse(after.ts)) after = r;
      if (events) candidates.push({ ts: t });
    }
  }
  if (seen < 2 || !after) return null;

  if (events && events.length) {
    const afterT = Date.parse(after.ts);
    // Scope to NEAR_CUTOFF_WINDOW_MS of the recency pick — see its comment
    // for why an unscoped search over the whole capture is wrong.
    const nearby = candidates.filter((c) => afterT - c.ts <= NEAR_CUTOFF_WINDOW_MS);
    const chosen = preferTelemetryConfirmed(nearby, events);
    if (chosen && chosen.ts !== afterT) {
      // The preference overrode the recency default — refetch the full
      // record for the chosen ts (rare: only when telemetry disagrees with
      // "newest plausible"). A second streaming pass, same file.
      for await (const line of readLines(f)) {
        const r = j(line);
        if (!r?.body?.messages || !r?.ts) continue;
        if (plausible(r) && Date.parse(r.ts) === chosen.ts) { after = r; break; }
      }
    }
  }

  const cid = JSON.stringify(after.body.messages[0]);
  let before = null;
  for await (const line of readLines(f)) {
    const r = j(line);
    if (!r?.body?.messages || !r?.ts) continue;
    // `after` itself is excluded by the strict earlier-than check below —
    // the cross-pass object-identity test the array version used is gone.
    if (JSON.stringify(r.body.messages[0]) !== cid) continue;
    if (Date.parse(r.ts) >= Date.parse(after.ts)) continue;
    if (!before || Date.parse(r.ts) > Date.parse(before.ts)) before = r;
  }
  return before ? { before, after } : null;
}

/**
 * Does the pair carry the row-4 reminder container migration?
 *
 * A bare EXTENDED is not actionable: the two sub-classes have opposite
 * mitigation stories. MERGED-STANDALONE means the extra bytes are a standalone
 * the PREDECESSOR already sent — append-shaped, absorbable by a normalization.
 * NEW-TEXT means content no earlier request carried, which no re-serve can
 * reconstruct. The sub-classifier is imported rather than re-derived so this
 * tool and the census can never disagree about what a merge is (dev-loop,
 * "chain existing tools"); `sysBefore` is the predecessor's standalones
 * because that is the population its contract checks against.
 */
export function migrationVerdict(pair) {
  const b = pair.before.body.messages, a = pair.after.body.messages;
  const inlineAfter = new Set();
  for (const m of a) for (const t of reminderBlocks(m)) inlineAfter.add(t);
  const sysAfter = a.filter((m) => m?.role === "system").map(textOf);
  const sysBefore = b.filter((m) => m?.role === "system").map(textOf);
  // A pair can carry SEVERAL migrating hosts (measured: the 11:41:05 pair has
  // an EXACT at 97 and the interesting EXTENDED at 99). One result keeps the
  // shape the selftest and --json read; returning the FIRST hid the EXTENDED
  // behind the EXACT, so the most INFORMATIVE one wins instead:
  // EXTENDED > EXACT > DROPPED.
  const rank = { EXTENDED: 3, EXACT: 2, DROPPED: 1 };
  let best = null;
  for (let i = 0; i < b.length; i++) {
    const blocks = reminderBlocks(b[i]);
    if (!blocks.length || blocks.some((t) => inlineAfter.has(t))) continue;
    const recon = canonical(blocks);
    let found = { host: i, verdict: "DROPPED", sub: null };
    for (const t of sysAfter) {
      const v = classify(recon, t);
      if (v === "EXACT" && found.verdict !== "EXTENDED") found = { host: i, verdict: v, sub: null };
      if (v === "EXTENDED") {
        found = { host: i, verdict: v, sub: subclassifyExtended(recon, t, sysBefore) };
        break;
      }
    }
    if (!best || rank[found.verdict] > rank[best.verdict]) best = found;
    if (best.verdict === "EXTENDED") break;
  }
  return best;
}

/** Matrix rows whose status line we can quote, keyed by the classes we map to. */
export function matrixRow(n) {
  if (!existsSync(MATRIX)) return null;
  for (const line of lines(MATRIX)) {
    const m = /^\|\s*(\d+)\s*\|/.exec(line);
    if (m && Number(m[1]) === n) {
      const cells = line.split("|");
      const status = (cells[cells.length - 2] ?? "").trim();
      return { n, status: status.slice(0, 260), open: /\bOPEN\b|RE-OPENED/.test(status) };
    }
  }
  return null;
}

/**
 * Map an observed shape to a matrix row. Returns null for "no row matches",
 * which is the UNCLASSIFIED verdict — deliberately NOT a default row.
 */
export function classToRow(censusClass, migration) {
  if (migration) return 4;                       // container migration
  if (censusClass === "splice/insert-mid") return 1;
  if (censusClass === "replace/edit") return 4;
  return null;
}

export async function triage(bust) {
  const steps = [];
  const tc = transcriptCause(bust.s, bust.cc);
  steps.push(tc
    ? { step: "transcript", ok: true, detail: `${tc.type}${tc.missed ? ` / ${tc.missed}` : ""}` }
    : { step: "transcript", ok: false, detail: "no diagnostic found (older CC, or transcript rotated)" });

  // Reconciliation: the ledger and the transcript must agree. They disagreed
  // live on 2026-07-31 (display upgraded, record left "other") and the
  // divergence was invisible until compared.
  if (tc && bust.cause && bust.cause !== "other" && bust.cause !== tc.type) {
    steps.push({ step: "reconcile", ok: false,
                 detail: `LEDGER says "${bust.cause}", TRANSCRIPT says "${tc.type}" — instrument disagreement` });
  } else if (tc && bust.cause === "other") {
    steps.push({ step: "reconcile", ok: false,
                 detail: `ledger still "other" while transcript has "${tc.type}" — raced read never upgraded` });
  } else if (tc) {
    steps.push({ step: "reconcile", ok: true, detail: "ledger and transcript agree" });
  }

  const pair = await capturePair(bust.s, bust.t);
  if (!pair) {
    steps.push({ step: "capture", ok: false, detail: "no capture pair (capture off, or rotated)" });
    return { bust, steps, verdict: "UNVERIFIABLE", why: "no capture pair to classify" };
  }
  steps.push({ step: "capture", ok: true,
               detail: `${pair.before.ts} -> ${pair.after.ts}, n=${pair.before.body.messages.length}->${pair.after.body.messages.length}` });

  const cls = censusPair(pair.before.body.messages, pair.after.body.messages);
  steps.push({ step: "census", ok: true, detail: cls });

  const mig = migrationVerdict(pair);
  steps.push(mig
    ? { step: "migration", ok: true,
        detail: `row-4 container migration at host ${mig.host} ` +
                `(${mig.verdict}${mig.sub ? `/${mig.sub}` : ""})` }
    : { step: "migration", ok: true, detail: "no reminder container migration in this pair" });

  const rowN = classToRow(cls, mig);
  if (rowN === null) {
    return { bust, steps, verdict: "UNCLASSIFIED",
             why: `census class "${cls}" maps to no threat-matrix row — a class nothing currently covers` };
  }
  const row = matrixRow(rowN);
  if (!row) {
    return { bust, steps, verdict: "UNCLASSIFIED",
             why: `mapped to matrix row ${rowN}, but that row could not be read` };
  }
  return {
    bust, steps,
    verdict: row.open ? "KNOWN-OPEN" : "MITIGATED",
    why: `matrix row ${rowN}: ${row.status}`,
  };
}

function fmt(t) { return new Date(t * 1000).toISOString().replace("T", " ").slice(0, 19); }

/** `--list` rows: every ❄-visible event, controlled ones labelled as such. */
export function listRows(events) {
  return events.map((e) => {
    const label = e.cls === "controlled" ? `CONTROLLED(${e.cause ?? "-"})` : (e.cause ?? "-");
    return `  ${fmt(e.t)}  ${String(Math.round((e.cc ?? 0) / 1000)).padStart(4)}k  ` +
           `${label.padEnd(30)} ${e.s.slice(0, 8)}`;
  });
}

/**
 * What the default (no-args) run must say when the NEWEST cold event is not
 * the one it is about to triage. Silence here is the defect: the operator sees
 * a ❄ token, runs the tool, and gets a verdict about a different, older event
 * with nothing marking the substitution.
 */
export function fallbackNote(events) {
  const newest = events[0];
  if (!newest || newest.cls !== "controlled") return [];
  const bust = events.find((e) => e.cls === "bust");
  const head =
    `  NOTE  the newest cold event is ${fmt(newest.t)} ` +
    `CONTROLLED(${newest.cause ?? "-"}), ${Math.round((newest.cc ?? 0) / 1000)}k re-written.\n` +
    "        Cannot triage: a controlled cause (compact/resume) is a cost you\n" +
    "        caused, not a bust — there is no prevented-loss verdict to give.";
  return [head, bust
    ? `        Falling back to the newest BUST: ${fmt(bust.t)} (${(bust.cause ?? "-")}).`
    : "        No bust in the ledger to fall back to."];
}

async function main(argv) {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const events = coldEvents();
  const all = events.filter((e) => e.cls === "bust");
  if (args.includes("--list")) {
    if (!events.length) {
      process.stdout.write("no cold events in the worktime ledger.\n");
      return 0;
    }
    for (const row of listRows(events.slice(0, 15))) process.stdout.write(row + "\n");
    return 0;
  }
  const note = fallbackNote(events);
  if (!all.length) {
    // "no busts" and "nothing happened" are different statements, and the
    // controlled events are exactly what distinguishes them.
    for (const line of note) process.stdout.write(line + "\n");
    process.stdout.write("no cold-cache BUSTS in the worktime ledger.\n");
    return 0;
  }
  const atI = args.indexOf("--at");
  const explicit = atI >= 0;
  let bust = all[0];
  if (explicit) {
    const raw = args[atI + 1] ?? "";
    const want = /^\d+$/.test(raw) ? Number(raw) : Math.floor(Date.parse(raw) / 1000);
    bust = all.reduce((best, b) =>
      Math.abs(b.t - want) < Math.abs(best.t - want) ? b : best, all[0]);
  }
  const r = await triage(bust);
  if (json) {
    // `newest` rides the JSON so a consumer can see the substitution too — the
    // whole failure was that it happened invisibly.
    process.stdout.write(JSON.stringify(
      { ...r, newest: events[0] ?? null, fellBack: !explicit && note.length > 0 }, null, 2) + "\n");
    return 0;
  }

  if (!explicit && note.length) process.stdout.write("\n" + note.join("\n") + "\n");
  process.stdout.write(`\nbust-triage — ${fmt(bust.t)}  ${Math.round(bust.cc / 1000)}k re-written  session ${bust.s.slice(0, 8)}\n\n`);
  for (const s of r.steps) {
    process.stdout.write(`  ${s.ok ? "OK  " : "WARN"}  ${s.step.padEnd(11)} ${s.detail}\n`);
  }
  process.stdout.write(`\n  VERDICT: ${r.verdict}\n  ${r.why}\n`);
  if (r.verdict === "UNCLASSIFIED") {
    process.stdout.write(
      "\n  An unclassified bust is a NEW CLASS until shown otherwise. Book it as a\n" +
      "  threat-matrix row before it is explained away — the matrix records, the\n" +
      "  gate enforces, and a class with no row is a class nothing watches.\n");
  }
  process.stdout.write("\n");
  return 0;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--selftest")) {
    const eq = (a, b, m) => { if (a !== b) throw new Error(`${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };
    // classToRow must NOT invent a row — an unknown class stays unclassified,
    // which is the whole point of the third answer.
    eq(classToRow("append-only", null), null, "append-only maps nowhere");
    eq(classToRow("identical", null), null, "identical maps nowhere");
    eq(classToRow("reorder-only", null), null, "unknown class stays unclassified");
    eq(classToRow("splice/insert-mid", null), 1, "splice -> row 1");
    eq(classToRow("replace/edit", null), 4, "replace/edit -> row 4");
    eq(classToRow("append-only", { host: 3, verdict: "EXACT" }), 4, "migration wins -> row 4");
    // A bare EXTENDED is unactionable, so migrationVerdict must carry the
    // sub-class. The expectation is the CENSUS's definition, not this code's:
    // the remainder beyond the reconstruction is MERGED-STANDALONE iff it is
    // byte-equal to a standalone role:"system" message the BEFORE request
    // already carried, NEW-TEXT otherwise; an EXACT match has no remainder and
    // therefore no sub-class at all.
    const migPair = (beforeSys, afterText) => ({
      before: { body: { messages: [
        { role: "user", content: [{ type: "tool_result", tool_use_id: "T1" },
                                  { type: "text", text: "<system-reminder>\nR\n</system-reminder>" }] },
        ...beforeSys.map((t) => ({ role: "system", content: t })),
      ] } },
      after: { body: { messages: [
        { role: "user", content: [{ type: "tool_result", tool_use_id: "T1" }] },
        { role: "system", content: afterText },
      ] } },
    });
    eq(migrationVerdict(migPair(["PRIOR"], "R\n\nPRIOR")).sub, "MERGED-STANDALONE",
       "remainder the predecessor already sent");
    eq(migrationVerdict(migPair([], "R\n\nPRIOR")).sub, "NEW-TEXT",
       "remainder no earlier request carried");
    eq(migrationVerdict(migPair(["PRIOR"], "R")).verdict, "EXACT", "byte-identical");
    eq(migrationVerdict(migPair(["PRIOR"], "R")).sub, null, "EXACT has no sub-class");
    // Precedence over MULTIPLE migrating hosts (the 11:41 shape: an EXACT at an
    // earlier host must not hide an EXTENDED at a later one; DROPPED loses to
    // both). Built after the single-host cases above were shown not to
    // exercise the comparator at all.
    // Hosts need a non-reminder sibling block — a message that is ONLY a
    // reminder is not a reminder HOST (probe-verified: reminderBlocks
    // returns [] without the sibling).
    const twoHost = (aText, bText) => ({
      before: { body: { messages: [
        { role: "user", content: [{ type: "tool_result", tool_use_id: "T1" },
                                  { type: "text", text: "<system-reminder>\nA\n</system-reminder>" }] },
        { role: "user", content: [{ type: "tool_result", tool_use_id: "T2" },
                                  { type: "text", text: "<system-reminder>\nB\n</system-reminder>" }] },
        { role: "system", content: "PRIOR" },
      ] } },
      after: { body: { messages: [
        { role: "user", content: [{ type: "tool_result", tool_use_id: "T1" }] },
        { role: "user", content: [{ type: "tool_result", tool_use_id: "T2" }] },
        ...(aText ? [{ role: "system", content: aText }] : []),
        ...(bText ? [{ role: "system", content: bText }] : []),
      ] } },
    });
    const multi = migrationVerdict(twoHost("A", "B\n\nPRIOR"));
    eq(multi.verdict, "EXTENDED", "EXTENDED at the later host beats EXACT at the earlier");
    eq(multi.host, 1, "and it is the EXTENDED host that is reported");
    eq(multi.sub, "MERGED-STANDALONE", "with its sub-class");
    const dropVsExact = migrationVerdict(twoHost(null, "B"));
    eq(dropVsExact.verdict, "EXACT", "EXACT beats DROPPED");
    eq(dropVsExact.host, 1, "the EXACT host wins over the dropped one");
    // retraction + cause-upgrade handling, on a synthetic ledger
    const { writeFileSync, mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const d = mkdtempSync(join(tmpdir(), "bt-"));
    const p = join(d, "a.jsonl");
    writeFileSync(p, [
      JSON.stringify({ type: "cold", k: "hit", t: 100, s: "S", cc: 1000, cause: "other" }),
      JSON.stringify({ type: "cold", k: "hit-cause", hit_t: 100, s: "S", cause: "messages_changed" }),
      JSON.stringify({ type: "cold", k: "hit", t: 200, s: "S", cc: 2000, cause: "idle" }),
      JSON.stringify({ type: "cold", k: "hit-retract", hit_t: 200, s: "S" }),
    ].join("\n") + "\n");
    const got = busts(p);
    eq(got.length, 1, "retracted hit must not be listed");
    eq(got[0].t, 100, "surviving hit");
    eq(got[0].cause, "messages_changed", "hit-cause marker must upgrade the cause");
    // matrixRow reads a real row and detects OPEN
    const r4 = matrixRow(4);
    eq(r4 !== null, true, "row 4 readable");
    eq(r4.open, true, "row 4 is currently OPEN (re-opened 2026-07-31)");

    // Telemetry pair-selection preference (BACKLOG TOOL GAP, 2026-07-31
    // twin-busts entry). Motivating shape: two candidate afters, the NEWER
    // has no matching non-append telemetry event, the EARLIER matches a
    // reset event within the window — the live 19:22:40 case (reset at
    // 19:22:22.257, wrongly-chosen append-only request at 19:22:38.008,
    // ~15.8s later). Against the pre-change logic (bare "newest plausible",
    // ignoring `events` entirely) this assertion is RED: that rule always
    // returns the later candidate regardless of telemetry.
    eq(preferTelemetryConfirmed(
      [{ ts: 1785526942257 }, { ts: 1785526958008 }],
      [{ ts: 1785526942252, action: "reset" }],
    ).ts, 1785526942257, "prefers the telemetry-confirmed earlier candidate over the unmatched newer one");
    // No candidate falls within the window of any event -> existing
    // newest-plausible rule stands, unchanged.
    eq(preferTelemetryConfirmed(
      [{ ts: 1000 }, { ts: 1016000 }],
      [{ ts: 500000, action: "reset" }],
    ).ts, 1016000, "falls back to newest-plausible when no candidate matches");
    // Missing/unreadable events file (null) -> same fallback, unchanged —
    // this is the "existing behavior exactly" contract for that case.
    eq(preferTelemetryConfirmed([{ ts: 1000 }, { ts: 1016000 }], null).ts, 1016000,
       "null events (missing/unreadable file) leaves the newest-plausible rule untouched");
    // Two EQUALLY-near matches (dist 0 for both) -> tie-break is newest
    // candidate, not "first" or "last in iteration order".
    eq(preferTelemetryConfirmed(
      [{ ts: 1000 }, { ts: 2000 }, { ts: 500000 }],
      [{ ts: 1000, action: "reset" }, { ts: 2000, action: "normalized" }],
    ).ts, 2000, "equal-distance matches: the newest candidate wins the tie-break");

    // COLLISION SHAPE (dispatcher decision, superseding a first "newest-of-
    // matches" attempt): a candidate merely being newer must NOT beat one
    // that is a closer telemetry match. Real numbers off the live 19:22:40
    // capture (s-adf6cadb) — the CORRECT candidate (19:22:22.252Z) sits 5ms
    // from its own reset event (19:22:22.257Z, resetReason=not-subsequence,
    // the actual bust-causing reset); the WRONGLY-selected candidate
    // (19:22:38.008Z) ALSO falls inside the ±3s window of a second, unrelated
    // event (19:22:39.907Z, resetReason=no-prior-canonical — a different,
    // brand-new single-message sidecar conversation's own bootstrap reset),
    // 1899ms away. Confirmed RED against the superseded "newest-of-matches"
    // rule by direct invocation before this fix (both candidates "matched",
    // so that rule picked the newer/wrong one, ts 1785525758008) — this
    // assertion pins the corrected outcome.
    eq(preferTelemetryConfirmed(
      [{ ts: 1785525742252 }, { ts: 1785525758008 }],
      [{ ts: 1785525742257, action: "reset" }, { ts: 1785525759907, action: "reset" }],
    ).ts, 1785525742252, "nearest-to-its-own-event wins over a same-window spurious match from an unrelated conversation");

    // capturePair's NEAR_CUTOFF_WINDOW_MS scoping (own bug, found while
    // verifying the rule above against the real 19:22:40 capture): unscoped,
    // "nearest wins" searches the WHOLE plausible-candidate population, and
    // every non-append-only request writes its own telemetry line moments
    // after itself — so a near-zero coincidental match minutes or hours away
    // is common, not rare, and can beat a genuine few-ms match near the
    // cutoff purely on distance. Reproduced here with the real numbers plus
    // one far-away decoy (18 minutes earlier, dist 0 — an exact coincidental
    // match, standing in for "some unrelated request's own telemetry line").
    // Confirmed RED by direct invocation on the real capture before this
    // window existed: preferTelemetryConfirmed(unscoped candidates, events)
    // returned ts 1785524659672 (~18 minutes before the bust), not the
    // genuine 1785525742252. capturePair must filter to
    // NEAR_CUTOFF_WINDOW_MS of the recency pick BEFORE calling
    // preferTelemetryConfirmed — this pins that the filter, not the
    // preference function itself, is what excludes the decoy.
    {
      const genuine = { ts: 1785525742252 };
      const decoy = { ts: 1785525742252 - 18 * 60 * 1000 }; // 18 min earlier
      const wrongNewest = { ts: 1785525758008 };
      const evs = [
        { ts: 1785525742257, action: "reset" },        // 5ms from `genuine`
        { ts: decoy.ts, action: "normalized" },          // 0ms from `decoy`
        { ts: 1785525759907, action: "reset" },          // 1899ms from `wrongNewest`
      ];
      const all = [decoy, genuine, wrongNewest];
      const unscoped = preferTelemetryConfirmed(all, evs);
      eq(unscoped.ts, decoy.ts,
         "RED check: unscoped, the far-away exact coincidence outranks the genuine near match");
      const afterT = wrongNewest.ts; // capturePair's recency pick
      const nearby = all.filter((c) => afterT - c.ts <= NEAR_CUTOFF_WINDOW_MS);
      const scoped = preferTelemetryConfirmed(nearby, evs);
      eq(scoped.ts, genuine.ts,
         "scoped to NEAR_CUTOFF_WINDOW_MS of the recency pick, the decoy is excluded and the genuine match wins");
    }

    // nonAppendEvents: globs every insertion-events file for the sid (one
    // sid owns several — one per conversation/system-prompt sub-key, per
    // insertion-normalization.mjs's resolveInsertionSessionKey), filters
    // out append-only and anything after the cutoff.
    {
      const evDir = mkdtempSync(join(tmpdir(), "bt-events-"));
      writeFileSync(join(evDir, "s-SID-key1-insertion-events.jsonl"), [
        JSON.stringify({ ts: "2026-07-31T19:22:22.257Z", sid: "SID", action: "reset", resetReason: "not-subsequence" }),
        JSON.stringify({ ts: "2026-07-31T19:23:00.000Z", sid: "SID", action: "reset" }), // after cutoff
      ].join("\n") + "\n");
      writeFileSync(join(evDir, "s-SID-key2-insertion-events.jsonl"), [
        JSON.stringify({ ts: "2026-07-31T19:22:38.015Z", sid: "SID", action: "append-only" }),
      ].join("\n") + "\n");
      const cutoffMs = Date.parse("2026-07-31T19:22:40.000Z");
      const ev = nonAppendEvents("SID", cutoffMs, evDir);
      eq(ev.length, 1, "one non-append, pre-cutoff event across both files");
      eq(ev[0].action, "reset", "the reset survives the filter");
      eq(nonAppendEvents("SID", cutoffMs, join(evDir, "does-not-exist")), null,
         "missing directory reads as null, not []");
      eq(nonAppendEvents("OTHER-SID", cutoffMs, evDir), null,
         "a sid with no matching files reads as null too");
    }
    process.stdout.write("bust-triage: selftest passed\n");
    process.exit(0);
  }
  process.exit(await main(process.argv));
}
