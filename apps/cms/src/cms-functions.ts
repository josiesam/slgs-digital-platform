import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
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
  contentMedia,
  contentItem,
  contentRevision,
  editorialAuditEvent,
  mediaAsset,
  roleAssignment,
  roleDefinition,
  user,
  workflowEvent,
} from "@slgs/db";
import {
  evaluateAuthorization,
  permissionSchema,
  requireAuthorization,
  scopeDimensionSchema,
  type Permission,
} from "@slgs/permissions";

import { database, sessions } from "./auth.server";
import { filterVisibleContent } from "./dashboard-policy";

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
    "rebase",
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
        summary: contentItem.summary,
        body: contentItem.body,
        seoTitle: contentItem.seoTitle,
        seoDescription: contentItem.seoDescription,
        canonicalPath: contentItem.canonicalPath,
        featuredMediaId: contentItem.featuredMediaId,
        state: contentItem.state,
        authorUserId: contentItem.authorUserId,
        owningClubId: contentItem.owningClubId,
        currentRevision: contentItem.currentRevision,
        currentSnapshotId: contentItem.currentSnapshotId,
        currentBaseSnapshotId: contentItem.currentBaseSnapshotId,
        verifiedVersion: contentItem.verifiedVersion,
        eventStartAt: contentItem.eventStartAt,
        eventEndAt: contentItem.eventEndAt,
        eventLocation: contentItem.eventLocation,
        eventOrganiser: contentItem.eventOrganiser,
        reviewedAt: contentItem.reviewedAt,
        updatedAt: contentItem.updatedAt,
      })
      .from(contentItem)
      .orderBy(desc(contentItem.updatedAt))
      .limit(200);
    const permissions = [...actor.grant.permissions];
    const [profile] = await database.db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, identity.userId))
      .limit(1);
    const assignedRoles = await database.db
      .select({ name: roleDefinition.name })
      .from(applicationMembership)
      .innerJoin(
        roleAssignment,
        eq(roleAssignment.membershipId, applicationMembership.id),
      )
      .innerJoin(
        roleDefinition,
        eq(roleDefinition.id, roleAssignment.roleDefinitionId),
      )
      .where(
        and(
          eq(applicationMembership.userId, identity.userId),
          eq(applicationMembership.application, "cms"),
          eq(applicationMembership.status, "active"),
          isNull(roleAssignment.revokedAt),
          eq(roleDefinition.active, true),
        ),
      );
    const visible = filterVisibleContent(rows, identity.userId, actor.grant);
    const allClubs = await database.db
      .select({
        id: club.id,
        name: club.name,
        description: club.description,
        status: club.status,
      })
      .from(club);
    const activeClubs = allClubs.filter((item) => item.status === "active");
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
      ? activeClubs
      : activeClubs.filter((item) => assignedClubIds.has(item.id));
    const managedClubs = canManageConfiguration
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
      if (permissions.includes("media:read:cms")) return true;
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
    const visibleMediaWithUrls = await Promise.all(
      visibleMedia.map(async (item) => {
        let url: string | null = null;
        try {
          const download = await getMediaService().createPreviewDownload(
            actor,
            item.id,
          );
          url = download.downloadUrl;
        } catch {
          url = null;
        }
        return {
          ...item,
          url,
        };
      }),
    );
    const mediaAssociations = visible.length
      ? await database.db
          .select({
            contentId: contentMedia.contentId,
            mediaId: contentMedia.mediaId,
          })
          .from(contentMedia)
          .where(
            inArray(
              contentMedia.contentId,
              visible.map((item) => item.id),
            ),
          )
          .orderBy(asc(contentMedia.sortOrder))
      : [];
    const visibleIds = visible.map((item) => item.id);
    const revisions = visibleIds.length
      ? await database.db
          .select({
            contentId: contentRevision.contentId,
            revision: contentRevision.revision,
            revisionLabel: contentRevision.revisionLabel,
            snapshotId: contentRevision.snapshotId,
            baseSnapshotId: contentRevision.baseSnapshotId,
            status: contentRevision.status,
            rebasedFromSnapshotId: contentRevision.rebasedFromSnapshotId,
            verifiedVersionNumber: contentRevision.verifiedVersionNumber,
            createdAt: contentRevision.createdAt,
            createdByName: user.name,
          })
          .from(contentRevision)
          .innerJoin(user, eq(user.id, contentRevision.createdBy))
          .where(inArray(contentRevision.contentId, visibleIds))
          .orderBy(desc(contentRevision.createdAt))
      : [];
    const workflow = visibleIds.length
      ? await database.db
          .select({
            contentId: workflowEvent.contentId,
            fromState: workflowEvent.fromState,
            toState: workflowEvent.toState,
            comment: workflowEvent.comment,
            occurredAt: workflowEvent.occurredAt,
            actorName: user.name,
          })
          .from(workflowEvent)
          .innerJoin(user, eq(user.id, workflowEvent.actorUserId))
          .where(inArray(workflowEvent.contentId, visibleIds))
          .orderBy(desc(workflowEvent.occurredAt))
      : [];
    const audit = permissions.includes("audit:read:cms")
      ? await database.db
          .select({
            eventType: editorialAuditEvent.eventType,
            resourceType: editorialAuditEvent.resourceType,
            outcome: editorialAuditEvent.outcome,
            reasonCode: editorialAuditEvent.reasonCode,
            occurredAt: editorialAuditEvent.occurredAt,
          })
          .from(editorialAuditEvent)
          .orderBy(desc(editorialAuditEvent.occurredAt))
          .limit(100)
      : [];
    const scopeLabels = actor.grant.entitlements.flatMap((entitlement) =>
      entitlement.scopes.map((scope) => {
        if (scope.dimension !== "club") {
          return `${scope.dimension}: ${scope.value}`;
        }
        const assignedClub = allClubs.find((item) => item.id === scope.value);
        return `club: ${assignedClub?.name ?? "Assigned club"}`;
      }),
    );
    return {
      userId: identity.userId,
      identity: {
        displayName: profile?.name ?? "CMS user",
        application: "CMS",
        roles: [...new Set(assignedRoles.map((role) => role.name))],
        scopes: [...new Set(scopeLabels)],
      },
      permissions,
      clubs,
      managedClubs,
      roles,
      members,
      media: visibleMediaWithUrls,
      audit: audit.map((event) => ({
        ...event,
        occurredAt: event.occurredAt.toISOString(),
      })),
      content: visible.map((item) => ({
        ...item,
        eventStartAt: item.eventStartAt?.toISOString() ?? null,
        eventEndAt: item.eventEndAt?.toISOString() ?? null,
        reviewedAt: item.reviewedAt?.toISOString() ?? null,
        mediaIds: mediaAssociations
          .filter((association) => association.contentId === item.id)
          .map((association) => association.mediaId),
        revisions: revisions
          .filter((revision) => revision.contentId === item.id)
          .map((revision) => ({
            revision: revision.revision,
            revisionLabel: revision.revisionLabel,
            snapshotId: revision.snapshotId,
            baseSnapshotId: revision.baseSnapshotId,
            status: revision.status,
            rebasedFromSnapshotId: revision.rebasedFromSnapshotId,
            verifiedVersionNumber: revision.verifiedVersionNumber,
            createdByName: revision.createdByName,
            createdAt: revision.createdAt.toISOString(),
          })),
        workflow: workflow
          .filter((event) => event.contentId === item.id)
          .map((event) => ({
            fromState: event.fromState,
            toState: event.toState,
            comment: event.comment,
            actorName: event.actorName,
            occurredAt: event.occurredAt.toISOString(),
          })),
        updatedAt: item.updatedAt.toISOString(),
      })),
    };
  },
);

export const getEditorialContentDetails = createServerFn({ method: "GET" })
  .validator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { actor } = await requestIdentity();
    const item = await service.getContent(actor, data.id);
    const revisions = await repository.findRevisions(data.id);
    const activeRevision =
      revisions.find((r) => r.snapshotId === item.currentSnapshotId) ?? null;
    const baseRevision = item.currentBaseSnapshotId
      ? await repository.findRevisionBySnapshotId(item.currentBaseSnapshotId)
      : null;
    const dependentRevisions = item.currentSnapshotId
      ? await repository.findRevisionsByBaseSnapshotId(item.currentSnapshotId)
      : [];

    const workflowEvents = await database.db
      .select({
        fromState: workflowEvent.fromState,
        toState: workflowEvent.toState,
        comment: workflowEvent.comment,
        occurredAt: workflowEvent.occurredAt,
        actorName: user.name,
      })
      .from(workflowEvent)
      .innerJoin(user, eq(user.id, workflowEvent.actorUserId))
      .where(eq(workflowEvent.contentId, data.id))
      .orderBy(desc(workflowEvent.occurredAt));

    return {
      content: {
        ...item,
        eventStartAt: item.eventStartAt?.toISOString() ?? null,
        eventEndAt: item.eventEndAt?.toISOString() ?? null,
        submittedAt: item.submittedAt?.toISOString() ?? null,
        reviewedAt: item.reviewedAt?.toISOString() ?? null,
        approvedAt: item.approvedAt?.toISOString() ?? null,
        publishedAt: item.publishedAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      },
      activeRevision: activeRevision
        ? {
            ...activeRevision,
            snapshot: activeRevision.snapshot as Record<
              string,
              string | number | boolean | null
            >,
            createdAt: activeRevision.createdAt.toISOString(),
          }
        : null,
      baseRevision: baseRevision
        ? {
            ...baseRevision,
            snapshot: baseRevision.snapshot as Record<
              string,
              string | number | boolean | null
            >,
            createdAt: baseRevision.createdAt.toISOString(),
          }
        : null,
      revisions: revisions.map((r) => ({
        ...r,
        snapshot: r.snapshot as Record<
          string,
          string | number | boolean | null
        >,
        createdAt: r.createdAt.toISOString(),
      })),
      dependentRevisions: dependentRevisions.map((r) => ({
        ...r,
        snapshot: r.snapshot as Record<
          string,
          string | number | boolean | null
        >,
        createdAt: r.createdAt.toISOString(),
      })),
      workflow: workflowEvents.map((w) => ({
        ...w,
        occurredAt: w.occurredAt.toISOString(),
      })),
    };
  });

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
      "club:manage:cms",
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
    const id = await assignRole(database.db, {
      actor: identity,
      application: "cms",
      targetUserId: data.targetUserId,
      roleId: data.roleId,
      scopes: data.clubId ? [{ dimension: "club", value: data.clubId }] : [],
      reason: data.reason,
    });
    sessions.invalidateUser(data.targetUserId);
    return { id };
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

export const setCmsContentMedia = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        id: z.string().uuid(),
        mediaIds: z.array(z.string().uuid()).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { actor } = await requestIdentity();
    const updated = await service.setContentMedia(
      actor,
      data.id,
      data.mediaIds,
    );
    return {
      id: updated.id,
      currentRevision: updated.currentRevision,
      featuredMediaId: updated.featuredMediaId,
    };
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

export const unarchiveCmsMedia = createServerFn({ method: "POST" })
  .validator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { actor } = await requestIdentity();
    const asset = await getMediaService().unarchive(actor, data.id);
    return { id: asset.id, status: asset.status };
  });

export const updateCmsMedia = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        id: z.string().uuid(),
        altText: z.string().trim().min(1).max(500).optional(),
        owningClubId: z.string().nullable().optional(),
        filename: z.string().trim().min(1).max(255).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { actor } = await requestIdentity();
    const asset = await getMediaService().updateMetadata(actor, data.id, {
      altText: data.altText,
      owningClubId: data.owningClubId,
      filename: data.filename,
    });
    return {
      id: asset.id,
      altText: asset.altText,
      owningClubId: asset.owningClubId,
      filename: asset.originalFilename,
    };
  });

const mediaReplacementSchema = z.object({
  id: z.string().uuid(),
  filename: z.string().trim().min(1).max(255),
  declaredMimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  byteSize: z.number().int().positive().max(10_000_000),
  signatureBytes: z.array(z.number().int().min(0).max(255)).min(3).max(32),
});

export const initiateMediaReplacement = createServerFn({ method: "POST" })
  .validator((input) => mediaReplacementSchema.parse(input))
  .handler(async ({ data }) => {
    const { actor } = await requestIdentity();
    const result = await getMediaService().initiateMediaReplacement(
      actor,
      data.id,
      {
        filename: data.filename,
        declaredMimeType: data.declaredMimeType,
        byteSize: data.byteSize,
        bytes: Uint8Array.from(data.signatureBytes),
      },
    );
    return {
      assetId: result.assetId,
      newStorageKey: result.newStorageKey,
      uploadUrl: result.uploadUrl,
      expiresAt: result.expiresAt.toISOString(),
      contentType: result.detectedMimeType,
      normalizedFilename: result.normalizedFilename,
      originalFilename: result.originalFilename,
      byteSize: result.byteSize,
    };
  });

export const finalizeMediaReplacement = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        id: z.string().uuid(),
        newStorageKey: z.string().min(1),
        originalFilename: z.string().min(1),
        normalizedFilename: z.string().min(1),
        declaredMimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
        detectedMimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
        byteSize: z.number().int().positive(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { actor } = await requestIdentity();
    const asset = await getMediaService().finalizeMediaReplacement(
      actor,
      data.id,
      {
        newStorageKey: data.newStorageKey,
        originalFilename: data.originalFilename,
        normalizedFilename: data.normalizedFilename,
        declaredMimeType: data.declaredMimeType,
        detectedMimeType: data.detectedMimeType,
        byteSize: data.byteSize,
      },
    );
    return { id: asset.id, status: asset.status };
  });

export const deleteCmsMedia = createServerFn({ method: "POST" })
  .validator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { actor } = await requestIdentity();
    await getMediaService().deleteMedia(actor, data.id);
    return { success: true, id: data.id };
  });

export type CmsDashboardData = Awaited<ReturnType<typeof getCmsDashboard>>;
export type CmsPermission = Permission;
