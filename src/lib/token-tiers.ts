/**
 * Tier lists for the TokenInspector: which custom property belongs to which
 * token tier. Globbed from the DTCG source so new token files are included
 * automatically; theme/density variants re-declare the same names and
 * dedupe via the sets. Build-time only.
 */
import { flattenTokens } from "./tokens";

const modules = import.meta.glob<{
  default: Parameters<typeof flattenTokens>[0];
}>("../../tokens/**/*.tokens.json", { eager: true });

export interface TokenTiers {
  primitive: string[];
  semantic: string[];
  component: string[];
}

export function tokenTiers(): TokenTiers {
  const sets = {
    primitive: new Set<string>(),
    semantic: new Set<string>(),
    component: new Set<string>(),
  };
  for (const [path, mod] of Object.entries(modules)) {
    const tier = path.includes("/primitives/")
      ? "primitive"
      : path.includes("/semantic/")
        ? "semantic"
        : "component";
    for (const token of flattenTokens(mod.default)) sets[tier].add(token.cssVar);
  }
  return {
    primitive: [...sets.primitive],
    semantic: [...sets.semantic],
    component: [...sets.component],
  };
}
