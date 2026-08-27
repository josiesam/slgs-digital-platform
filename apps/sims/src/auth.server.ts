import {
  createApplicationSessionReader,
  createResendEmailSender,
  createSlgsAuth,
} from "@slgs/auth";
import { createDatabase } from "@slgs/db";

const database = createDatabase({
  DATABASE_URL: process.env.SIMS_DATABASE_URL,
});
const authEnvironment = {
  ...process.env,
  BETTER_AUTH_BASE_URL:
    process.env.SIMS_BETTER_AUTH_BASE_URL ?? process.env.BETTER_AUTH_BASE_URL,
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
