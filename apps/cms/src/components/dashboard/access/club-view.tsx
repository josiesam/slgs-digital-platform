import { useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import { IconFolder, IconPlus } from "@tabler/icons-react";

import {
  createCmsClub,
  updateCmsClub,
  type CmsPermission,
} from "../../../cms-functions";

type AccessClubsViewProps = {
  dashboard: Awaited<
    ReturnType<typeof import("../../../cms-functions").getCmsDashboard>
  >;
};

export function AccessClubsView({ dashboard }: AccessClubsViewProps) {
  const router = useRouter();
  const permissions = new Set<CmsPermission>(dashboard.permissions);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const canManageConfig = permissions.has("configuration:manage:cms");

  const canManageClubs =
    canManageConfig ||
    permissions.has("club:manage:assigned") ||
    permissions.has("club:manage:cms");

  async function refresh(task: () => Promise<unknown>, success: string) {
    setPending(true);
    setFeedback(null);

    try {
      await task();
      setFeedback(success);
      await router.invalidate();
    } catch {
      setFeedback(
        "Club operation failed. Check authorization and key uniqueness.",
      );
    } finally {
      setPending(false);
    }
  }

  const handleCreateClub = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);

    return refresh(async () => {
      await createCmsClub({
        data: {
          key: String(data.get("key")),
          name: String(data.get("name")),
          description: String(data.get("description") || "") || undefined,
        },
      });

      form.reset();
      setShowCreateModal(false);
    }, "Club scope created and audited.");
  };

  const handleUpdateClub = (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);

    const status = String(data.get("status")) as
      "active" | "inactive" | "archived";

    if (
      status !== "active" &&
      !window.confirm(
        `Change status to ${status}? Operational availability will change.`,
      )
    ) {
      return;
    }

    return refresh(
      () =>
        updateCmsClub({
          data: {
            id,
            name: String(data.get("name")),
            description: String(data.get("description") || "") || undefined,
            status,
          },
        }),
      "Club lifecycle updated and audited.",
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
              Clubs & Societies
            </span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            Club Scope Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage student societies, club scopes, and assignment-bound
            editorial supervision.
          </p>
        </div>

        {canManageConfig && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-[#42245f] hover:bg-[#542f7f] transition-colors shadow-sm"
          >
            <IconPlus className="size-4" />
            <span>Create Club Scope</span>
          </button>
        )}
      </header>

      {feedback && (
        <div className="p-3 rounded-lg bg-[#42245f]/10 border border-[#42245f]/20 text-[#42245f] text-xs font-medium">
          {feedback}
        </div>
      )}

      {/* Managed Clubs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboard.managedClubs.map((club) => (
          <form
            key={club.id}
            onSubmit={(e) => handleUpdateClub(e, club.id)}
            className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4 hover:border-[#c2b28a] transition-all"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded bg-[#eee9dc] text-[#8d7d58]">
                  <IconFolder className="size-4" />
                </span>
                <h3 className="font-serif font-bold text-base text-foreground">
                  {club.name}
                </h3>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                  club.status === "active"
                    ? "bg-[#2f7d3b]/10 text-[#2f7d3b] border border-[#2f7d3b]/20"
                    : "bg-muted text-muted-foreground border"
                }`}
              >
                {club.status}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="font-medium text-foreground">Club Name</span>
                <input
                  name="name"
                  defaultValue={club.name}
                  required
                  disabled={!canManageClubs || pending}
                  className="w-full p-2 border rounded bg-background"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-medium text-foreground">Description</span>
                <textarea
                  name="description"
                  defaultValue={club.description ?? ""}
                  rows={2}
                  disabled={!canManageClubs || pending}
                  className="w-full p-2 border rounded bg-background"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-medium text-foreground">
                  Lifecycle Status
                </span>
                <select
                  name="status"
                  defaultValue={club.status}
                  disabled={!canManageClubs || pending}
                  className="w-full p-2 border rounded bg-background capitalize"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>

            {canManageClubs && (
              <div className="pt-2 border-t border-border flex justify-end">
                <button
                  type="submit"
                  disabled={pending}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-[#42245f] hover:bg-[#542f7f] text-white transition-colors"
                >
                  Save Changes
                </button>
              </div>
            )}
          </form>
        ))}
      </div>

      {/* Create Club Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-serif font-bold text-foreground">
                Create Club Scope
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClub} className="space-y-4 text-xs">
              <label className="block space-y-1">
                <span className="font-semibold text-foreground">
                  Stable Key
                </span>
                <input
                  name="key"
                  pattern="[a-z][a-z0-9_-]*"
                  required
                  placeholder="e.g. news_journal"
                  className="w-full p-2 border rounded-md bg-background"
                />
                <span className="text-[10px] text-muted-foreground block">
                  Lowercase alphanumeric key with hyphens or underscores.
                </span>
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Club Name</span>
                <input
                  name="name"
                  required
                  placeholder="e.g. Sierra Leone Grammar School News Journal"
                  className="w-full p-2 border rounded-md bg-background"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">
                  Description
                </span>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Describe scope purpose..."
                  className="w-full p-2 border rounded-md bg-background"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-md border border-border hover:bg-accent text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-2 rounded-md bg-[#42245f] hover:bg-[#542f7f] text-white text-xs font-semibold"
                >
                  {pending ? "Creating..." : "Create Scope"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
