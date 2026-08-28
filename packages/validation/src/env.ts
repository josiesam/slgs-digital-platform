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

export const r2EnvironmentSchema = z.object({
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().trim().min(1),
  CLOUDFLARE_R2_ENDPOINT: z
    .url()
    .refine((value) => new URL(value).protocol === "https:", {
      error: "Expected an HTTPS Cloudflare R2 endpoint",
    }),
  CLOUDFLARE_R2_BUCKET: z.string().trim().min(1),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().trim().min(1),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1),
  CLOUDFLARE_R2_PRESIGNED_URL_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(3_600),
});

export type AuthEnvironment = z.output<typeof authEnvironmentSchema>;
export type DatabaseEnvironment = z.output<typeof databaseEnvironmentSchema>;
export type ResendEnvironment = z.output<typeof resendEnvironmentSchema>;
export type R2Environment = z.output<typeof r2EnvironmentSchema>;

export function parseEnvironment<TSchema extends z.ZodType>(
  schema: TSchema,
  environment: Record<string, string | undefined>,
): z.output<TSchema> {
  return schema.parse(environment);
}
