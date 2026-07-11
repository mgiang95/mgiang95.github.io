/**
 * Live contrast math for the runtime theming: resolves the semantic color
 * files to L/C steps once, then finds the most critical proven pair at a
 * given hue. Shared by the ThemePanel island and the poster's annotation
 * badge — one source, like color-math.js underneath it.
 */
import { oklchToSrgb, contrast, parseOklch, PAIRS } from "./color-math.js";
// Import attributes so the module also loads under plain Node (tests).
import primitiveColors from "../../tokens/primitives/color.tokens.json" with { type: "json" };
import lightColors from "../../tokens/semantic/color-light.tokens.json" with { type: "json" };
import darkColors from "../../tokens/semantic/color-dark.tokens.json" with { type: "json" };

export type ThemeName = "light" | "dark";

interface Step {
  L: number;
  C: number;
}

/** Resolves one semantic color file to L/C steps, keyed by "group.name". */
function resolvePalette(semantic: typeof lightColors) {
  const palette: Record<string, Step> = {};
  const ramps = primitiveColors.color as Record<
    string,
    Record<string, { $value?: string }>
  >;
  for (const [group, tokens] of Object.entries(semantic.color)) {
    for (const [name, token] of Object.entries(tokens)) {
      if (name.startsWith("$") || typeof token === "string") continue;
      const ref = (token as { $value: string }).$value;
      const [, ramp, step] = ref.replace(/[{}]/g, "").split(".");
      const value = ramps[ramp]?.[step]?.$value;
      const parsed = value ? parseOklch(value) : null;
      if (parsed) palette[`${group}.${name}`] = parsed;
    }
  }
  return palette;
}

const palettes: Record<ThemeName, Record<string, Step>> = {
  light: resolvePalette(lightColors),
  dark: resolvePalette(darkColors),
};

export interface WorstPair {
  ratio: number;
  min: number;
  margin: number;
  fg: string;
  bg: string;
}

/**
 * Proof-pairs whose tokens did NOT resolve to palette steps — must be
 * empty, or the live badge silently computes over a subset of the proof
 * (i.e. it lies). Asserted by the test suite.
 */
export function unresolvedPairs(theme: ThemeName): string[] {
  const palette = palettes[theme];
  return PAIRS.flatMap(([fg, bg]) =>
    [fg, bg].filter((name) => !palette[name]),
  );
}

/**
 * Most critical pair at the given hue: the one with the smallest headroom
 * over ITS OWN requirement (text pairs need 4.5:1, non-text UI 3:1).
 */
export function worstPair(theme: ThemeName, hue: number): WorstPair {
  const palette = palettes[theme];
  let worst: WorstPair = {
    ratio: Infinity,
    min: 4.5,
    margin: Infinity,
    fg: "",
    bg: "",
  };
  for (const [fgName, bgName, min] of PAIRS) {
    const fg = palette[fgName];
    const bg = palette[bgName];
    if (!fg || !bg) continue;
    const ratio = contrast(
      oklchToSrgb(fg.L, fg.C, hue),
      oklchToSrgb(bg.L, bg.C, hue),
    );
    const margin = ratio / min;
    if (margin < worst.margin)
      worst = { ratio, min, margin, fg: fgName, bg: bgName };
  }
  return worst;
}

/** The effective theme right now (explicit data-theme wins over the OS). */
export function currentTheme(): ThemeName {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark") return explicit;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
