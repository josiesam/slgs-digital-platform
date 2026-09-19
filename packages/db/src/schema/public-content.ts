import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { integer, pgSchema, text } from "drizzle-orm/pg-core";

import { contentItem, contentMedia, mediaAsset } from "./cms";

export const publicContentSchema = pgSchema("public_content");

const published = and(
  eq(contentItem.state, "published"),
  isNotNull(contentItem.publishedAt),
);

const publicProjection = {
  id: contentItem.id,
  slug: contentItem.slug,
  title: contentItem.title,
  summary: contentItem.summary,
  body: contentItem.body,
  seoTitle: contentItem.seoTitle,
  seoDescription: contentItem.seoDescription,
  canonicalPath: contentItem.canonicalPath,
  publishedAt: contentItem.publishedAt,
  updatedAt: contentItem.updatedAt,
};

export const publicPage = publicContentSchema.view("page").as((query) =>
  query
    .select(publicProjection)
    .from(contentItem)
    .where(and(published, eq(contentItem.type, "page"))),
);

export const publicArticle = publicContentSchema.view("article").as((query) =>
  query
    .select(publicProjection)
    .from(contentItem)
    .where(and(published, eq(contentItem.type, "article"))),
);

export const publicAnnouncement = publicContentSchema
  .view("announcement")
  .as((query) =>
    query
      .select(publicProjection)
      .from(contentItem)
      .where(and(published, eq(contentItem.type, "announcement"))),
  );

export const publicGallery = publicContentSchema.view("gallery").as((query) =>
  query
    .select(publicProjection)
    .from(contentItem)
    .where(and(published, eq(contentItem.type, "gallery"))),
);

export const publicEvent = publicContentSchema.view("event").as((query) =>
  query
    .select({
      ...publicProjection,
      startAt: contentItem.eventStartAt,
      endAt: contentItem.eventEndAt,
      location: contentItem.eventLocation,
      organiser: contentItem.eventOrganiser,
    })
    .from(contentItem)
    .where(and(published, eq(contentItem.type, "event"))),
);

export const publicMedia = publicContentSchema.view("media").as((query) =>
  query
    .select({
      contentId: contentMedia.contentId,
      mediaId: mediaAsset.id,
      storageKey: mediaAsset.storageKey,
      mimeType: mediaAsset.detectedMimeType,
      altText: mediaAsset.altText,
      caption: mediaAsset.caption,
      width: mediaAsset.width,
      height: mediaAsset.height,
      purpose: contentMedia.purpose,
      sortOrder: contentMedia.sortOrder,
    })
    .from(contentMedia)
    .innerJoin(mediaAsset, eq(contentMedia.mediaId, mediaAsset.id))
    .innerJoin(contentItem, eq(contentMedia.contentId, contentItem.id))
    .where(
      and(
        published,
        eq(mediaAsset.status, "available"),
        isNull(mediaAsset.archivedAt),
      ),
    ),
);
