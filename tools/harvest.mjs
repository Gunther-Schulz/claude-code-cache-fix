#!/usr/bin/env node
// harvest — promote NOVEL request pairs from live captures into permanent,
// committable regression fixtures.
//
// Usage:
//   node tools/harvest.mjs [--captures DIR] [--out DIR] [--ledger FILE]
//                          [--dry-run] [--json]
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
// Deliberately NOT automatic. This is a dev tool, run when working on the
// proxy — not a timer, not a hook. Standing background machinery has to be
// maintained and monitored forever, and a harvester that fails silently is
// worse than one you run on purpose. The ledger is what makes ad-hoc runs
// safe: it tracks what has already been harvested, so running it twice
// harvests nothing twice and running it after a month of silence catches up.
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
//   - <system-reminder> wrappers (the volatile-block detector matches on
//     the wrapper, so replacing it would erase the very property under test)
//   - structural ids: tool_use_id / id pairs, which must stay consistent or
//     the tool-adjacency invariant breaks
//
// Tool SCHEMAS are dropped rather than sanitized: they carry descriptions
// and parameter docs, and no message-shape class depends on them.

import { readdir, readFile, writeFile, stat, mkdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { homedir, hostname } from "node:os";

import { censusPair } from "./replay.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CAPTURES = join(homedir(), ".claude", "cache-fix-captures");
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
const DEFAULT_LEDGER = join(
  __dirname,
  "..",
  "test",
  "fixtures",
  "harvested",
  `LEDGER-${LEDGER_HOST}.json`,
);

const sha = (s) => createHash("sha256").update(s).digest("hex");

// --- Sanitization ---

const VOLATILE_WRAP = /^<system-reminder>\n[\s\S]*\n<\/system-reminder>\s*$/;

// Deterministic placeholder: same input text always yields the same token, so
// a message that repeats across requests still compares equal — which is the
// whole point, since identity matching is what we are testing.
function scrubText(text) {
  if (typeof text !== "string") return text;
  if (VOLATILE_WRAP.test(text)) return "<system-reminder>\nREDACTED\n</system-reminder>";
  if (text === "") return "";
  return `t_${sha(text).slice(0, 12)}_${text.length}`;
}

function scrubBlock(block) {
  if (typeof block === "string") return scrubText(block);
  if (!block || typeof block !== "object") return block;
  const out = { ...block };
  if (typeof out.text === "string") out.text = scrubText(out.text);
  if (typeof out.thinking === "string" && out.thinking !== "") out.thinking = scrubText(out.thinking);
  if (typeof out.signature === "string") out.signature = `sig_${sha(out.signature).slice(0, 10)}`;
  if (typeof out.data === "string") out.data = `data_${sha(out.data).slice(0, 10)}`;
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

export function scrubRecord(rec) {
  const body = rec.body ?? {};
  const system = Array.isArray(body.system)
    ? body.system.map(scrubBlock)
    : typeof body.system === "string"
      ? scrubText(body.system)
      : body.system;
  return {
    ts: rec.ts,
    sid: rec.sid ? `sid_${sha(rec.sid).slice(0, 8)}` : null,
    key: rec.key ? `k_${sha(rec.key).slice(0, 8)}` : null,
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

async function loadLedger(path) {
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return { version: 1, keys: {} };
  }
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
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const index = count++;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    const cid = conversationId(rec.body?.messages);
    if (cid === null) continue;
    const prev = prevByConv.get(cid);
    prevByConv.set(cid, { rec, index });
    if (!prev || index < minIndex) continue;
    const kind = censusPair(prev.rec.body?.messages ?? [], rec.body?.messages ?? []);
    if (BORING.has(kind) || seenClasses.has(kind)) continue;
    seenClasses.add(kind);
    picks.push({ kind, prevRec: prev.rec, rec, cur: index });
  }
  return { picks, count };
}

function parseArgs(argv) {
  const args = {
    captures: DEFAULT_CAPTURES,
    out: DEFAULT_OUT,
    ledger: DEFAULT_LEDGER,
    dryRun: false,
    json: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--captures") args.captures = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--ledger") args.ledger = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--json") args.json = true;
    else {
      process.stderr.write(`unexpected argument: ${a}\n`);
      process.exit(2);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
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
    const key = file.replace(/-requests\.jsonl$/, "");
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
    const { picks, count } = await scanCapture(path, seenClasses, prior.requests);
    report.scanned += count;
    if (count <= prior.requests) {
      report.skipped.push({ key, requests: count });
      continue;
    }

    for (const pick of picks) {
      const name = `harvested-${pick.kind.replace(/[^a-z]+/gi, "-")}-${key.slice(0, 10)}-${pick.cur}.jsonl`;
      const body = [pick.prevRec, pick.rec].map((r) => JSON.stringify(scrubRecord(r))).join("\n") + "\n";
      if (!args.dryRun) {
        await mkdir(args.out, { recursive: true });
        await writeFile(join(args.out, name), body);
      }
      report.harvested.push({ key, kind: pick.kind, file: name, at: pick.cur });
    }

    ledger.keys[key] = {
      requests: count,
      bytes: st.size,
      lastHarvest: new Date().toISOString(),
      classes: [...new Set([...(prior.classes ?? []), ...picks.map((p) => p.kind)])],
    };
  }

  if (!args.dryRun) {
    await mkdir(dirname(args.ledger), { recursive: true });
    await writeFile(args.ledger, JSON.stringify(ledger, null, 2) + "\n");
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(
      `scanned ${report.scanned} requests across ${files.length} capture(s)${args.dryRun ? " (dry run)" : ""}\n`,
    );
    process.stdout.write(`harvested ${report.harvested.length} novel pair(s)\n`);
    for (const h of report.harvested) process.stdout.write(`  ${h.kind.padEnd(20)} ${h.file}\n`);
    if (report.skipped.length) process.stdout.write(`up to date: ${report.skipped.length} capture(s)\n`);
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
