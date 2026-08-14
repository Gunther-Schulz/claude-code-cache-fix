#!/usr/bin/env node
// pr-rounds — the WRITER half of the PR-ROUNDS trigger.
//
// WHY (BACKLOG.md, "the PR-ROUNDS trigger, split out of the entry above with
// its WRITER named, because it is the one part that cannot ride the
// SessionStart hook directly"). The gate-red doorbell reads a LOCAL file and
// can run inline at session start; a PR-round check needs `gh`, i.e. the
// network, and a session-start hook is the one place a network call must not
// go — it sits on the critical path of every session and fails in ways
// nobody sees. So this runs on a SCHEDULE (a user timer, hourly is the
// entry's own suggestion) and writes its verdict to disk; something else
// reads the verdict at session start.
//
// THE MEASURED COST OF NOT HAVING THIS (2026-08-06): a hand `gh pr list` run
// found #273 had been MERGED for 42 minutes, and upstream had posted a round
// on #278 asking for a second rebase 33 minutes earlier — both invisible to
// the session, whose own handoff (written after both events) still read "the
// ball is with upstream." A missing watcher does not only delay a response;
// it writes stale premises into the artifact the next session starts from.
//
// A "round" is open on a PR when someone OTHER than us (a comment, a review,
// or an inline review comment) posted AFTER our own last push to that PR's
// head branch — the ball is in our court and we have not yet responded with
// a new commit.
//
// THE READER lives OUTSIDE this repo: dotfiles' `claude/hooks/session-scan.py`
// is the SessionStart attention line that already carries three doorbells
// this way (BACKLOG.md:4959), and the entry's own design puts the PR-ROUNDS
// reader there too, under the same three states the gate-red doorbell uses —
// count when >0, silent at zero, `stale` when `finished` is older than ~3h,
// silent when the file is absent. Building that reader is out of this
// member's reach (a different repository) and out of its write boundary
// either way; it is named here as the gap it is, not silently dropped.
//
// PATH CORRECTION FROM THE ENTRY, surfaced rather than followed blindly: the
// entry (2026-08-06) names `~/.claude/cache-fix-pr-rounds.json` as the write
// target. That predates this repo's own XDG migration
// (tools/xdg-migrate.mjs, 2026-08-07+, the very tool this batch's member 1
// hardened) — writing a brand-new artifact straight into `~/.claude/` today
// would reintroduce the exact sensitive-file-prompt problem that migration
// exists to end. This writes to the XDG STATE root instead
// (`<state>/pr-rounds.json`, alongside every other state artifact this repo
// owns), consistent with `docs/dev-loop.md`'s "CLOSING is established
// against the WORLD" — the entry's citation was true when written and the
// world has since moved. The dotfiles-side reader needs to be pointed at
// this same path; that cross-repo coordination is named in the closing
// report, not built here.
//
// Usage: node tools/pr-rounds.mjs [--repo owner/name] [--json] [--dry-run]
// Exit 0 on a successful write. Exit 2 when any `gh` call fails — the
// PREVIOUS file is left untouched and no empty `rounds` is ever written; an
// empty result from a failed call is indistinguishable from peace, which is
// exactly the absence-wearing-a-verdict's-clothes shape this repo's own
// dev-loop names.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { statePath } from "../proxy/xdg-dirs.mjs";

const DEFAULT_REPO = "cnighswonger/claude-code-cache-fix";

function realGh(args) {
  return execFileSync("gh", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

/** `gh pr list`, the exact field set the entry names. */
function realListPRs(repo) {
  return JSON.parse(realGh([
    "pr", "list", "--repo", repo, "--author", "@me",
    "--json", "number,reviewDecision,updatedAt,headRefName",
  ]));
}

/** `gh api`, JSON-decoded. Thrown errors propagate — see the failure-mode note above main(). */
function realApi(path) {
  return JSON.parse(realGh(["api", path]));
}

function realWhoAmI() {
  return JSON.parse(realGh(["api", "user"])).login;
}

/**
 * The decision logic, dependency-injected so it is testable against
 * synthetic fixtures rather than the network (dev-loop's own "the
 * synthetic-HOME pattern" preference, one level up — here the boundary is
 * `gh` rather than a filesystem). `listPRs`, `api`, and `whoami` are the
 * three `gh` surfaces this needs; production wires the real ones, tests wire
 * canned data.
 */
export function computeRounds({ repo, listPRs, api, whoami }) {
  const me = whoami();
  const prs = listPRs(repo);
  const rounds = [];
  for (const pr of prs) {
    const allEvents = [
      ...api(`repos/${repo}/issues/${pr.number}/comments`)
        .map((c) => ({ login: c.user?.login, at: c.created_at })),
      ...api(`repos/${repo}/pulls/${pr.number}/comments`)
        .map((c) => ({ login: c.user?.login, at: c.created_at })),
      ...api(`repos/${repo}/pulls/${pr.number}/reviews`)
        .filter((r) => r.submitted_at)
        .map((r) => ({ login: r.user?.login, at: r.submitted_at })),
      // A state change (REVIEW_REQUIRED -> a real decision) with no comment
      // attached is still someone else's action; `updatedAt` alone cannot
      // tell WHO acted, so it is not used as an event source — only named
      // (login-attributed) activity counts, which is why the three sources
      // above are comments and reviews, never the bare `updatedAt` field.
    ].filter((e) => e.login);

    // "Someone OTHER than us": bots included, our own login excluded. A
    // reply we ourselves posted is not upstream asking anything.
    const events = allEvents.filter((e) => e.login !== me);

    if (events.length === 0) continue;

    const lastExternal = events.reduce((a, b) => (a.at > b.at ? a : b));

    const commits = api(`repos/${repo}/pulls/${pr.number}/commits`);
    const ourLastPush = commits
      .map((c) => c.commit?.committer?.date)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

    // OUR ANSWER CLOSES THE ROUND, and it is not always a push.
    //
    // This compared `lastExternal` against `ourLastPush` ALONE until
    // 2026-08-14, which made the tool unanswerable by answering: our own
    // comments were filtered out of the event list entirely, so a round whose
    // correct reply is a QUESTION back stayed open forever. Measured the day
    // it was found — minutes after two rounds were answered, #306 reported
    // closed only because that round happened to end in a push, while #276,
    // answered by comment because the branch work waits on upstream's own
    // sequencing decision, still reported open with our comment as the last
    // activity on the thread.
    //
    // Wrong in BOTH directions, which is what made it a defect rather than a
    // strict reading: a push that answers nothing closed a round, and an
    // answer with no push did not. The consumer is a session-start attention
    // line, so the cost is not a wrong number in a report — it is a doorbell
    // that keeps ringing after the door was answered, which trains exactly
    // the not-looking that let two rounds sit for eight days.
    //
    // The ball is with us iff the last NAMED activity on the PR is theirs.
    // Our comments come back for THIS max only; `lastExternal` above still
    // excludes them, or a reply of ours could masquerade as upstream asking.
    const ourLastComment = allEvents
      .filter((e) => e.login === me)
      .map((e) => e.at)
      .sort()
      .at(-1) ?? null;
    const ourLastAnswer = [ourLastPush, ourLastComment]
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

    // Nothing of ours on the PR at all is a malformed PR, not a silent "no
    // round" — surface it as an open round anchored to the external event
    // rather than dropping the PR from the report.
    if (ourLastAnswer === null || lastExternal.at > ourLastAnswer) {
      rounds.push({ n: pr.number, since: lastExternal.at });
    }
  }
  // Oldest round first — the one that has been waiting longest is the one
  // an attention line should lead with.
  rounds.sort((a, b) => (a.since < b.since ? -1 : a.since > b.since ? 1 : 0));
  return rounds;
}

function main(argv) {
  const args = argv.slice(2);
  const repoIdx = args.indexOf("--repo");
  const repo = repoIdx >= 0 ? args[repoIdx + 1] : DEFAULT_REPO;
  const dryRun = args.includes("--dry-run");

  let rounds;
  try {
    rounds = computeRounds({ repo, listPRs: realListPRs, api: realApi, whoami: realWhoAmI });
  } catch (err) {
    // THE FAILURE MODE, named: `gh` unauthenticated or offline must leave
    // the previous file intact — never write an empty `rounds`, which would
    // read exactly like peace. Nothing is written below; the previous run's
    // file (if any) stands, and its own `finished` timestamp is what lets a
    // reader notice staleness.
    process.stderr.write(`pr-rounds: gh call failed, previous file left untouched: ${err.message}\n`);
    return 2;
  }

  const payload = { finished: new Date().toISOString(), rounds };

  if (dryRun) {
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
    return 0;
  }

  const dest = statePath("pr-rounds.json");
  mkdirSync(statePath(), { recursive: true, mode: 0o700 });
  writeFileSync(dest, JSON.stringify(payload, null, 2) + "\n", { mode: 0o600 });

  if (args.includes("--json")) {
    process.stdout.write(JSON.stringify({ wrote: dest, ...payload }, null, 2) + "\n");
  } else {
    process.stdout.write(
      rounds.length
        ? `pr-rounds: ${rounds.length} open round(s) — ${rounds.map((r) => `#${r.n} since ${r.since}`).join(", ")}\n`
        : "pr-rounds: no open rounds\n",
    );
  }
  return 0;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\//, ""))) {
  process.exit(main(process.argv));
}
