/**
 * The theming event contract — one place instead of string literals across
 * islands and page scripts. All theming surfaces (ThemePanel instances,
 * poster scrub, annotation badge) sync through these two events.
 *
 * ORDERING RULE: events are dispatched inside input handlers, BEFORE React
 * effects apply `--hue` / `data-theme` to the DOM. Handlers must therefore
 * use the event payload and never read the custom property or dataset
 * synchronously — that race produced real bugs twice. For `data-theme`
 * specifically, observe the attribute (MutationObserver) instead.
 */

export const HUE_CHANGE = "hue-change";
export const PREF_CHANGE = "pref-change";

export type PrefKind = "scheme" | "density";

export interface PrefDetail {
  kind: PrefKind;
  value: string;
}

/** Announces a hue set by user input (slider, poster scrub). */
export function dispatchHueChange(hue: number): void {
  window.dispatchEvent(new CustomEvent(HUE_CHANGE, { detail: hue }));
}

/** @returns cleanup function (removes the listener). */
export function onHueChange(handler: (hue: number) => void): () => void {
  const listener = (event: Event) => {
    const value = (event as CustomEvent<number>).detail;
    if (Number.isFinite(value)) handler(value);
  };
  window.addEventListener(HUE_CHANGE, listener);
  return () => window.removeEventListener(HUE_CHANGE, listener);
}

/** Announces a scheme/density choice made by user input. */
export function dispatchPrefChange(kind: PrefKind, value: string): void {
  window.dispatchEvent(
    new CustomEvent<PrefDetail>(PREF_CHANGE, { detail: { kind, value } }),
  );
}

/** @returns cleanup function (removes the listener). */
export function onPrefChange(
  handler: (detail: PrefDetail) => void,
): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<PrefDetail>).detail;
    if (detail && (detail.kind === "scheme" || detail.kind === "density")) {
      handler(detail);
    }
  };
  window.addEventListener(PREF_CHANGE, listener);
  return () => window.removeEventListener(PREF_CHANGE, listener);
}
