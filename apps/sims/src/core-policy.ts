import { z } from "zod";

import { coreResourceSchema } from "@slgs/sims-domain";

export const coreMutationRequestSchema = z.object({
  resource: coreResourceSchema,
  id: z.string().min(1).max(200).optional(),
  payload: z.unknown(),
});

export function canNavigateToSimsCore(permissions: readonly string[]): boolean {
  return permissions.some((permission) =>
    /^(student|staff|class|subject|academic_session):read:(school|assigned)$/.test(
      permission,
    ),
  );
}

const resourceDomains = {
  students: "student",
  staff: "staff",
  classes: "class",
  subjects: "subject",
  "academic-sessions": "academic_session",
} as const;

function hasCorePermission(
  permissions: readonly string[],
  resource: z.infer<typeof coreResourceSchema>,
  action: "read" | "create" | "update",
): boolean {
  const prefix = `${resourceDomains[resource]}:${action}:`;
  return permissions.some(
    (permission) =>
      permission === `${prefix}school` || permission === `${prefix}assigned`,
  );
}

export const canReadSimsCoreResource = (
  permissions: readonly string[],
  resource: z.infer<typeof coreResourceSchema>,
) => hasCorePermission(permissions, resource, "read");

export const canCreateSimsCoreResource = (
  permissions: readonly string[],
  resource: z.infer<typeof coreResourceSchema>,
) => hasCorePermission(permissions, resource, "create");

export const canUpdateSimsCoreResource = (
  permissions: readonly string[],
  resource: z.infer<typeof coreResourceSchema>,
) => hasCorePermission(permissions, resource, "update");

export function requiresLifecycleConfirmation(
  currentStatus: unknown,
  nextStatus: string,
): boolean {
  return (
    nextStatus !== currentStatus &&
    ["inactive", "archived", "closed"].includes(nextStatus)
  );
}
