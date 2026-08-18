#!/usr/bin/env node
// conversation-birth-census — what does a conversation's FIRST request from
// Claude Code actually look like, measured over real captures.
//
// WHY THIS EXISTS, and it is the probe-used-twice rule firing (dev-loop, file
// roles): two sessions wrote this same 60-line streaming probe within one hour
// on 2026-08-18 — the desk grading a repair, and the repair lane re-measuring
// rather than booking the desk's numbers. A probe used twice graduates or dies.
//
// WHAT IT COST TO NOT HAVE IT. `deferred-tool-rewrite`'s preload may seed a
// tool only at a conversation's BIRTH; seeding a running conversation changes
// `tools[]` mid-flight, which is the exact bust the preload prevents. The first
// implementation of that guard was a message-count ceiling of 1, written from a
// SENTENCE about Claude Code in a code comment ("CC's first request carries
// exactly the user turn that opened it"). Measured here: that admitted 0 of 43
// conversations on one capture set and 2 of 50 on another. The mitigation was
// dead on arrival under a fully green suite, because every bite drove
// one-message bodies — a shape CC does not produce. A claim about CC's
// behaviour is answered by the corpus, never by a sentence about CC.
//
// THE GENERAL SHAPE, which is why this is a tool and not a note: a guard whose
// failure direction is "the mitigation does not fire" is INVISIBLE to negative
// bites — they all pass while it does nothing. Its positive bite has to be
// written in the shape real traffic produces, and this is what reports that
// shape.
//
// WHY A NEW FILE rather than a mode of `replay.mjs --census` (dev-loop: extend
// an existing tool before writing a new one): that census is PAIR-shaped — it
// classifies deltas between two requests of one conversation. This asks a
// per-conversation FIRST-RECORD question, where the population is one row per
// conversation and pairs never enter. It does import `conversationSubKey`
// rather than re-deriving identity, which is the part that must not be
// restated (three confident wrong answers in this repo came from hand-rolled
// identity).
//
//   node tools/conversation-birth-census.mjs [--captures <dir>] [--limit N]
//
// THREE ANSWERS, not two. A directory with no readable capture, or captures
// carrying no tool-bearing request, exits 2 with COULD NOT VERIFY — never a
// clean zero, because "no births found" and "nothing was looked at" are the
// same number otherwise.
//
// CARRIER REGISTRATION (closing-gate question 4): this tool writes NOTHING
// outside the tree — no state file, no snapshot, no marker. It reads captures
// and prints. So it has no carrier class and needs no `state-report`
// collector, and this line is the declaration the enumerable completeness test
// asks every `tools/` mechanism for.
//
// REACH LIMIT, stated because it bounds every reading: "first OBSERVED request"
// is not provably a conversation's true first request — a capture can begin
// mid-conversation. That cuts against the WITH-assistant population (some are
// merely mid-capture) and never against the NO-assistant one: a request
// carrying no assistant turn cannot be mid-conversation. Conclusions rest on
// the birth population.

import { createReadStream, readdirSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { homedir } from "node:os";
import { conversationSubKey } from "../proxy/extensions/message-hash.mjs";

const DEFAULT_CAPTURES = join(homedir(), ".local/share/cache-fix/captures");

function parseArgs(argv) {
  const args = { captures: DEFAULT_CAPTURES, limit: 6, json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--captures") args.captures = argv[++i];
    else if (argv[i] === "--limit") args.limit = Number(argv[++i]);
    else if (argv[i] === "--json") args.json = true;
  }
  return args;
}

/** One row per conversation: the shape of the first request we saw for it.
 * Exported so a bite can drive it without a capture directory. */
export function foldRequest(rows, key, messages) {
  if (rows.has(key)) return rows;
  const roles = messages.map((m) => m?.role ?? null);
  rows.set(key, {
    messages: messages.length,
    roles,
    assistants: roles.filter((r) => r === "assistant").length,
  });
  return rows;
}

/** The classification the guard actually needs: a conversation at BIRTH has no
 * assistant turn yet. Deliberately NOT a message count — the count that looked
 * right (<= 1) matched neither population. */
export function isBirthShape(row) {
  return row.assistants === 0;
}

export async function census({ captures = DEFAULT_CAPTURES, limit = 6 } = {}) {
  let names;
  try {
    names = readdirSync(captures)
      .filter((f) => f.endsWith("-requests.jsonl"))
      .map((f) => ({ f, size: statSync(join(captures, f)).size }))
      .sort((a, b) => b.size - a.size)
      .slice(0, limit)
      .map((x) => x.f);
  } catch (e) {
    return { ok: false, reason: `cannot read ${captures}: ${e?.message ?? e}` };
  }
  if (names.length === 0) return { ok: false, reason: `no capture files under ${captures}` };

  const rows = new Map();
  let requests = 0;
  for (const name of names) {
    const rl = createInterface({ input: createReadStream(join(captures, name)), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line) continue;
      let rec;
      try { rec = JSON.parse(line); } catch { continue; }
      const body = rec?.body;
      if (!Array.isArray(body?.tools) || body.tools.length === 0) continue;
      if (!Array.isArray(body?.messages) || body.messages.length === 0) continue;
      requests++;
      foldRequest(rows, `${rec.key ?? ""}|${conversationSubKey(body.messages)}`, body.messages);
    }
  }
  if (requests === 0) {
    return { ok: false, reason: `${names.length} capture(s) read, none carrying a tool-bearing request` };
  }

  const all = [...rows.values()];
  const births = all.filter(isBirthShape);
  const mid = all.filter((r) => !isBirthShape(r));
  const tally = (xs) => xs.reduce((a, r) => ((a[r.messages] = (a[r.messages] ?? 0) + 1), a), {});
  return {
    ok: true,
    files: names.length,
    requests,
    conversations: all.length,
    births: { count: births.length, byMessageCount: tally(births), rolePatterns: tally2(births) },
    midConversation: { count: mid.length, byMessageCount: tally(mid) },
  };
}

function tally2(rows) {
  return rows.reduce((a, r) => ((a[r.roles.join("/")] = (a[r.roles.join("/")] ?? 0) + 1), a), {});
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  const res = await census(args);
  if (!res.ok) {
    process.stderr.write(`COULD NOT VERIFY — ${res.reason}\n`);
    process.exit(2);
  }
  if (args.json) {
    process.stdout.write(JSON.stringify(res, null, 2) + "\n");
  } else {
    process.stdout.write(
      `${res.files} capture(s), ${res.requests} tool-bearing request(s), ${res.conversations} conversation(s)\n` +
      `  BIRTH shape (no assistant turn): ${res.births.count}\n` +
      `    by message count: ${JSON.stringify(res.births.byMessageCount)}\n` +
      `    role patterns:    ${JSON.stringify(res.births.rolePatterns)}\n` +
      `  mid-conversation (assistant present): ${res.midConversation.count}\n` +
      `    by message count: ${JSON.stringify(res.midConversation.byMessageCount)}\n` +
      `\nThe two populations must NOT overlap on the property a birth guard keys on.\n` +
      `Reach limit: "first observed" can be mid-capture — that cuts against the\n` +
      `mid-conversation count, never against the births.\n`,
    );
  }
  process.exit(0);
}
