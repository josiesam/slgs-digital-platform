import {
  createApplicationSessionReader,
  createResendEmailSender,
  createSlgsAuth,
} from "@slgs/auth";
import { createDatabase } from "@slgs/db";

export const database = createDatabase({
  DATABASE_URL:
    process.env.CMS_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "postgresql://placeholder:placeholder@localhost:5432/slgs_placeholder",
});

const defaultCmsUrl =
  process.env.CMS_BETTER_AUTH_BASE_URL ??
  process.env.BETTER_AUTH_BASE_URL ??
  process.env.BETTER_AUTH_URL ??
  "http://localhost:3001";

const authEnvironment = {
  ...process.env,
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ?? "00000000000000000000000000000000",
  BETTER_AUTH_BASE_URL: defaultCmsUrl,
  BETTER_AUTH_TRUSTED_ORIGINS:
    process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? defaultCmsUrl,
};

export const auth = createSlgsAuth({
  application: "cms",
  database: database.db,
  environment: authEnvironment,
  emailSender: createResendEmailSender(process.env),
});

export const sessions = createApplicationSessionReader({
  application: "cms",
  auth,
  database: database.db,
});
