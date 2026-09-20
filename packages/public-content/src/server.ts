import { asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { createCloudflareR2Storage } from "@slgs/cms-domain";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  createDatabase,
  publicAnnouncement,
  publicArticle,
  publicEvent,
  publicGallery,
  publicMedia,
  publicPage,
  type DatabaseConnection,
} from "@slgs/db";

import {
  defaultCanonicalPath,
  type PublicContentGateway,
  type PublicContentItem,
  type PublicContentKind,
} from "./index.js";

export * from "./index.js";

type StandardRow = typeof publicPage.$inferSelect;
type EventRow = typeof publicEvent.$inferSelect;

const viewFor = (kind: Exclude<PublicContentKind, "event">) =>
  ({
    page: publicPage,
    article: publicArticle,
    announcement: publicAnnouncement,
    gallery: publicGallery,
  })[kind];

function serialize(
  row: StandardRow | EventRow,
  kind: PublicContentKind,
): PublicContentItem {
  if (!row.publishedAt)
    throw new Error("Public projection returned an invalid publication.");
  const eventRow = kind === "event" ? (row as EventRow) : null;
  if (eventRow && !eventRow.startAt) {
    throw new Error("Public event projection returned no start date.");
  }
  return {
    id: row.id,
    kind,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: row.body,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    canonicalPath: row.canonicalPath ?? defaultCanonicalPath(kind, row.slug),
    publishedAt: row.publishedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    event: eventRow
      ? {
          startAt: eventRow.startAt!.toISOString(),
          endAt: eventRow.endAt?.toISOString() ?? null,
          location: eventRow.location,
          organiser: eventRow.organiser,
        }
      : null,
    media: [],
  };
}

export function createPublicContentGateway(
  database: DatabaseConnection,
  environment?: Record<string, string | undefined>,
): PublicContentGateway {
  async function attachMedia(
    items: PublicContentItem[],
  ): Promise<PublicContentItem[]> {
    const contentIds = items.map((i) => i.id);
    if (!contentIds.length) return items;
    const mediaRows = await database.db
      .select({
        contentId: publicMedia.contentId,
        mediaId: publicMedia.mediaId,
        storageKey: publicMedia.storageKey,
        altText: publicMedia.altText,
        caption: publicMedia.caption,
        width: publicMedia.width,
        height: publicMedia.height,
      })
      .from(publicMedia)
      .where(inArray(publicMedia.contentId, contentIds))
      .orderBy(asc(publicMedia.sortOrder));

    const mediaWithUrls = await Promise.all(
      mediaRows.map(async (m) => {
        let url = `/api/media/${m.mediaId}`;
        if (environment) {
          try {
            url = await generatePresignedReadUrl(environment, m.storageKey);
          } catch (error) {
            console.log("generatePresignedReadUrl", error);
            throw error;
            // Fallback to proxy route if presigning is unavailable
          }
        }
        return { ...m, url };
      }),
    );

    return items.map((item) => ({
      ...item,
      media: mediaWithUrls
        .filter((m) => m.contentId === item.id)
        .map((m) => ({
          id: m.mediaId,
          url: m.url,
          altText: m.altText,
          caption: m.caption,
          width: m.width,
          height: m.height,
        })),
    }));
  }

  return {
    async list(kind, limit = 50) {
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      let items: PublicContentItem[];
      if (kind === "event") {
        const rows = await database.db
          .select()
          .from(publicEvent)
          .orderBy(desc(publicEvent.startAt))
          .limit(safeLimit);
        items = rows.map((row) => serialize(row, kind));
      } else {
        const view = viewFor(kind);
        const rows = await database.db
          .select()
          .from(view)
          .orderBy(desc(view.publishedAt))
          .limit(safeLimit);
        items = rows.map((row) => serialize(row, kind));
      }
      return attachMedia(items);
    },

    async find(kind, slug) {
      const parsedSlug = z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .max(200)
        .parse(slug);

      let item: PublicContentItem | null = null;
      if (kind === "event") {
        const [row] = await database.db
          .select()
          .from(publicEvent)
          .where(eq(publicEvent.slug, parsedSlug))
          .limit(1);
        if (row) item = serialize(row, kind);
      } else {
        const view = viewFor(kind);
        const [row] = await database.db
          .select()
          .from(view)
          .where(eq(view.slug, parsedSlug))
          .limit(1);
        if (row) item = serialize(row, kind);
      }
      if (!item) return null;
      const [withMedia] = await attachMedia([item]);
      return withMedia ?? item;
    },
  };
}

export function createPublicContentFromEnvironment(
  environment: Record<string, string | undefined>,
) {
  return createPublicContentGateway(
    createDatabase({ DATABASE_URL: environment.WEB_DATABASE_URL }),
    environment,
  );
}

export async function fetchPublicMediaAsset(
  environment: Record<string, string | undefined>,
  mediaId: string,
): Promise<{
  body: ReadableStream;
  mimeType: string;
  byteSize: number | null;
  etag: string | null;
} | null> {
  const dbUrl = environment.WEB_DATABASE_URL ?? environment.DATABASE_URL;
  if (!dbUrl) return null;

  const database = createDatabase({ DATABASE_URL: dbUrl });

  const [row] = await database.db
    .select({
      storageKey: publicMedia.storageKey,
      mimeType: publicMedia.mimeType,
    })
    .from(publicMedia)
    .where(eq(publicMedia.mediaId, mediaId))
    .limit(1);

  if (!row) return null;

  const storage = createCloudflareR2Storage(environment);
  const result = await storage.read(row.storageKey);

  return {
    body: result.body,
    mimeType: row.mimeType ?? result.mimeType ?? "image/jpeg",
    byteSize: result.byteSize,
    etag: result.etag,
  };
}

export async function generatePresignedReadUrl(
  environment: Record<string, string | undefined>,
  storageKey: string,
): Promise<string> {
  const accessKeyId =
    environment.CLOUDFLARE_R2_READ_ACCESS_KEY_ID ??
    environment.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey =
    environment.CLOUDFLARE_R2_READ_SECRET_ACCESS_KEY ??
    environment.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const endpoint = environment.CLOUDFLARE_R2_ENDPOINT;
  const bucket = environment.CLOUDFLARE_R2_BUCKET;

  if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
    throw new Error("R2 environment credentials not fully configured.");
  }

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: storageKey,
  });

  // Generate GET URL valid for 24 hours (86400 seconds)
  return getSignedUrl(client, command, { expiresIn: 86400 });
}
