import assert from "node:assert/strict";
import test from "node:test";
import { selectedNumbers } from "./capture-selection.mjs";

test("an empty step filter selects every step instead of the nonexistent step zero", () => {
  assert.deepEqual([...selectedNumbers("")], []);
});

test("a comma-separated step filter keeps only valid integers", () => {
  assert.deepEqual([...selectedNumbers("2, 7, nope, 16")], [2, 7, 16]);
});
