/**
 * Blog metadata is computed, not tracked — so the computation is what needs
 * to be correct. (Imported via Node's type stripping; see the test script.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readingTime, formatDate } from "../src/lib/blog.ts";

test("readingTime: rounds ~200 wpm and never returns below 1", () => {
  assert.equal(readingTime(""), 1);
  assert.equal(readingTime("one two three"), 1);
  assert.equal(readingTime(Array(200).fill("word").join(" ")), 1);
  assert.equal(readingTime(Array(500).fill("word").join(" ")), 3);
});

test("readingTime: ignores extra whitespace between words", () => {
  assert.equal(readingTime("a\n\n  b \t c"), 1);
});

test("formatDate: renders a stable en-US medium date", () => {
  assert.equal(formatDate(new Date("2026-07-08T00:00:00Z")), "Jul 8, 2026");
});
