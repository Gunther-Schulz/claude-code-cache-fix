// pr-rounds — the WRITER half of the PR-ROUNDS trigger (BACKLOG.md, "the
// PR-ROUNDS trigger, split out of the entry above with its WRITER named").
//
// THE REAL POSITIVE, run by hand against this fork's actual open PRs
// (2026-08-10, `node tools/pr-rounds.mjs --dry-run`):
//
//   { "rounds": [ { "n": 276, "since": "2026-08-06T12:58:37Z" },
//                 { "n": 306, "since": "2026-08-06T19:41:40Z" } ] }
//
// Verified by hand against the raw API for #306: one issue comment, from
// `vsits-proxy-builder[bot]` at 2026-08-06T19:41:40Z; our last push
// (pulls/306/commits, max committer date) was 2026-08-05T10:51:26Z — the
// comment is newer, so the round is genuinely open. PR #281 is the negative
// control: its only two comments are both from `Gunther-Schulz` (us), so it
// reports no round despite being open — self-authored activity is not
// upstream asking anything.
//
// THE COMMITTED SUITE below exercises `computeRounds` against SYNTHETIC,
// dependency-injected `gh` responses (never the network) — deterministic,
// permanent, and immune to these real PRs eventually closing.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { tmpDirSync } from "../tools/tmpdir.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { computeRounds } from "../tools/pr-rounds.mjs";

const REPO_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(REPO_DIR, "tools", "pr-rounds.mjs");
const REPO = "acme/widget"; // synthetic — never a real gh call in this file's unit bites

/** A minimal fake `gh` surface, built from a small declarative fixture. */
function fakeGh({ prs, comments = {}, reviewComments = {}, reviews = {}, commits = {}, me = "us" }) {
  return {
    repo: REPO,
    listPRs: () => prs,
    api: (path) => {
      const m = path.match(/repos\/[^/]+\/[^/]+\/(issues|pulls)\/(\d+)\/(comments|reviews|commits)/);
      assert.ok(m, `unexpected api path: ${path}`);
      const [, kind, n, sub] = m;
      if (kind === "issues" && sub === "comments") return comments[n] ?? [];
      if (kind === "pulls" && sub === "comments") return reviewComments[n] ?? [];
      if (kind === "pulls" && sub === "reviews") return reviews[n] ?? [];
      if (kind === "pulls" && sub === "commits") return commits[n] ?? [];
      throw new Error(`unhandled path: ${path}`);
    },
    whoami: () => me,
  };
}

const commit = (date) => ({ commit: { committer: { date } } });
const comment = (login, created_at) => ({ user: { login }, created_at });
const review = (login, submitted_at) => ({ user: { login }, submitted_at });

test("BITE — an external comment AFTER our last push opens a round", () => {
  const g = fakeGh({
    prs: [{ number: 1 }],
    comments: { 1: [comment("them", "2026-01-05T00:00:00Z")] },
    commits: { 1: [commit("2026-01-01T00:00:00Z")] },
  });
  const rounds = computeRounds(g);
  assert.deepEqual(rounds, [{ n: 1, since: "2026-01-05T00:00:00Z" }]);
});

test("BITE — an external comment BEFORE our last push does not open a round (we already answered)", () => {
  const g = fakeGh({
    prs: [{ number: 1 }],
    comments: { 1: [comment("them", "2026-01-01T00:00:00Z")] },
    commits: { 1: [commit("2026-01-05T00:00:00Z")] },
  });
  assert.deepEqual(computeRounds(g), []);
});

test("BITE — SELF-authored comments never open a round, however recent", () => {
  const g = fakeGh({
    prs: [{ number: 1 }],
    me: "us",
    comments: { 1: [comment("us", "2026-01-09T00:00:00Z"), comment("us", "2026-01-08T00:00:00Z")] },
    commits: { 1: [commit("2026-01-01T00:00:00Z")] },
  });
  assert.deepEqual(computeRounds(g), [], "the PR-281 negative control shape: two comments, both ours");
});

test("BITE — a REVIEW (not just a comment) from someone else opens a round too", () => {
  const g = fakeGh({
    prs: [{ number: 1 }],
    reviews: { 1: [review("them", "2026-01-05T00:00:00Z")] },
    commits: { 1: [commit("2026-01-01T00:00:00Z")] },
  });
  assert.deepEqual(computeRounds(g), [{ n: 1, since: "2026-01-05T00:00:00Z" }]);
});

test("BITE — an inline REVIEW COMMENT counts as external activity too", () => {
  const g = fakeGh({
    prs: [{ number: 1 }],
    reviewComments: { 1: [comment("them", "2026-01-05T00:00:00Z")] },
    commits: { 1: [commit("2026-01-01T00:00:00Z")] },
  });
  assert.deepEqual(computeRounds(g), [{ n: 1, since: "2026-01-05T00:00:00Z" }]);
});

test("BITE — a PR with no external activity at all is silent", () => {
  const g = fakeGh({ prs: [{ number: 1 }], commits: { 1: [commit("2026-01-01T00:00:00Z")] } });
  assert.deepEqual(computeRounds(g), []);
});

test("BITE — multiple open rounds sort OLDEST first", () => {
  const g = fakeGh({
    prs: [{ number: 1 }, { number: 2 }],
    comments: {
      1: [comment("them", "2026-01-09T00:00:00Z")],
      2: [comment("them", "2026-01-03T00:00:00Z")],
    },
    commits: {
      1: [commit("2026-01-01T00:00:00Z")],
      2: [commit("2026-01-01T00:00:00Z")],
    },
  });
  assert.deepEqual(computeRounds(g), [
    { n: 2, since: "2026-01-03T00:00:00Z" },
    { n: 1, since: "2026-01-09T00:00:00Z" },
  ]);
});

test("BITE — the LATEST external event wins when several exist across sources", () => {
  const g = fakeGh({
    prs: [{ number: 1 }],
    comments: { 1: [comment("them", "2026-01-03T00:00:00Z")] },
    reviews: { 1: [review("them", "2026-01-07T00:00:00Z")] },
    reviewComments: { 1: [comment("them", "2026-01-05T00:00:00Z")] },
    commits: { 1: [commit("2026-01-01T00:00:00Z")] },
  });
  assert.deepEqual(computeRounds(g), [{ n: 1, since: "2026-01-07T00:00:00Z" }]);
});

test("BITE — a PR with no commits at all still surfaces an external event rather than being dropped", () => {
  const g = fakeGh({
    prs: [{ number: 1 }],
    comments: { 1: [comment("them", "2026-01-05T00:00:00Z")] },
    commits: { 1: [] },
  });
  assert.deepEqual(computeRounds(g), [{ n: 1, since: "2026-01-05T00:00:00Z" }]);
});

// --- The failure mode, against the real CLI -------------------------------
//
// "gh unauthenticated or offline must leave the previous file intact and let
// staleness speak, never write an empty rounds." This test's own HOME is
// already the suite's isolated temp home (tools/suite-config-root.mjs), so a
// spawned `gh` finds no `~/.config/gh/hosts.yml` there and genuinely fails
// with "gh auth login" — a real, unmocked reproduction of the named
// unauthenticated case, not a simulated one.

test("BITE — a gh failure (unauthenticated, here) leaves the previous file untouched and exits 2", () => {
  const stateDir = tmpDirSync("pr-rounds-state-");
  mkdirSync(stateDir, { recursive: true });
  const dest = join(stateDir, "pr-rounds.json");
  const before = JSON.stringify({ finished: "2020-01-01T00:00:00Z", rounds: [{ n: 999, since: "2020-01-01T00:00:00Z" }] });
  writeFileSync(dest, before);

  // PIN THE PREMISE, do not inherit it. This bite says "unauthenticated,
  // here" and until 2026-08-14 relied on the AMBIENT gh being logged out —
  // an environment premise the check did not establish. On a machine where
  // gh IS authenticated (this one, and any machine that ever ran the tool
  // for real) it reached the network instead, exercised nothing it names,
  // and went red for a reason that had nothing to do with the failure path.
  // Pointing GH_CONFIG_DIR at an empty directory and clearing both token
  // variables makes gh genuinely unauthenticated inside the check, so the
  // bite is re-runnable in both directions instead of being a property of
  // whoever's laptop it runs on. Verified both arms: with the ambient
  // environment the tool exits 0, with this one it exits 2 and gh prints
  // "please run: gh auth login".
  const emptyGhConfig = tmpDirSync("pr-rounds-gh-config-");
  mkdirSync(emptyGhConfig, { recursive: true });
  const scrubbedEnv = { ...process.env, CACHE_FIX_STATE_DIR: stateDir, GH_CONFIG_DIR: emptyGhConfig };
  delete scrubbedEnv.GH_TOKEN;
  delete scrubbedEnv.GITHUB_TOKEN;

  let status;
  try {
    execFileSync(process.execPath, [TOOL], {
      cwd: REPO_DIR,
      env: scrubbedEnv,
      encoding: "utf8",
      timeout: 20_000,
    });
    status = 0;
  } catch (err) {
    status = err.status;
  }

  assert.equal(status, 2, "a gh failure must fail the run, not succeed with an empty result");
  assert.equal(readFileSync(dest, "utf8"), before, "the previous file must be byte-identical — nothing was written on failure");
});

// --- our ANSWER closes the round, and it is not always a push -------------
// Added 2026-08-14, from the tool contradicting the world minutes after two
// real rounds were answered. The pair below is the discriminator: the same
// external event, answered two different ways, must reach the same verdict.

test("BITE — a COMMENT of ours after their event closes the round (an answer need not be a push)", () => {
  const g = fakeGh({
    prs: [{ number: 1 }],
    me: "us",
    comments: {
      1: [
        comment("them", "2026-01-05T00:00:00Z"),
        comment("us", "2026-01-06T00:00:00Z"),
      ],
    },
    // Our last push PREDATES their event. Under the old predicate this
    // reported an open round forever, whatever we said — the live shape of
    // PR #276, whose answer was deliberately a question back rather than a
    // force-push.
    commits: { 1: [commit("2026-01-01T00:00:00Z")] },
  });
  assert.deepEqual(computeRounds(g), []);
});

test("BITE — our comment BEFORE their event leaves the round open (answering earlier is not answering)", () => {
  const g = fakeGh({
    prs: [{ number: 1 }],
    me: "us",
    comments: {
      1: [
        comment("us", "2026-01-02T00:00:00Z"),
        comment("them", "2026-01-05T00:00:00Z"),
      ],
    },
    commits: { 1: [commit("2026-01-01T00:00:00Z")] },
  });
  assert.deepEqual(computeRounds(g), [{ n: 1, since: "2026-01-05T00:00:00Z" }]);
});

test("BITE — our own comment still cannot OPEN a round: it feeds the answer clock only", () => {
  // The half that keeps the fix from becoming a new defect. Our comments are
  // admitted for the answer timestamp; if they also counted as external
  // events, a PR nobody else ever touched would report a round against
  // itself.
  const g = fakeGh({
    prs: [{ number: 1 }],
    me: "us",
    comments: { 1: [comment("us", "2026-01-09T00:00:00Z")] },
    commits: { 1: [commit("2026-01-01T00:00:00Z")] },
  });
  assert.deepEqual(computeRounds(g), []);
});

test("BITE — a PR with an external event and NOTHING of ours still reports, rather than vanishing", () => {
  const g = fakeGh({
    prs: [{ number: 1 }],
    me: "us",
    comments: { 1: [comment("them", "2026-01-05T00:00:00Z")] },
    commits: { 1: [] },
  });
  assert.deepEqual(computeRounds(g), [{ n: 1, since: "2026-01-05T00:00:00Z" }]);
});
