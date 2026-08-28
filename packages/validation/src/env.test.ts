import { describe, expect, it } from "vitest";

import {
  authEnvironmentSchema,
  databaseEnvironmentSchema,
  r2EnvironmentSchema,
  resendEnvironmentSchema,
} from "./env";

describe("environment validation", () => {
  it("rejects non-PostgreSQL database URLs", () => {
    const result = databaseEnvironmentSchema.safeParse({
      DATABASE_URL: "https://example.com/database",
    });

    expect(result.success).toBe(false);
  });

  it("parses trusted authentication origins", () => {
    const result = authEnvironmentSchema.parse({
      BETTER_AUTH_SECRET: "a-secure-development-secret-value",
      BETTER_AUTH_BASE_URL: "http://localhost:3001",
      BETTER_AUTH_TRUSTED_ORIGINS:
        "http://localhost:3001,http://localhost:3002",
    });

    expect(result.BETTER_AUTH_TRUSTED_ORIGINS).toEqual([
      "http://localhost:3001",
      "http://localhost:3002",
    ]);
  });

  it("requires a valid Resend sender address", () => {
    expect(
      resendEnvironmentSchema.safeParse({
        RESEND_API_KEY: "synthetic-key",
        RESEND_FROM_EMAIL: "not-an-email-address",
      }).success,
    ).toBe(false);

    expect(
      resendEnvironmentSchema.safeParse({
        RESEND_API_KEY: "synthetic-key",
        RESEND_FROM_EMAIL: "identity@example.invalid",
      }).success,
    ).toBe(true);
  });

  it("requires an HTTPS R2 endpoint and bounded presigned URL lifetime", () => {
    const base = {
      CLOUDFLARE_R2_ACCOUNT_ID: "account-id",
      CLOUDFLARE_R2_ENDPOINT: "https://account-id.r2.cloudflarestorage.com",
      CLOUDFLARE_R2_BUCKET: "private-cms-media",
      CLOUDFLARE_R2_ACCESS_KEY_ID: "synthetic-access-key",
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: "synthetic-key-material",
      CLOUDFLARE_R2_PRESIGNED_URL_TTL_SECONDS: "300",
    };
    expect(r2EnvironmentSchema.safeParse(base).success).toBe(true);
    expect(
      r2EnvironmentSchema.safeParse({
        ...base,
        CLOUDFLARE_R2_ENDPOINT: "http://account-id.invalid",
      }).success,
    ).toBe(false);
    expect(
      r2EnvironmentSchema.safeParse({
        ...base,
        CLOUDFLARE_R2_PRESIGNED_URL_TTL_SECONDS: "7200",
      }).success,
    ).toBe(false);
  });
});
