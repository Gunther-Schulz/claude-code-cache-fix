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

import { readdir, readFile, writeFile, stat, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { homedir, hostname } from "node:os";

import { censusPair } from "./replay.mjs";
import { readLines } from "./read-lines.mjs";

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
// s-633915a8 n=26->28: suppressed count 1->0, outputForm "append"->
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
    if (rec.type === "outcome" || rec.type === "boot") continue;
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
    key: rec.key ? `k_${sha(rec.key).slice(0, 8)}` : null,
    requestId: rec.requestId ? `rq_${sha(rec.requestId).slice(0, 8)}` : null,
    model: rec.model ?? null,
    usage: rec.usage ?? null,
    outSha: rec.outSha ?? null,
    outBytes: rec.outBytes ?? null,
    ms: rec.ms ?? null,
  };
}

// Streams capturePath from its start and returns every record (boot,
// outcome, request — sanitized) through the request whose file-wide ordinal
// (counting only non-boot/non-outcome records, same counting rule
// scanCapture and both real-pair tests use) equals `m`. Throws if the
// capture has fewer than m+1 request records — a pin that cannot be
// fulfilled must fail loudly, not write a truncated fixture silently.
export async function pinRange(capturePath, m) {
  const records = [];
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
    if (rec.type === "boot") {
      records.push(scrubBootRecord(rec));
      continue;
    }
    if (rec.type === "outcome") {
      records.push(scrubOutcomeRecord(rec));
      continue;
    }
    const idx = count++;
    records.push(scrubRecord(rec));
    if (idx === m) {
      reached = true;
      break;
    }
  }
  if (!reached) {
    throw new Error(`capture ${capturePath} has only ${count} request record(s), cannot pin through m=${m}`);
  }
  return records;
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

  let records;
  try {
    records = await pinRange(capturePath, m);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }

  const fixture = {
    header: {
      key,
      range: { n, m },
      replayFrom: 0,
      note:
        "records holds the FULL prefix 0..m, not just n..m: the real-pair " +
        "tests replay every request from index 0 in order because " +
        "insertion-normalization's per-conversation canonical state is " +
        "stateful (see tools/harvest.mjs runPin's header comment). n..m " +
        "names the pair under test, not a truncation point.",
      harvestedAt: new Date().toISOString(),
      sanitizer:
        "tools/harvest.mjs scrubRecord (tool schemas dropped; text tokenized " +
        "deterministically, including inside <system-reminder> wrappers)",
    },
    records,
  };

  // File name matches the scheduled harvest's own convention (key.slice(0,
  // 10) — see the harvested-*.jsonl naming above): a full session key is
  // long and the 10-char prefix already disambiguates in practice.
  const outName = `pinned-${key.slice(0, 10)}-${n}-${m}.json`;
  const outPath = join(args.out, outName);
  if (!args.dryRun) {
    await mkdir(args.out, { recursive: true });
    await writeFile(outPath, JSON.stringify(fixture, null, 2) + "\n");
  }
  process.stdout.write(
    `pinned ${records.length} record(s), range ${n}..${m} (full prefix from 0), to ${outPath}` +
      `${args.dryRun ? " (dry run)" : ""}\n`,
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
    const { picks, count, shape, watermarkBody, newestBody } =
      await scanCapture(path, seenClasses, prior.requests);
    report.scanned += count;
    if (count <= prior.requests) {
      report.skipped.push({ key, requests: count });
      continue;
    }

    // Growth steps vs this ledger's own prior entry: freeze the evidence
    // while the capture still holds it (see the snapshot helpers' header).
    for (const step of detectGrowthSteps(prior.shape, shape)) {
      const date = new Date().toISOString().slice(0, 10);
      const name = `growth-${key.slice(0, 10)}-${step.field}-${date}.json`;
      const artifact = {
        key,
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
      report.growth.push({ key, field: step.field, file: name, oldBytes: step.oldBytes, newBytes: step.newBytes });
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
      // Shape watch (see the helpers' header): a checker reads these and
      // warns the day a dormant class activates or the baseline steps.
      shape,
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
