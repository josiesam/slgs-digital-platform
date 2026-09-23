import { describe, expect, it, vi } from "vitest";

import {
  defaultCanonicalPath,
  withPublicContentCache,
  type PublicContentGateway,
} from "./index";

describe("public content boundary", () => {
  it("caches only already-projected public DTOs for a bounded period", async () => {
    const list = vi.fn(async () => []);
    const gateway: PublicContentGateway = { list, find: async () => null };
    const cached = withPublicContentCache(gateway, 60_000);
    await cached.list("article");
    await cached.list("article");
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("defines no private workflow, identity, audit, or storage-key fields", () => {
    const publicFields = [
      "id",
      "kind",
      "slug",
      "title",
      "summary",
      "body",
      "seoTitle",
      "seoDescription",
      "canonicalPath",
      "publishedAt",
      "updatedAt",
      "event",
      "media",
    ];
    expect(publicFields).not.toEqual(
      expect.arrayContaining([
        "state",
        "reviewedBy",
        "approvedBy",
        "publishedBy",
        "storageKey",
      ]),
    );
  });

  it("exports defaultCanonicalPath helper for fallback path construction", () => {
    expect(defaultCanonicalPath("article", "anniversary")).toBe(
      "/news/anniversary",
    );
    expect(defaultCanonicalPath("event", "sports-day")).toBe(
      "/events/sports-day",
    );
    expect(defaultCanonicalPath("gallery", "campus")).toBe("/gallery/campus");
    expect(defaultCanonicalPath("announcement", "closure")).toBe(
      "/announcements/closure",
    );
    expect(defaultCanonicalPath("page", "academics")).toBe("/academics");
  });
});
