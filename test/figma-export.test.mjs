/**
 * The Figma export bakes values Figma cannot express (OKLCH, rem, clamp).
 * A silent mistake here ships wrong colors to design — so the bake
 * functions are pinned to independently verified reference values, and the
 * collision guard behind the plugin's global alias map is exercised.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bakeOklch,
  bakeDimension,
  transform,
  leafPaths,
  assertUniquePaths,
} from "../scripts/build-figma-tokens.mjs";

test("bakeOklch: gamma-encoded, gamut-mapped reference values at hue 220", () => {
  // accent.600 is out of the sRGB gamut at hue 220 — exercises the
  // chroma-reduction path. Reference computed independently.
  assert.equal(bakeOklch("oklch(0.525 0.13 var(--hue))", 220), "#007790");
  assert.equal(bakeOklch("oklch(0.16 0.012 var(--hue))", 220), "#080f11");
  assert.equal(bakeOklch("oklch(1 0 var(--hue))", 220), "#ffffff");
  assert.equal(bakeOklch("oklch(0 0 var(--hue))", 220), "#000000");
});

test("bakeOklch: non-hue-driven values are left to other bakers", () => {
  assert.equal(bakeOklch("oklch(0.5 0.1 220)", 220), null);
  assert.equal(bakeOklch("#ff0000", 220), null);
  assert.equal(bakeOklch("{color.accent.600}", 220), null);
});

test("bakeDimension: rem resolves at the 16px root", () => {
  assert.equal(bakeDimension("1.5rem"), "24px");
  assert.equal(bakeDimension("0.75rem"), "12px");
});

test("bakeDimension: clamp() collapses to its max, then resolves", () => {
  assert.equal(bakeDimension("clamp(2rem, 1.59rem + 1.77vw, 3rem)"), "48px");
  assert.equal(
    bakeDimension("clamp(2.75rem, 2.03rem + 3.09vw, 4.5rem)"),
    "72px",
  );
});

test("bakeDimension: px and non-dimensions pass through untouched", () => {
  assert.equal(bakeDimension("4px"), null);
  assert.equal(bakeDimension("{space.inset.md}"), null);
});

test("transform: bakes leaves, joins arrays, preserves aliases", () => {
  const out = transform(
    {
      color: { $value: "oklch(1 0 var(--hue))", $type: "color" },
      alias: { $value: "{color.accent.600}", $type: "color" },
      stack: { $value: ["A", "B"], $type: "fontFamily" },
    },
    220,
  );
  assert.equal(out.color.$value, "#ffffff");
  assert.equal(out.alias.$value, "{color.accent.600}");
  assert.equal(out.stack.$value, "A, B");
});

test("assertUniquePaths: passes disjoint collections, counts leaves", () => {
  const count = assertUniquePaths({
    primitives: { color: { accent: { 600: { $value: "#007790" } } } },
    semantic: { color: { text: { primary: { $value: "{x}" } } } },
  });
  assert.equal(count, 2);
});

test("assertUniquePaths: fails loud on a cross-collection collision", () => {
  assert.throws(
    () =>
      assertUniquePaths({
        primitives: { space: { 1: { $value: "4px" } } },
        semantic: { space: { 1: { $value: "{space.1}" } } },
      }),
    /collision.*space\/1/,
  );
});

test("leafPaths: slash-joined, deep and stable", () => {
  assert.deepEqual(
    leafPaths({
      a: { b: { $value: 1 }, c: { d: { $value: 2 } } },
    }),
    ["a/b", "a/c/d"],
  );
});
