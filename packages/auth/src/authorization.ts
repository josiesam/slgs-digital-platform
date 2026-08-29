import { and, eq, isNull } from "drizzle-orm";

import {
  applicationMembership,
  roleAssignment,
  roleAssignmentScope,
  roleDefinition,
  securityAuditEvent,
  user,
  type DatabaseConnection,
} from "@slgs/db";
import {
  applicationSchema,
  evaluateAuthorization,
  permissionSchema,
  permissionApplication,
  requireAuthorization,
  scopeBindingSchema,
  scopeDimensionSchema,
  type Application,
  type Permission,
  type ScopeBinding,
} from "@slgs/permissions";

import type { SessionIdentity } from "./index";

type Database = DatabaseConnection["db"];

export function validateRoleAssignmentScopes(
  allowedScopeDimensions: readonly string[],
  scopes: readonly ScopeBinding[],
): void {
  const allowed = new Set(allowedScopeDimensions);
  if (allowed.size > 0 && scopes.length === 0) {
    throw new Error("A scoped role requires an explicit assignment scope.");
  }
  if (scopes.some(({ dimension }) => !allowed.has(dimension))) {
    throw new Error("Role assignment scope is not valid for this role.");
  }
}

function actorGrant(actor: SessionIdentity, application: Application) {
  return actor.grants.get(application);
}

function requireActorPermission(
  actor: SessionIdentity,
  application: Application,
  permission: Permission,
): void {
  requireAuthorization({
    identityId: actor.userId,
    application,
    permission,
    grant: actorGrant(actor, application),
    resource: permission.endsWith(":approved")
      ? { state: "approved" }
      : undefined,
  });
}

async function requireActorPermissionAudited(
  database: Database,
  actor: SessionIdentity,
  application: Application,
  permission: Permission,
): Promise<void> {
  const decision = evaluateAuthorization({
    identityId: actor.userId,
    application,
    permission,
    grant: actorGrant(actor, application),
    resource: permission.endsWith(":approved")
      ? { state: "approved" }
      : undefined,
  });
  if (decision.allowed) return;
  await database.insert(securityAuditEvent).values({
    id: crypto.randomUUID(),
    eventType: "authorization.denied",
    application,
    actorUserId: actor.userId,
    sessionId: actor.sessionId,
    targetType: "permission",
    targetId: permission,
    outcome: "denied",
    reasonCode: decision.reason,
    metadata: { permission },
  });
  requireActorPermission(actor, application, permission);
}

export async function createSimsRoleDefinition(
  database: Database,
  input: {
    readonly actor: SessionIdentity;
    readonly key: string;
    readonly name: string;
    readonly description: string;
    readonly permissions: readonly string[];
    readonly scopeDimensions: readonly string[];
  },
): Promise<string> {
  await requireActorPermissionAudited(
    database,
    input.actor,
    "sims",
    permissionSchema.parse("role:create:sims"),
  );
  const permissions = input.permissions.map((value) =>
    permissionSchema.parse(value),
  );
  if (permissions.some((value) => permissionApplication(value) !== "sims")) {
    throw new Error("Role permission does not belong to S.I.M.S.");
  }
  const scopeDimensions = input.scopeDimensions.map((value) =>
    scopeDimensionSchema.parse(value),
  );
  if (!input.key.match(/^[a-z][a-z0-9_]*$/)) {
    throw new Error("Role key is invalid.");
  }
  const roleId = crypto.randomUUID();
  await database.transaction(async (transaction) => {
    await transaction.insert(roleDefinition).values({
      id: roleId,
      application: "sims",
      key: input.key,
      name: input.name.trim(),
      description: input.description.trim(),
      permissions,
      scopeDimensions,
      systemManaged: false,
      active: true,
    });
    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "authorization.role.created",
      application: "sims",
      actorUserId: input.actor.userId,
      sessionId: input.actor.sessionId,
      targetType: "role_definition",
      targetId: roleId,
      outcome: "success",
      reasonCode: "role_create_authorized",
      metadata: { key: input.key },
    });
  });
  return roleId;
}

export async function createCmsRoleDefinition(
  database: Database,
  input: {
    readonly actor: SessionIdentity;
    readonly key: string;
    readonly name: string;
    readonly description: string;
    readonly permissions: readonly string[];
    readonly scopeDimensions: readonly string[];
  },
): Promise<string> {
  await requireActorPermissionAudited(
    database,
    input.actor,
    "cms",
    permissionSchema.parse("role:create:cms"),
  );
  const permissions = input.permissions.map((value) =>
    permissionSchema.parse(value),
  );
  if (permissions.some((value) => permissionApplication(value) !== "cms")) {
    throw new Error("Role permission does not belong to CMS.");
  }
  const scopeDimensions = input.scopeDimensions.map((value) =>
    scopeDimensionSchema.parse(value),
  );
  if (!input.key.match(/^[a-z][a-z0-9_]*$/))
    throw new Error("Role key is invalid.");
  const roleId = crypto.randomUUID();
  await database.transaction(async (transaction) => {
    await transaction.insert(roleDefinition).values({
      id: roleId,
      application: "cms",
      key: input.key,
      name: input.name.trim(),
      description: input.description.trim(),
      permissions,
      scopeDimensions,
      systemManaged: false,
      active: true,
    });
    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "authorization.role.created",
      application: "cms",
      actorUserId: input.actor.userId,
      sessionId: input.actor.sessionId,
      targetType: "role_definition",
      targetId: roleId,
      outcome: "success",
      reasonCode: "role_create_authorized",
      metadata: { key: input.key },
    });
  });
  return roleId;
}

export async function setCmsRoleDefinitionActive(
  database: Database,
  input: {
    readonly actor: SessionIdentity;
    readonly roleId: string;
    readonly active: boolean;
  },
): Promise<void> {
  await requireActorPermissionAudited(
    database,
    input.actor,
    "cms",
    permissionSchema.parse(
      input.active ? "role:update:cms" : "role:deactivate:cms",
    ),
  );
  await database.transaction(async (transaction) => {
    const [role] = await transaction
      .select({
        id: roleDefinition.id,
        systemManaged: roleDefinition.systemManaged,
      })
      .from(roleDefinition)
      .where(
        and(
          eq(roleDefinition.id, input.roleId),
          eq(roleDefinition.application, "cms"),
        ),
      )
      .limit(1);
    if (!role || role.systemManaged)
      throw new Error("Custom CMS role was not found.");
    await transaction
      .update(roleDefinition)
      .set({ active: input.active, updatedAt: new Date() })
      .where(eq(roleDefinition.id, role.id));
    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: input.active
        ? "authorization.role.activated"
        : "authorization.role.deactivated",
      application: "cms",
      actorUserId: input.actor.userId,
      sessionId: input.actor.sessionId,
      targetType: "role_definition",
      targetId: role.id,
      outcome: "success",
      reasonCode: "role_state_change_authorized",
      metadata: {},
    });
  });
}

export async function setSimsRoleDefinitionActive(
  database: Database,
  input: {
    readonly actor: SessionIdentity;
    readonly roleId: string;
    readonly active: boolean;
  },
): Promise<void> {
  await requireActorPermissionAudited(
    database,
    input.actor,
    "sims",
    permissionSchema.parse(
      input.active ? "role:update:sims" : "role:deactivate:sims",
    ),
  );
  await database.transaction(async (transaction) => {
    const [role] = await transaction
      .select({
        id: roleDefinition.id,
        systemManaged: roleDefinition.systemManaged,
      })
      .from(roleDefinition)
      .where(
        and(
          eq(roleDefinition.id, input.roleId),
          eq(roleDefinition.application, "sims"),
        ),
      )
      .limit(1);
    if (!role || role.systemManaged) {
      throw new Error("Custom S.I.M.S. role was not found.");
    }
    await transaction
      .update(roleDefinition)
      .set({ active: input.active, updatedAt: new Date() })
      .where(eq(roleDefinition.id, role.id));
    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: input.active
        ? "authorization.role.activated"
        : "authorization.role.deactivated",
      application: "sims",
      actorUserId: input.actor.userId,
      sessionId: input.actor.sessionId,
      targetType: "role_definition",
      targetId: role.id,
      outcome: "success",
      reasonCode: "role_state_change_authorized",
      metadata: {},
    });
  });
}

export async function assignRole(
  database: Database,
  input: {
    readonly actor: SessionIdentity;
    readonly application: Application;
    readonly targetUserId: string;
    readonly roleId: string;
    readonly scopes: readonly ScopeBinding[];
    readonly reason: string;
  },
): Promise<string> {
  const application = applicationSchema.parse(input.application);
  const required =
    application === "cms" ? "role:assign:cms" : "role:assign:approved";
  await requireActorPermissionAudited(
    database,
    input.actor,
    application,
    permissionSchema.parse(required),
  );
  const scopes = input.scopes.map((scope) => scopeBindingSchema.parse(scope));
  const assignmentId = crypto.randomUUID();

  await database.transaction(async (transaction) => {
    const [identity] = await transaction
      .select({ id: user.id, status: user.status })
      .from(user)
      .where(eq(user.id, input.targetUserId))
      .limit(1);
    if (!identity || identity.status !== "active") {
      throw new Error("Target identity is unavailable.");
    }
    const [membership] = await transaction
      .select({ id: applicationMembership.id })
      .from(applicationMembership)
      .where(
        and(
          eq(applicationMembership.userId, input.targetUserId),
          eq(applicationMembership.application, application),
          eq(applicationMembership.status, "active"),
        ),
      )
      .limit(1);
    if (!membership)
      throw new Error("Active application membership is required.");
    const [role] = await transaction
      .select({
        id: roleDefinition.id,
        application: roleDefinition.application,
        active: roleDefinition.active,
        scopeDimensions: roleDefinition.scopeDimensions,
      })
      .from(roleDefinition)
      .where(eq(roleDefinition.id, input.roleId))
      .limit(1);
    if (!role || !role.active || role.application !== application) {
      throw new Error("Approved role for this application is required.");
    }
    validateRoleAssignmentScopes(role.scopeDimensions, scopes);
    await transaction.insert(roleAssignment).values({
      id: assignmentId,
      membershipId: membership.id,
      roleDefinitionId: role.id,
      assignedBy: input.actor.userId,
      reason: input.reason.trim(),
    });
    if (scopes.length) {
      await transaction.insert(roleAssignmentScope).values(
        scopes.map((scope) => ({
          id: crypto.randomUUID(),
          roleAssignmentId: assignmentId,
          dimension: scope.dimension,
          value: scope.value,
        })),
      );
    }
    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "authorization.role.assigned",
      application,
      actorUserId: input.actor.userId,
      sessionId: input.actor.sessionId,
      targetType: "role_assignment",
      targetId: assignmentId,
      outcome: "success",
      reasonCode: "role_assignment_authorized",
      metadata: { roleId: role.id, targetUserId: input.targetUserId },
    });
  });
  return assignmentId;
}

export async function revokeRole(
  database: Database,
  input: {
    readonly actor: SessionIdentity;
    readonly application: Application;
    readonly assignmentId: string;
    readonly reason: string;
  },
): Promise<void> {
  const required =
    input.application === "cms" ? "role:revoke:cms" : "role:revoke:approved";
  await requireActorPermissionAudited(
    database,
    input.actor,
    input.application,
    permissionSchema.parse(required),
  );
  await database.transaction(async (transaction) => {
    const [assignment] = await transaction
      .select({
        id: roleAssignment.id,
        application: roleDefinition.application,
      })
      .from(roleAssignment)
      .innerJoin(
        roleDefinition,
        eq(roleAssignment.roleDefinitionId, roleDefinition.id),
      )
      .where(
        and(
          eq(roleAssignment.id, input.assignmentId),
          isNull(roleAssignment.revokedAt),
        ),
      )
      .limit(1);
    if (!assignment || assignment.application !== input.application) {
      throw new Error("Active role assignment was not found.");
    }
    await transaction
      .update(roleAssignment)
      .set({
        revokedAt: new Date(),
        revokedBy: input.actor.userId,
        reason: input.reason.trim(),
      })
      .where(eq(roleAssignment.id, assignment.id));
    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "authorization.role.revoked",
      application: input.application,
      actorUserId: input.actor.userId,
      sessionId: input.actor.sessionId,
      targetType: "role_assignment",
      targetId: assignment.id,
      outcome: "success",
      reasonCode: "role_revocation_authorized",
      metadata: {},
    });
  });
}
