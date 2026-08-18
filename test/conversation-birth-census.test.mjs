import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
// The repo's run-root helper, never a raw mkdtemp: every producer gets one
// root per process, removed on exit/throw/signal. The suite guards this
// (`no raw mkdtemp outside tools/tmpdir.mjs`) because leaked run roots once
// filled /tmp and broke unrelated tooling machine-wide.
import { tmpDirSync } from "../tools/tmpdir.mjs";

// Namespace import: the module is new, so a static named import of a
// not-yet-existing export would fail the whole file at ESM link time and the
// red-first split would prove nothing (dev-loop, "Adding a check").
import * as birth from "../tools/conversation-birth-census.mjs";

// The discriminator this tool exists to supply. It replaced a message-count
// guard that admitted 3 of 77 real conversations while every bite stayed
// green — a guard whose failure direction is "the mitigation does not fire"
// is invisible to negative bites, so the POSITIVE case is what must be pinned,
// in the shape real traffic produces.
test("isBirthShape keys on the ASSISTANT TURN, not on a message count", () => {
  const row = (roles) => ({ messages: roles.length, roles, assistants: roles.filter((r) => r === "assistant").length });

  // Both real birth shapes measured on live captures: user/system (43 of 46)
  // and bare user (3 of 46). A count-shaped guard splits these two apart;
  // the semantic one must not.
  assert.equal(birth.isBirthShape(row(["user", "system"])), true);
  assert.equal(birth.isBirthShape(row(["user"])), true);

  // Mid-conversation, including the deep rotation case the preload's own
  // guard exists for.
  assert.equal(birth.isBirthShape(row(["user", "system", "assistant", "user"])), false);
  assert.equal(birth.isBirthShape(row(Array(120).fill("user").map((r, i) => (i % 2 ? "assistant" : r)))), false);

  // The pair that would have caught the original defect: a two-message birth
  // is a birth, and no count threshold separates it from the one-message one.
  assert.notEqual(row(["user", "system"]).messages, row(["user"]).messages);
  assert.equal(birth.isBirthShape(row(["user", "system"])), birth.isBirthShape(row(["user"])));
});

test("foldRequest keeps the FIRST request seen per conversation, never a later one", () => {
  const rows = new Map();
  birth.foldRequest(rows, "conv-a", [{ role: "user" }, { role: "system" }]);
  // A later, deeper request for the same conversation must not overwrite it —
  // the question is what the conversation's first request looked like.
  birth.foldRequest(rows, "conv-a", [{ role: "user" }, { role: "assistant" }, { role: "user" }]);
  assert.equal(rows.get("conv-a").messages, 2);
  assert.equal(rows.get("conv-a").assistants, 0);
});

test("THIRD ANSWER: an unreadable or empty capture dir is COULD-NOT-VERIFY, never a clean zero", async () => {
  const empty = tmpDirSync("birth-census-empty-");
  const res = await birth.census({ captures: empty });
  assert.equal(res.ok, false, "no captures -> could-not-verify");
  assert.match(res.reason, /no capture files/);

  const missing = await birth.census({ captures: join(empty, "nope") });
  assert.equal(missing.ok, false, "a missing dir is could-not-verify too");
});
