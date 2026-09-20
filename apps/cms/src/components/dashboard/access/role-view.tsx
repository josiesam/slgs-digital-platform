import { FormEvent, useState } from "react";
import {
  assignCmsRole,
  CmsDashboardData,
  CmsPermission,
  createCustomCmsRole,
  setCustomCmsRoleActive,
} from "../../../cms-functions";
import { useRouter } from "@tanstack/react-router";
import { IconPlus, IconUsers } from "@tabler/icons-react";

export function AccessRolesView({
  dashboard,
}: {
  readonly dashboard: CmsDashboardData;
}) {
  const router = useRouter();
  const permissions = new Set<CmsPermission>(dashboard.permissions);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const canManageRoles =
    permissions.has("role:create:cms") ||
    permissions.has("role:assign:cms") ||
    permissions.has("configuration:manage:cms");

  async function refresh(task: () => Promise<unknown>, success: string) {
    setPending(true);
    setFeedback(null);
    try {
      await task();
      setFeedback(success);
      await router.invalidate();
    } catch {
      setFeedback(
        "Role action failed. Verify closed CMS permission catalogue strings.",
      );
    } finally {
      setPending(false);
    }
  }

  const handleCreateRole = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return refresh(async () => {
      await createCustomCmsRole({
        data: {
          key: String(data.get("key")),
          name: String(data.get("name")),
          description: String(data.get("description")),
          permissions: String(data.get("permissions"))
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean) as CmsPermission[],
          scopeDimensions: String(data.get("scopes") || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean) as "club"[],
        },
      });
      form.reset();
      setShowRoleModal(false);
    }, "Custom CMS role definition created and audited.");
  };

  const handleAssignRole = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return refresh(async () => {
      await assignCmsRole({
        data: {
          targetUserId: String(data.get("member")),
          roleId: String(data.get("role")),
          clubId: String(data.get("club") || "") || undefined,
          reason: String(data.get("reason")),
        },
      });
      form.reset();
      setShowAssignModal(false);
    }, "Role assigned and audited.");
  };

  const toggleRoleActive = (roleId: string, active: boolean) => {
    if (
      !active &&
      !window.confirm(
        "Deactivate this custom role? Existing assignments will lose authority.",
      )
    ) {
      return;
    }
    return refresh(
      () => setCustomCmsRoleActive({ data: { roleId, active } }),
      active ? "Role activated." : "Role deactivated.",
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
            <span>Access Control</span>
            <span>/</span>
            <span className="text-foreground font-semibold">
              Roles & Permissions
            </span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            Roles & Permissions
          </h1>
          <p className="text-sm text-muted-foreground">
            CMS role definitions, catalogue permissions, and explicit scope
            assignments.
          </p>
        </div>

        {canManageRoles && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-foreground bg-secondary hover:bg-accent border border-border transition-colors"
            >
              <IconUsers className="size-3.5" />
              <span>Assign Role</span>
            </button>
            <button
              onClick={() => setShowRoleModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[#42245f] hover:bg-[#542f7f] transition-colors shadow-sm"
            >
              <IconPlus className="size-3.5" />
              <span>Create Role</span>
            </button>
          </div>
        )}
      </header>

      {feedback && (
        <div className="p-3 rounded-lg bg-[#42245f]/10 border border-[#42245f]/20 text-[#42245f] text-xs font-medium">
          {feedback}
        </div>
      )}

      {/* Role Definitions Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">
          CMS Role Definitions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboard.roles.map((role) => (
            <article
              key={role.id}
              className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between space-y-3 hover:border-[#69439a]/30 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif font-bold text-sm text-foreground">
                    {role.name}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border uppercase font-mono ${
                      role.active
                        ? "bg-[#2f7d3b]/10 text-[#2f7d3b] border-[#2f7d3b]/20"
                        : "bg-muted text-muted-foreground border"
                    }`}
                  >
                    {role.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs font-mono text-muted-foreground mb-1">
                  {role.key}
                </p>
                {role.systemManaged ? (
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-[#42245f]/10 text-[#42245f] border border-[#42245f]/20 font-medium">
                    System Managed Contract
                  </span>
                ) : (
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-secondary text-secondary-foreground border">
                    Custom CMS Role
                  </span>
                )}
              </div>

              {!role.systemManaged && canManageRoles && (
                <div className="pt-2 border-t border-border flex justify-end">
                  <button
                    disabled={pending}
                    onClick={() => toggleRoleActive(role.id, !role.active)}
                    className="px-3 py-1 rounded text-xs font-medium border border-border hover:bg-accent transition-colors"
                  >
                    {role.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>

      {/* Create Custom Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-serif font-bold text-foreground">
                Create Custom CMS Role
              </h2>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="font-semibold text-foreground">
                    Stable Key
                  </span>
                  <input
                    name="key"
                    pattern="[a-z][a-z0-9_]*"
                    required
                    placeholder="e.g. cms_sports_editor"
                    className="w-full p-2 border rounded-md bg-background"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-foreground">
                    Role Name
                  </span>
                  <input
                    name="name"
                    required
                    placeholder="e.g. Sports Editor"
                    className="w-full p-2 border rounded-md bg-background"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">
                  Description
                </span>
                <textarea
                  name="description"
                  required
                  rows={2}
                  className="w-full p-2 border rounded-md bg-background"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">
                  Permissions (Catalogue Strings)
                </span>
                <textarea
                  name="permissions"
                  required
                  rows={3}
                  placeholder="e.g. article:create:own, article:update:own, article:submit:own"
                  className="w-full p-2 border rounded-md bg-background font-mono text-[11px]"
                />
                <span className="text-[10px] text-muted-foreground block">
                  Comma-separated permission identifiers from the closed CMS
                  catalogue.
                </span>
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">
                  Scope Dimensions
                </span>
                <input
                  name="scopes"
                  placeholder="club"
                  className="w-full p-2 border rounded-md bg-background"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 rounded-md border border-border hover:bg-accent text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-2 rounded-md bg-[#42245f] hover:bg-[#542f7f] text-white text-xs font-semibold"
                >
                  {pending ? "Creating..." : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-serif font-bold text-foreground">
                Assign CMS Role
              </h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignRole} className="space-y-4 text-xs">
              <label className="block space-y-1">
                <span className="font-semibold text-foreground">
                  Target Member
                </span>
                <select
                  name="member"
                  required
                  className="w-full p-2 border rounded-md bg-background"
                >
                  {dashboard.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">CMS Role</span>
                <select
                  name="role"
                  required
                  className="w-full p-2 border rounded-md bg-background"
                >
                  {dashboard.roles
                    .filter((r) => r.active)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </label>

              {dashboard.clubs.length > 0 && (
                <label className="block space-y-1">
                  <span className="font-semibold text-foreground">
                    Club Scope (If Required)
                  </span>
                  <select
                    name="club"
                    defaultValue=""
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="">No club scope / Global</option>
                    {dashboard.clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">
                  Audit Reason
                </span>
                <textarea
                  name="reason"
                  required
                  rows={2}
                  placeholder="Reason for role assignment..."
                  className="w-full p-2 border rounded-md bg-background"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-md border border-border hover:bg-accent text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-2 rounded-md bg-[#42245f] hover:bg-[#542f7f] text-white text-xs font-semibold"
                >
                  {pending ? "Assigning..." : "Assign Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
