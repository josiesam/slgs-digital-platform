import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";

import {
  account,
  applicationMembership,
  approvedContactDomain,
  securityAuditEvent,
  session,
  user,
  type DatabaseConnection,
} from "@slgs/db";
import {
  evaluateAuthorization,
  requireAuthorization,
  type Permission,
} from "@slgs/permissions";
import { isEmailDomainApproved } from "./policy";
import type { SessionIdentity } from "./index";

type Database = DatabaseConnection["db"];

async function requireCmsUserPermission(
  database: Database,
  actor: SessionIdentity,
  permission: Permission,
): Promise<void> {
  const request = {
    identityId: actor.userId,
    application: "cms" as const,
    permission,
    grant: actor.grants.get("cms"),
  };
  const decision = evaluateAuthorization(request);
  if (!decision.allowed) {
    await database.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "authorization.denied",
      application: "cms",
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      targetType: "permission",
      targetId: permission,
      outcome: "denied",
      reasonCode: decision.reason,
      metadata: { permission },
    });
  }
  requireAuthorization(request);
}

export async function provisionCmsUser(
  database: Database,
  input: {
    readonly name: string;
    readonly email: string;
    readonly temporaryPassword: string;
    readonly personReference: string;
    readonly actor: SessionIdentity;
  },
): Promise<{ readonly userId: string; readonly membershipId: string }> {
  await requireCmsUserPermission(database, input.actor, "user:create:cms");
  if (!input.name.trim() || !input.personReference.trim())
    throw new Error("Name and approved person reference are required.");
  if (
    input.temporaryPassword.length < 12 ||
    input.temporaryPassword.length > 128
  )
    throw new Error(
      "Temporary password length must be between 12 and 128 characters.",
    );
  return database.transaction(async (transaction) => {
    const approvedDomains = await transaction
      .select({ domain: approvedContactDomain.domain })
      .from(approvedContactDomain)
      .where(eq(approvedContactDomain.active, true));
    const email = input.email.trim().toLowerCase();
    if (
      !isEmailDomainApproved(
        email,
        new Set(approvedDomains.map(({ domain }) => domain)),
      )
    )
      throw new Error("The user contact domain is not approved.");
    const now = new Date();
    const userId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();
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
      password: await hashPassword(input.temporaryPassword),
      createdAt: now,
      updatedAt: now,
    });
    await transaction.insert(applicationMembership).values({
      id: membershipId,
      userId,
      application: "cms",
      status: "active",
      approvedBy: input.actor.userId,
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "cms_user.provisioned",
      application: "cms",
      actorUserId: input.actor.userId,
      sessionId: input.actor.sessionId,
      targetType: "user",
      targetId: userId,
      outcome: "success",
      reasonCode: "cms_user_provisioned",
      metadata: {},
      occurredAt: now,
    });
    return { userId, membershipId };
  });
}

export async function setCmsUserStatus(
  database: Database,
  input: {
    readonly userId: string;
    readonly actor: SessionIdentity;
    readonly status: "active" | "suspended" | "deactivated";
    readonly reasonCode: string;
  },
): Promise<void> {
  await requireCmsUserPermission(
    database,
    input.actor,
    input.status === "deactivated" ? "user:deactivate:cms" : "user:update:cms",
  );
  try {
    assertCmsUserStatusChangeAllowed(
      input.actor.userId,
      input.userId,
      input.status,
    );
  } catch (error) {
    await database.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "cms_user.status_change_denied",
      application: "cms",
      actorUserId: input.actor.userId,
      sessionId: input.actor.sessionId,
      targetType: "user",
      targetId: input.userId,
      outcome: "denied",
      reasonCode: "self_lifecycle_change_denied",
      metadata: { requestedStatus: input.status },
    });
    throw error;
  }
  await database.transaction(async (transaction) => {
    const updated = await transaction
      .update(user)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(user.id, input.userId))
      .returning({ id: user.id });
    if (updated.length !== 1) throw new Error("CMS user was not found.");
    await transaction
      .update(applicationMembership)
      .set({ status: input.status, updatedAt: new Date() })
      .where(
        and(
          eq(applicationMembership.userId, input.userId),
          eq(applicationMembership.application, "cms"),
        ),
      );
    if (input.status !== "active")
      await transaction.delete(session).where(eq(session.userId, input.userId));
    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: `cms_user.${input.status}`,
      application: "cms",
      actorUserId: input.actor.userId,
      sessionId: input.actor.sessionId,
      targetType: "user",
      targetId: input.userId,
      outcome: "success",
      reasonCode: input.reasonCode,
      metadata: {},
    });
  });
}

export function assertCmsUserStatusChangeAllowed(
  actorUserId: string,
  targetUserId: string,
  status: "active" | "suspended" | "deactivated",
): void {
  if (actorUserId === targetUserId && status !== "active") {
    throw new Error(
      "Administrators cannot suspend or deactivate their own account.",
    );
  }
}

export async function revokeCmsUserSessions(
  database: Database,
  input: {
    readonly userId: string;
    readonly actor: SessionIdentity;
    readonly reasonCode: string;
  },
): Promise<void> {
  await requireCmsUserPermission(database, input.actor, "session:revoke:cms");
  await database.transaction(async (transaction) => {
    await transaction.delete(session).where(eq(session.userId, input.userId));
    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "cms_user.sessions_revoked",
      application: "cms",
      actorUserId: input.actor.userId,
      sessionId: input.actor.sessionId,
      targetType: "user",
      targetId: input.userId,
      outcome: "success",
      reasonCode: input.reasonCode,
      metadata: {},
    });
  });
}
