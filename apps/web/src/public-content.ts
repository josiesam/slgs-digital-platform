import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  createPublicContentFromEnvironment,
  publicContentKindSchema,
  withPublicContentCache,
} from "@slgs/public-content";

const content = withPublicContentCache(
  createPublicContentFromEnvironment(process.env),
);

export const listPublicContent = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        kind: publicContentKindSchema,
        limit: z.number().int().min(1).max(100).optional(),
      })
      .parse(input),
  )
  .handler(({ data }) => content.list(data.kind, data.limit));

export const findPublicContent = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        kind: publicContentKindSchema,
        slug: z.string().min(1).max(200),
      })
      .parse(input),
  )
  .handler(({ data }) => content.find(data.kind, data.slug));

export const getHomeContent = createServerFn({ method: "GET" }).handler(
  async () => {
    const [announcements, news, events, galleries] = await Promise.all([
      content.list("announcement", 3),
      content.list("article", 3),
      content.list("event", 3),
      content.list("gallery", 1),
    ]);
    return { announcements, news, events, galleries };
  },
);

export const getSitemapContent = createServerFn({ method: "GET" }).handler(
  async () => {
    const [pages, articles, events, galleries, announcements] =
      await Promise.all([
        content.list("page", 100),
        content.list("article", 100),
        content.list("event", 100),
        content.list("gallery", 100),
        content.list("announcement", 100),
      ]);
    return { pages, articles, events, galleries, announcements };
  },
);
