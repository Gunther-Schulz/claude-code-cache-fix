#!/usr/bin/env node
// slice-preflight — does this test file still LOAD in the slice it was mapped
// into?
//
// WHY THIS EXISTS. Both wave-2 load failures (2026-07-30, BACKLOG.md
// "slice-port preflight") were one shape: `--stat` mapped a test file into a
// PR slice, the file carried a MODULE-SCOPE dependency that lives in another
// slice, and it died at load in pr1/pr7/pr10 — a static
// `import ../tools/harvest.mjs`, and a top-level `readFileSync` of the
// oscillation fixture. Both are invisible to the mapping (which sees paths,
// not contents) and visible only to `node --test` run inside the slice, i.e.
// after the port. This is the same question asked BEFORE the port, from the
// outside, against the tree the slice will actually have.
//
//   node tools/slice-preflight.mjs <slice-tree-root> <test-file>...
//
// exit 0 — every module-scope resolution the mapped tests need is present
// exit 1 — findings, each NAMED (file -> the specifier or fixture that is not
//          in the tree)
// exit 2 — internal error (bad arguments, unreadable file)
//
// WHAT IS IN SCOPE, and why exactly this. LOAD time, not test time:
//   (a) static import specifiers — they resolve when the module is loaded, so
//       an unresolvable one is a hard load failure. A DYNAMIC `await
//       import(...)` inside a function is deliberately NOT a finding: that is
//       the cure wave-2 shipped (fork da9bf8c — "a tools-less tree skips, not
//       dies"), and a check that flagged it would fire on the fix.
//   (b) `readFileSync` / `readFile` calls at module scope — same reason, same
//       moment. The same call inside a test body is not flagged: it fails one
//       test, it does not kill the file, and the designed answer there is a
//       skip.
//   (c) the WIDENED arm (2026-08-01, fixture-leak post-incident): a fixture
//       MAPPED INTO a slice whose absence coverage did not come with it is a
//       fixture nobody scans on that branch's pushes. So a `test/fixtures/**`
//       path a mapped test reads, which is PRESENT in the tree, requires
//       `tools/absence-scan.mjs` to be present too. Defense in depth — the
//       dotfiles pre-push guard is the boundary backstop either way.
//
// THE THIRD ANSWER (docs/dev-loop.md, "A checker has THREE answers"). Path
// expressions this file cannot evaluate statically are not silently dropped:
// they are named on `degraded:` lines, so a run that could only half-check
// says so instead of printing a confident clean.
//
// NO PARSER DEPENDENCY. The package ships `tools/` and has no dev
// dependencies, so the reader below is a small hand-rolled lexer plus a
// path-expression evaluator that understands exactly the idioms this repo's
// tests use (`join`/`resolve`/`dirname`, `fileURLToPath(import.meta.url)`,
// `import.meta.dirname`, `??`/`||` fallbacks, `+` concatenation). Anything
// else is `degraded:`, never a guess.

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// --- Lexer -------------------------------------------------------------------

const ID_START = /[A-Za-z_$]/;
const ID_CHAR = /[A-Za-z0-9_$]/;
// After these, a `/` opens a regex rather than dividing.
const REGEX_OK_WORDS = new Set([
  "return", "typeof", "instanceof", "in", "of", "new", "delete", "void",
  "case", "do", "else", "yield", "await",
]);

/** Tokens: {t:"str"|"name"|"punct"|"other", v}. Comments and regexes vanish. */
export function tokenize(src) {
  const toks = [];
  let i = 0;
  const n = src.length;
  const prev = () => toks[toks.length - 1];
  const regexAllowed = () => {
    const p = prev();
    if (!p) return true;
    if (p.t === "name") return REGEX_OK_WORDS.has(p.v);
    if (p.t === "punct") return ![")", "]"].includes(p.v);
    return false;
  };
  // A template literal, from its opening backtick. Substitutions are skipped
  // with brace balancing; a template that HAS one is not a constant.
  const readTemplate = (start) => {
    let j = start + 1;
    let simple = true;
    let cooked = "";
    while (j < n) {
      const c = src[j];
      if (c === "\\") { cooked += src[j + 1]; j += 2; continue; }
      if (c === "`") return { end: j + 1, value: simple ? cooked : null };
      if (c === "$" && src[j + 1] === "{") {
        simple = false;
        let depth = 1;
        j += 2;
        while (j < n && depth > 0) {
          const d = src[j];
          if (d === "{") depth++;
          else if (d === "}") depth--;
          else if (d === "`") { j = readTemplate(j).end; continue; }
          else if (d === '"' || d === "'") { j = readQuoted(j).end; continue; }
          j++;
        }
        continue;
      }
      cooked += c;
      j++;
    }
    return { end: n, value: null };
  };
  const readQuoted = (start) => {
    const q = src[start];
    let j = start + 1;
    let value = "";
    while (j < n) {
      const c = src[j];
      if (c === "\\") {
        const e = src[j + 1];
        value += e === "n" ? "\n" : e === "t" ? "\t" : e;
        j += 2;
        continue;
      }
      if (c === q) return { end: j + 1, value };
      value += c;
      j++;
    }
    return { end: n, value: null };
  };

  while (i < n) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2); i = i < 0 ? n : i + 2; continue; }
    if (c === " " || c === "\t" || c === "\r" || c === "\n" || c === ";") {
      if (c === ";") toks.push({ t: "punct", v: ";" });
      i++;
      continue;
    }
    if (c === '"' || c === "'") { const r = readQuoted(i); toks.push({ t: "str", v: r.value }); i = r.end; continue; }
    if (c === "`") { const r = readTemplate(i); toks.push(r.value === null ? { t: "other", v: "`" } : { t: "str", v: r.value }); i = r.end; continue; }
    if (c === "/" && regexAllowed()) {
      let j = i + 1;
      let inClass = false;
      while (j < n) {
        const d = src[j];
        if (d === "\\") { j += 2; continue; }
        if (d === "[") inClass = true;
        else if (d === "]") inClass = false;
        else if (d === "/" && !inClass) break;
        else if (d === "\n") break;
        j++;
      }
      while (j < n && ID_CHAR.test(src[j + 1] ?? "")) j++;
      toks.push({ t: "other", v: "regex" });
      i = j + 1;
      continue;
    }
    if (ID_START.test(c)) {
      let j = i;
      while (j < n && ID_CHAR.test(src[j])) j++;
      toks.push({ t: "name", v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (src.startsWith("=>", i)) { toks.push({ t: "punct", v: "=>" }); i += 2; continue; }
    if (src.startsWith("??", i)) { toks.push({ t: "punct", v: "??" }); i += 2; continue; }
    if (src.startsWith("||", i)) { toks.push({ t: "punct", v: "||" }); i += 2; continue; }
    if ("{}()[].,+=<>!&|?:*%-~^".includes(c)) { toks.push({ t: "punct", v: c }); i++; continue; }
    toks.push({ t: "other", v: c });
    i++;
  }
  return toks;
}

/**
 * Per token, how many FUNCTION bodies enclose it. Blocks and object literals
 * at the top level still execute at load, so only function bodies leave module
 * scope — which is the distinction (a)/(b) above rest on.
 */
export function funcDepths(toks) {
  const depths = new Array(toks.length).fill(0);
  const stack = [];
  const openers = [];
  let depth = 0;
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (t.t === "punct" && (t.v === "(" || t.v === "[")) openers.push(k);
    if (t.t === "punct" && (t.v === ")" || t.v === "]")) {
      const o = openers.pop();
      if (t.v === ")") toks[k].openIdx = o;
    }
    if (t.t === "punct" && t.v === "{") {
      const p = toks[k - 1];
      let isFunc = false;
      if (p?.t === "punct" && p.v === "=>") isFunc = true;
      else if (p?.t === "punct" && p.v === ")") {
        const before = toks[(p.openIdx ?? 0) - 1];
        isFunc = !(before?.t === "name" && ["if", "for", "while", "switch", "catch"].includes(before.v));
      }
      stack.push(isFunc);
      if (isFunc) depth++;
      depths[k] = depth;
      continue;
    }
    if (t.t === "punct" && t.v === "}") {
      depths[k] = depth;
      if (stack.pop()) depth--;
      continue;
    }
    depths[k] = depth;
  }
  // Arrow functions with an EXPRESSION body open no brace, so the loop above
  // leaves them at module depth. `const load = (name) => readFileSync(...)`
  // runs when it is CALLED, not when the file loads — missing that would flag
  // a lazy read as a load-time one.
  for (let k = 0; k < toks.length; k++) {
    if (!(toks[k].t === "punct" && toks[k].v === "=>")) continue;
    if (toks[k + 1]?.v === "{") continue;
    const end = exprEnd(toks, k + 1);
    for (let j = k + 1; j < end; j++) depths[j]++;
  }
  return depths;
}

// --- Path-expression evaluation ----------------------------------------------

const STOP = new Set([",", ")", ";", "]", "}"]);

/** End of the expression starting at `a`, stopping at a top-level separator. */
function exprEnd(toks, a) {
  let d = 0;
  let k = a;
  for (; k < toks.length; k++) {
    const t = toks[k];
    if (t.t !== "punct") continue;
    if ("([{".includes(t.v)) d++;
    else if (")]}".includes(t.v)) {
      if (d === 0) return k;
      d--;
    } else if (d === 0 && STOP.has(t.v)) return k;
  }
  return k;
}

/** Split [a,b) on a top-level punctuator. */
function splitTop(toks, a, b, op) {
  const parts = [];
  let d = 0;
  let start = a;
  for (let k = a; k < b; k++) {
    const t = toks[k];
    if (t.t !== "punct") continue;
    if ("([{".includes(t.v)) d++;
    else if (")]}".includes(t.v)) d--;
    else if (d === 0 && (Array.isArray(op) ? op.includes(t.v) : t.v === op)) {
      parts.push([start, k]);
      start = k + 1;
    }
  }
  parts.push([start, b]);
  return parts;
}

/**
 * Evaluate [a,b) to a string, or null when the expression is outside the
 * understood idioms. `env` holds module-scope const bindings already seen;
 * `file` is the source file's own absolute path (what `import.meta.url` means).
 */
export function evalRange(toks, a, b, env, file) {
  if (a >= b) return null;
  for (const [x, y] of splitTop(toks, a, b, ["??", "||"])) {
    const v = evalConcat(toks, x, y, env, file);
    if (v !== null) return v;
  }
  return null;
}

function evalConcat(toks, a, b, env, file) {
  const parts = splitTop(toks, a, b, "+");
  let out = "";
  for (const [x, y] of parts) {
    const v = evalPrimary(toks, x, y, env, file);
    if (v === null) return null;
    out += v;
  }
  return out;
}

const PATH_FNS = { join, resolve, dirname };

function evalPrimary(toks, a, b, env, file) {
  while (a < b && toks[a].t === "punct" && toks[a].v === "(") {
    if (toks[b - 1]?.v !== ")") break;
    a++; b--;
  }
  if (a >= b) return null;
  const t = toks[a];
  if (t.t === "str" && b === a + 1) return t.v;
  // import.meta.url / import.meta.dirname
  if (t.t === "name" && t.v === "import" && toks[a + 1]?.v === "." && toks[a + 2]?.v === "meta" && toks[a + 3]?.v === ".") {
    const which = toks[a + 4]?.v;
    if (b === a + 5 && which === "url") return pathToFileURL(file).href;
    if (b === a + 5 && which === "dirname") return dirname(file);
    return null;
  }
  // `new URL("./fixtures/x.json", import.meta.url)` — the other idiom this
  // repo's tests use to name a sibling file; readFileSync takes it directly.
  if (t.t === "name" && t.v === "new" && toks[a + 1]?.v === "URL" && toks[a + 2]?.v === "(" && toks[b - 1]?.v === ")") {
    const vals = splitTop(toks, a + 3, b - 1, ",").filter(([x, y]) => y > x)
      .map(([x, y]) => evalRange(toks, x, y, env, file));
    if (vals.length !== 2 || vals.some((v) => v === null) || !vals[1].startsWith("file:")) return null;
    return fileURLToPath(new URL(vals[0], vals[1]));
  }
  if (t.t === "name" && b === a + 1) return env.has(t.v) ? env.get(t.v) : null;
  // A call: NAME ( args )
  if (t.t === "name" && toks[a + 1]?.v === "(" && toks[b - 1]?.v === ")") {
    const args = splitTop(toks, a + 2, b - 1, ",").filter(([x, y]) => y > x);
    const vals = args.map(([x, y]) => evalRange(toks, x, y, env, file));
    if (t.v === "fileURLToPath") {
      const u = vals[0];
      return u && u.startsWith("file:") ? fileURLToPath(u) : null;
    }
    const fn = PATH_FNS[t.v];
    if (!fn) return null;
    if (vals.some((v) => v === null)) return null;
    return fn(...vals);
  }
  return null;
}

// --- The scan ----------------------------------------------------------------

const inTree = (root, p) => {
  const rel = relative(root, p);
  return rel && !rel.startsWith("..") && !isAbsolute(rel);
};
const relOr = (root, p) => (inTree(root, p) ? relative(root, p).split(sep).join("/") : p);
const isFixture = (root, p) => relOr(root, p).startsWith("test/fixtures/");

/**
 * Read one mapped test file out of the slice tree and report what it needs at
 * LOAD time. Returns { findings, degraded, fixtures, externals }.
 */
export function scanTestFile(root, testFile) {
  const abs = isAbsolute(testFile) ? testFile : resolve(root, testFile);
  const shown = relOr(root, abs);
  if (!existsSync(abs)) {
    return {
      findings: [{ kind: "missing-test", file: shown, detail: "the mapped test file itself is not in the slice tree" }],
      degraded: [], fixtures: [], externals: 0,
    };
  }
  const src = readFileSync(abs, "utf-8");
  const toks = tokenize(src);
  const depths = funcDepths(toks);
  const dir = dirname(abs);
  const env = new Map();
  const findings = [];
  const degraded = [];
  const fixtures = new Set();
  let externals = 0;

  const noteFixture = (p) => { if (isFixture(root, p)) fixtures.add(p); };

  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];

    // (a) static import / re-export specifiers, module scope only. `import(`
    //     and `import.meta` are not static imports.
    if (t.t === "name" && (t.v === "import" || t.v === "export") && depths[k] === 0) {
      const next = toks[k + 1];
      if (t.v === "import" && (next?.v === "(" || next?.v === ".")) continue;
      const end = k + 40 < toks.length ? k + 40 : toks.length;
      let spec = null;
      if (t.v === "import" && next?.t === "str") spec = next.v;
      else {
        for (let j = k + 1; j < end; j++) {
          if (toks[j].t === "name" && toks[j].v === "from" && toks[j + 1]?.t === "str") { spec = toks[j + 1].v; break; }
          if (toks[j].t === "name" && ["import", "export", "const", "let", "var", "function", "class"].includes(toks[j].v)) break;
        }
      }
      if (spec === null) continue;
      if (!spec.startsWith(".") && !spec.startsWith("/")) { externals++; continue; }
      const target = resolve(dir, spec);
      if (!existsSync(target)) {
        findings.push({
          kind: "missing-import", file: shown,
          detail: `static import "${spec}" -> ${relOr(root, target)} is not in the slice tree`,
        });
      } else noteFixture(target);
      continue;
    }

    // Module-scope const bindings, so path expressions can be followed.
    if (t.t === "name" && ["const", "let", "var"].includes(t.v) && depths[k] === 0 &&
        toks[k + 1]?.t === "name" && toks[k + 2]?.v === "=") {
      const a = k + 3;
      const b = exprEnd(toks, a);
      const v = evalRange(toks, a, b, env, abs);
      if (v !== null) {
        env.set(toks[k + 1].v, v);
        noteFixture(v);
      }
      continue;
    }

    // (b) module-scope file reads.
    if (t.t === "name" && (t.v === "readFileSync" || t.v === "readFile") && toks[k + 1]?.v === "(") {
      const a = k + 2;
      const b = exprEnd(toks, a);
      const v = evalRange(toks, a, b, env, abs);
      if (v === null) {
        if (depths[k] === 0) degraded.push(`${shown}: a module-scope ${t.v}(...) argument could not be evaluated statically`);
        continue;
      }
      noteFixture(v);
      if (depths[k] !== 0) continue;
      if (!existsSync(v)) {
        findings.push({
          kind: "missing-read", file: shown,
          detail: `module-scope ${t.v} of ${relOr(root, v)} — not in the slice tree`,
        });
      }
    }
  }
  return { findings, degraded, fixtures: [...fixtures], externals };
}

const ABSENCE_SCAN = join("tools", "absence-scan.mjs");

/** The whole preflight: every mapped test, plus the fixture-coverage arm. */
export function preflight(root, testFiles) {
  const findings = [];
  const degraded = [];
  let externals = 0;
  const coveredBy = existsSync(join(root, ABSENCE_SCAN));
  for (const f of testFiles) {
    const r = scanTestFile(root, f);
    findings.push(...r.findings);
    degraded.push(...r.degraded);
    externals += r.externals;
    // (c) A fixture that came WITH the slice but whose scanner did not.
    if (!coveredBy) {
      for (const fx of r.fixtures) {
        if (!existsSync(fx)) continue;
        findings.push({
          kind: "uncovered-fixture", file: relOr(root, resolve(root, f)),
          detail: `reads ${relOr(root, fx)}, which is IN this slice tree, but tools/absence-scan.mjs is not — the fixture ships without its absence coverage`,
        });
      }
    }
  }
  return { findings, degraded, externals, files: testFiles.length };
}

// --- CLI ---------------------------------------------------------------------

const USAGE = `usage:
  node tools/slice-preflight.mjs <slice-tree-root> <test-file>...

exit 0 = every module-scope resolution is present, 1 = findings, 2 = internal error`;

function main(argv) {
  const args = argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (args.length < 2) {
    process.stderr.write(`slice-preflight: need a slice tree root and at least one test file\n${USAGE}\n`);
    return 2;
  }
  const [rootArg, ...files] = args;
  const root = resolve(rootArg);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    process.stderr.write(`slice-preflight: not a directory: ${rootArg}\n`);
    return 2;
  }
  const out = (s) => process.stdout.write(`${s}\n`);
  const r = preflight(root, files);
  for (const d of r.degraded) out(`degraded: ${d}`);
  for (const f of r.findings) out(`FINDING ${f.kind}  ${f.file}  ${f.detail}`);
  if (r.findings.length) {
    out(`slice-preflight: ${r.findings.length} finding(s) over ${r.files} test file(s) — this slice would fail at LOAD, not at assertion.`);
    return 1;
  }
  out(`slice-preflight: clean — ${r.files} test file(s), every module-scope import and read resolves inside ${rootArg}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  let code;
  try {
    code = main(process.argv);
  } catch (err) {
    process.stderr.write(`slice-preflight: internal error — ${err?.stack ?? err}\n`);
    code = 2;
  }
  process.exit(code);
}
