import { and, desc, eq } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  assignRole,
  createCmsRoleDefinition,
  requireIdentity,
  setCmsRoleDefinitionActive,
} from "@slgs/auth";
import {
  CmsService,
  DrizzleCmsRepository,
  MediaService,
  createCloudflareR2Storage,
  createContentSchema,
  updateContentSchema,
} from "@slgs/cms-domain";
import {
  applicationMembership,
  club,
  contentItem,
  editorialAuditEvent,
  mediaAsset,
  roleDefinition,
  user,
} from "@slgs/db";
import {
  evaluateAuthorization,
  permissionSchema,
  requireAuthorization,
  scopeDimensionSchema,
  type Permission,
} from "@slgs/permissions";

import { database, sessions } from "./auth.server";

const repository = new DrizzleCmsRepository(database.db);
const service = new CmsService(repository);
let configuredMediaService: MediaService | undefined;
const getMediaService = () =>
  (configuredMediaService ??= new MediaService(
    repository,
    createCloudflareR2Storage(process.env),
  ));

const requestIdentity = async () => {
  const request = new Request("http://internal.slgs/cms", {
    headers: getRequestHeaders(),
  });
  const identity = await requireIdentity(sessions, request);
  const grant = identity.grants.get("cms");
  if (!grant) throw new Error("CMS authorization grant is unavailable.");
  return {
    identity,
    actor: {
      userId: identity.userId,
      sessionId: identity.sessionId,
      grant,
    },
  };
};

const requireCmsPermission = async (
  identity: Awaited<ReturnType<typeof requestIdentity>>["identity"],
  permission: Permission,
) => {
  const grant = identity.grants.get("cms");
  const decision = evaluateAuthorization({
    identityId: identity.userId,
    application: "cms",
    permission,
    grant,
  });
  if (!decision.allowed) {
    await database.db.insert(editorialAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "authorization.denied",
      actorUserId: identity.userId,
      sessionId: identity.sessionId,
      resourceType: "permission",
      resourceId: permission,
      outcome: "denied",
      reasonCode: decision.reason,
      metadata: { permission },
    });
  }
  requireAuthorization({
    identityId: identity.userId,
    application: "cms",
    permission,
    grant,
  });
};

const actionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum([
    "submit",
    "start_review",
    "complete_review",
    "reject",
    "approve",
    "publish",
    "unpublish",
  ]),
  comment: z.string().trim().max(2_000).optional(),
});

const roleInputSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]*$/)
    .max(100),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(600),
  permissions: z.array(permissionSchema).min(1).max(50),
  scopeDimensions: z.array(scopeDimensionSchema).max(8),
});

const mediaUploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  declaredMimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  byteSize: z.number().int().positive().max(10_000_000),
  signatureBytes: z.array(z.number().int().min(0).max(255)).min(3).max(32),
  altText: z.string().trim().min(1).max(500),
  owningClubId: z.string().min(1).optional(),
});

export const getCmsDashboard = createServerFn({ method: "GET" }).handler(
  async () => {
    const { identity, actor } = await requestIdentity();
    const rows = await database.db
      .select({
        id: contentItem.id,
        type: contentItem.type,
        title: contentItem.title,
        slug: contentItem.slug,
        state: contentItem.state,
        authorUserId: contentItem.authorUserId,
        owningClubId: contentItem.owningClubId,
        updatedAt: contentItem.updatedAt,
      })
      .from(contentItem)
      .orderBy(desc(contentItem.updatedAt))
      .limit(200);
    const permissions = [...actor.grant.permissions];
    const contentReadPermissions = permissions.filter(
      (permission): permission is Permission =>
        permission === "article:read:club" ||
        permission === "content:read:club" ||
        permission === "content:read:assigned" ||
        permission === "content:read:approved",
    );
    const visible = rows.filter((item) => {
      if (item.authorUserId === identity.userId) return true;
      const resource = {
        ownerId: item.authorUserId,
        state:
          item.state === "in_review"
            ? ("submitted" as const)
            : item.state === "rejected"
              ? ("draft" as const)
              : item.state,
        scopes: [
          { dimension: "organisation" as const, value: "slgs" },
          ...(item.owningClubId
            ? [{ dimension: "club" as const, value: item.owningClubId }]
            : []),
        ],
      };
      return contentReadPermissions.some(
        (permission) =>
          evaluateAuthorization({
            identityId: identity.userId,
            application: "cms",
            permission,
            grant: actor.grant,
            authorId: item.authorUserId,
            resource,
          }).allowed,
      );
    });
    const allClubs = await database.db
      .select({ id: club.id, name: club.name })
      .from(club)
      .where(eq(club.status, "active"));
    const assignedClubIds = new Set(
      actor.grant.entitlements.flatMap((entitlement) =>
        entitlement.scopes
          .filter((scope) => scope.dimension === "club")
          .map((scope) => scope.value),
      ),
    );
    const canManageConfiguration = permissions.includes(
      "configuration:manage:cms",
    );
    const clubs = canManageConfiguration
      ? allClubs
      : allClubs.filter((item) => assignedClubIds.has(item.id));
    const canManageRoles = permissions.includes("role:create:cms");
    const roles = canManageRoles
      ? await database.db
          .select({
            id: roleDefinition.id,
            key: roleDefinition.key,
            name: roleDefinition.name,
            active: roleDefinition.active,
            systemManaged: roleDefinition.systemManaged,
          })
          .from(roleDefinition)
          .where(eq(roleDefinition.application, "cms"))
      : [];
    const members = canManageRoles
      ? await database.db
          .select({ id: user.id, name: user.name, email: user.email })
          .from(applicationMembership)
          .innerJoin(user, eq(applicationMembership.userId, user.id))
          .where(
            and(
              eq(applicationMembership.application, "cms"),
              eq(applicationMembership.status, "active"),
              eq(user.status, "active"),
            ),
          )
      : [];
    const mediaRows = await database.db
      .select({
        id: mediaAsset.id,
        filename: mediaAsset.normalizedFilename,
        altText: mediaAsset.altText,
        mimeType: mediaAsset.detectedMimeType,
        byteSize: mediaAsset.byteSize,
        ownerUserId: mediaAsset.ownerUserId,
        owningClubId: mediaAsset.owningClubId,
        status: mediaAsset.status,
      })
      .from(mediaAsset)
      .orderBy(desc(mediaAsset.createdAt))
      .limit(100);
    const visibleMedia = mediaRows.filter((item) => {
      if (item.ownerUserId === identity.userId) return true;
      return evaluateAuthorization({
        identityId: identity.userId,
        application: "cms",
        permission: "media:read:club",
        grant: actor.grant,
        resource: {
          ownerId: item.ownerUserId,
          scopes: item.owningClubId
            ? [{ dimension: "club", value: item.owningClubId }]
            : [],
        },
      }).allowed;
    });
    return {
      userId: identity.userId,
      permissions,
      clubs,
      roles,
      members,
      media: visibleMedia,
      content: visible.map((item) => ({
        ...item,
        updatedAt: item.updatedAt.toISOString(),
      })),
    };
  },
);

export const createCmsContent = createServerFn({ method: "POST" })
  .validator((input) => createContentSchema.parse(input))
  .handler(async ({ data }) => {
    const { actor } = await requestIdentity();
    const created = await service.createContent(actor, data);
    return { id: created.id, state: created.state };
  });

export const createCmsClub = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        key: z
          .string()
          .trim()
          .regex(/^[a-z][a-z0-9_-]*$/)
          .max(100),
        name: z.string().trim().min(1).max(160),
        description: z.string().trim().max(600).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { identity } = await requestIdentity();
    await requireCmsPermission(identity, "configuration:manage:cms");
    const id = crypto.randomUUID();
    await database.db.transaction(async (transaction) => {
      await transaction.insert(club).values({
        id,
        key: data.key,
        name: data.name,
        description: data.description,
        createdBy: identity.userId,
      });
      await transaction.insert(editorialAuditEvent).values({
        id: crypto.randomUUID(),
        eventType: "club.created",
        actorUserId: identity.userId,
        sessionId: identity.sessionId,
        resourceType: "club",
        resourceId: id,
        outcome: "success",
        metadata: { key: data.key },
      });
    });
    return { id };
  });

export const createCustomCmsRole = createServerFn({ method: "POST" })
  .validator((input) => roleInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { identity } = await requestIdentity();
    return {
      id: await createCmsRoleDefinition(database.db, {
        actor: identity,
        ...data,
      }),
    };
  });

export const updateCmsClub = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(160),
        description: z.string().trim().max(600).optional(),
        status: z.enum(["active", "inactive", "archived"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { identity, actor } = await requestIdentity();
    const permissions: Permission[] = [
      "club:manage:assigned",
      "configuration:manage:cms",
    ];
    let reason = "missing_permission";
    const allowed = permissions.some((permission) => {
      const decision = evaluateAuthorization({
        identityId: identity.userId,
        application: "cms",
        permission,
        grant: actor.grant,
        resource: { scopes: [{ dimension: "club", value: data.id }] },
      });
      reason = decision.reason;
      return decision.allowed;
    });
    if (!allowed) {
      await database.db.insert(editorialAuditEvent).values({
        id: crypto.randomUUID(),
        eventType: "authorization.denied",
        actorUserId: identity.userId,
        sessionId: identity.sessionId,
        resourceType: "club",
        resourceId: data.id,
        outcome: "denied",
        reasonCode: reason,
        metadata: { permission: "club:manage:assigned" },
      });
      throw new Error("You do not have permission to manage this club.");
    }
    await database.db.transaction(async (transaction) => {
      await transaction
        .update(club)
        .set({
          name: data.name,
          description: data.description,
          status: data.status,
          updatedAt: new Date(),
        })
        .where(eq(club.id, data.id));
      await transaction.insert(editorialAuditEvent).values({
        id: crypto.randomUUID(),
        eventType: "club.updated",
        actorUserId: identity.userId,
        sessionId: identity.sessionId,
        resourceType: "club",
        resourceId: data.id,
        outcome: "success",
        metadata: { status: data.status },
      });
    });
    return { success: true };
  });

export const setCustomCmsRoleActive = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ roleId: z.string().min(1), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { identity } = await requestIdentity();
    await setCmsRoleDefinitionActive(database.db, {
      actor: identity,
      roleId: data.roleId,
      active: data.active,
    });
    return { success: true };
  });

export const assignCmsRole = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        targetUserId: z.string().min(1),
        roleId: z.string().min(1),
        clubId: z.string().min(1).optional(),
        reason: z.string().trim().min(1).max(600),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { identity } = await requestIdentity();
    return {
      id: await assignRole(database.db, {
        actor: identity,
        application: "cms",
        targetUserId: data.targetUserId,
        roleId: data.roleId,
        scopes: data.clubId ? [{ dimension: "club", value: data.clubId }] : [],
        reason: data.reason,
      }),
    };
  });

export const updateCmsContent = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({ id: z.string().uuid(), changes: updateContentSchema })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { actor } = await requestIdentity();
    const updated = await service.updateContent(actor, data.id, data.changes);
    return { id: updated.id, state: updated.state };
  });

export const transitionCmsContent = createServerFn({ method: "POST" })
  .validator((input) => actionSchema.parse(input))
  .handler(async ({ data }) => {
    const { actor } = await requestIdentity();
    const item =
      data.action === "submit"
        ? await service.submit(actor, data.id)
        : data.action === "start_review"
          ? await service.startReview(actor, data.id)
          : data.action === "complete_review"
            ? await service.completeReview(
                actor,
                data.id,
                data.comment ?? "Review completed",
              )
            : data.action === "reject"
              ? await service.reject(
                  actor,
                  data.id,
                  data.comment ?? "Returned for revision",
                )
              : data.action === "approve"
                ? await service.approve(actor, data.id)
                : data.action === "publish"
                  ? await service.publish(actor, data.id)
                  : await service.unpublish(actor, data.id);
    return { id: item.id, state: item.state };
  });

export const initiateMediaUpload = createServerFn({ method: "POST" })
  .validator((input) => mediaUploadSchema.parse(input))
  .handler(async ({ data }) => {
    const { actor } = await requestIdentity();
    const result = await getMediaService().initiateImageUpload(actor, {
      filename: data.filename,
      declaredMimeType: data.declaredMimeType,
      byteSize: data.byteSize,
      bytes: Uint8Array.from(data.signatureBytes),
      altText: data.altText,
      owningClubId: data.owningClubId,
    });
    return {
      id: result.asset.id,
      uploadUrl: result.uploadUrl,
      expiresAt: result.expiresAt.toISOString(),
      contentType: result.asset.detectedMimeType,
    };
  });

export const finalizeMediaUpload = createServerFn({ method: "POST" })
  .validator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { actor } = await requestIdentity();
    const asset = await getMediaService().finalizeImageUpload(actor, data.id);
    return { id: asset.id, status: asset.status };
  });

export const getMediaDownload = createServerFn({ method: "POST" })
  .validator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { actor } = await requestIdentity();
    const result = await getMediaService().createDownload(actor, data.id);
    return {
      downloadUrl: result.downloadUrl,
      expiresAt: result.expiresAt.toISOString(),
    };
  });

export const archiveCmsMedia = createServerFn({ method: "POST" })
  .validator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { actor } = await requestIdentity();
    const asset = await getMediaService().archive(actor, data.id);
    return { id: asset.id, status: asset.status };
  });

export type CmsDashboardData = Awaited<ReturnType<typeof getCmsDashboard>>;
export type CmsPermission = Permission;
