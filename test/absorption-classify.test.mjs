// absorption-classify's ladder (classifyDelta) — one synthetic pair per
// class, all eight, plus the control that pins the ladder's ORDER rather
// than any single rule: text differing alongside a container flip must
// report TEXT, never CONTAINER, because the text check runs first.

import { test } from "node:test";
import assert from "node:assert/strict";

import { classifyDelta } from "../tools/absorption-classify.mjs";

test("either side null -> ABSENT", () => {
  const { class: cls } = classifyDelta(null, { role: "user", content: "hi" });
  assert.equal(cls, "ABSENT");
  const { class: cls2 } = classifyDelta({ role: "user", content: "hi" }, null);
  assert.equal(cls2, "ABSENT");
});

test("byte-for-byte the same -> IDENTICAL — never swallowed, reported as its own class", () => {
  const a = { role: "user", content: "hi" };
  const b = { role: "user", content: "hi" };
  const { class: cls } = classifyDelta(a, b);
  assert.equal(cls, "IDENTICAL");
});

test("role differs -> ROLE, even when the text is otherwise identical", () => {
  const a = { role: "user", content: "hi" };
  const b = { role: "assistant", content: "hi" };
  const { class: cls } = classifyDelta(a, b);
  assert.equal(cls, "ROLE");
});

test("extracted text differs -> TEXT", () => {
  const a = { role: "user", content: "hello" };
  const b = { role: "user", content: "goodbye" };
  const { class: cls } = classifyDelta(a, b);
  assert.equal(cls, "TEXT");
});

test("text equal, container kind flips string<->array -> CONTAINER — the row-4/349k shape", () => {
  // The measured matrix case (robustness-threat-matrix.md, Row 4 datapoint):
  // a bare string is re-served as a one-element text-block array, inner text
  // byte-identical.
  const a = { role: "system", content: "hello world" };
  const b = { role: "system", content: [{ type: "text", text: "hello world" }] };
  const { class: cls } = classifyDelta(a, b);
  assert.equal(cls, "CONTAINER");
});

test("text and kind equal, JSON differs only inside cache_control -> CACHE-CONTROL", () => {
  const a = { role: "user", content: [{ type: "text", text: "hi", cache_control: { type: "ephemeral" } }] };
  const b = { role: "user", content: [{ type: "text", text: "hi" }] };
  const { class: cls } = classifyDelta(a, b);
  assert.equal(cls, "CACHE-CONTROL");
});

test("text and kind equal, block count differs (an added empty-text block) -> BLOCKS", () => {
  // An empty text block contributes "" to extracted text, so extractText
  // stays equal across the pair while the block array's length does not.
  const a = { role: "assistant", content: [{ type: "text", text: "hi" }] };
  const b = { role: "assistant", content: [{ type: "text", text: "hi" }, { type: "text", text: "" }] };
  const { class: cls } = classifyDelta(a, b);
  assert.equal(cls, "BLOCKS");
});

test("everything the ladder checks is equal, some other top-level key differs -> OTHER, naming the key", () => {
  const a = { role: "user", content: "same text" };
  const b = { role: "user", content: "same text", extra: "surprise" };
  const { class: cls, detail } = classifyDelta(a, b);
  assert.equal(cls, "OTHER");
  assert.deepEqual(detail, ["extra"]);
});

test("CONTROL: text differs alongside a container flip -> TEXT, not CONTAINER — the ladder's order is under test", () => {
  const a = { role: "system", content: "hello" };
  const b = { role: "system", content: [{ type: "text", text: "different" }] };
  const { class: cls } = classifyDelta(a, b);
  assert.equal(cls, "TEXT");
});
