import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { pgSchema } from "drizzle-orm/pg-core";

import { contentItem, contentMedia, contentRevision, mediaAsset } from "./cms";

export const publicContentSchema = pgSchema("public_content");

const published = and(
  isNotNull(contentItem.publishedAt),
  isNotNull(contentItem.verifiedVersion),
);

const publicProjection = {
  id: contentItem.id,

  slug: sql<string>`
    coalesce(
      ${contentRevision.snapshot}->>'slug',
      ${contentItem.slug}
    )
  `.as("slug"),

  title: sql<string>`
    coalesce(
      ${contentRevision.snapshot}->>'title',
      ${contentItem.title}
    )
  `.as("title"),

  summary: sql<string | null>`
    coalesce(
      ${contentRevision.snapshot}->>'summary',
      ${contentItem.summary}
    )
  `.as("summary"),

  body: sql<string>`
    coalesce(
      ${contentRevision.snapshot}->>'body',
      ${contentItem.body}
    )
  `.as("body"),

  seoTitle: sql<string | null>`
    coalesce(
      ${contentRevision.snapshot}->>'seoTitle',
      ${contentItem.seoTitle}
    )
  `.as("seoTitle"),

  seoDescription: sql<string | null>`
    coalesce(
      ${contentRevision.snapshot}->>'seoDescription',
      ${contentItem.seoDescription}
    )
  `.as("seoDescription"),

  canonicalPath: sql<string | null>`
    coalesce(
      ${contentRevision.snapshot}->>'canonicalPath',
      ${contentItem.canonicalPath}
    )
  `.as("canonicalPath"),

  publishedAt: contentItem.publishedAt,
  updatedAt: contentItem.updatedAt,
};

const publishedRevisionJoin = and(
  eq(contentRevision.contentId, contentItem.id),
  eq(contentRevision.status, "published"),
  eq(contentRevision.verifiedVersionNumber, contentItem.verifiedVersion),
);

export const publicPage = publicContentSchema.view("page").as((query) =>
  query
    .select(publicProjection)
    .from(contentItem)
    .leftJoin(contentRevision, publishedRevisionJoin)
    .where(and(published, eq(contentItem.type, "page"))),
);

export const publicArticle = publicContentSchema.view("article").as((query) =>
  query
    .select(publicProjection)
    .from(contentItem)
    .leftJoin(contentRevision, publishedRevisionJoin)
    .where(and(published, eq(contentItem.type, "article"))),
);

export const publicAnnouncement = publicContentSchema
  .view("announcement")
  .as((query) =>
    query
      .select(publicProjection)
      .from(contentItem)
      .leftJoin(contentRevision, publishedRevisionJoin)
      .where(and(published, eq(contentItem.type, "announcement"))),
  );

export const publicGallery = publicContentSchema.view("gallery").as((query) =>
  query
    .select(publicProjection)
    .from(contentItem)
    .leftJoin(contentRevision, publishedRevisionJoin)
    .where(and(published, eq(contentItem.type, "gallery"))),
);

export const publicEvent = publicContentSchema.view("event").as((query) =>
  query
    .select({
      ...publicProjection,

      startAt: sql<Date | null>`
          coalesce(
            cast(
              ${contentRevision.snapshot}->>'eventStartAt'
              as timestamptz
            ),
            ${contentItem.eventStartAt}
          )
        `.as("startAt"),

      endAt: sql<Date | null>`
          coalesce(
            cast(
              ${contentRevision.snapshot}->>'eventEndAt'
              as timestamptz
            ),
            ${contentItem.eventEndAt}
          )
        `.as("endAt"),

      location: sql<string | null>`
          coalesce(
            ${contentRevision.snapshot}->>'eventLocation',
            ${contentItem.eventLocation}
          )
        `.as("location"),

      organiser: sql<string | null>`
          coalesce(
            ${contentRevision.snapshot}->>'eventOrganiser',
            ${contentItem.eventOrganiser}
          )
        `.as("organiser"),
    })
    .from(contentItem)
    .leftJoin(contentRevision, publishedRevisionJoin)
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
