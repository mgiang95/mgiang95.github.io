/**
 * TokenInspector — Lit web component and pilot of the renderer layering
 * (SPEC §12.3): the same token system consumed by a third renderer next to
 * Astro and React. While active, it reads the page's real stylesheets and
 * shows which token custom properties style the element under the cursor
 * (or keyboard focus), grouped by token tier.
 *
 * Theming needs no wiring: token custom properties inherit through the
 * shadow DOM boundary, so hue, scheme and density apply automatically.
 * Without JS the element simply never upgrades — the page loses nothing.
 *
 * The tier lists come from the server via the `tiers` attribute (JSON),
 * generated from the same DTCG files as everything else.
 */
import { LitElement, html, css, nothing } from "lit";

interface TierLists {
  primitive: string[];
  semantic: string[];
  component: string[];
}

interface Inspection {
  /** Element description, e.g. "a.button--primary". */
  label: string;
  /** Viewport rect of the inspected element. */
  rect: DOMRect;
  /** Token custom properties per tier, in tier order. */
  groups: { tier: string; names: string[] }[];
  /** Panel anchor (viewport coordinates). */
  x: number;
  y: number;
}

/** Distance between pointer and panel, in CSS pixels (geometry, not design). */
const PANEL_OFFSET = 12;

export class TokenInspector extends LitElement {
  static properties = {
    tiers: { type: Object },
    compact: { type: Boolean },
    active: { state: true },
    inspection: { state: true },
  };

  declare tiers: TierLists;
  /** Square icon trigger for the instrument bar instead of the text button. */
  declare compact: boolean;
  declare active: boolean;
  declare inspection: Inspection | null;

  private frame = 0;

  constructor() {
    super();
    this.tiers = { primitive: [], semantic: [], component: [] };
    this.compact = false;
    this.active = false;
    this.inspection = null;
  }

  static styles = css`
    /* Label trigger reuses the shared button component tokens (secondary
       variant): one component CSS contract, rendered by a third renderer. */
    .trigger--label {
      display: inline-flex;
      align-items: center;
      gap: var(--button-gap);
      padding: var(--button-padding-block) var(--button-padding-inline);
      border: 1px solid var(--button-secondary-border);
      border-radius: var(--button-radius);
      background: transparent;
      color: var(--button-secondary-text);
      font: inherit;
      font-weight: var(--typography-label-weight);
      cursor: pointer;
    }

    .trigger--label:hover {
      background: var(--button-secondary-background-hover);
    }

    /* Compact trigger: the outlined square — counterpart to the filled
       theme swatch in the instrument bar. Fills while inspecting. */
    .trigger--compact {
      display: grid;
      place-items: center;
      padding: var(--space-inset-xs);
      background: none;
      border: none;
      cursor: pointer;
    }

    .trigger--compact .trigger__square {
      display: block;
      inline-size: 1em;
      block-size: 1em;
      border: 2px solid var(--token-inspector-highlight-border);
      background: transparent;
      transition: background-color var(--motion-state-duration)
        var(--motion-state-easing);
    }

    .trigger--compact[aria-pressed="true"] .trigger__square {
      background: var(--token-inspector-highlight-border);
    }

    .highlight {
      position: fixed;
      z-index: 90;
      pointer-events: none;
      border: 2px solid var(--token-inspector-highlight-border);
    }

    .panel {
      position: fixed;
      z-index: 91;
      pointer-events: none;
      display: grid;
      gap: var(--token-inspector-panel-gap);
      max-inline-size: 24rem;
      max-block-size: 40vh;
      overflow: hidden;
      padding: var(--token-inspector-panel-padding);
      background: var(--token-inspector-panel-background);
      color: var(--token-inspector-panel-text);
      border: 1px solid var(--token-inspector-panel-border);
      border-radius: var(--token-inspector-panel-radius);
      font-family: var(--typography-label-family);
      font-size: var(--typography-label-size);
    }

    .panel__target {
      font-weight: var(--typography-label-weight);
    }

    .panel__tier {
      color: var(--token-inspector-panel-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .panel ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
  `;

  render() {
    const { inspection } = this;
    const trigger = this.compact
      ? html`
          <button
            type="button"
            class="trigger--compact"
            aria-pressed=${this.active ? "true" : "false"}
            aria-label="Inspect tokens"
            title="Inspect tokens"
            @click=${this.toggle}
          >
            <span class="trigger__square" aria-hidden="true"></span>
          </button>
        `
      : html`
          <button
            type="button"
            class="trigger--label"
            aria-pressed=${this.active ? "true" : "false"}
            @click=${this.toggle}
          >
            ${this.active ? "Stop inspecting" : "Inspect tokens"}
          </button>
        `;
    return html`
      ${trigger}
      ${this.active && inspection
        ? html`
            <div
              class="highlight"
              aria-hidden="true"
              style=${`inset-block-start:${inspection.rect.top}px;inset-inline-start:${inspection.rect.left}px;inline-size:${inspection.rect.width}px;block-size:${inspection.rect.height}px;`}
            ></div>
            <div
              class="panel"
              aria-hidden="true"
              style=${`inset-block-start:${inspection.y}px;inset-inline-start:${inspection.x}px;`}
            >
              <p class="panel__target"><code>${inspection.label}</code></p>
              ${inspection.groups.map(
                (group) => html`
                  <p class="panel__tier">${group.tier}</p>
                  <ul>
                    ${group.names.map((name) => html`<li><code>${name}</code></li>`)}
                  </ul>
                `,
              )}
            </div>
          `
        : nothing}
    `;
  }

  private toggle = () => {
    this.active ? this.deactivate() : this.activate();
  };

  private activate() {
    this.active = true;
    document.addEventListener("pointermove", this.onPointerMove);
    document.addEventListener("focusin", this.onFocusIn);
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("scroll", this.onScroll, true);
  }

  private deactivate() {
    this.active = false;
    this.inspection = null;
    document.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("focusin", this.onFocusIn);
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("scroll", this.onScroll, true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.deactivate();
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") this.deactivate();
  };

  /** Stale rects after scrolling — clear instead of showing wrong boxes. */
  private onScroll = () => {
    this.inspection = null;
  };

  private onPointerMove = (event: PointerEvent) => {
    if (event.composedPath().includes(this)) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() =>
      this.inspect(target, event.clientX, event.clientY),
    );
  };

  private onFocusIn = (event: FocusEvent) => {
    if (event.composedPath().includes(this)) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const rect = target.getBoundingClientRect();
    this.inspect(target, rect.right, rect.bottom);
  };

  /** Walks up from `start` to the nearest element whose rules consume tokens. */
  private inspect(start: Element, x: number, y: number) {
    let el: Element | null = start;
    while (el && el !== document.documentElement) {
      const names = this.tokensFor(el);
      if (names.length) {
        const cls = el.classList[0];
        this.inspection = {
          label: el.tagName.toLowerCase() + (cls ? `.${cls}` : ""),
          rect: el.getBoundingClientRect(),
          groups: this.grouped(names),
          x: Math.min(x + PANEL_OFFSET, window.innerWidth - 320),
          y: Math.min(y + PANEL_OFFSET, window.innerHeight - 160),
        };
        return;
      }
      el = el.parentElement;
    }
    this.inspection = null;
  }

  /** Token custom properties referenced by stylesheet rules matching `el`. */
  private tokensFor(el: Element): string[] {
    const names = new Set<string>();
    const visit = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule) {
          let matched = false;
          try {
            matched = el.matches(rule.selectorText);
          } catch {
            /* pseudo-element or unsupported selector — never matches */
          }
          if (matched) {
            for (const m of rule.cssText.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)) {
              names.add(m[1]);
            }
          }
        } else if (rule instanceof CSSMediaRule) {
          if (window.matchMedia(rule.conditionText).matches) visit(rule.cssRules);
        } else if (rule instanceof CSSGroupingRule) {
          visit(rule.cssRules);
        }
      }
    };
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        visit(sheet.cssRules);
      } catch {
        /* cross-origin sheet — none expected, skip defensively */
      }
    }
    return [...names].sort();
  }

  /** Groups var names by tier, tiers ordered component -> semantic -> primitive. */
  private grouped(names: string[]) {
    const sets = {
      component: new Set(this.tiers.component),
      semantic: new Set(this.tiers.semantic),
      primitive: new Set(this.tiers.primitive),
    };
    return (["component", "semantic", "primitive"] as const)
      .map((tier) => ({
        tier,
        names: names.filter((name) => sets[tier].has(name)),
      }))
      .filter((group) => group.names.length > 0);
  }
}

customElements.define("token-inspector", TokenInspector);
