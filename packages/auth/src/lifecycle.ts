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
import { evaluateAuthorization, requireAuthorization } from "@slgs/permissions";

import { isEmailDomainApproved } from "./policy";
import type { SessionIdentity } from "./index";

type Database = DatabaseConnection["db"];

export interface ProvisionPasswordIdentityInput {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly personReference: string;
  readonly actor: SessionIdentity;
}

export function authorizeSimsIdentityAdministration(
  actor: SessionIdentity,
): void {
  requireAuthorization({
    identityId: actor.userId,
    application: "sims",
    permission: "identity:manage:sims",
    grant: actor.grants.get("sims"),
  });
}

async function requireSimsIdentityAdministration(
  database: Database,
  actor: SessionIdentity,
): Promise<void> {
  const decision = evaluateAuthorization({
    identityId: actor.userId,
    application: "sims",
    permission: "identity:manage:sims",
    grant: actor.grants.get("sims"),
  });
  if (decision.allowed) return;
  await database.insert(securityAuditEvent).values({
    id: crypto.randomUUID(),
    eventType: "authorization.denied",
    application: "sims",
    actorUserId: actor.userId,
    sessionId: actor.sessionId,
    targetType: "permission",
    targetId: "identity:manage:sims",
    outcome: "denied",
    reasonCode: decision.reason,
    metadata: { permission: "identity:manage:sims" },
  });
  authorizeSimsIdentityAdministration(actor);
}

export async function provisionPasswordIdentity(
  database: Database,
  input: ProvisionPasswordIdentityInput,
): Promise<{ readonly userId: string }> {
  await requireSimsIdentityAdministration(database, input.actor);
  if (!input.name.trim() || !input.personReference.trim()) {
    throw new Error("Identity name and person reference are required.");
  }
  if (input.password.length < 8 || input.password.length > 128) {
    throw new Error("Password length must be between 8 and 128 characters.");
  }
  return database.transaction(async (transaction) => {
    const approvedDomains = await transaction
      .select({ domain: approvedContactDomain.domain })
      .from(approvedContactDomain)
      .where(eq(approvedContactDomain.active, true));
    const domainSet = new Set(approvedDomains.map(({ domain }) => domain));

    if (!isEmailDomainApproved(input.email, domainSet)) {
      throw new Error("The identity contact domain is not approved.");
    }

    const userId = crypto.randomUUID();
    const now = new Date();
    await transaction.insert(user).values({
      id: userId,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
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
    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "identity.provisioned",
      application: "sims",
      actorUserId: input.actor.userId,
      sessionId: input.actor.sessionId,
      targetType: "identity",
      targetId: userId,
      outcome: "success",
      reasonCode: "awaiting_approval",
      metadata: {},
      occurredAt: now,
    });
    return { userId };
  });
}

async function changeIdentityStatus(
  database: Database,
  input: {
    readonly userId: string;
    readonly actor: SessionIdentity;
    readonly status: "active" | "suspended" | "deactivated";
    readonly reasonCode: string;
  },
): Promise<void> {
  await requireSimsIdentityAdministration(database, input.actor);
  await database.transaction(async (transaction) => {
    const updated = await transaction
      .update(user)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(user.id, input.userId))
      .returning({ id: user.id });
    if (updated.length !== 1) throw new Error("Identity was not found.");

    if (input.status !== "active") {
      await transaction.delete(session).where(eq(session.userId, input.userId));
    }
    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: `identity.${input.status}`,
      application: "sims",
      actorUserId: input.actor.userId,
      sessionId: input.actor.sessionId,
      targetType: "identity",
      targetId: input.userId,
      outcome: "success",
      reasonCode: input.reasonCode,
      metadata: {},
    });
  });
}

export async function activateIdentity(
  database: Database,
  input: { userId: string; actor: SessionIdentity; reasonCode: string },
): Promise<void> {
  await changeIdentityStatus(database, { ...input, status: "active" });
}

export async function suspendIdentity(
  database: Database,
  input: { userId: string; actor: SessionIdentity; reasonCode: string },
): Promise<void> {
  await changeIdentityStatus(database, { ...input, status: "suspended" });
}

export async function deactivateIdentity(
  database: Database,
  input: { userId: string; actor: SessionIdentity; reasonCode: string },
): Promise<void> {
  await changeIdentityStatus(database, { ...input, status: "deactivated" });
}

export async function createSimsMembership(
  database: Database,
  input: { userId: string; actor: SessionIdentity; reasonCode: string },
): Promise<string> {
  await requireSimsIdentityAdministration(database, input.actor);
  return database.transaction(async (transaction) => {
    const [identity] = await transaction
      .select({ id: user.id, status: user.status })
      .from(user)
      .where(eq(user.id, input.userId))
      .limit(1);
    if (!identity || identity.status === "deactivated") {
      throw new Error("Identity is unavailable for membership.");
    }
    const [existing] = await transaction
      .select({ id: applicationMembership.id })
      .from(applicationMembership)
      .where(
        and(
          eq(applicationMembership.userId, input.userId),
          eq(applicationMembership.application, "sims"),
        ),
      )
      .limit(1);
    if (existing) throw new Error("S.I.M.S. membership already exists.");
    const id = crypto.randomUUID();
    await transaction.insert(applicationMembership).values({
      id,
      userId: input.userId,
      application: "sims",
      status: "active",
      approvedBy: input.actor.userId,
      approvedAt: new Date(),
    });
    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "membership.created",
      application: "sims",
      actorUserId: input.actor.userId,
      sessionId: input.actor.sessionId,
      targetType: "application_membership",
      targetId: id,
      outcome: "success",
      reasonCode: input.reasonCode,
      metadata: { targetUserId: input.userId },
    });
    return id;
  });
}

export async function setSimsMembershipStatus(
  database: Database,
  input: {
    userId: string;
    actor: SessionIdentity;
    status: "active" | "suspended" | "deactivated";
    reasonCode: string;
  },
): Promise<void> {
  await requireSimsIdentityAdministration(database, input.actor);
  await database.transaction(async (transaction) => {
    const rows = await transaction
      .update(applicationMembership)
      .set({ status: input.status, updatedAt: new Date() })
      .where(
        and(
          eq(applicationMembership.userId, input.userId),
          eq(applicationMembership.application, "sims"),
        ),
      )
      .returning({ id: applicationMembership.id });
    if (rows.length !== 1)
      throw new Error("S.I.M.S. membership was not found.");
    if (input.status !== "active") {
      await transaction.delete(session).where(eq(session.userId, input.userId));
    }
    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: `membership.${input.status}`,
      application: "sims",
      actorUserId: input.actor.userId,
      sessionId: input.actor.sessionId,
      targetType: "application_membership",
      targetId: rows[0]!.id,
      outcome: "success",
      reasonCode: input.reasonCode,
      metadata: { targetUserId: input.userId },
    });
  });
}

export async function revokeIdentitySessions(
  database: Database,
  input: { userId: string; actor: SessionIdentity; reasonCode: string },
): Promise<void> {
  await requireSimsIdentityAdministration(database, input.actor);
  await database.transaction(async (transaction) => {
    await transaction.delete(session).where(eq(session.userId, input.userId));
    await transaction.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "identity.sessions_revoked",
      application: "sims",
      actorUserId: input.actor.userId,
      sessionId: input.actor.sessionId,
      targetType: "identity",
      targetId: input.userId,
      outcome: "success",
      reasonCode: input.reasonCode,
      metadata: {},
    });
  });
}
