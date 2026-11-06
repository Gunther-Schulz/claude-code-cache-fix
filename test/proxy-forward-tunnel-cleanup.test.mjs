import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import { once } from "node:events";
import { rmSync } from "node:fs";
import { tmpDirSync } from "../tools/tmpdir.mjs";
import { setTimeout as sleep } from "node:timers/promises";
import { attachForwardProxy } from "../proxy/forward-proxy.mjs";

async function fixture(t, viaProxy, respond) {
  const keys = ["CACHE_FIX_CA_DIR", "CACHE_FIX_PROXY_UPSTREAM", "CACHE_FIX_DOWNLOAD_REWRITE", "HTTPS_PROXY", "https_proxy"];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const caDir = tmpDirSync("tunnel-cleanup-");
  const sockets = new Set();
  const servers = [];
  const clients = [];
  const track = (socket) => {
    sockets.add(socket);
    socket.on("error", () => {});
    return socket;
  };
  const listen = async (server) => {
    servers.push(server);
    server.on("connection", track);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    return server.address().port;
  };
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    rmSync(caDir, { recursive: true, force: true });
  });
  process.env.CACHE_FIX_CA_DIR = caDir;
  process.env.CACHE_FIX_PROXY_UPSTREAM = "https://mitm.example.test";
  delete process.env.CACHE_FIX_DOWNLOAD_REWRITE;
  delete process.env.HTTPS_PROXY;
  delete process.env.https_proxy;

  const target = net.createServer(respond);
  const targetPort = await listen(target);
  if (viaProxy) {
    const corporate = http.createServer();
    corporate.on("connect", (_req, client) => {
      const upstream = track(net.connect(targetPort, "127.0.0.1", () => {
        client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        upstream.pipe(client);
        client.pipe(upstream);
      }));
      upstream.on("error", () => client.destroy());
      upstream.once("close", () => client.destroySoon());
      client.once("close", () => upstream.destroy());
    });
    process.env.HTTPS_PROXY = `http://127.0.0.1:${await listen(corporate)}`;
  }
  const proxy = http.createServer();
  proxy.on("connection", (socket) => clients.push(socket));
  attachForwardProxy(proxy);
  const proxyPort = await listen(proxy);
  const connect = () => new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1", port: proxyPort, method: "CONNECT",
      path: `127.0.0.1:${targetPort}`, agent: false,
    });
    req.on("error", reject);
    req.on("connect", (res, socket) => {
      track(socket);
      if (res.statusCode !== 200) return reject(new Error(`CONNECT ${res.statusCode}`));
      resolve(socket);
    });
    req.end();
  });
  return { clients, connect };
}

for (const viaProxy of [false, true]) {
  const route = viaProxy ? "corporate proxy" : "direct";
  test(`blind CONNECT (${route}): upstream close releases clients with trailing data`, { timeout: 10000 }, async (t) => {
    const { clients, connect } = await fixture(t, viaProxy, (socket) => {
      socket.once("data", () => socket.end("ok"));
    });
    for (let i = 0; i < 40; i++) {
      const socket = await connect();
      socket.allowHalfOpen = true;
      const closed = once(socket, "close");
      socket.resume();
      // TLS clients can send a close_notify after the upstream has ended.
      socket.once("end", () => socket.end("trailing-close-notify"));
      socket.write("request");
      await closed;
    }
    const deadline = Date.now() + 1000;
    while (clients.some((socket) => !socket.destroyed) && Date.now() < deadline) await sleep(10);
    assert.equal(clients.length, 40);
    assert.equal(clients.filter((socket) => !socket.destroyed).length, 0, "closed tunnels retained client sockets");
  });

  test(`blind CONNECT (${route}): client half-close still receives the full response`, { timeout: 10000 }, async (t) => {
    const body = Buffer.alloc(2 * 1024 * 1024, "x");
    const { connect } = await fixture(t, viaProxy, (socket) => {
      socket.allowHalfOpen = true;
      socket.resume();
      socket.once("end", () => socket.end(body));
    });
    const socket = await connect();
    const chunks = [];
    socket.on("data", (chunk) => chunks.push(chunk));
    const ended = once(socket, "end");
    socket.end("request");
    await ended;
    assert.deepEqual(Buffer.concat(chunks), body, "cleanup truncated the response after a client half-close");
  });
}
