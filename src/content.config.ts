// Content collection definitions (Astro v5 Content Layer).
// NOTE: Draft created in Phase 0 before the Astro project is scaffolded —
// type-checked and verified with the first `astro build` in Phase 1.
import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Case studies and smaller project entries.
 * `featured: true` = full case study with its own page,
 * `featured: false` = short "more projects" entry.
 * `related` links sibling cases from the same engagement (e.g. the two
 * WinCredit cases) — flat cross-reference, no hierarchy: nested sub-cases
 * proved undiscoverable, so every case lives on the top level.
 * `draft: true` marks harvested legacy copy that still needs editing (Phase 5).
 */
const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      subtitle: z.string(),
      /** Meta description of the case study page — keep it under ~160 chars. */
      description: z.string(),
      /**
       * Paragraph shown in the work index row. Longer than `description`,
       * which has to stay short enough for search snippets. Falls back to
       * `description` when unset.
       */
      summary: z.string().optional(),
      period: z.string(),
      role: z.string(),
      client: z.string().optional(),
      externalUrl: z.string().url().optional(),
      keywords: z.array(z.string()),
      heroImage: image().optional(),
      /** Optional screenshot strip, rendered as a scroll-snap Gallery. */
      gallery: z
        .array(
          z.object({
            image: image(),
            alt: z.string(),
            caption: z.string().optional(),
          }),
        )
        .optional(),
      featured: z.boolean().default(false),
      order: z.number(),
      related: reference("projects").optional(),
      achievements: z.array(z.string()).optional(),
      draft: z.boolean().default(false),
    }),
});

/** CV timeline entries ("changelog"), work and education. */
const timeline = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/timeline" }),
  schema: z.object({
    /** Changelog framing: semver label shown in the CV timeline. */
    version: z.string(),
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

/** Notes — random thoughts from the journey; loose cadence, no promises. */
const notes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/notes" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

/**
 * Reading log — an ongoing collection, maintained like the notes: one JSON
 * file per book. `year` (when read) is the shelf grouping on /about;
 * `cover` is optional — books without one get a generated typographic cover.
 */
const books = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/books" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      author: z.string(),
      year: z.number().int(),
      cover: image().optional(),
      takeaway: z.string().optional(),
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

export const collections = {
  projects,
  timeline,
  certifications,
  about,
  notes,
  books,
};
