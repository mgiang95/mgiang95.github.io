// Content collection definitions (Astro v5 Content Layer).
// NOTE: Draft created in Phase 0 before the Astro project is scaffolded —
// type-checked and verified with the first `astro build` in Phase 1.
import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Case studies and smaller project entries.
 * `featured: true` = full case study with its own page,
 * `featured: false` = short "more projects" entry.
 * `parent` links sub-cases (e.g. WinCredit design system) to their main case.
 * `draft: true` marks harvested legacy copy that still needs editing (Phase 5).
 */
const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      subtitle: z.string(),
      description: z.string(),
      period: z.string(),
      role: z.string(),
      client: z.string().optional(),
      externalUrl: z.string().url().optional(),
      keywords: z.array(z.string()),
      heroImage: image().optional(),
      featured: z.boolean().default(false),
      order: z.number(),
      parent: reference("projects").optional(),
      achievements: z.array(z.string()).optional(),
      draft: z.boolean().default(false),
    }),
});

/** CV timeline entries ("changelog"), work and education. */
const timeline = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/timeline" }),
  schema: z.object({
    order: z.number(),
    type: z.enum(["work", "education"]),
    title: z.string(),
    institution: z.string(),
    location: z.string(),
    country: z.enum(["sui", "aut", "ger", "usa", "sko"]),
    dateStart: z.date(),
    dateEnd: z.date().nullable(),
    note: z.string().optional(),
    // Markdown strings; may contain internal links to /projects/[slug]
    highlights: z.array(z.string()),
  }),
});

/** Certifications, scholarships and awards. */
const certifications = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/certifications" }),
  schema: z.object({
    type: z.enum(["certification", "scholarship", "award"]),
    title: z.string(),
    issuer: z.string(),
    date: z.string(), // YYYY-MM
    url: z.string().url().optional(),
    emoji: z.string().optional(),
    description: z.string().optional(),
  }),
});

/** Prose snippets about the person (intro/bio). */
const about = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/about" }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      tagline: z.string(),
      based: z.string(),
      profileImage: image().optional(),
      memojiImage: image().optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { projects, timeline, certifications, about };
