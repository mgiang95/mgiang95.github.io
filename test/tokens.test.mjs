/**
 * tokens.ts is the DTCG entry point half the site renders through
 * (flattenTokens feeds docs, colophon, tier lists) — pinned against small
 * fixture trees, including the tier classification behind the inspector.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  flattenTokens,
  referenceToCssVar,
  classifyTier,
  buildTiers,
  ACCENT_RAMP_STEPS,
} from "../src/lib/tokens.ts";

const tree = {
  color: {
    $description: "group descriptions are not tokens",
    accent: {
      600: { $value: "oklch(0.525 0.13 var(--hue))", $type: "color" },
    },
    text: {
      primary: {
        $value: "{color.accent.600}",
        $type: "color",
        $description: "aliased",
      },
    },
  },
  stack: { $value: ["A", "B"], $type: "fontFamily" },
};

test("flattenTokens: dot paths, css vars, values and types", () => {
  const flat = flattenTokens(tree);
  assert.deepEqual(
    flat.map((t) => t.path),
    ["color.accent.600", "color.text.primary", "stack"],
  );
  const primary = flat[1];
  assert.equal(primary.cssVar, "--color-text-primary");
  assert.equal(primary.value, "{color.accent.600}");
  assert.equal(primary.description, "aliased");
  assert.equal(flat[2].value, "A, B", "array values join for display");
});

test("flattenTokens: $-keys never leak into paths", () => {
  for (const t of flattenTokens(tree)) {
    assert.ok(!t.path.includes("$"), t.path);
  }
});

test("referenceToCssVar rewrites DTCG aliases to var()", () => {
  assert.equal(
    referenceToCssVar("{color.accent.600}"),
    "var(--color-accent-600)",
  );
  assert.equal(
    referenceToCssVar("1px solid {color.border.default}"),
    "1px solid var(--color-border-default)",
  );
});

test("classifyTier maps /tokens paths to tiers", () => {
  assert.equal(classifyTier("../../tokens/primitives/color.tokens.json"), "primitive");
  assert.equal(classifyTier("../../tokens/semantic/motion.tokens.json"), "semantic");
  assert.equal(classifyTier("../../tokens/component/button.tokens.json"), "component");
});

test("buildTiers dedupes variant re-declarations within a tier", () => {
  const semanticColor = {
    color: { text: { primary: { $value: "{x}", $type: "color" } } },
  };
  const tiers = buildTiers([
    ["tokens/semantic/color-light.tokens.json", semanticColor],
    ["tokens/semantic/color-dark.tokens.json", semanticColor],
    ["tokens/primitives/color.tokens.json", tree.color.accent
      ? { color: { accent: tree.color.accent } }
      : {}],
  ]);
  assert.deepEqual(tiers.semantic, ["--color-text-primary"]);
  assert.deepEqual(tiers.primitive, ["--color-accent-600"]);
  assert.deepEqual(tiers.component, []);
});

test("ACCENT_RAMP_STEPS is the ordered 11-step ramp", () => {
  assert.equal(ACCENT_RAMP_STEPS.length, 11);
  assert.deepEqual([...ACCENT_RAMP_STEPS], [...ACCENT_RAMP_STEPS].sort((a, b) => a - b));
});
