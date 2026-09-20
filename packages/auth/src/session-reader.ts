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

import type { ReadOptions, SessionIdentity, SessionReader } from "./index";
import { canAccessApplication } from "./policy";
import type { createSlgsAuth } from "./server";

export interface SessionReaderOptions {
  readonly application: Application;
  readonly auth: ReturnType<typeof createSlgsAuth>;
  readonly database: DatabaseConnection["db"];
  /**
   * Time-to-live for cached session identity in milliseconds.
   * Default: 300,000ms (5 minutes). Set to 0 to disable caching.
   */
  readonly cacheTtlMs?: number;
}

interface CacheEntry {
  readonly identity: SessionIdentity | null;
  readonly userId: string | null;
  readonly sessionId: string | null;
  readonly expiresAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes (300,000 ms)
const UNAUTHENTICATED_TTL_MS = 2000; // 2 seconds negative TTL

export function createApplicationSessionReader(
  options: SessionReaderOptions,
): SessionReader {
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_TTL_MS;

  const cache = new Map<string, CacheEntry>();
  const keyToSessionId = new Map<string, string>();
  const keyToUserId = new Map<string, string>();

  function extractCacheKey(request: Request): string | null {
    const cookie = request.headers.get("cookie");
    const auth = request.headers.get("authorization");
    if (!cookie && !auth) return null;
    return `${cookie ?? ""}|${auth ?? ""}`;
  }

  function removeCacheKey(key: string) {
    cache.delete(key);
    keyToSessionId.delete(key);
    keyToUserId.delete(key);
  }

  function invalidateSession(sessionId: string): void {
    for (const [key, sId] of Array.from(keyToSessionId.entries())) {
      if (sId === sessionId) {
        removeCacheKey(key);
      }
    }
  }

  function invalidateUser(userId: string): void {
    for (const [key, uId] of Array.from(keyToUserId.entries())) {
      if (uId === userId) {
        removeCacheKey(key);
      }
    }
  }

  function clearCache(): void {
    cache.clear();
    keyToSessionId.clear();
    keyToUserId.clear();
  }

  async function resolveIdentity(
    request: Request,
  ): Promise<SessionIdentity | null> {
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
  }

  return {
    async read(
      request: Request,
      readOptions?: ReadOptions,
    ): Promise<SessionIdentity | null> {
      const cacheKey = extractCacheKey(request);

      if (!cacheKey) {
        return null;
      }

      const now = Date.now();

      if (cacheTtlMs > 0 && !readOptions?.bypassCache) {
        const cached = cache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
          return cached.identity;
        }
      }

      const resolved = await resolveIdentity(request);

      if (cacheTtlMs > 0) {
        if (resolved) {
          cache.set(cacheKey, {
            identity: resolved,
            userId: resolved.userId,
            sessionId: resolved.sessionId,
            expiresAt: now + cacheTtlMs,
          });
          keyToSessionId.set(cacheKey, resolved.sessionId);
          keyToUserId.set(cacheKey, resolved.userId);
        } else {
          cache.set(cacheKey, {
            identity: null,
            userId: null,
            sessionId: null,
            expiresAt: now + UNAUTHENTICATED_TTL_MS,
          });
        }
      }

      return resolved;
    },

    invalidateSession,
    invalidateUser,
    clearCache,
  };
}
