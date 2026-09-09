import { z } from "zod";

import {
  applicationSchema,
  permissionSchema,
  type Application,
  type Permission,
} from "@slgs/permissions";

export const EIGHT_HOURS_IN_SECONDS = 8 * 60 * 60;
export const MAX_ACTIVE_SIMS_SYSTEM_ADMINISTRATORS = 5;

export const identityStatusSchema = z.enum([
  "pending",
  "active",
  "suspended",
  "deactivated",
]);
export type IdentityStatus = z.infer<typeof identityStatusSchema>;

export const membershipStatusSchema = z.enum([
  "active",
  "suspended",
  "deactivated",
]);
export type MembershipStatus = z.infer<typeof membershipStatusSchema>;

export const roleKeySchema = z.enum([
  "cms_multimedia_club",
  "cms_multimedia_club_supervisor",
  "cms_news_journal_club",
  "cms_news_journal_club_supervisor",
  "cms_editor",
  "cms_reviewer",
  "cms_approver",
  "cms_publisher",
  "cms_administrator",
  "cms_system_administrator",
  "sims_school_administrator",
  "sims_access_administrator",
  "sims_system_administrator",
  "sims_operational_staff",
]);
export type RoleKey = z.infer<typeof roleKeySchema>;

export interface RoleContract {
  readonly application: Application;
  readonly permissions: readonly Permission[];
  readonly scopeDimensions?: readonly string[];
}

const permissions = <TValues extends readonly string[]>(values: TValues) =>
  values.map((value) => permissionSchema.parse(value));

export const ROLE_CONTRACTS = {
  cms_multimedia_club: {
    application: "cms",
    scopeDimensions: ["club"],
    permissions: permissions([
      "media:create:own",
      "media:read:club",
      "media:update:own",
      "media:archive:own",
      "gallery:create:own",
      "gallery:update:own",
      "gallery:submit:own",
      "content:create:own",
      "content:read:club",
      "content:update:own",
      "content:submit:own",
    ]),
  },
  cms_multimedia_club_supervisor: {
    application: "cms",
    scopeDimensions: ["club"],
    permissions: permissions([
      "media:create:own",
      "media:read:club",
      "media:update:club",
      "media:archive:club",
      "content:create:own",
      "content:read:club",
      "content:update:assigned",
      "content:submit:assigned",
      "gallery:create:own",
      "gallery:update:own",
      "gallery:submit:own",
      "club:read:cms",
      "club:manage:assigned",
    ]),
  },
  cms_news_journal_club: {
    application: "cms",
    scopeDimensions: ["club"],
    permissions: permissions([
      "article:create:own",
      "article:read:club",
      "article:update:own",
      "article:submit:own",
      "event:create:own",
      "event:update:own",
      "event:submit:own",
      "announcement:create:own",
      "announcement:update:own",
      "announcement:submit:own",
    ]),
  },
  cms_news_journal_club_supervisor: {
    application: "cms",
    scopeDimensions: ["club"],
    permissions: permissions([
      "article:create:own",
      "article:read:club",
      "article:update:own",
      "article:submit:own",
      "event:create:own",
      "event:update:own",
      "event:submit:own",
      "announcement:create:own",
      "announcement:update:own",
      "announcement:submit:own",
      "content:read:club",
      "content:update:assigned",
      "content:submit:assigned",
      "club:read:cms",
      "club:manage:assigned",
    ]),
  },
  cms_editor: {
    application: "cms",
    scopeDimensions: ["organisation"],
    permissions: permissions([
      "page:create:own",
      "page:update:own",
      "page:submit:own",
      "content:read:assigned",
      "content:update:assigned",
      "content:submit:assigned",
    ]),
  },
  cms_reviewer: {
    application: "cms",
    scopeDimensions: ["organisation"],
    permissions: permissions([
      "content:read:assigned",
      "content:review:assigned",
      "content:reject:assigned",
    ]),
  },
  cms_approver: {
    application: "cms",
    scopeDimensions: ["organisation"],
    permissions: permissions([
      "content:read:assigned",
      "content:approve:assigned",
      "content:reject:assigned",
    ]),
  },
  cms_publisher: {
    application: "cms",
    permissions: permissions([
      "content:read:approved",
      "content:publish:approved",
      "content:unpublish:published",
    ]),
  },
  cms_administrator: {
    application: "cms",
    permissions: permissions([
      "membership:read:cms",
      "membership:manage:cms",
      "audit:read:cms",
      "configuration:manage:cms",
    ]),
  },
  cms_system_administrator: {
    application: "cms",
    permissions: permissions([
      "membership:read:cms",
      "membership:manage:cms",
      "audit:read:cms",
      "configuration:manage:cms",
      "club:read:cms",
      "role:create:cms",
      "role:update:cms",
      "role:deactivate:cms",
      "role:assign:cms",
      "role:revoke:cms",
    ]),
  },
  sims_school_administrator: {
    application: "sims",
    permissions: permissions([
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
      "attendance:create:school",
      "attendance:correct:school",
      "assessment:read:school",
      "report:read:school",
      "assignment:manage:school",
    ]),
  },
  sims_access_administrator: {
    application: "sims",
    permissions: permissions([
      "membership:read:sims",
      "role:assign:approved",
      "role:revoke:approved",
      "audit:read:identity",
    ]),
  },
  sims_system_administrator: {
    application: "sims",
    permissions: permissions([
      "identity:manage:sims",
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
      "attendance:create:school",
      "attendance:correct:school",
      "role:create:sims",
      "role:update:sims",
      "role:deactivate:sims",
      "configuration:manage:sims",
      "audit:read:sims",
    ]),
  },
  sims_operational_staff: {
    application: "sims",
    scopeDimensions: [
      "class",
      "subject",
      "department",
      "academic_session",
      "term",
      "location",
    ],
    permissions: permissions([
      "student:read:assigned",
      "student:update:assigned",
      "attendance:read:assigned",
      "attendance:create:assigned",
      "attendance:correct:assigned",
      "attendance:update:assigned",
    ]),
  },
} as const satisfies Readonly<Record<RoleKey, RoleContract>>;

export function canAuthenticate(status: IdentityStatus): boolean {
  return status === "active";
}

export function canAccessApplication(
  identityStatus: IdentityStatus,
  application: Application,
  membership:
    | { readonly application: Application; readonly status: MembershipStatus }
    | undefined,
): boolean {
  return (
    canAuthenticate(identityStatus) &&
    membership?.application === application &&
    membership.status === "active"
  );
}

export function assertRoleMatchesApplication(
  role: RoleKey,
  application: Application,
): void {
  if (ROLE_CONTRACTS[role].application !== application) {
    throw new Error("A role cannot cross an application boundary.");
  }
}

export function assertDistinctBootstrapApprovers(
  initiatorReference: string,
  approverReference: string,
): void {
  if (initiatorReference === approverReference) {
    throw new Error("Privileged bootstrap requires two distinct approvers.");
  }
}

export function assertSimsSystemAdministratorCapacity(
  activeCount: number,
): void {
  if (activeCount >= MAX_ACTIVE_SIMS_SYSTEM_ADMINISTRATORS) {
    throw new Error(
      "At most five active S.I.M.S. System Administrators are allowed.",
    );
  }
}

export function normaliseApprovedDomain(domain: string): string {
  const normalised = domain.trim().toLowerCase();
  if (
    !z
      .string()
      .regex(/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/)
      .safeParse(normalised).success
  ) {
    throw new Error("Approved contact domain is invalid.");
  }
  return normalised;
}

export function isEmailDomainApproved(
  email: string,
  approvedDomains: ReadonlySet<string>,
): boolean {
  const separator = email.lastIndexOf("@");
  if (separator <= 0 || separator === email.length - 1) return false;
  return approvedDomains.has(email.slice(separator + 1).toLowerCase());
}

export function mayAuthorReviewOwnContent(
  authorUserId: string,
  reviewerUserId: string,
): boolean {
  return authorUserId !== reviewerUserId;
}

export function assertAuditMetadataSafe(
  metadata: Readonly<Record<string, unknown>>,
): void {
  const forbidden =
    /(password|secret|token|backup.?code|session.?cookie|mfa.?key)/i;
  if (Object.keys(metadata).some((key) => forbidden.test(key))) {
    throw new Error(
      "Security audit metadata contains a forbidden secret field.",
    );
  }
}

export function parseApplication(value: unknown): Application {
  return applicationSchema.parse(value);
}
