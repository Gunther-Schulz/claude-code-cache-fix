#!/usr/bin/env node
// absence-scan — the fixture hygiene classes, as an importable scanner and a
// CLI, so they can run where the exposure actually is.
//
// WHY THIS EXISTS AT ALL. The classes below were written as assertions inside
// test/harvest-scrub-relations.test.mjs §6 and fire at TEST time. The cost
// they guard against is paid at PUSH time: a harvested fixture carrying
// capture identifiers reached a public PR, and public git history cannot be
// scrubbed afterwards (the remediation for a leaked origin IP in a sibling
// repo was recreating the host). A check that only runs when someone runs the
// suite is not in front of that boundary. This file is the same check, made
// runnable by the pre-push hook the dotfiles repo deploys — the manual
// finding is the prototype, the mechanism is the deliverable
// (docs/dev-loop.md, "Adding a check").
//
// WHAT IT IS NOT. This is an EXTRACTION, not a redesign. Every predicate here
// is the one §6 encoded on 2026-07-31; nothing was tightened and nothing was
// loosened. The classes' DEFINITION is
// docs/directives/fixture-sanitization-directive.md ("Threat model" + settled
// designs 2 and 5), restated in §6 and restated again here — deliberately not
// read back out of tools/harvest.mjs, because an expectation with the same
// parentage as the code pins the bug it should catch.
//
// FINDINGS NEVER ECHO THE MATCH. A leak reporter that prints the leak into a
// terminal, a CI log or a hook transcript has moved the leak, not found it. A
// finding carries the class, the file, the JSON path that reaches the string,
// lengths, and a HASHED identity (see "Finding identity"). Never the bytes.
//
// THE THIRD ANSWER (docs/dev-loop.md, "A checker has THREE answers"): a file
// that does not parse is neither silently skipped nor silently passed — it is
// scanned as raw bytes (so the two byte-level classes still apply) and named
// on a `degraded:` line, so a run that could not fully verify says so.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { basename } from "node:path";

// --- Allowlist ---------------------------------------------------------------
//
// Lives here rather than in either caller, so the test and the push hook
// cannot drift apart on what is accepted.
//
// LEDGER-*.json is the per-machine harvest watermark ledger. The exemption
// covers ONE class: `live-timestamp`, which fires on its `lastHarvest` fields.
// Those ARE the file's content — a watermark ledger whose watermarks were
// scrubbed would not be one.
//
// NARROWED 2026-08-05, because the old wording ("keyed by raw capture key BY
// DESIGN") read as though the exemption also blessed the identifiers, and for
// months everyone including this comment's author took it that way. It never
// did — the ids were invisible for an unrelated reason (object KEY names were
// not scanned at all), so nothing ever tested the assumption. 94 full session
// identifiers sat in this tracked, public file.
//
// Both halves are fixed rather than exempted: keys are hashed at the source
// (harvest.mjs `ledgerKey`), and key names are now scanned. What remains here
// is only the timestamps, which is what a residual should look like — one
// named class, with a reason that survives being read carefully.
// Entries are {pattern, classes}: which CLASSES a path is exempt from, never
// the whole file. A path-wide exemption is a hole with a comment on it — it
// hides every class, including ones nobody had thought about when the
// exemption was written, and it is exactly how this file's own ledger kept 94
// session identifiers out of sight. `classes: "all"` remains expressible but
// nothing uses it, deliberately.
//
// rowpins/ — the daily sweep's row evidence pins (gate-live.mjs). Same ONE
// class and the same reason as the ledger above: the instant a pin carries is
// its join to the bust ledger, i.e. the artifact's content rather than a
// residue of one. Scoped to the DIRECTORY, so a pin that ever carried a
// session id, a capture key or unscrubbed text still fires — the pins' own
// suite asserts both halves, that live-timestamp is exempt here and that
// nothing else is.
//
// Added 2026-08-07 on an operator correction. It shipped hours earlier at day
// precision with the hour-join written down as a named residual, and this
// session then recommended leaving it "until a join actually needs the hour" —
// which is the deferral the dev-loop's standing tooling rule now forbids by
// name, since booking it cost what building it cost.
export const ALLOWLIST = [
  {
    pattern: /(^|\/)test\/fixtures\/harvested\/LEDGER-[^/]*\.json$/,
    classes: ["live-timestamp"],
  },
  {
    pattern: /(^|\/)test\/fixtures\/harvested\/rowpins\/[^/]*\.json$/,
    classes: ["live-timestamp"],
  },
  // census-rows/ — the byte-gate census's row-level evidence (the MISMATCH
  // occurrences, the duplicate streaks, the volatile-pin entries). Same ONE
  // class and the same reason as the two above: a row's instant is its join
  // to the bust ledger and to the capture it was measured in, and a row whose
  // stamp were scrubbed could no longer be checked against anything.
  //
  // These documents are body-free BY CONSTRUCTION rather than by scrubbing —
  // every row field is a length, an index, an ordinal, an instant, a
  // `sidToken` or a closed-vocabulary label, and no message text ever enters
  // them. That is what makes ONE exempted class sufficient here: measured on
  // the first committed document, all 1,317 findings were `live-timestamp`
  // and zero were anything else. `test/evidence-census-rows.test.mjs` asserts
  // both halves — the class is exempt inside this directory, every other
  // class still fires there (planted positive), and the rows carry no free
  // text, which is the property that keeps the single class sufficient as
  // the writer changes.
  {
    pattern: /(^|\/)test\/fixtures\/harvested\/census-rows\/[^/]*\.json$/,
    classes: ["live-timestamp"],
  },
  // test/absence-scan.test.mjs's own SOURCE_UUID_ALLOWLIST holds ~15
  // deliberately synthetic UUIDs (fixture seeds, a roster of every one this
  // repo's own source is allowed to carry) that scanSourceText's capture-uuid
  // check (2026-08-10 fix: "a full UUID in a commit message was invisible to
  // the scanner") now flags on every touch of this file — correct behaviour
  // in general, redundant noise here specifically, because this exact file
  // is ALSO the home of a dedicated roster test ("source: every UUID in a
  // tracked SOURCE_SCANNABLE file is on the synthetic allowlist") that
  // independently re-verifies every UUID this file carries against that same
  // roster, on every `npm test` run — the second pre-push layer. Exempting
  // capture-uuid here trades nothing: a genuinely NEW, unlisted UUID landing
  // in this file still fails that roster test. Class-scoped, not a full
  // skip — capture-key-prefix and every other class still applies.
  {
    pattern: /(^|\/)test\/absence-scan\.test\.mjs$/,
    classes: ["capture-uuid"],
  },
];

// An `allowlisted` list entry, tagged by which ROUTE produced it — a
// whole-file SKIP (isAllowlisted: true, the file is never scanned at all) or
// a class-scoped DROP (the file WAS scanned, and only some of its findings
// were excused). Both used to render as one `allowlisted: <path>` line,
// which could not tell a reader whether a reported file had been scanned at
// all — exactly the distinction the 2026-08-05 narrowing (isAllowlisted
// above) was made to create, and lost again the moment both routes printed
// identically (BACKLOG "absence-scan's allowlisted: line cannot distinguish
// a whole-file SKIP from a class-scoped DROP").
export const skipEntry = (path) => ({ path, route: "skip" });
export const exemptEntry = (path, exempt) => ({ path, route: "exempt", classes: [...exempt].sort() });

/** The printed line for one allowlist entry — exported so the two routes'
 * output can be proven to differ without a real `classes: "all"` ALLOWLIST
 * entry (there is deliberately none today) and without touching this file's
 * own ALLOWLIST at test time (this repo's convention: no self-mutating test
 * over tools/ — see test/tool-output-stamps.test.mjs's quota-analysis
 * section). */
export function formatAllowlistLine(entry) {
  return entry.route === "skip"
    ? `skipped (all classes): ${entry.path}`
    : `exempt ${entry.classes.join(",")}: ${entry.path}`;
}

/** The class names a path is exempt from — empty when it is exempt from none. */
export function exemptClasses(path) {
  const p = String(path).replace(/\\/g, "/");
  const out = new Set();
  for (const e of ALLOWLIST) {
    if (!e.pattern.test(p)) continue;
    if (e.classes === "all") return "all";
    for (const c of e.classes) out.add(c);
  }
  return out;
}
//
// RETIRED 2026-08-05: `test/fixtures/cc-transcript-shape-snapshot.json`. The
// entry existed because that fixture was captured from a real transcript and
// carried its identifiers — an exemption for content the fork could not
// change. The fixture has since been REBUILT from known-safe parts (synthetic
// identifiers, no UUID-shaped values, no base64 run), so it now passes the
// classes on their merits and needs no exemption. Recorded rather than
// deleted silently: an allowlist that shrinks because the hazard was removed
// is a different fact from one that shrinks because someone softened it.

/**
 * True only when a path is exempt from EVERY class — i.e. genuinely skippable.
 * Narrowed 2026-08-05: it used to mean "appears in the allowlist at all",
 * which made a one-class exemption skip the whole file. Callers that want to
 * know what a path is exempt FROM ask `exemptClasses`.
 */
export function isAllowlisted(path) {
  const e = exemptClasses(path);
  if (e === "all") return true;
  return e.size > 0 && CLASS_NAMES.every((n) => e.has(n));
}

// --- Scope -------------------------------------------------------------------
//
// §6 states its scope in the same breath as its classes: "every committed
// fixture under test/fixtures/harvested". That scope is part of the
// DEFINITION, not an implementation detail of the test, and carrying it over
// is what keeps the classes honest — three of the five say what a SANITIZED
// HARVEST looks like, and a hand-authored proxy fixture is not one.
//
// Measured 2026-08-01, all five classes over every tracked *.json/*.jsonl in
// this repo (`node tools/absence-scan.mjs $(git ls-files '*.json' '*.jsonl')`
// before this scoping existed): 219 findings, of which ~205 were synthetic
// hand-authored test data — English prose in `text` fields, `ts` fields
// written by hand, a 4-character `source.data` placeholder. A guard that fires
// on those fires on every push and trains the --no-verify reflex that kills
// it (docs/dev-loop.md: "a check that fires on a non-defect is also broken").
//
// The two BYTE-level classes are not scoped, because they need no corpus to be
// true: a 200-character base64 run and an 8-4-4-4-12 UUID are a payload and a
// live capture identifier wherever they sit. Their measured false-fire rate
// over the same sweep was zero, and their true positives were real.
export const CORPUS_SCOPE = /(^|\/)test\/fixtures\/harvested\//;
export const inCorpus = (file) => CORPUS_SCOPE.test(String(file).replace(/\\/g, "/"));

// --- The class definitions ---------------------------------------------------

// (a) An image payload, a thinking signature or an encoded blob looks like a
//     long run of the base64 alphabet. 200 characters is the threshold §6 set.
export const B64_RUN = /[A-Za-z0-9+/]{201,}/;
// (d) A capture identifier. Session keys and sids appear only as `s-<sha12>`
//     tokens, which carry no dashes and so cannot satisfy this shape.
export const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
// (d) …and a filename is as public as the content it names. The capture-derived
//     name carries `s-<sha12>`: 12 hex, never 8, so a name can never be matched
//     back to a session by prefix.
export const NAME_UUID_PREFIX = /(^|[^0-9a-zA-Z])s-[0-9a-f]{8}(?![0-9a-f])/;
// (c) A whole-string ISO-8601 instant. Deliberately whole-string: a date inside
//     authored prose (a fixture's own "measured on …" provenance note, a growth
//     artifact's filename) is documentation the artifact exists to carry.
export const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
export const EPOCH_START = Date.parse("2000-01-01T00:00:00.000Z");
export const EPOCH_END = Date.parse("2001-01-01T00:00:00.000Z");
// (b) A nested wire payload, tokenized.
export const DATA_TOKEN = /^data_[0-9a-f]{10}$/;
// (e) A tokenized text: `t_<sha256-prefix-12>_<length>` per "\n\n" segment,
//     with a <system-reminder> wrapper surviving verbatim around a tokenized
//     inner text.
export const TOKEN = /^t_[0-9a-f]{12}_[0-9]+$/;
export const WRAP = /^<system-reminder>\n([\s\S]*)\n<\/system-reminder>\s*$/;
export const CONTENT_KEYS = new Set(["text", "thinking", "content"]);

export const wellFormed = (scrubbed) =>
  scrubbed.split("\n\n").every((seg) => seg === "" || TOKEN.test(seg));

// Every string in a document — VALUES and KEY NAMES both — with the path that
// reaches it and the object that owns it, so the scan sees structure
// (`source.data`) as well as bytes.
//
// KEY NAMES WERE INVISIBLE UNTIL 2026-08-05, and that was not a small gap. A
// map keyed BY the thing being protected is an ordinary shape — this repo's own
// harvest watermark ledger is `{"keys": {"<full session uuid>": {...}}}` — so
// 94 live session identifiers sat in a tracked public file that the UUID class
// would have caught instantly had they been on the other side of the colon.
// Measured: the identical UUID reported `capture-uuid` as a value and nothing
// at all as a key.
//
// A key is yielded with `owner: null` and `key: null`: the structural classes
// (`source.data`) ask about the object that OWNS a value, and a key name has
// no such owner. Its path ends in `~key` so a finding can say which side of
// the colon it was on without echoing the bytes.
export function* strings(node, path = "$") {
  if (typeof node === "string") return yield { path, value: node, owner: null };
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) yield* strings(node[i], `${path}[${i}]`);
    return;
  }
  if (node && typeof node === "object") {
    let idx = -1;
    for (const [k, v] of Object.entries(node)) {
      idx++;
      // The path must not BE the key: a finding reports where, never what,
      // and for a key-position string the name is the match. Positional
      // instead, so `$.keys[#3]~key` locates it in the object's own order
      // without reproducing the identifier the finding exists to flag.
      yield { path: `${path}[#${idx}]~key`, value: k, owner: null, key: null };
      if (typeof v === "string") yield { path: `${path}.${k}`, value: v, owner: node, key: k };
      else yield* strings(v, `${path}.${k}`);
    }
  }
}

// `applies` is the class's DOMAIN — how many strings it had an opinion about.
// A caller that wants to know the scan was not vacuous reads the per-class
// counter, which is why the domain is not folded into `violates`.
// `scope`: "any" = true of any committed JSON, "corpus" = defined over the
// sanitized harvested fixture corpus only (see CORPUS_SCOPE above).
export const CLASSES = [
  {
    name: "b64-run",
    scope: "any",
    why: "a base64 run longer than 200 characters is an unsanitized payload",
    applies: () => true,
    violates: ({ value }) => {
      const m = B64_RUN.exec(value);
      return m ? { run: m[0].length } : null;
    },
  },
  {
    name: "nested-payload",
    scope: "corpus",
    why: "a raw source.data is the measured 2026-07-31 image gap",
    applies: ({ key, owner, path }) => key === "data" && !!owner && path.endsWith(".source.data"),
    violates: ({ value }) => (DATA_TOKEN.test(value) ? null : {}),
  },
  {
    name: "live-timestamp",
    scope: "corpus",
    why: "a live wall-clock timestamp survived the rebase onto the fixed epoch",
    applies: ({ value }) => ISO_INSTANT.test(value),
    violates: ({ value }) => {
      const t = Date.parse(value);
      return t >= EPOCH_START && t < EPOCH_END ? null : {};
    },
  },
  {
    name: "capture-uuid",
    scope: "any",
    why: "a session UUID is a live capture identifier",
    applies: () => true,
    violates: ({ value }) => (UUID.test(value) ? {} : null),
  },
  {
    name: "raw-content",
    scope: "corpus",
    why: "raw capture prose in a public-repo fixture",
    // Two accepted non-token literals, both content-free by construction:
    // "REDACTED" (tool-input key shapes, and the pre-2026-07-30 fixed-constant
    // reminder scrub still present in the legacy harvested-*.jsonl fixtures)
    // and the empty string.
    applies: ({ key, value }) => CONTENT_KEYS.has(key) && value !== "" && value !== "REDACTED",
    violates: ({ value }) => {
      const inner = WRAP.exec(value)?.[1] ?? value;
      if (inner === "REDACTED") return null;
      return wellFormed(inner) ? null : {};
    },
  },
];

export const CLASS_NAMES = CLASSES.map((c) => c.name);
const zeroSeen = () => Object.fromEntries(CLASS_NAMES.map((n) => [n, 0]));

/** The classes a given path is in scope for. */
export const classesFor = (file) => (inCorpus(file) ? CLASSES : CLASSES.filter((c) => c.scope === "any"));

// --- Finding identity --------------------------------------------------------
//
// WHY IT EXISTS. The push hook discards findings the other side demonstrably
// already has — blocking them buys nothing, and the `--no-verify` habit it
// trains is the actual damage. Until 2026-08-08 it asked that question of the
// whole BLOB: is this path's blob byte-identical to a published one? Editing
// the file mints a new blob, so a months-old, already-public finding inside it
// read as NEW on every subsequent push, forever. Measured 2026-08-07 on
// claude-worktime.sh: two capture-key-prefix findings whose lines have been
// public since long before, blocking every future edit of that file. This
// identity moves the question down one level, from the file to the finding.
//
// HASHED, NEVER PRINTED — the same rule the rest of this file follows (see the
// header), and the same one the hook's `_nachricht_hash` already applies to
// commit messages. An identity that echoed its match would move the leak into
// every terminal, transcript and CI log the hook writes to.
//
// THE BYTES ARE THE FINDING'S OWN UNIT — the same span its `length` measures:
// the whole source LINE for capture-key-prefix, the whole string VALUE for a
// document class, the basename for the filename class. Deliberately the wider
// span rather than the regex match: `scanSourceText` emits ONE finding per
// line however many keys that line carries, so an identity keyed on the match
// alone would answer "already published" for a line that has just gained a
// fresh identifier next to an old one. The wider unit fails closed — any edit
// to the flagged span mints a new identity, and the finding blocks again.
export const IDENTITY_LEN = 12;
export const findingId = (cls, bytes) =>
  createHash("sha256").update(`${cls}\0${bytes}`, "utf8").digest("hex").slice(0, IDENTITY_LEN);

/**
 * One finding. `bytes` is both what the identity is computed over and what
 * `length` measures — the two cannot drift apart, because there is one
 * argument for both.
 */
const finding = (cls, bytes, rest) =>
  ({ class: cls, ...rest, length: bytes.length, id: findingId(cls, bytes) });

/**
 * Scan one parsed document (or a bare string, for the raw-byte fallback).
 * Returns { findings, seen, scanned } — findings carry class, path and
 * lengths, never the matched bytes.
 *
 * ALL classes by default: a caller holding a document already knows what it
 * is. Path-driven scoping is the job of scanContent, which has a path.
 */
export function scanDocument(doc, { file = "", path = "$", classes = CLASSES } = {}) {
  const findings = [];
  const seen = zeroSeen();
  let scanned = 0;
  for (const entry of strings(doc, path)) {
    scanned++;
    for (const cls of classes) {
      if (!cls.applies(entry)) continue;
      seen[cls.name]++;
      const detail = cls.violates(entry);
      if (detail) {
        findings.push(finding(cls.name, entry.value, { file, path: entry.path, ...detail }));
      }
    }
  }
  return { findings, seen, scanned };
}

/** The filename class (d, second half). Names, not contents. */
export function scanName(file) {
  const name = basename(String(file));
  if (UUID.test(name) || NAME_UUID_PREFIX.test(name)) {
    return [finding("capture-uuid-filename", name, { file, path: "<filename>" })];
  }
  return [];
}

/**
 * Scan file CONTENT already in hand (a blob out of git, a fixture read from
 * disk). `.jsonl` is split per line; a unit that does not parse is scanned as
 * raw bytes and named on the returned `degraded` list — never skipped.
 */
export function scanContent(text, file) {
  // A source file is not a fixture: it has no document shape, and only the
  // short-key class applies to it.
  if (SOURCE_SCANNABLE.test(file) && !SCANNABLE.test(file)) {
    const r = scanSourceText(text, file);
    return { findings: [...scanName(file), ...r.findings], seen: zeroSeen(),
             scanned: 0, degraded: r.degraded, partial: true, sourceOnly: true };
  }
  const findings = [...scanName(file)];
  const seen = zeroSeen();
  const degraded = [];
  const classes = classesFor(file);
  let scanned = 0;
  const isJsonl = /\.jsonl$/i.test(file);
  const units = isJsonl ? text.split("\n").filter((l) => l.trim()) : [text];
  units.forEach((unit, i) => {
    let doc;
    try {
      doc = JSON.parse(unit);
    } catch {
      // Fail closed: the bytes still get the two byte-level classes.
      degraded.push(isJsonl ? `line ${i + 1} does not parse` : "does not parse");
      doc = unit;
    }
    const r = scanDocument(doc, { file, path: isJsonl ? `$[${i}]` : "$", classes });
    findings.push(...r.findings);
    for (const n of CLASS_NAMES) seen[n] += r.seen[n];
    scanned += r.scanned;
  });
  return { findings, seen, scanned, degraded, partial: !inCorpus(file), sourceOnly: false };
}

/** Scan a file from disk. */
export function scanFile(file) {
  return scanContent(readFileSync(file, "utf-8"), file);
}

// --- git range mode ----------------------------------------------------------

export const SCANNABLE = /\.jsonl?$/i;

// Source files get scanned too, but for exactly ONE thing.
//
// The gap this closes was found by planting a UUID rather than by reading:
// `--git-range` filtered candidates to .json/.jsonl BEFORE any class ran, so a
// capture identifier committed into a tracked .mjs or .md passed the push hook
// silently — which is precisely where the 2026-08-02 red-main incident put
// one. The filter, not the class definitions, was what let it through.
//
// Widening SCANNABLE outright was the obvious fix and is the wrong one: it
// would drag the UUID and base64 classes across source files that legitimately
// carry both — dozens of synthetic UUIDs in tests and docs, base64 constants
// in fixtures — and a guard that fires on legitimate work trains the override
// reflex that kills it. So source files get the SHORT-PREFIX class alone,
// whose false-fire rate over this tree was measured at zero after the scrub.
// Extension list rather than "everything not .json": a binary or a lockfile
// has no business here, and an over-broad filter is how a scan gets slow and
// noisy enough to be turned off. Widened 2026-08-05 from (mjs|js|md) after
// counting what it still missed — 30 tracked .sh/.yml/.py/.txt/.bats/
// .template and extensionless files that NOTHING scanned. Measured cost of
// including them: 0 findings.
export const SOURCE_SCANNABLE = /(\.(mjs|cjs|js|md|sh|bash|zsh|ya?ml|py|txt|bats|template|toml|cfg|conf|env)$|^[^.]+$|\/[^./]+$)/i;

// `s-` + exactly 8 hex, bounded on both sides. The 12-hex tokenized form is
// the SANITIZED shape and must not match — that distinction is the whole
// point of the token, and an unanchored version of this pattern corrupts real
// fixture filenames. `claude-3-opus-20240229` contains a matching substring by
// coincidence and is excluded by name rather than by weakening the pattern.
const SHORT_KEY = /(^|[^0-9a-zA-Z])s-[0-9a-f]{8}([^0-9a-f]|$)/;
const SHORT_KEY_EXEMPT = [
  // A model version string. Measured as a false fire on three files before
  // this exemption existed, and it appears BARE (inside a grep pattern in
  // prose) as well as inside the full model name, so the exemption matches the
  // date-shaped token itself rather than its surroundings.
  //
  // Narrower job since the leading boundary was fixed (2026-08-05): inside the
  // full name, `opus-20240229` no longer matches at all, because the `s` is a
  // word tail. What still needs this line is the BARE form — a grep pattern
  // quoted in prose, which `docs/runbooks/upstream-pr-round.md` contains.
  // Verified by removing this entry with the new boundary in place: the bare
  // form fires, the model name stays clean.
  /s-20240229/,
  // This repo's synthetic fixture token, truncated to 8 in a filename-class
  // assertion.
  /s-4b6a4352/,
];

// A line carrying a full 8-4-4-4-12 UUID is not a short key — it is a UUID,
// and the UUID class (`capture-uuid`, exported above as `UUID`) owns that
// shape. `scanSourceText` checks for it FIRST and reports under that class
// name, never `capture-key-prefix`, so the two classes never double-report
// the same string.
//
// UNTIL 2026-08-10 this was the opposite — a SUPPRESSION (`FULL_UUID_HEAD`)
// that dropped the line rather than reclassifying it, deferring detection to
// "the source-UUID roster the suite already walks"
// (test/absence-scan.test.mjs). That deferral held for TRACKED FILES once the
// roster was repaired to walk `git ls-files` filtered through
// SOURCE_SCANNABLE — every file reaching this function is covered by it. It
// never held for COMMIT MESSAGES: `scanGitRange`'s `rangeMessages` calls this
// same function on message text that is never a tracked file, so no
// `git ls-files` roster, however complete, can ever reach it. Measured the
// same day, one investigation later: a session citing this very defect's own
// history wrote a full session UUID directly into a commit message, and
// `scanSourceText` reported it clean — the deferral pointing at a roster that
// structurally cannot see commit text. Reclassifying instead of suppressing
// covers both populations with one predicate: files stay caught (now at the
// cheap git-range layer too, not only by the slower full-suite roster test)
// and commit messages — uncovered until now — are caught for the first time.
/**
 * The short-key class over a source file's raw bytes — and, inline, the
 * capture-uuid class for the same text, since this is the ONLY scan a
 * commit message ever receives (see the comment above). Line-granular so a
 * finding can name where without echoing what — same discipline as every
 * other finding here: class, file, position, length, never the match.
 */
export function scanSourceText(text, file) {
  const findings = [];
  text.split("\n").forEach((line, i) => {
    if (UUID.test(line)) {
      findings.push(finding("capture-uuid", line, { file, path: `line ${i + 1}` }));
      return;
    }
    if (!SHORT_KEY.test(line)) return;
    if (SHORT_KEY_EXEMPT.some((re) => re.test(line))) return;
    findings.push(finding("capture-key-prefix", line, { file, path: `line ${i + 1}` }));
  });
  return { findings, degraded: [] };
}

// `quiet` suppresses git's own stderr for calls whose failure is EXPECTED and
// already reported by the caller — otherwise a `fatal: path … does not exist`
// rides along into the hook transcript beside the `degraded:` line that says
// the same thing more precisely.
function git(args, { quiet = false } = {}) {
  return execFileSync("git", args, { encoding: "utf-8", maxBuffer: 1 << 28,
                                     stdio: quiet ? ["ignore", "pipe", "ignore"] : undefined });
}

/**
 * The commits being pushed, as {sha, text} with subject and body. EMPTY means
 * a new branch: `git log <newRef>` alone would walk to the root and report the
 * whole project's history, so the range is bounded by whatever is already
 * reachable from any other ref — the commits this push actually adds.
 */
function rangeMessages(oldRef, newRef) {
  const args = oldRef === "EMPTY"
    ? ["log", "--format=%H%x00%s%n%b%x01", newRef, "--not", "--all", "--not", newRef, "--branches", "--tags", "--remotes"]
    : ["log", "--format=%H%x00%s%n%b%x01", `${oldRef}..${newRef}`];
  let out;
  try {
    out = git(args);
  } catch {
    return [];
  }
  return out.split("\x01").map((c) => c.trim()).filter(Boolean).map((c) => {
    const [sha, text] = c.split("\x00");
    return { sha: (sha ?? "").slice(0, 12), text: text ?? "" };
  });
}

function rangeFiles(oldRef, newRef) {
  const out =
    oldRef === "EMPTY"
      ? git(["ls-tree", "-r", "--name-only", newRef])
      : git(["diff", "--name-only", "--diff-filter=ACMR", oldRef, newRef]);
  return out.split("\n").map((l) => l.trim())
    .filter((l) => l && (SCANNABLE.test(l) || SOURCE_SCANNABLE.test(l)));
}

/**
 * Files added or modified between two refs, with their content at `newRef`.
 * `oldRef === "EMPTY"` means every file reachable at `newRef` — the new-branch
 * push, where there is no remote side to diff against.
 *
 * An `oldRef` git cannot resolve (a remote sha this clone never fetched)
 * degrades to EMPTY rather than erroring: scanning everything is the
 * fail-closed answer, and it is named on a `degraded:` line.
 */
export function scanGitRange(oldRef, newRef) {
  const degraded = [];
  let from = oldRef;
  if (from !== "EMPTY") {
    try {
      git(["cat-file", "-e", `${from}^{commit}`]);
    } catch {
      degraded.push(`base ref ${from} is not resolvable here — scanning everything at ${newRef}`);
      from = "EMPTY";
    }
  }
  const files = rangeFiles(from, newRef);
  const findings = [];
  const allowlisted = [];
  const seen = zeroSeen();
  let scanned = 0;
  let partial = 0;
  let partialSource = 0;
  for (const file of files) {
    if (isAllowlisted(file)) {
      allowlisted.push(skipEntry(file));
      continue;
    }
    const text = git(["show", `${newRef}:${file}`]);
    const r = scanContent(text, file);
    // Class-scoped exemptions: the file is still SCANNED, and only the
    // findings it is exempt from are dropped. Skipping the file outright —
    // which this did until 2026-08-05 — hides every class, including the ones
    // nobody considered when the exemption was written.
    const exempt = exemptClasses(file);
    const kept = exempt === "all" ? [] : r.findings.filter((f) => !exempt.has(f.class));
    if (kept.length < r.findings.length) allowlisted.push(exemptEntry(file, exempt));
    findings.push(...kept);
    for (const n of CLASS_NAMES) seen[n] += r.seen[n];
    scanned += r.scanned;
    if (r.partial) partial++;
    if (r.sourceOnly) partialSource++;
    degraded.push(...r.degraded.map((d) => `${file}: ${d}`));
  }

  // COMMIT MESSAGES, scanned with the same class as source files.
  //
  // Nothing looked here until 2026-08-05, and the gap has a signature move:
  // a SCRUB commit that names the value it scrubbed. Observed live — a
  // dispatched agent's subject read "replace real capture id <id> in 9 source
  // comments", caught at review by eye. Had it not been, the push would have
  // put the identifier into upstream's refs/pull/N/head, where a later
  // "revert" commit removes nothing: message bytes are as permanent as file
  // bytes and no file-content scan will ever see them.
  //
  // Scoped to the range being pushed, never the whole branch. Run over a
  // branch's full history it reports commits already public, which no push
  // can retract — a gate that cannot pass, which is worse than no gate.
  const messages = rangeMessages(from, newRef);
  for (const { sha: csha, text } of messages) {
    const r = scanSourceText(text, `commit ${csha}`);
    findings.push(...r.findings);
  }

  return { findings, seen, scanned, degraded, allowlisted, files, partial, partialSource,
           messages: messages.length };
}

// --- one published version of a path -----------------------------------------

/**
 * The findings of `paths` AS THEY STAND AT `ref` — content out of git, but
 * classified under each path's own LOGICAL name, so the allowlist, the
 * class-scoped exemptions and the harvested-corpus scope rule all decide
 * exactly what they decide in `--git-range`. Reusing `scanContent` rather than
 * re-deriving the classification is the point: a second reading of "what is a
 * finding here" would drift from this one silently (docs/dev-loop.md, "Never
 * hand-roll identity in a probe").
 *
 * The caller is the push hook, asking what a path's ALREADY PUBLISHED versions
 * carry, so it can discard exactly those findings from the push it is scanning.
 *
 * `ref` is a commit-ish: content comes from `git show <ref>:<path>`. A path
 * that does not resolve there contributes NOTHING and is named on a
 * `degraded:` line — the fail-closed direction, because a version that could
 * not be read must not read as "carries no findings" (docs/dev-loop.md, "A
 * checker has THREE answers"). The hook's own walk only ever passes versions
 * it has already resolved, so this is the safety net rather than the path.
 */
export function scanAtRef(ref, paths) {
  const findings = [];
  const allowlisted = [];
  const degraded = [];
  let partial = 0;
  let partialSource = 0;
  for (const file of paths) {
    if (isAllowlisted(file)) {
      allowlisted.push(skipEntry(file));
      continue;
    }
    let text;
    try {
      text = git(["show", `${ref}:${file}`], { quiet: true });
    } catch {
      degraded.push(`${file} does not resolve at ${ref} — contributes nothing`);
      continue;
    }
    const r = scanContent(text, file);
    // The same class-scoped filtering as both other modes — one meaning of
    // "exempt" in this file, not three.
    const exempt = exemptClasses(file);
    const kept = exempt === "all" ? [] : r.findings.filter((f) => !exempt.has(f.class));
    if (kept.length < r.findings.length) allowlisted.push(exemptEntry(file, exempt));
    findings.push(...kept);
    if (r.partial) partial++;
    if (r.sourceOnly) partialSource++;
    degraded.push(...r.degraded.map((d) => `${file}: ${d}`));
  }
  return { findings, allowlisted, degraded, partial, partialSource };
}

// --- CLI ---------------------------------------------------------------------

const USAGE = `usage:
  node tools/absence-scan.mjs <file...>
  node tools/absence-scan.mjs --git-range <old>..<new>   (from a repo root; <old> may be EMPTY)
  node tools/absence-scan.mjs --at <ref> <path...>       (from a repo root; content via git show <ref>:<path>)

exit 0 = clean, 2 = findings, 1 = internal error`;

function report(out, { findings, allowlisted = [], degraded = [], partial = 0, partialSource = 0 }) {
  // Two distinct lines, never one: a whole-file SKIP was never scanned at
  // all, while a class-scoped EXEMPT was scanned and only some of its
  // findings excused — a reader auditing "allowlisted:" lines before a
  // commit needs to tell those apart (BACKLOG "absence-scan's allowlisted:
  // line cannot distinguish...").
  for (const a of allowlisted) out(formatAllowlistLine(a));
  for (const d of degraded) out(`degraded: ${d}`);
  // Never silence about what was only half-checked (docs/dev-loop.md, "A
  // checker has THREE answers").
  if (partial) {
    // CORRECTED 2026-08-10. This line used to report every non-corpus file as
    // getting "byte-level classes only (b64-run, capture-uuid)". For a SOURCE
    // file that is false in both halves: the classes named never run on it
    // (scanContent routes it to scanSourceText above), and the one class that
    // does run — capture-key-prefix — was not named. The assurance was wider
    // than its predicate, which is what stops anyone checking it: a reader
    // saw two leak classes covering their markdown and there was one.
    const anyClasses = CLASSES.filter((c) => c.scope === "any").map((c) => c.name).join(", ");
    const jsonPartial = partial - partialSource;
    if (jsonPartial > 0) {
      out(`scope: ${jsonPartial} JSON file(s) outside test/fixtures/harvested/ — ` +
          `value-level classes only (${anyClasses})`);
    }
    if (partialSource > 0) {
      // CORRECTED 2026-08-10, same day: this used to say the full 8-4-4-4-12
      // shape was "covered by test/absence-scan.test.mjs's tracked-tree UUID
      // roster, not here" — true when written, and it stopped being true the
      // moment scanSourceText started reclassifying (rather than suppressing)
      // a full-UUID line under capture-uuid, inline, right here. The roster
      // remains a second, independent check over tracked files; it is no
      // longer the ONLY one.
      out(`scope: ${partialSource} source file(s) — capture-key-prefix and ` +
          `capture-uuid only; the other classes need a JSON document`);
    }
  }
  for (const f of findings) {
    const extra = f.run ? ` run=${f.run}` : "";
    // The identity rides INSIDE the parentheses, and that is load-bearing
    // rather than cosmetic: the hook's file-finding regex ends
    // `\(\d+ chars[^)]*\)$`, so an identity in here is backward-compatible by
    // construction while one appended after the closing paren would stop every
    // file finding from parsing at all. A finding whose identity is not
    // well-formed prints none — the hook keeps what it cannot parse, which is
    // the direction every uncertainty in this pipeline takes.
    const ident = /^[0-9a-f]{12}$/.test(String(f.id ?? "")) ? `, #${f.id}` : "";
    out(`FINDING ${f.class}  ${f.file || "<input>"}  ${f.path}  (${f.length} chars${extra}${ident})`);
  }
}

function main(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    process.stdout.write(`${USAGE}\n`);
    return args.length === 0 ? 1 : 0;
  }
  const out = (s) => process.stdout.write(`${s}\n`);
  let result;
  if (args[0] === "--git-range") {
    const range = args[1];
    if (!range || !range.includes("..")) {
      process.stderr.write(`absence-scan: --git-range needs <old>..<new>\n${USAGE}\n`);
      return 1;
    }
    const [oldRef, newRef] = range.split("..");
    if (!newRef) {
      process.stderr.write("absence-scan: --git-range needs <old>..<new>\n");
      return 1;
    }
    result = scanGitRange(oldRef, newRef);
  } else if (args[0] === "--at") {
    const ref = args[1];
    const paths = args.slice(2);
    if (!ref || paths.length === 0) {
      process.stderr.write(`absence-scan: --at needs <ref> <path...>\n${USAGE}\n`);
      return 1;
    }
    result = scanAtRef(ref, paths);
  } else {
    const findings = [];
    const allowlisted = [];
    const degraded = [];
    let partial = 0;
  let partialSource = 0;
    for (const file of args) {
      if (isAllowlisted(file)) {
        allowlisted.push(skipEntry(file));
        continue;
      }
      const r = scanFile(file);
      // Same class-scoped filtering as the git-range path — one meaning of
      // "exempt" in this file, not two.
      const exempt = exemptClasses(file);
      const kept = exempt === "all" ? [] : r.findings.filter((f) => !exempt.has(f.class));
      if (kept.length < r.findings.length) allowlisted.push(exemptEntry(file, exempt));
      findings.push(...kept);
      if (r.partial) partial++;
    if (r.sourceOnly) partialSource++;
      degraded.push(...r.degraded.map((d) => `${file}: ${d}`));
    }
    result = { findings, allowlisted, degraded, partial, partialSource };
  }
  report(out, result);
  if (result.findings.length) {
    out(`absence-scan: ${result.findings.length} finding(s) — these bytes must not reach a public history.`);
    return 2;
  }
  out("absence-scan: clean");
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let code;
  try {
    code = main(process.argv);
  } catch (err) {
    process.stderr.write(`absence-scan: internal error — ${err?.message ?? err}\n`);
    code = 1;
  }
  process.exit(code);
}
