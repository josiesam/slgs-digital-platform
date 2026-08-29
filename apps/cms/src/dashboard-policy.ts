import {
  evaluateAuthorization,
  type ApplicationGrant,
  type Permission,
} from "@slgs/permissions";

type ScopedContent = {
  readonly authorUserId: string;
  readonly owningClubId: string | null;
  readonly state:
    "draft" | "submitted" | "in_review" | "rejected" | "approved" | "published";
};

export function filterVisibleContent<T extends ScopedContent>(
  rows: readonly T[],
  identityId: string,
  grant: ApplicationGrant,
): T[] {
  const permissions = [...grant.permissions].filter(
    (permission): permission is Permission =>
      permission === "article:read:club" ||
      permission === "content:read:club" ||
      permission === "content:read:assigned" ||
      permission === "content:read:approved",
  );
  return rows.filter((item) => {
    if (item.authorUserId === identityId) return true;
    return permissions.some(
      (permission) =>
        evaluateAuthorization({
          identityId,
          application: "cms",
          permission,
          grant,
          authorId: item.authorUserId,
          resource: {
            ownerId: item.authorUserId,
            state:
              item.state === "in_review"
                ? "submitted"
                : item.state === "rejected"
                  ? "draft"
                  : item.state,
            scopes: [
              { dimension: "organisation", value: "slgs" },
              ...(item.owningClubId
                ? [{ dimension: "club" as const, value: item.owningClubId }]
                : []),
            ],
          },
        }).allowed,
    );
  });
}
