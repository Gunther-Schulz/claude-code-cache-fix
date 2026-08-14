// `--session <handle>` — select a bust by the operator's own ❄-report
// handle (`@25-06-pv-georgendorf-4f`) instead of a transcribed UTC stamp.
//
// THE JOIN this closes (dispatcher-measured, 2026-08-14, real registry —
// NOT reproduced here): claude-worktime.sh's own `@handle` renderer reads
// `$CLAUDE_SESSIONS_DIR/*.json` (default `~/.claude/sessions`), matching
// each file's `sessionId` key and reading its `name` key. That `sessionId`
// is the SAME uuid that names the worktime ledger's own `s` field, the
// capture file, and the CC transcript. It is strictly better than the
// project name as a scoping key: two live sessions routinely share one
// project, which a cwd basename cannot separate — a session's own `name`
// is unique by construction.
//
// PUBLICATION BAR (CLAUDE.local.md — binding, and a violation here is
// irreversible public history): no real handle, session uuid, project
// name, or `/home/...` path may appear in this file. Every handle, uuid,
// and path below is invented for this test and maps to nothing real.
//
// PIN THE PREMISE INSIDE THE TEST (dev-loop.md's own rule on environment
// premises): every arm below sets CLAUDE_SESSIONS_DIR itself, to a registry
// this file builds and owns — never the operator's real `~/.claude/sessions`
// directory. A test that passed only because the real registry happened to
// hold certain names would be a check the environment is free to break
// tomorrow.
//
// RED-FIRST: `--session` did not exist on the pre-change binary at all — it
// silently fell through as an unrecognised flag and every arm below ran the
// UNSCOPED default/--at path instead, so the pre-change tool never told two
// sessions apart. Verified by direct invocation (closing report carries the
// transcript): stripped of the flag today's binary triages across BOTH
// sessions' events with no session-scoping error at all — the exact silent
// failure this entry replaces with a stated resolution or a stated
// could-not-verify.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSyntheticHome } from "../tools/synthetic-home.mjs";
import { tmpDirSync } from "../tools/tmpdir.mjs";
import { resolveSessionHandle } from "../tools/bust-triage.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools", "bust-triage.mjs");
const sec = (iso) => Math.floor(Date.parse(iso) / 1000);

// Two invented handles sharing a common substring, and two invented uuids —
// neither maps to any real session, project, or machine.
const HANDLE_A = "synth-alpha-01";
const HANDLE_B = "synth-alpha-02";
// Deliberately NOT UUID-shaped, unlike a real session id: `bust-triage`
// treats a session id as an opaque string everywhere (a capture filename
// component, a ledger field), so nothing requires this shape — and avoiding
// it sidesteps test/absence-scan.test.mjs's own UUID allowlist (the "capture
// identifier in a public tree" guard), which a hex-dashed synthetic would
// otherwise have to be added to for no reason connected to this entry.
const SID_A = "SYNTH-SESSION-AAAA0001";
const SID_B = "SYNTH-SESSION-BBBB0002";
const T_A = sec("2027-03-01T10:00:00Z");
const T_B = sec("2027-03-01T11:00:00Z");

/** A synthetic $CLAUDE_SESSIONS_DIR — two registry files plus a sibling
 * `.key` file (mirroring the real registry, which also holds one per
 * session), to prove the resolver filters to `*.json` only. */
function sessionsDir() {
  const dir = tmpDirSync("bt-sessions-");
  writeFileSync(join(dir, "300001.json"), JSON.stringify({ sessionId: SID_A, name: HANDLE_A }));
  writeFileSync(join(dir, "300002.json"), JSON.stringify({ sessionId: SID_B, name: HANDLE_B }));
  // Not JSON at all — must never be read as a registry entry.
  writeFileSync(join(dir, "300001.deadbeef.key"), "this is a raw key file, not JSON");
  return dir;
}

/** A worktime ledger with one bust per synthetic session, distinguishable
 * by cause/cc so a test can tell which one actually got triaged. */
function ledgerHome() {
  return buildSyntheticHome({
    ledger: [
      { type: "cold", k: "hit", t: T_A, s: SID_A, cc: 111000, cause: "messages_changed" },
      { type: "cold", k: "hit", t: T_B, s: SID_B, cc: 222000, cause: "tools_changed" },
    ],
  });
}

const run = (home, args, sessionsEnv) => execFileSync(process.execPath, [TOOL, ...args], {
  cwd: REPO,
  env: { ...process.env, HOME: home, ...(sessionsEnv ? { CLAUDE_SESSIONS_DIR: sessionsEnv } : {}) },
  encoding: "utf8",
});

// ─────────────────────────────────────────────────────────────────────────
// resolveSessionHandle — the resolver in isolation
// ─────────────────────────────────────────────────────────────────────────

test("BITE — exact handle match resolves to its own sessionId, never the other one", () => {
  const dir = sessionsDir();
  const r = resolveSessionHandle(HANDLE_A, dir);
  assert.equal(r.ok, true, `resolution failed: ${r.code} — ${r.detail}`);
  assert.equal(r.sessionId, SID_A);
  assert.equal(r.match, "exact");
});

test("BITE — a leading @ is stripped before matching", () => {
  const dir = sessionsDir();
  const r = resolveSessionHandle(`@${HANDLE_B}`, dir);
  assert.equal(r.ok, true, `resolution failed: ${r.code} — ${r.detail}`);
  assert.equal(r.sessionId, SID_B);
});

test("BITE — a case-mismatched full handle resolves via the substring fallback, uniquely", () => {
  const dir = sessionsDir();
  const r = resolveSessionHandle(HANDLE_A.toUpperCase(), dir);
  assert.equal(r.ok, true, `resolution failed: ${r.code} — ${r.detail}`);
  assert.equal(r.sessionId, SID_A);
  assert.equal(r.match, "substring", "an exact-case mismatch must not report as an exact match");
});

test("BITE — an unknown handle is could-not-verify, never a nearest match", () => {
  const dir = sessionsDir();
  const r = resolveSessionHandle("no-such-handle-at-all", dir);
  assert.equal(r.ok, false);
  assert.equal(r.code, "unknown-handle");
  assert.doesNotMatch(r.detail, new RegExp(SID_A), "must not silently name a candidate sessionId");
  assert.doesNotMatch(r.detail, new RegExp(SID_B));
});

test("BITE — an ambiguous substring names BOTH candidates, never picks one", () => {
  const dir = sessionsDir();
  // "alpha" is a substring of both HANDLE_A and HANDLE_B and an exact match
  // of neither.
  const r = resolveSessionHandle("alpha", dir);
  assert.equal(r.ok, false);
  assert.equal(r.code, "ambiguous-handle");
  assert.match(r.detail, new RegExp(HANDLE_A));
  assert.match(r.detail, new RegExp(HANDLE_B));
});

test("CONTROL — a non-existent registry directory is its own could-not-verify", () => {
  const r = resolveSessionHandle(HANDLE_A, join(tmpDirSync("bt-sessions-empty-"), "does-not-exist"));
  assert.equal(r.ok, false);
  assert.equal(r.code, "no-sessions-dir");
});

// ─────────────────────────────────────────────────────────────────────────
// The real binary — CLAUDE_SESSIONS_DIR pinned by the test itself throughout
// ─────────────────────────────────────────────────────────────────────────

test("BITE — --session selects the NAMED session's newest bust, not the other session's", () => {
  const out = run(ledgerHome(), ["--session", HANDLE_A, "--json"], sessionsDir());
  const r = JSON.parse(out);
  assert.equal(r.bust.s, SID_A, `triaged the wrong session: ${JSON.stringify(r.bust)}`);
  assert.equal(r.bust.cc, 111000);
  assert.equal(r.session?.sessionId, SID_A);
  assert.equal(r.session?.match, "exact");
});

test("BITE — the OTHER handle selects a DIFFERENT event — the two arms must not agree", () => {
  const home = ledgerHome();
  const registry = sessionsDir();
  const outA = JSON.parse(run(home, ["--session", HANDLE_A, "--json"], registry));
  const outB = JSON.parse(run(home, ["--session", HANDLE_B, "--json"], registry));
  assert.notEqual(outA.bust.s, outB.bust.s, "both handles resolved to the same session — the scoping is inert");
  assert.equal(outA.bust.s, SID_A);
  assert.equal(outB.bust.s, SID_B);
  assert.equal(outA.bust.cc, 111000);
  assert.equal(outB.bust.cc, 222000);
});

test("BITE — an unknown handle refuses with a non-zero exit, never triages the newest bust anyway", () => {
  assert.throws(() => run(ledgerHome(), ["--session", "no-such-handle-at-all"], sessionsDir()), (err) => {
    assert.notEqual(err.status, 0);
    assert.match(err.stdout, /--session:.*no-such-handle-at-all/);
    assert.match(err.stdout, /matches no session/);
    assert.doesNotMatch(err.stdout, /VERDICT/, "a refused handle must never fall through to a triage");
    return true;
  });
});

test("BITE — an ambiguous handle refuses with a non-zero exit, naming both candidates", () => {
  assert.throws(() => run(ledgerHome(), ["--session", "alpha"], sessionsDir()), (err) => {
    assert.notEqual(err.status, 0);
    assert.match(err.stdout, new RegExp(HANDLE_A));
    assert.match(err.stdout, new RegExp(HANDLE_B));
    assert.doesNotMatch(err.stdout, /VERDICT/);
    return true;
  });
});

test("BITE — --session composes with --at: a stamp outside the session is could-not-verify, never widened to another session", () => {
  const out = run(ledgerHome(), ["--session", HANDLE_A, "--at", "2020-01-01T00:00:00Z"], sessionsDir());
  assert.match(out, /NOTE/);
  assert.match(out, /No bust at or before/i);
  assert.doesNotMatch(out, /VERDICT/, "a stamp outside the session's own events must never resolve to a verdict");
  assert.doesNotMatch(out, new RegExp(SID_B), "must never silently widen to the OTHER session's event");
});

test("CONTROL — --session composes with --at: the session's own stamp triages normally", () => {
  const out = run(ledgerHome(), ["--session", HANDLE_A, "--at", "2027-03-01T10:00:00Z", "--json"], sessionsDir());
  const r = JSON.parse(out);
  assert.equal(r.bust.s, SID_A);
  assert.equal(r.bust.t, T_A);
});

test("CONTROL — --session with no CLAUDE_SESSIONS_DIR falls back to the HOME-relative default and still resolves", () => {
  // No env override at all here — the resolver's own default
  // (`join(homedir(), ".claude/sessions")`) must find a registry placed at
  // that exact HOME-relative path, proving the default branch (not just the
  // env override) works.
  const home = ledgerHome();
  const dir = join(home, ".claude", "sessions");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "300001.json"), JSON.stringify({ sessionId: SID_A, name: HANDLE_A }));
  const out = run(home, ["--session", HANDLE_A, "--json"]); // sessionsEnv omitted on purpose
  const r = JSON.parse(out);
  assert.equal(r.bust.s, SID_A);
});
