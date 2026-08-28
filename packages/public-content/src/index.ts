import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  createDatabase,
  publicAnnouncement,
  publicArticle,
  publicEvent,
  publicGallery,
  publicPage,
  type DatabaseConnection,
} from "@slgs/db";

export const publicContentKindSchema = z.enum([
  "page",
  "article",
  "event",
  "announcement",
  "gallery",
]);
export type PublicContentKind = z.infer<typeof publicContentKindSchema>;

export interface PublicContentItem {
  readonly id: string;
  readonly kind: PublicContentKind;
  readonly slug: string;
  readonly title: string;
  readonly summary: string | null;
  readonly body: string;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly canonicalPath: string | null;
  readonly publishedAt: string;
  readonly updatedAt: string;
  readonly event: null | {
    readonly startAt: string;
    readonly endAt: string | null;
    readonly location: string | null;
    readonly organiser: string | null;
  };
  readonly media: readonly PublicMedia[];
}

export interface PublicMedia {
  readonly id: string;
  readonly url: string;
  readonly altText: string;
  readonly caption: string | null;
  readonly width: number | null;
  readonly height: number | null;
}

type StandardRow = typeof publicPage.$inferSelect;
type EventRow = typeof publicEvent.$inferSelect;

export interface PublicContentGateway {
  list(
    kind: PublicContentKind,
    limit?: number,
  ): Promise<readonly PublicContentItem[]>;
  find(
    kind: PublicContentKind,
    slug: string,
  ): Promise<PublicContentItem | null>;
}

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
    canonicalPath: row.canonicalPath,
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
    // Public URLs are intentionally absent until the Phase 1D media delivery
    // domain is approved. Private R2 keys are never projected.
    media: [],
  };
}

export function createPublicContentGateway(
  database: DatabaseConnection,
): PublicContentGateway {
  return {
    async list(kind, limit = 50) {
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      if (kind === "event") {
        const rows = await database.db
          .select()
          .from(publicEvent)
          .orderBy(desc(publicEvent.startAt))
          .limit(safeLimit);
        return rows.map((row) => serialize(row, kind));
      }
      const view = viewFor(kind);
      const rows = await database.db
        .select()
        .from(view)
        .orderBy(desc(view.publishedAt))
        .limit(safeLimit);
      return rows.map((row) => serialize(row, kind));
    },
    async find(kind, slug) {
      const parsedSlug = z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .max(200)
        .parse(slug);
      if (kind === "event") {
        const [row] = await database.db
          .select()
          .from(publicEvent)
          .where(eq(publicEvent.slug, parsedSlug))
          .limit(1);
        return row ? serialize(row, kind) : null;
      }
      const view = viewFor(kind);
      const [row] = await database.db
        .select()
        .from(view)
        .where(eq(view.slug, parsedSlug))
        .limit(1);
      return row ? serialize(row, kind) : null;
    },
  };
}

export function createPublicContentFromEnvironment(
  environment: Record<string, string | undefined>,
) {
  return createPublicContentGateway(
    createDatabase({ DATABASE_URL: environment.WEB_DATABASE_URL }),
  );
}

export function withPublicContentCache(
  gateway: PublicContentGateway,
  ttlMilliseconds = 60_000,
): PublicContentGateway {
  const cache = new Map<string, { expiresAt: number; value: unknown }>();
  const read = async <T>(key: string, load: () => Promise<T>): Promise<T> => {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    const value = await load();
    cache.set(key, { value, expiresAt: Date.now() + ttlMilliseconds });
    return value;
  };
  return {
    list: (kind, limit) =>
      read(`list:${kind}:${limit ?? 50}`, () => gateway.list(kind, limit)),
    find: (kind, slug) =>
      read(`find:${kind}:${slug}`, () => gateway.find(kind, slug)),
  };
}
