/**
 * ThemePanel — React island for runtime theming.
 * Hue slider, color scheme toggle, density choice and a live contrast badge.
 *
 * Writes the same storage keys the pre-paint head script reads:
 *   pref-theme, pref-density, pref-hue (see BaseLayout.astro).
 * Without JS the panel simply does not render — the site keeps its defaults.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import "./ThemePanel.css";
import { worstPair } from "../lib/live-contrast";
import {
  dispatchHueChange,
  dispatchPrefChange,
  onHueChange,
  onPrefChange,
} from "../lib/theme-events";

type Scheme = "system" | "light" | "dark";
type Density = "normal" | "tight" | "comfy";

interface Props {
  /**
   * "panel" (default): full instrument — heading, hue slider, radios,
   * contrast badge. "strip": slim horizontal row with scheme + density
   * only, for the poster edge — hue lives on the canvas there, the badge
   * in the annotations.
   */
  variant?: "panel" | "strip";
}

const DEFAULT_HUE = 220;

let modeTransitionTimer = 0;

/**
 * Opens the brief page-wide transition window for discrete mode switches
 * (scheme, density) — see the data-mode-transition rule in global.css.
 * Transient animation helper, not theming state: the attribute lives only
 * for the duration of the switch. Hue dragging never opens it, so direct
 * manipulation stays instant.
 */
function withModeTransition() {
  const html = document.documentElement;
  html.setAttribute("data-mode-transition", "");
  const raw = getComputedStyle(html).getPropertyValue("--motion-mode-duration");
  const duration = Number.parseFloat(raw) || 200;
  window.clearTimeout(modeTransitionTimer);
  modeTransitionTimer = window.setTimeout(
    () => html.removeAttribute("data-mode-transition"),
    duration + 50,
  );
}

/** Initial state from the DOM (already set by the head script) or defaults. */
function readInitial<T>(read: () => T, fallback: T): T {
  if (typeof document === "undefined") return fallback;
  try {
    return read();
  } catch {
    return fallback;
  }
}

export default function ThemePanel({ variant = "panel" }: Props) {
  // Several instances can coexist (hero, nav popover, /system docs) — ids
  // and radio-group names must be unique per instance or the native radio
  // grouping couples them across panels.
  const uid = useId();

  const [hue, setHue] = useState<number>(() =>
    readInitial(() => {
      const v = Number(
        document.documentElement.style.getPropertyValue("--hue"),
      );
      return Number.isFinite(v) && v > 0 ? v : DEFAULT_HUE;
    }, DEFAULT_HUE),
  );
  const [scheme, setScheme] = useState<Scheme>(() =>
    readInitial(() => {
      const t = document.documentElement.dataset.theme;
      return t === "light" || t === "dark" ? t : "system";
    }, "system"),
  );
  const [density, setDensity] = useState<Density>(() =>
    readInitial(() => {
      const d = document.documentElement.dataset.density;
      return d === "tight" || d === "comfy" ? d : "normal";
    }, "normal"),
  );
  const [systemDark, setSystemDark] = useState(false);

  // Follow theming input from outside this instance (poster scrub, other
  // panel instances in nav popover / hero / docs). Dispatch happens in the
  // input handlers only, so there is no feedback loop — React bails out on
  // identical state. Contract & ordering rule: src/lib/theme-events.ts.
  useEffect(() => onHueChange((value) => setHue(Math.round(value))), []);
  useEffect(
    () =>
      onPrefChange(({ kind, value }) => {
        if (kind === "scheme" && (value === "system" || value === "light" || value === "dark")) {
          setScheme(value);
        }
        if (kind === "density" && (value === "tight" || value === "normal" || value === "comfy")) {
          setDensity(value);
        }
      }),
    [],
  );

  // Track the OS scheme for the badge while "system" is selected.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);
    const onChange = (event: MediaQueryListEvent) =>
      setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    // Applied on every tick — this is only a style recalc, not I/O.
    document.documentElement.style.setProperty("--hue", String(hue));

    // Persisting is debounced: localStorage.setItem is synchronous, and a
    // drag fires this effect on every pixel (~60/s). Writing on every tick
    // would block the main thread repeatedly for no visible benefit — only
    // the final value after the drag settles needs to survive a reload.
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem("pref-hue", String(hue));
      } catch {
        /* storage unavailable */
      }
    }, 150);
    return () => clearTimeout(timeout);
  }, [hue]);

  // Skips the transition window while the mount effects apply initial state.
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) withModeTransition();
    const html = document.documentElement;
    try {
      if (scheme === "system") {
        delete html.dataset.theme;
        localStorage.removeItem("pref-theme");
      } else {
        html.dataset.theme = scheme;
        localStorage.setItem("pref-theme", scheme);
      }
    } catch {
      /* storage unavailable */
    }
  }, [scheme]);

  useEffect(() => {
    if (mounted.current) withModeTransition();
    const html = document.documentElement;
    try {
      if (density === "normal") {
        delete html.dataset.density;
        localStorage.removeItem("pref-density");
      } else {
        html.dataset.density = density;
        localStorage.setItem("pref-density", density);
      }
    } catch {
      /* storage unavailable */
    }
  }, [density]);

  useEffect(() => {
    mounted.current = true;
  }, []);

  const effectiveTheme: "light" | "dark" =
    scheme === "system" ? (systemDark ? "dark" : "light") : scheme;

  const worst = useMemo(
    () => worstPair(effectiveTheme, hue),
    [effectiveTheme, hue],
  );
  const passes = worst.margin >= 1;

  const schemeGroup = (
    <fieldset className="theme-panel__group">
      <legend className="theme-panel__label">Color scheme</legend>
      {(["system", "light", "dark"] as const).map((value) => (
        <label className="theme-panel__option" key={value}>
          <input
            type="radio"
            name={`theme-panel-scheme-${uid}`}
            value={value}
            checked={scheme === value}
            onChange={() => {
              setScheme(value);
              dispatchPrefChange("scheme", value);
            }}
          />
          {value}
        </label>
      ))}
    </fieldset>
  );

  const densityGroup = (
    <fieldset className="theme-panel__group">
      <legend className="theme-panel__label">Density</legend>
      {(["tight", "normal", "comfy"] as const).map((value) => (
        <label className="theme-panel__option" key={value}>
          <input
            type="radio"
            name={`theme-panel-density-${uid}`}
            value={value}
            checked={density === value}
            onChange={() => {
              setDensity(value);
              dispatchPrefChange("density", value);
            }}
          />
          {value}
        </label>
      ))}
    </fieldset>
  );

  // Strip: scheme + density only — hue lives on the poster canvas, the
  // contrast badge in the poster annotations.
  if (variant === "strip") {
    return (
      <div className="theme-panel theme-panel--strip">
        {schemeGroup}
        {densityGroup}
      </div>
    );
  }

  return (
    <section className="theme-panel" aria-labelledby={`theme-panel-heading-${uid}`}>
      <h2 className="theme-panel__heading" id={`theme-panel-heading-${uid}`}>
        Theme
      </h2>

      <div className="theme-panel__control">
        <label className="theme-panel__label" htmlFor={`theme-panel-hue-${uid}`}>
          Hue <code className="theme-panel__token">--hue: {hue}</code>
        </label>
        <input
          className="theme-panel__slider"
          id={`theme-panel-hue-${uid}`}
          type="range"
          min={0}
          max={360}
          step={1}
          value={hue}
          onChange={(event) => {
            const value = Number(event.target.value);
            setHue(value);
            dispatchHueChange(value);
          }}
        />
      </div>

      {schemeGroup}
      {densityGroup}

      <p className="theme-panel__contrast">
        <span
          className={`theme-panel__ratio${passes ? "" : " theme-panel__ratio--fail"}`}
        >
          {worst.ratio === Infinity ? "–" : `${worst.ratio.toFixed(2)}:1`}
        </span>{" "}
        most critical pair ({worst.fg} on {worst.bg}, needs {worst.min}:1) —{" "}
        {passes ? "WCAG AA ✓" : "below AA"}
      </p>
    </section>
  );
}
