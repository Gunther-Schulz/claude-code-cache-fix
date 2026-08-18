// Threat-matrix row 31: CC issues one sidecar request TWICE, 6-25 ms apart,
// with distinct upstream request-ids and two completed usage-log records —
// both answered, both charged. The mitigation coalesces the pair into ONE
// upstream call serving both callers.
//
// These bites exercise the predicate AT THE WIRE, through a real proxy
// instance against a real (local) upstream that counts what it received,
// because the defect is a count of upstream calls and nothing below that
// altitude can observe it. The arms MUST DIFFER: an assertion that only
// showed "one call" for the coalescing case would pass equally against a
// build that coalesced everything, which is the over-reach this predicate
// exists to prevent — so the mid-session arm asserting TWO calls is the
// discriminating half, not decoration.

import { tmpDir } from "../tools/tmpdir.mjs";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { rm, symlink, readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { startProxy, coalesceCandidate, createFanOut } from "../proxy/server.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

function clientRequest(port, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/v1/messages",
        method: "POST",
        headers: { "content-type": "application/json" },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
      },
    );
    req.on("error", reject);
    req.end(data);
  });
}

// Holds the response open long enough that a duplicate arriving inside the
// 50 ms window finds the first still IN FLIGHT — condition 4. Without the
// hold the first call would complete before the second arrived and the
// coalescing arm would pass for the wrong reason.
function slowSseUpstream(counter, holdMs = 120) {
  return http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      counter.calls += 1;
      counter.bodies.push(Buffer.concat(chunks).toString());
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write('data: {"type":"message_start","message":{"model":"claude-haiku-4-5","usage":{}}}\n\n');
      setTimeout(() => {
        res.write('data: {"type":"message_stop"}\n\n');
        res.write("data: [DONE]\n\n");
        res.end();
      }, holdMs);
    });
  });
}

const SIDECAR = {
  model: "claude-haiku-4-5",
  max_tokens: 32000,
  stream: true,
  messages: [{ role: "user", content: [{ type: "text", text: "x".repeat(337) }] }],
};

const MID_SESSION = {
  ...SIDECAR,
  messages: [
    { role: "user", content: [{ type: "text", text: "first" }] },
    { role: "assistant", content: [{ type: "text", text: "reply" }] },
    { role: "user", content: [{ type: "text", text: "second" }] },
  ],
};

describe("row 31 — the structural half of the predicate (conditions 1 and 2)", () => {
  it("accepts a single-message request carrying no tools", () => {
    assert.equal(coalesceCandidate(SIDECAR), true);
  });

  it("REJECTS a mid-session request — nMsg alone is the discriminator the row asked for", () => {
    assert.equal(coalesceCandidate(MID_SESSION), false);
  });

  it("REJECTS a single-message request that carries tools", () => {
    assert.equal(coalesceCandidate({ ...SIDECAR, tools: [{ name: "Bash" }] }), false);
  });

  it("treats an EMPTY tools array as no tools — the measured request carried 0", () => {
    assert.equal(coalesceCandidate({ ...SIDECAR, tools: [] }), true);
  });

  it("rejects a body with no messages array at all", () => {
    assert.equal(coalesceCandidate({ model: "x" }), false);
    assert.equal(coalesceCandidate(null), false);
  });
});

describe("row 31 — the fan-out writable serves every attached caller", () => {
  function fakeRes() {
    return {
      writableEnded: false, destroyed: false, writableNeedDrain: false,
      head: null, chunks: [], ended: false,
      writeHead(status, headers) { this.head = { status, headers }; },
      write(c) { this.chunks.push(String(c)); return true; },
      end(c) { if (c !== undefined) this.chunks.push(String(c)); this.ended = true; this.writableEnded = true; },
      destroy() { this.destroyed = true; },
      once() {},
    };
  }

  it("a follower attaching MID-STREAM receives the chunks already written", () => {
    const leader = fakeRes();
    const fan = createFanOut(leader);
    fan.writeHead(200, { "content-type": "text/event-stream" });
    fan.write("data: one\n\n");

    const follower = fakeRes();
    assert.equal(fan.attach(follower), true);

    fan.write("data: two\n\n");
    fan.end();

    assert.deepEqual(leader.chunks, ["data: one\n\n", "data: two\n\n"]);
    assert.deepEqual(follower.chunks, ["data: one\n\n", "data: two\n\n"],
      "the follower must receive the whole response, not only what came after it attached");
    assert.deepEqual(follower.head, { status: 200, headers: { "content-type": "text/event-stream" } });
    assert.equal(follower.ended, true);
  });

  it("a follower attaching AFTER the response ended is served in full and reports not-joined", () => {
    const leader = fakeRes();
    const fan = createFanOut(leader);
    fan.writeHead(200, {});
    fan.write("data: one\n\n");
    fan.end();

    const late = fakeRes();
    assert.equal(fan.attach(late), false, "a late follower must not be added to the live set");
    assert.deepEqual(late.chunks, ["data: one\n\n"]);
    assert.equal(late.ended, true, "it is still owed a complete response");
  });

  it("a leader whose own client hung up keeps writing to its followers", () => {
    const leader = fakeRes();
    const fan = createFanOut(leader);
    fan.writeHead(200, {});
    const follower = fakeRes();
    fan.attach(follower);

    leader.destroyed = true; // the leader's client goes away mid-stream
    fan.write("data: after\n\n");

    assert.equal(fan.writableEnded, false, "someone is still listening");
    assert.deepEqual(follower.chunks, ["data: after\n\n"]);
    assert.deepEqual(leader.chunks, [], "nothing is written to a dead socket");
  });
});

describe("row 31 at the wire — the upstream call COUNT is the defect", () => {
  let handle, upstream, counter, extDir;

  before(async () => {
    extDir = await tmpDir("coalesce-ext-");
    counter = { calls: 0, bodies: [] };
    upstream = slowSseUpstream(counter);
    await new Promise((r) => upstream.listen(0, "127.0.0.1", r));
    process.env.CACHE_FIX_PROXY_UPSTREAM = `http://127.0.0.1:${upstream.address().port}`;
    process.env.CACHE_FIX_COALESCE_SIDECAR = "1";
    handle = await startProxy({ port: 0, watch: false, extensionsDir: extDir });
  });

  after(async () => {
    await handle.close();
    await new Promise((r) => upstream.close(r));
    delete process.env.CACHE_FIX_PROXY_UPSTREAM;
    delete process.env.CACHE_FIX_COALESCE_SIDECAR;
    await rm(extDir, { recursive: true, force: true });
  });

  it("all four conditions: ONE upstream call, BOTH callers answered", async () => {
    counter.calls = 0;
    const a = clientRequest(handle.port, SIDECAR);
    await new Promise((r) => setTimeout(r, 15)); // inside the 50 ms window
    const b = clientRequest(handle.port, SIDECAR);
    const [ra, rb] = await Promise.all([a, b]);

    assert.equal(counter.calls, 1, "the duplicate must not reach upstream");
    assert.equal(ra.status, 200);
    assert.equal(rb.status, 200);
    assert.equal(ra.body, rb.body, "both callers receive byte-identical output");
    assert.ok(ra.body.includes("message_stop"), "and it is the COMPLETE response, not a truncated replay");
  });

  it("mid-session pair (nMsg > 1): TWO upstream calls, unchanged", async () => {
    counter.calls = 0;
    const a = clientRequest(handle.port, MID_SESSION);
    await new Promise((r) => setTimeout(r, 15));
    const b = clientRequest(handle.port, MID_SESSION);
    await Promise.all([a, b]);

    assert.equal(counter.calls, 2,
      "a mid-session duplicate is a legitimate retry — suppressing it would leave a real request unanswered");
  });

  it("three of four conditions (tools present): TWO upstream calls", async () => {
    counter.calls = 0;
    const withTools = { ...SIDECAR, tools: [{ name: "Bash", input_schema: {} }] };
    const a = clientRequest(handle.port, withTools);
    await new Promise((r) => setTimeout(r, 15));
    const b = clientRequest(handle.port, withTools);
    await Promise.all([a, b]);

    assert.equal(counter.calls, 2, "failing any one condition must not coalesce");
  });

  it("three of four conditions (still in flight, but PAST the 50 ms window): TWO upstream calls", async () => {
    // The second send must arrive while the first is STILL IN FLIGHT (the
    // upstream holds 120 ms) but outside the window, or this arm proves
    // nothing about condition 4. The first version awaited both requests
    // sequentially, so the leader had already left the map and the window
    // check was never reached — disabling the window left it green, which
    // is how the gap was found.
    counter.calls = 0;
    const a = clientRequest(handle.port, SIDECAR);
    await new Promise((r) => setTimeout(r, 80));
    const b = clientRequest(handle.port, SIDECAR);
    await Promise.all([a, b]);

    assert.equal(counter.calls, 2, "past the window the pair is not a duplicate send");
  });

  it("a sequential repeat (first already completed) is not coalesced", async () => {
    counter.calls = 0;
    await clientRequest(handle.port, SIDECAR);
    await clientRequest(handle.port, SIDECAR);

    assert.equal(counter.calls, 2, "the leader must not outlive its own request");
  });

  it("differing bodies inside the window: TWO upstream calls", async () => {
    counter.calls = 0;
    const a = clientRequest(handle.port, SIDECAR);
    await new Promise((r) => setTimeout(r, 15));
    const b = clientRequest(handle.port, { ...SIDECAR, max_tokens: 16000 });
    await Promise.all([a, b]);

    // What this establishes, stated precisely because the first version of
    // this arm claimed more: differing forwarded bytes produce a different
    // KEY, so the pair never meets. It does not exercise a separate
    // byte-compare, and the mutation proof is what showed that — disabling
    // one left this arm green.
    assert.equal(counter.calls, 2, "differing forwarded bytes never share a coalescing key");
  });
});

// The record is what makes the mitigation SWITCHABLE-ON: without it a
// coalesced follower is a request with no outcome, which the census reads as
// an unanswered send (test/coalesce-record.test.mjs owns that reading). The
// bites there run over hand-written capture lines; this one is the altitude
// question — does the RUNNING proxy actually write the line, through the real
// extension, on a real coalesce. A record that only exists in a builder's unit
// test is a record nothing writes.
//
// Red-first, baseline stated: 17/17 green on the shipped build; with the
// `runOnCoalesced` call removed from server.mjs's coalescing branch — the
// mechanism, not the assertion — this bite fails on `coalescedRecs.length`
// 0 vs 1 while every other bite in the file stays green, which is what places
// the red on the writer rather than on the harness.
describe("row 31 — the coalesce record at the wire", () => {
  let handle, upstream, counter, extDir, captureDir;

  before(async () => {
    // A SYMLINK, not a copy: node resolves it to the real path, so the
    // extension's own relative imports (../xdg-dirs.mjs) still resolve. A copy
    // into a temp dir would fail to load, and loading the whole real
    // extensions directory would drag every other extension's mutations into
    // an assertion about capture lines.
    extDir = await tmpDir("coalesce-rec-ext-");
    await symlink(join(REPO, "proxy", "extensions", "request-capture.mjs"),
                  join(extDir, "request-capture.mjs"));
    captureDir = await tmpDir("coalesce-rec-caps-");
    counter = { calls: 0, bodies: [] };
    upstream = slowSseUpstream(counter);
    await new Promise((r) => upstream.listen(0, "127.0.0.1", r));
    process.env.CACHE_FIX_PROXY_UPSTREAM = `http://127.0.0.1:${upstream.address().port}`;
    process.env.CACHE_FIX_COALESCE_SIDECAR = "1";
    process.env.CACHE_FIX_REQUEST_CAPTURE = "1";
    process.env.CACHE_FIX_CAPTURE_DIR = captureDir;
    handle = await startProxy({ port: 0, watch: false, extensionsDir: extDir });
  });

  after(async () => {
    await handle.close();
    await new Promise((r) => upstream.close(r));
    delete process.env.CACHE_FIX_PROXY_UPSTREAM;
    delete process.env.CACHE_FIX_COALESCE_SIDECAR;
    delete process.env.CACHE_FIX_REQUEST_CAPTURE;
    delete process.env.CACHE_FIX_CAPTURE_DIR;
    await rm(extDir, { recursive: true, force: true });
    await rm(captureDir, { recursive: true, force: true });
  });

  it("the suppressed send leaves a record naming the request that answered it", async () => {
    counter.calls = 0;
    const a = clientRequest(handle.port, SIDECAR);
    await new Promise((r) => setTimeout(r, 15));
    const b = clientRequest(handle.port, SIDECAR);
    await Promise.all([a, b]);
    assert.equal(counter.calls, 1, "precondition: the pair really did coalesce");

    const files = (await readdir(captureDir)).filter((f) => f.endsWith("-requests.jsonl"));
    assert.equal(files.length, 1, "both sends share a capture key, so both land in one file");
    const lines = (await readFile(join(captureDir, files[0]), "utf-8"))
      .trim().split("\n").map((l) => JSON.parse(l));

    const requests = lines.filter((r) => !r.type);
    const coalescedRecs = lines.filter((r) => r.type === "coalesced");
    const outcomes = lines.filter((r) => r.type === "outcome");

    assert.equal(requests.length, 2, "both sends are captured — the follower is not erased");
    assert.equal(coalescedRecs.length, 1, "exactly one record per suppressed send");
    assert.equal(outcomes.length, 1, "and exactly one answer was billed");

    const rec = coalescedRecs[0];
    assert.equal(rec.id, requests[1].id, "the record names the FOLLOWER as its subject");
    assert.equal(rec.leaderId, requests[0].id, "and the leader as what answered it");
    assert.equal(rec.leaderId, outcomes[0].id, "which is the send that carries the billing");
    assert.equal(typeof rec.deltaMs, "number");
    assert.ok(rec.deltaMs >= 0 && rec.deltaMs < 50, `inside the window: ${rec.deltaMs}`);
    assert.match(rec.sha ?? "", /^[0-9a-f]{16}$/,
      "the digest rides in the outcome record's own outSha namespace, so the two are comparable");
  });

  it("a request that is NOT coalesced leaves no such record", async () => {
    // The discriminating arm: without it, a build that wrote a coalesced
    // record for every request would pass the bite above.
    const before = (await readdir(captureDir)).length;
    await clientRequest(handle.port, MID_SESSION);
    const files = (await readdir(captureDir)).filter((f) => f.endsWith("-requests.jsonl"));
    assert.ok(files.length >= before, "the mid-session request landed somewhere");
    const all = [];
    for (const f of files) {
      const lines = (await readFile(join(captureDir, f), "utf-8")).trim().split("\n");
      for (const l of lines) all.push(JSON.parse(l));
    }
    const midSession = all.filter((r) => !r.type && r.body?.messages?.length === 3);
    assert.equal(midSession.length, 1, "precondition: the mid-session send was captured");
    const coalescedIds = new Set(all.filter((r) => r.type === "coalesced").map((r) => r.id));
    assert.equal(coalescedIds.has(midSession[0].id), false,
      "a send that went upstream on its own must not be marked as served by another");
  });
});

describe("row 31 — the MISS record: a duplicate the mitigation did NOT absorb", () => {
  // The hit already had a record; the MISS did not, and that asymmetry is the
  // defect these bites exist for. A duplicate that is forwarded anyway leaves
  // an ordinary request record and an ordinary outcome record, i.e. after the
  // fact it is indistinguishable from a first send — measured 2026-08-18, when
  // attributing ONE such miss took a hand walk over a 435 MB capture and still
  // could not say WHICH way the window failed.
  //
  // Two reasons, two different fixes, so each gets its own arm rather than one
  // arm asserting "a record exists": a build that emitted `stale-leader` for
  // every miss would pass a single-armed bite while being wrong about half the
  // population.
  let handle, upstream, counter, extDir, captureDir;

  before(async () => {
    extDir = await tmpDir("coalesce-miss-ext-");
    await symlink(join(REPO, "proxy", "extensions", "request-capture.mjs"),
                  join(extDir, "request-capture.mjs"));
    captureDir = await tmpDir("coalesce-miss-caps-");
    counter = { calls: 0, bodies: [] };
    // A LONGER hold than the coalescing block's: the stale-leader arm needs the
    // leader still in flight while the window has already closed, which is
    // exactly the state the window is measured against.
    upstream = slowSseUpstream(counter, 400);
    await new Promise((r) => upstream.listen(0, "127.0.0.1", r));
    process.env.CACHE_FIX_PROXY_UPSTREAM = `http://127.0.0.1:${upstream.address().port}`;
    process.env.CACHE_FIX_COALESCE_SIDECAR = "1";
    process.env.CACHE_FIX_REQUEST_CAPTURE = "1";
    process.env.CACHE_FIX_CAPTURE_DIR = captureDir;
    handle = await startProxy({ port: 0, watch: false, extensionsDir: extDir });
  });

  after(async () => {
    await handle.close();
    await new Promise((r) => upstream.close(r));
    delete process.env.CACHE_FIX_PROXY_UPSTREAM;
    delete process.env.CACHE_FIX_COALESCE_SIDECAR;
    delete process.env.CACHE_FIX_REQUEST_CAPTURE;
    delete process.env.CACHE_FIX_CAPTURE_DIR;
    await rm(extDir, { recursive: true, force: true });
    await rm(captureDir, { recursive: true, force: true });
  });

  async function missRecords(dir) {
    const files = (await readdir(dir)).filter((f) => f.endsWith("-requests.jsonl"));
    const out = [];
    for (const f of files) {
      const lines = (await readFile(join(dir, f), "utf-8")).trim().split("\n");
      for (const l of lines) {
        const r = JSON.parse(l);
        if (r.type === "coalesce-miss") out.push(r);
      }
    }
    return out;
  }

  it("STALE-LEADER: the leader is still in flight but the window has closed", async () => {
    const own = await tmpDir("coalesce-miss-stale-");
    process.env.CACHE_FIX_CAPTURE_DIR = own;
    counter.calls = 0;
    const a = clientRequest(handle.port, SIDECAR);
    // Past COALESCE_WINDOW_MS (50) and far inside the upstream hold (400), so
    // the leader is registered AND live when the follower looks.
    await new Promise((r) => setTimeout(r, 120));
    const b = clientRequest(handle.port, SIDECAR);
    await Promise.all([a, b]);
    assert.equal(counter.calls, 2, "precondition: the pair was NOT coalesced");

    const misses = await missRecords(own);
    assert.equal(misses.length, 1, "exactly one miss record for the one forwarded duplicate");
    const rec = misses[0];
    assert.equal(rec.reason, "stale-leader");
    assert.equal(typeof rec.ageMs, "number");
    assert.ok(rec.ageMs >= 50, `the registration clock says the window had closed: ${rec.ageMs}`);
    assert.equal(typeof rec.arrivalDeltaMs, "number",
      "both clocks ride in the record — the arrival one is the evidence the parked fix reads");
    assert.ok(rec.arrivalDeltaMs >= 50, `arrival delta: ${rec.arrivalDeltaMs}`);
    assert.match(rec.sha ?? "", /^[0-9a-f]{16}$/,
      "same digest namespace as the outcome record's outSha, so a reader can check byte-identity");
    assert.ok(rec.leaderId, "and it names what it lost the race to");
    await rm(own, { recursive: true, force: true });
    process.env.CACHE_FIX_CAPTURE_DIR = captureDir;
  });

  it("CONTROL — the leader having FINISHED is NOT a miss: no opportunity existed", async () => {
    // The scope decision, pinned. Two identical sends where the first has
    // already completed had nothing in flight to attach to, so nothing was
    // lost — and recording it would fire on any ordinary later request that
    // happens to carry the same bytes. An earlier draft DID record it, via a
    // 2 s tombstone of completed leaders, and this arm is what killed it: the
    // tombstone made a pair that DID coalesce report a miss, because the
    // previous pair's tombstone was still live under the same key. The record
    // was firing on the mitigation's own success.
    const own = await tmpDir("coalesce-miss-done-");
    process.env.CACHE_FIX_CAPTURE_DIR = own;
    counter.calls = 0;
    await clientRequest(handle.port, SIDECAR);      // leader completes fully
    await clientRequest(handle.port, SIDECAR);      // identical bytes, but nothing in flight
    assert.equal(counter.calls, 2, "precondition: two upstream calls, nothing coalesced");
    assert.equal((await missRecords(own)).length, 0,
      "a completed leader is not a lost opportunity — the leader-not-yet-registered case is " +
      "recovered at the READER instead, as a double-billed streak carrying no miss record");
    await rm(own, { recursive: true, force: true });
    process.env.CACHE_FIX_CAPTURE_DIR = captureDir;
  });

  it("CONTROL — a pair that DOES coalesce writes a coalesced record and NO miss record", async () => {
    // Without this arm, a build that wrote a miss record for every duplicate
    // would pass both arms above while inverting the mitigation's own signal.
    const own = await tmpDir("coalesce-miss-ctl-");
    process.env.CACHE_FIX_CAPTURE_DIR = own;
    counter.calls = 0;
    const a = clientRequest(handle.port, SIDECAR);
    await new Promise((r) => setTimeout(r, 10));
    const b = clientRequest(handle.port, SIDECAR);
    await Promise.all([a, b]);
    assert.equal(counter.calls, 1, "precondition: this pair really did coalesce");
    assert.equal((await missRecords(own)).length, 0,
      "an ABSORBED duplicate is not a miss — the two records must never both fire");
    await rm(own, { recursive: true, force: true });
    process.env.CACHE_FIX_CAPTURE_DIR = captureDir;
  });

  it("CONTROL — a lone request writes no miss record at all", async () => {
    // The over-firing arm at the other end: a first send has no predecessor,
    // and a lane that fires on everything would still pass the three above.
    const own = await tmpDir("coalesce-miss-lone-");
    process.env.CACHE_FIX_CAPTURE_DIR = own;
    counter.calls = 0;
    await clientRequest(handle.port, MID_SESSION);
    assert.equal((await missRecords(own)).length, 0);
    await rm(own, { recursive: true, force: true });
    process.env.CACHE_FIX_CAPTURE_DIR = captureDir;
  });
});

describe("row 31 — the gate is OFF by default", () => {
  let handle, upstream, counter, extDir;

  before(async () => {
    extDir = await tmpDir("coalesce-off-ext-");
    counter = { calls: 0, bodies: [] };
    upstream = slowSseUpstream(counter);
    await new Promise((r) => upstream.listen(0, "127.0.0.1", r));
    process.env.CACHE_FIX_PROXY_UPSTREAM = `http://127.0.0.1:${upstream.address().port}`;
    delete process.env.CACHE_FIX_COALESCE_SIDECAR;
    handle = await startProxy({ port: 0, watch: false, extensionsDir: extDir });
  });

  after(async () => {
    await handle.close();
    await new Promise((r) => upstream.close(r));
    delete process.env.CACHE_FIX_PROXY_UPSTREAM;
    await rm(extDir, { recursive: true, force: true });
  });

  it("without the gate the duplicate still reaches upstream — the pre-fix behaviour, pinned", async () => {
    counter.calls = 0;
    const a = clientRequest(handle.port, SIDECAR);
    await new Promise((r) => setTimeout(r, 15));
    const b = clientRequest(handle.port, SIDECAR);
    await Promise.all([a, b]);

    assert.equal(counter.calls, 2,
      "this is the RED baseline: the same input under the shipped-but-disabled build double-bills");
  });
});
