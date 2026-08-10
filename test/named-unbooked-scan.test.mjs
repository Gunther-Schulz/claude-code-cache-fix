// tools/named-unbooked-scan.mjs — unit coverage plus the red-first proof
// named in this tool's brief.
//
// ============================================================================
// KNOWN DEVIATION FROM THE BRIEF, recorded here rather than silently forced:
// the brief's class-2 red-first arrangement states "with --until 95f9c89,
// two of the three [misfire items] must resolve." Run for real against this
// repo's own history (the local session transcript carrying the
// three-misfire paragraph, plus commit 95f9c89), a
// content-matching resolver that is honestly discriminating (rejects
// prefix-only matches, rejects generic connector bigrams like "rather
// than") finds ZERO of the three textually present in 95f9c89's commit
// body or its BACKLOG.md diff — verified by reading the full diff
// (`git show 95f9c89 -- BACKLOG.md`, 149 lines): it contains neither
// "process-per-line"/"scan"/"timed out", nor "field name"/"jq"/"summary",
// nor "pipe"/"tail"/"$?", in any adjacent-word-pair form. Building a
// matcher that forces a 2-of-3 split here would mean either loosening the
// word-boundary/stopword discipline until it also mis-resolves the
// unrelated "clustering failed" bullet on nothing but the word "rather"
// (an actual bug hit and fixed while building this tool — see the "false
// resolve" test below), or hand-coding a special case for this one
// sentence — the exact "tuning an instrument to ratify its own premise"
// failure docs/dev-loop.md's "Adding a check" section names. So this suite
// pins the REAL, measured behavior (all three unresolved at both anchors)
// and this comment is the surfaced gap, per this tool's own brief:
// "Where you cannot make this discriminating, SURFACE IT AS A GAP rather
// than shipping a matcher that resolves everything or nothing."
// ============================================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { userInfo } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { tmpDirSync } from "../tools/tmpdir.mjs";
import {
  PATTERN_CLASSES,
  scanTranscript,
  assistantMessages,
  sessionWindow,
  extractSentence,
  distinctiveBigrams,
  findMatchingPhrase,
  detectGapLanguage,
  detectSelfCorrection,
  splitEnumeratedSubitems,
  resolveUntilDate,
  listCandidateCommits,
  commitBlob,
} from "../tools/named-unbooked-scan.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO, "tools/named-unbooked-scan.mjs");

// The two RED-FIRST cases live in THIS machine's own ~/.claude/projects
// transcript history (personal, un-versioned, never committed) — the same
// category of local-only dependency the repo's other machine-state tests
// already carry (a real commit SHA, a real git ref). What must NEVER land in
// this file is the transcript's SESSION UUID: `test/absence-scan.test.mjs`
// scans every tracked source file for exactly that shape ("a capture
// identifier in a public tree") and fails the build on one, which this test
// file itself tripped during development — real proof the guard is live and
// this indirection is required, not decorative. So the two transcripts are
// found by CONTENT, never named by path.
//
// NAMED RISK, not fixed here: unlike a git commit SHA, a transcript file is
// NOT an immutable repo-tracked reference — it is un-versioned personal data
// under this machine's ~/.claude/projects, and docs/dev-loop.md's "Adding a
// check" section names exactly this decay mode ("a red-first arrangement is
// anchored to an immutable reference, or it decays before it is built"). The
// more durable fix is a FROZEN excerpt of both transcripts under
// test/fixtures/ — out of reach here because this tool's brief scopes the
// write boundary to exactly tools/named-unbooked-scan.mjs and this file
// ("touch nothing else"). Surfaced as a follow-up, not silently absorbed.
//
// `os.userInfo().homedir`, NOT `os.homedir()` / `homedir()`: this suite's
// own `npm test` entrypoint globally redirects HOME to a sandboxed temp
// directory (tools/suite-config-root.mjs, `--import`-ed before any test file
// loads) specifically so tests never touch the operator's real `~/.claude`
// config or state. `os.homedir()` reads that overridden HOME and resolves
// inside the sandbox, where no transcript exists — hit for real while
// building this suite ("npm test" alone failed with "transcript not found").
// `os.userInfo().homedir` reads the OS password-database entry instead
// (verified: unaffected by an overridden HOME), which is what this file
// needs — a deliberate, read-only, documented exception to that sandbox for
// data the sandbox was never protecting in the first place (a Claude Code
// session transcript, not proxy/extension state).
const PROJECT_DIR = join(userInfo().homedir, ".claude", "projects", "-home-g-dev-vendor-claude-code-cache-fix");
const CLASS1_MARKER = "Two mistakes worth carrying forward as conduct, not rules";
const CLASS2_MARKER = "My own instruments misfired three times tonight";

// The first record's own `timestamp`, which is what orders transcripts by
// when the session HAPPENED — never file mtime, which a copy or a rsync
// rewrites without the session having changed.
function firstRecordTimestamp(raw) {
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const ts = JSON.parse(line)?.timestamp;
      if (ts) return ts;
    } catch { /* a partial line is not a record */ }
  }
  return "";
}

// EVERY match, then the OLDEST — never readdir's first.
//
// These needles are sentences ABOUT this check, so any later session that
// discusses it contains them too: the agent that built this file quoted the
// class-1 sentence into its closing report, that report landed in the
// dispatcher's own transcript, and within the hour the archive held TWO
// matches. Readdir order then selected the derivative one, and both class-1
// bites failed against a conversation that merely QUOTED the sentence rather
// than naming a gap in it. The bites passed in the agent's worktree and failed
// at the desk an hour later, from the same code over a changed archive.
//
// The ORIGINAL is the oldest match by first-record timestamp — a derivative
// can only be younger than what it quotes. `assertOriginalTranscript` below
// pins the resulting choice to its expected day, so a future archive that
// breaks this assumption fails loudly here instead of reappearing as an
// unexplained red in the bites.
function findTranscriptContaining(needle) {
  let files;
  try {
    files = readdirSync(PROJECT_DIR).filter((f) => f.endsWith(".jsonl"));
  } catch {
    return null;
  }
  const matches = [];
  for (const f of files) {
    const path = join(PROJECT_DIR, f);
    let raw;
    try {
      raw = readFileSync(path, "utf8");
    } catch {
      continue;
    }
    if (raw.includes(needle)) matches.push({ path, firstTs: firstRecordTimestamp(raw) });
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => a.firstTs.localeCompare(b.firstTs));
  return matches[0].path;
}

const CLASS1_TRANSCRIPT = findTranscriptContaining(CLASS1_MARKER);
const CLASS2_TRANSCRIPT = findTranscriptContaining(CLASS2_MARKER);
const MISFIRE_PARAGRAPH_TS = "2026-08-07T04:13:42.369Z";

// Loud, at load time — a silently-null transcript path would otherwise fail
// deep inside a subprocess with a confusing "cannot read" message instead of
// naming which local red-first case is missing.
if (!CLASS1_TRANSCRIPT) {
  throw new Error(
    `RED-FIRST class 1 transcript not found under ${PROJECT_DIR} (searched for the "conduct, not rules" ` +
      "sentence) — this machine's own ~/.claude/projects history is required for this suite's red-first proof.",
  );
}
if (!CLASS2_TRANSCRIPT) {
  throw new Error(
    `RED-FIRST class 2 transcript not found under ${PROJECT_DIR} (searched for the three-misfire paragraph) — ` +
      "this machine's own ~/.claude/projects history is required for this suite's red-first proof.",
  );
}

// The selection itself is a bite, not an assumption. Without it a wrong pick
// reappears as an unexplained red in the red-first bites below — which is
// exactly how it presented the first time, costing a desk run to diagnose.
// Declared as data the test checks: each red-first case names the DAY its
// original session ran, and the chosen transcript must start on that day.
const EXPECTED_ORIGINAL_DAY = [
  { label: "class 1 ('conduct, not rules')", path: CLASS1_TRANSCRIPT, day: "2026-08-06" },
  { label: "class 2 (three-misfire paragraph)", path: CLASS2_TRANSCRIPT, day: "2026-08-07" },
];

for (const { label, path, day } of EXPECTED_ORIGINAL_DAY) {
  test(`transcript selection: ${label} resolves to its ORIGINAL session, not a later one quoting it`, () => {
    const firstTs = firstRecordTimestamp(readFileSync(path, "utf8"));
    assert.equal(firstTs.slice(0, 10), day,
      `selected ${path}, which starts ${firstTs} — expected a session starting ${day}. ` +
      "A younger transcript matched the needle and sorted first: the needle is a sentence ABOUT " +
      "this check, so sessions discussing it also contain it.");
  });
}

function runTool(args) {
  try {
    const out = execFileSync(process.execPath, [TOOL, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? -1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

function runToolJson(args) {
  const r = runTool([...args, "--json"]);
  assert.equal(r.code, 0, `tool exited ${r.code}: ${r.out}`);
  return JSON.parse(r.out);
}

// --- Unit: extractSentence -------------------------------------------------

test("extractSentence: pulls the enclosing sentence, not the whole message", () => {
  const text = "First sentence here. Second sentence has the phrase worth booking in it. Third one.";
  const idx = text.indexOf("worth booking");
  const s = extractSentence(text, idx);
  assert.equal(s, "Second sentence has the phrase worth booking in it.");
});

// --- Unit: distinctiveBigrams / findMatchingPhrase --------------------------

test("findMatchingPhrase: word-bounded, does not match a bigram that is only a PREFIX of a carrier word", () => {
  // Regression pin for the real bug hit while building this tool: a plain
  // substring check let "demanded a" match inside "demanded as", because
  // "demanded a" is literally a prefix of "demanded as". \b on both ends
  // is what closes it.
  const hit = "I demanded a report that had already arrived.";
  // Isolated to ONLY the prefix collision ("demanded a" is a literal
  // substring of "demanded as..."): no "a report", no "already arrived",
  // no other real bigram from the hit appears here.
  const carrierWithOnlyPrefixWord = "The team demanded assistance immediately, before anything else happened.";
  assert.equal(findMatchingPhrase(hit, carrierWithOnlyPrefixWord), null);
});

test("findMatchingPhrase: DOES match a genuine word-bounded bigram", () => {
  const hit = "I demanded a report that had already arrived.";
  const carrier = "a report demanded and a follow-up were both sent";
  assert.equal(findMatchingPhrase(hit, carrier), "a report");
});

test("distinctiveBigrams: skips bigrams where neither word is content-length/non-stopword", () => {
  const bigrams = distinctiveBigrams("it was to be");
  assert.deepEqual(bigrams, []);
});

// --- Unit: gap-language phrase detection ------------------------------------

test("detectGapLanguage: fires once per phrase occurrence, class-1 patterns", () => {
  const msgs = [{ uuid: "u1", timestamp: "2026-01-01T00:00:00Z", text: "We should fix this. Also worth booking soon." }];
  const cls = PATTERN_CLASSES.find((c) => c.id === "gap-language");
  const hits = detectGapLanguage(msgs, cls);
  const matchedSet = new Set(hits.map((h) => h.matched.toLowerCase()));
  assert.ok(matchedSet.has("we should"));
  assert.ok(matchedSet.has("worth booking"));
});

test("detectGapLanguage: the DEVIATION phrase catches 'worth carrying forward', which the brief's literal list does not", () => {
  const cls = PATTERN_CLASSES.find((c) => c.id === "gap-language");
  assert.equal(cls.phrases.some((p) => typeof p === "string" && p === "i'd carry forward"), true);
  const msgs = [{ uuid: "u1", timestamp: "2026-01-01T00:00:00Z", text: "Two mistakes worth carrying forward as conduct." }];
  const hits = detectGapLanguage(msgs, cls);
  assert.ok(hits.length >= 1, "expected the widened 'carry(ing) forward' pattern to fire");
});

// --- Unit: self-correction-list detection -----------------------------------

test("detectSelfCorrection: does NOT fire on a single self-error bullet", () => {
  const msgs = [
    {
      uuid: "u1",
      timestamp: "2026-01-01T00:00:00Z",
      text: "- **I made a mistake here.** It cost an hour.\n\nEverything else went fine.",
    },
  ];
  const cls = PATTERN_CLASSES.find((c) => c.id === "self-correction-list");
  assert.deepEqual(detectSelfCorrection(msgs, cls), []);
});

test("detectSelfCorrection: fires on TWO OR MORE self-error bullets in one message", () => {
  const msgs = [
    {
      uuid: "u1",
      timestamp: "2026-01-01T00:00:00Z",
      text:
        "- **I made a mistake here.** It cost an hour.\n" +
        "- **My own instrument crashed too.** Nearly missed it.\n" +
        "Unrelated closing line.",
    },
  ];
  const cls = PATTERN_CLASSES.find((c) => c.id === "self-correction-list");
  const hits = detectSelfCorrection(msgs, cls);
  assert.equal(hits.length, 2);
});

test("splitEnumeratedSubitems: splits a 'N times ...: A, B, and C' bullet into N items", () => {
  const bullet =
    "- **My own instruments misfired three times tonight**: a process-per-line scan that timed out, " +
    "a jq querying a field name I took from a summary instead of the file, and `$?` after a pipe reporting `tail`. " +
    "The third one nearly let a crashing guard read as passing.";
  const items = splitEnumeratedSubitems(bullet);
  assert.equal(items.length, 3);
  assert.equal(items[0], "a process-per-line scan that timed out");
  assert.equal(items[1], "a jq querying a field name I took from a summary instead of the file");
  assert.equal(items[2], "`$?` after a pipe reporting `tail`");
});

test("splitEnumeratedSubitems: returns the whole bullet unchanged when there is no internal enumeration", () => {
  const bullet = "- **This bullet has no internal list at all.** Just prose.";
  assert.deepEqual(splitEnumeratedSubitems(bullet), [bullet]);
});

// --- Unit: transcript reading ------------------------------------------------

test("scanTranscript + assistantMessages: reads real record shape, skips non-assistant/non-text records", () => {
  const dir = tmpDirSync("named-unbooked-unit-");
  const path = join(dir, "t.jsonl");
  const lines = [
    JSON.stringify({ type: "last-prompt", leafUuid: "x", sessionId: "s" }),
    JSON.stringify({ type: "user", timestamp: "2026-01-01T00:00:00Z", sessionId: "s" }),
    JSON.stringify({
      type: "assistant",
      uuid: "a1",
      timestamp: "2026-01-01T00:01:00Z",
      sessionId: "s",
      message: { content: [{ type: "text", text: "we should book this" }] },
    }),
    "", // blank line, must be skipped without error
    "{not json", // malformed line, must be skipped without error
  ];
  writeFileSync(path, lines.join("\n"));
  try {
    const records = scanTranscript(path);
    assert.equal(records.length, 3); // the malformed + blank lines are dropped
    const msgs = assistantMessages(records);
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].text, "we should book this");
    const { start, end } = sessionWindow(records);
    assert.equal(start.toISOString(), "2026-01-01T00:00:00.000Z");
    assert.equal(end.toISOString(), "2026-01-01T00:01:00.000Z");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Unit: --until resolution -----------------------------------------------

test("resolveUntilDate: null when --until omitted", () => {
  assert.equal(resolveUntilDate(null, REPO), null);
});

test("resolveUntilDate: parses an ISO date directly", () => {
  const d = resolveUntilDate("2026-08-06T13:47:46.000Z", REPO);
  assert.equal(d.toISOString(), "2026-08-06T13:47:46.000Z");
});

test("resolveUntilDate: resolves a real commit-ish to its author date", () => {
  const d = resolveUntilDate("fc4b7aa", REPO);
  assert.equal(d.toISOString(), "2026-08-06T13:47:46.000Z");
});

test("resolveUntilDate: throws (operational failure) on a ref that does not resolve", () => {
  assert.throws(() => resolveUntilDate("not-a-real-ref-xyz", REPO));
});

// --- Unit: git carrier lookups against THIS repo's real history ------------

test("listCandidateCommits + commitBlob: fc4b7aa's own body is readable and contains its distinctive text", () => {
  const commits = listCandidateCommits(REPO, new Date("2026-08-06T13:40:00Z"), new Date("2026-08-06T13:50:00Z"));
  const found = commits.find((c) => c.sha.startsWith("fc4b7aa"));
  assert.ok(found, "expected fc4b7aa in the candidate window");
  const blob = commitBlob(REPO, found.sha);
  // Commit bodies are word-wrapped at ~72 chars, so "carry" and "forward"
  // land on different physical lines here — \s+ tolerates that; the real
  // findMatchingPhrase() already normalizes whitespace before comparing
  // (see the RED-FIRST tests below, which pass against this same commit).
  assert.match(blob, /conduct to carry\s+forward/);
});

// ============================================================================
// CLI-level RED-FIRST tests (the brief's verifier, run for real)
// ============================================================================

test("RED-FIRST class 1: 'conduct, not rules' sentence is UNRESOLVED before fc4b7aa", () => {
  const d = runToolJson(["--transcript", CLASS1_TRANSCRIPT, "--repo", REPO, "--until", "fc4b7aa^"]);
  const hit = d.hits.find((h) => h.sentence.includes("conduct, not rules"));
  assert.ok(hit, "expected the 'conduct, not rules' sentence to be detected as a hit");
  assert.equal(hit.resolved, false);
});

test("RED-FIRST class 1: 'conduct, not rules' sentence RESOLVES to fc4b7aa once --until reaches it", () => {
  const d = runToolJson(["--transcript", CLASS1_TRANSCRIPT, "--repo", REPO, "--until", "fc4b7aa"]);
  const hit = d.hits.find((h) => h.sentence.includes("conduct, not rules"));
  assert.ok(hit);
  assert.equal(hit.resolved, true);
  assert.equal(hit.resolvedBy, "fc4b7aa9dcc1675fae697da6cecb49beeff7ebc8");
});

test("RED-FIRST class 2: all three misfire items are UNRESOLVED at the paragraph's own timestamp", () => {
  const d = runToolJson(["--transcript", CLASS2_TRANSCRIPT, "--repo", REPO, "--until", MISFIRE_PARAGRAPH_TS]);
  const items = d.hits.filter(
    (h) =>
      h.class === "SELF-CORRECTION-LIST" &&
      (h.sentence.includes("process-per-line") || h.sentence.includes("jq querying") || h.sentence.includes("$?")),
  );
  assert.equal(items.length, 3, `expected 3 misfire items, got ${items.length}: ${JSON.stringify(items)}`);
  for (const h of items) assert.equal(h.resolved, false, h.sentence);
});

// See the KNOWN DEVIATION comment at the top of this file: the brief's
// stated "two of the three must resolve" at --until 95f9c89 does not
// reproduce under a discriminating content matcher — measured, not
// assumed. This test pins the REAL result instead of a forced one.
test("RED-FIRST class 2, MEASURED (deviation from brief): none of the three misfire items resolve by 95f9c89", () => {
  const d = runToolJson(["--transcript", CLASS2_TRANSCRIPT, "--repo", REPO, "--until", "95f9c89"]);
  const items = d.hits.filter(
    (h) =>
      h.class === "SELF-CORRECTION-LIST" &&
      (h.sentence.includes("process-per-line") || h.sentence.includes("jq querying") || h.sentence.includes("$?")),
  );
  assert.equal(items.length, 3);
  const resolvedCount = items.filter((h) => h.resolved).length;
  assert.equal(
    resolvedCount,
    0,
    "if this fails because resolvedCount is now 2, the matcher was likely loosened to fit the brief's " +
      "claim rather than to be independently discriminating — re-check against the diff evidence in " +
      "this file's header comment before changing the assertion",
  );
});

// --- Over-firing control (brief's verifier item 3) --------------------------
//
// A message using gap-language in ORDINARY explanation, with a real carrier
// present in the same session, must NOT appear in the unresolved report.
// Declared here as synthetic data (a throwaway git repo + a synthetic
// transcript), per the brief: "Declare the case IN the test as data the
// test checks."

function makeTempRepo() {
  const dir = tmpDirSync("named-unbooked-repo-");
  const git = (args, env) => execFileSync("git", args, { cwd: dir, encoding: "utf8", env: { ...process.env, ...env } });
  git(["init", "-q"]);
  git(["config", "user.email", "test@example.com"]);
  git(["config", "user.name", "Test"]);
  writeFileSync(join(dir, "README.md"), "seed\n");
  git(["add", "README.md"]);
  git(["commit", "-q", "-m", "seed"], {
    GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z",
    GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z",
  });
  return { dir, git };
}

test("over-firing control: ordinary-explanation gap-language WITH a real carrier does not appear as unresolved", () => {
  const { dir, git } = makeTempRepo();
  try {
    const hitTs = "2026-01-02T10:00:00.000Z";
    const commitTs = "2026-01-02T10:05:00.000Z";
    const endTs = "2026-01-02T10:10:00.000Z";

    const transcriptPath = join(dir, "transcript.jsonl");
    const lines = [
      JSON.stringify({ type: "user", timestamp: hitTs, sessionId: "s" }),
      JSON.stringify({
        type: "assistant",
        uuid: "a1",
        timestamp: hitTs,
        sessionId: "s",
        message: {
          content: [
            {
              type: "text",
              text:
                "Worth booking: harden the retry-queue against duplicate delivery before the next release. " +
                "That is just how this convention gets phrased in ordinary explanation.",
            },
          ],
        },
      }),
      JSON.stringify({ type: "user", timestamp: endTs, sessionId: "s" }),
    ];
    writeFileSync(transcriptPath, lines.join("\n"));

    writeFileSync(join(dir, "queue.md"), "Harden the retry-queue against duplicate delivery before the next release.\n");
    git(["add", "queue.md"]);
    git(["commit", "-q", "-m", "harden the retry-queue against duplicate delivery before the next release"], {
      GIT_AUTHOR_DATE: commitTs,
      GIT_COMMITTER_DATE: commitTs,
    });

    const d = runToolJson(["--transcript", transcriptPath, "--repo", dir]);
    const hit = d.hits.find((h) => h.sentence.includes("Worth booking"));
    assert.ok(hit, "expected the ordinary-explanation sentence to be detected as a gap-language hit");
    assert.equal(hit.resolved, true, "expected it to resolve against the real carrier commit and not appear as unresolved");

    const humanRun = runTool(["--transcript", transcriptPath, "--repo", dir]);
    assert.equal(humanRun.out.includes("Worth booking"), false, "must not appear in the unresolved WARN lines");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Operational-failure exit codes -----------------------------------------

test("CLI: missing --transcript is an operational failure (exit non-zero)", () => {
  const r = runTool(["--repo", REPO]);
  assert.notEqual(r.code, 0);
});

test("CLI: unreadable transcript path is an operational failure (exit non-zero)", () => {
  const r = runTool(["--transcript", "/no/such/file.jsonl", "--repo", REPO]);
  assert.notEqual(r.code, 0);
});

test("CLI: a --until ref that does not resolve is an operational failure (exit non-zero)", () => {
  const r = runTool(["--transcript", CLASS1_TRANSCRIPT, "--repo", REPO, "--until", "not-a-real-ref-xyz"]);
  assert.notEqual(r.code, 0);
});

// --- Examined-summary (never "nothing outstanding" over an empty enumeration)

test("human output always states what was examined, even with zero hits", () => {
  const { dir } = makeTempRepo();
  try {
    const transcriptPath = join(dir, "empty.jsonl");
    writeFileSync(
      transcriptPath,
      [
        JSON.stringify({ type: "user", timestamp: "2026-01-01T00:00:00Z", sessionId: "s" }),
        JSON.stringify({
          type: "assistant",
          uuid: "a1",
          timestamp: "2026-01-01T00:01:00Z",
          sessionId: "s",
          message: { content: [{ type: "text", text: "Nothing to report here at all." }] },
        }),
      ].join("\n"),
    );
    const r = runTool(["--transcript", transcriptPath, "--repo", dir]);
    assert.equal(r.code, 0);
    assert.match(r.out, /examined 1 assistant message\(s\)/);
    assert.match(r.out, /0 unresolved of 0 hit\(s\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
