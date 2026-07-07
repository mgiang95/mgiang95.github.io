# CLAUDE.md — Projektregeln

Portfolio eines Design System Engineers. Astro + React Islands. Die Website ist selbst das Case Study: Live-Theming (Hue-Regler, Light/Dark, Dichte-Modi) auf Basis einer echten Token-Pipeline. Der vollständige Plan steht in `SPEC.md` — vor größeren Arbeiten lesen.

## Architektur-Invarianten (nie verletzen)

1. **Keine hartcodierten Werte in Komponenten.** Farben, Abstände, Radien, Schriftgrößen kommen ausschließlich aus CSS Custom Properties, die aus Tokens generiert wurden. Kein Hex, kein `px`-Spacing, kein `rgb()` in Komponenten-CSS.
2. **3-Ebenen-Hierarchie strikt einhalten:**
   - Primitives referenzieren nichts.
   - Semantic-Tokens referenzieren nur Primitives.
   - Component-Tokens referenzieren nur Semantic-Tokens.
   - Komponenten konsumieren nur Component- oder Semantic-Tokens, nie Primitives direkt.
3. **Tokens liegen als DTCG-Format in `/tokens`** (`.tokens.json`, `$value`/`$type`/`$description`, Aliasing via `{pfad.zum.token}`). Änderungen an Design-Werten passieren *immer* in den Token-Dateien, nie in generiertem CSS.
4. **Generierte Dateien nicht von Hand editieren** (`tokens.css` u. ä. entstehen aus Style Dictionary; Build-Schritt ausführen statt patchen).
5. **Alle Farb-Primitives in OKLCH**, mit festen Lightness-/Chroma-Stufen und `var(--hue)` als Hue. Neue Farben fügen sich in dieses Schema ein, sonst bricht die Kontrast-Garantie.
6. **Kontrast per Konstruktion:** Jedes Text/Surface-Paar der semantischen Ebene muss WCAG AA erfüllen (≥ 4.5:1 Fließtext, ≥ 3:1 Large Text) — für *jeden* Hue-Wert. Wenn eine Änderung an L/C-Stufen nötig ist, alle Paare neu prüfen.
7. **Theming-Zustand** läuft über `data-theme` (light/dark) und `data-density` (tight/normal/comfy) am `<html>` plus `--hue` am `:root`. Keine parallelen Mechanismen einführen.
8. **Wiederverwendbarkeit der Ebenen:** Primitives und Semantic-Tokens bleiben projekt-agnostisch (keine portfolio-spezifischen Namen oder Werte) — sie bilden zusammen mit der Pipeline das später extrahierbare Token-Paket. Component-Tokens gehören dem jeweiligen Projekt. Extraktion in ein eigenes Paket erst, wenn ein zweiter Konsument real existiert (SPEC.md §12).

## Governance — maschinell erzwungen

Die Invarianten oben sind kein Prosaversprechen: `npm run audit` (`scripts/audit-tokens.mjs`) prüft sie und bricht den Build bei Verstößen ab (Regeln T1–T4 Token-Hierarchie, C1–C5 CSS/BEM, M1–M2 Metadata). Läuft automatisch in `npm run build`; vor jedem Commit ausführen. Pfade liest die gesamte Pipeline aus `scripts/ds.config.mjs` — dort ändern, nie in den Scripts.

- **Jede Komponente hat eine co-located `<Name>.metadata.json`** (Felder: `name`, `description`, `renderer`, `jsRequired`, `variants`, `usage.useCases`, `usage.antiPatterns` mit `scenario`/`reason`/`alternative`, `tokenPrefixes`, `a11y`). Der Auditor erzwingt Existenz und Pflichtfelder; die inhaltliche Aktualität ist Teil jeder Komponentenänderung.
- **Vor dem Erstellen einer neuen Komponente** die Metadata der bestehenden lesen — erweitern statt neu bauen (Variante/Prop ergänzen schlägt Neuanlage).
- **Die `/system`-Docs werden aus den Metadata-Dateien gerendert** (`ComponentDoc.astro`). Keine handgepflegten Parallel-Docs für Komponenten schreiben; stattdessen die Metadata erweitern.

## Tech-Regeln

- Astro-Komponenten als Default; React nur für interaktive Islands (ThemePanel mit Kontrast-Badge) mit möglichst sparsamer `client:*`-Direktive.
- **Komponenten-Strategie nach Rolle:** Struktur-/Content-Komponenten (Button, Card, Timeline …) bleiben Astro — die No-JS-Invariante verbietet JS-pflichtiges Rendering für Kerninhalt. Verhaltenslastige, projektübergreifend gedachte Komponenten sind Lit-/Web-Component-Kandidaten (Theming via Custom Properties funktioniert durch Shadow DOM hindurch; umgesetzt: TokenInspector). React bleibt Konsument/Showcase. Details und Trigger: SPEC.md §12.
- Vanilla CSS auf Token-Basis. Kein Tailwind, kein CSS-in-JS.
- **CSS-Klassennamen strikt nach BEM** (`block__element--modifier`), Blockname = Komponentenname in kebab-case (z. B. `theme-panel__slider--disabled`). Astros Scoped Styles dürfen genutzt werden, ersetzen aber nicht die BEM-Benennung. Theming-Zustände laufen über die Datenattribute/Custom Properties, nicht über zusätzliche Zustandsklassen. Gilt für Light-DOM-Komponenten; innerhalb künftiger Shadow-DOM-Komponenten (Lit) wird BEM nicht erzwungen.
- Die Seite muss ohne JavaScript vollständig nutzbar sein (Default-Theme); JS erweitert nur.
- Inline-Script im `<head>` liest `localStorage` vor dem ersten Paint (kein Theme-Flash).
- **GitHub-Pages-User-Page:** Die Seite läuft unter `https://mgiang95.github.io/` (Repo `mgiang95.github.io`). `astro.config.mjs` braucht `site: 'https://mgiang95.github.io'`, kein `base`. Deployment via GitHub Actions (`withastro/action`). Der Ordner `/legacy` enthält nur den alten Stand als Migrationsquelle — nie deployen, nichts daraus importieren, nur Inhalte extrahieren.
- `prefers-reduced-motion` respektieren: alle Transitions/Animationen dahinter abgesichert.
- Semantisches HTML, Landmarks, sichtbarer Tastatur-Fokus, Skip-Link. Interaktive Elemente sind echte Buttons/Inputs mit Labels.

## Arbeitsweise

- Phasenweise vorgehen (siehe SPEC.md §8), kleine überprüfbare Schritte, nach jeder Phase Build + kurzer Check, dann Commit.
- Bei neuen Komponenten zuerst die benötigten Component-Tokens definieren, dann die Komponente bauen, dann die `*.metadata.json` schreiben und den `ComponentDoc`-Eintrag auf der `/system`-Docs-Seite ergänzen. Bei jeder Komponentenänderung die Metadata mitziehen.
- Vor dem Erfinden neuer Token-Namen prüfen, ob ein bestehender semantischer Token die Bedeutung schon abdeckt. Namenskonventionen aus SPEC.md §3 übernehmen.
- **Sprachen:** Alle sichtbaren Website-Inhalte (Copy, Navigation, Alt-Texte, Meta-Tags) auf **Englisch**. Die Kommunikation mit dem Nutzer, Commit-Messages und Erklärungen erfolgen auf **Deutsch**. Code-Kommentare auf Englisch.
- Ton der Website-Texte: klar, nüchtern, aktiv. Case Studies nach dem Muster Problem → Approach → Decision → Outcome.

## Designrichtung

- Leitbild: Schweizer Typografie / Bauhaus / HfG-Tradition (Ulm, Schwäbisch Gmünd) — ruhig, präzise, rasterbasiert, aber mit Charakter.
- **Verboten:** Gradients, Blobs, Glassmorphism, Glow-/Blur-Effekte, Purple-Defaults, dekorative Illustrationen ohne Funktion.
- Farbe flächig und gezielt (Plakat-Logik), überwiegend neutrale Flächen, Accent über den Hue-Regler.
- Typografie als Hauptgestaltungsmittel: Grotesk-Headlines mit großen Größenkontrasten, Mono für Token-Namen. Weißraum bewusst setzen.
- Motion sparsam und funktional; nichts Ambientes.

## Verzeichniskonvention (Soll-Zustand)

```
/tokens            DTCG-JSON (primitives/, semantic/, component/)
/src/styles        generiertes tokens.css + globale Styles
/src/components    Astro-Komponenten + React-Islands + *.metadata.json
/src/pages         index, projects, about, system
/scripts           ds.config.mjs (Pfade), Token-Build, Kontrast-Proof, Auditor
```
