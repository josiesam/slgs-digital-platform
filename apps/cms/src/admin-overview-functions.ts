import { and, desc, eq, isNull } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { requireIdentity } from "@slgs/auth";
import {
  applicationMembership,
  club,
  contentItem,
  editorialAuditEvent,
  mediaAsset,
  roleAssignment,
  roleAssignmentScope,
  user,
} from "@slgs/db";
import { requireAuthorization } from "@slgs/permissions";

import { database, sessions } from "./auth.server";

export const getCmsAdminOverview = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = new Request("http://internal.slgs/cms-admin-overview", {
      headers: getRequestHeaders(),
    });
    const identity = await requireIdentity(sessions, request);
    const grant = identity.grants.get("cms");
    requireAuthorization({
      identityId: identity.userId,
      application: "cms",
      permission: "content:read:cms",
      grant,
    });

    const [profile, content, media, users, clubs, scopedMemberships, audit] =
      await Promise.all([
        database.db
          .select({ name: user.name })
          .from(user)
          .where(eq(user.id, identity.userId))
          .limit(1),
        database.db
          .select({
            id: contentItem.id,
            title: contentItem.title,
            type: contentItem.type,
            state: contentItem.state,
            updatedAt: contentItem.updatedAt,
          })
          .from(contentItem)
          .orderBy(desc(contentItem.updatedAt)),
        database.db.select({ status: mediaAsset.status }).from(mediaAsset),
        database.db
          .select({
            status: user.status,
            membershipStatus: applicationMembership.status,
          })
          .from(user)
          .innerJoin(
            applicationMembership,
            and(
              eq(applicationMembership.userId, user.id),
              eq(applicationMembership.application, "cms"),
            ),
          ),
        database.db
          .select({ id: club.id, name: club.name, status: club.status })
          .from(club)
          .orderBy(club.name),
        database.db
          .select({ clubId: roleAssignmentScope.value })
          .from(roleAssignmentScope)
          .innerJoin(
            roleAssignment,
            eq(roleAssignment.id, roleAssignmentScope.roleAssignmentId),
          )
          .innerJoin(
            applicationMembership,
            eq(applicationMembership.id, roleAssignment.membershipId),
          )
          .where(
            and(
              eq(roleAssignmentScope.dimension, "club"),
              isNull(roleAssignment.revokedAt),
              eq(applicationMembership.application, "cms"),
              eq(applicationMembership.status, "active"),
            ),
          ),
        database.db
          .select({
            eventType: editorialAuditEvent.eventType,
            resourceType: editorialAuditEvent.resourceType,
            outcome: editorialAuditEvent.outcome,
            occurredAt: editorialAuditEvent.occurredAt,
          })
          .from(editorialAuditEvent)
          .orderBy(desc(editorialAuditEvent.occurredAt))
          .limit(8),
      ]);

    const countState = (state: (typeof content)[number]["state"]) =>
      content.filter((item) => item.state === state).length;
    const activeUsers = users.filter(
      (item) => item.status === "active" && item.membershipStatus === "active",
    ).length;
    return {
      identity: {
        displayName: profile[0]?.name ?? "CMS administrator",
        role: "CMS Administrator",
      },
      summary: {
        totalContent: content.length,
        drafts: countState("draft") + countState("rejected"),
        awaitingReview: countState("submitted"),
        awaitingApproval: countState("in_review"),
        published: countState("published"),
        mediaAssets: media.filter((item) => item.status === "available").length,
        activeUsers,
        activeClubs: clubs.filter((item) => item.status === "active").length,
      },
      users: {
        total: users.length,
        active: activeUsers,
        suspended: users.filter(
          (item) =>
            item.status === "suspended" ||
            item.membershipStatus === "suspended",
        ).length,
        inactive: users.filter(
          (item) =>
            item.status === "pending" ||
            item.status === "deactivated" ||
            item.membershipStatus === "deactivated",
        ).length,
      },
      workflow: {
        drafts: content.filter((item) =>
          ["draft", "rejected"].includes(item.state),
        ).length,
        review: countState("submitted"),
        approval: countState("in_review"),
        ready: countState("approved"),
        recentPublished: content
          .filter((item) => item.state === "published")
          .slice(0, 5)
          .map(({ id, title, type, updatedAt }) => ({
            id,
            title,
            type,
            updatedAt: updatedAt.toISOString(),
          })),
      },
      clubs: clubs
        .filter((item) => item.status === "active")
        .map((item) => ({
          ...item,
          membershipCount: scopedMemberships.filter(
            (membership) => membership.clubId === item.id,
          ).length,
        })),
      publicWeb: {
        publishedPages: content.filter(
          (item) => item.type === "page" && item.state === "published",
        ).length,
        navigationStatus: "Application-managed",
        publishedSiteUrl: process.env.PUBLIC_SITE_URL ?? "http://slgs.edu.sl",
      },
      recentActivity: audit.map((event) => ({
        ...event,
        occurredAt: event.occurredAt.toISOString(),
      })),
    };
  },
);
