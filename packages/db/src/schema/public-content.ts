import { and, eq, isNotNull } from "drizzle-orm";
import { pgSchema } from "drizzle-orm/pg-core";

import { contentItem } from "./cms";

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
