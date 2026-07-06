/**
 * Token build: DTCG JSON (/tokens) -> CSS custom properties (src/styles/tokens.css).
 *
 * Four Style Dictionary runs share the primitives but emit different scopes:
 *   :root                    primitives + semantic (light, normal density) + component
 *   [data-theme="dark"]      semantic color overrides
 *   [data-density="tight"]   semantic spacing overrides
 *   [data-density="comfy"]   semantic spacing overrides
 *
 * Light/normal are the defaults on :root so the site works without JS.
 */
import StyleDictionary from "style-dictionary";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";

const BUILD_DIR = ".tokens-build";
const OUT_FILE = "src/styles/tokens.css";

// Shared transforms: kebab-case names, CSS-ready fontFamily/cubicBezier values.
const TRANSFORMS = ["name/kebab", "fontFamily/css", "cubicBezier/css"];

/** @returns one Style Dictionary run writing a single CSS file */
function run({ source, include = [], file, selector, filter }) {
  return new StyleDictionary({
    source,
    include,
    platforms: {
      css: {
        transforms: TRANSFORMS,
        buildPath: `${BUILD_DIR}/`,
        files: [
          {
            destination: file,
            format: "css/variables",
            filter,
            options: { selector, outputReferences: true },
          },
        ],
      },
    },
    // Override runs reference primitives that are (intentionally) only
    // emitted in :root — silence the resulting filtered-reference warning.
    log: { warnings: filter ? "disabled" : "warn" },
  }).buildAllPlatforms();
}

const overrideOnly = (needle) => (token) => token.filePath.includes(needle);

await rm(BUILD_DIR, { recursive: true, force: true });
await mkdir(BUILD_DIR, { recursive: true });

await run({
  source: [
    "tokens/primitives/*.tokens.json",
    "tokens/semantic/color-light.tokens.json",
    "tokens/semantic/space-normal.tokens.json",
    "tokens/semantic/shape.tokens.json",
    "tokens/semantic/typography.tokens.json",
    "tokens/component/*.tokens.json",
  ],
  file: "base.css",
  selector: ":root",
});

await run({
  source: ["tokens/semantic/color-dark.tokens.json"],
  include: ["tokens/primitives/*.tokens.json"],
  file: "dark.css",
  selector: '[data-theme="dark"]',
  filter: overrideOnly("color-dark"),
});

await run({
  source: ["tokens/semantic/space-tight.tokens.json"],
  include: ["tokens/primitives/*.tokens.json"],
  file: "tight.css",
  selector: '[data-density="tight"]',
  filter: overrideOnly("space-tight"),
});

await run({
  source: ["tokens/semantic/space-comfy.tokens.json"],
  include: ["tokens/primitives/*.tokens.json"],
  file: "comfy.css",
  selector: '[data-density="comfy"]',
  filter: overrideOnly("space-comfy"),
});

const banner = `/**
 * GENERATED FILE — do not edit by hand.
 * Source of truth: /tokens (DTCG JSON). Rebuild with \`npm run tokens\`.
 */
`;
const parts = await Promise.all(
  ["base.css", "dark.css", "tight.css", "comfy.css"].map((f) =>
    readFile(path.join(BUILD_DIR, f), "utf8"),
  ),
);
// Strip the per-file timestamp headers SD prepends, keep one banner.
const stripped = parts.map((css) => css.replace(/^\/\*\*[\s\S]*?\*\/\n*/, ""));

// System preference as no-JS default: repeat the dark overrides inside a
// prefers-color-scheme media query, scoped so an explicit data-theme wins.
const systemDark =
  "@media (prefers-color-scheme: dark) {\n" +
  stripped[1].replace('[data-theme="dark"]', ':root:not([data-theme="light"])') +
  "}\n";

await mkdir(path.dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, banner + "\n" + [...stripped, systemDark].join("\n"));
await rm(BUILD_DIR, { recursive: true, force: true });

console.log(`✔ tokens built -> ${OUT_FILE}`);
