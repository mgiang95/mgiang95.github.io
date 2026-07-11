/**
 * Tier lists for the TokenInspector: which custom property belongs to
 * which token tier. Globbed from the DTCG source so new token files are
 * included automatically. Thin Vite wrapper — the logic (and its tests)
 * live in tokens.ts. Build-time only.
 */
import { buildTiers, flattenTokens, type TokenTiers } from "./tokens";

const modules = import.meta.glob<{
  default: Parameters<typeof flattenTokens>[0];
}>("../../tokens/**/*.tokens.json", { eager: true });

export type { TokenTiers };

export function tokenTiers(): TokenTiers {
  return buildTiers(
    Object.entries(modules).map(([path, mod]) => [path, mod.default]),
  );
}
