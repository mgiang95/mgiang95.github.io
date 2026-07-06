/**
 * Contrast proof: every semantic text/surface pair must meet WCAG AA for
 * EVERY hue (0-359), in both themes. The ramps use fixed L/C steps, so this
 * script is the construction-time guarantee behind the runtime hue slider.
 *
 * Re-run whenever an L/C step or a semantic color mapping changes:
 *   npm run check:contrast
 */
import { readFile } from "node:fs/promises";

/* ---------- OKLCH -> sRGB (CSS Color 4 math) ---------- */

function oklchToOklab(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  return [L, C * Math.cos(h), C * Math.sin(h)];
}

function oklabToLinearSrgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb) => rgb.every((c) => c >= -1e-6 && c <= 1 + 1e-6);

/**
 * CSS-style gamut mapping: keep L and hue, reduce chroma until the color
 * fits into sRGB (binary search). Matches what browsers render closely
 * enough for a contrast proof.
 */
function oklchToSrgb(L, C, h) {
  let rgb = oklabToLinearSrgb(...oklchToOklab(L, C, h));
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      rgb = oklabToLinearSrgb(...oklchToOklab(L, mid, h));
      if (inGamut(rgb)) lo = mid;
      else hi = mid;
    }
    rgb = oklabToLinearSrgb(...oklchToOklab(L, lo, h));
  }
  return rgb.map((c) => Math.min(1, Math.max(0, c)));
}

/* ---------- WCAG 2.x contrast ---------- */

function relativeLuminance([r, g, b]) {
  // Inputs are linear-light sRGB already, so no gamma decoding needed.
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/* ---------- Token loading ---------- */

async function loadJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const primitives = await loadJson("tokens/primitives/color.tokens.json");

/** Parse "oklch(<l> <c> var(--hue))" from a primitive token value. */
function rampStep(ref) {
  // ref like "{color.accent.600}"
  const [, group, step] = ref.replace(/[{}]/g, "").split(".");
  const value = primitives.color[group][step].$value;
  const m = value.match(/oklch\(([\d.]+) ([\d.]+) var\(--hue\)\)/);
  if (!m) throw new Error(`Cannot parse primitive ${ref}: ${value}`);
  return { L: Number(m[1]), C: Number(m[2]), name: `${group}.${step}` };
}

async function semanticColors(file) {
  const json = await loadJson(`tokens/semantic/${file}`);
  const flat = {};
  for (const [group, tokens] of Object.entries(json.color)) {
    for (const [name, token] of Object.entries(tokens)) {
      if (name.startsWith("$")) continue;
      flat[`${group}.${name}`] = rampStep(token.$value);
    }
  }
  return flat;
}

/* ---------- Pairs under proof ---------- */

// [foreground, background, minimum ratio]
// 4.5 = AA body text, 3 = AA large text / non-text UI.
const PAIRS = [
  ["text.primary", "surface.default", 4.5],
  ["text.primary", "surface.raised", 4.5],
  ["text.primary", "surface.sunken", 4.5],
  ["text.secondary", "surface.default", 4.5],
  ["text.secondary", "surface.raised", 4.5],
  ["text.secondary", "surface.sunken", 4.5],
  ["text.muted", "surface.default", 4.5],
  ["text.muted", "surface.raised", 4.5],
  ["text.muted", "surface.sunken", 4.5],
  ["text.on-accent", "surface.accent", 4.5],
  ["text.on-accent", "interactive.default", 4.5],
  ["text.on-accent", "interactive.hover", 4.5],
  ["text.on-accent", "interactive.active", 4.5],
  ["interactive.default", "surface.default", 4.5],
  ["interactive.default", "surface.raised", 4.5],
  ["border.strong", "surface.default", 3],
];

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
