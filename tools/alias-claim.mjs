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
// Single home for "where does this carrier's closure home live" — a
// `Closure-home:` head declaration, defaulting to today's `## Done` when
// absent. See tools/closure-home.mjs for the full contract.
import { resolveClosureHome } from "./closure-home.mjs";

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

// RAISED 4096 -> 8192 on 2026-08-16 (operator GO), and it is a BRIDGE with a
// named revert trigger rather than a preference. The cap bounds RETENTION
// POLICY, not disk: `--protect` hard-links, so a protected capture adds zero
// bytes to the filesystem and this number only limits how much the eviction
// sweep is told to keep.
//
// What forced it: the evidence under the parked resume-key entry (matrix row
// 24) is a LIVE capture that was 2.83 GB at 09:00 and 3.02 GB by 09:5x — it
// does not fit beside the four existing protections in 4 GiB, and all four are
// cited by live entries, so nothing was releasable. Eviction is
// oldest-mtime-first, which takes the QUIET session first — and a session goes
// quiet exactly when it stops being traffic and starts being evidence, so the
// window to protect it is while it is still noisy.
//
// REVERT TRIGGER, so this does not become the permanent answer: the durable
// fix is a SMALL bounded pin of the one pair, not retention of a multi-GB
// capture. `harvest --pin --bounded` currently cannot produce one for this
// shape — it has failed twice on this session (born-large refusal, then 65 of
// 174 member ordinals missing). When that defect is fixed and a small pin
// replaces this protection, drop this back to 4096.
//
// RAISED AGAIN 8192 -> 12288 on 2026-08-18 (operator GO), same bridge, same
// revert trigger, and the reason is a MEASURED wall rather than a preference:
// the protected set sat at 7,626 MB of 8,192 with FIVE members and
// `alias-claim --releasable` reporting NOTHING releasable — every one is cited
// by a live entry. At 93% the next protection simply fails, and the thing it
// would fail to hold is whatever evidence the next bust produces, which is
// exactly when the window is open and short.
// Priced against the real constraint before choosing the number, because a cap
// that outruns the disk is the ENOSPC class this repo has already paid for
// once: `--protect` HARD-LINKS, so a protected capture adds no bytes, and the
// filesystem holds 1.7 TB free against 9.8 GB of captures and 7.2 GB of
// protections. The cap is a retention-policy bound, and 12288 matches the
// bridge value `CACHE_FIX_CAPTURE_MAX_MB` already carries, so the two numbers
// stop disagreeing about how much history this machine keeps.
// RAISED 12288 -> 65536 on 2026-08-20 (operator GO), and this raise is NOT a
// bridge like the two above it — the cap changed KIND on the same day, so the
// number now prices a different risk. It no longer evicts: over cap, the next
// protection is refused and nothing on disk changes. So a cap set too low can
// no longer destroy evidence, only decline to hold new evidence, loudly and
// recoverably — which moves the whole cost of being wrong onto the cheap side.
//
// The operator's ground, and it outranks the arithmetic: the proxy
// investigation is the point of this repo, its evidence is what makes findings
// re-derivable, and trading that away to reclaim disk on a filesystem with
// 1.7 TB free is the wrong trade. Present usage is ~12.3 GB protected against
// that, so 64 GiB is roughly 3.5% of free space and several busts of headroom.
//
// The cap is kept rather than removed because nothing else bounds this
// directory: retention (`sweepCaptureDir`) sweeps `captures/` only, and a
// protected entry whose live copy has rotated away is unreclaimable by
// anything except an explicit `--release`. Without a bound the set grows
// forever with no one ever being told. With refuse-on-add it is a tripwire
// that says "come look at what you are still holding" — which is what a cap
// over cited evidence should do, and the only thing it can now do.
function getProtectedMaxBytes(env = process.env) {
  const raw = parseInt(env.CACHE_FIX_PROTECTED_MAX_MB ?? "65536", 10);
  const mb = Number.isFinite(raw) && raw > 0 ? raw : 65536;
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

// Measure the PROTECTED set. Deletes nothing — see below for why that is the
// whole point of this function rather than an omission from it.
//
// WHAT THIS REPLACED, and the incident that forced it (2026-08-20). This used
// to be `enforceProtectedCap`: over cap, it unlinked protected entries
// oldest-`protectedAt`-first until the total fit. That is safe only while a
// protected entry is a SECOND name for bytes that also live in `captures/` —
// the premise this file's own header states ("`--protect` hard-links, so a
// protected capture adds zero bytes"). Once retention has swept the live copy,
// the protected link is the LAST link, and unlinking it is a delete. It did
// exactly that: `s-captureBM`'s bytes are gone and unrecoverable. Measured
// immediately after, four of the six remaining members had `nlink === 1`, so
// this was the set's normal condition and not unlucky ordering.
//
// WHY REFUSING BEATS EVICTING, rather than just adding a link-count guard. The
// members of this set are evidence CITED BY LIVE ENTRIES — `--releasable`
// reports nothing releasable precisely because each one is load-bearing. A
// policy that deletes the oldest cited evidence to make room for the newest is
// backwards at the level of intent, and a link-count guard would only have
// narrowed which evidence it destroyed. The file already documented the right
// behaviour one paragraph up — "At 93% the next protection simply fails" — so
// eviction was the implementation contradicting its own spec, and failing
// closed is the reading that fires on the incident above.
//
// Consequences, both deliberate: the set now shrinks ONLY through an explicit
// `--release`, which is a decision someone takes rather than a side effect of
// protecting something else; and the cap's failure mode is a loud non-zero
// refusal at the moment of protection, which is recoverable, instead of a
// silent WARNING on a zero exit, which is not.
function measureProtectedSet(doc) {
  const protectedDir = getProtectedDir();
  let files;
  try {
    files = readdirSync(protectedDir);
  } catch {
    return { entries: [], total: 0, maxBytes: getProtectedMaxBytes() };
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
    // nlink is what tells a downgrade from a delete. Carried on every entry
    // so no caller can reason about eviction without having it in hand.
    entries.push({ f, alias, size: st.size, sortKey, nlink: st.nlink });
  }
  return {
    entries,
    total: entries.reduce((a, e) => a + e.size, 0),
    maxBytes: getProtectedMaxBytes(),
  };
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

    // Settle IDEMPOTENCE FIRST, before the cap is consulted. A re-protect of a
    // capture already linked here adds zero bytes, so it must not be refused
    // by a full set — refusing a no-op is a check firing on a non-defect, and
    // "did that go through? let me run it again" is the commonest way anyone
    // reaches this path. Deciding it before the cap check is also what keeps
    // the no-op branch structurally unable to reach any enforcement at all.
    // DEST first, SRC second, and the order is load-bearing. Once retention
    // has swept the live copy, `src` is gone while the protection is perfectly
    // intact — that is the NORMAL end state of a protected capture, not an
    // error. Statting `src` first turns the commonest re-protect into ENOENT
    // and reports a healthy protection as broken.
    let destStat = null;
    try {
      destStat = statSync(dest);
    } catch (e) {
      if (e.code !== "ENOENT") {
        throw new Error(`protect: cannot stat ${dest} (${e.code ?? "unknown"}): ${e.message}`);
      }
    }
    let srcStat = null;
    try {
      srcStat = statSync(src);
    } catch (e) {
      if (e.code !== "ENOENT") {
        throw new Error(`protect: cannot stat ${src} (${e.code ?? "unknown"}): ${e.message}`);
      }
    }

    let alreadyLinked = false;
    if (destStat) {
      if (!srcStat) {
        // Protected, live copy swept. Nothing to link and nothing to check a
        // cap against — the bytes are already held and adding zero is free.
        alreadyLinked = true;
      } else if (destStat.dev === srcStat.dev && destStat.ino === srcStat.ino) {
        alreadyLinked = true; // same inode — idempotent, nothing new to print
      } else {
        throw new Error(
          `protect: EEXIST — ${dest} already exists and is a DIFFERENT file than ${src} ` +
            `(dev/ino ${destStat.dev}/${destStat.ino} vs ${srcStat.dev}/${srcStat.ino}) — refusing to overwrite`,
        );
      }
    } else if (!srcStat) {
      // Both paths named, same contract as the link-failure branch below: the
      // operator needs to see WHERE it looked, not just that it failed.
      throw new Error(
        `protect: link failed (ENOENT) ${src} -> ${dest}: the capture does not ` +
          `exist and no protected copy is present at ${dest} — nothing to ` +
          `protect (retention may already have taken it)`,
      );
    }

    if (!alreadyLinked) {
      // The cap is a gate on ADDING, never a licence to remove. Checked with
      // the prospective total, so the refusal lands before anything changes on
      // disk and nothing has to be undone.
      const { total, maxBytes } = measureProtectedSet(doc);
      if (total + srcStat.size > maxBytes) {
        throw new Error(
          `protect: refusing — protected set is ${total} bytes and adding ${key} ` +
            `(${srcStat.size} bytes) would exceed the cap of ${maxBytes}. Nothing was ` +
            `deleted and nothing was linked. Release something you no longer cite ` +
            `(alias-claim --releasable, then --release <capture>), or raise ` +
            `CACHE_FIX_PROTECTED_MAX_MB. This used to evict the oldest protection ` +
            `instead, which destroyed a capture whose live copy had already rotated ` +
            `out (2026-08-20).`,
        );
      }
      try {
        linkSync(src, dest);
      } catch (e) {
        throw new Error(`protect: link failed (${e.code ?? "unknown"}) ${src} -> ${dest}: ${e.message}`);
      }
    }
    if (!alreadyLinked) {
      doc.aliases[alias].protectedAt = new Date().toISOString();
      delete doc.aliases[alias].protectionDroppedAt;
      delete doc.aliases[alias].releasedAt;
    }
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
 * that repo, and for `state-report`'s carrier collector, which imports this
 * rather than restating where the links live or how the cap is resolved.
 * Reads only; never mutates. `dir` is an override for callers that need to
 * point at a fixture set; unset it resolves the real one, env override
 * included.
 */
export function protectStatus({ dir = getProtectedDir() } = {}) {
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
 * filesystem access — the CLI wrapper below does the reading, including of
 * `closureHomeText`.
 *
 * `closureHomeText` matters only when `backlogText`'s own `Closure-home:`
 * declaration resolves to `kind: "file"` — the closed entries then live in a
 * SEPARATE carrier this text no longer contains, so a citation confirmed
 * only by that file needs its content too. Pass the file's content when it
 * was read successfully, `null` when a `kind: "file"` home's read FAILED
 * (every protected alias then reports COULD-NOT-VERIFY, the same three-
 * answers discipline `backlogText === null` gets above — a failed read is
 * never silently treated as "cited nowhere"), or omit it entirely when the
 * home is `kind: "section"` (today's default), where it is never consulted.
 */
export function releasableReport(backlogText, doc, { closureHomeText } = {}) {
  const buckets = { RELEASABLE: [], HELD: [], UNCITED: [], "COULD-NOT-VERIFY": [] };
  const protectedAliases = Object.entries(doc?.aliases ?? {}).filter(([, entry]) => isCurrentlyProtected(entry));
  if (backlogText == null) {
    for (const [alias] of protectedAliases) buckets["COULD-NOT-VERIFY"].push(alias);
    return buckets;
  }
  const home = resolveClosureHome(backlogText);
  if (home.kind === "file" && closureHomeText === null) {
    for (const [alias] of protectedAliases) buckets["COULD-NOT-VERIFY"].push(alias);
    return buckets;
  }
  const { lines, sections } = parseSections(backlogText);
  const closureLines =
    home.kind === "file" && typeof closureHomeText === "string" ? closureHomeText.split("\n") : null;
  for (const [alias] of protectedAliases) {
    const hits = citationLineIndices(alias, lines);
    const closureHits = closureLines ? citationLineIndices(alias, closureLines) : [];
    if (hits.length === 0 && closureHits.length === 0) {
      buckets.UNCITED.push(alias);
      continue;
    }
    // `kind: "section"`: every citation in THIS text must sit under the
    // resolved section (today's default: "## Done"). `kind: "file"`: no
    // section in this text is ever the closure home — the closed entries
    // physically live in the external file — so ANY hit here is a LIVE
    // citation and the alias is HELD, whatever the external file also shows.
    const allUnderDone =
      home.kind === "section"
        ? hits.every((i) => {
            const sec = sectionFor(i, sections);
            return Boolean(sec) && sec.heading.startsWith(home.prefix);
          })
        : hits.length === 0;
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
    // A `kind: "file"` closure home is a SEPARATE carrier, relative to the
    // backlog's own directory (never cwd) — read here, since releasableReport
    // itself is pure/read-only by design. `closureHomeText` stays `undefined`
    // (never consulted) for the default `kind: "section"` home.
    let closureHomeText;
    if (text != null) {
      const home = resolveClosureHome(text);
      if (home.kind === "file") {
        const closurePath = join(dirname(backlogPath), home.path);
        try {
          closureHomeText = readFileSync(closurePath, "utf-8");
        } catch (e) {
          closureHomeText = null; // COULD-NOT-VERIFY, never a silent "cited nowhere"
          process.stderr.write(
            `alias-claim: --releasable could not read closure-home file ${closurePath} ` +
              `(${e.code ?? "unknown"}): ${e.message}\n`,
          );
        }
      }
    }
    const buckets = releasableReport(text, doc, { closureHomeText });
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
