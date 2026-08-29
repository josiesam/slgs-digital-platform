import { describe, expect, it } from "vitest";

import { createScopedGrant } from "@slgs/permissions";
import { filterVisibleContent } from "./dashboard-policy";

describe("CMS dashboard scope policy", () => {
  it("shows a club supervisor every item in their club and nothing cross-club", () => {
    const grant = createScopedGrant("cms", [
      {
        permissions: ["content:read:club"],
        scopes: [{ dimension: "club", value: "club-news" }],
      },
    ]);
    const rows = [
      {
        id: "own-club",
        authorUserId: "another-author",
        owningClubId: "club-news",
        state: "draft" as const,
      },
      {
        id: "other-club",
        authorUserId: "another-author",
        owningClubId: "club-media",
        state: "draft" as const,
      },
    ];

    expect(
      filterVisibleContent(rows, "supervisor", grant).map((row) => row.id),
    ).toEqual(["own-club"]);
  });
});
