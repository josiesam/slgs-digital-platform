import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  assignRole,
  provisionCmsUser,
  requireIdentity,
  revokeCmsUserSessions,
  revokeRole,
  setCmsUserStatus,
} from "@slgs/auth";
import {
  applicationMembership,
  approvedContactDomain,
  club,
  roleAssignment,
  roleAssignmentScope,
  roleDefinition,
  securityAuditEvent,
  user,
} from "@slgs/db";
import {
  evaluateAuthorization,
  requireAuthorization,
  scopeBindingSchema,
  type Permission,
} from "@slgs/permissions";
import { database, sessions } from "./auth.server";

async function requestIdentity() {
  const request = new Request("http://internal.slgs/cms-users", {
    headers: getRequestHeaders(),
  });
  const identity = await requireIdentity(sessions, request);
  return identity;
}

async function requireCmsUserAdministrationPermission(
  identity: Awaited<ReturnType<typeof requestIdentity>>,
  permission: Permission,
) {
  const authorization = {
    identityId: identity.userId,
    application: "cms" as const,
    permission,
    grant: identity.grants.get("cms"),
  };
  const decision = evaluateAuthorization(authorization);
  if (!decision.allowed) {
    await database.db.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "authorization.denied",
      application: "cms",
      actorUserId: identity.userId,
      sessionId: identity.sessionId,
      targetType: "permission",
      targetId: permission,
      outcome: "denied",
      reasonCode: decision.reason,
      metadata: { permission },
    });
  }
  requireAuthorization(authorization);
}

export const getCmsUsers = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({ search: z.string().trim().max(160).optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const identity = await requestIdentity();
    await requireCmsUserAdministrationPermission(identity, "user:read:cms");
    const filter = data.search
      ? or(
          ilike(user.name, `%${data.search}%`),
          ilike(user.email, `%${data.search}%`),
        )
      : undefined;
    const users = await database.db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        membershipId: applicationMembership.id,
        membershipStatus: applicationMembership.status,
        createdAt: user.createdAt,
      })
      .from(user)
      .innerJoin(
        applicationMembership,
        and(
          eq(applicationMembership.userId, user.id),
          eq(applicationMembership.application, "cms"),
        ),
      )
      .where(filter)
      .orderBy(user.name)
      .limit(200);
    const assignments = await database.db
      .select({
        id: roleAssignment.id,
        membershipId: roleAssignment.membershipId,
        roleName: roleDefinition.name,
        roleKey: roleDefinition.key,
        permissions: roleDefinition.permissions,
        scopeDimension: roleAssignmentScope.dimension,
        scopeValue: roleAssignmentScope.value,
      })
      .from(roleAssignment)
      .innerJoin(
        roleDefinition,
        eq(roleDefinition.id, roleAssignment.roleDefinitionId),
      )
      .leftJoin(
        roleAssignmentScope,
        eq(roleAssignmentScope.roleAssignmentId, roleAssignment.id),
      )
      .where(
        and(
          eq(roleDefinition.application, "cms"),
          isNull(roleAssignment.revokedAt),
        ),
      );
    const [roles, clubs, approvedDomains] = await Promise.all([
      database.db
        .select({
          id: roleDefinition.id,
          name: roleDefinition.name,
          scopeDimensions: roleDefinition.scopeDimensions,
        })
        .from(roleDefinition)
        .where(
          and(
            eq(roleDefinition.application, "cms"),
            eq(roleDefinition.active, true),
          ),
        )
        .orderBy(roleDefinition.name),
      database.db
        .select({ id: club.id, name: club.name })
        .from(club)
        .where(eq(club.status, "active"))
        .orderBy(club.name),
      database.db
        .select({ domain: approvedContactDomain.domain })
        .from(approvedContactDomain)
        .where(eq(approvedContactDomain.active, true))
        .orderBy(approvedContactDomain.domain),
    ]);
    return {
      users: users.map((cmsUser) => ({
        ...cmsUser,
        createdAt: cmsUser.createdAt.toISOString(),
        assignments: assignments.filter(
          (assignment) => assignment.membershipId === cmsUser.membershipId,
        ),
      })),
      roles,
      clubs,
      approvedDomains: approvedDomains.map(({ domain }) => domain),
    };
  });

export const provisionCmsUserAccount = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        name: z.string().trim().min(1).max(160),
        email: z.email(),
        personReference: z.string().trim().min(1).max(200),
        temporaryPassword: z.string().min(12).max(128),
      })
      .parse(input),
  )
  .handler(async ({ data }) =>
    provisionCmsUser(database.db, {
      ...data,
      actor: await requestIdentity(),
    }),
  );

export const changeCmsUserStatus = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        userId: z.string().min(1),
        status: z.enum(["active", "suspended", "deactivated"]),
        reason: z.string().trim().min(1).max(600),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const actor = await requestIdentity();
    await setCmsUserStatus(database.db, {
      userId: data.userId,
      status: data.status,
      reasonCode: data.reason,
      actor,
    });
    return { success: true };
  });

export const revokeCmsSessions = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        userId: z.string().min(1),
        reason: z.string().trim().min(1).max(600),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await revokeCmsUserSessions(database.db, {
      userId: data.userId,
      reasonCode: data.reason,
      actor: await requestIdentity(),
    });
    return { success: true };
  });

export const revokeCmsRoleAssignment = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        assignmentId: z.string().min(1),
        reason: z.string().trim().min(1).max(600),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const actor = await requestIdentity();
    await revokeRole(database.db, {
      actor,
      application: "cms",
      assignmentId: data.assignmentId,
      reason: data.reason,
    });
    return { success: true };
  });

export const assignCmsUserRole = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        targetUserId: z.string().min(1),
        roleId: z.string().min(1),
        scopes: z.array(scopeBindingSchema).max(2),
        reason: z.string().trim().min(1).max(600),
      })
      .parse(input),
  )
  .handler(async ({ data }) => ({
    id: await assignRole(database.db, {
      actor: await requestIdentity(),
      application: "cms",
      targetUserId: data.targetUserId,
      roleId: data.roleId,
      scopes: data.scopes,
      reason: data.reason,
    }),
  }));

export const getCmsUserLifecycleHistory = createServerFn({ method: "GET" })
  .validator((input) => z.object({ userId: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const identity = await requestIdentity();
    await requireCmsUserAdministrationPermission(identity, "user:read:cms");
    const events = await database.db
      .select({
        eventType: securityAuditEvent.eventType,
        outcome: securityAuditEvent.outcome,
        reasonCode: securityAuditEvent.reasonCode,
        occurredAt: securityAuditEvent.occurredAt,
      })
      .from(securityAuditEvent)
      .where(
        and(
          eq(securityAuditEvent.application, "cms"),
          eq(securityAuditEvent.targetId, data.userId),
        ),
      )
      .orderBy(desc(securityAuditEvent.occurredAt))
      .limit(50);
    return events.map((event) => ({
      ...event,
      occurredAt: event.occurredAt.toISOString(),
    }));
  });
