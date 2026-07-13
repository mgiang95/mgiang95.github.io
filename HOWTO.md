# HOWTO — Wie dieses Portfolio funktioniert

Eine Einsteiger-Anleitung für dieses Repo. Für die tieferen Design-Entscheidungen
siehe `SPEC.md`, für die verbindlichen Regeln `CLAUDE.md`. Dieses Dokument
erklärt das **Wie**: Technologie, Befehle, Komponenten, Inhalte.

---

## 1. Was ist das hier?

Ein Portfolio für einen Design System Engineer — und die Website ist selbst
das Case Study: Sie läuft auf einer echten Design-Token-Pipeline mit
Live-Theming (Hue-Regler, Light/Dark, Dichte-Modi).

**Tech-Stack in einem Satz:** Astro rendert die Seiten als statisches HTML,
React und Lit liefern die wenigen interaktiven Inseln, und alle Design-Werte
(Farben, Abstände, Schriftgrößen) kommen aus JSON-Token-Dateien, die per
Build-Schritt zu CSS werden.

### Was ist Astro?

Astro ist ein Static Site Generator: Beim Build (`astro build`) werden alle
Seiten **einmal** zu fertigem HTML gerendert. Der Besucher bekommt also keine
JavaScript-App geliefert, sondern normale HTML-Seiten — schnell und ohne JS
nutzbar.

Die wichtigsten Konzepte:

- **`.astro`-Dateien** sehen aus wie HTML mit einem Codeblock oben drüber:

  ```astro
  ---
  // Dieser Teil ("Frontmatter") ist JavaScript/TypeScript.
  // Er läuft NUR beim Build, nie im Browser.
  const name = "Michael";
  ---
  <!-- Ab hier: HTML mit {Ausdrücken} wie in JSX -->
  <h1>Hello, {name}</h1>

  <style>
    /* Scoped: gilt nur für diese Komponente */
    h1 { color: var(--color-text-primary); }
  </style>
  ```

- **Islands:** Standardmäßig landet **kein** JavaScript im Browser. Nur
  Komponenten mit einer `client:*`-Direktive (z. B.
  `<ThemePanel client:load />`) werden im Browser interaktiv. Alles andere
  ist reines HTML.
- **Routing über Dateien:** Jede Datei in `src/pages/` wird eine URL.
  `src/pages/about.astro` → `/about`. Eckige Klammern sind Platzhalter:
  `src/pages/notes/[slug].astro` erzeugt eine Seite **pro Note**.
- **Content Collections:** Inhalte (Projekte, Notes, Bücher …) liegen als
  Markdown/JSON/YAML in `src/content/`. Astro prüft sie beim Build gegen ein
  Schema (`src/content.config.ts`) — Tippfehler im Frontmatter fallen sofort
  auf, statt still kaputt zu rendern.

### Warum drei UI-Technologien?

| Technologie | Wofür | Beispiel |
|---|---|---|
| **Astro** | Alles Statische: Struktur, Inhalt | `Button`, `Card`, `TimelineItem` |
| **React** | Interaktive Inseln mit State | `ThemePanel` (Hue-Regler, Kontrast-Badge) |
| **Lit (Web Component)** | Wiederverwendbares Verhalten, auch außerhalb dieses Projekts | `TokenInspector` |

Faustregel: Neue Komponenten sind **Astro**, außer sie brauchen zwingend
Interaktivität im Browser.

---

## 2. Die Token-Pipeline (das Herzstück)

**Regel Nr. 1 des Repos:** Komponenten enthalten keine hartcodierten
Design-Werte. Kein `#333`, kein `16px`, kein `rgb()`. Stattdessen:

```
/tokens/*.tokens.json  →  npm run tokens  →  src/styles/tokens.css  →  var(--…) in Komponenten
```

1. **Tokens** sind JSON-Dateien im DTCG-Format (`$value`, `$type`) in `/tokens`.
2. **`npm run tokens`** (läuft automatisch bei `dev` und `build`) generiert
   daraus `src/styles/tokens.css` mit CSS Custom Properties.
3. **Komponenten** benutzen nur `var(--token-name)`.

Die Tokens haben **drei Ebenen** — die Richtung ist strikt:

```
Primitives  →  Semantic  →  Component
(Rohwerte)     (Bedeutung)   (pro Komponente)
```

- **Primitives** (`tokens/primitives/`): rohe Werte-Skalen, z. B.
  `color.neutral.100`, `dimension.4`. Referenzieren nichts.
- **Semantic** (`tokens/semantic/`): geben Werten Bedeutung, z. B.
  `color.text.primary`, `space.inset.m`. Referenzieren **nur** Primitives.
- **Component** (`tokens/component/`): z. B. `button.radius`,
  `card.padding`. Referenzieren **nur** Semantic-Tokens.

Komponenten-CSS konsumiert nur Component- oder Semantic-Tokens, nie
Primitives direkt.

**Willst du eine Farbe oder einen Abstand ändern?** → Immer in der passenden
`.tokens.json` ändern, dann `npm run tokens` (oder einfach `npm run dev`
neu starten). **Niemals** `src/styles/tokens.css` von Hand editieren — die
Datei wird bei jedem Build überschrieben.

### Der Wächter: `npm run audit`

`scripts/audit-tokens.mjs` prüft die Regeln maschinell (Token-Hierarchie,
BEM-Klassennamen, Metadata-Pflicht, Kontrast-Abdeckung) und **bricht den
Build ab**, wenn etwas verletzt ist. Wenn `npm run build` mit einer
T1/C1/M1/P1-Meldung fehlschlägt, sagt dir die Meldung genau, welche Regel
wo verletzt wurde.

---

## 3. Befehle

Alle Befehle laufen im Projekt-Root:

| Befehl | Was er tut |
|---|---|
| `npm install` | Abhängigkeiten installieren (einmalig / nach `git pull`) |
| `npm run dev` | Tokens bauen + Dev-Server starten (`http://localhost:4321`), lädt bei Dateiänderungen automatisch neu |
| `npm run build` | Kompletter Produktions-Build: Tokens → Kontrast-Proof → Auditor → Tests → Astro-Build nach `dist/` |
| `npm run preview` | Den fertigen `dist/`-Build lokal anschauen |
| `npm run tokens` | Nur die Token-Pipeline laufen lassen (JSON → CSS) |
| `npm run check:contrast` | Beweist, dass alle Text/Flächen-Paare für jeden Hue WCAG AA erfüllen |
| `npm run audit` | Regel-Wächter (Token-Hierarchie, BEM, Metadata) |
| `npm test` | Unit-Tests in `/test` (testet die Wächter-Scripts selbst) |
| `npm run clean` | Build-Caches löschen (hilft bei komischen Cache-Problemen) |

**Vor jedem Commit:** `npm run build` einmal durchlaufen lassen — das führt
alle Prüfungen in der richtigen Reihenfolge aus.

**Deployment:** passiert automatisch. Ein Push auf `main` triggert die
GitHub Action, die die Seite auf `https://mgiang95.github.io/` deployed.
Du musst nie von Hand deployen.

---

## 4. Verzeichnisstruktur

```
/tokens                 Design-Tokens als JSON (primitives/ semantic/ component/)
/scripts                Token-Build, Kontrast-Proof, Auditor; Pfade in ds.config.mjs
/test                   Tests für die Scripts (node:test, kein Framework)
/src
  /styles               tokens.css (GENERIERT — nicht anfassen) + globale Styles
  /components           Alle UI-Komponenten + je eine *.metadata.json
  /layouts              BaseLayout.astro (Grundgerüst jeder Seite: <head>, Nav, Footer)
  /pages                Routen: index, about, system, notes/, projects/, imprint
  /content              Inhalte (Markdown/JSON/YAML) — hier änderst du Texte
  /content.config.ts    Schemas: welche Felder jede Inhaltsart haben muss
  /assets               Bilder (werden von Astro optimiert)
  /lib                  Hilfsfunktionen (Farb-Mathe, Datum, Lesezeit …)
/legacy                 Alter Website-Stand — nur Migrationsquelle, nie deployen
```

---

## 5. Komponenten verwenden

Komponenten importierst du im Frontmatter und benutzt sie wie HTML-Tags.
Inhalt zwischen den Tags landet im `<slot />` der Komponente:

```astro
---
import Button from "../components/Button.astro";
import Card from "../components/Card.astro";
---

<Button variant="secondary" href="/projects">View projects</Button>

<Card>
  <h3>Ein Titel</h3>
  <p>Beliebiger Inhalt — landet im Slot der Card.</p>
</Card>
```

**Welche Props hat eine Komponente?** Zwei Quellen:

1. Das `interface Props` oben in der `.astro`-Datei (die Wahrheit im Code).
2. Die Seite **`/system`** im Dev-Server — dort werden alle Komponenten mit
   Varianten, Einsatzzwecken und Anti-Patterns dokumentiert (gerendert aus
   den `*.metadata.json`-Dateien).

**Bevor du etwas Neues baust:** Erst auf `/system` bzw. in den
Metadata-Dateien schauen, ob eine bestehende Komponente den Fall schon
abdeckt. Eine Variante/Prop ergänzen schlägt Neuanlage.

---

## 6. Eine neue Komponente erstellen

Der Workflow ist verbindlich und geht in dieser Reihenfolge:

**Schritt 1 — Component-Tokens definieren.**
Neue Datei `tokens/component/meinblock.tokens.json`, die nur
Semantic-Tokens referenziert:

```json
{
  "meinblock": {
    "padding": {
      "$type": "dimension",
      "$value": "{space.inset.m}",
      "$description": "Inner padding of the block."
    }
  }
}
```

Danach `npm run tokens` — jetzt existiert `var(--meinblock-padding)`.

**Schritt 2 — Komponente bauen.**
`src/components/MeinBlock.astro`. CSS-Klassen strikt nach **BEM**, Blockname
= Komponentenname in kebab-case:

```astro
---
/** MeinBlock — one-line description of what it does. */
interface Props {
  variant?: "default" | "highlight";
}
const { variant = "default" } = Astro.props;
---
<div class={`mein-block mein-block--${variant}`}>
  <slot />
</div>

<style>
  .mein-block {
    padding: var(--meinblock-padding); /* nur Tokens, nie px/hex! */
  }
</style>
```

**Schritt 3 — Metadata schreiben.**
`src/components/MeinBlock.metadata.json` mit den Pflichtfeldern `name`,
`description`, `renderer`, `jsRequired`, `variants`, `usage.useCases`,
`usage.antiPatterns`, `tokenPrefixes`, `a11y`. Am einfachsten: eine
bestehende Datei (z. B. `Badge.metadata.json`) kopieren und anpassen.
Der Auditor bricht ohne diese Datei den Build ab.

**Schritt 4 — Auf `/system` dokumentieren.**
In `src/pages/system.astro` einen `ComponentDoc`-Eintrag ergänzen (den
bestehenden Einträgen nachbauen).

**Schritt 5 — Prüfen und committen.**
`npm run build` → wenn grün: kleiner Commit.

---

## 7. Inhalte ändern (Content Collections)

Alle Texte der Seite liegen in `src/content/` — du änderst Inhalte, indem du
diese Dateien bearbeitest. Kein Code nötig. **Sichtbare Inhalte sind immer
auf Englisch.**

| Ordner | Format | Was |
|---|---|---|
| `projects/` | Markdown | Case Studies und kleinere Projekte |
| `notes/` | Markdown | Notes (Blog-artige Einträge) |
| `books/` | JSON | Reading-Log auf /about (eine Datei pro Buch) |
| `timeline/` | YAML | CV-Timeline auf /about |
| `certifications/` | JSON | Zertifikate, Stipendien, Awards |
| `about/` | Markdown | Intro/Bio-Text |

Jede Datei hat **Frontmatter** (der `---`-Block oben): Metadaten wie Titel
und Datum. Welche Felder erlaubt/Pflicht sind, definiert
`src/content.config.ts` — bei einem fehlenden Pflichtfeld schlägt der Build
mit einer klaren Fehlermeldung fehl.

Nützliche Flags in mehreren Collections:

- `draft: true` — Eintrag wird nicht auf der Website angezeigt (Entwurf).
- `featured: true` (nur Projekte) — volles Case Study mit eigener Seite;
  `false` = kurzer Eintrag in der "more projects"-Liste.
- `order` (Projekte/Timeline) — Sortierreihenfolge.

Bilder gehören nach `src/assets/…` und werden im Frontmatter relativ
referenziert (z. B. `heroImage: ../../assets/projects/Foo-hero.jpg`) —
Astro optimiert sie beim Build automatisch.

---

## 8. Eine neue Note erstellen

Das ist der einfachste Weg, Inhalt zu veröffentlichen:

**1. Datei anlegen:** `src/content/notes/mein-thema.md` — der Dateiname
wird die URL (`/notes/mein-thema`). Kleinbuchstaben und Bindestriche.

**2. Frontmatter + Text schreiben:**

```markdown
---
title: "My note title"
description: "One or two sentences — shown in the notes list and as meta description."
date: 2026-07-12
---

Regular Markdown from here on. Paragraphs, **bold**, [links](/system),
`inline code`, lists, headings with ##.
```

**3. Anschauen:** `npm run dev` → `http://localhost:4321/notes`. Die Liste
auf `/notes` und die Einzelseite entstehen automatisch — nichts weiter zu
registrieren. Lesezeit und Datumsformat kommen aus `src/lib/notes.ts`.

**Noch nicht fertig?** `draft: true` ins Frontmatter, dann bleibt die Note
unsichtbar, bis du das Flag entfernst.

**4. Veröffentlichen:** committen und auf `main` pushen — die GitHub Action
deployed automatisch.

---

## 9. Theming — wie Light/Dark & Co. funktionieren

Kurzfassung, damit du den Mechanismus nicht versehentlich umgehst:

- `data-theme="light|dark"` und `data-density="tight|normal|comfy"` am
  `<html>`-Element plus `--hue` am `:root` steuern das gesamte Erscheinungsbild.
- Die generierte `tokens.css` definiert pro Attribut-Kombination andere
  Werte für dieselben Custom Properties — Komponenten merken davon nichts,
  sie benutzen einfach `var(--…)`.
- Ein Inline-Script im `<head>` liest `localStorage` **vor** dem ersten
  Paint, damit nichts flackert.
- Farben sind in **OKLCH** definiert mit festen Lightness/Chroma-Stufen und
  `var(--hue)` als Farbton — deshalb kann `check:contrast` beweisen, dass
  jeder Hue-Wert WCAG AA erfüllt.

Keine parallelen Theming-Mechanismen einführen (keine `.dark`-Klassen,
keine zweiten Stores).

---

## 10. Spickzettel: Die Regeln in einer Minute

1. Kein Hex, kein px-Spacing, kein rgb() in Komponenten — nur `var(--token)`.
2. Design-Werte ändern = Token-JSON ändern, nie generiertes CSS.
3. Token-Richtung: Primitives → Semantic → Component. Nie abkürzen.
4. Neue Komponente: Tokens → Komponente → Metadata → /system-Eintrag.
5. CSS-Klassen nach BEM (`block__element--modifier`).
6. Astro als Default; React/Lit nur wenn Interaktivität es verlangt.
7. Seite muss ohne JavaScript funktionieren.
8. Website-Texte Englisch, Commits klein, vor dem Commit `npm run build`.
9. Bei Unsicherheit: `SPEC.md` lesen oder fragen — nicht raten.
