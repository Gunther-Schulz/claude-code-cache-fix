// append-queue — serialize concurrent appends to the same file path.
//
// node's fs.appendFile is not atomic across concurrent async callers: for
// large buffers it splits the write into multiple write() syscalls, so two
// concurrent appends to the same path can interleave mid-buffer and land as
// a torn, unparseable line in an NDJSON file (flap probe fact 4: 5 pairs of
// torn ~1MB lines in s-captureC). This queues appends per absolute path so
// each path's writes execute strictly one after another; different paths
// are never serialized against each other.
//
// Not an extension — a primitive, same status as message-hash.mjs. Any
// extension appending to a file another caller might also be appending to
// concurrently should route through here.

const chains = new Map(); // absolute path -> tail Promise of that path's chain

// Queue `fs.appendFile(path, data)` behind whatever is already queued for
// `path`. A prior caller's rejection must not poison later callers on the
// same path — each append either succeeds or fails on its own, exactly as
// bare appendFile would, just strictly ordered.
// `opts` is forwarded to `fs.appendFile` when given — callers writing
// conversation-derived state pass `{ mode: 0o600 }` so a file this queue
// creates is owner-only from birth (see write-owner-only.mjs).
export function queuedAppend(path, data, fs, opts) {
  if (typeof fs?.appendFile !== "function") {
    throw new TypeError("queuedAppend requires fs.appendFile");
  }
  const prior = chains.get(path) || Promise.resolve();
  const next = prior
    .catch(() => {})
    .then(() => (opts ? fs.appendFile(path, data, opts) : fs.appendFile(path, data)));
  chains.set(path, next);
  // Drop the entry once it drains, so the map does not grow unbounded over
  // the life of the process. Guarded: only delete if nothing chained after us.
  // Branched off `next` with its own catch so this cleanup does not surface
  // an unhandled rejection when `next` itself rejects — the rejection is
  // still delivered to whoever awaits the returned `next` promise.
  next
    .catch(() => {})
    .finally(() => {
      if (chains.get(path) === next) chains.delete(path);
    });
  return next;
}
