import { and, eq, ne } from "drizzle-orm";

import {
  club,
  contentMedia,
  contentItem,
  contentRevision,
  editorialAuditEvent,
  mediaAsset,
  workflowEvent,
  type DatabaseConnection,
} from "@slgs/db";

import type {
  CmsAuditEvent,
  CmsContent,
  CmsMediaAsset,
  CmsRepository,
  WorkflowState,
} from "./index";

type Database = DatabaseConnection["db"];

const contentSelection = {
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
  authorUserId: contentItem.authorUserId,
  owningClubId: contentItem.owningClubId,
  state: contentItem.state,
  currentRevision: contentItem.currentRevision,
  currentSnapshotId: contentItem.currentSnapshotId,
  currentBaseSnapshotId: contentItem.currentBaseSnapshotId,
  verifiedVersion: contentItem.verifiedVersion,
  eventStartAt: contentItem.eventStartAt,
  eventEndAt: contentItem.eventEndAt,
  eventLocation: contentItem.eventLocation,
  eventOrganiser: contentItem.eventOrganiser,
  submittedAt: contentItem.submittedAt,
  reviewedAt: contentItem.reviewedAt,
  reviewedBy: contentItem.reviewedBy,
  approvedAt: contentItem.approvedAt,
  approvedBy: contentItem.approvedBy,
  publishedAt: contentItem.publishedAt,
  publishedBy: contentItem.publishedBy,
  createdAt: contentItem.createdAt,
  updatedAt: contentItem.updatedAt,
};

const toDate = (val: Date | string | null | undefined): Date | null =>
  val ? (val instanceof Date ? val : new Date(val)) : null;

const values = (item: CmsContent) => ({
  id: item.id,
  type: item.type,
  title: item.title,
  slug: item.slug,
  summary: item.summary,
  body: item.body,
  seoTitle: item.seoTitle,
  seoDescription: item.seoDescription,
  canonicalPath: item.canonicalPath,
  featuredMediaId: item.featuredMediaId,
  authorUserId: item.authorUserId,
  owningClubId: item.owningClubId,
  state: item.state,
  currentRevision: item.currentRevision,
  currentSnapshotId: item.currentSnapshotId,
  currentBaseSnapshotId: item.currentBaseSnapshotId,
  verifiedVersion: item.verifiedVersion,
  eventStartAt: toDate(item.eventStartAt),
  eventEndAt: toDate(item.eventEndAt),
  eventLocation: item.eventLocation,
  eventOrganiser: item.eventOrganiser,
  submittedAt: toDate(item.submittedAt),
  reviewedAt: toDate(item.reviewedAt),
  reviewedBy: item.reviewedBy,
  approvedAt: toDate(item.approvedAt),
  approvedBy: item.approvedBy,
  publishedAt: toDate(item.publishedAt),
  publishedBy: item.publishedBy,
  createdAt: toDate(item.createdAt) ?? new Date(),
  updatedAt: toDate(item.updatedAt) ?? new Date(),
});

export class DrizzleCmsRepository implements CmsRepository {
  constructor(private readonly database: Database) {}

  async transaction<T>(
    work: (repository: CmsRepository) => Promise<T>,
  ): Promise<T> {
    return this.database.transaction((transaction): Promise<T> =>
      work(new DrizzleCmsRepository(transaction as unknown as Database)),
    );
  }

  async clubExists(id: string) {
    const [row] = await this.database
      .select({ id: club.id })
      .from(club)
      .where(and(eq(club.id, id), eq(club.status, "active")))
      .limit(1);
    return Boolean(row);
  }

  async slugExists(slug: string, excludingId?: string) {
    const [row] = await this.database
      .select({ id: contentItem.id })
      .from(contentItem)
      .where(
        excludingId
          ? and(eq(contentItem.slug, slug), ne(contentItem.id, excludingId))
          : eq(contentItem.slug, slug),
      )
      .limit(1);
    return Boolean(row);
  }

  async findContent(id: string): Promise<CmsContent | null> {
    const [row] = await this.database
      .select(contentSelection)
      .from(contentItem)
      .where(eq(contentItem.id, id))
      .limit(1);
    return row ?? null;
  }

  async createContent(item: CmsContent) {
    await this.database.insert(contentItem).values(values(item));
  }

  async saveContent(item: CmsContent) {
    const { id: _, ...updateValues } = values(item);
    await this.database
      .update(contentItem)
      .set(updateValues)
      .where(eq(contentItem.id, item.id));
  }

  async createRevision(
    item: CmsContent,
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
    const id = crypto.randomUUID();
    const revisionLabel = options?.revisionLabel ?? `1.${item.currentRevision - 1}`;
    const snapshotId = options?.snapshotId ?? `snap_${crypto.randomUUID()}`;
    const baseSnapshotId = options?.baseSnapshotId ?? item.currentBaseSnapshotId ?? null;
    const status = options?.status ?? item.state;
    const rebasedFromSnapshotId = options?.rebasedFromSnapshotId ?? null;
    const verifiedVersionNumber = options?.verifiedVersionNumber ?? null;
    const snapshot = {
      type: item.type,
      title: item.title,
      slug: item.slug,
      summary: item.summary,
      body: item.body,
      seoTitle: item.seoTitle,
      seoDescription: item.seoDescription,
      canonicalPath: item.canonicalPath,
      featuredMediaId: item.featuredMediaId,
      owningClubId: item.owningClubId,
      eventStartAt: item.eventStartAt?.toISOString() ?? null,
      eventEndAt: item.eventEndAt?.toISOString() ?? null,
      eventLocation: item.eventLocation,
      eventOrganiser: item.eventOrganiser,
    };
    const now = new Date();

    await this.database.insert(contentRevision).values({
      id,
      contentId: item.id,
      revision: item.currentRevision,
      revisionLabel,
      snapshotId,
      baseSnapshotId,
      status,
      rebasedFromSnapshotId,
      verifiedVersionNumber,
      snapshot,
      createdBy: actorUserId,
      createdAt: now,
    });

    return {
      id,
      contentId: item.id,
      revision: item.currentRevision,
      revisionLabel,
      snapshotId,
      baseSnapshotId,
      status,
      rebasedFromSnapshotId,
      verifiedVersionNumber,
      snapshot,
      createdBy: actorUserId,
      createdAt: now,
    };
  }

  async findRevisions(contentId: string) {
    const rows = await this.database
      .select()
      .from(contentRevision)
      .where(eq(contentRevision.contentId, contentId));
    return rows.map((r) => ({
      id: r.id,
      contentId: r.contentId,
      revision: r.revision,
      revisionLabel: r.revisionLabel,
      snapshotId: r.snapshotId,
      baseSnapshotId: r.baseSnapshotId,
      status: r.status,
      rebasedFromSnapshotId: r.rebasedFromSnapshotId,
      verifiedVersionNumber: r.verifiedVersionNumber,
      snapshot: r.snapshot as Record<string, unknown>,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
    }));
  }

  async findRevisionBySnapshotId(snapshotId: string) {
    const [row] = await this.database
      .select()
      .from(contentRevision)
      .where(eq(contentRevision.snapshotId, snapshotId))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      contentId: row.contentId,
      revision: row.revision,
      revisionLabel: row.revisionLabel,
      snapshotId: row.snapshotId,
      baseSnapshotId: row.baseSnapshotId,
      status: row.status,
      rebasedFromSnapshotId: row.rebasedFromSnapshotId,
      verifiedVersionNumber: row.verifiedVersionNumber,
      snapshot: row.snapshot as Record<string, unknown>,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    };
  }

  async findRevisionsByBaseSnapshotId(baseSnapshotId: string) {
    const rows = await this.database
      .select()
      .from(contentRevision)
      .where(eq(contentRevision.baseSnapshotId, baseSnapshotId));
    return rows.map((r) => ({
      id: r.id,
      contentId: r.contentId,
      revision: r.revision,
      revisionLabel: r.revisionLabel,
      snapshotId: r.snapshotId,
      baseSnapshotId: r.baseSnapshotId,
      status: r.status,
      rebasedFromSnapshotId: r.rebasedFromSnapshotId,
      verifiedVersionNumber: r.verifiedVersionNumber,
      snapshot: r.snapshot as Record<string, unknown>,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
    }));
  }

  async updateRevisionStatus(
    revisionId: string,
    status: WorkflowState,
    verifiedVersionNumber?: number | null,
  ) {
    await this.database
      .update(contentRevision)
      .set({
        status,
        ...(verifiedVersionNumber !== undefined ? { verifiedVersionNumber } : {}),
      })
      .where(eq(contentRevision.id, revisionId));
  }

  async replaceContentMedia(contentId: string, mediaIds: readonly string[]) {
    await this.database
      .delete(contentMedia)
      .where(eq(contentMedia.contentId, contentId));
    if (mediaIds.length) {
      await this.database.insert(contentMedia).values(
        mediaIds.map((mediaId, sortOrder) => ({
          contentId,
          mediaId,
          purpose: sortOrder === 0 ? "featured" : "gallery",
          sortOrder,
        })),
      );
    }
  }

  async appendWorkflowEvent(input: {
    contentId: string;
    fromState: WorkflowState | null;
    toState: WorkflowState;
    actorUserId: string;
    comment?: string;
  }) {
    await this.database.insert(workflowEvent).values({
      id: crypto.randomUUID(),
      contentId: input.contentId,
      fromState: input.fromState,
      toState: input.toState,
      actorUserId: input.actorUserId,
      comment: input.comment,
    });
  }

  async appendAudit(event: CmsAuditEvent) {
    await this.database.insert(editorialAuditEvent).values({
      id: event.id,
      eventType: event.eventType,
      actorUserId: event.actorUserId,
      sessionId: event.sessionId,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      outcome: event.outcome,
      reasonCode: event.reasonCode,
      metadata: { ...event.metadata },
      occurredAt: event.occurredAt,
    });
  }

  async createMedia(asset: CmsMediaAsset) {
    await this.database.insert(mediaAsset).values({
      id: asset.id,
      storageKey: asset.storageKey,
      originalFilename: asset.originalFilename,
      normalizedFilename: asset.normalizedFilename,
      declaredMimeType: asset.declaredMimeType,
      detectedMimeType: asset.detectedMimeType,
      byteSize: asset.byteSize,
      checksumSha256: asset.checksumSha256,
      altText: asset.altText,
      ownerUserId: asset.ownerUserId,
      owningClubId: asset.owningClubId,
      status: asset.status,
    });
  }

  async findMedia(id: string): Promise<CmsMediaAsset | null> {
    const [row] = await this.database
      .select({
        id: mediaAsset.id,
        storageKey: mediaAsset.storageKey,
        originalFilename: mediaAsset.originalFilename,
        normalizedFilename: mediaAsset.normalizedFilename,
        declaredMimeType: mediaAsset.declaredMimeType,
        detectedMimeType: mediaAsset.detectedMimeType,
        byteSize: mediaAsset.byteSize,
        checksumSha256: mediaAsset.checksumSha256,
        altText: mediaAsset.altText,
        ownerUserId: mediaAsset.ownerUserId,
        owningClubId: mediaAsset.owningClubId,
        status: mediaAsset.status,
      })
      .from(mediaAsset)
      .where(eq(mediaAsset.id, id))
      .limit(1);
    if (!row || !row.detectedMimeType) return null;
    return { ...row, detectedMimeType: row.detectedMimeType };
  }

  async saveMedia(asset: CmsMediaAsset) {
    await this.database
      .update(mediaAsset)
      .set({
        altText: asset.altText,
        owningClubId: asset.owningClubId,
        status: asset.status,
        checksumSha256: asset.checksumSha256,
        archivedAt: asset.status === "archived" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(mediaAsset.id, asset.id));
  }

  async deleteMedia(id: string): Promise<void> {
    await this.database.delete(contentMedia).where(eq(contentMedia.mediaId, id));
    await this.database.delete(mediaAsset).where(eq(mediaAsset.id, id));
  }
}
