import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  PublicSiteReadiness,
  assessPublicSiteReadiness,
} from "./public-site-readiness";

describe("public website configuration readiness", () => {
  it("tracks fixed pages separately from editorial collections", () => {
    const readiness = assessPublicSiteReadiness([
      { id: "about", type: "page", slug: "about", state: "approved" },
      { id: "other", type: "page", slug: "other", state: "published" },
      { id: "news-1", type: "article", slug: "story", state: "published" },
      { id: "news-2", type: "article", slug: "draft", state: "draft" },
    ]);

    expect(readiness).toHaveLength(9);
    expect(
      readiness.find((item) => item.section.key === "about"),
    ).toMatchObject({ status: "in_progress", statusLabel: "approved" });
    expect(
      readiness.find((item) => item.section.key === "admissions"),
    ).toMatchObject({ status: "not_started" });
    expect(readiness.find((item) => item.section.key === "news")).toMatchObject(
      { status: "published", statusLabel: "1 published" },
    );
  });

  it("renders all required sections and explains unavailable author actions", () => {
    const markup = renderToStaticMarkup(
      <PublicSiteReadiness
        content={[]}
        creatableTypes={new Set(["page"])}
        onConfigure={vi.fn()}
      />,
    );

    for (const label of [
      "About",
      "Admissions",
      "Academics",
      "School life",
      "Parents",
      "News",
      "Events",
      "Gallery",
      "Contact",
    ]) {
      expect(markup).toContain(label);
    }
    expect(markup).toContain("Configure page");
    expect(markup).toContain("Requires an assigned article author role.");
  });
});
