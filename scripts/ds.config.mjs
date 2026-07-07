/**
 * Design system paths — single place the token pipeline and the auditor
 * read their locations from. Keeping the scripts free of hardcoded paths
 * lets the whole /tokens + /scripts layer move into its own package (or
 * another project) without touching the tooling itself.
 *
 * SPEC.md §12 documents the extraction trigger: this stays in-repo until
 * a second consumer (first SPA) actually exists.
 */
export default {
  /** DTCG token source (primitives/, semantic/, component/). */
  tokensDir: "tokens",

  /** Generated CSS custom properties (never edited by hand). */
  generatedCss: "src/styles/tokens.css",

  /**
   * Component layer: strictest rules. Components may only consume
   * component- or semantic-tier tokens, never primitives; every component
   * needs a co-located *.metadata.json; class names follow BEM with the
   * file name as block.
   */
  componentsDir: "src/components",

  /**
   * App layer (pages, layouts, global base styles): no hardcoded colors or
   * px spacing, every var() must exist — but primitives are allowed, since
   * the base layer is where raw scales legitimately get applied.
   */
  appPaths: ["src/pages", "src/layouts", "src/styles/global.css"],
};
