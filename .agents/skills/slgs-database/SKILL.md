name: slgs-database
description: SLGS project-specific database engineering skill.
slgs-database

Use PostgreSQL + Drizzle ORM for all database work.

Before making database changes, inspect the existing schema, relations, constraints, migrations, and authorization model. In particular, review:

foreign-key relationships and deletion behavior

uniqueness constraints

indexes

historical/audit requirements

publication/workflow semantics

authorization and ownership implications

existing database views, functions, triggers, and permissions

existing migration conventions

Never seed real school data.

Drizzle configuration

The current Drizzle configuration and migrations use the fresh naming:

Use drizzle.fresh.config.ts as the current Drizzle configuration.

Use drizzle-fresh as the current migrations directory.

The following are deprecated and must not be used for new work:

drizzle.config.ts

drizzle/

Migration policy

Never manually create, edit, or maintain migration files or standalone SQL migration files.

All schema/database changes must be made through the Drizzle ORM workflow.

The agent must:

Modify the appropriate Drizzle schema definitions.

Use the project's Drizzle tooling to generate the migration.

Review the generated migration for correctness and security.

Apply the migration using the project's Drizzle migration workflow when appropriate.

Never manually create a migration file as a workaround.

Do not manually write a file such as:

drizzle-fresh/0001_some_change.sql


and do not manually add SQL migration files outside the Drizzle-generated migration workflow.

PostgreSQL features not directly supported by Drizzle

If a required PostgreSQL feature cannot be expressed using Drizzle's normal schema/API:

Do not bypass Drizzle by manually creating a migration or SQL file.

Instead:

First determine whether the feature can be represented using Drizzle's supported schema APIs, relations, indexes, constraints, views, functions, or other mechanisms.

If raw PostgreSQL SQL is genuinely required, use it through the supported Drizzle mechanism for embedding/customizing PostgreSQL SQL while keeping the change part of the Drizzle-managed schema/migration workflow.

Keep the database definition represented in the Drizzle schema/source code wherever the project supports doing so.

Generate the migration using the project's Drizzle tooling.

Review the generated migration rather than replacing it with a manually authored migration.

Document why raw PostgreSQL SQL was necessary when the required construct cannot be expressed directly through Drizzle.

The rule is:

Drizzle remains the source of truth and the migration generator, even when PostgreSQL-specific SQL is required.

Do not interpret "Drizzle does not support this feature directly" as permission to abandon the Drizzle migration workflow.

Migration safety

Before generating a migration:

Inspect the current database/schema state.

Check existing migrations for related changes.

Consider data-loss implications.

Consider foreign-key and deletion implications.

Consider uniqueness and indexing requirements.

Consider authorization and privilege implications.

Consider backward compatibility with existing application code.

Consider whether existing production data could violate the proposed constraint.

Never introduce destructive changes without explicitly understanding their impact.

After generating a migration:

Inspect the generated migration.

Verify that it corresponds to the intended Drizzle schema change.

Verify that it does not unexpectedly drop, rename, recreate, or alter unrelated objects.

Verify indexes, constraints, foreign keys, defaults, and permissions.

Verify security-sensitive objects such as views, functions, grants, and row-level security policies.

Run the appropriate project tests/checks.

Security

Database authorization is part of the schema design.

When changing database access:

Follow least privilege.

Do not grant broad access merely to make an application query work.

Inspect existing roles, grants, schemas, views, functions, and authorization boundaries before changing them.

Prefer narrowly scoped public projections/views over exposing private CMS tables.

Treat SECURITY DEFINER, views, functions, row-level security, and grants as security-sensitive database code.

Explicitly verify ownership, execution privileges, search_path, object qualification, and privilege-escalation risks for SECURITY DEFINER functions.

Do not expose private, unpublished, or editorial-only data through public database interfaces.

Database source of truth

The intended workflow is:

Drizzle schema/source code
        ↓
Drizzle migration generation
        ↓
generated drizzle-fresh migration
        ↓
database


Not:

manually written SQL
        ↓
database
        ↓
Drizzle schema updated later


The agent should never make the database change first through a manually authored SQL migration and then attempt to reconcile the Drizzle schema afterward.

Verification

For every database change, verify:

Drizzle schema compiles.

Drizzle migration generation succeeds.

The generated migration matches the intended change.

Relevant migrations can be applied successfully.

Existing relations and constraints remain correct.

Relevant authorization/security boundaries remain intact.

Tests cover the changed behavior.

No real school data is seeded or fabricated.
::