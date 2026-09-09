import { z } from "zod";

export const applicationSchema = z.enum(["cms", "sims"]);
export type Application = z.infer<typeof applicationSchema>;

export const permissionGrammarSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*(?::[a-z][a-z0-9_]*)?$/,
    "Permission must use domain:action[:scope]",
  );

export const PERMISSION_CATALOGUE = [
  "media:create:own",
  "media:read:club",
  "media:update:own",
  "media:update:club",
  "media:archive:own",
  "media:archive:club",
  "content:create:own",
  "content:read:club",
  "content:update:own",
  "content:submit:own",
  "page:create:own",
  "page:update:own",
  "page:submit:own",
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
  "gallery:create:own",
  "gallery:update:own",
  "gallery:submit:own",
  "content:read:assigned",
  "content:update:assigned",
  "content:submit:assigned",
  "content:review:assigned",
  "content:reject:assigned",
  "content:approve:assigned",
  "content:read:approved",
  "content:publish:approved",
  "content:unpublish:published",
  "membership:read:cms",
  "membership:manage:cms",
  "audit:read:cms",
  "configuration:manage:cms",
  "club:read:cms",
  "club:manage:assigned",
  "role:create:cms",
  "role:update:cms",
  "role:deactivate:cms",
  "role:assign:cms",
  "role:revoke:cms",
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
  "membership:read:sims",
  "role:assign:approved",
  "role:revoke:approved",
  "audit:read:identity",
  "identity:manage:sims",
  "role:create:sims",
  "role:update:sims",
  "role:deactivate:sims",
  "configuration:manage:sims",
  "audit:read:sims",
  "student:read:assigned",
  "student:update:assigned",
  "attendance:read:assigned",
  "attendance:create:assigned",
  "attendance:correct:assigned",
  "attendance:update:assigned",
] as const;

export const permissionSchema = z.enum(PERMISSION_CATALOGUE);
export type Permission = z.infer<typeof permissionSchema>;

export function permissionApplication(permission: Permission): Application {
  if (permission.endsWith(":cms")) return "cms";
  if (permission.endsWith(":sims")) return "sims";
  const domain = permission.split(":")[0];
  if (!domain) throw new Error("Permission domain is missing.");
  if (
    [
      "media",
      "content",
      "article",
      "event",
      "announcement",
      "gallery",
      "page",
      "club",
    ].includes(domain)
  ) {
    return "cms";
  }
  if (
    [
      "student",
      "staff",
      "class",
      "subject",
      "academic_session",
      "attendance",
      "assessment",
      "report",
      "assignment",
      "role",
      "identity",
    ].includes(domain)
  ) {
    return "sims";
  }
  return "sims";
}

export const scopeDimensionSchema = z.enum([
  "club",
  "class",
  "subject",
  "department",
  "academic_session",
  "term",
  "organisation",
  "location",
]);
export type ScopeDimension = z.infer<typeof scopeDimensionSchema>;
export const scopeBindingSchema = z.object({
  dimension: scopeDimensionSchema,
  value: z.string().trim().min(1).max(200),
});
export type ScopeBinding = z.infer<typeof scopeBindingSchema>;

export interface AssignmentEntitlement {
  readonly assignmentId?: string;
  readonly permissions: ReadonlySet<Permission>;
  readonly scopes: readonly ScopeBinding[];
}
export interface ApplicationGrant {
  readonly application: Application;
  readonly entitlements: readonly AssignmentEntitlement[];
  readonly permissions: ReadonlySet<Permission>;
}
export interface ResourceAuthorizationContext {
  readonly ownerId?: string;
  readonly state?:
    "draft" | "submitted" | "reviewed" | "approved" | "published";
  readonly scopes?: readonly ScopeBinding[];
}
export interface AuthorizationRequest {
  readonly identityId?: string;
  readonly application: Application;
  readonly permission: string;
  readonly grant?: ApplicationGrant;
  readonly resource?: ResourceAuthorizationContext;
  readonly authorId?: string;
}
export type AuthorizationReason =
  | "allowed"
  | "unauthenticated"
  | "application_mismatch"
  | "invalid_permission"
  | "missing_permission"
  | "scope_mismatch"
  | "self_review_denied";
export interface AuthorizationDecision {
  readonly allowed: boolean;
  readonly reason: AuthorizationReason;
}

const parsePermissions = (
  application: Application,
  values: readonly string[],
) =>
  new Set(
    values.map((value) => {
      const permission = permissionSchema.parse(value);
      if (permissionApplication(permission) !== application) {
        throw new Error("Permission does not belong to the application.");
      }
      return permission;
    }),
  );

export function createGrant(
  application: Application,
  permissions: readonly string[],
): ApplicationGrant {
  return createScopedGrant(application, [{ permissions, scopes: [] }]);
}

export function createScopedGrant(
  application: Application,
  assignments: readonly {
    readonly assignmentId?: string;
    readonly permissions: readonly string[];
    readonly scopes: readonly ScopeBinding[];
  }[],
): ApplicationGrant {
  const entitlements = assignments.map((assignment) => ({
    assignmentId: assignment.assignmentId,
    permissions: parsePermissions(application, assignment.permissions),
    scopes: assignment.scopes.map((scope) => scopeBindingSchema.parse(scope)),
  }));
  return {
    application,
    entitlements,
    permissions: new Set(entitlements.flatMap((item) => [...item.permissions])),
  };
}

function scopeMatches(
  permission: Permission,
  identityId: string,
  entitlement: AssignmentEntitlement,
  resource?: ResourceAuthorizationContext,
): boolean {
  const scope = permission.split(":")[2];
  if (!scope || ["cms", "sims", "identity", "school"].includes(scope))
    return true;
  if (scope === "own") {
    if (resource?.ownerId !== identityId) return false;
    const resourceScopes = resource.scopes ?? [];
    if (entitlement.scopes.length === 0) return true;
    if (resourceScopes.length === 0) return false;
    return entitlement.scopes.some((assigned) =>
      resourceScopes.some(
        (candidate) =>
          candidate.dimension === assigned.dimension &&
          candidate.value === assigned.value,
      ),
    );
  }
  if (scope === "approved") return resource?.state === "approved";
  if (scope === "published") return resource?.state === "published";
  const resourceScopes = resource?.scopes ?? [];
  return entitlement.scopes.some(
    (assigned) =>
      (scope !== "club" || assigned.dimension === "club") &&
      resourceScopes.some(
        (candidate) =>
          candidate.dimension === assigned.dimension &&
          candidate.value === assigned.value,
      ),
  );
}

export function evaluateAuthorization(
  request: AuthorizationRequest,
): AuthorizationDecision {
  if (!request.identityId) return { allowed: false, reason: "unauthenticated" };
  if (request.grant?.application !== request.application) {
    return { allowed: false, reason: "application_mismatch" };
  }
  const parsed = permissionSchema.safeParse(request.permission);
  if (!parsed.success) return { allowed: false, reason: "invalid_permission" };
  if (
    (parsed.data.includes(":review:") || parsed.data.includes(":approve:")) &&
    request.authorId === request.identityId
  )
    return { allowed: false, reason: "self_review_denied" };
  const candidates = request.grant.entitlements.filter((item) =>
    item.permissions.has(parsed.data),
  );
  if (candidates.length === 0)
    return { allowed: false, reason: "missing_permission" };
  if (
    !candidates.some((item) =>
      scopeMatches(parsed.data, request.identityId!, item, request.resource),
    )
  ) {
    return { allowed: false, reason: "scope_mismatch" };
  }
  return { allowed: true, reason: "allowed" };
}

export function isAllowed(
  grant: ApplicationGrant | undefined,
  application: Application,
  permission: Permission,
): boolean {
  return Boolean(
    grant?.application === application && grant.permissions.has(permission),
  );
}

export class PermissionDeniedError extends Error {
  readonly code = "PERMISSION_DENIED";
  constructor(readonly reason: AuthorizationReason = "missing_permission") {
    super("You do not have permission to perform this action.");
    this.name = "PermissionDeniedError";
  }
}
export function requireAuthorization(request: AuthorizationRequest): void {
  const decision = evaluateAuthorization(request);
  if (!decision.allowed) throw new PermissionDeniedError(decision.reason);
}
export function requirePermission(
  grant: ApplicationGrant | undefined,
  application: Application,
  permission: Permission,
): void {
  if (!isAllowed(grant, application, permission))
    throw new PermissionDeniedError();
}
