import {
  createApplicationSessionReader,
  createResendEmailSender,
  createSlgsAuth,
} from "@slgs/auth";
import { createDatabase } from "@slgs/db";

export const database = createDatabase({
  DATABASE_URL:
    process.env.SIMS_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "postgresql://placeholder:placeholder@localhost:5432/slgs_placeholder",
});

const defaultSimsUrl =
  process.env.SIMS_BETTER_AUTH_BASE_URL ??
  process.env.BETTER_AUTH_BASE_URL ??
  process.env.BETTER_AUTH_URL ??
  "http://localhost:3002";

const authEnvironment = {
  ...process.env,
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ?? "00000000000000000000000000000000",
  BETTER_AUTH_BASE_URL: defaultSimsUrl,
  BETTER_AUTH_TRUSTED_ORIGINS:
    process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? defaultSimsUrl,
};

export const auth = createSlgsAuth({
  application: "sims",
  database: database.db,
  environment: authEnvironment,
  emailSender: createResendEmailSender(process.env),
});

export const sessions = createApplicationSessionReader({
  application: "sims",
  auth,
  database: database.db,
});
