import { describe, expect, it } from "vitest";
import {
  createGrant,
  createScopedGrant,
  evaluateAuthorization,
  permissionGrammarSchema,
  permissionSchema,
  PermissionDeniedError,
  requireAuthorization,
} from "./index";

describe("CMS authorization evaluation", () => {
  it("contains only the closed CMS permission catalogue", () => {
    expect(permissionSchema.options).toEqual(
      expect.arrayContaining([
        "content:publish:approved",
        "content:publish:cms",
        "content:read:cms",
        "media:read:cms",
        "user:create:cms",
        "session:revoke:cms",
      ]),
    );
    expect(
      permissionSchema.options.some((permission) =>
        /^(student|staff|attendance|academic_session):/.test(permission),
      ),
    ).toBe(false);
  });

  it("denies unauthenticated, missing, and unknown permissions", () => {
    expect(
      evaluateAuthorization({
        application: "cms",
        permission: "content:publish:approved",
      }).reason,
    ).toBe("unauthenticated");
    expect(
      evaluateAuthorization({
        identityId: "user",
        application: "cms",
        permission: "content:publish:approved",
      }).reason,
    ).toBe("application_mismatch");
    expect(permissionGrammarSchema.safeParse("invented:read").success).toBe(
      true,
    );
    expect(permissionSchema.safeParse("invented:read").success).toBe(false);
  });

  it("enforces publication state and assignment-bound club scope", () => {
    const publisher = createGrant("cms", ["content:publish:approved"]);
    expect(
      evaluateAuthorization({
        identityId: "publisher",
        application: "cms",
        permission: "content:publish:approved",
        grant: publisher,
        resource: { state: "approved" },
      }).allowed,
    ).toBe(true);
    const club = createScopedGrant("cms", [
      {
        permissions: ["content:read:club"],
        scopes: [{ dimension: "club", value: "news" }],
      },
    ]);
    expect(
      evaluateAuthorization({
        identityId: "member",
        application: "cms",
        permission: "content:read:club",
        grant: club,
        resource: { scopes: [{ dimension: "club", value: "other" }] },
      }).reason,
    ).toBe("scope_mismatch");
  });

  it("blocks author self-review and throws stable denials", () => {
    const reviewer = createScopedGrant("cms", [
      {
        permissions: ["content:review:assigned"],
        scopes: [{ dimension: "organisation", value: "editorial" }],
      },
    ]);
    expect(
      evaluateAuthorization({
        identityId: "author",
        authorId: "author",
        application: "cms",
        permission: "content:review:assigned",
        grant: reviewer,
        resource: {
          scopes: [{ dimension: "organisation", value: "editorial" }],
        },
      }).reason,
    ).toBe("self_review_denied");
    expect(() =>
      requireAuthorization({
        identityId: "user",
        application: "cms",
        permission: "content:publish:approved",
      }),
    ).toThrow(PermissionDeniedError);
  });
});
