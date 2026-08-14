// The both-zones class has no mechanism at the ALTITUDE the defect lives at:
// the PRINTED OUTPUT (BACKLOG, ref 8d52837). `82372db` fixed the sites a
// human found by reading source (grep for the `toISOString`/render-call
// pattern, plus running each tool's --json path); nothing stops the next
// unconverted site, because a source-level grep undercounts at the FILE
// level (a pass-through the pattern never named) and again at the LINE
// level inside a file already in scope (a second call site the same file's
// own sweep pass skipped).
//
// This file complements, and does not duplicate, `test/local-stamp.test.mjs`
// (82372db): that file bites the shared renderer and a handful of
// FUNCTIONS directly (listRows, fallbackNote, scanLive). This file EXECUTES
// each converted tool as a real subprocess over a fixture and reads the
// actual bytes on stdout (and, where a tool's real output is a FILE rather
// than stdout, the file it writes) — the altitude a source-level or
// function-level check cannot reach, because the printed line is assembled
// from several pieces (a helper's return value, string concatenation, a
// forgotten call site) that only exist together once the tool actually runs.
//
// TWO ARMS, the same mistake in both directions:
//   ARM 1 — a human-facing (TEXT-mode) line carries a bare UTC instant
//           (`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}`) with no `(HH:MM local)` on the
//           same line. The class 82372db fixed; this catches the next one.
//   ARM 2 — a machine-read (--json, or a tool's only reachable machine-read
//           mode) payload carries the text "local" at all — the mirror
//           mistake, gluing a local suffix onto a field another tool parses.
//
// OVER-FIRING CONTROL (declared as data this file checks, never as a
// softened regex — dev-loop.md, "A check that fires on a non-defect is
// failing too"): `dossier`'s own stdout line names the file it just wrote,
// and that filename embeds the requested timestamp (`dossier-<iso>.md`,
// tools/dossier.mjs:462). It does not need an exemption CLAUSE in the
// scanner — the sanitizing call (`iso(tsEpoch).replace(/[:.]/g, "-")`)
// already strips the colon ARM 1's own regex requires — but "it happens not
// to match" is not the same claim as "the exclusion is checked": the test
// below proves it by asserting the regex DOES match the unsanitized stamp
// the filename is built from, and does NOT match the filename itself, so
// the sanitizing code is what is being tested, not an assumption about it.
//
// SEVEN TOOLS, each dispositioned individually (BACKLOG mandate) rather than
// swept by one pattern-scoped count — dev-loop.md's own warning about a
// sweep inheriting its pattern's blind spot applies here as much as to any
// other class: bust-triage, dossier, gate-live, restart-exposure,
// cost-report, quota-analysis, usage-to-dashboard-ndjson.
//
// FOUND STILL-WRONG while building this check, and FIXED in `f9ec558` — the
// two sites below were live defects on this tree when the check first ran,
// which is this file's own red-first proof. Both were verified LIVE by
// running the tool over a fixture and reading its actual stdout (dev-loop.md,
// "CLOSING is established against the WORLD, never against a document that
// says it is closed") — not asserted from reading the source or trusting
// 82372db's own commit message that the sweep was complete. The citations
// stay because they are the evidence that this check works; they are written
// in the past tense because the defects are gone, and every line number below
// still points at its site (`f9ec558` repaired at the emit boundary, not by
// editing these lines).
//
//   82372db's message says it "converts two 'pattern is not the class'
//   pass-through sites the toISOString sweep alone would have missed"
//   (quota-analysis's Time range, cost-report's per-call columns) — but its
//   grep-based sweep missed a THIRD, identical-shape instance:
//   `capturePairResult` in tools/bust-triage.mjs (the "capture" triage
//   step) printed `pair.before.ts` / `pair.after.ts` and the computed `span`
//   RAW, never calling `localSuffix`, at four sites: tools/bust-triage.mjs
//   :702/713-714 (window-not-covered), :720-721 (no-candidate), :774-775
//   (no-pair-in-conversation), and :1562 (the success path — the "OK
//   capture" line printed on every clean triage). tools/dossier.mjs's
//   `step3Bytes` (:167) read the same pair and printed it the same raw way,
//   in what the file's own header comment calls "the dossier body a person
//   reads" (tools/dossier.mjs:82) — so it was not a diagnostic-only path,
//   it was the working artifact's own body.
//
//   ARM 1 went RED on both of those — reproduced against live fixtures
//   further down, not asserted from reading the source. That was this check
//   doing its job, not a bug in the check: 82372db's own "suite green"
//   premise did not hold for these two files, and the check that would have
//   shown it did not exist, which is exactly why this file exists.
//
//   `f9ec558` repaired them at the single TEXT emit site in each tool
//   (`withLocalStamps`, local-stamp.mjs) rather than inside the composed
//   `span` string, which `--json` reads verbatim — one call per tool covers
//   every stamp beneath it. The two assertions carried `{ todo }` while
//   `tools/` sat outside the authoring lane's write boundary; the markers
//   were removed with the fix, because a todo test reports neither pass nor
//   fail and a todo left standing guards nothing. Both are plain, gating
//   bites now.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { tmpDirSync } from "../tools/tmpdir.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const NODE = process.execPath;

// The defect-class regex, exactly as specified (BACKLOG, ref 8d52837): a
// bare UTC instant with no local pairing anywhere on the same line.
const BARE_STAMP = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const LOCAL_PAIRED = /\(\d{2}:\d{2} local\)/;

/**
 * ARM 1 core: every line of `text` that carries a bare UTC instant must also
 * carry `(HH:MM local)` on the SAME line. `label` names the tool in the
 * failure so a red run says which of the seven broke, per the mandatory
 * accounting — never a bare "line N" with no owner.
 */
function assertLocalPaired(label, text) {
  const lines = text.split("\n");
  for (const line of lines) {
    if (!BARE_STAMP.test(line)) continue;
    assert.match(line, LOCAL_PAIRED,
      `${label}: bare UTC stamp with no local pairing: ${JSON.stringify(line)}`);
  }
}

/**
 * ARM 2 core: a machine-read payload must never carry the literal text
 * "local" — that is the mirror mistake (a local suffix glued onto a field
 * another tool parses). Checked as plain substring text, not the ARM 1
 * regex: JSON/NDJSON payloads are FULL of legitimate bare timestamp fields
 * (ts_start, timestamp, meta.timeStart, …) by design — that is what
 * "machine-read" means — so ARM 2 asks a different question than ARM 1, not
 * the same question with an exemption bolted on.
 */
function assertNoLocalText(label, text) {
  assert.ok(!text.includes("local"),
    `${label}: machine-read output carries the text "local" — a local suffix ` +
    `leaked into a payload another tool parses`);
}

function run(bin, args, { cwd = REPO, ...env } = {}) {
  try {
    return execFileSync(NODE, [bin, ...args], {
      cwd, env: { ...process.env, ...env }, encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
    });
  } catch (e) {
    // Several of these tools exit non-zero on a legitimate "found nothing to
    // clean" verdict (gate-live: no proving row) or a synthetic fixture the
    // tool's own logic still classifies as unresolved (bust-triage:
    // UNCLASSIFIED). Exit code is not what this file is testing; the printed
    // bytes are, and a child that wrote to stdout before exiting non-zero
    // still wrote real output.
    if (typeof e.stdout === "string") return e.stdout;
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 1. bust-triage
// ─────────────────────────────────────────────────────────────────────────

const BT = join(REPO, "tools", "bust-triage.mjs");

function btFixture() {
  const home = tmpDirSync("tos-bt-home-");
  const caps = tmpDirSync("tos-bt-caps-");
  mkdirSync(join(home, ".local", "share", "claude-worktime"), { recursive: true });
  const sid = "TOSPROBE1";
  const atIso = "2026-08-05T09:09:59Z";
  const atSec = Math.floor(Date.parse(atIso) / 1000);
  writeFileSync(join(home, ".local", "share", "claude-worktime", "activity.jsonl"),
    JSON.stringify({ type: "cold", k: "hit", t: atSec, s: sid, cc: 20000, ctx: 2, gap: 25, cause: "other" }) + "\n");
  const msg = (role, text) => ({ role, content: [{ type: "text", text }] });
  const before = [msg("user", "HEAD"), msg("assistant", "B"), msg("user", "C")];
  const after = [...before, msg("assistant", "D2")];
  writeFileSync(join(caps, `s-${sid}-requests.jsonl`), [
    JSON.stringify({ ts: "2026-08-05T09:09:54.362Z", body: { messages: before, tools: [] } }),
    JSON.stringify({ ts: "2026-08-05T09:09:58.626Z", body: { messages: after, tools: [] } }),
  ].join("\n") + "\n");
  return { home, caps, atIso };
}

test("bust-triage ARM 1 — --list rows carry local pairing on every bare stamp (positive control)", () => {
  const { home } = btFixture();
  const out = run(BT, ["--list"], { HOME: home });
  assertLocalPaired("bust-triage --list", out);
  // Sanity the fixture actually produced a row to check: --list renders its
  // own stamp via `fmt()` (space-separated, "2026-08-05 09:09:59Z"), which
  // never matches ARM 1's regex (it requires a literal "T") regardless of
  // local pairing — that is a DIFFERENT, already-safe rendering, not a gap
  // this file's regex is built to see. So the sanity check here is on the
  // local-paired text itself, not on BARE_STAMP matching.
  assert.match(out, LOCAL_PAIRED, "fixture produced no local-paired row to check");
});

/* FIXED at the desk 2026-08-08. The lane that wrote this test could not: tools/
   was outside its write boundary, so it landed the finding as a LIVE todo rather
   than silencing it, which was the right call. The repair is at the single TEXT
   emit site, not in the composed string: that detail is also read verbatim by
   --json, so local-stamp.mjs's withLocalStamps adds the local half on the way out
   and the stored value stays bare. The todo marker is REMOVED because a todo test
   reports neither pass nor fail, so it would have guarded nothing. */
test("bust-triage ARM 1 — default triage output, capture step carries both zones",
  () => {
    const { home, caps, atIso } = btFixture();
    const out = run(BT, ["--at", atIso], { HOME: home, CACHE_FIX_CAPTURE_DIR: caps });
    // Sanity: the fixture must actually reach the capture step, or this test
    // would pass todo-vacuously and prove nothing either way.
    assert.match(out, /capture\s+2026-08-05T09:09:54\.362Z/,
      `fixture did not reach the capture step: ${out}`);
    assertLocalPaired("bust-triage --at (text)", out);
  });

test("bust-triage ARM 2 — --json output carries no local text", () => {
  const { home, caps, atIso } = btFixture();
  const out = run(BT, ["--at", atIso, "--json"], { HOME: home, CACHE_FIX_CAPTURE_DIR: caps });
  const parsed = JSON.parse(out); // must be valid JSON, not just "no 'local' text"
  assert.ok(parsed.steps?.some((s) => s.step === "capture"), "fixture did not reach the capture step");
  assertNoLocalText("bust-triage --json", out);
});

// ─────────────────────────────────────────────────────────────────────────
// 2. dossier — no --json flag (ARM 2 does not apply; documented, not
//    silently skipped). Its real output is a FILE, not stdout: stdout only
//    carries a one-line summary naming the file. Both are read below,
//    because the file is "the dossier body a person reads" per the tool's
//    own header comment — the altitude this whole check exists for.
// ─────────────────────────────────────────────────────────────────────────

const DOSSIER = join(REPO, "tools", "dossier.mjs");

function dossierFixture() {
  const home = tmpDirSync("tos-ds-home-");
  const caps = tmpDirSync("tos-ds-caps-");
  const cwd = tmpDirSync("tos-ds-cwd-");
  mkdirSync(join(home, ".local", "share", "claude-worktime"), { recursive: true });
  const sid = "TOSPROBE2";
  const atIso = "2026-08-05T09:09:59Z";
  const atSec = Math.floor(Date.parse(atIso) / 1000);
  writeFileSync(join(home, ".local", "share", "claude-worktime", "activity.jsonl"),
    JSON.stringify({ type: "cold", k: "hit", t: atSec, s: sid, cc: 20000, ctx: 2, gap: 25, cause: "other" }) + "\n");
  const msg = (role, text) => ({ role, content: [{ type: "text", text }] });
  const before = [msg("user", "HEAD"), msg("assistant", "B"), msg("user", "C")];
  const after = [...before, msg("assistant", "D2")];
  writeFileSync(join(caps, `s-${sid}-requests.jsonl`), [
    JSON.stringify({ ts: "2026-08-05T09:09:54.362Z", body: { messages: before, tools: [] } }),
    JSON.stringify({ ts: "2026-08-05T09:09:58.626Z", body: { messages: after, tools: [] } }),
  ].join("\n") + "\n");
  return { home, caps, cwd, atIso, atSec };
}

test("dossier ARM 2 — no --json flag exists on this tool (documented N/A, not a silent skip)", () => {
  // A negative existence claim ("this CLI accepts no --json flag") is a fact
  // about dossier's OWN argument parsing, not about behaviour a fixture run
  // could exercise — read per the corpus's "Definitions" rule rather than
  // asserted from a run that could pass vacuously (e.g. an error path that
  // never reaches argument-dependent output). `main()`'s own arg handling
  // (`args.indexOf("--out")`, `args.includes("--no-gh")`, `args.indexOf("--window")`,
  // `args.includes("--last")`) is the complete list; "--json" is used exactly
  // once in the file, as a literal `gh search --json <fields>` CLI argument
  // (tools/dossier.mjs:238), never as a flag dossier's own argv parsing reads.
  const src = readFileSync(DOSSIER, "utf8");
  const jsonMentions = [...src.matchAll(/--json/g)];
  assert.equal(jsonMentions.length, 1,
    "expected exactly the one known `gh search --json` mention — a new one means this note is stale");
  assert.match(src, /"--limit", "5", "--json", "repository,number,title,state,url"/,
    "the sole \"--json\" mention moved out of the gh-search args array — re-check whether dossier now has its own --json flag");
});

test("dossier — over-firing control: the stdout summary line names an output FILENAME, " +
     "which the regex correctly does not fire on (checked structurally, not assumed)", () => {
  const { home, caps, cwd, atSec } = dossierFixture();
  const out = run(DOSSIER, ["--last", "--no-gh"], { cwd, HOME: home, CACHE_FIX_CAPTURE_DIR: caps });
  const line = out.split("\n").find((l) => l.startsWith("dossier: "));
  assert.ok(line, `no "dossier: <path>" summary line: ${out}`);
  const path = line.slice("dossier: ".length);
  // The claim under test: the filename is built from the SAME instant as the
  // dossier body (so it legitimately "carries a bare stamp" in spirit), and
  // still does not match ARM 1's regex — because the sanitizing call strips
  // the colon the regex requires. Prove both halves, not just the second.
  const rawIso = new Date(atSec * 1000).toISOString();
  assert.match(rawIso, BARE_STAMP, "control invalid: the raw instant itself must match the regex");
  assert.doesNotMatch(path, BARE_STAMP,
    `filename unexpectedly matches the bare-stamp regex: ${path}`);
  assert.match(path, /dossier-2026-08-05T09-09-59/, "filename must still be built from the requested instant");
});

test("dossier ARM 1 — the rendered dossier BODY (the file, not just stdout) — clean evidence classes",
  () => {
    const { home, caps, cwd } = dossierFixture();
    run(DOSSIER, ["--last", "--no-gh"], { HOME: home, CACHE_FIX_CAPTURE_DIR: caps, cwd });
    const files = readdirSync(cwd);
    assert.equal(files.length, 1, `expected exactly one dossier file, got: ${files.join(", ")}`);
    const body = readFileSync(join(cwd, files[0]), "utf8");
    // Sanity: step 1 (worktime) must be PRESENT with a real stamp, or the
    // fixture is broken and every assertion below is vacuous.
    assert.match(body, /## 1\. Magnitude.*PRESENT/, `step 1 not PRESENT: ${body}`);
    // Only the step-1 line and the header/requested-stamp lines are asserted
    // clean here — step 3 (capture pair) was the KNOWN gap when this file was
    // written and got its own isolated bite below, so this test stayed a real
    // gating check on the parts that were already clean instead of being
    // swallowed by the one part that was not. `f9ec558` fixed step 3; the
    // split stays because the two bites name different sites on a red run.
    const withoutStep3 = body.split("## 3.")[0];
    assertLocalPaired("dossier body (steps 1-2, header)", withoutStep3);
  });

/* FIXED at the desk 2026-08-08, same repair shape: the whole rendered dossier body
   is prose nobody parses (the output FILENAME keeps its bare UTC stamp and is
   composed elsewhere), so one withLocalStamps pass at the render return covers
   step 3 AND the step 2 / step 4 table rows this lane named as reached but never
   exercised — closing its own NOT-VERIFIED slot. */
test("dossier ARM 1 — step 3 (capture pair) carries both zones",
  () => {
    const { home, caps, cwd } = dossierFixture();
    run(DOSSIER, ["--last", "--no-gh"], { HOME: home, CACHE_FIX_CAPTURE_DIR: caps, cwd });
    const files = readdirSync(cwd);
    const body = readFileSync(join(cwd, files[0]), "utf8");
    const step3 = body.split("## 3.")[1]?.split("## 4.")[0] ?? "";
    assert.match(step3, /2026-08-05T09:09:54\.362Z/, `fixture did not reach step 3: ${body}`);
    assertLocalPaired("dossier body (step 3)", step3);
  });

// NAMED GAP, not silently dropped: dossier's step 2 (prefix-diff ledger,
// tools/dossier.mjs:326 `| ${r.ts} | ...`) and step 4 (transcript pointers,
// :356 `| ${h.line} | ${h.ts} | ...`) print raw per-row timestamps in
// markdown tables and are NOT exercised here — no fixture was built for the
// prefix-diff event-log format (SNAPSHOTS dir) or the CC transcript format
// (PROJECTS dir), so both evidence classes render ABSENT in the fixture
// above rather than PRESENT. Whether those table rows are in-scope for the
// both-zones policy (a data table vs. narrative prose) was surfaced for the
// dispatcher rather than silently assumed either way, and adjudicated IN
// scope: `f9ec558`'s single `withLocalStamps` pass at dossier's render return
// covers them along with step 3. They are still not EXERCISED here — that
// needs the two missing fixtures named above, which is what would turn this
// note into a bite.

// ─────────────────────────────────────────────────────────────────────────
// 3. gate-live — every path is redirectable, so a real sweep runs entirely
//    inside temp dirs. Its "--json" equivalent is the status.json file and
//    the fire-ledger JSONL line it appends — there is no --json CLI flag.
// ─────────────────────────────────────────────────────────────────────────

const GATE_LIVE = join(REPO, "tools", "gate-live.mjs");

function gateLiveFixture() {
  const base = tmpDirSync("tos-gl-");
  const captures = join(base, "captures");
  const snapshots = join(base, "snapshots");
  const transcripts = join(base, "projects");
  mkdirSync(captures, { recursive: true });
  mkdirSync(snapshots, { recursive: true });
  mkdirSync(transcripts, { recursive: true });
  const msg = (role, text) => ({ role, content: [{ type: "text", text }] });
  const line = (ts, id, messages) => JSON.stringify({
    ts, id, sid: "tos-gl-0001", key: "s-tos-gl-0001", headers: {},
    body: { model: "claude-x", messages },
  });
  writeFileSync(join(captures, "s-tos-gl-0001-requests.jsonl"), [
    line("2026-08-08T10:00:00.000Z", "r1", [msg("user", "hello"), msg("assistant", "hi")]),
    line("2026-08-08T10:00:05.000Z", "r2", [msg("user", "hello"), msg("assistant", "hi"), msg("user", "again")]),
  ].join("\n") + "\n");
  return {
    captures, snapshots, transcripts,
    status: join(base, "status.json"),
    fireLedger: join(base, "fire.jsonl"),
  };
}

test("gate-live ARM 1 — a real sweep's stdout carries local pairing on every bare stamp", () => {
  const f = gateLiveFixture();
  const out = run(GATE_LIVE, [
    "--captures", f.captures, "--status", f.status, "--fire-ledger", f.fireLedger,
    "--snapshots", f.snapshots, "--transcripts", f.transcripts,
  ], {});
  // Sanity: the fire-ledger summary line (the one site that prints a
  // timestamp) must actually appear, or this passes vacuously.
  assert.match(out, /absorbed window/, `fixture did not reach the fire-ledger summary: ${out}`);
  assertLocalPaired("gate-live sweep (stdout)", out);
});

test("gate-live ARM 2-equivalent — status.json and the fire-ledger line carry no local text " +
     "(this tool has no --json flag; these ARE its machine-read output)", () => {
  const f = gateLiveFixture();
  run(GATE_LIVE, [
    "--captures", f.captures, "--status", f.status, "--fire-ledger", f.fireLedger,
    "--snapshots", f.snapshots, "--transcripts", f.transcripts, "--quiet",
  ], {});
  const status = readFileSync(f.status, "utf8");
  JSON.parse(status); // must be valid JSON
  assertNoLocalText("gate-live status.json", status);
  const fireLine = readFileSync(f.fireLedger, "utf8").trim();
  const parsedFire = JSON.parse(fireLine);
  assert.ok(parsedFire.windowFrom, "fixture did not produce a fire-ledger line to check");
  assertNoLocalText("gate-live fire-ledger line", fireLine);
});

// ─────────────────────────────────────────────────────────────────────────
// 4. restart-exposure — read-only over CACHE_FIX_CAPTURE_DIR, no writes at
//    all in either mode.
// ─────────────────────────────────────────────────────────────────────────

const RESTART_EXPOSURE = join(REPO, "tools", "restart-exposure.mjs");

function restartExposureFixture() {
  const caps = tmpDirSync("tos-re-caps-");
  writeFileSync(join(caps, "s-tosreprobe-requests.jsonl"), JSON.stringify({
    ts: new Date().toISOString(),     body: {
      model: "claude-x", system: [], tools: [],
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] },
        { role: "assistant", content: [{ type: "text", text: "hello" }] }],
    },
  }) + "\n");
  return { caps };
}

test("restart-exposure ARM 1 — text output carries local pairing on every bare stamp", () => {
  const { caps } = restartExposureFixture();
  const out = run(RESTART_EXPOSURE, [], { CACHE_FIX_CAPTURE_DIR: caps });
  assert.match(out, /live sessions in the last/, `unexpected output: ${out}`);
  assert.match(out, BARE_STAMP, "fixture produced no timestamped row to check");
  assertLocalPaired("restart-exposure (text)", out);
});

test("restart-exposure ARM 2 — --json output carries no local text", () => {
  const { caps } = restartExposureFixture();
  const out = run(RESTART_EXPOSURE, ["--json"], { CACHE_FIX_CAPTURE_DIR: caps });
  const parsed = JSON.parse(out);
  assert.equal(parsed.rows.length, 1, "fixture did not produce a row to check");
  assertNoLocalText("restart-exposure --json", out);
});

// ─────────────────────────────────────────────────────────────────────────
// 5. cost-report — default rates path (bundled tools/rates.json, read-only,
//    no network) with --file pointed at a fixture; no --live-rates,
//    --update-rates or --admin-key, so no fetch() and no write.
// ─────────────────────────────────────────────────────────────────────────

const COST_REPORT = join(REPO, "tools", "cost-report.mjs");

function costReportFixture() {
  const dir = tmpDirSync("tos-cr-");
  const file = join(dir, "usage.jsonl");
  writeFileSync(file, [
    JSON.stringify({
      timestamp: "2026-08-05T09:00:00.000Z", model: "claude-sonnet-4-5-20250929",
      input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 500, cache_creation_input_tokens: 0,
    }),
  ].join("\n") + "\n");
  return { file };
}

test("cost-report ARM 1 — text output carries local pairing on every bare stamp", () => {
  const { file } = costReportFixture();
  const out = run(COST_REPORT, ["--file", file], {});
  assert.match(out, BARE_STAMP, "fixture produced no timestamped row to check");
  assertLocalPaired("cost-report (text)", out);
});

test("cost-report ARM 2 — --json output carries no local text", () => {
  const { file } = costReportFixture();
  const out = run(COST_REPORT, ["--file", file, "--json"], {});
  const parsed = JSON.parse(out);
  assert.equal(parsed.calls.length, 1, "fixture did not produce a call to check");
  assertNoLocalText("cost-report --json", out);
});

// ─────────────────────────────────────────────────────────────────────────
// 6. quota-analysis — the RED-FIRST example the BACKLOG entry names by
//    name. Manually reverted and restored before this commit (dispatcher
//    procedure, not an automated self-mutating test — the write boundary
//    forbids leaving tools/ touched even transiently inside a test run):
//
//      $ git diff tools/quota-analysis.mjs   # before the revert: clean
//      -- reverted "Time range" to drop ` ${localSuffix(...)}` on both lines --
//      $ node tools/quota-analysis.mjs --file <fixture>
//      Time range:       2026-08-05T09:00:00.000Z
//                   ->    2026-08-05T10:00:00.000Z
//      -- bare stamps, no "(HH:MM local)" — RED, reproduced verbatim --
//      -- restored; `git status`/`git diff` confirmed byte-identical to HEAD --
//
//    The bites below run against the CURRENT (fixed) tree and must be
//    GREEN — they are what would have caught the reverted state red, named
//    by tool ("quota-analysis"), had it shipped.
// ─────────────────────────────────────────────────────────────────────────

const QUOTA_ANALYSIS = join(REPO, "tools", "quota-analysis.mjs");

function quotaAnalysisFixture() {
  const dir = tmpDirSync("tos-qa-");
  const file = join(dir, "usage.jsonl");
  writeFileSync(file, [
    { timestamp: "2026-08-05T09:00:00.000Z", q5h_pct: 10, input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 500, cache_creation_input_tokens: 0 },
    { timestamp: "2026-08-05T09:30:00.000Z", q5h_pct: 2, input_tokens: 900, output_tokens: 150, cache_read_input_tokens: 400, cache_creation_input_tokens: 0 },
    { timestamp: "2026-08-05T10:00:00.000Z", q5h_pct: 20, input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 600, cache_creation_input_tokens: 0 },
  ].map((r) => JSON.stringify(r)).join("\n") + "\n");
  return { file };
}

test("quota-analysis ARM 1 — text output carries local pairing on every bare stamp " +
     "(RED-FIRST site: dev-loop's 'Time range' display)", () => {
  const { file } = quotaAnalysisFixture();
  const out = run(QUOTA_ANALYSIS, ["--file", file], {});
  assert.match(out, /Time range:/, `unexpected output: ${out}`);
  assert.match(out, BARE_STAMP, "fixture produced no timestamped row to check");
  assertLocalPaired("quota-analysis (text)", out);
});

test("quota-analysis ARM 2 — --json output carries no local text", () => {
  const { file } = quotaAnalysisFixture();
  const out = run(QUOTA_ANALYSIS, ["--file", file, "--json"], {});
  const parsed = JSON.parse(out);
  assert.ok(parsed.meta?.timeStart, "fixture did not produce meta.timeStart to check");
  assertNoLocalText("quota-analysis --json", out);
});

// ─────────────────────────────────────────────────────────────────────────
// 7. usage-to-dashboard-ndjson — its ONLY side-effect-free, terminating
//    invocation is `--stdout` (dry-run: prints NDJSON, writes no files).
//    There is no --json flag; --stdout IS this tool's machine-read mode, so
//    it gets ARM 2's treatment (no "local" text), not ARM 1's — its output
//    is NDJSON consumed by fgrosswig's dashboard, not human-facing prose,
//    exactly the class local-stamp.mjs's own header says never calls the
//    module ("JSON, status files, ledgers, JSONL, wire query parameters").
//
//    EXPLICITLY SKIPPED, not silently: `--follow` mode's own log line
//    (tools/usage-to-dashboard-ndjson.mjs:363, `console.error([...] +
//    localSuffix(now) + ...)`) DOES use the shared helper correctly — but
//    exercising it means invoking `runFollow`, which calls
//    `process.stdin.resume()` and an `fs.watch()` that never resolves on
//    its own; there is no terminating, side-effect-free way to invoke it
//    from a test that must exit. The line was read, not executed: it is
//    already converted, so nothing here is a known gap — it is simply
//    unreachable by the invocation shape this file requires.
// ─────────────────────────────────────────────────────────────────────────

const USAGE_TO_DASHBOARD = join(REPO, "tools", "usage-to-dashboard-ndjson.mjs");

function usageToDashboardFixture() {
  const dir = tmpDirSync("tos-utd-");
  const file = join(dir, "usage.jsonl");
  writeFileSync(file, JSON.stringify({
    timestamp: "2026-08-05T09:00:00.000Z", model: "claude-sonnet-4-5-20250929",
    input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 500,
    cache_creation_input_tokens: 0, q5h_pct: 10,
  }) + "\n");
  return { file };
}

test("usage-to-dashboard-ndjson ARM 2-equivalent — --stdout NDJSON carries no local text " +
     "(no --json flag; --stdout is this tool's only machine-read mode)", () => {
  const { file } = usageToDashboardFixture();
  const out = run(USAGE_TO_DASHBOARD, ["--input", file, "--stdout"], {});
  const rec = JSON.parse(out.trim().split("\n")[0]);
  assert.ok(rec.ts_start, "fixture did not produce a translated record to check");
  assertNoLocalText("usage-to-dashboard-ndjson --stdout", out);
});
