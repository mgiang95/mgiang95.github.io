/**
 * Build-time helpers to read DTCG token JSON for the /system docs page.
 * Runs only during rendering (server-side) — never shipped to the client.
 */

/** A single design token flattened out of the DTCG tree. */
export interface FlatToken {
  /** Dot path, e.g. "color.accent.500". */
  path: string;
  /** Generated custom property name, e.g. "--color-accent-500". */
  cssVar: string;
  /** Raw DTCG value, references kept as "{path.to.token}". */
  value: string;
  /** DTCG $type. */
  type: string;
  description?: string;
}

interface DtcgNode {
  [key: string]: DtcgNode | unknown;
}

const isToken = (node: DtcgNode): boolean => "$value" in node;

/** Flattens a DTCG tree into a list of tokens (depth-first, stable order). */
export function flattenTokens(node: DtcgNode, prefix: string[] = []): FlatToken[] {
  if (isToken(node)) {
    const value = node["$value"];
    return [
      {
        path: prefix.join("."),
        cssVar: `--${prefix.join("-")}`,
        value: Array.isArray(value) ? value.join(", ") : String(value),
        type: String(node["$type"] ?? ""),
        description: node["$description"] as string | undefined,
      },
    ];
  }
  return Object.entries(node)
    .filter(([key, child]) => !key.startsWith("$") && typeof child === "object")
    .flatMap(([key, child]) => flattenTokens(child as DtcgNode, [...prefix, key]));
}

/**
 * Accent ramp steps, light to dark — shared by the poster's color band and
 * the footer's closing edge.
 */
export const ACCENT_RAMP_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

/** Rewrites a DTCG reference value into the custom property it compiles to. */
export function referenceToCssVar(value: string): string {
  return value.replace(/\{([^}]+)\}/g, (_, path: string) => `var(--${path.replace(/\./g, "-")})`);
}

export interface TokenTiers {
  primitive: string[];
  semantic: string[];
  component: string[];
}

/** Token tier of a file, by its path inside /tokens. */
export function classifyTier(filePath: string): keyof TokenTiers {
  if (filePath.includes("/primitives/")) return "primitive";
  if (filePath.includes("/semantic/")) return "semantic";
  return "component";
}

/**
 * Tier lists of custom-property names from [filePath, DTCG tree] entries.
 * Theme/density variants re-declare the same names and dedupe via the
 * sets. Pure — the import.meta.glob wiring lives in token-tiers.ts.
 */
export function buildTiers(
  entries: ReadonlyArray<readonly [string, DtcgNode]>,
): TokenTiers {
  const sets: Record<keyof TokenTiers, Set<string>> = {
    primitive: new Set(),
    semantic: new Set(),
    component: new Set(),
  };
  for (const [filePath, tree] of entries) {
    const tier = classifyTier(filePath);
    for (const token of flattenTokens(tree)) sets[tier].add(token.cssVar);
  }
  return {
    primitive: [...sets.primitive],
    semantic: [...sets.semantic],
    component: [...sets.component],
  };
}
