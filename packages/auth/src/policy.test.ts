import { describe, expect, it } from "vitest";
import {
  EIGHT_HOURS_IN_SECONDS,
  ROLE_CONTRACTS,
  assertAuditMetadataSafe,
  assertDistinctBootstrapApprovers,
  canAccessApplication,
  canAuthenticate,
  isEmailDomainApproved,
  mayAuthorReviewOwnContent,
  normaliseApprovedDomain,
} from "./policy";

describe("CMS-only identity and role policy", () => {
  it("requires active identities and CMS memberships", () => {
    expect(canAuthenticate("active")).toBe(true);
    expect(canAuthenticate("suspended")).toBe(false);
    expect(
      canAccessApplication("active", "cms", {
        application: "cms",
        status: "active",
      }),
    ).toBe(true);
    expect(canAccessApplication("active", "cms", undefined)).toBe(false);
  });

  it("keeps editorial responsibilities separate and blocks self-review", () => {
    expect(ROLE_CONTRACTS.cms_editor.permissions).not.toContain(
      "content:review:assigned",
    );
    expect(ROLE_CONTRACTS.cms_reviewer.permissions).not.toContain(
      "content:approve:assigned",
    );
    expect(ROLE_CONTRACTS.cms_approver.permissions).not.toContain(
      "content:publish:approved",
    );
    expect(ROLE_CONTRACTS.cms_publisher.permissions).toContain(
      "content:publish:approved",
    );
    expect(mayAuthorReviewOwnContent("user-1", "user-1")).toBe(false);
  });

  it("grants the CMS Administrator the complete explicit CMS permission set", () => {
    expect(ROLE_CONTRACTS.cms_system_administrator.permissions).toEqual(
      expect.arrayContaining([
        "user:read:cms",
        "user:create:cms",
        "user:update:cms",
        "user:deactivate:cms",
        "session:revoke:cms",
        "role:assign:cms",
        "role:revoke:cms",
      ]),
    );
    expect(ROLE_CONTRACTS.cms_administrator.permissions).toEqual(
      expect.arrayContaining([
        "content:read:cms",
        "content:review:cms",
        "content:approve:cms",
        "content:publish:cms",
        "media:read:cms",
        "club:manage:cms",
        "user:create:cms",
        "role:assign:cms",
        "audit:read:cms",
      ]),
    );
  });

  it("keeps club contributors scoped and without publishing authority", () => {
    expect(ROLE_CONTRACTS.cms_news_journal_club.scopeDimensions).toEqual([
      "club",
    ]);
    expect(ROLE_CONTRACTS.cms_news_journal_club.permissions).not.toContain(
      "content:publish:approved",
    );
  });
});

describe("account security controls", () => {
  it("retains bootstrap separation and the eight-hour session limit", () => {
    expect(EIGHT_HOURS_IN_SECONDS).toBe(28_800);
    expect(() => assertDistinctBootstrapApprovers("one", "one")).toThrow(
      /distinct/i,
    );
  });

  it("validates contact domains and rejects secret-bearing audit metadata", () => {
    expect(normaliseApprovedDomain(" School.Example ")).toBe("school.example");
    expect(
      isEmailDomainApproved(
        "person@school.example",
        new Set(["school.example"]),
      ),
    ).toBe(true);
    expect(() =>
      assertAuditMetadataSafe({ password: "never-log-this" }),
    ).toThrow(/forbidden secret/i);
  });
});
