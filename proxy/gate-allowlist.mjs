// Which CACHE_FIX_* values may be published, and the rule for everything else.
//
// TWO CONSUMERS, one definition: `/health`'s `gates` object and the capture
// corpus's boot record. Both existed to answer one question — "which gates was
// this proxy actually running with" — and both answered it by dumping every
// CACHE_FIX_* variable with its VALUE. That is more than the question needs and
// more than is safe to publish: `/health` is served to anything that can reach
// the port, and a capture file is the artifact most likely to be attached to a
// bug report or replayed on another machine.
//
// The environment is not a uniform population. Of the ~117 CACHE_FIX_* names
// this codebase reads, the switches are inert to publish ("1", "on", a byte
// budget) while others carry an OAuth client id, a token endpoint, a
// credentials path, the upstream URL, a command line, and a dozen filesystem
// paths that describe the operator's machine. A dump cannot tell them apart.
//
// SO THE DEFAULT IS NAME-ONLY, and that is the load-bearing decision here.
// An allowlisted key is published as `KEY: value`. Everything else is
// published as its NAME with a `<redacted>` marker — the reader still learns
// that the variable is set, which is what provenance needs, and learns nothing
// about what it is set to. A new CACHE_FIX_* variable added tomorrow is
// therefore safe on the day it is added, without anyone remembering this file
// exists. Redaction lists fail the other way round: they cover the hazards
// someone enumerated and ship the unanticipated one by default.
//
// The allowlist below is the set whose VALUE answers the gates question — the
// pipeline switches and the numeric budgets that change behaviour. It contains
// no path, no URL, no command, no credential, and no free-form pattern, and a
// key of any of those kinds must not be added to it.

export const PUBLISHABLE_GATES = new Set([
  // Pipeline switches (the production set in cache-fix-proxy.service).
  // FORK ADDITION 2026-08-16 (upstream merge): CACHE_FIX_COALESCE_SIDECAR is
  // this fork's row-31 sidecar-coalescing gate. It is in the serving unit's
  // Environment= set and in /health, so without it here the boot record would
  // carry it as `<redacted>` and a replay could no longer reproduce the
  // configuration that was SERVING — which is the one property the boot
  // record's gates field exists to give. It is a boolean switch ("1"), the
  // same character as every other name in this block: no path, no URL, no
  // credential. Derived, not guessed: the fork's proxy source references 113
  // distinct CACHE_FIX_* names and this is the ONLY one of the 12 serving
  // gates that the upstream allowlist did not already cover.
  "CACHE_FIX_COALESCE_SIDECAR",
  // FORK ADDITION 2026-08-16, and the SECOND instance of exactly the shape the
  // paragraph above describes — which is why it is written out rather than
  // added silently. `CACHE_FIX_PREFIXDIFF_CONTENT` is the content-minimization
  // gate this fork ports from upstream and then opts INTO on the serving unit.
  // Unlisted, `/health` published it as `<redacted>`, and the doctor's
  // three-way gate compare (ship-runbook step 7) read declared `"1"` against
  // published `<redacted>` and FAILED — telling its reader "unit changed
  // without a restart" about a process that had just been restarted. Measured
  // live the day the gate shipped. A gate the deployment deliberately turns ON
  // has to publish its VALUE or nothing downstream can reproduce the serving
  // configuration, which is the one property this object exists to give. Same
  // character as its neighbours: a boolean switch, no path, no URL, no
  // credential, no free-form pattern.
  "CACHE_FIX_PREFIXDIFF_CONTENT",
  // FORK ADDITION 2026-08-18 — the row-6 step-(b) tool preload gate
  // (`deferred-tool-rewrite`). Listed here BEFORE any unit turns it on, and
  // the shape of the gate was decided by this file: it started life as a
  // comma-separated NAME LIST, which the paragraph above forbids (a free-form
  // value), so it became a BOOLEAN ("1") with the preload set moved into a
  // source constant — `PRELOAD_TOOL_NAMES` in the extension, each name
  // carrying its measured evidence, which is more than an env string could
  // ever say. Same character as its neighbours: a boolean switch, no path, no
  // URL, no credential, no free-form pattern. Unlisted, a serving unit that
  // set it would publish `<redacted>` to /health and the doctor's three-way
  // DECLARED/RUNNING/VERIFIED compare would fail naming the wrong cause —
  // measured live on CACHE_FIX_PREFIXDIFF_CONTENT above.
  "CACHE_FIX_TOOL_PRELOAD",
  "CACHE_FIX_FORWARD_PROXY",
  "CACHE_FIX_INSERTION_NORMALIZE",
  "CACHE_FIX_OUTPUT_GUARD",
  "CACHE_FIX_PREFIXDIFF",
  "CACHE_FIX_REQUEST_CAPTURE",
  "CACHE_FIX_SESSION_MIRROR",
  "CACHE_FIX_TOOL_REWRITE",
  "CACHE_FIX_UPSTREAM_DETECTION",
  "CACHE_FIX_UPSTREAM_ERROR_LOG",
  "CACHE_FIX_VOLATILE_PIN",
  // Further behaviour switches, same character.
  "CACHE_FIX_AUTO_1M_GUARD",
  "CACHE_FIX_BOOTSTRAP_MODE",
  "CACHE_FIX_DEBUG",
  "CACHE_FIX_DISABLED",
  "CACHE_FIX_HOT_RELOAD",
  "CACHE_FIX_IMAGE_GUARD",
  "CACHE_FIX_IMAGE_RETRY_BREAKER",
  "CACHE_FIX_NORMALIZE_CC_VERSION",
  "CACHE_FIX_NORMALIZE_MICROCOMPACT",
  "CACHE_FIX_OAUTH_REFRESH",
  "CACHE_FIX_OVERAGE_WARNING",
  "CACHE_FIX_READ_DEDUPE",
  "CACHE_FIX_REQUEST_LOG",
  "CACHE_FIX_SESSION_BUDGET",
  "CACHE_FIX_THINKING_DISPLAY",
  "CACHE_FIX_THINKING_RISK",
  "CACHE_FIX_THINKING_SANITIZE",
  "CACHE_FIX_USAGE_LOG",
  "CACHE_FIX_WIRED_BY_LAUNCHER",
  "CACHE_FIX_WORKFLOW_AGENT_DERIVATION",
  // Numeric budgets and limits — a size, never an identifier.
  "CACHE_FIX_CAPTURE_MAX_MB",
  "CACHE_FIX_IMAGE_COUNT_MAX",
  "CACHE_FIX_IMAGE_KEEP_LAST",
  "CACHE_FIX_IMAGE_MAX_DIM",
  "CACHE_FIX_IMAGE_REQUEST_SIZE_MAX",
  "CACHE_FIX_PROXY_PORT",
  "CACHE_FIX_PROXY_TIMEOUT",
  "CACHE_FIX_SESSION_BUDGET_TOKENS",
  "CACHE_FIX_TTL_MAIN",
  "CACHE_FIX_TTL_SUBAGENT",
]);

export const REDACTED = "<redacted>";

/**
 * The publishable view of the CACHE_FIX_* environment: allowlisted keys with
 * their values, every other CACHE_FIX_* key present by NAME with its value
 * replaced by `REDACTED`. Sorted, so two boot records or two /health reads are
 * comparable byte-for-byte.
 *
 * `skip` drops keys entirely — used for CACHE_FIX_PROXY_TREE, which the boot
 * record already carries as its own field.
 */
export function publishableGates(env = process.env, { skip = [] } = {}) {
  const skipSet = new Set(skip);
  const out = {};
  for (const key of Object.keys(env).sort((a, b) => a.localeCompare(b))) {
    if (!key.startsWith("CACHE_FIX_") || skipSet.has(key)) continue;
    out[key] = PUBLISHABLE_GATES.has(key) ? env[key] : REDACTED;
  }
  return out;
}
