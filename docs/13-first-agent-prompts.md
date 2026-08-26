# First Agent Prompts

## Architect
Read all project context. Do not modify files. Produce a repository reconnaissance report, contradictions, missing decisions, risks, and Phase 0 plan.

## Database
Read the data model. Do not migrate yet. Propose the initial PostgreSQL/Drizzle domain schema and identify integrity/history concerns.

## Security
Threat-model Web, CMS and S.I.M.S. boundaries. Do not modify files. Report privilege escalation, IDOR, data leakage, upload, session, logging and caching risks.

## Frontend
Inspect existing code and design-system state. Do not modify. Propose shared UI primitives and application-specific compositions.

## CMS
Review the editorial workflow and permissions. Identify gaps before implementation.

## S.I.M.S.
Review the confidential data domains and permissions. Identify missing requirements and dangerous assumptions.

## Assets
Review the asset lifecycle and propose the minimum schema and workflows without implementation.

## Final reviewer
Review the combined plans for contradictions and unresolved architectural decisions.
