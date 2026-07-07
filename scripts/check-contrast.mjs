/**
 * Contrast proof: every semantic text/surface pair must meet WCAG AA for
 * EVERY hue (0-359), in both themes. The ramps use fixed L/C steps, so this
 * script is the construction-time guarantee behind the runtime hue slider.
 *
 * Color math and the pair list live in src/lib/color-math.js (shared with
 * the live contrast badge in the ThemePanel island).
 *
 * Re-run whenever an L/C step or a semantic color mapping changes:
 *   npm run check:contrast
 */
import { readFile } from "node:fs/promises";
import {
  oklchToSrgb,
  contrast,
  parseOklch,
  PAIRS,
} from "../src/lib/color-math.js";
import config from "./ds.config.mjs";

async function loadJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const primitives = await loadJson(
  `${config.tokensDir}/primitives/color.tokens.json`,
);

/** Resolve a reference like "{color.accent.600}" to its L/C step. */
function rampStep(ref) {
  const [, group, step] = ref.replace(/[{}]/g, "").split(".");
  const value = primitives.color[group][step].$value;
  const parsed = parseOklch(value);
  if (!parsed) throw new Error(`Cannot parse primitive ${ref}: ${value}`);
  return { ...parsed, name: `${group}.${step}` };
}

async function semanticColors(file) {
  const json = await loadJson(`${config.tokensDir}/semantic/${file}`);
  const flat = {};
  for (const [group, tokens] of Object.entries(json.color)) {
    for (const [name, token] of Object.entries(tokens)) {
      if (name.startsWith("$")) continue;
      flat[`${group}.${name}`] = rampStep(token.$value);
    }
  }
  return flat;
}

const themes = {
  light: await semanticColors("color-light.tokens.json"),
  dark: await semanticColors("color-dark.tokens.json"),
};

let failures = 0;
console.log("Contrast proof: all pairs x hues 0-359 x light/dark\n");

for (const [theme, colors] of Object.entries(themes)) {
  for (const [fgName, bgName, min] of PAIRS) {
    const fg = colors[fgName];
    const bg = colors[bgName];
    let worst = { ratio: Infinity, hue: -1 };
    for (let hue = 0; hue < 360; hue++) {
      const ratio = contrast(
        oklchToSrgb(fg.L, fg.C, hue),
        oklchToSrgb(bg.L, bg.C, hue),
      );
      if (ratio < worst.ratio) worst = { ratio, hue };
    }
    const ok = worst.ratio >= min;
    if (!ok) failures++;
    console.log(
      `${ok ? "✔" : "✘"} [${theme}] ${fgName} (${fg.name}) on ${bgName} (${bg.name})` +
        ` — min ${worst.ratio.toFixed(2)}:1 @ hue ${worst.hue} (needs ${min}:1)`,
    );
  }
}

if (failures) {
  console.error(`\n${failures} pair(s) below AA. Adjust L/C steps or mappings.`);
  process.exit(1);
}
console.log("\nAll pairs pass WCAG AA for every hue.");
