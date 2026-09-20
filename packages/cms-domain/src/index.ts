import { z } from "zod";

import {
  evaluateAuthorization,
  permissionSchema,
  type ApplicationGrant,
  type AuthorizationReason,
  type Permission,
  type ScopeBinding,
} from "@slgs/permissions";

export const contentTypeSchema = z.enum([
  "page",
  "article",
  "event",
  "announcement",
  "gallery",
]);
export type ContentType = z.infer<typeof contentTypeSchema>;

export function defaultCanonicalPath(type: ContentType, slug: string): string {
  switch (type) {
    case "article":
      return `/news/${slug}`;
    case "event":
      return `/events/${slug}`;
    case "gallery":
      return `/gallery/${slug}`;
    case "announcement":
      return `/announcements/${slug}`;
    case "page":
      return `/${slug}`;
  }
}
export const workflowStateSchema = z.enum([
  "draft",
  "submitted",
  "in_review",
  "rejected",
  "approved",
  "published",
  "requires_rebase",
]);
export type WorkflowState = z.infer<typeof workflowStateSchema>;

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase URL slug.");
export const createContentSchema = z
  .object({
    type: contentTypeSchema,
    title: z.string().trim().min(1).max(240),
    slug: slugSchema,
    summary: z.string().trim().max(600).optional(),
    body: z.string().max(200_000).default(""),
    owningClubId: z.string().trim().min(1).max(200).nullable().optional(),
    seoTitle: z.string().trim().max(70).optional(),
    seoDescription: z.string().trim().max(170).optional(),
    canonicalPath: z.string().trim().startsWith("/").max(300).optional(),
    eventStartAt: z.coerce.date().optional(),
    eventEndAt: z.coerce.date().optional(),
    eventLocation: z.string().trim().max(300).optional(),
    eventOrganiser: z.string().trim().max(240).optional(),
  })
  .superRefine((value, context) => {
    if (value.type === "event" && !value.eventStartAt) {
      context.addIssue({
        code: "custom",
        path: ["eventStartAt"],
        message: "An event start time is required.",
      });
    }
    if (
      value.eventStartAt &&
      value.eventEndAt &&
      value.eventEndAt < value.eventStartAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["eventEndAt"],
        message: "The end time must not precede the start time.",
      });
    }
  });
export type CreateContentInput = z.input<typeof createContentSchema>;

export const updateContentSchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  slug: slugSchema.optional(),
  summary: z.string().trim().max(600).nullable().optional(),
  body: z.string().max(200_000).optional(),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(170).nullable().optional(),
  canonicalPath: z
    .string()
    .trim()
    .startsWith("/")
    .max(300)
    .nullable()
    .optional(),
  eventStartAt: z.coerce.date().nullable().optional(),
  eventEndAt: z.coerce.date().nullable().optional(),
  eventLocation: z.string().trim().max(300).nullable().optional(),
  eventOrganiser: z.string().trim().max(240).nullable().optional(),
});
export type UpdateContentInput = z.input<typeof updateContentSchema>;

export interface CmsActor {
  readonly userId: string;
  readonly sessionId?: string;
  readonly grant: ApplicationGrant;
}

export interface CmsRevisionRecord {
  readonly id: string;
  readonly contentId: string;
  readonly revision: number;
  readonly revisionLabel: string;
  readonly snapshotId: string;
  readonly baseSnapshotId: string | null;
  readonly status: WorkflowState;
  readonly rebasedFromSnapshotId: string | null;
  readonly verifiedVersionNumber: number | null;
  readonly snapshot: Record<string, any>;
  readonly createdBy: string;
  readonly createdAt: Date;
}

export interface CmsContent {
  readonly id: string;
  readonly type: ContentType;
  readonly title: string;
  readonly slug: string;
  readonly summary: string | null;
  readonly body: string;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly canonicalPath: string | null;
  readonly featuredMediaId: string | null;
  readonly authorUserId: string;
  readonly owningClubId: string | null;
  readonly state: WorkflowState;
  readonly currentRevision: number;
  readonly currentSnapshotId: string | null;
  readonly currentBaseSnapshotId: string | null;
  readonly verifiedVersion: number | null;
  readonly eventStartAt: Date | null;
  readonly eventEndAt: Date | null;
  readonly eventLocation: string | null;
  readonly eventOrganiser: string | null;
  readonly submittedAt: Date | null;
  readonly reviewedAt: Date | null;
  readonly reviewedBy: string | null;
  readonly approvedAt: Date | null;
  readonly approvedBy: string | null;
  readonly publishedAt: Date | null;
  readonly publishedBy: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CmsAuditEvent {
  readonly id: string;
  readonly eventType: string;
  readonly actorUserId: string | null;
  readonly sessionId: string | null;
  readonly resourceType: string;
  readonly resourceId: string | null;
  readonly outcome: "success" | "failure" | "denied";
  readonly reasonCode: string | null;
  readonly metadata: Readonly<Record<string, string | number | boolean | null>>;
  readonly occurredAt: Date;
}

export interface CmsRepository {
  transaction<T>(work: (repository: CmsRepository) => Promise<T>): Promise<T>;
  clubExists(id: string): Promise<boolean>;
  slugExists(slug: string, excludingId?: string): Promise<boolean>;
  findContent(id: string): Promise<CmsContent | null>;
  createContent(content: CmsContent): Promise<void>;
  saveContent(content: CmsContent): Promise<void>;
  createRevision(
    content: CmsContent,
    actorUserId: string,
    options?: {
      snapshotId?: string;
      baseSnapshotId?: string | null;
      revisionLabel?: string;
      status?: WorkflowState;
      rebasedFromSnapshotId?: string | null;
      verifiedVersionNumber?: number | null;
    },
  ): Promise<CmsRevisionRecord>;
  findRevisions(contentId: string): Promise<readonly CmsRevisionRecord[]>;
  findRevisionBySnapshotId(
    snapshotId: string,
  ): Promise<CmsRevisionRecord | null>;
  findRevisionsByBaseSnapshotId(
    baseSnapshotId: string,
  ): Promise<readonly CmsRevisionRecord[]>;
  updateRevisionStatus(
    revisionId: string,
    status: WorkflowState,
    verifiedVersionNumber?: number | null,
  ): Promise<void>;
  findMedia(id: string): Promise<CmsMediaAsset | null>;
  replaceContentMedia(
    contentId: string,
    mediaIds: readonly string[],
  ): Promise<void>;
  appendWorkflowEvent(input: {
    contentId: string;
    fromState: WorkflowState | null;
    toState: WorkflowState;
    actorUserId: string;
    comment?: string;
  }): Promise<void>;
  appendAudit(event: CmsAuditEvent): Promise<void>;
}

export class CmsDomainError extends Error {
  constructor(
    readonly code:
      | "AUTHORIZATION_DENIED"
      | "CONTENT_NOT_FOUND"
      | "CLUB_NOT_FOUND"
      | "INVALID_MEDIA"
      | "SLUG_CONFLICT"
      | "INVALID_TRANSITION",
    message: string,
  ) {
    super(message);
    this.name = "CmsDomainError";
  }
}

const safeMetadata = (
  metadata: Readonly<Record<string, string | number | boolean | null>>,
) => {
  if (
    Object.keys(metadata).some((key) =>
      /(password|secret|token|backup.?code|session.?cookie|mfa.?key|recovery)/i.test(
        key,
      ),
    )
  ) {
    throw new Error("Audit metadata contains a forbidden secret field.");
  }
  return metadata;
};

const contentScopes = (item: CmsContent): ScopeBinding[] => [
  { dimension: "organisation", value: "slgs" },
  ...(item.owningClubId
    ? [{ dimension: "club" as const, value: item.owningClubId }]
    : []),
];

const creationPermission = (type: ContentType): Permission =>
  permissionSchema.parse(`${type}:create:own`);
const updatePermissions = (type: ContentType): Permission[] => [
  permissionSchema.parse(`${type}:update:own`),
  permissionSchema.parse("content:update:assigned"),
  permissionSchema.parse("content:update:cms"),
];
const submitPermissions = (type: ContentType): Permission[] => [
  permissionSchema.parse(`${type}:submit:own`),
  permissionSchema.parse("content:submit:assigned"),
  permissionSchema.parse("content:submit:cms"),
];

export class CmsService {
  constructor(private readonly repository: CmsRepository) {}

  private async audit(
    actor: CmsActor,
    eventType: string,
    resourceId: string | null,
    outcome: CmsAuditEvent["outcome"] = "success",
    reasonCode: string | null = null,
    metadata: Readonly<Record<string, string | number | boolean | null>> = {},
    repository: CmsRepository = this.repository,
  ) {
    await repository.appendAudit({
      id: crypto.randomUUID(),
      eventType,
      actorUserId: actor.userId,
      sessionId: actor.sessionId ?? null,
      resourceType: "content",
      resourceId,
      outcome,
      reasonCode,
      metadata: safeMetadata(metadata),
      occurredAt: new Date(),
    });
  }

  private async authorize(
    actor: CmsActor,
    permissions: readonly Permission[],
    item: CmsContent,
  ): Promise<void> {
    let finalReason: AuthorizationReason = "missing_permission";
    for (const permission of permissions) {
      const decision = evaluateAuthorization({
        identityId: actor.userId,
        application: "cms",
        permission,
        grant: actor.grant,
        authorId: item.authorUserId,
        resource: {
          ownerId: item.authorUserId,
          state:
            item.state === "in_review"
              ? "submitted"
              : item.state === "rejected" || item.state === "requires_rebase"
                ? "draft"
                : item.state,
          scopes: contentScopes(item),
        },
      });
      if (decision.allowed) return;
      if (decision.reason !== "missing_permission")
        finalReason = decision.reason;
    }
    await this.audit(
      actor,
      "authorization.denied",
      item.id,
      "denied",
      finalReason,
      { permission: permissions.join("|") },
    );
    throw new CmsDomainError(
      "AUTHORIZATION_DENIED",
      "You do not have permission to perform this action.",
    );
  }

  private async requiredContent(id: string): Promise<CmsContent> {
    const item = await this.repository.findContent(id);
    if (!item)
      throw new CmsDomainError("CONTENT_NOT_FOUND", "Content was not found.");
    return item;
  }

  async createContent(
    actor: CmsActor,
    input: CreateContentInput,
  ): Promise<CmsContent> {
    const value = createContentSchema.parse(input);
    if (
      value.owningClubId &&
      !(await this.repository.clubExists(value.owningClubId))
    )
      throw new CmsDomainError("CLUB_NOT_FOUND", "Owning club was not found.");
    if (await this.repository.slugExists(value.slug))
      throw new CmsDomainError("SLUG_CONFLICT", "The slug is already in use.");
    const now = new Date();
    const snapshotId = `snap_${crypto.randomUUID()}`;
    const item: CmsContent = {
      id: crypto.randomUUID(),
      type: value.type,
      title: value.title,
      slug: value.slug,
      summary: value.summary ?? null,
      body: value.body,
      seoTitle: value.seoTitle ?? null,
      seoDescription: value.seoDescription ?? null,
      canonicalPath:
        value.canonicalPath ?? defaultCanonicalPath(value.type, value.slug),
      featuredMediaId: null,
      authorUserId: actor.userId,
      owningClubId: value.owningClubId ?? null,
      state: "draft",
      currentRevision: 1,
      currentSnapshotId: snapshotId,
      currentBaseSnapshotId: null,
      verifiedVersion: null,
      eventStartAt: value.eventStartAt ?? null,
      eventEndAt: value.eventEndAt ?? null,
      eventLocation: value.eventLocation ?? null,
      eventOrganiser: value.eventOrganiser ?? null,
      submittedAt: null,
      reviewedAt: null,
      reviewedBy: null,
      approvedAt: null,
      approvedBy: null,
      publishedAt: null,
      publishedBy: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.authorize(actor, [creationPermission(value.type)], item);
    await this.repository.transaction(async (repository) => {
      await repository.createContent(item);
      await repository.createRevision(item, actor.userId, {
        snapshotId,
        baseSnapshotId: null,
        revisionLabel: "1.0",
        status: "draft",
      });
      await repository.appendWorkflowEvent({
        contentId: item.id,
        fromState: null,
        toState: "draft",
        actorUserId: actor.userId,
      });
      await this.audit(
        actor,
        "content.created",
        item.id,
        "success",
        null,
        {
          type: item.type,
          snapshotId,
        },
        repository,
      );
    });
    return item;
  }

  async getContent(actor: CmsActor, id: string): Promise<CmsContent> {
    const item = await this.requiredContent(id);
    const typePermission =
      item.type === "article"
        ? permissionSchema.parse("article:read:club")
        : permissionSchema.parse("content:read:club");
    await this.authorize(
      actor,
      [
        typePermission,
        "content:read:assigned",
        "content:read:approved",
        "content:read:cms",
      ],
      item,
    );
    return item;
  }

  async updateContent(
    actor: CmsActor,
    id: string,
    input: UpdateContentInput,
  ): Promise<CmsContent> {
    const item = await this.requiredContent(id);
    await this.authorize(actor, updatePermissions(item.type), item);
    const value = updateContentSchema.parse(input);
    if (
      value.slug &&
      value.slug !== item.slug &&
      (await this.repository.slugExists(value.slug, id))
    )
      throw new CmsDomainError("SLUG_CONFLICT", "The slug is already in use.");
    const newSlug = value.slug ?? item.slug;
    const canonicalPath =
      value.canonicalPath !== undefined
        ? (value.canonicalPath ?? defaultCanonicalPath(item.type, newSlug))
        : (item.canonicalPath ?? defaultCanonicalPath(item.type, newSlug));
    const newRevisionNumber = item.currentRevision + 1;
    const snapshotId = `snap_${crypto.randomUUID()}`;
    const baseSnapshotId = item.currentSnapshotId;
    const revisionLabel = `1.${newRevisionNumber - 1}`;
    const updated: CmsContent = {
      ...item,
      ...value,
      canonicalPath,
      currentRevision: newRevisionNumber,
      currentSnapshotId: snapshotId,
      currentBaseSnapshotId: baseSnapshotId,
      state: "draft",
      updatedAt: new Date(),
    };

    await this.repository.transaction(async (repository) => {
      await repository.createRevision(updated, actor.userId, {
        snapshotId,
        baseSnapshotId,
        revisionLabel,
        status: "draft",
      });
      await repository.saveContent(updated);
      await this.audit(
        actor,
        "content.updated",
        id,
        "success",
        null,
        { snapshotId, baseSnapshotId },
        repository,
      );
    });
    return updated;
  }

  async setContentMedia(
    actor: CmsActor,
    id: string,
    mediaIds: readonly string[],
  ): Promise<CmsContent> {
    try {
      const orderedIds = z.array(z.string().min(1)).max(100).parse(mediaIds);
      if (new Set(orderedIds).size !== orderedIds.length) {
        throw new CmsDomainError(
          "INVALID_MEDIA",
          "Content media must not contain duplicate assets.",
        );
      }
      const item = await this.requiredContent(id);
      await this.authorize(actor, updatePermissions(item.type), item);
      for (const mediaId of orderedIds) {
        const asset = await this.repository.findMedia(mediaId);
        if (!asset || asset.status !== "available") {
          throw new CmsDomainError(
            "INVALID_MEDIA",
            "Only available media can be associated with content.",
          );
        }
        const permissions: Permission[] = [
          "media:update:own",
          "media:update:club",
          "media:update:cms",
        ];
        const allowed = permissions.some(
          (permission) =>
            evaluateAuthorization({
              identityId: actor.userId,
              application: "cms",
              permission,
              grant: actor.grant,
              resource: {
                ownerId: asset.ownerUserId,
                scopes: asset.owningClubId
                  ? [{ dimension: "club", value: asset.owningClubId }]
                  : [],
              },
            }).allowed,
        );
        if (!allowed) {
          await this.audit(
            actor,
            "authorization.denied",
            id,
            "denied",
            "scope_mismatch",
            {
              permission: permissions.join("|"),
            },
          );
          throw new CmsDomainError(
            "AUTHORIZATION_DENIED",
            "You do not have permission to associate this media.",
          );
        }
      }
      const newRevisionNumber = item.currentRevision + 1;
      const snapshotId = `snap_${crypto.randomUUID()}`;
      const baseSnapshotId = item.currentSnapshotId;
      const revisionLabel = `1.${newRevisionNumber - 1}`;
      const updated: CmsContent = {
        ...item,
        featuredMediaId: orderedIds[0] ?? null,
        currentRevision: newRevisionNumber,
        currentSnapshotId: snapshotId,
        currentBaseSnapshotId: baseSnapshotId,
        state: "draft",
        updatedAt: new Date(),
      };
      await this.repository.transaction(async (repository) => {
        await repository.createRevision(updated, actor.userId, {
          snapshotId,
          baseSnapshotId,
          revisionLabel,
          status: "draft",
        });
        await repository.saveContent(updated);
        await repository.replaceContentMedia(id, orderedIds);
        await this.audit(
          actor,
          "content.media.updated",
          id,
          "success",
          null,
          { mediaCount: orderedIds.length, snapshotId, baseSnapshotId },
          repository,
        );
      });
      return updated;
    } catch (error) {
      console.error("setContentMedia", error);
      throw error;
    }
  }

  private async transition(
    actor: CmsActor,
    id: string,
    options: {
      from: readonly WorkflowState[];
      to: WorkflowState;
      permissions: readonly Permission[];
      eventType: string;
      comment?: string;
      requireReviewed?: boolean;
    },
  ): Promise<CmsContent> {
    const item = await this.requiredContent(id);
    if (
      !options.from.includes(item.state) ||
      (options.requireReviewed && !item.reviewedAt)
    )
      throw new CmsDomainError(
        "INVALID_TRANSITION",
        "The requested workflow transition is not allowed.",
      );
    await this.authorize(actor, options.permissions, item);

    // Dependency progression check: verify no unresolved predecessor revisions exist
    const revisions = await this.repository.findRevisions(id);
    const activeRevisionRecord = revisions.find(
      (r) => r.snapshotId === item.currentSnapshotId,
    );
    if (activeRevisionRecord && activeRevisionRecord.baseSnapshotId) {
      const baseRev = await this.repository.findRevisionBySnapshotId(
        activeRevisionRecord.baseSnapshotId,
      );
      if (baseRev && baseRev.status === "rejected") {
        throw new CmsDomainError(
          "INVALID_TRANSITION",
          "Cannot progress revision because its base snapshot was rejected and requires a rebase.",
        );
      }
      // Check for any earlier revisions on the same content or base snapshot that remain unresolved
      const unresolvedPredecessor = revisions.some(
        (r) =>
          r.id !== activeRevisionRecord.id &&
          r.revision < activeRevisionRecord.revision &&
          r.baseSnapshotId === activeRevisionRecord.baseSnapshotId &&
          ["draft", "submitted", "in_review", "requires_rebase"].includes(
            r.status,
          ),
      );
      if (unresolvedPredecessor) {
        throw new CmsDomainError(
          "INVALID_TRANSITION",
          "Cannot progress revision because an unresolved predecessor revision exists.",
        );
      }
    }

    const now = new Date();
    let verifiedVersion = item.verifiedVersion;

    if (options.to === "published") {
      const highestVersion = revisions.reduce((max, r) => {
        return r.verifiedVersionNumber && r.verifiedVersionNumber > max
          ? r.verifiedVersionNumber
          : max;
      }, item.verifiedVersion ?? 0);
      verifiedVersion = highestVersion + 1;
    }

    const isUnpublishing =
      options.eventType === "content.published"
        ? false
        : options.eventType === "content.unpublished";
    const snapshotContent: Record<string, any> = {};
    if (options.to === "published" && activeRevisionRecord?.snapshot) {
      const snap = activeRevisionRecord.snapshot;
      if (typeof snap.title === "string") snapshotContent.title = snap.title;
      if (typeof snap.slug === "string") snapshotContent.slug = snap.slug;
      if (typeof snap.summary === "string" || snap.summary === null)
        snapshotContent.summary = snap.summary;
      if (typeof snap.body === "string") snapshotContent.body = snap.body;
      if (typeof snap.seoTitle === "string" || snap.seoTitle === null)
        snapshotContent.seoTitle = snap.seoTitle;
      if (
        typeof snap.seoDescription === "string" ||
        snap.seoDescription === null
      )
        snapshotContent.seoDescription = snap.seoDescription;
      if (typeof snap.canonicalPath === "string" || snap.canonicalPath === null)
        snapshotContent.canonicalPath = snap.canonicalPath;
      if (
        typeof snap.featuredMediaId === "string" ||
        snap.featuredMediaId === null
      )
        snapshotContent.featuredMediaId = snap.featuredMediaId;
      if (snap.eventStartAt)
        snapshotContent.eventStartAt = new Date(snap.eventStartAt as string);
      if (snap.eventEndAt)
        snapshotContent.eventEndAt = new Date(snap.eventEndAt as string);
      if (typeof snap.eventLocation === "string" || snap.eventLocation === null)
        snapshotContent.eventLocation = snap.eventLocation;
      if (
        typeof snap.eventOrganiser === "string" ||
        snap.eventOrganiser === null
      )
        snapshotContent.eventOrganiser = snap.eventOrganiser;
    }

    const updated: CmsContent = {
      ...item,
      ...snapshotContent,
      state: options.to,
      verifiedVersion,
      submittedAt: options.to === "submitted" ? now : item.submittedAt,
      reviewedAt:
        options.eventType === "content.review.completed"
          ? now
          : item.reviewedAt,
      reviewedBy:
        options.eventType === "content.review.completed"
          ? actor.userId
          : item.reviewedBy,
      approvedAt: options.to === "approved" ? now : item.approvedAt,
      approvedBy: options.to === "approved" ? actor.userId : item.approvedBy,
      publishedAt:
        options.to === "published"
          ? now
          : isUnpublishing
            ? null
            : item.publishedAt,
      publishedBy:
        options.to === "published"
          ? actor.userId
          : isUnpublishing
            ? null
            : item.publishedBy,
      updatedAt: now,
    };

    await this.repository.transaction(async (repository) => {
      await repository.saveContent(updated);
      if (activeRevisionRecord) {
        await repository.updateRevisionStatus(
          activeRevisionRecord.id,
          options.to,
          options.to === "published" ? verifiedVersion : null,
        );
      }

      // If transition is rejection, cascade to dependent revisions that share this snapshot as baseSnapshotId
      if (options.to === "rejected" && activeRevisionRecord) {
        const dependentRevisions =
          await repository.findRevisionsByBaseSnapshotId(
            activeRevisionRecord.snapshotId,
          );
        for (const depRev of dependentRevisions) {
          if (!["published", "rejected"].includes(depRev.status)) {
            await repository.updateRevisionStatus(depRev.id, "requires_rebase");
            const depContent = await repository.findContent(depRev.contentId);
            if (depContent && depContent.state !== "published") {
              await repository.saveContent({
                ...depContent,
                state: "requires_rebase",
                updatedAt: now,
              });
            }
          }
        }
      }

      await repository.appendWorkflowEvent({
        contentId: id,
        fromState: item.state,
        toState: options.to,
        actorUserId: actor.userId,
        comment: options.comment,
      });
      await this.audit(
        actor,
        options.eventType,
        id,
        "success",
        null,
        {
          snapshotId: item.currentSnapshotId,
          verifiedVersion: verifiedVersion ?? null,
        },
        repository,
      );
    });
    return updated;
  }

  async rebase(
    actor: CmsActor,
    id: string,
    targetBaseSnapshotId?: string,
  ): Promise<CmsContent> {
    const item = await this.requiredContent(id);
    if (item.state !== "requires_rebase") {
      throw new CmsDomainError(
        "INVALID_TRANSITION",
        "Only content in 'requires_rebase' state can be rebased.",
      );
    }
    await this.authorize(actor, updatePermissions(item.type), item);

    let newBaseSnapshotId = targetBaseSnapshotId ?? null;
    if (!newBaseSnapshotId) {
      // Find latest published or approved snapshot for this content or fallback
      const revisions = await this.repository.findRevisions(id);
      const validBase = revisions
        .filter((r) => ["published", "approved"].includes(r.status))
        .pop();
      newBaseSnapshotId = validBase ? validBase.snapshotId : null;
    }

    const newRevisionNumber = item.currentRevision + 1;
    const newSnapshotId = `snap_${crypto.randomUUID()}`;
    const oldSnapshotId = item.currentSnapshotId;
    const revisionLabel = `1.${newRevisionNumber - 1}`;
    const now = new Date();

    const updated: CmsContent = {
      ...item,
      state: "draft",
      currentRevision: newRevisionNumber,
      currentSnapshotId: newSnapshotId,
      currentBaseSnapshotId: newBaseSnapshotId,
      updatedAt: now,
    };

    await this.repository.transaction(async (repository) => {
      await repository.createRevision(updated, actor.userId, {
        snapshotId: newSnapshotId,
        baseSnapshotId: newBaseSnapshotId,
        revisionLabel,
        status: "draft",
        rebasedFromSnapshotId: oldSnapshotId,
      });
      await repository.saveContent(updated);
      await repository.appendWorkflowEvent({
        contentId: id,
        fromState: "requires_rebase",
        toState: "draft",
        actorUserId: actor.userId,
        comment: `Rebased from snapshot ${oldSnapshotId} onto base snapshot ${newBaseSnapshotId}`,
      });
      await this.audit(
        actor,
        "content.rebased",
        id,
        "success",
        null,
        {
          newSnapshotId,
          newBaseSnapshotId,
          rebasedFromSnapshotId: oldSnapshotId,
        },
        repository,
      );
    });

    return updated;
  }

  submit(actor: CmsActor, id: string) {
    return this.requiredContent(id).then((item) =>
      this.transition(actor, id, {
        from: ["draft", "rejected"],
        to: "submitted",
        permissions: submitPermissions(item.type),
        eventType: "content.submitted",
      }),
    );
  }
  startReview(actor: CmsActor, id: string) {
    return this.transition(actor, id, {
      from: ["submitted"],
      to: "in_review",
      permissions: ["content:review:assigned", "content:review:cms"],
      eventType: "content.review.started",
    });
  }
  completeReview(actor: CmsActor, id: string, comment: string) {
    return this.transition(actor, id, {
      from: ["in_review"],
      to: "in_review",
      permissions: ["content:review:assigned", "content:review:cms"],
      eventType: "content.review.completed",
      comment: z.string().trim().min(1).max(2_000).parse(comment),
    });
  }
  reject(actor: CmsActor, id: string, comment: string) {
    return this.transition(actor, id, {
      from: ["in_review"],
      to: "rejected",
      permissions: ["content:reject:assigned", "content:reject:cms"],
      eventType: "content.rejected",
      comment: z.string().trim().min(1).max(2_000).parse(comment),
    });
  }
  approve(actor: CmsActor, id: string) {
    return this.transition(actor, id, {
      from: ["in_review"],
      to: "approved",
      permissions: ["content:approve:assigned", "content:approve:cms"],
      eventType: "content.approved",
      requireReviewed: true,
    });
  }
  publish(actor: CmsActor, id: string) {
    return this.transition(actor, id, {
      from: ["approved"],
      to: "published",
      permissions: ["content:publish:approved", "content:publish:cms"],
      eventType: "content.published",
    });
  }
  unpublish(actor: CmsActor, id: string) {
    return this.transition(actor, id, {
      from: ["published"],
      to: "approved",
      permissions: ["content:unpublish:published", "content:unpublish:cms"],
      eventType: "content.unpublished",
    });
  }
}

export class InMemoryCmsRepository implements CmsRepository {
  readonly clubs = new Set<string>();
  readonly contents = new Map<string, CmsContent>();
  readonly revisions: CmsRevisionRecord[] = [];
  readonly workflow: Array<Record<string, unknown>> = [];
  readonly audit: CmsAuditEvent[] = [];
  readonly media = new Map<string, CmsMediaAsset>();
  readonly contentMedia = new Map<string, string[]>();
  async transaction<T>(
    work: (repository: CmsRepository) => Promise<T>,
  ): Promise<T> {
    return work(this);
  }
  addClub(id: string) {
    this.clubs.add(id);
  }
  addMedia(input: {
    id: string;
    ownerUserId: string;
    owningClubId: string | null;
    status: CmsMediaAsset["status"];
  }) {
    this.media.set(input.id, {
      ...input,
      storageKey: `cms/media/${input.id}.png`,
      originalFilename: `${input.id}.png`,
      normalizedFilename: `${input.id}.png`,
      declaredMimeType: "image/png",
      detectedMimeType: "image/png",
      byteSize: 8,
      checksumSha256: null,
      altText: "Synthetic media",
    });
  }
  async clubExists(id: string) {
    return this.clubs.has(id);
  }
  async slugExists(slug: string, excludingId?: string) {
    return [...this.contents.values()].some(
      (item) => item.slug === slug && item.id !== excludingId,
    );
  }
  async findContent(id: string) {
    return this.contents.get(id) ?? null;
  }
  async createContent(content: CmsContent) {
    this.contents.set(content.id, content);
  }
  async saveContent(content: CmsContent) {
    this.contents.set(content.id, content);
  }
  async createRevision(
    content: CmsContent,
    actorUserId: string,
    options?: {
      snapshotId?: string;
      baseSnapshotId?: string | null;
      revisionLabel?: string;
      status?: WorkflowState;
      rebasedFromSnapshotId?: string | null;
      verifiedVersionNumber?: number | null;
    },
  ) {
    const record: CmsRevisionRecord = {
      id: crypto.randomUUID(),
      contentId: content.id,
      revision: content.currentRevision,
      revisionLabel:
        options?.revisionLabel ?? `1.${content.currentRevision - 1}`,
      snapshotId: options?.snapshotId ?? `snap_${crypto.randomUUID()}`,
      baseSnapshotId: options?.baseSnapshotId ?? content.currentBaseSnapshotId,
      status: options?.status ?? content.state,
      rebasedFromSnapshotId: options?.rebasedFromSnapshotId ?? null,
      verifiedVersionNumber: options?.verifiedVersionNumber ?? null,
      snapshot: {
        type: content.type,
        title: content.title,
        slug: content.slug,
        summary: content.summary,
        body: content.body,
        seoTitle: content.seoTitle,
        seoDescription: content.seoDescription,
        canonicalPath: content.canonicalPath,
        featuredMediaId: content.featuredMediaId,
        owningClubId: content.owningClubId,
        eventStartAt: content.eventStartAt?.toISOString() ?? null,
        eventEndAt: content.eventEndAt?.toISOString() ?? null,
        eventLocation: content.eventLocation,
        eventOrganiser: content.eventOrganiser,
      },
      createdBy: actorUserId,
      createdAt: new Date(),
    };
    this.revisions.push(record);
    return record;
  }
  async findRevisions(contentId: string) {
    return this.revisions.filter((r) => r.contentId === contentId);
  }
  async findRevisionBySnapshotId(snapshotId: string) {
    return this.revisions.find((r) => r.snapshotId === snapshotId) ?? null;
  }
  async findRevisionsByBaseSnapshotId(baseSnapshotId: string) {
    return this.revisions.filter((r) => r.baseSnapshotId === baseSnapshotId);
  }
  async updateRevisionStatus(
    revisionId: string,
    status: WorkflowState,
    verifiedVersionNumber?: number | null,
  ) {
    const idx = this.revisions.findIndex((r) => r.id === revisionId);
    if (idx !== -1 && this.revisions[idx]) {
      this.revisions[idx] = {
        ...this.revisions[idx],
        status,
        verifiedVersionNumber:
          verifiedVersionNumber !== undefined
            ? verifiedVersionNumber
            : this.revisions[idx].verifiedVersionNumber,
      };
    }
  }
  async findMedia(id: string) {
    return this.media.get(id) ?? null;
  }
  async replaceContentMedia(contentId: string, mediaIds: readonly string[]) {
    this.contentMedia.set(contentId, [...mediaIds]);
  }
  async appendWorkflowEvent(input: Record<string, unknown>) {
    this.workflow.push(input);
  }
  async appendAudit(event: CmsAuditEvent) {
    this.audit.push(event);
  }
}

const MAX_IMAGE_BYTES = 10_000_000;
const imageSignatures = [
  {
    mime: "image/png",
    extension: "png",
    matches: (b: Uint8Array) =>
      b.length >= 8 &&
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
        (v, i) => b[i] === v,
      ),
  },
  {
    mime: "image/jpeg",
    extension: "jpg",
    matches: (b: Uint8Array) =>
      b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/webp",
    extension: "webp",
    matches: (b: Uint8Array) =>
      b.length >= 12 &&
      String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...b.slice(8, 12)) === "WEBP",
  },
] as const;

export interface ImageUploadInput {
  readonly filename: string;
  readonly declaredMimeType: string;
  readonly byteSize: number;
  readonly bytes: Uint8Array;
}
export interface ValidatedImageUpload {
  readonly normalizedFilename: string;
  readonly detectedMimeType: string;
  readonly storageKey: string;
  readonly byteSize: number;
}
export function validateImageUpload(
  input: ImageUploadInput,
): ValidatedImageUpload {
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize <= 0)
    throw new Error("Image size is invalid.");
  if (input.byteSize > MAX_IMAGE_BYTES)
    throw new Error("Images must not exceed 10 MB.");
  const originalExtension = input.filename.toLowerCase().split(".").pop() ?? "";
  const signature = imageSignatures.find((candidate) =>
    candidate.matches(input.bytes),
  );
  if (!signature) throw new Error("The image content is not permitted.");
  if (input.declaredMimeType.toLowerCase() !== signature.mime)
    throw new Error("The declared MIME type does not match the image content.");
  const acceptedExtensions =
    signature.extension === "jpg" ? ["jpg", "jpeg"] : [signature.extension];
  if (!acceptedExtensions.includes(originalExtension as never))
    throw new Error("The file extension does not match the image content.");
  const stem =
    input.filename
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100) || "image";
  return {
    normalizedFilename: `${stem}.${signature.extension}`,
    detectedMimeType: signature.mime,
    storageKey: `cms/media/${crypto.randomUUID()}.${signature.extension}`,
    byteSize: input.byteSize,
  };
}

export interface CmsObjectStorage {
  createUpload(input: {
    readonly storageKey: string;
    readonly mimeType: string;
    readonly byteSize: number;
  }): Promise<{ readonly uploadUrl: string; readonly expiresAt: Date }>;
  createDownload(
    storageKey: string,
  ): Promise<{ readonly downloadUrl: string; readonly expiresAt: Date }>;
  inspect(storageKey: string): Promise<{
    readonly byteSize: number | null;
    readonly mimeType: string | null;
    readonly etag: string | null;
  }>;
  read(storageKey: string): Promise<{
    readonly body: ReadableStream;
    readonly byteSize: number | null;
    readonly mimeType: string | null;
    readonly etag: string | null;
  }>;
  delete?(storageKey: string): Promise<void>;
}

export interface CmsMediaAsset {
  readonly id: string;
  readonly storageKey: string;
  readonly originalFilename: string;
  readonly normalizedFilename: string;
  readonly declaredMimeType: string;
  readonly detectedMimeType: string;
  readonly byteSize: number;
  readonly checksumSha256: string | null;
  readonly altText: string;
  readonly ownerUserId: string;
  readonly owningClubId: string | null;
  readonly status: "pending" | "available" | "rejected" | "failed" | "archived";
}

export interface MediaRepository {
  createMedia(asset: CmsMediaAsset): Promise<void>;
  findMedia(id: string): Promise<CmsMediaAsset | null>;
  saveMedia(asset: CmsMediaAsset): Promise<void>;
  deleteMedia(id: string): Promise<void>;
  appendAudit(event: CmsAuditEvent): Promise<void>;
}

export class MediaService {
  constructor(
    private readonly repository: MediaRepository,
    private readonly storage: CmsObjectStorage,
  ) {}

  private async authorize(
    actor: CmsActor,
    permission: Permission | readonly Permission[],
    asset: CmsMediaAsset,
  ) {
    const permissions = Array.isArray(permission) ? permission : [permission];
    const decisions = permissions.map((candidate) =>
      evaluateAuthorization({
        identityId: actor.userId,
        application: "cms",
        permission: candidate,
        grant: actor.grant,
        resource: {
          ownerId: asset.ownerUserId,
          scopes: asset.owningClubId
            ? [{ dimension: "club", value: asset.owningClubId }]
            : [],
        },
      }),
    );
    if (decisions.some((decision) => decision.allowed)) return;
    await this.repository.appendAudit({
      id: crypto.randomUUID(),
      eventType: "authorization.denied",
      actorUserId: actor.userId,
      sessionId: actor.sessionId ?? null,
      resourceType: "media",
      resourceId: asset.id,
      outcome: "denied",
      reasonCode: decisions.at(-1)?.reason ?? "missing_permission",
      metadata: { permission: permissions.join("|") },
      occurredAt: new Date(),
    });
    throw new CmsDomainError(
      "AUTHORIZATION_DENIED",
      "You do not have permission to perform this action.",
    );
  }

  async initiateImageUpload(
    actor: CmsActor,
    input: ImageUploadInput & {
      readonly altText: string;
      readonly owningClubId?: string | null;
    },
  ) {
    const validated = validateImageUpload(input);
    const asset: CmsMediaAsset = {
      id: crypto.randomUUID(),
      storageKey: validated.storageKey,
      originalFilename: input.filename.slice(0, 255),
      normalizedFilename: validated.normalizedFilename,
      declaredMimeType: input.declaredMimeType,
      detectedMimeType: validated.detectedMimeType,
      byteSize: validated.byteSize,
      checksumSha256: null,
      altText: z.string().trim().min(1).max(500).parse(input.altText),
      ownerUserId: actor.userId,
      owningClubId: input.owningClubId ?? null,
      status: "pending",
    };
    await this.authorize(actor, "media:create:own", asset);
    await this.repository.createMedia(asset);
    let upload;
    try {
      upload = await this.storage.createUpload({
        storageKey: asset.storageKey,
        mimeType: asset.detectedMimeType,
        byteSize: asset.byteSize,
      });
    } catch (error) {
      await this.repository.saveMedia({ ...asset, status: "failed" });
      await this.repository.appendAudit({
        id: crypto.randomUUID(),
        eventType: "media.upload.failed",
        actorUserId: actor.userId,
        sessionId: actor.sessionId ?? null,
        resourceType: "media",
        resourceId: asset.id,
        outcome: "failure",
        reasonCode: "storage_signing_failed",
        metadata: {},
        occurredAt: new Date(),
      });
      throw error;
    }
    await this.repository.appendAudit({
      id: crypto.randomUUID(),
      eventType: "media.upload.initiated",
      actorUserId: actor.userId,
      sessionId: actor.sessionId ?? null,
      resourceType: "media",
      resourceId: asset.id,
      outcome: "success",
      reasonCode: null,
      metadata: { mimeType: asset.detectedMimeType, byteSize: asset.byteSize },
      occurredAt: new Date(),
    });
    return { asset, ...upload };
  }

  async finalizeImageUpload(actor: CmsActor, id: string) {
    const asset = await this.repository.findMedia(id);
    if (!asset)
      throw new CmsDomainError("CONTENT_NOT_FOUND", "Media was not found.");
    await this.authorize(actor, "media:create:own", asset);
    if (
      asset.status !== "pending" &&
      asset.status !== "rejected" &&
      asset.status !== "failed"
    ) {
      throw new CmsDomainError(
        "INVALID_TRANSITION",
        "Only pending, rejected, or failed media can be finalized.",
      );
    }
    try {
      const stored = await this.storage.inspect(asset.storageKey);
      if (
        stored.byteSize !== asset.byteSize ||
        stored.mimeType !== asset.detectedMimeType
      ) {
        throw new Error(
          "Stored object metadata does not match the upload request.",
        );
      }
      const storedRead = await this.storage.read(asset.storageKey);
      const reader = storedRead.body.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const bytes = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      validateImageUpload({
        filename: asset.normalizedFilename,
        declaredMimeType: stored.mimeType,
        byteSize: bytes.byteLength,
        bytes,
      });
      const digest = await crypto.subtle.digest(
        "SHA-256",
        Uint8Array.from(bytes).buffer,
      );
      const checksumSha256 = Array.from(new Uint8Array(digest), (value) =>
        value.toString(16).padStart(2, "0"),
      ).join("");
      const available = {
        ...asset,
        checksumSha256,
        status: "available" as const,
      };
      await this.repository.saveMedia(available);
      await this.repository.appendAudit({
        id: crypto.randomUUID(),
        eventType: "media.upload.finalized",
        actorUserId: actor.userId,
        sessionId: actor.sessionId ?? null,
        resourceType: "media",
        resourceId: id,
        outcome: "success",
        reasonCode: null,
        metadata: { checksumSha256 },
        occurredAt: new Date(),
      });
      return available;
    } catch (error) {
      await this.repository.saveMedia({ ...asset, status: "rejected" });
      await this.repository.appendAudit({
        id: crypto.randomUUID(),
        eventType: "media.upload.rejected",
        actorUserId: actor.userId,
        sessionId: actor.sessionId ?? null,
        resourceType: "media",
        resourceId: id,
        outcome: "failure",
        reasonCode: "storage_verification_failed",
        metadata: {},
        occurredAt: new Date(),
      });
      throw error;
    }
  }

  async createDownload(actor: CmsActor, id: string) {
    const asset = await this.repository.findMedia(id);
    if (!asset)
      throw new CmsDomainError("CONTENT_NOT_FOUND", "Media was not found.");
    await this.authorize(actor, ["media:read:club", "media:read:cms"], asset);
    if (asset.status !== "available") {
      throw new CmsDomainError(
        "INVALID_TRANSITION",
        "Media is not available for download.",
      );
    }
    return this.storage.createDownload(asset.storageKey);
  }

  async createPreviewDownload(actor: CmsActor, id: string) {
    const asset = await this.repository.findMedia(id);
    if (!asset)
      throw new CmsDomainError("CONTENT_NOT_FOUND", "Media was not found.");
    await this.authorize(actor, ["media:read:club", "media:read:cms"], asset);
    return this.storage.createDownload(asset.storageKey);
  }

  async archive(actor: CmsActor, id: string) {
    const asset = await this.repository.findMedia(id);
    if (!asset)
      throw new CmsDomainError("CONTENT_NOT_FOUND", "Media was not found.");
    const permissions: Permission[] = [
      "media:archive:own",
      "media:archive:club",
      "media:archive:cms",
    ];
    let permitted = false;
    for (const permission of permissions) {
      const decision = evaluateAuthorization({
        identityId: actor.userId,
        application: "cms",
        permission,
        grant: actor.grant,
        resource: {
          ownerId: asset.ownerUserId,
          scopes: asset.owningClubId
            ? [{ dimension: "club", value: asset.owningClubId }]
            : [],
        },
      });
      if (decision.allowed) {
        permitted = true;
        break;
      }
    }
    if (!permitted) await this.authorize(actor, permissions[0]!, asset);
    const archived = { ...asset, status: "archived" as const };
    await this.repository.saveMedia(archived);
    await this.repository.appendAudit({
      id: crypto.randomUUID(),
      eventType: "media.archived",
      actorUserId: actor.userId,
      sessionId: actor.sessionId ?? null,
      resourceType: "media",
      resourceId: id,
      outcome: "success",
      reasonCode: null,
      metadata: {},
      occurredAt: new Date(),
    });
    return archived;
  }

  async unarchive(actor: CmsActor, id: string) {
    const asset = await this.repository.findMedia(id);
    if (!asset)
      throw new CmsDomainError("CONTENT_NOT_FOUND", "Media was not found.");
    const permissions: Permission[] = [
      "media:archive:own",
      "media:archive:club",
      "media:archive:cms",
    ];
    let permitted = false;
    for (const permission of permissions) {
      const decision = evaluateAuthorization({
        identityId: actor.userId,
        application: "cms",
        permission,
        grant: actor.grant,
        resource: {
          ownerId: asset.ownerUserId,
          scopes: asset.owningClubId
            ? [{ dimension: "club", value: asset.owningClubId }]
            : [],
        },
      });
      if (decision.allowed) {
        permitted = true;
        break;
      }
    }
    if (!permitted) await this.authorize(actor, permissions[0]!, asset);
    const unarchived = { ...asset, status: "available" as const };
    await this.repository.saveMedia(unarchived);
    await this.repository.appendAudit({
      id: crypto.randomUUID(),
      eventType: "media.unarchived",
      actorUserId: actor.userId,
      sessionId: actor.sessionId ?? null,
      resourceType: "media",
      resourceId: id,
      outcome: "success",
      reasonCode: null,
      metadata: {},
      occurredAt: new Date(),
    });
    return unarchived;
  }

  async updateMetadata(
    actor: CmsActor,
    id: string,
    input: {
      altText?: string;
      owningClubId?: string | null;
      filename?: string;
    },
  ) {
    const asset = await this.repository.findMedia(id);
    if (!asset)
      throw new CmsDomainError("CONTENT_NOT_FOUND", "Media was not found.");
    const permissions: Permission[] = [
      "media:update:own",
      "media:update:club",
      "media:update:cms",
    ];
    let permitted = false;
    for (const permission of permissions) {
      const decision = evaluateAuthorization({
        identityId: actor.userId,
        application: "cms",
        permission,
        grant: actor.grant,
        resource: {
          ownerId: asset.ownerUserId,
          scopes: asset.owningClubId
            ? [{ dimension: "club", value: asset.owningClubId }]
            : [],
        },
      });
      if (decision.allowed) {
        permitted = true;
        break;
      }
    }
    if (!permitted) await this.authorize(actor, permissions[0]!, asset);

    const newAltText =
      input.altText !== undefined
        ? z.string().trim().min(1).max(500).parse(input.altText)
        : asset.altText;
    const newOwningClubId =
      input.owningClubId !== undefined
        ? input.owningClubId
        : asset.owningClubId;

    let originalFilename = asset.originalFilename;
    let normalizedFilename = asset.normalizedFilename;
    if (input.filename !== undefined) {
      const newFilename = z
        .string()
        .trim()
        .min(1)
        .max(255)
        .parse(input.filename);
      originalFilename = newFilename;
      const ext = newFilename.split(".").pop()?.toLowerCase() ?? "";
      const stem =
        newFilename
          .replace(/\.[^.]+$/, "")
          .toLowerCase()
          .normalize("NFKD")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 100) || "image";
      normalizedFilename = ext ? `${stem}.${ext}` : stem;
    }

    const updated: CmsMediaAsset = {
      ...asset,
      originalFilename,
      normalizedFilename,
      altText: newAltText,
      owningClubId: newOwningClubId,
    };
    await this.repository.saveMedia(updated);
    await this.repository.appendAudit({
      id: crypto.randomUUID(),
      eventType: "media.updated",
      actorUserId: actor.userId,
      sessionId: actor.sessionId ?? null,
      resourceType: "media",
      resourceId: id,
      outcome: "success",
      reasonCode: null,
      metadata: {
        altText: newAltText,
        owningClubId: newOwningClubId,
        filename: originalFilename,
      },
      occurredAt: new Date(),
    });
    return updated;
  }

  async initiateMediaReplacement(
    actor: CmsActor,
    id: string,
    input: ImageUploadInput,
  ) {
    const asset = await this.repository.findMedia(id);
    if (!asset)
      throw new CmsDomainError("CONTENT_NOT_FOUND", "Media was not found.");
    const permissions: Permission[] = [
      "media:update:own",
      "media:update:club",
      "media:update:cms",
    ];
    let permitted = false;
    for (const permission of permissions) {
      const decision = evaluateAuthorization({
        identityId: actor.userId,
        application: "cms",
        permission,
        grant: actor.grant,
        resource: {
          ownerId: asset.ownerUserId,
          scopes: asset.owningClubId
            ? [{ dimension: "club", value: asset.owningClubId }]
            : [],
        },
      });
      if (decision.allowed) {
        permitted = true;
        break;
      }
    }
    if (!permitted) await this.authorize(actor, permissions[0]!, asset);

    const validated = validateImageUpload(input);
    const ext = validated.normalizedFilename.split(".").pop() ?? "png";
    const newStorageKey = `cms/media/${crypto.randomUUID()}.${ext}`;

    const upload = await this.storage.createUpload({
      storageKey: newStorageKey,
      mimeType: validated.detectedMimeType,
      byteSize: validated.byteSize,
    });

    await this.repository.appendAudit({
      id: crypto.randomUUID(),
      eventType: "media.replacement.initiated",
      actorUserId: actor.userId,
      sessionId: actor.sessionId ?? null,
      resourceType: "media",
      resourceId: asset.id,
      outcome: "success",
      reasonCode: null,
      metadata: { newStorageKey, mimeType: validated.detectedMimeType },
      occurredAt: new Date(),
    });

    return {
      assetId: asset.id,
      newStorageKey,
      uploadUrl: upload.uploadUrl,
      expiresAt: upload.expiresAt,
      detectedMimeType: validated.detectedMimeType,
      normalizedFilename: validated.normalizedFilename,
      originalFilename: input.filename,
      byteSize: validated.byteSize,
    };
  }

  async finalizeMediaReplacement(
    actor: CmsActor,
    id: string,
    input: {
      newStorageKey: string;
      originalFilename: string;
      normalizedFilename: string;
      declaredMimeType: string;
      detectedMimeType: string;
      byteSize: number;
    },
  ) {
    const asset = await this.repository.findMedia(id);
    if (!asset)
      throw new CmsDomainError("CONTENT_NOT_FOUND", "Media was not found.");
    const permissions: Permission[] = [
      "media:update:own",
      "media:update:club",
      "media:update:cms",
    ];
    let permitted = false;
    for (const permission of permissions) {
      const decision = evaluateAuthorization({
        identityId: actor.userId,
        application: "cms",
        permission,
        grant: actor.grant,
        resource: {
          ownerId: asset.ownerUserId,
          scopes: asset.owningClubId
            ? [{ dimension: "club", value: asset.owningClubId }]
            : [],
        },
      });
      if (decision.allowed) {
        permitted = true;
        break;
      }
    }
    if (!permitted) await this.authorize(actor, permissions[0]!, asset);

    const stored = await this.storage.inspect(input.newStorageKey);
    if (
      stored.byteSize !== input.byteSize ||
      stored.mimeType !== input.detectedMimeType
    ) {
      throw new Error(
        "Stored object metadata does not match the replacement request.",
      );
    }
    const storedRead = await this.storage.read(input.newStorageKey);
    const reader = storedRead.body.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const bytes = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    validateImageUpload({
      filename: input.normalizedFilename,
      declaredMimeType: stored.mimeType,
      byteSize: bytes.byteLength,
      bytes,
    });
    const digest = await crypto.subtle.digest(
      "SHA-256",
      Uint8Array.from(bytes).buffer,
    );
    const checksumSha256 = Array.from(new Uint8Array(digest), (value) =>
      value.toString(16).padStart(2, "0"),
    ).join("");

    const oldStorageKey = asset.storageKey;

    const replaced: CmsMediaAsset = {
      ...asset,
      storageKey: input.newStorageKey,
      originalFilename: input.originalFilename.slice(0, 255),
      normalizedFilename: input.normalizedFilename,
      declaredMimeType: input.declaredMimeType,
      detectedMimeType: input.detectedMimeType,
      byteSize: input.byteSize,
      checksumSha256,
      status: "available" as const,
    };

    await this.repository.saveMedia(replaced);

    if (this.storage.delete && oldStorageKey !== input.newStorageKey) {
      try {
        await this.storage.delete(oldStorageKey);
      } catch (e) {
        console.warn("Failed to delete old replaced storage object:", e);
      }
    }

    await this.repository.appendAudit({
      id: crypto.randomUUID(),
      eventType: "media.replaced",
      actorUserId: actor.userId,
      sessionId: actor.sessionId ?? null,
      resourceType: "media",
      resourceId: id,
      outcome: "success",
      reasonCode: null,
      metadata: {
        checksumSha256,
        oldStorageKey,
        newStorageKey: input.newStorageKey,
      },
      occurredAt: new Date(),
    });

    return replaced;
  }

  async deleteMedia(actor: CmsActor, id: string) {
    const asset = await this.repository.findMedia(id);
    if (!asset)
      throw new CmsDomainError("CONTENT_NOT_FOUND", "Media was not found.");
    const permissions: Permission[] = [
      "media:archive:own",
      "media:archive:club",
      "media:archive:cms",
      "configuration:manage:cms",
    ];
    let permitted = false;
    for (const permission of permissions) {
      const decision = evaluateAuthorization({
        identityId: actor.userId,
        application: "cms",
        permission,
        grant: actor.grant,
        resource: {
          ownerId: asset.ownerUserId,
          scopes: asset.owningClubId
            ? [{ dimension: "club", value: asset.owningClubId }]
            : [],
        },
      });
      if (decision.allowed) {
        permitted = true;
        break;
      }
    }
    if (!permitted && asset.ownerUserId === actor.userId) {
      permitted = true;
    }
    if (!permitted) await this.authorize(actor, permissions[0]!, asset);

    if (this.storage.delete) {
      try {
        await this.storage.delete(asset.storageKey);
      } catch (err) {
        console.warn("Storage deletion failed during media delete", err);
      }
    }

    await this.repository.deleteMedia(id);
    await this.repository.appendAudit({
      id: crypto.randomUUID(),
      eventType: "media.deleted",
      actorUserId: actor.userId,
      sessionId: actor.sessionId ?? null,
      resourceType: "media",
      resourceId: id,
      outcome: "success",
      reasonCode: null,
      metadata: { storageKey: asset.storageKey },
      occurredAt: new Date(),
    });
  }
}

export class InMemoryMediaRepository implements MediaRepository {
  readonly media = new Map<string, CmsMediaAsset>();
  readonly audit: CmsAuditEvent[] = [];
  async createMedia(asset: CmsMediaAsset) {
    this.media.set(asset.id, asset);
  }
  async findMedia(id: string) {
    return this.media.get(id) ?? null;
  }
  async saveMedia(asset: CmsMediaAsset) {
    this.media.set(asset.id, asset);
  }
  async deleteMedia(id: string) {
    this.media.delete(id);
  }
  async appendAudit(event: CmsAuditEvent) {
    this.audit.push(event);
  }
}

export { DrizzleCmsRepository } from "./drizzle-repository";
export { createCloudflareR2Storage } from "./cloudflare-r2";
