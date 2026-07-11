/**
 * The live badge in the poster annotations claims to compute the proof —
 * so its palette resolution must cover EVERY proof pair, or the badge
 * silently computes over a subset (i.e. it lies while the build stays
 * green). Pinned here, plus sanity on the worst-pair search itself.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  worstPair,
  unresolvedPairs,
} from "../src/lib/live-contrast.ts";
import { PAIRS } from "../src/lib/color-math.js";

test("palette resolution covers every proof pair, both themes", () => {
  assert.deepEqual(unresolvedPairs("light"), []);
  assert.deepEqual(unresolvedPairs("dark"), []);
});

test("worstPair returns a real pair from PAIRS with a finite ratio", () => {
  for (const theme of ["light", "dark"]) {
    const worst = worstPair(theme, 220);
    assert.ok(Number.isFinite(worst.ratio), "ratio is finite");
    assert.ok(
      PAIRS.some(([fg, bg]) => fg === worst.fg && bg === worst.bg),
      `(${worst.fg}, ${worst.bg}) is a proof pair`,
    );
    assert.ok(worst.min === 3 || worst.min === 4.5);
  }
});

test("AA holds at the default hue — matches the build-time proof", () => {
  // The contrast proof guarantees every pair ≥ its minimum for every hue;
  // the live computation must agree at least at the shipped default.
  assert.ok(worstPair("light", 220).margin >= 1);
  assert.ok(worstPair("dark", 220).margin >= 1);
});

test("worstPair is deterministic and hue-sensitive where expected", () => {
  const a = worstPair("light", 90);
  const b = worstPair("light", 90);
  assert.deepEqual(a, b);
  // Identical inputs across themes must not be conflated.
  assert.notDeepEqual(worstPair("light", 220), worstPair("dark", 220));
});
