// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import rehypeFigure from "./src/lib/rehype-figure.mjs";

// GitHub Pages user page: served from the root URL, so no `base` is needed.
export default defineConfig({
  site: "https://mgiang95.github.io",
  // i18n prepared, not activated (SPEC §13): English stays at the root —
  // existing URLs never change. German pages appear under /de only when
  // their content is actually authored; no /de routes exist until then.
  i18n: {
    defaultLocale: "en",
    locales: ["en", "de"],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [react()],
  redirects: {
    // The former /projects index merged into the home work index.
    "/projects": "/",
    // The WinCredit umbrella case was dissolved into its two sibling cases
    // (nested sub-cases proved undiscoverable); the UX case carries on the
    // "Redesign: WinCredit 3" story the old URL promised.
    "/projects/wincredit-redesign": "/projects/wincredit-ux-patterns",
  },
  markdown: {
    // ![image] + *caption* paragraphs become <figure>/<figcaption>.
    rehypePlugins: [rehypeFigure],
  },
});
