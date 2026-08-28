import { and, eq, ne } from "drizzle-orm";

import {
  club,
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
  authorUserId: contentItem.authorUserId,
  owningClubId: contentItem.owningClubId,
  state: contentItem.state,
  currentRevision: contentItem.currentRevision,
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
  authorUserId: item.authorUserId,
  owningClubId: item.owningClubId,
  state: item.state,
  currentRevision: item.currentRevision,
  eventStartAt: item.eventStartAt,
  eventEndAt: item.eventEndAt,
  eventLocation: item.eventLocation,
  eventOrganiser: item.eventOrganiser,
  submittedAt: item.submittedAt,
  reviewedAt: item.reviewedAt,
  reviewedBy: item.reviewedBy,
  approvedAt: item.approvedAt,
  approvedBy: item.approvedBy,
  publishedAt: item.publishedAt,
  publishedBy: item.publishedBy,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
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
    await this.database
      .update(contentItem)
      .set(values(item))
      .where(eq(contentItem.id, item.id));
  }

  async createRevision(item: CmsContent, actorUserId: string) {
    await this.database.insert(contentRevision).values({
      id: crypto.randomUUID(),
      contentId: item.id,
      revision: item.currentRevision,
      createdBy: actorUserId,
      snapshot: {
        type: item.type,
        title: item.title,
        slug: item.slug,
        summary: item.summary,
        body: item.body,
        seoTitle: item.seoTitle,
        seoDescription: item.seoDescription,
        canonicalPath: item.canonicalPath,
        owningClubId: item.owningClubId,
        eventStartAt: item.eventStartAt?.toISOString() ?? null,
        eventEndAt: item.eventEndAt?.toISOString() ?? null,
        eventLocation: item.eventLocation,
        eventOrganiser: item.eventOrganiser,
      },
    });
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
        status: asset.status,
        checksumSha256: asset.checksumSha256,
        archivedAt: asset.status === "archived" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(mediaAsset.id, asset.id));
  }
}
