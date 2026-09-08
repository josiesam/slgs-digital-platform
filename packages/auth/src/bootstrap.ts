import { hashPassword } from "better-auth/crypto";
import { and, eq, inArray, or } from "drizzle-orm";

import {
  account,
  applicationMembership,
  approvedContactDomain,
  privilegedBootstrap,
  roleAssignment,
  roleAssignmentScope,
  roleDefinition,
  securityAuditEvent,
  session,
  twoFactor,
  user,
  type DatabaseConnection,
} from "@slgs/db";
import type { Application } from "@slgs/permissions";

import {
  ROLE_CONTRACTS,
  assertDistinctBootstrapApprovers,
  isEmailDomainApproved,
  normaliseApprovedDomain,
  type RoleKey,
} from "./policy";

type Database = DatabaseConnection["db"];
export type BootstrapRole =
  | "cms_administrator"
  | "cms_system_administrator"
  | "sims_access_administrator"
  | "sims_system_administrator";

const bootstrapRoleNames: Readonly<Record<BootstrapRole, string>> = {
  cms_administrator: "CMS Administrator",
  cms_system_administrator: "CMS System Administrator",
  sims_access_administrator: "S.I.M.S. Access Administrator",
  sims_system_administrator: "S.I.M.S. System Administrator",
};

export function assertSupportedBootstrapRequest(
  application: Application,
  role: BootstrapRole,
): void {
  const contract = ROLE_CONTRACTS[role];
  if (contract.application !== application) {
    throw new Error(
      "Bootstrap role does not belong to the requested application.",
    );
  }
}

export function resolveBootstrapRole(
  application: Application,
  requestedRole?: string,
): BootstrapRole {
  if (application === "cms") {
    const role = requestedRole ?? "cms_administrator";
    if (role !== "cms_administrator" && role !== "cms_system_administrator") {
      throw new Error(
        "CMS bootstrap role must be cms_administrator or cms_system_administrator.",
      );
    }
    return role;
  }
  if (application === "sims") {
    const role = requestedRole ?? "sims_system_administrator";
    if (
      role !== "sims_access_administrator" &&
      role !== "sims_system_administrator"
    ) {
      throw new Error(
        "S.I.M.S. bootstrap role must be sims_access_administrator or sims_system_administrator.",
      );
    }
    return role;
  }
  throw new Error("Bootstrap application must be cms or sims.");
}

export async function addApprovedBootstrapDomain(
  database: Database,
  input: { readonly domain: string; readonly operatorReference: string },
): Promise<string> {
  const domain = normaliseApprovedDomain(input.domain);
  const now = new Date();
  await database.transaction(async (transaction) => {
    await transaction
      .insert(approvedContactDomain)
      .values({
        domain,
        active: true,
        managedBy: input.operatorReference,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: approvedContactDomain.domain,
        set: {
          active: true,
          managedBy: input.operatorReference,
          updatedAt: now,
        },
      });
    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "contact_domain.approved",
      actorUserId: input.operatorReference,
      targetType: "contact_domain",
      targetId: domain,
      outcome: "success",
      reasonCode: "privileged_bootstrap",
      metadata: {},
      occurredAt: now,
    });
  });
  return domain;
}

export async function initiateAdministratorBootstrap(
  database: Database,
  input: {
    readonly application: Application;
    readonly role: BootstrapRole;
    readonly name: string;
    readonly email: string;
    readonly personReference: string;
    readonly password: string;
    readonly initiatorReference: string;
  },
): Promise<{ readonly requestId: string; readonly userId: string }> {
  assertSupportedBootstrapRequest(input.application, input.role);
  if (!input.name.trim() || !input.personReference.trim()) {
    throw new Error("Name and person reference are required.");
  }
  if (input.password.length < 8 || input.password.length > 128) {
    throw new Error("Password length must be between 8 and 128 characters.");
  }

  const email = input.email.trim().toLowerCase();
  const requestId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const now = new Date();

  await database.transaction(async (transaction) => {
    const domains = await transaction
      .select({ domain: approvedContactDomain.domain })
      .from(approvedContactDomain)
      .where(eq(approvedContactDomain.active, true));
    if (
      !isEmailDomainApproved(
        email,
        new Set(domains.map(({ domain }) => domain)),
      )
    ) {
      throw new Error("The identity contact domain is not approved.");
    }

    const [existing] = await transaction
      .select({ id: privilegedBootstrap.id })
      .from(privilegedBootstrap)
      .where(
        and(
          eq(privilegedBootstrap.application, input.application),
          eq(privilegedBootstrap.roleKey, input.role),
        ),
      )
      .limit(1);
    if (existing) {
      throw new Error(
        "This initial administrator role already has a bootstrap request.",
      );
    }

    const [existingUser] = await transaction
      .select({ id: user.id })
      .from(user)
      .where(
        or(
          eq(user.email, email),
          eq(user.personReference, input.personReference.trim()),
        ),
      )
      .limit(1);

    const targetUserId = existingUser ? existingUser.id : userId;

    if (existingUser) {
      await transaction
        .update(user)
        .set({
          name: input.name.trim(),
          status: "pending",
          updatedAt: now,
        })
        .where(eq(user.id, targetUserId));
    } else {
      await transaction.insert(user).values({
        id: targetUserId,
        name: input.name.trim(),
        email,
        personReference: input.personReference.trim(),
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    }

    await transaction.delete(account).where(eq(account.userId, targetUserId));

    await transaction.insert(account).values({
      id: crypto.randomUUID(),
      issuer: "local:credential",
      accountId: targetUserId,
      providerId: "credential",
      userId: targetUserId,
      password: await hashPassword(input.password),
      createdAt: now,
      updatedAt: now,
    });
    await transaction.insert(privilegedBootstrap).values({
      id: requestId,
      initiatedBy: input.initiatorReference,
      targetUserId,
      application: input.application,
      roleKey: input.role,
      status: "pending",
      initiatedAt: now,
    });
    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "bootstrap.initiated",
      application: input.application,
      actorUserId: input.initiatorReference,
      targetType: "bootstrap_request",
      targetId: requestId,
      outcome: "success",
      reasonCode: input.role,
      metadata: {},
      occurredAt: now,
    });
  });

  return { requestId, userId };
}

export async function approveAdministratorBootstrap(
  database: Database,
  input: { readonly requestId: string; readonly approverReference: string },
): Promise<void> {
  await database.transaction(async (transaction) => {
    const [request] = await transaction
      .select()
      .from(privilegedBootstrap)
      .where(eq(privilegedBootstrap.id, input.requestId))
      .limit(1)
      .for("update");
    if (!request) throw new Error("Bootstrap request was not found.");
    if (request.status !== "pending") {
      throw new Error("Bootstrap request is no longer pending.");
    }
    assertDistinctBootstrapApprovers(
      request.initiatedBy,
      input.approverReference,
    );

    const role = request.roleKey as RoleKey;
    if (
      role !== "cms_administrator" &&
      role !== "cms_system_administrator" &&
      role !== "sims_access_administrator" &&
      role !== "sims_system_administrator"
    ) {
      throw new Error("Bootstrap request contains an unsupported role.");
    }
    assertSupportedBootstrapRequest(request.application, role);
    const contract = ROLE_CONTRACTS[role];

    const now = new Date();
    const roleId = crypto.randomUUID();
    await transaction
      .insert(roleDefinition)
      .values({
        id: roleId,
        application: request.application,
        key: role,
        name: bootstrapRoleNames[role],
        description: "System-managed Phase 1A bootstrap role.",
        permissions: [...contract.permissions],
        scopeDimensions: [
          ...((contract as { scopeDimensions?: readonly string[] })
            .scopeDimensions ?? []),
        ],
        systemManaged: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: [roleDefinition.application, roleDefinition.key],
      });
    const [storedRole] = await transaction
      .select({ id: roleDefinition.id })
      .from(roleDefinition)
      .where(
        and(
          eq(roleDefinition.application, request.application),
          eq(roleDefinition.key, role),
          eq(roleDefinition.active, true),
        ),
      )
      .limit(1);
    if (!storedRole) throw new Error("Bootstrap role is unavailable.");

    const membershipId = crypto.randomUUID();
    await transaction.insert(applicationMembership).values({
      id: membershipId,
      userId: request.targetUserId,
      application: request.application,
      status: "active",
      approvedBy: input.approverReference,
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await transaction.insert(roleAssignment).values({
      id: crypto.randomUUID(),
      membershipId,
      roleDefinitionId: storedRole.id,
      assignedBy: input.approverReference,
      assignedAt: now,
      reason: "Initial two-person administrator bootstrap",
    });
    await transaction
      .update(user)
      .set({ status: "active", updatedAt: now })
      .where(eq(user.id, request.targetUserId));
    await transaction
      .update(privilegedBootstrap)
      .set({
        approvedBy: input.approverReference,
        status: "completed",
        outcomeReason: "two_person_approval_complete",
        decidedAt: now,
      })
      .where(eq(privilegedBootstrap.id, request.id));
    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "bootstrap.completed",
      application: request.application,
      actorUserId: input.approverReference,
      targetType: "bootstrap_request",
      targetId: request.id,
      outcome: "success",
      reasonCode: role,
      metadata: {},
      occurredAt: now,
    });
  });
}

export async function listAdministratorBootstraps(database: Database) {
  return database
    .select({
      id: privilegedBootstrap.id,
      application: privilegedBootstrap.application,
      role: privilegedBootstrap.roleKey,
      status: privilegedBootstrap.status,
      initiatedBy: privilegedBootstrap.initiatedBy,
      approvedBy: privilegedBootstrap.approvedBy,
      targetUserId: privilegedBootstrap.targetUserId,
      initiatedAt: privilegedBootstrap.initiatedAt,
      decidedAt: privilegedBootstrap.decidedAt,
    })
    .from(privilegedBootstrap);
}

export async function clearAdministratorBootstrap(
  database: Database,
  input?: {
    readonly application?: Application;
    readonly role?: string;
    readonly operatorReference?: string;
  },
): Promise<{ readonly clearedCount: number }> {
  const now = new Date();
  const operatorReference = input?.operatorReference?.trim() || "system";

  let clearedCount = 0;

  await database.transaction(async (transaction) => {
    const conditions = [];
    if (input?.application) {
      conditions.push(eq(privilegedBootstrap.application, input.application));
    }
    if (input?.role) {
      conditions.push(eq(privilegedBootstrap.roleKey, input.role));
    }

    const requests = await transaction
      .select({
        id: privilegedBootstrap.id,
        targetUserId: privilegedBootstrap.targetUserId,
        application: privilegedBootstrap.application,
        roleKey: privilegedBootstrap.roleKey,
      })
      .from(privilegedBootstrap)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    if (requests.length === 0) {
      return;
    }

    clearedCount = requests.length;

    const requestIds = requests.map((r) => r.id);
    const targetUserIds = [...new Set(requests.map((r) => r.targetUserId))];

    const memberships = await transaction
      .select({ id: applicationMembership.id, userId: applicationMembership.userId })
      .from(applicationMembership)
      .where(inArray(applicationMembership.userId, targetUserIds));

    const membershipIds = memberships.map((m) => m.id);

    if (membershipIds.length > 0) {
      const assignments = await transaction
        .select({ id: roleAssignment.id })
        .from(roleAssignment)
        .where(inArray(roleAssignment.membershipId, membershipIds));

      const assignmentIds = assignments.map((a) => a.id);

      if (assignmentIds.length > 0) {
        await transaction
          .delete(roleAssignmentScope)
          .where(inArray(roleAssignmentScope.roleAssignmentId, assignmentIds));

        await transaction
          .delete(roleAssignment)
          .where(inArray(roleAssignment.id, assignmentIds));
      }

      await transaction
        .delete(applicationMembership)
        .where(inArray(applicationMembership.id, membershipIds));
    }

    await transaction
      .delete(privilegedBootstrap)
      .where(inArray(privilegedBootstrap.id, requestIds));

    for (const userId of targetUserIds) {
      const remainingBootstraps = await transaction
        .select({ id: privilegedBootstrap.id })
        .from(privilegedBootstrap)
        .where(eq(privilegedBootstrap.targetUserId, userId))
        .limit(1);

      const remainingMemberships = await transaction
        .select({ id: applicationMembership.id })
        .from(applicationMembership)
        .where(eq(applicationMembership.userId, userId))
        .limit(1);

      if (remainingBootstraps.length === 0 && remainingMemberships.length === 0) {
        await transaction.delete(twoFactor).where(eq(twoFactor.userId, userId));
        await transaction.delete(session).where(eq(session.userId, userId));
        await transaction.delete(account).where(eq(account.userId, userId));
        try {
          await transaction.transaction(async (tx) => {
            await tx.delete(user).where(eq(user.id, userId));
          });
        } catch {
          // User record is referenced by domain entities (e.g. cms.club or cms.article).
          // Retain identity shell while permissions, memberships, accounts and bootstrap records are cleared.
        }
      }
    }

    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "bootstrap.cleared",
      actorUserId: operatorReference,
      targetType: "bootstrap_request",
      outcome: "success",
      reasonCode: "dev_reset",
      metadata: {
        clearedCount,
        application: input?.application ?? "all",
        role: input?.role ?? "all",
      },
      occurredAt: now,
    });
  });

  return { clearedCount };
}
