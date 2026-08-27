import { and, eq, isNull } from "drizzle-orm";

import {
  applicationMembership,
  roleAssignment,
  roleDefinition,
  user,
  type DatabaseConnection,
} from "@slgs/db";
import { createGrant, type Application } from "@slgs/permissions";

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

      const grant = createGrant(
        options.application,
        assignments.flatMap((assignment) => assignment.permissions),
      );

      return {
        userId: current.user.id,
        sessionId: current.session.id,
        grants: new Map([[options.application, grant]]),
      };
    },
  };
}
