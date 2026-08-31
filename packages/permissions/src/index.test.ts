import { describe, expect, it } from "vitest";
import {
  createGrant,
  createScopedGrant,
  evaluateAuthorization,
  permissionGrammarSchema,
  permissionApplication,
  permissionSchema,
  PermissionDeniedError,
  requireAuthorization,
} from "./index";

describe("authorization evaluation", () => {
  it("contains the approved Phase 2B core capabilities without deletion", () => {
    for (const permission of [
      "student:create:school",
      "student:update:school",
      "staff:create:school",
      "staff:update:school",
      "class:read:school",
      "class:create:school",
      "class:update:school",
      "subject:read:school",
      "subject:create:school",
      "subject:update:school",
      "academic_session:read:school",
      "academic_session:create:school",
      "academic_session:update:school",
    ]) {
      expect(permissionSchema.safeParse(permission).success).toBe(true);
    }
    expect(
      permissionSchema.options.some((value) => value.includes(":delete")),
    ).toBe(false);
  });
  it("denies unauthenticated, missing, invalid, and cross-application access", () => {
    const cms = createGrant("cms", ["content:publish:approved"]);
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
      }).allowed,
    ).toBe(false);
    expect(
      evaluateAuthorization({
        identityId: "user",
        application: "sims",
        permission: "content:publish:approved",
        grant: cms,
      }).reason,
    ).toBe("application_mismatch");
    expect(permissionGrammarSchema.safeParse("invented:read").success).toBe(
      true,
    );
    expect(permissionSchema.safeParse("invented:read").success).toBe(false);
    expect(() => createGrant("sims", ["content:publish:approved"])).toThrow(
      /does not belong/i,
    );
  });

  it("classifies every Phase 1C page, club, gallery, media, and CMS role permission as CMS-only", () => {
    for (const permission of [
      "page:create:own",
      "gallery:submit:own",
      "club:manage:assigned",
      "media:archive:club",
      "role:create:cms",
    ] as const) {
      expect(permissionApplication(permissionSchema.parse(permission))).toBe(
        "cms",
      );
      expect(() => createGrant("sims", [permission])).toThrow(
        /does not belong/i,
      );
    }
  });

  it("enforces approved publication state", () => {
    const grant = createGrant("cms", ["content:publish:approved"]);
    const base = {
      identityId: "publisher",
      application: "cms" as const,
      permission: "content:publish:approved",
      grant,
    };
    expect(
      evaluateAuthorization({ ...base, resource: { state: "approved" } })
        .allowed,
    ).toBe(true);
    expect(
      evaluateAuthorization({ ...base, resource: { state: "draft" } }).reason,
    ).toBe("scope_mismatch");
  });

  it("keeps club scopes attached to their granting assignment", () => {
    const grant = createScopedGrant("cms", [
      {
        permissions: ["content:read:club"],
        scopes: [{ dimension: "club", value: "multimedia" }],
      },
      {
        permissions: ["content:update:assigned"],
        scopes: [{ dimension: "club", value: "news" }],
      },
    ]);
    const base = {
      identityId: "supervisor",
      application: "cms" as const,
      permission: "content:read:club",
      grant,
    };
    expect(
      evaluateAuthorization({
        ...base,
        resource: { scopes: [{ dimension: "club", value: "multimedia" }] },
      }).allowed,
    ).toBe(true);
    expect(
      evaluateAuthorization({
        ...base,
        resource: { scopes: [{ dimension: "club", value: "news" }] },
      }).allowed,
    ).toBe(false);
  });

  it("does not let scoped own authority widen itself by omitting resource scope", () => {
    const grant = createScopedGrant("cms", [
      {
        permissions: ["article:create:own"],
        scopes: [{ dimension: "club", value: "news" }],
      },
    ]);

    expect(
      evaluateAuthorization({
        identityId: "author",
        application: "cms",
        permission: "article:create:own",
        grant,
        resource: { ownerId: "author", scopes: [] },
      }),
    ).toEqual({ allowed: false, reason: "scope_mismatch" });
  });

  it("prevents author review and approval but permits another reviewer", () => {
    for (const permission of [
      "content:review:assigned",
      "content:approve:assigned",
    ] as const) {
      const grant = createScopedGrant("cms", [
        {
          permissions: [permission],
          scopes: [{ dimension: "organisation", value: "editorial" }],
        },
      ]);
      const resource = {
        scopes: [{ dimension: "organisation" as const, value: "editorial" }],
      };
      expect(
        evaluateAuthorization({
          identityId: "author",
          authorId: "author",
          application: "cms",
          permission,
          grant,
          resource,
        }).reason,
      ).toBe("self_review_denied");
      expect(
        evaluateAuthorization({
          identityId: "reviewer",
          authorId: "author",
          application: "cms",
          permission,
          grant,
          resource,
        }).allowed,
      ).toBe(true);
    }
  });

  it("throws a stable denial", () => {
    expect(() =>
      requireAuthorization({
        identityId: "user",
        application: "cms",
        permission: "content:publish:approved",
      }),
    ).toThrow(PermissionDeniedError);
  });

  it("allows operational work only inside an explicit assignment scope", () => {
    const grant = createScopedGrant("sims", [
      {
        permissions: ["student:read:assigned", "student:update:assigned"],
        scopes: [{ dimension: "class", value: "synthetic-class-a" }],
      },
    ]);
    const base = {
      identityId: "operator",
      application: "sims" as const,
      permission: "student:update:assigned",
      grant,
    };
    expect(
      evaluateAuthorization({
        ...base,
        resource: {
          scopes: [{ dimension: "class", value: "synthetic-class-a" }],
        },
      }).allowed,
    ).toBe(true);
    expect(
      evaluateAuthorization({
        ...base,
        resource: {
          scopes: [{ dimension: "class", value: "synthetic-class-b" }],
        },
      }).reason,
    ).toBe("scope_mismatch");
    expect(evaluateAuthorization(base).reason).toBe("scope_mismatch");
  });
});
