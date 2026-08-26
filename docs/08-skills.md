# Recommended Agent Skills

Install a small, intentional set. Do not install dozens of overlapping skills.

## Core

Recommended:
- frontend-design
- vercel-react-best-practices
- shadcn
- tanstack-start
- react-patterns
- drizzle-orm-patterns
- better-auth
- zod-validation-utilities
- turborepo-monorepo
- tdd
- testing-library
- accessibility
- web-design-guidelines
- code-review
- project-planning
- docs-workflow

## Useful for Codex

- codex
- context7
- agent-browser
- diagnosing-bugs
- systematic-debugging

## Optional later

- ai-sdk-ui
- ai-sdk-core
- seo-meta
- responsive-images
- db-seed

## Installation examples

From the skills.sh ecosystem:

```bash
npx skills add giuseppe-trisciuoglio/developer-kit --skill turborepo-monorepo
npx skills add giuseppe-trisciuoglio/developer-kit --skill drizzle-orm-patterns
npx skills add giuseppe-trisciuoglio/developer-kit --skill react-patterns
npx skills add giuseppe-trisciuoglio/developer-kit --skill zod-validation-utilities
npx skills add giuseppe-trisciuoglio/developer-kit --skill better-auth
npx skills add giuseppe-trisciuoglio/developer-kit --skill tdd
npx skills add giuseppe-trisciuoglio/developer-kit --skill code-review

npx skills add jezweb/claude-skills --skill tanstack-start
npx skills add jezweb/claude-skills --skill shadcn-ui
npx skills add jezweb/claude-skills --skill vercel-react-best-practices
npx skills add jezweb/claude-skills --skill accessibility
npx skills add jezweb/claude-skills --skill testing-library
npx skills add jezweb/claude-skills --skill web-design-guidelines

npx skills add better-auth/skills --skill create-auth
```

Before installing a skill, inspect its current SKILL.md and confirm it matches the repository's chosen stack.

## Skill discipline

- Skills provide procedures and specialist knowledge.
- AGENTS.md provides project requirements and constraints.
- Product/domain docs provide the SLGS source of truth.
- Do not let a generic skill override SLGS requirements.
