import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  applicationMembership,
  roleAssignment,
  roleAssignmentScope,
  roleDefinition,
  user,
  type DatabaseConnection,
} from "@slgs/db";
import { createScopedGrant, type Application } from "@slgs/permissions";

import type { SessionIdentity, SessionReader } from "./index";
import { canAccessApplication } from "./policy";
import type { createSlgsAuth } from "./server";

export function createApplicationSessionReader(options: {
  readonly application: Application;
  readonly auth: ReturnType<typeof createSlgsAuth>;
  readonly database: DatabaseConnection["db"];
}): SessionReader {
  return {
    async read(request): Promise<SessionIdentity | null> {
      const current = await options.auth.api.getSession({
        headers: request.headers,
      });
      if (!current) return null;

      const [identity] = await options.database
        .select({ status: user.status })
        .from(user)
        .where(eq(user.id, current.user.id))
        .limit(1);
      const [membership] = await options.database
        .select({
          id: applicationMembership.id,
          application: applicationMembership.application,
          status: applicationMembership.status,
        })
        .from(applicationMembership)
        .where(
          and(
            eq(applicationMembership.userId, current.user.id),
            eq(applicationMembership.application, options.application),
          ),
        )
        .limit(1);

      if (!identity || !membership) {
        return null;
      }
      if (
        !canAccessApplication(identity.status, options.application, membership)
      ) {
        return null;
      }

      const assignments = await options.database
        .select({
          id: roleAssignment.id,
          application: roleDefinition.application,
          permissions: roleDefinition.permissions,
        })
        .from(roleAssignment)
        .innerJoin(
          roleDefinition,
          eq(roleAssignment.roleDefinitionId, roleDefinition.id),
        )
        .where(
          and(
            eq(roleAssignment.membershipId, membership.id),
            isNull(roleAssignment.revokedAt),
            eq(roleDefinition.active, true),
            eq(roleDefinition.application, options.application),
          ),
        );

      const scopes = assignments.length
        ? await options.database
            .select({
              assignmentId: roleAssignmentScope.roleAssignmentId,
              dimension: roleAssignmentScope.dimension,
              value: roleAssignmentScope.value,
            })
            .from(roleAssignmentScope)
            .where(
              inArray(
                roleAssignmentScope.roleAssignmentId,
                assignments.map(({ id }) => id),
              ),
            )
        : [];

      const grant = createScopedGrant(
        options.application,
        assignments.map((assignment) => ({
          assignmentId: assignment.id,
          permissions: assignment.permissions,
          scopes: scopes.filter(
            (scope) => scope.assignmentId === assignment.id,
          ),
        })),
      );

      return {
        userId: current.user.id,
        sessionId: current.session.id,
        grants: new Map([[options.application, grant]]),
      };
    },
  };
}
