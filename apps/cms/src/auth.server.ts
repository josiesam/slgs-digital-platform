import {
  createApplicationSessionReader,
  createResendEmailSender,
  createSlgsAuth,
} from "@slgs/auth";
import { createDatabase } from "@slgs/db";

export const database = createDatabase({
  DATABASE_URL: process.env.CMS_DATABASE_URL,
});
const authEnvironment = {
  ...process.env,
  BETTER_AUTH_BASE_URL:
    process.env.CMS_BETTER_AUTH_BASE_URL ?? process.env.BETTER_AUTH_BASE_URL,
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
