import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";

import {
  account,
  approvedContactDomain,
  securityAuditEvent,
  session,
  user,
  type DatabaseConnection,
} from "@slgs/db";

import { isEmailDomainApproved } from "./policy";

type Database = DatabaseConnection["db"];

export interface ProvisionPasswordIdentityInput {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly personReference: string;
  readonly initiatedBy: string;
}

export async function provisionPasswordIdentity(
  database: Database,
  input: ProvisionPasswordIdentityInput,
): Promise<{ readonly userId: string }> {
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
      actorUserId: input.initiatedBy,
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
    readonly actorUserId: string;
    readonly status: "active" | "suspended" | "deactivated";
    readonly reasonCode: string;
  },
): Promise<void> {
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
      actorUserId: input.actorUserId,
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
  input: { userId: string; actorUserId: string; reasonCode: string },
): Promise<void> {
  await changeIdentityStatus(database, { ...input, status: "active" });
}

export async function suspendIdentity(
  database: Database,
  input: { userId: string; actorUserId: string; reasonCode: string },
): Promise<void> {
  await changeIdentityStatus(database, { ...input, status: "suspended" });
}

export async function deactivateIdentity(
  database: Database,
  input: { userId: string; actorUserId: string; reasonCode: string },
): Promise<void> {
  await changeIdentityStatus(database, { ...input, status: "deactivated" });
}
