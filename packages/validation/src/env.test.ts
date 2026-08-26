import { describe, expect, it } from "vitest";

import { authEnvironmentSchema, databaseEnvironmentSchema } from "./env";

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
});
