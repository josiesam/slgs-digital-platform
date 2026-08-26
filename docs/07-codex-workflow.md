# Codex Workflow

## Golden rule

Codex should inspect before editing.

For every meaningful task:

1. Read root `AGENTS.md`.
2. Read the nearest app-specific `AGENTS.md`.
3. Read relevant product/domain docs.
4. Inspect current code and dependency versions.
5. Form a short implementation plan.
6. Implement the smallest coherent change.
7. Run checks.
8. Review security and data exposure.
9. Update docs if behavior/architecture changed.

## Planning prompts

Use:

> Inspect the repository and the relevant SLGS docs. Do not modify files yet. Explain the current architecture, the requested change, affected modules, risks, and a step-by-step implementation plan.

## Implementation prompts

Use:

> Implement the approved plan. Follow AGENTS.md and the relevant domain docs. Keep the change scoped. Run the relevant tests, type checks, lint, and build. Do not introduce dependencies unless necessary.

## Review prompts

Use:

> Review the current diff against AGENTS.md and the relevant SLGS requirements. Look for authorization gaps, data leakage, validation issues, migration problems, accessibility issues, performance regressions, and unnecessary complexity. Do not modify files; report findings by severity.

## Database prompts

> Inspect the current Drizzle schema and the SLGS data model. Propose the minimum schema/migration needed. Identify relationship, uniqueness, deletion, historical/audit, and authorization concerns before implementing.

## UI prompts

> Read the SLGS product requirements and UI guidance. Inspect existing components before creating new ones. Reuse shared components. Avoid generic AI-dashboard patterns. Implement responsive, accessible states including loading, empty, error, and permission-denied states.

## Security prompts

> Threat-model this change as a school system containing sensitive student/staff data. Identify trust boundaries, authorization checks, sensitive fields, logging risks, upload risks, and data leakage paths. Then implement only the required mitigations.

## Completion report

Every substantial task should end with:
- changed files
- behavior implemented
- checks run
- migration/seed changes
- security considerations
- remaining TODOs/risks
