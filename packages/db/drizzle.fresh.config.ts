import { defineConfig } from "drizzle-kit";

const migrationUrl =
  process.env.DATABASE_BOOTSTRAP_ADMIN_URL ??
  process.env.DATABASE_MIGRATION_URL ??
  process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error(
    "A database connection URL is required for drizzle-kit migrate.\n" +
      "Please set DATABASE_BOOTSTRAP_ADMIN_URL, DATABASE_MIGRATION_URL, or DATABASE_URL.\n" +
      'Example: DATABASE_BOOTSTRAP_ADMIN_URL="postgresql://postgres:postgres@localhost:5432/slgs" pnpm --filter @slgs/db db:fresh:migrate',
  );
}

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle-fresh",
  schema: "./src/schema/**/*.ts",
  dbCredentials: {
    url: migrationUrl,
  },
  strict: true,
  verbose: true,
});
