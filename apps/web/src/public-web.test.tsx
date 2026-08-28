import { describe, expect, it } from "vitest";
import { detailHead } from "./editorial-pages";
import { absolutePublicUrl } from "./public-origin";
import { routeTree } from "./routeTree.gen";
import type { PublicContentItem } from "@slgs/public-content";

const article: PublicContentItem = {
  id: "synthetic-article",
  kind: "article",
  slug: "synthetic-story",
  title: "Synthetic story",
  summary: "Synthetic summary",
  body: "Synthetic body",
  seoTitle: null,
  seoDescription: null,
  canonicalPath: "/news/synthetic-story",
  publishedAt: "2026-08-28T10:00:00.000Z",
  updatedAt: "2026-08-28T10:00:00.000Z",
  event: null,
  media: [],
};

describe("public web foundations", () => {
  it("uses the approved production origin for public URLs", () => {
    expect(absolutePublicUrl("/")).toBe("http://slgs.edu.sl/");
    expect(absolutePublicUrl("about")).toBe("http://slgs.edu.sl/about");
  });

  it("generates public-only article metadata", () => {
    const head = detailHead(article, "News");
    expect(head.meta).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Synthetic story | Sierra Leone Grammar School",
        }),
        expect.objectContaining({
          name: "description",
          content: "Synthetic summary",
        }),
        expect.objectContaining({
          property: "og:url",
          content: "http://slgs.edu.sl/news/synthetic-story",
        }),
      ]),
    );
    expect(head.links).toContainEqual({
      rel: "canonical",
      href: "http://slgs.edu.sl/news/synthetic-story",
    });
    expect(JSON.stringify(head)).not.toContain("approvedBy");
  });

  it("contains the approved public route families and machine-readable routes", () => {
    const tree = JSON.stringify(routeTree);
    for (const path of [
      "about",
      "admissions",
      "academics",
      "life",
      "parents",
      "news",
      "events",
      "gallery",
      "contact",
      "sitemap.xml",
      "robots.txt",
    ]) {
      expect(tree).toContain(path);
    }
  });
});
