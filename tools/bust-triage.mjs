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
//   node tools/bust-triage.mjs --at 1785498086  # the cold event at that stamp
//                                               # (epoch or ISO); a CONTROLLED
//                                               # one is named, never skipped
//   node tools/bust-triage.mjs --list           # recent ❄ events, newest first
//                                               # (busts AND controlled costs)
//   node tools/bust-triage.mjs --lint-matrix    # the WRITER half: every
//                                               # `## Event walk` declares its
//                                               # cause/disposition/row, and
//                                               # every cause it names is
//                                               # reachable. Exit 1 on a finding.
//   ... --json
//
// THREE answers, never two (dev-loop.md, "A checker has THREE answers"):
//   MITIGATED     known class, shipped extension, absorbed as designed
//   KNOWN-OPEN    known class, matrix row N, still open — prints the status
//   EXPECTED-BUST known class, deliberately unmitigated (WON'T / MUST-NOT /
//                 CAN'T / NOT-OURS build — the why says which): an instance
//                 is expected cost, not a CC bug, and no investigation is
//                 owed. Terminal like MITIGATED, added 2026-08-14 — before
//                 it, the whole non-buildable family read KNOWN-OPEN and
//                 dispatched investigators treated it as open work.
//   CONTROLLED-CAUSE  known class with no mitigation to build: the cost is
//                 the operator's own (an idle gap past the TTL, a resume).
//                 A terminal disposition in runbooks/bust-appears.md, not a
//                 softer KNOWN-OPEN — see VERDICT_BY_KIND (the walk-
//                 disposition path) and matrix-status.mjs's TRIAGE_BY_STATUS
//                 (the row-status path, via a per-row `triage` override).
//   UNCLASSIFIED  no matrix row matches. THE payload of this tool: an
//                 unrecognised class is the one thing no existing check
//                 reports, and it is how a whole bust class stayed invisible.
//   UNVERIFIABLE  the steps could not run (no capture pair to classify).
//   STATUS-UNREADABLE  a row matched, but its triage could not be resolved —
//                 either the matrix's OWN prose is in no state `statusKind`
//                 knows (the walk-disposition-without-row path, which has no
//                 row number to look up), or the STATUS FILE could not
//                 answer for a numbered row (missing file, unparseable, or
//                 the row absent from it — `matrix-status.mjs`'s `rowTriage`,
//                 which every numbered-row verdict now resolves through
//                 instead of the matrix's prose; STATUS IS DATA,
//                 records-restructure directive phase 1). Stop-here, with
//                 UNCLASSIFIED — never folded into MITIGATED.
//   KEY-FLIP      the pair's two requests ran under DIFFERENT extension
//                 state keys (deferred-tool-rewrite / insertion-normalization's
//                 own per-request key) — no continuous instance for a row's
//                 status to have absorbed ACROSS, so a matrix row's verdict
//                 (even MITIGATED) is a claim about the wrong population.
//                 Stop-here, ranking with UNCLASSIFIED and STATUS-UNREADABLE
//                 — a body diff cannot see this (see stateKeyFlip).
// A step that cannot run says so and does not fold into a pass.

import { tmpDirSync } from "./tmpdir.mjs";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dataPath, statePath, legacyReadPath } from "../proxy/xdg-dirs.mjs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { censusPair, compactEntry, findEditPositions, findBlockMigrations,
         lineageOverlap, sameLineage, firstDivergence, attributionOf } from "./replay.mjs";
import { readLines } from "./read-lines.mjs";
import { canonical, classify, reminderBlocks, subclassifyExtended, textOf }
  from "./reminder-migration-census.mjs";
import { localSuffix, withLocalStamps } from "./local-stamp.mjs";
import { rowTriage } from "./matrix-status.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEDGER = join(homedir(), ".local/share/claude-worktime/activity.jsonl");
const CAPTURES = process.env.CACHE_FIX_CAPTURE_DIR
  || legacyReadPath(dataPath("captures"), "cache-fix-captures");
const PROJECTS = join(homedir(), ".claude/projects");
const MATRIX = "docs/directives/robustness-threat-matrix.md";
// Mirrors CAPTURES above, and both are read-only here, so both carry the
// legacy fallback. Routed through proxy/xdg-dirs.mjs rather than hand-rolled:
// a second resolver under tools/ can silently diverge from production's.
const SNAPSHOTS = process.env.CACHE_FIX_SNAPSHOT_DIR
  || legacyReadPath(statePath("snapshots"), "cache-fix-snapshots");
// A reset telemetry event within this many ms of a candidate request's own
// `ts` is treated as "that request is what the event is reporting on"
// (BACKLOG TOOL GAP, 2026-07-31 twin-busts entry). Measured live on the
// motivating case: the reset event and its causing request's ts differ by
// ~5ms; the wrongly-chosen append-only request sat ~15.8s from that reset,
// well outside this window. (Originally matched ANY non-append action;
// narrowed to reset-only — see resetEvents's docstring for why.)
export const TELEMETRY_WINDOW_MS = 3000;
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
// CONTENT ONLY — this drops blank lines, so an index into what it returns is
// NOT a line number in the file. Every caller here reads JSONL records or
// matches a row by its own text, where dropping blanks is right (and for
// JSONL, required). A caller that needs a POSITION reads the file whole and
// says so: measured 2026-08-07, a lint built on this helper reported line
// 1045 for a heading sitting at 1212, and both numbers are plausible — the
// only tell is that one of them is wrong.
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

/**
 * The project a session belongs to — one of the three fields `--list` was
 * missing (BACKLOG, 2026-08-07: "the operator's view and `bust-triage
 * --list` share NO identifying field"). The ❄ token shows ordinal, size,
 * cause and age, and the operator already knows the PROJECT they are
 * sitting in; `--list` showed none of that, so "230k messages_changed" was
 * the only shared handle between two different sessions.
 *
 * The mangled `~/.claude/projects/<dir>` name cannot be reversed to a real
 * path: Claude Code replaces every `/` with `-`, and repo names routinely
 * carry literal dashes of their own — this repo's own directory is
 * `claude-code-cache-fix`, so "take the last dash-separated segment" would
 * report "fix". Reading the session's own `cwd` field out of its transcript
 * and taking ITS basename is unambiguous — the same basename
 * `_short_project_v` (claude-worktime.sh) takes before any further
 * shortening, and that shortening needs operator config (`HOME_ORG`) this
 * tool has no equivalent of, so it stops at the basename rather than
 * guessing a shorter form.
 *
 * Null for "no transcript" and for "transcript present but no line ever
 * carried a `cwd`" — a project left unresolved must read as unresolved,
 * never silently as the session id it was supposed to disambiguate.
 */
export function projectFor(sid, projectsDir = PROJECTS) {
  if (!existsSync(projectsDir)) return null;
  for (const proj of readdirSync(projectsDir)) {
    const f = join(projectsDir, proj, `${sid}.jsonl`);
    if (!existsSync(f)) continue;
    for (const line of lines(f)) {
      const r = j(line);
      if (typeof r?.cwd === "string" && r.cwd) {
        const base = r.cwd.replace(/\/+$/, "").split("/").pop();
        return base || r.cwd;
      }
    }
    return null; // transcript found, but no line in it ever carried a cwd
  }
  return null;
}

/**
 * Age since a cold event, rendered EXACTLY like the ❄ token's own age
 * (claude-worktime.sh: `< 3600 -> "Nm"`, else `"NhMm"`, both floored, no
 * zero-padding) — so a row copied out of `--list` and a live token never
 * disagree about what "17m" means.
 */
export function ageStr(ageSec) {
  const s = Math.max(0, Math.floor(ageSec));
  return s < 3600 ? `${Math.floor(s / 60)}m`
                  : `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`;
}

/**
 * Per-session ORDINAL among BUST events only, oldest first — the load-
 * bearing field of the three (BACKLOG): worktime already computes and
 * displays it (`cold_count`, the `.cold_${sid}` state file's first field,
 * claude-worktime.sh), incrementing exactly once per booked `k:"hit"` and
 * never on a `k:"cost"`/`resume` (controlled) event or a retracted hit.
 * "#2 in statiker" is unambiguous where "230k" is not.
 *
 * Derived from the ledger's own retraction-aware population (`coldEvents`),
 * not read from worktime's live state file: the state file only ever holds
 * the SESSION'S CURRENT count, but every row in a `--list` slice needs its
 * own — so this recomputes the same monotonic count worktime keeps, from
 * the same source of truth, rather than re-deriving it a second way (a
 * second definition of an ordinal would be a second truth about what an
 * ordinal is — dev-loop, "never hand-roll identity").
 *
 * Keyed `${s}#${t}` (session + this tool's own event identity elsewhere in
 * the file) rather than by array position, so callers can look an ordinal
 * up for a row from a DIFFERENT (e.g. de-duplicated) population than the
 * one this was computed over.
 */
export function sessionOrdinals(events) {
  const perSession = new Map();
  const ord = new Map();
  const asc = events.filter((e) => e.cls === "bust").sort((a, b) => a.t - b.t);
  for (const e of asc) {
    const n = (perSession.get(e.s) ?? 0) + 1;
    perSession.set(e.s, n);
    ord.set(`${e.s}#${e.t}`, n);
  }
  return ord;
}

// A raced statusline read can book ONE API response as several `k:"hit"`
// records a few seconds apart, all sharing session + `cc` (BACKLOG: "one
// event booked three times", 17:39:59/17:40:08/17:40:16Z, 9s apart) — a
// client-side render race claude-worktime.sh's own `token_prev` filter
// (its comment: "exactly the false-❄ shape measured 2026-08-07 01:00:55Z,
// three renders of one API call") now guards going forward, but the
// ledger's own past bookings from before that fix stay triple-booked
// forever (the ledger is append-only). 120s mirrors COLD_LATE_BIND_SECS
// (claude-worktime.sh), the SAME window the client already treats as "one
// race, still settling" for a cause correction — the real triple landed
// well inside it (9s total span).
export const DUPLICATE_BOOKING_WINDOW_SEC = 120;

/**
 * Collapse a run of same-session, same-`cc`, close-in-time BUST bookings
 * into ONE row, flagged with its own count — never silently dropped, and
 * never left as separate rows a reader would misread as separate busts
 * (BACKLOG duplication control: "the 17:40 triple must appear as ONE row
 * (or as one row flagged as a known duplicate set), never as three").
 * Same `cc` is the discriminator, not adjacency alone: a GENUINE second
 * bust re-bills a DIFFERENT amount, so identical `cc` within the window is
 * the signature of one API response rendered more than once, never a
 * coincidence between two distinct events. Controlled events pass through
 * untouched — the triple-booking race is a bust-side (`k:"hit"`) defect.
 * The earliest booking's own `t` and `cause` are kept as the row's
 * identity (the true moment of the bust); a later booking's cause upgrades
 * it only when the earlier one is still the raced "other" placeholder.
 */
export function collapseDuplicateBookings(events, windowSec = DUPLICATE_BOOKING_WINDOW_SEC) {
  const asc = [...events].sort((a, b) => a.t - b.t);
  const merged = [];
  for (const e of asc) {
    const prev = merged[merged.length - 1];
    if (prev && e.cls === "bust" && prev.cls === "bust" &&
        prev.s === e.s && prev.cc === e.cc && (e.t - prev.t) <= windowSec) {
      prev.dupCount = (prev.dupCount ?? 1) + 1;
      if (prev.cause === "other" && e.cause && e.cause !== "other") prev.cause = e.cause;
      continue;
    }
    merged.push({ ...e });
  }
  return merged.sort((a, b) => b.t - a.t);
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
 * WHY `transcriptCause` came back null — COMPUTED, never asserted.
 *
 * The defect (BACKLOG, measured 2026-08-07 01:00:55Z): the step printed
 * "no diagnostic found (older CC, or transcript rotated)" while the
 * transcript sat on disk at 55 lines. Both named causes were false, for a
 * state the tool had no word for. A guessed reason reads exactly like a
 * measured one, and the reason text is what a reader acts on.
 *
 * Three ordered checks, mirroring `pairFailure`'s: no transcript file for
 * this session / the file exists but carries no cache_miss_reason record at
 * all / it carries some but none whose cache_creation matches this bust's.
 * The third names the input it had, because that is the case where the
 * reader's next move depends on the numbers.
 *
 * Separate from `transcriptCause` rather than folded into it: `dossier.mjs`
 * consumes that function's null-or-`{type,missed}` contract, and widening a
 * return shape across a boundary this change does not own is how a fix to
 * one reader breaks another.
 */
export function transcriptMiss(sid, cc, projectsDir = PROJECTS) {
  if (!existsSync(projectsDir)) {
    return { code: "no-projects-dir", detail: `no transcript directory at ${projectsDir}` };
  }
  const found = [];
  for (const proj of readdirSync(projectsDir)) {
    const f = join(projectsDir, proj, `${sid}.jsonl`);
    if (existsSync(f)) found.push(f);
  }
  if (!found.length) {
    return { code: "transcript-absent",
             detail: `no transcript for this session under ${projectsDir} (transcript rotated, or a different CLAUDE_CONFIG_DIR)` };
  }
  let records = 0;
  let diagnostics = 0;
  const ccSeen = [];
  for (const f of found) {
    for (const line of lines(f)) {
      const r = j(line);
      if (!r) continue;
      records++;
      const d = r?.message?.diagnostics?.cache_miss_reason;
      if (!d) continue;
      diagnostics++;
      ccSeen.push(r.message?.usage?.cache_creation_input_tokens ?? null);
    }
  }
  if (!diagnostics) {
    return { code: "no-diagnostics",
             detail: `transcript present (${records} records) but carries no cache_miss_reason ` +
                     `at all — this CC build does not write the diagnostic` };
  }
  return { code: "no-matching-diagnostic",
           detail: `transcript present (${records} records, ${diagnostics} with a cache_miss_reason) ` +
                   `but none reports cache_creation ${cc} — the diagnostics it has are for ` +
                   `${ccSeen.slice(0, 6).join(", ")}${ccSeen.length > 6 ? ", …" : ""}` };
}

/**
 * RESET-ONLY insertion-normalization telemetry for a session, at or before
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
 * resetReason?, pinned, dropped, suppressed, moved}.
 *
 * Restricted to action === "reset" specifically (dispatcher decision,
 * 2026-08-02 — narrower than "non-append", which this function returned
 * originally). Basis is the extension's OWN action contract
 * (insertion-normalization.mjs ~483-554), not wording: "reset" is defined
 * as `canonical := fresh(incoming)` — the cache-invalidating action, the
 * only one that can be "the request that carried the busting change" —
 * while "normalized" is a SUCCESSFUL reconciliation (re-serialized,
 * forwarded) and "append-only" a no-op passthrough; neither is a bust
 * signal. This matters because "normalized" fires on ordinary, non-busting
 * requests too, so a wider match spuriously confirms candidates that have
 * nothing to do with the bust: on the 7749d7fc companion capture, the
 * correct candidate's genuine reset match (5ms away) LOST to the wrongly-
 * selected candidate's own "normalized" event (4ms away) under the
 * originally-shipped "any non-append action" rule — reset-only removes
 * that false signal entirely, since "normalized" is no longer eligible to
 * match anything.
 * The motivating case's reset event lived in a DIFFERENT conversation
 * sub-key than the one that produced the wrongly-chosen append-only
 * candidate, which is why this cannot be narrowed to a single exact events
 * file.
 * Returns null (never []) for "missing/unreadable directory or no matching
 * files" so the caller can skip the preference and fall through to the
 * unchanged existing rule, exactly.
 */
export function resetEvents(sid, cutoffMs, dir = SNAPSHOTS) {
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
      if (!r?.ts || r.action !== "reset") continue;
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
 * among candidates within `windowMs` of an event, the one with the SMALLEST
 * |candidate.ts - event.ts| wins; ties broken by newest candidate. This
 * function is action-agnostic — it trusts `events` to already be the
 * RIGHT population (the caller, capturePair, passes `resetEvents`'s
 * output: action === "reset" only, not "any non-append action" — see
 * resetEvents's docstring for why "normalized" had to be excluded too).
 * Basis for nearest-over-newest: the event is written during the SAME
 * request's processing, so a genuine join is millisecond-scale, while a
 * spurious cross-conversation join (a different, unrelated sub-key's own
 * event landing in the window by coincidence) lands randomly across the
 * window. Live-traced on the 19:22:40 capture: the genuine join was 5ms
 * away, a same-window spurious join from an unrelated single-message
 * sidecar's own bootstrap reset ("no-prior-canonical") was 1899ms away —
 * the FIRST version of this rule ("prefer the newest of all matching
 * candidates") picked the spurious one, because both were "a match" and
 * the wrong one was newer. Nearness to the matching event, not recency of
 * the candidate, is what distinguishes a real causal link from a
 * coincidence.
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

// The event-log filename SUFFIXES that carry a per-request state `key` —
// `insertion-normalization.mjs`'s and `deferred-tool-rewrite`'s own action
// logs. Both are read (BACKLOG: "read ... (and the deferred-tool log) at
// those two timestamps") because either can be the one that still has a
// live file for a given sub-key, and both extensions write the SAME `key`
// for the SAME request (measured live, 2026-08-08T09:58:46Z/50Z: the
// insertion-events and deferred-tool-events lines for one request carry
// byte-identical `key` values) — one match from either log is the request's
// state key.
const STATE_KEY_LOG_SUFFIXES = ["insertion-events.jsonl", "deferred-tool-events.jsonl"];

/**
 * The extension state key (and reset reason, when the record is a reset) a
 * specific request ran under, read off ITS OWN entry in the snapshot event
 * logs — never re-derived (dev-loop, "never hand-roll identity"): the key
 * is whatever the extension itself wrote, at the timestamp of the request
 * this tool already selected as `before`/`after`.
 *
 * One sid owns SEVERAL of each log file (one per conversation/system-prompt
 * sub-key — `resetEvents`'s own docstring), so this globs by sid prefix
 * across BOTH log kinds and picks the record NEAREST `tsIso`, mirroring
 * `preferTelemetryConfirmed`'s own reasoning: a genuine join between a
 * captured request and its own extension log line is millisecond-scale
 * (measured live: 2ms both sides of the motivating pair), so nearest-within-
 * window cannot be confused with a different sub-key's own nearby record.
 * `TELEMETRY_WINDOW_MS` is reused rather than a new number invented for a
 * structurally identical join.
 *
 * Only records carrying BOTH `ts` and `key` AND `action` are eligible — the
 * detail lines a normalization pass also writes (`event:"suppressed-
 * duplicate"`, `"join-move"`, ...) share the same `ts`/`key` as their
 * parent action line, so excluding them changes nothing about the answer
 * and just avoids scanning lines that were never meant to stand alone.
 *
 * Returns null when no record is found within the window — a state this
 * tool has no word to guess at, surfaced by the caller as its own third
 * answer rather than folded into "stable" or "flip".
 */
export function stateKeyAt(sid, tsIso, dir = SNAPSHOTS) {
  const target = Date.parse(tsIso);
  if (!existsSync(dir) || Number.isNaN(target)) return null;
  let files;
  try {
    files = readdirSync(dir).filter((f) =>
      f.startsWith(`s-${sid}-`) && STATE_KEY_LOG_SUFFIXES.some((suf) => f.endsWith(suf)));
  } catch {
    return null;
  }
  let best = null; // { key, action, resetReason, dist }
  for (const name of files) {
    for (const line of lines(join(dir, name))) {
      const r = j(line);
      if (!r?.ts || !r.key || !r.action) continue;
      const t = Date.parse(r.ts);
      if (Number.isNaN(t)) continue;
      const dist = Math.abs(t - target);
      if (dist > TELEMETRY_WINDOW_MS) continue;
      if (!best || dist < best.dist) {
        best = { key: r.key, action: r.action, resetReason: r.resetReason ?? null, dist };
      }
    }
  }
  return best;
}

/**
 * Does this pair's before/after request carry the SAME extension state key?
 * The finding matrix row 1's own status cannot see (BACKLOG): a matrix row
 * describes what the CLASS looks like when it absorbs, which presumes the
 * two requests shared one continuous instance to absorb across — a flip
 * means they did not, so the row's status is a claim about a population
 * this pair was never a member of.
 *
 * Three outcomes, never collapsed to two: `flip` (the actionable finding),
 * `stable` (both resolved and equal — the finding this tool must NOT raise
 * a false alarm on), and `unresolved` (one or both sides had no matching
 * event-log record within the window — a state this tool has no evidence
 * for, and "no evidence of a flip" must never print as "stable").
 * `noPriorCanonical` is true when EITHER side's own action was a
 * `resetReason:"no-prior-canonical"` reset — reported even when the key is
 * stable, because "armed but baseline-less" on both sides is a materially
 * different state from "carried a real baseline across" and a reader must
 * not infer the stronger claim from a stable key alone (BACKLOG: "Emit
 * `no-prior-canonical` on both sides as its own note even when the key is
 * stable").
 */
export function stateKeyFlip(sid, pair, dir = SNAPSHOTS) {
  const before = stateKeyAt(sid, pair.before.ts, dir);
  const after = stateKeyAt(sid, pair.after.ts, dir);
  if (!before || !after) {
    return { code: "unresolved", before, after, noPriorCanonical: false };
  }
  const noPriorCanonical =
    (before.action === "reset" && before.resetReason === "no-prior-canonical") ||
    (after.action === "reset" && after.resetReason === "no-prior-canonical");
  return { code: before.key === after.key ? "stable" : "flip", before, after, noPriorCanonical };
}

/**
 * The copy-paste command that snapshots THIS pair's own extension event-log
 * records — the artifact a state-key finding actually rests on
 * (`docs/runbooks/bust-appears.md` step 11's table: "state key, reset
 * reason, what an extension DID" -> the event logs, never the capture).
 * Printed beside the capture-pin command the "capture" step already prints
 * (BACKLOG, second half of the same entry: "prints the snapshot command for
 * them, beside the pin command it already prints — for whichever artifact
 * the verdict actually rests on").
 *
 * Matches by SECOND, not millisecond: the pair's own `ts` and its nearest
 * event-log record differ by single-digit milliseconds (measured live), so
 * truncating both timestamps to their shared second is generous and robust
 * to that jitter while excluding everything from a different moment.
 *
 * Machine-local, mode 0600, never committed (event-log slices carry raw
 * session ids — the hygiene scan's `capture-uuid` class blocks them at
 * push) — the SAME convention the runbook already states for a hand-run
 * snapshot; this only saves working out the grep and the path by hand.
 */
export function snapshotCommand(bust, pair) {
  const date = fmt(bust.t).slice(0, 10);
  const sid8 = bust.s.slice(0, 8);
  const time = fmt(bust.t).slice(11, 19).replace(/:/g, "");
  const dir = `~/.local/share/cache-fix/bust-evidence/${date}`;
  const out = `${dir}/${sid8}-${time}Z-events.jsonl`;
  const sec = (iso) => iso.slice(0, 19);
  const pattern = `"ts":"(${sec(pair.before.ts)}|${sec(pair.after.ts)})`;
  return `mkdir -p ${dir} && grep -h -E '${pattern}' ` +
         `~/.local/state/cache-fix/snapshots/s-${bust.s}-*-insertion-events.jsonl ` +
         `~/.local/state/cache-fix/snapshots/s-${bust.s}-*-deferred-tool-events.jsonl ` +
         `> ${out} && chmod 600 ${out}`;
}

/** The capture request pair straddling a bust, by conversation.
 * Streamed via readLines, never readFileSync: the busting session's own
 * capture is routinely the largest on disk, and the whole-file string read
 * died at >512 MB (ERR_STRING_TOO_LONG, live 2026-07-31) — the same class
 * a77c930 fixed in the census. Two passes, retaining only the two records
 * that matter. */
export async function capturePairResult(sid, tsEpoch, capturesDir = CAPTURES, ctx = null) {
  const f = join(capturesDir, `s-${sid}-requests.jsonl`);
  // CHECK 1 of 3 (see `triage`): the capture file itself.
  if (!existsSync(f)) {
    return { ok: false, code: "capture-absent",
             detail: "no capture file for this session (request capture was off, or the capture rotated)" };
  }
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
  // A candidate must be big enough to BE the booked event (BACKLOG item B).
  //
  // The defect: selection was "the newest plausible request at or before the
  // ledger stamp", with plausible meaning only "has >= 2 messages" — a size
  // floor so low that a 2 kB sidecar clears it. Live 2026-08-07T01:00:55Z, a
  // 375,646-token event: the co-tenant traffic around the bust put a 111 kB
  // 2-message request in the candidate set, the telemetry preference picked
  // it (a sidecar's own reset event landed 5 ms from it), it was the FIRST
  // request of its conversation, and the walk cascaded to UNVERIFIABLE with
  // the real 1.0 MB opus request sitting four records away.
  //
  // The test is the ledger's own `ctx` against the candidate's byte size, and
  // it is DEFINITIONAL rather than tuned: no tokenizer emits a token from
  // fewer than one byte, so a request that carried `ctx` tokens occupies at
  // least `ctx` bytes. A record smaller than `ctx` therefore CANNOT be the
  // busting request — a proof, not a heuristic, and one that errs only toward
  // keeping candidates (the record line is larger than the body it holds, and
  // real text runs 2-4 bytes per token, so the floor is far below the true
  // size). Size is primary over the model for the reason the entry gives: a
  // model list goes stale, a byte count does not.
  //
  // `ctx` null (an older ledger record, or a caller that has none) disables
  // the test and leaves the pre-existing rule exactly as it was.
  const bigEnough = (line) => ctx == null || Buffer.byteLength(line) >= ctx;
  const plausible = (r, line) => (r.body.messages?.length ?? 0) >= 2 && bigEnough(line);
  // Telemetry preference (BACKLOG TOOL GAP, 2026-07-31): computed BEFORE the
  // scan so a missing/unreadable events file costs nothing extra — the
  // `candidates` accumulation below only happens when `events` is truthy,
  // keeping the "missing events file => existing behavior exactly" case
  // identical in both output and cost to the pre-existing single-pass scan.
  const events = resetEvents(sid, cutoff);
  let after = null;
  // Lightweight {ts}-only candidates, never full records — a candidate's
  // body can be multi-MB (the same reason this function streams at all;
  // see the header comment above), so only the two records that end up
  // chosen (`after`, `before`) ever get held in full.
  const candidates = [];
  let seen = 0;
  // Coverage bookkeeping for the computed failure reason (BACKLOG item A):
  // every number a reason string quotes is accumulated by the SAME walk that
  // failed, never re-derived by a second pass that could disagree with it.
  let firstTs = null, lastTs = null, atOrBefore = 0;
  // How many otherwise-plausible candidates the `ctx` size test ruled out, so
  // the no-candidate reason can name the test that emptied the set rather
  // than leaving the reader to guess at it.
  let tooSmall = 0, largestDropped = 0;
  // File-wide REQUEST ORDINAL, counted by HARVEST's rule so the number this
  // tool prints is the number `harvest --pin <key> n..m` takes: non-boot and
  // non-outcome records only, zero-based (harvest.mjs pinRange). It is NOT the
  // message count this tool also reports — conflating the two froze the wrong
  // evidence range once, so the pair now carries the ordinal and the run
  // prints a pin command that can be pasted.
  let ord = -1;
  for await (const line of readLines(f)) {
    const r = j(line);
    if (r && r.type !== "boot" && r.type !== "outcome") ord++;
    if (!r?.body?.messages || !r?.ts) continue;
    r.ord = ord;
    seen++;
    const t = Date.parse(r.ts);
    if (firstTs === null || t < firstTs) firstTs = t;
    if (lastTs === null || t > lastTs) lastTs = t;
    if (t <= cutoff) atOrBefore++;
    if (t <= cutoff && (r.body.messages?.length ?? 0) >= 2 && !bigEnough(line)) {
      tooSmall++;
      largestDropped = Math.max(largestDropped, Buffer.byteLength(line));
    }
    if (t <= cutoff && plausible(r, line)) {
      if (!after || t > Date.parse(after.ts)) after = r;
      if (events) candidates.push({ ts: t });
    }
  }
  const span = firstTs === null ? "empty"
    : `${new Date(firstTs).toISOString()} .. ${new Date(lastTs).toISOString()}`;
  // CHECK 2 of 3: the capture exists — does it COVER the stamp? "Covered"
  // means it holds at least one request at or before the bust, i.e. the
  // busting request is inside the file at all. Deliberately not "the stamp
  // lies between first and last": a bust on a session's FINAL request has no
  // record after it, and a coverage rule that demanded one would fire on
  // that entirely healthy case. The span rides the reason text instead, so a
  // capture that merely ENDS early is visible to the reader as numbers
  // rather than mis-stated as a verdict.
  if (!seen || !atOrBefore) {
    return { ok: false, code: "window-not-covered",
             detail: `capture present (${seen} requests, ${span}) but holds no request at or ` +
                     `before the bust stamp — the busting request is not in this file` };
  }
  // CHECK 3 of 3, first half: records cover the stamp, but nothing in them
  // could be the busting request.
  if (!after) {
    return { ok: false, code: "no-candidate",
             detail: `capture covers the stamp (${seen} requests, ${span}; ${atOrBefore} at or before it) ` +
                     `but none could carry this bust` +
                     (tooSmall
                       ? ` — ${tooSmall} request(s) had >=2 messages but were smaller than the ` +
                         `ledger's ctx of ${ctx} tokens (largest ${largestDropped} bytes), so none ` +
                         `of them can be the busting request`
                       : ` — no request at or before the stamp carried 2 or more messages`) };
  }

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
      let o2 = -1;
      for await (const line of readLines(f)) {
        const r = j(line);
        if (r && r.type !== "boot" && r.type !== "outcome") o2++;
        if (!r?.body?.messages || !r?.ts) continue;
        r.ord = o2;
        if (plausible(r, line) && Date.parse(r.ts) === chosen.ts) { after = r; break; }
      }
    }
  }

  const cid = JSON.stringify(after.body.messages[0]);
  let before = null;
  let o3 = -1;
  let convSize = 0;
  for await (const line of readLines(f)) {
    const r = j(line);
    if (r && r.type !== "boot" && r.type !== "outcome") o3++;
    if (!r?.body?.messages || !r?.ts) continue;
    r.ord = o3;
    // `after` itself is excluded by the strict earlier-than check below —
    // the cross-pass object-identity test the array version used is gone.
    if (JSON.stringify(r.body.messages[0]) !== cid) continue;
    convSize++;
    if (Date.parse(r.ts) >= Date.parse(after.ts)) continue;
    if (!before || Date.parse(r.ts) > Date.parse(before.ts)) before = r;
  }
  if (before) return { ok: true, before, after };
  // LINEAGE FALLBACK (BACKLOG "capturePairResult's conversation identity is
  // the busting request's own messages[0]"). `conversationOf` (the cid
  // search above) is CORRECT for cache identity and stays exactly as it was
  // — every stable-identity pair returns above, byte-for-byte unchanged.
  // But matrix row 29's mechanism REBUILDS messages[0] at an idle boundary,
  // so the cid search finds nothing to pair against not because there is no
  // predecessor, but because the identity it searches on was just replaced.
  // Only reached when the cid search above found NOTHING. A second relation
  // — content overlap over per-message hashes, imported rather than
  // re-derived (three confident wrong answers here already came from
  // hand-rolled identity) — finds the predecessor by what it CONTAINS
  // instead of by its first message, and survives the rotation that defeats
  // `conversationOf`.
  const afterEntry = compactEntry({ inMsgs: after.body.messages });
  let bestOverlap = -1;
  let bestEntry = null;
  let bestCandidate = null;
  let o4 = -1;
  for await (const line of readLines(f)) {
    const r = j(line);
    if (r && r.type !== "boot" && r.type !== "outcome") o4++;
    if (!r?.body?.messages || !r?.ts) continue;
    // Strictly earlier than `after` — the same "predecessor" relation the
    // cid search above enforces, never a second notion of "earlier".
    if (Date.parse(r.ts) >= Date.parse(after.ts)) continue;
    const candEntry = compactEntry({ inMsgs: r.body.messages });
    const ov = lineageOverlap(candEntry, afterEntry);
    // >= so that among tied overlaps the MORE RECENT candidate wins — the
    // measured cluster rises monotonically with recency (97.1/97.3/97.7/
    // 98.1/98.5%), so ties are not expected, but a later, closer request is
    // the more plausible predecessor.
    if (ov >= bestOverlap) {
      bestOverlap = ov;
      bestEntry = candEntry;
      r.ord = o4;
      bestCandidate = r;
    }
  }
  // Reject on the relation's OWN evidence, not by a special case: a
  // 1-message co-tenant sidecar sharing 0% never clears the threshold, so it
  // never needs naming here.
  if (bestCandidate && sameLineage(bestEntry, afterEntry)) {
    // Labelled explicitly — a reader must never mistake this for an
    // ordinary same-identity pair the cid search would have found.
    return { ok: true, before: bestCandidate, after, crossesRotation: true };
  }
  // CHECK 3 of 3, second half — and the state that had no word: capture
  // PRESENT, window COVERED, a busting request SELECTED, and the pairing step
  // nonetheless returning nothing because the selected request is the first
  // of its own conversation and no earlier request shares enough content to
  // be its predecessor either. This is the case that printed "capture off, or
  // rotated" on 2026-08-06 and again on 2026-08-07 while the capture sat on
  // disk. It names the pairing input it had, per the entry's design.
  return { ok: false, code: "no-pair-in-conversation",
           detail: `capture covers the stamp (${seen} requests, ${span}); selected the request at ` +
                   `${after.ts} (ord ${after.ord}, n=${after.body.messages.length}) but its ` +
                   `conversation has ${convSize} request(s) in this capture and none earlier — ` +
                   `nothing to pair it against` };
}

/**
 * Back-compatible view of `capturePairResult`: `{before, after}` or null.
 *
 * Kept EXACTLY as it was because `tools/dossier.mjs` reads it as a truthy
 * pair and would dereference a failure object (`pair.before.body`) if the
 * shape widened. The reason lives on the result form, which `triage` uses;
 * a caller that only needs the pair keeps the contract it was written to.
 */
export async function capturePair(sid, tsEpoch, capturesDir = CAPTURES, ctx = null) {
  const r = await capturePairResult(sid, tsEpoch, capturesDir, ctx);
  return r.ok ? { before: r.before, after: r.after } : null;
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

/**
 * The matrix's status vocabulary as an EXPLICIT enum, with a mandatory
 * unmatched case. Returns null for "no state this knows", which the caller
 * must surface as STATUS-UNREADABLE — never as a verdict.
 *
 * What this replaces, and why (measured 2026-08-06): the status was tested by
 * `/\bOPEN\b|RE-OPENED/` and the verdict was `open ? KNOWN-OPEN : MITIGATED`,
 * so every status that is neither word landed on MITIGATED — 17 of 26 rows,
 * including row 6, whose status reads literally "OBSERVED, CAUSE NOT
 * ISOLATED". A live run returned MITIGATED for a bust of a class nobody has
 * mitigated, while `dossier` on the same stamp said UNCLASSIFIED and was
 * right. That is dev-loop's "A checker has THREE answers, not two" broken
 * inside this repo's own front-line triage: the third answer — a status no
 * rule recognises — was folded into the reassuring one.
 *
 * Two properties are deliberate:
 *  - ANCHORED at the start of the status cell, because the matrix's own
 *    convention is that a status LEADS with its state token. An unanchored
 *    test reads prose: row 4's cell leads "OPEN — RE-OPENED" and quotes a
 *    superseded "**CLOSED" later in the same cell.
 *  - The vocabulary is exactly what the matrix currently uses. A state that
 *    is not here is not guessed at — it stops the reader, which is the whole
 *    point. Adding a new status to the matrix means adding it here, and the
 *    STATUS-UNREADABLE verdict is what says so out loud.
 */
const STATUS_RULES = [
  [/^(?:OPEN|RE-OPENED)\b/, "OPEN"],
  // NAME COLLISION, carried here deliberately rather than resolved by
  // renaming: `CONTROLLED = new Set(["cost","resume"])` above classifies
  // LEDGER EVENTS by their `k` — a cost the operator caused. THIS token is a
  // row STATUS on the other axis: the CLASS has no mitigation to build. Row
  // 27 (idle-gap TTL expiry) fires on an event the ledger classified `bust`,
  // so the two are independent and both words stay. Read the axis, not the
  // word.
  [/^CONTROLLED(?:-CAUSE)?\b/, "CONTROLLED"],
  [/^(?:MITIGATED|CLOSED)\b/, "MITIGATED"],
  [/^ACCEPT(?:ED)?\b/, "ACCEPTED"],
  [/^PARTIAL\b/, "PARTIAL"],
  [/^OBSERVED\b/, "OBSERVED"],
  [/^BUILT\b/, "BUILT"],
  [/^DOCUMENTED\b/, "DOCUMENTED"],
  [/^COVERED\b/, "COVERED"],
  [/^N\/A\b/, "NOT-APPLICABLE"],
];

export function statusKind(status) {
  const s = String(status ?? "").replace(/^[\s*_]+/, "");
  for (const [re, kind] of STATUS_RULES) if (re.test(s)) return kind;
  return null;
}

/**
 * Enum state -> the reader's verdict. Everything that is not a shipped
 * mitigation is KNOWN-OPEN, which PRINTS THE STATUS — so ACCEPTED, PARTIAL,
 * OBSERVED, BUILT-but-insufficient, DOCUMENTED, COVERED and the N/A note row
 * all reach the reader as their own words instead of as a false all-clear.
 *
 * ACCEPTED is the one that had to be argued (dispatcher decision,
 * 2026-08-06). MITIGATED's definition is not this table's to make: it comes
 * from `docs/runbooks/bust-appears.md`'s terminal states — "a shipped
 * extension absorbs the class, demonstrated on this instance". An ACCEPT row
 * has no shipped extension by construction, so MITIGATED is false of it.
 * KNOWN-OPEN overstated it in the other direction and was chosen anyway on
 * the argument that where the verdict must be wrong, it should be wrong in
 * the direction that makes someone read the row.
 * REVERSED 2026-08-14: the verdict no longer has to be wrong in either
 * direction — ACCEPTED maps to EXPECTED-BUST, a terminal verdict of its own
 * (matrix-status.mjs's TRIAGE_BY_STATUS made the same move for the whole
 * non-buildable family, and carries the reversal record: KNOWN-OPEN's
 * "read the row" framing was measured functioning as "work here" — sessions
 * dispatched to investigate busts kept investigating accepted classes,
 * operator report 2026-08-14). PARTIAL/OBSERVED/BUILT/DOCUMENTED/COVERED
 * stay KNOWN-OPEN: none of them states a decision NOT to build, so open is
 * the honest reading there.
 *
 * CONTROLLED is the FIFTH value, added 2026-08-07 (operator decision
 * 2026-08-06, BACKLOG). The comment that stood here rejected it on "the
 * vocabulary has consumers outside this file", and that worry was MEASURED
 * before the widening rather than trusted: `grep -rn 'VERDICT_BY_KIND|
 * statusKind|statusVerdict'` over this repo returns this file, three
 * `test/bust-triage-*.test.mjs`, the matrix and BACKLOG prose; the only
 * verdict-list consumer outside the repo is the operator's own
 * `dotfiles/cache-fix/CLAUDE.local.md` (prose, not code). `dossier.mjs`
 * imports from this file but its only `verdict` reference is
 * `s.migration.verdict` — the byte-match census's EXACT/EXTENDED
 * vocabulary, a different axis. No `--json` consumer exists outside this
 * repo.
 * WHY it had to exist rather than staying an ACCEPT: `bust-appears.md`'s
 * terminal states already list CONTROLLED-CAUSE beside MITIGATED, so the
 * enum was the short thing; and writing a controlled cause as ACCEPT makes
 * it read as OPEN work on every future walk.
 */
export const VERDICT_BY_KIND = {
  OPEN: "KNOWN-OPEN",
  MITIGATED: "MITIGATED",
  CONTROLLED: "CONTROLLED-CAUSE",
  ACCEPTED: "EXPECTED-BUST",
  PARTIAL: "KNOWN-OPEN",
  OBSERVED: "KNOWN-OPEN",
  BUILT: "KNOWN-OPEN",
  DOCUMENTED: "KNOWN-OPEN",
  COVERED: "KNOWN-OPEN",
  "NOT-APPLICABLE": "KNOWN-OPEN",
};

/** A status cell -> the verdict a reader acts on. The unmatched case is a
 * verdict of its own and is grouped with UNCLASSIFIED as a stop-here. */
export function statusVerdict(status) {
  const kind = statusKind(status);
  return kind === null ? "STATUS-UNREADABLE" : VERDICT_BY_KIND[kind];
}

/**
 * Split a markdown table row into its cells by TABLE semantics, not by
 * `String.split("|")`.
 *
 * The defect this replaces (measured 2026-08-06, BACKLOG): a cell boundary is
 * an UNESCAPED pipe OUTSIDE inline code, and `split("|")` knows neither
 * exception. Row 3's status carries an inline
 * `` `… | header:anthropic-beta[…]` `` in running text, so the naive split
 * produced one extra field and `cells[length - 2]` handed back a fragment
 * starting mid-sentence — the `DOCUMENTED` the row LEADS with was never seen
 * by anything, and the row read as STATUS-UNREADABLE for a reason that was
 * the parser's rather than the row's.
 *
 * Fix (b) of the entry's two candidates, and the preferred one: escaping the
 * pipe in the matrix cell fixes one row, and the next author re-introduces
 * it. Parsing the class fixes it for every reader.
 *
 * Two rules, both from GFM's table grammar:
 *  - a backslash-escaped `\|` is content, and renders as a bare `|`;
 *  - a backtick run of length N opens a code span closed by the next run of
 *    EXACTLY N, and pipes inside it are content. An UNMATCHED run is literal
 *    text (CommonMark), so it must not swallow the rest of the row — a row
 *    with one stray backtick would otherwise lose every later cell.
 *
 * Shape is deliberately identical to `split("|")`'s for a row whose prose
 * holds no pipe — leading and trailing empties included — so the callers'
 * `cells[length - 2]` indexing is unchanged and rows that parse correctly
 * today keep parsing exactly as they did.
 */
export function splitRowCells(line) {
  const cells = [];
  let cur = "";
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === "\\" && line[i + 1] === "|") { cur += "|"; i += 2; continue; }
    if (ch === "\\" && i + 1 < line.length) { cur += ch + line[i + 1]; i += 2; continue; }
    if (ch === "`") {
      let n = 0;
      while (line[i + n] === "`") n++;
      let k = i + n;
      let close = -1;
      while (k < line.length) {
        if (line[k] !== "`") { k++; continue; }
        let m = 0;
        while (line[k + m] === "`") m++;
        if (m === n) { close = k; break; }
        k += m;
      }
      if (close === -1) { cur += line.slice(i, i + n); i += n; continue; }
      cur += line.slice(i, close + n);
      i = close + n;
      continue;
    }
    if (ch === "|") { cells.push(cur); cur = ""; i++; continue; }
    cur += ch;
    i++;
  }
  cells.push(cur);
  return cells;
}

/** Matrix rows whose status line we can quote, keyed by the classes we map to.
 * `open` is now the ANCHORED enum test, not a substring scan: the old flag was
 * computed over the UNTRUNCATED cell while `status` is truncated to 260 chars,
 * so rows 15 and 21 reported open=true on evidence the reader could not see
 * (their only "OPEN" sits past char 260). `dossier.mjs` reads this field for
 * its "(OPEN)" label; both rows are unreachable from its `classToRow`.
 * Cells come from `splitRowCells`, never `split("|")` — see its docstring. */
export function matrixRow(n, matrixPath = MATRIX) {
  // The path is a parameter because `lintMatrix` can be pointed at a COPY (a
  // planted-defect fixture, or a candidate edit), and a row-readability check
  // that silently read the default file while the walks came from the copy
  // would be two files read as one — the coordinate-space error, at the file
  // level. Default unchanged, so every existing caller is untouched.
  if (!existsSync(matrixPath)) return null;
  for (const line of lines(matrixPath)) {
    const m = /^\|\s*(\d+)\s*\|/.exec(line);
    if (m && Number(m[1]) === n) {
      const cells = splitRowCells(line);
      const status = (cells[cells.length - 2] ?? "").trim().slice(0, 260);
      const kind = statusKind(status);
      return { n, status, kind, open: kind === "OPEN" };
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

/**
 * Thousands separators without a locale. `toLocaleString` reads
 * `LC_NUMERIC`, which on this machine is `de_DE` while `LANG` is `en_US`, so
 * the same call prints `22.702` here and `22,702` elsewhere — a number a
 * check greps for must not depend on the shell that started the process.
 */
const num = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * A `cache_control.ttl` string as seconds, or null for anything this does not
 * recognise. Null is an answer: a TTL that cannot be read must not fall back
 * to 3600 — the remembered-number error the dev-loop names, and the whole
 * point of reading the wire.
 */
export function ttlSeconds(v) {
  const m = /^(\d+)([smh])$/.exec(String(v ?? ""));
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === "h" ? n * 3600 : m[2] === "m" ? n * 60 : n;
}

/**
 * The longest cache TTL declared on this pair's OWN wire, or null when none
 * is. Both requests are walked because a breakpoint moves between them, and
 * `cache_control` sits in two places — on a `system` block and on message
 * content (measured on three live captures, 2026-08-07: three sites each,
 * `{"type":"ephemeral","ttl":"1h"}`).
 *
 * LONGEST rather than shortest, deliberately: the claim being made downstream
 * is that the entry EXPIRED, and that claim is only safe against the most
 * generous TTL on the wire. Taking the shortest would over-fire on a session
 * carrying a 5m breakpoint beside a 1h one.
 */
export function wireTtlSeconds(pair) {
  let best = null;
  const walk = (v) => {
    if (v === null || typeof v !== "object") return;
    if (Array.isArray(v)) { for (const x of v) walk(x); return; }
    for (const [k, x] of Object.entries(v)) {
      if (k !== "cache_control") { walk(x); continue; }
      const s = ttlSeconds(x?.ttl);
      if (s !== null && (best === null || s > best)) best = s;
    }
  };
  walk(pair?.before?.body);
  walk(pair?.after?.body);
  return best;
}

// A TTL expiry removes the cached entry WHOLE, so the surviving read
// (`ctx` - `cc`) is zero up to the API's own accounting rounding. "At or near
// zero" needs a bound, and both edges of it are measured rather than picked:
//   * the rounding on a true expiry is 2 tokens of `ctx` 215,875 = 0.001%
//     (2026-08-06 23:59:10Z, matrix row 27's own datapoint);
//   * the smallest REAL remainder in the same window is a system+tools read of
//     12,366 of `ctx` 320,567 = 3.86% (2026-08-06 16:35:15Z); the other two
//     events that week read 4.82% and 10.57%.
// Three orders of magnitude separate the two populations, and the bound sits
// between them rather than at either measured edge. The absolute floor is for
// a small context, where a fraction of `ctx` would be under the rounding.
export const EXPIRY_READ_FLOOR_TOKENS = 100;
export const EXPIRY_READ_FRACTION = 0.001;

/**
 * Did this bust's cached entry die of OLD AGE rather than of a prefix change?
 *
 * The defect (BACKLOG, measured 2026-08-06 23:59:10Z): a 216k eviction after a
 * 22,702 s gap against the session's own `"ttl":"1h"` answered KNOWN-OPEN
 * **row 4**, because `classToRow` saw census `replace/edit` and nothing asked
 * whether there had been a cached entry left to bust. The pair's real
 * container migration at host 104 is a true statement that is not the cause,
 * and the verdict inflated row 4's evidence with an instance row 4 did not
 * produce.
 *
 * Two conditions, both from matrix row 27's own definition and both
 * load-bearing (each is exercised by a bite that removes the other):
 *   * `gap` exceeds the TTL IN FORCE, read off the pair's own wire;
 *   * the surviving read is at or near zero — an expiry leaves nothing.
 * `mtok` is deliberately NOT one of them: it defaults to 0 whenever the
 * transcript diagnostic was not read, so a check keyed on it fires on every
 * unresolved row (the 2026-08-06 17:39 event is booked three times with
 * `mtok` 0, 0 and 182,728 — one event, three values).
 *
 * Returns a CODE rather than a boolean, so a guard that could not run says
 * which input it lacked instead of quietly declining to fire — the third
 * answer at the guard's own level, and the shape `pairFailure` and
 * `transcriptMiss` already use in this file.
 */
export function idleExpiry(bust, pair) {
  const gap = bust?.gap, ctx = bust?.ctx, cc = bust?.cc;
  if (!Number.isFinite(gap)) {
    return { code: "no-gap", row: null,
             detail: "cannot test idle expiry: this ledger record carries no `gap`" };
  }
  if (!Number.isFinite(ctx) || !Number.isFinite(cc)) {
    return { code: "no-tokens", row: null,
             detail: `cannot test idle expiry: the ledger record carries no ctx/cc pair ` +
                     `(ctx ${ctx ?? "-"}, cc ${cc ?? "-"}), so the surviving read is unknown` };
  }
  const ttl = wireTtlSeconds(pair);
  if (ttl === null) {
    return { code: "no-ttl", row: null,
             detail: `cannot test idle expiry: no cache_control ttl on this pair's own wire ` +
                     `(gap was ${num(gap)} s) — the TTL is never assumed` };
  }
  const read = ctx - cc;
  const limit = Math.max(EXPIRY_READ_FLOOR_TOKENS, Math.round(ctx * EXPIRY_READ_FRACTION));
  if (gap <= ttl) {
    return { code: "not-idle", row: null, ttl, gap, read,
             detail: `gap ${num(gap)} s is inside the wire's ttl ${ttl} s — the entry was still there` };
  }
  if (read > limit) {
    return { code: "read-survived", row: null, ttl, gap, read,
             detail: `gap ${num(gap)} s exceeds the wire's ttl ${ttl} s, but ${num(read)} tokens ` +
                     `survived (ctx ${num(ctx)} - cc ${num(cc)}, limit ${num(limit)}) — the entry ` +
                     `was there and something else lost it` };
  }
  return { code: "fired", row: 27, ttl, gap, read,
           detail: `gap ${num(gap)} s > ttl ${ttl} s (read off this pair's own cache_control) and ` +
                   `only ${num(read)} token(s) survived (ctx ${num(ctx)} - cc ${num(cc)}, ` +
                   `limit ${num(limit)}) — the cached entry expired before the request existed` };
}

/**
 * The SECOND classification axis: the transcript's own cause.
 *
 * The census classifies the MESSAGE array, so a tools-driven bust — whose
 * messages are legitimately append-only — maps to no row by construction.
 * Live 2026-08-02: the run printed `transcript tools_changed / 484972` and
 * then called the bust UNCLASSIFIED, with the answer one line above it. That
 * verdict is this tool's payload and stays reachable, but only when NEITHER
 * axis maps; otherwise a known class hides behind the word reserved for a
 * new one.
 *
 * `tools_changed` is discriminated rather than lumped, because the two
 * sub-classes have opposite mitigation stories and the pair carries the
 * evidence: when every tool's `name` and `input_schema` are byte-identical
 * and only `description` differs, the model cannot emit a call the client
 * is unable to execute, so the block is absorbable (row 23); any change to
 * a schema, the set, or the order is not (row 6). Discriminating this took
 * three hand probes on the live capture — the mechanism is the deliverable.
 *
 * `system_changed` maps to row 24 (BACKLOG.md's own row-24 entry, half one):
 * it is one of the three causes CC's transcript emits, and the resume /
 * born-large class books under it — row 24's cell names the shape directly
 * ("transcript causes `system_changed` then `messages_changed` on
 * consecutive turns"). Unlike `tools_changed` it needs no pair-shaped
 * discrimination: every `system_changed` bust is this row, by construction
 * of what the row already covers. Half two of that entry — a
 * cross-conversation "born-large" pair mode for `capturePair` itself — is
 * deliberately NOT built here; its own red-first arrangement rested on a
 * capture that no longer exists on disk.
 */
export function causeToRow(cause, pair) {
  if (cause === "messages_changed") return 4;
  if (cause === "system_changed") return 24;
  if (cause !== "tools_changed") return null;
  const b = pair?.before?.body?.tools;
  const a = pair?.after?.body?.tools;
  if (!Array.isArray(b) || !Array.isArray(a)) return 6;   // cannot tell: the general row
  if (b.length !== a.length) return 6;
  let descOnly = false;
  for (let i = 0; i < b.length; i++) {
    if (b[i]?.name !== a[i]?.name) return 6;              // set or order moved
    if (JSON.stringify(b[i]?.input_schema) !== JSON.stringify(a[i]?.input_schema)) return 6;
    if (b[i]?.description !== a[i]?.description) descOnly = true;
  }
  return descOnly ? 23 : 6;
}

// --- Row-4 sub-mechanism evidence: anchor position and block-migration/FLAP ---
//
// BACKLOG READY: "bust-triage maps replace/edit -> row 4 flatly ... so the
// census annotations that distinguish this row's sub-mechanisms never reach
// the operator at the runbook's designated entry point." `classToRow` itself
// is unchanged by this section — it still maps `replace/edit` to row 4, and
// that mapping is not what was wrong. What was missing is the EVIDENCE beside
// it: an edit at the human anchor (the known reminder-re-stamping shape) and
// an edit 45 raw indices away inside a 20-leg FLAP (measured live,
// 2026-08-06T18:08:32Z, capture s-captureAM — matrix row 4's own datapoint)
// both printed as the identical two lines, `census replace/edit` /
// `no reminder container migration`, with nothing to tell a reader which
// mechanism produced either one.

// FLAP is an OSCILLATION (markFlaps, replay.mjs): a migration is a FLAP only
// when an EARLIER migration of the same conversation reversed it, so a bare
// {before, after} pair can never show one — there is nothing earlier to
// compare against. This is the window fed to findEditPositions /
// findBlockMigrations so the pair's own transition can be scored against its
// real history. Deliberately larger than replay.mjs's own FLAP_WINDOW (5,
// not exported from that file): findBlockMigrations enforces its own window
// internally when scanning backward (markFlaps), so handing it MORE history
// than it needs is harmless, while hand-copying the constant's VALUE here
// would silently drift the day replay.mjs's own window changes without this
// file noticing.
const WINDOW_ENTRIES = 12;

// Mirrors replay.mjs's own inline literal for the far-from-anchor tripwire
// (`Math.abs(e.anchorDelta) > 30`, not exported — a private threshold inside
// a printing block cannot be imported). Named here rather than left as a
// magic number repeated at its one call site below.
const FAR_ANCHOR_THRESHOLD = 30;

/**
 * The pair's own anchor position and block-migration/FLAP evidence — see the
 * section header above for what this exists to distinguish. Never re-derives
 * the edit-position or block-migration algorithms: both are IMPORTED from
 * replay.mjs (`findEditPositions`, `findBlockMigrations`, `compactEntry`) and
 * run over a real conversation window read fresh off the capture (see
 * WINDOW_ENTRIES for why a bare pair cannot show a FLAP).
 *
 * Streams the capture file ONCE, filtering to records sharing `after`'s own
 * first-message identity — the SAME "same conversation" test
 * `capturePairResult` already uses for `before`, never a second notion of
 * conversation identity — and stopping once the stream passes `after`'s own
 * ordinal. Only the last `windowEntries` matching records are retained, as
 * COMPACT entries (hashes, never message bodies), so the extra pass costs
 * O(window) memory, not O(conversation) — the same heap discipline
 * `capturePairResult` already documents for this file.
 *
 * Returns null when the window cannot be built at all (no ordinal on the
 * pair, no capture file, fewer than 2 in-conversation records found — the
 * pair itself should always supply 2, so this is a defensive floor, not an
 * expected path). Returns `{ edit: null, blockMigrations: [] }` when the
 * window built but named no replace/edit row for this exact transition —
 * should not happen when the caller already classified the pair's census as
 * "replace/edit", and is surfaced as "no evidence" rather than asserted, per
 * the "gaps surface, never bridge" rule.
 */
export async function pairEditContext(sid, pair, capturesDir = CAPTURES, windowEntries = WINDOW_ENTRIES) {
  const beforeOrd = pair?.before?.ord;
  const afterOrd = pair?.after?.ord;
  const cidTarget = pair?.after?.body?.messages?.[0];
  if (beforeOrd == null || afterOrd == null || cidTarget === undefined) return null;
  // A pair whose predecessor came from `capturePairResult`'s LINEAGE
  // fallback (`crossesRotation`) has a DIFFERENT `messages[0]` than `after`
  // by construction — that is the rotation the fallback exists to cross.
  // The cid-based window below groups by the SAME `conversationOf`
  // (`inHash[0]`) identity `findEditPositions`/`findBlockMigrations` group
  // by, which by definition puts `before` and `after` in two different
  // groups — no edit-position row can ever have `prevN === beforeOrd` and
  // `n === afterOrd` there, because that pair spans the very rotation the
  // grouping treats as a hard boundary. Building the window anyway would
  // silently disagree with `capturePairResult` about which requests are one
  // conversation (the dependency this fix carries) while returning the same
  // "no evidence" shape a genuine absence returns — say so explicitly
  // instead.
  if (pair?.crossesRotation) {
    return { edit: null, blockMigrations: [] };
  }
  const f = join(capturesDir, `s-${sid}-requests.jsonl`);
  if (!existsSync(f)) return null;
  const cidJson = JSON.stringify(cidTarget);
  const ring = [];
  let ord = -1;
  for await (const line of readLines(f)) {
    const r = j(line);
    if (r && r.type !== "boot" && r.type !== "outcome") ord++;
    if (ord > afterOrd) break;
    if (!r?.body?.messages || !r?.ts) continue;
    if (JSON.stringify(r.body.messages[0]) !== cidJson) continue;
    ring.push(compactEntry({ n: ord, ts: r.ts, id: r.id ?? null, key: "w", inMsgs: r.body.messages }));
    if (ring.length > windowEntries) ring.shift();
  }
  if (ring.length < 2) return null;
  const edit = findEditPositions(ring).find((e) => e.n === afterOrd && e.prevN === beforeOrd) ?? null;
  const blockMigrations = findBlockMigrations(ring).filter((b) => b.n === afterOrd && b.prevN === beforeOrd);
  return { edit, blockMigrations };
}

// Presentation only, for the `edit-anchor` triage step below. replay.mjs's
// own `migrationLine`/`flapTag` are module-private (not exported), so these
// mirror their FORMAT rather than re-deriving anything: every field printed
// here (`direction`, `sourceIdx`, `targetIdx`, `join`, `flap`) comes straight
// off the row `findBlockMigrations` already computed.
const migrationSpan = (b) =>
  b.join !== "cross-message"
    ? `${b.sourceIdx}->${b.targetIdx}`
    : b.direction === "inline->standalone"
      ? `${b.sourceIdx}+${b.sourceIdx + 1}->${b.targetIdx}`
      : `${b.sourceIdx}->${b.targetIdx}+${b.targetIdx + 1}`;
const migrationLine = (b) => `${b.join ? `join:${b.join} ` : ""}${b.direction} ${migrationSpan(b)}`;
const flapTag = (b) =>
  b.flap ? ` [FLAP reverses n=${b.flap.reversesPrevN}->${b.flap.reversesN}, ${b.flap.span} req]` : "";

// --- The matrix's SECOND container for a disposition: `## Event walk` prose ---
//
// The defect (BACKLOG, found 2026-08-06 at session close, fired live again
// 2026-08-07 09:52:42Z): `bust-triage --at` returned UNCLASSIFIED — "a class
// nothing currently covers" — for `previous_message_not_found`, which this
// repo walked to CONTROLLED-CAUSE on 2026-07-31 and wrote up under an
// `## Event walk` heading. `causeToRow` reaches NUMBERED ROWS only, so the
// walk was unreachable by construction: a reader following the documented
// route finds the answer, the tool following its route reports a new class.
//
// Both halves of that gap are real, and this file carries both:
//   READER — `causeToWalk` indexes the walk sections by the cause they name;
//   WRITER — `lintMatrix` (`--lint-matrix`) refuses a walk that does not
//     declare its cause, its disposition and its row-or-no-row. Fixing the
//     reader alone is the symptom-site fix one level up: the amplifier goes
//     quiet and the generator keeps producing prose nothing can index.

/**
 * `other` and `unavailable` are claude-worktime's DEGRADED DEFAULT — set when
 * `cache_miss_reason` could not be read at all — so they name the ABSENCE of
 * a cause, never a cause. Matrix row 21 says so in the same words ("`other`
 * is NOT evidence for this row … it means 'no cause available'"), and
 * `triage`'s reconcile step already special-cases `other`. They are excluded
 * from the lint's cause population definitionally, not as a tuning: a rule
 * that mapped them to a disposition would pick one hypothesis out of several
 * unruled-out ones.
 */
export const NON_CAUSES = new Set(["other", "unavailable"]);

// The machine-readable line every `## Event walk` section carries. It exists
// because the prose CANNOT be parsed for this safely: the 2026-08-07
// 01:00:55Z walk is a NON-DEFECT with no row of its own and its body quotes
// "row 27" inside a comparison table, so a `\brow \d+\b` scan would read it
// as row-27's walk — the "needle that matches more than one thing" shape this
// repo keeps paying for. A declaration is one line, and it is what makes the
// seam computable rather than judged.
const WALK_DECL =
  /^WALK-INDEX:\s+cause=(\S+)\s+disposition=(\S+)\s+row=(\d+|none)\s*(?:[—-]\s*(.+))?$/;

// The ❄ token as the headings render it, which is the statusline's own form:
// `❄ 212k \`other\`` or `two ❄ \`messages_changed\`` or `❄ 51k
// previous_message_not_found`. Read INDEPENDENTLY of the declaration above,
// on purpose: the lint's cause population comes from the heading and the
// index comes from the declaration, so a declaration that disagrees with the
// heading it sits under is a red rather than a silent agreement with itself.
// A single-source check here would be the predicate no input can falsify.
const HEADING_CAUSE = /❄\s*(?:[\d.,]+k\s+)?`?([a-z][a-z_]*)`?/g;

/**
 * Every `## Event walk` section in the matrix, parsed.
 *
 * `{ title, headingCauses[], cause, disposition, row, reason, declared }` —
 * `cause`/`disposition`/`row` come from the WALK-INDEX line and are null when
 * there is none, which is itself a lint finding rather than something to
 * guess at.
 */
export function eventWalks(matrixPath = MATRIX) {
  // NOT `lines()`: that helper drops blank lines, so every line number it
  // yields is short by however many blanks precede it — measured here, 1045
  // for a heading that sits on 1212. A finding that sends its reader to the
  // wrong line is the "two coordinate spaces that look like one" shape, and
  // both numbers are plausible.
  const src = existsSync(matrixPath) ? readFileSync(matrixPath, "utf8").split("\n") : [];
  const walks = [];
  for (let i = 0; i < src.length; i++) {
    if (!/^## Event walk\b/.test(src[i])) continue;
    // A walk's heading is its `## Event walk` line plus any immediately
    // following `## ` continuation lines (four of the five wrap onto two).
    const heading = [src[i]];
    let k = i + 1;
    while (k < src.length && /^## /.test(src[k]) && !/^## Event walk\b/.test(src[k])) {
      heading.push(src[k++]);
    }
    const body = [];
    while (k < src.length && !/^## /.test(src[k])) body.push(src[k++]);
    const headingCauses = [];
    for (const line of heading) {
      for (const m of line.matchAll(HEADING_CAUSE)) headingCauses.push(m[1]);
    }
    let decl = null;
    for (const line of body) {
      const m = WALK_DECL.exec(line.trim());
      if (m) { decl = m; break; }
    }
    walks.push({
      title: heading[0].replace(/^##\s*/, "").trim(),
      line: i + 1,
      headingCauses,
      declared: decl !== null,
      cause: decl && decl[1] !== "none" ? decl[1] : null,
      disposition: decl ? decl[2] : null,
      row: decl && decl[3] !== "none" ? Number(decl[3]) : null,
      rowDeclaredNone: decl ? decl[3] === "none" : false,
      reason: decl ? (decl[4] ?? null) : null,
    });
    i = k - 1;
  }
  return walks;
}

/** The walk that dispositions this cause, or null. Newest-first (file order). */
export function causeToWalk(cause, matrixPath = MATRIX) {
  if (!cause || NON_CAUSES.has(cause)) return null;
  return eventWalks(matrixPath).find((w) => w.cause === cause) ?? null;
}

/** Can this tool reach a disposition for this cause AT ALL — row or walk? */
export function causeIsReachable(cause, matrixPath = MATRIX) {
  return causeToRow(cause, null) !== null || causeToWalk(cause, matrixPath) !== null;
}

/**
 * The WRITER half, as a check rather than as a rule someone has to remember.
 *
 * Three assertions, all mechanical:
 *  1. every `## Event walk` section carries a WALK-INDEX declaration;
 *  2. its `row=` either names a matrix row this tool can read, or is `none`
 *     WITH a stated reason;
 *  3. the set difference is empty — every cause token a walk HEADING names
 *     (minus the degraded defaults) is one this tool can resolve to a
 *     disposition, by numbered row or by walk.
 * Plus: two walks declaring one cause must agree on its disposition.
 *
 * Assertion 3 is sourced from the HEADINGS while the index it tests is built
 * from the DECLARATIONS, so it is not the vacuous "the map contains what I
 * put in it". Assertion 1 is what stops a new walk from being invisible to
 * assertion 3 by simply not declaring anything.
 */
export function lintMatrix(matrixPath = MATRIX) {
  const walks = eventWalks(matrixPath);
  const findings = [];
  const seen = new Map();
  for (const w of walks) {
    const at = `line ${w.line}: ${w.title.slice(0, 60)}`;
    if (!w.declared) {
      findings.push(`${at}\n    no WALK-INDEX line — a walk nothing can index is a disposition ` +
                    `only a human reading prose will ever find`);
      continue;
    }
    if (!w.headingCauses.length) {
      findings.push(`${at}\n    the heading names no ❄ cause token, so assertion 3 has nothing ` +
                    `to check this walk against`);
    }
    if (w.row !== null && matrixRow(w.row, matrixPath) === null) {
      findings.push(`${at}\n    declares row=${w.row}, which is not a readable matrix row`);
    }
    if (w.rowDeclaredNone && !w.reason) {
      findings.push(`${at}\n    declares row=none with no stated reason — "deliberately no row" ` +
                    `and "nobody minted one" must not read alike`);
    }
    if (w.cause) {
      const prior = seen.get(w.cause);
      if (prior && prior !== w.disposition) {
        findings.push(`${at}\n    declares cause=${w.cause} disposition=${w.disposition}, but an ` +
                      `earlier walk dispositions the same cause as ${prior}`);
      } else if (!prior) seen.set(w.cause, w.disposition);
    }
  }
  // Assertion 3, over every cause any walk heading names.
  const population = [];
  for (const w of walks) {
    for (const c of w.headingCauses) {
      if (NON_CAUSES.has(c) || population.includes(c)) continue;
      population.push(c);
    }
  }
  for (const c of population) {
    if (causeIsReachable(c, matrixPath)) continue;
    findings.push(`cause "${c}" is dispositioned in the matrix but this tool cannot resolve it — ` +
                  `it reads as UNCLASSIFIED, i.e. as a class nothing covers`);
  }
  return { walks, population, findings };
}

/**
 * Ledger cause <-> transcript diagnostic pairs that NAME THE SAME EVENT.
 *
 * The defect (BACKLOG, measured 2026-08-06T23:59:10Z): the reconcile step
 * warned `LEDGER says "idle", TRANSCRIPT says "previous_message_not_found" —
 * instrument disagreement` about one eviction that both instruments got
 * right. `idle` is claude-worktime's gap-derived cause; the other is the
 * API's own diagnostic for the same expiry. The check compared two fields
 * from DIFFERENT VOCABULARIES as though they were one, so agreement in
 * substance read as disagreement in words — and a reconcile warning that
 * fires on a non-defect trains its reader to discount the one that matters.
 *
 * This is a table of equivalences, not a normalization: the two vocabularies
 * stay distinct and both are printed, because which instrument said what is
 * the information the step exists to carry. A pair earns an entry only when
 * the two terms denote the same underlying event — never when one is merely
 * the usual consequence of the other.
 */
export const CAUSE_EQUIVALENCE = [
  // A cached entry that expired before the request arrived. The ledger derives
  // it from the inter-request gap against the entry's TTL; the API reports the
  // resulting lookup failure. Same eviction, two vantage points.
  ["idle", "previous_message_not_found"],
];

/** Do a ledger cause and a transcript diagnostic name the same event? */
export function sameEvent(ledgerCause, transcriptType) {
  if (ledgerCause === transcriptType) return true;
  return CAUSE_EQUIVALENCE.some(
    ([a, b]) => (ledgerCause === a && transcriptType === b) ||
                (ledgerCause === b && transcriptType === a));
}

// --- Attribution: OURS vs CC's, via the primitive replay.mjs already computes ---
//
// docs/dev-loop.md, "No mitigation is DESIGNED before the attribution verdict
// exists": a bust walk carries an ATTRIBUTION line with three answers and no
// default (OURS / CC's / COULD-NOT-ATTRIBUTE-with-its-computed-reason), and
// it IMPORTS replay.mjs's primitive (`attributionOf`) rather than re-deriving
// it. Two parts, because the two halves have very different costs:
//
// PART ONE is free. `pair.before`/`pair.after` are this tool's own captured
// requests, and captures are PRE-pipeline by construction (request-capture
// runs at order 60, ahead of every mutating extension — dev-loop.md,
// "Captures are PRE-pipeline ... a divergence present in the raw capture is
// Claude Code's; one absent there is OURS"). So if CC's own raw messages did
// not change AT ALL between the pair (a pure append — `attributionOf`'s
// `inDiv === null` branch), nothing upstream explains a forwarded
// divergence, and the answer is OURS without needing anything else.
//
// PART TWO is not free, and is why this needs a second tool rather than a
// second expression. Knowing whether OUR forwarded output diverged EARLIER
// than CC's own bytes did (the case `inDiv` alone cannot decide) needs the
// REAL forwarded array, and that only exists behind the full, STATEFUL
// extension pipeline: insertion-normalization and deferred-tool-rewrite
// carry per-conversation state built by every request before this one, so
// replaying just the two requests in this pair (with no prior state) would
// produce a DIFFERENT forwarded body than the one actually sent — the exact
// reason replay.mjs's own attribution pass (`replayThrough`, its "Naive
// attribution ... does not work for stateful extensions" comment) replays
// the WHOLE corpus rather than one pair. The only trustworthy source is
// therefore a full corpus replay from the session's first request, which is
// exactly what `replay.mjs --census` already does — its `--json` output
// already carries `violations` (findStabilityViolations: the general-purpose
// "did our output diverge earlier than CC's input" check) with real
// `inDiv`/`outDiv`. This reuses that computation as a subprocess, the same
// pattern `gate-live.mjs` already runs daily (`runChild`/`replayArgs`) — a
// local copy rather than an import, because gate-live.mjs's helpers are
// shaped for its own scheduled-sweep status file, and coupling a manual,
// single-event tool to a daily sweep's module is the wrong direction of
// dependency.

const CENSUS_HEAP_CAP_MB = 2048; // mirrors gate-live.mjs's CHILD_HEAP_CAP_MB
// — same replay child, same OOM-vs-regression discriminator (that file's own
// comment: a replay that truly streams needs nowhere near this cap; one that
// silently regressed into retaining its input dies against it instead of
// OOMing the machine).
const REPLAY = join(__dirname, "replay.mjs");

function runChild(args) {
  return new Promise((resolve) => {
    const child = spawn("node", args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => resolve({ code: -1, out: "", err: String(e?.message ?? e) }));
    child.on("close", (code) => resolve({ code, out, err }));
  });
}

/**
 * The replayed census's `violations` rows for one session's capture — the
 * ONLY source of a real forwarded-side divergence index (see the section
 * header above for why). The exit CODE is not the signal: replay.mjs exits
 * non-zero whenever it finds a stability violation, which is the EXPECTED
 * outcome here — this tool exists to triage a bust that already happened.
 * The JSON is the signal, same discipline as gate-live.mjs's summariseCensus.
 * Three ordered checks, never a guessed disjunction: the capture must exist,
 * the child must produce output, and the output must parse to JSON carrying
 * a `violations` array. Returns `{ok:true, violations}` or `{ok:false,
 * reason}`.
 */
async function replayedViolations(capturePath) {
  if (!existsSync(capturePath)) {
    return { ok: false, reason: `capture file ${capturePath} does not exist — cannot replay it` };
  }
  const res = await runChild(
    [`--max-old-space-size=${CENSUS_HEAP_CAP_MB}`, REPLAY, capturePath, "--json", "--census"]);
  if (res.code === -1) {
    return { ok: false, reason: `replay subprocess failed to start: ${res.err}` };
  }
  let parsed;
  try {
    parsed = JSON.parse(res.out);
  } catch {
    return { ok: false,
             reason: `replay subprocess exited ${res.code} with no parseable JSON output` +
                     (res.err ? ` — stderr: ${res.err.trim().split("\n").slice(-4).join(" / ")}` : "") };
  }
  if (!Array.isArray(parsed.violations)) {
    return { ok: false, reason: "replay's --census --json output carried no `violations` array" };
  }
  return { ok: true, violations: parsed.violations };
}

/**
 * OURS / CC's / COULD-NOT-ATTRIBUTE for one triaged pair. `sid` and
 * `capturesDir` locate the same capture file `capturePairResult` already
 * read, so the replay below sees exactly the traffic this pair came from.
 */
export async function computeAttribution(sid, pair, capturesDir = CAPTURES) {
  const inDiv = firstDivergence(pair.before.body.messages, pair.after.body.messages);
  if (inDiv === null) {
    return { verdict: "OURS",
             reason: "CC's own raw captured messages are identical/append-only between this pair " +
                     "(captures are PRE-pipeline) — nothing upstream explains a forwarded " +
                     "divergence, so it originates with us" };
  }
  if (pair.before.ord == null || pair.after.ord == null) {
    return { verdict: "COULD-NOT-ATTRIBUTE",
             reason: "this pair carries no request ordinal to match against the replayed census" };
  }
  const capturePath = join(capturesDir, `s-${sid}-requests.jsonl`);
  const rv = await replayedViolations(capturePath);
  if (!rv.ok) {
    return { verdict: "COULD-NOT-ATTRIBUTE", reason: rv.reason };
  }
  const row = rv.violations.find((v) => v.n === pair.after.ord && v.prevN === pair.before.ord);
  if (!row) {
    return { verdict: "CC's",
             reason: `CC's own raw bytes diverged at index ${inDiv}, and the replayed census recorded ` +
                     "no stability violation for this pair (our forwarded output never diverged " +
                     "earlier than CC's own bytes did), so the divergence is CC's" };
  }
  return attributionFromRow(row);
}

/**
 * The verdict carried by ONE replayed-census violation row.
 *
 * `findStabilityViolations` emits a row only under `outDiv !== null && outDiv
 * < (inDiv ?? Infinity)` (replay.mjs's `scanGroup`) — which IS
 * `attributionOf(inDiv, outDiv) === true`, spelled with the same two
 * quantities the row then carries. So every row that source can produce is
 * OURS, and a "CC's" alternative on this path would be a predicate no input
 * could falsify: unprovable, not merely unproven, and it would read as a live
 * discriminator to anyone auditing the three-answer contract.
 *
 * Measured 2026-08-10, on synthetic pairs fed to the real
 * `findStabilityViolations`, instrument-positive first: outDiv=1 < inDiv=3
 * emitted 1 row and an append-only input emitted 1 row (both attributionOf
 * true), while the "CC's" shape — inDiv=1 < outDiv=3 — emitted 0 rows. The
 * CC's verdict therefore reaches the caller only via the no-row branch above,
 * where it is computed from real evidence.
 *
 * The invariant is CHECKED rather than assumed. A row contradicting its own
 * producer's emission guard means the two sides have drifted apart, and the
 * honest answer to "whose divergence is this" is then COULD-NOT-ATTRIBUTE with
 * the contradiction named — never a verdict inferred from a broken premise.
 */
export function attributionFromRow(row) {
  if (!attributionOf(row.inDiv, row.outDiv)) {
    return { verdict: "COULD-NOT-ATTRIBUTE",
             reason: `the replayed census emitted a violation row that contradicts its own ` +
                     `emission guard (inDiv=${row.inDiv} is at or before outDiv=${row.outDiv}, ` +
                     `so this pair should not have been recorded as a violation at all) — ` +
                     `replay.mjs's scanGroup and this reader have drifted apart, and no ` +
                     `attribution follows from a broken premise` };
  }
  return { verdict: "OURS",
           reason: `replayed census: our forwarded output diverged at outDiv=${row.outDiv}, ahead of ` +
                   `CC's own bytes (inDiv=${row.inDiv ?? "append-only"}), and CC's byte at that index ` +
                   `is ${row.ccIdenticalAtOutDiv ? "identical" : "also changed"} across the pair` };
}

export async function triage(bust) {
  const steps = [];
  const tc = transcriptCause(bust.s, bust.cc);
  // The reason a step could not run is COMPUTED, never asserted (BACKLOG item
  // A). The old text named two causes — "older CC, or transcript rotated" —
  // and tested neither; on 2026-08-07 01:00:55Z both were false while the
  // transcript sat on disk.
  steps.push(tc
    ? { step: "transcript", ok: true, detail: `${tc.type}${tc.missed ? ` / ${tc.missed}` : ""}` }
    : { step: "transcript", ok: false, detail: transcriptMiss(bust.s, bust.cc).detail });

  // Reconciliation: the ledger and the transcript must agree. They disagreed
  // live on 2026-07-31 (display upgraded, record left "other") and the
  // divergence was invisible until compared.
  if (tc && bust.cause && bust.cause !== "other" && !sameEvent(bust.cause, tc.type)) {
    steps.push({ step: "reconcile", ok: false,
                 detail: `LEDGER says "${bust.cause}", TRANSCRIPT says "${tc.type}" — instrument disagreement` });
  } else if (tc && bust.cause === "other") {
    steps.push({ step: "reconcile", ok: false,
                 detail: `ledger still "other" while transcript has "${tc.type}" — raced read never upgraded` });
  } else if (tc && bust.cause && bust.cause !== tc.type) {
    // Agreement across two vocabularies. Both terms are printed rather than
    // collapsed: which instrument said what is the information this step
    // exists to carry, and a reader who sees only one of them cannot tell
    // this case from a genuine match.
    steps.push({ step: "reconcile", ok: true,
                 detail: `ledger "${bust.cause}" and transcript "${tc.type}" name the same event` });
  } else if (tc) {
    steps.push({ step: "reconcile", ok: true, detail: "ledger and transcript agree" });
  }

  // `bust.ctx` is the ledger's own context-token figure for this event, and it
  // is what stops a co-tenant request too small to BE the event from being
  // selected (BACKLOG item B). Older ledger records carry no `ctx`; the null
  // then disables the size test rather than excluding everything.
  const res = await capturePairResult(bust.s, bust.t, CAPTURES, bust.ctx ?? null);
  if (!res.ok) {
    // Three ordered checks, each one TESTED before it is reported
    // (BACKLOG item A): capture-absent / window-not-covered / no-candidate /
    // no-pair-in-conversation. The old text was a disjunction of two causes
    // the tool never examined — "capture off, or rotated" — and on both
    // 2026-08-06 and 2026-08-07 every disjunct was false: the capture was
    // present, covered the window, and the pairing step still returned
    // nothing. A guessed reason reads exactly like a measured one.
    steps.push({ step: "capture", ok: false, detail: res.detail });
    return { bust, steps, verdict: "UNVERIFIABLE", why: res.detail, unverifiable: res.code,
             attribution: { verdict: "COULD-NOT-ATTRIBUTE",
                             reason: `no capture pair to classify — ${res.detail}` } };
  }
  const pair = { before: res.before, after: res.after };
  // Both numbers, and which is which: `n=` is the MESSAGE COUNT, the pin
  // hint carries the file-wide REQUEST ORDINALS `harvest --pin` takes. They
  // are far apart in a long capture (message 591 vs ordinal 892 on the
  // motivating pair), and pinning one where the other was meant freezes an
  // unrelated range — silently, since a fixture of the wrong requests still
  // looks like a fixture.
  const ords = pair.before.ord != null && pair.after.ord != null
    ? ` | freeze: harvest --pin s-${bust.s} ${pair.before.ord}..${pair.after.ord}`
    : "";
  steps.push({ step: "capture", ok: true,
               detail: `${pair.before.ts} -> ${pair.after.ts}, n=${pair.before.body.messages.length}->${pair.after.body.messages.length}${ords}` });

  // Attribution — OURS / CC's / COULD-NOT-ATTRIBUTE, per docs/dev-loop.md's
  // gate ("No mitigation is DESIGNED before the attribution verdict exists").
  // Computed unconditionally, right after the pair is known, and threaded
  // into every return point below: attribution answers "whose bytes moved",
  // a question orthogonal to which matrix row (or walk, or KEY-FLIP) the
  // event lands on, so it is never withheld because the rest of the walk
  // takes some other path.
  const attribution = await computeAttribution(bust.s, pair, CAPTURES);
  steps.push({ step: "attribution", ok: attribution.verdict !== "COULD-NOT-ATTRIBUTE",
               detail: `${attribution.verdict} — ${attribution.reason}` });

  // State-key check (BACKLOG: "bust-triage reports a state-key CHANGE
  // across the pair as its own line"). Read right after `pair` is known so
  // the step prints beside census/migration/idle-ttl for context even on a
  // run where it does not end up deciding the verdict — a reader should see
  // "the two requests shared one state" or "they did not" alongside every
  // other fact about the pair, not only when it is the deciding one.
  const sk = stateKeyFlip(bust.s, pair);
  if (sk.code === "unresolved") {
    const missing = !sk.before && !sk.after ? "neither side"
      : !sk.before ? "the BEFORE request" : "the AFTER request";
    steps.push({ step: "state-key", ok: false,
                 detail: `no insertion/deferred-tool event-log record within ${TELEMETRY_WINDOW_MS}ms ` +
                          `of ${missing} — cannot test for a state-key flip` });
  } else {
    const npc = sk.noPriorCanonical ? " (no-prior-canonical armed-but-baseline-less on the reset side(s))" : "";
    steps.push({ step: "state-key", ok: sk.code === "stable",
                 detail: `${sk.before.key.slice(-16)} (${sk.before.action}${sk.before.resetReason ? `/${sk.before.resetReason}` : ""}) ` +
                          `-> ${sk.after.key.slice(-16)} (${sk.after.action}${sk.after.resetReason ? `/${sk.after.resetReason}` : ""})` +
                          `${sk.code === "flip" ? " — KEY-FLIP" : " — stable"}${npc}` });
  }

  const cls = censusPair(pair.before.body.messages, pair.after.body.messages);
  steps.push({ step: "census", ok: true, detail: cls });

  const mig = migrationVerdict(pair);
  steps.push(mig
    ? { step: "migration", ok: true,
        detail: `row-4 container migration at host ${mig.host} ` +
                `(${mig.verdict}${mig.sub ? `/${mig.sub}` : ""})` }
    : { step: "migration", ok: true, detail: "no reminder container migration in this pair" });

  // Row-4 sub-mechanism evidence (BACKLOG READY item — see the section header
  // above pairEditContext): only meaningful for the census class classToRow
  // maps flatly, so this does not run for other classes. Printed beside
  // census/migration for the same reason those two are unconditional: a
  // reader should see every fact about the pair together, not only when it
  // ends up deciding the verdict.
  if (cls === "replace/edit") {
    const ec = await pairEditContext(bust.s, pair, CAPTURES);
    if (ec?.edit) {
      const e = ec.edit;
      const anchor = e.anchorDelta === null ? "no-human-anchor"
        : `anchor${e.anchorDelta >= 0 ? "+" : ""}${e.anchorDelta}`;
      const far = e.anchorDelta !== null && Math.abs(e.anchorDelta) > FAR_ANCHOR_THRESHOLD;
      const bmTag = ec.blockMigrations.length
        ? " " + ec.blockMigrations.map((b) => `[blockMigration ${migrationLine(b)}]${flapTag(b)}`).join(" ")
        : "";
      steps.push({ step: "edit-anchor", ok: !far,
                   detail: `edit@${e.at} of ${e.lastIdx} [${anchor}]${bmTag}` +
                           (far
                             ? ` — >30 from the human anchor: NOT the known reminder-anchoring class`
                             : "") });
    } else {
      steps.push({ step: "edit-anchor", ok: false,
                   detail: "could not resolve anchor/blockMigration evidence for this replace/edit pair " +
                           "(capture window unavailable, or this transition named no row inside it)" });
    }
  }

  // The idle/TTL guard runs BEFORE any classToRow call (BACKLOG item T,
  // matrix row 27). Order is the whole point: `classToRow` answers "what
  // changed in this pair", which is a real question with a true answer even
  // when there was no cached entry left to change. Asked second it would have
  // already filed the event against row 4 — which is exactly what happened on
  // 2026-08-06 23:59:10Z. The census and migration STEPS above still print,
  // because "the pair carries a container migration" stays true and the
  // reader should see both facts side by side.
  const idle = idleExpiry(bust, pair);
  if (idle.code === "fired") {
    steps.push({ step: "idle-ttl", ok: true, detail: idle.detail });
  } else if (idle.code === "no-gap" || idle.code === "no-tokens" || idle.code === "no-ttl") {
    // A guard that could not run says so. Silence here would be a check that
    // reports clean by never firing — the vacuous pass this repo keeps
    // finding. It stays quiet on `not-idle`/`read-survived`, which are
    // DECISIONS rather than absences: a note on every run is a note nobody
    // reads.
    steps.push({ step: "idle-ttl", ok: false, detail: idle.detail });
  }

  // KEY-FLIP stops here, before any row/matrix-walk dispatch — a body diff
  // cannot see a state-key discontinuity (BACKLOG: "it reported the ROW's
  // status as though it were a per-instance absorption claim, on an
  // instance where nothing absorbed"), so every verdict downstream of a
  // classification derived from the body (MITIGATED, KNOWN-OPEN, and a
  // matrix-walk disposition alike) would be a claim about a population this
  // pair was never a member of. Placed before rowN is even computed —
  // "ranking with UNCLASSIFIED and STATUS-UNREADABLE" is a general
  // stop-here, not a carve-out that only fires when the row would have said
  // MITIGATED.
  if (sk.code === "flip") {
    steps.push({ step: "freeze-hint", ok: true, detail: `snapshot: ${snapshotCommand(bust, pair)}` });
    return { bust, steps, verdict: "KEY-FLIP",
             why: `this pair's two requests ran under DIFFERENT extension state keys ` +
                  `(...${sk.before.key.slice(-16)} -> ...${sk.after.key.slice(-16)}) — no continuous ` +
                  `instance for a matrix row's status to have absorbed across, so any row-based ` +
                  `verdict here (even MITIGATED) would describe the wrong population`,
             attribution };
  }

  // Two axes, in order: the message census first (it is the more specific
  // statement), then the transcript's own cause. UNCLASSIFIED requires BOTH
  // to miss — see causeToRow's docstring for why the second axis exists.
  let rowN = idle.code === "fired" ? idle.row : classToRow(cls, mig);
  if (rowN === null) rowN = causeToRow(tc?.type, pair);
  // THIRD axis: the matrix's other container for a disposition. A cause the
  // repo has already walked to a verdict must not read as "a class nothing
  // currently covers" merely because the verdict was written as prose rather
  // than as a numbered row — see the eventWalks block above.
  const walk = rowN === null ? causeToWalk(tc?.type) : null;
  if (walk) {
    steps.push({ step: "matrix-walk", ok: true,
                 detail: `"${walk.title}" dispositions "${walk.cause}" as ${walk.disposition}` });
    if (walk.row !== null) {
      rowN = walk.row;
    } else {
      const kind = statusKind(walk.disposition);
      if (kind === null) {
        // The third answer again: the walk exists and its disposition is in
        // no state this tool knows. Stopping is right — adding the state is a
        // deliberate act, not something a reader should have inferred.
        return { bust, steps, verdict: "STATUS-UNREADABLE",
                 why: `the matrix walk "${walk.title}" dispositions this cause as ` +
                      `"${walk.disposition}", which is in no state this tool recognises — ` +
                      `read the walk, then add the state to STATUS_RULES`,
                 attribution };
      }
      return { bust, steps, verdict: VERDICT_BY_KIND[kind],
               why: `matrix event walk "${walk.title}" (${kind}): ` +
                    `${walk.reason ?? walk.disposition}`,
               attribution };
    }
  }
  if (rowN === null) {
    return { bust, steps, verdict: "UNCLASSIFIED",
             why: `census class "${cls}" maps to no threat-matrix row, and the transcript cause ` +
                  `${tc?.type ? `"${tc.type}" ` : "is absent, so it "}adds none — and no matrix ` +
                  `event walk dispositions it either — a class nothing currently covers`,
             attribution };
  }
  // STATUS IS DATA (records-restructure directive, phase 1): a row's verdict
  // is resolved by ROW NUMBER against the status file, never by re-parsing
  // the matrix's own prose — the prose leading-token path this replaced is
  // `statusKind`/`VERDICT_BY_KIND`/`matrixRow`, which stay in this file for
  // their OTHER callers (the walk-disposition path just above, which has no
  // row number to look up; `tools/backlog-lint.mjs`; this file's own
  // `--selftest` and `--lint-matrix` structural checks) — see this file's
  // header comment for the grep that established that.
  const tri = rowTriage(rowN);
  if (!tri.ok) {
    // THREE answers, never two: a missing status file, an unparseable one,
    // or a row this status file does not carry is a refusal, never a
    // default verdict — the same STATUS-UNREADABLE shape the prose path
    // used for "a row matched, but its state is in no vocabulary this tool
    // knows", now for "a row matched, but the status file could not answer
    // for it".
    return { bust, steps, verdict: "STATUS-UNREADABLE",
             why: `matrix row ${rowN}'s triage could not be read: ${tri.reason}`,
             attribution };
  }
  // The `why` prints alongside every verdict (see the CLI renderer below),
  // so the non-buildable family's split — WON'T/MUST-NOT/CAN'T/NOT-OURS —
  // reaches the reader instead of collapsing back into a bare KNOWN-OPEN.
  return {
    bust, steps,
    verdict: tri.verdict,
    why: tri.why
      ? `matrix row ${rowN} (${tri.status} — ${tri.why})`
      : `matrix row ${rowN} (${tri.status})`,
    attribution,
  };
}

// UTC, and it SAYS so. Without the marker these rows read as local time, and
// the documented next step is to paste one into `dossier`, which used to apply
// the local zone to a naked stamp — so on any machine west or east of UTC the
// round trip silently addressed a different 90 seconds than the row named.
// Measured on this machine (CEST, 2026-08-05): the dossier came back 1/5
// evidence classes PRESENT with four plausible, wrong "ABSENT" reasons.
// `dossier` now reads a zone-less stamp as UTC; this end stops producing one.
//
// Stays bare UTC on purpose: `dossier <stamp>` and `--at <stamp>` both take
// this exact string as a copy-paste argument, so `fmt`'s own output is never
// where local time gets attached — callers add it beside `fmt(t)`, never
// inside it (BACKLOG: "every human-facing stamp emits BOTH zones").
function fmt(t) { return `${new Date(t * 1000).toISOString().replace("T", " ").slice(0, 19)}Z`; }

/**
 * The form statement `--list` prints above its rows.
 *
 * The list is NEWEST FIRST (coldEvents sorts descending) and truncated to a
 * screenful. Neither fact is visible in the rows themselves, and a reader
 * cannot check an ordering the instrument never states: a `tail` of this
 * output returns the OLDEST rows of the slice while reading as "the latest
 * events" — the shape behind a whole-period absence claim ("no busts today")
 * built from a list whose today-rows sat at the top, delivered before it was
 * caught (2026-08-02). Stating the form is what makes a slice of it honest.
 */
export function listHeader(events, shown) {
  return `cold events — NEWEST FIRST, showing ${shown} of ${events.length}` +
         ` (a tail of these rows is the OLDEST of them). Times are UTC,` +
         ` with local alongside; paste the leading UTC token straight into` +
         ` \`dossier <stamp>\`.`;
}

/**
 * `--list` rows: every ❄-visible event, controlled ones labelled as such,
 * now carrying the three fields the operator's own screen shows and the
 * old row did not — ORDINAL, PROJECT, AGE — beside the pre-existing UTC
 * stamp, size, cause and sid (BACKLOG: "the operator's view and
 * `bust-triage --list` share NO identifying field").
 *
 * `opts.ordinals` lets a caller pass ordinals computed over a DIFFERENT
 * (typically larger, or de-duplicated) population than `events` itself —
 * `main()` does this so a truncated slice's ordinals still reflect the
 * session's FULL bust history. Falls back to computing them from `events`
 * alone, which keeps every direct call site (including this file's own
 * tests) working unchanged.
 * `opts.now` is seconds-since-epoch for AGE; defaults to the real clock and
 * exists only so a test can pin it.
 * A row whose earlier bookings were collapsed (`e.dupCount`,
 * `collapseDuplicateBookings`) says so — flagged, never silently merged.
 */
export function listRows(events, opts = {}) {
  const ord = opts.ordinals ?? sessionOrdinals(events);
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  return events.map((e) => {
    const label = e.cls === "controlled" ? `CONTROLLED(${e.cause ?? "-"})` : (e.cause ?? "-");
    const n = e.cls === "bust" ? ord.get(`${e.s}#${e.t}`) : null;
    const ordPrefix = n && n > 1 ? `#${n} ` : "";
    const dupSuffix = e.dupCount > 1 ? ` (x${e.dupCount} booked)` : "";
    const proj = projectFor(e.s) ?? "-";
    const age = ageStr(now - e.t);
    // Local time is its OWN column (two-space-separated on both sides), not
    // glued onto fmt(e.t) — the round trip's copy-paste target is "the first
    // whitespace-delimited field" (test/stamp-utc.test.mjs), and that must
    // stay exactly `fmt(e.t)` with nothing attached.
    return `  ${fmt(e.t)}  ${localSuffix(e.t * 1000).padEnd(15)}${String(Math.round((e.cc ?? 0) / 1000)).padStart(4)}k  ` +
           `${(ordPrefix + label + dupSuffix).padEnd(34)} ${e.s.slice(0, 8)}  ` +
           `${proj.padEnd(20)} ${age}`;
  });
}

// One sentence, two callers: the default path and the --at path must not
// drift into two different explanations of the same non-verdict.
const CANNOT_TRIAGE =
  "        Cannot triage: a controlled cause (compact/resume) is a cost you\n" +
  "        caused, not a bust — there is no prevented-loss verdict to give.";

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
    `  NOTE  the newest cold event is ${fmt(newest.t)} ${localSuffix(newest.t * 1000)} ` +
    `CONTROLLED(${newest.cause ?? "-"}), ${Math.round((newest.cc ?? 0) / 1000)}k re-written.\n` +
    CANNOT_TRIAGE;
  return [head, bust
    ? `        Falling back to the newest BUST: ${fmt(bust.t)} ${localSuffix(bust.t * 1000)} (${(bust.cause ?? "-")}).`
    : "        No bust in the ledger to fall back to."];
}

/**
 * `--at <stamp>` resolution, against ALL cold events rather than only busts.
 *
 * The defect this replaces (found 2026-08-05 by using it): `--at` picked the
 * nearest BUST and never saw the controlled events at all, so a stamp naming
 * a CONTROLLED event — copied straight out of `--list`, which is what the
 * runbook tells the reader to do — answered about an older, unrelated bust
 * with nothing marking the substitution. The default path already printed
 * `fallbackNote` for exactly that situation; `--at` routed around the guard,
 * which is worse than not having one: the reader believes the verdict
 * describes the event they asked about. Measured on the motivating ledger:
 * `--at 2026-08-05T17:22:36Z` (a CONTROLLED(resume), 408k) printed NOTHING
 * and returned a verdict about the 12:20:13Z messages_changed bust.
 *
 * ONE rule, covering the entry's three clauses: the stamp resolves against
 * every ❄-visible event (so a controlled one can be NAMED instead of silently
 * skipped), the bust triaged is always the newest AT OR BEFORE the stamp
 * (never "the newest" — an event after the stamp cannot be the one the reader
 * was looking at), and the note fires whenever those two are not the same
 * event. When there is no bust at or before the stamp, that IS the answer.
 * Relies on `coldEvents`'s newest-first order for "the newest at or before".
 */
export function resolveAt(events, wantSec) {
  if (!events.length) return { requested: null, bust: null, note: [] };
  const requested = events.reduce((best, e) =>
    Math.abs(e.t - wantSec) < Math.abs(best.t - wantSec) ? e : best, events[0]);
  const bust = events.find((e) => e.cls === "bust" && e.t <= wantSec) ?? null;
  if (bust && requested.cls === "bust" && requested.t === bust.t) {
    return { requested, bust, note: [] };
  }
  const why = requested.cls === "controlled"
    ? `        CONTROLLED(${requested.cause ?? "-"}), ` +
      `${Math.round((requested.cc ?? 0) / 1000)}k re-written.\n` + CANNOT_TRIAGE
    : `        a BUST (${requested.cause ?? "-"}), ` +
      `${Math.round((requested.cc ?? 0) / 1000)}k re-written — but LATER than the\n` +
      "        stamp you asked about, so it is not the event you were looking at.";
  const head =
    `  NOTE  --at ${fmt(wantSec)} ${localSuffix(wantSec * 1000)} resolves to the cold event at ` +
    `${fmt(requested.t)} ${localSuffix(requested.t * 1000)},\n${why}`;
  return { requested, bust, note: [head, bust
    ? `        Falling back to the newest BUST at or before ${fmt(wantSec)} ${localSuffix(wantSec * 1000)}: ` +
      `${fmt(bust.t)} ${localSuffix(bust.t * 1000)} (${bust.cause ?? "-"}).`
    : `        No bust at or before ${fmt(wantSec)} ${localSuffix(wantSec * 1000)} to fall back to.`] };
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
    // De-duplicated over the FULL population, not the slice: a duplicate
    // booking (or a session's earlier busts) can sit outside the visible 15
    // rows, and both the "showing N of M" count and every ordinal must
    // still be right against the true history.
    const deduped = collapseDuplicateBookings(events);
    const ordinals = sessionOrdinals(deduped);
    const slice = deduped.slice(0, 15);
    process.stdout.write(listHeader(deduped, slice.length) + "\n");
    for (const row of listRows(slice, { ordinals })) process.stdout.write(row + "\n");
    return 0;
  }
  if (args.includes("--lint-matrix")) {
    const { walks, population, findings } = lintMatrix();
    // Coverage first, because a lint that read nothing reports clean — the
    // "0/0 reads like checked and clean" shape this repo has hit three times.
    process.stdout.write(
      `matrix walk lint — ${walks.length} \`## Event walk\` section(s), ` +
      `${population.length} cause token(s) checked\n`);
    for (const w of walks) {
      process.stdout.write(
        `  ${w.declared ? "OK  " : "MISS"}  line ${String(w.line).padStart(4)}  ` +
        `cause=${w.cause ?? "-"} disposition=${w.disposition ?? "-"} ` +
        `row=${w.row ?? (w.rowDeclaredNone ? "none" : "-")}  ` +
        `heading=[${w.headingCauses.join(", ")}]\n`);
    }
    if (!walks.length) {
      process.stdout.write(
        "\nFAIL: no walk sections found at all — the READER is the suspect, not the matrix.\n");
      return 1;
    }
    if (!findings.length) {
      process.stdout.write("\nOK: every walk declares itself, and every cause it names is reachable.\n");
      return 0;
    }
    process.stdout.write(`\n${findings.length} finding(s):\n`);
    for (const f of findings) process.stdout.write(`  - ${f}\n`);
    process.stdout.write(
      "\nA walk that dispositions a cause the tool cannot reach makes `bust-triage`\n" +
      "answer UNCLASSIFIED — 'a class nothing covers' — about a class this repo has\n" +
      "already walked to a verdict. Declare the walk, or map the cause.\n");
    return 1;
  }
  const atI = args.indexOf("--at");
  const explicit = atI >= 0;
  let bust = all[0];
  let note = fallbackNote(events);
  let requested = null;
  if (explicit) {
    const raw = args[atI + 1] ?? "";
    const want = /^\d+$/.test(raw) ? Number(raw) : Math.floor(Date.parse(raw) / 1000);
    if (!Number.isFinite(want)) {
      // An unparseable stamp used to fall through the nearest-match reduce
      // (every comparison against NaN is false) and triage the newest bust,
      // which is the same silent substitution one level up.
      process.stdout.write(
        `--at: "${raw}" is neither an epoch nor a parseable stamp — nothing triaged.\n`);
      return 2;
    }
    ({ requested, bust, note } = resolveAt(events, want));
    if (!bust) {
      for (const line of note) process.stdout.write(line + "\n");
      process.stdout.write(`no cold-cache BUST at or before ${fmt(want)} ${localSuffix(want * 1000)} to triage.\n`);
      return 0;
    }
  } else if (!all.length) {
    // "no busts" and "nothing happened" are different statements, and the
    // controlled events are exactly what distinguishes them.
    for (const line of note) process.stdout.write(line + "\n");
    process.stdout.write("no cold-cache BUSTS in the worktime ledger.\n");
    return 0;
  }
  const r = await triage(bust);
  if (json) {
    // `newest` and `requested` ride the JSON so a consumer can see the
    // substitution too — the whole failure was that it happened invisibly.
    // `fellBack` covers BOTH paths now: it used to be `!explicit && …`, which
    // reported false on the one path that substituted without saying so.
    process.stdout.write(JSON.stringify(
      { ...r, newest: events[0] ?? null, requested, fellBack: note.length > 0 }, null, 2) + "\n");
    return 0;
  }

  if (note.length) process.stdout.write("\n" + note.join("\n") + "\n");
  process.stdout.write(`\nbust-triage — ${fmt(bust.t)} ${localSuffix(bust.t * 1000)}  ${Math.round(bust.cc / 1000)}k re-written  session ${bust.s.slice(0, 8)}\n\n`);
  for (const s of r.steps) {
    // Both zones at the TEXT boundary only: the detail string is composed once
    // and also read verbatim by `--json`, so the local half is added on the way
    // out rather than baked into the stored value (local-stamp.mjs,
    // withLocalStamps). One call covers every step's stamps.
    process.stdout.write(`  ${s.ok ? "OK  " : "WARN"}  ${s.step.padEnd(11)} ${withLocalStamps(s.detail)}\n`);
  }
  process.stdout.write(`\n  VERDICT: ${r.verdict}\n  ${r.why}\n`);
  process.stdout.write(`\n  ATTRIBUTION: ${r.attribution.verdict}\n  ${r.attribution.reason}\n`);
  if (r.verdict === "UNCLASSIFIED") {
    process.stdout.write(
      "\n  An unclassified bust is a NEW CLASS until shown otherwise. Book it as a\n" +
      "  threat-matrix row before it is explained away — the matrix records, the\n" +
      "  gate enforces, and a class with no row is a class nothing watches.\n");
  }
  if (r.verdict === "EXPECTED-BUST") {
    process.stdout.write(
      "\n  STOP — expected cost, not a CC bug. This class is deliberately\n" +
      "  unmitigated (the why above says whether it's won't/must-not/can't/\n" +
      "  not-ours build). No investigation or mitigation work is owed on an\n" +
      "  instance; re-opening the class is a status-file change, not a walk.\n");
  }
  if (r.verdict === "STATUS-UNREADABLE") {
    process.stdout.write(
      "\n  STOP, as with UNCLASSIFIED: the row exists but its status is in no state\n" +
      "  this tool knows, so no verdict follows from it. Read the row yourself, then\n" +
      "  either fix the status line or add the state to STATUS_RULES. A status\n" +
      "  nothing recognises must never reach a reader as MITIGATED.\n");
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
    const { writeFileSync } = await import("node:fs");
    const d = tmpDirSync("bt-");
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
    // capture (s-captureS) — the CORRECT candidate (19:22:22.252Z) sits 5ms
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

    // 7749d7fc companion-case collision (dispatcher decision, 2026-08-02,
    // narrowing "non-append" to reset-only): the correct candidate's own
    // reset event and the wrongly-favored candidate's own "normalized"
    // event are BOTH within the window — and the normalized one is
    // CLOSER (4ms vs 5ms), so even with nearest-wins the wrong candidate
    // won under the originally-shipped "any non-append action" rule. Real
    // numbers off the live 19:13:48 companion capture (s-captureV): the
    // genuine reset request sits at 19:13:31.253Z (resetReason=
    // not-subsequence, matches BACKLOG's byte attribution), its own event
    // 5ms away; the wrongly-favored next-turn request sits at
    // 19:13:47.849Z, its own "normalized" event only 4ms away. Confirmed
    // RED first: `preferTelemetryConfirmed` given both action types picks
    // the decoy purely because 4ms < 5ms — "normalized" firing on an
    // ordinary, non-busting request is indistinguishable from a genuine
    // signal until the action itself is restricted.
    {
      const genuine = { ts: 1785525211253 };
      const decoy = { ts: 1785525227849 };
      const withNormalized = [
        { ts: 1785525211258, action: "reset" },       // 5ms from genuine
        { ts: 1785525227853, action: "normalized" },  // 4ms from decoy
      ];
      const redOld = preferTelemetryConfirmed([genuine, decoy], withNormalized);
      eq(redOld.ts, decoy.ts,
         "RED check: 'any non-append action' picks the decoy — its normalized match is 1ms closer than the genuine reset match");
      const onlyReset = withNormalized.filter((e) => e.action === "reset");
      const fixed = preferTelemetryConfirmed([genuine, decoy], onlyReset);
      eq(fixed.ts, genuine.ts,
         "reset-only excludes the normalized decoy match entirely, so the genuine reset match wins");
    }

    // resetEvents: globs every insertion-events file for the sid (one sid
    // owns several — one per conversation/system-prompt sub-key, per
    // insertion-normalization.mjs's resolveInsertionSessionKey), keeps
    // ONLY action==="reset" (both append-only AND normalized excluded —
    // see resetEvents's docstring for why normalized had to go too), and
    // anything after the cutoff.
    {
      const evDir = tmpDirSync("bt-events-");
      writeFileSync(join(evDir, "s-SID-key1-insertion-events.jsonl"), [
        JSON.stringify({ ts: "2026-07-31T19:22:22.257Z", sid: "SID", action: "reset", resetReason: "not-subsequence" }),
        JSON.stringify({ ts: "2026-07-31T19:23:00.000Z", sid: "SID", action: "reset" }), // after cutoff
      ].join("\n") + "\n");
      writeFileSync(join(evDir, "s-SID-key2-insertion-events.jsonl"), [
        JSON.stringify({ ts: "2026-07-31T19:22:38.015Z", sid: "SID", action: "append-only" }),
        JSON.stringify({ ts: "2026-07-31T19:22:39.000Z", sid: "SID", action: "normalized" }),
      ].join("\n") + "\n");
      const cutoffMs = Date.parse("2026-07-31T19:22:40.000Z");
      const ev = resetEvents("SID", cutoffMs, evDir);
      eq(ev.length, 1, "one reset, pre-cutoff event across both files — append-only AND normalized excluded");
      eq(ev[0].action, "reset", "the reset survives the filter");
      eq(resetEvents("SID", cutoffMs, join(evDir, "does-not-exist")), null,
         "missing directory reads as null, not []");
      eq(resetEvents("OTHER-SID", cutoffMs, evDir), null,
         "a sid with no matching files reads as null too");
    }
    process.stdout.write("bust-triage: selftest passed\n");
    process.exit(0);
  }
  process.exit(await main(process.argv));
}
