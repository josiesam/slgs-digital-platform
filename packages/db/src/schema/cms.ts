import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSchema,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { user } from "./identity";

export const cmsSchema = pgSchema("cms");

export const cmsContentType = pgEnum("cms_content_type", [
  "page",
  "article",
  "event",
  "announcement",
  "gallery",
]);
export const cmsWorkflowState = pgEnum("cms_workflow_state", [
  "draft",
  "submitted",
  "in_review",
  "rejected",
  "approved",
  "published",
]);
export const cmsClubStatus = pgEnum("cms_club_status", [
  "active",
  "inactive",
  "archived",
]);
export const cmsMediaStatus = pgEnum("cms_media_status", [
  "pending",
  "available",
  "rejected",
  "failed",
  "archived",
]);
export const cmsAuditOutcome = pgEnum("cms_audit_outcome", [
  "success",
  "failure",
  "denied",
]);

export const club = cmsSchema.table(
  "club",
  {
    id: text().primaryKey(),
    key: text().notNull(),
    name: text().notNull(),
    description: text(),
    status: cmsClubStatus().notNull().default("active"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("cms_club_key_unique").on(table.key),
    check("cms_club_key_format", sql`${table.key} ~ '^[a-z][a-z0-9_-]*$'`),
    index("cms_club_status_idx").on(table.status),
  ],
);

export const contentItem = cmsSchema.table(
  "content_item",
  {
    id: text().primaryKey(),
    type: cmsContentType().notNull(),
    title: text().notNull(),
    slug: text().notNull(),
    summary: text(),
    body: text().notNull().default(""),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    canonicalPath: text("canonical_path"),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    owningClubId: text("owning_club_id").references(() => club.id, {
      onDelete: "restrict",
    }),
    state: cmsWorkflowState().notNull().default("draft"),
    currentRevision: integer("current_revision").notNull().default(1),
    eventStartAt: timestamp("event_start_at", { withTimezone: true }),
    eventEndAt: timestamp("event_end_at", { withTimezone: true }),
    eventLocation: text("event_location"),
    eventOrganiser: text("event_organiser"),
    featuredMediaId: text("featured_media_id"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by").references(() => user.id, {
      onDelete: "restrict",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by").references(() => user.id, {
      onDelete: "restrict",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedBy: text("published_by").references(() => user.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("cms_content_slug_unique").on(table.slug),
    check(
      "cms_content_slug_format",
      sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check(
      "cms_event_dates_valid",
      sql`${table.type} <> 'event' or (${table.eventStartAt} is not null and (${table.eventEndAt} is null or ${table.eventEndAt} >= ${table.eventStartAt}))`,
    ),
    index("cms_content_state_type_idx").on(table.state, table.type),
    index("cms_content_author_idx").on(table.authorUserId),
    index("cms_content_club_idx").on(table.owningClubId),
    index("cms_content_published_idx").on(table.publishedAt),
  ],
);

export const contentRevision = cmsSchema.table(
  "content_revision",
  {
    id: text().primaryKey(),
    contentId: text("content_id")
      .notNull()
      .references(() => contentItem.id, { onDelete: "restrict" }),
    revision: integer().notNull(),
    snapshot: jsonb().$type<Record<string, unknown>>().notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("cms_content_revision_unique").on(table.contentId, table.revision),
    index("cms_content_revision_created_idx").on(table.createdAt),
  ],
);

export const workflowEvent = cmsSchema.table(
  "workflow_event",
  {
    id: text().primaryKey(),
    contentId: text("content_id")
      .notNull()
      .references(() => contentItem.id, { onDelete: "restrict" }),
    fromState: cmsWorkflowState("from_state"),
    toState: cmsWorkflowState("to_state").notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    comment: text(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("cms_workflow_content_time_idx").on(
      table.contentId,
      table.occurredAt,
    ),
  ],
);

export const mediaAsset = cmsSchema.table(
  "media_asset",
  {
    id: text().primaryKey(),
    storageKey: text("storage_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    normalizedFilename: text("normalized_filename").notNull(),
    declaredMimeType: text("declared_mime_type").notNull(),
    detectedMimeType: text("detected_mime_type"),
    byteSize: integer("byte_size").notNull(),
    checksumSha256: text("checksum_sha256"),
    width: integer(),
    height: integer(),
    altText: text("alt_text").notNull(),
    caption: text(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    owningClubId: text("owning_club_id").references(() => club.id, {
      onDelete: "restrict",
    }),
    status: cmsMediaStatus().notNull().default("pending"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("cms_media_storage_key_unique").on(table.storageKey),
    check("cms_media_size_positive", sql`${table.byteSize} > 0`),
    check(
      "cms_media_checksum_format",
      sql`${table.checksumSha256} is null or ${table.checksumSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "cms_media_filename_safe",
      sql`${table.normalizedFilename} !~ '[\\\\/]'`,
    ),
    index("cms_media_status_idx").on(table.status),
    index("cms_media_owner_idx").on(table.ownerUserId),
    index("cms_media_club_idx").on(table.owningClubId),
  ],
);

export const contentMedia = cmsSchema.table(
  "content_media",
  {
    contentId: text("content_id")
      .notNull()
      .references(() => contentItem.id, { onDelete: "restrict" }),
    mediaId: text("media_id")
      .notNull()
      .references(() => mediaAsset.id, { onDelete: "restrict" }),
    purpose: text().notNull().default("inline"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    unique("cms_content_media_unique").on(
      table.contentId,
      table.mediaId,
      table.purpose,
    ),
    check("cms_content_media_sort_nonnegative", sql`${table.sortOrder} >= 0`),
    index("cms_content_media_order_idx").on(table.contentId, table.sortOrder),
  ],
);

export const editorialAuditEvent = cmsSchema.table(
  "editorial_audit_event",
  {
    id: text().primaryKey(),
    eventType: text("event_type").notNull(),
    actorUserId: text("actor_user_id"),
    sessionId: text("session_id"),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    outcome: cmsAuditOutcome().notNull(),
    reasonCode: text("reason_code"),
    metadata: jsonb()
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default({}),
    preserveUntil: timestamp("preserve_until", { withTimezone: true }),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("cms_audit_occurred_idx").on(table.occurredAt),
    index("cms_audit_resource_idx").on(table.resourceType, table.resourceId),
    index("cms_audit_preserve_idx").on(table.preserveUntil),
  ],
);

export const retentionPolicy = cmsSchema.table("retention_policy", {
  key: text().primaryKey(),
  retentionDays: integer("retention_days"),
  enabled: boolean().notNull().default(false),
  updatedBy: text("updated_by").references(() => user.id, {
    onDelete: "restrict",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const clubRelations = relations(club, ({ many }) => ({
  content: many(contentItem),
  media: many(mediaAsset),
}));
export const contentRelations = relations(contentItem, ({ one, many }) => ({
  club: one(club, {
    fields: [contentItem.owningClubId],
    references: [club.id],
  }),
  revisions: many(contentRevision),
  workflowEvents: many(workflowEvent),
  media: many(contentMedia),
}));
export const revisionRelations = relations(contentRevision, ({ one }) => ({
  content: one(contentItem, {
    fields: [contentRevision.contentId],
    references: [contentItem.id],
  }),
}));
export const workflowRelations = relations(workflowEvent, ({ one }) => ({
  content: one(contentItem, {
    fields: [workflowEvent.contentId],
    references: [contentItem.id],
  }),
}));
export const mediaRelations = relations(mediaAsset, ({ one, many }) => ({
  club: one(club, { fields: [mediaAsset.owningClubId], references: [club.id] }),
  content: many(contentMedia),
}));
export const contentMediaRelations = relations(contentMedia, ({ one }) => ({
  content: one(contentItem, {
    fields: [contentMedia.contentId],
    references: [contentItem.id],
  }),
  media: one(mediaAsset, {
    fields: [contentMedia.mediaId],
    references: [mediaAsset.id],
  }),
}));
