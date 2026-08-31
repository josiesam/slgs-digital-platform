import { describe, expect, it } from "vitest";

import {
  EIGHT_HOURS_IN_SECONDS,
  MAX_ACTIVE_SIMS_SYSTEM_ADMINISTRATORS,
  ROLE_CONTRACTS,
  assertAuditMetadataSafe,
  assertDistinctBootstrapApprovers,
  assertRoleMatchesApplication,
  assertSimsSystemAdministratorCapacity,
  canAccessApplication,
  canAuthenticate,
  isEmailDomainApproved,
  mayAuthorReviewOwnContent,
  normaliseApprovedDomain,
} from "./policy";

describe("identity lifecycle", () => {
  it("allows only active identities to authenticate", () => {
    expect(canAuthenticate("active")).toBe(true);
    expect(canAuthenticate("pending")).toBe(false);
    expect(canAuthenticate("suspended")).toBe(false);
    expect(canAuthenticate("deactivated")).toBe(false);
  });

  it("requires a matching active CMS membership", () => {
    expect(
      canAccessApplication("active", "cms", {
        application: "cms",
        status: "active",
      }),
    ).toBe(true);
    expect(canAccessApplication("active", "cms", undefined)).toBe(false);
  });

  it("requires a matching active S.I.M.S. membership", () => {
    expect(
      canAccessApplication("active", "sims", {
        application: "sims",
        status: "active",
      }),
    ).toBe(true);
    expect(
      canAccessApplication("active", "sims", {
        application: "cms",
        status: "active",
      }),
    ).toBe(false);
  });

  it("denies suspended and deactivated memberships", () => {
    expect(
      canAccessApplication("active", "cms", {
        application: "cms",
        status: "suspended",
      }),
    ).toBe(false);
    expect(
      canAccessApplication("active", "cms", {
        application: "cms",
        status: "deactivated",
      }),
    ).toBe(false);
  });
});

describe("application-scoped roles", () => {
  it("defines no global or public administrator role", () => {
    expect(Object.keys(ROLE_CONTRACTS)).not.toContain("administrator");
    expect(Object.keys(ROLE_CONTRACTS)).not.toContain("public_administrator");
  });

  it("never gives a CMS role S.I.M.S. permissions", () => {
    for (const [key, contract] of Object.entries(ROLE_CONTRACTS)) {
      if (key.startsWith("cms_")) {
        expect(contract.application).toBe("cms");
        expect(
          contract.permissions.every(
            (permission) =>
              !permission.startsWith("student:") &&
              !permission.startsWith("staff:") &&
              !permission.startsWith("attendance:"),
          ),
        ).toBe(true);
      }
    }
  });

  it("rejects a cross-application role assignment", () => {
    expect(() => assertRoleMatchesApplication("cms_editor", "sims")).toThrow(
      /cannot cross/i,
    );
  });

  it("separates editor, reviewer, approver, and publisher capabilities", () => {
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
  });

  it("prevents authors from reviewing their own content", () => {
    expect(mayAuthorReviewOwnContent("user-1", "user-1")).toBe(false);
    expect(mayAuthorReviewOwnContent("user-1", "user-2")).toBe(true);
  });

  it("does not grant role-definition creation to access administrators", () => {
    expect(ROLE_CONTRACTS.sims_access_administrator.permissions).not.toContain(
      "role:create:sims",
    );
    expect(ROLE_CONTRACTS.sims_system_administrator.permissions).toContain(
      "role:create:sims",
    );
  });

  it("keeps S.I.M.S. identity and access administration non-inheriting", () => {
    expect(ROLE_CONTRACTS.sims_system_administrator.permissions).not.toContain(
      "role:assign:approved",
    );
    expect(ROLE_CONTRACTS.sims_system_administrator.permissions).not.toContain(
      "role:revoke:approved",
    );
    expect(ROLE_CONTRACTS.sims_access_administrator.permissions).not.toContain(
      "identity:manage:sims",
    );
    expect(ROLE_CONTRACTS.sims_access_administrator.permissions).not.toContain(
      "role:deactivate:sims",
    );
  });

  it("reserves custom CMS roles and assignments for CMS System Administrator", () => {
    expect(ROLE_CONTRACTS.cms_system_administrator.permissions).toEqual(
      expect.arrayContaining([
        "role:create:cms",
        "role:update:cms",
        "role:deactivate:cms",
        "role:assign:cms",
        "role:revoke:cms",
      ]),
    );
    for (const key of [
      "cms_editor",
      "cms_reviewer",
      "cms_approver",
      "cms_publisher",
    ] as const) {
      expect(ROLE_CONTRACTS[key].permissions).not.toContain("role:create:cms");
    }
  });

  it("gives club leadership explicit scoped supervision without publishing", () => {
    for (const key of [
      "cms_multimedia_club_supervisor",
      "cms_news_journal_club_supervisor",
    ] as const) {
      expect(ROLE_CONTRACTS[key].scopeDimensions).toEqual(["club"]);
      expect(ROLE_CONTRACTS[key].permissions).toContain("club:manage:assigned");
      expect(ROLE_CONTRACTS[key].permissions).not.toContain(
        "content:publish:approved",
      );
    }
  });

  it("does not grant delete permissions to operational staff", () => {
    expect(
      ROLE_CONTRACTS.sims_operational_staff.permissions.some((permission) =>
        permission.includes(":delete"),
      ),
    ).toBe(false);
  });

  it("gives News Journal Club creation without moderation authority", () => {
    const permissions = ROLE_CONTRACTS.cms_news_journal_club.permissions;
    expect(permissions).toContain("event:create:own");
    expect(permissions).toContain("announcement:create:own");
    expect(
      permissions.some((permission) => permission.includes(":review:")),
    ).toBe(false);
    expect(
      permissions.some((permission) => permission.includes(":approve:")),
    ).toBe(false);
    expect(
      permissions.some((permission) => permission.includes(":publish:")),
    ).toBe(false);
  });

  it("limits School Administrator to the approved oversight catalogue", () => {
    const permissions = ROLE_CONTRACTS.sims_school_administrator.permissions;
    expect(permissions).toEqual([
      "student:read:school",
      "student:create:school",
      "student:update:school",
      "staff:read:school",
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
      "attendance:read:school",
      "assessment:read:school",
      "report:read:school",
      "assignment:manage:school",
    ]);
    expect(
      permissions.some((permission) => permission.includes(":delete")),
    ).toBe(false);
  });

  it("gives Multimedia Club supervision a CMS-only club read scope", () => {
    expect(ROLE_CONTRACTS.cms_multimedia_club.application).toBe("cms");
    expect(ROLE_CONTRACTS.cms_multimedia_club.permissions).toContain(
      "media:read:club",
    );
  });

  it("keeps school administrators distinct from system administrators", () => {
    expect(ROLE_CONTRACTS.sims_school_administrator.permissions).not.toContain(
      "role:create:sims",
    );
    expect(ROLE_CONTRACTS.sims_school_administrator.permissions).not.toContain(
      "configuration:manage:sims",
    );
  });
});

describe("privileged bootstrap and hard limits", () => {
  it("requires two distinct bootstrap approvers", () => {
    expect(() =>
      assertDistinctBootstrapApprovers("operator-1", "operator-1"),
    ).toThrow(/distinct/i);
    expect(() =>
      assertDistinctBootstrapApprovers("operator-1", "operator-2"),
    ).not.toThrow();
  });

  it("enforces the five-active-S.I.M.S.-system-administrator ceiling", () => {
    expect(MAX_ACTIVE_SIMS_SYSTEM_ADMINISTRATORS).toBe(5);
    expect(() => assertSimsSystemAdministratorCapacity(4)).not.toThrow();
    expect(() => assertSimsSystemAdministratorCapacity(5)).toThrow(/five/i);
  });
});

describe("account and security controls", () => {
  it("uses an absolute eight-hour session limit", () => {
    expect(EIGHT_HOURS_IN_SECONDS).toBe(28_800);
  });

  it("normalises configured contact domains", () => {
    expect(normaliseApprovedDomain(" School.Example ")).toBe("school.example");
    expect(() => normaliseApprovedDomain("not a domain")).toThrow(/invalid/i);
  });

  it("permits only configured email domains", () => {
    const domains = new Set(["school.example"]);
    expect(isEmailDomainApproved("person@school.example", domains)).toBe(true);
    expect(isEmailDomainApproved("person@elsewhere.example", domains)).toBe(
      false,
    );
    expect(isEmailDomainApproved("invalid", domains)).toBe(false);
  });

  it("rejects secret-bearing audit metadata", () => {
    expect(() =>
      assertAuditMetadataSafe({ reason: "invalid_credentials" }),
    ).not.toThrow();
    expect(() =>
      assertAuditMetadataSafe({ resetToken: "never-log-this" }),
    ).toThrow(/forbidden secret/i);
    expect(() =>
      assertAuditMetadataSafe({ password: "never-log-this" }),
    ).toThrow(/forbidden secret/i);
  });
});
