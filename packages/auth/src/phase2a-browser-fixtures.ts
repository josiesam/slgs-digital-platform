import { hashPassword } from "better-auth/crypto";
import { and, eq, inArray } from "drizzle-orm";

import {
  account,
  applicationMembership,
  createDatabase,
  roleAssignment,
  roleAssignmentScope,
  roleDefinition,
  securityAuditEvent,
  user,
} from "@slgs/db";

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const apiKey = required("NEON_API_KEY");
const projectId = required("SLGS_NEON_PROJECT_ID");
const branchId = required("SLGS_NEON_BRANCH_ID");
const action = process.argv[2] ?? "create";

async function neonRequest(method: "GET" | "DELETE") {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branchId)}`,
    { method, headers: { Authorization: `Bearer ${apiKey}` } },
  );
  if (!response.ok)
    throw new Error("Disposable Neon branch verification failed.");
  return response.status === 204 ? null : response.json();
}

if (action === "cleanup") {
  await neonRequest("DELETE");
  console.log("Disposable Phase 2A Neon branch deleted.");
  process.exit(0);
}
if (action !== "create") throw new Error("Use create or cleanup.");
if (process.env.SLGS_PHASE2A_BROWSER_FIXTURES !== "1") {
  throw new Error("Phase 2A fixture gate is not enabled.");
}

const branchResponse = (await neonRequest("GET")) as {
  branch?: {
    default?: boolean;
    protected?: boolean;
    expires_at?: string | null;
    name?: string;
  };
};
const branch = branchResponse.branch;
const expiresAt = branch?.expires_at ? new Date(branch.expires_at) : null;
if (
  !branch ||
  branch.default !== false ||
  branch.protected === true ||
  !branch.name?.startsWith("phase2a-") ||
  !expiresAt ||
  Number.isNaN(expiresAt.getTime()) ||
  expiresAt <= new Date()
) {
  throw new Error(
    "Fixtures require an unprotected, non-default, expiring phase2a-* Neon branch.",
  );
}

const databaseUrl = required("DATABASE_MIGRATION_URL");
const password = required("SLGS_SYNTHETIC_PASSWORD");
const personas = [
  [
    "system-administrator",
    "Synthetic S.I.M.S. System Administrator",
    "sims_system_administrator",
    null,
  ],
  [
    "access-administrator",
    "Synthetic S.I.M.S. Access Administrator",
    "sims_access_administrator",
    null,
  ],
  [
    "school-administrator",
    "Synthetic S.I.M.S. School Administrator",
    "sims_school_administrator",
    null,
  ],
  [
    "operational-staff",
    "Synthetic S.I.M.S. Operational Staff",
    "sims_operational_staff",
    ["department", "synthetic-ict"],
  ],
] as const;

const connection = createDatabase({ DATABASE_URL: databaseUrl });
try {
  const passwordHash = await hashPassword(password);
  await connection.db.transaction(async (transaction) => {
    const keys = personas.map((persona) => persona[2]);
    const roles = await transaction
      .select({ id: roleDefinition.id, key: roleDefinition.key })
      .from(roleDefinition)
      .where(
        and(
          eq(roleDefinition.application, "sims"),
          inArray(roleDefinition.key, keys),
          eq(roleDefinition.active, true),
        ),
      );
    const roleIds = new Map(roles.map((role) => [role.key, role.id]));
    if (roleIds.size !== keys.length)
      throw new Error("Required S.I.M.S. roles are unavailable.");

    for (const [key, name, roleKey, scope] of personas) {
      const userId = `fixture:phase2a:${key}`;
      const membershipId = `fixture:phase2a:${key}:membership`;
      const assignmentId = `fixture:phase2a:${key}:assignment`;
      await transaction.insert(user).values({
        id: userId,
        name,
        email: `phase2a-${key}@invalid.example`,
        emailVerified: true,
        personReference: `synthetic-phase2a-${key}`,
        status: "active",
      });
      await transaction.insert(account).values({
        id: `fixture:phase2a:${key}:account`,
        issuer: "local:credential",
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
      });
      await transaction.insert(applicationMembership).values({
        id: membershipId,
        userId,
        application: "sims",
        status: "active",
        approvedAt: new Date(),
      });
      await transaction.insert(roleAssignment).values({
        id: assignmentId,
        membershipId,
        roleDefinitionId: roleIds.get(roleKey)!,
        assignedBy: "fixture:phase2a:system-administrator",
        reason: "Disposable Phase 2A browser fixture",
      });
      if (scope) {
        await transaction.insert(roleAssignmentScope).values({
          id: `fixture:phase2a:${key}:scope`,
          roleAssignmentId: assignmentId,
          dimension: scope[0],
          value: scope[1],
        });
      }
      await transaction.insert(securityAuditEvent).values({
        id: `fixture:phase2a:${key}:audit`,
        eventType: "fixture.identity.created",
        application: "sims",
        targetType: "identity",
        targetId: userId,
        outcome: "success",
        reasonCode: "disposable_browser_fixture",
        metadata: { synthetic: true, roleKey },
      });
    }
  });
  console.log(`Phase 2A synthetic personas created: ${personas.length}.`);
  console.log(
    "Credentials were not printed; delete the Neon branch after verification.",
  );
} finally {
  await connection.client.end();
}
