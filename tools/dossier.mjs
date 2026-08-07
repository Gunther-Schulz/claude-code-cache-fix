#!/usr/bin/env node
// dossier — one command from a bust timestamp to ONE file carrying every
// evidence class the cachebust runbook asks for.
//
// The runbook (claude-worktime, docs/cachebust-runbook.md) stays the
// INTERPRETATION guide; what stops being manual is the collection. Its four
// steps each answer one question:
//
//   1  did it happen, how big, what did the API say  -> worktime's ❄ ledger
//   2  where in the request did the prefix diverge   -> prefix-diff ledgers
//   3  what exact bytes changed                      -> the capture pair
//   4  what was the conversation doing               -> the CC transcript
//
// plus the dev-loop's standing rule that a new unexplained class gets one
// `gh search issues` before it gets an investigation: "the row-4 mechanism sat
// in a public issue for over two weeks while we derived the same facts
// independently."
//
// THREE answers per class, never two (dev-loop.md): every section is PRESENT
// with its evidence or ABSENT with the reason it could not be collected. A
// section is never silently missing, because a dossier with a gap that looks
// like a blank is the same failure as a checker printing 0/0.
//
// It CHAINS the tools that already exist rather than reimplementing them
// (dev-loop.md, "Never hand-roll identity in a probe"): the ledger reading,
// retraction handling, capture pairing, census classification and matrix
// lookup all come from bust-triage.mjs; the snapshot key derivation comes
// from prefix-diff.mjs itself. New here is only the join and the rendering.
//
// Usage:
//   node tools/dossier.mjs --last                     # newest bust
//   node tools/dossier.mjs 2026-07-30T16:57:14Z       # a specific one (UTC)
//   node tools/dossier.mjs --last --out /tmp/d.md
//   node tools/dossier.mjs --last --no-gh             # skip the issue sweep
//
// ONE output file. Default `./dossier-<utc>.md` under the cwd; it is a
// working artifact and is never committed.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import {
  coldEvents,
  transcriptCause,
  capturePair,
  migrationVerdict,
  matrixRow,
  classToRow,
} from "./bust-triage.mjs";
import { censusPair } from "./replay.mjs";
import { resolveSessionKey } from "../proxy/extensions/prefix-diff.mjs";

const execFileP = promisify(execFile);

export const SNAPSHOTS = join(homedir(), ".claude/cache-fix-snapshots");
export const PROJECTS = join(homedir(), ".claude/projects");
export const MIRRORS = join(homedir(), ".claude/session-mirrors");
export const KEYMAP = join(homedir(), ".claude/cache-fix-keymap.jsonl");
// Seconds either side of the bust stamp that count as "the window". Wide
// enough that a ledger written after the response still lands inside it.
export const WINDOW_SEC = 90;

const j = (line) => { try { return JSON.parse(line); } catch { return null; } };
// CONTENT ONLY — this drops blank lines, so an index into what it returns is
// NOT a line number in the file. Every caller here reads JSONL records or
// matches a row by its own text, where dropping blanks is right (and for
// JSONL, required). A caller that needs a POSITION reads the file whole and
// says so: measured 2026-08-07, a lint built on this helper reported line
// 1045 for a heading sitting at 1212, and both numbers are plausible — the
// only tell is that one of them is wrong.
const lines = (p) => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean) : []);
const iso = (epoch) => new Date(epoch * 1000).toISOString();

/** PRESENT / ABSENT, with the reason attached to the absence. Never a bare
 * empty section: an unexplained blank reads as "nothing happened". */
const present = (detail, data) => ({ status: "PRESENT", detail, data });
const absent = (why) => ({ status: "ABSENT", detail: why, data: null });

/**
 * The prefix-diff storage key for a session id. Derived by calling
 * prefix-diff's OWN resolveSessionKey with the header it reads, so the two
 * cannot drift apart — the reason this was a hunt-by-time in the first place
 * is that the key is a one-way hash and nothing recorded the mapping.
 */
export function snapshotKeyFor(sid) {
  return resolveSessionKey({ "x-claude-code-session-id": sid }, null);
}

/**
 * Step 1 — magnitude, API cause, and worktime's per-hit forensic fields.
 * `events` is the population; the row is the one nearest the requested stamp.
 */
export function step1Worktime(events, tsEpoch) {
  if (!events.length) return absent("worktime ledger has no cold events (tool not installed, or rotated)");
  const row = events.reduce((best, e) =>
    Math.abs(e.t - tsEpoch) < Math.abs(best.t - tsEpoch) ? e : best, events[0]);
  const drift = Math.abs(row.t - tsEpoch);
  return present(
    `${iso(row.t)}  ${row.cc ?? 0} cc  cause=${row.cause ?? "-"}  ` +
    `${row.cls}${drift ? `  (nearest event, ${drift}s from the requested stamp)` : ""}`,
    row);
}

/**
 * Step 2 — where the prefix diverged, from the prefix-diff append-only
 * ledger. Reads the `.jsonl`, never the `.json`: the detail file is rewritten
 * on every diff and is gone within minutes in an active session.
 */
export function step2PrefixDiff(sid, tsEpoch, opts = {}) {
  const dir = opts.dir ?? SNAPSHOTS;
  const window = opts.window ?? WINDOW_SEC;
  const key = opts.key ?? snapshotKeyFor(sid);
  const path = join(dir, `${key}-events.jsonl`);
  if (!existsSync(path)) {
    return absent(`no prefix-diff ledger for key ${key} (proxy off at the time, or the ledger rotated)`);
  }
  const lo = (tsEpoch - window) * 1000;
  const hi = (tsEpoch + window) * 1000;
  const rows = lines(path).map(j).filter((r) => {
    const t = r?.ts ? Date.parse(r.ts) : NaN;
    return Number.isFinite(t) && t >= lo && t <= hi;
  });
  if (!rows.length) {
    return absent(`ledger ${key}-events.jsonl exists but carries no row within ±${window}s ` +
                  `— the window is empty, which is NOT the same as no divergence`);
  }
  return present(`${rows.length} diff record(s) on key ${key} within ±${window}s`, { key, path, rows });
}

/**
 * Step 3 — the exact mutated bytes: the capture pair straddling the bust,
 * classified. Pairing, classification and the row-4 migration test are
 * bust-triage's; nothing is re-derived here.
 *
 * Every index and count this section reports is measured in the RAW CAPTURE
 * (request-capture, pipeline order 60 — what CC sent, before any extension
 * mutates it), and the record says so. dev-loop.md, "Tap points": a raw
 * index once read as a forwarded-body index named the wrong message during
 * the 587k attribution, and hand-derived census figures for the same event
 * routinely come from the census's own block units rather than from
 * `messages.length`. A number without its tap point is not comparable.
 */
export const STEP3_VIEW = "raw-capture@60";
export async function step3Bytes(sid, tsEpoch, opts = {}) {
  const pair = opts.pair !== undefined ? opts.pair : await capturePair(sid, tsEpoch);
  if (!pair) return absent("no capture pair (request capture was off, or the capture rotated)");
  const cls = censusPair(pair.before.body.messages, pair.after.body.messages);
  const mig = migrationVerdict(pair);
  const rowN = classToRow(cls, mig);
  const row = rowN === null ? null : matrixRow(rowN);
  const mirror = join(opts.mirrors ?? MIRRORS, sid);
  return present(
    `${pair.before.ts} -> ${pair.after.ts}, n=${pair.before.body.messages.length}->` +
    `${pair.after.body.messages.length}, census=${cls} [${STEP3_VIEW}]`,
    {
      view: STEP3_VIEW,
      before: pair.before.ts,
      after: pair.after.ts,
      nBefore: pair.before.body.messages.length,
      nAfter: pair.after.body.messages.length,
      censusClass: cls,
      migration: mig,
      matrixRow: rowN,
      matrixStatus: row?.status ?? null,
      matrixOpen: row?.open ?? null,
      mirrorDir: existsSync(mirror) ? mirror : null,
    });
}

/**
 * Step 4 — conversation context. POINTERS, not content: the transcript is the
 * ground truth a reader opens, and copying turns into the dossier would both
 * bloat it and duplicate a file that is right there. What the dossier owes is
 * the path and the line numbers, which is exactly what a hand investigation
 * spends its time reconstructing.
 */
export function step4Transcript(sid, tsEpoch, opts = {}) {
  const projects = opts.projects ?? PROJECTS;
  if (!existsSync(projects)) return absent(`no transcript root at ${projects}`);
  let path = null;
  for (const proj of readdirSync(projects)) {
    const f = join(projects, proj, `${sid}.jsonl`);
    if (existsSync(f)) { path = f; break; }
  }
  if (!path) return absent(`no transcript for session ${sid} under ${projects} (rotated or another machine)`);
  const window = opts.window ?? WINDOW_SEC;
  const lo = (tsEpoch - window) * 1000;
  const hi = (tsEpoch + window) * 1000;
  const hits = [];
  let n = 0;
  for (const line of lines(path)) {
    n++;
    const r = j(line);
    const t = r?.timestamp ? Date.parse(r.timestamp) : NaN;
    if (!Number.isFinite(t) || t < lo || t > hi) continue;
    hits.push({
      line: n,
      ts: r.timestamp,
      type: r.type ?? "?",
      agent: r.agentId ?? null,
      cc: r.message?.usage?.cache_creation_input_tokens ?? null,
      cr: r.message?.usage?.cache_read_input_tokens ?? null,
      apiCause: r.message?.diagnostics?.cache_miss_reason?.type ?? null,
    });
  }
  if (!hits.length) {
    return absent(`transcript ${path} carries no entry within ±${window}s of the stamp`);
  }
  return present(`${hits.length} transcript entr(ies) within ±${window}s`, { path, hits });
}

/**
 * The dev-loop's mandated sweep: one `gh search issues` per unexplained
 * class, before an investigation. READ-ONLY by construction — `gh search`
 * has no write form.
 */
export async function ghSweep(terms, opts = {}) {
  const run = opts.run ?? ((args) => execFileP("gh", args, { timeout: opts.timeout ?? 20000 }));
  const out = [];
  for (const term of terms) {
    try {
      const { stdout } = await run([
        "search", "issues", term,
        "--limit", "5", "--json", "repository,number,title,state,url",
      ]);
      const rows = j(stdout) ?? [];
      out.push({ term, rows });
    } catch (err) {
      return absent(`gh search failed (${String(err?.message ?? err).split("\n")[0]}) ` +
                    "— the sweep did NOT run; an unexplained class is still unswept");
    }
  }
  const total = out.reduce((a, r) => a + r.rows.length, 0);
  return present(`${out.length} query/queries, ${total} issue(s)`, out);
}

/** Search terms for the sweep: the API cause and the census class are what
 * an upstream report would be phrased around. */
export function sweepTerms(bust, step3) {
  const terms = [];
  const cause = bust?.cause && bust.cause !== "other" ? bust.cause : null;
  if (cause) terms.push(`${cause} cache in:title,body`);
  const cls = step3?.data?.censusClass;
  if (cls === "replace/edit" || step3?.data?.migration) {
    terms.push("system-reminder standalone message cache in:title,body");
  }
  if (!terms.length) terms.push("prompt cache invalidation in:title,body");
  return terms;
}

const sect = (n, title, s) => {
  const body = [`## ${n}. ${title} — ${s.status}`, "", s.detail, ""];
  return body;
};

export function renderDossier(d) {
  const out = [];
  const b = d.bust;
  out.push(`# Cache-bust dossier — ${iso(d.tsEpoch)}`);
  out.push("");
  out.push("Collected by `tools/dossier.mjs`. The cachebust runbook is the");
  out.push("interpretation guide; this file is the collection. Working artifact —");
  out.push("not committed.");
  out.push("");
  out.push(`- requested stamp: \`${iso(d.tsEpoch)}\``);
  out.push(`- session: \`${d.sid ?? "-"}\``);
  out.push(`- prefix-diff key: \`${d.key ?? "-"}\``);
  if (b) {
    out.push(`- worktime row: **${Math.round((b.cc ?? 0) / 1000)}k cc**, ` +
             `cause \`${b.cause ?? "-"}\`, model \`${b.mdl ?? "-"}\`, class \`${b.cls}\``);
  }
  out.push("");
  const answered = ["step1", "step2", "step3", "step4", "gh"]
    .filter((k) => d[k]?.status === "PRESENT").length;
  out.push(`**Evidence classes: ${answered}/5 PRESENT.** Every class below is`);
  out.push("PRESENT with its evidence or ABSENT with the reason — never blank.");
  out.push("");

  out.push(...sect(1, "Magnitude, API cause, forensic fields (worktime)", d.step1));
  if (d.step1.data) {
    const r = d.step1.data;
    out.push("```json");
    out.push(JSON.stringify(r, null, 2));
    out.push("```");
    out.push("");
    out.push(`- transcript diagnostic: ${d.transcriptCause
      ? `\`${d.transcriptCause.type}\`${d.transcriptCause.missed ? ` / mtok ${d.transcriptCause.missed}` : ""}`
      : "not found (older CC, or transcript rotated)"}`);
    if (d.transcriptCause && r.cause && r.cause !== d.transcriptCause.type) {
      out.push(`- **RECONCILE: ledger says \`${r.cause}\`, transcript says ` +
               `\`${d.transcriptCause.type}\` — instrument disagreement**`);
    }
    out.push("");
  }

  out.push(...sect(2, "Where the prefix diverged (prefix-diff ledger)", d.step2));
  if (d.step2.data) {
    out.push(`Ledger: \`${d.step2.data.path}\``);
    out.push("");
    out.push("| ts | causes | msgs | system | tools |");
    out.push("|---|---|---|---|---|");
    for (const r of d.step2.data.rows) {
      out.push(`| ${r.ts} | ${(r.causes ?? []).join(" \\| ") || "-"} | ${r.msgs ?? "-"} | ` +
               `${r.systemMatch === false ? "DIFFER" : "match"} | ` +
               `${r.toolsMatch === false ? "DIFFER" : "match"} |`);
    }
    out.push("");
  }

  out.push(...sect(3, "The exact mutated bytes (capture pair)", d.step3));
  if (d.step3.data) {
    const s = d.step3.data;
    out.push(`- tap point: \`${s.view}\` — every count above is \`messages.length\` in the`);
    out.push("  raw capture, NOT a census block-unit index and NOT a forwarded-body index.");
    out.push(`- census class: \`${s.censusClass}\``);
    out.push(`- row-4 migration: ${s.migration
      ? `host ${s.migration.host} (${s.migration.verdict}${s.migration.sub ? `/${s.migration.sub}` : ""})`
      : "none in this pair"}`);
    out.push(`- threat matrix: ${s.matrixRow === null
      ? "**no row matches — UNCLASSIFIED, treat as a new class**"
      : `row ${s.matrixRow}${s.matrixOpen ? " (OPEN)" : ""} — ${s.matrixStatus}`}`);
    out.push(`- session mirror: ${s.mirrorDir ? `\`${s.mirrorDir}\`` : "not present"}`);
    out.push("");
  }

  out.push(...sect(4, "Conversation context (transcript pointers)", d.step4));
  if (d.step4.data) {
    out.push(`Transcript: \`${d.step4.data.path}\``);
    out.push("");
    out.push("| line | ts | type | agent | cc | cr | api cause |");
    out.push("|---|---|---|---|---|---|---|");
    for (const h of d.step4.data.hits.slice(0, 40)) {
      out.push(`| ${h.line} | ${h.ts} | ${h.type} | ${h.agent ?? "-"} | ${h.cc ?? "-"} | ` +
               `${h.cr ?? "-"} | ${h.apiCause ?? "-"} |`);
    }
    out.push("");
  }

  out.push(...sect(5, "Upstream issue sweep (`gh search issues`)", d.gh));
  if (d.gh.data) {
    for (const q of d.gh.data) {
      out.push(`- \`${q.term}\` — ${q.rows.length} hit(s)`);
      for (const r of q.rows) {
        out.push(`  - ${r.repository?.nameWithOwner ?? "?"}#${r.number} [${r.state}] ${r.title}`);
        out.push(`    ${r.url}`);
      }
    }
    out.push("");
  }
  return out.join("\n") + "\n";
}

/** Collect every class for one bust. All paths injectable so a test never
 * reads a live ledger. */
export async function collect(bust, tsEpoch, opts = {}) {
  const sid = bust?.s ?? opts.sid ?? null;
  const key = sid ? (opts.key ?? snapshotKeyFor(sid)) : null;
  const step1 = opts.events ? step1Worktime(opts.events, tsEpoch)
                            : (bust ? present(`${iso(bust.t)}  ${bust.cc ?? 0} cc  cause=${bust.cause ?? "-"}  ${bust.cls}`, bust)
                                    : absent("no worktime cold event supplied"));
  const step2 = sid ? step2PrefixDiff(sid, tsEpoch, { ...opts, key })
                    : absent("no session id — cannot locate a prefix-diff ledger");
  const step3 = sid ? await step3Bytes(sid, tsEpoch, opts)
                    : absent("no session id — cannot locate a capture");
  const step4 = sid ? step4Transcript(sid, tsEpoch, opts)
                    : absent("no session id — cannot locate a transcript");
  const gh = opts.gh === false
    ? absent("skipped by --no-gh — the dev-loop sweep did NOT run for this dossier")
    : await ghSweep(sweepTerms(bust, step3), opts);
  const tc = sid && bust ? (opts.transcriptCause !== undefined
    ? opts.transcriptCause : transcriptCause(sid, bust.cc)) : null;
  return { bust, tsEpoch, sid, key, step1, step2, step3, step4, gh, transcriptCause: tc };
}

// Every timestamp in this system is UTC — the ledger's `t` is epoch seconds,
// the capture's `ts` is a Z-suffixed ISO string, and this file's own error
// message below already calls its argument "a UTC timestamp". `Date.parse`
// does not agree: given a stamp with no timezone designator it applies the
// LOCAL zone, silently.
//
// That is not hypothetical, and the path is the documented one. `bust-triage
// --list` prints its rows in UTC with no marker, dev-loop.md tells the reader
// to take a stamp from there to `dossier`, and on this machine (CEST) the
// round trip landed the window two hours off the event. The dossier came back
// 1/5 evidence classes PRESENT, with four "ABSENT" lines each stating a
// plausible, wrong reason — no capture pair, no transcript entry, an empty
// prefix-diff window. Every one of them was true about the wrong 90 seconds.
//
// So: a stamp that names no zone is read as UTC, which is what the caller
// meant and what the rest of the pipeline stores. An explicit zone is
// honoured as given.
export function parseStampUTC(stamp) {
  const s = String(stamp).trim();
  const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(s);
  // A bare date ("2026-08-05") is already UTC per the ISO spec's date-only
  // form, and appending "Z" to it would be invalid — leave it alone.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s);
  return Date.parse(zoned || dateOnly ? s : `${s.replace(" ", "T")}Z`);
}

export async function main(argv) {
  const args = argv.slice(2);
  const outI = args.indexOf("--out");
  const out = outI >= 0 ? args[outI + 1] : null;
  const noGh = args.includes("--no-gh");
  const wI = args.indexOf("--window");
  const window = wI >= 0 ? Number(args[wI + 1]) : WINDOW_SEC;
  const stampArg = args.find((a, i) =>
    !a.startsWith("--") && !(outI >= 0 && i === outI + 1) && !(wI >= 0 && i === wI + 1));

  if (!stampArg && !args.includes("--last")) {
    process.stderr.write(
      "usage: node tools/dossier.mjs <utc-timestamp|--last> [--out <file>] " +
      "[--window <sec>] [--no-gh]\n");
    return 2;
  }

  const events = coldEvents();
  if (!events.length) {
    process.stderr.write(
      "dossier: the worktime cold ledger has no events — nothing to build a dossier " +
      "around. This is a COULD-NOT-COLLECT, not an all-clear.\n");
    return 2;
  }
  let tsEpoch;
  if (args.includes("--last") && !stampArg) {
    tsEpoch = (events.find((e) => e.cls === "bust") ?? events[0]).t;
  } else {
    tsEpoch = /^\d+$/.test(stampArg) ? Number(stampArg) : Math.floor(parseStampUTC(stampArg) / 1000);
    if (!Number.isFinite(tsEpoch)) {
      process.stderr.write(`dossier: cannot parse "${stampArg}" as a UTC timestamp or epoch.\n`);
      return 2;
    }
  }
  const bust = events.reduce((best, e) =>
    Math.abs(e.t - tsEpoch) < Math.abs(best.t - tsEpoch) ? e : best, events[0]);

  const d = await collect(bust, tsEpoch, { events, window, gh: !noGh });
  const path = out ?? join(process.cwd(), `dossier-${iso(tsEpoch).replace(/[:.]/g, "-")}.md`);
  await writeFile(path, renderDossier(d));
  const answered = ["step1", "step2", "step3", "step4", "gh"]
    .filter((k) => d[k].status === "PRESENT").length;
  process.stdout.write(`dossier: ${path}\n  ${answered}/5 evidence classes PRESENT` +
    (answered < 5 ? " — the rest are marked ABSENT with their reason.\n" : "\n"));
  return 0;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  process.exit(await main(process.argv));
}
