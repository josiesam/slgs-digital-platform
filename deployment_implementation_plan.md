# Vercel Deployment Plan: SLGS Digital Platform Monorepo

This document outlines the end-to-end architecture and step-by-step procedure for deploying the **Sierra Leone Grammar School (SLGS) Digital Platform** monorepo to **Vercel**, including custom domain configuration for all three applications under the official school domain (`slgs.edu.sl`).

---

## 1. Overview & Architecture Strategy

The SLGS Digital Platform is structured as a TypeScript monorepo using **Turborepo** and **pnpm workspaces**:

- **`apps/web`** — Public Website ([`https://slgs.edu.sl`](https://slgs.edu.sl) & [`https://www.slgs.edu.sl`](https://www.slgs.edu.sl))
- **`apps/cms`** — Private CMS Portal ([`https://cms.slgs.edu.sl`](https://cms.slgs.edu.sl))
- **`apps/sims`** — Private S.I.M.S. Portal ([`https://sims.slgs.edu.sl`](https://sims.slgs.edu.sl))

Each application will be deployed as a **separate Vercel Project** within the same Vercel Organization. This preserves strict domain isolation, independent deployment pipelines, custom environment variable scoping, and isolated runtime access while allowing Turborepo remote caching for shared packages (`@slgs/ui`, `@slgs/auth`, `@slgs/db`, `@slgs/permissions`, etc.).

---

## 2. Vercel Project Configurations

Create **3 Projects** in the Vercel Dashboard:

### Project 1: `slgs-web` (Public Website)

- **Framework Preset**: Vite / TanStack Start
- **Root Directory**: `apps/web`
- **Build Command**: `pnpm run build` _(Vercel runs `turbo run build --filter=@slgs/web` automatically when Root Directory is set)_
- **Output Directory**: Leave **Default / Empty** (or `.vercel/output`) _(Nitro builds using Vercel Build Output API v3 format)_
- **Install Command**: `pnpm install`
- **Node.js Version**: `24.x`

### Project 2: `slgs-cms` (Editorial CMS)

- **Framework Preset**: Vite / TanStack Start
- **Root Directory**: `apps/cms`
- **Build Command**: `pnpm run build`
- **Output Directory**: Leave **Default / Empty** (or `.vercel/output`)
- **Install Command**: `pnpm install`
- **Node.js Version**: `24.x`

### Project 3: `slgs-sims` (S.I.M.S. Admin Portal)

- **Framework Preset**: Vite / TanStack Start
- **Root Directory**: `apps/sims`
- **Build Command**: `pnpm run build`
- **Output Directory**: Leave **Default / Empty** (or `.vercel/output`)
- **Install Command**: `pnpm install`
- **Node.js Version**: `24.x`

> [!IMPORTANT]
> Ensure **"Output Directory" Override is DISABLED / Left Empty** so Vercel native build integration correctly finds `.vercel/output`. Also ensure **"Include files outside the Root Directory in the Build Step"** remains **enabled** (default in Vercel Monorepo mode) so Vercel can access shared workspace packages inside `packages/*`.

---

## 3. Official School Domain Configuration (`slgs.edu.sl`)

To link the official school domains to each Vercel deployment:

### Step 3.1: Add Domains in Vercel Dashboard

1. **`slgs-web` Project Settings → Domains**:
   - Add `slgs.edu.sl` (Set as Primary Domain)
   - Add `www.slgs.edu.sl` (Configured to automatically redirect to `slgs.edu.sl`)

2. **`slgs-cms` Project Settings → Domains**:
   - Add `cms.slgs.edu.sl`

3. **`slgs-sims` Project Settings → Domains**:
   - Add `sims.slgs.edu.sl`

### Step 3.2: Configure DNS Records at Domain Registrar

At the DNS provider / registrar for `slgs.edu.sl`, add the following DNS records:

| Record Type | Name / Host | Value / Target          | Target Vercel Project | Purpose                                  |
| :---------- | :---------- | :---------------------- | :-------------------- | :--------------------------------------- |
| **A**       | `@` (apex)  | `76.76.21.21`           | `slgs-web`            | Public Web Apex Domain                   |
| **CNAME**   | `www`       | `cname.vercel-dns.com.` | `slgs-web`            | Public Web WWW Alias (Redirects to Apex) |
| **CNAME**   | `cms`       | `cname.vercel-dns.com.` | `slgs-cms`            | Private CMS Subdomain                    |
| **CNAME**   | `sims`      | `cname.vercel-dns.com.` | `slgs-sims`           | Private S.I.M.S. Subdomain               |

> [!NOTE]
> Vercel automatically provisions SSL/TLS certificates via Let's Encrypt / ZeroSSL as soon as DNS records resolve.

---

## 4. Environment Variables Matrix

Configure environment variables under Project Settings for each project:

| Variable Name          |      `slgs-web`       |        `slgs-cms`         |        `slgs-sims`         |            Secret / Required            |
| :--------------------- | :-------------------: | :-----------------------: | :------------------------: | :-------------------------------------: |
| `DATABASE_URL`         | Optional / Read-only  |            Yes            |            Yes             | Yes (Neon PostgreSQL pooler connection) |
| `BETTER_AUTH_SECRET`   |           —           |            Yes            |            Yes             |        Yes (High-entropy secret)        |
| `BETTER_AUTH_URL`      |           —           | `https://cms.slgs.edu.sl` | `https://sims.slgs.edu.sl` |                   Yes                   |
| `PUBLIC_SITE_URL`      | `https://slgs.edu.sl` |   `https://slgs.edu.sl`   |   `https://slgs.edu.sl`    |                   Yes                   |
| `R2_ACCOUNT_ID`        |           —           |            Yes            |             —              |           Yes (Media uploads)           |
| `R2_ACCESS_KEY_ID`     |           —           |            Yes            |             —              |                   Yes                   |
| `R2_SECRET_ACCESS_KEY` |           —           |            Yes            |             —              |                   Yes                   |
| `R2_BUCKET_NAME`       |           —           |            Yes            |             —              |                   Yes                   |

---

## 5. Security & Isolation Rules

> [!CAUTION]
> S.I.M.S. data contains sensitive student, staff, attendance, and financial records. Strict production security boundaries must be maintained:

1. **No Shared Cookies across subdomains**: Better Auth session cookies for CMS (`cms.slgs.edu.sl`) and S.I.M.S. (`sims.slgs.edu.sl`) must remain host-scoped (`Domain=cms.slgs.edu.sl` and `Domain=sims.slgs.edu.sl`), NOT wildcard domain-wide (`Domain=.slgs.edu.sl`).
2. **Server-Side Authorization**: UI hiding is not security. All backend APIs, loaders, and server actions must enforce explicit role-based authorization.
3. **Database Access Roles**: Ensure production `DATABASE_URL` uses pooled connection strings with SSL enabled (`sslmode=require`).

---

## 6. Verification Plan & Checklist

### Automated Build Verification

- Execute `pnpm run check` (Typecheck + Lint + Unit Tests + Workspace Build) locally or in GitHub Actions prior to merging to `main`.

### Manual Post-Deployment Verification

| Verification Step            | Target Domain                                          | Expected Behavior                                                                       |
| :--------------------------- | :----------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| **Public Website Access**    | [`https://slgs.edu.sl`](https://slgs.edu.sl)           | Loads public school homepage; clean SSL cert; HTTPS redirect                            |
| **WWW Redirect**             | [`https://www.slgs.edu.sl`](https://www.slgs.edu.sl)   | 301 Redirects to `https://slgs.edu.sl`                                                  |
| **CMS Portal**               | [`https://cms.slgs.edu.sl`](https://cms.slgs.edu.sl)   | Loads private CMS authentication & editorial dashboard                                  |
| **S.I.M.S. Portal**          | [`https://sims.slgs.edu.sl`](https://sims.slgs.edu.sl) | Loads S.I.M.S. administrative portal                                                    |
| **Cross-App Data Isolation** | Public Web                                             | Public Web routes return zero S.I.M.S. administrative endpoints or confidential records |
