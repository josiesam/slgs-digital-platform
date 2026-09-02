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

  /* Interaction */
  --slgs-purple-hover: #542f7f;
  --slgs-focus: #9a78c2;
}