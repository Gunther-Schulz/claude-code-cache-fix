#!/usr/bin/env node
// Claim a capture ALIAS, atomically.
//
// WHY THIS EXISTS. This repo is public, so a capture is named in tracked prose
// by alias (`s-captureA`, `s-captureB`, …) and never by filename or session id;
// the push-side scan blocks the real form, which is LATE — after the bytes are
// in a commit, costing an amend. `docs/runbooks/bust-appears.md` carried a
// `[GRADUATE -> an alias-assigning helper]` marker for exactly that, through two
// occurrences of the amend cost.
//
// The third occurrence is what made it a tool rather than a note, and it is a
// different failure: "take the next unused alias" is a READ-MODIFY-WRITE, and
// on 2026-08-07 three agent lanes ran concurrently. Two were handed the same
// "next unused" alias by their briefs, and one of them registered it. An alias
// that resolves to two captures is not stale — it is wrong in a way no reader
// can detect, which is the failure the alias convention exists to prevent, one
// level up. Parallel lanes made a rule that was fine for one writer unsound.
//
// So: claiming goes through here, the claim is exclusive, and the tool is
// idempotent per capture — re-running for a capture that already has an alias
// returns the SAME alias and burns nothing.
//
//   node tools/alias-claim.mjs <capture-file|session-id> [--note "<why>"] [--protect]
//   node tools/alias-claim.mjs --show <capture-file|session-id>
//   node tools/alias-claim.mjs --release <capture-file|session-id>
//   node tools/alias-claim.mjs --protect-status
//
// The registry is machine-local by nature (mode 0600, never tracked): it holds
// precisely the bytes the convention keeps out of git. It lives under XDG data
// (`~/.local/share/cache-fix/capture-aliases.json`), NOT under `~/.claude/`.
//
// `--protect` hard-links the claimed capture into a sibling `captures-protected`
// dir so retention's oldest-mtime-first eviction (proxy/extensions/
// request-capture.mjs, `sweepCaptureDir`) cannot delete its bytes — a claim
// alone records a NAME, and retention knows nothing about names. See
// BACKLOG.md, "a claimed alias does not protect its capture from eviction",
// for why (copying was rejected: captures here run to ~2GB).

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  openSync,
  closeSync,
  unlinkSync,
  statSync,
  chmodSync,
  linkSync,
  readdirSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { dataPath } from "../proxy/xdg-dirs.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_BACKLOG = join(REPO_ROOT, "BACKLOG.md");

// HOME IS XDG DATA, NOT `~/.claude/`. The registry is machine-local data
// belonging to this repo's tooling; it is not Claude Code configuration and only
// lived under `~/.claude/` by habit. The harness protects that directory by PATH
// SHAPE, so every read and write of the registry — by a session or by an agent —
// raised a sensitive-file prompt. Moving the data out removes the prompt for
// good without touching a security control, which is the repair the box demands:
// a guard firing on legitimate work gets the work moved or a declared exemption,
// never a loosened predicate.
//
// Resolved per call, not at module load: a caller that points
// CACHE_FIX_ALIAS_REGISTRY at a scratch file AFTER importing this module must
// be obeyed, and a constant captured at import silently ignores it — which is
// a test that certifies nothing while writing to the real registry.
const dataHome = () => process.env.XDG_DATA_HOME || `${homedir()}/.local/share`;
const LEGACY_REGISTRY = () => `${homedir()}/.claude/cache-fix-capture-aliases.json`;
const registryPath = () =>
  process.env.CACHE_FIX_ALIAS_REGISTRY ?? `${dataHome()}/cache-fix/capture-aliases.json`;
const lockPath = () => `${registryPath()}.lock`;

// The captures root, resolved EXACTLY the way request-capture.mjs resolves it
// (`CACHE_FIX_CAPTURE_DIR` override, else the XDG data path) — imported from
// its owning resolver (`proxy/xdg-dirs.mjs`) rather than reimplemented, so the
// two never diverge. Per call, same reason as registryPath above.
export function getCaptureDir() {
  return process.env.CACHE_FIX_CAPTURE_DIR || dataPath("captures");
}

// A SIBLING of the resolved captures root, deliberately — not a path built
// from dataHome() independently. A test that points CACHE_FIX_CAPTURE_DIR at
// a scratch root gets the protected dir inside that same scratch root for
// free, and a hard link across filesystems is impossible, so "sibling of the
// real captures dir" is also the only placement a hard link can ever reach.
// `CACHE_FIX_PROTECTED_DIR` overrides outright when a caller needs to place
// it somewhere else.
export function getProtectedDir() {
  return process.env.CACHE_FIX_PROTECTED_DIR || join(dirname(getCaptureDir()), "captures-protected");
}

function getProtectedMaxBytes(env = process.env) {
  const raw = parseInt(env.CACHE_FIX_PROTECTED_MAX_MB ?? "4096", 10);
  const mb = Number.isFinite(raw) && raw > 0 ? raw : 4096;
  return mb * 1024 * 1024;
}

// A lock older than this is presumed abandoned (a killed agent, a crashed run).
// Deliberately short: every holder does one read and one write of a few KB.
const STALE_LOCK_MS = 30_000;
const WAIT_MS = 5_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The capture's identity as the registry stores it: the file's basename.
 *
 * A session id and its capture filename are the SAME capture under two names,
 * so both resolve here — a caller holding one must not be able to claim a
 * second alias by presenting the other. That is the identity rule this repo
 * states for probes, applied to the registry's own key.
 */
export function captureKeyOf(arg) {
  const s = String(arg).trim();
  // A FLAG IS NOT A CAPTURE. `--help` claimed a real alias for a capture named
  // "--help", and any `--note` typo burns one the same way — there is no
  // unclaim path, so the refusal belongs at the door.
  if (s.startsWith("-")) throw new Error(`not a capture: ${s} — that is a flag, and an alias claimed for one cannot be given back`);
  const name = basename(s);
  if (/-requests\.jsonl$/.test(name)) return name;
  const sid = name.replace(/^s-/, "").replace(/\.jsonl$/, "");
  return `s-${sid}-requests.jsonl`;
}

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** The alias after `s-capture<X>`, in the convention's own order: A..Z, then AA, AB, …
 *
 * TAKEN IS NOT THE SAME AS PRESENT, and the first build of this tool got that
 * wrong in the most expensive direction. Aliases A..AA were assigned before
 * this registry existed; their sessions are gone, so they were never entered as
 * KEYS — while ~185 citations of them stand in tracked prose. Reading "next
 * unused" off the keys present therefore re-issued `s-captureA`, and every one
 * of those citations silently began resolving, through the only resolver there
 * is, to a capture it is not about. A retired name is not a free name: the
 * registry's `_burned.aliases` is read here and skipped, and it is a HARD input
 * — an unreadable or missing burned list is a reason to refuse, not to proceed
 * cheerfully into the same hole.
 */
export function nextAlias(taken, burned = new Set()) {
  const has = (a) => taken.has(`s-capture${a}`) || burned.has(`s-capture${a}`);
  for (const c of ALPHA) if (!has(c)) return `s-capture${c}`;
  for (const a of ALPHA) for (const b of ALPHA) if (!has(a + b)) return `s-capture${a}${b}`;
  throw new Error("alias space exhausted (A..ZZ) — the convention needs a third letter");
}

async function withLock(fn) {
  const LOCK = lockPath();
  const started = Date.now();
  for (;;) {
    try {
      closeSync(openSync(LOCK, "wx"));
      break;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      let age = 0;
      try {
        age = Date.now() - statSync(LOCK).mtimeMs;
      } catch {
        continue; // released between the open and the stat — retry immediately
      }
      if (age > STALE_LOCK_MS) {
        // Breaking a stale lock is announced, never silent: if this is wrong,
        // the operator must be able to see that it happened.
        process.stderr.write(`alias-claim: breaking a stale lock (${Math.round(age / 1000)}s old)\n`);
        try {
          unlinkSync(LOCK);
        } catch {}
        continue;
      }
      if (Date.now() - started > WAIT_MS) {
        throw new Error(`alias-claim: registry busy for ${WAIT_MS}ms — another claim is in flight`);
      }
      await sleep(25 + Math.floor(Math.random() * 50));
    }
  }
  try {
    return fn();
  } finally {
    try {
      unlinkSync(LOCK);
    } catch {}
  }
}

function readRegistry() {
  const read = (path) => {
    const doc = JSON.parse(readFileSync(path, "utf-8"));
    doc.aliases ??= {};
    return doc;
  };
  try {
    return read(registryPath());
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  // ONLY when the path was DEFAULTED. A caller that named its registry
  // explicitly — a test pointing at scratch, a probe — must get exactly that
  // file or nothing; falling back would silently read (and reason about) the
  // real registry while the caller believed it was isolated. Caught by the
  // suite the moment the fallback was added, which is the whole reason the
  // scratch-registry tests exist.
  if (process.env.CACHE_FIX_ALIAS_REGISTRY) return { aliases: {} };
  // Migration read, and it is deliberately NOT silent: a registry found at the
  // old path is used so nothing breaks mid-move, and says so, because an
  // allocator quietly reading one file while writing another is how two
  // registries diverge — the same one-name-two-bodies failure the burned list
  // exists to prevent.
  try {
    const doc = read(LEGACY_REGISTRY());
    process.stderr.write(
      `alias-claim: read the LEGACY registry at ${LEGACY_REGISTRY()} — move it to ${registryPath()}\n`,
    );
    return doc;
  } catch (e) {
    if (e.code === "ENOENT") return { aliases: {} };
    throw e;
  }
}

/** The alias already held for this capture, or null. Not a claim. */
export function lookup(doc, key) {
  for (const [alias, v] of Object.entries(doc.aliases ?? {})) {
    const file = typeof v === "string" ? v : v?.file;
    const sid = typeof v === "object" ? v?.sid : null;
    if (file && captureKeyOf(file) === key) return alias;
    if (sid && captureKeyOf(sid) === key) return alias;
  }
  return null;
}

// Shared by every mutator (claim, protect, release, cap-eviction): the
// registry's write side, extracted so a claim, a protection, and a drop can
// never diverge in how they persist the document.
function writeRegistry(doc) {
  const path = registryPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`, { mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {}
}

export async function claim(capture, note) {
  const key = captureKeyOf(capture);
  return withLock(() => {
    const doc = readRegistry();
    const existing = lookup(doc, key);
    // Idempotent by capture: a re-run returns what is already held. Without
    // this, a retried command burns an alias and leaves an orphan entry.
    if (existing) return { alias: existing, claimed: false };
    const alias = nextAlias(new Set(Object.keys(doc.aliases)), new Set(doc._burned?.aliases ?? []));
    doc.aliases[alias] = {
      file: key,
      assigned: new Date().toISOString().slice(0, 10),
      ...(note ? { note } : {}),
    };
    writeRegistry(doc);
    return { alias, claimed: true };
  });
}

// Oldest-protection-first eviction of the PROTECTED set, mirroring
// sweepCaptureDir's own oldest-mtime-first shape but ordered by the
// registry's `protectedAt` where present (a hard link has no reliable mtime
// of its own once a second name references the same inode) and by the link's
// own mtime otherwise. Mutates `doc` in place; the caller persists it.
//
// Never silent: a dropped protection is exactly the loss this whole entry
// exists to prevent, so it prints a WARNING naming the alias and the file,
// and it is recorded in the registry (`protectionDroppedAt`) rather than
// only spoken to stderr — the same "a mechanism claiming safety must leave
// the evidence that it was tested" shape the corollary in dev-loop.md names
// for a retention knob.
function enforceProtectedCap(doc) {
  const protectedDir = getProtectedDir();
  let files;
  try {
    files = readdirSync(protectedDir);
  } catch {
    return;
  }
  const entries = [];
  for (const f of files) {
    let st;
    try {
      st = statSync(join(protectedDir, f));
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    const alias = lookup(doc, f);
    const protectedAt = alias ? doc.aliases[alias]?.protectedAt : null;
    const sortKey = protectedAt ? Date.parse(protectedAt) : st.mtimeMs;
    entries.push({ f, alias, size: st.size, sortKey });
  }
  const maxBytes = getProtectedMaxBytes();
  let total = entries.reduce((a, e) => a + e.size, 0);
  if (total <= maxBytes) return;
  entries.sort((a, b) => a.sortKey - b.sortKey);
  for (const e of entries) {
    if (total <= maxBytes) break;
    try {
      unlinkSync(join(protectedDir, e.f));
    } catch {
      continue; // vanished already — nothing to drop or to warn about
    }
    total -= e.size;
    process.stderr.write(
      `alias-claim: WARNING — protected-set cap exceeded (${maxBytes} bytes) — dropped protection for ` +
        `${e.alias ?? "(unaliased)"} (${e.f})\n`,
    );
    if (e.alias && doc.aliases[e.alias]) {
      doc.aliases[e.alias].protectionDroppedAt = new Date().toISOString();
    }
  }
}

/** Hard-link a claimed capture into the protected dir. Requires an existing
 * claim (claim it first) — protect names an alias in the registry, so there
 * must already be one to name.
 *
 * EXDEV, ENOENT, or any other link() failure is LOUD: it throws, and the
 * caller's registry write never happens, so the claim survives without
 * `protectedAt` rather than silently degrading to an unprotected claim that
 * LOOKS protected. No copy fallback, ever — captures here run to ~2GB.
 */
export async function protect(capture) {
  const key = captureKeyOf(capture);
  return withLock(() => {
    const doc = readRegistry();
    const alias = lookup(doc, key);
    if (!alias) throw new Error(`protect: ${key} has no alias — claim it first`);
    const src = join(getCaptureDir(), key);
    const protectedDir = getProtectedDir();
    mkdirSync(protectedDir, { recursive: true, mode: 0o700 });
    try {
      chmodSync(protectedDir, 0o700);
    } catch {}
    const dest = join(protectedDir, key);
    let alreadyLinked = false;
    try {
      linkSync(src, dest);
    } catch (e) {
      if (e.code === "EEXIST") {
        let srcStat, destStat;
        try {
          srcStat = statSync(src);
          destStat = statSync(dest);
        } catch (statErr) {
          throw new Error(`protect: EEXIST at ${dest}, and comparing it to ${src} failed (${statErr.code}): ${statErr.message}`);
        }
        if (srcStat.dev === destStat.dev && srcStat.ino === destStat.ino) {
          alreadyLinked = true; // same inode — idempotent, nothing new to print
        } else {
          throw new Error(
            `protect: EEXIST — ${dest} already exists and is a DIFFERENT file than ${src} ` +
              `(dev/ino ${destStat.dev}/${destStat.ino} vs ${srcStat.dev}/${srcStat.ino}) — refusing to overwrite`,
          );
        }
      } else {
        throw new Error(`protect: link failed (${e.code ?? "unknown"}) ${src} -> ${dest}: ${e.message}`);
      }
    }
    if (!alreadyLinked) {
      doc.aliases[alias].protectedAt = new Date().toISOString();
      delete doc.aliases[alias].protectionDroppedAt;
      delete doc.aliases[alias].releasedAt;
    }
    enforceProtectedCap(doc);
    writeRegistry(doc);
    return { alias, key, alreadyLinked };
  });
}

/** Unlink a capture's protected copy and clear its protection. Releasing
 * something never protected (or already released/dropped by the cap) is
 * not an error — it is its own answer, the three-answers discipline this
 * file already uses for `--show`.
 */
export async function release(capture) {
  const key = captureKeyOf(capture);
  return withLock(() => {
    const doc = readRegistry();
    const alias = lookup(doc, key);
    const entry = alias ? doc.aliases[alias] : null;
    const isProtected = Boolean(entry?.protectedAt) && !entry.releasedAt && !entry.protectionDroppedAt;
    if (!isProtected) return { released: false, key, alias };
    const dest = join(getProtectedDir(), key);
    try {
      unlinkSync(dest);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    delete entry.protectedAt;
    entry.releasedAt = new Date().toISOString();
    writeRegistry(doc);
    return { released: true, key, alias };
  });
}

/** The protected set as it exists on disk right now — for the dotfiles
 * doctor to read the protected-set size without this repo writing into
 * that repo. Reads only; never mutates.
 */
export function protectStatus() {
  const dir = getProtectedDir();
  const capBytes = getProtectedMaxBytes();
  let files;
  try {
    files = readdirSync(dir);
  } catch {
    return { dir, count: 0, bytes: 0, capBytes, entries: [] };
  }
  const doc = readRegistry();
  const entries = [];
  let bytes = 0;
  for (const f of files) {
    let st;
    try {
      st = statSync(join(dir, f));
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    const alias = lookup(doc, f);
    bytes += st.size;
    entries.push({
      alias: alias ?? null,
      file: f,
      bytes: st.size,
      protectedAt: alias ? (doc.aliases[alias]?.protectedAt ?? null) : null,
    });
  }
  return { dir, count: entries.length, bytes, capBytes, entries };
}

// --releasable — the READER half of BACKLOG.md, "`alias-claim --protect`
// cannot be made the default until `--release` is wired": nothing tells the
// tool a protection is no longer needed. This is a REPORT, never a gate —
// it releases nothing; the operator's `--release <capture>` stays the one
// act that does. See BACKLOG.md, RECORD 2026-08-13, "alias-claim --protect
// cannot be made the default until --release is wired and the cap is
// re-sized".
//
// Four buckets, all reported with zeros stated explicitly (the under-report
// principle: silence is not a valid answer). RELEASABLE — protected, cited,
// every citation sits under the closure home ("## Done"). HELD — protected,
// cited, at least one citation in a LIVE section. UNCITED — protected, cited
// NOWHERE. COULD-NOT-VERIFY — the backlog could not be read. UNCITED is
// deliberately never folded into RELEASABLE: absence of a citation is
// absence of evidence, not evidence the protection is spent (the
// three-answers discipline this file already applies to --show and
// --release, one level up).

/** Split BACKLOG.md-shaped text into its top-level ("## ") sections. A line
 * before the first such header belongs to no section (treated as live,
 * never as Done, by the caller). Detection derives from the file's OWN
 * headers — never a hardcoded section list — so the file gaining a section
 * needs no change here.
 */
export function parseSections(text) {
  const lines = text.split("\n");
  const sections = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    if (/^## /.test(lines[i])) {
      if (current) {
        current.end = i;
        sections.push(current);
      }
      current = { heading: lines[i], start: i, end: lines.length };
    }
  }
  if (current) sections.push(current);
  return { lines, sections };
}

// Mirrors the `isProtected` check `release()` computes inline (above) —
// duplicated rather than extracted, deliberately: this lane must not touch
// `release()`'s body, and a 3-line boolean is cheaper to duplicate once,
// with a pointer, than to risk coupling two functions this entry says stay
// untouched.
function isCurrentlyProtected(entry) {
  return Boolean(entry?.protectedAt) && !entry.releasedAt && !entry.protectionDroppedAt;
}

// A citation is ANCHORED, never a rendered-text substring test: `s-captureA`
// is a literal PREFIX of `s-captureAB`, so an unanchored `.includes()` would
// count a citation of one alias as evidence for another — the exact
// paraphrase-drift shape the operator corpus names ("a substring test... is
// a prefix match in an equality's costume; anchor the terminator"). Aliases
// are always `s-capture[A-Z]+`, so no regex-escaping is needed for the
// literal itself.
// Exported for its test rather than restated there: the anchoring is the
// load-bearing part and the discriminating quantity is the HIT COUNT, which
// no public bucket assertion can reach — measured 2026-08-13 at ref 375bf82,
// no alias in the corpus changes BUCKET under anchoring, because every alias
// with a prefix-extension also has at least one genuine citation in a live
// section. So a bucket-level bite would pass under both the anchored and the
// unanchored matcher, which is the "could-not-verify passing as verified"
// shape; the count separates them 8 vs 101.
export function citationLineIndices(alias, lines) {
  const re = new RegExp(`(?<![A-Za-z])${alias}(?![A-Za-z])`);
  const hits = [];
  for (let i = 0; i < lines.length; i++) if (re.test(lines[i])) hits.push(i);
  return hits;
}

function sectionFor(lineIdx, sections) {
  return sections.find((s) => lineIdx >= s.start && lineIdx < s.end) ?? null;
}

/** For every currently-protected alias in `doc`, which bucket does it fall
 * in against `backlogText`? `backlogText === null` means the backlog could
 * not be read — every protected alias reports COULD-NOT-VERIFY rather than
 * a guess (dev-loop.md: "a tool's could-not-verify REASON is a claim, and
 * it is computed or it is a guess"). Pure and read-only: no mutation, no
 * filesystem access — the CLI wrapper below does the reading.
 */
export function releasableReport(backlogText, doc) {
  const buckets = { RELEASABLE: [], HELD: [], UNCITED: [], "COULD-NOT-VERIFY": [] };
  const protectedAliases = Object.entries(doc?.aliases ?? {}).filter(([, entry]) => isCurrentlyProtected(entry));
  if (backlogText == null) {
    for (const [alias] of protectedAliases) buckets["COULD-NOT-VERIFY"].push(alias);
    return buckets;
  }
  const { lines, sections } = parseSections(backlogText);
  for (const [alias] of protectedAliases) {
    const hits = citationLineIndices(alias, lines);
    if (hits.length === 0) {
      buckets.UNCITED.push(alias);
      continue;
    }
    const allUnderDone = hits.every((i) => {
      const sec = sectionFor(i, sections);
      return Boolean(sec) && sec.heading.startsWith("## Done");
    });
    buckets[allUnderDone ? "RELEASABLE" : "HELD"].push(alias);
  }
  return buckets;
}

const USAGE =
  "usage: alias-claim.mjs <capture-file|session-id> [--note \"<why>\"] [--protect]\n" +
  "       alias-claim.mjs --show <capture-file|session-id>\n" +
  "       alias-claim.mjs --release <capture-file|session-id>\n" +
  "       alias-claim.mjs --protect-status\n" +
  "       alias-claim.mjs --releasable [<backlog-path>]\n";

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args[0] === "--protect-status") {
    process.stdout.write(`${JSON.stringify(protectStatus())}\n`);
    process.exit(0);
  }

  if (args[0] === "--releasable") {
    const backlogPath = args[1] || DEFAULT_BACKLOG;
    const doc = readRegistry();
    let text = null;
    try {
      text = readFileSync(backlogPath, "utf-8");
    } catch (e) {
      process.stderr.write(
        `alias-claim: --releasable could not read ${backlogPath} (${e.code ?? "unknown"}): ${e.message}\n`,
      );
    }
    const buckets = releasableReport(text, doc);
    // Report only — exit 0 always, this is not a gate. Every bucket prints,
    // zeros stated explicitly, so a silent bucket cannot be misread as an
    // unrun check.
    for (const name of ["RELEASABLE", "HELD", "UNCITED", "COULD-NOT-VERIFY"]) {
      process.stdout.write(`${name} (${buckets[name].length}): ${buckets[name].join(", ") || "(none)"}\n`);
    }
    process.exit(0);
  }

  if (args[0] === "--release") {
    const capture = args[1];
    if (!capture) {
      process.stderr.write(USAGE);
      process.exit(2);
    }
    const result = await release(capture);
    // Three answers, not two — same discipline as --show: releasing something
    // that was never protected (or already released/dropped) is not an error.
    if (!result.released) {
      process.stdout.write("NOT PROTECTED\n");
      process.exit(1);
    }
    process.stdout.write(`released ${result.alias} (${result.key})\n`);
    process.exit(0);
  }

  const show = args[0] === "--show";
  const rest = show ? args.slice(1) : args;
  const noteAt = rest.indexOf("--note");
  const note = noteAt >= 0 ? rest[noteAt + 1] : undefined;
  const protectFlag = rest.includes("--protect");
  // Every flag this parser knows about is stripped from the positional
  // stream before the capture argument is picked — the same rule --note
  // already follows, restated here because a flag left in would either be
  // parsed as the capture (burning an alias with no unclaim path) or would
  // shift the positional index and swallow the real capture argument.
  const capture = rest.filter((a, i) => {
    if (noteAt >= 0 && (i === noteAt || i === noteAt + 1)) return false;
    if (a === "--protect") return false;
    return true;
  })[0];
  if (!capture) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  const key = captureKeyOf(capture);
  if (show) {
    const held = lookup(readRegistry(), key);
    // Three answers, not two: an unclaimed capture is not an error and is not
    // an alias — it says so, and exits non-zero so a script cannot read the
    // empty string as a name.
    if (!held) {
      process.stdout.write("UNCLAIMED\n");
      process.exit(1);
    }
    process.stdout.write(`${held}\n`);
  } else {
    const { alias, claimed } = await claim(capture, note);
    let suffix = claimed ? "" : "  (already held)";
    if (protectFlag) {
      try {
        const p = await protect(capture);
        suffix += p.alreadyLinked ? "  (already protected)" : "  (protected)";
      } catch (e) {
        process.stdout.write(`${alias}${suffix}\n`);
        process.stderr.write(`alias-claim: ${e.message}\n`);
        process.exit(1);
      }
    }
    process.stdout.write(`${alias}${suffix}\n`);
  }
}
