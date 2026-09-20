import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  IconArticle,
  IconBell,
  IconCalendarEvent,
  IconFile,
  IconPhoto,
  IconSearch,
} from "@tabler/icons-react";

import { useServerFn } from "@tanstack/react-start";
import {
  createCmsContent,
  transitionCmsContent,
  type CmsDashboardData,
} from "../../../cms-functions";
import { type CmsWorkflowAction } from "../../../workflow-actions";

export function EditorialKanbanView({
  dashboard,
  activeColumn,
}: {
  readonly dashboard: CmsDashboardData;
  readonly activeColumn?: "drafts" | "review" | "approval" | "published";
}) {
  const router = useRouter();
  const createContentFn = useServerFn(createCmsContent);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");

  // Create Content Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newType, setNewType] = useState<
    "page" | "article" | "event" | "announcement" | "gallery"
  >("article");
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newClubId, setNewClubId] = useState<string>(
    dashboard.clubs[0]?.id ?? "",
  );

  async function refresh(task: () => Promise<unknown>, success: string) {
    setPending(true);
    setFeedback(null);
    try {
      await task();
      setFeedback(success);
      await router.invalidate();
    } catch (err: any) {
      setFeedback(err.message || "Operation failed. Check permissions.");
    } finally {
      setPending(false);
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await refresh(async () => {
      await createContentFn({
        data: {
          type: newType,
          title: newTitle,
          slug: newSlug,
          summary: newSummary || undefined,
          body: newBody,
          owningClubId: newClubId || undefined,
        },
      });
      setShowCreateModal(false);
      setNewTitle("");
      setNewSlug("");
      setNewSummary("");
      setNewBody("");
    }, "New content created with initial Revision 1.0 snapshot.");
  };

  const filteredContent = dashboard.content.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      selectedTypeFilter === "all" || item.type === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  // Kanban Column Definitions
  const colDrafts = filteredContent.filter((item) =>
    ["draft", "rejected", "requires_rebase"].includes(item.state),
  );
  const colReview = filteredContent.filter(
    (item) =>
      item.state === "submitted" ||
      (item.state === "in_review" && !item.reviewedAt),
  );
  const colApproval = filteredContent.filter(
    (item) =>
      item.state === "approved" ||
      (item.state === "in_review" && Boolean(item.reviewedAt)),
  );
  const colPublished = filteredContent.filter(
    (item) => item.state === "published",
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
            <span>Editorial Desk</span>
            <span>/</span>
            <span className="text-foreground font-semibold">
              Workflow Kanban Board
            </span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            Editorial Kanban Desk
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage peer reviews, editorial approvals, and public site
            publication boundaries with strict audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-md bg-[#42245f] px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-[#341b4c] transition-colors"
          >
            + Create New Content
          </button>
          <span className="px-2.5 py-1 rounded bg-[#42245f]/10 text-[#42245f] border border-[#42245f]/20 text-xs font-semibold">
            Single Base Snapshot Model
          </span>
        </div>
      </header>

      {feedback && (
        <div className="p-3 rounded-lg bg-[#2f7d3b]/10 border border-[#2f7d3b]/20 text-[#2f7d3b] text-xs font-medium">
          {feedback}
        </div>
      )}

      {/* Create Content Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">
                Create New Content & Initial Snapshot
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Content Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full rounded-md border border-input bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#9a78c2]"
                >
                  <option value="article">Article (News)</option>
                  <option value="event">Event</option>
                  <option value="announcement">Announcement</option>
                  <option value="gallery">Gallery</option>
                  <option value="page">Page</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    if (!newSlug) {
                      setNewSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, ""),
                      );
                    }
                  }}
                  required
                  placeholder="Enter content title..."
                  className="w-full rounded-md border border-input bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#9a78c2]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  required
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  placeholder="e.g. annual-sports-day"
                  className="w-full rounded-md border border-input bg-background p-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#9a78c2]"
                />
              </div>

              {dashboard.clubs.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Owning Club / Organisation
                  </label>
                  <select
                    value={newClubId}
                    onChange={(e) => setNewClubId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#9a78c2]"
                  >
                    {dashboard.clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Summary (Optional)
                </label>
                <textarea
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  maxLength={600}
                  rows={2}
                  placeholder="Short introductory summary..."
                  className="w-full rounded-md border border-input bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#9a78c2]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Body Content
                </label>
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  rows={5}
                  placeholder="Write draft content body..."
                  className="w-full rounded-md border border-input bg-background p-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#9a78c2]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-[#42245f] px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-[#341b4c] disabled:opacity-50"
              >
                {pending ? "Creating..." : "Create Content & Snapshot 1.0"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card shadow-sm">
        <div className="relative w-full sm:w-80">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search items in workflow..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-[#9a78c2]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground font-medium">
            Content Type:
          </span>
          {["all", "page", "article", "event", "announcement", "gallery"].map(
            (type) => (
              <button
                key={type}
                onClick={() => setSelectedTypeFilter(type)}
                className={`px-2.5 py-1 rounded text-xs capitalize transition-colors font-medium ${
                  selectedTypeFilter === type
                    ? "bg-[#42245f] text-white"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {type}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Kanban Board Grid (4 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {/* Column 1: Drafts & Revisions */}
        <div
          className={`space-y-4 p-4 rounded-xl border bg-card/60 transition-all ${
            activeColumn === "drafts"
              ? "ring-2 ring-[#42245f] border-[#42245f]"
              : "border-border"
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#8564ae]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Drafts & Revisions
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-mono font-semibold">
              {colDrafts.length}
            </span>
          </div>

          <div className="space-y-3">
            {colDrafts.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                No items in draft state
              </div>
            ) : (
              colDrafts.map((item) => <KanbanCard key={item.id} item={item} />)
            )}
          </div>
        </div>

        {/* Column 2: Peer Review Queue */}
        <div
          className={`space-y-4 p-4 rounded-xl border bg-card/60 transition-all ${
            activeColumn === "review"
              ? "ring-2 ring-[#d39a22] border-[#d39a22]"
              : "border-border"
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#d39a22]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Peer Review Queue
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#d39a22]/10 text-[#d39a22] text-xs font-mono font-semibold">
              {colReview.length}
            </span>
          </div>

          <div className="space-y-3">
            {colReview.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                No items awaiting review
              </div>
            ) : (
              colReview.map((item) => <KanbanCard key={item.id} item={item} />)
            )}
          </div>
        </div>

        {/* Column 3: Final Approval Queue */}
        <div
          className={`space-y-4 p-4 rounded-xl border bg-card/60 transition-all ${
            activeColumn === "approval"
              ? "ring-2 ring-[#2f6287] border-[#2f6287]"
              : "border-border"
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#79b6d6]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Final Approval Queue
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#79b6d6]/10 text-[#2f6287] text-xs font-mono font-semibold">
              {colApproval.length}
            </span>
          </div>

          <div className="space-y-3">
            {colApproval.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                No items awaiting final approval
              </div>
            ) : (
              colApproval.map((item) => (
                <KanbanCard key={item.id} item={item} />
              ))
            )}
          </div>
        </div>

        {/* Column 4: Published & Live Projections */}
        <div
          className={`space-y-4 p-4 rounded-xl border bg-card/60 transition-all ${
            activeColumn === "published"
              ? "ring-2 ring-[#2f7d3b] border-[#2f7d3b]"
              : "border-border"
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#2f7d3b]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Published / Live
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#2f7d3b]/10 text-[#2f7d3b] text-xs font-mono font-semibold">
              {colPublished.length}
            </span>
          </div>

          <div className="space-y-3">
            {colPublished.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                No items published
              </div>
            ) : (
              colPublished.map((item) => (
                <KanbanCard key={item.id} item={item} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanCard({
  item,
}: {
  readonly item: CmsDashboardData["content"][number];
}) {
  const latestRev = item.revisions[0];
  const revisionLabel =
    latestRev?.revisionLabel ?? `1.${item.currentRevision - 1}`;
  const snapshotId = item.currentSnapshotId ?? latestRev?.snapshotId;
  const baseSnapshotId =
    item.currentBaseSnapshotId ?? latestRev?.baseSnapshotId;

  return (
    <article className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-3 hover:shadow-md hover:border-[#42245f]/30 transition-all text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-[#42245f]/10 text-[#42245f]">
            {item.type === "page" && <IconFile className="size-3.5" />}
            {item.type === "article" && <IconArticle className="size-3.5" />}
            {item.type === "event" && (
              <IconCalendarEvent className="size-3.5" />
            )}
            {item.type === "announcement" && <IconBell className="size-3.5" />}
            {item.type === "gallery" && <IconPhoto className="size-3.5" />}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground border">
            {item.type}
          </span>
        </div>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded border capitalize ${
            item.state === "published"
              ? "bg-[#2f7d3b]/10 text-[#2f7d3b] border-[#2f7d3b]/20"
              : item.state === "approved"
                ? "bg-[#79b6d6]/10 text-[#2f6287] border-[#79b6d6]/20"
                : item.state === "requires_rebase"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  : item.state === "in_review" || item.state === "submitted"
                    ? "bg-[#d39a22]/10 text-[#d39a22] border-[#d39a22]/20"
                    : "bg-[#8564ae]/10 text-[#42245f] border-[#8564ae]/20"
          }`}
        >
          {item.state.replace("_", " ")}
        </span>
      </div>

      <div>
        <h3 className="font-serif font-bold text-sm text-foreground line-clamp-1">
          {item.title}
        </h3>
        <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
          {item.canonicalPath}
        </p>
      </div>

      {item.summary && (
        <p className="text-muted-foreground text-[11px] line-clamp-2">
          {item.summary}
        </p>
      )}

      {/* Revision & Snapshot Metadata */}
      <div className="rounded-md bg-muted/40 p-2 text-[10px] space-y-1 font-mono border border-border/40">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Rev:</span>
          <span className="font-bold text-foreground">{revisionLabel}</span>
        </div>
        {snapshotId && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Snapshot:</span>
            <span
              className="truncate max-w-30 text-foreground"
              title={snapshotId}
            >
              {snapshotId}
            </span>
          </div>
        )}
        {baseSnapshotId && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Base Snap:</span>
            <span
              className="truncate max-w-[120px] text-foreground"
              title={baseSnapshotId}
            >
              {baseSnapshotId}
            </span>
          </div>
        )}
        {item.verifiedVersion && (
          <div className="flex items-center justify-between text-emerald-600 font-semibold pt-0.5 border-t border-border/30">
            <span>Verified:</span>
            <span>Version {item.verifiedVersion}</span>
          </div>
        )}
      </div>

      {/* Navigation to Canonical Details Route */}
      <div className="pt-2 border-t border-border">
        <a
          href={`/dashboard/editorial/${item.state}/${item.id}`}
          className="inline-flex w-full items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          View Revision Details & Actions →
        </a>
      </div>
    </article>
  );
}
