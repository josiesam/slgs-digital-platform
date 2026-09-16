---
name: slgs-ui
description: SLGS project-specific UI/UX and engineering skill covering the Public Web, CMS, and S.I.M.S. applications, including SLGS visual identity, responsive design, accessibility, and application-specific design language.
---

# SLGS UI

Build interfaces for the Sierra Leone Grammar School (SLGS) ecosystem.

The SLGS digital ecosystem has three distinct products:

- **Public Web** — institutional, welcoming, prestigious, informative.
- **CMS** — editorial, content-focused, structured, efficient.
- **S.I.M.S.** — operational, data-heavy, efficient, clear, and task-oriented.

All three products should share a coherent SLGS identity while adapting their UI patterns to their specific purpose.

---

## 1. Core Design Principles

### SLGS should feel

- Established
- Academic
- Traditional
- Welcoming
- Trustworthy
- Proud
- Modern without being trendy
- Clean and restrained
- Human rather than corporate

### Avoid

Do not use generic AI-generated SaaS/dashboard aesthetics.

Avoid:

- Excessive rounded cards
- Excessive gradients
- Neon colors
- Glassmorphism
- Excessive shadows
- Purple/blue "AI" gradients
- Generic startup landing pages
- Overly decorative interfaces
- Excessive animations
- Dashboard layouts in the Public Web
- Arbitrary colors unrelated to the SLGS identity
- Navy/blue/gold as the default SLGS palette

The interface should look like it belongs to a **historic educational institution**, not an AI startup.

---

# 2. SLGS Visual Identity

The primary visual reference for SLGS UI is the school's actual uniform.

The uniform establishes the following visual language:

- White shirt
- Purple school tie
- Shiny silver/gray tie stripes
- Khaki trousers
- Dark charcoal/black accessories
- Small red details from the school badge

Therefore, the website's visual identity should be based primarily on:

> **Purple + White + Silver + Khaki**

with charcoal for typography and red used only as a restrained accent.

## Sporting House Identity

SLGS also has a distinct **five-house sporting system**. When designing pages, components, events, results, profiles, badges, filters, standings, or other UI related specifically to sporting houses, use the house colors visible in the school's sporting-house reference:

- **Primus** — Red
- **Secundus** — Green
- **Tertius** — Sky Blue
- **Quartus** — Navy Blue
- **Quintus** — Yellow

These are **contextual sporting-house colors**, not replacements for the main SLGS institutional palette.

Use them to identify and distinguish houses clearly. Keep the overall application structure grounded in the core SLGS identity of purple, white, silver, khaki, and charcoal.

---

# 3. SLGS Color Tokens

Use CSS variables rather than scattering raw colors throughout components.

```css
:root {
  /* Primary SLGS identity */
  --slgs-purple: #69439a;
  --slgs-purple-dark: #42245f;
  --slgs-purple-light: #8564ae;

  /* Silver / metallic tie stripes */
  --slgs-silver: #a7a9ac;
  --slgs-silver-light: #e1e2e3;
  --slgs-silver-dark: #73767a;

  /* Khaki uniform trousers */
  --slgs-khaki: #c2b28a;
  --slgs-khaki-light: #eee9dc;
  --slgs-khaki-dark: #8d7d58;

  /* White / page surfaces */
  --slgs-white: #ffffff;
  --slgs-off-white: #faf9f6;

  /* Typography */
  --slgs-ink: #252329;
  --slgs-muted: #65616a;

  /* Borders */
  --slgs-border: #dedbe1;

  /* Badge accent */
  --slgs-red: #c94a43;

  /* Sporting house colors */
  --house-primus: #c83a32;
  --house-secundus: #2f7d3b;
  --house-tertius: #79b6d6;
  --house-quartus: #2f6287;
  --house-quintus: #d39a22;

  /* Sporting house supporting shades */
  --house-primus-light: #f5d9d7;
  --house-secundus-light: #dcecdf;
  --house-tertius-light: #dcecf5;
  --house-quartus-light: #dbe5ec;
  --house-quintus-light: #f7ebc9;

  /* Interaction */
  --slgs-purple-hover: #542f7f;
  --slgs-focus: #9a78c2;
}

---

# 4. Sporting House Color Usage

## When to use house colors

Use the sporting-house palette for content that is directly associated with the five houses, including:

- Sports days and inter-house competitions
- House profile pages
- House standings and score tables
- Results and leaderboards
- Team/player identification
- Event schedules
- House badges, labels, and chips
- Filter states where each filter represents a house
- Data visualizations comparing houses
- Sports photography captions or overlays

### House mapping

| House | Primary color | CSS token |
|---|---|---|
| Primus | Red | `--house-primus` |
| Secundus | Green | `--house-secundus` |
| Tertius | Sky Blue | `--house-tertius` |
| Quartus | Navy Blue | `--house-quartus` |
| Quintus | Yellow | `--house-quintus` |

## Usage rules

1. **Always preserve the house mapping.** Do not assign a different color to a house.
2. **Use house colors as semantic identifiers.** A user should be able to recognise a house consistently across the entire SLGS ecosystem.
3. **Do not turn the whole interface into a five-color rainbow.** Use the main SLGS palette for navigation, page structure, typography, and general UI.
4. **Apply house colors selectively** to borders, badges, headings, score indicators, tabs, charts, icons, and other house-specific elements.
5. **Use the light house variants for backgrounds** where a full-strength house color would be visually overwhelming.
6. **Maintain accessible contrast.** Do not assume white text will work on every house color, especially sky blue and yellow.
7. **Avoid relying on color alone.** Pair house colors with the house name, icon, label, or another clear identifier.

### Example

```css
.house-card[data-house="primus"] {
  border-left: 4px solid var(--house-primus);
}

.house-card[data-house="secundus"] {
  border-left: 4px solid var(--house-secundus);
}

.house-card[data-house="tertius"] {
  border-left: 4px solid var(--house-tertius);
}

.house-card[data-house="quartus"] {
  border-left: 4px solid var(--house-quartus);
}

.house-card[data-house="quintus"] {
  border-left: 4px solid var(--house-quintus);
}
```

## Important distinction

**SLGS institutional identity** and **sporting-house identity** serve different purposes:

- **Institutional UI:** Purple, white, silver, khaki, charcoal, with restrained red accents.
- **Sporting-house UI:** Red, green, sky blue, navy blue, and yellow, used when representing Primus, Secundus, Tertius, Quartus, and Quintus.

When a screen is about the school generally, lead with the institutional palette. When a screen compares, celebrates, or identifies sporting houses, introduce the corresponding house colors as a semantic layer.
