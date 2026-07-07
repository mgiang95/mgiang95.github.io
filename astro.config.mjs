// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// GitHub Pages user page: served from the root URL, so no `base` is needed.
export default defineConfig({
  site: "https://mgiang95.github.io",
  integrations: [react()],
});
