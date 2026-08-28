import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { databaseEnvironmentSchema } from "@slgs/validation";

import * as schema from "./schema/identity";
import * as cmsSchema from "./schema/cms";

export * from "./schema/cms";
export * from "./schema/identity";

export function createDatabase(
  environment: Record<string, string | undefined>,
) {
  const { DATABASE_URL } = databaseEnvironmentSchema.parse(environment);
  const client = postgres(DATABASE_URL, {
    max: 10,
    prepare: false,
  });

  return {
    client,
    db: drizzle(client, { schema: { ...schema, ...cmsSchema } }),
  };
}

export type DatabaseConnection = ReturnType<typeof createDatabase>;
