# Fresh Database Role and Migration Setup

Status: **ACTIVE — OPERATOR RUNBOOK**

Fresh installations use a squashed baseline generated from the active Drizzle `schema.ts` files. They do not run the historical `0000`–`0014` upgrade chain and never create the discontinued `sims` schema or `slgs_sims` role. The historical chain remains only for databases that already recorded those migrations.

## Safety boundary

Use a new isolated PostgreSQL project/cluster; for Neon, use a fresh project. Record the project, database, environment, and operator. Use direct, non-pooler URLs for setup/migrations and separate pooled runtime URLs. Never paste or commit credentials.

## Roles

| Role | Purpose | Required attributes |
|---|---|---|
| Provider database owner | Creates the four SLGS roles | Never used by an application |
| `slgs_migrator` | Owns generated schemas and relations | Login, `NOSUPERUSER`, `NOCREATEROLE`, `NOCREATEDB` |
| `slgs_cms` | CMS runtime | Login; grants only from the security baseline |
| `slgs_web` | anonymous Public Web runtime | Login; read-only `public_content` access |
| `slgs_platform_admin` | restricted bootstrap operations | Login; identity privileges constrained by RLS |

There is no S.I.M.S. role.

## 1. Create the empty database and roles

Create a database named `slgs`, then run as its owner:

```bash
psql "$SLGS_OWNER_DATABASE_URL" -X --set=ON_ERROR_STOP=1 \
  --file=packages/db/bootstrap/fresh-runtime-roles.sql
```

Set unique passwords without placing them in shell history:

```text
psql "$SLGS_OWNER_DATABASE_URL"
\password slgs_migrator
\password slgs_web
\password slgs_cms
\password slgs_platform_admin
\q
```

## 2. Configure connections

- `DATABASE_MIGRATION_URL`: direct URL authenticated as `slgs_migrator`.
- `CMS_DATABASE_URL`: runtime URL authenticated as `slgs_cms`.
- `WEB_DATABASE_URL`: runtime URL authenticated as `slgs_web`.
- `PLATFORM_ADMIN_DATABASE_URL`: approved bootstrap-only URL.

Confirm every connection with `SELECT current_database(), current_user;`.

## 3. Generate the structural baseline

```bash
pnpm --filter @slgs/db db:fresh:generate
```

This generates `drizzle-fresh/0000_current-schema-baseline.sql` from `packages/db/src/schema/**/*.ts`. Review generated changes before applying them.

`drizzle-fresh/0001_current-security-baseline.sql` is deliberately separate. Drizzle generates schemas, enums, tables, constraints, foreign keys, indexes, and views, but its schema DSL does not fully express the required database roles, grants, RLS policies, workflow/audit triggers, security-barrier options, or system-role seed data.

## 4. Apply only the fresh baseline

```bash
pnpm --filter @slgs/db db:fresh:migrate
```

This uses `drizzle.fresh.config.ts` and must apply only the two migrations under `packages/db/drizzle-fresh`. Do not run `db:migrate` on a fresh installation because that command intentionally targets the legacy upgrade chain.

## 5. Verify

```sql
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolcanlogin
FROM pg_roles WHERE rolname LIKE 'slgs_%' ORDER BY rolname;

SELECT schemaname, tablename, tableowner
FROM pg_tables
WHERE schemaname IN ('identity', 'cms', 'public_content', 'drizzle')
ORDER BY schemaname, tablename;

SELECT to_regrole('slgs_sims') IS NULL AS no_obsolete_role;
SELECT to_regnamespace('sims') IS NULL AS no_obsolete_schema;

SELECT permissions
FROM identity.role_definition
WHERE application = 'cms' AND key = 'cms_administrator';
```

Expected: four `slgs_*` roles; no S.I.M.S. objects; all migration-created relations owned by `slgs_migrator`; runtime roles without superuser, role-creation, or database-creation authority; and the complete explicit CMS Administrator permission set.

Then run `pnpm check` and `git diff --check`. Run the CMS operational verification checklist before claiming production readiness.

## Upgrade boundary

Do not point `db:fresh:migrate` at an existing database. Existing databases retain their recorded historical migration chain and require a separately reviewed remediation or export/import plan. Never mark legacy migrations as applied without proving the resulting schema, grants, triggers, policies, and seed data match the fresh baseline.
