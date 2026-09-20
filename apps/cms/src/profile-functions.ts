import { hashPassword, verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireIdentity } from "@slgs/auth";
import {
  account,
  securityAuditEvent,
  user,
} from "@slgs/db";
import { database, sessions } from "./auth.server";

async function getAuthenticatedIdentity() {
  const request = new Request("http://internal.slgs/cms-profile", {
    headers: getRequestHeaders(),
  });
  return requireIdentity(sessions, request);
}

export const getSignedInUserProfile = createServerFn({ method: "GET" }).handler(
  async () => {
    const identity = await getAuthenticatedIdentity();
    const grant = identity.grants.get("cms");
    const userPermissions = Array.from(grant?.permissions ?? []);

    const [userRecord] = await database.db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, identity.userId))
      .limit(1);

    if (!userRecord) {
      throw new Error("User profile not found.");
    }

    let roleTitle = "CMS Member";
    if (
      userPermissions.includes("role:assign:cms") ||
      userPermissions.includes("user:create:cms")
    ) {
      roleTitle = "CMS Administrator";
    } else if (
      userPermissions.includes("content:publish:approved") ||
      userPermissions.includes("content:publish:cms")
    ) {
      roleTitle = "Publisher";
    } else if (
      userPermissions.includes("content:approve:assigned") ||
      userPermissions.includes("content:approve:cms")
    ) {
      roleTitle = "Approver";
    } else if (
      userPermissions.includes("content:review:assigned") ||
      userPermissions.includes("content:review:cms")
    ) {
      roleTitle = "Reviewer";
    } else if (
      userPermissions.includes("article:create:own") ||
      userPermissions.includes("content:create:own")
    ) {
      roleTitle = "Club Contributor";
    }

    return {
      user: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        status: userRecord.status,
        role: roleTitle,
        createdAt: userRecord.createdAt.toISOString(),
      },
      permissions: userPermissions,
    };
  },
);

export const updateSignedInUserProfile = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        name: z.string().trim().min(1).max(160),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const identity = await getAuthenticatedIdentity();
    const now = new Date();

    await database.db
      .update(user)
      .set({
        name: data.name,
        updatedAt: now,
      })
      .where(eq(user.id, identity.userId));

    await database.db.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "user.profile_updated",
      application: "cms",
      actorUserId: identity.userId,
      sessionId: identity.sessionId,
      targetType: "user",
      targetId: identity.userId,
      outcome: "success",
      reasonCode: "self_update",
      metadata: { name: data.name },
      occurredAt: now,
    });

    sessions.invalidateUser(identity.userId);

    return { success: true, name: data.name };
  });

export const changeSignedInUserPassword = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const identity = await getAuthenticatedIdentity();
    const now = new Date();

    const [accountRecord] = await database.db
      .select({
        id: account.id,
        password: account.password,
      })
      .from(account)
      .where(eq(account.userId, identity.userId))
      .limit(1);

    if (!accountRecord || !accountRecord.password) {
      throw new Error("No password credential found for this account.");
    }

    const isValid = await verifyPassword({
      hash: accountRecord.password,
      password: data.currentPassword,
    });

    if (!isValid) {
      throw new Error("Current password is invalid.");
    }

    const newHashedPassword = await hashPassword(data.newPassword);

    await database.db
      .update(account)
      .set({
        password: newHashedPassword,
        updatedAt: now,
      })
      .where(eq(account.id, accountRecord.id));

    await database.db.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "user.password_changed",
      application: "cms",
      actorUserId: identity.userId,
      sessionId: identity.sessionId,
      targetType: "user",
      targetId: identity.userId,
      outcome: "success",
      reasonCode: "self_service_password_change",
      metadata: {},
      occurredAt: now,
    });

    sessions.invalidateUser(identity.userId);

    return { success: true };
  });

export const requestSignedInUserPasswordReset = createServerFn({
  method: "POST",
}).handler(async () => {
  const identity = await getAuthenticatedIdentity();
  const now = new Date();

  const [userRecord] = await database.db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, identity.userId))
    .limit(1);

  if (!userRecord) {
    throw new Error("User not found.");
  }

  await database.db.insert(securityAuditEvent).values({
    id: crypto.randomUUID(),
    eventType: "user.password_reset_requested",
    application: "cms",
    actorUserId: identity.userId,
    sessionId: identity.sessionId,
    targetType: "user",
    targetId: identity.userId,
    outcome: "success",
    reasonCode: "self_service_reset_request",
    metadata: { email: userRecord.email },
    occurredAt: now,
  });

  return {
    success: true,
    email: userRecord.email,
    message: `Password reset request logged for ${userRecord.email}. Check your inbox for reset instructions.`,
  };
});
