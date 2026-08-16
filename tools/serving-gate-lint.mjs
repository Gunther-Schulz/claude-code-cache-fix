#!/usr/bin/env node
// A test that drives a GATED extension without setting that gate is green
// about a pipeline nobody runs. This finds those files.
//
// THE DEFECT, measured 2026-08-16 on the resume-key lane:
// `test/insertion-lineage-recovery.test.mjs` (branch wip/resume-key-third-read)
// default-imports `insertion-normalization` and drives `ext.onRequest`, and
// `grep -c CACHE_FIX_VOLATILE_PIN` over it returns 0 — while the serving unit
// and `/health` both carry `CACHE_FIX_VOLATILE_PIN=1`. All seven of its bites
// passed. The feature under test is inert in pin mode, so every one of those
// greens was about a configuration nobody runs. `docs/dev-loop.md` already
// carries the section for this class ("Replay the configuration that is
// SERVING, not the defaults"), whose own conclusion is that such a green "is
// worse than no verdict because it reads like one". That section was written
// about `gate-live`; the SUITE had the identical hole and nothing checked it.
//
// WHAT THIS LINT ASSERTS, stated no wider than its predicate establishes:
// for each test file that default- or namespace-imports an extension module,
// every gate that extension READS and that the RUNNING proxy has switched ON
// is NAMED somewhere in that test file. It does not check that the gate is set
// to the serving VALUE, that it is set in the right scope, or that the bites
// actually exercise the gated branch — a file naming the gate once in a
// comment satisfies it. It is a tripwire for the total absence, which is the
// shape that has actually bitten, not a proof of serving-fidelity.
//
// FOUR DESIGN DECISIONS, each of them load-bearing:
//
// 1. THE PER-EXTENSION GATE SET IS DERIVED, never restated. It comes from
//    scanning `proxy/extensions/*.mjs` for `CACHE_FIX_[A-Z_]+`. A hardcoded
//    list beside the parser it mirrors cannot age loudly: the day an extension
//    starts reading a new gate, a restated list stays byte-identical to health
//    while the lint silently stops covering it.
//
// 2. THE SERVING SET COMES FROM `/health`, never from defaults and never from
//    a list in this file. That is the same rule `gate-live` follows, and the
//    reason is the same: only the running process knows what it was started
//    with. When `/health` does not answer, this tool returns COULD NOT VERIFY
//    (exit 2) rather than falling back to a stale set — a checker has three
//    answers, and "the proxy is down" is not "the suite is clean".
//    Assumption, declared because it is the one that could rot: a switch is
//    recognised by its VALUE being one of SERVING_ON_VALUES, which requires the
//    switch to publish its value rather than `<redacted>`. That property is
//    held by `proxy/gate-allowlist.mjs` and asserted over the whole serving set
//    by the "every gate the serving unit turns ON publishes its VALUE" bite in
//    `test/capture-hardening.test.mjs`. A serving switch missing from that
//    allowlist is invisible here — and visible there, and in the doctor's
//    three-way compare.
//
// 3. ONLY GATES THAT ARE ON IN THE SERVING SET ARE REQUIRED, and this is where
//    the entry's original design was narrowed against measurement rather than
//    against taste. Requiring every `CACHE_FIX_*` an extension reads produces
//    40 offenders on main, most of them demanding that a test set
//    `CACHE_FIX_DEBUG` or the `CACHE_FIX_SNAPSHOT_DIR` path — a guard that
//    fires on legitimate work, which trains the override reflex that kills it.
//    Intersecting with the serving-ON set produces 13. See decision 4 for the
//    step that takes it to 1.
//
// 4. A NAMED IMPORT OF A PURE HELPER IS NOT GATE-SENSITIVE. `import
//    { classifyPinned } from ".../insertion-normalization.mjs"` calls a
//    function directly; no gate is consulted on that path, and demanding the
//    gate there is noise. What IS gate-sensitive is holding the extension
//    OBJECT — the default export the pipeline drives — so only default and
//    namespace imports count. Measured on main: 40 offenders under the raw
//    predicate, 13 after decision 3, 1 after this one, and that 1 is a real
//    finding (`test/write-owner-only.test.mjs` drives `ext.onRequest` in
//    normalize-on/pin-OFF while the proxy serves pin-ON). The narrowing costs
//    nothing the defect class needs: the known positive holds the default
//    export, because driving the pipeline is what the defect is about.
//
// EXEMPTIONS ARE DATA THIS LINT VERIFIES, never a softened predicate. Some
// tests legitimately exercise the OFF path. Such a file is declared in
// EXEMPTIONS with the gates it is excused from and the reason; the lint then
// FAILS on an exemption that names a file that no longer exists, a gate that
// file no longer omits, or an empty reason. A stale exemption is a finding,
// not a quiet pass — that is the difference between an exemption and a hole.
//
// This tool writes no state: nothing to register as a carrier (dev-loop
// closing-gate question 4).
//
// Usage:
//   node tools/serving-gate-lint.mjs                  # serving set from /health
//   node tools/serving-gate-lint.mjs --test-dir DIR   # lint another tree
//   node tools/serving-gate-lint.mjs --serving A,B    # stated set, labelled as such
//   node tools/serving-gate-lint.mjs --health-url URL # ask another proxy
// Exit: 0 clean · 1 findings · 2 COULD NOT VERIFY.

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_HEALTH_URL } from "./state-report.mjs";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_EXT_DIR = join(REPO_ROOT, "proxy", "extensions");
export const DEFAULT_TEST_DIR = join(REPO_ROOT, "test");

// A `/health` gate value that means "this switch is ON". A budget
// ("12288") and a path are not switches and are not required of any test.
export const SERVING_ON_VALUES = new Set(["1", "on", "true", "yes"]);

// `CACHE_FIX_` alone, and prefixes left behind by `CACHE_FIX_FOO_${x}`
// concatenation, are not gate names — a bare-prefix match would otherwise
// demand every test set a variable that does not exist.
const GATE_RE = /CACHE_FIX_[A-Z][A-Z0-9_]*/g;

// Default (`import ext from`) and namespace (`import * as m from`) imports —
// both hand the test the extension object the pipeline drives. Anchored at
// line start, and run over source with template literals and comments removed
// (see stripNonCode): `test/slice-preflight.test.mjs` builds synthetic repos
// out of template literals that CONTAIN import statements, and reading those as
// the holding file's own imports reports a file that imports nothing. Line
// anchoring alone does not close it — a fixture's import sits at the start of
// its own line inside the literal, which is exactly how the first version of
// this lint's own test caught it.
const IMPORT_RE =
  /^[ \t]*import[ \t]+(?:[A-Za-z_$][\w$]*|\*[ \t]+as[ \t]+[A-Za-z_$][\w$]*)[ \t]*(?:,[ \t]*(?:\{[^}]*\}|\*[ \t]+as[ \t]+[A-Za-z_$][\w$]*))?[ \t]+from[ \t]*["']([^"']+)["']/gm;

/**
 * DECLARED EXEMPTIONS — `{ path, gates, reason }`, path relative to the test
 * directory. Empty today, deliberately: the one offender on main is a real
 * finding and exempting it would silence the instrument on the day it was
 * built. The verification of this list is exercised by fixtures in
 * test/serving-gate-lint.test.mjs, so it is proven whether or not it is used.
 */
export const EXEMPTIONS = [];

/** Read the gates the RUNNING proxy has switched on. Three answers. */
export async function readServingGates({
  healthUrl = DEFAULT_HEALTH_URL,
  fetchImpl = fetch,
  timeoutMs = 3000,
} = {}) {
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
  const gates = body?.gates;
  if (!gates || typeof gates !== "object") {
    return { ok: false, reason: `${healthUrl} carried no gates object` };
  }
  const on = new Set();
  for (const [k, v] of Object.entries(gates)) {
    if (k.startsWith("CACHE_FIX_") && SERVING_ON_VALUES.has(String(v).toLowerCase())) on.add(k);
  }
  return { ok: true, gates: on, basis: `/health at ${healthUrl}` };
}

/** Every CACHE_FIX_* name each extension's source reads. Derived, not restated. */
export function deriveExtensionGates({ extDir = DEFAULT_EXT_DIR } = {}) {
  const out = new Map();
  for (const f of readdirSync(extDir).sort()) {
    if (!f.endsWith(".mjs")) continue;
    const src = readFileSync(join(extDir, f), "utf8");
    out.set(f, new Set(src.match(GATE_RE) ?? []));
  }
  return out;
}

/**
 * Source with the two regions that can hold an import statement without
 * PERFORMING one removed: template literals (fixture bodies) and comments.
 * Deliberately crude — it replaces each region with an empty equivalent rather
 * than parsing, so a nested `${`…`}` can survive it. It is the import scan's
 * input only; the gate-mention check reads the raw source, where a gate named
 * in a comment still counts.
 */
export function stripNonCode(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/`(?:[^`\\]|\\[\s\S])*`/g, "``")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

/** Extension basenames whose OBJECT this source holds (default/namespace import). */
export function importedExtensions({ filePath, src, extDir = DEFAULT_EXT_DIR }) {
  const found = new Set();
  for (const m of stripNonCode(src).matchAll(IMPORT_RE)) {
    const spec = m[1];
    if (!spec.startsWith(".") && !spec.startsWith("/")) continue;
    const abs = resolve(dirname(filePath), spec);
    if (dirname(abs) !== resolve(extDir)) continue;
    if (!existsSync(abs)) continue;
    found.add(basename(abs));
  }
  return found;
}

/**
 * The whole check. `servingGates` is a Set of gate names that are ON —
 * supplied by the caller so this function is pure and testable against a
 * fixture tree.
 */
export function lint({
  extDir = DEFAULT_EXT_DIR,
  testDir = DEFAULT_TEST_DIR,
  servingGates,
  exemptions = EXEMPTIONS,
} = {}) {
  if (!(servingGates instanceof Set)) throw new TypeError("servingGates must be a Set");
  const gatesOf = deriveExtensionGates({ extDir });

  // Raw missing set per test file, before exemptions.
  const raw = new Map();
  const files = readdirSync(testDir).filter((f) => f.endsWith(".test.mjs")).sort();
  for (const f of files) {
    const filePath = join(testDir, f);
    if (!statSync(filePath).isFile()) continue;
    const src = readFileSync(filePath, "utf8");
    const exts = importedExtensions({ filePath, src, extDir });
    const required = new Map(); // gate -> extension that reads it
    for (const e of exts) {
      for (const g of gatesOf.get(e) ?? []) {
        if (servingGates.has(g) && !required.has(g)) required.set(g, e);
      }
    }
    const missing = [...required.entries()]
      .filter(([g]) => !src.includes(g))
      .map(([g, e]) => ({ gate: g, extension: e }));
    if (missing.length) raw.set(f, missing);
  }

  // The exemption list is verified against that same measurement.
  const exemptionProblems = [];
  const excused = new Map(); // file -> Set(gate)
  for (const ex of exemptions) {
    const label = ex?.path ?? "<no path>";
    if (!ex?.path || !Array.isArray(ex?.gates) || ex.gates.length === 0 || !String(ex?.reason ?? "").trim()) {
      exemptionProblems.push(`${label}: an exemption needs a path, a non-empty gates array and a reason`);
      continue;
    }
    if (!existsSync(join(testDir, ex.path))) {
      exemptionProblems.push(`${ex.path}: exempted file does not exist — stale exemption`);
      continue;
    }
    const missingNow = new Set((raw.get(ex.path) ?? []).map((m) => m.gate));
    for (const g of ex.gates) {
      if (!missingNow.has(g)) {
        exemptionProblems.push(
          `${ex.path}: exempted from ${g}, but that gate is no longer missing there — stale exemption`,
        );
      }
    }
    excused.set(ex.path, new Set(ex.gates));
  }

  const offenders = [];
  for (const [f, missing] of raw) {
    const skip = excused.get(f) ?? new Set();
    const left = missing.filter((m) => !skip.has(m.gate));
    if (left.length) offenders.push({ path: f, missing: left });
  }

  return {
    offenders,
    exemptionProblems,
    scanned: files.length,
    servingGates: [...servingGates].sort(),
  };
}

export function report(result, basis) {
  const lines = [`serving-gate lint — ${result.scanned} test files, serving set from ${basis}`];
  lines.push(`  serving gates ON: ${result.servingGates.join(" ") || "(none)"}`);
  for (const p of result.exemptionProblems) lines.push(`  EXEMPTION PROBLEM  ${p}`);
  for (const o of result.offenders) {
    for (const m of o.missing) {
      lines.push(`  UNEXERCISED GATE   ${o.path}: drives ${m.extension} without naming ${m.gate}`);
    }
  }
  const bad = result.offenders.length + result.exemptionProblems.length;
  lines.push(bad === 0 ? "  CLEAN" : `  ${bad} finding(s)`);
  return lines.join("\n");
}

async function main(argv) {
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv[i + 1];
  };
  const extDir = arg("--ext-dir") ?? DEFAULT_EXT_DIR;
  const testDir = arg("--test-dir") ?? DEFAULT_TEST_DIR;
  const stated = arg("--serving");

  let servingGates;
  let basis;
  if (stated !== undefined) {
    servingGates = new Set(stated.split(",").map((s) => s.trim()).filter(Boolean));
    basis = "--serving (STATED, not read from the running proxy)";
  } else {
    const read = await readServingGates({ healthUrl: arg("--health-url") ?? DEFAULT_HEALTH_URL });
    if (!read.ok) {
      console.error(`COULD NOT VERIFY: ${read.reason}`);
      console.error("  the serving set is what this lint checks against; a stale fallback would");
      console.error("  produce a verdict about a configuration nobody is running.");
      return 2;
    }
    servingGates = read.gates;
    basis = read.basis;
  }

  const result = lint({ extDir, testDir, servingGates });
  console.log(report(result, basis));
  return result.offenders.length + result.exemptionProblems.length === 0 ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).then((c) => process.exit(c));
}
