export function canAccessIdentityAdministration(
  permissions: readonly string[],
): boolean {
  return (
    permissions.includes("identity:manage:sims") ||
    permissions.includes("membership:read:sims")
  );
}
