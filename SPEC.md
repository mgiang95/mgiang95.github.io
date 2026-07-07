# SPEC — Design System Engineer Portfolio

## 1. Vision & Leitgedanke

Das Portfolio ist selbst das beste Case Study: Besucher bedienen live ein echtes Design System, statt nur Screenshots davon zu sehen. Kernstück ist ein Theme-Panel, mit dem sich Farbe (Hue-Regler), Farbschema (Light/Dark) und Dichte (tight / normal / comfy) zur Laufzeit umstellen lassen — bei stabilen, garantierten Kontrasten. Ein eigenes Case Study auf der Seite ("How this site is built") erklärt die Architektur.

Kein Retro-Gimmick, keine Effekt-Show. Anspruch: ruhig, präzise, handwerklich überzeugend. Die Raffinesse liegt im System, nicht in der Dekoration.

## 2. Tech-Stack

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Framework | **Astro** (aktuelle Major-Version) | Statischer Content, Interaktivität nur als React Islands. Architektur-Entscheidung wird im Case Study begründet. |
| UI-Islands | **React** (Theme-Panel, Token-Inspector, ggf. Kontrast-Badge) | Frisch gelernt, wird hier gezielt eingesetzt statt als SPA-Overkill. |
| Tokens | **DTCG-Format** (`.tokens.json` mit `$value`, `$type`, `$description`, Aliasing via `{pfad.zum.token}`) | Community-Standard, glaubwürdiges Statement. |
| Token-Build | **Style Dictionary v4** (DTCG-Support) → CSS Custom Properties | Echte Token-Pipeline statt hartcodierter Werte. |
| Farbe | **OKLCH** für alle Farb-Primitives | Perzeptuell gleichmäßig → Kontraste bleiben beim Hue-Wechsel stabil. |
| Styling | Vanilla CSS auf Basis der generierten Custom Properties, Klassennamen nach **BEM** (`block__element--modifier`) | Kein Utility-Framework, das die Token-Story verwässert. BEM macht die Komponentenstruktur im Markup lesbar; Astros Scoped Styles dürfen zusätzlich genutzt werden, ersetzen aber nicht die BEM-Benennung. |
| Sprache | **Website-Inhalte auf Englisch**, Kommunikation/Kommentare im Entwicklungsprozess auf Deutsch | Internationales Publikum für das Portfolio; Arbeitssprache mit Claude bleibt Deutsch. |
| Deployment | Statischer Build (z. B. Netlify/Vercel/Cloudflare Pages) | — |

## 3. Token-Architektur (3 Ebenen)

### 3.1 Ebene 1 — Primitive / Core
Rohe Werte ohne Bedeutung, nur Skalen. Beispiele:

- `color.accent.{50…950}` — OKLCH-Rampe mit **festen L/C-Stufen**, Hue als Variable
- `color.neutral.{50…950}` — entsättigte Rampe, minimal vom Accent-Hue getönt
- `space.{1…12}` — Basis 4px-Raster (4, 8, 12, 16, 24, 32, 48, 64 …)
- `font.size.{100…900}`, `font.weight.*`, `font.family.{display,body,mono}`
- `radius.{sm,md,lg,full}`, `duration.{fast,base,slow}`, `easing.*`

### 3.2 Ebene 2 — Semantic
Bedeutung, referenziert ausschließlich Primitives. Beispiele:

- `color.surface.{default,raised,sunken}`
- `color.text.{primary,secondary,muted,on-accent}`
- `color.border.{default,strong}`
- `color.interactive.{default,hover,active}`
- `space.inset.{xs…xl}`, `space.stack.{xs…xl}`, `space.inline.{xs…xl}`

Diese Ebene ist der **Umschaltpunkt**: Light/Dark und Dichte-Modi sind unterschiedliche Auflösungen der semantischen Tokens.

### 3.3 Ebene 3 — Component
Referenziert ausschließlich Semantics. Beispiele:

- `button.background`, `button.text`, `button.padding-inline`
- `card.background`, `card.padding`, `card.radius`
- `badge.*`, `timeline.marker.*`

**Regel:** Komponenten konsumieren nur Component-Tokens (mindestens Semantic-Tokens). Nie Primitives, nie Hex-Werte.

## 4. Runtime-Theming

### 4.1 Farbregler (Hue)
- Ein einziges `--hue`-Custom-Property am `:root` (0–360), gesteuert per Slider im Theme-Panel.
- Alle Farb-Primitives leiten sich daraus ab: `oklch(var(--l-500) var(--c-500) var(--hue))`.
- L- und C-Stufen sind **fest** → Kontrastverhältnisse zwischen semantischen Paaren (z. B. `text.primary` auf `surface.default`) bleiben konstant, egal welcher Hue gewählt ist.
- Neutral-Rampe: sehr niedriges Chroma, gleicher Hue → harmonische Tönung.
- Kein JS-Neuberechnen hunderter Variablen; nur `--hue` (und ggf. `--chroma-scale`) ändern sich.

### 4.2 Kontrast-Badge
- Neben dem Regler wird live das Kontrastverhältnis des kritischsten Paars angezeigt (WCAG-Ratio, optional zusätzlich APCA).
- Ziel: alle Text/Surface-Paare ≥ WCAG AA (4.5:1 Fließtext, 3:1 Large Text) — **per Konstruktion**, nicht per Prüfung im Einzelfall. Das Badge macht es sichtbar.

### 4.3 Farbschema
- Light/Dark über `data-theme="light|dark"` am `<html>`, Default via `prefers-color-scheme`.
- Umsetzung: semantische Tokens mappen je Schema auf andere Primitives (Rampe wird gespiegelt).

### 4.4 Dichte-Modi (Accessibility)
- `data-density="tight|normal|comfy"` am `<html>`.
- Semantische Spacing-Tokens (`space.inset.*`, `space.stack.*`) lösen je Modus auf andere Primitives auf (kein globaler Multiplikator auf Fontgrößen — Lesbarkeit bleibt unangetastet, nur Weißraum skaliert).
- Begründung im Case Study: tight für kleine Screens/Power-User, comfy für motorische Einschränkungen und Lesekomfort.

### 4.5 Persistenz & Robustheit
- Auswahl (Hue, Schema, Dichte) in `localStorage`, Inline-Script im `<head>` gegen Flash-of-wrong-theme.
- `prefers-reduced-motion` wird respektiert (alle Transitions/Animationen deaktivierbar).
- Fallback: ohne JS funktioniert die Seite vollständig mit Default-Theme.

## 5. Komponentenbibliothek (Minimal-Set)

Eigene kleine Bibliothek, die Component-Tokens konsumiert:

1. `Button` (primary / secondary / ghost)
2. `Card` (Projekt-Teaser, Case-Study-Abschnitte)
3. `Badge` / `Tag` (Skills, Tech-Stack, Kontrastwert)
4. `TimelineItem` (CV)
5. `TokenSwatch` / `TokenTable` (für die Docs-Seite)
6. `ThemePanel` (React Island)
7. `TokenInspector` (React Island, optional Phase 5): Toggle, der zeigt, welche semantischen Tokens ein Element konsumiert (Overlay/Tooltip).

Mini-"Docs"-Seite im Storybook-Stil: jede Komponente mit Varianten + den konsumierten Tokens.

## 6. Seitenstruktur & Inhalt

```
/               Home: These + Theme-Panel prominent, Projekt-Teaser, Kurz-Intro
/projects       Übersicht der Case Studies
/projects/[x]   Case Study: Problem → Ansatz → Entscheidung → Ergebnis
/about          Person + CV-Timeline ("Changelog"-Framing: v1.0 Ausbildung, v2.3 …)
/system         Das Meta-Case-Study: "How this site is built" + Token-Docs + Komponenten-Docs
```

- Hero der Startseite = die These der Seite: das Theme-Panel (oder eine kompakte Variante davon) ist sofort sichtbar und bedienbar — der Besucher *erlebt* das System in den ersten Sekunden.
- Alle sichtbaren Inhalte (Copy, Navigation, Case Studies, Timeline) auf **Englisch**.
- CV als Timeline mit Semver-Framing — seriös, aber mit Persönlichkeit.
- Case Studies betonen Entscheidungen, nicht Pixel.

## 7. Designrichtung (Rahmen, Feinschliff folgt im Bau)

**Leitbild: Schweizer Typografie / Bauhaus / HfG-Tradition (Ulm, Schwäbisch Gmünd) — aber mit Charakter, nicht steril.**

- Gestaltung aus dem Raster: sichtbare oder spürbare Grid-Logik, klare Achsen, großzügiger, bewusst gesetzter Weißraum. Ordnung ist hier Inhalt, nicht Dekoration — sie *ist* die Design-System-Haltung.
- Typografie trägt die Seite: starke, präzise gesetzte Grotesk für Headlines (z. B. aus der Neo-Grotesk-/Swiss-Tradition, konkrete Wahl beim Bau begründen), sehr gut lesbare Body-Schrift, Mono für Token-Namen und Code. Große Größenkontraste statt vieler Schmuckelemente.
- Farbe: zurückhaltende, überwiegend neutrale Flächen; der Accent (per Hue-Regler steuerbar) wird gezielt und flächig eingesetzt — Plakatfarbe statt Verlauf. **Keine Gradients, keine Blobs, keine Glassmorphism-/Glow-Effekte, kein Purple-Default.** Farbwirkung entsteht durch Fläche und Kontrast, nicht durch Effekte.
- Charakter gegen Sterilität (damit der Farbregler etwas zu zeigen hat): der interaktive Umgang mit dem System selbst ist das Signature-Element — z. B. flächige Accent-Zonen, die auf den Hue-Regler reagieren, sichtbare Token-Beschriftungen als gestalterisches Mittel (Mono-Labels im Layout), die Changelog-Timeline. Eine gezielte, begründete Regelbrechung im Raster ist erlaubt; beliebige Verspieltheit nicht.
- Motion: sparsam und funktional (Zustandswechsel des Themings, Fokus, kleine Übergänge). Kein Ambient-Gewaber. `prefers-reduced-motion` deaktiviert alles Nicht-Essentielle.
- Qualitäts-Floor: responsive bis Mobile, sichtbarer Tastatur-Fokus, semantisches HTML, Landmark-Regionen, Skip-Link.

## 8. Umsetzungsphasen

**Phase 1 — Fundament**
Astro-Projekt scaffolden, Ordnerstruktur, `/tokens` mit DTCG-JSON (alle 3 Ebenen), Style-Dictionary-Pipeline → `tokens.css`, Basis-Layout mit semantischem HTML.

**Phase 2 — Theming-Mechanik**
OKLCH-Rampen, `--hue`-Ableitung, `data-theme`, `data-density`, Persistenz + Head-Script, Kontrast-Nachweis (einmalig alle Paare gegen AA validieren).

**Phase 3 — Komponenten**
Button, Card, Badge, TimelineItem auf Component-Tokens; Docs-Seite `/system` mit TokenTable und Komponenten-Übersicht.

**Phase 4 — Theme-Panel (React Island)**
Hue-Slider, Schema-Toggle, Dichte-Auswahl, Kontrast-Badge live.

**Phase 5 — Inhalt & Extras**
Seiten befüllen (Projekte, About/Timeline, Meta-Case-Study), Token-Inspector, Feinschliff, Lighthouse/axe-Durchlauf.

**Definition of Done je Phase:** Build läuft, keine hartcodierten Farb-/Spacing-Werte in Komponenten, Tastaturbedienung geprüft, Commit.

## 9. Migration & Deployment (Bestandsseite)

### 9.1 Ausgangslage
- Bestehendes Portfolio: Vanilla HTML/CSS/JS im Repo `mgiang95/me`, gehostet via GitHub Pages unter `https://mgiang95.github.io/me/`.
- Inhalte sind bereits auf Englisch und gut strukturiert (About, Journey-Timeline mit Work/Education-Filter, 3 Use Cases + More Projects, Zertifikate/Awards, More About Me, Kontakt).

### 9.2 Vorgehen
- **Kein inkrementeller Umbau** — Neuaufbau in einem **neuen User-Page-Repo `mgiang95/mgiang95.github.io`**. Das alte Repo `me` bleibt unverändert live unter `/me/`, bis das neue Portfolio fertig ist (kein Zeitdruck, keine Downtime).
- **Content-Harvest als erster Schritt:** Alt-Code des `me`-Repos einmalig nach `/legacy` ins neue Repo kopieren (nur als Quelle, wird nicht deployed und nach der Migration gelöscht). Daraus alle Inhalte (Texte, Projektdaten, Timeline-Einträge, Bilder aus `/img`) in strukturierte Dateien unter `/src/content` extrahieren (Astro Content Collections: `projects`, `timeline`, `certifications` …). Bilder nach `/public` bzw. optimiert via Astro Assets.
- **Cutover:** Sobald die neue Seite live ist, im alten `me`-Repo alle Seiten durch schlanke Redirect-HTMLs ersetzen (`index.html` → `https://mgiang95.github.io/`, `usecase-*.html` → `https://mgiang95.github.io/projects/[slug]`), damit bestehende Links (z. B. von LinkedIn) nicht brechen. Danach `me`-Repo archivieren.
- Das alte Portfolio wird Teil der Story: Eintrag in der Changelog-Timeline (z. B. „v1.0 — first portfolio, hand-built with vanilla HTML/CSS/JS") mit Screenshot und kurzer Reflexion; das Meta-Case-Study auf `/system` referenziert den Sprung von v1 zu v2.

### 9.3 GitHub-Pages-Konfiguration
- Deployment über GitHub Actions (offizielle Astro-Action, `withastro/action`), Build bei Push auf `main`. Pages-Source im Repo auf „GitHub Actions" stellen. Anleitung: https://docs.astro.build/en/guides/deploy/github/
- `astro.config.mjs`: `site: 'https://mgiang95.github.io'`. **Kein `base` nötig** (User Page läuft unter der Root-URL). Interne Links trotzdem über Astro-Konventionen bauen, nicht hartcodiert.

## 10. Umsetzungsphasen — Ergänzung

**Phase 0 — Migration vorbereiten:** Alt-Code aus dem `me`-Repo nach `/legacy` kopieren, Content-Harvest in Content Collections, Bilder übernehmen.

**Phase 6 — Deployment & Cutover:** GitHub-Actions-Workflow, Pages-Source auf „GitHub Actions", Links/Assets auf der Live-URL verifizieren, Lighthouse/axe-Check, dann Redirects im alten `me`-Repo einrichten und `me` archivieren, `/legacy` löschen.

**Phase 7 — AI-Ready-Schicht** *(umgesetzt, vorgezogen vor Phase 6)*: Governance-Auditor, Component-Metadata als gemeinsame Quelle für Docs und AI-Tooling, pfad-konfigurierbare Pipeline. Details in §12.

## 11. Nicht-Ziele

- Kein CMS, keine Datenbank, kein Auth.
- Keine SPA-Navigation, kein clientseitiges Routing.
- Keine Effekt-Themes (Retro, Win95 o. ä.).
- Kein Utility-CSS-Framework.

## 12. AI-Ready-Schicht & Wiederverwendung

Das System ist nicht nur für Menschen dokumentiert, sondern als abfragbare Datenstruktur angelegt (nach dem Muster von C. Morales Achiardis Serie „Building an AI-Ready Design System"), bewusst herunterskaliert auf die Projektgröße: Verträge früh festlegen, Automatisierung an Wachstums-Trigger knüpfen.

### 12.1 Governance als Code

`npm run audit` (`scripts/audit-tokens.mjs`) erzwingt die Architektur-Invarianten maschinell und bricht den Build bei Verstößen ab:

- **T1–T4** Token-Hierarchie: Primitives referenzieren nichts, Semantic nur Primitives, Component nur Semantic; jede Referenz muss existieren.
- **C1–C5** Autoren-CSS: keine Farb-Literale, kein px außer 1–2px-Haarlinien, jede `var(--*)` existiert im generierten CSS, Komponenten konsumieren keine Primitives, BEM-Block = Dateiname.
- **M1–M2** Metadata: jede Komponente hat eine `*.metadata.json` mit Pflichtfeldern (und umgekehrt — verwaiste Metadata ist ein Fehler); deklarierte `tokenPrefixes` existieren in `/tokens/component`.

Alle Scripts (Build, Kontrast-Proof, Auditor) lesen ihre Pfade aus `scripts/ds.config.mjs` und laufen unverändert in jedem Projekt, das die Token-Schicht übernimmt.

### 12.2 Component-Metadata als Single Source

Jede Komponente trägt eine co-located `<Name>.metadata.json`: `description`, `renderer`, `jsRequired`, `variants`, `usage.useCases`, `usage.antiPatterns` (`scenario`/`reason`/`alternative`), optional `selectionCriteria`, `tokenPrefixes`, `a11y`. Dieselbe Datei dient zwei Konsumenten: AI-Tooling fragt sie ab, bevor es Komponenten anlegt oder ändert („prefer editing over creating"), und `ComponentDoc.astro` rendert daraus die Komponenten-Docs auf `/system` — menschen- und maschinenlesbare Dokumentation können nicht auseinanderlaufen.

### 12.3 Wiederverwendungs-Architektur (Schichtung)

```
Tokens        primitives/ + semantic/ + Pipeline + Auditor  → projekt-agnostisch, extrahierbar
Component-CSS token-basierte Styles (Button, Card …)        → wiederverwendbar über Projekte
Wrapper       dünne Render-Hüllen je Kontext                → Astro (Portfolio), Lit/Framework (SPAs)
```

- Die Substanz statischer Komponenten liegt in Tokens + CSS, nicht im Markup — Wrapper sind einzeilig und dürfen je Konsument verschieden sein.
- **Rolle entscheidet über Technologie:** Struktur/Content = Astro (No-JS-Invariante); verhaltenslastige, projektübergreifende Komponenten = Lit-Kandidaten (Custom Properties durchdringen Shadow DOM, die Kontrast-Garantie gilt automatisch). React bleibt Konsument/Showcase. Astro 5 hat kein offizielles Lit-SSR — Lit deshalb nie für content-kritisches Rendering im Portfolio.
- Möglicher Pilot vor der Extraktion: TokenInspector als Lit-Komponente — dann zeigt `/system` dasselbe Token-System in drei Renderern (Astro statisch, React-Island, Web Component).

### 12.4 Wachstums-Trigger (nicht vorzeitig bauen)

| Trigger | Dann |
|---|---|
| Zweiter Konsument existiert real (erste SPA) | Tokens + Pipeline + Auditor als eigenes Paket/Repo extrahieren; ab da Semver + Changelog (jede Token-Änderung ist potenziell breaking). |
| ~15–20 Komponenten oder erste „Gibt es X schon?"-Unsicherheit | Auto-generierter Codebase-Index (JSON: Komponenten, `uses`/`usedBy`). Vorher ist der Graph trivial. |
| Erste verhaltenslastige, projektübergreifende Komponente | Lit-Komponenten-Paket beginnen (Wrapper um bestehende Component-CSS). |
| CI-Workflow entsteht (Phase 6) | Token-Build + Kontrast-Proof + Audit als Steps im selben GitHub-Actions-Workflow. |
