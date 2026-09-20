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
import {
  defaultCanonicalPath,
  type PublicContentKind,
} from "@slgs/public-content";

import { database, sessions } from "./auth.server";
import { filterVisibleContent } from "./dashboard-policy";

export const getCmsAdminOverview = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = new Request("http://internal.slgs/cms-admin-overview", {
      headers: getRequestHeaders(),
    });
    const identity = await requireIdentity(sessions, request);
    const grant = identity.grants.get("cms");
    const userPermissions = Array.from(grant?.permissions ?? []);

    const hasUserRead =
      grant?.permissions.has("user:read:cms") ||
      grant?.permissions.has("membership:read:cms");
    const hasClubRead =
      grant?.permissions.has("club:read:cms") ||
      grant?.permissions.has("club:manage:assigned");
    const hasAuditRead = grant?.permissions.has("audit:read:cms");

    const [profile, rawContent, media, users, clubs, scopedMemberships, audit] =
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
            slug: contentItem.slug,
            summary: contentItem.summary,
            body: contentItem.body,
            seoTitle: contentItem.seoTitle,
            seoDescription: contentItem.seoDescription,
            canonicalPath: contentItem.canonicalPath,
            state: contentItem.state,
            publishedAt: contentItem.publishedAt,
            authorUserId: contentItem.authorUserId,
            owningClubId: contentItem.owningClubId,
            updatedAt: contentItem.updatedAt,
          })
          .from(contentItem)
          .orderBy(desc(contentItem.updatedAt)),
        database.db.select({ status: mediaAsset.status }).from(mediaAsset),
        hasUserRead
          ? database.db
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
              )
          : Promise.resolve([]),
        hasClubRead
          ? database.db
              .select({ id: club.id, name: club.name, status: club.status })
              .from(club)
              .orderBy(club.name)
          : Promise.resolve([]),
        hasClubRead
          ? database.db
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
              )
          : Promise.resolve([]),
        hasAuditRead
          ? database.db
              .select({
                eventType: editorialAuditEvent.eventType,
                resourceType: editorialAuditEvent.resourceType,
                outcome: editorialAuditEvent.outcome,
                occurredAt: editorialAuditEvent.occurredAt,
              })
              .from(editorialAuditEvent)
              .orderBy(desc(editorialAuditEvent.occurredAt))
              .limit(8)
          : Promise.resolve([]),
      ]);

    const content = grant
      ? filterVisibleContent(rawContent, identity.userId, grant)
      : [];

    const countState = (state: (typeof rawContent)[number]["state"]) =>
      content.filter(
        (item: (typeof rawContent)[number]) => item.state === state,
      ).length;
    const activeUsers = users.filter(
      (item: { status: string; membershipStatus: string }) =>
        item.status === "active" && item.membershipStatus === "active",
    ).length;

    // Determine primary user role label
    let roleTitle = "CMS Member";
    if (
      userPermissions.includes("role:assign:cms") ||
      userPermissions.includes("user:create:cms")
    ) {
      roleTitle = "CMS Administrator";
    } else if (
      userPermissions.includes("content:publish:approved") ||
      userPermissions.includes("content:publish:cms")
    ) {
      roleTitle = "Publisher";
    } else if (
      userPermissions.includes("content:approve:assigned") ||
      userPermissions.includes("content:approve:cms")
    ) {
      roleTitle = "Approver";
    } else if (
      userPermissions.includes("content:review:assigned") ||
      userPermissions.includes("content:review:cms")
    ) {
      roleTitle = "Reviewer";
    } else if (
      userPermissions.includes("article:create:own") ||
      userPermissions.includes("content:create:own")
    ) {
      roleTitle = "Club Contributor";
    }

    const publishedSiteUrl =
      process.env.PUBLIC_SITE_URL ?? "http://slgs.edu.sl";

    // Filter published content items safely
    const publishedItemsRaw = content.filter(
      (item) =>
        item.state === "published" &&
        item.publishedAt !== null &&
        item.publishedAt !== undefined,
    );

    const publishedItems = publishedItemsRaw.map((item) => {
      const type = (item.type ?? "page") as PublicContentKind;
      const slug = item.slug ?? item.id;
      let canonicalPath = item.canonicalPath;
      if (!canonicalPath) {
        try {
          canonicalPath = defaultCanonicalPath(type, slug);
        } catch {
          canonicalPath = `/${slug}`;
        }
      }

      let publishedAtIso: string;
      if (item.publishedAt instanceof Date) {
        publishedAtIso = item.publishedAt.toISOString();
      } else if (typeof item.publishedAt === "string") {
        publishedAtIso = item.publishedAt;
      } else if (item.publishedAt) {
        publishedAtIso = new Date(item.publishedAt).toISOString();
      } else {
        publishedAtIso = new Date().toISOString();
      }

      let updatedAtIso: string;
      if (item.updatedAt instanceof Date) {
        updatedAtIso = item.updatedAt.toISOString();
      } else if (typeof item.updatedAt === "string") {
        updatedAtIso = item.updatedAt;
      } else if (item.updatedAt) {
        updatedAtIso = new Date(item.updatedAt).toISOString();
      } else {
        updatedAtIso = new Date().toISOString();
      }

      return {
        id: item.id,
        type,
        title: item.title ?? "Untitled Content",
        slug,
        summary: item.summary ?? null,
        body: item.body ?? "",
        seoTitle: item.seoTitle ?? null,
        seoDescription: item.seoDescription ?? null,
        canonicalPath,
        absoluteCanonicalUrl: `${publishedSiteUrl}${canonicalPath}`,
        publishedAt: publishedAtIso,
        updatedAt: updatedAtIso,
      };
    });

    const publishedCounts = {
      total: publishedItems.length,
      pages: publishedItems.filter((i) => i.type === "page").length,
      articles: publishedItems.filter((i) => i.type === "article").length,
      events: publishedItems.filter((i) => i.type === "event").length,
      announcements: publishedItems.filter((i) => i.type === "announcement")
        .length,
      galleries: publishedItems.filter((i) => i.type === "gallery").length,
    };

    // Navigation Tree (Core sections + published dynamic page projections)
    const coreNavTree = [
      {
        id: "core-home",
        title: "Home",
        path: "/",
        target: "internal" as const,
        isCore: true,
      },
      {
        id: "core-about",
        title: "About SLGS",
        path: "/about",
        target: "internal" as const,
        isCore: true,
      },
      {
        id: "core-admissions",
        title: "Admissions",
        path: "/admissions",
        target: "internal" as const,
        isCore: true,
      },
      {
        id: "core-academics",
        title: "Academics & Curriculum",
        path: "/academics",
        target: "internal" as const,
        isCore: true,
      },
      {
        id: "core-life",
        title: "School Life",
        path: "/life",
        target: "internal" as const,
        isCore: true,
      },
      {
        id: "core-parents",
        title: "Parents",
        path: "/parents",
        target: "internal" as const,
        isCore: true,
      },
      {
        id: "core-news",
        title: "School News",
        path: "/news",
        target: "internal" as const,
        isCore: true,
      },
      {
        id: "core-events",
        title: "Events & Sports",
        path: "/events",
        target: "internal" as const,
        isCore: true,
      },
      {
        id: "core-gallery",
        title: "Gallery",
        path: "/gallery",
        target: "internal" as const,
        isCore: true,
      },
      {
        id: "core-contact",
        title: "Contact Us",
        path: "/contact",
        target: "internal" as const,
        isCore: true,
      },
    ];

    const dynamicNavPages = publishedItems
      .filter(
        (item) =>
          item.type === "page" &&
          !coreNavTree.some((c) => c.path === item.canonicalPath),
      )
      .map((item) => ({
        id: item.id,
        title: item.title,
        path: item.canonicalPath,
        target: "internal" as const,
        isCore: false,
        kind: item.type,
      }));

    const navigationTree = [...coreNavTree, ...dynamicNavPages];

    // Build routes & SEO canonical mapping table data
    const coreRoutesMapping = coreNavTree.map((c) => ({
      path: c.path,
      title: c.title,
      routeType: "Core Section",
      canonicalOverride: `${publishedSiteUrl}${c.path}`,
      accessLevel: "Public Anonymous",
      isPublishedItem: false,
      publishedAt: null as string | null,
    }));

    const dynamicRoutesMapping = publishedItems.map((item) => {
      const typeStr = item.type ? String(item.type) : "page";
      const formattedType =
        typeStr.charAt(0).toUpperCase() + typeStr.slice(1) + " Projection";
      return {
        path: item.canonicalPath,
        title: item.title,
        routeType: formattedType,
        canonicalOverride: item.absoluteCanonicalUrl,
        accessLevel: "Public Anonymous",
        isPublishedItem: true,
        publishedAt: item.publishedAt,
      };
    });

    const existingPaths = new Set(coreRoutesMapping.map((r) => r.path));
    const routesMapping = [
      ...coreRoutesMapping,
      ...dynamicRoutesMapping.filter((r) => !existingPaths.has(r.path)),
    ];

    return {
      identity: {
        userId: identity.userId,
        displayName: profile[0]?.name ?? "CMS User",
        role: roleTitle,
      },
      permissions: userPermissions,
      summary: {
        totalContent: content.length,
        drafts: countState("draft") + countState("rejected"),
        awaitingReview: countState("submitted"),
        awaitingApproval: countState("in_review"),
        published: countState("published"),
        mediaAssets: media.filter(
          (item: { status: string }) => item.status === "available",
        ).length,
        activeUsers,
        activeClubs: clubs.filter(
          (item: { status: string }) => item.status === "active",
        ).length,
      },
      users: {
        total: users.length,
        active: activeUsers,
        suspended: users.filter(
          (item: { status: string; membershipStatus: string }) =>
            item.status === "suspended" ||
            item.membershipStatus === "suspended",
        ).length,
        inactive: users.filter(
          (item: { status: string; membershipStatus: string }) =>
            item.status === "pending" ||
            item.status === "deactivated" ||
            item.membershipStatus === "deactivated",
        ).length,
      },
      workflow: {
        drafts: content.filter((item: (typeof rawContent)[number]) =>
          ["draft", "rejected"].includes(item.state),
        ).length,
        review: countState("submitted"),
        approval: countState("in_review"),
        ready: countState("approved"),
        recentPublished: content
          .filter(
            (item: (typeof rawContent)[number]) => item.state === "published",
          )
          .slice(0, 5)
          .map(
            ({ id, title, type, updatedAt }: (typeof rawContent)[number]) => ({
              id,
              title,
              type,
              updatedAt:
                updatedAt instanceof Date
                  ? updatedAt.toISOString()
                  : String(updatedAt),
            }),
          ),
      },
      clubs: clubs
        .filter((item: { status: string }) => item.status === "active")
        .map((item: { id: string; name: string; status: string }) => ({
          ...item,
          membershipCount: scopedMemberships.filter(
            (membership: { clubId: string }) => membership.clubId === item.id,
          ).length,
        })),
      publicWeb: {
        publishedPages: publishedCounts.pages,
        navigationStatus: "Synchronized with public_content",
        publishedSiteUrl,
        publishedCounts,
        publishedItems,
        navigationTree,
        routesMapping,
      },
      recentActivity: audit.map(
        (event: {
          eventType: string;
          resourceType: string;
          outcome: string;
          occurredAt: Date | string;
        }) => ({
          ...event,
          occurredAt:
            event.occurredAt instanceof Date
              ? event.occurredAt.toISOString()
              : String(event.occurredAt),
        }),
      ),
    };
  },
);
