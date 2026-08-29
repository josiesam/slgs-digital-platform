import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  activateIdentity,
  assignRole,
  createSimsRoleDefinition,
  createSimsMembership,
  deactivateIdentity,
  provisionPasswordIdentity,
  requireIdentity,
  revokeIdentitySessions,
  revokeRole,
  setSimsMembershipStatus,
  setSimsRoleDefinitionActive,
  suspendIdentity,
} from "@slgs/auth";
import {
  applicationMembership,
  roleAssignment,
  roleAssignmentScope,
  roleDefinition,
  securityAuditEvent,
  user,
} from "@slgs/db";
import {
  evaluateAuthorization,
  permissionSchema,
  requireAuthorization,
  scopeBindingSchema,
  type Permission,
} from "@slgs/permissions";

import { database, sessions } from "./auth.server";
import { canAccessIdentityAdministration } from "./admin-policy";

async function requestIdentity() {
  const request = new Request("http://internal.slgs/sims-admin", {
    headers: getRequestHeaders(),
  });
  return requireIdentity(sessions, request);
}

async function requirePermission(
  identity: Awaited<ReturnType<typeof requestIdentity>>,
  permission: Permission,
) {
  const decision = evaluateAuthorization({
    identityId: identity.userId,
    application: "sims",
    permission,
    grant: identity.grants.get("sims"),
  });
  if (!decision.allowed) {
    await database.db.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "authorization.denied",
      application: "sims",
      actorUserId: identity.userId,
      sessionId: identity.sessionId,
      targetType: "permission",
      targetId: permission,
      outcome: "denied",
      reasonCode: decision.reason,
      metadata: { permission },
    });
  }
  requireAuthorization({
    identityId: identity.userId,
    application: "sims",
    permission,
    grant: identity.grants.get("sims"),
  });
}

const reasonSchema = z.enum([
  "approved_staff_administration",
  "employment_status_change",
  "security_containment",
  "access_review",
  "administrative_correction",
  "approved_sims_access",
  "membership_status_change",
  "administrative_session_revocation",
  "approved_role_assignment",
  "approved_role_revocation",
]);
const identityIdSchema = z.string().min(1).max(200);

export const getSimsIdentityAdministration = createServerFn({
  method: "GET",
}).handler(async () => {
  const identity = await requestIdentity();
  const permissions = [...(identity.grants.get("sims")?.permissions ?? [])];
  if (!canAccessIdentityAdministration(permissions)) {
    await requirePermission(identity, "identity:manage:sims");
  }
  const identities = await database.db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt,
      membershipId: applicationMembership.id,
      membershipStatus: applicationMembership.status,
    })
    .from(user)
    .leftJoin(
      applicationMembership,
      and(
        eq(applicationMembership.userId, user.id),
        eq(applicationMembership.application, "sims"),
      ),
    )
    .orderBy(desc(user.createdAt))
    .limit(200);
  const membershipIds = identities.flatMap((item) =>
    item.membershipId ? [item.membershipId] : [],
  );
  const assignments = membershipIds.length
    ? await database.db
        .select({
          id: roleAssignment.id,
          membershipId: roleAssignment.membershipId,
          roleId: roleDefinition.id,
          roleName: roleDefinition.name,
        })
        .from(roleAssignment)
        .innerJoin(
          roleDefinition,
          eq(roleDefinition.id, roleAssignment.roleDefinitionId),
        )
        .where(
          and(
            inArray(roleAssignment.membershipId, membershipIds),
            isNull(roleAssignment.revokedAt),
          ),
        )
    : [];
  const assignmentIds = assignments.map((item) => item.id);
  const scopes = assignmentIds.length
    ? await database.db
        .select({
          assignmentId: roleAssignmentScope.roleAssignmentId,
          dimension: roleAssignmentScope.dimension,
          value: roleAssignmentScope.value,
        })
        .from(roleAssignmentScope)
        .where(inArray(roleAssignmentScope.roleAssignmentId, assignmentIds))
    : [];
  const roles = await database.db
    .select({
      id: roleDefinition.id,
      name: roleDefinition.name,
      key: roleDefinition.key,
      scopeDimensions: roleDefinition.scopeDimensions,
      permissions: roleDefinition.permissions,
      active: roleDefinition.active,
      systemManaged: roleDefinition.systemManaged,
    })
    .from(roleDefinition)
    .where(eq(roleDefinition.application, "sims"));
  const canReadAudit =
    permissions.includes("audit:read:sims") ||
    permissions.includes("audit:read:identity");
  const audit = canReadAudit
    ? await database.db
        .select({
          eventType: securityAuditEvent.eventType,
          targetId: securityAuditEvent.targetId,
          outcome: securityAuditEvent.outcome,
          reasonCode: securityAuditEvent.reasonCode,
          occurredAt: securityAuditEvent.occurredAt,
        })
        .from(securityAuditEvent)
        .where(
          or(
            eq(securityAuditEvent.application, "sims"),
            isNull(securityAuditEvent.application),
          ),
        )
        .orderBy(desc(securityAuditEvent.occurredAt))
        .limit(200)
    : [];
  return {
    userId: identity.userId,
    permissions,
    roles,
    identities: identities.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      assignments: assignments
        .filter((assignment) => assignment.membershipId === item.membershipId)
        .map((assignment) => ({
          ...assignment,
          scopes: scopes.filter(
            (scope) => scope.assignmentId === assignment.id,
          ),
        })),
    })),
    audit: audit.map((item) => ({
      ...item,
      occurredAt: item.occurredAt.toISOString(),
    })),
  };
});

export const provisionSimsIdentity = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        name: z.string().trim().min(1).max(160),
        email: z.string().email().max(320),
        personReference: z.string().trim().min(1).max(200),
        password: z.string().min(8).max(128),
      })
      .parse(input),
  )
  .handler(async ({ data }) =>
    provisionPasswordIdentity(database.db, {
      ...data,
      actor: await requestIdentity(),
    }),
  );

export const setSimsIdentityStatus = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        userId: identityIdSchema,
        status: z.enum(["active", "suspended", "deactivated"]),
        reason: reasonSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const input = {
      userId: data.userId,
      actor: await requestIdentity(),
      reasonCode: data.reason,
    };
    if (data.status === "active") await activateIdentity(database.db, input);
    else if (data.status === "suspended")
      await suspendIdentity(database.db, input);
    else await deactivateIdentity(database.db, input);
    return { success: true };
  });

export const createIdentitySimsMembership = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ userId: identityIdSchema, reason: reasonSchema }).parse(input),
  )
  .handler(async ({ data }) => ({
    id: await createSimsMembership(database.db, {
      userId: data.userId,
      actor: await requestIdentity(),
      reasonCode: data.reason,
    }),
  }));

export const setIdentitySimsMembershipStatus = createServerFn({
  method: "POST",
})
  .validator((input) =>
    z
      .object({
        userId: identityIdSchema,
        status: z.enum(["active", "suspended", "deactivated"]),
        reason: reasonSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await setSimsMembershipStatus(database.db, {
      userId: data.userId,
      status: data.status,
      reasonCode: data.reason,
      actor: await requestIdentity(),
    });
    return { success: true };
  });

export const revokeSimsIdentitySessions = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ userId: identityIdSchema, reason: reasonSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    await revokeIdentitySessions(database.db, {
      userId: data.userId,
      reasonCode: data.reason,
      actor: await requestIdentity(),
    });
    return { success: true };
  });

export const assignSimsIdentityRole = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        userId: identityIdSchema,
        roleId: identityIdSchema,
        scopes: z.array(scopeBindingSchema).max(20),
        reason: reasonSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => ({
    id: await assignRole(database.db, {
      actor: await requestIdentity(),
      application: "sims",
      targetUserId: data.userId,
      roleId: data.roleId,
      scopes: data.scopes,
      reason: data.reason,
    }),
  }));

export const revokeSimsIdentityRole = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({ assignmentId: identityIdSchema, reason: reasonSchema })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await revokeRole(database.db, {
      actor: await requestIdentity(),
      application: "sims",
      assignmentId: data.assignmentId,
      reason: data.reason,
    });
    return { success: true };
  });

export const createSimsRole = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        key: z
          .string()
          .regex(/^[a-z][a-z0-9_]*$/)
          .max(100),
        name: z.string().trim().min(1).max(160),
        description: z.string().trim().min(1).max(500),
        permissions: z.array(permissionSchema).min(1).max(30),
        scopeDimensions: z
          .array(
            z.enum([
              "class",
              "subject",
              "department",
              "academic_session",
              "term",
              "location",
            ]),
          )
          .max(6),
      })
      .parse(input),
  )
  .handler(async ({ data }) => ({
    id: await createSimsRoleDefinition(database.db, {
      ...data,
      actor: await requestIdentity(),
    }),
  }));

export const setSimsRoleActive = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ roleId: identityIdSchema, active: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    await setSimsRoleDefinitionActive(database.db, {
      ...data,
      actor: await requestIdentity(),
    });
    return { success: true };
  });
