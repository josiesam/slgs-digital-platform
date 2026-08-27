import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { and, eq } from "drizzle-orm";

import {
  account,
  applicationMembership,
  session,
  twoFactor as twoFactorTable,
  user,
  verification,
  type DatabaseConnection,
} from "@slgs/db";
import type { Application } from "@slgs/permissions";
import { authEnvironmentSchema } from "@slgs/validation";

import { canAccessApplication, EIGHT_HOURS_IN_SECONDS } from "./policy";

export interface AuthEmailSender {
  sendPasswordReset(input: {
    readonly email: string;
    readonly resetUrl: string;
  }): Promise<void>;
}

export interface CreateSlgsAuthOptions {
  readonly application: Application;
  readonly database: DatabaseConnection["db"];
  readonly environment: Record<string, string | undefined>;
  readonly emailSender: AuthEmailSender;
}

export function createSlgsAuth(options: CreateSlgsAuthOptions) {
  const environment = authEnvironmentSchema.parse(options.environment);

  return betterAuth({
    appName: "SLGS Digital Platform",
    baseURL: environment.BETTER_AUTH_BASE_URL,
    secret: environment.BETTER_AUTH_SECRET,
    trustedOrigins: environment.BETTER_AUTH_TRUSTED_ORIGINS,
    database: drizzleAdapter(options.database, {
      provider: "pg",
      schemaName: "identity",
      schema: {
        user,
        session,
        account,
        verification,
        twoFactor: twoFactorTable,
      },
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user: resetUser, url }) => {
        await options.emailSender.sendPasswordReset({
          email: resetUser.email,
          resetUrl: url,
        });
      },
    },
    session: {
      expiresIn: EIGHT_HOURS_IN_SECONDS,
      disableSessionRefresh: true,
    },
    databaseHooks: {
      session: {
        create: {
          before: async (newSession) => {
            const [access] = await options.database
              .select({
                identityStatus: user.status,
                application: applicationMembership.application,
                membershipStatus: applicationMembership.status,
              })
              .from(user)
              .innerJoin(
                applicationMembership,
                and(
                  eq(applicationMembership.userId, user.id),
                  eq(applicationMembership.application, options.application),
                ),
              )
              .where(eq(user.id, newSession.userId))
              .limit(1);

            if (
              !access ||
              !canAccessApplication(
                access.identityStatus,
                options.application,
                {
                  application: access.application,
                  status: access.membershipStatus,
                },
              )
            ) {
              return false;
            }
            return { data: newSession };
          },
        },
      },
    },
    user: {
      additionalFields: {
        personReference: { type: "string", required: true, input: false },
        status: { type: "string", required: true, input: false },
      },
    },
    plugins: [
      twoFactor({ issuer: "SLGS Digital Platform" }),
      tanstackStartCookies(),
    ],
  });
}
