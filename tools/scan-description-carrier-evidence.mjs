// G3 wire-evidence scan: did a live 200-request on an announcement-allowlisted
// model carry BOTH an active tool_addition injection (=> the
// mid-conversation-tool-changes beta on the wire) AND a role:"system" TEXT
// message in messages[]? If yes, the API demonstrably accepts text-content
// system messages under that beta on that model — the exact carrier the
// description notice ships on.
import { createReadStream, readdirSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { homedir } from "node:os";

const capture = process.argv[2];
const snapDir = join(homedir(), ".claude", "cache-fix-snapshots");
const keyPrefix = process.argv[3]; // e.g. s-captureJ

// 1. Injection-active windows per sid, from the extension's own telemetry.
const firstInjected = new Map(); // sid -> earliest ts with injected>0
for (const f of readdirSync(snapDir)) {
  if (!f.startsWith(keyPrefix) || !f.endsWith("-deferred-tool-events.jsonl")) continue;
  for (const line of readFileSync(join(snapDir, f), "utf-8").trim().split("\n")) {
    if (!line) continue;
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (!e.injected || e.injected <= 0 || !e.sid) continue;
    const prev = firstInjected.get(e.sid);
    if (!prev || e.ts < prev) firstInjected.set(e.sid, e.ts);
  }
}
console.log("sids with injections:", firstInjected.size);

// 2. Stream the capture: request lines and outcome lines.
const ALLOW = /^claude-(opus-5|fable-5)/;
const candidates = new Map(); // id -> {ts, sid, model, sysTextMsgs}
const outcomes = new Map(); // id -> usage
const rl = createInterface({ input: createReadStream(capture), crlfDelay: Infinity });
for await (const line of rl) {
  let e; try { e = JSON.parse(line); } catch { continue; }
  if (e.type === "outcome") { outcomes.set(e.id, e); continue; }
  if (!e.body || !e.id) continue;
  const m = e.body.model || "";
  if (!ALLOW.test(m)) continue;
  const first = e.sid && firstInjected.get(e.sid);
  if (!first || e.ts < first) continue; // injection not yet active for this sid
  const msgs = Array.isArray(e.body.messages) ? e.body.messages : [];
  const sysText = msgs.filter(
    (x) =>
      x && x.role === "system" &&
      (typeof x.content === "string" ||
        (Array.isArray(x.content) && x.content.length && x.content.every((b) => b?.type === "text"))),
  );
  if (sysText.length) candidates.set(e.id, { ts: e.ts, sid: e.sid, model: m, sysText: sysText.length, msgs: msgs.length });
}

let proven = 0;
for (const [id, c] of candidates) {
  const o = outcomes.get(id);
  if (!o) continue;
  proven++;
  if (proven <= 5)
    console.log("PROVEN:", JSON.stringify({ id, ts: c.ts, model: c.model, sysTextMsgs: c.sysText, msgs: c.msgs, requestId: o.requestId, outBytes: o.outBytes, cacheRead: o.usage?.cacheRead }));
}
console.log(`candidates (allowlisted model, injection active, system-text msg in body): ${candidates.size}`);
console.log(`of those with a streamed-200 outcome: ${proven}`);
