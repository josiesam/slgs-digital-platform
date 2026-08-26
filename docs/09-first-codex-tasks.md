# First Codex Tasks

Run these in order.

## Task 1 — Repository reconnaissance

Ask Codex:

"Read AGENTS.md and all docs under docs/. Inspect the repository. Do not modify anything. Produce an architecture assessment and list contradictions or missing decisions."

## Task 2 — Bootstrap plan

"Based on the SLGS requirements, propose the monorepo foundation. Do not implement. Include workspace structure, app boundaries, shared packages, database boundary, environment strategy, testing, and deployment assumptions."

## Task 3 — Foundation implementation

"Implement the approved repository foundation only. Do not build business modules yet. Verify install, lint, typecheck, test and build."

## Task 4 — Design system

"Implement the initial SLGS shared design system. Start with typography, spacing, layout, buttons, inputs, cards, tables, dialogs, navigation, status badges, empty/loading/error states. Keep public web and admin UI capable of different compositions while sharing primitives."

## Task 5 — Public website shell

"Implement the public website shell and route structure from the requirements. Use placeholder/synthetic content where CMS data does not exist. Do not invent factual school claims."

## Task 6 — CMS foundation

"Implement CMS authentication, roles, permissions, and content workflow before building a large editor. Prove that Multimedia Club and News Journal Club are isolated from each other's unauthorized operations."

## Task 7 — S.I.M.S. foundation

"Implement S.I.M.S. authentication, authorization, audit logging, and the initial domain schema before implementing complex screens."

## Task 8 — Asset management

"Implement ICT/STEM asset lifecycle using historical allocation, maintenance, repair, and disposal records. Include permissions and audit logging."

## Task 9 — Security review

"Perform a threat-model and authorization review of the whole repository. Do not modify anything until findings are presented."

## Task 10 — Production readiness

"Review deployment, environment variables, database migrations, backups, observability, error handling, rate limits, media upload security, privacy, and rollback strategy."
