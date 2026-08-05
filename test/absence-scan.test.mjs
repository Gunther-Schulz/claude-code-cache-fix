// absence-scan — the scanner's own bite.
//
// The classes it carries were extracted out of harvest-scrub-relations.test.mjs
// §6, where they assert the ABSENCE of a defect over a corpus that is clean.
// That shape cannot bite itself: a neutered predicate over a clean corpus still
// passes, so "the suite is green" says nothing about whether the extraction
// kept the classes alive. What proves a class alive is a SEEDED defect — one
// synthetic document per class, each of which must produce exactly its own
// finding. That is what the first section does, and it is the guarantee the
// extraction needed.
//
// The rest exercises the CLI contract the pre-push hook in the dotfiles repo
// depends on: exit 2 on findings, 0 on clean, the git-range mode over a real
// scratch repository, the allowlist, and the degraded (unparseable) path.
//
// Every identifier here is synthetic — this repo is public.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { scanDocument, scanContent, isAllowlisted, CLASSES } from "../tools/absence-scan.mjs";

const TOOL = join(dirname(fileURLToPath(import.meta.url)), "..", "tools", "absence-scan.mjs");
const CORPUS = "test/fixtures/harvested";

// Synthetic, and shaped like the thing each class is defined against.
const FAKE_UUID = "0123abcd-4567-89ef-0123-456789abcdef";
const LONG_B64 = "QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0".repeat(4);
const TOKEN_TEXT = "t_0123456789ab_42";

// A document with nothing for any class to say anything about.
const CLEAN = {
  key: "s-0123456789ab",
  ts: "2000-01-01T00:00:03.000Z",
  messages: [
    { role: "user", content: [{ type: "text", text: TOKEN_TEXT }] },
    {
      role: "user",
      content: [{ type: "image", source: { type: "base64", media_type: "image/png", data: "data_0123456789" } }],
    },
  ],
};

// One seeded defect per class. Each entry is the MINIMAL deviation from CLEAN
// that its class is defined to catch.
const SEEDED = {
  // On a `signature`, not on a `text`: a long base64 run inside a content
  // field is legitimately BOTH an unsanitized payload and untokenized content,
  // and a seed that trips two classes cannot show which one caught it.
  "b64-run": {
    ...CLEAN,
    messages: [
      { role: "assistant", content: [{ type: "thinking", thinking: TOKEN_TEXT, signature: LONG_B64 }] },
    ],
  },
  "nested-payload": {
    ...CLEAN,
    messages: [
      { role: "user", content: [{ type: "image", source: { type: "base64", data: "iVBORw0KGgoAAAA" } }] },
    ],
  },
  "live-timestamp": { ...CLEAN, ts: "2026-08-01T09:15:00.000Z" },
  "capture-uuid": { ...CLEAN, key: FAKE_UUID },
  "raw-content": {
    ...CLEAN,
    messages: [{ role: "user", content: [{ type: "text", text: "plain prose that never went through the scrub" }] }],
  },
};

test("every class goes RED on its own seeded defect, and only that class", () => {
  for (const cls of CLASSES) {
    const doc = SEEDED[cls.name];
    assert.ok(doc, `no seeded defect for class ${cls.name} — a class without a bite is an orphan`);
    const fired = new Set(scanDocument(doc).findings.map((f) => f.class));
    assert.ok(fired.has(cls.name), `${cls.name} did not fire on its own seeded defect`);
    assert.deepEqual([...fired], [cls.name], `${cls.name}'s seeded defect must not trip a second class`);
  }
});

test("the clean document produces no finding at all", () => {
  assert.deepEqual(scanDocument(CLEAN).findings, []);
});

test("a finding never carries the matched bytes", () => {
  // A leak reporter that prints the leak has moved it, not found it.
  const findings = scanDocument(SEEDED["capture-uuid"]).findings;
  assert.equal(findings.length, 1);
  assert.deepEqual(Object.keys(findings[0]).sort(), ["class", "file", "length", "path"]);
  assert.ok(!JSON.stringify(findings).includes(FAKE_UUID));
});

test("the filename class fires on a UUID name and on an 8-hex s- prefix, not on the real token shape", () => {
  const names = (n) => scanContent(JSON.stringify(CLEAN), `${CORPUS}/${n}`).findings.map((f) => f.class);
  assert.deepEqual(names(`pinned-${FAKE_UUID}-26-28.json`), ["capture-uuid-filename"]);
  assert.deepEqual(names("pinned-s-4b6a4352-26-28.json"), ["capture-uuid-filename"]);
  assert.deepEqual(names("pinned-s-4b6a435234bf-26-28.json"), [], "12 hex after s- is the sanitized shape");
});

test("classes defined over the harvested corpus do not fire outside it; byte-level classes do", () => {
  // Measured basis (report absence-guard-report.md): the corpus-shape classes
  // fired ~205 times on hand-authored synthetic proxy fixtures, none of which
  // is a defect. The byte-level classes fired only on real leaks.
  const outside = scanContent(JSON.stringify(SEEDED["raw-content"]), "test/fixtures/hand-written.json");
  assert.deepEqual(outside.findings, [], "prose in a hand-authored fixture is not a sanitization defect");
  assert.equal(outside.partial, true, "and the run must SAY it only half-checked");

  const uuidOutside = scanContent(JSON.stringify(SEEDED["capture-uuid"]), "test/fixtures/hand-written.json");
  assert.deepEqual(uuidOutside.findings.map((f) => f.class), ["capture-uuid"],
    "a live capture identifier needs no corpus to be one");
});

test("an unparseable file is scanned as raw bytes and reported degraded, never skipped", () => {
  const r = scanContent(`{ not json at all ${FAKE_UUID}`, `${CORPUS}/broken.json`);
  assert.deepEqual(r.degraded, ["does not parse"]);
  assert.deepEqual(r.findings.map((f) => f.class), ["capture-uuid"]);
});

test("the allowlist covers the LEDGER watermark file and nothing else in the corpus", () => {
  assert.equal(isAllowlisted(`${CORPUS}/LEDGER-Siren.json`), true);
  assert.equal(isAllowlisted(`${CORPUS}/pinned-s-4b6a435234bf-26-28.json`), false);
});

// The transcript-shape fixture used to be allowlisted because it was captured
// from a real transcript and carried its identifiers. It was rebuilt from
// known-safe parts on 2026-08-05 and the exemption retired, so two things are
// now true and neither may quietly stop being true: the file is NOT exempt,
// and it passes the classes on its own bytes. Asserted here rather than left
// to the pre-push hook because the failure mode is silent — an edit that
// pastes a real identifier back in would otherwise reach a push before
// anything said so, and a re-added exemption would hide it permanently.
test("the transcript-shape fixture stands on its own bytes — no exemption, no findings", () => {
  const rel = "test/fixtures/cc-transcript-shape-snapshot.json";
  assert.equal(isAllowlisted(rel), false, "the retired exemption must not come back");
  const abs = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "cc-transcript-shape-snapshot.json");
  const r = scanContent(readFileSync(abs, "utf8"), rel);
  assert.deepEqual(r.findings, [], "a real identifier was pasted back into the shape fixture");
  assert.deepEqual(r.degraded, [], "the fixture must still parse");
});

// --- CLI ---------------------------------------------------------------------

// Git's own env overrides cwd, so a scratch repo built with `cwd: dir` and an
// INHERITED environment is not scratch at all: under an exported GIT_DIR every
// `git init` / `git config` below resolves to whatever repo the runner was
// pointed at. Git exports exactly that into hooks — relative `.git` for a
// main-tree push, ABSOLUTE for a worktree push — so this file, run from a
// pre-push hook, wrote `user.name=t` / `user.email=t@t` into the REAL config,
// and `git init` on a git-dir not named `.git` guesses bare-ness and added
// `core.bare=true` on top. That is the 2026-08-05 incident, and it recurred
// the same day from a plain `GIT_DIR=… node --test` invocation, which is the
// evidence that hardening the pre-push hook alone was not the fix: the hazard
// belongs to any runner with these set, so the scrub belongs HERE, at the
// spawn, where no caller can forget it.
//
// Undefined, not empty string: `GIT_DIR=""` is still "set" to git.
const SCRUBBED_GIT_ENV = {
  ...process.env,
  GIT_DIR: undefined,
  GIT_WORK_TREE: undefined,
  GIT_INDEX_FILE: undefined,
  GIT_COMMON_DIR: undefined,
  GIT_OBJECT_DIRECTORY: undefined,
  GIT_ALTERNATE_OBJECT_DIRECTORIES: undefined,
  GIT_CEILING_DIRECTORIES: undefined,
};

const run = (args, cwd) =>
  spawnSync(process.execPath, [TOOL, ...args], { cwd, encoding: "utf-8", env: SCRUBBED_GIT_ENV });

function withTemp(fn) {
  const dir = mkdtempSync(join(tmpdir(), "absence-scan-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function seedCorpusFile(dir, name, doc) {
  mkdirSync(join(dir, CORPUS), { recursive: true });
  const rel = `${CORPUS}/${name}`;
  writeFileSync(join(dir, rel), JSON.stringify(doc, null, 2));
  return rel;
}

test("CLI: exit 2 on a file carrying a synthetic UUID, exit 0 on a clean one", () => {
  withTemp((dir) => {
    const dirty = seedCorpusFile(dir, "dirty.json", SEEDED["capture-uuid"]);
    const bad = run([dirty], dir);
    assert.equal(bad.status, 2, bad.stdout + bad.stderr);
    assert.match(bad.stdout, /FINDING capture-uuid/);
    assert.ok(!bad.stdout.includes(FAKE_UUID), "the CLI must not echo the matched bytes either");

    const clean = seedCorpusFile(dir, "clean.json", CLEAN);
    const ok = run([clean], dir);
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /absence-scan: clean/);
  });
});

test("CLI: an allowlisted path is reported, not scanned", () => {
  withTemp((dir) => {
    const led = seedCorpusFile(dir, "LEDGER-Testhost.json", SEEDED["capture-uuid"]);
    const r = run([led], dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /^allowlisted: /m);
    assert.ok(!r.stdout.includes("FINDING"));
  });
});

test("CLI: no arguments is an internal-error exit, not a silent pass", () => {
  const r = run([]);
  assert.equal(r.status, 1);
});

// --- git range ---------------------------------------------------------------

function gitRepo(dir) {
  const g = (...args) => {
    const r = spawnSync("git", args, { cwd: dir, encoding: "utf-8", env: SCRUBBED_GIT_ENV });
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
  };
  g("init", "-q", "-b", "main");
  g("config", "user.email", "t@t");
  g("config", "user.name", "t");
  return g;
}

test("git-range: red on a defect added in the range, green on the range before it", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    const cleanRel = seedCorpusFile(dir, "clean.json", CLEAN);
    g("add", cleanRel);
    g("commit", "-qm", "clean");
    const first = g("rev-parse", "HEAD");

    const dirtyRel = seedCorpusFile(dir, "dirty.json", SEEDED["capture-uuid"]);
    g("add", dirtyRel);
    g("commit", "-qm", "dirty");
    const second = g("rev-parse", "HEAD");

    const red = run(["--git-range", `${first}..${second}`], dir);
    assert.equal(red.status, 2, red.stdout + red.stderr);
    assert.match(red.stdout, /FINDING capture-uuid {2}test\/fixtures\/harvested\/dirty\.json/);
    assert.ok(!red.stdout.includes("clean.json"), "an unchanged file is outside the range");

    const green = run(["--git-range", `EMPTY..${first}`], dir);
    assert.equal(green.status, 0, green.stdout + green.stderr);
  });
});

test("git-range: EMPTY scans every file reachable at the new ref (the new-branch push)", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    const dirtyRel = seedCorpusFile(dir, "dirty.json", SEEDED["capture-uuid"]);
    g("add", dirtyRel);
    g("commit", "-qm", "dirty");
    const head = g("rev-parse", "HEAD");
    const r = run(["--git-range", `EMPTY..${head}`], dir);
    assert.equal(r.status, 2, r.stdout + r.stderr);
  });
});

test("git-range: a deleted file is not scanned, and a non-JSON file is ignored", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    const dirtyRel = seedCorpusFile(dir, "dirty.json", SEEDED["capture-uuid"]);
    writeFileSync(join(dir, "notes.md"), `not scanned ${FAKE_UUID}\n`);
    g("add", dirtyRel, "notes.md");
    g("commit", "-qm", "dirty");
    const first = g("rev-parse", "HEAD");

    rmSync(join(dir, dirtyRel));
    g("add", "-A");
    g("commit", "-qm", "removed");
    const second = g("rev-parse", "HEAD");

    const r = run(["--git-range", `${first}..${second}`], dir);
    assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  });
});

test("git-range: an unresolvable base ref degrades to a full scan rather than erroring", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    const dirtyRel = seedCorpusFile(dir, "dirty.json", SEEDED["capture-uuid"]);
    g("add", dirtyRel);
    g("commit", "-qm", "dirty");
    const head = g("rev-parse", "HEAD");
    // A sha this clone has never seen — the shape of a remote ref that was
    // never fetched.
    const r = run(["--git-range", `0000000000000000000000000000000000000001..${head}`], dir);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, /^degraded: base ref /m);
  });
});

// ── Source files: a capture UUID may exist only on the allowlist ──────────────
//
// Fixtures are covered by the classes above; SOURCE leaks ride in comments and
// string literals instead (found live 2026-08-01: the same capture UUID in a
// test file's evidence comment and in tools/replay.mjs — public repo,
// unscrubbable history). A bare "no UUIDs in source" rule would fire on the
// synthetic ones, so the rule is: every UUID in test/, tools/, and proxy/
// source is on the explicit synthetic allowlist below, or this test fails. A
// new legitimate synthetic is added HERE, deliberately, in the same diff a
// reviewer sees — never waved through.
//
// docs/ IS THE SAME SURFACE (widened 2026-08-01, BACKLOG "docs/ UUID triage"):
// a directive, a review or a release-test log is as public as a source file,
// and the same sweep found real capture keys and a session id sitting in four
// of them. Prose carries more legitimate synthetics than code does — hence the
// provenance line on each entry below.
const SOURCE_UUID_ALLOWLIST = new Set([
  FAKE_UUID,                              // this suite's seeded defect
  "b16c607d-d484-4935-840e-e3f7ee78eb08", // proxy suites' synthetic session id
  // Replaced the real-looking session id cold-events.test.mjs carried as test
  // data (2026-08-05 scrub). Deliberately unmistakable: a synthetic that looks
  // like it could be real defeats the purpose of being synthetic.
  "11111111-2222-3333-4444-555555555555",
  "00000000-0000-4000-8000-c4f1efb22220", // session-mirror synthetic
  "9d1c250a-e61b-44d9-88ed-5944d1962f5e", // Anthropic's PUBLIC OAuth client_id
  // docs/ synthetics, each a placeholder by construction:
  "00000000-0000-4000-8000-c4f1efb22221", // release-test harness's pinned --session-id, sibling of ...22220
  "00000000-0000-4000-8000-c4f1efb22222", // gate-live cc-version test's swept session, sibling of ...22220
  "00000000-0000-4000-8000-c4f1efb22223", // gate-live cc-version test's NOT-swept session, sibling of ...22220
  "abcd1234-5678-90ab-cdef-1234567890ab", // the "e.g." 8-4-4-4-12 format sample in proxy-jsonl-session-mirror.md
]);

test("source: every UUID in test/, tools/, proxy/ and docs/ is on the synthetic allowlist", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const files = [];
  const collect = (dir, ext) => {
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      const rel = join(dir, e.name);
      if (e.isDirectory()) {
        // test/ and tools/ are flat; proxy/ and docs/ are not.
        if (dir.startsWith("proxy") || dir.startsWith("docs")) collect(rel, ext);
        continue;
      }
      if (e.name.endsWith(ext)) files.push(rel);
    }
  };
  collect("test", ".mjs");
  collect("tools", ".mjs");
  collect("proxy", ".mjs");
  collect("docs", ".md");
  // Guard the guard: a walk that collected nothing from a root would pass
  // this test while checking that root not at all — the silent scope collapse
  // a rename or a moved directory causes.
  for (const root_ of ["test", "tools", "proxy", "docs"]) {
    assert.ok(files.some((f) => f.startsWith(root_ + sep)), `the walk collected no file under ${root_}/`);
  }
  const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
  const offenders = [];
  for (const rel of files) {
    const text = readFileSync(join(root, rel), "utf8");
    for (const hit of text.match(uuidRe) ?? []) {
      if (!SOURCE_UUID_ALLOWLIST.has(hit)) offenders.push(`${rel}: ${hit}`);
    }
  }
  assert.deepEqual(
    offenders, [],
    `unlisted UUID(s) in source — a capture identifier in a public tree, or a new synthetic missing from the allowlist:\n${offenders.join("\n")}`,
  );
});

// --- source files: the gap a planted UUID found ------------------------------
//
// `--git-range` filtered candidates to .json/.jsonl BEFORE any class ran, so a
// capture identifier committed into a tracked .mjs or .md passed the push hook
// silently — which is where the 2026-08-02 red-main incident put one. The
// filter, not the class definitions, was what let it through.
//
// Source files now get the short-key class, and ONLY that class: widening the
// whole scan across source would drag the UUID and base64 classes over dozens
// of legitimate synthetic values, and a guard that fires on legitimate work
// trains the override reflex that kills it. Measured after the 2026-08-05
// scrub: zero findings over 545 tracked source files.

test("a real capture-key prefix in a .mjs or .md is caught", () => {
  const hit = (t, f) => scanContent(t, f).findings.map((x) => x.class);
  assert.deepEqual(hit("measured on s-633915a8, 602 requests", "tools/x.mjs"),
    ["capture-key-prefix"]);
  assert.deepEqual(hit("the capture s-633915a8 replayed clean", "docs/x.md"),
    ["capture-key-prefix"]);
});

test("a finding on a source file names the line and never the bytes", () => {
  const [f] = scanContent("x\nmeasured on s-633915a8 today\n", "tools/x.mjs").findings;
  assert.equal(f.path, "line 2");
  assert.ok(!JSON.stringify(f).includes("633915a8"),
    "a leak reporter that prints the leak has moved it, not found it");
});

test("the shapes that are NOT a short key stay silent", () => {
  const hit = (t, f = "tools/x.mjs") => scanContent(t, f).findings.map((x) => x.class);
  assert.deepEqual(hit("flap-s-0dc8ac87c43d-86.json"), [],
    "12 hex is the SANITIZED form — matching it would corrupt real fixtures");
  assert.deepEqual(hit("claude-3-opus-20240229"), [],
    "a model version string contains the shape by coincidence");
  assert.deepEqual(hit("grep -oE 's-[0-9a-f]{8}' | grep -v 's-20240229'", "docs/x.md"), [],
    "and it appears BARE in prose describing the pattern itself");
  assert.deepEqual(hit('key: "s-11111111-2222-3333-4444-555555555555"'), [],
    "the head of a full UUID belongs to the UUID class, not this one");
  assert.deepEqual(hit("pinned-s-4b6a4352-26-28.json"), [],
    "this repo's own synthetic fixture token");
});
