/**
 * Figma export: DTCG JSON (/tokens) -> a self-contained Figma plugin that
 * creates the variables directly via the Plugin API.
 *
 * Why a plugin instead of a Tokens Studio import: the free Tokens Studio
 * single-file importer drops sets non-deterministically, and its folder
 * import is Pro-gated. A tiny plugin with the token data embedded is
 * deterministic — no third-party parser, no file picker, no modes.
 *
 * Figma variables cannot express what the CSS pipeline relies on, so a few
 * values are baked to a static snapshot (documented in figma/README.md):
 *   - `var(--hue)` runtime hue  -> baked at ds.config figmaBakedHue
 *   - OKLCH color space         -> sRGB hex
 *   - rem / clamp() dimensions  -> static px (clamp collapses to its max)
 *   - fontFamily stacks         -> a single comma-joined string
 * Aliases (`{path.to.token}`) are preserved and become Figma variable
 * aliases, so the tier chain (component -> semantic -> primitives) stays.
 *
 * No modes: the user does not need Light/Dark or density in Figma, so the
 * canonical variants (color-light, space-normal) collapse into one flat
 * `semantic` collection. Three collections mirror the three token tiers.
 *
 * Re-runnable, no hand-editing of the output. Paths come from ds.config.
 */
import { readFile, readdir, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import config from "./ds.config.mjs";
import { oklchToSrgb, parseOklch } from "../src/lib/color-math.js";

const TOKENS = config.tokensDir;
const PLUGIN_DIR = config.figmaPluginDir;
const HUE = config.figmaBakedHue;

/**
 * Deliberately excluded from the export (documented in figma/README.md):
 * motion tokens (Figma variables cannot drive durations/easings) and the
 * non-canonical mode variants — no modes in Figma, only light/normal ship.
 * Everything else is globbed per tier, so new token files are picked up
 * automatically instead of silently missing from Figma.
 */
const EXCLUDE = new Set([
  "primitives/motion.tokens.json",
  "semantic/motion.tokens.json",
  "semantic/color-dark.tokens.json",
  "semantic/space-tight.tokens.json",
  "semantic/space-comfy.tokens.json",
]);

/** All .tokens.json files of one tier, minus the documented exclusions. */
async function tierFiles(tier) {
  return (await readdir(path.join(TOKENS, tier)))
    .filter((f) => f.endsWith(".tokens.json"))
    .map((f) => `${tier}/${f}`)
    .filter((f) => !EXCLUDE.has(f))
    .sort();
}

/** sRGB transfer function: linear-light channel -> gamma-encoded [0,1]. */
const encode = (c) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

/** @param {number} n */
const hex2 = (n) => Math.round(n * 255).toString(16).padStart(2, "0");

/** Root font size Figma assumes; rem values resolve against it. */
const REM_PX = 16;

/**
 * Bakes an OKLCH primitive value at a fixed hue into an sRGB hex string
 * (gamma-encoded, gamut-mapped like the browser — same math as the
 * contrast proof).
 * @param {string} value e.g. "oklch(0.62 0.14 var(--hue))"
 * @param {number} [hue]
 * @returns {string|null} "#rrggbb" or null if it is not a hue-based OKLCH
 */
export function bakeOklch(value, hue = HUE) {
  const parsed = parseOklch(value);
  if (!parsed) return null;
  const [r, g, b] = oklchToSrgb(parsed.L, parsed.C, hue).map(encode);
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

/**
 * Resolves a dimension to a static px string Figma can store (no rem, no
 * clamp(), no vw): clamp() collapses to its max, rem converts at 16px root.
 * @param {string} value
 * @returns {string|null}
 */
export function bakeDimension(value) {
  let v = value.trim();
  const clamp = v.match(/^clamp\(.+,\s*([^)]+)\)$/);
  if (clamp) v = clamp[1].trim();
  const rem = v.match(/^(-?[\d.]+)rem$/);
  if (rem) return `${Number(rem[1]) * REM_PX}px`;
  return null;
}

/**
 * Walks a DTCG subtree, baking the values Figma cannot express. Aliases,
 * plain px and numbers pass through untouched.
 * @param {any} node
 * @param {number} [hue]
 */
export function transform(node, hue = HUE) {
  if (node === null || typeof node !== "object") return node;
  if ("$value" in node) {
    const out = { ...node };
    if (Array.isArray(node.$value)) {
      out.$value = node.$value.join(", ");
    } else if (typeof node.$value === "string") {
      out.$value =
        bakeOklch(node.$value, hue) ?? bakeDimension(node.$value) ?? node.$value;
    }
    return out;
  }
  const out = {};
  for (const [key, child] of Object.entries(node))
    out[key] = transform(child, hue);
  return out;
}

/** Deep-merges src into target (a collection built from several files). */
function merge(target, src) {
  for (const [key, val] of Object.entries(src)) {
    if (val && typeof val === "object" && !("$value" in val)) {
      target[key] = merge(target[key] ?? {}, val);
    } else {
      target[key] = val;
    }
  }
  return target;
}

/** Slash-joined paths of all token leaves in a tree. */
export function leafPaths(node, segs = [], out = []) {
  for (const [key, child] of Object.entries(node)) {
    if (child && typeof child === "object" && "$value" in child) {
      out.push([...segs, key].join("/"));
    } else if (child && typeof child === "object") {
      leafPaths(child, [...segs, key], out);
    }
  }
  return out;
}

/**
 * Fails loud if a variable path exists in more than one collection: the
 * plugin resolves aliases through one global name map, so a collision
 * would silently bind aliases to the wrong variable.
 * @param {Record<string, object>} data collection name -> token tree
 */
export function assertUniquePaths(data) {
  const seen = new Map();
  for (const [collection, tree] of Object.entries(data)) {
    for (const p of leafPaths(tree)) {
      if (seen.has(p)) {
        throw new Error(
          `variable path collision: "${p}" exists in both "${seen.get(p)}" ` +
            `and "${collection}" — aliases would bind to the wrong variable`,
        );
      }
      seen.set(p, collection);
    }
  }
  return seen.size;
}

/** Builds the three collections and writes the plugin to PLUGIN_DIR. */
async function build() {
  const data = {};
  for (const name of ["primitives", "semantic", "component"]) {
    data[name] = {};
    for (const file of await tierFiles(name)) {
      const raw = JSON.parse(await readFile(path.join(TOKENS, file), "utf8"));
      merge(data[name], transform(raw));
    }
  }

  // Drop `hue`: the runtime slider input, meaningless as a static variable.
  delete data.primitives?.hue;

  const total = assertUniquePaths(data);

  // The plugin logic (static). The token data above is injected as `DATA`.
  const pluginCode = `/**
 * GENERATED by scripts/build-figma-tokens.mjs — do not edit by hand.
 * Rebuild: npm run tokens:figma. Source of truth: /tokens.
 *
 * Syncs three variable collections (primitives, semantic, component) to the
 * embedded DTCG data. Idempotent: existing collections/variables are reused
 * and updated, new ones created, and variables no longer in the tokens are
 * removed — so re-running after a rebuild never duplicates. Aliases ({path})
 * become Figma variable aliases, preserving component -> semantic -> primitives.
 * Values are baked at build time; see figma/README.md for what and why.
 */
const DATA = ${JSON.stringify(data)};
const ORDER = ["primitives", "semantic", "component"];

/** DTCG $type -> Figma resolvedType. */
function figmaType(t) {
  if (t === "color") return "COLOR";
  if (t === "fontFamily") return "STRING";
  return "FLOAT"; // dimension, number, fontWeight
}

/** Flattens a DTCG tree to [{ name: "color/accent/50", type, value }]. */
function flatten(tree) {
  const out = [];
  const walk = (node, segs) => {
    for (const [key, child] of Object.entries(node)) {
      if (child && typeof child === "object" && "$value" in child) {
        out.push({ name: [...segs, key].join("/"), type: child.$type, value: child.$value });
      } else if (child && typeof child === "object") {
        walk(child, [...segs, key]);
      }
    }
  };
  walk(tree, []);
  return out;
}

/** "{color.neutral.50}" -> "color/neutral/50", else null. */
function aliasTarget(value) {
  const m = typeof value === "string" && value.match(/^\\{(.+)\\}$/);
  return m ? m[1].split(".").join("/") : null;
}

/** "#rrggbb" -> { r, g, b, a } in 0..1. */
function hexToRgba(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
    a: 1,
  };
}

(async () => {
  const flat = {};
  const desired = {};
  for (const name of ORDER) {
    flat[name] = flatten(DATA[name]);
    desired[name] = new Set(flat[name].map((t) => t.name));
  }

  const existingCols = await figma.variables.getLocalVariableCollectionsAsync();
  const colByName = {};
  for (const c of existingCols) colByName[c.name] = c;

  // Pass 1: ensure each collection + variable exists (reuse or create). A type
  // change forces a recreate (resolvedType is immutable). byPath is global —
  // variable names are unique across the three collections.
  const byPath = {};
  const preExisting = {}; // collection name -> Map(varName -> Variable) before sync
  for (const name of ORDER) {
    let col = colByName[name];
    if (!col) { col = figma.variables.createVariableCollection(name); colByName[name] = col; }
    const existing = new Map();
    for (const id of col.variableIds) {
      const v = await figma.variables.getVariableByIdAsync(id);
      if (v) existing.set(v.name, v);
    }
    preExisting[name] = existing;
    for (const tok of flat[name]) {
      const wantType = figmaType(tok.type);
      let v = existing.get(tok.name);
      if (v && v.resolvedType !== wantType) { v.remove(); existing.delete(tok.name); v = null; }
      if (!v) v = figma.variables.createVariable(tok.name, col, wantType);
      byPath[tok.name] = v;
    }
  }

  // Pass 2: set values / aliases (all targets exist now, so order is free).
  const missing = [];
  for (const name of ORDER) {
    const mode = colByName[name].modes[0].modeId;
    for (const tok of flat[name]) {
      const v = byPath[tok.name];
      const target = aliasTarget(tok.value);
      if (target) {
        const to = byPath[target];
        if (!to) { missing.push(tok.name + " -> " + target); continue; }
        v.setValueForMode(mode, figma.variables.createVariableAlias(to));
      } else if (tok.type === "color") {
        v.setValueForMode(mode, hexToRgba(tok.value));
      } else if (figmaType(tok.type) === "FLOAT") {
        v.setValueForMode(mode, parseFloat(String(tok.value)));
      } else {
        v.setValueForMode(mode, String(tok.value));
      }
    }
  }

  // Pass 3: remove variables that are no longer in the tokens (full sync).
  let removed = 0;
  for (const name of ORDER) {
    for (const [vname, v] of preExisting[name]) {
      if (!desired[name].has(vname)) { v.remove(); removed++; }
    }
  }

  const total = ORDER.reduce((n, k) => n + flat[k].length, 0);
  let msg = "Synced " + total + " variables in 3 collections";
  if (removed) msg += ", removed " + removed;
  if (missing.length) msg += ", " + missing.length + " aliases unresolved (see console)";
  figma.notify(msg);
  if (missing.length) console.warn("Unresolved aliases:\\n" + missing.join("\\n"));
  figma.closePlugin();
})();
`;

  const manifest = {
    name: "Portfolio Tokens Import",
    id: "mgiang-portfolio-tokens-import",
    api: "1.0.0",
    main: "code.js",
    editorType: ["figma"],
  };

  await rm(PLUGIN_DIR, { recursive: true, force: true });
  await mkdir(PLUGIN_DIR, { recursive: true });
  await writeFile(path.join(PLUGIN_DIR, "code.js"), pluginCode);
  await writeFile(
    path.join(PLUGIN_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );

  console.log(
    `✔ figma plugin built (hue ${HUE}) -> ${PLUGIN_DIR}/ — ${total} variables`,
  );
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) await build();
