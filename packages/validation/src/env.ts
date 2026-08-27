import { z } from "zod";

const databaseUrlSchema = z.url().refine(
  (value) => {
    const protocol = new URL(value).protocol;
    return protocol === "postgres:" || protocol === "postgresql:";
  },
  { error: "Expected a PostgreSQL connection URL" },
);

export const databaseEnvironmentSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
});

export const authEnvironmentSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_BASE_URL: z.url(),
  BETTER_AUTH_TRUSTED_ORIGINS: z
    .string()
    .transform((value) => value.split(",").map((origin) => origin.trim()))
    .pipe(z.array(z.url()).min(1)),
});

export const resendEnvironmentSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.email(),
});

export type AuthEnvironment = z.output<typeof authEnvironmentSchema>;
export type DatabaseEnvironment = z.output<typeof databaseEnvironmentSchema>;
export type ResendEnvironment = z.output<typeof resendEnvironmentSchema>;

export function parseEnvironment<TSchema extends z.ZodType>(
  schema: TSchema,
  environment: Record<string, string | undefined>,
): z.output<TSchema> {
  return schema.parse(environment);
}
