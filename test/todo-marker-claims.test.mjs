// todo-marker-claims — BACKLOG.md, "a comment claiming a `{ todo }` marker
// exists is checkable against the runner, and nothing checks it."
//
// THE CLASS: "prose about a test contradicting the test." `c3481d1` fixed
// three such claims by hand in `test/tool-output-stamps.test.mjs` — its
// header said two assertions "carry `{ todo }` markers" and that ARM 1 "is
// RED on this tree, on purpose," when both had already been fixed and
// de-todo'd by an EARLIER desk pass (2026-08-08, per that file's own inline
// comment). The mismatch is silent by construction: the suite is green
// either way — a stale claim about a todo marker does not itself make
// anything fail — so only a human reading the header ever catches it. The
// JUDGMENT half (is this sentence a claim about the present, or an accurate
// description of the past?) stays prose, exactly as the entry says; the
// COMPUTABLE slice is whether a file's comment claims `{ todo }` while
// carrying no real todo-marked test declaration to back it — and if not,
// whether that specific mention has been read and classified by a human as
// safe (declared here, as data).
//
// THE SHAPE, borrowed from the same file this class was found in
// (`test/tool-output-stamps.test.mjs:243-259`, "ARM 2 — no --json flag"):
// pin an exact count/set against the real source, and fail when a new,
// unclassified instance appears. Not a softened regex — the check never
// decides what a sentence MEANS, only that somebody already looked at it.
//
// DECLARED EXEMPTIONS key on (file, a literal copy-pasted FRAGMENT of the
// surrounding sentence) — not the filename alone. A rewording that changes
// what the sentence actually says no longer matches the fragment, loses its
// exemption, and must be re-classified by a human; the exemption cannot
// silently ride on a filename match forever while the prose underneath it
// drifts.
const KNOWN_COMMENT_ONLY_MENTIONS = [
  {
    file: "tool-output-stamps.test.mjs",
    contains: "The two assertions carried `{ todo }` while",
    reason: "c3481d1 (2026-08-10): narrates a PAST fix — f9ec558 removed the "
      + "markers on 2026-08-08. Past tense, describing history, not a claim "
      + "about this file's present state.",
  },
];

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEST_DIR = join(REPO, "test");
const THIS_FILE = "todo-marker-claims.test.mjs";

// A COMMENT-shaped claim: `{ todo }`, bare, no colon. This is deliberately
// NOT valid node:test syntax on its own — the real API is `{ todo: true }`
// or `{ todo: "reason" }` (a colon, always) and `test.todo(name, fn)`, so a
// bare `{ todo }` cannot appear as an actual declaration; it only shows up
// in prose ABOUT one, which is exactly the class this file's own real
// occurrences confirm (grepped 2026-08-10: every hit across test/*.mjs sits
// inside a `//` comment).
const COMMENT_CLAIM_RE = /\{\s*todo\s*\}/g;

/** A REAL todo declaration: node's own two spellings, either one. */
function hasRealTodoDeclaration(text) {
  return /\{\s*todo\s*:/.test(text) || /\.todo\(/.test(text);
}

/**
 * The check's core logic, pure — takes `{name, text}` pairs rather than
 * reading a directory itself, so the red-first bite below can feed it the
 * historical blob without ever touching the working tree, and the
 * new-mention bite can feed it a synthetic file without writing into the
 * real test/ directory.
 */
export function findUnclassifiedTodoClaims(files) {
  const findings = [];
  for (const { name, text } of files) {
    if (name === THIS_FILE) continue; // this file's OWN declared-exemption
    // strings above are matches for the pattern too; they are data, not a claim.
    const mentions = [...text.matchAll(COMMENT_CLAIM_RE)];
    if (mentions.length === 0) continue;
    if (hasRealTodoDeclaration(text)) continue; // the claim is backed by a real one in this same file
    for (const m of mentions) {
      const exempt = KNOWN_COMMENT_ONLY_MENTIONS.some((e) => e.file === name && text.includes(e.contains));
      if (!exempt) {
        findings.push({
          file: name,
          excerpt: text.slice(Math.max(0, m.index - 50), m.index + 50).replace(/\s+/g, " ").trim(),
        });
      }
    }
  }
  return findings;
}

/** Every declared exemption's fragment must actually be found in its named file TODAY — an orphaned exemption is the over-firing risk in mirror. */
export function findOrphanedExemptions(files) {
  const byName = new Map(files.map((f) => [f.name, f.text]));
  return KNOWN_COMMENT_ONLY_MENTIONS.filter((e) => {
    const text = byName.get(e.file);
    return text === undefined || !text.includes(e.contains);
  });
}

function readTestDir(dir = TEST_DIR) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".mjs"))
    .map((name) => ({ name, text: readFileSync(join(dir, name), "utf8") }));
}

// --- CONTROL: the real test tree, today, is fully classified ---------------

test("CONTROL — every `{ todo }` comment claim in test/*.mjs today is either backed by a real todo test or a declared, matched exemption", () => {
  const findings = findUnclassifiedTodoClaims(readTestDir());
  assert.deepEqual(findings, [], `unclassified todo-marker claim(s): ${JSON.stringify(findings, null, 2)}`);
});

test("CONTROL — no declared exemption has gone orphaned (its fragment must still be found in its file)", () => {
  const orphaned = findOrphanedExemptions(readTestDir());
  assert.deepEqual(orphaned, [], `exemption fragment no longer found in its file: ${JSON.stringify(orphaned, null, 2)}`);
});

// --- RED-FIRST, against an IMMUTABLE reference ------------------------------
//
// `git show <sha>:<path>` rather than `git checkout <sha> -- <path>`,
// deliberately: `node --test` runs each test FILE in its own worker process,
// and this suite runs many files concurrently — mutating the real
// tool-output-stamps.test.mjs on disk while another worker might be mid-way
// through importing or running it is a real race this repo's own dev-loop
// warns about (shared mutable fixtures). `git show` is read-only and never
// touches the working tree, which gets the identical evidentiary value (the
// exact historical blob, addressed by an immutable commit) without the race.

const OLD_SHA = "c3481d1^"; // the commit BEFORE the fix — the false claim's own home

test("RED-FIRST — the OLD blob (c3481d1^) fails, naming tool-output-stamps.test.mjs", () => {
  const oldText = execFileSync("git", ["-C", REPO, "show", `${OLD_SHA}:test/tool-output-stamps.test.mjs`], {
    encoding: "utf8",
  });
  // Baseline stated: prove this really is the pre-fix blob, not the current
  // one — it must NOT contain the exemption's exact (post-fix) wording.
  assert.ok(
    !oldText.includes("The two assertions carried `{ todo }` while"),
    "the fetched blob unexpectedly matches TODAY's wording — this is not the pre-fix blob",
  );
  const findings = findUnclassifiedTodoClaims([{ name: "tool-output-stamps.test.mjs", text: oldText }]);
  assert.ok(findings.length > 0, "the pre-fix blob's stale `{ todo }` claim(s) must be caught, not silently pass");
  assert.ok(findings.every((f) => f.file === "tool-output-stamps.test.mjs"));
});

// --- The over-firing control: a genuinely real todo IS backed, not flagged -

test("BITE — a file whose comment claim IS backed by a real todo declaration is not a finding", () => {
  const text = "// this test carries a `{ todo }` marker until tools/ ships the fix\n"
    + "test('x', { todo: true }, () => {});\n";
  const findings = findUnclassifiedTodoClaims([{ name: "synthetic.mjs", text }]);
  assert.deepEqual(findings, []);
});

test("BITE — a file whose comment claim is declared exempt (matching fragment) is not a finding", () => {
  const text = "// The two assertions carried `{ todo }` while tools/ sat outside the boundary\n";
  const findings = findUnclassifiedTodoClaims([{ name: "tool-output-stamps.test.mjs", text }]);
  assert.deepEqual(findings, []);
});

// --- The class this check exists for: a NEW, unclassified mention fails ----

test("BITE — a NEW `{ todo }` claim, anywhere, with no real todo and no declared exemption, IS a finding", () => {
  const text = "// FIXME: this one still carries a `{ todo }` marker\n";
  const findings = findUnclassifiedTodoClaims([{ name: "brand-new-file.test.mjs", text }]);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, "brand-new-file.test.mjs");
});

test("BITE — a declared exemption whose fragment no longer appears anywhere is reported as ORPHANED", () => {
  const files = [{ name: "tool-output-stamps.test.mjs", text: "// completely reworded, no mention of todo at all\n" }];
  const orphaned = findOrphanedExemptions(files);
  assert.equal(orphaned.length, 1);
  assert.equal(orphaned[0].file, "tool-output-stamps.test.mjs");
});
