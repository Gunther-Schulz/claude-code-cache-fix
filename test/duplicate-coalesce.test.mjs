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
import { rm } from "node:fs/promises";
import { startProxy, coalesceCandidate, createFanOut } from "../proxy/server.mjs";

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
