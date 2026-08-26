import { z } from "zod";

export const applicationSchema = z.enum(["cms", "sims"]);
export type Application = z.infer<typeof applicationSchema>;

export const permissionSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*(?::[a-z][a-z0-9_]*)?$/,
    "Permission must use domain:action[:scope]",
  );
export type Permission = z.infer<typeof permissionSchema>;

export interface ApplicationGrant {
  readonly application: Application;
  readonly permissions: ReadonlySet<Permission>;
}

export function createGrant(
  application: Application,
  permissions: readonly string[],
): ApplicationGrant {
  return {
    application,
    permissions: new Set(
      permissions.map((permission) => permissionSchema.parse(permission)),
    ),
  };
}

export function isAllowed(
  grant: ApplicationGrant | undefined,
  application: Application,
  permission: Permission,
): boolean {
  return (
    grant?.application === application && grant.permissions.has(permission)
  );
}

export class PermissionDeniedError extends Error {
  readonly code = "PERMISSION_DENIED";

  constructor() {
    super("You do not have permission to perform this action.");
    this.name = "PermissionDeniedError";
  }
}

export function requirePermission(
  grant: ApplicationGrant | undefined,
  application: Application,
  permission: Permission,
): void {
  if (!isAllowed(grant, application, permission)) {
    throw new PermissionDeniedError();
  }
}
