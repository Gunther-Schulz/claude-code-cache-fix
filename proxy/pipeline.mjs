import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

let registry = [];
let failedExtensions = []; // [{ file, error, lastAttempt }]

// Module-scope monotonic counter for cache-busting dynamic `import()` calls.
// Previously this used `Date.now()`, which collides when two `loadExtensions`
// calls land in the same millisecond — the second `import()` returns the
// already-cached module instead of re-evaluating the file from disk. That
// race surfaced on Node 22's faster ESM loader in CI (proxy-pipeline.test.mjs
// "clears failed entries on a subsequent successful reload" — the test
// rewrites a broken extension to a working one and expects the next load to
// pick it up; on Node 22 the timestamp collided and the broken module came
// back from cache). The counter guarantees a fresh URL per call regardless
// of wall-clock resolution.
let _loadCounter = 0;

export async function loadExtensions(dir, configPath) {
  let config = {};
  try {
    const raw = await readFile(configPath, "utf8");
    config = JSON.parse(raw);
  } catch {}

  const files = await readdir(dir);
  const mjsFiles = files.filter((f) => f.endsWith(".mjs")).sort();

  // Bump once per call so all files loaded in this invocation share a URL
  // suffix, but the next invocation gets a different one — same semantics
  // as the prior `Date.now()` approach, just collision-free.
  const cacheBuster = ++_loadCounter;

  const extensions = [];
  const newlyFailed = [];
  for (const file of mjsFiles) {
    try {
      const mod = await import(pathToFileURL(join(dir, file)).href + "?t=" + cacheBuster);
      const ext = mod.default;
      if (!ext || !ext.name) continue;

      const cfg = config[ext.name];
      const enabled = cfg?.enabled ?? ext.enabled ?? true;
      const order = cfg?.order ?? ext.order ?? 1000;
      // Which of the three layers decided `enabled` — surfaced on /health
      // (BACKLOG "extensions.json is NOT the activation gate") so the loaded
      // set is answerable instead of silently defaulting to on. Config wins
      // outright when present, even when it flips a module's own default
      // (tool-input-normalize: file says `enabled:false`, config says
      // `true` — the config override IS why it runs, so it reports
      // "config", not "module-default").
      const enabledSource = cfg?.enabled !== undefined ? "config" : ext.enabled !== undefined ? "module-default" : "implicit-true";

      if (enabled) {
        // `enabled` is placed after the `...ext` spread so the computed,
        // three-layer-resolved value wins over any literal `enabled` the
        // module itself exports (e.g. tool-input-normalize's own
        // `enabled: false` would otherwise leak through unchanged even
        // though the config override is what actually turned it on).
        extensions.push({ ...ext, order, _file: file, enabled, _enabledSource: enabledSource });
      }
    } catch (err) {
      // Load-bearing observability: this branch is the only signal that the
      // proxy is running with a degraded extension graph. See #196: a Node
      // ESM cache stale-import race silently broke thinking-block-sanitize
      // v2 for 17 hours post-merge before AITL grepped the journal. The
      // [CRITICAL] prefix is harder to miss than the prior [pipeline] one,
      // and the explicit "restart proxy to recover" hint tells the operator
      // what to do — the underlying Node ESM cache problem can't be fixed
      // in-process (you can't evict cached transitive imports), so a full
      // process restart is the only path to recover the extension graph.
      const msg = `[CRITICAL] extension load failed: ${file}: ${err.message} — restart the proxy via your supervisor to recover (in-process reload cannot fix stale ESM cache; see #196)\n`;
      process.stderr.write(msg);
      newlyFailed.push({ file, error: String(err.message || err), lastAttempt: new Date().toISOString() });
    }
  }

  extensions.sort((a, b) => a.order - b.order);
  registry = extensions;
  failedExtensions = newlyFailed;
  return extensions;
}

export function getRegistry() {
  return registry;
}

export function snapshotRegistry() {
  return [...registry];
}

// Exposed for /health and any operator-facing tool that wants to surface
// extension-load failures. Returns a fresh array per call so callers can't
// mutate internal state.
export function getFailedExtensions() {
  return failedExtensions.map((f) => ({ ...f }));
}

// Route scoping: extensions default to messages-only so that adding a new
// route (e.g. /api/claude_cli/bootstrap) doesn't drag every existing
// message-mutating extension onto it — most throw on a null body because
// they were never designed for non-messages traffic. Cross-cutting
// extensions (cache-telemetry, usage-log, …) opt into additional routes
// by declaring an explicit `routes` array on their default export.
//
// If ctx.meta.route is undefined we skip filtering entirely — preserves
// back-compat for callers that don't tag routes (legacy tests, embedders).
function appliesToRoute(ext, route) {
  if (!route) return true;
  const routes = ext.routes || ["messages"];
  return routes.includes(route);
}

export async function runOnRequest(ctx, snapshot) {
  const exts = snapshot || registry;
  const route = ctx.meta?.route;
  for (const ext of exts) {
    if (!ext.onRequest) continue;
    if (!appliesToRoute(ext, route)) continue;
    try {
      const result = await ext.onRequest(ctx);
      if (result && result.skip) return result;
    } catch (err) {
      process.stderr.write(`[pipeline] ${ext.name}.onRequest error: ${err.message}\n`);
    }
  }
  return undefined;
}

export async function runOnResponseStart(ctx, snapshot) {
  const exts = snapshot || registry;
  const route = ctx.meta?.route;
  for (const ext of exts) {
    if (!ext.onResponseStart) continue;
    if (!appliesToRoute(ext, route)) continue;
    try {
      await ext.onResponseStart(ctx);
    } catch (err) {
      process.stderr.write(`[pipeline] ${ext.name}.onResponseStart error: ${err.message}\n`);
    }
  }
}

export async function runOnStreamEvent(ctx, snapshot) {
  const exts = snapshot || registry;
  const route = ctx.meta?.route;
  for (const ext of exts) {
    if (!ext.onStreamEvent) continue;
    if (!appliesToRoute(ext, route)) continue;
    try {
      await ext.onStreamEvent(ctx);
    } catch (err) {
      process.stderr.write(`[pipeline] ${ext.name}.onStreamEvent error: ${err.message}\n`);
    }
  }
}

// Fires INSTEAD of the response hooks, on the one path where there is no
// response of this request's own to hook: a duplicate sidecar send that the
// row 31 mitigation served from another request's in-flight answer. The caller
// is that branch in server.mjs and nothing else.
//
// It exists as a hook rather than as a direct call into request-capture because
// the core must not import one extension by name — the registry is loaded from
// a directory at runtime, and a static import would make the coalescing path
// depend on a file that may not be installed. The cost is thirteen lines that
// mirror the four hooks above exactly.
export async function runOnCoalesced(ctx, snapshot) {
  const exts = snapshot || registry;
  const route = ctx.meta?.route;
  for (const ext of exts) {
    if (!ext.onCoalesced) continue;
    if (!appliesToRoute(ext, route)) continue;
    try {
      await ext.onCoalesced(ctx);
    } catch (err) {
      process.stderr.write(`[pipeline] ${ext.name}.onCoalesced error: ${err.message}\n`);
    }
  }
}

// The MISS twin of the hook above, and it exists for the reason the hit hook
// does not cover: a duplicate sidecar that the row 31 mitigation did NOT serve
// from an in-flight answer is forwarded normally, so it produces an ordinary
// request and an ordinary outcome record and nothing anywhere says a
// coalescing opportunity was seen and lost. Measured 2026-08-18: attributing
// ONE such miss took a hand walk over a 435 MB capture, and the walk could
// still not separate the two ways condition 4 fails — which is the difference
// between two different fixes.
//
// Same registry argument as `runOnCoalesced`: the core must not import an
// extension by name.
export async function runOnCoalesceMiss(ctx, snapshot) {
  const exts = snapshot || registry;
  const route = ctx.meta?.route;
  for (const ext of exts) {
    if (!ext.onCoalesceMiss) continue;
    if (!appliesToRoute(ext, route)) continue;
    try {
      await ext.onCoalesceMiss(ctx);
    } catch (err) {
      process.stderr.write(`[pipeline] ${ext.name}.onCoalesceMiss error: ${err.message}\n`);
    }
  }
}

export async function runOnResponse(ctx, snapshot) {
  const exts = snapshot || registry;
  const route = ctx.meta?.route;
  for (const ext of exts) {
    if (!ext.onResponse) continue;
    if (!appliesToRoute(ext, route)) continue;
    try {
      await ext.onResponse(ctx);
    } catch (err) {
      process.stderr.write(`[pipeline] ${ext.name}.onResponse error: ${err.message}\n`);
    }
  }
}
