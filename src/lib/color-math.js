/**
 * Shared color math: OKLCH -> sRGB (CSS Color 4) and WCAG 2.x contrast.
 * Used by the build-time contrast proof (scripts/check-contrast.mjs) and the
 * live contrast badge in the ThemePanel island — one source for both.
 * Plain JS with JSDoc so Node can run it directly without a TS toolchain.
 */

/**
 * @param {number} L
 * @param {number} C
 * @param {number} hDeg
 * @returns {[number, number, number]}
 */
function oklchToOklab(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  return [L, C * Math.cos(h), C * Math.sin(h)];
}

/**
 * @param {number} L
 * @param {number} a
 * @param {number} b
 * @returns {[number, number, number]} linear-light sRGB
 */
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

/** @param {[number, number, number]} rgb */
const inGamut = (rgb) => rgb.every((c) => c >= -1e-6 && c <= 1 + 1e-6);

/**
 * CSS-style gamut mapping: keep L and hue, reduce chroma until the color
 * fits into sRGB (binary search). Close enough to browser rendering for a
 * contrast proof.
 * @param {number} L @param {number} C @param {number} h
 * @returns {[number, number, number]} linear-light sRGB, clamped
 */
export function oklchToSrgb(L, C, h) {
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
  return /** @type {[number, number, number]} */ (
    rgb.map((c) => Math.min(1, Math.max(0, c)))
  );
}

/**
 * WCAG 2.x contrast ratio from two linear-light sRGB colors.
 * @param {[number, number, number]} fg
 * @param {[number, number, number]} bg
 */
export function contrast(fg, bg) {
  const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const l1 = lum(fg);
  const l2 = lum(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * Parses a primitive value like "oklch(0.62 0.14 var(--hue))".
 * @param {string} value
 * @returns {{ L: number, C: number } | null}
 */
export function parseOklch(value) {
  const m = value.match(/oklch\(([\d.]+) ([\d.]+) var\(--hue\)\)/);
  return m ? { L: Number(m[1]), C: Number(m[2]) } : null;
}

/**
 * Semantic pairs under contrast proof: [foreground, background, minimum].
 * 4.5 = AA body text, 3 = AA large text / non-text UI.
 * Single source for the build-time proof AND the live badge.
 * @type {ReadonlyArray<readonly [string, string, number]>}
 */
export const PAIRS = [
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
