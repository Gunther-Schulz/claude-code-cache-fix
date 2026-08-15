#!/usr/bin/env node
// state-report — the one-command answer to the operator's "what's the
// state?" (records-restructure directive, Phase 4).
//
// WHY THIS EXISTS. On 2026-08-11 answering that question by hand took a
// desk session two hours of archaeology across the threat-matrix status
// file, BACKLOG.md's three grades, the gate's last verdict, and the repo's
// own ref hygiene (a rescue tag, a dangling commit, a pile of untracked
// fixtures). Phases 1-3 of the same directive turned each of those into
// data with its own checker; this file is the READ-ONLY aggregation layer
// that queries all four and prints one report. It writes nothing, mutates
// nothing, and re-derives no invariant any of those checkers already own —
// it imports `readRecords` (matrix-status.mjs), `censusEntries` /
// `censusOpenSection` / `splitEntries` / `lintReadyBar` (backlog-lint.mjs),
// and `sourceFingerprint` (proxy/source-fingerprint.mjs) rather than
// restating any of their logic, per this repo's own hand-rolled-identity
// lesson (two implementations of one invariant drift silently).
//
// THE THIRD ANSWER IS PART OF THE CONTRACT (docs/dev-loop.md, "A checker
// has THREE answers"). Every collector below returns `{ ok: true, ... }`
// or `{ ok: false, reason }` — never a zero or an empty list standing in
// for an input it could not read. The pin and fingerprint comparisons
// additionally carry a THREE-WAY outcome of their own (match / MISMATCH /
// could-not-verify) that must never collapse into a two-way pass/fail: a
// dotfiles manifest absent on another machine is could-not-verify, not a
// mismatch, and a live proxy that does not answer is the same shape.
//
// Structure: pure collectors (this file's public API — every consumer that
// wants the data without shelling out imports these) plus a thin renderer.
// `--json` and the default text form share one collection pass; only the
// LAST step (render) differs, so the two can never disagree about what was
// found.

import { readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

import { readRecords, STATUS_PATH, MATRIX_PATH, VALID_STATUSES } from "./matrix-status.mjs";
import {
  censusEntries,
  censusOpenSection,
  splitEntries,
  lintReadyBar,
  DEFAULT_BACKLOG,
} from "./backlog-lint.mjs";
import { DEFAULT_STATUS as DEFAULT_GATE_STATUS } from "./gate-live.mjs";
// The capture-PROTECTION carrier is read through alias-claim's own
// `protectStatus`, never re-derived here: where the hard links live, which
// env var overrides the directory, and how the cap resolves are all that
// module's facts, and a second copy of them is the drift this file's header
// already refuses for every other collector.
import { protectStatus } from "./alias-claim.mjs";
import { sourceFingerprint, PROXY_ROOT } from "../proxy/source-fingerprint.mjs";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_MANIFEST_PATH = join(
  homedir(),
  "dev",
  "Gunther-Schulz",
  "dotfiles",
  "bootstrap",
  "manifest.py",
);
export const DEFAULT_HEALTH_URL = "http://127.0.0.1:9801/health";
export const DEFAULT_FIXTURES_DIR = "test/fixtures/harvested";

// ==========================================================================
// Small shared helpers
// ==========================================================================

function runGit(args, cwd) {
  try {
    const out = execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, out };
  } catch (e) {
    const stderr = (e && e.stderr ? e.stderr.toString() : "").trim();
    return { ok: false, reason: stderr || e?.message || String(e) };
  }
}

// `## <heading>` section extractor, generic over the heading text.
//
// SECTION EXTRACTION, and the history is worth keeping because it is the
// short version of this repo's whole boundary rule. This file was built with
// a LOCAL copy of `censusOpenSection`'s algorithm, because that function was
// not exported — the lane that wrote it refused to trust the copy silently
// and cross-checked entry counts against the real `censusEntries` instead,
// then returned the gap. The dispatcher exported the real function (see its
// definition comment in backlog-lint.mjs) and this now calls it: privacy did
// not prevent a second copy of a shared boundary, it only made the copy the
// path of least resistance.
//
// `## Record` has no second implementation to agree with, so the generic
// helper below still serves it — one boundary definition per section, each
// with exactly one owner.
function extractSection(text, headingPrefix) {
  const lines = text.split("\n");
  const head = lines.findIndex((l) => l.startsWith(headingPrefix));
  if (head < 0) return null;
  let tail = lines.length;
  for (let i = head + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      tail = i;
      break;
    }
  }
  return lines.slice(head + 1, tail).join("\n");
}

const BODY_DATE_RE = /\d{4}-\d{2}-\d{2}/g;

// Earliest YYYY-MM-DD date appearing anywhere in an entry's body. This is
// BODY-DERIVED, never a git date — callers label it that way. Returns null
// (never 0, never "") when no date appears; the renderer prints "unknown".
function earliestDate(body) {
  const dates = [...body.matchAll(BODY_DATE_RE)].map((m) => m[0]);
  if (!dates.length) return null;
  dates.sort();
  return dates[0];
}

function parseWorktreePorcelain(output) {
  const blocks = output.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block) => {
    const entry = {
      path: null,
      head: null,
      branch: null,
      bare: false,
      detached: false,
      locked: null,
      prunable: null,
    };
    for (const line of block.split("\n")) {
      if (line.startsWith("worktree ")) entry.path = line.slice("worktree ".length);
      else if (line.startsWith("HEAD ")) entry.head = line.slice("HEAD ".length);
      else if (line.startsWith("branch ")) entry.branch = line.slice("branch ".length);
      else if (line === "bare") entry.bare = true;
      else if (line === "detached") entry.detached = true;
      else if (line.startsWith("locked")) entry.locked = line.slice("locked".length).trim() || true;
      else if (line.startsWith("prunable")) entry.prunable = line.slice("prunable".length).trim() || true;
    }
    return entry;
  });
}

// ==========================================================================
// 1. matrix — imports readRecords, never re-derives the matrix invariants
// ==========================================================================

// Per-enum counts across all rows, plus the OPEN/RESIDUAL rows (oldest date
// first) with their evidence and date. `readRecords`'s own `ok:false` is
// propagated verbatim — its reason IS the could-not-verify answer.
export function collectMatrix({ statusPath = STATUS_PATH, matrixPath = MATRIX_PATH } = {}) {
  const rec = readRecords({ statusPath, matrixPath });
  if (!rec.ok) return { ok: false, reason: rec.reason };

  let statusObj;
  try {
    statusObj = JSON.parse(readFileSync(statusPath, "utf8"));
  } catch (e) {
    return { ok: false, reason: `status file unreadable: ${e?.message ?? e}` };
  }

  const rowKeys = Object.keys(statusObj).filter((k) => !k.startsWith("_"));
  const enumCounts = {};
  for (const s of VALID_STATUSES) enumCounts[s] = 0;
  const openResidual = [];
  for (const key of rowKeys) {
    const entry = statusObj[key] ?? {};
    if (VALID_STATUSES.has(entry.status)) enumCounts[entry.status] += 1;
    if (entry.status === "OPEN" || entry.status === "RESIDUAL") {
      openResidual.push({
        row: key,
        status: entry.status,
        evidence: entry.evidence ?? null,
        date: entry.date ?? null,
        residual: entry.residual ?? null,
      });
    }
  }
  openResidual.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  return {
    ok: true,
    totalRows: rec.rows,
    enumCounts,
    openResidual,
    validationFindings: rec.findings.length,
    validationCounts: rec.counts,
  };
}

// ==========================================================================
// 2. backlog — imports censusEntries/censusOpenSection/splitEntries/
//    lintReadyBar, never re-derives the `## Open` boundary
// ==========================================================================

export function collectBacklog({ backlogPath = DEFAULT_BACKLOG } = {}) {
  let text;
  try {
    text = readFileSync(backlogPath, "utf8");
  } catch (e) {
    return { ok: false, reason: `backlog unreadable: ${e?.message ?? e}` };
  }

  // ONE reader for this boundary: `censusOpenSection` is backlog-lint's own,
  // now imported rather than copied. `censusEntries` uses the same function
  // internally, so the count check below can no longer catch a DRIFT between
  // two implementations — there is only one. It is kept as a cheap invariant
  // on the pair (a body slice that yields a different entry count than the
  // census would mean the two are reading different text, which is worth
  // failing loudly on) and it costs nothing.
  const openSection = censusOpenSection(text);
  const openBody = openSection === null ? null : openSection.body ?? openSection;
  if (openBody === null) return { ok: false, reason: "no `## Open` section found in backlog" };

  const census = censusEntries(text);
  const bodies = splitEntries(openBody);
  if (bodies.length !== census.length) {
    return {
      ok: false,
      reason:
        `backlog section-boundary mismatch: censusEntries found ${census.length} \`## Open\` ` +
        `entries, this file's local extraction found ${bodies.length} — the two must never ` +
        `silently disagree (records-restructure directive; censusOpenSection is not exported ` +
        `from tools/backlog-lint.mjs for this file to import instead)`,
    };
  }

  const readyEntries = [];
  let parkedCount = 0;
  for (let i = 0; i < census.length; i++) {
    const c = census[i];
    if (c.grade === "PARKED") parkedCount += 1;
    if (c.grade === "READY") {
      const body = bodies[i] ? bodies[i].body : "";
      readyEntries.push({ headline: c.headline.slice(0, 70), age: earliestDate(body) });
    }
  }

  const recordSection = extractSection(text, "## Record");
  const recordCount = recordSection === null ? null : splitEntries(recordSection).length;

  const readyBarFindings = lintReadyBar(text);

  return {
    ok: true,
    readyEntries,
    parkedCount,
    recordCount,
    readyBarFindingCount: readyBarFindings.length,
  };
}

// ==========================================================================
// 3. verification — gate verdict (queried by field, never read whole),
//    the deployment-pin comparison, and the live source-fingerprint
//    comparison. THREE separate collectors: each namespace compares only
//    against itself, per the directive's explicit warning against
//    collapsing the two comparisons into one verdict.
// ==========================================================================

// The gate runs on a daily timer (07:55), so one missed run is exactly the
// event this threshold exists to surface.
export const GATE_STALE_THRESHOLD_HOURS = 24;

// Null-safe: an absent or unparseable `finished` is its own could-not-verify
// (`null`), never age 0 — age 0 is indistinguishable from "just finished"
// and would silently read as fresh.
function computeAgeHours(finished, nowMs) {
  if (typeof finished !== "string" || finished.length === 0) return null;
  const t = Date.parse(finished);
  if (Number.isNaN(t)) return null;
  return (nowMs - t) / (1000 * 60 * 60);
}

// Queries four fields plus the `records` block out of gate-live's status
// file. Deliberately does NOT hold onto `rows` (the ~33-field-per-capture
// array docs/dev-loop.md warns is a 25k-token trap to READ) — only the
// fields this report prints are extracted. `now` is injectable so the
// staleness math is testable without waiting real hours (default:
// `Date.now()`, the real clock in production and CLI use).
export function collectGateVerdict({ statusPath = DEFAULT_GATE_STATUS, now = Date.now() } = {}) {
  let obj;
  try {
    obj = JSON.parse(readFileSync(statusPath, "utf8"));
  } catch (e) {
    return { ok: false, reason: `gate status unreadable: ${e?.message ?? e}` };
  }
  return {
    ok: true,
    gateOk: obj.ok ?? null,
    failing: obj.failing ?? null,
    captures: obj.captures ?? null,
    finished: obj.finished ?? null,
    ageHours: computeAgeHours(obj.finished, now),
    records: obj.records ?? null,
  };
}

const MANIFEST_PIN_RE = /^CACHE_FIX_PROXY_TREE_PIN\s*=\s*"([^"]*)"/m;

// `HEAD:proxy` (this repo's own tree hash for the proxy subtree) against
// the dotfiles manifest's pin. An absent manifest — plausible on another
// machine — is `ok:false` (could-not-verify at render time), never read as
// a mismatch.
export function collectPinState({ repoRoot = REPO_ROOT, manifestPath = DEFAULT_MANIFEST_PATH } = {}) {
  const head = runGit(["rev-parse", "--short", "HEAD:proxy"], repoRoot);
  if (!head.ok) return { ok: false, reason: `git rev-parse HEAD:proxy failed: ${head.reason}` };
  const local = head.out.trim();

  let manifestText;
  try {
    manifestText = readFileSync(manifestPath, "utf8");
  } catch (e) {
    return { ok: false, reason: `manifest unreadable: ${e?.message ?? e}` };
  }
  const m = MANIFEST_PIN_RE.exec(manifestText);
  if (!m) {
    return { ok: false, reason: `CACHE_FIX_PROXY_TREE_PIN not found in ${manifestPath}` };
  }
  const manifestPinned = m[1];
  return { ok: true, local, manifestPinned, manifestPath, match: local === manifestPinned };
}

// The live source-fingerprint (SHA256 content fingerprint, imported from
// proxy/source-fingerprint.mjs — never re-derived) against `/health`'s
// `proxy_tree`. A proxy that does not answer is could-not-verify, never a
// mismatch — this is the SOURCE-FINGERPRINT namespace, deliberately never
// compared against the git-tree-hash pin above.
export async function collectFingerprintState({
  proxyRoot = PROXY_ROOT,
  healthUrl = DEFAULT_HEALTH_URL,
  fetchImpl = fetch,
  timeoutMs = 3000,
} = {}) {
  let local;
  try {
    local = await sourceFingerprint(proxyRoot);
  } catch (e) {
    return { ok: false, reason: `source-fingerprint failed: ${e?.message ?? e}` };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let body;
  try {
    const res = await fetchImpl(healthUrl, { signal: controller.signal });
    if (!res.ok) return { ok: false, reason: `${healthUrl} responded ${res.status}` };
    body = await res.json();
  } catch (e) {
    return { ok: false, reason: `proxy did not answer at ${healthUrl}: ${e?.message ?? e}` };
  } finally {
    clearTimeout(timer);
  }

  const remote = body?.proxy_tree ?? null;
  if (remote === null) return { ok: false, reason: `${healthUrl} carried no proxy_tree field` };
  return { ok: true, local, remote, match: local === remote };
}

export async function collectVerification(opts = {}) {
  return {
    gate: collectGateVerdict(opts),
    pin: collectPinState(opts),
    fingerprint: await collectFingerprintState(opts),
  };
}

// ==========================================================================
// 4. repo — unpushed commits, rescue tags, dangling-unrescued commits,
//    stale/prunable worktrees, and the harvested-fixture accumulation
// ==========================================================================

export function collectUnpushed({ repoRoot = REPO_ROOT, range = "origin/main..main" } = {}) {
  const res = runGit(["log", range, "--oneline"], repoRoot);
  if (!res.ok) return { ok: false, reason: res.reason };
  const commits = res.out.split("\n").filter(Boolean);
  return { ok: true, count: commits.length, commits };
}

export function collectRescueTags({ repoRoot = REPO_ROOT } = {}) {
  const res = runGit(["tag", "-l", "rescue/*"], repoRoot);
  if (!res.ok) return { ok: false, reason: res.reason };
  const tags = res.out.split("\n").filter(Boolean);
  return { ok: true, count: tags.length, tags };
}

// A dangling commit reachable from no `rescue/*` tag — the dc8c475 class:
// booked work surviving only as an unreferenced object. Reachability is
// read from git (`for-each-ref --contains`), never inferred from the tag
// list, so a tag pointing at an ANCESTOR of the dangling commit (not the
// commit itself) is correctly still counted as rescuing it.
export function collectDanglingUnrescued({ repoRoot = REPO_ROOT } = {}) {
  const res = runGit(["fsck", "--no-progress", "--dangling"], repoRoot);
  if (!res.ok) return { ok: false, reason: res.reason };

  const dangling = [];
  for (const line of res.out.split("\n")) {
    const m = /^dangling commit ([0-9a-f]+)$/.exec(line.trim());
    if (m) dangling.push(m[1]);
  }

  const unrescued = [];
  for (const sha of dangling) {
    const reach = runGit(["for-each-ref", "--contains", sha, "--count=1", "refs/tags/rescue/*"], repoRoot);
    if (!reach.ok || reach.out.trim() === "") unrescued.push(sha);
  }

  return { ok: true, totalDangling: dangling.length, unrescuedCount: unrescued.length, unrescued };
}

export function collectWorktrees({ repoRoot = REPO_ROOT } = {}) {
  const res = runGit(["worktree", "list", "--porcelain"], repoRoot);
  if (!res.ok) return { ok: false, reason: res.reason };
  const worktrees = parseWorktreePorcelain(res.out);
  const prunable = worktrees.filter((w) => w.prunable);
  return { ok: true, count: worktrees.length, prunableCount: prunable.length, prunable };
}

// Untracked-file count under `test/fixtures/harvested/`, with the oldest
// and newest mtime — `--untracked-files=all` so a wholly-untracked
// subdirectory is not collapsed into one line, since a per-file count is
// the whole point of this collector. Scoped by pathspec to one directory,
// never a bare repo-wide `-uall`.
export function collectFixturesAccumulation({
  repoRoot = REPO_ROOT,
  fixturesDir = DEFAULT_FIXTURES_DIR,
} = {}) {
  const res = runGit(
    ["status", "--porcelain", "--untracked-files=all", "--", fixturesDir],
    repoRoot,
  );
  if (!res.ok) return { ok: false, reason: res.reason };

  const files = [];
  for (const line of res.out.split("\n")) {
    if (line.startsWith("?? ")) files.push(line.slice(3).trim());
  }
  if (files.length === 0) return { ok: true, count: 0, oldestMtime: null, newestMtime: null };

  let oldest = Infinity;
  let newest = -Infinity;
  for (const f of files) {
    try {
      const st = statSync(join(repoRoot, f));
      if (st.mtimeMs < oldest) oldest = st.mtimeMs;
      if (st.mtimeMs > newest) newest = st.mtimeMs;
    } catch {
      // Vanished between `git status` and `stat` — the file is still
      // counted (git saw it); only its contribution to the mtime range is
      // skipped.
    }
  }
  return {
    ok: true,
    count: files.length,
    oldestMtime: Number.isFinite(oldest) ? new Date(oldest).toISOString() : null,
    newestMtime: Number.isFinite(newest) ? new Date(newest).toISOString() : null,
  };
}

/** The capture-protection carrier (closing-gate question 4's CARRIER
 * REGISTRATION clause). `alias-claim --protect` hard-links a capture into a
 * sibling `captures-protected/` dir, so eviction's `unlink` on the original
 * only decrements the link count and the bytes survive the rotation that
 * deletes the name. That is state which outlives every run, sits under a cap,
 * and — until this collector — nothing was scheduled to look at: the reading
 * existed only as `--protect-status`, a flag a human had to think to run.
 *
 * The THIRD ANSWER is deliberately not used for a missing directory. The dir
 * is created lazily by the first `--protect`, so its absence is a MEASURED
 * empty set rather than a failure to look — reporting `ok: false` there would
 * read as a broken collector on every machine that has never protected a
 * capture, which is the check-that-fires-on-a-non-defect shape. A directory
 * that exists and cannot be read still surfaces, as a zero count whose
 * entries are empty, because `protectStatus` swallows the readdir error; that
 * is a known limit of the imported reader and not restated logic here.
 */
export function collectProtectedCaptures({ protectedDir } = {}) {
  try {
    const st = protectStatus(protectedDir ? { dir: protectedDir } : {});
    return {
      ok: true,
      dir: st.dir,
      count: st.count,
      bytes: st.bytes,
      capBytes: st.capBytes,
      unaliased: st.entries.filter((e) => !e.alias).length,
      entries: st.entries,
    };
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e) };
  }
}

export function collectRepo(opts = {}) {
  return {
    unpushed: collectUnpushed(opts),
    rescueTags: collectRescueTags(opts),
    dangling: collectDanglingUnrescued(opts),
    worktrees: collectWorktrees(opts),
    fixtures: collectFixturesAccumulation(opts),
    protectedCaptures: collectProtectedCaptures(opts),
  };
}

// ==========================================================================
// 5. lane branches — enumerated by BRANCH, never by worktree. A branch can
//    outlive its worktree (docs/dev-loop.md, "A lane's report ends the
//    LANE. Nothing ends the INTEGRATION" — measured 2026-08-11: an orphaned
//    branch with real, unintegrated work and no registered worktree), so an
//    inventory built from `git worktree list` alone cannot see it. The
//    population is the UNION of (a) every branch registered to a worktree
//    (`git worktree list --porcelain`, `branch refs/heads/...`) and (b)
//    every branch matching one of this repo's two lane naming conventions
//    (`worktree-agent-*`, the harness's native isolation; `wt/*`, the
//    dispatch skill's manual recipe) — (a) alone misses the orphan class,
//    (b) alone misses a lane on a branch named by neither convention.
//
//    RESIDUAL, named per docs/dev-loop.md's pattern-scope rule ("name one
//    member of the class the pattern cannot match"): a lane branch named
//    neither `worktree-agent-*` nor `wt/*`, whose worktree has already been
//    removed, is invisible to this collector — its worktree-registration
//    signal and its naming-convention signal are both gone. No pattern
//    used here reaches it; only a wider enumeration (every local branch,
//    cross-checked for divergence from main) would.
//
//    Outstanding/already-upstream are counted by PATCH-ID via `git cherry
//    main <branch>` (`+` = not upstream, `-` = already upstream by
//    patch-id), never by revision count — this repo's integration verb is
//    cherry-pick, which rewrites every hash it touches, so a revision count
//    over-reports (docs/dev-loop.md, the lane-integration paragraph).
//
//    `aggregateLaneBranches` is split out as a pure function over an
//    already-enumerated branch list so it can be exercised against frozen
//    fixture data (a git-free reproduction of a real, since-cleared
//    inventory) without shelling out to git.
// ==========================================================================

const LANE_BRANCH_PATTERNS = [/^worktree-agent-/, /^wt\//];

export function aggregateLaneBranches(branches) {
  const totalOutstanding = branches.reduce((s, b) => s + b.outstanding, 0);
  const branchesWithWork = branches.filter((b) => b.outstanding > 0).length;
  const orphanedWithWork = branches.filter((b) => b.outstanding > 0 && !b.worktreeRegistered).length;
  return { branchCount: branches.length, totalOutstanding, branchesWithWork, orphanedWithWork };
}

export function collectLaneBranches({ repoRoot = REPO_ROOT, mainRef = "main" } = {}) {
  const mainCheck = runGit(["rev-parse", "--verify", mainRef], repoRoot);
  if (!mainCheck.ok) {
    return { ok: false, reason: `main ref '${mainRef}' does not resolve: ${mainCheck.reason}` };
  }

  const wt = runGit(["worktree", "list", "--porcelain"], repoRoot);
  if (!wt.ok) return { ok: false, reason: `git worktree list failed: ${wt.reason}` };
  const worktreeBranches = new Set(
    parseWorktreePorcelain(wt.out)
      .map((w) => w.branch)
      .filter(Boolean)
      .map((b) => b.replace(/^refs\/heads\//, "")),
  );

  const refsRes = runGit(["for-each-ref", "--format=%(refname:short)", "refs/heads/"], repoRoot);
  if (!refsRes.ok) return { ok: false, reason: `git for-each-ref failed: ${refsRes.reason}` };
  const allBranches = refsRes.out.split("\n").filter(Boolean);
  const patternBranches = allBranches.filter((b) => LANE_BRANCH_PATTERNS.some((re) => re.test(b)));

  const population = new Set([...worktreeBranches, ...patternBranches]);
  // The primary checkout's own branch (mainRef) is always worktree-registered
  // and is never itself a lane.
  population.delete(mainRef);

  const branches = [];
  for (const branch of [...population].sort()) {
    const tip = runGit(["rev-parse", "--short", branch], repoRoot);
    if (!tip.ok) return { ok: false, reason: `git rev-parse --short ${branch} failed: ${tip.reason}` };

    const mergeBaseFull = runGit(["merge-base", mainRef, branch], repoRoot);
    if (!mergeBaseFull.ok) {
      return { ok: false, reason: `git merge-base ${mainRef} ${branch} failed: ${mergeBaseFull.reason}` };
    }
    const mergeBaseShort = runGit(["rev-parse", "--short", mergeBaseFull.out.trim()], repoRoot);
    if (!mergeBaseShort.ok) {
      return { ok: false, reason: `git rev-parse --short <merge-base of ${branch}> failed: ${mergeBaseShort.reason}` };
    }

    const cherry = runGit(["cherry", mainRef, branch], repoRoot);
    if (!cherry.ok) return { ok: false, reason: `git cherry ${mainRef} ${branch} failed: ${cherry.reason}` };
    let outstanding = 0;
    let alreadyUpstream = 0;
    for (const line of cherry.out.split("\n")) {
      if (line.startsWith("+")) outstanding += 1;
      else if (line.startsWith("-")) alreadyUpstream += 1;
    }

    branches.push({
      branch,
      tip: tip.out.trim(),
      mergeBase: mergeBaseShort.out.trim(),
      outstanding,
      alreadyUpstream,
      worktreeRegistered: worktreeBranches.has(branch),
    });
  }

  return { ok: true, branches, ...aggregateLaneBranches(branches) };
}

// ==========================================================================
// Top-level collection — one pass, two renderers
// ==========================================================================

export async function collectAll({ matrix = {}, backlog = {}, verification = {}, repo = {}, laneBranches = {} } = {}) {
  return {
    matrix: collectMatrix(matrix),
    backlog: collectBacklog(backlog),
    verification: await collectVerification(verification),
    repo: collectRepo(repo),
    laneBranches: collectLaneBranches(laneBranches),
  };
}

// ==========================================================================
// Renderer — human text (default) or `--json` (same collected object)
// ==========================================================================

// An ABSENT collector result is the third answer too, and this handled only
// the `ok:false` half until 2026-08-15 — a missing key threw
// `Cannot read properties of undefined`, taking the WHOLE report down rather
// than the one line that could not be answered. Found by adding a collector:
// two pre-existing bites build their `repo` object by hand and did not know
// about the new key, which is the same shape as rendering a `--json` dump
// written by an older build. A report is a reader of last resort, so it
// degrades per line, never all at once; the reason names the absence rather
// than pretending a value.
function fmtVerdict(label, res, matchLine) {
  if (!res || typeof res !== "object") {
    return `${label}: COULD-NOT-VERIFY — collector absent from the data (older report, or never run)`;
  }
  if (!res.ok) return `${label}: COULD-NOT-VERIFY — ${res.reason}`;
  return matchLine(res);
}

function renderMatrix(m) {
  const lines = ["== matrix =="];
  if (!m.ok) {
    lines.push(`COULD-NOT-VERIFY — ${m.reason}`);
    return lines.join("\n");
  }
  const counts = Object.entries(m.enumCounts).map(([k, v]) => `${k}=${v}`).join(" ");
  lines.push(`${m.totalRows} row(s): ${counts}`);
  lines.push(`validation: ${m.validationFindings} finding(s)`);
  if (m.openResidual.length === 0) {
    lines.push("OPEN/RESIDUAL: none");
  } else {
    lines.push(`OPEN/RESIDUAL (${m.openResidual.length}, oldest first):`);
    for (const r of m.openResidual) {
      const residual = r.status === "RESIDUAL" ? ` residual="${r.residual}"` : "";
      lines.push(`  row ${r.row} ${r.status} date=${r.date ?? "?"} evidence=${r.evidence ?? "?"}${residual}`);
    }
  }
  return lines.join("\n");
}

function renderBacklog(b) {
  const lines = ["== backlog =="];
  if (!b.ok) {
    lines.push(`COULD-NOT-VERIFY — ${b.reason}`);
    return lines.join("\n");
  }
  lines.push(`READY head (${b.readyEntries.length}):`);
  if (b.readyEntries.length === 0) lines.push("  none");
  for (const e of b.readyEntries) {
    const age = e.age ? `${e.age} (body-derived)` : "unknown";
    lines.push(`  - [age: ${age}] ${e.headline}`);
  }
  lines.push(`PARKED: ${b.parkedCount}`);
  lines.push(`Record: ${b.recordCount === null ? "unknown (no \`## Record\` section)" : b.recordCount}`);
  lines.push(`ready-bar findings: ${b.readyBarFindingCount}`);
  return lines.join("\n");
}

function renderVerification(v) {
  const lines = ["== verification =="];
  lines.push(
    fmtVerdict(
      "gate",
      v.gate,
      (r) =>
        `gate: ok=${r.gateOk} failing=${r.failing} captures=${r.captures} finished=${r.finished} ` +
        `ageHours=${r.ageHours === null ? "unknown" : r.ageHours.toFixed(1)} ` +
        `records=${r.records === null ? "null" : JSON.stringify(r.records)}` +
        (r.ageHours !== null && r.ageHours > GATE_STALE_THRESHOLD_HOURS
          ? ` — STALE (>${GATE_STALE_THRESHOLD_HOURS}h)`
          : ""),
    ),
  );
  lines.push(
    fmtVerdict(
      "pin",
      v.pin,
      (r) =>
        `pin (HEAD:proxy vs dotfiles manifest): local=${r.local} manifest=${r.manifestPinned} -> ` +
        `${r.match ? "match" : "MISMATCH"}`,
    ),
  );
  lines.push(
    fmtVerdict(
      "fingerprint",
      v.fingerprint,
      (r) =>
        `fingerprint (proxy source vs /health): local=${r.local} health=${r.remote} -> ` +
        `${r.match ? "match" : "MISMATCH"}`,
    ),
  );
  return lines.join("\n");
}

// Text-renderer-only cap so a large list (115 dangling shas measured
// 2026-08-11) does not swamp the human-readable report; `--json` carries
// the full list untruncated, since the two renderers share one collected
// object and only the LAST step differs.
const RENDER_LIST_CAP = 15;
function capList(items) {
  if (items.length <= RENDER_LIST_CAP) return items.join(", ");
  const shown = items.slice(0, RENDER_LIST_CAP);
  return `${shown.join(", ")}, ... and ${items.length - RENDER_LIST_CAP} more`;
}

function renderRepo(r) {
  const lines = ["== repo =="];
  lines.push(
    fmtVerdict("unpushed", r.unpushed, (x) => {
      const head = `unpushed (origin/main..main): ${x.count}`;
      return x.count === 0 ? head : `${head}\n${x.commits.slice(0, RENDER_LIST_CAP).map((c) => `    ${c}`).join("\n")}`;
    }),
  );
  lines.push(
    fmtVerdict("rescue tags", r.rescueTags, (x) =>
      x.count === 0 ? "rescue/* tags: none" : `rescue/* tags (${x.count}): ${capList(x.tags)}`),
  );
  lines.push(
    fmtVerdict("dangling", r.dangling, (x) =>
      `dangling commits: ${x.totalDangling} total, ${x.unrescuedCount} unrescued (reachable from no ` +
      `\`rescue/*\` tag)${x.unrescuedCount ? ": " + capList(x.unrescued) : ""}`),
  );
  lines.push(
    fmtVerdict("worktrees", r.worktrees, (x) =>
      `worktrees: ${x.count} total, ${x.prunableCount} prunable` +
      (x.prunableCount ? ": " + capList(x.prunable.map((w) => w.path)) : "")),
  );
  lines.push(
    fmtVerdict("fixtures", r.fixtures, (x) =>
      `${DEFAULT_FIXTURES_DIR}: ${x.count} untracked file(s)` +
      (x.count ? `, oldest=${x.oldestMtime}, newest=${x.newestMtime}` : "")),
  );
  lines.push(
    fmtVerdict("protected captures", r.protectedCaptures, (x) =>
      x.count === 0
        ? "protected captures: none (no capture is pinned against eviction)"
        : `protected captures: ${x.count} file(s), ${(x.bytes / 1e6).toFixed(0)} MB of ` +
          `${(x.capBytes / 1e6).toFixed(0)} MB cap` +
          // An unaliased protected capture is the litter case: bytes held
          // against eviction under a name nothing can cite. Named here rather
          // than left to whoever reads the entry list.
          (x.unaliased ? `; ${x.unaliased} with NO alias — held bytes nothing can cite` : "") +
          `\n${capList(x.entries.map((e) => `${e.alias ?? "(no alias)"} ${(e.bytes / 1e6).toFixed(0)}MB`))}`),
  );
  return lines.join("\n");
}

function renderLaneBranches(lb) {
  const lines = ["== lane branches =="];
  lines.push(
    fmtVerdict("lane branches", lb, (x) =>
      `lane branches: ${x.branchCount} branch(es), ${x.totalOutstanding} outstanding commit(s), ` +
      `${x.branchesWithWork} with work, ${x.orphanedWithWork} orphaned-with-work (no registered worktree)` +
      (x.orphanedWithWork
        ? ": " + capList(x.branches.filter((b) => b.outstanding > 0 && !b.worktreeRegistered).map((b) => b.branch))
        : "")),
  );
  return lines.join("\n");
}

export function renderText(data) {
  return [
    renderMatrix(data.matrix),
    "",
    renderBacklog(data.backlog),
    "",
    renderVerification(data.verification),
    "",
    renderRepo(data.repo),
    "",
    renderLaneBranches(data.laneBranches),
    "",
  ].join("\n");
}

// ==========================================================================
// CLI
// ==========================================================================

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const asJson = process.argv.includes("--json");
  collectAll()
    .then((data) => {
      process.stdout.write(asJson ? JSON.stringify(data, null, 2) + "\n" : renderText(data));
      process.exit(0);
    })
    .catch((e) => {
      process.stderr.write(`state-report failed: ${e?.stack ?? e}\n`);
      process.exit(1);
    });
}
