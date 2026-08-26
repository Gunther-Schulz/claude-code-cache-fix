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

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { scanDocument, scanContent, isAllowlisted, exemptClasses, CLASSES, findingId,
         SOURCE_SCANNABLE, SCANNABLE, skipEntry, exemptEntry, formatAllowlistLine,
         CLASS_NAMES, SYNTHETIC_UUID_ALLOWLIST, NAME_UUID_PREFIX,
         isDeclaredSyntheticUuid, scopeKey, classesFor, HOME_PATH } from "../tools/absence-scan.mjs";
import { homedir } from "node:os";

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
  // On a `cwd`-shaped field, not a `text`/`thinking`/`content` one: any of
  // those would ALSO trip raw-content (non-token prose), which is precisely
  // the two-classes-at-once shape this SEEDED map's own header forbids.
  "foreign-path": { ...CLEAN, cwd: "/home/otheruser/dev/some-other-project/tools/build.sh" },
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
  //
  // The key list is CLOSED on purpose: a new field on a finding has to be
  // argued for here, in the test whose whole subject is what a finding may
  // carry. `id` was added 2026-08-08 and is the one field derived FROM the
  // matched bytes — so it is asserted to be a digest rather than merely
  // tolerated, and the identity section below pins what it is a digest OF.
  const findings = scanDocument(SEEDED["capture-uuid"]).findings;
  assert.equal(findings.length, 1);
  assert.deepEqual(Object.keys(findings[0]).sort(), ["class", "file", "id", "length", "path"]);
  assert.ok(!JSON.stringify(findings).includes(FAKE_UUID));
  assert.match(findings[0].id, /^[0-9a-f]{12}$/, "the identity is a digest, not a quotation");
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

test("the LEDGER is exempt from ONE class, not from the file", () => {
  // Narrowed 2026-08-05. A path-wide exemption hides every class, including
  // ones nobody considered when it was written — which is precisely how 94
  // session identifiers sat inside this very file, invisible, behind an
  // exemption whose stated reason was about timestamps.
  const ledger = `${CORPUS}/LEDGER-Siren.json`;
  const exempt = exemptClasses(ledger);
  assert.deepEqual([...exempt], ["live-timestamp"],
    "its lastHarvest fields ARE its content; nothing else about it is excused");
  assert.equal(isAllowlisted(ledger), false,
    "isAllowlisted means exempt from EVERY class — the ledger is not");
  assert.deepEqual([...exemptClasses(`${CORPUS}/pinned-s-4b6a435234bf-26-28.json`)], []);
});

test("this test file itself is exempt from TWO named classes, not a full skip", () => {
  // The 2026-08-10 companion to the two exemptions above: SOURCE_UUID_ALLOWLIST
  // below carries ~15 deliberately synthetic UUIDs, and scanSourceText's
  // capture-uuid fix (same day) now flags every one of them on a git-range
  // scan of this file unless exempted here — noise, not signal, because THIS
  // file's own roster test ("source: every UUID...") independently
  // re-verifies every UUID it carries against that same allowlist on every
  // `npm test` run. Class-scoped: capture-key-prefix (and everything else)
  // still applies.
  //
  // `foreign-path` JOINED IT 2026-08-26, from a SEPARATE ALLOWLIST entry with
  // a separate reason — the bootstrap pair, without which the widened class
  // denies its own source and the change cannot land. `exemptClasses` unions
  // the two entries, which is why neither reason has to carry the other's, and
  // why this assertion is over the union rather than either entry alone.
  // Deliberately an EXACT list: a third class appearing here would be a scrub
  // verdict wearing a bootstrap exemption's costume, and an exact list is what
  // makes that visible instead of silently absorbed.
  const self = "test/absence-scan.test.mjs";
  assert.deepEqual([...exemptClasses(self)].sort(), ["capture-uuid", "foreign-path"]);
  assert.equal(isAllowlisted(self), false,
    "isAllowlisted means exempt from EVERY class — this file is not, only from two");
});

test("a capture UUID planted into the LEDGER is still caught", () => {
  // The bite for the narrowing: the class the exemption does NOT cover must
  // fire on the exempt file.
  const doc = JSON.stringify({ keys: { [FAKE_UUID]: { lastHarvest: "2026-08-05T00:00:00.000Z" } } });
  const r = scanContent(doc, `${CORPUS}/LEDGER-Siren.json`);
  const exempt = exemptClasses(`${CORPUS}/LEDGER-Siren.json`);
  const kept = r.findings.filter((f) => !exempt.has(f.class));
  assert.deepEqual(kept.map((x) => x.class), ["capture-uuid"],
    "the timestamp is excused; the identifier is not");
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
  const dir = tmpDirSync("absence-scan-");
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

test("CLI: an exempt path is scanned, and only its exempt CLASS is dropped", () => {
  // This asserted the opposite until 2026-08-05 — that a LEDGER path was
  // reported and not scanned at all. That is what let a capture identifier
  // live inside one indefinitely: the exemption's stated reason was its
  // timestamps, and it silently covered everything.
  withTemp((dir) => {
    // A live wall-clock ts (the exempt class) AND a capture UUID (not exempt).
    const led = seedCorpusFile(dir, "LEDGER-Testhost.json",
      { ...SEEDED["capture-uuid"], ts: "2026-08-05T09:10:03.000Z" });
    const r = run([led], dir);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, /^exempt live-timestamp: /m,
      "the file is named as a class-scoped DROP (scanned, one class excused) — never as a whole-file skip");
    assert.ok(!/^skipped \(all classes\): /m.test(r.stdout),
      "a class-scoped drop must not also print the whole-file-skip line");
    assert.match(r.stdout, /FINDING capture-uuid/, "the class it is NOT exempt from fires");
    assert.ok(!r.stdout.includes("FINDING live-timestamp"),
      "the class it IS exempt from stays quiet — its watermarks are its content");
  });
});

// ---------------------------------------------------------------------------
// BACKLOG "absence-scan's allowlisted: line cannot distinguish a whole-file
// SKIP from a class-scoped DROP" — the two routes rendered one identical
// `allowlisted: <path>` line until this fix. Proven at the line-rendering
// level (formatAllowlistLine) rather than by adding a real `classes: "all"`
// ALLOWLIST entry: there is deliberately none today, and mutating this
// file's own ALLOWLIST at test time would violate the repo's no-self-
// mutating-tools-tests convention (test/tool-output-stamps.test.mjs,
// quota-analysis section).
// ---------------------------------------------------------------------------

test("RED-FIRST: a whole-file skip and a class-scoped exempt render two DIFFERENT lines for the same path", () => {
  const skip = formatAllowlistLine(skipEntry("test/fixtures/harvested/whatever.json"));
  const exempt = formatAllowlistLine(exemptEntry("test/fixtures/harvested/whatever.json", new Set(["live-timestamp"])));
  assert.notEqual(skip, exempt,
    "a whole-file SKIP and a class-scoped DROP must not render identically — that is the defect this entry fixes");
  assert.equal(skip, "skipped (all classes): test/fixtures/harvested/whatever.json");
  assert.equal(exempt, "exempt live-timestamp: test/fixtures/harvested/whatever.json");
});

test("skipEntry corresponds to a classes: \"all\" match (or coincidental full class coverage) — the case isAllowlisted() treats as a true whole-file skip", () => {
  // exemptEntry with EVERY class name also reads as a full skip in practice
  // (isAllowlisted's own "coincidental full coverage" branch), but the two
  // entry constructors are still distinguishable at the rendering level —
  // route is what main()/scanGitRange()/scanAtRef() actually observed
  // (isAllowlisted() true vs. false-but-some-findings-dropped), not a
  // re-derivation from the class set.
  const allClasses = new Set(CLASS_NAMES);
  const line = formatAllowlistLine(exemptEntry("x.json", allClasses));
  assert.equal(line, `exempt ${CLASS_NAMES.slice().sort().join(",")}: x.json`);
  assert.notEqual(line, formatAllowlistLine(skipEntry("x.json")),
    "even full class coverage via the exempt route reads differently from the skip route — route is tracked, not inferred");
});

test("CLI: an exempt path with only exempt findings still exits 0", () => {
  withTemp((dir) => {
    const led = seedCorpusFile(dir, "LEDGER-Testhost.json",
      { ...CLEAN, ts: "2026-08-05T09:10:03.000Z" });
    const r = run([led], dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(!r.stdout.includes("FINDING"), "nothing but the excused class was there");
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

// --- range-interior commits ---------------------------------------------------
//
// `rangeFiles` diffs the range's two ENDPOINTS (`--diff-filter=ACMR oldRef
// newRef`), so a blob added in one commit and deleted (or reverted) by a
// later commit inside the same pushed range nets out of that diff entirely —
// the natural "leak, then scrub, then push" sequence, and it read as clean
// before this fix (docs/dev-loop.md, "Blind spot still OPEN").
//
// RED-FIRST: reverting this walk (deleting the range-interior loop in
// scanGitRange) reproduces the pre-fix behaviour — the added-then-deleted
// synthetic UUID below reports `absence-scan: clean`, exit 0. Demonstrated by
// hand against the unpatched scanner before this fix landed (dispatcher's
// closing report carries the pasted output); the bite below pins the fixed
// behaviour going forward.
test("git-range: a defect ADDED then DELETED within the same pushed range is still caught", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    const cleanRel = seedCorpusFile(dir, "clean.json", CLEAN);
    g("add", cleanRel);
    g("commit", "-qm", "clean baseline");
    const base = g("rev-parse", "HEAD");

    const leakRel = seedCorpusFile(dir, "leak.json", SEEDED["capture-uuid"]);
    g("add", leakRel);
    g("commit", "-qm", "add leak (should have been caught here)");

    g("rm", "-q", leakRel);
    g("commit", "-qm", "scrub: remove leak.json before push");
    const head = g("rev-parse", "HEAD");

    const r = run(["--git-range", `${base}..${head}`], dir);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, /FINDING capture-uuid {2}test\/fixtures\/harvested\/leak\.json/,
      "the blob is read at the ADDING commit's own tree, never reachable at the tip");
    assert.ok(!r.stdout.includes(FAKE_UUID), "and must not echo the identifier");
  });
});

test("git-range: the same added-then-deleted shape with CLEAN content stays green", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    const cleanRel = seedCorpusFile(dir, "clean.json", CLEAN);
    g("add", cleanRel);
    g("commit", "-qm", "clean baseline");
    const base = g("rev-parse", "HEAD");

    const tempRel = seedCorpusFile(dir, "temp.json", { note: "nothing sensitive here" });
    g("add", tempRel);
    g("commit", "-qm", "add temp");

    g("rm", "-q", tempRel);
    g("commit", "-qm", "remove temp");
    const head = g("rev-parse", "HEAD");

    const r = run(["--git-range", `${base}..${head}`], dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });
});

test("git-range: a defect MODIFIED then REVERTED within the range is still caught at the interior commit", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    const rel = seedCorpusFile(dir, "flip.json", CLEAN);
    g("add", rel);
    g("commit", "-qm", "clean baseline");
    const base = g("rev-parse", "HEAD");

    writeFileSync(join(dir, rel), JSON.stringify(SEEDED["capture-uuid"], null, 2));
    g("add", rel);
    g("commit", "-qm", "modify to a leak");

    writeFileSync(join(dir, rel), JSON.stringify(CLEAN, null, 2));
    g("add", rel);
    g("commit", "-qm", "revert to clean before push");
    const head = g("rev-parse", "HEAD");

    const r = run(["--git-range", `${base}..${head}`], dir);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, /FINDING capture-uuid {2}test\/fixtures\/harvested\/flip\.json/);
  });
});

test("git-range: a blob unchanged from the tip is not re-scanned by the interior walk (dedupe)", () => {
  // Not directly observable from the CLI's findings (a correctly-deduped run
  // and a naively-duplicating one both report exactly one finding for a
  // single real defect) — the property under test is COST: the same file
  // touched across three commits without ever changing content must not
  // multiply the interior walk's work. Exercised indirectly via the sweep
  // accounting in the closing report; this bite pins the observable half —
  // one finding, not three, for one defect touched three times.
  withTemp((dir) => {
    const g = gitRepo(dir);
    const rel = seedCorpusFile(dir, "steady.json", SEEDED["capture-uuid"]);
    g("add", rel);
    g("commit", "-qm", "add leak");
    const base = g("rev-parse", "HEAD");
    // Touch an unrelated file twice more so `steady.json`'s blob is walked
    // by the interior loop at more than one commit without its content ever
    // changing between them.
    for (let i = 0; i < 2; i++) {
      writeFileSync(join(dir, "test/fixtures/harvested/unrelated.json"),
        JSON.stringify({ n: i, ts: `2000-01-01T00:00:0${i}.000Z` }, null, 2));
      g("add", "test/fixtures/harvested/unrelated.json");
      g("commit", "-qm", `unrelated touch ${i}`);
    }
    const head = g("rev-parse", "HEAD");
    const r = run(["--git-range", `EMPTY..${head}`], dir);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    const hits = r.stdout.split("\n").filter((l) => l.startsWith("FINDING capture-uuid"));
    assert.equal(hits.length, 1, "one defect, touched once, must report once");
  });
});

// ---------------------------------------------------------------------------
// BACKLOG "absence-scan blob dedupe keyed on oid alone, not oid plus scope" —
// `scannedBlobs` above is a plain OID set shared between the endpoint pass
// and the interior walk. Two DIFFERENT paths carrying byte-IDENTICAL content
// (same blob OID) but routed to DIFFERENT scope treatment — one outside
// test/fixtures/harvested/ (byte-level classes only), one inside it (the
// full class set, including corpus-only classes like live-timestamp) — share
// one dedupe entry, so whichever path is scanned FIRST silently absorbs the
// second path's scan, and a corpus-only defect at the second path never
// fires.
//
// RED-FIRST: against the unmodified scanner this reports `absence-scan:
// clean`, exit 0 — demonstrated by hand before this fix landed (dispatcher's
// closing report carries the pasted output). The out-of-corpus path is
// scanned first (endpoint pass runs before the interior walk) and produces
// no findings (its scope excludes live-timestamp), which is enough to mark
// the OID "already scanned" and skip the in-corpus path's own scan entirely
// once the fix keys dedupe on (oid, scope).
// ---------------------------------------------------------------------------

test("git-range: identical bytes at two paths with DIFFERENT scope classes are scanned under BOTH", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    writeFileSync(join(dir, "README.md"), "clean\n");
    g("add", "-A");
    g("commit", "-qm", "clean baseline");
    const base = g("rev-parse", "HEAD");

    // Byte-identical content at two paths with different scope treatment:
    // a live (out-of-epoch) timestamp, which only the corpus-scope
    // `live-timestamp` class has any opinion about.
    const shared = JSON.stringify({ ts: "2026-08-01T09:15:00.000Z" }, null, 2);

    // Out-of-corpus path — scanned first (it survives to the tip, so the
    // endpoint pass reaches it before the interior walk runs at all) and
    // produces NO findings: outside test/fixtures/harvested/, only the
    // "any"-scope classes (b64-run, capture-uuid) apply, and this content
    // trips neither.
    writeFileSync(join(dir, "outer.json"), shared);
    g("add", "outer.json");
    g("commit", "-qm", "add outer (out-of-corpus, same bytes)");

    // In-corpus path, same bytes, same blob OID — added then removed, so it
    // never reaches the endpoint diff and is visible only to the interior
    // walk, AFTER the endpoint pass has already scanned the blob via
    // outer.json above.
    mkdirSync(join(dir, CORPUS), { recursive: true });
    writeFileSync(join(dir, CORPUS, "inner.json"), shared);
    g("add", `${CORPUS}/inner.json`);
    g("commit", "-qm", "add inner (in-corpus, same bytes — should be caught here)");
    g("rm", "-q", `${CORPUS}/inner.json`);
    g("commit", "-qm", "scrub: remove inner.json before push");
    const head = g("rev-parse", "HEAD");

    const r = run(["--git-range", `${base}..${head}`], dir);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, new RegExp(`FINDING live-timestamp {2}${CORPUS}/inner\\.json`),
      "the in-corpus path's own scope must fire even though the out-of-corpus twin " +
      "with the same OID was scanned first");
  });
});

// `scopeKey` above is the dedupe key's second half, and it RESTATES the route
// `scanContent` picks rather than deriving it — the shape that cannot age
// loudly: `scanContent` gains a fourth route, `scopeKey` keeps returning three
// values, and the dedupe silently re-absorbs a scan while every existing test
// stays green, byte-identical to health. What this asserts is therefore not
// `scopeKey`'s table but its AGREEMENT with the running scanner: two paths
// share a dedupe key exactly when the scanner actually treats them the same,
// where "actually" is read out of `scanContent`/`classesFor` at run time and
// never from a copy of their branch conditions kept here.
test("scopeKey partitions paths exactly as the scanner's own routing does", () => {
  // The route a path really takes, read from the scanner rather than restated:
  // the source branch announces itself as `sourceOnly`, and every other route
  // is identified by the class set it actually applies.
  const routeOf = (file) => {
    const r = scanContent("{}", file, {});
    return r.sourceOnly ? "source" : classesFor(file).map((c) => c.name).sort().join(",");
  };

  const paths = [
    "tools/absence-scan.mjs",
    "docs/dev-loop.md",
    "tools/git-hooks/pre-push",
    `${CORPUS}/notes.md`,          // source-shaped INSIDE the corpus dir
    `${CORPUS}/capture.json`,
    `${CORPUS}/capture.jsonl`,
    "outer.json",
    "proxy/state/data.jsonl",
  ];

  // Both directions, over every pair: same key ⟺ same treatment. One direction
  // alone is satisfiable by a degenerate key (a constant merges everything; a
  // path-unique key splits everything), so neither is the check on its own.
  for (const a of paths) {
    for (const b of paths) {
      assert.equal(scopeKey(a) === scopeKey(b), routeOf(a) === routeOf(b),
        `dedupe key and scanner routing disagree for ${a} vs ${b}: ` +
        `keys ${scopeKey(a)}/${scopeKey(b)}, routes ${routeOf(a)}/${routeOf(b)}`);
    }
  }

  // And the partition is not the trivial one in either direction — a constant
  // key or an all-distinct key would satisfy the loop above vacuously if the
  // scanner happened to match it.
  assert.equal(new Set(paths.map(scopeKey)).size, 3, "all three routes must be represented");
});

// --- annotated tag messages -----------------------------------------------------
//
// A tag's ANNOTATION is a message on its own object, distinct from every
// commit it points at — nothing before this fix ever read it (the range
// walk above covers files and commits, not the tag object itself).
//
// RED-FIRST: against the unpatched scanner this reported `absence-scan:
// clean`, exit 0, even though the message text carried a synthetic capture
// UUID (demonstrated by hand before this fix landed; dispatcher's closing
// report carries the pasted output).
test("git-range: a synthetic UUID in an ANNOTATED TAG's message is caught", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    writeFileSync(join(dir, "a.md"), "clean\n");
    g("add", "-A");
    g("commit", "-qm", "base");
    g("tag", "-a", "v1.0.0", "-m", `release notes: session ${FAKE_UUID} busted this cut`);
    const tagSha = g("rev-parse", "v1.0.0");

    const r = run(["--git-range", `EMPTY..${tagSha}`], dir);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, /FINDING capture-uuid {2}tag /,
      "a tag annotation finding must say it came from the tag, not a file or a commit");
    assert.ok(!r.stdout.includes(FAKE_UUID), "and must not echo the identifier");
  });
});

test("git-range: a clean annotated tag reports nothing, and a lightweight tag is a no-op for this class", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    writeFileSync(join(dir, "a.md"), "clean\n");
    g("add", "-A");
    g("commit", "-qm", "base");
    g("tag", "-a", "v1.0.0", "-m", "a perfectly ordinary release note");
    const annotated = g("rev-parse", "v1.0.0");
    const rAnnotated = run(["--git-range", `EMPTY..${annotated}`], dir);
    assert.equal(rAnnotated.status, 0, rAnnotated.stdout + rAnnotated.stderr);

    // A lightweight tag has no separate object — `v-lite` resolves straight
    // to the commit, so there is no annotation for this class to read; the
    // commit's own file content is what the endpoint/interior walks cover.
    g("tag", "v-lite");
    const lite = g("rev-parse", "v-lite");
    const rLite = run(["--git-range", `EMPTY..${lite}`], dir);
    assert.equal(rLite.status, 0, rLite.stdout + rLite.stderr);
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
// The roster MOVED to tools/absence-scan.mjs on 2026-08-15 so the scanner
// itself can honour it (test/absence-scan-synthetic-roster.test.mjs). It is
// imported rather than re-declared: two copies of a declaration is two
// truths, and the roster test below is the half that keeps this one honest.
const SOURCE_UUID_ALLOWLIST = SYNTHETIC_UUID_ALLOWLIST;

// WIDENED 2026-08-10, from a hand-enumerated four-root walk to the tracked
// tree. The old walk was `test/*.mjs`, `tools/*.mjs`, `proxy/**.mjs`,
// `docs/**.md` — 603 files, and it reached NO root-level `.md` and no `.md`
// under `tools/`. That left `BACKLOG.md` and `FORK-NOTES.md` unchecked, which
// are the two fork-only root documents and the two that discuss captures most
// (BACKLOG.md alone carries ~185 alias citations).
//
// Why that was load-bearing rather than untidy: `tools/absence-scan.mjs`'s
// `FULL_UUID_HEAD` SUPPRESSES the short-key class on any line containing a
// full 8-4-4-4-12 UUID, deferring that shape to "the source-UUID roster the
// suite already walks" — this test. For a file the roster did not walk, the
// deferral pointed at nobody: writing the FULL id disabled the guard that
// catches the SHORT one. Measured on the real scanner:
// `scanContent("… dc3f8071-8555-…", "BACKLOG.md")` -> 0 findings, while the
// short form on the same file -> 1. Found by leaking a real published session
// id into BACKLOG.md while writing the backlog entry about that very class;
// a grep on the diff caught it, no mechanism did.
//
// `git ls-files` rather than a wider readdir, for three reasons: it cannot
// silently miss a new directory the way a hand-listed root set does; it is
// the same tree-derived enumeration `test/logs-schemas.test.mjs:340` uses, so
// the repo has one way of asking "every source file"; and it excludes
// UNTRACKED files, which is correct — untracked scratch is not published, and
// three root-level dossier files on this machine carry real registered
// capture ids right now. Those are not findings while they stay untracked,
// and they become findings the moment anyone commits them, which is exactly
// when this test should fire.
//
// Measured rather than assumed, because the first draft of this comment said
// they were "one `git add` away": `git check-ignore` says all three ARE
// ignored, so a plain `git add` cannot stage them and only `-f` would. The
// exposure is smaller than the sentence claimed. Kept as the reason for the
// tracked-only filter anyway — the filter is what makes this test silent on
// them today and loud the moment the ignore rule stops covering a file.
test("source: every UUID in a tracked SOURCE_SCANNABLE file is on the synthetic allowlist", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  // The scanner's OWN predicate, imported rather than restated: this roster is
  // what tools/absence-scan.mjs's FULL_UUID_HEAD defers the full-UUID shape to,
  // so the two sets must be the same set. Importing makes that structural
  // instead of a promise in a comment.
  const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
    .split("\n").filter(Boolean)
    .filter((f) => SOURCE_SCANNABLE.test(f) && !SCANNABLE.test(f));
  // Guard the guard: a walk that collected nothing from a root would pass
  // this test while checking that root not at all — the silent scope collapse
  // a rename or a moved directory causes. The repo ROOT is in the list because
  // its absence is the defect this widening repairs, and a plain
  // `files.length > 0` would not have caught it.
  for (const root_ of ["test", "tools", "proxy", "docs"]) {
    assert.ok(files.some((f) => f.startsWith(root_ + "/")), `the walk collected no file under ${root_}/`);
  }
  assert.ok(files.some((f) => !f.includes("/")), "the walk collected no root-level file");
  assert.ok(files.includes("BACKLOG.md"), "BACKLOG.md is not in the walk — the file this widening exists for");
  assert.ok(files.length > 500, `the walk must enumerate the tree, got ${files.length} files`);
  // The deferral's own precondition, asserted rather than assumed: every file
  // the scanner routes to scanSourceText must be in this roster.
  assert.ok(files.some((f) => f.endsWith(".md")) && files.some((f) => f.endsWith(".mjs")),
            "the roster lost an extension SOURCE_SCANNABLE still matches");
  const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
  const offenders = [];
  for (const rel of files) {
    const text = readFileSync(join(root, rel), "utf8");
    for (const hit of text.match(uuidRe) ?? []) {
      // ASK THE TOOL, never re-test the Set. Corrected 2026-08-16: this line
      // read `!SOURCE_UUID_ALLOWLIST.has(hit)`, which restated one of the
      // tool's two ways of declaring a value synthetic. When the merge added
      // the declared-namespace form, the restatement went red on values the
      // tool correctly exempts — a coverage assertion whose comparison basis is
      // copied from the source it grades cannot track that source.
      if (!isDeclaredSyntheticUuid(hit)) offenders.push(`${rel}: ${hit}`);
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

// The known-positive is ASSEMBLED AT RUNTIME, and the reason is worth the two
// lines it costs. This bite must feed the class the exact shape it catches —
// but any such literal sitting in this file is, to the scanner, a capture-key
// prefix in a tracked source file, which is precisely what the class exists to
// refuse. The first draft used a REAL prefix and the gate blocked the push;
// exempting the synthetic that replaced it then broke this test, because the
// exemption and the assertion wanted the same string to mean opposite things.
// Building it from fragments ends the circle: no scannable literal exists in
// the file, and the class still sees the true shape.
const SYNTH_KEY = ["s", "-", "0123", "abcd"].join("");

test("a capture-key prefix in a .mjs or .md is caught", () => {
  const hit = (t, f) => scanContent(t, f).findings.map((x) => x.class);
  assert.deepEqual(hit(`measured on ${SYNTH_KEY}, 602 requests`, "tools/x.mjs"),
    ["capture-key-prefix"]);
  assert.deepEqual(hit(`the capture ${SYNTH_KEY} replayed clean`, "docs/x.md"),
    ["capture-key-prefix"]);
});

// Built from fragments for the same reason SYNTH_KEY is: a literal of this
// shape in a tracked file IS what the class refuses, so the assertions would
// block their own push.
const WORD_TAIL = (word, hex) => [word, "-", hex.slice(0, 4), hex.slice(4)].join("");

test("a word ending in s, followed by 8 hex, is not a capture key", () => {
  // DEFINITION, before the assertions: the class protects a capture-id TOKEN —
  // `s-` + 8 hex — and a token cannot begin in the middle of a word. The
  // leading guard was `[^0-9a-f]`, which admits every letter except a–f, so
  // the final `s` of any English word qualified: `business-`, `news-`,
  // `plus-`, `process-`, `status-`. Measured on the scanner (not the regex)
  // 2026-08-05: all five fire.
  //
  // Latent rather than observed — the tree carries no such string today, which
  // is why the false-fire rate measured zero. It stops being latent as the
  // class covers source files and prose, where words ending in s live. The
  // single declared exemption this repo carried, `/s-20240229/`, covered one
  // literal of an open-ended class; an exemption list cannot enumerate English.
  //
  // The repair is the leading boundary, and it costs nothing on the protected
  // shape: a real key starts its token at a line start, whitespace, or
  // punctuation — including the `capture-s-<key>` and `s-<key>-requests.jsonl`
  // forms, both asserted below. Upstream reached the same fix independently
  // (cnighswonger/claude-code-cache-fix#276) with a wider case table.
  const hit = (t) => scanContent(t, "docs/x.md").findings.map((x) => x.class);
  for (const w of ["busines" + "s", "new" + "s", "plu" + "s", "proces" + "s", "statu" + "s"]) {
    assert.deepEqual(hit(`the ${WORD_TAIL(w, "12345678")} ran`), [],
      `${w}- must not read as a capture key`);
  }
  assert.deepEqual(hit(`the capture ${SYNTH_KEY} replayed clean`), ["capture-key-prefix"],
    "and the real token still fires");
  assert.deepEqual(hit(`capture-${SYNTH_KEY} and /${SYNTH_KEY}-requests.jsonl`), ["capture-key-prefix"],
    "hyphen and slash are token boundaries, not word characters");
  assert.deepEqual(hit(`(${SYNTH_KEY})`), ["capture-key-prefix"],
    "parenthesised prose form");
});

test("a model id whose tail happens to be 8 hex is NOT a capture key", () => {
  // A REGRESSION GUARD on an exemption that already exists, not a new fix —
  // and it is only worth its line because deleting `/s-20240229/` from
  // SHORT_KEY_EXEMPT turns it red (verified by that mutation, 2026-08-05).
  //
  // What it pins: `claude-3-opus-20240229` ends in eight characters that are
  // all hex by coincidence, so SHORT_KEY matches it and the declared exemption
  // is the only thing between that match and a finding. Harmless while the
  // class only saw `.json`; not harmless since source files were added,
  // because model ids live in prose and migration notes, and a hygiene gate
  // that blocks a docs commit is the override reflex this repo keeps warning
  // about.
  //
  // Recorded because the alternative was proposed and is worse: narrowing
  // SHORT_KEY's leading boundary to exclude a preceding word character also
  // fixes this input, and trades sensitivity across the class's whole domain
  // to solve one named case. The exemption names the case, is greppable, and
  // fails loudly when it stops being needed. Softening the predicate is what
  // this repo forbids; the declared exemption is the sanctioned shape.
  const hit = (t) => scanContent(t, "docs/x.md").findings.map((x) => x.class);
  assert.deepEqual(hit("migrate from claude-3-opus-20240229 to claude-opus-5"), [],
    "a retired model id must not read as a capture key");
  assert.deepEqual(hit(`the capture ${SYNTH_KEY} replayed clean`), ["capture-key-prefix"],
    "and the real token still fires");
  assert.deepEqual(hit(`capture-${SYNTH_KEY} and /${SYNTH_KEY}-requests.jsonl`), ["capture-key-prefix"],
    "hyphen and slash are token boundaries, not word characters");
});

test("a finding on a source file names the line and never the bytes", () => {
  const [f] = scanContent(`x\nmeasured on ${SYNTH_KEY} today\n`, "tools/x.mjs").findings;
  assert.equal(f.path, "line 2");
  assert.ok(!JSON.stringify(f).includes("0123abcd"),
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
  // CORRECTED 2026-08-10, same day as the fix it tests: this used to assert
  // `[]` (no finding at ALL) with a comment claiming "the head of a full UUID
  // belongs to the UUID class, not this one" — true in intent, and the
  // assertion never checked it, because until this fix nothing ever ran the
  // UUID class on source text. It passed by accident: 0 findings looks
  // identical to "correctly reclassified" and to "silently dropped" from
  // outside this one test. Reuses the suite's own FAKE_UUID (already on
  // SOURCE_UUID_ALLOWLIST) rather than a fresh literal, so this file never
  // writes a second UUID-shaped string a synthetic-content guard has to
  // re-classify.
  assert.deepEqual(hit(`key: "s-${FAKE_UUID}"`), ["capture-uuid"],
    "the head of a full UUID belongs to the UUID class, not capture-key-prefix");
  assert.deepEqual(hit("pinned-s-4b6a4352-26-28.json"), [],
    "this repo's own synthetic fixture token");
});

// --- key names ---------------------------------------------------------------
//
// Object KEY names were never scanned until 2026-08-05, and the gap was not
// small: a map keyed BY the protected thing is an ordinary shape, and this
// repo's own harvest watermark ledger was `{"keys": {"<full session uuid>":
// …}}`. 94 live identifiers sat in a tracked public file that the UUID class
// would have caught instantly had they been on the other side of the colon.

test("a capture UUID in a KEY position is caught, not just in a value", () => {
  const f = `${CORPUS}/x.json`;
  const inValue = JSON.stringify({ key: FAKE_UUID });
  const inKey = JSON.stringify({ keys: { [FAKE_UUID]: { requests: 1 } } });
  assert.deepEqual(scanContent(inValue, f).findings.map((x) => x.class), ["capture-uuid"]);
  assert.deepEqual(scanContent(inKey, f).findings.map((x) => x.class), ["capture-uuid"],
    "the same identifier, on the other side of the colon");
});

test("a key-position finding locates without echoing the key", () => {
  // The path for a key finding cannot BE the key: for a key-position string
  // the name IS the match, and this scanner's whole contract is that a finding
  // never carries the bytes. Positional instead.
  const doc = JSON.stringify({ keys: { a: {}, [FAKE_UUID]: { requests: 1 } } });
  const [hit] = scanContent(doc, `${CORPUS}/x.json`).findings;
  assert.equal(hit.path, "$.keys[#1]~key", "ordinal within the object, not the name");
  assert.ok(!JSON.stringify(hit).includes(FAKE_UUID),
    "a leak reporter that prints the leak has moved it, not found it");
});

test("the short-key class reaches every text file type, not just .mjs and .md", () => {
  // Widened 2026-08-05 after counting what the first version still missed:
  // 30 tracked .sh/.yml/.py/.txt/.bats/.template and extensionless files that
  // NOTHING scanned. A gate with a file-type blind spot is the defect this
  // whole class was added to fix, one extension list further out.
  const key = ["s", "-", "0123", "abcd"].join("");
  for (const f of ["tools/x.sh", "ci/x.yml", "x.py", "notes.txt", "t.bats",
                   "x.template", "tools/git-hooks/pre-push"]) {
    assert.deepEqual(scanContent(`ref ${key} here`, f).findings.map((x) => x.class),
      ["capture-key-prefix"], `${f} must be scanned`);
  }
});

// --- foreign paths -------------------------------------------------------------
//
// BACKLOG "the publication bar's foreign-path clause is enforced by
// NOTHING" — `tools/absence-scan.mjs` carried no path class at all until this
// entry, even though `CLAUDE.local.md` listed one among the scan's booked
// slice. Every literal below is OBVIOUSLY synthetic (this repo is public):
// a placeholder username, a placeholder project name, never anything shaped
// like a real one.

const HOME = process.env.HOME || homedir();

test("foreign-path: fires inside the corpus on a path outside this repo and every known XDG root", () => {
  const doc = SEEDED["foreign-path"];
  const fired = new Set(scanDocument(doc).findings.map((f) => f.class));
  assert.ok(fired.has("foreign-path"), "the seeded foreign path must fire");
});

test("foreign-path: a path under THIS REPO's own root does not fire", () => {
  // Derived, never hardcoded — the class's own boundary is exactly this git
  // call, so the test asks the same question the class asks rather than
  // repeating a literal that could drift from it.
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const doc = { ...CLEAN, cwd: `${root}/tools/some-other-tool.mjs` };
  assert.deepEqual(scanDocument(doc).findings.map((f) => f.class), [],
    "this repo's own checkout is not a foreign project");
});

test("foreign-path: a path under each known XDG root (env default) does not fire", () => {
  for (const dir of [`${HOME}/.config`, `${HOME}/.local/share`, `${HOME}/.local/state`, `${HOME}/.cache`]) {
    const doc = { ...CLEAN, cwd: `${dir}/cache-fix/some-state-file.json` };
    assert.deepEqual(scanDocument(doc).findings.map((f) => f.class), [],
      `a path under ${dir.replace(HOME, "$HOME")} must not read as a foreign project`);
  }
});

test("foreign-path: a plain file (no path at all) stays clean", () => {
  assert.deepEqual(scanDocument(CLEAN).findings.map((f) => f.class), []);
});

test("foreign-path: scoped to the corpus — the same value outside test/fixtures/harvested/ is not checked", () => {
  const outside = scanContent(JSON.stringify(SEEDED["foreign-path"]), "test/fixtures/hand-written.json");
  assert.deepEqual(outside.findings, [],
    "a home path in an ordinary hand-authored fixture is not a sanitization defect — matches raw-content's own scoping");
  assert.equal(outside.partial, true, "and the run must SAY it only half-checked");
});

test("foreign-path: a value carrying one legitimate path beside one foreign one still fires", () => {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const doc = { ...CLEAN, cwd: `${root} vs /home/otheruser/dev/other-project` };
  assert.deepEqual(scanDocument(doc).findings.map((f) => f.class), ["foreign-path"],
    "one non-exempt path in the string must not be laundered by an exempt one beside it");
});

test("HOME_PATH: captures the whole remaining path, not just the first segment", () => {
  const [hit] = "note /home/otheruser/dev/some-other-project/tools/build.sh done".match(HOME_PATH) ?? [];
  assert.equal(hit, "/home/otheruser/dev/some-other-project/tools/build.sh",
    "a truncated capture would compare a short string against the repo-root prefix and misreport an in-repo path as foreign");
});

test("HOME_PATH: matches /home/ and /Users/, and stops at prose punctuation", () => {
  assert.equal("path is /home/somebody/x.txt.".match(HOME_PATH)?.[0], "/home/somebody/x.txt.",
    "a trailing period is a valid path character, not a boundary — this class does not need to be exact here");
  assert.equal("(/Users/somebody/repo)".match(HOME_PATH)?.[0], "/Users/somebody/repo",
    "the paren is excluded, the macOS form is covered");
  assert.equal("say \"/home/somebody/x\" now".match(HOME_PATH)?.[0], "/home/somebody/x",
    "a quote closes the path off");
});

test("git-range: a foreign home path added to the corpus blocks the push; the range before it is green", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    const cleanRel = seedCorpusFile(dir, "clean.json", CLEAN);
    g("add", cleanRel);
    g("commit", "-qm", "clean");
    const first = g("rev-parse", "HEAD");

    const dirtyRel = seedCorpusFile(dir, "dirty.json", SEEDED["foreign-path"]);
    g("add", dirtyRel);
    g("commit", "-qm", "dirty");
    const second = g("rev-parse", "HEAD");

    const red = run(["--git-range", `${first}..${second}`], dir);
    assert.equal(red.status, 2, red.stdout + red.stderr);
    assert.match(red.stdout, /FINDING foreign-path {2}test\/fixtures\/harvested\/dirty\.json/);
    assert.ok(!red.stdout.includes("some-other-project"), "the CLI must not echo the matched path");

    const green = run(["--git-range", `EMPTY..${first}`], dir);
    assert.equal(green.status, 0, green.stdout + green.stderr);
  });
});

test("git-range: a path under the pushed repo's OWN root stays green through the CLI too", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    // The scratch repo's own root — derived the same way the class derives
    // it, never hardcoded to this suite's real checkout.
    const scratchRoot = g("rev-parse", "--show-toplevel");
    const doc = { ...CLEAN, cwd: `${scratchRoot}/tools/build.sh` };
    const rel = seedCorpusFile(dir, "clean-cwd.json", doc);
    g("add", rel);
    g("commit", "-qm", "cwd under this same scratch repo");
    const head = g("rev-parse", "HEAD");
    const r = run(["--git-range", `EMPTY..${head}`], dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });
});

test("HOME_PATH: /root matches alone or with a path, and a word merely starting with it does not", () => {
  assert.equal("owned by /root".match(HOME_PATH)?.[0], "/root");
  assert.equal("see /root/.ssh/id_rsa".match(HOME_PATH)?.[0], "/root/.ssh/id_rsa");
  assert.equal("mounted at /rootfs/data".match(HOME_PATH), null,
    "a directory named rootfs is not the root user's home");
  assert.equal("cd project/root-cause".match(HOME_PATH), null,
    "no leading path separator before root, and a hyphenated tail is not this shape");
});

// --- commit messages ---------------------------------------------------------
//
// Nothing scanned them until 2026-08-05, and the gap has a signature move: a
// SCRUB commit that names the value it scrubbed. Observed live and caught by
// eye. Message bytes are as permanent in a public repo as file bytes, and no
// file-content scan will ever see them.

// RED-FIRST proof for absence-scan.mjs's scanSourceText fix (2026-08-10):
// until this fix, a FULL UUID in a commit message passed `scanSourceText`
// clean — the short-key class deferred it to "the UUID class", and nothing
// ever ran the UUID class over commit-message text (only over JSON document
// VALUES, via scanDocument). The sibling test below proves the short-prefix
// class that was already working; this proves the class that was silently
// absent — a full UUID is what a real session id actually looks like, and a
// commit message is never a tracked file a `git ls-files` roster
// (test/absence-scan.test.mjs's own "source: every UUID..." test) can ever
// reach.
test("git-range: a FULL UUID in a COMMIT MESSAGE is caught too — no roster can ever reach a message", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    writeFileSync(join(dir, "a.md"), "clean\n");
    g("add", "-A");
    g("commit", "-qm", "base");
    const base = g("rev-parse", "HEAD");
    writeFileSync(join(dir, "a.md"), "still clean\n");
    g("add", "-A");
    // The file is clean; only the MESSAGE carries the identifier, and it is
    // the FULL 8-4-4-4-12 shape.
    g("commit", "-qm", `session ${FAKE_UUID} busted`);
    const r = run(["--git-range", `${base}..HEAD`], dir);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, /FINDING capture-uuid {2}commit /,
      "a full UUID in a commit message must be caught under capture-uuid, not silently dropped");
    assert.ok(!r.stdout.includes("0123abcd"), "and must not echo the identifier");
  });
});

test("git-range: a capture id in a COMMIT MESSAGE is caught", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    writeFileSync(join(dir, "a.md"), "clean\n");
    g("add", "-A");
    g("commit", "-qm", "base");
    const base = g("rev-parse", "HEAD");
    writeFileSync(join(dir, "a.md"), "still clean\n");
    g("add", "-A");
    // The file is clean; only the MESSAGE carries the identifier.
    g("commit", "-qm", `scrub: replace real capture id ${["s", "-", "0123", "abcd"].join("")} in 9 files`);
    // Through the CLI with cwd, like every other git-range test here:
    // scanGitRange runs git in the process cwd, so calling it directly would
    // scan THIS repo and report a confident answer about the wrong tree.
    const r = run(["--git-range", `${base}..HEAD`], dir);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, /FINDING capture-key-prefix {2}commit /,
      "the finding must say it came from a message, not from a file");
    assert.ok(!r.stdout.includes("0123abcd"), "and must not echo the identifier");
  });
});

test("git-range: a clean message with a clean file reports nothing", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    writeFileSync(join(dir, "a.md"), "clean\n");
    g("add", "-A");
    g("commit", "-qm", "base");
    const base = g("rev-parse", "HEAD");
    writeFileSync(join(dir, "a.md"), "still clean\n");
    g("add", "-A");
    g("commit", "-qm", "scrub: replace the residual capture id in 9 files");
    const r = run(["--git-range", `${base}..HEAD`], dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });
});

// --- finding identity, and the published-version mode that consumes it -------
//
// Both exist for ONE consumer: the pre-push hook in the dotfiles repo, which
// discards findings the other side demonstrably already has. It used to ask
// that of the whole BLOB, so editing a file re-reported every months-old
// public finding inside it on every push, forever — a gate that cannot pass,
// and the `--no-verify` habit it trains is the damage. The identity moves the
// question from the file to the finding; `--at` is how the hook reads what a
// path's already-published versions carry.
//
// The FINDING line is therefore a wire format with a parser in another
// repository. These tests are its contract, pinned on this side.

// A SECOND synthetic key, distinct from SYNTH_KEY and built from fragments for
// exactly the same reason (see SYNTH_KEY above): a literal of this shape in a
// tracked file IS what capture-key-prefix refuses, so writing one out would
// block this repository's own push. That is not hypothetical — the first
// version of the tests below carried two literals and the guard blocked the
// push carrying them, 2026-08-08. The convention is the repair; an allowlist
// entry would not be, since exempting this file from capture-key-prefix would
// hide every future capture key in the file where it matters most.
const SYNTH_KEY_2 = ["s", "-", "4455", "6677"].join("");

test("identity: a digest of the class and the finding's own bytes, computed independently here", () => {
  // Second implementation of the documented rule, on purpose: if the tool's
  // notion of the identity ever diverges from the written one, an expectation
  // sharing the tool's parentage would move along with it and pin nothing.
  const line = `// nennt ${SYNTH_KEY}`;
  const expected = createHash("sha256").update(`capture-key-prefix\0${line}`, "utf8")
    .digest("hex").slice(0, 12);
  assert.equal(findingId("capture-key-prefix", line), expected);
  assert.equal(findingId("capture-key-prefix", line).length, 12);
});

test("identity: the same bytes at a DIFFERENT path carry the same identity", () => {
  // The path is deliberately NOT in the digest. The hook supplies the path
  // qualifier by collecting one identity set per path — so the same bytes in a
  // NEW file have no published set and still block. Folding the path in here
  // as well would double-count it and make a renamed file's public lines
  // unremovable, which is the very defect this replaced.
  const doc = { key: FAKE_UUID };
  const a = scanContent(JSON.stringify(doc), `${CORPUS}/one.json`).findings;
  const b = scanContent(JSON.stringify(doc), `${CORPUS}/two.json`).findings;
  assert.equal(a.length, 1);
  assert.equal(a[0].id, b[0].id);
});

test("identity: it is the finding's OWN span, so an edit anywhere in that span mints a new one", () => {
  // The unit is the whole flagged line, not the matched token. A line that
  // gains a SECOND identifier beside an old one must not keep answering "already
  // published" — that is the swallow this widening prevents, and it is the
  // fail-closed direction.
  // The second key must be a key in its own right, or "gains a SECOND
  // identifier" would be an overstatement and the differing identity would be
  // proving something weaker than the test claims.
  assert.deepEqual(scanContent(`// nur ${SYNTH_KEY_2}\n`, "a.mjs").findings.map((f) => f.class),
    ["capture-key-prefix"], "the second synthetic key is itself a capture key");

  const one = scanContent(`// nennt ${SYNTH_KEY}\n`, "a.mjs").findings;
  const two = scanContent(`// nennt ${SYNTH_KEY} und ${SYNTH_KEY_2}\n`, "a.mjs").findings;
  assert.equal(one.length, 1);
  assert.equal(two.length, 1, "still one finding per line");
  assert.notEqual(one[0].id, two[0].id, "the added identifier must change the identity");
  assert.equal(one[0].length, `// nennt ${SYNTH_KEY}`.length,
    "and length measures the same span the identity is taken over");
});

test("the FINDING line carries the identity INSIDE the parentheses", () => {
  // Load-bearing placement: the hook's file-finding regex ends
  // `\(\d+ chars[^)]*\)$`. Inside, it is backward-compatible by construction;
  // appended after the closing paren, every file finding would stop parsing and
  // the hook would silently discard nothing.
  withTemp((dir) => {
    const rel = seedCorpusFile(dir, "dirty.json", SEEDED["capture-uuid"]);
    const r = run([rel], dir);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    const line = r.stdout.split("\n").find((l) => l.startsWith("FINDING "));
    assert.match(line, /\(\d+ chars, #[0-9a-f]{12}\)$/);
    // The hook's own regex, transcribed. A change here is a change over there.
    assert.match(line, /^FINDING\s+\S+\s{2,}(.+?)\s{2,}.+\s{2,}\(\d+ chars[^)]*\)$/);
    assert.ok(!line.includes(FAKE_UUID));
  });
});

test("--at: reads content from a ref and classifies it under the LOGICAL path", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    const rel = seedCorpusFile(dir, "dirty.json", SEEDED["capture-uuid"]);
    g("add", rel);
    g("commit", "-qm", "seed");
    const head = g("rev-parse", "HEAD");

    // The working tree no longer carries it; the ref still does.
    writeFileSync(join(dir, rel), JSON.stringify(CLEAN, null, 2));

    const at = run(["--at", head, rel], dir);
    assert.equal(at.status, 2, at.stdout + at.stderr);
    assert.match(at.stdout, /FINDING capture-uuid {2}test\/fixtures\/harvested\/dirty\.json/);
    assert.ok(!at.stdout.includes(FAKE_UUID), "--at must not echo the match either");

    // …and the identity is the same one the file mode reports for those bytes,
    // which is the whole basis on which the hook compares the two sides.
    const idAt = at.stdout.match(/#([0-9a-f]{12})\)/)[1];
    assert.equal(idAt, scanDocument(SEEDED["capture-uuid"]).findings[0].id);
  });
});

test("--at: a path that does not resolve at the ref contributes nothing and SAYS so", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    writeFileSync(join(dir, "a.md"), "clean\n");
    g("add", "-A");
    g("commit", "-qm", "seed");
    const head = g("rev-parse", "HEAD");

    const r = run(["--at", head, "nicht/da.md"], dir);
    // Clean, but never SILENTLY clean: an unreadable version that read as
    // "carries no findings" would let the hook treat it as a checked one.
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /^degraded: nicht\/da\.md does not resolve at /m);
  });
});

test("--at: the exemption is class-scoped here too, not path-wide", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    const led = seedCorpusFile(dir, "LEDGER-Testhost.json",
      { ...SEEDED["capture-uuid"], ts: "2026-08-05T09:10:03.000Z" });
    g("add", led);
    g("commit", "-qm", "seed");
    const head = g("rev-parse", "HEAD");

    const r = run(["--at", head, led], dir);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, /FINDING capture-uuid/, "the class it is NOT exempt from fires");
    assert.ok(!r.stdout.includes("FINDING live-timestamp"), "the exempt class stays quiet");
  });
});

test("--at: a missing ref or path is a usage error, not a silent clean", () => {
  withTemp((dir) => {
    gitRepo(dir);
    assert.equal(run(["--at"], dir).status, 1);
    assert.equal(run(["--at", "HEAD"], dir).status, 1);
  });
});

// --- Bites taken from upstream in the 2026-08-16 merge -----------------------
//
// This fork's scanner already carries the behaviour all three assert — the
// leading-boundary regex is byte-identical on both sides. What the fork did NOT
// carry is anything that PINS it. A predicate on the one gate standing in front
// of unscrubbable public history, with the fix in place and no bite holding it
// there, is one careless edit from silently reverting.

test("NAME_UUID_PREFIX: the leading boundary drops word-tail collisions and keeps every real capture-id shape", () => {
  // Stated as a PAIR, which is the whole point: the negatives must NOT match
  // (ordinary English words ending in `s`, and a model id), the positives MUST.
  // A boundary fix that only stopped false fires would be satisfied by a regex
  // matching nothing at all — and a guard that fires on legitimate text trains
  // its reader to wave it through, which on this gate is the expensive kind of
  // wrong.
  // Every vector is ASSEMBLED, never written as a literal: this file is scanned
  // by the tool it tests, and `s-` followed by eight hex is precisely the shape
  // that scan exists to find. Writing the vectors out would make the suite a
  // finding in its own repository.
  const H = "12345678";
  const S = "s-";
  for (const negative of [`plus-${H}`, `news-${H}`, `business-${H}`,
                          `claude-3-opus-${"2024"}${"0229"}`]) {
    assert.equal(NAME_UUID_PREFIX.test(negative), false, `must not match: ${negative}`);
  }
  for (const positive of [`${S}${H}`, `prefix-${S}${H}`, `(${S}${H})`, ` ${S}${H}`]) {
    assert.equal(NAME_UUID_PREFIX.test(positive), true, `must match: ${positive}`);
  }
});

test("scanContent: a SOURCE file is scanned by line for capture UUIDs, and the data-only classes never see it", () => {
  const src = [
    "// a comment",
    `const id = "${FAKE_UUID}";`,
    `const blob = "${LONG_B64}";`,
  ].join("\n");
  const r = scanContent(src, "tools/whatever.mjs");
  const classes = r.findings.map((f) => f.class);
  assert.deepEqual(classes, ["capture-uuid"],
    "the b64 blob must NOT fire on source — pointing the data-only classes at source fires on legitimate long tokens");
  // The line NUMBER, never the line: a leak reporter that echoes the leak has
  // moved it, not found it.
  assert.match(r.findings[0].path, /^line \d+$/);
  assert.ok(!JSON.stringify(r.findings).includes(FAKE_UUID),
    "a finding must not carry the identifier it found");
});

test("git-range: an empty corpus scope reads as passing, and does not widen to skip the byte-level classes", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    mkdirSync(join(dir, "test", "fixtures"), { recursive: true });
    writeFileSync(join(dir, "test/fixtures/clean.json"), JSON.stringify(CLEAN));
    g("add", "test/fixtures/clean.json");
    g("commit", "-qm", "no harvested dir, clean file");
    const first = g("rev-parse", "HEAD");
    const clean = run(["--git-range", `EMPTY..${first}`], dir);
    assert.equal(clean.status, 0, clean.stdout + clean.stderr);
    assert.match(clean.stdout, /absence-scan: clean/);

    // A leak placed outside the (nonexistent) corpus directory must still be
    // caught: an absent CORPUS_SCOPE must never be read as "skip everything."
    writeFileSync(join(dir, "test/fixtures/dirty.json"), JSON.stringify(SEEDED["capture-uuid"]));
    g("add", "test/fixtures/dirty.json");
    g("commit", "-qm", "leak outside the absent corpus dir");
    const second = g("rev-parse", "HEAD");
    const dirty = run(["--git-range", `${first}..${second}`], dir);
    assert.equal(dirty.status, 2, dirty.stdout + dirty.stderr);
    assert.match(dirty.stdout, /FINDING capture-uuid {2}test\/fixtures\/dirty\.json/);
  });
});

// --- the source-scope foreign-path class, and its declaration ----------------
//
// The class was scoped "corpus" until 2026-08-26 and therefore structurally
// blind to `.md`/`.mjs`, which is the leak direction the lifecycle plugin repo
// lives on the wrong side of (design §3.3). Widening it put two new things
// under test: the SCOPE (does the source route apply it) and the DECLARATION
// that gates the scope per repo. Every arm below drives the real CLI the way
// the pre-push hook drives it, because a unit-level check would leave the
// stdin/exit-code/decision plumbing the guard actually ships with unexercised.
//
// The payload is fixed across the arms and its ONLY violation is the foreign
// path: no UUID, no `s-`+8hex capture key, no 200-character base64 run. That
// is what makes a finding here discriminating — a payload that any other class
// would also catch could not tell this class's reach from theirs.
const FOREIGN_LINE = "see /home/otheruser/dev/some-other-project/tools/build.sh for details";

/** Write the repo's `leak-scan` declaration. `value === undefined` writes a
 * `leak-scan` object with no key; `null` writes no file at all. */
function declare(dir, value, { object = true } = {}) {
  if (value === null) return;
  mkdirSync(join(dir, ".claude"), { recursive: true });
  const body = object
    ? JSON.stringify({ "leak-scan": value === undefined ? {} : { "source-scope-foreign-path": value } })
    : JSON.stringify({ schema: 2 });
  writeFileSync(join(dir, ".claude/lifecycle.json"), body);
}

/** A repo carrying one `.md` with the foreign line, committed, plus whatever
 * declaration the arm wants. Returns the CLI result over the whole history. */
function sourceScopeArm(dir, declared, opts) {
  const g = gitRepo(dir);
  writeFileSync(join(dir, "notes.md"), `# notes\n\n${FOREIGN_LINE}\n`);
  declare(dir, declared, opts);
  g("add", "-A");
  g("commit", "-qm", "notes");
  return run(["--git-range", `EMPTY..${g("rev-parse", "HEAD")}`], dir);
}

test("source scope: declared ON, a foreign path in a .md is caught — the reach the corpus scope did not have", () => {
  withTemp((dir) => {
    const r = sourceScopeArm(dir, true);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, /FINDING foreign-path {2}notes\.md {2}line 3/);
    assert.ok(!r.stdout.includes("some-other-project"), "the CLI must not echo the matched path");
  });
});

test("source scope: declared OFF, the same payload is clean and says nothing about a declaration it read fine", () => {
  withTemp((dir) => {
    const r = sourceScopeArm(dir, false);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(!r.stdout.includes("FINDING foreign-path"), r.stdout);
    assert.ok(!r.stdout.includes("could not be read"),
      "a declaration that WAS read must not report a could-not-verify line");
  });
});

// THE THIRD ANSWER, which is the arm that usually goes unbuilt: an absent,
// shapeless, unparseable or non-boolean declaration is COULD-NOT-VERIFY —
// named on a degraded: line, with the scope OFF. Never a silent default in
// either direction: ON would put a guard that fires on legitimate work onto a
// push boundary, and OFF without saying so is how a declaration goes
// decorative, which is the defect this wiring exists to end.
for (const [label, value, opts] of [
  ["no declaration file at all", null, undefined],
  ["a file with no leak-scan object", false, { object: false }],
  ["a leak-scan object with no key", undefined, undefined],
  ["a key that is not a boolean", "yes", undefined],
]) {
  test(`source scope: ${label} is COULD-NOT-VERIFY — reported, and the scope stays OFF`, () => {
    withTemp((dir) => {
      const r = sourceScopeArm(dir, value, opts);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.ok(!r.stdout.includes("FINDING foreign-path"),
        "could-not-verify must not be read as ON");
      assert.match(r.stdout, /degraded: .*source-scope declaration could not be read/);
    });
  });
}

test("source scope: the assurance line NAMES the class it applied, so it cannot be wider than its predicate", () => {
  withTemp((dir) => {
    const on = sourceScopeArm(dir, true);
    assert.match(on.stdout, /source file\(s\) — capture-key-prefix, capture-uuid, foreign-path only/);
  });
  withTemp((dir) => {
    const off = sourceScopeArm(dir, false);
    assert.match(off.stdout, /source file\(s\) — capture-key-prefix, capture-uuid only/,
      "with the scope off the line must not claim a class that did not run");
  });
});

test("source scope: a path under the SCANNED repo's own root does not fire, while a foreign one beside it does", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    // Derived, never hardcoded — the same question the class asks.
    const root = g("rev-parse", "--show-toplevel");
    writeFileSync(join(dir, "notes.md"), `# notes\n\nbuilt in ${root}/tools/build.sh\n`);
    declare(dir, true);
    g("add", "-A");
    g("commit", "-qm", "own root");
    const clean = run(["--git-range", `EMPTY..${g("rev-parse", "HEAD")}`], dir);
    assert.equal(clean.status, 0, clean.stdout + clean.stderr);

    // The PAIR: the same file, same shape, a foreign path. Without this the
    // clean result above is indistinguishable from a class that never ran.
    writeFileSync(join(dir, "notes.md"), `# notes\n\nbuilt in ${root}/tools/build.sh\n${FOREIGN_LINE}\n`);
    g("add", "-A");
    g("commit", "-qm", "foreign beside it");
    const red = run(["--git-range", `EMPTY..${g("rev-parse", "HEAD")}`], dir);
    assert.equal(red.status, 2, red.stdout + red.stderr);
  });
});

test("source scope: the CORPUS route kept the class — widening was a widening, not a move", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    // Declared OFF, so only the corpus route can produce this finding.
    declare(dir, false);
    const rel = seedCorpusFile(dir, "dirty.json", SEEDED["foreign-path"]);
    g("add", "-A");
    g("commit", "-qm", "corpus leak");
    const r = run(["--git-range", `EMPTY..${g("rev-parse", "HEAD")}`], dir);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, new RegExp(`FINDING foreign-path {2}${rel.replace(/[/.]/g, "\\$&")}`));
  });
});

// --- exemptRoots resolves from the COMMON dir --------------------------------

test("exemptRoots: the flag ORDER that makes --git-common-dir absolute, pinned from a MAIN checkout", () => {
  withTemp((dir) => {
    gitRepo(dir);
    const ask = (...args) =>
      spawnSync("git", ["rev-parse", ...args], { cwd: dir, encoding: "utf-8", env: SCRUBBED_GIT_ENV })
        .stdout.trim();
    // A temp repo is a MAIN checkout, which is the only place this can fail:
    // inside a worktree BOTH orders answer absolute, so a check written there
    // cannot go red. Measured on git 2.55.0.
    assert.ok(ask("--path-format=absolute", "--git-common-dir").startsWith(sep),
      "flags in this order must yield an absolute path — the scanner takes dirname() of it");
    assert.ok(!ask("--git-common-dir", "--path-format=absolute").startsWith(sep),
      "and the reversed order must NOT, which is exactly why the order is load-bearing: " +
      "dirname('.git') is '.', silently making the exempt root the process cwd");
  });
});

test("exemptRoots: read from a WORKTREE, the main checkout's own path is still this repo — not foreign", () => {
  const wt = `${tmpDirSync("absence-scan-wt-")}-tree`;
  withTemp((dir) => {
    try {
      const g = gitRepo(dir);
      const root = g("rev-parse", "--show-toplevel");
      declare(dir, true);
      // Prose naming the MAIN checkout — ordinary operating text about this
      // repo's own tree, which is what the class must not call foreign.
      writeFileSync(join(dir, "notes.md"), `# notes\n\nbuilt in ${root}/tools/build.sh\n`);
      g("add", "-A");
      g("commit", "-qm", "seed");
      g("worktree", "add", "-q", wt, "-b", "side");

      const clean = run(["--git-range", `EMPTY..${g("rev-parse", "HEAD")}`], wt);
      assert.equal(clean.status, 0,
        "read from a worktree, --show-toplevel answers the WORKTREE, so the main checkout's " +
        "own path read as another project — the defect this resolves from the common dir to fix:\n" +
        clean.stdout + clean.stderr);

      // The pair again: the worktree must still catch a genuinely foreign path,
      // or the green above would only prove the class stopped running there.
      writeFileSync(join(wt, "notes.md"), `# notes\n\nbuilt in ${root}/x\n${FOREIGN_LINE}\n`);
      const gw = (...args) =>
        spawnSync("git", args, { cwd: wt, encoding: "utf-8", env: SCRUBBED_GIT_ENV }).stdout.trim();
      gw("add", "-A");
      gw("commit", "-qm", "foreign in the worktree");
      const red = run(["--git-range", `EMPTY..${gw("rev-parse", "HEAD")}`], wt);
      assert.equal(red.status, 2, red.stdout + red.stderr);
    } finally {
      rmSync(wt, { recursive: true, force: true });
    }
  });
});

test("exemptRoots: a GIT_DIR-redirected environment — the hook's real one — resolves the same roots as a plain shell", () => {
  withTemp((dir) => {
    const g = gitRepo(dir);
    const root = g("rev-parse", "--show-toplevel");
    declare(dir, true);
    writeFileSync(join(dir, "notes.md"), `# notes\n\nbuilt in ${root}/tools/build.sh\n`);
    g("add", "-A");
    g("commit", "-qm", "seed");
    const head = g("rev-parse", "HEAD");

    const plain = run(["--git-range", `EMPTY..${head}`], dir);
    // Git exports GIT_DIR into every hook — absolute for worktree operations —
    // and child processes inherit it, so this is the environment the guard
    // ACTUALLY runs in. If the two disagree, the guard exempts one set of
    // paths for a human and another for the hook.
    const hookish = spawnSync(process.execPath, [TOOL, "--git-range", `EMPTY..${head}`],
      { cwd: dir, encoding: "utf-8", env: { ...SCRUBBED_GIT_ENV, GIT_DIR: join(dir, ".git") } });
    assert.equal(hookish.status, plain.status,
      `plain:\n${plain.stdout}${plain.stderr}\nunder GIT_DIR:\n${hookish.stdout}${hookish.stderr}`);
    assert.equal(hookish.stdout, plain.stdout, "the two environments must resolve the same exempt roots");
  });
});

test("the bootstrap pair is exempt from foreign-path ONLY, and is still scanned for everything else", () => {
  for (const p of ["tools/absence-scan.mjs", "test/absence-scan.test.mjs"]) {
    const e = exemptClasses(p);
    assert.ok(e !== "all" && e.has("foreign-path"),
      `${p} must carry the bootstrap exemption — without it the guard denies its own source and cannot land`);
    assert.equal(isAllowlisted(p), false,
      `${p} must NOT be a whole-file skip: every other class still fires there`);
  }
  // And the exemption is exactly two files wide — a third would be a scrub
  // verdict wearing a bootstrap entry's costume.
  assert.equal(exemptClasses("tools/backlog-lint.mjs").has?.("foreign-path") ?? false, false);
});
