// The serving-gate lint, proven on fixtures rather than on the repo.
//
// WHY FIXTURES AND NOT THE REAL TREE: the real offender list is live, mutating
// state — it changes the moment anyone repairs a test file or the deployment
// flips a gate. A bite anchored to it decays in both directions: it goes red on
// legitimate work, or it goes quietly green while exercising less than it
// claims. Every premise this file depends on is therefore pinned INSIDE the
// fixture it is checked against. The real-tree run is the tool's job
// (`node tools/serving-gate-lint.mjs`), and its red-first proof against the
// known positive is recorded in BACKLOG.md, not asserted here.
//
// Every bite below is a PAIR: the arm the defect produces and the arm correct
// behaviour produces must DIFFER. A bite that only shows the lint firing does
// not separate "fires on the defect" from "fires on everything".

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { tmpDirSync } from "../tools/tmpdir.mjs";
import { lint, readServingGates, SERVING_ON_VALUES } from "../tools/serving-gate-lint.mjs";

const SERVING = new Set(["CACHE_FIX_FAKE_GATE", "CACHE_FIX_OTHER_GATE"]);

/**
 * A fixture tree: `extensions` maps a module basename to its source, `tests`
 * maps a test-file basename to its source. Returns the two directories plus a
 * bound runner.
 */
function withTree({ extensions = {}, tests = {} }, fn) {
  const root = tmpDirSync("serving-gate-lint-");
  const extDir = join(root, "proxy", "extensions");
  const testDir = join(root, "test");
  mkdirSync(extDir, { recursive: true });
  mkdirSync(testDir, { recursive: true });
  for (const [name, src] of Object.entries(extensions)) writeFileSync(join(extDir, name), src);
  for (const [name, src] of Object.entries(tests)) writeFileSync(join(testDir, name), src);
  const run = (opts = {}) => lint({ extDir, testDir, servingGates: SERVING, ...opts });
  try {
    return fn({ root, extDir, testDir, run });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const gatedExtension = `
export default {
  name: "fake",
  onRequest(ctx) {
    if (process.env.CACHE_FIX_FAKE_GATE !== "1") return;
    ctx.touched = true;
  },
};
export function pureHelper(x) { return x; }
`;

const missingGates = (result, file) =>
  (result.offenders.find((o) => o.path === file)?.missing ?? []).map((m) => m.gate);

// --- 1. the defect the lint exists for --------------------------------------

test("a default import that never names the serving gate is reported, with the gate and the extension", () => {
  withTree(
    {
      extensions: { "fake.mjs": gatedExtension },
      tests: {
        "driver.test.mjs": `import ext from "../proxy/extensions/fake.mjs";\next.onRequest({});\n`,
      },
    },
    ({ run }) => {
      const r = run();
      assert.deepEqual(missingGates(r, "driver.test.mjs"), ["CACHE_FIX_FAKE_GATE"]);
      assert.equal(r.offenders[0].missing[0].extension, "fake.mjs",
        "the report must name which extension demands the gate, or the reader cannot act on it");
    },
  );
});

test("the same file naming the gate is silent — the two arms must DIFFER", () => {
  withTree(
    {
      extensions: { "fake.mjs": gatedExtension },
      tests: {
        "driver.test.mjs":
          `import ext from "../proxy/extensions/fake.mjs";\n` +
          `process.env.CACHE_FIX_FAKE_GATE = "1";\next.onRequest({});\n`,
      },
    },
    ({ run }) => assert.deepEqual(run().offenders, []),
  );
});

// --- 2. the narrowing that keeps it from firing on legitimate work ----------

test("a NAMED import of a pure helper is not gate-sensitive, while a default import of the same module is", () => {
  const body = (importLine) => `${importLine}\nconsole.log(1);\n`;
  const named = withTree(
    {
      extensions: { "fake.mjs": gatedExtension },
      tests: {
        "helper.test.mjs": body(`import { pureHelper } from "../proxy/extensions/fake.mjs";`),
      },
    },
    ({ run }) => run(),
  );
  const dflt = withTree(
    {
      extensions: { "fake.mjs": gatedExtension },
      tests: { "helper.test.mjs": body(`import ext from "../proxy/extensions/fake.mjs";`) },
    },
    ({ run }) => run(),
  );
  assert.deepEqual(named.offenders, [], "calling an exported function consults no gate");
  assert.deepEqual(missingGates(dflt, "helper.test.mjs"), ["CACHE_FIX_FAKE_GATE"],
    "holding the extension OBJECT is what makes the gate load-bearing");
});

test("a namespace import counts — it reaches the default export too", () => {
  withTree(
    {
      extensions: { "fake.mjs": gatedExtension },
      tests: {
        "ns.test.mjs": `import * as mod from "../proxy/extensions/fake.mjs";\nmod.default.onRequest({});\n`,
      },
    },
    ({ run }) => assert.deepEqual(missingGates(run(), "ns.test.mjs"), ["CACHE_FIX_FAKE_GATE"]),
  );
});

test("an import statement inside a template literal is not a real import", () => {
  // test/slice-preflight.test.mjs builds synthetic repos out of template
  // literals containing import statements. An unanchored match reads those as
  // this file's own imports and reports a file that imports nothing.
  const inFixture =
    `const SYNTHETIC = \`\n  import ext from "../proxy/extensions/fake.mjs";\n\`;\n` +
    `console.log(SYNTHETIC.length);\n`;
  withTree(
    { extensions: { "fake.mjs": gatedExtension }, tests: { "fixtures.test.mjs": inFixture } },
    ({ run }) => assert.deepEqual(run().offenders, [],
      "a quoted import belongs to the fixture, not to the file holding it"),
  );
});

test("a commented-out import is not an import either", () => {
  withTree(
    {
      extensions: { "fake.mjs": gatedExtension },
      tests: {
        "commented.test.mjs": `// import ext from "../proxy/extensions/fake.mjs";\nconsole.log(1);\n`,
      },
    },
    ({ run }) => assert.deepEqual(run().offenders, []),
  );
});

test("only gates the serving proxy has ON are required", () => {
  const ext = gatedExtension.replace("CACHE_FIX_FAKE_GATE", "CACHE_FIX_NOT_SERVING");
  withTree(
    {
      extensions: { "fake.mjs": ext },
      tests: { "driver.test.mjs": `import e from "../proxy/extensions/fake.mjs";\ne.onRequest({});\n` },
    },
    ({ run }) => {
      assert.deepEqual(run().offenders, [],
        "a gate that is OFF in production is a configuration no test owes coverage of");
      assert.deepEqual(
        missingGates(run({ servingGates: new Set(["CACHE_FIX_NOT_SERVING"]) }), "driver.test.mjs"),
        ["CACHE_FIX_NOT_SERVING"],
        "and the same file IS an offender once that gate is serving — the serving set is the discriminator",
      );
    },
  );
});

// --- 3. the derived basis must age loudly ------------------------------------

test("a gate a extension starts reading is picked up with no change to the lint", () => {
  const driver = `import e from "../proxy/extensions/fake.mjs";\nprocess.env.CACHE_FIX_FAKE_GATE = "1";\ne.onRequest({});\n`;
  const before = withTree(
    { extensions: { "fake.mjs": gatedExtension }, tests: { "driver.test.mjs": driver } },
    ({ run }) => run(),
  );
  const after = withTree(
    {
      extensions: {
        "fake.mjs": `${gatedExtension}\nconst extra = process.env.CACHE_FIX_OTHER_GATE === "1";\nexport { extra };\n`,
      },
      tests: { "driver.test.mjs": driver },
    },
    ({ run }) => run(),
  );
  assert.deepEqual(before.offenders, [], "baseline: the file covers every gate the extension reads");
  assert.deepEqual(missingGates(after, "driver.test.mjs"), ["CACHE_FIX_OTHER_GATE"],
    "a restated list would stay green here; a derived one goes red the day the source changes");
});

// --- 4. the exemption list is data this lint verifies -----------------------

const exemptTree = {
  extensions: { "fake.mjs": gatedExtension },
  tests: { "off-path.test.mjs": `import e from "../proxy/extensions/fake.mjs";\ne.onRequest({});\n` },
};

test("a declared exemption suppresses the finding it names, and nothing else", () => {
  withTree(exemptTree, ({ run }) => {
    const unexempt = run();
    assert.deepEqual(missingGates(unexempt, "off-path.test.mjs"), ["CACHE_FIX_FAKE_GATE"],
      "baseline: without the exemption this file is an offender");
    const exempt = run({
      exemptions: [{ path: "off-path.test.mjs", gates: ["CACHE_FIX_FAKE_GATE"], reason: "asserts the OFF path" }],
    });
    assert.deepEqual(exempt.offenders, []);
    assert.deepEqual(exempt.exemptionProblems, []);
  });
});

test("an exemption for a gate that is no longer missing FAILS — a stale exemption is a finding", () => {
  withTree(
    {
      extensions: { "fake.mjs": gatedExtension },
      tests: {
        "repaired.test.mjs":
          `import e from "../proxy/extensions/fake.mjs";\nprocess.env.CACHE_FIX_FAKE_GATE = "1";\ne.onRequest({});\n`,
      },
    },
    ({ run }) => {
      const r = run({
        exemptions: [{ path: "repaired.test.mjs", gates: ["CACHE_FIX_FAKE_GATE"], reason: "asserts the OFF path" }],
      });
      assert.equal(r.exemptionProblems.length, 1, r.exemptionProblems.join("\n"));
      assert.match(r.exemptionProblems[0], /no longer missing/);
    },
  );
});

test("an exemption naming a file that no longer exists FAILS", () => {
  withTree(exemptTree, ({ run }) => {
    const r = run({
      exemptions: [{ path: "deleted.test.mjs", gates: ["CACHE_FIX_FAKE_GATE"], reason: "gone" }],
    });
    assert.equal(r.exemptionProblems.length, 1);
    assert.match(r.exemptionProblems[0], /does not exist/);
  });
});

test("an exemption without a reason FAILS — the reason is the thing a reader grades", () => {
  withTree(exemptTree, ({ run }) => {
    const r = run({ exemptions: [{ path: "off-path.test.mjs", gates: ["CACHE_FIX_FAKE_GATE"], reason: "  " }] });
    assert.equal(r.exemptionProblems.length, 1);
    assert.match(r.exemptionProblems[0], /needs a path/);
    assert.equal(r.offenders.length, 1,
      "a malformed exemption must not accidentally suppress the finding it was written for");
  });
});

// --- 5. the serving set, and the third answer -------------------------------

const jsonRes = (gates) => ({ ok: true, json: async () => ({ gates }) });

test("only ON-valued keys enter the serving set — a budget and an off switch are not gates", async () => {
  const r = await readServingGates({
    fetchImpl: async () =>
      jsonRes({
        CACHE_FIX_VOLATILE_PIN: "1",
        CACHE_FIX_FORWARD_PROXY: "on",
        CACHE_FIX_CAPTURE_MAX_MB: "12288",
        CACHE_FIX_SOMETHING: "off",
        CACHE_FIX_REDACTED_ONE: "<redacted>",
        PATH: "/usr/bin",
      }),
  });
  assert.ok(r.ok);
  assert.deepEqual([...r.gates].sort(), ["CACHE_FIX_FORWARD_PROXY", "CACHE_FIX_VOLATILE_PIN"]);
  for (const v of ["1", "on", "true", "yes"]) assert.ok(SERVING_ON_VALUES.has(v));
});

test("an unreachable proxy is COULD NOT VERIFY, never an empty serving set", async () => {
  const r = await readServingGates({
    fetchImpl: async () => { throw new Error("ECONNREFUSED"); },
  });
  assert.equal(r.ok, false, "an empty Set would render as a clean lint over a configuration nobody read");
  assert.match(r.reason, /did not answer/);
});

test("a /health response without a gates object is COULD NOT VERIFY too", async () => {
  const r = await readServingGates({ fetchImpl: async () => ({ ok: true, json: async () => ({ version: "x" }) }) });
  assert.equal(r.ok, false);
  assert.match(r.reason, /no gates object/);
});
