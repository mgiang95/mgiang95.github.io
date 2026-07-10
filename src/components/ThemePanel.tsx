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
import { oklchToSrgb, contrast, parseOklch, PAIRS } from "../lib/color-math.js";
import primitiveColors from "../../tokens/primitives/color.tokens.json";
import lightColors from "../../tokens/semantic/color-light.tokens.json";
import darkColors from "../../tokens/semantic/color-dark.tokens.json";

type Scheme = "system" | "light" | "dark";
type Density = "normal" | "tight" | "comfy";

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

/** Resolves one semantic color file to L/C steps, keyed by "group.name". */
function resolvePalette(semantic: typeof lightColors) {
  const palette: Record<string, { L: number; C: number }> = {};
  const ramps = primitiveColors.color as Record<
    string,
    Record<string, { $value?: string }>
  >;
  for (const [group, tokens] of Object.entries(semantic.color)) {
    for (const [name, token] of Object.entries(tokens)) {
      if (name.startsWith("$") || typeof token === "string") continue;
      const ref = (token as { $value: string }).$value;
      const [, ramp, step] = ref.replace(/[{}]/g, "").split(".");
      const value = ramps[ramp]?.[step]?.$value;
      const parsed = value ? parseOklch(value) : null;
      if (parsed) palette[`${group}.${name}`] = parsed;
    }
  }
  return palette;
}

const palettes = {
  light: resolvePalette(lightColors),
  dark: resolvePalette(darkColors),
};

/**
 * Most critical pair at the given hue: the one with the smallest headroom
 * over ITS OWN requirement (text pairs need 4.5:1, non-text UI 3:1).
 */
function worstPair(theme: "light" | "dark", hue: number) {
  const palette = palettes[theme];
  let worst = { ratio: Infinity, min: 4.5, margin: Infinity, fg: "", bg: "" };
  for (const [fgName, bgName, min] of PAIRS) {
    const fg = palette[fgName];
    const bg = palette[bgName];
    if (!fg || !bg) continue;
    const ratio = contrast(
      oklchToSrgb(fg.L, fg.C, hue),
      oklchToSrgb(bg.L, bg.C, hue),
    );
    const margin = ratio / min;
    if (margin < worst.margin) worst = { ratio, min, margin, fg: fgName, bg: bgName };
  }
  return worst;
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

export default function ThemePanel() {
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

  // Follow hue changes from outside the panel (e.g. the poster scrub on
  // the home hero). Both sides dispatch "hue-change" on user input only,
  // so there is no feedback loop — React bails out on identical state.
  useEffect(() => {
    const onExternalHue = (event: Event) => {
      const value = (event as CustomEvent<number>).detail;
      if (Number.isFinite(value)) setHue(Math.round(value));
    };
    window.addEventListener("hue-change", onExternalHue);
    return () => window.removeEventListener("hue-change", onExternalHue);
  }, []);

  // Same contract for scheme/density: with the panel also living in the
  // nav popover there can be several instances per page — user input in
  // one dispatches "pref-change", the others follow. Dispatch happens in
  // the input handlers only, so there is no feedback loop.
  useEffect(() => {
    const onExternalPref = (event: Event) => {
      const { kind, value } =
        (event as CustomEvent<{ kind: string; value: string }>).detail ?? {};
      if (kind === "scheme" && (value === "system" || value === "light" || value === "dark")) {
        setScheme(value);
      }
      if (kind === "density" && (value === "tight" || value === "normal" || value === "comfy")) {
        setDensity(value);
      }
    };
    window.addEventListener("pref-change", onExternalPref);
    return () => window.removeEventListener("pref-change", onExternalPref);
  }, []);

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
            window.dispatchEvent(
              new CustomEvent("hue-change", { detail: value }),
            );
          }}
        />
      </div>

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
                window.dispatchEvent(
                  new CustomEvent("pref-change", {
                    detail: { kind: "scheme", value },
                  }),
                );
              }}
            />
            {value}
          </label>
        ))}
      </fieldset>

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
                window.dispatchEvent(
                  new CustomEvent("pref-change", {
                    detail: { kind: "density", value },
                  }),
                );
              }}
            />
            {value}
          </label>
        ))}
      </fieldset>

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
