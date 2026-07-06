# mgiang95.github.io

Portfolio of a Design System Engineer. The site itself is the case study:
live theming (hue slider, light/dark, density modes) on top of a real design
token pipeline. Full plan in [SPEC.md](SPEC.md), working rules in
[CLAUDE.md](CLAUDE.md).

## Stack

- **Astro** (static output, React islands later for the theme panel)
- **Design tokens** in DTCG format under [`/tokens`](tokens) — three tiers:
  primitives → semantic → component
- **Style Dictionary** builds the tokens into CSS custom properties
  (`src/styles/tokens.css`, generated — never edit by hand)
- Vanilla CSS, BEM class names, OKLCH colors derived from a single `--hue`

## Commands

| Command           | Action                                          |
| ----------------- | ----------------------------------------------- |
| `npm install`     | Install dependencies                            |
| `npm run tokens`  | Build `/tokens` → `src/styles/tokens.css`       |
| `npm run dev`     | Token build + dev server at `localhost:4321`    |
| `npm run build`   | Token build + production build to `./dist/`     |
| `npm run preview` | Preview the production build locally            |

## Structure

```
/tokens            DTCG token JSON (primitives/, semantic/, component/)
/scripts           Token build (Style Dictionary)
/src/content       Content collections (projects, timeline, certifications, about)
/src/data          Small JSON data files (clients, books, contact, …)
/src/styles        Generated tokens.css + global styles
/src/layouts       Base layout
/src/pages         index, projects, about, system
/legacy            Old portfolio as migration source — never deployed, deleted after cutover
```
