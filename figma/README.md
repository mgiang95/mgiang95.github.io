# Figma variable import

`plugin/` is a **generated** Figma plugin that creates the design-system
variables directly via the Plugin API. Do not edit it by hand, and it is not
committed (git-ignored, like `src/styles/tokens.css`) — rebuild from
`/tokens`:

```bash
npm run tokens:figma
```

It replaces the earlier Tokens Studio approach, which was a dead end on the
free tier (its single-file importer drops sets non-deterministically; folder
import is Pro-gated). The plugin embeds the token data and applies it itself —
deterministic, no third-party parser, no file picker.

## What it creates

Three variable collections mirroring the three token tiers, aliases preserved
(`component → semantic → primitives`), **no modes**:

- **primitives** — baked ramps `color/accent/*`, `color/neutral/*`, `space/*`,
  `radius/*`, `font/*`.
- **semantic** — `color/*`, `space/*`, `radius/*`, `typography/*`, aliasing to
  primitives. Canonical variant only (light + normal density).
- **component** — `button/*`, `card/*`, … aliasing to semantic.

157 variables total.

## What is baked (and why)

Figma variables cannot express these, so they are resolved to a static snapshot:

| Source (code)                   | Figma variable          | Reason                          |
| ------------------------------- | ----------------------- | ------------------------------- |
| `oklch(L C var(--hue))`         | sRGB hex at **hue 220** | no OKLCH, no runtime hue        |
| `rem` sizes (`0.75rem`)         | px (`12`, root 16px)    | FLOAT variables are unitless px |
| `clamp(min, …, max)` fluid type | the **max** (desktop)   | no fluid values in variables    |
| font stacks (arrays)            | comma-joined string     | STRING variable is one value    |

No Light/Dark or density modes: the user does not need them, so only the
canonical `color-light` / `space-normal` variants ship. The live hue slider
stays a code-only capability — change `figmaBakedHue` in `scripts/ds.config.mjs`
to snapshot a different hue.

## What is excluded

Token files are globbed per tier, so new files ship automatically — except an
explicit exclusion list (`EXCLUDE` in the build script):

- **Motion tokens** (`primitives/motion`, `semantic/motion`) — Figma variables
  cannot drive durations or easings, so exporting them would only add noise.
  Nothing references them from the exported tiers, so no aliases dangle.
- **Non-canonical mode variants** (`color-dark`, `space-tight`, `space-comfy`)
  — see "no modes" above.

The build fails loud if a variable path ever appears in two collections
(aliases resolve through one global name map, so a collision would bind
silently to the wrong variable).

## Run it (Figma desktop app)

1. Open the target file in the **desktop app** (dev plugins can't be imported in
   the browser). It must be in a team where you can edit (a View seat can't
   write variables).
2. Menu → **Plugins → Development → Import plugin from manifest…** → select
   `figma/plugin/manifest.json`.
3. Menu → **Plugins → Development → Portfolio Tokens Import** → runs once,
   creates the three collections, closes. A notification reports the count.
4. Re-run any time after `npm run tokens:figma` — the plugin is **idempotent**:
   it reuses the existing `primitives`/`semantic`/`component` collections,
   updates changed variables, adds new ones, and removes variables no longer in
   the tokens. No duplicates, no manual cleanup. The notification reports how
   many were synced and removed.

## Legacy variables

The existing **`Collection 1`** (120 flat variables: red/petrol/mint/yellow…) is
the **print / CV identity** — a different design language. The direction is: the
web token system above becomes the single source, and `Collection 1` is retired
to legacy once that holds. Do **not** hard-delete it (that silently drops any
layer bindings). When the time comes, rename it `_legacy`, note
`DEPRECATED → use <new>` in the descriptions, re-bind usages, then delete once
nothing binds to it.

Also delete the broken half-imported collections left over from the Tokens
Studio attempts (`semantic/color-light`, empty `primitives`, …) — but never
touch `Collection 1`.
