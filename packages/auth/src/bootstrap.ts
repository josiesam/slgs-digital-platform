import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";

import {
  account,
  applicationMembership,
  approvedContactDomain,
  privilegedBootstrap,
  roleAssignment,
  roleDefinition,
  securityAuditEvent,
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
  | "sims_system_administrator";

const bootstrapRoleNames: Readonly<Record<BootstrapRole, string>> = {
  cms_administrator: "CMS Administrator",
  cms_system_administrator: "CMS System Administrator",
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
    if (requestedRole && requestedRole !== "sims_system_administrator") {
      throw new Error(
        "S.I.M.S. bootstrap only supports sims_system_administrator.",
      );
    }
    return "sims_system_administrator";
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

    await transaction.insert(user).values({
      id: userId,
      name: input.name.trim(),
      email,
      personReference: input.personReference.trim(),
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    await transaction.insert(account).values({
      id: crypto.randomUUID(),
      issuer: "local:credential",
      accountId: userId,
      providerId: "credential",
      userId,
      password: await hashPassword(input.password),
      createdAt: now,
      updatedAt: now,
    });
    await transaction.insert(privilegedBootstrap).values({
      id: requestId,
      initiatedBy: input.initiatorReference,
      targetUserId: userId,
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
