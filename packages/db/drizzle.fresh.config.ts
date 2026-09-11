import { defineConfig } from "drizzle-kit";

// const migrationUrl = process.env.DATABASE_MIGRATION_URL;
const migrationUrl = process.env.DATABASE_BOOTSTRAP_ADMIN_URL;

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle-fresh",
  schema: "./src/schema/**/*.ts",
  ...(migrationUrl ? { dbCredentials: { url: migrationUrl } } : {}),
  strict: true,
  verbose: true,
});
