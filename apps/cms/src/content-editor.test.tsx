import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DraftEditor, type EditableCmsContent } from "./content-editor";

const article: EditableCmsContent = {
  id: "content-1",
  type: "article",
  title: "Existing title",
  slug: "existing-title",
  summary: "Existing summary",
  body: "Existing body",
  seoTitle: "Existing SEO title",
  seoDescription: "Existing SEO description",
  canonicalPath: "/news/existing-title",
  featuredMediaId: "media-1",
  eventStartAt: null,
  eventEndAt: null,
  eventLocation: null,
  eventOrganiser: null,
};

describe("CMS draft editor", () => {
  it("loads every persisted draft field before editing", () => {
    const markup = renderToStaticMarkup(
      <DraftEditor content={article} pending={false} onSave={vi.fn()} />,
    );

    for (const value of [
      "Existing title",
      "existing-title",
      "Existing summary",
      "Existing body",
      "Existing SEO title",
      "Existing SEO description",
      "/news/existing-title",
    ]) {
      expect(markup).toContain(value);
    }
  });

  it("loads every authoritative event field for event editing", () => {
    const markup = renderToStaticMarkup(
      <DraftEditor
        content={{
          ...article,
          type: "event",
          eventStartAt: "2026-09-01T09:30:00.000Z",
          eventEndAt: "2026-09-01T12:00:00.000Z",
          eventLocation: "School hall",
          eventOrganiser: "Science Department",
        }}
        pending={false}
        onSave={vi.fn()}
      />,
    );

    expect(markup).toContain("2026-09-01T09:30");
    expect(markup).toContain("2026-09-01T12:00");
    expect(markup).toContain("School hall");
    expect(markup).toContain("Science Department");
  });
});
