/**
 * Design system auditor — the CLAUDE.md architecture invariants as an
 * executable contract instead of prose. A violation fails the build.
 *
 * Token source rules (DTCG JSON in /tokens):
 *   T1  primitives reference nothing
 *   T2  semantic tokens reference primitives only
 *   T3  component tokens reference semantic tokens only
 *   T4  every reference resolves to an existing token
 *
 * Authored CSS rules (components, pages, layouts, global base styles):
 *   C1  no color literals (hex, rgb, hsl, oklch) — colors come from tokens
 *   C2  no px lengths except 1px/2px hairlines (borders, focus rings)
 *   C3  every var(--x) exists in the generated tokens.css (or is defined
 *       in the same file) — a typo'd token must not silently render as
 *       nothing
 *   C4  files in the component layer never consume primitive-tier tokens
 *   C5  class names follow BEM with the component file name as block
 *
 * Component metadata rules (src/components/*.metadata.json):
 *   M1  every component has a co-located metadata file, and every metadata
 *       file has a component — stale metadata is an error, not a leftover
 *   M2  metadata carries the decision fields (description, useCases,
 *       antiPatterns) and its declared token prefixes exist in /tokens
 *
 * Paths come from ds.config.mjs so the same auditor can run in any project
 * that adopts the token package. Run: npm run audit
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import config from "./ds.config.mjs";

const violations = [];
const fail = (file, rule, message) => violations.push({ file, rule, message });

/* ------------------------------------------------------------------ */
/* Token source: tiers, references                                      */
/* ------------------------------------------------------------------ */

/** Flattens a DTCG tree into { dotPath: rawValue } entries. */
function flatten(node, prefix = [], out = {}) {
  if (node && typeof node === "object" && "$value" in node) {
    out[prefix.join(".")] = node.$value;
    return out;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$") || typeof child !== "object" || child === null)
      continue;
    flatten(child, [...prefix, key], out);
  }
  return out;
}

async function loadTier(tier) {
  const dir = path.join(config.tokensDir, tier);
  const tokens = {};
  for (const entry of await readdir(dir)) {
    if (!entry.endsWith(".tokens.json")) continue;
    const file = path.join(dir, entry);
    const flat = flatten(JSON.parse(await readFile(file, "utf8")));
    for (const [dotPath, value] of Object.entries(flat)) {
      // Density/theme variants re-declare the same paths — same tier, fine.
      tokens[dotPath] = { value, file };
    }
  }
  return tokens;
}

const tiers = {
  primitives: await loadTier("primitives"),
  semantic: await loadTier("semantic"),
  component: await loadTier("component"),
};

const allPaths = new Set(
  Object.values(tiers).flatMap((tier) => Object.keys(tier)),
);

/** Extracts "{path.to.token}" references from a raw DTCG value. */
const refsIn = (value) =>
  typeof value === "string"
    ? [...value.matchAll(/\{([^}]+)\}/g)].map((m) => m[1])
    : [];

const REF_RULES = [
  [
    "primitives",
    () => false,
    "T1",
    "primitives must not reference other tokens",
  ],
  [
    "semantic",
    (ref) => ref in tiers.primitives,
    "T2",
    "semantic tokens may only reference primitives",
  ],
  [
    "component",
    (ref) => ref in tiers.semantic,
    "T3",
    "component tokens may only reference semantic tokens",
  ],
];

for (const [tierName, allowed, rule, message] of REF_RULES) {
  for (const [dotPath, { value, file }] of Object.entries(tiers[tierName])) {
    for (const ref of refsIn(value)) {
      if (!allPaths.has(ref)) {
        fail(file, "T4", `${dotPath} references unknown token {${ref}}`);
      } else if (!allowed(ref)) {
        fail(file, rule, `${dotPath} -> {${ref}}: ${message}`);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Authored CSS                                                         */
/* ------------------------------------------------------------------ */

const toCssVar = (dotPath) => `--${dotPath.replaceAll(".", "-")}`;
const primitiveVars = new Set(Object.keys(tiers.primitives).map(toCssVar));

const generated = await readFile(config.generatedCss, "utf8");
const definedVars = new Set(generated.match(/--[a-z0-9-]+(?=\s*:)/g) ?? []);

/** Recursively collects files below a path (or the file itself). */
async function collect(target) {
  if ((await stat(target)).isFile()) return [target];
  const entries = await readdir(target, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((e) => collect(path.join(target, e.name))),
  );
  return files.flat();
}

/**
 * Authored CSS of one file: <style> blocks of .astro, whole .css files,
 * css`` tagged templates of Lit components (.ts).
 */
function cssOf(file, text) {
  if (file.endsWith(".css")) return text;
  if (file.endsWith(".astro")) {
    return [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
      .map((m) => m[1])
      .join("\n");
  }
  if (file.endsWith(".ts")) {
    return [...text.matchAll(/css`([^`]*)`/g)].map((m) => m[1]).join("\n");
  }
  return "";
}

const componentFiles = (await collect(config.componentsDir)).sort();
const appFiles = (await Promise.all(config.appPaths.map(collect)))
  .flat()
  .sort();

function auditCss(file, css, { isComponentLayer }) {
  // C1 — color literals.
  for (const m of css.matchAll(
    /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(/g,
  )) {
    fail(file, "C1", `color literal "${m[0]}" — colors must come from tokens`);
  }

  // C2 — px lengths beyond hairlines.
  for (const m of css.matchAll(/(\d*\.?\d+)px/g)) {
    const n = Number(m[1]);
    if (n > 2)
      fail(
        file,
        "C2",
        `"${m[0]}" — use spacing tokens, px only for 1-2px hairlines`,
      );
  }

  // C3/C4 — custom property usage.
  const localDefs = new Set(css.match(/--[a-z0-9-]+(?=\s*:)/g) ?? []);
  for (const m of css.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)) {
    const name = m[1];
    if (!definedVars.has(name) && !localDefs.has(name)) {
      fail(file, "C3", `var(${name}) is not defined in ${config.generatedCss}`);
    } else if (isComponentLayer && primitiveVars.has(name)) {
      fail(
        file,
        "C4",
        `var(${name}) is a primitive — components consume component/semantic tokens only`,
      );
    }
  }
}

// C5 — BEM block check for component styles.
function auditBem(file, css) {
  const base = path.basename(file).replace(/\.(astro|css|tsx)$/, "");
  const block = base.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  const bem = new RegExp(
    `^${block}(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$`,
  );
  const selectors = css.replace(/\{[^{}]*\}/g, "{}"); // strip declarations
  for (const m of selectors.matchAll(/\.([a-zA-Z][\w-]*)/g)) {
    if (!bem.test(m[1])) {
      fail(
        file,
        "C5",
        `class "${m[1]}" does not follow BEM for block "${block}"`,
      );
    }
  }
}

for (const file of componentFiles) {
  if (!/\.(astro|css|ts)$/.test(file) || file.endsWith(".d.ts")) continue;
  const css = cssOf(file, await readFile(file, "utf8"));
  if (!css) continue;
  auditCss(file, css, { isComponentLayer: true });
  // BEM applies to light-DOM styles; shadow DOM (Lit, .ts) is exempt.
  if (!file.endsWith(".ts")) auditBem(file, css);
}

for (const file of appFiles) {
  if (!/\.(astro|css)$/.test(file)) continue;
  const css = cssOf(file, await readFile(file, "utf8"));
  if (!css) continue;
  auditCss(file, css, { isComponentLayer: false });
}

/* ------------------------------------------------------------------ */
/* Component metadata                                                   */
/* ------------------------------------------------------------------ */

const componentNames = new Set(
  componentFiles
    .filter((f) => /\.(astro|tsx|ts)$/.test(f) && !f.endsWith(".d.ts"))
    .map((f) => path.basename(f).replace(/\.(astro|tsx|ts)$/, "")),
);
const metadataFiles = componentFiles.filter((f) =>
  f.endsWith(".metadata.json"),
);
const metadataNames = new Set(
  metadataFiles.map((f) => path.basename(f).replace(".metadata.json", "")),
);

for (const name of componentNames) {
  if (!metadataNames.has(name)) {
    fail(
      path.join(config.componentsDir, `${name}.metadata.json`),
      "M1",
      `missing metadata for component ${name}`,
    );
  }
}
for (const name of metadataNames) {
  if (!componentNames.has(name)) {
    fail(
      path.join(config.componentsDir, `${name}.metadata.json`),
      "M1",
      `metadata without a component — delete or restore ${name}`,
    );
  }
}

const componentTierPrefixes = new Set(
  Object.keys(tiers.component).map((p) => p.split(".")[0]),
);

for (const file of metadataFiles) {
  let meta;
  try {
    meta = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    fail(file, "M2", `invalid JSON: ${error.message}`);
    continue;
  }
  const name = path.basename(file).replace(".metadata.json", "");
  if (meta.name !== name) fail(file, "M2", `"name" must be "${name}"`);
  if (!meta.description) fail(file, "M2", `"description" is required`);
  if (!meta.usage?.useCases?.length)
    fail(file, "M2", `"usage.useCases" must list at least one use case`);
  if (!Array.isArray(meta.usage?.antiPatterns))
    fail(file, "M2", `"usage.antiPatterns" must be an array (may be empty)`);
  if (!Array.isArray(meta.tokenPrefixes)) {
    fail(
      file,
      "M2",
      `"tokenPrefixes" must be an array ([] = semantic tokens only)`,
    );
  } else {
    for (const prefix of meta.tokenPrefixes) {
      if (!componentTierPrefixes.has(prefix)) {
        fail(
          file,
          "M2",
          `token prefix "${prefix}" does not exist in ${config.tokensDir}/component`,
        );
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Report                                                               */
/* ------------------------------------------------------------------ */

if (violations.length) {
  console.error(`Design system audit: ${violations.length} violation(s)\n`);
  let current;
  for (const v of violations.sort((a, b) => a.file.localeCompare(b.file))) {
    if (v.file !== current) console.error(`${(current = v.file)}`);
    console.error(`  ✘ [${v.rule}] ${v.message}`);
  }
  process.exit(1);
}
console.log(
  `✔ audit passed — ${componentNames.size} components, ` +
    `${allPaths.size} tokens, invariants hold.`,
);
