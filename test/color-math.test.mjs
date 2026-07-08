/**
 * Guards the guard: color-math.js backs both the build-time contrast proof
 * and the live badge. A bug here would produce false "AA passes" claims, so
 * its output is pinned to hand-verifiable reference values.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  oklchToSrgb,
  contrast,
  parseOklch,
  PAIRS,
} from "../src/lib/color-math.js";

const approx = (a, b, eps = 1e-3) =>
  assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b} (±${eps})`);

test("contrast: black on white is the WCAG maximum 21:1", () => {
  approx(contrast([0, 0, 0], [1, 1, 1]), 21);
});

test("contrast: identical colors are 1:1", () => {
  approx(contrast([1, 1, 1], [1, 1, 1]), 1);
  approx(contrast([0.3, 0.3, 0.3], [0.3, 0.3, 0.3]), 1);
});

test("contrast: symmetric in argument order", () => {
  const a = [0.1, 0.2, 0.3];
  const b = [0.8, 0.7, 0.6];
  approx(contrast(a, b), contrast(b, a));
});

test("oklchToSrgb: L=1 maps to white, L=0 to black", () => {
  const white = oklchToSrgb(1, 0, 220);
  white.forEach((c) => approx(c, 1));
  const black = oklchToSrgb(0, 0, 220);
  black.forEach((c) => approx(c, 0));
});

test("oklchToSrgb: always returns in-gamut [0,1] channels", () => {
  for (let h = 0; h < 360; h += 30) {
    // High chroma at mid lightness forces the gamut-mapping branch.
    for (const c of oklchToSrgb(0.6, 0.4, h)) {
      assert.ok(c >= 0 && c <= 1, `channel ${c} in [0,1] at hue ${h}`);
    }
  }
});

test("oklchToSrgb: a neutral grey is achromatic (r≈g≈b)", () => {
  const [r, g, b] = oklchToSrgb(0.5, 0, 120);
  approx(r, g);
  approx(g, b);
});

test("parseOklch: reads L and C from a primitive value", () => {
  assert.deepEqual(parseOklch("oklch(0.62 0.14 var(--hue))"), {
    L: 0.62,
    C: 0.14,
  });
});

test("parseOklch: returns null for non-hue-driven values", () => {
  assert.equal(parseOklch("oklch(0.5 0.1 220)"), null);
  assert.equal(parseOklch("#ff0000"), null);
});

test("PAIRS: well-formed [fg, bg, min] triples with sane minimums", () => {
  assert.ok(PAIRS.length > 0);
  for (const [fg, bg, min] of PAIRS) {
    assert.equal(typeof fg, "string");
    assert.equal(typeof bg, "string");
    assert.ok(min === 3 || min === 4.5, `min ${min} is an AA threshold`);
  }
});
