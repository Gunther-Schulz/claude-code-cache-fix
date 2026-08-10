#!/usr/bin/env node
// gate-live — run the replay gate over the LIVE captures, on a schedule.
//
// Why this exists, and it is not "extra coverage".
//
// Two defects surfaced in the gate itself on 2026-07-28, and both were
// invisible for the same structural reason: the gate had never been pointed at
// a production-shaped input.
//
//   1. it read the capture with readFile(..., "utf-8"), so a 955 MB capture
//      threw `RangeError: Invalid string length` before a single check ran;
//   2. it retained every request's full message history, peaking at 3.2 GB —
//      within sight of V8's default ceiling.
//
// Neither could ever be caught by `npm test`, and not by accident. The
// committed corpus is produced by harvest.mjs, which selects pairs by
// STRUCTURAL NOVELTY and sanitises them: small by construction, and
// deliberately so. A fixture corpus curated for structural novelty cannot
// contain a scale-shaped input — the blind spot is designed in. So scale,
// volume and ordering-at-scale are exactly the classes that stay green in CI
// forever while being broken in practice.
//
// The live captures are the only production-shaped inputs available, they
// exist on disk already, and something is already walking them twice a day
// (cache-fix-harvest). This runs the real gate against them and writes a
// verdict a checker can read, so "the gate cannot run" and "the gate found
// something in live traffic" both surface within a day instead of on the next
// occasion someone happens to try it by hand.
//
// One child process per capture, deliberately: memory stays bounded to the
// largest single capture rather than their sum, and a crash on one file is
// recorded rather than ending the sweep. Whatever kills one capture is
// precisely what this is here to report.

import { spawn, spawnSync } from "node:child_process";
import { readdir, stat, writeFile, appendFile, mkdir, readFile, open } from "node:fs/promises";
import { join, dirname } from "node:path";
import { homedir, hostname } from "node:os";
import { dataPath, statePath, legacyReadPath } from "../proxy/xdg-dirs.mjs";
import { fileURLToPath } from "node:url";

import { sourceFingerprint, PROXY_ROOT } from "../proxy/source-fingerprint.mjs";
// The scrub is IMPORTED, never re-derived. A second sanitizer is a second
// definition of what a fixture may carry, and the one that drifts is always
// the copy — the same reason every checker in this tree imports its identity
// rather than restating it (docs/dev-loop.md, "Never hand-roll identity").
import { scrubMessage, sidToken } from "./harvest.mjs";
import { staleRunRoots } from "./tmpdir.mjs";
import { localSuffix } from "./local-stamp.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPLAY = join(__dirname, "replay.mjs");
const CENSUS = join(__dirname, "reminder-migration-census.mjs");
// Captures and snapshots are READ here, so they consult the legacy
// `~/.claude/` location and warn loudly if that is where the data still is.
// Status and fire ledger are WRITTEN here, so they never fall back — a writer
// that fell back would keep appending to the old file while readers preferred
// the new one, which is two stores diverging.
const DEFAULT_CAPTURES = process.env.CACHE_FIX_CAPTURE_DIR
  || legacyReadPath(dataPath("captures"), "cache-fix-captures");
export const DEFAULT_STATUS = process.env.CACHE_FIX_GATE_STATUS || statePath("gate-status.json");
const DEFAULT_FIRE_LEDGER = process.env.CACHE_FIX_FIRE_LEDGER || statePath("fire-ledger.jsonl");
const DEFAULT_SNAPSHOTS = process.env.CACHE_FIX_SNAPSHOT_DIR
  || legacyReadPath(statePath("snapshots"), "cache-fix-snapshots");
const DEFAULT_TRANSCRIPTS = join(homedir(), ".claude", "projects");

// --- Production gate set ---
//
// The gate must replay the configuration that is actually SERVING, not the
// extensions' defaults. Learned the expensive way on 2026-07-28: replay
// inherits nothing from the systemd unit, and `CACHE_FIX_TOOL_REWRITE`
// defaults OFF while the unit sets it ON. So every gate run that day — this
// sweep included — exercised a pipeline nobody runs, and reported 0
// violations. Re-run with the unit's own gates, the same corpus produced 2
// stability violations attributed to deferred-tool-rewrite. A green verdict
// over the wrong configuration is worth nothing.
//
// The unit is the declaration of what production is, so it is the source
// here — read live rather than copied, because a copy is a second source that
// drifts. Two are overridden OFF deliberately: REQUEST_CAPTURE would have the
// replay write captures of the captures, and SESSION_MIRROR would write
// mirrors; neither transforms the request, so excluding them costs no
// coverage, and both are named in the output so nobody reads them as tested.
const ARTIFACT_ONLY = new Set(["CACHE_FIX_REQUEST_CAPTURE", "CACHE_FIX_SESSION_MIRROR"]);

export function parseUnitEnvironment(showOutput) {
  // `systemctl show -p Environment` yields one line: Environment=A=1 B=2
  const line = (showOutput || "").trim();
  const body = line.startsWith("Environment=") ? line.slice("Environment=".length) : line;
  const out = [];
  for (const tok of body.split(/\s+/)) {
    if (!tok.includes("=")) continue;
    const k = tok.slice(0, tok.indexOf("="));
    if (!k.startsWith("CACHE_FIX_")) continue;
    if (ARTIFACT_ONLY.has(k)) continue;
    out.push(tok);
  }
  return out;
}

function productionEnv() {
  const res = spawnSync(
    "systemctl",
    ["--user", "show", "cache-fix-proxy", "-p", "Environment", "--value"],
    { encoding: "utf-8" },
  );
  if (res.status !== 0 || !res.stdout) return { env: [], source: "unavailable" };
  const env = parseUnitEnvironment(res.stdout);
  return { env, source: env.length ? "cache-fix-proxy.service" : "empty" };
}

// The heap cap on replay children is a CHECK, not a tuning knob. A replay
// that truly streams needs memory only for its compact per-request retention
// (~15% of capture bytes; 0.61 GB measured on the 1.5 GB capture) — nowhere
// near this cap even at the 8 GB rotation ceiling (~1.2 GB projected). A
// replay that silently regressed into retaining its input needs a multiple
// of the file size and dies against the cap, turning the regression into an
// error row that fails the sweep the same day instead of an OOM years later.
// Proven red on the real defect: the pre-8b7ed9e replay OOMs under this cap
// in 5 s on the 1.5 GB capture; the fixed one finishes with 3× headroom.
export const CHILD_HEAP_CAP_MB = 2048;

export function replayArgs(file, env) {
  // --census rides on every sweep: the row-4 annotations (edit positions,
  // anchorDelta, tools deltas, mitigation pricing) were built as census-only
  // and a sweep without them re-derives nothing daily — the classifications
  // exist precisely so the next instance is recognized, not re-derived.
  // --pin-rows rides every sweep for the reason --census does, one step
  // further along: the classifications exist so the next instance is
  // recognized rather than re-derived, and the BYTES exist so the next
  // instance can still be re-derived at all after the capture rotates.
  const args = [`--max-old-space-size=${CHILD_HEAP_CAP_MB}`, REPLAY, file, "--json", "--census", "--pin-rows"];
  for (const kv of env) args.push("--env", kv);
  return args;
}

// The byte-gate rides the same sweep, as a second child per capture.
//
// Two answers only this delivers daily. The migration byte-test is the gate
// "every NORMALIZATION design must pass before it ships" (dev-loop.md) and was
// run by hand, at design time, over whatever corpus existed that day — while
// its own COVERAGE was the thing that failed silently (it skipped the four
// largest captures for weeks). And prune classification: an INTERIOR-DIVERGENT
// prune re-bills settled history, ranges from 2 messages to a whole context,
// and had no daily reader at all — it took a throwaway drop-scan probe to see
// one. Both are cheap next to the replay (20 s over the whole corpus against
// the replay's minutes), and neither has a home outside this sweep.
export function censusArgs(file) {
  return [`--max-old-space-size=${CHILD_HEAP_CAP_MB}`, CENSUS, file, "--json"];
}

// The census exits 1 when it could not read something, so the exit CODE is not
// the signal here — the JSON is. A run that produced no JSON could not answer
// at all, which is recorded as an error rather than as zero findings (the
// three-answer rule this tool exists to keep).
export function summariseCensus(res) {
  if (res.code === -1) return { error: res.err };
  let parsed = null;
  try {
    parsed = JSON.parse(res.out);
  } catch {
    return { error: res.err.trim().split("\n").slice(-4).join("\n") || "no JSON output" };
  }
  return {
    pairs: parsed.pairs ?? 0,
    unreadable: (parsed.unreadable ?? []).length,
    tally: parsed.tally ?? null,
    extendedSub: parsed.extendedSub ?? null,
    prunes: parsed.prunes ?? null,
    // dup-census gap 2 (BACKLOG "wire `duplicates` into the daily gate"): the
    // census's duplicate-request rollup (reminder-migration-census.mjs
    // summariseDuplicates, 4185fb4) rides on every sweep already via --json,
    // but was whitelisted out of this summary — the daily status file never
    // carried it. `null` when the census run predates the field or never
    // produced one, same convention as tally/extendedSub/prunes above.
    duplicates: parsed.duplicates ?? null,
  };
}

// A capture being written to right now is not a defect and not a skip: the
// gate reads a prefix of it, which is a valid corpus. Recorded so a reader can
// tell a short run from a truncated one.
function runChild(args) {
  return new Promise((resolve) => {
    const child = spawn("node", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => resolve({ code: -1, out: "", err: String(e?.message ?? e) }));
    child.on("close", (code) => resolve({ code, out, err }));
  });
}

const runReplay = (file, env) => runChild(replayArgs(file, env));
const runCensus = (file) => runChild(censusArgs(file));

// Per-gate finding rows are bounded per gate per capture: 200 is above every
// count observed (the largest so far is a 38-row conservation gate-red), and
// the bound exists so one pathological capture cannot make the status file
// the next thing that breaks. Truncating SILENTLY would recreate this item's
// own defect one level up — a short list reads as a complete one — so the
// pre-truncation total is written beside the array, and the marker's
// PRESENCE is what means rows were dropped: at or below the cap there is no
// key at all.
const ROW_CAP = 200;

function persistRows(row, field, source) {
  // Three answers, not two. A field the child never emitted (an older replay
  // schema, a gate that did not run) measured NOTHING and is `null`; an empty
  // array is a measured zero. `[]` for an absent field is an absence of
  // evidence wearing a verdict's clothes — the failure this file's own header
  // is about.
  if (!Array.isArray(source)) {
    row[field] = null;
    return;
  }
  row[field] = source.slice(0, ROW_CAP);
  if (source.length > ROW_CAP) row[`${field}Truncated`] = source.length;
}

// --- Row evidence pins ---
//
// The sweep is a RECURRING producer of findings, so it has no closing moment
// at which a human snapshots what proves them (docs/dev-loop.md, closing gate
// question 2): it either writes the evidence out at the moment it finds a row
// or the evidence is gone. Captures rotate oldest-mtime-first on a quadratic
// clock and eviction takes the QUIET session first — a session goes quiet
// exactly when it stops being traffic and starts being evidence. Measured
// 2026-08-06: a row measured at 09:59Z had its capture gone by ~19:25Z, which
// took with it the known positive a booked item named as its red-first
// arrangement, i.e. the loss stopped being retrospective and started blocking
// work.
//
// replay.mjs produces the bytes (its `--pin-rows` pass, with its own
// cross-pass check that they belong to the row); this side does three things
// and none of them is interpretation: it SCRUBS through harvest's own
// sanitizer, it REJECTS a pin whose bytes the child could not match to its
// row, and it WRITES — never commits. Committing is a human act here exactly
// as it is for harvest's fixtures and its ledger.
const DEFAULT_ROWPINS = join(__dirname, "..", "test", "fixtures", "harvested", "rowpins");

/** The pin's stable identity: capture key, request, index, INDEX SPACE, family.
 *
 * `sidToken` (harvest's, imported) is what keeps a live capture key out of a
 * tracked filename — the class the push scan blocks and the authoring rule in
 * docs/dev-loop.md states. Filenames are as public as content.
 *
 * The SPACE is in the name because without it the identity collides, and an
 * identity computed more cheaply than the thing it identifies always does.
 * Measured 2026-08-07 on a 255 MB capture: the conservation gate reports a
 * `lost` row at raw index i and an `invented` row at forwarded index i for
 * the same request — two different messages, one filename. 10 of that
 * capture's 21 pins collided, and only the conflict guard (which refuses to
 * overwrite) kept the first ten from being silently replaced by the second
 * ten.
 */
export function rowPinName(keyToken, pin) {
  return `rowpin-${keyToken}-${pin.n}-${pin.index}-${pin.indexSpace}-${pin.family}.json`;
}

// The pin carries its FULL instant, because that instant is the join to the
// bust ledger — the one identifier a reader needs to ask "which event was
// this". (key token, n, prevN, index) identifies the pair inside its capture
// exactly and says nothing about which bust it belongs to.
//
// The `live-timestamp` absence class is exempted for this directory alone,
// class-scoped, the same standing LEDGER-*.json's `lastHarvest` fields have:
// the timestamps ARE the artifact's content. It exposes nothing the repo does
// not already publish — the threat matrix quotes live instants in tracked
// prose on every event walk.
//
// CORRECTED 2026-08-07, hours after this shipped at DAY precision with the
// residual "named rather than fixed by softening the class". Naming it was
// right and stopping there was not: the exemption is not a softening, and the
// session that wrote the residual then recommended leaving it "until a join
// actually needs the hour" — a deferral costing exactly what doing it costs,
// which is the standing rule in docs/dev-loop.md this instance produced.
const instantOf = (ts) => (typeof ts === "string" && /^\d{4}-\d{2}-\d{2}T/.test(ts) ? ts : null);

/** Everything a pin carries that is an identifier or an instant, replaced.
 *
 * Deliberately NOT a generic deep walk: a walker that hunts for "things that
 * look like identifiers" re-derives the scrub, and a field added upstream
 * would ride through it silently. The fields are named, and an unrecognised
 * one keeps its value — which the absence scan then has an opinion about.
 */
function scrubSide(side) {
  if (!side || typeof side !== "object") return side;
  const { ts, key, id, forwarded, raw, ...rest } = side;
  return {
    ...rest,
    keyToken: key ? sidToken(key) : null,
    // The capture RECORD id, tokenized for the same reason the key is: it is
    // a live identifier, and its only job here is to say "these two sides came
    // from different records".
    idToken: id ? sidToken(id) : null,
    forwarded: forwarded === null || forwarded === undefined ? null : scrubMessage(forwarded),
    raw: raw === null || raw === undefined ? null : scrubMessage(raw),
  };
}

export function buildRowPinDocument(pin) {
  const { ts, key, ...row } = pin.row ?? {};
  // NOT `row.key` alone. Only the pair families (stability, its exemptions,
  // relocDeparture) carry a capture key on the row; the per-request families
  // — conservation, its exemptions, sequence, order — never have, so reading
  // the key off the row skipped every one of their pins while reporting them
  // as built. Measured 2026-08-07 on a 255 MB capture: 21 pins asked, 21
  // built, 0 written. The side carries the key the pin pass read off the
  // capture record itself, which is the same value and exists for every
  // family.
  const rawKey = key ?? pin.sides?.cur?.key ?? pin.sides?.prev?.key ?? null;
  const keyToken = rawKey ? sidToken(rawKey) : null;
  const sides = {};
  for (const [label, side] of Object.entries(pin.sides ?? {})) sides[label] = scrubSide(side);
  return {
    schema: "rowpin/1",
    family: pin.family,
    key: keyToken,
    n: pin.n,
    prevN: pin.prevN,
    index: pin.index,
    // Which array the index indexes, and whose. Left implicit, these two are
    // the coordinate-space error this repo has paid for twice (raw 370
    // forwards as 360).
    indexSpace: pin.indexSpace,
    indexOwner: pin.indexOwner,
    instantUtc: instantOf(ts) ?? instantOf(pin.sides?.cur?.ts) ?? null,
    // The row VERBATIM apart from its identifiers, because a summary of a row
    // cannot answer the question the row was kept for.
    row: keyToken ? { ...row, keyToken } : row,
    sides,
    checks: pin.checks,
    // What a reader must know to trust or distrust this artifact, stated in
    // the artifact: the bytes are a second pipeline run's, checked against the
    // first run's per-message hashes, and the text is tokenized per "\n\n"
    // segment — so CONTENT predicates (a literal-prefix test) can never fire
    // on it, while structural ones (indices, lengths, equality, presence)
    // survive by construction. docs/dev-loop.md, "The scrub destroys CONTENT
    // PREDICATES". The presence answer this pin needs was therefore computed
    // on the real bytes, before the scrub, and is recorded as a value.
    provenance: {
      producer: "tools/gate-live.mjs (replay.mjs --pin-rows)",
      scrub: "tools/harvest.mjs scrubMessage — per-\"\\n\\n\"-segment hash tokens",
      bytesFrom: "a second pipeline pass over the same capture, hash-checked against the first",
    },
  };
}

/** Write the pins a sweep produced. Idempotent, rejecting, never committing.
 *
 * Four outcomes, counted apart rather than folded into "written": a pin whose
 * bytes the child could not match to its row is REJECTED (a control that
 * cannot fail is not a control); one already on disk with identical content is
 * UNCHANGED (the watermark property harvest already has); one on disk with
 * DIFFERENT content is a CONFLICT and is not overwritten, because overwriting
 * would destroy the earlier evidence to make room for a claim about the same
 * row; everything else is written.
 */
export async function writeRowPins(pins, dir) {
  const out = { written: 0, unchanged: 0, rejected: 0, unverifiable: 0, conflicts: [], skipped: [], files: [] };
  if (!Array.isArray(pins) || pins.length === 0) return out;
  await mkdir(dir, { recursive: true });
  for (const pin of pins) {
    if (pin?.checks?.bytesMatchRow === false) {
      out.rejected++;
      continue;
    }
    // Unverifiable is not rejected: the pin says so in its own `checks`, and
    // dropping it would lose the only copy of bytes that are about to rotate.
    if (pin?.checks?.bytesMatchRow === null) out.unverifiable++;
    const doc = buildRowPinDocument(pin);
    if (!doc.key) {
      out.skipped.push({ family: pin.family, n: pin.n, reason: "row carries no capture key to name the pin by" });
      continue;
    }
    const name = rowPinName(doc.key, pin);
    const path = join(dir, name);
    const body = JSON.stringify(doc, null, 2) + "\n";
    let existing = null;
    try {
      existing = await readFile(path, "utf-8");
    } catch { /* not pinned yet */ }
    if (existing !== null) {
      if (existing === body) out.unchanged++;
      else out.conflicts.push(name);
      continue;
    }
    await writeFile(path, body);
    out.written++;
    out.files.push(name);
  }
  return out;
}

function summarise(file, bytes, res) {
  const row = { file, bytes, exit: res.code };
  if (res.code === -1) {
    row.error = res.err;
    return row;
  }
  let parsed = null;
  try {
    parsed = JSON.parse(res.out);
  } catch {
    // The gate died before producing a verdict — a RangeError, an OOM, a
    // throw. This is the case the whole job exists for, so it is recorded
    // verbatim rather than smoothed into a count of zero.
    row.error = (res.err.trim().split("\n").slice(-4).join("\n") || "no JSON output");
    return row;
  }
  row.requests = parsed.report?.length ?? 0;
  row.stability = parsed.violations?.length ?? 0;
  // Exempted divergences are ABSENT from `violations` by design; without
  // this field a status reader cannot tell "no divergence" from
  // "divergence declared exempt" (reset-wipes exemption).
  row.stabilityExempt = parsed.exemptions?.length ?? 0;
  row.safety = parsed.safety?.length ?? 0;
  // Content conservation (the fifth gate): bytes CC sent that the pipeline
  // neither forwarded nor accounted for. Ranked with safety rather than with
  // stability — a suppression whose copy is not on the wire is a truncated
  // conversation, not an expensive one. `conservationResidue` rides along as
  // the population the gate deliberately does NOT examine (assistant-role
  // blocks), so a reader of the status file sees the boundary instead of
  // inferring that a clean row covered everything.
  row.conservation = parsed.conservation?.length ?? 0;
  row.conservationResidue = parsed.conservationResidue ?? 0;
  row.sequence = parsed.sequence?.length ?? 0;
  row.order = parsed.orderViolations?.length ?? 0;
  // Absorption misses: a mitigation that RAN and did not ABSORB. Carried,
  // never failed — see `rowIsClean` for why, and replay.mjs's
  // findAbsorptionMisses for what the numbers mean. Two counts, because they
  // answer different questions: how many, and how many were OURS (the
  // forwarded pair diverged at a slot we had just substituted while CC's own
  // input was identical there). A sweep that reported only the total would
  // make the attribution invisible again, which is the thing this check
  // exists to stop.
  row.absorptionMisses = parsed.absorptionMisses?.length ?? 0;
  row.absorptionMissesOurs = (parsed.absorptionMisses ?? []).filter((m) => m.ours).length;
  // The rows themselves, not just their counts — the daily sweep used to
  // compute these and discard them, so re-classifying a day's captures meant
  // re-reading ~8 GB of live capture twice. Tiny and naturally bounded by
  // absorption count, so no cap or truncation.
  //
  // Through the same recorder as the six fields below, for the three-answer
  // reason they were built with: this line used to read `?? []`, which turns
  // "the child never emitted this field" into "the child measured zero" —
  // absence of evidence wearing a verdict's clothes, in the one row a reader
  // consults to decide whether a class is live.
  persistRows(row, "absorptionMissRows", parsed.absorptionMisses);
  // Every OTHER per-row gate, same reason generalised (BACKLOG "the daily
  // sweep persists ROWS, not just counts, for every gate that produces
  // them"). The sweep computed these lists and discarded all but their
  // counts, and a count does not survive the question anyone actually asks
  // of it: `stability: 1` in the status file made one violation's real cost
  // a hand-derivation from a 281 MB capture, hours after the sweep had the
  // answer in memory. The window is the constraint — captures rotate on a
  // quadratic clock, eviction is oldest-mtime-first, and a session goes
  // quiet exactly when it stops being traffic and starts being evidence —
  // so the recurring producer writes out what proves its findings AT THE
  // MOMENT it finds them, or the proof is gone before a reader arrives.
  //
  // Verbatim from the child's parsed JSON, no reshaping: the sweep is a
  // recorder here, not an interpreter, and a summary of a row cannot answer
  // the question the row was kept for.
  for (const [field, source] of [
    ["stabilityRows", parsed.violations],
    ["stabilityExemptRows", parsed.exemptions],
    ["conservationRows", parsed.conservation],
    ["conservationExemptRows", parsed.conservationExemptions],
    ["sequenceRows", parsed.sequence],
    ["orderRows", parsed.orderViolations],
    // The departure census (threat-matrix row 25) is a REPORT, not a gate, so
    // its rows are the only record it leaves — and the sweep computed them for
    // every capture and dropped them on the floor, which is this item's own
    // defect one layer newer. The rate they answer ("how often does a
    // relocated block depart, and how often with the prefix above messages
    // still INTACT") is a corpus question by construction: no single capture
    // settles it, and the captures that would settle it rotate away first.
    ["relocDepartureRows", parsed.relocDepartures],
  ]) persistRows(row, field, source);
  // The pin BODIES ride out of this function on the row and are removed by
  // main() the moment they have been written — they are message bytes, and
  // the status file is neither their home nor scrubbed. What stays on the row
  // is the count summary. Named `pinsPending` rather than `pins` so a reader
  // of the persisted row cannot mistake a leftover for a record.
  row.pinsPending = Array.isArray(parsed.pins) ? parsed.pins : null;
  row.pinSummary = parsed.pinSummary ?? null;
  row.unparseable = (parsed.report ?? []).filter((r) => r.error).length;
  // Replay fidelity: whether this run reproduced the bytes the proxy really
  // forwarded. A mismatch means the invariants above were measured on a
  // system that never ran, so it is recorded per capture rather than left in
  // stdout nobody reads. `comparable: 0` is an honest "proves nothing", NOT a
  // pass — the distinction the row must preserve.
  // A row that compared NOTHING proves nothing: zero same-conversation
  // pairs (empty bodies, single-request captures) ran zero cross-request
  // checks. Named rather than silently counted into the clean total —
  // "9 captures sauber" with three unproving rows was a padded verdict.
  row.pairs = parsed.census?.pairs ?? null;
  row.provesNothing = row.pairs === 0;
  // The fire ledger's RAW column for this capture (FIRE_CLASSES above). Kept
  // on the row rather than recomputed at sweep level because the replay JSON
  // it is derived from is not retained past this function.
  row.fireRaw = summariseFireRaw(parsed);
  row.fireBytes = summariseFireBytes(parsed);
  const f = parsed.fidelity;
  if (f) {
    row.fidelityComparable = f.comparable ?? 0;
    row.fidelityMatched = f.matched ?? 0;
    row.fidelityMismatch = (f.mismatches ?? []).length;
    // Informational pair: on busy sessions every request is mutated, so the
    // comparable population stays 0 forever and this is the only fidelity
    // signal recorded. Never part of rowIsClean — a mutated mismatch is
    // legitimate state divergence.
    row.fidelityMutatedComparable = f.mutatedComparable ?? 0;
    row.fidelityMutatedMatched = f.mutatedMatched ?? 0;
  }
  // Threat-matrix row 6's consumer path (BACKLOG "Row 6's isolating query
  // is built and unread (Q3)"): findToolsDeltas already classifies every
  // tools[]-changing pair, --census rides every sweep (replayArgs above),
  // but nothing before this read it — a daily answer sat unread in stdout.
  // Compact counts only (no bodies): row 6 asks specifically for the
  // TOOLS-ONLY case (tools moved, message history did not — the isolating
  // pair) and whether what we FORWARDED held stable across it.
  // Consumers: threat-matrix row 6 and the operator reading gate status.
  if (Array.isArray(parsed.toolsDeltas)) {
    const deltas = parsed.toolsDeltas;
    const forwardedStable = deltas.filter((d) => d.forwardedStable).length;
    // heldStable narrows forwardedStable's whole-array claim to the
    // SHARED-name subset of the pair — the guarantee deferred-tool-rewrite
    // actually makes (BACKLOG "forwardedStable was a census framing gap": a
    // genuine new-tool announcement always moves the whole-array signature,
    // so forwardedStable=false on those pairs is expected, not a leak).
    const heldStable = deltas.filter((d) => d.heldStable).length;
    row.toolsDeltas = {
      count: deltas.length,
      toolsOnly: deltas.filter((d) => d.toolsOnly).length,
      forwardedStable,
      leaked: deltas.length - forwardedStable,
      heldStable,
      heldUnstable: deltas.length - heldStable,
    };
  }
  return row;
}

const rowIsClean = (r) =>
  !r.error &&
  r.exit === 0 &&
  !r.stability &&
  !r.safety &&
  !r.conservation &&
  !r.sequence &&
  !r.order &&
  // A fidelity mismatch invalidates every other number in the row.
  !r.fidelityMismatch &&
  // A capture the byte-gate could not READ is a could-not-verify, and this
  // sweep is where that has to bite: the whole defect was a normalization gate
  // reporting clean over a corpus it never read. Findings the byte-gate DOES
  // make (MISMATCH, interior prunes) are carried, not failed — they are
  // findings about Claude Code's traffic, not about this pipeline, and a check
  // that fires on a non-defect trains its reader to ignore red.
  !r.byteGate?.error &&
  !r.byteGate?.unreadable;

/** Sweep-wide absorption-miss totals, alongside the byte-gate rollup.
 *
 * Deliberately NOT part of `rowIsClean`. The check is new and its corpus-wide
 * rate is unmeasured; making it fail a sweep before anyone knows how often it
 * fires on legitimate work is how a guard trains its reader to discount red —
 * this repo's own recurring defect, and the reason the byte-gate's own
 * findings are carried rather than failed two functions up. Promote it once
 * the rate is known and the classes are understood.
 */
export function summariseAbsorption(rows) {
  let total = 0;
  let ours = 0;
  let captures = 0;
  // The third count, and it is what keeps the other two honest: how many of
  // the misses were a moved cache_control BREAKPOINT rather than a stale
  // message (replay.mjs's `cacheControlOnly`). Measured 2026-08-05, first
  // corpus-wide classification: 26 of 34. A summary that reported only
  // total/ours would keep describing a population three quarters of which
  // re-bills nothing — and this check's whole reason for being a REPORT is
  // that its rate was unknown, so the rate has to be reported honestly before
  // anyone decides whether it can block.
  //
  // Counted from the persisted ROWS, not from a per-capture tally, so a row
  // that predates the field contributes to neither count — `null` is not
  // `false`, and a sweep run against an older replay must not read as "none of
  // them were breakpoint moves".
  let cacheControlOnly = 0;
  let cacheControlUnknown = 0;
  for (const r of rows) {
    const n = r.absorptionMisses ?? 0;
    if (n > 0) captures++;
    total += n;
    ours += r.absorptionMissesOurs ?? 0;
    for (const row of r.absorptionMissRows ?? []) {
      if (row?.cacheControlOnly === true) cacheControlOnly++;
      else if (row?.cacheControlOnly !== false) cacheControlUnknown++;
    }
  }
  return { total, ours, captures, cacheControlOnly, cacheControlUnknown };
}

/** Sweep-wide row-pin totals, for the same reason the absorption rollup
 * exists: the per-capture rows carry the detail, and the sweep-level number
 * is what a reader (or a doctor verdict) checks. `captures` counts the rows
 * that had a pin writer run at all — a row whose child emitted no pins array
 * contributes to NEITHER a zero nor a total, because `null` is not `0`.
 */
export function reduceRowPins(rows) {
  const acc = { captures: 0, written: 0, unchanged: 0, rejected: 0, unverifiable: 0, conflicts: 0, errors: 0 };
  for (const r of rows) {
    const p = r.rowPins;
    if (!p) continue;
    acc.captures++;
    if (p.error) { acc.errors++; continue; }
    acc.written += p.written ?? 0;
    acc.unchanged += p.unchanged ?? 0;
    acc.rejected += p.rejected ?? 0;
    acc.unverifiable += p.unverifiable ?? 0;
    acc.conflicts += (p.conflicts ?? []).length;
  }
  return acc;
}

/** Sweep-wide byte-gate totals: what `main` writes into the daily status
 * file's `byteGate` field, extracted so the rollup is testable on its own
 * (a synthetic array of rows) rather than only through a live sweep.
 *
 * Duplicate-request rollup (dup-census gap 2, BACKLOG "wire `duplicates`
 * into the daily gate"): additive across captures like tally/prunes above,
 * EXCEPT maxStreak, which is the longest run SEEN corpus-wide, not a sum of
 * per-capture maxima — summing it would inflate the number every capture
 * touches. `doubleBilledStreaks` is the alarm column, not `billedStreaks`:
 * a retry that finally succeeds bills exactly one of its sends, which is
 * correct behaviour (reminder-migration-census.mjs summariseDuplicates);
 * two-or-more outcome records inside one streak is the CC#78420 shape.
 */
export function reduceByteGate(rows) {
  return rows.reduce((acc, r) => {
    const g = r.byteGate;
    if (!g) return acc;
    if (g.error) { acc.errors++; return acc; }
    acc.unreadable += g.unreadable ?? 0;
    for (const k of ["EXACT", "EXTENDED", "DROPPED", "MISMATCH"]) acc.tally[k] += g.tally?.[k] ?? 0;
    acc.merged += g.extendedSub?.["MERGED-STANDALONE"] ?? 0;
    acc.newText += g.extendedSub?.["NEW-TEXT"] ?? 0;
    for (const k of ["pure", "interior", "unanchored"]) acc.prunes[k] += g.prunes?.[k] ?? 0;
    if (g.duplicates) {
      const d = g.duplicates;
      acc.duplicates.pairs += d.pairs ?? 0;
      acc.duplicates.streaks += d.streaks ?? 0;
      acc.duplicates.maxStreak = Math.max(acc.duplicates.maxStreak, d.maxStreak ?? 0);
      acc.duplicates.requests += d.requests ?? 0;
      acc.duplicates.billedRequests += d.billedRequests ?? 0;
      acc.duplicates.billedStreaks += d.billedStreaks ?? 0;
      acc.duplicates.doubleBilledStreaks += d.doubleBilledStreaks ?? 0;
      acc.duplicates.membersWithoutId += d.membersWithoutId ?? 0;
    }
    return acc;
  }, { errors: 0, unreadable: 0, merged: 0, newText: 0,
       tally: { EXACT: 0, EXTENDED: 0, DROPPED: 0, MISMATCH: 0 },
       prunes: { pure: 0, interior: 0, unanchored: 0 },
       duplicates: { pairs: 0, streaks: 0, maxStreak: 0, requests: 0,
                      billedRequests: 0, billedStreaks: 0, doubleBilledStreaks: 0,
                      membersWithoutId: 0 } });
}

/** One line per capture: what the byte-gate measured, or why it could not. */
export function describeByteGate(g) {
  if (!g) return "not run";
  if (g.error) return `COULD NOT RUN — ${g.error.split("\n")[0]}`;
  if (g.unreadable) return `COULD NOT READ ${g.unreadable} capture(s) — verdict does not cover them`;
  const t = g.tally ?? {};
  const p = g.prunes ?? {};
  const merged = g.extendedSub?.["MERGED-STANDALONE"] ?? 0;
  return (
    `${t.EXACT ?? 0} EXACT / ${t.EXTENDED ?? 0} EXTENDED (${merged} merged) / ` +
    `${t.DROPPED ?? 0} DROPPED / ${t.MISMATCH ?? 0} MISMATCH; ` +
    `prunes ${p.pure ?? 0} pure / ${p.interior ?? 0} interior` +
    (p.unanchored ? ` / ${p.unanchored} unanchored` : "")
  );
}

// --- Mitigation fire ledger (BACKLOG "which extensions still earn their keep") ---
//
// The status file keeps only the LATEST run, so per-class fire evidence
// existed with no time series and no retirement consumer. This appends one
// compact line per sweep, and its shape is the whole point: TWO columns per
// class.
//
//   RAW      what CC DID — measured off the captured request bytes, so it
//            keeps counting with every gate off. This is the column a
//            retirement rests on ("0 raw occurrences across N sweeps
//            spanning cc-versions >= X"), and the column that re-opens one.
//   ABSORBED what a mitigation DID about it — counted from the extensions'
//            own event logs.
//
// Never the same denominator, and the line says so rather than implying it:
// RAW covers the whole capture corpus this sweep replayed (a rolling
// retention set), ABSORBED covers `windowFrom`..`ts` — the interval since
// the previous ledger line, so the absorbed series is additive and
// non-overlapping across runs.
//
// Nor the same UNIT, which the first real line makes obvious: 166 raw
// suppressions against 14,920 absorbed, same sweep. RAW counts distinct
// occurrences in adjacent-request pairs; ABSORBED counts APPLICATIONS, and
// a suppression re-applies on every later request in the conversation by
// design ("it is re-detected and re-suppressed every time",
// insertion-normalization.mjs:1496). So a ratio between the columns means
// nothing. Each column is its own time series, read down the ledger, and
// the retirement question is asked of RAW alone.
//
// The line carries two more objects on the same 7-class key set —
// `savedBytes` and `leakedBytes`, the cost half of the same question. They
// are BYTES, so neither is comparable to either count column; the unit rules
// among all four are spelled out at summariseFireBytes below.
//
// `null` is not 0 anywhere here. A class whose source is absent (no census
// measure, gate off, unreadable log) records null; 0 means the source was
// read and nothing fired. Collapsing those two is exactly how a mitigation
// gets retired on evidence that was never collected.
export const FIRE_CLASSES = [
  "suppressions",
  "relocations",
  "toolAdditionAnnouncements",
  "oscillationAbsorptions",
  "guardRestores",
  "blockMigrations",
  "duplicates",
];

/** RAW, per capture, from the replay child's --census JSON.
 *
 * Each mapping is the census measure of the CC BEHAVIOR the class exists to
 * absorb, never of our own activity:
 *   suppressions   blockMigrations rows moving `inline->standalone` — the
 *                  reminder-swap shape #76606 suppression was built for
 *                  (insertion-normalization.mjs:639).
 *   relocations    findMitigationGaps rows — one per MITIGABLE pair
 *                  (splice/insert-mid, append-after-change, reorder-only:
 *                  replay.mjs:945), the mid-history insertion class.
 *   toolAddition…  tools[] deltas whose incoming tool COUNT grew.
 *   oscillation…   blockMigrations rows markFlaps tagged `.flap` — the
 *                  DEFINITION of an oscillation (replay.mjs:1434).
 *   blockMigrations  every migration row, both directions.
 *   guardRestores  null — an output-guard restore answers OUR pipeline's
 *                  invalid output, not anything CC did; no census measures
 *                  it, and a proxy measure would be invented. (gap)
 *   duplicates     not here: the duplicate scan is the census child's, so
 *                  it is folded in at sweep level (reduceFireRaw).
 */
export function summariseFireRaw(parsed) {
  const bm = Array.isArray(parsed?.blockMigrations) ? parsed.blockMigrations : null;
  const td = Array.isArray(parsed?.toolsDeltas) ? parsed.toolsDeltas : null;
  const mit = Array.isArray(parsed?.mitigation) ? parsed.mitigation : null;
  return {
    suppressions: bm ? bm.filter((b) => b.direction === "inline->standalone").length : null,
    relocations: mit ? mit.length : null,
    toolAdditionAnnouncements: td ? td.filter(toolsGrew).length : null,
    oscillationAbsorptions: bm ? bm.filter((b) => b.flap).length : null,
    guardRestores: null,
    blockMigrations: bm ? bm.length : null,
    duplicates: null,
  };
}

// findToolsDeltas renders the pair's incoming tool counts as "p->c"
// (replay.mjs:780). An unparseable field reads as "not an addition" rather
// than throwing — the row still counts in blockMigrations/relocations.
function toolsGrew(d) {
  const m = /^(\d+)->(\d+)$/.exec(d?.count ?? "");
  return m ? Number(m[2]) > Number(m[1]) : false;
}

/** Sweep-wide RAW: sum the per-capture columns, and take `duplicates` from
 * the census rollup (streaks, not pairs — one streak is one duplicated
 * request run; reduceByteGate above).
 *
 * A column every row left null stays null: summing nulls as zeros would
 * report "0 occurrences" for a measure that never ran, which is the one
 * reading this ledger must never produce. A column SOME rows measured is
 * summed over those rows and `partial` names how many contributed. */
export function reduceFireRaw(rows) {
  const raw = {};
  const partial = {};
  for (const cls of FIRE_CLASSES) {
    let sum = 0;
    let seen = 0;
    for (const r of rows) {
      const v = r.fireRaw?.[cls];
      if (typeof v === "number") { sum += v; seen++; }
    }
    raw[cls] = seen ? sum : null;
    if (seen && seen < rows.length) partial[cls] = seen;
  }
  const dup = rows.reduce((acc, r) => {
    const d = r.byteGate?.duplicates;
    if (!d || typeof d.streaks !== "number") return acc;
    return acc === null ? d.streaks : acc + d.streaks;
  }, null);
  raw.duplicates = dup;
  return { raw, partial };
}

// --- SAVED vs LEAKED bytes (BACKLOG "fire-ledger SAVED-vs-LEAKED bytes columns") ---
//
// The count columns answer "is this class still happening". These answer what
// it COST — the proxy's justification number, on the same line and the same
// cadence as the retirement evidence, so a retirement argument and a
// keep-it-running argument read off one series.
//
// Both objects carry the full 7-class key set, so a reader indexes them
// exactly like raw/absorbed, and both are drawn from the CENSUS rows the RAW
// column already draws from — never from the event logs. That is what makes
// their denominator RAW's (the whole capture corpus this sweep replayed), and
// it has a consequence worth stating: unlike raw-vs-absorbed, these two ARE
// comparable to each other, and saved/(saved+leaked) is the one ratio on this
// line that means something. Neither is comparable to a COUNT column — bytes
// against occurrences — nor to ABSORBED, which counts a different window.
//
// What the census rows actually carry, read off real rows rather than assumed
// (capture s-captureG, 34-capture corpus, 2026-08-02):
//
//   relocations  findMitigationGaps rows carry `rebilledBytes` — LEAKED, the
//                input-side re-bill of a passthrough. A mitigated row
//                contributes 0 by construction (replay.mjs:1044), so the sum
//                is exactly "passed through", the number replay's own human
//                output prints as "passed through: ~N MB re-billed"
//                (replay.mjs:2688).
//   the other six  no byte field on the source row at all. blockMigrations
//                rows are {n, prevN, ts, direction, sourceIdx, targetIdx,
//                hash} (replay.mjs:1285), which leaves suppressions,
//                oscillationAbsorptions and blockMigrations with no byte
//                measure; toolsDeltas rows carry tool COUNTS, not sizes
//                (replay.mjs:780); duplicates comes from the byteGate rollup,
//                whose duplicate stats are all request/streak counts
//                (reduceByteGate above); guardRestores has no raw source at
//                all. Six nulls, six different reasons, none of them zero.
//
// SAVED: relocations is live since replay retains the pre-mitigation re-bill
// in its own `savedBytes` row field (the complement of `rebilledBytes` —
// their sum is always the full re-bill; replay.mjs findMitigationGaps). The
// other six stay null for the same six reasons as their leaked column. An
// OLD-SCHEMA census (mitigation rows predating the field) is unmeasured —
// null, never 0 (writing 0 would report "saved nothing" for the one class
// that demonstrably saves the most); an EMPTY measured array is a real zero,
// matching leaked's convention. The suite pins all three states.
//
// `rebilledOutBytes` is deliberately NOT summed into leakedBytes: output
// tokens price differently from input tokens, so a sum of the two prices
// nothing. If the output-side leak is wanted it is its own column.
export function summariseFireBytes(parsed) {
  const mit = Array.isArray(parsed?.mitigation) ? parsed.mitigation : null;
  const saved = {};
  const leaked = {};
  for (const cls of FIRE_CLASSES) {
    saved[cls] = null;
    leaked[cls] = null;
  }
  if (mit) {
    leaked.relocations = mit.reduce(
      (a, m) => a + (typeof m.rebilledBytes === "number" ? m.rebilledBytes : 0),
      0,
    );
    saved.relocations =
      mit.length === 0 || mit.some((m) => typeof m.savedBytes === "number")
        ? mit.reduce((a, m) => a + (typeof m.savedBytes === "number" ? m.savedBytes : 0), 0)
        : null;
  }
  return { saved, leaked };
}

/** Sweep-wide SAVED/LEAKED: the same null-preserving sum reduceFireRaw does.
 * A class no capture measured stays null; summing nulls as zeros would put a
 * "0 bytes leaked" into the series for a measure that never ran. */
export function reduceFireBytes(rows) {
  const sum = (pick) => {
    const out = {};
    for (const cls of FIRE_CLASSES) {
      let acc = null;
      for (const r of rows) {
        const v = pick(r)?.[cls];
        if (typeof v === "number") acc = (acc ?? 0) + v;
      }
      out[cls] = acc;
    }
    return out;
  };
  return {
    savedBytes: sum((r) => r.fireBytes?.saved),
    leakedBytes: sum((r) => r.fireBytes?.leaked),
  };
}

// ABSORBED sources. `gate` is the env the WRITER reads: gate off means the
// log is not being written, so absence of fires proves nothing about the
// class and the column records null rather than 0.
//
// Two known gaps, recorded as null instead of an invented number:
//   oscillationAbsorptions  insertion-normalization now emits `movedRefires`
//     as a separate field (BACKLOG "split `moved`", 2026-08-02), so the
//     extension-side split this gap named is no longer missing — but wiring
//     it into this table is a separate, undecided step (not done here);
//     the column stays null until that decision is made.
//   blockMigrations, duplicates  no mitigation absorbs these AS a class:
//     the first is the population suppression/relocation act on, the second
//     is CC re-sending a request and nothing here de-duplicates it.
const ABSORBED_SOURCES = [
  { cls: "suppressions", gate: "CACHE_FIX_INSERTION_NORMALIZE", on: "1",
    suffix: "-insertion-events.jsonl", add: (r) => (typeof r.suppressed === "number" ? r.suppressed : 0) },
  { cls: "relocations", gate: "CACHE_FIX_INSERTION_NORMALIZE", on: "1",
    // Fresh recognitions only — `movedRefires` is the substitution still
    // holding a prior move, not new absorbed behavior (BACKLOG "split
    // `moved`", 2026-08-02). `movedFresh` is missing on ledger lines
    // written before this change; `moved` is their fallback so a legacy
    // line does not silently read as zero.
    suffix: "-insertion-events.jsonl",
    add: (r) =>
      typeof r.movedFresh === "number" ? r.movedFresh : typeof r.moved === "number" ? r.moved : 0 },
  { cls: "toolAdditionAnnouncements", gate: "CACHE_FIX_TOOL_REWRITE", on: "1",
    suffix: "-deferred-tool-events.jsonl", add: (r) => (Array.isArray(r.newNames) ? r.newNames.length : 0) },
  { cls: "guardRestores", gate: "CACHE_FIX_OUTPUT_GUARD", on: "1",
    suffix: "-guard-events.jsonl", add: () => 1 },
];

/** Which absorbed columns are measurable this run, from the SERVING gate set
 * (the same `prodEnv` the replay children were given). An unresolvable gate
 * set — no unit, empty Environment — makes every column unmeasurable: a
 * sweep that cannot say what was running cannot say what it absorbed. */
export function absorbedMeasurable(prodEnv, envSource) {
  const set = new Map();
  for (const kv of prodEnv ?? []) {
    const eq = kv.indexOf("=");
    if (eq > 0) set.set(kv.slice(0, eq), kv.slice(eq + 1));
  }
  const known = envSource === "cache-fix-proxy.service";
  const out = {};
  for (const s of ABSORBED_SOURCES) out[s.cls] = known && set.get(s.gate) === s.on;
  return out;
}

/** Tally one event log's lines that fall inside [sinceMs, untilMs). */
export function tallyEventLines(text, sinceMs, untilMs, adders) {
  const out = {};
  for (const k of Object.keys(adders)) out[k] = 0;
  for (const line of text.split("\n")) {
    if (!line) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue; // a torn tail line is not a fire; the next sweep sees the whole file
    }
    const t = Date.parse(rec?.ts ?? "");
    if (Number.isNaN(t) || t < sinceMs || t >= untilMs) continue;
    for (const [k, add] of Object.entries(adders)) out[k] += add(rec);
  }
  return out;
}

/** ABSORBED, sweep-wide, over [since, until).
 *
 * mtime is a legitimate prefilter and not an optimisation shortcut: these
 * logs are append-only, so a file last written before `since` cannot carry a
 * line inside the window. A file that cannot be READ makes its columns null
 * — the sweep saw a source it could not count, which is not zero. */
export async function collectAbsorbed(dir, sinceMs, untilMs, measurable) {
  const absorbed = {};
  for (const cls of FIRE_CLASSES) absorbed[cls] = null;
  const bySuffix = new Map();
  for (const s of ABSORBED_SOURCES) {
    if (!measurable[s.cls]) continue;
    if (!bySuffix.has(s.suffix)) bySuffix.set(s.suffix, {});
    bySuffix.get(s.suffix)[s.cls] = s.add;
    absorbed[s.cls] = 0;
  }
  if (!bySuffix.size) return absorbed;

  let names;
  try {
    names = await readdir(dir);
  } catch {
    // A snapshots directory that is not there is NOT "no fires", ENOENT
    // included. The two shapes are indistinguishable from here — a fresh
    // machine that has written nothing yet, and a sweep pointed at the wrong
    // path while the writers fill another one — and only one of them is a
    // zero. Reporting the wrong one feeds a false quiet straight into a
    // retirement, so both read as unmeasurable.
    for (const cls of Object.keys(absorbed)) absorbed[cls] = null;
    return absorbed;
  }
  for (const [suffix, adders] of bySuffix) {
    for (const name of names.filter((n) => n.endsWith(suffix))) {
      const full = join(dir, name);
      try {
        if ((await stat(full)).mtimeMs < sinceMs) continue;
        const tallied = tallyEventLines(await readFile(full, "utf-8"), sinceMs, untilMs, adders);
        for (const [cls, n] of Object.entries(tallied)) absorbed[cls] += n;
      } catch {
        for (const cls of Object.keys(adders)) absorbed[cls] = null;
      }
    }
  }
  return absorbed;
}

// --- CC version, per sweep ---
//
// Operator refinement (1): a retirement's basis is "0 raw occurrences across
// N sweeps spanning cc-versions >= X, where X ships the fix", so a line
// without its versions cannot carry a retirement.
//
// The captures do NOT carry it. `cc-version-normalize` reads `cc_version`
// out of the system prompt's x-anthropic-billing-header block, and that
// block is absent from every capture on this machine (grepped: 0 hits for
// `cc_version` across the whole 8 GB corpus). The transcripts do: each
// ~/.claude/projects/<project>/<sessionId>.jsonl line carries a top-level
// `version`, and a capture file names its session id. So the join is
// capture -> sid -> transcript.
//
// Only the transcript TAIL is read (bounded, below): the question is which
// build produced the traffic this sweep looked at, the newest lines answer
// it, and a full read of every transcript would put tens of MB through a
// sweep that has no other reason to touch them.
const TRANSCRIPT_TAIL_BYTES = 256 * 1024;

export function sidOfCapture(name) {
  const m = /^s-(.+)-requests\.jsonl$/.exec(name);
  return m ? m[1] : null;
}

/** Distinct top-level `version` values in the last bytes of a transcript.
 * Parsed per line, never regexed out of the raw text — a `version` field
 * inside a tool result or a pasted file is not the client's version. */
export async function transcriptVersions(path, tailBytes = TRANSCRIPT_TAIL_BYTES) {
  const found = new Set();
  let fh;
  try {
    fh = await open(path, "r");
    const { size } = await fh.stat();
    const start = Math.max(0, size - tailBytes);
    const buf = Buffer.alloc(Math.min(size, tailBytes));
    await fh.read(buf, 0, buf.length, start);
    const lines = buf.toString("utf-8").split("\n");
    // A non-zero start cuts mid-line; that fragment is not JSON and is dropped.
    if (start > 0) lines.shift();
    for (const line of lines) {
      if (!line) continue;
      try {
        const v = JSON.parse(line)?.version;
        if (typeof v === "string" && /^\d+\.\d+/.test(v)) found.add(v);
      } catch { /* partial or non-object line */ }
    }
  } catch {
    return found; // unreadable transcript contributes nothing, never a wrong version
  } finally {
    await fh?.close();
  }
  return found;
}

export async function collectCcVersions(captureNames, transcriptsRoot) {
  const sids = new Set(captureNames.map(sidOfCapture).filter(Boolean));
  if (!sids.size) return [];
  const found = new Set();
  let projects;
  try {
    projects = await readdir(transcriptsRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const p of projects) {
    if (!p.isDirectory()) continue;
    let files;
    try {
      files = await readdir(join(transcriptsRoot, p.name));
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith(".jsonl")) continue;
      if (!sids.has(f.slice(0, -".jsonl".length))) continue;
      for (const v of await transcriptVersions(join(transcriptsRoot, p.name, f))) found.add(v);
    }
  }
  return [...found].sort();
}

/** The previous line's `ts` — the start of this run's absorbed window.
 * A ledger that does not exist yet, or whose tail is unparseable, yields
 * null and the caller falls back to a stated default window rather than
 * counting the whole history into the first line. */
export async function lastFireLedgerTs(path) {
  try {
    const lines = (await readFile(path, "utf-8")).split("\n").filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const ts = JSON.parse(lines[i])?.ts;
        if (typeof ts === "string" && !Number.isNaN(Date.parse(ts))) return ts;
      } catch { /* keep walking back */ }
    }
  } catch { /* no ledger yet */ }
  return null;
}

// First-run window. The ledger's own cadence is one line per daily sweep, so
// a first line that counted the entire event history would be a spike no
// later line is comparable to.
export const FIRE_FIRST_WINDOW_H = 24;

function parseArgs(argv) {
  const args = {
    captures: DEFAULT_CAPTURES,
    status: DEFAULT_STATUS,
    fireLedger: DEFAULT_FIRE_LEDGER,
    snapshots: DEFAULT_SNAPSHOTS,
    transcripts: DEFAULT_TRANSCRIPTS,
    rowpins: DEFAULT_ROWPINS,
    quiet: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--captures") args.captures = argv[++i];
    else if (a === "--status") args.status = argv[++i];
    else if (a === "--fire-ledger") args.fireLedger = argv[++i];
    else if (a === "--snapshots") args.snapshots = argv[++i];
    else if (a === "--transcripts") args.transcripts = argv[++i];
    else if (a === "--rowpins") args.rowpins = argv[++i];
    else if (a === "--quiet") args.quiet = true;
    else {
      process.stderr.write(`unexpected argument: ${a}\n`);
      process.exit(2);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const started = new Date().toISOString();

  // Resolve the SERVING configuration before anything else, and say so: a
  // sweep whose gate set is unknown is not a verdict about production.
  const { env: prodEnv, source: envSource } = productionEnv();
  if (!args.quiet) {
    process.stdout.write(`gates from ${envSource}: ${prodEnv.length ? prodEnv.join(" ") : "(none — replaying DEFAULTS, not production)"}\n`);
    process.stdout.write(`  excluded as artifact-only: ${[...ARTIFACT_ONLY].join(", ")}\n\n`);
  }

  let files = [];
  try {
    files = (await readdir(args.captures)).filter((f) => f.endsWith("-requests.jsonl"));
  } catch (e) {
    process.stderr.write(`no capture directory at ${args.captures}: ${e?.message ?? e}\n`);
    process.exit(2);
  }

  const rows = [];
  for (const f of files.sort()) {
    const full = join(args.captures, f);
    let bytes = 0;
    try {
      bytes = (await stat(full)).size;
    } catch {
      continue;
    }
    // An empty capture has no pairs to compare; running the gate on it proves
    // nothing and its "0 violations" would pad the verdict.
    if (bytes === 0) continue;
    const res = await runReplay(full, prodEnv);
    const row = summarise(f, bytes, res);
    row.byteGate = summariseCensus(await runCensus(full));
    // Write the evidence before anything else can go wrong with this sweep,
    // and drop the bodies off the row immediately afterwards: the status file
    // is machine-local, unscrubbed and read by tools that expect counts.
    // A write failure is recorded on the row rather than ending the sweep —
    // the same stance the fire ledger takes — because a lost pin is a lost
    // artifact, while an aborted sweep is a lost verdict for 66 captures.
    if (row.pinsPending) {
      try {
        row.rowPins = await writeRowPins(row.pinsPending, args.rowpins);
      } catch (e) {
        row.rowPins = { error: String(e?.message ?? e) };
      }
    } else {
      // Three answers: the child emitted no pins array at all (an older
      // replay, a run that could not parse) — that is not a measured zero.
      row.rowPins = null;
    }
    delete row.pinsPending;
    rows.push(row);
    if (!args.quiet) {
      const verdict = row.error
        ? `ERROR ${row.error.split("\n")[0]}`
        : rowIsClean(row)
          ? "clean"
          : `stability=${row.stability} safety=${row.safety} conservation=${row.conservation} sequence=${row.sequence} order=${row.order}` +
            (row.fidelityMismatch ? ` FIDELITY-MISMATCH=${row.fidelityMismatch}` : "") +
            (row.byteGate?.unreadable ? " BYTE-GATE-UNREADABLE" : "") +
            (row.byteGate?.error ? " BYTE-GATE-ERROR" : "");
      process.stdout.write(`${f} (${(bytes / 1e6).toFixed(1)} MB, ${row.requests ?? "?"} req): ${verdict}\n`);
      process.stdout.write(`  byte-gate: ${describeByteGate(row.byteGate)}\n`);
      if (row.rowPins) {
        const p = row.rowPins;
        process.stdout.write(
          p.error
            ? `  row pins: COULD NOT WRITE — ${p.error}\n`
            : `  row pins: ${p.written} written, ${p.unchanged} already pinned` +
              (p.rejected ? `, ${p.rejected} REJECTED (bytes do not match the row)` : "") +
              (p.unverifiable ? `, ${p.unverifiable} unverifiable` : "") +
              (p.conflicts.length ? `, ${p.conflicts.length} CONFLICT (same row, different bytes — not overwritten)` : "") +
              "\n",
        );
      }
    }
  }

  const failed = rows.filter((r) => !rowIsClean(r));
  const proving = rows.filter((r) => !r.error && !r.provesNothing);
  // Sweep-level byte-gate totals: the daily answer to "did a normalization
  // rule hold corpus-wide, and did any prune re-bill settled history". Read by
  // the operator and by doctor; per-capture rows keep the detail.
  const byteGate = reduceByteGate(rows);
  // Fingerprints of the code this sweep actually exercised. The verdict
  // used to record which CONFIG it replayed but never which CODE — so a
  // morning verdict stayed "fresh" (age bound) across an afternoon of
  // replay/extension changes, and the compensating step was human memory.
  let code = null;
  try {
    code = {
      proxyTree: await sourceFingerprint(PROXY_ROOT),
      toolsTree: await sourceFingerprint(dirname(fileURLToPath(import.meta.url))),
    };
  } catch {
    code = null; // never block the verdict on the stamp; absent reads as unstamped
  }
  // Backlog header lint (WARN-only, fork-side): a stale header over a
  // resolved body mis-grades surveys; the daily sweep is its standing
  // consumer. Never gates the sweep; absent BACKLOG.md (upstream trees)
  // reads as null, not zero.
  let backlogLint = null;
  try {
    const { lintText } = await import("./backlog-lint.mjs");
    const findings = lintText(await readFile(join(__dirname, "..", "BACKLOG.md"), "utf-8"));
    backlogLint = findings.length;
    for (const f of findings) {
      process.stderr.write(`WARN backlog-header line=${f.line} grade=${f.grade} header="${f.header}"\n`);
    }
  } catch {
    backlogLint = null;
  }

  // xdg-writer-guard sweep (WARN-only for now — BACKLOG "xdg-writer-guard
  // main() is wired to no consumer"): the writer-side check that a module
  // importing statePath()/dataPath() carries no unlabelled citation of the
  // old, pre-XDG home-directory path. Non-blocking by design, same as the
  // backlog lint above: the real tree still carries stale claims and a
  // handful of true THIRD-PARTY path citations the predicate cannot yet
  // tell apart from staleness (see the guard's own KNOWN LIMITATION
  // comment) — a hard gate here would fire on legitimate work and train
  // the override reflex. It goes blocking only once those are repaired
  // down to a declared, self-verifying exemption.
  let xdgWriterGuard = null;
  try {
    const { sweep } = await import("./xdg-writer-guard.mjs");
    const { violations } = sweep();
    xdgWriterGuard = violations.length;
    for (const v of violations) {
      process.stderr.write(`WARN xdg-writer-guard ${v.path}:${v.line}: ${v.text}\n`);
    }
  } catch {
    xdgWriterGuard = null;
  }

  // Temp-directory leftovers. BLOCKING, unlike the backlog lint above, because
  // the failure it reports is silent by construction: on 2026-08-08 the leaked
  // directories filled a 31 GB tmpfs and broke unrelated tooling machine-wide
  // while this very sweep and the whole test suite stayed green. Nothing else
  // in the stack looks at the disk, so if this does not block, nothing does.
  //
  // Counting only roots older than an hour AND belonging to a dead process is
  // what keeps it off legitimate work — a sweep's own replay children hold run
  // roots for as long as they run.
  const tmpLeftovers = staleRunRoots();
  if (tmpLeftovers.count) {
    process.stderr.write(
      `FAIL tmp-leftovers: ${tmpLeftovers.count} run root(s) older than 1h from dead processes\n`
      + tmpLeftovers.dirs.slice(0, 10).map((d) => `  ${d}\n`).join(""),
    );
  } else if (!tmpLeftovers.scanned) {
    process.stderr.write(`COULD NOT VERIFY tmp-leftovers: ${tmpLeftovers.reason}\n`);
  }

  const status = {
    version: 1,
    started,
    finished: new Date().toISOString(),
    code,
    // os.hostname(), not $HOSTNAME: systemd user units export no HOSTNAME,
    // so the env var wrote "unknown" into every scheduled run's status file.
    host: hostname(),
    gates: prodEnv,
    gateSource: envSource,
    captures: rows.length,
    bytes: rows.reduce((a, r) => a + r.bytes, 0),
    failing: failed.length,
    proving: proving.length,
    unproving: rows.length - failed.length >= 0 ? rows.filter((r) => r.provesNothing).length : 0,
    // ok requires at least one PROVING row: a sweep of empty and
    // single-request captures ran zero cross-request checks. A temp root that
    // could not be scanned fails too — an unreadable temp dir is the third
    // answer, and it must not read as "nothing left behind".
    ok: failed.length === 0 && proving.length > 0
      && tmpLeftovers.scanned && tmpLeftovers.count === 0,
    // The paths are the finding; cap the list so one bad day cannot bloat a
    // status file that is already ~200 KB.
    tmpLeftovers: {
      count: tmpLeftovers.count,
      scanned: tmpLeftovers.scanned,
      reason: tmpLeftovers.reason,
      dirs: tmpLeftovers.dirs.slice(0, 20),
    },
    byteGate,
    absorption: summariseAbsorption(rows),
    rowPins: reduceRowPins(rows),
    backlogLint,
    xdgWriterGuard,
    rows,
  };
  await mkdir(dirname(args.status), { recursive: true });
  await writeFile(args.status, JSON.stringify(status, null, 2) + "\n");

  // The fire ledger: one line per sweep, appended (never rewritten) so the
  // series a retirement rests on cannot be edited by a later run.
  const fireTs = status.finished;
  const prevTs = await lastFireLedgerTs(args.fireLedger);
  const windowFrom = prevTs ?? new Date(Date.parse(fireTs) - FIRE_FIRST_WINDOW_H * 3600_000).toISOString();
  const { raw: fireRaw, partial } = reduceFireRaw(rows);
  const { savedBytes, leakedBytes } = reduceFireBytes(rows);
  const measurable = absorbedMeasurable(prodEnv, envSource);
  const fireLine = {
    ts: fireTs,
    windowFrom,
    // Named per line, not assumed: the first line's window is synthetic
    // (no predecessor), and a reader summing absorbed counts across lines
    // must be able to see that.
    windowSeeded: prevTs === null,
    ccVersions: await collectCcVersions(files, args.transcripts),
    captures: rows.length,
    raw: fireRaw,
    absorbed: await collectAbsorbed(args.snapshots, Date.parse(windowFrom), Date.parse(fireTs), measurable),
    // Bytes, on RAW's denominator (summariseFireBytes). New fields only —
    // lines written before this shipped stay parseable, and every consumer
    // reads by key, so an older line simply has no bytes to report.
    savedBytes,
    leakedBytes,
    ...(Object.keys(partial).length ? { rawPartial: partial } : {}),
  };
  try {
    await mkdir(dirname(args.fireLedger), { recursive: true });
    await appendFile(args.fireLedger, JSON.stringify(fireLine) + "\n");
  } catch (e) {
    // The ledger is evidence for a future decision, never a gate on this
    // sweep's verdict — a failed append is reported and nothing more.
    process.stderr.write(`fire-ledger append failed at ${args.fireLedger}: ${e?.message ?? e}\n`);
  }

  if (!args.quiet) {
    process.stdout.write(
      `\n${rows.length} capture(s), ${(status.bytes / 1e6).toFixed(0)} MB, ${failed.length} failing -> ${args.status}\n` +
      `tmp leftovers: ${tmpLeftovers.scanned ? tmpLeftovers.count : "COULD NOT VERIFY"}\n` +
      `byte-gate corpus-wide: ${byteGate.tally.EXACT} EXACT / ${byteGate.tally.EXTENDED} EXTENDED ` +
      `(${byteGate.merged} merged-standalone, ${byteGate.newText} new-text) / ` +
      `${byteGate.tally.DROPPED} DROPPED / ${byteGate.tally.MISMATCH} MISMATCH; ` +
      `prunes ${byteGate.prunes.pure} pure / ${byteGate.prunes.interior} INTERIOR-DIVERGENT` +
      (byteGate.prunes.unanchored ? ` / ${byteGate.prunes.unanchored} unanchored` : "") +
      (byteGate.unreadable || byteGate.errors
        ? `\n  COULD NOT VERIFY: ${byteGate.unreadable} unreadable capture(s), ${byteGate.errors} failed run(s)\n`
        : "\n"),
    );
    const col = (o) => FIRE_CLASSES.map((c) => `${c}=${o[c] === null ? "n/a" : o[c]}`).join(" ");
    const kbCol = (o) =>
      FIRE_CLASSES.map((c) => `${c}=${o[c] === null ? "n/a" : `${(o[c] / 1e3).toFixed(0)}kB`}`).join(" ");
    process.stdout.write(
      `fire-ledger -> ${args.fireLedger}\n` +
      `  cc ${fireLine.ccVersions.join(",") || "unknown"}; absorbed window ${fireLine.windowFrom} ` +
      `${localSuffix(Date.parse(fireLine.windowFrom))}${fireLine.windowSeeded ? " (seeded)" : ""}\n` +
      `  raw      ${col(fireLine.raw)}\n` +
      `  absorbed ${col(fireLine.absorbed)}\n` +
      // Bytes, not counts — printed as kB so nobody reads them as a fifth
      // count row. n/a is a real answer here: see summariseFireBytes.
      `  saved    ${kbCol(fireLine.savedBytes)}\n` +
      `  leaked   ${kbCol(fireLine.leakedBytes)}\n`,
    );
  }
  // Non-zero on a failing sweep AND on an empty one: "no captures" means the
  // gate proved nothing, which must not read as a pass.
  process.exit(status.ok ? 0 : 1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    process.stderr.write(`gate-live failed: ${err?.stack ?? err}\n`);
    process.exit(2);
  });
}

export { summarise, rowIsClean };
